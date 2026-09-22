/**
 * Nokta adının (A, B, …) çizgilerin üstüne gelmemesi için yerleşim.
 *
 * Kullanıcı isteği (2026-09-22): "nokta harfleri çizgilerin üzerine gelmekten her zaman kaçsın".
 * Ad, noktanın çevresindeki sekiz aday yerden (sağ üst → sol üst → sağ alt → sol alt → sağ → üst →
 * sol → alt) hiçbir çizginin kesmediği İLK tercihli yere konur; böylece boş bir noktanın adı bugünkü
 * gibi sağ üstte kalır, yalnız bir çizgi adın kutusundan geçiyorsa ad başka yöne kayar. Çizgiler
 * ekran koordinatında (y aşağı) tutulur: noktadan çıkan ya da üzerinden geçen doğru parçaları,
 * doğrular, ışınlar, çokgen kenarları ve noktadan geçen çemberler.
 */
import type { CircleObject, LineObject, MathObject, Point2D, PointObject, PolygonObject, RayObject, SegmentObject } from '@/types/math';
import { commandCircleGeometry } from '@/math/commandBindings';

export interface EkranNoktasi {
  x: number;
  y: number;
}

/** Noktanın adının üstüne gelmemesi gereken çizgi (ekran koordinatı). */
export type NoktaEngeli =
  /** Noktadan çıkan ışın: birim yön ve piksel uzunluğu (doğru/ışın için Infinity). */
  | { tur: 'isin'; ux: number; uy: number; uzunluk: number }
  /** Noktadan geçen çember. */
  | { tur: 'daire'; cx: number; cy: number; r: number };

/** Ad yazısının yaklaşık kutusu (px). */
export interface AdKutusu {
  genislik: number;
  yukseklik: number;
}

export type AdYonu = 'sağ-üst' | 'sol-üst' | 'sağ-alt' | 'sol-alt' | 'sağ' | 'üst' | 'sol' | 'alt';

export interface NoktaAdiYeri {
  /** SVG <text> x ve taban çizgisi y'si */
  x: number;
  y: number;
  textAnchor: 'start' | 'middle' | 'end';
  yon: AdYonu;
}

/** Noktanın merkezi ile ad kutusunun en yakın kenarı arasındaki boşluk (px). Köşelerde 10 (eski sabit konum). */
const KOSE_BOSLUGU = 10;
const KENAR_BOSLUGU = 13;
/** Kutunun çevresine eklenen güvenlik payı (px): çizgi kalınlığı ve yazı tipi farkları için. */
const PAY = 2;
/** Yazının taban çizgisine göre yukarı (harf yüksekliği) ve aşağı (kuyruk) uzanımı, yükseklik oranı. */
const USTE = 0.78;
const ALTA = 0.22;
/** Noktanın bir çizginin "üzerinde" sayılması için ekrandaki en büyük uzaklık (px). */
const UZERINDE_ESIGI = 4;

interface Aday extends NoktaAdiYeri {
  sol: number;
  sag: number;
  ust: number;
  alt: number;
}

function aday(yon: AdYonu, x: number, y: number, textAnchor: NoktaAdiYeri['textAnchor'], kutu: AdKutusu): Aday {
  const sol = textAnchor === 'start' ? x : textAnchor === 'end' ? x - kutu.genislik : x - kutu.genislik / 2;
  return {
    yon,
    x,
    y,
    textAnchor,
    sol: sol - PAY,
    sag: sol + kutu.genislik + PAY,
    ust: y - USTE * kutu.yukseklik - PAY,
    alt: y + ALTA * kutu.yukseklik + PAY,
  };
}

/** Sekiz aday yer, tercih sırasıyla. İlk aday eski sabit konumdur (sağ üst, +10/−10). */
export function adayYerler(p: EkranNoktasi, kutu: AdKutusu): Aday[] {
  const h = kutu.yukseklik;
  return [
    aday('sağ-üst', p.x + KOSE_BOSLUGU, p.y - KOSE_BOSLUGU, 'start', kutu),
    aday('sol-üst', p.x - KOSE_BOSLUGU, p.y - KOSE_BOSLUGU, 'end', kutu),
    aday('sağ-alt', p.x + KOSE_BOSLUGU, p.y + KOSE_BOSLUGU + USTE * h, 'start', kutu),
    aday('sol-alt', p.x - KOSE_BOSLUGU, p.y + KOSE_BOSLUGU + USTE * h, 'end', kutu),
    aday('sağ', p.x + KENAR_BOSLUGU, p.y + (USTE - 0.5) * h, 'start', kutu),
    aday('üst', p.x, p.y - KENAR_BOSLUGU - ALTA * h, 'middle', kutu),
    aday('sol', p.x - KENAR_BOSLUGU, p.y + (USTE - 0.5) * h, 'end', kutu),
    aday('alt', p.x, p.y + KENAR_BOSLUGU + USTE * h, 'middle', kutu),
  ];
}

/** Noktadan çıkan ışın (ox, oy)+t·(ux, uy), 0 ≤ t ≤ uzunluk, dikdörtgeni kesiyor mu? (slab yöntemi) */
function isinKutuyuKesiyor(ox: number, oy: number, ux: number, uy: number, uzunluk: number, k: Aday): boolean {
  let tMin = 0;
  let tMax = uzunluk;
  const eksenler: Array<[number, number, number, number]> = [
    [ox, ux, k.sol, k.sag],
    [oy, uy, k.ust, k.alt],
  ];
  for (const [o, u, min, max] of eksenler) {
    if (Math.abs(u) < 1e-12) {
      if (o < min || o > max) return false;
      continue;
    }
    let t1 = (min - o) / u;
    let t2 = (max - o) / u;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/** Çember çevresi dikdörtgeni kesiyor mu? (merkeze en yakın nokta ≤ r ≤ en uzak köşe) */
function daireKutuyuKesiyor(cx: number, cy: number, r: number, k: Aday): boolean {
  const yakinX = Math.min(Math.max(cx, k.sol), k.sag);
  const yakinY = Math.min(Math.max(cy, k.ust), k.alt);
  const enYakin = Math.hypot(yakinX - cx, yakinY - cy);
  if (enYakin > r) return false;
  const enUzak = Math.max(
    Math.hypot(k.sol - cx, k.ust - cy),
    Math.hypot(k.sag - cx, k.ust - cy),
    Math.hypot(k.sol - cx, k.alt - cy),
    Math.hypot(k.sag - cx, k.alt - cy)
  );
  return enUzak >= r;
}

/**
 * Adın konulacağı yer: engel kesmeyen ilk tercihli aday; hepsi kesiliyorsa en az engelin kestiği
 * (eşitlikte tercih sırası önce gelen).
 */
export function noktaAdiYeri(p: EkranNoktasi, engeller: readonly NoktaEngeli[], kutu: AdKutusu): NoktaAdiYeri {
  const adaylar = adayYerler(p, kutu);
  if (engeller.length === 0) return secilen(adaylar[0]);
  let enIyi = adaylar[0];
  let enAz = Number.POSITIVE_INFINITY;
  for (const a of adaylar) {
    let sayi = 0;
    for (const e of engeller) {
      const kesiyor = e.tur === 'isin' ? isinKutuyuKesiyor(p.x, p.y, e.ux, e.uy, e.uzunluk, a) : daireKutuyuKesiyor(e.cx, e.cy, e.r, a);
      if (kesiyor) sayi += 1;
    }
    if (sayi === 0) return secilen(a);
    if (sayi < enAz) {
      enAz = sayi;
      enIyi = a;
    }
  }
  return secilen(enIyi);
}

function secilen(a: Aday): NoktaAdiYeri {
  return { x: a.x, y: a.y, textAnchor: a.textAnchor, yon: a.yon };
}

interface Cizgi {
  aId: string;
  bId: string;
  a: EkranNoktasi;
  b: EkranNoktasi;
  /** a ucundan öteye sonsuz uzar (doğru) */
  basSonsuz: boolean;
  /** b ucundan öteye sonsuz uzar (doğru, ışın) */
  sonSonsuz: boolean;
}

/**
 * Sahnedeki her nokta için adın kaçınacağı çizgiler. `ekran` dünya → ekran dönüşümüdür; sonuç
 * ekran koordinatında olduğu için yakınlaştırma/kaydırma değiştikçe yeniden hesaplanmalıdır.
 * Görünmez nesneler sayılmaz. Bir çizgiyi tanımlamayan ama üzerinde duran noktalar da (ör. AB
 * üzerine bağlanmış P) o çizgiyi engel olarak alır.
 */
export function noktaEngelleri(
  objects: readonly MathObject[],
  pointsById: ReadonlyMap<string, PointObject>,
  ekran: (p: Point2D) => EkranNoktasi
): Map<string, NoktaEngeli[]> {
  const sonuc = new Map<string, NoktaEngeli[]>();
  const ekle = (id: string, e: NoktaEngeli) => {
    const liste = sonuc.get(id);
    if (liste) liste.push(e);
    else sonuc.set(id, [e]);
  };

  const cizgiler: Cizgi[] = [];
  const daireler: Array<{ cx: number; cy: number; r: number }> = [];
  const cizgiEkle = (aId: string, bId: string, basSonsuz: boolean, sonSonsuz: boolean) => {
    const a = pointsById.get(aId);
    const b = pointsById.get(bId);
    if (!a || !b || aId === bId) return;
    cizgiler.push({ aId, bId, a: ekran(a), b: ekran(b), basSonsuz, sonSonsuz });
  };

  for (const obj of objects) {
    if (obj.visible === false) continue;
    switch (obj.type) {
      case 'segment': {
        const s = obj as SegmentObject;
        cizgiEkle(s.startPointId, s.endPointId, false, false);
        break;
      }
      case 'line': {
        const l = obj as LineObject;
        cizgiEkle(l.point1Id, l.point2Id, true, true);
        break;
      }
      case 'ray': {
        const r = obj as RayObject;
        cizgiEkle(r.startPointId, r.throughPointId, false, true);
        break;
      }
      case 'polygon': {
        const ids = (obj as PolygonObject).pointIds;
        if (ids.length === 2) cizgiEkle(ids[0], ids[1], false, false);
        else for (let i = 0; i < ids.length; i++) cizgiEkle(ids[i], ids[(i + 1) % ids.length], false, false);
        break;
      }
      case 'circle': {
        try {
          const geo = commandCircleGeometry(obj as CircleObject, (id) => pointsById.get(id) as PointObject);
          const merkez = ekran(geo.center);
          const kenar = ekran({ x: geo.center.x + geo.radius, y: geo.center.y });
          const r = Math.hypot(kenar.x - merkez.x, kenar.y - merkez.y);
          if (r > 1) daireler.push({ cx: merkez.x, cy: merkez.y, r });
        } catch {
          /* tanımsız çember (eksik ya da doğrusal noktalar): engel sayılmaz */
        }
        break;
      }
      default:
        break;
    }
  }

  for (const c of cizgiler) {
    const dx = c.b.x - c.a.x;
    const dy = c.b.y - c.a.y;
    const boy = Math.hypot(dx, dy);
    if (boy < 1e-9) continue;
    const ux = dx / boy;
    const uy = dy / boy;
    // Uç noktalar: çizgi yönünde (ve sonsuzsa ters yönde de) ışın
    ekle(c.aId, { tur: 'isin', ux, uy, uzunluk: c.sonSonsuz ? Infinity : boy });
    if (c.basSonsuz) ekle(c.aId, { tur: 'isin', ux: -ux, uy: -uy, uzunluk: Infinity });
    ekle(c.bId, { tur: 'isin', ux: -ux, uy: -uy, uzunluk: c.basSonsuz ? Infinity : boy });
    if (c.sonSonsuz) ekle(c.bId, { tur: 'isin', ux, uy, uzunluk: Infinity });
  }

  // Çizgiyi tanımlamayan ama üzerinde duran noktalar
  for (const [id, nokta] of pointsById) {
    if (nokta.visible === false) continue;
    const p = ekran(nokta);
    for (const c of cizgiler) {
      if (c.aId === id || c.bId === id) continue;
      const dx = c.b.x - c.a.x;
      const dy = c.b.y - c.a.y;
      const boy = Math.hypot(dx, dy);
      if (boy < 1e-9) continue;
      const ux = dx / boy;
      const uy = dy / boy;
      const t = (p.x - c.a.x) * ux + (p.y - c.a.y) * uy;
      const dik = Math.abs((p.x - c.a.x) * uy - (p.y - c.a.y) * ux);
      if (dik > UZERINDE_ESIGI) continue;
      if (t < (c.basSonsuz ? -Infinity : -UZERINDE_ESIGI) || t > (c.sonSonsuz ? Infinity : boy + UZERINDE_ESIGI)) continue;
      const ileri = c.sonSonsuz ? Infinity : Math.max(0, boy - t);
      const geri = c.basSonsuz ? Infinity : Math.max(0, t);
      if (ileri > 0) ekle(id, { tur: 'isin', ux, uy, uzunluk: ileri });
      if (geri > 0) ekle(id, { tur: 'isin', ux: -ux, uy: -uy, uzunluk: geri });
    }
    for (const d of daireler) {
      if (Math.abs(Math.hypot(p.x - d.cx, p.y - d.cy) - d.r) <= UZERINDE_ESIGI) ekle(id, { tur: 'daire', ...d });
    }
  }

  return sonuc;
}
