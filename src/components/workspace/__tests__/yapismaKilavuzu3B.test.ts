// @vitest-environment node
import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { YapismaIzi } from '@/math/yapisma3d';
import { KILAVUZ_RENGI, bosKilavuzDurumu, kilavuzuGuncelle, kilavuzuTemizle } from '../yapismaKilavuzu3B';

/* YAP3B kılavuzu (three.js, node'da): temas yüzü dolgu + kenar, teğet doğru, kesikli hiza çizgisi; ilkokulda hiza yok. */
const iz: YapismaIzi = {
  temaslar: [
    { tur: 'yuz', cift: 'a|b|x', kose: [{ x: -0.5, y: -0.5, z: 0 }, { x: -0.5, y: 0.5, z: 0 }, { x: -0.5, y: 0.5, z: 1 }, { x: -0.5, y: -0.5, z: 1 }] },
    { tur: 'cizgi', cift: 's|b|s', a: { x: 1, y: 0, z: 0 }, b: { x: 1, y: 0, z: 1 } },
  ],
  hizalar: [{ tur: 'kenar', a: { x: -0.8, y: -0.5, z: 0 }, b: { x: 0.8, y: -0.5, z: 0 } }],
  destekId: null,
};

describe('Mıknatıs kılavuzu', () => {
  afterEach(() => vi.useRealTimers());

  it('iz → dolgu, kenar halkası, teğet doğru ve kesikli hiza çizgisi; hepsi derinlik sınamasız, renderOrder 4', () => {
    const sahne = new THREE.Scene();
    const d = bosKilavuzDurumu();
    expect(kilavuzuGuncelle(sahne, d, iz, { hizaCizgisi: true }, () => {})).toBe(true);
    expect(d.grup?.parent).toBe(sahne);
    const cocuklar = d.grup!.children;
    expect(cocuklar).toHaveLength(4);
    expect(cocuklar[0]).toBeInstanceOf(THREE.Mesh);
    expect(cocuklar[1]).toBeInstanceOf(THREE.LineLoop);
    expect(cocuklar[3]).toBeInstanceOf(THREE.Line);
    expect((cocuklar[3] as THREE.Line).material).toBeInstanceOf(THREE.LineDashedMaterial);
    for (const c of cocuklar) {
      const m = (c as THREE.Mesh).material as THREE.Material & { color: THREE.Color };
      expect(m.depthTest).toBe(false);
      expect(m.color.getHex()).toBe(KILAVUZ_RENGI);
      expect(c.renderOrder).toBe(4);
    }
  });

  it('aynı iz → yeniden kurulmaz; ilkokulda (hizaCizgisi yok) kesikli çizgi çizilmez', () => {
    const sahne = new THREE.Scene();
    const d = bosKilavuzDurumu();
    kilavuzuGuncelle(sahne, d, iz, { hizaCizgisi: true }, () => {});
    const ilk = d.grup!.children[0];
    expect(kilavuzuGuncelle(sahne, d, iz, { hizaCizgisi: true }, () => {})).toBe(false);
    expect(d.grup!.children[0]).toBe(ilk);
    expect(kilavuzuGuncelle(sahne, d, iz, { hizaCizgisi: false }, () => {})).toBe(true);
    expect(d.grup!.children).toHaveLength(3);
    expect(d.grup!.children.some((c) => (c as THREE.Line).material instanceof THREE.LineDashedMaterial)).toBe(false);
  });

  it('yeni temas girişinde dolgu 120 ms koyulaşır, sonra 0,3 ve yeniden çizim', () => {
    vi.useFakeTimers();
    const sahne = new THREE.Scene();
    const d = bosKilavuzDurumu();
    const ciz = vi.fn();
    kilavuzuGuncelle(sahne, d, iz, { hizaCizgisi: true }, ciz);
    const dolgu = (d.grup!.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    expect(dolgu.opacity).toBeCloseTo(0.55, 9);
    vi.advanceTimersByTime(130);
    expect(dolgu.opacity).toBeCloseTo(0.3, 9);
    expect(ciz).toHaveBeenCalledTimes(1);
    // Aynı temas çifti kayarak sürerse (köşeler değişir) koyulaşma yinelenmez
    const kayan: YapismaIzi = { ...iz, temaslar: [{ ...iz.temaslar[0], kose: iz.temaslar[0].tur === 'yuz' ? iz.temaslar[0].kose.map((p) => ({ ...p, y: p.y + 0.1 })) : [] } as YapismaIzi['temaslar'][0]] };
    kilavuzuGuncelle(sahne, d, kayan, { hizaCizgisi: true }, ciz);
    expect(((d.grup!.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity).toBeCloseTo(0.3, 9);
  });

  it('temizle → 0 çocuk; sok → sahneden çıkar; başka sahnede (StrictMode) yeniden eklenir', () => {
    const sahne = new THREE.Scene();
    const d = bosKilavuzDurumu();
    kilavuzuGuncelle(sahne, d, iz, { hizaCizgisi: true }, () => {});
    expect(kilavuzuTemizle(d)).toBe(true);
    expect(d.grup!.children).toHaveLength(0);
    expect(kilavuzuTemizle(d)).toBe(false);
    const yeniSahne = new THREE.Scene();
    kilavuzuGuncelle(yeniSahne, d, iz, { hizaCizgisi: true }, () => {});
    expect(d.grup!.parent).toBe(yeniSahne);
    expect(sahne.children).not.toContain(d.grup);
    kilavuzuTemizle(d, true);
    expect(d.grup).toBeNull();
    expect(yeniSahne.children).toHaveLength(0);
    // İz yoksa kılavuz boş kalır
    expect(kilavuzuGuncelle(yeniSahne, d, null, { hizaCizgisi: true }, () => {})).toBe(false);
  });
});
