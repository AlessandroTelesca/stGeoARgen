import { useState } from 'react';
import { Gift, Lock, MapPin, ArrowLeft, Trophy, Copy, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { VoucherRedeemPage } from './VoucherRedeemPage';
import { apiRedeemVoucherFromShop } from '../services/api';

interface Voucher {
  id: number;
  code: string | null;
  description: string;
  partner_name?: string;
  address?: string;
  points_value: number;
  expiry_date?: string;
  quantity?: number;
  imageUrl?: string;
}

const vouchers: Voucher[] = [
  {
    id: 1,
    code: null,
    description: 'Freier Eintritt ins Hallenbad St.Georgen für eine Person',
    partner_name: 'Hallenbad St.Georgen',
    address: 'Im Hochwald 6, 78112 St. Georgen',
    points_value: 20,
    quantity: 40,
    imageUrl:
      'https://images.unsplash.com/photo-1508609349937-5ec4ae374ebf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=Mnw3NzgwNjR8MHwxfHNlYXJjaHwxfHxiaXNvb3N8ZW58MHx8fHwxNjAwNjQ2Njk1&ixlib=rb-1.2.1&q=80&w=400',
  },
];

interface RewardsViewProps {
  totalPoints: number;
  userId?: number;
  onBack: () => void;
  onPointsChange?: () => Promise<void> | void;
  onNavigateToMyVouchers?: () => void;
}

type TabType = 'rewards' | 'vouchers';

export function RewardsView({ totalPoints, userId, onBack, onPointsChange, onNavigateToMyVouchers }: RewardsViewProps) {
  const [redeemingVoucherId, setRedeemingVoucherId] = useState<number | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [createdVoucherCode, setCreatedVoucherCode] = useState<string | null>(null);
  const [createdVoucherTitle, setCreatedVoucherTitle] = useState<string | null>(null);
  const [createdVoucherDescription, setCreatedVoucherDescription] = useState<string | null>(null);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmPurchase, setConfirmPurchase] = useState<Voucher | null>(null);
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>(vouchers);
  const [activeTab, setActiveTab] = useState<TabType>('rewards');

  const unlockedCount = availableVouchers.filter((v) => totalPoints >= v.points_value && (v.quantity ?? -1) !== 0).length;

  const resetDialogState = () => {
    setFeedbackOpen(false);
    setCreatedVoucherCode(null);
    setCreatedVoucherTitle(null);
    setCreatedVoucherDescription(null);
    setDialogMessage(null);
    setCopiedCode(false);
  };

  const handleCopyCode = async () => {
    if (!createdVoucherCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdVoucherCode);
      setCopiedCode(true);
    } catch {
      setCopiedCode(false);
    }
  };

  const handleRedeemVoucher = (voucher: Voucher) => {
    if (!userId) {
      setDialogMessage('Bitte melde dich an, um einen Gutschein einzulösen.');
      setFeedbackOpen(true);
      return;
    }

    setConfirmPurchase(voucher);
  };

  const confirmRedeemVoucher = async () => {
    if (!confirmPurchase || !userId) return;

    const voucher = confirmPurchase;
    setConfirmPurchase(null);
    setRedeemingVoucherId(voucher.id);

    try {
      const data = await apiRedeemVoucherFromShop(userId, voucher.id);

      await onPointsChange?.();
      setAvailableVouchers((prev) =>
        prev.map((item) =>
          item.id === voucher.id
            ? {
                ...item,
                quantity:
                  typeof item.quantity === 'number' && item.quantity > 0
                    ? item.quantity - 1
                    : item.quantity,
              }
            : item
        )
      );
      setCreatedVoucherTitle(voucher.partner_name || voucher.description);
      setCreatedVoucherDescription(voucher.description);
      setCreatedVoucherCode(typeof data.code === 'string' && data.code.length > 0 ? data.code : 'Code wird in Meine Gutscheine angezeigt');
      setDialogMessage(null);
      setFeedbackOpen(true);
    } catch (error) {
      setDialogMessage(error instanceof Error ? error.message : 'Fehler beim Einlösen des Gutscheins.');
      setFeedbackOpen(true);
    } finally {
      setRedeemingVoucherId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      <AnimatePresence>
        {confirmPurchase && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmPurchase(null)}
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
                  onClick={() => setConfirmPurchase(null)}
                  className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white/90 transition hover:bg-white/25"
                  aria-label="Fenster schließen"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-sm">
                  <Gift className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">Gutschein kaufen</h2>
                  <p className="mt-2 text-sm text-white/85">Möchtest du diesen Gutschein wirklich kaufen?</p>
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-lg font-semibold text-foreground">{confirmPurchase.description}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{confirmPurchase.partner_name ?? 'Gutschein'}</p>
                  <p className="mt-2 text-sm font-medium text-primary">Kosten: {confirmPurchase.points_value} Punkte</p>
                  <p className="mt-1 text-sm text-muted-foreground">Verbleibende Punkte: {totalPoints - confirmPurchase.points_value}</p>
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                  <Button variant="outline" onClick={() => setConfirmPurchase(null)}>Abbrechen</Button>
                  <Button onClick={confirmRedeemVoucher} disabled={redeemingVoucherId === confirmPurchase.id}>
                    {redeemingVoucherId === confirmPurchase.id ? 'Wird gekauft...' : 'Kaufen'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {feedbackOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetDialogState}
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
                  onClick={resetDialogState}
                  className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white/90 transition hover:bg-white/25"
                  aria-label="Fenster schließen"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-sm">
                  <Gift className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-semibold">{createdVoucherCode ? 'Gutschein erstellt' : 'Hinweis'}</h2>
                  <p className="mt-2 text-sm text-white/85">
                    {createdVoucherCode ? 'Dein Gutschein ist jetzt unter Meine Gutscheine verfügbar.' : dialogMessage}
                  </p>
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
                {createdVoucherCode ? (
                  <>
                    <div className="rounded-2xl border border-border bg-muted/30 p-4">
                      <p className="text-lg font-semibold text-foreground">{createdVoucherTitle}</p>
                      {createdVoucherDescription ? (
                        <p className="mt-1 text-sm text-muted-foreground">{createdVoucherDescription}</p>
                      ) : null}
                      <p className="mt-4 text-sm text-muted-foreground">Dein Code</p>
                      <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-background px-4 py-3 shadow-sm">
                        <span className="text-lg font-semibold tracking-[0.2em] text-primary">{createdVoucherCode}</span>
                        <Button variant="outline" size="sm" onClick={handleCopyCode}>
                          <Copy className="h-4 w-4" />
                          {copiedCode ? 'Kopiert' : 'Code kopieren'}
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                      <Button variant="outline" onClick={resetDialogState}>Später</Button>
                      <Button
                        onClick={() => {
                          resetDialogState();
                          onNavigateToMyVouchers?.();
                        }}
                      >
                        Meine Gutscheine
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-end">
                    <Button onClick={resetDialogState}>OK</Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="sticky top-16 bg-background/80 backdrop-blur-sm z-20 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Zurück</span>
          </button>
        </div>
      </div>

      <div className="sticky top-[88px] bg-background/80 backdrop-blur-sm z-20 border-b border-border">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex border-b gap-1">
            <button
              onClick={() => setActiveTab('rewards')}
              className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap ${activeTab === 'rewards' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            >
              Belohnungen
            </button>
            <button
              onClick={() => setActiveTab('vouchers')}
              className={`px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap ${activeTab === 'vouchers' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}
            >
              Gutscheine
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'rewards' ? (
          <>
            <motion.div className="mb-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Gift className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Belohnungen</h1>
                  <p className="text-muted-foreground">
                    {unlockedCount} von {vouchers.length} Gutscheinen freigeschaltet
                  </p>
                </div>
              </div>

              <Card className="p-6 bg-gradient-to-br from-primary to-primary-light text-white border-0">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-white/80 text-sm mb-1">Deine Punkte</div>
                    <p className="text-3xl font-bold">{totalPoints}</p>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Trophy className="w-8 h-8" />
                  </div>
                </div>
                <div className="text-sm text-white/80">
                  Sammle mehr Punkte, um weitere Gutscheine freizuschalten!
                </div>
              </Card>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
              {vouchers.length === 0 ? (
                <div className="col-span-2 rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground">Keine verfügbaren Gutscheine gefunden.</div>
              ) : (
                vouchers.map((voucher, index) => {
                  const unlocked = totalPoints >= voucher.points_value;
                  const progressToUnlock = Math.min((totalPoints / voucher.points_value) * 100, 100);

                  return (
                    <motion.div
                      key={voucher.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className={`overflow-hidden ${!unlocked ? 'opacity-60' : ''}`}>
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold mb-1">{voucher.description}</h3>
                              <p className="text-sm text-muted-foreground mb-2">{voucher.partner_name ?? 'Gutschein'}</p>
                            </div>
                          </div>

                          {voucher.address && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="line-clamp-1">{voucher.address}</span>
                            </div>
                          )}

                          {!unlocked && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                <span>Fortschritt</span>
                                <span>{totalPoints} / {voucher.points_value} Punkte</span>
                              </div>
                              <Progress value={progressToUnlock} className="h-2" />
                            </div>
                          )}

                          <Button
                            className={`w-full ${unlocked ? 'bg-primary hover:bg-primary-dark text-white' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                            disabled={!unlocked || redeemingVoucherId === voucher.id || (voucher.quantity ?? -1) === 0}
                            onClick={() => handleRedeemVoucher(voucher)}
                          >
                            {unlocked ? (
                              <>
                                <Gift className="w-4 h-4 mr-2" />
                                {redeemingVoucherId === voucher.id ? 'Wird erstellt...' : `Gutschein einlösen (${voucher.points_value} Punkte)`}
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 mr-2" />
                                {voucher.points_value} Punkte nötig
                              </>
                            )}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <VoucherRedeemPage userId={userId || 0} userPoints={totalPoints} onPointsChange={onPointsChange} embedded={true} />
        )}
      </div>
    </div>
  );
}
