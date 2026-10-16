import type { MathObject, Point2D, PointObject } from '@/types/math';

export const INSA_ADIMLARI = {
  midpoint: ['A ile B birleştirilir.', 'Orta nokta iki uca eşit uzaklıktadır; eş uzunluklar aynı çentikle gösterilir.'],
  perp_bisector: ['A ve B merkezli, eş yarıçaplı iki çember çizilir. Pergel açıklığı AB uzunluğunun yarısından büyüktür.', 'Çemberlerin iki kesişim noktası birleştirilir. Bu doğru AB’yi ortalar ve AB’ye diktir.', 'Çemberlerin kesişim noktaları hem A’ya hem B’ye eşit uzaklıktadır.'],
  perpendicular: ['A ve B’den geçen doğru gösterilir.', 'C’den bu doğruya dik doğru çizilir. Kesişimdeki kare dik açıyı belirtir.'],
  angle_bisector: ['Köşe merkezli bir çember açının iki kolunu eşit uzaklıkta keser.', 'Bu iki kesişim merkezi etrafında eş açıklıklı yaylar çizilir.', 'Yayların kesişimi ile köşe birleştirilir. Oluşan ışın açıyı iki eş açıya ayırır.'],
} as const;

export interface InsaGeometrisi {
  parcalar: [Point2D, Point2D][];
  cemberler: { merkez: Point2D; r: number }[];
  esitParcalar: [Point2D, Point2D][];
  dik?: { kose: Point2D; u: Point2D; v: Point2D };
  noktalar: Point2D[];
}
const birim = (a: Point2D, b: Point2D): Point2D => {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  return { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
};
const ekle = (a: Point2D, u: Point2D, k: number): Point2D => ({ x: a.x + u.x * k, y: a.y + u.y * k });

/** Süs çizimleri kaynak noktalardan yeniden hesaplanır; sürüklemede inşanın ilişkileri korunur. */
export function insaGeometrisi(nesne: MathObject, nesneler: readonly MathObject[]): InsaGeometrisi | null {
  const insa = nesne.insaGosterimi;
  if (!insa) return null;
  const pts = insa.pointIds.map((id) => nesneler.find((p): p is PointObject => p.id === id && p.type === 'point'));
  if (pts.some((p) => !p)) return null;
  const [a, b, c] = pts as PointObject[];
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d < 1e-8) return null;
  const u = birim(a, b);
  const v = { x: -u.y, y: u.x };
  const orta = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const g: InsaGeometrisi = { parcalar: [], cemberler: [], esitParcalar: [], noktalar: [] };
  if (insa.tur === 'midpoint' || insa.tur === 'perp_bisector') {
    g.parcalar = [[a, b]];
    g.esitParcalar = [[a, orta], [orta, b]];
    if (insa.tur === 'perp_bisector') {
      const r = d * 0.75;
      const h = Math.sqrt(r * r - d * d / 4);
      g.cemberler = [{ merkez: a, r }, { merkez: b, r }];
      g.noktalar = [ekle(orta, v, h), ekle(orta, v, -h)];
      g.dik = { kose: orta, u, v };
    }
    return g;
  }
  if (!c) return null;
  if (insa.tur === 'perpendicular') {
    const t = (c.x - a.x) * u.x + (c.y - a.y) * u.y;
    const ayak = ekle(a, u, t);
    g.parcalar = [[ekle(a, u, -10000), ekle(a, u, 10000)]];
    const yon = (c.x - ayak.x) * v.x + (c.y - ayak.y) * v.y < 0 ? -1 : 1;
    g.dik = { kose: ayak, u, v: { x: v.x * yon, y: v.y * yon } };
    return g;
  }
  // A-B-C açısı, B köşe. Köşe çemberinin yarıçapı kısa kolun yarısıdır.
  const dc = Math.hypot(c.x - b.x, c.y - b.y);
  if (dc < 1e-8) return null;
  const r = Math.min(d, dc) * 0.5;
  const u1 = birim(b, a), u2 = birim(b, c);
  const p = ekle(b, u1, r), q = ekle(b, u2, r);
  const toplam = { x: u1.x + u2.x, y: u1.y + u2.y };
  if (Math.hypot(toplam.x, toplam.y) < 1e-8) return null;
  const kesim = ekle(b, toplam, r);
  g.parcalar = [[b, a], [b, c]];
  g.cemberler = [{ merkez: b, r }, { merkez: p, r }, { merkez: q, r }];
  g.esitParcalar = [[b, p], [b, q]];
  g.noktalar = [p, q, kesim];
  return g;
}
