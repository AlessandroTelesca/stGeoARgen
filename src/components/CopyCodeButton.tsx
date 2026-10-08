import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { IconSwap } from './ui/icon-swap';

interface CopyCodeButtonProps {
  code: string;
  copyLabel?: string;
  copiedLabel?: string;
}

/** Kopiert einen Code; Icon und Text wechseln kurz zu "Kopiert" mit Haken. */
export function CopyCodeButton({ code, copyLabel = 'Code kopieren', copiedLabel = 'Kopiert' }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={copied ? 'border-primary/40 text-primary' : undefined}
    >
      <IconSwap swapKey={copied ? 'check' : 'copy'} className="size-4">
        {copied ? <Check className="h-4 w-4" strokeWidth={3} /> : <Copy className="h-4 w-4" />}
      </IconSwap>
      <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
    </Button>
  );
}
