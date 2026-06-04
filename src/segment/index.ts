import { createLine } from './line';
import { createQuadraticBezier } from './quadratic-bezier';
import { createCubicBezier } from './cubic-bezier';

/**
 * Segment factory namespace.
 * Create typed 3D path segments: line, quadratic Bezier, or cubic Bezier.
 *
 * Segment 工厂命名空间。
 * 创建类型化的三维路径段：直线、二次 Bezier 或三次 Bezier。
 *
 * @example
 * ```ts
 * const line = segment.createLine(p0, p1);
 * const quad = segment.createQuadraticBezier(p0, p1, p2);
 * const cubic = segment.createCubicBezier(p0, p1, p2, p3);
 * ```
 */
export const segment = {
  /**
   * Create a 3D straight line segment.
   * 创建一段三维直线 segment。
   */
  createLine,
  /**
   * Create a 3D quadratic Bezier segment.
   * 创建一段三维二次 Bezier segment。
   */
  createQuadraticBezier,
  /**
   * Create a 3D cubic Bezier segment.
   * 创建一段三维三次 Bezier segment。
   */
  createCubicBezier
};
