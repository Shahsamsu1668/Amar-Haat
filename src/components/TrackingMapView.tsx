import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Language } from '../types';

interface TrackingMapViewProps {
  lat: number;
  lng: number;
  path?: [number, number][];
  isLive?: boolean;
  driverPhone?: string | null;
  orderLabel?: string;
  destinationLabel?: string;
  updatedAt?: string | null;
  language?: Language;
  heightClass?: string;
  invalidateTrigger?: unknown;
}

/**
 * Smoothly pans the Leaflet map on coordinate changes and recalculates tile layout
 * after modals or responsive containers settle.
 */
const MapLifecycleController: React.FC<{
  lat: number;
  lng: number;
  invalidateTrigger?: unknown;
}> = ({ lat, lng, invalidateTrigger }) => {
  const map = useMap();

  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 0.7 });
  }, [map, lat, lng]);

  useEffect(() => {
    const refreshSize = () => {
      try {
        map.invalidateSize({ animate: false });
      } catch {}
    };

    const rafId = requestAnimationFrame(refreshSize);
    const t1 = setTimeout(refreshSize, 200);
    const t2 = setTimeout(refreshSize, 450);

    let observer: ResizeObserver | null = null;
    const container = map.getContainer();
    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(() => {
        refreshSize();
      });
      observer.observe(container);
    }

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
      observer?.disconnect();
    };
  }, [map, invalidateTrigger]);

  return null;
};

/**
 * Creates a bundler-safe HTML/SVG Leaflet vehicle marker without external PNG assets.
 * Uses both Tailwind v4 `animate-ping` and `.nb-marker-halo` keyframes for reliable pulsing.
 */
function createVehicleDivIcon(isLive: boolean): L.DivIcon {
  const ringHtml = isLive
    ? `<span class="nb-marker-halo animate-ping" style="position:absolute;inset:-4px;border-radius:9999px;background:rgba(16,185,129,0.42);"></span>`
    : '';

  return L.divIcon({
    className: 'nativebazar-truck-marker',
    html: `
      <div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">
        ${ringHtml}
        <div style="position:relative;width:40px;height:40px;border-radius:9999px;background:${isLive ? '#059669' : '#2563eb'};border:3px solid #ffffff;box-shadow:0 6px 16px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;font-size:20px;">
          🚚
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
}

export const TrackingMapView: React.FC<TrackingMapViewProps> = ({
  lat,
  lng,
  path = [],
  isLive = true,
  driverPhone,
  orderLabel,
  destinationLabel,
  updatedAt,
  language = 'bn',
  heightClass = 'h-[360px] sm:h-[420px]',
  invalidateTrigger,
}) => {
  const vehicleIcon = useMemo(() => createVehicleDivIcon(isLive), [isLive]);
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-emerald-200 shadow-inner bg-slate-100`}>
      <span className="hidden animate-ping nb-marker-halo" aria-hidden="true" />
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapLifecycleController
          lat={lat}
          lng={lng}
          invalidateTrigger={invalidateTrigger}
        />

        {path.length > 1 && (
          <Polyline
            positions={path}
            pathOptions={{
              color: '#059669',
              weight: 5,
              opacity: 0.78,
              dashArray: '8, 6',
            }}
          />
        )}

        <Marker position={[lat, lng]} icon={vehicleIcon}>
          <Popup>
            <div className="text-xs space-y-1 min-w-[160px]">
              <p className="font-bold text-emerald-700">
                🚚 {orderLabel || t('Delivery Vehicle', 'ডেলিভারি গাড়ি')}
              </p>
              {driverPhone && (
                <p className="text-slate-700">
                  {t('Driver:', 'ড্রাইভার:')} <span className="font-semibold">{driverPhone}</span>
                </p>
              )}
              {destinationLabel && (
                <p className="text-slate-600">
                  {t('To:', 'গন্তব্য:')} {destinationLabel}
                </p>
              )}
              <p className="text-[11px] text-slate-500 font-mono">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
              {updatedAt && (
                <p className="text-[10px] text-slate-400">
                  {t('Updated:', 'আপডেট:')} {new Date(updatedAt).toLocaleTimeString()}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

