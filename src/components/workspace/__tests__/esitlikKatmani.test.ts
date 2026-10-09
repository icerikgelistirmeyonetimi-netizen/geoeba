/**
 * Çentik katmanının SAFLIĞI ve elle işaretin grubu.
 *
 * React StrictMode (next.config.mjs reactStrictMode) render'ı AYNI props nesnesiyle iki kez çağırır ve ekrana
 * ikinci çağrının çıktısı gider. Katman `noktalar` propunu render gövdesinde tüketiyordu: Canvas tek kullanımlık
 * bir yineleyici (pointsById.values()) geçirdiği için ikinci çağrıda engel listesi boş kalıyor, ortasında nokta
 * duran öğelerin çentiği noktanın altına gömülüyordu. Artık dizi geçiliyor; bu sınama iki çağrıyı karşılaştırır.
 */
import { describe, expect, it, vi } from 'vitest';
import type { MathObject, PointObject, ViewportTransform } from '@/types/math';
import { esitlikIsaretleri, esitlikYamalariniUygula } from '@/math/esitlikIsaretleri';
import { EsitlikIsaretleriKatmani, esitlikMenuMaddeleri } from '../EsitlikIsaretleri';

type Extra = Record<string, unknown>;
const pt = (id: string, x: number, y: number, extra: Extra = {}) =>
  ({ id, type: 'point', label: id.replace(/^pt-/, ''), showLabel: true, x, y, color: '#2563eb', visible: true, isIndependent: true, createdAt: 0, ...extra }) as MathObject;
const seg = (id: string, a: string, b: string, extra: Extra = {}) =>
  ({ id, type: 'segment', label: id, showLabel: true, startPointId: a, endPointId: b, color: '#0284c7', visible: true, thickness: 2.5, createdAt: 0, ...extra }) as MathObject;

const viewport = { zoom: 44, panX: 0, panY: 0, width: 1200, height: 800, showAxes: false } as ViewportTransform;

/** AB'nin tam ORTASINDA görünür bir nokta (M) var: çentik yana kaydırılmalı. */
const ortaNoktaliSahne = (): MathObject[] => [
  pt('pt-A', -4, 4), pt('pt-B', 8, 4), pt('pt-M', 2, 4, { size: 6 }),
  pt('pt-C', -4, 10), pt('pt-D', 8, 10),
  seg('seg-AB', 'pt-A', 'pt-B'), seg('seg-CD', 'pt-C', 'pt-D'), seg('seg-AC', 'pt-A', 'pt-C'),
];

type Yol = { props: Record<string, unknown> };
const yollar = (el: unknown): string[] => {
  const g = el as { props: { children: Yol[] } };
  const kids = Array.isArray(g.props.children) ? g.props.children : [g.props.children];
  return kids.filter(Boolean).map((k) => `${k.props['data-esitlik-isareti']} d=${k.props.d} kay=${k.props['data-esitlik-kaydirma']}`);
};

describe('EsitlikIsaretleriKatmani saflığı (StrictMode aynı props ile iki kez çağırır)', () => {
  const objects = ortaNoktaliSahne();
  const noktalar = objects.filter((o) => o.type === 'point') as PointObject[];
  const props = {
    isaretler: esitlikIsaretleri(objects).isaretler,
    viewport, seciliIdler: [] as string[], cizgiOlcegi: 1, noktalar, noktaYaricapi: 5,
  };

  it('aynı props ile iki çağrı birebir aynı çıktıyı verir', () => {
    const a = yollar(EsitlikIsaretleriKatmani(props));
    const b = yollar(EsitlikIsaretleriKatmani(props));
    expect(a).toHaveLength(2);
    expect(b).toEqual(a);
  });

  it('ortasında nokta duran öğenin çentiği İKİNCİ çağrıda da kaydırılır', () => {
    EsitlikIsaretleriKatmani(props);
    const ikinci = EsitlikIsaretleriKatmani(props) as { props: { children: Yol[] } };
    const ab = ikinci.props.children.find((k) => k.props['data-esitlik-isareti'] === 'seg:seg-AB')!;
    expect(ab.props['data-esitlik-kaydirma']).toBeTruthy();
    // Kaydırılan çentik artık M noktasının (ekran) merkezinden uzakta.
    const mX = 600 + 2 * 44;
    const x = Number(String(ab.props.d).match(/M([-\d.]+)/)![1]);
    expect(Math.abs(x - mX)).toBeGreaterThan(6);
  });

  it('nokta listesi verilmezse de çizer (engel yok)', () => {
    const el = EsitlikIsaretleriKatmani({ ...props, noktalar: undefined });
    expect(yollar(el)).toHaveLength(2);
  });
});

describe('sağ tık menüsü: elle çizgi sayısı otomatik grubun tamamına yazılır', () => {
  /** İkizkenar üçgen: iki kol otomatik tek çizgi alır. */
  const ikizkenar = (): MathObject[] => [
    pt('pt-A', -3, -2), pt('pt-B', 3, -2), pt('pt-C', 0, 2),
    seg('AC', 'pt-A', 'pt-C'), seg('BC', 'pt-B', 'pt-C'), seg('AB', 'pt-A', 'pt-B'),
  ];

  it('"İki çizgi" bir kola verilince öbür kol da iki çizgi olur (eşi çıplak kalmaz)', () => {
    const objects = ikizkenar();
    const sonuc = esitlikIsaretleri(objects);
    expect(sonuc.isaretler.map((m) => `${m.anahtar}=${m.sayi}`).sort()).toEqual(['seg:AC=1', 'seg:BC=1']);
    const uygula = vi.fn();
    const m = esitlikMenuMaddeleri({ hedef: objects.find((o) => o.id === 'AC')!, kenarNo: null, objects, seciliIdler: [], sonuc, uygula });
    m[0].submenu!.find((x) => x.label === 'İki çizgi')!.onSelect!();
    const sonra = esitlikYamalariniUygula(objects, uygula.mock.calls[0][0]);
    const s2 = esitlikIsaretleri(sonra);
    expect(s2.isaretler.map((m2) => `${m2.anahtar}=${m2.sayi}${m2.kaynak === 'elle' ? 'e' : ''}`).sort()).toEqual(['seg:AC=2e', 'seg:BC=2e']);
  });

  it('"İşaretsiz" yalnız hedefi kaldırır; kalan üyeler gruplanmayı sürdürür', () => {
    const objects = [...ikizkenar(), pt('pt-D', 0, 6), seg('CD', 'pt-C', 'pt-D')];
    const sonuc = esitlikIsaretleri(objects);
    // AC = BC = 5, CD = 4: yalnız kollar gruplanır
    expect(sonuc.gruplar).toHaveLength(1);
    const uygula = vi.fn();
    const m = esitlikMenuMaddeleri({ hedef: objects.find((o) => o.id === 'AC')!, kenarNo: null, objects, seciliIdler: [], sonuc, uygula });
    m[0].submenu!.find((x) => x.label === 'İşaretsiz')!.onSelect!();
    const sonra = esitlikYamalariniUygula(objects, uygula.mock.calls[0][0]);
    expect((sonra.find((o) => o.id === 'AC') as { equalityMark?: number }).equalityMark).toBe(0);
    expect('equalityMark' in sonra.find((o) => o.id === 'BC')!).toBe(false);
  });

  it('"Otomatik" da yalnız hedefi etkiler', () => {
    const objects = ikizkenar().map((o) => (o.id === 'AC' ? { ...o, equalityMark: 3 } : o)) as MathObject[];
    const sonuc = esitlikIsaretleri(objects);
    const uygula = vi.fn();
    const m = esitlikMenuMaddeleri({ hedef: objects.find((o) => o.id === 'AC')!, kenarNo: null, objects, seciliIdler: [], sonuc, uygula });
    m[0].submenu!.find((x) => x.label === 'Otomatik')!.onSelect!();
    const sonra = esitlikYamalariniUygula(objects, uygula.mock.calls[0][0]);
    expect('equalityMark' in sonra.find((o) => o.id === 'AC')!).toBe(false);
    expect('equalityMark' in sonra.find((o) => o.id === 'BC')!).toBe(false);
  });
});

describe('eş açı çentiği açının KENDİ yay yarıçapına oturur', () => {
  /** İkizkenar üçgen, taban açıları 25° (dar açıda yay büyür: olcuEtiketi.aciYayYaricapi). */
  const h = 5 * Math.tan((25 * Math.PI) / 180);
  const objects: MathObject[] = [
    pt('pt-A', -5, 0), pt('pt-B', 5, 0), pt('pt-C', 0, h),
    seg('AB', 'pt-A', 'pt-B'), seg('AC', 'pt-A', 'pt-C'), seg('BC', 'pt-B', 'pt-C'),
    { id: 'angA', type: 'angle', label: 'A', showLabel: true, point1Id: 'pt-C', vertexPointId: 'pt-A', point3Id: 'pt-B', visible: true, createdAt: 0 } as MathObject,
    { id: 'angB', type: 'angle', label: 'B', showLabel: true, point1Id: 'pt-A', vertexPointId: 'pt-B', point3Id: 'pt-C', visible: true, createdAt: 0 } as MathObject,
  ];
  const aciIsaretleri = esitlikIsaretleri(objects).isaretler.filter((m) => m.tur === 'aci');
  const cagir = (ek: Record<string, unknown>) => EsitlikIsaretleriKatmani({
    isaretler: aciIsaretleri, viewport, seciliIdler: [], cizgiOlcegi: 1, ...ek,
  }) as { props: { children: Yol[] } } | null;

  it('iki eş dar açı çentik alır; yarıçap haritası verilince çentik o yarıçapta durur', () => {
    expect(aciIsaretleri.map((m) => m.anahtar).sort()).toEqual(['ang:angA', 'ang:angB']);
    const el = cagir({ aciYaricapiPx: 22, aciYaricaplariPx: new Map([['angA', 41], ['angB', 41]]) });
    const koseA = { x: 600 - 5 * 44, y: 400 };
    const yol = el!.props.children.find((k) => k?.props['data-esitlik-sahibi'] === 'angA')!;
    const s = String(yol.props.d).match(/M([-\d.]+) ([-\d.]+)L([-\d.]+) ([-\d.]+)/)!.slice(1).map(Number);
    const ic = Math.hypot(s[0] - koseA.x, s[1] - koseA.y), dis = Math.hypot(s[2] - koseA.x, s[3] - koseA.y);
    expect((ic + dis) / 2).toBeCloseTo(41, 1);
  });

  it('haritadaki yarıçap OLDUĞU GİBİ kullanılır: dik açının yarıya indirilmiş değerini Canvas verir', () => {
    // Katman yalnız tek sabit yarıçapla (aciYaricapiPx) çağrılınca dik açıyı kendisi yarıya indirir; açıya özel
    // değer tekrar bölünmez (89,7° gibi açıda kare kararı Canvas'ta: Math.round(derece) === 90).
    const dik: MathObject[] = [
      pt('pt-O', 0, 0), pt('pt-X', 4, 0), pt('pt-Y', 0, 4), pt('pt-P', 10, 0), pt('pt-Q', 10, 4), pt('pt-R', 6, 0),
      { id: 'd1', type: 'angle', label: 'd1', showLabel: true, point1Id: 'pt-X', vertexPointId: 'pt-O', point3Id: 'pt-Y', visible: true, createdAt: 0, equalityMark: 1 } as MathObject,
      { id: 'd2', type: 'angle', label: 'd2', showLabel: true, point1Id: 'pt-R', vertexPointId: 'pt-P', point3Id: 'pt-Q', visible: true, createdAt: 0, equalityMark: 1 } as MathObject,
    ];
    const isaretler = esitlikIsaretleri(dik).isaretler.filter((m) => m.tur === 'aci');
    expect(isaretler.length).toBe(2);
    const el = EsitlikIsaretleriKatmani({ isaretler, viewport, seciliIdler: [], cizgiOlcegi: 1, aciYaricapiPx: 22, aciYaricaplariPx: new Map([['d1', 11], ['d2', 11]]) }) as { props: { children: Yol[] } };
    const yol = el.props.children.find((k) => k?.props['data-esitlik-sahibi'] === 'd1')!;
    const s = String(yol.props.d).match(/M([-.0-9]+) ([-.0-9]+)L([-.0-9]+) ([-.0-9]+)/)!.slice(1).map(Number);
    const kose = { x: 600, y: 400 };
    expect((Math.hypot(s[0] - kose.x, s[1] - kose.y) + Math.hypot(s[2] - kose.x, s[3] - kose.y)) / 2).toBeCloseTo(11, 1);
  });

  it('sabit 22 px yarıçapta 25° yay çentiğe yetmiyordu (yay boyu < 10 px)', () => {
    const el = cagir({ aciYaricapiPx: 22 });
    const kids = el ? (Array.isArray(el.props.children) ? el.props.children : [el.props.children]) : [];
    expect(kids.filter(Boolean)).toHaveLength(0);
  });
});
