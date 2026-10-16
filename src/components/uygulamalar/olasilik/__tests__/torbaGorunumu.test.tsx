// @vitest-environment node
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SvgDeney } from '../DeneyAlani';
import type { Sablon } from '../olasilik';
import { tekDeneme, yeniDeneyDurumu } from '../simulasyon';
import { torbaBilyeleriniGuncelle, torbaBilyeleriniKur, torbaGorunenAdetleri } from '../torbaGorunumu';

const sablon: Extract<Sablon, { tur: 'torba' }> = {
  tur: 'torba',
  bilyeler: [{ ad: 'Kırmızı', renk: '#ff0000', adet: 2 }, { ad: 'Mavi', renk: '#0000ff', adet: 1 }],
  iadeli: false,
  istenenRenk: 'Kırmızı',
};

function svgAdetleri(s: typeof sablon, kalan?: readonly number[]): number[] {
  const html = renderToStaticMarkup(<SvgDeney sablon={s} sonuc={null} azHareket={true} birikim={null} torbaKalan={kalan} />);
  return s.bilyeler.map((b) => html.split(`data-torba-bilyesi="${b.ad}"`).length - 1);
}

function ucBoyutAdetleri(grup: THREE.Group): number[] {
  return sablon.bilyeler.map((b) => grup.children.filter((o) => o.visible && (o as THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>).material.color.getHexString() === b.renk.slice(1)).length);
}

describe('şeffaf torbanın gerçek kalan bilyeleri', () => {
  it('2B ve 3B iadesiz çekilişi, boş torbayı ve sonraki çekilişte yenilenmeyi modelle aynı gösterir', () => {
    const durum = yeniDeneyDurumu(sablon);
    const grup = torbaBilyeleriniKur(sablon);
    const konumlar = grup.children.map((o) => o.position.toArray());
    const beklenenAdetler = [[2, 1], [1, 1], [0, 1], [0, 0], [1, 1]];
    for (let i = 0; i < beklenenAdetler.length; i++) {
      if (i > 0) tekDeneme(sablon, { sonraki: () => 0 }, durum);
      const adetler = torbaGorunenAdetleri(sablon, durum.torbaKalan);
      torbaBilyeleriniGuncelle(grup, adetler);
      expect(svgAdetleri(sablon, durum.torbaKalan)).toEqual(beklenenAdetler[i]);
      expect(ucBoyutAdetleri(grup)).toEqual(beklenenAdetler[i]);
    }
    expect(grup.children.map((o) => o.position.toArray())).toEqual(konumlar);
    expect(sablon.bilyeler.map((b) => b.adet)).toEqual([2, 1]);
  });

  it('çekiliş animasyonu boyunca model değişmeden görsel sayılar azalmaz', () => {
    const durum = yeniDeneyDurumu(sablon);
    const bekleyen = { torbaKalan: durum.torbaKalan?.slice() };
    tekDeneme(sablon, { sonraki: () => 0 }, bekleyen);
    expect(svgAdetleri(sablon, durum.torbaKalan)).toEqual([2, 1]);
    // Animasyon bitiminde uygulama bekleyen modeli yayımlar.
    expect(svgAdetleri(sablon, bekleyen.torbaKalan)).toEqual([1, 1]);
  });

  it('iadeli ilkokul kartlarında başlangıç sayıları korunur; sıfırlama ve yeniden açılış desteklenir', () => {
    const iadeli = { ...sablon, iadeli: true };
    expect(svgAdetleri(iadeli, [0, 0])).toEqual([2, 1]);
    expect(torbaGorunenAdetleri(iadeli, [0, 0])).toEqual([2, 1]);
    expect(svgAdetleri(sablon)).toEqual([2, 1]);
    expect(svgAdetleri(sablon, [0, 1])).toEqual([0, 1]);
  });
});
