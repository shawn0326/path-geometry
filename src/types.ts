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
  /** Number of samples used to build the approximate arc-length table. 用于构建近似弧长表的采样数。*/
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
  /** Start point. 起点。*/
  p0: vec3;
  /** End point. 终点。*/
  p1: vec3;
  /** Evaluate point at raw parameter t. 在原始参数 t 处求点。*/
  pointAt(out: vec3, t: number): vec3;
  /** Evaluate point at arc-length normalized parameter u. 在弧长归一化参数 u 处求点。*/
  pointAtU(out: vec3, u: number): vec3;
  /** Evaluate unit tangent at raw parameter t. 在原始参数 t 处求单位切线。*/
  tangentAt(out: vec3, t: number): vec3;
  /** Get approximate arc length. 获取近似弧长。*/
  getLength(): number;
  /** Get cumulative arc-length table. 获取累计弧长表。*/
  getLengths(divisions?: number): number[];
  /** Sample points by raw parameter. 按原始参数采样点。*/
  getPoints(divisions?: number): vec3[];
  /** Sample evenly arc-length spaced points. 等弧长采样点。*/
  getSpacedPoints(divisions?: number): vec3[];
  /** Map normalized arc-length u to raw parameter t. 将归一化弧长 u 映射到原始参数 t。*/
  mapUToT(u: number, distance?: number): number;
  /** Mark internal caches dirty. 标记内部缓存为失效。*/
  markDirty(): void;
}

/**
 * A 3D quadratic Bezier segment.
 * 三维二次 Bezier segment。
 */
export interface QuadraticBezierSegment extends SegmentBase {
  type: 'quadratic-bezier';
  /** Start point. 起点。*/
  p0: vec3;
  /** Control point. 控制点。*/
  p1: vec3;
  /** End point. 终点。*/
  p2: vec3;
  /** Evaluate point at raw parameter t. 在原始参数 t 处求点。*/
  pointAt(out: vec3, t: number): vec3;
  /** Evaluate point at arc-length normalized parameter u. 在弧长归一化参数 u 处求点。*/
  pointAtU(out: vec3, u: number): vec3;
  /** Evaluate unit tangent at raw parameter t. 在原始参数 t 处求单位切线。*/
  tangentAt(out: vec3, t: number): vec3;
  /** Get approximate arc length. 获取近似弧长。*/
  getLength(): number;
  /** Get cumulative arc-length table. 获取累计弧长表。*/
  getLengths(divisions?: number): number[];
  /** Sample points by raw parameter. 按原始参数采样点。*/
  getPoints(divisions?: number): vec3[];
  /** Sample evenly arc-length spaced points. 等弧长采样点。*/
  getSpacedPoints(divisions?: number): vec3[];
  /** Map normalized arc-length u to raw parameter t. 将归一化弧长 u 映射到原始参数 t。*/
  mapUToT(u: number, distance?: number): number;
  /** Mark internal caches dirty. 标记内部缓存为失效。*/
  markDirty(): void;
}

/**
 * A 3D cubic Bezier segment.
 * 三维三次 Bezier segment。
 */
export interface CubicBezierSegment extends SegmentBase {
  type: 'cubic-bezier';
  /** Start point. 起点。*/
  p0: vec3;
  /** First control point. 第一控制点。*/
  p1: vec3;
  /** Second control point. 第二控制点。*/
  p2: vec3;
  /** End point. 终点。*/
  p3: vec3;
  /** Evaluate point at raw parameter t. 在原始参数 t 处求点。*/
  pointAt(out: vec3, t: number): vec3;
  /** Evaluate point at arc-length normalized parameter u. 在弧长归一化参数 u 处求点。*/
  pointAtU(out: vec3, u: number): vec3;
  /** Evaluate unit tangent at raw parameter t. 在原始参数 t 处求单位切线。*/
  tangentAt(out: vec3, t: number): vec3;
  /** Get approximate arc length. 获取近似弧长。*/
  getLength(): number;
  /** Get cumulative arc-length table. 获取累计弧长表。*/
  getLengths(divisions?: number): number[];
  /** Sample points by raw parameter. 按原始参数采样点。*/
  getPoints(divisions?: number): vec3[];
  /** Sample evenly arc-length spaced points. 等弧长采样点。*/
  getSpacedPoints(divisions?: number): vec3[];
  /** Map normalized arc-length u to raw parameter t. 将归一化弧长 u 映射到原始参数 t。*/
  mapUToT(u: number, distance?: number): number;
  /** Mark internal caches dirty. 标记内部缓存为失效。*/
  markDirty(): void;
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
  /** Ordered path segments. 有序的 segment 列表。*/
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
  /** Add a closing segment from the last point back to the first point. 从最后一点到第一点添加闭合段。*/
  close?: boolean;
}

/**
 * Options for building smooth cubic curves from points.
 * 从点构建平滑三次曲线的选项。
 */
export interface SmoothCurveOptions {
  /** Smoothness factor used by the t3d-style control point algorithm. t3d 风格控制点算法使用的平滑系数。*/
  smooth?: number;
  /** Add a closing segment from the last point back to the first point. 从最后一点到第一点添加闭合段。*/
  close?: boolean;
}

/**
 * Options for building beveled curves from points.
 * 从点构建倒角曲线的选项。
 */
export interface BeveledCurveOptions {
  /** Maximum bevel radius around each corner. 每个转角处的最大倒角半径。*/
  bevelRadius?: number;
  /** Add a closing segment from the last point back to the first point. 从最后一点到第一点添加闭合段。*/
  close?: boolean;
}

/**
 * Options for explicitly preprocessing point arrays before path construction.
 * 在构建 path 前显式预处理点数组的选项。
 */
export interface PointPreprocessOptions {
  /** Also remove a duplicated closing point when it equals the first point. 等于第一点时同样移除重复的闭合点。*/
  close?: boolean;
  /** Remove consecutive duplicate points. Defaults to true. 移除连续重复点，默认 true。*/
  removeConsecutiveDuplicates?: boolean;
  /** Remove a final point equal to the first point. Defaults to close === true. 移除等于第一点的末点，默认为 close === true。*/
  removeClosingDuplicate?: boolean;
}

/**
 * Frame data sampled from a 3D path for mesh generation.
 * 为网格生成从三维 path 采样得到的 frame 数据。
 */
export interface PathFrames {
  /** Sampled path points. 采样 path 点。*/
  points: vec3[];
  /** Unit tangents at sampled points. 采样点处的单位切线。*/
  tangents: vec3[];
  /** Unit normals at sampled points. 采样点处的单位法线。*/
  normals: vec3[];
  /** Unit binormals at sampled points. 采样点处的单位副法线。*/
  binormals: vec3[];
  /** Corner bisectors matching the t3d frame output. 匹配 t3d frame 输出的转角二等分向量。*/
  bisectors: vec3[];
  /** Cumulative distances along sampled points. 沿采样点的累计距离。*/
  lengths: number[];
  /** Width scale hints for corner joins. 转角连接处的宽度缩放系数。*/
  widthScales: number[];
  /** Whether each sampled point is considered a sharp corner. 每个采样点是否为尖锐转角。*/
  sharps: boolean[];
  /** Tangent correction markers used around line-to-curve transitions. 直线-曲线过渡处的切线修正标记。*/
  tangentTypes: number[];
}

/**
 * Options for building 3D path frames.
 * 构建三维 path frame 的选项。
 */
export interface BuildFramesOptions {
  /** Initial normal direction. When omitted, a stable perpendicular axis is chosen. 初始法线方向，省略时自动选择稳定的垂直轴。*/
  initialNormal?: ReadonlyVec3 | null;
  /** Number of samples per non-line segment. Line segments always use one division. 非直线 segment 的采样数，直线 segment 始终使用一个分段。*/
  divisions?: number;
  /** Use parallel-transport frame propagation. 使用平行传输法传播 frame。*/
  transport?: boolean;
  /** Match t3d's line-to-curve tangent correction behavior. 匹配 t3d 在直线-曲线切换处的切线修正行为。*/
  fixLine?: boolean;
  /** Treat the generated frame sequence as closed. 将生成的 frame 序列视为闭合。*/
  close?: boolean;
}

/**
 * Renderer-neutral indexed 3D geometry buffers.
 * 与渲染器无关的三维索引几何数据。
 */
export interface GeometryData {
  /** Flat XYZ vertex positions. 平铺 XYZ 顶点坐标。*/
  positions: number[];
  /** Flat XYZ vertex normals. 平铺 XYZ 顶点法线。*/
  normals: number[];
  /** Flat UV coordinates. 平铺 UV 坐标。*/
  uvs: number[];
  /** Secondary flat UV coordinates, usually normalized by total path length. 辅助 UV 坐标，通常按 path 总长度归一化。*/
  uvs2: number[];
  /** Triangle indices. 三角形索引。*/
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
  /** Tube radius. Defaults to 0.1. 管半径，默认 0.1。*/
  radius?: number;
  /** Number of segments around each tube ring. Defaults to 8. 每圈环绕的分段数，默认 8。*/
  radialSegments?: number;
  /** Initial angle around the tangent axis in radians. Defaults to 0. 沿切线轴的起始角度（弧度），默认 0。*/
  startRad?: number;
  /** Add triangles that close the first tube ring. Defaults to false. 添加封闭第一圈管环的三角面，默认 false。*/
  generateStartCap?: boolean;
  /** Add triangles that close the last tube ring. Defaults to false. 添加封闭最后一圈管环的三角面，默认 false。*/
  generateEndCap?: boolean;
}

/**
 * Which side of the path a ribbon should occupy.
 * 带状相对于路径中心线占据的侧边。
 */
export type RibbonSide = 'both' | 'left' | 'right';

/**
 * Options for building ribbon geometry from 3D path frames.
 * 从三维 path frame 构建带状几何的选项。
 */
export interface BuildRibbonOptions {
  /** Full ribbon width. Defaults to 0.1. 带状总宽度，默认 0.1。*/
  width?: number;
  /** Add an arrow head at the end of the ribbon. Defaults to false. 在带状末端添加箭头，默认 false。*/
  arrow?: boolean;
  /** Build both sides or only one side relative to the path center line. Defaults to 'both'. 相对于路径中心线构建双侧或单侧，默认 'both'。*/
  side?: RibbonSide;
  /** Add extra triangles around sharp corners. Defaults to false. 在尖锐转角处添加额外三角面，默认 false。*/
  sharp?: boolean;
}

/**
 * Read-only 3D vector input accepted by path-math APIs.
 * path-math API 接受的只读三维向量输入。
 */
export type ReadonlyVector = ReadonlyVec3;
