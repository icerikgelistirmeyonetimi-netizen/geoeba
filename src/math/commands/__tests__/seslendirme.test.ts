import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import { duzMetin, latex, latexDenetle, metniCozumle, metniSeslendir } from '@/math/matematikYazimi';
import { runCommand } from '../engine';
import { CommandScene } from '../scene';
import { CEVAP_ORNEKLERI } from './yanitOrnekleri';

/**
 * Komut yanıtlarının ve ipuçlarının yazım güvencesi: ekran okuyucu hiçbir sembol duymaz, metin pano ve
 * panel yolunda bozulmaz, "LaTeX kopyala" geçerli LaTeX verir. Yeni bir yanıt biçimi eklendiğinde
 * örneği yanitOrnekleri.ts'e eklenir.
 */

/** Sesli okunuşta kalmaması gereken semboller (U+0302 şapka, U+0361 yay dahil). */
const SEMBOL = /[|∠≈=°²³̂͡△⌢π]/u;
/** "m(" ölçü öneki ve yalın birim kısaltmaları sözcüğe çevrilmiş olmalı. */
const OLCU_ONEKI = /\bm\(/;
const KISALTMA = /(?<!\p{L})(br|cm)(?!\p{L})/u;

describe('yanıt yazımı: sesli okunuş', () => {
  it.each(CEVAP_ORNEKLERI)('sembolsüz okunur: %s', (metin) => {
    const sesli = metniSeslendir(metin);
    expect(sesli).not.toMatch(SEMBOL);
    expect(sesli).not.toMatch(OLCU_ONEKI);
    expect(sesli).not.toMatch(KISALTMA);
    expect(sesli).not.toContain('/');
    expect(sesli.trim()).not.toBe('');
  });

  it.each([
    ['A(ABC) = 6 br², Ç(ABC) = 12 br.', 'a be ce üçgeninin alanı altı birimkare, a be ce üçgeninin çevresi on iki birim.'],
    ['|B͡C| ≈ 3,14 br. m(B͡C) = 90°.', 'be ce yayının uzunluğu yaklaşık üç virgül on dört birim. be ce yayının ölçüsü doksan derece.'],
    ['r = |OA| = 3 br', 'yarıçap, o a uzunluğu üç birim'],
    ['m(∠ABC) = 300° (dış açı)', 'a be ce açısının ölçüsü üç yüz derece (dış açı)'],
    ['|AB| = 4 br.', 'a be uzunluğu dört birim.'],
    ['A(2; -3) noktası oluşturuldu.', 'a noktası, iki ve eksi üç, oluşturuldu.'],
    ['UV doğrusu çizildi.', 'u vi doğrusu çizildi.'],
    ['MEB müfredatına uygun 2. sınıf örneği.', 'MEB müfredatına uygun ikinci sınıf örneği.'],
  ])('okunuş: %s', (metin, beklenen) => {
    expect(metniSeslendir(metin)).toBe(beklenen);
  });
});

// Fikstürün eskimemesi için aynı güvenceler MOTORUN ürettiği yanıtlara da uygulanır.
const kur = (fn: (s: CommandScene) => void): MathObject[] => { const s = new CommandScene([]); fn(s); s.resolve(); return s.objects; };
const ucgen = () => kur(s => {
  const A = s.addPoint({ x: 0, y: 0 }, { label: 'A' }), B = s.addPoint({ x: 4, y: 0 }, { label: 'B' }), C = s.addPoint({ x: 0, y: 3 }, { label: 'C' });
  s.addPolygon([A.id, B.id, C.id], { kind: 'triangle' });
});
const cember = () => kur(s => { const M = s.addPoint({ x: 1, y: -2 }, { label: 'M' }); s.addCircle({ centerId: M.id, radius: 3 }, { label: 'c1' }); });
const yay = () => kur(s => {
  const M = s.addPoint({ x: 0, y: 0 }, { label: 'M' }), S = s.addPoint({ x: 2, y: 0 }, { label: 'S' }), D = s.addPoint({ x: 0, y: 2 }, { label: 'D' });
  s.addArc(M.id, S.id, D.id);
});

describe('yanıt yazımı: motorun ürettiği yanıtlar', () => {
  it.each<[string, () => MathObject[]]>([
    ['ABC üçgeninin alanını ve çevresini hesapla', ucgen],
    ['üçgenin tüm kenarlarını ölç', ucgen],
    ['A ile B arasındaki mesafe kaç', ucgen],
    ['üçgenin tüm açılarını göster', ucgen],
    ['B açısının trigonometrik oranları', ucgen],
    ['ABC nin ölçülerini göster', ucgen],
    ['çemberin alanını hesapla', cember],
    ['çemberin yarıçapı kaç', cember],
    ['yayın tüm ölçülerini göster', yay],
    ['merkez açısı kaç derece', yay],
  ])('sembolsüz okunur ve geçerli LaTeX verir: “%s”', (metin, sahne) => {
    const r = runCommand(metin, sahne());
    expect(r.ok).toBe(true);
    const sesli = metniSeslendir(r.message);
    expect(sesli).not.toMatch(SEMBOL);
    expect(sesli).not.toMatch(OLCU_ONEKI);
    expect(sesli).not.toMatch(KISALTMA);
    expect(duzMetin(metniCozumle(r.message))).toBe(r.message);
    expect(latexDenetle(latex(metniCozumle(r.message)))).toEqual([]);
  });
});

describe('yanıt yazımı: düz metin ve LaTeX', () => {
  it.each(CEVAP_ORNEKLERI)('düz metne aynen döner: %s', (metin) => {
    expect(duzMetin(metniCozumle(metin))).toBe(metin);
  });

  it.each(CEVAP_ORNEKLERI)('geçerli LaTeX üretir: %s', (metin) => {
    expect(latexDenetle(latex(metniCozumle(metin)))).toEqual([]);
  });
});
