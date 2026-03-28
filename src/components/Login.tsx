import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ArrowLeft, Mail, Lock, AlertCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';

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

  const validatePassword = (value: string) => {
    if (!value) return t('passwordRequired');
    if (value.length < 6) return t('passwordMinLength');
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

        {/* Login Form - ohne Card-Hintergrund */}
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
              {t('welcomeBack')}
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg text-muted-foreground text-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {t('loginSubtitle')}
            </motion.p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-10 sm:space-y-12">
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
                  onBlur={() => handleBlur('email')}
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

            {/* Password Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <label htmlFor="password" className="block text-base sm:text-lg font-medium mb-4">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground pointer-events-none" style={{ left: '1.25rem' }} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => handleBlur('password')}
                  placeholder="••••••••"
                  className={`pr-16 sm:pr-18 h-14 sm:h-16 text-base sm:text-lg bg-white ${touched.password && errors.password ? 'border-destructive' : ''}`}
                  style={{ paddingLeft: '3.5rem' }}
                  disabled={isLoading}
                  autoComplete="current-password"
                  aria-invalid={touched.password && !!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2"
                  tabIndex={-1}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </button>
              </div>
              <AnimatePresence>
                {touched.password && errors.password && (
                  <motion.div
                    className="flex items-center gap-2 mt-1.5 text-sm sm:text-base text-destructive"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{errors.password}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Forgot Password + Remember Me Row */}
            <motion.div
              className="flex items-center justify-between pt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {/* Remember Me Checkbox */}
              <button
                type="button"
                onClick={() => !isLoading && setRememberMe(v => !v)}
                className="flex items-center gap-2.5 group"
                disabled={isLoading}
                aria-label={t('rememberMe')}
              >
                <span
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    rememberMe ? 'bg-primary border-primary' : 'border-border bg-white group-hover:border-primary/50'
                  }`}
                >
                  {rememberMe && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <span className="text-sm sm:text-base text-muted-foreground select-none">
                  {t('rememberMe')}
                </span>
              </button>

              {/* Forgot Password */}
              <button
                type="button"
                onClick={onNavigateToForgotPassword}
                className="text-sm sm:text-base text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
                disabled={isLoading}
              >
                {t('forgotPassword')}
              </button>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              className="pt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Button
                type="submit"
                className="w-full h-14 sm:h-16 text-lg sm:text-xl font-semibold bg-gradient-to-r from-primary to-primary-light hover:from-primary-dark hover:to-primary shadow-md hover:shadow-lg transition-all"
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <motion.span
                      className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    {t('loggingIn')}
                  </span>
                ) : (
                  t('login')
                )}
              </Button>
            </motion.div>

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
            transition={{ delay: 1 }}
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm sm:text-base uppercase">
              <span className="bg-background px-5 sm:px-6 py-1 text-muted-foreground">{t('or')}</span>
            </div>
          </motion.div>

          {/* Register Link */}
          <motion.div
            className="text-center pt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            <p className="text-base sm:text-lg text-foreground">
              {t('noAccountQuestion')}{' '}
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="text-primary hover:text-primary/80 hover:underline font-semibold transition-colors"
                disabled={isLoading}
              >
                {t('registerNow')}
              </button>
            </p>
          </motion.div>
        </motion.div>

        {/* Info Text */}
        <motion.p
          className="text-center text-sm sm:text-base text-muted-foreground mt-10 sm:mt-12 px-6 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {t('loginTermsPrefix')}{' '}
          <button className="text-primary hover:underline">{t('termsOfUse')}</button>
          {' '}{t('and')}{' '}
          <button className="text-primary hover:underline">{t('privacyPolicy')}</button>
        </motion.p>
      </motion.div>
    </div>
  );
}
