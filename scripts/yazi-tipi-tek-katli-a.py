# -*- coding: utf-8 -*-
"""
Manrope ve Fraunces'ta küçük "a" harfini tek katlı yeniden çizer ve public/fonts/ altına woff2 kesimler yazar.

Kaynak: google/fonts deposundaki değişken fontlar (indirilir). Gereksinimler:
    pip install fonttools skia-pathops brotli pillow
Kullanım (proje kökünden):
    python scripts/yazi-tipi-tek-katli-a.py            # kesimleri üretir
    python scripts/yazi-tipi-tek-katli-a.py --onizleme  # ayrıca .font-kaynak/onizleme.png çizer

Yöntem (ayrıntı: public/fonts/README.md):
  Fraunces: a = q'nun üst kısmı (çanak + sağa serifli gövde tepesi) ∪ d'nin gövde altı (ayak serifi)
  Manrope : a = q'nun taban çizgisinde kesilmiş hâli; özgün "a" ilerleme genişliğine sığdırılır,
            gövde kalınlığı korunur; aksanlı a'lar (â vb.) yeniden kurulur.
"""
import os
import sys
import urllib.request

import pathops
from fontTools import subset
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CIKTI_DIZINI = os.path.join(KOK, 'public', 'fonts')
KAYNAK_DIZINI = os.path.join(KOK, '.font-kaynak')  # git dışı ön bellek
RAW = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'
KAYNAKLAR = {
    'manrope': (RAW + 'manrope/Manrope%5Bwght%5D.ttf', 'Manrope[wght].ttf'),
    'fraunces': (RAW + 'fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf', 'Fraunces[SOFT,WONK,opsz,wght].ttf'),
}
FRAUNCES_AGIRLIKLAR = (500, 600)
FRAUNCES_OPSZ = 32
MANROPE_AGIRLIKLAR = (500, 600, 700, 800)


def kaynak(ad):
    os.makedirs(KAYNAK_DIZINI, exist_ok=True)
    url, dosya = KAYNAKLAR[ad]
    yol_ = os.path.join(KAYNAK_DIZINI, dosya)
    if not os.path.exists(yol_):
        print('indiriliyor', url)
        veri = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=120).read()
        open(yol_, 'wb').write(veri)
    return yol_


# ------------------------------------------------------------ geometri yardımcıları
def yol(glyphset, ad):
    p = pathops.Path()
    glyphset[ad].draw(p.getPen())
    return p


def dikdortgen(x0, y0, x1, y1):
    p = pathops.Path()
    p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.close()
    return p


def kes(a, b):
    return pathops.op(a, b, pathops.PathOp.INTERSECTION)


def fark(a, b):
    return pathops.op(a, b, pathops.PathOp.DIFFERENCE)


def birlestir(*ps):
    r = ps[0]
    for p in ps[1:]:
        r = pathops.op(r, p, pathops.PathOp.UNION)
    return r


def en_sag_parca(p, y0, y1):
    """y0..y1 yatay bandındaki en sağ kapalı parçanın (x_min, x_max) aralığı."""
    band = kes(p, dikdortgen(-5000, y0, 5000, y1))
    parcalar = sorted((c.bounds for c in band.contours), key=lambda b: b[2])
    return parcalar[-1][0], parcalar[-1][2]


def glife_yaz(font, ad, p, adv):
    p.simplify(fix_winding=True, clockwise=True)
    pen = TTGlyphPen(font.getGlyphSet())
    p.draw(Cu2QuPen(pen, max_err=1.0))
    g = pen.glyph()
    g.recalcBounds(font['glyf'])
    font['glyf'][ad] = g
    font['hmtx'][ad] = (adv, g.xMin)


def adlari_degistir(font, aile, kesim):
    for rec in font['name'].names:
        try:
            s = rec.toUnicode()
        except Exception:
            continue
        if rec.nameID in (1, 16):
            rec.string = aile
        elif rec.nameID == 4:
            rec.string = f'{aile} {kesim}'
        elif rec.nameID == 6:
            rec.string = f'{aile}-{kesim}'.replace(' ', '')
        elif rec.nameID == 3:
            rec.string = f'{aile}-{kesim}'.replace(' ', '') + ';GeoEBA'
        elif rec.nameID == 5:
            rec.string = s + ' (GeoEBA: tek katli a)'


def kirilsiz_alt_kume(font):
    """Kiril blokları dışındaki tüm karakterleri ve tüm OpenType özelliklerini tutar."""
    cmap = font.getBestCmap()
    tut = [u for u in cmap if not (0x400 <= u <= 0x52F or 0x1C80 <= u <= 0x1C8F or 0x2DE0 <= u <= 0x2DFF or 0xA640 <= u <= 0xA69F)]
    opt = subset.Options()
    opt.layout_features = ['*']
    opt.name_IDs = ['*']
    opt.name_legacy = True
    opt.notdef_outline = True
    opt.glyph_names = True
    opt.hinting = False
    s = subset.Subsetter(opt)
    s.populate(unicodes=tut)
    s.subset(font)


def kaydet(font, temel):
    os.makedirs(CIKTI_DIZINI, exist_ok=True)
    w2 = os.path.join(CIKTI_DIZINI, temel + '.woff2')
    font.flavor = 'woff2'
    font.save(w2)
    print(f'  {temel}.woff2: {os.path.getsize(w2) // 1024} KB, {len(font.getGlyphOrder())} glif')
    return w2


# ----------------------------------------------------------------------- Fraunces
def fraunces_duzenle(wght):
    vf = TTFont(kaynak('fraunces'))
    # SOFT 0 ve WONK 1 eksen varsayılanları: Google Fonts'un sunduğu görünüm
    f = instancer.instantiateVariableFont(vf, {'wght': wght, 'opsz': FRAUNCES_OPSZ, 'SOFT': 0, 'WONK': 1})
    gs = f.getGlyphSet()
    glyf = f['glyf']
    a_eski = glyf['a']; a_eski.recalcBounds(glyf)
    q, d = yol(gs, 'q'), yol(gs, 'd')
    q_adv = f['hmtx']['q'][0]
    # Gövde kenarları çanağın dışında ölçülür: q için inen kuyruk bandı, d için çıkan gövde bandı
    qs0, _ = en_sag_parca(q, -300, -200)
    ds0, _ = en_sag_parca(d, 1150, 1250)
    Y_KES = 260
    q_ust = fark(fark(q, dikdortgen(qs0 - 5, -1000, 5000, Y_KES)), dikdortgen(-5000, -1000, 5000, -60))
    d_alt = kes(d, dikdortgen(ds0 - 220, -100, 5000, Y_KES + 40))
    a_yeni = birlestir(q_ust, d_alt)
    b = a_yeni.bounds
    glife_yaz(f, 'a', a_yeni, q_adv)
    # a'ya bağlı bileşik glifler (â, à, ą ...): aksan ofseti yeni merkeze, ogonek yeni gövdeye göre kayar
    dx_merkez = (b[0] + b[2]) / 2 - (a_eski.xMin + a_eski.xMax) / 2
    dx_govde = b[2] - a_eski.xMax
    for ad in f.getGlyphOrder():
        g = glyf[ad]
        if not g.isComposite() or not any(c.glyphName == 'a' for c in g.components):
            continue
        for c in g.components:
            if c.glyphName != 'a':
                c.x += int(round(dx_govde if 'ogonek' in c.glyphName else dx_merkez))
        f['hmtx'][ad] = (q_adv, f['hmtx'][ad][1])
    print(f'Fraunces {wght}: a bbox {tuple(round(v) for v in b)}, ilerleme {f["hmtx"]["a"][0]}')
    adlari_degistir(f, 'Fraunces GeoEBA', {500: 'Medium', 600: 'SemiBold'}.get(wght, str(wght)))
    kirilsiz_alt_kume(f)
    return kaydet(f, f'fraunces-geoeba-{wght}')


# ------------------------------------------------------------------------ Manrope
def manrope_duzenle(wght):
    kaynak_yolu = kaynak('manrope')
    f = instancer.instantiateVariableFont(TTFont(kaynak_yolu), {'wght': wght})
    ozgun = instancer.instantiateVariableFont(TTFont(kaynak_yolu), {'wght': wght}).getGlyphSet()
    xh = f['OS/2'].sxHeight
    glyf = f['glyf']
    a_eski = glyf['a']; a_eski.recalcBounds(glyf)
    a_adv = f['hmtx']['a'][0]
    q = yol(ozgun, 'q')
    qs0, qs1 = en_sag_parca(q, -400, -300)  # inen kuyruk bandında gövde kenarları
    T = qs1 - qs0
    q_ust = fark(q, dikdortgen(qs0 - 5, -1000, 5000, 0))  # taban çizgisinde kes, çanak taşması kalır
    b0 = q_ust.bounds
    s = (a_eski.xMax - b0[0]) / (b0[2] - b0[0])  # özgün a genişliğine sığdır (sol kenar sabit)
    olcekli = q_ust.transform(s, 0, 0, 1, b0[0] * (1 - s), 0)
    R = olcekli.bounds[2]
    govde_ust = kes(olcekli, dikdortgen(R - T * s / 2 - 5, -1000, R - T * s / 2 + 5, 5000)).bounds[3]
    a_yeni = birlestir(olcekli, dikdortgen(R - T, 0, R, govde_ust))  # gövde kalınlığı geri konur
    glife_yaz(f, 'a', a_yeni, a_adv)
    # Aksanlı a'lar ayrıştırılmış konturlardır: yeni a ∪ aksan parçası (merkez değişmedi)
    cmap = f.getBestCmap()
    for ch in 'àáâäãåāăą':
        ad = cmap.get(ord(ch))
        if not ad or glyf[ad].isComposite():
            continue
        eski = yol(ozgun, ad)
        parca = kes(eski, dikdortgen(-5000, -5000, 5000, 0)) if ch == 'ą' else kes(eski, dikdortgen(-5000, xh + 70, 5000, 5000))
        glife_yaz(f, ad, birlestir(a_yeni, parca), f['hmtx'][ad][0])
    print(f'Manrope {wght}: a bbox {tuple(round(v) for v in a_yeni.bounds)}, ilerleme {a_adv} (korundu), ölçek {s:.4f}')
    adlari_degistir(f, 'Manrope GeoEBA', {500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold'}.get(wght, str(wght)))
    kirilsiz_alt_kume(f)
    return kaydet(f, f'manrope-geoeba-{wght}')


def onizleme(dosyalar):
    from PIL import Image, ImageDraw, ImageFont
    ornek = 'ağaç şaşkın çağla â Kazanım Adası'
    img = Image.new('RGB', (1700, 120 * len(dosyalar) + 20), 'white')
    d = ImageDraw.Draw(img)
    y = 10
    for etiket, w2 in dosyalar:
        t = TTFont(w2); t.flavor = None
        ttf = w2[:-6] + '.onizleme.ttf'
        t.save(ttf)
        yazi = ImageFont.truetype(ttf, 72)
        d.text((16, y), etiket, font=ImageFont.truetype(ttf, 16), fill='gray')
        d.text((16, y + 20), ornek, font=yazi, fill='black')
        d.text((1100, y + 60), 'MAT.1.3.1 · Hedefe ulaşmak için mesafeleri', font=ImageFont.truetype(ttf, 14), fill='black')
        os.remove(ttf)
        y += 120
    hedef = os.path.join(KAYNAK_DIZINI, 'onizleme.png')
    img.save(hedef)
    print('önizleme:', hedef)


if __name__ == '__main__':
    uretilen = []
    for w in FRAUNCES_AGIRLIKLAR:
        uretilen.append((f'Fraunces {w}', fraunces_duzenle(w)))
    for w in MANROPE_AGIRLIKLAR:
        uretilen.append((f'Manrope {w}', manrope_duzenle(w)))
    if '--onizleme' in sys.argv:
        onizleme(uretilen)
