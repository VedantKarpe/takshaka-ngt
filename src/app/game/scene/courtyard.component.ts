import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgtArgs } from 'angular-three';
import { g2w } from './coords';
import { toonGradient } from './toon';

interface Tile { pos: [number, number, number]; size: [number, number, number]; color: string; }

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * CourtyardComponent — a paved stone plaza over the central arena. A grid of
 * slightly-varied cel tiles with gaps; the inked outlines turn the gaps into
 * crisp paving seams (the cartoon-road-marking effect from the reference).
 * Decorative only.
 */
@Component({
  selector: 'app-courtyard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @for (t of tiles; track $index) {
      <ngt-mesh [position]="t.pos" [receiveShadow]="true">
        <ngt-box-geometry *args="t.size" />
        <ngt-mesh-toon-material [color]="t.color" [gradientMap]="toon" />
      </ngt-mesh>
    }
  `,
})
export class CourtyardComponent {
  readonly toon = toonGradient;
  readonly tiles: Tile[] = [];

  constructor() {
    const rng = mulberry32(0x7a1e5);
    const palette = ['#8a7a60', '#9a8a6e', '#7e6e54', '#90805f'];
    const step = 88, gap = 7;
    // Cover the central courtyard (inside the perimeter corridors).
    for (let gx = 130; gx <= 770; gx += step) {
      for (let gy = 130; gy <= 590; gy += step) {
        const jx = (rng() - 0.5) * 6;
        const jy = (rng() - 0.5) * 6;
        this.tiles.push({
          pos: g2w(gx + jx, gy + jy, 1),
          size: [step - gap, 3, step - gap],
          color: palette[(rng() * palette.length) | 0],
        });
      }
    }
  }
}
