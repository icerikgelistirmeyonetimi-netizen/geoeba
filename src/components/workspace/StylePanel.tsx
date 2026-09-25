'use client';

import React, { useState } from 'react';
import { ChevronDown, Minus, Type, CircleDot, RotateCcw, Eye, Sigma } from 'lucide-react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { DEFAULT_STYLE_SETTINGS, StyleSettings } from '@/types/workspace';
import { formatTurkishNumber } from '@/math/coordinates';
import type { AciYazimi, OlcuYazimi, YazimAyari } from '@/math/matematikYazimi';
import { MatematikMetni } from '@/components/workspace/MatematikMetni';

interface AyarKaydiriciProps {
  etiket: string;
  ipucu?: string;
  deger: number;
  min: number;
  max: number;
  adim: number;
  /** Değeri kullanıcıya nasıl göstereceğiz: çarpan (1,2×) mı, piksel (6 px) mi? */
  birim: 'carpan' | 'px';
  onChange: (v: number) => void;
}

function AyarKaydirici({ etiket, ipucu, deger, min, max, adim, birim, onChange }: AyarKaydiriciProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-foreground">{etiket}</span>
        <span className="text-[11px] font-black text-primary tabular-nums">
          {birim === 'carpan' ? `${formatTurkishNumber(deger)}×` : `${formatTurkishNumber(deger)} px`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={adim}
        value={deger}
        aria-label={etiket}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary cursor-pointer"
      />
      {ipucu && <p className="text-[10px] text-muted-foreground leading-snug">{ipucu}</p>}
    </div>
  );
}

function AyarOnay({
  etiket,
  ipucu,
  isaretli,
  onChange,
}: {
  etiket: string;
  ipucu?: string;
  isaretli: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-muted/40 border border-border/60 cursor-pointer">
        <input
          type="checkbox"
          checked={isaretli}
          onChange={(e) => onChange(e.target.checked)}
          className="w-3.5 h-3.5 accent-primary cursor-pointer"
        />
        <span className="text-[11px] font-bold text-foreground">{etiket}</span>
      </label>
      {ipucu && <p className="text-[10px] text-muted-foreground leading-snug px-1">{ipucu}</p>}
    </div>
  );
}

interface AyarSecenegi<T extends string> {
  deger: T;
  etiket: string;
  /** Seçeneğin MEB yazımıyla canlı önizlemesi ("|AB| = 5 br") */
  ornek: string;
  /** Önizleme HER ZAMAN kendi seçeneğinin biçiminde çizilir, o an geçerli olan ayarda değil. */
  ornekAyari?: YazimAyari;
}

/**
 * İki-üç seçenekli ayar (bölmeli düğme kümesi). Her seçenek ne yaptığını ÖRNEKLE gösterir:
 * kullanıcı "tam" / "kısa" gibi sözcükleri değil, ekranda göreceği yazımı seçer.
 */
function AyarSecim<T extends string>({
  etiket,
  deger,
  secenekler,
  onChange,
}: {
  etiket: string;
  deger: T;
  secenekler: readonly AyarSecenegi<T>[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-bold text-foreground">{etiket}</span>
      <div role="radiogroup" aria-label={etiket} className="flex flex-col gap-1.5">
        {secenekler.map((s) => {
          const secili = deger === s.deger;
          return (
            <button
              key={s.deger}
              type="button"
              role="radio"
              aria-checked={secili}
              onClick={() => onChange(s.deger)}
              className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-colors cursor-pointer ${
                secili
                  ? 'border-primary/60 bg-primary/10 text-foreground'
                  : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted'
              }`}
            >
              <span className="text-[11px] font-bold">{s.etiket}</span>
              <MatematikMetni
                metin={s.ornek}
                ayar={s.ornekAyari}
                className={`shrink-0 text-[11px] leading-[1.45] ${secili ? 'text-primary font-bold' : 'text-muted-foreground'}`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

const OLCU_SECENEKLERI: readonly AyarSecenegi<OlcuYazimi>[] = [
  { deger: 'tam', etiket: 'Adıyla', ornek: '|AB| = 5 br' },
  { deger: 'kisa', etiket: 'Yalnızca değer', ornek: '5 br' },
];

const ACI_SECENEKLERI: readonly AyarSecenegi<AciYazimi>[] = [
  { deger: 'sapka', etiket: 'Şapkalı (MEB)', ornek: 'm(∠ABC) = 60°', ornekAyari: { olcuYazimi: 'tam', aciYazimi: 'sapka' } },
  { deger: 'isaret', etiket: '∠ işaretli', ornek: 'm(∠ABC) = 60°', ornekAyari: { olcuYazimi: 'tam', aciYazimi: 'isaret' } },
];

/**
 * Sağ paneldeki "Stil" sekmesi.
 *
 * Üç ana ayar tüm çizimi ORANTILI olarak değiştirir; ayrıntılı yazı boyutları ise
 * akordiyon altında, tek tek grupları genel ölçeğe göre ince ayarlar. Değerler çarpan
 * olarak tutulduğu için yakınlaştırmadan bağımsızdır.
 */
export function StylePanel() {
  const { styleSettings, setStyleSettings, viewport, setViewport } = useWorkspace();
  const [yaziAcik, setYaziAcik] = useState(false);

  const guncelle = (alan: keyof StyleSettings, v: number | boolean | string) =>
    setStyleSettings((prev) => ({ ...prev, [alan]: v }));

  const varsayilanMi =
    (Object.keys(DEFAULT_STYLE_SETTINGS) as (keyof StyleSettings)[]).every(
      (k) => styleSettings[k] === DEFAULT_STYLE_SETTINGS[k]
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 items-stretch">
        {/* ÇİZGİ KALINLIĞI */}
        <div className="space-y-2 p-3 rounded-2xl bg-muted/30 border border-border/70">
          <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Minus className="w-3.5 h-3.5" />
            <span>Çizgi Kalınlığı</span>
          </h3>
          <AyarKaydirici
            etiket="Şekil kenarları"
            ipucu="Çokgen, çember, elips, yay ve doğru parçalarının kalınlığı."
            deger={styleSettings.strokeScale}
            min={0.5}
            max={3}
            adim={0.1}
            birim="carpan"
            onChange={(v) => guncelle('strokeScale', v)}
          />
        </div>

        {/* NOKTA / PİVOT BOYUTU */}
        <div className="space-y-2 p-3 rounded-2xl bg-muted/30 border border-border/70">
          <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <CircleDot className="w-3.5 h-3.5" />
            <span>Nokta (Pivot) Boyutu</span>
          </h3>
          <AyarKaydirici
            etiket="Nokta yarıçapı"
            ipucu="Kendi boyutu ayarlanmış noktalar bu ayardan etkilenmez."
            deger={styleSettings.pointRadius}
            min={3}
            max={14}
            adim={0.5}
            birim="px"
            onChange={(v) => guncelle('pointRadius', v)}
          />
        </div>

        {/* YAZI BOYUTLARI */}
        <div className="space-y-2 p-3 rounded-2xl bg-muted/30 border border-border/70">
          <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Type className="w-3.5 h-3.5" />
            <span>Yazı Boyutları</span>
          </h3>
          <AyarKaydirici
            etiket="Tüm yazılar (orantılı)"
            ipucu="Tuvaldeki bütün yazıları aynı oranda büyütür veya küçültür."
            deger={styleSettings.fontScale}
            min={0.6}
            max={2}
            adim={0.05}
            birim="carpan"
            onChange={(v) => guncelle('fontScale', v)}
          />

          {/* AKORDİYON: gruplara özel ince ayar */}
          <button
            type="button"
            onClick={() => setYaziAcik((a) => !a)}
            aria-expanded={yaziAcik}
            className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-muted/50 hover:bg-muted border border-border/70 transition-colors cursor-pointer"
          >
            <span className="text-[11px] font-bold text-foreground">Ayrıntılı boyutlandırma</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${yaziAcik ? 'rotate-180' : ''}`}
            />
          </button>

          {yaziAcik && (
            <div className="space-y-3 pl-2.5 pt-1 border-l-2 border-border/70">
              <AyarKaydirici
                etiket="Nokta adları ve koordinatları"
                deger={styleSettings.pointLabelScale}
                min={0.6}
                max={2}
                adim={0.05}
                birim="carpan"
                onChange={(v) => guncelle('pointLabelScale', v)}
              />
              <AyarKaydirici
                etiket="Ölçüm kutuları (cm, °)"
                ipucu="Uzunluk, alan, çevre ve açı etiketleri."
                deger={styleSettings.measurementScale}
                min={0.6}
                max={2}
                adim={0.05}
                birim="carpan"
                onChange={(v) => guncelle('measurementScale', v)}
              />
              <AyarKaydirici
                etiket="Eksen sayıları ve bölge adları"
                deger={styleSettings.axisScale}
                min={0.6}
                max={2}
                adim={0.05}
                birim="carpan"
                onChange={(v) => guncelle('axisScale', v)}
              />
            </div>
          )}
        </div>

        {/* ÖLÇÜ YAZIMI (MEB) */}
        <div className="space-y-2.5 p-3 rounded-2xl bg-muted/30 border border-border/70">
          <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sigma className="w-3.5 h-3.5" />
            <span>Ölçü Yazımı</span>
          </h3>
          <AyarSecim
            etiket="Ölçü yazımı"
            deger={styleSettings.olcuYazimi}
            secenekler={OLCU_SECENEKLERI}
            onChange={(v) => guncelle('olcuYazimi', v)}
          />
          <AyarSecim
            etiket="Açı yazımı"
            deger={styleSettings.aciYazimi}
            secenekler={ACI_SECENEKLERI}
            onChange={(v) => guncelle('aciYazimi', v)}
          />
          <AyarOnay
            etiket="Ölçüleri tam sayı yaz"
            ipucu="Uzunluk, açı, alan ve çevre tam sayı yazılır; yuvarlanan değerin önünde ≈ durur. Alan ve çevre ekranda görünen tam sayılardan hesaplanır (dikdörtgende görünen kenarların çarpımı, çevrede görünen kenarların toplamı); bir çokgenin bütün iç açıları ölçülmüşse toplamları korunur. Tam sayılardan çıkan kesin sonuç virgüllü olabilir (3 × 5 ÷ 2 = 7,5)."
            isaretli={styleSettings.tamSayiOlcu}
            onChange={(v) => guncelle('tamSayiOlcu', v)}
          />
          <p className="text-[10px] text-muted-foreground leading-snug">
            Yazı ölçtüğü kenarın ya da açının yanındayken yalnızca değer yazılır (5 br); etiketi
            uzaklaştırınca adıyla birlikte tam yazılır (|AB| = 5 br). Tam yazım ipucunda ve panelde her zaman durur.
          </p>
        </div>

        {/* SADELEŞTİRME & DİĞER */}
        <div className="space-y-2 p-3 rounded-2xl bg-muted/30 border border-border/70">
          <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" />
            <span>Sadeleştirme</span>
          </h3>
          <AyarOnay
            etiket="Etiket kutularını kaldır"
            ipucu="Ölçüm yazıları arka plan kutusu olmadan, düz metin olarak görünür (varsayılan). İşareti kaldırınca kutular geri gelir."
            isaretli={!styleSettings.showLabelBoxes}
            onChange={(v) => guncelle('showLabelBoxes', !v)}
          />
          <AyarOnay
            etiket="Dolgu rengini kaldır"
            ipucu="Çokgen, çember ve elipsin içi boş kalır."
            isaretli={styleSettings.hideFills}
            onChange={(v) => guncelle('hideFills', v)}
          />
          <AyarOnay
            etiket="Nokta koordinatlarını kaldır"
            ipucu="Noktaların yanındaki (x; y) yazıları gizlenir."
            isaretli={viewport.showCoordinates === false}
            onChange={(v) => setViewport((prev) => ({ ...prev, showCoordinates: !v }))}
          />
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => {
            setStyleSettings(DEFAULT_STYLE_SETTINGS);
            setViewport((prev) => ({ ...prev, showCoordinates: true }));
          }}
          disabled={varsayilanMi && viewport.showCoordinates !== false}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-muted border border-border/70 text-[11px] font-bold text-muted-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Varsayılan Stile Dön</span>
        </button>
      </div>
    </div>
  );
}
