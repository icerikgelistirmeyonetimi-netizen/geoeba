'use client';

/**
 * Sonuçlar: son 20 denemenin listesi ve frekans tablosu (sayı, kesir, yüzde, sonuç çubukları).
 */
import React from 'react';
import { galtonTeorikOranlar, istenenMi, kesirMetni, sonucKisaEtiketi, yuzdeMetni, type Sablon, type Sonuc } from './olasilik';
import { frekansTablosu } from './simulasyon';

export interface SonucTablosuProps {
  sablon: Sablon;
  son: Sonuc[];
  sayimlar: Record<string, number>;
  deneme: number;
}

export function SonucTablosu({ sablon, son, sayimlar, deneme }: SonucTablosuProps) {
  const tablo = frekansTablosu(sablon, sayimlar, deneme);
  // Galton: her kutunun teorik oranı C(n,k)/2^n; çubuk ölçeği deneysel ve teorik en büyüğe göre
  const teorik = sablon.tur === 'galton' ? galtonTeorikOranlar(sablon.satir) : null;
  const enCokOran = Math.max(0.0001, ...tablo.map((r) => r.oran), ...(teorik ?? []));
  return (
    <section className="rounded-[var(--radius)] border border-border bg-card p-4 shadow-[0_18px_40px_-18px_rgba(6,40,45,.35)]" aria-label="Sonuçlar">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted-foreground">Son 20 deneme</h3>
      {son.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Henüz deneme yok.</p>
      ) : (
        <ol className="mt-2 flex flex-wrap gap-1.5" aria-label="Son denemeler, en yeni başta">
          {son.map((s, i) => {
            const istenen = istenenMi(sablon, s);
            return (
              <li
                key={i}
                className={`rounded-full border px-2.5 py-1 text-[13px] font-semibold ${istenen ? 'border-transparent text-primary-foreground' : 'border-border bg-muted text-foreground'}`}
                style={istenen ? { background: '#216a78' } : undefined}
                title={istenen ? 'İstenen durum' : undefined}
              >
                {sonucKisaEtiketi(sablon, s)}
              </li>
            );
          })}
        </ol>
      )}

      <h3 className="mt-4 text-[13px] font-bold uppercase tracking-wide text-muted-foreground">Frekans tablosu</h3>
      <table className="mt-2 w-full border-collapse text-[13px]">
        <thead>
          <tr className="whitespace-nowrap text-left text-muted-foreground">
            <th className="py-1 pr-2 font-semibold">Sonuç</th>
            <th className="py-1 pr-2 text-right font-semibold">Sayı</th>
            <th className="py-1 pr-2 text-right font-semibold">Kesir</th>
            <th className="py-1 pr-2 text-right font-semibold">Yüzde</th>
            {teorik && <th className="py-1 pr-2 text-right font-semibold">Teorik %</th>}
            <th className={`${teorik ? 'w-[30%] min-w-[64px]' : 'w-[38%]'} py-1 font-semibold`}>
              <span className="sr-only">Çubuk</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {tablo.map((r, satir) => (
            <tr key={r.anahtar} className={`border-t border-border ${r.istenen ? 'font-bold text-foreground' : 'text-foreground'}`}>
              <td className="whitespace-nowrap py-1.5 pr-2">
                <span className="inline-flex items-center gap-1.5">
                  {r.renk && <span className="inline-block h-3 w-3 rounded-full" style={{ background: r.renk }} aria-hidden="true" />}
                  {r.etiket}
                  {r.istenen && <span className="text-[13px] font-semibold text-muted-foreground">(istenen)</span>}
                </span>
              </td>
              <td className="whitespace-nowrap py-1.5 pr-2 text-right tabular-nums">{r.sayi}</td>
              <td className="whitespace-nowrap py-1.5 pr-2 text-right tabular-nums">{deneme > 0 ? kesirMetni(r.kesir) : '—'}</td>
              <td className="whitespace-nowrap py-1.5 pr-2 text-right tabular-nums">{deneme > 0 ? yuzdeMetni(r.oran) : '—'}</td>
              {teorik && <td className="whitespace-nowrap py-1.5 pr-2 text-right tabular-nums text-[#8f6a33] dark:text-[#d4a76a]">{yuzdeMetni(teorik[satir] ?? 0)}</td>}
              <td className="py-1.5">
                <div className="relative h-3 w-full rounded-full bg-muted" aria-hidden="true">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(r.oran / enCokOran) * 100}%`,
                      background: r.istenen ? '#216a78' : r.renk ?? '#b9884a',
                      transition: 'width 240ms cubic-bezier(0.2,0.8,0.2,1)',
                    }}
                  />
                  {teorik && (
                    // Teorik değer işareti: deneysel çubuk bu çizgiye yaklaştıkça dağılım yakınsar
                    <div
                      className="absolute -top-0.5 h-4 w-[3px] -translate-x-1/2 rounded-full bg-[#b9884a] ring-1 ring-card"
                      style={{ left: `${((teorik[satir] ?? 0) / enCokOran) * 100}%` }}
                      data-teorik-isaret
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
