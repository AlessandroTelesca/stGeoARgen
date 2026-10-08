import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthShell, AuthDivider, FieldLabel } from './AuthShell';

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
    if (value.length < 8) return t('passwordMinLength');
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

  const passwordToggle = (visible: boolean, toggle: () => void) => (
    <button
      type="button"
      onClick={toggle}
      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      aria-label={visible ? t('hidePassword') : t('showPassword')}
    >
      {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  );

  const inputClass = (invalid: boolean, extra = '') =>
    `h-14 pl-12 rounded-2xl ${extra} ${invalid ? 'border-destructive' : ''}`;

  return (
    <AuthShell
      title={t('createAccount')}
      subtitle={t('registerSubtitle')}
      onBack={onNavigateBack}
      footer={
        <p className="text-center text-xs text-muted-foreground leading-relaxed px-4">
          {t('registerTermsPrefix')} {t('termsOfUse')} {t('and')} {t('privacyPolicy')}.
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <FieldLabel htmlFor="username">{t('username')}</FieldLabel>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              id="username"
              type="text"
              value={username}
              onChange={handleUsernameChange}
              onBlur={() => handleBlur('username')}
              placeholder={t('usernamePlaceholder')}
              className={inputClass(!!(touched.username && errors.username), 'pr-4')}
              disabled={isLoading}
              autoComplete="username"
              aria-invalid={touched.username && !!errors.username}
            />
          </div>
          {fieldError(touched.username ? errors.username : undefined)}
        </div>

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
              className={inputClass(!!(touched.email && errors.email), 'pr-4')}
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
              className={inputClass(!!(touched.password && errors.password), 'pr-14')}
              disabled={isLoading}
              autoComplete="new-password"
              aria-invalid={touched.password && !!errors.password}
            />
            {passwordToggle(showPassword, () => setShowPassword(!showPassword))}
          </div>
          {fieldError(touched.password ? errors.password : undefined)}
        </div>

        <div>
          <FieldLabel htmlFor="confirmPassword">{t('confirmPassword')}</FieldLabel>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              onBlur={() => handleBlur('confirmPassword')}
              placeholder="••••••••"
              className={inputClass(!!(touched.confirmPassword && errors.confirmPassword), 'pr-14')}
              disabled={isLoading}
              autoComplete="new-password"
              aria-invalid={touched.confirmPassword && !!errors.confirmPassword}
            />
            {passwordToggle(showConfirmPassword, () => setShowConfirmPassword(!showConfirmPassword))}
          </div>
          {fieldError(touched.confirmPassword ? errors.confirmPassword : undefined)}
        </div>

        <AnimatePresence>
          {errors.general && (
            <motion.div
              className="flex items-start gap-3 p-4 bg-destructive/8 border border-destructive/20 rounded-2xl text-sm text-destructive"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
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
              {t('registering')}
            </span>
          ) : (
            t('register')
          )}
        </Button>
      </form>

      <AuthDivider label={t('or')} />

      <button
        type="button"
        onClick={onNavigateToLogin}
        disabled={isLoading}
        className="w-full h-14 rounded-2xl border-2 border-primary/20 bg-card hover:border-primary transition-colors pressable"
      >
        <span className="text-sm text-muted-foreground">{t('alreadyHaveAccount')}</span>{' '}
        <span className="text-sm font-bold text-primary">{t('loginNow')}</span>
      </button>
    </AuthShell>
  );
}
