import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { UNITELER } from '../mufredat';
import { ATOLYELER } from '../atolyeler';
import { AtolyeEkrani } from '../AtolyeEkrani';
import { BlokDuzenleyici } from '../BlokDuzenleyici';
import { AKIS_SEMASI_SINIFI, kodGorunumleri } from '../gorev';
import { sozdeSatirlar } from '../program';
import { bosKayit } from '../kayit';

/** İşaretlemenin düz yazısı (etiketler atılır, kaçışlar çözülür) */
const yazi = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

describe('Kod paneli (kullanıcı kararı 2026-10-18): sözde kod ilk, akış şeması ikinci, bloklar üçüncü', () => {
  it('her sınıfta ilk sekme sözde kod; akış şeması 3. sınıftan; bloklar akışın ardından', () => {
    for (let sinif = 1; sinif <= 8; sinif++) {
      for (const dogal of [false, true]) {
        const g = kodGorunumleri(sinif, dogal);
        expect(g[0], `${sinif}. sınıf`).toBe('sozde');
        if (sinif >= AKIS_SEMASI_SINIFI) expect(g.slice(1, 3), `${sinif}. sınıf`).toEqual(['akis', 'bloklar']);
        else expect(g.slice(1, 2), `${sinif}. sınıf`).toEqual(['bloklar']);
        expect(g.includes('dogal')).toBe(dogal);
        if (dogal) expect(g.at(-1)).toBe('dogal');
      }
    }
    expect(AKIS_SEMASI_SINIFI).toBe(3);
  });

  it('atölye ekranı sözde kod düzenleyicisiyle açılır; sekmeler sıralıdır', () => {
    const kayit = bosKayit();
    for (const a of ATOLYELER) {
      const html = renderToStaticMarkup(<AtolyeEkrani atolye={a} kayit={kayit} setKayit={() => undefined} koyu={false} azHareket onGeri={() => undefined} />);
      const sekmeler = [...html.matchAll(/data-gorunum="(\w+)"/g)].map((m) => m[1]);
      expect(sekmeler, a.id).toEqual(kodGorunumleri(a.sinif, a.gorunum === 'ifade' || a.sinif === 5));
      expect(html, a.id).toMatch(/aria-selected="true"[^>]*data-gorunum="sozde"/);
      expect(html, a.id).toContain('data-sozde-kod');
      expect(yazi(html), a.id).toContain('BAŞLA');
      expect(yazi(html), a.id).toContain('BİTİR');
    }
  });

  it('sözde kod düzenleyicisi her görevin çözümünü ders kitabı satırlarıyla ve sıra numarasıyla yazar', () => {
    for (const u of UNITELER) {
      for (const g of u.gorevler) {
        const html = renderToStaticMarkup(<BlokDuzenleyici program={g.cozum} sozde />);
        const satirlar = sozdeSatirlar(g.cozum);
        const numaralar = [...html.matchAll(/data-satir-no="true">(\d+)</g)].map((m) => Number(m[1]));
        expect(numaralar, g.id).toEqual(satirlar.map((_, i) => i + 1));
        const metin = yazi(html);
        for (const s of satirlar) expect(metin, `${g.id}: ${s.metin}`).toContain(s.metin);
      }
    }
  });

  it('düzenlenebilir sözde kod: komutlar sözde kod yazımıyla, boş program BAŞLA ile BİTİR arasında', () => {
    const g = UNITELER.find((u) => u.sinif === 3)!.gorevler.find((x) => x.aracKutusu.some((s) => s.tur === 'tekrarlaKez'))!;
    const html = renderToStaticMarkup(<BlokDuzenleyici program={[]} onDegis={() => undefined} aracKutusu={g.aracKutusu} kutuBasligi="Komutlar" sozde />);
    const metin = yazi(html);
    expect(html).toContain('data-arac-kutusu');
    expect(metin).toContain('KEZ TEKRARLA');
    expect(metin).toMatch(/BAŞLA .*Program boş.*komutlardan.* BİTİR/);
    // Bloğa eklenen tekrar sözde kodda da sayısı düğmelerle değiştirilir
    const tekrar = g.cozum.find((b) => b.tur === 'tekrarlaKez')!;
    const dolu = renderToStaticMarkup(<BlokDuzenleyici program={[tekrar]} onDegis={() => undefined} aracKutusu={g.aracKutusu} sozde />);
    expect(dolu).toContain('Tekrar sayısını artır');
    expect(yazi(dolu)).toContain('TEKRAR SONU');
  });
});
