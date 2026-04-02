import { Gift, Lock, Check, MapPin, ArrowLeft, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { useLanguage } from '../contexts/LanguageContext';

interface Voucher {
  id: string;
  titleKey: string;
  descriptionKey: string;
  typeKey: string;
  addressKey: string;
  requiredPoints: number;
  imageUrl: string;
}

interface RewardsViewProps {
  totalPoints: number;
  onBack: () => void;
}

const vouchers: Voucher[] = [
  {
    id: 'voucher1',
    titleKey: 'rewardVoucher1Title',
    descriptionKey: 'rewardVoucher1Description',
    typeKey: 'rewardVoucher1Type',
    addressKey: 'rewardVoucher1Address',
    requiredPoints: 50,
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWZlJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzMyMzI2NDAwfDA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: 'voucher2',
    titleKey: 'rewardVoucher2Title',
    descriptionKey: 'rewardVoucher2Description',
    typeKey: 'rewardVoucher2Type',
    addressKey: 'rewardVoucher2Address',
    requiredPoints: 100,
    imageUrl: 'https://images.unsplash.com/photo-1594313146532-47f990c143f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBidWlsZGluZ3xlbnwxfHx8fDE3NjIzNTMwMjV8MA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: 'voucher3',
    titleKey: 'rewardVoucher3Title',
    descriptionKey: 'rewardVoucher3Description',
    typeKey: 'rewardVoucher3Type',
    addressKey: 'rewardVoucher3Address',
    requiredPoints: 150,
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzaG9wJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzMyMzI2NDAwfDA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: 'voucher4',
    titleKey: 'rewardVoucher4Title',
    descriptionKey: 'rewardVoucher4Description',
    typeKey: 'rewardVoucher4Type',
    addressKey: 'rewardVoucher4Address',
    requiredPoints: 180,
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwaW50ZXJpb3J8ZW58MXx8fHwxNzMyMzI2NDAwfDA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: 'voucher5',
    titleKey: 'rewardVoucher5Title',
    descriptionKey: 'rewardVoucher5Description',
    typeKey: 'rewardVoucher5Type',
    addressKey: 'rewardVoucher5Address',
    requiredPoints: 200,
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYWtlcnklMjBzaG9wfGVufDF8fHx8MTczMjMyNjQwMHww&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: 'voucher6',
    titleKey: 'rewardVoucher6Title',
    descriptionKey: 'rewardVoucher6Description',
    typeKey: 'rewardVoucher6Type',
    addressKey: 'rewardVoucher6Address',
    requiredPoints: 225,
    imageUrl: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGElMjB3ZWxsbmVzc3xlbnwxfHx8fDE3MzIzMjY0MDB8MA&ixlib=rb-4.1.0&q=80&w=400',
  },
];

export function RewardsView({ totalPoints, onBack }: RewardsViewProps) {
  const { t } = useLanguage();
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
            <span className="font-medium">{t('back')}</span>
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
              <h1 className="text-2xl font-bold">{t('rewardsTitle')}</h1>
              <p className="text-muted-foreground">
                {t('unlockedVouchers').replace('{unlockedCount}', String(unlockedCount)).replace('{totalCount}', String(vouchers.length))}
              </p>
            </div>
          </div>

          {/* Points Overview */}
          <Card className="p-6 bg-gradient-to-br from-primary to-primary-light text-white border-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-white/80 text-sm mb-1">{t('yourPoints')}</div>
                <p className="text-3xl font-bold">{totalPoints}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Trophy className="w-8 h-8" />
              </div>
            </div>
            <div className="text-sm text-white/80">
              {t('collectMorePoints')}
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
                      alt={t(voucher.titleKey)}
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
                            {t('pointsMissing').replace('{count}', String(voucher.requiredPoints - totalPoints))}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{t(voucher.titleKey)}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{t(voucher.typeKey)}</p>
                      </div>
                    </div>

                    <p className="text-primary font-semibold mb-3">
                      {t(voucher.descriptionKey)}
                    </p>

                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="line-clamp-1">{t(voucher.addressKey)}</span>
                    </div>

                    {/* Progress to unlock */}
                    {!unlocked && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>{t('progressLabel')}</span>
                          <span>{totalPoints} / {voucher.requiredPoints} {t('points')}</span>
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
                          {t('redeemVoucher')}
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          {t('pointsNeeded').replace('{count}', String(voucher.requiredPoints))}
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
            {t('rewardsTip')}
          </p>
        </motion.div>
      </div>
    </div>
  );
}