import type { LevelId } from '@/types/curriculum';
import type { ViewportTransform } from '@/types/math';
import { DEFAULT_STYLE_SETTINGS } from '@/types/workspace';
import type { Camera3D } from '@/types/workspace3d';
import { parseProjectFile, type ProjectFile } from './projectFile';

/**
 * Çizimi bağlantıyla paylaşma (Çizim Stüdyosu > Dosya > Bağlantıyla paylaş).
 *
 * Site statiktir (EBA CDN, GitHub Pages): sunucu yok, çizimin tamamı bağlantının hash'inde taşınır.
 *   <taban>#/studyo/paylas/<kademe>/<veri>
 * - taban: bağlantının oluşturulduğu sayfa (origin + pathname); CDN'de de Pages'te de kendi adresi.
 * - kademe: ilkokul | ortaokul | lise. Hash'te açık yazılır: sınıf açılışı oturumu çizim çözülmeden
 *   (çözme eşzamansızdır) açabilsin, oturum ekranı hiç görünmesin.
 * - veri: biçim harfi + base64url. 'z' = deflate-raw ile sıkıştırılmış JSON (CompressionStream),
 *   'j' = sıkıştırılmamış JSON (CompressionStream olmayan tarayıcı; bağlantı uzar ama açılır).
 * JSON: { s: 1, boyut: '2D' | '3D', proje } — proje Dosya > Kaydet ile aynı biçimdir (projectFile.ts) ve
 * açılırken parseProjectFile ile baştan doğrulanır; bozuk bağlantı canlı belgeye kısmen uygulanmaz.
 */

export const PAYLASIM_SURUMU = 1;
/** Bu uzunluğun üstündeki bağlantı bazı ileti uygulamalarında kesilebilir: kullanıcı uyarılır. */
export const PAYLASIM_UYARI_UZUNLUGU = 8_000;
/** Tarayıcıların adres sınırına yakın (Chrome 2 MB): bu uzunluktaki bağlantı verilmez, dosya önerilir. */
export const PAYLASIM_EN_UZUN = 1_000_000;
/** Açılan verinin üst sınırı (sıkıştırma bombasına karşı) */
const ACIK_VERI_SINIRI = 32 * 1024 * 1024;

const KADEMELER: readonly LevelId[] = ['ilkokul', 'ortaokul', 'lise'];
const ONEK = 'studyo/paylas/';

export type CizimBoyutu = '2D' | '3D';

export interface PaylasilanCizim {
  kademe: LevelId;
  /** Paylaşılırken açık olan boyut (2B / 3B) */
  boyut: CizimBoyutu;
  proje: ProjectFile;
}

/** Hash'ten okunan paylaşım: kademe tanınmıyorsa null (bozuk bağlantı), veri henüz çözülmedi. */
export interface PaylasimAdresi {
  kademe: LevelId | null;
  veri: string;
}

/** Kullanıcıya gösterilecek ileti taşıyan hata (bozuk, eksik ya da desteklenmeyen bağlantı). */
export class PaylasimHatasi extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaylasimHatasi';
  }
}

const BOZUK = 'Paylaşılan çizim açılamadı: bağlantı eksik ya da bozuk. Bağlantının tamamını kopyaladığınızdan emin olun.';

function base64url(bytes: Uint8Array): string {
  let ikili = '';
  for (let i = 0; i < bytes.length; i += 0x2000) ikili += String.fromCharCode(...bytes.subarray(i, i + 0x2000));
  return btoa(ikili).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlCoz(metin: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(metin) || metin.length % 4 === 1) throw new PaylasimHatasi(BOZUK);
  const ikili = atob(metin.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (metin.length % 4)) % 4));
  const bytes = new Uint8Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) bytes[i] = ikili.charCodeAt(i);
  return bytes;
}

function sikistirmaVar(): boolean {
  return typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
}

async function akisiOku(akis: ReadableStream<Uint8Array>, sinir = Infinity): Promise<Uint8Array> {
  const okuyucu = akis.getReader();
  const parcalar: Uint8Array[] = [];
  let toplam = 0;
  for (;;) {
    const { done, value } = await okuyucu.read();
    if (done) break;
    toplam += value.length;
    if (toplam > sinir) {
      await okuyucu.cancel().catch(() => {});
      throw new PaylasimHatasi('Paylaşılan çizim açılamadı: bağlantıdaki veri beklenenden çok büyük.');
    }
    parcalar.push(value);
  }
  const sonuc = new Uint8Array(toplam);
  let yer = 0;
  for (const p of parcalar) { sonuc.set(p, yer); yer += p.length; }
  return sonuc;
}

function akisla(bytes: Uint8Array, donusum: GenericTransformStream): ReadableStream<Uint8Array> {
  return new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(donusum as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
}

/** Ondalıklar 12 anlamlı basamağa kırpılır: çizimde görünmez (bağımlı noktalar zaten yeniden hesaplanır), veri kısalır. */
function sayilariKirp(deger: unknown): unknown {
  if (typeof deger === 'number') return Number.isInteger(deger) ? deger : Number(deger.toPrecision(12));
  if (Array.isArray(deger)) return deger.map(sayilariKirp);
  if (deger && typeof deger === 'object') {
    const sonuc: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(deger)) if (v !== undefined) sonuc[k] = sayilariKirp(v);
    return sonuc;
  }
  return deger;
}

/** 0 → a, 25 → z, 26 → aa … (rakamla başlamaz; createId kimlikleriyle — 'pt-…' — çakışmaz) */
function takmaAd(sira: number): string {
  let ad = '';
  for (let n = sira; ; n = Math.floor(n / 26) - 1) {
    ad = String.fromCharCode(97 + (n % 26)) + ad;
    if (n < 26) return ad;
  }
}

/**
 * Kimlik başvurusu taşıyan alan mı? Doğrulayıcının (projectFile.references) kuralıyla aynı: `id`, `…Id`, `…Ids`, dependsOn;
 * sliderBindings'in değerleri de kaydırıcı kimliğidir. Etiket anahtarları (labelOffsets / labelTexts / labelAnchors) kimlik
 * değil tür adıdır ('length', 'edge0'), dokunulmaz.
 */
const kimlikAlaniMi = (anahtar: string, ust: string) => anahtar === 'id' || /Ids?$/.test(anahtar) || anahtar === 'dependsOn' || ust === 'sliderBindings';

function kimlikleriDegistir(deger: unknown, adlar: Map<string, string>, anahtar = '', ust = ''): unknown {
  if (typeof deger === 'string') return kimlikAlaniMi(anahtar, ust) ? adlar.get(deger) ?? deger : deger;
  if (Array.isArray(deger)) return deger.map((v) => kimlikleriDegistir(v, adlar, anahtar, ust));
  if (deger && typeof deger === 'object') {
    return Object.fromEntries(Object.entries(deger).map(([k, v]) => [k, kimlikleriDegistir(v, adlar, k, anahtar)]));
  }
  return deger;
}

/** Alıcıdaki varsayılanlar: bunlara eşit görünüm alanları ve kamera bağlantıya yazılmaz (applyProjectMetadata tamamlar). */
export interface PaylasimVarsayilanlari {
  gorunum?: Partial<ViewportTransform>;
  kamera?: Camera3D;
}

const esit = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Bağlantı kısa kalsın diye proje, açılışta aynı çizimi verecek biçimde küçültülür:
 * - kimlikler kısa takma adlara çevrilir (createId kimlikleri ~20 harftir ve her başvuruda yinelenir);
 * - parseProjectFile'ın kendiliğinden tamamladığı nesne varsayılanları (mavi renk, görünür, adı açık) yazılmaz;
 * - createdAt yalnız sıra bildirir: en eskiden farka çevrilir;
 * - görünüm/stil/kamera varsayılana eşitse yazılmaz; tuvalin piksel boyutu alıcının penceresinden gelir;
 * - ondalıklar kırpılır (görünüm yakınlığı ve kaydırması 0,01 piksele).
 */
export function paylasimIcinKucult(proje: ProjectFile, varsayilanlar: PaylasimVarsayilanlari = {}): ProjectFile {
  const adlar = new Map<string, string>();
  for (const o of [...proje.objects, ...proje.solids]) if (!adlar.has(o.id)) adlar.set(o.id, takmaAd(adlar.size));
  const enEski = proje.objects.reduce((m, o) => Math.min(m, Number.isFinite(o.createdAt) ? o.createdAt : m), Infinity);
  const objects = proje.objects.map((nesne) => {
    const o: Record<string, unknown> = { ...nesne };
    // Ad kimliğe eşitse açılışta kimlikten tamamlanır; kimlik takma ada döndüğü için ad yalnız ona eşitse düşer
    if (o.label === adlar.get(nesne.id)) delete o.label;
    if (o.color === '#2563eb') delete o.color;
    if (o.visible === true) delete o.visible;
    if (o.showLabel === true) delete o.showLabel;
    if (o.selected === false) delete o.selected;
    if (Number.isFinite(enEski) && typeof o.createdAt === 'number') o.createdAt -= enEski;
    if (o.createdAt === 0) delete o.createdAt;
    return o;
  });
  const out: Record<string, unknown> = { ...proje, objects };
  if (proje.viewport) {
    const viewport: Record<string, unknown> = { ...proje.viewport };
    delete viewport.width;
    delete viewport.height;
    for (const k of ['zoom', 'panX', 'panY']) if (typeof viewport[k] === 'number') viewport[k] = Math.round((viewport[k] as number) * 100) / 100;
    for (const [k, v] of Object.entries(varsayilanlar.gorunum ?? {})) if (k in viewport && esit(viewport[k], v)) delete viewport[k];
    if (Object.keys(viewport).length) out.viewport = viewport; else delete out.viewport;
  }
  if (proje.styleSettings && esit({ ...DEFAULT_STYLE_SETTINGS, ...proje.styleSettings }, DEFAULT_STYLE_SETTINGS)) delete out.styleSettings;
  if (proje.camera3D && varsayilanlar.kamera && esit(proje.camera3D, varsayilanlar.kamera)) delete out.camera3D;
  return sayilariKirp(kimlikleriDegistir(out, adlar)) as ProjectFile;
}

/** Paylaşım verisini (biçim harfi + base64url) üretir. `sikistir: false` sıkıştırmasız biçimi zorlar (deneme). */
export async function paylasimVerisiOlustur(
  cizim: Omit<PaylasilanCizim, 'kademe'> & { varsayilanlar?: PaylasimVarsayilanlari },
  sikistir = sikistirmaVar(),
): Promise<string> {
  const json = JSON.stringify({ s: PAYLASIM_SURUMU, boyut: cizim.boyut, proje: paylasimIcinKucult(cizim.proje, cizim.varsayilanlar) });
  const bytes = new TextEncoder().encode(json);
  if (!sikistir) return `j${base64url(bytes)}`;
  return `z${base64url(await akisiOku(akisla(bytes, new CompressionStream('deflate-raw'))))}`;
}

/** Bağlantının tamamı: bulunduğu sayfanın adresi (origin + pathname) + paylaşım hash'i. */
export function paylasimBaglantisi(kademe: LevelId, veri: string, konum: Pick<Location, 'origin' | 'pathname'> = window.location): string {
  return `${konum.origin}${konum.pathname}#/${ONEK}${kademe}/${veri}`;
}

/** Hash bir paylaşım bağlantısı mı? Değilse null; kademe tanınmıyorsa kademe: null. */
export function paylasimAdresiniCoz(hash: string): PaylasimAdresi | null {
  const yol = (hash || '').replace(/^#\/?/, '');
  if (!yol.startsWith(ONEK) && yol !== ONEK.slice(0, -1)) return null;
  const [kademe = '', ...kalan] = yol.slice(ONEK.length).split('/');
  return {
    kademe: (KADEMELER as readonly string[]).includes(kademe) ? kademe as LevelId : null,
    veri: kalan.join('/'),
  };
}

/** Veriyi açar ve proje dosyası olarak doğrular. Her sorunda anlaşılır iletili PaylasimHatasi fırlatır. */
export async function paylasimVerisiniCoz(veri: string): Promise<Omit<PaylasilanCizim, 'kademe'>> {
  const bicim = veri.charAt(0);
  if (bicim !== 'z' && bicim !== 'j') {
    throw new PaylasimHatasi(veri ? 'Paylaşılan çizim açılamadı: bu bağlantı tanınmayan bir biçimde (eski ya da daha yeni bir sürümle oluşturulmuş olabilir).' : BOZUK);
  }
  let json: string;
  try {
    let bytes = base64urlCoz(veri.slice(1));
    if (bicim === 'z') {
      if (!sikistirmaVar()) throw new PaylasimHatasi('Paylaşılan çizim bu tarayıcıda açılamıyor: tarayıcı sıkıştırılmış veriyi desteklemiyor. Tarayıcınızı güncelleyip yeniden deneyin.');
      bytes = await akisiOku(akisla(bytes, new DecompressionStream('deflate-raw')), ACIK_VERI_SINIRI);
    } else if (bytes.length > ACIK_VERI_SINIRI) throw new PaylasimHatasi(BOZUK);
    json = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (hata) {
    throw hata instanceof PaylasimHatasi ? hata : new PaylasimHatasi(BOZUK);
  }
  let paket: unknown;
  try { paket = JSON.parse(json); } catch { throw new PaylasimHatasi(BOZUK); }
  if (!paket || typeof paket !== 'object' || Array.isArray(paket)) throw new PaylasimHatasi(BOZUK);
  const { s, boyut, proje } = paket as Record<string, unknown>;
  if (s !== PAYLASIM_SURUMU) {
    throw new PaylasimHatasi(typeof s === 'number' && s > PAYLASIM_SURUMU
      ? 'Paylaşılan çizim açılamadı: bağlantı daha yeni bir sürümle oluşturulmuş. Sayfayı yenileyip yeniden deneyin.'
      : 'Paylaşılan çizim açılamadı: bu bağlantı tanınmayan bir biçimde (eski ya da daha yeni bir sürümle oluşturulmuş olabilir).');
  }
  try {
    return { boyut: boyut === '3D' ? '3D' : '2D', proje: parseProjectFile(proje) };
  } catch (hata) {
    // parseProjectFile iletisi "Dosya açılamadı: <neden>. Mevcut çalışma korundu." biçimindedir
    const neden = hata instanceof Error ? hata.message.replace(/^Dosya açılamadı:\s*/, '').replace(/\.\s*Mevcut çalışma korundu\.$/, '') : '';
    throw new PaylasimHatasi(`Paylaşılan çizim açılamadı${neden ? `: ${neden}` : ''}. Kendi çiziminiz korundu.`);
  }
}

/**
 * Sayfa açılırken yakalanan paylaşım. CurriculumProvider hash'i '#/studyo' olarak sadeleştirmeden önce yakalar;
 * sınıf ekranı (SinifEkrani) bağlanınca alır ve bırakır (sonraki stüdyo açılışları olağan akışla gelir).
 */
let bekleyen: PaylasimAdresi | null = null;

/** Hash bir paylaşım bağlantısıysa saklar. Paylaşım değilse önceki yakalamaya dokunmaz (StrictMode ikinci geçişi). */
export function paylasimiYakala(hash: string): boolean {
  const adres = paylasimAdresiniCoz(hash);
  if (adres) bekleyen = adres;
  return adres !== null;
}

export function bekleyenPaylasim(): PaylasimAdresi | null {
  return bekleyen;
}

export function paylasimiBirak(): void {
  bekleyen = null;
}
