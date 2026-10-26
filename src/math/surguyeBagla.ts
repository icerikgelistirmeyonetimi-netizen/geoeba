import type { MathObject, Point2D, SliderObject } from '@/types/math';
import { NESNE_RENGI } from '@/utils/nesneRenkleri';
import { bindSliderProperty } from './sliderBindings';
import { onerilenSurguAyari, ozellikDegeri } from './surguOnerisi';

/*
 * NESNENİN MENÜSÜNDEN "SÜRGÜYE BAĞLA": seçilen özellik için yeni bir kaydırıcı oluşturulur ve hemen bağlanır.
 * Kaydırıcı özelliğin şimdiki değeriyle gelir (surguOnerisi.ts); nesne yerinden oynamaz.
 */

/** Sayı kaydırıcılarının ad sırası (Kaydırıcı penceresindeki gibi; x, y, z yok: eksen adlarıyla karışmasın) */
const SAYI_ADLARI = ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'u', 'v'];
/** Açı kaydırıcılarının ad sırası */
const ACI_ADLARI = ['α', 'β', 'γ', 'θ', 'φ', 'ψ'];

/** Sahnede kullanılmayan ilk kaydırıcı adı; hepsi doluysa ilk addan sonra sıra numarası (a1, a2 …) */
export function siradakiSurguAdi(objects: readonly MathObject[], aci = false): string {
  const kullanilan = new Set(objects.flatMap((o) => (o.type === 'slider' ? [o.variableName] : [])));
  const adlar = aci ? ACI_ADLARI : SAYI_ADLARI;
  const bos = adlar.find((ad) => !kullanilan.has(ad));
  if (bos) return bos;
  for (let i = 1; ; i++) if (!kullanilan.has(`${adlar[0]}${i}`)) return `${adlar[0]}${i}`;
}

/**
 * Nesnenin özelliğine bağlı yeni bir kaydırıcı ekler. `yer` tuvaldeki konum ve uzunluktur (surguYerlesimi). Bağ
 * kurulamazsa bindSliderProperty'nin hatası olduğu gibi atılır; girdi sahnesi değişmez.
 */
export function yeniSurguyleBagla(
  objects: readonly MathObject[],
  targetId: string,
  key: string,
  yer: Point2D & { length: number },
  kimlikler: { surgu: string; nokta: () => string; an: number },
): { nesneler: MathObject[]; surgu: SliderObject } {
  const olcu = ozellikDegeri(objects, targetId, key);
  if (!olcu) throw new Error('Bu özellik için kaydırıcı oluşturulamıyor.');
  const ayar = onerilenSurguAyari(olcu);
  const aci = olcu.tur === 'aci';
  const ad = siradakiSurguAdi(objects, aci);
  const surgu: SliderObject = {
    id: kimlikler.surgu,
    type: 'slider',
    label: `${ad} Parametresi`,
    showLabel: true,
    variableName: ad,
    ...ayar,
    ...(aci ? { sliderType: 'angle' as const } : {}),
    animSpeed: 1,
    animMode: 'oscillating',
    x: yer.x,
    y: yer.y,
    length: yer.length,
    color: NESNE_RENGI.mor,
    visible: true,
    createdAt: kimlikler.an,
  };
  return { nesneler: bindSliderProperty([...objects, surgu], surgu.id, targetId, key, kimlikler.nokta), surgu };
}
