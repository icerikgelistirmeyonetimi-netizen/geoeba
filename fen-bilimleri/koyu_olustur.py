"""Fen Keşif Köyü: Blender kaynak sahnesi, yüksek çözünürlüklü render ve GLB.

blender -b --factory-startup --python fen-bilimleri/koyu_olustur.py
-- --preview  : hızlı görsel denetim
-- --no-render: yalnız model ve web aktarımı
"""
import bpy, math, os, sys, random, json
from math import pi, sin, cos
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

HERE=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,HERE)
import fen_ortak as A
import yapilar_temel as B
import yapilar_ileri as C
import dag_arazisi as DAG

OUT=os.path.abspath(os.path.join(HERE,'..','public','fen-bilimleri'))
os.makedirs(OUT,exist_ok=True)
PREVIEW='--preview' in sys.argv
SCENE=bpy.context.scene
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
A.init()
M=A.M
random.seed(46)


def path(name,points,width=.8,z=.79):
    # Birleşik patikalar yumuşak dönüşlerle araziyi izler; açık renkli kart şeritleri yok.
    smooth=[]
    for i in range(len(points)-1):
        p0=Vector(points[max(0,i-1)]);p1=Vector(points[i]);p2=Vector(points[i+1]);p3=Vector(points[min(len(points)-1,i+2)])
        steps=max(5,int((p2-p1).length*3))
        for j in range(steps):
            t=j/steps
            smooth.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t))
    smooth.append(Vector(points[-1]));points=smooth
    verts=[]
    for i,p in enumerate(points):
        v=Vector(points[min(i+1,len(points)-1)])-Vector(points[max(0,i-1)])
        v.normalize();n=Vector((-v.y,v.x))*width/2
        for side in [1,-1]:
            x=p[0]+side*n.x;y=p[1]+side*n.y
            verts.append((x,y,max(z,DAG.height(x,y)+.026)))
    A.mesh(name,verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(points)-1)],M['path'])
    # Yol kenarlarında ayrı sınır taşı ya da eğrelti yoktur; çayır sade kalır.


def fountain(x,y,r=1.05):
    A.cyl('Yağmur bahçesi · taş havuz',(x,y,.90),r,.25,M['stone'])
    A.cyl('Yağmur bahçesi · su',(x,y,1.04),r*.85,.04,M['blue'])
    A.annulus('Yağmur bahçesi · çevre',(x,y),r*.87,r,1.09,.12,M['cream'])
    for i in range(3):
        a=i*2.2
        A.sphere('Havuz · nilüfer',(x+.4*cos(a),y+.4*sin(a),1.09),(.24,.19,.025),M['leaf2'])

def sign(label,x,y,z=1.1,width=4.0,size=.45,height=.92,egim=0.0):
    """Pirinç çerçeveli emaye tabela. `egim` (radyan) levhayı üst kenarı geriye yatırarak
    yukarıdan bakan kameraya çevirir; taşıyıcılar dik kalır, levha parçaları aynı eksende döner."""
    ground=(.77-A.ROOT.location.z)/A.ROOT.scale.z if A.ROOT else .77
    for xx in [x-width*.36,x+width*.36]:A.cyl('Tabela · taşıyıcı',(xx,y,(ground+z+.12)/2),.05,z+.12-ground,M['brass'],12)
    c,s=cos(egim),sin(egim)
    def yatik(d):return (x,y-d*c,z+d*s)
    o=A.cube('Tabela · pirinç çerçeve',(x,y,z),(width,.17,height),M['brass'],.05);o.rotation_euler.x=-egim
    o=A.cube('Tabela · emaye',yatik(.105),(width-.12,.065,height-.12),M['teal'],.035);o.rotation_euler.x=-egim
    A.text('Tabela · '+label,label,yatik(.15),size,M['white'],rotation=(pi/2-egim,0,0))


def butterfly(x,y,z):
    for side in [-1,1]:
        o=A.sphere('Tozlayıcı bahçe · kelebek',(x+side*.1,y,z),(.14,.22,.025),M['yellow']);o.rotation_euler.y=side*.48
    A.bar('Kelebek · gövde',(x,y-.14,z),(x,y+.14,z),.018,M['dark'])

# Ormanlık uçurum: karşı iki yamaç ve büyük laboratuvarın üçüncü kaya terası.
cevre=A.group('environment')
DAG.generate()
# Fosiller kendi köklerinde (fosil_*) dışa aktarılır; web sahnesinde tıklanabilir. Ardından çevre kökü sürer.
import fosiller
fosiller.generate()
A.ROOT=cevre

# Ana omurga, bina terasları ve köprüleri bağlayan okunur yürüyüş yolları.
# İlkokulda 3. sınıf güneyde, 4. sınıf kuzeyde; aralarındaki mesafe ekranda üst üste binmeyi önler.
path('İlkokul · gezinti yolu',[(-24,-12.5),(-20.5,-12),(-17.3,-8.5),(-16.2,-3),(-15,4),(-15,11)],1.2)
path('İlkokul · 3.sınıf patikası',[(-24,-9.9),(-23.5,-11.2),(-22,-12.2)],1.05)
path('İlkokul · 4.sınıf patikası',[(-24,7.2),(-22.5,5.5),(-18,4.6),(-14.4,4)],1.05)
# Ortaokulun dört yapısı birbirine yakın (11,5 birim); ana aks aralarındaki dar koridordan geçer.
path('Ortaokul · ana aks',[(-5,10.5),(0,9.3),(8,9.2),(15,9.3),(22,10)],1.35)
path('Ortaokul · ortak gezinti',[(8,9.2),(8.75,6),(8.75,1),(8,-1.5),(3,-3.5)],1.3)
path('5.sınıf · bağlı giriş',[(3,11.7),(2.5,10.4),(0,9.3)],1.05)
path('6.sınıf · bağlı giriş',[(14.5,11.7),(14.8,10.4),(15,9.3)],1.05)
path('7.sınıf · bağlı giriş',[(3,-2.2),(3.2,-3),(3,-3.5)],1.05)
path('8.sınıf · bağlı giriş',[(14.5,-2.2),(14,-1.8),(12,-1.5),(8,-1.5)],1.05)
path('Laboratuvar · doğu bahçe yolu',[(3,-12),(9,-14),(12.6,-19),(12.5,-28),(8,-33),(1,-32.5)],1.45)
path('Laboratuvar · batı bahçe yolu',[(-10.7,-11.5),(-9,-14),(-10.9,-20),(-11,-27),(-7,-32),(1,-32.5),(1,-30.65)],1.45)
path('İlkokul · köprü yaklaşımı',[(-15,11),(-14,11),(-12.8,11)],1.3)
path('Merak patikası',[(-22,-12.5),(-20,-11.5),(-18,-10.5)],1.3)
import kopru_mimarisi as KOPRU
KOPRU.bridge('Bilim Kemeri',(-12.8,11),(-5,12),2.3,'arch')
KOPRU.bridge('Merak Geçidi',(-18,-10.5),(-10.7,-11.5),1.9,'suspension')
KOPRU.bridge('Laboratuvar Galerisi',(3,-3.5),(3,-12),2.4,'covered')

# Peyzaj: ağaçlar binaların önünü kapatmaz, yamaçları ve avlu boşluklarını tanımlar.
# Kampüs ağaçları seyrek: yalnız yapıları çerçeveleyenler kalır.
trees=[(-30,2,1.4),(-16,18,1),(-2,22,1.15),(22,20,1.3),(25,11,1.3),(-8,-13,.8),(15,-24,1.1)]
for i,(x,y,s) in enumerate(trees):A.tree(x,y,.8,s,31+i)
for x,y,a in [(-14,0,pi/2),(-24,3.5,0),(8.75,13.5,0),(22,8,pi/2),(-7,-33,0),(14,-24,-pi/2)]:A.bench(x,y,.8,a)
# Yol lambaları yalnız köprü yaklaşımlarında ve ana kavşaklarda; çayırda küçük nesne yoktur.
for x,y in [(-14,6),(-4,10.2),(21,10),(4,-3),(-8,-13),(11,-29)]:A.lamp(x,y,.78)
fountain(-27.5,4.5,.85);fountain(22.5,12.5,1.05);fountain(15,-23,.85)
# Peyzaj noktaları (şimşir, çiçek), kelebekler ve mineral küreleri kaldırıldı: çayır sade kalır.

# İlkokulun ekim bahçesi: 3. sınıfın batısında iki toprak yatağı, ayrı saksı ve etiket yok.
for i in range(2):
    x=-30.3;y=-8+i*1.9
    A.cube('Ekim bahçesi · yükseltilmiş yatak',(x,y,.96),(1.65,.95,.32),M['wood'])
    A.cube('Ekim bahçesi · toprak',(x,y,1.14),(1.5,.82,.08),M['soil'])
# Alan tabelaları büyük, hafif geriye yatık ve iri yazılı: uzaktan okunur.
sign('İLKOKUL',-28,-14.5,1.95,7.6,1.0,1.7,.3)
sign('ORTAOKUL',12,-3,1.95,8.6,1.0,1.7,.3)
import dag_dekorlari as DEKOR
# Hayvanlar ayrı köklerde dışa aktarılır (web_aktar.CANLILAR) ve web sahnesinde canlandırılır:
# yerel +X yönü baştır, kökün konumu hayvanın ayak (ya da uçuşta gövde) noktasıdır.
# Keçi basamakları: doğu kanyon kolunun kameraya bakan kuzey duvarındaki düz tepeli seki kayaları.
BASAMAKLAR=[]
for i,(x,d) in enumerate([(7.6,2.15),(11.4,2.38),(15.3,2.05),(19.0,2.42),(22.8,2.12),(26.3,2.46)]):
    y=DAG.kol_y(2,x)+d
    z=DAG.height(x,y)+.45
    DAG.basamak('Keçi basamağı',x,y,z,1.05,.8,2.3,140+i,M['cliff'+str((i+1)%4)])
    BASAMAKLAR.append((x,y,z))
# Three.js koordinatları: (x, z, -y). Her keçi aynı basamak listesini taşır.
basamak_verisi=json.dumps([[round(x,3),round(z,3),round(-y,3)] for x,y,z in BASAMAKLAR])
for ad,sira,olcek in [('keci_buyuk',0,1.38),('keci_kucuk',3,.98)]:
    kk=A.group(ad,BASAMAKLAR[sira])
    DEKOR.keci(0,0,0,angle=0,scale=olcek)
    kk['basamaklar']=basamak_verisi;kk['ilkBasamak']=sira
# Keçi köklerinden sonra çevre köküne dönülür; kayalık keçiye değil çevreye bağlanır.
A.ROOT=cevre
DAG.rock('Kartal kayalığı',27,17,.8,1.1,1,3.4,45,M['stone'])
# Tünekteki kartal arada uçup geri konar: tünek pozu ve aynı yerde gizli bir uçuş pozu.
kk=A.group('kartal_tunek',(27,17,4.1));DEKOR.kartal(0,0,0,angle=0,scale=1.25,ucuyor=False);kk['yon']=-.5
kk=A.group('kartal_tunek_ucus',(27,17,4.1));DEKOR.kartal(0,0,0,angle=0,scale=1.25,ucuyor=True);kk['yon']=-.5
for o in kk.children:o.hide_render=True
# Süzülen kartal: web sahnesinde kanyon üstünde sekiz çizerek iki yöne döner.
kk=A.group('kartal_ucan',(-15,18,12));DEKOR.kartal(0,0,0,angle=0,scale=1.65,ucuyor=True);kk['yon']=.25

BUILDINGS=[
    ('grade_3',3,'Doğa Kaşifleri Evi',(-24,-5,.85),B.build_3,'#dea669'),
    ('grade_4',4,'Kuvvet ve Işık Pavyonu',(-24,12,.85),B.build_4,'#d98165'),
    ('grade_5',5,'Gök ve Yaşam Gözlemevi',(3,16,.85),B.build_5,'#5eaaaf'),
    ('grade_6',6,'Yörünge ve Hareket Merkezi',(14.5,16,.85),B.build_6,'#d7ad57'),
    ('grade_7',7,'Atom ve Enerji Enstitüsü',(3,2.5,.85),C.build_7,'#8390bf'),
    ('grade_8',8,'Yaşam ve İklim Biyosferi',(14.5,2.5,.85),C.build_8,'#86ad83'),
    ('lab',None,'Merak Laboratuvarı',(1,-24,.85),C.build_lab,'#edb744'),
]
PALETLER={
    'grade_3':{'teal':(.045,.42,.16),'mint':(.36,.70,.22),'glass':(.33,.72,.57),'coral':(.96,.24,.10),'yellow':(1,.68,.045),'blue':(.05,.44,.82),'cream':(.96,.89,.71)},
    'grade_4':{'teal':(.025,.32,.68),'mint':(.19,.56,.75),'glass':(.22,.63,.85),'coral':(.92,.14,.07),'yellow':(1,.65,.025),'navy':(.03,.12,.36),'cream':(.94,.86,.68)},
    'grade_5':{'teal':(.027,.13,.40),'blue':(.05,.26,.65),'navy':(.016,.044,.16),'glass':(.25,.49,.74),'brass':(.85,.52,.095),'yellow':(1,.63,.03),'cream':(.87,.89,.91)},
    'grade_6':{'teal':(.018,.44,.50),'mint':(.15,.70,.61),'glass':(.23,.68,.75),'coral':(.97,.29,.055),'yellow':(.97,.55,.035),'brass':(.76,.42,.12)},
    'grade_7':{'teal':(.32,.105,.48),'purple':(.52,.20,.71),'glass':(.55,.39,.77),'mint':(.58,.44,.70),'brass':(.76,.38,.17),'cream':(.91,.85,.91)},
    'grade_8':{'teal':(.025,.34,.16),'mint':(.09,.57,.29),'glass':(.25,.65,.41),'blue':(.06,.48,.51),'coral':(.85,.34,.19),'brass':(.63,.42,.16)},
    'lab':{'teal':(.012,.38,.44),'mint':(.16,.58,.56),'glass':(.35,.69,.76),'coral':(.95,.32,.055),'yellow':(1,.68,.04),'brass':(.85,.51,.11),'cream':(.97,.91,.75)},
}
BASE_M=dict(M)
metadata=[]
for key,grade,name,position,fn,color in BUILDINGS:
    M.clear();M.update(BASE_M)
    for matkey,rgb in PALETLER[key].items():
        mat=BASE_M[matkey].copy();mat.name=key+' · '+matkey
        mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*rgb,1)
        mat.diffuse_color=(*rgb,mat.diffuse_color[3]);M[matkey]=mat
    root=A.group(key,position)
    # Sınıf yapıları çayırda öne çıkacak kadar büyük; laboratuvar ortak merkez olarak daha da büyük.
    root.scale=(1.22,1.22,1.22) if grade else (1.6,1.6,1.6)
    root['title']=name;root['grade']=grade or 0
    print('BUILD',key,name,flush=True)
    # Doğal zemin yapı altına kesintisiz girer; yapıların çevresinde ortak taş patikalar vardır.
    fn()
    # Sınıf tabelaları genel görünümde de okunur: geniş levha, büyük harf, kameraya doğru eğim.
    if grade==7:
        # 7. sınıfın girişi doğrudan Laboratuvar Galerisi'nin kapısına açılır; kapı portalı girişin
        # önündeki tabelayı örterdi. Tabela kapının batısında, batı kanadının önünde durur.
        sign('7. SINIF',-3.77,-4.05,1.15,3.5,.56,1.35,.4)
    elif grade:
        sign(f'{grade}. SINIF',0,-4.05,1.15,4.6,.72,1.35,.4)
    else:sign('LABORATUVAR',0,-4.7,1.2,6.6,.62,1.25,.4)
    metadata.append({'id':key,'grade':grade,'name':name,'color':color,'position':[position[0],position[2],-position[1]]})

A.ROOT=None
import atmosfer
atmosfer.generate()

# Perspektifi bozmayan mimari ortografik kamera: okunur ön cepheler, açık avlular.
camdata=bpy.data.cameras.new('Fen Keşif Köyü · kamera');cam=bpy.data.objects.new(camdata.name,camdata);A.COL.objects.link(cam)
target=Vector((-1,-1,-.5));cam.location=(8,-87,68);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
camdata.type='ORTHO';camdata.ortho_scale=77;camdata.lens=50;SCENE.camera=cam

def area(name,pos,power,size,color):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);A.COL.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('Sabah · yumuşak ana ışık',(-26,-32,52),8200,22,(1,.88,.71))
area('Orman · serin dolgu',(35,-5,33),5400,25,(.72,.9,1))
area('Ufuk · çatı kenarları',(5,38,36),6500,20,(1,.93,.80))
sun=bpy.data.lights.new('Güneş','SUN');sun.energy=2.5;sun.angle=.14;sun.color=(1,.91,.78)
so=bpy.data.objects.new('Güneş',sun);A.COL.objects.link(so);so.rotation_euler=(.48,-.35,-.45)
world=bpy.data.worlds.new('Dağ sabahı');world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.50,.67,.73,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.4;SCENE.world=world
SCENE.render.engine='CYCLES'
SCENE.cycles.samples=32 if PREVIEW else 96
SCENE.cycles.use_denoising=True
SCENE.cycles.max_bounces=6;SCENE.cycles.transparent_max_bounces=8
try:
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='OPTIX';prefs.get_devices()
    usable=[d for d in prefs.devices if d.type=='OPTIX']
    if usable:
        for d in prefs.devices:d.use=d in usable
        SCENE.cycles.device='GPU'
except Exception:pass
SCENE.render.resolution_x=2880;SCENE.render.resolution_y=1920
SCENE.render.resolution_percentage=60 if PREVIEW else 100
SCENE.render.image_settings.file_format='PNG';SCENE.render.image_settings.color_mode='RGB'
SCENE.view_settings.view_transform='AgX';SCENE.view_settings.look='AgX - Medium High Contrast'
SCENE.view_settings.exposure=-.10
SCENE.render.filepath=os.path.join(HERE,'fen-kesif-koyu-onizleme.png' if PREVIEW else 'fen-kesif-koyu.png')
SCENE['project']='Fen Keşif Köyü'
SCENE['grades']='İlkokul 3–4 / Ortaokul 5–8'
SCENE['curriculum_note']='MEB 2026 TYMM ve 4/8.sınıf geçiş programları; kazanim-arastirmasi.md'
SCENE['scientific_models']='Çatılardaki atom, DNA ve gezegenler simgesel; ölçekli bilimsel model değildir.'
bpy.context.view_layer.update()
for item in metadata:
    p=bpy.data.objects[item['id']].matrix_world @ Vector((0,-4,1))
    uv=world_to_camera_view(SCENE,cam,p)
    item['posterAnchor']=[round(uv.x,5),round(1-uv.y,5)]
with open(os.path.join(OUT,'sahne.json'),'w',encoding='utf8') as f:json.dump({'title':'Fen Keşif Köyü','buildings':metadata},f,ensure_ascii=False,indent=2)
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE,'fen-kesif-koyu.blend'))
print('BLEND_SAVED',len(SCENE.objects),flush=True)
if '--no-render' not in sys.argv:
    bpy.ops.render.render(write_still=False)
    temporary=os.path.join(HERE,'fen-kesif-koyu-render.png')
    try:
        bpy.data.images['Render Result'].save_render(temporary,scene=SCENE)
        os.replace(temporary,SCENE.render.filepath)
        print('RENDER_DONE',flush=True)
    except (RuntimeError,OSError) as error:
        print('POSTER_SAVE_ERROR',str(error),'Use posteri_render.py to retry; model export continues.',flush=True)

# Web için her yapı/malzeme çiftinde birleştir; kaynak .blend düzenlenebilir kalır.
import web_aktar
web_aktar.export_scene(PREVIEW)
