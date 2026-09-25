'use client';

/**
 * Sözde kod görünümü (7–8. sınıf): programın ders kitabı biçimindeki Türkçe sözde kodu, satır
 * numaralarıyla. Salt okunur canlı aynadır: çalışırken şu anki blokun satırı mercan çizgiyle,
 * yığındaki blokların satırları hafif renkle vurgulanır. Düzenleme "Bloklar" görünümündedir.
 */
import React from 'react';
import { sozdeSatirlar, type Program } from './program';
import type { AktifDurum } from './BlokDuzenleyici';

export function SozdeKodGorunumu({ program, aktif = null }: { program: Program; aktif?: AktifDurum | null }) {
  const satirlar = sozdeSatirlar(program);
  const son = aktif?.yigin[aktif.yigin.length - 1] ?? null;
  return (
    <ol className="m-0 list-none p-0 font-mono text-[14.5px] leading-[1.9]" aria-label="Sözde kod" data-sozde-kod>
      {satirlar.map((s, i) => {
        const simdiki = !!son && s.blokId === son && !s.kapanis;
        const yiginda = !!s.blokId && !!aktif?.yigin.includes(s.blokId);
        const hata = simdiki && !!aktif?.hata;
        // Yapı satırları (BAŞLA, EĞER … İSE, TEKRARLA, SONU) kalın; eylem ve atama satırları normal
        const anahtar = /^(BAŞLA|BİTİR|TANIMLA|TANIM SONU|TEKRAR SONU|EĞER|DEĞİLSE)|TEKRARLA$/.test(s.metin);
        return (
          <li
            key={i}
            className={`flex items-baseline rounded-[8px] pr-2 ${simdiki ? (hata ? 'bg-[#d9534f]/15' : 'bg-ada-mercan/15') : yiginda ? 'bg-primary/[0.07]' : ''}`}
            style={{ boxShadow: simdiki ? `inset 3px 0 0 ${hata ? '#d9534f' : '#d9805f'}` : undefined }}
            data-sozde-satir={s.blokId ?? undefined}
            data-aktif={simdiki || undefined}
          >
            <span className="w-9 shrink-0 select-none pr-2 text-right text-[12px] tabular-nums text-muted-foreground">{i + 1}</span>
            <span className="whitespace-pre text-foreground" style={{ paddingLeft: `${s.girinti * 1.6}em` }}>
              <span className={anahtar ? 'font-bold' : 'font-medium'}>{s.metin}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
