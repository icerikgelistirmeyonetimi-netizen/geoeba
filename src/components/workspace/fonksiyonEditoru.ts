export type IfadeDuzenleme =
  | 'karekok' | 'kupkok' | 'kok' | 'kare' | 'us' | 'kesir' | 'mutlak' | 'parantez'
  | 'x' | 'pi' | 'e' | 'arti' | 'eksi' | 'carpi' | 'bolu'
  | 'sin' | 'cos' | 'tan' | 'cot' | 'sind' | 'cosd' | 'tand' | 'cotd'
  | 'asin' | 'acos' | 'atan' | 'ln' | 'log';

interface IfadeSecimi {
  ifade: string;
  bas: number;
  son: number;
}

/** Metnin dışına çıkan ya da ters verilen seçim aralığını normalleştirir. */
function secimSinirlariniDuzelt(ifade: string, bas: number, son: number): { bas: number; son: number } {
  const sinirla = (konum: number) => Math.min(ifade.length, Math.max(0, Number.isNaN(konum) ? 0 : Math.trunc(konum)));
  const ilk = sinirla(bas);
  const sonuncu = sinirla(son);
  return { bas: Math.min(ilk, sonuncu), son: Math.max(ilk, sonuncu) };
}

/** Metni seçili aralığın yerine ekler ve imleci eklenen metnin sonuna taşır. */
export function ifadeyeMetinEkle(ifade: string, bas: number, son: number, metin: string): IfadeSecimi {
  const secim = secimSinirlariniDuzelt(ifade, bas, son);
  const imlec = secim.bas + metin.length;
  return { ifade: ifade.slice(0, secim.bas) + metin + ifade.slice(secim.son), bas: imlec, son: imlec };
}

/** Seçili aralığı, seçim yoksa imlecin solundaki karakteri siler. */
export function ifadedenGeriSil(ifade: string, bas: number, son: number): IfadeSecimi {
  const secim = secimSinirlariniDuzelt(ifade, bas, son);
  const silmeBasi = secim.bas === secim.son ? Math.max(0, secim.bas - 1) : secim.bas;
  return ifadeyeMetinEkle(ifade, silmeBasi, secim.son, '');
}

/** İmlecin hemen solunda üssü alınabilecek bir sayı, değişken veya kapalı parantez var mı? */
function soldaIslenenVar(metin: string): boolean {
  const sol = metin.trimEnd();
  if (/[\p{L}\p{N})²³]$/u.test(sol)) return true;
  // Mutlak değerin kapanış çubuğu da bir işleneni tamamlar; açılış çubuğu tamamlamaz.
  return sol.endsWith('|') && (sol.match(/\|/g)?.length ?? 0) % 2 === 0;
}

/**
 * Şablonu seçimin yerine ekler; kök ve benzeri şablonlar seçili ifadeyi koruyarak sarar.
 * Boş şablonlarda dönüşteki seçim, kullanıcının ilk dolduracağı alanın içindedir.
 */
export function ifadeyeSablonEkle(
  ifade: string,
  bas: number,
  son: number,
  eylem: IfadeDuzenleme
): IfadeSecimi {
  const { bas: secimBasi, son: secimSonu } = secimSinirlariniDuzelt(ifade, bas, son);
  const secili = ifade.slice(secimBasi, secimSonu);
  const sol = ifade.slice(0, secimBasi);
  const sag = ifade.slice(secimSonu);

  const ekle = (metin: string, imlec = metin.length, secimBitisi = imlec): IfadeSecimi => ({
    ifade: sol + metin + sag,
    bas: secimBasi + imlec,
    son: secimBasi + secimBitisi,
  });

  const sar = (on: string, arka: string) => ekle(on + secili + arka, secili ? on.length + secili.length + arka.length : on.length);

  switch (eylem) {
    case 'karekok': return sar('sqrt(', ')');
    case 'kupkok': return sar('cbrt(', ')');
    case 'kok': {
      const kokIci = secili || 'x';
      const ayirici = kokIci.includes(',') ? ';' : ',';
      const dereceBasi = 6 + kokIci.length;
      return ekle(`root(${kokIci}${ayirici}2)`, dereceBasi, dereceBasi + 1);
    }
    case 'mutlak': return sar('abs(', ')');
    case 'parantez': return sar('(', ')');
    case 'sin': case 'cos': case 'tan': case 'cot':
    case 'sind': case 'cosd': case 'tand': case 'cotd':
    case 'asin': case 'acos': case 'atan': case 'ln': case 'log': return sar(`${eylem}(`, ')');
    case 'kesir': return secili ? ekle(`(${secili})/()`, secili.length + 4) : ekle('()/()', 1);
    case 'us':
      if (secili) return ekle(`(${secili})^()`, secili.length + 4);
      return soldaIslenenVar(sol) ? ekle('^()', 2) : ekle('()^()', 1);
    case 'kare':
      if (secili) return ekle(`(${secili})^2`);
      return soldaIslenenVar(sol) ? ekle('^2') : ekle('()^2', 1);
    case 'x': return ekle('x');
    case 'pi': return ekle('pi');
    case 'e': return ekle('e');
    case 'arti': return ekle('+');
    case 'eksi': return ekle('-');
    case 'carpi': return ekle('*');
    case 'bolu': return ekle('/');
  }
}
