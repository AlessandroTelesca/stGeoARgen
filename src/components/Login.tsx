import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, Check } from 'lucide-react';
import { IconSwap } from './ui/icon-swap';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthShell, AuthDivider, FieldLabel } from './AuthShell';

interface LoginProps {
  /** Wird nach erfolgreichem Login aufgerufen. Wirft einen Error bei Fehlschlag. */
  onLogin: (email: string, password: string) => Promise<void>;
  onNavigateBack?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToForgotPassword?: () => void;
}

export function Login({ onLogin, onNavigateBack, onNavigateToRegister, onNavigateToForgotPassword }: LoginProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState(() =>
    localStorage.getItem('remember-me') === 'true' ? (localStorage.getItem('remember-email') || '') : ''
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('remember-me') === 'true');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>(
    () => localStorage.getItem('remember-me') === 'true' ? { email: false, password: false } : {}
  );

  // Real-time validation
  const validateEmail = (value: string) => {
    if (!value) return t('emailRequired');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t('invalidEmail');
    return '';
  };

  // Beim Login keine Mindestlänge prüfen – ob das Passwort stimmt, entscheidet der Server
  const validatePassword = (value: string) => {
    if (!value) return t('passwordRequired');
    return '';
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (touched.email) {
      const error = validateEmail(value);
      setErrors(prev => ({ ...prev, email: error }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (touched.password) {
      const error = validatePassword(value);
      setErrors(prev => ({ ...prev, password: error }));
    }
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'email') {
      const error = validateEmail(email);
      setErrors(prev => ({ ...prev, email: error }));
    } else {
      const error = validatePassword(password);
      setErrors(prev => ({ ...prev, password: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ email: true, password: true });

    // Validate all fields
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError });
      return;
    }

    // Clear errors and start loading
    setErrors({});
    setIsLoading(true);

    try {
      await onLogin(email, password);
      if (rememberMe) {
        localStorage.setItem('remember-me', 'true');
        localStorage.setItem('remember-email', email);
      } else {
        localStorage.removeItem('remember-me');
        localStorage.removeItem('remember-email');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('loginFailed');
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = email && password && !errors.email && !errors.password;

  const fieldError = (msg?: string) => (
    <AnimatePresence>
      {msg && (
        <motion.p
          className="flex items-center gap-1.5 mt-2 text-sm font-medium text-destructive"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          role="alert"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{msg}</span>
        </motion.p>
      )}
    </AnimatePresence>
  );

  return (
    <AuthShell
      title={t('welcomeBack')}
      subtitle={t('loginSubtitle')}
      onBack={onNavigateBack}
      footer={
        <p className="text-center text-xs text-muted-foreground leading-relaxed px-4">
          {t('loginTermsPrefix')} {t('termsOfUse')} {t('and')} {t('privacyPolicy')}.
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <FieldLabel htmlFor="email">{t('emailAddress')}</FieldLabel>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={() => handleBlur('email')}
              placeholder={t('emailPlaceholder')}
              className={`h-14 pl-12 pr-4 rounded-2xl ${touched.email && errors.email ? 'border-destructive' : ''}`}
              disabled={isLoading}
              autoComplete="email"
              inputMode="email"
              aria-invalid={touched.email && !!errors.email}
            />
          </div>
          {fieldError(touched.email ? errors.email : undefined)}
        </div>

        <div>
          <FieldLabel htmlFor="password">{t('password')}</FieldLabel>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={handlePasswordChange}
              onBlur={() => handleBlur('password')}
              placeholder="••••••••"
              className={`h-14 pl-12 pr-14 rounded-2xl ${touched.password && errors.password ? 'border-destructive' : ''}`}
              disabled={isLoading}
              autoComplete="current-password"
              aria-invalid={touched.password && !!errors.password}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
            >
              <IconSwap swapKey={showPassword ? 'hide' : 'show'}>
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </IconSwap>
            </button>
          </div>
          {fieldError(touched.password ? errors.password : undefined)}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={rememberMe}
            onClick={() => !isLoading && setRememberMe(v => !v)}
            className="flex items-center gap-2.5 py-1 group"
            disabled={isLoading}
          >
            <span
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${rememberMe ? 'bg-primary border-primary' : 'border-border-strong bg-card group-hover:border-primary/60'}`}
            >
              {rememberMe && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />}
            </span>
            <span className="text-sm text-gray-700 select-none">{t('rememberMe')}</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToForgotPassword}
            className="text-sm text-primary hover:text-primary-dark font-semibold transition-colors py-1"
            disabled={isLoading}
          >
            {t('forgotPassword')}
          </button>
        </div>

        <AnimatePresence>
          {errors.general && (
            <motion.div
              className="flex items-start gap-3 p-4 bg-destructive/8 border border-destructive/20 rounded-2xl text-sm text-destructive"
              initial={{ opacity: 0, y: -6 }}
              // Fehlermeldung schüttelt kurz den Kopf
              animate={{ opacity: 1, y: 0, x: [0, -6, 5, -3, 2, 0] }}
              transition={{ duration: 0.22, x: { duration: 0.38, delay: 0.05 } }}
              exit={{ opacity: 0, y: -6 }}
              role="alert"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">{errors.general}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          type="submit"
          className="w-full h-14 rounded-2xl text-base font-bold shadow-primary disabled:shadow-none"
          disabled={isLoading || !isFormValid}
        >
          {isLoading ? (
            <span className="flex items-center gap-3">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {t('loggingIn')}
            </span>
          ) : (
            t('login')
          )}
        </Button>
      </form>

      <AuthDivider label={t('or')} />

      <button
        type="button"
        onClick={onNavigateToRegister}
        disabled={isLoading}
        className="w-full h-14 rounded-2xl border-2 border-primary/20 bg-card text-foreground hover:border-primary transition-colors pressable"
      >
        <span className="text-sm text-muted-foreground">{t('noAccountQuestion')}</span>{' '}
        <span className="text-sm font-bold text-primary">{t('registerNow')}</span>
      </button>
    </AuthShell>
  );
}
