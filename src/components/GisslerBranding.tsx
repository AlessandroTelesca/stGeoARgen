import gaLogo from '../assets/ga-webdesign-logo.png';

interface GisslerBrandingProps {
  href?: string;
  className?: string;
}

const gradientStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #4dbef3, #006999)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export default function GisslerBranding({ href, className = '' }: GisslerBrandingProps) {
  const inner = (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={gaLogo}
        alt="G&A Webdesign Logo"
        className="w-6 h-6 object-contain flex-shrink-0"
      />
      <div className="text-[18px] sm:text-[20px] font-semibold inline-flex items-baseline">
        <span style={gradientStyle}>G</span>
        <span style={gradientStyle}>&amp;</span>
        <span style={gradientStyle}>A Webdesign</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="hover:opacity-75 transition-opacity">
        {inner}
      </a>
    );
  }

  return inner;
}
