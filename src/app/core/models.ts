/**
 * models.ts — pure simulation types, constants and level data.
 *
 * Ported verbatim (in spirit) from the original Angular 2D-canvas build's
 * `game.models.ts`. This module is 100% rendering-agnostic: it contains no
 * Three.js / DOM / draw calls of any kind. The 3D view reads this data; it
 * never writes back into it. Keep it that way.
 */

export interface Point { x: number; y: number; }

export interface BodySeg extends Point {}

export interface Fire {
  x: number; y: number; r: number; ph: number;
}

export interface Naga {
  x: number; y: number; rescued: boolean; ph: number;
}

export type GuardState = 'patrol' | 'alert' | 'search' | 'chase';

export interface Guard {
  /** Stable identity so the view can reconcile meshes against spawned guards. */
  id: number;
  x: number; y: number; angle: number;
  home: Point;
  pA: Point; pB: Point; toB: boolean;
  lastSeen: Point;
  trail: Point[];          // breadcrumb waypoints sampled while chasing
  state: GuardState;
  stun: number; det: number; alertT: number; searchT: number; tph: number;
  boss?: boolean;          // High Priest — requires 2 venom hits, double vision
  venomHits?: number;      // venom hits landed in current window
  venomHitTimer?: number;  // countdown before hit window resets
  // ── per-guard patrol bookkeeping (was kept in component-side arrays) ──
  routeStep: number;
  trailTimer: number;
}

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; life: number; r: number;
}

export type PlayerMode = 'normal' | 'venom' | 'nectar';

export interface Player {
  x: number; y: number;
  body: BodySeg[];
  angle: number;
  mode: PlayerMode;
  vm: number;
  invic: number;
  lives: number;
}

export interface Hazard {
  x: number; y: number; r: number; life: number; maxLife: number;
}

export interface Amrita {
  x: number; y: number; ph: number; collected: boolean; respawnIn: number;
}

/**
 * One-shot signals the simulation emits during a tick for the view/audio layer
 * to consume (so the sim stays free of side effects). Drained every frame.
 */
export type SimEventKind =
  | 'hit' | 'rescue' | 'amrita' | 'venom' | 'nectar'
  | 'stun' | 'bossSpawn' | 'win' | 'over';

export interface SimEvent {
  kind: SimEventKind;
  x: number; y: number;
  shake: number;   // requested camera shake amplitude
}

export interface GameState {
  frame: number;
  alertFlash: number;
  over: boolean;
  won: boolean;
  danger: number;
  /** Camera-shake amplitude — decays each tick; the view reads, never writes. */
  shake: number;
  player: Player;
  fires: Fire[];
  guards: Guard[];
  nagas: Naga[];
  hazards: Hazard[];
  amritas: Amrita[];
  parts: Particle[];
  /** Drained by the view each frame. */
  events: SimEvent[];
}

export type Screen = 'STORY' | 'PLAYING' | 'WIN' | 'OVER';

// ── Game constants (unchanged — same numbers, framerate-independent now) ──────
export const GW         = 900;
export const GH         = 680;
export const TRAIL      = 22;
export const PSPD       = 4.6;
export const VSPD       = 7.2;
export const NSPD       = 2.8;
export const GSPD       = 2.2;
export const GCSPD      = 4.2;
export const VIS_RANGE  = 180;
export const VIS_ANGLE  = Math.PI / 2.7;
export const RESCUE_R   = 30;
export const DETECT_MAX = 40;
export const STUN_DUR   = 210;
export const HIT_INVIC  = 100;

// World / map bounds (lifted from the component's chunk constants). The sim
// only needs the resulting world rectangle, not the chunked rendering grid.
export const CHUNK       = 400;
export const MAP_CX_MIN  = -2;
export const MAP_CX_MAX  =  4;
export const MAP_CY_MIN  = -2;
export const MAP_CY_MAX  =  3;
export const WORLD_MIN_X = MAP_CX_MIN * CHUNK;
export const WORLD_MAX_X = (MAP_CX_MAX + 1) * CHUNK;
export const WORLD_MIN_Y = MAP_CY_MIN * CHUNK;
export const WORLD_MAX_Y = (MAP_CY_MAX + 1) * CHUNK;

// Spawn-director tuning. Capped lower (was 14) to keep guard count — and thus
// torch-light count and AI/mesh load — bounded for performance.
export const MAX_GUARDS = 8;
export const GUARD_PROTECT_RADIUS = 220;
export const GUARD_PUSH_DISTANCE = 55;
export const GUARD_RESPONSE_RADIUS = 360;
export const GUARD_CHASE_SPEED_MULTIPLIER = 1.15;

// ── Pillars — static collision cylinders inside the arena ──────────────────
export interface Pillar { x: number; y: number; r: number; }
export const PILLARS: Pillar[] = [
  // Altar corner columns
  { x: 300, y: 250, r: 15 },
  { x: 600, y: 250, r: 15 },
  { x: 300, y: 430, r: 15 },
  { x: 600, y: 430, r: 15 },
  // West colonnade
  { x: 175, y: 200, r: 13 },
  { x: 175, y: 340, r: 13 },
  { x: 175, y: 480, r: 13 },
  // East colonnade
  { x: 725, y: 200, r: 13 },
  { x: 725, y: 340, r: 13 },
  { x: 725, y: 480, r: 13 },
  // North arch passage pillars
  { x: 380, y: 185, r: 12 },
  { x: 520, y: 185, r: 12 },
  // South arch passage pillars
  { x: 380, y: 495, r: 12 },
  { x: 520, y: 495, r: 12 },
  // Interior rubble piles
  { x: 240, y: 285, r: 9 },
  { x: 660, y: 285, r: 9 },
  { x: 240, y: 395, r: 9 },
  { x: 660, y: 395, r: 9 },
];

// ── Walkable path zones — player can only move inside these rects ────────────
interface WalkableRect { x1: number; y1: number; x2: number; y2: number; }
const WALKABLE_RECTS: WalkableRect[] = [
  // ── Inner arena ──────────────────────────────────────────────────────────
  { x1: 280, y1: 165, x2: 620, y2: 515 },   // Central courtyard (altar)
  { x1: 370, y1:  60, x2: 530, y2: 200 },   // North arch corridor
  { x1: 370, y1: 480, x2: 530, y2: 660 },   // South corridor
  { x1:  60, y1: 275, x2: 310, y2: 405 },   // West corridor
  { x1: 590, y1: 275, x2: 840, y2: 405 },   // East corridor
  { x1:  60, y1:  60, x2: 840, y2: 220 },   // North perimeter (NW + NE alcoves)
  { x1:  60, y1: 455, x2: 840, y2: 660 },   // South perimeter (SW + SE alcoves)
  { x1:  60, y1:  60, x2: 215, y2: 640 },   // West perimeter
  { x1: 685, y1:  60, x2: 840, y2: 640 },   // East perimeter
  // ── Outer world corridors ─────────────────────────────────────────────────
  { x1: 355, y1: -440, x2: 545, y2: 220 },  // North outer (overlaps N perimeter)
  { x1: 355, y1:  455, x2: 545, y2: 1040 }, // South outer (overlaps S perimeter)
  { x1: -460, y1: 275, x2: 215, y2: 405 },  // West outer  (overlaps W perimeter)
  { x1:  685, y1: 275, x2:1280, y2: 405 },  // East outer  (overlaps E perimeter)
  { x1: -600, y1: -570, x2: 545, y2: -360 },
  { x1: -600, y1: -570, x2: -320, y2: 405 },
  { x1:  685, y1:  275, x2: 1210, y2: 880 },
];

export function isWalkable(x: number, y: number): boolean {
  for (const r of WALKABLE_RECTS) {
    if (x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2) return true;
  }
  return false;
}

// ── Guard patrol route templates (naga indices each route loops between) ──────
export const GUARD_PATROL_ROUTES: number[][] = [
  [0, 4, 8, 6],
  [1, 7, 9, 4],
  [2, 5, 9, 7],
  [3, 6, 8, 5],
];

// ── Helpers ───────────────────────────────────────────────────────────────────
export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function spawnParticles(
  arr: Particle[], x: number, y: number, color: string, n: number
): void {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 3;
    arr.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 0.5,
      color, life: 22 + Math.random() * 22, r: 2 + Math.random() * 3,
    });
  }
}

let GUARD_ID = 0;
export function nextGuardId(): number { return GUARD_ID++; }

export function buildInitialState(): GameState {
  GUARD_ID = 0;
  const mk = (g: Omit<Guard, 'id' | 'routeStep' | 'trailTimer'>): Guard =>
    ({ ...g, id: nextGuardId(), routeStep: 0, trailTimer: 0 });

  return {
    frame: 0, alertFlash: 0, over: false, won: false, danger: 0, shake: 0,
    player: {
      x: 450, y: 640,
      body: Array.from({ length: TRAIL }, () => ({ x: 450, y: 640 })),
      angle: -Math.PI / 2, mode: 'normal', vm: 100, invic: 0, lives: 3,
    },
    fires: [
      { x: 390, y: 300, r: 28, ph: 0.0 },
      { x: 495, y: 292, r: 22, ph: 1.4 },
      { x: 450, y: 345, r: 32, ph: 0.7 },
      { x: 430, y: 262, r: 16, ph: 2.0 },
      { x: 510, y: 348, r: 20, ph: 1.1 },
    ],
    guards: [
      mk({
        x: 170, y: 130, angle: 0,
        home: { x: 150, y: 120 },
        pA: { x: 110, y: 95 }, pB: { x: 205, y: 155 }, toB: true,
        lastSeen: { x: 170, y: 130 }, trail: [],
        state: 'patrol', stun: 0, det: 0, alertT: 0, searchT: 0, tph: 0.0,
      }),
      mk({
        x: 730, y: 130, angle: Math.PI,
        home: { x: 750, y: 120 },
        pA: { x: 690, y: 95 }, pB: { x: 790, y: 160 }, toB: true,
        lastSeen: { x: 730, y: 130 }, trail: [],
        state: 'patrol', stun: 0, det: 0, alertT: 0, searchT: 0, tph: 1.3,
      }),
      mk({
        x: 730, y: 530, angle: Math.PI,
        home: { x: 750, y: 550 },
        pA: { x: 690, y: 510 }, pB: { x: 800, y: 590 }, toB: true,
        lastSeen: { x: 730, y: 530 }, trail: [],
        state: 'patrol', stun: 0, det: 0, alertT: 0, searchT: 0, tph: 2.5,
      }),
      mk({
        x: 170, y: 530, angle: 0,
        home: { x: 150, y: 550 },
        pA: { x: 110, y: 510 }, pB: { x: 205, y: 590 }, toB: true,
        lastSeen: { x: 170, y: 530 }, trail: [],
        state: 'patrol', stun: 0, det: 0, alertT: 0, searchT: 0, tph: 1.8,
      }),
      mk({
        x: 450, y: 110, angle: Math.PI / 2,
        home: { x: 450, y: 110 },
        pA: { x: 340, y: 110 }, pB: { x: 560, y: 110 }, toB: true,
        lastSeen: { x: 450, y: 110 }, trail: [],
        state: 'patrol', stun: 0, det: 0, alertT: 0, searchT: 0, tph: 0.7,
      }),
      mk({
        x: 450, y: 570, angle: -Math.PI / 2,
        home: { x: 450, y: 570 },
        pA: { x: 340, y: 570 }, pB: { x: 560, y: 570 }, toB: true,
        lastSeen: { x: 450, y: 570 }, trail: [],
        state: 'patrol', stun: 0, det: 0, alertT: 0, searchT: 0, tph: 2.1,
      }),
    ],
    nagas: [
      // Inside arena — corners
      { x: 110, y: 110, rescued: false, ph: 0.0 },
      { x: 790, y: 110, rescued: false, ph: 1.6 },
      { x: 790, y: 570, rescued: false, ph: 0.9 },
      { x: 110, y: 570, rescued: false, ph: 2.4 },
      // Near-outer ring — just beyond arena edges
      { x: 450, y: -280, rescued: false, ph: 0.5 },
      { x: 450,  y: 960, rescued: false, ph: 1.1 },
      { x: -280, y: 340, rescued: false, ph: 2.0 },
      { x: 1180, y: 340, rescued: false, ph: 3.0 },
      // Far outer — deep in the ruined world
      { x: -500, y: -480, rescued: false, ph: 1.8 },
      { x: 1100, y:  780, rescued: false, ph: 2.7 },
    ],
    hazards: [],
    amritas: [
      { x: 218, y: 340, ph: 0.0, collected: false, respawnIn: 0 },
      { x: 682, y: 340, ph: 1.3, collected: false, respawnIn: 0 },
      { x: 450, y: 600, ph: 0.6, collected: false, respawnIn: 0 },
      { x: 290, y: 195, ph: 2.1, collected: false, respawnIn: 0 },
      { x: 615, y: 490, ph: 3.0, collected: false, respawnIn: 0 },
    ],
    parts: [],
    events: [],
  };
}
