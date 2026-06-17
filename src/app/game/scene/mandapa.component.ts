import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgtArgs } from 'angular-three';
import { toonGradient } from './toon';

/**
 * MandapaComponent — the open pavilion (mandapa) enclosing the sacrificial
 * fires: four ornate corner pillars (aligned to the altar-corner PILLARS), a
 * lintel frame and a translucent saffron canopy peaking above. Left OPEN in the
 * middle and the cloth kept see-through so it never hides the altar action from
 * the top-down camera.
 *
 * Coordinates are in world space (altar centre = origin); the four corners sit
 * at (±150, ±90), matching the altar-corner collision pillars.
 */
@Component({
  selector: 'app-mandapa',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Corner pillars + capitals -->
    @for (c of corners; track $index) {
      <ngt-mesh [position]="[c[0], 42, c[1]]" [castShadow]="true">
        <ngt-cylinder-geometry *args="[6, 7, 84, 10]" />
        <ngt-mesh-toon-material color="#b8a47e" [gradientMap]="toon" />
      </ngt-mesh>
      <ngt-mesh [position]="[c[0], 86, c[1]]" [castShadow]="true">
        <ngt-box-geometry *args="[16, 8, 16]" />
        <ngt-mesh-toon-material color="#caa24a" [emissive]="'#7a5a14'" [emissiveIntensity]="0.35" [gradientMap]="toon" />
      </ngt-mesh>
    }

    <!-- Lintel frame -->
    <ngt-mesh [position]="[0, 90, -90]"><ngt-box-geometry *args="[316, 8, 10]" /><ngt-mesh-toon-material color="#9a8466" [gradientMap]="toon" /></ngt-mesh>
    <ngt-mesh [position]="[0, 90, 90]"><ngt-box-geometry *args="[316, 8, 10]" /><ngt-mesh-toon-material color="#9a8466" [gradientMap]="toon" /></ngt-mesh>
    <ngt-mesh [position]="[-150, 90, 0]"><ngt-box-geometry *args="[10, 8, 196]" /><ngt-mesh-toon-material color="#9a8466" [gradientMap]="toon" /></ngt-mesh>
    <ngt-mesh [position]="[150, 90, 0]"><ngt-box-geometry *args="[10, 8, 196]" /><ngt-mesh-toon-material color="#9a8466" [gradientMap]="toon" /></ngt-mesh>

    <!-- Translucent canopy (see-through, so it doesn't hide the altar) -->
    <ngt-mesh [position]="[0, 118, 0]" [rotation]="[0, 0.7853981, 0]">
      <ngt-cone-geometry *args="[210, 54, 4]" />
      <ngt-mesh-toon-material
        color="#e0902a" [emissive]="'#c46a1a'" [emissiveIntensity]="0.3"
        [transparent]="true" [opacity]="0.42" [side]="2" [depthWrite]="false" [gradientMap]="toon" />
    </ngt-mesh>
    <!-- Finial -->
    <ngt-mesh [position]="[0, 150, 0]" [castShadow]="true">
      <ngt-cone-geometry *args="[8, 22, 6]" />
      <ngt-mesh-toon-material color="#e8c24a" [emissive]="'#aa7a14'" [emissiveIntensity]="0.6" [gradientMap]="toon" />
    </ngt-mesh>
  `,
})
export class MandapaComponent {
  readonly toon = toonGradient;
  readonly corners: [number, number][] = [
    [-150, -90], [150, -90], [-150, 90], [150, 90],
  ];
}
