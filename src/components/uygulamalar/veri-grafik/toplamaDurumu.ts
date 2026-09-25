/**
 * Veri ve Grafik — "Veri topla" panelinin durum geçişleri (saf, React'siz; VT §4.7, §7, §9.3).
 *
 * Panel Tablom'a yalnız bu işlevlerle dokunur:
 * - `planiUygula`: planın boş tablosu Tablom'a yazılır (eski tablo korunmaya değerse `oncekiTablo`'ya gider), sekme,
 *   eksen, renk ve seçenekler yönteme göre atanır; bağlı araştırmada tablo korunur ("Toplamaya devam et").
 * - `toplamaAc` / `toplamaKapat`: paneli açar / kapatır. Veri toplanmadan kapatılırsa önceki tablo görünümüyle geri
 *   gelir (K3); Deney özeti açıksa Tablom'a dönülür.
 * - `toplamaVerisiYaz`: bir dokunuşun, ölçümün ya da atış parçasının satırları ve deney çalışması işlemleri tek
 *   güncellemede (atomik) yazılır.
 * - `ozeteGec`: Deney özetini Çizgi grafiğinde gösterir.
 * - `toplamaGorunumBilgisi`: grafik ve tabloya verilecek toplama bilgileri (eksen alanı, yEnAz, boş iletiler, kategori
 *   sıraları, soru şeridi).
 *
 * İçe aktarma yönü: durum.ts + arastirma.ts + deney.ts (onlar bu modülü içe aktarmaz).
 */
import {
  RENKSIZ,
  eksenDuzelt,
  kumeDegistir,
  oncekiTabloyaDon,
  anlikGoruntuyeDon,
  sekmeDuzelt,
  tabloAdiBul,
  tabloBosMu,
  tabloDegistir,
  type Durum,
  type GorunumTam,
  type OncekiTablo,
} from './durum';
import {
  anketSayisalMi,
  arastirmaBagli,
  arastirmaEksenAlani,
  arastirmaKategoriSiralari,
  arastirmaKimligiUret,
  arastirmaSutunKimligi,
  arastirmaSutunRolu,
  arastirmaTabloAdi,
  bosGrafikIpucu,
  bosTabloIletisi,
  hazirSoruBul,
  planGrubu,
  planSorunu,
  planSorusu,
  planSutunAdi,
  planSutunTuru,
  planTablosu,
  soruSeridiBilgisi,
  toplamaYEnAz,
  veriRolleri,
  type Arastirma,
  type KayitKipi,
  type SutunRolu,
} from './arastirma';
import {
  EN_COK_TABLO_SATIRI,
  OZET_SUTUNU,
  calismalariTablodanGuncelle,
  deneyCalismasiBaslat,
  deneyCalismasiBitir,
  deneyCalismasiSil,
  deneySatirlariEkle,
  ozetTablosu,
  sonrakiDeneyNo,
  sonucSayisalMi,
} from './deney';
import { kimlikUret, type Satir, type Sutun, type VeriTablosu } from './veri';

// ── Plan uygulama ─────────────────────────────────────────────────────────────

/**
 * Plan uygulanınca grafiğin açılış görünümü (VT §7): sekme Nokta; eksen ana değişkende (anket cevabı, ölçüm değeri,
 * deney sonucu; iki küpte Toplam); karşılaştırma, aralık ve saçılım ekseni boş; renk anahtarı grup varsa grup,
 * kategorik deneyde sonuç sütunu (açıkça), öteki durumlarda otomatik; kategorik veride "Sayılar" açık, öteki
 * seçenekler ve sütun modu kapalı.
 */
export function acilisGorunumu(a: Arastirma): Partial<GorunumTam> {
  const s = a.sutunlar ?? {};
  const kapali = { ortalama: false, oms: false, etiketler: false, ortanca: false };
  const temel: Partial<GorunumTam> = { sekme: 'nokta', ikinciDegisken: null, aralik: null, yDegisken: null, sutunModu: false };
  if (a.yontem === 'anket') {
    return { ...temel, degisken: s.cevap ?? null, renkDegisken: a.anket.grup ? s.grup ?? null : null, secenekler: { ...kapali, etiketler: !anketSayisalMi(a) } };
  }
  if (a.yontem === 'olcum') return { ...temel, degisken: s.deger ?? null, renkDegisken: a.olcum.grup ? s.grup ?? null : null, secenekler: kapali };
  if (a.yontem === 'deney') {
    const sayisal = sonucSayisalMi(a.deney.nesne);
    const degisken = a.deney.nesne === 'iki-zar' ? s.toplam ?? null : s.s0 ?? null;
    return { ...temel, degisken, renkDegisken: sayisal ? null : s.s0 ?? null, secenekler: { ...kapali, etiketler: !sayisal } };
  }
  return temel;
}

/**
 * Plan bağlı tabloya devam mı ediyor ("Toplamaya devam et"): aynı araştırma, Tablom'a bağlı, yöntem (ve deneyde
 * nesne) değişmemiş. Değilse plan yeni bir tablo açar.
 */
export function planaDevamMi(d: Durum, a: Arastirma): boolean {
  const eski = d.arastirma;
  return (
    eski !== null &&
    eski.kimlik === a.kimlik &&
    a.sutunlar !== null &&
    arastirmaBagli(d.tablo, eski) &&
    eski.yontem === a.yontem &&
    (a.yontem !== 'deney' || eski.deney.nesne === a.deney.nesne)
  );
}

/** Tablom'un bütün hâli (önceki tablo olarak saklanmak üzere): Tablom etkin değilse onun saklı görünümüyle */
function tablomAnlikGoruntusu(d: Durum): OncekiTablo {
  const t = d.etkinKume === 'tablom' ? d : kumeDegistir(d, 'tablom');
  return {
    tablo: d.tablo,
    ad: tabloAdiBul(d),
    gorunum: {
      degisken: t.degisken,
      ikinciDegisken: t.ikinciDegisken,
      aralik: t.aralik,
      sekme: t.sekme,
      secenekler: t.secenekler,
      sutunModu: t.sutunModu,
      yDegisken: t.yDegisken,
      renkDegisken: t.renkDegisken ?? null,
    },
    ornekId: d.ornekId,
    ornekTemiz: d.ornekTemiz,
  };
}

/** Sütunu verilen yere ekler; var olan satırlarda hücresi boş kalır */
function sutunYerlestir(tablo: VeriTablosu, sutun: Sutun, konum: number): VeriTablosu {
  const k = Math.max(0, Math.min(tablo.sutunlar.length, konum));
  const sutunlar = [...tablo.sutunlar];
  sutunlar.splice(k, 0, sutun);
  return {
    sutunlar,
    satirlar: tablo.satirlar.map((r) => {
      const hucreler = [...r.hucreler];
      hucreler.splice(k, 0, '');
      return { ...r, hucreler };
    }),
  };
}

function veListesi(ogeler: readonly string[]): string {
  if (ogeler.length <= 1) return ogeler[0] ?? '';
  return `${ogeler.slice(0, -1).join(', ')} ve ${ogeler[ogeler.length - 1]}`;
}

/**
 * Bağlı tabloya devam: tablo korunur; planda yeni açılan grup ya da "Adları da yaz" sütunu eklenir (ad en başa, grup
 * ana sütunun yanına); planda adı ya da türü değişen sütun güncellenir. Kimlik, sütunlar ve deney çalışmaları eski
 * araştırmadan gelir. Adım Topla olur.
 */
function planaDevam(d: Durum, eski: Arastirma, a: Arastirma): { durum: Durum; onceki: Durum; tost: string } {
  let tablo = d.tablo;
  const sutunlar: Partial<Record<SutunRolu, string>> = { ...(eski.sutunlar ?? {}) };
  const eklenen: string[] = [];
  const yeri = (id: string | undefined) => (id ? tablo.sutunlar.findIndex((s) => s.id === id) : -1);
  for (const rol of veriRolleri(a)) {
    if (yeri(sutunlar[rol]) >= 0) continue;
    const sutun: Sutun = { id: arastirmaSutunKimligi(eski.kimlik, rol), ad: planSutunAdi(a, rol), tur: planSutunTuru(a, rol) };
    const ana = yeri(sutunlar.cevap ?? sutunlar.deger);
    const konum = rol === 'ad' ? 0 : rol === 'grup' && ana >= 0 ? ana + 1 : tablo.sutunlar.length;
    tablo = sutunYerlestir(tablo, sutun, konum);
    sutunlar[rol] = sutun.id;
    eklenen.push(sutun.ad);
  }
  const yeniden = (rol: SutunRolu) => {
    const j = yeri(sutunlar[rol]);
    if (j < 0) return;
    const ad = planSutunAdi(a, rol);
    if (planSutunAdi(eski, rol) !== ad && tablo.sutunlar[j].ad !== ad) tablo = { ...tablo, sutunlar: tablo.sutunlar.map((s, k) => (k === j ? { ...s, ad } : s)) };
    const tur = planSutunTuru(a, rol);
    if (planSutunTuru(eski, rol) !== tur && tablo.sutunlar[j].tur !== tur) tablo = { ...tablo, sutunlar: tablo.sutunlar.map((s, k) => (k === j ? { ...s, tur } : s)) };
  };
  if (a.yontem === 'anket') yeniden('cevap');
  if (a.yontem === 'olcum') yeniden('deger');
  if (planGrubu(a) && planGrubu(eski)) yeniden('grup');
  if (a.yontem === 'deney' && a.deney.nesne === 'cark') yeniden('s0');
  const arastirma: Arastirma = { ...a, kimlik: eski.kimlik, sutunlar, adim: 'topla', deney: { ...a.deney, calismalar: eski.deney.calismalar } };
  const tost = eklenen.length === 0 ? '' : `Tabloya ${veListesi(eklenen)} ${eklenen.length > 1 ? 'sütunları' : 'sütunu'} eklendi.`;
  return { durum: sekmeDuzelt(eksenDuzelt({ ...d, tablo, arastirma })), onceki: d, tost };
}

/**
 * "Toplamaya başla" ve hazır soru kartı (VT §4.7, §7, §9.3). Döndürülen `onceki`, tostun [Geri al]'ı içindir; `tost`
 * boşsa bildirim gösterilmez (tablo değişmedi).
 * - Planda sorun varsa (`planSorunu`) durum değişmez ve tost sorunu söyler. Soru boşsa plandan kurulur (`planSorusu`).
 * - Bağlı araştırmaya devam (`planaDevamMi`): tablo korunur, yeni plan sütunları eklenir; adım Topla.
 * - Yeni tablo: planın boş tablosu `tabloDegistir` ile Tablom'a yazılır (Tablom etkin küme olur; `ornekId` null,
 *   `ornekTemiz` false, tablo adı ana değişkenin adı). Eski tablo boş değilse `oncekiTablo`'ya gider; boş bir plan
 *   tablosuyken (ikinci hazır soru) `oncekiTablo` değişmez. Değiştirilmemiş bir örnek, `oncekiTablo` boşken yine
 *   saklanır (veri toplanmadan kapatılınca örnek geri gelsin). Daha önce uygulanmış bir plan yeniden başlatılıyorsa
 *   yeni kimlik alır, deney çalışmaları ve sonuç metni boşalır. Görünüm `acilisGorunumu`; adım Topla (Seri kartında
 *   Düzenle).
 *   Tost: "Yeni tablo açıldı: Meyve. Önceki tablo saklandı." ya da "Yeni tablo açıldı: Mevsim."
 */
export function planiUygula(d: Durum, ham: Arastirma): { durum: Durum; onceki: Durum; tost: string } {
  const sorun = planSorunu(ham);
  if (sorun) return { durum: d, onceki: d, tost: sorun };
  // Soru yazılmadan başlanırsa görev metni ve soru şeridi boş kalmasın: soru plandan kurulur ("Boy kaç cm?")
  const a: Arastirma = ham.soru.trim() === '' ? { ...ham, soru: planSorusu(ham) } : ham;
  if (planaDevamMi(d, a)) return planaDevam(d, d.arastirma as Arastirma, a);
  const tazele = a.sutunlar !== null;
  const yeni: Arastirma = {
    ...a,
    kimlik: tazele ? arastirmaKimligiUret() : a.kimlik,
    sonuc: tazele ? '' : a.sonuc,
    adim: hazirSoruBul(a.hazirId)?.acilis === 'duzenle' ? 'duzenle' : 'topla',
    deney: { ...a.deney, calismalar: [] },
    sutunlar: null,
  };
  const tablo = planTablosu(yeni);
  const sutunlar: Partial<Record<SutunRolu, string>> = {};
  for (const s of tablo.sutunlar) {
    const rol = arastirmaSutunRolu(s.id);
    if (rol) sutunlar[rol] = s.id;
  }
  const arastirma: Arastirma = { ...yeni, sutunlar };
  const ad = arastirmaTabloAdi(arastirma);
  let y: Durum = { ...tabloDegistir(d, { tablo, ad, gorunum: acilisGorunumu(arastirma), ornekId: null }).durum, arastirma, ornekTemiz: false };
  if (y.oncekiTablo === d.oncekiTablo && d.oncekiTablo === null && !tabloBosMu(d.tablo)) y = { ...y, oncekiTablo: tablomAnlikGoruntusu(d) };
  // K3: veri toplanmadan kapatılınca tam olarak plandan önceki tablo gelsin. Şimdiki tablo önceki tabloya yazılmadıysa
  // (değiştirilmemiş örnek, önceki tablo doluyken) anlık görüntüsü ayrıca saklanır; boş tablo (zincirleme hazır soru)
  // öncekinin görüntüsünü taşır.
  const saklandi = y.oncekiTablo !== d.oncekiTablo;
  y = { ...y, toplamaOncesi: tabloBosMu(d.tablo) ? d.toplamaOncesi ?? null : saklandi ? null : tablomAnlikGoruntusu(d) };
  const tost = saklandi ? `Yeni tablo açıldı: ${ad}. Önceki tablo saklandı.` : `Yeni tablo açıldı: ${ad}.`;
  return { durum: sekmeDuzelt(eksenDuzelt(y)), onceki: d, tost };
}

/**
 * Plan adımındaki uyarı (VT §6.4): plan yeni bir tablo açacaksa ve Tablom doluysa "Başlayınca yeni tablo açılır.
 * Şimdiki tablo (Boy (cm), 24 satır) saklanır: Örnek veri ▸ Önceki tabloya dön." Değiştirilmemiş örnek saklanmayacaksa
 * "Başlayınca yeni tablo açılır. Şimdiki örnek (…) Örnek veri menüsünden yeniden açılabilir." Devamda ya da boş
 * tabloda null.
 */
export function planUyarisi(d: Durum, a: Arastirma): string | null {
  if (planaDevamMi(d, a) || tabloBosMu(d.tablo)) return null;
  const ad = tabloAdiBul(d);
  const saklanir = !(d.ornekId && d.ornekTemiz) || d.oncekiTablo === null;
  return saklanir
    ? `Başlayınca yeni tablo açılır. Şimdiki tablo (${ad}, ${d.tablo.satirlar.length} satır) saklanır: Örnek veri ▸ Önceki tabloya dön.`
    : `Başlayınca yeni tablo açılır. Şimdiki örnek (${ad}) Örnek veri menüsünden yeniden açılabilir.`;
}

/**
 * Araştırmanın metin ve plan alanlarını yazar (panelin `onArastirma`'sı; Tablom'a dokunmaz). Aynı araştırmada (aynı
 * kimlik) sütunlar ve deney çalışmaları durumdakinden korunur: panelin elindeki kopya bir kare geride kalsa da
 * çalışmalar silinmez. Başka kimlik ("+ Yeni araştırma", hazır soru kartı) araştırmanın yerine geçer.
 */
export function arastirmaYaz(d: Durum, a: Arastirma): Durum {
  const eski = d.arastirma;
  if (eski === a) return d;
  const yeni = eski && eski.kimlik === a.kimlik ? { ...a, sutunlar: eski.sutunlar, deney: { ...a.deney, calismalar: eski.deney.calismalar } } : a;
  return { ...d, arastirma: yeni };
}

// ── Paneli açma ve kapatma ────────────────────────────────────────────────────

/** Paneli açar: yalnız `toplamaAcik` (tablo, küme ve grafik değişmez; açıksa aynı durum döner) */
export function toplamaAc(d: Durum): Durum {
  return d.toplamaAcik ? d : { ...d, toplamaAcik: true };
}

/** Tablom'da (ya da deneyin tabloya yazılmayan çalışmalarında) veri var mı */
function toplananVeriVar(d: Durum): boolean {
  if (!tabloBosMu(d.tablo)) return true;
  const a = d.arastirma;
  return a !== null && a.yontem === 'deney' && a.deney.calismalar.some((c) => c.n > 0);
}

/**
 * Paneli kapatır (K3, VT §4.7):
 * - Deney özeti açıksa Tablom'a dönülür (Tablom'un bütün görünümü geri gelir).
 * - Araştırma bağlıyken hiç veri toplanmadıysa ve önceki tablo varsa önceki tablo görünümüyle geri gelir; araştırma
 *   bağsız kalır. Tost: "Veri toplanmadı; önceki tablo geri geldi."
 * - Veri toplandıysa tablo ve soru şeridi kalır.
 */
export function toplamaKapat(d: Durum): { durum: Durum; tost: string | null } {
  let y: Durum = d.toplamaAcik ? { ...d, toplamaAcik: false } : d;
  if (y.etkinKume === 'ozet') y = kumeDegistir(y, 'tablom');
  const bagli = arastirmaBagli(y.tablo, y.arastirma);
  if (bagli && !toplananVeriVar(y)) {
    // Plandan önceki tablo önceki tabloya yazılmadıysa (değiştirilmemiş örnek) onun görüntüsü; yoksa önceki tablo
    if (y.toplamaOncesi) return { durum: sekmeDuzelt(eksenDuzelt(anlikGoruntuyeDon(y, y.toplamaOncesi))), tost: 'Veri toplanmadı; önceki tablo geri geldi.' };
    if (y.oncekiTablo) return { durum: sekmeDuzelt(eksenDuzelt(oncekiTabloyaDon(y))), tost: 'Veri toplanmadı; önceki tablo geri geldi.' };
  }
  // Veri toplandıysa (ya da tablo artık araştırmanın değilse) plandan önceki görüntü artık gerekmez
  if (y.toplamaOncesi) y = { ...y, toplamaOncesi: null };
  return { durum: y === d ? d : sekmeDuzelt(eksenDuzelt(y)), tost: null };
}

// ── Toplanan veriyi yazma (atomik) ────────────────────────────────────────────

export interface ToplamaSatiri {
  /** satırın kimliği (panelde `kimlikUret('r')`; geri al bu kimlikle siler). Boşsa üretilir */
  kimlik: string;
  /**
   * Hücreler, araştırmanın veri rolleri sırasıyla (`veriRolleri`): anket [cevap, (grup)] (`anketSatiri`); ölçüm
   * [(ad), değer, (grup)] (`olcumSatirlari`); deney [s0] ya da iki küpte [s0, s1, toplam] (ornekleyici
   * `satirDegerleri`). Tablodaki sütun sırası ve kullanıcının eklediği sütunlar önemli değildir; Deney sütunu otomatiktir.
   */
  hucreler: string[];
  /** deney: satırın çalışması (0 = gerçek atışlar; ötekiler deney numarası). Verilmezse `calismaBaslat`ınki ya da son çalışma */
  calisma?: number;
}

export interface ToplamaVerisi {
  /** eklenecek satırlar (sırasıyla) */
  ekle?: ToplamaSatiri[];
  /** silinecek satırların kimlikleri ("Son cevabı geri al") */
  sil?: string[];
  /** araştırmanın yeni metin ve plan alanları (aynı kimlikte sütunlar ve deney çalışmaları durumdakinden korunur) */
  arastirma?: Arastirma;
  /** deney: satırlardan önce yeni çalışma başlat ("20 kez at"; Elle kaydet için kayit 'gercek') */
  calismaBaslat?: { no: number; kayit: KayitKipi; hedef: number };
  /** deney: çalışmayı bitir (satırlardan sonra): etiket gerçek atış sayısıyla yazılır, atışsız deney silinir */
  calismaBitir?: number;
  /** deney: çalışmayı bütün satırlarıyla sil ("Son deneyi geri al") */
  calismaSil?: number;
}

/** En büyük numaralı simülasyon çalışması (yoksa null) */
function sonSimulasyon(a: Arastirma): number | null {
  const no = sonrakiDeneyNo(a.deney.calismalar) - 1;
  return no >= 1 ? no : null;
}

/** Anket ve ölçüm satırlarını tablonun sütunlarına yerleştirir (rol → sütun); 2000 satırı aşan satırlar yazılmaz */
function veriSatirlariEkle(tablo: VeriTablosu, a: Arastirma, satirlar: readonly ToplamaSatiri[]): VeriTablosu {
  const roller = veriRolleri(a);
  const konum = tablo.sutunlar.map((s) => {
    const rol = arastirmaSutunRolu(s.id);
    return rol && a.sutunlar?.[rol] === s.id ? roller.indexOf(rol) : -1;
  });
  const yer = Math.max(0, EN_COK_TABLO_SATIRI - tablo.satirlar.length);
  if (yer === 0) return tablo;
  const yeniler: Satir[] = satirlar.slice(0, yer).map((r) => ({
    id: r.kimlik || kimlikUret('r'),
    hucreler: konum.map((m) => (m >= 0 ? r.hucreler[m] ?? '' : '')),
  }));
  return yeniler.length > 0 ? { ...tablo, satirlar: [...tablo.satirlar, ...yeniler] } : tablo;
}

/**
 * Panelin verisini tek güncellemede yazar (`setDurum(d => toplamaVerisiYaz(d, v))`). Sıra: araştırma alanları →
 * çalışma silme → satır silme → çalışma başlatma → satır ekleme → çalışma bitirme. Satırlar yalnız araştırma Tablom'a
 * bağlıyken eklenir. Deneyde satırlar `deneySatirlariEkle` ile yazılır (tembel Deney sütunu, 500 ve üstü atışta
 * yalnız çalışma kaydı, 2000 satır sınırı); silinen satırlardan sonra çalışmaların sayıları Tablom'dan yeniden
 * hesaplanır. Hiçbir şey değişmezse aynı durum döner.
 */
export function toplamaVerisiYaz(d: Durum, v: ToplamaVerisi): Durum {
  let a = d.arastirma;
  let tablo = d.tablo;
  if (v.arastirma) {
    a = a && a.kimlik === v.arastirma.kimlik ? { ...v.arastirma, sutunlar: a.sutunlar, deney: { ...v.arastirma.deney, calismalar: a.deney.calismalar } } : v.arastirma;
  }
  if (!a) return d;
  const deney = a.yontem === 'deney';
  if (deney && v.calismaSil !== undefined) {
    const r = deneyCalismasiSil(tablo, a, v.calismaSil);
    tablo = r.tablo;
    a = r.arastirma;
  }
  const silindi = (v.sil?.length ?? 0) > 0;
  if (silindi) {
    const idler = new Set(v.sil);
    const kalan = tablo.satirlar.filter((r) => !idler.has(r.id));
    if (kalan.length !== tablo.satirlar.length) tablo = { ...tablo, satirlar: kalan };
  }
  let baslatilan: number | null = null;
  if (deney && v.calismaBaslat) {
    const r = deneyCalismasiBaslat(a, v.calismaBaslat.kayit, v.calismaBaslat.hedef, tablo.satirlar.length, v.calismaBaslat.no);
    if (r) {
      a = r.arastirma;
      baslatilan = r.no;
    }
  }
  if (v.ekle && v.ekle.length > 0 && arastirmaBagli(tablo, a)) {
    if (deney) {
      const varsayilan = baslatilan ?? (a.deney.kayit === 'gercek' ? 0 : sonSimulasyon(a) ?? sonrakiDeneyNo(a.deney.calismalar));
      // Art arda aynı çalışmanın satırları bir parça olarak yazılır
      let i = 0;
      while (i < v.ekle.length) {
        const no = v.ekle[i].calisma ?? varsayilan;
        let j = i;
        while (j < v.ekle.length && (v.ekle[j].calisma ?? varsayilan) === no) j++;
        const parca = v.ekle.slice(i, j);
        const r = deneySatirlariEkle(
          tablo,
          a,
          no,
          parca.map((x) => x.hucreler),
          parca.map((x) => x.kimlik),
        );
        tablo = r.tablo;
        a = r.arastirma;
        i = j;
      }
    } else {
      tablo = veriSatirlariEkle(tablo, a, v.ekle);
    }
  }
  if (deney && v.calismaBitir !== undefined) {
    const r = deneyCalismasiBitir(tablo, a, v.calismaBitir);
    tablo = r.tablo;
    a = r.arastirma;
  }
  if (deney && silindi && tablo !== d.tablo) a = calismalariTablodanGuncelle(tablo, a);
  if (tablo === d.tablo && a === d.arastirma) return d;
  return { ...d, tablo, arastirma: a };
}

// ── Deney özeti ───────────────────────────────────────────────────────────────

/**
 * "Özeti Çizgi grafiğinde göster": küme Deney özeti, sekme Çizgi, eksen göreli sıklık (%), ikinci değişken teorik
 * olasılık (%) (kesikli; teorik gösterilmiyorsa yok), renk anahtarı yok. Tablom'un bütün görünümü saklanır; küme
 * seçiciden "Atışlar"a dönülünce geri gelir. Deney araştırması yoksa durum değişmez.
 */
export function ozeteGec(d: Durum): Durum {
  if (d.arastirma?.yontem !== 'deney') return d;
  const teorikVar = ozetTablosu(d.tablo, d.arastirma).sutunlar.some((s) => s.id === OZET_SUTUNU.teorik);
  return sekmeDuzelt(
    eksenDuzelt(kumeDegistir(d, 'ozet', { degisken: OZET_SUTUNU.oran, ikinciDegisken: teorikVar ? OZET_SUTUNU.teorik : null, sekme: 'cizgi', renkDegisken: RENKSIZ })),
  );
}

// ── Grafik ve tablo için toplama bilgileri ────────────────────────────────────

export interface ToplamaGorunumBilgisi {
  /** araştırma Tablom'a bağlı mı (panelin `bagli` özelliği) */
  bagli: boolean;
  /** Nokta grafiğinin "en az bu aralık" ekseni (seçili değişken araştırmanın sayısal sütunuysa) */
  eksenAlani: { min: number; max: number } | null;
  /** kategorik sütun grafiğinin toplama sırasındaki en az üst sınırı (panel açık, eksen ana değişkende) */
  yEnAz: number | undefined;
  /** boş grafik ipucu ("İlk cevapla noktalar burada belirir.") */
  bosIpucu: string | undefined;
  /** boş tablo iletisi ("Henüz cevap yok. …") */
  bosIleti: string | undefined;
  /** araştırma sütunlarının kategori sıraları (sütun kimliği → sıra) */
  kategoriSiralari: Map<string, string[]>;
  /** grafik sütunundaki araştırma sorusu şeridi */
  soruSeridi: { soru: string; altBilgi: string } | null;
  /** grafiklerde deney / olasılık cümleleri gösterilsin mi (deney araştırması ya da Deney özeti) */
  deneyVerisi: boolean;
}

/**
 * index.tsx'in grafik ve tabloya ilettiği toplama bilgileri (VT §7, §8.6, §12.10). Bağ yoksa hepsi boştur (grafik ve
 * tablo bugünkü gibi davranır). Deney özeti kümesinde yalnız `deneyVerisi` ve `soruSeridi` dolu olabilir.
 */
export function toplamaGorunumBilgisi(d: Durum): ToplamaGorunumBilgisi {
  const a = d.arastirma;
  const bagli = arastirmaBagli(d.tablo, a);
  const ozet = d.etkinKume === 'ozet';
  const tablom = d.etkinKume === 'tablom';
  if (!bagli || !a) {
    return { bagli: false, eksenAlani: null, yEnAz: undefined, bosIpucu: undefined, bosIleti: undefined, kategoriSiralari: new Map(), soruSeridi: null, deneyVerisi: ozet };
  }
  const anaSutun = a.yontem === 'anket' ? a.sutunlar?.cevap : a.yontem === 'deney' ? a.sutunlar?.s0 : undefined;
  return {
    bagli: true,
    eksenAlani: tablom ? arastirmaEksenAlani(d.tablo, a, d.degisken, d.toplamaAcik) : null,
    yEnAz: tablom && d.toplamaAcik && anaSutun !== undefined && d.degisken === anaSutun ? toplamaYEnAz(d.tablo, a) : undefined,
    bosIpucu: tablom ? bosGrafikIpucu(a, d.sekme) : undefined,
    bosIleti: tablom ? bosTabloIletisi(a) : undefined,
    kategoriSiralari: tablom ? arastirmaKategoriSiralari(a) : new Map(),
    soruSeridi: soruSeridiBilgisi(d.tablo, a),
    deneyVerisi: a.yontem === 'deney' || ozet,
  };
}
