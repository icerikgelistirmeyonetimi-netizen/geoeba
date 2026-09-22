import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOOL_GROUPS } from '../toolDefinitions';
import { cizimAraciMi, imlecDegeri, imlecSinifi, type ImlecHedefi } from '../imlecSiniflari';

const HEDEFLER: ImlecHedefi[] = ['bos', 'nokta', 'nesne', 'etiket', 'cisim'];
const TUM_ARACLAR = TOOL_GROUPS.flatMap((g) => g.tools.map((t) => t.id as string));
const CIZIM_ARACLARI = TUM_ARACLAR.filter((id) => id !== 'select' && id !== 'pan' && id !== 'delete');
const EL_SINIFI = /cursor-(pointer|grab|grabbing|move)\b/;

describe('imlecSinifi: çizim araçlarında imleç hiç el olmaz', () => {
  it('araç listesi dolu ve seç/el/sil dışındaki araçları kapsıyor', () => {
    expect(CIZIM_ARACLARI.length).toBeGreaterThan(20);
    for (const id of ['point', 'segment', 'circle', 'polygon', 'angle', 'measure_area', 'measure_distance', 'rotate', 'reflect', 'text', 'pen', 'compass']) {
      expect(CIZIM_ARACLARI).toContain(id);
    }
  });

  it('her çizim / inşa / ölçme / dönüşüm aracında her hedef artı imleci', () => {
    for (const arac of CIZIM_ARACLARI) {
      expect(cizimAraciMi(arac)).toBe(true);
      for (const hedef of HEDEFLER) {
        const sinif = imlecSinifi(arac, hedef);
        expect(sinif, `${arac}/${hedef}`).toBe('cursor-crosshair');
        expect(sinif).not.toMatch(EL_SINIFI);
        expect(imlecDegeri(arac, hedef), `${arac}/${hedef}`).toBe('crosshair');
      }
    }
  });

  it('kaydırma bayrağı çizim aracında da eli getirmez (orta tuşla kaydırma)', () => {
    for (const hedef of HEDEFLER) {
      expect(imlecSinifi('point', hedef, { kaydiriliyor: true })).toBe('cursor-crosshair');
      expect(imlecDegeri('segment', hedef, { kaydiriliyor: true })).toBe('crosshair');
    }
  });
});

describe('imlecSinifi: Sil aracı', () => {
  it('her yerde artı; el ya da taşıma imleci yok', () => {
    expect(cizimAraciMi('delete')).toBe(false);
    for (const hedef of HEDEFLER) {
      expect(imlecSinifi('delete', hedef)).toBe('cursor-crosshair');
      expect(imlecDegeri('delete', hedef)).toBe('crosshair');
    }
  });
});

describe('imlecSinifi: Seç ve Taşı', () => {
  it('boş tuvalde olağan ok', () => {
    expect(imlecSinifi('select', 'bos')).toBe('cursor-default');
    expect(imlecDegeri('select', 'bos')).toBe('default');
  });
  it('nokta, nesne ve cisimde açık el, basılıyken kapalı el', () => {
    for (const hedef of ['nokta', 'nesne', 'cisim'] as ImlecHedefi[]) {
      expect(imlecSinifi('select', hedef)).toBe('cursor-grab active:cursor-grabbing');
      expect(imlecDegeri('select', hedef)).toBe('grab');
    }
  });
  it('ölçüm etiketi taşıma imleci', () => {
    expect(imlecSinifi('select', 'etiket')).toBe('cursor-move');
    expect(imlecDegeri('select', 'etiket')).toBe('move');
  });
  it('seçim aracı çizim aracı sayılmaz', () => {
    expect(cizimAraciMi('select')).toBe(false);
  });
});

describe('imlecSinifi: El aracı', () => {
  it('her yerde açık el (nesnelerin üstünde de)', () => {
    expect(imlecSinifi('pan', 'bos')).toBe('cursor-grab');
    for (const hedef of ['nokta', 'nesne', 'etiket', 'cisim'] as ImlecHedefi[]) {
      expect(imlecSinifi('pan', hedef)).toBe('cursor-grab active:cursor-grabbing');
    }
    for (const hedef of HEDEFLER) expect(imlecDegeri('pan', hedef)).toBe('grab');
    expect(cizimAraciMi('pan')).toBe(false);
  });
  it('kaydırırken kapalı el', () => {
    for (const hedef of HEDEFLER) {
      expect(imlecSinifi('pan', hedef, { kaydiriliyor: true })).toBe('cursor-grabbing');
      expect(imlecDegeri('pan', hedef, { kaydiriliyor: true })).toBe('grabbing');
    }
  });
});

describe('imlecSinifi: hiçbir hedefte parmaklı el (pointer) yok', () => {
  it('bütün araç x hedef x kaydırma birleşimleri', () => {
    for (const arac of TUM_ARACLAR) {
      for (const hedef of HEDEFLER) {
        for (const kaydiriliyor of [false, true]) {
          expect(imlecSinifi(arac, hedef, { kaydiriliyor })).not.toMatch(/cursor-pointer/);
          expect(imlecDegeri(arac, hedef, { kaydiriliyor })).not.toBe('pointer');
        }
      }
    }
  });
});

describe('Canvas.tsx: 2B çizim yüzeyindeki imleçler yardımcıdan geçer', () => {
  const kaynak = readFileSync(path.resolve(__dirname, '../Canvas.tsx'), 'utf8');
  const bas = kaynak.indexOf('data-workspace-canvas="2d"');
  const son = kaynak.indexOf('</svg>', bas);
  const yuzey = kaynak.slice(bas, son);

  it('çizim yüzeyi bulunur', () => {
    expect(bas).toBeGreaterThan(0);
    expect(son).toBeGreaterThan(bas);
  });

  it('nesne katmanlarında sabit el / taşıma sınıfı yok (yalnız kaydırıcı tutamağı gerçek denetim)', () => {
    const satirlar = yuzey.split('\n').filter((s) => /cursor-(pointer|grab|grabbing|move)\b/.test(s));
    // Kaydırıcı tutamağı bir arayüz denetimidir (sürüklenen kol); onun dışında sabit imleç sınıfı kalmamalı.
    const denetimDisi = satirlar.filter((s) => !s.includes('drop-shadow-md'));
    expect(denetimDisi).toEqual([]);
  });

  it('satır içi sabit el / taşıma imleci yok', () => {
    expect(yuzey).not.toMatch(/cursor:\s*['"](pointer|grab|grabbing|move)['"]/);
  });

  it('eski "seçte taşı, değilse parmak" üçlüsü kalmadı', () => {
    expect(kaynak).not.toMatch(/activeTool === 'select' \? 'cursor-/);
    // Ölçüm etiketinin satır içi imleci de araca göre elle seçilmez
    expect(kaynak).not.toMatch(/cursor:\s*activeTool/);
  });
});
