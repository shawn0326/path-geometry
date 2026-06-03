import { vec3 } from 'gl-matrix';
import type { ReadonlyVec3 } from 'gl-matrix';

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
