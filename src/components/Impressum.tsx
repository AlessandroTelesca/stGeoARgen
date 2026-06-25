import { ArrowLeft, ExternalLink, Mail, MapPin, Globe, Phone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import GisslerBranding from './GisslerBranding';

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
        </div >
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
              </div >
              <div >
                <p className="text-sm font-semibold text-foreground">IIIUS Institut</p>
                <p className="text-sm text-muted-foreground">{LEGAL_FORM}</p>
              </div >
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-primary" />
              </div >
              <div >
                <p className="text-sm text-foreground">Goethestraße 14</p>
                <p className="text-sm text-foreground">78120 Furtwangen im Schwarzwald</p>
              </div >
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Mail className="w-4 h-4 text-primary" />
              </div >
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
              </div >
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
              </div >
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
            {/* Jonas Gissler – with G&A Webdesign branding */}
            <div className="flex items-center gap-3 py-2 border-b border-border">
              <div >
                <p className="text-sm font-semibold text-foreground">Jonas Gissler</p>
                <p className="text-xs text-muted-foreground mb-1">UX/UI Design &amp; Entwicklung</p>
                <GisslerBranding href="https://ga-webdesign.de" />
              </div>
            </div>

            {[
              { name: 'Alessandro Telesca', role: isDE ? 'Entwicklung' : 'Development', linkedin: 'https://www.linkedin.com/in/alessandro-telesca-086784256/' },
              { name: 'Tobias Both', role: isDE ? 'Entwicklung & 3D-Modellierung' : 'Development & 3D Modelling', linkedin: null },
              { name: 'Minh Khanh Nguyen', role: isDE ? 'Entwicklung' : 'Development', linkedin: null },
              { name: 'Mu-Hong Noah Basset', role: isDE ? 'Entwicklung' : 'Development', linkedin: null },
            ].map((person) => (
              <div 
                key={person.name} 
                className={`flex items-start gap-3 py-2 border-b border-border last:border-0`}
              >
                <div className="flex flex-col"> 
                  <p className="text-sm font-semibold text-foreground">{person.name}</p>
                  <p className="text-xs text-muted-foreground mb-2">{person.role}</p>

                  {/* MODIFIED LINKEDIN RENDERING */}
                  {person.linkedin && (
                    <div 
                      className="flex items-center gap-1 pt-1"
                      // Using a specific class or component for the icon container for better visual grouping
                    >
                      {/* Placeholder for LinkedIn Icon. Ideally, use an SVG or dedicated library component */}
                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        {/* This is a common approximation of the LinkedIn logo icon structure (using generic shapes for safety) */}
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.394-2.586 7-2.777 7 2.148v6.778z"/>
                      </svg> 
                      <a 
                        href={person.linkedin} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-xs text-primary hover:underline cursor-pointer"
                      >
                        /in/{person.name.toLowerCase().replace(/\s+/g, '-')}-{person.linkedin?.split('/').pop() || ''}
                        {/* Note: Using a more descriptive link display might be better than just "LinkedIn Profile" */}
                      </a>
                    </div >
                  )}
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
          </div >
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
