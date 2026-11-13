import { describe, expect, it } from 'vitest';
import { checkGlbHeader, readGlbHeader } from '../../src/ar/glbHeader';

function header({ magic = 0x46546c67, version = 2, length = 100 } = {}): ArrayBuffer {
  const buf = new ArrayBuffer(12);
  const view = new DataView(buf);
  view.setUint32(0, magic, true);
  view.setUint32(4, version, true);
  view.setUint32(8, length, true);
  return buf;
}

describe('checkGlbHeader', () => {
  it('akzeptiert einen gültigen Header', () => {
    expect(checkGlbHeader(header(), 100)).toEqual({ ok: true });
  });

  it('erkennt ein falsches Magic', () => {
    expect(checkGlbHeader(header({ magic: 0x12345678 }), 100)).toEqual({ ok: false, reason: 'magic' });
  });

  it('meldet zu kurze Daten als Magic-Fehler', () => {
    expect(checkGlbHeader(new ArrayBuffer(4), 100)).toEqual({ ok: false, reason: 'magic' });
  });

  it('erkennt Version 1', () => {
    expect(checkGlbHeader(header({ version: 1 }), 100)).toEqual({ ok: false, reason: 'version' });
  });

  it('erkennt eine falsche Länge', () => {
    expect(checkGlbHeader(header({ length: 99 }), 100)).toEqual({ ok: false, reason: 'length' });
  });
});

describe('readGlbHeader', () => {
  it('liest die ersten 12 Bytes der Datei', async () => {
    const body = new Uint8Array(100);
    body.set(new Uint8Array(header()), 0);
    expect(await readGlbHeader(new File([body], 'a.glb'))).toEqual({ ok: true });
    expect(await readGlbHeader(new File([body.slice(0, 90)], 'a.glb'))).toEqual({ ok: false, reason: 'length' });
  });
});
