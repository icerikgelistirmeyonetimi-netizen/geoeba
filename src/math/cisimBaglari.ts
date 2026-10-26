import type { MathObject, Point2D, SliderObject } from '@/types/math';
import type { Solid3DObject } from '@/types/workspace3d';
import { NESNE_RENGI } from '@/utils/nesneRenkleri';
import { snapSliderValue } from './sliderBindings';
import { onerilenSurguAyari, type OzellikDegeri } from './surguOnerisi';

/*
 * 3B CİSMİN ÖZELLİĞİNİ KAYDIRICIYA BAĞLAMA (surgu-baglama-onerisi.md): ölçüler, açınım ve dönme (konum bağlanmaz).
 * Kaydırıcılar 2B nesne listesinde, cisimler 3B sahnesinde durur; bağ kaydırıcının üzerinde tutulur
 * (SliderObject.cisimBagi). Tek doğru kaynak kaydırıcıdır: cismin bağlı özelliği her değişiklikte kaydırıcıdan türetilir
 * (cisimleriSurgudenAl). Cismin ölçüsü 3B'de değiştirilirse (büyüt / küçült) kaydırıcı da yeni değeri alır
 * (cisimdenSurguye).
 */

export type CisimOzelligi = 'kenar' | 'genislik' | 'derinlik' | 'yukseklik' | 'yaricap' | 'donme' | 'acinim';

/** Cisim türüne göre bağlanabilecek ölçüler (konum ve dönme dışında) */
const OLCULER: Record<Solid3DObject['type'], CisimOzelligi[]> = {
  cube: ['kenar', 'acinim'],
  prism: ['genislik', 'derinlik', 'yukseklik', 'acinim'],
  triangular_prism: ['genislik', 'yukseklik', 'derinlik', 'acinim'],
  pyramid: ['genislik', 'derinlik', 'yukseklik', 'acinim'],
  cylinder: ['yaricap', 'yukseklik', 'acinim'],
  cone: ['yaricap', 'yukseklik', 'acinim'],
  sphere: ['yaricap'],
};
/** Dönme açısı anlamlı olan (yuvarlak olmayan) cisimler */
const DONEBILIR = new Set<Solid3DObject['type']>(['cube', 'prism', 'triangular_prism', 'pyramid']);

export function cisimOzellikAdi(tur: Solid3DObject['type'], oz: CisimOzelligi): string {
  switch (oz) {
    case 'kenar':
      return 'Kenar uzunluğu';
    case 'genislik':
      return tur === 'triangular_prism' ? 'Taban uzunluğu' : 'Genişlik';
    case 'derinlik':
      return tur === 'triangular_prism' ? 'Prizma uzunluğu' : 'Derinlik';
    case 'yukseklik':
      return tur === 'triangular_prism' ? 'Üçgenin yüksekliği' : 'Yükseklik';
    case 'yaricap':
      return 'Yarıçap';
    case 'donme':
      return 'Dönme açısı (°)';
    case 'acinim':
      return 'Açınım (0 kapalı, 1 açık)';
  }
}

/**
 * Cismin bağlanabilecek özellikleri: ölçüler ve açınım; `donme`: yuvarlak olmayan cisimde dönme açısı da (lisede).
 * Konum bağlanmaz: sürgü ölçüye bağlanır (surgu-baglama-onerisi.md).
 */
export function cisimOzellikleri(cisim: Solid3DObject, secenek: { donme: boolean }): { oz: CisimOzelligi; ad: string }[] {
  const liste = [
    ...(OLCULER[cisim.type] ?? []),
    ...(secenek.donme && DONEBILIR.has(cisim.type) ? (['donme'] as CisimOzelligi[]) : []),
  ];
  return liste.map((oz) => ({ oz, ad: cisimOzellikAdi(cisim.type, oz) }));
}

/** Özelliğin şimdiki değeri (boş ölçü 3 birim, yarıçap verilmemişse genişliğin yarısı: cismin çizildiği gibi) */
export function cisimOzellikDegeri(c: Solid3DObject, oz: CisimOzelligi): number {
  const d = c.dimensions;
  switch (oz) {
    case 'kenar':
    case 'genislik':
      return d.width || 3;
    case 'derinlik':
      return d.depth || 3;
    case 'yukseklik':
      return d.height || 3;
    case 'yaricap':
      return d.radius || (d.width || 3) / 2;
    case 'donme':
      return c.rotation?.z ?? 0;
    case 'acinim':
      return c.unfoldProgress || 0;
  }
}

/** Özelliği yazar; değer aynıysa aynı nesne döner. Küpün kenarı üç ölçüye birden yazılır. */
export function cisimOzelliginiYaz(c: Solid3DObject, oz: CisimOzelligi, deger: number): Solid3DObject {
  if (cisimOzellikDegeri(c, oz) === deger && (oz !== 'kenar' || (c.dimensions.height === deger && c.dimensions.depth === deger))) return c;
  switch (oz) {
    case 'kenar':
      return { ...c, dimensions: { ...c.dimensions, width: deger, height: deger, depth: deger } };
    case 'genislik':
      return { ...c, dimensions: { ...c.dimensions, width: deger } };
    case 'derinlik':
      return { ...c, dimensions: { ...c.dimensions, depth: deger } };
    case 'yukseklik':
      return { ...c, dimensions: { ...c.dimensions, height: deger } };
    case 'yaricap':
      return { ...c, dimensions: { ...c.dimensions, radius: deger } };
    case 'donme':
      return { ...c, rotation: { ...c.rotation, z: deger } };
    case 'acinim':
      return { ...c, unfoldProgress: deger };
  }
}

const etkin = (s: MathObject): s is SliderObject & { cisimBagi: NonNullable<SliderObject['cisimBagi']> } =>
  s.type === 'slider' && !!s.cisimBagi && !s.cisimBagi.askida;

/**
 * Cisimlerin bağlı özelliklerini kaydırıcılardan türetir. Bağı bu adımda geçici kapatılan (askıya alınan) kaydırıcının
 * cismi bağdan önceki değerine döner. Değişen yoksa aynı dizi döner.
 */
export function cisimleriSurgudenAl(cisimler: Solid3DObject[], objects: readonly MathObject[], oncekiObjects: readonly MathObject[]): Solid3DObject[] {
  const yazilacak = new Map<string, [CisimOzelligi, number][]>();
  const ekle = (cisimId: string, oz: CisimOzelligi, deger: number) => {
    if (Number.isFinite(deger)) yazilacak.set(cisimId, [...(yazilacak.get(cisimId) ?? []), [oz, deger]]);
  };
  const onceki = new Map(oncekiObjects.map((o) => [o.id, o]));
  for (const s of objects) {
    if (s.type !== 'slider' || !s.cisimBagi) continue;
    if (!s.cisimBagi.askida) {
      ekle(s.cisimBagi.cisimId, s.cisimBagi.ozellik, s.value);
      continue;
    }
    const eski = onceki.get(s.id);
    if (eski && etkin(eski) && eski.cisimBagi.cisimId === s.cisimBagi.cisimId && s.cisimBagOncekiDeger !== undefined) {
      ekle(s.cisimBagi.cisimId, s.cisimBagi.ozellik, s.cisimBagOncekiDeger);
    }
  }
  if (!yazilacak.size) return cisimler;
  let degisti = false;
  const sonuc = cisimler.map((c) => {
    let yeni = c;
    for (const [oz, deger] of yazilacak.get(c.id) ?? []) yeni = cisimOzelliginiYaz(yeni, oz, deger);
    if (yeni !== c) degisti = true;
    return yeni;
  });
  return degisti ? sonuc : cisimler;
}

/**
 * İki yönlü bağ: 3B'de taşınan (ya da ölçüsü değişen) cismin bağlı özelliği değiştiyse ve kaydırıcısı değişmediyse
 * kaydırıcının yeni değeri (adımına oturur, aralıkta kalır). Kaydırıcı kimliği → değer.
 */
export function cisimdenSurguye(
  cisimler: readonly Solid3DObject[], oncekiCisimler: readonly Solid3DObject[], objects: readonly MathObject[], oncekiObjects: readonly MathObject[],
): Map<string, number> {
  const sonuc = new Map<string, number>();
  const cisim = new Map(cisimler.map((c) => [c.id, c]));
  const eskiCisim = new Map(oncekiCisimler.map((c) => [c.id, c]));
  const eskiNesne = new Map(oncekiObjects.map((o) => [o.id, o]));
  for (const s of objects) {
    if (!etkin(s)) continue;
    const { cisimId, ozellik } = s.cisimBagi;
    const simdi = cisim.get(cisimId);
    const once = eskiCisim.get(cisimId);
    const eskiSurgu = eskiNesne.get(s.id);
    if (!simdi || !once || eskiSurgu?.type !== 'slider' || eskiSurgu.value !== s.value) continue;
    const deger = cisimOzellikDegeri(simdi, ozellik);
    if (deger === cisimOzellikDegeri(once, ozellik) || deger === s.value || !Number.isFinite(deger)) continue;
    try {
      sonuc.set(s.id, snapSliderValue(deger, s.min, s.max, s.step));
    } catch {
      // Geçersiz kaydırıcı ayarı: kaydırıcı değişmez, cisim onun değerine döner
    }
  }
  return sonuc;
}

/** Yeni kaydırıcının ad sırası (Kaydırıcı penceresindeki gibi; koordinat adları yok) */
const SAYI_ADLARI = ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v'];
const ACI_ADLARI = ['α', 'β', 'γ', 'θ', 'φ', 'ψ'];

function siradakiAd(objects: readonly MathObject[], aci: boolean): string {
  const kullanilan = new Set(objects.flatMap((o) => (o.type === 'slider' ? [o.variableName] : [])));
  const adlar = aci ? ACI_ADLARI : SAYI_ADLARI;
  const bos = adlar.find((ad) => !kullanilan.has(ad));
  if (bos) return bos;
  for (let i = 1; ; i++) if (!kullanilan.has(`${adlar[0]}${i}`)) return `${adlar[0]}${i}`;
}

/** Özelliğin önerilen kaydırıcı ayarı: ölçü uzunluk, dönme açı; açınım 0 … 1, adım 0,1 */
function cisimOnerisi(oz: CisimOzelligi, deger: number) {
  if (oz === 'acinim') return { min: 0, max: 1, step: 0.1, value: Math.round(deger * 10) / 10 };
  const tur: OzellikDegeri['tur'] = oz === 'donme' ? 'aci' : 'uzunluk';
  return onerilenSurguAyari({ tur, deger, enCokAci: 360 });
}

/**
 * Cismin özelliğine bağlı yeni kaydırıcı: kullanılmayan ilk ad, özelliğin şimdiki değeri ve önerilen aralık; bağdan
 * önceki değer saklanır (bağ geçici kapatılınca cisim ona döner). `yer` tuvaldeki konum ve uzunluktur.
 */
export function cisimSurgusuOlustur(
  objects: readonly MathObject[], cisim: Solid3DObject, oz: CisimOzelligi, yer: Point2D & { length: number }, kimlik: string, an: number,
): SliderObject {
  const deger = cisimOzellikDegeri(cisim, oz);
  const aci = oz === 'donme';
  const ad = siradakiAd(objects, aci);
  return {
    id: kimlik,
    type: 'slider',
    label: `${ad} Parametresi`,
    showLabel: true,
    variableName: ad,
    ...cisimOnerisi(oz, deger),
    ...(aci ? { sliderType: 'angle' as const } : {}),
    animSpeed: 1,
    animMode: 'oscillating',
    x: yer.x,
    y: yer.y,
    length: yer.length,
    color: NESNE_RENGI.mor,
    visible: true,
    createdAt: an,
    cisimBagi: { cisimId: cisim.id, ozellik: oz, ad: `${cisim.name || 'Cisim'}: ${cisimOzellikAdi(cisim.type, oz).replace(/ \(.*\)$/, '').toLocaleLowerCase('tr')}` },
    cisimBagOncekiDeger: deger,
  };
}
