/**
 * Alan uzmanı 5. tur (geoeba (4).xlsx, "atölye inceleme", satır 129–130): 7. sınıf Küplerle prizma ve Yansıma.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { UNITELER } from '../mufredat';
import { DunyaSemasi } from '../DunyaSemasi';
import { BlokDuzenleyici } from '../BlokDuzenleyici';
import { baslangicDurumu, cizgiUclari, izgara } from '../dunya';
import { calistir } from '../yorumlayici';
import { sonucIletisi } from '../degerlendirme';
import type { Blok, Program } from '../program';
import type { Gorev, Unite } from '../gorev';

const gorev = (id: string): Gorev => {
  for (const u of UNITELER) {
    const g = u.gorevler.find((x) => x.id === id);
    if (g) return g;
  }
  throw new Error(id);
};
const unite = (id: string): Unite => {
  const u = UNITELER.find((x) => x.id === id);
  if (!u) throw new Error(id);
  return u;
};

/** Programın kimliksiz yazımı: eylem adları, "tekrarlaKez:3 [ … ]" */
function yazim(p: Program): string[] {
  const c: string[] = [];
  const git = (b: Blok) => {
    if (b.tur === 'eylem') c.push(b.eylem);
    else if (b.tur === 'tekrarlaKez') {
      c.push(`tekrarlaKez:${b.kez}`, '[');
      b.govde.forEach(git);
      c.push(']');
    } else c.push(b.tur);
  };
  p.forEach(git);
  return c;
}

/** Cümle başı (metnin başı ya da . ? ! + boşluk; önünde tırnak olabilir) küçük harfli sözcük */
const KUCUK_BAS = /(?:^|(?<!(?:^|[\s(])[a-zA-Z]|\d)[.?!]\s+)["“«']?([a-zçğıöşü][\wçğıöşüÇĞİÖŞÜ]*)/;

describe('uzman 5. tur: 7. sınıf 3. ünite Küplerle prizma (satır 129)', () => {
  it('1/5: soru uzmanın cümlesi; yönerge küpün dronun tam altındaki kareye bırakıldığını söyler', () => {
    const g = gorev('s7-prizma-1');
    expect(g.soru!.metin).toBe('Aynı tabana sahip 5 katlı bir prizma elde etmek için kaç küpe ihtiyacımız olurdu?');
    expect(g.yonerge).toContain('Dron küpü tam altındaki kareye bırakır: Kesikli çizgi o kareyi gösterir.');
    expect(g.yonerge.length).toBeLessThanOrEqual(200);
  });

  it('5/5: cümleler büyük harfle başlar; "En" büyük harfle', () => {
    const g = gorev('s7-prizma-5');
    expect(g.yonerge.startsWith('En, boy ve yükseklik değişkenleri hazır.')).toBe(true);
    expect(g.dunya.sinar).toBe('En, boy ve yükseklik değişkenleri');
    const basari = g.basari(calistir(g.cozum, g.dunya, g.hedef));
    expect(basari).toBe('Oldu! Hacim = 2 × 3 × 4 = 24; dron da 24 küp koydu. Formül ile sayım aynı sonucu verdi.');
    for (const m of [g.baslik, g.yonerge, ...g.ipuclari, basari, g.dunya.sinar!]) expect(m, m).not.toMatch(KUCUK_BAS);
  });

  it('5/5: 2. ipucu değişkenin değiştiği yeri doğru söyler (BLOKLAR kutusunda değil, koddaki blokta)', () => {
    const g = gorev('s7-prizma-5');
    expect(g.ipuclari[1]).toBe('Koduna eklediğin "en kez tekrarla" bloğundaki değişkene dokunup onu boy ya da yükseklik yapabilirsin.');
    const ciz = (program: Program) =>
      renderToStaticMarkup(<BlokDuzenleyici program={program} onDegis={() => {}} aracKutusu={g.aracKutusu} degiskenler={g.degiskenler} />);
    // Kod boşken BLOKLAR kutusunda "en kez tekrarla" var ama değişkeni değiştirilecek düğme yok
    const bos = ciz([]);
    expect(bos).toContain('kez tekrarla');
    expect(bos).not.toContain('data-islenen');
    // Koda eklenen blokta değişken dokunulup değiştirilir
    const tekrar = g.cozum.find((b) => b.tur === 'tekrarlaKez')!;
    expect(ciz([tekrar])).toMatch(/aria-label="(en|boy|yükseklik): değiştir"[^>]*data-islenen/);
  });

  it('3. ve 4. ünitenin bütün öğrenci metinlerinde (başarı cümleleri, tırnakla başlayan cümleler dahil) cümle küçük harfle başlamaz', () => {
    const bulunan: string[] = [];
    for (const u of [unite('s7-prizma'), unite('s7-yansima')]) {
      for (const m of [u.yeniKavram]) if (KUCUK_BAS.test(m)) bulunan.push(`${u.id}: ${m}`);
      for (const g of u.gorevler) {
        const metin = [g.baslik, g.yonerge, ...g.ipuclari, g.basari(calistir(g.cozum, g.dunya, g.hedef)), g.dunya.sinar ?? ''];
        for (const s of [g.soru, g.tahmin]) if (s) metin.push(s.metin, s.sonrasi ?? '', s.yonlendirme ?? '');
        for (const m of metin) if (m && KUCUK_BAS.test(m)) bulunan.push(`${g.id}: ${m}`);
      }
    }
    expect(bulunan).toEqual([]);
  });
});

describe('uzman 5. tur: 7. sınıf 4. ünite Yansıma (satır 130)', () => {
  it('1/4 ve 2/4: şeklin aynadaki görüntüsü robotun olmadığı yanda baştan görünür (hedef gizli değil)', () => {
    for (const id of ['s7-yansima-1', 's7-yansima-2']) {
      const g = gorev(id);
      const d = g.dunya;
      const z = izgara(d);
      expect(d.hedefGizli, id).toBeFalsy();
      expect(g.yonerge, id).toContain('kesikli çizgiyle görünüyor');
      // Görüntü: hazır şeklin aynaya göre tam yansıması, aynanın öbür yanında (robot şeklin yanında başlar)
      const e = d.eksen!;
      const nokta = (i: number) => ({ x: i % z.en, y: Math.floor(i / z.en) });
      const yansit = (i: number) => {
        const p = nokta(i);
        return e.yon === 'dikey' ? p.y * z.en + (2 * e.k - p.x) : (2 * e.k - p.y) * z.en + p.x;
      };
      const anahtar = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
      const yansiyan = new Set([...z.cizgiVerilen].map((k) => anahtar(...(cizgiUclari(k).map(yansit) as [number, number]))));
      expect(yansiyan, id).toEqual(new Set(z.cizgiHedef));
      const yan = (p: { x: number; y: number }) => Math.sign((e.yon === 'dikey' ? p.x : p.y) - e.k);
      const robotYani = yan(z.bas);
      for (const k of z.cizgiHedef) for (const u of cizgiUclari(k)) expect(yan(nokta(u)), `${id} ${k}`).toBe(-robotYani);
      // WebGL'siz şemada da (görev ekranı, durumla) kesikli görüntü çizilir; hatayı bul görevlerinde çizilmez
      const html = renderToStaticMarkup(<DunyaSemasi dunya={d} durum={baslangicDurumu(d)} />);
      expect((html.match(/stroke="#216a78"[^>]*stroke-dasharray/g) ?? []).length, id).toBe(z.cizgiHedef.size);
    }
    // 6. turda 4. görevin hedefi görünür yapıldı; 3. görev korunur.
    for (const id of ['s7-yansima-3']) {
      const d = gorev(id).dunya;
      expect(d.hedefGizli, id).toBe(true);
      expect(renderToStaticMarkup(<DunyaSemasi dunya={d} durum={baslangicDurumu(d)} />), id).not.toMatch(/stroke="#216a78"[^>]*stroke-dasharray/);
    }
  });

  it('3/4: hazır kodda görünen tek hata var ("kalemi kaldır" yanlış yerde); onu başa taşımak çözümdür', () => {
    const g = gorev('s7-yansima-3');
    const bas = g.baslangic as Program;
    const b = yazim(bas);
    const c = yazim(g.cozum);
    // Hatalı kodda blok eksik değil: "kalemi kaldır" bir kez var ama yol bittikten sonra
    expect(b.filter((x) => x === 'kalemKaldir').length).toBe(1);
    expect(b.indexOf('kalemKaldir')).toBeGreaterThan(b.indexOf(']'));
    expect(c[0]).toBe('kalemKaldir');
    // Tek fark: Bloğun yeri (ikisinden de çıkarınca aynı kod)
    expect(b.filter((x) => x !== 'kalemKaldir')).toEqual(c.filter((x) => x !== 'kalemKaldir'));
    expect(b.length).toBe(c.length);
    // Hatalı kod gerçekten hatalı: Yolda (üst sıra, aynaya giderken) şekilde olmayan çizgi çizer
    const iz = calistir(bas, g.dunya, g.hedef);
    expect(iz.sonuc.basarili).toBe(false);
    expect(iz.sonuc.hata?.tur).toBe('yanlisCizgi');
    expect(iz.sonuc.hata?.y).toBe(0);
    expect(sonucIletisi(iz.sonuc, g.dunya, g.bitkiAdi)).toBe('Robot şekilde olmayan bir çizgi çizdi; aynadaki çizgiyle eşleşmiyor.');
    // Çözüm çalışır; görüntünün çizgileri tamam
    const ci = calistir(g.cozum, g.dunya, g.hedef);
    expect(ci.sonuc.basarili).toBe(true);
    expect(g.basari(ci)).toBe('Buldun! Kalem kalkıkken robot 4 birim çizmeden gitti; sonra 4 çizgilik görüntüyü çizdi.');
    // Yönerge ve ipuçları hatayı aratır, kodun en başına taşımayı söyler
    expect(g.yonerge).toContain('Hatalı bloğu bul, düzelt.');
    expect(g.ipuclari.join(' ')).toContain('"kalemi kaldır" bloğunu kodun en başına');
  });
});
