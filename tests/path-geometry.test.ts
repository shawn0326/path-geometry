import { describe, expect, it } from 'vitest';
import { vec3 } from '../src/vector';
import type { Vector3 } from '../src/vector';
import { Vector3 as T3DVector3 } from 't3d';
import { LineCurve3 as T3DLineCurve3 } from 't3d/examples/jsm/math/curves/LineCurve3.js';
import { QuadraticBezierCurve3 as T3DQuadraticBezierCurve3 } from 't3d/examples/jsm/math/curves/QuadraticBezierCurve3.js';
import { CubicBezierCurve3 as T3DCubicBezierCurve3 } from 't3d/examples/jsm/math/curves/CubicBezierCurve3.js';
import { CurvePath3 as T3DCurvePath3 } from 't3d/examples/jsm/math/curves/CurvePath3.js';
import { segment, path, geometry } from '../src/index';
import type { Path, PathFrames, PolylineOptions, ReadonlyVector } from '../src/index';

const EPS = 1e-5;

function expectVec3Close(actual: Vector3, expected: Vector3, epsilon = EPS): void {
  expect(actual[0]!).toBeCloseTo(expected[0]!, 5);
  expect(actual[1]!).toBeCloseTo(expected[1]!, 5);
  expect(actual[2]!).toBeCloseTo(expected[2]!, 5);
  expect(Math.abs(actual[0]! - expected[0]!)).toBeLessThanOrEqual(epsilon);
  expect(Math.abs(actual[1]! - expected[1]!)).toBeLessThanOrEqual(epsilon);
  expect(Math.abs(actual[2]! - expected[2]!)).toBeLessThanOrEqual(epsilon);
}

function vec3FromT3D(v: T3DVector3): Vector3 {
  return vec3.fromValues(v.x, v.y, v.z);
}

function toT3DVector3(v: ReadonlyVector): T3DVector3 {
  return new T3DVector3(v[0]!, v[1]!, v[2]!);
}

function expectT3DPointsClose(actual: Vector3[], expected: T3DVector3[], epsilon = EPS): void {
  expect(actual).toHaveLength(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expectVec3Close(actual[i]!, vec3FromT3D(expected[i]!), epsilon);
  }
}

function expectNumberArrayClose(actual: number[], expected: number[], epsilon = EPS): void {
  expect(actual).toHaveLength(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(Math.abs(actual[i]! - expected[i]!)).toBeLessThanOrEqual(epsilon);
  }
}

function expectFramesClose(actual: PathFrames, expected: ReturnType<T3DCurvePath3['computeFrames']>, epsilon = EPS): void {
  expectT3DPointsClose(actual.points, expected.points, epsilon);
  expectT3DPointsClose(actual.tangents, expected.tangents, epsilon);
  expectT3DPointsClose(actual.normals, expected.normals, epsilon);
  expectT3DPointsClose(actual.binormals, expected.binormals, epsilon);
  expectNumberArrayClose(actual.lengths, expected.lengths, epsilon);
  expectNumberArrayClose(actual.widthScales, expected.widthScales, epsilon);
  expect(actual.sharps).toEqual(expected.sharps);
  expect(actual.tangentTypes).toEqual(expected.tangentTypes);
}

function expectCurvePathControlsClose(ours: Path, t3d: T3DCurvePath3, epsilon = EPS): void {
  expect(ours.segments).toHaveLength(t3d.curves.length);
  for (let i = 0; i < t3d.curves.length; i++) {
    const oursSegment = ours.segments[i]!;
    const t3dCurve = t3d.curves[i]!;
    if (t3dCurve.isLineCurve3) {
      expect(oursSegment.type).toBe('line');
      if (oursSegment.type !== 'line') continue;
      expectVec3Close(oursSegment.p0, vec3FromT3D(t3dCurve.v1!), epsilon);
      expectVec3Close(oursSegment.p1, vec3FromT3D(t3dCurve.v2!), epsilon);
    } else if (t3dCurve.isQuadraticBezierCurve3) {
      expect(oursSegment.type).toBe('quadratic-bezier');
      if (oursSegment.type !== 'quadratic-bezier') continue;
      expectVec3Close(oursSegment.p0, vec3FromT3D(t3dCurve.v0!), epsilon);
      expectVec3Close(oursSegment.p1, vec3FromT3D(t3dCurve.v1!), epsilon);
      expectVec3Close(oursSegment.p2, vec3FromT3D(t3dCurve.v2!), epsilon);
    } else if (t3dCurve.isCubicBezierCurve3) {
      expect(oursSegment.type).toBe('cubic-bezier');
      if (oursSegment.type !== 'cubic-bezier') continue;
      expectVec3Close(oursSegment.p0, vec3FromT3D(t3dCurve.v0!), epsilon);
      expectVec3Close(oursSegment.p1, vec3FromT3D(t3dCurve.v1!), epsilon);
      expectVec3Close(oursSegment.p2, vec3FromT3D(t3dCurve.v2!), epsilon);
      expectVec3Close(oursSegment.p3, vec3FromT3D(t3dCurve.v3!), epsilon);
    } else {
      throw new Error(`Unsupported t3d curve at index ${i}`);
    }
  }
}

function createPolyline(points: ReadonlyVector[], options?: PolylineOptions): Path {
  const targetPath = path.create();
  return targetPath.setPolyline(points, options);
}

function createStraightFrames(): PathFrames {
  const p = createPolyline([
    vec3.fromValues(0, 0, 0),
    vec3.fromValues(10, 0, 0)
  ]);

  return p.buildFrames({
    divisions: 1,
    initialNormal: vec3.fromValues(0, 1, 0)
  });
}

describe('segments', () => {
  it('uses plain number arrays for vector outputs', () => {
    const line = segment.createLine([0, 0, 0], [1, 2, 3]);
    const frames = path.create().setPolyline([[0, 0, 0], [1, 0, 0]]).buildFrames();

    expect(Array.isArray(line.p0)).toBe(true);
    expect(Array.isArray(line.getPoints(1)[0]!)).toBe(true);
    expect(Array.isArray(frames.points[0]!)).toBe(true);
    expect(Array.isArray(frames.tangents[0]!)).toBe(true);
  });

  it('samples line endpoints and length', () => {
    const seg = segment.createLine(vec3.fromValues(0, 0, 0), vec3.fromValues(3, 4, 0));
    const out = vec3.create();
    expectVec3Close(seg.pointAt(out, 0), vec3.fromValues(0, 0, 0));
    expectVec3Close(seg.pointAt(out, 1), vec3.fromValues(3, 4, 0));
    expect(seg.getLength()).toBeCloseTo(5);
    expect(seg.mapUToT(0.5)).toBeCloseTo(0.5);
  });

  it('samples quadratic and cubic endpoints', () => {
    const q = segment.createQuadraticBezier(vec3.fromValues(0, 0, 0), vec3.fromValues(5, 5, 0), vec3.fromValues(10, 0, 0));
    const c = segment.createCubicBezier(vec3.fromValues(0, 0, 0), vec3.fromValues(3, 6, 0), vec3.fromValues(7, 6, 0), vec3.fromValues(10, 0, 0));
    const out = vec3.create();
    expectVec3Close(q.pointAt(out, 0), vec3.fromValues(0, 0, 0));
    expectVec3Close(q.pointAt(out, 1), vec3.fromValues(10, 0, 0));
    expectVec3Close(c.pointAt(out, 0), vec3.fromValues(0, 0, 0));
    expectVec3Close(c.pointAt(out, 1), vec3.fromValues(10, 0, 0));
  });

  it('returns normalized tangents and refreshes dirty length caches', () => {
    const seg = segment.createLine(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 0, 0));
    const tangent = vec3.create();
    seg.tangentAt(tangent, 0.5);
    expect(vec3.len(tangent)).toBeCloseTo(1);

    expect(seg.getLength()).toBeCloseTo(1);
    seg.p1[0] = 2;
    expect(seg.getLength()).toBeCloseTo(1);
    seg.markDirty();
    expect(seg.getLength()).toBeCloseTo(2);
  });

  it('matches t3d Curve getPoints and getSpacedPoints count behavior', () => {
    const seg = segment.createLine(vec3.fromValues(0, 0, 0), vec3.fromValues(10, 0, 0));
    const linePoints = seg.getPoints(5);
    expect(linePoints).toHaveLength(6);
    expectVec3Close(linePoints[3]!, vec3.fromValues(6, 0, 0));

    const cubic = segment.createCubicBezier(
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(0, 10, 0),
      vec3.fromValues(10, 10, 0),
      vec3.fromValues(10, 0, 0)
    );
    const spaced = cubic.getSpacedPoints(4);
    expect(spaced).toHaveLength(5);
    expectVec3Close(spaced[0]!, vec3.fromValues(0, 0, 0));
    expectVec3Close(spaced[4]!, vec3.fromValues(10, 0, 0));
  });

  it('matches a t3d cubic getPointAt and getSpacedPoints fixture', () => {
    const cubic = segment.createCubicBezier(
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(0, 10, 0),
      vec3.fromValues(10, 10, 5),
      vec3.fromValues(10, 0, 0)
    );
    const point = cubic.pointAtU(vec3.create(), 0.5);
    expectVec3Close(point, vec3.fromValues(5.097610538491925, 7.4987294808879765, 1.8990822487770207), 1e-5);

    const spaced = cubic.getSpacedPoints(4);
    const expected = [
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(1.1201159583222406, 4.945930886811336, 0.514920573467789),
      vec3.fromValues(5.097610538491925, 7.4987294808879765, 1.8990822487770207),
      vec3.fromValues(9.035257846296274, 4.654834152414374, 1.8804580114550629),
      vec3.fromValues(10, 0, 0)
    ];
    for (let i = 0; i < expected.length; i++) {
      expectVec3Close(spaced[i]!, expected[i]!, 1e-5);
    }
  });

  it('matches t3d npm cubic getPointAt and getSpacedPoints at runtime', () => {
    const ours = segment.createCubicBezier(
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(0, 10, 0),
      vec3.fromValues(10, 10, 5),
      vec3.fromValues(10, 0, 0)
    );
    const t3d = new T3DCubicBezierCurve3(
      new T3DVector3(0, 0, 0),
      new T3DVector3(0, 10, 0),
      new T3DVector3(10, 10, 5),
      new T3DVector3(10, 0, 0)
    );

    expectVec3Close(ours.pointAtU(vec3.create(), 0.5), vec3FromT3D(t3d.getPointAt(0.5)), 1e-5);
    const oursSpaced = ours.getSpacedPoints(4);
    const t3dSpaced = t3d.getSpacedPoints(4);
    for (let i = 0; i < t3dSpaced.length; i++) {
      expectVec3Close(oursSpaced[i]!, vec3FromT3D(t3dSpaced[i]!), 1e-5);
    }
  });

  it('matches t3d npm line and quadratic curve sampling at runtime', () => {
    const line = segment.createLine(vec3.fromValues(-1, 2, 3), vec3.fromValues(4, -2, 8));
    const t3dLine = new T3DLineCurve3(new T3DVector3(-1, 2, 3), new T3DVector3(4, -2, 8));
    expect(line.getLength()).toBeCloseTo(t3dLine.getLength());
    expectNumberArrayClose(line.getLengths(1), t3dLine.getLengths(1));
    expectT3DPointsClose(line.getPoints(5), t3dLine.getPoints(5));
    expectT3DPointsClose(line.getSpacedPoints(5), t3dLine.getSpacedPoints(5));
    expectVec3Close(line.pointAtU(vec3.create(), 0.35), vec3FromT3D(t3dLine.getPointAt(0.35)));

    const quadratic = segment.createQuadraticBezier(
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(3, 9, -2),
      vec3.fromValues(10, 0, 5)
    );
    const t3dQuadratic = new T3DQuadraticBezierCurve3(
      new T3DVector3(0, 0, 0),
      new T3DVector3(3, 9, -2),
      new T3DVector3(10, 0, 5)
    );
    expect(quadratic.getLength()).toBeCloseTo(t3dQuadratic.getLength());
    expectNumberArrayClose(quadratic.getLengths(12), t3dQuadratic.getLengths(12));
    expectT3DPointsClose(quadratic.getPoints(6), t3dQuadratic.getPoints(6));
    expectT3DPointsClose(quadratic.getSpacedPoints(6), t3dQuadratic.getSpacedPoints(6));
    expectVec3Close(quadratic.pointAtU(vec3.create(), 0.35), vec3FromT3D(t3dQuadratic.getPointAt(0.35)));
  });
});

describe('paths', () => {
  it('accumulates path length and samples endpoints', () => {
    const writer = path.writer();
    const targetPath = writer
      .moveTo(vec3.fromValues(0, 0, 0))
      .lineTo(vec3.fromValues(10, 0, 0))
      .lineTo(vec3.fromValues(10, 10, 0))
      .toPath();

    const out = vec3.create();
    expect(targetPath.getLength()).toBeCloseTo(20);
    expectVec3Close(targetPath.pointAtDistance(out, 0), vec3.fromValues(0, 0, 0));
    expectVec3Close(targetPath.pointAtDistance(out, targetPath.getLength()), vec3.fromValues(10, 10, 0));
    expectVec3Close(targetPath.pointAtU(out, 0), vec3.fromValues(0, 0, 0));
    expectVec3Close(targetPath.pointAtU(out, 1), vec3.fromValues(10, 10, 0));
  });

  it('supports instance-style path operations', () => {
    const p = path.create()
      .setPolyline([
        vec3.fromValues(0, 0, 0),
        vec3.fromValues(10, 0, 0),
        vec3.fromValues(10, 10, 0)
      ]);
    const out = vec3.create();
    expect(p.getLength()).toBeCloseTo(20);
    expectVec3Close(p.pointAtDistance(out, 0), vec3.fromValues(0, 0, 0));
    expectVec3Close(p.pointAtU(out, 1), vec3.fromValues(10, 10, 0));
    expect(p.getPoints(4)).toHaveLength(3);
    expect(p.getSpacedPoints(4)).toHaveLength(5);
    expect(p.buildFrames({ divisions: 1 }).points).toHaveLength(3);
  });

  it('supports an instance-bound path writer', () => {
    const p = path.create();
    p.writer()
      .moveTo(vec3.fromValues(0, 0, 0))
      .lineTo(vec3.fromValues(5, 0, 0))
      .lineTo(vec3.fromValues(5, 5, 0));

    expect(p.segments).toHaveLength(2);
    expect(p.getLength()).toBeCloseTo(10);
  });

  it('constructs polylines, smooth fallback, and bevel fallback', () => {
    const points = [vec3.fromValues(0, 0, 0), vec3.fromValues(1, 0, 0), vec3.fromValues(1, 1, 0)];
    const p = path.create();
    p.setPolyline(points, { close: true });
    expect(p.segments).toHaveLength(3);

    p.setSmoothCurve(points, { smooth: 0 });
    expect(p.segments.every(segment => segment.type === 'line')).toBe(true);

    p.setBeveledCurve(points, { bevelRadius: 0 });
    expect(p.segments.every(segment => segment.type === 'line')).toBe(true);
  });

  it('keeps path markDirty non-recursive by default and recursive when requested', () => {
    const p = createPolyline([vec3.fromValues(0, 0, 0), vec3.fromValues(1, 0, 0)]);
    expect(p.getLength()).toBeCloseTo(1);

    p.segments[0]!.p1[0] = 2;
    expect(p.markDirty()).toBe(p);
    expect(p.getLength()).toBeCloseTo(1);

    expect(p.markDirty(true)).toBe(p);
    expect(p.getLength()).toBeCloseTo(2);
  });

  it('matches t3d smooth curve control point construction', () => {
    const p = path.create();
    p.setSmoothCurve([
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(10, 0, 0),
      vec3.fromValues(20, 10, 0)
    ], { smooth: 0.3 });

    expect(p.segments).toHaveLength(2);
    expect(p.segments[0]!.type).toBe('cubic-bezier');
    if (p.segments[0]!.type !== 'cubic-bezier') return;
    expectVec3Close(p.segments[0]!.p0, vec3.fromValues(0, 0, 0));
    expectVec3Close(p.segments[0]!.p1, vec3.fromValues(0, 0, 0));
    expectVec3Close(p.segments[0]!.p2, vec3.fromValues(7.5147185, 0, 0), 1e-5);
    expectVec3Close(p.segments[0]!.p3, vec3.fromValues(10, 0, 0));

    expect(p.segments[1]!.type).toBe('cubic-bezier');
    if (p.segments[1]!.type !== 'cubic-bezier') return;
    expectVec3Close(p.segments[1]!.p0, vec3.fromValues(10, 0, 0));
    expectVec3Close(p.segments[1]!.p1, vec3.fromValues(13.514719, 0, 0), 1e-5);
    expectVec3Close(p.segments[1]!.p2, vec3.fromValues(20, 10, 0));
    expectVec3Close(p.segments[1]!.p3, vec3.fromValues(20, 10, 0));
  });

  it('matches t3d beveled curve construction', () => {
    const p = path.create();
    p.setBeveledCurve([
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(10, 0, 0),
      vec3.fromValues(10, 10, 0)
    ], { bevelRadius: 2 });

    expect(p.segments).toHaveLength(3);
    expect(p.segments[0]!.type).toBe('line');
    if (p.segments[0]!.type !== 'line') return;
    expectVec3Close(p.segments[0]!.p0, vec3.fromValues(0, 0, 0));
    expectVec3Close(p.segments[0]!.p1, vec3.fromValues(8, 0, 0));

    expect(p.segments[1]!.type).toBe('quadratic-bezier');
    if (p.segments[1]!.type !== 'quadratic-bezier') return;
    expectVec3Close(p.segments[1]!.p0, vec3.fromValues(8, 0, 0));
    expectVec3Close(p.segments[1]!.p1, vec3.fromValues(10, 0, 0));
    expectVec3Close(p.segments[1]!.p2, vec3.fromValues(10, 2, 0));

    expect(p.segments[2]!.type).toBe('line');
    if (p.segments[2]!.type !== 'line') return;
    expectVec3Close(p.segments[2]!.p0, vec3.fromValues(10, 2, 0));
    expectVec3Close(p.segments[2]!.p1, vec3.fromValues(10, 10, 0));
  });

  it('keeps path constructors unfiltered and exposes explicit point preprocessing', () => {
    const raw = [
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(10, 0, 0),
      vec3.fromValues(10, 0, 0),
      vec3.fromValues(10, 10, 0),
      vec3.fromValues(0, 0, 0)
    ];
    const polyline = createPolyline([
      raw[0]!,
      raw[1]!,
      raw[2]!,
      raw[3]!,
      raw[4]!
    ]);
    expect(polyline.segments).toHaveLength(4);
    expect(polyline.getLength()).toBeCloseTo(20);

    const preprocessed = path.preprocessPoints(raw, { close: true });
    expect(preprocessed).toHaveLength(3);
    expectVec3Close(preprocessed[0]!, vec3.fromValues(0, 0, 0));
    expectVec3Close(preprocessed[1]!, vec3.fromValues(10, 0, 0));
    expectVec3Close(preprocessed[2]!, vec3.fromValues(10, 10, 0));

    const closed = createPolyline(preprocessed, { close: true });
    expect(closed.segments).toHaveLength(3);
  });

  it('matches t3d zero-length smooth and beveled curve construction behavior', () => {
    const duplicatePoints = [
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(10, 0, 0)
    ];

    const oursSmooth = path.create();
    oursSmooth.setSmoothCurve(duplicatePoints, { smooth: 0.3 });
    const t3dSmooth = new T3DCurvePath3();
    t3dSmooth.setSmoothCurves(duplicatePoints.map(point => new T3DVector3(point[0]!, point[1]!, point[2]!)), { smooth: 0.3 });
    expect(oursSmooth.segments).toHaveLength(t3dSmooth.curves.length);
    expect(oursSmooth.segments[0]!.type).toBe('cubic-bezier');
    expect(oursSmooth.segments[1]!.type).toBe('cubic-bezier');
    if (oursSmooth.segments[1]!.type !== 'cubic-bezier') return;
    expect(Number.isNaN(oursSmooth.segments[1]!.p1[0]!)).toBe(true);
    expect(Number.isNaN(t3dSmooth.curves[1]!.v1!.x)).toBe(true);

    const oursBeveled = path.create();
    oursBeveled.setBeveledCurve(duplicatePoints, { bevelRadius: 2 });
    const t3dBeveled = new T3DCurvePath3();
    t3dBeveled.setBeveledCurves(duplicatePoints.map(point => new T3DVector3(point[0]!, point[1]!, point[2]!)), { bevelRadius: 2 });
    expect(oursBeveled.segments).toHaveLength(t3dBeveled.curves.length);
    expect(oursBeveled.segments.map(segment => segment.type)).toEqual(['line', 'quadratic-bezier', 'line']);
  });

  it('matches t3d npm smooth and beveled curve controls at runtime', () => {
    const points = [
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(5, 2, 1),
      vec3.fromValues(12, -1, 4),
      vec3.fromValues(18, 3, -2)
    ];
    const t3dPoints = points.map(toT3DVector3);

    const smooth = path.create().setSmoothCurve(points, { smooth: 0.45 });
    const t3dSmooth = new T3DCurvePath3();
    t3dSmooth.setSmoothCurves(t3dPoints, { smooth: 0.45 });
    expectCurvePathControlsClose(smooth, t3dSmooth, 1e-5);

    const beveled = path.create().setBeveledCurve(points, { bevelRadius: 1.75, close: true });
    const t3dBeveled = new T3DCurvePath3();
    t3dBeveled.setBeveledCurves(t3dPoints, { bevelRadius: 1.75, close: true });
    expectCurvePathControlsClose(beveled, t3dBeveled, 1e-5);
  });

  it('gets points and spaced points', () => {
    const p = path.create();
    p.addSegment(segment.createLine(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 0, 0)));
    p.addSegment(segment.createCubicBezier(
      vec3.fromValues(1, 0, 0),
      vec3.fromValues(2, 0, 0),
      vec3.fromValues(3, 0, 0),
      vec3.fromValues(4, 0, 0)
    ));
    expect(p.getPoints(4)).toHaveLength(6);
    const spaced = p.getSpacedPoints(4);
    expect(spaced).toHaveLength(5);
    expectVec3Close(spaced[0]!, vec3.fromValues(0, 0, 0));
    expectVec3Close(spaced[4]!, vec3.fromValues(4, 0, 0));
  });

  it('clamps path getPoints divisions to avoid NaN samples', () => {
    const p = path.create();
    p.addSegment(segment.createCubicBezier(
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(1, 0, 0),
      vec3.fromValues(2, 0, 0),
      vec3.fromValues(3, 0, 0)
    ));
    const points = p.getPoints(0);
    expect(points).toHaveLength(2);
    for (const point of points) {
      expect(Number.isNaN(point[0]!)).toBe(false);
      expect(Number.isNaN(point[1]!)).toBe(false);
      expect(Number.isNaN(point[2]!)).toBe(false);
    }
  });

  it('builds orthonormal 3D frames', () => {
    const p = path.create();
    p.setSmoothCurve([
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(5, 2, 0),
      vec3.fromValues(10, 0, 2),
      vec3.fromValues(15, 4, 0)
    ], { smooth: 0.3 });

    const frames = p.buildFrames({ divisions: 4 });
    expect(frames.points.length).toBeGreaterThan(0);

    for (let i = 0; i < frames.points.length; i++) {
      const t = frames.tangents[i]!;
      const n = frames.normals[i]!;
      const b = frames.binormals[i]!;
      expect(vec3.len(t)).toBeCloseTo(1, 4);
      expect(vec3.len(n)).toBeCloseTo(1, 4);
      expect(vec3.len(b)).toBeCloseTo(1, 4);
      expect(vec3.dot(t, n)).toBeCloseTo(0, 4);
      expect(vec3.dot(t, b)).toBeCloseTo(0, 4);
      expect(vec3.dot(n, b)).toBeCloseTo(0, 4);
    }
  });

  it('matches a t3d buildFrames polyline fixture', () => {
    const p = createPolyline([
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(10, 0, 0),
      vec3.fromValues(10, 10, 0),
      vec3.fromValues(0, 10, 5)
    ]);
    const frames = p.buildFrames({
      divisions: 3,
      initialNormal: vec3.fromValues(0, 0, 1),
      transport: true,
      fixLine: true,
      close: false
    });

    const expectedTangents = [
      vec3.fromValues(1, 0, 0),
      vec3.fromValues(0.7071067811865475, 0.7071067811865475, 0),
      vec3.fromValues(-0.6324555320336759, 0.7071067811865476, 0.31622776601683794),
      vec3.fromValues(-0.8944271909999159, 0, 0.4472135954999579)
    ];
    const expectedNormals = [
      vec3.fromValues(0, 0, 1),
      vec3.fromValues(0, 0, 1),
      vec3.fromValues(-0.02242315976828138, -0.4247904357316765, 0.9050139709512217),
      vec3.fromValues(0.3575209564268324, -0.6007443953781136, 0.7150419128536649)
    ];
    const expectedBinormals = [
      vec3.fromValues(0, -1, 0),
      vec3.fromValues(0.7071067811865476, -0.7071067811865476, 0),
      vec3.fromValues(0.7742720464449211, 0.5652902667753023, 0.28451662936127553),
      vec3.fromValues(0.26866106103349446, 0.7994411619511375, 0.5373221220669889)
    ];

    expect(frames.points).toHaveLength(4);
    expect(frames.tangentTypes).toEqual([0, 0, 0, 0]);
    expect(frames.sharps).toEqual([false, true, true, false]);
    expect(frames.lengths).toEqual([0, 10, 20, 31.18033988749895]);
    expect(frames.widthScales).toEqual([1, 1.414213562373095, 1.414213562373095, 1]);

    for (let i = 0; i < 4; i++) {
      expectVec3Close(frames.tangents[i]!, expectedTangents[i]!, 1e-5);
      expectVec3Close(frames.normals[i]!, expectedNormals[i]!, 1e-5);
      expectVec3Close(frames.binormals[i]!, expectedBinormals[i]!, 1e-5);
    }
  });

  it('matches a t3d buildFrames closed non-transport fixture', () => {
    const p = createPolyline([
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(10, 0, 0),
      vec3.fromValues(10, 10, 0),
      vec3.fromValues(0, 10, 5)
    ], { close: true });
    const frames = p.buildFrames({
      divisions: 3,
      initialNormal: vec3.fromValues(0, 0, 1),
      transport: false,
      fixLine: true,
      close: true
    });

    const expectedTangents = [
      vec3.fromValues(1, 0, 0),
      vec3.fromValues(0.7071067811865475, 0.7071067811865475, 0),
      vec3.fromValues(-0.6324555320336759, 0.7071067811865476, 0.31622776601683794),
      vec3.fromValues(-0.7071067811865475, -0.7071067811865475, 0),
      vec3.fromValues(1, 0, 0)
    ];
    const expectedNormals = [
      vec3.fromValues(0, 0, 1),
      vec3.fromValues(0, 0, 1),
      vec3.fromValues(0.210818510677892, -0.23570226039551587, 0.948683298050514),
      vec3.fromValues(0, 0, 1),
      vec3.fromValues(0, 0, 1)
    ];
    const expectedBinormals = [
      vec3.fromValues(0, -1, 0),
      vec3.fromValues(0.7071067811865476, -0.7071067811865476, 0),
      vec3.fromValues(0.7453559924999298, 0.6666666666666666, 0),
      vec3.fromValues(-0.7071067811865476, 0.7071067811865476, 0),
      vec3.fromValues(0, -1, 0)
    ];

    expect(frames.points).toHaveLength(5);
    expect(frames.tangentTypes).toEqual([0, 0, 0, 0, 0]);
    expect(frames.sharps).toEqual([false, true, true, true, false]);
    expect(frames.widthScales).toEqual([1, 1.414213562373095, 1.414213562373095, 1.415, 1]);
    for (let i = 0; i < 5; i++) {
      expect(frames.lengths[i]).toBeCloseTo([0, 10, 20, 31.18033988749895, 42.3606797749979][i]!);
      expectVec3Close(frames.tangents[i]!, expectedTangents[i]!, 1e-5);
      expectVec3Close(frames.normals[i]!, expectedNormals[i]!, 1e-5);
      expectVec3Close(frames.binormals[i]!, expectedBinormals[i]!, 1e-5);
    }
  });

  it('matches t3d npm buildFrames at runtime', () => {
    const points = [
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(10, 0, 0),
      vec3.fromValues(10, 10, 0),
      vec3.fromValues(0, 10, 5)
    ];
    const oursPath = createPolyline(points, { close: true });
    const ours = oursPath.buildFrames({
      divisions: 3,
      initialNormal: vec3.fromValues(0, 0, 1),
      transport: false,
      fixLine: true,
      close: true
    });

    const t3dPath = new T3DCurvePath3();
    t3dPath.setPolylines(points.map(point => new T3DVector3(point[0]!, point[1]!, point[2]!)), { close: true });
    const t3d = t3dPath.computeFrames({
      divisions: 3,
      up: new T3DVector3(0, 0, 1),
      frenet: false,
      fixLine: true,
      close: true
    });

    expect(ours.points).toHaveLength(t3d.points.length);
    expect(ours.tangentTypes).toEqual(t3d.tangentTypes);
    expect(ours.sharps).toEqual(t3d.sharps);
    for (let i = 0; i < t3d.points.length; i++) {
      expect(ours.lengths[i]).toBeCloseTo(t3d.lengths[i]!);
      expect(ours.widthScales[i]).toBeCloseTo(t3d.widthScales[i]!);
      expectVec3Close(ours.points[i]!, vec3FromT3D(t3d.points[i]!), 1e-5);
      expectVec3Close(ours.tangents[i]!, vec3FromT3D(t3d.tangents[i]!), 1e-5);
      expectVec3Close(ours.normals[i]!, vec3FromT3D(t3d.normals[i]!), 1e-5);
      expectVec3Close(ours.binormals[i]!, vec3FromT3D(t3d.binormals[i]!), 1e-5);
    }
  });

  it('matches t3d npm CurvePath3 getPoint and getPoints at runtime', () => {
    const points = [
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(3, 6, 1),
      vec3.fromValues(10, -2, 4),
      vec3.fromValues(14, 2, -1)
    ];
    const ours = path.create().setSmoothCurve(points, { smooth: 0.35 });
    const t3d = new T3DCurvePath3();
    t3d.setSmoothCurves(points.map(toT3DVector3), { smooth: 0.35 });

    expect(ours.getLength()).toBeCloseTo(t3d.getLength());
    expectNumberArrayClose(ours.getLengths(), t3d.getLengths(), 1e-5);
    expectT3DPointsClose(ours.getPoints(5), t3d.getPoints(5), 1e-5);
    for (const u of [0, 0.125, 0.5, 0.875, 1]) {
      expectVec3Close(ours.pointAtU(vec3.create(), u), vec3FromT3D(t3d.getPoint(u)), 1e-5);
    }
  });

  it('matches t3d npm buildFrames for transport and fixLine option variants', () => {
    const points = [
      vec3.fromValues(0, 0, 0),
      vec3.fromValues(8, 0, 0),
      vec3.fromValues(10, 3, 2),
      vec3.fromValues(16, 4, -1)
    ];
    const t3dPoints = points.map(toT3DVector3);

    const transportPath = path.create().setSmoothCurve(points, { smooth: 0.4 });
    const t3dTransportPath = new T3DCurvePath3();
    t3dTransportPath.setSmoothCurves(t3dPoints, { smooth: 0.4 });
    expectFramesClose(
      transportPath.buildFrames({ divisions: 4, initialNormal: vec3.fromValues(0, 0, 1), transport: true, fixLine: true }),
      t3dTransportPath.computeFrames({ divisions: 4, up: new T3DVector3(0, 0, 1), frenet: true, fixLine: true }),
      1e-5
    );

    const mixedPath = path.writer()
      .moveTo(points[0]!)
      .lineTo(points[1]!)
      .cubicTo(vec3.fromValues(9, 4, 0), vec3.fromValues(13, 5, 3), points[3]!)
      .toPath();
    const t3dMixedPath = new T3DCurvePath3();
    t3dMixedPath.setPolylines([toT3DVector3(points[0]!), toT3DVector3(points[1]!)]);
    t3dMixedPath.curves.push(new T3DCubicBezierCurve3(
      toT3DVector3(points[1]!),
      new T3DVector3(9, 4, 0),
      new T3DVector3(13, 5, 3),
      toT3DVector3(points[3]!)
    ));
    expectFramesClose(
      mixedPath.buildFrames({ divisions: 3, initialNormal: vec3.fromValues(0, 1, 0), transport: false, fixLine: false }),
      t3dMixedPath.computeFrames({ divisions: 3, up: new T3DVector3(0, 1, 0), frenet: false, fixLine: false }),
      1e-5
    );
  });

  it('handles empty paths without producing samples', () => {
    const p = path.create();
    const out = vec3.fromValues(9, 9, 9);
    expect(p.getLength()).toBe(0);
    expect(p.buildFrames().points).toHaveLength(0);
    expectVec3Close(p.pointAtU(out, 0.5), vec3.fromValues(9, 9, 9));
  });
});

describe('geometry builders', () => {
  it('builds empty tube and ribbon geometry for empty frames', () => {
    const frames = path.create().buildFrames();
    expect(geometry.createTube(frames)).toEqual({ positions: [], normals: [], uvs: [], uvs2: [], indices: [] });
    expect(geometry.createRibbon(frames)).toEqual({ positions: [], normals: [], uvs: [], uvs2: [], indices: [] });
  });

  it('builds indexed tube side geometry from straight frames', () => {
    const frames = createStraightFrames();
    const tubeGeom = geometry.createTube(frames, { radius: 1, radialSegments: 4 });
    const vertexCount = frames.points.length * (4 + 1);

    expect(tubeGeom.positions).toHaveLength(vertexCount * 3);
    expect(tubeGeom.normals).toHaveLength(vertexCount * 3);
    expect(tubeGeom.uvs).toHaveLength(vertexCount * 2);
    expect(tubeGeom.uvs2).toHaveLength(vertexCount * 2);
    expect(tubeGeom.indices).toHaveLength((frames.points.length - 1) * 4 * 6);
    expectVec3Close(vec3.fromValues(tubeGeom.positions[0]!, tubeGeom.positions[1]!, tubeGeom.positions[2]!), vec3.fromValues(0, 1, 0));
    expectVec3Close(vec3.fromValues(tubeGeom.normals[0]!, tubeGeom.normals[1]!, tubeGeom.normals[2]!), vec3.fromValues(0, 1, 0));
  });

  it('adds tube caps with duplicated cap vertices', () => {
    const frames = createStraightFrames();
    const tubeGeom = geometry.createTube(frames, {
      radius: 1,
      radialSegments: 4,
      generateStartCap: true,
      generateEndCap: true
    });
    const sideVertexCount = frames.points.length * (4 + 1);
    const capVertexCount = 4 * 2;

    expect(tubeGeom.positions).toHaveLength((sideVertexCount + capVertexCount) * 3);
    expect(tubeGeom.indices).toHaveLength((frames.points.length - 1) * 4 * 6 + 2 * (4 - 2) * 3);
  });

  it('builds indexed ribbon geometry from straight frames', () => {
    const frames = createStraightFrames();
    const ribbonGeom = geometry.createRibbon(frames, { width: 2, arrow: false });
    const vertexCount = frames.points.length * 2;

    expect(ribbonGeom.positions).toHaveLength(vertexCount * 3);
    expect(ribbonGeom.normals).toHaveLength(vertexCount * 3);
    expect(ribbonGeom.uvs).toHaveLength(vertexCount * 2);
    expect(ribbonGeom.uvs2).toHaveLength(vertexCount * 2);
    expect(ribbonGeom.indices).toHaveLength((frames.points.length - 1) * 6);
    expectVec3Close(vec3.fromValues(ribbonGeom.positions[0]!, ribbonGeom.positions[1]!, ribbonGeom.positions[2]!), vec3.fromValues(0, 0, -1));
    expectVec3Close(vec3.fromValues(ribbonGeom.positions[3]!, ribbonGeom.positions[4]!, ribbonGeom.positions[5]!), vec3.fromValues(0, 0, 1));
  });

  it('supports one-sided ribbons and arrow heads', () => {
    const frames = createStraightFrames();
    const left = geometry.createRibbon(frames, { width: 2, side: 'left', arrow: false });
    const right = geometry.createRibbon(frames, { width: 2, side: 'right', arrow: false });
    const arrow = geometry.createRibbon(frames, { width: 2, arrow: true });

    expectVec3Close(vec3.fromValues(left.positions[3]!, left.positions[4]!, left.positions[5]!), vec3.fromValues(0, 0, 0));
    expectVec3Close(vec3.fromValues(right.positions[0]!, right.positions[1]!, right.positions[2]!), vec3.fromValues(0, 0, 0));
    expect(arrow.positions).toHaveLength((frames.points.length * 2 + 3) * 3);
    expect(arrow.indices.slice(-3)).toEqual([frames.points.length * 2 + 2, frames.points.length * 2, frames.points.length * 2 + 1]);
  });
});
