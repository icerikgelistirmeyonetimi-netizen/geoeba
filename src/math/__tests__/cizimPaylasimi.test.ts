import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import type { Solid3DObject } from '@/types/workspace3d';
import { parseProjectFile, type ProjectFile } from '../projectFile';
import { DEFAULT_STYLE_SETTINGS } from '@/types/workspace';
import {
  PAYLASIM_UYARI_UZUNLUGU,
  PaylasimHatasi,
  bekleyenPaylasim,
  paylasimAdresiniCoz,
  paylasimBaglantisi,
  paylasimIcinKucult,
  paylasimVerisiOlustur,
  paylasimVerisiniCoz,
  paylasimiBirak,
  paylasimiYakala,
} from '../cizimPaylasimi';
import { parseHashToNavState } from '@/state/CurriculumContext';

const AN = 1_761_822_345_123;
const nokta = (id: string, x: number, y: number, ek: Record<string, unknown> = {}) =>
  ({ id, type: 'point', label: id, x, y, isIndependent: true, color: '#2563eb', visible: true, showLabel: true, createdAt: AN, ...ek }) as unknown as MathObject;

/** Öğretmenin sıradan bir çizimi: üçgen, kenarları, bir açısı, çevrel çemberi ve orta noktası */
function ornekNesneler(): MathObject[] {
  return [
    nokta('A', -3.141592653589793, -1.4142135623730951),
    nokta('B', 4.000000000000001, -1.25, { createdAt: AN + 4 }),
    nokta('C', 0.3333333333333333, 3.7, { createdAt: AN + 9, color: '#e11d48' }),
    { id: 'ab', type: 'segment', label: 'AB', startPointId: 'A', endPointId: 'B', color: '#0891b2', visible: true, showLabel: true, showLength: true, createdAt: AN + 10 },
    { id: 'bc', type: 'segment', label: 'BC', startPointId: 'B', endPointId: 'C', color: '#0891b2', visible: true, showLabel: true, createdAt: AN + 11, equalityMark: 1 },
    { id: 'p1', type: 'polygon', label: 'ABC', pointIds: ['A', 'B', 'C'], color: '#2563eb', fillColor: '#93c5fd', fillOpacity: 0.25, visible: true, showLabel: false, showArea: true, createdAt: AN + 12 },
    { id: 'a1', type: 'angle', label: 'α', point1Id: 'B', vertexPointId: 'A', point3Id: 'C', color: '#16a34a', visible: true, showLabel: true, createdAt: AN + 13 },
    { id: 'c1', type: 'circle', label: 'ç', throughPointIds: ['A', 'B', 'C'], color: '#7c3aed', visible: true, showLabel: true, createdAt: AN + 14 },
    nokta('M', 0, 0, { isIndependent: false, construction: { kind: 'midpoint', pointIds: ['A', 'B'] }, createdAt: AN + 15, label: 'M' }),
    { id: 't1', type: 'text', label: 't1', text: 'Üçgenin iç açıları toplamı 180°', x: -4, y: 5, color: '#0f172a', visible: true, showLabel: true, createdAt: AN + 16 },
  ] as unknown as MathObject[];
}

function ornekCisimler(): Solid3DObject[] {
  const ortak = { rotation: { x: 0, y: 0.7853981633974483, z: 0 }, opacity: 0.85, unfoldProgress: 0, showWireframe: true, showVertices: true, showFaces: true };
  return [
    { id: 'kup', name: 'Küp', type: 'cube', position: { x: 0, y: 1, z: 0 }, dimensions: { width: 2, height: 2, depth: 2 }, color: '#f59e0b', ...ortak },
    { id: 'kure', name: 'Küre', type: 'sphere', position: { x: 3.5, y: 1.2, z: -1 }, dimensions: { width: 2, height: 2, depth: 2, radius: 1.2 }, color: '#0ea5e9', ...ortak },
  ] as unknown as Solid3DObject[];
}

function ornekProje(ek: Partial<ProjectFile> = {}): ProjectFile {
  return {
    version: '2.0',
    objects: ornekNesneler(),
    solids: [],
    viewport: { zoom: 61.25, panX: -120.5, panY: 33, width: 1388, height: 811, showGrid: true, showAxes: false, gridStyle: 'noktali', backgroundColor: '#fef3c7' },
    layoutMode: '2d_only',
    ...ek,
  };
}

/**
 * Açılışta canlı belgeye ne yükleneceği: kaydedilen proje ile bağlantıdan açılan proje bunda eşit olmalı. Kimlikler sıra
 * numarasına (k0, k1 …) çevrilerek karşılaştırılır (bağlantı kısa takma adlar taşır); başvurular aynı numarayı göstermeli.
 */
function acilacak(proje: ProjectFile) {
  const p = parseProjectFile(JSON.parse(JSON.stringify(proje)));
  const enEski = Math.min(...p.objects.map((o) => o.createdAt));
  const numara = new Map([...p.objects, ...p.solids].map((o, i) => [o.id, `k${i}`]));
  const kimlikAlani = (k: string, ust: string) => k === 'id' || /Ids?$/.test(k) || k === 'dependsOn' || ust === 'sliderBindings';
  const cevir = (v: unknown, k = '', ust = ''): unknown =>
    typeof v === 'number' ? Math.round(v * 1e9) / 1e9
      : typeof v === 'string' ? (kimlikAlani(k, ust) ? numara.get(v) ?? v : v)
        : Array.isArray(v) ? v.map((x) => cevir(x, k, ust))
          : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([a, x]) => [a, cevir(x, a, k)])) : v;
  const viewport = p.viewport ? { ...p.viewport } : undefined;
  if (viewport) {
    delete viewport.width; delete viewport.height;
    for (const a of ['zoom', 'panX', 'panY'] as const) if (viewport[a] !== undefined) viewport[a] = Math.round(viewport[a]! * 100) / 100;
  }
  return cevir({
    ...p,
    viewport,
    // createdAt yalnız sıra bildirir: en eskiden fark olarak karşılaştırılır
    objects: p.objects.map((o) => ({ ...o, createdAt: o.createdAt - enEski })),
  });
}

describe('paylaşım verisi', () => {
  it('2B çizim sıkıştırılıp açılınca aynı çizim, aynı boyut çıkar', async () => {
    const proje = ornekProje();
    const veri = await paylasimVerisiOlustur({ boyut: '2D', proje });
    expect(veri).toMatch(/^z[A-Za-z0-9_-]+$/);
    const acilan = await paylasimVerisiniCoz(veri);
    expect(acilan.boyut).toBe('2D');
    expect(acilacak(acilan.proje)).toEqual(acilacak(proje));
  });

  it('3B cisimler, kamera ve açık boyut (3B) taşınır', async () => {
    const camera3D = { rotX: -0.6, rotY: 0.785, panX: 12, panY: -4, zoom: 1.3, perspective: 900, showGrid: true, showAxes: true, showCoordinates: false };
    const proje = ornekProje({ objects: [], solids: ornekCisimler(), camera3D, layoutMode: '3d_only' });
    const acilan = await paylasimVerisiniCoz(await paylasimVerisiOlustur({ boyut: '3D', proje }));
    expect(acilan.boyut).toBe('3D');
    expect(acilacak(acilan.proje)).toEqual(acilacak(proje));
    expect(acilan.proje.solids.map((c) => c.name)).toEqual(['Küp', 'Küre']);
    expect(acilan.proje.solids[0].rotation.y).toBeCloseTo(Math.PI / 4, 10);
    expect(acilan.proje.camera3D).toEqual(camera3D);
    expect(acilan.proje.layoutMode).toBe('3d_only');
  });

  it('CompressionStream olmayan tarayıcı sıkıştırmasız (j) biçim üretir; o da açılır', async () => {
    const proje = ornekProje({ solids: ornekCisimler(), layoutMode: '2d_3d' });
    const veri = await paylasimVerisiOlustur({ boyut: '3D', proje }, false);
    expect(veri.startsWith('j')).toBe(true);
    const acilan = await paylasimVerisiniCoz(veri);
    expect(acilacak(acilan.proje)).toEqual(acilacak(proje));
    expect(acilan.boyut).toBe('3D');
  });

  it('Türkçe harfler ve semboller bozulmadan gelir', async () => {
    const acilan = await paylasimVerisiniCoz(await paylasimVerisiOlustur({ boyut: '2D', proje: ornekProje() }));
    expect(acilan.proje.objects.find((o) => o.type === 'text')).toMatchObject({ text: 'Üçgenin iç açıları toplamı 180°', label: 't1' });
    expect(acilan.proje.objects.find((o) => o.type === 'angle')?.label).toBe('α');
  });

  it('sıradan bir çizimin bağlantısı kısadır (uyarı sınırının çok altında)', async () => {
    const veri = await paylasimVerisiOlustur({ boyut: '2D', proje: ornekProje({ solids: ornekCisimler() }) });
    const baglanti = paylasimBaglantisi('ortaokul', veri, { origin: 'https://cdn.eba.gov.tr', pathname: '/icerik/eba-matematik/' });
    expect(baglanti.length).toBeLessThan(1500);
    expect(baglanti.length).toBeLessThan(PAYLASIM_UYARI_UZUNLUGU);
  });

  it('küçültme varsayılanları yazmaz, createdAt farka döner, ondalıkları kırpar; tuval boyutu düşer', () => {
    const k = paylasimIcinKucult(ornekProje());
    const a = k.objects.find((o) => o.label === 'A') as unknown as Record<string, unknown>;
    expect(a.id).toBe('a');
    expect(a).not.toHaveProperty('color');
    expect(a).not.toHaveProperty('visible');
    expect(a).not.toHaveProperty('showLabel');
    expect(a).not.toHaveProperty('createdAt');
    expect(a.x).toBe(-3.14159265359);
    const c = k.objects.find((o) => o.label === 'C') as unknown as Record<string, unknown>;
    expect(c).toMatchObject({ id: 'c', color: '#e11d48', createdAt: 9 });
    // Gizli ad (showLabel: false) korunur
    expect(k.objects.find((o) => o.label === 'ABC')).toMatchObject({ showLabel: false });
    expect(k.viewport).not.toHaveProperty('width');
    expect(k.viewport).toMatchObject({ zoom: 61.25, panX: -120.5, gridStyle: 'noktali' });
  });

  it('kimlikler kısa takma adlara döner; bütün başvurular (inşa, çapa, bağlar, 3B cisim bağı) birlikte değişir', async () => {
    const uzun = (ad: string) => `pt-mvurk0k1-${ad}-bbm8f`;
    const nesneler = [
      nokta(uzun('1'), 0, 0, { label: uzun('1') }),
      nokta(uzun('2'), 3, 0, { label: 'B', labelAnchors: { name: { pointIds: [uzun('1'), uzun('2')], offset: { x: 1, y: 2 }, alignment: 'center', ref: [{ id: uzun('1'), x: 0, y: 0 }] } } }),
      nokta(uzun('3'), 1.5, 0, { label: 'M', isIndependent: false, construction: { kind: 'midpoint', pointIds: [uzun('1'), uzun('2')] } }),
      { id: 'slider-q-1', type: 'slider', label: 'r', variableName: 'r', min: 1, max: 5, step: 1, value: 2, color: '#2563eb', visible: true, showLabel: true, createdAt: AN,
        cisimBagi: { cisimId: 'cisim-uzun-kimlik-1', ozellik: 'kenar', ad: 'Küp 1: kenar uzunluğu' } },
      { id: 'elips-uzun-1', type: 'ellipse', label: 'e', centerPointId: uzun('1'), radiusX: 2, radiusY: 1, sliderBindings: { radiusX: 'slider-q-1' }, color: '#2563eb', visible: true, showLabel: true, createdAt: AN },
    ] as unknown as MathObject[];
    const cisim = { ...ornekCisimler()[0], id: 'cisim-uzun-kimlik-1' };
    const proje = ornekProje({ objects: nesneler, solids: [cisim] });
    const k = paylasimIcinKucult(proje);
    const metin = JSON.stringify(k);
    expect(metin).not.toContain('mvurk0k1-2');
    expect(metin).not.toContain('mvurk0k1-3');
    expect(metin).not.toContain('cisim-uzun-kimlik-1');
    expect(metin).not.toContain('slider-q-1');
    // Adı uzun kimliğine eşit nesnenin adı korunur (açılışta takma ad ad olmasın)
    expect(k.objects[0]).toMatchObject({ id: 'a', label: uzun('1') });
    expect(k.objects[1]).toMatchObject({ id: 'b', labelAnchors: { name: { pointIds: ['a', 'b'], ref: [{ id: 'a' }] } } });
    expect(k.objects[2]).toMatchObject({ construction: { pointIds: ['a', 'b'] } });
    expect(k.objects[3]).toMatchObject({ id: 'd', cisimBagi: { cisimId: 'f', ozellik: 'kenar' } });
    expect(k.objects[4]).toMatchObject({ centerPointId: 'a', sliderBindings: { radiusX: 'd' } });
    expect(k.solids[0].id).toBe('f');
    const acilan = await paylasimVerisiniCoz(await paylasimVerisiOlustur({ boyut: '2D', proje }));
    expect(acilacak(acilan.proje)).toEqual(acilacak(proje));
  });

  it('alıcıdaki varsayılana eşit görünüm alanları, stil ayarları ve kamera yazılmaz; farklı olanlar yazılır', () => {
    const kamera = { rotX: 25, rotY: -40, zoom: 55, panX: 0, panY: 30, perspective: 700, showGrid: true, showAxes: true, showCoordinates: true };
    const gorunum = { zoom: 44, panX: 0, panY: 0, showGrid: true, showAxes: true, gridStyle: 'kareli' as const, backgroundColor: '#ffffff' };
    const varsayilan = paylasimIcinKucult(ornekProje({
      viewport: { ...gorunum, width: 1300, height: 700 }, styleSettings: { ...DEFAULT_STYLE_SETTINGS }, camera3D: { ...kamera },
    }), { gorunum, kamera });
    expect(varsayilan).not.toHaveProperty('viewport');
    expect(varsayilan).not.toHaveProperty('styleSettings');
    expect(varsayilan).not.toHaveProperty('camera3D');
    const ozel = paylasimIcinKucult(ornekProje({
      viewport: { ...gorunum, zoom: 34.9722222929, panX: 35.7916667726, backgroundColor: '#fef3c7' },
      styleSettings: { ...DEFAULT_STYLE_SETTINGS, fontScale: 1.4 }, camera3D: { ...kamera, rotY: 10 },
    }), { gorunum, kamera });
    expect(ozel.viewport).toEqual({ zoom: 34.97, panX: 35.79, backgroundColor: '#fef3c7' });
    expect(ozel.styleSettings).toEqual({ ...DEFAULT_STYLE_SETTINGS, fontScale: 1.4 });
    expect(ozel.camera3D).toMatchObject({ rotY: 10 });
  });
});

describe('paylaşım adresi', () => {
  it('taban, bulunduğu sayfanın adresidir (CDN ve GitHub Pages)', () => {
    expect(paylasimBaglantisi('lise', 'zABC', { origin: 'https://cdn.eba.gov.tr', pathname: '/icerik/eba-matematik/' }))
      .toBe('https://cdn.eba.gov.tr/icerik/eba-matematik/#/studyo/paylas/lise/zABC');
    expect(paylasimBaglantisi('ilkokul', 'zABC', { origin: 'https://kullanici.github.io', pathname: '/geoeba/' }))
      .toBe('https://kullanici.github.io/geoeba/#/studyo/paylas/ilkokul/zABC');
  });

  it('kademe hash\'ten eşzamanlı okunur; tanınmayan kademe null olur', () => {
    expect(paylasimAdresiniCoz('#/studyo/paylas/ilkokul/zAAA')).toEqual({ kademe: 'ilkokul', veri: 'zAAA' });
    expect(paylasimAdresiniCoz('#/studyo/paylas/ortaokul/zAAA')).toEqual({ kademe: 'ortaokul', veri: 'zAAA' });
    expect(paylasimAdresiniCoz('#/studyo/paylas/lise/zAAA')).toEqual({ kademe: 'lise', veri: 'zAAA' });
    expect(paylasimAdresiniCoz('#/studyo/paylas/universite/zAAA')).toEqual({ kademe: null, veri: 'zAAA' });
    expect(paylasimAdresiniCoz('#/studyo/paylas')).toEqual({ kademe: null, veri: '' });
    expect(paylasimAdresiniCoz('#/studyo')).toBeNull();
    expect(paylasimAdresiniCoz('#/konu/mat-5-1-1')).toBeNull();
    expect(paylasimAdresiniCoz('')).toBeNull();
  });

  it('gezinme paylaşım bağlantısını stüdyo olarak çözer ve adresi #/studyo\'ya sadeleştirir', () => {
    const { state, hash } = parseHashToNavState('#/studyo/paylas/lise/zAAA');
    expect(state).toMatchObject({ screen: 'workspace', isFreeSandbox: true });
    expect(hash).toBe('#/studyo');
  });

  it('yakalama paylaşım olmayan hash ile silinmez (StrictMode ikinci geçişi); bırakılınca boşalır', () => {
    paylasimiBirak();
    expect(paylasimiYakala('#/studyo/paylas/ortaokul/zXYZ')).toBe(true);
    expect(paylasimiYakala('#/studyo')).toBe(false);
    expect(bekleyenPaylasim()).toEqual({ kademe: 'ortaokul', veri: 'zXYZ' });
    paylasimiBirak();
    expect(bekleyenPaylasim()).toBeNull();
  });
});

describe('bozuk ya da eski bağlantı', () => {
  /** Çözme hiçbir zaman çökmez: her sorunda kullanıcıya gösterilecek iletili PaylasimHatasi */
  async function hata(veri: string): Promise<string> {
    try {
      await paylasimVerisiniCoz(veri);
    } catch (e) {
      expect(e).toBeInstanceOf(PaylasimHatasi);
      expect((e as Error).message).toMatch(/^Paylaşılan çizim/);
      return (e as Error).message;
    }
    throw new Error('hata bekleniyordu');
  }
  const jsonVerisi = (deger: unknown) => `j${Buffer.from(JSON.stringify(deger)).toString('base64url')}`;

  it('boş, kesik ya da karışık veri anlaşılır iletiyle reddedilir', async () => {
    const tam = await paylasimVerisiOlustur({ boyut: '2D', proje: ornekProje() });
    expect(await hata('')).toContain('eksik ya da bozuk');
    expect(await hata('z')).toContain('eksik ya da bozuk');
    expect(await hata(tam.slice(0, Math.floor(tam.length / 2)))).toContain('eksik ya da bozuk');
    expect(await hata(`${tam.slice(0, 40)}%%${tam.slice(42)}`)).toContain('eksik ya da bozuk');
    expect(await hata('zAAAAAAAAAAAAAAAAAAAA')).toContain('eksik ya da bozuk');
    expect(await hata('j!!!')).toContain('eksik ya da bozuk');
    expect(await hata(`j${Buffer.from('{bozuk json').toString('base64url')}`)).toContain('eksik ya da bozuk');
    expect(await hata(jsonVerisi([1, 2]))).toContain('eksik ya da bozuk');
  });

  it('tanınmayan biçim harfi ve sürüm eski / yeni sürüm iletisi verir', async () => {
    expect(await hata('xAAAA')).toContain('tanınmayan bir biçimde');
    expect(await hata(jsonVerisi({ boyut: '2D', proje: ornekProje() }))).toContain('tanınmayan bir biçimde');
    expect(await hata(jsonVerisi({ s: 2, boyut: '2D', proje: ornekProje() }))).toContain('daha yeni bir sürümle');
  });

  it('geçersiz çizim doğrulamada reddedilir; neden iletide yazar', async () => {
    const bozukNesne = { ...ornekProje(), objects: [{ id: 'x', type: 'ucgenimsi' }] };
    expect(await hata(jsonVerisi({ s: 1, boyut: '2D', proje: bozukNesne }))).toBe('Paylaşılan çizim açılamadı: tanınmayan nesne türü: ucgenimsi. Kendi çiziminiz korundu.');
    const eksikBaglanti = { ...ornekProje(), objects: [{ id: 'ab', type: 'segment', startPointId: 'A', endPointId: 'B' }] };
    expect(await hata(jsonVerisi({ s: 1, boyut: '2D', proje: eksikBaglanti }))).toContain('bulunamayan nesne başvurusu');
    expect(await hata(jsonVerisi({ s: 1, boyut: '2D' }))).toContain('geçersiz nesne');
    expect(await hata(jsonVerisi({ s: 1, boyut: '2D', proje: { version: '2.0' } }))).toContain('nesne listesi bulunamadı');
  });

  it('boyut tanınmıyorsa 2B açılır', async () => {
    const acilan = await paylasimVerisiniCoz(jsonVerisi({ s: 1, boyut: '4D', proje: ornekProje() }));
    expect(acilan.boyut).toBe('2D');
  });
});
