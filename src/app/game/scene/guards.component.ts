import {
  ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, signal, viewChildren,
} from '@angular/core';
import { injectBeforeRender, NgtArgs } from 'angular-three';
import * as THREE from 'three';
import { GameStateService } from '../../core/game-state.service';
import { Guard, VIS_ANGLE, VIS_RANGE } from '../../core/models';
import { cx, cz } from './coords';
import { toonGradient } from './toon';

/**
 * GuardsComponent — the priests. Count is DYNAMIC (the spawn director adds
 * guards mid-game, including the High Priest boss), so we reconcile a local
 * signal against `sim.state.guards.length` and let `@for` create/destroy the
 * meshes; per-frame transforms are written through `viewChildren` refs.
 *
 * Each guard carries a translucent CONE that visualises its detection
 * volume — the 3D analogue of the original 2D vision cone. The cone and torch
 * light tint by AI state: amber while patrolling, orange while searching, red
 * while chasing.
 */
@Component({
  selector: 'app-guards',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @for (g of guardList(); track g.id) {
      <ngt-group #grp>
        <!-- Robe (narrow shoulders → wide hem) -->
        <ngt-mesh [position]="[0, 14, 0]" [castShadow]="true">
          <ngt-cylinder-geometry *args="[2.5, 9, 30, 12]" />
          <ngt-mesh-toon-material #bodyMat color="#8a3b22" [gradientMap]="toon" />
        </ngt-mesh>
        <!-- Shoulders -->
        <ngt-mesh [position]="[0, 28, 0]" [castShadow]="true">
          <ngt-sphere-geometry *args="[6.5, 10, 10]" />
          <ngt-mesh-toon-material color="#9a4a26" [gradientMap]="toon" />
        </ngt-mesh>
        <!-- Head -->
        <ngt-mesh [position]="[0, 36, 0]" [castShadow]="true">
          <ngt-sphere-geometry *args="[4.5, 12, 12]" />
          <ngt-mesh-toon-material color="#e8c49a" [gradientMap]="toon" />
        </ngt-mesh>
        <!-- Topknot -->
        <ngt-mesh [position]="[0, 40.5, 0]">
          <ngt-sphere-geometry *args="[2.2, 8, 8]" />
          <ngt-mesh-toon-material color="#2a1a10" [gradientMap]="toon" />
        </ngt-mesh>
        <!-- Tilak (forehead, facing +X) -->
        <ngt-mesh [position]="[4, 37, 0]">
          <ngt-sphere-geometry *args="[1, 6, 6]" />
          <ngt-mesh-toon-material color="#ffcc33" [emissive]="'#ff8800'" [emissiveIntensity]="1.2" [toneMapped]="false" [gradientMap]="toon" />
        </ngt-mesh>
        <!-- Held torch: shaft + flame -->
        <ngt-mesh [position]="[11, 26, 5]" [rotation]="[0.25, 0, -0.35]">
          <ngt-cylinder-geometry *args="[0.9, 0.9, 30, 6]" />
          <ngt-mesh-toon-material color="#4a3018" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[14, 40, 5]">
          <ngt-icosahedron-geometry *args="[4.5, 0]" />
          <ngt-mesh-toon-material color="#ff8a3a" [emissive]="'#ff6a1a'" [emissiveIntensity]="2.4" [toneMapped]="false" [gradientMap]="toon" />
        </ngt-mesh>
        <!-- High-Priest crown -->
        @if (g.boss) {
          <ngt-mesh [position]="[0, 39, 0]" [rotation]="[1.5707963, 0, 0]">
            <ngt-torus-geometry *args="[5.5, 1.3, 8, 16]" />
            <ngt-mesh-toon-material color="#e8c24a" [emissive]="'#aa7a14'" [emissiveIntensity]="0.6" [gradientMap]="toon" />
          </ngt-mesh>
        }

        <!-- Vision fan: cone flattened to the ground (scale.x squashes the
             circular cross-section into a thin floor-projected wedge), apex at
             the priest, widening forward along +X. Reads as a detection
             footprint rather than a view-blocking volume. -->
        <ngt-mesh #cone [rotation]="[0, 0, 1.5707963]" [position]="[coneLen(g) / 2, 2.5, 0]" [scale]="[0.14, 1, 1]">
          <ngt-cone-geometry *args="[coneRadius(g), coneLen(g), 28, 1, true]" />
          <ngt-mesh-basic-material
            #coneMat color="#ffcc66" [transparent]="true" [opacity]="0.1"
            [side]="2" [depthWrite]="false" />
        </ngt-mesh>

        <!-- Torch light (at the flame) -->
        <ngt-point-light #torch [position]="[14, 40, 5]" [distance]="180" [color]="'#ff8833'" [intensity]="1.2" />
      </ngt-group>
    }
  `,
})
export class GuardsComponent {
  private readonly game = inject(GameStateService);
  protected readonly guardList = signal<Guard[]>([]);

  private readonly grps = viewChildren<ElementRef<THREE.Group>>('grp');
  private readonly coneMats = viewChildren<ElementRef<THREE.MeshBasicMaterial>>('coneMat');
  private readonly bodyMats = viewChildren<ElementRef<THREE.MeshToonMaterial>>('bodyMat');
  private readonly torches = viewChildren<ElementRef<THREE.PointLight>>('torch');
  readonly toon = toonGradient;

  constructor() {
    injectBeforeRender(() => this.sync());
  }

  coneLen(g: Guard): number { return (g.boss ? VIS_RANGE * 2 : VIS_RANGE); }
  coneRadius(g: Guard): number {
    const halfAngle = (g.boss ? VIS_ANGLE * 1.3 : VIS_ANGLE) / 2;
    return Math.tan(halfAngle) * this.coneLen(g);
  }

  private sync(): void {
    const guards = this.game.sim.state.guards;
    if (guards.length !== this.guardList().length) {
      this.guardList.set(guards.slice());
    }

    const grps = this.grps();
    const coneMats = this.coneMats();
    const bodyMats = this.bodyMats();
    const torches = this.torches();

    for (let i = 0; i < grps.length && i < guards.length; i++) {
      const g = guards[i];
      const grp = grps[i].nativeElement;
      grp.position.set(cx(g.x), 0, cz(g.y));
      // sim angle a (x→X, y→Z): world forward = (cos a, 0, sin a); local +X → that.
      grp.rotation.y = -g.angle;

      // State → colour for cone + torch.
      const chasing = g.state === 'chase';
      const searching = g.state === 'search';
      const stunned = g.stun > 0;
      const hex = stunned ? 0x66ddff : chasing ? 0xff2200 : searching ? 0xff8800 : 0xffcc66;

      const coneMat = coneMats[i]?.nativeElement;
      if (coneMat) {
        coneMat.color.setHex(hex);
        coneMat.opacity = stunned ? 0.03 : chasing ? 0.2 : searching ? 0.15 : 0.09;
      }
      const torch = torches[i]?.nativeElement;
      if (torch) {
        torch.color.setHex(hex);
        // gentle flicker driven by the guard's torch phase
        torch.intensity = stunned ? 0.2 : (1.0 + Math.sin(g.tph) * 0.25) * (chasing ? 1.6 : 1);
      }
      const bodyMat = bodyMats[i]?.nativeElement;
      if (bodyMat) {
        bodyMat.color.setHex(g.boss ? 0x4a0d0d : 0x2a1206);
        bodyMat.emissive.setHex(chasing ? 0x330000 : 0x000000);
      }
      const scale = g.boss ? 1.5 : 1;
      grp.scale.setScalar(stunned ? scale * 0.85 : scale);
    }
  }
}
