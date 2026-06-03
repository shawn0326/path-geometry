import { vec2 } from 'gl-matrix';
import type { ReadonlyVec2 } from 'gl-matrix';
import type { BeveledCurveOptions, Path2, PointPreprocessOptions, PolylineOptions, Segment2, SmoothCurveOptions } from '../types';
import { cubicBezier2 } from '../segments/cubic-bezier2';
import { line2 } from '../segments/line2';
import { quadraticBezier2 } from '../segments/quadratic-bezier2';
import { getSegmentLength, segment2PointAt } from '../segments/shared';
import { clamp } from '../utils/math';
import { getPathLength2, getPathLengths2, markPathDirty, path2PointAtDistance, path2TangentAtDistance } from './path-common';

const _p2a = vec2.create();
const _p2b = vec2.create();

function vecEquals(a: ReadonlyVec2, b: ReadonlyVec2): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function preprocessInputPoints(points: ReadonlyVec2[], options: PointPreprocessOptions = {}): vec2[] {
  const removeConsecutiveDuplicates = options.removeConsecutiveDuplicates !== false;
  const removeClosingDuplicate = options.removeClosingDuplicate ?? options.close === true;
  const normalized: vec2[] = [];
  for (const point of points) {
    const previous = normalized[normalized.length - 1];
    if (!removeConsecutiveDuplicates || !previous || !vecEquals(previous, point)) {
      normalized.push(vec2.clone(point));
    }
  }
  if (removeClosingDuplicate && normalized.length > 1 && vecEquals(normalized[0]!, normalized[normalized.length - 1]!)) {
    normalized.pop();
  }
  return normalized;
}

function componentMin(out: vec2, a: ReadonlyVec2, b: ReadonlyVec2): vec2 {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  return out;
}

function componentMax(out: vec2, a: ReadonlyVec2, b: ReadonlyVec2): vec2 {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  return out;
}

function clampPointBetween(out: vec2, value: ReadonlyVec2, a: ReadonlyVec2, b: ReadonlyVec2): vec2 {
  componentMax(_p2a, a, b);
  componentMin(_p2b, value, _p2a);
  componentMin(_p2a, a, b);
  return componentMax(out, _p2b, _p2a);
}

/**
 * Operations for 2D paths made of line and Bezier segments.
 * 中文：由直线和 Bezier segment 组成的二维 path 操作集合。
 */
export const path2 = {
  /**
   * Creates an empty 2D path.
   * @returns A new path with no segments.
   */
  create(): Path2 {
    return { segments: [], _needsUpdate: true };
  },

  /**
   * Removes all segments and marks path metrics dirty.
   * @param path Path to clear.
   * @returns The same path object.
   */
  clear(path: Path2): Path2 {
    path.segments.length = 0;
    markPathDirty(path);
    return path;
  },

  /**
   * Appends a segment and marks path metrics dirty.
   * @param path Path to mutate.
   * @param segment Segment to append.
   * @returns The same path object.
   */
  addSegment(path: Path2, segment: Segment2): Path2 {
    path.segments.push(segment);
    markPathDirty(path);
    return path;
  },

  /**
   * Marks cached path metrics dirty.
   * @param path Path whose metrics should be recomputed lazily.
   * @param recursive Also mark all child segment metrics dirty.
   */
  markDirty(path: Path2, recursive = false): void {
    markPathDirty(path, recursive);
  },

  /**
   * Clones and optionally removes duplicate points before path construction.
   * @param points Input points.
   * @param options Preprocessing options.
   * @returns A normalized point array.
   */
  preprocessPoints(points: ReadonlyVec2[], options: PointPreprocessOptions = {}): vec2[] {
    return preprocessInputPoints(points, options);
  },

  /**
   * Replaces the path with straight line segments through the given points.
   * @param path Path to mutate.
   * @param points Source points.
   * @param options Polyline options.
   * @returns The same path object.
   */
  setPolylines(path: Path2, points: ReadonlyVec2[], options: PolylineOptions = {}): Path2 {
    path.segments.length = 0;
    const close = options.close === true;
    if (points.length < 2) {
      markPathDirty(path);
      return path;
    }

    const lastIndex = points.length - 1;
    const segments = close && !vecEquals(points[0]!, points[lastIndex]!) ? points.length : lastIndex;

    for (let i = 0; i < segments; i++) {
      path.segments.push(line2.create(points[i]!, i === lastIndex ? points[0]! : points[i + 1]!));
    }
    markPathDirty(path);
    return path;
  },

  /**
   * Replaces the path with t3d-style smooth cubic curves through the given points.
   * @param path Path to mutate.
   * @param points Source points.
   * @param options Smooth curve options.
   * @returns The same path object.
   */
  setSmoothCurves(path: Path2, points: ReadonlyVec2[], options: SmoothCurveOptions = {}): Path2 {
    const smooth = options.smooth || 0;
    if (points.length < 2 || smooth === 0 || points.length === 2) {
      return this.setPolylines(path, points, options);
    }

    path.segments.length = 0;
    const cp0 = vec2.clone(points[0]!);
    const cp1 = vec2.create();
    const prev = vec2.create();
    const next = vec2.create();
    const nextCp0 = vec2.create();
    const v1 = vec2.create();
    const v2 = vec2.create();

    for (let i = 0, l = points.length; i < l; i++) {
      const current = points[i]!;
      if (i === 0) {
        vec2.copy(cp0, current);
      } else if (i === l - 1) {
        path.segments.push(cubicBezier2.create(points[i - 1]!, cp0, current, current));
      } else {
        vec2.copy(next, points[i + 1]!);
        vec2.copy(prev, points[i - 1]!);

        const lenPrevSeg = vec2.len(vec2.sub(v1, current, prev));
        const lenNextSeg = vec2.len(vec2.sub(v2, next, current));

        const ratioNextSeg = lenNextSeg / (lenNextSeg + lenPrevSeg);
        vec2.sub(v1, next, prev);
        vec2.scaleAndAdd(cp1, current, v1, -smooth * (1 - ratioNextSeg));
        vec2.scaleAndAdd(nextCp0, current, v1, smooth * ratioNextSeg);
        clampPointBetween(nextCp0, nextCp0, next, current);

        vec2.sub(v1, nextCp0, current);
        vec2.scaleAndAdd(cp1, current, v1, -lenPrevSeg / lenNextSeg);
        clampPointBetween(cp1, cp1, prev, current);

        vec2.sub(v1, current, cp1);
        vec2.scaleAndAdd(nextCp0, current, v1, lenNextSeg / lenPrevSeg);
        path.segments.push(cubicBezier2.create(prev, cp0, cp1, current));
        vec2.copy(cp0, nextCp0);
      }
    }

    markPathDirty(path);
    return path;
  },

  /**
   * Replaces the path with t3d-style beveled line/quadratic segments.
   * @param path Path to mutate.
   * @param points Source points.
   * @param options Beveled curve options.
   * @returns The same path object.
   */
  setBeveledCurves(path: Path2, points: ReadonlyVec2[], options: BeveledCurveOptions = {}): Path2 {
    const bevelRadius = options.bevelRadius || 0;
    const close = options.close || false;
    if (points.length < 2 || bevelRadius === 0 || points.length === 2) {
      return this.setPolylines(path, points, options);
    }

    path.segments.length = 0;
    const lastIndex = points.length - 1;
    const segments = close && !vecEquals(points[0]!, points[lastIndex]!) ? points.length : lastIndex;
    const p0 = vec2.clone(points[0]!);
    const lastDir = vec2.create();
    const nextDir = vec2.create();

    for (let i = 0; i < segments; i++) {
      const p1 = points[(i + 1) % (lastIndex + 1)]!;
      const p2 = points[(i + 2) % (lastIndex + 1)]!;
      if (i === segments - 1 && !close) {
        path.segments.push(line2.create(p0, p1));
        vec2.copy(p0, p1);
        break;
      }

      vec2.sub(lastDir, p1, p0);
      vec2.sub(nextDir, p2, p1);
      const lastDirLength = vec2.len(lastDir);
      const nextDirLength = vec2.len(nextDir);

      const v0Dist = Math.min((i === 0 ? lastDirLength / 2 : lastDirLength) * 0.999999, bevelRadius);
      const v2Dist = Math.min((nextDirLength / 2) * 0.999999, bevelRadius);
      vec2.normalize(lastDir, lastDir);
      vec2.normalize(nextDir, nextDir);

      const lineEnd = vec2.scaleAndAdd(vec2.create(), p1, lastDir, -v0Dist);
      path.segments.push(line2.create(p0, lineEnd));

      const bezierEnd = vec2.scaleAndAdd(vec2.create(), p1, nextDir, v2Dist);
      path.segments.push(quadraticBezier2.create(lineEnd, p1, bezierEnd));
      vec2.copy(p0, bezierEnd);
    }

    if (close && path.segments[0]?.type === 'line') vec2.copy(path.segments[0].p0, p0);
    markPathDirty(path);
    return path;
  },

  /**
   * Returns the total approximate path length.
   * @param path Path to measure.
   * @returns Total path length.
   */
  getLength(path: Path2): number {
    return getPathLength2(path);
  },

  /**
   * Returns cumulative lengths at the end of each segment.
   * @param path Path to measure.
   * @returns Path-level cumulative length table.
   */
  getLengths(path: Path2): number[] {
    return getPathLengths2(path);
  },

  /**
   * Evaluates a point by normalized path arc length.
   * @param out Receives the evaluated point.
   * @param path Path to evaluate.
   * @param u Normalized path arc-length parameter in [0, 1].
   * @returns The out vector.
   */
  pointAtU(out: vec2, path: Path2, u: number): vec2 {
    return this.pointAtDistance(out, path, clamp(u, 0, 1) * this.getLength(path));
  },

  /**
   * Evaluates a normalized tangent by normalized path arc length.
   * @param out Receives the tangent.
   * @param path Path to evaluate.
   * @param u Normalized path arc-length parameter in [0, 1].
   * @returns The out vector.
   */
  tangentAtU(out: vec2, path: Path2, u: number): vec2 {
    return this.tangentAtDistance(out, path, clamp(u, 0, 1) * this.getLength(path));
  },

  /**
   * Evaluates a point by absolute distance along the path.
   * @param out Receives the evaluated point.
   * @param path Path to evaluate.
   * @param distance Distance along the path.
   * @returns The out vector.
   */
  pointAtDistance(out: vec2, path: Path2, distance: number): vec2 {
    return path2PointAtDistance(out, path, distance);
  },

  /**
   * Evaluates a normalized tangent by absolute distance along the path.
   * @param out Receives the tangent.
   * @param path Path to evaluate.
   * @param distance Distance along the path.
   * @returns The out vector.
   */
  tangentAtDistance(out: vec2, path: Path2, distance: number): vec2 {
    return path2TangentAtDistance(out, path, distance);
  },

  /**
   * Samples path points by each segment's raw parameter.
   * @param path Path to sample.
   * @param divisions Number of divisions for non-line segments.
   * @returns Sampled points with intermediate duplicate joins omitted.
   */
  getPoints(path: Path2, divisions = 12): vec2[] {
    const points: vec2[] = [];
    const resolvedDivisions = Math.max(1, Math.floor(divisions));
    for (let i = 0; i < path.segments.length; i++) {
      const segment = path.segments[i]!;
      const resolution = segment.type === 'line' ? 1 : resolvedDivisions;
      const isLast = i === path.segments.length - 1;
      const limit = isLast ? resolution : resolution - 1;
      for (let j = 0; j <= limit; j++) {
        const point = vec2.create();
        segment2PointAt(point, segment, j / resolution);
        points.push(point);
      }
    }
    return points;
  },

  /**
   * Samples path points at approximately even arc-length spacing.
   * @param path Path to sample.
   * @param divisions Number of spacing divisions.
   * @returns Arc-length-spaced points.
   */
  getSpacedPoints(path: Path2, divisions = 5): vec2[] {
    const points: vec2[] = [];
    for (let i = 0; i <= divisions; i++) {
      const point = vec2.create();
      this.pointAtU(point, path, divisions === 0 ? 0 : i / divisions);
      points.push(point);
    }
    return points;
  }
};

export type { Path2 };
