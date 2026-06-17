import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgtArgs } from 'angular-three';
import { toonGradient } from './toon';

interface Seg { pos: [number, number, number]; size: [number, number, number]; color: string; }
interface Pillar { pos: [number, number, number]; h: number; }

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * PrakaraComponent — the rectangular enclosure (prakara) wall ringing the
 * temple complex, with a colonnaded cloister inside. Built from ruined
 * segments (varied heights, occasional crumbled-to-rubble gaps) with openings
 * left on each axis for the gateways/corridors. World coords; the compound runs
 * X∈[-390,390], Z∈[-280,320].
 */
@Component({
  selector: 'app-prakara',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @for (s of segs; track $index) {
      <ngt-mesh [position]="s.pos" [castShadow]="true">
        <ngt-box-geometry *args="s.size" />
        <ngt-mesh-toon-material [color]="s.color" [gradientMap]="toon" />
      </ngt-mesh>
    }
    @for (p of pillars; track $index) {
      <ngt-mesh [position]="p.pos" [castShadow]="true">
        <ngt-cylinder-geometry *args="[4.5, 5.5, p.h, 8]" />
        <ngt-mesh-toon-material color="#9a8466" [gradientMap]="toon" />
      </ngt-mesh>
    }
  `,
})
export class PrakaraComponent {
  readonly toon = toonGradient;
  readonly segs: Seg[] = [];
  readonly pillars: Pillar[] = [];

  private readonly minX = -390; private readonly maxX = 390;
  private readonly minZ = -280; private readonly maxZ = 320;

  constructor() {
    const rng = mulberry32(0x9a11);
    const cols = ['#8a7458', '#9a8466', '#7a6650'];
    const wallH = () => 46 + rng() * 14;
    // ~15% of segments are crumbled to rubble (ruins).
    const seg = (x: number, z: number, sx: number, sz: number) => {
      const ruined = rng() < 0.16;
      const h = ruined ? 10 + rng() * 8 : wallH();
      this.segs.push({ pos: [x, h / 2, z], size: [sx, h, sz], color: cols[(rng() * 3) | 0] });
    };

    const step = 66;
    // North (z=minZ) & South (z=maxZ): run along X, gap at |x|<82 (axis gate).
    for (let x = this.minX + step / 2; x < this.maxX; x += step) {
      if (Math.abs(x) < 82) continue;
      seg(x, this.minZ, step - 6, 16);
      seg(x, this.maxZ, step - 6, 16);
    }
    // West (x=minX) & East (x=maxX): run along Z, gap at |z|<70 (axis gate).
    for (let z = this.minZ + step / 2; z < this.maxZ; z += step) {
      if (Math.abs(z) < 70) continue;
      seg(this.minX, z, 16, step - 6);
      seg(this.maxX, z, 16, step - 6);
    }

    // Cloister pillars set in from the wall.
    const pstep = 120, inset = 34;
    for (let x = this.minX + 60; x < this.maxX; x += pstep) {
      this.pillars.push({ pos: [x, 18, this.minZ + inset], h: 36 });
      this.pillars.push({ pos: [x, 18, this.maxZ - inset], h: 36 });
    }
    for (let z = this.minZ + 90; z < this.maxZ - 40; z += pstep) {
      this.pillars.push({ pos: [this.minX + inset, 18, z], h: 36 });
      this.pillars.push({ pos: [this.maxX - inset, 18, z], h: 36 });
    }
  }
}
