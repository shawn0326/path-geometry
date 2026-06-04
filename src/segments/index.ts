import { line } from './line';
import { quadraticBezier } from './quadratic-bezier';
import { cubicBezier } from './cubic-bezier';

export const segment = {
  createLine: line.create,
  createQuadraticBezier: quadraticBezier.create,
  createCubicBezier: cubicBezier.create
};

export type { };
