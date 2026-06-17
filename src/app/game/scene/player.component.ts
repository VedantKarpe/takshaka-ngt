import {
  afterNextRender, ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA,
  ElementRef, inject, viewChild, viewChildren,
} from '@angular/core';
import { injectBeforeRender, NgtArgs } from 'angular-three';
import * as THREE from 'three';
import { GameStateService } from '../../core/game-state.service';
import { TRAIL } from '../../core/models';
import { cx, cz } from './coords';
import { OutlineRegistryService } from './outline-registry.service';
import { toonGradient } from './toon';

/**
 * PlayerComponent — the player avatar: a hooded serpentine form with a flared
 * head + glowing eyes (a head group that turns to face the movement direction)
 * and a tapering chain of body spheres sampled from `player.body`.
 *
 * The stealth core is expressed through LIGHT:
 *   • SURGE ('venom') → bright green emissive + a real PointLight (a literal
 *                       light source — trivially visible by design),
 *   • CLOAK ('nectar') → emissive near zero, light dies → melts into shadow,
 *   • NORMAL → a calm teal glow between.
 *
 * (The 'venom'/'nectar' mode ids are internal sim identifiers; the HUD shows
 * them as SURGE / CLOAK.)
 *
 * Per the sim↔view contract this only READS sim state and WRITES transforms /
 * material props every frame.
 */
@Component({
  selector: 'app-player',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Head group: faces the heading (+X local = forward) -->
    <ngt-group #head>
      <!-- Cobra hood flare (behind/around the head, read from above) -->
      <ngt-mesh [position]="[-4, 1, 0]" [scale]="[1.4, 0.42, 1.25]" [castShadow]="true">
        <ngt-sphere-geometry *args="[11, 14, 12]" />
        <ngt-mesh-toon-material
          #headMat color="#1f7d5a" [emissive]="'#00ff88'" [emissiveIntensity]="0.8" [gradientMap]="toon" />
      </ngt-mesh>
      <!-- Snout -->
      <ngt-mesh [position]="[4, 0, 0]" [rotation]="[0, 0, 1.5707963]" [castShadow]="true">
        <ngt-capsule-geometry *args="[6, 10, 6, 12]" />
        <ngt-mesh-toon-material
          #headMat color="#1f7d5a" [emissive]="'#00ff88'" [emissiveIntensity]="0.8" [gradientMap]="toon" />
      </ngt-mesh>
      <!-- Eyes -->
      <ngt-mesh [position]="[10, 2.5, 3]">
        <ngt-sphere-geometry *args="[1.7, 8, 8]" />
        <ngt-mesh-toon-material color="#ffd23a" [emissive]="'#ffcc00'" [emissiveIntensity]="1.6" [toneMapped]="false" [gradientMap]="toon" />
      </ngt-mesh>
      <ngt-mesh [position]="[10, 2.5, -3]">
        <ngt-sphere-geometry *args="[1.7, 8, 8]" />
        <ngt-mesh-toon-material color="#ffd23a" [emissive]="'#ffcc00'" [emissiveIntensity]="1.6" [toneMapped]="false" [gradientMap]="toon" />
      </ngt-mesh>
    </ngt-group>

    <!-- Venom light source -->
    <ngt-point-light #glow [distance]="220" [color]="'#aaff00'" [intensity]="0" />

    <!-- Body trail segments -->
    @for (seg of segments; track $index) {
      <ngt-mesh #bodySeg [castShadow]="true">
        <ngt-sphere-geometry *args="[bodyRadius($index), 10, 10]" />
        <ngt-mesh-toon-material
          #bodyMat color="#1f7d5a" [emissive]="'#00ff88'" [emissiveIntensity]="0.6" [gradientMap]="toon" />
      </ngt-mesh>
    }
  `,
})
export class PlayerComponent {
  private readonly game = inject(GameStateService);
  private readonly outlineReg = inject(OutlineRegistryService);

  readonly segments = Array.from({ length: TRAIL }, (_, i) => i);

  private readonly head = viewChild.required<ElementRef<THREE.Group>>('head');
  private readonly headMats = viewChildren<ElementRef<THREE.MeshToonMaterial>>('headMat');
  private readonly glow = viewChild.required<ElementRef<THREE.PointLight>>('glow');
  private readonly bodySegs = viewChildren<ElementRef<THREE.Mesh>>('bodySeg');
  private readonly bodyMats = viewChildren<ElementRef<THREE.MeshToonMaterial>>('bodyMat');

  readonly toon = toonGradient;
  bodyRadius(i: number): number { return Math.max(1.8, 6.5 - i * 0.2); }

  constructor() {
    injectBeforeRender(() => this.sync());
    afterNextRender(() => this.outlineReg.register(this.head().nativeElement));
  }

  private sync(): void {
    const p = this.game.sim.state.player;

    const isVenom = p.mode === 'venom';
    const isNectar = p.mode === 'nectar';
    const emissiveHex = isVenom ? 0xaaff00 : isNectar ? 0x2266aa : 0x00ff88;
    const emissiveInt = isVenom ? 1.6 : isNectar ? 0.18 : 0.85;

    const head = this.head().nativeElement;
    head.position.set(cx(p.x), 10, cz(p.y));
    head.rotation.y = -p.angle;
    for (const ref of this.headMats()) {
      const m = ref.nativeElement;
      m.emissive.setHex(emissiveHex);
      m.emissiveIntensity = emissiveInt;
    }

    const glow = this.glow().nativeElement;
    glow.position.set(cx(p.x), 12, cz(p.y));
    glow.intensity = isVenom ? 3.2 : isNectar ? 0 : 0.35;
    glow.color.setHex(isVenom ? 0xaaff00 : 0x00ff88);

    const segs = this.bodySegs();
    const mats = this.bodyMats();
    for (let i = 0; i < segs.length; i++) {
      const seg = p.body[i] ?? p;
      const mesh = segs[i].nativeElement;
      mesh.position.set(cx(seg.x), 6, cz(seg.y));
      const mat = mats[i]?.nativeElement;
      if (mat) {
        mat.emissive.setHex(emissiveHex);
        mat.emissiveIntensity = emissiveInt * (1 - i / (TRAIL * 1.4));
      }
    }
  }
}
