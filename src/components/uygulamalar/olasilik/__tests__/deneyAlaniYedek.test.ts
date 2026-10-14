// Alan uzmanı, 5. tur (geoeba (4).xlsx, atölye inceleme satır 141): «sayı küpü ya da Galton tahtası sekmesinde görseller
// görünmüyor». Olasılık klasöründe kalan kısım (WebGL bağlamı kaybında sahnenin yeniden kurulması BOS'un ortak
// düzeltmesi, sinif/baglamKaybi.ts): 2B görünümde (WebGL yok / bağlam kurulamadı) sekme değişince eski şablonun sonucu
// kalmaz; 2B sayı küpü «?» kutusu yerine üç yüzü görünen rakamlı küp; sahne dururken (kart görünmezken) yapılan
// denemenin son pozu çizilir.
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import { DeneySahnesi, ZAR_YUZLERI, zarGorunenYuzler, zarYuzQuaternion } from '../deneySahnesi';
import { DeneyAlani, gosterilenSonuc } from '../DeneyAlani';
import { SvgSayiKupu, svgZarlari } from '../SayiKupu2B';
import { varsayilanSablon, type Sablon, type Sonuc } from '../olasilik';

describe('deney kartında gösterilen sonuç', () => {
  const zar = varsayilanSablon('zar') as Sablon;
  const para: Sonuc = { tur: 'para', yuz: 'yazi' };
  const uc: Sonuc = { tur: 'zar', zarlar: [3] };

  it('2B görünüm: başka şablonun sonucu (sekme değişti) gösterilmez', () => {
    expect(gosterilenSonuc(false, zar, null, para)).toBeNull();
    expect(gosterilenSonuc(false, zar, para, para)).toBeNull();
    expect(gosterilenSonuc(false, zar, uc, para)).toEqual(uc);
    expect(gosterilenSonuc(false, zar, null, uc)).toEqual(uc);
  });

  it('3B görünüm: yalnız son sonuç ve yalnız aynı şablondaysa', () => {
    expect(gosterilenSonuc(true, zar, uc, para)).toEqual(uc);
    expect(gosterilenSonuc(true, zar, para, null)).toBeNull();
    expect(gosterilenSonuc(null, zar, null, uc)).toEqual(uc);
  });

  it('sunucu çiziminde (WebGL sondası öncesi) kart boş değil: deney alanı kabı var', () => {
    const h = renderToStaticMarkup(
      React.createElement(DeneyAlani, { sablon: zar, koyu: false, azHareket: false, onBitti: () => undefined, sonSonuc: para, animasyonda: false })
    );
    expect(h).toContain('data-deney-alani');
    // Başka şablonun sonucu rozet/etiket olarak görünmez
    expect(h).not.toContain('Yazı');
  });
});

describe('2B sayı küpü (WebGL yoksa): «?» kutusu değil, gerçek küp', () => {
  const tek = varsayilanSablon('zar') as Extract<Sablon, { tur: 'zar' }>;
  const iki = { ...tek, ikiZar: true };

  it('sonuç yokken 3B açılış duruşu (1; iki küpte 1 ve 3), sonuç varsa sonuç', () => {
    expect(svgZarlari(tek, null)).toEqual([1]);
    expect(svgZarlari(iki, null)).toEqual([1, 3]);
    expect(svgZarlari(tek, { tur: 'para', yuz: 'tura' })).toEqual([1]);
    expect(svgZarlari(iki, { tur: 'zar', zarlar: [6, 2] })).toEqual([6, 2]);
  });

  it('görünen üç yüz: üst = sonuç; üçü komşu (aynı ya da karşılıklı değil); 3B küpün yönelimiyle aynı', () => {
    for (let ust = 1; ust <= 6; ust++) {
      const y = zarGorunenYuzler(ust);
      expect(y.ust).toBe(ust);
      const uc = [y.ust, y.on, y.sag];
      expect(new Set(uc).size).toBe(3);
      for (const a of uc) for (const b of uc) expect(a + b).not.toBe(7);
      // 3B: dönme 0'da öğrenciye (+Z) ve sağa (+X) bakan yüzler
      const q = zarYuzQuaternion(ust, 0);
      const bak = (yon: THREE.Vector3) => {
        const i = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)].findIndex(
          (n) => n.clone().applyQuaternion(q).dot(yon) > 0.99
        );
        return ZAR_YUZLERI[i];
      };
      expect(y.on).toBe(bak(new THREE.Vector3(0, 0, 1)));
      expect(y.sag).toBe(bak(new THREE.Vector3(1, 0, 0)));
    }
  });

  it('çizim: üç yüz çokgeni, her yüzde rakam (soru işareti yok); yalnız 6 altı çizili', () => {
    for (let ust = 1; ust <= 6; ust++) {
      const h = renderToStaticMarkup(React.createElement('svg', null, React.createElement(SvgSayiKupu, { ust, cx: 200, cy: 124 })));
      const y = zarGorunenYuzler(ust);
      expect(h).toContain(`data-sayi-kupu="${y.ust}-${y.on}-${y.sag}"`);
      expect(h.match(/<polygon/g)).toHaveLength(3);
      const rakamlar = [...h.matchAll(/<text[^>]*>(\d)<\/text>/g)].map((m) => Number(m[1]));
      expect(rakamlar.sort()).toEqual([y.ust, y.on, y.sag].sort());
      expect(h).not.toContain('?');
      const cizgi = (h.match(/<rect/g) ?? []).length;
      expect(cizgi).toBe([y.ust, y.on, y.sag].filter((r) => r === 6).length);
    }
  });
});

describe('sahne dururken (kart görünmez) yapılan deneme', () => {
  it('son poz çizilir: kart yeniden görününce eski yüz kalmaz', () => {
    // WebGL olmadan: yalnız baslat()'ın kullandığı alanlar (Node'da WebGLRenderer kurulamaz)
    const render = vi.fn();
    const sahne = Object.assign(Object.create(DeneySahnesi.prototype), {
      aninda: false,
      sessiz: false,
      animasyon: null,
      dongude: false,
      duraklatildi: true,
      gizli: false,
      kapatildi: false,
      galton: null,
      yagmurAktif: false,
      ertelenenDokular: [],
      secenekler: { azHareket: false, koyu: false, rastgele: Math.random },
      renderer: { render, setAnimationLoop: vi.fn() },
      sahne: {},
      kamera: {},
    }) as { baslat: (sure: number, adim: (t: number) => void, bitti: () => void) => void };
    const sira: string[] = [];
    render.mockImplementation(() => sira.push('çiz'));
    sahne.baslat(1, (t) => sira.push(`adım ${t}`), () => sira.push('bitti'));
    expect(sira).toEqual(['adım 0', 'adım 1', 'bitti', 'çiz']);
  });
});
