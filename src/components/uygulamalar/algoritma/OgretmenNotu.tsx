'use client';

/**
 * Öğretmen notu (pencere içinde sağdan açılan panel), açık ünite için: künye, hedef, ders planı,
 * fişsiz etkinlik (yazdırılır), yaygın yanılgılar, tartışma soruları, çeldiriciler, kazanımlar ve
 * her görevin dünyası ile bir çözümü (blok + sözde kod). Çözüm yalnız burada görünür.
 */
import React, { useEffect, useRef } from 'react';
import { GOREV_TURU_ADI, KAZANIMLAR, type Unite } from './gorev';
import { UNITE as VARSAYILAN } from './unite';
import { sozdeKod } from './program';
import { BlokDuzenleyici } from './BlokDuzenleyici';
import { DunyaSemasi } from './DunyaSemasi';
import { SIMGE } from './simgeler';
import { fissizYazdir } from './yazdir';

const BASLIK = 'mb-1 text-[12px] font-extrabold uppercase tracking-[0.07em] text-muted-foreground';

export function OgretmenNotu({ acik, onKapat, unite = VARSAYILAN }: { acik: boolean; onKapat: () => void; unite?: Unite }) {
  const kapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!acik) return;
    kapRef.current?.focus();
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onKapat();
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [acik, onKapat]);
  if (!acik) return null;
  const not = unite.ogretmenNotu;
  const fissiz = unite.fissiz;
  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-ada-murekkep/25 backdrop-blur-[1px]" onClick={onKapat} data-ogretmen-notu>
      <div
        ref={kapRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Öğretmen notu"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-[560px] flex-col border-l border-border bg-card shadow-2xl outline-none"
      >
        <header className="flex items-center gap-3 border-b border-border px-5 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-primary/10 text-primary">
            <SIMGE.ogretmen className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
              Öğretmen notu · {unite.sinif}. sınıf · {unite.no}. ünite
            </p>
            <h2 className="font-baslik text-[20px] font-semibold leading-tight">{unite.ad}</h2>
          </div>
          <button type="button" onClick={onKapat} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Öğretmen notunu kapat">
            <SIMGE.kapat className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-auto px-5 py-4 text-[14px] leading-relaxed text-foreground">
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 rounded-[14px] bg-muted/60 p-3 text-[13px]">
            <dt className="font-bold text-muted-foreground">Yer</dt>
            <dd>
              {unite.kademe} · {unite.sinif}. sınıf · {unite.no}. ünite · {unite.tema}
            </dd>
            <dt className="font-bold text-muted-foreground">Yeni kavram</dt>
            <dd>{unite.yeniKavram}</dd>
            <dt className="font-bold text-muted-foreground">Önceden bilinen</dt>
            <dd>{unite.oncedenBilinen}</dd>
            <dt className="font-bold text-muted-foreground">Süre</dt>
            <dd>{unite.sure}</dd>
            {unite.uygunluk && (
              <>
                <dt className="font-bold text-muted-foreground">Uygunluk</dt>
                <dd>{unite.uygunluk}</dd>
              </>
            )}
          </dl>
          <section>
            <h3 className={BASLIK}>Hedef</h3>
            <p>{not.hedef}</p>
          </section>
          <section>
            <h3 className={BASLIK}>Ders planı</h3>
            <ul className="space-y-1">
              {not.dersler.map((d) => (
                <li key={d.baslik}>
                  <strong>{d.baslik}:</strong> {d.metin}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-[14px] border border-border p-3">
            <h3 className={BASLIK}>
              Fişsiz etkinlik · {fissiz.ad} · {fissiz.sure}
            </h3>
            <ol className="list-decimal space-y-1 pl-5">
              {fissiz.adimlar.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ol>
            <button type="button" onClick={() => fissizYazdir(fissiz, unite)} className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-4 text-[14px] font-bold text-primary-foreground hover:bg-primary/90" data-yazdir>
              <SIMGE.yazdir className="h-5 w-5" /> Kartları ve yönergeyi yazdır
            </button>
          </section>
          <section>
            <h3 className={BASLIK}>Yaygın yanılgılar</h3>
            <ul className="space-y-1.5">
              {not.yanilgilar.map((y) => (
                <li key={y.ad} className="rounded-[12px] border border-border px-3 py-2">
                  <strong>{y.ad}.</strong> {y.metin}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className={BASLIK}>Tartışma soruları</h3>
            <ul className="list-disc space-y-1 pl-5">
              {not.sorular.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className={BASLIK}>Çeldiriciler</h3>
            <p>{not.celdiriciler}</p>
          </section>
          <section>
            <h3 className={BASLIK}>Kazanımlar</h3>
            <ul className="space-y-1">
              {unite.kazanimlar.map((k) => (
                <li key={k}>
                  <span className="mr-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[12px] font-extrabold text-primary">{k}</span>
                  {KAZANIMLAR[k]?.metin}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className={`${BASLIK} mb-2`}>Görevler ve çözümler</h3>
            <div className="space-y-3">
              {unite.gorevler.map((g, i) => (
                <details key={g.id} className="rounded-[14px] border border-border">
                  <summary className="cursor-pointer select-none px-3 py-2.5 text-[14px] font-extrabold">
                    {i + 1}. {g.baslik}
                    <span className="ml-2 text-[12px] font-semibold text-muted-foreground">
                      {GOREV_TURU_ADI[g.tur]}
                      {g.zorlu ? ' · zorlu, isteğe bağlı' : ''} · {g.kazanimlar.join(', ')}
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-border px-3 py-3">
                    <p>{g.yonerge}</p>
                    <div className="flex items-center gap-3 text-foreground">
                      <DunyaSemasi dunya={g.dunya} hucre={16} robot={false} />
                      <span className="text-[13px] text-muted-foreground">
                        {g.baslangic === 'onceki' ? 'Önceki görevin koduyla başlar.' : g.baslangic === 'bos' ? 'Boş kodla başlar.' : g.tur === 'hata' ? 'Hatalı kodla başlar.' : 'Hazır bir kodla başlar; öğrenci eksik kısmı ekler.'}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[12px] border border-border">
                        <BlokDuzenleyici program={g.cozum} baslik="Bir çözüm" kompakt kart={unite.gorunum === 'kart'} />
                      </div>
                      <pre className="overflow-auto rounded-[12px] bg-ada-murekkep p-3 text-[12px] leading-relaxed text-ada-fildisi">{sozdeKod(g.cozum)}</pre>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
