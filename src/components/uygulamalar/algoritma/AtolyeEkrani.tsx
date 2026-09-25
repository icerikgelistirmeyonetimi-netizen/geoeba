'use client';

/**
 * Atölye ekranı (ikinci etkinlik türü): açık uçlu proje. Görev ekranıyla aynı üç alan: üstte amaç ve
 * yıldız ölçütleri, solda tuval (dünya çipleriyle birkaç sınama dünyası), sağda kod.
 * "Çalıştır" seçili dünyada canlandırır; "Hepsini sına" kodu bütün dünyalarda çalıştırır ve yıldız verir:
 * ★ ilk dünyada doğru · ★★ bütün dünyalarda doğru · ★★★ ayrıca en çok N blok.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SahneAlani, type SahneTutamaci } from './SahneAlani';
import { IpucuKarti } from './IpucuKarti';
import { BlokDuzenleyici } from './BlokDuzenleyici';
import { AkisSemasi } from './AkisSemasi';
import { SozdeKodGorunumu } from './SozdeKodGorunumu';
import { SIMGE } from './simgeler';
import { kalipBul } from './kaliplar';
import { DAR_ESIK, DUGME, GOSTERGE, sayimlarKadar, useBoyut } from './ortak';
import { atolyeGuncelle, atolyeKaydi, type LabKaydi } from './kayit';
import { blokSayisi, bloklar, sayiMetni, type Program } from './program';
import { calistir, type Iz } from './yorumlayici';
import { sina, sonucIletisi, type SinamaSonucu } from './degerlendirme';
import { useOynatici } from './useOynatici';
import { adimAnlatimi, baslangicAnlatimi } from './anlatici';
import { izgara, koordinatlar } from './dunya';
import type { Atolye, KodGorunumu } from './gorev';

function Yildiz({ dolu }: { dolu: boolean }) {
  return <SIMGE.yildiz dolu={dolu} className={`h-4 w-4 ${dolu ? 'text-ada-fener' : 'text-muted-foreground/60'}`} />;
}

export function AtolyeEkrani({
  atolye,
  kayit,
  setKayit,
  koyu,
  azHareket,
  onGeri,
}: {
  atolye: Atolye;
  kayit: LabKaydi;
  setKayit: React.Dispatch<React.SetStateAction<LabKaydi>>;
  koyu: boolean;
  azHareket: boolean;
  onGeri: () => void;
}) {
  const [kokRef, boyut] = useBoyut<HTMLDivElement>();
  const dar = boyut.en > 0 && boyut.en < DAR_ESIK;
  const gizli = boyut.en === 0 || boyut.boy === 0;
  const kart = atolye.gorunum === 'kart';
  const ifadeBirimi = atolye.gorunum === 'ifade';

  const ak = atolyeKaydi(kayit, atolye.id);
  const program = useMemo<Program>(() => ak.program ?? [], [ak.program]);
  const programDegis = useCallback((p: Program) => setKayit((k) => atolyeGuncelle(k, atolye.id, (a) => ({ ...a, program: p }))), [atolye.id, setKayit]);

  const [dunyaSira, setDunyaSira] = useState(0);
  useEffect(() => setDunyaSira(0), [atolye.id]);
  const dunya = atolye.dunyalar[Math.min(dunyaSira, atolye.dunyalar.length - 1)];
  const iz = useMemo(() => calistir(program, dunya, atolye.hedef), [program, dunya, atolye.hedef]);
  const izRef = useRef(iz);
  izRef.current = iz;

  const [sinama, setSinama] = useState<SinamaSonucu | null>(null);
  /** "Hepsini sına" iletisi ayrı tutulur: sınama başarısız dünyaya geçince tuval yeniden yüklenir, ileti kalmalı */
  const [sinamaIletisi, setSinamaIletisi] = useState<{ basarili: boolean; metin: string } | null>(null);
  useEffect(() => {
    setSinama(null);
    setSinamaIletisi(null);
  }, [program, atolye.id]);
  const [sonuc, setSonuc] = useState<{ basarili: boolean; metin: string } | null>(null);
  const [ipucuAcik, setIpucuAcik] = useState(false);
  const [gorunum, setGorunum] = useState<KodGorunumu>('bloklar');

  const sahneRef = useRef<SahneTutamaci>(null);
  const onBitti = useCallback(
    (z: Iz) => {
      if (z !== izRef.current) return;
      if (z.sonuc.basarili) setSonuc({ basarili: true, metin: atolye.dunyalar.length > 1 ? 'Bu dünyada doğru çalıştı. Şimdi "Hepsini sına" ile öbür dünyalarda dene.' : 'Doğru çalıştı. "Hepsini sına" ile yıldızını al.' });
      else setSonuc({ basarili: false, metin: sonucIletisi(z.sonuc, dunya, atolye.bitkiAdi) });
    },
    [atolye, dunya]
  );
  const oynatici = useOynatici(sahneRef, 1, onBitti);
  // Kod çalışmaya başlayınca ipucu kartı kapanır: ileti şeridi (anlatım, sonuç) geri gelir
  const oynuyor = oynatici.konum >= 0;
  useEffect(() => {
    if (oynuyor) setIpucuAcik(false);
  }, [oynuyor]);
  useEffect(() => {
    oynatici.yukle(iz);
    setSonuc(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iz]);

  const hepsiniSina = () => {
    // Sahne başa döner; ekranda sınamanın iletisi kalır
    oynatici.basa();
    setSonuc(null);
    setIpucuAcik(false);
    const s = sina(program, { gorunen: atolye.dunyalar[0], sinama: atolye.dunyalar.slice(1), hedef: atolye.hedef, enFazlaBlok: atolye.enCokBlok, bitkiAdi: atolye.bitkiAdi }, 1);
    setSinama(s);
    setKayit((k) => atolyeGuncelle(k, atolye.id, (a) => ({ ...a, yildiz: Math.max(a.yildiz, s.yildiz) })));
    const n = blokSayisi(program);
    const ilkHata = s.dunyalar.findIndex((d) => !d.basarili);
    const birim = kart ? 'kart' : 'blok';
    const tek = atolye.dunyalar.length === 1;
    let metin: string;
    if (s.yildiz === 3) metin = `Üç yıldız! Kodun ${tek ? 'doğru çalışıyor' : 'bütün dünyalarda çalışıyor'} ve kısa: ${n} ${birim}.`;
    else if (s.yildiz === 2) metin = `İki yıldız: ${tek ? 'doğru çalışıyor' : 'bütün dünyalarda çalışıyor'}. Üçüncü yıldız için en çok ${atolye.enCokBlok} ${birim} (şu an ${n}).`;
    else if (s.yildiz === 1) metin = `Bir yıldız: 1. dünyada çalışıyor ama ${ilkHata + 1}. dünyada olmadı: ${s.dunyalar[ilkHata].ileti}`;
    else metin = `${tek ? 'Olmadı' : '1. dünyada olmadı'}: ${s.dunyalar[0].ileti}`;
    setSinamaIletisi({ basarili: s.yildiz >= 2, metin });
    if (ilkHata > 0) setDunyaSira(ilkHata);
  };

  // --- Tuval bilgileri ---------------------------------------------------------------
  const suankiAdim = oynatici.konum >= 0 ? iz.adimlar[oynatici.konum] : null;
  const onceki = oynatici.konum > 0 ? iz.adimlar[oynatici.konum - 1].durum : iz.baslangic;
  const durum = oynatici.durum ?? iz.baslangic;
  const sayimlar = useMemo(() => sayimlarKadar(iz, oynatici.konum), [iz, oynatici.konum]);
  const aktif = suankiAdim ? { yigin: suankiAdim.yigin, hata: !!suankiAdim.hata } : null;
  const kullanir = (e: string) => atolye.aracKutusu.some((s) => s.tur === 'eylem' && s.eylem === e) || [...bloklar(program)].some((b) => b.tur === 'eylem' && b.eylem === e);
  const donanim = { tank: kullanir('sula'), sepet: kullanir('topla'), gubre: kullanir('gubreVer') };
  const zg = izgara(dunya);
  const degiskenAdlari = [...new Set([...Object.keys(dunya.degiskenler ?? {}), ...(atolye.degiskenler ?? [])])];
  const konum = dunya.koordinat ? koordinatlar(zg, durum.x, durum.y) : null;
  const bitti = oynatici.bitti && !oynatici.calisiyor;
  const mesaj = bitti && sonuc ? sonuc : oynatici.konum < 0 ? sinamaIletisi : null;

  const dunyaCipleri = (
    <div className="flex flex-wrap items-center gap-2">
      {atolye.dunyalar.length > 1 && (
        <span className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-card/95 p-1 shadow-sm ring-1 ring-border backdrop-blur" role="tablist" aria-label="Sınama dünyaları" data-dunya-cipleri>
          {atolye.dunyalar.map((d, i) => {
            const s = sinama?.dunyalar[i];
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={i === dunyaSira}
                onClick={() => setDunyaSira(i)}
                className={`inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-full px-2.5 text-[14px] font-extrabold ${i === dunyaSira ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}
                title={d.ad}
                data-dunya={i + 1}
              >
                {i + 1}
                {s && (s.basarili ? <SIMGE.onay className="h-4 w-4 text-ada-vurgu" /> : <SIMGE.carpi className="h-4 w-4 text-ada-mercan" />)}
              </button>
            );
          })}
        </span>
      )}
      {konum && (
        <span className={GOSTERGE}>
          <SIMGE.isaretle className="h-5 w-5 text-[#216a78]" />
          <span className="tabular-nums">
            ({sayiMetni(konum.x)}, {sayiMetni(konum.y)})
          </span>
        </span>
      )}
      {degiskenAdlari.map((d) => (
        <span key={d} className={GOSTERGE}>
          <SIMGE.degisken className="h-5 w-5 text-[#a3476b]" />
          {d}
          <span className="rounded-full bg-[#a3476b]/12 px-2 tabular-nums text-[#8a2f55] dark:text-[#f0b9cf]">{durum.degiskenler[d] === undefined ? '—' : sayiMetni(durum.degiskenler[d])}</span>
        </span>
      ))}
      {zg.tur === 'insaat' && (
        <span className={GOSTERGE}>
          <SIMGE.koy className="h-5 w-5 text-[#1d766f]" />
          Küp <span className="tabular-nums">{durum.kupler.reduce((a, b) => a + b, 0)}</span>
        </span>
      )}
    </div>
  );

  const altSatir = (
    <div
      className={`max-w-[720px] rounded-[16px] px-4 py-2.5 shadow-sm ring-1 backdrop-blur ${mesaj ? (mesaj.basarili ? 'bg-[#e6f4f1]/95 ring-ada-vurgu/40 dark:bg-[#123c38]/95' : 'bg-[#fbeee8]/95 ring-ada-mercan/40 dark:bg-[#3d2620]/95') : 'bg-card/95 ring-border'}`}
      data-tuval-iletisi
      data-sonuc={mesaj ? (mesaj.basarili ? 'oldu' : 'olmadi') : undefined}
    >
      <p className={`flex items-start gap-2 font-bold leading-snug ${kart ? 'text-[18px]' : 'text-[16px]'} ${suankiAdim?.hata ? 'text-ada-mercan' : 'text-foreground'}`} aria-live="polite">
        {mesaj && (
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${mesaj.basarili ? 'bg-ada-vurgu' : 'bg-ada-mercan'}`}>
            {mesaj.basarili ? <SIMGE.onay className="h-4 w-4" /> : <SIMGE.soru className="h-4 w-4" />}
          </span>
        )}
        <span>{mesaj ? mesaj.metin : suankiAdim ? adimAnlatimi(suankiAdim, onceki, program, dunya, atolye.bitkiAdi) : program.length ? 'Kodu çalıştırmak için Çalıştır düğmesine bas.' : baslangicAnlatimi(dunya, kart)}</span>
      </p>
    </div>
  );

  const kalip = kalipBul(atolye.kalip);
  // Tek dünyada ★ ile ★★ birlikte gelir (sına: ilk dünya aynı zamanda bütün dünyalar)
  const olcutler =
    atolye.dunyalar.length > 1
      ? [
          { n: 1, metin: '1. dünyada çalışsın' },
          { n: 2, metin: `${atolye.dunyalar.length} dünyanın hepsinde çalışsın` },
          { n: 3, metin: `En çok ${atolye.enCokBlok} blok olsun` },
        ]
      : [
          { n: 2, metin: 'Doğru çalışsın' },
          { n: 3, metin: `En çok ${atolye.enCokBlok} ${kart ? 'kart' : 'blok'} olsun` },
        ];

  const yonerge = (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-3" data-atolye-yonergesi>
      <button type="button" onClick={onGeri} className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[14px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" data-atolyeden-don>
        <SIMGE.ok className="h-4 w-4 rotate-180" /> {atolye.sinif}. sınıf
      </button>
      <div className="min-w-0 flex-1 basis-[420px]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-extrabold text-muted-foreground">
          <span className="inline-flex items-center gap-1 rounded-full bg-ada-fener/20 px-2 py-0.5 text-[#8a6a2a] dark:text-ada-fener">
            <SIMGE.deney className="h-3.5 w-3.5" /> Atölye
          </span>
          <span className="text-foreground">{atolye.ad}</span>
          <span className="inline-flex items-center gap-0.5" aria-label={`En iyi sonuç ${ak.yildiz} yıldız`}>
            {[1, 2, 3].map((i) => (
              <Yildiz key={i} dolu={i <= ak.yildiz} />
            ))}
          </span>
        </div>
        <p className={`mt-0.5 font-semibold leading-snug text-foreground ${kart ? 'text-[19px]' : 'text-[17px]'}`}>{atolye.yonerge}</p>
        <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1" aria-label="Yıldız ölçütleri">
          {olcutler.map((o) => (
            <li key={o.n} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground">
              <span className="inline-flex">
                {Array.from({ length: o.n }, (_, i) => (
                  <Yildiz key={i} dolu={ak.yildiz >= o.n} />
                ))}
              </span>
              {o.metin}
            </li>
          ))}
        </ul>
      </div>
      {!ipucuAcik && (
        <button type="button" onClick={() => setIpucuAcik(true)} className={`${DUGME} bg-ada-fener/15 text-foreground hover:bg-ada-fener/25`} data-ipucu>
          <SIMGE.ipucu className="h-5 w-5 text-ada-fener" /> İpucu
        </button>
      )}
    </header>
  );

  const tuval = (
    <section className={`flex min-w-0 flex-col ${dar ? '' : 'min-h-0 flex-1'} p-3`} aria-label="Tuval">
      <div className={dar ? 'h-[320px]' : 'min-h-0 flex-1'}>
        <SahneAlani ref={sahneRef} dunya={dunya} donanim={donanim} koyu={koyu} azHareket={azHareket} gizli={gizli} durum={durum} ustBilgi={dunyaCipleri}
          ipucu={ipucuAcik ? <IpucuKarti ipuclari={[kalip ? `${atolye.ipucu} (Kalıp: ${kalip.ad})` : atolye.ipucu]} acilan={1} onKapat={() => setIpucuAcik(false)} /> : null}
          altBilgi={altSatir}
        />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2" data-oynatma>
        {oynatici.calisiyor ? (
          <button type="button" onClick={oynatici.duraklat} className={`${DUGME} min-w-[150px] bg-ada-mercan text-white hover:bg-ada-mercan/90`}>
            <SIMGE.duraklat className="h-5 w-5" /> Duraklat
          </button>
        ) : (
          <button type="button" onClick={oynatici.oynat} disabled={!program.length} className={`${DUGME} min-w-[150px] bg-primary text-primary-foreground hover:bg-primary/90`} data-calistir>
            <SIMGE.oynat className="h-5 w-5" /> {oynatici.konum >= 0 && !oynatici.bitti ? 'Devam et' : 'Çalıştır'}
          </button>
        )}
        <button type="button" onClick={oynatici.adim} disabled={!program.length || oynatici.bitti} className={`${DUGME} bg-muted text-foreground hover:bg-muted/70`} data-adim>
          <SIMGE.adim className="h-5 w-5" /> Adım adım
        </button>
        <button type="button" onClick={oynatici.basa} disabled={oynatici.konum < 0 && !oynatici.calisiyor} className={`${DUGME} w-11 bg-muted px-0 text-foreground hover:bg-muted/70`} aria-label="Başa sar" title="Başa sar">
          <SIMGE.basa className="h-5 w-5" />
        </button>
        <button type="button" onClick={hepsiniSina} disabled={!program.length} className={`${DUGME} ml-auto bg-ada-fener/20 text-foreground hover:bg-ada-fener/30`} data-hepsini-sina>
          <SIMGE.sina className="h-5 w-5 text-[#8a6a2a] dark:text-ada-fener" /> Hepsini sına
        </button>
      </div>
    </section>
  );

  const GORUNUMLER: [KodGorunumu, string, (p: { className?: string }) => React.ReactElement][] = [
    ['bloklar', 'Bloklar', SIMGE.bloklar],
    ['sozde', 'Sözde kod', SIMGE.sozde],
    ['akis', 'Akış şeması', SIMGE.akis],
  ];
  const kod = (
    <aside className={`${dar ? 'mx-3 mb-4 min-h-[460px] rounded-[calc(var(--radius)-2px)] border' : 'w-[clamp(340px,34%,460px)] shrink-0 border-l'} flex min-h-0 flex-col border-border bg-card`} aria-label="Kod">
      {ifadeBirimi && (
        <div className="flex items-center gap-1 border-b border-border px-2 py-2" role="tablist" aria-label="Kod görünümü">
          {GORUNUMLER.map(([k, ad, S]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={gorunum === k}
              onClick={() => setGorunum(k)}
              className={`inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-bold ${gorunum === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              <S className="h-4 w-4 shrink-0" />
              {ad}
            </button>
          ))}
        </div>
      )}
      {gorunum === 'bloklar' || !ifadeBirimi ? (
        <BlokDuzenleyici
          key={atolye.id}
          program={program}
          onDegis={programDegis}
          aracKutusu={atolye.aracKutusu}
          aktif={aktif}
          sayimlar={sayimlar}
          baslik="Kodun"
          kutuBasligi={kart ? 'Kartlar' : 'Bloklar'}
          kart={kart}
          enFazlaBlok={atolye.enCokBlok}
          degiskenler={degiskenAdlari}
          olcumler={atolye.olcumler}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-3 pb-4 pt-3">{gorunum === 'sozde' ? <SozdeKodGorunumu program={program} aktif={aktif} /> : <AkisSemasi program={program} aktif={aktif} />}</div>
      )}
    </aside>
  );

  return (
    <div ref={kokRef} className="relative flex h-full w-full flex-col bg-background text-foreground" data-atolye={atolye.id}>
      {yonerge}
      <div className={`min-h-0 flex-1 ${dar ? 'overflow-auto' : 'flex'}`}>
        {tuval}
        {kod}
      </div>
    </div>
  );
}
