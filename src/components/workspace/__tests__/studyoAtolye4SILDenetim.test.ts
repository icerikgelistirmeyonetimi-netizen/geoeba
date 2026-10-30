import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import { esitlikIsaretleri } from '@/math/esitlikIsaretleri';
import { regularPolygonVertices } from '@/math/regularPolygon';
import {
  adayiSina, ayniDogruMu, sekilUzerindeParca, sekilUzerindekiSimetriDogrusuMu, simetriDogrulari, simetriDogrusuMu,
} from '../simetriSinama';

/*
 * Atölye 4. tur SIL (ilkokul stüdyo, 176–180) — DENETÇİ düzeltmeleri:
 *  - [176] ilkokulda "4 br" ile "yaklaşık 4 br" kenarları eşitlik çentiğiyle eş gösterilmez (taban 4, yükseklik 4 ikizkenar
 *    üçgen eşkenar gibi işaretleniyordu). 2026-10-30'dan beri eşitlik her kademede gerçek ölçüyle kurulur: iki
 *    "yaklaşık 6 br" de eş değildir (kullanıcı: "ilkokulda yaklaşık eşitleri eşit çizgisiyle göstermesin").
 *  - [178] Simetri Keşfet "Bulunan" sayacı: yan yana şeklin aynı doğrultudaki simetri doğrusu sayılmaz; «Hepsini göster»in
 *    ekledikleri öğrencinin bulduklarına katılmaz; Düzgün Çokgen penceresinin 2 basamağa yuvarladığı köşelerde de sayı n;
 *    uzun dönüt metni çubuğu iki satıra kırıp şeklin üstüne indirmez.
 */

const P = (x: number, y: number) => ({ x, y });
const pt = (id: string, x: number, y: number) =>
  ({ id, type: 'point', label: id, showLabel: false, x, y, color: '#000', visible: true, isIndependent: true, createdAt: 0 }) as MathObject;
const poly = (id: string, ids: string[]) =>
  ({ id, type: 'polygon', label: id, showLabel: false, pointIds: ids, color: '#10b981', visible: true, createdAt: 0 }) as MathObject;

/** İşaretli kenar indisleri (çokgen ABC'de) ve grup sayısı */
const isaretliKenarlar = (objects: MathObject[]) => {
  const s = esitlikIsaretleri(objects);
  return { kenarlar: [...s.isaretliKenarlar].sort(), grup: s.gruplar.length };
};

describe('[176] denetim: kesin ve "yaklaşık" aynı tam sayı eş işaretlenmez', () => {
  // Uzmanın üçgeni: kenarlar 4, √20 ≈ 4,47, √20 — ilkokul tuvalinde "4 br", "yaklaşık 4 br", "yaklaşık 4 br"
  const ucgen = [pt('a', 0, 0), pt('b', 4, 0), pt('c', 2, 4), poly('ABC', ['a', 'b', 'c'])];

  it('yalnız iki eğik kenar eş; taban işaretsiz', () => {
    expect(isaretliKenarlar(ucgen)).toEqual({ kenarlar: ['ABC:1', 'ABC:2'], grup: 1 });
  });

  it('iki "yaklaşık 6 br" kenar eş değil (2026-10-30; 2026-09-25 kuralı kaldırıldı)', () => {
    // (0;0)–(6;1) = √37 ≈ 6,08; (6;1)–(3;6) = √34 ≈ 5,83; (3;6)–(0;0) = √45 ≈ 6,71
    const objects = [pt('a', 0, 0), pt('b', 6, 1), pt('c', 3, 6), poly('ABC', ['a', 'b', 'c'])];
    expect(isaretliKenarlar(objects)).toEqual({ kenarlar: [], grup: 0 });
  });

  it('kesin eş kenarlar eş (kare: dört kenar)', () => {
    const kare = [pt('a', 0, 0), pt('b', 3, 0), pt('c', 3, 3), pt('d', 0, 3), poly('K', ['a', 'b', 'c', 'd'])];
    expect(isaretliKenarlar(kare).kenarlar).toEqual(['K:0', 'K:1', 'K:2', 'K:3']);
  });

  it('Canvas eşitlik işaretlerine yazım ayarı vermez (kaynak)', () => {
    const canvas = readFileSync(path.resolve(__dirname, '..', 'Canvas.tsx'), 'utf8');
    expect(canvas).toContain('esitlikIsaretleri(objects, { otomatik: viewport.showEqualityMarks !== false })');
  });
});

describe('[178] denetim: "Bulunan" yalnız bu şeklin üzerinden geçen ve öğrencinin bulduğu simetri doğruları', () => {
  // Kare (6..9; 0..3) ve aynı yükseklikte dikdörtgen (-9..-5; 0..3): y = 1,5 ikisinin de simetri doğrusu
  const kare = [P(6, 0), P(9, 0), P(9, 3), P(6, 3)];
  const dikdortgen = [P(-9, 0), P(-5, 0), P(-5, 3), P(-9, 3)];
  const karedekiYatay = { a: P(5.2, 1.5), b: P(9.8, 1.5) };

  it('karenin üzerine çizilmiş yatay doğru kareye sayılır, dikdörtgene sayılmaz (doğrusu yine simetri doğrusu)', () => {
    expect(sekilUzerindekiSimetriDogrusuMu(kare, karedekiYatay)).toBe(true);
    expect(simetriDogrusuMu(dikdortgen, karedekiYatay)).toBe(true);
    expect(sekilUzerindekiSimetriDogrusuMu(dikdortgen, karedekiYatay)).toBe(false);
    expect(sekilUzerindekiSimetriDogrusuMu(dikdortgen, { a: P(-9.8, 1.5), b: P(-4.2, 1.5) })).toBe(true);
  });

  it('simetri doğrusu olmayan parça hiçbir şekle sayılmaz; ucu tam merkezde biten parça sayılır', () => {
    expect(sekilUzerindekiSimetriDogrusuMu(kare, { a: P(5, 1), b: P(10, 1) })).toBe(false);
    expect(sekilUzerindekiSimetriDogrusuMu(kare, { a: P(7.5, 1.5), b: P(7.5, 4) })).toBe(true);
  });

  it('çubuk öğrencinin bulduğunu sayar; Hepsini göster eklediklerini ayrı tutar (kaynak)', () => {
    const kaynak = readFileSync(path.resolve(__dirname, '..', 'SimetriSinamaArayuzu.tsx'), 'utf8');
    expect(kaynak).toContain('Bulunan: {sinama.ogrenciBulunan}');
    expect(kaynak).toContain('sekilUzerindekiSimetriDogrusuMu(koseler, d)');
    expect(kaynak).toMatch(/gosterilenlerRef\.current\.add\(id\)/);
    expect(kaynak).toContain('const bulunan = ogrenciBulunan;');
  });
});

describe('[178] denetim: Düzgün Çokgen penceresinin yuvarlanmış köşelerinde simetri doğrusu sayısı n; çubuk tek satır', () => {
  // RegularPolygonDialog köşeleri 2 basamağa yuvarlar (toFixed(2)); sınama payı bu yuvarlamayı karşılamalı
  const pencereKoseleri = (n: number, r: number) =>
    regularPolygonVertices(n, r, P(1, -2)).map((k) => P(Number(k.x.toFixed(2)), Number(k.y.toFixed(2))));

  it('n = 3…8, yarıçap 0,5…8: bütün simetri doğruları bulunur ve her biri Katla ile "dogru" çıkar', () => {
    // Eskiden: beşgen r = 1'de 9, yedigen r = 1'de 13 (aynı doğru iki kez), sekizgen r = 1,5'te 4 (pay dar)
    for (let n = 3; n <= 8; n++) {
      for (const r of [0.5, 1, 1.5, 2, 3, 5, 8]) {
        const k = pencereKoseleri(n, r);
        const dogrular = simetriDogrulari(k);
        expect(dogrular, `${n}-gen, r = ${r}`).toHaveLength(n);
        for (const d of dogrular) expect(adayiSina(k, d)).toBe('dogru');
      }
    }
  });

  it('tuvale 2 basamakla yazılan simetri doğrusu yine aynı doğru sayılır; komşu simetri doğrusuyla karışmaz', () => {
    const y2 = (v: number) => Number(v.toFixed(2));
    for (const [n, r] of [[5, 1], [7, 1], [8, 1.5], [6, 3]] as const) {
      const k = pencereKoseleri(n, r);
      const dogrular = simetriDogrulari(k);
      dogrular.forEach((d, i) => {
        const p = sekilUzerindeParca(k, d, 0.8);
        const tuvalde = { a: P(y2(p.a.x), y2(p.a.y)), b: P(y2(p.b.x), y2(p.b.y)) };
        expect(sekilUzerindekiSimetriDogrusuMu(k, tuvalde), `${n}-gen ${i}`).toBe(true);
        expect(dogrular.filter((x) => ayniDogruMu(tuvalde, x) && ayniDogruMu(x, tuvalde)), `${n}-gen ${i}`).toEqual([d]);
      });
    }
    // Simetri doğrusu olmayan yakın doğru (karenin ortasından 0,3 br kaymış) aynı sayılmaz
    expect(ayniDogruMu({ a: P(1.5, -1), b: P(1.5, 4) }, { a: P(1.8, -1), b: P(1.8, 4) })).toBe(false);
  });

  it('dönüt metni sınırlı genişlikte kendi içinde kırılır (düğmeler aynı satırda kalır; kaynak)', () => {
    const kaynak = readFileSync(path.resolve(__dirname, '..', 'SimetriSinamaArayuzu.tsx'), 'utf8');
    expect(kaynak).toMatch(/<div className="min-w-0 max-w-\[28rem\]" data-simetri-sinama-metni>\s*<CubukMetni/);
  });
});
