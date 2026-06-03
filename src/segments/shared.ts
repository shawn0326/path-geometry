import { vec2, vec3 } from 'gl-matrix';
import type { Segment2, Segment3, SegmentMetrics } from '../types';
import { clamp, EPSILON } from '../utils/math';

export type SegmentOps<S, V> = {
  pointAt(out: V, segment: S, t: number): V;
  tangentAt(out: V, segment: S, t: number): V;
  distance(a: V, b: V): number;
  createVector(): V;
};

export function markSegmentDirty(segment: { _metrics?: SegmentMetrics; _needsUpdate?: boolean }): void {
  segment._needsUpdate = true;
  if (segment._metrics) segment._metrics.needsUpdate = true;
}

export function getSegmentLengths<S extends { arcLengthDivisions?: number; _metrics?: SegmentMetrics; _needsUpdate?: boolean }, V>(
  segment: S,
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

export function getSegmentLength<S extends { arcLengthDivisions?: number; _metrics?: SegmentMetrics; _needsUpdate?: boolean }, V>(
  segment: S,
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

export function getSegmentSpacedPoints<S extends { arcLengthDivisions?: number; _metrics?: SegmentMetrics; _needsUpdate?: boolean }, V>(
  segment: S,
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

export function mapUToT<S extends { arcLengthDivisions?: number; _metrics?: SegmentMetrics; _needsUpdate?: boolean }, V>(
  segment: S,
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

export function segment2PointAt(out: vec2, segment: Segment2, t: number): vec2 {
  switch (segment.type) {
    case 'line':
      out[0] = segment.p0[0] + (segment.p1[0] - segment.p0[0]) * t;
      out[1] = segment.p0[1] + (segment.p1[1] - segment.p0[1]) * t;
      return out;
    case 'quadratic-bezier': {
      const k = 1 - t;
      out[0] = k * k * segment.p0[0] + 2 * k * t * segment.p1[0] + t * t * segment.p2[0];
      out[1] = k * k * segment.p0[1] + 2 * k * t * segment.p1[1] + t * t * segment.p2[1];
      return out;
    }
    case 'cubic-bezier': {
      const k = 1 - t;
      out[0] = k * k * k * segment.p0[0] + 3 * k * k * t * segment.p1[0] + 3 * k * t * t * segment.p2[0] + t * t * t * segment.p3[0];
      out[1] = k * k * k * segment.p0[1] + 3 * k * k * t * segment.p1[1] + 3 * k * t * t * segment.p2[1] + t * t * t * segment.p3[1];
      return out;
    }
  }
}

export function segment3PointAt(out: vec3, segment: Segment3, t: number): vec3 {
  switch (segment.type) {
    case 'line':
      out[0] = segment.p0[0] + (segment.p1[0] - segment.p0[0]) * t;
      out[1] = segment.p0[1] + (segment.p1[1] - segment.p0[1]) * t;
      out[2] = segment.p0[2] + (segment.p1[2] - segment.p0[2]) * t;
      return out;
    case 'quadratic-bezier': {
      const k = 1 - t;
      out[0] = k * k * segment.p0[0] + 2 * k * t * segment.p1[0] + t * t * segment.p2[0];
      out[1] = k * k * segment.p0[1] + 2 * k * t * segment.p1[1] + t * t * segment.p2[1];
      out[2] = k * k * segment.p0[2] + 2 * k * t * segment.p1[2] + t * t * segment.p2[2];
      return out;
    }
    case 'cubic-bezier': {
      const k = 1 - t;
      out[0] = k * k * k * segment.p0[0] + 3 * k * k * t * segment.p1[0] + 3 * k * t * t * segment.p2[0] + t * t * t * segment.p3[0];
      out[1] = k * k * k * segment.p0[1] + 3 * k * k * t * segment.p1[1] + 3 * k * t * t * segment.p2[1] + t * t * t * segment.p3[1];
      out[2] = k * k * k * segment.p0[2] + 3 * k * k * t * segment.p1[2] + 3 * k * t * t * segment.p2[2] + t * t * t * segment.p3[2];
      return out;
    }
  }
}

export function segment2TangentAt(out: vec2, segment: Segment2, t: number): vec2 {
  switch (segment.type) {
    case 'line':
      vec2.sub(out, segment.p1, segment.p0);
      break;
    case 'quadratic-bezier':
      out[0] = 2 * (1 - t) * (segment.p1[0] - segment.p0[0]) + 2 * t * (segment.p2[0] - segment.p1[0]);
      out[1] = 2 * (1 - t) * (segment.p1[1] - segment.p0[1]) + 2 * t * (segment.p2[1] - segment.p1[1]);
      break;
    case 'cubic-bezier': {
      const k = 1 - t;
      out[0] = 3 * k * k * (segment.p1[0] - segment.p0[0]) + 6 * k * t * (segment.p2[0] - segment.p1[0]) + 3 * t * t * (segment.p3[0] - segment.p2[0]);
      out[1] = 3 * k * k * (segment.p1[1] - segment.p0[1]) + 6 * k * t * (segment.p2[1] - segment.p1[1]) + 3 * t * t * (segment.p3[1] - segment.p2[1]);
      break;
    }
  }
  if (vec2.len(out) <= EPSILON) {
    out[0] = 1;
    out[1] = 0;
    return out;
  }
  return vec2.normalize(out, out);
}

export function segment3TangentAt(out: vec3, segment: Segment3, t: number): vec3 {
  switch (segment.type) {
    case 'line':
      vec3.sub(out, segment.p1, segment.p0);
      break;
    case 'quadratic-bezier':
      out[0] = 2 * (1 - t) * (segment.p1[0] - segment.p0[0]) + 2 * t * (segment.p2[0] - segment.p1[0]);
      out[1] = 2 * (1 - t) * (segment.p1[1] - segment.p0[1]) + 2 * t * (segment.p2[1] - segment.p1[1]);
      out[2] = 2 * (1 - t) * (segment.p1[2] - segment.p0[2]) + 2 * t * (segment.p2[2] - segment.p1[2]);
      break;
    case 'cubic-bezier': {
      const k = 1 - t;
      out[0] = 3 * k * k * (segment.p1[0] - segment.p0[0]) + 6 * k * t * (segment.p2[0] - segment.p1[0]) + 3 * t * t * (segment.p3[0] - segment.p2[0]);
      out[1] = 3 * k * k * (segment.p1[1] - segment.p0[1]) + 6 * k * t * (segment.p2[1] - segment.p1[1]) + 3 * t * t * (segment.p3[1] - segment.p2[1]);
      out[2] = 3 * k * k * (segment.p1[2] - segment.p0[2]) + 6 * k * t * (segment.p2[2] - segment.p1[2]) + 3 * t * t * (segment.p3[2] - segment.p2[2]);
      break;
    }
  }
  if (vec3.len(out) <= EPSILON) {
    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    return out;
  }
  return vec3.normalize(out, out);
}

export const segment2Ops: SegmentOps<Segment2, vec2> = {
  pointAt: segment2PointAt,
  tangentAt: segment2TangentAt,
  distance: vec2.distance,
  createVector: vec2.create
};

export const segment3Ops: SegmentOps<Segment3, vec3> = {
  pointAt: segment3PointAt,
  tangentAt: segment3TangentAt,
  distance: vec3.distance,
  createVector: vec3.create
};
