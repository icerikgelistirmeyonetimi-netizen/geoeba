import { describe, expect, it } from 'vitest';
import type { MathObject, ViewportTransform } from '@/types/math';
import {
  ILKOKUL_EN_COK_KENAR,
  gorunenKisayol,
  ilkokulAlanOkumasi,
  ilkokulEksensiz,
  ilkokulSimetriDogrusu,
  ilkokulUzunlukMetni,
  ilkokulUzunlugu,
  ilkokulYeniNesneleri,
  ilkokulZemini,
  zeminAlanlari,
  zeminiGeriYukle,
} from '../ilkokulKipi';
import { aracYonergesi } from '../aracYonergeleri';
import { iletkiMenusu } from '../olcmeAraclari';
import { clampSides } from '../RegularPolygonDialog';
import { TOOL_SHORTCUTS } from '../toolShortcuts';
import { olcuMetni, uzunluk, yazimAyari } from '@/math/matematikYazimi';
import { VARSAYILAN_GORUNUM_AYARLARI } from '@/state/WorkspaceContext';

/*
 * İlkokul kipi (alan uzmanları, atölye inceleme 2. tur; 2, 3 ve 4. sınıf). Kurallar YALNIZ ilkokulda geçerlidir:
 * ortaokul, lise ve "Tüm araçlar"da davranış değişmez.
 */

const gorunum = (ek: Partial<ViewportTransform> = {}): ViewportTransform => ({
  zoom: 44,
  panX: 0,
  panY: 0,
  width: 1200,
  height: 700,
  ...(VARSAYILAN_GORUNUM_AYARLARI as unknown as Partial<ViewportTransform>),
  ...ek,
} as ViewportTransform);

const nokta = (id: string, x: number, y: number, ek: Record<string, unknown> = {}) =>
  ({ id, type: 'point', label: id.toUpperCase(), showLabel: true, x, y, color: '#000', visible: true, createdAt: 0, ...ek }) as MathObject;

describe('ilkokul zemini (not 1: koordinat düzlemi yok)', () => {
  it('açılış görünümü: eksen, negatif eksen sayıları, imleç / nokta koordinatı ve bölge adları kapalı; kareli zemin, 1 birim aralık, ızgaraya oturma', () => {
    const v = ilkokulZemini(gorunum());
    expect(v.showAxes).toBe(false);
    expect(v.showCoordinates).toBe(false);
    expect(v.showQuadrants).toBe(false);
    expect(v.showGrid).toBe(true);
    expect(v.gridStyle).toBe('kareli');
    expect(v.gridStep).toBe(1);
    expect(v.gridStepAuto).toBe(false);
    expect(v.snapToGrid).toBe(true);
    expect(v.pointSnapMode).toBe('snapToGrid');
  });

  it('noktalı ve izometrik zemin seçilmişse korunur; izgara kapalıysa kareli açılır', () => {
    expect(ilkokulZemini(gorunum({ gridStyle: 'noktali' })).gridStyle).toBe('noktali');
    expect(ilkokulZemini(gorunum({ gridStyle: 'izometrik' })).gridStyle).toBe('izometrik');
    expect(ilkokulZemini(gorunum({ showGrid: false })).showGrid).toBe(true);
  });

  it('zaten ilkokul zemini olan görünüm aynı nesne kalır (gereksiz yeniden çizim yok)', () => {
    const v = ilkokulZemini(gorunum());
    expect(ilkokulZemini(v)).toBe(v);
  });

  it('ilkokuldan çıkınca önceki zemin geri gelir (ortaokul / lise görünümü değişmez)', () => {
    const once = gorunum({ showAxes: true, gridStepAuto: true, snapToGrid: false, pointSnapMode: 'off', zoom: 60 });
    const onceki = zeminAlanlari(once);
    const ilkokulda = ilkokulZemini(once);
    const geri = zeminiGeriYukle({ ...ilkokulda, zoom: 80 }, onceki);
    expect(geri.showAxes).toBe(true);
    expect(geri.gridStepAuto).toBe(true);
    expect(geri.snapToGrid).toBe(false);
    expect(geri.pointSnapMode).toBe('off');
    expect(geri.zoom).toBe(80); // zemin dışındaki alanlara dokunulmaz
  });

  it('ilkokulda eksen sonradan açılırsa kapanır', () => {
    expect(ilkokulEksensiz(gorunum({ showAxes: true })).showAxes).toBe(false);
    const v = gorunum({ showAxes: false, showCoordinates: false, showQuadrants: false });
    expect(ilkokulEksensiz(v)).toBe(v);
  });
});

describe('kısayol harfleri (not 2)', () => {
  it('ilkokulda araç adının yanında kısayol harfi gösterilmez; öbür kademelerde gösterilir', () => {
    expect(gorunenKisayol('point', 'ilkokul')).toBeUndefined();
    expect(gorunenKisayol('pen', 'ilkokul')).toBeUndefined();
    for (const duzey of ['tum', 'ortaokul', 'lise'] as const) expect(gorunenKisayol('point', duzey)).toBe(TOOL_SHORTCUTS.point);
  });
});

describe('yansıtma (not 4): yalnız şekil, simetri doğrusu ilkokul diliyle', () => {
  it('ilkokul yönergesinde eksen ve doğru parçası geçmez, "simetri doğrusu" geçer', () => {
    for (const arac of ['reflect', 'symmetry']) {
      const y = aracYonergesi(arac, 0, { ilkokul: true })!;
      expect(y.aciklama).toContain('simetri doğrusu');
      expect(`${y.baslik} ${y.aciklama}`).not.toMatch(/eksen|x ekseni|y ekseni|doğru parçası/i);
      // Ortaokul ve lisede yönerge değişmez
      expect(aracYonergesi(arac, 0)!.aciklama).toContain('eksen düğmelerine');
    }
  });

  it('simetri doğrusu şeklin yanında, ızgara çizgisinde: dikey sağ kenarda, yatay alt kenarda', () => {
    const kare = [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 3 }, { x: 1, y: 3 }];
    const dikey = ilkokulSimetriDogrusu(kare, 'dikey');
    expect(dikey.p1.x).toBe(3);
    expect(dikey.p2.x).toBe(3);
    expect(Math.min(dikey.p1.y, dikey.p2.y)).toBeLessThan(1);
    expect(Math.max(dikey.p1.y, dikey.p2.y)).toBeGreaterThan(3);
    const yatay = ilkokulSimetriDogrusu(kare, 'yatay');
    expect(yatay.p1.y).toBe(1);
    expect(yatay.p2.y).toBe(1);
    // Izgarada olmayan köşe: doğru bir sonraki ızgara çizgisine konur
    expect(ilkokulSimetriDogrusu([{ x: 0, y: 0 }, { x: 2.4, y: 0 }, { x: 1, y: 2 }], 'dikey').p1.x).toBe(3);
  });
});

describe('ölçüler tam sayı (not 6)', () => {
  it('uzunluk pozitif tam sayıya yuvarlanır; yuvarlanan değer "yaklaşık" der', () => {
    expect(ilkokulUzunlugu(3)).toEqual({ deger: 3, yaklasik: false });
    expect(ilkokulUzunlugu(3.61)).toEqual({ deger: 4, yaklasik: true });
    expect(ilkokulUzunlugu(0.3)).toEqual({ deger: 1, yaklasik: true });
    expect(ilkokulUzunlukMetni(5, 'cm')).toBe('5 cm');
    expect(ilkokulUzunlukMetni(Math.SQRT2 * 3, 'br')).toBe('yaklaşık 4 br');
    expect(ilkokulUzunlukMetni(2.5000000001, 'br')).toMatch(/^yaklaşık 3 br$/);
  });

  it('tuval yazımı ilkokulda tam sayı ayarıyla: ondalık virgül yok', () => {
    const tam = { ...yazimAyari({ tamSayiOlcu: false }), tamSayi: true };
    const metin = olcuMetni(uzunluk({ label: 'A' }, { label: 'B' }, 3.61, { birim: 'cm' }), tam);
    expect(metin).toBe('|AB| = 4 cm');
    expect(metin).not.toContain(',');
  });
});

describe('çokgen en çok sekizgen (not 7)', () => {
  it('düzgün çokgen penceresi ilkokulda en çok 8 kenar verir; öbür kademelerde 30', () => {
    expect(ILKOKUL_EN_COK_KENAR).toBe(8);
    expect(clampSides(12, ILKOKUL_EN_COK_KENAR)).toBe(8);
    expect(clampSides(5, ILKOKUL_EN_COK_KENAR)).toBe(5);
    expect(clampSides(12)).toBe(12);
    expect(clampSides(2, ILKOKUL_EN_COK_KENAR)).toBe(3);
  });
});

describe('yeni nesneler ilkokulda (not 8, 11, 12, 13)', () => {
  it('kare: köşe noktaları harf adı göstermez, alan hesabı yazılmaz; eski nesnelere dokunulmaz', () => {
    const eski = [nokta('e', 9, 9)];
    const kare = [
      ...eski,
      nokta('a', 0, 0), nokta('b', 2, 0), nokta('c', 2, 2), nokta('d', 0, 2),
      { id: 'k', type: 'polygon', label: 'Kare', showLabel: true, pointIds: ['a', 'b', 'c', 'd'], color: '#f00', visible: true, createdAt: 0, showArea: true, showPerimeter: true } as MathObject,
    ];
    const sonuc = ilkokulYeniNesneleri(eski, kare);
    for (const id of ['a', 'b', 'c', 'd']) expect(sonuc.find((o) => o.id === id)!.showLabel, id).toBe(false);
    expect(sonuc.find((o) => o.id === 'e')).toBe(eski[0]);
    const k = sonuc.find((o) => o.id === 'k') as MathObject & { showArea?: boolean; showPerimeter?: boolean };
    expect(k.showArea).toBe(false);
    expect(k.showPerimeter).toBe(true);
  });

  it('çember: merkezi ve yarıçap noktası gizli ve adsız; alan, çevre ve yarıçap yazısı yok', () => {
    const merkez = nokta('o', 0, 0);
    const sonuc = ilkokulYeniNesneleri([], [
      merkez,
      { id: 'c', type: 'circle', label: 'O Merkezli Çember', showLabel: true, centerPointId: 'o', fixedRadius: 2, color: '#00f', visible: true, createdAt: 0, showArea: true, showPerimeter: true } as MathObject,
    ]);
    const o = sonuc.find((x) => x.id === 'o')!;
    expect(o.showLabel).toBe(false);
    expect(o.visible).toBe(false);
    expect(sonuc.find((x) => x.id === 'c')).toMatchObject({ showArea: false, showPerimeter: false, showRadius: false });
  });

  it('çemberin merkezi başka bir nesnenin de noktasıysa görünür ve adıyla kalır (nesneye dokunulmaz)', () => {
    const merkez = nokta('o', 0, 0);
    const parca = { id: 's', type: 'segment', label: 's', showLabel: true, startPointId: 'o', endPointId: 'p', color: '#000', visible: true, createdAt: 0 } as MathObject;
    const once = [merkez, nokta('p', 3, 0), parca];
    const sonuc = ilkokulYeniNesneleri(once, [
      ...once,
      { id: 'c', type: 'circle', label: 'Ç', showLabel: true, centerPointId: 'o', fixedRadius: 2, color: '#00f', visible: true, createdAt: 0 } as MathObject,
    ]);
    expect(sonuc.find((x) => x.id === 'o')).toBe(merkez);
  });

  it('açı: derece yazılmaz (açıölçerle ölçme yok)', () => {
    const once = [nokta('a', 1, 0), nokta('b', 0, 0), nokta('c', 0, 1)];
    const sonuc = ilkokulYeniNesneleri(once, [
      ...once,
      { id: 'ang', type: 'angle', label: '∠ABC', showLabel: true, point1Id: 'a', vertexPointId: 'b', point3Id: 'c', color: '#f90', visible: true, createdAt: 0, showValue: true } as MathObject,
    ]);
    expect(sonuc.find((x) => x.id === 'ang')!).toMatchObject({ showValue: false });
  });

  it('yeni nesne yoksa dizi aynen döner', () => {
    const once = [nokta('a', 1, 0)];
    const sonraki = [{ ...once[0], x: 2 } as MathObject];
    expect(ilkokulYeniNesneleri(once, sonraki)).toBe(sonraki);
  });
});

describe('alan modeli ve açıölçer (not 11, 13)', () => {
  it('ilkokulda alan modeli çarpma değil birim kare sayısı yazar', () => {
    expect(ilkokulAlanOkumasi(3, 4)).toBe('12 birim kare');
    expect(ilkokulAlanOkumasi(3, 4)).not.toMatch(/×|=/);
  });

  it('ilkokulda açıölçer menüsünde derece seçimi, ölçüyü gösterme ve açıyı tuvale ekleme yok', () => {
    const menu = iletkiMenusu({ aci: 60, taban: 0, ilkokul: true });
    const kimlikler = menu.map((m) => m.id);
    expect(kimlikler).not.toContain('iletki-aci');
    expect(kimlikler).not.toContain('iletki-olcu-goster');
    expect(kimlikler).not.toContain('iletki-ekle');
    expect(JSON.stringify(menu.map((m) => m.label))).not.toContain('°');
    // Ortaokul ve lisede menü değişmez
    expect(iletkiMenusu({ aci: 60, taban: 0 }).map((m) => m.id)).toContain('iletki-aci');
  });

  it('ilkokul yönergesi açıölçeri yalnız tanıtır; ölçme yönergesi yok', () => {
    const y = aracYonergesi('measure_angle', 0, { ilkokul: true })!;
    expect(y.aciklama).toContain('tanı');
    expect(y.aciklama).not.toMatch(/açıyı ölçün|ölçebilirsiniz/);
    expect(aracYonergesi('measure_angle', 0)!.aciklama).toContain('ölçebilirsiniz');
  });
});
