/**
 * Veri ve Grafik — uygulama durumu ve kalıcılık (saf, React'siz).
 * Veri kümeleri: "Tablom" (elle girilen / örnek veri / araştırma verisi) ve "Deney özeti" (Tablom'dan ve araştırmanın
 * deney çalışmalarından türetilen, salt okunur küme). Etkin küme tabloyu ve bütün grafikleri belirler; her kümenin
 * görünümü (eksen, karşılaştırma, aralık, sekme, seçenekler, renk anahtarı) ayrı saklanır. Eski kayıtlar
 * sorunsuz açılır (eski örnekleyicinin kaydı `durumCoz`'da taşınır); bozuk kayıt varsayılana döner.
 *
 * Tablo güvenliği: Tablom'u yeni bir tabloyla değiştiren her yol (örnek yükleme, yeni araştırma) `tabloDegistir`
 * üzerinden geçer; korunmaya değer eski tablo görünümüyle birlikte `oncekiTablo`'ya yazılır ve
 * `oncekiTabloyaDon` ile geri gelir (kalıcı, tek adım).
 */
import type { NoktaSecenekleri } from './NoktaGrafigi';
import {
  ORNEK_VERILER,
  ornekBul,
  ornekVeriOlustur,
  tabloDogrula,
  tumunuTemizle,
  type GrafikTuru,
  type OrnekVeri,
  type Ozellik,
  type RehberEylemi,
  type VeriTablosu,
} from './veri';
import { SIRA_SUTUNLARI, degiskenSutunlari } from './kategorik';
import { arastirmaBagli, arastirmaDogrula, arastirmaTurleriniOnar, type Arastirma } from './arastirma';
import { OZET_SUTUNU, fiil, fiilCogul, ozetTablosu } from './deney';
import { acilisYamasi, eylemYamasi, type EylemYamasi } from './rehber';

export type Sekme = GrafikTuru;

export const SEKMELER: { id: Sekme; ad: string }[] = [
  { id: 'nokta', ad: 'Nokta' },
  { id: 'sutun', ad: 'Sütun' },
  { id: 'cizgi', ad: 'Çizgi' },
  { id: 'daire', ad: 'Daire' },
  { id: 'sacilim', ad: 'Saçılım' },
  { id: 'istatistik', ad: 'İstatistik' },
];

/** Grafiğin veri türü gereksinimi: çizgi en az bir, saçılım en az iki sayısal değişken ister */
export const GEREKEN_SAYISAL: Partial<Record<Sekme, number>> = { cizgi: 1, sacilim: 2 };

/** Sekme bu tablonun veri türleriyle çizilebilir mi (sayısal değişken sayısına göre) */
export function sekmeKullanilabilir(sekme: Sekme, sayisalDegiskenSayisi: number): boolean {
  return sayisalDegiskenSayisi >= (GEREKEN_SAYISAL[sekme] ?? 0);
}

/** Veri kümeleri: kendi tablonuz ve (deney araştırmasında) ondan türetilen Deney özeti */
export type KumeId = 'tablom' | 'ozet';

export const KUMELER: { id: KumeId; ad: string }[] = [
  { id: 'tablom', ad: 'Tablom' },
  { id: 'ozet', ad: 'Deney özeti' },
];

export interface Gorunum {
  degisken: string | null;
  ikinciDegisken: string | null;
  aralik: number | null;
}

/**
 * Bir tablonun bütün görünümü: eksen atamasıyla birlikte sekme, grafik seçenekleri, saçılım ekseni, renk anahtarı ve
 * dairede sayısal değişkenin dilim seçimi (`daireModu`: tablonun verisine bağlıdır; tablo değişince sıfırlanır, tablo
 * geri gelince onunla geri gelir)
 */
export interface GorunumTam extends Gorunum {
  sekme?: Sekme;
  secenekler?: NoktaSecenekleri;
  sutunModu?: boolean;
  yDegisken?: string | null;
  renkDegisken?: string | null;
  daireModu?: DaireModu | null;
}

/** Tablom'dan önce açık olan tablo ("Önceki tabloya dön"); örnekle bağı da saklanır ki iki dönüş başa getirsin */
export interface OncekiTablo {
  tablo: VeriTablosu;
  /** menüde ve bildirimde görünen ad ("Boy (cm)" ya da örnek adı) */
  ad: string;
  gorunum: GorunumTam;
  ornekId?: string | null;
  ornekTemiz?: boolean;
  /**
   * Tablo saklanırken bağlı olduğu araştırma (yoksa null / eski kayıtta tanımsız). Tablo geri gelince araştırma da
   * gelir: veri toplanmadan kapatılan yeni plan ya da yanlışlıkla seçilen hazır soru önceki araştırmayı (soru şeridi,
   * kategori sırası, deney çalışmaları) koparmaz.
   */
  arastirma?: Arastirma | null;
}

/** Daire sekmesinde sayısal değişken: her satır bir dilim ya da değerlerin sıklığı */
export type DaireModu = 'satir' | 'siklik';
export const DAIRE_MODLARI: readonly DaireModu[] = ['satir', 'siklik'];

/** Örnek ipucunun (Keşif kartı) görünümü: kapalı, tek satırlık şerit ya da açık kart */
export type IpucuDurumu = 'kapali' | 'serit' | 'kart';
export const IPUCU_DURUMLARI: readonly IpucuDurumu[] = ['kapali', 'serit', 'kart'];

export interface Durum {
  surum: 1;
  /** "Tablom" veri kümesi (eski kayıtlarla uyumlu alan adı) */
  tablo: VeriTablosu;
  sekme: Sekme;
  /** etkin kümede nokta grafiği eksenine atanmış sütun kimliği (null = dağınık) */
  degisken: string | null;
  /** karşılaştırma için ikinci nokta grafiği */
  ikinciDegisken: string | null;
  /** saçılım grafiğinin dikey ekseni (null = yatay eksenden sonraki ilk sayısal değişken) */
  yDegisken: string | null;
  /** renk anahtarı: noktaları / sütunları / tablo satırlarını renklendiren kategorik değişken (null = ilk kategorik, RENKSIZ = renksiz) */
  renkDegisken?: string | null;
  /** null = otomatik */
  aralik: number | null;
  secenekler: NoktaSecenekleri;
  sutunModu: boolean;
  yuvarlamaAdimi: number;
  adimlariGoster: boolean;
  etkinKume: KumeId;
  /** etkin olmayan kümelerin saklı görünümleri (eski kayıtlarda yalnız eksen ataması) */
  gorunumler: Partial<Record<KumeId, GorunumTam>>;
  /** Tablom'dan önceki tablo (kalıcı, tek adım; örnek veri menüsünün en üstünde "Önceki tabloya dön") */
  oncekiTablo: OncekiTablo | null;
  /** Tablom'un adı: örnek adı (ya da araştırma değişkeni); kullanıcının kendi tablosunda null */
  tabloAdi: string | null;
  /** Tablom bir örnek veriden geldiyse örneğin kimliği */
  ornekId: string | null;
  /** Tablom örneğin hiç değiştirilmemiş hâli mi (değiştirilmemiş örnek önceki tablo olarak saklanmaz) */
  ornekTemiz: boolean;
  /** Veri toplama araştırması (soru, yöntem, plan, deney çalışmaları); Tablom'a bağlı sütunları `arastirma.sutunlar` */
  arastirma: Arastirma | null;
  /** "Veri topla" paneli açık mı */
  toplamaAcik: boolean;
  /** Örnek ipucunun görünümü (kalıcı) */
  ipucu: IpucuDurumu;
  /** Daire sekmesinde sayısal değişkenin kullanıcı seçimi (null = örneğe ya da veriye göre) */
  daireModu: DaireModu | null;
  /** Çizgi grafiğinde her noktanın değeri yazılsın mı ("Değerleri göster"; kalıcı) */
  degerleriGoster: boolean;
  /**
   * Veri topla paneli açıkken grafiğin altındaki tablo bandı açık mı (kalıcı; varsayılan kapalı: tek satırlık
   * "Tablo · 24 satır · son: Elma" özeti)
   */
  tabloBandiAcik: boolean;
  /**
   * K3 (VT §4.7): plan yeni tablo açtığında plandan hemen önce görünen tablo `oncekiTablo`'ya yazılmadıysa
   * (değiştirilmemiş örnek, önceki tablo doluyken) onun görünümlü anlık görüntüsü. Veri toplanmadan kapatılınca bu
   * geri gelir, `oncekiTablo` olduğu gibi kalır. Başka bir tablo değişikliği ya da veri toplanması onu siler.
   */
  toplamaOncesi?: OncekiTablo | null;
}

/** Açılış örneği: ilk açılışta Tablom bu örnekle gelir */
export const ACILIS_ORNEGI = 'boy';

/**
 * Uygulamaya bağlanmış özellikler (`rehber.ts`): özelliğe dayanan rehber eylemleri ve metinler yalnız özellik bu
 * kümedeyken kullanılır, yoksa yedek eylem ya da bugünkü metin gelir. 'dengele' (toplamı koruyan sütun sürükleme;
 * ertelendi) dışında hepsi bağlı.
 * - acilisAralik: örnek açılışında nokta grafiği grup genişliği (`ornegiYukle`)
 * - kategoriSirasi: örnekteki kategori sırası (bağlıyken bütün grafiklerde, tabloda ve renk anahtarında)
 * - yuzdeDegisim: çizgi grafiğinin değişim etiketinde yüzde, sütuna göre (°C'de yüzde yok)
 * - terimler: ekrandaki terimler ders kitabıyla aynı (Ortanca, Tepe değer, Sıklık …)
 * - ortanca: nokta grafiğinin seçenek şeridinde "Ortanca" düğmesi (`secenekler.ortanca`)
 * - grupla: "Karşılaştır" kategorik değişkene göre gruplara ayırır (alt alta paneller, ortak eksen)
 * - daireSiklik: sayısal değişkende Daire "değerlerin sıklığı" ya da "uygun değil" bilgi kutusu (`daireModu`)
 * - daireYuvarlama: daire sürüklemesinde "Sürüklerken yuvarla" adımı
 */
export const OZELLIKLER: ReadonlySet<Ozellik> = new Set<Ozellik>([
  'acilisAralik',
  'kategoriSirasi',
  'yuzdeDegisim',
  'terimler',
  'ortanca',
  'grupla',
  'daireSiklik',
  'daireYuvarlama',
]);

export function baslangicDurumu(): Durum {
  return {
    surum: 1,
    oncekiTablo: null,
    tabloAdi: ORNEK_VERILER.find((o) => o.id === ACILIS_ORNEGI)?.ad ?? null,
    ornekId: ACILIS_ORNEGI,
    ornekTemiz: true,
    tablo: ornekVeriOlustur(ACILIS_ORNEGI),
    sekme: 'nokta',
    degisken: null,
    ikinciDegisken: null,
    yDegisken: null,
    aralik: null,
    secenekler: { ortalama: false, oms: false, etiketler: false, ortanca: false },
    sutunModu: false,
    yuvarlamaAdimi: 1,
    adimlariGoster: false,
    etkinKume: 'tablom',
    gorunumler: {},
    arastirma: null,
    toplamaAcik: false,
    ipucu: 'serit',
    daireModu: null,
    degerleriGoster: false,
    tabloBandiAcik: false,
  };
}

function gorunumDogrula(ham: unknown): Gorunum | undefined {
  if (!ham || typeof ham !== 'object') return undefined;
  const g = ham as Record<string, unknown>;
  return {
    degisken: typeof g.degisken === 'string' ? g.degisken : null,
    ikinciDegisken: typeof g.ikinciDegisken === 'string' ? g.ikinciDegisken : null,
    aralik: typeof g.aralik === 'number' && g.aralik > 0 && Number.isFinite(g.aralik) ? g.aralik : null,
  };
}

const AD_SINIRI = 80;

/** Kayıttaki ad: metin değilse null, boşluklar kırpılır, en çok 80 karakter */
function adDogrula(ham: unknown): string | null {
  if (typeof ham !== 'string') return null;
  const ad = ham.trim().slice(0, AD_SINIRI);
  return ad === '' ? null : ad;
}

function seceneklerDogrula(ham: unknown): NoktaSecenekleri {
  const s = ham && typeof ham === 'object' ? (ham as Record<string, unknown>) : {};
  return { ortalama: s.ortalama === true, oms: s.oms === true, etiketler: s.etiketler === true, ortanca: s.ortanca === true };
}

function gorunumTamDogrula(ham: unknown): GorunumTam {
  const temel = gorunumDogrula(ham) ?? { degisken: null, ikinciDegisken: null, aralik: null };
  const g = ham && typeof ham === 'object' ? (ham as Record<string, unknown>) : {};
  return {
    ...temel,
    ...(SEKMELER.some((s) => s.id === g.sekme) ? { sekme: g.sekme as Sekme } : {}),
    ...(g.secenekler && typeof g.secenekler === 'object' ? { secenekler: seceneklerDogrula(g.secenekler) } : {}),
    sutunModu: g.sutunModu === true,
    yDegisken: typeof g.yDegisken === 'string' ? g.yDegisken : null,
    renkDegisken: typeof g.renkDegisken === 'string' ? g.renkDegisken : null,
    daireModu: DAIRE_MODLARI.includes(g.daireModu as DaireModu) ? (g.daireModu as DaireModu) : null,
  };
}

/**
 * Bir kümenin saklı görünümü: eksen ataması her zaman; sekme, seçenekler, sütun modu, saçılım ekseni ve renk anahtarı
 * yalnız kayıtta varsa (eski kayıtlarda yoktur; küme değişiminde o alanlar olduğu gibi kalır). Nesne değilse undefined.
 */
function kayitliGorunumDogrula(ham: unknown): GorunumTam | undefined {
  const temel = gorunumDogrula(ham);
  if (!temel) return undefined;
  const g = ham as Record<string, unknown>;
  const kimlikMi = (x: unknown): x is string | null => x === null || typeof x === 'string';
  return {
    ...temel,
    ...(SEKMELER.some((s) => s.id === g.sekme) ? { sekme: g.sekme as Sekme } : {}),
    ...(g.secenekler && typeof g.secenekler === 'object' ? { secenekler: seceneklerDogrula(g.secenekler) } : {}),
    ...(typeof g.sutunModu === 'boolean' ? { sutunModu: g.sutunModu } : {}),
    ...(kimlikMi(g.yDegisken) ? { yDegisken: g.yDegisken } : {}),
    ...(kimlikMi(g.renkDegisken) ? { renkDegisken: g.renkDegisken } : {}),
    ...(g.daireModu === null || DAIRE_MODLARI.includes(g.daireModu as DaireModu) ? { daireModu: g.daireModu as DaireModu | null } : {}),
  };
}

/** Kayıttaki önceki tablo: tablosu okunamıyorsa null */
function oncekiTabloDogrula(ham: unknown): OncekiTablo | null {
  if (!ham || typeof ham !== 'object') return null;
  const o = ham as Record<string, unknown>;
  const hamTablo = tabloDogrula(o.tablo);
  if (!hamTablo) return null;
  return {
    // Saklanmış bir araştırma tablosunun sayısal ilk sütunu (araştırması artık bağlı değil) rolünden onarılır
    tablo: arastirmaTurleriniOnar(hamTablo, null),
    ad: adDogrula(o.ad) ?? 'Önceki tablo',
    gorunum: gorunumTamDogrula(o.gorunum),
    ornekId: adDogrula(o.ornekId),
    ornekTemiz: o.ornekTemiz === true,
    arastirma: arastirmaDogrula(o.arastirma),
  };
}

// ── Küme görünümleri ──

/** Etkin kümenin bütün görünümü (bütün alanlar dolu) */
type DoluGorunum = Required<GorunumTam>;

function gorunumAl(d: Durum): DoluGorunum {
  return {
    degisken: d.degisken,
    ikinciDegisken: d.ikinciDegisken,
    aralik: d.aralik,
    sekme: d.sekme,
    secenekler: d.secenekler,
    sutunModu: d.sutunModu,
    yDegisken: d.yDegisken,
    renkDegisken: d.renkDegisken ?? null,
    daireModu: d.daireModu ?? null,
  };
}

/**
 * Saklı bir görünümü geri getirir: eksen ataması saklanandan (yoksa boş; eksenDuzelt atar), sütun modu saklanandan
 * (yoksa kapalı); sekme, seçenekler, saçılım ekseni ve renk anahtarı saklıysa saklanandan, değilse şimdiki görünümden.
 * Daire modu verinin kendisine bağlıdır: saklıysa saklanan, değilse otomatik (null; başka kümenin seçimi taşınmaz).
 */
function gorunumGeriGetir(simdiki: DoluGorunum, kayitli: Partial<GorunumTam> | undefined): DoluGorunum {
  const k = kayitli ?? {};
  return {
    degisken: k.degisken ?? null,
    ikinciDegisken: k.ikinciDegisken ?? null,
    aralik: k.aralik ?? null,
    sekme: k.sekme ?? simdiki.sekme,
    secenekler: k.secenekler ?? simdiki.secenekler,
    sutunModu: k.sutunModu ?? false,
    yDegisken: k.yDegisken !== undefined ? k.yDegisken : simdiki.yDegisken,
    renkDegisken: k.renkDegisken !== undefined ? k.renkDegisken : simdiki.renkDegisken,
    daireModu: k.daireModu ?? null,
  };
}

/** Deney özeti kümesi yalnız bir deney araştırmasında anlamlıdır */
function ozetKullanilabilir(arastirma: Arastirma | null): boolean {
  return arastirma?.yontem === 'deney';
}

/** Eski örnekleyicinin deney sonuçları göçte bu adla önceki tablo olur (VT §9.4) */
export const ESKI_DENEY_ADI = 'Eski deney sonuçları';

/**
 * Göç: eski örnekleyicinin "Deney sonuçları" tablosu (kayıttaki `deneyTablosu`). Okunabilir ve doluysa, çekiliş numarası
 * sütunu (satır numarasının aynısı) çıkarılarak "Eski deney sonuçları" adıyla önceki tablo olur; değilse null.
 */
function eskiDeneyTablosu(ham: unknown): OncekiTablo | null {
  const eski = ham ? tabloDogrula(ham) : null;
  if (!eski || eski.satirlar.length === 0) return null;
  const tut = eski.sutunlar.map((_, j) => j).filter((j) => !SIRA_SUTUNLARI.has(eski.sutunlar[j].id));
  if (tut.length === 0) return null;
  return {
    tablo: {
      sutunlar: tut.map((j) => eski.sutunlar[j]),
      satirlar: eski.satirlar.map((r) => ({ ...r, hucreler: tut.map((j) => r.hucreler[j] ?? '') })),
    },
    ad: ESKI_DENEY_ADI,
    gorunum: { degisken: null, ikinciDegisken: null, aralik: null },
  };
}

/**
 * Kayıttan durum; Tablom okunamıyorsa null (çağıran varsayılanı kullanır). Diğer alanlar tek tek düzeltilir.
 *
 * Eski örnekleyicinin kaydı taşınır (VT §9.4 göç; Tablom hiç değişmez):
 * - "Deney sonuçları" ya da "Ölçümler" kümesi açıksa Tablom'a dönülür (görünümü `gorunumler.tablom`'dan gelir);
 * - eski panel açıktıysa (`ornekleyiciAcik`) Veri topla paneli açık gelir;
 * - eski deney tablosu doluysa ve önceki tablo yoksa, çekiliş numarası sütunu çıkarılarak "Eski deney sonuçları"
 *   adıyla önceki tablo olur (veri kaybolmaz; Örnek veri ▸ Önceki tabloya dön);
 * - ölçüm tablosu ve örnekleyici ayarı okunmaz (ölçüm müfredat dışı; deney önceki tabloda).
 */
export function durumCoz(ham: unknown): Durum | null {
  if (!ham || typeof ham !== 'object') return null;
  const nesne = ham as Partial<Record<keyof Durum | 'sacilimRenk' | 'deneyTablosu' | 'ornekleyiciAcik', unknown>>;
  const hamTablo = tabloDogrula(nesne.tablo);
  if (!hamTablo) return null;
  const temel = baslangicDurumu();
  // Bozuk araştırma hata atmaz: nesne değilse null, nesneyse onarılmış geçerli araştırma
  const arastirma = arastirmaDogrula(nesne.arastirma);
  // tabloDogrula araştırma sütununun kayıttaki türünü korur; arastirmaTurleriniOnar yalnız eski kayıtlar içindir
  // (eskiden sayısal ilk sütun — ölçüm değeri, sayı küpü, sayısal anket cevabı — etikete dönüyordu): plandaki türe
  // döndürür, idempotenttir (değişiklik yoksa aynı tablo)
  const tablo = arastirmaTurleriniOnar(hamTablo, arastirma);
  const gorunumHam = nesne.gorunumler && typeof nesne.gorunumler === 'object' ? (nesne.gorunumler as Record<string, unknown>) : {};
  const gorunumler: Partial<Record<KumeId, GorunumTam>> = {};
  for (const k of KUMELER) {
    const g = kayitliGorunumDogrula(gorunumHam[k.id]);
    if (g) gorunumler[k.id] = g;
  }
  const kayitli: DoluGorunum = {
    degisken: typeof nesne.degisken === 'string' ? nesne.degisken : null,
    ikinciDegisken: typeof nesne.ikinciDegisken === 'string' ? nesne.ikinciDegisken : null,
    aralik: typeof nesne.aralik === 'number' && nesne.aralik > 0 && Number.isFinite(nesne.aralik) ? nesne.aralik : null,
    sekme: SEKMELER.some((s) => s.id === nesne.sekme) ? (nesne.sekme as Sekme) : temel.sekme,
    secenekler: seceneklerDogrula(nesne.secenekler),
    sutunModu: nesne.sutunModu === true,
    yDegisken: typeof nesne.yDegisken === 'string' ? nesne.yDegisken : null,
    // Eski kayıtlarda alanın adı sacilimRenk idi
    renkDegisken: typeof nesne.renkDegisken === 'string' ? nesne.renkDegisken : typeof nesne.sacilimRenk === 'string' ? nesne.sacilimRenk : null,
    daireModu: DAIRE_MODLARI.includes(nesne.daireModu as DaireModu) ? (nesne.daireModu as DaireModu) : null,
  };
  // Etkin küme: Deney özeti yalnız bir deney araştırmasıyla açılır. Özet kullanılamıyorsa ya da kayıtta eski
  // örnekleyicinin kümesi ('deney', 'olcum') açıksa Tablom'a dönülür; kayıttaki görünüm o kümenindir, Tablom'un
  // görünümü saklıysa o gelir. Küme kayıtta yoksa (eski şema) ya da bilinmiyorsa görünüm Tablom'undur.
  const ozetAcik = nesne.etkinKume === 'ozet' && ozetKullanilabilir(arastirma);
  const etkinKume: KumeId = ozetAcik ? 'ozet' : 'tablom';
  const baskaKume = !ozetAcik && (nesne.etkinKume === 'ozet' || nesne.etkinKume === 'deney' || nesne.etkinKume === 'olcum');
  const gorunum = baskaKume ? gorunumGeriGetir(kayitli, gorunumler.tablom) : kayitli;
  // Örnek bağı yalnız örnek hâlâ varsa kurulur. Değiştirilmemiş örneğin verisi örneğin bugünkü verisinden farklıysa
  // (örnek sonradan güncellendi) bağ kurulmaz: rehberin cevapları tablodaki veriyle çelişmesin; tablo kullanıcıda kalır
  let ornekId = adDogrula(nesne.ornekId);
  let ornekTemiz = nesne.ornekTemiz === true;
  const ornek = ornekId ? ornekBul(ornekId) : undefined;
  if (ornekId && (!ornek || (ornekTemiz && !ayniIcerik(tablo, ornek.olustur())))) {
    ornekId = null;
    ornekTemiz = false;
  }
  return {
    ...temel,
    tablo,
    ...gorunum,
    yuvarlamaAdimi: [1, 0.5, 0.1].includes(nesne.yuvarlamaAdimi as number) ? (nesne.yuvarlamaAdimi as number) : 1,
    adimlariGoster: nesne.adimlariGoster === true,
    etkinKume,
    gorunumler,
    // Tablo güvenliği alanları: eski kayıtta yoksa Tablom kullanıcının kendi tablosu sayılır (örnekle bağı yok). Önceki
    // tablo yoksa eski örnekleyicinin dolu deney tablosu önceki tablo olur (göç)
    oncekiTablo: oncekiTabloDogrula(nesne.oncekiTablo) ?? eskiDeneyTablosu(nesne.deneyTablosu),
    tabloAdi: adDogrula(nesne.tabloAdi),
    ornekId,
    ornekTemiz,
    arastirma,
    // Eski örnekleyici açık kaydedildiyse (göç) Veri topla paneli açık gelir; eski panel bir daha kaydedilmez
    toplamaAcik: nesne.toplamaAcik === true || nesne.ornekleyiciAcik === true,
    // İpucu kayıtta yoksa: örneğe bağlı tabloda şerit, kendi tablonuzda kapalı
    ipucu: IPUCU_DURUMLARI.includes(nesne.ipucu as IpucuDurumu) ? (nesne.ipucu as IpucuDurumu) : ornekId ? 'serit' : 'kapali',
    // daireModu görünümle (`...gorunum`) gelir: kayıttaki küme başkaysa Tablom'un saklı seçimi, yoksa otomatik
    degerleriGoster: nesne.degerleriGoster === true,
    tabloBandiAcik: nesne.tabloBandiAcik === true,
    toplamaOncesi: oncekiTabloDogrula(nesne.toplamaOncesi),
  };
}

/** JSON metninden durum (bozuk JSON → null) */
export function durumMetindenCoz(metin: string | null): Durum | null {
  if (!metin) return null;
  try {
    return durumCoz(JSON.parse(metin));
  } catch {
    return null;
  }
}

/**
 * Deney özeti türetilmiştir ve her çağrıda Tablom'u tarar: aynı Tablom ve araştırma için son sonuç yeniden
 * kullanılır (etkinTablo aynı nesneyi döndürür; eksenDuzelt / sekmeDuzelt ve bileşenlerdeki useMemo boşa dönmez).
 */
let ozetBellegi: { tablo: VeriTablosu; arastirma: Arastirma | null; sonuc: VeriTablosu } | null = null;

function ozetKumesi(tablo: VeriTablosu, arastirma: Arastirma | null): VeriTablosu {
  const b = ozetBellegi;
  if (b && b.tablo === tablo && b.arastirma === arastirma) return b.sonuc;
  const sonuc = ozetTablosu(tablo, arastirma);
  ozetBellegi = { tablo, arastirma, sonuc };
  return sonuc;
}

/** Kümenin tablosu: Tablom ya da (Tablom'dan ve araştırmadan türetilen) Deney özeti */
export function kumeTablosu(d: Durum, kume: KumeId = d.etkinKume): VeriTablosu {
  return kume === 'ozet' ? ozetKumesi(d.tablo, d.arastirma) : d.tablo;
}

/** Etkin kümenin tablosu. Deney özeti: `ozetTablosu(d.tablo, d.arastirma)` */
export function etkinTablo(d: Durum): VeriTablosu {
  return kumeTablosu(d);
}

/** Etkin kümenin tablosunu değiştirir. Deney özeti salt okunurdur: durum aynen döner */
export function etkinTabloYaz(d: Durum, tablo: VeriTablosu): Durum {
  return d.etkinKume === 'ozet' ? d : { ...d, tablo };
}

/**
 * Kümenin varsayılan eksen değişkeni: deney özetinde göreli sıklık, kendi tablonuzda ilk sayısal sütun (yoksa ilk
 * kategorik). Tabloda değişken yoksa null.
 */
export function varsayilanEksen(tablo: VeriTablosu, kume: KumeId): string | null {
  const degiskenler = degiskenSutunlari(tablo);
  if (degiskenler.length === 0) return null;
  if (kume === 'ozet') return (degiskenler.find((s) => s.id === OZET_SUTUNU.oran) ?? degiskenler.find((s) => s.tur === 'sayi') ?? degiskenler[0]).id;
  return (degiskenler.find((s) => s.tur === 'sayi') ?? degiskenler[0]).id;
}

/**
 * Eksen her zaman seçili gelir: atanmamışsa (açılış, örnek veri, küme değişimi) ya da atanmış sütun artık
 * yoksa (silindi, tablo yeniden kuruldu) kümenin varsayılan değişkeni atanır. Karşılaştırma
 * değişkeni geçersizse ya da eksenle aynıysa kaldırılır (ör. teorik olasılık gösterilmeyen deney özetinde
 * oz-teorik). Değişiklik yoksa aynı nesne döner.
 */
export function eksenDuzelt(d: Durum): Durum {
  const tablo = etkinTablo(d);
  const degiskenler = degiskenSutunlari(tablo);
  const gecerli = (id: string | null) => id !== null && degiskenler.some((s) => s.id === id);
  let y = d;
  if (!gecerli(d.degisken)) {
    const yeni = varsayilanEksen(tablo, d.etkinKume);
    if (yeni !== d.degisken) y = { ...y, degisken: yeni, aralik: null, sutunModu: false };
  }
  if (y.ikinciDegisken !== null && (!gecerli(y.ikinciDegisken) || y.ikinciDegisken === y.degisken)) y = { ...y, ikinciDegisken: null };
  // Saçılımın dikey ekseni yalnız sayısal bir değişken olabilir; değilse varsayılana (null) döner
  if (y.yDegisken !== null && !degiskenler.some((s) => s.id === y.yDegisken && s.tur === 'sayi')) y = { ...y, yDegisken: null };
  // Renk anahtarı yalnız kategorik bir değişken olabilir (ya da bilerek "renksiz"); değilse otomatiğe döner
  if (y.renkDegisken && y.renkDegisken !== RENKSIZ && !degiskenler.some((s) => s.id === y.renkDegisken && s.tur === 'etiket')) y = { ...y, renkDegisken: null };
  return y;
}

/** Renk anahtarında "renklendirme yok" seçimi (null = otomatik: ilk kategorik değişken) */
export const RENKSIZ = '__renksiz__';

/**
 * Renk anahtarı: noktaları, sütunları ve tablo satırlarını renklendiren kategorik değişken. Seçilmişse o,
 * RENKSIZ ise null, seçilmemişse (ya da artık geçersizse) tablodaki ilk kategorik değişken; yoksa null.
 */
export function renkAnahtari(d: { renkDegisken?: string | null }, tablo: VeriTablosu): string | null {
  if (d.renkDegisken === RENKSIZ) return null;
  const kategorik = degiskenSutunlari(tablo).filter((s) => s.tur === 'etiket');
  return kategorik.some((s) => s.id === d.renkDegisken) ? (d.renkDegisken as string) : kategorik[0]?.id ?? null;
}

/**
 * Saçılım grafiğinin eksenleri ve renkleri: yatay eksen seçili değişken (kategorikse ilk sayısal değişken),
 * dikey eksen `yDegisken` ya da yatay eksenden başka ilk sayısal değişken; noktalar renk anahtarıyla (`renkDegisken`) seçilen
 * (verilmezse ilk) kategorik değişkene göre renklenir, RENKSIZ ise tek renk. İki sayısal değişken yoksa null.
 */
export function sacilimEksenleri(
  d: { degisken: string | null; yDegisken: string | null; renkDegisken?: string | null },
  tablo: VeriTablosu,
): { x: string; y: string; renk: string | null } | null {
  const degiskenler = degiskenSutunlari(tablo);
  const sayisal = degiskenler.filter((s) => s.tur === 'sayi');
  if (sayisal.length < 2) return null;
  const x = sayisal.some((s) => s.id === d.degisken) ? (d.degisken as string) : sayisal[0].id;
  const y = d.yDegisken && d.yDegisken !== x && sayisal.some((s) => s.id === d.yDegisken) ? d.yDegisken : sayisal.find((s) => s.id !== x)!.id;
  return { x, y, renk: renkAnahtari(d, tablo) };
}

/** Küme seçicide Deney özeti bu kadar satırdan itibaren görünür (tek deneyin özeti tabloyu yinelemekten öteye geçmez) */
export const OZET_EN_AZ_SATIR = 2;

/**
 * Tablo alanında seçilebilen kümeler (korunan karar 5: tek küme ilgiliyken seçici çizilmez). Deney özeti yalnız
 * Tablom'a bağlı bir deney araştırmasında ve özet en az 2 satırken görünür; özet zaten açıksa Tablom'a dönülebilsin
 * diye iki küme de kalır. Anket ve ölçümde yalnız Tablom.
 */
export function toplamaKumeleri(d: Durum): KumeId[] {
  if (d.etkinKume === 'ozet') return ['tablom', 'ozet'];
  const a = d.arastirma;
  if (!a || a.yontem !== 'deney' || !arastirmaBagli(d.tablo, a)) return ['tablom'];
  return ozetKumesi(d.tablo, a).satirlar.length >= OZET_EN_AZ_SATIR ? ['tablom', 'ozet'] : ['tablom'];
}

/**
 * Küme seçicideki ad: deney araştırmasında Tablom "Atışlar" ("Çevirmeler", "Çekişler"), öteki durumlarda "Tablom";
 * özet "Deney özeti".
 */
export function kumeEtiketi(d: Pick<Durum, 'tablo' | 'arastirma'>, kume: KumeId): string {
  if (kume === 'tablom') {
    const a = d.arastirma;
    if (a && a.yontem === 'deney' && arastirmaBagli(d.tablo, a)) {
      const c = fiilCogul(fiil(a.deney.nesne));
      return c.charAt(0).toLocaleUpperCase('tr') + c.slice(1);
    }
    return 'Tablom';
  }
  return KUMELER.find((k) => k.id === kume)?.ad ?? 'Tablom';
}

/**
 * Veri kümesini değiştirir: eski kümenin bütün görünümü (eksen, karşılaştırma, aralık, sekme, seçenekler, sütun
 * modu, saçılım ekseni, renk anahtarı) saklanır, yenisininki geri gelir; `gorunum` verilirse onun alanları üste
 * yazılır. Yeni kümenin saklı görünümü yoksa eksen ataması boş (eksenDuzelt atar) ve sütun modu kapalı gelir;
 * sekme, seçenekler, saçılım ekseni ve renk anahtarı olduğu gibi kalır. Aynı kümede yalnız `gorunum` uygulanır.
 */
export function kumeDegistir(d: Durum, kume: KumeId, gorunum?: Partial<GorunumTam>): Durum {
  const saklanan = gorunumAl(d);
  const gorunumler = { ...d.gorunumler, [d.etkinKume]: saklanan };
  const hedef: Partial<GorunumTam> = { ...(kume === d.etkinKume ? saklanan : gorunumler[kume]), ...gorunum };
  return { ...d, gorunumler, etkinKume: kume, ...gorunumGeriGetir(saklanan, hedef) };
}

// ── Sekme kapısı ──

/** Tablodaki sayısal değişken sayısı: araç çubuğundaki sekme kapısı ve `sekmeDuzelt` aynı sayımı kullanır */
export function sayisalDegiskenSayisi(tablo: VeriTablosu): number {
  return degiskenSutunlari(tablo).filter((s) => s.tur === 'sayi').length;
}

/**
 * Seçili sekme etkin tablonun veri türleriyle çizilemiyorsa (ör. Saçılım seçiliyken tabloda iki sayısal değişken
 * kalmadı) Nokta'ya döner. `setDurum` hattında `eksenDuzelt`'ten sonra her değişimde çalışır: panel, örnek veri,
 * sütun silme ve tür değiştirme yollarının hepsinde grafik çizilebilir kalır. Değişiklik yoksa aynı nesne döner.
 */
export function sekmeDuzelt(d: Durum): Durum {
  return sekmeKullanilabilir(d.sekme, sayisalDegiskenSayisi(etkinTablo(d))) ? d : { ...d, sekme: 'nokta' };
}

// ── Tablo güvenliği: önceki tablo ──

/** Tabloda hiç dolu hücre yok mu (satırsız ya da bütün hücreleri boş) */
export function tabloBosMu(tablo: VeriTablosu): boolean {
  return tablo.satirlar.every((s) => s.hucreler.every((h) => h.trim() === ''));
}

/** İki tablo içerikçe aynı mı (sütun adı / türü ve hücreler; kimlikler sayılmaz) */
function ayniIcerik(a: VeriTablosu, b: VeriTablosu): boolean {
  if (a === b) return true;
  if (a.sutunlar.length !== b.sutunlar.length || a.satirlar.length !== b.satirlar.length) return false;
  if (a.sutunlar.some((s, i) => s.ad !== b.sutunlar[i].ad || s.tur !== b.sutunlar[i].tur)) return false;
  return a.satirlar.every((s, i) => s.hucreler.length === b.satirlar[i].hucreler.length && s.hucreler.every((h, j) => h === b.satirlar[i].hucreler[j]));
}

/** Tablom'un menüde ve bildirimde görünen adı: örnek adı; kendi tablonuzda ilk değişkenin adı ("Boy (cm)") */
export function tabloAdiBul(d: Pick<Durum, 'tablo' | 'tabloAdi'>): string {
  if (d.tabloAdi) return d.tabloAdi;
  const ad = (degiskenSutunlari(d.tablo)[0] ?? d.tablo.sutunlar[0])?.ad.trim();
  return ad ? ad.slice(0, AD_SINIRI) : 'Tablom';
}

/** Tablom'un bütün görünümü (Tablom etkin değilse saklanan görünümünden; Tablom'a geçilince gelecek olan) */
function tablomGorunumu(d: Durum): GorunumTam {
  const simdiki = gorunumAl(d);
  return d.etkinKume === 'tablom' ? simdiki : gorunumGeriGetir(simdiki, d.gorunumler.tablom);
}

function oncekiOlarak(d: Durum): OncekiTablo {
  return {
    tablo: d.tablo,
    ad: tabloAdiBul(d),
    gorunum: tablomGorunumu(d),
    ornekId: d.ornekId,
    ornekTemiz: d.ornekTemiz,
    // Yalnız tabloya bağlı araştırma saklanır (bağsız plan tabloyla bir şey anlatmaz)
    arastirma: arastirmaBagli(d.tablo, d.arastirma) ? d.arastirma : null,
  };
}

/**
 * Tablom'a verilen görünümü uygular (verilmeyen eksen alanları boş, sekme ve seçenekler olduğu gibi). Daire modu
 * verilmezse otomatik: eski tabloda seçilen "Her satırı dilim yap" yeni tabloya (örnek, yeni araştırma) taşınmaz.
 */
function gorunumUygula(d: Durum, g: Partial<GorunumTam>): Durum {
  return {
    ...d,
    degisken: g.degisken ?? null,
    ikinciDegisken: g.ikinciDegisken ?? null,
    aralik: g.aralik ?? null,
    yDegisken: g.yDegisken ?? null,
    renkDegisken: g.renkDegisken ?? null,
    sutunModu: g.sutunModu ?? false,
    sekme: g.sekme ?? d.sekme,
    secenekler: g.secenekler ?? d.secenekler,
    daireModu: g.daireModu ?? null,
  };
}

/**
 * Tablom'u yeni bir tabloyla değiştirir (örnek yükleme, yeni araştırma planı) ve Tablom'a geçer.
 * Eski tablo korunmaya değerse görünümüyle `oncekiTablo`'ya yazılır: boş değilse, değiştirilmemiş bir örnek
 * değilse ve yenisiyle aynı değilse. Değilse `oncekiTablo` olduğu gibi kalır. `onceki` bütün eski durumdur
 * (bildirimdeki "Geri al" için).
 */
export function tabloDegistir(
  d: Durum,
  yeni: { tablo: VeriTablosu; ad: string; gorunum?: Partial<GorunumTam>; ornekId?: string | null },
): { durum: Durum; onceki: Durum } {
  const tablom = d.etkinKume === 'tablom' ? d : kumeDegistir(d, 'tablom');
  const sakla = !tabloBosMu(d.tablo) && !(d.ornekId && d.ornekTemiz) && !ayniIcerik(d.tablo, yeni.tablo);
  const durum = gorunumUygula(
    {
      ...tablom,
      tablo: yeni.tablo,
      tabloAdi: adDogrula(yeni.ad),
      ornekId: yeni.ornekId ?? null,
      ornekTemiz: true,
      oncekiTablo: sakla ? oncekiOlarak(d) : d.oncekiTablo,
      toplamaOncesi: null,
    },
    yeni.gorunum ?? {},
  );
  return { durum, onceki: d };
}

/**
 * "Önceki tabloya dön": Tablom ile önceki tablo görünümleriyle birlikte yer değiştirir (iki kez uygulanınca başa
 * döner). Şimdiki tablo boşsa saklanmaz. Önceki tablo yoksa durum değişmez. Önceki tablo bir araştırmaya bağlı
 * saklandıysa araştırma da geri gelir (yoksa şimdiki araştırma planı kalır: plan silinmez).
 */
export function oncekiTabloyaDon(d: Durum): Durum {
  const o = d.oncekiTablo;
  if (!o) return d;
  const tablom = d.etkinKume === 'tablom' ? d : kumeDegistir(d, 'tablom');
  return gorunumUygula(
    {
      ...tablom,
      tablo: o.tablo,
      tabloAdi: o.ad,
      ornekId: o.ornekId ?? null,
      ornekTemiz: o.ornekTemiz === true,
      arastirma: o.arastirma ?? d.arastirma,
      oncekiTablo: tabloBosMu(d.tablo) ? null : oncekiOlarak(d),
      toplamaOncesi: null,
    },
    o.gorunum,
  );
}

/**
 * Saklanmış bir anlık görüntüyü (`toplamaOncesi`) görünümüyle Tablom'a getirir; `oncekiTablo` değişmez, şimdiki
 * (boş) tablo atılır. K3'te veri toplanmadan kapatılan planın yerine plandan önceki tablo gelir.
 */
export function anlikGoruntuyeDon(d: Durum, o: OncekiTablo): Durum {
  const tablom = d.etkinKume === 'tablom' ? d : kumeDegistir(d, 'tablom');
  return gorunumUygula(
    {
      ...tablom,
      tablo: o.tablo,
      tabloAdi: o.ad,
      ornekId: o.ornekId ?? null,
      ornekTemiz: o.ornekTemiz === true,
      arastirma: o.arastirma ?? d.arastirma,
      toplamaOncesi: null,
    },
    o.gorunum,
  );
}

/**
 * Kullanıcının tablo düzenlemesi (hücre, sütun, satır, sürükleme, yapıştırma): etkin kümeye yazar (Deney özetinde
 * hiçbir şey değişmez). Tablom değişince tablo artık örneğin değiştirilmemiş hâli sayılmaz (sonraki örnek
 * yüklemede önceki tablo olarak saklanır). Sütun yapısı değişirse (sütun eklendi, silindi, türü değişti ya da
 * yapıştırma tabloyu yeniden kurdu) örnekle bağ kopar (`ornekBaginiKopar`); hücre ve satır düzenlemesi bağı korur.
 */
export function tabloDuzenle(d: Durum, tablo: VeriTablosu): Durum {
  const y = etkinTabloYaz(d, tablo);
  if (d.etkinKume !== 'tablom' || tablo === d.tablo) return y;
  const degisti = d.ornekTemiz ? { ...y, ornekTemiz: false } : y;
  return yapiDegisti(d.tablo, tablo) ? ornekBaginiKopar(degisti) : degisti;
}

// ── Örnek bağı: yükleme, rehber eylemleri, bağın kopması ──

/**
 * Tablonun sütun yapısı değişti mi: sütun sayısı, sütun kimlikleri ya da türleri. Sütun adı ve sırası yapı
 * sayılmaz (yeniden adlandırma ve taşıma bağı koparmaz); yapıştırmanın yeniden kurduğu tablo yeni kimlikler alır.
 */
export function yapiDegisti(eski: VeriTablosu, yeni: VeriTablosu): boolean {
  if (eski.sutunlar === yeni.sutunlar) return false;
  if (eski.sutunlar.length !== yeni.sutunlar.length) return true;
  const turler = new Map(eski.sutunlar.map((s) => [s.id, s.tur]));
  return yeni.sutunlar.some((s) => turler.get(s.id) !== s.tur);
}

/**
 * Tablom'un örnekle bağı kopar: Keşif kartı kapanır, örneğe bağlı ayarlar (kategori sırası …) düşer; ad kalır.
 * Örneğe bağlı olmayan tabloda (kendi tablonuz, araştırma tablosu) hiçbir şey değişmez: araştırmanın soru şeridi
 * aynı ipucu yuvasını kullanır ve Temizle ya da sütun eklemeyle kapanmaz.
 */
export function ornekBaginiKopar(d: Durum): Durum {
  return d.ornekId === null ? d : { ...d, ornekId: null, ipucu: 'kapali' };
}

/** Tablom'un bağlı olduğu örnek (bağ yoksa ya da örnek artık yoksa undefined) */
export function bagliOrnek(d: Pick<Durum, 'ornekId'>): OrnekVeri | undefined {
  return d.ornekId ? ornekBul(d.ornekId) : undefined;
}

/**
 * Örnek veri yükler (`tabloDegistir`): korunmaya değer eski tablo "Önceki tabloya dön" için saklanır; örneğin açılış
 * görünümü (`acilisYamasi`: sekme, eksen, karşılaştırma, renk anahtarı, ölçüler kapalı, sütun modu, grup genişliği)
 * uygulanır; bağ kurulur (ad, `ornekId`, değiştirilmemiş) ve Keşif kartı açılır. Daire modunun kullanıcı seçimi
 * sıfırlanır (örneğin daire davranışı bağlıyken örnekten gelir). Örnek yoksa null.
 */
export function ornegiYukle(d: Durum, ornekId: string): { durum: Durum; onceki: Durum } | null {
  const ornek = ornekBul(ornekId);
  if (!ornek) return null;
  const tablo = ornek.olustur();
  const a = acilisYamasi(ornek, tablo, OZELLIKLER);
  const { durum, onceki } = tabloDegistir(d, {
    tablo,
    ad: ornek.ad,
    ornekId: ornek.id,
    gorunum: {
      sekme: a.sekme,
      degisken: a.degisken,
      ikinciDegisken: a.ikinciDegisken,
      renkDegisken: a.renkDegisken,
      yDegisken: null,
      aralik: a.aralik,
      secenekler: a.secenekler,
      sutunModu: a.sutunModu,
    },
  });
  return { durum: { ...durum, ipucu: 'kart', daireModu: null }, onceki };
}

/**
 * Keşif kartındaki rehber eylemi: `eylemYamasi` durum üzerinde uygulanır. Görünüm alanları (sekme, seçenekler,
 * sütun modu, grup genişliği) değişir; eylem tablo verdiyse (`hucre`, `satirEkle`) etkin tabloya yazılır ama
 * örnekle bağ ve "değiştirilmemiş" bilgisi korunur (öğretmen örneği yeniden yüklemeden sürdürür). `yama.vurguSatir`
 * seçili satır, `yama.tost` bildirimdir (tablo varken [Geri al]'lı); onları çağıran uygular.
 */
export function rehberEylemiUygula(d: Durum, eylem: RehberEylemi): { durum: Durum; yama: EylemYamasi } {
  const yama = eylemYamasi(eylem, etkinTablo(d), { secenekler: d.secenekler, sutunModu: d.sutunModu });
  let y = d;
  if (yama.sekme !== undefined && yama.sekme !== y.sekme) y = { ...y, sekme: yama.sekme };
  if (yama.secenekler) y = { ...y, secenekler: { ...y.secenekler, ...yama.secenekler } };
  if (yama.sutunModu !== undefined && yama.sutunModu !== y.sutunModu) y = { ...y, sutunModu: yama.sutunModu };
  if (yama.aralik !== undefined && yama.aralik !== y.aralik) y = { ...y, aralik: yama.aralik };
  if (yama.tablo) y = etkinTabloYaz(y, yama.tablo);
  return { durum: y, yama };
}

/**
 * Temizle: etkin tablonun bütün satırları silinir (sütunlar ve eksen kalır, yeni veri aynı eksene dizilir);
 * grup genişliği otomatiğe, sütun modu kapalıya, daire modu otomatiğe döner (yeni veri kendi dilimleriyle gelir).
 * Tablom'da örnekle bağ kopar. Deney özetinde değişmez.
 */
export function tabloyuTemizle(d: Durum): Durum {
  if (d.etkinKume === 'ozet') return d;
  const y = { ...tabloDuzenle(d, tumunuTemizle(etkinTablo(d))), aralik: null, sutunModu: false, daireModu: null };
  return d.etkinKume === 'tablom' ? ornekBaginiKopar(y) : y;
}

/** Sütun adındaki birim: "Boy (cm)" → "cm", "Sıcaklık (°C)" → "°C"; parantezli ek yoksa null */
export function sutunBirimi(ad: string): string | null {
  const m = /\(([^()]*)\)\s*$/.exec(ad);
  const birim = m ? m[1].trim() : '';
  return birim === '' ? null : birim;
}
