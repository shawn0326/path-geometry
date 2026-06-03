import { vec3 } from 'gl-matrix';
import type { ReadonlyVec3 } from 'gl-matrix';
import type { QuadraticBezierSegment3, Segment3 } from '../types';
import { getSegmentLength, getSegmentLengths, getSegmentPoints, getSegmentSpacedPoints, mapUToT, markSegmentDirty, segment3Ops, segment3PointAt, segment3TangentAt } from './shared';

/**
 * Operations for 3D quadratic Bezier segments.
 * 中文：三维二次 Bezier segment 的操作集合。
 */
export const quadraticBezier3 = {
  /**
   * Creates a 3D quadratic Bezier segment and clones the input points.
   * @param p0 Start point.
   * @param p1 Control point.
   * @param p2 End point.
   * @returns A new quadratic Bezier segment.
   */
  create(p0: ReadonlyVec3 = vec3.create(), p1: ReadonlyVec3 = vec3.create(), p2: ReadonlyVec3 = vec3.create()): QuadraticBezierSegment3 {
    return { type: 'quadratic-bezier', p0: vec3.clone(p0), p1: vec3.clone(p1), p2: vec3.clone(p2), arcLengthDivisions: 200, _needsUpdate: true };
  },
  /**
   * Evaluates the segment by raw Bezier parameter t.
   * @param out Receives the evaluated point.
   * @param segment Segment to evaluate.
   * @param t Raw Bezier parameter in [0, 1].
   * @returns The out vector.
   */
  pointAt(out: vec3, segment: QuadraticBezierSegment3, t: number): vec3 {
    return segment3PointAt(out, segment, t);
  },
  /**
   * Evaluates the segment by normalized arc length.
   * @param out Receives the evaluated point.
   * @param segment Segment to evaluate.
   * @param u Normalized arc-length parameter in [0, 1].
   * @returns The out vector.
   */
  pointAtU(out: vec3, segment: QuadraticBezierSegment3, u: number): vec3 {
    return segment3PointAt(out, segment, this.mapUToT(segment, u));
  },
  /**
   * Evaluates a normalized tangent by raw Bezier parameter t.
   * @param out Receives the tangent.
   * @param segment Segment to evaluate.
   * @param t Raw Bezier parameter in [0, 1].
   * @returns The out vector.
   */
  tangentAt(out: vec3, segment: QuadraticBezierSegment3, t: number): vec3 {
    return segment3TangentAt(out, segment, t);
  },
  /**
   * Returns the approximate segment length.
   * @param segment Segment to measure.
   * @returns Segment length.
   */
  getLength(segment: QuadraticBezierSegment3): number {
    return getSegmentLength(segment as Segment3, segment3Ops);
  },
  /**
   * Returns cumulative arc lengths for this segment.
   * @param segment Segment to measure.
   * @param divisions Number of arc-length divisions.
   * @returns Cumulative arc-length table.
   */
  getLengths(segment: QuadraticBezierSegment3, divisions?: number): number[] {
    return getSegmentLengths(segment as Segment3, divisions, segment3Ops);
  },
  /**
   * Samples points by raw Bezier parameter t.
   * @param segment Segment to sample.
   * @param divisions Number of parameter divisions.
   * @returns Sampled points.
   */
  getPoints(segment: QuadraticBezierSegment3, divisions?: number): vec3[] {
    return getSegmentPoints(segment as Segment3, divisions, segment3Ops);
  },
  /**
   * Samples points by approximate arc length.
   * @param segment Segment to sample.
   * @param divisions Number of spacing divisions.
   * @returns Arc-length-spaced points.
   */
  getSpacedPoints(segment: QuadraticBezierSegment3, divisions?: number): vec3[] {
    return getSegmentSpacedPoints(segment as Segment3, divisions, segment3Ops);
  },
  /**
   * Maps normalized arc length or an explicit distance to raw Bezier parameter t.
   * @param segment Segment to map.
   * @param u Normalized arc-length parameter in [0, 1].
   * @param distance Optional absolute distance along the segment.
   * @returns Raw Bezier parameter t.
   */
  mapUToT(segment: QuadraticBezierSegment3, u: number, distance?: number): number {
    return mapUToT(segment as Segment3, u, distance, segment3Ops);
  },
  /**
   * Marks cached segment metrics dirty after direct point mutation.
   * @param segment Segment whose metrics should be recomputed lazily.
   */
  markDirty(segment: QuadraticBezierSegment3): void {
    markSegmentDirty(segment);
  }
};
