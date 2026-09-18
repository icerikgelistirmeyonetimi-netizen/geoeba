# -*- coding: utf-8 -*-
"""EBA Tasiyici Tip / Karakter (goz) varliklarini uretir.
Olculer, EBA Gorsel Kimlik Kullanim Kilavuzu sayfa 24'teki vektorden olculup
220x220 kutuya olceklendi. Pozlar sayfa 22'deki bes varyanttan alindi.
"""
import io, os, math

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'eba-karakter')
os.makedirs(D, exist_ok=True)

# --- kilavuzdan olculen geometri (220 birimlik karo) ---
S      = 220.0      # karo kenari
KOSE   = 36.85      # karo kose yaricapi
C      = 110.0      # merkez
R_DIS  = 56.34      # halka dis yaricapi
R_IC   = 41.08      # halka ic yaricapi = beyaz daire
R_HAT  = (R_DIS + R_IC) / 2          # 48.71 halka orta yaricapi
KALIN  = R_DIS - R_IC                # 15.26 halka kalinligi
R_BEB  = 13.95      # bebek (goz bebegi)
CUBUK  = 15.27      # cubuk kalinligi
CU_R   = CUBUK / 2
CU_DIS = 22.99      # cubugun karo kenarina olan uzakligi
CU_IC  = C - R_IC   # 68.92 cubugun ic ucu = beyaz daire kenari
SOL_A, SOL_B = CU_DIS + CU_R, CU_IC - CU_R          # 30.63 .. 61.29
SAG_A, SAG_B = S - CU_IC + CU_R, S - CU_DIS - CU_R  # 158.71 .. 189.37

KIRMIZI = '#D03238'   # PANTONE 1797 C - kilavuz renk tablosu
KOYU    = '#231F20'   # PANTONE Black C (CMYK 0/0/0/100), kilavuzda cizildigi hali
BEYAZ   = '#FFFFFF'

# --- kilavuz sayfa 22'deki bes poz: (donme, bebek x, bebek y) ---
POZLAR = {
    'N': (  0.0,   0.00,   0.00),   # notr - kilavuzun ana karakteri
    'E': (-73.0, +21.81,   0.00),
    'A': (-36.0, +13.95, +14.59),
    'D': (-14.0,   0.00, -22.08),
    'B': (+14.0, -13.95, -13.31),
    'C': (+64.0, +13.95, -13.95),
}


def s(v):
    t = f'{v:.2f}'.rstrip('0').rstrip('.')
    return t if t not in ('', '-0') else '0'


def karo(renk):
    return (f'<rect x="0" y="0" width="{s(S)}" height="{s(S)}" '
            f'rx="{s(KOSE)}" ry="{s(KOSE)}" fill="{renk}"/>')


def cubuklar(renk, sinif=''):
    a = f' class="{sinif}"' if sinif else ''
    return (f'<g{a} fill="none" stroke="{renk}" stroke-width="{s(CUBUK)}" stroke-linecap="round">'
            f'<path d="M{s(SOL_A)} {s(C)}H{s(SOL_B)}"/>'
            f'<path d="M{s(SAG_A)} {s(C)}H{s(SAG_B)}"/></g>')


def halka(renk):
    return (f'<circle cx="{s(C)}" cy="{s(C)}" r="{s(R_HAT)}" fill="none" '
            f'stroke="{renk}" stroke-width="{s(KALIN)}"/>')


def govde(renk_karo, renk_goz, renk_beb, bebek_ofs=(0, 0), donme=0.0, sinifli=False):
    """Tek bir karakterin ic cizimi. sinifli=True ise animasyon siniflari eklenir."""
    ox, oy = bebek_ofs
    p = []
    p.append(karo(renk_karo))
    if sinifli:
        p.append(f'<g class="kdonen">{cubuklar(renk_goz)}</g>')
    else:
        g = cubuklar(renk_goz)
        if donme:
            g = f'<g transform="rotate({s(donme)} {s(C)} {s(C)})">{g}</g>'
        p.append(g)
    p.append(halka(renk_goz))
    ic = [f'<circle cx="{s(C)}" cy="{s(C)}" r="{s(R_IC)}" fill="{BEYAZ}"/>']
    if sinifli:
        ic.append(f'<g class="kbebek"><circle cx="{s(C)}" cy="{s(C)}" r="{s(R_BEB)}" fill="{renk_beb}"/></g>')
    else:
        ic.append(f'<circle cx="{s(C + ox)}" cy="{s(C + oy)}" r="{s(R_BEB)}" fill="{renk_beb}"/>')
    p.append(f'<g clip-path="url(#ebaIc)">' + ''.join(ic) + '</g>')
    return ''.join(p)


KIRP = (f'<clipPath id="ebaIc"><circle cx="{s(C)}" cy="{s(C)}" r="{s(R_IC)}"/></clipPath>')


def svg_sar(ic, w=S, h=S, vb=None, defs='', stil='', baslik=''):
    vb = vb or f'0 0 {s(S)} {s(S)}'
    t = f'<title>{baslik}</title>' if baslik else ''
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb +
            f'" width="{s(w)}" height="{s(h)}">' + t +
            (f'<defs>{defs}</defs>' if defs else '') +
            (f'<style>{stil}</style>' if stil else '') + ic + '</svg>\n')


def yaz(ad, metin):
    with io.open(os.path.join(D, ad), 'w', encoding='utf-8') as f:
        f.write(metin)
    print('  ', ad, len(metin), 'bayt')


# ------------------------------------------------------------------ duragan
print('duragan karakterler:')
yaz('eba-karakter.svg', svg_sar(
    govde(KIRMIZI, KOYU, KIRMIZI), defs=KIRP,
    baslik='EBA tasiyici tip / karakter'))

yaz('eba-karakter-kirmizi-zemin.svg', svg_sar(
    govde(BEYAZ, KIRMIZI, KIRMIZI), defs=KIRP,
    baslik='EBA tasiyici tip / karakter - kirmizi zemin icin'))

yaz('eba-karakter-koyu-zemin.svg', svg_sar(
    govde(BEYAZ, KOYU, KOYU), defs=KIRP,
    baslik='EBA tasiyici tip / karakter - koyu zemin icin'))

# ------------------------------------------------------------------ pozlar
sira = ['A', 'B', 'C', 'D', 'E']       # kilavuz sayfa 22'deki soldan saga dizilim
ara, kutu = 118.5, S   # kilavuzdaki karo araligi (81.96/152.14)
gen = len(sira) * kutu + (len(sira) - 1) * ara
parca = []
for i, ad in enumerate(sira):
    don, ox, oy = POZLAR[ad]
    x = i * (kutu + ara)
    parca.append(f'<g transform="translate({s(x)} 0)">' +
                 govde(KIRMIZI, KOYU, KIRMIZI, (ox, oy), don) + '</g>')
yaz('eba-karakter-pozlar.svg', svg_sar(''.join(parca), w=gen, h=kutu,
                                       vb=f'0 0 {s(gen)} {s(kutu)}', defs=KIRP,
                                       baslik='Kilavuz sayfa 22 - bes bakis pozu'))

# ------------------------------------------------------------------ animasyon
# zaman cizelgesi: notr -> E -> A -> D -> B -> C -> notr, aralarda kirpma
ZAMAN = [(0, 'N'), (6, 'N'), (12, 'E'), (22, 'E'), (28, 'A'), (38, 'A'),
         (44, 'D'), (54, 'D'), (60, 'B'), (70, 'B'), (76, 'C'), (86, 'C'),
         (94, 'N'), (100, 'N')]
YUMUSAK = 'cubic-bezier(.62,.03,.2,1)'


def keyframes():
    don, beb = [], []
    for yzd, ad in ZAMAN:
        d, ox, oy = POZLAR[ad]
        don.append(f'{yzd}%{{transform:rotate({s(d)}deg);animation-timing-function:{YUMUSAK}}}')
        beb.append(f'{yzd}%{{transform:translate({s(ox)}px,{s(oy)}px);animation-timing-function:{YUMUSAK}}}')
    return ('@keyframes ebaBak{' + ''.join(don) + '}'
            '@keyframes ebaBebek{' + ''.join(beb) + '}')


SURE = '9s'
STIL = ('.kdonen,.kbebek{transform-box:view-box;transform-origin:'
        f'{s(C)}px {s(C)}px}}'
        f'.kdonen{{animation:ebaBak {SURE} infinite}}'
        f'.kbebek{{animation:ebaBebek {SURE} infinite}}'
        '@media(prefers-reduced-motion:reduce){.kdonen,.kbebek{animation:none}}'
        + keyframes())

print('animasyonlu karakterler:')
yaz('eba-karakter-animasyon.svg', svg_sar(
    govde(KIRMIZI, KOYU, KIRMIZI, sinifli=True), defs=KIRP, stil=STIL,
    baslik='EBA tasiyici tip / karakter - animasyonlu'))

yaz('eba-karakter-animasyon-kirmizi-zemin.svg', svg_sar(
    govde(BEYAZ, KIRMIZI, KIRMIZI, sinifli=True), defs=KIRP, stil=STIL,
    baslik='EBA tasiyici tip / karakter - kirmizi zemin, animasyonlu'))

yaz('eba-karakter-animasyon-koyu-zemin.svg', svg_sar(
    govde(BEYAZ, KOYU, KOYU, sinifli=True), defs=KIRP, stil=STIL,
    baslik='EBA tasiyici tip / karakter - koyu zemin, animasyonlu'))

# ------------------------------------------------------------------ kilit (logo + karakter)
YAZI_W, YAZI_H = 479.066, 101.335        # kilavuz sayfa 24 olculeri
with io.open(os.path.join(D, 'eba-yazi-kilavuz.svg'), encoding='utf-8') as f:
    yazi_svg = f.read()
yazi_d = yazi_svg.split(' d="')[1].split('"')[0]

ORAN = S / 202.67                         # kilavuz karo -> 220 birim
yw, yh = YAZI_W * ORAN, YAZI_H * ORAN     # yazi markasi olcekli
bosluk = 73.70 * ORAN                     # kilavuzdaki yazi-karakter araligi
toplam = yw + bosluk + S


def kilit(renk_yazi, karakter_ic, anim=False):
    ust = (S - yh) / 2
    return (f'<g transform="translate(0 {s(ust)}) scale({s(ORAN)})">'
            f'<path fill="{renk_yazi}" fill-rule="evenodd" d="{yazi_d}"/></g>'
            f'<g transform="translate({s(yw + bosluk)} 0)">{karakter_ic}</g>')


print('yatay kilit (yazi + karakter):')
yaz('eba-logo-karakter-yatay.svg', svg_sar(
    kilit(KIRMIZI, govde(KIRMIZI, KOYU, KIRMIZI)),
    w=toplam, h=S, vb=f'0 0 {s(toplam)} {s(S)}', defs=KIRP,
    baslik='EBA logosu + tasiyici tip, yatay'))

yaz('eba-logo-karakter-yatay-animasyon.svg', svg_sar(
    kilit(KIRMIZI, govde(KIRMIZI, KOYU, KIRMIZI, sinifli=True)),
    w=toplam, h=S, vb=f'0 0 {s(toplam)} {s(S)}', defs=KIRP, stil=STIL,
    baslik='EBA logosu + tasiyici tip, yatay, animasyonlu'))

# koyu zemin: beyaz yazi markasi + beyaz karo / koyu goz (kilavuz s.26 sol alt)
yaz('eba-logo-karakter-yatay-koyu-zemin.svg', svg_sar(
    kilit(BEYAZ, govde(BEYAZ, KOYU, KOYU)),
    w=toplam, h=S, vb=f'0 0 {s(toplam)} {s(S)}', defs=KIRP,
    baslik='EBA logosu + tasiyici tip, yatay, koyu zemin icin'))

yaz('eba-logo-karakter-yatay-koyu-zemin-animasyon.svg', svg_sar(
    kilit(BEYAZ, govde(BEYAZ, KOYU, KOYU, sinifli=True)),
    w=toplam, h=S, vb=f'0 0 {s(toplam)} {s(S)}', defs=KIRP, stil=STIL,
    baslik='EBA logosu + tasiyici tip, yatay, koyu zemin, animasyonlu'))

# TEK SEFERLIK surumler: ilk acilista bir kez oynar, notr pozda durur (son kare = duragan logo)
STIL_TEK = STIL.replace(f'{SURE} infinite', f'{SURE} 1 both')
yaz('eba-logo-karakter-yatay-animasyon-tek.svg', svg_sar(
    kilit(KIRMIZI, govde(KIRMIZI, KOYU, KIRMIZI, sinifli=True)),
    w=toplam, h=S, vb=f'0 0 {s(toplam)} {s(S)}', defs=KIRP, stil=STIL_TEK,
    baslik='EBA logosu + tasiyici tip, yatay, tek seferlik animasyon'))
yaz('eba-logo-karakter-yatay-koyu-zemin-animasyon-tek.svg', svg_sar(
    kilit(BEYAZ, govde(BEYAZ, KOYU, KOYU, sinifli=True)),
    w=toplam, h=S, vb=f'0 0 {s(toplam)} {s(S)}', defs=KIRP, stil=STIL_TEK,
    baslik='EBA logosu + tasiyici tip, yatay, koyu zemin, tek seferlik animasyon'))
yaz('eba-karakter-animasyon-tek.svg', svg_sar(
    govde(KIRMIZI, KOYU, KIRMIZI, sinifli=True), defs=KIRP, stil=STIL_TEK,
    baslik='EBA tasiyici tip / karakter - tek seferlik animasyon'))

# yalniz yazi markasi, kilavuz vektorunden, uc renk (siyah = kilavuz renk tablosu #000000)
print('yazi markasi (kilavuz vektoru):')
for ad, renk in (('kirmizi', KIRMIZI), ('siyah', '#000000'), ('beyaz', BEYAZ)):
    yaz(f'eba-yazi-{ad}.svg', svg_sar(
        f'<path fill="{renk}" fill-rule="evenodd" d="{yazi_d}"/>',
        w=YAZI_W, h=YAZI_H, vb=f'0 0 {s(YAZI_W)} {s(YAZI_H)}',
        baslik=f'EBA yazi markasi - {ad}'))

print('\ngeometri ozeti (220 birimlik karo):')
for ad, v in [('kose yaricapi', KOSE), ('halka dis r', R_DIS), ('halka ic r', R_IC),
              ('halka kalinlik', KALIN), ('bebek r', R_BEB), ('cubuk kalinlik', CUBUK),
              ('cubuk dis uc', CU_DIS), ('yazi/karo oran', yw / S)]:
    print(f'  {ad:18s} {v:8.3f}')
