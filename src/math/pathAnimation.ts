import type { MathObject, Point2D, PointObject } from '@/types/math';
import { getArcGeometry } from './geometry';

/*
 * TAŞIYICI ÜZERİNDE CANLANDIRMA: bir şeklin üzerine konmuş nokta (onObjectId) şekil boyunca yürütülür. Her taşıyıcı
 * türü bir YOL olarak tanımlanır: noktanın yoldaki parametresi ve parametredeki konum. Parametre parçada, yayda ve
 * çokgen çevresinde 0..1 (çevre boyunca uzunluk oranı), çember ve elipste açıdır (radyan, 0..2π); doğru ve ışında
 * tanım noktalarına göre konumdur (A'da 0, B'de 1).
 */

/** Bir turun varsayılan süresi (saniye). */
export const DEFAULT_PATH_TOUR_SECONDS = 8;

export interface PointAnimUpdate {
  x: number;
  y: number;
  progress: number;
  direction?: 1 | -1;
}

const TAM_TUR = 2 * Math.PI;
/** Açıyı [0, 2π) aralığına getirir */
const tamTuraIndir = (aci: number) => ((aci % TAM_TUR) + TAM_TUR) % TAM_TUR;
const sinirla = (t: number, alt: number, ust: number) => Math.max(alt, Math.min(ust, t));
const aradaki = (a: Point2D, b: Point2D, t: number): Point2D => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** p'nin a→b doğrultusundaki izdüşüm oranı (a'da 0, b'de 1); a ile b çakışıksa 0 */
function izdusumOrani(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const boyKare = dx * dx + dy * dy;
  return boyKare < 1e-12 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / boyKare;
}

/** Taşıyıcının yol tanımı: noktanın parametresi ve parametredeki konum (konum çizilemiyorsa null) */
interface Yol {
  parametre(p: Point2D): number;
  konum(t: number): Point2D | null;
}

/** Kapalı kırık çizginin (çokgen çevresi) kenarları ve toplam uzunluğu */
function cevre(koseler: readonly PointObject[]) {
  const kenarlar = koseler.map((a, i) => {
    const b = koseler[(i + 1) % koseler.length];
    return { a, b, uzunluk: Math.hypot(b.x - a.x, b.y - a.y) };
  });
  return { kenarlar, toplam: kenarlar.reduce((t, k) => t + k.uzunluk, 0) };
}

/**
 * Çokgen çevresi: parametre, noktaya en yakın kenar noktasının çevre boyunca uzaklık oranıdır (uzunluğu sıfır kenarlar
 * atlanır; eşit uzaklıkta ilk kenar). Konum için parametre önce [0, 1)'e sarılır.
 */
function cevreYolu(koseler: readonly PointObject[]): Yol | null {
  if (koseler.length < 2) return null;
  const { kenarlar, toplam } = cevre(koseler);
  if (toplam < 1e-9) return null;
  return {
    parametre(p) {
      let enYakin = Infinity;
      let yol = 0;
      let gecilen = 0;
      for (const k of kenarlar) {
        if (k.uzunluk < 1e-9) continue;
        const t = sinirla(((p.x - k.a.x) * (k.b.x - k.a.x) + (p.y - k.a.y) * (k.b.y - k.a.y)) / (k.uzunluk * k.uzunluk), 0, 1);
        const ayak = aradaki(k.a, k.b, t);
        const uzaklik = Math.hypot(p.x - ayak.x, p.y - ayak.y);
        if (uzaklik < enYakin) {
          enYakin = uzaklik;
          yol = gecilen + t * k.uzunluk;
        }
        gecilen += k.uzunluk;
      }
      return yol / toplam;
    },
    konum(t) {
      const hedef = (((t % 1) + 1) % 1) * toplam;
      let gecilen = 0;
      for (let i = 0; i < kenarlar.length; i++) {
        const k = kenarlar[i];
        if (gecilen + k.uzunluk >= hedef || i === kenarlar.length - 1) {
          return aradaki(k.a, k.b, k.uzunluk > 1e-9 ? sinirla((hedef - gecilen) / k.uzunluk, 0, 1) : 0);
        }
        gecilen += k.uzunluk;
      }
      return { x: koseler[0].x, y: koseler[0].y };
    },
  };
}

/** Taşıyıcının yolu; tanımlayan noktaları bulunamıyorsa (ya da yol dejenereyse) null */
function yolu(tasiyici: MathObject, sahne: readonly MathObject[]): Yol | null {
  const noktalar = new Map(sahne.map((n) => [n.id, n]));
  const nokta = (id: string) => noktalar.get(id) as PointObject | undefined;

  switch (tasiyici.type) {
    case 'segment': {
      const a = nokta(tasiyici.startPointId);
      const b = nokta(tasiyici.endPointId);
      if (!a || !b) return null;
      return { parametre: (p) => sinirla(izdusumOrani(p, a, b), 0, 1), konum: (t) => aradaki(a, b, sinirla(t, 0, 1)) };
    }
    case 'line':
    case 'ray': {
      const dogru = tasiyici.type === 'line';
      const a = nokta(dogru ? tasiyici.point1Id : tasiyici.startPointId);
      const b = nokta(dogru ? tasiyici.point2Id : tasiyici.throughPointId);
      if (!a || !b) return null;
      // Işın başlangıcının gerisine geçmez
      return { parametre: (p) => izdusumOrani(p, a, b), konum: (t) => aradaki(a, b, dogru ? t : Math.max(0, t)) };
    }
    case 'circle': {
      const m = nokta(tasiyici.centerPointId);
      if (!m) return null;
      let r = tasiyici.fixedRadius ?? 0;
      const yariNokta = !r && tasiyici.radiusPointId ? nokta(tasiyici.radiusPointId) : undefined;
      if (yariNokta) r = Math.hypot(yariNokta.x - m.x, yariNokta.y - m.y);
      return {
        parametre: (p) => tamTuraIndir(Math.atan2(p.y - m.y, p.x - m.x)),
        konum: (t) => (r <= 0 ? null : { x: m.x + r * Math.cos(t), y: m.y + r * Math.sin(t) }),
      };
    }
    case 'ellipse': {
      const m = nokta(tasiyici.centerPointId);
      if (!m) return null;
      const rx = tasiyici.radiusX || 1;
      const ry = tasiyici.radiusY || 1;
      return {
        parametre: (p) => tamTuraIndir(Math.atan2((p.y - m.y) / ry, (p.x - m.x) / rx)),
        konum: (t) => ({ x: m.x + rx * Math.cos(t), y: m.y + ry * Math.sin(t) }),
      };
    }
    case 'arc':
    case 'sector': {
      const m = nokta(tasiyici.centerPointId);
      const bas = nokta(tasiyici.startPointId);
      const yon = nokta(tasiyici.directionPointId);
      const geo = m && bas && yon ? getArcGeometry(m, bas, yon) : null;
      if (!m || !geo) return null;
      // Parametre, başlangıçtan yay yönünde taranan açının yayın açısına oranı
      const tarama = Math.max(1e-4, geo.sweep);
      return {
        parametre: (p) => sinirla(tamTuraIndir(Math.atan2(p.y - m.y, p.x - m.x) - geo.startAngle) / tarama, 0, 1),
        konum: (t) => {
          const aci = geo.startAngle + sinirla(t, 0, 1) * geo.sweep;
          return { x: m.x + geo.radius * Math.cos(aci), y: m.y + geo.radius * Math.sin(aci) };
        },
      };
    }
    case 'polygon':
      return cevreYolu(tasiyici.pointIds.map(nokta).filter((k): k is PointObject => !!k));
    default:
      return null;
  }
}

/** Noktanın taşıyıcısı üzerindeki parametresi (taşıyıcı çizilemiyorsa 0). */
export function getPointPathParameter(point: PointObject, host: MathObject, scene: MathObject[]): number {
  return yolu(host, scene)?.parametre(point) ?? 0;
}

/** Parametredeki konum (taşıyıcı çizilemiyorsa null). */
export function evaluatePointOnPath(param: number, host: MathObject, scene: MathObject[]): Point2D | null {
  return yolu(host, scene)?.konum(param) ?? null;
}

type CanlandirmaKipi = NonNullable<PointObject['animMode']>;

/**
 * Parametrenin bir karelik adımı. Gidip gelmede uçta durup yön değişir. Çember ve elipste (döngülü) artan ve azalan kip
 * açıyı her adımda [0, 2π)'ye sarar; diğer yollarda yalnız uç aşılınca öbür uca sarılır. Bir kez artan kip uçta durur.
 */
function adim(p: number, yon: 1 | -1, kip: CanlandirmaKipi, donguluMu: boolean, alt: number, ust: number): { p: number; yon: 1 | -1 } {
  if (kip === 'oscillating') {
    if (p >= ust) return { p: ust, yon: -1 };
    if (p <= alt) return { p: alt, yon: 1 };
    return { p, yon };
  }
  if (kip === 'increasing_once') return { p: p >= ust ? ust : p, yon };
  if (donguluMu) return { p: kip === 'increasing' || kip === 'decreasing' ? tamTuraIndir(p) : p, yon };
  if (kip === 'increasing' && p >= ust) return { p: alt + ((p - ust) % (ust - alt)), yon };
  if (kip === 'decreasing' && p <= alt) return { p: ust - ((alt - p) % (ust - alt)), yon };
  return { p, yon };
}

/**
 * Canlandırılan noktayı bir sonraki kareye taşır. Bir tur (yolun bir ucundan öbürüne ya da tam dönüş) `tourSeconds`
 * sürer, noktanın hızı (animSpeed) bunu çarpar. Kip verilmemişse çember, elips ve çokgende sürekli artar, diğerlerinde
 * gidip gelir. Doğru [−5, 5] aralığında canlanır. Konum çizilemiyorsa null.
 */
export function advancePointOnHost(
  point: PointObject,
  host: MathObject,
  scene: MathObject[],
  currentDir: 1 | -1,
  dtSeconds: number,
  tourSeconds: number = DEFAULT_PATH_TOUR_SECONDS
): PointAnimUpdate | null {
  const donguluMu = host.type === 'circle' || host.type === 'ellipse';
  const kip: CanlandirmaKipi = point.animMode ?? (donguluMu || host.type === 'polygon' ? 'increasing' : 'oscillating');
  const yon: 1 | -1 = kip === 'increasing' || kip === 'increasing_once' ? 1 : kip === 'decreasing' ? -1 : currentDir;
  const [alt, ust] = donguluMu ? [0, TAM_TUR] : host.type === 'line' ? [-5, 5] : [0, 1];
  const simdiki = point.animProgress !== undefined ? point.animProgress : getPointPathParameter(point, host, scene);
  const sonraki = adim(simdiki + (yon * (ust - alt) * dtSeconds * (point.animSpeed ?? 1)) / tourSeconds, yon, kip, donguluMu, alt, ust);
  const konum = evaluatePointOnPath(sonraki.p, host, scene);
  return konum ? { x: konum.x, y: konum.y, progress: sonraki.p, direction: sonraki.yon } : null;
}
