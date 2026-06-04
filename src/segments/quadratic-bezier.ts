import { vec3 } from 'gl-matrix';
import type { ReadonlyVec3 } from 'gl-matrix';
import type { QuadraticBezierSegment, Segment } from '../types';
import { getSegmentLength, getSegmentLengths, getSegmentPoints, getSegmentSpacedPoints, mapUToT, markSegmentDirty, segmentOps } from './shared';
import { EPSILON } from '../helper';

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
export function createQuadraticBezier(p0: ReadonlyVec3 = vec3.create(), p1: ReadonlyVec3 = vec3.create(), p2: ReadonlyVec3 = vec3.create()): QuadraticBezierSegment {
  return new QuadraticBezierSegmentImpl(p0, p1, p2);
}
