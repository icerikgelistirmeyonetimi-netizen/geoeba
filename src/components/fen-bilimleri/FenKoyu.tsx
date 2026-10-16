'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Atom, Bone, Bug, ChevronDown, Dna, Fish, FlaskConical, Info, Leaf, Magnet, Minus, Moon, Orbit, Plus, RotateCcw, Shell, Skull, Sparkles, Sun, Sunset, Waves, X } from 'lucide-react';
import type { FenSahnesi } from './fenSahnesi';
import { FEN_FOSILLERI, FEN_FOSIL_NOTU, FEN_PROGRAM_KAYNAGI, FEN_PROGRAM_NOTU, fenFosili, fenYapisi, type FenKimligi, type FosilTuru } from './fenVerisi';
import s from './fen.module.css';
import { ilkAcilisAnimasyonuAl } from '@/components/layout/logoAnimasyonu';

const varlikOneki = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? '';
// Statik dışa aktarımda bileşen sunucuda da çizilir; layout effect yalnız tarayıcıda kullanılır
const useTarayiciLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
const simgeler = { grade_3: Leaf, grade_4: Magnet, grade_5: Orbit, grade_6: Orbit, grade_7: Atom, grade_8: Dna, lab: FlaskConical };
const fosilSimgeleri: Record<FosilTuru, typeof Skull> = { dinozor: Skull, plesiosaur: Bone, amonit: Shell, balik: Fish, trilobit: Bug };
type Yukleme = 'yukleniyor' | 'hazir' | 'hata';
interface FosilSecimi { id: string; tur: FosilTuru }

export default function FenKoyu() {
  const kapsayici = useRef<HTMLDivElement>(null);
  const motor = useRef<FenSahnesi | null>(null);
  const sonSecim = useRef<FenKimligi | null>(null);
  const resetDugmesi = useRef<HTMLButtonElement>(null);
  const gokDugmesi = useRef<HTMLButtonElement>(null);
  const sonSaat = useRef(10.5);
  const [secili, setSecili] = useState<FenKimligi | null>(null);
  // Uçurumdaki seçili fosil (kök adı ve türü) ve sahnenin sunduğu fosil listesi
  const [seciliFosil, setSeciliFosil] = useState<FosilSecimi | null>(null);
  const [fosiller, setFosiller] = useState<FosilSecimi[]>([]);
  const [durum, setDurum] = useState<Yukleme>('yukleniyor');
  const [ilerleme, setIlerleme] = useState(0.04);
  // Yükleyici sahne hazır olunca süzülerek kapanır, kısa süre sonra DOM'dan kalkar (AdaEkrani ile aynı)
  const [yukleyiciVar, setYukleyiciVar] = useState(true);
  // Köy hazır olunca EBA logosunun açılış animasyonu bir kez oynar (uygulama başına tek sefer)
  const [logoCanli, setLogoCanli] = useState(false);
  useEffect(() => {
    if (durum !== 'yukleniyor' && ilkAcilisAnimasyonuAl()) setLogoCanli(true);
  }, [durum]);
  const [deneme, setDeneme] = useState(0);
  const [notlar, setNotlar] = useState(false);
  const [gokAcik, setGokAcik] = useState(false);
  const [saat, setSaat] = useState(10.5);
  const yapi = secili ? fenYapisi(secili) : null;
  const saatMetni = `${String(Math.floor(saat)).padStart(2, '0')}.${String(Math.round((saat % 1) * 60)).padStart(2, '0')}`;
  const gece = saat < 6 || saat >= 19;
  const gununAdi = gece ? 'Gece' : saat >= 17 || saat < 8 ? 'Alacakaranlık' : 'Gündüz';
  const GokSimgesi = gece ? Moon : saat >= 17 || saat < 8 ? Sunset : Sun;

  const saatiDegistir = (deger: number) => {
    sonSaat.current = deger;
    setSaat(deger);
    motor.current?.saatiAyarla(deger);
  };

  const sec = useCallback((id: FenKimligi | null) => {
    sonSecim.current = id;
    setSecili(id);
    setSeciliFosil(null);
    setNotlar(false);
    setGokAcik(false);
    motor.current?.sec(id);
  }, []);

  const fosilSec = useCallback((id: string | null, tur: FosilTuru | null) => {
    sonSecim.current = null;
    setSecili(null);
    setSeciliFosil(id && tur ? { id, tur } : null);
    setNotlar(false);
    setGokAcik(false);
    motor.current?.fosilSec(id);
  }, []);

  // Köy tam ekrandır; uygulama başlığı bu sürede gizlenir (globals.css, AdaEkrani ile aynı yöntem).
  // Layout effect, özniteliğin ekran değişimiyle aynı karede eklenip kaldırılmasını sağlar.
  useTarayiciLayoutEffect(() => {
    document.body.dataset.fenEkrani = '1';
    return () => {
      delete document.body.dataset.fenEkrani;
    };
  }, []);

  useEffect(() => {
    let iptal = false;
    let sahne: FenSahnesi | null = null;
    let yukleyiciSuresi: ReturnType<typeof setTimeout> | undefined;
    setDurum('yukleniyor');
    setIlerleme(0.04);
    setYukleyiciVar(true);
    setSeciliFosil(null);
    setFosiller([]);
    const baslat = async () => {
      try {
        const { FenSahnesi: Motor } = await import('./fenSahnesi');
        if (iptal || !kapsayici.current) return;
        sahne = new Motor(kapsayici.current, {
          varlikOneki,
          sec,
          fosilSec,
          yuklendi: () => {
            if (iptal) return;
            setIlerleme(1);
            setDurum('hazir');
            setFosiller(sahne?.fosilListesi() ?? []);
            yukleyiciSuresi = setTimeout(() => { if (!iptal) setYukleyiciVar(false); }, 900);
          },
          ilerleme: (oran) => { if (!iptal) setIlerleme(Math.max(0.04, oran)); },
          hata: () => {
            if (!iptal) {
              setDurum('hata');
              setYukleyiciVar(false);
              sahne?.dispose();
              motor.current = null;
            }
          },
        });
        motor.current = sahne;
        sahne.saatiAyarla(sonSaat.current);
        if (sonSecim.current) sahne.sec(sonSecim.current);
      } catch {
        if (!iptal) {
          setDurum('hata');
          setYukleyiciVar(false);
        }
      }
    };
    void baslat();
    return () => { iptal = true; clearTimeout(yukleyiciSuresi); sahne?.dispose(); motor.current = null; };
  }, [deneme, sec, fosilSec]);

  useEffect(() => {
    const tus = (olay: KeyboardEvent) => {
      if (olay.key === 'Escape') {
        if (gokAcik) { setGokAcik(false); gokDugmesi.current?.focus(); return; }
        if (notlar) setNotlar(false);
        else sec(null);
        resetDugmesi.current?.focus();
      }
    };
    window.addEventListener('keydown', tus);
    return () => window.removeEventListener('keydown', tus);
  }, [notlar, gokAcik, sec]);

  return (
    <div className={`${s.kok} ${durum !== 'yukleniyor' ? s.hazir : ''} ${secili || seciliFosil ? s.odakta : ''} ${gece ? s.gece : ''} ${durum === 'hata' ? s.hatali : ''}`}>
      <div className={s.poster} style={{ backgroundImage: `url("${varlikOneki}/fen-bilimleri/fen-kesif-koyu.png")` }} aria-hidden="true" />
      <div ref={kapsayici} className={`${s.sahne} ${durum === 'hazir' ? s.sahneHazir : ''}`} />
      <div className={s.ustGolge} aria-hidden="true" />

      <header className={s.baslikAlani}>
        <div className={s.markaSatiri}>
          <Link href="/" className={s.marka} aria-label="Matematik Takımadaları ana sayfası">
            <img
              className={s.markaLogo}
              src={`${varlikOneki}/images/eba/eba-logo-karakter-yatay-koyu-zemin${logoCanli ? '-animasyon-tek' : ''}.svg`}
              alt="EBA"
              width={820}
              height={220}
              draggable={false}
            />
          </Link>
          <span className={s.markaAyirac} />
          <span className={s.ustEtiket}>FEN BİLİMLERİ</span>
        </div>
        <h1 className={s.baslik}>Fen Keşif<br />Köyü<span className={s.baslikNoktasi}>.</span></h1>
        <p className={s.altBaslik}>Merakla başla. Keşfederek öğren.</p>
        <p className={s.kapsam}>İlkokul 3–4 <span>·</span> Ortaokul 5–8</p>
      </header>

      <div className={s.gokKontrol}>
        <button
          ref={gokDugmesi}
          className={`${s.gokDugmesi} ${gokAcik ? s.gokDugmesiAcik : ''}`}
          aria-label={`Günün saatini değiştir. ${saatMetni}, ${gununAdi}`}
          aria-expanded={gokAcik}
          aria-controls="fen-gok-paneli"
          disabled={durum !== 'hazir'}
          onClick={() => { setGokAcik((acik) => !acik); setNotlar(false); }}
          title="Güneş ve ay · Günün saatini değiştir"
        >
          <GokSimgesi size={18} strokeWidth={1.5} />
          <span>{saatMetni}<small>{gununAdi}</small></span>
          <ChevronDown size={13} className={s.gokOk} />
        </button>
        {gokAcik && (
          <section id="fen-gok-paneli" className={s.gokPaneli} aria-labelledby="fen-gok-basligi">
            <div className={s.gokPanelUst}>
              <div><h2 id="fen-gok-basligi">Günün ritmi</h2><p>Işığın köyü değiştirmesini izle.</p></div>
              <button className={s.kapat} onClick={() => { setGokAcik(false); gokDugmesi.current?.focus(); }} aria-label="Günün saati ayarını kapat"><X size={17} /></button>
            </div>
            <label className={s.saatEtiketi} htmlFor="fen-saat"><span>Günün saati</span><output>{saatMetni}</output></label>
            <input id="fen-saat" className={s.saatSurgu} type="range" min="0" max="23.75" step="0.25" value={saat} aria-valuetext={`${saatMetni}, ${gununAdi}`} onChange={(olay) => saatiDegistir(Number(olay.currentTarget.value))} />
            <div className={s.saatIsaretleri} aria-hidden="true"><span>00.00</span><span>12.00</span><span>24.00</span></div>
            <div className={s.gunSecenekleri}>
              <button aria-pressed={saat === 10.5} onClick={() => saatiDegistir(10.5)}><Sun size={17} /><span>Gündüz</span></button>
              <button aria-pressed={saat === 18} onClick={() => saatiDegistir(18)}><Sunset size={17} /><span>Akşam</span></button>
              <button aria-pressed={saat === 22} onClick={() => saatiDegistir(22)}><Moon size={17} /><span>Gece</span></button>
            </div>
          </section>
        )}
      </div>

      <button className={`${s.bilgiDugmesi} ${notlar ? s.bilgiAcik : ''}`} aria-label="Tasarım notları" aria-expanded={notlar} onClick={() => { setNotlar((acik) => !acik); setGokAcik(false); }} title="Tasarım notları">
        {notlar ? <X size={19} /> : <Info size={19} />}
      </button>

      {yukleyiciVar && (
        <div className={`${s.yukleyici} ${durum === 'hazir' ? s.yukleyiciKapan : ''}`} role="status">
          <div className={s.yukleyiciIc}>
            <span className={s.yukleyiciIkon}>
              <img src={`${varlikOneki}/images/eba/eba-karakter-animasyon.svg`} alt="" width={220} height={220} draggable={false} />
            </span>
            <p className={s.yukleyiciBaslik}>Fen Keşif Köyü</p>
            <p className={s.yukleyiciDurum}>Köy hazırlanıyor…</p>
            <div className={s.ilerleme} aria-hidden="true">
              <span className={s.ilerlemeDolgu} style={{ transform: `scaleX(${ilerleme.toFixed(3)})` }} />
            </div>
          </div>
        </div>
      )}

      {durum === 'hata' && (
        <div className={s.hataKart} role="status">
          <p>Şu anda köyün görselini inceliyorsun.</p>
          <span>Üç boyutlu görünüm açılamadı. Yeniden yükleyerek tekrar deneyebilirsin.</span>
          <button onClick={() => setDeneme((sayi) => sayi + 1)}><RotateCcw size={14} /> Yeniden dene</button>
        </div>
      )}

      {yapi && !notlar && (
        <aside className={s.panel} aria-labelledby="fen-yapi-basligi" key={yapi.id}>
          <div className={s.panelUst}>
            <span className={s.panelEtiket}>{yapi.kademe}{yapi.sinif ? ` · ${yapi.sinif}. sınıf` : ''}</span>
            <button className={s.kapat} onClick={() => sec(null)} aria-label="Köyün tamamına dön"><X size={20} /></button>
          </div>
          <div className={s.panelIcerik}>
            <span className={s.panelSimge} style={{ backgroundColor: `${yapi.renk}30`, color: yapi.renk }}>
              {(() => { const Simge = simgeler[yapi.id]; return <Simge size={28} strokeWidth={1.35} />; })()}
            </span>
            <h2 id="fen-yapi-basligi">{yapi.ad}</h2>
            <p className={s.panelAciklama}>{yapi.aciklama}</p>
            <img
              className={s.detayResmi}
              src={`${varlikOneki}/fen-bilimleri/detay-${yapi.sinif ?? 'lab'}.png`}
              alt={`${yapi.ad} mimari görünümü`}
              onError={(olay) => { olay.currentTarget.style.display = 'none'; }}
            />
            <h3>{yapi.sinif ? 'Neler keşfedeceğiz?' : 'Laboratuvardaki istasyonlar'}</h3>
            <div className={s.temalar}>{yapi.temalar.map((tema) => <span key={tema}>{tema}</span>)}</div>
            <h3>Yapının izleri</h3>
            <ul className={s.mimari}>{yapi.mimari.map((iz) => <li key={iz}><span />{iz}</li>)}</ul>
            <div className={s.kazanimBag}>
              <span>ÖĞRENMEYLE BAĞI</span>
              <p>{yapi.bag}</p>
            </div>
            {yapi.id === 'lab' && <p className={s.tasarimAciklamasi}>İstasyonlar laboratuvarın mimari tasarımını gösteriyor.</p>}
            <a className={s.kaynak} href={yapi.kaynak} target="_blank" rel="noreferrer">{yapi.program}<ArrowUpRight size={15} /></a>
          </div>
          <button className={s.koyeDon} onClick={() => sec(null)}><ArrowLeft size={15} /> Köyün tamamını gör</button>
        </aside>
      )}

      {seciliFosil && !notlar && (() => {
        const fosil = fenFosili(seciliFosil.tur);
        const Simge = fosilSimgeleri[fosil.tur];
        return (
          <aside className={`${s.panel} ${s.fosilPaneli}`} aria-labelledby="fen-fosil-basligi" key={seciliFosil.id}>
            <div className={s.panelUst}>
              <span className={s.panelEtiket}>{fosil.etiket}</span>
              <button className={s.kapat} onClick={() => sec(null)} aria-label="Köyün tamamına dön"><X size={20} /></button>
            </div>
            <div className={s.panelIcerik}>
              <span className={s.panelSimge} style={{ backgroundColor: '#b9a27a30', color: '#8a6d3b' }}><Simge size={28} strokeWidth={1.35} /></span>
              <h2 id="fen-fosil-basligi">{fosil.ad}</h2>
              <p className={s.fosilDonem}>{fosil.donem}</p>
              <p className={s.panelAciklama}>{fosil.aciklama}</p>
              <h3>Neler görüyoruz?</h3>
              <ul className={s.mimari}>{fosil.ipuclari.map((ipucu) => <li key={ipucu}><span />{ipucu}</li>)}</ul>
              <h3>Katmanın hikâyesi</h3>
              <p className={s.notMetni}>{fosil.katman}</p>
              <div className={s.kazanimBag}>
                <span>ÖĞRENMEYLE BAĞI</span>
                <p>{fosil.bag}</p>
              </div>
              <h3>Diğer fosiller</h3>
              <div className={s.fosilSecenekleri}>
                {FEN_FOSILLERI.map((aday) => {
                  const ornek = fosiller.find((kayit) => kayit.tur === aday.tur);
                  const Ikon = fosilSimgeleri[aday.tur];
                  return (
                    <button key={aday.tur} type="button" aria-pressed={aday.tur === fosil.tur} disabled={!ornek} onClick={() => ornek && fosilSec(ornek.id, ornek.tur)}>
                      <Ikon size={14} strokeWidth={1.7} /><span>{aday.kisaAd}</span>
                    </button>
                  );
                })}
              </div>
              <p className={s.tasarimAciklamasi}>{FEN_FOSIL_NOTU}</p>
              <a className={s.kaynak} href={fosil.kaynak} target="_blank" rel="noreferrer">{fosil.program}<ArrowUpRight size={15} /></a>
            </div>
            <button className={s.koyeDon} onClick={() => sec(null)}><ArrowLeft size={15} /> Köyün tamamını gör</button>
          </aside>
        );
      })()}

      {notlar && (
        <aside className={`${s.panel} ${s.notlarPaneli}`} aria-labelledby="fen-notlar-basligi">
          <div className={s.panelUst}><span className={s.panelEtiket}>Tasarımın hikâyesi</span><button className={s.kapat} onClick={() => setNotlar(false)} aria-label="Tasarım notlarını kapat"><X size={20} /></button></div>
          <div className={s.panelIcerik}>
            <Sparkles className={s.notlarSimgesi} size={30} strokeWidth={1.2} />
            <h2 id="fen-notlar-basligi">Doğadan evrene,<br />gözlemden deneye.</h2>
            <p className={s.panelAciklama}>Altı sınıf, kendine özgü altı yapı ve herkesin buluştuğu bir laboratuvar. Bir yaprak, bir yörünge, bir sarmal… Her mimari işaret, fen bilimlerinin başka bir dünyasına açılıyor.</p>
            <h3>Bir kanyon, ortak bir merak</h3>
            <p className={s.notMetni}>Ormanlık bir kanyonun iki yamacında ilkokul ve ortaokul yapıları; ayrı bir kaya terasında ortak laboratuvar. Köprüler ve doğa patikaları, bütün keşif alanlarını birbirine bağlıyor.</p>
            <h3>Günün değişen ışığı</h3>
            <p className={s.notMetni}>Güneş ve ay düğmesinden günün saatini seçebilirsin. Işık, gölgeler ve gökyüzü birlikte değişir; gece camlar ve yol fenerleri aydınlanır. Bulutlar ile vadinin ince sisi, bu dünyanın sakin ritmini tamamlar.</p>
            <h3>Programla bağlantısı</h3>
            <p className={s.notMetni}>{FEN_PROGRAM_NOTU}</p>
            <a className={s.kaynak} href={FEN_PROGRAM_KAYNAGI} target="_blank" rel="noreferrer">MEB uygulama takvimi <ArrowUpRight size={15} /></a>
            <h3>Katmanlar, fosiller ve canlılar</h3>
            <p className={s.notMetni}>Köyün oturduğu kaya kütlesi, kenarlarından görünen jeolojik katmanlarla aşağı iner. Katmanların içinde dinozor ve deniz canlısı fosilleri saklı; dokunduğunda hikâyesi açılır (klavyede F tuşu fosilleri sırayla gezer). Kartallar kanyonun üstünde süzülür, dağ keçileri kaya basamaklarında sıçrar.</p>
            <h3>Bir bilim köyünün mimarisi</h3>
            <p className={s.notMetni}>Gezegen halkaları, atom ve DNA biçimleri mimari esin kaynaklarıdır. Boyutlar ve aralıklar, gerçek dünyaya ölçekli bilim modellerini temsil etmez.</p>
          </div>
        </aside>
      )}

      {!secili && !seciliFosil && !notlar && durum === 'hazir' && <div className={s.ipucu}><span /> Bir yapıya ya da uçurumdaki bir fosile dokun.</div>}

      <div className={s.kontroller} aria-label="Görünüm kontrolleri">
        <button aria-label="Şelaleleri sırayla göster" title="Şelaleleri sırayla keşfet" disabled={durum !== 'hazir'} onClick={() => { sec(null); motor.current?.selaleyiGoster(); }}><Waves size={18} /></button>
        <span />
        <button aria-label="Yakınlaştır" title="Yakınlaştır" disabled={durum !== 'hazir'} onClick={() => motor.current?.yakinlas(1)}><Plus size={18} /></button>
        <button aria-label="Uzaklaştır" title="Uzaklaştır" disabled={durum !== 'hazir'} onClick={() => motor.current?.yakinlas(-1)}><Minus size={18} /></button>
        <span />
        <button ref={resetDugmesi} aria-label="Köyün tamamını göster" title="Köyün tamamı · Esc" onClick={() => { sec(null); setNotlar(false); }}><RotateCcw size={18} /></button>
      </div>
      <div className={s.ekranOkuyucu} aria-live="polite" aria-atomic="true">
        {seciliFosil ? `${fenFosili(seciliFosil.tur).ad} fosili seçildi.` : yapi ? `${yapi.sinif ? `${yapi.sinif}. sınıf. ` : ''}${yapi.ad} seçildi.` : 'Fen Keşif Köyü, genel görünüm.'}
      </div>
    </div>
  );
}
