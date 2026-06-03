import type { Path2, Path3 } from '../types';
import { getSegmentLength, mapUToT, markSegmentDirty, segment2Ops, segment2PointAt, segment2TangentAt, segment3Ops, segment3PointAt, segment3TangentAt } from '../segments/shared';
import { clamp, ensureFloat32Array, safeCount } from '../utils/math';

export function markPathDirty(path: Path2 | Path3, recursive = false): void {
  path._needsUpdate = true;
  if (path._metrics) path._metrics.needsUpdate = true;
  if (recursive) {
    for (const segment of path.segments) {
      markSegmentDirty(segment);
    }
  }
}

export function getPathLengths2(path: Path2): number[] {
  const metrics = path._metrics;
  if (metrics && metrics.segmentCount === path.segments.length && !metrics.needsUpdate && !path._needsUpdate) {
    return metrics.lengths;
  }
  const lengths: number[] = [];
  let sum = 0;
  for (const segment of path.segments) {
    sum += getSegmentLength(segment, segment2Ops);
    lengths.push(sum);
  }
  path._metrics = { lengths, totalLength: sum, segmentCount: path.segments.length, needsUpdate: false };
  path._needsUpdate = false;
  return lengths;
}

export function getPathLengths3(path: Path3): number[] {
  const metrics = path._metrics;
  if (metrics && metrics.segmentCount === path.segments.length && !metrics.needsUpdate && !path._needsUpdate) {
    return metrics.lengths;
  }
  const lengths: number[] = [];
  let sum = 0;
  for (const segment of path.segments) {
    sum += getSegmentLength(segment, segment3Ops);
    lengths.push(sum);
  }
  path._metrics = { lengths, totalLength: sum, segmentCount: path.segments.length, needsUpdate: false };
  path._needsUpdate = false;
  return lengths;
}

export function getPathLength2(path: Path2): number {
  const lengths = getPathLengths2(path);
  return lengths[lengths.length - 1] ?? 0;
}

export function getPathLength3(path: Path3): number {
  const lengths = getPathLengths3(path);
  return lengths[lengths.length - 1] ?? 0;
}

export function findSegmentDistance(lengths: number[], distance: number): { index: number; localDistance: number } {
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

export function path2PointAtDistance(out: import('gl-matrix').vec2, path: Path2, distance: number): import('gl-matrix').vec2 {
  const lengths = getPathLengths2(path);
  const found = findSegmentDistance(lengths, distance);
  const segment = path.segments[found.index];
  if (!segment) return out;
  const segmentLength = getSegmentLength(segment, segment2Ops);
  const u = segmentLength === 0 ? 0 : found.localDistance / segmentLength;
  const t = segment.type === 'line' ? u : mapUToT(segment, u, found.localDistance, segment2Ops);
  return segment2PointAt(out, segment, t);
}

export function path3PointAtDistance(out: import('gl-matrix').vec3, path: Path3, distance: number): import('gl-matrix').vec3 {
  const lengths = getPathLengths3(path);
  const found = findSegmentDistance(lengths, distance);
  const segment = path.segments[found.index];
  if (!segment) return out;
  const segmentLength = getSegmentLength(segment, segment3Ops);
  const u = segmentLength === 0 ? 0 : found.localDistance / segmentLength;
  const t = segment.type === 'line' ? u : mapUToT(segment, u, found.localDistance, segment3Ops);
  return segment3PointAt(out, segment, t);
}

export function path2TangentAtDistance(out: import('gl-matrix').vec2, path: Path2, distance: number): import('gl-matrix').vec2 {
  const lengths = getPathLengths2(path);
  const found = findSegmentDistance(lengths, distance);
  const segment = path.segments[found.index];
  if (!segment) return out;
  const segmentLength = getSegmentLength(segment, segment2Ops);
  const u = segmentLength === 0 ? 0 : found.localDistance / segmentLength;
  const t = segment.type === 'line' ? u : mapUToT(segment, u, found.localDistance, segment2Ops);
  return segment2TangentAt(out, segment, t);
}

export function path3TangentAtDistance(out: import('gl-matrix').vec3, path: Path3, distance: number): import('gl-matrix').vec3 {
  const lengths = getPathLengths3(path);
  const found = findSegmentDistance(lengths, distance);
  const segment = path.segments[found.index];
  if (!segment) return out;
  const segmentLength = getSegmentLength(segment, segment3Ops);
  const u = segmentLength === 0 ? 0 : found.localDistance / segmentLength;
  const t = segment.type === 'line' ? u : mapUToT(segment, u, found.localDistance, segment3Ops);
  return segment3TangentAt(out, segment, t);
}

export function prepareSampleCount(count: number): number {
  return safeCount(count);
}

export function ensureArray(array: Float32Array | undefined, length: number): Float32Array {
  return ensureFloat32Array(array, length);
}
