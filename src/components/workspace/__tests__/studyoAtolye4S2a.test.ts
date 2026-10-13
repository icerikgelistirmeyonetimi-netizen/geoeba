import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CircleObject, LineObject, MathObject, PointObject, PolygonObject, RayObject, SegmentObject, SectorObject } from '@/types/math';
import { DEFAULT_STYLE_SETTINGS } from '@/types/workspace';
import { arkaPlanEylemi } from '@/components/ui/Modal';
import { ARKA_PLAN_UYARISI } from '../ValuePromptDialog';
import {
  AYNI_KONUM_ESIGI, DONUSUM_ADLARI, ayniKonumdakiNokta, dogrultuNoktalari, donusumTuru, goruntuNoktaAdi, goruntuNoktaAdlari, kareKoseleri,
} from '@/math/insaYardimcilari';
import { denklemEskiYeri, denklemEtiketiMerkezi, noktaAdiBolgesi, yiginKaymasi, yiginYeriSec } from '../etiketCakismasi';
import { kutularCakisir, type Kutu } from '@/math/yazimDuzeni';
import { olcumBildirimi, tamSayiAyarAnahtari, tamSayiOlcuEtkin, uzunlukOlcBirimi } from '../olcuYuvarlama';
import { kesisimMesaji, kesismiyorMesaji, okunurAd, tamlayan } from '../kesisimMesaji';
import { alanModeliEngelleri, alanModeliniYerlestir } from '../olcmeAraclari';
import { aracYonergesi, YONERGELI_ARACLAR } from '../aracYonergeleri';
import { gruplariSuz } from '../kademeDuzeyleri';
import { TREE_TOOL_GROUPS } from '../treeToolDefinitions';
import { adayYerler, noktaAdiYeri, noktaEngelleri } from '../noktaAdi';
import { olcuMetni, uzunluk } from '@/math/matematikYazimi';
import { parseProjectFile } from '@/math/projectFile';

/*
 * Atölye inceleme 4. tur (geoeba (3).xlsx), Serbest Çizim Stüdyosu — ortaokul, 2B araçlar I: satır 148-156.
 */

const KOK = path.resolve(__dirname, '..');
const oku = (ad: string) => readFileSync(path.join(KOK, ad), 'utf8');

const nokta = (id: string, label: string, x: number, y: number): PointObject => ({
  id, type: 'point', label, showLabel: true, x, y, color: '#000', visible: true, isIndependent: true, createdAt: 0,
});

describe('[148] uzunluk soran pencere açıkken tuval olay almaz', () => {
  it('karartmaya basış: closeOnBackdrop kapalıysa pencere kapanmaz, uyarı verilir; pencerenin içi yok sayılır', () => {
    expect(arkaPlanEylemi(true, true)).toBe('kapat');
    expect(arkaPlanEylemi(true, false)).toBe('uyar');
    expect(arkaPlanEylemi(false, false)).toBe('yok');
    expect(arkaPlanEylemi(false, true)).toBe('yok');
  });

  it('ValuePromptDialog (Ölçülü Parça, Oranda Böl, Kare) karartmayla kapanmaz ve uyarır', () => {
    const kaynak = oku('ValuePromptDialog.tsx');
    expect(kaynak).toMatch(/closeOnBackdrop=\{false\}/);
    expect(kaynak).toMatch(/onBackdropPress=/);
    expect(ARKA_PLAN_UYARISI).toContain('Uygula');
    expect(ARKA_PLAN_UYARISI).toContain('Vazgeç');
  });

  it('tuval kısayolları açık pencerede çalışmaz (modal sayacı), Escape pencereyi kapatır', () => {
    const modal = readFileSync(path.resolve(KOK, '../ui/Modal.tsx'), 'utf8');
    expect(modal).toMatch(/registerModalOpen\(\)/);
    expect(modal).toMatch(/e\.key === 'Escape'/);
  });
});

describe('[149] aynı yerde ikinci nokta açılmaz; doğru denklemi nokta adına binmez', () => {
  it('ayniKonumdakiNokta: kayan nokta artığı içinde aynı konum bulunur, uzaktaki bulunmaz', () => {
    const C = nokta('c', 'C', 0, 1);
    const nesneler: MathObject[] = [nokta('a', 'A', -4, 2), nokta('b', 'B', 4, 0), C];
    expect(ayniKonumdakiNokta(nesneler, 0, 1 + AYNI_KONUM_ESIGI / 10)?.id).toBe('c');
    expect(ayniKonumdakiNokta(nesneler, 0.01, 1)).toBeUndefined();
  });

  it('Orta Nokta ve Orta Dikme orta noktada var olan noktayı kullanır (WorkspaceContext)', () => {
    const ctx = readFileSync(path.resolve(KOK, '../../state/WorkspaceContext.tsx'), 'utf8');
    expect(ctx).toMatch(/const noktaYaDaYeni = /);
    expect(ctx).toMatch(/const orta = noktaYaDaYeni\(pb\[0\]\.x, pb\[0\]\.y/);
    expect(ctx).toMatch(/zaten \[' \+ a\.label \+ b\.label \+ '\] parçasının orta noktası; yeni nokta eklenmedi/);
  });

  it('denklem yazısı ikinci noktanın ad bölgesine değmeyen bir yere konur; eski yer boşsa oynamaz', () => {
    const a = { x: 100, y: 300 };
    const b = { x: 500, y: 400 };
    const boyut = { genislik: 110, yukseklik: 16 };
    const bBolgesi = noktaAdiBolgesi(b, { genislik: 8, yukseklik: 12 });
    const merkez = denklemEtiketiMerkezi({ a, b, boyut, engeller: [bBolgesi], tuval: { genislik: 1000, yukseklik: 800 } });
    const kutu: Kutu = { x0: merkez.x - 55, y0: merkez.y - 8, x1: merkez.x + 55, y1: merkez.y + 8 };
    expect(kutularCakisir(kutu, bBolgesi, 2)).toBe(false);
    // Engel yoksa eski sabit yer (12 px sağ, 8 px üst)
    expect(denklemEtiketiMerkezi({ a, b, boyut, engeller: [] })).toEqual(denklemEskiYeri(b, boyut));
  });

  it('denklem yazısı tuvalden taşmaz (ikinci nokta sağ kenardayken geriye, doğru boyunca konur)', () => {
    const a = { x: 100, y: 300 };
    const b = { x: 990, y: 300 };
    const boyut = { genislik: 110, yukseklik: 16 };
    const m = denklemEtiketiMerkezi({ a, b, boyut, engeller: [noktaAdiBolgesi(b, { genislik: 8, yukseklik: 12 })], tuval: { genislik: 1000, yukseklik: 800 } });
    expect(m.x + 55).toBeLessThanOrEqual(1000);
  });

  it('Canvas denklemi ön geçişteki yerden çizer', () => {
    const canvas = oku('Canvas.tsx');
    expect(canvas).toMatch(/const denklemYerleri = useMemo/);
    expect(canvas).toMatch(/denklemYerleri\.get\(line\.id\)/);
  });
});

describe('[150] Alanı Bul / Çevre Hesapla her dokunuşta görünür sonuç verir', () => {
  it('sonuç zaten etikette ise bildirim bunu söyler; değilse etiketin taşınabildiği söylenir', () => {
    expect(olcumBildirimi('A(ABC) = 13 br²', true)).toBe('A(ABC) = 13 br² (etikette gösteriliyor)');
    expect(olcumBildirimi('A(ABC) = 13 br²', false)).toMatch(/sürükleyerek taşıyabilirsiniz/);
  });

  it('Canvas: çokgen ve çemberde bildirim + zaten görünen etiketin vurgusu', () => {
    const canvas = oku('Canvas.tsx');
    expect(canvas.match(/setHintMessage\(olcumBildirimi\(/g)?.length).toBeGreaterThanOrEqual(5);
    expect(canvas).toMatch(/kartiVurgula\(poly\.id, 'area'\)/);
    expect(canvas).toMatch(/kartiVurgula\(poly\.id, 'perimeter'\)/);
  });
});

describe('[151] / [152] ortaokulda 2 ondalık ve tek birim (br); çokgen kenarı seçilebilir', () => {
  it('tam sayı yazımı kademeye göre: ilkokul hep, ortaokul kendi ayarıyla (varsayılan kapalı), lise/tüm eski ayar', () => {
    const s = DEFAULT_STYLE_SETTINGS;
    expect(s.tamSayiOlcuOrtaokul).toBe(false);
    expect(tamSayiOlcuEtkin(s, 'ilkokul')).toBe(true);
    expect(tamSayiOlcuEtkin(s, 'ortaokul')).toBe(false);
    expect(tamSayiOlcuEtkin(s, 'lise')).toBe(true);
    expect(tamSayiOlcuEtkin(s, 'tum')).toBe(true);
    expect(tamSayiOlcuEtkin({ ...s, tamSayiOlcuOrtaokul: true }, 'ortaokul')).toBe(true);
    expect(tamSayiOlcuEtkin({ ...s, tamSayiOlcu: false }, 'lise')).toBe(false);
    expect(tamSayiAyarAnahtari('ortaokul')).toBe('tamSayiOlcuOrtaokul');
    expect(tamSayiAyarAnahtari('lise')).toBe('tamSayiOlcu');
    expect(tamSayiAyarAnahtari('ilkokul')).toBe('tamSayiOlcu');
  });

  it('r = 2 dairenin alanı ortaokulda 12,57 br² yazılır (tam sayıda 13)', () => {
    const A = 4 * Math.PI;
    expect(olcuMetni({ tur: 'daireAlani', deger: A } as never, { olcuYazimi: 'tam', aciYazimi: 'sapka', tamSayi: tamSayiOlcuEtkin(DEFAULT_STYLE_SETTINGS, 'ortaokul') })).toMatch(/12,57 br²/);
    expect(olcuMetni({ tur: 'daireAlani', deger: A } as never, { olcuYazimi: 'tam', aciYazimi: 'sapka', tamSayi: true })).toMatch(/13 br²/);
  });

  it('kenar ölçüsü ortaokulda 2 ondalık ve br: tuval, bildirim ve liste aynı sayıyı yazar', () => {
    const p1 = nokta('a', 'A', 0, 0);
    const p2 = nokta('b', 'B', 5.81, 0);
    const o = uzunluk(p1, p2, 5.81, { birim: uzunlukOlcBirimi('ortaokul') });
    expect(olcuMetni(o, { olcuYazimi: 'tam', aciYazimi: 'sapka', tamSayi: false })).toMatch(/5,81 br/);
    // İlkokulda da br (uzman 4. tur [177], SIL: ekranda "cm" yok)
    expect(uzunlukOlcBirimi('ilkokul')).toBe('br');
    expect(uzunlukOlcBirimi('lise')).toBe('cm');
    expect(uzunlukOlcBirimi('tum')).toBe('cm');
  });

  it('ortaokulda (ve ilkokulda, SIL [177]) Uzunluk Ölç adı birimini bırakır; lise ve Tüm araçlarda "(cm)" kalır', () => {
    const ad = (k: 'ortaokul' | 'lise' | 'ilkokul' | 'tum') =>
      gruplariSuz(TREE_TOOL_GROUPS, k).flatMap((g) => g.tools).find((t) => t.id === 'measure_distance')?.name;
    expect(ad('ortaokul')).toBe('Uzunluk Ölç');
    expect(ad('lise')).toBe('Uzunluk Ölç (cm)');
    expect(ad('ilkokul')).toBe('Uzunluk Ölç');
    expect(ad('tum')).toBe('Uzunluk Ölç (cm)');
    expect(aracYonergesi('measure_distance', 0, { uzunlukBirimi: 'br' })?.baslik).toBe('Uzunluk Ölç');
    expect(aracYonergesi('measure_distance', 0, {})?.baslik).toBe('Uzunluk Ölç (cm)');
    expect(aracYonergesi('measure_distance', 0, {})?.aciklama).toMatch(/çokgenin bir kenarını/);
  });

  it('Canvas: çokgen kenarına dokunmak kenarın iki köşesini seçmekle aynıdır', () => {
    const canvas = oku('Canvas.tsx');
    expect(canvas).toMatch(/handlePointClick\(sonId, undefined, \[ilkId\]\)/);
    expect(canvas).toMatch(/const tamSayiOlcu = tamSayiOlcuEtkin\(styleSettings, kademe\)/);
  });

  it('proje dosyası yeni ayarı taşır (eski dosyada varsayılan)', () => {
    const p = parseProjectFile({ version: 1, objects: [], styleSettings: { ...DEFAULT_STYLE_SETTINGS, tamSayiOlcuOrtaokul: true } } as never);
    expect(p.styleSettings?.tamSayiOlcuOrtaokul).toBe(true);
    const eski = { ...DEFAULT_STYLE_SETTINGS } as Record<string, unknown>;
    delete eski.tamSayiOlcuOrtaokul;
    expect(parseProjectFile({ version: 1, objects: [], styleSettings: eski } as never).styleSettings?.tamSayiOlcuOrtaokul).toBe(false);
  });
});

describe('[152] dilim etiketleri başka şeklin etiketlerine karışmaz; alan modeli etiketleri örtmez', () => {
  it('yiginYeriSec: itmeden önce başka doğrultu denenir; hiç yoksa null', () => {
    const engel: Kutu = { x0: 0, y0: 0, x1: 100, y1: 20 };
    const ust = { kutular: [{ x0: 10, y0: 5, x1: 60, y1: 15 }], yon: { x: 0, y: -1 } };
    const yan = { kutular: [{ x0: 150, y0: 5, x1: 200, y1: 15 }], yon: { x: 1, y: 0 } };
    expect(yiginYeriSec([ust, yan], [engel])).toEqual({ sira: 1, kayma: 0 });
    // Tek aday: 8 px adımlarla itilir
    expect(yiginYeriSec([ust], [engel], 8, 40)).toEqual({ sira: 0, kayma: 24 });
    expect(yiginYeriSec([ust], [engel], 8, 8)).toBeNull();
    expect(yiginKaymasi(ust.kutular, [engel], ust.yon, 8, 40)).toBe(24);
    expect(yiginKaymasi(yan.kutular, [engel], yan.yon)).toBe(0);
  });

  it('Canvas: dilim/yay yığını diğer şekillerin ölçü kartlarını engel sayar', () => {
    const canvas = oku('Canvas.tsx');
    expect(canvas).toMatch(/kartKutulari\.filter\(\(k\) => k\.id !== shape\.id\)/);
    expect(canvas).toMatch(/yiginYeriSec\(/);
  });

  it('alan modeli üçgenin ve alan/çevre etiketinin üstüne konmaz; engel yoksa ortada kalır', () => {
    const vp = { zoom: 44, panX: 0, panY: 0, width: 920, height: 700 };
    const ucgen: MathObject[] = [
      nokta('a', 'A', -2, -1), nokta('b', 'B', 2, -1), nokta('c', 'C', 0, 2),
      { id: 'p', type: 'polygon', label: 'ABC', showLabel: true, pointIds: ['a', 'b', 'c'], color: '#0f0', visible: true, createdAt: 0, showArea: true, showPerimeter: true } as PolygonObject,
    ];
    const ortada = alanModeliniYerlestir(4, 3, vp);
    expect(ortada.konum).toEqual({ x: -2, y: -1.5 });
    const engeller = alanModeliEngelleri(ucgen);
    const yer = alanModeliniYerlestir(4, 3, vp, engeller);
    const model = { x0: yer.konum.x, y0: yer.konum.y, x1: yer.konum.x + yer.sutun, y1: yer.konum.y + yer.satir };
    for (const e of engeller) {
      expect(model.x0 < e.x1 && e.x0 < model.x1 && model.y0 < e.y1 && e.y0 < model.y1).toBe(false);
    }
    // Etiket şeridi (alt) engelde
    const cokgenKutusu = engeller.find((e) => e.x0 < -2 && e.x1 > 2);
    expect(cokgenKutusu?.y0).toBeLessThan(-2.5);
  });
});

describe('[153] Kare: tıklanan köşe + kenar uzunluğu', () => {
  it('kareKoseleri: sol alt köşeden saat yönünün tersine', () => {
    expect(kareKoseleri({ x: -7, y: 1 }, 3)).toEqual([{ x: -7, y: 1 }, { x: -4, y: 1 }, { x: -4, y: 4 }, { x: -7, y: 4 }]);
  });

  it('tıklama kenar uzunluğu sorar; yönerge ve araç açıklaması davranışı söyler', () => {
    const ctx = readFileSync(path.resolve(KOK, '../../state/WorkspaceContext.tsx'), 'utf8');
    expect(ctx).toMatch(/if \(tool === 'square'\) \{\s+const kose = /);
    expect(ctx).toMatch(/label: 'Kenar uzunluğu'/);
    expect(YONERGELI_ARACLAR).toContain('square');
    expect(aracYonergesi('square', 0)?.aciklama).toMatch(/kenar uzunluğunu yazın/);
    const kare = TREE_TOOL_GROUPS.flatMap((g) => g.tools).find((t) => t.id === 'square');
    expect(kare?.description).toMatch(/kenar uzunluğunu yazın/);
  });
});

describe('[154] Dik / Paralel Doğru önce doğru ya da parça seçebilir', () => {
  it('dogrultuNoktalari: parça, doğru, ışın iki tanım noktasını verir; diğerleri null', () => {
    const seg = { id: 's', type: 'segment', startPointId: 'a', endPointId: 'b' } as SegmentObject;
    const line = { id: 'l', type: 'line', point1Id: 'c', point2Id: 'd' } as LineObject;
    const ray = { id: 'r', type: 'ray', startPointId: 'e', throughPointId: 'f' } as RayObject;
    expect(dogrultuNoktalari(seg)).toEqual(['a', 'b']);
    expect(dogrultuNoktalari(line)).toEqual(['c', 'd']);
    expect(dogrultuNoktalari(ray)).toEqual(['e', 'f']);
    expect(dogrultuNoktalari({ id: 'c', type: 'circle' } as CircleObject)).toBeNull();
  });

  it('Canvas: çizgiye dokunmak nokta üretmez; seçili nokta varsa doğru hemen kurulur', () => {
    const canvas = oku('Canvas.tsx');
    expect(canvas).toMatch(/\(activeTool === 'perpendicular' \|\| activeTool === 'parallel'\) && pendingPointIds\.length < 2/);
    expect(canvas).toMatch(/handlePointClick\(gecen, undefined, \[dogrultu\[0\], dogrultu\[1\]\]\)/);
    expect(aracYonergesi('perpendicular', 0)?.aciklama).toMatch(/Önce bir doğruya ya da doğru parçasına/);
  });
});

describe('[155] Kesiştir bildirimi okunur ve koordinatlıdır; kesişim noktasının adı eksene binmez', () => {
  const aciortay = { id: 'r', type: 'ray', label: 'ABG Açıortayı' } as RayObject;
  const dik = { id: 'l', type: 'line', label: 'Dik doğru: G / AB' } as LineObject;
  const ab = { id: 'ab', type: 'line', label: 'AB Doğrusu' } as LineObject;
  const cd = { id: 'cd', type: 'line', label: 'CD Doğrusu' } as LineObject;
  const cember = { id: 'c', type: 'circle', label: 'A Merkezli Çember' } as CircleObject;

  it('okunur adlar ve tamlayan eki', () => {
    expect(okunurAd(dik)).toBe('G noktasından AB doğrusuna dik doğru');
    expect(okunurAd(aciortay)).toBe('ABG açıortayı');
    expect(okunurAd({ id: 's', type: 'segment', label: '|AB|' } as SegmentObject)).toBe('[AB] doğru parçası');
    expect(okunurAd({ id: 'o', type: 'line', label: '[AB] Orta Dikmesi' } as LineObject)).toBe('[AB] orta dikmesi');
    expect(okunurAd({ id: 'd', type: 'sector', label: 'F Daire Dilimi' } as SectorObject)).toBe('F daire dilimi');
    expect(tamlayan('dik doğru')).toBe('dik doğrunun');
    expect(tamlayan('AB doğrusu')).toBe('AB doğrusunun');
    expect(tamlayan('A merkezli çember')).toBe('A merkezli çemberin');
    expect(tamlayan('ABG açıortayı')).toBe('ABG açıortayının');
  });

  it('uzmanın örneği: "… kesişim noktası L(x; y)"', () => {
    expect(kesisimMesaji(aciortay, dik, [{ ad: 'L', x: -3, y: -0.3014 }])).toBe(
      'ABG açıortayı ile G noktasından AB doğrusuna dik doğrunun kesişim noktası L(-3; -0,3).'
    );
    expect(kesisimMesaji(ab, cd, [{ ad: 'E', x: 1, y: 2 }])).toBe('AB ile CD doğrularının kesişim noktası E(1; 2).');
    expect(kesisimMesaji(ab, cember, [{ ad: 'K', x: 1, y: 0 }, { ad: 'L', x: -1, y: 0 }])).toBe(
      'AB doğrusu ile A merkezli çemberin kesişim noktaları K(1; 0) ve L(-1; 0).'
    );
    expect(kesisimMesaji(ab, cember, [{ ad: 'T', x: 0, y: 1 }])).toMatch(/değme noktası T\(0; 1\) \(teğet\)\.$/);
    expect(kesisimMesaji(ab, cd, [{ ad: 'E', x: 40, y: 2 }], ['E'])).toMatch(/E görünür alanın dışında; görmek için uzaklaştırın\.$/);
    expect(kesismiyorMesaji(ab, cd)).toBe('AB doğrusu ile CD doğrusu kesişmiyor.');
  });

  it('eksenin hemen altındaki noktanın adı eksen çizgisinin üstüne konmaz', () => {
    // Nokta x ekseninin 13 px altında; ad sağ üstte olsaydı eksen çizgisini keserdi
    const p = nokta('f', 'F', 0, 0);
    const ekran = { x: 200, y: 213 };
    const harita = noktaEngelleri([p], new Map([['f', p]]), () => ekran, { yatay: 200, dikey: null });
    const engeller = harita.get('f') ?? [];
    expect(engeller.some((e) => e.tur === 'cizgi')).toBe(true);
    const kutu = { genislik: 8, yukseklik: 12 };
    const yer = noktaAdiYeri(ekran, engeller, kutu);
    const aday = adayYerler(ekran, kutu).find((a) => a.yon === yer.yon);
    expect(aday && aday.ust > 200).toBe(true);
    // Eksen uzaksa engel eklenmez
    expect(noktaEngelleri([p], new Map([['f', p]]), () => ({ x: 200, y: 400 }), { yatay: 200 }).get('f')).toBeUndefined();
  });
});

describe('[156] her dönüşüm kendi adını alır; Nesneler listesi türü yazar', () => {
  it('görüntü adı: A dolu değilse A\', doluysa A\'\', aynı adımda çakışmaz', () => {
    expect(goruntuNoktaAdi('A', ['A', 'B'])).toBe("A'");
    expect(goruntuNoktaAdi('A', ['A', "A'"])).toBe("A''");
    expect(goruntuNoktaAdlari(['A', 'B', 'C'], ['A', 'B', 'C', "A'", "B'", "C'"])).toEqual(["A''", "B''", "C''"]);
    expect(goruntuNoktaAdi('', [])).toBe("'");
  });

  it('dönüşüm türü kaydı ve listede yazılan adı', () => {
    expect(donusumTuru({ ...nokta('x', "A'", 0, 0), donusum: 'yansima' })).toBe('yansima');
    expect(donusumTuru(nokta('x', 'A', 0, 0))).toBeNull();
    expect(DONUSUM_ADLARI.yansima).toBe('yansıma');
    expect(DONUSUM_ADLARI.oteleme).toBe('öteleme');
    const toolbar = oku('Toolbar.tsx');
    expect(toolbar).toMatch(/DONUSUM_ADLARI\[donusum\]/);
    const ctx = readFileSync(path.resolve(KOK, '../../state/WorkspaceContext.tsx'), 'utf8');
    expect(ctx).toMatch(/yeni\.donusum = 'oteleme'/);
    expect(oku('Canvas.tsx')).toMatch(/donusum: 'yansima'/);
  });

  it('proje dosyası dönüşüm türünü korur', () => {
    const p = parseProjectFile({ version: 1, objects: [{ ...nokta('x', "A'", 1, 2), donusum: 'oteleme' }] } as never);
    expect((p.objects[0] as PointObject).donusum).toBe('oteleme');
  });
});
