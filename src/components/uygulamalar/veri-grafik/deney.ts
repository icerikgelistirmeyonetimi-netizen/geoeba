/**
 * Veri ve Grafik — "Veri topla" paneli, deney yöntemi (saf, React'siz).
 *
 * Beş nesne vardır: Madenî para · Sayı küpü · İki sayı küpü · Çark · Torba. Bir deneyin rastgele düzeneği
 * (`OrnekleyiciAyari`) saklanmaz; `nesneDuzenegi(a.deney)` her seferinde kararlı aygıt kimlikleriyle kurar.
 * Tek kaynak `arastirma.deney`'dir.
 *
 * Her "20 kez at" bir deney çalışmasıdır (`DeneyCalismasi`). Tabloya yazılan çalışmaların sayıları her
 * seferinde Tablom'dan yeniden hesaplanır (elle silme ve düzeltme özete yansır); tabloya yazılmayan
 * (≥ 500 atış) çalışmaların sayıları çalışmanın kendi kaydından gelir. "Deney özeti" (`ozetTablosu`)
 * bunlardan türetilen, salt okunur bir tablodur.
 *
 * İçe aktarma yönü: bu modül `arastirma.ts`'ten YALNIZ tür alır (`import type`); `arastirma.ts` ise bu
 * modülün sabitlerini ve varsayılanlarını çalışma anında kullanır. Böylece iki modül arasında döngü olmaz.
 * `durum.ts` içe aktarılmaz.
 */
import type { Arastirma, DeneyCalismasi, DeneyNesnesi, DeneyPlani, KayitKipi, SutunRolu, TorbaRengi } from './arastirma';
import { aygitKategorileri, carkOranlari, type Aygit, type OrnekleyiciAyari } from './ornekleyici';
import { kategoriler } from './kategorik';
import { kimlikUret, sayiOku, sayiYaz, type Satir, type Sutun, type VeriTablosu } from './veri';

// ── Sabitler ──────────────────────────────────────────────────────────────────

/** Nesnelerin arayüzdeki adları (sıra: Plan'daki kart sırası) */
export const NESNE_ADLARI: Readonly<Record<DeneyNesnesi, string>> = {
  para: 'Madenî para',
  zar: 'Sayı küpü',
  'iki-zar': 'İki sayı küpü',
  cark: 'Çark',
  torba: 'Torba',
};

/** Beş deney nesnesi, Plan'daki kart sırasıyla */
export const DENEY_NESNELERI: readonly DeneyNesnesi[] = Object.keys(NESNE_ADLARI) as DeneyNesnesi[];

/** Tablo en çok bu kadar satır tutar */
export const EN_COK_TABLO_SATIRI = 2000;
/** Bir deneyde en çok bu kadar atış yapılır */
export const EN_COK_ATIS = 2000;
/** Bu sayıda ve daha çok atışlık bir deney tabloya yazılmaz, yalnız Deney özetine yazılır */
export const TABLOYA_YAZMA_SINIRI = 500;
/** "Atış sayısı artınca" serisi: aynı deney sırayla bu atış sayılarıyla yapılır */
export const SERI: readonly number[] = [20, 50, 100, 200, 500, 1000, 2000];
/**
 * "KAÇ ATIŞ?" çipleri: hazır soruların bütün atış sayıları (10 penaltı, 20 para / torba / anket, 30 sayı küpü —
 * MAT.6.6.1'deki "20, 30 kez" —, 100 iki küp) bir çiptir. Hepsi tabloya yazılır (< TABLOYA_YAZMA_SINIRI): tek bir
 * deney grafiği ve tabloyu boş bırakmaz. 500, 1000 ve 2000 atış yalnız "Atış sayısı artınca ne olur?" serisindedir
 * (Deney özetine yazılır, Çizgi grafiğinde görünür).
 */
export const ATIS_CIPLERI: readonly number[] = [10, 20, 30, 50, 100, 200];

/**
 * Tek bir deneyin (çip, "N kez at") atış sayısı: tabloya yazılmayacak kadar büyük sayı (eski kayıt: 500, 2000) en
 * büyük çipe iner; tabloya yazılmayan tek deney grafiği ve tabloyu boş bırakırdı.
 */
export function tekDeneyAtisi(n: number): number {
  return n >= TABLOYA_YAZMA_SINIRI ? ATIS_CIPLERI[ATIS_CIPLERI.length - 1] : n;
}

/** Deney özeti tablosunun sütun kimlikleri (kararlı; durum.ts eksen ataması bunlara dayanır) */
export const OZET_SUTUNU = {
  deney: 'oz-deney',
  n: 'oz-n',
  sayi: 'oz-sayi',
  oran: 'oz-oran',
  teorik: 'oz-teorik',
} as const;

// ── Nesne, fiil ve etiketler ──────────────────────────────────────────────────

export type DeneyFiili = 'atış' | 'çevirme' | 'çekiş';

/** Nesneye göre deneyin fiili: para ve küp "atış", çark "çevirme", torba "çekiş" */
export function fiil(nesne: DeneyNesnesi): DeneyFiili {
  if (nesne === 'cark') return 'çevirme';
  if (nesne === 'torba') return 'çekiş';
  return 'atış';
}

const buyukHarfle = (m: string) => m.charAt(0).toLocaleUpperCase('tr') + m.slice(1);

/** Gerçek (elle kaydedilen) çalışmanın etiketi: "Gerçek atışlar" · "Gerçek çevirmeler" · "Gerçek çekişler" */
export function gercekEtiketi(nesne: DeneyNesnesi): string {
  const f = fiil(nesne);
  return `Gerçek ${f === 'atış' ? 'atışlar' : f === 'çevirme' ? 'çevirmeler' : 'çekişler'}`;
}

/** Simülasyon çalışmasının etiketi: "3. deney (20)"; `no` yalnız simülasyon çalışmalarını sayar */
export function deneyEtiketi(no: number, n: number): string {
  return `${no}. deney (${n})`;
}

/** Varsayılan deney planı: madenî para, bilgisayar atar, 20 atış, otomatik hız, teorik olasılık açık */
export function varsayilanDeneyPlani(): DeneyPlani {
  return {
    nesne: 'para',
    kayit: 'simulasyon',
    atisSayisi: 20,
    hiz: 'oto',
    izlenen: null,
    teorikGoster: true,
    torba: {
      toplar: [
        { etiket: 'Kırmızı', adet: 3 },
        { etiket: 'Mavi', adet: 2 },
      ],
      geriAt: true,
    },
    cark: {
      degiskenAdi: 'Çark',
      dilimler: [
        { etiket: 'Kırmızı', yuzde: 50 },
        { etiket: 'Mavi', yuzde: 25 },
        { etiket: 'Sarı', yuzde: 25 },
      ],
    },
    calismalar: [],
  };
}

/** Sonuç sütunlarının rolleri: iki sayı küpünde 1. küp, 2. küp ve Toplam; ötekilerde tek sonuç sütunu */
export type SonucRolu = 's0' | 's1' | 'toplam';

/** Nesnenin ürettiği sonuç sütunlarının rolleri (tablodaki sırayla) */
export function sonucRolleri(nesne: DeneyNesnesi): SonucRolu[] {
  return nesne === 'iki-zar' ? ['s0', 's1', 'toplam'] : ['s0'];
}

/** Sayılan (izlenen) sonucun bulunduğu sütunun rolü: iki sayı küpünde Toplam, ötekilerde s0 */
export function izlenenRolu(nesne: DeneyNesnesi): 's0' | 'toplam' {
  return nesne === 'iki-zar' ? 'toplam' : 's0';
}

/**
 * Sonuç sütununun varsayılan adı: "Para" · "Sayı küpü" · "1. küp" / "2. küp" / "Toplam" · çarkın sütun adı
 * (boşsa "Çark") · "Renk".
 */
export function sonucSutunAdi(d: DeneyPlani, rol: SonucRolu): string {
  if (d.nesne === 'iki-zar') return rol === 's0' ? '1. küp' : rol === 's1' ? '2. küp' : 'Toplam';
  if (d.nesne === 'para') return 'Para';
  if (d.nesne === 'zar') return 'Sayı küpü';
  if (d.nesne === 'cark') return d.cark.degiskenAdi.trim() || 'Çark';
  return 'Renk';
}

/** Sonuç sütunu sayısal mı: sayı küplerinde evet (1–6, toplam 2–12), para / çark / torbada hayır */
export function sonucSayisalMi(nesne: DeneyNesnesi): boolean {
  return nesne === 'zar' || nesne === 'iki-zar';
}

// ── Rastgele düzenek ──────────────────────────────────────────────────────────

/**
 * Nesnenin aygıtları, kararlı kimliklerle: 'para', 'zar', 'zar-1' + 'zar-2' (iki küp), 'cark', 'torba'.
 * Para, Yazı ve Tura toplarından birer tane içeren ve çekilen topun geri atıldığı bir torbadır.
 */
export function nesneAygitlari(d: DeneyPlani): Aygit[] {
  switch (d.nesne) {
    case 'zar':
      return [{ id: 'zar', tur: 'aralik', degisken: sonucSutunAdi(d, 's0'), min: 1, max: 6 }];
    case 'iki-zar':
      return [
        { id: 'zar-1', tur: 'aralik', degisken: sonucSutunAdi(d, 's0'), min: 1, max: 6 },
        { id: 'zar-2', tur: 'aralik', degisken: sonucSutunAdi(d, 's1'), min: 1, max: 6 },
      ];
    case 'cark':
      return [{ id: 'cark', tur: 'cark', degisken: sonucSutunAdi(d, 's0'), dilimler: d.cark.dilimler.map((x) => ({ ...x })) }];
    case 'torba':
      return [{ id: 'torba', tur: 'karistirici', degisken: sonucSutunAdi(d, 's0'), ogeler: d.torba.toplar.map((t) => ({ ...t })), iadeli: d.torba.geriAt }];
    default:
      return [
        {
          id: 'para',
          tur: 'karistirici',
          degisken: sonucSutunAdi(d, 's0'),
          ogeler: [
            { etiket: 'Yazı', adet: 1 },
            { etiket: 'Tura', adet: 1 },
          ],
          iadeli: true,
        },
      ];
  }
}

/**
 * Nesnenin rastgele düzeneği (ornekleyici.ts çekiliş çekirdeği için; aygıtlar `nesneAygitlari`). İki
 * sayı küpünde Toplam sütunu açıktır. Çekiliş sayısı plandaki atış sayısıdır; hız "Otomatik" iken
 * Orta (1) yazılır (canlandırma planı hızı ayrıca seçer).
 */
export function nesneDuzenegi(d: DeneyPlani): OrnekleyiciAyari {
  const aygitlar = nesneAygitlari(d);
  const toplamSutunu = d.nesne === 'iki-zar';
  return {
    aygitlar,
    toplamSutunu,
    cekilisSayisi: d.atisSayisi,
    hiz: d.hiz === 'oto' ? 1 : d.hiz,
  };
}

// ── Olası sonuçlar, izlenen sonuç ve teorik olasılık ──────────────────────────

const SAYI_KUPU = ['1', '2', '3', '4', '5', '6'];
const IKI_KUP_TOPLAMI = ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

/**
 * İzlenen sonuç sütununun (iki küpte Toplam) alabileceği değerler, nesnedeki sırayla: Yazı, Tura · 1–6 ·
 * 2–12 · çark dilimleri · torbadaki renkler (boş etiketler atlanır, yinelenenler bir kez).
 */
export function sonucDegerleri(d: DeneyPlani): string[] {
  if (d.nesne === 'para') return ['Yazı', 'Tura'];
  if (d.nesne === 'zar') return [...SAYI_KUPU];
  if (d.nesne === 'iki-zar') return [...IKI_KUP_TOPLAMI];
  return aygitKategorileri(nesneAygitlari(d)[0]);
}

/** Varsayılan sayılan sonuç: Tura · 6 · 7 · ilk dilim · ilk renk (boş nesnede '') */
export function izlenenVarsayilani(d: DeneyPlani): string {
  if (d.nesne === 'para') return 'Tura';
  if (d.nesne === 'zar') return '6';
  if (d.nesne === 'iki-zar') return '7';
  return sonucDegerleri(d)[0] ?? '';
}

/** İki sonuç metni aynı mı: kırpılmış metinler eşit ya da ikisi de aynı sayı ("7" ile "7,0") */
export function ayniSonuc(a: string, b: string): boolean {
  const x = a.trim();
  const y = b.trim();
  if (x === y) return true;
  const sx = sayiOku(x);
  const sy = sayiOku(y);
  return sx !== null && sy !== null && sx === sy;
}

/**
 * Geçerli sayılan sonuç: plandaki `izlenen` nesnenin sonuçlarından biriyse onun nesnedeki yazımı,
 * değilse (null, silinmiş renk …) varsayılan.
 */
export function etkinIzlenen(d: DeneyPlani): string {
  if (d.izlenen !== null) {
    const bulunan = sonucDegerleri(d).find((v) => ayniSonuc(v, d.izlenen as string));
    if (bulunan !== undefined) return bulunan;
  }
  return izlenenVarsayilani(d);
}

/**
 * Sayılan sonucun görünen adı: kategorik nesnede sonucun kendisi ("Tura", "Kırmızı"); sayı küplerinde
 * sütun adıyla ("Sayı küpü 6", "Toplam 7"). `sutunAdi` verilirse (tablodaki güncel ad) o kullanılır.
 */
export function izlenenAdi(d: DeneyPlani, sutunAdi?: string): string {
  const izlenen = etkinIzlenen(d);
  if (!sonucSayisalMi(d.nesne)) return izlenen;
  const ad = sutunAdi?.trim() || sonucSutunAdi(d, izlenenRolu(d.nesne));
  return `${ad} ${izlenen}`;
}

export interface TeorikOlasilik {
  /** sonuç (izlenen sütunun bir değeri) */
  deger: string;
  /** 0–1 */
  olasilik: number;
  /** kesir (yazımda sadeleştirilmez: iki küpte 6/36, torbada 3/5); gösterilemiyorsa null */
  pay: number | null;
  payda: number | null;
}

function ebob(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y > 0) [x, y] = [y, x % y];
  return x;
}

/**
 * Sonuçların teorik olasılıkları (`sonucDegerleri` sırasıyla):
 * - para 1/2; sayı küpü 1/6; iki küpün toplamı k/36 (evrişim: 7 → 6/36);
 * - torba: renkteki top ÷ bütün toplar (ilk çekiş; geri atmadan çekişte sonraki çekişlerde değişir);
 * - çark: dilim yüzdeleri toplamı 100 değilse oranlar korunarak ölçeklenir; yüzdeler tam sayıysa kesir
 *   sadeleştirilir (%60 → 3/5), değilse kesir yazılmaz.
 */
export function teorikOlasiliklar(d: DeneyPlani): TeorikOlasilik[] {
  if (d.nesne === 'para') return ['Yazı', 'Tura'].map((deger) => ({ deger, olasilik: 1 / 2, pay: 1, payda: 2 }));
  if (d.nesne === 'zar') return SAYI_KUPU.map((deger) => ({ deger, olasilik: 1 / 6, pay: 1, payda: 6 }));
  if (d.nesne === 'iki-zar')
    return IKI_KUP_TOPLAMI.map((deger) => {
      const yol = 6 - Math.abs(Number(deger) - 7);
      return { deger, olasilik: yol / 36, pay: yol, payda: 36 };
    });
  const degerler = sonucDegerleri(d);
  if (d.nesne === 'torba') {
    const adetler = new Map<string, number>();
    for (const t of d.torba.toplar) {
      const e = t.etiket.trim();
      const adet = Number.isFinite(t.adet) ? Math.max(0, Math.floor(t.adet)) : 0;
      if (e !== '') adetler.set(e, (adetler.get(e) ?? 0) + adet);
    }
    const toplam = [...adetler.values()].reduce((s, x) => s + x, 0);
    return degerler.map((deger) => {
      const adet = adetler.get(deger) ?? 0;
      return toplam > 0 ? { deger, olasilik: adet / toplam, pay: adet, payda: toplam } : { deger, olasilik: 0, pay: null, payda: null };
    });
  }
  // Çark: carkOranlari ile aynı ölçekleme (geçersiz / negatif yüzde 0 sayılır)
  const cark = nesneAygitlari(d)[0];
  const oranlar = cark.tur === 'cark' ? carkOranlari(cark).oranlar : [];
  const temiz = d.cark.dilimler.map((x) => (Number.isFinite(x.yuzde) && x.yuzde > 0 ? x.yuzde : 0));
  const toplamYuzde = temiz.reduce((s, x) => s + x, 0);
  const kesirli = toplamYuzde > 0 && temiz.every((y) => Number.isInteger(y));
  return degerler.map((deger) => {
    let olasilik = 0;
    let yuzde = 0;
    d.cark.dilimler.forEach((x, i) => {
      if (x.etiket.trim() !== deger) return;
      olasilik += oranlar[i] ?? 0;
      yuzde += temiz[i];
    });
    if (!kesirli) return { deger, olasilik, pay: null, payda: null };
    const g = ebob(yuzde, toplamYuzde) || 1;
    return { deger, olasilik, pay: yuzde / g, payda: toplamYuzde / g };
  });
}

/** İzlenen sonucun teorik olasılığı (0–1) */
export function izlenenTeorik(d: DeneyPlani): TeorikOlasilik {
  const izlenen = etkinIzlenen(d);
  return teorikOlasiliklar(d).find((t) => t.deger === izlenen) ?? { deger: izlenen, olasilik: 0, pay: null, payda: null };
}

/** "1/2 = %50" · "6/36 = %16,7" · kesirsiz "%33,3" (yüzde 1 ondalık) */
export function kesirMetni(t: TeorikOlasilik): string {
  const yuzde = `%${sayiYaz(t.olasilik * 100, 1)}`;
  return t.pay !== null && t.payda !== null ? `${t.pay}/${t.payda} = ${yuzde}` : yuzde;
}

/**
 * Teorik olasılık gösterilir mi: planda açıksa ve çekiş geri atılıyorsa. Geri atmadan çekişte olasılık
 * her çekişte değiştiği için özet tablosunda ve sıklık tablosunda "Teorik" sütunu olmaz.
 */
export function teorikGosterilir(d: DeneyPlani): boolean {
  return d.teorikGoster && !(d.nesne === 'torba' && !d.torba.geriAt);
}

// ── Çalışmaların sayımı ───────────────────────────────────────────────────────

/**
 * Sonuç hücresinin sayım anahtarı: sayısal sütunda sayının `sayiYaz` yazımı ("7"), etiket sütununda
 * kırpılmış metin. Boş ya da (sayısal sütunda) okunamayan hücre sayılmaz: null. Çalışma kaydındaki
 * `sayilar` da bu anahtarlarla yazılır.
 */
export function sonucAnahtari(hucre: string, sayisal: boolean): string | null {
  const m = hucre.trim();
  if (m === '') return null;
  if (!sayisal) return m;
  const s = sayiOku(m);
  return s === null ? null : sayiYaz(s, 6);
}

/** Sayılardan bir sonucunkini okur (anahtar yazımı farklı olsa da: "7" ile "7,0" aynı sonuçtur) */
export function sonucSayisi(sayilar: Readonly<Record<string, number>>, deger: string): number {
  let t = 0;
  for (const [k, v] of Object.entries(sayilar)) if (ayniSonuc(k, deger)) t += v;
  return t;
}

function sutunBul(tablo: VeriTablosu, a: Arastirma, rol: SutunRolu): number {
  const id = a.sutunlar?.[rol];
  return id ? tablo.sutunlar.findIndex((s) => s.id === id) : -1;
}

/**
 * Çalışmanın tablodaki satırları (indeksler). Deney sütunu varsa etiketi çalışmanınkiyle aynı olan
 * satırlar; yoksa ve tabloya yazılmış tek çalışma buysa bütün satırlar. Belirlenemiyorsa (çalışma
 * tabloya yazılmamış, sonuç sütunu yok, Deney sütunu olmadan birden çok çalışma) null.
 */
export function calismaSatirlari(tablo: VeriTablosu, a: Arastirma, calisma: DeneyCalismasi): number[] | null {
  if (!calisma.tabloda || sutunBul(tablo, a, izlenenRolu(a.deney.nesne)) < 0) return null;
  const k = sutunBul(tablo, a, 'deney');
  if (k >= 0) {
    const etiket = calisma.etiket.trim();
    const satirlar: number[] = [];
    tablo.satirlar.forEach((r, i) => {
      if ((r.hucreler[k] ?? '').trim() === etiket) satirlar.push(i);
    });
    return satirlar;
  }
  const tablodakiler = a.deney.calismalar.filter((c) => c.tabloda);
  if (tablodakiler.length !== 1 || tablodakiler[0] !== calisma) return null;
  return tablo.satirlar.map((_, i) => i);
}

export interface CalismaSayimi {
  /** sonucu okunabilen atış sayısı */
  n: number;
  /** izlenen sütunun değerlerine göre sayılar (`sonucAnahtari` anahtarlarıyla) */
  sayilar: Record<string, number>;
  /** 'tablo' = Tablom'dan yeniden hesaplandı; 'kayit' = çalışmanın saklı sayıları */
  kaynak: 'tablo' | 'kayit';
}

/**
 * Çalışmanın atış sayısı ve sonuç sayıları. Tabloya yazılmış çalışmada Tablom'dan her seferinde yeniden
 * hesaplanır (elle silinen ya da düzeltilen satır sayıya yansır); tabloya yazılmamış (`tabloda` = false)
 * ya da satırları belirlenemeyen çalışmada saklı `n` ve `sayilar` kullanılır.
 */
export function calismaSayilari(tablo: VeriTablosu, a: Arastirma, calisma: DeneyCalismasi): CalismaSayimi {
  const satirlar = calismaSatirlari(tablo, a, calisma);
  if (satirlar === null) return { n: calisma.n, sayilar: { ...calisma.sayilar }, kaynak: 'kayit' };
  const j = sutunBul(tablo, a, izlenenRolu(a.deney.nesne));
  const sayisal = tablo.sutunlar[j].tur === 'sayi';
  const sayilar: Record<string, number> = {};
  let n = 0;
  for (const i of satirlar) {
    const anahtar = sonucAnahtari(tablo.satirlar[i].hucreler[j] ?? '', sayisal);
    if (anahtar === null) continue;
    n += 1;
    sayilar[anahtar] = (sayilar[anahtar] ?? 0) + 1;
  }
  return { n, sayilar, kaynak: 'tablo' };
}

/** Çalışmalar özet sırasıyla: önce gerçek atışlar, sonra simülasyonlar numara sırasıyla */
export function siraliCalismalar(calismalar: readonly DeneyCalismasi[]): DeneyCalismasi[] {
  return [...calismalar].sort((x, y) => {
    if (x.gercek !== y.gercek) return x.gercek ? -1 : 1;
    return x.gercek ? 0 : x.no - y.no;
  });
}

// ── Deney özeti ───────────────────────────────────────────────────────────────

/**
 * Deney özetinin sütunları: Deney · Atış sayısı (Çevirme / Çekiş sayısı) · ‹sonuç›: sayı ·
 * ‹sonuç›: göreli sıklık (%) · Teorik olasılık (%). Teorik sütunu, teorik olasılık gösterilmiyorsa ya da
 * torbadan geri atmadan çekiliyorsa yoktur.
 */
export function ozetSutunlari(tablo: VeriTablosu, a: Arastirma | null): Sutun[] {
  const d = a?.deney ?? varsayilanDeneyPlani();
  const j = a ? sutunBul(tablo, a, izlenenRolu(d.nesne)) : -1;
  const ad = izlenenAdi(d, j >= 0 ? tablo.sutunlar[j].ad : undefined);
  const sutunlar: Sutun[] = [
    { id: OZET_SUTUNU.deney, ad: 'Deney', tur: 'etiket' },
    { id: OZET_SUTUNU.n, ad: `${buyukHarfle(fiil(d.nesne))} sayısı`, tur: 'sayi' },
    { id: OZET_SUTUNU.sayi, ad: `${ad}: sayı`, tur: 'sayi' },
    { id: OZET_SUTUNU.oran, ad: `${ad}: göreli sıklık (%)`, tur: 'sayi' },
  ];
  if (teorikGosterilir(d)) sutunlar.push({ id: OZET_SUTUNU.teorik, ad: 'Teorik olasılık (%)', tur: 'sayi' });
  return sutunlar;
}

/**
 * "Deney özeti" kümesinin tablosu (türetilmiş, salt okunur): çalışma başına bir satır, önce gerçek atışlar,
 * sonra simülasyonlar numara sırasıyla. Hiç atışı kalmamış çalışma satır üretmez. Göreli sıklık ve teorik
 * olasılık yüzde olarak 1 ondalıkla yazılır. Araştırma yoksa ya da yöntemi deney değilse satır yoktur
 * (sütunlar yine kurulur). İzlenen sonuç ya da tablo değişince yeniden çağrılır; sonuç saklanmaz.
 */
export function ozetTablosu(tablo: VeriTablosu, a: Arastirma | null): VeriTablosu {
  const sutunlar = ozetSutunlari(tablo, a);
  if (!a || a.yontem !== 'deney') return { sutunlar, satirlar: [] };
  const d = a.deney;
  const izlenen = etkinIzlenen(d);
  const teorik = teorikGosterilir(d) ? sayiYaz(izlenenTeorik(d).olasilik * 100, 1) : null;
  const kullanilan = new Set<string>();
  const satirlar: Satir[] = [];
  for (const c of siraliCalismalar(d.calismalar)) {
    const { n, sayilar } = calismaSayilari(tablo, a, c);
    if (n <= 0) continue;
    const sayi = Math.min(n, sonucSayisi(sayilar, izlenen));
    const hucreler = [c.etiket, String(n), String(sayi), sayiYaz((sayi / n) * 100, 1)];
    if (teorik !== null) hucreler.push(teorik);
    const temel = c.gercek ? 'oz-g' : `oz-${c.no}`;
    let id = temel;
    for (let k = 2; kullanilan.has(id); k++) id = `${temel}-${k}`;
    kullanilan.add(id);
    satirlar.push({ id, hucreler });
  }
  return { sutunlar, satirlar };
}

// ── Fiile göre ekler ve arayüz metinleri ──────────────────────────────────────

/** Fiilin bulunma hâli: "atışta" · "çevirmede" · "çekişte" ("20 atışta 11 kez") */
export function fiilBulunma(f: DeneyFiili): string {
  return f === 'atış' ? 'atışta' : f === 'çevirme' ? 'çevirmede' : 'çekişte';
}

/** Fiilin çoğulu: "atışlar" · "çevirmeler" · "çekişler" */
export function fiilCogul(f: DeneyFiili): string {
  return f === 'atış' ? 'atışlar' : f === 'çevirme' ? 'çevirmeler' : 'çekişler';
}

/** Fiilin vasıta hâli: "atışla" · "çevirmeyle" · "çekişle" ("İlk atışla noktalar burada belirir.") */
export function fiilIle(f: DeneyFiili): string {
  return f === 'atış' ? 'atışla' : f === 'çevirme' ? 'çevirmeyle' : 'çekişle';
}

/** Çalıştır düğmesi: "20 kez at" · "20 kez çevir" · "20 top çek" */
export function eylemMetni(nesne: DeneyNesnesi, n: number): string {
  if (nesne === 'torba') return `${n} top çek`;
  return `${n} kez ${nesne === 'cark' ? 'çevir' : 'at'}`;
}

/** Sahnedeki nesne düğmesinin erişilebilir adı: "Parayı bir kez at" … "Torbadan bir top çek" */
export function sahneEtiketi(nesne: DeneyNesnesi): string {
  switch (nesne) {
    case 'zar':
      return 'Sayı küpünü bir kez at';
    case 'iki-zar':
      return 'Sayı küplerini bir kez at';
    case 'cark':
      return 'Çarkı bir kez çevir';
    case 'torba':
      return 'Torbadan bir top çek';
    default:
      return 'Parayı bir kez at';
  }
}

/** Atış çiplerinin başlığı: "KAÇ ATIŞ?" · "KAÇ ÇEVİRME?" · "KAÇ ÇEKİŞ?" */
export function kacAtisBasligi(nesne: DeneyNesnesi): string {
  return `KAÇ ${fiil(nesne).toLocaleUpperCase('tr')}?`;
}

/** Son atış yuvasının başlığı: "Son atış (12.)" · "Son çevirme (12.)" · "Son çekiş (12.)" */
export function sonAtisBasligi(nesne: DeneyNesnesi, sira: number): string {
  return `Son ${fiil(nesne)} (${sira}.)`;
}

/** Sahne kartının durum satırı: "2. deney · 27 / 50"; gerçek atışlarda "Gerçek atışlar · 27" */
export function deneyDurumMetni(c: Pick<DeneyCalismasi, 'no' | 'gercek' | 'etiket'>, yapilan: number, hedef: number): string {
  return c.gercek ? `${c.etiket} · ${yapilan}` : `${c.no}. deney · ${yapilan} / ${hedef}`;
}

/** Tablo dolu bildirimi: "Tablo dolu (2000 satır): yeni atışlar yalnız Deney özetine yazılır." */
export function tabloDoluMetni(nesne: DeneyNesnesi): string {
  return `Tablo dolu (${EN_COK_TABLO_SATIRI} satır): yeni ${fiilCogul(fiil(nesne))} yalnız Deney özetine yazılır.`;
}

/**
 * Deney bitince tost: "20 atış tamamlandı: Tura 11 (%55)." Sayı küpünde "30 atış tamamlandı: 6 sayısı 5 kez geldi
 * (%16,7).", iki küpte "100 atış tamamlandı: toplam 7, 17 kez geldi (%17)." (sayıya ek gelmez).
 */
export function tamamlandiMetni(d: DeneyPlani, n: number, sayi: number): string {
  const izlenen = etkinIzlenen(d);
  const yuzde = `%${sayiYaz(n > 0 ? (sayi / n) * 100 : 0, 1)}`;
  const bas = `${n} ${fiil(d.nesne)} tamamlandı:`;
  if (d.nesne === 'zar') return `${bas} ${izlenen} sayısı ${sayi} kez geldi (${yuzde}).`;
  if (d.nesne === 'iki-zar') return `${bas} toplam ${izlenen}, ${sayi} kez geldi (${yuzde}).`;
  return `${bas} ${izlenen} ${sayi} (${yuzde}).`;
}

/** Durdurulan deney: "Durduruldu: 14 atış. Deney “2. deney (14)” olarak kaydedildi." */
export function durdurulduMetni(nesne: DeneyNesnesi, c: Pick<DeneyCalismasi, 'n' | 'etiket'>): string {
  return `Durduruldu: ${c.n} ${fiil(nesne)}. Deney “${c.etiket}” olarak kaydedildi.`;
}

/** Geri atmadan torba boşaldı: "Torba boşaldı: bu deneyde 5 top çekilebildi." */
export function torbaBosaldiMetni(n: number): string {
  return `Torba boşaldı: bu deneyde ${n} top çekilebildi.`;
}

/** Son deneyi geri al: "2. deney silindi (50 atış)." · "Gerçek atışlar silindi (27 atış)." */
export function calismaSilindiMetni(nesne: DeneyNesnesi, c: Pick<DeneyCalismasi, 'n' | 'etiket' | 'gercek' | 'no'>): string {
  const ad = c.gercek ? c.etiket : `${c.no}. deney`;
  return `${ad} silindi (${c.n} ${fiil(nesne)}).`;
}

/** Seri bitti: "Seri tamamlandı: 7 deney özete yazıldı." */
export function seriBittiMetni(k: number): string {
  return `Seri tamamlandı: ${k} deney özete yazıldı.`;
}

// ── Atış sayısı seçenekleri ve torba ──────────────────────────────────────────

/** Torbadaki top sayısı (rengi yazılmamış ve adetsiz toplar sayılmaz) */
export function torbadakiTopSayisi(d: DeneyPlani): number {
  return d.torba.toplar.reduce((s, t) => s + (t.etiket.trim() !== '' && Number.isFinite(t.adet) ? Math.max(0, Math.floor(t.adet)) : 0), 0);
}

/** Bir deneyde en çok atış: geri atmadan torbadaki top sayısı, ötekilerde 2000 */
export function enCokAtis(d: DeneyPlani): number {
  return d.nesne === 'torba' && !d.torba.geriAt ? torbadakiTopSayisi(d) : EN_COK_ATIS;
}

/**
 * "KAÇ ATIŞ?" çipleri: 10 · 20 · 30 · 50 · 100 · 200. Planın atış sayısı bunlardan biri değilse (eski kayıt ya da
 * elle yazılmış plan) ona en yakın çipin yerine geçer: seçili sayı hep bir çiptir, çip sayısı değişmez. Tabloya
 * yazılmayacak kadar büyük sayı (≥ 500) çip olmaz (`tekDeneyAtisi` onu 200'e indirir).
 * Torbadan geri atmadan çekişte N top varsa: N ≤ 8 ise 1…N, değilse 1, 2, 3, 5, 10 (N'den küçük olanlar) ve N.
 */
export function atisSecenekleri(d: DeneyPlani): number[] {
  if (!(d.nesne === 'torba' && !d.torba.geriAt)) {
    const liste = [...ATIS_CIPLERI];
    const n = d.atisSayisi;
    if (Number.isInteger(n) && n >= 1 && n < TABLOYA_YAZMA_SINIRI && !liste.includes(n)) {
      let yakin = 0;
      liste.forEach((c, i) => {
        if (Math.abs(Math.log(c / n)) < Math.abs(Math.log(liste[yakin] / n))) yakin = i;
      });
      liste[yakin] = n;
      liste.sort((x, y) => x - y);
    }
    return liste;
  }
  const n = torbadakiTopSayisi(d);
  if (n <= 0) return [];
  if (n <= 8) return Array.from({ length: n }, (_, i) => i + 1);
  return [...[1, 2, 3, 5, 10].filter((x) => x < n), n];
}

/** Geri atmadan çekişte çiplerin açıklaması: "Torbada 5 top var: geri atmadan en çok 5 çekiş yapılabilir." */
export function atisSiniriMetni(d: DeneyPlani): string | null {
  if (!(d.nesne === 'torba' && !d.torba.geriAt)) return null;
  const n = torbadakiTopSayisi(d);
  return `Torbada ${n} top var: geri atmadan en çok ${n} çekiş yapılabilir.`;
}

const kucukHarfle = (m: string) => m.toLocaleLowerCase('tr');

/** Renk listesi: "3 kırmızı, 2 mavi" (renk adları küçük harfle; rengi yazılmamış ve adetsiz toplar atlanır) */
function renkListesi(toplar: readonly TorbaRengi[]): string {
  return toplar
    .filter((t) => t.etiket.trim() !== '' && t.adet > 0)
    .map((t) => `${Math.floor(t.adet)} ${kucukHarfle(t.etiket.trim())}`)
    .join(', ');
}

/** Plan özeti: "Torbada 5 top: 3 kırmızı, 2 mavi"; boş torbada "Torbada top yok" */
export function torbaMetni(toplar: readonly TorbaRengi[]): string {
  const n = toplar.reduce((s, t) => s + (t.etiket.trim() !== '' && t.adet > 0 ? Math.floor(t.adet) : 0), 0);
  return n > 0 ? `Torbada ${n} top: ${renkListesi(toplar)}` : 'Torbada top yok';
}

/** Geri atmadan çekişte kalan toplar: "Torbada kalan: 2 kırmızı, 1 mavi"; hepsi çekildiyse "Torbada top kalmadı" */
export function kalanMetni(toplar: readonly TorbaRengi[]): string {
  const liste = renkListesi(toplar);
  return liste ? `Torbada kalan: ${liste}` : 'Torbada top kalmadı';
}

/** Torbada kalan toplar: plandaki her renkten çekilen sonuçlar düşülür (renk sırası korunur, adet 0'ın altına inmez) */
export function torbadaKalan(d: DeneyPlani, cekilenler: readonly string[]): TorbaRengi[] {
  const cekilen = new Map<string, number>();
  for (const c of cekilenler) {
    const e = c.trim();
    if (e !== '') cekilen.set(e, (cekilen.get(e) ?? 0) + 1);
  }
  return d.torba.toplar.map((t) => {
    const e = t.etiket.trim();
    const adet = Number.isFinite(t.adet) ? Math.max(0, Math.floor(t.adet)) : 0;
    const dus = Math.min(adet, cekilen.get(e) ?? 0);
    if (dus > 0) cekilen.set(e, (cekilen.get(e) ?? 0) - dus);
    return { etiket: t.etiket, adet: adet - dus };
  });
}

/**
 * Teorik olasılık metni (Plan ve Topla):
 * - para / çark / torba: "Teorik olasılık: Tura 1/2 = %50";
 * - sayı küpü: "Teorik olasılık: 6 gelmesi 1/6 = %16,7"; iki küp: "Teorik olasılık: toplamın 7 olması 6/36 = %16,7";
 * - geri atmadan torba: "İlk çekişte kırmızı 3/5 = %60; sonraki çekişlerde değişir.";
 * - `kip = 'her'` (Elle kaydet): eş olasılıklı para ve küpte "Teorik olasılık: her yüz 1/6 = %16,7".
 */
export function teorikMetni(d: DeneyPlani, kip: 'izlenen' | 'her' = 'izlenen'): string {
  const t = izlenenTeorik(d);
  if (d.nesne === 'torba' && !d.torba.geriAt) return `İlk çekişte ${kucukHarfle(t.deger)} ${kesirMetni(t)}; sonraki çekişlerde değişir.`;
  if (kip === 'her' && (d.nesne === 'para' || d.nesne === 'zar')) return `Teorik olasılık: her yüz ${kesirMetni(teorikOlasiliklar(d)[0])}`;
  if (d.nesne === 'zar') return `Teorik olasılık: ${t.deger} gelmesi ${kesirMetni(t)}`;
  if (d.nesne === 'iki-zar') return `Teorik olasılık: toplamın ${t.deger} olması ${kesirMetni(t)}`;
  return `Teorik olasılık: ${t.deger} ${kesirMetni(t)}`;
}

// ── Çalışmaların yaşamı: başlat, satır ekle, bitir, sil ───────────────────────

/** Deney sütununun kimliği (araştırma sütun kimliği kalıbında: `${kimlik}-deney`) */
function deneySutunKimligi(a: Arastirma): string {
  return a.sutunlar?.deney ?? `${a.kimlik}-deney`;
}

/** Çalışmanın dizideki yeri: 0 gerçek atışlardır, ötekiler simülasyon numarasıdır */
function calismaIndeksi(calismalar: readonly DeneyCalismasi[], no: number): number {
  return calismalar.findIndex((c) => (no === 0 ? c.gercek : !c.gercek && c.no === no));
}

/** Saklanan çalışma sınırı (arastirma.ts EN_COK_CALISMA ile aynı; döngü olmasın diye burada da tutulur) */
const EN_COK_CALISMA_SAYISI = 200;

/** Sıradaki simülasyon numarası: en büyük numara + 1 (hiç yoksa 1) */
export function sonrakiDeneyNo(calismalar: readonly DeneyCalismasi[]): number {
  return calismalar.reduce((m, c) => (c.gercek ? m : Math.max(m, c.no)), 0) + 1;
}

/** Bu kadar atışlık bir deney tabloya yazılır mı: 500'den az atış ve tablo taşmıyorsa */
export function tabloyaYazilirMi(hedef: number, tabloSatiri: number): boolean {
  return hedef < TABLOYA_YAZMA_SINIRI && tabloSatiri + hedef <= EN_COK_TABLO_SATIRI;
}

/** Durdurulan ya da torbası boşalan simülasyonun etiketi gerçek atış sayısıyla yazılır: "3. deney (20)" → "3. deney (14)" */
export function deneyEtiketiDuzelt(c: DeneyCalismasi): DeneyCalismasi {
  if (c.gercek) return c;
  const etiket = deneyEtiketi(c.no, c.n);
  return etiket === c.etiket ? c : { ...c, etiket };
}

/**
 * Yeni bir çalışma başlatır (Tablom'a dokunmaz):
 * - gerçek (Elle kaydet): tek "Gerçek atışlar" çalışması vardır; yoksa eklenir (no 0);
 * - simülasyon: no verilmezse `sonrakiDeneyNo`; etiket planlanan atış sayısıyla ("3. deney (20)"); 500 ve üstü
 *   atışta ya da tablo taşacaksa `tabloda` = false (yalnız Deney özetine yazılır). Aynı numara varsa değişmez.
 * Çalışma sınırı (200) doluysa null.
 */
export function deneyCalismasiBaslat(
  a: Arastirma,
  kayit: KayitKipi,
  hedef: number,
  tabloSatiri: number,
  no?: number,
): { arastirma: Arastirma; no: number } | null {
  const calismalar = a.deney.calismalar;
  const k = kayit === 'gercek' ? 0 : no !== undefined && no >= 1 ? Math.floor(no) : sonrakiDeneyNo(calismalar);
  if (calismaIndeksi(calismalar, k) >= 0) return { arastirma: a, no: k };
  if (calismalar.length >= EN_COK_CALISMA_SAYISI) return null;
  const yeni: DeneyCalismasi =
    k === 0
      ? { no: 0, etiket: gercekEtiketi(a.deney.nesne), n: 0, sayilar: {}, tabloda: tabloSatiri < EN_COK_TABLO_SATIRI, gercek: true }
      : { no: k, etiket: deneyEtiketi(k, Math.max(0, Math.floor(hedef))), n: 0, sayilar: {}, tabloda: tabloyaYazilirMi(hedef, tabloSatiri), gercek: false };
  return { arastirma: { ...a, deney: { ...a.deney, calismalar: [...calismalar, yeni] } }, no: k };
}

export interface DeneyEklemeSonucu {
  tablo: VeriTablosu;
  arastirma: Arastirma;
  /** Tablom'a yazılan satırların kimlikleri (tabloya yazılmayan çalışmada boş) */
  kimlikler: string[];
  /** tablo dolduğu için Tablom'a yazılamayan satır sayısı */
  tasan: number;
}

/**
 * Bir çalışmanın sonuçlarını ekler (`satirlar` sonuç sütunlarının sırasıyla: [s0] ya da iki küpte [s0, s1, toplam];
 * ornekleyici.ts `satirDegerleri` bu sırayı verir). Çalışmanın `n` ve `sayilar` kaydı her durumda güncellenir.
 * Çalışma tabloya yazılıyorsa:
 * - Deney sütunu tembel eklenir: tabloda başka bir çalışmanın satırları varken ikinci çalışma başlarken sütun en sona
 *   eklenir, var olan satırlar kendi çalışmalarının etiketiyle doldurulur;
 * - yeni satırlar sonuç sütunlarına (ve Deney sütununa etiket) yazılır; öteki sütunlar boş kalır;
 * - tablo 2000 satırı aşacaksa taşan satırlar yazılmaz ve çalışma `tabloda` = false olur (özet kayıttan hesaplanır).
 * Çalışma yoksa kurulur (0 → gerçek atışlar; öteki numaralar etiketlerini satır sayısıyla alır).
 */
export function deneySatirlariEkle(
  tablo: VeriTablosu,
  a: Arastirma,
  no: number,
  satirlar: readonly (readonly string[])[],
  kimlikler?: readonly string[],
): DeneyEklemeSonucu {
  const d = a.deney;
  const calismalar = [...d.calismalar];
  let i = calismaIndeksi(calismalar, no);
  if (i < 0) {
    const kurulan = deneyCalismasiBaslat(a, no === 0 ? 'gercek' : 'simulasyon', satirlar.length, tablo.satirlar.length, no);
    const c = kurulan ? kurulan.arastirma.deney.calismalar[kurulan.arastirma.deney.calismalar.length - 1] : null;
    if (!c) return { tablo, arastirma: a, kimlikler: [], tasan: 0 };
    calismalar.push(c);
    i = calismalar.length - 1;
  }
  const c: DeneyCalismasi = { ...calismalar[i], sayilar: { ...calismalar[i].sayilar } };
  const roller = sonucRolleri(d.nesne);
  const iz = roller.indexOf(izlenenRolu(d.nesne));
  const sayisal = sonucSayisalMi(d.nesne);
  for (const r of satirlar) {
    c.n += 1;
    const k = sonucAnahtari(r[iz] ?? '', sayisal);
    if (k !== null) c.sayilar[k] = (c.sayilar[k] ?? 0) + 1;
  }
  let t = tablo;
  let sutunlar = a.sutunlar;
  const yazilan: string[] = [];
  let tasan = 0;
  if (c.tabloda && satirlar.length > 0 && sutunlar) {
    const yazilacak = Math.max(0, Math.min(satirlar.length, EN_COK_TABLO_SATIRI - t.satirlar.length));
    tasan = satirlar.length - yazilacak;
    if (tasan > 0) c.tabloda = false;
    if (yazilacak > 0) {
      const deneyId = deneySutunKimligi(a);
      let k = t.sutunlar.findIndex((s) => s.id === deneyId);
      if (k < 0 && t.satirlar.length > 0) {
        const digerleri = calismalar.filter((x, j) => j !== i && x.tabloda);
        if (digerleri.length > 0) {
          const etiket = digerleri.length === 1 ? digerleri[0].etiket : '';
          t = {
            sutunlar: [...t.sutunlar, { id: deneyId, ad: 'Deney', tur: 'etiket' }],
            satirlar: t.satirlar.map((r) => ({ ...r, hucreler: [...r.hucreler, etiket] })),
          };
          k = t.sutunlar.length - 1;
        }
      }
      if (k >= 0 && sutunlar.deney !== deneyId) sutunlar = { ...sutunlar, deney: deneyId };
      const konum = roller.map((rol) => {
        const id = sutunlar?.[rol];
        return id ? t.sutunlar.findIndex((s) => s.id === id) : -1;
      });
      const yeniler: Satir[] = satirlar.slice(0, yazilacak).map((r, j) => {
        const hucreler = t.sutunlar.map(() => '');
        konum.forEach((p, m) => {
          if (p >= 0) hucreler[p] = r[m] ?? '';
        });
        if (k >= 0) hucreler[k] = c.etiket;
        const id = kimlikler?.[j] || kimlikUret('r');
        yazilan.push(id);
        return { id, hucreler };
      });
      t = { ...t, satirlar: [...t.satirlar, ...yeniler] };
    }
  }
  calismalar[i] = c;
  return { tablo: t, arastirma: { ...a, sutunlar, deney: { ...d, calismalar } }, kimlikler: yazilan, tasan };
}

/** Çalışmanın Tablom'daki satırları: Deney sütunu varsa etiketiyle (tabloya yazılmasa da), yoksa `calismaSatirlari` */
function calismaninSatirlari(tablo: VeriTablosu, a: Arastirma, c: DeneyCalismasi): number[] {
  const id = a.sutunlar?.deney;
  const k = id ? tablo.sutunlar.findIndex((s) => s.id === id) : -1;
  if (k >= 0) {
    const etiket = c.etiket.trim();
    const sonuc: number[] = [];
    tablo.satirlar.forEach((r, i) => {
      if ((r.hucreler[k] ?? '').trim() === etiket) sonuc.push(i);
    });
    return sonuc;
  }
  return calismaSatirlari(tablo, a, c) ?? [];
}

/**
 * Çalışmayı bitirir (bütün atışlar yapıldı, Durdur ya da torba boşaldı): simülasyonun etiketi gerçek atış sayısıyla
 * yazılır ("3. deney (14)") ve Deney sütunundaki hücreleri de değişir. Hiç atışı olmayan simülasyon silinir.
 * Gerçek atışlar ve bilinmeyen numara değişmez.
 */
export function deneyCalismasiBitir(tablo: VeriTablosu, a: Arastirma, no: number): { tablo: VeriTablosu; arastirma: Arastirma; calisma: DeneyCalismasi | null } {
  const i = calismaIndeksi(a.deney.calismalar, no);
  if (i < 0) return { tablo, arastirma: a, calisma: null };
  const c = a.deney.calismalar[i];
  if (c.gercek) return { tablo, arastirma: a, calisma: c };
  if (c.n <= 0) {
    const calismalar = a.deney.calismalar.filter((_, j) => j !== i);
    return { tablo, arastirma: { ...a, deney: { ...a.deney, calismalar } }, calisma: null };
  }
  const yeni = deneyEtiketiDuzelt(c);
  if (yeni === c) return { tablo, arastirma: a, calisma: c };
  const satirlar = new Set(calismaninSatirlari(tablo, a, c));
  const k = a.sutunlar?.deney ? tablo.sutunlar.findIndex((s) => s.id === a.sutunlar?.deney) : -1;
  const t =
    k >= 0 && satirlar.size > 0
      ? { ...tablo, satirlar: tablo.satirlar.map((r, j) => (satirlar.has(j) ? { ...r, hucreler: r.hucreler.map((h, m) => (m === k ? yeni.etiket : h)) } : r)) }
      : tablo;
  const calismalar = a.deney.calismalar.map((x, j) => (j === i ? yeni : x));
  return { tablo: t, arastirma: { ...a, deney: { ...a.deney, calismalar } }, calisma: yeni };
}

/**
 * "Son deneyi geri al": çalışmanın bütün satırlarını ve kaydını siler. `silinen` çalışmanın atış sayısıdır
 * (tost: "2. deney silindi (50 atış)."). Bilinmeyen numarada hiçbir şey değişmez.
 */
export function deneyCalismasiSil(tablo: VeriTablosu, a: Arastirma, no: number): { tablo: VeriTablosu; arastirma: Arastirma; silinen: number } {
  const i = calismaIndeksi(a.deney.calismalar, no);
  if (i < 0) return { tablo, arastirma: a, silinen: 0 };
  const c = a.deney.calismalar[i];
  const satirlar = new Set(calismaninSatirlari(tablo, a, c));
  const t = satirlar.size > 0 ? { ...tablo, satirlar: tablo.satirlar.filter((_, j) => !satirlar.has(j)) } : tablo;
  const calismalar = a.deney.calismalar.filter((_, j) => j !== i);
  return { tablo: t, arastirma: { ...a, deney: { ...a.deney, calismalar } }, silinen: c.n };
}

/**
 * Tabloya yazılmış çalışmaların saklı `n` ve `sayilar` kayıtlarını Tablom'dan yeniden hesaplar (satır silme ya da
 * düzeltmeden sonra). Değişiklik yoksa aynı araştırma döner.
 */
export function calismalariTablodanGuncelle(tablo: VeriTablosu, a: Arastirma): Arastirma {
  let degisti = false;
  const calismalar = a.deney.calismalar.map((c) => {
    if (!c.tabloda) return c;
    const s = calismaSayilari(tablo, a, c);
    if (s.kaynak !== 'tablo') return c;
    const ayni = s.n === c.n && Object.keys(s.sayilar).length === Object.keys(c.sayilar).length && Object.entries(s.sayilar).every(([k, v]) => c.sayilar[k] === v);
    if (ayni) return c;
    degisti = true;
    return { ...c, n: s.n, sayilar: s.sayilar };
  });
  return degisti ? { ...a, deney: { ...a.deney, calismalar } } : a;
}

// ── Sıklıklar ─────────────────────────────────────────────────────────────────

export interface SonucSikligi {
  /** sonuç (izlenen sütunun değeri: Tura, 6, 7, Kırmızı …) */
  deger: string;
  sayi: number;
  /** göreli sıklık (0–1) */
  oran: number;
  /** teorik olasılık (0–1); teorik gösterilmiyorsa ya da sonuç nesnede yoksa null */
  teorik: number | null;
}

/**
 * Düzenle adımının sıklık tablosu ve Topla sayacı: seçilen çalışmanın (ya da 'tumu' ile hepsinin) sonuç sıklıkları.
 * Satırlar nesnenin sonuç sırasıyla (hiç gelmeyenler 0), sonra nesnede olmayan yazımlar. Hiç çalışma yokken
 * tablodaki bütün satırlar sayılır.
 */
export function deneySikliklari(tablo: VeriTablosu, a: Arastirma, secim: number | 'tumu'): { n: number; satirlar: SonucSikligi[] } {
  const d = a.deney;
  const toplamSayilar: Record<string, number> = {};
  let n = 0;
  const ekle = (s: CalismaSayimi) => {
    n += s.n;
    for (const [k, v] of Object.entries(s.sayilar)) toplamSayilar[k] = (toplamSayilar[k] ?? 0) + v;
  };
  if (d.calismalar.length === 0) {
    const j = sutunBul(tablo, a, izlenenRolu(d.nesne));
    if (j >= 0) {
      const sayisal = tablo.sutunlar[j].tur === 'sayi';
      for (const r of tablo.satirlar) {
        const k = sonucAnahtari(r.hucreler[j] ?? '', sayisal);
        if (k === null) continue;
        n += 1;
        toplamSayilar[k] = (toplamSayilar[k] ?? 0) + 1;
      }
    }
  } else {
    for (const c of d.calismalar) {
      if (secim !== 'tumu' && (secim === 0 ? !c.gercek : c.gercek || c.no !== secim)) continue;
      ekle(calismaSayilari(tablo, a, c));
    }
  }
  const teorikVar = teorikGosterilir(d);
  const teorik = new Map(teorikOlasiliklar(d).map((t) => [t.deger, t.olasilik]));
  const degerler = sonucDegerleri(d);
  const kalan = Object.keys(toplamSayilar).filter((k) => !degerler.some((v) => ayniSonuc(v, k)));
  const satirlar = [...degerler, ...kategoriler(kalan)].map((deger) => {
    const sayi = sonucSayisi(toplamSayilar, deger);
    return { deger, sayi, oran: n > 0 ? sayi / n : 0, teorik: teorikVar && teorik.has(deger) ? (teorik.get(deger) as number) : null };
  });
  return { n, satirlar };
}

/** Bütün çalışmalardaki atış sayısı (tabloya yazılmayanlar dahil); çalışma yoksa tablodaki sonucu okunabilen satırlar */
export function toplamAtis(tablo: VeriTablosu, a: Arastirma): number {
  if (a.deney.calismalar.length === 0) return deneySikliklari(tablo, a, 'tumu').n;
  return a.deney.calismalar.reduce((s, c) => s + calismaSayilari(tablo, a, c).n, 0);
}
