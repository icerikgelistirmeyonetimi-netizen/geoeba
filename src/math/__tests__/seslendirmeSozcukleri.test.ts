/**
 * EKRAN OKUYUCU SÖZCÜKLERİ — arayüz cümlelerinin sesli biçimi.
 *
 * 50 aracın taramasında (2026-09-25) ölçülen üç kusur burada kilitlenir:
 *  1. Vurgu için BÜYÜK yazılan Türkçe sözcükler harf harf okunuyordu:
 *     "İki FARKLI şekil seçmelisiniz." → "iki fe a re ke le ı şekil seçmelisiniz."
 *  2. "[AB] parçasının" → "a be doğru parçası parçasının" (sözcük iki kez).
 *  3. "2:1 oranında" → "iki:bir oranında" (iki nokta hiç okunmuyordu).
 *
 * Ayrıca KAYNAK TARAMASI: çizim tarafındaki Türkçe cümlelerde geçen her büyük harf dizisi ya bir
 * nokta adı (beyaz liste), ya bir kısaltma ya da bir vurgu sözcüğü olmalı. Yeni bir vurgu sözcüğü
 * yazıldığında listeye eklenmezse bu test düşer ve ekran okuyucuda heceleme geri gelmez.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { metniSeslendir, KISALTMALAR, VURGU_SOZCUKLERI } from '../matematikYazimi';

describe('vurgu sözcükleri harf harf okunmaz', () => {
  it('"İki FARKLI şekil" sözcük olarak okunur', () => {
    const s = metniSeslendir('İki FARKLI şekil seçmelisiniz.');
    expect(s).toContain('farklı');
    expect(s).not.toContain('fe a re');
  });

  it('"NOKTA değil" ve "NOKTALARA tıklayın" sözcük olarak okunur', () => {
    expect(metniSeslendir('Kesiştirmek için NOKTA değil, iki şekle tıklayın.')).toContain('nokta değil');
    expect(metniSeslendir('Yay Ölç: üzerindeki NOKTALARA tıklayın.')).toContain('noktalara tıklayın');
  });

  it('"KAYDIRICI veya FONKSİYON" sözcük olarak okunur', () => {
    const s = metniSeslendir('Önce bir KAYDIRICI veya FONKSİYON seçin, sonra tıklayın.');
    expect(s).toContain('kaydırıcı veya fonksiyon');
    expect(s).not.toContain('ke a ye');
  });

  it('kısaltmalar olduğu gibi kalır, nokta adları hâlâ harf harf okunur', () => {
    expect(metniSeslendir('MEB kazanımı')).toContain('MEB');
    expect(metniSeslendir('|AB| = 5 br')).toContain('a be');
    expect(metniSeslendir('ABC üçgeni')).toContain('a be ce');
  });
});

describe('sözcük yinelemesi ve oran', () => {
  it('"[AB] parçasının" tek kez "parçası" okur', () => {
    const s = metniSeslendir('E, [AB] parçasının orta noktasıdır.');
    expect(s).toContain('a be doğru parçasının orta noktasıdır');
    expect(s).not.toContain('parçası parçası');
  });

  it('"[AB] doğru parçası" yinelemesi de korunur', () => {
    expect(metniSeslendir('[AB] doğru parçası çizildi.')).toBe('a be doğru parçası çizildi.');
  });

  it('oran iki nokta ile yazılınca "bölü" okunur', () => {
    const s = metniSeslendir('E, [AB] parçasını 2:1 oranında böler.');
    expect(s).toContain('iki bölü bir oranında');
    expect(s).not.toContain(':');
  });

  it('cümle içindeki iki nokta okunmaz (oran değil)', () => {
    expect(metniSeslendir('Uzunluk ölçümü: |AB| = 5 br')).not.toContain('bölü');
  });
});

// ------------------------------------------------------------------ kaynak taraması

/** Örnek/komut metinlerinde geçen gerçek nokta adları. Yeni ad eklerken buraya da yazılır. */
const AD_BEYAZ_LISTESI = new Set([
  'AB', 'AC', 'AD', 'BC', 'BD', 'CD', 'DE', 'EF', 'ABC', 'BCD', 'DEF', 'PQR', 'ABCD', 'ABCDE',
]);

const KOKLER = ['src/components/workspace', 'src/math', 'src/state', 'src/components/ui'];
const CAPS = /(?<![\p{L}\d_])[A-ZÇĞİÖŞÜ]{2,}(?![\p{Ll}\d_])/gu;

/** Türkçe cümle mi? (sınıf adı, düzenli ifade, kod parçası, tek sözcüklük anahtar değil) */
function cumleMi(t: string): boolean {
  if (!/ /.test(t)) return false;
  if ((t.match(/[a-zçğıöşü]/g) || []).length < 8) return false;
  if (/[<>{}]|className|_[A-Z]|\bimport\b/.test(t)) return false;
  // Düzenli ifade gövdesi: karakter kümesi, kaçış ya da bağlaç — cümle değildir
  return !/\\|\[\^|\[a-z|\[A-Z|\]\*|\$$/.test(t);
}

/** Bir kaynak satırındaki dizgilerde geçen büyük harf dizileri. */
export function satirdakiVurgular(satir: string): string[] {
  if (/^\s*(\*|\/\/)/.test(satir)) return [];
  const bulunan: string[] = [];
  for (const m of satir.matchAll(/(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g)) {
    if (!cumleMi(m[2])) continue;
    bulunan.push(...(m[2].match(CAPS) || []));
  }
  return bulunan;
}

function kaynakDosyalari(kok: string): string[] {
  if (!fs.existsSync(kok)) return [];
  const cikti: string[] = [];
  for (const g of fs.readdirSync(kok, { withFileTypes: true })) {
    const p = path.join(kok, g.name);
    if (g.isDirectory()) { if (g.name !== '__tests__') cikti.push(...kaynakDosyalari(p)); }
    else if (/\.(ts|tsx)$/.test(g.name) && !/\.test\./.test(g.name)) cikti.push(p);
  }
  return cikti;
}

describe('kaynak taraması: bilinmeyen büyük harf dizisi kalmasın', () => {
  it('tarayıcı planlanmış bir kusuru yakalar (kendi kendini sınar)', () => {
    expect(satirdakiVurgular(`  setHintMessage('İki ŞAŞIRTICI şekil seçmelisiniz zaten.');`)).toEqual(['ŞAŞIRTICI']);
    expect(satirdakiVurgular(`  // İki ŞAŞIRTICI şekil seçmelisiniz zaten.`)).toEqual([]);
    expect(satirdakiVurgular(`  const a = 'flex items-center rounded-xl text-[11px] padding';`)).toEqual([]);
  });

  it('her büyük harf dizisi ad, kısaltma ya da vurgu sözcüğüdür', () => {
    const bilinmeyen = new Map<string, string>();
    for (const kok of KOKLER) {
      for (const p of kaynakDosyalari(kok)) {
        fs.readFileSync(p, 'utf8').split('\n').forEach((satir, i) => {
          for (const w of satirdakiVurgular(satir)) {
            if (AD_BEYAZ_LISTESI.has(w) || KISALTMALAR.has(w) || VURGU_SOZCUKLERI.has(w)) continue;
            if (!bilinmeyen.has(w)) bilinmeyen.set(w, `${p}:${i + 1}`);
          }
        });
      }
    }
    expect([...bilinmeyen].map(([w, y]) => `${w} (${y})`)).toEqual([]);
  });
});
