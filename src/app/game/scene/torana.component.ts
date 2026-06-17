import {
  ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, viewChildren,
} from '@angular/core';
import { injectBeforeRender, NgtArgs } from 'angular-three';
import * as THREE from 'three';
import { g2w } from './coords';
import { toonGradient } from './toon';

interface Arch { pos: [number, number, number]; rotY: number; }

/**
 * ToranaComponent — towering temple GATEWAY arches (torana) at the cardinal
 * approaches to the yagna, with saffron/crimson banners hanging from the
 * lintel. Big cel silhouettes that give the skyline a sense of sacred
 * architecture. Decorative only (collision stays in the sim PILLARS).
 */
@Component({
  selector: 'app-torana',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @for (a of arches; track $index) {
      <ngt-group [position]="a.pos" [rotation]="[0, a.rotY, 0]">
        <!-- Posts -->
        <ngt-mesh [position]="[-span, height / 2, 0]" [castShadow]="true">
          <ngt-box-geometry *args="[18, height, 18]" />
          <ngt-mesh-toon-material color="#8a7458" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[span, height / 2, 0]" [castShadow]="true">
          <ngt-box-geometry *args="[18, height, 18]" />
          <ngt-mesh-toon-material color="#8a7458" [gradientMap]="toon" />
        </ngt-mesh>
        <!-- Lower + upper lintels (overhanging) -->
        <ngt-mesh [position]="[0, height * 0.82, 0]" [castShadow]="true">
          <ngt-box-geometry *args="[span * 2 + 24, 16, 22]" />
          <ngt-mesh-toon-material color="#9a8466" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[0, height + 2, 0]" [castShadow]="true">
          <ngt-box-geometry *args="[span * 2 + 54, 14, 26]" />
          <ngt-mesh-toon-material color="#9a8466" [gradientMap]="toon" />
        </ngt-mesh>
        <!-- Crest -->
        <ngt-mesh [position]="[0, height + 16, 0]" [castShadow]="true">
          <ngt-cone-geometry *args="[20, 26, 4]" />
          <ngt-mesh-toon-material color="#caa24a" [emissive]="'#7a5a14'" [emissiveIntensity]="0.4" [gradientMap]="toon" />
        </ngt-mesh>
        <!-- Hanging banners (sway in the wind) -->
        <ngt-mesh #cloth [position]="[-span * 0.45, height * 0.55, 12]">
          <ngt-box-geometry *args="[26, height * 0.42, 2]" />
          <ngt-mesh-toon-material color="#d8852a" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh #cloth [position]="[span * 0.45, height * 0.55, 12]">
          <ngt-box-geometry *args="[26, height * 0.42, 2]" />
          <ngt-mesh-toon-material color="#a83232" [gradientMap]="toon" />
        </ngt-mesh>
        <!-- Hanging vines from the lintel (sway too) -->
        @for (v of vines; track $index) {
          <ngt-mesh #cloth [position]="[v.x, height * 0.82 - v.len / 2 - 8, -8]">
            <ngt-box-geometry *args="[2.5, v.len, 2.5]" />
            <ngt-mesh-toon-material color="#3c5a2c" [gradientMap]="toon" />
          </ngt-mesh>
        }
      </ngt-group>
    }
  `,
})
export class ToranaComponent {
  readonly toon = toonGradient;
  readonly span = 80;
  readonly height = 150;

  // Vines dangling off the lintel at varied lengths.
  readonly vines = [
    { x: -62, len: 44 }, { x: -30, len: 30 }, { x: 6, len: 52 },
    { x: 40, len: 34 }, { x: 70, len: 46 },
  ];

  private readonly cloths = viewChildren<ElementRef<THREE.Mesh>>('cloth');

  constructor() {
    // Gently sway every banner + vine like cloth in an evening breeze.
    injectBeforeRender(({ clock }) => {
      const t = clock.elapsedTime;
      const cloths = this.cloths();
      for (let i = 0; i < cloths.length; i++) {
        cloths[i].nativeElement.rotation.z = Math.sin(t * 1.6 + i * 0.7) * 0.12;
      }
    });
  }

  // North & south approaches span along X; east & west are turned 90°.
  readonly arches: Arch[] = [
    { pos: g2w(450, 64, 0), rotY: 0 },
    { pos: g2w(450, 664, 0), rotY: 0 },
    { pos: g2w(70, 340, 0), rotY: Math.PI / 2 },
    { pos: g2w(830, 340, 0), rotY: Math.PI / 2 },
  ];
}
