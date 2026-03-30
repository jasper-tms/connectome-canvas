import { exportAsYaml, importFromText } from './serialize';
import type { CanvasState } from '../types';

function uint8ToBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlToUint8(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function compress(data: string): Promise<Uint8Array> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(data: Uint8Array): Promise<string> {
  const stream = new Blob([data as any]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Response(stream).text();
}

export async function encodeState(state: CanvasState): Promise<string> {
  const yaml = exportAsYaml(state);
  const compressed = await compress(yaml);
  return uint8ToBase64url(compressed);
}

export async function decodeState(encoded: string): Promise<CanvasState> {
  const bytes = base64urlToUint8(encoded);
  const yaml = await decompress(bytes);
  return importFromText(yaml);
}

export function getStateFromUrl(): string | null {
  const hash = window.location.hash;
  if (hash.startsWith('#state=')) {
    return hash.slice(7);
  }
  return null;
}

export function setUrlState(encoded: string) {
  window.history.replaceState(null, '', `#state=${encoded}`);
}
