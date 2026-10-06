'use client';

/**
 * "Kesir Göster" aracının çubuğu: model (Daire / Şerit), pay ve payda seçimi. Araç etkinken ya da tuvalde bir kesir
 * modeli seçiliyken tuvalin üstünde durur. Araç tuvale bu ayardaki kesri koyar (WorkspaceContext, 'fraction');
 * seçili kesir modeli varsa çubuktaki değişiklik ona da uygulanır. İlkokulda payda 2-12 (kesirModeli.ts).
 */
import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useIlkokulKipi } from '@/hooks/useKademeDuzeyi';
import type { FractionObject, MathObject } from '@/types/math';
import { CubukAyirici, CubukDugmesi, CubukMetni, KayanCubuk } from './KayanCubuk';
import {
  KESIR_MODEL_ADLARI,
  kesirAyariniAyarla,
  kesirAyariniSinirla,
  kesirEtiketi,
  kesirSinirlari,
  useKesirAyari,
  type KesirAyari,
  type KesirModelTuru,
} from './kesirModeli';

function Sayac({ ad, deger, enAz, enCok, onDegis }: { ad: string; deger: number; enAz: number; enCok: number; onDegis: (n: number) => void }) {
  const dugme =
    'grid h-11 w-11 place-items-center rounded-xl text-foreground hover:bg-muted disabled:opacity-35 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer';
  return (
    <span className="inline-flex items-center gap-0.5" role="group" aria-label={ad}>
      <span className="px-1 text-[13px] font-semibold text-muted-foreground">{ad}</span>
      <button type="button" className={dugme} onClick={() => onDegis(deger - 1)} disabled={deger <= enAz} aria-label={`${ad} azalt`}>
        <Minus className="h-4 w-4" />
      </button>
      <span className="min-w-[1.75rem] text-center font-mono text-[15px] font-bold tabular-nums" aria-live="polite" data-kesir-sayi={ad}>
        {deger}
      </span>
      <button type="button" className={dugme} onClick={() => onDegis(deger + 1)} disabled={deger >= enCok} aria-label={`${ad} artır`}>
        <Plus className="h-4 w-4" />
      </button>
    </span>
  );
}

export function KesirAraciCubugu() {
  const { activeTool, objects, selectedObjectId, updateObject } = useWorkspace();
  const ilkokul = useIlkokulKipi();
  const aracAyari = useKesirAyari();
  const secili = objects.find((o) => o.id === selectedObjectId && o.type === 'fraction') as FractionObject | undefined;
  if (activeTool !== 'fraction' && !(secili && activeTool === 'select')) return null;

  // Seçili model varsa çubuk onu gösterir; yoksa aracın tuvale koyacağı kesri
  const gosterilen = kesirAyariniSinirla(
    secili ? { pay: secili.numerator, payda: secili.denominator, model: secili.modelType } : aracAyari,
    ilkokul
  );
  const sinir = kesirSinirlari(ilkokul);

  const uygula = (degisiklik: Partial<KesirAyari>) => {
    const yeni = kesirAyariniSinirla({ ...gosterilen, ...degisiklik }, ilkokul);
    kesirAyariniAyarla(yeni);
    if (secili) {
      updateObject(secili.id, {
        numerator: yeni.pay,
        denominator: yeni.payda,
        modelType: yeni.model,
        label: kesirEtiketi(yeni.pay, yeni.payda),
      } as Partial<MathObject>);
    }
  };

  return (
    <KayanCubuk konum="ust" data-kesir-cubugu>
      <CubukMetni
        simge={<span className="font-bold text-xs">½</span>}
        baslik={`Kesir ${gosterilen.pay}/${gosterilen.payda}`}
        aciklama={secili ? 'Seçili modeli değiştir' : 'Tuvale dokun: bu kesir modeli konur'}
      />
      <CubukAyirici />
      {(Object.keys(KESIR_MODEL_ADLARI) as KesirModelTuru[]).map((m) => (
        <CubukDugmesi key={m} tur={gosterilen.model === m ? 'birincil' : 'normal'} aria-pressed={gosterilen.model === m} onClick={() => uygula({ model: m })}>
          {KESIR_MODEL_ADLARI[m]}
        </CubukDugmesi>
      ))}
      <CubukAyirici />
      <Sayac ad="Pay" deger={gosterilen.pay} enAz={sinir.payEnAz} enCok={sinir.payEnCok(gosterilen.payda)} onDegis={(pay) => uygula({ pay })} />
      <Sayac ad="Payda" deger={gosterilen.payda} enAz={sinir.paydaEnAz} enCok={sinir.paydaEnCok} onDegis={(payda) => uygula({ payda })} />
    </KayanCubuk>
  );
}
