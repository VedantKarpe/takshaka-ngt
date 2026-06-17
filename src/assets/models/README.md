# Models — glTF asset pipeline (Milestone 9)

The game ships with **procedural placeholder primitives** so it is fully
playable with no art assets. Dropping real models here swaps them in
automatically via `GltfModelComponent` (`game/scene/gltf-model.component.ts`).

## Expected files

| File            | Entity            | Faces toward |
|-----------------|-------------------|--------------|
| `takshaka.glb`  | the player serpent | +X (local)  |
| `guard.glb`     | priest / boss      | +X (local)  |
| `naga.glb`      | captured naga coil | —           |

All are **Y-up**, roughly 1–2 world units tall (they're scaled per entity in
the components). Keep them low-poly — this is a 2.5D top-down game.

## Pipeline

1. **Author / export from Blender**

   ```bash
   blender --background --python blender_scripts/export_models.py
   ```

   This writes raw `.glb` files into this folder. (Edit the `build_*` functions
   in that script to point at your real sculpts.)

2. **Compress with Draco geometry + KTX2 / Basis textures**

   ```bash
   npm run models:optimize
   ```

   Runs `gltf-transform optimize` over every `.glb` here:
   - Draco geometry compression
   - KTX2 (ETC1S/UASTC Basis) texture compression
   - dedupe + prune + weld

   `GltfModelComponent` loads with `useDraco: true`, and GLTFLoader
   auto-detects the KTX2 textures (soba registers a `KTX2Loader` against the
   renderer), so no further wiring is needed.

## Wiring a model into an entity

Render `<app-gltf-model>` next to (or instead of) the placeholder mesh inside
an entity component, e.g. in `player.component.ts`:

```html
<app-gltf-model url="assets/models/takshaka.glb" [scale]="8" />
```

Because loading is async, leave the placeholder mesh in place until the model
resolves — gameplay must never block on art.
