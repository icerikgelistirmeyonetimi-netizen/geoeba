/**
 * Kademe → 3B araç paneli eşlemesi. 2B listesi kademeDuzeyleri.ts'tedir; bu dosya yalnız Toolbar3D'nin
 * ağaç listesini ve Ara sekmesini süzer (WorkspaceView ve komutlar kademeyi bilmez; Canvas3D ve Canvas yalnız aşağıdaki
 * 2B - 3B ayrımı kurallarını okur).
 *
 * İlkokul (Dinamik Matematik Yazılımı İlkokul Raporu, 23.07.2026, 3B ekranı): Temel (Taşı, Sil; Döndür ve
 * İncele, Görünümü Kaydır), Katı Cisimler (Küp, Küre, Silindir, Üçgen Prizma, Kare Prizma, Dikdörtgen Prizma —
 * koni ve piramit YOK), Yüzü Seç ve Renklendir, Uzunluk Ölçme (ayrıtlar tam sayı), Cismi Döndür, Büyüt ve
 * Küçült (yansıtma ve öteleme YOK), Cisim Özellikleri (Köşeleri / Ayrıtları / Yüzleri Göster), görünümler.
 * Açınım 4. sınıf kazanımıdır (MAT.4.3.1: küp ve prizmaların açınımları) ve ilkokulda kalır.
 * Eksenleri Göster ilkokulda YOK (alan uzmanı, 4. tur [180]: 2B'deki gibi 3B'de de koordinat ekseni, negatif sayı ve
 * koordinat yazısı yok; zemin ızgarası kalır — kademe3BEksenleriGosterir).
 * Ortaokul ve lise: bütün araçlar (MAT.7.4.x prizmalar, MAT.8.4.1-3 açınım ve silindir, MAT.12.4.1-3).
 */
import type { KademeDuzeyi, KademeId } from './kademeDuzeyleri';
import type { Tool3DTreeId, TreeTool3DGroup } from './treeToolDefinitions3D';

export const ILKOKUL_3B_ARACLARI: readonly Tool3DTreeId[] = [
  'select_move', // Taşı (MAT.2.3.4: yeri değişince biçim değişmez)
  'orbit', // Döndür ve İncele ("3D Görünümü")
  'pan', // Görünümü Kaydır
  'delete', // Sil
  'create_cube', // Küp
  'create_sphere', // Küre
  'create_cylinder', // Silindir
  'create_prism', // Dikdörtgen Prizma
  'kare_prizma', // Kare Prizma
  'create_triangular_prism', // Üçgen Prizma
  // Koni, Kare Piramit: ilkokulda YOK (rapor)
  'inspect', // Yüzü Seç ve Renklendir
  'measure_edge', // Uzunluk Ölçme
  'unfold', // Açınım (MAT.4.3.1)
  'rotate_3d', // Cismi Döndür (her yöne çevirme)
  'scale_3d', // Büyüt ve Küçült (tutamaçla)
  // Yansıt, Ötele: ilkokulda YOK (dönüşüm araçlarının yerine yalnız Taşı, Döndür, Büyüt ve Küçült)
  'show_vertices',
  'show_edges',
  'show_faces',
  'show_grid',
  // Eksenleri Göster: ilkokulda YOK (4. tur [180])
  'view_front', // "Önünden Görünüm"
  'view_top',
  'view_right',
  'view_isometric',
];

/** Kademede görünen 3B satır kimlikleri; null: süzgeç yok (bütün araçlar). */
export const KADEME_3B_ARACLARI: Readonly<Record<KademeId, readonly Tool3DTreeId[] | null>> = {
  ilkokul: ILKOKUL_3B_ARACLARI,
  ortaokul: null,
  lise: null,
};

/** Görünür araç sayısı bu sınırı aşmıyorsa kademe seçilince bütün gruplar açık gelir. */
export const ACIK_GRUP_SINIRI_3B = 30;

const kumeler = new Map<KademeId, ReadonlySet<string>>();

/** Kademede görünen kimlikler kümesi; 'tum' ve süzgeçsiz kademeler için null. */
export function gorunen3BAraclar(duzey: KademeDuzeyi): ReadonlySet<string> | null {
  if (duzey === 'tum') return null;
  const liste = KADEME_3B_ARACLARI[duzey];
  if (liste === null) return null;
  let kume = kumeler.get(duzey);
  if (!kume) {
    kume = new Set<string>(liste);
    kumeler.set(duzey, kume);
  }
  return kume;
}

/** Satır bu kademede panelde görünür mü? */
export function arac3BGorunurMu(duzey: KademeDuzeyi, id: string): boolean {
  const kume = gorunen3BAraclar(duzey);
  return kume === null || kume.has(id);
}

/** Grupları kademeye göre süzer: boşalan grup düşer, sıra korunur. */
export function gruplari3BSuz(gruplar: readonly TreeTool3DGroup[], duzey: KademeDuzeyi): TreeTool3DGroup[] {
  const kume = gorunen3BAraclar(duzey);
  if (kume === null) return [...gruplar];
  return gruplar
    .map((g) => ({ ...g, tools: g.tools.filter((a) => kume.has(a.id)) }))
    .filter((g) => g.tools.length > 0);
}

/** Süzülmüş gruplardaki toplam satır sayısı */
export function gorunen3BAracSayisi(gruplar: readonly TreeTool3DGroup[], duzey: KademeDuzeyi): number {
  return gruplari3BSuz(gruplar, duzey).reduce((t, g) => t + g.tools.length, 0);
}

/** Kademe seçilince grupların başlangıç açıklığı: az araçlı kademede hepsi açık, yoksa grubun kendi varsayılanı. */
export function grupAcikliklari3B(gruplar: readonly TreeTool3DGroup[], duzey: KademeDuzeyi): Record<string, boolean> {
  const hepsiAcik = duzey !== 'tum' && gorunen3BAracSayisi(gruplar, duzey) <= ACIK_GRUP_SINIRI_3B;
  return Object.fromEntries(gruplar.map((g) => [g.id, hepsiAcik ? true : (g.defaultExpanded ?? true)]));
}

/* ------------------------- 2B - 3B ayrımı (uzman 4. tur, ortaokul) ------------------------- */

/** 2B ve 3B nesne kümeleri ayrı olan kademeler: ortaokul ([172]) ve ilkokul (4. tur SIL [180]) */
const AYRIK_KUMELI_KADEMELER: readonly KademeDuzeyi[] = ['ortaokul', 'ilkokul'];

/**
 * 3B sahnede 2B çizimden gelen nesneler (nokta, çember, fonksiyon…) gösterilir mi? Ortaokulda HAYIR (geoeba (3).xlsx
 * [172]: H ve L noktaları, çember ve fonksiyon 3B'de küre ve elips olarak görünüyor, 3B'nin Tümünü Sil'i ve Nesneler
 * listesi onları kapsamadığından silinemiyordu → "2D ve 3D nesne kümelerini ayır"). İlkokulda da HAYIR ([180]: "2B'de
 * çizilen bir çember de 3B sahnede elips olarak belirmektedir"; nesnenin habersizce öbür görünümde başka biçimde
 * belirmesi öğrencinin izlemesini güçleştirir). Lise ve Tüm araçlar eskisi gibi ortak modeli (z ekseniyle) gösterir.
 */
export function kademe2BNesneleri3BdeGosterir(duzey: KademeDuzeyi): boolean {
  return !AYRIK_KUMELI_KADEMELER.includes(duzey);
}

/**
 * 2B tuvalde 3B cisimlerin üstten görünümü (izdüşüm) açılışta açık mı? Ortaokulda KAPALI ([175]: etiketli izdüşümler
 * çizim alanını kalabalıklaştırıyor, öğrencinin kendi çizimini gizliyordu); ilkokulda da KAPALI ([180]: "3B cisimlerin
 * 2B görünümdeki yansımaları ilkokulda gösterilmemeli ya da yalnızca cismin adıyla sınırlı kalmalıdır"). Tuvalin
 * "3B cisimler" anahtarıyla açılır; ilkokulda açılınca yalnız cismin adı yazılır (cisimIzdusumuYalnizAd).
 */
export function cisimIzdusumuVarsayilanAcik(duzey: KademeDuzeyi): boolean {
  return !AYRIK_KUMELI_KADEMELER.includes(duzey);
}

/**
 * "3B cisimler" (izdüşümü göster / gizle) anahtarı bu kademede sunulur mu? Her kademede: ilkokulda da izdüşüm kapalı
 * açıldığı için (4. tur SIL [180]) onu açmanın yolu bu anahtardır.
 */
export function cisimIzdusumuAnahtariVar(_duzey: KademeDuzeyi): boolean {
  return true;
}

/** İzdüşüm etiketi yalnız cismin adı mı (taban alanı, hacim, br², br³ ve "a = 3 br" yok)? İlkokulda evet ([180]). */
export function cisimIzdusumuYalnizAd(duzey: KademeDuzeyi): boolean {
  return duzey === 'ilkokul';
}

/**
 * 3B sahnede eksenler (x, y, z), eksen sayıları (negatifler dahil), "(0; 0; 0)" ve konum koordinatları gösterilir mi?
 * İlkokulda HAYIR ([180]: 2B ilkokul kipi koordinat eksenini kapatıyor, 3B'de açık kalıyordu); zemin ızgarası kalır.
 */
export function kademe3BEksenleriGosterir(duzey: KademeDuzeyi): boolean {
  return duzey !== 'ilkokul';
}

/** Bir tuvalin ayrım durumu: etkin boyut + öteki kümenin o tuvalde gizli olup olmadığı. */
export interface AyrimDurumu {
  /** Etkin boyut (studioDimension) bu tuvalin boyutu mu? */
  etkin: boolean;
  /** Öteki küme (3B'de 2B nesneler, 2B'de cisimler) bu tuvalde gizli mi? */
  gizli: boolean;
}

/**
 * Tuvalde GÖRÜNMEYEN kümenin seçimi bırakılsın mı (denetim, 4. tur S3)? Bırakılmazsa Sil (menü ya da tuş:
 * deleteSelection iki kümeyi birlikte siler) ekranda olmayan nesneleri silerdi: 2B'de Ctrl+A → 3B → Sil 2B çizimi,
 * izdüşüm kapalıyken 3B'de seçili cisim → 2B → Sil cismi. Seçim yalnız durum DEĞİŞİRKEN (tuval kurulurken, etkin boyut
 * bu tuvale geçerken, küme gizlenirken) bırakılır; durum aynı kaldıkça dokunulmaz: 2D + 3D çift görünümde öteki
 * paneldeki ilk tıklamanın kurduğu seçim (etkin boyut tıklamanın sonunda değişir) hemen silinmesin.
 */
export function gizliSecimBirakilir(onceki: AyrimDurumu | null, simdi: AyrimDurumu, secimVar: boolean): boolean {
  if (!simdi.etkin || !simdi.gizli || !secimVar) return false;
  return !onceki || !onceki.etkin || !onceki.gizli;
}
