import React, { useEffect } from 'react';
import {
  FileText,
  X,
  ShieldCheck,
  Clock,
  MapPin,
  Phone,
  Truck,
  Package,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import { Language, SupplyChainOrder, TrackerOrderInfo } from '../types';

export interface DigitalChallanItem {
  cropName: string;
  banglaName?: string;
  quantity: number;
  unit?: string;
  unitPrice?: number;
  subtotal?: number;
}

export interface DigitalChallanData {
  orderId: string;
  trackingCode?: string;
  status: string;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
  sellerName: string;
  sellerPhone?: string | null;
  buyerName: string;
  buyerPhone?: string | null;
  driverPhone?: string | null;
  deliveryAddress: string;
  district?: string;
  totalBDT: number;
  paymentMethod?: string;
  items: DigitalChallanItem[];
}

export function challanFromOrder(order: SupplyChainOrder): DigitalChallanData {
  return {
    orderId: order.id,
    trackingCode: order.trackingCode,
    status: order.orderStatus || order.status || order.deliveryStatus || 'On the Way',
    dispatchedAt: order.dispatchedAt || order.tripStartedAt || order.updatedAt || order.createdAt,
    deliveredAt: order.deliveredAt || null,
    sellerName: order.sellerName,
    sellerPhone: order.sellerPhone,
    buyerName: order.buyerName,
    buyerPhone: order.buyerPhone,
    driverPhone: order.driverPhone,
    deliveryAddress: order.deliveryAddress,
    district: order.district,
    totalBDT: Number(order.totalBDT || 0),
    paymentMethod: order.paymentMethod,
    items: (order.items || []).map((it) => ({
      cropName: it.cropName,
      banglaName: it.banglaName,
      quantity: Number(it.quantityKg || 0),
      unit: it.unit || 'kg',
      unitPrice: Number(it.unitPrice || 0),
      subtotal: Number(it.subtotal || 0),
    })),
  };
}

export function challanFromTrackerInfo(info: TrackerOrderInfo): DigitalChallanData {
  return {
    orderId: info.orderId,
    trackingCode: info.trackingCode,
    status: info.orderStatus || info.deliveryStatus || 'On the Way',
    dispatchedAt: info.dispatchedAt || info.tripStartedAt || info.updatedAt || info.createdAt,
    deliveredAt: info.deliveredAt || null,
    sellerName: info.sellerName,
    sellerPhone: info.sellerPhone,
    buyerName: info.buyerName,
    buyerPhone: info.buyerPhone,
    driverPhone: info.driverPhone,
    deliveryAddress: info.deliveryAddress,
    district: info.district,
    totalBDT: Number(info.totalBdt || 0),
    items: (info.items || []).map((it) => ({
      cropName: it.cropName,
      banglaName: it.banglaName,
      quantity: Number(it.quantityKg || 0),
      unit: it.unit || 'kg',
      unitPrice: Number(it.unitPrice || 0),
      subtotal: Number(it.subtotal || 0),
    })),
  };
}

export function isChallanEligibleStatus(status: unknown): boolean {
  const s = String(status || '').trim().toLowerCase();
  return (
    s === 'on the way' ||
    s === 'on_the_way' ||
    s === 'shipped' ||
    s === 'dispatched' ||
    s === 'delivered' ||
    s === 'completed'
  );
}

interface DigitalChallanModalProps {
  challan: DigitalChallanData;
  language: Language;
  onClose: () => void;
}

export const DigitalChallanModal: React.FC<DigitalChallanModalProps> = ({
  challan,
  language,
  onClose,
}) => {
  const t = (en: string, bn: string) => (language === 'bn' ? bn : en);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return t('Upon Dispatch', 'ডেলিভারি শুরুর সময়');
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return dt.toLocaleString(language === 'bn' ? 'bn-BD' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusLower = String(challan.status || '').toLowerCase();
  const isDelivered = statusLower === 'delivered' || statusLower === 'completed';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl border border-emerald-200">
        {/* Sticky Header */}
        <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 p-5 text-white flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                {t('Digital Challan (Invoice)', 'ডিজিটাল চালান (রসিদ)')}
              </h3>
              <p className="text-[11px] text-emerald-200 flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('Auto-generated read-only transit receipt', 'স্বয়ংক্রিয় ও অপরিবর্তনযোগ্য ট্রানজিট রসিদ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Top Metadata Strip */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-stone-200">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 block">
                  {t('Order ID', 'অর্ডার আইডি')}
                </span>
                <span className="font-mono font-black text-stone-900 text-sm">#{challan.orderId}</span>
                {challan.trackingCode && (
                  <span className="ml-2 text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-600">
                    {challan.trackingCode}
                  </span>
                )}
              </div>

              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                  isDelivered
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                }`}
              >
                {isDelivered ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t('Delivered', 'ডেলিভারি সম্পন্ন')}</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-3.5 h-3.5" />
                    <span>{t('On the Way', 'পথে রয়েছে (On the Way)')}</span>
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-stone-400 block">
                    {t('Dispatch Time', 'ডিসপ্যাচের সময়')}
                  </span>
                  <span className="font-semibold text-stone-800">
                    {formatDateTime(challan.dispatchedAt)}
                  </span>
                </div>
              </div>

              {challan.deliveredAt && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400 block">
                      {t('Delivered Time', 'হস্তান্তরের সময়')}
                    </span>
                    <span className="font-semibold text-emerald-800">
                      {formatDateTime(challan.deliveredAt)}
                    </span>
                  </div>
                </div>
              )}

              {challan.driverPhone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-stone-400 block">
                      {t('Driver Contact', 'ড্রাইভারের মোবাইল')}
                    </span>
                    <span className="font-mono font-bold text-stone-800">{challan.driverPhone}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sender / Receiver Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                {t('From (Farmer / Seller)', 'প্রেরক (কৃষক / বিক্রেতা)')}
              </span>
              <p className="font-bold text-stone-900 text-sm">{challan.sellerName}</p>
              {challan.sellerPhone && (
                <p className="text-stone-600 font-mono text-[11px]">{challan.sellerPhone}</p>
              )}
            </div>

            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-blue-700 block">
                {t('To (Wholesaler / Buyer)', 'প্রাপক (পাইকার / ক্রেতা)')}
              </span>
              <p className="font-bold text-stone-900 text-sm">{challan.buyerName}</p>
              {challan.buyerPhone && (
                <p className="text-stone-600 font-mono text-[11px]">{challan.buyerPhone}</p>
              )}
              <p className="text-[11px] text-stone-600 flex items-start gap-1 pt-0.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  {challan.deliveryAddress}
                  {challan.district ? `, ${challan.district}` : ''}
                </span>
              </p>
            </div>
          </div>

          {/* Cargo Line Items Table */}
          <div className="border border-stone-200 rounded-2xl overflow-hidden">
            <div className="bg-stone-100 px-3.5 py-2.5 flex items-center justify-between border-b border-stone-200">
              <span className="font-bold text-stone-800 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                {t('Goods Manifest', 'পণ্যের তালিকা')}
              </span>
              <span className="text-[10px] font-bold uppercase text-stone-500">
                {t('Read-Only', 'শুধুমাত্র পাঠযোগ্য')}
              </span>
            </div>

            <div className="divide-y divide-stone-100 bg-white">
              {challan.items.length === 0 ? (
                <div className="p-3.5 text-stone-500 text-center">
                  {t('Order lot details verified at dispatch.', 'ডিসপ্যাচের সময় পণ্যের তথ্য যাচাই করা হয়েছে।')}
                </div>
              ) : (
                challan.items.map((item, idx) => {
                  const unitLabel =
                    item.unit === 'dozen' ? t('dozen', 'ডজন') : t('kg', 'কেজি');
                  const computedSubtotal =
                    item.subtotal && item.subtotal > 0
                      ? item.subtotal
                      : item.unitPrice && item.unitPrice > 0
                      ? item.quantity * item.unitPrice
                      : null;

                  return (
                    <div key={idx} className="px-3.5 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-stone-900 text-xs sm:text-sm truncate">
                          {language === 'bn' && item.banglaName ? item.banglaName : item.cropName}
                        </p>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {t('Quantity', 'পরিমাণ')}:{' '}
                          <strong className="text-stone-800">
                            {item.quantity} {unitLabel}
                          </strong>
                          {item.unitPrice && item.unitPrice > 0 ? (
                            <span className="ml-2">
                              • ৳{item.unitPrice.toLocaleString()}/{unitLabel}
                            </span>
                          ) : null}
                        </p>
                      </div>

                      {computedSubtotal !== null && (
                        <div className="text-right font-extrabold text-stone-900 shrink-0">
                          ৳{computedSubtotal.toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Total Row */}
            <div className="bg-emerald-50 border-t border-emerald-200 px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-emerald-950 block">
                  {t('Total Price', 'মোট মূল্য')}
                </span>
                {challan.paymentMethod && (
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {challan.paymentMethod}
                  </span>
                )}
              </div>
              <span className="text-lg font-black text-emerald-800">
                ৳{challan.totalBDT.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Read-Only Stamp & Actions */}
          <div className="flex items-center justify-between gap-2 pt-1 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('Print Challan', 'প্রিন্ট করুন')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer"
            >
              {t('Close', 'বন্ধ করুন')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

