import { User, Mail, Calendar, Trash2, LogOut, Shield, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface ProfileProps {
  username: string | null;
  email?: string | null;
  createdAt?: string | null;
  onBack: () => void;
  onBackToSettings?: () => void;
  onLogout: () => void;
}

export function Profile({ username, email, createdAt, onBack, onBackToSettings, onLogout }: ProfileProps) {
  const handleDeleteAccount = () => {
    if (confirm('Möchtest du dein Konto wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      // TODO: Implement account deletion
      alert('Account-Löschung würde hier implementiert werden');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Back Button */}
      <div className="sticky top-16 bg-background/80 backdrop-blur-sm z-20 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <button
            onClick={onBackToSettings || onBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Zurück</span>
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Profile Header */}
          <div className="bg-white rounded-xl border border-border p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{username || 'Gast'}</h2>
                <p className="text-sm text-muted-foreground">Mitglied seit Dezember 2025</p>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">
              Account-Informationen
            </h3>

            <div className="bg-white rounded-xl border border-border divide-y divide-border">
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Benutzername</p>
                  <p className="text-sm text-muted-foreground">{username || 'Nicht angemeldet'}</p>
                </div>
              </div>

              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">E-Mail</p>
                  <p className="text-sm text-muted-foreground">{email || 'Nicht verfügbar'}</p>
                </div>
              </div>

              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Registriert seit</p>
                  <p className="text-sm text-muted-foreground">
                    {createdAt
                      ? new Date(createdAt).toLocaleDateString('de-DE', {
                        year: 'numeric', month: 'long', day: 'numeric'
                      })
                      : 'Unbekannt'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">
              Datenschutz & Sicherheit
            </h3>

            <div className="bg-white rounded-xl border border-border divide-y divide-border">
              <button className="w-full p-4 flex items-center gap-3 hover:bg-muted transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Passwort ändern</p>
                  <p className="text-sm text-muted-foreground">Aktualisiere dein Passwort</p>
                </div>
              </button>

              <button className="w-full p-4 flex items-center gap-3 hover:bg-muted transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Datenschutzeinstellungen</p>
                  <p className="text-sm text-muted-foreground">Verwalte deine Daten</p>
                </div>
              </button>
            </div>
          </div>

          {/* Account Actions */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">
              Account
            </h3>

            <div className="bg-white rounded-xl border border-border">
              <button
                onClick={onLogout}
                className="w-full p-4 flex items-center gap-3 hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-orange-600">Abmelden</p>
                  <p className="text-sm text-muted-foreground">Von diesem Gerät abmelden</p>
                </div>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider" style={{ color: '#dc2626' }}>
              Gefahrenzone
            </h3>

            <div className="rounded-xl border" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
              <button
                onClick={handleDeleteAccount}
                className="w-full p-4 flex items-center gap-3 transition-colors"
                style={{ ':hover': { backgroundColor: '#fee2e2' } }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fee2e2' }}>
                  <Trash2 className="w-5 h-5" style={{ color: '#dc2626' }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium" style={{ color: '#dc2626' }}>Account löschen</p>
                  <p className="text-sm text-muted-foreground">Alle Daten werden unwiderruflich gelöscht</p>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
