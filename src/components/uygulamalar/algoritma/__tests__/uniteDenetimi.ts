/**
 * Ünite verisinin ortak denetimi (her sınıfın testi bunu çağırır). Kurallar müfredat karar belgesindendir
 * (artifacts/algoritma/mufredat-1-8.md): çözüm kendi dünyasında çalışır, hatalı kod gerçekten hatalıdır,
 * yeni kurgu önceki çözümü bozar (genelleme görevinde bozmaz), kazanımlar gerçek ve sınıfa uygundur,
 * araç kutusu çözümü kurmaya yeter, ızgaralar ekrana sığar.
 */
import { expect } from 'vitest';
import { calistir } from '../yorumlayici';
import { sonucIletisi } from '../degerlendirme';
import { izgara } from '../dunya';
import { blokSayisi, bloklar, karsilastirmaMi, kullanilanlar, type Blok, type BlokSablonu, type Ifade, type Program } from '../program';
import { KAZANIM_LISTESI } from '../kazanimlar';
import { kalipBul } from '../kaliplar';
import { FISSIZ_KOMUTLARI } from '../yazdir';
import { sina } from '../degerlendirme';
import type { Atolye, Gorev, Unite } from '../gorev';

/** Çözümdeki bir bloğun araç kutusunda karşılığı var mı */
function sablonVarMi(kutu: BlokSablonu[], b: Blok): boolean {
  switch (b.tur) {
    case 'eylem':
      return kutu.some((s) => s.tur === 'eylem' && s.eylem === b.eylem);
    case 'tekrarlaKez':
      return kutu.some((s) => s.tur === 'tekrarlaKez' && !!s.kezIfade === !!b.kezIfade);
    case 'tekrarlaKadar':
      return kutu.some((s) => s.tur === 'tekrarlaKadar' && (karsilastirmaMi(b.kosul) ? karsilastirmaMi(s.kosul) : s.kosul === b.kosul));
    case 'eger':
      return kutu.some((s) => s.tur === 'eger' && !!s.degilse === !!b.degilse && (karsilastirmaMi(b.kosul) ? karsilastirmaMi(s.kosul) : s.kosul === b.kosul));
    case 'ata':
      return kutu.some((s) => s.tur === 'ata' && s.degisken === b.degisken);
    case 'tanim':
      return kutu.some((s) => s.tur === 'tanim' && s.ad === b.ad);
    case 'cagir':
      return kutu.some((s) => s.tur === 'cagir' && s.ad === b.ad);
  }
}

function olcumler(p: Program): Set<string> {
  const s = new Set<string>();
  const ifade = (i: Ifade) => {
    if (i.tur === 'olcum') s.add(i.olcum);
    if (i.tur === 'islem') {
      ifade(i.sol);
      ifade(i.sag);
    }
  };
  for (const b of bloklar(p)) {
    if (b.tur === 'ata') ifade(b.ifade);
    if (b.tur === 'tekrarlaKez' && b.kezIfade) ifade(b.kezIfade);
    if ((b.tur === 'eger' || b.tur === 'tekrarlaKadar') && karsilastirmaMi(b.kosul)) {
      ifade(b.kosul.sol);
      ifade(b.kosul.sag);
    }
  }
  return s;
}

function gorevDenetle(u: Unite, g: Gorev, onceki: Gorev | undefined) {
  const ad = `${u.id}/${g.id}`;
  // 1. Çözüm çalışır ve başarı cümlesi kurulur
  const iz = calistir(g.cozum, g.dunya, g.hedef);
  expect(iz.sonuc.basarili, `${ad} çözümü: ${sonucIletisi(iz.sonuc, g.dunya, g.bitkiAdi)}`).toBe(true);
  expect(g.basari(iz).length, `${ad} başarı cümlesi`).toBeGreaterThan(4);
  if (g.enCokBlok !== undefined) expect(blokSayisi(g.cozum), `${ad} çözüm blok sınırını aşıyor`).toBeLessThanOrEqual(g.enCokBlok);
  if (g.soru) expect(Number.isFinite(g.soru.cevap(iz)), `${ad} soru cevabı`).toBe(true);

  // 2. Araç kutusu çözümü kurmaya yeter; değişken ve ölçümler bildirilmiş
  for (const b of bloklar(g.cozum)) expect(sablonVarMi(g.aracKutusu, b), `${ad}: araç kutusunda ${b.tur} ${'eylem' in b ? b.eylem : ''} yok`).toBe(true);
  const k = kullanilanlar(g.cozum);
  const bilinen = new Set([...(g.degiskenler ?? []), ...Object.keys(g.dunya.degiskenler ?? {})]);
  for (const v of k.degiskenler) expect(bilinen.has(v), `${ad}: ${v} değişkeni bildirilmemiş`).toBe(true);
  for (const o of olcumler(g.cozum)) expect(g.olcumler ?? [], `${ad}: ${o} ölçümü bildirilmemiş`).toContain(o);

  // 3. Kazanımlar gerçek, sınıfa ve üniteye uygun
  expect(g.kazanimlar.length, `${ad} kazanım`).toBeGreaterThan(0);
  for (const kod of g.kazanimlar) {
    expect(KAZANIM_LISTESI[kod], `${ad}: ${kod} listede yok`).toBeTruthy();
    expect(kod.startsWith(`MAT.${u.sinif}.`), `${ad}: ${kod} bu sınıfın değil`).toBe(true);
    expect(u.kazanimlar, `${ad}: ${kod} ünitenin kazanımlarında yok`).toContain(kod);
  }

  // 4. Başlangıç kodu: hazır kod hatalı ya da eksik; tahmin görevinde doğru
  if (g.tur === 'tahmin') {
    expect(g.tahmin, `${ad} tahmin sorusu`).toBeTruthy();
    expect(Array.isArray(g.baslangic), `${ad} tahmin görevinin kodu hazır verilir`).toBe(true);
    const bi = calistir(g.baslangic as Program, g.dunya, g.hedef);
    expect(bi.sonuc.basarili, `${ad} tahmin kodu çalışmalı: ${sonucIletisi(bi.sonuc, g.dunya, g.bitkiAdi)}`).toBe(true);
    expect(Number.isFinite(g.tahmin!.cevap(bi)), `${ad} tahmin cevabı`).toBe(true);
  } else if (Array.isArray(g.baslangic)) {
    const bi = calistir(g.baslangic, g.dunya, g.hedef);
    const bitmedi = !bi.sonuc.basarili || (g.enCokBlok !== undefined && blokSayisi(g.baslangic) > g.enCokBlok);
    expect(bitmedi, `${ad}: hazır kod zaten doğru`).toBe(true);
    if (!bi.sonuc.basarili) expect(sonucIletisi(bi.sonuc, g.dunya, g.bitkiAdi), `${ad} hata iletisi`).not.toBe('Program durdu.');
  }
  if (g.tur === 'hata') expect(Array.isArray(g.baslangic), `${ad}: hatayı bul görevinin hazır kodu olmalı`).toBe(true);

  // 5. Önceki kodla açılan görev: genellemede önceki çözüm çalışır, yoksa bozulur
  if (g.baslangic === 'onceki') {
    expect(onceki, `${ad}: ilk görev önceki kodla açılamaz`).toBeTruthy();
    if (onceki) {
      const oi = calistir(onceki.cozum, g.dunya, g.hedef);
      const iyi = oi.sonuc.basarili && (g.enCokBlok === undefined || blokSayisi(onceki.cozum) <= g.enCokBlok);
      expect(iyi, `${ad}: önceki çözüm ${g.genelleme ? 'çalışmalı (genelleme)' : 'bozulmalı'}`).toBe(!!g.genelleme);
    }
  }

  // 6. Izgara ekrana sığar; hedef türü dünya ile uyumlu
  const z = izgara(g.dunya);
  if (z.tur === 'sera') expect(g.dunya.bitkiler.length, `${ad} sıra uzunluğu`).toBeLessThanOrEqual(12);
  else {
    expect(z.en, `${ad} ızgara eni`).toBeLessThanOrEqual(10);
    expect(z.boy, `${ad} ızgara boyu`).toBeLessThanOrEqual(8);
  }
  if (z.cizgiHedef.size) expect(g.hedef.cizimiTamamla, `${ad}: çizim hedefi`).toBe(true);
  if (z.boyaHedef.some(Boolean)) expect(g.hedef.boyamayiTamamla, `${ad}: boya hedefi`).toBe(true);
  if (z.yapiHedef.some((h) => h > 0)) expect(g.hedef.yapiyiKur, `${ad}: yapı hedefi`).toBe(true);
  if (z.noktaHedef.some(Boolean)) expect(g.hedef.noktalariKoy, `${ad}: nokta hedefi`).toBe(true);

  // 7. Görünüme uygunluk
  if (g.ilkGorunum) expect(u.gorunum, `${ad}: ilk görünüm yalnız 7–8. sınıfta`).toBe('ifade');
  expect(g.yonerge.length, `${ad} yönerge çok uzun`).toBeLessThanOrEqual(u.gorunum === 'kart' ? 100 : 200);
  if (u.gorunum === 'kart') expect(g.aracKutusu.length, `${ad}: kart görünümünde en çok 6 kart`).toBeLessThanOrEqual(6);
}

export function uniteleriDenetle(uniteler: readonly Unite[]) {
  for (const u of uniteler) {
    expect(u.gorevler.length, `${u.id} görev sayısı`).toBeGreaterThanOrEqual(3);
    expect(u.gorevler.length, `${u.id} görev sayısı`).toBeLessThanOrEqual(7);
    expect(kalipBul(u.kalip), `${u.id}: ${u.kalip} kalıp kartı yok`).toBeTruthy();
    for (const kod of u.kazanimlar) expect(KAZANIM_LISTESI[kod], `${u.id}: ${kod}`).toBeTruthy();
    expect(u.gorevler.filter((g) => !g.zorlu).length, `${u.id} zorunlu görev`).toBeGreaterThan(0);
    for (const kart of u.fissiz.kartlar) expect(FISSIZ_KOMUTLARI, `${u.id}: fişsiz kart "${kart.komut}"`).toContain(kart.komut);
    expect(u.ogretmenNotu.yanilgilar.length, `${u.id} yanılgılar`).toBeGreaterThan(0);
    if (u.sinif <= 2) {
      expect(u.gorunum, u.id).toBe('kart');
      expect(u.sesliYonerge, u.id).toBe(true);
    }
    if (u.sinif >= 7) expect(u.gorunum, u.id).toBe('ifade');
    u.gorevler.forEach((g, i) => gorevDenetle(u, g, u.gorevler[i - 1]));
  }
}

/** Atölye projelerinin denetimi: çözüm bütün dünyalarda çalışır ve ★★★ alır; boş kod ★ almaz; kurallar sınıfa uygun. */
export function atolyeleriDenetle(atolyeler: readonly Atolye[]) {
  const ids = atolyeler.map((a) => a.id);
  expect(new Set(ids).size, 'atölye kimlikleri tek').toBe(ids.length);
  for (const a of atolyeler) {
    const ad = a.id;
    expect(a.dunyalar.length, `${ad} dünya sayısı`).toBeGreaterThanOrEqual(a.sinif >= 3 ? 3 : 1);
    expect(a.dunyalar.length, `${ad} dünya sayısı`).toBeLessThanOrEqual(5);
    expect(a.aciklama.length, `${ad} açıklama uzun`).toBeLessThanOrEqual(110);
    expect(a.yonerge.length, `${ad} yönerge uzun`).toBeLessThanOrEqual(220);
    expect(kalipBul(a.kalip), `${ad} kalıp`).toBeTruthy();
    expect(a.gorunum, ad).toBe(a.sinif <= 2 ? 'kart' : a.sinif >= 7 ? 'ifade' : 'blok');
    for (const kod of a.kazanimlar) {
      expect(KAZANIM_LISTESI[kod], `${ad}: ${kod}`).toBeTruthy();
      expect(kod.startsWith(`MAT.${a.sinif}.`), `${ad}: ${kod} bu sınıfın değil`).toBe(true);
    }
    const ayar = { gorunen: a.dunyalar[0], sinama: a.dunyalar.slice(1), hedef: a.hedef, enFazlaBlok: a.enCokBlok, bitkiAdi: a.bitkiAdi };
    const s = sina(a.cozum, ayar, 1);
    expect(s.yildiz, `${ad} çözüm: ${s.dunyalar.filter((d) => !d.basarili).map((d) => `${d.dunya.ad}: ${d.ileti}`).join(' | ')}`).toBe(3);
    expect(sina([], ayar, 1).yildiz, `${ad}: boş kod yıldız almamalı`).toBe(0);
    for (const b of bloklar(a.cozum)) expect(sablonVarMi(a.aracKutusu, b), `${ad}: araç kutusunda ${b.tur} yok`).toBe(true);
    const bilinen = new Set([...(a.degiskenler ?? []), ...a.dunyalar.flatMap((d) => Object.keys(d.degiskenler ?? {}))]);
    for (const v of kullanilanlar(a.cozum).degiskenler) expect(bilinen.has(v), `${ad}: ${v} bildirilmemiş`).toBe(true);
    for (const d of a.dunyalar) {
      const z = izgara(d);
      if (z.tur === 'sera') expect(d.bitkiler.length, `${ad} sıra`).toBeLessThanOrEqual(12);
      else {
        expect(z.en, `${ad} en`).toBeLessThanOrEqual(10);
        expect(z.boy, `${ad} boy`).toBeLessThanOrEqual(8);
      }
    }
    // Genellik: 3. sınıftan itibaren bir dünyaya ezberlenmiş kod bütün dünyalarda çalışmamalı (dünyalar gerçekten farklı)
    if (a.dunyalar.length >= 2) {
      const anahtarlar = a.dunyalar.map((d) => JSON.stringify([d.harita ?? null, d.cizim ?? null, d.bitkiler, d.degiskenler ?? null, d.depo ?? null]));
      expect(new Set(anahtarlar).size, `${ad}: dünyalar birbirinin aynısı`).toBe(a.dunyalar.length);
    }
  }
}
