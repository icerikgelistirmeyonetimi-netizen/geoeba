import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import {
  etiketSilAraciylaSilinirMi,
  etiketSilindiIpucu,
  etiketTiklamaEylemi,
  uzunBasisMi,
} from '../measurementLabelClick';

const base = { showLabel: true, visible: true, createdAt: 0 };
const aci = (label = '∠ABC'): MathObject =>
  ({ ...base, id: 'ang', label, type: 'angle', point1Id: 'A', vertexPointId: 'B', point3Id: 'C' }) as MathObject;
const egim = (label = 'AB eğimi'): MathObject =>
  ({ ...base, id: 'm1', label, type: 'measurement', kind: 'slope', pointIds: ['A', 'B'], showValue: true }) as MathObject;
const parca: MathObject = { ...base, id: 's1', label: 'AB', type: 'segment', startPointId: 'A', endPointId: 'B' } as MathObject;
const nokta: MathObject = { ...base, id: 'A', label: 'A', type: 'point', x: 0, y: 0 } as MathObject;
const yay: MathObject = {
  ...base, id: 'arc', label: 'yay', type: 'arc', centerPointId: 'O', startPointId: 'S', directionPointId: 'D',
} as MathObject;

describe('etiketTiklamaEylemi (rozete tıklama)', () => {
  it('açı rozeti HER araçla açının tamamını siler (yay kalmaz)', () => {
    for (const arac of ['select', 'delete', 'point', 'angle', 'segment', 'compass']) {
      expect(etiketTiklamaEylemi(aci(), 'angle', arac)).toBe('aciyiSil');
    }
  });

  it('Sil aracında bağımsız ölçüm etiketi ölçüm nesnesini siler, başka araçta yalnızca gizler', () => {
    expect(etiketTiklamaEylemi(egim(), 'measure', 'delete')).toBe('olcumuSil');
    expect(etiketTiklamaEylemi(egim(), 'measure', 'select')).toBe('gizle');
  });

  it('şekle ait etiketler Sil aracında da yalnızca gizlenir', () => {
    for (const arac of ['select', 'delete']) {
      expect(etiketTiklamaEylemi(parca, 'length', arac)).toBe('gizle');
      expect(etiketTiklamaEylemi(yay, 'centralAngle', arac)).toBe('gizle');
      expect(etiketTiklamaEylemi(yay, 'arcLength', arac)).toBe('gizle');
      expect(etiketTiklamaEylemi(yay, 'radius', arac)).toBe('gizle');
      expect(etiketTiklamaEylemi(parca, 'edge2', arac)).toBe('gizle');
    }
  });

  it('nokta adı gizlenemez ve silinmez', () => {
    expect(etiketTiklamaEylemi(nokta, 'pointLabel', 'delete', false)).toBe('yok');
    expect(etiketTiklamaEylemi(nokta, 'pointLabel', 'select', false)).toBe('yok');
  });

  it('tür ile nesne uyuşmazsa silmez (ör. bulunamayan nesne)', () => {
    expect(etiketTiklamaEylemi(undefined, 'angle', 'delete')).toBe('gizle');
    expect(etiketTiklamaEylemi(parca, 'measure', 'delete')).toBe('gizle');
  });
});

describe('etiketSilAraciylaSilinirMi (Sil aracında sürükleme başlamaz)', () => {
  it('yalnızca Sil aracında ve silinecek etiketlerde true', () => {
    expect(etiketSilAraciylaSilinirMi(aci(), 'angle', 'delete')).toBe(true);
    expect(etiketSilAraciylaSilinirMi(egim(), 'measure', 'delete')).toBe(true);
    expect(etiketSilAraciylaSilinirMi(aci(), 'angle', 'select')).toBe(false);
    expect(etiketSilAraciylaSilinirMi(parca, 'length', 'delete')).toBe(false);
    expect(etiketSilAraciylaSilinirMi(nokta, 'pointLabel', 'delete', false)).toBe(false);
  });
});

describe('etiketSilindiIpucu', () => {
  it('açının adını kullanır ve geri almayı söyler', () => {
    expect(etiketSilindiIpucu(aci())).toBe("∠ABC açısı silindi. Geri almak için Geri Al'ı (Ctrl+Z) kullanın.");
    expect(etiketSilindiIpucu(aci(''))).toBe("Açı silindi. Geri almak için Geri Al'ı (Ctrl+Z) kullanın.");
    expect(etiketSilindiIpucu(aci('ABC açısı'))).toBe("ABC açısı silindi. Geri almak için Geri Al'ı (Ctrl+Z) kullanın.");
  });

  it('ölçüm nesnesinin adını kullanır', () => {
    expect(etiketSilindiIpucu(egim())).toBe("AB eğimi silindi. Geri almak için Geri Al'ı (Ctrl+Z) kullanın.");
    expect(etiketSilindiIpucu(egim(''))).toBe("Ölçüm silindi. Geri almak için Geri Al'ı (Ctrl+Z) kullanın.");
  });
});

describe('uzunBasisMi (dokunmatik uzun basış menü açar, silmez)', () => {
  it('yalnızca BU basış sırasında menü gerçekten açıldıysa tıklama sayılmaz', () => {
    expect(uzunBasisMi(null, 1000)).toBe(false);
    // Menü hiç açılmadı: basış ne kadar uzun sürerse sürsün dokunuş bir tıklamadır (ölü bölge yok)
    expect(uzunBasisMi({ zaman: 1000, fare: false }, null)).toBe(false);
    // Menü bu basıştan ÖNCE (eski bir uzun basışta) açılmıştı
    expect(uzunBasisMi({ zaman: 1000, fare: false }, 400)).toBe(false);
    // Menü bu basış sırasında açıldı (600 ms zamanlayıcısı)
    expect(uzunBasisMi({ zaman: 1000, fare: false }, 1600)).toBe(true);
    // Fare tıklaması hiçbir zaman uzun basış sayılmaz
    expect(uzunBasisMi({ zaman: 1000, fare: true }, 1600)).toBe(false);
  });
});

describe('yay ölçümü rozeti ("BD yayı", çember bölünmeden)', () => {
  const yayOlcumu = { ...base, id: 'y', label: 'BD yayı', type: 'measurement', kind: 'arc', pointIds: ['B', 'D'], circleId: 'k', showValue: true } as MathObject;
  it('HER araçta rozete tıklamak ölçümün tamamını siler (sahipsiz vurgu kalmaz)', () => {
    for (const arac of ['select', 'measure_arc', 'delete', 'point']) expect(etiketTiklamaEylemi(yayOlcumu, 'measure', arac)).toBe('olcumuSil');
  });
  it('Seç aracında sürüklenebilir kalır; Sil aracında silme düğmesidir', () => {
    expect(etiketSilAraciylaSilinirMi(yayOlcumu, 'measure', 'select')).toBe(false);
    expect(etiketSilAraciylaSilinirMi(yayOlcumu, 'measure', 'delete')).toBe(true);
  });
  it('eğim etiketi Seç aracında yine yalnızca gizlenir; ipucu yayın adını söyler', () => {
    expect(etiketTiklamaEylemi(egim(), 'measure', 'select')).toBe('gizle');
    expect(etiketSilindiIpucu(yayOlcumu)).toContain('BD yayı silindi');
  });
});
