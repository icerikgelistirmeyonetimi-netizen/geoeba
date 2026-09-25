/**
 * Nokta adının (A, B, …) çizgilerin üstüne gelmemesi için yerleşim.
 *
 * Kullanıcı isteği (2026-09-22): "nokta harfleri çizgilerin üzerine gelmekten her zaman kaçsın".
 * Ad, noktanın çevresindeki sekiz aday yerden birine konur. Sağ üst (EV) çizgiye değmiyorsa ad orada
 * kalır; değiyorsa adaylar PUANLANIR (boşluk, kolların arasındaki en geniş açıklık, tercih sırası) ve
 * şekil sürüklenirken bir önceki yer hâlâ rahatsa ad yerinden oynamaz (2026-09-25: "bazen çok saçma
 * sapan konumlara atıyor kendini" — eski kural kıl payı kurtulan İLK yeri seçiyordu). Çizgiler
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

// ------------------------------------------------------------------ uzaklıklar (kesişme yoksa)

const kis = (v: number, alt: number, ust: number) => Math.min(Math.max(v, alt), ust);

/** Noktanın doğru parçasına uzaklığı (px). */
function noktaParcayaUzaklik(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const kare = dx * dx + dy * dy;
  const t = kare < 1e-12 ? 0 : kis(((px - ax) * dx + (py - ay) * dy) / kare, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** KESİŞMEYEN iki doğru parçasının en kısa uzaklığı: dört uç–parça uzaklığının en küçüğü. */
function parcaParcayaUzaklik(
  ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number,
): number {
  return Math.min(
    noktaParcayaUzaklik(ax, ay, cx, cy, dx, dy),
    noktaParcayaUzaklik(bx, by, cx, cy, dx, dy),
    noktaParcayaUzaklik(cx, cy, ax, ay, bx, by),
    noktaParcayaUzaklik(dx, dy, ax, ay, bx, by),
  );
}

/** Sonsuz ışın uzaklık hesabında bu boyda bir parça sayılır (ekranın birkaç katı yeter). */
const SONSUZ_BOY = 4000;

/** Kesişmeyen ışın ile ad kutusu arasındaki en kısa uzaklık (px). */
function isinKutuyaUzaklik(p: EkranNoktasi, e: Extract<NoktaEngeli, { tur: 'isin' }>, k: Aday): number {
  const boy = Number.isFinite(e.uzunluk) ? e.uzunluk : SONSUZ_BOY;
  const bx = p.x + e.ux * boy, by = p.y + e.uy * boy;
  const kenarlar: Array<[number, number, number, number]> = [
    [k.sol, k.ust, k.sag, k.ust], [k.sag, k.ust, k.sag, k.alt],
    [k.sag, k.alt, k.sol, k.alt], [k.sol, k.alt, k.sol, k.ust],
  ];
  let en = Number.POSITIVE_INFINITY;
  for (const [x1, y1, x2, y2] of kenarlar) en = Math.min(en, parcaParcayaUzaklik(p.x, p.y, bx, by, x1, y1, x2, y2));
  return en;
}

/** Kesişmeyen çember ile ad kutusu arasındaki en kısa uzaklık (px). */
function daireKutuyaUzaklik(e: Extract<NoktaEngeli, { tur: 'daire' }>, k: Aday): number {
  const yakinX = kis(e.cx, k.sol, k.sag), yakinY = kis(e.cy, k.ust, k.alt);
  const enYakin = Math.hypot(yakinX - e.cx, yakinY - e.cy);
  if (enYakin > e.r) return enYakin - e.r;
  const enUzak = Math.max(
    Math.hypot(k.sol - e.cx, k.ust - e.cy), Math.hypot(k.sag - e.cx, k.ust - e.cy),
    Math.hypot(k.sol - e.cx, k.alt - e.cy), Math.hypot(k.sag - e.cx, k.alt - e.cy),
  );
  return Math.max(0, e.r - enUzak);
}

// ------------------------------------------------------------------ puanlama

/** Kesişme başına ceza: kesişmeyen bir aday her zaman kesişen bir adayı yener. */
const KESISME_CEZASI = 1000;
/** Boşluk (px) başına puan ve sayılan en büyük boşluk: "kıl payı kurtulan" yer bol boşluklu yeri yenmesin. */
const BOSLUK_AGIRLIGI = 0.8;
const BOSLUK_TAVANI = 12;
/** Kolların arasındaki EN GENİŞ açıklığa hizalanma puanı (ders kitabı kuralı: ad şeklin dışında durur). */
const ACIKLIK_AGIRLIGI = 9;
/** Bir önceki yön, eşdeğer bir adaya bu kadar üstün tutulur: şekil sürüklenirken ad oradan oraya zıplamasın. */
export const SURUKLEME_PAYI = 4;
/** Tercih sırası yalnız berabereliği bozar (boş noktada ad yine sağ üstte kalır). */
const SIRA_BONUSU = [3, 2.6, 2.2, 1.8, 1.4, 1, 0.6, 0.2];
/** Ad bulunduğu yerde bu kadar boşlukla (px) kalır: çizgiye DEĞMİYORSA yerinden oynamaz. */
const EVDE_KALMA_BOSLUGU = 1;
/** Başka yere gitmiş ad sağ üste ancak bu kadar boşluk (px) varsa döner: sınırda gidip gelmesin. */
const EVE_DONUS_BOSLUGU = 6;

/**
 * Kolların arasındaki en geniş açıklığın ORTA yönü (ekran koordinatı). Tek kol varsa karşı yön,
 * hiç kol yoksa null. Ad bu yöne konunca şeklin dışında ve kollardan en uzak yerde durur.
 */
export function aciklikYonu(engeller: readonly NoktaEngeli[], p?: EkranNoktasi): { ux: number; uy: number } | null {
  const acilar = engeller.filter((e): e is Extract<NoktaEngeli, { tur: 'isin' }> => e.tur === 'isin')
    .map((e) => Math.atan2(e.uy, e.ux))
    .sort((a, b) => a - b);
  if (!acilar.length) {
    // Yalnız çemberin üzerindeki nokta: ad çemberin DIŞINA (merkezden noktaya doğru) konur
    if (!p) return null;
    let x = 0, y = 0;
    for (const e of engeller) {
      if (e.tur !== 'daire') continue;
      const boy = Math.hypot(p.x - e.cx, p.y - e.cy);
      if (boy > 1e-9) { x += (p.x - e.cx) / boy; y += (p.y - e.cy) / boy; }
    }
    const boy = Math.hypot(x, y);
    return boy > 1e-9 ? { ux: x / boy, uy: y / boy } : null;
  }
  let enGenis = -1, yon = 0;
  for (let i = 0; i < acilar.length; i++) {
    const bas = acilar[i];
    const son = i === acilar.length - 1 ? acilar[0] + 2 * Math.PI : acilar[i + 1];
    const bosluk = son - bas;
    if (bosluk > enGenis) { enGenis = bosluk; yon = bas + bosluk / 2; }
  }
  return { ux: Math.cos(yon), uy: Math.sin(yon) };
}

/** Bir adayın puanı ve kesişme sayısı (sınama ve ayıklama için dışa açık). */
export function adayPuani(
  p: EkranNoktasi, engeller: readonly NoktaEngeli[], a: Aday, sira: number,
  aciklik: { ux: number; uy: number } | null, onceki?: AdYonu,
): { puan: number; kesisme: number; bosluk: number } {
  let kesisme = 0;
  let bosluk = Number.POSITIVE_INFINITY;
  for (const e of engeller) {
    if (e.tur === 'isin') {
      if (isinKutuyuKesiyor(p.x, p.y, e.ux, e.uy, e.uzunluk, a)) { kesisme += 1; bosluk = 0; continue; }
      if (kesisme === 0) bosluk = Math.min(bosluk, isinKutuyaUzaklik(p, e, a));
    } else {
      if (daireKutuyuKesiyor(e.cx, e.cy, e.r, a)) { kesisme += 1; bosluk = 0; continue; }
      if (kesisme === 0) bosluk = Math.min(bosluk, daireKutuyaUzaklik(e, a));
    }
  }
  const merkezX = (a.sol + a.sag) / 2 - p.x;
  const merkezY = (a.ust + a.alt) / 2 - p.y;
  const boy = Math.hypot(merkezX, merkezY) || 1;
  const hiza = aciklik ? (merkezX / boy) * aciklik.ux + (merkezY / boy) * aciklik.uy : 0;
  const puan = -KESISME_CEZASI * kesisme
    + BOSLUK_AGIRLIGI * Math.min(bosluk, BOSLUK_TAVANI)
    + ACIKLIK_AGIRLIGI * hiza
    + (SIRA_BONUSU[sira] ?? 0)
    + (onceki === a.yon ? SURUKLEME_PAYI : 0);
  return { puan, kesisme, bosluk: Math.min(bosluk, BOSLUK_TAVANI) };
}

/**
 * Adın konulacağı yer. Sekiz aday PUANLANIR; eskiden "kesmeyen İLK aday" seçiliyordu ve bu yüzden
 * kıl payı kurtulan bir yer bol boşluklu bir yere tercih ediliyor, şekil oynatılınca ad noktanın bir
 * yanından öbür yanına zıplıyordu (kullanıcı: "bazen çok saçma sapan konumlara atıyor kendini").
 * Puan: kesişme cezası, engellere kalan boşluk, kolların arasındaki en geniş açıklığa hizalanma,
 * tercih sırası ve bir önceki yöne sadakat (histerezis).
 */
export function noktaAdiYeri(
  p: EkranNoktasi, engeller: readonly NoktaEngeli[], kutu: AdKutusu, onceki?: AdYonu,
): NoktaAdiYeri {
  const adaylar = adayYerler(p, kutu);
  if (engeller.length === 0) return secilen(adaylar[0]);
  const aciklik = aciklikYonu(engeller, p);
  const durum = (a: Aday, i: number) => adayPuani(p, engeller, a, i, aciklik, onceki);

  // 1) EV: adın bilinen yeri (sağ üst) rahatsa ad yerinden OYNAMAZ — çizimlerin çoğu hiç değişmez.
  //    Ad başka yere gitmişse eve dönmek için daha geniş boşluk istenir (sınırda gidip gelmesin).
  const ev = durum(adaylar[0], 0);
  const evdeydi = onceki === undefined || onceki === adaylar[0].yon;
  if (ev.kesisme === 0 && ev.bosluk >= (evdeydi ? EVDE_KALMA_BOSLUGU : EVE_DONUS_BOSLUGU)) return secilen(adaylar[0]);

  // 2) ÖNCEKİ YER hâlâ rahatsa orada kalır: şekil sürüklenirken ad noktanın çevresinde gezinmesin.
  if (onceki && !evdeydi) {
    const i = adaylar.findIndex((a) => a.yon === onceki);
    if (i >= 0) {
      const d = durum(adaylar[i], i);
      if (d.kesisme === 0 && d.bosluk >= EVDE_KALMA_BOSLUGU) return secilen(adaylar[i]);
    }
  }

  // 3) PUAN: kesişmeyen, boşluğu geniş ve kolların arasındaki açıklığa bakan aday kazanır.
  let enIyi = adaylar[0];
  let enIyiPuan = Number.NEGATIVE_INFINITY;
  adaylar.forEach((a, i) => {
    const { puan } = durum(a, i);
    if (puan > enIyiPuan) { enIyiPuan = puan; enIyi = a; }
  });
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
