"""Render seven architectural catalogue portraits from the editable village.

Run after generating fen-kesif-koyu.blend:
    blender -b fen-kesif-koyu.blend --python detaylari_render.py
    blender -b fen-kesif-koyu.blend --python detaylari_render.py -- --only7
    blender -b fen-kesif-koyu.blend --python detaylari_render.py -- --only 3 8 lab

The scene's architecture is never moved or edited, and the .blend is never saved.
Only PNGs under ../public/fen-bilimleri are written. --dry-run checks scene roots,
visibility, geometry bounds, camera framing and output paths without rendering.
"""

from pathlib import Path
import argparse
import sys

import bpy
from mathutils import Vector


HERE = Path(__file__).resolve().parent
OUTPUT = HERE.parent / "public" / "fen-bilimleri"
BUILDINGS = tuple((str(grade), "grade_%d" % grade) for grade in range(3, 9)) + (("lab", "lab"),)
ROOT_IDS = tuple(root_id for _, root_id in BUILDINGS)
GEOMETRY_TYPES = {"MESH", "CURVE", "SURFACE", "FONT", "META"}


def _arguments(argv=None):
    if argv is None:
        argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    # Concise --only7 / --onlylab aliases remain useful for a single re-render.
    normalized = []
    for arg in argv:
        if arg.startswith("--only") and arg not in ("--only",):
            value = arg[len("--only"):].lstrip("=")
            if value:
                normalized.extend(("--only", *value.split(",")))
                continue
        normalized.append(arg)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--only", nargs="+", choices=[item[0] for item in BUILDINGS],
                        help="Render only the selected grades / lab, preserving catalogue order.")
    parser.add_argument("--dry-run", action="store_true", help="Validate framing without rendering.")
    return parser.parse_args(normalized)


def _descendants(root):
    yield root
    yield from root.children_recursive


def _visible_tree(root, visible):
    for obj in _descendants(root):
        obj.hide_render = not visible


def _geometry_corners(root):
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    corners = []
    for obj in _descendants(root):
        if obj.type not in GEOMETRY_TYPES or obj.hide_render:
            continue
        evaluated = obj.evaluated_get(depsgraph)
        corners.extend(evaluated.matrix_world @ Vector(corner) for corner in evaluated.bound_box)
    if not corners:
        raise RuntimeError("Renderable geometry was not found under root: " + root.name)
    return corners


def _configure_gpu(scene):
    """Use the source scene's GPU intent, discovering the current process's device."""
    # Device discovery is process-local: opening a .blend alone does not load the
    # previous generator process's OptiX device selection.
    try:
        preferences = bpy.context.preferences.addons["cycles"].preferences
        for backend in ("OPTIX", "CUDA"):
            try:
                preferences.compute_device_type = backend
                preferences.get_devices()
                available = [device for device in preferences.devices if device.type == backend]
                if not available:
                    continue
                preferred = [device for device in available if "4070" in device.name] or available
                for device in preferences.devices:
                    device.use = device in preferred
                scene.cycles.device = "GPU"
                print("DETAIL_DEVICE", backend, ", ".join(device.name for device in preferred), flush=True)
                return
            except (RuntimeError, TypeError):
                continue
    except (AttributeError, KeyError, RuntimeError) as exc:
        print("DETAIL_GPU_DISCOVERY", str(exc), flush=True)
    scene.cycles.device = "CPU"
    print("DETAIL_DEVICE CPU (no supported GPU discovered)", flush=True)


def _new_studio(scene):
    collection = bpy.data.collections.new("DETAIL_STUDIO_TEMPORARY")
    scene.collection.children.link(collection)

    camera_data = bpy.data.cameras.new("Detail · catalogue camera")
    camera = bpy.data.objects.new(camera_data.name, camera_data)
    collection.objects.link(camera)
    camera_data.type = "ORTHO"
    camera_data.lens = 50
    camera_data.clip_start = 0.05
    camera_data.clip_end = 500
    camera_data.dof.use_dof = False
    scene.camera = camera

    floor_material = bpy.data.materials.new("Detail · forest studio floor")
    floor_material.use_nodes = True
    bsdf = floor_material.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.36, 0.44, 0.26, 1)
    bsdf.inputs["Roughness"].default_value = 0.87
    bsdf.inputs["Metallic"].default_value = 0
    floor_material.diffuse_color = (0.36, 0.44, 0.26, 1)
    # A real 240 m matte plane fills the orthographic view and receives shadows.
    floor_mesh = bpy.data.meshes.new("Detail · infinite studio floor")
    floor_mesh.from_pydata([(-120, -120, 0), (120, -120, 0),
                           (120, 120, 0), (-120, 120, 0)], [], [(0, 1, 2, 3)])
    floor_mesh.update()
    floor = bpy.data.objects.new(floor_mesh.name, floor_mesh)
    collection.objects.link(floor)
    floor.data.materials.append(floor_material)

    # The original sun and architectural lights remain enabled. A broad local
    # softbox supplies consistent front-fill at all seven original site positions.
    fill_data = bpy.data.lights.new("Detail · soft front fill", "AREA")
    fill_data.energy = 850
    fill_data.shape = "DISK"
    fill_data.size = 9
    fill_data.color = (0.88, 0.95, 1.0)
    fill = bpy.data.objects.new(fill_data.name, fill_data)
    collection.objects.link(fill)

    world = bpy.data.worlds.new("Detail · soft marine studio ambience")
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.69, 0.79, 0.78, 1)
    background.inputs["Strength"].default_value = 0.42
    scene.world = world

    return {"collection": collection, "camera": camera, "floor": floor,
            "fill": fill, "world": world, "material": floor_material,
            "data": (camera_data, floor_mesh, fill_data)}


def _frame_model(studio, root, is_lab):
    corners = _geometry_corners(root)
    origin = root.matrix_world.translation.copy()
    target = origin + Vector((0, 0, 2.5))
    camera = studio["camera"]
    camera.location = origin + Vector((12, -17, 12))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    rotation = camera.rotation_euler.to_quaternion()
    right = rotation @ Vector((1, 0, 0))
    up = rotation @ Vector((0, 1, 0))
    xs = [(corner - target).dot(right) for corner in corners]
    ys = [(corner - target).dot(up) for corner in corners]
    projected_width = max(xs) - min(xs)
    projected_height = max(ys) - min(ys)
    minimum_scale, maximum_scale = (18.0, 20.0) if is_lab else (14.0, 16.0)
    required_scale = max(projected_width, projected_height) * 1.17
    scale = max(minimum_scale, min(maximum_scale, required_scale))
    # Future architectural additions must not be silently cropped.
    if required_scale > maximum_scale:
        scale = required_scale
        print("DETAIL_FRAME_EXPANDED", root.name, round(scale, 3), flush=True)
    camera.data.ortho_scale = scale
    # Optical shifts centre the visible architecture while preserving the exact
    # requested relative camera position and its Z=2.5 look-at point.
    camera.data.shift_x = (max(xs) + min(xs)) / (2 * scale)
    camera.data.shift_y = (max(ys) + min(ys)) / (2 * scale) + 0.015

    floor = studio["floor"]
    # The updated pavilions have foundations deliberately buried in the village
    # terrain. Do not expose that underground geometry by lowering the studio
    # floor to the foundation's deepest vertex; use the actual site ground level.
    floor.location = (origin.x, origin.y, origin.z - 0.08)
    studio["fill"].location = origin + Vector((3, -9, 12))
    studio["fill"].rotation_euler = (target - studio["fill"].location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.view_layer.update()
    print("DETAIL_FRAME", root.name, "ortho", round(scale, 3),
          "projected", [round(projected_width, 3), round(projected_height, 3)],
          "ground", round(floor.location.z, 3), flush=True)


def main(argv=None):
    args = _arguments(argv)
    scene = bpy.context.scene
    roots = {root_id: bpy.data.objects.get(root_id) for root_id in ROOT_IDS}
    missing = [root_id for root_id, root in roots.items() if root is None]
    if missing:
        raise RuntimeError("Open editable fen-kesif-koyu.blend first; missing roots: " + ", ".join(missing))
    environment = bpy.data.objects.get("environment")
    ocean = bpy.data.objects.get("OCEAN_RENDER_ONLY")
    if environment is None:
        raise RuntimeError("Editable source scene must contain environment.")
    selected = [(label, root_id) for label, root_id in BUILDINGS
                if args.only is None or label in args.only]

    # Runtime settings and visibility are restored even on a failed render. The
    # editable model file is never saved or overwritten by this script.
    render = scene.render
    original = {
        "visibility": [(obj, obj.hide_render) for obj in scene.objects],
        "camera": scene.camera, "world": scene.world,
        "engine": render.engine, "filepath": render.filepath,
        "resolution_x": render.resolution_x, "resolution_y": render.resolution_y,
        "resolution_percentage": render.resolution_percentage,
        "film_transparent": render.film_transparent,
        "use_border": render.use_border,
        "file_format": render.image_settings.file_format,
        "color_mode": render.image_settings.color_mode,
        "color_depth": render.image_settings.color_depth,
        "compression": render.image_settings.compression,
        "samples": scene.cycles.samples,
        "use_denoising": scene.cycles.use_denoising,
        "device": scene.cycles.device,
    }
    studio = None
    completed = []
    try:
        for root in roots.values():
            _visible_tree(root, False)
        _visible_tree(environment, False)
        if ocean is not None:_visible_tree(ocean, False)
        for obj in scene.objects:
            if obj.get('atmosphere_render_only') or obj.name.startswith('ATMOSFER'):
                _visible_tree(obj, False)
        for obj in scene.objects:
            if obj.type in {"CAMERA", "LIGHT"}:
                obj.hide_render = False

        studio = _new_studio(scene)
        render.engine = "CYCLES"
        scene.cycles.samples = 48
        scene.cycles.use_denoising = True
        _configure_gpu(scene)
        render.resolution_x = 1000
        render.resolution_y = 1000
        render.resolution_percentage = 100
        render.film_transparent = False
        render.use_border = False
        render.image_settings.file_format = "PNG"
        render.image_settings.color_mode = "RGB"
        render.image_settings.color_depth = "8"
        render.image_settings.compression = 25
        if not args.dry_run:
            OUTPUT.mkdir(parents=True, exist_ok=True)

        active_root = None
        for label, root_id in selected:
            if active_root is not None:
                _visible_tree(active_root, False)
            active_root = roots[root_id]
            _visible_tree(active_root, True)
            # These two generic corner pots were village landscape accessories,
            # positioned for the previous outer terrace. Keep the isolated
            # architectural portrait free of those disconnected edge objects;
            # purpose-built planters belonging to each pavilion remain visible.
            for obj in _descendants(active_root):
                if obj.name.startswith("Bitki · "):
                    obj.hide_render = True
            _frame_model(studio, active_root, label == "lab")
            destination = OUTPUT / ("detay-%s.png" % label)
            render.filepath = str(destination)
            print("DETAIL_BEGIN", label, str(destination), flush=True)
            if not args.dry_run:
                bpy.ops.render.render(write_still=True)
                if not destination.is_file() or destination.stat().st_size == 0:
                    raise RuntimeError("Render output is missing or empty: " + str(destination))
            completed.append(label)
            print("DETAIL_READY" if not args.dry_run else "DETAIL_VALIDATED", label, flush=True)
        print("DETAIL_COMPLETE", ",".join(completed), flush=True)
    finally:
        scene.camera = original["camera"]
        scene.world = original["world"]
        for obj, hidden in original["visibility"]:
            obj.hide_render = hidden
        for key in ("engine", "filepath", "resolution_x", "resolution_y", "resolution_percentage",
                    "film_transparent", "use_border"):
            setattr(render, key, original[key])
        for key in ("file_format", "color_mode", "color_depth", "compression"):
            setattr(render.image_settings, key, original[key])
        scene.cycles.samples = original["samples"]
        scene.cycles.use_denoising = original["use_denoising"]
        scene.cycles.device = original["device"]
        if studio is not None:
            for obj in list(studio["collection"].objects):
                bpy.data.objects.remove(obj, do_unlink=True)
            bpy.data.collections.remove(studio["collection"])
            bpy.data.worlds.remove(studio["world"])
            bpy.data.materials.remove(studio["material"])
            for datablock in studio["data"]:
                if isinstance(datablock, bpy.types.Camera):
                    bpy.data.cameras.remove(datablock)
                elif isinstance(datablock, bpy.types.Mesh):
                    bpy.data.meshes.remove(datablock)
                elif isinstance(datablock, bpy.types.Light):
                    bpy.data.lights.remove(datablock)


if __name__ == "__main__":
    main()
