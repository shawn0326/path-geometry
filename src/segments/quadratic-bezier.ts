import { vec3 } from 'gl-matrix';
import type { ReadonlyVec3 } from 'gl-matrix';
import type { QuadraticBezierSegment, Segment } from '../types';
import { getSegmentLength, getSegmentLengths, getSegmentPoints, getSegmentSpacedPoints, mapUToT, markSegmentDirty, segmentOps } from './shared';
import { EPSILON } from '../utils/math';

/**
 * Operations for 3D quadratic Bezier segments.
 * 三维二次 Bezier segment 的操作集合。
 */
export class QuadraticBezierSegmentImpl implements QuadraticBezierSegment {
  type: 'quadratic-bezier' = 'quadratic-bezier';
  p0: vec3;
  p1: vec3;
  p2: vec3;
  arcLengthDivisions = 200;
  _needsUpdate = true;

  constructor(p0: ReadonlyVec3 = vec3.create(), p1: ReadonlyVec3 = vec3.create(), p2: ReadonlyVec3 = vec3.create()) {
    this.p0 = vec3.clone(p0);
    this.p1 = vec3.clone(p1);
    this.p2 = vec3.clone(p2);
  }

  pointAt(out: vec3, t: number): vec3 {
    const k = 1 - t;
    out[0] = k * k * this.p0[0] + 2 * k * t * this.p1[0] + t * t * this.p2[0];
    out[1] = k * k * this.p0[1] + 2 * k * t * this.p1[1] + t * t * this.p2[1];
    out[2] = k * k * this.p0[2] + 2 * k * t * this.p1[2] + t * t * this.p2[2];
    return out;
  }

  pointAtU(out: vec3, u: number): vec3 {
    return this.pointAt(out, this.mapUToT(u));
  }

  tangentAt(out: vec3, t: number): vec3 {
    out[0] = 2 * (1 - t) * (this.p1[0] - this.p0[0]) + 2 * t * (this.p2[0] - this.p1[0]);
    out[1] = 2 * (1 - t) * (this.p1[1] - this.p0[1]) + 2 * t * (this.p2[1] - this.p1[1]);
    out[2] = 2 * (1 - t) * (this.p1[2] - this.p0[2]) + 2 * t * (this.p2[2] - this.p1[2]);
    if (vec3.len(out) <= EPSILON) {
      out[0] = 1;
      out[1] = 0;
      out[2] = 0;
      return out;
    }
    return vec3.normalize(out, out);
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

export const quadraticBezier = {
  /**
   * Creates a 3D quadratic Bezier segment and clones the input points.
   * @param p0 Start point.
   * @param p1 Control point.
   * @param p2 End point.
   * @returns A new quadratic Bezier segment.
   */
  create(p0: ReadonlyVec3 = vec3.create(), p1: ReadonlyVec3 = vec3.create(), p2: ReadonlyVec3 = vec3.create()): QuadraticBezierSegment {
    return new QuadraticBezierSegmentImpl(p0, p1, p2);
  },
  /**
   * Evaluates the segment by raw Bezier parameter t.
   * @param out Receives the evaluated point.
   * @param segment Segment to evaluate.
   * @param t Raw Bezier parameter in [0, 1].
   * @returns The out vector.
   */
  pointAt(out: vec3, segment: QuadraticBezierSegment, t: number): vec3 {
    return segment.pointAt(out, t);
  },
  /**
   * Evaluates the segment by normalized arc length.
   * @param out Receives the evaluated point.
   * @param segment Segment to evaluate.
   * @param u Normalized arc-length parameter in [0, 1].
   * @returns The out vector.
   */
  pointAtU(out: vec3, segment: QuadraticBezierSegment, u: number): vec3 {
    return segment.pointAtU(out, u);
  },
  /**
   * Evaluates a normalized tangent by raw Bezier parameter t.
   * @param out Receives the tangent.
   * @param segment Segment to evaluate.
   * @param t Raw Bezier parameter in [0, 1].
   * @returns The out vector.
   */
  tangentAt(out: vec3, segment: QuadraticBezierSegment, t: number): vec3 {
    return segment.tangentAt(out, t);
  },
  /**
   * Returns the approximate segment length.
   * @param segment Segment to measure.
   * @returns Segment length.
   */
  getLength(segment: QuadraticBezierSegment): number {
    return segment.getLength();
  },
  /**
   * Returns cumulative arc lengths for this segment.
   * @param segment Segment to measure.
   * @param divisions Number of arc-length divisions.
   * @returns Cumulative arc-length table.
   */
  getLengths(segment: QuadraticBezierSegment, divisions?: number): number[] {
    return segment.getLengths(divisions);
  },
  /**
   * Samples points by raw Bezier parameter t.
   * @param segment Segment to sample.
   * @param divisions Number of parameter divisions.
   * @returns Sampled points.
   */
  getPoints(segment: QuadraticBezierSegment, divisions?: number): vec3[] {
    return segment.getPoints(divisions);
  },
  /**
   * Samples points by approximate arc length.
   * @param segment Segment to sample.
   * @param divisions Number of spacing divisions.
   * @returns Arc-length-spaced points.
   */
  getSpacedPoints(segment: QuadraticBezierSegment, divisions?: number): vec3[] {
    return segment.getSpacedPoints(divisions);
  },
  /**
   * Maps normalized arc length or an explicit distance to raw Bezier parameter t.
   * @param segment Segment to map.
   * @param u Normalized arc-length parameter in [0, 1].
   * @param distance Optional absolute distance along the segment.
   * @returns Raw Bezier parameter t.
   */
  mapUToT(segment: QuadraticBezierSegment, u: number, distance?: number): number {
    return segment.mapUToT(u, distance);
  },
  /**
   * Marks cached segment metrics dirty after direct point mutation.
   * @param segment Segment whose metrics should be recomputed lazily.
   */
  markDirty(segment: QuadraticBezierSegment): void {
    segment.markDirty();
  }
};
