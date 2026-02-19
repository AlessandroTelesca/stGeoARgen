import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { GeorgiAvatar } from './Georgi';

interface ForgotPasswordProps {
  onNavigateBack?: () => void;
  onNavigateToLogin?: () => void;
}

export function ForgotPassword({ onNavigateBack, onNavigateToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean }>({});

  // Validation
  const validateEmail = (value: string) => {
    if (!value) return 'E-Mail ist erforderlich';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Ungültige E-Mail-Adresse';
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
    setErrors({ email: error });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark field as touched
    setTouched({ email: true });
    
    // Validate
    const emailError = validateEmail(email);
    
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    // Clear errors and start loading
    setErrors({});
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 1500);
  };

  const isFormValid = email && !errors.email;

  if (isSuccess) {
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
              E-Mail gesendet!
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg text-muted-foreground mb-8 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Wir haben dir einen Link zum Zurücksetzen deines Passworts an{' '}
              <span className="font-medium text-foreground">{email}</span> gesendet.
              Überprüfe dein Postfach und folge den Anweisungen.
            </motion.p>

            {/* Georgi */}
            <motion.div
              className="flex justify-center mb-8"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
            >
              <GeorgiAvatar size="md" animated={true} />
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
                Zurück zur Anmeldung
              </Button>
            </motion.div>

            {/* Help Text */}
            <motion.p
              className="text-sm sm:text-base text-muted-foreground mt-8 px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Keine E-Mail erhalten?{' '}
              <button
                onClick={() => setIsSuccess(false)}
                className="text-primary hover:text-primary/80 hover:underline font-medium transition-colors"
              >
                Erneut senden
              </button>
            </motion.p>
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
            <span className="text-base font-medium">Zurück</span>
          </motion.button>
        )}

        {/* Forgot Password Form */}
        <motion.div
          className="p-0"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Header with Georgi */}
          <div className="flex flex-col items-center mb-16" style={{ marginBottom: '5rem' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              <GeorgiAvatar size="lg" animated={true} />
            </motion.div>
            <motion.h1
              className="text-3xl sm:text-4xl font-bold mt-6 mb-3 text-center text-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Passwort vergessen?
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg text-muted-foreground text-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              Kein Problem! Gib deine E-Mail-Adresse ein und wir senden dir einen Link zum Zurücksetzen
            </motion.p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-10 sm:space-y-12">
            {/* Email Field */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <label htmlFor="email" className="block text-base sm:text-lg font-medium mb-4">
                E-Mail-Adresse
              </label>
              <div className="relative">
                <Mail className="absolute top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground pointer-events-none" style={{ left: '1.25rem' }} />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleBlur}
                  placeholder="deine@email.de"
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
                disabled={isLoading || !isFormValid}
              >
                {isLoading ? (
                  <span className="flex items-center gap-3">
                    <motion.span
                      className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                    Wird gesendet...
                  </span>
                ) : (
                  'Link zum Zurücksetzen senden'
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
            transition={{ delay: 0.8 }}
          >
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm sm:text-base uppercase">
              <span className="bg-background px-5 sm:px-6 py-1 text-muted-foreground">oder</span>
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
              Passwort wieder eingefallen?{' '}
              <button
                type="button"
                onClick={onNavigateToLogin}
                className="text-primary hover:text-primary/80 hover:underline font-semibold transition-colors"
                disabled={isLoading}
              >
                Jetzt anmelden
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
          Du erhältst nur eine E-Mail, wenn ein Konto mit dieser Adresse existiert. Falls nicht, kannst du dich{' '}
          <button className="text-primary hover:underline">hier registrieren</button>
        </motion.p>
      </motion.div>
    </div>
  );
}
