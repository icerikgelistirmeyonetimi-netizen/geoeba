import { describe, expect, it } from 'vitest';
import { etiketHizalama, type EtiketHizalamaKutusu } from '../etiketHizalama';

const kutu = (id: string, left: number, top: number, width = 40, height = 20): EtiketHizalamaKutusu =>
  ({ id, left, right: left + width, top, bottom: top + height });
const tasinan = kutu('tasinan', 100, 100);
const bosSonuc = { delta: { x: 0, y: 0 }, xKilavuzu: null, yKilavuzu: null, yatayHizalama: null };

describe('ölçüm etiketlerini ekran pikselinde hizalama', () => {
  it('hedef yoksa veya eşik dışındaysa konumu değiştirmez', () => {
    expect(etiketHizalama(tasinan, [])).toEqual(bosSonuc);
    expect(etiketHizalama(tasinan, [kutu('uzak', 107, 207)])).toEqual(bosSonuc);
  });

  it('6 px sınırını dahil eder ve özel eşiği uygular', () => {
    const hedef = kutu('hedef', 106, 200);
    expect(etiketHizalama(tasinan, [hedef]).delta.x).toBe(6);
    expect(etiketHizalama(tasinan, [hedef], 5)).toEqual(bosSonuc);
    expect(etiketHizalama(tasinan, [kutu('hedef', 108, 200)], 8).delta.x).toBe(8);
  });

  it.each([
    ['left', 104, 90],
    ['center', 94, 60],
    ['right', 84, 60],
  ] as const)('en küçük düzeltmeyle %s kenarını aynı kenara hizalar', (hizalama, left, width) => {
    const sonuc = etiketHizalama(tasinan, [kutu('hedef', left, 200, width)]);
    expect(sonuc.delta).toEqual({ x: 4, y: 0 });
    expect(sonuc.yatayHizalama).toBe(hizalama);
    expect(sonuc.xKilavuzu?.hizalama).toBe(hizalama);
  });

  it('farklı kenarları birbirine yakalayıp kutuları yan yana yapıştırmaz', () => {
    expect(etiketHizalama(tasinan, [kutu('hedef', 144, 124)])).toEqual(bosSonuc);
  });

  it.each(['left', 'center', 'right'] as const)('sabit %s çapasına sahip hedefte yalnız o kenarı seçer', (horizontalAlignment) => {
    const hedef = { ...kutu('hedef', 104, 200), horizontalAlignment };
    const sonuc = etiketHizalama(tasinan, [hedef]);
    expect(sonuc.delta).toEqual({ x: 4, y: 0 });
    expect(sonuc.yatayHizalama).toBe(horizontalAlignment);
    expect(sonuc.xKilavuzu?.hizalama).toBe(horizontalAlignment);
  });

  it.each([
    ['center', 85, 70],
    ['right', 80, 60],
  ] as const)('sol çapalı hedefin %s çizgisine yakalanmaz; çapasız hedefte aynı çizgi geçerlidir', (hizalama, left, width) => {
    const hedef = kutu('hedef', left, 200, width);
    expect(etiketHizalama(tasinan, [hedef]).yatayHizalama).toBe(hizalama);
    expect(etiketHizalama(tasinan, [{ ...hedef, horizontalAlignment: 'left' }])).toEqual(bosSonuc);
  });

  it('taşınan kutunun önceki yatay çapası yeni hedef hizalamasını kısıtlamaz', () => {
    const sonuc = etiketHizalama(
      { ...tasinan, horizontalAlignment: 'left' },
      [{ ...kutu('hedef', 85, 200, 70), horizontalAlignment: 'center' }],
    );
    expect(sonuc.yatayHizalama).toBe('center');
    expect(sonuc.xKilavuzu?.x).toBe(120);
  });

  it('hedefin sabit yatay çapası dikey hizalamayı etkilemez', () => {
    const sonuc = etiketHizalama(tasinan, [{ ...kutu('hedef', 85, 103, 70), horizontalAlignment: 'left' }]);
    expect(sonuc.delta).toEqual({ x: 0, y: 3 });
    expect(sonuc.xKilavuzu).toBeNull();
    expect(sonuc.yKilavuzu?.hizalama).toBe('top');
  });

  it('iki eksende aynı anda hizalar ve eşit düzeltmelerde sol/üst kenarı seçer', () => {
    const sonuc = etiketHizalama(tasinan, [kutu('hedef', 104, 103)]);
    expect(sonuc.delta).toEqual({ x: 4, y: 3 });
    expect(sonuc.xKilavuzu).toEqual({ x: 104, y1: 103, y2: 123, hedefId: 'hedef', hizalama: 'left' });
    expect(sonuc.yKilavuzu).toEqual({ y: 103, x1: 104, x2: 144, hedefId: 'hedef', hizalama: 'top' });
    expect(sonuc.yatayHizalama).toBe('left');
  });

  it.each([
    ['top', 102, 40],
    ['center', 95, 34],
    ['bottom', 82, 40],
  ] as const)('dikeyde %s çizgilerini eşleştirir', (hizalama, top, height) => {
    const sonuc = etiketHizalama(tasinan, [kutu('hedef', 300, top, 40, height)]);
    expect(sonuc.delta).toEqual({ x: 0, y: 2 });
    expect(sonuc.yKilavuzu?.hizalama).toBe(hizalama);
    expect(sonuc.xKilavuzu).toBeNull();
  });

  it('eksenleri farklı hedeflerle hizalar ve kılavuzları son kutuya kadar uzatır', () => {
    const sonuc = etiketHizalama(tasinan, [kutu('sutun', 96, 300), kutu('satir', 300, 105)]);
    expect(sonuc.delta).toEqual({ x: -4, y: 5 });
    expect(sonuc.xKilavuzu).toEqual({ x: 96, y1: 105, y2: 320, hedefId: 'sutun', hizalama: 'left' });
    expect(sonuc.yKilavuzu).toEqual({ y: 105, x1: 96, x2: 340, hedefId: 'satir', hizalama: 'top' });
  });

  it('aynı kimlikteki eski kutuya kendini geri yapıştırmaz', () => {
    const eski = kutu('tasinan', 102, 102);
    expect(etiketHizalama(tasinan, [eski])).toEqual(bosSonuc);
    expect(etiketHizalama(tasinan, [eski, kutu('diger', 104, 104)]).delta).toEqual({ x: 4, y: 4 });
  });

  it('eşit düzeltmede yakın satır/sütundaki hedefe öncelik verir', () => {
    const yakinSatir = kutu('z-yakin', 104, 130);
    const uzakSatir = kutu('a-uzak', 96, 400);
    expect(etiketHizalama(tasinan, [uzakSatir, yakinSatir]).xKilavuzu?.hedefId).toBe('z-yakin');
    const yakinSutun = kutu('z-yakin', 150, 104);
    const uzakSutun = kutu('a-uzak', 500, 96);
    expect(etiketHizalama(tasinan, [uzakSutun, yakinSutun]).yKilavuzu?.hedefId).toBe('z-yakin');
  });

  it('yakın hedef olsa bile daha küçük düzeltmeyi önce seçer', () => {
    const sonuc = etiketHizalama(tasinan, [kutu('yakin', 104, 130), kutu('az-duzeltme', 101, 400)]);
    expect(sonuc.delta.x).toBe(1);
    expect(sonuc.xKilavuzu?.hedefId).toBe('az-duzeltme');
  });

  it('eşit adaylarda giriş sırası sonucu değiştirmez', () => {
    const a = kutu('a', 104, 200);
    const b = kutu('b', 96, 200);
    const sonuc = etiketHizalama(tasinan, [a, b]);
    expect(sonuc).toEqual(etiketHizalama(tasinan, [b, a]));
    expect(sonuc.xKilavuzu?.hedefId).toBe('a');
  });

  it.each([20, 40, 120])('zoom %i olsa da 5 ekran pikselini yakalar, 7 pikseli yakalamaz', (zoom) => {
    const ekranKutusu = kutu('tasinan', 2 * zoom, 3 * zoom, zoom, zoom / 2);
    const hedef = (fark: number) => kutu('hedef', ekranKutusu.left + fark, ekranKutusu.top + 1000, zoom, zoom / 2);
    expect(etiketHizalama(ekranKutusu, [hedef(5)]).delta.x).toBe(5);
    expect(etiketHizalama(ekranKutusu, [hedef(7)]).xKilavuzu).toBeNull();
  });

  it('sıfır boyutlu kutuda sonlu düzeltme ve kılavuz üretir', () => {
    const sonuc = etiketHizalama(kutu('tasinan', 10, 20, 0, 0), [kutu('hedef', 14, 25, 0, 0)]);
    expect(sonuc.delta).toEqual({ x: 4, y: 5 });
    expect(sonuc.xKilavuzu).toEqual({ x: 14, y1: 25, y2: 25, hedefId: 'hedef', hizalama: 'left' });
    expect(sonuc.yKilavuzu).toEqual({ y: 25, x1: 14, x2: 14, hedefId: 'hedef', hizalama: 'top' });
  });

  it('tam hizalı kutuyu oynatmadan kılavuzunu gösterir', () => {
    const sonuc = etiketHizalama(tasinan, [kutu('hedef', 100, 200)], 0);
    expect(sonuc.delta).toEqual({ x: 0, y: 0 });
    expect(sonuc.xKilavuzu?.x).toBe(100);
    expect(sonuc.yKilavuzu).toBeNull();
  });

  it('bozuk koordinatları yok sayar; girdi kutularını değiştirmez', () => {
    const hedef = kutu('hedef', 104, 103);
    const onceki = { ...hedef };
    expect(etiketHizalama({ ...tasinan, left: NaN }, [hedef])).toEqual(bosSonuc);
    expect(etiketHizalama(tasinan, [{ ...hedef, right: Infinity }])).toEqual(bosSonuc);
    etiketHizalama(tasinan, [hedef]);
    expect(hedef).toEqual(onceki);
    expect(tasinan).toEqual(kutu('tasinan', 100, 100));
  });
});
