import { useEffect, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import emailjs from '@emailjs/browser';
import { Mail, AlertCircle, CheckCircle, LockKeyhole } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { requestPasswordReset, resetPasswordWithToken } from '../services/auth';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthShell, AuthDivider, FieldLabel } from './AuthShell';

interface ForgotPasswordProps {
  onNavigateBack?: () => void;
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
}

export function ForgotPassword({ onNavigateBack, onNavigateToLogin, onNavigateToRegister }: ForgotPasswordProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRequestSuccess, setIsRequestSuccess] = useState(false);
  const [isPasswordResetSuccess, setIsPasswordResetSuccess] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string; general?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean; confirmPassword?: boolean }>({});

  const emailJsServiceId = (import.meta.env.VITE_EMAILJS_SERVICE_ID || '').trim();
  const emailJsTemplateId = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID_PASSWORD_RESET || '').trim();
  const emailJsPublicKey = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '').trim();
  const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL || 'info@iiius.de').trim();

  const isEmailJsConfigured = !!emailJsServiceId && !!emailJsTemplateId && !!emailJsPublicKey;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = (params.get('token') || '').trim();
    if (token) {
      setResetToken(token);
    }
  }, []);

  const validateEmail = (value: string) => {
    if (!value) return t('emailRequired');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t('invalidEmail');
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Neues Passwort ist erforderlich';
    if (value.length < 8) return 'Passwort muss mindestens 8 Zeichen lang sein';
    return '';
  };

  const validateConfirmPassword = (passValue: string, confirmValue: string) => {
    if (!confirmValue) return 'Bitte Passwort bestätigen';
    if (passValue !== confirmValue) return 'Passwörter stimmen nicht überein';
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

  const handleBlur = () => {
    setTouched({ email: true });
    const error = validateEmail(email);
    setErrors(prev => ({ ...prev, email: error }));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({ email: true });
    const emailError = validateEmail(email);

    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await requestPasswordReset(email);

      if (response.resetToken) {
        if (!isEmailJsConfigured) {
          console.warn('[ForgotPassword] EmailJS ist nicht konfiguriert (VITE_EMAILJS_* fehlen).');
          throw new Error(`Der E-Mail-Versand ist gerade nicht verfügbar. Bitte wende dich an ${supportEmail}.`);
        }

        const resetLink = `${window.location.origin}/forgot-password?token=${encodeURIComponent(response.resetToken)}`;

        await emailjs.send(
          emailJsServiceId,
          emailJsTemplateId,
          {
            to_email: email,
            to_name: email.split('@')[0],
            app_name: 'St.GeoARgen',
            reset_link: resetLink,
            reset_token: response.resetToken,
            support_email: supportEmail,
          },
          {
            publicKey: emailJsPublicKey,
          }
        );
      }

      setIsRequestSuccess(true);
      setErrors({});
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reset-E-Mail konnte nicht versendet werden.';
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({ password: true, confirmPassword: true });
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(password, confirmPassword);

    if (passwordError || confirmPasswordError) {
      setErrors(prev => ({
        ...prev,
        password: passwordError,
        confirmPassword: confirmPasswordError,
      }));
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await resetPasswordWithToken(resetToken, password);
      setIsPasswordResetSuccess(true);
      // Nur den Token-Query-Parameter entfernen, Pfad (inkl. Base-Path) beibehalten
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Passwort konnte nicht zurückgesetzt werden.';
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  const isRequestFormValid = !!email && !errors.email;
  const isResetMode = !!resetToken && !isPasswordResetSuccess;
  const isResetFormValid = !!password && !!confirmPassword && !errors.password && !errors.confirmPassword;

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

  const generalError = (
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
          <span className="font-medium break-words min-w-0">{errors.general}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const spinner = <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />;

  const successState = (title: string, body: ReactNode, action: ReactNode, extra?: ReactNode) => (
    <AuthShell title={title} onBack={onNavigateBack}>
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.span
          className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-soft mb-6"
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 }}
        >
          <CheckCircle className="w-10 h-10 text-primary" />
        </motion.span>
        <p className="text-gray-700 leading-relaxed mb-7">{body}</p>
        {action}
        {extra}
      </motion.div>
    </AuthShell>
  );

  if (isPasswordResetSuccess) {
    return successState(
      'Passwort aktualisiert!',
      'Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt mit dem neuen Passwort anmelden.',
      <Button onClick={onNavigateToLogin} className="w-full h-14 rounded-2xl text-base font-bold shadow-primary">
        {t('loginNow')}
      </Button>,
    );
  }

  if (isRequestSuccess) {
    return successState(
      'Anfrage gesendet!',
      <>Falls ein Konto mit <span className="font-semibold text-foreground break-all">{email}</span> existiert, wurde dir ein Link zum Zurücksetzen gesendet.</>,
      <Button onClick={onNavigateToLogin} className="w-full h-14 rounded-2xl text-base font-bold shadow-primary">
        Zurück zur Anmeldung
      </Button>,
      <p className="text-sm text-muted-foreground mt-6">
        {t('noEmailReceived')}{' '}
        <button
          onClick={() => setIsRequestSuccess(false)}
          className="text-primary hover:text-primary-dark font-semibold transition-colors"
        >
          {t('sendAgain')}
        </button>
      </p>,
    );
  }

  if (isResetMode) {
    return (
      <AuthShell
        title="Neues Passwort setzen"
        subtitle="Vergib jetzt ein neues Passwort für dein Konto."
        onBack={onNavigateBack}
      >
        <form onSubmit={handleResetSubmit} className="space-y-5" noValidate>
          <div>
            <FieldLabel htmlFor="new-password">Neues Passwort</FieldLabel>
            <div className="relative">
              <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => {
                  const value = e.target.value;
                  setPassword(value);
                  if (touched.password) {
                    setErrors(prev => ({ ...prev, password: validatePassword(value) }));
                  }
                  if (touched.confirmPassword) {
                    setErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(value, confirmPassword) }));
                  }
                }}
                onBlur={() => {
                  setTouched(prev => ({ ...prev, password: true }));
                  setErrors(prev => ({ ...prev, password: validatePassword(password) }));
                }}
                className={`h-14 pl-12 rounded-2xl ${touched.password && errors.password ? 'border-destructive' : ''}`}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
            {fieldError(touched.password ? errors.password : undefined)}
          </div>

          <div>
            <FieldLabel htmlFor="confirm-password">Passwort bestätigen</FieldLabel>
            <div className="relative">
              <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  const value = e.target.value;
                  setConfirmPassword(value);
                  if (touched.confirmPassword) {
                    setErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(password, value) }));
                  }
                }}
                onBlur={() => {
                  setTouched(prev => ({ ...prev, confirmPassword: true }));
                  setErrors(prev => ({ ...prev, confirmPassword: validateConfirmPassword(password, confirmPassword) }));
                }}
                className={`h-14 pl-12 rounded-2xl ${touched.confirmPassword && errors.confirmPassword ? 'border-destructive' : ''}`}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>
            {fieldError(touched.confirmPassword ? errors.confirmPassword : undefined)}
          </div>

          {generalError}

          <Button
            type="submit"
            className="w-full h-14 rounded-2xl text-base font-bold shadow-primary disabled:shadow-none"
            disabled={isLoading || !isResetFormValid}
          >
            {isLoading ? <span className="flex items-center gap-3">{spinner}Speichert...</span> : 'Passwort aktualisieren'}
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('forgotPassword')}
      subtitle={t('forgotPasswordSubtitle')}
      onBack={onNavigateBack}
      footer={
        onNavigateToRegister ? (
          <p className="text-center text-sm text-muted-foreground leading-relaxed px-4">
            {t('forgotPasswordAccountHint')}{' '}
            <button
              type="button"
              onClick={onNavigateToRegister}
              className="text-primary hover:text-primary-dark font-semibold"
              disabled={isLoading}
            >
              {t('registerHere')}
            </button>
          </p>
        ) : null
      }
    >
      <form onSubmit={handleSubmitRequest} className="space-y-5" noValidate>
        <div>
          <FieldLabel htmlFor="email">{t('emailAddress')}</FieldLabel>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              onBlur={handleBlur}
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

        {import.meta.env.DEV && !isEmailJsConfigured && (
          <div className="flex items-start gap-3 p-4 bg-gold-soft border border-gold/30 rounded-2xl text-xs text-gold-foreground">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="break-words min-w-0">
              Dev-Hinweis: EmailJS ist nicht konfiguriert (VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID_PASSWORD_RESET, VITE_EMAILJS_PUBLIC_KEY).
            </span>
          </div>
        )}

        {generalError}

        <Button
          type="submit"
          className="w-full h-14 rounded-2xl text-base font-bold shadow-primary disabled:shadow-none"
          disabled={isLoading || !isRequestFormValid}
        >
          {isLoading ? <span className="flex items-center gap-3">{spinner}{t('sending')}</span> : t('sendResetLink')}
        </Button>
      </form>

      <AuthDivider label={t('or')} />

      <button
        type="button"
        onClick={onNavigateToLogin}
        disabled={isLoading}
        className="w-full h-14 rounded-2xl border-2 border-primary/20 bg-card hover:border-primary transition-colors pressable"
      >
        <span className="text-sm text-muted-foreground">{t('rememberedPassword')}</span>{' '}
        <span className="text-sm font-bold text-primary">{t('loginNow')}</span>
      </button>
    </AuthShell>
  );
}
