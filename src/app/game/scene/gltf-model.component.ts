import {
  ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input,
} from '@angular/core';
import { NgtArgs } from 'angular-three';
import { injectGLTF } from 'angular-three-soba/loaders';

/**
 * GltfModelComponent — Milestone 9 loading infrastructure.
 *
 * Loads a Draco-compressed (and KTX2/Basis-textured) glTF via soba's
 * `injectGLTF` and drops its `scene` into the graph with `<ngt-primitive>`.
 * `useDraco: true` wires up a DRACOLoader (decoder served from the configured
 * path); GLTFLoader auto-detects KTX2 textures when a KTX2Loader is present,
 * which soba registers against the active renderer.
 *
 * Loading is async; until the model resolves (or if the file is absent) the
 * caller continues to show its placeholder primitive — so gameplay is never
 * blocked on art assets, per the project constraints.
 *
 * Usage:  <app-gltf-model url="assets/models/takshaka.glb" [scale]="8" />
 */
@Component({
  selector: 'app-gltf-model',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtArgs],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    @if (gltf(); as model) {
      <ngt-primitive *args="[model.scene]" [scale]="scale()" />
    }
  `,
})
export class GltfModelComponent {
  readonly url = input.required<string>();
  readonly scale = input(1);

  // Draco decoder is served from the app's own assets (copied at build time);
  // see angular.json assets + `npm run models:decoders`.
  protected readonly gltf = injectGLTF(() => this.url(), { useDraco: true });
}
