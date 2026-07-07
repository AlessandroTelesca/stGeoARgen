import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import emailjs from '@emailjs/browser';
import { ArrowLeft, Mail, AlertCircle, CheckCircle, LockKeyhole } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { requestPasswordReset, resetPasswordWithToken } from '../services/auth';
import { useLanguage } from '../contexts/LanguageContext';

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
  const supportEmail = (import.meta.env.VITE_SUPPORT_EMAIL || 'support@stgeoargen.de').trim();

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
          throw new Error('EmailJS ist noch nicht konfiguriert. Bitte VITE_EMAILJS_* Variablen setzen.');
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

  if (isPasswordResetSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-light/10 flex items-center justify-center px-6 sm:px-8 py-12 sm:py-16">
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {/* Success Icon */}
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-green-100 rounded-full mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              <CheckCircle className="w-12 h-12 sm:w-14 sm:h-14 text-green-600" />
            </motion.div>

            {/* Success Message */}
            <motion.h1
              className="text-3xl sm:text-4xl font-bold mb-4 text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Passwort aktualisiert!
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg text-muted-foreground mb-8 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Dein Passwort wurde erfolgreich geändert. Du kannst dich jetzt mit dem neuen Passwort anmelden.
            </motion.p>

            {/* Logo */}
            <motion.div
              className="flex justify-center mb-8"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
            >
              <div style={{ width: '64px', height: '64px', backgroundColor: '#0C690F', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(12,105,15,0.2)' }}>
                <img src="/Logo.svg" alt="St.GeoARgen" style={{ width: '38px', height: '38px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
              </div>
            </motion.div>

            {/* Back to Login Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                onClick={onNavigateToLogin}
                className="w-full h-14 sm:h-16 text-lg sm:text-xl font-semibold bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary shadow-md hover:shadow-lg transition-all"
              >
                {t('backToLogin')}
              </Button>
            </motion.div>

            {/* Help Text */}
            <motion.p
              className="text-sm sm:text-base text-muted-foreground mt-8 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Aus Sicherheitsgründen ist der Link nur einmal nutzbar.
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (isRequestSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-light/10 flex items-center justify-center px-6 sm:px-8 py-12 sm:py-16">
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 bg-green-100 rounded-full mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              <CheckCircle className="w-12 h-12 sm:w-14 sm:h-14 text-green-600" />
            </motion.div>

            <motion.h1
              className="text-3xl sm:text-4xl font-bold mb-4 text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Anfrage gesendet!
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg text-muted-foreground mb-8 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Falls ein Konto mit <span className="font-medium text-foreground">{email}</span> existiert,
              wurde dir ein Link zum Zurücksetzen gesendet.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                onClick={onNavigateToLogin}
                className="w-full h-14 sm:h-16 text-lg sm:text-xl font-semibold bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary shadow-md hover:shadow-lg transition-all"
              >
                Zurück zur Anmeldung
              </Button>
            </motion.div>

            <motion.p
              className="text-sm sm:text-base text-muted-foreground mt-8 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {t('noEmailReceived')}{' '}
              <button
                onClick={() => setIsRequestSuccess(false)}
                className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
              >
                {t('sendAgain')}
              </button>
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  if (isResetMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-light/10 flex items-center justify-center px-6 sm:px-8 py-12 sm:py-16">
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {onNavigateBack && (
            <motion.button
              onClick={onNavigateBack}
              className="mb-10 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-base font-medium">Zurück</span>
            </motion.button>
          )}

          <motion.div className="p-0" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <div className="flex flex-col items-center mb-12">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                style={{
                  width: '88px',
                  height: '88px',
                  backgroundColor: '#0C690F',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(12,105,15,0.25)',
                }}
              >
                <LockKeyhole className="w-10 h-10 text-white" />
              </motion.div>
              <motion.h1 className="text-3xl sm:text-4xl font-bold mt-6 mb-3 text-center text-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                Neues Passwort setzen
              </motion.h1>
              <motion.p className="text-base sm:text-lg text-muted-foreground text-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                Vergib jetzt ein neues Passwort für dein Konto.
              </motion.p>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-6 sm:space-y-7">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                <label htmlFor="new-password" className="block text-base sm:text-lg font-medium mb-3">Neues Passwort</label>
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
                  className={`h-12 sm:h-14 text-base sm:text-lg bg-white ${touched.password && errors.password ? 'border-destructive' : ''}`}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <AnimatePresence>
                  {touched.password && errors.password && (
                    <motion.div className="flex items-center gap-2 mt-1.5 text-sm sm:text-base text-destructive" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>{errors.password}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
                <label htmlFor="confirm-password" className="block text-base sm:text-lg font-medium mb-3">Passwort bestätigen</label>
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
                  className={`h-12 sm:h-14 text-base sm:text-lg bg-white ${touched.confirmPassword && errors.confirmPassword ? 'border-destructive' : ''}`}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <AnimatePresence>
                  {touched.confirmPassword && errors.confirmPassword && (
                    <motion.div className="flex items-center gap-2 mt-1.5 text-sm sm:text-base text-destructive" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span>{errors.confirmPassword}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.div className="pt-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
                <Button
                  type="submit"
                  className="w-full h-14 sm:h-16 text-lg sm:text-xl font-semibold bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary shadow-md hover:shadow-lg transition-all"
                  disabled={isLoading || !isResetFormValid}
                >
                  {isLoading ? 'Speichert...' : 'Passwort aktualisieren'}
                </Button>
              </motion.div>

              <AnimatePresence>
                {errors.general && (
                  <motion.div className="flex items-center gap-3 p-4 sm:p-5 bg-destructive/10 border border-destructive/20 rounded-lg text-base sm:text-lg text-destructive" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                    <span>{errors.general}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary-light/10 flex items-center justify-center px-6 sm:px-8 py-12 sm:py-16">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Back Button */}
        {onNavigateBack && (
          <motion.button
            onClick={onNavigateBack}
            className="mb-10 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-base font-medium">{t('back')}</span>
          </motion.button>
        )}

        {/* Forgot Password Form */}
        <motion.div
          className="p-0"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Header with Logo */}
          <div className="flex flex-col items-center mb-16" style={{ marginBottom: '5rem' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              style={{
                width: '88px',
                height: '88px',
                backgroundColor: '#0C690F',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(12,105,15,0.25)',
              }}
            >
              <img src="/Logo.svg" alt="St.GeoARgen" style={{ width: '52px', height: '52px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            </motion.div>
            <motion.h1
              className="text-3xl sm:text-4xl font-bold mt-6 mb-3 text-center text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {t('forgotPassword')}
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg text-muted-foreground text-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {t('forgotPasswordSubtitle')}
            </motion.p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmitRequest} className="space-y-10 sm:space-y-12">
            {/* Email Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <label htmlFor="email" className="block text-base sm:text-lg font-medium mb-4">
                {t('emailAddress')}
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground pointer-events-none" style={{ left: '1.25rem' }} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleBlur}
                  placeholder={t('emailPlaceholder')}
                  className={`pr-4 h-14 sm:h-16 text-base sm:text-lg bg-white ${touched.email && errors.email ? 'border-destructive' : ''}`}
                  style={{ paddingLeft: '3.5rem' }}
                  disabled={isLoading}
                  autoComplete="email"
                  aria-invalid={touched.email && !!errors.email}
                />
              </div>
              <AnimatePresence>
                {touched.email && errors.email && (
                  <motion.div
                    className="flex items-center gap-2 mt-1.5 text-sm sm:text-base text-destructive"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{errors.email}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              className="pt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button
                type="submit"
                className="w-full h-14 sm:h-16 text-lg sm:text-xl font-semibold bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary shadow-md hover:shadow-lg transition-all"
                disabled={isLoading || !isRequestFormValid}
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <motion.span
                      className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    {t('sending')}
                  </span>
                ) : (
                  t('sendResetLink')
                )}
              </Button>
            </motion.div>

            {!isEmailJsConfigured && (
              <motion.div
                className="flex items-center gap-3 p-4 sm:p-5 bg-amber-100/80 border border-amber-300 rounded-lg text-sm sm:text-base text-amber-800"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span>
                  EmailJS ist noch nicht konfiguriert. Setze `VITE_EMAILJS_SERVICE_ID`,
                  `VITE_EMAILJS_TEMPLATE_ID_PASSWORD_RESET` und `VITE_EMAILJS_PUBLIC_KEY`.
                </span>
              </motion.div>
            )}

            {/* General Error */}
            <AnimatePresence>
              {errors.general && (
                <motion.div
                  className="flex items-center gap-3 p-4 sm:p-5 bg-destructive/10 border border-destructive/20 rounded-lg text-base sm:text-lg text-destructive"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <span>{errors.general}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Divider */}
          <motion.div
            className="relative my-14 sm:my-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm sm:text-base uppercase">
              <span className="bg-background px-5 sm:px-6 py-1 text-muted-foreground">{t('or')}</span>
            </div>
          </motion.div>

          {/* Login Link */}
          <motion.div
            className="text-center pt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <p className="text-base sm:text-lg text-foreground">
              {t('rememberedPassword')}{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-primary hover:text-primary/80 hover:underline font-semibold transition-colors"
                disabled={isLoading}
              >
                {t('loginNow')}
              </button>
            </p>
          </motion.div>
        </motion.div>

        {/* Info Text */}
        <motion.p
          className="text-center text-sm sm:text-base text-muted-foreground mt-10 sm:mt-12 px-6 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
        >
          {t('forgotPasswordAccountHint')}{' '}
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="text-primary hover:underline"
            disabled={isLoading}
          >
            {t('registerHere')}
          </button>
        </motion.p>
      </motion.div>
    </div>
  );
}