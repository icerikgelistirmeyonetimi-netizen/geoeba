/**
 * Algoritma Laboratuvarı — atölyenin sınama sahnelerinin ekrandaki adı.
 *
 * Atölyede kod birkaç sahnede sınanır. Ekranda bunlara "dünya" deniyordu ("1. dünyada çalışsın",
 * "4 dünyanın hepsinde"); alan uzmanı (4. tur, geoeba (3).xlsx satır 117–119, 124–126): "Dünya
 * kelimelerini tarla / cadde / sera / piramit / pist ile değiştirelim". Her atölye sahnesini kendi
 * bağlamındaki adla anar. Çekimler elle yazılır: ünlü uyumu ve ünsüz yumuşaması kurala bırakılmaz
 * (piramit → piramidin, sokak → sokağın, göl → gölde).
 * Kod içindeki "dunya" adları (DunyaTanimi, dunyalar …) değişmez; bu yalnız görünen metindir.
 */

export interface SahneAdi {
  /** Sayıdan sonra: "4 tarla" */
  yalin: string;
  /** "1. tarlada çalışsın" */
  bulunma: string;
  /** "4 tarlanın hepsinde" */
  tamlayan: string;
  /** "Sınanacak tarlalar" */
  cogul: string;
  /** "bütün tarlalarda", "öbür tarlalarda" */
  cogulBulunma: string;
}

const ad = (yalin: string, bulunma: string, tamlayan: string, cogul: string, cogulBulunma: string): SahneAdi => ({ yalin, bulunma, tamlayan, cogul, cogulBulunma });

export const SAHNE = {
  tarla: ad('tarla', 'tarlada', 'tarlanın', 'tarlalar', 'tarlalarda'),
  cadde: ad('cadde', 'caddede', 'caddenin', 'caddeler', 'caddelerde'),
  sera: ad('sera', 'serada', 'seranın', 'seralar', 'seralarda'),
  piramit: ad('piramit', 'piramitte', 'piramidin', 'piramitler', 'piramitlerde'),
  pist: ad('pist', 'pistte', 'pistin', 'pistler', 'pistlerde'),
  bahce: ad('bahçe', 'bahçede', 'bahçenin', 'bahçeler', 'bahçelerde'),
  saha: ad('saha', 'sahada', 'sahanın', 'sahalar', 'sahalarda'),
  sokak: ad('sokak', 'sokakta', 'sokağın', 'sokaklar', 'sokaklarda'),
  pencere: ad('pencere', 'pencerede', 'pencerenin', 'pencereler', 'pencerelerde'),
  tribun: ad('tribün', 'tribünde', 'tribünün', 'tribünler', 'tribünlerde'),
  gol: ad('göl', 'gölde', 'gölün', 'göller', 'göllerde'),
  duzlem: ad('düzlem', 'düzlemde', 'düzlemin', 'düzlemler', 'düzlemlerde'),
  site: ad('site', 'sitede', 'sitenin', 'siteler', 'sitelerde'),
  /** Yansız ad: sahnesine ad verilmemiş (tek sahneli) projeler */
  sahne: ad('sahne', 'sahnede', 'sahnenin', 'sahneler', 'sahnelerde'),
} as const satisfies Record<string, SahneAdi>;

/** Atölyenin sahne adı; yazılmamışsa yansız "sahne" */
export function sahneAdi(a: { sahne?: SahneAdi }): SahneAdi {
  return a.sahne ?? SAHNE.sahne;
}
