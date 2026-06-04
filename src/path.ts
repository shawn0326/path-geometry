import { vec3 } from 'gl-matrix';
import type { ReadonlyVec3 } from 'gl-matrix';
import type { BeveledCurveOptions, BuildFramesOptions, Path, PathFrames, PointPreprocessOptions, PolylineOptions, Segment, SmoothCurveOptions, PathWriter } from './types';
import { segment } from './segment';
import { clamp, EPSILON, rotateAroundAxis } from './helper';

const _p3a = vec3.create();
const _p3b = vec3.create();
const _axis = vec3.create();

function initialNormal3(out: vec3, tangent: ReadonlyVec3, initialNormal?: ReadonlyVec3 | null): vec3 {
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
}

function transportNormal3(out: vec3, previousNormal: ReadonlyVec3, previousTangent: ReadonlyVec3, tangent: ReadonlyVec3): vec3 {
  vec3.cross(_axis, previousTangent, tangent);
  if (vec3.len(_axis) > EPSILON) {
    vec3.normalize(_axis, _axis);
    const theta = Math.acos(clamp(vec3.dot(previousTangent, tangent), -1, 1));
    rotateAroundAxis(out, previousNormal, _axis, theta);
  } else {
    vec3.copy(out, previousNormal);
  }
  return out;
}

function orthonormalize3(outNormal: vec3, outBinormal: vec3, tangent: ReadonlyVec3, normal: ReadonlyVec3): void {
  vec3.cross(outBinormal, tangent, normal);
  if (vec3.len(outBinormal) <= EPSILON) {
    initialNormal3(outNormal, tangent);
    vec3.cross(outBinormal, tangent, outNormal);
  }
  vec3.normalize(outBinormal, outBinormal);
  vec3.cross(outNormal, outBinormal, tangent);
  vec3.normalize(outNormal, outNormal);
}

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
      segment.markDirty();
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
    sum += segment.getLength();
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
  const segment_ = path.segments[found.index];
  if (!segment_) return out;
  const segmentLength = segment_.getLength();
  const u = segmentLength === 0 ? 0 : found.localDistance / segmentLength;
  const t = segment_.type === 'line' ? u : segment_.mapUToT(u, found.localDistance);
  return segment_.pointAt(out, t);
}

function pathTangentAtDistance(out: vec3, path: Path, distance: number): vec3 {
  const lengths = getPathLengths(path);
  const found = findSegmentDistance(lengths, distance);
  const segment_ = path.segments[found.index];
  if (!segment_) return out;
  const segmentLength = segment_.getLength();
  const u = segmentLength === 0 ? 0 : found.localDistance / segmentLength;
  const t = segment_.type === 'line' ? u : segment_.mapUToT(u, found.localDistance);
  return segment_.tangentAt(out, t);
}

/**
 * Path namespace.
 * Create and manipulate 3D paths composed of segments, sample points and
 * tangents, and build orthonormal frames for mesh generation.
 *
 * Path 命名空间。
 * 创建和操作由 segment 组成的三维 path，采样点与切线，并为网格生成构建正交 frame。
 *
 * @example
 * ```ts
 * const p = path.create();
 * path.addSegment(p, segment.createLine(p0, p1));
 * const frames = path.buildFrames(p, { divisions: 20 });
 * ```
 */
export const path = {
  /**
   * Create an empty path.
   * 创建一个空 path。
   */
  create(): Path {
    return { segments: [], _needsUpdate: true };
  },
  /**
   * Remove all segments from the path.
   * 移除 path 中的所有 segment。
   */
  clear(path: Path): Path {
    path.segments.length = 0;
    markPathDirty(path);
    return path;
  },
  /**
   * Append a segment to the path.
   * 将一个 segment 添加到 path 末尾。
   */
  addSegment(path: Path, segment: Segment): Path {
    path.segments.push(segment);
    markPathDirty(path);
    return path;
  },
  /**
   * Mark the path and optionally all its segments as needing recalculation.
   * 标记 path（可选包含其所有 segment）需要重新计算。
   */
  markDirty(path: Path, recursive = false): void {
    markPathDirty(path, recursive);
  },
  /**
   * Preprocess a raw point array (remove duplicates, handle closing).
   * 预处理原始点数组（移除重复点、处理闭合）。
   */
  preprocessPoints(points: ReadonlyVec3[], options: PointPreprocessOptions = {}): vec3[] {
    return preprocessInputPoints(points, options);
  },
  /**
   * Return a fluent writer that builds a path imperatively.
   * 返回一个链式 writer，以命令式方式构建 path。
   */
  writer(targetPath?: Path): PathWriter {
    const target = targetPath ?? this.create();
    let currentPoint: vec3 | null = null;
    let subpathStart: vec3 | null = null;
    function moveTo(point: ReadonlyVec3) {
      currentPoint = vec3.clone(point);
      subpathStart = vec3.clone(point);
      return api;
    }
    function lineTo(point: ReadonlyVec3) {
      if (!currentPoint) return moveTo(point);
      path.addSegment(target, segment.createLine(currentPoint, point));
      vec3.copy(currentPoint, point);
      return api;
    }
    function quadraticTo(control: ReadonlyVec3, point: ReadonlyVec3) {
      if (!currentPoint) return moveTo(point);
      path.addSegment(target, segment.createQuadraticBezier(currentPoint, control, point));
      vec3.copy(currentPoint, point);
      return api;
    }
    function cubicTo(control1: ReadonlyVec3, control2: ReadonlyVec3, point: ReadonlyVec3) {
      if (!currentPoint) return moveTo(point);
      path.addSegment(target, segment.createCubicBezier(currentPoint, control1, control2, point));
      vec3.copy(currentPoint, point);
      return api;
    }
    function close() {
      if (currentPoint && subpathStart && !vecEquals(currentPoint, subpathStart)) {
        lineTo(subpathStart);
      }
      return api;
    }
    function clear() {
      path.clear(target);
      currentPoint = null;
      subpathStart = null;
      return api;
    }
    function toPath(): Path {
      return target;
    }
    const api: PathWriter = { moveTo, lineTo, quadraticTo, cubicTo, close, clear, toPath };
    return api;
  },
  /**
   * Replace the path contents with a polyline through the given points.
   * 用给定点的折线替换 path 内容。
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
      path.segments.push(segment.createLine(points[i]!, i === lastIndex ? points[0]! : points[i + 1]!));
    }
    markPathDirty(path);
    return path;
  },
  /**
   * Replace the path contents with t3d-style smooth cubic curves through the given points.
   * 用 t3d 风格平滑三次曲线替换 path 内容。
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
        path.segments.push(segment.createCubicBezier(points[i - 1]!, cp0, current, current));
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
        path.segments.push(segment.createCubicBezier(prev, cp0, cp1, current));
        vec3.copy(cp0, nextCp0);
      }
    }

    markPathDirty(path);
    return path;
  },
  /**
   * Replace the path contents with straight edges connected by beveled quadratic curves.
   * 用直边加倒角二次曲线替换 path 内容。
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
        path.segments.push(segment.createLine(p0, p1));
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
      path.segments.push(segment.createLine(p0, lineEnd));

      const bezierEnd = vec3.scaleAndAdd(vec3.create(), p1, nextDir, v2Dist);
      path.segments.push(segment.createQuadraticBezier(lineEnd, p1, bezierEnd));
      vec3.copy(p0, bezierEnd);
    }

    if (close && path.segments[0]?.type === 'line') vec3.copy(path.segments[0].p0, p0);
    markPathDirty(path);
    return path;
  },
  /**
   * Get the total arc length of the path.
   * 获取 path 的总弧长。
   */
  getLength(path: Path): number {
    return getPathLength(path);
  },
  /**
   * Get cumulative arc-length table across all segments.
   * 获取跨所有 segment 的累计弧长表。
   */
  getLengths(path: Path): number[] {
    return getPathLengths(path);
  },
  /**
   * Evaluate the point at normalized arc-length u ∈ [0, 1].
   * 在弧长归一化参数 u ∈ [0, 1] 处求点。
   */
  pointAtU(out: vec3, path: Path, u: number): vec3 {
    return this.pointAtDistance(out, path, clamp(u, 0, 1) * this.getLength(path));
  },
  /**
   * Evaluate the unit tangent at normalized arc-length u ∈ [0, 1].
   * 在弧长归一化参数 u ∈ [0, 1] 处求单位切线。
   */
  tangentAtU(out: vec3, path: Path, u: number): vec3 {
    return this.tangentAtDistance(out, path, clamp(u, 0, 1) * this.getLength(path));
  },
  /**
   * Evaluate the point at a given arc distance from the path start.
   * 在距路径起点指定弧长处求点。
   */
  pointAtDistance(out: vec3, path: Path, distance: number): vec3 {
    return pathPointAtDistance(out, path, distance);
  },
  /**
   * Evaluate the unit tangent at a given arc distance from the path start.
   * 在距路径起点指定弧长处求单位切线。
   */
  tangentAtDistance(out: vec3, path: Path, distance: number): vec3 {
    return pathTangentAtDistance(out, path, distance);
  },
  /**
   * Sample `divisions + 1` points evenly by raw parameter (non-arc-length).
   * 按原始参数等间距采样 `divisions + 1` 个点（非弧长均匀）。
   */
  getPoints(path: Path, divisions = 12): vec3[] {
    const points: vec3[] = [];
    const resolvedDivisions = Math.max(1, Math.floor(divisions));
    for (let i = 0; i < path.segments.length; i++) {
      const segment_ = path.segments[i]!;
      const resolution = segment_.type === 'line' ? 1 : resolvedDivisions;
      const isLast = i === path.segments.length - 1;
      const limit = isLast ? resolution : resolution - 1;
      for (let j = 0; j <= limit; j++) {
        const point = vec3.create();
        segment_.pointAt(point, j / resolution);
        points.push(point);
      }
    }
    return points;
  },
  /**
   * Sample `divisions + 1` arc-length evenly spaced points along the path.
   * 沿 path 弧长均匀采样 `divisions + 1` 个点。
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
   * Build orthonormal 3D frames along the path for tube/ribbon mesh generation.
   * 沿 path 构建正交 3D frame，用于管状/带状网格生成。
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
      const segment_ = path.segments[i]!;
      const isLine = segment_.type === 'line';
      const resolution = isLine ? 1 : divisions;
      const isLast = i === path.segments.length - 1;

      if (fixLine && isLine && !isLast && path.segments[i + 1]?.type !== 'line') tangentType = 1;

      const limit = isLast ? resolution : resolution - 1;
      for (let j = 0; j <= limit; j++) {
        const point = vec3.create();
        segment_.pointAt(point, j / resolution);
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
        transportNormal3(normal, normals[i - 1]!, tangents[i - 1]!, tangent);
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
