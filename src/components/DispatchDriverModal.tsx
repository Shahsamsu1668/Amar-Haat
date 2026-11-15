import React, { useState, useEffect } from 'react';
import {
  Truck,
  Phone,
  X,
  Send,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  MapPin,
} from 'lucide-react';
import { SupplyChainOrder, Language, DispatchOrderResponse } from '../types';
import { orderApi } from '../services/api';

interface DispatchDriverModalProps {
  order: SupplyChainOrder;
  language: Language;
  onClose: () => void;
  onDispatched: (res: DispatchOrderResponse) => void;
}

export const DispatchDriverModal: React.FC<DispatchDriverModalProps> = ({
  order,
  language,
  onClose,
  onDispatched,
}) => {
  const [driverPhone, setDriverPhone] = useState(order.driverPhone || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dispatchResult, setDispatchResult] = useState<DispatchOrderResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = driverPhone.replace(/[\s\-()]/g, '');
    if (!/^(\+?880|0)1[3-9]\d{8}$/.test(cleaned) && !/^\+?\d{10,15}$/.test(cleaned)) {
      setError(
        t(
          'Please enter a valid 11-digit driver mobile number (e.g., 01712345678).',
          'সঠিক ১১ সংখ্যার ড্রাইভারের মোবাইল নম্বর লিখুন (যেমন: 01712345678)।'
        )
      );
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await orderApi.dispatchOrder(order.id, cleaned, window.location.origin);
      setDispatchResult(res);
      window.dispatchEvent(
        new CustomEvent('nb_order_updated', {
          detail: {
            orderId: order.id,
            orderStatus: res.orderStatus,
            driverPhone: res.driverPhone,
            trackingUrl: res.trackingPath,
          },
        })
      );
      onDispatched(res);
    } catch (err: any) {
      setError(err?.message || t('Failed to dispatch order', 'অর্ডার ডেলিভারিতে পাঠাতে ব্যর্থ হয়েছে'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!dispatchResult?.trackingUrl) return;
    try {
      await navigator.clipboard.writeText(dispatchResult.trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-emerald-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {t('Out for Delivery', 'ডেলিভারিতে দেয়া হয়েছে')}
              </h3>
              <p className="text-xs text-emerald-100">
                {t('Send Auto-SMS tracking link to driver', 'ড্রাইভারের মোবাইলে অটো-এসএমএস ট্র্যাকিং লিংক পাঠান')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Order summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-slate-800">{order.trackingCode}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                {order.buyerName}
              </span>
            </div>
            <p className="text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{order.deliveryAddress}, {order.district}</span>
            </p>
          </div>

          {!dispatchResult ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-1.5">
                  {t("Driver's Mobile Number", 'ড্রাইভারের মোবাইল নম্বর')} *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder={t('e.g., 01712345678', 'যেমন: 01712345678')}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none text-sm font-semibold text-slate-900"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 flex items-start gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    {t(
                      'An SMS with the live GPS tracking link (/tracker/...) will be automatically sent to this number and the order status will change to "On the Way".',
                      'এই নম্বরে স্বয়ংক্রিয়ভাবে লাইভ জিপিএস ট্র্যাকিং লিংকসহ এসএমএস পাঠানো হবে এবং অর্ডারের স্ট্যাটাস "On the Way" হবে।'
                    )}
                  </span>
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 font-medium">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                >
                  {t('Cancel', 'বাতিল')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {submitting
                      ? t('Sending SMS...', 'এসএমএস পাঠানো হচ্ছে...')
                      : t('Dispatch & Send SMS', 'পাঠান ও এসএমএস দিন')}
                  </span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>
                    {t('Order is now "On the Way"!', 'অর্ডারটি এখন "পথে রয়েছে" (On the Way)!')}
                  </span>
                </div>
                <p className="text-xs text-emerald-700">
                  {t(
                    `Auto-SMS dispatched to ${dispatchResult.driverPhone} (${dispatchResult.sms?.provider || 'mock-sms-gateway'}).`,
                    `ড্রাইভারের নম্বর ${dispatchResult.driverPhone}-এ অটো-এসএমএস পাঠানো হয়েছে (${dispatchResult.sms?.provider || 'mock-sms-gateway'})।`
                  )}
                </p>
              </div>

              {dispatchResult.sms?.messageBody && (
                <div className="bg-slate-900 text-slate-100 rounded-2xl p-3.5 text-xs space-y-1.5 font-mono">
                  <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                    📱 {t('Simulated SMS Preview', 'এসএমএস প্রিভিউ')}
                  </div>
                  <p className="leading-relaxed break-words text-slate-200">
                    {dispatchResult.sms.messageBody}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? t('Copied!', 'কপি হয়েছে!') : t('Copy Tracking Link', 'লিংক কপি করুন')}</span>
                </button>
                <a
                  href={dispatchResult.trackingPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('Open Driver Page', 'ড্রাইভার পেজ খুলুন')}</span>
                </a>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                {t('Done', 'সম্পন্ন')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

