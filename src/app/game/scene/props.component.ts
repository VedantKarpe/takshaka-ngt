import {
  ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, viewChildren,
} from '@angular/core';
import { injectBeforeRender, NgtArgs } from 'angular-three';
import * as THREE from 'three';
import { mergeBufferGeometries } from 'three-stdlib';
import { WORLD_MAX_X, WORLD_MAX_Y, WORLD_MIN_X, WORLD_MIN_Y } from '../../core/models';
import { g2w } from './coords';
import { toonGradient } from './toon';

interface Prop {
  kind: 'wall' | 'column' | 'bush';
  pos: [number, number, number];
  rotY: number;
  scale: [number, number, number];
  color: string;
}
interface Tree { pos: [number, number, number]; h: number; r: number; }
interface Brazier { pos: [number, number, number]; }
interface Rock { pos: [number, number, number]; s: number; rotY: number; color: string; }

/** Tiny deterministic PRNG so the ruins look identical every load. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * PropsComponent — the procedural cel-shaded environment that turns the flat
 * ground into a ruined, torch-lit temple ground (dusk).
 *
 *   • BRAZIERS — torch posts with an emissive flame + a flickering warm
 *     PointLight. These supply the dusk atmosphere and pools of light.
 *   • WALLS / COLUMNS — broken stone strewn around the arena perimeter.
 *   • BUSHES / TREES — low-poly foliage for the overgrown-ruins feel.
 *
 * Everything uses `MeshToonMaterial`, so the global OutlineLayer inks it all.
 * Positions are seeded (deterministic). These are decorative only — collision
 * still lives in the sim's PILLARS — so they never affect gameplay.
 */
@Component({
  selector: 'app-props',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <!-- Braziers -->
    @for (b of braziers; track $index) {
      <ngt-group [position]="b.pos">
        <ngt-mesh [position]="[0, 26, 0]" [castShadow]="true">
          <ngt-cylinder-geometry *args="[3.5, 5, 52, 8]" />
          <ngt-mesh-toon-material color="#4a3a2a" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[0, 56, 0]">
          <ngt-icosahedron-geometry *args="[9, 0]" />
          <ngt-mesh-toon-material
            color="#ff8a3a" [emissive]="'#ff6a1a'" [emissiveIntensity]="2.4"
            [gradientMap]="toon" [toneMapped]="false" />
        </ngt-mesh>
        <ngt-point-light #flame [position]="[0, 60, 0]" [distance]="240" [color]="'#ff9a44'" [intensity]="2.4" />
      </ngt-group>
    }

    <!-- Standing lamps (diya stambha) along the colonnades -->
    @for (l of lamps; track $index) {
      <ngt-group [position]="l">
        <ngt-mesh [position]="[0, 25, 0]" [castShadow]="true">
          <ngt-cylinder-geometry *args="[1.8, 2.6, 50, 8]" />
          <ngt-mesh-toon-material color="#5a5048" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[0, 52, 0]">
          <ngt-cylinder-geometry *args="[5.5, 3, 7, 8]" />
          <ngt-mesh-toon-material color="#8a6a2a" [emissive]="'#5a3a10'" [emissiveIntensity]="0.4" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[0, 58, 0]">
          <ngt-icosahedron-geometry *args="[3.6, 0]" />
          <ngt-mesh-toon-material color="#ffb04a" [emissive]="'#ff7a1a'" [emissiveIntensity]="2.4" [toneMapped]="false" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-point-light #lampLight [position]="[0, 60, 0]" [distance]="170" [color]="'#ffc060'" [intensity]="1.7" />
      </ngt-group>
    }

    <!-- Walls, columns, bushes -->
    @for (p of props; track $index) {
      <ngt-mesh [position]="p.pos" [rotation]="[0, p.rotY, 0]" [scale]="p.scale" [castShadow]="true">
        @switch (p.kind) {
          @case ('wall')   { <ngt-box-geometry *args="[1, 1, 1]" /> }
          @case ('column') { <ngt-cylinder-geometry *args="[1, 1, 1, 10]" /> }
          @case ('bush')   { <ngt-dodecahedron-geometry *args="[1, 0]" /> }
        }
        <ngt-mesh-toon-material [color]="p.color" [gradientMap]="toon" />
      </ngt-mesh>
    }

    <!-- Rocks -->
    @for (r of rocks; track $index) {
      <ngt-mesh [position]="r.pos" [rotation]="[0.3, r.rotY, 0.2]" [scale]="[r.s, r.s * 0.6, r.s]" [castShadow]="true">
        <ngt-icosahedron-geometry *args="[1, 0]" />
        <ngt-mesh-toon-material [color]="r.color" [gradientMap]="toon" />
      </ngt-mesh>
    }

    <!-- Grass: one instanced mesh for the whole map (single draw call) -->
    <ngt-primitive *args="[grass]" />

    <!-- Trees (trunk + canopy) -->
    @for (t of trees; track $index) {
      <ngt-group [position]="t.pos">
        <ngt-mesh [position]="[0, t.h / 2, 0]" [castShadow]="true">
          <ngt-cylinder-geometry *args="[t.h * 0.06, t.h * 0.09, t.h, 7]" />
          <ngt-mesh-toon-material color="#5a4530" [gradientMap]="toon" />
        </ngt-mesh>
        <ngt-mesh [position]="[0, t.h + t.r * 0.4, 0]" [castShadow]="true">
          <ngt-icosahedron-geometry *args="[t.r, 0]" />
          <ngt-mesh-toon-material color="#33502b" [gradientMap]="toon" />
        </ngt-mesh>
      </ngt-group>
    }
  `,
})
export class PropsComponent {
  readonly toon = toonGradient;
  readonly braziers: Brazier[] = [];
  readonly props: Prop[] = [];
  readonly trees: Tree[] = [];
  readonly rocks: Rock[] = [];
  /** All grass tufts across the whole map, drawn as one instanced mesh. */
  readonly grass: THREE.InstancedMesh;
  readonly lamps: [number, number, number][] = [];

  private readonly flames = viewChildren<ElementRef<THREE.PointLight>>('flame');
  private readonly lampLights = viewChildren<ElementRef<THREE.PointLight>>('lampLight');

  constructor() {
    // Braziers flank the colonnades and the two entrances.
    for (const [x, y] of [[150, 200], [150, 480], [750, 200], [750, 480], [450, 656], [450, 84]]) {
      this.braziers.push({ pos: g2w(x, y, 0) });
    }

    // Standing lamps at the colonnade midpoints + arch passages.
    for (const [x, y] of [[175, 340], [725, 340], [380, 185], [520, 185], [380, 495], [520, 495]]) {
      this.lamps.push(g2w(x, y, 0));
    }

    const rng = mulberry32(0xa11ce);
    const inAltar = (x: number, y: number) => x > 270 && x < 630 && y > 155 && y < 525;

    // Scatter walls / columns / bushes around the perimeter + outer ruins.
    for (let i = 0; i < 46; i++) {
      let x = 0, y = 0;
      for (let a = 0; a < 8; a++) {
        x = -200 + rng() * 1300;
        y = -160 + rng() * 1000;
        if (!inAltar(x, y)) break;
      }
      const roll = rng();
      if (roll < 0.4) {
        const len = 40 + rng() * 80;
        this.props.push({
          kind: 'wall', pos: g2w(x, y, 14 + rng() * 6), rotY: rng() * Math.PI,
          scale: [len, 26 + rng() * 22, 14], color: rng() < 0.5 ? '#7a6450' : '#8a7458',
        });
      } else if (roll < 0.62) {
        const h = 30 + rng() * 50;
        const fallen = rng() < 0.55;
        this.props.push({
          kind: 'column',
          pos: g2w(x, y, fallen ? 10 : h / 2),
          rotY: rng() * Math.PI,
          scale: fallen ? [11, h, 11] : [13, h, 13],
          color: '#8a7458',
        });
      } else {
        const s = 12 + rng() * 16;
        this.props.push({
          kind: 'bush', pos: g2w(x, y, s * 0.6), rotY: rng() * Math.PI,
          scale: [s, s * 0.8, s], color: rng() < 0.5 ? '#3f5a32' : '#46663a',
        });
      }
    }

    // A handful of trees in the outer corners.
    for (let i = 0; i < 8; i++) {
      let x = 0, y = 0;
      for (let a = 0; a < 8; a++) {
        x = -160 + rng() * 1220;
        y = -120 + rng() * 920;
        if (!inAltar(x, y)) break;
      }
      this.trees.push({ pos: g2w(x, y, 0), h: 70 + rng() * 60, r: 26 + rng() * 18 });
    }

    // Scattered rocks (everywhere, including paths — purely visual). A few
    // larger boulders plus lots of small stones to break up the open field.
    const rockCols = ['#6a6258', '#787064', '#5e564c'];
    for (let i = 0; i < 64; i++) {
      const x = -220 + rng() * 1340;
      const y = -180 + rng() * 1040;
      // Most are pebbles; ~1 in 5 is a chunkier boulder.
      const s = rng() < 0.2 ? 11 + rng() * 13 : 4 + rng() * 7;
      this.rocks.push({ pos: g2w(x, y, s * 0.3), s, rotY: rng() * Math.PI, color: rockCols[(rng() * 3) | 0] });
    }

    this.grass = this.buildGrass(rng, inAltar);

    // Flicker the brazier + lamp flames for a living dusk.
    injectBeforeRender(({ clock }) => {
      const t = clock.elapsedTime;
      const flames = this.flames();
      for (let i = 0; i < flames.length; i++) {
        flames[i].nativeElement.intensity = 2.2 + Math.sin(t * 7 + i * 1.7) * 0.6 + Math.sin(t * 13 + i) * 0.3;
      }
      const lamps = this.lampLights();
      for (let i = 0; i < lamps.length; i++) {
        lamps[i].nativeElement.intensity = 1.5 + Math.sin(t * 9 + i * 2.3) * 0.35;
      }
    });
  }

  /**
   * Build ALL grass as one {@link THREE.InstancedMesh}: a merged 3-blade tuft
   * geometry drawn once, instanced sparsely across the entire map. Per-instance
   * matrix (position / random yaw / height-and-width scale — taller, thinner
   * ones read as weeds) and per-instance HSL tint give a varied meadow at the
   * cost of a single draw call and no outline-hull overhead.
   */
  private buildGrass(rng: () => number, inAltar: (x: number, y: number) => boolean): THREE.InstancedMesh {
    const H = 16; // base tuft height; per-instance Y-scale varies it.
    const blade = (r: number, h: number, x: number, y: number, z: number, rx: number, rz: number) => {
      const g = new THREE.ConeGeometry(r, h, 4);
      g.rotateX(rx); g.rotateZ(rz); g.translate(x, y, z);
      return g;
    };
    const tuftGeo = mergeBufferGeometries([
      blade(2,   H,        0,  H * 0.5,  0,  0,    0.1),
      blade(1.6, H * 0.8,  3,  H * 0.42, 1,  0.2, -0.25),
      blade(1.6, H * 0.75, -3, H * 0.4, -1, -0.2,  0.3),
    ])!;

    // Tuft positions (sim space): a sparse blanket over the FULL map, plus a
    // little extra across the arena the player actually walks.
    const spots: [number, number][] = [];
    const scatter = (n: number, sx: number, sw: number, sy: number, sh: number) => {
      for (let i = 0; i < n; i++) {
        const x = sx + rng() * sw, y = sy + rng() * sh;
        if (!inAltar(x, y)) spots.push([x, y]);
      }
    };
    scatter(560, WORLD_MIN_X + 30, WORLD_MAX_X - WORLD_MIN_X - 60, WORLD_MIN_Y + 30, WORLD_MAX_Y - WORLD_MIN_Y - 60);
    scatter(190, -100, 1100, -100, 880); // arena + immediate surrounds

    const mesh = new THREE.InstancedMesh(
      tuftGeo, new THREE.MeshToonMaterial({ gradientMap: toonGradient }), spots.length,
    );
    mesh.frustumCulled = false;       // one mesh spans the whole map
    mesh.userData['outline'] = true;  // opt out of the inverted-hull outline pass

    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < spots.length; i++) {
      const [sx, sy] = spots[i];
      const [wx, , wz] = g2w(sx, sy);
      const weed = rng() < 0.16;
      dummy.position.set(wx, 0, wz);
      dummy.rotation.set(0, rng() * Math.PI * 2, 0);
      dummy.scale.set(weed ? 0.55 : 0.85 + rng() * 0.5, weed ? 1.3 + rng() * 0.7 : 0.7 + rng() * 0.6, weed ? 0.55 : 0.85 + rng() * 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      col.setHSL(0.24 + rng() * 0.13, 0.38 + rng() * 0.26, 0.26 + rng() * 0.14);
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }
}
