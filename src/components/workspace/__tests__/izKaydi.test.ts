import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import { NESNE_RENGI } from '@/utils/nesneRenkleri';
import { iziCikar, izleriGuncelle, oynatmaIstegi, surguOynatmasiDegisir } from '../izKaydi';

/*
 * İz kaydı ve oynatma isteği (Canvas'taki efektlerden ayrıldı; davranış birebir korunur). İz kaydı: İzi Göster açık
 * noktanın her yeni konumu (0,02 birimden fazla kaydıysa) izine eklenir, iz en çok 600 + 1 kayıt tutar; izi kapatılan ya
 * da silinen nesnenin izi kalkar.
 */

const nokta = (id: string, x: number, y: number, ek: Record<string, unknown> = {}) =>
  ({ id, type: 'point', label: id, x, y, visible: true, showTrace: true, color: '#dc2626', ...ek }) as unknown as MathObject;

describe('izleriGuncelle', () => {
  it('İzi Göster açık noktanın ilk konumu kaydedilir; değişiklik yoksa aynı nesne döner', () => {
    const ilk = izleriGuncelle({}, [nokta('A', 1, 2)]);
    expect(ilk).toEqual({ A: { color: '#dc2626', points: [{ x: 1, y: 2 }] } });
    expect(izleriGuncelle(ilk, [nokta('A', 1, 2)])).toBe(ilk);
    expect(izleriGuncelle(ilk, [nokta('A', 1.01, 2.01)])).toBe(ilk);
  });

  it('0,02 birimden fazla kayınca yeni konum eklenir; renk noktanın güncel rengi (yoksa mavi)', () => {
    const ilk = izleriGuncelle({}, [nokta('A', 0, 0)]);
    const ikinci = izleriGuncelle(ilk, [nokta('A', 0.03, 0, { color: '' })]);
    expect(ikinci).not.toBe(ilk);
    expect(ikinci.A).toEqual({ color: NESNE_RENGI.mavi, points: [{ x: 0, y: 0 }, { x: 0.03, y: 0 }] });
    // Önceki kayıt değiştirilmez
    expect(ilk.A.points).toHaveLength(1);
  });

  it('iz en çok 601 kayıt tutar (son 600 ve yeni konum)', () => {
    let izler = {};
    for (let i = 0; i < 700; i++) izler = izleriGuncelle(izler, [nokta('A', i, 0)]);
    const { points } = (izler as Record<string, { points: { x: number }[] }>).A;
    expect(points).toHaveLength(601);
    expect(points[0].x).toBe(99);
    expect(points[600].x).toBe(699);
  });

  it('gizli nokta kaydedilmez ama izi silinmez; izi kapatılan ya da silinen nesnenin izi kalkar', () => {
    const ilk = izleriGuncelle({}, [nokta('A', 0, 0), nokta('B', 1, 1)]);
    const gizli = izleriGuncelle(ilk, [nokta('A', 5, 5, { visible: false }), nokta('B', 1, 1)]);
    expect(gizli).toBe(ilk);
    const kapali = izleriGuncelle(ilk, [nokta('A', 0, 0, { showTrace: false }), nokta('B', 1, 1)]);
    expect(Object.keys(kapali)).toEqual(['B']);
    expect(Object.keys(izleriGuncelle(ilk, [nokta('B', 1, 1)]))).toEqual(['B']);
  });

  it('nokta olmayan nesnelerin izi kaydedilmez (izi açık olsa da)', () => {
    const parca = { id: 's', type: 'segment', visible: true, showTrace: true } as unknown as MathObject;
    const bos = {};
    expect(izleriGuncelle(bos, [parca])).toBe(bos);
  });
});

describe('iziCikar', () => {
  it('tek izi siler, olmayan izde aynı nesneyi döndürür', () => {
    const izler = { A: { color: 'r', points: [] }, B: { color: 'g', points: [] } };
    expect(iziCikar(izler, 'A')).toEqual({ B: izler.B });
    expect(iziCikar(izler, 'C')).toBe(izler);
  });
});

describe('oynatmaIstegi ve surguOynatmasiDegisir', () => {
  it('ayrıntı metinse kipin kendisi; nesneyse kip (yoksa toggle) ve hedef', () => {
    expect(oynatmaIstegi('play')).toEqual({ kip: 'play', hedef: undefined });
    expect(oynatmaIstegi(undefined)).toEqual({ kip: 'toggle', hedef: undefined });
    expect(oynatmaIstegi(null)).toEqual({ kip: 'toggle', hedef: undefined });
    expect(oynatmaIstegi({ mode: 'stop', targetId: 'a' })).toEqual({ kip: 'stop', hedef: 'a' });
    expect(oynatmaIstegi({ targetId: 'P' })).toEqual({ kip: 'toggle', hedef: 'P' });
  });

  it('sürgü oynatması: toggle her zaman, play yalnız dururken, stop yalnız oynarken; bilinmeyen kip değiştirmez', () => {
    expect(surguOynatmasiDegisir('toggle', true)).toBe(true);
    expect(surguOynatmasiDegisir('toggle', false)).toBe(true);
    expect(surguOynatmasiDegisir('play', false)).toBe(true);
    expect(surguOynatmasiDegisir('play', true)).toBe(false);
    expect(surguOynatmasiDegisir('stop', true)).toBe(true);
    expect(surguOynatmasiDegisir('stop', false)).toBe(false);
    expect(surguOynatmasiDegisir('pause', true)).toBe(false);
  });
});
