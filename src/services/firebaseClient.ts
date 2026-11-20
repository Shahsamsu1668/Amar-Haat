/**
 * Firebase Web Client Authentication Service (Phone OTP + Invisible reCAPTCHA)
 *
 * Uses `firebase/auth` with an invisible `RecaptchaVerifier` attached to the
 * registration flow to silently block automated bots and SMS bombing.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

export function isFirebaseClientConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
}

export function getFirebaseAuth(): Auth {
  if (!isFirebaseClientConfigured()) {
    throw new Error(
      'Firebase Phone Authentication is not configured. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in your environment.'
    );
  }
  if (!cachedApp) {
    cachedApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  if (!cachedAuth) {
    cachedAuth = getAuth(cachedApp);
    cachedAuth.useDeviceLanguage();
  }
  return cachedAuth;
}

const BANGLA_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Convert Bangla numerals (০-৯) to ASCII digits (0-9). */
export function normalizeDigits(input: string): string {
  return String(input || '')
    .split('')
    .map((ch) => {
      const idx = BANGLA_DIGITS.indexOf(ch);
      return idx >= 0 ? String(idx) : ch;
    })
    .join('');
}

/**
 * Normalizes Bangladeshi (and international) phone numbers to strict E.164 format
 * required by Firebase Phone Auth (`+8801XXXXXXXXX`).
 */
export function formatPhoneToE164(rawPhone: string): {
  valid: boolean;
  e164: string;
  local: string;
} {
  const cleaned = normalizeDigits(rawPhone).replace(/[\s\-()]/g, '').trim();

  // Bangladeshi local: 01[3-9]XXXXXXXX (11 digits)
  if (/^01[3-9]\d{8}$/.test(cleaned)) {
    return { valid: true, e164: `+88${cleaned}`, local: cleaned };
  }
  // Bangladeshi without leading '+': 8801[3-9]XXXXXXXX (13 digits)
  if (/^8801[3-9]\d{8}$/.test(cleaned)) {
    return { valid: true, e164: `+${cleaned}`, local: `0${cleaned.slice(3)}` };
  }
  // Bangladeshi E.164: +8801[3-9]XXXXXXXX
  if (/^\+8801[3-9]\d{8}$/.test(cleaned)) {
    return { valid: true, e164: cleaned, local: `0${cleaned.slice(4)}` };
  }
  // Generic international E.164 (e.g., Firebase test numbers like +16505551234)
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    return { valid: true, e164: cleaned, local: cleaned };
  }

  return { valid: false, e164: cleaned, local: cleaned };
}

/**
 * Creates an invisible Firebase `RecaptchaVerifier` bound to the given container
 * element or ID. Silently protects against bots and SMS bombing without extra UI friction.
 */
export function createInvisibleRecaptcha(
  container: string | HTMLElement,
  onExpired?: () => void
): RecaptchaVerifier {
  const auth = getFirebaseAuth();
  return new RecaptchaVerifier(auth, container, {
    size: 'invisible',
    callback: () => {
      // Invisible reCAPTCHA solved silently
    },
    'expired-callback': () => {
      onExpired?.();
    },
  });
}

/**
 * Triggers Firebase Phone Auth SMS OTP delivery via `signInWithPhoneNumber`.
 */
export async function sendFirebasePhoneOtp(
  e164Phone: string,
  recaptchaVerifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  return signInWithPhoneNumber(auth, e164Phone, recaptchaVerifier);
}

/**
 * Translates Firebase Auth error codes into clear user-facing English/Bangla messages.
 */
export function mapFirebaseAuthError(err: any, language: 'en' | 'bn'): string {
  const code = String(err?.code || '');
  const bn = language === 'bn';

  switch (code) {
    case 'auth/invalid-phone-number':
      return bn
        ? 'মোবাইল নম্বরটি সঠিক নয়। সঠিক ১১ সংখ্যার নম্বর (যেমন: 017XXXXXXXX) দিন।'
        : 'Invalid phone number format. Please enter a valid mobile number (e.g. 017XXXXXXXX).';
    case 'auth/too-many-requests':
      return bn
        ? 'অতিরিক্ত OTP অনুরোধের কারণে সাময়িকভাবে ব্লক করা হয়েছে। ৫ মিনিট পর আবার চেষ্টা করুন।'
        : 'Too many OTP requests detected. Please wait 5 minutes before trying again.';
    case 'auth/invalid-verification-code':
      return bn
        ? 'আপনার দেওয়া OTP কোডটি সঠিক নয়। অনুগ্রহ করে এসএমএস থেকে সঠিক ৬ সংখ্যার কোড লিখুন।'
        : 'Invalid OTP code. Please check your SMS and enter the exact 6-digit code.';
    case 'auth/code-expired':
      return bn
        ? 'OTP কোডটির মেয়াদ শেষ হয়ে গেছে। নতুন OTP পাঠিয়ে আবার চেষ্টা করুন।'
        : 'This OTP code has expired. Please request a new OTP.';
    case 'auth/captcha-check-failed':
      return bn
        ? 'নিরাপত্তা যাচাইকরণ (reCAPTCHA) ব্যর্থ হয়েছে। পেজ রিলোড করে আবার চেষ্টা করুন।'
        : 'Security verification (reCAPTCHA) failed. Please refresh and try again.';
    case 'auth/quota-exceeded':
      return bn
        ? 'SMS কোটা সাময়িকভাবে পূর্ণ হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।'
        : 'SMS verification quota temporarily exceeded. Please try again later.';
    case 'auth/network-request-failed':
      return bn
        ? 'ইন্টারনেট সংযোগে সমস্যা হয়েছে। আপনার নেটওয়ার্ক যাচাই করে আবার চেষ্টা করুন।'
        : 'Network error while contacting Firebase Authentication. Please check your connection.';
    case 'auth/operation-not-allowed':
      return bn
        ? 'Firebase-এ Phone Authentication চালু নেই। অ্যাডমিনের সাথে যোগাযোগ করুন।'
        : 'Phone Authentication is not enabled in Firebase Console. Please contact support.';
    default:
      return (
        err?.message ||
        (bn ? 'ফোন যাচাইকরণে সমস্যা হয়েছে। আবার চেষ্টা করুন।' : 'Phone verification failed. Please try again.')
      );
  }
}

export type { ConfirmationResult, RecaptchaVerifier };
