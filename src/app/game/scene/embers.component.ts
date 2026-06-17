import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { injectBeforeRender, NgtArgs } from 'angular-three';
import * as THREE from 'three';
import { g2w } from './coords';

const N = 150;

/**
 * EmbersComponent — ambient embers drifting up from the sacrificial fires,
 * braziers and lamps: a single additive THREE.Points cloud whose particles rise,
 * sway and recycle. Pure atmosphere (no gameplay), animated each frame on the
 * render clock.
 */
@Component({
  selector: 'app-embers',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<ngt-primitive *args="[points]" />`,
})
export class EmbersComponent {
  readonly points: THREE.Points;

  // Emission sources: altar fires + braziers (world XZ).
  private readonly sources: [number, number][] = [
    [g2w(450, 305)[0], g2w(450, 305)[2]],
    [g2w(150, 200)[0], g2w(150, 200)[2]],
    [g2w(150, 480)[0], g2w(150, 480)[2]],
    [g2w(750, 200)[0], g2w(750, 200)[2]],
    [g2w(750, 480)[0], g2w(750, 480)[2]],
    [g2w(450, 656)[0], g2w(450, 656)[2]],
  ];

  private readonly pos = new Float32Array(N * 3);
  private readonly vel = new Float32Array(N);   // upward speed
  private readonly life = new Float32Array(N);

  constructor() {
    const colors = new Float32Array(N * 3);
    const c = new THREE.Color();
    for (let i = 0; i < N; i++) {
      this.respawn(i, Math.random() * 90);
      c.setHSL(0.07 + Math.random() * 0.05, 1, 0.55);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 4, vertexColors: true, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;

    injectBeforeRender(({ delta }) => this.tick(delta));
  }

  private respawn(i: number, life = 100): void {
    const [sx, sz] = this.sources[(Math.random() * this.sources.length) | 0];
    this.pos[i * 3] = sx + (Math.random() - 0.5) * 40;
    this.pos[i * 3 + 1] = 20 + Math.random() * 20;
    this.pos[i * 3 + 2] = sz + (Math.random() - 0.5) * 40;
    this.vel[i] = 18 + Math.random() * 30;
    this.life[i] = life;
  }

  private tick(delta: number): void {
    const dt = Math.min(delta, 0.05);
    const t = performance.now() * 0.001;
    for (let i = 0; i < N; i++) {
      this.pos[i * 3 + 1] += this.vel[i] * dt;
      this.pos[i * 3] += Math.sin(t * 1.5 + i) * 6 * dt;
      this.life[i] -= dt * 24;
      if (this.life[i] <= 0 || this.pos[i * 3 + 1] > 180) this.respawn(i);
    }
    (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }
}
