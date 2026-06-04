import { vec3 } from 'gl-matrix';
import type { ReadonlyVec3 } from 'gl-matrix';
import type { CubicBezierSegment, Segment } from '../types';
import { getSegmentLength, getSegmentLengths, getSegmentPoints, getSegmentSpacedPoints, mapUToT, markSegmentDirty, segmentOps, segmentPointAt, segmentTangentAt } from './shared';

/**
 * Operations for 3D cubic Bezier segments.
 * 三维三次 Bezier segment 的操作集合。
 */
export class CubicBezierSegmentImpl implements CubicBezierSegment {
  type: 'cubic-bezier' = 'cubic-bezier';
  p0: vec3;
  p1: vec3;
  p2: vec3;
  p3: vec3;
  arcLengthDivisions = 200;
  _needsUpdate = true;

  constructor(p0: ReadonlyVec3 = vec3.create(), p1: ReadonlyVec3 = vec3.create(), p2: ReadonlyVec3 = vec3.create(), p3: ReadonlyVec3 = vec3.create()) {
    this.p0 = vec3.clone(p0);
    this.p1 = vec3.clone(p1);
    this.p2 = vec3.clone(p2);
    this.p3 = vec3.clone(p3);
  }

  pointAt(out: vec3, t: number): vec3 {
    return segmentPointAt(out, this, t);
  }

  pointAtU(out: vec3, u: number): vec3 {
    return segmentPointAt(out, this, this.mapUToT(u));
  }

  tangentAt(out: vec3, t: number): vec3 {
    return segmentTangentAt(out, this, t);
  }

  getLength(): number {
    return getSegmentLength(this as Segment, segmentOps);
  }

  getLengths(divisions?: number): number[] {
    return getSegmentLengths(this as Segment, divisions, segmentOps);
  }

  getPoints(divisions?: number): vec3[] {
    return getSegmentPoints(this as Segment, divisions, segmentOps);
  }

  getSpacedPoints(divisions?: number): vec3[] {
    return getSegmentSpacedPoints(this as Segment, divisions, segmentOps);
  }

  mapUToT(u: number, distance?: number): number {
    return mapUToT(this as Segment, u, distance, segmentOps);
  }

  markDirty(): void {
    markSegmentDirty(this);
  }
}

export const cubicBezier = {
  /**
   * Creates a 3D cubic Bezier segment and clones the input points.
   * @param p0 Start point.
   * @param p1 First control point.
   * @param p2 Second control point.
   * @param p3 End point.
   * @returns A new cubic Bezier segment.
   */
  create(p0: ReadonlyVec3 = vec3.create(), p1: ReadonlyVec3 = vec3.create(), p2: ReadonlyVec3 = vec3.create(), p3: ReadonlyVec3 = vec3.create()): CubicBezierSegment {
    return new CubicBezierSegmentImpl(p0, p1, p2, p3);
  },
  /**
   * Evaluates the segment by raw Bezier parameter t.
   * @param out Receives the evaluated point.
   * @param segment Segment to evaluate.
   * @param t Raw Bezier parameter in [0, 1].
   * @returns The out vector.
   */
  pointAt(out: vec3, segment: CubicBezierSegment, t: number): vec3 {
    return segmentPointAt(out, segment, t);
  },
  /**
   * Evaluates the segment by normalized arc length.
   * @param out Receives the evaluated point.
   * @param segment Segment to evaluate.
   * @param u Normalized arc-length parameter in [0, 1].
   * @returns The out vector.
   */
  pointAtU(out: vec3, segment: CubicBezierSegment, u: number): vec3 {
    return segmentPointAt(out, segment, this.mapUToT(segment, u));
  },
  /**
   * Evaluates a normalized tangent by raw Bezier parameter t.
   * @param out Receives the tangent.
   * @param segment Segment to evaluate.
   * @param t Raw Bezier parameter in [0, 1].
   * @returns The out vector.
   */
  tangentAt(out: vec3, segment: CubicBezierSegment, t: number): vec3 {
    return segmentTangentAt(out, segment, t);
  },
  /**
   * Returns the approximate segment length.
   * @param segment Segment to measure.
   * @returns Segment length.
   */
  getLength(segment: CubicBezierSegment): number {
    return getSegmentLength(segment as Segment, segmentOps);
  },
  /**
   * Returns cumulative arc lengths for this segment.
   * @param segment Segment to measure.
   * @param divisions Number of arc-length divisions.
   * @returns Cumulative arc-length table.
   */
  getLengths(segment: CubicBezierSegment, divisions?: number): number[] {
    return getSegmentLengths(segment as Segment, divisions, segmentOps);
  },
  /**
   * Samples points by raw Bezier parameter t.
   * @param segment Segment to sample.
   * @param divisions Number of parameter divisions.
   * @returns Sampled points.
   */
  getPoints(segment: CubicBezierSegment, divisions?: number): vec3[] {
    return getSegmentPoints(segment as Segment, divisions, segmentOps);
  },
  /**
   * Samples points by approximate arc length.
   * @param segment Segment to sample.
   * @param divisions Number of spacing divisions.
   * @returns Arc-length-spaced points.
   */
  getSpacedPoints(segment: CubicBezierSegment, divisions?: number): vec3[] {
    return getSegmentSpacedPoints(segment as Segment, divisions, segmentOps);
  },
  /**
   * Maps normalized arc length or an explicit distance to raw Bezier parameter t.
   * @param segment Segment to map.
   * @param u Normalized arc-length parameter in [0, 1].
   * @param distance Optional absolute distance along the segment.
   * @returns Raw Bezier parameter t.
   */
  mapUToT(segment: CubicBezierSegment, u: number, distance?: number): number {
    return mapUToT(segment as Segment, u, distance, segmentOps);
  },
  /**
   * Marks cached segment metrics dirty after direct point mutation.
   * @param segment Segment whose metrics should be recomputed lazily.
   */
  markDirty(segment: CubicBezierSegment): void {
    markSegmentDirty(segment);
  }
};
