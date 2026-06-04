import type { vec3, ReadonlyVec3 } from 'gl-matrix';

/** @internal */
export interface SegmentMetrics {
  divisions: number;
  lengths: number[];
  totalLength: number;
  needsUpdate: boolean;
}

/**
 * Shared fields used by all segment objects.
 * 所有 segment 对象共享的基础字段。
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
 * A 3D straight line segment.
 * 三维直线 segment。
 */
export interface LineSegment extends SegmentBase {
  type: 'line';
  /** Start point. */
  p0: vec3;
  /** End point. */
  p1: vec3;
}

/**
 * A 3D quadratic Bezier segment.
 * 三维二次 Bezier segment。
 */
export interface QuadraticBezierSegment extends SegmentBase {
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
 * 三维三次 Bezier segment。
 */
export interface CubicBezierSegment extends SegmentBase {
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
 * 任意受支持的三维 segment。
 */
export type Segment = LineSegment | QuadraticBezierSegment | CubicBezierSegment;

/** @internal */
export interface PathMetrics {
  lengths: number[];
  totalLength: number;
  segmentCount: number;
  needsUpdate: boolean;
}

/**
 * A 3D path made of ordered 3D segments.
 * 由有序三维 segment 组成的 path。
 */
export interface Path {
  /** Ordered path segments. */
  segments: Segment[];
  /** @internal */
  _metrics?: PathMetrics;
  /** @internal */
  _needsUpdate?: boolean;
}

/**
 * Options for building a path from polyline points.
 * 从折线点构建 path 的选项。
 */
export interface PolylineOptions {
  /** Add a closing segment from the last point back to the first point. */
  close?: boolean;
}

/**
 * Options for building smooth cubic curves from points.
 * 从点构建平滑三次曲线的选项。
 */
export interface SmoothCurveOptions {
  /** Smoothness factor used by the t3d-style control point algorithm. */
  smooth?: number;
  /** Add a closing segment from the last point back to the first point. */
  close?: boolean;
}

/**
 * Options for building beveled curves from points.
 * 从点构建倒角曲线的选项。
 */
export interface BeveledCurveOptions {
  /** Maximum bevel radius around each corner. */
  bevelRadius?: number;
  /** Add a closing segment from the last point back to the first point. */
  close?: boolean;
}

/**
 * Options for explicitly preprocessing point arrays before path construction.
 * 在构建 path 前显式预处理点数组的选项。
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
 * 为网格生成从三维 path 采样得到的 frame 数据。
 */
export interface PathFrames {
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
 * 构建三维 path frame 的选项。
 */
export interface BuildFramesOptions {
  /** Initial normal direction. When omitted, a stable perpendicular axis is chosen. */
  initialNormal?: ReadonlyVec3 | null;
  /** Number of samples per non-line segment. Line segments always use one division. */
  divisions?: number;
  /** Use parallel-transport frame propagation. */
  transport?: boolean;
  /** Match t3d's line-to-curve tangent correction behavior. */
  fixLine?: boolean;
  /** Treat the generated frame sequence as closed. */
  close?: boolean;
}

/**
 * Renderer-neutral indexed 3D geometry buffers.
 * 与渲染器无关的三维索引几何数据。
 */
export interface GeometryData {
  /** Flat XYZ vertex positions. */
  positions: number[];
  /** Flat XYZ vertex normals. */
  normals: number[];
  /** Flat UV coordinates. */
  uvs: number[];
  /** Secondary flat UV coordinates, usually normalized by total path length. */
  uvs2: number[];
  /** Triangle indices. */
  indices: number[];
}

/**
 * Geometry buffers generated for a tube along a 3D path.
 * 沿三维 path 生成的管状几何数据。
 */
export interface TubeGeometryData extends GeometryData {}

/**
 * Geometry buffers generated for a ribbon along a 3D path.
 * 沿三维 path 生成的带状几何数据。
 */
export interface RibbonGeometryData extends GeometryData {}

/**
 * Options for building tube geometry from 3D path frames.
 * 从三维 path frame 构建管状几何的选项。
 */
export interface BuildTubeOptions {
  /** Tube radius. Defaults to 0.1. */
  radius?: number;
  /** Number of segments around each tube ring. Defaults to 8. */
  radialSegments?: number;
  /** Initial angle around the tangent axis in radians. Defaults to 0. */
  startRad?: number;
  /** Add triangles that close the first tube ring. Defaults to false. */
  generateStartCap?: boolean;
  /** Add triangles that close the last tube ring. Defaults to false. */
  generateEndCap?: boolean;
}

/** Which side of the path a ribbon should occupy. */
export type RibbonSide = 'both' | 'left' | 'right';

/**
 * Options for building ribbon geometry from 3D path frames.
 * 从三维 path frame 构建带状几何的选项。
 */
export interface BuildRibbonOptions {
  /** Full ribbon width. Defaults to 0.1. */
  width?: number;
  /** Add an arrow head at the end of the ribbon. Defaults to false. */
  arrow?: boolean;
  /** Build both sides or only one side relative to the path center line. Defaults to 'both'. */
  side?: RibbonSide;
  /** Add extra triangles around sharp corners. Defaults to false. */
  sharp?: boolean;
}

/**
 * Read-only 3D vector input accepted by path-math APIs.
 * path-math API 接受的只读三维向量输入。
 */
export type ReadonlyVector = ReadonlyVec3;
