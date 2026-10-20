import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DaireGrafigi } from '../DaireGrafigi';
import { KategorikIstatistik, KategorikSutunGrafigi } from '../KategorikGrafikler';
import { NesneGrafigi } from '../NesneGrafigi';
import { hazirSoruUygula, olcumGirisHatasi, olcumSatirlari } from '../arastirma';
import { baslangicDurumu, durumKurallari, sekmeDuzelt, tabloDuzenle, tabloGirisHatasi } from '../durum';
import { hucreYaz, kademeOrnekleri, ornekBul, tabloOlustur } from '../veri';
import { sinifKurallari } from '../sinifKurallari';

const bos = () => {};

describe('TEGM: grafik anlamı ve program kapsamı', () => {
  it('öğrenci kodları çizgiyle bağlanamaz; zaman serisi çizgi olarak korunur', () => {
    const d = baslangicDurumu();
    expect(sekmeDuzelt({...d, sekme: 'cizgi', tablo: ornekBul('boy')!.olustur()}).sekme).toBe('sutun');
    expect(sekmeDuzelt({...d, sekme: 'cizgi', tablo: ornekBul('sicaklik')!.olustur()}).sekme).toBe('cizgi');
    const numarali = tabloOlustur(['Öğrenci numarası', 'Puan'], [[1, 70], [2, 80]]);
    expect(sekmeDuzelt({...d, sekme: 'cizgi', tablo: numarali}).sekme).toBe('sutun');
  });

  it('ortaokul örneği ve sınıfsız oturum saçılımı ve standart sapmayı açmaz; lise örneklerinde standart sapma var, saçılım yalnız 11–12. sınıfta', () => {
    for (const sinif of [5, 6, 7, 8] as const) expect(sinifKurallari(sinif).sekmeler).not.toContain('sacilim');
    const orta = durumKurallari({ornekId: null, etkinKume: 'tablom'}, false, true);
    expect(orta.sekmeler).not.toContain('sacilim');
    expect(orta.olculer.standartSapma).toBe(false);
    expect(kademeOrnekleri('ortaokul').some(o => o.onerilenGrafik === 'sacilim')).toBe(false);
    // Lise galerisi lise örnekleridir: standart sapma (lise ölçüsü) açık; saçılım yalnız 11. ve 12. sınıfta (kullanıcı, 20.10)
    expect(kademeOrnekleri('lise').length).toBeGreaterThan(0);
    for (const o of kademeOrnekleri('lise')) {
      const iliskiSinifi = o.sinif === 11 || o.sinif === 12;
      expect(sinifKurallari(o.sinif).olculer.standartSapma, o.id).toBe(true);
      expect(sinifKurallari(o.sinif).sekmeler.includes('sacilim'), o.id).toBe(iliskiSinifi);
      if (!iliskiSinifi) expect(o.onerilenGrafik, o.id).not.toBe('sacilim');
    }
  });

  it('açısız dairede seçili dilim ve ipucu merkez açı veya yaklaşık simgesi içermez', () => {
    const tablo = tabloOlustur(['Etkinlik', 'Süre'], [['A', 1], ['B', 2]]);
    for (const seciliSatir of [null, 0]) {
      const html = renderToStaticMarkup(<DaireGrafigi tablo={tablo} sutun={1} seciliSatir={seciliSatir} onSatirSec={bos} onDegerlerDegis={bos} genislik={800} yukseklik={460} azaltilmisHareket acisiz />);
      expect(html).not.toMatch(/merkez.acı|Merkez aç|360°|120°|240°|≈|data-merkez-acisi/);
      expect(html).toContain('%33,3');
    }
  });

  it('sıklık tablosundan merkez açı ve yüzde hesap bilgisi kaldırılmıştır', () => {
    const html = renderToStaticMarkup(<KategorikIstatistik tablo={ornekBul('baskan')!.olustur()} sutun={1} oranlar={false} tepeDeger={false}/>);
    expect(html).not.toMatch(/Merkez açı|Göreli sıklık|360°|Yüzde =/);
  });

  it('kategorik grafikte değişken adı yatay eksendedir; oklar eksen çizgisinin ucundadır', () => {
    const html = renderToStaticMarkup(<KategorikSutunGrafigi tablo={ornekBul('baskan')!.olustur()} sutun={1} genislik={800} yukseklik={460} azaltilmisHareket/>);
    expect(html).toMatch(/data-eksen-adi="yatay">Aday/);
    expect(html).not.toContain('Aday · sıklık');
    expect(html.match(/data-eksen-oku=/g)).toHaveLength(2);
  });

  it('nesne grafiğinde eş resimler yatay tablo sıralarındadır; çetele ve sıklık ayrı tablolardır', () => {
    const tablo = ornekBul('oyuncak')!.olustur();
    const html = renderToStaticMarkup(<NesneGrafigi tablo={tablo} sutun={1} genislik={800} yukseklik={460} onSatirSec={bos}/>);
    expect(html).toContain('data-nesne-tablosu');
    expect(html.match(/data-nesne=/g)).toHaveLength(15);
    const tablolar = renderToStaticMarkup(<KategorikIstatistik tablo={tablo} sutun={1} cetele oranlar={false} tepeDeger={false}/>);
    expect(tablolar.match(/<table /g)).toHaveLength(2);
    expect(tablolar).toContain('Çetele tablosu');
    expect(tablolar).toContain('Sıklık tablosu');
  });
});

describe('TEGM: gerçekçi ölçüm sınırları', () => {
  it('25/80 saat uyku ve 500 nabız tekli ve toplu ölçümde kabul edilmez', () => {
    const uyku = hazirSoruUygula('uyku')!, nabiz = hazirSoruUygula('nabiz')!;
    for (const x of [25, 80, -1]) expect(olcumGirisHatasi(uyku, x)).not.toBeNull();
    expect(olcumSatirlari(uyku, [8, 25, 80, 7.5])).toEqual([['8'], ['7,5']]);
    expect(olcumGirisHatasi(nabiz, 500)).not.toBeNull();
    expect(olcumGirisHatasi(nabiz, 84)).toBeNull();
  });

  it('tabloya yapıştırma ve grafikte sürükleme de aynı sınırı aşamaz', () => {
    const tablo = tabloOlustur(['Öğrenci', 'Uyku süresi (saat)'], [['A', 8]]);
    const d = {...baslangicDurumu(), tablo, ornekId: null};
    const hatali = hucreYaz(tablo, 0, 1, '80');
    expect(tabloGirisHatasi(hatali)).toContain('0–24');
    expect(tabloDuzenle(d, hatali)).toBe(d);
    expect(tabloDuzenle(d, hucreYaz(tablo, 0, 1, '9')).tablo.satirlar[0].hucreler[1]).toBe('9');
  });
});
