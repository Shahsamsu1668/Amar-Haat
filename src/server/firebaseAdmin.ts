/**
 * Firebase Admin SDK Verification Service (Server-side)
 *
 * Cryptographically verifies Firebase ID tokens issued after SMS OTP verification
 * using `firebase-admin/auth`. Supports:
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON (full service account JSON string — recommended for Render)
 *   2. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 *   3. GOOGLE_APPLICATION_CREDENTIALS (Application Default Credentials)
 */

import { initializeApp, getApps, getApp, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

export class FirebaseAuthVerificationError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 401, code = 'INVALID_FIREBASE_TOKEN') {
    super(message);
    this.name = 'FirebaseAuthVerificationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

let adminApp: App | null = null;
let initAttempted = false;

function initFirebaseAdmin(): App | null {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApp();
    return adminApp;
  }
  if (initAttempted) return null;
  initAttempted = true;

  try {
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
    if (serviceAccountRaw) {
      const parsed = JSON.parse(serviceAccountRaw);
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      adminApp = initializeApp({
        credential: cert(parsed),
        projectId: parsed.project_id || process.env.FIREBASE_PROJECT_ID,
      });
      console.log(`[Firebase Admin] Initialized via FIREBASE_SERVICE_ACCOUNT_JSON (project: ${parsed.project_id || 'default'})`);
      return adminApp;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY?.trim();

    if (projectId && clientEmail && privateKeyRaw) {
      const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      console.log(`[Firebase Admin] Initialized via env credentials (project: ${projectId})`);
      return adminApp;
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      adminApp = initializeApp({
        credential: applicationDefault(),
        projectId: projectId || undefined,
      });
      console.log('[Firebase Admin] Initialized via GOOGLE_APPLICATION_CREDENTIALS');
      return adminApp;
    }

    console.warn(
      '[Firebase Admin] Credentials not configured (set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY).'
    );
    return null;
  } catch (err: any) {
    console.error('[Firebase Admin] Initialization failed:', err?.message || err);
    return null;
  }
}

export function isFirebaseAdminConfigured(): boolean {
  return initFirebaseAdmin() !== null;
}

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';
function toAsciiDigits(raw: string): string {
  return String(raw || '')
    .split('')
    .map((ch) => {
      const idx = BANGLA_DIGITS.indexOf(ch);
      return idx >= 0 ? String(idx) : ch;
    })
    .join('');
}

/**
 * Produces all canonical lookup representations of a phone number so duplicate
 * detection and login work identically across `017XXXXXXXX`, `88017XXXXXXXX`,
 * and `+88017XXXXXXXX`.
 */
export function getPhoneLookupVariants(rawPhone: string): string[] {
  const trimmed = toAsciiDigits(rawPhone).replace(/[\s\-()]/g, '').trim();
  if (!trimmed) return [];

  const set = new Set<string>([trimmed]);

  if (/^\+8801[3-9]\d{8}$/.test(trimmed)) {
    const withoutPlus = trimmed.slice(1); // 8801XXXXXXXXX
    const local = `0${trimmed.slice(4)}`; // 01XXXXXXXXX
    set.add(withoutPlus);
    set.add(local);
  } else if (/^8801[3-9]\d{8}$/.test(trimmed)) {
    set.add(`+${trimmed}`);
    set.add(`0${trimmed.slice(3)}`);
  } else if (/^01[3-9]\d{8}$/.test(trimmed)) {
    set.add(`+88${trimmed}`);
    set.add(`88${trimmed}`);
  }

  return Array.from(set);
}

/**
 * Returns the canonical stored phone representation:
 * - Bangladeshi numbers (`+8801[3-9]XXXXXXXX`) -> `01XXXXXXXXX` (consistent with platform directory)
 * - Other international E.164 numbers -> E.164 (`+...`)
 */
export function normalizeCanonicalPhone(verifiedPhone: string): string {
  const cleaned = toAsciiDigits(verifiedPhone).replace(/[\s\-()]/g, '').trim();
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    return `0${cleaned.slice(4)}`;
  }
  if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    return `0${cleaned.slice(3)}`;
  }
  return cleaned;
}

export interface VerifiedFirebasePhoneResult {
  uid: string;
  e164Phone: string;
  canonicalPhone: string;
  lookupVariants: string[];
  decoded: DecodedIdToken;
}

/**
 * Cryptographically verifies a Firebase ID token using `firebase-admin/auth`
 * and extracts the verified phone number.
 */
export async function verifyFirebaseIdToken(
  firebaseToken: string
): Promise<VerifiedFirebasePhoneResult> {
  if (!firebaseToken || typeof firebaseToken !== 'string' || !firebaseToken.trim()) {
    throw new FirebaseAuthVerificationError(
      'Phone verification token (firebaseToken) is required to complete registration.',
      401,
      'MISSING_FIREBASE_TOKEN'
    );
  }

  const app = initFirebaseAdmin();
  if (!app) {
    throw new FirebaseAuthVerificationError(
      'Firebase Admin SDK is not configured on the server. Registration requires verified Firebase credentials.',
      503,
      'FIREBASE_ADMIN_NOT_CONFIGURED'
    );
  }

  let decoded: DecodedIdToken;
  try {
    // checkRevoked = true enforces token revocation checks against Firebase
    decoded = await getAuth(app).verifyIdToken(firebaseToken.trim(), true);
  } catch (err: any) {
    const code = String(err?.code || '');
    if (code === 'auth/id-token-expired') {
      throw new FirebaseAuthVerificationError(
        'Your phone verification session expired. Please request a new OTP and verify again.',
        401,
        'FIREBASE_TOKEN_EXPIRED'
      );
    }
    if (code === 'auth/id-token-revoked') {
      throw new FirebaseAuthVerificationError(
        'Your phone verification token was revoked. Please verify your phone again.',
        401,
        'FIREBASE_TOKEN_REVOKED'
      );
    }
    throw new FirebaseAuthVerificationError(
      'Invalid or tampered Firebase phone verification token.',
      401,
      'INVALID_FIREBASE_TOKEN'
    );
  }

  const verifiedPhone = decoded.phone_number;
  if (!verifiedPhone || typeof verifiedPhone !== 'string') {
    throw new FirebaseAuthVerificationError(
      'Firebase token does not contain a verified phone number.',
      401,
      'MISSING_VERIFIED_PHONE'
    );
  }

  return {
    uid: decoded.uid,
    e164Phone: verifiedPhone,
    canonicalPhone: normalizeCanonicalPhone(verifiedPhone),
    lookupVariants: getPhoneLookupVariants(verifiedPhone),
    decoded,
  };
}


export interface VerifiedGoogleResult {
  uid: string;
  email: string;
  name?: string;
}

/**
 * Verifies a Firebase ID token obtained via Google Sign-In (`signInWithPopup` +
 * `GoogleAuthProvider`) and returns the Google-verified email + Firebase UID.
 */
export async function verifyFirebaseGoogleIdToken(idToken: string): Promise<VerifiedGoogleResult> {
  if (!idToken || typeof idToken !== 'string' || !idToken.trim()) {
    throw new FirebaseAuthVerificationError('Google sign-in token is required.', 401, 'MISSING_GOOGLE_TOKEN');
  }
  const app = initFirebaseAdmin();
  if (!app) {
    throw new FirebaseAuthVerificationError(
      'Firebase Admin SDK is not configured on the server. Google sign-in requires Firebase credentials.',
      503,
      'FIREBASE_ADMIN_NOT_CONFIGURED'
    );
  }
  let decoded: DecodedIdToken;
  try {
    decoded = await getAuth(app).verifyIdToken(idToken.trim());
  } catch (err: any) {
    const expired = String(err?.code || '') === 'auth/id-token-expired';
    throw new FirebaseAuthVerificationError(
      expired ? 'Google sign-in session expired. Please try again.' : 'Invalid Google sign-in token.',
      401,
      expired ? 'GOOGLE_TOKEN_EXPIRED' : 'INVALID_GOOGLE_TOKEN'
    );
  }
  if (decoded.firebase?.sign_in_provider !== 'google.com') {
    throw new FirebaseAuthVerificationError('Token was not issued by Google sign-in.', 401, 'NOT_GOOGLE_PROVIDER');
  }
  if (!decoded.email || decoded.email_verified !== true) {
    throw new FirebaseAuthVerificationError('Google account email is not verified.', 401, 'GOOGLE_EMAIL_UNVERIFIED');
  }
  return { uid: decoded.uid, email: decoded.email.trim().toLowerCase(), name: decoded.name };
}
