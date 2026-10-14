/**
 * Atölye ekranının cümleleri (yıldız ölçütleri, Çalıştır ve "Hepsini sına" iletileri), saf işlevler.
 * Sahneler atölyenin kendi adıyla anılır ("1. tarlada çalışsın", "4 caddenin hepsinde"): sahneAdi.ts.
 * Dünya başına kodlu atölyede (Ayna atölyesi) sahne her zaman "saha"dır; cümleleri ayrıdır.
 */
import type { Atolye } from './gorev';
import type { SinamaSonucu } from './degerlendirme';
import { sahneAdi } from './sahneAdi';

export interface Olcut {
  n: number;
  metin: string;
}

/** Başlıktaki yıldız ölçütleri. Tek sahnede ★ ile ★★ birlikte gelir (ilk sahne aynı zamanda bütün sahneler). */
export function olcutMetinleri(a: Atolye): Olcut[] {
  const s = sahneAdi(a);
  const birim = a.gorunum === 'kart' ? 'kart' : 'blok';
  if (a.dunyaBasinaKod)
    return [
      { n: 1, metin: '1. sahada şekli tamamla' },
      { n: 2, metin: `${a.dunyalar.length} sahanın hepsinde tamamla` },
      { n: 3, metin: `Her sahada en çok ${a.enCokBlok} ${birim}` },
    ];
  if (a.dunyalar.length > 1)
    return [
      { n: 1, metin: `1. ${s.bulunma} çalışsın` },
      { n: 2, metin: `${a.dunyalar.length} ${s.tamlayan} hepsinde çalışsın` },
      { n: 3, metin: `En çok ${a.enCokBlok} ${birim} olsun` },
    ];
  return [
    { n: 2, metin: 'Doğru çalışsın' },
    { n: 3, metin: `En çok ${a.enCokBlok} ${birim} olsun` },
  ];
}

/** Seçili sahnede "Çalıştır" doğru bitince */
export function calismaBasariMetni(a: Atolye): string {
  if (a.dunyaBasinaKod) return 'Bu sahada şekil tamam. Öbür sahalara geç: Her sahada eksik yarıyı çizen kodu kur, sonra "Hepsini sına".';
  const s = sahneAdi(a);
  return a.dunyalar.length > 1 ? `Bu ${s.bulunma} doğru çalıştı. Şimdi "Hepsini sına" ile öbür ${s.cogulBulunma} dene.` : 'Doğru çalıştı. "Hepsini sına" ile yıldızını al.';
}

/**
 * "Hepsini sına" sonucu. `n`: blok sayısı (dünya başına kodda en uzun kod); `sahaIletisi(i)`: dünya başına kodda
 * i. sahanın iletisi (kodu kurulmadıysa bunu söyler).
 */
export function sinamaMetni(a: Atolye, sonuc: SinamaSonucu, n: number, sahaIletisi: (i: number) => string): string {
  const birim = a.gorunum === 'kart' ? 'kart' : 'blok';
  const ilkHata = sonuc.dunyalar.findIndex((d) => !d.basarili);
  if (a.dunyaBasinaKod) {
    if (sonuc.yildiz === 3) return `Üç yıldız! ${a.dunyalar.length} sahanın hepsinde eksik yarıyı çizdin; en uzun kodun ${n} ${birim}.`;
    if (sonuc.yildiz === 2) return `İki yıldız: Bütün sahalarda şekil tamam. Üçüncü yıldız için her sahada en çok ${a.enCokBlok} ${birim} (en uzun kodun ${n}).`;
    if (sonuc.yildiz === 1) return `Bir yıldız: 1. sahada şekil tamam. ${ilkHata + 1}. sahada olmadı: ${sahaIletisi(ilkHata)}`;
    return `1. sahada olmadı: ${sahaIletisi(0)}`;
  }
  const s = sahneAdi(a);
  const tek = a.dunyalar.length === 1;
  const calisiyor = tek ? 'doğru çalışıyor' : `bütün ${s.cogulBulunma} çalışıyor`;
  if (sonuc.yildiz === 3) return `Üç yıldız! Kodun ${calisiyor} ve kısa: ${n} ${birim}.`;
  if (sonuc.yildiz === 2) return `İki yıldız: ${calisiyor}. Üçüncü yıldız için en çok ${a.enCokBlok} ${birim} (şu an ${n}).`;
  if (sonuc.yildiz === 1) return `Bir yıldız: 1. ${s.bulunma} çalışıyor ama ${ilkHata + 1}. ${s.bulunma} olmadı: ${sonuc.dunyalar[ilkHata].ileti}`;
  return `${tek ? 'Olmadı' : `1. ${s.bulunma} olmadı`}: ${sonuc.dunyalar[0].ileti}`;
}
