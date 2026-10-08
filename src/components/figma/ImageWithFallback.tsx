import { useState } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
}

export function ImageWithFallback({ src, alt, fallbackSrc, ...props }: ImageWithFallbackProps) {
  const [errored, setErrored] = useState(false);

  return (
    <img
      src={errored || !src ? (fallbackSrc ?? '') : src}
      alt={alt}
      decoding="async"
      onError={() => setErrored(true)}
      {...props}
    />
  );
}
