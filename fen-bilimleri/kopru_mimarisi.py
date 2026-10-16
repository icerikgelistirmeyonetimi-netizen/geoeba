"""Crafted Alpine bridges. Endpoints are XY pairs at a Z=0.8 village path level."""

from math import sin, cos, pi, atan, atan2, ceil, sqrt
from mathutils import Vector, Euler
import fen_ortak as A
from dag_arazisi import height as terrain_height
from dag_dekorlari import _At, kopru_feneri


def _ribbon(at, name, points, width, height, material):
    """Smooth rectangular glulam beam swept along an X/Z curve, width along Y."""
    vertices = []
    for x, y, z in points:
        vertices.extend([(x, y - width / 2, z - height / 2),
                         (x, y + width / 2, z - height / 2),
                         (x, y + width / 2, z + height / 2),
                         (x, y - width / 2, z + height / 2)])
    faces = [(3, 2, 1, 0)]
    for i in range(len(points) - 1):
        for j in range(4):
            faces.append((i * 4 + j, i * 4 + (j + 1) % 4,
                          (i + 1) * 4 + (j + 1) % 4, (i + 1) * 4 + j))
    faces.append(tuple((len(points) - 1) * 4 + j for j in range(4)))
    return at.mesh(name, vertices, faces, material)


def _fast_bolt(at, name, center, radius=0.015, side=False):
    obj = A.cone(name, at.point(center), radius, radius, 0.018,
                 at.mat["hoof" if not side else "bronze"], vertices=10)
    obj.rotation_euler = (at.rot @ Euler((pi / 2 if side else 0, 0, 0), "XYZ").to_quaternion()).to_euler()
    return obj


def _gusset(at, name, x, y, z, side):
    yy = y + side * 0.105
    outline = [(-0.14, -0.08), (-0.07, -0.16), (0.07, -0.16),
               (0.14, -0.08), (0.14, 0.08), (0.07, 0.16),
               (-0.07, 0.16), (-0.14, 0.08)]
    vertices = [(x + dx, yy + depth, z + dz)
                for depth in (-0.014, 0.014) for dx, dz in outline]
    faces = [tuple(reversed(range(8))), tuple(range(8, 16))]
    faces.extend((i, (i + 1) % 8, (i + 1) % 8 + 8, i + 8) for i in range(8))
    at.mesh(name + " · sekizgen birleşim levhası", vertices, faces, "bronze")
    for dx in (-0.078, 0.078):
        for dz in (-0.090, 0.090):
            _fast_bolt(at, name + " · perçin", (x + dx, yy + side * 0.024, z + dz), 0.018, True)


def _portal_emblem(at, name, x, z, leaf=False):
    # A vertical circular plaque faces the direction of travel along the bridge.
    disk = A.cone(name + " · oyma madalyon", at.point((x, 0, z)),
                  0.219, 0.219, 0.045, at.mat["timber"], vertices=32)
    disk.rotation_euler = (at.rot @ Euler((0, pi / 2, 0), "XYZ").to_quaternion()).to_euler()
    face = x + (-0.030 if x < 0 else 0.030)
    border = [(face, 0.207 * cos(2 * pi * i / 40), z + 0.207 * sin(2 * pi * i / 40))
              for i in range(40)]
    at.line(name + " · pirinç kakma bordür", border, 0.012, "bronze", True)
    if leaf:
        at.line(name + " · yaprak kakma", [(face, -0.100, z - 0.116),
                                          (face, -0.120, z + 0.019),
                                          (face, -0.047, z + 0.133),
                                          (face, 0.080, z + 0.120),
                                          (face, 0.115, z - 0.005),
                                          (face, 0.033, z - 0.102),
                                          (face, -0.100, z - 0.116)], 0.013, "bronze")
        at.line(name + " · yaprak damarı", [(face, -0.100, z - 0.116),
                                           (face, 0.080, z + 0.120)], 0.010, "bronze")
    else:
        for rotation in (0, pi / 3, 2 * pi / 3):
            points = []
            for i in range(32):
                t = 2 * pi * i / 32
                y, zz = 0.150 * cos(t), 0.058 * sin(t)
                points.append((face, y * cos(rotation) - zz * sin(rotation),
                               z + y * sin(rotation) + zz * cos(rotation)))
            at.line(name + " · atom kakması", points, 0.008, "bronze", True)
        at.sphere(name + " · atom merkezi", (face, 0, z), (0.018, 0.026, 0.026), "bronze")


def bridge(name, start, end, width=2.2, style="arch"):
    """Make a complete detailed bridge, parented directly to the current A.ROOT.

    start/end: two world XY coordinates. style: arch, covered, or suspension.
    Deck rises 0.7 m gently at its centre; 2.2 m of clear walking width by default.
    """
    if style not in {"arch", "covered", "suspension"}:
        raise ValueError("Unknown bridge style: " + style)
    dx, dy = end[0] - start[0], end[1] - start[1]
    length = sqrt(dx * dx + dy * dy)
    if length < 2 or width <= 0:
        raise ValueError("Bridge endpoints must be at least two metres apart, with positive width")
    at = _At((start[0] + end[0]) / 2, (start[1] + end[1]) / 2,
             0.8, atan2(dy, dx))
    half = length / 2
    p = name + " · "

    def deck(u):
        return 0.075 + 0.70 * sin(pi * u)

    def coordinate(u):
        return -half + length * u

    def upper_arch(u):
        return 0.235 + 3.07 * sin(pi * u) ** 0.80

    def lower_arch(u):
        return -1.48 + 1.72 * sin(pi * u)

    # Stone seats are partly embedded in the cliff. Separate cap stones, course
    # joints and small bronze foot plates make the landings feel constructed.
    for end_sign in (-1, 1):
        xx = end_sign * half
        # Foundations reach the actual sloping rock, including the outer corners.
        samples = [at.point((xx + dx, yy, 0)) for dx in (-.55, 0, .55)
                   for yy in (-width / 2 - .62, 0, width / 2 + .62)]
        foot = min(terrain_height(v[0], v[1]) for v in samples) - .8 - .35
        if foot < -1.38:
            depth = -1.1 - foot
            at.cube(p + "kayaya gömülen temel", (xx, 0, foot + depth / 2),
                    (1.06, width + 1.22, depth), "horn", .09)
        at.cube(p + "taş mesnet", (xx, 0, -0.645), (0.93, width + 1.18, 1.47), "horn", 0.11)
        at.cube(p + "mesnet baş taşı", (xx, 0, 0.089), (1.13, width + 1.33, 0.22), "fur_light", 0.055)
        for zz in (-1.05, -0.60, -0.18):
            at.cube(p + "mesnet taş derzi", (xx, 0, zz), (0.949, width + 1.199, 0.018), "fur_dark", 0.003)
        for side in (-1, 1):
            at.cube(p + "ankraj levhası", (xx, side * (width / 2 + 0.29), 0.222),
                    (0.41, 0.34, 0.065), "bronze", 0.028)

    # Every cross-grain oak plank follows the local deck slope, with four little
    # dark fixings. There is a genuine narrow seam between neighbouring boards.
    plank_count = max(18, int(ceil(length / 0.255)))
    step = length / plank_count
    for i in range(plank_count):
        u = (i + 0.5) / plank_count
        xx, zz = coordinate(u), deck(u)
        slope = 0.70 * pi / length * cos(pi * u)
        at.cube(p + "meşe tabliye %02d" % i, (xx, 0, zz),
                (step - 0.015, width, 0.105), "timber" if i % 4 else "rope", 0.014,
                rotation=(0, -atan(slope), 0))
        for side in (-1, 1):
            for shift in (-0.069, 0.069):
                _fast_bolt(at, p + "tabliye civatası", (xx + shift, side * (width / 2 - 0.13),
                                                        zz + 0.057 + shift * slope), 0.012)

    samples = 64
    for side in (-1, 1):
        # Two load-bearing arches under the deck spring from the stone seats.
        yy = side * (width / 2 - 0.09)
        points = [(coordinate(i / samples), yy, lower_arch(i / samples)) for i in range(samples + 1)]
        _ribbon(at, p + "alt taşıyıcı kemer", points, 0.20, 0.225, "timber")
        at.line(p + "alt kemer pirinç dikişi", [(x, y + side * 0.104, z) for x, y, z in points],
                0.017, "bronze")
        for i in range(13):
            u = i / 12
            at.bar(p + "tabliye dikmesi", (coordinate(u), yy, lower_arch(u) + 0.10),
                   (coordinate(u), yy, deck(u) - 0.06), 0.043, "timber")
            if i < 12:
                v = (i + 1) / 12
                at.bar(p + "kemer üçgen payandası", (coordinate(u), yy, lower_arch(u) + 0.08),
                       (coordinate(v), yy, deck(v) - 0.075), 0.026, "bronze")

        rail_y = side * (width / 2 + 0.044)
        for rise, thick, material in ((1.08, 0.063, "timber"), (0.255, 0.029, "bronze")):
            at.line(p + "kesintisiz el küpeştesi", [(coordinate(i / samples), rail_y,
                                                    deck(i / samples) + rise) for i in range(samples + 1)],
                    thick, material)
        bays = max(8, int(ceil(length / 0.82)))
        for i in range(bays + 1):
            u = i / bays
            at.bar(p + "korkuluk dikmesi", (coordinate(u), rail_y, deck(u) + 0.03),
                   (coordinate(u), rail_y, deck(u) + 1.08), 0.034, "timber")
            at.sphere(p + "korkuluk pirinç başlık", (coordinate(u), rail_y, deck(u) + 1.09),
                      (0.049, 0.049, 0.033), "bronze")
            if i < bays:
                v = (i + 1) / bays
                at.bar(p + "baklava kafes yükselen", (coordinate(u), rail_y, deck(u) + 0.32),
                       (coordinate(v), rail_y, deck(v) + 0.97), 0.014, "bronze")
                at.bar(p + "baklava kafes alçalan", (coordinate(u), rail_y, deck(u) + 0.97),
                       (coordinate(v), rail_y, deck(v) + 0.32), 0.014, "bronze")

        # The main bridge has paired laminated, curved ribs beside the path.
        arch_y = side * (width / 2 + 0.31)
        if style == "arch":
            curve = [(coordinate(i / samples), arch_y, upper_arch(i / samples)) for i in range(samples + 1)]
            _ribbon(at, p + "lamine meşe üst kemer", curve, 0.19, 0.25, "timber")
            for offset in (-0.079, 0.079):
                at.line(p + "lamine kemer kakma çizgisi", [(x, y + side * 0.103, z + offset)
                                                          for x, y, z in curve], 0.012, "bronze")
            for i in range(1, 10):
                u = i / 10
                at.bar(p + "ince pirinç askı", (coordinate(u), arch_y, deck(u) + 0.10),
                       (coordinate(u), arch_y, upper_arch(u) - 0.10), 0.022, "bronze")
                _gusset(at, p + "kemer eki", coordinate(u), arch_y, upper_arch(u), side)
        elif style == "suspension":
            curve = [(coordinate(i / samples), arch_y,
                      3.55 - 1.65 * sin(pi * i / samples)) for i in range(samples + 1)]
            at.line(p + "ana asma halatı", curve, 0.053, "rope")
            at.line(p + "çift emniyet halatı", [(x, y + side * 0.09, z + 0.09) for x, y, z in curve],
                    0.027, "bronze")
            for i in range(1, 14):
                u = i / 14
                at.bar(p + "asma düşey gergisi", (coordinate(u), arch_y, deck(u) + 0.08),
                       (coordinate(u), arch_y, 3.55 - 1.65 * sin(pi * u)), 0.016, "bronze")

    # At each end a carved timber gateway carries a small atom or leaf medallion.
    portal_z = 3.55 if style == "suspension" else 2.37
    portal_y = width / 2 + 0.32
    for endpoint in (-1, 1):
        xx = endpoint * half
        for side in (-1, 1):
            at.cube(p + "oymalı portal ayağı", (xx, side * portal_y, portal_z / 2 + 0.16),
                    (0.16, 0.18, portal_z), "timber", 0.022)
            at.cube(p + "portal bileziği", (xx, side * portal_y, 0.45),
                    (0.19, 0.21, 0.10), "bronze", 0.012)
            at.bar(p + "portal köşe desteği", (xx, side * portal_y, portal_z - 0.35),
                   (xx, side * (portal_y - 0.42), portal_z + 0.10), 0.040, "timber")
        pts = [(xx, -portal_y + 2 * portal_y * i / 32,
                portal_z + 0.12 + 0.23 * sin(pi * i / 32)) for i in range(33)]
        at.line(p + "portal kavisli başlık", pts, 0.071, "timber")
        at.line(p + "portal pirinç saçak", [(x, y, z + 0.075) for x, y, z in pts],
                0.015, "bronze")
        _portal_emblem(at, p + "portal", xx, portal_z + 0.33, leaf=endpoint == 1)

    if style == "covered":
        # A transparent barrel-vaulted canopy: the walkway and canyon remain
        # visible between fine transverse oak ribs and longitudinal copper seams.
        span_y = width / 2 + 0.30
        roof_steps, cross_steps = 24, 20

        def roof_point(u, v):
            return (coordinate(u), span_y * cos(pi * v),
                    deck(u) + 2.14 + 0.80 * sin(pi * v))

        vertices = [at.point(roof_point(i / roof_steps, j / cross_steps))
                    for i in range(roof_steps + 1) for j in range(cross_steps + 1)]
        faces = []
        for i in range(roof_steps):
            for j in range(cross_steps):
                a = i * (cross_steps + 1) + j
                faces.append((a, a + 1, a + cross_steps + 2, a + cross_steps + 1))
        roof = A.mesh(p + "şeffaf tonoz camı", vertices, faces, A.M["glass"])
        for face in roof.data.polygons:
            face.use_smooth = True
        frames = max(7, int(ceil(length / 1.1)))
        for i in range(frames + 1):
            u = i / frames
            at.line(p + "tonoz meşe kaburgası", [roof_point(u, j / 28) for j in range(29)],
                    0.043, "timber")
            for side in (-1, 1):
                at.bar(p + "tonoz sütunu", (coordinate(u), side * span_y, deck(u) + 0.06),
                       (coordinate(u), side * span_y, deck(u) + 2.14), 0.045, "timber")
                at.bar(p + "tonoz köşe örgüsü", (coordinate(u), side * span_y, deck(u) + 1.65),
                       (coordinate(u), side * (span_y - 0.32), deck(u) + 2.62), 0.023, "bronze")
        for v in (0, 0.22, 0.5, 0.78, 1):
            at.line(p + "tonoz boyuna pirinç kayıt", [roof_point(i / samples, v) for i in range(samples + 1)],
                    0.018 if v not in (0, 1) else 0.030, "bronze")

    # Two lanterns mark opposite ends, outside the clear walking lane.
    for endpoint in (-1, 1):
        world = at.point((endpoint * (half + 0.35), endpoint * (width / 2 + 0.66), 0.02))
        kopru_feneri(world.x, world.y, world.z)
