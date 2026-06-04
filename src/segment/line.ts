import { vec3 } from 'gl-matrix';
import type { ReadonlyVec3 } from 'gl-matrix';
import type { LineSegment, Segment } from '../types';
import { getSegmentLength, getSegmentLengths, getSegmentPoints, getSegmentSpacedPoints, mapUToT, markSegmentDirty, segmentOps } from './shared';
import { EPSILON } from '../helper';

/**
 * Operations for 3D straight line segments.
 * 三维直线 segment 的操作集合。
 */
export class LineSegmentImpl implements LineSegment {
  type: 'line' = 'line';
  p0: vec3;
  p1: vec3;
  arcLengthDivisions = 1;
  _needsUpdate = true;

  constructor(p0: ReadonlyVec3 = vec3.create(), p1: ReadonlyVec3 = vec3.create()) {
    this.p0 = vec3.clone(p0);
    this.p1 = vec3.clone(p1);
  }

  pointAt(out: vec3, t: number): vec3 {
    out[0] = this.p0[0] + (this.p1[0] - this.p0[0]) * t;
    out[1] = this.p0[1] + (this.p1[1] - this.p0[1]) * t;
    out[2] = this.p0[2] + (this.p1[2] - this.p0[2]) * t;
    return out;
  }

  pointAtU(out: vec3, u: number): vec3 {
    return this.pointAt(out, u);
  }

  tangentAt(out: vec3, t: number): vec3 {
    vec3.sub(out, this.p1, this.p0);
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
    return getSegmentLengths(this as Segment, divisions ?? 1, segmentOps);
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
export function createLine(p0: ReadonlyVec3 = vec3.create(), p1: ReadonlyVec3 = vec3.create()): LineSegment {
  return new LineSegmentImpl(p0, p1);
}
