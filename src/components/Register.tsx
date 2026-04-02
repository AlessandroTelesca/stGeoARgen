import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';

interface RegisterProps {
  /** Wird nach erfolgreicher Registrierung aufgerufen. Wirft einen Error bei Fehlschlag. */
  onRegister: (username: string, email: string, password: string) => Promise<void>;
  onNavigateBack?: () => void;
  onNavigateToLogin?: () => void;
}

export function Register({ onRegister, onNavigateBack, onNavigateToLogin }: RegisterProps) {
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string
  }>({});
  const [touched, setTouched] = useState<{
    username?: boolean;
    email?: boolean;
    password?: boolean;
    confirmPassword?: boolean;
  }>({});

  // Validation
  const validateUsername = (value: string) => {
    if (!value) return t('usernameRequired');
    if (value.length < 3) return t('usernameMinLength');
    return '';
  };

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

  const validateConfirmPassword = (value: string) => {
    if (!value) return t('confirmPasswordRequired');
    if (value !== password) return t('passwordsDoNotMatch');
    return '';
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (touched.username) {
      const error = validateUsername(value);
      setErrors(prev => ({ ...prev, username: error }));
    }
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
    // Re-validate confirm password if it's already touched
    if (touched.confirmPassword && confirmPassword) {
      const confirmError = value !== confirmPassword ? t('passwordsDoNotMatch') : '';
      setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (touched.confirmPassword) {
      const error = validateConfirmPassword(value);
      setErrors(prev => ({ ...prev, confirmPassword: error }));
    }
  };

  const handleBlur = (field: 'username' | 'email' | 'password' | 'confirmPassword') => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (field === 'username') {
      const error = validateUsername(username);
      setErrors(prev => ({ ...prev, username: error }));
    } else if (field === 'email') {
      const error = validateEmail(email);
      setErrors(prev => ({ ...prev, email: error }));
    } else if (field === 'password') {
      const error = validatePassword(password);
      setErrors(prev => ({ ...prev, password: error }));
    } else {
      const error = validateConfirmPassword(confirmPassword);
      setErrors(prev => ({ ...prev, confirmPassword: error }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ username: true, email: true, password: true, confirmPassword: true });

    // Validate all fields
    const usernameError = validateUsername(username);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError = validateConfirmPassword(confirmPassword);

    if (usernameError || emailError || passwordError || confirmPasswordError) {
      setErrors({
        username: usernameError,
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError
      });
      return;
    }

    // Clear errors and start loading
    setErrors({});
    setIsLoading(true);

    try {
      await onRegister(username, email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('registrationFailed');
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = username && email && password && confirmPassword &&
    !errors.username && !errors.email && !errors.password && !errors.confirmPassword;

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

        {/* Register Form */}
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
              {t('createAccount')}
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg text-muted-foreground text-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {t('registerSubtitle')}
            </motion.p>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-10 sm:space-y-12">
            {/* Username Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <label htmlFor="username" className="block text-base sm:text-lg font-medium mb-4">
                {t('username')}
              </label>
              <div className="relative">
                <User className="absolute top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground pointer-events-none" style={{ left: '1.25rem' }} />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  onBlur={() => handleBlur('username')}
                  placeholder={t('usernamePlaceholder')}
                  className={`pr-4 h-14 sm:h-16 text-base sm:text-lg bg-white ${touched.username && errors.username ? 'border-destructive' : ''}`}
                  style={{ paddingLeft: '3.5rem' }}
                  disabled={isLoading}
                  autoComplete="username"
                  aria-invalid={touched.username && !!errors.username}
                />
              </div>
              <AnimatePresence>
                {touched.username && errors.username && (
                  <motion.div
                    className="flex items-center gap-2 mt-1.5 text-sm sm:text-base text-destructive"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{errors.username}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Email Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
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
              transition={{ delay: 0.8 }}
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
                  autoComplete="new-password"
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

            {/* Confirm Password Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
            >
              <label htmlFor="confirmPassword" className="block text-base sm:text-lg font-medium mb-4">
                {t('confirmPassword')}
              </label>
              <div className="relative">
                <Lock className="absolute top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground pointer-events-none" style={{ left: '1.25rem' }} />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  onBlur={() => handleBlur('confirmPassword')}
                  placeholder="••••••••"
                  className={`pr-16 sm:pr-18 h-14 sm:h-16 text-base sm:text-lg bg-white ${touched.confirmPassword && errors.confirmPassword ? 'border-destructive' : ''}`}
                  style={{ paddingLeft: '3.5rem' }}
                  disabled={isLoading}
                  autoComplete="new-password"
                  aria-invalid={touched.confirmPassword && !!errors.confirmPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-2"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </button>
              </div>
              <AnimatePresence>
                {touched.confirmPassword && errors.confirmPassword && (
                  <motion.div
                    className="flex items-center gap-2 mt-1.5 text-sm sm:text-base text-destructive"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{errors.confirmPassword}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              className="pt-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <Button
                type="submit"
                className="w-full h-14 sm:h-16 text-lg sm:text-xl font-semibold bg-primary hover:bg-primary-dark shadow-md hover:shadow-lg transition-all"
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <motion.span
                      className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    {t('registering')}
                  </span>
                ) : (
                  t('register')
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
            transition={{ delay: 1.1 }}
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
            transition={{ delay: 1.2 }}
          >
            <p className="text-base sm:text-lg text-foreground">
              {t('alreadyHaveAccount')}{' '}
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
          transition={{ delay: 1.3 }}
        >
          {t('registerTermsPrefix')}{' '}
          <button className="text-primary hover:underline">{t('termsOfUse')}</button>
          {' '}{t('and')}{' '}
          <button className="text-primary hover:underline">{t('privacyPolicy')}</button>
        </motion.p>
      </motion.div>
    </div>
  );
}
