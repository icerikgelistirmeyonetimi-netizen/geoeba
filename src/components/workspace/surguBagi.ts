import type { MathObject, SliderObject } from '@/types/math';
import type { ObjectsUpdater } from '@/state/WorkspaceContext';
import { sliderBaginiAskiyaAl, sliderBaginiSurdur, sliderCurrentBinding, sliderIsBound } from '@/math/sliderBindings';

/*
 * KAYDIRICININ BAĞ ZİNCİRİ (2B tuvaldeki sürgü ve 3B sürgü paneli): bağ durumu, zincir düğmesinin açıklaması ve
 * tıklanınca yapılan iş. Bağlıysa renkli zincir (tıklamak bağı geçici kapatır), geçici kapalıysa turuncu kırık zincir
 * (tıklamak yeniden bağlar), bağsızsa soluk kırık zincir (tıklamak ayarları açar).
 */

export type SurguBagDurumu = 'bagli' | 'askida' | 'bagsiz';

/** Kaydırıcının bağ durumu; `olcuAdi` bağlı olduğu ölçünün adıdır (|AB|, x(A) …) */
export function surguBagi(objects: readonly MathObject[], s: SliderObject, olcuAdi: string) {
  const bagli = sliderIsBound(objects, s.id);
  const askida = !!s.suspendedBinding && !bagli;
  // Bir nesnenin özelliğine bağlı (geçici kapatılabilir) ya da yalnız bir fonksiyonda kullanılıyor
  const sekleBagli = bagli && (!!sliderCurrentBinding(objects, s.id) || !!s.cisimBagi);
  const durum: SurguBagDurumu = bagli ? 'bagli' : askida ? 'askida' : 'bagsiz';
  const aciklama = sekleBagli
    ? `${olcuAdi} ölçüsüne bağlı. Bağı geçici olarak kapatmak için tıklayın.`
    : bagli
      ? 'Bir fonksiyonda kullanılıyor. Ayarlar için tıklayın.'
      : askida
        ? `${olcuAdi} bağı geçici olarak kapalı. Yeniden bağlamak için tıklayın.`
        : 'Hiçbir nesneye bağlı değil. Bağlamak için tıklayın.';
  return { bagli, askida, sekleBagli, durum, aciklama };
}

export interface SurguBagIslemleri {
  commit: (next: ObjectsUpdater, description: string) => void;
  ipucu: (metin: string) => void;
  ayarlariAc: () => void;
  noktaKimligi: () => string;
}

/** Zincire tıklama: bağı geçici kapatır, geçici kapalıysa yeniden kurar, bağsızsa ayarları açar */
export function surguBaginiDegistir(objects: MathObject[], s: SliderObject, islem: SurguBagIslemleri): void {
  const { sekleBagli, askida } = surguBagi(objects, s, '');
  try {
    if (sekleBagli) {
      sliderBaginiAskiyaAl(objects, s.id);
      islem.commit((prev) => sliderBaginiAskiyaAl(prev, s.id), `${s.variableName} kaydırıcısının bağı geçici olarak kapatıldı`);
      islem.ipucu(`${s.variableName} kaydırıcısının bağı kapalı: şekil serbest. Yeniden bağlamak için zincire tıklayın.`);
    } else if (askida) {
      // Ön deneme ve geçmiş adımı aynı yeni nokta kimliklerini kullanır
      const yeniKimlikler: string[] = [];
      let sira = 0;
      const kimlik = () => yeniKimlikler[sira] ?? (yeniKimlikler[sira] = islem.noktaKimligi());
      sliderBaginiSurdur(objects, s.id, () => kimlik());
      islem.commit((prev) => {
        sira = 0;
        return sliderBaginiSurdur(prev, s.id, () => {
          const k = kimlik();
          sira += 1;
          return k;
        });
      }, `${s.variableName} kaydırıcısının bağı yeniden kuruldu`);
      islem.ipucu(`${s.variableName} kaydırıcısı yeniden bağlandı: şekil kaydırıcının değerine döndü.`);
    } else {
      islem.ayarlariAc();
    }
  } catch (hata) {
    islem.ipucu(hata instanceof Error ? hata.message : 'Kaydırıcının bağı değiştirilemedi.');
  }
}
