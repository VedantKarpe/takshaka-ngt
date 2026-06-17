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
 * AmritasComponent — golden nectar pickups (heal + meter). Hovering octahedra
 * that hide while collected and reappear on respawn. Count is fixed (5).
 */
@Component({
  selector: 'app-amritas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @for (a of amritas; track $index) {
      <ngt-mesh #m [position]="[cxv(a.x), 14, czv(a.y)]">
        <ngt-octahedron-geometry *args="[6, 0]" />
        <ngt-mesh-toon-material
          color="#ffcc44" [emissive]="'#ffdd44'" [emissiveIntensity]="1.4" [gradientMap]="toon" [toneMapped]="false" />
      </ngt-mesh>
    }
  `,
})
export class AmritasComponent {
  private readonly game = inject(GameStateService);
  protected get amritas() { return this.game.sim.state.amritas; }

  private readonly meshes = viewChildren<ElementRef<THREE.Mesh>>('m');
  cxv = cx; czv = cz;
  readonly toon = toonGradient;

  constructor() {
    injectBeforeRender(() => this.sync());
  }

  private sync(): void {
    const amritas = this.game.sim.state.amritas;
    const meshes = this.meshes();
    for (let i = 0; i < meshes.length && i < amritas.length; i++) {
      const a = amritas[i];
      const mesh = meshes[i].nativeElement;
      mesh.visible = !a.collected;
      if (a.collected) continue;
      mesh.rotation.y = a.ph;
      mesh.position.y = 14 + Math.sin(a.ph) * 3;
    }
  }
}
