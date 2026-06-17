import {
  ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, viewChildren,
} from '@angular/core';
import { injectBeforeRender, NgtArgs } from 'angular-three';
import * as THREE from 'three';
import { GameStateService } from '../../core/game-state.service';
import { cx, cz } from './coords';
import { toonGradient } from './toon';

/**
 * FiresComponent — the sacred fires at the centre of the yagna.
 *
 * Each fire is a stylised low-poly flame rather than a single blob: a flattened
 * bed of glowing coals, then three faceted cones (deep-orange outer envelope →
 * amber mid → white-hot core). The cones spin at different rates and flicker
 * their height on the fire's `ph` phase (the same phase the sim uses for its
 * damage radius), so the facets catch the cel bands and read as licking flame.
 * A flickering PointLight pulses on the same phase. Count is fixed (5) by the
 * level data; all flame materials are transparent so the outline pass skips them
 * and the post-FX bloom makes them glow.
 */
@Component({
  selector: 'app-fires',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @for (f of fires; track $index) {
      <ngt-group #grp [position]="[cxv(f.x), 0, czv(f.y)]">
        <!-- glowing coals / embers at the base -->
        <ngt-mesh [position]="[0, f.r * 0.12, 0]" [scale]="[1, 0.45, 1]">
          <ngt-icosahedron-geometry *args="[f.r * 0.8, 0]" />
          <ngt-mesh-toon-material
            color="#ff5a1e" [emissive]="'#ff3a00'" [emissiveIntensity]="1.6"
            [gradientMap]="toon" [toneMapped]="false" [transparent]="true" [opacity]="0.95" />
        </ngt-mesh>
        <!-- outer flame envelope -->
        <ngt-mesh [position]="[0, f.r * 1.2, 0]">
          <ngt-cone-geometry *args="[f.r * 0.95, f.r * 2.4, 7, 1]" />
          <ngt-mesh-toon-material
            color="#ff6a00" [emissive]="'#ff5200'" [emissiveIntensity]="2.0"
            [gradientMap]="toon" [toneMapped]="false" [transparent]="true" [opacity]="0.78" />
        </ngt-mesh>
        <!-- amber mid flame -->
        <ngt-mesh [position]="[0, f.r * 0.98, 0]">
          <ngt-cone-geometry *args="[f.r * 0.62, f.r * 1.95, 6, 1]" />
          <ngt-mesh-toon-material
            color="#ffae1a" [emissive]="'#ff9500'" [emissiveIntensity]="2.6"
            [gradientMap]="toon" [toneMapped]="false" [transparent]="true" [opacity]="0.88" />
        </ngt-mesh>
        <!-- white-hot core -->
        <ngt-mesh [position]="[0, f.r * 0.74, 0]">
          <ngt-cone-geometry *args="[f.r * 0.36, f.r * 1.5, 5, 1]" />
          <ngt-mesh-toon-material
            color="#ffe27a" [emissive]="'#ffd24a'" [emissiveIntensity]="3.2"
            [gradientMap]="toon" [toneMapped]="false" [transparent]="true" [opacity]="0.96" />
        </ngt-mesh>
        <ngt-point-light [position]="[0, f.r, 0]" [distance]="f.r * 9" [color]="'#ff7722'" [intensity]="3" />
      </ngt-group>
    }
  `,
})
export class FiresComponent {
  private readonly game = inject(GameStateService);
  protected get fires() { return this.game.sim.state.fires; }

  private readonly grps = viewChildren<ElementRef<THREE.Group>>('grp');

  cxv = cx; czv = cz;
  readonly toon = toonGradient;

  constructor() {
    injectBeforeRender(() => this.sync());
  }

  private sync(): void {
    const fires = this.game.sim.state.fires;
    const grps = this.grps();
    const t = performance.now() * 0.001;
    for (let i = 0; i < grps.length && i < fires.length; i++) {
      const ph = fires[i].ph;
      const grp = grps[i].nativeElement;
      // Whole-fire breathing.
      grp.scale.setScalar(1 + Math.sin(ph) * 0.06);
      // children: [0] coals, [1] outer, [2] mid, [3] core, [4] light.
      const ch = grp.children;
      for (let L = 1; L <= 3; L++) {
        const m = ch[L] as THREE.Mesh | undefined;
        if (!m) continue;
        // Each cone spins at its own rate so the facets shimmer out of sync…
        m.rotation.y = t * (0.6 + L * 0.55) + ph + L;
        // …and stretches/squashes vertically to lick upward.
        m.scale.y = 1 + Math.sin(t * (3 + L) + ph + L) * (0.22 - L * 0.04);
      }
      const core = ch[3] as THREE.Mesh | undefined;
      if (core) {
        (core.material as THREE.MeshToonMaterial).emissiveIntensity =
          2.8 + Math.sin(ph * 2.0 + t * 4) * 0.8;
      }
      const light = ch[4] as THREE.PointLight | undefined;
      if (light?.isPointLight) light.intensity = 2.6 + Math.sin(ph * 2.1 + t * 3) * 1.0;
    }
  }
}
