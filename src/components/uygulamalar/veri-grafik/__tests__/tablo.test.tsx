// Sahip: T (vg/VeriTablosu.tsx)
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SutunMenusu,
  VeriTablosu,
  bantSonMetni,
  benzersizSutunAdi,
  sayiMetniDuzelt,
  sutunAdiDuzelt,
  sutunEnKucukGenisligi,
  tabloDogalGenisligi,
  yapistirmaUygula,
} from '../VeriTablosu';
import { renkEslemesi, satirRengi } from '../kategorik';
import { sayiOku, tabloOlustur, type VeriTablosu as VeriTablosuModeli } from '../veri';
import { sabitBoy, sabitCalisma } from './sabit-tablolar';

const bos = () => undefined;

describe('Veri ve Grafik uygulaması (sunucu tarafı akıllı çizim)', () => {
  it('tablo: boş tabloda da yazmaya hazır yeni satır çizilir ve sayılara girmez', () => {
    const bosTablo = tabloOlustur(['Öğrenci', 'Boy (cm)'], []);
    const html = renderToStaticMarkup(<VeriTablosu tablo={bosTablo} seciliSatir={null} onSatirSec={bos} onTablo={bos} onTemizle={bos} />);
    expect(html).toContain('Tablo boş: alttaki satıra yazın');
    expect(html).toContain('data-hucre="0-0"');
    expect(html).toContain('placeholder="Yeni satır…"');
    expect(html).toContain('0 satır · 1 değişken');
  });
});

describe('tablo sütun başlığı genişliği', () => {
  it('adı sığacak kadar geniş (sayısal sütunda sil düğmesi dahil), 88–260 px arasında', () => {
    // Başlık ≤ 2 satır + dolgu (+ 44 px sütun menüsü); en uzun hücre + 24 px. Sayı 64–120, etiket 64–200 (+ menü)
    expect(sutunEnKucukGenisligi('Ay', false)).toBe(64);
    expect(sutunEnKucukGenisligi('x'.repeat(80), true, '', { tur: 'sayi' })).toBe(120 + 44);
    expect(sutunEnKucukGenisligi('x'.repeat(80), false)).toBe(200);
    expect(sutunEnKucukGenisligi('x'.repeat(80), true)).toBe(200 + 44);
    expect(sutunEnKucukGenisligi('x'.repeat(80), false, '', { toplama: true })).toBe(160);
    // Uzun ad iki satıra kırılır: tek satır genişliğinden dar, ikinci satırın ("çalışma (saat)") genişliğinden geniş
    const iki = sutunEnKucukGenisligi('Haftalık çalışma (saat)', true, '10', { tur: 'sayi' });
    expect(iki).toBeLessThan(sutunEnKucukGenisligi('Haftalıkçalışma(saat)xx', true, '10', { tur: 'sayi' }));
    expect(iki).toBeGreaterThanOrEqual(sutunEnKucukGenisligi('çalışma (saat)', true, '', { tur: 'sayi' }));
    expect(iki).toBeLessThanOrEqual(164);
    // Genişlik içerikten: uzun etiket değeri sütunu genişletir, kısa sayılar daraltmaz
    const kisa = sutunEnKucukGenisligi('Ad', false, 'Ali');
    const uzun = sutunEnKucukGenisligi('Ad', false, 'Abdurrahman Yıldırım');
    expect(uzun).toBeGreaterThan(kisa);
    expect(uzun).toBeLessThanOrEqual(200);
    expect(sutunEnKucukGenisligi('Boy', true, '152', { tur: 'sayi' })).toBeLessThan(100);
  });

  it('calisma tablosu (4 sütun) 480–560 px içinde; gizli sıra sütunları sayılmaz; toplama görünümü daha dar', () => {
    const t = sabitCalisma();
    const g = tabloDogalGenisligi(t);
    expect(g).toBeLessThanOrEqual(560);
    expect(g).toBeGreaterThanOrEqual(400);
    // # (45: 44 px düğme + kenarlık) + satır işlemleri (44) + kaydırma payı; sütunlar en az başlıklarının genişliği
    const toplam = t.sutunlar.reduce((s, c, j) => s + sutunEnKucukGenisligi(c.ad, j > 0, '', { tur: c.tur }), 0);
    expect(g).toBeGreaterThanOrEqual(44 + toplam + 44);
    expect(tabloDogalGenisligi(t, { toplama: true })).toBeLessThan(g - 44 * 3);
    // Çekiliş (vg-cekilis) sütunu tabloda gizlidir, genişliğe girmez
    const deney = {
      sutunlar: [{ id: 'vg-cekilis', ad: 'Çekiliş', tur: 'sayi' as const }, ...t.sutunlar.slice(1)],
      satirlar: t.satirlar,
    };
    expect(tabloDogalGenisligi(deney)).toBeLessThan(g);
  });
});

describe('renk anahtarı: kategoriye göre renklendirme (bütün grafikler, istatistik, tablo)', () => {
  const t = sabitCalisma();
  const eslem = renkEslemesi(t, 1)!;

  it('tablo: satır numarasının solunda kategori renginde şerit', () => {
    const html = renderToStaticMarkup(
      <VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} satirRengi={(i) => satirRengi(eslem, i)} />,
    );
    expect(html).toContain(`box-shadow:inset 4px 0 0 ${eslem.renkler.get('A')}`);
    expect(html).toContain(`box-shadow:inset 4px 0 0 ${eslem.renkler.get('B')}`);
  });
});

describe('grafik düzeni: daire lejantı sığar, çizgi lejantı ada göre, tablo başlığında tür düğmesi', () => {
  it('tablo başlığı: ilk sütun dışında tür düğmesi ve sil düğmesi (kategorik sütunda da)', () => {
    // Tür ve sil tek bir 44 px sütun menüsünde (tür çipi + ⋮); başlıkta ayrı sil (×) düğmesi yok
    const t = sabitCalisma();
    const html = renderToStaticMarkup(<VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} />);
    expect(html.match(/data-sutun-menusu="/g)).toHaveLength(3);
    expect(html.match(/aria-haspopup="menu"/g)).toHaveLength(3);
    expect(html).toContain('data-sutun-turu="etiket"');
    expect(html).toContain('aria-label="Sınıf sütunu (kategorik): seçenekler"');
    expect(html).toContain('aria-label="Matematik puanı sütunu (sayısal): seçenekler"');
    expect(html).not.toContain('Öğrenci sütunu (');
    expect(html).not.toContain('sütununu sil');
    expect(html).toContain('data-tur-cipi="etiket"');
    expect(html).toContain('data-tur-cipi="sayi"');
  });
});

describe('tablo: sütun menüsü', () => {
  const sutun = { id: 's1', ad: 'Boy (cm)', tur: 'sayi' as const };
  const cagri = { onTurDegistir: bos, onAdlandir: bos, onSil: bos, onSilOnayla: bos, onVazgec: bos };

  it('tür açıklaması, "Kategorik yap", "Yeniden adlandır", "Sütunu sil"; opak zemin, 44 px öğeler', () => {
    const html = renderToStaticMarkup(<SutunMenusu sutun={sutun} doluSayisi={24} sayiOlmayanSayisi={0} onay={false} {...cagri} />);
    expect(html).toContain('role="menu"');
    expect(html).toContain('aria-label="Boy (cm) sütunu"');
    expect(html).toContain('Sayısal değişken');
    expect(html).toContain('Kategorik yap');
    expect(html).toContain('Yeniden adlandır');
    expect(html).toContain('Sütunu sil');
    expect(html.match(/role="menuitem"/g)).toHaveLength(3);
    expect(html).toContain('bg-popover');
    expect(html).not.toMatch(/bg-card\/\d/);
    expect(html).toContain('min-h-11');
  });

  it('kategorik sütunda "Sayısal yap" ve sayı olmayan değer uyarısı', () => {
    const html = renderToStaticMarkup(
      <SutunMenusu sutun={{ id: 's2', ad: 'Sınıf', tur: 'etiket' }} doluSayisi={20} sayiOlmayanSayisi={20} onay={false} {...cagri} />,
    );
    expect(html).toContain('Kategorik değişken');
    expect(html).toContain('Sayısal yap');
    expect(html).toContain('20 değer sayı değil');
  });

  it('dolu sütunu silme satır içi onay ister (Evet, sil / Vazgeç; 44 px)', () => {
    const html = renderToStaticMarkup(<SutunMenusu sutun={sutun} doluSayisi={24} sayiOlmayanSayisi={0} onay {...cagri} />);
    expect(html).toContain('data-sutun-sil-onayi');
    expect(html).toContain('Boy (cm) sütunundaki 24 değer silinsin mi?');
    expect(html).toContain('Evet, sil');
    expect(html).toContain('Vazgeç');
    expect(html).not.toContain('data-sutun-sil=');
    expect(html.match(/class="h-11 flex-1/g)).toHaveLength(2);
  });
});

describe('tablo: yerleşim, seçili satır ve satır silme', () => {
  it('# ve ilk etiket sütunu yapışkan; sayı başlığı sağa yaslı; zebra; başlık girdileri sütun kimliğiyle', () => {
    const t = sabitCalisma();
    const html = renderToStaticMarkup(<VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} />);
    expect(html).toContain('sticky left-0 z-20');
    expect(html).toContain('sticky left-0 z-20 w-[45px] min-w-[45px]');
    expect(html).toContain('sticky left-[45px] z-20');
    expect(html).toContain('sticky left-[45px] z-[1]');
    expect(html).toContain('odd:bg-card');
    expect(html).toContain('even:bg-[color-mix(in_srgb,hsl(var(--muted))_40%,hsl(var(--card)))]');
    expect(html).toContain('line-clamp-2');
    for (const s of t.sutunlar) {
      expect(html).toContain(`data-sutun-adi="${s.id}"`);
      expect(html).toContain(`data-sutun-id="${s.id}"`);
    }
    expect(html).toContain('aria-label="Sütun adı: Matematik puanı"');
    // Hayalet satır: soluk ve eğik yer tutucu, soluk "+"
    expect(html).toContain('placeholder:italic');
    expect(html).toContain('placeholder:text-muted-foreground');
  });

  it('seçili satır mercan renginde; satır sil (×) yalnız seçili satırda dokunulabilir', () => {
    const t = sabitBoy();
    const html = renderToStaticMarkup(<VeriTablosu tablo={t} seciliSatir={2} onSatirSec={bos} onTablo={bos} />);
    expect(html).toContain('data-satir="2" data-secili="true"');
    expect(html).toContain('bg-[#d9805f]');
    expect(html).toContain('color-mix(in_srgb,#d9805f_15%');
    const sil = (n: number) => html.match(new RegExp(`<button[^>]*aria-label="${n}\\. satırı sil"[^>]*>`))?.[0] ?? '';
    expect(sil(3)).toContain('tabindex="0"');
    expect(sil(3)).toContain('opacity-100');
    expect(sil(1)).toContain('tabindex="-1"');
    expect(sil(1)).toContain('pointer-events-none opacity-0');
    expect(sil(1)).toContain('group-hover:opacity-100');
    expect(sil(1)).toContain('group-focus-within:opacity-100');
  });

  it('sayısal sütunda metin varsa alt şeritte "Kategorik yap" önerilir', () => {
    const t = tabloOlustur(['Ad', 'Cinsiyet'], [['Ali', 'Erkek'], ['Ayşe', 'Kız']]);
    const html = renderToStaticMarkup(<VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} />);
    expect(t.sutunlar[1].tur).toBe('sayi');
    expect(html).toContain('Cinsiyet: değerler sayı değil');
    expect(html).toContain('>Kategorik yap</button>');
  });
});

describe('tablo: sayı biçimi, sütun adı ve yapıştırma', () => {
  it("onBlur: '1.234,5' → '1234,5' ve geçerli; '3.5' → '3,5'; '3,50' ve metin olduğu gibi", () => {
    expect(sayiMetniDuzelt('1.234,5')).toBe('1234,5');
    expect(sayiOku(sayiMetniDuzelt('1.234,5'))).toBe(1234.5);
    expect(sayiMetniDuzelt('3.5')).toBe('3,5');
    expect(sayiMetniDuzelt(' 12 ')).toBe('12');
    expect(sayiMetniDuzelt('1,234.5')).toBe('1234,5');
    expect(sayiMetniDuzelt('3,50')).toBe('3,50');
    expect(sayiMetniDuzelt('abc')).toBe('abc');
    expect(sayiMetniDuzelt('')).toBe('');
  });

  it('boş sütun adı önceki ada döner; yinelenen ada " (2)" eklenir', () => {
    const t = tabloOlustur(['Öğrenci', 'Boy (cm)', 'Kütle'], [['Ali', 150, 40]]);
    const bosAd = { ...t, sutunlar: t.sutunlar.map((s, i) => (i === 2 ? { ...s, ad: '  ' } : s)) };
    expect(sutunAdiDuzelt(bosAd, 2, 'Kütle').sutunlar[2].ad).toBe('Kütle');
    const yinelenen = { ...t, sutunlar: t.sutunlar.map((s, i) => (i === 2 ? { ...s, ad: 'boy (cm) ' } : s)) };
    expect(sutunAdiDuzelt(yinelenen, 2, 'Kütle').sutunlar[2].ad).toBe('boy (cm) (2)');
    expect(sutunAdiDuzelt(t, 2, 'Kütle')).toBe(t);
    expect(benzersizSutunAdi('Boy', ['Boy', 'Boy (2)'])).toBe('Boy (3)');
  });

  it('başlıklı Excel yapıştırması boş tabloda başlığı sütun adı yapar; türler ve sayılar düzelir', () => {
    const t = tabloOlustur(['Öğrenci', 'Boy (cm)'], []);
    const izgara = [
      ['Ad', 'Boy (cm)', 'Sınıf'],
      ['Ali', '150', 'A'],
      ['Ayşe', '148.5', 'B'],
      ['Can', '152', 'A'],
    ];
    const s = yapistirmaUygula(t, 0, 0, izgara);
    expect(s.baslikAlindi).toBe(true);
    expect(s.satirSayisi).toBe(3);
    expect(s.hucreSayisi).toBe(9);
    expect(s.tablo.sutunlar.map((c) => c.ad)).toEqual(['Ad', 'Boy (cm)', 'Sınıf']);
    expect(s.tablo.sutunlar.map((c) => c.tur)).toEqual(['etiket', 'sayi', 'etiket']);
    expect(s.tablo.satirlar.map((r) => r.hucreler)).toEqual([
      ['Ali', '150', 'A'],
      ['Ayşe', '148,5', 'B'],
      ['Can', '152', 'A'],
    ]);
  });

  it('dolu tablonun ortasına yapıştırma başlık aramaz; sayısal sütunda nokta ondalık virgüle döner', () => {
    const t = tabloOlustur(['Öğrenci', 'Boy (cm)'], [['Ali', 150], ['Ayşe', 148.5]]);
    const s = yapistirmaUygula(t, 2, 0, [
      ['Deniz', '151.5'],
      ['Ece', '149.25'],
    ]);
    expect(s.baslikAlindi).toBe(false);
    expect(s.tablo.sutunlar.map((c) => c.ad)).toEqual(['Öğrenci', 'Boy (cm)']);
    expect(s.tablo.satirlar.map((r) => r.hucreler[1])).toEqual(['150', '148,5', '151,5', '149,25']);
  });
});

// ── T-b: veri toplama görünümü ────────────────────────────────────────────────
/** Araştırma tablosu (sütun kimlikleri rol taşır: ar…-s0, ar…-deney) */
function arastirmaTablosu(sutunlar: { rol: string; ad: string; tur: 'sayi' | 'etiket' }[], satirlar: string[][]): VeriTablosuModeli {
  return {
    sutunlar: sutunlar.map((s) => ({ id: `ar7-x3k2-${s.rol}`, ad: s.ad, tur: s.tur })),
    satirlar: satirlar.map((h, i) => ({ id: `r${i + 1}`, hucreler: h })),
  };
}
const paraDeney = (n: number) =>
  arastirmaTablosu(
    [
      { rol: 's0', ad: 'Para', tur: 'etiket' },
      { rol: 'deney', ad: 'Deney', tur: 'etiket' },
    ],
    Array.from({ length: n }, (_, i) => [i % 3 === 0 ? 'Yazı' : 'Tura', i < 20 ? '1. deney (20)' : '2. deney (50)']),
  );
/** th min-width toplamı (tabloda çizilen sütun genişlikleri) */
const cizilenGenislik = (html: string) => [...html.matchAll(/<th[^>]*style="min-width:(\d+)px"/g)].reduce((t, m) => t + Number(m[1]), 0);
/** Açılış etiketinde nitelik var mı (sıra önemsiz) */
const etiketler = (html: string, desen: RegExp) => html.match(desen) ?? [];

describe('tablo: veri toplama görünümü (toplamaGorunumu, yeniSatirKimligi, bosIleti)', () => {
  it('toplama görünümü: başlıkta menü (tür ve sil) yok, satır işlemleri sütunu yok; × seçili satırın # hücresinde', () => {
    const t = paraDeney(12);
    const html = renderToStaticMarkup(<VeriTablosu tablo={t} seciliSatir={2} onSatirSec={bos} onTablo={bos} onTemizle={bos} toplamaGorunumu />);
    expect(html).not.toContain('data-sutun-menusu');
    expect(html).not.toContain('aria-haspopup="menu"');
    expect(html).not.toContain('Satır işlemleri');
    // × yalnız seçili satırda ve # hücresinin içinde; seçili satırın "seç" düğmesi yok
    expect(html.match(/satırı sil"/g)).toHaveLength(1);
    expect(html).toMatch(/<th scope="row"[^>]*><button[^>]*aria-label="3\. satırı sil"[^>]*data-satir-sil="2"/);
    expect(html).not.toContain('aria-label="3. satırı seç"');
    expect(html).toContain('aria-label="1. satırı seç"');
    // Korunan karar 4: hayalet satır, + Sütun ve Temizle alt şeritte kalır
    expect(html).toContain('data-bos-satir');
    expect(html).toContain('data-sutun-ekle');
    expect(html).toContain('data-temizle');
    // Sütun adı yine düzenlenebilir (başlık girdileri sütun kimliğiyle)
    expect(html).toContain('data-sutun-adi="ar7-x3k2-s0"');
    expect(html).toContain('>12 satır<');
  });

  it('çizilen sütun genişlikleri tabloDogalGenisligi ile aynı (toplama: menüsüz, 160 px etiket sınırı)', () => {
    for (const t of [paraDeney(30), sabitCalisma(), sabitBoy()]) {
      const normal = renderToStaticMarkup(<VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} />);
      expect(45 + cizilenGenislik(normal) + 44 + 10).toBe(tabloDogalGenisligi(t));
      const toplama = renderToStaticMarkup(<VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} toplamaGorunumu />);
      expect(45 + cizilenGenislik(toplama) + 10).toBe(tabloDogalGenisligi(t, { toplama: true }));
    }
  });

  it('sayısal ilk sütun (ölçüm değeri, sayı küpü): sağa yaslı; tam tabloda menüsüz durağan 123 çipi; toplamada çip yok; genişlik tutarlı', () => {
    const olcum = arastirmaTablosu(
      [
        { rol: 'deger', ad: 'Nabız (atım/dk)', tur: 'sayi' },
        { rol: 'grup', ad: 'Sınıf', tur: 'etiket' },
      ],
      [['84', '6-A'], ['72', '6-B']],
    );
    const tam = renderToStaticMarkup(<VeriTablosu tablo={olcum} seciliSatir={null} onSatirSec={bos} onTablo={bos} />);
    // İlk sütun: menü yok (türü değişmez), başlıkta durağan "123" çipi; ikinci sütun menülü
    expect(tam).toMatch(/data-sutun-id="ar7-x3k2-deger"[\s\S]*?data-ilk-sutun-turu="sayi"[\s\S]*?data-tur-cipi="sayi"/);
    expect(tam).not.toContain('data-sutun-menusu="ar7-x3k2-deger"');
    expect(tam).toContain('data-sutun-menusu="ar7-x3k2-grup"');
    // Hücreler ve başlık sağa yaslı (sayı gibi), sayısal klavye
    expect(tam).toMatch(/<input data-hucre="0-0"[^>]*inputMode="decimal"/);
    expect(tam).toMatch(/<input data-hucre="0-0"[^>]*class="[^"]*text-right tabular-nums/);
    expect(tam).toMatch(/data-sutun-adi="ar7-x3k2-deger"[^>]*class="[^"]*text-right/);
    // Genişlik: çizilen ile tabloDogalGenisligi aynı (çip 44 px'i sayılır)
    expect(45 + cizilenGenislik(tam) + 44 + 10).toBe(tabloDogalGenisligi(olcum));
    const toplama = renderToStaticMarkup(<VeriTablosu tablo={olcum} seciliSatir={null} onSatirSec={bos} onTablo={bos} toplamaGorunumu />);
    expect(toplama).not.toContain('data-ilk-sutun-turu');
    expect(toplama).not.toContain('data-tur-cipi');
    expect(toplama).toMatch(/<input data-hucre="0-0"[^>]*class="[^"]*text-right tabular-nums/);
    expect(45 + cizilenGenislik(toplama) + 10).toBe(tabloDogalGenisligi(olcum, { toplama: true }));
    // Etiketli ilk sütunda çip yok (bugünkü davranış)
    expect(renderToStaticMarkup(<VeriTablosu tablo={sabitBoy()} seciliSatir={null} onSatirSec={bos} onTablo={bos} />)).not.toContain('data-ilk-sutun-turu');
    // Yapıştırma sayısal ilk sütunun türünü korur ve sayıları Türkçe biçime getirir
    const s = yapistirmaUygula(olcum, 2, 0, [
      ['90.5', '6-A'],
      ['101', '6-B'],
    ]);
    expect(s.tablo.sutunlar[0].tur).toBe('sayi');
    expect(s.tablo.satirlar.map((r) => r.hucreler[0])).toEqual(['84', '72', '90,5', '101']);
  });

  it('tabloDogalGenisligi({ toplama: true }) VT §5.2: anket ve para ≤ 220, para + deney ≈ 256, iki küp + deney ≤ 432', () => {
    const anket = arastirmaTablosu([{ rol: 'cevap', ad: 'Meyve', tur: 'etiket' }], [['Elma'], ['Portakal'], ['Karpuz']]);
    const para = arastirmaTablosu([{ rol: 's0', ad: 'Para', tur: 'etiket' }], [['Yazı'], ['Tura']]);
    const ikiKup = arastirmaTablosu(
      [
        { rol: 's0', ad: '1. küp', tur: 'sayi' },
        { rol: 's1', ad: '2. küp', tur: 'sayi' },
        { rol: 'toplam', ad: 'Toplam', tur: 'sayi' },
        { rol: 'deney', ad: 'Deney', tur: 'etiket' },
      ],
      [['3', '4', '7', '2. deney (100)']],
    );
    expect(tabloDogalGenisligi(anket, { toplama: true })).toBeLessThanOrEqual(220);
    expect(tabloDogalGenisligi(para, { toplama: true })).toBeLessThanOrEqual(220);
    const pd = tabloDogalGenisligi(paraDeney(50), { toplama: true });
    expect(pd).toBeGreaterThan(tabloDogalGenisligi(para, { toplama: true }));
    expect(pd).toBeLessThanOrEqual(280);
    const ik = tabloDogalGenisligi(ikiKup, { toplama: true });
    expect(ik).toBeGreaterThan(pd);
    expect(ik).toBeLessThanOrEqual(432);
    // Toplama görünümü normal görünümden dar (menü ve satır işlemleri yok)
    expect(ik).toBeLessThan(tabloDogalGenisligi(ikiKup));
  });

  it('yeniSatirKimligi: o satır mercan tonunda parlar (yalnız o satır); seçiliyse seçim rengi kalır', () => {
    const t = paraDeney(5);
    const html = renderToStaticMarkup(<VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} yeniSatirKimligi="r5" />);
    expect(html.match(/data-yeni-satir="true"/g)).toHaveLength(1);
    expect(html).toMatch(/data-satir="4"[^>]*data-yeni-satir="true"/);
    expect(html).toContain('color-mix(in_srgb,#d9805f_20%');
    expect(html).toContain('duration-500 motion-reduce:transition-none');
    const secili = renderToStaticMarkup(<VeriTablosu tablo={t} seciliSatir={4} onSatirSec={bos} onTablo={bos} yeniSatirKimligi="r5" />);
    expect(secili).not.toContain('data-yeni-satir');
    const yok = renderToStaticMarkup(<VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} />);
    expect(yok).not.toContain('data-yeni-satir');
  });

  it('bosIleti: boş tabloda yönteme göre ileti (genel ileti yerine)', () => {
    const t = arastirmaTablosu([{ rol: 'cevap', ad: 'Meyve', tur: 'etiket' }], []);
    const ileti = 'Henüz cevap yok. Soldaki kutucuklara dokunun; her cevap buraya bir satır olarak yazılır.';
    const html = renderToStaticMarkup(
      <VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} onTemizle={bos} toplamaGorunumu bosIleti={ileti} />,
    );
    expect(html).toContain(ileti);
    expect(html).not.toContain('Tablo boş');
    expect(html).toContain('data-bos-ileti');
    expect(html).toContain('data-bos-satir');
  });
});

describe('tablo: salt okunur, kilitli ve bant modu', () => {
  it('saltOkunur (Deney özeti): hayalet satır, + Sütun, Temizle, menü ve satır silme yok; not görünür; hücreler salt okunur', () => {
    const ozet = arastirmaTablosu(
      [
        { rol: 'deney', ad: 'Deney', tur: 'etiket' },
        { rol: 'n', ad: 'Atış sayısı', tur: 'sayi' },
        { rol: 'oran', ad: 'Tura: göreli sıklık (%)', tur: 'sayi' },
      ],
      [
        ['1. deney (20)', '20', '55'],
        ['2. deney (50)', '50', '54'],
      ],
    );
    const not = 'Deney özeti kendiliğinden hesaplanır; düzenlemek için Atışlar tablosunu kullanın.';
    const html = renderToStaticMarkup(
      <VeriTablosu tablo={ozet} seciliSatir={0} onSatirSec={bos} onTablo={bos} onTemizle={bos} saltOkunur saltOkunurNotu={not} />,
    );
    expect(html).not.toContain('data-bos-satir');
    expect(html).not.toContain('data-sutun-ekle');
    expect(html).not.toContain('Temizle');
    expect(html).not.toContain('data-sutun-menusu');
    expect(html).not.toContain('satırı sil');
    expect(html).not.toContain('Satır işlemleri');
    expect(html).toContain(not);
    expect(html).toContain('data-salt-okunur="true"');
    // Hücreler ve başlıklar salt okunur; satır seçimi sürer
    const hucreler = etiketler(html, /<input[^>]*data-hucre="[^"]*"[^>]*>/g);
    expect(hucreler).toHaveLength(6);
    expect(hucreler.every((g) => /readonly=""/i.test(g))).toBe(true);
    expect(etiketler(html, /<input[^>]*data-sutun-adi="[^"]*"[^>]*>/g).every((g) => /readonly=""/i.test(g))).toBe(true);
    expect(html).toContain('aria-label="1. satırı seç"');
    // Varsayılan not ve boş tablo iletisi
    const bosOzet = renderToStaticMarkup(<VeriTablosu tablo={{ ...ozet, satirlar: [] }} seciliSatir={null} onSatirSec={bos} onTablo={bos} saltOkunur />);
    expect(bosOzet).toContain('Bu tablo kendiliğinden hesaplanır');
    expect(bosOzet).toContain('Tablo boş.');
    expect(bosOzet).not.toContain('alttaki satıra yazın');
  });

  it('kilitli: hayalet satır, + Sütun ve Temizle görünür ama pasif; hücreler salt okunur; menü pasif; × yok', () => {
    const t = sabitCalisma();
    const html = renderToStaticMarkup(<VeriTablosu tablo={t} seciliSatir={1} onSatirSec={bos} onTablo={bos} onTemizle={bos} kilitli />);
    const ekle = etiketler(html, /<button[^>]*data-sutun-ekle[^>]*>/g);
    expect(ekle).toHaveLength(1);
    expect(ekle[0]).toContain('disabled=""');
    const temizle = etiketler(html, /<button[^>]*data-temizle[^>]*>/g);
    expect(temizle).toHaveLength(1);
    expect(temizle[0]).toContain('disabled=""');
    const hayalet = html.match(/<tr data-bos-satir[\s\S]*?<\/tr>/)![0];
    expect(etiketler(hayalet, /<input[^>]*disabled=""[^>]*>/g)).toHaveLength(t.sutunlar.length);
    const ilkSatir = etiketler(html, /<input[^>]*data-hucre="0-[^"]*"[^>]*>/g);
    expect(ilkSatir).toHaveLength(t.sutunlar.length);
    expect(ilkSatir.every((g) => /readonly=""/i.test(g))).toBe(true);
    const menuler = etiketler(html, /<button[^>]*data-sutun-menusu="[^"]*"[^>]*>/g);
    expect(menuler).toHaveLength(3);
    expect(menuler.every((g) => g.includes('disabled=""'))).toBe(true);
    expect(html).not.toContain('satırı sil');
    expect(html).toContain('data-kilit-notu');
    expect(html).toContain('yazılıyor…');
    // Toplama görünümünde de seçili satırın # hücresi silmez (numara kalır)
    const toplama = renderToStaticMarkup(<VeriTablosu tablo={t} seciliSatir={1} onSatirSec={bos} onTablo={bos} toplamaGorunumu kilitli />);
    expect(toplama).toContain('aria-label="2. satırı seç"');
    expect(toplama).not.toContain('satırı sil');
  });

  it('bant modu: başlık (36 px) + 3 satır boyunda kutu; alt şeritte + Sütun, Temizle, satır sayısı ve "Tabloyu gizle"; açık bant ≤ 216 px', () => {
    const t = paraDeney(84);
    const html = renderToStaticMarkup(
      <VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} onTemizle={bos} toplamaGorunumu bantModu />,
    );
    expect(html).toContain('data-tablo-bandi="acik"');
    // Kaydırma kutusu: başlık 36 + 1 kenarlık, 3 satır × (44 + 1) = 172; alt şerit 44 (üst çizgisi gölge, kenarlık
    // değil) → açık bant 216 px (§0)
    expect(html).toContain('style="height:172px"');
    expect(html).toMatch(/<th scope="col" class="[^"]*h-9/);
    const serit = html.match(/<div class="([^"]*)" data-tablo-alt-serit/)![1];
    expect(serit).toContain('min-h-11');
    expect(serit).not.toContain('border-t');
    expect(serit).toContain('shadow-[inset_0_1px_0_hsl(var(--border))]');
    expect(172 + 44).toBeLessThanOrEqual(216);
    // Korunan karar 4: bant modunda da hayalet satır, + Sütun ve Temizle
    expect(html).toContain('data-bos-satir');
    expect(html).toContain('data-sutun-ekle');
    expect(html).toContain('data-temizle');
    expect(html).toContain('>84 satır<');
    expect(html).toMatch(/aria-expanded="true"[^>]*>Tabloyu gizle/);
    // Kök yüksekliğini kendisi belirler (kabın boyunu doldurmaz)
    expect(html.match(/^<div class="([^"]*)"/)![1]).not.toContain('h-full');
  });

  it('bant kapalı: 44 px şerit "Tablo · 84 satır · son: Tura" ve "Tabloyu göster"; tablo çizilmez', () => {
    const t = paraDeney(84);
    const html = renderToStaticMarkup(
      <VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} onTemizle={bos} toplamaGorunumu bantModu bantAcik={false} />,
    );
    expect(html).toContain('data-tablo-bandi="kapali"');
    expect(html).toContain('h-11');
    // Son satır (i = 83): 83 % 3 ≠ 0 → Tura; Deney sütunu özete girmez
    expect(html).toContain('title="Tablo · 84 satır · son: Tura"');
    expect(html).toMatch(/aria-expanded="false"[^>]*>Tabloyu göster/);
    expect(html).not.toContain('data-hucre');
    expect(html).not.toContain('<table');
  });

  it('bant kapalı: özet önce grafikteki değişkenin hücresini birimiyle yazar ("son: 152 cm"); o boşsa ilk üç dolu hücre', () => {
    const t = tabloOlustur(['Öğrenci', 'Sınıf', 'Boy (cm)'], [['7C-01', '7-C', 150], ['7C-24', '7-C', 152]]);
    const ciz = (vurgulu: string | null) =>
      renderToStaticMarkup(
        <VeriTablosu tablo={t} seciliSatir={null} onSatirSec={bos} onTablo={bos} onTemizle={bos} toplamaGorunumu bantModu bantAcik={false} vurguluSutun={vurgulu} />,
      );
    expect(ciz(t.sutunlar[2].id)).toContain('title="Tablo · 2 satır · son: 152 cm"');
    expect(ciz(t.sutunlar[1].id)).toContain('title="Tablo · 2 satır · son: 7-C"');
    expect(ciz(null)).toContain('title="Tablo · 2 satır · son: 7C-24, 7-C, 152"');
    // Tost ölçümü için özet yazısı kendi genişliğinde bir iç öğede
    expect(ciz(null)).toMatch(/<span data-bant-ozeti="">/);
  });

  it('bant kapalı, salt okunur özet (Deney özeti): "son" satırın adıdır ("7. deney (2000)"), birimsiz oran değil; yüzde birimi önde', () => {
    const ozet = tabloOlustur(['Deney', 'Tura: göreli sıklık (%)'], [['1. deney (20)', 40], ['7. deney (2000)', 50.4]]);
    const gorunen = ozet.sutunlar.map((sutun, j) => ({ sutun, j }));
    expect(bantSonMetni(ozet, ozet.sutunlar[1].id, gorunen, true)).toBe('7. deney (2000)');
    // Salt okunur değilse grafikteki değişken; yüzde Türkçedeki gibi önde
    expect(bantSonMetni(ozet, ozet.sutunlar[1].id, gorunen, false)).toBe('%50,4');
    const nabiz = tabloOlustur(['Öğrenci', 'Nabız (atım/dk)'], [['Ece', 72]]);
    expect(bantSonMetni(nabiz, nabiz.sutunlar[1].id, nabiz.sutunlar.map((sutun, j) => ({ sutun, j })), false)).toBe('72 atım/dk');
    expect(bantSonMetni(tabloOlustur(['A'], []), null, [], false)).toBe('');
    const html = renderToStaticMarkup(
      <VeriTablosu tablo={ozet} seciliSatir={null} onSatirSec={bos} onTablo={bos} saltOkunur bantModu bantAcik={false} vurguluSutun={ozet.sutunlar[1].id} />,
    );
    expect(html).toContain('title="Tablo · 2 satır · son: 7. deney (2000)"');
  });
});
