"""
export_models.py — Blender → glTF export for Takshaka's Curse.

Run headless from the repo root:

    blender --background --python blender_scripts/export_models.py

It builds simple stand-in meshes for each game entity and exports each as a
separate .glb into `src/assets/models/`. Replace the `build_*` bodies with your
real sculpts; the export + naming contract is what the game relies on:

    takshaka.glb   guard.glb   naga.glb

After exporting, compress with Draco + KTX2 (keeps the WebGL bundle small):

    npm run models:optimize

which runs gltf-transform over every .glb in src/assets/models/.
"""
import bpy
import math
import os

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "src", "assets", "models")


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def export_glb(name: str):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.abspath(os.path.join(OUT_DIR, f"{name}.glb"))
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        export_apply=True,           # apply modifiers
        export_yup=True,             # three.js is Y-up
        use_selection=False,
    )
    print(f"exported {path}")


def build_takshaka():
    # Serpent: a head + a tapering coil. Stand-in only.
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.7, location=(0, 0.9, 0))
    bpy.ops.mesh.primitive_cylinder_add(radius=0.5, depth=2.0, location=(0, 0.4, -1))


def build_guard():
    # Robed priest: a tapering cylinder body + a head.
    bpy.ops.mesh.primitive_cone_add(radius1=0.7, radius2=0.3, depth=2.2, location=(0, 1.1, 0))
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.4, location=(0, 2.4, 0))


def build_naga():
    # Coiled serpent: a torus + raised head.
    bpy.ops.mesh.primitive_torus_add(major_radius=1.0, minor_radius=0.35, location=(0, 0.4, 0))
    bpy.ops.transform.rotate(value=math.radians(90), orient_axis="X")
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.45, location=(0, 1.1, 0))


for entity, builder in (("takshaka", build_takshaka), ("guard", build_guard), ("naga", build_naga)):
    reset_scene()
    builder()
    export_glb(entity)

print("done.")
