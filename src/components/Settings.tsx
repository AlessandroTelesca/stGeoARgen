import { Bell, Globe, HelpCircle, Info, Shield, Trash2, ArrowLeft, User, Maximize2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Language } from '../i18n/translations';

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
  const { language, setLanguage, t } = useLanguage();

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
              <span className="font-medium">{t('back')}</span>
            </button>
          </div>
        </div>
      )}
      
      <div className="max-w-3xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold mb-6">{t('settings')}</h2>

          {/* Account Settings */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">
              {t('account')}
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
                  <p className="font-medium">{t('manageProfile')}</p>
                  <p className="text-sm text-muted-foreground">{t('accountInfo')}</p>
                </div>
              </button>
            </div>
          </div>

          {/* General Settings */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">
              {t('general')}
            </h3>
            
            <div className="bg-white rounded-xl border border-border divide-y divide-border">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t('notifications')}</p>
                    <p className="text-sm text-muted-foreground">{t('notificationsDesc')}</p>
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
                    <p className="font-medium">{t('language')}</p>
                    <p className="text-sm text-muted-foreground">{language === 'de' ? t('languageGerman') : t('languageEnglish')}</p>
                  </div>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="px-4 py-2 bg-muted rounded-lg border border-border"
                >
                  <option value="de">{t('languageGerman')}</option>
                  <option value="en">{t('languageEnglish')}</option>
                </select>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Maximize2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{isIOS ? t('fullscreenBeta') : t('fullscreen')}</p>
                    <p className="text-sm text-muted-foreground">
                      {fullscreenAvailable
                        ? t('fullscreenOn')
                        : t('fullscreenMobileOnly')}
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
              {t('appInfo')}
            </h3>
            
            <div className="bg-white rounded-xl border border-border divide-y divide-border">
              <button className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{t('helpSupport')}</p>
                  <p className="text-sm text-muted-foreground">{t('faqsContact')}</p>
                </div>
              </button>

              <button className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Info className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{t('aboutApp')}</p>
                  <p className="text-sm text-muted-foreground">{t('appVersion')}</p>
                </div>
              </button>

              <button className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{t('privacy')}</p>
                  <p className="text-sm text-muted-foreground">{t('privacyPolicy')}</p>
                </div>
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider" style={{ color: '#dc2626' }}>
              {t('dangerZone')}
            </h3>
            
            <div className="rounded-xl border" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
              <button
                onClick={async () => {
                  if (window.confirm(t('resetProgressConfirm'))) {
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
                  <p className="font-medium" style={{ color: '#dc2626' }}>{t('resetProgress')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('resetProgressDesc')}
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t('madeWith')}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
