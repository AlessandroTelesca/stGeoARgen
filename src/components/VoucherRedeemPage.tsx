import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { Copy, Check, Gift, MapPin } from 'lucide-react';

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

export function VoucherRedeemPage({ userId, userPoints, onPointsChange }: { userId: number; userPoints: number; onPointsChange?: () => void }) {
  const [redeemableVouchers, setRedeemableVouchers] = useState<VoucherListItem[]>([]);
  const [redeemedVouchers, setRedeemedVouchers] = useState<VoucherListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'redeemable' | 'redeemed'>('redeemable');

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
      }
    } catch {
      console.error('Fehler beim Laden der Daten');
      setRedeemableVouchers([]);
      setRedeemedVouchers([]);
    }
    setLoading(false);
  };

  const copyToClipboard = async (code: string, id: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('Fehler beim Kopieren');
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
        <div className="flex flex-col items-center text-center pt-24 pb-6 px-4 sm:px-10" style={{ marginTop: '10px' }}>
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center mb-4 shadow-lg" style={{ marginTop: '10px' }}>
            <img src="/Logo.svg" alt="St.GeoARgen" className="w-12 h-12 object-contain" style={{filter: 'brightness(0) invert(1)', marginTop: '10px'}} />
          </div>
          <h1 className="text-3xl font-bold mb-1" style={{ marginTop: '10px' }}>Meine Gutscheine</h1>
          <p className="text-muted-foreground text-base font-semibold mb-1">Deine Punkte: {userPoints}</p>
          <p className="text-muted-foreground text-base mb-2" style={{ marginTop: '10px' }}>Hier findest du einlösbare und bereits eingelöste Gutscheine.</p>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-10 pb-4">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('redeemable')}
              className={`flex-1 py-2 text-center font-medium ${activeTab === 'redeemable' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            >
              Einlösbar ({redeemableVouchers.length})
            </button>
            <button
              onClick={() => setActiveTab('redeemed')}
              className={`flex-1 py-2 text-center font-medium ${activeTab === 'redeemed' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            >
              Bereits eingelöst ({redeemedVouchers.length})
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-10 pb-10" style={{ minHeight: '180px', marginTop: '10px' }}>
          {loading ? (
            <div className="text-center">Lade Gutscheine...</div>
          ) : activeTab === 'redeemable' ? (
            redeemableVouchers.length === 0 ? (
              <div className="text-center text-muted-foreground">Keine einlösbaren Gutscheine vorhanden.</div>
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
                          <p className="text-sm text-muted-foreground">Partner: {voucher.partner_name}</p>
                        )}
                        {voucher.purchased_at && (
                          <p className="text-sm text-muted-foreground">Erworben am: {new Date(voucher.purchased_at).toLocaleString('de-DE')}</p>
                        )}
                        {voucher.expiry_date && (
                          <p className="text-sm text-muted-foreground">Gültig bis: {new Date(voucher.expiry_date).toLocaleDateString('de-DE')}</p>
                        )}
                        {!voucher.expiry_date && (
                          <p className="text-sm text-muted-foreground">Kein Ablaufdatum</p>
                        )}
                        {voucher.address && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <MapPin className="w-4 h-4" />
                            <span>{voucher.address}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => copyToClipboard(voucher.code, voucher.id)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        {copiedId === voucher.id ? (
                          <>
                            <Check className="w-4 h-4" />
                            Kopiert
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Code kopieren
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            redeemedVouchers.length === 0 ? (
              <div className="text-center text-muted-foreground">Noch keine bereits eingelösten Gutscheine vorhanden.</div>
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
                          <p className="text-sm text-muted-foreground mt-1">Eingelöst am: {new Date(voucher.redeemed_at).toLocaleString('de-DE')}</p>
                        )}
                        <p className="text-sm font-medium text-primary mt-1">Kosten: {voucher.points_value} Punkte</p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                        <Gift className="w-4 h-4" />
                        Verwendet
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          )}
        </div>
      </motion.div>
    </div>
  );
}