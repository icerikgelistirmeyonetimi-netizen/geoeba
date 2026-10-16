"""Sürekli orman arazisi, üç kollu derin kanyon ve ayrıntılı alpin bitki örtüsü.

Dış dağ kütlesinin kenarları gerçek jeolojik katmanları gösterir: sert kireçtaşı ve
kumtaşı dışa taşar, yumuşak çamurtaşı, şeyl ve kömür damarları geri çekilir (basamaklı
"uçurum ve seki" profili). Çayır, uçurum dudağından yuvarlanan bir omuzla kayaya iner;
dorukların profili sivri koni değil yuvarlak kubbedir. Katman tablosu KATMANLAR üstten
alta kalınlık ve renk taşır; fosiller.py yerleşim için duvar_yuzeyi() ile aynı yüzeyi
örnekler. Kanyonun iç duvarları aynı katman dizisini mutlak derinlikle kullanır.
"""
import math, random, json
from math import sin, cos, pi, sqrt
from mathutils import Vector
import fen_ortak as A

# Güney ve doğu kolları kaya dudağının (omuz kenarının) ötesine kadar sürer: kanyon ağzı
# modelde açılır ve su şeridi şelalenin başladığı dudağa kadar kesintisiz uzanır.
KOLLAR=[
    [(-7,43),(-7,30),(-10,14),(-9,3),(-8,-4)],
    [(-8,-4),(-15,-10),(-16,-28),(-25.2,-47.6)],
    [(-8,-4),(4,-8),(20,-10),(35,-14),(52.4,-24.4)],
]
BINALAR=[(-24,-5),(-24,12),(3,16),(14.5,16),(3,2.5),(14.5,2.5),(1,-24)]

RIM_Z=.77
# Çayırın uçurum dudağı üzerinden yuvarlanarak kayaya indiği omuz payı (derinlik).
OMUZ_DERINLIGI=.95
# Üstten alta jeolojik katmanlar: (malzeme anahtarı, kalınlık, renk, dışa taşma).
# Malzeme adları web tarafındaki nehir ağzı ve kar örtüsü süzgeçleriyle uyumludur (canyon_stratumN).
# Renkler köyün ilk sürümündeki sıcak kahve kaya ailesindedir (yumuşak açık-koyu değişimi);
# katmanlar biçimle (seki basamakları) ve dokuyla okunur, çığırtkan renk bantlarıyla değil.
KATMANLAR=[
    ('canyon_stratum0',  .95, (.28,.245,.17), -.05),  # koyu humuslu üst toprak
    ('canyon_stratum1', 4.40, (.45,.35,.25),   .30),  # açık kireçtaşı (sert, çıkıntılı)
    ('canyon_stratum2',  .40, (.24,.20,.145), -.15),  # ince koyu damar
    ('canyon_stratum3', 5.20, (.415,.32,.225), .12),  # kumtaşı
    ('canyon_stratum4', 3.10, (.335,.265,.19),-.20),  # çamurtaşı (yumuşak, geri çekilmiş)
    ('canyon_stratum5',  .70, (.405,.322,.235),.28),  # ince açık tortul bandı
    ('canyon_stratum6', 5.40, (.32,.26,.19),  -.10),  # gri-kahve şeyl: deniz canlısı fosilleri
    ('canyon_stratum7',  .55, (.22,.185,.135),-.22),  # koyu damar
    ('canyon_stratum8', 6.60, (.39,.305,.22),  .18),  # sıcak kumtaşı: dinozor katmanı
    ('canyon_stratum9', 3.90, (.38,.30,.215),  .25),  # açık kireçtaşı
    ('canyon_stratum10', .45, (.30,.235,.17), -.18),  # ince damar
    ('canyon_stratum11',5.60, (.305,.25,.185),-.08),  # koyu çamurtaşı
    ('canyon_stratum12',6.60, (.28,.245,.17),  .05),  # taban
]
KATMAN_DERINLIGI=OMUZ_DERINLIGI+sum(k[1] for k in KATMANLAR)
# fosiller.py için: dış duvarın çevre noktaları, halkaları ve derinlikleri (massif_outer_walls doldurur).
DUVAR={}

def katman_ust_derinligi(k):
    """k. katmanın üst sınırının uçurum dudağından derinliği."""
    return OMUZ_DERINLIGI+sum(kat[1] for kat in KATMANLAR[:k])

def katman_merkez_derinligi(k):
    return katman_ust_derinligi(k)+KATMANLAR[k][1]/2

def katman_indisi(depth):
    """Dudaktan ölçülen derinlikteki katman sırası (omuz payı üst toprağa sayılır)."""
    ust=OMUZ_DERINLIGI
    for k,(key,thick,color,protrude) in enumerate(KATMANLAR):
        if depth<ust+thick:return k
        ust+=thick
    return len(KATMANLAR)-1

def seg_distance(x,y,a,b):
    dx,dy=b[0]-a[0],b[1]-a[1]
    t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)))
    return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)

def canyon_distance(x,y):
    return min(seg_distance(x,y,p[i],p[i+1]) for p in KOLLAR for i in range(len(p)-1))

def canyon_nearest(x,y):
    """Kanyon eksenine en yakın nokta: (uzaklık, x, y)."""
    best=None
    for p in KOLLAR:
        for i in range(len(p)-1):
            a,b=p[i],p[i+1];dx,dy=b[0]-a[0],b[1]-a[1]
            t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)))
            fx,fy=a[0]+t*dx,a[1]+t*dy
            dd=math.hypot(x-fx,y-fy)
            if best is None or dd<best[0]:best=(dd,fx,fy)
    return best

def rim_edge(x,y):
    """Dere tabanının bittiği, yamacın başladığı uzaklık (height ile aynı formül)."""
    return 1.65+.17*sin(y*.51+x*.18)+.12*cos(x*.63)

def bina_icinde(x,y):
    for i,(cx,cy) in enumerate(BINALAR):
        rx,ry=(11.1,8.6) if i==6 else (6.65,5.7)
        if abs(x-cx)<rx and abs(y-cy)<ry:return True
    return False

def kol_y(kol,x):
    """Bir kanyon kolunun verilen x'teki eksen y'si (kol x boyunca tek yönlü ilerler)."""
    noktalar=KOLLAR[kol]
    for (ax,ay),(bx,by) in zip(noktalar,noktalar[1:]):
        lo,hi=min(ax,bx),max(ax,bx)
        if lo<=x<=hi and ax!=bx:return ay+(by-ay)*(x-ax)/(bx-ax)
    return noktalar[-1][1]

PEAKS=[(-34,36,14,16),(-15,45,13,15),(12,40,17,17),(36,37,12,15),(-43,-7,6,13),(42,-5,5,14)]

def height(x,y):
    # Aynı toprak yüzeyi yapıların altına kadar devam eder. Bütün temel ayak izi
    # ve küçük peyzaj payı tesviye edilir; ayrı yükseltilmiş sergi kaidesi yoktur.
    for i,(cx,cy) in enumerate(BINALAR):
        rx,ry=(11.1,8.6) if i==6 else (6.65,5.7)
        if abs(x-cx)<rx and abs(y-cy)<ry:return RIM_Z
    d=canyon_distance(x,y)
    # Dere tabanı suyun iki yanında kısa birer kıyı şeridi bırakır; yamaç eteği yumuşak
    # başlar (smootherstep) ki ızgara kenarları su kıyısında testere dişi çizmesin.
    edge=1.65+.17*sin(y*.51+x*.18)+.12*cos(x*.63)
    t=max(0,min(1,(d-edge)/1.35))
    bank=t*t*t*(t*(6*t-15)+10)
    hill=0
    for cx,cy,high,radius in PEAKS:
        u=max(0,1-math.hypot(x-cx,y-cy)/radius)
        # Yuvarlak doruk: smoothstep profili tepe noktasında sıfır eğimlidir; sivri koni yoktur.
        dome=u*u*(3-2*u)
        # Hafif sırt dalgalanması doruğu düz bir kubbe olmaktan çıkarır.
        ridge=1+.07*sin(x*.53+cy*.2)*cos(y*.47+cx*.1)
        hill=max(hill,dome*high*ridge)
    # Tepe, hendeğe yaklaşırken yumuşakça söner: kanyon dudağı tepelerin yanında da alçak
    # kalır, dağ hendekle yarılmaz.
    w=max(0,min(1,(d-2.0)/2.5));w=w*w*(3-2*w)
    ground=RIM_Z+hill*w
    # Hendek tabanı her yerde aynı derinlikte; duvarlar yerel zemine kadar yükselir.
    h=ground-(ground-(RIM_Z-8.7))*(1-bank)
    # Yapı terasları aynı seviyede; çevrede hafif doğal yüzey dalgalanması.
    if min(math.hypot(x-cx,y-cy) for cx,cy in BINALAR)>7.7 and d>3.1:
        h+=.16*sin(x*.31)*cos(y*.24)
    return h


def outer_xy(x,y):
    """Deform only the remote rim; every campus plateau keeps its coordinates."""
    def feather(value, span):
        t=max(0,min(1,(abs(value)-35)/span))
        return t*t*(3-2*t)
    fx=feather(x,18.25)
    fy=feather(y,22.55)
    dx=fx*(2.12*sin(y*.091+.55)+.72*sin(y*.183-1.10))
    dy=fy*(2.18*sin(x*.081-1.40)+.65*sin(x*.173+.90))
    return x+dx,y+dy


def _taban_taskini(depth):
    """Kütlenin vadiye doğru genişleyen temel profili (moloz yamacı)."""
    return 1.05+.022*depth+.0028*depth*depth


def katman_tablosu():
    """Web gölgelendiricisinin okuduğu katman tablosu: [kalınlık, r, g, b] (extras)."""
    return [[thick,*color] for key,thick,color,protrude in KATMANLAR]


def katman_malzemesi():
    """Yüksekliğe göre boyayan tek katman malzemesi (Cycles): sabit adımlı renk rampası + tane dokusu.

    Dış duvarın katman yüzeyleri ve kanyonun iç duvarları aynı malzemeyi kullanır; böylece
    poster de web gibi tam yatay, kaymasız ve dokulu katmanlar gösterir. Düğüm kurulumu
    başarısız olursa düz kireçtaşı rengi kalır; GLB'de rengi zaten web gölgelendiricisi verir.
    """
    mat=A.material('Dağ · canyon_stratum',KATMANLAR[1][2],.9)
    try:
        nt=mat.node_tree;nodes=nt.nodes;links=nt.links
        bsdf=nodes.get('Principled BSDF')
        geo=nodes.new('ShaderNodeNewGeometry')
        sep=nodes.new('ShaderNodeSeparateXYZ');links.new(geo.outputs['Position'],sep.inputs['Vector'])
        aralik=nodes.new('ShaderNodeMapRange');aralik.clamp=True
        aralik.inputs['From Min'].default_value=RIM_Z-KATMAN_DERINLIGI;aralik.inputs['From Max'].default_value=RIM_Z
        aralik.inputs['To Min'].default_value=1.0;aralik.inputs['To Max'].default_value=0.0
        links.new(sep.outputs['Z'],aralik.inputs['Value'])
        rampa=nodes.new('ShaderNodeValToRGB');rampa.color_ramp.interpolation='CONSTANT'
        ogeler=rampa.color_ramp.elements
        ogeler[0].position=0.0;ogeler[0].color=(*KATMANLAR[0][2],1)
        ogeler[1].position=(OMUZ_DERINLIGI+KATMANLAR[0][1])/KATMAN_DERINLIGI;ogeler[1].color=(*KATMANLAR[1][2],1)
        for k in range(2,len(KATMANLAR)):
            oge=ogeler.new(katman_ust_derinligi(k)/KATMAN_DERINLIGI);oge.color=(*KATMANLAR[k][2],1)
        links.new(aralik.outputs['Result'],rampa.inputs['Fac'])
        tane=nodes.new('ShaderNodeTexNoise');tane.noise_dimensions='3D'
        tane.inputs['Scale'].default_value=5.5;tane.inputs['Detail'].default_value=4.0;tane.inputs['Roughness'].default_value=.55
        links.new(geo.outputs['Position'],tane.inputs['Vector'])
        karisim=nodes.new('ShaderNodeMix');karisim.data_type='RGBA';karisim.blend_type='OVERLAY'
        karisim.inputs[0].default_value=.32
        links.new(rampa.outputs['Color'],karisim.inputs[6]);links.new(tane.outputs['Color'],karisim.inputs[7])
        lamina=nodes.new('ShaderNodeTexWave');lamina.wave_type='BANDS';lamina.bands_direction='Z'
        lamina.inputs['Scale'].default_value=4.5;lamina.inputs['Distortion'].default_value=1.2;lamina.inputs['Detail'].default_value=2.0
        links.new(geo.outputs['Position'],lamina.inputs['Vector'])
        katli=nodes.new('ShaderNodeMix');katli.data_type='RGBA';katli.blend_type='MULTIPLY'
        katli.inputs[0].default_value=.12
        links.new(karisim.outputs[2],katli.inputs[6]);links.new(lamina.outputs['Color'],katli.inputs[7])
        links.new(katli.outputs[2],bsdf.inputs['Base Color'])
    except Exception as hata:
        print('KATMAN_MALZEMESI_DUZ',repr(hata),flush=True)
    return mat


def massif_outer_walls(top_vertices,nx,ny):
    """A closed, stratified mountain mass descending into the distant valley.

    The first ring uses the exact top-grid boundary, so there is no paper-thin
    lip or daylight seam. Three shoulder rings roll the meadow over the lip; every
    stratum then owns its own top and bottom ring, so hard beds step outward and
    soft beds recede. Lower benches broaden naturally into the valley floor.
    """
    boundary=list(range(nx))
    boundary += [j*nx+nx-1 for j in range(1,ny)]
    boundary += [(ny-1)*nx+i for i in range(nx-2,-1,-1)]
    boundary += [j*nx for j in range(ny-2,0,-1)]
    top=[top_vertices[i] for i in boundary]
    n=len(top)
    normals=[]
    distances=[0.0]
    for i,p in enumerate(top):
        previous,following=top[(i-1)%n],top[(i+1)%n]
        dx,dy=following[0]-previous[0],following[1]-previous[1]
        length=math.hypot(dx,dy)
        # The perimeter is counterclockwise, therefore its right side is out.
        normals.append((dy/length,-dx/length))
        if i:distances.append(distances[-1]+math.hypot(p[0]-top[i-1][0],p[1]-top[i-1][1]))

    # Halkalar: (derinlik, dışa taşma, halkanın altındaki yüzeyin malzeme indisi, yumuşak gölgeleme?, faz)
    # Malzeme 0 omuz çayırı, 1.. katmanlar (KATMANLAR sırasıyla). Omuzun son halkasından sonra
    # gelen ilk katman halkası omuzu kapatır; her katman sınırında alt ve üst halka aynı derinlik ve
    # fazı paylaşır, yalnız dışa taşmaları farklıdır (seki basamağı).
    rings=[(0.0,0.0,0,True,0.0),(.10,.45,0,True,0.0),(.40,.80,0,True,0.0)]
    depth=OMUZ_DERINLIGI
    for k,(key,thick,color,protrude) in enumerate(KATMANLAR):
        below=k+2 if k+1<len(KATMANLAR) else k+1
        rings.append((depth,_taban_taskini(depth)+protrude,k+1,False,k*.61))
        rings.append((depth+thick,_taban_taskini(depth+thick)+protrude,below,False,(k+1)*.61))
        depth+=thick
    total=depth
    vertices=list(top)
    ring_vertices=[list(top)]
    for level in range(1,len(rings)):
        ring_depth,spread,_,_,phase=rings[level]
        fraction=ring_depth/total
        ring=[]
        for i,(x,y,z) in enumerate(top):
            s=distances[i]
            # Broad erosion flutes, with quieter small chips: this avoids a
            # uniformly extruded box without disturbing the inhabited surface.
            flute=(.45*sin(s*.27+.35)+.17*sin(s*.61+1.1))
            bench_wave=.42*sin(s*.065+phase*.39)
            outward=spread+fraction*(flute+bench_wave)
            xx=x+normals[i][0]*outward
            yy=y+normals[i][1]*outward
            # Omuz halkaları dudağı izler (tepelerin eteğinde çayır yamacı olarak uzar); katman
            # halkaları mutlak yüksekliktedir: sınırlar tam yatay, kayma ya da kırık yoktur ve
            # web/poster gölgelendiricisinin yüksekliğe göre boyadığı bantlarla birebir çakışır.
            # Kanyon ağzında dudak dere tabanına iner; üstteki katman halkaları da oyuğu izler.
            zz=z-ring_depth if level<3 else min(RIM_Z-ring_depth,z-ring_depth)
            ring.append((xx,yy,zz))
        vertices.extend(ring)
        ring_vertices.append(ring)
    faces=[]
    material_indices=[]
    smooth_flags=[]
    for layer in range(len(rings)-1):
        upper,lower=layer*n,(layer+1)*n
        material=rings[layer][2]
        smooth=rings[layer][3]
        for i in range(n):
            j=(i+1)%n
            faces.append((lower+i,lower+j,upper+j,upper+i))
            material_indices.append(material)
            smooth_flags.append(smooth)
    # Close the underside well below the valley floor; the result has physical
    # depth even when the interactive camera is moved under its original view.
    bottom_center=len(vertices)
    vertices.append((0,5,-45.1))
    lower=(len(rings)-1)*n
    for i in range(n):
        faces.append((bottom_center,lower+(i+1)%n,lower+i))
        material_indices.append(len(KATMANLAR))
        smooth_flags.append(False)
    # Katman yüzeyleri tek yordamsal malzeme taşır: rengi dünya yüksekliğinden okur (katman_malzemesi).
    wall=A.mesh('KANYON · jeolojik katmanlı dış dağ kütlesi',vertices,faces,A.M['omuz'])
    wall.data.materials.append(A.M['canyon_stratum'])
    for polygon,index,smooth in zip(wall.data.polygons,material_indices,smooth_flags):
        polygon.material_index=min(index,1)
        polygon.use_smooth=smooth
    DUVAR.clear()
    DUVAR.update({'top':top,'normals':normals,'rings':ring_vertices,
                  'depths':[r[0] for r in rings],'nx':nx,'ny':ny})

    # A broad receiving landscape hides no gaps: the walls continue beneath its
    # surface. Its remote boundary can disappear naturally into the scene haze.
    count=19;extent=150.0
    floor_vertices=[]
    for j in range(count):
        y=-extent+2*extent*j/(count-1)
        for i in range(count):
            x=-extent+2*extent*i/(count-1)
            z=-42+.42*sin(x*.035)*cos(y*.028)+.13*sin((x+y)*.051)
            floor_vertices.append((x,y,z))
    floor_faces=[]
    for j in range(count-1):
        for i in range(count-1):
            k=j*count+i
            floor_faces.append((k,k+1,k+count+1,k+count))
    floor=A.mesh('KANYON · uzanan sıcak vadi tabanı',floor_vertices,floor_faces,A.M['canyon_floor'])
    for polygon in floor.data.polygons:polygon.use_smooth=True


def duvar_yuzeyi(kenar,konum,derinlik):
    """Dış duvar yüzeyinde bir nokta ve yerel çerçeve: (konum, sağ, yukarı, dışa).

    kenar: 'guney' | 'dogu' | 'kuzey' | 'bati'. konum: güney/kuzey için x, doğu/batı için y.
    derinlik: uçurum dudağından aşağı mesafe. Fosiller bu çerçeveye yerleşir.
    """
    top=DUVAR['top'];rings=DUVAR['rings'];depths=DUVAR['depths'];nx=DUVAR['nx'];ny=DUVAR['ny']
    n=len(top)
    if kenar=='guney':aday=range(0,nx);eksen=0
    elif kenar=='dogu':aday=range(nx,nx+ny-1);eksen=1
    elif kenar=='kuzey':aday=range(nx+ny-1,nx+ny-1+nx-1);eksen=0
    else:aday=range(nx+ny-1+nx-1,n);eksen=1
    k=min(aday,key=lambda i:abs(top[i][eksen]-konum))
    derinlik=max(0.0,min(derinlik,depths[-1]-.01))
    r=0
    for i in range(len(depths)-1):
        if depths[i]<depths[i+1] and depths[i]<=derinlik<=depths[i+1]:
            r=i;break
    t=(derinlik-depths[r])/(depths[r+1]-depths[r])
    ust=Vector(rings[r][k]);alt=Vector(rings[r+1][k])
    konum3=ust.lerp(alt,t)
    yukari=(ust-alt).normalized()
    boyunca=(Vector(rings[r][(k+1)%n])-Vector(rings[r][(k-1)%n])).normalized()
    disa=boyunca.cross(yukari).normalized()
    sag=yukari.cross(disa).normalized()
    return konum3,sag,yukari,disa


def rock(name,x,y,z,sx=1,sy=.8,sz=1,seed=1,mat=None):
    rng=random.Random(seed)
    vs=[]
    for level,scale in [(0,.86),(.38,1),(.87,.68),(1,.3)]:
        for i in range(7):
            t=i*2*pi/7;rr=scale*rng.uniform(.8,1.18)
            vs.append((x+sx*rr*cos(t),y+sy*rr*sin(t),z+sz*(level+rng.uniform(-.05,.05))))
    fs=[]
    for j in range(3):
        for i in range(7):fs.append((j*7+i,j*7+(i+1)%7,(j+1)*7+(i+1)%7,(j+1)*7+i))
    fs.append(tuple(range(21,28)))
    return A.mesh(name,vs,fs,mat or A.M['stone'])


def basamak(name,x,y,z,rx=1.05,ry=.8,depth=2.2,seed=1,mat=None):
    """Düz tepeli, duvara saplanmış seki kayası; keçiler bu tepede durur (üst yüzey z)."""
    rng=random.Random(seed)
    vs=[]
    for level,scale in [(-depth,.62),(-depth*.55,1.10),(-depth*.16,1.04),(0,.92)]:
        for i in range(8):
            t=i*2*pi/8+.2;rr=scale*rng.uniform(.9,1.08)
            vs.append((x+rx*rr*cos(t),y+ry*rr*sin(t),z+level+(rng.uniform(-.03,.03) if level else 0)))
    fs=[]
    for j in range(3):
        for i in range(8):fs.append((j*8+i,j*8+(i+1)%8,(j+1)*8+(i+1)%8,(j+1)*8+i))
    fs.append(tuple(range(24,32)))
    fs.append(tuple(range(7,-1,-1)))
    return A.mesh(name,vs,fs,mat or A.M['cliff1'])

def pine(x,y,z,s=1,seed=0):
    rng=random.Random(seed)
    A.cyl('Çam · gövde',(x,y,z+1.45*s),.16*s,2.9*s,A.M['wood'],10)
    for j in range(5):
        zz=z+(.85+j*.62)*s
        radius=(1.14-j*.16)*s
        n=11;vs=[(x,y,zz+1.55*s)]
        for i in range(n):
            a=i*2*pi/n+j*.61;rr=radius*rng.uniform(.82,1.18)
            vs.append((x+rr*cos(a),y+rr*sin(a),zz+rng.uniform(-.16,.08)*s))
        fs=[(0,i+1,(i+1)%n+1) for i in range(n)]
        fs.append(tuple(range(n,0,-1)))
        A.mesh('Çam · katlı iğne yapraklar',vs,fs,A.M['forest'+str(j%3)])
    for i in range(5):
        t=i*2.4
        A.bar('Çam · ince yan dal',(x,y,z+1.4*s),(x+.8*s*cos(t),y+.8*s*sin(t),z+1.3*s),.036*s,A.M['wood'])

def birch(x,y,z,s=1,seed=0):
    rng=random.Random(seed)
    for j in range(3):
        a=j*2.3
        end=(x+.52*s*cos(a),y+.52*s*sin(a),z+(2.7+j*.1)*s)
        A.bar('Huş · açık kabuklu gövde',(x,y,z),end,.072*s,A.M['bark'])
        for k in range(5):
            zz=z+(.25+k*.37)*s
            A.bar('Huş · kabuk izi',(x-.04*s,y-.063*s,zz),(x+.08*s,y-.06*s,zz+.027*s),.011*s,A.M['dark'])
        for k in range(3):
            xx=end[0]+cos(k*2.1+a)*.38*s;yy=end[1]+sin(k*2.1+a)*.38*s
            o=A.sphere('Huş · küçük yaprak tacı',(xx,yy,end[2]+.28*k*s),(.55*s,.50*s,.72*s),A.M['leaf2'] if j%2 else A.M['leaf'])

def fern(x,y,z,s=.6):
    for i in range(7):
        a=i*2*pi/7
        ps=[]
        for j in range(7):
            t=j/6
            ps.append((x+cos(a)*s*t,y+sin(a)*s*t,z+s*(.7*sin(t*pi*.85)+.07)))
        A.tube('Eğrelti · kavisli sap',ps,.009,A.M['fern'])
        for j in range(1,6):
            xx,yy,zz=ps[j];w=s*.17*(1-j/7)
            for side in [-1,1]:
                dx=cos(a+side*pi/2)*w;dy=sin(a+side*pi/2)*w
                A.mesh('Eğrelti · ince yaprak',[(xx,yy,zz),(xx+dx,yy+dy,zz+.018),(xx+cos(a)*s*.13,yy+sin(a)*s*.13,zz+.05)],[(0,1,2)],A.M['fern'])

def flowers(x,y,z,seed=0):
    rng=random.Random(seed)
    for j in range(5):
        xx=x+rng.uniform(-.35,.35);yy=y+rng.uniform(-.35,.35);zz=z+rng.uniform(.19,.39)
        A.bar('Kır çiçeği · sap',(xx,yy,z),(xx,yy,zz),.011,A.M['leaf'])
        for i in range(5):
            a=i*2*pi/5
            A.sphere('Kır çiçeği · taç yaprak',(xx+.055*cos(a),yy+.055*sin(a),zz),(.054,.045,.024),A.M['flower'+str(seed%3)])
        A.sphere('Kır çiçeği · polen',(xx,yy,zz+.024),(.032,.032,.023),A.M['yellow'])

def generate():
    m=A.M
    for key,color in {
        'forest0':(.045,.16,.095),'forest1':(.075,.245,.13),'forest2':(.12,.30,.145),
        'bark':(.81,.77,.62),'fern':(.17,.40,.105),
        'meadow0':(.22,.317,.11),'meadow1':(.273,.37,.14),'meadow2':(.185,.28,.097),
        'cliff0':(.30,.25,.19),'cliff1':(.42,.33,.24),'cliff2':(.51,.40,.29),'cliff3':(.36,.285,.205),
        'canyon_floor':(.32,.26,.19),
        'flower0':(.93,.68,.1),'flower1':(.72,.33,.47),'flower2':(.75,.77,.94),
        'stream':(.035,.36,.34),'foam':(.52,.74,.64),'lichen':(.39,.44,.17),
    }.items():m[key]=A.material('Dağ · '+key,color,.86 if key!='stream' else .25)
    # Tek katman malzemesi: adı web süzgeçlerinde tanınır (canyon_stratum); rengi yükseklikten okunur.
    m['canyon_stratum']=katman_malzemesi()
    # Omuz çayırı adı web süzgeçlerinde ("omuz") tanınır: nehir ağzı kazısı ve kar örtüsü.
    m['omuz']=A.material('Dağ · omuz çayırı',(.225,.33,.12),.96)
    # Web gölgelendiricisi katman tablosunu çevre kökünün extras alanından okur.
    if A.ROOT is not None:
        A.ROOT['katmanlar']=json.dumps(katman_tablosu())
        A.ROOT['dudak']=RIM_Z
        A.ROOT['omuz']=OMUZ_DERINLIGI
    # Tek parça arazi. Kanyon dışında yüzeyler birbirinin devamıdır; ada tabanı yoktur.
    # Sık ızgara (.5) kanyon dudağındaki testere dişi görünümünü azaltır: dudağın yuvarlak
    # profili birkaç hücreye yayılır.
    nx=213;ny=210;x0=-53;y0=-47;step=.5
    vs=[]
    for j in range(ny):
        for i in range(nx):
            x,y=outer_xy(x0+i*step,y0+j*step)
            # Kanyon dudağına ya da yamaç eteğine yakın köşe noktaları tam kırışık çizgisine
            # oturtulur: dudak ızgara hücrelerini kesen bir testere dişi yerine düz bir kenar olur.
            if not bina_icinde(x,y):
                d,fx,fy=canyon_nearest(x,y)
                if d>1e-6:
                    e=rim_edge(x,y)
                    for hedef in (e+1.35,e):
                        if abs(d-hedef)<.27:
                            x,y=fx+(x-fx)/d*hedef,fy+(y-fy)/d*hedef
                            break
            vs.append((x,y,height(x,y)))
    fs=[]
    for j in range(ny-1):
        for i in range(nx-1):
            k=j*nx+i
            # Hücre köşegeni, yükseklik farkı küçük olan çift boyunca seçilir; dik yamaçta
            # kırışık çizgisi hücre kenarlarını izler.
            z00,z10,z01,z11=vs[k][2],vs[k+1][2],vs[k+nx][2],vs[k+nx+1][2]
            if abs(z00-z11)<=abs(z10-z01):fs.extend([(k,k+1,k+nx+1),(k,k+nx+1,k+nx)])
            else:fs.extend([(k,k+1,k+nx),(k+1,k+nx+1,k+nx)])
    grass=A.material('Dağ · yumuşak çayır tonları',(1,1,1),.96)
    colors=grass.node_tree.nodes.new('ShaderNodeVertexColor');colors.layer_name='ForestTone'
    grass.node_tree.links.new(colors.outputs['Color'],grass.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    terrain=A.mesh('KANYON · sürekli dağ arazisi',vs,fs,grass)
    # Kanyonun iç duvarları da yüksekliğe göre boyanan tek katman malzemesini taşır: yüzey
    # bazlı bant ataması yoktur, bu yüzden kaymış ya da kırık görünen katman oluşmaz.
    for mm in [grass,grass,m['canyon_stratum']]:terrain.data.materials.append(mm)
    tones=terrain.data.color_attributes.new(name='ForestTone',type='FLOAT_COLOR',domain='CORNER')
    for p in terrain.data.polygons:
        pts=[vs[i] for i in p.vertices];x=sum(v[0] for v in pts)/3;y=sum(v[1] for v in pts)/3;z=sum(v[2] for v in pts)/3
        dz=max(v[2] for v in pts)-min(v[2] for v in pts)
        # Kaya yalnız kanyon çevresindeki dik yüzeylerde; dağ yamaçları çayır kalır (dik tepe
        # eteklerinde beliren kahverengi açıklıklar buradan geliyordu).
        if z<-.1 or (dz>.85 and canyon_distance(x,y)<4.2):
            p.material_index=3
            # Kanyon yüzeyleri yumuşak gölgelenir: dudaktaki üçgenler çayırla harmanlanır,
            # dişli bir kenar çizgisi kalmaz; kaya dokusunu gölgelendirici verir.
            p.use_smooth=True
        else:
            p.material_index=0
            p.use_smooth=True
        for loop in p.loop_indices:
            vx,vy,vz=vs[terrain.data.loops[loop].vertex_index]
            if p.material_index>=3:rgba=(1,1,1,1)
            else:
                variation=1+.065*(sin(vx*.18)+cos(vy*.21)+sin((vx+vy)*.13))
                rgba=(.255*variation,.375*variation,.135*variation,1)
            tones.data[loop].color=rgba
    massif_outer_walls(vs,nx,ny)
    # Seyrek, iri kaya çıkıntıları: her adımda yalnız bir yamaç; kıyı sakin kalır. Dere çakılı ve
    # köpük çizgisi yoktur, akıntı parıltısını web sahnesindeki su malzemesi verir (kalabalık azalır).
    rng=random.Random(78)
    for branch in KOLLAR:
        for q in range(len(branch)-1):
            a,b=branch[q],branch[q+1];dx=b[0]-a[0];dy=b[1]-a[1];length=math.hypot(dx,dy)
            adet=max(2,int(length/5.5))
            for i in range(adet):
                t=(i+.5)/adet
                xx=a[0]+t*dx;yy=a[1]+t*dy
                side=1 if (i+q)%2 else -1
                x=xx-side*dy/length*2.2;y=yy+side*dx/length*2.2
                z=-6+rng.random()*3
                rock('Uçurum · çatlak kaya',x,y,z,1.0+rng.random()*.6,.8+rng.random()*.4,1.6+rng.random()*1.6,i+q*26+(side+1)*200,m['cliff'+str(i%4)])
            # Kesintisiz turkuaz nehir; vadinin üç kolunda aynı su seviyesi.
            verts=[]
            for i in range(31):
                t=i/30;xx=a[0]+t*dx;yy=a[1]+t*dy;ww=1.05+.08*sin(t*11)
                verts.extend([(xx-dy/length*ww,yy+dx/length*ww,-7.55),(xx+dy/length*ww,yy-dx/length*ww,-7.55)])
            A.mesh('Kanyon · akan nehir',verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(30)],m['stream'])
    for x,y in [(-7,30),(-10,14),(-9,3),(-8,-4),(-15,-10),(-16,-28),(4,-8),(20,-10),(35,-14)]:
        A.cyl('Nehir · birleşen kıvrım',(x,y,-7.55),1.06,.05,m['stream'],32)
    # Orman duvarı: daha yoğun arka yamaç, seyrek ön açıklık. Binalar hep görünür kalır.
    # Orman seyrek: ekran kalabalık olmasın.
    for i in range(70):
        x=rng.uniform(-43,40);y=rng.uniform(-34,43)
        d=canyon_distance(x,y)
        if d<4.4:continue
        if min(math.hypot(x-cx,y-cy) for cx,cy in BINALAR)<8.6:continue
        if abs(x-1)<12 and abs(y+24)<10:continue
        if -27<x<27 and -25<y<24:continue
        # İLKOKUL tabelasının önü açık kalır (tabela -28,-14.5).
        if abs(x+28)<7 and abs(y+14.5)<6:continue
        z=height(x,y);s=rng.uniform(.85,1.65)
        if i%5==0:birch(x,y,z,s*.9,i)
        else:pine(x,y,z,s,i)
    for i,(x,y) in enumerate([(-31.5,5),(-14,19),(8,25),(27,10),(-7,-22),(9,-16)]):
        if canyon_distance(x,y)>3.5:pine(x,y,height(x,y),.85+i%3*.1,300+i)
    # Orman zemininde ayrı eğrelti, çiçek ya da yosunlu taş yoktur; ufak nesne kalabalığı ekranı karıştırmaz.
    # Düzlüklerden uçuruma yaklaşan yollarda ince taş sınır duvarları.
    for y in [-6,-3,0,3,6,9,12]:
        x=-13.9
        if canyon_distance(x,y)<3:continue
        for j in range(3):
            A.cube('Seyir patikası · taş örgü',(x,y+j*.42,.99),(.42,.39,.43),m['cliff2'],.04)
        A.cube('Seyir patikası · kapak taşı',(x,y+.42,1.25),(.54,1.31,.10),m['cream'],.035)
