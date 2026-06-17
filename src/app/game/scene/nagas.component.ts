import {
  ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, signal, viewChildren,
} from '@angular/core';
import { injectBeforeRender, NgtArgs } from 'angular-three';
import * as THREE from 'three';
import { GameStateService } from '../../core/game-state.service';
import { Naga } from '../../core/models';
import { cx, cz } from './coords';
import { toonGradient } from './toon';

/**
 * NagasComponent — the captured kin. Each is a glowing blue coil (torus) with
 * its own point light, pulsing on its `ph` phase. On rescue it stops glowing,
 * sinks and hides — the view simply mirrors `naga.rescued`.
 */
@Component({
  selector: 'app-nagas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @for (n of nagaList(); track $index) {
      <ngt-group #grp [position]="[cxv(n.x), 4, czv(n.y)]">
        <!-- Stacked coils, tapering upward -->
        <ngt-mesh [position]="[0, 3, 0]" [rotation]="[1.5707963, 0, 0]" [castShadow]="true">
          <ngt-torus-geometry *args="[13, 4.2, 10, 22]" />
          <ngt-mesh-toon-material
            #mat color="#2a5fae" [emissive]="'#4488ff'" [emissiveIntensity]="1.1" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[0, 9, 0]" [rotation]="[1.5707963, 0, 0]" [castShadow]="true">
          <ngt-torus-geometry *args="[9, 3.4, 10, 20]" />
          <ngt-mesh-toon-material color="#3168b8" [emissive]="'#4488ff'" [emissiveIntensity]="1.0" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[0, 14, 0]" [rotation]="[1.5707963, 0, 0]">
          <ngt-torus-geometry *args="[5.5, 2.8, 8, 16]" />
          <ngt-mesh-toon-material color="#3168b8" [emissive]="'#66aaff'" [emissiveIntensity]="1.0" [gradientMap]="toon" />
        </ngt-mesh>
        <!-- Raised head + cobra hood -->
        <ngt-mesh [position]="[0, 22, -1]" [scale]="[1.5, 0.42, 1.15]">
          <ngt-sphere-geometry *args="[7, 14, 12]" />
          <ngt-mesh-toon-material color="#2a5fae" [emissive]="'#4488ff'" [emissiveIntensity]="1.0" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[3, 22, 0]" [rotation]="[0, 0, 1.5707963]">
          <ngt-capsule-geometry *args="[4, 6, 6, 10]" />
          <ngt-mesh-toon-material color="#2a5fae" [emissive]="'#66aaff'" [emissiveIntensity]="1.2" [gradientMap]="toon" />
        </ngt-mesh>
        <!-- Eyes -->
        <ngt-mesh [position]="[7, 23, 2.4]">
          <ngt-sphere-geometry *args="[1.1, 6, 6]" />
          <ngt-mesh-toon-material color="#ffd23a" [emissive]="'#ffcc00'" [emissiveIntensity]="1.5" [toneMapped]="false" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[7, 23, -2.4]">
          <ngt-sphere-geometry *args="[1.1, 6, 6]" />
          <ngt-mesh-toon-material color="#ffd23a" [emissive]="'#ffcc00'" [emissiveIntensity]="1.5" [toneMapped]="false" [gradientMap]="toon" />
        </ngt-mesh>
      </ngt-group>
    }
  `,
})
export class NagasComponent {
  private readonly game = inject(GameStateService);
  protected readonly nagaList = signal<Naga[]>([]);

  private readonly grps = viewChildren<ElementRef<THREE.Group>>('grp');
  private readonly mats = viewChildren<ElementRef<THREE.MeshToonMaterial>>('mat');

  cxv = cx; czv = cz;
  readonly toon = toonGradient;

  constructor() {
    injectBeforeRender(() => this.sync());
  }

  private sync(): void {
    const nagas = this.game.sim.state.nagas;
    // reset() replaces the array reference; re-seed when identity/length changes.
    if (nagas.length !== this.nagaList().length || nagas[0] !== this.nagaList()[0]) {
      this.nagaList.set(nagas.slice());
    }

    const grps = this.grps();
    const mats = this.mats();
    for (let i = 0; i < grps.length && i < nagas.length; i++) {
      const n = nagas[i];
      const grp = grps[i].nativeElement;
      const pulse = 0.85 + Math.sin(n.ph) * 0.15;
      if (n.rescued) {
        grp.visible = false;
        continue;
      }
      grp.visible = true;
      // Idle animation: slow turn + a gentle bob and side-sway of the raised head.
      grp.rotation.y = n.ph * 0.5;
      grp.rotation.z = Math.sin(n.ph * 1.3) * 0.06;
      grp.position.y = 4 + Math.sin(n.ph * 1.6) * 2.5;
      const mat = mats[i]?.nativeElement;
      if (mat) mat.emissiveIntensity = pulse * 1.2;
    }
  }
}
