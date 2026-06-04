import { vec3 } from 'gl-matrix';
import type { ReadonlyVec3 } from 'gl-matrix';

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

const _cross = vec3.create();

export function rotateAroundAxis(out: vec3, v: ReadonlyVec3, axis: ReadonlyVec3, angle: number): vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dot = vec3.dot(axis, v);

  vec3.cross(_cross, axis, v);
  out[0] = v[0] * c + _cross[0] * s + axis[0] * dot * (1 - c);
  out[1] = v[1] * c + _cross[1] * s + axis[1] * dot * (1 - c);
  out[2] = v[2] * c + _cross[2] * s + axis[2] * dot * (1 - c);
  return out;
}

const _axis = vec3.create();

export function initialNormal3(out: vec3, tangent: ReadonlyVec3, initialNormal?: ReadonlyVec3 | null): vec3 {
  if (initialNormal) {
    vec3.copy(out, initialNormal);
  } else {
    const tx = Math.abs(tangent[0]);
    const ty = Math.abs(tangent[1]);
    const tz = Math.abs(tangent[2]);
    if (tx <= ty && tx <= tz) vec3.set(out, 1, 0, 0);
    else if (ty <= tx && ty <= tz) vec3.set(out, 0, 1, 0);
    else vec3.set(out, 0, 0, 1);
  }
  return out;
}

export function transportNormal3(out: vec3, previousNormal: ReadonlyVec3, previousTangent: ReadonlyVec3, tangent: ReadonlyVec3): vec3 {
  vec3.cross(_axis, previousTangent, tangent);
  if (vec3.len(_axis) > EPSILON) {
    vec3.normalize(_axis, _axis);
    const theta = Math.acos(clamp(vec3.dot(previousTangent, tangent), -1, 1));
    rotateAroundAxis(out, previousNormal, _axis, theta);
  } else {
    vec3.copy(out, previousNormal);
  }
  return out;
}

export function orthonormalize3(outNormal: vec3, outBinormal: vec3, tangent: ReadonlyVec3, normal: ReadonlyVec3): void {
  vec3.cross(outBinormal, tangent, normal);
  if (vec3.len(outBinormal) <= EPSILON) {
    initialNormal3(outNormal, tangent);
    vec3.cross(outBinormal, tangent, outNormal);
  }
  vec3.normalize(outBinormal, outBinormal);
  vec3.cross(outNormal, outBinormal, tangent);
  vec3.normalize(outNormal, outNormal);
}

export default null;
