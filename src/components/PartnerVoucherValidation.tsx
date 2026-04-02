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
    <div className="min-h-screen bg-background flex justify-center items-start sm:pt-12 pt-6 sm:pb-12 pb-6">
      <motion.div
        className="relative w-full max-w-2xl sm:max-w-2xl max-w-full mx-auto bg-white rounded-3xl shadow-2xl border border-border overflow-hidden"
        style={{ minHeight: '420px', height: 'auto', maxWidth: '700px' }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      >
        {/* Logo-Header */}
        <div className="flex flex-col items-center text-center pt-24 pb-6 px-4 sm:px-10" style={{ marginTop: '10px' }}>
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center mb-4 shadow-lg" style={{ marginTop: '10px' }}>
            <img src="/Logo.svg" alt="St.GeoARgen" className="w-12 h-12 object-contain" style={{filter: 'brightness(0) invert(1)', marginTop: '10px'}} />
          </div>
          <h1 className="text-3xl font-bold mb-1" style={{ marginTop: '10px' }}>Partner Gutschein Validierung</h1>
        </div>
        <div className="px-4 sm:px-10 pb-10 flex flex-col items-center" style={{ minHeight: '180px', marginTop: '10px' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 w-full max-w-xs sm:max-w-2xl">
            <input
              className="border rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition w-full"
              placeholder="Partner Benutzername"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <input
              className="border rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition w-full"
              placeholder="Passwort"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <input
            className="border rounded-xl px-4 sm:px-5 py-3 sm:py-4 mb-3 uppercase text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-primary/30 transition max-w-xs sm:max-w-sm w-full mx-auto"
            placeholder="Gutscheincode"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <Button onClick={validateVoucher} disabled={loading || !username || !password || !code} className="w-full max-w-xs sm:max-w-sm h-12 sm:h-14 text-base sm:text-lg rounded-xl font-semibold mt-1 mx-auto" style={{ marginTop: '10px' }}>
            {loading ? 'Validieren...' : 'Gutschein validieren'}
          </Button>
          {message && <p className="mt-4 text-sm font-medium text-center">{message}</p>}
          <div className="mt-8 sm:mt-10 p-2 rounded-md bg-green-50 border border-green-200 text-green-900 w-full max-w-[220px] mx-auto flex flex-col items-center">
            <p className="font-semibold text-xs mb-1 text-center">Hinweis:</p>
            <p className="text-xs text-center">Nach erfolgreicher Validierung wird der Code als eingelöst markiert.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
