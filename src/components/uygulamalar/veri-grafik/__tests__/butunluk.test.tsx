// Sahip: Z (birleştirme ve son doğrulama: bütünlük taraması)
//
// Uygulamanın bütün kökü sunucuda çizilir (sahte localStorage'lı pencereyle; durum ilk çizimde okunur):
// - 16 örnek × 6 grafik sekmesi (örnek yüklemesinin açılış görünümüyle; ölçüler, adımlar ve sütun modu açık çeşitlerle),
// - "Veri topla" paneli: "Ne araştıralım?", "Kendi sorunu yaz" formu (üç yöntem), 18 hazır sorunun Topla görünümü
//   (boş ve veriyle), Deney özeti (iki deney) ve panel kapandıktan sonraki soru şeridi, eski örnekleyici kaydının göçü,
// - [i] öğretmen kartının üç bölümü (18 hazır soru) ve Keşif kartı (16 örnek).
// Çıktıda NaN / undefined / Infinity, plan §6'daki eski terimler, emoji ve saydam kart sınıfı (bg-card/) olmamalı.
// Kaynak taraması (fs): vg/ altında eski örnekleyici paneli, bayrak anahtarı, adım yolu ve sendika verisi geçmez.
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import VeriGrafikUygulamasi, { DEPO_ANAHTARI } from '../index';
import { baslangicDurumu, ornegiYukle, SEKMELER, type Durum, type Sekme } from '../durum';
import { ORNEK_VERILER, TUM_OZELLIKLER, type Ozellik } from '../veri';
import {
  HAZIR_SORULAR,
  TOPLAMA_YONTEMLERI,
  anketSecenekleri,
  anketSatiri,
  hazirSoruUygula,
  olcumSatirlari,
  varsayilanArastirma,
  type Arastirma,
} from '../arastirma';
import { ozeteGec, planiUygula, toplamaKapat, toplamaVerisiYaz } from '../toplamaDurumu';
import { sonucDegerleri } from '../deney';
import { OgretmenKarti, type OgretmenBolumu } from '../toplama/OgretmenKarti';
import { KesifKarti } from '../KesifKarti';

const bos = () => undefined;
const VG = path.resolve(__dirname, '..');

/**
 * Sunucu çiziminde ölçü yoktur (useBoyut 0 × 0 döner) ve uygulama grafiği ölçü gelmeden çizmez. Taramanın grafikleri de
 * kapsaması için ölçüsüz useBoyut çağrıları (kök, grafik alanı, grafik sütunu, Keşif kartı) sahte bir ölçü alır.
 */
const sahte = vi.hoisted(() => ({ boyut: null as { genislik: number; yukseklik: number } | null }));
vi.mock('../ortak', async (orijinal) => {
  const m = await orijinal<typeof import('../ortak')>();
  return {
    ...m,
    useBoyut: (...args: Parameters<typeof m.useBoyut>) => {
      const b = m.useBoyut(...args);
      return b.genislik === 0 && b.yukseklik === 0 && sahte.boyut ? sahte.boyut : b;
    },
  };
});
/** Geniş (iki sütun) ve dar (alt alta) grafik ölçüsü */
const GENIS = { genislik: 1000, yukseklik: 500 };
const DAR = { genislik: 600, yukseklik: 380 };

// ── Kurallar ─────────────────────────────────────────────────────────────────────────────────────────────────

const BOZUK = /NaN|undefined|Infinity/;
/** Birleşen üst çizgi (U+0304): eski ortalama gösterimi x-üstçizgi */
const MAKRON = String.fromCharCode(0x304);
const EMOJI = /\p{Extended_Pictographic}/u;

/** Plan §6: öğrenciye görünen metinde geçmeyecek eski terimler (tek sözcük olanlar sözcük sınırıyla aranır) */
const ESKI_TERIMLER: { ad: string; desen: RegExp }[] = [
  { ad: 'Medyan', desen: /Medyan/ },
  { ad: 'Mod', desen: /(?<!\p{L})Mod(?!\p{L})/u },
  { ad: 'Frekans', desen: /Frekans/ },
  { ad: 'frekans', desen: /frekans/ },
  { ad: 'kuramsal', desen: /kuramsal/ },
  { ad: 'Örnekleyici', desen: /Örnekleyici/ },
  { ad: 'çekiliş', desen: /çekiliş/ },
  { ad: 'İadeli', desen: /İadeli/ },
  { ad: 'İadesiz', desen: /İadesiz/ },
  { ad: 'Deneyle topla', desen: /Deneyle topla/ },
  { ad: 'x' + MAKRON, desen: new RegExp('x' + MAKRON) },
  { ad: 'Σ', desen: /Σ/ },
  { ad: 'Δ', desen: /Δ/ },
  { ad: 'OMS', desen: /(?<!\p{L})OMS(?!\p{L})/u },
];

/** Varlıkları çözer (renderToStaticMarkup'ın kaçışları) */
function coz(m: string): string {
  return m
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

/**
 * Öğrenciye görünen ya da okunan metin: etiketler arasındaki yazı + erişilebilir adlar, ipuçları ve yer tutucular
 * (sınıf adları, data-* ve kimlikler taranmaz: kod adları "frekans" gibi sözcükler taşıyabilir)
 */
function okunanMetin(html: string): string {
  const govde = html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ');
  const nitelikler = Array.from(govde.matchAll(/\s(?:aria-label|aria-description|aria-roledescription|aria-valuetext|title|placeholder|alt)="([^"]*)"/g)).map((m) => m[1]);
  const yazi = govde.replace(/<[^>]+>/g, ' ');
  return coz([yazi, ...nitelikler].join(' \n ')).replace(/\s+/g, ' ');
}

/** Bir çıktının bütün kuralları; bulunan ihlaller "bağlam: kural (örnek)" listesi olarak döner */
function ihlaller(html: string, baglam: string): string[] {
  const sonuc: string[] = [];
  const bozuk = html.match(BOZUK);
  if (bozuk) sonuc.push(`${baglam}: ${bozuk[0]} (…${html.slice(Math.max(0, bozuk.index! - 60), bozuk.index! + 20)}…)`);
  if (html.includes('bg-card/')) sonuc.push(`${baglam}: bg-card/`);
  const metin = okunanMetin(html);
  const emoji = metin.match(EMOJI);
  if (emoji) sonuc.push(`${baglam}: emoji ${emoji[0]}`);
  for (const t of ESKI_TERIMLER) {
    const m = metin.match(t.desen);
    if (m) sonuc.push(`${baglam}: eski terim "${t.ad}" (…${metin.slice(Math.max(0, m.index! - 40), m.index! + 30)}…)`);
  }
  return sonuc;
}

// ── Sunucu çizimi (sahte localStorage'lı pencere) ────────────────────────────────────────────────────────────

/** Uygulama kökünü verilen durumla çizer: durum kayıttan okunur (ilkDurum → durumCoz → eksen ve sekme düzeltmesi) */
function uygulamaCiz(d: Durum | string, boyut: { genislik: number; yukseklik: number } = GENIS): string {
  const kayit = typeof d === 'string' ? d : JSON.stringify(d);
  const g = globalThis as { window?: unknown };
  const eski = g.window;
  g.window = { localStorage: { getItem: (k: string) => (k === DEPO_ANAHTARI ? kayit : null), setItem: bos, removeItem: bos } };
  sahte.boyut = boyut;
  try {
    return renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={boyut.genislik} />);
  } finally {
    sahte.boyut = null;
    if (eski === undefined) delete g.window;
    else g.window = eski;
  }
}

/** Hazır sorunun planı uygulanmış durum; `n` > 0 ise yönteme göre n satır veri (deneyde bir bilgisayar deneyi) */
function hazirSoruDurumu(id: string, n: number): Durum {
  const plan = hazirSoruUygula(id)!;
  let d = planiUygula(baslangicDurumu(), plan).durum;
  const a = d.arastirma;
  if (!a || n <= 0 || !a.sutunlar) return { ...d, toplamaAcik: true };
  if (a.yontem === 'anket') {
    const s = anketSecenekleri(a);
    if (s.length) d = toplamaVerisiYaz(d, { ekle: Array.from({ length: n }, (_, i) => ({ kimlik: `z${i}`, hucreler: anketSatiri(a, s[(i * 7) % s.length]) })) });
  } else if (a.yontem === 'olcum') {
    const [alt, ust] = a.olcum.beklenen ?? [10, 30];
    const degerler = Array.from({ length: n }, (_, i) => Math.round(alt + ((ust - alt) * ((i * 5) % 11)) / 10));
    d = toplamaVerisiYaz(d, { ekle: olcumSatirlari(a, degerler, '').map((h, i) => ({ kimlik: `z${i}`, hucreler: h })) });
  } else if (a.yontem === 'deney') {
    d = deneyEkle(d, 1, n);
  }
  return { ...d, toplamaAcik: true };
}

/** Deney çalışması `no`: n atış (sonuç değerleri sırayla dolaşılır; iki küpte 1. küp, 2. küp, toplam) */
function deneyEkle(d: Durum, no: number, n: number): Durum {
  const a = d.arastirma!;
  const degerler = sonucDegerleri(a.deney);
  const satirlar = Array.from({ length: n }, (_, i) => {
    if (a.deney.nesne !== 'iki-zar') return [degerler[(i * 3 + no) % Math.max(1, degerler.length)] ?? ''];
    const x = (i % 6) + 1;
    const y = ((i * 5 + no) % 6) + 1;
    return [String(x), String(y), String(x + y)];
  });
  return toplamaVerisiYaz(d, {
    calismaBaslat: { no, kayit: 'simulasyon', hedef: n },
    ekle: satirlar.map((h, i) => ({ kimlik: `d${no}-${i}`, hucreler: h })),
    calismaBitir: no,
  });
}

const HEPSI: ReadonlySet<Ozellik> = new Set(TUM_OZELLIKLER);
const SEKME_IDLERI: Sekme[] = SEKMELER.map((s) => s.id);

/** İstenen sekme seçili kaldı mı (veri türü kapısı pasif sekmeyi Nokta'ya çevirir) */
function sekmeAcik(html: string, sekme: Sekme): boolean {
  const secili = html.match(/<button[^>]*role="tab" aria-selected="true"[^>]*>([^<]*)</);
  return secili?.[1] === SEKMELER.find((s) => s.id === sekme)!.ad;
}

/** Grafik alanı dolu mu: çizilmiş grafik, Daire bilgi kutusu ya da İstatistik (Veri sayısı satırı) */
function grafikDolu(html: string): boolean {
  const alan = html.slice(html.indexOf('id="vg-grafik-alani"'));
  return /<svg[^>]*data-grafik|data-daire-bilgi|data-kategorik-istatistik/.test(alan) || okunanMetin(alan).includes('Veri sayısı');
}

/** data-sayim alt çubuğundaki sayım ("12 cevap" / "12 ölçüm" / "12 atış") */
const sayim = (html: string) => coz(html.match(/data-sayim="">([^<]*)</)?.[1] ?? '');

describe('bütünlük: tarama kuralları (kendi sınaması)', () => {
  it('her eski terimi, emojiyi, bozuk sayıyı ve saydam kartı yakalar; kod adlarını ve benzer sözcükleri yakalamaz', () => {
    for (const t of ESKI_TERIMLER) expect(ihlaller(`<p>Bu grafikte ${t.ad} = 3</p>`, t.ad), t.ad).toHaveLength(1);
    expect(ihlaller('<button aria-label="Medyanı göster"></button>', 'aria')).toHaveLength(1);
    expect(ihlaller('<svg><title>Σ toplam</title></svg>', 'title')).toHaveLength(1);
    expect(ihlaller('<p>Tabloyu gör \u{1F4CA}</p>', 'emoji')).toHaveLength(1);
    expect(ihlaller('<rect width="NaN"></rect>', 'NaN')).toHaveLength(1);
    expect(ihlaller('<div class="bg-card/98"></div>', 'saydam')).toHaveLength(1);
    // Kod adları (sınıf, data-*) ve "Model", "Modu", "Tepe değer", "Ortanca", "Sıklık" serbest
    expect(ihlaller('<div class="frekans-tablosu" data-mod="1" data-oms=""><p>Model · Sütun modu · Tepe değer · Ortanca · Sıklık · Ort. mutlak sapma</p></div>', 'serbest')).toEqual([]);
  });
});

// ── 16 örnek × 6 sekme ───────────────────────────────────────────────────────────────────────────────────────

describe('bütünlük: 16 örnek × 6 sekme (uygulama kökü, sunucu çizimi)', () => {
  it('16 örnek ve 6 sekme var (Nokta, Sütun, Çizgi, Daire, Saçılım, İstatistik)', () => {
    expect(ORNEK_VERILER).toHaveLength(16);
    expect(SEKMELER.map((s) => s.ad)).toEqual(['Nokta', 'Sütun', 'Çizgi', 'Daire', 'Saçılım', 'İstatistik']);
  });

  it('her örnek her sekmede (açılış görünümü; ölçüler + adımlar + şerit; sütun modu): NaN / undefined / Infinity, eski terim, emoji, bg-card/ yok', () => {
    const hatalar: string[] = [];
    let cizim = 0;
    for (const o of ORNEK_VERILER) {
      const yuklu = ornegiYukle(baslangicDurumu(), o.id)!.durum;
      for (const sekme of SEKME_IDLERI) {
        const cesitler: [string, Durum, typeof GENIS?][] = [
          ['açılış', { ...yuklu, sekme }],
          ['açılış dar', { ...yuklu, sekme }, DAR],
          [
            'ölçüler',
            { ...yuklu, sekme, ipucu: 'serit', adimlariGoster: true, degerleriGoster: true, secenekler: { ortalama: true, oms: true, etiketler: true, ortanca: true } },
          ],
        ];
        if (sekme === 'nokta') cesitler.push(['sütun modu', { ...yuklu, sekme, sutunModu: true, ipucu: 'kapali', secenekler: { ortalama: true, oms: true, etiketler: true, ortanca: true } }]);
        for (const [ad, d, boyut] of cesitler) {
          const html = uygulamaCiz(d, boyut);
          cizim++;
          expect(html, `${o.id} ${sekme} ${ad}`).toContain('data-uygulama="veri-grafik"');
          // Sekme kapısından geçen her sekmede grafik alanı dolu (svg ya da İstatistik kartı)
          if (sekme === d.sekme && sekmeAcik(html, sekme)) expect(grafikDolu(html), `${o.id} ${sekme} ${ad}`).toBe(true);
          hatalar.push(...ihlaller(html, `${o.id} · ${sekme} · ${ad}`));
        }
      }
    }
    expect(cizim).toBe(16 * 6 * 3 + 16);
    expect(hatalar).toEqual([]);
  });

  it('tarama gerçekten çizilen içeriği kapsar: ölçü yazıları, hesaplama adımları, Keşif kartı ve tablo çıktıda', () => {
    const boy = ornegiYukle(baslangicDurumu(), 'boy')!.durum;
    const olculer = { ortalama: true, oms: true, etiketler: true, ortanca: true };
    const nokta = okunanMetin(uygulamaCiz({ ...boy, sekme: 'nokta', ipucu: 'serit', secenekler: olculer }));
    expect(nokta).toMatch(/Ortalama = /);
    expect(nokta).toMatch(/Ort\. mutlak sapma = /);
    expect(nokta).toMatch(/Ortanca/);
    expect(nokta).toContain(ORNEK_VERILER.find((o) => o.id === 'boy')!.hikaye.arastirmaSorusu);
    const ist = okunanMetin(uygulamaCiz({ ...boy, sekme: 'istatistik', adimlariGoster: true }));
    expect(ist).toMatch(/Aritmetik ortalama/);
    expect(ist).toMatch(/Ortalamaya uzaklık/);
    expect(uygulamaCiz(boy)).toContain('data-kesif-karti="boy"');
  });

  it('başka ölçülerde (1366 × 560, 760 × 420, 480 × 320) açılış örneği her sekmede temiz', () => {
    const hatalar: string[] = [];
    const yuklu = ornegiYukle(baslangicDurumu(), 'boy')!.durum;
    for (const b of [{ genislik: 1366, yukseklik: 560 }, { genislik: 760, yukseklik: 420 }, { genislik: 480, yukseklik: 320 }])
      for (const sekme of SEKME_IDLERI) hatalar.push(...ihlaller(uygulamaCiz({ ...yuklu, sekme }, b), `boy · ${sekme} · ${b.genislik}`));
    expect(hatalar).toEqual([]);
  });
});

// ── Veri topla paneli ────────────────────────────────────────────────────────────────────────────────────────

describe('bütünlük: "Veri topla" paneli (uygulama kökü, sunucu çizimi)', () => {
  it('"Ne araştıralım?": 18 hazır soru kartı, üç yöntem grubu; adım yolu yok; temiz', () => {
    const html = uygulamaCiz({ ...baslangicDurumu(), toplamaAcik: true });
    expect(html).toContain('data-veri-topla-paneli="" data-gorunum="baslangic"');
    expect(html.match(/data-hazir-soru="/g)).toHaveLength(HAZIR_SORULAR.length);
    expect(HAZIR_SORULAR).toHaveLength(18);
    expect(html).not.toMatch(/data-adim-yolu|Soru · Plan · Topla/);
    expect(ihlaller(html, 'başlangıç')).toEqual([]);
  });

  it('"Kendi sorunu yaz" formu üç yöntemde temiz', () => {
    const hatalar: string[] = [];
    for (const yontem of TOPLAMA_YONTEMLERI) {
      const a: Arastirma = { ...varsayilanArastirma(), soru: 'Sınıfımızda kaç kardeşimiz var?', yontem, adim: 'plan' };
      const html = uygulamaCiz({ ...baslangicDurumu(), toplamaAcik: true, arastirma: a });
      expect(html, yontem).toContain('data-gorunum="form"');
      hatalar.push(...ihlaller(html, `form · ${yontem}`));
    }
    expect(hatalar).toEqual([]);
  });

  it('18 hazır soru: Topla görünümü boş ve veriyle, her sekmede; panel açıkken soru şeridi yok; temiz', () => {
    const hatalar: string[] = [];
    for (const h of HAZIR_SORULAR) {
      for (const n of [0, 12]) {
        const d = hazirSoruDurumu(h.id, n);
        for (const sekme of n === 0 ? (['nokta'] as Sekme[]) : SEKME_IDLERI) {
          const html = uygulamaCiz({ ...d, sekme });
          expect(html, h.id).toContain('data-veri-topla-paneli');
          expect(html, h.id).not.toContain('data-soru-seridi');
          // Planı doğrudan uygulanan hazır sorular Topla görünümünde; veri eklenince sayım n'yi gösterir
          if (d.arastirma?.sutunlar) {
            expect(html, h.id).toContain('data-gorunum="topla"');
            if (n > 0) expect(sayim(html), h.id).toMatch(new RegExp(`^${n} `));
          }
          hatalar.push(...ihlaller(html, `${h.id} · ${n} veri · ${sekme}`));
        }
      }
    }
    expect(hatalar).toEqual([]);
  });

  it('Deney özeti (iki deney: 20 ve 50 atış) her sekmede ve panel kapandıktan sonra soru şeridiyle temiz', () => {
    const hatalar: string[] = [];
    for (const id of HAZIR_SORULAR.filter((h) => h.yontem === 'deney').map((h) => h.id)) {
      let d = planiUygula(baslangicDurumu(), hazirSoruUygula(id)!).durum;
      if (!d.arastirma?.sutunlar) continue;
      d = deneyEkle(deneyEkle(d, 1, 20), 2, 50);
      const ozet = { ...ozeteGec({ ...d, toplamaAcik: true }), toplamaAcik: true };
      expect(ozet.etkinKume, id).toBe('ozet');
      for (const sekme of SEKME_IDLERI) hatalar.push(...ihlaller(uygulamaCiz({ ...ozet, sekme }), `${id} · özet · ${sekme}`));
      const kapali = toplamaKapat(ozet).durum;
      const html = uygulamaCiz(kapali);
      expect(html, id).toContain('data-soru-seridi');
      expect(html, id).not.toContain('data-veri-topla-paneli');
      hatalar.push(...ihlaller(html, `${id} · kapalı`));
    }
    expect(hatalar).toEqual([]);
  });

  it('eski örnekleyici kaydı (deney kümesi açık, Saçılım) göçle açılır; eski adlar ve terimler yok', () => {
    const eski = {
      ...JSON.parse(JSON.stringify(baslangicDurumu())),
      sekme: 'sacilim',
      etkinKume: 'deney',
      deneyTablosu: {
        sutunlar: [
          { id: 'vg-cekilis', ad: 'Çekiliş', tur: 'etiket' },
          { id: 'vg-ay-para', ad: 'Sonuç', tur: 'etiket' },
        ],
        satirlar: ['Yazı', 'Tura', 'Tura'].map((s, i) => ({ id: `e${i}`, hucreler: [String(i + 1), s] })),
      },
      ornekleyiciAcik: true,
    };
    const html = uygulamaCiz(JSON.stringify(eski));
    expect(html).toContain('data-veri-topla-paneli');
    expect(html).not.toContain('data-ornekleyici');
    expect(ihlaller(html, 'göç')).toEqual([]);
  });
});

// ── [i] öğretmen kartı ve Keşif kartı ────────────────────────────────────────────────────────────────────────

describe('bütünlük: [i] öğretmen kartı ve Keşif kartı', () => {
  it('18 hazır soru × 3 bölüm (Etkinlik, Düzenle, Yorumla), boş ve veriyle: temiz; yorum cümleleri kapalı başlar', () => {
    const hatalar: string[] = [];
    const bolumler: OgretmenBolumu[] = ['etkinlik', 'duzenle', 'yorum'];
    for (const h of HAZIR_SORULAR) {
      for (const n of [0, 12]) {
        const d = hazirSoruDurumu(h.id, n);
        const a = d.arastirma;
        if (!a) continue;
        for (const bolum of bolumler) {
          const html = renderToStaticMarkup(
            <OgretmenKarti
              arastirma={a}
              tablo={d.tablo}
              sekme={d.sekme}
              bolum={bolum}
              onBolum={bos}
              onKapat={bos}
              onArastirma={bos}
              onTabloIslemi={bos}
              onSatirGoster={bos}
              onSekme={bos}
              onOzeteGec={bos}
              onPlaniDegistir={bos}
              onYeniArastirma={bos}
            />,
          );
          if (bolum === 'yorum') expect(html, h.id).not.toContain('data-yorum-cumleleri');
          hatalar.push(...ihlaller(html, `[i] ${h.id} · ${n} veri · ${bolum}`));
        }
      }
    }
    expect(hatalar).toEqual([]);
  });

  it('Keşif kartı ve şeridi 16 örnek × 6 sekme × 4 adım temiz; kaynak bağlantıları yalnız resmî kurumlara (MEB, MGM, TÜİK, WHO)', () => {
    const hatalar: string[] = [];
    const baglantilar = new Set<string>();
    for (const o of ORNEK_VERILER)
      for (const sekme of SEKME_IDLERI)
        for (const gorunum of ['serit', 'kart'] as const)
          for (const ilkAdim of gorunum === 'kart' ? [0, 1, 2, 3] : [0]) {
            const html = renderToStaticMarkup(
              <KesifKarti ornek={o} sekme={sekme} ozellikler={HEPSI} gorunum={gorunum} ilkAdim={ilkAdim} onGorunum={bos} onKapat={bos} onEylem={bos} yukseklikSiniri={400} />,
            );
            for (const m of html.matchAll(/href="([^"]*)"/g)) baglantilar.add(coz(m[1]));
            hatalar.push(...ihlaller(html, `Keşif ${o.id} · ${sekme} · ${gorunum} ${ilkAdim + 1}`));
          }
    expect(hatalar).toEqual([]);
    for (const b of baglantilar) expect(new URL(b).hostname, b).toMatch(/(^|\.)(meb\.gov\.tr|mgm\.gov\.tr|tuik\.gov\.tr|who\.int)$/);
  });
});

// ── Kaynak taraması ──────────────────────────────────────────────────────────────────────────────────────────

/** vg/ altındaki kaynak dosyaları (testler hariç; göreli yol → içerik) */
function kaynaklar(): Map<string, string> {
  const sonuc = new Map<string, string>();
  const gez = (klasor: string) => {
    for (const g of fs.readdirSync(klasor, { withFileTypes: true })) {
      const tam = path.join(klasor, g.name);
      if (g.isDirectory()) {
        if (g.name !== '__tests__') gez(tam);
      } else if (/\.(ts|tsx)$/.test(g.name)) sonuc.set(path.relative(VG, tam).replace(/\\/g, '/'), fs.readFileSync(tam, 'utf8'));
    }
  };
  gez(VG);
  return sonuc;
}

describe('bütünlük: vg/ kaynakları (fs)', () => {
  const dosyalar = kaynaklar();

  it('kaynaklar okundu (kabuk, grafikler ve toplama/ panelleri)', () => {
    for (const d of ['index.tsx', 'durum.ts', 'veri.ts', 'toplama/VeriToplaPaneli.tsx', 'toplama/OgretmenKarti.tsx']) expect(dosyalar.has(d), d).toBe(true);
    expect(dosyalar.size).toBeGreaterThan(40);
  });

  it('eski örnekleyici paneli yok: OrnekleyiciPaneli.tsx silinmiş, hiçbir dosya (testler dahil) onu içe aktarmıyor', () => {
    expect(fs.existsSync(path.join(VG, 'OrnekleyiciPaneli.tsx'))).toBe(false);
    const testler = fs.readdirSync(path.join(VG, '__tests__')).filter((f) => /\.(ts|tsx)$/.test(f) && f !== 'butunluk.test.tsx');
    const hepsi = [...dosyalar].concat(testler.map((f) => [`__tests__/${f}`, fs.readFileSync(path.join(VG, '__tests__', f), 'utf8')] as [string, string]));
    const aktaran = hepsi.filter(([, m]) => /from\s+['"][^'"]*OrnekleyiciPaneli['"]|import\(\s*['"][^'"]*OrnekleyiciPaneli/.test(m)).map(([d]) => d);
    expect(aktaran).toEqual([]);
  });

  it('bayrak anahtarı (geoeba_veri-grafik_toplama-v2), AdimYolu ve AdimNotu kaynaklarda geçmez', () => {
    const bulunan: string[] = [];
    for (const [d, m] of dosyalar) {
      if (/toplama-v2/.test(m)) bulunan.push(`${d}: bayrak anahtarı`);
      if (/\bAdimYolu\b/.test(m)) bulunan.push(`${d}: AdimYolu`);
      if (/\bAdimNotu\b/.test(m)) bulunan.push(`${d}: AdimNotu`);
    }
    expect(bulunan).toEqual([]);
    for (const d of ['AdimYolu.tsx', 'AdimNotu.tsx']) expect(fs.existsSync(path.join(VG, 'toplama', d)), d).toBe(false);
  });

  it('sendika verisi yok: turkis / TÜRK-İŞ / DİSK / Hak-İş / sendika hiçbir kaynakta (örnekler, hazır sorular, notlar, bağlantılar) geçmez', () => {
    const desen = /turkis(?!h)|türk-iş|turk-is|t[üu]rk-[iİı][sş]|\bDİSK\b|hak-iş|hakis\.org|disk\.org|sendika/iu;
    const bulunan = [...dosyalar].filter(([, m]) => desen.test(m)).map(([d, m]) => `${d}: ${m.match(desen)![0]}`);
    expect(bulunan).toEqual([]);
  });
});
