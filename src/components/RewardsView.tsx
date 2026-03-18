import { Gift, Lock, Check, MapPin, ArrowLeft, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { useTranslation } from 'react-i18next';

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
  onBack: () => void;
}

export function RewardsView({ totalPoints, onBack }: RewardsViewProps) {
  const { t } = useTranslation();

  const getVouchers = () => [
    {
      id: 'voucher1',
      title: t('rewards.voucher1.title'),
      description: t('rewards.voucher1.description'),
      type: t('rewards.voucher1.type'),
      address: t('rewards.voucher1.address'),
      requiredPoints: 50,
      imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWZlJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzMyMzI2NDAwfDA&ixlib=rb-4.1.0&q=80&w=400',
    },
    {
      id: 'voucher2',
      title: t('rewards.voucher2.title'),
      description: t('rewards.voucher2.description'),
      type: t('rewards.voucher2.type'),
      address: t('rewards.voucher2.address'),
      requiredPoints: 100,
      imageUrl: 'https://images.unsplash.com/photo-1594313146532-47f990c143f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBidWlsZGluZ3xlbnwxfHx8fDE3NjIzNTMwMjV8MA&ixlib=rb-4.1.0&q=80&w=400',
    },
    {
      id: 'voucher3',
      title: t('rewards.voucher3.title'),
      description: t('rewards.voucher3.description'),
      type: t('rewards.voucher3.type'),
      address: t('rewards.voucher3.address'),
      requiredPoints: 150,
      imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaG9wJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzMyMzI2NDAwfDA&ixlib=rb-4.1.0&q=80&w=400',
    },
    {
      id: 'voucher4',
      title: t('rewards.voucher4.title'),
      description: t('rewards.voucher4.description'),
      type: t('rewards.voucher4.type'),
      address: t('rewards.voucher4.address'),
      requiredPoints: 180,
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwaW50ZXJpb3J8ZW58MXx8fHwxNzMyMzI2NDAwfDA&ixlib=rb-4.1.0&q=80&w=400',
    },
    {
      id: 'voucher5',
      title: t('rewards.voucher5.title'),
      description: t('rewards.voucher5.description'),
      type: t('rewards.voucher5.type'),
      address: t('rewards.voucher5.address'),
      requiredPoints: 200,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWtlcnklMjBzaG9wfGVufDF8fHx8MTczMjMyNjQwMHww&ixlib=rb-4.1.0&q=80&w=400',
    },
    {
      id: 'voucher6',
      title: t('rewards.voucher6.title'),
      description: t('rewards.voucher6.description'),
      type: t('rewards.voucher6.type'),
      address: t('rewards.voucher6.address'),
      requiredPoints: 225,
      imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGElMjB3ZWxsbmVzc3xlbnwxfHx8fDE3MzIzMjY0MDB8MA&ixlib=rb-4.1.0&q=80&w=400',
    },
  ];

  const vouchers = getVouchers();
  const isVoucherUnlocked = (requiredPoints: number) => totalPoints >= requiredPoints;
  const unlockedCount = vouchers.filter(v => isVoucherUnlocked(v.requiredPoints)).length;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Sticky Back Button Header */}
      <div className="sticky top-16 bg-background/80 backdrop-blur-sm z-20 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">{t('common.back')}</span>
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
              <h1 className="text-2xl font-bold">{t('rewardsView.title')}</h1>
              <p className="text-muted-foreground">
                {unlockedCount} {t('rewardsView.ofVouchersUnlocked', { total: vouchers.length })}
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
                      disabled={!unlocked}
                    >
                      {unlocked ? (
                        <>
                          <Gift className="w-4 h-4 mr-2" />
                          Gutschein einlösen
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