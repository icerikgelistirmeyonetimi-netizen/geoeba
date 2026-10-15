// 2B ve 3B para aynı kapak görsellerini kullanır. Yazı/tura sonucu ile yukarı bakan kapak ilişkisi korunur.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import { PARA_RENKLERI, PARA_TIRTIK_SAYISI, paraKenariniCiz, type Cizim2B } from '../madeniPara';
import { MadeniParaSvg } from '../MadeniPara2B';
import { SablonSimgesi } from '../SablonSimgesi';
import { DeneySahnesi, PARA_DOKU_DONUSU, PARA_KAPAK_YUZLERI, paraDokusu, paraHedefAcisi, paraYuzuAcidan } from '../deneySahnesi';
import { TURA_GORSELI } from '../turaGorseli';
import { YAZI_GORSELI } from '../yaziGorseli';

describe('madeni para kenarı', () => {
  it('renk ve yükseklik dokuları her tırtık için bir koyu, bir açık şerit çizer', () => {
    for (const kip of ['renk', 'yukseklik'] as const) {
      const ctx: Cizim2B = { fillRect: vi.fn(), fillStyle: '' };
      paraKenariniCiz(ctx, 512, kip);
      expect(ctx.fillRect).toHaveBeenCalledTimes(1 + PARA_TIRTIK_SAYISI * 2);
      expect(ctx.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 512, 512);
    }
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

const YUZLER = [
  { yuz: 'tura', gorsel: TURA_GORSELI, baslik: 'Atatürk rölyefli 1 Türk lirası — tura yüzü' },
  { yuz: 'yazi', gorsel: YAZI_GORSELI, baslik: '1 Türk lirası — yazı yüzü' },
] as const;

describe('2B madeni para ve şablon simgesi', () => {
  it.each(YUZLER)('$yuz yüzü ortak görseli gölgesiyle kullanır; eski çizim üstüne binmez', ({ yuz, gorsel, baslik }) => {
    const html = renderToStaticMarkup(React.createElement('svg', null, React.createElement(MadeniParaSvg, { yuz, r: 70 })));
    expect(html).toContain('data-madeni-para="' + yuz + '"');
    expect(html).toContain('<title>' + baslik + '</title>');
    expect(html).toContain('href="' + gorsel.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"');
    expect(html).toContain('x="-70" y="-70" width="140" height="140"');
    expect(html).toContain('<ellipse');
    expect(html).not.toMatch(/<(text|path|circle|defs)\b/);
  });

  it('yazı kaynağı Pages önekiyle yüklenen, kare çerçeveli ve kendi dokularını içeren SVG vektörüdür', () => {
    expect(YAZI_GORSELI).toBe(`${process.env.NEXT_PUBLIC_ASSET_PREFIX ?? ''}/olasilik/para-yazi.svg`);
    const svg = readFileSync(resolve(__dirname, '../../../../../public/olasilik/para-yazi.svg'), 'utf8');
    expect(svg).toMatch(/<path\b/);
    const viewBox = svg.match(/\bviewBox="([^"]+)"/)?.[1].split(/\s+/).map(Number);
    expect(viewBox).toHaveLength(4);
    expect(viewBox![2]).toBeGreaterThan(0);
    expect(viewBox![2]).toBe(viewBox![3]);
    // Özgün EPS'deki metal dokuları SVG içine gömülüdür; dışarıdan dosya yüklememeli.
    const kaynaklar = [...svg.matchAll(/\b(?:xlink:)?href="([^"]+)"/g)].map((m) => m[1]);
    expect(kaynaklar.length).toBeGreaterThan(0);
    for (const kaynak of kaynaklar) expect(kaynak).toMatch(/^(#|data:image\/png;base64,)/);
    expect(TURA_GORSELI).toMatch(/^data:image\/png;base64,/);
    expect(YAZI_GORSELI).not.toBe(TURA_GORSELI);
  });

  it('sekme simgesi: altın sarısı halka, gümüş gri göbek ve «1»', () => {
    const html = renderToStaticMarkup(React.createElement(SablonSimgesi, { tur: 'para' }));
    expect(html).toContain(PARA_RENKLERI.halka.orta);
    expect(html).toContain(PARA_RENKLERI.gobek.orta);
    expect(html).toMatch(/>1<\/text>/);
    expect(html).not.toContain('<mask');
  });
});

describe('3B madeni para görselleri', () => {
  it.each(YUZLER)('$yuz dokusu 2B ile aynı görseli yükler ve tamamlandığında yeniden çizimi bildirir', ({ yuz, gorsel }) => {
    const texture = new THREE.Texture();
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockReturnValue(texture);
    try {
      const yenidenCiz = vi.fn();
      expect(paraDokusu(yuz, yenidenCiz)).toBe(texture);
      expect(load).toHaveBeenCalledWith(gorsel, yenidenCiz);
      expect(yenidenCiz).not.toHaveBeenCalled();
      load.mock.calls[0][1]?.(texture);
      expect(yenidenCiz).toHaveBeenCalledOnce();
      expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
      expect(texture.anisotropy).toBe(4);
    } finally { load.mockRestore(); texture.dispose(); }
  });

  it('kapaklara eski kabartma eklenmez; kenar tırtığı, yönler ve yükleme sonrası çizim korunur', () => {
    const dokular: THREE.Texture[] = [];
    const load = vi.spyOn(THREE.TextureLoader.prototype, 'load').mockImplementation(() => {
      const doku = new THREE.Texture();
      dokular.push(doku);
      return doku;
    });
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => ({ fillRect: vi.fn(), fillStyle: '' }) }) });
    const sahne = {
      nesneler: new THREE.Group(),
      ciz: vi.fn(),
      temasGolgesi: () => new THREE.Group(),
      para: null as THREE.Mesh | null,
    };
    try {
      Reflect.get(DeneySahnesi.prototype, 'paraKur').call(sahne);
      const malzemeler = sahne.para!.material as THREE.MeshStandardMaterial[];
      expect(malzemeler[0].bumpMap).toBeInstanceOf(THREE.CanvasTexture);
      expect(malzemeler[1].bumpMap).toBeNull();
      expect(malzemeler[2].bumpMap).toBeNull();
      expect(load.mock.calls.map(([url]) => url)).toEqual([TURA_GORSELI, YAZI_GORSELI]);
      expect(malzemeler[1].map).toBe(dokular[0]);
      expect(malzemeler[2].map).toBe(dokular[1]);
      expect(dokular[0].rotation).toBe(PARA_DOKU_DONUSU);
      expect(dokular[1].rotation).toBe(-PARA_DOKU_DONUSU);
      for (let i = 0; i < 2; i++) {
        expect(dokular[i].center.toArray()).toEqual([0.5, 0.5]);
        load.mock.calls[i][1]?.(dokular[i]);
      }
      expect(sahne.ciz).toHaveBeenCalledTimes(2);
    } finally {
      if (sahne.para) {
        sahne.para.geometry.dispose();
        for (const malzeme of sahne.para.material as THREE.MeshStandardMaterial[]) {
          malzeme.map?.dispose();
          malzeme.bumpMap?.dispose();
          malzeme.dispose();
        }
      }
      load.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
