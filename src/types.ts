import type { vec2, vec3, ReadonlyVec2, ReadonlyVec3 } from 'gl-matrix';

/** @internal */
export interface SegmentMetrics {
  divisions: number;
  lengths: number[];
  totalLength: number;
  needsUpdate: boolean;
}

/**
 * Shared fields used by all segment objects.
 * 中文：所有 segment 对象共享的基础字段。
 */
export interface SegmentBase {
  /** Number of samples used to build the approximate arc-length table. */
  arcLengthDivisions?: number;
  /** @internal */
  _metrics?: SegmentMetrics;
  /** @internal */
  _needsUpdate?: boolean;
}

/**
 * A 2D straight line segment.
 * 中文：二维直线 segment。
 */
export interface LineSegment2 extends SegmentBase {
  type: 'line';
  /** Start point. */
  p0: vec2;
  /** End point. */
  p1: vec2;
}

/**
 * A 2D quadratic Bezier segment.
 * 中文：二维二次 Bezier segment。
 */
export interface QuadraticBezierSegment2 extends SegmentBase {
  type: 'quadratic-bezier';
  /** Start point. */
  p0: vec2;
  /** Control point. */
  p1: vec2;
  /** End point. */
  p2: vec2;
}

/**
 * A 2D cubic Bezier segment.
 * 中文：二维三次 Bezier segment。
 */
export interface CubicBezierSegment2 extends SegmentBase {
  type: 'cubic-bezier';
  /** Start point. */
  p0: vec2;
  /** First control point. */
  p1: vec2;
  /** Second control point. */
  p2: vec2;
  /** End point. */
  p3: vec2;
}

/**
 * Any supported 2D segment.
 * 中文：任意受支持的二维 segment。
 */
export type Segment2 = LineSegment2 | QuadraticBezierSegment2 | CubicBezierSegment2;

/**
 * A 3D straight line segment.
 * 中文：三维直线 segment。
 */
export interface LineSegment3 extends SegmentBase {
  type: 'line';
  /** Start point. */
  p0: vec3;
  /** End point. */
  p1: vec3;
}

/**
 * A 3D quadratic Bezier segment.
 * 中文：三维二次 Bezier segment。
 */
export interface QuadraticBezierSegment3 extends SegmentBase {
  type: 'quadratic-bezier';
  /** Start point. */
  p0: vec3;
  /** Control point. */
  p1: vec3;
  /** End point. */
  p2: vec3;
}

/**
 * A 3D cubic Bezier segment.
 * 中文：三维三次 Bezier segment。
 */
export interface CubicBezierSegment3 extends SegmentBase {
  type: 'cubic-bezier';
  /** Start point. */
  p0: vec3;
  /** First control point. */
  p1: vec3;
  /** Second control point. */
  p2: vec3;
  /** End point. */
  p3: vec3;
}

/**
 * Any supported 3D segment.
 * 中文：任意受支持的三维 segment。
 */
export type Segment3 = LineSegment3 | QuadraticBezierSegment3 | CubicBezierSegment3;

/** @internal */
export interface PathMetrics {
  lengths: number[];
  totalLength: number;
  segmentCount: number;
  needsUpdate: boolean;
}

/**
 * A 2D path made of ordered 2D segments.
 * 中文：由有序二维 segment 组成的 path。
 */
export interface Path2 {
  /** Ordered path segments. */
  segments: Segment2[];
  /** @internal */
  _metrics?: PathMetrics;
  /** @internal */
  _needsUpdate?: boolean;
}

/**
 * A 3D path made of ordered 3D segments.
 * 中文：由有序三维 segment 组成的 path。
 */
export interface Path3 {
  /** Ordered path segments. */
  segments: Segment3[];
  /** @internal */
  _metrics?: PathMetrics;
  /** @internal */
  _needsUpdate?: boolean;
}

/**
 * Options for building a path from polyline points.
 * 中文：从折线点构建 path 的选项。
 */
export interface PolylineOptions {
  /** Add a closing segment from the last point back to the first point. */
  close?: boolean;
}

/**
 * Options for building smooth cubic curves from points.
 * 中文：从点构建平滑三次曲线的选项。
 */
export interface SmoothCurveOptions {
  /** Smoothness factor used by the t3d-style control point algorithm. */
  smooth?: number;
  /** Add a closing segment from the last point back to the first point. */
  close?: boolean;
}

/**
 * Options for building beveled curves from points.
 * 中文：从点构建倒角曲线的选项。
 */
export interface BeveledCurveOptions {
  /** Maximum bevel radius around each corner. */
  bevelRadius?: number;
  /** Add a closing segment from the last point back to the first point. */
  close?: boolean;
}

/**
 * Options for explicitly preprocessing point arrays before path construction.
 * 中文：在构建 path 前显式预处理点数组的选项。
 */
export interface PointPreprocessOptions {
  /** Also remove a duplicated closing point when it equals the first point. */
  close?: boolean;
  /** Remove consecutive duplicate points. Defaults to true. */
  removeConsecutiveDuplicates?: boolean;
  /** Remove a final point equal to the first point. Defaults to close === true. */
  removeClosingDuplicate?: boolean;
}

/**
 * Frame data sampled from a 3D path for mesh generation.
 * 中文：为网格生成从三维 path 采样得到的 frame 数据。
 */
export interface PathFrames3 {
  /** Sampled path points. */
  points: vec3[];
  /** Unit tangents at sampled points. */
  tangents: vec3[];
  /** Unit normals at sampled points. */
  normals: vec3[];
  /** Unit binormals at sampled points. */
  binormals: vec3[];
  /** Corner bisectors matching the t3d frame output. */
  bisectors: vec3[];
  /** Cumulative distances along sampled points. */
  lengths: number[];
  /** Width scale hints for corner joins. */
  widthScales: number[];
  /** Whether each sampled point is considered a sharp corner. */
  sharps: boolean[];
  /** Tangent correction markers used around line-to-curve transitions. */
  tangentTypes: number[];
}

/**
 * Options for building 3D path frames.
 * 中文：构建三维 path frame 的选项。
 */
export interface BuildFramesOptions3 {
  /** Initial normal direction. When omitted, a stable perpendicular axis is chosen. */
  initialNormal?: ReadonlyVec3 | null;
  /** Number of samples per non-line segment. Line segments always use one division. */
  divisions?: number;
  /** Use parallel-transport frame propagation. */
  frenet?: boolean;
  /** Match t3d's line-to-curve tangent correction behavior. */
  fixLine?: boolean;
  /** Treat the generated frame sequence as closed. */
  close?: boolean;
}

/**
 * Read-only 2D vector input accepted by path-math APIs.
 * 中文：path-math API 接受的只读二维向量输入。
 */
export type ReadonlyVector2 = ReadonlyVec2;

/**
 * Read-only 3D vector input accepted by path-math APIs.
 * 中文：path-math API 接受的只读三维向量输入。
 */
export type ReadonlyVector3 = ReadonlyVec3;
