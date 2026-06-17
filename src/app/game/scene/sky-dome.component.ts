import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { injectBeforeRender, NgtArgs } from 'angular-three';
import * as THREE from 'three';

/**
 * SkyDomeComponent — a large inward-facing sphere with a vertical gradient
 * shader, giving the "painted sky" of the reference but in a DUSK palette:
 * deep indigo overhead melting into a warm amber horizon. Recolour the two
 * uniforms to retune the time of day.
 *
 * The dome recentres on the camera each frame so the player never reaches its
 * edge. It is excluded from the ink-outline pass (not a toon material).
 */
@Component({
  selector: 'app-sky-dome',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `<ngt-primitive *args="[dome]" />`,
})
export class SkyDomeComponent {
  readonly dome: THREE.Mesh;

  constructor() {
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color('#241a3a') },     // deep dusk indigo
        horizonColor: { value: new THREE.Color('#e8895a') },  // warm amber horizon
        offset: { value: 0.18 },
        exponent: { value: 0.9 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float t = pow(clamp((h + offset), 0.0, 1.0), exponent);
          gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
        }
      `,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), material);
    this.dome.frustumCulled = false;
    this.dome.userData['isOutline'] = true; // belt-and-suspenders: never ink the sky

    injectBeforeRender(({ camera }) => {
      this.dome.position.copy(camera.position);
    });
  }
}
