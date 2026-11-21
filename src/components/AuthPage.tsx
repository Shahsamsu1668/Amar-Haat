import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Language, User } from '../types';
import { AuthStore, LoginResult } from '../data/store';
import { BANGLADESH_LOCATIONS } from '../data/mockData';
import { authApi } from '../services/api';
import {
  signInWithGoogle,
  isFirebaseClientConfigured,
  mapGoogleAuthError,
  normalizeDigits,
  formatPhoneToE164,
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
  Mail,
} from 'lucide-react';

interface AuthPageProps {
  language: Language;
  onLanguageToggle: () => void;
  onAuthSuccess: (user: User) => void;
  onBack?: () => void;
  initialMode?: 'login' | 'register';
  initialRole?: 'farmer' | 'wholesaler' | 'retailer' | 'consumer';
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
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
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

  // Registration verification (Google / Email OTP)
  const [showValidation, setShowValidation] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [emailOtpInfo, setEmailOtpInfo] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState('');
  const [isConflictError, setIsConflictError] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);


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

  // Resend cooldown countdown for email OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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

  // ───────── Free Email + Google registration (no SMS / billing) ─────────
  const validateRegistration = (): string | null => {
    if (!regName.trim()) return t('Please enter your full name.', 'আপনার পূর্ণ নাম লিখুন।');
    const p = formatPhoneToE164(regPhone);
    if (!p.valid || !/^01[3-9]\d{8}$/.test(p.local)) {
      return t(
        'Enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX).',
        'সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 017XXXXXXXX)।'
      );
    }
    if (!regDistrict || !regUpazila) return t('Select your district and upazila.', 'জেলা ও উপজেলা নির্বাচন করুন।');
    if (selectedRole === 'wholesaler' && !businessName.trim()) {
      return t('Enter your wholesale business / arat name.', 'আপনার আড়ত বা প্রতিষ্ঠানের নাম লিখুন।');
    }
    if (selectedRole === 'retailer' && !shopName.trim()) {
      return t('Enter your retail shop name.', 'আপনার খুচরা দোকানের নাম লিখুন।');
    }
    if (selectedRole === 'retailer' && tradeAddress.trim().length < 3) {
      return t('Enter your shop address.', 'আপনার দোকানের ঠিকানা লিখুন।');
    }
    if (selectedRole === 'consumer' && deliveryAddress.trim().length < 3) {
      return t('Enter your delivery address.', 'আপনার ডেলিভারির ঠিকানা লিখুন।');
    }
    if (regPassword.length < 6) return t('Password must be at least 6 characters.', 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
    if (regPassword !== regConfirmPassword) return t('Passwords do not match.', 'উভয় পাসওয়ার্ড একই হতে হবে।');
    return null;
  };

  const registrationError = validateRegistration();
  const isFormValid = registrationError === null;

  const buildRegPayload = () => ({
    role: selectedRole,
    name: regName.trim(),
    phone: formatPhoneToE164(regPhone).local,
    district: regDistrict,
    upazila: regUpazila,
    password: regPassword,
    businessName: selectedRole === 'wholesaler' ? businessName.trim() : undefined,
    businessType: selectedRole === 'wholesaler' ? businessType : undefined,
    shopName: selectedRole === 'retailer' ? shopName.trim() : undefined,
    tradeAddress: selectedRole === 'retailer' ? tradeAddress.trim() : undefined,
    deliveryAddress: selectedRole === 'consumer' ? deliveryAddress.trim() : undefined,
  });

  // Clicking the locked Google section shows exactly what is missing
  const handleLockedClick = () => {
    setShowValidation(true);
    if (registrationError) setError(registrationError);
  };

  const finishAuth = (res: any): boolean => {
    if (res && res.success && res.user) {
      AuthStore.setCurrentUser(res.user);
      setLoading(false);
      onAuthSuccess(res.user);
      return true;
    }
    return false;
  };

  const handleRegError = (err: any) => {
    const msg = String(err?.message || 'Registration failed.');
    if (msg.toLowerCase().includes('already exists') || msg.includes('409')) {
      setIsConflictError(true);
      setError(
        t(
          'An account with this number already exists. Please sign in instead.',
          'এই মোবাইল নম্বর দিয়ে ইতিমধ্যেই একটি অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে লগইন করুন।'
        )
      );
    } else {
      setError(msg);
    }
    setLoading(false);
  };

  // Option A: Sign in with Google
  const handleGoogleRegister = async () => {
    setError('');
    setIsConflictError(false);
    if (!isFormValid) {
      handleLockedClick();
      return;
    }
    if (!isFirebaseClientConfigured()) {
      setError(
        t(
          'Google sign-in is not configured. Add VITE_FIREBASE_* keys to your environment.',
          'গুগল সাইন-ইন কনফিগার করা হয়নি। পরিবেশ ভেরিয়েবলে VITE_FIREBASE_* যুক্ত করুন।'
        )
      );
      return;
    }
    setLoading(true);
    let idToken = '';
    try {
      idToken = (await signInWithGoogle()).idToken;
    } catch (gErr: any) {
      setError(mapGoogleAuthError(gErr, language));
      setLoading(false);
      return;
    }
    try {
      const res = await authApi.googleRegisterLogin({ ...buildRegPayload(), idToken });
      if (!finishAuth(res)) {
        setError(t('Registration failed. Please try again.', 'নিবন্ধন সম্পন্ন হয়নি। আবার চেষ্টা করুন।'));
        setLoading(false);
      }
    } catch (err: any) {
      handleRegError(err);
    }
  };

  // Option B step 1: instant optimistic transition to OTP view while dispatching in background
  const handleSendEmailOtp = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    setIsConflictError(false);
    setEmailOtpInfo('');
    if (!isFormValid) {
      handleLockedClick();
      setRegStep(1);
      return;
    }
    const email = emailInput.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      setError(t('Please enter a valid email address.', 'সঠিক ইমেইল ঠিকানা লিখুন।'));
      return;
    }
    setEmailInput(email);
    setEmailOtpCode('');
    setSendingOtp(true);
    setRegStep(3);

    void authApi
      .sendEmailOtp(email)
      .then((res) => {
        setResendCooldown(res.cooldownSeconds ?? 60);
        setEmailOtpInfo(t(`Code sent to ${email}.`, 'কোড পাঠানো হয়েছে'));
      })
      .catch((err: any) => {
        setResendCooldown(0);
        setError(err?.message || t('Could not send the code.', 'কোড পাঠানো যায়নি।'));
      })
      .finally(() => {
        setSendingOtp(false);
      });
  };

  // Option B step 2: verify OTP and register / log in
  const handleVerifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsConflictError(false);
    const code = normalizeDigits(emailOtpCode).replace(/\D/g, '');
    if (code.length !== 6) {
      setError(t('Paste the exact 6-digit code from your email.', 'ইমেইলে পাওয়া সঠিক ৬ সংখ্যার কোডটি লিখুন।'));
      return;
    }
    if (!isFormValid) {
      handleLockedClick();
      setRegStep(1);
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyEmailOtp({ ...buildRegPayload(), email: emailInput, otp: code });
      if (!finishAuth(res)) {
        setError(t('Verification failed. Please try again.', 'যাচাই সম্পন্ন হয়নি। আবার চেষ্টা করুন।'));
        setLoading(false);
      }
    } catch (err: any) {
      handleRegError(err);
    }
  };



  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">

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

            {mode === 'register' && (
              <div className="flex items-center justify-between gap-2 bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-700 rounded-2xl p-3">
                <div className={`flex items-center gap-2 text-xs font-bold ${regStep === 1 ? 'text-emerald-700 dark:text-emerald-400' : 'text-emerald-600 dark:text-emerald-300'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    regStep === 1 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {regStep >= 2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : '1'}
                  </span>
                  <span>{t('Account Details', 'অ্যাকাউন্ট তথ্য')}</span>
                </div>
                <div className="flex-1 h-0.5 bg-stone-200 dark:bg-stone-700 mx-1 rounded-full overflow-hidden">
                  <div className={`h-full bg-emerald-600 transition-all duration-300 ${regStep >= 2 ? 'w-full' : 'w-1/2'}`} />
                </div>
                <div className={`flex items-center gap-2 text-xs font-bold ${regStep >= 2 ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400 dark:text-stone-500'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    regStep >= 2 ? 'bg-emerald-600 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
                  }`}>
                    2
                  </span>
                  <span>{t('Google / Email Verify', 'গুগল / ইমেইল যাচাই')}</span>
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
                      setLoginIdentifier(regPhone);
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
              <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                {selectedRole === 'farmer' && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      {t(
                        'Easy & secure registration! Fill in your details, then verify with your Google account.',
                        'সহজ ও নিরাপদ নিবন্ধন! আপনার তথ্য দিন এবং গুগল অ্যাকাউন্ট দিয়ে যাচাই করুন।'
                      )}
                    </span>
                  </div>
                )}

                {selectedRole === 'consumer' && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/60 rounded-xl text-xs text-purple-900 dark:text-purple-200 font-medium">
                    {t(
                      'Tip: Consumers can also browse and place orders as guests, or create a Google-verified account below.',
                      'পরামর্শ: ভোক্তারা নিবন্ধন ছাড়াই পণ্য দেখতে পারেন, অথবা গুগল যাচাই করে স্থায়ী অ্যাকাউন্ট খুলতে পারেন।'
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
                    {t('Mobile Phone Number', 'মোবাইল নম্বর')} *
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
                      'Used for your login. Your email is verified with Google (free, no SMS).',
                      'লগইনের জন্য ব্যবহৃত হবে। আপনার ইমেইল গুগল দিয়ে যাচাই হবে (বিনামূল্যে, SMS লাগবে না)।'
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
                        {t('Shop Address / Location', 'দোকানের ঠিকানা')} *
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
                      {t('Home / Office Delivery Address', 'ডেলিভারির ঠিকানা')} *
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

                {/* Google / Email verification gate (locked until the form is valid) */}
                <div
                  data-testid="google-gate"
                  onClick={!isFormValid ? handleLockedClick : undefined}
                  className={`rounded-2xl border-2 p-4 space-y-3 transition-colors ${
                    isFormValid
                      ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40'
                      : 'border-dashed border-stone-300 dark:border-stone-600 bg-stone-50 dark:bg-stone-900/60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-2 text-xs font-bold text-stone-800 dark:text-stone-100">
                    {isFormValid ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Lock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
                    )}
                    <span>
                      {isFormValid
                        ? t('Form complete! Verify your email with Google to finish registration.', 'ফর্ম সম্পূর্ণ! রেজিস্ট্রেশন শেষ করতে গুগল দিয়ে ইমেইল যাচাই করুন।')
                        : t('Complete all required fields above to unlock Google sign-in.', 'গুগল সাইন-ইন চালু করতে উপরের সব প্রয়োজনীয় তথ্য পূরণ করুন।')}
                    </span>
                  </div>
                  {!isFormValid && showValidation && registrationError && (
                    <p className="text-[11px] font-bold text-red-700 dark:text-red-300">⚠️ {registrationError}</p>
                  )}
                  <div className={`space-y-2 ${!isFormValid ? 'pointer-events-none opacity-50' : ''}`}>
                    <button
                      type="button"
                      data-testid="google-signin-btn"
                      disabled={!isFormValid || loading}
                      onClick={handleGoogleRegister}
                      className="w-full py-3 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700 disabled:cursor-not-allowed text-stone-900 dark:text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2.5 cursor-pointer"
                    >
                      <span className="w-5 h-5 rounded-full bg-white border border-stone-200 text-[13px] font-black text-blue-600 flex items-center justify-center">G</span>
                      <span>
                        {loading ? t('Please wait...', 'অপেক্ষা করুন...') : t('Sign in with Google', 'সাইন ইন উইথ গুগল')}
                      </span>
                    </button>
                    <button
                      type="button"
                      data-testid="google-another-btn"
                      disabled={!isFormValid || loading}
                      onClick={() => {
                        setError('');
                        setIsConflictError(false);
                        setRegStep(2);
                      }}
                      className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>{t('Sign in with Another Google Account', 'সাইন ইন উইথ অ্যানাদার গুগল অ্যাকাউন্ট')}</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : regStep === 2 ? (
              /* OPTION B – STEP 1: enter email */
              <form onSubmit={handleSendEmailOtp} className="space-y-4">
                <button
                  type="button"
                  onClick={() => { setRegStep(1); setError(''); }}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{t('Back to details', 'তথ্যে ফিরে যান')}</span>
                </button>
                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1.5">
                    {t('Email for verification code', 'যাচাইকরণ কোডের জন্য ইমেইল')} *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      autoFocus
                      data-testid="email-otp-input"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Write the email"
                      className="w-full pl-10 pr-3.5 py-3 text-sm rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    />
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                    {t(
                      'Enter the Google/Gmail address that should receive your 6-digit code.',
                      'যে গুগল/জিমেইল ঠিকানায় ৬ সংখ্যার কোড পেতে চান সেটি লিখুন।'
                    )}
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={loading || !emailInput.trim()}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? t('Sending...', 'পাঠানো হচ্ছে...') : 'OK'}</span>
                </button>
              </form>
            ) : (
              /* OPTION B – STEP 2: OTP verification view */
              <form onSubmit={handleVerifyEmailOtp} className="space-y-4">
                <div
                  role="alert"
                  data-testid="otp-security-warning"
                  className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border-2 border-amber-400 dark:border-amber-500/80 text-amber-950 dark:text-amber-100 shadow-sm"
                >
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-red-600 dark:text-amber-300 shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm font-black leading-snug text-red-800 dark:text-amber-200">
                      NativeBazar কর্তৃপক্ষ বা অন্য কাউকে আপনার OTP পিন বলবেন না। পিন শেয়ার করলে আপনার অ্যাকাউন্ট হ্যাক হতে পারে।
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-between gap-3">
                  <div className="text-xs min-w-0">
                    <span className="text-stone-500 dark:text-stone-400 block font-medium">{t('Code sent to:', 'কোড পাঠানো হয়েছে:')}</span>
                    <span className="font-mono font-black text-emerald-800 dark:text-emerald-300 text-sm break-all">{emailInput}</span>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => { setRegStep(2); setError(''); setEmailOtpInfo(''); }}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
                  >
                    {t('Change Email', 'ইমেইল পরিবর্তন')}
                  </button>
                </div>

                {sendingOtp ? (
                  <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
                    <span>{t('Sending code...', 'কোড পাঠানো হচ্ছে...')}</span>
                  </div>
                ) : emailOtpInfo ? (
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{emailOtpInfo}</span>
                  </div>
                ) : null}

                <div>
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-200 mb-1.5">
                    {t('Paste the 6-digit code', 'কপি করা ৬ সংখ্যার কোড পেস্ট করুন')} *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    autoFocus
                    data-testid="email-otp-code-input"
                    value={emailOtpCode}
                    onChange={(e) => setEmailOtpCode(normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    className="w-full px-4 py-3 text-center text-xl tracking-[0.45em] font-mono font-black rounded-xl border-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-stone-50 dark:bg-stone-900/70 border border-stone-200 dark:border-stone-700 text-xs">
                  <div className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 font-semibold">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('Code valid for 10 minutes', 'কোড ১০ মিনিট বৈধ')}</span>
                  </div>
                  <button
                    type="button"
                    data-testid="resend-otp-btn"
                    disabled={loading || sendingOtp || resendCooldown > 0}
                    onClick={() => handleSendEmailOtp()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-emerald-700 dark:text-emerald-300"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading || sendingOtp ? 'animate-spin' : ''}`} />
                    <span>
                      {sendingOtp
                        ? t('Sending...', 'পাঠানো হচ্ছে...')
                        : resendCooldown > 0
                          ? t(`Resend (${resendCooldown}s)`, `পুনরায় পাঠান (${resendCooldown}s)`)
                          : t('Resend code', 'পুনরায় কোড পাঠান')}
                    </span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || emailOtpCode.length < 6}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{loading ? t('Verifying...', 'যাচাই হচ্ছে...') : t('OK / Verify', 'OK / যাচাই করুন')}</span>
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
