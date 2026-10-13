// FONKSİYON GRAFİĞİNİN ÖRNEKLENMESİ: süreksizlikte çizgi kesilir (alan uzmanı, atölye 4. tur, satır 157:
// "f(x)=1/x grafiğinde x=0'da iki kol dikey bir çizgiyle birleştiriliyor").
//
// Eski yöntem yalnız "işaret değişimi + görünür yüksekliğin yarısından büyük sıçrama" gördüğünde kutup arıyordu;
// uzaklaşınca (ya da x = 0 tam örneklenmediğinde) 1/x'in iki kolu arasındaki sıçrama bu eşiğin altında kalıyor,
// kollar dikey bir çizgiyle birleşiyordu. Şimdi şüpheli her aralık ikiye bölünerek daraltılır: sürekli bir
// fonksiyonda aralık küçüldükçe fark sıfıra iner; kutupta ya da sıçramada inmez. Kesilen kollar kutba kadar uzatılır
// (ekran dışına), basamak fonksiyonunda dikey basamak çizilmez.

export interface DunyaKutusu { minX: number; maxX: number; minY: number; maxY: number }
export interface Ornek { x: number; y: number }

/** Kutupta kolun ucu: yalnız ekran dışına taşacak kadar uzatılır (SVG çok büyük sayılarla bozulmasın). */
const KIRPMA_KATI = 3;

/** Aralık ikiye bölünerek daraltılır; sürekli fonksiyonda iki uç arasındaki fark eşiğin altına iner. */
const BOLME_SAYISI = 48;

/**
 * (x0, y0) – (x1, y1) arasında süreksizlik var mı? Varsa sol kolun son ve sağ kolun ilk örneği
 * (aralık daraltıldıktan sonra) döner; yoksa null.
 */
export function sureksizlikAra(
  f: (x: number) => number,
  x0: number, y0: number, x1: number, y1: number,
  esik: number,
): { sol: Ornek; sag: Ornek } | null {
  let a = x0, fa = y0, b = x1, fb = y1;
  for (let k = 0; k < BOLME_SAYISI; k++) {
    const m = (a + b) / 2;
    if (!(m > a && m < b)) break; // kayan nokta sınırı
    const fm = f(m);
    if (!Number.isFinite(fm)) {
      // Tanımsız nokta (1/x'te x = 0): iki kol ayrı; her kol tanımlı olduğu son yere kadar uzatılır
      return { sol: tanimSiniri(f, a, fa, m), sag: tanimSiniri(f, b, fb, m) };
    }
    const d1 = Math.abs(fm - fa);
    const d2 = Math.abs(fb - fm);
    if (Math.max(d1, d2) < esik) return null; // sürekli
    if (d1 >= d2) { b = m; fb = fm; } else { a = m; fa = fm; }
  }
  return Math.abs(fb - fa) >= esik ? { sol: { x: a, y: fa }, sag: { x: b, y: fb } } : null;
}

/** Tanımlı uçtan (x, y) tanımsız noktaya (t) doğru yaklaşıp tanımlı son örneği verir. */
function tanimSiniri(f: (x: number) => number, x: number, y: number, t: number): Ornek {
  let iyi = { x, y };
  let kotu = t;
  for (let k = 0; k < BOLME_SAYISI; k++) {
    const m = (iyi.x + kotu) / 2;
    if (m === iyi.x || m === kotu) break;
    const fm = f(m);
    if (Number.isFinite(fm)) iyi = { x: m, y: fm };
    else kotu = m;
  }
  return iyi;
}

/**
 * Görünür aralıkta fonksiyonu örnekler, tanımsız yerlerde ve süreksizliklerde ayrı parçalara böler.
 * y değerleri görünür yüksekliğin KIRPMA_KATI katı kadar dışarıda kırpılır (çizgi ekran dışına çıkar).
 */
export function fonksiyonParcalari(f: (x: number) => number, kutu: DunyaKutusu, ornekSayisi: number): Ornek[][] {
  const n = Math.max(2, Math.floor(ornekSayisi));
  const dx = (kutu.maxX - kutu.minX) / n;
  const yukseklik = Math.max(kutu.maxY - kutu.minY, 1e-6);
  const sinir = yukseklik * KIRPMA_KATI;
  const kirp = (y: number) => Math.max(kutu.minY - sinir, Math.min(kutu.maxY + sinir, y));
  // Sürekli sayılmak için iki örnek arasındaki fark bu kadar küçülmeli (görünür yüksekliğin %1'i)
  const esik = yukseklik * 0.01;
  // Bu kadar sıçrayan (ya da işaret değiştiren) komşu örnekler arasına bakılır
  const supheliSicrama = yukseklik * 0.25;

  const parcalar: Ornek[][] = [];
  let parca: Ornek[] = [];
  let onceki: Ornek | null = null;
  const bitir = () => {
    if (parca.length > 0) parcalar.push(parca);
    parca = [];
  };

  for (let i = 0; i <= n; i++) {
    const x = kutu.minX + i * dx;
    const y = f(x);
    if (!Number.isFinite(y)) {
      bitir();
      onceki = null;
      continue;
    }
    if (onceki) {
      const isaretDegisti = onceki.y * y < 0;
      const sicrama = Math.abs(y - onceki.y) > supheliSicrama;
      // İki örnek de görünür alanın aynı yanında dışarıdaysa aradaki çizgi zaten görünmez
      const ikisiUstte = onceki.y > kutu.maxY && y > kutu.maxY;
      const ikisiAltta = onceki.y < kutu.minY && y < kutu.minY;
      if ((isaretDegisti || sicrama) && !ikisiUstte && !ikisiAltta) {
        const kopma = sureksizlikAra(f, onceki.x, onceki.y, x, y, esik);
        if (kopma) {
          if (kopma.sol.x > onceki.x) parca.push({ x: kopma.sol.x, y: kirp(kopma.sol.y) });
          bitir();
          if (kopma.sag.x < x) parca.push({ x: kopma.sag.x, y: kirp(kopma.sag.y) });
        }
      }
    }
    parca.push({ x, y: kirp(y) });
    onceki = { x, y };
  }
  bitir();
  return parcalar;
}

/** Parçalardan SVG yolu (dünya → ekran dönüşümüyle). */
export function parcalardanYol(parcalar: readonly Ornek[][], ekrana: (p: Ornek) => Ornek): string {
  let d = '';
  for (const parca of parcalar) {
    parca.forEach((p, i) => {
      const s = ekrana(p);
      d += `${i === 0 ? 'M' : 'L'} ${s.x} ${s.y} `;
    });
  }
  return d;
}
