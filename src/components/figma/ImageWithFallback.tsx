import { useState } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
}

export function ImageWithFallback({ src, alt, fallbackSrc, fetchPriority, ...props }: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false);

  return (
    <img
      src={errored || !src ? (fallbackSrc ?? '') : src}
      alt={alt}
      decoding="async"
      onError={() => setErrored(true)}
      // React 18 kennt `fetchPriority` noch nicht als DOM-Prop; als HTML-Attribut klein geschrieben weiterreichen
      {...(fetchPriority ? { fetchpriority: fetchPriority } : {})}
      {...props}
    />
  );
}
