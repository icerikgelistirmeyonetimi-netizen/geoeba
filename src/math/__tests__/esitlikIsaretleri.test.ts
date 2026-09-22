import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import {
  esitlikHedefleri, esitlikIsaretleri, esitlikOgesiAdi, esitlikYamalari, esitlikYamalariniUygula, etkinEsitlik,
  sonrakiEsitlikSayisi, tumElleIsaretleriniTemizle, type EsitlikSonucu,
} from '../esitlikIsaretleri';

// ------------------------------------------------------------------ sahne kurucuları
type Extra = Record<string, unknown>;
const pt = (id: string, x: number, y: number, extra: Extra = {}) =>
  ({ id, type: 'point', label: id.replace(/^pt-/, ''), showLabel: true, x, y, color: '#2563eb', visible: true, isIndependent: true, createdAt: 0, ...extra }) as MathObject;
const seg = (id: string, a: string, b: string, extra: Extra = {}) =>
  ({ id, type: 'segment', label: `[${a.replace(/^pt-/, '')}${b.replace(/^pt-/, '')}]`, showLabel: true, startPointId: a, endPointId: b, color: '#0284c7', visible: true, thickness: 2.5, createdAt: 0, ...extra }) as MathObject;
const poly = (id: string, ids: string[], extra: Extra = {}) =>
  ({ id, type: 'polygon', label: id, showLabel: true, pointIds: ids, color: '#10b981', visible: true, createdAt: 0, ...extra }) as MathObject;
const arc = (id: string, c: string, s: string, d: string, extra: Extra = {}) =>
  ({ id, type: 'arc', label: `${s.replace(/^pt-/, '')}${d.replace(/^pt-/, '')} Yayı`, showLabel: true, centerPointId: c, startPointId: s, directionPointId: d, color: '#0284c7', visible: true, thickness: 3, createdAt: 0, ...extra }) as MathObject;
const circle = (id: string, c: string, r: string, extra: Extra = {}) =>
  ({ id, type: 'circle', label: id, showLabel: true, centerPointId: c, radiusPointId: r, color: '#8b5cf6', visible: true, createdAt: 0, ...extra }) as MathObject;

const isaretOzeti = (s: EsitlikSonucu) => s.isaretler.map((m) => `${m.anahtar}=${m.sayi}${m.kaynak === 'elle' ? 'e' : ''}`).sort();
const sayiOf = (s: EsitlikSonucu, anahtar: string) => etkinEsitlik(s, anahtar).sayi;

/** Kullanıcının sahnesi (sahne-1.json): A merkezli pembe çember B'den geçer; C ve D onun üzerinde; C merkezli çember A'dan geçer. */
function kullaniciSahnesi(): MathObject[] {
  return [
    pt('pt-A', -5.196152422706632, -3),
    pt('pt-B', -10.39230484541326, 6),
    circle('circ-A', 'pt-A', 'pt-B', { color: '#ec4899' }),
    pt('pt-C', 5.196152422706632, -3, { onObjectId: 'circ-A' }),
    circle('circ-C', 'pt-C', 'pt-A'),
    pt('pt-D', -0.0787366730477208, 6.045001716149253, { onObjectId: 'circ-A' }),
    seg('seg-AC', 'pt-A', 'pt-C', { showLength: true }),
    seg('seg-AD', 'pt-A', 'pt-D', { showLength: true }),
    seg('seg-CD', 'pt-C', 'pt-D', { showLength: true }),
    pt('pt-F', 10.392304845413264, 6, { onObjectId: 'circ-C' }),
  ];
}
/** sahne-2: ikizkenar üçgen (taban 6, yanlar 5) */
const ikizkenar = (extra: Extra = {}) => [pt('pt-A', -3, -2), pt('pt-B', 3, -2), pt('pt-C', 0, 2), poly('ABC', ['pt-A', 'pt-B', 'pt-C'], extra)];
/** sahne-4b: kare ABCD (kenar 4) + ortak DC kenarında çatı DCE (yanlar √13) */
const ev = (catiY = 4) => [
  pt('pt-A', -2, -3), pt('pt-B', 2, -3), pt('pt-C', 2, 1), pt('pt-D', -2, 1),
  poly('ABCD', ['pt-A', 'pt-B', 'pt-C', 'pt-D']),
  pt('pt-E', 0, catiY),
  poly('DCE', ['pt-D', 'pt-C', 'pt-E']),
];
const kare = (on: string, x: number, y: number, a: number, extra: Extra = {}) => [
  pt(`pt-${on}1`, x, y), pt(`pt-${on}2`, x + a, y), pt(`pt-${on}3`, x + a, y + a), pt(`pt-${on}4`, x, y + a),
  poly(on, [`pt-${on}1`, `pt-${on}2`, `pt-${on}3`, `pt-${on}4`], extra),
];

describe('eşitlik işaretleri: otomatik', () => {
  it('kullanıcının sahnesi: AC = AD tek çizgi, CD işaretsiz', () => {
    const s = esitlikIsaretleri(kullaniciSahnesi());
    expect(isaretOzeti(s)).toEqual(['seg:seg-AC=1', 'seg:seg-AD=1']);
    expect(s.isaretler.every((m) => m.kaynak === 'otomatik' && m.tur === 'duz')).toBe(true);
    expect(s.gruplar).toHaveLength(1);
    expect(s.gruplar[0].anahtarlar).toEqual(['seg:seg-AC', 'seg:seg-AD']);
    const ac = s.isaretHaritasi.get('seg:seg-AC')!;
    expect(ac.a).toEqual({ x: -5.196152422706632, y: -3 });
    expect(ac.renk).toBe('#0284c7');
    expect(ac.kalinlik).toBe(2.5);
  });

  it('eşit yarıçaplı iki çemberde eşit yaylar işaretlenir, farklı açılı yay işaretlenmez', () => {
    const r = Math.sqrt(108);
    const A = { x: -5.196152422706632, y: -3 }, Cn = { x: 5.196152422706632, y: -3 };
    const at = (o: { x: number; y: number }, deg: number) => ({ x: o.x + r * Math.cos((deg * Math.PI) / 180), y: o.y + r * Math.sin((deg * Math.PI) / 180) });
    const objects = [
      pt('pt-A', A.x, A.y), pt('pt-C', Cn.x, Cn.y),
      pt('pt-P', at(A, 60).x, at(A, 60).y), pt('pt-Q', at(Cn, 240).x, at(Cn, 240).y), pt('pt-R', at(A, 45).x, at(A, 45).y),
      arc('yay1', 'pt-A', 'pt-C', 'pt-P'),
      arc('yay2', 'pt-C', 'pt-A', 'pt-Q'),
      arc('yay3', 'pt-A', 'pt-C', 'pt-R'),
    ];
    const s = esitlikIsaretleri(objects);
    expect(isaretOzeti(s)).toEqual(['arc:yay1=1', 'arc:yay2=1']);
    expect(s.isaretler[0].tur).toBe('yay');
    expect(s.isaretler[0].yaricap).toBeCloseTo(r, 9);
    expect(s.isaretler[0].tarama).toBeCloseTo(Math.PI / 3, 9);
  });

  it('dört eşit yaya bölünmüş çember (sahne-7): dört yay tek çizgi', () => {
    const objects = [
      pt('pt-O', 0, 0), pt('pt-A', 4, 0), pt('pt-C', -4, 4.898587196589413e-16), pt('pt-B', 2.4492935982947064e-16, 4), pt('pt-D', -6.432490598706546e-16, -4),
      arc('AB', 'pt-O', 'pt-A', 'pt-B'), arc('BC', 'pt-O', 'pt-B', 'pt-C'), arc('CD', 'pt-O', 'pt-C', 'pt-D'), arc('DA', 'pt-O', 'pt-D', 'pt-A'),
    ];
    expect(isaretOzeti(esitlikIsaretleri(objects))).toEqual(['arc:AB=1', 'arc:BC=1', 'arc:CD=1', 'arc:DA=1']);
  });

  it('ayrı çemberlerdeki eş yaylar (sahne-7b) otomatik işaretlenmez', () => {
    const objects = [
      pt('pt-A', -8, -1), pt('pt-B', -5, -1), pt('pt-C', -8, 2), arc('y1', 'pt-A', 'pt-B', 'pt-C'),
      pt('pt-D', 6, -3), pt('pt-E', 6, 0), pt('pt-F', 3, -3), arc('y2', 'pt-D', 'pt-E', 'pt-F'),
    ];
    expect(esitlikIsaretleri(objects).isaretler).toEqual([]);
  });

  it('ikizkenar üçgen: yan kenarlar tek çizgi, taban işaretsiz', () => {
    expect(isaretOzeti(esitlikIsaretleri(ikizkenar()))).toEqual(['edge:ABC:1=1', 'edge:ABC:2=1']);
  });

  it('eşkenar dörtgen (9 basamağa yuvarlanmış koordinatlar): dört kenar tek çizgi', () => {
    const objects = [
      pt('pt-A', -3.5, -2.5), pt('pt-B', 1.5, -2.5), pt('pt-C', 3.210100717, 2.198463104), pt('pt-D', -1.789899283, 2.198463104),
      poly('ABCD', ['pt-A', 'pt-B', 'pt-C', 'pt-D']),
    ];
    expect(isaretOzeti(esitlikIsaretleri(objects))).toEqual(['edge:ABCD:0=1', 'edge:ABCD:1=1', 'edge:ABCD:2=1', 'edge:ABCD:3=1']);
  });

  it('köşegenle bölünmüş kare (iki birleşik üçgen): dört kenar, ortak köşegen tek öğe ve işaretsiz', () => {
    const objects = [
      pt('pt-A', -3, -3), pt('pt-B', 3, -3), pt('pt-C', 3, 3), poly('ABC', ['pt-A', 'pt-B', 'pt-C']),
      pt('pt-D', -3, 3), poly('CDA', ['pt-C', 'pt-D', 'pt-A']),
    ];
    const s = esitlikIsaretleri(objects);
    expect(isaretOzeti(s)).toEqual(['edge:ABC:0=1', 'edge:ABC:1=1', 'edge:CDA:0=1', 'edge:CDA:1=1']);
    expect([...s.isaretliKenarlar].sort()).toEqual(['ABC:0', 'ABC:1', 'CDA:0', 'CDA:1']);
    expect(s.temsilci.get('edge:CDA:2')).toBe('edge:ABC:2');
    expect(s.ogeler.size).toBe(5);
  });

  it('ev: kare kenarları ve ortak DC tek çizgi, çatı yanları iki çizgi; DC bir kez', () => {
    const s = esitlikIsaretleri(ev());
    expect(isaretOzeti(s)).toEqual(['edge:ABCD:0=1', 'edge:ABCD:1=1', 'edge:ABCD:2=1', 'edge:ABCD:3=1', 'edge:DCE:1=2', 'edge:DCE:2=2']);
    expect(s.isaretliKenarlar.has('DCE:0')).toBe(true); // DC'nin çatıdaki kopyasının etiketi de dışarı itilir
    expect(s.isaretler).toHaveLength(6);
  });

  it('birbirinden ayrı eşit parçalar otomatik işaretlenmez; elle işaretlenebilir', () => {
    const objects = [
      pt('pt-A', -13, 5), pt('pt-B', -8, 5), seg('AB', 'pt-A', 'pt-B'),
      pt('pt-C', 8, -6), pt('pt-D', 11, -2), seg('CD', 'pt-C', 'pt-D'),
      pt('pt-E', -4, -6), pt('pt-F', 0, -6), seg('EF', 'pt-E', 'pt-F'),
    ];
    expect(esitlikIsaretleri(objects).isaretler).toEqual([]);
    const elle = objects.map((o) => (o.id === 'AB' || o.id === 'CD' ? { ...o, equalityMark: 1 } : o)) as MathObject[];
    for (const otomatik of [true, false]) {
      const s = esitlikIsaretleri(elle, { otomatik });
      expect(isaretOzeti(s)).toEqual(['seg:AB=1e', 'seg:CD=1e']);
    }
  });

  it('kimliği farklı ama aynı yerdeki noktalar değmiş sayılır', () => {
    const objects = [pt('pt-P', 0, 0), pt('pt-Q', 3, 0), seg('s1', 'pt-P', 'pt-Q'), pt('pt-R', 0, 0), pt('pt-S', 0, 3), seg('s2', 'pt-R', 'pt-S')];
    expect(isaretOzeti(esitlikIsaretleri(objects))).toEqual(['seg:s1=1', 'seg:s2=1']);
  });

  it('4 basamağa yuvarlanmış öteleme kopyası da değmiş sayılır (değme toleransı eşitlikten gevşek)', () => {
    const objects = [pt('pt-P', 0, 0), pt('pt-Q', 3, 0), seg('s1', 'pt-P', 'pt-Q'), pt('pt-R', 3.00003, -0.00004), pt('pt-S', 3.00003, 2.99996), seg('s2', 'pt-R', 'pt-S')];
    expect(isaretOzeti(esitlikIsaretleri(objects))).toEqual(['seg:s1=1', 'seg:s2=1']);
  });

  it('çokgen kenarı üzerindeki parça tek öğedir: işaret parçanındır, kenar etiketi yine dışarı itilir', () => {
    const objects = [...ikizkenar(), seg('sBC', 'pt-B', 'pt-C')];
    const s = esitlikIsaretleri(objects);
    expect(isaretOzeti(s)).toEqual(['edge:ABC:2=1', 'seg:sBC=1']);
    expect(s.isaretHaritasi.get('seg:sBC')!.sahipId).toBe('sBC');
    expect(s.isaretliKenarlar.has('ABC:1')).toBe(true);
    expect(s.temsilci.get('edge:ABC:1')).toBe('seg:sBC');
  });

  it('T birleşimi: küçük kare büyüğün kenarına yapışık; farklı uzunluklara farklı çizgi sayısı', () => {
    const objects = [...kare('K', 0, 0, 4), ...kare('L', 4, 1, 2)];
    const s = esitlikIsaretleri(objects);
    expect(new Set(s.isaretler.filter((m) => m.sahipId === 'K').map((m) => m.sayi))).toEqual(new Set([1]));
    expect(new Set(s.isaretler.filter((m) => m.sahipId === 'L').map((m) => m.sayi))).toEqual(new Set([2]));
    expect(s.isaretler).toHaveLength(8);
  });

  it('kutuları çakışan (kesişen) ayrı şekiller aynı çizgi sayısını paylaşmaz; uzaktaki şekil yeniden 1 ile başlar', () => {
    const objects = [...kare('K', 0, 0, 4), ...kare('M', 2, 2, 3), ...kare('U', 40, 40, 5)];
    const s = esitlikIsaretleri(objects);
    const sayilar = (id: string) => [...new Set(s.isaretler.filter((m) => m.sahipId === id).map((m) => m.sayi))];
    expect(sayilar('K')).toEqual([1]);
    expect(sayilar('M')).toEqual([2]);
    expect(sayilar('U')).toEqual([1]);
  });

  it('eşitlik tamdır: 10,39 ile 10,388 ve 5 ile 5,004 işaretlenmez; 1,8e-15 fark işaretlenir', () => {
    const iki = (l1: number, l2: number) => esitlikIsaretleri([pt('pt-O', 0, 0), pt('pt-P', l1, 0), pt('pt-Q', 0, l2), seg('s1', 'pt-O', 'pt-P'), seg('s2', 'pt-O', 'pt-Q')]).isaretler.length;
    expect(iki(10.39, 10.388)).toBe(0);
    expect(iki(5, 5.004)).toBe(0);
    expect(iki(10.392304845413264, 10.392304845413266)).toBe(2);
    expect(iki(5, 5 + 3e-9)).toBe(2); // komutların 9 basamaklı yuvarlaması
  });

  it('bozuk veride hata atmaz: sıfır uzunluk, eksik nokta, taraması 0 yay', () => {
    const objects = [
      pt('pt-A', 0, 0), pt('pt-B', 0, 0), seg('s0', 'pt-A', 'pt-B'), seg('s1', 'pt-A', 'pt-YOK'),
      poly('P', ['pt-A', 'pt-YOK', 'pt-B']), arc('y0', 'pt-A', 'pt-B', 'pt-B'), pt('pt-C', 1, 0), arc('y1', 'pt-A', 'pt-C', 'pt-C'),
      { id: 'm', type: 'measurement', kind: 'arc', pointIds: ['pt-C'], circleId: 'yok', label: 'm', showLabel: true, color: '#000', visible: true, createdAt: 0 } as unknown as MathObject,
    ];
    expect(() => esitlikIsaretleri(objects)).not.toThrow();
    expect(esitlikIsaretleri(objects).isaretler).toEqual([]);
  });

  it('görünmez şekil ne işaretlenir ne bağlar; gizli ortak nokta yine bağlar; açı ve ölçüm bağlamaz', () => {
    const gizliAD = kullaniciSahnesi().map((o) => (o.id === 'seg-AD' ? { ...o, visible: false } : o)) as MathObject[];
    expect(esitlikIsaretleri(gizliAD).isaretler).toEqual([]);
    const gizliNokta = [pt('pt-O', 0, 0, { visible: false }), pt('pt-P', 3, 0), pt('pt-Q', 0, 3), seg('s1', 'pt-O', 'pt-P'), seg('s2', 'pt-O', 'pt-Q')];
    expect(esitlikIsaretleri(gizliNokta).isaretler).toHaveLength(2);
    const ayri = [
      pt('pt-A', 0, 0), pt('pt-B', 3, 0), seg('s1', 'pt-A', 'pt-B'), pt('pt-C', 10, 10), pt('pt-D', 13, 10), seg('s2', 'pt-C', 'pt-D'),
      { id: 'aci', type: 'angle', point1Id: 'pt-B', vertexPointId: 'pt-A', point3Id: 'pt-C', label: 'a', showLabel: true, color: '#f59e0b', visible: true, createdAt: 0 } as MathObject,
      { id: 'olc', type: 'measurement', kind: 'distance', pointIds: ['pt-B', 'pt-D'], label: 'm', showLabel: true, color: '#000', visible: true, createdAt: 0 } as MathObject,
    ];
    expect(esitlikIsaretleri(ayri).isaretler).toEqual([]);
  });

  it('açı kolları otomatik işaretlenmez ama elle işaretlenebilir', () => {
    const objects = [pt('pt-V', 0, 0), pt('pt-P', 4, 0), pt('pt-Q', 2, 3.4641016151377544), seg('k1', 'pt-V', 'pt-P', { armOfAngleId: 'aci' }), seg('k2', 'pt-V', 'pt-Q', { armOfAngleId: 'aci' })];
    expect(esitlikIsaretleri(objects).isaretler).toEqual([]);
    const elle = objects.map((o) => (o.type === 'segment' ? { ...o, equalityMark: 2 } : o)) as MathObject[];
    expect(isaretOzeti(esitlikIsaretleri(elle))).toEqual(['seg:k1=2e', 'seg:k2=2e']);
  });

  it('beşinci grup işaretsiz kalır (yanıltıcı yinelenen sayı yok)', () => {
    const uzunluklar = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
    const tamZincir: MathObject[] = [pt('pt-0', 0, 0)];
    uzunluklar.reduce((acc, l, i) => {
      const nx = acc + l;
      tamZincir.push(pt(`pt-${i + 1}`, nx, 0), seg(`s${i}`, `pt-${i}`, `pt-${i + 1}`));
      return nx;
    }, 0);
    const t = esitlikIsaretleri(tamZincir);
    expect(t.gruplar.map((g) => g.sayi)).toEqual([1, 2, 3, 4]);
    expect(t.isaretler.some((m) => m.anahtar === 'seg:s8' || m.anahtar === 'seg:s9')).toBe(false);
  });

  it('çok kalabalık otomatik grup (13 eşit kenar) işaretlenmez, 12 kenar işaretlenir', () => {
    const duzgun = (n: number) => {
      const o: MathObject[] = [];
      for (let i = 0; i < n; i++) o.push(pt(`pt-${i}`, 5 * Math.cos((2 * Math.PI * i) / n), 5 * Math.sin((2 * Math.PI * i) / n)));
      o.push(poly('P', o.map((p) => p.id)));
      return o;
    };
    expect(esitlikIsaretleri(duzgun(12)).isaretler).toHaveLength(12);
    expect(esitlikIsaretleri(duzgun(13)).isaretler).toHaveLength(0);
  });

  it('iki nokta arası yay ölçümleri: aynı çemberde eş yaylar işaretlenir, ölçüm ayrı şekilleri bağlamaz', () => {
    const on = (id: string, deg: number) => pt(id, 3 * Math.cos((deg * Math.PI) / 180), 3 * Math.sin((deg * Math.PI) / 180), { onObjectId: 'c' });
    const olcum = (id: string, a: string, b: string, extra: Extra = {}) =>
      ({ id, type: 'measurement', kind: 'arc', pointIds: [a, b], circleId: 'c', label: id, showLabel: true, color: '#7c3aed', visible: true, createdAt: 0, ...extra }) as unknown as MathObject;
    const objects = [pt('pt-O', 0, 0), pt('pt-R', 3, 0), circle('c', 'pt-O', 'pt-R'), on('pt-A', 30), on('pt-B', 90), on('pt-C', 150),
      olcum('m1', 'pt-A', 'pt-B'), olcum('m2', 'pt-B', 'pt-C'), olcum('m3', 'pt-A', 'pt-C', { major: true })];
    const s = esitlikIsaretleri(objects);
    expect(isaretOzeti(s)).toEqual(['arc:m1=1', 'arc:m2=1']);
    const m1 = s.isaretHaritasi.get('arc:m1')!;
    expect(m1.tarama).toBeCloseTo(Math.PI / 3, 9);
    expect(m1.baslangic).toBeCloseTo(Math.PI / 6, 9);
    expect(s.ogeler.get('arc:m3')!.tarama).toBeCloseTo((4 * Math.PI) / 3, 9);
    // ara noktayla taraf seçimi
    const ara = objects.map((o) => (o.id === 'm3' ? { ...o, major: undefined, throughPointId: 'pt-B' } : o)) as MathObject[];
    expect(esitlikIsaretleri(ara).ogeler.get('arc:m3')!.tarama).toBeCloseTo((2 * Math.PI) / 3, 9);
  });

  it('aynı yay üzerindeki yay ile dilim tek öğedir (kendine eşit sayılmaz)', () => {
    const objects = [pt('pt-O', 0, 0), pt('pt-A', 2, 0), pt('pt-B', 0, 2), arc('y', 'pt-O', 'pt-A', 'pt-B'),
      { ...arc('d', 'pt-O', 'pt-A', 'pt-B'), type: 'sector' } as MathObject];
    const s = esitlikIsaretleri(objects);
    expect(s.isaretler).toEqual([]);
    expect(s.temsilci.get('arc:d')).toBe('arc:y');
  });
});

describe('eşitlik işaretleri: elle ve numaralama', () => {
  it('elle değer otomatiği ezer ve aynı alanda çizgi sayısını ayırır', () => {
    const s = esitlikIsaretleri(ikizkenar({ edgeEqualityMarks: { 0: 2 } }));
    expect(isaretOzeti(s)).toEqual(['edge:ABC:0=2e', 'edge:ABC:1=1', 'edge:ABC:2=1']);
    // aynı alandaki (değen) bir parçada elle 1: yan kenarlar 2'ye kayar
    const komsu = [...ikizkenar(), pt('pt-X', 3, -6), seg('sBX', 'pt-B', 'pt-X', { equalityMark: 1 })];
    expect(isaretOzeti(esitlikIsaretleri(komsu))).toEqual(['edge:ABC:1=2', 'edge:ABC:2=2', 'seg:sBX=1e']);
    // uzaktaki elle 1 bu şekli etkilemez
    const uzak = [...ikizkenar(), pt('pt-X', 50, 50), pt('pt-Y', 53, 50), seg('sXY', 'pt-X', 'pt-Y', { equalityMark: 1 })];
    expect(isaretOzeti(esitlikIsaretleri(uzak))).toEqual(['edge:ABC:1=1', 'edge:ABC:2=1', 'seg:sXY=1e']);
  });

  it('İşaretsiz (0) kenar gruptan çıkar; eşi yalnız kalınca o da işaretsiz kalır', () => {
    const s = esitlikIsaretleri(ikizkenar({ edgeEqualityMarks: { 1: 0 } }));
    expect(s.isaretler).toEqual([]);
    expect(etkinEsitlik(s, 'edge:ABC:1').elle).toBe(0);
  });

  it('numaralar kararlıdır: çatı yüksekliği değişse de, şekil ötelense de aynı', () => {
    const uzun = esitlikIsaretleri(ev(4));
    const kisa = esitlikIsaretleri(ev(2.5));
    expect(sayiOf(uzun, 'edge:DCE:1')).toBe(2);
    expect(sayiOf(kisa, 'edge:DCE:1')).toBe(2);
    const otelenmis = ev(4).map((o) => (o.type === 'point' ? { ...o, x: o.x + 3, y: o.y - 2 } : o)) as MathObject[];
    expect(isaretOzeti(esitlikIsaretleri(otelenmis))).toEqual(isaretOzeti(uzun));
    expect(esitlikIsaretleri(ev(4), { otomatik: false }).isaretler).toEqual([]);
  });
});

describe('eşitlik işaretleri: yardımcılar', () => {
  it('sonrakiEsitlikSayisi: hedeflerin kendi grubu hariç, kullanılmayanı tercih eder, doluysa null', () => {
    const sahne = kullaniciSahnesi();
    const s = esitlikIsaretleri(sahne);
    expect(sonrakiEsitlikSayisi(s, 'duz', ['seg:seg-AC', 'seg:seg-AD'])).toBe(1);
    expect(sonrakiEsitlikSayisi(s, 'duz', ['seg:seg-AC', 'seg:seg-CD'])).toBe(1); // AC'nin kendi grubu hariç tutulur
    // Evde: kare grubu (1) hedef içermez → çatı yanı ile yeni parça 2 değil, kullanılmayan en küçük sayıyı alır
    const evPlus = [...ev(), pt('pt-X', 7, -3), seg('sBX', 'pt-B', 'pt-X')];
    const se = esitlikIsaretleri(evPlus);
    expect(sonrakiEsitlikSayisi(se, 'duz', ['edge:DCE:1', 'seg:sBX'])).toBe(2);
    expect(sonrakiEsitlikSayisi(se, 'duz', ['seg:sBX', 'edge:ABCD:0'])).toBe(1);
    const dolu = [...sahne, pt('pt-K', 40, 0),
      ...[1, 2, 3, 4].flatMap((k) => [pt(`pt-L${k}`, 40 + k, 0), seg(`e${k}`, 'pt-K', `pt-L${k}`, { equalityMark: k })])];
    expect(sonrakiEsitlikSayisi(esitlikIsaretleri(dolu), 'duz', ['seg:seg-AC', 'seg:seg-CD'])).toBeNull();
  });

  it('esitlikYamalari: değer ailenin tüm üyelerine yazılır, çokgen kayıtları birleşir, boş kayıt silinir', () => {
    const sahne = [...ikizkenar(), seg('sBC', 'pt-B', 'pt-C')];
    const s = esitlikIsaretleri(sahne);
    const yamalar = esitlikYamalari(sahne, s, [{ anahtar: 'edge:ABC:1', deger: 3 }, { anahtar: 'edge:ABC:0', deger: 2 }]);
    expect(yamalar).toEqual(expect.arrayContaining([
      { id: 'sBC', patch: { equalityMark: 3 } },
      { id: 'ABC', patch: { edgeEqualityMarks: { 0: 2, 1: 3 } } },
    ]));
    expect(yamalar).toHaveLength(2);
    const sonra = esitlikYamalariniUygula(sahne, yamalar);
    const s2 = esitlikIsaretleri(sonra);
    expect(etkinEsitlik(s2, 'seg:sBC')).toMatchObject({ elle: 3, sayi: 3, kaynak: 'elle' });
    // Otomatiğe al: alanlar tamamen silinir
    const geri = esitlikYamalari(sonra, s2, [{ anahtar: 'seg:sBC', deger: undefined }, { anahtar: 'edge:ABC:0', deger: undefined }]);
    const temiz = esitlikYamalariniUygula(sonra, geri);
    expect('equalityMark' in temiz.find((o) => o.id === 'sBC')!).toBe(false);
    expect('edgeEqualityMarks' in temiz.find((o) => o.id === 'ABC')!).toBe(false);
    // değişiklik yoksa yama yok
    expect(esitlikYamalari(temiz, esitlikIsaretleri(temiz), [{ anahtar: 'seg:sBC', deger: undefined }])).toEqual([]);
  });

  it('tumElleIsaretleriniTemizle ve esitlikHedefleri, esitlikOgesiAdi', () => {
    const sahne = [...ikizkenar({ edgeEqualityMarks: { 0: 1 } }), seg('sBC', 'pt-B', 'pt-C', { equalityMark: 0 }),
      pt('pt-O', 10, 10), pt('pt-P', 12, 10), pt('pt-Q', 10, 12), arc('yPQ', 'pt-O', 'pt-P', 'pt-Q')];
    const temiz = esitlikYamalariniUygula(sahne, tumElleIsaretleriniTemizle(sahne));
    expect(temiz.some((o) => 'equalityMark' in o || 'edgeEqualityMarks' in o)).toBe(false);
    expect(esitlikHedefleri(sahne, 'pt-C', 'pt-B')).toEqual({ duz: ['edge:ABC:1', 'seg:sBC'], yay: [] });
    expect(esitlikHedefleri(sahne, 'pt-P', 'pt-Q')).toEqual({ duz: [], yay: ['arc:yPQ'] });
    expect(esitlikOgesiAdi(sahne, 'edge:ABC:2')).toBe('[CA]');
    expect(esitlikOgesiAdi(sahne, 'seg:sBC')).toBe('[BC]');
    expect(esitlikOgesiAdi(sahne, 'arc:yPQ')).toBe('PQ Yayı');
  });
});

describe('eşitlik işaretleri: başarım', () => {
  it('yaklaşık 300 kenarlı birleşik şerit 25 ms altında', () => {
    const objects: MathObject[] = [];
    const n = 100;
    for (let i = 0; i <= n; i++) {
      objects.push(pt(`pt-u${i}`, i * 2, 0), pt(`pt-l${i}`, i * 2 + 1, 1.7320508075688772));
    }
    for (let i = 0; i < n; i++) {
      objects.push(poly(`t${i}`, [`pt-u${i}`, `pt-u${i + 1}`, `pt-l${i}`]));
      if (i % 3 === 0) objects.push(seg(`k${i}`, `pt-l${i}`, `pt-l${i + 1}`));
    }
    esitlikIsaretleri(objects);
    const t0 = performance.now();
    let s: EsitlikSonucu | undefined;
    for (let k = 0; k < 20; k++) s = esitlikIsaretleri(objects);
    const ort = (performance.now() - t0) / 20;
    expect(ort).toBeLessThan(25);
    expect(s!.ogeler.size).toBeGreaterThan(290);
    // hepsi eşit (2 br) ama grup çok kalabalık: otomatik işaret yok; bileşen tek
    expect(new Set([...s!.ogeler.values()].map((o) => o.bilesen)).size).toBe(1);
  });
});
