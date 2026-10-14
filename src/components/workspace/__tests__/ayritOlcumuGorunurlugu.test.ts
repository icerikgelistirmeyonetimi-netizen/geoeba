import { describe, expect, it } from 'vitest';
import { ayritiDegistir, ayritOlcumuGorunurlukIster, type OlculenAyrit } from '../canvas3dDonusum';

describe('3B ayrıt ölçümünün görünürlüğü', () => {
  const ilk = { solidId: 'prizma', edgeIdx: 2 };
  const ikinci = { solidId: 'prizma', edgeIdx: 3 };

  it('Sade görünümde ilk ölçüyü eklemek ölçüleri görünür yapar', () => {
    const liste: OlculenAyrit[] = [];
    expect(ayritOlcumuGorunurlukIster(liste, ilk, false)).toBe(true);
    expect(ayritiDegistir(liste, ilk)).toEqual([ilk]);
    expect(liste).toEqual([]);
  });

  it('ölçüler sonradan gizlenince yeni ayrıt ölçmek eski ölçülerle birlikte görünürlüğü geri ister', () => {
    const liste = ayritiDegistir([], ilk);
    expect(ayritOlcumuGorunurlukIster(liste, ikinci, false)).toBe(true);
    expect(ayritiDegistir(liste, ikinci)).toEqual([ilk, ikinci]);
  });

  it('mevcut ölçüyü kaldırmak gizli görünümü zorla açmaz', () => {
    const liste = ayritiDegistir(ayritiDegistir([], ilk), ikinci);
    expect(ayritOlcumuGorunurlukIster(liste, { ...ilk }, false)).toBe(false);
    expect(ayritiDegistir(liste, ilk)).toEqual([ikinci]);
  });

  it.each([true, undefined])('ölçüler zaten görünürken (%s) ekleme ve kaldırma görünüm olayı istemez', (gorunur) => {
    expect(ayritOlcumuGorunurlukIster([], ilk, gorunur)).toBe(false);
    expect(ayritOlcumuGorunurlukIster([ilk], ilk, gorunur)).toBe(false);
  });

  it('aynı ayrıt numarası başka cisme aitse yeni ölçü sayılır', () => {
    const diger = { solidId: 'kup', edgeIdx: ilk.edgeIdx };
    expect(ayritOlcumuGorunurlukIster([ilk], diger, false)).toBe(true);
    expect(ayritiDegistir([ilk], diger)).toEqual([ilk, diger]);
  });
});
