# path-math

[Chinese README](./README.zh-CN.md)

`path-math` is a small TypeScript math library for 3D paths, curves, frames, and geometry generation. It is based on `gl-matrix` and does not depend on t3d, three.js, DOM, Canvas, WebGL, or WebGPU.

The first implementation follows the curve/path behavior from `t3d.js/examples/jsm/math/curves`, while exposing function-style APIs with `out` parameters where high-frequency calls matter.

## Status

`path-math` is currently a `0.x` MVP. The core behavior is covered by tests, including selected runtime comparisons with `t3d`, but public APIs may still change before a stable `1.0.0` release.

## Install

```sh
npm install path-math gl-matrix
```

## Documentation

This README is the human overview and quick-start guide. Detailed API reference docs can be generated from JSDoc/TSDoc comments with TypeDoc:

Online API documentation: https://shawn0326.github.io/path-math/

```sh
npm run docs
```

Generated HTML is written to `docs/api/` and is ignored by git by default, so CI can publish it later without committing generated files.

The GitHub Actions workflow deploys `docs/api/` to GitHub Pages automatically after every successful push to `master`.

## Basic Usage

Create a path with `PathWriter` when your source data is command-like: move, line, quadratic Bezier, cubic Bezier, close.

```ts
import { vec3 } from 'gl-matrix';
import { path } from 'path-math';

const writer = path.writer();

const route = writer
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

path.pointAtDistance(point, route, 10);
path.tangentAtDistance(tangent, route, 10);
```

## From Points

Create a path from an ordered `vec3` point array when your source data is already a polyline or route. `path` provides these construction styles:

- `setPolyline` connects points with straight line segments.
- `setSmoothCurve` builds smooth cubic curves through the points.
- `setBeveledCurve` keeps straight sections and rounds corners with quadratic bevels.

For planar data, pass `vec3` points with `z = 0` instead of using a separate 2D API.

```ts
import { vec3 } from 'gl-matrix';
import { path } from 'path-math';

const rawPoints = [
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(10, 0, 0),
  vec3.fromValues(10, 10, 0),
  vec3.fromValues(20, 10, 0)
];

const route = path.create();

path.setPolyline(route, rawPoints);
path.setSmoothCurve(route, rawPoints, { smooth: 0.25 });
path.setBeveledCurve(route, rawPoints, { bevelRadius: 2 });
```

Path constructors do not implicitly filter points. This keeps runtime cost low and stays close to t3d behavior. If input data may contain consecutive duplicate points, call `preprocessPoints` explicitly before constructing a path.

```ts
const points = path.preprocessPoints(rawPoints, { close: true });
path.setPolyline(route, points, { close: true });
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
const length = path.getLength(route);

const point = vec3.create();
const tangent = vec3.create();

path.pointAtU(point, route, 0.5);
path.tangentAtDistance(tangent, route, length * 0.5);

const drawingPoints = path.getPoints(route, 24);
const evenlySpaced = path.getSpacedPoints(route, 32);
```

## Frame Building

Use `path.buildFrames(route, options?)` when you need stable orientation data along a 3D path, especially for mesh generation such as tubes, ribbons, roads, rails, strokes, or extruded path geometry.

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
const frames = path.buildFrames(route, {
  divisions: 24,
  initialNormal: vec3.fromValues(0, 0, 1),
  transport: true,
  close: false
});

for (let i = 0; i < frames.points.length; i++) {
  const center = frames.points[i];
  const normal = frames.normals[i];
  const binormal = frames.binormals[i];

  // Use center, normal, and binormal to place cross-section vertices.
}
```

Use `divisions` to control curve sampling density. Use `initialNormal` to lock the starting orientation when the generated mesh needs a predictable roll direction. Use `transport` to enable or disable parallel-transport frame propagation.

## Geometry Building

Use `geometry.createTube(frames, options?)` and `geometry.createRibbon(frames, options?)` to turn 3D path frames into renderer-neutral indexed geometry buffers.

Both builders return plain arrays: `positions`, `normals`, `uvs`, `uvs2`, and `indices`. You can convert them to the buffer/attribute format required by t3d, three.js, WebGPU, or your own renderer.

```ts
import { vec3 } from 'gl-matrix';
import { path, geometry } from 'path-math';

const route = path.create();
path.setPolyline(route, [
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(10, 0, 0),
  vec3.fromValues(10, 10, 0)
]);

const frames = path.buildFrames(route, {
  divisions: 16,
  initialNormal: vec3.fromValues(0, 0, 1)
});

const tubeGeometry = geometry.createTube(frames, {
  radius: 0.2,
  radialSegments: 12,
  generateStartCap: true,
  generateEndCap: true
});

const ribbonGeometry = geometry.createRibbon(frames, {
  width: 1,
  side: 'both',
  arrow: false
});
```

## Cache Updates

Lengths and arc-length tables are cached and refreshed automatically when the library mutates a path through its own APIs.

If you directly mutate an internal segment point, mark the cache dirty yourself:

```ts
route.segments[0].p1[0] = 20;

// Marks only path-level metrics dirty.
path.markDirty(route);

// Marks path metrics and all segment metrics dirty.
path.markDirty(route, true);
```

`_metrics` and `_needsUpdate` are internal cache fields. Do not read or mutate them directly.

Use `path.markDirty(route, true)` after direct edits to `route.segments[i].p0`, `p1`, `p2`, or `p3`.

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
