/**
 * Ölçme araçlarının (cetvel, açıölçer, gönye, alan modeli) saf mantığı: React ve sınıf adı yok.
 *
 * - Yerleştirme: araç etkinleştiğinde GÖRSEL merkezi, görünen tuvalin tam ortasına gelir;
 *   boyu o anki yakınlaştırmada sığacak ve okunacak biçimde ayarlanır.
 * - Tutamaç matematiği: cetvel boyu (tam br), iletki kolu, döndürme yakalaması, alan köşesi.
 * - Çentik yolları: yüzlerce <line> yerine birkaç <path> (kaydırırken çizim ucuz kalsın).
 * - Anlık okumalar ("12 br", "35°") ve sağ tık menüsü maddeleri (veri olarak).
 * - Tuvale ekleme: cetvelden doğru parçası, açıölçerden açı nesneleri.
 *
 * Açı kuralları: cetvel ve gönyenin durumu SVG derecesidir (ekranda saat yönü +).
 * Kullanıcıya gösterilen ve menüde seçilen değerler matematik derecesidir (saat yönünün tersi +),
 * yani `normalizeDeg(-donusSvg)`. Açıölçerin tabanı zaten matematik derecesidir.
 */
import type { AngleObject, MathObject, Point2D, PointObject, SegmentObject, ViewportTransform } from '@/types/math';
import { formatTurkishNumber, screenToWorld, worldToScreen } from '@/math/coordinates';
import { generateNextPointLabels } from '@/math/geometry';

// ─── Sabitler ────────────────────────────────────────────────────────────────

export const OLCME_ARACLARI = ['ruler', 'measure_angle', 'setsquare', 'area_model'] as const;
export type OlcmeAraci = (typeof OLCME_ARACLARI)[number];

export function olcmeAraciMi(arac: unknown): arac is OlcmeAraci {
  return typeof arac === 'string' && (OLCME_ARACLARI as readonly string[]).includes(arac);
}

/** Menü başlığı ve ekran okuyucu adı */
export const ARAC_ADLARI: Record<OlcmeAraci, string> = {
  ruler: 'Cetvel',
  measure_angle: 'Açıölçer',
  setsquare: 'Gönye',
  area_model: 'Alan Modeli',
};

/**
 * WorkspaceView.activateTool her araç seçiminde (araç çubuğu, kısayol, yazılı/sesli komut) bu olayı
 * gönderir. Zaten açık olan aracın yeniden seçilmesi React'te durum değiştirmez; ölçme aracını yeniden
 * ortalamak için bu olay dinlenir.
 */
export const ARAC_SECILDI_OLAYI = 'geoeba:arac-secildi';
/**
 * Tuvalin altındaki yönerge çubuğundaki "Seçenekler" / "Sil" düğmeleri bu olayı gönderir
 * (detail: { islem: 'menu' | 'sil', x?, y? }). Dokunmatik tahtada sağ tık yokken menüye ulaşma yolu.
 */
export const OLCME_ARACI_ISLEM_OLAYI = 'geoeba:olcme-araci';

export const UZUN_BASIS_MS = 600;
export const UZUN_BASIS_TOLERANS_PX = 12;

export const CETVEL_BOY_MIN = 2;
export const CETVEL_BOY_MAX = 35;
/** Cetvel gövdesinin kalınlığı (px); ölçü kenarı y = 0'da, gövde y = 0…48 */
export const CETVEL_KALINLIK = 48;
/** Cetvel gövdesinin iki uçtaki iç boşluğu (px): 0 ve son sayı gövdenin içinde kalır */
export const CETVEL_UC_BOSLUK = 8;
/** Etkinleşince cetvelin ekranda en az bu kadar uzun olması istenir (px) */
export const CETVEL_EN_KISA_PX = 160;

export const ILETKI_YARICAP_MIN = 120;
export const ILETKI_YARICAP_MAX = 170;

export const GONYE_BOY_MIN = 0.5;
export const GONYE_BOY_MAX = 40;

export const ALAN_MIN = 1;
export const ALAN_MAX = 15;

export const VARSAYILANLAR = {
  cetvelBoy: 8,
  cetvelDonus: 0,
  iletkiAci: 60,
  iletkiTaban: 0,
  iletkiYaricap: 140,
  gonyeBoy: 6,
  gonyeDonus: 0,
  sutun: 4,
  satir: 3,
  olcuGoster: true,
  alanGoster: true,
  cevreGoster: false,
} as const;

// ─── Açılar ──────────────────────────────────────────────────────────────────

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const rad = (deg: number) => (deg * Math.PI) / 180;
const der = (r: number) => (r * 180) / Math.PI;

/** Dereceyi tam sayıya yuvarlayıp [0, 360) aralığına indirger. */
export const normalizeDeg = (deg: number) => ((Math.round(deg) % 360) + 360) % 360;

/** Açı sınıflandırması (MEB müfredatı) */
export function aciTuru(aci: number): string {
  if (aci === 0) return 'Sıfır Açı';
  if (aci < 90) return 'Dar Açı';
  if (aci === 90) return 'Dik Açı';
  if (aci < 180) return 'Geniş Açı';
  if (aci === 180) return 'Doğru Açı';
  return 'Tam Açı';
}

/**
 * Döndürme tutamacının yakalaması: Shift ile `adim` derecelik adımlar; Shift yokken 45°'nin
 * katlarına 2°'den yakınsa o kata mıknatıslanır, değilse tam dereceye yuvarlanır.
 */
export function donusYakala(deg: number, shift: boolean, adim: number): number {
  if (shift) return normalizeDeg(Math.round(deg / adim) * adim);
  const kat = Math.round(deg / 45) * 45;
  if (Math.abs(deg - kat) <= 2) return normalizeDeg(kat);
  return normalizeDeg(deg);
}

// ─── Görünür alan ve yerleştirme ─────────────────────────────────────────────

type Gorunum = Pick<ViewportTransform, 'zoom' | 'panX' | 'panY' | 'width' | 'height'>;

/** Görünen tuvalin ortasının dünya koordinatı: (-panX/zoom, panY/zoom) */
export function gorunurMerkez(vp: Gorunum): Point2D {
  return screenToWorld({ x: vp.width / 2, y: vp.height / 2 }, vp as ViewportTransform);
}

/** Aracın yerel (ekran px, döndürülmüş) noktasını ekran koordinatına çevirir. */
export function yereldenEkrana(koken: Point2D, donusSvg: number, yerel: Point2D): Point2D {
  const r = rad(donusSvg);
  return {
    x: koken.x + yerel.x * Math.cos(r) - yerel.y * Math.sin(r),
    y: koken.y + yerel.x * Math.sin(r) + yerel.y * Math.cos(r),
  };
}

// Cetvel ---------------------------------------------------------------------

/**
 * Cetvelin etkinleşmedeki boyu (tam br): tercih edilen boy; ekranda en az ~160 px olacak kadar uzatılır,
 * döndürülmüş hâliyle görünen genişliğin/yüksekliğin %70'ine sığacak kadar kısaltılır; 2…35 br.
 */
export function cetvelBoyuSigdir(tercih: number, donusSvg: number, vp: Gorunum): number {
  const r = rad(donusSvg);
  const c = Math.abs(Math.cos(r));
  const s = Math.abs(Math.sin(r));
  const enFazlaPx = 0.7 * Math.min(c > 1e-9 ? vp.width / c : Infinity, s > 1e-9 ? vp.height / s : Infinity);
  const sigan = Math.floor(enFazlaPx / vp.zoom);
  const enAz = Math.ceil(CETVEL_EN_KISA_PX / vp.zoom);
  return clamp(Math.min(Math.max(Math.round(tercih), enAz), sigan), CETVEL_BOY_MIN, CETVEL_BOY_MAX);
}

/**
 * Cetvelin görsel merkezi (dünya). `konum` 0 çentiği (ölçü kenarı üzerinde, döndürme merkezi);
 * gövde kenarın altında 48 px kalınlıktadır.
 */
export function cetvelMerkezi(konum: Point2D, donusSvg: number, boy: number, zoom: number): Point2D {
  const t = rad(-donusSvg);
  const yarim = CETVEL_KALINLIK / 2 / zoom;
  return {
    x: konum.x + (boy / 2) * Math.cos(t) + yarim * Math.sin(t),
    y: konum.y + (boy / 2) * Math.sin(t) - yarim * Math.cos(t),
  };
}

/** Görsel merkezi verilen cetvelin 0 çentiği (cetvelMerkezi'nin tersi). */
export function cetvelKonumuMerkezden(merkez: Point2D, donusSvg: number, boy: number, zoom: number): Point2D {
  const t = rad(-donusSvg);
  const yarim = CETVEL_KALINLIK / 2 / zoom;
  return {
    x: merkez.x - (boy / 2) * Math.cos(t) - yarim * Math.sin(t),
    y: merkez.y - (boy / 2) * Math.sin(t) + yarim * Math.cos(t),
  };
}

export function cetveliYerlestir(tercihBoy: number, donusSvg: number, vp: Gorunum): { konum: Point2D; boy: number } {
  const boy = cetvelBoyuSigdir(tercihBoy, donusSvg, vp);
  return { boy, konum: cetvelKonumuMerkezden(gorunurMerkez(vp), donusSvg, boy, vp.zoom) };
}

/** Cetvel gövdesinin dört köşesi (ekran px) */
export function cetvelKoseleri(konum: Point2D, donusSvg: number, boy: number, vp: Gorunum): Point2D[] {
  const koken = worldToScreen(konum, vp as ViewportTransform);
  const Lp = boy * vp.zoom;
  const b = CETVEL_UC_BOSLUK;
  return [
    { x: -b, y: 0 },
    { x: Lp + b, y: 0 },
    { x: Lp + b, y: CETVEL_KALINLIK },
    { x: -b, y: CETVEL_KALINLIK },
  ].map((p) => yereldenEkrana(koken, donusSvg, p));
}

const ekranda = (noktalar: Point2D[], vp: Gorunum) =>
  noktalar.every((p) => p.x >= 0 && p.y >= 0 && p.x <= vp.width && p.y <= vp.height);

/**
 * Menüden boy değişince cetvelin yeni 0 çentiği: yeni boy ekrana sığıyorsa 0 ucu yerinde kalır
 * (öğretmenin bir noktaya hizaladığı 0 kaymasın); taşıyorsa görsel merkez sabit tutulur.
 */
export function cetvelBoyunuDegistir(konum: Point2D, donusSvg: number, eskiBoy: number, yeniBoy: number, vp: Gorunum): Point2D {
  if (ekranda(cetvelKoseleri(konum, donusSvg, yeniBoy, vp), vp)) return konum;
  const merkez = cetvelMerkezi(konum, donusSvg, eskiBoy, vp.zoom);
  return cetvelKonumuMerkezden(merkez, donusSvg, yeniBoy, vp.zoom);
}

// Açıölçer -------------------------------------------------------------------

/** İletki yarıçapı (ekran px): görünen alanın %30 genişliği / %40 yüksekliği, 120…170 px */
export function iletkiYaricapi(vp: Gorunum): number {
  return clamp(Math.floor(Math.min(0.3 * vp.width, 0.4 * vp.height)), ILETKI_YARICAP_MIN, ILETKI_YARICAP_MAX);
}

/** İletkinin görsel merkezi: yarım dairenin sınır kutusunun ortası (yerel (0, -R/2)) */
export function iletkiMerkezi(konum: Point2D, taban: number, yaricap: number, zoom: number): Point2D {
  const b = rad(taban);
  const k = yaricap / (2 * zoom);
  return { x: konum.x - k * Math.sin(b), y: konum.y + k * Math.cos(b) };
}

export function iletkiyiYerlestir(taban: number, vp: Gorunum): { konum: Point2D; yaricap: number } {
  const yaricap = iletkiYaricapi(vp);
  const m = gorunurMerkez(vp);
  const b = rad(taban);
  const k = yaricap / (2 * vp.zoom);
  return { yaricap, konum: { x: m.x + k * Math.sin(b), y: m.y - k * Math.cos(b) } };
}

// Gönye ----------------------------------------------------------------------

/**
 * Gönyenin dik kenar boyu (br, 0,5 adım): ekranda [min(160, üst), üst] px aralığında kalır;
 * üst = max(120, 0,6·kısa kenar − 60). Aralıktaysa kullanıcının boyu korunur.
 */
export function gonyeBoyuSigdir(boy: number, vp: Gorunum): number {
  const z = vp.zoom;
  const enFazla = Math.max(120, 0.6 * Math.min(vp.width, vp.height) - 60);
  const enAz = Math.min(160, enFazla);
  const px = boy * z;
  let sonuc = boy;
  if (px > enFazla) sonuc = Math.floor((2 * enFazla) / z) / 2;
  else if (px < enAz) {
    sonuc = Math.ceil((2 * enAz) / z) / 2;
    if (sonuc * z > enFazla) sonuc = Math.floor((2 * enFazla) / z) / 2;
  }
  return clamp(sonuc, GONYE_BOY_MIN, GONYE_BOY_MAX);
}

/** Gönyenin görsel merkezi: üçgenin ağırlık merkezi (yerel (Lp/3, -Lp/3)) */
export function gonyeMerkezi(konum: Point2D, donusSvg: number, boy: number): Point2D {
  const r = rad(donusSvg);
  const k = boy / 3;
  return { x: konum.x + k * (Math.cos(r) + Math.sin(r)), y: konum.y + k * (Math.cos(r) - Math.sin(r)) };
}

export function gonyeyiYerlestir(tercihBoy: number, donusSvg: number, vp: Gorunum): { konum: Point2D; boy: number } {
  const boy = gonyeBoyuSigdir(tercihBoy, vp);
  const m = gorunurMerkez(vp);
  const r = rad(donusSvg);
  const k = boy / 3;
  return { boy, konum: { x: m.x - k * (Math.cos(r) + Math.sin(r)), y: m.y - k * (Math.cos(r) - Math.sin(r)) } };
}

// Alan modeli ----------------------------------------------------------------

/** Alan modeli yalnız sığmıyorsa küçülür (genişliğin %75'i, yüksekliğin %70'i); konum sol alt köşedir. */
export function alanModeliniYerlestir(tercihSutun: number, tercihSatir: number, vp: Gorunum): { konum: Point2D; sutun: number; satir: number } {
  const sutun = clamp(Math.min(tercihSutun, Math.floor((0.75 * vp.width) / vp.zoom)), ALAN_MIN, ALAN_MAX);
  const satir = clamp(Math.min(tercihSatir, Math.floor((0.7 * vp.height) / vp.zoom)), ALAN_MIN, ALAN_MAX);
  const m = gorunurMerkez(vp);
  return { sutun, satir, konum: { x: m.x - sutun / 2, y: m.y - satir / 2 } };
}

/** Menüden boyut değişince: yeni model ekrana sığıyorsa sol alt köşe yerinde kalır, taşıyorsa merkez sabit tutulur. */
export function alanBoyutunuDegistir(
  konum: Point2D,
  eski: { sutun: number; satir: number },
  yeni: { sutun: number; satir: number },
  vp: Gorunum
): Point2D {
  const sol = worldToScreen(konum, vp as ViewportTransform);
  const sag = worldToScreen({ x: konum.x + yeni.sutun, y: konum.y + yeni.satir }, vp as ViewportTransform);
  if (ekranda([sol, sag], vp)) return konum;
  return {
    x: konum.x + eski.sutun / 2 - yeni.sutun / 2,
    y: konum.y + eski.satir / 2 - yeni.satir / 2,
  };
}

/** Çok küçük yakınlaştırmada köşe tutamacı modeli örtmesin diye çapraz dışarı kaydırılır (px). */
export const alanKoseKaymasi = (zoom: number) => (zoom < 30 ? 16 : 0);

// ─── Tutamaç matematiği ──────────────────────────────────────────────────────

/** Boy tutamacı: basıldığı andan beri cetvel ekseni boyunca yapılan yer değiştirme kadar; tam br, 2…35. */
export function cetvelBoyuSuruklemeden(ilkBoy: number, ilkIzdusum: number, izdusum: number, zoom: number): number {
  return clamp(Math.round(ilkBoy + (izdusum - ilkIzdusum) / zoom), CETVEL_BOY_MIN, CETVEL_BOY_MAX);
}

/**
 * İletki kolu: imlecin iletki merkezine göre (yukarı +) konumundan tabana göre açı; alt yarı düzlemde
 * en yakın uca kilitlenir. Shift ile 5°'lik adımlar.
 */
export function iletkiKolAcisi(dx: number, dyYukari: number, taban: number, shift: boolean): number {
  const goreli = normalizeDeg(Math.round(der(Math.atan2(dyYukari, dx))) - taban);
  const aci = goreli <= 180 ? goreli : goreli > 270 ? 0 : 180;
  return shift ? Math.round(aci / 5) * 5 : aci;
}

/** Alan köşe tutamacı: sol alt köşeden piksel uzaklığa göre [sütun, satır], 1…15 */
export function alanBoyutuTutamactan(dx: number, dyYukari: number, zoom: number): [number, number] {
  return [
    clamp(Math.round(dx / zoom), ALAN_MIN, ALAN_MAX),
    clamp(Math.round(dyYukari / zoom), ALAN_MIN, ALAN_MAX),
  ];
}

// ─── Çentikler ───────────────────────────────────────────────────────────────

/** Yakınlaştırmaya göre cetvel çentik yoğunluğu: sayılar en az 24 px, yarımlar 5 px, onda birler 4 px arayla. */
export function cetvelCentikDuzeni(zoom: number): { etiketAdimi: number; yarim: boolean; onda: boolean } {
  const etiketAdimi = [1, 2, 5, 10].find((a) => a * zoom >= 24) ?? 10;
  return { etiketAdimi, yarim: 0.5 * zoom >= 5, onda: 0.1 * zoom >= 4 };
}

const px = (v: number) => Number(v.toFixed(2));

/** Cetvel çentikleri üç <path> olarak (ölçü kenarı y = 0, çentikler gövdenin içine doğru). */
export function cetvelCentikYollari(boy: number, zoom: number): { birim: string; yarim: string; onda: string } {
  const d = cetvelCentikDuzeni(zoom);
  const birim: string[] = [];
  const yarim: string[] = [];
  const onda: string[] = [];
  for (let k = 0; k <= boy; k++) {
    birim.push(`M${px(k * zoom)} 0v15`);
    if (k === boy) break;
    if (d.yarim) yarim.push(`M${px((k + 0.5) * zoom)} 0v10`);
    if (d.onda) {
      for (let j = 1; j <= 9; j++) {
        if (j === 5 && d.yarim) continue; // yarım çentiğin altında kalır
        onda.push(`M${px((k + j / 10) * zoom)} 0v6`);
      }
    }
  }
  return { birim: birim.join(''), yarim: yarim.join(''), onda: onda.join('') };
}

/** Cetvel üzerinde sayı yazılacak birimler */
export function cetvelEtiketleri(boy: number, zoom: number): number[] {
  const { etiketAdimi } = cetvelCentikDuzeni(zoom);
  const sonuc: number[] = [];
  for (let k = 0; k <= boy; k += etiketAdimi) sonuc.push(k);
  return sonuc;
}

const kutupsal = (r: number, deg: number) => ({ x: px(r * Math.cos(rad(deg))), y: px(-r * Math.sin(rad(deg))) });

/** İletki çentikleri (yerel, taban yatayken): 10°, 5° ve (yeterince büyükse) 1° */
export function iletkiCentikYollari(yaricap: number): { on: string; bes: string; bir: string } {
  const on: string[] = [];
  const bes: string[] = [];
  const bir: string[] = [];
  const birCizilsin = (yaricap * Math.PI) / 180 >= 2.5;
  for (let d = 0; d <= 180; d++) {
    const boy = d % 10 === 0 ? 14 : d % 5 === 0 ? 9 : 5;
    if (boy === 5 && !birCizilsin) continue;
    const a = kutupsal(yaricap, d);
    const b = kutupsal(yaricap - boy, d);
    const yol = `M${a.x} ${a.y}L${b.x} ${b.y}`;
    (boy === 14 ? on : boy === 9 ? bes : bir).push(yol);
  }
  return { on: on.join(''), bes: bes.join(''), bir: bir.join('') };
}

/** İletki üzerindeki sayılar (her 10°), yarıçapın 24 px içinde */
export function iletkiEtiketleri(yaricap: number): { derece: number; x: number; y: number }[] {
  const sonuc: { derece: number; x: number; y: number }[] = [];
  for (let d = 0; d <= 180; d += 10) {
    const p = kutupsal(yaricap - 24, d);
    sonuc.push({ derece: d, x: p.x, y: p.y });
  }
  return sonuc;
}

// ─── Anlık okumalar ──────────────────────────────────────────────────────────

export const okumaGenisligi = (metin: string) => Math.round(22 + 7.4 * [...metin].length);

/**
 * Sürüklenen tutamacın üstünde duran okuma hapının merkezi: parmak örtmesin diye 46 px yukarıda;
 * üst kenara taşarsa 46 px aşağıda. Yatayda görünür alanın içine kıstırılır.
 */
export function okumaKonumu(tutamac: Point2D, genislik: number, vp: Gorunum): Point2D {
  let y = tutamac.y - 46;
  if (y < 22) y = tutamac.y + 46;
  const enAz = genislik / 2 + 6;
  const enCok = vp.width - genislik / 2 - 6;
  const x = enCok < enAz ? vp.width / 2 : clamp(tutamac.x, enAz, enCok);
  return { x, y };
}

export const cetvelOkumasi = (boy: number) => `${formatTurkishNumber(boy)} br`;
export const donusOkumasi = (donusSvg: number) => `${normalizeDeg(-donusSvg)}°`;
export const iletkiOkumasi = (aci: number) => `${aci}° · ${aciTuru(aci)}`;
export const tabanOkumasi = (taban: number) => `Taban ${normalizeDeg(taban)}°`;
export const alanOkumasi = (sutun: number, satir: number) => `${sutun} × ${satir} = ${sutun * satir} br²`;
export const cevreOkumasi = (sutun: number, satir: number) => `Çevre = 2 × (${sutun} + ${satir}) = ${2 * (sutun + satir)} br`;

// ─── Sağ tık menüsü (veri) ───────────────────────────────────────────────────

export type OlcmeIkonu =
  | 'Ruler'
  | 'Plus'
  | 'Minus'
  | 'MoveHorizontal'
  | 'MoveVertical'
  | 'RotateCcw'
  | 'LayoutGrid'
  | 'LocateFixed'
  | 'Trash2'
  | 'geo:segment'
  | 'geo:angle'
  | 'geo:protractor'
  | 'geo:rectangle';

export type GosterimAnahtari = 'olcu' | 'alan' | 'cevre';

export type OlcmeEylemi =
  | { tur: 'cetvelBoy'; boy: number }
  | { tur: 'cetvelDonus'; donusSvg: number }
  | { tur: 'cetvelParcaEkle' }
  | { tur: 'iletkiAci'; aci: number }
  | { tur: 'iletkiTaban'; taban: number }
  | { tur: 'iletkiAciEkle' }
  | { tur: 'gonyeDonus'; donusSvg: number }
  | { tur: 'alanBoyut'; sutun: number; satir: number }
  | { tur: 'alanCokgenEkle' }
  | { tur: 'gosterim'; anahtar: GosterimAnahtari; acik: boolean }
  | { tur: 'ortala' }
  | { tur: 'sil' };

export interface OlcmeMenuMaddesi {
  id: string;
  label: string;
  ikon?: OlcmeIkonu;
  radio?: boolean;
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
  submenu?: OlcmeMenuMaddesi[];
  eylem?: OlcmeEylemi;
  prompt?: { label: string; unit: string; initial: string; eylem: (deger: number) => OlcmeEylemi };
}

const ORTALA: OlcmeMenuMaddesi = { id: 'ortala', label: 'Ortaya getir', ikon: 'LocateFixed', separatorBefore: true, eylem: { tur: 'ortala' } };
const SIL: OlcmeMenuMaddesi = { id: 'sil', label: 'Sil', ikon: 'Trash2', danger: true, separatorBefore: true, eylem: { tur: 'sil' } };
const ortakSon = (onEk: string): OlcmeMenuMaddesi[] => [
  { ...ORTALA, id: `${onEk}-ortala` },
  { ...SIL, id: `${onEk}-sil` },
];

export const CETVEL_HAZIR_BOYLAR = [5, 8, 10, 12, 15, 20] as const;
export const ILETKI_HAZIR_ACILAR = [0, 30, 45, 60, 90, 120, 135, 150, 180] as const;
export const GONYE_HAZIR_DONUSLER = [0, 45, 90, 135, 180, 225, 270, 315] as const;
export const ALAN_HAZIR_BOYUTLAR = [
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  [10, 10],
] as const;

export function cetvelMenusu({ boy, donusSvg }: { boy: number; donusSvg: number }): OlcmeMenuMaddesi[] {
  const donus = normalizeDeg(donusSvg);
  return [
    {
      id: 'cetvel-uzunluk',
      label: 'Uzunluk',
      ikon: 'Ruler',
      submenu: [
        ...CETVEL_HAZIR_BOYLAR.map((n) => ({
          id: `cetvel-uzunluk-${n}`,
          label: `${n} br`,
          radio: true,
          checked: boy === n,
          eylem: { tur: 'cetvelBoy', boy: n } as OlcmeEylemi,
        })),
        {
          id: 'cetvel-uzunluk-yaz',
          label: 'Uzunluğu yaz…',
          separatorBefore: true,
          prompt: {
            label: 'Uzunluk',
            unit: 'br',
            initial: formatTurkishNumber(boy),
            eylem: (v: number): OlcmeEylemi => ({ tur: 'cetvelBoy', boy: clamp(Math.round(v), CETVEL_BOY_MIN, CETVEL_BOY_MAX) }),
          },
        },
      ],
    },
    { id: 'cetvel-uzat', label: '1 br uzat', ikon: 'Plus', disabled: boy >= CETVEL_BOY_MAX, eylem: { tur: 'cetvelBoy', boy: Math.min(CETVEL_BOY_MAX, boy + 1) } },
    { id: 'cetvel-kisalt', label: '1 br kısalt', ikon: 'Minus', disabled: boy <= CETVEL_BOY_MIN, eylem: { tur: 'cetvelBoy', boy: Math.max(CETVEL_BOY_MIN, boy - 1) } },
    { id: 'cetvel-yatay', label: 'Yatay yap (0°)', ikon: 'MoveHorizontal', separatorBefore: true, disabled: donus === 0, eylem: { tur: 'cetvelDonus', donusSvg: 0 } },
    { id: 'cetvel-dikey', label: 'Dikey yap (90°)', ikon: 'MoveVertical', disabled: donus === 270, eylem: { tur: 'cetvelDonus', donusSvg: 270 } },
    { id: 'cetvel-parca', label: 'Doğru parçası olarak ekle', ikon: 'geo:segment', separatorBefore: true, eylem: { tur: 'cetvelParcaEkle' } },
    ...ortakSon('cetvel'),
  ];
}

export function iletkiMenusu({ aci, taban, olcuGoster = true }: { aci: number; taban: number; olcuGoster?: boolean }): OlcmeMenuMaddesi[] {
  return [
    {
      id: 'iletki-aci',
      label: 'Açı',
      ikon: 'geo:protractor',
      submenu: [
        ...ILETKI_HAZIR_ACILAR.map((n) => ({
          id: `iletki-aci-${n}`,
          label: `${n}°`,
          radio: true,
          checked: aci === n,
          eylem: { tur: 'iletkiAci', aci: n } as OlcmeEylemi,
        })),
        {
          id: 'iletki-aci-yaz',
          label: 'Açıyı yaz…',
          separatorBefore: true,
          prompt: {
            label: 'Açı',
            unit: '°',
            initial: String(aci || ''),
            eylem: (v: number): OlcmeEylemi => ({ tur: 'iletkiAci', aci: clamp(Math.round(v), 0, 180) }),
          },
        },
      ],
    },
    { id: 'iletki-taban-yatay', label: 'Tabanı yatay yap', ikon: 'MoveHorizontal', disabled: normalizeDeg(taban) === 0, eylem: { tur: 'iletkiTaban', taban: 0 } },
    { id: 'iletki-olcu-goster', label: 'Ölçüyü göster', checked: olcuGoster, eylem: { tur: 'gosterim', anahtar: 'olcu', acik: !olcuGoster } },
    { id: 'iletki-ekle', label: 'Açıyı tuvale ekle', ikon: 'geo:angle', separatorBefore: true, disabled: aci === 0, eylem: { tur: 'iletkiAciEkle' } },
    ...ortakSon('iletki'),
  ];
}

export function gonyeMenusu({ donusSvg }: { donusSvg: number }): OlcmeMenuMaddesi[] {
  const matematik = normalizeDeg(-donusSvg);
  return [
    {
      id: 'gonye-dondur',
      label: 'Döndür',
      ikon: 'RotateCcw',
      submenu: GONYE_HAZIR_DONUSLER.map((n) => ({
        id: `gonye-dondur-${n}`,
        label: `${n}°`,
        radio: true,
        checked: matematik === n,
        eylem: { tur: 'gonyeDonus', donusSvg: normalizeDeg(-n) } as OlcmeEylemi,
      })),
    },
    ...ortakSon('gonye'),
  ];
}

export function alanModeliMenusu({
  sutun,
  satir,
  ekleVar,
  alanGoster = true,
  cevreGoster = false,
}: {
  sutun: number;
  satir: number;
  ekleVar: boolean;
  alanGoster?: boolean;
  cevreGoster?: boolean;
}): OlcmeMenuMaddesi[] {
  return [
    { id: 'alan-sutun-ekle', label: 'Sütun ekle', ikon: 'Plus', disabled: sutun >= ALAN_MAX, eylem: { tur: 'alanBoyut', sutun: Math.min(ALAN_MAX, sutun + 1), satir } },
    { id: 'alan-sutun-cikar', label: 'Sütun çıkar', ikon: 'Minus', disabled: sutun <= ALAN_MIN, eylem: { tur: 'alanBoyut', sutun: Math.max(ALAN_MIN, sutun - 1), satir } },
    { id: 'alan-satir-ekle', label: 'Satır ekle', ikon: 'Plus', separatorBefore: true, disabled: satir >= ALAN_MAX, eylem: { tur: 'alanBoyut', sutun, satir: Math.min(ALAN_MAX, satir + 1) } },
    { id: 'alan-satir-cikar', label: 'Satır çıkar', ikon: 'Minus', disabled: satir <= ALAN_MIN, eylem: { tur: 'alanBoyut', sutun, satir: Math.max(ALAN_MIN, satir - 1) } },
    {
      id: 'alan-hazir',
      label: 'Hazır boyutlar',
      ikon: 'LayoutGrid',
      separatorBefore: true,
      submenu: ALAN_HAZIR_BOYUTLAR.map(([s, r]) => ({
        id: `alan-hazir-${s}x${r}`,
        label: `${s} × ${r}`,
        radio: true,
        checked: sutun === s && satir === r,
        eylem: { tur: 'alanBoyut', sutun: s, satir: r } as OlcmeEylemi,
      })),
    },
    { id: 'alan-alan-goster', label: 'Alanı göster', separatorBefore: true, checked: alanGoster, eylem: { tur: 'gosterim', anahtar: 'alan', acik: !alanGoster } },
    { id: 'alan-cevre-goster', label: 'Çevreyi göster', checked: cevreGoster, eylem: { tur: 'gosterim', anahtar: 'cevre', acik: !cevreGoster } },
    { id: 'alan-cokgen', label: 'Çokgen olarak ekle', ikon: 'geo:rectangle', separatorBefore: true, disabled: !ekleVar, eylem: { tur: 'alanCokgenEkle' } },
    ...ortakSon('alan'),
  ];
}

// ─── Tuvale ekleme ───────────────────────────────────────────────────────────

type KimlikUret = (onEk: string) => string;

const noktaYap = (id: string, label: string, p: Point2D, color = '#2563eb'): PointObject => ({
  id,
  type: 'point',
  label,
  showLabel: true,
  x: p.x,
  y: p.y,
  color,
  visible: true,
  isIndependent: true,
  createdAt: Date.now(),
});

/** Cetvelin ölçü kenarı boyunca, 0 çentiğinden başlayan `boy` br uzunluğunda doğru parçası (2 nokta + parça). */
export function cetveldenParcaNesneleri(
  konum: Point2D,
  donusSvg: number,
  boy: number,
  etiketler: string[],
  kimlik: KimlikUret
): { nesneler: MathObject[]; aciklama: string; bas: Point2D; son: Point2D } {
  const t = rad(normalizeDeg(-donusSvg));
  const bas = { x: Number(konum.x.toFixed(2)), y: Number(konum.y.toFixed(2)) };
  const son = { x: bas.x + boy * Math.cos(t), y: bas.y + boy * Math.sin(t) };
  const [a, b] = generateNextPointLabels(etiketler, 2);
  const p1 = noktaYap(kimlik('pt'), a, bas);
  const p2 = noktaYap(kimlik('pt'), b, son);
  const label = `[${a}${b}]`;
  const parca: SegmentObject = {
    id: kimlik('seg'),
    type: 'segment',
    label,
    showLabel: true,
    startPointId: p1.id,
    endPointId: p2.id,
    color: '#0284c7',
    visible: true,
    showLength: true,
    thickness: 2.5,
    createdAt: Date.now(),
  };
  return { nesneler: [p1, p2, parca], aciklama: `Cetvelden ${label} doğru parçası eklendi (${formatTurkishNumber(boy)} br)`, bas, son };
}

/**
 * Açıölçerin ölçtüğü açı: köşe iletki merkezinde, kollar taban yönünde ve (taban + açı) yönünde,
 * `uzunluk` br boyunda. Açı aracıyla aynı yapı: 3 nokta, kolu olduğu açıyı bilen 2 parça, açı.
 */
export function iletkidenAciNesneleri(
  konum: Point2D,
  aci: number,
  taban: number,
  uzunluk: number,
  etiketler: string[],
  kimlik: KimlikUret
): { nesneler: MathObject[]; aciklama: string } {
  const kose = { x: Number(konum.x.toFixed(2)), y: Number(konum.y.toFixed(2)) };
  const b = rad(taban);
  const c = rad(taban + aci);
  const [l1, lk, l3] = generateNextPointLabels(etiketler, 3);
  const p1 = noktaYap(kimlik('pt'), l1, { x: kose.x + uzunluk * Math.cos(b), y: kose.y + uzunluk * Math.sin(b) });
  const v = noktaYap(kimlik('pt'), lk, kose);
  const p3 = noktaYap(kimlik('pt'), l3, { x: kose.x + uzunluk * Math.cos(c), y: kose.y + uzunluk * Math.sin(c) });
  const aciId = kimlik('ang');
  const kol = (uc: PointObject): SegmentObject => ({
    id: kimlik('seg'),
    type: 'segment',
    label: `[${lk}${uc.label}]`,
    showLabel: false,
    startPointId: v.id,
    endPointId: uc.id,
    color: '#f59e0b',
    visible: true,
    thickness: 2,
    armOfAngleId: aciId,
    createdAt: Date.now(),
  });
  const label = `∠${l1}${lk}${l3}`;
  const aciNesnesi: AngleObject = {
    id: aciId,
    type: 'angle',
    label,
    showLabel: true,
    point1Id: p1.id,
    vertexPointId: v.id,
    point3Id: p3.id,
    color: '#f59e0b',
    visible: true,
    showValue: true,
    createdAt: Date.now(),
  };
  return { nesneler: [p1, v, p3, kol(p1), kol(p3), aciNesnesi], aciklama: `Açıölçerden ${label} = ${aci}° açısı eklendi` };
}
