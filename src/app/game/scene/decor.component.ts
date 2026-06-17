import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgtArgs } from 'angular-three';
import { PILLARS, WORLD_MAX_X, WORLD_MAX_Y, WORLD_MIN_X, WORLD_MIN_Y } from '../../core/models';
import { cx, cz } from './coords';
import { toonGradient } from './toon';

/**
 * DecorComponent — the static temple ruins: ground plane, the central altar
 * platform and the collision PILLARS (rendered as stone cylinders at the exact
 * positions the sim collides against). Purely declarative, never updated.
 */
@Component({
  selector: 'app-decor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Ground -->
    <ngt-mesh [rotation]="[-1.5707963, 0, 0]" [position]="[centerX, 0, centerZ]" [receiveShadow]="true">
      <ngt-plane-geometry *args="[worldW, worldH]" />
      <ngt-mesh-toon-material color="#6f8a48" [gradientMap]="toon" />
    </ngt-mesh>

    <!-- Altar platform — two stepped tiers (centre of the yagna) -->
    <ngt-mesh [position]="[0, 3, 0]" [receiveShadow]="true">
      <ngt-box-geometry *args="[270, 6, 234]" />
      <ngt-mesh-toon-material color="#b8a47e" [gradientMap]="toon" />
    </ngt-mesh>
    <ngt-mesh [position]="[0, 9, 0]" [receiveShadow]="true">
      <ngt-box-geometry *args="[222, 6, 188]" />
      <ngt-mesh-toon-material color="#c9b48c" [gradientMap]="toon" />
    </ngt-mesh>

    <!-- Sacrificial pyre: crossed charred logs beneath the fires -->
    @for (lg of pyreLogs; track $index) {
      <ngt-mesh [position]="[lg.x, 16, lg.z]" [rotation]="[0, lg.rot, 1.5707963]" [castShadow]="true">
        <ngt-cylinder-geometry *args="[4, 4, 92, 7]" />
        <ngt-mesh-toon-material color="#3a2414" [emissive]="'#ff4400'" [emissiveIntensity]="0.35" [gradientMap]="toon" />
      </ngt-mesh>
    }

    <!-- Kalash offering pots flanking the altar -->
    @for (k of kalash; track $index) {
      <ngt-group [position]="[k[0], 12, k[1]]">
        <ngt-mesh [position]="[0, 7, 0]" [castShadow]="true">
          <ngt-sphere-geometry *args="[8, 12, 10]" />
          <ngt-mesh-toon-material color="#b5832a" [emissive]="'#5a3a10'" [emissiveIntensity]="0.3" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[0, 14, 0]">
          <ngt-cylinder-geometry *args="[4, 5.5, 4, 10]" />
          <ngt-mesh-toon-material color="#caa24a" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[0, 18, 0]">
          <ngt-sphere-geometry *args="[3.4, 8, 8]" />
          <ngt-mesh-toon-material color="#7a5a2a" [gradientMap]="toon" />
        </ngt-mesh>
      </ngt-group>
    }

    <!-- Collision pillars -->
    @for (p of pillars; track $index) {
      <ngt-mesh [position]="[cxv(p.x), 16, czv(p.y)]" [castShadow]="true">
        <ngt-cylinder-geometry *args="[p.r, p.r * 1.1, 32, 12]" />
        <ngt-mesh-toon-material color="#d8c6a0" [gradientMap]="toon" />
      </ngt-mesh>
    }
  `,
})
export class DecorComponent {
  readonly pillars = PILLARS;
  readonly worldW = WORLD_MAX_X - WORLD_MIN_X;
  readonly worldH = WORLD_MAX_Y - WORLD_MIN_Y;
  readonly centerX = (WORLD_MIN_X + WORLD_MAX_X) / 2 - 450; // - GW/2
  readonly centerZ = (WORLD_MIN_Y + WORLD_MAX_Y) / 2 - 340; // - GH/2
  cxv = cx; czv = cz;
  readonly toon = toonGradient;

  // Kalash pots at the four outer corners of the altar's top tier.
  readonly kalash: [number, number][] = [
    [-95, -78], [95, -78], [-95, 78], [95, 78],
  ];

  // Crossed logs of the pyre, centred under the altar fires (~game 450,305).
  readonly pyreLogs = [
    { x: cx(450), z: cz(305), rot: 0 },
    { x: cx(450), z: cz(305), rot: Math.PI / 2 },
    { x: cx(452), z: cz(300), rot: Math.PI / 4 },
    { x: cx(448), z: cz(310), rot: -Math.PI / 4 },
  ];
}
