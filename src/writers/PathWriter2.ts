import { vec2 } from 'gl-matrix';
import type { ReadonlyVec2 } from 'gl-matrix';
import type { Path2 } from '../types';
import { cubicBezier2 } from '../segments/cubic-bezier2';
import { line2 } from '../segments/line2';
import { quadraticBezier2 } from '../segments/quadratic-bezier2';
import { path2 } from '../paths/path2';

function equalsStrict(a: ReadonlyVec2, b: ReadonlyVec2): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/**
 * Command-style writer for constructing 2D paths.
 * 用于命令式构建二维 path 的 writer。
 */
export class PathWriter2 {
  private readonly path: Path2;
  private currentPoint: vec2 | null = null;
  private subpathStart: vec2 | null = null;

  /**
   * Creates a writer around an existing path or a new empty path.
   * @param path Path to mutate.
   */
  constructor(path: Path2 = path2.create()) {
    this.path = path;
  }

  /**
   * Starts a new subpath at the given point.
   * @param point New current point.
   * @returns This writer.
   */
  moveTo(point: ReadonlyVec2): this {
    this.currentPoint = vec2.clone(point);
    this.subpathStart = vec2.clone(point);
    return this;
  }

  /**
   * Adds a line from the current point to the given point.
   * @param point End point.
   * @returns This writer.
   */
  lineTo(point: ReadonlyVec2): this {
    if (!this.currentPoint) return this.moveTo(point);
    path2.addSegment(this.path, line2.create(this.currentPoint, point));
    vec2.copy(this.currentPoint, point);
    return this;
  }

  /**
   * Adds a quadratic Bezier segment from the current point.
   * @param control Control point.
   * @param point End point.
   * @returns This writer.
   */
  quadraticTo(control: ReadonlyVec2, point: ReadonlyVec2): this {
    if (!this.currentPoint) return this.moveTo(point);
    path2.addSegment(this.path, quadraticBezier2.create(this.currentPoint, control, point));
    vec2.copy(this.currentPoint, point);
    return this;
  }

  /**
   * Adds a cubic Bezier segment from the current point.
   * @param control1 First control point.
   * @param control2 Second control point.
   * @param point End point.
   * @returns This writer.
   */
  cubicTo(control1: ReadonlyVec2, control2: ReadonlyVec2, point: ReadonlyVec2): this {
    if (!this.currentPoint) return this.moveTo(point);
    path2.addSegment(this.path, cubicBezier2.create(this.currentPoint, control1, control2, point));
    vec2.copy(this.currentPoint, point);
    return this;
  }

  /**
   * Closes the current subpath with a line segment when needed.
   * @returns This writer.
   */
  close(): this {
    if (this.currentPoint && this.subpathStart && !equalsStrict(this.currentPoint, this.subpathStart)) {
      this.lineTo(this.subpathStart);
    }
    return this;
  }

  /**
   * Clears the underlying path and writer state.
   * @returns This writer.
   */
  clear(): this {
    path2.clear(this.path);
    this.currentPoint = null;
    this.subpathStart = null;
    return this;
  }

  /**
   * Returns the underlying mutable path.
   * @returns The writer's path.
   */
  toPath(): Path2 {
    return this.path;
  }
}
