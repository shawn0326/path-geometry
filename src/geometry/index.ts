import { createTube } from './tube';
import { createRibbon } from './ribbon';
import { createExtrudeShape } from './extrude-shape';

/**
 * Geometry builder namespace.
 * Create tube, ribbon or extruded shape geometry.
 *
 * 几何构建命名空间。
 * 创建管状、带状或 shape 挤出几何体。
 *
 * @example
 * ```ts
 * const frames = myPath.buildFrames({ divisions: 20 });
 * const tube   = geometry.createTube(frames, { radius: 0.5 });
 * const ribbon = geometry.createRibbon(frames, { width: 1 });
 * const extrude = geometry.createExtrudeShape({ contour, depth: 2 });
 * ```
 */
export const geometry = {
  /**
   * Build indexed extruded shape geometry from a 2D contour and optional holes.
   * 从二维轮廓和可选孔洞构建索引挤出几何体。
   */
  createExtrudeShape,
  /**
   * Build indexed tube geometry along 3D path frames.
   * 沿三维 path frame 构建索引管状几何体。
   */
  createTube,
  /**
   * Build indexed ribbon geometry along 3D path frames.
   * 沿三维 path frame 构建索引带状几何体。
   */
  createRibbon,
};
