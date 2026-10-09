/**
 * Kademe → 3B araç paneli eşlemesi. 2B listesi kademeDuzeyleri.ts'tedir; bu dosya yalnız Toolbar3D'nin
 * ağaç listesini ve Ara sekmesini süzer (Canvas3D, WorkspaceView ve komutlar kademeyi bilmez).
 *
 * İlkokul (Dinamik Matematik Yazılımı İlkokul Raporu, 23.07.2026, 3B ekranı): Temel (Taşı, Sil; Döndür ve
 * İncele, Görünümü Kaydır), Katı Cisimler (Küp, Küre, Silindir, Üçgen Prizma, Kare Prizma, Dikdörtgen Prizma —
 * koni ve piramit YOK), Yüzü Seç ve Renklendir, Uzunluk Ölçme (ayrıtlar tam sayı), Cismi Döndür, Büyüt ve
 * Küçült (yansıtma ve öteleme YOK), Cisim Özellikleri (Köşeleri / Ayrıtları / Yüzleri Göster), görünümler.
 * Açınım 4. sınıf kazanımıdır (MAT.4.3.1: küp ve prizmaların açınımları) ve ilkokulda kalır.
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
  'show_axes',
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
