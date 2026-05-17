import { ArrowLeft, ExternalLink, Mail, MapPin, Globe, Phone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ImpressumProps {
  onBack: () => void;
}

export function Impressum({ onBack }: ImpressumProps) {
  const { language } = useLanguage();
  const isDE = language === 'de';

  // Contact details
  const CONTACT_EMAIL = 'info@iiius.de';
  const CONTACT_PHONE = '+49 7723 920-2539';
  const REPRESENTATIVE = 'Thomas Schlegel';
  const LEGAL_FORM = isDE ? 'Abteilung der Hochschule Furtwangen University' : 'Department of Hochschule Furtwangen University';

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-border z-30 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            aria-label={isDE ? 'Zurück' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold">{isDE ? 'Impressum' : 'Legal Notice'}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Angaben gemäß § 5 TMG */}
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-foreground">
            {isDE ? 'Angaben gemäß § 5 TMG' : 'Information pursuant to § 5 TMG'}
          </h2>
          <div className="space-y-4">

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Globe className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">IIIUS Institut</p>
                <p className="text-sm text-muted-foreground">{LEGAL_FORM}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-foreground">Goethestraße 14</p>
                <p className="text-sm text-foreground">78120 Furtwangen im Schwarzwald</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-sm text-primary hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Phone className="w-4 h-4 text-primary" />
              </div>
              <a
                href={`tel:${CONTACT_PHONE.replace(/\s/g, '')}`}
                className="text-sm text-primary hover:underline"
              >
                {CONTACT_PHONE}
              </a>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ExternalLink className="w-4 h-4 text-primary" />
              </div>
              <a
                href="http://www.iiius.de/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                www.iiius.de
              </a>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">
                {isDE ? 'Vertretungsberechtigte Person (Leitung)' : 'Authorised Representative (Director)'}
              </p>
              <p className="text-sm font-medium text-foreground">
                {REPRESENTATIVE}
              </p>
            </div>
          </div>
        </section>

        {/* Entwickelt von */}
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-4 text-foreground">
            {isDE ? 'Entwickelt von' : 'Developed by'}
          </h2>
          <div className="space-y-3">
            {[
              { name: 'Jonas Gissler', role: 'UX/UI Design & Development' },
              { name: 'Alessandro Telesca', role: isDE ? 'Entwicklung' : 'Development' },
              { name: 'Tobias Both', role: isDE ? 'Entwicklung & 3D-Modellierung' : 'Development & 3D Modelling' },
              { name: 'Minh Khanh Nguyen', role: isDE ? 'Entwicklung' : 'Development' },
              { name: 'Mu-Hong Noah Basset', role: isDE ? 'Entwicklung' : 'Development' },
            ].map((person) => (
              <div key={person.name} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-semibold text-foreground">{person.name}</p>
                  <p className="text-xs text-muted-foreground">{person.role}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Projektkontext */}
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-3 text-foreground">
            {isDE ? 'Projektkontext' : 'Project Context'}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isDE
              ? 'St.GeoARgen ist ein Studienprojekt, entstanden in Kooperation mit dem IIIUS Institut, der Hochschule Furtwangen University (HFU) und der Stadt St. Georgen im Schwarzwald.'
              : 'St.GeoARgen is a student project created in cooperation with IIIUS Institut, Hochschule Furtwangen University (HFU), and the City of St. Georgen im Schwarzwald.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {['IIIUS Institut', 'HFU', isDE ? 'Stadt St. Georgen' : 'City of St. Georgen'].map((tag) => (
              <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        </section>

        {/* Haftung & Hosting */}
        <section className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-base font-semibold mb-3 text-foreground">
            {isDE ? 'Haftungshinweis' : 'Liability Notice'}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {isDE
              ? 'Verantwortlich für Hosting und Betrieb dieser Anwendung ist das IIIUS Institut, Goethestraße 14, 78120 Furtwangen im Schwarzwald. Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt verlinkter Seiten sind ausschließlich deren Betreiber verantwortlich.'
              : 'Responsible for hosting and operation of this application is IIIUS Institut, Goethestraße 14, 78120 Furtwangen im Schwarzwald. Despite careful content review, we assume no liability for the content of external links. The operators of linked pages are solely responsible for their content.'}
          </p>
        </section>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground">
          {isDE
            ? 'Stand: 2025 – Studienprojekt der Hochschule Furtwangen University'
            : 'As of 2025 – Student project of Hochschule Furtwangen University'}
        </p>
      </div>
    </div>
  );
}
