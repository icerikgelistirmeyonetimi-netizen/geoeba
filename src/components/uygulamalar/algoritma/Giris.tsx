'use client';

/**
 * Algoritma Laboratuvarı — açılış ekranları (kullanıcı kararı 2026-09-24).
 * 1) Sınıflar: 8 kutu; her kutuda o sınıfın sahnesinden bir görsel, ada adı, ünite başlıkları ve ilerleme.
 * 2) Sınıf sayfası: ünite kutuları, altında Atölye projeleri.
 * Görev ekranında üst bardaki ünite menüsü kalır; sınıf sayfasına dönmek için bardaki "Sınıflar" düğmesi.
 *
 * Kapak görselleri gerçek sahneden çekilir (artifacts/algoritma/kapak-cek.cjs → public/algoritma/kapak/…).
 * Görsel yoksa kutu, sınıfın rengiyle çizilmiş yalın bir desen gösterir.
 */
import React, { useState } from 'react';
import { SIMGE } from './simgeler';
import { KADEMELER, VITRIN, kademe, sinifGruplari } from './mufredat';
import { sinifAtolyeleri } from './atolyeler';
import { atolyeKaydi, uniteIlerlemesi, uniteKaydi, type LabKaydi } from './kayit';
import type { Unite } from './gorev';

/** Kapak görseli: /algoritma/kapak/<kimlik>(-koyu).webp; altında hep sınıfın renginde yalın desen (görsel yüklenince üstünü örter) */
function Kapak({ kimlik, renk, koyu, etiket, oran = '16 / 10', children }: { kimlik: string; renk: string; koyu: boolean; etiket: string; oran?: string; children?: React.ReactNode }) {
  const [durum, setDurum] = useState<'yukleniyor' | 'var' | 'yok'>('yukleniyor');
  const src = `/algoritma/kapak/${kimlik}${koyu ? '-koyu' : ''}.webp`;
  return (
    <div className="relative w-full overflow-hidden rounded-[16px] bg-muted" style={{ aspectRatio: oran }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="160" height="100" fill={`color-mix(in srgb, ${renk} 16%, hsl(var(--card)))`} />
        {Array.from({ length: 7 }, (_, y) =>
          Array.from({ length: 11 }, (_, x) => <circle key={`${x}-${y}`} cx={10 + x * 14} cy={12 + y * 13} r={1.6} fill={renk} opacity={0.35} />)
        )}
        <path d="M24 74 H66 V48 H104 V30 H136" fill="none" stroke={renk} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
      </svg>
      {durum !== 'yok' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          decoding="async"
          onLoad={() => setDurum('var')}
          onError={() => setDurum('yok')}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${durum === 'var' ? 'opacity-100' : 'opacity-0'}`}
          draggable={false}
        />
      )}
      <span className="sr-only">{etiket}</span>
      {children}
    </div>
  );
}

function Ilerleme({ tamam, toplam, renk }: { tamam: number; toplam: number; renk: string }) {
  const oran = toplam ? tamam / toplam : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <span className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={{ width: `${oran * 100}%`, background: renk }} />
      </span>
      <span className="shrink-0 text-[12px] font-extrabold tabular-nums text-muted-foreground">
        {tamam}/{toplam}
      </span>
    </div>
  );
}

function Yildizlar({ n, boyut = 'h-4 w-4' }: { n: number; boyut?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-ada-fener" aria-label={`${n} yıldız`}>
      {[1, 2, 3].map((i) => (
        <SIMGE.yildiz key={i} dolu={i <= n} className={boyut} />
      ))}
    </span>
  );
}

const KUTU = 'group flex flex-col gap-3 rounded-[22px] border border-border bg-card p-3 text-left shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

/** Sınıfın ilerlemesi: zorunlu görevler ve atölye yıldızları */
function sinifIlerlemesi(kayit: LabKaydi, uniteler: Unite[], sinif: number) {
  let tamam = 0;
  let toplam = 0;
  for (const u of uniteler) {
    const il = uniteIlerlemesi(kayit, u);
    tamam += il.tamam;
    toplam += il.toplam;
  }
  const atolyeler = sinifAtolyeleri(sinif);
  const yildiz = atolyeler.reduce((a, x) => a + atolyeKaydi(kayit, x.id).yildiz, 0);
  return { tamam, toplam, yildiz, enCokYildiz: atolyeler.length * 3 };
}

export function SiniflarSayfasi({ kayit, koyu, onSinif, devam, onDevam }: { kayit: LabKaydi; koyu: boolean; onSinif: (s: number) => void; devam: { baslik: string; alt: string } | null; onDevam: () => void }) {
  const gruplar = sinifGruplari();
  return (
    <div className="h-full overflow-auto bg-background" data-giris>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 py-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-baslik text-[30px] font-semibold leading-tight text-foreground">Algoritma Laboratuvarı</h1>
            <p className="mt-1 text-[15px] font-semibold text-muted-foreground">Sınıfını seç: robotla, dronla ve çizgi robotuyla adım adım algoritma.</p>
          </div>
          {devam && (
            <button type="button" onClick={onDevam} className="flex min-h-[56px] items-center gap-3 rounded-full bg-primary py-2 pl-5 pr-3 text-left text-primary-foreground shadow-sm hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" data-devam>
              <span className="min-w-0">
                <span className="block text-[12px] font-bold uppercase tracking-[0.06em] opacity-80">Kaldığın yerden devam et</span>
                <span className="block truncate text-[15px] font-extrabold">{devam.baslik}</span>
              </span>
              <span className="hidden text-[13px] font-semibold opacity-85 sm:block">{devam.alt}</span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                <SIMGE.oynat className="h-5 w-5" />
              </span>
            </button>
          )}
        </header>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(236px, 1fr))' }}>
          {gruplar.map((g) => {
            const k = kademe(g.sinif);
            const il = sinifIlerlemesi(kayit, g.uniteler, g.sinif);
            return (
              <button key={g.sinif} type="button" className={KUTU} onClick={() => onSinif(g.sinif)} aria-label={`${g.sinif}. sınıf, ${k.ad}`} data-sinif-kutusu={g.sinif}>
                <Kapak kimlik={VITRIN[g.sinif] ?? g.uniteler[0].id} renk={k.renk} koyu={koyu} etiket={`${g.sinif}. sınıfın sahnesi`}>
                  <span className="absolute bottom-2 left-2 flex h-12 w-12 items-center justify-center rounded-full font-baslik text-[26px] font-semibold text-white shadow-md ring-2 ring-white/80" style={{ background: k.renk }}>
                    {g.sinif}
                  </span>
                </Kapak>
                <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-baslik text-[21px] font-semibold text-foreground">{g.sinif}. sınıf</span>
                    <span className="rounded-full px-2 py-0.5 text-[12px] font-extrabold" style={{ background: `color-mix(in srgb, ${k.renk} 16%, transparent)`, color: `color-mix(in srgb, ${k.renk} 70%, hsl(var(--foreground)))` }}>
                      {k.ad}
                    </span>
                  </div>
                  <p className="text-[14px] font-semibold leading-snug text-foreground">{k.aciklama}</p>
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug text-muted-foreground">{g.uniteler.map((u) => u.ad).join(' · ')}</p>
                  <div className="mt-auto flex items-center gap-3 pt-1.5">
                    <div className="min-w-0 flex-1">
                      <Ilerleme tamam={il.tamam} toplam={il.toplam} renk={k.renk} />
                    </div>
                    {il.enCokYildiz > 0 && (
                      <span className="inline-flex items-center gap-1 text-[12px] font-extrabold tabular-nums text-muted-foreground" title="Atölye yıldızları">
                        <SIMGE.yildiz dolu className="h-4 w-4 text-ada-fener" />
                        {il.yildiz}/{il.enCokYildiz}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SinifSayfasi({ sinif, kayit, koyu, onUnite, onAtolye, onGeri }: { sinif: number; kayit: LabKaydi; koyu: boolean; onUnite: (id: string) => void; onAtolye: (id: string) => void; onGeri: () => void }) {
  const grup = sinifGruplari().find((g) => g.sinif === sinif);
  const k = kademe(sinif);
  const atolyeler = sinifAtolyeleri(sinif);
  if (!grup) return null;
  return (
    <div className="h-full overflow-auto bg-background" data-sinif-sayfasi={sinif}>
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-5 py-5">
        <header className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onGeri} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-muted px-3.5 text-[14px] font-bold text-foreground hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-siniflara-don>
            <SIMGE.ok className="h-4 w-4 rotate-180" /> Sınıflar
          </button>
          <span className="flex h-11 w-11 items-center justify-center rounded-full font-baslik text-[22px] font-semibold text-white" style={{ background: k.renk }}>
            {sinif}
          </span>
          <div className="min-w-0">
            <h1 className="font-baslik text-[26px] font-semibold leading-tight text-foreground">
              {sinif}. sınıf · {k.ad}
            </h1>
            <p className="text-[14px] font-semibold text-muted-foreground">{k.aciklama}</p>
          </div>
        </header>

        <section aria-label="Üniteler" className="flex flex-col gap-3">
          <h2 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Üniteler · adım adım görevler</h2>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(236px, 1fr))' }}>
            {grup.uniteler.map((u) => {
              const il = uniteIlerlemesi(kayit, u);
              const bitti = il.tamam === il.toplam;
              const uk = uniteKaydi(kayit, u.id);
              return (
                <button key={u.id} type="button" className={KUTU} onClick={() => onUnite(u.id)} aria-label={`${u.no}. ünite: ${u.ad}`} data-unite-kutusu={u.id}>
                  <Kapak kimlik={u.id} renk={k.renk} koyu={koyu} etiket={`${u.ad} sahnesi`}>
                    <span className="absolute left-2 top-2 rounded-full bg-card/95 px-2.5 py-1 text-[12px] font-extrabold text-foreground shadow-sm">{u.no}. ünite</span>
                    {bitti && (
                      <span className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ada-vurgu text-white shadow-sm" aria-label="Tamamlandı">
                        <SIMGE.onay className="h-5 w-5" />
                      </span>
                    )}
                  </Kapak>
                  <div className="flex flex-1 flex-col gap-1 px-1">
                    <span className="text-[17px] font-extrabold leading-snug text-foreground">{u.ad}</span>
                    <span className="text-[13px] font-semibold leading-snug text-muted-foreground">{u.yeniKavram}</span>
                    <div className="mt-auto pt-2">
                      <Ilerleme tamam={il.tamam} toplam={il.toplam} renk={k.renk} />
                      {uk.aktif > 0 && !bitti && <span className="mt-1 block text-[12px] font-bold text-muted-foreground">Sıradaki: {uk.aktif + 1}. görev</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {atolyeler.length > 0 && (
          <section aria-label="Atölye" className="flex flex-col gap-3 pb-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Atölye · açık uçlu projeler</h2>
              <span className="text-[13px] font-semibold text-muted-foreground">Amaç verilir, yolu sen bulursun. Kodun birkaç farklı dünyada sınanır.</span>
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(236px, 1fr))' }}>
              {atolyeler.map((a) => {
                const ak = atolyeKaydi(kayit, a.id);
                return (
                  <button key={a.id} type="button" className={KUTU} onClick={() => onAtolye(a.id)} aria-label={`Atölye: ${a.ad}`} data-atolye-kutusu={a.id}>
                    <Kapak kimlik={a.id} renk={k.renk} koyu={koyu} etiket={`${a.ad} sahnesi`}>
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-[12px] font-extrabold text-foreground shadow-sm">
                        <SIMGE.deney className="h-3.5 w-3.5" /> Atölye
                      </span>
                      {a.dunyalar.length > 1 && <span className="absolute bottom-2 right-2 rounded-full bg-card/95 px-2 py-0.5 text-[12px] font-bold text-foreground shadow-sm">{a.dunyalar.length} dünya</span>}
                    </Kapak>
                    <div className="flex flex-1 flex-col gap-1 px-1">
                      <span className="text-[17px] font-extrabold leading-snug text-foreground">{a.ad}</span>
                      <span className="text-[13px] font-semibold leading-snug text-muted-foreground">{a.aciklama}</span>
                      <div className="mt-auto pt-2">
                        <Yildizlar n={ak.yildiz} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export { KADEMELER };
