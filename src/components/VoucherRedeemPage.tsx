import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { motion } from 'motion/react';
import { Copy, Check, Gift, MapPin } from 'lucide-react';

interface RedeemedVoucher {
  id: number;
  code: string;
  description: string;
  partner_name?: string;
  redeemed_at?: string;
}

interface AvailableVoucher {
  id: number;
  description: string;
  partner_name?: string;
  address?: string;
  points_value: number;
  expiry_date?: string;
}

export function VoucherRedeemPage({ userId, userPoints, onPointsChange }: { userId: number; userPoints: number; onPointsChange?: () => void }) {
  const [redeemedVouchers, setRedeemedVouchers] = useState<RedeemedVoucher[]>([]);
  const [availableVouchers, setAvailableVouchers] = useState<AvailableVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'redeemed' | 'available'>('redeemed');

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [redeemedRes, availableRes] = await Promise.all([
        fetch(`/api/get_user_vouchers.php?user_id=${userId}`),
        fetch('/api/get_available_vouchers.php')
      ]);
      const redeemedData = await redeemedRes.json();
      const availableData = await availableRes.json();
      if (redeemedData.success) {
        setRedeemedVouchers(redeemedData.vouchers);
      }
      if (availableData.success) {
        setAvailableVouchers(availableData.vouchers);
      }
    } catch (e) {
      console.error('Fehler beim Laden der Daten');
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

  const handleRedeem = async (voucher: AvailableVoucher) => {
    try {
      const res = await fetch('/api/redeem_voucher_from_shop.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucher_id: voucher.id, user_id: userId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Gutschein eingelöst! Code: ${data.code}\n\nGutschein findest du im Tab "Eingelöst"`);
        onPointsChange?.();
        await fetchData(); // Aktualisieren
        setActiveTab('redeemed'); // Automatisch zum "Eingelöst"-Tab wechseln
      } else {
        alert(data.message);
      }
    } catch (e) {
      alert('Fehler beim Einlösen');
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
          <p className="text-muted-foreground text-base mb-2" style={{ marginTop: '10px' }}>Eingelöste und verfügbare Gutscheine.</p>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-10 pb-4">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('redeemed')}
              className={`flex-1 py-2 text-center font-medium ${activeTab === 'redeemed' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            >
              Eingelöst ({redeemedVouchers.length})
            </button>
            <button
              onClick={() => setActiveTab('available')}
              className={`flex-1 py-2 text-center font-medium ${activeTab === 'available' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            >
              Verfügbar ({availableVouchers.length})
            </button>
          </div>
        </div>

        <div className="px-4 sm:px-10 pb-10" style={{ minHeight: '180px', marginTop: '10px' }}>
          {loading ? (
            <div className="text-center">Lade Gutscheine...</div>
          ) : activeTab === 'redeemed' ? (
            redeemedVouchers.length === 0 ? (
              <div className="text-center text-muted-foreground">Keine eingelösten Gutscheine.</div>
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
                          <p className="text-sm text-muted-foreground">Partner: {voucher.partner_name}</p>
                        )}
                        {voucher.redeemed_at && (
                          <p className="text-sm text-muted-foreground">Eingelöst am: {new Date(voucher.redeemed_at).toLocaleDateString('de-DE')}</p>
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
            availableVouchers.length === 0 ? (
              <div className="text-center text-muted-foreground">Keine verfügbaren Gutscheine.</div>
            ) : (
              <div className="space-y-4">
                {availableVouchers.map((voucher) => (
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
                        {voucher.address && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{voucher.address}</span>
                          </div>
                        )}
                        <p className="text-sm font-medium text-primary mt-1">{voucher.points_value} Punkte</p>
                      </div>
                      <Button
                        onClick={() => handleRedeem(voucher)}
                        variant="default"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Gift className="w-4 h-4" />
                        Einlösen
                      </Button>
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