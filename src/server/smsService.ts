import crypto from 'crypto';
import { pool, isNeonConfigured } from './neonDb.js';
import { db } from './db.js';

export interface DriverSmsPayload {
  orderId: string;
  driverPhone: string;
  trackingUrl: string;
  sellerName?: string;
  buyerName?: string;
  district?: string;
  deliveryAddress?: string;
}

export interface DriverSmsResult {
  id: string;
  success: boolean;
  provider: string;
  status: string;
  normalizedPhone: string;
  trackingUrl: string;
  messageBody: string;
  sentAt: string;
  simulated: boolean;
}

/**
 * Normalizes Bangladeshi and international phone numbers for SMS dispatch.
 * Accepts formats like "01712345678", "+8801712345678", "8801712345678", "01712-345678".
 */
export function normalizePhoneNumber(rawPhone: string): string {
  const cleaned = String(rawPhone || '').replace(/[\s\-()]/g, '');
  if (!cleaned) return '';
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) return cleaned;
  if (/^8801[3-9]\d{8}$/.test(cleaned)) return `+${cleaned}`;
  if (/^01[3-9]\d{8}$/.test(cleaned)) return `+88${cleaned}`;
  return cleaned;
}

/**
 * Validates that a phone number looks dialable for SMS notifications.
 */
export function isValidSmsPhone(rawPhone: string): boolean {
  const normalized = normalizePhoneNumber(rawPhone);
  return /^\+?\d{10,15}$/.test(normalized);
}

/**
 * Auto-SMS utility for dispatching live tracking links to delivery drivers.
 * Uses an external webhook if `SMS_WEBHOOK_URL` is configured, otherwise logs
 * and persists a simulated SMS through `mock-sms-gateway`.
 */
export async function sendDriverTrackingSMS(payload: DriverSmsPayload): Promise<DriverSmsResult> {
  const normalizedPhone = normalizePhoneNumber(payload.driverPhone);
  if (!isValidSmsPhone(normalizedPhone)) {
    throw new Error('Invalid driver mobile number. Expected a valid 11-digit Bangladeshi number (e.g., 017XXXXXXXX).');
  }

  const shortOrderRef = payload.orderId.length > 14
    ? payload.orderId.slice(-8).toUpperCase()
    : payload.orderId;

  const routeInfo = payload.district
    ? ` (${payload.district})`
    : '';

  const messageBody = [
    `[NativeBazar / AmarHaat]`,
    `Order #${shortOrderRef} from ${payload.sellerName || 'Farmer'} -> ${payload.buyerName || 'Wholesaler'}${routeInfo} is Out for Delivery.`,
    `Start trip & share live GPS: ${payload.trackingUrl}`,
  ].join(' ');

  const smsId = `sms-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const sentAt = new Date().toISOString();
  let provider = 'mock-sms-gateway';
  let status = 'sent';
  let simulated = true;

  const webhookUrl = process.env.SMS_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.SMS_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.SMS_API_KEY}`;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: normalizedPhone,
          message: messageBody,
          orderId: payload.orderId,
          trackingUrl: payload.trackingUrl,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      provider = res.ok ? 'custom-sms-webhook' : 'mock-sms-gateway';
      status = res.ok ? 'delivered' : 'fallback_simulated';
      simulated = !res.ok;
    } catch (err: any) {
      console.warn('[Auto-SMS] External SMS webhook failed, falling back to mock gateway:', err?.message);
    }
  }

  // Always log clearly in console for live demo & debugging visibility
  console.log('\n================ [AUTO-SMS DISPATCH] ================');
  console.log(`SMS ID   : ${smsId}`);
  console.log(`To       : ${normalizedPhone}`);
  console.log(`Order ID : ${payload.orderId}`);
  console.log(`Provider : ${provider} (${status})`);
  console.log(`Message  : ${messageBody}`);
  console.log('=====================================================\n');

  // Persist to Neon PostgreSQL when configured
  if (isNeonConfigured) {
    try {
      await pool.query(
        `INSERT INTO sms_logs (id, order_id, recipient_phone, message_body, tracking_url, provider, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [smsId, payload.orderId, normalizedPhone, messageBody, payload.trackingUrl, provider, status, new Date(sentAt)]
      );
    } catch (err: any) {
      console.warn('[Auto-SMS] Neon sms_logs insert skipped:', err?.message);
    }
  }

  // Persist to SQLite backup store
  try {
    db.prepare(
      `INSERT OR IGNORE INTO sms_logs (id, order_id, recipient_phone, message_body, tracking_url, provider, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(smsId, payload.orderId, normalizedPhone, messageBody, payload.trackingUrl, provider, status, sentAt);
  } catch (err: any) {
    console.warn('[Auto-SMS] SQLite sms_logs insert skipped:', err?.message);
  }

  return {
    id: smsId,
    success: true,
    provider,
    status,
    normalizedPhone,
    trackingUrl: payload.trackingUrl,
    messageBody,
    sentAt,
    simulated,
  };
}

