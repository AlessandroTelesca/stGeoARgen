import { ArrowLeft, Shield, Lock, Database, UserCheck, Trash2, Server, Scale, Clock, HardDrive, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface DatenschutzProps {
  onBack: () => void;
}

export function Datenschutz({ onBack }: DatenschutzProps) {
  const { language } = useLanguage();
  const isDE = language === 'de';

  const sections = isDE
    ? [
        {
          icon: Database,
          title: '1. Verantwortliche Stelle',
          content: 'Verantwortlich für die Datenverarbeitung im Rahmen dieser App ist das IIIUS Institut, Goethestraße 14, 78120 Furtwangen im Schwarzwald (www.iiius.de).\n\nLeitung: Thomas Schlegel\nTel.: +49 7723 920-2539\nE-Mail: info@iiius.de',
        },
        {
          icon: UserCheck,
          title: '2. Datenschutzbeauftragter',
          content: 'Der Datenschutzbeauftragte der Hochschule Furtwangen University ist:\n\nProf. Dr. jur. Bernhard Plum\nTel.: +49 7723 920-2148\nE-Mail: Bernhard.Plum@hs-furtwangen.de',
        },
        {
          icon: UserCheck,
          title: '3. Erhobene Daten & Zweck',
          content: 'Bei der Registrierung werden folgende personenbezogene Daten erhoben: Benutzername, E-Mail-Adresse sowie ein Passwort. Die Angabe dieser Daten ist für die Nutzung des Accounts freiwillig, aber Voraussetzung für die Speicherung des Lernfortschritts. Die App kann auch ohne Account (ohne Datenspeicherung) genutzt werden. Personenbezogene Daten werden nicht an Dritte weitergegeben.',
        },
        {
          icon: Scale,
          title: '4. Rechtsgrundlage der Verarbeitung',
          content: 'Die Verarbeitung personenbezogener Daten erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Durchführung vorvertraglicher Maßnahmen bzw. Erfüllung eines Vertrags), soweit Sie einen Account anlegen. Für die Speicherung des Fortschritts ohne Account (localStorage) erfolgt keine Verarbeitung personenbezogener Daten durch uns.',
        },
        {
          icon: Lock,
          title: '5. Passwortsicherheit',
          content: 'Passwörter werden niemals im Klartext gespeichert. Sie werden vor der Speicherung mit einem sicheren Hashing-Verfahren (bcrypt) verschlüsselt. Selbst im Falle eines unautorisierten Datenbankzugriffs sind Passwörter nicht im Klartext lesbar.',
        },
        {
          icon: HardDrive,
          title: '6. Lokale Datenspeicherung (localStorage)',
          content: 'Nicht eingeloggte Nutzer speichern ihren Lernfortschritt ausschließlich lokal im Browser (localStorage). Diese Daten verlassen das Gerät nicht und werden von uns nicht verarbeitet. Sie können diese Daten jederzeit über die Browser-Einstellungen oder die Funktion \u201eFortschritt zurücksetzen\u201c in den App-Einstellungen löschen.',
        },
        {
          icon: Shield,
          title: '7. Fortschrittsspeicherung (Datenbankserver)',
          content: 'Der Lernfortschritt eingeloggter Nutzer (abgeschlossene Stationen, gesammelte Punkte) wird in einer gesicherten Datenbank auf Servern des IIIUS Instituts gespeichert und ist ausschließlich mit dem jeweiligen Benutzerkonto verknüpft.',
        },
        {
          icon: Server,
          title: '8. Hosting & Speicherort',
          content: 'Die Anwendung und alle zugehörigen Nutzerdaten werden auf Servern des IIIUS Instituts gehostet. Das IIIUS Institut trägt die Verantwortung für den sicheren Betrieb.',
        },
        {
          icon: Clock,
          title: '9. Speicherdauer',
          content: 'Personenbezogene Daten werden gespeichert, solange ein Benutzerkonto aktiv ist. Nach einer Löschungsanfrage werden die Daten unverzüglich gelöscht. Die Löschung des eigenen Fortschritts ist jederzeit über die App-Einstellungen möglich.',
        },
        {
          icon: Trash2,
          title: '10. Ihre Rechte als betroffene Person',
          content: 'Sie haben folgende Rechte bezüglich Ihrer gespeicherten Daten:\n• Auskunft (Art. 15 DSGVO)\n• Berichtigung unrichtiger Daten (Art. 16 DSGVO)\n• Löschung (Art. 17 DSGVO)\n• Einschränkung der Verarbeitung (Art. 18 DSGVO)\n• Datenübertragbarkeit (Art. 20 DSGVO)\n• Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)\n\nFür entsprechende Anfragen: info@iiius.de',
        },
        {
          icon: AlertCircle,
          title: '11. Beschwerderecht bei der Aufsichtsbehörde',
          content: 'Sie haben das Recht, sich bei der zuständigen Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg (LfDI BW), Lautenschlagerstraße 20, 70173 Stuttgart, www.baden-wuerttemberg.datenschutz.de.',
        },
      ]
    : [
        {
          icon: Database,
          title: '1. Data Controller',
          content: 'The data controller for this application is IIIUS Institut, Goethestraße 14, 78120 Furtwangen im Schwarzwald (www.iiius.de).\n\nDirector: Thomas Schlegel\nPhone: +49 7723 920-2539\nEmail: info@iiius.de',
        },
        {
          icon: UserCheck,
          title: '2. Data Protection Officer',
          content: 'The Data Protection Officer of Hochschule Furtwangen University is:\n\nProf. Dr. jur. Bernhard Plum\nPhone: +49 7723 920-2148\nEmail: Bernhard.Plum@hs-furtwangen.de',
        },
        {
          icon: UserCheck,
          title: '3. Data Collected & Purpose',
          content: 'During registration, the following personal data is collected: username, email address, and a password. Providing this data is voluntary but required for saving learning progress. The app can also be used without an account (no server-side data storage). Personal data is not shared with third parties.',
        },
        {
          icon: Scale,
          title: '4. Legal Basis for Processing',
          content: 'Personal data is processed on the basis of Art. 6(1)(b) GDPR (performance of a contract or pre-contractual measures) when you create an account. Progress saved without an account (localStorage) does not involve processing of personal data by us.',
        },
        {
          icon: Lock,
          title: '5. Password Security',
          content: "Passwords are never stored in plain text. They are encrypted using a secure hashing algorithm (bcrypt) before storage. Even in the event of unauthorized database access, passwords cannot be read in plain text.",
        },
        {
          icon: HardDrive,
          title: '6. Local Storage (localStorage)',
          content: "Users who are not logged in store their progress exclusively in the browser's local storage (localStorage). This data does not leave your device and is not processed by us. You can delete this data at any time via your browser settings or the Reset Progress function in the app settings.",
        },
        {
          icon: Shield,
          title: '7. Progress Storage (Database Server)',
          content: 'The learning progress of logged-in users (completed stations, collected points) is stored in a secured database on servers of IIIUS Institut and is exclusively linked to the respective user account.',
        },
        {
          icon: Server,
          title: '8. Hosting & Storage Location',
          content: 'The application and all associated user data are hosted on servers operated by IIIUS Institut. IIIUS Institut is responsible for secure storage and operations.',
        },
        {
          icon: Clock,
          title: '9. Retention Period',
          content: 'Personal data is stored for as long as a user account remains active. Upon a deletion request, data will be deleted promptly. Users can reset their own progress at any time via the app settings.',
        },
        {
          icon: Trash2,
          title: '10. Your Rights as a Data Subject',
          content: 'You have the following rights regarding your stored data:\n• Right of access (Art. 15 GDPR)\n• Right to rectification (Art. 16 GDPR)\n• Right to erasure (Art. 17 GDPR)\n• Right to restriction of processing (Art. 18 GDPR)\n• Right to data portability (Art. 20 GDPR)\n• Right to object (Art. 21 GDPR)\n\nFor such requests: info@iiius.de',
        },
        {
          icon: AlertCircle,
          title: '11. Right to Lodge a Complaint',
          content: 'You have the right to lodge a complaint with a supervisory authority. The competent authority is: Landesbeauftragter für den Datenschutz und die Informationsfreiheit Baden-Württemberg (LfDI BW), Lautenschlagerstraße 20, 70173 Stuttgart, www.baden-wuerttemberg.datenschutz.de.',
        },
      ];

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
          <h1 className="text-lg font-semibold">
            {isDE ? 'Datenschutzerklärung' : 'Privacy Policy'}
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Intro banner */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-5 flex items-start gap-3">
          <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground leading-relaxed">
            {isDE
              ? 'Ihre Privatsphäre ist uns wichtig. Diese Datenschutzerklärung informiert Sie gemäß Art. 13 DSGVO über die Verarbeitung Ihrer personenbezogenen Daten im Rahmen der St.GeoARgen App – einem Studienprojekt der HFU in Kooperation mit dem IIIUS Institut und der Stadt St. Georgen.'
              : 'Your privacy matters to us. This Privacy Policy informs you in accordance with Art. 13 GDPR about the processing of your personal data within the St.GeoARgen App – a student project of HFU in cooperation with IIIUS Institut and the City of St. Georgen.'}
          </p>
        </div>

        {/* Policy sections */}
        {sections.map((section) => {
          const IconComponent = section.icon;
          return (
            <section key={section.title} className="bg-white rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
                  <IconComponent className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-sm font-semibold text-foreground pt-1.5">{section.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-12 whitespace-pre-line">
                {section.content}
              </p>
            </section>
          );
        })}

        {/* Context tags */}
        <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            {isDE ? 'Projektbeteiligte' : 'Project Partners'}
          </p>
          <div className="flex flex-wrap gap-2">
            {['IIIUS Institut', 'HFU', isDE ? 'Stadt St. Georgen' : 'City of St. Georgen'].map((tag) => (
              <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {isDE
            ? 'Stand: 2025 – Studienprojekt der Hochschule Furtwangen University'
            : 'As of 2025 – Student project of Hochschule Furtwangen University'}
        </p>
      </div>
    </div>
  );
}
