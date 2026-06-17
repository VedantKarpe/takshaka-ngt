/**
 * extend.ts — registers the Three.js catalogue with angular-three's custom
 * renderer EXACTLY ONCE.
 *
 * NGT renders `<ngt-mesh>`, `<ngt-box-geometry>`, … by looking THREE classes up
 * in a global catalogue. `extend(THREE)` populates that catalogue with every
 * stock THREE export. Without it, those custom elements render nothing. This is
 * non-obvious NGT machinery, so it lives in its own module and is imported for
 * side effect by the canvas host.
 */
import * as THREE from 'three';
import { extend } from 'angular-three';

extend(THREE);
