import { useState } from 'react';
import { Button } from './ui/button';
import { motion } from 'motion/react';

export function PartnerVoucherValidation() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateVoucher = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/partner_voucher_validate.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, code: code.toUpperCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ ${data.message}`);
      } else {
        setMessage(`🔴 ${data.message}`);
      }
    } catch (error) {
      setMessage('🔴 Serverfehler beim Validieren.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-md mx-auto"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center shadow-lg">
            <img src="/Logo.svg" alt="St.GeoARgen" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" style={{filter: 'brightness(0) invert(1)'}} />
          </div>
        </div>

        {/* Titel */}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-8 lg:mb-10">
          Partner Gutschein Validierung
        </h1>

        {/* Form Container */}
        <div className="w-full max-w-md mx-auto px-6 sm:px-8 lg:px-10 space-y-6">
          {/* Login Felder */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 gap-3">
              <input
                className="w-full border border-gray-300 rounded-lg sm:rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
                placeholder="Partner Benutzername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
              <input
                className="w-full border border-gray-300 rounded-lg sm:rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
                placeholder="Passwort"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Gutscheincode */}
            <input
              className="w-full border border-gray-300 rounded-lg sm:rounded-xl px-4 py-3 text-base uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
              placeholder="Gutscheincode (z.B. ABC123DE)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
          </div>

          {/* Validieren Button */}
          <Button
            onClick={validateVoucher}
            disabled={loading || !username || !password || !code}
            className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-lg sm:rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Validiere...' : 'Gutschein validieren'}
          </Button>

          {/* Nachricht */}
          {message && (
            <motion.div
              className={`mt-4 p-3 rounded-lg text-center text-sm font-medium ${
                message.startsWith('✅')
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
            >
              {message}
            </motion.div>
          )}

          {/* Hinweis */}
          <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
            <p className="font-semibold text-sm mb-1 text-center">ℹ️ Hinweis:</p>
            <p className="text-sm text-center leading-relaxed">
              Nach erfolgreicher Validierung wird der Gutschein-Code als eingelöst markiert und kann nicht mehr verwendet werden.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
