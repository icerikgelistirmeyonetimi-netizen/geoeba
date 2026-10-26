'use client';

/**
 * Atölye ekranı (ikinci etkinlik türü): açık uçlu proje. Görev ekranıyla aynı üç alan: üstte amaç ve
 * yıldız ölçütleri, solda tuval (dünya çipleriyle birkaç sınama dünyası), sağda kod. Ekranda sınama dünyaları
 * atölyenin kendi sahne adıyla anılır (tarla, cadde, sera …; sahneAdi.ts, cümleler atolyeMetinleri.ts).
 * "Çalıştır" seçili dünyada canlandırır; "Hepsini sına" kodu bütün dünyalarda çalıştırır ve yıldız verir:
 * ★ ilk dünyada doğru · ★★ bütün dünyalarda doğru · ★★★ ayrıca en çok N blok.
 * Dünya başına kodlu atölyede (Atolye.dunyaBasinaKod, Ayna atölyesi) her sahanın kodu ayrıdır: saha değişince kod
 * alanı o sahanın koduna (ilk açılışta boş) geçer; "Hepsini sına" her sahayı kendi koduyla çalıştırır (sinaAyri).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SahneAlani, type SahneTutamaci } from './SahneAlani';
import { IpucuKarti } from './IpucuKarti';
import { BlokDuzenleyici } from './BlokDuzenleyici';
import { AkisSemasi } from './AkisSemasi';
import { DogalDilGorunumu, GosterimAnahtari } from './DogalDilGorunumu';
import { CozumKarti } from './CozumKarti';
import { temelDuzeyMetni } from './AritmetikInceleme';
import { SIMGE } from './simgeler';
import { kalipBul } from './kaliplar';
import { DAR_ESIK, DUGME, GOSTERGE, basikMi, sayimlarKadar, useBoyut } from './ortak';
import { atolyeGuncelle, atolyeKaydi, type LabKaydi } from './kayit';
import { blokSayisi, bloklar, sayiMetni, type Program } from './program';
import { calistir, type Iz } from './yorumlayici';
import { sina, sinaAyri, sonucIletisi, type SinamaSonucu } from './degerlendirme';
import { calismaBasariMetni, olcutMetinleri, sinamaMetni } from './atolyeMetinleri';
import { sahneAdi } from './sahneAdi';
import { ekranKonumu, useOynatici } from './useOynatici';
import { adimAnlatimi, baslangicAnlatimi } from './anlatici';
import { izgara, koordinatlar } from './dunya';
import { kodGorunumleri, type Atolye, type KodGorunumu } from './gorev';

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
  const basik = basikMi(boyut);
  const dar = boyut.en > 0 && boyut.en < DAR_ESIK && !basik;
  const gizli = boyut.en === 0 || boyut.boy === 0;
  const kart = atolye.gorunum === 'kart';
  const ifadeBirimi = atolye.gorunum === 'ifade' || atolye.sinif === 5;
  const [cozumAcik, setCozumAcik] = useState(false);
  useEffect(() => setCozumAcik(false), [atolye.id]);

  const ak = atolyeKaydi(kayit, atolye.id);
  /** Her sahanın kendi kodu var mı (Ayna atölyesi): öbür sahanın kodu bu sahada kendiliğinden çalışmaz */
  const ayriKod = !!atolye.dunyaBasinaKod;

  const [dunyaSira, setDunyaSira] = useState(0);
  useEffect(() => setDunyaSira(0), [atolye.id]);
  const dunya = atolye.dunyalar[Math.min(dunyaSira, atolye.dunyalar.length - 1)];
  const dunyaId = dunya.id;

  const program = useMemo<Program>(() => (ayriKod ? ak.programlar?.[dunyaId] : ak.program) ?? [], [ayriKod, ak.programlar, ak.program, dunyaId]);
  const programDegis = useCallback(
    (p: Program) =>
      setKayit((k) =>
        atolyeGuncelle(k, atolye.id, (a) => (ayriKod ? { ...a, programlar: { ...(a.programlar ?? {}), [dunyaId]: p } } : { ...a, program: p }))
      ),
    [atolye.id, ayriKod, dunyaId, setKayit]
  );
  /** Sahaların kodları (dünya sırasıyla); tek kodlu atölyede hepsi aynı kod */
  const sahaKodlari = atolye.dunyalar.map((d) => (ayriKod ? ak.programlar?.[d.id] : ak.program) ?? []);
  const kodVar = sahaKodlari.some((p) => p.length > 0);
  const iz = useMemo(() => calistir(program, dunya, atolye.hedef), [program, dunya, atolye.hedef]);
  const izRef = useRef(iz);
  izRef.current = iz;

  const [sinama, setSinama] = useState<SinamaSonucu | null>(null);
  /** "Hepsini sına" iletisi ayrı tutulur: sınama başarısız dünyaya geçince tuval yeniden yüklenir, ileti kalmalı */
  const [sinamaIletisi, setSinamaIletisi] = useState<{ basarili: boolean; metin: string } | null>(null);
  // Kod değişince sınama sonucu silinir. Dünya başına kodda saha değiştirmek kodu değiştirmez (yalnız gösterilen kod
  // değişir): sınamanın iletisi ve saha işaretleri kalır, "Hepsini sına" başarısız sahaya geçince kaybolmaz.
  const kodAnahtari = ayriKod ? ak.programlar : program;
  useEffect(() => {
    setSinama(null);
    setSinamaIletisi(null);
  }, [kodAnahtari, atolye.id]);
  const [sonuc, setSonuc] = useState<{ basarili: boolean; metin: string } | null>(null);
  const [ipucuAcik, setIpucuAcik] = useState(false);
  /** Açılan ipucu sayısı (en az 1): "Bir ipucu daha" sıradakini açar; başka atölyeye geçince başa döner */
  const [acilanIpucu, setAcilanIpucu] = useState(1);
  useEffect(() => setAcilanIpucu(1), [atolye.id]);
  // Atölye sözde kodla açılır; bloklar üçüncü seçenektir (kodGorunumleri)
  const [gorunum, setGorunum] = useState<KodGorunumu>('sozde');
  const gorunumler = kodGorunumleri(atolye.sinif, ifadeBirimi);
  const etkinGorunum = gorunumler.includes(gorunum) ? gorunum : 'sozde';

  const sahneRef = useRef<SahneTutamaci>(null);
  const onBitti = useCallback(
    (z: Iz) => {
      if (z !== izRef.current) return;
      if (z.sonuc.basarili) setSonuc({ basarili: true, metin: calismaBasariMetni(atolye) });
      else setSonuc({ basarili: false, metin: atolye.sinif === 5 ? temelDuzeyMetni(sonucIletisi(z.sonuc, dunya, atolye.bitkiAdi)) : sonucIletisi(z.sonuc, dunya, atolye.bitkiAdi) });
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
    const ayar = { gorunen: atolye.dunyalar[0], sinama: atolye.dunyalar.slice(1), hedef: atolye.hedef, enFazlaBlok: atolye.enCokBlok, bitkiAdi: atolye.bitkiAdi };
    const s = ayriKod ? sinaAyri(sahaKodlari, ayar) : sina(program, ayar, 1);
    setSinama(s);
    setKayit((k) => atolyeGuncelle(k, atolye.id, (a) => ({ ...a, yildiz: Math.max(a.yildiz, s.yildiz) })));
    const n = ayriKod ? s.blokSayisi : blokSayisi(program);
    const ilkHata = s.dunyalar.findIndex((d) => !d.basarili);
    /** Dünya başına kodda başarısız sahanın iletisi: kodu hiç kurulmadıysa bunu söyler */
    const sahaIletisi = (i: number) => (sahaKodlari[i].length ? s.dunyalar[i].ileti : 'Bu sahanın kodunu henüz kurmadın.');
    setSinamaIletisi({ basarili: s.yildiz >= 2, metin: sinamaMetni(atolye, s, n, sahaIletisi) });
    if (ilkHata > 0) setDunyaSira(ilkHata);
  };

  // --- Tuval bilgileri ---------------------------------------------------------------
  // Kod düzenlenince iz yenilenir, oynatıcı yeni izi bir çizim sonra yükler: o arada eski konum yeni izi aşmasın
  const izKonumu = ekranKonumu(oynatici.iz, iz, oynatici.konum);
  const suankiAdim = izKonumu >= 0 ? iz.adimlar[izKonumu] : null;
  const onceki = izKonumu > 0 ? iz.adimlar[izKonumu - 1].durum : iz.baslangic;
  const durum = (izKonumu >= 0 ? oynatici.durum : null) ?? iz.baslangic;
  const sayimlar = useMemo(() => sayimlarKadar(iz, izKonumu), [iz, izKonumu]);
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
        <span className="inline-flex min-h-[44px] items-center gap-1 rounded-full bg-card/95 p-1 shadow-sm ring-1 ring-border backdrop-blur" role="tablist" aria-label={`Sınanacak ${sahneAdi(atolye).cogul}`} data-dunya-cipleri>
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
        <span>{mesaj ? (atolye.sinif === 5 ? temelDuzeyMetni(mesaj.metin) : mesaj.metin) : suankiAdim ? (atolye.sinif === 5 ? temelDuzeyMetni(adimAnlatimi(suankiAdim, onceki, program, dunya, atolye.bitkiAdi)) : adimAnlatimi(suankiAdim, onceki, program, dunya, atolye.bitkiAdi)) : program.length ? 'Kodu çalıştırmak için Çalıştır düğmesine bas.' : baslangicAnlatimi(dunya, kart)}</span>
      </p>
    </div>
  );

  const kalip = kalipBul(atolye.kalip);
  // Tek sahnede ★ ile ★★ birlikte gelir (sına: ilk sahne aynı zamanda bütün sahneler)
  const olcutler = olcutMetinleri(atolye);
  /** İpuçları: ilki genel (kalıp kartının adıyla), sonrakiler "Bir ipucu daha" ile sırayla daha somut */
  const ipuclari = [kalip ? `${atolye.ipucu} (Kalıp: ${kalip.ad})` : atolye.ipucu, ...(atolye.ipuclari ?? [])];

  const yonerge = (
    <header className={`flex flex-wrap items-center gap-x-4 border-b border-border bg-card ${basik ? 'gap-y-1 px-3 py-1.5' : 'gap-y-2 px-4 py-3'}`} data-atolye-yonergesi>
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
        <p className={`mt-0.5 font-semibold leading-snug text-foreground ${basik ? (kart ? 'text-[16px]' : 'text-[15px]') : kart ? 'text-[19px]' : 'text-[17px]'}`}>{atolye.yonerge}</p>
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
      {(sonuc?.basarili === false || sinamaIletisi?.basarili === false || ipucuAcik) && <button type="button" onClick={() => setCozumAcik(true)} className={`${DUGME} bg-muted text-foreground`}>Çözümü göster</button>}
    </header>
  );

  const tuval = (
    <section className={`flex min-w-0 flex-col ${dar ? '' : 'min-h-0 flex-1'} ${basik ? 'p-2' : 'p-3'}`} aria-label="Tuval">
      <div className={dar ? 'h-[320px]' : 'min-h-0 flex-1'}>
        <SahneAlani ref={sahneRef} dunya={dunya} donanim={donanim} koyu={koyu} azHareket={azHareket} gizli={gizli} durum={durum} ustBilgi={dunyaCipleri}
          ipucu={
            ipucuAcik ? (
              <IpucuKarti
                ipuclari={ipuclari}
                acilan={Math.min(acilanIpucu, ipuclari.length)}
                onDaha={acilanIpucu < ipuclari.length ? () => setAcilanIpucu((a) => Math.min(ipuclari.length, a + 1)) : undefined}
                onKapat={() => setIpucuAcik(false)}
              />
            ) : null
          }
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
        <button type="button" onClick={hepsiniSina} disabled={!kodVar} className={`${DUGME} ml-auto bg-ada-fener/20 text-foreground hover:bg-ada-fener/30`} data-hepsini-sina>
          <SIMGE.sina className="h-5 w-5 text-[#8a6a2a] dark:text-ada-fener" /> Hepsini sına
        </button>
      </div>
    </section>
  );

  const GORUNUMLER: Record<KodGorunumu, [string, (p: { className?: string }) => React.ReactElement]> = {
    sozde: ['Sözde kod', SIMGE.sozde],
    akis: ['Akış şeması', SIMGE.akis],
    bloklar: [kart ? 'Kartlar' : 'Bloklar', SIMGE.bloklar],
    dogal: ['Doğal dil', SIMGE.sozde],
  };
  const kod = (
    <aside className={`${dar ? 'mx-3 mb-4 min-h-[460px] rounded-[calc(var(--radius)-2px)] border' : 'w-[clamp(340px,34%,460px)] shrink-0 border-l'} flex min-h-0 flex-col border-border bg-card`} aria-label="Kod">
      {/* Basıkta seçici tek satır: yalnız etkin görünümün adı yazılır (görev ekranıyla aynı) */}
      <div className={`flex flex-wrap items-center gap-1 border-b border-border px-2 ${basik ? 'py-1' : 'py-2'}`} role="tablist" aria-label="Kod görünümü" data-kod-gorunumu>
        {gorunumler.map((k) => {
          const [ad, S] = GORUNUMLER[k];
          const kisa = basik && etkinGorunum !== k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={etkinGorunum === k}
              onClick={() => setGorunum(k)}
              title={kisa ? ad : undefined}
              className={`inline-flex min-h-[38px] ${kisa ? 'w-10 flex-none' : 'flex-1'} items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-bold ${etkinGorunum === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              data-gorunum={k}
            >
              <S className="h-4 w-4 shrink-0" />
              {kisa ? <span className="sr-only">{ad}</span> : ad}
            </button>
          );
        })}
      </div>
      {etkinGorunum === 'bloklar' || etkinGorunum === 'sozde' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {etkinGorunum === 'sozde' && ifadeBirimi && <div className="shrink-0 px-3 pt-3"><GosterimAnahtari acik={false} /></div>}
          <div className="min-h-0 flex-1">
            <BlokDuzenleyici
              key={ayriKod ? `${atolye.id}:${dunyaId}` : atolye.id}
              program={program}
              onDegis={programDegis}
              aracKutusu={atolye.aracKutusu}
              aktif={aktif}
              sayimlar={sayimlar}
              baslik={ayriKod ? `${dunyaSira + 1}. sahanın kodu` : 'Kodun'}
              kutuBasligi={etkinGorunum === 'sozde' ? 'Komutlar' : kart ? 'Kartlar' : 'Bloklar'}
              kart={kart}
              enFazlaBlok={atolye.enCokBlok}
              degiskenler={degiskenAdlari}
              olcumler={atolye.olcumler}
              temel={atolye.sinif === 5}
              sozde={etkinGorunum === 'sozde'}
            />
          </div>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-3 pb-4 pt-3" data-kod-aynasi={etkinGorunum}>
          {etkinGorunum === 'dogal' ? <DogalDilGorunumu program={program} /> : <><GosterimAnahtari akis /><AkisSemasi program={program} aktif={aktif} /></>}
          <p className="mt-3 text-[12px] font-semibold text-muted-foreground">Kodu değiştirmek için Sözde kod ya da {kart ? 'Kartlar' : 'Bloklar'} görünümüne geç.</p>
        </div>
      )}
    </aside>
  );

  return (
    <div ref={kokRef} className="relative flex h-full w-full flex-col bg-background text-foreground" data-atolye={atolye.id}>
      {/* Basıkta yönerge ile gövde birlikte kayar (görev ekranıyla aynı düzen; bkz. ortak.tsx basikMi) */}
      <div className={basik ? 'min-h-0 flex-1 overflow-y-auto overscroll-contain' : 'flex min-h-0 flex-1 flex-col'} data-basik={basik || undefined}>
        {yonerge}
        <div className={basik ? 'flex h-full' : `min-h-0 flex-1 ${dar ? 'overflow-auto' : 'flex'}`}>
          {tuval}
          {kod}
        </div>
      </div>
      {cozumAcik && <CozumKarti program={atolye.cozumler?.[dunyaSira] ?? atolye.cozum} onKapat={() => setCozumAcik(false)} sozde={etkinGorunum !== 'bloklar'} />}
    </div>
  );
}
