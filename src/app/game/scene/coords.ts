/**
 * coords.ts — the single source of truth for mapping the 2D simulation space
 * into the 3D world.
 *
 * Simulation space: top-down (x → right, y → down), origin at top-left, arena
 * GW×GH with outer world extending negative/positive.
 *
 * World space (Three.js): right-handed, Y up. We lay the play-field on the XZ
 * plane and centre the arena at the origin, so sim (x, y) → world (X, Z):
 *
 *     X = x - GW/2          Z = y - GH/2          Y = height above ground
 *
 * This matches the centring the original 2D→3D build used (cx/cz).
 */
import { GW, GH } from '../../core/models';

export const cx = (x: number): number => x - GW / 2;
export const cz = (y: number): number => y - GH / 2;

/** Sim (x,y) → world [X, Y, Z] at the given height. */
export function g2w(x: number, y: number, height = 0): [number, number, number] {
  return [x - GW / 2, height, y - GH / 2];
}
