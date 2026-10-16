"""Small Alpine wildlife sculptures and rope-bridge lanterns, in Z-up coordinates.

Animal headings point along local +X. All points, object centres and rotations
are transformed directly; every object remains an immediate child of A.ROOT.
"""

from math import sin, cos, pi
import bpy
from mathutils import Vector, Euler
import fen_ortak as A


_MATERIALS = {}


def _palette():
    if _MATERIALS and all(mat.name in bpy.data.materials for mat in _MATERIALS.values()):
        return _MATERIALS
    _MATERIALS.clear()
    specs = {
        # Krem-beyaz dağ keçisi: kahverengi kayalıkta kaya gibi kaybolmaz, uzaktan hayvan okunur.
        "fur": ((0.86, 0.83, 0.75), 0.93, 0),
        "fur_light": ((0.94, 0.92, 0.86), 0.90, 0),
        "fur_belly": ((0.91, 0.89, 0.83), 0.96, 0),
        "fur_dark": ((0.52, 0.47, 0.40), 0.94, 0),
        "horn": ((0.25, 0.20, 0.14), 0.74, 0),
        "horn_ridge": ((0.40, 0.33, 0.23), 0.82, 0),
        "hoof": ((0.095, 0.095, 0.082), 0.76, 0),
        "eye": ((0.018, 0.014, 0.010), 0.23, 0),
        "eagle": ((0.22, 0.16, 0.105), 0.87, 0),
        "eagle_gold": ((0.43, 0.32, 0.18), 0.88, 0),
        "eagle_under": ((0.60, 0.52, 0.37), 0.90, 0),
        "flight_feather": ((0.10, 0.086, 0.07), 0.90, 0),
        "beak": ((0.47, 0.34, 0.13), 0.68, 0),
        "rope": ((0.56, 0.44, 0.29), 0.94, 0),
        "timber": ((0.25, 0.16, 0.085), 0.88, 0),
        "bronze": ((0.43, 0.29, 0.115), 0.37, 0.62),
        "opal": ((0.94, 0.81, 0.54), 0.38, 0),
    }
    for name, (color, rough, metal) in specs.items():
        _MATERIALS[name] = A.material("Dağ · " + name, color, rough=rough, metal=metal)
    lamp = _MATERIALS["opal"].node_tree.nodes.get("Principled BSDF")
    lamp.inputs["Emission Color"].default_value = (1.0, 0.73, 0.36, 1)
    lamp.inputs["Emission Strength"].default_value = 0.65
    return _MATERIALS


class _At:
    def __init__(self, x, y, z, angle=0, scale=1):
        if scale <= 0:
            raise ValueError("Animal scale must be positive")
        self.origin = Vector((x, y, z))
        self.angle, self.scale = angle, scale
        self.rot = Euler((0, 0, angle), "XYZ").to_quaternion()
        self.mat = _palette()

    def point(self, point):
        return self.origin + self.rot @ (Vector(point) * self.scale)

    def sphere(self, name, center, dimensions, material, rotation=(0, 0, 0)):
        obj = A.sphere(name, self.point(center),
                       tuple(value * self.scale for value in dimensions), self.mat[material])
        obj.rotation_euler = (self.rot @ Euler(rotation, "XYZ").to_quaternion()).to_euler()
        return obj

    def bone(self, name, start, end, width, thickness, material):
        """An anatomically elongated ellipsoid with its long axis along the limb."""
        start, end = Vector(start), Vector(end)
        obj = A.sphere(name, self.point((start + end) / 2),
                       (width * self.scale, thickness * self.scale,
                        (end - start).length * self.scale * 0.62), self.mat[material])
        obj.rotation_euler = (self.rot @ (end - start).to_track_quat("Z", "Y")).to_euler()
        return obj

    def bar(self, name, start, end, radius, material):
        return A.bar(name, self.point(start), self.point(end),
                     radius * self.scale, self.mat[material])

    def line(self, name, points, radius, material, cyclic=False):
        return A.tube(name, [self.point(point) for point in points],
                      radius * self.scale, self.mat[material], cyclic=cyclic)

    def cube(self, name, center, size, material, bevel=0.01, rotation=(0, 0, 0)):
        obj = A.cube(name, self.point(center), tuple(value * self.scale for value in size),
                     self.mat[material], bevel=bevel * self.scale)
        obj.rotation_euler = (self.rot @ Euler(rotation, "XYZ").to_quaternion()).to_euler()
        return obj

    def mesh(self, name, points, faces, material, smooth=False):
        obj = A.mesh(name, [self.point(point) for point in points], faces, self.mat[material])
        if smooth:
            for polygon in obj.data.polygons:
                polygon.use_smooth = True
        return obj

    def taper(self, name, points, radii, material, sides=10):
        """A capped, smoothly shaded taper following a three-dimensional spine."""
        points = [Vector(point) for point in points]
        vertices, frames = [], []
        for i, (point, radius) in enumerate(zip(points, radii)):
            tangent = points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]
            tangent.normalize()
            reference = Vector((0, 1, 0))
            if abs(tangent.dot(reference)) > 0.94:
                reference = Vector((1, 0, 0))
            across = tangent.cross(reference).normalized()
            up = tangent.cross(across).normalized()
            frames.append((point, across, up))
            for j in range(sides):
                a = 2 * pi * j / sides
                vertices.append(point + radius * (cos(a) * across + sin(a) * up))
        faces = [tuple(reversed(range(sides)))]
        for i in range(len(points) - 1):
            for j in range(sides):
                k = (j + 1) % sides
                faces.append((i * sides + j, i * sides + k,
                              (i + 1) * sides + k, (i + 1) * sides + j))
        faces.append(tuple((len(points) - 1) * sides + j for j in range(sides)))
        self.mesh(name, vertices, faces, material, smooth=True)
        return frames


def _ear(at, name, base, tip, material="fur_light"):
    base, tip = Vector(base), Vector(tip)
    direction = tip - base
    across = Vector((0.055, 0, 0.015))
    middle = base + direction * 0.49
    points = [base, middle + across, tip, middle - across,
              middle + Vector((0, 0, 0.027)), middle - Vector((0, 0, 0.018))]
    at.mesh(name, points, [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4),
                           (1, 0, 5), (2, 1, 5), (3, 2, 5), (0, 3, 5)], material, True)
    at.line(name + " · iç kıvrım", [base + direction * 0.25,
                                    middle + Vector((0, 0, 0.028)),
                                    base + direction * 0.85], 0.009, "fur_dark")


def keci(x, y, z, angle=0, scale=1):
    """A slender Alpine ibex, around 1.8 m long and 1.55 m high at scale one."""
    at = _At(x, y, z, angle, scale)
    at.sphere("Dağ keçisi · gövde", (-0.08, 0, 0.78), (0.58, 0.21, 0.285), "fur")
    at.sphere("Dağ keçisi · karın", (-0.08, 0, 0.66), (0.44, 0.183, 0.18), "fur_belly")
    at.sphere("Dağ keçisi · sağrı", (-0.48, 0, 0.80), (0.23, 0.20, 0.27), "fur")
    at.bone("Dağ keçisi · omuz", (0.27, 0, 0.72), (0.38, 0, 0.98), 0.18, 0.186, "fur")
    at.bone("Dağ keçisi · yükselen boyun", (0.35, 0, 0.85),
            (0.56, 0, 1.14), 0.155, 0.15, "fur_light")
    at.sphere("Dağ keçisi · baş", (0.66, 0, 1.13), (0.20, 0.115, 0.132),
              "fur_light", (0, 0.10, 0))
    at.sphere("Dağ keçisi · ince burun", (0.81, 0, 1.083),
              (0.17, 0.079, 0.072), "fur_light", (0, 0.08, 0))
    at.sphere("Dağ keçisi · siyah burun", (0.968, 0, 1.069),
              (0.026, 0.068, 0.036), "hoof")
    for side in (-1, 1):
        at.sphere("Dağ keçisi · göz", (0.727, side * 0.105, 1.163),
                  (0.019, 0.010, 0.015), "eye")
        at.line("Dağ keçisi · göz üstü", [(0.697, side * 0.108, 1.185),
                                          (0.747, side * 0.098, 1.181)],
                0.009, "fur_dark")
        at.line("Dağ keçisi · ağız", [(0.845, side * 0.064, 1.044),
                                      (0.955, side * 0.045, 1.039)], 0.0035, "fur_dark")
        _ear(at, "Dağ keçisi · kulak", (0.574, side * 0.094, 1.197),
             (0.495, side * 0.286, 1.278))

    # Four articulated legs, each terminating in two individually modelled toes.
    feet = []
    for side in (-1, 1):
        yy = side * 0.143
        advance = 0.040 if side == -1 else -0.020
        a, b, c, d = ((0.335, yy, 0.79), (0.328, yy, 0.52),
                      (0.375 + advance, yy, 0.255), (0.389 + advance, yy, 0.10))
        at.bone("Dağ keçisi · ön üst bacak", a, b, 0.066, 0.060, "fur")
        at.taper("Dağ keçisi · ön incik", [b, c, d], [0.043, 0.031, 0.030], "fur_dark", 8)
        at.sphere("Dağ keçisi · ön bilek", c, (0.036, 0.035, 0.046), "fur_dark")
        feet.append((d[0] + 0.020, yy))
        # The bent hock is deliberately different from a straight front leg.
        a, b, c, d = ((-0.455, yy, 0.78), (-0.267, yy, 0.50),
                      (-0.451, yy, 0.285), (-0.388 - advance, yy, 0.10))
        at.bone("Dağ keçisi · arka but", a, b, 0.091, 0.078, "fur")
        at.taper("Dağ keçisi · arka incik", [b, c, d], [0.050, 0.033, 0.028], "fur_dark", 8)
        at.sphere("Dağ keçisi · arka bilek", c, (0.037, 0.037, 0.044), "fur_dark")
        feet.append((d[0] + 0.021, yy))
    for fx, fy in feet:
        for split in (-1, 1):
            at.cube("Dağ keçisi · yarık toynak", (fx, fy + split * 0.0255, 0.046),
                    (0.119, 0.042, 0.092), "hoof", 0.017)

    # A narrow chin beard and lifted short tail keep the silhouette recognisable.
    at.mesh("Dağ keçisi · sakal", [(0.675, -0.038, 1.025), (0.742, -0.028, 1.023),
                                    (0.685, 0.040, 1.024), (0.653, 0.005, 0.860)],
            [(0, 1, 2), (0, 3, 1), (1, 3, 2), (2, 3, 0)], "fur_dark", True)
    at.bone("Dağ keçisi · kısa kuyruk", (-0.645, 0, 0.862),
            (-0.807, 0, 0.975), 0.060, 0.045, "fur_dark")

    # Ibex horns rise from two independent bases and sweep BACK along the spine.
    for side in (-1, 1):
        points = []
        radii = []
        for i in range(17):
            t = i / 16
            # Cubic Bezier: a tall forehead rise followed by a deep backward arc.
            a = Vector((0.585, side * 0.067, 1.228))
            b = Vector((0.625, side * 0.115, 1.805))
            c = Vector((-0.090, side * 0.150, 1.734))
            d = Vector((-0.240, side * 0.166, 1.238))
            point = (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d
            points.append(point)
            radii.append(0.058 * (1 - t) ** 0.75 + 0.006)
        frames = at.taper("Dağ keçisi · kıvrılan boynuz", points, radii, "horn", 12)
        for i in range(1, 15):
            point, u, v = frames[i]
            rr = radii[i] + 0.004
            ring = [point + rr * (cos(2 * pi * j / 14) * u + sin(2 * pi * j / 14) * v)
                    for j in range(14)]
            at.line("Dağ keçisi · boynuz büyüme çizgisi", ring,
                    0.0048 if i < 9 else 0.0033, "horn_ridge", True)


def _feather(at, name, start, end, width, material, ridge=0.010):
    """A lenticular, pointed feather; raised rachis and coloured undersurface."""
    start, end = Vector(start), Vector(end)
    direction = end - start
    across = Vector((-direction.y, direction.x, 0)).normalized()
    if across.length < 0.01:
        across = Vector((0, 1, 0))
    points = [start - across * width * 0.24,
              start + direction * 0.40 - across * width * 0.50,
              start + direction * 0.78 - across * width * 0.35,
              end,
              start + direction * 0.78 + across * width * 0.35,
              start + direction * 0.40 + across * width * 0.50,
              start + across * width * 0.24,
              start + direction * 0.43 + Vector((0, 0, ridge))]
    faces = [(7, i, (i + 1) % 7) for i in range(7)]
    at.mesh(name, points, faces, material, True)
    # The reverse face remains pale when the soaring bird is viewed from below.
    under = [point - Vector((0, 0, 0.008)) for point in points]
    at.mesh(name + " · açık alt yüz", under,
            [tuple(reversed(face)) for face in faces], "eagle_under", True)
    at.line(name + " · telek", [start + direction * 0.13 + Vector((0, 0, ridge)),
                                start + direction * 0.77 + Vector((0, 0, ridge * 0.3))],
            0.003, "eagle_gold")


def _eagle_head(at, center):
    hx, hy, hz = center
    at.sphere("Dağ kartalı · altın ense", (hx - 0.091, hy, hz - 0.012),
              (0.146, 0.102, 0.129), "eagle_gold")
    at.sphere("Dağ kartalı · baş", (hx, hy, hz), (0.145, 0.091, 0.106), "eagle")
    for side in (-1, 1):
        at.sphere("Dağ kartalı · keskin göz", (hx + 0.051, hy + side * 0.082, hz + 0.025),
                  (0.014, 0.009, 0.014), "eye")
        at.mesh("Dağ kartalı · kaş", [(hx + 0.010, hy + side * 0.094, hz + 0.052),
                                      (hx + 0.091, hy + side * 0.071, hz + 0.040),
                                      (hx + 0.031, hy + side * 0.091, hz + 0.032)],
                [(0, 1, 2)], "eagle_gold")
    at.taper("Dağ kartalı · kanca gaga",
             [(hx + 0.095, hy, hz - 0.010), (hx + 0.170, hy, hz - 0.013),
              (hx + 0.211, hy, hz - 0.047), (hx + 0.185, hy, hz - 0.093)],
             [0.043, 0.035, 0.020, 0.003], "beak", 8)
    at.taper("Dağ kartalı · gaga ucu", [(hx + 0.210, hy, hz - 0.043),
                                       (hx + 0.187, hy, hz - 0.093)],
             [0.018, 0.002], "hoof", 8)


def kartal(x, y, z, angle=0, scale=1, ucuyor=True):
    """Golden mountain eagle; airborne anchor is body height, perched anchor ground."""
    at = _At(x, y, z, angle, scale)
    if not ucuyor:
        return _perched_eagle(at)
    at.sphere("Dağ kartalı · uçuş gövdesi", (-0.07, 0, 0),
              (0.37, 0.129, 0.145), "eagle")
    at.sphere("Dağ kartalı · açık göğüs", (0.075, 0, -0.060),
              (0.24, 0.119, 0.099), "eagle_under")
    _eagle_head(at, (0.356, 0, 0.040))
    for side in (-1, 1):
        def wing(point):
            return (point[0], point[1] * side, point[2])
        # Broad shoulders, bent wrist and tapered outer wing: not a flat triangle.
        contour = [(0.100, 0.10, 0.060), (0.140, 0.46, 0.115),
                   (0.205, 0.82, 0.165), (0.095, 1.065, 0.153),
                   (-0.180, 1.260, 0.091), (-0.425, 1.02, 0.015),
                   (-0.470, 0.55, -0.025), (-0.365, 0.10, -0.025),
                   (-0.120, 0.56, 0.130)]
        faces = [(8, i, (i + 1) % 8) for i in range(8)]
        if side < 0:
            faces = [tuple(reversed(face)) for face in faces]
        at.mesh("Dağ kartalı · geniş kanat", [wing(point) for point in contour],
                faces, "eagle", True)
        # Long secondary feathers form the broad, scalloped inner trailing edge.
        for i in range(7):
            yy = 0.25 + i * 0.112
            _feather(at, "Dağ kartalı · ikincil uçuş tüyü",
                     wing((0.075 + 0.07 * i / 6, yy, 0.135 + i * 0.003)),
                     wing((-0.505 + i * 0.006, yy + 0.049, -0.005)),
                     0.151, "eagle" if i % 2 else "eagle_gold", 0.013)
        # Separated primary fingers extend and splay at the wing tip.
        for i in range(6):
            _feather(at, "Dağ kartalı · parmak teleği",
                     wing((0.135 - 0.035 * i, 0.835 + 0.055 * i, 0.163 - i * 0.006)),
                     wing((-0.190 - 0.071 * i, 1.480 - 0.052 * i, 0.090 - i * 0.017)),
                     0.112, "flight_feather", 0.012)
        # A shorter overlapping row describes golden upper-wing coverts.
        for i in range(6):
            yy = 0.22 + i * 0.14
            _feather(at, "Dağ kartalı · kanat örtü tüyü",
                     wing((0.123 + 0.035 * sin(i), yy, 0.177)),
                     wing((-0.16, yy + 0.05, 0.143)), 0.155, "eagle_gold", 0.014)
        # Legs are tucked close to the belly, talons trailing safely behind.
        at.bone("Dağ kartalı · toplanmış bacak", (-0.13, side * 0.071, -0.100),
                (-0.235, side * 0.073, -0.183), 0.041, 0.037, "eagle_under")
        for toe in (-1, 0, 1):
            at.line("Dağ kartalı · uçuş pençesi",
                    [(-0.224, side * 0.074, -0.185),
                     (-0.31, side * 0.074 + toe * 0.016, -0.211),
                     (-0.344, side * 0.074 + toe * 0.018, -0.180)],
                    0.006, "beak")
    for i in range(7):
        _feather(at, "Dağ kartalı · yelpaze kuyruk", (-0.332, (i - 3) * 0.024, -0.008),
                 (-0.810 + abs(i - 3) * 0.026, (i - 3) * 0.077, -0.058),
                 0.115, "flight_feather", 0.008)


def _perched_eagle(at):
    # Subtle fallen branch under the toes gives the talons something to grip.
    at.taper("Dağ kartalı · tünek dalı", [(-0.080, -0.43, 0.092),
                                          (0.014, 0, 0.105), (0.076, 0.44, 0.135)],
             [0.052, 0.065, 0.045], "timber", 9)
    at.taper("Dağ kartalı · tünek küçük dal", [(0.041, 0.24, 0.127),
                                                 (-0.137, 0.32, 0.164)],
             [0.027, 0.010], "timber", 8)
    at.bone("Dağ kartalı · dik gövde", (-0.10, 0, 0.39),
            (0.059, 0, 0.785), 0.190, 0.145, "eagle")
    at.bone("Dağ kartalı · göğüs", (0.095, 0, 0.40),
            (0.122, 0, 0.73), 0.132, 0.127, "eagle_under")
    _eagle_head(at, (0.179, 0, 0.889))
    for side in (-1, 1):
        at.bone("Dağ kartalı · kapalı kanat", (-0.036, side * 0.112, 0.716),
                (-0.244, side * 0.128, 0.320), 0.106, 0.079, "eagle")
        for i in range(5):
            _feather(at, "Dağ kartalı · katlı uzun telek",
                     (-0.006 + i * 0.026, side * (0.158 + i * 0.007), 0.696 - i * 0.015),
                     (-0.352 + i * 0.035, side * (0.168 + i * 0.007), 0.214 + i * 0.018),
                     0.050, "flight_feather", 0.004)
        at.bone("Dağ kartalı · bacak tüyü", (-0.015, side * 0.085, 0.392),
                (0.019, side * 0.092, 0.220), 0.057, 0.049, "eagle_under")
        at.bar("Dağ kartalı · incik", (0.019, side * 0.092, 0.254),
               (0.038, side * 0.098, 0.155), 0.015, "beak")
        for toe in (-1, 0, 1):
            fy = side * 0.10 + toe * 0.027
            at.line("Dağ kartalı · dalı saran pençe",
                    [(0.033, side * 0.095, 0.170), (0.088, fy, 0.163),
                     (0.126, fy, 0.119), (0.093, fy, 0.072)], 0.009, "beak")
            at.taper("Dağ kartalı · siyah tırnak", [(0.122, fy, 0.120),
                                                   (0.095, fy, 0.070), (0.074, fy, 0.077)],
                     [0.008, 0.005, 0.001], "hoof", 6)
        at.line("Dağ kartalı · arka pençe", [(0.024, side * 0.099, 0.169),
                                           (-0.071, side * 0.099, 0.153),
                                           (-0.105, side * 0.099, 0.096)], 0.008, "beak")
    for i in range(5):
        _feather(at, "Dağ kartalı · kapalı kuyruk", (-0.145, (i - 2) * 0.019, 0.346),
                 (-0.464 + abs(i - 2) * 0.018, (i - 2) * 0.049, 0.125),
                 0.079, "flight_feather", 0.006)


def kopru_feneri(x, y, z):
    """A 2.47 m timber bridge post with a warm opal lantern and rope lashings."""
    at = _At(x, y, z)
    at.cube("Köprü feneri · taş ayak", (0, 0, 0.090), (0.35, 0.35, 0.18), "horn", 0.045)
    at.cube("Köprü feneri · ahşap direk", (0, 0, 1.160), (0.15, 0.15, 2.22), "timber", 0.023)
    for height in (0.255, 1.825):
        at.cube("Köprü feneri · pirinç kuşak", (0, 0, height),
                (0.174, 0.174, 0.085), "bronze", 0.012)
        for side in (-1, 1):
            at.sphere("Köprü feneri · perçin", (side * 0.088, 0, height),
                      (0.013, 0.022, 0.022), "bronze")
    # A carved angled brace supports the suspended lantern arm.
    at.bar("Köprü feneri · kol", (-0.035, 0, 2.254), (0.498, 0, 2.254), 0.045, "timber")
    at.bar("Köprü feneri · çapraz destek", (0.048, 0, 1.906),
           (0.352, 0, 2.247), 0.030, "timber")
    at.sphere("Köprü feneri · direk başlığı", (0, 0, 2.338), (0.11, 0.11, 0.095), "bronze")
    cx = 0.465
    hanger = [(cx + 0.047 * cos(2 * pi * i / 24), 0,
               2.219 + 0.059 * sin(2 * pi * i / 24)) for i in range(24)]
    at.line("Köprü feneri · asma halkası", hanger, 0.010, "bronze", True)

    # Six vertical bronze ribs surround solid, softly luminous opal glass.
    center = at.point((cx, 0, 1.903))
    A.cyl("Köprü feneri · opal cam", center, 0.137, 0.392, at.mat["opal"], vertices=24)
    for i in range(6):
        a = 2 * pi * i / 6
        at.bar("Köprü feneri · kafes", (cx + 0.154 * cos(a), 0.154 * sin(a), 1.689),
               (cx + 0.154 * cos(a), 0.154 * sin(a), 2.117), 0.012, "bronze")
    for height in (1.687, 2.115):
        A.cyl("Köprü feneri · altıgen çerçeve", at.point((cx, 0, height)),
              0.181, 0.050, at.mat["bronze"], vertices=6)
    A.cone("Köprü feneri · eğimli şapka", at.point((cx, 0, 2.164)),
           0.224, 0.055, 0.099, at.mat["bronze"], vertices=6)
    A.cone("Köprü feneri · alt kapak", at.point((cx, 0, 1.642)),
           0.082, 0.167, 0.063, at.mat["bronze"], vertices=6)
    at.sphere("Köprü feneri · alt damla", (cx, 0, 1.590), (0.029, 0.029, 0.046), "bronze")
    # Two neighbouring rope fibres wind about the timber, followed by a knot
    # and short hanging end; no implausible free-floating rope loops.
    for offset in (-0.009, 0.009):
        helix = []
        for i in range(97):
            t = 2 * pi * 3.25 * i / 96
            helix.append((0.100 * cos(t), 0.100 * sin(t), 0.925 + i / 96 * 0.18 + offset))
        at.line("Köprü feneri · sarılı kendir", helix, 0.012, "rope")
    knot = [(0.084 + 0.041 * sin(2 * pi * i / 36),
             -0.099 - 0.018 * sin(4 * pi * i / 36),
             0.958 + 0.058 * cos(2 * pi * i / 36)) for i in range(36)]
    at.line("Köprü feneri · halat düğümü", knot, 0.016, "rope", True)
    at.line("Köprü feneri · halat ucu", [(0.086, -0.10, 0.923),
                                        (0.111, -0.116, 0.800),
                                        (0.082, -0.104, 0.714)], 0.014, "rope")

