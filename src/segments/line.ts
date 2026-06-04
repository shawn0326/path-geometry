import { vec3 } from 'gl-matrix';
import type { ReadonlyVec3 } from 'gl-matrix';
import type { LineSegment, Segment } from '../types';
import { getSegmentLength, getSegmentLengths, getSegmentPoints, getSegmentSpacedPoints, mapUToT, markSegmentDirty, segmentOps, segmentPointAt, segmentTangentAt } from './shared';

/**
 * Operations for 3D straight line segments.
 * 三维直线 segment 的操作集合。
 */
export const line = {
  /**
   * Creates a 3D line segment and clones the input points.
   * @param p0 Start point.
   * @param p1 End point.
   * @returns A new line segment.
   */
  create(p0: ReadonlyVec3 = vec3.create(), p1: ReadonlyVec3 = vec3.create()): LineSegment {
    return { type: 'line', p0: vec3.clone(p0), p1: vec3.clone(p1), arcLengthDivisions: 1, _needsUpdate: true };
  },
  /**
   * Evaluates the segment by raw parameter t.
   * @param out Receives the evaluated point.
   * @param segment Segment to evaluate.
   * @param t Raw segment parameter in [0, 1].
   * @returns The out vector.
   */
  pointAt(out: vec3, segment: LineSegment, t: number): vec3 {
    return segmentPointAt(out, segment, t);
  },
  /**
   * Evaluates the segment by normalized arc length.
   * @param out Receives the evaluated point.
   * @param segment Segment to evaluate.
   * @param u Normalized arc-length parameter in [0, 1].
   * @returns The out vector.
   */
  pointAtU(out: vec3, segment: LineSegment, u: number): vec3 {
    return segmentPointAt(out, segment, u);
  },
  /**
   * Evaluates a normalized tangent by raw parameter t.
   * @param out Receives the tangent.
   * @param segment Segment to evaluate.
   * @param t Raw segment parameter in [0, 1].
   * @returns The out vector.
   */
  tangentAt(out: vec3, segment: LineSegment, t: number): vec3 {
    return segmentTangentAt(out, segment, t);
  },
  /**
   * Returns the approximate segment length.
   * @param segment Segment to measure.
   * @returns Segment length.
   */
  getLength(segment: LineSegment): number {
    return getSegmentLength(segment as Segment, segmentOps);
  },
  /**
   * Returns cumulative arc lengths for this segment.
   * @param segment Segment to measure.
   * @param divisions Number of arc-length divisions.
   * @returns Cumulative arc-length table.
   */
  getLengths(segment: LineSegment, divisions?: number): number[] {
    return getSegmentLengths(segment as Segment, divisions ?? 1, segmentOps);
  },
  /**
   * Samples points by raw parameter t.
   * @param segment Segment to sample.
   * @param divisions Number of parameter divisions.
   * @returns Sampled points.
   */
  getPoints(segment: LineSegment, divisions?: number): vec3[] {
    return getSegmentPoints(segment as Segment, divisions, segmentOps);
  },
  /**
   * Samples points by approximate arc length.
   * @param segment Segment to sample.
   * @param divisions Number of spacing divisions.
   * @returns Arc-length-spaced points.
   */
  getSpacedPoints(segment: LineSegment, divisions?: number): vec3[] {
    return getSegmentSpacedPoints(segment as Segment, divisions, segmentOps);
  },
  /**
   * Maps normalized arc length or an explicit distance to raw parameter t.
   * @param segment Segment to map.
   * @param u Normalized arc-length parameter in [0, 1].
   * @param distance Optional absolute distance along the segment.
   * @returns Raw segment parameter t.
   */
  mapUToT(segment: LineSegment, u: number, distance?: number): number {
    return mapUToT(segment as Segment, u, distance, segmentOps);
  },
  /**
   * Marks cached segment metrics dirty after direct point mutation.
   * @param segment Segment whose metrics should be recomputed lazily.
   */
  markDirty(segment: LineSegment): void {
    markSegmentDirty(segment);
  }
};
