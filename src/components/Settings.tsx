import { Bell, Globe, HelpCircle, Info, Shield, Trash2, ArrowLeft, User, Maximize2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

interface SettingsProps {
  onResetProgress: () => Promise<void> | void;
  fullscreenActive: boolean;
  fullscreenAvailable: boolean;
  isIOS: boolean;
  onToggleFullscreen: (enabled: boolean) => void;
  onBack?: () => void;
  onNavigateToProfile?: () => void;
}

export function Settings({
  onResetProgress,
  fullscreenActive,
  fullscreenAvailable,
  isIOS,
  onToggleFullscreen,
  onBack,
  onNavigateToProfile,
}: SettingsProps) {
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('de');

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Back Button */}
      {onBack && (
        <div className="sticky top-16 bg-background/80 backdrop-blur-sm z-20 border-b border-border">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Zurück</span>
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-3xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold mb-6">Einstellungen</h2>

          {/* Account Settings */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">
              Account
            </h3>
            
            <div className="bg-white rounded-xl border border-border">
              <button
                onClick={onNavigateToProfile}
                className="w-full p-4 flex items-center gap-3 hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Profil verwalten</p>
                  <p className="text-sm text-muted-foreground">Account-Informationen & Sicherheit</p>
                </div>
              </button>
            </div>
          </div>

          {/* General Settings */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">
              Allgemein
            </h3>
            
            <div className="bg-white rounded-xl border border-border divide-y divide-border">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Benachrichtigungen</p>
                    <p className="text-sm text-muted-foreground">Erhalte Updates zu neuen Pfaden</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      notifications ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Sprache</p>
                    <p className="text-sm text-muted-foreground">Deutsch</p>
                  </div>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-4 py-2 bg-muted rounded-lg border border-border"
                >
                  <option value="de">Deutsch</option>
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Vollbildmodus{isIOS ? ' (BETA)' : ''}</p>
                    <p className="text-sm text-muted-foreground">
                      {fullscreenAvailable
                        ? 'Vollbildmodus an/aus'
                        : 'Nur auf Mobilgeraeten verfuegbar'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => void onToggleFullscreen(!fullscreenActive)}
                  disabled={!fullscreenAvailable}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    fullscreenActive ? 'bg-primary' : 'bg-muted'
                  } ${
                    fullscreenAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      fullscreenActive ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">
              App Informationen
            </h3>
            
            <div className="bg-white rounded-xl border border-border divide-y divide-border">
              <button className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Hilfe & Support</p>
                  <p className="text-sm text-muted-foreground">FAQs und Kontakt</p>
                </div>
              </button>

              <button className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Info className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Über St.GeoARgen</p>
                  <p className="text-sm text-muted-foreground">Version 1.0.0</p>
                </div>
              </button>

              <button className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">Datenschutz</p>
                  <p className="text-sm text-muted-foreground">Datenschutzerklärung</p>
                </div>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider" style={{ color: '#dc2626' }}>
              Gefahrenzone
            </h3>
            
            <div className="rounded-xl border" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
              <button
                onClick={async () => {
                  if (window.confirm('Möchtest du wirklich deinen gesamten Fortschritt zurücksetzen?')) {
                    await onResetProgress();
                  }
                }}
                className="w-full p-4 flex items-center gap-3 transition-colors rounded-xl"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#fee2e2' }}>
                  <Trash2 className="w-5 h-5" style={{ color: '#dc2626' }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium" style={{ color: '#dc2626' }}>Fortschritt zurücksetzen</p>
                  <p className="text-sm text-muted-foreground">
                    Alle Punkte und abgeschlossenen Stationen löschen
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Made with 💚 in St.Georgen
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
