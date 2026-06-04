# path-math

[English README](./README.md)

`path-math` 是一个小型 TypeScript 数学库，用于 3D path、curve、frame 和 geometry 生成。它基于 `gl-matrix`，不依赖 t3d、three.js、DOM、Canvas、WebGL 或 WebGPU。

第一版实现参考了 `t3d.js/examples/jsm/math/curves` 的 curve/path 行为，同时在高频调用场景中提供函数式、`out` 参数优先的 API。

## 状态

`path-math` 当前是 `0.x` MVP。核心行为已有测试覆盖，也包含部分与 npm `t3d` 包的运行时数值对照测试；但在稳定的 `1.0.0` 之前，公开 API 仍可能调整。

## 安装

```sh
npm install path-math gl-matrix
```

## 文档

这个 README 作为人工维护的概览和快速上手文档。详细 API reference 可以通过 JSDoc/TSDoc 注释和 TypeDoc 生成：

在线 API 文档：https://shawn0326.github.io/path-math/

```sh
npm run docs
```

生成的 HTML 会输出到 `docs/api/`，并默认被 git 忽略。后续可以通过 CI 发布在线文档，而不需要提交生成产物。

GitHub Actions workflow 会在每次成功推送到 `master` 后，自动把 `docs/api/` 部署到 GitHub Pages。

## 基础用法：从点生成

当数据来源已经是一组有序 `vec3` 点，比如 polyline 或 route，可以从点数组生成 path。`path` 提供这些构建方式：

- `setPolyline` 用直线 segment 连接点。
- `setSmoothCurve` 生成穿过这些点的平滑 cubic curve。
- `setBeveledCurve` 保留直线段，并用 quadratic bevel 对拐角做圆角处理。

对于平面数据，使用 `z = 0` 的三维点输入，而不是单独的 2D API。输入向量既可以是 `gl-matrix` 的 `vec3`，也可以是普通 `[x, y, z]` 数组。

```ts
import { path } from 'path-math';

const rawPoints = [
  [0, 0, 0],
  [10, 0, 0],
  [10, 10, 0],
  [20, 10, 0]
];

const route = path.create();

path.setPolyline(route, rawPoints);
path.setSmoothCurve(route, rawPoints, { smooth: 0.25 });
path.setBeveledCurve(route, rawPoints, { bevelRadius: 2 });
```

path 构建方法不会隐式过滤点。这样可以降低运行时成本，并尽量保持接近 t3d 的行为。如果输入数据可能包含连续重复点，可以在构建 path 前显式调用 `preprocessPoints`。

```ts
const points = path.preprocessPoints(rawPoints, { close: true });
path.setPolyline(route, points, { close: true });
```

`preprocessPoints` 默认会移除连续重复点。如果设置了 `close: true`，它还会移除与第一个点相同的最后一个点，然后让 path 通过额外的闭合 segment 完成闭合。

## Path Writer

当数据来源更像绘制命令时，可以用 `path.writer()` 创建 path：move、line、quadratic Bezier、cubic Bezier、close。

```ts
import { vec3 } from 'gl-matrix';
import { path } from 'path-math';

const writer = path.writer();

const route = writer
  .moveTo([0, 0, 0])
  .lineTo([10, 0, 0])
  .cubicTo(
    [15, 5, 0],
    [20, 5, 0],
    [30, 0, 0]
  )
  .toPath();

const point = [0, 0, 0];
const tangent = [0, 0, 0];

path.pointAtDistance(point, route, 10);
path.tangentAtDistance(tangent, route, 10);
```

## 采样

path 提供了适合常见几何工作流的采样方法：

- `getLength(path)` 返回近似总长度。
- `pointAtU(out, path, u)` 和 `tangentAtU(out, path, u)` 按归一化弧长采样。
- `pointAtDistance(out, path, distance)` 和 `tangentAtDistance(out, path, distance)` 按绝对路径距离采样。
- `getPoints(path, divisions?)` 按每个 segment 的原始参数采样。
- `getSpacedPoints(path, divisions?)` 按近似均匀弧长间距采样。

```ts
const length = path.getLength(route);

const point = [0, 0, 0];
const tangent = [0, 0, 0];

path.pointAtU(point, route, 0.5);
path.tangentAtDistance(tangent, route, length * 0.5);

const drawingPoints = path.getPoints(route, 24);
const evenlySpaced = path.getSpacedPoints(route, 32);
```

## Frame 构建

当需要沿 3D path 获取稳定的方向数据时，可以使用 `path.buildFrames(route, options?)`。它尤其适合 tube、ribbon、road、rail、stroke 或 extruded path geometry 等网格生成场景。

`buildFrames` 参考 t3d `CurvePath3.computeFrames` 行为。它会对每个 segment 采样，line segment 保持一个 division，并返回用于沿 path 放置几何体的采样点和 frame 数据：

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
  initialNormal: [0, 0, 1],
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

使用 `divisions` 控制 curve 的采样密度。使用 `initialNormal` 可以锁定起始方向，让生成的 mesh 有可预测的 roll 方向。使用 `transport` 控制是否启用 parallel-transport frame 传播。

## 几何生成

可以使用 `geometry.createTube(frames, options?)` 和 `geometry.createRibbon(frames, options?)`，把 3D path frames 转成与渲染器无关的索引几何数据。

两个 builder 都返回普通数组：`positions`、`normals`、`uvs`、`uvs2` 和 `indices`。你可以按需要把它们转换成 t3d、three.js、WebGPU 或自定义 renderer 所需的 buffer/attribute 格式。

```ts
import { path, geometry } from 'path-math';

const route = path.create();
path.setPolyline(route, [
  [0, 0, 0],
  [10, 0, 0],
  [10, 10, 0]
]);

const frames = path.buildFrames(route, {
  divisions: 16,
  initialNormal: [0, 0, 1]
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

## 缓存更新

长度和弧长表会被缓存。通过库自身 API 修改 path 时，缓存会自动标脏并在查询时刷新。

如果你直接修改了内部 segment 点，需要自己标记缓存为 dirty：

```ts
route.segments[0].p1[0] = 20;

// Marks only path-level metrics dirty.
path.markDirty(route);

// Marks path metrics and all segment metrics dirty.
path.markDirty(route, true);
```

`_metrics` 和 `_needsUpdate` 是内部缓存字段，不要直接读取或修改。

直接编辑 `route.segments[i].p0`、`p1`、`p2` 或 `p3` 后，请使用 `path.markDirty(route, true)`。

## 测试

测试套件包含固定 fixture，以及部分与 npm `t3d` 包的运行时 curve/frame 行为对照测试。

```sh
npm run typecheck
npm run test
npm run build
```

## t3d 参考

curve 和 path 行为有意参考 [`t3d.js`](https://github.com/uinosoft/t3d.js) 中的 curve 工具，尤其是 `examples/jsm/math/curves`。`t3d` 使用 BSD-3-Clause license。本项目运行时不依赖 t3d，也不会在运行时包中打包 t3d；`t3d` 只作为开发依赖，用于部分对照测试。

## License

MIT
