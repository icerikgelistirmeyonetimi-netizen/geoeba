// Sahip: A (vg/veri.ts örnek verileri, KesifKarti.tsx, OrnekGalerisi.tsx: her örnekte her grafik taraması, Keşif kartı ve galeri)
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NoktaGrafigi } from '../NoktaGrafigi';
import { SutunGrafigi } from '../SutunGrafigi';
import { CizgiGrafigi } from '../CizgiGrafigi';
import { DaireGrafigi } from '../DaireGrafigi';
import { IstatistikPaneli } from '../IstatistikPaneli';
import { KategorikIstatistik, KategorikSutunGrafigi, frekansTablosu, kategorikFrekanslar } from '../KategorikGrafikler';
import { SacilimGrafigi } from '../SacilimGrafigi';
import { VeriTablosu } from '../VeriTablosu';
import { KesifKarti } from '../KesifKarti';
import { OrnekGalerisi } from '../OrnekGalerisi';
import { degiskenSutunlari, kategoriRengi, renkEslemesi } from '../kategorik';
import { varsayilanAralik } from '../grafik';
import { sacilimEksenleri } from '../durum';
import { acilisYamasi, rehberAdimlari, rozetMetni, type AcilisYamasi } from '../rehber';
import {
  ORNEK_KONULARI,
  ORNEK_VERILER,
  TUM_OZELLIKLER,
  gecerliDegerler,
  ornekBul,
  ornekVeriOlustur,
  sayisalSutunlar,
  sutunIndeksi,
  type GrafikTuru,
  type OrnekVeri,
  type Ozellik,
  type VeriTablosu as VeriTablosuModeli,
} from '../veri';

const bos = () => undefined;

describe('Veri ve Grafik uygulaması (sunucu tarafı akıllı çizim)', () => {
  it('bütün örnek verilerde her grafik NaN / undefined / Infinity yazmadan çizilir', () => {
    const ortak = { seciliSatir: null, onSatirSec: bos, genislik: 640, yukseklik: 360, azaltilmisHareket: true };
    for (const o of ORNEK_VERILER) {
      const tablo = ornekVeriOlustur(o.id);
      const sayisal = sayisalSutunlar(tablo);
      const degiskenler = degiskenSutunlari(tablo);
      const ciktilar: string[] = [];
      for (const s of degiskenler) {
        const sutun = tablo.sutunlar.findIndex((x) => x.id === s.id);
        ciktilar.push(
          renderToStaticMarkup(
            <NoktaGrafigi {...ortak} tablo={tablo} sutun={sutun} onDegiskenBirak={bos} aralik={1} sutunModu={false} surukleniyor={false} secenekler={{ ortalama: true, oms: true, etiketler: true }} />,
          ),
          renderToStaticMarkup(
            <NoktaGrafigi {...ortak} tablo={tablo} sutun={sutun} onDegiskenBirak={bos} aralik={1} sutunModu surukleniyor={false} secenekler={{ ortalama: false, oms: false, etiketler: false }} />,
          ),
        );
        if (s.tur === 'sayi') {
          ciktilar.push(
            renderToStaticMarkup(<SutunGrafigi {...ortak} tablo={tablo} sutun={sutun} onDegerDegis={bos} yuvarlamaAdimi={1} />),
            renderToStaticMarkup(<DaireGrafigi {...ortak} tablo={tablo} sutun={sutun} onDegerlerDegis={bos} />),
            renderToStaticMarkup(<IstatistikPaneli tablo={tablo} sutun={sutun} seciliSatir={null} onSatirSec={bos} adimlariGoster onAdimlariGoster={bos} />),
          );
        } else {
          ciktilar.push(renderToStaticMarkup(<KategorikSutunGrafigi tablo={tablo} sutun={sutun} genislik={640} yukseklik={360} azaltilmisHareket />));
        }
      }
      if (sayisal.length > 0) ciktilar.push(renderToStaticMarkup(<CizgiGrafigi {...ortak} tablo={tablo} onDegerDegis={bos} yuvarlamaAdimi={1} />));
      for (const html of ciktilar) {
        expect(html, o.id).not.toMatch(/NaN|undefined|Infinity/);
      }
    }
  });

  it('kategorik örnek veri: tek sütunlu tabloda değişken sayısı doğru', () => {
    // baskan: ilk sütun ("1. pusula" …) tekil olduğu için değişken sayılmaz; tek değişken "Aday"
    const baskan = ornekVeriOlustur('baskan');
    const html = renderToStaticMarkup(<VeriTablosu tablo={baskan} seciliSatir={null} onSatirSec={bos} onTablo={bos} />);
    expect(html).toContain('20 satır · 1 değişken');
    const gun = ornekVeriOlustur('gun');
    const toplam = gun.satirlar.reduce((t, r) => t + Number(r.hucreler[1].replace(',', '.')), 0);
    expect(toplam).toBe(24);
  });
});

// Eski "sinif" örneği (ünite sınavı ortalamaları) kaldırıldı; aynı kapsam sıcak çikolata saçılımıyla sınanır
describe('örnek veri: sıcaklık ve sıcak çikolata satışı (saçılım)', () => {
  it('tarihe göre eşleşmiş iki sayısal değişken; saçılımda açılır; sıcaklık artınca satış azalır', () => {
    const ornek = ORNEK_VERILER.find((o) => o.id === 'cikolata')!;
    expect(ornek.onerilenGrafik).toBe('sacilim');
    expect(ORNEK_VERILER.find((o) => o.id === 'gun')!.onerilenGrafik).toBe('daire');
    // durum.test.ts'teki "saçılım: kategorik değişkene göre renk" testinden taşındı (örnek verinin önerilen grafiği)
    expect(ORNEK_VERILER.find((o) => o.id === 'calisma')!.onerilenGrafik).toBe('sacilim');
    const t = ornekVeriOlustur('cikolata');
    expect(t.sutunlar.map((s) => s.ad)).toEqual(['Tarih', 'Sıcaklık (°C)', 'Satış (bardak)']);
    expect(t.satirlar).toHaveLength(12);
    const eksen = sacilimEksenleri({ degisken: null, yDegisken: null }, t)!;
    expect(eksen).toEqual({ x: t.sutunlar[1].id, y: t.sutunlar[2].id, renk: null });
    // Pearson korelasyonu: belirgin ama kusursuz olmayan negatif ilişki
    const a = t.satirlar.map((r) => Number(r.hucreler[1]));
    const b = t.satirlar.map((r) => Number(r.hucreler[2]));
    const ort = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
    const [ma, mb] = [ort(a), ort(b)];
    const kov = a.reduce((s, v, i) => s + (v - ma) * (b[i] - mb), 0);
    const r = kov / Math.sqrt(a.reduce((s, v) => s + (v - ma) ** 2, 0) * b.reduce((s, v) => s + (v - mb) ** 2, 0));
    expect(r).toBeLessThan(-0.85);
    expect(r).toBeGreaterThan(-0.95);
    expect(ma).toBeCloseTo(12.25, 5);
    expect(mb).toBeCloseTo(36.25, 5);
  });
});

// ── 16 örnek × 6 sekme: açılış yamasıyla (uygulamanın örnek yüklemesi gibi) her sekmenin grafiği ─────────────

const SEKMELER: GrafikTuru[] = ['nokta', 'sutun', 'cizgi', 'daire', 'sacilim', 'istatistik'];
const HEPSI: ReadonlySet<Ozellik> = new Set(TUM_OZELLIKLER);
const HICBIRI: ReadonlySet<Ozellik> = new Set();
const BOZUK = /NaN|undefined|Infinity/;

/** index.tsx'in sekme dallarının sadeleştirilmiş kopyası: yamanın değişkeni, karşılaştırması ve renk anahtarıyla */
function sekmeCiz(tablo: VeriTablosuModeli, yama: AcilisYamasi, sekme: GrafikTuru): string[] {
  const g = { genislik: 846, yukseklik: 420, azaltilmisHareket: true };
  const ortak = { seciliSatir: null, onSatirSec: bos, ...g };
  const sutun = sutunIndeksi(tablo, yama.degisken);
  const kategorik = tablo.sutunlar[sutun]?.tur === 'etiket';
  const sira = yama.degisken ? yama.kategoriSiralari[yama.degisken] : undefined;
  const renkI = sutunIndeksi(tablo, yama.renkDegisken);
  const renkEslemi = renkI >= 0 ? renkEslemesi(tablo, renkI, yama.kategoriSiralari[yama.renkDegisken!]) : null;
  const sayisal = degiskenSutunlari(tablo).filter((s) => s.tur === 'sayi');
  const ikinci = sutunIndeksi(tablo, yama.ikinciDegisken);
  const cikti: string[] = [];
  const ciz = (el: React.ReactElement) => cikti.push(renderToStaticMarkup(el));
  switch (sekme) {
    case 'nokta': {
      const degerler = kategorik ? [] : gecerliDegerler(tablo, sutun).map((d) => d.deger);
      const aralik = yama.aralik ?? (kategorik ? 1 : varsayilanAralik(degerler));
      const nokta = (ek: Partial<React.ComponentProps<typeof NoktaGrafigi>>) => (
        <NoktaGrafigi
          {...ortak}
          tablo={tablo}
          sutun={sutun}
          onDegiskenBirak={bos}
          aralik={aralik}
          secenekler={yama.secenekler}
          sutunModu={yama.sutunModu}
          surukleniyor={false}
          kategoriSirasi={sira}
          renkEslemi={renkEslemi}
          {...ek}
        />
      );
      if (ikinci >= 0 && tablo.sutunlar[ikinci].tur === 'etiket') {
        // grupla: her kategori için alt alta panel (ortak eksen)
        const eslem = renkEslemesi(tablo, ikinci)!;
        for (const k of eslem.kategoriler) {
          const satirlar = tablo.satirlar.map((_, i) => i).filter((i) => tablo.satirlar[i].hucreler[ikinci].trim() === k);
          ciz(nokta({ satirlar, baslik: `${k} (${satirlar.length} veri)`, yukseklik: 200 }));
        }
      } else {
        ciz(nokta({}));
        ciz(nokta({ secenekler: { ortalama: true, oms: true, etiketler: true, ortanca: true } }));
        if (ikinci >= 0) ciz(nokta({ sutun: ikinci, seriIndeksi: 1 }));
      }
      break;
    }
    case 'sutun':
      if (kategorik) ciz(<KategorikSutunGrafigi tablo={tablo} sutun={sutun} sira={sira} renkEslemi={renkEslemi} {...g} />);
      else ciz(<SutunGrafigi {...ortak} tablo={tablo} sutun={sutun} onDegerDegis={bos} yuvarlamaAdimi={1} renkEslemi={renkEslemi} />);
      break;
    case 'cizgi': {
      // Veri türü kapısı: sayısal değişken yoksa sekme pasif (grafik çizilmez)
      if (sayisal.length === 0) break;
      const cizgiSutun = kategorik ? tablo.sutunlar.indexOf(sayisal[0]) : sutun;
      const ek = ikinci >= 0 && tablo.sutunlar[ikinci].tur === 'sayi' && ikinci !== cizgiSutun ? [ikinci] : [];
      ciz(<CizgiGrafigi {...ortak} tablo={tablo} sutunlar={[cizgiSutun, ...ek]} onDegerDegis={bos} yuvarlamaAdimi={1} renkEslemi={renkEslemi} />);
      break;
    }
    case 'daire':
      if (kategorik) {
        const f = kategorikFrekanslar(tablo, sutun, sira).filter((x) => x.sayi > 0);
        ciz(
          <DaireGrafigi
            {...ortak}
            tablo={frekansTablosu(f, tablo.sutunlar[sutun].ad)}
            sutun={1}
            onDegerlerDegis={bos}
            surukleKapali
            renkler={f.map((x, i) => kategoriRengi(x.kategori, i))}
          />,
        );
      } else ciz(<DaireGrafigi {...ortak} tablo={tablo} sutun={sutun} onDegerlerDegis={bos} renkEslemi={renkEslemi} />);
      break;
    case 'sacilim': {
      if (sayisal.length < 2) break;
      const e = sacilimEksenleri({ degisken: yama.degisken, yDegisken: null, renkDegisken: yama.renkDegisken }, tablo)!;
      ciz(<SacilimGrafigi {...ortak} tablo={tablo} xSutun={sutunIndeksi(tablo, e.x)} ySutun={sutunIndeksi(tablo, e.y)} renkEslemi={renkEslemi} />);
      break;
    }
    case 'istatistik':
      if (kategorik) ciz(<KategorikIstatistik tablo={tablo} sutun={sutun} sira={sira} renkEslemi={renkEslemi} />);
      else
        ciz(
          <IstatistikPaneli
            tablo={tablo}
            sutun={sutun}
            seciliSatir={null}
            onSatirSec={bos}
            adimlariGoster
            onAdimlariGoster={bos}
            renkEslemi={renkEslemi}
            ikinciSutun={ikinci >= 0 && tablo.sutunlar[ikinci].tur === 'sayi' ? ikinci : null}
          />,
        );
      break;
  }
  return cikti;
}

describe('örnekler: 16 örnek × 6 sekme (açılış yamasıyla, özellikli ve özelliksiz)', () => {
  it('her örnek her sekmede NaN / undefined / Infinity yazmadan çizilir; açılış sekmesinde grafik var', () => {
    let toplam = 0;
    for (const o of ORNEK_VERILER) {
      for (const oz of [HEPSI, HICBIRI]) {
        const tablo = o.olustur();
        const yama = acilisYamasi(o, tablo, oz);
        expect(yama.degisken, o.id).not.toBeNull();
        for (const sekme of SEKMELER) {
          const cikti = sekmeCiz(tablo, yama, sekme);
          if (sekme === yama.sekme) expect(cikti.length, `${o.id} ${sekme}`).toBeGreaterThan(0);
          for (const html of cikti) expect(html, `${o.id} ${sekme}`).not.toMatch(BOZUK);
          toplam += cikti.length;
        }
      }
    }
    // 16 × 2 × 6 sekmeden kapıdan geçenler (çizgi ≥ 1, saçılım ≥ 2 sayısal); nokta sekmesinde birden çok panel
    expect(toplam).toBeGreaterThan(16 * 2 * 5);
  });

  it('her örnek her sekmede Keşif şeridi ve kartı NaN / undefined yazmadan çizilir', () => {
    for (const o of ORNEK_VERILER) {
      for (const sekme of SEKMELER) {
        for (const gorunum of ['serit', 'kart'] as const) {
          const html = renderToStaticMarkup(
            <KesifKarti ornek={o} sekme={sekme} ozellikler={HEPSI} gorunum={gorunum} onGorunum={bos} onKapat={bos} onEylem={bos} yukseklikSiniri={180} />,
          );
          expect(html, `${o.id} ${sekme} ${gorunum}`).not.toMatch(BOZUK);
          expect(html, o.id).toContain(`data-ornek-ipucu="${gorunum}"`);
        }
      }
    }
  });
});

// ── Keşif kartı ──────────────────────────────────────────────────────────────────────────────────────────────

/** HTML'deki görünür metin (etiketler atılır, varlıklar çözülür) */
function metin(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function kart(o: OrnekVeri, ek: Partial<React.ComponentProps<typeof KesifKarti>> = {}): string {
  return renderToStaticMarkup(
    <KesifKarti ornek={o} sekme="nokta" ozellikler={HEPSI} gorunum="kart" onGorunum={bos} onKapat={bos} onEylem={bos} yukseklikSiniri={180} {...ek} />,
  );
}

describe('Keşif kartı (SSR)', () => {
  it('şerit: araştırma sorusu + sekmeye duyarlı ipucu, Keşfet ve kapat (44 px); en çok iki satır', () => {
    const boy = ornekBul('boy')!;
    const html = renderToStaticMarkup(<KesifKarti ornek={boy} sekme="nokta" ozellikler={HICBIRI} gorunum="serit" onGorunum={bos} onKapat={bos} onEylem={bos} />);
    const m = metin(html);
    expect(html).toContain('role="note"');
    expect(m).toContain(boy.hikaye.arastirmaSorusu);
    expect(m).toContain(boy.aciklama);
    expect(m).toContain('Keşfet');
    expect(html).toContain('aria-label="İpucunu kapat"');
    expect(html).toMatch(/h-11 w-11/);
    expect(html).toContain('line-clamp-2');
    // İstatistik sekmesinde şerit o sekmenin ipucunu gösterir
    const ist = metin(renderToStaticMarkup(<KesifKarti ornek={boy} sekme="istatistik" ozellikler={HICBIRI} gorunum="serit" onGorunum={bos} onKapat={bos} onEylem={bos} />));
    expect(ist).toContain(boy.sekmeIpucu!.istatistik!);
    expect(ist).not.toContain(boy.aciklama);
  });

  it('kart sade: yalnız sınıf rozeti, araştırma sorusu ve etkin adım (1/4 Tahmin et, Cevabı göster, ‹ ›); künye ve kazanım kapalı', () => {
    const baskan = ornekBul('baskan')!;
    const html = kart(baskan);
    const m = metin(html);
    expect(html).toContain('data-kesif-karti="baskan"');
    expect(html).toContain('role="region"');
    expect(m.startsWith('5. sınıf ')).toBe(true);
    expect(m).not.toContain('MAT.');
    expect(m).toContain(baskan.hikaye.arastirmaSorusu);
    // Künye, kaynak ve kazanım öğretmen kartında: kart açılışta göstermez
    expect(m).not.toContain(baskan.hikaye.cumle);
    expect(html).not.toContain('data-kunye');
    expect(html).not.toContain('data-ogretmen-notu');
    expect(html).toMatch(/<button[^>]*aria-label="Öğretmen kartı"[^>]*aria-expanded="false"[^>]*data-ogretmen-dugmesi/);
    expect(m).toContain('1/4 Tahmin et');
    expect(m).toContain(baskan.rehber[0].soru);
    expect(m).toContain('Cevabı göster');
    expect(m).not.toContain(baskan.rehber[0].cevap); // cevap kapalı başlar
    expect(html).not.toContain('data-rehber-eylemi');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*data-onceki-adim/);
    expect(html).toContain('aria-label="Önceki adım"');
    expect(html).toContain('aria-label="Keşif kartını küçült"');
    // Adımın düğmeleri sorunun satırında (ayrı düğme sırası yok): düğme grubu adım bloğunun içinde
    const adimBlogu = html.slice(html.indexOf('data-rehber-adimi'));
    expect(adimBlogu).toContain('data-adim-sorusu');
    expect(adimBlogu).toContain('data-adim-dugmeleri');
    // Başlık + adım: iki sıra; yükseklik sınırı yalnız öğretmen kartı açıkken kullanılır
    expect(html).not.toContain('max-height');
  });

  it('öğretmen kartı ([i]): kazanım " · " ile, künye, not, kaynak ve bütün bağlantılar; kendi içinde kayan bölge', () => {
    const baskan = ornekBul('baskan')!;
    const html = kart(baskan, { ilkOgretmen: true });
    const m = metin(html);
    expect(html).toMatch(/<button[^>]*aria-expanded="true"[^>]*data-ogretmen-dugmesi/);
    expect(html).toMatch(/<div[^>]*role="region"[^>]*aria-label="Öğretmen kartı"[^>]*tabindex="0"[^>]*class="[^"]*overflow-y-auto/);
    for (const b of ['KAZANIM', 'VERİ', 'NOT', 'KAYNAK']) expect(m).toContain(b);
    expect(m).toContain('MAT.5.5.1');
    expect(m).toContain(baskan.hikaye.cumle);
    expect(m).toContain(baskan.ogretmenNotu!);
    expect(m).toContain('Kurgusal sınıf verisi.');
    // Rozet yine yalnız sınıf; kazanım kartta
    const sicaklik = metin(kart(ornekBul('sicaklik')!, { ilkOgretmen: true }));
    expect(sicaklik).toContain('MAT.7.6.1 · 7.6.2');
    expect(sicaklik).toContain('Erişim: 24 Eylül 2026.');
    expect(sicaklik).not.toMatch(/HTML|2026-09-24/);
    // İki bağlantılı kaynak: ikisi birlikte
    const iklim = kart(ornekBul('iklim')!, { ilkOgretmen: true });
    const iklimBag = [...iklim.matchAll(/<a href="([^"]*)"[^>]*data-kaynak-baglantisi[^>]*>([\s\S]*?)<\/a>/g)].map((x) => [x[1], metin(x[2])]);
    expect(iklimBag.map((x) => x[1])).toEqual(['MGM: Erzurum', 'İzmir']);
    expect(iklimBag[1][0]).toMatch(/m=IZMIR$/);
    const boy = kart(ornekBul('boy')!, { ilkOgretmen: true });
    expect([...boy.matchAll(/data-kaynak-baglantisi[^>]*>([\s\S]*?)<\/a>/g)].map((x) => metin(x[1]))).toEqual(['WHO: erkek', 'kız']);
  });

  it('kart, baskan 3. adım: soru ve "Sütunlara dönüştür" eylem düğmesi; son adımda Sonraki pasif', () => {
    const baskan = ornekBul('baskan')!;
    const html = kart(baskan, { ilkAdim: 2 });
    expect(metin(html)).toContain('3/4 Aç ve ölç');
    expect(metin(html)).toContain(baskan.rehber[2].soru);
    expect(html).toContain('data-rehber-eylemi="secenek"');
    expect(metin(html)).toContain('Sütunlara dönüştür');
    const son = kart(baskan, { ilkAdim: 3 });
    expect(metin(son)).toContain('Daireye geç');
    expect(son).toMatch(/<button[^>]*disabled=""[^>]*data-sonraki-adim/);
    // Sekme eylemi o sekmedeyken yapılmış sayılır (onay)
    expect(metin(kart(baskan, { ilkAdim: 3, sekme: 'daire' }))).toContain('(yapıldı)');
    expect(metin(son)).not.toContain('(yapıldı)');
  });

  it('özelliğe bağlı eylem: sinav 3. adım grupla yokken yedek düğme; kitap 3. adım ortanca yokken düğmesiz; sürükleme yazı', () => {
    const sinav = ornekBul('sinav')!;
    expect(metin(kart(sinav, { ilkAdim: 2, ozellikler: HICBIRI }))).toContain('Gruplara göre tabloyu aç');
    expect(metin(kart(sinav, { ilkAdim: 2, ozellikler: HEPSI }))).toContain('Ortalama ve sapmayı aç');
    const kitap = ornekBul('kitap')!;
    expect(kart(kitap, { ilkAdim: 2, ozellikler: HICBIRI })).not.toContain('data-rehber-eylemi');
    expect(metin(kart(kitap, { ilkAdim: 2, ozellikler: HEPSI }))).toContain('Ortanca ve ortalamayı aç');
    // Sürükleme eylemi düğme değil, yol gösteren yazı
    const gun = kart(ornekBul('gun')!, { ilkAdim: 3 });
    expect(gun).toMatch(/<span[^>]*data-rehber-eylemi="surukle"/);
    expect(metin(gun)).toContain('Uyku sınırını sürükle');
  });

  it('künye: hassas örnekte kod notu; gerçek veride bağlantılı kaynak (yeni sekmede) ve başlıkta "Gerçek veri"; zenginleştirme rozeti', () => {
    expect(metin(kart(ornekBul('ekran')!, { ilkOgretmen: true }))).toContain('Adlar yerine kod kullanıldı');
    const sicaklik = kart(ornekBul('sicaklik')!, { ilkOgretmen: true });
    expect(metin(sicaklik)).toContain('Gerçek veri: MGM, İllerimize Ait Genel İstatistik Veriler');
    expect(sicaklik).toMatch(/<a href="https:\/\/www\.mgm\.gov\.tr[^"]*" target="_blank" rel="noreferrer"/);
    // Gerçek veri rozeti öğretmen kartı kapalıyken de başlıkta
    expect(kart(ornekBul('sicaklik')!)).toContain('data-gercek-veri');
    expect(kart(ornekBul('boy')!)).not.toContain('data-gercek-veri');
    const calisma = ornekBul('calisma')!;
    expect(rozetMetni(calisma)).toBe('Zenginleştirme');
    expect(metin(kart(calisma))).toContain('Zenginleştirme');
    expect(metin(kart(calisma, { ilkOgretmen: true }))).toContain('Programda yok (zenginleştirme)');
  });

  it('şerit: ipucu boşsa (Çizgi, satırlar sıra değil) yalnız araştırma sorusu, darda da; önerilen sekmenin talimatı başka sekmede yinelenmez', () => {
    const gun = ornekBul('gun')!;
    const serit = (o: OrnekVeri, sekme: GrafikTuru) =>
      renderToStaticMarkup(<KesifKarti ornek={o} sekme={sekme} ozellikler={HEPSI} gorunum="serit" onGorunum={bos} onKapat={bos} onEylem={bos} />);
    const cizgi = serit(gun, 'cizgi');
    const p = metin(cizgi.match(/<p[^>]*data-serit-metni[^>]*>([\s\S]*?)<\/p>/)![1]);
    expect(p).toBe(gun.hikaye.arastirmaSorusu);
    expect(metin(cizgi)).not.toContain(gun.aciklama);
    for (const o of ORNEK_VERILER)
      for (const sekme of SEKMELER)
        if (sekme !== (o.acilis?.sekme ?? o.onerilenGrafik)) expect(metin(serit(o, sekme)), `${o.id} ${sekme}`).not.toContain(o.aciklama);
  });

  it('bütün örneklerde kartın her adımı: 4 adım, eylem etiketi görünür, emoji yok, bütün düğmeler 44 px (h-11)', () => {
    for (const o of ORNEK_VERILER) {
      const adimlar = rehberAdimlari(o, HEPSI);
      expect(adimlar, o.id).toHaveLength(4);
      adimlar.forEach((a, i) => {
        const html = kart(o, { ilkAdim: i });
        const m = metin(html);
        expect(m, `${o.id} ${i}`).toContain(`${i + 1}/4 ${a.baslik}`);
        if (a.eylem) expect(m, `${o.id} ${i}`).toContain(a.eylem.etiket);
        expect(m, o.id).not.toMatch(/\p{Extended_Pictographic}/u);
        for (const d of html.match(/<button[^>]*>/g) ?? []) expect(d, o.id).toMatch(/h-11/);
      });
    }
  });
});

// ── Örnek galerisi ───────────────────────────────────────────────────────────────────────────────────────────

describe('Örnek galerisi (SSR)', () => {
  const galeri = (ek: Partial<React.ComponentProps<typeof OrnekGalerisi>> = {}) =>
    renderToStaticMarkup(<OrnekGalerisi yukluOrnekId={null} onceki={null} onYukle={bos} onOncekiTabloyaDon={bos} genislik={860} {...ek} />);

  it('16 örnek: 16 data-ornek ve 16 role="menuitem"; 5 konu; ilk span örneğin adı; mini grafik önerilen türde ve dolu', () => {
    const html = galeri();
    expect(html.match(/data-ornek="/g)).toHaveLength(16);
    expect(html.match(/role="menuitem"/g)).toHaveLength(16);
    expect(html.match(/data-ornek-konusu="/g)).toHaveLength(5);
    for (const k of ORNEK_KONULARI) expect(html).toContain(`aria-label="${k.ad}"`);
    expect(html).not.toMatch(BOZUK);
    expect(html).not.toContain('data-onceki-tablo');
    for (const o of ORNEK_VERILER) {
      const oge = html.match(new RegExp(`<button[^>]*data-ornek="${o.id}"[^>]*>([\\s\\S]*?)</button>`));
      expect(oge, o.id).not.toBeNull();
      const [dugme, ic] = [oge![0], oge![1]];
      // Tur betikleri öğenin ilk span'ının metnini örnek adı sayar (ilk span: ad + metinsiz onay simgesi)
      const ilkSpan = ic.slice(ic.indexOf('<span'));
      expect(metin(ilkSpan.slice(0, ilkSpan.indexOf('</span></span>') + 14)), o.id).toBe(o.ad);
      expect(ic, o.id).toContain(`data-mini-grafik="${o.acilis?.sekme ?? o.onerilenGrafik}"`);
      expect(dugme, o.id).toContain('min-h-[56px]');
      expect(metin(ic), o.id).toContain(`${o.sinif}. sınıf`);
      // Mini grafik boş değil: çerçeveden başka şekiller var
      expect((ic.match(/<(circle|rect|path) /g) ?? []).length, o.id).toBeGreaterThan(3);
    }
    expect(metin(html.match(/data-ornek="sicaklik"[\s\S]*?<\/button>/)![0])).toContain('Gerçek veri');
  });

  it('geniş menüde iki sütun, darda tek; yüklü örnekte aria-current ve onay', () => {
    expect(galeri({ genislik: 860 })).toContain('grid-cols-2');
    const dar = galeri({ genislik: 520 });
    expect(dar).toContain('grid-cols-1');
    expect(dar).not.toContain('grid-cols-2');
    const yuklu = galeri({ yukluOrnekId: 'kitap' });
    expect(yuklu.match(/aria-current="true"/g)).toHaveLength(1);
    expect(yuklu).toMatch(/<button[^>]*aria-current="true"[^>]*data-ornek="kitap"/);
  });

  it('önceki tablo: en üstte "Önceki tabloya dön" (ad · satır sayısı) ve ayraç; 17 menuitem', () => {
    const html = galeri({ onceki: { ad: 'Boy (cm)', satirSayisi: 24 } });
    expect(html.match(/role="menuitem"/g)).toHaveLength(17);
    expect(html.indexOf('data-onceki-tablo')).toBeLessThan(html.indexOf('data-ornek="'));
    const m = metin(html);
    expect(m).toContain('Önceki tabloya dön');
    expect(m).toContain('Boy (cm) · 24 satır');
    expect(html).toContain('role="separator"');
  });
});
