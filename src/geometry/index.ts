import { createTube } from './tube';
import { createRibbon } from './ribbon';

/**
 * Geometry builder namespace.
 * Create tube or ribbon geometry along a 3D path.
 *
 * 几何构建命名空间。
 * 沿三维 path 创建管状或带状几何体。
 *
 * @example
 * ```ts
 * const frames = path.buildFrames(myPath, { divisions: 20 });
 * const tube   = geometry.createTube(frames, { radius: 0.5 });
 * const ribbon = geometry.createRibbon(frames, { width: 1 });
 * ```
 */
export const geometry = {
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
