import { useState } from 'react';
import { Gift, Lock, Check, MapPin, ArrowLeft, Trophy, Copy, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface Voucher {
  id: string;
  title: string;
  description: string;
  type: string;
  address: string;
  requiredPoints: number;
  imageUrl: string;
}

interface RewardsViewProps {
  totalPoints: number;
  userId?: number;
  onBack: () => void;
  onPointsChange?: () => Promise<void> | void;
  onNavigateToMyVouchers?: () => void;
}

const vouchers: Voucher[] = [
  {
    id: 'voucher1',
    title: 'Café Schwarzwald',
    description: '10% Rabatt auf alle Speisen und Getränke',
    type: 'Café & Restaurant',
    address: 'Hauptstraße 12, St.Georgen',
    requiredPoints: 50,
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWZlJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzMyMzI2NDAwfDA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: 'voucher2',
    title: 'Stadtmuseum St.Georgen',
    description: 'Freier Eintritt für eine Person',
    type: 'Museum & Kultur',
    address: 'Kulturplatz 5, St.Georgen',
    requiredPoints: 100,
    imageUrl: 'https://images.unsplash.com/photo-1594313146532-47f990c143f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBidWlsZGluZ3xlbnwxfHx8fDE3NjIzNTMwMjV8MA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: 'voucher3',
    title: 'Schwarzwald Souvenirs',
    description: '15% Rabatt auf alle Artikel',
    type: 'Souvenirshop',
    address: 'Marktstraße 23, St.Georgen',
    requiredPoints: 150,
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaG9wJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzMyMzI2NDAwfDA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: 'voucher4',
    title: 'Restaurant Zum Drachen',
    description: 'Gratis Dessert bei Hauptgericht',
    type: 'Restaurant',
    address: 'Drachengasse 8, St.Georgen',
    requiredPoints: 180,
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwaW50ZXJpb3J8ZW58MXx8fHwxNzMyMzI2NDAwfDA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: 'voucher5',
    title: 'Schwarzwald-Bäckerei',
    description: '2 Kaffee zum Preis von 1',
    type: 'Bäckerei & Café',
    address: 'Bäckerstraße 15, St.Georgen',
    requiredPoints: 200,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWtlcnklMjBzaG9wfGVufDF8fHx8MTczMjMyNjQwMHww&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: 'voucher6',
    title: 'Wellness Schwarzwald',
    description: '20% auf alle Wellness-Angebote',
    type: 'Wellness & Spa',
    address: 'Kurstraße 42, St.Georgen',
    requiredPoints: 225,
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGElMjB3ZWxsbmVzc3xlbnwxfHx8fDE3MzIzMjY0MDB8MA&ixlib=rb-4.1.0&q=80&w=400',
  },
];

export function RewardsView({ totalPoints, userId, onBack, onPointsChange, onNavigateToMyVouchers }: RewardsViewProps) {
  const [redeemingVoucherId, setRedeemingVoucherId] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [createdVoucherCode, setCreatedVoucherCode] = useState<string | null>(null);
  const [createdVoucherTitle, setCreatedVoucherTitle] = useState<string | null>(null);
  const [createdVoucherDescription, setCreatedVoucherDescription] = useState<string | null>(null);
  const [dialogMessage, setDialogMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const isVoucherUnlocked = (requiredPoints: number) => totalPoints >= requiredPoints;
  const unlockedCount = vouchers.filter(v => isVoucherUnlocked(v.requiredPoints)).length;

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

  const handleRedeemVoucher = async (voucher: Voucher) => {
    if (!userId) {
      setDialogMessage('Bitte melde dich an, um einen Gutschein einzulösen.');
      setFeedbackOpen(true);
      return;
    }

    setRedeemingVoucherId(voucher.id);

    try {
      const response = await fetch('/api/redeem_voucher_from_shop.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          reward_voucher: {
            id: voucher.id,
            title: voucher.title,
            description: voucher.description,
            type: voucher.type,
            address: voucher.address,
            required_points: voucher.requiredPoints,
          },
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Gutschein konnte nicht erstellt werden.');
      }

      await onPointsChange?.();
      setCreatedVoucherTitle(voucher.title);
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
                  <h2 className="text-2xl font-semibold">
                    {createdVoucherCode ? 'Gutschein erstellt' : 'Hinweis'}
                  </h2>
                  <p className="mt-2 text-sm text-white/85">
                    {createdVoucherCode
                      ? 'Dein Gutschein ist jetzt unter Meine Gutscheine verfügbar.'
                      : dialogMessage}
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

      {/* Sticky Back Button Header */}
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

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
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

          {/* Points Overview */}
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

        {/* Vouchers Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {vouchers.map((voucher, index) => {
            const unlocked = isVoucherUnlocked(voucher.requiredPoints);
            const progressToUnlock = Math.min((totalPoints / voucher.requiredPoints) * 100, 100);

            return (
              <motion.div
                key={voucher.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`overflow-hidden ${!unlocked && 'opacity-60'}`}>
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={voucher.imageUrl}
                      alt={voucher.title}
                      className={`w-full h-full object-cover ${!unlocked && 'grayscale'}`}
                    />
                    {unlocked ? (
                      <div className="absolute top-4 right-4 bg-primary text-white rounded-full p-2">
                        <Check className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2">
                        <Lock className="w-5 h-5" />
                      </div>
                    )}
                    
                    {/* Overlay for locked vouchers */}
                    {!unlocked && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="text-center text-white">
                          <Lock className="w-8 h-8 mx-auto mb-2" />
                          <p className="font-semibold">
                            {voucher.requiredPoints - totalPoints} Punkte fehlen
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{voucher.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{voucher.type}</p>
                      </div>
                    </div>

                    <p className="text-primary font-semibold mb-3">
                      {voucher.description}
                    </p>

                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="line-clamp-1">{voucher.address}</span>
                    </div>

                    {/* Progress to unlock */}
                    {!unlocked && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>Fortschritt</span>
                          <span>{totalPoints} / {voucher.requiredPoints} Punkte</span>
                        </div>
                        <Progress value={progressToUnlock} className="h-2" />
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      className={`w-full ${
                        unlocked
                          ? 'bg-primary hover:bg-primary-dark text-white'
                          : 'bg-muted text-muted-foreground cursor-not-allowed'
                      }`}
                      disabled={!unlocked || redeemingVoucherId === voucher.id}
                      onClick={() => handleRedeemVoucher(voucher)}
                    >
                      {unlocked ? (
                        <>
                          <Gift className="w-4 h-4 mr-2" />
                          {redeemingVoucherId === voucher.id ? 'Wird erstellt...' : 'Gutschein einlösen' + ` (${voucher.requiredPoints} Punkte)`}
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          {voucher.requiredPoints} Punkte nötig
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Help Text */}
        <motion.div
          className="mt-8 text-center text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p>
            Tipp: Besuche mehr Stationen und beantworte Quiz-Fragen richtig, um Punkte zu sammeln!
          </p>
        </motion.div>
      </div>
    </div>
  );
}