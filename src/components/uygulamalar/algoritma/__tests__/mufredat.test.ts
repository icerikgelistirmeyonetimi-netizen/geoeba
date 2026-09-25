import { describe, expect, it } from 'vitest';
import { baslangicDurumu, bahce, eylemUygula, izgara, type DunyaTanimi } from '../dunya';
import { calistir, izOzeti } from '../yorumlayici';
import { sonucIletisi } from '../degerlendirme';
import { blokSayisi, kullanilanlar, programKur, type Program } from '../program';
import { UNITELER, sinifGruplari, uniteBul } from '../mufredat';
import { SINIF1, CICEK } from '../sinif1';
import { GOREVLER as SINIF3_GOREVLERI, SULAMA_PROGRAMI, HASAT_COZUMU } from '../unite';
import { bosKayit, eskiKaydiAktar, gorevGuncelle, gorevKodu, kaydiCoz, uniteIlerlemesi } from '../kayit';
import { kalipBul } from '../kaliplar';
import type { Gorev, Unite } from '../gorev';
import { atolyeleriDenetle, uniteleriDenetle } from './uniteDenetimi';
import { ATOLYELER, sinifAtolyeleri } from '../atolyeler';

const gorevBul = (id: string): { u: Unite; g: Gorev } => {
  for (const u of UNITELER) {
    const g = u.gorevler.find((x) => x.id === id);
    if (g) return { u, g };
  }
  throw new Error(id);
};
const ileti = (p: Program, g: Gorev) => sonucIletisi(calistir(p, g.dunya, g.hedef).sonuc, g.dunya, g.bitkiAdi);

describe('bahçe ızgarası', () => {
  const d: DunyaTanimi = bahce('t', 'Deneme', ['B.#', '.KH'], { hedefAdi: CICEK });

  it('haritayı derler: yollar, çalı, başlangıç, hedef, bitki hücresi', () => {
    const g = izgara(d);
    expect(g.bahce).toBe(true);
    expect([g.en, g.boy]).toEqual([3, 2]);
    expect(g.yol).toEqual([true, true, false, true, true, true]);
    expect(g.bas).toEqual({ x: 0, y: 0, yon: 0 });
    expect(g.hedef).toEqual({ x: 2, y: 1 });
    expect(g.bitkiYeri).toEqual([{ x: 1, y: 1 }]);
    expect(d.bitkiler).toEqual([{ tur: 'saksi', toprak: 'kuru', yaprak: 'saglam' }]);
  });

  it('dört yönde yürür; çalıya ve çite çarpar; izleri sırayla tutar', () => {
    let s = baslangicDurumu(d);
    s = eylemUygula(s, 'ileri').durum; // (1,0)
    expect(eylemUygula(s, 'ileri').hata).toMatchObject({ tur: 'duvar', alt: 'cali' });
    s = eylemUygula(s, 'sagaDon').durum; // güney
    s = eylemUygula(s, 'ileri').durum; // (1,1) saksı
    expect([s.x, s.y]).toEqual([1, 1]);
    s = eylemUygula(s, 'sula').durum;
    expect(s.bitkiler[0].toprak).toBe('nemli');
    expect(eylemUygula(s, 'ileri').hata).toMatchObject({ tur: 'duvar', alt: 'cit' });
    expect(s.izler).toEqual([1, 4]);
  });

  it('hedef iletileri: uzaklık ve geçme', () => {
    const w = bahce('t2', 'Yol', ['B...H..'], { hedefAdi: CICEK });
    const h = { cikistaBitir: true };
    expect(sonucIletisi(calistir(programKur(['ileri', 'ileri']), w, h).sonuc, w, 'bitki')).toBe('Robot çiçeğe varamadı: çiçek 2 kare uzakta.');
    expect(sonucIletisi(calistir(programKur(['ileri', 'ileri', 'ileri', 'ileri', 'ileri']), w, h).sonuc, w, 'bitki')).toBe('Robot çiçeği 1 kare geçti.');
    expect(calistir(programKur(['ileri', 'ileri', 'ileri', 'ileri']), w, h).sonuc.basarili).toBe(true);
  });
});

describe('müfredat', () => {
  it('ortak denetim: bütün kayıtlı üniteler kurallara uyar', () => uniteleriDenetle(UNITELER));

  it('sınıflar sırayla; görev kimlikleri tektir', () => {
    expect(UNITELER.slice(0, 4).map((u) => u.id)).toEqual(['s1-adim', 's1-don', 's1-sula', 's1-oruntu']);
    const siniflar = sinifGruplari().map((g) => g.sinif);
    expect(siniflar).toEqual([...siniflar].sort((a, b) => a - b));
    expect(siniflar.slice(0, 2)).toEqual([1, 2]);
    const ids = UNITELER.flatMap((u) => u.gorevler.map((g) => g.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(uniteBul('yok').id).toBe('s1-adim');
    for (const u of UNITELER) expect(kalipBul(u.kalip), u.id).toBeTruthy();
  });

  it('her görevin çözümü kendi dünyasında çalışır ve araç kutusuyla kurulabilir', () => {
    for (const u of UNITELER) {
      for (const g of u.gorevler) {
        const iz = calistir(g.cozum, g.dunya, g.hedef);
        expect(iz.sonuc.basarili, `${g.id}: ${sonucIletisi(iz.sonuc, g.dunya, g.bitkiAdi)}`).toBe(true);
        expect(g.basari(iz).length).toBeGreaterThan(4);
        const k = kullanilanlar(g.cozum);
        for (const e of k.eylemler) expect(g.aracKutusu.some((a) => a.tur === 'eylem' && a.eylem === e), `${g.id}:${e}`).toBe(true);
        for (const c of k.kosullar) expect(g.aracKutusu.some((a) => (a.tur === 'eger' || a.tur === 'tekrarlaKadar') && a.kosul === c), `${g.id}:${c}`).toBe(true);
        for (const kaz of g.kazanimlar) expect(u.kazanimlar, `${g.id}:${kaz}`).toContain(kaz);
      }
    }
  });

  it('1. sınıf yalnız sıralı adımlardır: tekrar ve karar bloğu yok; kart görünümü ve sesli yönerge açık', () => {
    for (const u of SINIF1) {
      expect(u.gorunum).toBe('kart');
      expect(u.sesliYonerge).toBe(true);
      for (const g of u.gorevler) {
        expect(g.aracKutusu.every((a) => a.tur === 'eylem'), g.id).toBe(true);
        expect(izgara(g.dunya).bahce, g.id).toBe(true);
        expect(g.dunya.adimIzi, g.id).toBe(true);
      }
    }
  });

  it('hazır / hatalı başlangıç kodları gerçekten eksik ya da hatalıdır', () => {
    for (const u of UNITELER) {
      for (const g of u.gorevler) {
        // Tahmin görevinin kodu doğrudur; blok sınırlı görevde hazır kod çalışsa da uzundur
        if (!Array.isArray(g.baslangic) || g.tur === 'tahmin') continue;
        const uzun = g.enCokBlok !== undefined && blokSayisi(g.baslangic) > g.enCokBlok;
        expect(!calistir(g.baslangic, g.dunya, g.hedef).sonuc.basarili || uzun, g.id).toBe(true);
      }
    }
  });

  it('1. sınıfta her yeni kurgu önceki görevin çözümünü bozar (düzeltme gerekir)', () => {
    for (const u of SINIF1) {
      u.gorevler.forEach((g, i) => {
        if (g.baslangic !== 'onceki') return;
        const once = u.gorevler[i - 1];
        expect(calistir(once.cozum, g.dunya, g.hedef).sonuc.basarili, g.id).toBe(false);
      });
    }
  });

  it('1. sınıf iletileri: sayı, yön ve sıra sayısıyla konuşur', () => {
    const a3 = gorevBul('s1-adim-3');
    expect(ileti(gorevBul('s1-adim-2').g.cozum, a3.g)).toBe('Robot çiçeği 1 kare geçti.');
    const a4 = gorevBul('s1-adim-4').g;
    expect(ileti(a4.baslangic as Program, a4)).toBe('Robot çiçeğe varamadı: çiçek 1 kare uzakta.');
    const a5 = gorevBul('s1-adim-5').g;
    expect(ileti(a5.baslangic as Program, a5)).toBe('Robot çiçeği 2 kare geçti.');
    const d4 = gorevBul('s1-don-4').g;
    expect(ileti(d4.baslangic as Program, d4)).toBe('Robot bahçenin çitine çarptı.');
    const s4 = gorevBul('s1-sula-4').g;
    expect(ileti(s4.baslangic as Program, s4)).toBe('Robot boş yeri suladı; orada saksı yok.');
    const s5 = gorevBul('s1-sula-5').g;
    expect(ileti(s5.baslangic as Program, s5)).toBe('2. saksı susuz kaldı.');
    const o3 = gorevBul('s1-oruntu-3').g;
    expect(ileti(o3.baslangic as Program, o3)).toBe('3. saksı susuz kaldı.');
    const d1 = gorevBul('s1-don-1').g;
    expect(d1.basari(calistir(d1.cozum, d1.dunya, d1.hedef))).toBe('Oldu! Robot 4 adım attı, 1 kez döndü.');
    expect(gorevBul('s1-sula-5').g.soru?.cevap(calistir(s5.cozum, s5.dunya, s5.hedef))).toBe(5);
  });

  it('adım izleri ve özet: s1-adim-1 üç adım', () => {
    const g = gorevBul('s1-adim-1').g;
    const iz = calistir(g.cozum, g.dunya, g.hedef);
    expect(izOzeti(iz).ileri).toBe(3);
    expect(iz.son.izler).toEqual([1, 2, 3]);
    expect(g.basari(iz)).toBe('Oldu! Robot 3 adım attı.');
  });
});

describe('ilerleme kaydı (v3)', () => {
  it('önceki görevin kodu aynı ünite içinde zincirle taşınır; öğrencinin kodu önceliklidir', () => {
    const { u } = gorevBul('s1-adim-2');
    let k = bosKayit();
    expect(k.unite).toBe('s1-adim');
    expect(gorevKodu(k, u, u.gorevler[1])).toEqual([]);
    const uc = programKur(['ileri', 'ileri', 'ileri']);
    k = gorevGuncelle(k, 's1-adim-1', (g) => ({ ...g, program: uc }));
    expect(gorevKodu(k, u, u.gorevler[1])).toBe(uc);
    expect(gorevKodu(k, u, u.gorevler[2])).toBe(uc);
    expect(gorevKodu(k, u, u.gorevler[3])).toBe(u.gorevler[3].baslangic);
    const s3 = uniteBul('s3-bak');
    expect(gorevKodu(k, s3, s3.gorevler[0])).toBe(s3.gorevler[0].baslangic);
  });

  it('bozuk kayıtları ayıklar; ilerleme zorunlu görevleri sayar', () => {
    let k = gorevGuncelle(bosKayit(), 'hasat-yaz', (g) => ({ ...g, tamam: true, program: HASAT_COZUMU }));
    k = { ...k, unite: 's3-bak', uniteler: { 's3-bak': { aktif: 5, bitti: false } } };
    const geri = kaydiCoz(JSON.stringify(k));
    expect(geri?.gorevler['hasat-yaz']?.program).toEqual(HASAT_COZUMU);
    expect(geri?.uniteler['s3-bak'].aktif).toBe(5);
    expect(kaydiCoz('{"surum":2}')).toBeNull();
    expect(kaydiCoz(JSON.stringify({ surum: 3, unite: 'yok', uniteler: { 's1-adim': { aktif: 99 } }, gorevler: { yok: {} } }))).toMatchObject({ unite: 's1-adim', uniteler: { 's1-adim': { aktif: 0 } }, gorevler: {} });
    const s3 = uniteBul('s3-bak');
    const hepsi = SINIF3_GOREVLERI.filter((g) => !g.zorlu).reduce((x, g) => gorevGuncelle(x, g.id, (y) => ({ ...y, tamam: true })), bosKayit());
    expect(uniteIlerlemesi(hepsi, s3)).toEqual({ tamam: 6, toplam: 6 });
  });

  it('v2 (yalnız 3. sınıf) kaydı aktarılır', () => {
    const v2 = JSON.stringify({ surum: 2, aktif: 3, gorevler: { 'sulama-yaz': { tamam: true, ipucu: 1, program: SULAMA_PROGRAMI } }, bitti: false });
    const k = eskiKaydiAktar(v2);
    expect(k?.unite).toBe('s3-bak');
    expect(k?.uniteler['s3-bak'].aktif).toBe(3);
    expect(k?.gorevler['sulama-yaz']?.tamam).toBe(true);
    expect(eskiKaydiAktar(null)).toBeNull();
  });
});

describe('atölyeler', () => {
  it('bütün atölyeler denetimden geçer; her sınıfta üç proje, kimlikler ünite kimlikleriyle çakışmaz', () => {
    atolyeleriDenetle(ATOLYELER);
    for (let s = 1; s <= 8; s++) expect(sinifAtolyeleri(s).length, `${s}. sınıf`).toBe(3);
    const uniteler = new Set(UNITELER.map((u) => u.id));
    for (const a of ATOLYELER) expect(uniteler.has(a.id), a.id).toBe(false);
  });
});
