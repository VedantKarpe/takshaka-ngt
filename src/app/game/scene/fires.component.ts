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
 * FiresComponent — the sacred fires at the centre of the yagna. Emissive hazard
 * volumes: a glowing sphere + a flickering PointLight whose radius pulses on the
 * fire's `ph` phase (the same phase the sim uses for its damage radius). Count
 * is fixed (5) by the level data.
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
        <ngt-mesh [position]="[0, f.r * 0.5, 0]">
          <ngt-sphere-geometry *args="[f.r, 16, 16]" />
          <ngt-mesh-toon-material
            #mat color="#ff7a2a" [emissive]="'#ff7700'" [emissiveIntensity]="2.2"
            [gradientMap]="toon" [toneMapped]="false" [transparent]="true" [opacity]="0.92" />
        </ngt-mesh>
        <ngt-point-light #light [position]="[0, f.r, 0]" [distance]="f.r * 9" [color]="'#ff7722'" [intensity]="3" />
      </ngt-group>
    }
  `,
})
export class FiresComponent {
  private readonly game = inject(GameStateService);
  protected get fires() { return this.game.sim.state.fires; }

  private readonly grps = viewChildren<ElementRef<THREE.Group>>('grp');
  private readonly mats = viewChildren<ElementRef<THREE.MeshToonMaterial>>('mat');
  private readonly lights = viewChildren<ElementRef<THREE.PointLight>>('light');

  cxv = cx; czv = cz;
  readonly toon = toonGradient;

  constructor() {
    injectBeforeRender(() => this.sync());
  }

  private sync(): void {
    const fires = this.game.sim.state.fires;
    const grps = this.grps();
    const mats = this.mats();
    const lights = this.lights();
    for (let i = 0; i < grps.length && i < fires.length; i++) {
      const f = fires[i];
      const flick = 1 + Math.sin(f.ph) * 0.18;
      const grp = grps[i].nativeElement;
      grp.scale.setScalar(flick);
      grp.rotation.y = f.ph * 0.3;
      const mat = mats[i]?.nativeElement;
      if (mat) mat.emissiveIntensity = 2.0 + Math.sin(f.ph * 1.7) * 0.6;
      const light = lights[i]?.nativeElement;
      if (light) light.intensity = 2.6 + Math.sin(f.ph * 2.1) * 1.0;
    }
  }
}
