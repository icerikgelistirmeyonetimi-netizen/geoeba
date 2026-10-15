// Alan uzmanı, 5. tur (geoeba (4).xlsx, atölye inceleme satır 141): «madeni para yapılırsa gerçek parayla aynı olmalı».
// Para gerçek 1 TL gibi: iki metal (altın sarısı halka + gümüş gri göbek), tırtıklı kenar; yazı yüzü «1 LİRA», tura yüzü
// «TÜRKİYE CUMHURİYETİ», yıl ve kabartma profil silüeti. Yazı/tura sonucu ↔ yukarı bakan yüz ilişkisi değişmedi.
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import {
  PARA_GOBEK_ORANI,
  PARA_RENKLERI,
  PARA_TIRTIK_SAYISI,
  PARA_YAZILARI,
  PROFIL_OLCEGI,
  PROFIL_SILUETI,
  paraKenariniCiz,
  paraYuzunuCiz,
  profilSvgYolu,
  yayYazisi,
  type Cizim2B,
} from '../madeniPara';
import { MadeniParaSvg } from '../MadeniPara2B';
import { SablonSimgesi } from '../SablonSimgesi';
import { PARA_KAPAK_YUZLERI, paraDokusu, paraHedefAcisi, paraYuzuAcidan } from '../deneySahnesi';
import { TURA_GORSELI } from '../turaGorseli';

interface Cagri {
  ad: string;
  arg: unknown[];
}

/** Çizim çağrılarını ve gradyan duraklarını kaydeden sahte 2B bağlam. */
function sahteBaglam(): { ctx: Cizim2B; cagrilar: Cagri[]; duraklar: string[] } {
  const cagrilar: Cagri[] = [];
  const duraklar: string[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_h, ad: string) => {
        if (ad === 'createRadialGradient' || ad === 'createLinearGradient')
          return () => ({ addColorStop: (_o: number, renk: string) => duraklar.push(renk) });
        if (ad === 'measureText') return (m: string) => ({ width: m.length * 10 });
        return (...arg: unknown[]) => {
          cagrilar.push({ ad, arg });
        };
      },
      set: (_h, ad: string, deger: unknown) => {
        cagrilar.push({ ad: `=${ad}`, arg: [deger] });
        return true;
      },
    }
  ) as unknown as Cizim2B;
  return { ctx, cagrilar, duraklar };
}

const harfler = (c: Cagri[]) =>
  c
    .filter((x) => x.ad === 'fillText')
    .map((x) => String(x.arg[0]))
    .join('');

describe('madeni para yüzü (3B doku çizimi): gerçek 1 TL', () => {
  it('tura: halkada «TÜRKİYE CUMHURİYETİ» ve yıl, göbekte profil silüeti; «TURA» etiketi yok', () => {
    const { ctx, cagrilar, duraklar } = sahteBaglam();
    paraYuzunuCiz(ctx, 1024, 'tura');
    const yazi = harfler(cagrilar);
    expect(yazi).toContain(PARA_YAZILARI.ulke);
    expect(yazi).toContain(PARA_YAZILARI.yil);
    expect(yazi).not.toMatch(/TURA|YAZI|LİRASI/);
    // Silüet: bütün Bézier eğrileri (kabartma: gölge + ışık + gövde = 3 kez)
    const egri = cagrilar.filter((c) => c.ad === 'bezierCurveTo').length;
    expect(egri).toBe(PROFIL_SILUETI.egriler.length * 3);
    // İki metal: altın sarısı halka ve gümüş gri göbek gradyanları
    expect(duraklar).toEqual(expect.arrayContaining([PARA_RENKLERI.halka.acik, PARA_RENKLERI.halka.koyu, PARA_RENKLERI.gobek.acik, PARA_RENKLERI.gobek.koyu]));
  });

  it('yazı (değer yüzü): göbekte «1» ve «LİRA»; ülke adı ve silüet yok', () => {
    const { ctx, cagrilar, duraklar } = sahteBaglam();
    paraYuzunuCiz(ctx, 1024, 'yazi');
    const yazilar = cagrilar.filter((c) => c.ad === 'fillText').map((c) => String(c.arg[0]));
    expect(yazilar).toContain(PARA_YAZILARI.deger);
    expect(yazilar).toContain(PARA_YAZILARI.birim);
    expect(yazilar.join('')).not.toMatch(/TÜRKİYE|TURA|YAZI/);
    expect(cagrilar.some((c) => c.ad === 'bezierCurveTo')).toBe(false);
    expect(duraklar).toEqual(expect.arrayContaining([PARA_RENKLERI.halka.orta, PARA_RENKLERI.gobek.orta]));
  });

  it('kabartma (yükseklik) dokusu gri tonlu, gradyansız; yazılar ve silüet aynı yerde', () => {
    for (const yuz of ['tura', 'yazi'] as const) {
      const renk = sahteBaglam();
      const yuk = sahteBaglam();
      paraYuzunuCiz(renk.ctx, 512, yuz, 'renk');
      paraYuzunuCiz(yuk.ctx, 512, yuz, 'yukseklik');
      expect(yuk.duraklar).toEqual([]);
      const renkler = yuk.cagrilar.filter((c) => c.ad === '=fillStyle' || c.ad === '=strokeStyle').map((c) => String(c.arg[0]));
      for (const r of renkler) {
        const m = r.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
        expect(m, r).not.toBeNull();
        expect(m![1]).toBe(m![2]);
        expect(m![2]).toBe(m![3]);
      }
      // Kabartmada yazı bir kez (gölge/ışık kopyası yok), renkte üç kez
      expect(harfler(renk.cagrilar).length).toBe(harfler(yuk.cagrilar).length * 3);
    }
  });

  it('kenar: tırtıklar (her tırtıkta bir koyu, bir açık şerit)', () => {
    const { ctx, cagrilar } = sahteBaglam();
    paraKenariniCiz(ctx, 512);
    expect(cagrilar.filter((c) => c.ad === 'fillRect')).toHaveLength(1 + PARA_TIRTIK_SAYISI * 2);
  });

  it('halka yazısı soldan sağa okunur: üstteki merkezin üstünde, yıl altında', () => {
    for (const ust of [true, false]) {
      const { ctx, cagrilar } = sahteBaglam();
      yayYazisi(ctx, 'ABCDE', 500, 500, 300, ust, 40);
      const konumlar = cagrilar.filter((c) => c.ad === 'translate').map((c) => c.arg as number[]);
      expect(konumlar).toHaveLength(5);
      for (let i = 1; i < 5; i++) expect(konumlar[i][0]).toBeGreaterThan(konumlar[i - 1][0]);
      for (const [, y] of konumlar) expect(ust ? y < 500 : y > 500).toBe(true);
      // Ortadaki harf tam üstte / altta ve dik
      expect(konumlar[2][0]).toBeCloseTo(500, 6);
      const donmeler = cagrilar.filter((c) => c.ad === 'rotate').map((c) => c.arg[0] as number);
      expect(donmeler[2]).toBeCloseTo(0, 6);
    }
  });

  it('profil silüeti göbeğin içinde kalır (halkaya taşmaz) ve kapalı bir yoldur', () => {
    const k = PROFIL_OLCEGI / 100;
    const noktalar: [number, number][] = [PROFIL_SILUETI.bas, ...PROFIL_SILUETI.egriler.flatMap((e) => [[e[0], e[1]], [e[2], e[3]], [e[4], e[5]]] as [number, number][])];
    for (const [x, y] of noktalar) expect(Math.hypot(0.04 + x * k, 0.02 + y * k)).toBeLessThan(0.97);
    const d = profilSvgYolu(50);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(PROFIL_SILUETI.egriler.length);
    expect(PARA_GOBEK_ORANI).toBeGreaterThan(0.55);
    expect(PARA_GOBEK_ORANI).toBeLessThan(0.7);
  });
});

describe('yazı / tura sonucu ↔ yukarı bakan yüz (değişmedi)', () => {
  it('silindirin üst kapağı (+Y) tura, alt kapağı (−Y) yazı; açı 0 → tura, π → yazı', () => {
    const geo = new THREE.CylinderGeometry(0.55, 0.55, 0.07, 24);
    const normal = geo.getAttribute('normal');
    const index = geo.getIndex()!;
    const grupNormaliY = (malzeme: number) => {
      const g = geo.groups.find((x) => x.materialIndex === malzeme)!;
      return normal.getY(index.getX(g.start));
    };
    expect(grupNormaliY(1)).toBeCloseTo(1, 6);
    expect(grupNormaliY(2)).toBeCloseTo(-1, 6);
    expect(PARA_KAPAK_YUZLERI[0]).toBe(paraYuzuAcidan(0));
    expect(PARA_KAPAK_YUZLERI[1]).toBe(paraYuzuAcidan(Math.PI));
  });

  it('her atışın son açısında yukarı bakan kapak sonucun yüzüdür', () => {
    for (const mevcut of [0, Math.PI, 5 * Math.PI]) {
      for (const hedef of ['tura', 'yazi'] as const) {
        const aci = paraHedefAcisi(mevcut, hedef, 4);
        // Para X ekseninde döner: üst kapağın normali (0, 1, 0) → y bileşeni cos(açı)
        const ustKapakYukarida = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(1, 0, 0), aci).y > 0;
        expect(ustKapakYukarida ? PARA_KAPAK_YUZLERI[0] : PARA_KAPAK_YUZLERI[1]).toBe(hedef);
      }
    }
  });
});

describe('2B madeni para (WebGL yoksa) ve şablon simgesi', () => {
  it('tura yüzü ortak gerçek para görselini, yazı yüzü «1» ve «LİRA» çizimini kullanır', () => {
    const tura = renderToStaticMarkup(React.createElement('svg', null, React.createElement(MadeniParaSvg, { yuz: 'tura', r: 70 })));
    expect(tura).toContain('data-madeni-para="tura"');
    expect(tura).toContain('Atatürk rölyefli');
    expect(tura).toContain(`href="${TURA_GORSELI}"`);
    expect(tura).not.toContain('<text');
    expect(tura).not.toContain(PARA_YAZILARI.birim);
    expect(tura).not.toContain('<path');
    const yazi = renderToStaticMarkup(React.createElement('svg', null, React.createElement(MadeniParaSvg, { yuz: 'yazi', r: 70 })));
    expect(yazi).toContain('data-madeni-para="yazi"');
    expect(yazi).toMatch(/>1<\/text>/);
    expect(yazi).toContain(`>${PARA_YAZILARI.birim}</text>`);
    expect(yazi).not.toContain('TÜRKİYE');
    for (const h of [yazi]) {
      expect(h).toContain(PARA_RENKLERI.halka.orta);
      expect(h).toContain(PARA_RENKLERI.gobek.orta);
    }
  });

  it('sekme simgesi: altın sarısı halka, gümüş gri göbek ve «1» (ay-yıldız maskesi yok)', () => {
    const h = renderToStaticMarkup(React.createElement(SablonSimgesi, { tur: 'para' }));
    expect(h).toContain(PARA_RENKLERI.halka.orta);
    expect(h).toContain(PARA_RENKLERI.gobek.orta);
    expect(h).toMatch(/>1<\/text>/);
    expect(h).not.toContain('<mask');
  });
});

describe('Atatürk rölyefi ortak görseli', () => {
  it('WebGL tura dokusu ortak görseli yükler ve tamamlandığında yeniden çizimi bildirir', () => {
    const texture = new THREE.Texture();
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockReturnValue(texture);
    try {
      const yenidenCiz = vi.fn();
      expect(paraDokusu('tura', 'renk', yenidenCiz)).toBe(texture);
      expect(load).toHaveBeenCalledWith(TURA_GORSELI, yenidenCiz);
      expect(yenidenCiz).not.toHaveBeenCalled();
      load.mock.calls[0][1]?.(texture);
      expect(yenidenCiz).toHaveBeenCalledOnce();
      expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(TURA_GORSELI).toMatch(/^data:image\/png;base64,/);
    } finally { load.mockRestore(); texture.dispose(); }
  });
});
