import { useState } from 'react';
import { Gift, Lock, MapPin, Trophy, Copy, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { VoucherRedeemPage } from './VoucherRedeemPage';
import { apiRedeemVoucherFromShop } from '../services/api';
import { BackLink } from './PageHeader';

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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmPurchase(null)}
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
                  onClick={() => setConfirmPurchase(null)}
                  className="absolute right-3 top-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="Fenster schließen"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-sm">
                  <Gift className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-extrabold tracking-tight">Gutschein kaufen</h2>
                  <p className="mt-2 text-sm text-white/85">Möchtest du diesen Gutschein wirklich kaufen?</p>
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <p className="text-lg font-semibold text-foreground">{confirmPurchase.description}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{confirmPurchase.partner_name ?? 'Gutschein'}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-sm font-bold text-gold-foreground"><Trophy className="w-3.5 h-3.5 text-gold" />Kosten: {confirmPurchase.points_value} Punkte</p>
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
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/55 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetDialogState}
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
                  onClick={resetDialogState}
                  className="absolute right-3 top-3 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label="Fenster schließen"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-sm">
                  <Gift className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-extrabold tracking-tight">{createdVoucherCode ? 'Gutschein erstellt' : 'Hinweis'}</h2>
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
                        <span className="text-lg font-bold tracking-[0.2em] text-primary font-mono break-all">{createdVoucherCode}</span>
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
                          if (onNavigateToMyVouchers) onNavigateToMyVouchers();
                          else setActiveTab('vouchers');
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

      <div className="max-w-3xl mx-auto px-4 pt-5 pb-12">
        <BackLink onBack={onBack} />

        {/* Segment-Umschalter */}
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1" role="tablist">
          {([
            ['rewards', 'Belohnungen'],
            ['vouchers', 'Meine Gutscheine'],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`h-10 rounded-xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'rewards' ? (
          <>
            <motion.div className="mt-6 mb-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-[28px] leading-[1.15] font-extrabold tracking-tight">Belohnungen</h1>
              <p className="text-muted-foreground mt-1.5">
                {unlockedCount} von {vouchers.length} Gutscheinen freigeschaltet
              </p>

              <div className="brand-gradient relative mt-5 overflow-hidden rounded-[28px] p-6 text-white shadow-lg">
                <div className="topo-texture absolute inset-0" aria-hidden="true" />
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white/75">Deine Punkte</p>
                    <p className="text-5xl font-extrabold tracking-tight tabular-nums mt-1">{totalPoints}</p>
                  </div>
                  <span className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-bright to-gold flex items-center justify-center shadow-lg ring-4 ring-white/15">
                    <Trophy className="w-8 h-8 text-white" />
                  </span>
                </div>
                <p className="relative mt-4 text-sm text-white/80">
                  Sammle mehr Punkte, um weitere Gutscheine freizuschalten!
                </p>
              </div>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-4">
              {vouchers.length === 0 ? (
                <div className="col-span-2 rounded-[24px] border border-dashed border-border-strong p-8 text-center text-muted-foreground">Keine verfügbaren Gutscheine gefunden.</div>
              ) : (
                vouchers.map((voucher, index) => {
                  const unlocked = totalPoints >= voucher.points_value;
                  const progressToUnlock = Math.min((totalPoints / voucher.points_value) * 100, 100);
                  const soldOut = (voucher.quantity ?? -1) === 0;

                  return (
                    <motion.div
                      key={voucher.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + index * 0.08 }}
                    >
                      {/* Gutschein als Ticket */}
                      <article className={`surface-card overflow-hidden ${!unlocked ? 'opacity-70' : ''}`}>
                        <div className="flex items-start gap-4 p-5">
                          <span className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${unlocked ? 'bg-gold-soft text-gold' : 'bg-muted text-muted-foreground'}`}>
                            <Gift className="w-6 h-6" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold leading-snug">{voucher.description}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{voucher.partner_name ?? 'Gutschein'}</p>
                            {voucher.address && (
                              <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="line-clamp-1">{voucher.address}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Perforation */}
                        <div className="relative h-0 border-t-2 border-dashed border-border mx-5" aria-hidden="true">
                          <span className="absolute -left-[30px] -top-[11px] w-5 h-5 rounded-full bg-background border border-border" />
                          <span className="absolute -right-[30px] -top-[11px] w-5 h-5 rounded-full bg-background border border-border" />
                        </div>

                        <div className="p-5 pt-4">
                          {!unlocked && (
                            <div className="mb-4">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                                <span>Fortschritt</span>
                                <span className="tabular-nums font-semibold">{totalPoints} / {voucher.points_value} Punkte</span>
                              </div>
                              <Progress value={progressToUnlock} className="h-2" />
                            </div>
                          )}

                          <Button
                            className={`w-full h-12 rounded-2xl font-bold ${unlocked ? 'bg-primary hover:bg-primary-dark text-white shadow-primary' : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                            disabled={!unlocked || redeemingVoucherId === voucher.id || soldOut}
                            onClick={() => handleRedeemVoucher(voucher)}
                          >
                            {unlocked ? (
                              <>
                                <Gift className="w-4 h-4" />
                                {redeemingVoucherId === voucher.id ? 'Wird erstellt...' : `Gutschein einlösen (${voucher.points_value} Punkte)`}
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4" />
                                {voucher.points_value} Punkte nötig
                              </>
                            )}
                          </Button>
                        </div>
                      </article>
                    </motion.div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="mt-6">
            <VoucherRedeemPage userId={userId || 0} userPoints={totalPoints} onPointsChange={onPointsChange} embedded={true} />
          </div>
        )}
      </div>
    </div>
  );
}
