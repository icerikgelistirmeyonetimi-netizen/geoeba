import React from 'react';
import type { Point2D, PointObject, ViewportTransform } from '@/types/math';
import { formatCoordinate, worldToScreen } from '@/math/coordinates';
import { projectLabelPoint } from '@/math/labelViewport';
import { NESNE_RENGI } from '@/utils/nesneRenkleri';
import { KOSE_BOSLUGU, noktaAdiYeri, type AdYonu, type NoktaEngeli } from '../noktaAdi';
import type { YaziBoyu } from './izgaraVeEksenler';

/*
 * TUVALİN NOKTALAR VE İZLER KATMANLARI. Bileşen değil ÇİZİM İŞLEVLERİDİR: Canvas döndürdükleri SVG öğelerini kendi
 * ağacına doğrudan yerleştirir (tuvalin çizim çıktısı kaydı öğe ağacını birebir karşılaştırır, tuvalCizimKaydi.test.ts).
 */

/** Nesnelerin bıraktığı izler (İzi Göster): nesne kimliği → dünya noktaları ve renk */
export type Izler = Record<string, { points: Point2D[]; color: string }>;

/**
 * İz katmanı: her iz kesikli bir çizgi ve her üç kayıttan birinde küçük bir nokta. Altta görünmez kalın bir yakalayıcı
 * vardır: ize sağ tıklanınca "Bu izi sil" menüsü açılır (sol tık tuvale geçer).
 */
export function izKatmani(izler: Izler, viewport: ViewportTransform, izMenusunuAc: (e: React.MouseEvent, izId: string) => void) {
  return Object.entries(izler).map(([id, iz]) => {
    if (!iz.points || iz.points.length < 2) return null;
    const ekran = iz.points.map((p) => worldToScreen(p, viewport));
    const cizgi = ekran.map((p) => `${p.x},${p.y}`).join(' ');
    const renk = iz.color || NESNE_RENGI.mavi;
    return (
      <g key={`trace-${id}`} className="select-none" data-iz-id={id}>
        <polyline
          points={cizgi}
          fill="none"
          stroke="transparent"
          strokeWidth={12}
          style={{ pointerEvents: 'stroke' }}
          data-iz-yakalayici=""
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            izMenusunuAc(e, id);
          }}
        />
        <polyline className="pointer-events-none" points={cizgi} fill="none" stroke={renk} strokeWidth={2} strokeOpacity={0.65} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="3,3" />
        {ekran.map((p, i) => (i % 3 === 0 ? <circle key={`tr-pt-${id}-${i}`} className="pointer-events-none" cx={p.x} cy={p.y} r={2} fill={renk} fillOpacity={0.7} /> : null))}
      </g>
    );
  });
}

/**
 * Nokta adı ölçü etiketleriyle AYNI yazılır: 'A_1' → A ve gerçek alt indis, "B'" → B′ (yazimDuzeni.yerlestir'deki
 * kuralın SVG <text> karşılığı). dy birikimlidir: alt indisten sonra taban çizgisi sıfır genişlikli bir tspan'la geri
 * alınır, koordinat eki kaymaz.
 */
const AD_BICIMI = /^(\p{L})(?:_(\d+))?('*)$/u;
function adYazimi(ad: string, px: number): React.ReactNode {
  const m = ad.match(AD_BICIMI);
  if (!m || (!m[2] && !m[3])) return ad;
  const ussu = m[3] ? '′'.repeat(m[3].length) : '';
  if (!m[2]) return m[1] + ussu;
  const kayma = Number((px * 0.22).toFixed(2));
  return (
    <>
      {m[1]}
      <tspan fontSize={Number((px * 0.68).toFixed(2))} dy={kayma}>{m[2]}</tspan>
      <tspan dy={-kayma}>{ussu || '​'}</tspan>
    </>
  );
}

/** Noktalar katmanının Canvas'tan aldığı durum ve işlevler */
export interface NoktaKatmaniBaglami {
  viewport: ViewportTransform;
  /** Etiket yerleşiminin sabit ölçekli görünümü (Canvas.etiketGorunumu) */
  etiketGorunumu: ViewportTransform;
  seciliMi: (id: string) => boolean;
  bekleyenMi: (id: string) => boolean;
  /** Sade görünüm: nokta gövdesi yalnız seçili / bekleyen noktada ya da Nokta aracındayken çizilir, ad yazılmaz */
  sade: boolean;
  noktaAraci: boolean;
  /** Koordinat eki yalnız ölçüler görünürken yazılır (Canvas.showDetails) */
  olculerGorunur: boolean;
  noktaYaricapi: number;
  secimRengi: string;
  /** Etkin araca göre imleç sınıfı (imlecSinifi(arac, 'nokta')) */
  imlec: string;
  olaylar: (nokta: PointObject) => object;
  kilitliMi: (nokta: PointObject) => boolean;
  /** Ad etiketinin sürükleme kayıklığı ve tıklama davranışı (Canvas.olcumEtiketi) */
  adEtiketi: (id: string) => { transform: string; style: React.CSSProperties; onPointerDown: React.PointerEventHandler; onClick?: React.MouseEventHandler };
  yaziBoyu: YaziBoyu;
  yaziOlcegi: number;
  yerlesimOrani: number;
  etiketOlcegi: number;
  /** Her noktanın adını sakınacağı çizgiler (noktaAdi.noktaEngelleri) */
  engeller: ReadonlyMap<string, readonly NoktaEngeli[]>;
  /** Adın bir önceki yönü: şekil sürüklenirken ad noktanın çevresinde zıplamasın (her çizimde güncellenir) */
  oncekiYonler: Map<string, AdYonu>;
}

/**
 * Nokta adı ve (Koordinatlar açıksa) koordinatı. Ad çizgilerin üstüne gelmez: sağ üst rahatsa orada kalır, değilse
 * adaylar puanlanır ve önceki yön hâlâ rahatsa ad yerinden oynamaz (noktaAdi.noktaAdiYeri). Ad kutusu yerleşim
 * uzayındadır: yazı alt sınırı devredeyken ad şekle göre büyür, nokta işareti ise ekranda sabit piksel kalır.
 */
function noktaAdi(nokta: PointObject, b: NoktaKatmaniBaglami) {
  const et = b.adEtiketi(nokta.id);
  const adBoyu = b.yaziBoyu(12, 'label');
  const koordinatBoyu = b.yaziBoyu(10, 'label');
  const koordinatVar = b.viewport.showCoordinates && b.olculerGorunur;
  const koordinatEki = koordinatVar ? ` ${formatCoordinate(nokta, 1)}` : '';
  const yer = noktaAdiYeri(
    worldToScreen(nokta, b.etiketGorunumu),
    b.engeller.get(nokta.id) ?? [],
    {
      genislik: ((nokta.label || '').length * adBoyu * 0.66 + koordinatEki.length * koordinatBoyu * 0.56) * b.yerlesimOrani,
      yukseklik: adBoyu * b.yerlesimOrani,
      bosluk: Math.max(KOSE_BOSLUGU, ((nokta.size || b.noktaYaricapi) + 4) / (b.etiketOlcegi || 1)),
    },
    b.oncekiYonler.get(nokta.id),
  );
  b.oncekiYonler.set(nokta.id, yer.yon);
  const ekran = projectLabelPoint(yer, b.viewport);
  return (
    <text
      transform={et.transform}
      style={et.style}
      onPointerDown={et.onPointerDown}
      onClick={et.onClick}
      x={ekran.x}
      y={ekran.y}
      textAnchor={yer.textAnchor}
      data-ad-yonu={yer.yon}
      fontSize={adBoyu * b.yaziOlcegi} className="fill-foreground font-bold select-none drop-shadow"
    >
      {adYazimi(nokta.label ?? '', adBoyu * b.yaziOlcegi)}
      {koordinatVar && (
        <tspan fontSize={koordinatBoyu * b.yaziOlcegi} className="font-normal fill-muted-foreground ml-1">
          {' '}
          {formatCoordinate(nokta, 1)}
        </tspan>
      )}
    </text>
  );
}

/**
 * Noktalar katmanı. Her noktada: 18 px'lik görünmez yakalayıcı (Sade görünümde de seçilip taşınabilsin), seçim ya da
 * bekleme halkası, gövde (kilitli nokta gri) ve ad. Gövdede yalnız boyut ve renk yumuşak geçer: konum geçişi kaydırma ve
 * yakınlaştırmada noktaları çizgilerin gerisinde bırakıyordu.
 */
export function noktaKatmani(noktalar: readonly PointObject[], b: NoktaKatmaniBaglami) {
  return noktalar.map((nokta) => {
    const e = worldToScreen(nokta, b.viewport);
    const secili = b.seciliMi(nokta.id);
    const bekleyen = b.bekleyenMi(nokta.id);
    return (
      <g key={nokta.id} className={`group select-none ${b.imlec}`} {...b.olaylar(nokta)}>
        <circle cx={e.x} cy={e.y} r={18} fill="transparent" className={b.imlec} />
        {(secili || bekleyen) && (
          <circle
            cx={e.x}
            cy={e.y}
            r={12}
            fill="none"
            stroke={bekleyen ? '#f59e0b' : b.secimRengi}
            strokeWidth={2}
            strokeDasharray={bekleyen ? '3,3' : undefined}
            className="animate-pulse pointer-events-none"
          />
        )}
        {(!b.sade || secili || bekleyen || b.noktaAraci) && (
          <circle
            cx={e.x}
            cy={e.y}
            r={(nokta.size || b.noktaYaricapi) + (secili ? 1.5 : 0)}
            fill={b.kilitliMi(nokta) ? '#94a3b8' : nokta.color || NESNE_RENGI.mavi}
            stroke="#ffffff"
            strokeWidth={secili ? 3 : 2}
            className="transition-[r,fill,stroke-width] pointer-events-none drop-shadow-sm"
          />
        )}
        {nokta.showLabel && !b.sade && noktaAdi(nokta, b)}
      </g>
    );
  });
}
