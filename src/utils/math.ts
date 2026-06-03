export const EPSILON = Number.EPSILON;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function ensureFloat32Array(array: Float32Array | undefined, length: number): Float32Array {
  return array && array.length >= length ? array : new Float32Array(length);
}

export function safeCount(count: number): number {
  return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
}
