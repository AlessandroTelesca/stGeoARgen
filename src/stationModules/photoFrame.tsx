import { asset } from '../lib/asset';
import type { PhotoModule } from './types';

/**
 * Rahmen des Fotomoments: gleiche Gestaltung als Overlay (Live-Kamera, Editor-Vorschau) und als
 * Canvas-Komposition (fertiges Foto). Das Overlay misst alles in `cqw` (Breite des Fotofelds),
 * die Komposition in Pixeln bei 1080 px Breite (1 cqw = 10,8 px) – so sehen beide gleich aus.
 */

export type PhotoFrame = PhotoModule['frame'];

/** Seitenverhältnis (Breite / Höhe) des Fotos */
export const PHOTO_ASPECT = 3 / 4;
const W = 1080;
const H = 1440;
const cqw = (value: number) => (value * W) / 100;

/** Datum für den Rahmen, z. B. 30.10.2026 */
export function photoDate(lang: 'de' | 'en', date = new Date()): string {
  return date.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Dateiname zum Speichern: st-georgen-2026-10-30.jpg */
export function photoFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `st-georgen-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.jpg`;
}

/** Georgi-Signet auf grünem Kreis */
function Seal({ size, ring = '' }: { size: string; ring?: string }) {
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center rounded-full bg-primary"
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 ${ring} white inset` : undefined }}
    >
      <img src={asset('/Logo.svg')} alt="" className="h-[52%] w-auto object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
    </span>
  );
}

/** Rahmen als Overlay über dem Foto; das Elternelement braucht `@container` und `relative` */
export function PhotoFrameOverlay({ frame, caption, date }: { frame: PhotoFrame; caption: string; date: string }) {
  if (frame === 'polaroid') {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 border-[5.55cqw] border-b-[22.2cqw] border-white" />
        <div className="absolute inset-x-[5.55cqw] bottom-0 flex h-[22.2cqw] items-center gap-[3cqw]">
          <div className="min-w-0 flex-1 text-black/85">
            <p className="line-clamp-2 break-words text-[5.4cqw] font-extrabold leading-[1.15]">{caption}</p>
            <p className="mt-[0.8cqw] text-[3.3cqw] font-semibold leading-[1.25] tabular-nums text-black/55">{date}</p>
          </div>
          <Seal size="12cqw" />
        </div>
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/75 to-transparent" />
      <div className="absolute inset-x-[5cqw] bottom-[5cqw] flex items-center gap-[3.5cqw]">
        <Seal size="15cqw" ring="0.8cqw" />
        <div className="min-w-0 flex-1 text-white">
          <p className="line-clamp-2 break-words text-[5.6cqw] font-extrabold leading-[1.15]">{caption}</p>
          <p className="mt-[0.8cqw] text-[3.3cqw] font-semibold leading-[1.25] tabular-nums text-white/80">{date}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Canvas-Komposition
// ---------------------------------------------------------------------------------------------

const FONT_FAMILY = '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif';
let whiteLogo: Promise<HTMLCanvasElement | null> | null = null;

/** Signet in Weiß (ohne `ctx.filter`, das Safari nicht kennt); einmal geladen und gemerkt */
function loadWhiteLogo(): Promise<HTMLCanvasElement | null> {
  whiteLogo ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = 4;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round((img.naturalWidth || 53) * scale);
      canvas.height = Math.round((img.naturalHeight || 59) * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    img.onerror = () => resolve(null);
    img.src = asset('/Logo.svg');
  });
  return whiteLogo;
}

/** Bricht Text in höchstens `maxLines` Zeilen um; Überlanges endet mit „…“ */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = `${kept[maxLines - 1]}…`;
    while (last.length > 1 && ctx.measureText(last).width > maxWidth) last = `${last.slice(0, -2)}…`;
    kept[maxLines - 1] = last;
    return kept;
  }
  return lines;
}

function drawSeal(ctx: CanvasRenderingContext2D, logo: HTMLCanvasElement | null, cx: number, cy: number, radius: number, ringWidth: number, primary: string) {
  if (ringWidth > 0) {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - ringWidth, 0, Math.PI * 2);
  ctx.fill();
  if (logo) {
    const height = radius * 2 * 0.52;
    const width = height * (logo.width / logo.height);
    ctx.drawImage(logo, cx - width / 2, cy - height / 2, width, height);
  }
}

/** Zeichnet Beschriftung und Datum als Block, vertikal um `centerY` zentriert */
function drawCaption(ctx: CanvasRenderingContext2D, o: { x: number; maxWidth: number; centerY: number; caption: string; date: string; captionSize: number; dateSize: number; captionColor: string; dateColor: string }) {
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `800 ${o.captionSize}px ${FONT_FAMILY}`;
  const lines = wrapText(ctx, o.caption, o.maxWidth, 2);
  const captionLine = o.captionSize * 1.15;
  const dateLine = o.dateSize * 1.25;
  const gap = cqw(0.8);
  const height = lines.length * captionLine + gap + dateLine;
  let y = o.centerY - height / 2;
  ctx.fillStyle = o.captionColor;
  for (const line of lines) {
    ctx.fillText(line, o.x, y + captionLine / 2 + o.captionSize * 0.35);
    y += captionLine;
  }
  y += gap;
  ctx.font = `600 ${o.dateSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = o.dateColor;
  ctx.fillText(o.date, o.x, y + dateLine / 2 + o.dateSize * 0.35);
}

/** Setzt das Kamerabild (Cover-Ausschnitt, bei Selfie gespiegelt) und den Rahmen zu einem JPEG zusammen */
export async function composePhoto(o: { video: HTMLVideoElement; mirror: boolean; frame: PhotoFrame; caption: string; date: string }): Promise<Blob | null> {
  const { video } = o;
  if (!video.videoWidth || !video.videoHeight) return null;
  try {
    await document.fonts?.load(`800 60px ${FONT_FAMILY}`);
    await document.fonts?.load(`600 36px ${FONT_FAMILY}`);
  } catch {
    // Ohne die Schrift nimmt das Canvas die System-Schrift
  }
  const logo = await loadWhiteLogo();
  const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || 'green';

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Foto: Cover-Ausschnitt im Seitenverhältnis 3:4
  const scale = Math.max(W / video.videoWidth, H / video.videoHeight);
  const sw = W / scale;
  const sh = H / scale;
  const sx = (video.videoWidth - sw) / 2;
  const sy = (video.videoHeight - sh) / 2;
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  if (o.mirror) {
    ctx.translate(W, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, W, H);
  ctx.restore();

  if (o.frame === 'polaroid') {
    const side = cqw(5.55);
    const bottom = cqw(22.2);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, W, side);
    ctx.fillRect(0, 0, side, H);
    ctx.fillRect(W - side, 0, side, H);
    ctx.fillRect(0, H - bottom, W, bottom);
    const sealRadius = cqw(12) / 2;
    const gap = cqw(3);
    drawSeal(ctx, logo, W - side - sealRadius, H - bottom / 2, sealRadius, 0, primary);
    drawCaption(ctx, {
      x: side,
      maxWidth: W - side * 2 - sealRadius * 2 - gap,
      centerY: H - bottom / 2,
      caption: o.caption,
      date: o.date,
      captionSize: cqw(5.4),
      dateSize: cqw(3.3),
      captionColor: 'rgba(0, 0, 0, 0.85)',
      dateColor: 'rgba(0, 0, 0, 0.55)',
    });
  } else {
    const band = ctx.createLinearGradient(0, H * 0.7, 0, H);
    band.addColorStop(0, 'rgba(0, 0, 0, 0)');
    band.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
    ctx.fillStyle = band;
    ctx.fillRect(0, H * 0.7, W, H * 0.3);
    const margin = cqw(5);
    const sealRadius = cqw(15) / 2;
    const gap = cqw(3.5);
    const centerY = H - margin - sealRadius;
    drawSeal(ctx, logo, margin + sealRadius, centerY, sealRadius, cqw(0.8), primary);
    const textX = margin + sealRadius * 2 + gap;
    drawCaption(ctx, {
      x: textX,
      maxWidth: W - margin - textX,
      centerY,
      caption: o.caption,
      date: o.date,
      captionSize: cqw(5.6),
      dateSize: cqw(3.3),
      captionColor: 'white',
      dateColor: 'rgba(255, 255, 255, 0.8)',
    });
  }

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9));
}
