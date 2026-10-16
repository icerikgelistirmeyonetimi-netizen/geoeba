"""Fen Keşif Köyü: atom enstitüsü, biyosfer ve ortak keşif laboratuvarı.

All architecture is modelled about a local origin, Z up, entrance towards -Y.
Science motifs are explanatory sculptures, not scale representations.
"""

from math import cos, sin, pi, radians
import bpy
from mathutils import Vector
import fen_ortak as A
from yapilar_temel import _ground_path, _settle_new


def _m(key):
    return A.M[key]


def _box(name, at, size, material="cream", bevel=0.035):
    return A.cube(name, at, size, _m(material), bevel=bevel)


def _rod(name, a, b, radius=0.025, material="brass"):
    return A.bar(name, a, b, radius, _m(material))


def _line(name, points, radius=0.025, material="brass", cyclic=False):
    return A.tube(name, points, radius, _m(material), cyclic=cyclic)


def _ring(name, center, rx, ry, z, width, height, material, segments=64):
    """An elliptical solid roof/parapet ring with a genuinely open centre."""
    cx, cy = center
    vertices = []
    for elevation in (z - height / 2, z + height / 2):
        for inset in (0, width):
            for i in range(segments):
                t = 2 * pi * i / segments
                vertices.append((cx + (rx - inset) * cos(t),
                                 cy + (ry - inset) * sin(t), elevation))
    faces = []
    for i in range(segments):
        j = (i + 1) % segments
        faces.extend([(i, j, segments + j, segments + i),
                      (2 * segments + i, 3 * segments + i,
                       3 * segments + j, 2 * segments + j),
                      (i, 2 * segments + i, 2 * segments + j, j),
                      (segments + i, segments + j, 3 * segments + j,
                       3 * segments + i)])
    return A.mesh(name, vertices, [tuple(reversed(face)) for face in faces], _m(material))


def _arc_band(name, center, rx, ry, start, stop, width, z, depth,
              material="cream", segments=48):
    """A roof or floor ribbon, used to leave the laboratory courtyard open."""
    cx, cy = center
    vertices = []
    for height in (z - depth / 2, z + depth / 2):
        for inset in (0, width):
            for i in range(segments + 1):
                t = start + (stop - start) * i / segments
                vertices.append((cx + (rx - inset) * cos(t),
                                 cy + (ry - inset) * sin(t), height))
    stride = segments + 1
    faces = []
    for i in range(segments):
        j = i + 1
        faces.extend([(i, j, stride + j, stride + i),
                      (2 * stride + i, 3 * stride + i,
                       3 * stride + j, 2 * stride + j),
                      (i, 2 * stride + i, 2 * stride + j, j),
                      (stride + i, stride + j, 3 * stride + j,
                       3 * stride + i)])
    faces.extend([(0, stride, 3 * stride, 2 * stride),
                  (segments, 2 * stride + segments,
                   3 * stride + segments, stride + segments)])
    return A.mesh(name, vertices, [tuple(reversed(face)) for face in faces], _m(material))


def _steps(name, cx, front_y, width, top_z=0.54, n=4):
    for i in range(n):
        h = top_z * (i + 1) / n
        _box(name + "_%02d" % i,
             (cx, front_y + i * 0.19, h / 2),
             (width, 0.29, h), "stone", 0.018)


def _planter(name, x, y, sx, sy, z, foliage="leaf", flowers=None):
    _box(name + "_sandik", (x, y, z), (sx, sy, 0.2), "cream", 0.08)
    _box(name + "_toprak", (x, y, z + 0.11),
         (sx - 0.12, sy - 0.12, 0.045), "soil", 0.025)
    for i in range(5):
        px = x + (i - 2) * (sx - 0.34) / 5
        py = y + (0.065 if i % 2 else -0.04)
        A.sphere(name + "_yesil_%d" % i, (px, py, z + 0.26),
                 (0.18, max(0.15, sy * 0.35), 0.20), _m(foliage))
        if flowers and i % 2 == 0:
            A.sphere(name + "_cicek_%d" % i, (px, py - 0.08, z + 0.41),
                     (0.065, 0.065, 0.065), _m(flowers))


def _dome_ribs(name, cx, cy, z, radius, height, material="brass", ribs=12):
    for i in range(ribs):
        angle = 2 * pi * i / ribs
        pts = []
        for j in range(19):
            a = pi * j / 36
            pts.append((cx + radius * cos(a) * cos(angle),
                        cy + radius * cos(a) * sin(angle), z + height * sin(a)))
        _line(name + "_kaburga_%02d" % i, pts, 0.026, material)
    for fraction in (0.30, 0.66):
        a = pi * fraction / 2
        pts = [(cx + radius * cos(a) * cos(2 * pi * j / 64),
                cy + radius * cos(a) * sin(2 * pi * j / 64),
                z + height * sin(a)) for j in range(64)]
        _line(name + "_enlem_" + str(fraction), pts, 0.019, material, True)


def _glazed_circle(name, cx, cy, radius, base, height, count=24):
    """Individual panes keep the finely framed rotunda legible from a distance."""
    for i in range(count):
        t1 = 2 * pi * i / count
        t2 = 2 * pi * (i + 1) / count
        x1, y1 = cx + radius * cos(t1), cy + radius * sin(t1)
        x2, y2 = cx + radius * cos(t2), cy + radius * sin(t2)
        A.mesh(name + "_cam_%02d" % i,
               [(x1, y1, base), (x2, y2, base),
                (x2, y2, base + height), (x1, y1, base + height)],
               [(0, 1, 2, 3)], _m("glass"))
        _rod(name + "_kayit_%02d" % i, (x1, y1, base),
             (x1, y1, base + height), 0.032, "brass")
    for zz in (base + 0.14, base + height * 0.64, base + height):
        pts = [(cx + radius * cos(2 * pi * j / 64),
                cy + radius * sin(2 * pi * j / 64), zz) for j in range(64)]
        _line(name + "_yatay_" + str(zz), pts, 0.026, "cream", True)


def _bench(name, x, y, z=0.60, width=1.75, direction=0):
    top = _box(name + "_tabla", (x, y, z + 0.64),
               (width, 0.76, 0.11), "stone", 0.06)
    top.rotation_euler[2] = direction
    for dx in (-width * 0.34, width * 0.34):
        px, py = x + dx * cos(direction), y + dx * sin(direction)
        leg = _box(name + "_ayak_" + str(dx), (px, py, z + 0.30),
                  (0.13, 0.60, 0.60), "teal", 0.025)
        leg.rotation_euler[2] = direction
    return z + 0.705


def _flask(name, x, y, z, size=1.0, liquid="blue"):
    # Small sealed exhibit flask: broad conical body and narrow cylindrical neck.
    A.cone(name + "_cam", (x, y, z + 0.23 * size),
           0.21 * size, 0.075 * size, 0.44 * size, _m("glass"), vertices=32)
    A.cone(name + "_sivi", (x, y, z + 0.11 * size),
           0.17 * size, 0.115 * size, 0.19 * size, _m(liquid), vertices=32)
    A.cyl(name + "_boyun", (x, y, z + 0.51 * size),
          0.077 * size, 0.20 * size, _m("glass"), vertices=24)
    A.cyl(name + "_agiz", (x, y, z + 0.62 * size),
          0.095 * size, 0.042 * size, _m("cream"), vertices=24)


def build_7():
    """Atom ve Enerji Enstitüsü: orbital crown, optical prism, luminous wings."""
    before = set(bpy.data.objects)
    p = "Y7_"
    cx, cy = -0.75, 0.36
    # Each footing follows its building; no presentation slab joins the wings.
    A.cyl(p + "rotunda_taban", (cx, cy, 0.64), 1.76, 0.43, _m("foundation"))
    _glazed_circle(p + "rotunda", cx, cy, 1.64, 0.84, 2.65, 24)
    # A quiet, opaque laboratory core supplies depth behind the transparent facade.
    A.cyl(p + "ic_cekirdek", (cx, cy + 0.36, 1.83),
          0.64, 2.05, _m("teal"), vertices=48)
    for i in range(8):
        t = 2 * pi * i / 8
        _rod(p + "dis_paye_%d" % i,
             (cx + 1.73 * cos(t), cy + 1.73 * sin(t), 0.78),
             (cx + 1.73 * cos(t), cy + 1.73 * sin(t), 3.49), 0.055, "cream")
    A.cyl(p + "taç_doseme", (cx, cy, 3.55), 1.84, 0.19, _m("cream"))
    _ring(p + "bronz_sacak", (cx, cy), 1.83, 1.83,
          3.69, 0.09, 0.075, "brass")
    A.cyl(p + "yesil_teras", (cx, cy, 3.69), 1.68, 0.08, _m("grass"))
    A.cyl(p + "atom_kürsü", (cx, cy, 3.98), 0.56, 0.51, _m("stone"))
    A.cyl(p + "atom_kürsü_bilezik", (cx, cy, 4.22), 0.64, 0.085, _m("brass"))

    # Three intersecting orbital ellipses are a symbolic atom model.
    oz = 5.58
    atom_once = set(bpy.data.objects)
    for i, turn in enumerate((0, 2 * pi / 3, 4 * pi / 3)):
        pts = []
        for j in range(97):
            t = 2 * pi * j / 96
            horizontal, vertical = 1.48 * cos(t), 1.52 * sin(t)
            pts.append((cx + horizontal * cos(turn),
                        cy + horizontal * sin(turn), oz + vertical))
        _line(p + "atom_yorunge_%d" % i, pts, 0.049,
              "brass" if i != 1 else "terracotta")
        t = (0.28, 2.22, 4.15)[i]
        A.sphere(p + "elektron_%d" % i,
                 (cx + 1.48 * cos(t) * cos(turn),
                  cy + 1.48 * cos(t) * sin(turn), oz + 1.52 * sin(t)),
                 (0.15, 0.15, 0.15), _m("blue"))
    for i, (dx, dy, dz, material) in enumerate([
            (-0.17, -0.12, 0.04, "coral"), (0.15, -0.14, -0.04, "yellow"),
            (0.03, 0.12, 0.20, "coral"), (-0.10, 0.13, -0.15, "yellow"),
            (0.17, 0.11, -0.10, "coral")]):
        A.sphere(p + "cekirdek_%d" % i, (cx + dx, cy + dy, oz + dz),
                 (0.22, 0.22, 0.22), _m(material))
    # Atom modeli (yörüngeler, elektronlar, çekirdek) düşey eksende döner (web: üzerine gelince).
    A.donen_grup("grade_7_atom", (cx, cy, oz), atom_once)

    # West wing: an intimate lens gallery with a bronze pergola and clerestory.
    _box(p + "mercek_gomulu_temel", (-2.76, 0.63, 0.52), (2.12, 3.44, 0.24), "foundation", 0.035)
    _box(p + "mercek_kanadi", (-2.76, 0.63, 1.49), (2.12, 3.44, 1.82), "cream", 0.10)
    _box(p + "mercek_on_cam", (-2.77, -1.104, 1.55), (1.82, 0.027, 1.24), "glass", 0)
    for x in (-3.49, -2.99, -2.49, -1.99):
        _box(p + "bati_pencere_" + str(x), (x, -1.14, 1.57),
             (0.038, 0.04, 1.30), "brass", 0.008)
    _box(p + "mercek_cati", (-2.76, 0.63, 2.45), (2.33, 3.65, 0.16), "stone", 0.08)
    _box(p + "mercek_teras", (-2.76, 0.63, 2.56), (2.08, 3.42, 0.085), "grass", 0.08)
    for i in range(6):
        _box(p + "pergola_%d" % i, (-2.80, -0.66 + i * 0.44, 2.98),
             (1.82, 0.08, 0.07), "wood", 0.016)
    for x in (-3.56, -1.97):
        for y in (-0.66, 1.54):
            _rod(p + "pergola_ayak_" + str((x, y)),
                 (x, y, 2.57), (x, y, 2.97), 0.035, "brass")
    _planter(p + "bati_teras_bahcesi", -2.80, 2.04, 1.82, 0.38, 2.61)

    # East optical hall: triangular glazed prism, with visible white stone ribs.
    x0, x1, y0, y1, z0, peak = 1.20, 3.89, -1.30, 2.24, 0.65, 3.62
    xm = (x0 + x1) / 2
    _box(p + "prizma_gomulu_temel", (xm, (y0+y1)/2, 0.54),
         (x1-x0, y1-y0, 0.22), "foundation", 0.03)
    verts = [(x0, y0, z0), (x1, y0, z0), (xm, y0, peak),
             (x0, y1, z0), (x1, y1, z0), (xm, y1, peak)]
    A.mesh(p + "prizma_cam", verts,
           [(0, 1, 2), (3, 5, 4), (0, 2, 5, 3), (1, 4, 5, 2)], _m("glass"))
    for i in range(6):
        yy = y0 + (y1 - y0) * i / 5
        _line(p + "prizma_kaburga_%d" % i,
              [(x0, yy, z0), (xm, yy, peak), (x1, yy, z0)],
              0.058 if i in (0, 5) else 0.036, "cream")
    for xx, zz in ((x0, z0), (x1, z0), (xm, peak)):
        _rod(p + "prizma_boyuna_" + str(xx), (xx, y0, zz),
             (xx, y1, zz), 0.044, "brass")
    for fraction in (0.34, 0.68):
        for side in (-1, 1):
            xx = xm + side * (x1 - x0) / 2 * (1 - fraction)
            _rod(p + "prizma_ara_" + str((side, fraction)),
                 (xx, y0, z0 + (peak - z0) * fraction),
                 (xx, y1, z0 + (peak - z0) * fraction), 0.022, "brass")
    _box(p + "prizma_kapi", (xm, y0 - 0.035, 1.18), (0.81, 0.075, 1.06), "cream", 0.024)
    _box(p + "prizma_kapi_cam", (xm, y0 - 0.08, 1.19), (0.67, 0.023, 0.90), "glass", 0.01)
    _box(p + "prizma_ust_sundurma", (xm, y0 - 0.20, 1.84),
         (1.13, 0.66, 0.10), "cream", 0.05)

    # Forecourt optics exhibit: a large upright lens and a three-colour light fan.
    _box(p + "optik_masa", (2.48, -2.18, 0.96), (2.10, 0.62, 0.11), "cream", 0.07)
    for xx in (1.71, 3.22):
        _rod(p + "optik_masa_ayak_" + str(xx),
             (xx, -2.18, 0.45), (xx, -2.18, 0.91), 0.055, "teal")
    lens = [(1.91 + 0.28 * cos(2 * pi * j / 48), -2.18,
             1.49 + 0.35 * sin(2 * pi * j / 48)) for j in range(48)]
    _line(p + "mercek_cercevesi", lens, 0.036, "brass", True)
    A.sphere(p + "mercek_cam", (1.91, -2.18, 1.49), (0.265, 0.052, 0.325), _m("glass"))
    _rod(p + "mercek_ayagi", (1.91, -2.18, 1.03), (1.91, -2.18, 1.15), 0.035, "brass")
    A.mesh(p + "optik_kucuk_prizma",
           [(2.41, -2.34, 1.05), (2.76, -2.34, 1.05), (2.57, -2.34, 1.50),
            (2.41, -2.02, 1.05), (2.76, -2.02, 1.05), (2.57, -2.02, 1.50)],
           [(0, 1, 2), (3, 5, 4), (0, 3, 4, 1), (0, 2, 5, 3), (1, 4, 5, 2)], _m("glass"))
    _rod(p + "gelen_isik", (1.28, -2.18, 1.30), (2.48, -2.18, 1.30), 0.014, "glow")
    for i, material in enumerate(("coral", "yellow", "blue")):
        _rod(p + "ayrisan_isik_%d" % i, (2.64, -2.18, 1.30),
             (3.40, -2.18 + (i - 1) * 0.18, 1.30 + (i - 1) * 0.06), 0.016, material)
    _planter(p + "on_bahce", -2.79, -2.43, 1.77, 0.53, 0.58, "leaf2", "yellow")
    _settle_new(before, .52)
    _ground_path(p + "dogal_giris", [(-.75, -3.34), (-.75, -2.28), (-.75, -1.27)], 1.43)
    _ground_path(p + "optik_baglanti", [(-.75, -2.70), (.52, -2.67), (1.56, -2.54),
                                       (2.56, -2.49), (2.56, -1.30)], .67)
    _ground_path(p + "mercek_baglanti", [(-.75, -2.54), (-1.89, -2.14), (-2.77, -1.15)], .64)


def build_8():
    """Yaşam ve İklim Biyosferi: double helix conservatory and seasonal gardens."""
    before = set(bpy.data.objects)
    p = "Y8_"

    # Circular, high-clearance conservatory; DNA is visible through its glazed skin.
    cy = 0.45
    A.cyl(p + "sera_temeli", (0, cy, 0.69), 2.23, 0.55, _m("foundation"))
    _glazed_circle(p + "sera_cam", 0, cy, 2.16, 0.95, 1.28, 28)
    _ring(p + "sera_sacak", (0, cy), 2.29, 2.29, 2.26, 0.16, 0.13, "cream")
    A.dome(p + "biyosfer_kubbe", (0, cy, 2.30), 2.16, 3.43, _m("glass"), segments=48, rings=18)
    _dome_ribs(p + "sera", 0, cy, 2.30, 2.19, 3.46, "brass", 12)
    A.cyl(p + "kubbe_tepe_bilezik", (0, cy, 5.78), 0.24, 0.105, _m("brass"), vertices=32)
    A.sphere(p + "kubbe_tepe_cam", (0, cy, 5.87), (0.16, 0.16, 0.14), _m("mint"))
    # Arched entrance has its own rhythm, making the garden feel accessible.
    for xx in (-0.65, 0.65):
        _box(p + "giris_paye_" + str(xx), (xx, -1.66, 1.53), (0.16, 0.22, 1.84), "cream", 0.035)
    arch = [(-0.65 * cos(pi * j / 24), -1.70,
             2.20 + 0.65 * sin(pi * j / 24)) for j in range(25)]
    _line(p + "giris_kemeri", arch, 0.09, "cream")
    _box(p + "kapi_sol", (-0.29, -1.735, 1.39), (0.55, 0.033, 1.49), "glass", 0.008)
    _box(p + "kapi_sag", (0.29, -1.735, 1.39), (0.55, 0.033, 1.49), "glass", 0.008)

    # A real paired-helix topology: two antipodal strands joined at every rung.
    A.cyl(p + "DNA_kürsü", (0, cy, 1.06), 0.99, 0.23, _m("stone"), vertices=48)
    _ring(p + "DNA_kürsü_bronz", (0, cy), 1.01, 1.01, 1.18, 0.055, 0.03, "brass")
    base, dna_height, dna_r, twist = 1.26, 3.48, 0.69, 2 * pi * 1.72
    dna_once = set(bpy.data.objects)
    for side, material in ((0, "teal"), (pi, "coral")):
        points = [(dna_r * cos(twist * i / 128 + side),
                   cy + dna_r * sin(twist * i / 128 + side),
                   base + dna_height * i / 128) for i in range(129)]
        _line(p + "DNA_sarmal_" + material, points, 0.075, material)
    pairs = (("yellow", "blue"), ("mint", "purple"))
    for i in range(21):
        u = i / 20
        t = twist * u
        x, y, z = dna_r * cos(t), dna_r * sin(t), base + dna_height * u
        left, right = pairs[i % 2]
        _rod(p + "DNA_es_sol_%02d" % i, (x, cy + y, z), (0, cy, z), 0.046, left)
        _rod(p + "DNA_es_sag_%02d" % i, (0, cy, z), (-x, cy - y, z), 0.046, right)
        A.sphere(p + "DNA_bag_%02d" % i, (0, cy, z), (0.055, 0.055, 0.055), _m("cream"))
    # Çift sarmal kendi ekseninde döner (web: üzerine gelince).
    A.donen_grup("grade_8_dna", (0, cy, base + dna_height / 2), dna_once)

    # Four gardens are architectural seasonal cues, not a model of Earth's seasons.
    gardens = [(-3.03, -1.58, "leaf2", "coral", 1.31, "ilkbahar"),
               (3.03, -1.58, "leaf", "yellow", 1.31, "yaz"),
               (-3.03, 1.55, "terracotta", "yellow", 1.76, "sonbahar"),
               (3.03, 1.55, "mint", None, 1.76, "kis")]
    for x, y, foliage, flower, roof, season in gardens:
        name = p + season
        h = roof - 0.64
        _box(name + "_gomulu_temel", (x, y, .515), (1.78, 1.95, .25), "foundation", .035)
        _box(name + "_kanat", (x, y, 0.64 + h / 2),
             (1.78, 1.95, h), "cream", 0.11)
        front = y - 0.987
        _box(name + "_cam", (x, front, 0.71 + h / 2),
             (1.43, 0.027, max(0.33, h - 0.25)), "glass", 0)
        for dx in (-0.48, 0, 0.48):
            _box(name + "_kayit_" + str(dx), (x + dx, front - 0.023, 0.70 + h / 2),
                 (0.031, 0.035, max(0.35, h - 0.17)), "brass", 0.005)
        _box(name + "_sacak", (x, y, roof), (1.92, 2.09, 0.12), "cream", 0.09)
        _box(name + "_yesil_teras", (x, y, roof + 0.09),
             (1.69, 1.85, 0.10), "grass" if season != "kis" else "mint", 0.08)
        _planter(name + "_arka_yatak", x, y + 0.63, 1.52, 0.43,
                 roof + 0.20, foliage, flower)
        # A slender tree held by a raised terrace bed gives each wing a silhouette.
        tx, ty = x + (-0.24 if x < 0 else 0.24), y + 0.12
        A.cyl(name + "_agac_saksisi", (tx, ty, roof + 0.22),
              0.31, 0.29, _m("stone"), vertices=24)
        _rod(name + "_govde", (tx, ty, roof + 0.35),
             (tx, ty, roof + 1.17), 0.057, "wood")
        for dx, dy, dz, r in [(-0.21, 0, 0.97, 0.34), (0.20, 0.05, 1.15, 0.36),
                               (0, 0.08, 1.38, 0.34)]:
            A.sphere(name + "_tac_" + str(dx), (tx + dx, ty + dy, roof + dz),
                     (r, r * 0.85, r), _m(foliage))
        if season == "kis":
            for dx, dy, dz in [(-0.21, 0, 1.10), (0.20, 0.05, 1.29), (0, 0.08, 1.54)]:
                A.sphere(name + "_kar_" + str(dx), (tx + dx, ty + dy, roof + dz),
                         (0.28, 0.25, 0.075), _m("white"))

    # Small clean-energy installation and a rainwater cistern, scaled as equipment.
    for i in range(3):
        panel = _box(p + "gunes_paneli_%d" % i,
                     (2.67 + i * 0.39, -1.88, 1.67), (0.34, 0.66, 0.045), "navy", 0.012)
        panel.rotation_euler[0] = radians(19)
        for yy in (-2.08, -1.83, -1.60):
            _rod(p + "solar_hucre_%d_%s" % (i, yy),
                 (2.51 + i * 0.39, yy, 1.67 + (yy + 1.88) * sin(radians(19))),
                 (2.82 + i * 0.39, yy, 1.67 + (yy + 1.88) * sin(radians(19))), 0.006, "mint")
    A.cyl(p + "yagmur_sarnici", (-3.43, 0.18, 1.01), 0.26, 0.67, _m("teal"), vertices=32)
    A.cyl(p + "sarnic_kapak", (-3.43, 0.18, 1.36), 0.29, 0.055, _m("brass"), vertices=32)
    _line(p + "su_olugu", [(-2.42, 1.97, 2.03), (-3.43, 1.97, 2.03),
                           (-3.43, 0.18, 2.03), (-3.43, 0.18, 1.40)], 0.035, "brass")
    # Weather mast: three cups and a simple direction pointer, no giant machinery.
    _rod(p + "hava_istasyonu_diregi", (3.53, 2.28, 1.90), (3.53, 2.28, 3.76), 0.033, "brass")
    for i in range(3):
        t = 2 * pi * i / 3
        end = (3.53 + 0.24 * cos(t), 2.28 + 0.24 * sin(t), 3.48)
        _rod(p + "anemometre_kol_%d" % i, (3.53, 2.28, 3.48), end, 0.013, "brass")
        A.sphere(p + "anemometre_tas_%d" % i, end, (0.08, 0.08, 0.047), _m("teal"))
    _rod(p + "ruzgar_oku", (3.24, 2.28, 3.76), (3.82, 2.28, 3.76), 0.016, "brass")
    _settle_new(before, .52)
    _ground_path(p + "dogal_giris", [(0, -3.32), (0, -2.46), (0, -1.61)], 1.45)
    for side in (-1, 1):
        _ground_path(p + "mevsim_baglanti_" + str(side),
                     [(0, -2.70), (side*1.58, -2.80), (side*3.03, -2.66)], .63)


def build_lab():
    """Keşif Laboratuvarı: open horseshoe atrium, three lanterns, microscope."""
    before = set(bpy.data.objects)
    p = "LAB_"
    # Shallow forecourt pool doubles as a calm reflector for the microscope.
    _box(p + "avlu_havuzu_tasi", (0, -0.68, 0.63), (3.82, 3.64, 0.23), "foundation", 0.22)
    _box(p + "avlu_suyu", (0, -0.68, 0.752), (3.54, 3.36, 0.026), "mint", 0.30)
    A.cyl(p + "mikroskop_adasi", (0, -0.68, 0.80), 1.63, 0.17, _m("cream"), vertices=64)

    # Horseshoe glazed cloister. Both inner and outer faces are drawn in individual
    # panes so the atrium stays visibly open from the village camera.
    rx, ry, center_y, inner = 5.51, 3.68, 0.02, 1.77
    start, stop = radians(-15), radians(195)
    _arc_band(p + "atnali_kaide", (0, center_y), rx, ry, start, stop,
              inner, 0.70, 0.46, "foundation")
    _arc_band(p + "atnali_cati", (0, center_y), rx + 0.10, ry + 0.10, start, stop,
              inner + 0.19, 3.14, 0.21, "cream")
    _arc_band(p + "bakir_cati_kenari", (0, center_y), rx + 0.10, ry + 0.10, start, stop,
              0.085, 3.30, 0.12, "terracotta")
    _arc_band(p + "ic_cati_kenari", (0, center_y), rx - inner + 0.13,
              ry - inner + 0.13, start, stop, 0.10, 3.27, 0.10, "brass")
    steps = 28
    for i in range(steps):
        a = start + (stop - start) * i / steps
        b = start + (stop - start) * (i + 1) / steps
        for side, inset in (("dis", 0.04), ("ic", inner - 0.04)):
            x1, y1 = (rx - inset) * cos(a), center_y + (ry - inset) * sin(a)
            x2, y2 = (rx - inset) * cos(b), center_y + (ry - inset) * sin(b)
            A.mesh(p + side + "_cam_%02d" % i,
                   [(x1, y1, 0.94), (x2, y2, 0.94),
                    (x2, y2, 3.025), (x1, y1, 3.025)],
                   [(0, 1, 2, 3)], _m("glass"))
            _rod(p + side + "_dikey_%02d" % i,
                 (x1, y1, 0.87), (x1, y1, 3.06),
                 0.045 if i % 2 == 0 else 0.022,
                 "cream" if i % 2 == 0 else "brass")
            for zz in (1.00, 2.35):
                _rod(p + side + "_kayit_%02d_%s" % (i, zz),
                     (x1, y1, zz), (x2, y2, zz), 0.018, "brass")
    # Open ends have paired stone columns rather than heavy end walls.
    for angle in (start, stop):
        for inset in (0.07, inner - 0.07):
            xx, yy = (rx - inset) * cos(angle), center_y + (ry - inset) * sin(angle)
            _rod(p + "giris_kolonu_" + str((angle, inset)),
                 (xx, yy, 0.88), (xx, yy, 3.12), 0.08, "cream")

    # Three characteristic roof lanterns. Smaller than their stone drums, with
    # brass geodesic-like ribs; the rear lantern is taller, not disproportionately wide.
    lanterns = [(-3.86, 1.42, 1.17, 1.48), (0, 2.77, 1.29, 1.76),
                (3.86, 1.42, 1.17, 1.48)]
    for i, (xx, yy, radius, height) in enumerate(lanterns):
        A.cyl(p + "fener_kasnak_%d" % i, (xx, yy, 3.29),
              radius + 0.07, 0.20, _m("cream"), vertices=48)
        A.dome(p + "fener_cam_%d" % i, (xx, yy, 3.40), radius, height,
               _m("glass"), segments=40, rings=14)
        _dome_ribs(p + "fener_%d" % i, xx, yy, 3.40,
                   radius + 0.015, height + 0.02, "brass", 10)
        A.cyl(p + "fener_tepe_%d" % i, (xx, yy, 3.43 + height),
              0.16, 0.10, _m("brass"), vertices=24)
        A.sphere(p + "fener_inci_%d" % i, (xx, yy, 3.54 + height),
                 (0.10, 0.10, 0.12), _m("mint"))

    # Tall glazed specimen cabinets illuminate the back of the loop.
    for i, xx in enumerate((-1.45, 0, 1.45)):
        yy = 2.97 if i == 1 else 2.69
        _box(p + "numune_dolabi_%d" % i, (xx, yy, 1.80),
             (0.87, 0.46, 1.73), "teal", 0.055)
        _box(p + "numune_dolabi_cam_%d" % i, (xx, yy - 0.24, 1.86),
             (0.71, 0.026, 1.40), "glass", 0.01)
        for zz in (1.31, 1.81, 2.30):
            _box(p + "numune_raf_%d_%s" % (i, zz), (xx, yy - 0.015, zz),
                 (0.73, 0.38, 0.033), "cream", 0.007)
            A.sphere(p + "numune_%d_%s" % (i, zz), (xx, yy - 0.05, zz + 0.12),
                     (0.12, 0.12, 0.12), _m(("coral", "yellow", "mint")[i]))

    # Sculptural microscope: foot, curved support, stage, objectives, inclined
    # body tube and eyepiece all stay visibly distinct in its familiar silhouette.
    microscope_before = set(bpy.data.objects)
    my = -0.75
    A.sphere(p + "mikroskop_ayak", (0, my, 1.01), (1.03, 0.70, 0.16), _m("teal"))
    A.sphere(p + "mikroskop_ayak_kenari", (0, my, 0.955),
             (1.09, 0.73, 0.075), _m("brass"))
    arm = [(0.54, my + 0.19, 1.09), (0.81, my + 0.19, 1.34),
           (0.95, my + 0.19, 1.82), (0.92, my + 0.19, 2.43),
           (0.70, my + 0.19, 3.00), (0.27, my + 0.19, 3.39),
           (-0.12, my + 0.19, 3.53)]
    _line(p + "mikroskop_kavisli_kol", arm, 0.19, "teal")
    _line(p + "mikroskop_kol_bronz", [(x, y - 0.185, z) for x, y, z in arm],
          0.023, "brass")
    _rod(p + "mikroskop_govde_tupu", (-0.27, my, 3.20),
         (0.38, my, 4.19), 0.205, "cream")
    _rod(p + "mikroskop_gozluk", (0.36, my, 4.17),
         (0.56, my, 4.47), 0.153, "navy")
    _rod(p + "mikroskop_gozluk_bilezik", (0.46, my, 4.32),
         (0.50, my, 4.38), 0.18, "brass")
    A.sphere(p + "mikroskop_gozluk_cami", (0.56, my, 4.475),
             (0.10, 0.125, 0.065), _m("blue"))
    A.cyl(p + "mikroskop_burun", (-0.29, my, 3.13), 0.31, 0.13, _m("brass"), vertices=32)
    for i, xx in enumerate((-0.52, -0.27, -0.06)):
        _rod(p + "mikroskop_objektif_%d" % i,
             (xx, my - (0.10 if i == 1 else 0), 3.09),
             (xx - 0.045, my - (0.10 if i == 1 else 0), 2.71 - i * 0.035),
             0.069, "navy")
    _box(p + "mikroskop_numune_tabla", (-0.20, my, 2.47), (1.45, 1.09, 0.115), "teal", 0.055)
    _box(p + "mikroskop_lam", (-0.28, my - 0.04, 2.545), (0.67, 0.35, 0.032), "glass", 0.018)
    A.sphere(p + "mikroskop_ornek", (-0.28, my - 0.04, 2.57),
             (0.09, 0.06, 0.019), _m("coral"))
    for xx in (-0.58, 0.14):
        _box(p + "mikroskop_lam_klips_" + str(xx), (xx, my - 0.05, 2.57),
             (0.05, 0.33, 0.025), "brass", 0.01)
    _rod(p + "mikroskop_tabla_destek", (0.69, my, 1.51), (0.69, my, 2.43), 0.095, "teal")
    A.cyl(p + "mikroskop_isik", (-0.20, my, 1.30), 0.29, 0.19, _m("cream"), vertices=32)
    A.cyl(p + "mikroskop_isik_cami", (-0.20, my, 1.405), 0.23, 0.034, _m("glow"), vertices=32)
    # Focus wheels are horizontal cylinders, oriented along the side axis.
    for xx, yy, zz, rr in ((0.78, my - 0.12, 2.00, 0.23), (0.80, my - 0.32, 2.00, 0.12)):
        wheel = A.cyl(p + "mikroskop_odak_" + str(rr), (xx, yy, zz),
                      rr, 0.15, _m("brass" if rr > 0.2 else "teal"), vertices=32)
        wheel.rotation_euler[0] = pi / 2

    # The laboratory's instrument is its architectural centrepiece. Scale only
    # the complete microscope about the existing stone plinth's seating level;
    # direct parenting is retained for the village's GLB export.
    microscope_anchor = Vector((0, my, 0.88))
    for part in set(bpy.data.objects) - microscope_before:
        part.location = microscope_anchor + (part.location - microscope_anchor) * 1.45
        part.scale *= 1.45
    # Web sahnesindeki mikroskop animasyonu: objektif tareti düşey eksende, odak tekerleği yan
    # eksende döner. Pivotlar ölçeklenmiş konumlardır (ölçek 1.45, çapa 0.88).
    def olcekli(x, y, z):
        return (x * 1.45, y, 0.88 + (z - 0.88) * 1.45)
    A.donen_grup(p + "taret", olcekli(-0.29, my, 3.13), eksen=(0, 0, 1),
                 nesneler=[o for o in bpy.data.objects
                           if o.name.startswith(p + "mikroskop_burun") or o.name.startswith(p + "mikroskop_objektif")])
    A.donen_grup(p + "odak", olcekli(0.78, my - 0.12, 2.00), eksen=(0, 1, 0),
                 nesneler=[o for o in bpy.data.objects if o.name.startswith(p + "mikroskop_odak_")])

    # Two real working displays greet visitors beside the atrium.
    top = _bench(p + "kimya_tezgahi", -3.83, -1.16, 0.49, 2.28)
    _box(p + "tup_standi_alt", (-3.91, -1.19, top + 0.07), (1.00, 0.38, 0.07), "wood", 0.025)
    for xx in (-4.35, -3.48):
        _box(p + "tup_standi_ayak_" + str(xx), (xx, -1.19, top + 0.25),
             (0.055, 0.32, 0.38), "brass", 0.009)
    _box(p + "tup_standi_ust", (-3.91, -1.19, top + 0.40),
         (1.00, 0.27, 0.045), "cream", 0.025)
    for i, material in enumerate(("blue", "coral", "yellow", "mint")):
        xx = -4.24 + i * 0.22
        A.cyl(p + "deney_tupu_cam_%d" % i, (xx, -1.19, top + 0.33),
              0.067, 0.49, _m("glass"), vertices=24)
        A.sphere(p + "deney_tupu_alt_%d" % i, (xx, -1.19, top + 0.105),
                 (0.066, 0.066, 0.066), _m("glass"))
        A.cyl(p + "deney_tupu_sivi_%d" % i, (xx, -1.19, top + 0.23),
              0.048, 0.25, _m(material), vertices=20)
        A.cyl(p + "deney_tupu_agiz_%d" % i, (xx, -1.19, top + 0.584),
              0.080, 0.036, _m("cream"), vertices=20)
    _flask(p + "erlen_mavi", -3.08, -1.16, top, 0.82, "blue")
    _flask(p + "erlen_mercan", -4.65, -1.12, top, 0.64, "coral")

    optop = _bench(p + "elektrik_optik_tezgahi", 3.83, -1.16, 0.49, 2.28)
    _box(p + "dusuk_gerilim_kaynagi", (3.19, -1.13, optop + 0.15),
         (0.49, 0.39, 0.30), "teal", 0.05)
    _box(p + "kaynak_gostergesi", (3.19, -1.34, optop + 0.18),
         (0.26, 0.013, 0.11), "mint", 0.01)
    A.cyl(p + "ampul_duyu", (4.01, -1.13, optop + 0.08),
          0.17, 0.15, _m("cream"), vertices=24)
    A.sphere(p + "devre_ampulu", (4.01, -1.13, optop + 0.36),
             (0.19, 0.19, 0.24), _m("glow"))
    _line(p + "devre_kirmizi_kablo", [(3.37, -1.33, optop + 0.05),
                                     (3.55, -1.43, optop + 0.04),
                                     (4.06, -1.40, optop + 0.035),
                                     (4.09, -1.18, optop + 0.075)], 0.014, "coral")
    _line(p + "devre_mavi_kablo", [(3.36, -1.00, optop + 0.04),
                                  (3.58, -0.92, optop + 0.035),
                                  (3.93, -0.96, optop + 0.04),
                                  (3.96, -1.10, optop + 0.075)], 0.014, "blue")
    # Upright lens on its own stand at the optical end of the bench.
    xx = 4.67
    _rod(p + "optik_mercek_ayagi", (xx, -1.13, optop), (xx, -1.13, optop + 0.39), 0.027, "brass")
    lens = [(xx + 0.23 * cos(2 * pi * i / 40), -1.13,
             optop + 0.60 + 0.23 * sin(2 * pi * i / 40)) for i in range(40)]
    _line(p + "optik_mercek_cerceve", lens, 0.028, "brass", True)
    A.sphere(p + "optik_mercek_cam", (xx, -1.13, optop + 0.60),
             (0.217, 0.033, 0.217), _m("glass"))

    # Furniture and vegetation make the little laboratory feel inhabited.
    for i, xx in enumerate((-4.60, -3.72, -2.90, 2.93, 3.77, 4.60)):
        A.cyl(p + "tabure_%d" % i, (xx, -1.91, 0.99),
              0.20, 0.10, _m("teal" if i % 2 else "mint"), vertices=24)
        _rod(p + "tabure_ayagi_%d" % i, (xx, -1.91, 0.47),
             (xx, -1.91, 0.94), 0.046, "brass")
    for i, xx in enumerate((-4.10, 4.10)):
        _planter(p + "on_bahce_%d" % i, xx, -2.93,
                 2.46, 0.65, 0.57, "leaf2", "coral" if i == 0 else "yellow")
    for xx in (-2.05, 2.05):
        _box(p + "avlu_banki_" + str(xx), (xx, -2.18, 0.95),
             (0.48, 1.37, 0.13), "wood", 0.07)
        for yy in (-2.63, -1.73):
            _box(p + "bank_ayak_" + str((xx, yy)), (xx, yy, 0.67),
                 (0.34, 0.12, 0.51), "foundation", 0.025)
    # Brass guide strip leads through the front opening and ends at the instrument.
    _box(p + "avlu_yon_cizgisi", (0, -2.96, 0.485), (0.026, 1.47, 0.014), "brass", 0.005)
    _settle_new(before, .52)
    _ground_path(p + "ortak_dogal_giris", [(0, -4.20), (0, -3.31), (0, -2.34)], 2.31, z=-.042)
    for side in (-1, 1):
        _ground_path(p + "acik_avlu_yolu_" + str(side),
                     [(0, -3.38), (side*1.91, -3.27), (side*3.43, -2.49),
                      (side*4.12, -1.40), (side*4.10, -.42)], 1.15, z=-.042)
