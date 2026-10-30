import { Languages } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Language } from '../../i18n/translations';

/**
 * Sprache der Oberfläche (App-Sprache, wie in den Einstellungen) als Auswahlfeld – bewusst anders
 * gestaltet als „Englische Fassung bearbeiten“ im Stationseditor, das nur die Inhalte betrifft.
 */
export function InterfaceLanguageSwitch() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="relative flex items-center h-10 rounded-full bg-muted pl-3 pr-1 text-sm font-semibold text-muted-foreground hover:text-foreground focus-within:ring-4 focus-within:ring-primary/40 transition-colors">
      <Languages className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="hidden md:inline ml-1.5">{t('adminInterfaceLanguageShort')}</span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        aria-label={t('adminInterfaceLanguage')}
        className="h-10 appearance-none bg-transparent pl-1.5 pr-3 font-bold text-foreground cursor-pointer focus:outline-none"
      >
        <option value="de">Deutsch</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
