/**
 * Free Email OTP service (no SMS / billing required).
 *
 * - 6-digit OTP, stored ONLY as an HMAC-SHA256 hash (never plaintext)
 * - 10 minute expiry, max 5 verification attempts, 60s resend cooldown,
 *   max 5 sends per email per hour
 * - Storage: Neon PostgreSQL table `email_otps` when configured, otherwise in-memory
 * - Delivery: Brevo HTTP API (BREVO_API_KEY) -> Resend (RESEND_API_KEY) -> SMTP via Nodemailer (SMTP_*) -> dev console log
 */

import crypto from 'crypto';
import nodemailer from 'nodemailer';
import type { Pool } from 'pg';

export const EMAIL_OTP_TTL_MS = 10 * 60 * 1000;
export const EMAIL_OTP_MAX_ATTEMPTS = 5;
export const EMAIL_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const EMAIL_OTP_MAX_SENDS_PER_HOUR = 5;
const SEND_WINDOW_MS = 60 * 60 * 1000;

interface OtpRecord {
  email: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sendCount: number;
  windowStart: number;
}

export interface OtpResult {
  ok: boolean;
  status: number;
  code?: string;
  error?: string;
  cooldownSeconds?: number;
  expiresInSeconds?: number;
}

const memStore = new Map<string, OtpRecord>();
let neonPool: Pool | null = null;
let tableReady = false;
let tableInitPromise: Promise<void> | null = null;

export function configureEmailOtpStore(pool: Pool | null): void {
  neonPool = pool;
}

export function normalizeEmail(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

function hashSecret(): string {
  return (
    process.env.OTP_HASH_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.DATABASE_URL ||
    'nativebazar-dev-otp-secret'
  );
}

function hashOtp(email: string, otp: string): string {
  return crypto.createHmac('sha256', hashSecret()).update(`${email}:${otp}`).digest('hex');
}

async function ensureTable(): Promise<void> {
  if (!neonPool || tableReady) return;
  if (!tableInitPromise) {
    tableInitPromise = neonPool
      .query(`
        CREATE TABLE IF NOT EXISTS email_otps (
          email TEXT PRIMARY KEY,
          otp_hash TEXT NOT NULL,
          expires_at BIGINT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_sent_at BIGINT NOT NULL,
          send_count INTEGER NOT NULL DEFAULT 1,
          window_start BIGINT NOT NULL
        )
      `)
      .then(() => {
        tableReady = true;
      })
      .finally(() => {
        tableInitPromise = null;
      });
  }
  await tableInitPromise;
}

async function getRecord(email: string): Promise<OtpRecord | null> {
  if (neonPool) {
    try {
      await ensureTable();
      const r = await neonPool.query('SELECT * FROM email_otps WHERE email = $1', [email]);
      if (r.rows.length === 0) return null;
      const row = r.rows[0];
      return {
        email: row.email,
        otpHash: row.otp_hash,
        expiresAt: Number(row.expires_at),
        attempts: Number(row.attempts),
        lastSentAt: Number(row.last_sent_at),
        sendCount: Number(row.send_count),
        windowStart: Number(row.window_start),
      };
    } catch (err: any) {
      console.warn('[EmailOTP] Neon read failed, using memory store:', err?.message || err);
    }
  }
  return memStore.get(email) || null;
}

async function saveRecord(rec: OtpRecord): Promise<void> {
  memStore.set(rec.email, rec);
  if (neonPool) {
    try {
      await ensureTable();
      await neonPool.query(
        `INSERT INTO email_otps (email, otp_hash, expires_at, attempts, last_sent_at, send_count, window_start)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (email) DO UPDATE SET
           otp_hash = EXCLUDED.otp_hash, expires_at = EXCLUDED.expires_at, attempts = EXCLUDED.attempts,
           last_sent_at = EXCLUDED.last_sent_at, send_count = EXCLUDED.send_count, window_start = EXCLUDED.window_start`,
        [rec.email, rec.otpHash, rec.expiresAt, rec.attempts, rec.lastSentAt, rec.sendCount, rec.windowStart]
      );
    } catch (err: any) {
      console.warn('[EmailOTP] Neon write failed (memory store used):', err?.message || err);
    }
  }
}

async function deleteRecord(email: string): Promise<void> {
  memStore.delete(email);
  if (neonPool) {
    try {
      await ensureTable();
      await neonPool.query('DELETE FROM email_otps WHERE email = $1', [email]);
    } catch {}
  }
}

function parseSender(rawFrom?: string): { name: string; email: string } {
  const raw = (rawFrom || '').trim();
  const match = raw.match(/^"?([^"<]+?)"?\s*<([^>]+)>$/);
  if (match && match[2].includes('@')) {
    return { name: match[1].trim() || 'Amar Haat', email: match[2].trim() };
  }
  if (raw.includes('@')) {
    return { name: 'Amar Haat', email: raw };
  }
  const fallbackEmail = process.env.SMTP_USER?.trim() || 'no-reply@amarhaat.local';
  return { name: 'Amar Haat', email: fallbackEmail };
}

async function deliverOtpEmail(email: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  const subject = 'আমার হাট (Amar Haat) – আপনার OTP কোড / Your verification code';
  const text =
    `আপনার আমার হাট OTP কোড: ${otp}\n` +
    `Your Amar Haat verification code: ${otp}\n\n` +
    `কোডটি ১০ মিনিট পর্যন্ত বৈধ। NativeBazar কর্তৃপক্ষ বা অন্য কাউকে এই কোড বলবেন না।\n` +
    `Valid for 10 minutes. Never share this code with anyone.`;
  const html =
    `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:20px;border:1px solid #d1fae5;border-radius:12px">` +
    `<h2 style="color:#047857;margin:0 0 8px">আমার হাট • Amar Haat</h2>` +
    `<p>আপনার OTP কোড / Your verification code:</p>` +
    `<p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#065f46">${otp}</p>` +
    `<p style="color:#555;font-size:13px">কোডটি ১০ মিনিট বৈধ। এই কোড কাউকে বলবেন না।<br/>Valid for 10 minutes. Never share this code.</p></div>`;

  // 1. Brevo HTTP API (fast <1s HTTPS delivery on Render, no SMTP port blocking)
  const brevoKey = process.env.BREVO_API_KEY?.trim();
  if (brevoKey) {
    try {
      const sender = parseSender(process.env.BREVO_FROM || process.env.SMTP_FROM || process.env.SMTP_USER);
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender,
          to: [{ email }],
          subject,
          htmlContent: html,
          textContent: text,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        console.error('[EmailOTP] Brevo rejected request:', resp.status, body.slice(0, 250));
        return { ok: false, error: `Brevo email error (${resp.status}): ${body.slice(0, 140) || resp.statusText}` };
      }
      return { ok: true };
    } catch (err: any) {
      console.error('[EmailOTP] Brevo delivery failed:', err?.message || err);
      return { ok: false, error: `Brevo delivery failed: ${err?.message || 'network timeout'}` };
    }
  }

  // 2. Resend HTTP API
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const from = process.env.RESEND_FROM?.trim() || process.env.SMTP_FROM?.trim() || 'Amar Haat <onboarding@resend.dev>';
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [email], subject, text, html }),
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        console.error('[EmailOTP] Resend rejected request:', resp.status, body.slice(0, 200));
        return { ok: false, error: `Resend email error (${resp.status}): ${body.slice(0, 140) || resp.statusText}` };
      }
      return { ok: true };
    } catch (err: any) {
      console.error('[EmailOTP] Resend delivery failed:', err?.message || err);
      return { ok: false, error: `Resend delivery failed: ${err?.message || 'network timeout'}` };
    }
  }

  // 3. Nodemailer SMTP fallback (strict 5000ms timeouts + strip spaces from app password)
  const host = process.env.SMTP_HOST?.trim();
  if (host) {
    try {
      const port = Number(process.env.SMTP_PORT || 587);
      const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER.trim(), pass: smtpPass } : undefined,
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'no-reply@amarhaat.local',
        to: email,
        subject,
        text,
        html,
      });
      return { ok: true };
    } catch (err: any) {
      console.error('[EmailOTP] SMTP delivery failed:', err?.message || err);
      return { ok: false, error: `SMTP delivery failed: ${err?.message || 'connection error'}` };
    }
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('[EmailOTP] No BREVO_API_KEY / RESEND_API_KEY / SMTP_HOST configured in production.');
    return { ok: false, error: 'Email service is not configured on the server.' };
  }
  // Safe dev fallback: log only (never returned to the client)
  console.warn(`[EmailOTP][DEV] Email provider not configured. OTP for ${email}: ${otp}`);
  return { ok: true };
}

export async function requestEmailOtp(rawEmail: string): Promise<OtpResult> {
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return { ok: false, status: 400, code: 'INVALID_EMAIL', error: 'Please enter a valid email address.' };
  }

  const now = Date.now();
  const existing = await getRecord(email);
  let sendCount = 1;
  let windowStart = now;

  if (existing) {
    const sinceLast = now - existing.lastSentAt;
    if (sinceLast < EMAIL_OTP_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((EMAIL_OTP_RESEND_COOLDOWN_MS - sinceLast) / 1000);
      return {
        ok: false,
        status: 429,
        code: 'EMAIL_OTP_COOLDOWN',
        error: `Please wait ${wait}s before requesting another code.`,
        cooldownSeconds: wait,
      };
    }
    if (now - existing.windowStart < SEND_WINDOW_MS) {
      if (existing.sendCount >= EMAIL_OTP_MAX_SENDS_PER_HOUR) {
        return {
          ok: false,
          status: 429,
          code: 'EMAIL_OTP_HOURLY_LIMIT',
          error: 'Too many codes requested for this email. Please try again in an hour.',
        };
      }
      sendCount = existing.sendCount + 1;
      windowStart = existing.windowStart;
    }
  }

  const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const delivered = await deliverOtpEmail(email, otp);
  if (!delivered.ok) {
    return { ok: false, status: 503, code: 'EMAIL_DELIVERY_FAILED', error: delivered.error || 'Could not send email.' };
  }

  await saveRecord({
    email,
    otpHash: hashOtp(email, otp),
    expiresAt: now + EMAIL_OTP_TTL_MS,
    attempts: 0,
    lastSentAt: now,
    sendCount,
    windowStart,
  });

  return {
    ok: true,
    status: 200,
    cooldownSeconds: EMAIL_OTP_RESEND_COOLDOWN_MS / 1000,
    expiresInSeconds: EMAIL_OTP_TTL_MS / 1000,
  };
}

export async function verifyEmailOtp(rawEmail: string, rawOtp: string): Promise<OtpResult> {
  const email = normalizeEmail(rawEmail);
  const otp = String(rawOtp || '').replace(/\D/g, '');
  if (!isValidEmail(email) || otp.length !== 6) {
    return { ok: false, status: 400, code: 'INVALID_OTP_FORMAT', error: 'Enter the 6-digit code sent to your email.' };
  }

  const rec = await getRecord(email);
  if (!rec) {
    return { ok: false, status: 400, code: 'OTP_NOT_FOUND', error: 'No active code for this email. Please request a new one.' };
  }
  if (Date.now() > rec.expiresAt) {
    await deleteRecord(email);
    return { ok: false, status: 400, code: 'OTP_EXPIRED', error: 'This code has expired. Please request a new one.' };
  }
  if (rec.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
    await deleteRecord(email);
    return { ok: false, status: 429, code: 'OTP_TOO_MANY_ATTEMPTS', error: 'Too many wrong attempts. Please request a new code.' };
  }

  const expected = Buffer.from(rec.otpHash, 'hex');
  const actual = Buffer.from(hashOtp(email, otp), 'hex');
  const match = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (!match) {
    rec.attempts += 1;
    if (rec.attempts >= EMAIL_OTP_MAX_ATTEMPTS) {
      await deleteRecord(email);
      return { ok: false, status: 429, code: 'OTP_TOO_MANY_ATTEMPTS', error: 'Too many wrong attempts. Please request a new code.' };
    }
    await saveRecord(rec);
    return {
      ok: false,
      status: 400,
      code: 'OTP_INVALID',
      error: `Incorrect code. ${EMAIL_OTP_MAX_ATTEMPTS - rec.attempts} attempt(s) left.`,
    };
  }

  await deleteRecord(email); // single use
  return { ok: true, status: 200 };
}
