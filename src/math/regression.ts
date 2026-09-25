import { Point2D } from '@/types/math';

/**
 * EN KÜÇÜK KARELER ile polinom uydurma (GeoGebra'daki "uydurpolinom" karşılığı).
 *
 * Verilen noktalara en yakın geçen `derece` dereceli polinomun katsayılarını bulur.
 * Yöntem: normal denklemler (VᵀV)c = Vᵀy, kısmi pivotlu Gauss eliminasyonuyla çözülür.
 * Okul düzeyindeki nokta sayısı ve derecelerde (≤ 5) bu yöntem yeterince kararlıdır.
 *
 * Katsayılar ARTAN dereceye göre döner: [c0, c1, c2 ...] yani c0 + c1·x + c2·x² …
 * Uydurma yapılamazsa (nokta yetersiz, x'ler tekrar ediyor, sistem tekil) null döner.
 */
export function fitPolynomial(points: Point2D[], derece: number): number[] | null {
  const n = Math.floor(derece);
  if (!Number.isFinite(n) || n < 0 || n > 8) return null;
  const m = n + 1; // katsayı sayısı
  if (points.length < m) return null;

  // Farklı x değeri sayısı katsayı sayısından azsa sistem tekil olur
  const farkliX = new Set(points.map((p) => Number(p.x.toFixed(9)))).size;
  if (farkliX < m) return null;

  // Normal denklemler: A[i][j] = Σ x^(i+j),  bvec[i] = Σ y·x^i
  const A: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  const bvec = new Array(m).fill(0);
  for (const p of points) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    const kuvvet: number[] = new Array(2 * n + 1);
    kuvvet[0] = 1;
    for (let k = 1; k <= 2 * n; k++) kuvvet[k] = kuvvet[k - 1] * p.x;
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) A[i][j] += kuvvet[i + j];
      bvec[i] += p.y * kuvvet[i];
    }
  }
  return cozGauss(A, bvec);
}

/** Kısmi pivotlu Gauss eliminasyonu. Tekil sistemde null döner. */
function cozGauss(A: number[][], b: number[]): number[] | null {
  const m = b.length;
  const M = A.map((satir, i) => [...satir, b[i]]);

  for (let sutun = 0; sutun < m; sutun++) {
    // En büyük mutlak değerli satırı pivot yap (sayısal kararlılık)
    let enIyi = sutun;
    for (let s = sutun + 1; s < m; s++) {
      if (Math.abs(M[s][sutun]) > Math.abs(M[enIyi][sutun])) enIyi = s;
    }
    if (Math.abs(M[enIyi][sutun]) < 1e-12) return null; // tekil
    [M[sutun], M[enIyi]] = [M[enIyi], M[sutun]];

    const pivot = M[sutun][sutun];
    for (let s = sutun + 1; s < m; s++) {
      const carpan = M[s][sutun] / pivot;
      if (carpan === 0) continue;
      for (let k = sutun; k <= m; k++) M[s][k] -= carpan * M[sutun][k];
    }
  }

  // Geri yerine koyma
  const c = new Array(m).fill(0);
  for (let i = m - 1; i >= 0; i--) {
    let toplam = M[i][m];
    for (let j = i + 1; j < m; j++) toplam -= M[i][j] * c[j];
    c[i] = toplam / M[i][i];
    if (!Number.isFinite(c[i])) return null;
  }
  return c;
}

/**
 * Uydurmanın ne kadar iyi olduğunu söyleyen belirleme katsayısı R².
 * 1'e yakınsa noktalar eğriye çok yakındır. Tüm y'ler eşitse (varyans sıfır) 1 döner.
 */
export function coefficientOfDetermination(points: Point2D[], katsayilar: number[]): number {
  if (points.length === 0) return 0;
  const ortY = points.reduce((t, p) => t + p.y, 0) / points.length;
  let kalanKare = 0;
  let toplamKare = 0;
  for (const p of points) {
    const tahmin = polinomDegeri(katsayilar, p.x);
    kalanKare += (p.y - tahmin) ** 2;
    toplamKare += (p.y - ortY) ** 2;
  }
  if (toplamKare < 1e-15) return 1;
  return 1 - kalanKare / toplamKare;
}

/** Katsayıları verilen polinomun x noktasındaki değeri (Horner). */
export function polinomDegeri(katsayilar: number[], x: number): number {
  let sonuc = 0;
  for (let i = katsayilar.length - 1; i >= 0; i--) sonuc = sonuc * x + katsayilar[i];
  return sonuc;
}

/**
 * Polinom noktaların HEPSİNDEN geçiyor mu? "Noktalardan tam geçiyor" yalnızca artıklar hesap gürültüsü
 * düzeyindeyken söylenir: R² = 0,9994 gibi 1'e çok yakın bir regresyon doğrusunda noktalar yine de doğrunun dışındadır.
 */
export function noktalardanTamGeciyor(points: Point2D[], katsayilar: number[]): boolean {
  const olcek = Math.max(1, ...points.map((p) => Math.abs(p.y)));
  return points.every((p) => Math.abs(polinomDegeri(katsayilar, p.x) - p.y) <= 1e-6 * olcek);
}

/**
 * Katsayıları, ifade ayrıştırıcısının anlayacağı bir metne çevirir: "2*x^2 - 3*x + 1".
 * Çok küçük katsayılar atılır; aksi hâlde "0.0000000001*x^3" gibi gürültü kalırdı.
 */
export function polynomialToExpression(katsayilar: number[], basamak = 4): string {
  const esik = 5e-7;
  const parcalar: string[] = [];
  for (let i = katsayilar.length - 1; i >= 0; i--) {
    const c = Number(katsayilar[i].toFixed(basamak));
    if (Math.abs(c) < esik) continue;
    const mutlak = Math.abs(c);
    const isaret = c < 0 ? '-' : '+';
    const govde = i === 0 ? `${mutlak}` : i === 1 ? `${mutlak}*x` : `${mutlak}*x^${i}`;
    parcalar.push(parcalar.length === 0 ? (c < 0 ? `-${govde}` : govde) : ` ${isaret} ${govde}`);
  }
  return parcalar.length ? parcalar.join('') : '0';
}
