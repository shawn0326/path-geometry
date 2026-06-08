import { vec3 } from 'gl-matrix';
import type { Segment } from '../types';
import { clamp, EPSILON } from '../helper';

interface SegmentMetrics {
  divisions: number;
  lengths: number[];
  totalLength: number;
  needsUpdate: boolean;
}

export type SegmentCacheState = {
  arcLengthDivisions?: number;
  _metrics?: SegmentMetrics;
  _needsUpdate?: boolean;
};

export type SegmentOps<S, V> = {
  pointAt(out: V, segment: S, t: number): V;
  tangentAt(out: V, segment: S, t: number): V;
  distance(a: V, b: V): number;
  createVector(): V;
};

export function markSegmentDirty(segment: SegmentCacheState): void {
  segment._needsUpdate = true;
  if (segment._metrics) segment._metrics.needsUpdate = true;
}

export function getSegmentLengths<S, V>(
  segment: S & SegmentCacheState,
  divisions: number | undefined,
  ops: SegmentOps<S, V>
): number[] {
  const resolvedDivisions = Math.max(1, Math.floor(divisions ?? segment.arcLengthDivisions ?? 200));
  const metrics = segment._metrics;
  if (metrics && metrics.divisions === resolvedDivisions && !metrics.needsUpdate && !segment._needsUpdate) {
    return metrics.lengths;
  }

  const lengths: number[] = [0];
  const last = ops.createVector();
  const current = ops.createVector();
  ops.pointAt(last, segment, 0);

  let sum = 0;
  for (let i = 1; i <= resolvedDivisions; i++) {
    ops.pointAt(current, segment, i / resolvedDivisions);
    sum += ops.distance(current, last);
    lengths.push(sum);
    ops.pointAt(last, segment, i / resolvedDivisions);
  }

  segment._metrics = {
    divisions: resolvedDivisions,
    lengths,
    totalLength: sum,
    needsUpdate: false
  };
  segment._needsUpdate = false;
  return lengths;
}

export function getSegmentLength<S, V>(
  segment: S & SegmentCacheState,
  ops: SegmentOps<S, V>
): number {
  const lengths = getSegmentLengths(segment, undefined, ops);
  return lengths[lengths.length - 1] ?? 0;
}

export function getSegmentPoints<S, V>(segment: S, divisions: number | undefined, ops: SegmentOps<S, V>): V[] {
  const resolvedDivisions = Math.max(1, Math.floor(divisions ?? 5));
  const points: V[] = [];
  for (let i = 0; i <= resolvedDivisions; i++) {
    const point = ops.createVector();
    ops.pointAt(point, segment, i / resolvedDivisions);
    points.push(point);
  }
  return points;
}

export function getSegmentSpacedPoints<S, V>(
  segment: S & SegmentCacheState,
  divisions: number | undefined,
  ops: SegmentOps<S, V>
): V[] {
  const resolvedDivisions = Math.max(1, Math.floor(divisions ?? 5));
  const points: V[] = [];
  for (let i = 0; i <= resolvedDivisions; i++) {
    const point = ops.createVector();
    const t = mapUToT(segment, i / resolvedDivisions, undefined, ops);
    ops.pointAt(point, segment, t);
    points.push(point);
  }
  return points;
}

export function mapUToT<S, V>(
  segment: S & SegmentCacheState,
  u: number,
  distance: number | undefined,
  ops: SegmentOps<S, V>
): number {
  const arcLengths = getSegmentLengths(segment, undefined, ops);
  const il = arcLengths.length;
  if (il <= 1) return 0;

  const totalLength = arcLengths[il - 1] ?? 0;
  if (totalLength === 0) return 0;

  const targetArcLength = distance !== undefined ? clamp(distance, 0, totalLength) : clamp(u, 0, 1) * totalLength;
  let low = 0;
  let high = il - 1;
  let i = 0;

  while (low <= high) {
    i = Math.floor(low + (high - low) / 2);
    const comparison = (arcLengths[i] ?? 0) - targetArcLength;
    if (comparison < 0) {
      low = i + 1;
    } else if (comparison > 0) {
      high = i - 1;
    } else {
      high = i;
      break;
    }
  }

  i = Math.max(0, high);
  if ((arcLengths[i] ?? 0) === targetArcLength) return i / (il - 1);

  const lengthBefore = arcLengths[i] ?? 0;
  const lengthAfter = arcLengths[i + 1] ?? lengthBefore;
  const segmentLength = lengthAfter - lengthBefore;
  if (Math.abs(segmentLength) <= EPSILON) return i / (il - 1);

  return (i + (targetArcLength - lengthBefore) / segmentLength) / (il - 1);
}

export const segmentOps: SegmentOps<Segment, vec3> = {
  pointAt(out: vec3, segment: Segment, t: number): vec3 {
    return segment.pointAt(out, t);
  },
  tangentAt(out: vec3, segment: Segment, t: number): vec3 {
    return segment.tangentAt(out, t);
  },
  distance: vec3.distance,
  createVector: vec3.create
};
