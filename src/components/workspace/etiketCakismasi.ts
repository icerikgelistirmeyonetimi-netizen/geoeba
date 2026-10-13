/**
 * Etiketlerin birbirini örtmemesi için küçük, saf yerleşim kuralları (alan uzmanı, atölye inceleme 4. tur, ortaokul).
 *
 * - Doğru denklemi ('y = -0,25x + 1') ikinci tanım noktasının hemen sağ üstüne sabit konuyordu; oradaki nokta
 *   harfiyle (B, ya da orta nokta) üst üste biniyordu. Şimdi doğru boyunca aday yerler denenir; nokta adlarının
 *   bölgelerine ve önceki denklemlere değmeyen ilk yer seçilir.
 * - Daire dilimi / yay ölçüleri yayın orta doğrultusunda dizilir; başka bir şeklin alan/çevre etiketleri oradaysa
 *   yığın onların altına karışıyordu. Yığın, çakışma kalmayana dek kendi doğrultusunda dışa itilir.
 * - Bütün kutular ekran pikselidir (y aşağı).
 */
import { kutularCakisir, type Kutu } from '@/math/yazimDuzeni';

export interface Nokta {
  x: number;
  y: number;
}
export interface Boyut {
  genislik: number;
  yukseklik: number;
}

const merkezliKutu = (m: Nokta, b: Boyut): Kutu => ({
  x0: m.x - b.genislik / 2,
  y0: m.y - b.yukseklik / 2,
  x1: m.x + b.genislik / 2,
  y1: m.y + b.yukseklik / 2,
});

/** İki kutunun örtüşen alanı (px²). */
function ortusme(a: Kutu, b: Kutu): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Nokta adının durabileceği bölge: ad noktanın çevresindeki sekiz yerden birine konur (noktaAdi.ts), bu yüzden
 * bölge noktayı her yandan `ad + köşe boşluğu` kadar sarar.
 */
export function noktaAdiBolgesi(p: Nokta, ad: Boyut, bosluk = 10): Kutu {
  const yatay = bosluk + ad.genislik + 2;
  const dikey = bosluk + ad.yukseklik;
  return { x0: p.x - yatay, y0: p.y - dikey, x1: p.x + yatay, y1: p.y + dikey };
}

export interface DenklemYerlesimi {
  /** Doğrunun ekrandaki iki tanım noktası (a = point1, b = point2) */
  a: Nokta;
  b: Nokta;
  /** Yazı kutusunun ekran boyutu */
  boyut: Boyut;
  /** Kaçınılacak kutular (nokta adı bölgeleri, daha önce yerleşmiş denklemler…) */
  engeller: readonly Kutu[];
  /** Görünen tuval (taşan aday ancak başka yer kalmazsa seçilir) */
  tuval?: { genislik: number; yukseklik: number };
  /** Ölçek (yazı alt sınırı / yakınlık): aralıklar bununla büyür */
  olcek?: number;
}

/** Eski sabit yer: ikinci noktanın sağ üstü (12 px sağ, 8 px üst). Boş ise yazı hiç oynamaz. */
export const denklemEskiYeri = (b: Nokta, boyut: Boyut, olcek = 1): Nokta => ({
  x: b.x + 12 * olcek + boyut.genislik / 2,
  y: b.y - 8 * olcek - boyut.yukseklik / 2,
});

/**
 * Denklem yazısının merkezi. Adaylar sırasıyla: eski yer, ikinci noktanın ötesinde doğru boyunca (iki yanda),
 * birinci noktanın ötesinde, iki noktanın ortasında. Hiçbir engele değmeyen ve tuvalden taşmayan ilk aday seçilir;
 * yoksa en az örtüşen.
 */
export function denklemEtiketiMerkezi(g: DenklemYerlesimi): Nokta {
  const olcek = g.olcek ?? 1;
  const { a, b, boyut } = g;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const boy = Math.hypot(dx, dy) || 1;
  const ux = dx / boy;
  const uy = dy / boy;
  // Ekranda yukarı bakan normal (y aşağı): yazı önce doğrunun üstüne konur
  let nx = -uy;
  let ny = ux;
  if (ny > 0 || (Math.abs(ny) < 1e-9 && nx < 0)) {
    nx = -nx;
    ny = -ny;
  }
  // Kutunun doğruya dik yarı kalınlığı: döndürülmeyen kutu her eğimde çizgiden ayrı dursun
  const dikPay = Math.abs(nx) * boyut.genislik / 2 + Math.abs(ny) * boyut.yukseklik / 2 + 8 * olcek;
  const boyuncaPay = Math.abs(ux) * boyut.genislik / 2 + Math.abs(uy) * boyut.yukseklik / 2;
  const adaylar: Nokta[] = [denklemEskiYeri(b, boyut, olcek)];
  const yer = (p: Nokta, yon: 1 | -1, uzaklik: number, yan: 1 | -1): Nokta => ({
    x: p.x + yon * ux * (uzaklik + boyuncaPay) + yan * nx * dikPay,
    y: p.y + yon * uy * (uzaklik + boyuncaPay) + yan * ny * dikPay,
  });
  for (const uzaklik of [28, 56, 96]) {
    adaylar.push(yer(b, 1, uzaklik * olcek, 1), yer(b, 1, uzaklik * olcek, -1));
  }
  for (const uzaklik of [28, 56]) {
    adaylar.push(yer(a, -1, uzaklik * olcek, 1), yer(a, -1, uzaklik * olcek, -1));
  }
  const orta = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  adaylar.push(yer(orta, 1, 0, 1), yer(orta, 1, 0, -1));

  const tasar = (k: Kutu) =>
    !!g.tuval && (k.x0 < 0 || k.y0 < 0 || k.x1 > g.tuval.genislik || k.y1 > g.tuval.yukseklik);
  let enIyi = adaylar[0];
  let enAz = Number.POSITIVE_INFINITY;
  for (const aday of adaylar) {
    const kutu = merkezliKutu(aday, boyut);
    const cakisma = g.engeller.reduce((t, e) => t + (kutularCakisir(kutu, e, 2) ? Math.max(1, ortusme(kutu, e)) : 0), 0);
    if (cakisma === 0 && !tasar(kutu)) return aday;
    const puan = cakisma + (tasar(kutu) ? 1e6 : 0);
    if (puan < enAz) {
      enAz = puan;
      enIyi = aday;
    }
  }
  return enIyi;
}

/**
 * Bir yığının (aynı doğrultuda dizilmiş kutular) dışa ne kadar itilmesi gerektiği: kutular `yon` birim
 * vektörü boyunca `adim` px adımlarla kaydırılır; hiçbiri engele değmeyince o kayma döner (en çok `enCok`).
 * Çakışma yoksa 0; hiçbir kaydırma çakışmayı gidermiyorsa null (çağıran başka bir doğrultu dener).
 */
export function yiginKaymasi(
  kutular: readonly Kutu[], engeller: readonly Kutu[], yon: Nokta, adim = 8, enCok = 160,
): number | null {
  if (!kutular.length || !engeller.length) return 0;
  const cakisir = (k: number) =>
    kutular.some((kutu) => {
      const kayik = { x0: kutu.x0 + yon.x * k, y0: kutu.y0 + yon.y * k, x1: kutu.x1 + yon.x * k, y1: kutu.y1 + yon.y * k };
      return engeller.some((e) => kutularCakisir(kayik, e, 2));
    });
  if (!cakisir(0)) return 0;
  for (let k = adim; k <= enCok; k += adim) if (!cakisir(k)) return k;
  return null;
}

/** Merkezi ve ölçüsü verilen kutu (ölçü × ölçek). */
export const olcekliKutu = (m: Nokta, b: Boyut, olcek = 1): Kutu =>
  merkezliKutu(m, { genislik: b.genislik * olcek, yukseklik: b.yukseklik * olcek });

/** Yığın adayı: kutuları (kaydırmasız) ve dışa itme doğrultusu. */
export interface YiginAdayi {
  kutular: readonly Kutu[];
  yon: Nokta;
}

/**
 * Şekle en yakın çakışmasız yığın yeri: önce itmesiz bütün adaylar (sırayla), sonra `adim` px itmeyle hepsi …
 * (en çok `enCok`). Böylece etiket uzağa itilmeden önce aynı şeklin başka bir doğrultusu denenir. Hiçbiri
 * olmazsa null.
 */
export function yiginYeriSec(
  adaylar: readonly YiginAdayi[], engeller: readonly Kutu[], adim = 8, enCok = 24,
): { sira: number; kayma: number } | null {
  if (!adaylar.length) return null;
  if (!engeller.length) return { sira: 0, kayma: 0 };
  for (let k = 0; k <= enCok; k += adim) {
    for (let i = 0; i < adaylar.length; i++) {
      const { kutular, yon } = adaylar[i];
      const cakisir = kutular.some((kutu) => {
        const kayik = { x0: kutu.x0 + yon.x * k, y0: kutu.y0 + yon.y * k, x1: kutu.x1 + yon.x * k, y1: kutu.y1 + yon.y * k };
        return engeller.some((e) => kutularCakisir(kayik, e, 2));
      });
      if (!cakisir) return { sira: i, kayma: k };
    }
  }
  return null;
}
