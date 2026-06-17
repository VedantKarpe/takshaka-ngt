import { ChangeDetectionStrategy, Component } from '@angular/core';
import { injectBeforeRender } from 'angular-three';
import * as THREE from 'three';

/**
 * OutlineLayerComponent — the bold black ink outlines that define the
 * abeto/cel-shaded look.
 *
 * Technique: INVERTED HULL. For every opaque toon mesh we attach a back-face
 * child that pushes its vertices OUT along their normals (in view space, so the
 * line keeps a near-constant screen thickness) and paints them near-black. The
 * back faces peek out just past the silhouette → a clean ink line.
 *
 * Doing it as a scene traversal (rather than per-entity markup) means it covers
 * BOTH the static decor and dynamically spawned guards/bosses with one
 * implementation. New meshes are picked up within a few frames; we skip
 * transparent glows (fire/cones/hazards), points and lights.
 */
@Component({
  selector: 'app-outline-layer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ``,
})
export class OutlineLayerComponent {
  /** Shared inverted-hull material: push along normal, draw back faces dark. */
  private readonly outlineMaterial = new THREE.ShaderMaterial({
    uniforms: { thickness: { value: 3.8 }, outlineColor: { value: new THREE.Color('#0c0b07') } },
    vertexShader: /* glsl */ `
      uniform float thickness;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        mv.xyz += n * thickness;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 outlineColor;
      void main() { gl_FragColor = vec4(outlineColor, 1.0); }
    `,
    side: THREE.BackSide,
  });

  private tick = 0;
  private readonly tmpScale = new THREE.Vector3();

  constructor() {
    injectBeforeRender(({ scene }) => {
      // Re-scan periodically (cheap) to absorb newly-spawned meshes.
      if (this.tick++ % 20 !== 0) return;
      const pending: THREE.Mesh[] = [];
      scene.traverse(obj => {
        const m = obj as THREE.Mesh;
        if (!m.isMesh || m.userData['outline'] || m.userData['isOutline']) return;
        const mat = m.material as THREE.Material | undefined;
        // Only ink opaque cel surfaces — skip glows, helpers, etc.
        if (!mat || (mat as THREE.Material).transparent) return;
        if (!(mat as any).isMeshToonMaterial) return;
        // PERF: skip outlining tiny details (grass blades, eyes, vines, pot
        // tops) and the huge ground/horizon — both add draw calls for no
        // readable benefit. Keep mid-size readable geometry only.
        const geo = m.geometry;
        if (!geo.boundingSphere) geo.computeBoundingSphere();
        m.getWorldScale(this.tmpScale);
        const r = (geo.boundingSphere?.radius ?? 0) * Math.max(this.tmpScale.x, this.tmpScale.y, this.tmpScale.z);
        if (r < 6 || r > 700) { m.userData['outline'] = true; return; }
        pending.push(m);
      });
      for (const m of pending) {
        const hull = new THREE.Mesh(m.geometry, this.outlineMaterial);
        hull.userData['isOutline'] = true;
        hull.renderOrder = -1;
        m.add(hull);
        m.userData['outline'] = true;
      }
    });
  }
}
