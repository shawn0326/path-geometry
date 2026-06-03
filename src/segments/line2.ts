import { vec2 } from 'gl-matrix';
import type { ReadonlyVec2 } from 'gl-matrix';
import type { LineSegment2, Segment2 } from '../types';
import { getSegmentLength, getSegmentLengths, getSegmentPoints, getSegmentSpacedPoints, mapUToT, markSegmentDirty, segment2Ops, segment2PointAt, segment2TangentAt } from './shared';

/**
 * Operations for 2D straight line segments.
 * 中文：二维直线 segment 的操作集合。
 */
export const line2 = {
  /**
   * Creates a 2D line segment and clones the input points.
   * @param p0 Start point.
   * @param p1 End point.
   * @returns A new line segment.
   */
  create(p0: ReadonlyVec2 = vec2.create(), p1: ReadonlyVec2 = vec2.create()): LineSegment2 {
    return { type: 'line', p0: vec2.clone(p0), p1: vec2.clone(p1), arcLengthDivisions: 1, _needsUpdate: true };
  },
  /**
   * Evaluates the segment by raw parameter t.
   * @param out Receives the evaluated point.
   * @param segment Segment to evaluate.
   * @param t Raw segment parameter in [0, 1].
   * @returns The out vector.
   */
  pointAt(out: vec2, segment: LineSegment2, t: number): vec2 {
    return segment2PointAt(out, segment, t);
  },
  /**
   * Evaluates the segment by normalized arc length.
   * @param out Receives the evaluated point.
   * @param segment Segment to evaluate.
   * @param u Normalized arc-length parameter in [0, 1].
   * @returns The out vector.
   */
  pointAtU(out: vec2, segment: LineSegment2, u: number): vec2 {
    return segment2PointAt(out, segment, u);
  },
  /**
   * Evaluates a normalized tangent by raw parameter t.
   * @param out Receives the tangent.
   * @param segment Segment to evaluate.
   * @param t Raw segment parameter in [0, 1].
   * @returns The out vector.
   */
  tangentAt(out: vec2, segment: LineSegment2, t: number): vec2 {
    return segment2TangentAt(out, segment, t);
  },
  /**
   * Returns the approximate segment length.
   * @param segment Segment to measure.
   * @returns Segment length.
   */
  getLength(segment: LineSegment2): number {
    return getSegmentLength(segment as Segment2, segment2Ops);
  },
  /**
   * Returns cumulative arc lengths for this segment.
   * @param segment Segment to measure.
   * @param divisions Number of arc-length divisions.
   * @returns Cumulative arc-length table.
   */
  getLengths(segment: LineSegment2, divisions?: number): number[] {
    return getSegmentLengths(segment as Segment2, divisions ?? 1, segment2Ops);
  },
  /**
   * Samples points by raw parameter t.
   * @param segment Segment to sample.
   * @param divisions Number of parameter divisions.
   * @returns Sampled points.
   */
  getPoints(segment: LineSegment2, divisions?: number): vec2[] {
    return getSegmentPoints(segment as Segment2, divisions, segment2Ops);
  },
  /**
   * Samples points by approximate arc length.
   * @param segment Segment to sample.
   * @param divisions Number of spacing divisions.
   * @returns Arc-length-spaced points.
   */
  getSpacedPoints(segment: LineSegment2, divisions?: number): vec2[] {
    return getSegmentSpacedPoints(segment as Segment2, divisions, segment2Ops);
  },
  /**
   * Maps normalized arc length or an explicit distance to raw parameter t.
   * @param segment Segment to map.
   * @param u Normalized arc-length parameter in [0, 1].
   * @param distance Optional absolute distance along the segment.
   * @returns Raw segment parameter t.
   */
  mapUToT(segment: LineSegment2, u: number, distance?: number): number {
    return mapUToT(segment as Segment2, u, distance, segment2Ops);
  },
  /**
   * Marks cached segment metrics dirty after direct point mutation.
   * @param segment Segment whose metrics should be recomputed lazily.
   */
  markDirty(segment: LineSegment2): void {
    markSegmentDirty(segment);
  }
};
