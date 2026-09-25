/**
 * Veri topla paneli — arayüzün saf yardımcıları (React'siz; testlerde doğrudan denenir).
 *
 * §0 sadeleştirme kararı: panelin iki görünümü vardır — "Ne araştıralım?" (başlangıç: hazır sorular + "Kendi sorunu
 * yaz" formu) ve "Topla" (görev metni, yönteme özgü iş yüzeyi, alt çubuk). Düzenle ve Yorumla içerikleri, kazanım
 * rozetleri, tahmin ve öğretmen notu yalnız [i] öğretmen kartındadır. Bu modül görünüm seçimini, kutucuk ve sayaç
 * verisini, son atış yuvasını, geri alma yedeğini ve öğretmen kartının metinlerini hesaplar.
 */
import {
  adimNotu,
  anketSayisalMi,
  anketSecenekleri,
  hazirBaglami,
  hazirSoruUygula,
  kazanimKodlari,
  kodRozeti,
  planSorusu,
  planSutunAdi,
  secenekSayilari,
  tumceIciAdi,
  type Arastirma,
  type DeneyCalismasi,
  type DeneyPlani,
} from '../arastirma';
import {
  calismaSatirlari,
  deneySikliklari,
  etkinIzlenen,
  fiil,
  fiilBulunma,
  izlenenRolu,
  siraliCalismalar,
  sonucDegerleri,
  sonucRolleri,
  sonucSayisalMi,
  teorikOlasiliklar,
} from '../deney';
import { kategoriRengi } from '../kategorik';
import type { VeriTablosu } from '../veri';
import type { Kutucuk } from './SecenekKutucuklari';
import type { SayacSonucu } from './CanliSayac';

// ── Görünüm ───────────────────────────────────────────────────────────────────

export type PanelGorunumu = 'baslangic' | 'form' | 'topla';

/**
 * Panelin görünümü: açık bir form taslağı varsa form; araştırma Tablom'a bağlı ve toplama adımlarından birindeyse
 * (Topla, Düzenle, Yorumla — eski modelin adımları) Topla; öteki bütün durumlarda "Ne araştıralım?".
 */
export function panelGorunumu(a: Arastirma | null, bagli: boolean, taslakVar: boolean): PanelGorunumu {
  if (taslakVar) return 'form';
  if (a && bagli && (a.adim === 'topla' || a.adim === 'duzenle' || a.adim === 'yorum')) return 'topla';
  return 'baslangic';
}

/** Planın özü (soru, yöntem ve yönteme özgü plan alanları; kimlik, kayıt kipi ve hız sayılmaz) */
function planOzu(a: Arastirma): string {
  const y = a.yontem;
  const g = (x: { secenekler: string[] } | null) => (x ? x.secenekler.map((s) => s.trim()) : null);
  const o =
    y === 'anket'
      ? [a.anket.degiskenAdi.trim(), anketSecenekleri(a), g(a.anket.grup)]
      : y === 'olcum'
        ? [a.olcum.degiskenAdi.trim(), a.olcum.birim.trim(), a.olcum.duyarlik, a.olcum.beklenen, a.olcum.adYaz, g(a.olcum.grup)]
        : y === 'deney'
          ? [
              a.deney.nesne,
              a.deney.atisSayisi,
              a.deney.izlenen,
              a.deney.nesne === 'torba' ? [a.deney.torba.geriAt, a.deney.torba.toplar.map((t) => [t.etiket.trim(), t.adet])] : null,
              a.deney.nesne === 'cark' ? [a.deney.cark.degiskenAdi.trim(), a.deney.cark.dilimler.map((x) => [x.etiket.trim(), x.yuzde])] : null,
            ]
          : null;
  return JSON.stringify([a.soru.trim(), y, o]);
}

/**
 * Araştırmanın planı, hazır sorusunun varsayılan planıyla aynı mı (soru, yöntem, seçenekler, nesne …). "Ne araştıralım?"
 * listesinde bağsız son araştırma böyle bir plansa ayrı "Son araştırma" kartı yinelenmez; hazır kart "Son" işaretini
 * taşır (karta dokunmak aynı planı yeniden başlatır). Plan değiştirildiyse (ör. aday adları yazıldı) false.
 */
export function hazirPlaniDegismedi(a: Arastirma): boolean {
  const h = a.hazirId ? hazirSoruUygula(a.hazirId) : null;
  return h !== null && planOzu(h) === planOzu(a);
}

/** Kayıttan gelen, uygulanmamış plan taslağı (ör. aday adları yazılacak hazır soru): panel formla açılır */
export function kayitliTaslak(a: Arastirma | null, bagli: boolean): Arastirma | null {
  return a && !bagli && a.adim === 'plan' && a.sutunlar === null && a.yontem !== null ? a : null;
}

/**
 * Taslak bağlı araştırmanın devamı mı ("Toplamaya devam et"): aynı kimlik, Tablom'a bağlı, yöntem (ve deneyde nesne)
 * aynı. `toplamaDurumu.planaDevamMi` ile aynı kural (durum olmadan).
 */
export function taslakDevamMi(taslak: Arastirma, a: Arastirma | null, bagli: boolean): boolean {
  return (
    a !== null &&
    bagli &&
    taslak.kimlik === a.kimlik &&
    taslak.sutunlar !== null &&
    taslak.yontem === a.yontem &&
    (taslak.yontem !== 'deney' || taslak.deney.nesne === a.deney.nesne)
  );
}

/** Görev metni (Topla başlığı): araştırma sorusu; soru yazılmamışsa plandan kurulan soru ("Boy kaç cm?") */
export function gorevMetni(a: Arastirma): string {
  const soru = a.soru.trim();
  if (soru) return soru;
  return planSorusu(a) || 'Araştırma';
}

// ── Renkler, kutucuklar ve sayaç ─────────────────────────────────────────────

/** Sayısal sonuçların (sayı küpü, sayısal anket) tek rengi: deniz; "renk = kategori" kuralı bozulmaz */
export const SAYISAL_RENK = '#216a78';

/**
 * Deney sonuçlarının renkleri (izlenen sütunun değerleri, nesnedeki sırayla): grafik, tablo şeridi, kutucuk ve sahne
 * aynı rengi taşır (`kategoriRengi(değer, sıra)`); sayı küplerinde tek renk.
 */
export function sonucRenkleri(d: DeneyPlani): Map<string, string> {
  const sayisal = sonucSayisalMi(d.nesne);
  return new Map(sonucDegerleri(d).map((v, i) => [v, sayisal ? SAYISAL_RENK : kategoriRengi(v, i)]));
}

/**
 * Etiket listesinin renkleri (düzenleyicideki satırlar, sahnedeki dilim ve toplar): her etiket, yinelenmeyen boş olmayan
 * etiketler arasındaki sırasıyla `kategoriRengi` alır — `sonucRenkleri` ve grafikteki renk anahtarıyla aynı. Boş
 * etiket gri.
 */
export function etiketRenkleri(etiketler: readonly string[]): string[] {
  const sira: string[] = [];
  return etiketler.map((e) => {
    const t = e.trim();
    if (!t) return BOS_ETIKET_RENGI;
    let k = sira.indexOf(t);
    if (k < 0) {
      sira.push(t);
      k = sira.length - 1;
    }
    return kategoriRengi(t, k);
  });
}

/** Adı yazılmamış dilim ya da renk */
export const BOS_ETIKET_RENGI = '#6f7c8c';

/** Rengin yedeği (listede olmayan yazım): paletin sıradaki rengi */
function renkBul(renkler: Map<string, string>, deger: string, yedekSira: number): string {
  return renkler.get(deger) ?? kategoriRengi(deger, yedekSira);
}

/**
 * Anket kutucukları: plan seçenekleri sırasıyla ad, sayı ve renk (kategorik ankette `kategoriRengi(seçenek, sıra)`,
 * sayısal ankette tek renk); gruplu ankette sağ altta "6-A 4 · 6-B 3".
 */
export function anketKutucuklari(tablo: VeriTablosu, a: Arastirma): Kutucuk[] {
  const sayim = secenekSayilari(tablo, a);
  const sayisal = anketSayisalMi(a);
  return sayim.satirlar.map((s, i) => ({
    etiket: s.secenek,
    sayi: s.sayi,
    renk: sayisal ? SAYISAL_RENK : kategoriRengi(s.secenek, i),
    grupMetni: sayim.gruplar.length > 0 ? sayim.gruplar.map((g, k) => `${g} ${s.gruplar[k] ?? 0}`).join(' · ') : null,
  }));
}

/** Deneyin hangi çalışması sayılır: sayı (0 = gerçek atışlar), 'tumu' ya da hiçbiri (-1: sıfırlar) */
export type SayimSecimi = number | 'tumu';

/** Elle kaydet kutucukları: gerçek atışların sonuç sıklıkları (nesnedeki sırayla) */
export function deneyKutucuklari(tablo: VeriTablosu, a: Arastirma): Kutucuk[] {
  const renkler = sonucRenkleri(a.deney);
  const gercekVar = a.deney.calismalar.some((c) => c.gercek);
  const { satirlar } = deneySikliklari(tablo, a, gercekVar ? 0 : -1);
  const degerler = sonucDegerleri(a.deney);
  const teorik = teorikOlasiliklar(a.deney);
  return degerler.map((v, i) => ({
    etiket: v,
    sayi: satirlar.find((s) => s.deger === v)?.sayi ?? 0,
    renk: renkBul(renkler, v, i),
    oran: teorik.find((t) => t.deger === v)?.olasilik ?? null,
  }));
}

/** Kutucuk biçimi: para yüzü, zar yüzü, çark dilimi ya da renk topu (torba) */
export function kutucukBicimi(d: DeneyPlani): 'para' | 'zar' | 'dilim' | 'renk' {
  if (d.nesne === 'para') return 'para';
  if (d.nesne === 'zar') return 'zar';
  if (d.nesne === 'cark') return 'dilim';
  return 'renk';
}

/** Sayaçta gösterilecek çalışma: sürmekte olan, yoksa son simülasyon; hiç simülasyon yoksa -1 (sıfırlar) */
export function sayacCalismasi(a: Arastirma, aktif: number | null): number {
  if (aktif !== null) return aktif;
  const sim = a.deney.calismalar.filter((c) => !c.gercek);
  return sim.length > 0 ? sim.reduce((m, c) => Math.max(m, c.no), 0) : -1;
}

/** Canlı sayacın sonuçları (izlenen sütunun değerleri): sayı, renk ve teorik olasılık */
export function sayacSonuclari(tablo: VeriTablosu, a: Arastirma, secim: SayimSecimi): { n: number; sonuclar: SayacSonucu[] } {
  const renkler = sonucRenkleri(a.deney);
  const s = deneySikliklari(tablo, a, secim);
  return {
    n: s.n,
    sonuclar: s.satirlar.map((x, i) => ({ etiket: x.deger, sayi: x.sayi, renk: renkBul(renkler, x.deger, i), teorik: x.teorik })),
  };
}

/** Çekilişin sahnedeki / yuvadaki metni: tek sonuçta değer; iki küpte "2 + 5 = 7" */
export function sonucMetni(d: DeneyPlani, degerler: readonly string[]): string {
  if (d.nesne === 'iki-zar' && degerler.length >= 3) return `${degerler[0]} + ${degerler[1]} = ${degerler[2]}`;
  return degerler[0] ?? '';
}

/** Çekilişin izlenen sütundaki değeri (iki küpte toplam) */
export function izlenenDegeri(d: DeneyPlani, degerler: readonly string[]): string {
  const i = sonucRolleri(d.nesne).indexOf(izlenenRolu(d.nesne));
  return degerler[i] ?? '';
}

/**
 * Son atış yuvası, Tablom'dan: çalışmanın son satırı ve sırası. Çalışma tabloya yazılmadıysa (500 ve üstü) ya da
 * satırları belirlenemiyorsa null (yuvayı o anda çalıştırıcı doldurur).
 */
export function sonAtisBilgisi(tablo: VeriTablosu, a: Arastirma, no: number): { degerler: string[]; sira: number } | null {
  const c = a.deney.calismalar.find((x) => (no === 0 ? x.gercek : !x.gercek && x.no === no));
  if (!c) return null;
  const satirlar = calismaSatirlari(tablo, a, c);
  if (!satirlar || satirlar.length === 0) return null;
  const son = tablo.satirlar[satirlar[satirlar.length - 1]];
  const degerler = sonucRolleri(a.deney.nesne).map((rol) => {
    const id = a.sutunlar?.[rol];
    const j = id ? tablo.sutunlar.findIndex((s) => s.id === id) : -1;
    return j >= 0 ? (son.hucreler[j] ?? '').trim() : '';
  });
  return { degerler, sira: satirlar.length };
}

/** Sahne kartının durum satırı (dururken): son simülasyonun etiketi ("2. deney (50)"); yoksa null */
export function sonDeneyEtiketi(a: Arastirma): string | null {
  const sim = siraliCalismalar(a.deney.calismalar).filter((c) => !c.gercek);
  return sim.length > 0 ? sim[sim.length - 1].etiket : null;
}

// ── Geri al ───────────────────────────────────────────────────────────────────

/** Panel içi geri alma kaydı: eklenen satırların kimlikleri ya da bütün bir deney çalışması */
export type GeriAlKaydi = { tur: 'satirlar'; kimlikler: string[] } | { tur: 'calisma'; no: number };

/** Alt çubuktaki "Geri al" düğmesinin başlığı: "Son cevabı geri al" · "Son ölçümü …" · "Son deneyi …" · "Son atışı …" */
export function geriAlBasligi(a: Arastirma): string {
  if (a.yontem === 'anket') return 'Son cevabı geri al';
  if (a.yontem === 'olcum') return 'Son ölçümü geri al';
  if (a.deney.kayit === 'gercek') {
    const f = fiil(a.deney.nesne);
    return `Son ${f === 'atış' ? 'atışı' : f === 'çevirme' ? 'çevirmeyi' : 'çekişi'} geri al`;
  }
  return 'Son deneyi geri al';
}

/**
 * Panelin geri alma yığını boşken (panel yeniden açıldı) ne geri alınır: anket ve ölçümde tablonun son satırı; gerçek
 * atışlarda gerçek çalışmanın son satırı; simülasyonda en son başlatılan çalışmanın tamamı. Geri alınacak yoksa null.
 */
export function yedekGeriAl(tablo: VeriTablosu, a: Arastirma): GeriAlKaydi | null {
  if (a.yontem === 'anket' || a.yontem === 'olcum') {
    const son = tablo.satirlar[tablo.satirlar.length - 1];
    return son ? { tur: 'satirlar', kimlikler: [son.id] } : null;
  }
  if (a.yontem !== 'deney') return null;
  if (a.deney.kayit === 'gercek') {
    const g = a.deney.calismalar.find((c) => c.gercek);
    const satirlar = g ? calismaSatirlari(tablo, a, g) : null;
    const son = satirlar && satirlar.length > 0 ? tablo.satirlar[satirlar[satirlar.length - 1]] : undefined;
    return son ? { tur: 'satirlar', kimlikler: [son.id] } : null;
  }
  const sim = a.deney.calismalar.filter((c) => !c.gercek);
  if (sim.length === 0) return null;
  return { tur: 'calisma', no: sim[sim.length - 1].no };
}

/** Geri alma kaydı hâlâ geçerli mi (satırlardan biri tabloda ya da çalışma kayıtlı) */
export function geriAlGecerli(k: GeriAlKaydi, tablo: VeriTablosu, a: Arastirma): boolean {
  if (k.tur === 'calisma') return a.deney.calismalar.some((c: DeneyCalismasi) => !c.gercek && c.no === k.no);
  const idler = new Set(k.kimlikler);
  return tablo.satirlar.some((r) => idler.has(r.id));
}

// ── Öğretmen kartı ────────────────────────────────────────────────────────────

const KAZANIM_KONULARI: Record<string, string> = {
  '5.5.1': '5. sınıf · İstatistiksel araştırma süreci',
  '6.5.1': '6. sınıf · İstatistiksel araştırma süreci',
  '6.6.1': '6. sınıf · Veriden olasılığa',
  '7.6.1': '7. sınıf · İstatistiksel araştırma süreci',
  '7.7.1': '7. sınıf · Veriden olasılığa',
  '8.6.1': '8. sınıf · İstatistiksel araştırma süreci',
  '8.7.1': '8. sınıf · Veriden olasılığa',
};

/** "MAT.7.7.1 · 8.7.1" → "7. sınıf · Veriden olasılığa; 8. sınıf · Veriden olasılığa" (bilinmeyen kod atlanır) */
export function rozetBasligi(rozet: string): string {
  const kodlar = Array.from(rozet.matchAll(/(\d)\.(\d)\.(\d)/g)).map((m) => `${m[1]}.${m[2]}.${m[3]}`);
  return [...new Set(kodlar.map((k) => KAZANIM_KONULARI[k]).filter((k): k is string => !!k))].join('; ');
}

export interface KazanimSatiri {
  /** "MAT.6.6.1" · "MAT.7.7.1 · 8.7.1" · "Zenginleştirme" */
  rozet: string;
  /** "Planlama · Veri toplama · Yorumlama" · "Deney özeti ve seri" */
  yer: string;
  /** kazanım konusu (rozet title'ı) */
  konu: string;
}

/**
 * Öğretmen kartındaki kazanım satırları (VT §2.2, §12.3). Adımların rozetleri (`adimNotu`: hazır soruda sorunun kendi
 * kodu, kendi sorumuzda yöntemin varsayılanları) koda ayrılır; her kod TEK satırda yazılır ve geçtiği yerler
 * birleşir: "MAT.5.5.1 — Planlama · Veri toplama · Veriyi düzenleme · Yorumlama", "MAT.8.6.1 — Planlama". Aynı yerlerde
 * geçen kodlar tek rozette kalır: deneyde "MAT.7.7.1 · 8.7.1 — Deney özeti ve seri". Kodu olmayan hazır soru
 * (iki sayı küpü) "Zenginleştirme" satırı taşır.
 */
export function kazanimSatirlari(a: Arastirma): KazanimSatiri[] {
  const yerler: [string, string][] = [
    [adimNotu(a, 'plan').rozet, 'Planlama'],
    [adimNotu(a, 'topla').rozet, 'Veri toplama'],
    [adimNotu(a, 'duzenle').rozet, a.yontem === 'deney' ? 'Deney özeti ve seri' : 'Veriyi düzenleme'],
    [adimNotu(a, 'yorum').rozet, 'Yorumlama'],
  ];
  // Kod → geçtiği yerler (adım sırasıyla)
  const kodYerleri = new Map<string, string[]>();
  for (const [rozet, yer] of yerler) {
    const kodlar = kazanimKodlari(rozet);
    for (const k of kodlar.length > 0 ? kodlar : [rozet]) {
      const l = kodYerleri.get(k) ?? [];
      if (!l.includes(yer)) l.push(yer);
      kodYerleri.set(k, l);
    }
  }
  // Aynı yerlerde geçen kodlar tek satır
  const satirlar: { kodlar: string[]; yerler: string[] }[] = [];
  for (const [kod, yl] of kodYerleri) {
    const s = satirlar.find((x) => x.yerler.join('|') === yl.join('|') && /^\d/.test(kod) && /^\d/.test(x.kodlar[0]));
    if (s) s.kodlar.push(kod);
    else satirlar.push({ kodlar: [kod], yerler: yl });
  }
  const sinif = hazirBaglami(a)?.rozet.split('·')[0]?.trim() ?? '';
  return satirlar.map(({ kodlar, yerler: yl }) => {
    const kodlu = /^\d/.test(kodlar[0]);
    const rozet = kodlu ? kodRozeti(kodlar) : kodlar[0];
    return { rozet, yer: yl.join(' · '), konu: kodlu ? rozetBasligi(rozet) : `${sinif ? `${sinif} · ` : ''}Programın dışında (zenginleştirme)` };
  });
}

/** "Bu etkinlik ne öğretir" notu (hazır sorunun kendi notu; yoksa yönteme göre; §6 sözlüğüyle) */
export function etkinlikNotu(a: Arastirma): string {
  const h = hazirBaglami(a);
  if (h?.etkinlik) return h.etkinlik;
  if (a.yontem === 'olcum')
    return 'Her ölçüm tabloya bir satır, nokta grafiğine bir nokta olur. Veri çoğaldıkça aritmetik ortalamanın nasıl kaydığını ve değerlerin ortalamadan ne kadar uzaklaştığını (ortalama mutlak sapma) birlikte izleriz.';
  if (a.yontem === 'deney')
    return `Her ${fiil(a.deney.nesne)} tabloya bir satır, grafiğe bir nokta olur. Önce az, sonra çok ${fiil(a.deney.nesne)} yapıp göreli sıklığın teorik olasılığa nasıl yaklaştığını görürüz.`;
  return 'Her cevap tabloya bir satır, grafiğe bir nokta olur. Ham veriden çeteleye, sıklık tablosuna ve grafiğe geçmeyi, sonra grafiği yorumlamayı öğreniriz.';
}

/** Öğretmen notu (sınıfta nasıl kullanılır; hazır sorunun kendi notu varsa o) */
export function ogretmenNotu(a: Arastirma): string {
  const h = hazirBaglami(a);
  if (h?.ogretmenNotu) return h.ogretmenNotu;
  if (a.yontem === 'olcum')
    return 'Ölçmeden önce ölçme yöntemini birlikte kararlaştırın (ör. nabız 1 dakika sayılır). Seçenek şeridinden “Ortalama”yı açın; her yeni değerle ortalama çizgisinin kaydığını gösterin. Ötekilerden çok uzak bir değer çıkarsa önce ölçüm hatası olup olmadığını konuşun.';
  if (a.yontem === 'deney')
    return 'Önce sınıfta gerçek nesneyle deneyip “Elle kaydet” ile yazın; sonra “Bilgisayar atsın” ile aynı deneyi tekrarlayın. “Atış sayısı artınca ne olur?” düğmesi deneyi 20’den 2000’e kadar yapar ve Deney özetini Çizgi grafiğinde gösterir.';
  return 'Öğrenciler sırayla tahtaya gelip kendi cevabına dokunsun. Veri toplanırken tahmin ettiğiniz seçeneği hatırlayın; bitince grafiği “Sütunlara dönüştür” ile sütun grafiğine çevirip sıklık tablosuyla karşılaştırın.';
}

export type TahminAlani =
  | { tur: 'secenek'; secenekler: string[] }
  | { tur: 'sayi'; on: string; son: string; yerTutucu: string };

/**
 * "Önce tahmin edin" alanı: ankette seçenek çipleri; ölçümde "Ortalama yaklaşık [ ] cm"; deneyde
 * "20 atışta [ ] kez tura" (iki küpte "toplam 7"); simülasyonda bağlamıyla: "20 kişide [ ] “evet”", "10 penaltıda [ ] gol".
 */
export function tahminAlani(a: Arastirma): TahminAlani {
  if (a.yontem === 'anket') return { tur: 'secenek', secenekler: anketSecenekleri(a) };
  if (a.yontem === 'olcum') {
    const birim = a.olcum.birim.trim();
    return { tur: 'sayi', on: 'Ortalama yaklaşık', son: birim, yerTutucu: 'Ör. 150' };
  }
  const d = a.deney;
  const sim = hazirBaglami(a)?.simulasyon;
  if (sim) return { tur: 'sayi', on: sim.bulunma(d.atisSayisi), son: sim.sayilan, yerTutucu: '?' };
  const iz = tumceIciAdi(etkinIzlenen(d));
  const ad = d.nesne === 'iki-zar' ? `toplam ${iz}` : d.nesne === 'zar' ? `${iz} sayısı` : iz;
  return { tur: 'sayi', on: `${d.atisSayisi} ${fiilBulunma(fiil(d.nesne))}`, son: `kez ${ad}`, yerTutucu: '?' };
}

// ── Plan formu ────────────────────────────────────────────────────────────────

/** Önizleme satırı: "# | Meyve | Sınıf" sütun adları (planın veri rolleri sırasıyla) */
export function onizlemeSutunlari(a: Arastirma): string[] {
  if (a.yontem === 'anket') return [planSutunAdi(a, 'cevap'), ...(a.anket.grup ? [planSutunAdi(a, 'grup')] : [])];
  if (a.yontem === 'olcum')
    return [...(a.olcum.adYaz ? [planSutunAdi(a, 'ad')] : []), planSutunAdi(a, 'deger'), ...(a.olcum.grup ? [planSutunAdi(a, 'grup')] : [])];
  if (a.yontem === 'deney') return sonucRolleri(a.deney.nesne).map((r) => planSutunAdi(a, r));
  return [];
}

/**
 * Plan uyarısı (C'nin durum bilgisi yoksa yedek): tablo doluysa ve plan yeni tablo açacaksa
 * "Başlayınca yeni tablo açılır. Şimdiki tablo (24 satır) saklanır: Örnek veri ▸ Önceki tabloya dön."
 */
export function yedekPlanUyarisi(tablo: VeriTablosu, devam: boolean): string | null {
  if (devam || tablo.satirlar.length === 0) return null;
  return `Başlayınca yeni tablo açılır. Şimdiki tablo (${tablo.satirlar.length} satır) saklanır: Örnek veri ▸ Önceki tabloya dön.`;
}

// ── Kısayollar ────────────────────────────────────────────────────────────────

export type KisayolEylemi =
  | { tur: 'geriAl' }
  | { tur: 'secenek'; indeks: number }
  | { tur: 'tus'; tus: string }
  | { tur: 'ekle' }
  | { tur: 'tekAtis' }
  | { tur: 'kos' }
  | { tur: 'durdur' };

/**
 * Panel kısayolları (yalnız odak paneldeyken; VT §6.8): Ctrl+Z geri al; ankette 1–9 k'ıncı seçenek; ölçümde rakam,
 * virgül, eksi, Backspace ve Enter; deneyde (Bilgisayar atsın) Boşluk tek atış, Enter N kez at, Escape durdur. Metin
 * alanında ve düğme üzerindeyken (Boşluk / Enter düğmenin kendisini çalıştırır) kısayol yoktur.
 */
export function kisayol(
  e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean },
  hedef: { etiket: string; yazi: boolean; dugme: boolean },
  yontem: Arastirma['yontem'],
  kayit: 'gercek' | 'simulasyon',
  calisiyor: boolean,
): KisayolEylemi | null {
  if (hedef.yazi) return null;
  const k = e.key;
  if ((e.ctrlKey || e.metaKey) && !e.altKey && (k === 'z' || k === 'Z')) return calisiyor ? null : { tur: 'geriAl' };
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (yontem === 'anket') {
    if (/^[1-9]$/.test(k)) return { tur: 'secenek', indeks: Number(k) - 1 };
    return null;
  }
  if (yontem === 'olcum') {
    if (/^[0-9]$/.test(k) || k === ',' || k === '.' || k === '-' || k === 'Backspace') return { tur: 'tus', tus: k };
    if (k === 'Enter' && !hedef.dugme) return { tur: 'ekle' };
    return null;
  }
  if (yontem === 'deney' && kayit === 'simulasyon') {
    if (k === 'Escape') return calisiyor ? { tur: 'durdur' } : null;
    if (hedef.dugme) return null;
    if (k === ' ') return calisiyor ? null : { tur: 'tekAtis' };
    if (k === 'Enter') return calisiyor ? null : { tur: 'kos' };
  }
  return null;
}
