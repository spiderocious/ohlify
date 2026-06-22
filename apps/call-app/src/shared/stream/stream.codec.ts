import type { StreamMessage } from './stream.types.js';

const enc = new TextEncoder();
const dec = new TextDecoder();

const MAX_BYTES = 512;

export function encodeStreamMsg(msg: StreamMessage): Uint8Array | null {
  const json = JSON.stringify(msg);
  const bytes = enc.encode(json);
  if (bytes.byteLength > MAX_BYTES) {
    console.warn('[stream] message exceeds 512 bytes, dropping', msg.type);
    return null;
  }
  return bytes;
}

export function decodeStreamMsg(data: Uint8Array): StreamMessage | null {
  try {
    const json = dec.decode(data);
    const parsed = JSON.parse(json) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return null;
    const m = parsed as Record<string, unknown>;
    if (typeof m['type'] !== 'string') return null;
    return m as unknown as StreamMessage;
  } catch {
    return null;
  }
}
