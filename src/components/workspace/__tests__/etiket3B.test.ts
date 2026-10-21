import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  ACIK_TEMA_3B,
  KOYU_TEMA_3B,
  EtiketDokuOnbellegi,
  ayritOlcusuYazisi,
  dokuAnahtari,
  dokuPikseli,
  eksenAdiCizimi,
  eksenEtiketleri3B,
  eksenSayisiCizimi,
  eksenSayisiKati,
  eksenSayisiKaymasi,
  ekranPikseliOlcegi,
  etiketOlcusu3B,
  etiketiCiz,
  hslBelirteci,
  noktaAdiBoslugu,
  noktaAdiCizimi,
  orijinCizimi,
  pikseleOturt,
  spriteMerkezi,
  yuzAlaniYazisi,
  EKSEN_SAYISI_ARASI,
  type EtiketBilgisi3B,
  type EtiketCizimi,
} from '../etiket3B';
import { DEFAULT_STYLE_SETTINGS, type StyleSettings } from '@/types/workspace';
import { yazimAyari } from '@/math/matematikYazimi';
import { metinGenisligi } from '@/math/yaziGenisligi';
import { tamSayiOlcuEtkin } from '../olcuYuvarlama';
import { ilkokulUzunlukMetni } from '../ilkokulKipi';
import { KOSE_BOSLUGU } from '../noktaAdi';
import type { KademeDuzeyi } from '../kademeDuzeyleri';

/**
 * 3B etiketleri 2B standardında (kullanıcı, 14.10.2026: "atölye serbest çizimde 3b etiket yazı özellikleri 2b ile aynı
 * değil aynı standartlar orada da olmalı").
 */
// Ölçek matematiği birim çarpanlarla sınanır; ürünün okunaklı açılış ölçekleri farklı olabilir.
const S: StyleSettings = { ...DEFAULT_STYLE_SETTINGS, pointLabelScale: 1, measurementScale: 1, axisScale: 1 };
const RENKLER = { x: '#ef4444', y: '#10b981', z: '#3b82f6' } as const;
const UZUNLUKLAR = { x: { arti: 16, eksi: 16 }, y: { arti: 16, eksi: 16 }, z: { arti: 14, eksi: 6 } } as const;
const ayar = (kademe: KademeDuzeyi, s: StyleSettings = S) => ({ ...yazimAyari(s), tamSayi: tamSayiOlcuEtkin(s, kademe) });

describe('3B etiket: yazım (alt indis, kesme işareti, sayı, birim)', () => {
  it('nokta adı 2B gibi: A_1 → A + 0,68 boyda aşağı kaymış 1; B\' → B′', () => {
    const c = noktaAdiCizimi('A_1', S, ACIK_TEMA_3B);
    const p = etiketOlcusu3B(c).duzen.parcalar;
    expect(p.map((x) => x.s)).toEqual(['A', '1']);
    expect(p[0].px).toBe(12);
    expect(p[1].px).toBeCloseTo(12 * 0.68, 5);
    expect(p[1].dy).toBeGreaterThan(0);
    expect(etiketOlcusu3B(noktaAdiCizimi("B'", S, ACIK_TEMA_3B)).duzen.parcalar.map((x) => x.s).join('')).toBe('B′');
    expect(etiketOlcusu3B(noktaAdiCizimi("C_2'", S, ACIK_TEMA_3B)).duzen.parcalar.map((x) => x.s)).toEqual(['C', '2', '′']);
  });

  it('nokta adı: kalın (700) Manrope, ön plan rengi, gölgeli, halesiz; koordinat soluk ekte', () => {
    const c = noktaAdiCizimi('A', S, KOYU_TEMA_3B, '(1; 2; 0,5)');
    expect(c).toMatchObject({ agirlik: 700, aile: 'sans', renk: KOYU_TEMA_3B.yazi, golge: true });
    expect(c.hale ?? null).toBeNull();
    expect(c.ek).toMatchObject({ metin: ' (1; 2; 0,5)', px: 10, renk: KOYU_TEMA_3B.soluk });
  });

  it('eksen sayısı 2B gibi: formatTurkishNumber, kalın, ön plan %80, zemin halesi 3 px', () => {
    const c = eksenSayisiCizimi(-3, S, ACIK_TEMA_3B);
    expect(c.dugumler).toEqual([{ t: 'sembol', s: '-3' }]);
    expect(c).toMatchObject({ px: 11, agirlik: 700, renk: ACIK_TEMA_3B.yazi, opaklik: 0.8, hale: { renk: ACIK_TEMA_3B.zemin, kalinlik: 3 } });
  });

  it('eksen adı rozeti eksen renginde, beyaz en kalın yazı; orijin rozeti beyaz, gri çerçeve, eş aralıklı', () => {
    expect(eksenAdiCizimi('+x', '#ef4444', S)).toMatchObject({ px: 12, agirlik: 900, renk: '#ffffff', rozet: { genislik: 36, yukseklik: 20, rx: 6, dolgu: '#ef4444' } });
    expect(orijinCizimi('(0; 0; 0)', S)).toMatchObject({ px: 11, agirlik: 900, aile: 'mono', renk: '#737373', rozet: { dolgu: '#ffffff', cizgi: '#737373', cizgiKalinligi: 1.5 } });
  });

  it('ayrıt uzunluğu 2B adsız uzunluk yazımıyla: ortaokul ondalık virgül ve ≈, lise tam sayı, ilkokul "yaklaşık"', () => {
    expect(ayritOlcusuYazisi(Math.sqrt(12), ayar('ortaokul'), false).metin).toBe('≈ 3,46 br');
    expect(ayritOlcusuYazisi(4, ayar('ortaokul'), false).metin).toBe('4 br');
    expect(ayritOlcusuYazisi(2.5, ayar('ortaokul'), false).metin).toBe('2,5 br');
    // Ortaokulda "Ölçüleri tam sayı yaz" açılınca 2B ile aynı: tam sayı, ≈ yok
    expect(ayritOlcusuYazisi(Math.sqrt(12), ayar('ortaokul', { ...S, tamSayiOlcuOrtaokul: true }), false).metin).toBe('3 br');
    expect(ayritOlcusuYazisi(Math.sqrt(12), ayar('lise'), false).metin).toBe('3 br');
    expect(ayritOlcusuYazisi(Math.sqrt(12), ayar('lise', { ...S, tamSayiOlcu: false }), false).metin).toBe('≈ 3,46 br');
    // İlkokul kuralı (ilkokulKipi) aynen
    for (const d of [3, Math.sqrt(12), 0.3, 2.5000000001]) {
      expect(ayritOlcusuYazisi(d, ayar('ilkokul'), true).metin).toBe(ilkokulUzunlukMetni(d, 'br'));
    }
    expect(ayritOlcusuYazisi(Math.sqrt(12), ayar('ortaokul'), false).sesli).toBe('uzunluk yaklaşık üç virgül kırk altı birim');
  });

  it('yüz alanı 2B adsız alan yazımıyla: "Alan = 12 birimkare", yuvarlanınca "Alan ≈ … birimkare"', () => {
    expect(yuzAlaniYazisi(12, ayar('ortaokul')).metin).toBe('Alan = 12 birimkare');
    expect(yuzAlaniYazisi(Math.PI * 1.5 * 1.5, ayar('ortaokul')).metin).toBe('Alan ≈ 7,07 birimkare');
    expect(yuzAlaniYazisi(Math.PI * 1.5 * 1.5, ayar('lise')).metin).toBe('Alan = 7 birimkare');
  });
});

describe('3B etiket: doku ölçüsü (uzun metin kırpılmaz, cihaz piksel oranı)', () => {
  it('genişlik yazının kendisinden: Manrope 700 ölçüsü + kenar payı; eski 128 px sınırı yok', () => {
    const uzun = noktaAdiCizimi('A', { ...S, fontScale: 2, pointLabelScale: 2 }, ACIK_TEMA_3B, '(12,5; -3,5; 10)');
    const o = etiketOlcusu3B(uzun);
    const metin = metinGenisligi('A', 48, 700) + metinGenisligi(' (12,5; -3,5; 10)', 40, 600);
    expect(o.icGenislik).toBeCloseTo(metin, 5);
    expect(o.genislik).toBeGreaterThanOrEqual(metin + 2 * o.dolgu - 1e-9);
    expect(o.genislik).toBeGreaterThan(128);
  });

  it('rozet yazıdan dar olmaz: "(0; 0; 0)" 48 px rozete sığmaz, büyür; eksen çarpanı 2\'de "+x" rozeti büyür', () => {
    const o = etiketOlcusu3B(orijinCizimi('(0; 0; 0)', S));
    expect(o.icGenislik).toBeGreaterThan(48);
    // Roboto Mono: karakter başına 0,6 em (Manrope tablosu eş aralıklı yazıyı dar ölçerdi: yazı rozetten taşıyordu)
    expect(o.icGenislik).toBeCloseTo(9 * 0.6 * 11 + 8, 9);
    expect(o.duzen.parcalar).toHaveLength(1);
    expect(o.icYukseklik).toBe(20);
    expect(o.taban - o.dolgu).toBe(14);
    const kucuk = etiketOlcusu3B(eksenAdiCizimi('+x', '#ef4444', S));
    expect(kucuk.icGenislik).toBe(36);
    const buyuk = etiketOlcusu3B(eksenAdiCizimi('+x', '#ef4444', { ...S, axisScale: 2, fontScale: 2 }));
    expect(buyuk.icGenislik).toBeGreaterThan(36);
    expect(buyuk.icYukseklik).toBeGreaterThan(20);
  });

  it('doku pikseli = CSS boyu × piksel oranı (tam sayı); oran 2\'de iki kat', () => {
    const c = noktaAdiCizimi('A_1', S, ACIK_TEMA_3B);
    const o1 = etiketOlcusu3B(c, 1);
    const o2 = etiketOlcusu3B(c, 2);
    const p1 = dokuPikseli(o1, 1);
    const p2 = dokuPikseli(o2, 2);
    expect(Number.isInteger(p1.genislik) && Number.isInteger(p2.genislik)).toBe(true);
    expect(p1.genislik).toBeCloseTo(o1.genislik, 9);
    expect(p2.genislik / 2).toBeCloseTo(o2.genislik, 9);
    expect(p2.genislik).toBeGreaterThanOrEqual(2 * p1.genislik - 2);
    expect(o1.genislik).toBeGreaterThanOrEqual(o1.icGenislik + 2 * o1.dolgu);
  });

  it('ayar → boy: "Tüm yazılar" ve "Nokta adları" nokta adını, "Eksen sayıları" yalnız eksen yazılarını büyütür', () => {
    expect(noktaAdiCizimi('A', { ...S, fontScale: 1.5 }, ACIK_TEMA_3B).px).toBe(18);
    expect(noktaAdiCizimi('A', { ...S, pointLabelScale: 2 }, ACIK_TEMA_3B).px).toBe(24);
    expect(noktaAdiCizimi('A', { ...S, axisScale: 2, measurementScale: 2 }, ACIK_TEMA_3B).px).toBe(12);
    expect(eksenSayisiCizimi(3, { ...S, axisScale: 2 }, ACIK_TEMA_3B).px).toBe(22);
    expect(eksenSayisiCizimi(3, { ...S, pointLabelScale: 2 }, ACIK_TEMA_3B).px).toBe(11);
    expect(orijinCizimi('(0; 0; 0)', { ...S, fontScale: 0.6 }).px).toBe(6.6);
  });
});

describe('3B etiket: doku anahtarı ve önbellek', () => {
  const anahtarlar = (s: StyleSettings, tema = ACIK_TEMA_3B, pr = 1, surum = 0) =>
    eksenEtiketleri3B(s, tema, RENKLER, UZUNLUKLAR).map((e) => dokuAnahtari(e.cizim, pr, surum));

  it('sahnedeki eksen etiketleri: her eksende iki rozet ve sayılar, bir orijin rozeti', () => {
    const e = eksenEtiketleri3B(S, ACIK_TEMA_3B, RENKLER, UZUNLUKLAR);
    expect(e.filter((x) => x.cizim.tur === 'eksenAdi')).toHaveLength(6);
    expect(e.filter((x) => x.cizim.tur === 'orijin')).toHaveLength(1);
    expect(e.filter((x) => x.capa.tur === 'eksen' && x.capa.eksen === 'z')).toHaveLength(13 + 5);
    expect(e.find((x) => x.capa.tur === 'eksen' && x.capa.eksen === 'x' && x.capa.deger === 3)?.konum).toEqual([3, 0, 0]);
    expect(e.find((x) => x.cizim.tur === 'orijin')?.capa).toEqual({ tur: 'kose', dx: 8, dy: 8 });
  });

  it('yazı ayarı, tema, piksel oranı ya da yazı tipi sürümü değişince doku anahtarı değişir', () => {
    const once = anahtarlar(S);
    const ortak = (b: string[]) => b.filter((a) => once.includes(a)).length;
    // Aynı yazı aynı dokuyu paylaşır: x ve y eksenindeki "3" tek doku (önbellekte bir kez)
    const e = eksenEtiketleri3B(S, ACIK_TEMA_3B, RENKLER, UZUNLUKLAR);
    const uc = e.filter((x) => x.capa.tur === 'eksen' && x.capa.deger === 3).map((x) => dokuAnahtari(x.cizim, 1, 0));
    expect(uc).toHaveLength(3);
    expect(new Set(uc).size).toBe(1);
    expect(new Set(once).size).toBeLessThan(once.length);
    expect(ortak(anahtarlar({ ...S, fontScale: 1.25 }))).toBe(0);
    expect(ortak(anahtarlar({ ...S, axisScale: 0.8 }))).toBe(0);
    expect(ortak(anahtarlar(S, KOYU_TEMA_3B))).toBeLessThan(once.length);
    // Koyu temada sayıların rengi ve halesi değişir (rozetler aynı kalabilir)
    const koyuSayilar = eksenEtiketleri3B(S, KOYU_TEMA_3B, RENKLER, UZUNLUKLAR).filter((e) => e.cizim.tur === 'eksenSayisi');
    expect(koyuSayilar.every((e) => !once.includes(dokuAnahtari(e.cizim, 1, 0)))).toBe(true);
    expect(ortak(anahtarlar(S, ACIK_TEMA_3B, 2))).toBe(0);
    expect(ortak(anahtarlar(S, ACIK_TEMA_3B, 1, 1))).toBe(0);
    // Eksen yazılarını etkilemeyen ayar anahtarı değiştirmez (doku yeniden çizilmez)
    expect(anahtarlar({ ...S, measurementScale: 1.6, pointLabelScale: 1.4, yaziAltSiniri: 0.3 })).toEqual(once);
  });

  it('nokta adı anahtarı: ad, boy ve koordinat eki ayrı', () => {
    const a = (ad: string, s: StyleSettings = S, k?: string) => dokuAnahtari(noktaAdiCizimi(ad, s, ACIK_TEMA_3B, k), 1, 0);
    expect(a('A')).not.toBe(a('B'));
    expect(a('A')).not.toBe(a('A', { ...S, pointLabelScale: 1.2 }));
    expect(a('A')).not.toBe(a('A', S, '(0; 0; 0)'));
    expect(a('A')).toBe(a('A', { ...S, axisScale: 2 }));
  });

  it('önbellek aynı anahtarda dokuyu yeniden kullanır, süpürme kullanılmayanı dispose eder', () => {
    const atilan: string[] = [];
    const uret = (ad: string) => () => ({ ad, dispose: () => atilan.push(ad) });
    const ob = new EtiketDokuOnbellegi<{ ad: string; dispose(): void }>();
    const a1 = ob.al('a', uret('a'));
    expect(ob.al('a', uret('a-yeni'))).toBe(a1);
    ob.al('b', uret('b'));
    ob.al('c', uret('c'));
    expect(ob.boyut).toBe(3);
    expect(ob.supur(new Set(['a', 'c']))).toBe(1);
    expect(atilan).toEqual(['b']);
    expect(ob.anahtarlar().sort()).toEqual(['a', 'c']);
    ob.hepsiniAt();
    expect(atilan.sort()).toEqual(['a', 'b', 'c']);
    expect(ob.boyut).toBe(0);
  });

  it('ayar değişimi sonrası süpürme: eski ayarın bütün eksen dokuları atılır, yenileri kalır', () => {
    const ob = new EtiketDokuOnbellegi<{ dispose(): void; atildi: boolean }>();
    const doku = () => {
      const d = { atildi: false, dispose: () => { d.atildi = true; } };
      return d;
    };
    const eski = anahtarlar(S).map((k) => ob.al(k, doku));
    const yeniAnahtarlar = anahtarlar({ ...S, fontScale: 1.4 });
    const yeni = yeniAnahtarlar.map((k) => ob.al(k, doku));
    ob.supur(new Set(yeniAnahtarlar));
    expect(eski.every((d) => d.atildi)).toBe(true);
    expect(yeni.some((d) => d.atildi)).toBe(false);
    expect(ob.boyut).toBe(new Set(yeniAnahtarlar).size);
  });
});

describe('3B etiket: ekranda boy ve yerleşim', () => {
  it('sizeAttenuation: false sprite ölçeği ekranda tam istenen piksel boyunu verir (three.js izdüşümü)', () => {
    for (const H of [480, 800, 1080]) {
      const kamera = new THREE.PerspectiveCamera(40, 1280 / H, 0.1, 4000);
      kamera.updateProjectionMatrix();
      const P11 = kamera.projectionMatrix.elements[5];
      for (const px of [12, 18.5, 33]) {
        // Sprite gölgelendiricisi: ölçek × derinlik dünya boyu → NDC yüksekliği ölçek · P11 → ekran = NDC · H / 2
        const ekranPx = px * ekranPikseliOlcegi(H, 40) * P11 * (H / 2);
        expect(ekranPx).toBeCloseTo(px, 6);
      }
    }
  });

  const bilgi = (c: EtiketCizimi, capa: EtiketBilgisi3B['capa']): Pick<EtiketBilgisi3B, 'olcu' | 'capa'> => ({ olcu: etiketOlcusu3B(c), capa });
  /** Sprite merkezinden yazının ekran kutusu (çapa 0, 0'da; y aşağı) */
  const kutu = (e: Pick<EtiketBilgisi3B, 'olcu' | 'capa'>, s: number, m: { x: number; y: number }) => {
    const W = e.olcu.genislik * s;
    const H = e.olcu.yukseklik * s;
    const sol = -m.x * W;
    const ust = -(1 - m.y) * H;
    return { sol, ust, W, H };
  };

  it('nokta adı 2B\'deki sağ üst yerde: yazı noktanın `boşluk` px sağında, tabanı `boşluk` px üstünde (her ölçekte)', () => {
    const e = bilgi(noktaAdiCizimi('A', S, ACIK_TEMA_3B), { tur: 'noktaSagUst', dunyaYaricapi: 0.25 });
    for (const s of [0.7, 1, 1.05]) {
      const b = noktaAdiBoslugu(0.25, 55);
      const k = kutu(e, s, spriteMerkezi(e, s, { bosluk: b }));
      expect(k.sol + e.olcu.metinX * s).toBeCloseTo(b, 6);
      expect(-(k.ust + e.olcu.taban * s)).toBeCloseTo(b, 6);
    }
  });

  it('köşe boşluğu: kürenin ekran yarıçapı + 4 px, en az 2B KOSE_BOSLUGU (10 px)', () => {
    expect(noktaAdiBoslugu(0.25, 55)).toBeCloseTo(0.25 * 55 + 4, 9);
    expect(noktaAdiBoslugu(0.25, 15)).toBe(KOSE_BOSLUGU);
    expect(noktaAdiBoslugu(0.35, 180)).toBeCloseTo(67, 9);
  });

  it('orijin rozetinin sol üst köşesi orijinin 8 px sağ altında (2B translate(8, 8))', () => {
    const e = bilgi(orijinCizimi('(0; 0; 0)', S), { tur: 'kose', dx: 8, dy: 8 });
    const k = kutu(e, 1, spriteMerkezi(e, 1));
    expect(k.sol + e.olcu.dolgu).toBeCloseTo(8, 6);
    expect(k.ust + e.olcu.dolgu).toBeCloseTo(8, 6);
  });

  it('eksen sayısı: yatay eksende altta, dikey eksende solda (2B kuralı), eksen çizgisinden en az 7 px', () => {
    const alt = eksenSayisiKaymasi({ x: 55, y: 0 }, 14, 15);
    expect(alt.x).toBeCloseTo(0, 9);
    expect(alt.y).toBeCloseTo(EKSEN_SAYISI_ARASI + 7.5, 9);
    const sol = eksenSayisiKaymasi({ x: 0, y: -55 }, 14, 15);
    expect(sol.x).toBeCloseTo(-(EKSEN_SAYISI_ARASI + 7), 9);
    expect(sol.y).toBeCloseTo(0, 9);
    // Eğik eksen (3B varsayılan bakış): baskın yön yatay → aşağı bakan dik
    const egik = eksenSayisiKaymasi({ x: 40, y: 25 }, 14, 15);
    expect(egik.y).toBeGreaterThan(0);
    expect(egik.x * 40 + egik.y * 25).toBeCloseTo(0, 6);
    // Merkez kayması sprite merkezine doğru taşınır
    const e = bilgi(eksenSayisiCizimi(3, S, ACIK_TEMA_3B), { tur: 'eksen', eksen: 'x', deger: 3 });
    const m = spriteMerkezi(e, 1, { kayma: alt });
    const k = kutu(e, 1, m);
    expect(k.sol + k.W / 2).toBeCloseTo(alt.x, 6);
    expect(k.ust + k.H / 2).toBeCloseTo(alt.y, 6);
  });

  it('eksen sayıları sıkışınca seyrelir (2B seyreltmeKati): birim aralığı yazıdan darsa 2, 3… birimde bir', () => {
    expect(eksenSayisiKati(55, { x: 1, y: 0 }, 14, 15)).toBe(1);
    expect(eksenSayisiKati(10, { x: 1, y: 0 }, 14, 15)).toBe(2);
    expect(eksenSayisiKati(5, { x: 1, y: 0 }, 14, 15)).toBe(4);
    expect(eksenSayisiKati(10, { x: 0, y: 1 }, 14, 15)).toBe(2);
    expect(eksenSayisiKati(0, { x: 1, y: 0 }, 14, 15)).toBe(Number.POSITIVE_INFINITY);
  });

  it('sol üst köşe cihaz pikseline oturur', () => {
    for (const pr of [1, 1.5, 2]) {
      const m = pikseleOturt({ x: 0.31, y: 0.77 }, { x: 403.37, y: 211.81 }, 40.4, 18.2, pr);
      const sol = 403.37 - m.x * 40.4;
      const ust = 211.81 - (1 - m.y) * 18.2;
      expect(Math.abs(sol * pr - Math.round(sol * pr))).toBeLessThan(1e-6);
      expect(Math.abs(ust * pr - Math.round(ust * pr))).toBeLessThan(1e-6);
      expect(Math.abs(m.x - 0.31) * 40.4).toBeLessThanOrEqual(0.5 / pr + 1e-9);
    }
  });
});

describe('3B etiket: çizim (tuval 2D)', () => {
  type Kayit = { op: string; args: unknown[]; font: string; fill: unknown; stroke: unknown; lw: number; alpha: number; shadow: string };
  const sahteTuval = () => {
    const kayit: Kayit[] = [];
    const ctx: Record<string, unknown> = {
      font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
      textAlign: 'start', textBaseline: 'alphabetic', lineJoin: 'miter', lineCap: 'butt',
    };
    const yaz = (op: string) => (...args: unknown[]) =>
      kayit.push({ op, args, font: ctx.font as string, fill: ctx.fillStyle, stroke: ctx.strokeStyle, lw: ctx.lineWidth as number, alpha: ctx.globalAlpha as number, shadow: `${ctx.shadowColor}|${ctx.shadowBlur}|${ctx.shadowOffsetY}` });
    for (const op of ['setTransform', 'clearRect', 'fillText', 'strokeText', 'fill', 'stroke', 'beginPath', 'moveTo', 'lineTo', 'arcTo', 'closePath', 'quadraticCurveTo', 'save', 'restore', 'translate', 'scale']) ctx[op] = yaz(op);
    ctx.measureText = (s: string) => ({ width: s.length * 7 });
    return { ctx: ctx as unknown as CanvasRenderingContext2D, kayit };
  };

  it('nokta adı: Manrope 700, alt indis küçük boyda, iki gölge geçişi, piksel oranıyla ölçekli', () => {
    const { ctx, kayit } = sahteTuval();
    const c = noktaAdiCizimi('A_1', S, ACIK_TEMA_3B);
    etiketiCiz(ctx, c, etiketOlcusu3B(c, 2), 2);
    expect(kayit[0]).toMatchObject({ op: 'setTransform', args: [2, 0, 0, 2, 0, 0] });
    const yazilar = kayit.filter((k) => k.op === 'fillText');
    expect(yazilar.map((k) => k.args[0])).toEqual(['A', '1', 'A', '1']);
    expect(yazilar[0].font).toMatch(/^700 12px Manrope/);
    expect(yazilar[1].font).toMatch(/^700 8\.16px Manrope/);
    expect(yazilar[0].fill).toBe(ACIK_TEMA_3B.yazi);
    expect(yazilar[0].shadow).toBe('rgba(0, 0, 0, 0.1)|4|2');
    expect(yazilar[2].shadow).toBe('rgba(0, 0, 0, 0.06)|2|2');
    expect(kayit.some((k) => k.op === 'strokeText')).toBe(false);
  });

  it('eksen sayısı: önce zemin halesi (3 px), sonra %80 opak ön plan dolgusu', () => {
    const { ctx, kayit } = sahteTuval();
    const c = eksenSayisiCizimi(12, S, KOYU_TEMA_3B);
    etiketiCiz(ctx, c, etiketOlcusu3B(c), 1);
    const hale = kayit.findIndex((k) => k.op === 'strokeText');
    const dolgu = kayit.findIndex((k) => k.op === 'fillText');
    expect(hale).toBeGreaterThan(-1);
    expect(hale).toBeLessThan(dolgu);
    expect(kayit[hale]).toMatchObject({ stroke: KOYU_TEMA_3B.zemin, lw: 3 });
    expect(kayit[dolgu]).toMatchObject({ fill: KOYU_TEMA_3B.yazi, alpha: 0.8 });
    expect(kayit[dolgu].font).toMatch(/^700 11px Manrope/);
  });

  it('rozet: eksen renginde yuvarlak dikdörtgen, ortada beyaz 900 yazı; orijin gri çerçeve ve Roboto Mono', () => {
    const r = sahteTuval();
    const c = eksenAdiCizimi('+z', '#3b82f6', S);
    etiketiCiz(r.ctx, c, etiketOlcusu3B(c), 1);
    expect(r.kayit.find((k) => k.op === 'fill')?.fill).toBe('#3b82f6');
    const yazi = r.kayit.find((k) => k.op === 'fillText');
    expect(yazi?.args[0]).toBe('+z');
    expect(yazi?.font).toMatch(/^900 12px Manrope/);
    expect(yazi?.fill).toBe('#ffffff');
    const o = sahteTuval();
    const oc = orijinCizimi('(0; 0; 0)', S);
    etiketiCiz(o.ctx, oc, etiketOlcusu3B(oc), 1);
    expect(o.kayit.find((k) => k.op === 'stroke')).toMatchObject({ stroke: '#737373', lw: 1.5 });
    expect(o.kayit.find((k) => k.op === 'fillText')?.font).toBe("900 11px 'Roboto Mono', monospace");
  });

  it('tema belirteci: "173 39% 14%" → hsl(173, 39%, 14%)', () => {
    expect(hslBelirteci('173 39% 14%')).toBe('hsl(173, 39%, 14%)');
    expect(hslBelirteci(' 40 60% 96% ')).toBe('hsl(40, 60%, 96%)');
    expect(hslBelirteci('#fff')).toBeNull();
    expect(hslBelirteci('')).toBeNull();
  });
});

describe('3B etiket: Canvas3D bağlantısı (kaynak)', () => {
  const c3 = readFileSync(path.join(__dirname, '..', 'Canvas3D.tsx'), 'utf8');

  it('eski sabit 128 × 64 ui-monospace dokusu kalktı; sprite ekranda sabit piksel, derinlikte okunur', () => {
    expect(c3).not.toContain('ui-monospace');
    expect(c3).not.toContain('canvas.width = 128');
    expect(c3).toContain('sizeAttenuation: false');
    expect(c3).toContain('depthTest: false');
  });

  it('Stil ayarları 3B\'de de etkili: yazı boyları, alt sınır, etiket kutuları, koordinat ve ölçü göster', () => {
    expect(c3).toContain('const yaziOlcegi = yaziOlcegi3B(camera.zoom, stil.yaziAltSiniri);');
    expect(c3).toContain('}, [isDark, etiketStili, tema, pikselOrani, yaziSurumu, requestRender]);');
    expect(c3).toContain('kutuGizli={!stil.showLabelBoxes}');
    expect(c3).toContain('if (pt.showLabel && pt.label) {');
    expect(c3).toContain('const koordinatGoster = !!workspace?.viewport.showCoordinates && olculerGorunur;');
    expect(c3).toContain('{olculerGorunur && (overlays.edgeLabels.length > 0 || (overlays.faceBadge && !ilkokul3B)) && (');
  });

  it('ölçü yazıları 2B\'nin MatematikEtiketi bileşeniyle; dokular süpürülür', () => {
    expect(c3).toContain("px={turYaziBoyu('olcu', etiketStili)}");
    expect(c3.match(/<MatematikEtiketi/g)?.length).toBe(3);
    expect(c3.match(/etiketDokulariniSupur\(t\.scene, t\.etiketDokulari\)/g)?.length).toBe(2);
    expect(c3).toContain('t.etiketDokulari.hepsiniAt();');
  });
});
