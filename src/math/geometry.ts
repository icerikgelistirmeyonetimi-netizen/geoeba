// Deterministik Geometrik Hesaplama ve Analiz Modülü

import { Point2D } from '@/types/math';
import { formatTurkishNumber } from './coordinates';

/**
 * İki nokta arasındaki Öklid mesafesini hesaplar.
 */
export function calculateDistance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * İki noktanın orta noktasını hesaplar.
 */
export function calculateMidpoint(p1: Point2D, p2: Point2D): Point2D {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}

/**
 * Üç nokta arasındaki açıyı (derece cinsinden) hesaplar.
 * vertex: Açının köşe noktası (B)
 * p1: Birinci kol üzerindeki nokta (A)
 * p2: İkinci kol üzerindeki nokta (C)
 * Döndürülen açı [0, 180] derece arasındadır.
 */
export function calculateAngleDegrees(
  p1: Point2D,
  vertex: Point2D,
  p2: Point2D
): number {
  const v1x = p1.x - vertex.x;
  const v1y = p1.y - vertex.y;
  const v2x = p2.x - vertex.x;
  const v2y = p2.y - vertex.y;

  const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const len2 = Math.sqrt(v2x * v2x + v2y * v2y);

  if (len1 === 0 || len2 === 0) return 0;

  const dot = v1x * v2x + v1y * v2y;
  let cosTheta = dot / (len1 * len2);
  // Hassasiyet taşmalarını engelle
  cosTheta = Math.max(-1, Math.min(1, cosTheta));

  const rad = Math.acos(cosTheta);
  return (rad * 180) / Math.PI;
}

/**
 * Açı yayının (SVG arc) açılarını EKRAN uzayında hesaplar.
 * Girdi noktaları DÜNYA koordinatlarındadır; ekranda y ekseni ters olduğu için y negatiflenir.
 * Döndürülen açılar doğrudan `cx + r * cos(açı)` / `cy + r * sin(açı)` ile kullanılabilir.
 *
 * - sweepAngle: startAngle -> endAngle yönündeki İŞARETLİ fark, (-pi, pi] aralığında.
 *   Bu, iki kol arasındaki iç açıdır (|sweepAngle| daima <= 180 derece, calculateAngleDegrees ile aynı).
 *   SVG'de sweep-flag = sweepAngle > 0 ? 1 : 0 ve large-arc-flag DAİMA 0 olmalıdır.
 * - midAngle: açıortay yönü (ölçü rozetini konumlandırmak için); +-pi kesim çizgisinde de doğrudur.
 * - isClockwise: ekranda saat yönünde mi ilerlendiği.
 */
export function getAngleArcAngles(
  p1: Point2D,
  vertex: Point2D,
  p2: Point2D
): {
  startAngle: number;
  endAngle: number;
  sweepAngle: number;
  midAngle: number;
  isClockwise: boolean;
} {
  // Ekran uzayı açıları (y aşağı doğru arttığı için dünya y farkı negatiflenir)
  const startAngle = Math.atan2(-(p1.y - vertex.y), p1.x - vertex.x);
  const endAngle = Math.atan2(-(p2.y - vertex.y), p2.x - vertex.x);

  // İşaretli fark: (-pi, pi]
  let diff = endAngle - startAngle;
  while (diff <= -Math.PI) diff += 2 * Math.PI;
  while (diff > Math.PI) diff -= 2 * Math.PI;

  return {
    startAngle,
    endAngle,
    sweepAngle: diff,
    midAngle: startAngle + diff / 2,
    isClockwise: diff > 0,
  };
}

/**
 * Sıralı köşe noktalarına sahip çokgenin alanını (Shoelace / Gauss formülü) hesaplar.
 */
export function calculatePolygonArea(points: Point2D[]): number {
  const n = points.length;
  if (n < 3) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];
    sum += current.x * next.y - next.x * current.y;
  }

  return Math.abs(sum) / 2;
}

/**
 * Sıralı köşe noktalarına sahip çokgenin çevresini hesaplar.
 */
export function calculatePolygonPerimeter(points: Point2D[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let perimeter = 0;
  for (let i = 0; i < n; i++) {
    const current = points[i];
    const next = points[(i + 1) % n];
    perimeter += calculateDistance(current, next);
  }

  return perimeter;
}

/**
 * Çemberin alanını (pi * r^2) hesaplar.
 */
export function calculateCircleArea(radius: number): number {
  return Math.PI * radius * radius;
}

/**
 * Çemberin çevresini (2 * pi * r) hesaplar.
 */
export function calculateCircleCircumference(radius: number): number {
  return 2 * Math.PI * radius;
}

/**
 * İki noktadan geçen doğrunun denklemini ve eğimini hesaplar.
 */
export function calculateLineEquation(
  p1: Point2D,
  p2: Point2D
): { slope: number | null; intercept: number | null; equationText: string } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Düşey doğru (x = sabit)
  if (Math.abs(dx) < 1e-6) {
    const xVal = formatTurkishNumber(p1.x);
    return {
      slope: null,
      intercept: null,
      equationText: `x = ${xVal}`,
    };
  }

  const slope = dy / dx;
  const intercept = p1.y - slope * p1.x;

  const mStr = Math.abs(slope - 1) < 1e-6 ? '' : Math.abs(slope + 1) < 1e-6 ? '-' : formatTurkishNumber(slope);
  const nStr = formatTurkishNumber(Math.abs(intercept));

  let eq = 'y = ';
  if (Math.abs(slope) < 1e-6) {
    eq += formatTurkishNumber(intercept);
  } else {
    eq += `${mStr}x`;
    if (Math.abs(intercept) > 1e-6) {
      eq += intercept > 0 ? ` + ${nStr}` : ` - ${nStr}`;
    }
  }

  return {
    slope,
    intercept,
    equationText: eq,
  };
}

/**
 * Bir noktanın doğru parçasına en yakın mesafesini ve projeksiyonunu bulur.
 */
export function distanceToSegment(
  point: Point2D,
  segStart: Point2D,
  segEnd: Point2D
): { distance: number; projection: Point2D } {
  const l2 =
    (segEnd.x - segStart.x) * (segEnd.x - segStart.x) +
    (segEnd.y - segStart.y) * (segEnd.y - segStart.y);

  if (l2 === 0) {
    return {
      distance: calculateDistance(point, segStart),
      projection: segStart,
    };
  }

  let t =
    ((point.x - segStart.x) * (segEnd.x - segStart.x) +
      (point.y - segStart.y) * (segEnd.y - segStart.y)) /
    l2;
  t = Math.max(0, Math.min(1, t));

  const projection: Point2D = {
    x: segStart.x + t * (segEnd.x - segStart.x),
    y: segStart.y + t * (segEnd.y - segStart.y),
  };

  return {
    distance: calculateDistance(point, projection),
    projection,
  };
}

/**
 * Yeni oluşturulacak nokta için sıradaki harf etiketini (A, B, C ... Z, A1, B1 ...) üretir.
 */
export function generateNextPointLabel(existingLabels: string[]): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const labelSet = new Set(existingLabels);

  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    if (!labelSet.has(letter)) {
      return letter;
    }
  }

  let suffix = 1;
  while (true) {
    for (let i = 0; i < letters.length; i++) {
      const candidate = `${letters[i]}_${suffix}`;
      if (!labelSet.has(candidate)) {
        return candidate;
      }
    }
    suffix++;
  }
}

/**
 * Art arda birden çok nokta için sıradaki harf etiketlerini üretir (Örn: ["C", "D", "E", "F"]).
 */
export function generateNextPointLabels(existingLabels: string[], count: number): string[] {
  const used = [...existingLabels];
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const next = generateNextPointLabel(used);
    used.push(next);
    result.push(next);
  }
  return result;
}

/**
 * Bir noktanın (pt), p1-p2 doğrusuna göre simetriğini (yansımasını) hesaplar.
 */
export function reflectPointAcrossLine(
  pt: Point2D,
  p1: Point2D,
  p2: Point2D
): Point2D {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // Doğrunun genel denklemi: a*x + b*y + c = 0
  const a = -dy;
  const b = dx;
  const c = -(a * p1.x + b * p1.y);

  const denom = a * a + b * b;
  if (denom < 1e-10) {
    return { x: pt.x, y: pt.y };
  }

  const dist = (a * pt.x + b * pt.y + c) / denom;
  const nx = Number((pt.x - 2 * a * dist).toFixed(2));
  const ny = Number((pt.y - 2 * b * dist).toFixed(2));

  return { x: nx, y: ny };
}


/**
 * Üç noktadan geçen (çevrel) çemberin merkezini ve yarıçapını hesaplar.
 * Noktalar doğrusalsa (ya da çakışıksa) çember tanımsızdır: null döner.
 */
export function calculateCircumcircle(
  a: Point2D,
  b: Point2D,
  c: Point2D
): { center: Point2D; radius: number } | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  // |d| çok küçükse üç nokta (neredeyse) aynı doğru üzerindedir
  if (Math.abs(d) < 1e-9) return null;

  const aSq = a.x * a.x + a.y * a.y;
  const bSq = b.x * b.x + b.y * b.y;
  const cSq = c.x * c.x + c.y * c.y;

  const ux = (aSq * (b.y - c.y) + bSq * (c.y - a.y) + cSq * (a.y - b.y)) / d;
  const uy = (aSq * (c.x - b.x) + bSq * (a.x - c.x) + cSq * (b.x - a.x)) / d;
  const center = { x: ux, y: uy };
  const radius = Math.hypot(a.x - ux, a.y - uy);
  if (!Number.isFinite(radius) || radius <= 0) return null;
  return { center, radius };
}

/**
 * Yay / daire dilimi geometrisi.
 * Yarıçapı |merkez-başlangıç| belirler; yön noktası yalnızca bitiş açısını verir.
 * Yay her zaman saat yönünün TERSİNE (matematik pozitif yönde) başlangıçtan yöne doğru çizilir.
 */
export function getArcGeometry(
  center: Point2D,
  start: Point2D,
  direction: Point2D
): { radius: number; startAngle: number; endAngle: number; sweep: number } | null {
  const radius = calculateDistance(center, start);
  if (radius < 1e-9) return null;
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  const dirAngle = Math.atan2(direction.y - center.y, direction.x - center.x);
  // Başlangıçtan yöne pozitif (saat yönü tersi) tarama açısı: [0, 2π)
  let sweep = dirAngle - startAngle;
  while (sweep < 0) sweep += 2 * Math.PI;
  while (sweep >= 2 * Math.PI) sweep -= 2 * Math.PI;
  return { radius, startAngle, endAngle: startAngle + sweep, sweep };
}

/** Yay uzunluğu (r · θ). */
export function calculateArcLength(radius: number, sweep: number): number {
  return radius * sweep;
}

/** Daire dilimi alanı (r²θ/2). */
export function calculateSectorArea(radius: number, sweep: number): number {
  return (radius * radius * sweep) / 2;
}

/**
 * Bir çokgende, verilen noktaya EN YAKIN kenarın dizinini döndürür.
 *
 * i. kenar, vertices[i] ile vertices[(i + 1) % n] arasındaki kenardır. Karşılaştırma
 * hangi birimde verilirse o birimde yapılır; tuvalde kullanıcı gördüğü yere tıkladığı
 * için köşeler ekran pikseli olarak geçilir.
 *
 * `maxDistance` verilirse ve en yakın kenar bile bu uzaklıktan uzaktaysa null döner:
 * şeklin ortasına tıklandığında "hangi kenar?" sorusunun anlamlı bir cevabı yoktur.
 */
export function findNearestEdgeIndex(
  vertices: Point2D[],
  target: Point2D,
  maxDistance = Infinity
): number | null {
  if (vertices.length < 3) return null;
  let enIyi = -1;
  let enKisa = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const { distance } = distanceToSegment(target, vertices[i], vertices[(i + 1) % vertices.length]);
    if (distance < enKisa) {
      enKisa = distance;
      enIyi = i;
    }
  }
  return enIyi >= 0 && enKisa <= maxDistance ? enIyi : null;
}

/** Elipsin alanı: π·a·b */
export function calculateEllipseArea(radiusX: number, radiusY: number): number {
  return Math.PI * Math.abs(radiusX) * Math.abs(radiusY);
}

/**
 * Elipsin çevresi — Ramanujan'ın ikinci yaklaşımı.
 *
 * Elips çevresinin kapalı bir formülü yoktur (eliptik integral gerektirir).
 * Ramanujan'ın bu yaklaşımı okul düzeyindeki tüm oranlarda bağıl hatayı
 * 10^-9'un altında tutar; a = b iken tam olarak 2πr verir.
 */
export function calculateEllipsePerimeter(radiusX: number, radiusY: number): number {
  const a = Math.abs(radiusX);
  const b = Math.abs(radiusY);
  if (a === 0 && b === 0) return 0;
  const h = ((a - b) * (a - b)) / ((a + b) * (a + b));
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

// ---------------------------------------------------------------------------
// Klasik geometri inşaları (orta nokta, dik/paralel doğru, açıortay, kesişim,
// pergel, öteleme). Hepsi saf fonksiyondur: nesne modeline dokunmaz, yalnızca
// nokta üretir. Böylece tek tek sınanabilirler.
// ---------------------------------------------------------------------------

/** İki noktanın orta noktası. */
export function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * [AB] doğru parçasını verilen oranda bölen nokta.
 * `t = 0` A'yı, `t = 1` B'yi verir; `m/n` oranı için t = m / (m + n) kullanın.
 */
export function pointAtRatio(a: Point2D, b: Point2D, t: number): Point2D {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** m:n oranını t parametresine çevirir. Toplam sıfırsa null döner. */
export function ratioToT(m: number, n: number): number | null {
  const toplam = m + n;
  if (!Number.isFinite(toplam) || Math.abs(toplam) < 1e-12) return null;
  return m / toplam;
}

/** Bir noktayı vektör kadar öteler. */
export function translatePoint(p: Point2D, vector: Point2D): Point2D {
  return { x: p.x + vector.x, y: p.y + vector.y };
}

/**
 * `through` noktasından geçen ve (a,b) doğrusuna PARALEL doğrunun ikinci noktası.
 * Doğru iki noktayla temsil edildiği için yön vektörü kadar ötelenmiş bir nokta döner.
 */
export function parallelThrough(a: Point2D, b: Point2D, through: Point2D): Point2D | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) < 1e-12) return null;
  return { x: through.x + dx, y: through.y + dy };
}

/**
 * `through` noktasından geçen ve (a,b) doğrusuna DİK doğrunun ikinci noktası.
 * Yön vektörü 90° döndürülür: (dx, dy) -> (-dy, dx).
 */
export function perpendicularThrough(a: Point2D, b: Point2D, through: Point2D): Point2D | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) < 1e-12) return null;
  return { x: through.x - dy, y: through.y + dx };
}

/**
 * [AB]'nin ORTA DİKMESİ: orta noktadan geçen, AB'ye dik doğruyu tanımlayan iki nokta.
 */
export function perpendicularBisector(a: Point2D, b: Point2D): [Point2D, Point2D] | null {
  if (calculateDistance(a, b) < 1e-12) return null;
  const orta = midpoint(a, b);
  const ikinci = perpendicularThrough(a, b, orta);
  return ikinci ? [orta, ikinci] : null;
}

/**
 * ∠(p1, vertex, p3) açısının AÇIORTAYI üzerindeki bir nokta.
 * İki kolun BİRİM vektörleri toplanır; böylece kolların uzunluğu sonucu etkilemez.
 * Kollar ters yönlüyse (180°) açıortay belirsizdir, null döner.
 */
export function angleBisectorPoint(p1: Point2D, vertex: Point2D, p3: Point2D): Point2D | null {
  const u1 = calculateDistance(vertex, p1);
  const u2 = calculateDistance(vertex, p3);
  if (u1 < 1e-12 || u2 < 1e-12) return null;
  const bx = (p1.x - vertex.x) / u1 + (p3.x - vertex.x) / u2;
  const by = (p1.y - vertex.y) / u1 + (p3.y - vertex.y) / u2;
  const boy = Math.hypot(bx, by);
  if (boy < 1e-9) return null; // kollar tam ters yönlü: açıortay tanımsız
  const olcek = (u1 + u2) / 2;
  return { x: vertex.x + (bx / boy) * olcek, y: vertex.y + (by / boy) * olcek };
}

/**
 * İki doğrunun kesişimi. Doğrular (a1,a2) ve (b1,b2) nokta çiftleriyle verilir.
 * Paralel veya çakışıksa null döner.
 */
export function intersectLines(
  a1: Point2D,
  a2: Point2D,
  b1: Point2D,
  b2: Point2D
): Point2D | null {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const payda = d1x * d2y - d1y * d2x;
  if (Math.abs(payda) < 1e-12) return null; // paralel
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / payda;
  return { x: a1.x + d1x * t, y: a1.y + d1y * t };
}

/**
 * Doğru ile çemberin kesişimi: 0, 1 veya 2 nokta.
 * Doğru (a,b) ile, çember merkez + yarıçap ile verilir.
 */
export function intersectLineCircle(
  a: Point2D,
  b: Point2D,
  center: Point2D,
  radius: number
): Point2D[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const uzunluk2 = dx * dx + dy * dy;
  if (uzunluk2 < 1e-24 || radius <= 0) return [];
  // Merkezin doğru üzerindeki dik izdüşümü
  const t = ((center.x - a.x) * dx + (center.y - a.y) * dy) / uzunluk2;
  const ayak = { x: a.x + dx * t, y: a.y + dy * t };
  const mesafe = calculateDistance(center, ayak);
  if (mesafe > radius + 1e-9) return [];
  if (Math.abs(mesafe - radius) < 1e-9) return [ayak]; // teğet
  const yari = Math.sqrt(Math.max(0, radius * radius - mesafe * mesafe));
  const birim = Math.sqrt(uzunluk2);
  const ux = dx / birim;
  const uy = dy / birim;
  return [
    { x: ayak.x - ux * yari, y: ayak.y - uy * yari },
    { x: ayak.x + ux * yari, y: ayak.y + uy * yari },
  ];
}

/**
 * İki çemberin kesişimi: 0, 1 veya 2 nokta.
 * Çakışık çemberlerde (sonsuz kesişim) boş dizi döner.
 */
export function intersectCircles(
  c1: Point2D,
  r1: number,
  c2: Point2D,
  r2: number
): Point2D[] {
  const d = calculateDistance(c1, c2);
  if (r1 <= 0 || r2 <= 0) return [];
  if (d < 1e-12) return []; // eş merkezli: ya çakışık ya kesişmez
  if (d > r1 + r2 + 1e-9) return []; // ayrık
  if (d < Math.abs(r1 - r2) - 1e-9) return []; // biri diğerinin içinde
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h2 = r1 * r1 - a * a;
  const ux = (c2.x - c1.x) / d;
  const uy = (c2.y - c1.y) / d;
  const orta = { x: c1.x + ux * a, y: c1.y + uy * a };
  if (h2 <= 1e-12) return [orta]; // teğet
  const h = Math.sqrt(h2);
  return [
    { x: orta.x - uy * h, y: orta.y + ux * h },
    { x: orta.x + uy * h, y: orta.y - ux * h },
  ];
}

/**
 * İki nokta arasındaki doğrunun EĞİMİ. Dikey doğruda eğim tanımsızdır (null).
 */
export function calculateSlope(a: Point2D, b: Point2D): number | null {
  const dx = b.x - a.x;
  if (Math.abs(dx) < 1e-12) return null;
  return (b.y - a.y) / dx;
}

/**
 * Bir dik üçgende verilen açının trigonometrik oranları.
 * `vertex` açının bulunduğu köşe, `right` dik açının köşesi, `other` üçüncü köşe.
 * Üçgen dik değilse veya bozuksa null döner.
 */
export function rightTriangleRatios(
  vertex: Point2D,
  right: Point2D,
  other: Point2D
): { sin: number; cos: number; tan: number; karsi: number; komsu: number; hipotenus: number } | null {
  const komsu = calculateDistance(vertex, right); // açıya komşu dik kenar
  const karsi = calculateDistance(right, other); // açının karşısındaki dik kenar
  const hipotenus = calculateDistance(vertex, other);
  if (komsu < 1e-9 || karsi < 1e-9 || hipotenus < 1e-9) return null;
  // Dik açı kontrolü: Pisagor
  if (Math.abs(komsu * komsu + karsi * karsi - hipotenus * hipotenus) > 1e-6 * hipotenus * hipotenus) {
    return null;
  }
  return {
    sin: karsi / hipotenus,
    cos: komsu / hipotenus,
    tan: karsi / komsu,
    karsi,
    komsu,
    hipotenus,
  };
}

/**
 * Doğru ile ELİPSİN kesişimi (eksenlere paralel elips).
 *
 * Elips, x/a ve y/b ölçeklemesiyle BİRİM ÇEMBERE dönüşür. Doğru da aynı dönüşümden
 * geçirilip çemberle kesiştirilir, bulunan noktalar geri ölçeklenir. Böylece ayrı bir
 * ikinci derece denklem çözmeye gerek kalmaz ve çember durumuyla aynı kod sınanır.
 */
export function intersectLineEllipse(
  a: Point2D,
  b: Point2D,
  center: Point2D,
  radiusX: number,
  radiusY: number
): Point2D[] {
  const rx = Math.abs(radiusX);
  const ry = Math.abs(radiusY);
  if (rx < 1e-12 || ry < 1e-12) return [];
  const olcekle = (p: Point2D): Point2D => ({ x: (p.x - center.x) / rx, y: (p.y - center.y) / ry });
  const geri = (p: Point2D): Point2D => ({ x: center.x + p.x * rx, y: center.y + p.y * ry });
  const k = intersectLineCircle(olcekle(a), olcekle(b), { x: 0, y: 0 }, 1);
  return k.map(geri);
}

/**
 * Bir AÇININ trigonometrik oranları — dik üçgen ŞARTI ARANMAZ.
 *
 * Önceki sürüm yalnızca tam dik üçgende sonuç veriyordu; elle çizilen üçgenler
 * Pisagor bağıntısını tam sağlamadığı için araç neredeyse her zaman "dik değil"
 * diyordu. Oysa sin, cos ve tan bir AÇININ oranlarıdır; üçgenin dik olması yalnızca
 * bunları KENAR ORANI olarak da yazabilmek için gerekir.
 *
 * Bu yüzden: oranlar her zaman açıdan hesaplanır; üçgen dik ise (0,5° toleransla)
 * kenar uzunlukları da eklenir ve okul gösterimi (karşı/hipotenüs) mümkün olur.
 */
export function angleTrigRatios(
  p1: Point2D,
  vertex: Point2D,
  p3: Point2D
): {
  derece: number;
  sin: number;
  cos: number;
  /** 90°'de tanjant tanımsızdır */
  tan: number | null;
  /** Dik açının bulunduğu köşe; üçgen dik değilse null */
  dikKose: 'vertex' | 'p1' | 'p3' | null;
  /** Yalnızca dik açı p1 veya p3'teyse: açının kenar uzunlukları */
  kenarlar: { karsi: number; komsu: number; hipotenus: number } | null;
} | null {
  const a = calculateDistance(vertex, p1);
  const b = calculateDistance(vertex, p3);
  const c = calculateDistance(p1, p3);
  if (a < 1e-9 || b < 1e-9 || c < 1e-9) return null;

  const derece = calculateAngleDegrees(p1, vertex, p3);
  const rad = (derece * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  const tan = Math.abs(cos) < 1e-12 ? null : sin / cos;

  // Hangi köşe dik? (0,5° tolerans: elle çizilen üçgenler tam 90° olmaz)
  const TOLERANS = 0.5;
  const aciVertex = derece;
  const aciP1 = calculateAngleDegrees(vertex, p1, p3);
  const aciP3 = calculateAngleDegrees(vertex, p3, p1);
  let dikKose: 'vertex' | 'p1' | 'p3' | null = null;
  if (Math.abs(aciVertex - 90) <= TOLERANS) dikKose = 'vertex';
  else if (Math.abs(aciP1 - 90) <= TOLERANS) dikKose = 'p1';
  else if (Math.abs(aciP3 - 90) <= TOLERANS) dikKose = 'p3';

  // Kenar oranı gösterimi yalnızca dik açı KARŞI köşelerden birindeyse anlamlı
  let kenarlar: { karsi: number; komsu: number; hipotenus: number } | null = null;
  if (dikKose === 'p1') kenarlar = { komsu: a, karsi: c, hipotenus: b };
  else if (dikKose === 'p3') kenarlar = { komsu: b, karsi: c, hipotenus: a };

  return { derece, sin, cos, tan, dikKose, kenarlar };
}

/**
 * Bir NOKTANIN çember üzerindeki en yakın karşılığı (dik izdüşüm).
 * Merkezle çakışan noktada yön belirsizdir; sağdaki nokta döner.
 */
export function closestPointOnCircle(center: Point2D, radius: number, p: Point2D): Point2D {
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  const uz = Math.hypot(dx, dy);
  if (uz < 1e-12) return { x: center.x + radius, y: center.y };
  return { x: center.x + (dx / uz) * radius, y: center.y + (dy / uz) * radius };
}

/**
 * Elips üzerindeki en yakın nokta — YAKLAŞIK.
 * Elips birim çembere ölçeklenir, orada izdüşüm alınır, geri ölçeklenir.
 * Tam çözüm dördüncü dereceden denklem gerektirir; kenara nokta koymak için
 * bu yaklaşım yeterlidir (nokta her zaman elipsin ÜZERİNDE olur).
 */
export function closestPointOnEllipse(
  center: Point2D,
  radiusX: number,
  radiusY: number,
  p: Point2D
): Point2D | null {
  const rx = Math.abs(radiusX);
  const ry = Math.abs(radiusY);
  if (rx < 1e-12 || ry < 1e-12) return null;
  const nx = (p.x - center.x) / rx;
  const ny = (p.y - center.y) / ry;
  const uz = Math.hypot(nx, ny);
  if (uz < 1e-12) return { x: center.x + rx, y: center.y };
  return { x: center.x + (nx / uz) * rx, y: center.y + (ny / uz) * ry };
}

/**
 * Çokgenin KENARLARI üzerindeki en yakın nokta ve hangi kenarda olduğu.
 * Alan bölme için kenar dizini de gerekir, o yüzden birlikte döner.
 */
export function closestPointOnPolygonEdge(
  vertices: Point2D[],
  p: Point2D
): { point: Point2D; edgeIndex: number; distance: number } | null {
  if (vertices.length < 2) return null;
  let enIyi: { point: Point2D; edgeIndex: number; distance: number } | null = null;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const { distance, projection } = distanceToSegment(p, a, b);
    if (!enIyi || distance < enIyi.distance) {
      enIyi = { point: projection, edgeIndex: i, distance };
    }
  }
  return enIyi;
}

/**
 * Bir çokgeni, KENARLARI ÜZERİNDEKİ iki nokta arasına çizilen kirişle iki parçaya böler.
 *
 * `iA` ve `iB`, kesme noktalarının bulunduğu kenarların dizinleridir; noktalar
 * o kenarların üzerinde olmalıdır. Aynı kenardaki iki nokta alanı bölmez (null).
 *
 * Dönen iki köşe listesi, kesme noktalarını da içerir: biri kenar iA'dan iB'ye
 * saat yönünde, diğeri geri kalan yol.
 */
export function splitPolygonByChord(
  vertices: Point2D[],
  iA: number,
  pA: Point2D,
  iB: number,
  pB: Point2D
): [Point2D[], Point2D[]] | null {
  const n = vertices.length;
  if (n < 3) return null;
  if (iA === iB) return null; // aynı kenar: alan bölünmez
  if (iA < 0 || iB < 0 || iA >= n || iB >= n) return null;

  // 1. parça: pA -> (iA'dan sonraki köşeler) -> iB'nin başına kadar -> pB
  const birinci: Point2D[] = [pA];
  for (let k = (iA + 1) % n; ; k = (k + 1) % n) {
    birinci.push(vertices[k]);
    if (k === iB) break;
  }
  birinci.push(pB);

  // 2. parça: pB -> (iB'den sonraki köşeler) -> iA'nın başına kadar -> pA
  const ikinci: Point2D[] = [pB];
  for (let k = (iB + 1) % n; ; k = (k + 1) % n) {
    ikinci.push(vertices[k]);
    if (k === iA) break;
  }
  ikinci.push(pA);

  if (birinci.length < 3 || ikinci.length < 3) return null;
  return [birinci, ikinci];
}


/**
 * Bir nesnenin ÜZERİNE iz düşürme için gereken sade tanım.
 * Nesne modeline bağımlı olmasın diye geometrik biçim olarak verilir.
 */
export type HostShape =
  | { kind: 'segment'; a: Point2D; b: Point2D }
  | { kind: 'line'; a: Point2D; b: Point2D }
  | { kind: 'ray'; a: Point2D; b: Point2D }
  | { kind: 'circle'; center: Point2D; radius: number }
  | { kind: 'arc'; center: Point2D; radius: number; startAngle: number; sweep: number; sector?: boolean }
  | { kind: 'ellipse'; center: Point2D; radiusX: number; radiusY: number; rotation?: number }
  | { kind: 'polygon'; vertices: Point2D[] };

/**
 * Noktayı, üzerinde durması gereken nesneye geri oturtur.
 *
 * "Nesne üzerinde nokta" sürüklendiğinde nesneden kopmamalıdır: kullanıcı noktayı
 * çember boyunca kaydırmak ister, çemberin dışına çıkarmak değil. Bu yüzden her
 * taşımadan sonra nokta en yakın konumdan nesnenin üzerine iz düşürülür.
 */
export function projectOntoHost(p: Point2D, host: HostShape): Point2D | null {
  switch (host.kind) {
    case 'segment':
      return distanceToSegment(p, host.a, host.b).projection;
    case 'ray':
    case 'line': {
      const dx = host.b.x - host.a.x;
      const dy = host.b.y - host.a.y;
      const uz2 = dx * dx + dy * dy;
      if (uz2 < 1e-18) return null;
      const rawT = ((p.x - host.a.x) * dx + (p.y - host.a.y) * dy) / uz2;
      const t = host.kind === 'ray' ? Math.max(0, rawT) : rawT;
      return { x: host.a.x + dx * t, y: host.a.y + dy * t };
    }
    case 'circle':
      return host.radius > 0 ? closestPointOnCircle(host.center, host.radius, p) : null;
    case 'arc': {
      if (!(host.radius > 0)) return null;
      const tau = 2 * Math.PI;
      const at = (angle: number) => ({ x: host.center.x + host.radius * Math.cos(angle), y: host.center.y + host.radius * Math.sin(angle) });
      const angle = Math.atan2(p.y - host.center.y, p.x - host.center.x);
      const offset = ((angle - host.startAngle) % tau + tau) % tau;
      const start = at(host.startAngle), end = at(host.startAngle + host.sweep);
      const candidates = offset <= host.sweep ? [at(angle)] : [start, end];
      if (host.sector) candidates.push(distanceToSegment(p, host.center, start).projection, distanceToSegment(p, host.center, end).projection);
      return candidates.reduce((a, b) => Math.hypot(p.x - a.x, p.y - a.y) <= Math.hypot(p.x - b.x, p.y - b.y) ? a : b);
    }
    case 'ellipse': {
      const angle = (host.rotation ?? 0) * Math.PI / 180;
      const c = Math.cos(angle), s = Math.sin(angle);
      const dx = p.x - host.center.x, dy = p.y - host.center.y;
      const local = closestPointOnEllipse({ x: 0, y: 0 }, host.radiusX, host.radiusY, { x: c * dx + s * dy, y: -s * dx + c * dy });
      return local ? { x: host.center.x + c * local.x - s * local.y, y: host.center.y + s * local.x + c * local.y } : null;
    }
    case 'polygon': {
      const r = closestPointOnPolygonEdge(host.vertices, p);
      return r ? r.point : null;
    }
    default:
      return null;
  }
}
