import { vec3 } from './vector';
import type { Vector3, ReadonlyVector3 } from './vector';

export const EPSILON = Number.EPSILON;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}


const _cross = vec3.create();

export function rotateAroundAxis(out: Vector3, v: ReadonlyVector3, axis: ReadonlyVector3, angle: number): Vector3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dot = vec3.dot(axis, v);

  vec3.cross(_cross, axis, v);
  out[0] = v[0]! * c + _cross[0]! * s + axis[0]! * dot * (1 - c);
  out[1] = v[1]! * c + _cross[1]! * s + axis[1]! * dot * (1 - c);
  out[2] = v[2]! * c + _cross[2]! * s + axis[2]! * dot * (1 - c);
  return out;
}

export default null;
