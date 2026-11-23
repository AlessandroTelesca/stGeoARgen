/** Stabiler 32-Bit-Hash (FNV-1a) als Base-36-String, z. B. für Schlüssel aus Texten */
export function stableHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
