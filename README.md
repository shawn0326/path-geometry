# path-math

[Chinese README](./README.zh-CN.md)

`path-math` is a small TypeScript math library for 2D/3D paths and curves. It is based on `gl-matrix` and does not depend on t3d, three.js, DOM, Canvas, WebGL, or WebGPU.

The first implementation follows the curve/path behavior from `t3d.js/examples/jsm/math/curves`, while exposing function-style APIs with `out` parameters where high-frequency calls matter.

## Status

`path-math` is currently a `0.x` MVP. The core behavior is covered by tests, including selected runtime comparisons with `t3d`, but public APIs may still change before a stable `1.0.0` release.

## Install

```sh
npm install path-math gl-matrix
```

## Documentation

This README is the human overview and quick-start guide. Detailed API reference docs can be generated from JSDoc/TSDoc comments with TypeDoc:

```sh
npm run docs
```

Generated HTML is written to `docs/api/` and is ignored by git by default, so CI can publish it later without committing generated files.

The GitHub Actions workflow deploys `docs/api/` to GitHub Pages automatically after every successful push to `master`.

## Basic Usage

Create a path with `PathWriter2` or `PathWriter3` when your source data is command-like: move, line, quadratic Bezier, cubic Bezier, close.

```ts
import { vec3 } from 'gl-matrix';
import { PathWriter3, path3 } from 'path-math';

const writer = new PathWriter3();

const path = writer
  .moveTo(vec3.fromValues(0, 0, 0))
  .lineTo(vec3.fromValues(10, 0, 0))
  .cubicTo(
    vec3.fromValues(15, 5, 0),
    vec3.fromValues(20, 5, 0),
    vec3.fromValues(30, 0, 0)
  )
  .toPath();

const point = vec3.create();
const tangent = vec3.create();

path3.pointAtDistance(point, path, 10);
path3.tangentAtDistance(tangent, path, 10);
```

## From Points

Create a path from an ordered point array when your source data is already a polyline or route. `path2` and `path3` provide the same construction styles:

- `setPolylines` connects points with straight line segments.
- `setSmoothCurves` builds smooth cubic curves through the points.
- `setBeveledCurves` keeps straight sections and rounds corners with quadratic bevels.

```ts
import { vec3 } from 'gl-matrix';
import { path3 } from 'path-math';

const rawPoints = [
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(10, 0, 0),
  vec3.fromValues(10, 10, 0),
  vec3.fromValues(20, 10, 0)
];

const path = path3.create();

path3.setPolylines(path, rawPoints);
path3.setSmoothCurves(path, rawPoints, { smooth: 0.25 });
path3.setBeveledCurves(path, rawPoints, { bevelRadius: 2 });
```

Path constructors do not implicitly filter points. This keeps runtime cost low and stays close to t3d behavior. If input data may contain consecutive duplicate points, call `preprocessPoints` explicitly before constructing a path.

```ts
const points = path3.preprocessPoints(rawPoints, { close: true });
path3.setPolylines(path, points, { close: true });
```

`preprocessPoints` removes consecutive duplicate points by default. If `close: true`, it also removes a duplicated final point equal to the first point, then lets the path close by adding the closing segment.

## Sampling

Paths expose sampling methods for common geometry workflows:

- `getLength(path)` returns the approximate total length.
- `pointAtU(out, path, u)` and `tangentAtU(out, path, u)` sample by normalized arc length.
- `pointAtDistance(out, path, distance)` and `tangentAtDistance(out, path, distance)` sample by absolute distance.
- `getPoints(path, divisions?)` samples each segment by its raw parameter.
- `getSpacedPoints(path, divisions?)` samples at approximately even arc-length spacing.

```ts
const length = path3.getLength(path);

const point = vec3.create();
const tangent = vec3.create();

path3.pointAtU(point, path, 0.5);
path3.tangentAtDistance(tangent, path, length * 0.5);

const drawingPoints = path3.getPoints(path, 24);
const evenlySpaced = path3.getSpacedPoints(path, 32);
```

## Frame Building

Use `path3.buildFrames(path, options?)` when you need stable orientation data along a 3D path, especially for mesh generation such as tubes, ribbons, roads, rails, strokes, or extruded path geometry.

`buildFrames` follows the t3d `CurvePath3.computeFrames` behavior. It samples each segment, keeps line segments at one division, and returns both the sampled path points and the frame data needed to place geometry along the path:

- `points`
- `tangents`
- `normals`
- `binormals`
- `bisectors`
- `lengths`
- `widthScales`
- `sharps`
- `tangentTypes`

```ts
const frames = path3.buildFrames(path, {
  divisions: 24,
  initialNormal: vec3.fromValues(0, 0, 1),
  close: false
});

for (let i = 0; i < frames.points.length; i++) {
  const center = frames.points[i];
  const normal = frames.normals[i];
  const binormal = frames.binormals[i];

  // Use center, normal, and binormal to place cross-section vertices.
}
```

Use `divisions` to control curve sampling density. Use `initialNormal` to lock the starting orientation when the generated mesh needs a predictable roll direction.

## Cache Updates

Lengths and arc-length tables are cached and refreshed automatically when the library mutates a path through its own APIs.

If you directly mutate an internal segment point, mark the cache dirty yourself:

```ts
path.segments[0].p1[0] = 20;

// Marks only path-level metrics dirty.
path3.markDirty(path);

// Marks path metrics and all segment metrics dirty.
path3.markDirty(path, true);
```

Use `markDirty(path, true)` after direct edits to `path.segments[i].p0`, `p1`, `p2`, or `p3`.

## Tests

The test suite includes fixed fixtures and runtime comparisons against the npm `t3d` package for selected curve and frame behavior.

```sh
npm run typecheck
npm run test
npm run build
```

## t3d Reference

Curve and path behavior is intentionally based on the curve utilities in [`t3d.js`](https://github.com/uinosoft/t3d.js), especially `examples/jsm/math/curves`. `t3d` is licensed under BSD-3-Clause. This project is not a t3d dependency and does not bundle t3d in the runtime package; `t3d` is used only as a development dependency for selected comparison tests.

## License

MIT
