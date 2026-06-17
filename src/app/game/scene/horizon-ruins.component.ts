import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgtArgs } from 'angular-three';
import { toonGradient } from './toon';

interface Tower { pos: [number, number, number]; tiers: { y: number; r: number; h: number }[]; }

/**
 * HorizonRuinsComponent — distant temple SHIKHARA towers ringing the world,
 * far out past the playable bounds. Built as stacked shrinking cones, they read
 * as a sacred skyline that fades into the dusk horizon fog — giving the flat
 * world a sense of a much larger ruined city beyond. Purely backdrop.
 */
@Component({
  selector: 'app-horizon-ruins',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @for (t of towers; track $index) {
      <ngt-group [position]="t.pos">
        @for (tier of t.tiers; track $index) {
          <ngt-mesh [position]="[0, tier.y, 0]">
            <ngt-cone-geometry *args="[tier.r, tier.h, 6]" />
            <ngt-mesh-toon-material color="#5a4a62" [gradientMap]="toon" />
          </ngt-mesh>
        }
      </ngt-group>
    }
  `,
})
export class HorizonRuinsComponent {
  readonly toon = toonGradient;
  readonly towers: Tower[] = [];

  constructor() {
    // A ring of towers well beyond the play area, varied heights.
    const ring = 1500;
    const count = 9;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + 0.3;
      const rad = ring + ((i * 137) % 320);
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad * 0.85;
      const base = 120 + ((i * 53) % 140);
      const tiers = [];
      const levels = 3 + (i % 3);
      let y = 0, r = 60 + (i % 4) * 12;
      for (let l = 0; l < levels; l++) {
        const h = base / levels * 1.4;
        tiers.push({ y: y + h / 2, r, h });
        y += h * 0.7;
        r *= 0.66;
      }
      this.towers.push({ pos: [x, 0, z], tiers });
    }
  }
}
