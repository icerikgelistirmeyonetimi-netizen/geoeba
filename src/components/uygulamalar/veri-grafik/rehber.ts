/**
 * Veri ve Grafik — örneklerin rehberli keşfi (saf; React'siz, durum.ts'i içe aktarmaz).
 *
 * Örnek yüklenince görünüm `acilisYamasi` ile kurulur (ölçüler kapalı: öğrenci önce tahmin eder). Keşif şeridi
 * `seritMetni`ni, Keşif kartı `rehberAdimlari`nı gösterir; adımdaki düğmeye basılınca `eylemYamasi` görünümü
 * ya da tabloyu değiştirir. Uygulamada henüz olmayan bir özelliğe dayanan eylem ve metinler `gerektirir` ile
 * işaretlidir: özellik kümesinde (`ozellikler`) yoksa yedek eylem ya da bugünkü metin kullanılır.
 */
import { degiskenSutunlari } from './kategorik';
import {
  hucreYaz,
  kimlikUret,
  sayiOku,
  sayiYaz,
  type GrafikTuru,
  type OrnekVeri,
  type Ozellik,
  type RehberAdimi,
  type RehberEylemi,
  type SutunTuru,
  type VeriTablosu,
} from './veri';

/** Nokta grafiği seçenekleri (NoktaGrafigi'ndeki NoktaSecenekleri ile uyumlu; ortanca C-3'te gelir) */
export interface AcilisSecenekleri {
  ortalama: boolean;
  oms: boolean;
  etiketler: boolean;
  ortanca: boolean;
}

/** Örnek yüklenince uygulanacak görünüm (sütunlar KİMLİKLE; tablo her yüklemede yeni kimlik alır) */
export interface AcilisYamasi {
  sekme: GrafikTuru;
  degisken: string | null;
  ikinciDegisken: string | null;
  renkDegisken: string | null;
  yDegisken: null;
  secenekler: AcilisSecenekleri;
  sutunModu: boolean;
  aralik: number | null;
  daireModu: 'satir' | 'siklik' | 'uygunDegil';
  /** Sütun kimliği → kategori sırası ('kategoriSirasi' özelliği varken) */
  kategoriSiralari: Record<string, string[]>;
  /** Sütun kimliği → çizgi değişim etiketinde yüzde gösterilsin mi ('yuzdeDegisim' özelliği varken) */
  yuzdeDegisim: Record<string, boolean>;
}

/** Grafik türünün istediği en az sayısal değişken (durum.ts'teki GEREKEN_SAYISAL ile aynı; test karşılaştırır) */
const GEREKEN_SAYISAL: Partial<Record<GrafikTuru, number>> = { cizgi: 1, sacilim: 2 };

/** Örneğin açılış sekmesi: `acilis.sekme`, yoksa önerilen grafik, yoksa nokta */
export function onerilenSekme(ornek: OrnekVeri): GrafikTuru {
  return ornek.acilis?.sekme ?? ornek.onerilenGrafik ?? 'nokta';
}

function sutunKimligi(tablo: VeriTablosu, ad: string | null | undefined, tur?: SutunTuru): string | null {
  if (!ad) return null;
  return tablo.sutunlar.find((s) => s.ad === ad && (tur === undefined || s.tur === tur))?.id ?? null;
}

/** Sütun adı → değer eşlemesini sütun kimliği → değer eşlemesine çevirir (tabloda olmayan ya da türü tutmayan atlanır) */
function kimlikEslemesi<T>(tablo: VeriTablosu, eslem: Record<string, T> | null | undefined, tur: SutunTuru): Record<string, T> {
  const sonuc: Record<string, T> = {};
  for (const [ad, deger] of Object.entries(eslem ?? {})) {
    const id = sutunKimligi(tablo, ad, tur);
    if (id) sonuc[id] = deger;
  }
  return sonuc;
}

/**
 * Örnek yüklenince görünüm: sekme (veri türü kapısından geçmezse nokta), eksen, karşılaştırma ya da gruplama,
 * renk anahtarı, ölçüler (kapalı), sütun modu, açılış gruplaması, daire davranışı, kategori sırası ve yüzde eşlemesi.
 * Özellik kümesinde olmayan ayarlar bugünkü davranışa düşer (grupla yoksa ikinci değişken örneğin karşılaştırması,
 * daireSiklik yoksa her satır bir dilim, acilisAralik yoksa aralık null, …).
 */
export function acilisYamasi(ornek: OrnekVeri, tablo: VeriTablosu, ozellikler: ReadonlySet<Ozellik>): AcilisYamasi {
  const degiskenler = degiskenSutunlari(tablo);
  const istenen = sutunKimligi(tablo, ornek.varsayilanDegisken);
  const degisken = degiskenler.some((s) => s.id === istenen)
    ? istenen
    : (degiskenler.find((s) => s.tur === 'sayi') ?? degiskenler[0])?.id ?? null;

  const sayisalSayi = degiskenler.filter((s) => s.tur === 'sayi').length;
  const onerilen = onerilenSekme(ornek);
  const sekme: GrafikTuru = sayisalSayi >= (GEREKEN_SAYISAL[onerilen] ?? 0) ? onerilen : 'nokta';

  const grup = ozellikler.has('grupla') ? sutunKimligi(tablo, ornek.grupla, 'etiket') : null;
  const ikinci = grup ?? sutunKimligi(tablo, ornek.karsilastir);

  const s = ornek.acilis?.secenekler ?? {};
  return {
    sekme,
    degisken,
    ikinciDegisken: ikinci !== null && ikinci !== degisken ? ikinci : null,
    renkDegisken: sutunKimligi(tablo, ornek.renkDegisken, 'etiket'),
    yDegisken: null,
    secenekler: {
      ortalama: s.ortalama === true,
      oms: s.oms === true,
      etiketler: s.etiketler === true,
      ortanca: ozellikler.has('ortanca') && s.ortanca === true,
    },
    sutunModu: ornek.acilis?.sutunModu === true,
    aralik: ozellikler.has('acilisAralik') && ornek.acilis?.aralik ? ornek.acilis.aralik : null,
    daireModu: ozellikler.has('daireSiklik') ? ornek.daire : 'satir',
    kategoriSiralari: ozellikler.has('kategoriSirasi') ? kimlikEslemesi(tablo, ornek.kategoriSirasi, 'etiket') : {},
    yuzdeDegisim: ozellikler.has('yuzdeDegisim') ? kimlikEslemesi(tablo, ornek.yuzdeDegisim, 'sayi') : {},
  };
}

/** Grafik türlerinin ekrandaki adları (durum.ts'teki SEKMELER ile aynı; rehber.ts durum.ts'i içe aktarmaz) */
const GRAFIK_ADLARI: Record<GrafikTuru, string> = {
  nokta: 'Nokta',
  sutun: 'Sütun',
  cizgi: 'Çizgi',
  daire: 'Daire',
  sacilim: 'Saçılım',
  istatistik: 'İstatistik',
};

/**
 * Keşif şeridinin metni, sekmeye duyarlı: önerilen sekmede `aciklama`; öteki sekmelerde o sekmenin ipucu.
 * Önerilen sekmenin talimatı başka sekmede yinelenmez: ipucu boş metinse şerit yalnız araştırma sorusunu gösterir
 * (boş metin döner), ipucu hiç yazılmamışsa kısa bir yönlendirme ("Bu veri için önerilen grafik: Daire.") gelir.
 * Özellikli metin yalnız özelliği varken kullanılır, yoksa bugünkü metne düşülür.
 */
export function seritMetni(ornek: OrnekVeri, sekme: GrafikTuru, ozellikler: ReadonlySet<Ozellik>): string {
  const onerilen = onerilenSekme(ornek);
  if (sekme !== onerilen) {
    const ozellikli = ornek.sekmeIpucuOzellikli?.[sekme];
    if (ozellikli && ozellikler.has(ozellikli.gerektirir)) return ozellikli.metin;
    const duz = ornek.sekmeIpucu?.[sekme];
    if (duz !== undefined) return duz.trim();
    return `Bu veri için önerilen grafik: ${GRAFIK_ADLARI[onerilen]}.`;
  }
  const ao = ornek.aciklamaOzellikli;
  return ao && ozellikler.has(ao.gerektirir) ? ao.metin : ornek.aciklama;
}

/** Keşif kartında gösterilen adım: eylem özellik kümesine göre çözülmüş (özellik yoksa yedek eylem ya da null) */
export interface EtkinRehberAdimi {
  tur: RehberAdimi['tur'];
  baslik: string;
  soru: string;
  cevap: string;
  eylem: RehberEylemi | null;
}

function etkinEylem(adim: RehberAdimi, ozellikler: ReadonlySet<Ozellik>): RehberEylemi | null {
  const e = adim.eylem;
  if (!e) return null;
  if (!e.gerektirir || ozellikler.has(e.gerektirir)) return e;
  return adim.yedekEylem ?? null;
}

export function rehberAdimlari(ornek: OrnekVeri, ozellikler: ReadonlySet<Ozellik>): EtkinRehberAdimi[] {
  return ornek.rehber.map((a) => ({ tur: a.tur, baslik: a.baslik, soru: a.soru, cevap: a.cevap, eylem: etkinEylem(a, ozellikler) }));
}

/** Rehber eyleminin uygulamaya etkisi; verilmeyen alan değişmez. `tablo` ve `tost` birlikte gelirse C [Geri al] sunar */
export interface EylemYamasi {
  sekme?: GrafikTuru;
  secenekler?: Partial<AcilisSecenekleri>;
  sutunModu?: boolean;
  aralik?: number | null;
  tablo?: VeriTablosu;
  tost?: string;
  /** Aydınlatılacak satır (nokta / sütun / dilim ve tablo satırı); C bunu seçili satır yapar */
  vurguSatir?: number | null;
}

/** İlk sütunda (satır adı) etiketi verilen ilk satır; yoksa -1 */
function satirBul(tablo: VeriTablosu, etiket: string): number {
  const aranan = etiket.trim();
  return tablo.satirlar.findIndex((r) => (r.hucreler[0] ?? '').trim() === aranan);
}

function hucreMetni(deger: string | number): string {
  return typeof deger === 'number' ? sayiYaz(deger, 6) : deger;
}

/**
 * Rehber düğmesine basılınca yapılacaklar. Görünüm eylemleri (seçenek, sekme, aralık, satır vurgusu) yalnız
 * görünümü değiştirir; `hucre` ve `satirEkle` yeni tablo ve geri alınabilir bir bildirim verir. Seçenekler açılır
 * (kapatılmaz) ve nokta grafiğine geçilir: ortalama, sapma ve sayılar nokta grafiğinde görünür.
 * `surukle` ve `yok` düğme değildir: boş yama.
 */
export function eylemYamasi(
  eylem: RehberEylemi,
  tablo: VeriTablosu,
  mevcut: { secenekler: { ortalama: boolean; oms: boolean; etiketler: boolean; ortanca?: boolean }; sutunModu: boolean },
): EylemYamasi {
  switch (eylem.tur) {
    case 'secenek': {
      const secenekler: AcilisSecenekleri = { ...mevcut.secenekler, ortanca: mevcut.secenekler.ortanca === true };
      let sutunModu = mevcut.sutunModu;
      for (const a of eylem.ac) {
        if (a === 'sutunModu') sutunModu = true;
        else secenekler[a] = true;
      }
      return sutunModu === mevcut.sutunModu ? { sekme: 'nokta', secenekler } : { sekme: 'nokta', secenekler, sutunModu };
    }
    case 'sekme':
      return { sekme: eylem.sekme };
    case 'aralik':
      return { sekme: 'nokta', aralik: eylem.aralik };
    case 'satirVurgula': {
      const satir = satirBul(tablo, eylem.satir);
      return satir >= 0 ? { vurguSatir: satir } : { vurguSatir: null, tost: `${eylem.satir} satırı tabloda bulunamadı.` };
    }
    case 'hucre': {
      const satir = satirBul(tablo, eylem.satir);
      const sutun = tablo.sutunlar.findIndex((s) => s.ad === eylem.sutun);
      if (satir < 0 || sutun < 0) return { tost: `${eylem.satir} satırı ya da ${eylem.sutun} sütunu tabloda bulunamadı.` };
      const eski = tablo.satirlar[satir].hucreler[sutun] ?? '';
      const yeni = sayiYaz(eylem.deger, 6);
      if (sayiOku(eski) === eylem.deger) return { vurguSatir: satir, tost: `${eylem.satir} · ${eylem.sutun} zaten ${yeni}.` };
      return {
        tablo: hucreYaz(tablo, satir, sutun, yeni),
        vurguSatir: satir,
        tost: `${eylem.satir} · ${eylem.sutun}: ${eski.trim() || 'boş'} → ${yeni}`,
      };
    }
    case 'satirEkle': {
      const hucreler = tablo.sutunlar.map((_, i) => (eylem.hucreler[i] === undefined ? '' : hucreMetni(eylem.hucreler[i])));
      const yeniTablo: VeriTablosu = { ...tablo, satirlar: [...tablo.satirlar, { id: kimlikUret('r'), hucreler }] };
      return {
        tablo: yeniTablo,
        vurguSatir: yeniTablo.satirlar.length - 1,
        tost: `Satır eklendi: ${hucreler.filter((h) => h !== '').join(' · ')}`,
      };
    }
    default:
      return {};
  }
}

/** Künye satırı: verinin kim / ne zaman / nasıl toplandığını anlatan tek cümle; hassas ölçümde kod notu */
export function kunyeMetni(ornek: OrnekVeri): string {
  const cumle = ornek.hikaye.cumle.trim();
  if (ornek.hassas && !/adlar yerine kod/i.test(cumle)) return `${cumle} Adlar yerine kod kullanıldı.`;
  return cumle;
}

/**
 * Keşif kartının öğrenciye görünen rozeti: yalnız sınıf düzeyi ("6. sınıf"); programda olmayan örnekte
 * "Zenginleştirme". Kazanım kodları öğretmen bölümündedir (`kazanimMetni`).
 */
export function rozetMetni(ornek: OrnekVeri): string {
  if (ornek.kazanim.length === 0) return 'Zenginleştirme';
  return ornek.sinif !== null ? `${ornek.sinif}. sınıf` : 'Örnek veri';
}

/**
 * Kazanım kodları " · " ile: "MAT.7.6.1 · 7.6.2" (ilk koddan sonra "MAT." yinelenmez; Veri topla öğretmen kartıyla
 * aynı biçim). Programda olmayan örnekte "Programda yok (zenginleştirme)".
 */
export function kazanimMetni(ornek: OrnekVeri): string {
  if (ornek.kazanim.length === 0) return 'Programda yok (zenginleştirme)';
  return ornek.kazanim.map((k, i) => (i === 0 ? k : k.replace(/^MAT\./, ''))).join(' · ');
}

/** Bağlantının alan adı ("https://cdn.who.int/…" → "who.int") */
function alanAdi(url: string): string {
  try {
    return new URL(url).hostname.replace(/^(www|cdn)\./, '');
  } catch {
    return url;
  }
}

/** Kaynağın bağlantısı (gerçek veride MGM sayfası, kurgusal veride dayandığı referans); yoksa null */
export function kaynakBaglantisi(ornek: OrnekVeri): { ad: string; url: string } | null {
  const url = ornek.kaynak.url;
  if (!url || !/^https?:\/\//.test(url)) return null;
  return { ad: ornek.kaynak.ad, url };
}

/**
 * Kaynağın bütün bağlantıları kısa adlarıyla: iklim → "MGM: Erzurum", "İzmir"; boy → "WHO: erkek", "kız". Kısa ad
 * verilmemişse alan adı ("who.int"). Yalnız http(s) bağlantıları.
 */
export function kaynakBaglantilari(ornek: OrnekVeri): { ad: string; url: string }[] {
  const k = ornek.kaynak;
  const sonuc: { ad: string; url: string }[] = [];
  for (const [url, ad] of [[k.url, k.urlAd], [k.url2, k.url2Ad]] as const) {
    if (url && /^https?:\/\//.test(url)) sonuc.push({ ad: ad?.trim() || alanAdi(url), url });
  }
  return sonuc;
}
