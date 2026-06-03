import { vec3 } from 'gl-matrix';
import type { ReadonlyVec3 } from 'gl-matrix';
import { clamp, EPSILON } from '../utils/math';
import { rotateAroundAxis } from '../utils/rotate';

const _axis = vec3.create();

/**
 * Helpers for constructing and transporting 3D frame vectors.
 * 中文：用于构建和传递三维 frame 向量的工具集合。
 */
export const frame3 = {
  /**
   * Chooses or copies an initial normal for a tangent.
   * @param out Receives the initial normal.
   * @param tangent Unit tangent direction.
   * @param initialNormal Optional caller-provided normal.
   * @returns The out vector.
   */
  initialNormal(out: vec3, tangent: ReadonlyVec3, initialNormal?: ReadonlyVec3 | null): vec3 {
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
  },

  /**
   * Transports a normal from one tangent direction to the next.
   * @param out Receives the transported normal.
   * @param previousNormal Previous normal.
   * @param previousTangent Previous unit tangent.
   * @param tangent Next unit tangent.
   * @returns The out vector.
   */
  transportNormal(out: vec3, previousNormal: ReadonlyVec3, previousTangent: ReadonlyVec3, tangent: ReadonlyVec3): vec3 {
    vec3.cross(_axis, previousTangent, tangent);
    if (vec3.len(_axis) > EPSILON) {
      vec3.normalize(_axis, _axis);
      const theta = Math.acos(clamp(vec3.dot(previousTangent, tangent), -1, 1));
      rotateAroundAxis(out, previousNormal, _axis, theta);
    } else {
      vec3.copy(out, previousNormal);
    }
    return out;
  },

  /**
   * Produces an orthonormal normal/binormal pair for a tangent.
   * @param outNormal Receives the normalized normal.
   * @param outBinormal Receives the normalized binormal.
   * @param tangent Unit tangent direction.
   * @param normal Candidate normal direction.
   */
  orthonormalize(outNormal: vec3, outBinormal: vec3, tangent: ReadonlyVec3, normal: ReadonlyVec3): void {
    vec3.cross(outBinormal, tangent, normal);
    if (vec3.len(outBinormal) <= EPSILON) {
      this.initialNormal(outNormal, tangent);
      vec3.cross(outBinormal, tangent, outNormal);
    }
    vec3.normalize(outBinormal, outBinormal);
    vec3.cross(outNormal, outBinormal, tangent);
    vec3.normalize(outNormal, outNormal);
  }
};
