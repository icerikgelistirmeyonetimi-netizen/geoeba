"""Fen Keşif Köyü — ortak, yeniden üretilebilir Blender geometri araçları."""
import bpy, bmesh, math, random, json
from math import sin, cos, pi
from mathutils import Vector, Matrix

M = {}
COL = None
ROOT = None
_CACHE = {}
FONT = None

def material(name, color, rough=.55, metal=0, alpha=1):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    m.diffuse_color = (*color, alpha)
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Alpha'].default_value = alpha
    if alpha < 1:
        m.surface_render_method = 'DITHERED'
        m.use_transparency_overlap = False
    return m

def init():
    global COL, FONT
    COL = bpy.context.scene.collection
    palette = {
        'cream': ((.88,.84,.70),.52,0,1), 'stone': ((.63,.58,.45),.8,0,1),
        'teal': ((.055,.29,.29),.38,.18,1), 'glass': ((.30,.65,.66),.22,.18,.48),
        'brass': ((.63,.39,.14),.29,.65,1), 'wood': ((.48,.29,.13),.6,0,1),
        'leaf': ((.15,.34,.22),.85,0,1), 'leaf2': ((.37,.49,.22),.83,0,1),
        'terracotta': ((.68,.28,.17),.68,0,1), 'navy': ((.04,.12,.20),.42,.15,1),
        'blue': ((.23,.47,.68),.35,.1,1), 'mint': ((.39,.63,.53),.5,0,1),
        'coral': ((.86,.38,.23),.46,0,1), 'yellow': ((.95,.65,.22),.45,0,1),
        'purple': ((.43,.38,.62),.45,0,1), 'white': ((.95,.95,.86),.4,0,1),
        'dark': ((.04,.12,.12),.4,.1,1), 'glow': ((1,.78,.37),.3,0,1),
        'soil': ((.33,.22,.14),.95,0,1), 'grass': ((.235,.35,.15),.96,0,1),
        'path': ((.46,.43,.32),.93,0,1), 'foundation': ((.43,.43,.33),.92,0,1),
    }
    for key, values in palette.items(): M[key] = material('Fen · '+key, *values)
    b=M['glow'].node_tree.nodes.get('Principled BSDF')
    b.inputs['Emission Color'].default_value=(1,.66,.23,1)
    b.inputs['Emission Strength'].default_value=.45
    for path in ['C:/Windows/Fonts/trebucbd.ttf','C:/Windows/Fonts/arialbd.ttf']:
        try: FONT=bpy.data.fonts.load(path); break
        except RuntimeError: pass

def group(name, position=(0,0,0)):
    global ROOT
    o = bpy.data.objects.new(name,None)
    COL.objects.link(o)
    o.location=position
    ROOT=o
    return o

def donen_grup(name, pivot, before=None, eksen=(0,0,1), nesneler=None):
    """Yapı içinde döndürülebilir bir parça: `pivot` (yapıya göre yerel) konumlu bir alt kök.

    `before` kümesinden sonra oluşturulan (ya da `nesneler` ile verilen) parçalar bu alt köke
    taşınır; dünya konumları korunur (matrix_parent_inverse). web_aktar.py alt kökü, kökün
    özel özellikleriyle birlikte ayrı bir düğüm olarak aktarır; web sahnesi `eksen` (Three.js
    koordinatı) etrafında döndürür.
    """
    root = ROOT
    e = bpy.data.objects.new(name, None)
    COL.objects.link(e)
    e.parent = root
    e.location = pivot
    e['eksen'] = json.dumps([round(eksen[0], 4), round(eksen[2], 4), round(-eksen[1], 4)])
    ters = Matrix.Translation((-pivot[0], -pivot[1], -pivot[2]))
    if nesneler is None:
        nesneler = [o for o in set(bpy.data.objects) - before if o != e]
    for o in nesneler:
        if o.parent != root:
            continue
        o.parent = e
        o.matrix_parent_inverse = ters
    return e

def link(o, name, mat=None):
    o.name=name
    COL.objects.link(o)
    if ROOT: o.parent=ROOT
    if mat is not None: o.data.materials.append(mat)
    return o

def bevel(o, width=.04):
    if width:
        mod=o.modifiers.new('Arındırılmış kenarlar','BEVEL');mod.width=width;mod.segments=2
        mod=o.modifiers.new('Yüzey normalleri','WEIGHTED_NORMAL')
    return o

def mesh(name, verts, faces, mat):
    me=bpy.data.meshes.new(name)
    me.from_pydata(verts,[],faces);me.update()
    return link(bpy.data.objects.new(name,me),name,mat)

def cube(name, loc, size, mat, bevel=.04):
    x,y,z=[v/2 for v in size]
    o=mesh(name,[(-x,-y,-z),(-x,-y,z),(-x,y,-z),(-x,y,z),(x,-y,-z),(x,-y,z),(x,y,-z),(x,y,z)],
           [(0,4,6,2),(1,3,7,5),(0,1,5,4),(2,6,7,3),(0,2,3,1),(4,5,7,6)],mat)
    o.location=loc
    if bevel: globals()['bevel'](o,min(bevel,min(size)*.35))
    return o

def cone(name, loc, r1, r2, depth, mat, vertices=48):
    n=vertices
    verts=[(r*cos(i*2*pi/n),r*sin(i*2*pi/n),z) for z,r in [(-depth/2,r1),(depth/2,r2)] for i in range(n)]
    faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    o=mesh(name,verts,faces,mat);o.location=loc
    for p in list(o.data.polygons)[2:]:p.use_smooth=True
    return o

def cyl(name,loc,r,depth,mat,vertices=48):
    return bevel(cone(name,loc,r,r,depth,mat,vertices),min(.024,depth*.12))

def sphere(name,loc,scale,mat):
    key=('sphere',mat.name)
    me=_CACHE.get(key)
    if me is None:
        me=bpy.data.meshes.new('Sferik modül '+mat.name)
        bm=bmesh.new();bmesh.ops.create_uvsphere(bm,u_segments=20,v_segments=12,radius=1)
        bm.to_mesh(me);bm.free();me.materials.append(mat)
        for p in me.polygons:p.use_smooth=True
        _CACHE[key]=me
    o=link(bpy.data.objects.new(name,me),name);o.location=loc;o.scale=scale
    return o

def tube(name,points,r,mat,cyclic=False):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.resolution_u=8
    cu.bevel_depth=r;cu.bevel_resolution=2
    sp=cu.splines.new('POLY');sp.points.add(len(points)-1)
    for q,p in zip(sp.points,points):q.co=(*p,1)
    sp.use_cyclic_u=cyclic
    return link(bpy.data.objects.new(name,cu),name,mat)

def bar(name,start,end,r,mat):
    a,b=Vector(start),Vector(end);v=b-a
    o=cyl(name,(a+b)/2,r,v.length,mat,16)
    o.rotation_euler=v.to_track_quat('Z','Y').to_euler()
    return o

def annulus(name,center,rin,rout,z,depth,mat,n=64):
    verts=[]
    for zz in [z-depth/2,z+depth/2]:
        for rr in [rin,rout]:verts.extend([(center[0]+rr*cos(2*pi*i/n),center[1]+rr*sin(2*pi*i/n),zz) for i in range(n)])
    faces=[]
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,n+j,n+i),(2*n+i,3*n+i,3*n+j,2*n+j),(i,2*n+i,2*n+j,j),(n+i,n+j,3*n+j,3*n+i)])
    return bevel(mesh(name,verts,faces,mat),.018)

def text(name,body,loc,size,mat,rotation=(pi/2,0,0)):
    cu=bpy.data.curves.new(name,'FONT');cu.body=body;cu.size=size
    cu.align_x='CENTER';cu.align_y='CENTER';cu.extrude=.007;cu.bevel_depth=.002;cu.resolution_u=5
    if FONT:cu.font=FONT
    o=link(bpy.data.objects.new(name,cu),name,mat);o.location=loc;o.rotation_euler=rotation
    return o

def dome(name,center,r,height,mat,segments=48,rings=14):
    verts=[]
    for j in range(rings+1):
        phi=j*pi/(2*rings)
        verts.extend([(center[0]+r*cos(phi)*cos(2*pi*i/segments),center[1]+r*cos(phi)*sin(2*pi*i/segments),center[2]+height*sin(phi)) for i in range(segments)])
    faces=[]
    for j in range(rings):
        for i in range(segments):
            a=j*segments+i;b=j*segments+(i+1)%segments
            faces.append((a,b,b+segments,a+segments))
    o=mesh(name,verts,faces,mat)
    for p in o.data.polygons:p.use_smooth=True
    return o

def tree(x,y,z=0,s=1,seed=0):
    rng=random.Random(seed)
    cyl('Ağaç · gövde',(x,y,z+.85*s),.12*s,1.7*s,M['wood'],12)
    for i in range(5):
        a=i*2.4
        xx=x+cos(a)*.45*s;yy=y+sin(a)*.45*s;zz=z+(1.6+rng.random()*.55)*s
        bar('Ağaç · dal',(x,y,z+1.05*s),(xx,yy,zz),.058*s,M['wood'])
        sphere('Ağaç · yaprak tacı',(xx,yy,zz),(.65*s,.59*s,.67*s),M['leaf'] if i%2 else M['leaf2'])

def shrub(x,y,z=0,s=.5):
    sphere('Peyzaj · şimşir',(x,y,z+s*.7),(s,s*.87,s*.88),M['leaf2'])

def bench(x,y,z=0,angle=0):
    # Yerel çizgilerden döndürülmüş gerçek çıtalı park bankı.
    def tr(a,b,c):return (x+a*cos(angle)-b*sin(angle),y+a*sin(angle)+b*cos(angle),z+c)
    for yy in [-.23,-.07,.09,.25]:
        o=cube('Bank · meşe çıta',tr(0,yy,.55),(1.5,.115,.08),M['wood'],.02);o.rotation_euler.z=angle
    for xx in [-.56,.56]:
        bar('Bank · bronz ayak',tr(xx,0,.05),tr(xx,0,.5),.07,M['dark'])
        bar('Bank · sırt taşıyıcı',tr(xx,.25,.45),tr(xx,.35,1.05),.04,M['dark'])
    for zz in [.77,.96]:
        o=cube('Bank · sırt',tr(0,.35,zz),(1.5,.07,.13),M['wood'],.02);o.rotation_euler.z=angle

def lamp(x,y,z=0):
    cyl('Yol ışığı · ayak',(x,y,z+.55),.055,1.1,M['dark'],12)
    cyl('Yol ışığı · opal',(x,y,z+1.14),.105,.24,M['glow'],16)
    cyl('Yol ışığı · şapka',(x,y,z+1.28),.15,.05,M['brass'],20)

def planter(x,y,z=0):
    cone('Bitki · seramik saksı',(x,y,z+.22),.22,.32,.44,M['terracotta'],20)
    cyl('Bitki · toprak',(x,y,z+.45),.28,.03,M['soil'],20)
    for i in range(5):
        a=i*2*pi/5
        o=sphere('Bitki · yaprak',(x+.17*cos(a),y+.17*sin(a),z+.62),(.13,.30,.08),M['leaf'])
        o.rotation_euler=(.25*cos(a),.25*sin(a),a)
