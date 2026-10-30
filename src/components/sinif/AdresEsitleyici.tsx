'use client';

/**
 * Çizim Stüdyosu öndeyken adres çubuğu çizimle eşit tutulur: çizim (2B nesneler, 3B cisimler, görünüm, kamera, açık boyut)
 * değiştikçe, kısa bir beklemeden sonra adres paylaşım bağlantısıyla aynı biçime (#/studyo/paylas/<kademe>/<veri>;
 * math/cizimPaylasimi.ts) getirilir. Kullanıcı adresi doğrudan kopyalayıp paylaşabilir; sayfa yenilenince de aynı çizim açılır.
 *
 * - history.replaceState: geçmiş şişmez, Geri düğmesi stüdyoya giriş kaydında kalır.
 * - Bağlantıdaki sınırlar aynen: uyarı uzunluğunu aşan adres yazılır ama bir kez uyarılır; tarayıcı sınırını aşan çizimde
 *   adres '#/studyo'da kalır ve bir kez bildirilir (Dosya > Kaydet önerilir).
 * - Bileşen sökülünce (masaüstüne dönüldü, Stüdyo küçültüldü / kapatıldı, öne başka uygulama geldi, sınıftan çıkıldı) adres
 *   yeniden '#/studyo' olur. Yalnız adres hâlâ bir paylaşım adresiyse: sınıftan çıkışta yeni kayıt ('#/home') çoktan
 *   eklenmiştir, ona dokunulmaz.
 */
import { useEffect, useRef } from 'react';
import type { LevelId } from '@/types/curriculum';
import { useWorkspace } from '@/state/WorkspaceContext';
import {
  PAYLASIM_EN_UZUN,
  PAYLASIM_UYARI_UZUNLUGU,
  paylasimAdresiniCoz,
  paylasimBaglantisi,
  paylasimHashi,
  paylasimVerisiOlustur,
} from '@/math/cizimPaylasimi';
import { PAYLASIM_VARSAYILANLARI } from '@/components/workspace/paylasimVarsayilanlari';

/** Son değişiklikten sonra adresin güncellenmesi (sürükleme, kaydırma sürerken her karede sıkıştırılmasın) */
export const ADRES_GECIKMESI = 500;

/** Adres hâlâ bir paylaşım adresiyse stüdyonun sade adresine döner (geçmişe kayıt eklenmez). */
export function adresiSadelestir(): void {
  if (!paylasimAdresiniCoz(window.location.hash)) return;
  window.history.replaceState(window.history.state, '', '#/studyo');
}

export function AdresEsitleyici({ kademe }: { kademe: LevelId }) {
  const { getProject, kaynakNesneler, sceneBridge, viewport, styleSettings, layoutMode, studioDimension, setHintMessage } = useWorkspace();
  /** Son gösterilen uyarı: aynı sınır aşıldıkça yinelenmez, sınırın altına inince sıfırlanır */
  const uyari = useRef<'uzun' | 'sigmaz' | null>(null);
  const solids = sceneBridge?.solids;
  const camera = sceneBridge?.camera;

  useEffect(() => {
    let etkin = true;
    const t = window.setTimeout(async () => {
      let veri: string;
      try {
        veri = await paylasimVerisiOlustur({ boyut: studioDimension, proje: getProject(), varsayilanlar: PAYLASIM_VARSAYILANLARI });
      } catch {
        return;
      }
      if (!etkin) return;
      const uzunluk = paylasimBaglantisi(kademe, veri).length;
      if (uzunluk > PAYLASIM_EN_UZUN) {
        adresiSadelestir();
        if (uyari.current !== 'sigmaz') {
          uyari.current = 'sigmaz';
          setHintMessage('Çizim adres çubuğuna sığmayacak kadar büyük; adres güncellenmiyor. Paylaşmak için Dosya > Kaydet ile dosya olarak kaydedin.');
        }
        return;
      }
      if (uzunluk > PAYLASIM_UYARI_UZUNLUGU) {
        if (uyari.current !== 'uzun') {
          uyari.current = 'uzun';
          setHintMessage(`Adres çok uzun (${uzunluk.toLocaleString('tr-TR')} karakter); bazı ileti uygulamaları kesebilir. Kesilirse Dosya > Kaydet ile paylaşın.`);
        }
      } else uyari.current = null;
      const hash = paylasimHashi(kademe, veri);
      if (window.location.hash !== hash) window.history.replaceState(window.history.state, '', hash);
    }, ADRES_GECIKMESI);
    return () => {
      etkin = false;
      window.clearTimeout(t);
    };
  }, [kademe, kaynakNesneler, solids, camera, viewport, styleSettings, layoutMode, studioDimension, getProject, setHintMessage]);

  useEffect(() => () => adresiSadelestir(), []);

  return null;
}
