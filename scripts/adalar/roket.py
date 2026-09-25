"""Ortaokul adasının cam piramidinden fırlayan roket (Blender 4.4, dışa aktarımda üretilir).

Kullanıcı isteği (2026-09-24): ana sayfada Ortaokul adasının üzerine gelince cam piramit aralanır,
içinden bir roket fırlar, sonra piramit kapanır. Roket kaynak .blend'lerde yoktur; web_aktar.py
dışa aktarımda `roket_olustur()` ile kurar. Adanın kendi malzemeleri kullanılır (fildişi seramik
gövde, turkuaz burun ve kanatçıklar, şampanya metal bantlar ve lüle, koyu lomboz camı); alev ve
duman sahnede (adaSahnesi.ts) yumuşak sprite olarak çizilir.

Ölçüler metre; z=0 lülenin alt ucu, gövde ekseni +Z. Lomboz −Y'ye (ana kameraya) bakar.
"""

import math

import bmesh
import bpy
from mathutils import Matrix, Vector

GOVDE_R = 0.112          # gövde yarıçapı
BOY = 1.12               # lüle ucundan burun ucuna
BURUN_BOY = 0.38         # teğet ogive burun
KANAT_R = 0.215          # kanatçık uç yarıçapı (X düzeni: önden bakınca iki yana açılır)
DILIM = 40               # çevre bölümü


def _lathe(ad, profil, malzeme, dilim=DILIM, kapak_alt=True, kapak_ust=True):
    """(r, z) profilini Z ekseni etrafında döndürür; uç noktaları r=0 ise tek köşeye toplanır."""
    bm = bmesh.new()
    halkalar = []
    for r, z in profil:
        if r < 1e-6:
            halkalar.append([bm.verts.new((0.0, 0.0, z))])
        else:
            halkalar.append([bm.verts.new((r * math.cos(2 * math.pi * i / dilim), r * math.sin(2 * math.pi * i / dilim), z))
                             for i in range(dilim)])
    for a, b in zip(halkalar, halkalar[1:]):
        if len(a) == 1 and len(b) == 1:
            continue
        if len(a) == 1:
            for i in range(dilim):
                bm.faces.new((a[0], b[i], b[(i + 1) % dilim]))
        elif len(b) == 1:
            for i in range(dilim):
                bm.faces.new((a[i], a[(i + 1) % dilim], b[0]))
        else:
            for i in range(dilim):
                bm.faces.new((a[i], a[(i + 1) % dilim], b[(i + 1) % dilim], b[i]))
    if kapak_alt and len(halkalar[0]) > 1:
        bm.faces.new(list(reversed(halkalar[0])))
    if kapak_ust and len(halkalar[-1]) > 1:
        bm.faces.new(halkalar[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(ad)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    me.materials.append(malzeme)
    return me


def _ogive(taban_z, boy, r, adim=12):
    """Teğet ogive burun profili, tabandan uca (r, z)."""
    rho = (r * r + boy * boy) / (2 * r)
    noktalar = []
    for k in range(adim + 1):
        x = boy * (1 - k / adim)                 # uçtan uzaklık
        y = math.sqrt(max(0.0, rho * rho - (boy - x) ** 2)) + r - rho
        noktalar.append((max(0.0, y), taban_z + boy - x))
    return noktalar


def _kanat(ad, malzeme, aci):
    """Geriye süpürülmüş yamuk kanatçık: kök gövdede, uç KANAT_R'de; 18 mm kalınlık, pahlı."""
    kok_alt, kok_ust = 0.085, 0.37
    uc_alt, uc_ust = 0.015, 0.17
    kal = 0.018
    govde_ic = GOVDE_R - 0.012
    kesit = [(govde_ic, kok_alt), (KANAT_R, uc_alt), (KANAT_R, uc_ust), (govde_ic, kok_ust)]
    bm = bmesh.new()
    alt = [bm.verts.new((r, -kal / 2, z)) for r, z in kesit]
    ust = [bm.verts.new((r, kal / 2, z)) for r, z in kesit]
    bm.faces.new(alt[::-1])
    bm.faces.new(ust)
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((alt[i], alt[j], ust[j], ust[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.transform(bm, matrix=Matrix.Rotation(aci, 4, 'Z'), verts=bm.verts)
    me = bpy.data.meshes.new(ad)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(malzeme)
    return me


def _halka(ad, malzeme, r, z, yukseklik):
    """İnce bant: gövdeyi saran kısa silindir (pahlı kenarlar)."""
    return _lathe(ad, [(r, z - yukseklik / 2), (r, z + yukseklik / 2)], malzeme)


def _lomboz(ad_cerceve, ad_cam, cerceve_mat, cam_mat, z):
    """Önden (−Y) görünen yuvarlak pencere: şampanya çerçeve halkası + koyu cam disk."""
    def disk(ad, r, derinlik, mat, halka_ic=None):
        bm = bmesh.new()
        if halka_ic is None:
            bmesh.ops.create_circle(bm, cap_ends=True, radius=r, segments=32)
        else:
            dis = bmesh.ops.create_circle(bm, cap_ends=False, radius=r, segments=32)["verts"]
            ic = bmesh.ops.create_circle(bm, cap_ends=False, radius=halka_ic, segments=32)["verts"]
            for i in range(32):
                bm.faces.new((dis[i], dis[(i + 1) % 32], ic[(i + 1) % 32], ic[i]))
        bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=derinlik)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(ad)
        bm.to_mesh(me)
        bm.free()
        me.materials.append(mat)
        return me
    # Disk XY düzleminde kurulur, −Y'ye bakacak şekilde X ekseni etrafında çevrilir
    yerlesim = Matrix.Translation((0.0, -(GOVDE_R - 0.004), z)) @ Matrix.Rotation(math.pi / 2, 4, 'X')
    cerceve = disk(ad_cerceve, 0.05, 0.016, cerceve_mat, halka_ic=0.036)
    cam = disk(ad_cam, 0.038, 0.012, cam_mat)
    for me in (cerceve, cam):
        me.transform(yerlesim)
    return cerceve, cam


def malzeme_bul(*adlar):
    for ad in adlar:
        m = bpy.data.materials.get(ad)
        if m is not None:
            return m
    raise RuntimeError("roket: malzeme bulunamadı: " + " / ".join(adlar))


def roket_olustur(koleksiyon, ebeveyn, taban, onek="Roket • "):
    """Roket parçalarını `taban` (dünya, lüle alt ucu) noktasına kurar; nesneleri döndürür.

    Parçalar `ebeveyn`e bağlanır (dünya yerleşimi korunur) ki dışa aktarımda adasının grubuna
    (stage:ortaokul / grade:6) sahip olarak girsin.
    """
    fildisi = malzeme_bul("Kabuk • ipeksi kırık beyaz seramik")
    turkuaz = malzeme_bul("Ortaokul • turkuaz")
    sampanya = malzeme_bul("Metal • fırçalanmış şampanya")
    koyu = malzeme_bul("Metal • gece yeşili")

    lule_ust = 0.085
    govde_ust = BOY - BURUN_BOY
    parcalar = [
        ("lüle", _lathe(onek + "lüle", [(0.052, 0.0), (0.066, 0.012), (0.074, 0.03), (0.06, 0.06), (0.05, lule_ust + 0.01)], sampanya)),
        ("gövde", _lathe(onek + "gövde", [(0.094, lule_ust), (0.104, 0.13), (GOVDE_R, 0.24), (GOVDE_R, govde_ust)], fildisi)),
        ("burun", _lathe(onek + "burun", _ogive(govde_ust, BURUN_BOY, GOVDE_R - 0.001), turkuaz, kapak_ust=False)),
        ("alt bant", _halka(onek + "alt bant", sampanya, GOVDE_R + 0.006, 0.30, 0.03)),
        ("üst bant", _halka(onek + "üst bant", sampanya, GOVDE_R + 0.007, govde_ust + 0.004, 0.028)),
    ]
    cerceve, cam = _lomboz(onek + "lomboz çerçevesi", onek + "lomboz camı", sampanya, koyu, 0.52)
    parcalar += [("lomboz çerçevesi", cerceve), ("lomboz camı", cam)]
    for k in range(4):
        aci = math.pi / 4 + k * math.pi / 2              # X düzeni: önden iki kanat iki yana
        parcalar.append((f"kanatçık {k + 1}", _kanat(onek + f"kanatçık {k + 1}", turkuaz, aci)))

    nesneler = []
    dunya = Matrix.Translation(taban)
    for ad, me in parcalar:
        ob = bpy.data.objects.new(onek + ad, me)
        koleksiyon.objects.link(ob)
        ob.matrix_world = dunya
        if ebeveyn is not None:
            ob.parent = ebeveyn
            ob.matrix_parent_inverse = ebeveyn.matrix_world.inverted()
        if ad in ("gövde", "burun", "lüle", "kanatçık 1", "kanatçık 2", "kanatçık 3", "kanatçık 4"):
            pah = ob.modifiers.new("Roket • yumuşak kenar", "BEVEL")
            pah.width = 0.006 if ad.startswith("kanatçık") else 0.004
            pah.segments = 2
            pah.limit_method = "ANGLE"
            ob.modifiers.new("Roket • yüzey normalleri", "WEIGHTED_NORMAL")
        nesneler.append(ob)
    return nesneler
