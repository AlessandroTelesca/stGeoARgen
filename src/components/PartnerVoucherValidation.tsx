import { useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, User, Lock, Ticket } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { apiValidatePartnerVoucher } from '../services/api';
import { AuthShell, FieldLabel } from './AuthShell';
import { useLanguage } from '../contexts/LanguageContext';

type Status = { type: 'success' | 'error'; text: string } | null;

export function PartnerVoucherValidation() {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>(null);
  const [loading, setLoading] = useState(false);

  const validateVoucher = async (event?: FormEvent) => {
    event?.preventDefault();
    if (loading || !username || !password || !code) return;
    setLoading(true);
    setStatus(null);
    try {
      const data = await apiValidatePartnerVoucher(username, password, code.trim().toUpperCase());
      setStatus({ type: 'success', text: data.message });
    } catch (error) {
      // apiFetch wirft bei success:false mit der Server-Meldung (z. B. „Code ungültig“)
      setStatus({ type: 'error', text: error instanceof Error ? error.message : t('partnerServerError') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title={t('partnerTitle')} subtitle={t('partnerSubtitle')}>
      <form onSubmit={validateVoucher} className="space-y-5" noValidate>
        <div>
          <FieldLabel htmlFor="partner-user">{t('partnerUsername')}</FieldLabel>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              id="partner-user"
              className="h-14 pl-12 rounded-2xl"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="partner-password">{t('partnerPassword')}</FieldLabel>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              id="partner-password"
              type="password"
              className="h-14 pl-12 rounded-2xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="partner-code">{t('partnerCodeLabel')}</FieldLabel>
          <div className="relative">
            <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              id="partner-code"
              className="h-14 pl-12 rounded-2xl uppercase font-mono font-semibold tracking-[0.18em] placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:tracking-normal"
              placeholder={t('partnerCodePlaceholder')}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {status && (
            <motion.div
              key={status.text}
              role="status"
              className={`flex items-start gap-3 p-4 rounded-2xl text-sm font-medium ${status.type === 'success'
                ? 'bg-primary-soft text-primary-dark'
                : 'bg-destructive/8 border border-destructive/20 text-destructive'
                }`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {status.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
              <span>{status.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          disabled={loading || !username || !password || !code}
          className="w-full h-14 rounded-2xl text-base font-bold shadow-primary disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center gap-3">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('partnerChecking')}
            </span>
          ) : t('partnerValidate')}
        </Button>
      </form>

      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-secondary p-4 text-sm text-gray-700">
        <Info className="w-5 h-5 text-primary flex-shrink-0" />
        <p className="leading-relaxed">
          {t('partnerNote')}
        </p>
      </div>
    </AuthShell>
  );
}
