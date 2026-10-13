// FONKSİYON İFADESİNİN OKUNUR YAZIMI (alan uzmanı, atölye 4. tur, satır 157)
//
// Fonksiyon ifadesi ayrıştırıcının anladığı biçimde saklanır ("2*x + 1", "x^2 - 4", "sqrt(x)"); ekranda (Nesneler,
// Cebir listesi, Bağlamlar, tuvaldeki grafik etiketi) okul yazımıyla gösterilir: "2x + 1", "x² − 4", "√x", "|x − 2|".
// Yalnız GÖRÜNÜM içindir: çıktı her zaman yeniden ayrıştırılabilir değildir ("x·x"), düzenleme kutusu saklanan
// ifadeyi kullanır.

const UST_RAKAM: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};
const ustSimge = (s: string) => [...s].map((c) => UST_RAKAM[c] ?? c).join('');

type Belirtec =
  | { t: 'sayi'; s: string }
  | { t: 'ad'; s: string }
  | { t: 'ust'; s: string } // çizilmiş üs: "²"
  | { t: 'op'; s: string };

const SAYI = /^(?:\d+(?:[.,]\d+)?|[.,]\d+)/;
const AD = /^[A-Za-zÇĞİÖŞÜçğıöşüπ_][A-Za-z0-9ÇĞİÖŞÜçğıöşü_]*/u;
const HAZIR_UST = /^[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+/u;

function belirtecler(ifade: string): Belirtec[] {
  const out: Belirtec[] = [];
  let s = ifade.replace(/\s+/g, '');
  while (s) {
    const sayi = SAYI.exec(s);
    if (sayi) { out.push({ t: 'sayi', s: sayi[0] }); s = s.slice(sayi[0].length); continue; }
    const ad = AD.exec(s);
    if (ad) { out.push({ t: 'ad', s: ad[0] }); s = s.slice(ad[0].length); continue; }
    const ust = HAZIR_UST.exec(s);
    if (ust) { out.push({ t: 'ust', s: ust[0] }); s = s.slice(ust[0].length); continue; }
    const c = s[0] === '−' ? '-' : s[0] === '×' || s[0] === '·' ? '*' : s[0];
    out.push({ t: 'op', s: c });
    s = s.slice(1);
  }
  return out;
}

/** i'deki açılış parantezinin kapanışı (yoksa -1). */
function kapanis(b: readonly Belirtec[], i: number): number {
  let derinlik = 0;
  for (let k = i; k < b.length; k++) {
    if (b[k].t !== 'op') continue;
    if (b[k].s === '(') derinlik++;
    else if (b[k].s === ')' && --derinlik === 0) return k;
  }
  return -1;
}

/** Değer biten bir parça mı (ardından gelen '-' ikili işlemdir)? Mutlak değer çizgileri '(' / ')' olarak tutulur. */
const degerBiter = (b: Belirtec | undefined) => !!b && (b.t !== 'op' || b.s === ')');

/**
 * Belirteç dizisini okunur metne çevirir. Kurallar:
 *   2*x → 2x · a*x → ax · 2*(…) → 2(…) · (…)*(…) → (…)(…) · öbür çarpımlar "·" (x·x, 2·3)
 *   x^2 → x², x^-1 → x⁻¹ (tam sayı üsler); x^(1/2) olduğu gibi
 *   sqrt(x) → √x, sqrt(x+1) → √(x + 1) · abs(…) → |…| · pi → π · 0.5 → 0,5
 *   ikili + ve − boşluklu ("x² − 4"), eksi işareti "−"
 */
function yaz(b: readonly Belirtec[]): string {
  let out = '';
  let mutlakDerinlik = 0;
  let sonBelirtec: Belirtec | undefined;
  const ekle = (metin: string, bel: Belirtec) => { out += metin; sonBelirtec = bel; };

  for (let i = 0; i < b.length; i++) {
    const x = b[i];
    if (x.t === 'sayi') { ekle(x.s.replace('.', ','), x); continue; }
    if (x.t === 'ust') { ekle(x.s, x); continue; }
    if (x.t === 'ad') {
      const ad = x.s.toLowerCase();
      const parantez = b[i + 1]?.t === 'op' && b[i + 1].s === '(';
      if ((ad === 'sqrt' || ad === 'abs') && parantez) {
        const son = kapanis(b, i + 1);
        if (son > 0) {
          const ic = b.slice(i + 2, son);
          const icMetin = yaz(ic);
          if (ad === 'abs') ekle(`|${icMetin}|`, { t: 'op', s: ')' });
          else ekle(ic.length === 1 && ic[0].t !== 'op' ? `√${icMetin}` : `√(${icMetin})`, { t: 'op', s: ')' });
          i = son;
          continue;
        }
      }
      ekle(ad === 'pi' ? 'π' : x.s, x);
      continue;
    }
    // İşleçler
    const s = x.s;
    if (s === '*') {
      const sol = b[i - 1];
      const sag = b[i + 1];
      const sagFonksiyon = sag?.t === 'ad' && b[i + 2]?.t === 'op' && b[i + 2].s === '(';
      const bitisik =
        !!sol && !!sag && (
          (sol.t === 'sayi' && (sag.t === 'ad' || (sag.t === 'op' && sag.s === '('))) ||
          ((sol.t === 'ad' || sol.t === 'ust') && sag.t === 'ad' && !sagFonksiyon && sag.s !== sol.s && sag.s.length === 1) ||
          ((sol.t === 'ad' || sol.t === 'ust' || (sol.t === 'op' && sol.s === ')')) && sag.t === 'op' && sag.s === '(')
        );
      if (!bitisik) ekle('·', x);
      continue;
    }
    if (s === '^') {
      // Tam sayı üs: x^2, x^-1, x^(2), x^(-3)
      let j = i + 1;
      let parantezli = false;
      if (b[j]?.t === 'op' && b[j].s === '(') { parantezli = true; j++; }
      let us = '';
      if (b[j]?.t === 'op' && b[j].s === '-') { us = '-'; j++; }
      if (b[j]?.t === 'sayi' && /^\d+$/.test(b[j].s)) {
        us += b[j].s;
        const kapandi = !parantezli || (b[j + 1]?.t === 'op' && b[j + 1].s === ')');
        if (kapandi) {
          ekle(ustSimge(us), { t: 'ust', s: us });
          i = parantezli ? j + 1 : j;
          continue;
        }
      }
      ekle('^', x);
      continue;
    }
    if (s === '+' || s === '-') {
      const ikili = degerBiter(sonBelirtec);
      const isaret = s === '-' ? '−' : '+';
      ekle(ikili ? ` ${isaret} ` : isaret, x);
      continue;
    }
    if (s === '|') {
      const kapanir = mutlakDerinlik > 0 && degerBiter(sonBelirtec);
      mutlakDerinlik += kapanir ? -1 : 1;
      ekle('|', { t: 'op', s: kapanir ? ')' : '(' });
      continue;
    }
    if (s === ',') { ekle('; ', x); continue; }
    ekle(s, x);
  }
  return out.replace(/ {2,}/g, ' ').trim();
}

/** "2*x + 1" → "2x + 1", "x^2 - 4" → "x² − 4", "sqrt(x)" → "√x" (yalnız görünüm). */
export function ifadeYazimi(ifade: string): string {
  if (!ifade || !ifade.trim()) return '';
  try {
    return yaz(belirtecler(ifade));
  } catch {
    return ifade;
  }
}

const AD_ETIKETI = /^\s*([A-Za-zÇĞİÖŞÜçğıöşü][A-Za-zÇĞİÖŞÜçğıöşü0-9]?)\s*\(\s*x\s*\)\s*=/i;

/**
 * Fonksiyonun ekrandaki adı ve denklemi: "f(x) = 2*x + 1" etiketli fonksiyon → "f(x) = 2x + 1";
 * "y = …" → "y = 2x + 1"; özel ad ("Parabol") olduğu gibi kalır; etiket yoksa "y = …".
 */
export function fonksiyonEtiketiYazimi(fn: { label?: string; expression: string }): string {
  const etiket = (fn.label ?? '').trim();
  const ad = AD_ETIKETI.exec(etiket);
  if (ad) return `${ad[1]}(x) = ${ifadeYazimi(fn.expression)}`;
  if (!etiket || /^\s*y\s*=/i.test(etiket)) return `y = ${ifadeYazimi(fn.expression)}`;
  return etiket;
}

/** Etiketteki fonksiyon adı ("f(x) = …" → "f(x)"); adsız fonksiyonda null. */
export function fonksiyonAdiYazimi(fn: { label?: string }): string | null {
  const ad = AD_ETIKETI.exec((fn.label ?? '').trim());
  return ad ? `${ad[1]}(x)` : null;
}
