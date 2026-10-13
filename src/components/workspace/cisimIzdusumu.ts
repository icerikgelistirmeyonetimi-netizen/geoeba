'use client';

/**
 * 2B tuvalde 3B cisimlerin üstten görünümü (izdüşüm) açık mı (uzman 4. tur [175]). Açılış değeri kademeden gelir
 * (kademeDuzeyleri3B.cisimIzdusumuVarsayilanAcik: ortaokulda kapalı); tuvalin "3B cisimler" anahtarı öğretmenin
 * seçimini bu oturum boyunca tutar. Seçim yalnız yapıldığı kademede geçerlidir: kademe değişince varsayılana dönülür.
 *
 * Seçim modül düzeyinde saklanır (useKademeDuzeyi kalıbı): düzen değişince (Görünüm menüsü) 2B tuval yeniden kurulsa
 * da anahtar yerinde kalır. WorkspaceView ve komut yolu kademeyi bilmez (kademeSuzgeciBaglantisi testi); okuyan Canvas.
 */
import { useSyncExternalStore } from 'react';
import { useKademeDuzeyi } from '@/hooks/useKademeDuzeyi';
import type { KademeDuzeyi } from './kademeDuzeyleri';
import { cisimIzdusumuAnahtariVar, cisimIzdusumuVarsayilanAcik } from './kademeDuzeyleri3B';

export interface IzdusumTercihi {
  kademe: KademeDuzeyi;
  acik: boolean;
}

let tercih: IzdusumTercihi | null = null;
const dinleyiciler = new Set<() => void>();

function abone(dinleyici: () => void): () => void {
  dinleyiciler.add(dinleyici);
  return () => {
    dinleyiciler.delete(dinleyici);
  };
}
const oku = () => tercih;
const sunucuDegeri = () => null;

/** Kademede izdüşüm açık mı: o kademede yapılmış bir seçim varsa o, yoksa kademenin varsayılanı. */
export function cisimIzdusumuAcikMi(kademe: KademeDuzeyi, t: IzdusumTercihi | null = tercih): boolean {
  return t?.kademe === kademe ? t.acik : cisimIzdusumuVarsayilanAcik(kademe);
}

/** Anahtarın işi: o kademedeki durumu tersine çevirir. */
export function cisimIzdusumunuDegistir(kademe: KademeDuzeyi): void {
  tercih = { kademe, acik: !cisimIzdusumuAcikMi(kademe) };
  dinleyiciler.forEach((d) => d());
}

/** [açık mı, anahtar (ilkokulda yok)] */
export function useCisimIzdusumu(): { acik: boolean; degistir?: () => void } {
  const [kademe] = useKademeDuzeyi();
  const t = useSyncExternalStore(abone, oku, sunucuDegeri);
  return {
    acik: cisimIzdusumuAcikMi(kademe, t),
    degistir: cisimIzdusumuAnahtariVar(kademe) ? () => cisimIzdusumunuDegistir(kademe) : undefined,
  };
}
