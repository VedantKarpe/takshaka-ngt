import * as THREE from 'three';

/**
 * toon.ts — shared cel-shading helpers for the abeto/Ghibli look.
 *
 * `toonGradient` is a tiny stepped ramp texture fed to every
 * `MeshToonMaterial`'s `gradientMap`. NearestFilter gives HARD bands (flat
 * cel shading) instead of a smooth falloff — the signature of the style.
 */
function makeToonGradient(steps = 4): THREE.DataTexture {
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) {
    data[i] = Math.round((i / (steps - 1)) * 255);
  }
  const tex = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/** Singleton 4-band cel ramp shared by all toon materials. */
export const toonGradient = makeToonGradient(4);
