import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  X,
  Phone,
  MapPin,
  Navigation,
  RefreshCw,
  Clock,
  Truck,
  Radio,
} from 'lucide-react';
import { SupplyChainOrder, Language, TrackerOrderInfo } from '../types';
import { orderApi } from '../services/api';
import { TrackingMapView } from './TrackingMapView';

interface LiveTrackingModalProps {
  order: SupplyChainOrder;
  language: Language;
  onClose: () => void;
  onOrderSync?: (info: TrackerOrderInfo) => void;
}

export const LiveTrackingModal: React.FC<LiveTrackingModalProps> = ({
  order,
  language,
  onClose,
  onOrderSync,
}) => {
  const [trackingInfo, setTrackingInfo] = useState<TrackerOrderInfo | null>(null);
  const [trail, setTrail] = useState<[number, number][]>(() =>
    order.driverLat !== undefined && order.driverLng !== undefined
      ? [[order.driverLat, order.driverLng]]
      : []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapLayoutTick, setMapLayoutTick] = useState(0);
  const onOrderSyncRef = useRef(onOrderSync);
  onOrderSyncRef.current = onOrderSync;

  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const layoutTimer = setTimeout(() => setMapLayoutTick((prev) => prev + 1), 220);
    return () => {
      clearTimeout(layoutTimer);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const appendCoord = useCallback((lat: number, lng: number) => {
    setTrail((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.abs(last[0] - lat) < 0.00001 && Math.abs(last[1] - lng) < 0.00001) {
        return prev;
      }
      return [...prev.slice(-99), [lat, lng]];
    });
  }, []);

  const fetchLatest = useCallback(async () => {
    try {
      const data = await orderApi.getTrackingInfo(order.id);
      setTrackingInfo(data);
      setError(null);
      if (data.driverLat !== null && data.driverLng !== null) {
        appendCoord(data.driverLat, data.driverLng);
      }
      onOrderSyncRef.current?.(data);
    } catch (err: any) {
      setError(err?.message || t('Unable to load live coordinates', 'লাইভ লোকেশন লোড করা যায়নি'));
    } finally {
      setLoading(false);
    }
  }, [order.id, appendCoord]);

  useEffect(() => {
    fetchLatest();
    const pollId = setInterval(fetchLatest, 5000);

    const handleSseLocation = (e: Event) => {
      const detail = (e as CustomEvent)?.detail;
      if (!detail || detail.orderId !== order.id) return;
      const lat = Number(detail.lat);
      const lng = Number(detail.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        appendCoord(lat, lng);
        setTrackingInfo((prev) =>
          prev
            ? {
                ...prev,
                driverLat: lat,
                driverLng: lng,
                trackingActive: detail.trackingActive ?? true,
                locationUpdatedAt: detail.locationUpdatedAt || new Date().toISOString(),
              }
            : prev
        );
      }
    };

    window.addEventListener('nb_driver_location', handleSseLocation);
    return () => {
      clearInterval(pollId);
      window.removeEventListener('nb_driver_location', handleSseLocation);
    };
  }, [order.id, fetchLatest, appendCoord]);

  const activeLat = trackingInfo?.driverLat ?? order.driverLat ?? null;
  const activeLng = trackingInfo?.driverLng ?? order.driverLng ?? null;
  const isLive = trackingInfo?.trackingActive ?? Boolean(order.trackingActive);
  const driverPhone = trackingInfo?.driverPhone || order.driverPhone;
  const updatedAt = trackingInfo?.locationUpdatedAt || order.locationUpdatedAt;

  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-emerald-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-700 p-4 sm:p-5 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">
                  {t('Live Order Tracking', 'লাইভ অর্ডার ট্র্যাকিং')}
                </h3>
                {isLive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-300/40 text-[11px] font-bold">
                    <Radio className="w-3 h-3 animate-pulse text-emerald-200" />
                    {t('LIVE', 'লাইভ')}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-100 font-mono">
                {order.trackingCode} • {order.sellerName} → {order.buyerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchLatest}
              title={t('Refresh location', 'রিফ্রেশ করুন')}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Info Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500">{t('Driver Mobile', 'ড্রাইভারের মোবাইল')}</p>
                {driverPhone ? (
                  <a
                    href={`tel:${driverPhone}`}
                    className="font-bold text-emerald-700 hover:underline flex items-center gap-1 truncate"
                  >
                    <Phone className="w-3 h-3" />
                    {driverPhone}
                  </a>
                ) : (
                  <p className="font-semibold text-slate-700">{t('Assigned', 'নির্ধারিত')}</p>
                )}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500">{t('Destination', 'গন্তব্য')}</p>
                <p className="font-semibold text-slate-800 truncate">
                  {order.deliveryAddress}, {order.district}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-slate-500">{t('Last GPS Update', 'সর্বশেষ জিপিএস আপডেট')}</p>
                <p className="font-semibold text-slate-800 truncate">
                  {updatedAt
                    ? new Date(updatedAt).toLocaleTimeString()
                    : t('Waiting for signal...', 'সিগন্যালের অপেক্ষায়...')}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3">
              {error}
            </div>
          )}

          {/* Leaflet Live Map */}
          {activeLat !== null && activeLng !== null ? (
            <div className="space-y-2">
              <TrackingMapView
                lat={activeLat}
                lng={activeLng}
                path={trail}
                isLive={isLive}
                driverPhone={driverPhone}
                orderLabel={order.trackingCode}
                destinationLabel={`${order.deliveryAddress}, ${order.district}`}
                updatedAt={updatedAt}
                language={language}
                invalidateTrigger={mapLayoutTick}
              />
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-1">
                <span>
                  📍 {t('Coordinates:', 'স্থানাঙ্ক:')}{' '}
                  <span className="font-mono font-semibold text-slate-700">
                    {activeLat.toFixed(6)}, {activeLng.toFixed(6)}
                  </span>
                </span>
                <span>
                  {t('Auto-updates live via SSE & 5s GPS sync', 'স্বয়ংক্রিয়ভাবে প্রতি ৫ সেকেন্ডে ও রিয়েল-টাইমে আপডেট হচ্ছে')}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-[300px] rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center animate-pulse">
                <Truck className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {loading
                    ? t('Connecting to live tracking feed...', 'লাইভ ট্র্যাকিংয়ের সাথে যুক্ত হচ্ছে...')
                    : t('Waiting for driver to start trip', 'ড্রাইভার ট্রিপ শুরু করার অপেক্ষায়')}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  {t(
                    'As soon as the driver opens the SMS link and taps "Start Trip & Share Location", their moving vehicle will appear live on this map.',
                    'ড্রাইভার এসএমএস লিংক খুলে "ট্রিপ শুরু করুন ও লোকেশন শেয়ার করুন" বাটনে ক্লিক করার সাথে সাথেই গাড়ির লাইভ অবস্থান ম্যাপে দেখা যাবে।'
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

