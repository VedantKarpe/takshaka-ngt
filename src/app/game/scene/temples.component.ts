import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { NgtArgs } from 'angular-three';
import { steppedTiers, Tier } from './temple.util';
import { toonGradient } from './toon';

interface Shrine { pos: [number, number]; tiers: Tier[]; capY: number; capR: number; }

/**
 * TemplesComponent — the Dravidian (Chola) temple silhouettes that turn the
 * grounds into a ruined temple complex (cf. Gangaikonda Cholapuram):
 *
 *   • VIMANA  — the towering main shrine (stepped pyramid + octagonal śikhara
 *     cap + kalaśa finial) on the north axis, behind the sacrificial hall.
 *   • GOPURAM — the great entrance gateway tower on the south axis, with a
 *     barrel-vaulted (śālā) roof and a passage through its base.
 *   • SHRINES — four subsidiary stepped towers at the courtyard corners.
 *
 * Weathered stone, slightly broken — ruins in the same cel style. World coords
 * (altar centre = origin); south = +Z, north = −Z.
 */
@Component({
  selector: 'app-temples',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- ── VIMANA (main tower, north) ── -->
    <ngt-group [position]="[0, 0, -190]">
      <ngt-mesh [position]="[0, 22, 0]" [castShadow]="true">
        <ngt-box-geometry *args="[150, 44, 150]" />
        <ngt-mesh-toon-material color="#8a7458" [gradientMap]="toon" />
      </ngt-mesh>
      @for (t of vimanaTiers; track $index) {
        <ngt-mesh [position]="[0, 44 + t.y, 0]" [castShadow]="true">
          <ngt-box-geometry *args="[t.w, t.h, t.d]" />
          <ngt-mesh-toon-material [color]="$index % 2 ? '#9a8466' : '#8a7458'" [gradientMap]="toon" />
        </ngt-mesh>
      }
      <!-- octagonal śikhara cap -->
      <ngt-mesh [position]="[0, vimanaCapY, 0]" [rotation]="[0, 0.3926, 0]" [castShadow]="true">
        <ngt-cylinder-geometry *args="[10, 40, 56, 8]" />
        <ngt-mesh-toon-material color="#7a6650" [gradientMap]="toon" />
      </ngt-mesh>
      <ngt-mesh [position]="[0, vimanaCapY + 40, 0]">
        <ngt-cone-geometry *args="[9, 26, 8]" />
        <ngt-mesh-toon-material color="#caa24a" [emissive]="'#6a4a10'" [emissiveIntensity]="0.4" [gradientMap]="toon" />
      </ngt-mesh>
    </ngt-group>

    <!-- ── GOPURAM (entrance gateway, south) ── -->
    <ngt-group [position]="[0, 0, 320]">
      <!-- base pylons flanking the passage -->
      <ngt-mesh [position]="[-50, 32, 0]" [castShadow]="true">
        <ngt-box-geometry *args="[52, 64, 64]" /><ngt-mesh-toon-material color="#7a6650" [gradientMap]="toon" />
      </ngt-mesh>
      <ngt-mesh [position]="[50, 32, 0]" [castShadow]="true">
        <ngt-box-geometry *args="[52, 64, 64]" /><ngt-mesh-toon-material color="#7a6650" [gradientMap]="toon" />
      </ngt-mesh>
      <ngt-mesh [position]="[0, 58, 0]" [castShadow]="true">
        <ngt-box-geometry *args="[150, 16, 64]" /><ngt-mesh-toon-material color="#8a7458" [gradientMap]="toon" />
      </ngt-mesh>
      @for (t of gopuramTiers; track $index) {
        <ngt-mesh [position]="[0, 66 + t.y, 0]" [castShadow]="true">
          <ngt-box-geometry *args="[t.w, t.h, t.d]" />
          <ngt-mesh-toon-material [color]="$index % 2 ? '#9a8466' : '#8a7458'" [gradientMap]="toon" />
        </ngt-mesh>
      }
      <!-- barrel-vaulted śālā roof -->
      <ngt-mesh [position]="[0, gopuramCapY, 0]" [rotation]="[0, 0, 1.5707963]" [castShadow]="true">
        <ngt-cylinder-geometry *args="[16, 16, 70, 12, 1, false, 0, 3.14159]" />
        <ngt-mesh-toon-material color="#9a8060" [gradientMap]="toon" />
      </ngt-mesh>
    </ngt-group>

    <!-- ── SUBSIDIARY SHRINES (corners) ── -->
    @for (s of shrines; track $index) {
      <ngt-group [position]="[s.pos[0], 0, s.pos[1]]">
        <ngt-mesh [position]="[0, 12, 0]" [castShadow]="true">
          <ngt-box-geometry *args="[54, 24, 54]" /><ngt-mesh-toon-material color="#8a7458" [gradientMap]="toon" />
        </ngt-mesh>
        @for (t of s.tiers; track $index) {
          <ngt-mesh [position]="[0, 24 + t.y, 0]" [castShadow]="true">
            <ngt-box-geometry *args="[t.w, t.h, t.d]" />
            <ngt-mesh-toon-material [color]="$index % 2 ? '#9a8466' : '#8a7458'" [gradientMap]="toon" />
          </ngt-mesh>
        }
        <ngt-mesh [position]="[0, s.capY, 0]" [rotation]="[0, 0.3926, 0]">
          <ngt-cylinder-geometry *args="[4, s.capR, 22, 8]" />
          <ngt-mesh-toon-material color="#7a6650" [gradientMap]="toon" />
        </ngt-mesh>
      </ngt-group>
    }
  `,
})
export class TemplesComponent {
  readonly toon = toonGradient;

  readonly vimanaTiers = steppedTiers(140, 140, 11, 230, 0.16);
  readonly vimanaCapY = 44 + 230;

  readonly gopuramTiers = steppedTiers(140, 56, 8, 150, 0.34);
  readonly gopuramCapY = 66 + 150 + 6;

  readonly shrines: Shrine[] = [
    [-300, -190], [300, -190], [-300, 210], [300, 210],
  ].map(([x, z]) => {
    const tiers = steppedTiers(46, 46, 5, 76, 0.3);
    return { pos: [x, z] as [number, number], tiers, capY: 24 + 76, capR: 18 };
  });
}
