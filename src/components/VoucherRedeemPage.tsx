import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Gift, MapPin, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface VoucherListItem {
  id: number;
  code: string;
  description: string;
  partner_name?: string;
  address?: string;
  points_value: number;
  purchased_at?: string;
  redeemed_at?: string;
  expiry_date?: string;
}

interface UserVouchersResponse {
  success: boolean;
  redeemable_vouchers: VoucherListItem[];
  redeemed_vouchers: VoucherListItem[];
  vouchers?: VoucherListItem[];
}

interface VoucherRedeemPageProps {
  userId: number;
  userPoints: number;
  onPointsChange?: () => void;
  embedded?: boolean;
}

export function VoucherRedeemPage({ userId, userPoints, onPointsChange, embedded = false }: VoucherRedeemPageProps) {
  const { t, language } = useLanguage();
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  const [activeTab, setActiveTab] = useState<'redeemable' | 'redeemed'>('redeemable');
  const [redeemableVouchers, setRedeemableVouchers] = useState<VoucherListItem[]>([]);
  const [redeemedVouchers, setRedeemedVouchers] = useState<VoucherListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showCodePopup, setShowCodePopup] = useState(false);
  const [popupCode, setPopupCode] = useState<string | null>(null);
  const [popupDescription, setPopupDescription] = useState<string | null>(null);

  useEffect(() => {
    void fetchData();
  }, [userId]);

  const fetchData = async () => {
    if (userId <= 0) {
      setRedeemableVouchers([]);
      setRedeemedVouchers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/get_user_vouchers.php?user_id=${userId}`);
      const data = await response.json() as UserVouchersResponse;
      if (data.success) {
        const redeemable = Array.isArray(data.redeemable_vouchers) ? data.redeemable_vouchers : [];
        const redeemed = Array.isArray(data.redeemed_vouchers)
          ? data.redeemed_vouchers
          : Array.isArray(data.vouchers)
            ? data.vouchers
            : [];

        setRedeemableVouchers(redeemable);
        setRedeemedVouchers(redeemed);
        onPointsChange?.();
      } else {
        setRedeemableVouchers([]);
        setRedeemedVouchers([]);
      }
    } catch {
      setRedeemableVouchers([]);
      setRedeemedVouchers([]);
    }
    setLoading(false);
  };

  const openCodePopup = (code: string, description: string) => {
    setPopupCode(code);
    setPopupDescription(description);
    setShowCodePopup(true);
  };

  const closeCodePopup = () => {
    setShowCodePopup(false);
    setPopupCode(null);
    setPopupDescription(null);
  };

  const copyToClipboard = async () => {
    if (!popupCode) return;
    try {
      await navigator.clipboard.writeText(popupCode);
      setCopiedId(Date.now());
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex justify-center items-start sm:pt-12 pt-6 sm:pb-12 pb-6">
      <motion.div
        className="relative w-full max-w-2xl sm:max-w-2xl max-w-full mx-auto bg-white rounded-3xl shadow-2xl border border-border overflow-hidden"
        style={{ minHeight: '420px', height: 'auto', maxWidth: '700px' }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      >
        {/* Logo-Header */}
        <div className="flex flex-col items-center text-center pt-16 sm:pt-24 pb-6 px-4 sm:px-10" style={{ marginTop: '10px' }}>
          <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center mb-4 shadow-lg" style={{ marginTop: '10px' }}>
            <img src="/Logo.svg" alt="St.GeoARgen" className="w-10 sm:w-12 h-10 sm:h-12 object-contain" style={{ filter: 'brightness(0) invert(1)', marginTop: '10px' }} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ marginTop: '10px' }}>{t('myVouchersTitle')}</h1>
          <p className="text-muted-foreground text-sm sm:text-base font-semibold mb-1">
            {t('myVouchersPoints').replace('{points}', String(userPoints))}
          </p>
          <p className="text-muted-foreground text-xs sm:text-base mb-2" style={{ marginTop: '10px' }}>{t('myVouchersIntro')}</p>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-10 pb-4">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('redeemable')}
              className={`flex-1 py-2 text-center font-medium ${activeTab === 'redeemable' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            >
              {t('vouchersTabRedeemable').replace('{count}', String(redeemableVouchers.length))}
            </button>
            <button
              onClick={() => setActiveTab('redeemed')}
              className={`flex-1 py-2 text-center font-medium ${activeTab === 'redeemed' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            >
              {t('vouchersTabRedeemed').replace('{count}', String(redeemedVouchers.length))}
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-10 pb-10" style={{ minHeight: '180px', marginTop: '10px' }}>
          {loading ? (
            <div className="text-center">{t('vouchersLoading')}</div>
          ) : activeTab === 'redeemable' ? (
            redeemableVouchers.length === 0 ? (
              <div className="text-center text-muted-foreground">{t('vouchersNoneRedeemable')}</div>
            ) : (
              <div className="space-y-4">
                {redeemableVouchers.map((voucher) => (
                  <motion.div
                    key={voucher.id}
                    className="border rounded-xl p-4 bg-gray-50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{voucher.description}</h3>
                        {voucher.partner_name && (
                          <p className="text-sm text-muted-foreground">
                            {t('vouchersPartner').replace('{name}', voucher.partner_name)}
                          </p>
                        )}
                        {voucher.purchased_at && (
                          <p className="text-sm text-muted-foreground">
                            {t('vouchersPurchasedAt').replace('{date}', new Date(voucher.purchased_at).toLocaleString(locale))}
                          </p>
                        )}
                        {voucher.expiry_date && (
                          <p className="text-sm text-muted-foreground">
                            {t('vouchersValidUntil').replace('{date}', new Date(voucher.expiry_date).toLocaleDateString(locale))}
                          </p>
                        )}
                        {!voucher.expiry_date && (
                          <p className="text-sm text-muted-foreground">{t('vouchersNoExpiry')}</p>
                        )}
                        {voucher.address && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-4 h-4" />
                            <span>{voucher.address}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => openCodePopup(voucher.code, voucher.description)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        {t('vouchersShowCode')}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            redeemedVouchers.length === 0 ? (
              <div className="text-center text-muted-foreground">{t('vouchersNoneRedeemed')}</div>
            ) : (
              <div className="space-y-4">
                {redeemedVouchers.map((voucher) => (
                  <motion.div
                    key={voucher.id}
                    className="border rounded-xl p-4 bg-gray-50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{voucher.description}</h3>
                        {voucher.partner_name && (
                          <p className="text-sm text-muted-foreground">{voucher.partner_name}</p>
                        )}
                        {voucher.address && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{voucher.address}</span>
                          </div>
                        )}
                        {voucher.redeemed_at && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('vouchersRedeemedAt').replace('{date}', new Date(voucher.redeemed_at).toLocaleString(locale))}
                          </p>
                        )}
                        <p className="text-sm font-medium text-primary mt-1">
                          {t('vouchersCost').replace('{points}', String(voucher.points_value))}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        <Gift className="w-4 h-4" />
                        {t('vouchersUsedLabel')}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          )}
        </div>
      </motion.div>

      {/* Code Popup */}
      <AnimatePresence>
        {showCodePopup && popupCode && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCodePopup}
          >
            <motion.div
              className="w-full max-w-md overflow-hidden rounded-3xl bg-background shadow-2xl"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="relative bg-gradient-to-br from-primary to-primary-light px-6 py-8 text-white">
                <button
                  type="button"
                  onClick={closeCodePopup}
                  className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white/90 transition hover:bg-white/25"
                  aria-label={t('close')}
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-sm">
                  <Gift className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">{t('voucherCodeTitle')}</h2>
                  <p className="mt-2 text-sm text-white/85">{popupDescription}</p>
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">{t('voucherCodeLabel')}</p>
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-background px-4 py-3 shadow-sm">
                    <span className="text-lg font-semibold tracking-[0.2em] text-primary">{popupCode}</span>
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="w-4 h-4" />
                      {copiedId ? t('voucherCopied') : t('voucherCopy')}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={closeCodePopup}>{t('voucherClose')}</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
