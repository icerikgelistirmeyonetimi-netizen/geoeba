"""Four handcrafted science pavilions; local ground is Z=0, entrance is -Y.

The exhibition objects are architectural symbols, not scientific scale models.
All placement / parenting / export is intentionally owned by the caller.
"""
from math import sin, cos, pi, sqrt
import bpy
import fen_ortak as A


def _m(key):
    return A.M[key]


def _tube(name, pts, radius, material, closed=False):
    return A.tube(name, pts, radius, _m(material), cyclic=closed)


def _line(name, a, b, radius=.035, material='brass'):
    return A.bar(name, a, b, radius, _m(material))


def _ring(name, center, rx, ry, radius=.035, material='brass', n=64):
    x, y, z = center
    return _tube(name, [(x+rx*cos(i*2*pi/n), y+ry*sin(i*2*pi/n), z)
                        for i in range(n)], radius, material, True)


def _disc(name, center, rx, ry, depth, material, n=64):
    x, y, z = center
    verts = [(x+rx*cos(i*2*pi/n), y+ry*sin(i*2*pi/n), z+s*depth/2)
             for s in (-1, 1) for i in range(n)]
    faces = [tuple(reversed(range(n))), tuple(range(n, n*2))]
    faces += [(i, (i+1) % n, (i+1) % n+n, i+n) for i in range(n)]
    return A.mesh(name, verts, faces, _m(material))


def _settle_new(before, drop):
    """Seat an existing pavilion in the shared terrain, preserving its joinery."""
    for part in set(bpy.data.objects) - before:
        # Dönen alt grupların çocukları alt kökle birlikte iner; yalnız kökün doğrudan çocukları kayar.
        if part.parent != A.ROOT:
            continue
        part.location.z -= drop


def _ground_path(name, points, width, z=-.05):
    """A narrow flush stone walk; grass remains visible around the building."""
    edges = []
    for i, (x, y) in enumerate(points):
        a, b = points[max(0, i-1)], points[min(len(points)-1, i+1)]
        dx, dy = b[0]-a[0], b[1]-a[1]
        length = sqrt(dx*dx+dy*dy)
        nx, ny = -dy/length*width/2, dx/length*width/2
        edges.extend(((x+nx, y+ny), (x-nx, y-ny)))
    count = len(edges)
    verts = [(x, y, height) for height in (z-.065, z) for x, y in edges]
    faces = []
    for i in range(len(points)-1):
        k = 2*i
        faces += [(count+k, count+k+1, count+k+3, count+k+2),
                  (k, k+2, k+3, k+1), (k, count+k, count+k+2, k+2),
                  (k+1, k+3, count+k+3, count+k+1)]
    faces += [(0, 1, count+1, count), (count-2, 2*count-2, 2*count-1, count-1)]
    return A.mesh(name, verts, faces, _m('path'))


def _axis_ring(name, center, normal, r, material, tube=.035, n=40):
    nx, ny, nz = normal
    ln = sqrt(nx*nx+ny*ny+nz*nz)
    nx, ny, nz = nx/ln, ny/ln, nz/ln
    ref = (0, 0, 1) if abs(nz) < .9 else (1, 0, 0)
    ux, uy, uz = (ny*ref[2]-nz*ref[1], nz*ref[0]-nx*ref[2],
                  nx*ref[1]-ny*ref[0])
    lu = sqrt(ux*ux+uy*uy+uz*uz)
    ux, uy, uz = ux/lu, uy/lu, uz/lu
    vx, vy, vz = ny*uz-nz*uy, nz*ux-nx*uz, nx*uy-ny*ux
    cx, cy, cz = center
    return _tube(name, [(cx+r*(cos(i*2*pi/n)*ux+sin(i*2*pi/n)*vx),
                         cy+r*(cos(i*2*pi/n)*uy+sin(i*2*pi/n)*vy),
                         cz+r*(cos(i*2*pi/n)*uz+sin(i*2*pi/n)*vz))
                        for i in range(n)], tube, material, True)


def _stairs(prefix, x, y, width, count=4, step=.13, tread=.28):
    # Back edges align: the last, tallest tread meets the entrance plinth.
    for i in range(count):
        h = (i+1)*step
        A.cube(prefix+'_tread_%02d' % i, (x, y+i*tread, h/2),
               (width, tread+.025, h), _m('stone'), bevel=.025)
        A.cube(prefix+'_nosing_%02d' % i, (x, y+i*tread-tread/2+.024, h+.009),
               (width+.035, .045, .027), _m('cream'), bevel=.009)


def _column(prefix, x, y, bottom, height, radius=.10, material='cream'):
    A.cyl(prefix+'_foot', (x, y, bottom+.065), radius*1.42, .13, _m('stone'), 24)
    A.cyl(prefix+'_shaft', (x, y, bottom+height/2), radius, height, _m(material), 24)
    A.cyl(prefix+'_cap', (x, y, bottom+height-.045), radius*1.35, .105, _m('cream'), 24)
    A.cyl(prefix+'_collar', (x, y, bottom+height-.15), radius*1.12, .045, _m('brass'), 24)


def _curved_glazing(prefix, cx, cy, rx, ry, bottom, top, segments,
                    start=0, end=2*pi, skip=()):
    """Faceted translucent curtain wall, with separate substantial mullions."""
    for i in range(segments):
        a = start+(end-start)*i/segments
        b = start+(end-start)*(i+1)/segments
        if i in skip:
            continue
        p = (cx+rx*cos(a), cy+ry*sin(a))
        q = (cx+rx*cos(b), cy+ry*sin(b))
        A.mesh(prefix+'_glass_%02d' % i,
               [(p[0], p[1], bottom), (q[0], q[1], bottom),
                (q[0], q[1], top), (p[0], p[1], top)], [(0, 1, 2, 3)], _m('glass'))
        _line(prefix+'_mullion_%02d' % i, (*p, bottom), (*p, top), .048, 'cream')
        _line(prefix+'_sill_%02d' % i, (*p, bottom), (*q, bottom), .045, 'brass')
        _line(prefix+'_transom_%02d' % i, (*p, bottom+(top-bottom)*.7),
              (*q, bottom+(top-bottom)*.7), .027, 'brass')
    _ring(prefix+'_head', (cx, cy, top), rx, ry, .065, 'cream')


def _planter(prefix, x, y, scale=.5, z=0):
    A.cone(prefix+'_pot', (x, y, z+.23*scale), .40*scale, .49*scale,
           .46*scale, _m('stone'), 24)
    A.cyl(prefix+'_earth', (x, y, z+.47*scale), .43*scale, .055*scale, _m('soil'), 24)
    for i in range(5):
        a = i*2*pi/5
        tip = (x+.30*scale*cos(a), y+.30*scale*sin(a), z+(1.12+.09*(i%2))*scale)
        _line(prefix+'_stem_%d' % i, (x, y, z+.46*scale), tip, .018*scale, 'leaf')
        leaf = A.sphere(prefix+'_leaf_%d' % i,
                        (x+.20*scale*cos(a), y+.20*scale*sin(a), z+.84*scale),
                        (.13*scale, .24*scale, .07*scale), _m('leaf2' if i%2 else 'leaf'))
        leaf.rotation_euler = (.45, .18, a)


def _leaf_roof(prefix, origin, angle, length, width, rise, material='teal'):
    """Thick, doubly curved leaf shell, with a brass ridge and edge piping."""
    ox, oy, oz = origin
    n = 14
    top, bottom, ridge, left, right = [], [], [], [], []
    for i in range(n+1):
        t = i/n
        # Slightly blunt ends avoid degenerate faces while keeping a leaf tip.
        w = width*(.03+.97*sin(pi*t)**.82)
        midz = oz+rise*sin(pi*t*.85)+.18*t
        px, py = ox+length*t*cos(angle), oy+length*t*sin(angle)
        for j in (-1, 0, 1):
            xx, yy = px-j*w*sin(angle), py+j*w*cos(angle)
            zz = midz-abs(j)*(.24+.12*sin(pi*t))
            top.append((xx, yy, zz))
            bottom.append((xx, yy, zz-.10))
        ridge.append((px, py, midz+.045))
        left.append(top[-3])
        right.append(top[-1])
    count = len(top)
    faces = []
    for i in range(n):
        for j in range(2):
            k = i*3+j
            faces += [(k, k+3, k+4, k+1), (count+k+1, count+k+4, count+k+3, count+k)]
        for j in (0, 2):
            k = i*3+j
            faces.append((k, k+3, count+k+3, count+k))
    faces += [(0, 1, 2, count+2, count+1, count),
              (n*3, count+n*3, count+n*3+1, count+n*3+2, n*3+2, n*3+1)]
    A.mesh(prefix+'_shell', top+bottom, faces, _m(material))
    _tube(prefix+'_vein', ridge, .040, 'brass')
    _tube(prefix+'_left_edge', left, .026, 'cream')
    _tube(prefix+'_right_edge', right, .026, 'cream')
    for i in (3, 6, 9, 12):
        _line(prefix+'_rib_L%d' % i, ridge[max(0, i-2)], left[i], .022, 'mint')
        _line(prefix+'_rib_R%d' % i, ridge[max(0, i-2)], right[i], .022, 'mint')


def build_3():
    """Doğa ve Duyular Evi: an organic leaf canopy and an observation greenhouse."""
    before = set(bpy.data.objects)
    cx, cy = -1.00, .38
    _disc('S3_buried_house_footing', (cx, cy+.10, .18), 1.94, 1.52, .48, 'foundation')
    _disc('S3_house_plinth', (cx, cy+.10, .56), 1.90, 1.49, .48, 'foundation')
    _ring('S3_plinth_brass', (cx, cy+.10, .80), 1.91, 1.50, .033)
    _curved_glazing('S3_leaf_house', cx, cy+.1, 1.85, 1.46, .80, 2.84, 18,
                    skip=(12, 13, 14))
    # Quiet rear wall gives the glazed conservatory a readable silhouette.
    for i in range(6):
        a = .10+i*pi/5.5
        x, y = cx+1.72*cos(a), cy+.1+1.38*sin(a)
        p = A.cube('S3_rear_limestone_%d' % i, (x, y, 1.79), (.62, .16, 1.94),
                   _m(('cream', 'yellow', 'cream', 'coral', 'cream', 'blue')[i]))
        p.rotation_euler[2] = a-pi/2
    # Colored ceramic fins give the child-scale facade a cheerful rhythm.
    # The clear door bay and the larger areas of glass remain uninterrupted.
    for i, a in enumerate((-.27, -.59, -.91, -2.23, -2.55, -2.87)):
        x, y = cx+1.91*cos(a), cy+.1+1.51*sin(a)
        fin = A.cube('S3_colored_facade_fin_%d' % i, (x, y, 1.87),
                     (.31, .12, 1.91), _m(('coral', 'yellow', 'blue')[i % 3]), .055)
        fin.rotation_euler[2] = a-pi/2
        for z in (1.02, 2.72):
            A.sphere('S3_fin_fixing_%d_%s' % (i, z),
                     (x+.072*cos(a), y+.072*sin(a), z), (.026, .026, .026), _m('brass'))
    # Slender glazing bars and visible bedding joints reward a closer view.
    for i in range(18):
        if i in (12, 13, 14):
            continue
        a, b = i*2*pi/18, (i+1)*2*pi/18
        p = (cx+1.856*cos(a), cy+.1+1.466*sin(a))
        q = (cx+1.856*cos(b), cy+.1+1.466*sin(b))
        mid = ((p[0]+q[0])/2, (p[1]+q[1])/2)
        _line('S3_fine_glazing_bar_%d' % i, (*mid, .86), (*mid, 2.79), .018, 'brass')
        _line('S3_low_glazing_rail_%d' % i, (*p, 1.38), (*q, 1.38), .016, 'cream')
    for z in (.45, .66):
        _tube('S3_stone_bed_joint_'+str(z), [(cx+1.906*cos(t*pi/40),
               cy+.1+1.496*sin(t*pi/40), z) for t in range(41, 80)], .008, 'stone')
    for i in range(12):
        a = pi+(i+.5)*pi/12
        z0, z1 = (.34, .45) if i % 2 else (.46, .65)
        _line('S3_stone_vertical_joint_%d' % i,
              (cx+1.906*cos(a), cy+.1+1.496*sin(a), z0),
              (cx+1.906*cos(a), cy+.1+1.496*sin(a), z1), .008, 'stone')
    for i, a in enumerate((-.95, -2.14, .32, 2.72)):
        x, y = cx+1.72*cos(a), cy+.1+1.32*sin(a)
        _column('S3_branch_column_%d' % i, x, y, .78, 2.22, .085, 'wood')
        _line('S3_branch_fork_a_%d' % i, (x, y, 2.39), (x+.31, y, 3.19), .055, 'wood')
        _line('S3_branch_fork_b_%d' % i, (x, y, 2.43), (x-.25, y+.12, 3.12), .055, 'wood')
    _leaf_roof('S3_leaf_west', (cx+.1, cy+.65, 3.05), pi*1.06, 2.88, 1.17, .65, 'teal')
    _leaf_roof('S3_leaf_east', (cx-.4, cy+.57, 3.13), -.10, 2.59, 1.11, .79, 'mint')
    _leaf_roof('S3_leaf_rear', (cx-.35, cy-.85, 3.13), pi/2, 2.86, 1.02, 1.10, 'leaf')
    # Large circular botanical oculus framed like a magnifying lens.
    _axis_ring('S3_botanical_oculus', (cx-.02, cy-1.435, 2.18), (0, 1, 0), .42, 'brass', .065)
    A.sphere('S3_oculus_leaf', (cx-.02, cy-1.445, 2.17), (.18, .038, .31), _m('leaf2'))
    _line('S3_oculus_vein', (cx-.02, cy-1.49, 1.95), (cx+.04, cy-1.49, 2.37), .015, 'cream')
    # Recessed double door and approach; it remains visible beneath the roof.
    A.cube('S3_door_frame', (cx, cy-1.42, 1.43), (1.10, .12, 1.62), _m('yellow'))
    for k in (-1, 1):
        A.cube('S3_door_glass_'+str(k), (cx+k*.255, cy-1.495, 1.46), (.46, .025, 1.44), _m('glass'), .008)
        _line('S3_door_handle_'+str(k), (cx+k*.075, cy-1.56, 1.24),
              (cx+k*.075, cy-1.56, 1.51), .018, 'brass')
    _stairs('S3_entry', cx, -2.48, 1.36, 5, .145, .245)
    for i, col in enumerate(('blue', 'coral', 'yellow', 'mint', 'blue')):
        A.cube('S3_entry_color_riser_%d' % i, (cx, -2.614+i*.245, (i+1)*.145-.054),
               (1.23, .014, .058), _m(col), .010)
    A.cube('S3_door_small_plaque', (cx+.40, cy-1.525, 1.88), (.15, .025, .12), _m('brass'), .016)
    for k in (-1, 1):
        _line('S3_entry_rail_'+str(k), (cx+k*.83, -2.5, .51), (cx+k*.83, -1.2, 1.14), .035, 'brass')
        for j in (0, 1):
            yy = -2.5+j*1.3
            _line('S3_rail_post_%s_%s' % (k, j), (cx+k*.83, yy, .12+j*.5),
                  (cx+k*.83, yy, .51+j*.63), .031, 'brass')
    # A separate little greenhouse grows out of the right-hand garden.
    gx, gy = 2.46, .64
    _disc('S3_greenhouse_base', (gx, gy, .18), 1.10, 1.21, .52, 'foundation', 48)
    _disc('S3_greenhouse_floor', (gx, gy, .46), 1.07, 1.19, .06, 'terracotta', 48)
    _curved_glazing('S3_greenhouse', gx, gy, 1.06, 1.18, .49, 2.20, 14)
    A.dome('S3_greenhouse_glass_roof', (gx, gy, 2.20), 1.11, .80, _m('glass'), 36, 10)
    for i in range(8):
        a = i*pi/4
        pts = [(gx+1.11*cos(t*pi/2/16)*cos(a), gy+1.11*cos(t*pi/2/16)*sin(a),
                2.20+.80*sin(t*pi/2/16)) for t in range(17)]
        _tube('S3_greenhouse_roof_rib_%d' % i, pts, .035, 'cream')
    for i in range(14):
        a, b = i*2*pi/14, (i+1)*2*pi/14
        p = (gx+1.064*cos(a), gy+1.184*sin(a), 1.26)
        q = (gx+1.064*cos(b), gy+1.184*sin(b), 1.26)
        _line('S3_greenhouse_lower_glass_bar_%d' % i, p, q, .014, 'cream')
    A.sphere('S3_greenhouse_finial', (gx, gy, 3.045), (.105, .105, .14), _m('brass'))
    for i, (x, y) in enumerate(((2.09, .74), (2.75, .8), (2.46, 1.31))):
        _planter('S3_specimen_%d' % i, x, y, .70, .49)
    # Tiny botanical workbench, containing a seed tray and a microscope silhouette.
    A.cube('S3_observation_table', (gx, gy-.3, 1.09), (1.20, .57, .12), _m('wood'))
    for k in (-1, 1):
        _line('S3_table_leg_'+str(k), (gx+k*.45, gy-.3, .49), (gx+k*.45, gy-.3, 1.07), .035, 'brass')
    A.cube('S3_seed_tray', (gx-.23, gy-.32, 1.18), (.47, .31, .085), _m('terracotta'), .025)
    for i in range(3):
        A.sphere('S3_seedling_%d' % i, (gx-.39+i*.14, gy-.32, 1.28), (.06, .075, .10), _m('leaf2'))
    _tube('S3_magnifier_arm', [(gx+.3, gy-.3, 1.18), (gx+.40, gy-.3, 1.49), (gx+.29, gy-.3, 1.67)], .037, 'brass')
    _axis_ring('S3_magnifier_lens', (gx+.23, gy-.3, 1.67), (0, 0, 1), .17, 'cream', .025)
    # Sound garden: bright resonant tubes beneath a small segmented sunshade.
    sx, sy = 1.45, -1.91
    A.cube('S3_sound_garden_bench', (sx, sy, .24), (1.74, .50, .20), _m('blue'))
    A.cube('S3_sound_bench_edge', (sx, sy-.255, .28), (1.65, .035, .055), _m('yellow'), .014)
    for i in range(5):
        x = sx-.62+i*.31
        h = .68+i*.17
        _tube('S3_sound_pipe_%d' % i, [(x, sy, .35), (x, sy, h+.34),
              (x, sy-.03, h+.48), (x, sy-.16, h+.53), (x, sy-.27, h+.46)], .092,
              ('coral', 'yellow', 'blue', 'coral', 'mint')[i])
        _axis_ring('S3_sound_pipe_lip_%d' % i, (x, sy-.27, h+.46), (0, 1, -.2), .101, 'cream', .021, 24)
        _axis_ring('S3_sound_pipe_clamp_%d' % i, (x, sy, .52), (0, 0, 1), .101, 'brass', .018, 24)
    for side in (-1, 1):
        x = sx+side*.79
        _line('S3_sunshade_post_'+str(side), (x, sy+.49, .05), (x, sy+.49, 2.39), .052, 'wood')
        A.cyl('S3_sunshade_post_shoe_'+str(side), (x, sy+.49, .16), .085, .22, _m('yellow'), 20)
    for i in range(8):
        start, end = i*pi/4, (i+1)*pi/4
        verts = []
        for radius, height in ((.035, 2.69), (.58, 2.57), (1.055, 2.31)):
            for j in range(5):
                a = start+(end-start)*j/4
                verts.append((sx+radius*cos(a), sy+radius*sin(a), height))
        faces = [(r*5+j, r*5+j+1, (r+1)*5+j+1, (r+1)*5+j)
                 for r in range(2) for j in range(4)]
        A.mesh('S3_sunshade_color_segment_%d' % i, verts, faces,
               _m(('yellow', 'coral', 'blue', 'mint')[i % 4]))
        edge = [(sx+1.055*cos(start+(end-start)*j/8),
                 sy+1.055*sin(start+(end-start)*j/8), 2.31) for j in range(9)]
        _tube('S3_sunshade_scallop_%d' % i, edge, .025, 'cream')
        _tube('S3_sunshade_rib_%d' % i,
              [(sx, sy, 2.70), (sx+.58*cos(start), sy+.58*sin(start), 2.58),
               (sx+1.055*cos(start), sy+1.055*sin(start), 2.32)], .018, 'cream')
    A.sphere('S3_sunshade_finial', (sx, sy, 2.75), (.08, .08, .105), _m('yellow'))
    # Flama ipi ve bayraklar kaldırıldı: avlu sade kalır.
    # A single hand-turned color wheel makes the small courtyard a science park.
    wx, wy, wz = -2.86, -2.15, 1.09
    A.cyl('S3_color_wheel_foot', (wx, wy, .10), .28, .14, _m('cream'), 32)
    _line('S3_color_wheel_support', (wx, wy+.10, .16), (wx, wy+.10, 1.15), .065, 'teal')
    for i in range(8):
        verts = [(wx, wy, wz)]
        for j in range(7):
            a = (i+j/6)*pi/4
            verts.append((wx+.43*cos(a), wy, wz+.43*sin(a)))
        A.mesh('S3_color_wheel_sector_%d' % i, verts,
               [(0, j, j+1) for j in range(1, 7)], _m(('yellow', 'coral', 'blue', 'mint')[i % 4]))
    _axis_ring('S3_color_wheel_rim', (wx, wy, wz), (0, 1, 0), .445, 'cream', .038, 48)
    _line('S3_color_wheel_axle', (wx, wy-.07, wz), (wx, wy+.19, wz), .065, 'brass')
    _line('S3_color_wheel_crank', (wx, wy-.09, wz), (wx+.16, wy-.09, wz-.12), .035, 'brass')
    A.sphere('S3_color_wheel_handle', (wx+.16, wy-.12, wz-.12), (.06, .085, .06), _m('coral'))
    # Light through a prism, expressed as slender colored paths in paving.
    px, py = 3.39, -1.61
    A.cyl('S3_prism_pedestal', (px, py, .40), .42, .65, _m('cream'), 32)
    A.mesh('S3_glass_prism', [(px-.21, py-.20, .73), (px+.25, py-.20, .73),
           (px, py-.20, 1.28), (px-.21, py+.18, .73), (px+.25, py+.18, .73),
           (px, py+.18, 1.28)], [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)], _m('glass'))
    for i, col in enumerate(('coral', 'yellow', 'mint', 'blue')):
        _line('S3_prism_ray_%d' % i, (px, py-.12, .055),
              (px-.47+i*.28, py-.97, .055), .030, col)
    # Avlu saksıları, eğreltiler ve çiçekler kaldırıldı: yapı çevresi sade kalır.
    _settle_new(before, .22)
    _ground_path('S3_natural_entry_walk', [(cx, -3.28), (cx, -2.38), (cx, -1.30)], 1.20)
    _ground_path('S3_botanical_walk', [(cx, -2.75), (.08, -2.72), (1.04, -2.31),
                                      (2.28, -1.39), (2.46, -.66)], .60)


def _continent(prefix, center, radius, coords, material='leaf2'):
    # Small raised geographic patches, made from latitude/longitude vertices.
    cx, cy, cz = center
    border = []
    for lon, lat in coords:
        la, lo = lat*pi/180, lon*pi/180
        border.append((cos(la)*sin(lo), -cos(la)*cos(lo), sin(la)))
    average = tuple(sum(p[k] for p in border)/len(border) for k in range(3))
    size = sqrt(sum(v*v for v in average))
    middle = tuple(v/size for v in average)
    verts, faces = [], []
    # Subdivide and project each patch back onto the globe: a flat polygon
    # would disappear inside the ocean sphere over a continent-sized arc.
    n = 6
    def projected(a, b, c, u, v):
        pt = tuple(a[k]*(1-u-v)+b[k]*u+c[k]*v for k in range(3))
        length = sqrt(sum(q*q for q in pt))
        return tuple(center[k]+radius*pt[k]/length for k in range(3))
    for edge, b in enumerate(border):
        c = border[(edge+1) % len(border)]
        index = {}
        for i in range(n+1):
            for j in range(n+1-i):
                index[i, j] = len(verts)
                verts.append(projected(middle, b, c, i/n, j/n))
        for i in range(n):
            for j in range(n-i):
                faces.append((index[i, j], index[i+1, j], index[i, j+1]))
                if j < n-i-1:
                    faces.append((index[i+1, j], index[i+1, j+1], index[i, j+1]))
    A.mesh(prefix, verts, faces, _m(material))


def _earth(prefix, center, r):
    A.sphere(prefix+'_ocean', center, (r, r, r), _m('blue'))
    _continent(prefix+'_africa', center, r*1.012,
               [(-15, 31), (3, 37), (29, 31), (42, 11), (33, -10), (18, -35), (4, -17), (-3, 4), (-18, 13)])
    _continent(prefix+'_europe_asia', center, r*1.015,
               [(-12, 37), (-10, 57), (17, 70), (44, 58), (76, 67), (115, 50), (99, 15),
                (71, 11), (47, 28), (29, 37), (13, 35)])
    _continent(prefix+'_south_america', center, r*1.014,
               [(-79, 7), (-63, 11), (-38, -6), (-48, -22), (-69, -55), (-75, -24)])
    _continent(prefix+'_north_america', center, r*1.013,
               [(-126, 54), (-104, 71), (-69, 62), (-58, 48), (-83, 28), (-93, 14), (-112, 31)])
    _continent(prefix+'_australia', center, r*1.012,
               [(114, -20), (132, -12), (153, -24), (144, -40), (116, -33)])
    cx, cy, cz = center
    for lat in (-45, 0, 45):
        la = lat*pi/180
        _ring(prefix+'_latitude_'+str(lat), (cx, cy, cz+r*sin(la)), r*cos(la)*1.018,
              r*cos(la)*1.018, .012, 'mint', 48)
    for i in range(3):
        ang = i*pi/3
        _tube(prefix+'_longitude_%d' % i,
              [(cx+r*1.019*sin(t*2*pi/64)*cos(ang),
                cy+r*1.019*sin(t*2*pi/64)*sin(ang), cz+r*1.019*cos(t*2*pi/64))
               for t in range(64)], .012, 'mint', True)


def build_4():
    """Dünya ve Madde Pavyonu: geological rotunda, magnet portal, simple circuit."""
    before = set(bpy.data.objects)
    cx, cy = -.75, .35
    _disc('S4_buried_rotunda_footing', (cx, cy, .12), 2.03, 2.03, .40, 'foundation')
    # Thin geological strata alternate with broad limestone layers.
    for i, (z, dep, radius, material) in enumerate(((.42, .24, 2.02, 'stone'),
              (.59, .10, 2.00, 'terracotta'), (.74, .20, 1.97, 'cream'),
              (.875, .07, 1.99, 'mint'), (.98, .14, 1.97, 'stone'))):
        A.cyl('S4_geological_stratum_%d' % i, (cx, cy, z), radius, dep, _m(material), 64)
    for i in range(24):
        a = (i+.5)*pi/12
        for band, (z0, z1, radius) in enumerate(((.64, .83, 1.977), (.91, 1.046, 1.977))):
            offset = (pi/24) if band else 0
            _line('S4_ashlar_joint_%d_%d' % (band, i),
                  (cx+radius*cos(a+offset), cy+radius*sin(a+offset), z0),
                  (cx+radius*cos(a+offset), cy+radius*sin(a+offset), z1), .007, 'stone')
    _curved_glazing('S4_rotunda', cx, cy, 1.91, 1.91, 1.045, 3.08, 20, skip=(14, 15))
    for i in range(20):
        if i in (14, 15):
            continue
        a, b = i*pi/10, (i+1)*pi/10
        p = (cx+1.917*cos(a), cy+1.917*sin(a))
        q = (cx+1.917*cos(b), cy+1.917*sin(b))
        midpoint = ((p[0]+q[0])/2, (p[1]+q[1])/2)
        _line('S4_window_fine_vertical_%d' % i, (*midpoint, 1.10), (*midpoint, 3.03), .017, 'brass')
        _line('S4_window_fine_lower_%d' % i, (*p, 1.72), (*q, 1.72), .016, 'cream')
    # Engaged limestone columns make this a museum, not an empty drum.
    for i in range(12):
        a = i*2*pi/12
        if i == 9:
            continue
        _column('S4_rotunda_order_%d' % i, cx+1.97*cos(a), cy+1.97*sin(a), 1.035, 2.05, .115)
    A.cyl('S4_architrave', (cx, cy, 3.15), 2.10, .22, _m('cream'), 64)
    A.cyl('S4_copper_frieze', (cx, cy, 3.285), 2.10, .065, _m('teal'), 64)
    A.cone('S4_cornice', (cx, cy, 3.39), 2.23, 2.08, .17, _m('cream'), 64)
    A.cone('S4_shallow_roof', (cx, cy, 3.59), 2.12, 1.40, .27, _m('teal'), 64)
    _ring('S4_roof_eave', (cx, cy, 3.475), 2.16, 2.16, .05, 'brass')
    for i in range(24):
        a = i*pi/12
        _line('S4_copper_roof_fine_seam_%d' % i,
              (cx+1.42*cos(a), cy+1.42*sin(a), 3.726),
              (cx+2.11*cos(a), cy+2.11*sin(a), 3.467), .016, 'brass')
    for i in range(18):
        a = i*pi/9
        x, y = cx+2.095*cos(a), cy+2.095*sin(a)
        _line('S4_cornice_stone_joint_%d' % i, (x, y, 3.05), (x, y, 3.24), .007, 'stone')
    # The geological globe is held in an inclined brass scientific cradle.
    A.cyl('S4_globe_drum', (cx, cy, 3.88), .70, .38, _m('cream'), 40)
    A.cyl('S4_globe_drum_cap', (cx, cy, 4.08), .78, .09, _m('brass'), 40)
    globe = (cx, cy, 5.10)
    dunya_once = set(bpy.data.objects)
    _earth('S4_world', globe, 1.06)
    # Küre kutup ekseninde (enlem halkalarına dik) döner; pirinç eğik çubuk sabit kalır (web: üzerine gelince).
    A.donen_grup('grade_4_dunya', globe, dunya_once)
    _axis_ring('S4_globe_meridian_frame', globe, (.0, 1, .35), 1.25, 'brass', .057, 64)
    _line('S4_globe_tilt_axis', (cx, cy-.42, 3.88), (cx, cy+.42, 6.28), .043, 'brass')
    A.sphere('S4_globe_north_finial', (cx, cy+.42, 6.28), (.09, .09, .09), _m('cream'))
    # Two-tone horseshoe magnet is the building's unmistakable entrance arch.
    my = cy-2.04
    left = [(cx-.77, my, 1.03), (cx-.77, my, 2.12)]
    left += [(cx+.77*cos(pi-j*pi/2/14), my, 2.12+.77*sin(pi-j*pi/2/14)) for j in range(15)]
    right = [(cx+.77*cos(pi/2-j*pi/2/14), my, 2.12+.77*sin(pi/2-j*pi/2/14)) for j in range(15)]
    right += [(cx+.77, my, 1.03)]
    _tube('S4_magnet_north_arch', left, .235, 'coral')
    _tube('S4_magnet_south_arch', right, .235, 'blue')
    for s, label in ((-1, 'N'), (1, 'S')):
        A.cube('S4_magnet_pole_'+label, (cx+s*.77, my, 1.095), (.51, .51, .31), _m('white'), .045)
        A.text('S4_magnet_mark_'+label, label, (cx+s*.77, my-.269, 1.48), .245, _m('white'))
        for zz in (1.31, 2.08):
            A.sphere('S4_pole_fixing_%s_%s' % (label, zz), (cx+s*.77, my-.241, zz),
                     (.026, .020, .026), _m('brass'))
    # A sunny entrance fascia is a broad, readable color accent at child level.
    A.cube('S4_yellow_entry_canopy', (cx, my-.08, 3.24), (2.44, .83, .12), _m('yellow'), .09)
    A.cube('S4_entry_canopy_cream_edge', (cx, my-.51, 3.245), (2.34, .035, .046), _m('cream'), .014)
    for side in (-1, 1):
        _line('S4_entry_canopy_bracket_'+str(side), (cx+side*1.05, my+.19, 2.71),
              (cx+side*1.05, my-.41, 3.18), .028, 'brass')
    # Inlaid energy insignia, kept small enough to serve the architecture.
    _line('S4_energy_badge_disc', (cx, my-.534, 3.26), (cx, my-.557, 3.26), .167, 'teal')
    A.mesh('S4_energy_badge_lightning',
           [(cx+.02, my-.572, 3.394), (cx-.085, my-.572, 3.245),
            (cx-.004, my-.572, 3.245), (cx-.024, my-.572, 3.13),
            (cx+.094, my-.572, 3.282), (cx+.014, my-.572, 3.282)],
           [(0, 1, 2, 3, 4, 5)], _m('yellow'))
    A.cube('S4_entrance', (cx, cy-1.915, 1.72), (1.13, .08, 1.40), _m('glass'))
    _line('S4_entrance_split', (cx, cy-1.97, 1.02), (cx, cy-1.97, 2.42), .027, 'brass')
    for side in (-1, 1):
        A.cube('S4_entry_handle_backplate_'+str(side), (cx+side*.093, cy-1.982, 1.67),
               (.055, .018, .30), _m('cream'), .010)
        _line('S4_entry_pull_handle_'+str(side), (cx+side*.093, cy-2.02, 1.58),
              (cx+side*.093, cy-2.02, 1.78), .020, 'brass')
    _stairs('S4_museum_steps', cx, -2.91, 1.49, 6, .17, .20)
    for i, col in enumerate(('blue', 'yellow', 'coral', 'blue', 'yellow', 'coral')):
        A.cube('S4_color_step_riser_%d' % i, (cx, -3.025+i*.20, (i+1)*.17-.064),
               (1.37, .014, .066), _m(col), .009)
        for side in (-1, 1):
            A.cube('S4_step_side_inlay_%d_%d' % (i, side),
                   (cx+side*.665, -2.91+i*.20, (i+1)*.17+.012),
                   (.075, .16, .014), _m(col), .005)
    # Terraced geological samples are part of the side courtyard.
    for i, (x, y) in enumerate(((2.34, 1.80), (2.82, 1.65), (3.23, 1.32))):
        for j, material in enumerate(('stone', 'terracotta', 'cream', 'mint')):
            A.cube('S4_sample_%d_layer_%d' % (i, j), (x, y, .10+j*.15),
                   (.48, .67, .15), _m(material), .035)
        A.sphere('S4_rock_%d' % i, (x, y, .77), (.29, .26, .23), _m('stone'))
    # Ammonite relief embedded into a low independent stone specimen wall.
    A.cube('S4_fossil_slab', (2.44, .75, .90), (1.19, .27, 1.62), _m('cream'), .12)
    spiral = []
    for i in range(70):
        t = i/69*pi*4.6
        r = .032+.028*t
        spiral.append((2.44+r*cos(t), .594, .96+r*sin(t)))
    _tube('S4_ammonite_relief', spiral, .029, 'brass')
    for j in range(33, 69, 3):
        t = j/69*pi*4.6
        radius = .032+.028*t
        _line('S4_fossil_chamber_%d' % j,
              (2.44+(radius-.075)*cos(t), .589, .96+(radius-.075)*sin(t)),
              (2.44+(radius-.014)*cos(t+.035), .589, .96+(radius-.014)*sin(t+.035)), .012, 'brass')
    # An actual closed visible circuit: battery, two conductors, bulb and switch.
    ex, ey = 2.49, -1.31
    _disc('S4_circuit_plaza', (ex, ey, .15), 1.18, .95, .06, 'path', 48)
    for i, col in enumerate(('coral', 'yellow', 'blue')):
        rx, ry = 1.18-i*.11, .95-i*.11
        _tube('S4_play_courtyard_stripe_%d' % i,
              [(ex+rx*cos(pi+q*pi/36), ey+ry*sin(pi+q*pi/36), .187)
               for q in range(37)], .026, col)
    A.cube('S4_circuit_table', (ex, ey, .93), (1.93, 1.24, .14), _m('wood'), .13)
    A.cube('S4_circuit_table_bright_edge', (ex, ey-.625, .954), (1.74, .035, .065), _m('yellow'), .012)
    for s in (-1, 1):
        A.cube('S4_circuit_pedestal_'+str(s), (ex+s*.70, ey, .48), (.22, .66, .79), _m('cream'))
    # Battery lies along X, with visibly distinct terminals.
    _line('S4_cell_body', (ex-.73, ey+.19, 1.12), (ex-.20, ey+.19, 1.12), .14, 'teal')
    _line('S4_cell_positive', (ex-.77, ey+.19, 1.12), (ex-.72, ey+.19, 1.12), .095, 'brass')
    _line('S4_cell_negative', (ex-.20, ey+.19, 1.12), (ex-.16, ey+.19, 1.12), .13, 'brass')
    for i, xx in enumerate((ex-.72, ex-.21)):
        _axis_ring('S4_battery_end_rim_%d' % i, (xx, ey+.19, 1.12), (1, 0, 0), .144, 'brass', .015, 28)
    A.text('S4_battery_positive_mark', '+', (ex-.59, ey+.043, 1.14), .115, _m('cream'))
    A.cyl('S4_lamp_socket', (ex+.48, ey+.16, 1.13), .17, .22, _m('brass'), 24)
    A.sphere('S4_lamp', (ex+.48, ey+.16, 1.40), (.24, .24, .29), _m('yellow'))
    for i in range(4):
        _ring('S4_lamp_socket_thread_%d' % i, (ex+.48, ey+.16, 1.052+i*.045),
              .177, .177, .011, 'cream', 32)
    _tube('S4_lamp_fine_filament', [(ex+.40, ey-.064, 1.34), (ex+.42, ey-.077, 1.48),
          (ex+.46, ey-.077, 1.43), (ex+.50, ey-.077, 1.49), (ex+.55, ey-.064, 1.35)], .012, 'brass')
    A.cube('S4_switch_base', (ex+.05, ey-.34, 1.05), (.42, .24, .08), _m('cream'))
    _line('S4_switch_closed', (ex-.09, ey-.34, 1.12), (ex+.18, ey-.34, 1.12), .035, 'brass')
    for i, xx in enumerate((ex-.09, ex+.18)):
        A.cyl('S4_switch_terminal_%d' % i, (xx, ey-.34, 1.098), .048, .032, _m('brass'), 6)
        _line('S4_switch_screw_slot_%d' % i, (xx-.025, ey-.34, 1.117), (xx+.025, ey-.34, 1.117), .006, 'navy')
    _tube('S4_circuit_red_wire', [(ex-.77, ey+.19, 1.12), (ex-.90, ey+.19, 1.09),
          (ex-.90, ey-.34, 1.025), (ex-.09, ey-.34, 1.09)], .025, 'coral')
    _tube('S4_circuit_switch_to_lamp', [(ex+.18, ey-.34, 1.10), (ex+.69, ey-.34, 1.025),
          (ex+.69, ey+.16, 1.025), (ex+.48, ey+.16, 1.09)], .025, 'coral')
    _tube('S4_circuit_blue_wire', [(ex-.16, ey+.19, 1.12), (ex-.02, ey+.39, 1.035),
          (ex+.48, ey+.39, 1.035), (ex+.48, ey+.16, 1.10)], .025, 'navy')
    # Avlu saksıları kaldırıldı: yapı çevresi sade kalır.
    _settle_new(before, .22)
    _ground_path('S4_natural_entry_walk', [(cx, -3.30), (cx, -2.66), (cx, -1.83)], 1.43)
    _ground_path('S4_courtyard_walk', [(cx, -2.79), (.38, -2.68), (1.48, -2.24),
                                      (2.44, -1.91)], .69)


def _dome_panel(prefix, center, radius, height, start, end, material='teal', rings=13):
    cx, cy, cz = center
    ns = 4
    verts = []
    for j in range(rings+1):
        phi = .035+(pi/2-.035)*j/rings
        for k in range(ns+1):
            theta = start+(end-start)*k/ns
            verts.append((cx+radius*sin(phi)*cos(theta), cy+radius*sin(phi)*sin(theta),
                          cz+height*cos(phi)))
    faces = [(j*(ns+1)+k, j*(ns+1)+k+1, (j+1)*(ns+1)+k+1, (j+1)*(ns+1)+k)
             for j in range(rings) for k in range(ns)]
    A.mesh(prefix+'_copper_panel', verts, faces, _m(material))
    for side, angle in enumerate((start,)):
        pts = [(cx+radius*sin(.025+(pi/2-.025)*j/24)*cos(angle),
                cy+radius*sin(.025+(pi/2-.025)*j/24)*sin(angle),
                cz+height*cos(.025+(pi/2-.025)*j/24)) for j in range(25)]
        _tube(prefix+'_standing_seam_%d' % side, pts, .026, 'brass')


def build_5():
    """Gökyüzü Gözlemevi: an opening copper dome, telescope and Sun–Earth–Moon."""
    before = set(bpy.data.objects)
    cx, cy = -.62, .46
    A.cyl('S5_buried_observatory_footing', (cx, cy, .07), 2.05, .50, _m('foundation'), 64)
    A.cyl('S5_main_drum', (cx, cy, 1.54), 1.93, 2.44, _m('cream'), 64)
    A.cyl('S5_lower_belt', (cx, cy, .54), 2.02, .17, _m('stone'), 64)
    A.cyl('S5_lower_brass_line', (cx, cy, .685), 1.97, .035, _m('brass'), 64)
    # Tall recessed dark teal windows and limestone jambs.
    for i in range(12):
        a = i*2*pi/12
        if i == 9:
            continue
        x, y = cx+1.947*cos(a), cy+1.947*sin(a)
        window = A.cube('S5_window_%02d' % i, (x, y, 1.78), (.46, .038, 1.31), _m('glass'), .025)
        window.rotation_euler[2] = a-pi/2
        tangent = (-sin(a), cos(a))
        for side in (-1, 1):
            _line('S5_window_jamb_%d_%d' % (i, side),
                  (x+side*.27*tangent[0], y+side*.27*tangent[1], 1.08),
                  (x+side*.27*tangent[0], y+side*.27*tangent[1], 2.48), .045, 'stone')
        _line('S5_window_mid_%d' % i, (x-.23*tangent[0], y-.23*tangent[1], 1.87),
              (x+.23*tangent[0], y+.23*tangent[1], 1.87), .021, 'brass')
    for i in range(8):
        a = i*pi/4
        _column('S5_pilaster_%d' % i, cx+1.97*cos(a), cy+1.97*sin(a), .73, 2.08, .085)
    A.cyl('S5_drum_entablature', (cx, cy, 2.87), 2.09, .24, _m('cream'), 64)
    A.cyl('S5_dome_turntable', (cx, cy, 3.035), 2.19, .13, _m('brass'), 64)
    A.cyl('S5_dome_base_rail', (cx, cy, 3.155), 2.20, .13, _m('teal'), 64)
    # Radial copper panels stop either side of a genuine open observing slot.
    # The gap faces forward (-Y), so the visible telescope has an unobstructed sky.
    slot = .20
    start = -pi/2+slot
    span = 2*pi-slot*2
    kubbe_once = set(bpy.data.objects)
    for i in range(15):
        a, b = start+span*i/15+.008, start+span*(i+1)/15-.008
        _dome_panel('S5_dome_segment_%02d' % i, (cx, cy, 3.21), 2.16, 2.02,
                    a, b, 'teal' if i%3 else 'mint')
    _ring('S5_rotating_dome_eave', (cx, cy, 3.22), 2.20, 2.20, .058, 'cream')
    # Shutter rails each follow one side of the opening from lip to zenith.
    for side in (-1, 1):
        angle = -pi/2+side*slot
        pts = [(cx+2.20*sin(t*pi/2/24)*cos(angle),
                cy+2.20*sin(t*pi/2/24)*sin(angle), 3.21+2.06*cos(t*pi/2/24)) for t in range(25)]
        _tube('S5_shutter_track_'+str(side), pts, .067, 'cream')
    # Kubbe, kapak rayları ve saçağıyla birlikte döner tabla üstünde döner (web: üzerine gelince).
    A.donen_grup('grade_5_kubbe', (cx, cy, 3.21), kubbe_once)
    # Telescope: proper pier, fork mount, a long optical tube, rings and lens.
    A.cyl('S5_telescope_pier', (cx, cy-.03, 3.41), .26, 1.30, _m('cream'), 32)
    A.cyl('S5_telescope_azimuth', (cx, cy-.03, 4.05), .38, .16, _m('brass'), 32)
    for s in (-1, 1):
        _line('S5_fork_arm_'+str(s), (cx+s*.32, cy-.03, 4.02), (cx+s*.32, cy-.03, 4.47), .095, 'teal')
    _line('S5_declination_axle', (cx-.43, cy-.03, 4.45), (cx+.43, cy-.03, 4.45), .10, 'brass')
    axis = (0, -.82, .57)
    back = (cx, cy+.50, 4.04)
    front = (cx, cy-1.19, 5.215)
    _line('S5_telescope_optical_tube', back, front, .255, 'cream')
    for i, t in enumerate((.12, .60, .98)):
        pos = tuple(back[j]+(front[j]-back[j])*t for j in range(3))
        _axis_ring('S5_telescope_band_%d' % i, pos, axis, .277, 'brass', .055)
    end = (front[0], front[1]-.055, front[2]+.038)
    _line('S5_telescope_front_lens', front, end, .222, 'blue')
    _line('S5_telescope_eyepiece', back, (back[0], back[1]+.23, back[2]-.16), .083, 'navy')
    _line('S5_finder_scope', (cx+.32, cy-.2, 4.46), (cx+.32, cy-.81, 4.89), .065, 'brass')
    # Crisp little portico visually connects the dome to its visitors.
    A.cube('S5_entry_dark_recess', (cx, cy-1.97, 1.49), (1.04, .10, 1.65), _m('teal'), .05)
    for s in (-1, 1):
        _column('S5_entry_col_'+str(s), cx+s*.69, cy-2.00, .45, 1.96, .085)
    A.cube('S5_entry_lintel', (cx, cy-2.02, 2.46), (1.64, .60, .17), _m('cream'))
    A.cone('S5_entry_lantern_top', (cx, cy-2.03, 2.70), .22, .08, .34, _m('brass'), 8)
    A.cube('S5_entry_door_glass', (cx, cy-2.035, 1.53), (.88, .018, 1.46), _m('glass'), .02)
    _line('S5_entry_door_split', (cx, cy-2.06, .82), (cx, cy-2.06, 2.25), .026, 'brass')
    _stairs('S5_entry_stairs', cx, -2.84, 1.36, 4, .125, .26)
    # Three-body instructional armillary; no other planets are shown in year 5.
    ox, oy = 2.57, -.58
    _disc('S5_three_body_plaza', (ox, oy, .14), 1.27, 1.27, .09, 'foundation', 48)
    _disc('S5_three_body_dial', (ox, oy, .19), 1.24, 1.24, .03, 'path', 48)
    _ring('S5_dial_rim', (ox, oy, .22), 1.22, 1.22, .027, 'brass')
    for i in range(24):
        ang = i*pi/12
        _line('S5_dial_tick_%d' % i, (ox+1.11*cos(ang), oy+1.11*sin(ang), .216),
              (ox+1.19*cos(ang), oy+1.19*sin(ang), .216), .014, 'cream')
    A.cyl('S5_sun_support', (ox, oy, .915), .088, 1.52, _m('brass'), 24)
    A.sphere('S5_sun', (ox, oy, 1.79), (.41, .41, .41), _m('yellow'))
    _ring('S5_earth_orbit', (ox, oy, 1.46), .96, .96, .031, 'brass')
    ex, ey = ox+.68, oy-.68
    _line('S5_earth_arm', (ox, oy, 1.46), (ex, ey, 1.46), .034, 'brass')
    _line('S5_earth_stem', (ex, ey, 1.46), (ex, ey, 1.77), .022, 'brass')
    _earth('S5_earth', (ex, ey, 1.85), .20)
    _ring('S5_moon_orbit', (ex, ey, 1.74), .37, .37, .021, 'cream', 40)
    A.sphere('S5_moon', (ex-.24, ey-.28, 1.78), (.09, .09, .09), _m('cream'))
    _line('S5_moon_arm', (ex, ey, 1.74), (ex-.24, ey-.28, 1.74), .017, 'brass')
    # Low constellation viewing desk complements the main optical instrument.
    A.cube('S5_sky_chart_desk', (2.53, 1.76, .83), (1.49, .78, .13), _m('navy'), .065)
    for s in (-1, 1):
        _line('S5_chart_leg_'+str(s), (2.53+s*.52, 1.76, .1), (2.53+s*.52, 1.76, .8), .060, 'brass')
    stars = [(2.04, 1.65), (2.27, 1.88), (2.56, 1.71), (2.83, 1.96), (3.03, 1.63)]
    for i, (x, y) in enumerate(stars):
        A.sphere('S5_chart_star_%d' % i, (x, y, .92), (.043, .043, .025), _m('cream'))
        if i:
            _line('S5_chart_connection_%d' % i, (*stars[i-1], .908), (x, y, .908), .012, 'brass')
    # Curriculum bridge: a pair of cell reliefs in the side observation gallery.
    # Plant cell: an angular wall + membrane and chloroplasts; animal cell: oval.
    for i, xx in enumerate((2.02, 3.10)):
        A.cube('S5_cell_panel_foot_%d' % i, (xx, 2.59, .21), (1.02, .63, .28), _m('stone'), .10)
        A.cube('S5_cell_panel_%d' % i, (xx, 2.67, 1.17), (.98, .12, 1.67), _m('cream'), .09)
        A.cube('S5_cell_panel_inset_%d' % i, (xx, 2.591, 1.20), (.83, .025, 1.33), _m('teal'), .045)
    A.cube('S5_plant_cell_wall', (2.02, 2.544, 1.24), (.64, .045, .93), _m('leaf2'), .095)
    A.cube('S5_plant_cell_cytoplasm', (2.02, 2.515, 1.24), (.54, .022, .80), _m('mint'), .085)
    A.sphere('S5_plant_cell_vacuole', (2.05, 2.494, 1.29), (.15, .025, .23), _m('blue'))
    A.sphere('S5_plant_cell_nucleus', (1.86, 2.475, 1.03), (.087, .035, .09), _m('purple'))
    for i, (xx, zz) in enumerate(((1.83, 1.54), (2.22, 1.48), (2.21, .94), (1.83, 1.28))):
        leaf = A.sphere('S5_cell_chloroplast_%d' % i, (xx, 2.479, zz), (.047, .019, .09), _m('leaf'))
        leaf.rotation_euler[1] = .38
    A.sphere('S5_animal_cell_membrane', (3.1, 2.536, 1.24), (.34, .040, .47), _m('coral'))
    A.sphere('S5_animal_cell_cytoplasm', (3.1, 2.505, 1.24), (.299, .035, .425), _m('cream'))
    A.sphere('S5_animal_cell_nucleus', (3.055, 2.465, 1.28), (.123, .035, .14), _m('purple'))
    for i, (xx, zz) in enumerate(((3.27, 1.43), (2.94, 1.02), (3.26, 1.07))):
        org = A.sphere('S5_animal_cell_organelle_%d' % i, (xx, 2.466, zz), (.073, .027, .038), _m('terracotta'))
        org.rotation_euler[1] = -.4
    for i, (x, y) in enumerate(((-3.17, 1.28), (-3.03, -.97), (3.61, 1.93))):
        _planter('S5_courtyard_plant_%d' % i, x, y, .65)
    _settle_new(before, .22)
    _ground_path('S5_natural_entry_walk', [(cx, -3.28), (cx, -2.46), (cx, -1.58)], 1.30)
    _ground_path('S5_observation_walk', [(cx, -2.73), (.44, -2.54), (1.48, -1.95),
                                        (2.48, -1.60)], .65)


def build_6():
    """Hareket ve Sistemler: a glass gallery, force machines and eight-planet orrery."""
    before = set(bpy.data.objects)
    cx, cy = -.18, .49
    _disc('S6_buried_gallery_footing', (cx, cy, .19), 2.63, 1.76, .48, 'foundation')
    _disc('S6_gallery_plinth', (cx, cy, .51), 2.59, 1.72, .31, 'foundation')
    _ring('S6_gallery_lower_rail', (cx, cy, .69), 2.61, 1.74, .053, 'brass')
    _curved_glazing('S6_systems_gallery', cx, cy, 2.58, 1.71, .68, 2.90, 24,
                    skip=(17, 18))
    # A rich but restrained perimeter rhythm: vertical fins and a floating roof.
    for i in range(12):
        ang = i*pi/6
        x, y = cx+2.65*cos(ang), cy+1.77*sin(ang)
        fin = A.cube('S6_vertical_fin_%d' % i, (x, y, 1.83), (.115, .22, 2.45), _m('teal'), .035)
        fin.rotation_euler[2] = ang
    _disc('S6_roof_soffit', (cx, cy, 3.005), 2.88, 2.00, .23, 'cream')
    _disc('S6_copper_roof', (cx, cy, 3.155), 2.83, 1.96, .075, 'teal')
    _ring('S6_roof_edge', (cx, cy, 3.19), 2.84, 1.97, .05, 'brass')
    # Elliptic roof lights with their own raised brass frames.
    for i, x in enumerate((-1.45, .95)):
        _disc('S6_rooflight_%d' % i, (x, cy+.36, 3.213), .58, .79, .045, 'glass', 40)
        _ring('S6_rooflight_frame_%d' % i, (x, cy+.36, 3.245), .61, .82, .035, 'brass', 40)
    A.cube('S6_entry_glass', (cx, cy-1.74, 1.57), (1.20, .065, 1.81), _m('glass'))
    for s in (-1, 1):
        _line('S6_door_edge_'+str(s), (cx+s*.60, cy-1.79, .66), (cx+s*.60, cy-1.79, 2.48), .045, 'cream')
    _line('S6_door_center', (cx, cy-1.79, .67), (cx, cy-1.79, 2.48), .031, 'brass')
    # Suspended curved canopy and slim cantilever braces.
    verts = []
    for yy in (-1.54, -2.32):
        for i in range(15):
            xx = cx-1.09+i*2.18/14
            zz = 2.76+.16*(1-((xx-cx)/1.09)**2)
            verts.append((xx, yy, zz))
    A.mesh('S6_entrance_wave_canopy', verts,
           [(i, i+1, i+16, i+15) for i in range(14)], _m('cream'))
    for s in (-1, 1):
        _line('S6_canopy_brace_'+str(s), (cx+s*.91, -1.34, 2.04), (cx+s*.91, -2.21, 2.78), .04, 'brass')
    _stairs('S6_arrival', cx, -2.84, 1.51, 5, .13, .245)
    # Brass mechanical solar system. Positions/sizes deliberately form an exhibit.
    sx, sy, sz = cx, cy, 4.14
    A.cone('S6_orrery_roof_pedestal', (sx, sy, 3.48), .48, .26, .59, _m('cream'), 40)
    A.cyl('S6_orrery_central_shaft', (sx, sy, 4.00), .095, 1.26, _m('brass'), 24)
    A.sphere('S6_orrery_sun', (sx, sy, 4.80), (.46, .46, .46), _m('yellow'))
    # Distinct eight planets, including a real ring around Saturn.
    planets = [(.68, -.55, .095, 'stone'), (.90, 2.01, .145, 'terracotta'),
               (1.19, 4.07, .155, 'blue'), (1.46, .32, .12, 'coral'),
               (1.83, 2.81, .29, 'cream'), (2.18, 5.31, .24, 'yellow'),
               (2.50, 1.21, .18, 'mint'), (2.77, 3.93, .18, 'blue')]
    sistem_once = set(bpy.data.objects)
    for i, (r, angle, size, mat) in enumerate(planets):
        z = sz+.045*i
        _ring('S6_orbit_%d' % (i+1), (sx, sy, z), r, r*.64, .018, 'brass', 64)
        px, py = sx+r*cos(angle), sy+r*.64*sin(angle)
        _line('S6_planet_arm_%d' % (i+1), (sx, sy, z), (px, py, z), .018, 'brass')
        _line('S6_planet_stem_%d' % (i+1), (px, py, z), (px, py, z+.18), .019, 'brass')
        pos = (px, py, z+.20+size*.45)
        if i == 2:
            _earth('S6_planet_earth', pos, size)
        else:
            A.sphere('S6_planet_%d' % (i+1), pos, (size, size, size), _m(mat))
        if i == 4:
            _axis_ring('S6_jupiter_band', pos, (0, .12, 1), size*.96, 'terracotta', .036)
        if i == 5:
            _axis_ring('S6_saturn_ring', pos, (.22, .29, 1), size*1.69, 'cream', .056)
    # Yörüngeler ve gezegenler güneşin etrafında döner (web: üzerine gelince).
    A.donen_grup('grade_6_gunes_sistemi', (sx, sy, sz), sistem_once)
    # An instrumented force station beside the entrance, in unobstructed view.
    fx, fy = -2.86, -1.83
    A.cube('S6_force_experiment_plinth', (fx, fy, .16), (1.48, 1.40, .09), _m('path'), .045)
    for side in (-1, 1):
        _line('S6_force_gantry_upright_'+str(side), (fx+side*.57, fy, .175),
              (fx+side*.57, fy, 2.82), .065, 'teal')
        A.cube('S6_force_gantry_shoe_'+str(side), (fx+side*.57, fy, .24), (.27, .35, .13), _m('brass'))
    _line('S6_force_gantry_crossbeam', (fx-.63, fy, 2.83), (fx+.63, fy, 2.83), .085, 'cream')
    # Pulley wheel in the vertical XZ plane, with spokes and the rope seated in it.
    wc = (fx-.15, fy-.02, 2.48)
    _axis_ring('S6_fixed_pulley_wheel', wc, (0, 1, 0), .26, 'brass', .055, 48)
    for i in range(6):
        a = i*pi/3
        _line('S6_pulley_spoke_%d' % i, wc,
              (wc[0]+.24*cos(a), wc[1], wc[2]+.24*sin(a)), .02, 'cream')
    _line('S6_pulley_axle', (wc[0], fy-.15, wc[2]), (wc[0], fy+.12, wc[2]), .060, 'teal')
    _line('S6_pulley_hanger', (wc[0], fy+.10, 2.48), (wc[0], fy+.10, 2.84), .043, 'brass')
    rope = [(wc[0]-.28, fy-.04, 1.20), (wc[0]-.28, fy-.04, 2.48)]
    rope += [(wc[0]+.28*cos(pi-t*pi/24), fy-.04, wc[2]+.28*sin(pi-t*pi/24)) for t in range(25)]
    rope += [(wc[0]+.28, fy-.04, 1.62)]
    _tube('S6_pulley_rope', rope, .020, 'wood')
    for j in range(3):
        A.cyl('S6_pulley_weight_%d' % j, (wc[0]-.28, fy-.04, 1.0+j*.07), .16, .07, _m('brass'), 24)
    _line('S6_weight_hook', (wc[0]-.28, fy-.04, 1.11), (wc[0]-.28, fy-.04, 1.24), .029, 'brass')
    # Dynamometer with visible helix, ruled face and terminal ring.
    dx = wc[0]+.28
    A.cube('S6_dynamometer_back', (dx, fy+.005, 1.29), (.25, .14, .70), _m('cream'), .04)
    helix = [(dx+.059*cos(t*2*pi/12), fy-.098+.027*sin(t*2*pi/12), 1.57-t*.0048) for t in range(73)]
    _tube('S6_dynamometer_spring', helix, .012, 'brass')
    for j in range(5):
        _line('S6_dynamometer_tick_%d' % j, (dx+.077, fy-.079, 1.52-j*.092),
              (dx+.115, fy-.079, 1.52-j*.092), .006, 'navy')
    _axis_ring('S6_dynamometer_hook', (dx, fy-.06, .89), (0, 1, 0), .085, 'brass', .019, 24)
    # Small trolley track, visibly a motion experiment with distance marks.
    tx, ty = 2.60, -1.89
    A.cube('S6_motion_bench', (tx, ty, .48), (2.53, .94, .19), _m('cream'), .13)
    for s in (-1, 1):
        A.cube('S6_motion_support_'+str(s), (tx+s*.90, ty, .24), (.29, .57, .32), _m('teal'))
        _line('S6_track_rail_'+str(s), (tx-1.11, ty+s*.22, .61), (tx+1.11, ty+s*.22, .61), .037, 'brass')
    for j in range(11):
        _line('S6_distance_tick_%d' % j, (tx-1+j*.2, ty-.36, .592),
              (tx-1+j*.2, ty-.29, .592), .012, 'teal')
    cartx = tx-.35
    A.cube('S6_dynamics_trolley', (cartx, ty, .78), (.59, .44, .18), _m('coral'), .06)
    for xoff in (-.18, .18):
        for side in (-1, 1):
            _line('S6_trolley_wheel_%s_%s' % (xoff, side),
                  (cartx+xoff, ty+side*.24, .68), (cartx+xoff, ty+side*.29, .68), .09, 'navy')
    _line('S6_trolley_flag_pole', (cartx, ty, .84), (cartx, ty, 1.18), .018, 'brass')
    A.mesh('S6_trolley_flag', [(cartx, ty, 1.18), (cartx+.25, ty, 1.08), (cartx, ty, 1.00)], [(0, 1, 2)], _m('yellow'))
    # Biology systems niche: a display cabinet and a clear plant-transport model.
    bx, by = 2.32, 1.66
    A.cube('S6_biology_display_base', (bx, by, .26), (.98, .80, .34), _m('cream'), .12)
    A.cube('S6_biology_display_back', (bx, by+.22, 1.15), (.95, .08, 1.54), _m('teal'), .07)
    A.cube('S6_biology_display_glass', (bx, by-.15, 1.16), (.92, .018, 1.51), _m('glass'), .02)
    _line('S6_transport_main_stem', (bx, by, .46), (bx, by, 1.79), .032, 'leaf')
    for i in range(4):
        side = 1 if i%2 else -1
        z = .78+i*.25
        _line('S6_transport_branch_%d' % i, (bx, by, z-.10), (bx+side*.26, by, z+.05), .022, 'leaf')
        leaf = A.sphere('S6_transport_leaf_%d' % i, (bx+side*.24, by, z+.07), (.18, .07, .11), _m('leaf2'))
        leaf.rotation_euler[1] = -side*.45
    for side in (-1, 1):
        _tube('S6_transport_root_'+str(side), [(bx, by, .62), (bx+side*.12, by, .48),
              (bx+side*.28, by, .43)], .022, 'wood')
    for i, (x, y) in enumerate(((-3.37, 1.40), (.05, 2.70), (3.13, .22))):
        _planter('S6_landscape_%d' % i, x, y, .58)
    _settle_new(before, .22)
    _ground_path('S6_natural_entry_walk', [(cx, -3.29), (cx, -2.46), (cx, -1.38)], 1.42)
    _ground_path('S6_motion_walk', [(cx, -2.72), (1.0, -2.62), (2.56, -2.37)], .66)
    _ground_path('S6_force_walk', [(cx, -2.72), (-1.4, -2.6), (-2.8, -2.18)], .62)
