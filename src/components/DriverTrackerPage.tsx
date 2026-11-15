import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Navigation,
  MapPin,
  Phone,
  Truck,
  Package,
  Radio,
  AlertCircle,
  CheckCircle2,
  StopCircle,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { TrackerOrderInfo, Language } from '../types';
import { orderApi } from '../services/api';
import { TrackingMapView } from './TrackingMapView';

interface DriverTrackerPageProps {
  orderId: string;
}

export const DriverTrackerPage: React.FC<DriverTrackerPageProps> = ({ orderId }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('nb_language');
      return saved === 'en' ? 'en' : 'bn';
    } catch {
      return 'bn';
    }
  });
  const [orderInfo, setOrderInfo] = useState<TrackerOrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sharing, setSharing] = useState(false);
  const [acquiringGps, setAcquiringGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [pushCount, setPushCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [pushingNow, setPushingNow] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastPushTimestampRef = useRef<number>(0);

  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const info = await orderApi.getTrackingInfo(orderId);
        if (!mounted) return;
        setOrderInfo(info);
        setLoadError(null);
        if (info.driverLat !== null && info.driverLng !== null) {
          const initial = { lat: info.driverLat, lng: info.driverLng };
          setCurrentCoords(initial);
          latestCoordsRef.current = initial;
          setTrail([[info.driverLat, info.driverLng]]);
          setLastSyncedAt(info.locationUpdatedAt);
        }
      } catch (err: any) {
        if (mounted) {
          setLoadError(
            err?.message ||
              t('Order not found or tracking link is invalid.', 'অর্ডারটি খুঁজে পাওয়া যায়নি বা ট্র্যাকিং লিংকটি সঠিক নয়।')
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  const sendCoordsToServer = useCallback(
    async (lat: number, lng: number, active = true) => {
      setPushingNow(true);
      try {
        const res = await orderApi.pushDriverLocation(orderId, lat, lng, active);
        lastPushTimestampRef.current = Date.now();
        setLastSyncedAt(res.locationUpdatedAt || new Date().toISOString());
        if (active) {
          setPushCount((prev) => prev + 1);
          setOrderInfo((prev) =>
            prev
              ? {
                  ...prev,
                  trackingActive: true,
                  orderStatus: res.orderStatus,
                  driverLat: lat,
                  driverLng: lng,
                  locationUpdatedAt: res.locationUpdatedAt,
                }
              : prev
          );
        }
        setGpsError(null);
      } catch (err: any) {
        setGpsError(err?.message || t('Failed to upload GPS coordinates.', 'জিপিএস লোকেশন আপলোড ব্যর্থ হয়েছে।'));
      } finally {
        setPushingNow(false);
      }
    },
    [orderId]
  );

  const clearTrackingTimers = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  const stopSharing = useCallback(async () => {
    clearTrackingTimers();
    setAcquiringGps(false);
    setSharing(false);
    if (latestCoordsRef.current) {
      try {
        await orderApi.pushDriverLocation(
          orderId,
          latestCoordsRef.current.lat,
          latestCoordsRef.current.lng,
          false
        );
        setOrderInfo((prev) => (prev ? { ...prev, trackingActive: false } : prev));
      } catch {}
    }
  }, [orderId, clearTrackingTimers]);

  useEffect(() => {
    return () => {
      clearTrackingTimers();
    };
  }, [clearTrackingTimers]);

  const handleStartTrip = () => {
    if (!navigator.geolocation) {
      setGpsError(
        t(
          'Your browser or device does not support GPS Geolocation.',
          'আপনার ডিভাইস বা ব্রাউজার জিপিএস লোকেশন সাপোর্ট করে না।'
        )
      );
      return;
    }

    clearTrackingTimers();
    setGpsError(null);
    setAcquiringGps(true);
    setSharing(false);
    lastPushTimestampRef.current = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        latestCoordsRef.current = { lat, lng };
        setCurrentCoords({ lat, lng });

        // Activate broadcasting UI state only after the first successful GPS fix arrives
        setAcquiringGps(false);
        setSharing(true);

        setTrail((prev) => {
          const last = prev[prev.length - 1];
          if (last && Math.abs(last[0] - lat) < 0.00001 && Math.abs(last[1] - lng) < 0.00001) {
            return prev;
          }
          return [...prev.slice(-99), [lat, lng]];
        });

        // Push immediately on first fix or when >= 6s passed since last push
        const now = Date.now();
        if (lastPushTimestampRef.current === 0 || now - lastPushTimestampRef.current >= 6000) {
          sendCoordsToServer(lat, lng, true);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError(
            t(
              'Location permission denied. Please enable GPS/Location access in your browser settings.',
              'লোকেশন অনুমতি দেওয়া হয়নি। অনুগ্রহ করে ব্রাউজারের লোকেশন/জিপিএস পারমিশন চালু করুন।'
            )
          );
          stopSharing();
        } else if (!latestCoordsRef.current) {
          setGpsError(
            err.code === err.POSITION_UNAVAILABLE
              ? t(
                  'GPS signal unavailable. Turn on device location services and try again.',
                  'জিপিএস সিগন্যাল পাওয়া যাচ্ছে না। ডিভাইসের লোকেশন চালু করে আবার চেষ্টা করুন।'
                )
              : err.message || t('Unable to acquire initial GPS fix.', 'প্রাথমিক জিপিএস লোকেশন পাওয়া যায়নি।')
          );
          clearTrackingTimers();
          setAcquiringGps(false);
          setSharing(false);
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGpsError(
            t(
              'GPS signal temporarily unavailable. Trying again...',
              'জিপিএস সিগন্যাল পাওয়া যাচ্ছে না। আবার চেষ্টা করা হচ্ছে...'
            )
          );
        } else {
          setGpsError(err.message || t('Unable to read GPS location.', 'জিপিএস লোকেশন পাওয়া যায়নি।'));
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );

    // Reliable 7-second interval push while active (meets 5-10s requirement cleanly)
    intervalIdRef.current = setInterval(() => {
      if (latestCoordsRef.current) {
        const now = Date.now();
        if (now - lastPushTimestampRef.current >= 5500) {
          sendCoordsToServer(latestCoordsRef.current.lat, latestCoordsRef.current.lng, true);
        }
      }
    }, 7000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto animate-bounce">
            <Truck className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">
            {t('Loading delivery details...', 'ডেলিভারির তথ্য লোড হচ্ছে...')}
          </p>
        </div>
      </div>
    );
  }

  if (loadError || !orderInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-xl border border-red-100 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-slate-900 text-lg">
            {t('Tracking Link Unavailable', 'ট্র্যাকিং লিংক পাওয়া যায়নি')}
          </h2>
          <p className="text-xs text-slate-600">{loadError}</p>
        </div>
      </div>
    );
  }

  const mapsDestUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${orderInfo.deliveryAddress}, ${orderInfo.district}, Bangladesh`
  )}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 pb-10">
      {/* Compact Mobile Header */}
      <header className="bg-emerald-700 text-white px-4 py-3.5 shadow-md sticky top-0 z-20">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-tight">
                {t('AmarHaat Driver Tracker', 'আমার হাট ড্রাইভার ট্র্যাকার')}
              </h1>
              <p className="text-[11px] text-emerald-100 font-mono">
                {orderInfo.trackingCode} • #{orderInfo.orderId.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLanguage((prev) => (prev === 'bn' ? 'en' : 'bn'))}
            className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'EN' : 'বাং'}</span>
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 space-y-4">
        {/* Live Status & Big Primary Action Button */}
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-emerald-100 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                sharing
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : acquiringGps
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              {sharing ? (
                <>
                  <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-600" />
                  {t('LIVE GPS BROADCASTING', 'লাইভ জিপিএস চালু আছে')}
                </>
              ) : acquiringGps ? (
                <>
                  <Navigation className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  {t('ACQUIRING GPS SIGNAL...', 'জিপিএস সংযোগ নেওয়া হচ্ছে...')}
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  {t('READY FOR TRIP', 'ট্রিপ শুরুর জন্য প্রস্তুত')}
                </>
              )}
            </span>

            <span className="text-xs font-bold text-slate-500">
              {orderInfo.orderStatus}
            </span>
          </div>

          {!sharing ? (
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={acquiringGps}
                onClick={handleStartTrip}
                className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-70 active:scale-[0.99] text-white font-extrabold text-base shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-3 transition cursor-pointer"
              >
                <Navigation className={`w-5 h-5 ${acquiringGps ? 'animate-spin' : ''}`} />
                <span>
                  {acquiringGps
                    ? t('Locating your GPS...', 'আপনার জিপিএস লোকেশন খোঁজা হচ্ছে...')
                    : t('Start Trip & Share Location', 'ট্রিপ শুরু করুন ও লোকেশন শেয়ার করুন')}
                </span>
              </button>
              {acquiringGps && (
                <button
                  type="button"
                  onClick={stopSharing}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  {t('Cancel', 'বাতিল করুন')}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-emerald-900">
                      {t(
                        'Sharing GPS every 7 seconds to Farmer & Wholesaler',
                        'কৃষক ও পাইকারের সাথে প্রতি ৭ সেকেন্ডে লাইভ লোকেশন শেয়ার হচ্ছে'
                      )}
                    </p>
                    <p className="text-emerald-700 mt-0.5">
                      {t('Updates sent:', 'আপডেট পাঠানো হয়েছে:')} <strong>{pushCount}</strong>
                      {lastSyncedAt && ` • ${new Date(lastSyncedAt).toLocaleTimeString()}`}
                      {pushingNow && ' • Syncing...'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={stopSharing}
                className="w-full py-3 px-4 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <StopCircle className="w-4 h-4" />
                <span>{t('Stop Sharing Location', 'লোকেশন শেয়ারিং বন্ধ করুন')}</span>
              </button>
            </div>
          )}

          {gpsError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{gpsError}</span>
            </div>
          )}
        </div>

        {/* Live Map Preview for Driver */}
        {currentCoords && (
          <div className="bg-white rounded-3xl p-4 shadow-md border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold text-slate-800">
                📍 {t('Your Live Position', 'আপনার বর্তমান অবস্থান')}
              </span>
              <span className="font-mono text-slate-500">
                {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
              </span>
            </div>
            <TrackingMapView
              lat={currentCoords.lat}
              lng={currentCoords.lng}
              path={trail}
              isLive={sharing}
              driverPhone={orderInfo.driverPhone}
              orderLabel={orderInfo.trackingCode}
              destinationLabel={`${orderInfo.deliveryAddress}, ${orderInfo.district}`}
              updatedAt={lastSyncedAt}
              language={language}
              heightClass="h-[260px]"
            />
          </div>
        )}

        {/* Route & Contact Card */}
        <div className="bg-white rounded-3xl p-5 shadow-md border border-slate-200 space-y-4">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            {t('Delivery Route Details', 'ডেলিভারি রুট ও তথ্য')}
          </h2>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
              <p className="text-[11px] text-slate-500 font-semibold">
                {t('Pickup From (Seller)', 'পণ্য সংগ্রহের স্থান (বিক্রেতা)')}
              </p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{orderInfo.sellerName}</p>
            </div>

            <div className="bg-blue-50/70 rounded-2xl p-3.5 border border-blue-100 space-y-2">
              <div>
                <p className="text-[11px] text-blue-700 font-semibold">
                  {t('Deliver To (Receiver)', 'ডেলিভারি গন্তব্য (ক্রেতা)')}
                </p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{orderInfo.buyerName}</p>
                <p className="text-slate-700 mt-0.5">
                  {orderInfo.deliveryAddress}, {orderInfo.district}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {orderInfo.buyerPhone && (
                  <a
                    href={`tel:${orderInfo.buyerPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{t('Call Receiver', 'ক্রেতাকে কল করুন')} ({orderInfo.buyerPhone})</span>
                  </a>
                )}
                <a
                  href={mapsDestUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-bold text-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('Google Maps', 'গুগল ম্যাপস')}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Cargo Items */}
          {orderInfo.items.length > 0 && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                {t('Order Cargo', 'পণ্যের বিবরণ')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {orderInfo.items.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold"
                  >
                    {language === 'bn' && item.banglaName ? item.banglaName : item.cropName} —{' '}
                    {item.quantityKg} {item.unit || 'kg'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

