/**
 * Alan uzmanı 4. tur (geoeba (3).xlsx, "atölye inceleme", satır 113–129 ve 182) düzeltmelerinin denetimi.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ATOLYELER } from '../atolyeler';
import { UNITELER } from '../mufredat';
import { AtolyeEkrani } from '../AtolyeEkrani';
import { SinifSayfasi, SiniflarSayfasi } from '../Giris';
import { calismaBasariMetni, olcutMetinleri, sinamaMetni } from '../atolyeMetinleri';
import { SAHNE, sahneAdi } from '../sahneAdi';
import { sina } from '../degerlendirme';
import { calistir } from '../yorumlayici';
import { sonucIletisi } from '../degerlendirme';
import { sozdeKod, type Program } from '../program';
import { bosKayit } from '../kayit';
import { manifest } from '../manifest';
import type { Atolye, Gorev } from '../gorev';

const atolye = (id: string): Atolye => {
  const a = ATOLYELER.find((x) => x.id === id);
  if (!a) throw new Error(id);
  return a;
};
const gorev = (id: string): Gorev => {
  for (const u of UNITELER) {
    const g = u.gorevler.find((x) => x.id === id);
    if (g) return g;
  }
  throw new Error(id);
};
const ayar = (a: Atolye) => ({ gorunen: a.dunyalar[0], sinama: a.dunyalar.slice(1), hedef: a.hedef, enFazlaBlok: a.enCokBlok, bitkiAdi: a.bitkiAdi });

/** Bir nesnedeki bütün metinler (kimlikler ve iç adlar dahil; denetim kalıpları onlara takılmaz) */
function metinler(o: unknown, cikti: string[] = [], gorulen = new Set<unknown>()): string[] {
  if (typeof o === 'string') cikti.push(o);
  else if (o && typeof o === 'object' && !gorulen.has(o)) {
    gorulen.add(o);
    for (const v of Object.values(o)) metinler(v, cikti, gorulen);
  }
  return cikti;
}

/** Atölyenin öğrencinin gördüğü metinleri */
const atolyeMetni = (a: Atolye) => [a.ad, a.aciklama, a.yonerge, a.ipucu, ...(a.ipuclari ?? []), ...a.dunyalar.map((d) => d.ad), ...a.dunyalar.map((d) => d.sinar ?? '')];

describe('uzman 4. tur: "dünya" yerine sahnenin adı (satır 117–119, 124–126)', () => {
  it('birden çok sahneli her atölyenin sahne adı var; uzmanın istediği sözcükler', () => {
    for (const a of ATOLYELER) if (a.dunyalar.length > 1) expect(a.sahne, `${a.id}: sahne adı yok`).toBeTruthy();
    expect(atolye('a5-hasattan-tohuma').sahne).toBe(SAHNE.tarla);
    expect(atolye('a5-gokdelen').sahne).toBe(SAHNE.cadde);
    expect(atolye('a5-merdiven-tarla').sahne).toBe(SAHNE.tarla);
    expect(atolye('a6-gubre-takvimi').sahne).toBe(SAHNE.sera);
    expect(atolye('a6-piramit').sahne).toBe(SAHNE.piramit);
    expect(atolye('a6-sarmal-pist').sahne).toBe(SAHNE.pist);
    expect(sahneAdi(atolye('a1-tur'))).toBe(SAHNE.sahne);
  });

  it('ölçütler ve iletiler sahnenin adıyla, doğru çekimle', () => {
    expect(olcutMetinleri(atolye('a5-hasattan-tohuma')).map((o) => o.metin)).toEqual(['1. tarlada çalışsın', '4 tarlanın hepsinde çalışsın', 'En çok 13 blok olsun']);
    expect(olcutMetinleri(atolye('a5-gokdelen'))[1].metin).toBe('4 caddenin hepsinde çalışsın');
    expect(olcutMetinleri(atolye('a6-piramit')).map((o) => o.metin).slice(0, 2)).toEqual(['1. piramitte çalışsın', '3 piramidin hepsinde çalışsın']);
    expect(olcutMetinleri(atolye('a6-sarmal-pist'))[0].metin).toBe('1. pistte çalışsın');
    expect(olcutMetinleri(atolye('a6-gubre-takvimi'))[1].metin).toBe('4 seranın hepsinde çalışsın');
    expect(olcutMetinleri(atolye('a4-kule'))[1].metin).toBe('4 sokağın hepsinde çalışsın');
    expect(calismaBasariMetni(atolye('a5-gokdelen'))).toBe('Bu caddede doğru çalıştı. Şimdi "Hepsini sına" ile öbür caddelerde dene.');
    // Tek sahneli 1–2. sınıf ve dünya başına kodlu Ayna atölyesi eskisi gibi
    expect(olcutMetinleri(atolye('a1-tur')).map((o) => o.metin)).toEqual(['Doğru çalışsın', 'En çok 13 kart olsun']);
    expect(olcutMetinleri(atolye('a3-ayna'))[0].metin).toBe('1. sahada şekli tamamla');

    const a = atolye('a5-merdiven-tarla');
    const cozum = sina(a.cozum, ayar(a), 1);
    expect(sinamaMetni(a, cozum, 13, () => '')).toBe('Üç yıldız! Kodun bütün tarlalarda çalışıyor ve kısa: 13 blok.');
    const ezber = sina(atolye('a6-piramit').cozum.slice(0, 1), ayar(atolye('a6-piramit')), 1);
    expect(sinamaMetni(atolye('a6-piramit'), ezber, 1, () => '')).toMatch(/^1\. piramitte olmadı: /);
  });

  it('atölye ekranında, sınıf sayfasında ve uygulama kartında "dünya" sözcüğü görünmez', () => {
    const kayit = bosKayit();
    for (const a of ATOLYELER) {
      for (const m of atolyeMetni(a)) expect(m, a.id).not.toMatch(/dünya/i);
      for (const o of olcutMetinleri(a)) expect(o.metin, a.id).not.toMatch(/dünya/i);
      expect(calismaBasariMetni(a), a.id).not.toMatch(/dünya/i);
      const s = sina([], ayar(a), 1);
      expect(sinamaMetni(a, s, 0, () => 'x'), a.id).not.toMatch(/dünya/i);
      const html = renderToStaticMarkup(<AtolyeEkrani atolye={a} kayit={kayit} setKayit={() => undefined} koyu={false} azHareket onGeri={() => undefined} />);
      expect(html, a.id).not.toMatch(/dünya/i);
    }
    for (const sinif of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const html = renderToStaticMarkup(<SinifSayfasi sinif={sinif} kayit={kayit} koyu={false} onUnite={() => undefined} onAtolye={() => undefined} onGeri={() => undefined} />);
      expect(html, `${sinif}. sınıf sayfası`).not.toMatch(/dünya/i);
    }
    expect(renderToStaticMarkup(<SiniflarSayfasi kayit={kayit} koyu={false} onSinif={() => undefined} devam={null} onDevam={() => undefined} />)).not.toMatch(/dünya/i);
    expect(manifest.aciklama).not.toMatch(/dünya/i);
    // Kart rozeti sahnenin adını söyler: "4 tarla"
    const bes = renderToStaticMarkup(<SinifSayfasi sinif={5} kayit={kayit} koyu={false} onUnite={() => undefined} onAtolye={() => undefined} onGeri={() => undefined} />);
    expect(bes).toContain('4 tarla');
    expect(bes).toContain('4 cadde');
  });

  it('Hasattan tohuma: alttaki tarla yerine kahverengi kareler (satır 117)', () => {
    const a = atolye('a5-hasattan-tohuma');
    expect(a.yonerge).toContain('alttaki kahverengi karelere');
    expect(a.yonerge).toContain('her tarlada');
    expect(a.aciklama).toContain('kahverengi karelere');
    expect(a.yonerge).not.toMatch(/alttaki tarla/);
  });

  it('Merdiven tarla: görev korunur, ipuçları adım adım; "kat ← kat + 2" araç kutusunda hazır (satır 119)', () => {
    const a = atolye('a5-merdiven-tarla');
    expect(a.ipuclari?.length).toBeGreaterThanOrEqual(3);
    expect(a.aracKutusu.some((b) => b.tur === 'ata' && JSON.stringify(b.ifade).includes('"deger":2'))).toBe(true);
    expect(sina(a.cozum, ayar(a), 1).yildiz).toBe(3);
    const hepsi = [a.ipucu, ...(a.ipuclari ?? [])].join(' ');
    for (const parca of ['kat ← 1', 'kat kez tekrarla', 'sağa dön', 'kat ← kat + 2', 'çıkışa varana kadar']) expect(hepsi).toContain(parca);
  });
});

describe('uzman 4. tur: ünite metinleri', () => {
  it('[182] 1. sınıf Örüntü ünitesinin açıklamasında geliştirme notu yok; bütün metinlerde de', () => {
    expect(UNITELER.find((u) => u.id === 's1-oruntu')?.yeniKavram).toBe('Örüntüdeki tekrarı bul');
    const tum = [...metinler(UNITELER), ...metinler(ATOLYELER), manifest.aciklama];
    for (const m of tum) expect(m).not.toMatch(/olacak\)|\bTODO\b|\bFIXME\b|\(not:|\bnot: /i);
  });

  it('[115] Tarlayı ek 5/5: alan yüzeyin büyüklüğünü, çevre kenar uzunluklarını ölçer', () => {
    const s = gorev('s5-tarla-5').soru!.sonrasi;
    expect(s).toContain('Alan yüzeyin büyüklüğünü ölçer (28 birim kare)');
    expect(s).toContain('çevre ise kenar uzunluklarını ölçer (22 birim)');
  });

  it('[116] Örüntünün kuralı: cümle küçük harfle ("kat …") başlamaz', () => {
    const u = UNITELER.find((x) => x.id === 's5-kural')!;
    for (const g of u.gorevler) {
      const ogrenci = [g.yonerge, ...g.ipuclari, g.soru?.metin, g.soru?.yonlendirme, g.tahmin?.metin, g.tahmin?.yonlendirme].filter((x): x is string => !!x);
      for (const m of ogrenci) expect(m, g.id).not.toMatch(/(^|[.?!]\s)kat\b/);
    }
  });

  it('[116] denetçi: hiçbir ünite ve atölye metninde cümle küçük harfli bir sözcükle (değişken adı dahil) başlamaz', () => {
    // Cümle başı: metnin başı ya da . ? ! + boşluk. Önünde sayı ya da tek harf varsa sıra sayısıdır ("6. kule", "i. kule");
    // tek harfli değişkenler (n, i, x …) matematik yazımıdır, sayılmaz.
    const cumleBasi = /(?:^|(?<!(?:^|[\s(])[a-zA-Z]|\d)[.?!]\s+)([a-zçğıöşü][\wçğıöşüÇĞİÖŞÜ]+)/;
    const bulunan: string[] = [];
    const bak = (yer: string, m?: string) => {
      if (m && cumleBasi.test(m)) bulunan.push(`${yer}: ${m}`);
    };
    for (const u of UNITELER) {
      bak(u.id, u.yeniKavram);
      for (const g of u.gorevler) {
        for (const m of [g.baslik, g.yonerge, ...g.ipuclari]) bak(g.id, m);
        for (const s of [g.soru, g.tahmin]) if (s) for (const m of [s.metin, s.sonrasi, s.yonlendirme]) bak(g.id, m);
      }
    }
    for (const a of ATOLYELER) for (const m of [a.aciklama, a.yonerge, a.ipucu, ...(a.ipuclari ?? [])]) bak(a.id, m);
    expect(bulunan).toEqual([]);
  });

  it('[122] 6. sınıf Genel terim 5/5: adım adım üç ipucu (ünite sınırı 3), terimle aynı toplama bloğuyla başlayan kod', () => {
    const g = gorev('s6-terim-5');
    expect(g.ipuclari.length).toBe(3);
    expect(g.ipuclari.join(' ')).toContain('toplam ← 0');
    expect(g.ipuclari.join(' ')).toContain('i ← i + 1');
    expect(Array.isArray(g.baslangic)).toBe(true);
    const iz = calistir(g.baslangic as Program, g.dunya, g.hedef);
    expect(sonucIletisi(iz.sonuc, g.dunya, g.bitkiAdi)).toBe('toplam değişkenine hiç değer verilmedi; 9 olmalıydı.');
    expect(sozdeKod(g.baslangic as Program)).toContain('2 × i − 1 KEZ TEKRARLA');
  });

  it('[127] 7. sınıf 1. ünite: soruda depodaki su ve sulama başına su; sözde kod ve akış şeması suyu yazar', () => {
    const g = gorev('s7-ifade-1');
    for (const m of [g.yonerge, g.tahmin!.metin]) {
      expect(m).toContain('20 litre');
      expect(m).toContain('2 litre');
    }
    expect(sozdeKod(g.cozum)).toContain('SULA (2 litre)');
    expect(sozdeKod(gorev('s7-denklem-1').cozum).split('\n')).toEqual([
      'BAŞLA',
      '    sulanan ← 0',
      '    depo < 2 OLANA KADAR TEKRARLA',
      '        İLERİ GİT',
      '        SULA (2 litre)',
      '        sulanan ← sulanan + 1',
      '    TEKRAR SONU',
      'BİTİR',
    ]);
  });

  it('[129] Küplerle prizma 1/5: sorunun yazımı', () => {
    expect(gorev('s7-prizma-1').soru!.metin).toBe('Aynı tabana sahip 5 katlı bir prizma elde etmek için kaç küpe ihtiyacımız olurdu?');
  });
});
