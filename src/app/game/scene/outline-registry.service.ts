import { Injectable, signal } from '@angular/core';
import type { Object3D } from 'three';

/**
 * OutlineRegistryService — view-side registry of Object3Ds that the outline
 * post-effect should stroke. Kept out of `core/` so the simulation stays free
 * of any Three.js dependency. Entity components register their hero meshes
 * (e.g. Takshaka's head); the PostFx composer reads the signal into the
 * OutlineEffect selection.
 */
@Injectable({ providedIn: 'root' })
export class OutlineRegistryService {
  readonly targets = signal<Object3D[]>([]);

  register(obj: Object3D): void {
    this.targets.update(a => (a.includes(obj) ? a : [...a, obj]));
  }

  unregister(obj: Object3D): void {
    this.targets.update(a => a.filter(o => o !== obj));
  }
}
