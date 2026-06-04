import { vec3 } from 'gl-matrix';
import type { ReadonlyVec3 } from 'gl-matrix';
import type { Path } from '../types';
import { cubicBezier } from '../segments/cubic-bezier3';
import { line } from '../segments/line3';
import { quadraticBezier } from '../segments/quadratic-bezier3';
import { path as pathApi } from '../paths/path3';

function equalsStrict(a: ReadonlyVec3, b: ReadonlyVec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

/**
 * Command-style writer for constructing 3D paths.
 * 用于命令式构建三维 path 的 writer。
 */
export class PathWriter {
  private readonly path: Path;
  private currentPoint: vec3 | null = null;
  private subpathStart: vec3 | null = null;

  /**
   * Creates a writer around an existing path or a new empty path.
   * @param path Path to mutate.
   */
  constructor(targetPath: Path = pathApi.create()) {
    this.path = targetPath;
  }

  /**
   * Starts a new subpath at the given point.
   * @param point New current point.
   * @returns This writer.
   */
  moveTo(point: ReadonlyVec3): this {
    this.currentPoint = vec3.clone(point);
    this.subpathStart = vec3.clone(point);
    return this;
  }

  /**
   * Adds a line from the current point to the given point.
   * @param point End point.
   * @returns This writer.
   */
  lineTo(point: ReadonlyVec3): this {
    if (!this.currentPoint) return this.moveTo(point);
    pathApi.addSegment(this.path, line.create(this.currentPoint, point));
    vec3.copy(this.currentPoint, point);
    return this;
  }

  /**
   * Adds a quadratic Bezier segment from the current point.
   * @param control Control point.
   * @param point End point.
   * @returns This writer.
   */
  quadraticTo(control: ReadonlyVec3, point: ReadonlyVec3): this {
    if (!this.currentPoint) return this.moveTo(point);
    pathApi.addSegment(this.path, quadraticBezier.create(this.currentPoint, control, point));
    vec3.copy(this.currentPoint, point);
    return this;
  }

  /**
   * Adds a cubic Bezier segment from the current point.
   * @param control1 First control point.
   * @param control2 Second control point.
   * @param point End point.
   * @returns This writer.
   */
  cubicTo(control1: ReadonlyVec3, control2: ReadonlyVec3, point: ReadonlyVec3): this {
    if (!this.currentPoint) return this.moveTo(point);
    pathApi.addSegment(this.path, cubicBezier.create(this.currentPoint, control1, control2, point));
    vec3.copy(this.currentPoint, point);
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
    pathApi.clear(this.path);
    this.currentPoint = null;
    this.subpathStart = null;
    return this;
  }

  /**
   * Returns the underlying mutable path.
   * @returns The writer's path.
   */
  toPath(): Path {
    return this.path;
  }
}
