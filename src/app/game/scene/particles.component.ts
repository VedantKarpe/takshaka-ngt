import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { injectBeforeRender, NgtArgs } from 'angular-three';
import * as THREE from 'three';
import { GameStateService } from '../../core/game-state.service';
import { cx, cz } from './coords';

const MAX_PARTICLES = 2400;

/**
 * ParticlesComponent — every spark the sim emits (rescue bursts, venom trail,
 * hit scatter, …) drawn through ONE additive THREE.Points object. We build the
 * Points imperatively and inject it with `<ngt-primitive>`, then rewrite its
 * position/color buffers each frame from `sim.state.parts`. Far cheaper than a
 * mesh per particle.
 */
@Component({
  selector: 'app-particles',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<ngt-primitive *args="[points]" />`,
})
export class ParticlesComponent {
  private readonly game = inject(GameStateService);

  private readonly positions = new Float32Array(MAX_PARTICLES * 3);
  private readonly colors = new Float32Array(MAX_PARTICLES * 3);
  readonly points: THREE.Points;
  private readonly color = new THREE.Color();

  constructor() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setDrawRange(0, 0);
    const mat = new THREE.PointsMaterial({
      size: 5, vertexColors: true, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;

    injectBeforeRender(() => this.sync());
  }

  private sync(): void {
    const parts = this.game.sim.state.parts;
    const n = Math.min(parts.length, MAX_PARTICLES);
    for (let i = 0; i < n; i++) {
      const p = parts[i];
      this.positions[i * 3]     = cx(p.x);
      this.positions[i * 3 + 1] = 8 + (1 - p.life / 44) * 6;
      this.positions[i * 3 + 2] = cz(p.y);
      this.color.set(p.color);
      this.colors[i * 3]     = this.color.r;
      this.colors[i * 3 + 1] = this.color.g;
      this.colors[i * 3 + 2] = this.color.b;
    }
    const geo = this.points.geometry;
    geo.setDrawRange(0, n);
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }
}
