import { vec3 } from 'gl-matrix';
import type { ReadonlyVec3 } from 'gl-matrix';
import type { BeveledCurveOptions, BuildFramesOptions, Path, PathFrames, PointPreprocessOptions, PolylineOptions, Segment, SmoothCurveOptions } from '../types';
import { cubicBezier } from '../segments/cubic-bezier';
import { line } from '../segments/line';
import { quadraticBezier } from '../segments/quadratic-bezier';
import { getSegmentLength, mapUToT, markSegmentDirty, segmentOps, segmentPointAt, segmentTangentAt } from '../segments/shared';
import { initialNormal3, orthonormalize3, transportNormal3 } from '../utils/frame';
import { clamp, EPSILON } from '../utils/math';
import { rotateAroundAxis } from '../utils/rotate';

const _p3a = vec3.create();
const _p3b = vec3.create();
const _axis = vec3.create();

function vecEquals(a: ReadonlyVec3, b: ReadonlyVec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

function preprocessInputPoints(points: ReadonlyVec3[], options: PointPreprocessOptions = {}): vec3[] {
  const removeConsecutiveDuplicates = options.removeConsecutiveDuplicates !== false;
  const removeClosingDuplicate = options.removeClosingDuplicate ?? options.close === true;
  const normalized: vec3[] = [];
  for (const point of points) {
    const previous = normalized[normalized.length - 1];
    if (!removeConsecutiveDuplicates || !previous || !vecEquals(previous, point)) {
      normalized.push(vec3.clone(point));
    }
  }
  if (removeClosingDuplicate && normalized.length > 1 && vecEquals(normalized[0]!, normalized[normalized.length - 1]!)) {
    normalized.pop();
  }
  return normalized;
}

function componentMin(out: vec3, a: ReadonlyVec3, b: ReadonlyVec3): vec3 {
  out[0] = Math.min(a[0], b[0]);
  out[1] = Math.min(a[1], b[1]);
  out[2] = Math.min(a[2], b[2]);
  return out;
}

function componentMax(out: vec3, a: ReadonlyVec3, b: ReadonlyVec3): vec3 {
  out[0] = Math.max(a[0], b[0]);
  out[1] = Math.max(a[1], b[1]);
  out[2] = Math.max(a[2], b[2]);
  return out;
}

function clampPointBetween(out: vec3, value: ReadonlyVec3, a: ReadonlyVec3, b: ReadonlyVec3): vec3 {
  componentMax(_p3a, a, b);
  componentMin(_p3b, value, _p3a);
  componentMin(_p3a, a, b);
  return componentMax(out, _p3b, _p3a);
}

function normalizeOrFallback(out: vec3, fallback?: ReadonlyVec3): vec3 {
  if (vec3.len(out) <= EPSILON) {
    if (fallback) vec3.copy(out, fallback);
    else vec3.set(out, 1, 0, 0);
    return out;
  }
  return vec3.normalize(out, out);
}

function markPathDirty(path: Path, recursive = false): void {
  path._needsUpdate = true;
  if (path._metrics) path._metrics.needsUpdate = true;
  if (recursive) {
    for (const segment of path.segments) {
      markSegmentDirty(segment);
    }
  }
}

function getPathLengths(path: Path): number[] {
  const metrics = path._metrics;
  if (metrics && metrics.segmentCount === path.segments.length && !metrics.needsUpdate && !path._needsUpdate) {
    return metrics.lengths;
  }
  const lengths: number[] = [];
  let sum = 0;
  for (const segment of path.segments) {
    sum += getSegmentLength(segment, segmentOps);
    lengths.push(sum);
  }
  path._metrics = { lengths, totalLength: sum, segmentCount: path.segments.length, needsUpdate: false };
  path._needsUpdate = false;
  return lengths;
}

function getPathLength(path: Path): number {
  const lengths = getPathLengths(path);
  return lengths[lengths.length - 1] ?? 0;
}

function findSegmentDistance(lengths: number[], distance: number): { index: number; localDistance: number } {
  if (lengths.length === 0) return { index: -1, localDistance: 0 };
  const total = lengths[lengths.length - 1] ?? 0;
  const d = clamp(distance, 0, total);
  for (let i = 0; i < lengths.length; i++) {
    const current = lengths[i] ?? 0;
    if (current >= d) {
      const previous = i === 0 ? 0 : lengths[i - 1] ?? 0;
      return { index: i, localDistance: d - previous };
    }
  }
  return { index: lengths.length - 1, localDistance: total - (lengths[lengths.length - 2] ?? 0) };
}

function pathPointAtDistance(out: vec3, path: Path, distance: number): vec3 {
  const lengths = getPathLengths(path);
  const found = findSegmentDistance(lengths, distance);
  const segment = path.segments[found.index];
  if (!segment) return out;
  const segmentLength = getSegmentLength(segment, segmentOps);
  const u = segmentLength === 0 ? 0 : found.localDistance / segmentLength;
  const t = segment.type === 'line' ? u : mapUToT(segment, u, found.localDistance, segmentOps);
  return segmentPointAt(out, segment, t);
}

function pathTangentAtDistance(out: vec3, path: Path, distance: number): vec3 {
  const lengths = getPathLengths(path);
  const found = findSegmentDistance(lengths, distance);
  const segment = path.segments[found.index];
  if (!segment) return out;
  const segmentLength = getSegmentLength(segment, segmentOps);
  const u = segmentLength === 0 ? 0 : found.localDistance / segmentLength;
  const t = segment.type === 'line' ? u : mapUToT(segment, u, found.localDistance, segmentOps);
  return segmentTangentAt(out, segment, t);
}

/**
 * Operations for 3D paths made of line and Bezier segments.
 * 由直线和 Bezier segment 组成的三维 path 操作集合。
 */
export const path = {
  /**
   * Creates an empty 3D path.
   * @returns A new path with no segments.
   */
  create(): Path {
    return { segments: [], _needsUpdate: true };
  },

  /**
   * Removes all segments and marks path metrics dirty.
   * @param path Path to clear.
   * @returns The same path object.
   */
  clear(path: Path): Path {
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
  addSegment(path: Path, segment: Segment): Path {
    path.segments.push(segment);
    markPathDirty(path);
    return path;
  },

  /**
   * Marks cached path metrics dirty.
   * @param path Path whose metrics should be recomputed lazily.
   * @param recursive Also mark all child segment metrics dirty.
   */
  markDirty(path: Path, recursive = false): void {
    markPathDirty(path, recursive);
  },

  /**
   * Clones and optionally removes duplicate points before path construction.
   * @param points Input points.
   * @param options Preprocessing options.
   * @returns A normalized point array.
   */
  preprocessPoints(points: ReadonlyVec3[], options: PointPreprocessOptions = {}): vec3[] {
    return preprocessInputPoints(points, options);
  },

  /**
   * Replaces the path with straight line segments through the given points.
   * @param path Path to mutate.
   * @param points Source points.
   * @param options Polyline options.
   * @returns The same path object.
   */
  setPolyline(path: Path, points: ReadonlyVec3[], options: PolylineOptions = {}): Path {
    path.segments.length = 0;
    const close = options.close === true;
    if (points.length < 2) {
      markPathDirty(path);
      return path;
    }

    const lastIndex = points.length - 1;
    const segments = close && !vecEquals(points[0]!, points[lastIndex]!) ? points.length : lastIndex;
    for (let i = 0; i < segments; i++) {
      path.segments.push(line.create(points[i]!, i === lastIndex ? points[0]! : points[i + 1]!));
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
  setSmoothCurve(path: Path, points: ReadonlyVec3[], options: SmoothCurveOptions = {}): Path {
    const smooth = options.smooth || 0;
    if (points.length < 2 || smooth === 0 || points.length === 2) {
      return this.setPolyline(path, points, options);
    }

    path.segments.length = 0;
    const cp0 = vec3.clone(points[0]!);
    const cp1 = vec3.create();
    const prev = vec3.create();
    const next = vec3.create();
    const nextCp0 = vec3.create();
    const v1 = vec3.create();
    const v2 = vec3.create();

    for (let i = 0, l = points.length; i < l; i++) {
      const current = points[i]!;
      if (i === 0) {
        vec3.copy(cp0, current);
      } else if (i === l - 1) {
        path.segments.push(cubicBezier.create(points[i - 1]!, cp0, current, current));
      } else {
        vec3.copy(next, points[i + 1]!);
        vec3.copy(prev, points[i - 1]!);

        const lenPrevSeg = vec3.len(vec3.sub(v1, current, prev));
        const lenNextSeg = vec3.len(vec3.sub(v2, next, current));

        const ratioNextSeg = lenNextSeg / (lenNextSeg + lenPrevSeg);
        vec3.sub(v1, next, prev);
        vec3.scaleAndAdd(cp1, current, v1, -smooth * (1 - ratioNextSeg));
        vec3.scaleAndAdd(nextCp0, current, v1, smooth * ratioNextSeg);
        clampPointBetween(nextCp0, nextCp0, next, current);

        vec3.sub(v1, nextCp0, current);
        vec3.scaleAndAdd(cp1, current, v1, -lenPrevSeg / lenNextSeg);
        clampPointBetween(cp1, cp1, prev, current);

        vec3.sub(v1, current, cp1);
        vec3.scaleAndAdd(nextCp0, current, v1, lenNextSeg / lenPrevSeg);
        path.segments.push(cubicBezier.create(prev, cp0, cp1, current));
        vec3.copy(cp0, nextCp0);
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
  setBeveledCurve(path: Path, points: ReadonlyVec3[], options: BeveledCurveOptions = {}): Path {
    const bevelRadius = options.bevelRadius || 0;
    const close = options.close || false;
    if (points.length < 2 || bevelRadius === 0 || points.length === 2) {
      return this.setPolyline(path, points, options);
    }

    path.segments.length = 0;
    const lastIndex = points.length - 1;
    const segments = close && !vecEquals(points[0]!, points[lastIndex]!) ? points.length : lastIndex;
    const p0 = vec3.clone(points[0]!);
    const lastDir = vec3.create();
    const nextDir = vec3.create();

    for (let i = 0; i < segments; i++) {
      const p1 = points[(i + 1) % (lastIndex + 1)]!;
      const p2 = points[(i + 2) % (lastIndex + 1)]!;
      if (i === segments - 1 && !close) {
        path.segments.push(line.create(p0, p1));
        vec3.copy(p0, p1);
        break;
      }

      vec3.sub(lastDir, p1, p0);
      vec3.sub(nextDir, p2, p1);
      const lastDirLength = vec3.len(lastDir);
      const nextDirLength = vec3.len(nextDir);

      const v0Dist = Math.min((i === 0 ? lastDirLength / 2 : lastDirLength) * 0.999999, bevelRadius);
      const v2Dist = Math.min((nextDirLength / 2) * 0.999999, bevelRadius);
      vec3.normalize(lastDir, lastDir);
      vec3.normalize(nextDir, nextDir);

      const lineEnd = vec3.scaleAndAdd(vec3.create(), p1, lastDir, -v0Dist);
      path.segments.push(line.create(p0, lineEnd));

      const bezierEnd = vec3.scaleAndAdd(vec3.create(), p1, nextDir, v2Dist);
      path.segments.push(quadraticBezier.create(lineEnd, p1, bezierEnd));
      vec3.copy(p0, bezierEnd);
    }

    if (close && path.segments[0]?.type === 'line') vec3.copy(path.segments[0].p0, p0);
    markPathDirty(path);
    return path;
  },

  /**
   * Returns the total approximate path length.
   * @param path Path to measure.
   * @returns Total path length.
   */
  getLength(path: Path): number {
    return getPathLength(path);
  },

  /**
   * Returns cumulative lengths at the end of each segment.
   * @param path Path to measure.
   * @returns Path-level cumulative length table.
   */
  getLengths(path: Path): number[] {
    return getPathLengths(path);
  },

  /**
   * Evaluates a point by normalized path arc length.
   * @param out Receives the evaluated point.
   * @param path Path to evaluate.
   * @param u Normalized path arc-length parameter in [0, 1].
   * @returns The out vector.
   */
  pointAtU(out: vec3, path: Path, u: number): vec3 {
    return this.pointAtDistance(out, path, clamp(u, 0, 1) * this.getLength(path));
  },

  /**
   * Evaluates a normalized tangent by normalized path arc length.
   * @param out Receives the tangent.
   * @param path Path to evaluate.
   * @param u Normalized path arc-length parameter in [0, 1].
   * @returns The out vector.
   */
  tangentAtU(out: vec3, path: Path, u: number): vec3 {
    return this.tangentAtDistance(out, path, clamp(u, 0, 1) * this.getLength(path));
  },

  /**
   * Evaluates a point by absolute distance along the path.
   * @param out Receives the evaluated point.
   * @param path Path to evaluate.
   * @param distance Distance along the path.
   * @returns The out vector.
   */
  pointAtDistance(out: vec3, path: Path, distance: number): vec3 {
    return pathPointAtDistance(out, path, distance);
  },

  /**
   * Evaluates a normalized tangent by absolute distance along the path.
   * @param out Receives the tangent.
   * @param path Path to evaluate.
   * @param distance Distance along the path.
   * @returns The out vector.
   */
  tangentAtDistance(out: vec3, path: Path, distance: number): vec3 {
    return pathTangentAtDistance(out, path, distance);
  },

  /**
   * Samples path points by each segment's raw parameter.
   * @param path Path to sample.
   * @param divisions Number of divisions for non-line segments.
   * @returns Sampled points with intermediate duplicate joins omitted.
   */
  getPoints(path: Path, divisions = 12): vec3[] {
    const points: vec3[] = [];
    const resolvedDivisions = Math.max(1, Math.floor(divisions));
    for (let i = 0; i < path.segments.length; i++) {
      const segment = path.segments[i]!;
      const resolution = segment.type === 'line' ? 1 : resolvedDivisions;
      const isLast = i === path.segments.length - 1;
      const limit = isLast ? resolution : resolution - 1;
      for (let j = 0; j <= limit; j++) {
        const point = vec3.create();
        segmentPointAt(point, segment, j / resolution);
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
  getSpacedPoints(path: Path, divisions = 5): vec3[] {
    const points: vec3[] = [];
    for (let i = 0; i <= divisions; i++) {
      const point = vec3.create();
      this.pointAtU(point, path, divisions === 0 ? 0 : i / divisions);
      points.push(point);
    }
    return points;
  },

  /**
   * Builds t3d-style 3D frames for mesh generation along the path.
   * @param path Path to sample.
   * @param options Frame building options.
   * @returns Sampled points and frame vectors.
   */
  buildFrames(path: Path, options: BuildFramesOptions = {}): PathFrames {
    const initialNormal = options.initialNormal ?? null;
    const divisions = options.divisions !== undefined ? options.divisions : 12;
    const transport = options.transport !== undefined ? options.transport : true;
    const fixLine = options.fixLine !== undefined ? options.fixLine : true;
    const close = options.close !== undefined ? options.close : false;

    const points: vec3[] = [];
    const tangents: vec3[] = [];
    const normals: vec3[] = [];
    const binormals: vec3[] = [];
    const bisectors: vec3[] = [];
    const lengths: number[] = [];
    const widthScales: number[] = [];
    const sharps: boolean[] = [];
    const tangentTypes: number[] = [];

    let tangentType = 0;
    for (let i = 0; i < path.segments.length; i++) {
      const segment = path.segments[i]!;
      const isLine = segment.type === 'line';
      const resolution = isLine ? 1 : divisions;
      const isLast = i === path.segments.length - 1;

      if (fixLine && isLine && !isLast && path.segments[i + 1]?.type !== 'line') tangentType = 1;

      const limit = isLast ? resolution : resolution - 1;
      for (let j = 0; j <= limit; j++) {
        const point = vec3.create();
        segmentPointAt(point, segment, j / resolution);
        points.push(point);
        tangentTypes.push(tangentType);
        if (tangentType === 1) tangentType++;
        else if (tangentType === 2) tangentType = 0;
      }
    }

    if (points.length === 0) {
      return { points, tangents, normals, binormals, bisectors, lengths, widthScales, sharps, tangentTypes };
    }

    tangents[0] = vec3.create();
    normals[0] = vec3.create();
    binormals[0] = vec3.create();
    bisectors[0] = vec3.create();
    if (points[1]) vec3.sub(tangents[0], points[1], points[0]!);
    else vec3.set(tangents[0], 1, 0, 0);
    normalizeOrFallback(tangents[0]);
    initialNormal3(normals[0], tangents[0], initialNormal);
    orthonormalize3(normals[0], binormals[0], tangents[0], normals[0]);
    vec3.copy(bisectors[0], binormals[0]);
    lengths[0] = 0;
    widthScales[0] = 1;
    sharps[0] = false;

    const lastDir = vec3.create();
    const nextDir = vec3.create();
    for (let i = 1; i < points.length - 1; i++) {
      const tangent = vec3.create();
      const normal = vec3.create();
      const binormal = vec3.create();
      const bisector = vec3.create();

      vec3.sub(lastDir, points[i]!, points[i - 1]!);
      vec3.sub(nextDir, points[i + 1]!, points[i]!);
      const lastLength = vec3.len(lastDir);
      normalizeOrFallback(lastDir, tangents[i - 1]);
      normalizeOrFallback(nextDir, lastDir);

      vec3.sub(bisector, nextDir, lastDir);
      normalizeOrFallback(bisector, binormals[i - 1]);

      const localTangentType = tangentTypes[i] ?? 0;
      if (localTangentType === 1) vec3.copy(tangent, nextDir);
      else if (localTangentType === 2) vec3.copy(tangent, lastDir);
      else normalizeOrFallback(vec3.add(tangent, lastDir, nextDir), lastDir);

      if (transport) {
        vec3.copy(normal, normals[i - 1]!);
        vec3.cross(_axis, tangents[i - 1]!, tangent);
        if (vec3.len(_axis) > EPSILON) {
          vec3.normalize(_axis, _axis);
          rotateAroundAxis(normal, normal, _axis, Math.acos(clamp(vec3.dot(tangents[i - 1]!, tangent), -1, 1)));
        }
        orthonormalize3(normal, binormal, tangent, normal);
      } else {
        vec3.copy(normal, initialNormal ?? normals[i - 1]!);
        if (vec3.dot(tangent, normal) === 1) vec3.cross(binormal, nextDir, normal);
        else vec3.cross(binormal, tangent, normal);
        normalizeOrFallback(binormal, binormals[i - 1]);
        vec3.cross(normal, binormal, tangent);
        normalizeOrFallback(normal, normals[i - 1]);
      }

      tangents[i] = tangent;
      normals[i] = normal;
      binormals[i] = binormal;
      bisectors[i] = bisector;

      const cos = vec3.dot(lastDir, nextDir);
      lengths[i] = (lengths[i - 1] ?? 0) + lastLength;
      widthScales[i] = Math.min(1 / Math.sqrt((1 + cos) / 2), 1.415) || 1;
      sharps[i] = Math.abs(cos - 1) > 0.05;
    }

    const lastIndex = points.length - 1;
    if (lastIndex > 0) {
      const tangent = vec3.create();
      const normal = vec3.create();
      const binormal = vec3.create();
      const bisector = vec3.create();
      vec3.sub(tangent, points[lastIndex]!, points[lastIndex - 1]!);
      const dist = vec3.len(tangent);
      if (close) vec3.copy(tangent, tangents[0]!);
      else normalizeOrFallback(tangent, tangents[lastIndex - 1]);

      transportNormal3(normal, normals[lastIndex - 1]!, tangents[lastIndex - 1]!, tangent);
      orthonormalize3(normal, binormal, tangent, normal);
      vec3.copy(bisector, binormal);
      tangents[lastIndex] = tangent;
      normals[lastIndex] = normal;
      binormals[lastIndex] = binormal;
      bisectors[lastIndex] = bisector;
      lengths[lastIndex] = (lengths[lastIndex - 1] ?? 0) + dist;
      widthScales[lastIndex] = 1;
      sharps[lastIndex] = false;

      if (close) {
        vec3.copy(tangents[0]!, tangent);
        vec3.copy(normals[0]!, normal);
        vec3.copy(binormals[0]!, binormal);
        vec3.copy(bisectors[0]!, bisector);
      }
    }

    return { points, tangents, normals, binormals, bisectors, lengths, widthScales, sharps, tangentTypes };
  }
};
