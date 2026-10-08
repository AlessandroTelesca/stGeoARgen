import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Check, Gift, MapPin, X } from 'lucide-react';
import { apiGetUserVouchers } from '../services/api';

interface VoucherListItem {
  id: number;
  code: string | null;
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
}

export function VoucherRedeemPage({ userId, userPoints, onPointsChange, embedded = false }: { userId: number; userPoints: number; onPointsChange?: () => void; embedded?: boolean }) {
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
    console.log('fetchData called with userId:', userId);
    if (userId <= 0) {
      console.log('userId <= 0, setting empty arrays');
      setRedeemableVouchers([]);
      setRedeemedVouchers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching vouchers from API...');
      const data = await apiGetUserVouchers(userId);
      console.log('API data:', data);
      if (data.success) {
        setRedeemableVouchers(Array.isArray(data.redeemable_vouchers) ? data.redeemable_vouchers : []);
        setRedeemedVouchers(Array.isArray(data.redeemed_vouchers) ? data.redeemed_vouchers : []);
      } else {
        console.log('API returned success: false');
        setRedeemableVouchers([]);
        setRedeemedVouchers([]);
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      setRedeemableVouchers([]);
      setRedeemedVouchers([]);
    }
    setLoading(false);
  };

  const openCodePopup = (code: string | null, description: string) => {
    if (!code) return;
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
      setCopiedId(Date.now()); // Verwende Timestamp statt ID
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Fehler beim Kopieren');
    }
  };

  const formatDate = (value: string, withTime = false) => {
    const date = new Date(value.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) return value;
    return withTime ? date.toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : date.toLocaleDateString('de-DE', { dateStyle: 'medium' });
  };

  const emptyState = (text: string) => (
    <div className="rounded-[24px] border border-dashed border-border-strong px-6 py-10 text-center">
      <span className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground mx-auto mb-3 flex items-center justify-center">
        <Gift className="w-6 h-6" />
      </span>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );

  return (
    <div className={embedded ? '' : 'min-h-screen bg-background px-4 pt-6 pb-12'}>
      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-tight">Meine Gutscheine</h1>
            <p className="text-muted-foreground text-sm mt-1.5">Hier findest du einlösbare und bereits eingelöste Gutscheine.</p>
          </div>
          <span className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1.5 text-sm font-bold text-gold-foreground tabular-nums">
            {userPoints} Punkte
          </span>
        </div>

        <div className="flex gap-2 mb-5">
          {([
            ['redeemable', `Einlösbar (${redeemableVouchers.length})`],
            ['redeemed', `Eingelöst (${redeemedVouchers.length})`],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab === tab}
              className={`h-10 px-4 rounded-full text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-foreground text-white' : 'bg-card border border-border hover:border-border-strong'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1].map((i) => <div key={i} className="h-28 rounded-[24px] bg-muted animate-pulse" />)}
          </div>
        ) : activeTab === 'redeemable' ? (
          redeemableVouchers.length === 0 ? emptyState('Keine einlösbaren Gutscheine vorhanden.') : (
            <div className="space-y-3">
              {redeemableVouchers.map((voucher) => (
                <motion.article
                  key={voucher.id}
                  className="surface-card p-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-start gap-3.5">
                    <span className="w-11 h-11 rounded-2xl bg-gold-soft text-gold flex items-center justify-center flex-shrink-0">
                      <Gift className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold leading-snug">{voucher.description}</h3>
                      {voucher.partner_name && <p className="text-sm text-muted-foreground mt-0.5">{voucher.partner_name}</p>}
                      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        {voucher.purchased_at && <p>Erworben am {formatDate(voucher.purchased_at, true)}</p>}
                        <p>{voucher.expiry_date ? `Gültig bis ${formatDate(voucher.expiry_date)}` : 'Kein Ablaufdatum'}</p>
                        {voucher.address && (
                          <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{voucher.address}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {voucher.code ? (
                    <Button
                      onClick={() => openCodePopup(voucher.code, voucher.description)}
                      className="mt-4 w-full h-11 rounded-2xl font-bold"
                    >
                      Code anzeigen
                    </Button>
                  ) : (
                    <p className="mt-4 rounded-2xl bg-muted px-4 py-2.5 text-center text-sm text-muted-foreground">Kein Code verfügbar</p>
                  )}
                </motion.article>
              ))}
            </div>
          )
        ) : (
          redeemedVouchers.length === 0 ? emptyState('Noch keine eingelösten Gutscheine vorhanden.') : (
            <div className="space-y-3">
              {redeemedVouchers.map((voucher) => (
                <motion.article
                  key={voucher.id}
                  className="surface-card p-4 opacity-80"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 0.8, y: 0 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-bold leading-snug">{voucher.description}</h3>
                      {voucher.partner_name && <p className="text-sm text-muted-foreground mt-0.5">{voucher.partner_name}</p>}
                      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        {voucher.address && <p className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{voucher.address}</p>}
                        {voucher.redeemed_at && <p>Eingelöst am {formatDate(voucher.redeemed_at, true)}</p>}
                        <p className="font-semibold text-foreground">Kosten: {voucher.points_value} Punkte</p>
                      </div>
                    </div>
                    <span className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary-dark">
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      Verwendet
                    </span>
                  </div>
                </motion.article>
              ))}
            </div>
          )
        )}
      </motion.div>

      {/* Code Popup */}
      <AnimatePresence>
        {showCodePopup && popupCode && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCodePopup}
          >
            <motion.div
              className="w-full max-w-md overflow-hidden rounded-[28px] bg-card shadow-2xl"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="brand-gradient relative px-6 py-8 text-white">
                <button
                  type="button"
                  onClick={closeCodePopup}
                  className="absolute right-3 top-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="Fenster schließen"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-sm">
                  <Gift className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-extrabold tracking-tight">Gutschein-Code</h2>
                  <p className="mt-2 text-sm text-white/85">{popupDescription}</p>
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Dein Code</p>
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-background px-4 py-3 shadow-sm">
                    <span className="text-xl font-bold tracking-[0.2em] text-primary font-mono break-all">{popupCode}</span>
                    <Button variant="outline" size="sm" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4" />
                      {copiedId ? 'Kopiert' : 'Code kopieren'}
                    </Button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={closeCodePopup}>Schließen</Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
