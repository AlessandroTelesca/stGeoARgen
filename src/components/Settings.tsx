import { Bell, Globe, HelpCircle, Info, Shield, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

interface SettingsProps {
  onResetProgress: () => void;
}

export function Settings({ onResetProgress }: SettingsProps) {
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('de');

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold mb-6">Einstellungen</h2>

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
            <h3 className="font-semibold mb-3 text-sm text-destructive uppercase tracking-wider">
              Gefahrenzone
            </h3>
            
            <div className="bg-white rounded-xl border border-destructive/20">
              <button
                onClick={() => {
                  if (window.confirm('Möchtest du wirklich deinen gesamten Fortschritt zurücksetzen?')) {
                    onResetProgress();
                  }
                }}
                className="w-full p-4 flex items-center gap-3 hover:bg-destructive/5 transition-colors rounded-xl"
              >
                <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-destructive" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-destructive">Fortschritt zurücksetzen</p>
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
