'use client';

/**
 * Nesne düzenleyici (VT §6.4, §12.6): "Kendi sorunu yaz" formunda Çark ya da Torba seçilince yerinde açılır.
 * - Torba: renk satırları "(●) [Kırmızı] [−] 3 [+] [×]" (en çok 6 renk, toplam en çok 60 top), "+ Renk", onay kutusu
 *   "Çekilen topu torbaya geri at" ve özet "Torbada 5 top: 3 kırmızı, 2 mavi".
 * - Çark: "SÜTUN ADI", dilim satırları "(●) [Evet] %[60] [×]" (en çok 12), "+ Dilim", "Eşit böl" ve toplam;
 *   toplam 100 değilse "Toplam %90: yüzdeler orantılı olarak düzeltilir."
 * Üstte nesnenin canlı küçük önizlemesi (gerçek sahne çizimi) durur: öğretmen ne kurduğunu görür.
 * Eski AygitDuzenleyici'nin sade hâli; adet merdiveni eski SayiGirdisi'nden.
 */
import React from 'react';
import {
  EN_AZ_DILIM,
  EN_COK_DILIM,
  EN_COK_RENK,
  EN_COK_TORBA_TOPU,
  METIN_SINIRI,
  type CarkPlani,
  type TorbaPlani,
} from '../arastirma';
import { torbaMetni } from '../deney';
import { ONAY_KUTUSU } from '../ortak';
import { sayiOku, sayiYaz } from '../veri';
import { ArtiSimgesi, EksiSimgesi, KapatSimgesi } from './simgeler';
import { RenkNoktasiKucuk } from './nesneler';
import { etiketRenkleri } from './panelYardimcilari';
import { CarkSahnesi, ibreDurmaAcisi } from './sahneler/CarkSahnesi';
import { TorbaSahnesi } from './sahneler/TorbaSahnesi';

const GIRDI =
  'h-11 min-w-0 rounded-[calc(var(--radius)-8px)] border border-border bg-background px-2.5 text-[14px] font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
const KARE_DUGME =
  'grid h-11 w-11 shrink-0 place-items-center rounded-[calc(var(--radius)-8px)] border border-border bg-card text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';
const SADE =
  'inline-flex h-11 items-center gap-1.5 rounded-[calc(var(--radius)-8px)] border border-dashed border-border px-3 text-[13px] font-bold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45';
const BASLIK = 'text-[12px] font-extrabold tracking-[0.05em] text-muted-foreground';

/** Yeni renk adı önerisi: kullanılmamış ilk temel renk */
const RENK_ONERILERI = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Mor', 'Turuncu', 'Pembe', 'Gri'];
export function yeniRenkAdi(mevcut: readonly string[]): string {
  const kullanilan = new Set(mevcut.map((m) => m.trim().toLocaleLowerCase('tr')));
  return RENK_ONERILERI.find((r) => !kullanilan.has(r.toLocaleLowerCase('tr'))) ?? `${mevcut.length + 1}. renk`;
}

/** Yeni dilim adı: "4. dilim" (kullanılmamış) */
export function yeniDilimAdi(mevcut: readonly string[]): string {
  for (let i = mevcut.length + 1; ; i++) {
    const ad = `${i}. dilim`;
    if (!mevcut.includes(ad)) return ad;
  }
}

/** Eşit böl: yüzdeler tam sayıya yuvarlanır, toplam tam 100 olur (fazlası ilk dilimlere) */
export function esitYuzdeler(adet: number): number[] {
  if (adet <= 0) return [];
  const taban = Math.floor(100 / adet);
  const kalan = 100 - taban * adet;
  return Array.from({ length: adet }, (_, i) => taban + (i < kalan ? 1 : 0));
}

function toplamYuzde(c: CarkPlani): number {
  return c.dilimler.reduce((t, d) => t + (Number.isFinite(d.yuzde) && d.yuzde > 0 ? d.yuzde : 0), 0);
}

export interface TorbaDuzenleyiciProps {
  torba: TorbaPlani;
  onTorba: (t: TorbaPlani) => void;
}

export function TorbaDuzenleyici({ torba, onTorba }: TorbaDuzenleyiciProps) {
  const toplam = torba.toplar.reduce((t, x) => t + Math.max(0, Math.floor(x.adet) || 0), 0);
  const sira = torba.toplar.map((t) => t.etiket.trim());
  const renkler = etiketRenkleri(sira);
  const renkli = torba.toplar.map((t, i) => ({ etiket: t.etiket.trim(), renk: renkler[i], adet: Math.max(0, Math.floor(t.adet) || 0) }));
  const yaz = (i: number, parca: Partial<{ etiket: string; adet: number }>) =>
    onTorba({ ...torba, toplar: torba.toplar.map((t, j) => (j === i ? { ...t, ...parca } : t)) });
  return (
    <div className="flex flex-col gap-2" data-nesne-duzenleyici="torba">
      <div className="flex items-center gap-3 rounded-[calc(var(--radius)-6px)] border border-border bg-card px-2 py-1.5">
        <TorbaSahnesi boyut={96} toplar={renkli} cekilenler={[]} geriAt={torba.geriAt} />
        <p className="min-w-0 flex-1 text-[13px] font-semibold leading-[18px]" data-torba-ozeti="">
          {torbaMetni(torba.toplar)}
          {toplam > EN_COK_TORBA_TOPU && <span className="mt-0.5 block text-[12px] font-bold text-destructive">En çok {EN_COK_TORBA_TOPU} top olabilir.</span>}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {torba.toplar.map((t, i) => {
          const adet = Math.max(0, Math.floor(t.adet) || 0);
          const ad = t.etiket.trim() || `${i + 1}. renk`;
          return (
            <div key={i} className="flex min-w-0 items-center gap-1.5" data-torba-rengi={t.etiket}>
              <RenkNoktasiKucuk renk={renkler[i]} boyut={14} />
              <input
                className={`${GIRDI} flex-1`}
                value={t.etiket}
                maxLength={METIN_SINIRI.ad}
                placeholder="Renk adı"
                aria-label={`${i + 1}. rengin adı`}
                onChange={(e) => yaz(i, { etiket: e.target.value })}
              />
              <button type="button" className={KARE_DUGME} aria-label={`${ad}: bir top çıkar`} disabled={adet <= 0} onClick={() => yaz(i, { adet: adet - 1 })}>
                <EksiSimgesi className="h-4 w-4" />
              </button>
              <input
                className={`${GIRDI} w-12 px-1 text-center tabular-nums`}
                inputMode="numeric"
                value={String(adet)}
                aria-label={`${ad}: top sayısı`}
                onChange={(e) => {
                  const s = sayiOku(e.target.value);
                  yaz(i, { adet: s === null ? 0 : Math.max(0, Math.min(EN_COK_TORBA_TOPU, Math.round(s))) });
                }}
              />
              <button
                type="button"
                className={KARE_DUGME}
                aria-label={`${ad}: bir top ekle`}
                disabled={toplam >= EN_COK_TORBA_TOPU}
                onClick={() => yaz(i, { adet: adet + 1 })}
              >
                <ArtiSimgesi className="h-4 w-4" />
              </button>
              <button
                type="button"
                className={`${KARE_DUGME} border-transparent bg-transparent text-muted-foreground`}
                aria-label={`${ad} rengini kaldır`}
                title={torba.toplar.length <= 1 ? 'Torbada en az bir renk olmalı.' : undefined}
                disabled={torba.toplar.length <= 1}
                onClick={() => onTorba({ ...torba, toplar: torba.toplar.filter((_, j) => j !== i) })}
              >
                <KapatSimgesi className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {torba.toplar.length < EN_COK_RENK && (
          <button
            type="button"
            className={SADE}
            disabled={toplam >= EN_COK_TORBA_TOPU}
            onClick={() => onTorba({ ...torba, toplar: [...torba.toplar, { etiket: yeniRenkAdi(sira), adet: 1 }] })}
          >
            <ArtiSimgesi className="h-4 w-4" />
            Renk
          </button>
        )}
      </div>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[13.5px] font-semibold">
        <input type="checkbox" className={ONAY_KUTUSU} checked={torba.geriAt} onChange={(e) => onTorba({ ...torba, geriAt: e.target.checked })} />
        Çekilen topu torbaya geri at
      </label>
    </div>
  );
}

export interface CarkDuzenleyiciProps {
  cark: CarkPlani;
  onCark: (c: CarkPlani) => void;
}

export function CarkDuzenleyici({ cark, onCark }: CarkDuzenleyiciProps) {
  const toplam = toplamYuzde(cark);
  const tam = Math.abs(toplam - 100) < 1e-9;
  const yaz = (i: number, parca: Partial<{ etiket: string; yuzde: number }>) =>
    onCark({ ...cark, dilimler: cark.dilimler.map((d, j) => (j === i ? { ...d, ...parca } : d)) });
  const renkler = etiketRenkleri(cark.dilimler.map((d) => d.etiket));
  const dilimler = cark.dilimler.map((d, i) => ({ etiket: d.etiket.trim(), renk: renkler[i], oran: Number.isFinite(d.yuzde) && d.yuzde > 0 ? d.yuzde : 0 }));
  return (
    <div className="flex flex-col gap-2" data-nesne-duzenleyici="cark">
      <label className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-2">
        <span className={BASLIK}>SÜTUN ADI</span>
        <input
          className={GIRDI}
          value={cark.degiskenAdi}
          maxLength={METIN_SINIRI.ad}
          placeholder="Ör. Cevap"
          onChange={(e) => onCark({ ...cark, degiskenAdi: e.target.value })}
        />
      </label>
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-[calc(var(--radius)-6px)] border border-border bg-card p-1">
          <CarkSahnesi boyut={104} dilimler={dilimler} ibreAcisi={ibreDurmaAcisi(dilimler, Math.max(0, dilimler.findIndex((d) => d.oran > 0)), 0.5, 104)} sure={0} secilen={null} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {cark.dilimler.map((d, i) => (
            <div key={i} className="flex min-w-0 items-center gap-1.5" data-cark-dilimi={d.etiket}>
              <RenkNoktasiKucuk renk={renkler[i]} boyut={14} />
              <input
                className={`${GIRDI} min-w-0 flex-1`}
                value={d.etiket}
                maxLength={METIN_SINIRI.ad}
                placeholder="Dilim adı"
                aria-label={`${i + 1}. dilimin adı`}
                onChange={(e) => yaz(i, { etiket: e.target.value })}
              />
              <span className="relative shrink-0">
                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[13px] font-bold text-muted-foreground">%</span>
                <input
                  className={`${GIRDI} w-[62px] pl-6 pr-1.5 text-right tabular-nums`}
                  inputMode="decimal"
                  value={Number.isFinite(d.yuzde) ? sayiYaz(d.yuzde, 1) : ''}
                  aria-label={`${d.etiket || `${i + 1}. dilim`}: yüzde`}
                  onChange={(e) => {
                    const s = sayiOku(e.target.value);
                    yaz(i, { yuzde: s === null ? 0 : Math.max(0, Math.min(100, s)) });
                  }}
                />
              </span>
              <button
                type="button"
                className={`${KARE_DUGME} border-transparent bg-transparent text-muted-foreground`}
                aria-label={`${d.etiket || `${i + 1}. dilim`} dilimini kaldır`}
                title={cark.dilimler.length <= EN_AZ_DILIM ? 'Çarkta en az iki dilim olmalı.' : undefined}
                disabled={cark.dilimler.length <= EN_AZ_DILIM}
                onClick={() => onCark({ ...cark, dilimler: cark.dilimler.filter((_, j) => j !== i) })}
              >
                <KapatSimgesi className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {cark.dilimler.length < EN_COK_DILIM && (
          <button
            type="button"
            className={SADE}
            onClick={() => onCark({ ...cark, dilimler: [...cark.dilimler, { etiket: yeniDilimAdi(cark.dilimler.map((d) => d.etiket)), yuzde: 0 }] })}
          >
            <ArtiSimgesi className="h-4 w-4" />
            Dilim
          </button>
        )}
        <button
          type="button"
          className={SADE.replace('border-dashed', '')}
          onClick={() => {
            const y = esitYuzdeler(cark.dilimler.length);
            onCark({ ...cark, dilimler: cark.dilimler.map((d, i) => ({ ...d, yuzde: y[i] })) });
          }}
        >
          Eşit böl
        </button>
        <span className={`ml-auto text-[13px] font-extrabold tabular-nums ${tam ? 'text-muted-foreground' : 'text-[#b25a3c] dark:text-[#e6a184]'}`} data-cark-toplami={toplam}>
          Toplam %{sayiYaz(toplam, 1)}
        </span>
      </div>
      {!tam && toplam > 0 && (
        <p className="text-[12.5px] font-semibold leading-4 text-[#b25a3c] dark:text-[#e6a184]">Toplam %{sayiYaz(toplam, 1)}: yüzdeler orantılı olarak düzeltilir.</p>
      )}
    </div>
  );
}
