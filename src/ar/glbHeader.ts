const GLB_HEADER_BYTES = 12;
/** 'glTF' als uint32 little-endian */
const GLB_MAGIC = 0x46546c67;

export type GlbHeaderResult = { ok: true } | { ok: false; reason: 'magic' | 'version' | 'length' };

/** Prüft die 12 Header-Bytes einer GLB-Datei: Magic 'glTF', Version 2, Länge = Dateigröße */
export function checkGlbHeader(buf: ArrayBuffer, fileSize: number): GlbHeaderResult {
  if (buf.byteLength < GLB_HEADER_BYTES) return { ok: false, reason: 'magic' };
  const view = new DataView(buf);
  if (view.getUint32(0, true) !== GLB_MAGIC) return { ok: false, reason: 'magic' };
  if (view.getUint32(4, true) !== 2) return { ok: false, reason: 'version' };
  if (view.getUint32(8, true) !== fileSize) return { ok: false, reason: 'length' };
  return { ok: true };
}

/** Liest nur die ersten 12 Bytes der Datei und prüft sie */
export async function readGlbHeader(file: File): Promise<GlbHeaderResult> {
  const buf = await readBytes(file.slice(0, GLB_HEADER_BYTES));
  return checkGlbHeader(buf, file.size);
}

/** Blob.arrayBuffer() mit FileReader als Rückfall (ältere Browser, jsdom) */
function readBytes(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}
