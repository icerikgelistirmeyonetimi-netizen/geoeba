/**
 * Düzlem homografisi: (0,0), (W,0), (W,H), (0,H) dikdörtgenini verilen dört köşeye
 * (TL, TR, BR, BL; CSS px) taşıyan CSS `matrix3d(...)` değeri. 3B tahtadaki ekran
 * DOM olarak çizilir ve her karede bu dönüşümle ekran dörtgenine oturtulur.
 *
 * Saf modül; DOM'a dokunmaz.
 */

export type Kose = [number, number];

/** Satır-öncelikli 3×3 homografi: [a, b, c, d, e, f, g, h, 1] */
export type Homografi = [number, number, number, number, number, number, number, number, number];

const EPS = 1e-12;

/** Gauss eliminasyonu (kısmi pivotlama). Tekilse null. */
function coz(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((satir, i) => [...satir, b[i]]);
  for (let s = 0; s < n; s++) {
    let pivot = s;
    for (let i = s + 1; i < n; i++) if (Math.abs(M[i][s]) > Math.abs(M[pivot][s])) pivot = i;
    if (Math.abs(M[pivot][s]) < EPS) return null;
    if (pivot !== s) [M[s], M[pivot]] = [M[pivot], M[s]];
    for (let i = 0; i < n; i++) {
      if (i === s) continue;
      const k = M[i][s] / M[s][s];
      if (k === 0) continue;
      for (let j = s; j <= n; j++) M[i][j] -= k * M[s][j];
    }
  }
  return M.map((satir, i) => satir[n] / satir[i]);
}

/**
 * Birim kareyi (0,0),(1,0),(1,1),(0,1) → köşelere taşıyan homografi.
 * 8 bilinmeyenli doğrusal sistem: her köşe için
 *   a·x + b·y + c − g·x·X − h·y·X = X
 *   d·x + e·y + f − g·x·Y − h·y·Y = Y
 */
function birimKareHomografisi(koseler: readonly Kose[]): Homografi | null {
  const kaynak: Kose[] = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = kaynak[i];
    const [X, Y] = koseler[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }
  const c = coz(A, b);
  if (!c || c.some((v) => !Number.isFinite(v))) return null;
  return [c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], 1];
}

/**
 * (0,0),(W,0),(W,H),(0,H) → köşeler homografisi (3×3, satır-öncelikli).
 * Dejenere köşeler (çakışık, doğrusal, sıfır boyut) için null.
 */
export function homografiMatrisi(genislik: number, yukseklik: number, koseler: readonly Kose[]): Homografi | null {
  if (!(genislik > 0) || !(yukseklik > 0) || koseler.length !== 4) return null;
  if (koseler.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) return null;
  const H = birimKareHomografisi(koseler);
  if (!H) return null;
  // Önce (x/W, y/H) ölçeği: H · diag(1/W, 1/H, 1)
  const sx = 1 / genislik;
  const sy = 1 / yukseklik;
  const M: Homografi = [H[0] * sx, H[1] * sy, H[2], H[3] * sx, H[4] * sy, H[5], H[6] * sx, H[7] * sy, 1];
  // Dejenere dörtgen: izdüşümün determinantı sıfıra yakınsa (alan yok) reddedilir
  const det = M[0] * (M[4] * M[8] - M[5] * M[7]) - M[1] * (M[3] * M[8] - M[5] * M[6]) + M[2] * (M[3] * M[7] - M[4] * M[6]);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-9) return null;
  return M;
}

/** Homografiyi bir noktaya uygular (testler ve doğrulama için). */
export function homografiUygula(M: Homografi, x: number, y: number): Kose {
  const w = M[6] * x + M[7] * y + M[8];
  return [(M[0] * x + M[1] * y + M[2]) / w, (M[3] * x + M[4] * y + M[5]) / w];
}

/**
 * Sayı → CSS metni: çok küçük değerler 0'a yuvarlanır; üstel gösterim hiç üretilmez (CSS
 * "1e-7" kabul etse de metin işleme hatasına açıktır). İzdüşüm satırı (g, h) 1e-5…1e-7
 * ölçeğindedir; 12 ondalık bu değerleri anlamlı basamaklarıyla korur.
 */
function sayi(v: number): string {
  if (Math.abs(v) < 1e-12) return '0';
  const metin = v.toFixed(12).replace(/\.?0+$/, '');
  return metin === '-0' ? '0' : metin;
}

/**
 * CSS `matrix3d(...)` değeri (sütun-öncelikli 4×4; z ekseni birim).
 * 3×3 H = [a b c; d e f; g h 1] → matrix3d(a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1).
 * Çözüm yoksa 'none'.
 */
export function homografi(genislik: number, yukseklik: number, koseler: readonly Kose[]): string {
  const M = homografiMatrisi(genislik, yukseklik, koseler);
  if (!M) return 'none';
  const [a, b, c, d, e, f, g, h] = M;
  return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, 1].map(sayi).join(', ')})`;
}
