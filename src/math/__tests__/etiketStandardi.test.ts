import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EKSEN_ROZETI,
  ETIKET_TURLERI,
  KAMERA_3B_OLCEK_100,
  ORIJIN_ROZETI,
  eksenSayisiHaleKalinligi,
  etiketYaziBoyu,
  olcuHaleKalinligi,
  turYaziBoyu,
  yakinlikOlceklenir,
  yaziOlcegi3B,
} from '@/math/etiketStandardi';
import { LABEL_LAYOUT_ZOOM, labelFontScale, yaziOlcegiOrandan } from '@/math/labelViewport';
import { DEFAULT_STYLE_SETTINGS } from '@/types/workspace';
import { ROZET_GENISLIK, ROZET_YUKSEKLIK } from '@/components/workspace/eksenSayilari';
import { VARSAYILAN_KAMERA_3B } from '@/components/workspace/cisimYerlesimi';
import type { ViewportTransform } from '@/types/math';

/**
 * 2B ve 3B etiketlerinin ortak yazı standardı (kullanıcı, 14.10.2026: "3b etiket yazı özellikleri 2b ile aynı değil
 * aynı standartlar orada da olmalı"). Değerler 2B'nin çizdiğinden çıkarıldı; bu testler 2B kaynağı değişip standart
 * değişmezse (ya da tersi) kırılır.
 */
const KOK = path.resolve(__dirname, '../../components/workspace');
const canvas2B = readFileSync(path.join(KOK, 'Canvas.tsx'), 'utf8');
// Eksen rozetleri, sayıları ve orijin 2B'de zemin katmanı modülünde çizilir (Canvas yalnızca çağırır)
const zemin2B = readFileSync(path.join(KOK, 'katmanlar', 'izgaraVeEksenler.tsx'), 'utf8');
const noktalar2B = readFileSync(path.join(KOK, 'katmanlar', 'noktalarVeIzler.tsx'), 'utf8');
const vp = (zoom: number) => ({ zoom } as ViewportTransform);

describe('etiketStandardi: yazı boyu (Stil > Yazı Boyutları)', () => {
  it('2B fs(…) ile aynı formül: temel × Tüm yazılar × grup çarpanı, 2 basamak', () => {
    const s = { ...DEFAULT_STYLE_SETTINGS, pointLabelScale: 1, measurementScale: 1, axisScale: 1 };
    expect(etiketYaziBoyu(12, 'label', s)).toBe(12);
    expect(etiketYaziBoyu(12, 'label', { ...s, fontScale: 1.5, pointLabelScale: 2 })).toBe(36);
    expect(etiketYaziBoyu(11, 'measure', { ...s, measurementScale: 0.6 })).toBe(6.6);
    expect(etiketYaziBoyu(11, 'axis', { ...s, fontScale: 1.25, axisScale: 1.15 })).toBe(15.81);
    // Grup çarpanı yalnız kendi grubunu büyütür
    expect(etiketYaziBoyu(11, 'measure', { ...s, pointLabelScale: 2, axisScale: 2 })).toBe(11);
  });

  it('2B tuvalin fs(…) işlevi bu kaynağı çağırır', () => {
    expect(canvas2B).toContain("(base: number, kind: EtiketGrubu = 'measure') => etiketYaziBoyu(base, kind, styleSettings)");
    expect(canvas2B).toContain('strokeWidth: eksenSayisiHaleKalinligi(styleSettings)');
  });

  it('tür tabanları 2B çiziminin fs(…) değerleri ve kalınlıkları', () => {
    expect(ETIKET_TURLERI.noktaAdi).toMatchObject({ taban: 12, grup: 'label', agirlik: 700 });
    expect(ETIKET_TURLERI.noktaKoordinati).toMatchObject({ taban: 10, grup: 'label' });
    expect(ETIKET_TURLERI.olcu).toMatchObject({ taban: 11, grup: 'measure', agirlik: 700 });
    expect(ETIKET_TURLERI.eksenSayisi).toMatchObject({ taban: 11, grup: 'axis', agirlik: 700 });
    expect(ETIKET_TURLERI.eksenAdi).toMatchObject({ taban: 12, grup: 'axis', agirlik: 900 });
    expect(ETIKET_TURLERI.orijin).toMatchObject({ taban: 11, grup: 'axis', agirlik: 900 });
    // 2B kaynağındaki karşılıkları
    // Nokta adı ve koordinatı noktalar katmanı modülünde çizilir (b.yaziBoyu = Canvas.fs)
    expect(noktalar2B).toContain("const adBoyu = b.yaziBoyu(12, 'label');");
    expect(noktalar2B).toContain("const koordinatBoyu = b.yaziBoyu(10, 'label');");
    expect(noktalar2B).toContain("<tspan fontSize={koordinatBoyu * b.yaziOlcegi} className=\"font-normal fill-muted-foreground ml-1\">");
    expect(noktalar2B).toContain("fontSize={adBoyu * b.yaziOlcegi} className=\"fill-foreground font-bold select-none drop-shadow\"");
    expect(canvas2B).toContain('yaziBoyu: fs,');
    expect(zemin2B).toContain("const EKSEN_RENGI = '#737373';");
    expect(zemin2B).toContain("fontSize={yaziBoyu(11, 'axis')} className=\"fill-foreground/80 select-none font-bold\"");
    expect(zemin2B).toContain('<text x="18" y="14" textAnchor="middle" fill="#ffffff" fontSize={yaziBoyu(12, \'axis\')} className="font-black font-sans">');
    expect(zemin2B).toContain('<text x="24" y="14" textAnchor="middle" fill={EKSEN_RENGI} fontSize={yaziBoyu(11, \'axis\')} className="font-mono font-black">');
    expect(canvas2B).toContain('eksenler(viewport, originScreen, eksenYerlesimi, fs, eksenSayiHalesi)');
    expect(canvas2B).toContain("px={fs(11, 'measure')}");
  });

  it('rozet ölçüleri 2B ile aynı (36 × 20 eksen, 48 × 20 orijin, rx 6)', () => {
    expect(EKSEN_ROZETI).toMatchObject({ genislik: ROZET_GENISLIK, yukseklik: ROZET_YUKSEKLIK, rx: 6, taban: 14 });
    expect(zemin2B).toContain('<rect width="36" height="20" rx="6" fill={EKSEN_RENGI} className="shadow-sm" />');
    expect(ORIJIN_ROZETI).toMatchObject({ genislik: 48, yukseklik: 20, rx: 6, cizgi: 1.5, kayma: 8 });
    expect(zemin2B).toContain('<rect width="48" height="20" rx="6" fill="#ffffff" stroke={EKSEN_RENGI} strokeWidth="1.5" className="shadow-sm" />');
    expect(zemin2B).toContain('<g data-canvas-label="" transform="translate(8, 8)">');
  });

  it('hale kalınlıkları: ölçü px · 0,32 (MatematikEtiketi), eksen sayısı fs(3) 2,5–6 px', () => {
    expect(olcuHaleKalinligi(11)).toBeCloseTo(3.52, 5);
    expect(eksenSayisiHaleKalinligi(DEFAULT_STYLE_SETTINGS)).toBe(3.6);
    expect(eksenSayisiHaleKalinligi({ ...DEFAULT_STYLE_SETTINGS, fontScale: 0.6 })).toBe(2.5);
    expect(eksenSayisiHaleKalinligi({ ...DEFAULT_STYLE_SETTINGS, fontScale: 2, axisScale: 2 })).toBe(6);
    const me = readFileSync(path.join(KOK, 'MatematikEtiketi.tsx'), 'utf8');
    expect(me).toContain('strokeWidth: f(p.px * 0.32)');
  });

  it('turYaziBoyu ayara göre büyür; eksen türleri yakınlıkla ölçeklenmez', () => {
    const s = { ...DEFAULT_STYLE_SETTINGS, fontScale: 1.5, pointLabelScale: 1, measurementScale: 1, axisScale: 1 };
    expect(turYaziBoyu('noktaAdi', s)).toBe(18);
    expect(turYaziBoyu('olcu', s)).toBe(16.5);
    expect(turYaziBoyu('eksenSayisi', s)).toBe(16.5);
    expect(yakinlikOlceklenir('noktaAdi')).toBe(true);
    expect(yakinlikOlceklenir('olcu')).toBe(true);
    expect(yakinlikOlceklenir('eksenSayisi')).toBe(false);
    expect(yakinlikOlceklenir('eksenAdi')).toBe(false);
    expect(yakinlikOlceklenir('orijin')).toBe(false);
  });
});

describe('etiketStandardi: yakınlık ölçeği (2B labelFontScale ↔ 3B yaziOlcegi3B)', () => {
  it('3B %100 (zoom 55, açılış kamerası) yazıyı normal boyda gösterir; 2B %100 (zoom 44) de', () => {
    expect(KAMERA_3B_OLCEK_100).toBe(VARSAYILAN_KAMERA_3B.zoom);
    expect(yaziOlcegi3B(55, 0.7)).toBe(1);
    expect(labelFontScale(vp(LABEL_LAYOUT_ZOOM), 0.7)).toBe(1);
  });

  it('yakınlaşınca en çok %5 büyür, uzaklaşınca alt sınırda kalır; alt sınır 0 = sınırsız küçülür', () => {
    expect(yaziOlcegi3B(180, 0.7)).toBe(1.05);
    expect(yaziOlcegi3B(15, 0.7)).toBe(0.7);
    expect(yaziOlcegi3B(44, 0.7)).toBeCloseTo(0.8, 10);
    expect(yaziOlcegi3B(15, 0)).toBeCloseTo(15 / 55, 10);
    expect(yaziOlcegi3B(15, 0.5)).toBe(0.5);
  });

  it('aynı yakınlık oranında 2B ve 3B ölçeği birebir aynı (tek kural: yaziOlcegiOrandan)', () => {
    for (const oran of [0.1, 0.27, 0.5, 0.7, 0.9, 1, 1.03, 1.2, 3]) {
      for (const alt of [0, 0.5, 0.7, 1]) {
        expect(yaziOlcegi3B(KAMERA_3B_OLCEK_100 * oran, alt)).toBeCloseTo(labelFontScale(vp(LABEL_LAYOUT_ZOOM * oran), alt), 12);
        expect(yaziOlcegiOrandan(oran, alt)).toBeCloseTo(labelFontScale(vp(LABEL_LAYOUT_ZOOM * oran), alt), 12);
      }
    }
  });
});
