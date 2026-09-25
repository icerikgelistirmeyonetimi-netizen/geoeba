/**
 * EŞ AÇI ÇENTİKLERİ (kullanıcı isteği, 2026-09-25: "aynı açılara otomatik ortaya nokta, çentik
 * atabilmeli sistem"). Seçilen gösterim: yayı dik kesen kısa çizgiler — eşit uzunluk ve eşit yay
 * çentikleriyle aynı dil, "aynı sayıda çizgi = eş".
 *
 * Kurallar uzunluktakiyle AYNI: otomatik işaret yalnız BİRLEŞİK şekillerde konur, elle konan
 * (AngleObject.equalityMark) otomatiği ezer, farklı gruplar aynı numaralama alanında ayrı sayı alır.
 */
import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import {
  aciAnahtari, anahtarCoz, esitlikIsaretleri, esitlikOgesiAdi, etkinEsitlik, type EsitlikSonucu,
} from '../esitlikIsaretleri';
import { etiketTiklamaEylemi } from '../measurementLabelClick';

type Extra = Record<string, unknown>;
const pt = (id: string, x: number, y: number, extra: Extra = {}) =>
  ({ id, type: 'point', label: id, showLabel: true, x, y, color: '#2563eb', visible: true, isIndependent: true, createdAt: 0, ...extra }) as MathObject;
const poly = (id: string, ids: string[], extra: Extra = {}) =>
  ({ id, type: 'polygon', label: id, showLabel: true, pointIds: ids, color: '#10b981', visible: true, createdAt: 0, ...extra }) as MathObject;
const ang = (id: string, p1: string, kose: string, p3: string, extra: Extra = {}) =>
  ({ id, type: 'angle', label: `${p1}${kose}${p3}`, showLabel: true, point1Id: p1, vertexPointId: kose, point3Id: p3,
    showValue: true, color: '#f59e0b', visible: true, createdAt: 0, ...extra }) as MathObject;

const aciIsaretleri = (s: EsitlikSonucu) =>
  s.isaretler.filter((m) => m.tur === 'aci').map((m) => `${m.anahtar}=${m.sayi}${m.kaynak === 'elle' ? 'e' : ''}`).sort();

/** İkizkenar üçgen: taban açıları eş, tepe açısı farklı. */
const ikizkenar = (extra: Extra = {}) => [
  pt('A', -5, -2), pt('B', 5, -2), pt('C', 0, 4),
  poly('ABC', ['A', 'B', 'C']),
  ang('a1', 'B', 'A', 'C', extra), ang('a2', 'C', 'B', 'A'), ang('a3', 'A', 'C', 'B'),
];

/** Paralelkenar: iki eş açı çifti. */
const paralelkenar = () => [
  pt('A', -6, -3), pt('B', 2, -3), pt('C', 5, 3), pt('D', -3, 3),
  poly('ABCD', ['A', 'B', 'C', 'D']),
  ang('a1', 'B', 'A', 'D'), ang('a2', 'D', 'C', 'B'), ang('a3', 'C', 'B', 'A'), ang('a4', 'A', 'D', 'C'),
];

describe('otomatik eş açı çentikleri', () => {
  it('ikizkenar üçgende yalnız taban açıları işaretlenir', () => {
    const s = esitlikIsaretleri(ikizkenar());
    expect(aciIsaretleri(s)).toEqual(['ang:a1=1', 'ang:a2=1']);
  });

  it('paralelkenarda iki grup ayrı sayı alır', () => {
    const s = esitlikIsaretleri(paralelkenar());
    const isaret = Object.fromEntries(s.isaretler.filter((m) => m.tur === 'aci').map((m) => [m.anahtar, m.sayi]));
    expect(isaret[aciAnahtari('a1')]).toBe(isaret[aciAnahtari('a2')]);
    expect(isaret[aciAnahtari('a3')]).toBe(isaret[aciAnahtari('a4')]);
    expect(isaret[aciAnahtari('a1')]).not.toBe(isaret[aciAnahtari('a3')]);
  });

  it('dikdörtgenin dört dik açısı da aynı işareti alır', () => {
    const s = esitlikIsaretleri([
      pt('A', -5, -3), pt('B', 5, -3), pt('C', 5, 3), pt('D', -5, 3),
      poly('ABCD', ['A', 'B', 'C', 'D']),
      ang('b1', 'B', 'A', 'D'), ang('b2', 'C', 'B', 'A'), ang('b3', 'D', 'C', 'B'), ang('b4', 'A', 'D', 'C'),
    ]);
    expect(aciIsaretleri(s)).toEqual(['ang:b1=1', 'ang:b2=1', 'ang:b3=1', 'ang:b4=1']);
  });

  it('birbirinden AYRI iki üçgenin eş açıları otomatik işaretlenmez', () => {
    const s = esitlikIsaretleri([
      pt('A', -9, -2), pt('B', -4, -2), pt('C', -6.5, 2), poly('ABC', ['A', 'B', 'C']),
      pt('D', 4, -2), pt('E', 9, -2), pt('F', 6.5, 2), poly('DEF', ['D', 'E', 'F']),
      ang('c1', 'B', 'A', 'C'), ang('c2', 'E', 'D', 'F'),
    ]);
    expect(aciIsaretleri(s)).toEqual([]);
  });

  it('otomatik kapatılınca açı çentiği de çizilmez', () => {
    expect(aciIsaretleri(esitlikIsaretleri(ikizkenar(), { otomatik: false }))).toEqual([]);
  });

  it('gizli açı hesaba katılmaz', () => {
    const s = esitlikIsaretleri(ikizkenar().map((o) => (o.id === 'a2' ? { ...o, visible: false } : o)));
    expect(aciIsaretleri(s)).toEqual([]);
  });

  it('aynı köşede aynı kolları tarayan iki açı nesnesi tek öğedir', () => {
    const sahne = [...ikizkenar(), ang('a1b', 'B', 'A', 'C')];
    const s = esitlikIsaretleri(sahne);
    // a1 ve a1b aynı açıdır: ikisi de temsilciye bağlanır, ayrı ayrı işaretlenmez
    expect(s.temsilci.get(aciAnahtari('a1b'))).toBe(aciAnahtari('a1'));
    expect(aciIsaretleri(s)).toEqual(['ang:a1=1', 'ang:a2=1']);
  });

  it('ölçüsü farklı açılar işaretlenmez', () => {
    const s = esitlikIsaretleri([
      pt('A', -5, -2), pt('B', 5, -2), pt('C', -1, 4),
      poly('ABC', ['A', 'B', 'C']),
      ang('a1', 'B', 'A', 'C'), ang('a2', 'C', 'B', 'A'),
    ]);
    expect(aciIsaretleri(s)).toEqual([]);
  });
});

describe('elle konan açı çentiği', () => {
  it('equalityMark otomatiği ezer', () => {
    const s = esitlikIsaretleri(ikizkenar({ equalityMark: 4 }));
    expect(aciIsaretleri(s)).toEqual(['ang:a1=4e']);
    expect(etkinEsitlik(s, aciAnahtari('a1'))).toMatchObject({ elle: 4, kaynak: 'elle' });
  });

  it('equalityMark 0 açıyı işaretsiz bırakır', () => {
    const s = esitlikIsaretleri(ikizkenar({ equalityMark: 0 }));
    expect(aciIsaretleri(s)).toEqual([]);
  });

  it('elle kullanılan sayı otomatik gruba verilmez', () => {
    const sahne = paralelkenar().map((o) => (o.id === 'a1' ? { ...o, equalityMark: 1 } : o));
    const s = esitlikIsaretleri(sahne);
    const otomatik = s.isaretler.filter((m) => m.tur === 'aci' && m.kaynak === 'otomatik').map((m) => m.sayi);
    expect(otomatik).not.toContain(1);
  });
});

describe('anahtar ve ad', () => {
  it('açı anahtarı çözülür', () => {
    expect(anahtarCoz(aciAnahtari('a1'))).toEqual({ tur: 'ang', id: 'a1' });
  });

  it('öğe adı köşe sırasıyla yazılır', () => {
    expect(esitlikOgesiAdi(ikizkenar(), aciAnahtari('a1'))).toBe('BAC Açısı');
  });
});

describe('silme kuralı: çentikli açıda yazıya tıklamak açıyı silmez', () => {
  const aci = ang('a1', 'B', 'A', 'C');
  it('çentik yokken rozet tıklaması açıyı siler (eski davranış)', () => {
    expect(etiketTiklamaEylemi(aci, 'angle', 'select', true, false)).toBe('aciyiSil');
  });
  it('çentik varken yalnız yazı gizlenir', () => {
    expect(etiketTiklamaEylemi(aci, 'angle', 'select', true, true)).toBe('gizle');
  });
  it('Sil aracında da açı silinmez, yazı gizlenir', () => {
    expect(etiketTiklamaEylemi(aci, 'angle', 'delete', true, true)).toBe('gizle');
  });
});

describe('tam sayı yazımı: eşitlik GÖRÜNEN tam sayılara göre (kullanıcı, 2026-09-25)', () => {
  it('ekranda ikisi de 6 yazan 6,08 ve 5,83 uzunluklu kenarlar eş sayılır', () => {
    // A(0,0) B(6,0) C(0,6,08) : AB = 6, AC = 6,08 → ikisi de "6"; BC ayrı
    const sahne = [
      pt('A', 0, 0), pt('B', 6, 0), pt('C', 0, 6.08),
      poly('ABC', ['A', 'B', 'C']),
    ];
    const kesin = esitlikIsaretleri(sahne);
    const tam = esitlikIsaretleri(sahne, { tamSayi: true });
    const duz = (s: EsitlikSonucu) => s.isaretler.filter((m) => m.tur === 'duz').length;
    expect(duz(kesin)).toBe(0);
    expect(duz(tam)).toBe(2);
  });

  it('ekranda ikisi de 60° yazan 59,6° ve 60,4° açılar eş sayılır', () => {
    // İkizkenara yakın ama tam olmayan üçgen: taban açıları 59,65° ve 60,35° (ikisi de "60°" yazılır)
    const sahne = [
      pt('A', 0, 0), pt('B', 10, 0), pt('C', 5.07, 8.66),
      poly('ABC', ['A', 'B', 'C']),
      ang('a1', 'B', 'A', 'C'), ang('a2', 'C', 'B', 'A'),
    ];
    expect(aciIsaretleri(esitlikIsaretleri(sahne))).toEqual([]);
    expect(aciIsaretleri(esitlikIsaretleri(sahne, { tamSayi: true }))).toEqual(['ang:a1=1', 'ang:a2=1']);
  });
});
