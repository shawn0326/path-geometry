import type { vec2, ReadonlyVec2 } from 'gl-matrix';

/**
 * Helpers for deriving 2D normals from tangents.
 * 中文：用于从二维切线推导法线的工具集合。
 */
export const normal2 = {
  /**
   * Computes a perpendicular 2D normal from a tangent.
   * @param out Receives the normal.
   * @param tangent Source tangent.
   * @param side Direction multiplier. The default returns [-y, x].
   * @returns The out vector.
   */
  fromTangent(out: vec2, tangent: ReadonlyVec2, side = 1): vec2 {
    out[0] = -tangent[1] * side;
    out[1] = tangent[0] * side;
    return out;
  }
};
