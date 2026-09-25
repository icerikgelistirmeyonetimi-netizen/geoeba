'use client';

/**
 * Algoritma Laboratuvarı — masaüstü uygulaması. Müfredat 1. sınıftan başlar (mufredat.ts).
 *
 * Ekranda üç şey vardır (kullanıcı kararı): üstte yönerge, solda tuval (bahçe / sera sahnesi),
 * sağda kod. Görevler tek tek gelir: önce kodu yaz, sonra aynı kodu farklı kurgularda sına ve
 * düzelt, arada hazır koddaki hatayı bul. Ünite seçimi yönergenin ilk satırındaki menüdedir.
 * 1–2. sınıfta kod numaralı ok kartlarıyla gösterilir ve yönerge kendiliğinden sesli okunur.
 * İlerleme bu cihazda (kayit.ts).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SahneAlani, type SahneTutamaci } from './SahneAlani';
import { BlokDuzenleyici } from './BlokDuzenleyici';
import { OgretmenNotu } from './OgretmenNotu';
import { KalipKarti } from './KalipKarti';
import { kalipBul } from './kaliplar';
import { SIMGE } from './simgeler';
import { AkisSemasi } from './AkisSemasi';
import { SozdeKodGorunumu } from './SozdeKodGorunumu';
import { GOREV_TURU_ADI, type Gorev, type KodGorunumu, type Unite } from './gorev';
import { UNITELER, sinifGruplari, uniteBul } from './mufredat';
import { gorevGuncelle, gorevKaydi, gorevKodu, kaydiYaz, kaydiYukle, uniteGuncelle, uniteIlerlemesi, uniteKaydi, type LabKaydi } from './kayit';
import { blokSayisi, bloklar, sayiMetni, type Program } from './program';
import { izgara, koordinatlar } from './dunya';
import { calistir, type Iz } from './yorumlayici';
import { sonucIletisi } from './degerlendirme';
import { useOynatici } from './useOynatici';
import { adimAnlatimi, baslangicAnlatimi } from './anlatici';

export { manifest } from './manifest';
import { DAR_ESIK, DUGME, GOSTERGE, sayimlarKadar, sesiSustur, sesliOku, useAzHareket, useBoyut, useKoyuTema } from './ortak';
import { SiniflarSayfasi, SinifSayfasi } from './Giris';
import { AtolyeEkrani } from './AtolyeEkrani';
import { IpucuKarti } from './IpucuKarti';
import { atolyeBul } from './atolyeler';

type Ekran = { tur: 'giris' } | { tur: 'sinif'; sinif: number } | { tur: 'gorev' } | { tur: 'atolye'; id: string };

/**
 * Uygulamanın kabuğu: kayıt burada tutulur; açılışta sınıf kutuları, sonra sınıf sayfası, görev ya da atölye ekranı.
 */
export default function AlgoritmaUygulamasi(_props: { pencereGenisligi?: number; pencereYuksekligi?: number }) {
  const koyu = useKoyuTema();
  const azHareket = useAzHareket();
  const [kayit, setKayit] = useState<LabKaydi>(kaydiYukle);
  useEffect(() => kaydiYaz(kayit), [kayit]);
  const [ekran, setEkran] = useState<Ekran>({ tur: 'giris' });

  const sonUnite = uniteBul(kayit.unite);
  const baslamis = Object.keys(kayit.gorevler).length > 0 || Object.keys(kayit.uniteler).length > 0;
  const uk = uniteKaydi(kayit, sonUnite.id);
  const devam = baslamis ? { baslik: `${sonUnite.sinif}. sınıf · ${sonUnite.ad}`, alt: `Görev ${Math.min(uk.aktif, sonUnite.gorevler.length - 1) + 1} / ${sonUnite.gorevler.length}` } : null;
  const uniteAc = (id: string) => {
    setKayit((k) => ({ ...k, unite: id }));
    setEkran({ tur: 'gorev' });
  };
  const atolye = ekran.tur === 'atolye' ? atolyeBul(ekran.id) : undefined;

  return (
    <div className="relative h-full w-full bg-background text-foreground" data-uygulama="algoritma" data-ekran={ekran.tur}>
      {ekran.tur === 'giris' && <SiniflarSayfasi kayit={kayit} koyu={koyu} onSinif={(s) => setEkran({ tur: 'sinif', sinif: s })} devam={devam} onDevam={() => setEkran({ tur: 'gorev' })} />}
      {ekran.tur === 'sinif' && <SinifSayfasi sinif={ekran.sinif} kayit={kayit} koyu={koyu} onUnite={uniteAc} onAtolye={(id) => setEkran({ tur: 'atolye', id })} onGeri={() => setEkran({ tur: 'giris' })} />}
      {ekran.tur === 'gorev' && <GorevEkrani kayit={kayit} setKayit={setKayit} koyu={koyu} azHareket={azHareket} onSinifSayfasi={(s) => setEkran({ tur: 'sinif', sinif: s })} />}
      {ekran.tur === 'atolye' && atolye && <AtolyeEkrani atolye={atolye} kayit={kayit} setKayit={setKayit} koyu={koyu} azHareket={azHareket} onGeri={() => setEkran({ tur: 'sinif', sinif: atolye.sinif })} />}
    </div>
  );
}

/** Görev ekranı: yönerge, tuval, kod (kullanıcı kararı: yalnız bu üç alan) */
function GorevEkrani({
  kayit,
  setKayit,
  koyu,
  azHareket,
  onSinifSayfasi,
}: {
  kayit: LabKaydi;
  setKayit: React.Dispatch<React.SetStateAction<LabKaydi>>;
  koyu: boolean;
  azHareket: boolean;
  onSinifSayfasi: (sinif: number) => void;
}) {
  const [kokRef, boyut] = useBoyut<HTMLDivElement>();
  const dar = boyut.en > 0 && boyut.en < DAR_ESIK;
  const gizli = boyut.en === 0 || boyut.boy === 0;

  const unite: Unite = uniteBul(kayit.unite);
  const uk = uniteKaydi(kayit, unite.id);
  const sira = Math.min(uk.aktif, unite.gorevler.length - 1);
  const gorev: Gorev = unite.gorevler[sira];
  const gk = gorevKaydi(kayit, gorev.id);
  const kart = unite.gorunum === 'kart';
  const ifadeBirimi = unite.gorunum === 'ifade';
  const tahminGorevi = gorev.tur === 'tahmin' && !!gorev.tahmin;
  const [gorunum, setGorunum] = useState<KodGorunumu>('bloklar');
  useEffect(() => setGorunum(gorev.ilkGorunum ?? 'bloklar'), [gorev.id, gorev.ilkGorunum]);
  const program = useMemo(() => gorevKodu(kayit, unite, gorev), [kayit, unite, gorev]);
  const programRef = useRef(program);
  programRef.current = program;
  const tahminRef = useRef(gk.tahmin);
  tahminRef.current = gk.tahmin;
  const gorevIdRef = useRef(gorev.id);
  gorevIdRef.current = gorev.id;
  const programDegis = useCallback((p: Program) => setKayit((k) => gorevGuncelle(k, gorevIdRef.current, (g) => ({ ...g, program: p }))), []);
  const gorevSec = useCallback(
    (j: number) => setKayit((k) => uniteGuncelle(k, k.unite, (u) => ({ ...u, aktif: Math.max(0, Math.min(uniteBul(k.unite).gorevler.length - 1, j)) }))),
    []
  );
  const uniteSec = useCallback((id: string) => setKayit((k) => ({ ...k, unite: id })), []);

  const iz = useMemo(() => calistir(program, gorev.dunya, gorev.hedef), [program, gorev]);
  const izRef = useRef(iz);
  izRef.current = iz;
  const [sonuc, setSonuc] = useState<{ basarili: boolean; metin: string } | null>(null);
  const [notAcik, setNotAcik] = useState(false);
  /** İpucu kartı tuvalde açık mı (görev değişince kapanır; açılmış ipuçları kayıtta kalır) */
  const [ipucuAcik, setIpucuAcik] = useState(false);
  useEffect(() => setIpucuAcik(false), [gorev.id]);
  const [sonAcik, setSonAcik] = useState(false);

  const sahneRef = useRef<SahneTutamaci>(null);
  const onBitti = useCallback(
    (z: Iz) => {
      if (z !== izRef.current) return;
      if (z.sonuc.basarili) {
        const n = blokSayisi(programRef.current);
        if (gorev.enCokBlok !== undefined && n > gorev.enCokBlok) {
          const birim = unite.gorunum === 'kart' ? 'kart' : 'blok';
          setSonuc({ basarili: false, metin: `Oldu ama kodun uzun: ${n} ${birim}. Aynı işi en çok ${gorev.enCokBlok} ${birim}la yapabilirsin.` });
          return;
        }
        if (gorev.tur === 'tahmin' && gorev.tahmin) {
          const dogru = gorev.tahmin.cevap(z);
          const t = tahminRef.current;
          if (t !== dogru) {
            setSonuc({ basarili: false, metin: `Sonuç ${sayiMetni(dogru)} ${gorev.tahmin.birim}; senin tahminin ${t === undefined ? 'yoktu' : `${sayiMetni(t)} idi`}. ${gorev.tahmin.yonlendirme ?? 'Kodu adım adım izle: nerede ayrıldın?'}` });
            return;
          }
          setSonuc({ basarili: true, metin: `Tahminin doğru: ${sayiMetni(dogru)} ${gorev.tahmin.birim}. ${gorev.basari(z).replace(/^(Doğru|Oldu)!\s*/, '')}` });
          setKayit((k) => gorevGuncelle(k, gorev.id, (g) => ({ ...g, tamam: true })));
          return;
        }
        setSonuc({ basarili: true, metin: gorev.basari(z) });
        setKayit((k) => gorevGuncelle(k, gorev.id, (g) => ({ ...g, tamam: true })));
      } else {
        setSonuc({ basarili: false, metin: sonucIletisi(z.sonuc, gorev.dunya, gorev.bitkiAdi) });
      }
    },
    [gorev, unite.gorunum]
  );
  const oynatici = useOynatici(sahneRef, 1, onBitti);
  // Kod çalışmaya başlayınca ipucu kartı kapanır: ileti şeridi (anlatım, sonuç) geri gelir
  const oynuyor = oynatici.konum >= 0;
  useEffect(() => {
    if (oynuyor) setIpucuAcik(false);
  }, [oynuyor]);

  // Kod ya da görev değişince: sahne başa, sonuç iletisi silinir
  useEffect(() => {
    oynatici.yukle(iz);
    setSonuc(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iz]);

  // Ünitenin bütün zorunlu görevleri tamam → ünite sonu (bir kez)
  const ilerleme = uniteIlerlemesi(kayit, unite);
  useEffect(() => {
    if (ilerleme.tamam === ilerleme.toplam && !uk.bitti) {
      setKayit((k) => uniteGuncelle(k, unite.id, (u) => ({ ...u, bitti: true })));
      setSonAcik(true);
    }
  }, [ilerleme.tamam, ilerleme.toplam, uk.bitti, unite.id]);

  // Sesli yönerge: okumaya yeni başlayanlar için görev açılınca kendiliğinden (bir kez)
  const [sesVar, setSesVar] = useState(false);
  useEffect(() => setSesVar(typeof window !== 'undefined' && 'speechSynthesis' in window), []);
  useEffect(() => {
    if (!unite.sesliYonerge || gizli) return;
    const t = window.setTimeout(() => sesliOku(gorev.yonerge), 450);
    return () => {
      window.clearTimeout(t);
      sesiSustur();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gorev.id]);

  // Klavye: boşluk çalıştır/duraklat, → adım (yazı alanları ve bloklar hariç)
  useEffect(() => {
    const el = kokRef.current;
    if (!el) return;
    const tus = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable="true"], [data-blok-id], button')) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (oynatici.calisiyor) oynatici.duraklat();
        else oynatici.oynat();
      } else if (e.key === 'ArrowRight') oynatici.adim();
    };
    el.addEventListener('keydown', tus);
    return () => el.removeEventListener('keydown', tus);
  }, [kokRef, oynatici]);

  // --- Tuvalin üzerindeki bilgiler -----------------------------------------------
  const suankiAdim = oynatici.konum >= 0 ? iz.adimlar[oynatici.konum] : null;
  const onceki = oynatici.konum > 0 ? iz.adimlar[oynatici.konum - 1].durum : iz.baslangic;
  const durum = oynatici.durum ?? iz.baslangic;
  const sayimlar = useMemo(() => sayimlarKadar(iz, oynatici.konum), [iz, oynatici.konum]);
  const aktif = suankiAdim ? { yigin: suankiAdim.yigin, hata: !!suankiAdim.hata } : null;
  const kullanir = (e: string) => gorev.aracKutusu.some((s) => s.tur === 'eylem' && s.eylem === e) || [...bloklar(program)].some((b) => b.tur === 'eylem' && b.eylem === e);
  const donanim = { tank: kullanir('sula'), sepet: kullanir('topla'), gubre: kullanir('gubreVer') };

  const bitti = oynatici.bitti && !oynatici.calisiyor;
  const mesaj = bitti && sonuc ? sonuc : null;
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
        <span>{mesaj ? mesaj.metin : suankiAdim ? adimAnlatimi(suankiAdim, onceki, program, gorev.dunya, gorev.bitkiAdi) : program.length ? 'Kodu çalıştırmak için Çalıştır düğmesine bas.' : baslangicAnlatimi(gorev.dunya, kart)}</span>
      </p>
    </div>
  );
  const zg = izgara(gorev.dunya);
  const degiskenAdlari = [...new Set([...Object.keys(gorev.dunya.degiskenler ?? {}), ...(gorev.degiskenler ?? [])])];
  const konum = gorev.dunya.koordinat ? koordinatlar(zg, durum.x, durum.y) : null;
  const gostergeler = (
    <div className="flex flex-wrap gap-2">
      {konum && (
        <span className={GOSTERGE} data-konum>
          <SIMGE.isaretle className="h-5 w-5 text-[#216a78]" />
          <span className="tabular-nums">
            ({sayiMetni(konum.x)}, {sayiMetni(konum.y)})
          </span>
        </span>
      )}
      {degiskenAdlari.map((d) => (
        <span key={d} className={GOSTERGE} data-degisken-gostergesi={d}>
          <SIMGE.degisken className="h-5 w-5 text-[#a3476b]" />
          {d}
          <span className="min-w-[1.5ch] rounded-full bg-[#a3476b]/12 px-2 tabular-nums text-[#8a2f55] dark:text-[#f0b9cf]">{durum.degiskenler[d] === undefined ? '—' : sayiMetni(durum.degiskenler[d])}</span>
        </span>
      ))}
      {zg.tur === 'cizim' && zg.cizgiHedef.size > 0 && (
        <span className={GOSTERGE} data-cizgi-sayaci>
          <SIMGE.kalem className="h-5 w-5 text-[#216a78]" />
          Çizgi <span className="tabular-nums">{durum.cizgiler.length}</span>
        </span>
      )}
      {zg.boyaHedef.some(Boolean) && (
        <span className={GOSTERGE} data-boya-sayaci>
          {gorev.dunya.boyaTuru === 'ek' ? <SIMGE.ek className="h-5 w-5 text-[#1d766f]" /> : <SIMGE.boya className="h-5 w-5 text-[#1d766f]" />}
          {gorev.dunya.boyaTuru === 'ek' ? 'Ekili' : 'Boyalı'} <span className="tabular-nums">{durum.boyali.length}</span>
        </span>
      )}
      {zg.tur === 'insaat' && (
        <span className={GOSTERGE} data-kup-sayaci>
          <SIMGE.koy className="h-5 w-5 text-[#1d766f]" />
          Küp <span className="tabular-nums">{durum.kupler.reduce((a, b) => a + b, 0)}</span>
        </span>
      )}
      {gorev.dunya.adimIzi && (
        <span className={GOSTERGE} data-adim-sayaci>
          <SIMGE.ileri className="h-5 w-5 text-[#216a78]" />
          Adım <span className="tabular-nums">{durum.izler.length}</span>
        </span>
      )}
      {donanim.tank && unite.sinif >= 3 && (
        <span className={GOSTERGE} data-depo>
          <SIMGE.sula className="h-5 w-5 text-[#3f8fc0]" />
          <span className="relative h-2.5 w-16 overflow-hidden rounded-full bg-muted">
            <span className="absolute inset-y-0 left-0 rounded-full bg-[#4fa7d6] transition-[width] duration-300" style={{ width: `${(durum.depo / (gorev.dunya.depo ?? 20)) * 100}%` }} />
          </span>
          <span className="tabular-nums">{durum.depo} L</span>
        </span>
      )}
      {donanim.sepet && (
        <span className={GOSTERGE} data-sepet>
          <SIMGE.topla className="h-5 w-5 text-[#d83b2b]" />
          Sepet <span className="tabular-nums">{durum.sepet}</span>
        </span>
      )}
    </div>
  );

  // --- Yönerge ---------------------------------------------------------------------
  const acilanIpucu = Math.min(gk.ipucu, gorev.ipuclari.length);
  const ipucuDaha = () => setKayit((k) => gorevGuncelle(k, gorev.id, (g) => ({ ...g, ipucu: Math.min(gorev.ipuclari.length, g.ipucu + 1) })));
  const ipucuDugmesi = () => {
    if (!ipucuAcik && acilanIpucu > 0) setIpucuAcik(true);
    else {
      ipucuDaha();
      setIpucuAcik(true);
    }
  };
  const ipucuKarti = ipucuAcik && acilanIpucu > 0 ? <IpucuKarti ipuclari={gorev.ipuclari} acilan={acilanIpucu} onDaha={gk.tamam ? undefined : ipucuDaha} onKapat={() => setIpucuAcik(false)} /> : null;
  const yonerge = (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border bg-card px-4 py-3" data-yonerge>
      <button
        type="button"
        onClick={() => onSinifSayfasi(unite.sinif)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${unite.sinif}. sınıfın üniteleri`}
        title={`${unite.sinif}. sınıfın üniteleri`}
        data-sinif-sayfasina
      >
        <SIMGE.ustten className="h-5 w-5" />
      </button>
      <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Görevler">
        <button type="button" onClick={() => gorevSec(sira - 1)} disabled={sira === 0} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted disabled:opacity-30" aria-label="Önceki görev">
          <SIMGE.ok className="h-5 w-5 rotate-180" />
        </button>
        <span className="min-w-[84px] text-center text-[14px] font-extrabold tabular-nums text-muted-foreground" data-gorev-sayaci>
          Görev {sira + 1} / {unite.gorevler.length}
        </span>
        <button type="button" onClick={() => gorevSec(sira + 1)} disabled={sira === unite.gorevler.length - 1} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted disabled:opacity-30" aria-label="Sonraki görev">
          <SIMGE.ok className="h-5 w-5" />
        </button>
      </div>
      <div className="min-w-0 flex-1 basis-[420px]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-extrabold text-muted-foreground">
          <UniteMenusu unite={unite} kayit={kayit} onSec={uniteSec} />
          <span className={`rounded-full px-2 py-0.5 ${gorev.tur === 'hata' ? 'bg-ada-mercan/15 text-ada-mercan' : gorev.tur === 'kurgu' ? 'bg-ada-fener/20 text-[#8a6a2a] dark:text-ada-fener' : gorev.tur === 'tahmin' ? 'bg-[#5d66a6]/15 text-[#4a5290] dark:text-[#b9bff0]' : 'bg-primary/10 text-primary'}`}>{GOREV_TURU_ADI[gorev.tur]}</span>
          {gorev.zorlu && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground" title="İsteğe bağlı: ünitenin tamamlanması için gerekmez">Zorlu</span>}
          <span className="text-foreground">{gorev.baslik}</span>
          {gk.tamam && (
            <span className="inline-flex items-center gap-1 text-ada-vurgu">
              <SIMGE.onay className="h-4 w-4" /> Tamam
            </span>
          )}
        </div>
        <p className={`mt-0.5 flex items-start gap-1.5 font-semibold leading-snug text-foreground ${kart ? 'text-[20px]' : 'text-[17px]'}`} data-yonerge-metni>
          <span>{gorev.yonerge}</span>
          {sesVar && (
            <button
              type="button"
              onClick={() => sesliOku(mesaj ? `${gorev.yonerge} ${mesaj.metin}` : gorev.yonerge)}
              className="-mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Yönergeyi sesli oku"
              title="Sesli oku"
              data-sesli-oku
            >
              <SIMGE.hoparlor className="h-5 w-5" />
            </button>
          )}
        </p>
        {tahminGorevi && gorev.tahmin && (
          <TahminSatiri
            metin={gorev.tahmin.metin}
            birim={gorev.tahmin.birim}
            deger={gk.tahmin}
            kilitli={gk.tamam}
            onDegis={(t) => {
              setKayit((k) => gorevGuncelle(k, gorev.id, (g) => ({ ...g, tahmin: t })));
              setSonuc(null);
            }}
          />
        )}
        {gorev.soru && gk.tamam && <SoruSatiri gorev={gorev} iz={iz} cevap={gk.cevap} onCevap={(c) => setKayit((k) => gorevGuncelle(k, gorev.id, (g) => ({ ...g, cevap: c })))} />}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!gk.tamam && gorev.ipuclari.length > 0 && (acilanIpucu < gorev.ipuclari.length || !ipucuAcik) && (
          <button type="button" onClick={ipucuDugmesi} className={`${DUGME} bg-ada-fener/15 text-foreground hover:bg-ada-fener/25`} data-ipucu>
            <SIMGE.ipucu className="h-5 w-5 text-ada-fener" /> İpucu
          </button>
        )}
        {gk.tamam && sira < unite.gorevler.length - 1 && (
          <button type="button" onClick={() => gorevSec(sira + 1)} className={`${DUGME} bg-primary text-primary-foreground hover:bg-primary/90`} data-sonraki-gorev>
            Sonraki görev <SIMGE.ok className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={() => setNotAcik(true)} className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Öğretmen notu" title="Öğretmen notu" data-ogretmen-notu-dugmesi>
          <SIMGE.ogretmen className="h-5 w-5" />
        </button>
      </div>
    </header>
  );

  // --- Paneller --------------------------------------------------------------------
  const tahminBekliyor = tahminGorevi && gk.tahmin === undefined;
  const tuval = (
    <section className={`flex min-w-0 flex-col ${dar ? '' : 'min-h-0 flex-1'} p-3`} aria-label="Tuval" data-tuval-paneli>
      <div className={dar ? 'h-[320px]' : 'min-h-0 flex-1'}>
        <SahneAlani ref={sahneRef} dunya={gorev.dunya} donanim={donanim} koyu={koyu} azHareket={azHareket} gizli={gizli} durum={durum} ustBilgi={gostergeler} ipucu={ipucuKarti} altBilgi={altSatir} />
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2" data-oynatma>
        {oynatici.calisiyor ? (
          <button type="button" onClick={oynatici.duraklat} className={`${DUGME} min-w-[150px] bg-ada-mercan text-white hover:bg-ada-mercan/90`} data-duraklat>
            <SIMGE.duraklat className="h-5 w-5" /> Duraklat
          </button>
        ) : (
          <button
            type="button"
            onClick={oynatici.oynat}
            disabled={!program.length || tahminBekliyor}
            title={tahminBekliyor ? 'Önce tahminini yaz' : undefined}
            className={`${DUGME} min-w-[150px] bg-primary text-primary-foreground hover:bg-primary/90`}
            data-calistir
          >
            <SIMGE.oynat className="h-5 w-5" /> {oynatici.konum >= 0 && !oynatici.bitti ? 'Devam et' : 'Çalıştır'}
          </button>
        )}
        <button type="button" onClick={oynatici.adim} disabled={!program.length || oynatici.bitti || tahminBekliyor} className={`${DUGME} bg-muted text-foreground hover:bg-muted/70`} data-adim title="Bir adım (→)">
          <SIMGE.adim className="h-5 w-5" /> Adım adım
        </button>
        <button type="button" onClick={oynatici.basa} disabled={oynatici.konum < 0 && !oynatici.calisiyor} className={`${DUGME} w-11 bg-muted px-0 text-foreground hover:bg-muted/70`} aria-label="Başa sar" title="Başa sar">
          <SIMGE.basa className="h-5 w-5" />
        </button>
      </div>
    </section>
  );

  const baslangicaDon = (
    <button
      type="button"
      onClick={() => setKayit((k) => gorevGuncelle(k, gorev.id, (g) => ({ ...g, program: undefined })))}
      disabled={!gk.program}
      className="inline-flex min-h-[32px] items-center gap-1 rounded-full px-2.5 text-[12px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
      title="Kodu bu görevin başındaki hâline döndür"
      data-kodu-sifirla
    >
      <SIMGE.basa className="h-3.5 w-3.5" /> Baştan
    </button>
  );

  const GORUNUMLER: [KodGorunumu, string, (p: { className?: string }) => React.ReactElement][] = [
    ['bloklar', 'Bloklar', SIMGE.bloklar],
    ['sozde', 'Sözde kod', SIMGE.sozde],
    ['akis', 'Akış şeması', SIMGE.akis],
  ];
  const gorunumSecici = ifadeBirimi && (
    <div className="flex items-center gap-1 border-b border-border px-2 py-2" role="tablist" aria-label="Kod görünümü" data-kod-gorunumu>
      {GORUNUMLER.map(([k, ad, S]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={gorunum === k}
          onClick={() => setGorunum(k)}
          className={`inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[13px] font-bold transition-colors ${gorunum === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
          data-gorunum={k}
        >
          <S className="h-4 w-4 shrink-0" />
          {ad}
        </button>
      ))}
    </div>
  );
  const kodIcerigi =
    gorunum === 'bloklar' || !ifadeBirimi ? (
      <BlokDuzenleyici
        key={gorev.id}
        program={program}
        onDegis={tahminGorevi ? undefined : programDegis}
        aracKutusu={gorev.aracKutusu}
        aktif={aktif}
        sayimlar={sayimlar}
        baslik={tahminGorevi ? 'Kod (önce tahmin et)' : 'Kodun'}
        kutuBasligi={kart ? 'Kartlar' : 'Bloklar'}
        ek={tahminGorevi ? null : baslangicaDon}
        kart={kart}
        enFazlaBlok={gorev.enCokBlok}
        degiskenler={degiskenAdlari}
        olcumler={gorev.olcumler}
      />
    ) : (
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-4 pt-3" data-kod-aynasi={gorunum}>
        {gorunum === 'sozde' ? <SozdeKodGorunumu program={program} aktif={aktif} /> : <AkisSemasi program={program} aktif={aktif} />}
        {!tahminGorevi && <p className="mt-3 text-[12px] font-semibold text-muted-foreground">Kodu değiştirmek için Bloklar görünümüne geç.</p>}
      </div>
    );
  const kod = (
    <aside className={`${dar ? 'mx-3 mb-4 min-h-[460px] rounded-[calc(var(--radius)-2px)] border' : 'w-[clamp(340px,34%,460px)] shrink-0 border-l'} flex min-h-0 flex-col border-border bg-card`} aria-label="Kod" data-kod-paneli>
      {gorunumSecici}
      {kodIcerigi}
    </aside>
  );

  const siradaki = UNITELER[UNITELER.findIndex((u) => u.id === unite.id) + 1];

  return (
    <div ref={kokRef} className="relative flex h-full w-full flex-col bg-background text-foreground" data-gorev-ekrani data-unite={unite.id} data-gorev={gorev.id}>
      {yonerge}
      <div className={`min-h-0 flex-1 ${dar ? 'overflow-auto' : 'flex'}`}>
        {tuval}
        {kod}
      </div>
      <OgretmenNotu acik={notAcik} onKapat={() => setNotAcik(false)} unite={unite} />
      {sonAcik && (
        <UniteSonu
          unite={unite}
          onKapat={() => setSonAcik(false)}
          siradaki={siradaki}
          onSiradaki={
            siradaki
              ? () => {
                  setSonAcik(false);
                  uniteSec(siradaki.id);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

/** Ünite seçimi: yönergenin ilk satırında "3. sınıf · Bak ve karar ver ▾"; üstte sınıf çipleri, altta o sınıfın üniteleri */
function UniteMenusu({ unite, kayit, onSec }: { unite: Unite; kayit: LabKaydi; onSec: (id: string) => void }) {
  const [acik, setAcik] = useState(false);
  const [sinif, setSinif] = useState(unite.sinif);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (acik) setSinif(unite.sinif);
  }, [acik, unite.sinif]);
  useEffect(() => {
    if (!acik) return;
    const dis = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setAcik(false);
    };
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAcik(false);
    };
    window.addEventListener('pointerdown', dis);
    window.addEventListener('keydown', tus);
    return () => {
      window.removeEventListener('pointerdown', dis);
      window.removeEventListener('keydown', tus);
    };
  }, [acik]);
  const gruplar = sinifGruplari();
  const grup = gruplar.find((g) => g.sinif === sinif) ?? gruplar[0];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-haspopup="menu"
        aria-expanded={acik}
        className="inline-flex min-h-[28px] items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[13px] font-extrabold text-foreground hover:bg-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-unite-menusu
      >
        {unite.sinif}. sınıf · {unite.ad}
        <SIMGE.ok className={`h-3.5 w-3.5 transition-transform ${acik ? '-rotate-90' : 'rotate-90'}`} />
      </button>
      {acik && (
        <div role="menu" className="absolute left-0 top-full z-40 mt-1.5 w-[320px] overflow-hidden rounded-[16px] border border-border bg-popover p-1.5 shadow-xl" data-unite-listesi>
          {gruplar.length > 1 && (
            <div className="flex flex-wrap gap-1 border-b border-border px-1 pb-1.5 pt-0.5" role="tablist" aria-label="Sınıf">
              {gruplar.map((g) => {
                const bitti = g.uniteler.every((u) => {
                  const il = uniteIlerlemesi(kayit, u);
                  return il.tamam === il.toplam;
                });
                return (
                  <button
                    key={g.sinif}
                    type="button"
                    role="tab"
                    aria-selected={g.sinif === grup.sinif}
                    onClick={() => setSinif(g.sinif)}
                    className={`relative flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-[14px] font-extrabold tabular-nums ${g.sinif === grup.sinif ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'}`}
                    aria-label={`${g.sinif}. sınıf`}
                    data-sinif-secenegi={g.sinif}
                  >
                    {g.sinif}
                    {bitti && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-ada-vurgu ring-2 ring-popover" />}
                  </button>
                );
              })}
            </div>
          )}
          <div className="py-1">
            <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">
              {grup.sinif}. sınıf · {grup.uniteler[0]?.kademe}
            </p>
            {grup.uniteler.map((u) => {
              const il = uniteIlerlemesi(kayit, u);
              const secili = u.id === unite.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={secili}
                  onClick={() => {
                    onSec(u.id);
                    setAcik(false);
                  }}
                  className={`flex min-h-[44px] w-full items-center gap-2.5 rounded-[12px] px-2.5 text-left text-[14px] font-bold ${secili ? 'bg-primary/10 text-foreground' : 'text-foreground hover:bg-muted'}`}
                  data-unite-secenegi={u.id}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${il.tamam === il.toplam ? 'bg-ada-vurgu text-white' : 'bg-muted text-muted-foreground'}`}>
                    {il.tamam === il.toplam ? <SIMGE.onay className="h-4 w-4" /> : u.no}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{u.ad}</span>
                  <span className="text-[12px] font-bold tabular-nums text-muted-foreground">
                    {il.tamam}/{il.toplam}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SoruSatiri({ gorev, iz, cevap, onCevap }: { gorev: Gorev; iz: Iz; cevap?: number; onCevap: (n: number | undefined) => void }) {
  const soru = gorev.soru;
  const [bakildi, setBakildi] = useState(false);
  if (!soru) return null;
  const dogru = soru.cevap(iz);
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[12px] bg-muted/60 px-3 py-2" data-gorev-sorusu>
      <span className="text-[15px] font-bold text-foreground">{soru.metin}</span>
      <input
        type="text"
        inputMode="numeric"
        value={cevap ?? ''}
        onChange={(e) => {
          setBakildi(false);
          const t = e.target.value.replace(/[^0-9]/g, '').slice(0, 5);
          onCevap(t === '' ? undefined : Number(t));
        }}
        className="h-10 w-24 rounded-[10px] border-2 border-border bg-background px-2 text-center text-[17px] font-extrabold tabular-nums outline-none focus:border-primary"
        aria-label={soru.metin}
      />
      <span className="text-[14px] font-bold text-muted-foreground">{soru.birim}</span>
      <button type="button" disabled={cevap === undefined} onClick={() => setBakildi(true)} className={`${DUGME} min-h-[40px] bg-primary px-3 text-[14px] text-primary-foreground hover:bg-primary/90`}>
        Kontrol et
      </button>
      {bakildi && cevap !== undefined && (
        <span className={`text-[15px] font-bold ${cevap === dogru ? 'text-ada-vurgu' : 'text-ada-mercan'}`} role="status">
          {cevap === dogru ? `Doğru! ${soru.sonrasi ?? ''}` : soru.yonlendirme ?? 'Bir daha dene.'}
        </span>
      )}
    </div>
  );
}

/** Tahmin et: çalıştırmadan önce sonucu yaz (sayı); görev bitince kilitlenir */
function TahminSatiri({ metin, birim, deger, kilitli, onDegis }: { metin: string; birim: string; deger?: number; kilitli: boolean; onDegis: (n: number | undefined) => void }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[12px] bg-[#5d66a6]/10 px-3 py-2" data-tahmin>
      <SIMGE.soru className="h-5 w-5 shrink-0 text-[#5d66a6]" />
      <span className="text-[15px] font-bold text-foreground">{metin}</span>
      <input
        type="text"
        inputMode="numeric"
        value={deger ?? ''}
        disabled={kilitli}
        onChange={(e) => {
          const t = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
          onDegis(t === '' ? undefined : Number(t));
        }}
        className="h-10 w-24 rounded-[10px] border-2 border-border bg-background px-2 text-center text-[17px] font-extrabold tabular-nums outline-none focus:border-primary disabled:opacity-70"
        aria-label={metin}
        data-tahmin-girisi
      />
      <span className="text-[14px] font-bold text-muted-foreground">{birim}</span>
      {!kilitli && <span className="text-[13px] font-semibold text-muted-foreground">{deger === undefined ? 'Tahminini yaz, sonra Çalıştır.' : 'Şimdi Çalıştır ve gör.'}</span>}
    </div>
  );
}

function UniteSonu({ unite, onKapat, siradaki, onSiradaki }: { unite: Unite; onKapat: () => void; siradaki?: Unite; onSiradaki?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const kart = kalipBul(unite.kalip);
  useEffect(() => {
    ref.current?.focus();
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onKapat();
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [onKapat]);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-ada-murekkep/30 p-4 backdrop-blur-[1px]" onClick={onKapat}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Ünite tamamlandı" onClick={(e) => e.stopPropagation()} className="flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[22px] border border-border bg-card shadow-2xl outline-none" data-unite-sonu>
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <h2 className="font-baslik text-[22px] font-semibold">{unite.ad}: tamam!</h2>
          <button type="button" onClick={onKapat} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-muted" aria-label="Kapat">
            <SIMGE.kapat className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 overflow-auto p-5">
          <p className="mb-4 text-[16px] font-semibold text-foreground">Kodunu yazdın, yeni kurgularda düzelttin, hatayı buldun. Yeni bir kalıp öğrendin:</p>
          {kart && <KalipKarti kart={kart} yeni />}
          {siradaki && onSiradaki && (
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={onSiradaki} className={`${DUGME} bg-primary text-primary-foreground hover:bg-primary/90`} data-sonraki-unite>
                Sonraki ünite: {siradaki.ad} <SIMGE.ok className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
