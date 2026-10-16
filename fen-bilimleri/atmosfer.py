"""Restrained, render-only mountain atmosphere for the Blender village poster.

The clouds are real Cycles volumes in just seventeen eight-vertex containers.
Their Gaussian/ellipsoid density fades to zero before the container boundaries.
No architectural geometry, camera, lighting, world, or export root is changed.
"""

from math import radians
import bpy


_COLLECTION = "ATMOSFER_RENDER_ONLY"


def _math(nodes, operation, name, value=None):
    node = nodes.new("ShaderNodeMath")
    node.operation = operation
    node.name = name
    node.label = name
    if value is not None:
        node.inputs[1].default_value = value
    return node


def _volume_material(name, density, noise_scale):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (0.76, 0.84, 0.87, 1)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    volume = nodes.new("ShaderNodeVolumePrincipled")
    volume.name = "Daylight scattering — no surface shell"
    volume.inputs["Color"].default_value = (0.79, 0.85, 0.88, 1)
    volume.inputs["Anisotropy"].default_value = 0.16
    links.new(volume.outputs["Volume"], output.inputs["Volume"])

    coordinates = nodes.new("ShaderNodeTexCoord")
    center = nodes.new("ShaderNodeVectorMath")
    center.operation = "SUBTRACT"
    center.inputs[1].default_value = (0.5, 0.5, 0.5)
    links.new(coordinates.outputs["Generated"], center.inputs[0])
    normalized = nodes.new("ShaderNodeVectorMath")
    normalized.operation = "SCALE"
    normalized.inputs[3].default_value = 2.0
    links.new(center.outputs["Vector"], normalized.inputs[0])
    squared_radius = nodes.new("ShaderNodeVectorMath")
    squared_radius.operation = "DOT_PRODUCT"
    links.new(normalized.outputs["Vector"], squared_radius.inputs[0])
    links.new(normalized.outputs["Vector"], squared_radius.inputs[1])

    # exp(-3*r^2) supplies a soft Gaussian core. The polynomial edge mask makes
    # the very last density exactly zero, eliminating a rectangular volume edge.
    exponent = _math(nodes, "MULTIPLY", "Gaussian exponent", -3.0)
    links.new(squared_radius.outputs["Value"], exponent.inputs[0])
    gaussian = _math(nodes, "EXPONENT", "Gaussian density")
    links.new(exponent.outputs[0], gaussian.inputs[0])
    edge = _math(nodes, "SUBTRACT", "Ellipsoid boundary")
    edge.inputs[0].default_value = 1.0
    links.new(squared_radius.outputs["Value"], edge.inputs[1])
    clamp = _math(nodes, "MAXIMUM", "Fade before the bounding box", 0.0)
    links.new(edge.outputs[0], clamp.inputs[0])
    shape = _math(nodes, "MULTIPLY", "Soft finite cloud")
    links.new(gaussian.outputs[0], shape.inputs[0])
    links.new(clamp.outputs[0], shape.inputs[1])

    noise = nodes.new("ShaderNodeTexNoise")
    noise.name = "Broad wisps, no granular smoke"
    noise.noise_dimensions = "3D"
    noise.inputs["Scale"].default_value = noise_scale
    noise.inputs["Detail"].default_value = 1.5
    noise.inputs["Roughness"].default_value = 0.52
    links.new(coordinates.outputs["Generated"], noise.inputs["Vector"])
    modulation = _math(nodes, "MULTIPLY_ADD", "Subtle billow modulation")
    modulation.inputs[1].default_value = 0.70
    modulation.inputs[2].default_value = 0.28
    links.new(noise.outputs["Fac"], modulation.inputs[0])
    billows = _math(nodes, "MULTIPLY", "Wispy ellipsoid")
    links.new(shape.outputs[0], billows.inputs[0])
    links.new(modulation.outputs[0], billows.inputs[1])
    strength = _math(nodes, "MULTIPLY", "Low-density atmosphere", density)
    links.new(billows.outputs[0], strength.inputs[0])
    links.new(strength.outputs[0], volume.inputs["Density"])
    # Spatially broad wisps need no tiny volume steps. These per-material settings
    # leave the user's global render quality and sample count untouched.
    mat.cycles.volume_step_rate = 3.0
    mat.cycles.volume_interpolation = "LINEAR"
    mat.cycles.homogeneous_volume = False
    mat.cycles.volume_sampling = "MULTIPLE_IMPORTANCE"
    return mat


def _cloud(collection, name, center, dimensions, angle, material):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(
        [(-0.5, -0.5, -0.5), (-0.5, -0.5, 0.5),
         (-0.5, 0.5, -0.5), (-0.5, 0.5, 0.5),
         (0.5, -0.5, -0.5), (0.5, -0.5, 0.5),
         (0.5, 0.5, -0.5), (0.5, 0.5, 0.5)], [],
        [(0, 4, 6, 2), (1, 3, 7, 5), (0, 1, 5, 4),
         (2, 6, 7, 3), (0, 2, 3, 1), (4, 5, 7, 6)])
    mesh.update()
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.location = center
    obj.scale = dimensions
    obj.rotation_euler.z = angle
    # Direct collection membership, no parent: this is outside all exported roots.
    obj.hide_select = True
    obj.display_type = "WIRE"
    obj["render_only"] = True
    obj["atmosphere_render_only"] = True
    obj["atmosphere"] = "soft volume, not solid cloud geometry"
    return obj


def generate():
    """Create subtle edge clouds and seven wisps well below the canyon bridges."""
    # Idempotent for an artist rerunning the helper in an already open .blend.
    previous = bpy.data.collections.get(_COLLECTION)
    if previous is not None:
        for obj in list(previous.objects):
            data = obj.data
            bpy.data.objects.remove(obj, do_unlink=True)
            if data is not None and data.users == 0:
                bpy.data.meshes.remove(data)
        bpy.data.collections.remove(previous)
    collection = bpy.data.collections.new(_COLLECTION)
    bpy.context.scene.collection.children.link(collection)
    collection["render_only"] = True
    collection["atmosphere_render_only"] = True
    border = _volume_material("Atmosfer · uzak kenar bulutları", 0.068, 3.1)
    valley = _volume_material("Atmosfer · ince vadi sisi", 0.029, 3.8)

    # A broken peripheral border rather than a continuous opaque ring. All clear
    # walking routes and buildings are inside this distant envelope.
    peripheral = [
        ((-43, -23, 3.0), (15, 10, 6.0), -8),
        ((-44, 3, 4.0), (15, 14, 7.0), 12),
        ((-37, 31, 6.5), (20, 9, 5.0), -12),
        ((-11, 41, 7.2), (23, 10, 5.0), 7),
        ((21, 40, 8.0), (22, 10, 6.0), -9),
        ((44, 27, 5.0), (13, 15, 6.0), 15),
        ((45, 0, 2.8), (12, 18, 5.0), -6),
        ((39, -25, 2.0), (17, 10, 4.0), 11),
        ((13, -43, 1.4), (23, 7, 3.8), -5),
        ((-21, -41, 1.6), (20, 8, 4.0), 8),
    ]
    for i, (center, dimensions, angle) in enumerate(peripheral):
        _cloud(collection, "ATMOSFER_RENDER_ONLY · edge %02d" % i,
               center, dimensions, radians(angle), border)

    # Local cloud tops remain below -2.2 m. Buildings start around +0.8 m and the
    # bridges' bottom arches stay above -1 m, so these wisps cannot cloak them.
    wisps = [
        ((-8.3, 24, -3.5), (1.7, 9.0, 2.4), -10.5),
        ((-9.5, 8, -4.1), (1.8, 8.0, 2.5), 5),
        ((-9.0, -4, -4.2), (3.5, 4.5, 2.7), -23),
        ((-15.5, -18, -3.8), (1.7, 9.0, 2.5), -3),
        ((-19.5, -35, -3.6), (2.0, 9.0, 2.3), -25),
        ((9.0, -9, -3.9), (11.0, 2.0, 2.4), -7),
        ((28.0, -12.5, -4.1), (9.0, 2.0, 2.5), -14),
    ]
    for i, (center, dimensions, angle) in enumerate(wisps):
        _cloud(collection, "ATMOSFER_RENDER_ONLY · valley %02d" % i,
               center, dimensions, radians(angle), valley)
    print("ATMOSPHERE_READY", len(collection.objects), "unparented volume containers", flush=True)
    return collection
