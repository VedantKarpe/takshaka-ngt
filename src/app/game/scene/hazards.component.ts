import {
  ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, signal, viewChildren,
} from '@angular/core';
import { injectBeforeRender, NgtArgs } from 'angular-three';
import * as THREE from 'three';
import { GameStateService } from '../../core/game-state.service';
import { Hazard } from '../../core/models';
import { cx, cz } from './coords';

/**
 * HazardsComponent — creeping fire eruptions spawned by the danger director.
 * Dynamic count, reconciled like the guards. A hazard "arms" partway through
 * its life (matching the sim's `life < maxLife*0.78` rule) — we surface that by
 * ramping emissive/opacity so the player can read when it becomes lethal.
 */
@Component({
  selector: 'app-hazards',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @for (h of hazardList(); track $index) {
      <ngt-group #grp>
        <ngt-mesh [rotation]="[1.5707963, 0, 0]">
          <ngt-circle-geometry *args="[1, 20]" />
          <ngt-mesh-basic-material
            #mat color="#ff6600" [transparent]="true" [opacity]="0.4" [side]="2" [depthWrite]="false" />
        </ngt-mesh>
        <ngt-point-light #light [color]="'#ff6600'" [distance]="100" [intensity]="0" />
      </ngt-group>
    }
  `,
})
export class HazardsComponent {
  private readonly game = inject(GameStateService);
  protected readonly hazardList = signal<Hazard[]>([]);

  private readonly grps = viewChildren<ElementRef<THREE.Group>>('grp');
  private readonly mats = viewChildren<ElementRef<THREE.MeshBasicMaterial>>('mat');
  private readonly lights = viewChildren<ElementRef<THREE.PointLight>>('light');

  constructor() {
    injectBeforeRender(() => this.sync());
  }

  private sync(): void {
    const hazards = this.game.sim.state.hazards;
    if (hazards.length !== this.hazardList().length) {
      this.hazardList.set(hazards.slice());
    }
    const grps = this.grps();
    const mats = this.mats();
    const lights = this.lights();
    for (let i = 0; i < grps.length && i < hazards.length; i++) {
      const h = hazards[i];
      const grp = grps[i].nativeElement;
      grp.position.set(cx(h.x), 1, cz(h.y));
      grp.scale.setScalar(h.r);
      const armed = h.life < h.maxLife * 0.78;
      const mat = mats[i]?.nativeElement;
      if (mat) mat.opacity = armed ? 0.55 : 0.2 + (1 - h.life / h.maxLife) * 0.3;
      const light = lights[i]?.nativeElement;
      if (light) light.intensity = armed ? 2.4 : 0.6;
    }
  }
}
