import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language, User } from '../types';
import { AuthStore, LoginResult } from '../data/store';
import { BANGLADESH_LOCATIONS } from '../data/mockData';
import { authApi } from '../services/api';
import {
  createInvisibleRecaptcha,
  formatPhoneToE164,
  isFirebaseClientConfigured,
  mapFirebaseAuthError,
  normalizeDigits,
  sendFirebasePhoneOtp,
  type ConfirmationResult,
  type RecaptchaVerifier,
} from '../services/firebaseClient';
import {
  Sprout,
  Briefcase,
  Store,
  ShoppingCart,
  Lock,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  User as UserIcon,
  KeyRound,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface AuthPageProps {
  language: Language;
  onLanguageToggle: () => void;
  onAuthSuccess: (user: User) => void;
  onBack?: () => void;
  initialMode?: 'login' | 'register';
  initialRole?: 'farmer' | 'wholesaler' | 'retailer' | 'consumer';
}

const OTP_RATE_LIMIT_KEY = 'nb_otp_rate_limit_v1';
const MAX_OTP_REQUESTS_PER_SESSION = 3;
const OTP_LOCKOUT_SECONDS = 300; // 5 minutes strict cooldown after 3 requests
const OTP_RESEND_THROTTLE_SECONDS = 30; // Short anti-spam delay between requests 1..3

interface OtpRateLimitState {
  count: number;
  lockoutUntil: number; // epoch ms
}

function readOtpRateLimit(): OtpRateLimitState {
  try {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(OTP_RATE_LIMIT_KEY) : null;
    if (!raw) return { count: 0, lockoutUntil: 0 };
    const parsed = JSON.parse(raw);
    const now = Date.now();
    if (parsed.lockoutUntil && parsed.lockoutUntil <= now) {
      // Lockout expired — reset session counter cleanly
      sessionStorage.removeItem(OTP_RATE_LIMIT_KEY);
      return { count: 0, lockoutUntil: 0 };
    }
    return {
      count: Number(parsed.count) || 0,
      lockoutUntil: Number(parsed.lockoutUntil) || 0,
    };
  } catch {
    return { count: 0, lockoutUntil: 0 };
  }
}

function saveOtpRateLimit(state: OtpRateLimitState): void {
  try {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(OTP_RATE_LIMIT_KEY, JSON.stringify(state));
    }
  } catch {}
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  language,
  onLanguageToggle,
  onAuthSuccess,
  onBack,
  initialMode = 'login',
  initialRole = 'farmer',
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);

  // ONLY 4 public roles
  const [selectedRole, setSelectedRole] = useState<'farmer' | 'wholesaler' | 'retailer' | 'consumer'>(initialRole);
  useEffect(() => {
    if (initialRole) setSelectedRole(initialRole);
  }, [initialRole]);

  // Login credentials - completely blank by default (NO hardcoded demo passwords)
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Admin access portal state
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPin, setAdminPin] = useState('');

  // Login Lockout State
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // Registration Step 1 fields
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regDistrict, setRegDistrict] = useState('Bogura');
  const [regUpazila, setRegUpazila] = useState('Shibganj');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Role-specific registration fields
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Wholesaler');
  const [shopName, setShopName] = useState('');
  const [tradeAddress, setTradeAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Registration Step 2 (Firebase Phone OTP + Invisible reCAPTCHA + Rate Limiting)
  const [otpCode, setOtpCode] = useState('');
  const [otpTargetE164, setOtpTargetE164] = useState('');
  const [otpTargetLocal, setOtpTargetLocal] = useState('');
  const [otpInfo, setOtpInfo] = useState('');
  const [otpRequestCount, setOtpRequestCount] = useState<number>(() => readOtpRateLimit().count);
  const [otpLockoutRemaining, setOtpLockoutRemaining] = useState<number>(() => {
    const st = readOtpRateLimit();
    return st.lockoutUntil > Date.now() ? Math.ceil((st.lockoutUntil - Date.now()) / 1000) : 0;
  });
  const [otpResendCooldown, setOtpResendCooldown] = useState<number>(0);

  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

  const [error, setError] = useState('');
  const [isConflictError, setIsConflictError] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);

  // Cleanly dispose invisible reCAPTCHA verifier
  const clearRecaptcha = useCallback(() => {
    if (recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current.clear();
      } catch {}
      recaptchaVerifierRef.current = null;
    }
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = '';
    }
  }, []);

  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, [clearRecaptcha]);

  // Countdown timer for login lockout
  useEffect(() => {
    if (lockoutSeconds > 0) {
      const lockTimer = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(lockTimer);
    }
  }, [lockoutSeconds]);

  // Strict 5-minute (300s) OTP lockout countdown timer
  useEffect(() => {
    if (otpLockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setOtpLockoutRemaining((prev) => {
        if (prev <= 1) {
          // Lockout finished — reset session OTP attempt counter cleanly
          setOtpRequestCount(0);
          saveOtpRateLimit({ count: 0, lockoutUntil: 0 });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [otpLockoutRemaining]);

  // Short throttle countdown between OTP requests 1 -> 2 -> 3
  useEffect(() => {
    if (otpResendCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpResendCooldown]);

  // Upazilas based on chosen district
  const selectedLocation = BANGLADESH_LOCATIONS.find(
    (l) => l.district.toLowerCase() === regDistrict.toLowerCase()
  );
  const upazilaList = selectedLocation ? selectedLocation.upazilas : ['Sadar', 'Shibganj', 'Sherpur'];

  // Handle Standard Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsConflictError(false);
    setLoading(true);

    try {
      // 1. Try persistent backend API
      try {
        const res = await authApi.login({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
          role: selectedRole,
        });
        if (res && res.success && res.user) {
          AuthStore.setCurrentUser(res.user);
          setLoading(false);
          onAuthSuccess(res.user);
          return;
        }
      } catch (backendErr: any) {
        // Strictly respect backend credential and verification rejections (401 / 403)
        const msg: string = (backendErr?.message || '').toLowerCase();
        const isAuthRejection =
          msg.includes('not verified') ||
          msg.includes('otp') ||
          msg.includes('invalid') ||
          msg.includes('incorrect') ||
          msg.includes('wrong password') ||
          msg.includes('unauthorized') ||
          msg.includes('no account found') ||
          msg.includes('forbidden') ||
          msg.includes('401') ||
          msg.includes('403');
        if (isAuthRejection && !msg.includes('failed to fetch') && !msg.includes('networkerror')) {
          setError(backendErr.message);
          setLoading(false);
          return;
        }
        // Only fall through to local store on genuine offline/network failure
      }

      // 2. Fallback to client-side store verification (offline dev only)
      const localResult: LoginResult = AuthStore.login(
        loginIdentifier.trim(),
        loginPassword,
        undefined,
        selectedRole
      );

      setLoading(false);
      if (localResult.locked) {
        setIsLocked(true);
        setLockoutSeconds(localResult.remainingSeconds || 180);
        setError(
          language === 'bn'
            ? `একাধিক ভুল চেষ্টার কারণে অ্যাকাউন্ট সাময়িকভাবে লক করা হয়েছে। ${localResult.remainingSeconds} সেকেন্ড পর চেষ্টা করুন।`
            : `Account locked due to 3 failed attempts. Please retry in ${localResult.remainingSeconds}s.`
        );
        return;
      }

      if (!localResult.success || !localResult.user) {
        setError(
          language === 'bn'
            ? 'মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়। দয়া করে আবার চেষ্টা করুন।'
            : 'Incorrect credentials. Please verify your phone number and password.'
        );
        return;
      }

      if (!localResult.user.verified) {
        setError(
          language === 'bn'
            ? 'আপনার মোবাইল নম্বরটি যাচাইকৃত নয়। লগইন করার আগে OTP যাচাই সম্পন্ন করুন।'
            : 'Your phone number is not verified. Please complete OTP verification before logging in.'
        );
        return;
      }

      onAuthSuccess(localResult.user);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Login failed.');
    }
  };

  // Handle Admin Login (Restricted to Authorized Administrators only)
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await authApi.adminLogin({
        username: adminUsername.trim(),
        password: adminPassword,
        securityPin: adminPin.trim(),
      });

      setLoading(false);
      if (res && res.success && res.user) {
        AuthStore.setCurrentUser(res.user);
        onAuthSuccess(res.user);
      } else {
        setError(language === 'bn' ? 'অ্যাডমিন এক্সেস প্রত্যাখ্যাত।' : 'Admin Access Denied.');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || (language === 'bn' ? 'অনুমোদিত অ্যাডমিন তথ্য সঠিক নয়।' : 'Invalid admin authorization credentials.'));
    }
  };

  // Shared Firebase OTP dispatch with invisible reCAPTCHA + strict 3-request / 300s rate-limiting
  const dispatchFirebaseOtp = async (e164Phone: string, localPhone: string): Promise<boolean> => {
    // Re-read persisted session rate limit to prevent bypass
    const currentLimit = readOtpRateLimit();
    const now = Date.now();

    if (currentLimit.lockoutUntil > now) {
      const rem = Math.ceil((currentLimit.lockoutUntil - now) / 1000);
      setOtpLockoutRemaining(rem);
      setOtpRequestCount(currentLimit.count);
      setError(
        language === 'bn'
          ? `সর্বোচ্চ ৩ বার OTP অনুরোধের সীমা অতিক্রম হয়েছে। অনুগ্রহ করে ${formatCountdown(rem)} পর আবার চেষ্টা করুন।`
          : `Maximum 3 OTP requests exceeded. Please wait ${formatCountdown(rem)} before requesting another OTP.`
      );
      return false;
    }

    if (currentLimit.count >= MAX_OTP_REQUESTS_PER_SESSION) {
      const lockoutUntil = now + OTP_LOCKOUT_SECONDS * 1000;
      saveOtpRateLimit({ count: currentLimit.count, lockoutUntil });
      setOtpLockoutRemaining(OTP_LOCKOUT_SECONDS);
      setError(
        language === 'bn'
          ? 'সর্বোচ্চ ৩ বার OTP পাঠানো হয়েছে। নিরাপত্তার স্বার্থে ৫ মিনিট (৩০০ সেকেন্ড) পর আবার চেষ্টা করুন।'
          : 'You have reached the maximum of 3 OTP requests this session. Please wait 5 minutes (300s).'
      );
      return false;
    }

    if (!isFirebaseClientConfigured()) {
      setError(
        language === 'bn'
          ? 'Firebase Phone Auth কনফিগার করা হয়নি। অনুগ্রহ করে পরিবেশ ভেরিয়েবল (VITE_FIREBASE_*) যুক্ত করুন।'
          : 'Firebase Phone Authentication is not configured. Please add VITE_FIREBASE_* keys to your environment.'
      );
      return false;
    }

    if (!recaptchaContainerRef.current) {
      setError(t('Security verifier failed to initialize. Please reload.', 'নিরাপত্তা যাচাইকারী লোড হয়নি। পেজ রিলোড করুন।'));
      return false;
    }

    // Create fresh invisible RecaptchaVerifier for this dispatch
    clearRecaptcha();
    const verifier = createInvisibleRecaptcha(recaptchaContainerRef.current, () => {
      clearRecaptcha();
    });
    recaptchaVerifierRef.current = verifier;

    try {
      const confirmation = await sendFirebasePhoneOtp(e164Phone, verifier);
      confirmationResultRef.current = confirmation;
      setOtpTargetE164(e164Phone);
      setOtpTargetLocal(localPhone);

      const nextCount = currentLimit.count + 1;
      setOtpRequestCount(nextCount);

      if (nextCount >= MAX_OTP_REQUESTS_PER_SESSION) {
        // Strict 5-minute (300s) disable timer on Resend OTP after 3rd request
        const lockoutUntil = Date.now() + OTP_LOCKOUT_SECONDS * 1000;
        saveOtpRateLimit({ count: nextCount, lockoutUntil });
        setOtpLockoutRemaining(OTP_LOCKOUT_SECONDS);
        setOtpResendCooldown(0);
      } else {
        saveOtpRateLimit({ count: nextCount, lockoutUntil: 0 });
        setOtpResendCooldown(OTP_RESEND_THROTTLE_SECONDS);
      }

      setOtpInfo(
        language === 'bn'
          ? `${e164Phone} নম্বরে ৬ সংখ্যার OTP পাঠানো হয়েছে।`
          : `A 6-digit verification code has been sent via SMS to ${e164Phone}.`
      );
      return true;
    } catch (firebaseErr: any) {
      clearRecaptcha();
      setError(mapFirebaseAuthError(firebaseErr, language));
      return false;
    }
  };

  // Registration Step 1 Submit: Validate details & trigger Firebase Phone OTP
  const handleStep1SendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsConflictError(false);
    setOtpInfo('');

    if (!regName.trim()) {
      setError(language === 'bn' ? 'আপনার পূর্ণ নাম লিখুন।' : 'Please enter your full name.');
      return;
    }

    const parsedPhone = formatPhoneToE164(regPhone);
    if (!parsedPhone.valid) {
      setError(
        language === 'bn'
          ? 'সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX বা +88017XXXXXXXX)।'
          : 'Please enter a valid 11-digit Bangladeshi mobile number (e.g., 017XXXXXXXX or +88017XXXXXXXX).'
      );
      return;
    }

    if (regPassword.length < 6) {
      setError(language === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' : 'Password must be at least 6 characters.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError(language === 'bn' ? 'উভয় পাসওয়ার্ড একই হতে হবে।' : 'Passwords do not match.');
      return;
    }

    if (selectedRole === 'wholesaler' && !businessName.trim()) {
      setError(language === 'bn' ? 'আপনার আড়ত বা প্রতিষ্ঠানের নাম লিখুন।' : 'Please enter your wholesale business / arat name.');
      return;
    }

    if (selectedRole === 'retailer' && !shopName.trim()) {
      setError(language === 'bn' ? 'আপনার খুচরা দোকানের নাম লিখুন।' : 'Please enter your retail shop name.');
      return;
    }

    setLoading(true);
    try {
      const sent = await dispatchFirebaseOtp(parsedPhone.e164, parsedPhone.local);
      if (sent) {
        setOtpCode('');
        setRegStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler on Step 2 (strictly bounded by 3-request limit & 300s lockout)
  const handleResendOtp = async () => {
    if (loading || otpLockoutRemaining > 0 || otpResendCooldown > 0) return;
    setError('');
    setIsConflictError(false);
    setOtpInfo('');

    if (!otpTargetE164) {
      setRegStep(1);
      return;
    }

    setLoading(true);
    try {
      await dispatchFirebaseOtp(otpTargetE164, otpTargetLocal);
    } finally {
      setLoading(false);
    }
  };

  // Registration Step 2 Submit: Confirm OTP with Firebase -> get ID Token -> POST /api/auth/register
  const handleStep2VerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsConflictError(false);

    const cleanOtp = normalizeDigits(otpCode).replace(/\D/g, '').trim();
    if (cleanOtp.length !== 6) {
      setError(
        language === 'bn'
          ? 'অনুগ্রহ করে এসএমএস-এ প্রাপ্ত ৬ সংখ্যার সঠিক OTP কোড লিখুন।'
          : 'Please enter the exact 6-digit OTP code received via SMS.'
      );
      return;
    }

    if (!confirmationResultRef.current) {
      setError(
        language === 'bn'
          ? 'OTP সেশন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় OTP পাঠান।'
          : 'OTP verification session expired. Please request a new OTP.'
      );
      return;
    }

    setLoading(true);
    try {
      // 1. Verify OTP with Firebase Auth
      let firebaseToken: string;
      try {
        const userCredential = await confirmationResultRef.current.confirm(cleanOtp);
        firebaseToken = await userCredential.user.getIdToken(true);
      } catch (otpErr: any) {
        setError(mapFirebaseAuthError(otpErr, language));
        setLoading(false);
        return;
      }

      // 2. Submit verified Firebase ID Token + registration details to backend
      const payload = {
        role: selectedRole,
        name: regName.trim(),
        phone: otpTargetLocal || regPhone.trim(),
        email: regEmail.trim(),
        district: regDistrict,
        upazila: regUpazila,
        password: regPassword,
        firebaseToken,
        businessName: selectedRole === 'wholesaler' ? (businessName.trim() || `${regName}'s Wholesale Arat`) : undefined,
        businessType: selectedRole === 'wholesaler' ? businessType : undefined,
        shopName: selectedRole === 'retailer' ? (shopName.trim() || `${regName}'s Agro Shop`) : undefined,
        tradeAddress: selectedRole === 'retailer' ? tradeAddress.trim() : undefined,
        deliveryAddress: selectedRole === 'consumer' ? deliveryAddress.trim() : undefined,
      };

      const res = await authApi.register(payload);
      if (res && res.success && res.user) {
        clearRecaptcha();
        AuthStore.setCurrentUser(res.user);
        setLoading(false);
        onAuthSuccess(res.user);
        return;
      }

      setError(language === 'bn' ? 'নিবন্ধন সম্পন্ন হয়নি। আবার চেষ্টা করুন।' : 'Registration failed. Please try again.');
      setLoading(false);
    } catch (err: any) {
      const msg = String(err?.message || 'Registration failed.');
      if (msg.toLowerCase().includes('already exists') || msg.includes('409')) {
        setIsConflictError(true);
        setError(
          language === 'bn'
            ? 'এই মোবাইল নম্বর দিয়ে ইতিমধ্যেই একটি অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে লগইন করুন।'
            : 'Account with this number already exists. Please sign in instead.'
        );
      } else {
        setError(msg);
      }
      setLoading(false);
    }
  };

  const isResendDisabled = loading || otpLockoutRemaining > 0 || otpResendCooldown > 0;
  const remainingAttempts = Math.max(0, MAX_OTP_REQUESTS_PER_SESSION - otpRequestCount);

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Invisible Firebase reCAPTCHA Mount Point (never display:none so widget mounts silently) */}
      <div ref={recaptchaContainerRef} id="nb-firebase-recaptcha" className="sr-only" />

      {/* Top Bar with Back and Language switch */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between mb-4">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-stone-600 dark:text-stone-200 hover:text-emerald-700 dark:hover:text-emerald-400 bg-white dark:bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('Back to Marketplace', 'মার্কেটপ্লেসে ফিরুন')}</span>
          </button>
        ) : <div />}

        <button
          onClick={onLanguageToggle}
          className="text-xs font-bold text-stone-700 dark:text-stone-200 bg-white dark:bg-stone-800 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors shadow-2xs cursor-pointer"
        >
          {language === 'bn' ? 'English' : 'বাংলা'}
        </button>
      </div>

      <div className="max-w-xl w-full mx-auto bg-white dark:bg-[#161b22] rounded-3xl shadow-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-900 to-stone-900 px-6 py-6 text-white text-center relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-3 shadow-inner">
            <Sprout className="w-7 h-7 text-emerald-300" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {language === 'bn' ? 'আমার হাট' : 'Amar Haat'} • {t('Agricultural Platform', 'আমার হাট কৃষি প্ল্যাটফর্ম')}
          </h1>
          <p className="text-xs text-emerald-100/90 mt-1 max-w-sm mx-auto font-medium">
            {t(
              'Secure agricultural supply chain connecting Farmers, Wholesalers, Retailers & Consumers.',
              'কৃষক, পাইকার, খুচরা বিক্রেতা ও ভোক্তাদের সরাসরি নিরাপদ কৃষি বাজার।'
            )}
          </p>
        </div>

        {/* Admin Portal Toggle View */}
        {isAdminMode ? (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-700 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-slate-800 dark:text-emerald-400" />
                <h2 className="text-base font-bold text-stone-900 dark:text-white">
                  {t('Authorized Administrator Access', 'অনুমোদিত অ্যাডমিন পোর্টাল')}
                </h2>
              </div>
              <button
                onClick={() => { setIsAdminMode(false); setError(''); }}
                className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                {t('Return to Public Login', 'সাধারণ লগইনে ফিরুন')}
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-stone-800/70 border border-slate-200 dark:border-stone-700 rounded-xl text-xs text-slate-700 dark:text-stone-200 font-medium">
              {t(
                'This section is strictly restricted to certified platform administrators. Unauthorized access attempts are monitored and logged.',
                'এই সেকশনটি শুধুমাত্র প্ল্যাটফর্ম অ্যাডমিনিস্ট্রেটরদের জন্য সংরক্ষিত। অননুমোদিত প্রচেষ্টা নিরীক্ষিত হয়।'
              )}
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                  {t('Admin ID / Username', 'অ্যাডমিন আইডি')}
                </label>
                <input
                  type="text"
                  required
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="NativeBazarAdmin"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                  {t('Secret Password', 'গোপন পাসওয়ার্ড')}
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                  {t('Clearance 2FA Security PIN', 'সিকিউরিটি পিন')}
                </label>
                <input
                  type="password"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="883650"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 dark:text-white" />
                <span>{loading ? t('Authenticating...', 'যাচাই করা হচ্ছে...') : t('Verify Admin Clearance', 'অ্যাডমিন যাচাই ও প্রবেশ')}</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="p-6 sm:p-8 space-y-6">
            {/* Mode Selector: Login vs Register */}
            <div className="flex bg-stone-100 dark:bg-stone-800/90 p-1 rounded-2xl border border-transparent dark:border-stone-700">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setRegStep(1);
                  setError('');
                  setIsConflictError(false);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {t('Sign In (Existing Account)', 'লগইন করুন')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setIsConflictError(false);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-white shadow-xs'
                    : 'text-stone-500 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {t('Create New Account', 'নতুন অ্যাকাউন্ট খুলুন')}
              </button>
            </div>

            {/* Role Selector (visible on Login and Register Step 1) */}
            {(mode === 'login' || regStep === 1) && (
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-2">
                  {t('Select Your Role in Supply Chain:', 'আপনার ভূমিকা নির্বাচন করুন:')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'farmer', en: 'Farmer', bn: 'কৃষক', icon: <Sprout className="w-4 h-4" /> },
                    { id: 'wholesaler', en: 'Wholesaler', bn: 'পাইকার', icon: <Briefcase className="w-4 h-4" /> },
                    { id: 'retailer', en: 'Retailer', bn: 'খুচরা বিক্রেতা', icon: <Store className="w-4 h-4" /> },
                    { id: 'consumer', en: 'Consumer', bn: 'ভোক্তা', icon: <ShoppingCart className="w-4 h-4" /> },
                  ].map((r) => {
                    const isSelected = selectedRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setSelectedRole(r.id as any); setError(''); }}
                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'role-card-selected border-emerald-600 dark:border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 shadow-xs font-black'
                            : 'role-card-unselected border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/90 hover:bg-white dark:hover:bg-stone-700 text-stone-700 dark:text-white font-semibold'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 transition-colors ${
                          isSelected ? 'bg-emerald-600 text-white shadow-xs' : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-white'
                        }`}>
                          {r.icon}
                        </div>
                        <span className={`text-xs leading-tight font-bold transition-colors ${isSelected ? 'text-emerald-900 dark:text-emerald-300 font-black' : 'text-stone-700 dark:text-white'}`}>
                          {language === 'bn' ? r.bn : r.en}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Two-Step Progress Bar for Registration */}
            {mode === 'register' && (
              <div className="flex items-center justify-between gap-2 bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-700 rounded-2xl p-3">
                <div className={`flex items-center gap-2 text-xs font-bold ${regStep === 1 ? 'text-emerald-700 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-300'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    regStep === 1
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {regStep === 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
                  </span>
                  <span>{t('Account Details', 'অ্যাকাউন্ট তথ্য')}</span>
                </div>
                <div className="flex-1 h-0.5 bg-stone-200 dark:bg-stone-700 mx-1 rounded-full overflow-hidden">
                  <div className={`h-full bg-emerald-600 transition-all duration-300 ${regStep === 2 ? 'w-full' : 'w-1/2'}`} />
                </div>
                <div className={`flex items-center gap-2 text-xs font-bold ${regStep === 2 ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-500'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    regStep === 2
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                  }`}>
                    2
                  </span>
                  <span>{t('OTP Verification', 'OTP যাচাই')}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold space-y-2">
                <div className="flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
                {isConflictError && (
                  <button
                    type="button"
                    onClick={() => {
                      setLoginIdentifier(otpTargetLocal || regPhone);
                      setMode('login');
                      setRegStep(1);
                      setError('');
                      setIsConflictError(false);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 underline cursor-pointer"
                  >
                    <span>{t('Switch to Sign In with this number', 'এই নম্বর দিয়ে লগইন করুন')}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                    {t('Mobile Phone Number', 'মোবাইল নম্বর')}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 dark:text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                    {t('Password', 'পাসওয়ার্ড')}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 dark:text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder={t('Enter your password', 'পাসওয়ার্ড লিখুন')}
                      className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-2.5 text-stone-400 dark:text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || isLocked}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? t('Signing in...', 'প্রবেশ করা হচ্ছে...') : t(`Sign In as ${selectedRole}`, 'লগইন করুন')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : regStep === 1 ? (
              /* REGISTRATION STEP 1: User Details */
              <form onSubmit={handleStep1SendOtp} className="space-y-4">
                {selectedRole === 'farmer' && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      {t(
                        'Easy & secure registration! Enter your details and verify your mobile number via SMS OTP.',
                        'সহজ ও নিরাপদ নিবন্ধন! আপনার তথ্য দিন এবং এসএমএস OTP যাচাই করে অ্যাকাউন্ট খুলুন।'
                      )}
                    </span>
                  </div>
                )}

                {selectedRole === 'consumer' && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs text-purple-900 dark:text-purple-200 font-medium">
                    {t(
                      'Tip: Consumers can also browse and place orders as guests, or create an OTP-verified account below.',
                      'পরামর্শ: ভোক্তারা নিবন্ধন ছাড়াই পণ্য দেখতে পারেন, অথবা OTP যাচাই করে স্থায়ী অ্যাকাউন্ট খুলতে পারেন।'
                    )}
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                    {t('Full Name', 'পূর্ণ নাম')} *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-stone-400 dark:text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder={selectedRole === 'farmer' ? 'Md. Rafiqul Islam' : 'Your Name'}
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                {/* Mobile Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                    {t('Mobile Phone Number (SMS OTP Required)', 'মোবাইল নম্বর (SMS OTP যাচাই বাধ্যতামূলক)')} *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 dark:text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="017XXXXXXXX (+880)"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                    {t(
                      'Protected by invisible reCAPTCHA. A 6-digit Firebase OTP will be sent to verify this number.',
                      'অদৃশ্য reCAPTCHA সুরক্ষিত। নম্বর যাচাই করতে ৬ সংখ্যার Firebase OTP পাঠানো হবে।'
                    )}
                  </p>
                </div>

                {/* District and Upazila */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                      {t('District', 'জেলা')} *
                    </label>
                    <select
                      value={regDistrict}
                      onChange={(e) => {
                        setRegDistrict(e.target.value);
                        const loc = BANGLADESH_LOCATIONS.find((l) => l.district === e.target.value);
                        if (loc && loc.upazilas.length > 0) setRegUpazila(loc.upazilas[0]);
                      }}
                      className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {BANGLADESH_LOCATIONS.map((loc) => (
                        <option key={loc.district} value={loc.district} className="bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100">
                          {language === 'bn' ? loc.districtBn : loc.district}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                      {t('Upazila / Area', 'উপজেলা')} *
                    </label>
                    <select
                      value={regUpazila}
                      onChange={(e) => setRegUpazila(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                    >
                      {upazilaList.map((u) => (
                        <option key={u} value={u} className="bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100">
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Role-Specific Inputs */}
                {selectedRole === 'wholesaler' && (
                  <div className="space-y-3 p-3.5 bg-blue-50/50 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                        {t('Wholesale Business / Arat Name', 'পাইকারি প্রতিষ্ঠান / আড়তের নাম')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="Karwan Bazar Agro Arat"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                        {t('Procurement Scale', 'ব্যবসার ধরণ')}
                      </label>
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white font-semibold cursor-pointer"
                      >
                        <option value="Wholesaler" className="bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100">Bulk Wholesaler (মোকাম পাইকার)</option>
                        <option value="Aratdar" className="bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100">Aratdar Syndicate (আড়তদার সিন্ডিকেট)</option>
                        <option value="Processor" className="bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100">Agro Food Processor (খাদ্য প্রক্রিয়াজাতকারী)</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedRole === 'retailer' && (
                  <div className="space-y-3 p-3.5 bg-amber-50/50 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900/50">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                        {t('Retail Shop / Outlet Name', 'খুচরা দোকান / আউটলেটের নাম')} *
                      </label>
                      <input
                        type="text"
                        required
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="Bismillah Krishi Corner"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                        {t('Shop Address / Location', 'দোকানের ঠিকানা')}
                      </label>
                      <input
                        type="text"
                        value={tradeAddress}
                        onChange={(e) => setTradeAddress(e.target.value)}
                        placeholder="Station Road Market #12"
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                {selectedRole === 'consumer' && (
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                      {t('Home / Office Delivery Address', 'ডেলিভারির ঠিকানা')}
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House #12, Road #4, Jaleswaritola"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}

                {/* Passwords */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                      {t('Password', 'পাসওয়ার্ড')} *
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1">
                      {t('Confirm Password', 'পুনরায় পাসওয়ার্ড')} *
                    </label>
                    <input
                      type="password"
                      required
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Confirm"
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                </div>

                {/* Lockout Status Banner if 3-request limit already triggered */}
                {otpLockoutRemaining > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      {t(
                        `OTP limit reached (3/3). Please wait ${formatCountdown(otpLockoutRemaining)} before requesting a new OTP.`,
                        `সর্বোচ্চ OTP সীমা পূর্ণ (৩/৩)। নতুন OTP পাঠাতে ${formatCountdown(otpLockoutRemaining)} অপেক্ষা করুন।`
                      )}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otpLockoutRemaining > 0}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {loading
                      ? t('Sending OTP...', 'OTP পাঠানো হচ্ছে...')
                      : otpLockoutRemaining > 0
                        ? t(`Wait ${formatCountdown(otpLockoutRemaining)}`, `অপেক্ষা করুন ${formatCountdown(otpLockoutRemaining)}`)
                        : t('Send OTP & Continue', 'OTP পাঠান ও এগিয়ে যান')}
                  </span>
                  {!loading && otpLockoutRemaining === 0 && <ArrowRight className="w-4 h-4" />}
                </button>
              </form>
            ) : (
              /* REGISTRATION STEP 2: Firebase Phone OTP Verification */
              <form onSubmit={handleStep2VerifyOtpAndRegister} className="space-y-4">
                {/* Mandatory Anti-Social Engineering Security Warning Banner */}
                <div
                  role="alert"
                  data-testid="otp-security-warning"
                  className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-400 dark:border-amber-500/80 text-amber-950 dark:text-amber-100 shadow-sm space-y-1.5"
                >
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-red-600 dark:text-amber-300 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs sm:text-sm font-black leading-snug text-red-800 dark:text-amber-200">
                        NativeBazar কর্তৃপক্ষ বা অন্য কাউকে আপনার OTP পিন বলবেন না। পিন শেয়ার করলে আপনার অ্যাকাউন্ট হ্যাক হতে পারে।
                      </p>
                      {language === 'en' && (
                        <p className="text-[11px] font-semibold text-amber-900/90 dark:text-amber-200/90">
                          Never share your OTP PIN with NativeBazar staff or anyone else. Sharing your PIN may compromise your account.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sent Phone Summary & Edit Details */}
                <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="text-stone-500 dark:text-stone-400 block font-medium">
                      {t('Verification SMS sent to:', 'যাচাইকরণ কোড পাঠানো হয়েছে:')}
                    </span>
                    <span className="font-mono font-black text-emerald-800 dark:text-emerald-300 text-sm">
                      {otpTargetE164 || regPhone}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setRegStep(1);
                      setError('');
                      setIsConflictError(false);
                      setOtpInfo('');
                    }}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
                  >
                    {t('Change Number', 'নম্বর পরিবর্তন')}
                  </button>
                </div>

                {otpInfo && (
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{otpInfo}</span>
                  </div>
                )}

                {/* 6-Digit OTP Input */}
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1.5">
                    {t('Enter 6-Digit OTP Code', '৬ সংখ্যার OTP কোড লিখুন')} *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    className="w-full px-4 py-3 text-center text-xl tracking-[0.45em] font-mono font-black rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Rate-Limit & Resend OTP Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-700 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
                    {otpLockoutRemaining > 0 ? (
                      <span className="text-red-700 dark:text-red-300 font-bold">
                        {t(
                          `Limit exceeded (3/3). Locked for ${formatCountdown(otpLockoutRemaining)}`,
                          `সীমা অতিক্রম (৩/৩)। ${formatCountdown(otpLockoutRemaining)} পর আবার চেষ্টা করুন`
                        )}
                      </span>
                    ) : (
                      <span>
                        {t(
                          `OTP requests used: ${otpRequestCount}/${MAX_OTP_REQUESTS_PER_SESSION} (${remainingAttempts} left)`,
                          `OTP অনুরোধ: ${otpRequestCount}/${MAX_OTP_REQUESTS_PER_SESSION} (বাকি ${remainingAttempts} বার)`
                        )}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    data-testid="resend-otp-btn"
                    disabled={isResendDisabled}
                    onClick={handleResendOtp}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-stone-700"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>
                      {otpLockoutRemaining > 0
                        ? t(`Resend in ${formatCountdown(otpLockoutRemaining)}`, `পুনরায় পাঠান (${formatCountdown(otpLockoutRemaining)})`)
                        : otpResendCooldown > 0
                          ? t(`Resend (${otpResendCooldown}s)`, `পুনরায় পাঠান (${otpResendCooldown}s)`)
                          : t('Resend OTP', 'পুনরায় OTP পাঠান')}
                    </span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {loading
                      ? t('Verifying & Creating Account...', 'যাচাই ও অ্যাকাউন্ট তৈরি হচ্ছে...')
                      : t('Verify OTP & Complete Registration', 'OTP যাচাই ও নিবন্ধন সম্পন্ন করুন')}
                  </span>
                </button>
              </form>
            )}

            {/* Restricted Administrator Portal Link */}
            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
              <span>{language === 'bn' ? 'আমার হাট পাইলট • বাংলাদেশ' : 'Amar Haat Pilot • Bangladesh'}</span>
              <button
                type="button"
                onClick={() => { setIsAdminMode(true); setError(''); }}
                className="flex items-center gap-1 text-stone-500 dark:text-stone-300 hover:text-stone-800 dark:hover:text-white font-semibold transition-colors cursor-pointer"
              >
                <KeyRound className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                <span>{t('Authorized Admin Portal', 'অনুমোদিত অ্যাডমিন প্রবেশ')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
