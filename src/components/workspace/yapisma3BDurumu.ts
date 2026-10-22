'use client';

/**
 * 3B Mıknatıs (YAP3B) açık mı? Açılış değeri kademeden gelir (kademeDuzeyleri3B.kademe3BYapismaVarsayilanAcik: her
 * kademede açık); araç panelindeki «Mıknatıs» satırı ve tuvalin sol üst köşe düğmesi seçimi bu oturum boyunca tutar.
 * Seçim yalnız yapıldığı kademede geçerlidir: kademe değişince varsayılana dönülür, o kademeye dönünce seçim yerindedir.
 *
 * cisimIzdusumu.ts kalıbı: seçim modül düzeyinde saklanır (düzen değişince 3B tuval yeniden kurulsa da yerinde kalır);
 * proje dosyasına girmez, WorkspaceView kademeyi bilmez. Okuyanlar: Canvas3D (sürükleme) ve Toolbar3D (anahtar satırı).
 */
import { useSyncExternalStore } from 'react';
import { useKademeDuzeyi } from '@/hooks/useKademeDuzeyi';
import type { YapismaProfili } from '@/math/yapisma3d';
import type { KademeDuzeyi } from './kademeDuzeyleri';
import { kademe3BYapismaProfili, kademe3BYapismaVarsayilanAcik } from './kademeDuzeyleri3B';

export interface YapismaTercihi {
  kademe: KademeDuzeyi;
  acik: boolean;
}

let tercih: YapismaTercihi | null = null;
let altTercih: { izgara: boolean; nesne: boolean } = { izgara: true, nesne: true };
const SUNUCU_ALT_TERCIH = { izgara: true, nesne: true };
const okuAlt = () => altTercih;
const sunucuAltDegeri = () => SUNUCU_ALT_TERCIH;
const dinleyiciler = new Set<() => void>();

function abone(dinleyici: () => void): () => void {
  dinleyiciler.add(dinleyici);
  return () => {
    dinleyiciler.delete(dinleyici);
  };
}
const oku = () => tercih;
const sunucuDegeri = () => null;
const bildir = () => dinleyiciler.forEach((d) => d());

/** Kademede Mıknatıs açık mı: o kademede yapılmış bir seçim varsa o, yoksa kademenin varsayılanı. */
export function yapisma3BAcikMi(kademe: KademeDuzeyi, t: YapismaTercihi | null = tercih): boolean {
  return t?.kademe === kademe ? t.acik : kademe3BYapismaVarsayilanAcik(kademe);
}

/** Anahtarın işi: o kademedeki durumu tersine çevirir. */
export function yapisma3BDegistir(kademe: KademeDuzeyi): void {
  tercih = { kademe, acik: !yapisma3BAcikMi(kademe) };
  bildir();
}

/** Testler için: seçimi siler (varsayılana dönülür). */
export function yapisma3BTercihiniSifirla(): void {
  tercih = null;
  altTercih = { izgara: true, nesne: true };
  bildir();
}

/** [açık mı, anahtar, kademe profili] */
export function yapisma3BIzgaraDegistir(): void {
  altTercih = { ...altTercih, izgara: !altTercih.izgara };
  bildir();
}

export function yapisma3BNesneDegistir(): void {
  altTercih = { ...altTercih, nesne: !altTercih.nesne };
  bildir();
}

export function useYapisma3B(): {
  acik: boolean;
  degistir: () => void;
  profil: YapismaProfili;
  izgaraAcik: boolean;
  nesneAcik: boolean;
  izgaraDegistir: () => void;
  nesneDegistir: () => void;
} {
  const alt = useSyncExternalStore(abone, okuAlt, sunucuAltDegeri);
  const [kademe] = useKademeDuzeyi();
  const t = useSyncExternalStore(abone, oku, sunucuDegeri);
  return {
    acik: yapisma3BAcikMi(kademe, t),
    degistir: () => yapisma3BDegistir(kademe),
    profil: kademe3BYapismaProfili(kademe),
    izgaraAcik: alt.izgara,
    nesneAcik: alt.nesne,
    izgaraDegistir: yapisma3BIzgaraDegistir,
    nesneDegistir: yapisma3BNesneDegistir,
  };
}
