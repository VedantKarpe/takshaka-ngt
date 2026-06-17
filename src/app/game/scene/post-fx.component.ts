import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import {
  NgtpEffectComposer, NgtpBloom, NgtpNoise, NgtpVignette,
} from 'angular-three-postprocessing';

/**
 * PostFxComponent — the stylised finishing pass (Milestone 8), tuned for the
 * bright cel-shaded abeto look.
 *
 *   • BLOOM    — soft halo on the emissive venom/fire/naga glows. Threshold is
 *                kept high so the bright daytime surfaces don't blow out.
 *   • NOISE    — fine film grain for a printed, hand-made texture.
 *   • VIGNETTE — a gentle edge darken (light, since it's daytime now).
 *
 * The hard black silhouette lines come from the inverted-hull OutlineLayer in
 * the scene graph (not a post effect), so every mesh — static or spawned — is
 * inked uniformly.
 */
@Component({
  selector: 'app-post-fx',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtpEffectComposer, NgtpBloom, NgtpNoise, NgtpVignette],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <ngtp-effect-composer [options]="{ multisampling: 0 }">
      <ngtp-bloom
        [options]="{ intensity: 1.0, luminanceThreshold: 0.45, luminanceSmoothing: 0.5, mipmapBlur: true }" />
      <ngtp-noise [options]="{ premultiply: true }" [opacity]="0.05" />
      <ngtp-vignette [options]="{ darkness: 0.55, offset: 0.36 }" />
    </ngtp-effect-composer>
  `,
})
export class PostFxComponent {}
