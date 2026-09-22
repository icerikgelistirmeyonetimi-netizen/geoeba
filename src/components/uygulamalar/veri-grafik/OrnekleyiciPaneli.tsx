'use client';

/**
 * Örnekleyici kartı (TinkerPlots "Sampler"): 1–3 aygıt (karıştırıcı, çark, sayı aralığı) sırayla bağlı;
 * her çekiliş SVG ile canlandırılır (toplar çalkalanır, seçilen top kutudan çıkar; çarkta ok döner),
 * sonuç çipi "Sonuçlar" şeridine düşer ve aynı anda tabloya satır eklenir. "Anında" ya da azaltılmış
 * hareket tercihinde animasyonsuz, kare kare (rAF) doldurulur. "Ölçüm" bölümü örnekleyiciyi 10 / 100 /
 * 1000 kez çalıştırıp her çalıştırmanın ölçüsünü "Ölçümler" veri kümesine toplar.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { mulberry32, rastgeleTohum, type Uretec } from './rastgele';
import {
  EN_COK_AYGIT,
  EN_COK_CEKILIS,
  EN_COK_DENEY_SATIRI,
  EN_COK_ETIKET,
  EN_COK_TOP,
  HIZ_ADLARI,
  HIZ_SURELERI,
  OLCULER,
  ON_AYARLAR,
  aralikSinirlari,
  aygitKategorileri,
  aygitSayisalMi,
  aygitSorunu,
  aygitTuruDegistir,
  aygitUyarisi,
  ayarSorunu,
  calismaBaslat,
  carkAcilari,
  carkOranlari,
  cekilisBaslangici,
  degiskenAdlari,
  olcuAdi,
  olcuTanimi,
  olcumAyariDuzelt,
  olcumKaynaklari,
  satirDegerleri,
  silinecekOlcumSayisi,
  silinecekSonucSayisi,
  tekCekilis,
  tekrarOlcusu,
  toplamKullanilabilir,
  topListesi,
  yeniAygit,
  type Aygit,
  type AygitTuru,
  type CalismaDurumu,
  type Cekilis,
  type Hiz,
  type OlcuTuru,
  type OrnekleyiciAyari,
} from './ornekleyici';
import { kategoriRengi, rengeGoreMetin } from './kategorik';
import { dagitikKonum, kutupNoktasi, dilimYolu, topDizilimi } from './grafik';
import { sayiOku, sayiYaz, type VeriTablosu } from './veri';
import { DUGME, DUGME_BIRINCIL, ONAY_KUTUSU, SECIM, radyoTusu, useAcilirMenu } from './ortak';

export interface OrnekleyiciProps {
  ayar: OrnekleyiciAyari;
  onAyar: (ayar: OrnekleyiciAyari) => void;
  deneyTablosu: VeriTablosu | null;
  olcumTablosu: VeriTablosu | null;
  /** Yeni çekiliş satırları (Çekiliş numarası hariç değerler); ilk = çalıştırmanın ilk parçası (küme geçişi yalnız o an) */
  onDeneySatirlari: (satirlar: string[][], ayar: OrnekleyiciAyari, ilk: boolean) => void;
  onDeneyTemizle: () => void;
  /** Yeni ölçüm değerleri; ayar = toplamanın başındaki örnekleyici (ölçüm tablosunun aygıt imzası ondan çıkar) */
  onOlcumler: (ayar: OrnekleyiciAyari, ad: string, degerler: (number | null)[], ilk: boolean) => void;
  /** Veri hızlı akıyor mu (Anında çalıştırma / ölçüm toplama): grafik geçişleri kapatılır */
  onAkis?: (akis: boolean) => void;
  onOlcumTemizle: () => void;
  onKapat: () => void;
  azaltilmisHareket: boolean;
}

const TURLER: { id: AygitTuru; ad: string }[] = [
  { id: 'karistirici', ad: 'Karıştırıcı' },
  { id: 'cark', ad: 'Çark' },
  { id: 'aralik', ad: 'Sayı aralığı' },
];

const KUCUK_DUGME =
  'inline-flex h-11 min-w-[44px] items-center justify-center rounded-[calc(var(--radius)-8px)] border border-border bg-card px-2 text-[13px] font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';

const GIRDI =
  'h-11 min-w-0 rounded-[calc(var(--radius)-8px)] border border-border bg-background px-2 text-[13px] font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Kenarlıksız ikincil düğme (birincil işlemin yanında sessiz durur) */
const DUGME_SADE =
  'inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-[calc(var(--radius)-6px)] px-3 text-[13px] font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';

const ANIMASYON_CSS = `
@keyframes vg-calkala{0%{transform:translate(0,0)}25%{transform:translate(1.8px,-1.4px)}50%{transform:translate(-1.6px,1.1px)}75%{transform:translate(1.2px,1.6px)}100%{transform:translate(0,0)}}
@keyframes vg-cip-gir{from{transform:translateX(-14px) scale(.6);opacity:0}to{transform:none;opacity:1}}
`;

/** Üst şerit düğmesi için karıştırıcı kutusu simgesi */
export function KaristiriciSimgesi({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 4h16v12.5a2 2 0 0 1-2 2h-3.5L12 21l-2.5-2.5H6a2 2 0 0 1-2-2V4z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="8.5" cy="13.5" r="2" fill="currentColor" />
      <circle cx="13" cy="14" r="2" fill="currentColor" opacity="0.7" />
      <circle cx="11" cy="9.5" r="2" fill="currentColor" opacity="0.45" />
      <circle cx="15.8" cy="10" r="1.6" fill="currentColor" />
    </svg>
  );
}

// ── Küçük sayı girdisi (ondalık virgül; yazarken taslak korunur) ─────────────

function SayiGirdisi({
  deger,
  onDeger,
  etiket,
  min,
  max,
  tamSayi = true,
  className = 'w-16',
  disabled,
}: {
  deger: number;
  onDeger: (v: number) => void;
  etiket: string;
  min: number;
  max: number;
  tamSayi?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const [taslak, setTaslak] = useState<string | null>(null);
  const goster = taslak ?? sayiYaz(deger, 2);
  return (
    <input
      type="text"
      inputMode={tamSayi ? 'numeric' : 'decimal'}
      aria-label={etiket}
      className={`${GIRDI} ${className} text-right tabular-nums`}
      value={goster}
      disabled={disabled}
      onChange={(e) => {
        setTaslak(e.target.value);
        const v = sayiOku(e.target.value);
        if (v !== null) onDeger(Math.min(max, Math.max(min, tamSayi ? Math.round(v) : v)));
      }}
      onBlur={() => setTaslak(null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault();
          setTaslak(null);
          onDeger(Math.min(max, Math.max(min, deger + (e.key === 'ArrowUp' ? 1 : -1))));
        }
      }}
    />
  );
}

// ── Aygıt görselleri ─────────────────────────────────────────────────────────
// Kart 182 px (kenarlık + dolgu 14 px); SVG 168 px genişlikte çizilir ve viewBox da 168 birim: 1 birim = 1 px, yazılar 13 px.

const GW = 168;
const GH = 136;
/** Kutunun top alanı (sol-üst köşe ve boyut) */
const TOP_ALANI = { x: 12, y: 10, g: 144, y2: 86 };
/** Kutunun çıkış ağzının altında topun durduğu yer */
const CIKIS = { x: 84, y: 121 };
const YAZI = 13;

/** Top yarıçapına göre etikette gösterilecek en çok harf (13 px yazı topa sığsın) */
function topEtiketHarfi(r: number): number {
  return r >= 17 ? 4 : r >= 12.5 ? 3 : r >= 9 ? 2 : 0;
}

interface GorselTop {
  etiket: string;
  renk: string;
  /** toplar dizisindeki indeks (seçim eşlemesi) */
  indeks: number;
}

interface AnimDurumu {
  no: number;
  cekilis: Cekilis;
  /** 0 = karıştır / dön, 1 = top çıkıyor, 2 = yerleşti (top sonuç şeridine kayar) */
  asama: 0 | 1 | 2;
}

interface KutuGorseliProps {
  toplar: GorselTop[];
  /** toplar çok fazlaysa kutuda yazı gösterilir */
  ozet?: string;
  anahtar: string;
  /** çıkmış (iadesiz) toplar */
  cikan: boolean[] | null;
  secilen: number | null;
  asama: 0 | 1 | 2 | null;
  calkala: boolean;
  sure: number;
  sonucEtiket: string | null;
  sonucRenk: string;
}

function KutuGorseli({ toplar, ozet, anahtar, cikan, secilen, asama, calkala, sure, sonucEtiket, sonucRenk }: KutuGorseliProps) {
  const yerlesim = useMemo(() => {
    const d = topDizilimi(toplar.length, TOP_ALANI.g, TOP_ALANI.y2, 20);
    // Toplar karışık görünsün: kararlı karma sırası; küçük titreşim (en çok 0,8) aradaki boşluğun (1,2) içinde kalır
    const sira = toplar.map((_, i) => i).sort((a, b) => dagitikKonum(`${anahtar}-${a}`).x - dagitikKonum(`${anahtar}-${b}`).x);
    const konum = new Map<number, { x: number; y: number }>();
    sira.forEach((topIndeksi, s) => {
      const p = d.konumlar[s];
      const j = dagitikKonum(`${anahtar}-j${s}`);
      konum.set(topIndeksi, { x: TOP_ALANI.x + p.x + (j.x - 0.5) * 1.6, y: TOP_ALANI.y + p.y + (j.y - 0.5) * 1.6 });
    });
    return { r: d.r, konum };
  }, [toplar, anahtar]);

  const harf = topEtiketHarfi(yerlesim.r);
  const secilenKonum = secilen !== null ? yerlesim.konum.get(secilen) ?? { x: 84, y: 52 } : null;
  const ucanR = Math.max(11, Math.min(14, yerlesim.r));
  const cikiyor = asama === 1;
  const yerlesti = asama === 2;
  const ucanX = asama === 0 ? secilenKonum?.x ?? CIKIS.x : CIKIS.x;
  // Yerleşince top aşağıya, "Sonuçlar" şeridine doğru kayıp kaybolur (şeritte çipi belirir)
  const ucanY = asama === 0 ? secilenKonum?.y ?? CIKIS.y : yerlesti ? GH + ucanR + 4 : CIKIS.y;
  const inisSuresi = Math.round(Math.max(160, sure * 0.3));

  return (
    <svg viewBox={`0 0 ${GW} ${GH}`} className="block h-auto w-full" aria-hidden="true" style={{ fontFamily: 'Manrope, sans-serif' }}>
      {/* Kutu ve çıkış ağzı */}
      <path
        d="M6 8 Q6 4 10 4 H158 Q162 4 162 8 V96 Q162 100 158 100 H96 L91 110 H77 L72 100 H10 Q6 100 6 96 Z"
        fill="hsl(var(--muted))"
        fillOpacity={0.5}
        stroke="hsl(var(--foreground))"
        strokeOpacity={0.55}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {ozet && (
        <text x={84} y={58} fontSize={20} fontWeight={800} textAnchor="middle" fill="hsl(var(--foreground))">
          {ozet}
        </text>
      )}
      {toplar.map((t, i) => {
        const k = yerlesim.konum.get(i);
        if (!k) return null;
        const disari = cikan?.[i] === true;
        // Seçilen top uçarken kutuda soluklaşır; iadeli çekilişte yerleşince kutuya geri döner
        const ucuyor = secilen === i && cikiyor;
        const opak = disari && !ucuyor ? 0.12 : ucuyor ? 0.18 : 1;
        return (
          <g key={i} transform={`translate(${k.x} ${k.y})`}>
            <g
              style={{
                animation: calkala && !disari ? `vg-calkala ${170 + (i % 5) * 23}ms ease-in-out ${(i % 7) * 17}ms infinite` : undefined,
                opacity: opak,
                transition: 'opacity 200ms',
              }}
            >
              <circle r={yerlesim.r} fill={t.renk} stroke="hsl(var(--card))" strokeWidth={1.2} strokeDasharray={disari ? '2 2' : undefined} />
              {harf > 0 && (
                <text
                  y={4.5}
                  fontSize={YAZI}
                  fontWeight={800}
                  textAnchor="middle"
                  fill={rengeGoreMetin(t.renk)}
                  // Top kenarından taşan harfler topun renginde bir kontur üstünde okunur kalır
                  style={{ paintOrder: 'stroke', stroke: t.renk, strokeWidth: 3, strokeLinejoin: 'round' }}
                >
                  {t.etiket.slice(0, harf)}
                </text>
              )}
            </g>
          </g>
        );
      })}
      {/* Kutudan çıkan top */}
      {secilenKonum && asama !== null && sonucEtiket !== null && (
        <g
          data-ucan-top
          style={{
            transform: `translate(${ucanX}px, ${ucanY}px)`,
            transition: cikiyor
              ? `transform ${Math.round(sure * 0.36)}ms cubic-bezier(.35,.05,.35,1)`
              : yerlesti
                ? `transform ${inisSuresi}ms ease-in, opacity ${inisSuresi}ms ease-in`
                : 'none',
            opacity: asama === 0 || yerlesti ? 0 : 1,
          }}
        >
          <circle r={ucanR} fill={sonucRenk} stroke="hsl(var(--foreground))" strokeWidth={1.6} />
          <text y={4.5} fontSize={YAZI} fontWeight={800} textAnchor="middle" fill={rengeGoreMetin(sonucRenk)}>
            {sonucEtiket.slice(0, topEtiketHarfi(ucanR))}
          </text>
        </g>
      )}
    </svg>
  );
}

/** Etiketleri kısaltılan ya da gizlenen toplar için renk açıklaması */
function TopAciklamasi({ ogeler }: { ogeler: { etiket: string; renk: string; adet: number }[] }) {
  return (
    <div className="flex flex-wrap gap-x-2 gap-y-0.5 px-0.5 text-[13px] font-semibold leading-5" data-top-aciklamasi>
      {ogeler.map((o) => (
        <span key={o.etiket} className="inline-flex items-center gap-1">
          <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" aria-hidden="true">
            <circle cx="6" cy="6" r="5.5" fill={o.renk} />
          </svg>
          {o.etiket}
          {o.adet > 1 && <span className="text-muted-foreground">×{o.adet}</span>}
        </span>
      ))}
    </div>
  );
}

/** Kutudaki toplar etiketleri tam gösterebiliyor mu (değilse açıklama gerekir) */
function etiketlerTamMi(toplamTop: number, etiketler: string[]): boolean {
  const r = topDizilimi(toplamTop, TOP_ALANI.g, TOP_ALANI.y2, 20).r;
  const harf = topEtiketHarfi(r);
  return etiketler.every((e) => e.trim().length <= harf);
}

function CarkGorseli({
  dilimler,
  donme,
  sure,
  secilen,
  asama,
  onDonmeBitti,
}: {
  dilimler: { etiket: string; renk: string; baslangic: number; bitis: number }[];
  donme: number;
  sure: number;
  secilen: number | null;
  asama: 0 | 1 | 2 | null;
  /** Okun dönüşü (CSS geçişi) gerçekten bitti: sonuç ancak o zaman yazılır */
  onDonmeBitti?: () => void;
}) {
  const cx = 84;
  const cy = 67;
  const r = 62;
  const bitti = asama === 2;
  return (
    <svg viewBox={`0 0 ${GW} ${GH}`} className="block h-auto w-full" aria-hidden="true" style={{ fontFamily: 'Manrope, sans-serif' }}>
      {dilimler.map((d, i) => {
        const yol = dilimYolu(cx, cy, r, d.baslangic, d.bitis);
        if (!yol) return null;
        const vurgu = bitti && secilen === i;
        return (
          <path
            key={i}
            d={yol}
            fill={d.renk}
            fillOpacity={bitti && !vurgu ? 0.4 : 0.95}
            stroke={vurgu ? 'hsl(var(--foreground))' : 'hsl(var(--card))'}
            strokeWidth={vurgu ? 3 : 1.5}
          />
        );
      })}
      {dilimler.map((d, i) => {
        const aci = d.bitis - d.baslangic;
        if (aci < 28) return null;
        const p = kutupNoktasi(cx, cy, r * 0.64, (d.baslangic + d.bitis) / 2);
        return (
          <text key={`e${i}`} x={p.x} y={p.y + 4.5} fontSize={YAZI} fontWeight={800} textAnchor="middle" fill={rengeGoreMetin(d.renk)}>
            {d.etiket.slice(0, aci >= 90 ? 7 : aci >= 50 ? 5 : 3)}
          </text>
        );
      })}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--foreground))" strokeOpacity={0.55} strokeWidth={1.6} />
      {/* Ok */}
      <g
        data-cark-oku
        style={{
          transformOrigin: `${cx}px ${cy}px`,
          transform: `rotate(${donme}deg)`,
          transition: sure > 0 ? `transform ${Math.round(sure * 0.8)}ms cubic-bezier(.15,.8,.25,1)` : 'none',
        }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && e.propertyName === 'transform') onDonmeBitti?.();
        }}
      >
        <line x1={cx} y1={cy + 10} x2={cx} y2={cy - r + 12} stroke="hsl(var(--foreground))" strokeWidth={3.5} strokeLinecap="round" />
        <path d={`M${cx - 7} ${cy - r + 16} L${cx} ${cy - r + 2} L${cx + 7} ${cy - r + 16} Z`} fill="hsl(var(--foreground))" />
      </g>
      <circle cx={cx} cy={cy} r={6} fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth={2} />
    </svg>
  );
}

// ── Ana bileşen ──────────────────────────────────────────────────────────────

interface Cip {
  no: number;
  degerler: string[];
  toplam: number | null;
}

/** aria-live metni: "Çekiliş 12: Tura" */
function duyuruMetni(c: Cip, a: OrnekleyiciAyari): string {
  const ad = degiskenAdlari(a);
  const parca = a.aygitlar.length === 1 ? c.degerler[0] : c.degerler.map((d, i) => `${ad[i]} ${d}`).join(', ');
  return `Çekiliş ${c.no}: ${parca}${c.toplam !== null ? `, toplam ${sayiYaz(c.toplam)}` : ''}`;
}

interface CalismaRef {
  ayar: OrnekleyiciAyari;
  durum: CalismaDurumu;
  rnd: Uretec;
  n: number;
  yapilan: number;
  no: number;
  zamanlayicilar: number[];
  raf: number | null;
  /** ilk satır parçası gönderildi mi (küme geçişi yalnız ilk parçada) */
  ilkGitti: boolean;
}

interface OlcumRef {
  ayar: OrnekleyiciAyari;
  rnd: Uretec;
  ad: string;
  tekrar: number;
  yapilan: number;
  raf: number | null;
  ilkGitti: boolean;
}

interface Bilgi {
  metin: string;
  /** acil: role="alert" ile duyurulur (kutu boşaldı) */
  acil?: boolean;
}

/** Çark oku dönerken bekleyen sonuç yazımı */
interface DonmeBekleyen {
  kalan: number;
  bitti: () => void;
}

/** Aygıtlar elle değiştiği için eski tabloyu silme onayı: deney sonuçları (Çalıştır) ya da ölçümler (N kez) */
type SilmeOnayi = { tur: 'deney' } | { tur: 'olcum'; tekrar: number } | null;

/** Hazır deney değişince silinecekler: "10 deney sonucu ve 100 ölçüm" (ikisi de yoksa boş) */
export function silinecekMetni(sonuc: number, olcum: number): string {
  return [sonuc > 0 ? `${sonuc} deney sonucu` : '', olcum > 0 ? `${olcum} ölçüm` : ''].filter(Boolean).join(' ve ');
}

export function Ornekleyici({
  ayar,
  onAyar,
  deneyTablosu,
  olcumTablosu,
  onDeneySatirlari,
  onDeneyTemizle,
  onOlcumler,
  onOlcumTemizle,
  onKapat,
  onAkis,
  azaltilmisHareket,
}: OrnekleyiciProps) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [anim, setAnim] = useState<AnimDurumu | null>(null);
  const [cikan, setCikan] = useState<(boolean[] | null)[]>([]);
  const [donmeler, setDonmeler] = useState<number[]>([]);
  const [cipler, setCipler] = useState<Cip[]>([]);
  const [duyuru, setDuyuru] = useState('');
  const [bilgi, setBilgi] = useState<Bilgi | null>(null);
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null);
  const [silmeOnayi, setSilmeOnayi] = useState<SilmeOnayi>(null);
  /** Onay bekleyen hazır deney (eski sonuçlar silinecekse) */
  const [bekleyenHazir, setBekleyenHazir] = useState<string | null>(null);
  const hazirOnayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bekleyenHazir) hazirOnayRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, [bekleyenHazir]);
  const [olcumIlerleme, setOlcumIlerleme] = useState<{ yapilan: number; tekrar: number } | null>(null);
  const calismaRef = useRef<CalismaRef | null>(null);
  const olcumRef = useRef<OlcumRef | null>(null);
  const donmeRef = useRef<DonmeBekleyen | null>(null);
  const hizRef = useRef<Hiz>(ayar.hiz);
  hizRef.current = ayar.hiz;
  const azaltRef = useRef(azaltilmisHareket);
  azaltRef.current = azaltilmisHareket;
  const menu = useAcilirMenu();
  const onayRef = useRef<HTMLDivElement>(null);

  const adlar = degiskenAdlari(ayar);
  const sorun = ayarSorunu(ayar);
  const uyarilar = ayar.aygitlar.map((a) => aygitUyarisi(a, ayar.cekilisSayisi)).filter((u): u is string => u !== null);
  const sonNo = cekilisBaslangici(deneyTablosu, ayar);
  const silinecek = silinecekSonucSayisi(deneyTablosu, ayar);
  const silinecekOlcum = silinecekOlcumSayisi(olcumTablosu, ayar);
  const olcumSayisi = olcumTablosu?.satirlar.length ?? 0;
  const mevcutSatir = silinecek > 0 ? 0 : deneyTablosu?.satirlar.length ?? 0;
  const dolu = mevcutSatir >= EN_COK_DENEY_SATIRI;
  const mesgul = calisiyor || olcumIlerleme !== null;
  const hizSure = HIZ_SURELERI[ayar.hiz];
  const anindaCalisir = ayar.hiz === 3 || azaltilmisHareket;

  useEffect(() => {
    if (!bilgi) return;
    const t = window.setTimeout(() => setBilgi(null), bilgi.acil ? 7000 : 4500);
    return () => window.clearTimeout(t);
  }, [bilgi]);

  // Silme onayı belirince görünür olsun (örnekleyici alanı kayıyorsa) ve odak "Silip çalıştır"a geçsin
  useEffect(() => {
    if (!silmeOnayi) return;
    onayRef.current?.scrollIntoView({ block: 'nearest' });
    onayRef.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [silmeOnayi]);

  // Aygıtlar yeniden uyumlu olursa (ya da sonuçlar / ölçümler temizlenirse) silme onayı düşer
  useEffect(() => {
    setSilmeOnayi((o) => (o && ((o.tur === 'deney' && silinecek === 0) || (o.tur === 'olcum' && silinecekOlcum === 0)) ? null : o));
  }, [silinecek, silinecekOlcum]);

  // Veri hızlı akarken (Anında çalıştırma, ölçüm toplama) grafik geçişleri kapansın
  const akis = olcumIlerleme !== null || (calisiyor && anindaCalisir);
  useEffect(() => {
    onAkis?.(akis);
  }, [akis, onAkis]);
  useEffect(() => () => onAkis?.(false), [onAkis]);

  const calismayiTemizle = useCallback(() => {
    const c = calismaRef.current;
    if (c) {
      c.zamanlayicilar.forEach((z) => window.clearTimeout(z));
      if (c.raf !== null) window.cancelAnimationFrame(c.raf);
    }
    calismaRef.current = null;
    donmeRef.current = null;
  }, []);

  const olcumuTemizle = useCallback(() => {
    const o = olcumRef.current;
    if (o?.raf != null) window.cancelAnimationFrame(o.raf);
    olcumRef.current = null;
  }, []);

  // Söküldüğünde zamanlayıcılar dursun
  useEffect(
    () => () => {
      calismayiTemizle();
      olcumuTemizle();
    },
    [calismayiTemizle, olcumuTemizle],
  );

  const bitir = useCallback(
    (mesaj?: string, acil = false) => {
      calismayiTemizle();
      setCalisiyor(false);
      if (mesaj) setBilgi({ metin: mesaj, acil });
      if (mesaj && !acil) setDuyuru(mesaj);
    },
    [calismayiTemizle],
  );

  const satirGonder = useCallback(
    (c: CalismaRef, satirlar: string[][]) => {
      onDeneySatirlari(satirlar, c.ayar, !c.ilkGitti);
      c.ilkGitti = true;
    },
    [onDeneySatirlari],
  );

  /** Anında / azaltılmış hareket: kare başına birkaç çekiliş, tabloya parça parça */
  const anindaDongu = useCallback(() => {
    const c = calismaRef.current;
    if (!c) return;
    const parca = Math.max(4, Math.ceil(c.n / 14));
    const satirlar: string[][] = [];
    const yeniCipler: Cip[] = [];
    let durdu = false;
    for (let i = 0; i < parca && c.yapilan < c.n; i++) {
      const ck = tekCekilis(c.ayar, c.durum, c.rnd);
      if (!ck) {
        durdu = true;
        break;
      }
      c.yapilan++;
      c.no++;
      satirlar.push(satirDegerleri(c.ayar, ck));
      yeniCipler.push({ no: c.no, degerler: ck.degerler, toplam: ck.toplam });
    }
    if (satirlar.length > 0) {
      satirGonder(c, satirlar);
      const ters = [...yeniCipler].reverse();
      setCipler((o) => [...ters, ...o].slice(0, 24));
      setCikan(c.durum.cikan.map((x) => (x ? [...x] : null)));
      setDuyuru(duyuruMetni(ters[0], c.ayar));
    }
    if (durdu) return bitir(`Kutu boşaldı: iadesiz çekilişte başka top kalmadı (${c.yapilan} çekiliş yapıldı).`, true);
    if (c.yapilan >= c.n) return bitir(`${c.yapilan} çekiliş tamamlandı`);
    c.raf = window.requestAnimationFrame(anindaDongu);
  }, [bitir, satirGonder]);

  /** Canlandırmalı tek adım: karıştır / dön → top çıkar → (ok durunca) satır + çip → kısa bekleme → sonraki */
  const adim = useCallback(() => {
    const c = calismaRef.current;
    if (!c) return;
    if (hizRef.current === 3 || azaltRef.current) {
      setAnim(null);
      c.raf = window.requestAnimationFrame(anindaDongu);
      return;
    }
    const ck = tekCekilis(c.ayar, c.durum, c.rnd);
    if (!ck) return bitir(`Kutu boşaldı: iadesiz çekilişte başka top kalmadı (${c.yapilan} çekiliş yapıldı).`, true);
    const no = c.no + 1;
    const T = HIZ_SURELERI[hizRef.current];
    const carkSayisi = c.ayar.aygitlar.filter((a) => a.tur === 'cark').length;
    setAnim({ no, cekilis: ck, asama: 0 });
    // Çark okları: en az iki tur dönüp seçilen dilimde durur
    setDonmeler((onceki) =>
      c.ayar.aygitlar.map((a, i) => {
        const eski = onceki[i] ?? 0;
        if (a.tur !== 'cark') return eski;
        const aci = carkAcilari(a)[ck.secimler[i]];
        const hedef = aci.baslangic + ck.konumlar[i] * (aci.bitis - aci.baslangic);
        const fark = (((hedef - eski) % 360) + 360) % 360;
        return eski + 720 + fark;
      }),
    );
    const z1 = window.setTimeout(() => setAnim((a) => (a && a.no === no ? { ...a, asama: 1 } : a)), Math.round(T * 0.42));
    let yazildi = false;
    const sonucYaz = () => {
      const r = calismaRef.current;
      if (yazildi || !r || r !== c) return;
      yazildi = true;
      donmeRef.current = null;
      r.no = no;
      r.yapilan++;
      satirGonder(r, [satirDegerleri(r.ayar, ck)]);
      const cip: Cip = { no, degerler: ck.degerler, toplam: ck.toplam };
      setCipler((o) => [cip, ...o].slice(0, 24));
      setCikan(r.durum.cikan.map((x) => (x ? [...x] : null)));
      setDuyuru(duyuruMetni(cip, r.ayar));
      setAnim((a) => (a && a.no === no ? { ...a, asama: 2 } : a));
      // Sonuç (vurgulu dilim / şeride kayan top) okunabilsin diye kısa bekleme
      const bekle = carkSayisi > 0 ? Math.max(Math.round(T * 0.16), Math.min(380, Math.round(T * 0.5 + 150))) : Math.round(T * 0.16);
      const z3 = window.setTimeout(() => {
        const s = calismaRef.current;
        if (!s || s !== c) return;
        if (s.yapilan >= s.n) bitir(`${s.yapilan} çekiliş tamamlandı`);
        else adim();
      }, bekle);
      r.zamanlayicilar.push(z3);
    };
    let z2: number;
    if (carkSayisi > 0) {
      // Sonuç okun gerçekten durduğu an (transitionend) yazılır; zaman aşımı yalnız yedek
      donmeRef.current = { kalan: carkSayisi, bitti: sonucYaz };
      z2 = window.setTimeout(sonucYaz, Math.round(T * 0.8) + 900);
    } else {
      z2 = window.setTimeout(sonucYaz, Math.round(T * 0.84));
    }
    c.zamanlayicilar = [z1, z2];
  }, [anindaDongu, bitir, satirGonder]);

  const donmeBitti = useCallback(() => {
    const d = donmeRef.current;
    if (!d) return;
    d.kalan--;
    if (d.kalan <= 0) d.bitti();
  }, []);

  const calistir = (onayli = false) => {
    if (sorun || mesgul) return;
    if (silinecek > 0 && !onayli) {
      setSilmeOnayi({ tur: 'deney' });
      return;
    }
    if (dolu) {
      setBilgi({ metin: `Deney tablosu en çok ${EN_COK_DENEY_SATIRI} satır olabilir: önce sonuçları temizleyin.` });
      return;
    }
    calismayiTemizle();
    setSilmeOnayi(null);
    setDuzenlenen(null);
    const snap = ayar;
    const durum = calismaBaslat(snap.aygitlar);
    calismaRef.current = {
      ayar: snap,
      durum,
      rnd: mulberry32(rastgeleTohum()),
      n: Math.min(snap.cekilisSayisi, EN_COK_DENEY_SATIRI - mevcutSatir),
      yapilan: 0,
      no: silinecek > 0 ? 0 : sonNo,
      zamanlayicilar: [],
      raf: null,
      ilkGitti: false,
    };
    setCikan(durum.cikan.map((x) => (x ? [...x] : null)));
    setCipler([]);
    setBilgi(null);
    setCalisiyor(true);
    adim();
  };

  const durdur = () => {
    const yapilan = calismaRef.current?.yapilan ?? 0;
    bitir(`Durduruldu (${yapilan} çekiliş)`);
    setAnim(null);
  };

  const sonuclariTemizle = () => {
    if (calisiyor) durdur();
    onDeneyTemizle();
    setCipler([]);
    setAnim(null);
    setCikan([]);
    setSilmeOnayi(null);
    setDuyuru('Deney sonuçları temizlendi');
  };

  // ── Ölçüm topla ──
  const olcumAyari = olcumAyariDuzelt(ayar);
  const kaynaklar = olcumKaynaklari(ayar);
  const seciliKaynak = kaynaklar.find((k) => k.id === olcumAyari.kaynak);
  const olcuSecenekleri = OLCULER.filter((o) => seciliKaynak?.sayisal || o.kategorik);
  const olcumAdi = olcuAdi(ayar);

  const olcumDongu = useCallback(() => {
    const o = olcumRef.current;
    if (!o) return;
    const bas = performance.now();
    const parca = Math.max(1, Math.ceil(o.tekrar / 24));
    const degerler: (number | null)[] = [];
    while (degerler.length < parca && o.yapilan < o.tekrar && performance.now() - bas < 24) {
      degerler.push(tekrarOlcusu(o.ayar, o.rnd));
      o.yapilan++;
    }
    if (degerler.length > 0) {
      onOlcumler(o.ayar, o.ad, degerler, !o.ilkGitti);
      o.ilkGitti = true;
    }
    setOlcumIlerleme({ yapilan: o.yapilan, tekrar: o.tekrar });
    if (o.yapilan >= o.tekrar) {
      olcumRef.current = null;
      setOlcumIlerleme(null);
      setBilgi({ metin: `${o.tekrar} ölçüm toplandı: ${o.ad}` });
      setDuyuru(`${o.tekrar} ölçüm toplandı`);
      return;
    }
    o.raf = window.requestAnimationFrame(olcumDongu);
  }, [onOlcumler]);

  const olcumBaslat = (tekrar: number, onayli = false) => {
    if (sorun || mesgul) return;
    // Ölçümler başka aygıtlara aitse (ön ayar değişti) toplamadan önce sorulur; onaylanınca yeni tablo kurulur
    if (silinecekOlcum > 0 && !onayli) {
      setSilmeOnayi({ tur: 'olcum', tekrar });
      return;
    }
    setSilmeOnayi(null);
    setDuzenlenen(null);
    const snap: OrnekleyiciAyari = { ...ayar, olcum: olcumAyari };
    olcumRef.current = { ayar: snap, rnd: mulberry32(rastgeleTohum()), ad: olcuAdi(snap), tekrar, yapilan: 0, raf: null, ilkGitti: false };
    setOlcumIlerleme({ yapilan: 0, tekrar });
    setDuyuru(`${tekrar} ölçüm toplanıyor`);
    olcumRef.current.raf = window.requestAnimationFrame(olcumDongu);
  };

  const olcumDurdur = () => {
    const o = olcumRef.current;
    olcumuTemizle();
    setOlcumIlerleme(null);
    if (o) {
      setBilgi({ metin: `Ölçüm durduruldu (${o.yapilan} / ${o.tekrar})` });
      setDuyuru(`Ölçüm durduruldu (${o.yapilan} / ${o.tekrar})`);
    }
  };

  // ── Ayar düzenleme ──
  const aygitGuncelle = (id: string, yeni: Aygit) => onAyar({ ...ayar, aygitlar: ayar.aygitlar.map((a) => (a.id === id ? yeni : a)) });
  const aygitEkle = () => {
    if (ayar.aygitlar.length >= EN_COK_AYGIT) return;
    const son = ayar.aygitlar[ayar.aygitlar.length - 1];
    const a = yeniAygit(son?.tur === 'aralik' ? 'aralik' : 'karistirici', `Sonuç ${ayar.aygitlar.length + 1}`);
    onAyar({ ...ayar, aygitlar: [...ayar.aygitlar, a] });
    setDuzenlenen(a.id);
  };
  const aygitSil = (id: string) => {
    if (ayar.aygitlar.length <= 1) return;
    onAyar({ ...ayar, aygitlar: ayar.aygitlar.filter((a) => a.id !== id) });
    if (duzenlenen === id) setDuzenlenen(null);
  };
  /**
   * Hazır deney yeni bir deney başlatır: eski deneyin sonuçları ve ölçümleri silinir (başka deneyin verisi
   * ekranda kalmasın). Silinecek veri varsa önce tek bir onay istenir.
   */
  const onAyarUygula = (id: string, onayli = false) => {
    const o = ON_AYARLAR.find((x) => x.id === id);
    if (!o) return;
    menu.kapat(true);
    if (!onayli && silinecekMetni(deneyTablosu?.satirlar.length ?? 0, olcumSayisi) !== '') {
      setBekleyenHazir(id);
      return;
    }
    setBekleyenHazir(null);
    const yeni = o.olustur();
    onAyar({ ...yeni, hiz: ayar.hiz });
    // Tablo yeni aygıtların sütunlarıyla boş kurulur; eski ölçümler kalkar
    onDeneyTemizle();
    if (olcumTablosu) onOlcumTemizle();
    setDuzenlenen(null);
    setCipler([]);
    setAnim(null);
    setCikan([]);
    setDonmeler([]);
    setBilgi({ metin: `Hazır deney: ${o.ad}` });
  };

  const duzenlenenAygit = ayar.aygitlar.find((a) => a.id === duzenlenen) ?? null;

  return (
    <section
      aria-label="Örnekleyici"
      className="flex min-h-0 flex-col bg-background text-[13px] text-foreground"
      data-ornekleyici
    >
      <style>{ANIMASYON_CSS}</style>
      {/* Başlık: ad + kapat; araçlar (ön ayarlar, aygıt ekle) alttaki satırda — dar sütunda da tek düzen */}
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <h2 className="font-baslik inline-flex items-center gap-1.5 text-base font-semibold">
          <KaristiriciSimgesi className="h-5 w-5 text-primary" />
          Örnekleyici
        </h2>
        <button type="button" className={`${KUCUK_DUGME} ml-auto`} aria-label="Örnekleyiciyi kapat" title="Örnekleyiciyi kapat" onClick={onKapat}>
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      {/* Çalıştırma: en üstte, kaydırmadan görünür — "Çalıştır" + çekiliş sayısı, hız (+ toplam sütunu) */}
      <div className="flex flex-col gap-2 border-b border-border px-3 py-3" data-denetimler>
        <div className="flex flex-wrap items-center gap-2">
          {calisiyor ? (
            <button type="button" className={`${DUGME_BIRINCIL} min-w-[132px] px-5`} onClick={durdur}>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" fill="currentColor" />
              </svg>
              Durdur
            </button>
          ) : (
            <button type="button" className={`${DUGME_BIRINCIL} min-w-[132px] px-5`} onClick={() => calistir()} disabled={!!sorun || olcumIlerleme !== null} aria-disabled={!!sorun || dolu}>
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M4.5 3l8 5-8 5z" fill="currentColor" />
              </svg>
              Çalıştır
            </button>
          )}
          <div className="inline-flex items-center gap-1" role="group" aria-label="Çekiliş sayısı">
            <button type="button" className={KUCUK_DUGME} aria-label="Çekiliş sayısını azalt" disabled={mesgul || ayar.cekilisSayisi <= 1} onClick={() => onAyar({ ...ayar, cekilisSayisi: Math.max(1, ayar.cekilisSayisi - 1) })}>
              −
            </button>
            <SayiGirdisi deger={ayar.cekilisSayisi} min={1} max={EN_COK_CEKILIS} etiket="Çekiliş sayısı (1–200)" disabled={mesgul} onDeger={(v) => onAyar({ ...ayar, cekilisSayisi: v })} className="w-14" />
            <button type="button" className={KUCUK_DUGME} aria-label="Çekiliş sayısını artır" disabled={mesgul || ayar.cekilisSayisi >= EN_COK_CEKILIS} onClick={() => onAyar({ ...ayar, cekilisSayisi: Math.min(EN_COK_CEKILIS, ayar.cekilisSayisi + 1) })}>
              +
            </button>
            <span className="ml-1 font-bold text-muted-foreground">çekiliş</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <label className="inline-flex items-center gap-2" title={azaltilmisHareket ? 'Sistemde hareket azaltıldığı için çekilişler her zaman anında yapılır' : undefined}>
            <span className="font-bold text-muted-foreground">Hız</span>
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={azaltilmisHareket ? 3 : ayar.hiz}
              disabled={azaltilmisHareket}
              onChange={(e) => onAyar({ ...ayar, hiz: Number(e.target.value) as Hiz })}
              className="h-11 w-24 max-w-[180px] flex-1 accent-[hsl(var(--primary))] disabled:opacity-50"
              aria-label="Canlandırma hızı"
              aria-valuetext={azaltilmisHareket ? 'Anında (hareket azaltıldı)' : HIZ_ADLARI[ayar.hiz]}
            />
            <span className="min-w-[3.6rem] font-semibold">{azaltilmisHareket ? 'Anında' : HIZ_ADLARI[ayar.hiz]}</span>
          </label>
          {toplamKullanilabilir(ayar) && (
            <label className="col-span-2 inline-flex h-11 cursor-pointer items-center gap-2 font-semibold">
              <input type="checkbox" className={ONAY_KUTUSU} checked={ayar.toplamSutunu} disabled={mesgul} onChange={(e) => onAyar({ ...ayar, toplamSutunu: e.target.checked })} />
              Toplam sütunu
            </label>
          )}
        </div>
        {silmeOnayi?.tur === 'deney' && silinecek > 0 && (
          <div ref={onayRef} role="alertdialog" aria-label="Önceki deney sonuçları silinsin mi?" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1.5 font-semibold" data-silme-onayi>
            <span>
              Aygıtlar değişti: çalıştırınca önceki {silinecek} deney sonucu silinip yeni tablo kurulur.
            </span>
            <button type="button" className="h-11 rounded-md bg-destructive px-3 text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => calistir(true)}>
              Silip çalıştır
            </button>
            <button type="button" className="h-11 px-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSilmeOnayi(null)}>
              Vazgeç
            </button>
          </div>
        )}
        {sorun && (
          <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1.5 font-semibold text-destructive">
            {sorun}
          </p>
        )}
        {/* Uyarı ve bilgi iletileri ekran okuyucuya duyurulur (bölge her zaman DOM'da) */}
        <div role="status" aria-live="polite" className="space-y-1 empty:hidden">
          {uyarilar.map((u) => (
            <p key={u} className="rounded-md border border-[#c99a52]/60 bg-[#c99a52]/10 px-2 py-1.5">
              {u}
            </p>
          ))}
          {bilgi && !bilgi.acil && <p className="px-1 font-semibold text-muted-foreground">{bilgi.metin}</p>}
        </div>
        <div role="alert" className="empty:hidden">
          {bilgi?.acil && <p className="rounded-md border border-[#c99a52]/60 bg-[#c99a52]/10 px-2 py-1.5 font-semibold">{bilgi.metin}</p>}
        </div>
      </div>

      {/* Aygıtlar: ön ayarlar + aygıt ekle, sırayla bağlı kartlar, seçili aygıtın düzenleyicisi */}
      <div className="flex flex-col gap-3 border-b border-border px-3 py-3" data-aygitlar-bolumu>
      <div className="relative flex flex-wrap items-center gap-2">
        <div ref={menu.kapRef}>
          <button
            ref={menu.dugmeRef}
            type="button"
            className={DUGME}
            aria-haspopup="menu"
            aria-expanded={menu.acik}
            disabled={mesgul}
            onClick={() => menu.setAcik((a) => !a)}
            onKeyDown={menu.dugmeTusu}
          >
            Hazır deney
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {menu.acik && (
            <div
              ref={menu.menuRef}
              role="menu"
              aria-label="Hazır deney"
              onKeyDown={menu.menuTusu}
              className="absolute left-0 right-0 top-full z-30 mt-1 grid max-w-[560px] grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-0.5 overflow-hidden rounded-[calc(var(--radius)-4px)] border border-border bg-popover p-1 text-popover-foreground shadow-[0_18px_40px_-18px_rgba(6,40,45,.55)]"
            >
              {ON_AYARLAR.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className="block min-h-11 w-full rounded-[calc(var(--radius)-8px)] px-3 py-1.5 text-left text-[13px] font-semibold leading-tight hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  onClick={() => onAyarUygula(o.id)}
                >
                  {o.ad}
                </button>
              ))}
            </div>
          )}
        </div>
        {bekleyenHazir && (
          <div
            ref={hazirOnayRef}
            role="alertdialog"
            aria-label="Yeni deneye geçilsin mi?"
            className="flex w-full flex-wrap items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1.5 font-semibold"
            data-hazir-onayi
          >
            <span>
              “{ON_AYARLAR.find((o) => o.id === bekleyenHazir)?.ad}” yeni bir deney başlatır: önceki{' '}
              {silinecekMetni(deneyTablosu?.satirlar.length ?? 0, olcumSayisi)} silinir.
            </span>
            <button
              type="button"
              className="h-11 rounded-md bg-destructive px-3 text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => onAyarUygula(bekleyenHazir, true)}
            >
              Yeni deneye geç
            </button>
            <button type="button" className="h-11 px-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setBekleyenHazir(null)}>
              Vazgeç
            </button>
          </div>
        )}
        <button type="button" className={DUGME} onClick={aygitEkle} disabled={mesgul || ayar.aygitlar.length >= EN_COK_AYGIT} title="Sırayla bağlı yeni aygıt ekle (en çok 3)">
          <span aria-hidden="true">+</span> Aygıt
        </button>
      </div>
        <div className="flex flex-wrap items-stretch gap-2" data-aygitlar>
          {ayar.aygitlar.map((a, i) => {
            const kat = aygitKategorileri(a);
            const animBu = anim !== null && anim.cekilis.secimler[i] !== undefined;
            const secim = animBu ? anim!.cekilis.secimler[i] : null;
            const sonuc = animBu ? anim!.cekilis.degerler[i] : null;
            const sonucRengi = sonuc !== null ? kategoriRengi(sonuc, Math.max(0, kat.indexOf(sonuc))) : '#2f8394';
            const calkala = calisiyor && anim !== null && anim.asama === 0 && !azaltilmisHareket;
            let gorsel: React.ReactNode;
            let aciklama: React.ReactNode = null;
            if (a.tur === 'cark') {
              const acilar = carkAcilari(a);
              gorsel = (
                <CarkGorseli
                  dilimler={a.dilimler.map((d, j) => ({ etiket: d.etiket, renk: kategoriRengi(d.etiket, Math.max(0, kat.indexOf(d.etiket.trim()))), ...acilar[j] }))}
                  donme={donmeler[i] ?? 0}
                  sure={calisiyor && !azaltilmisHareket ? hizSure : 0}
                  secilen={secim}
                  asama={animBu ? anim!.asama : null}
                  onDonmeBitti={donmeBitti}
                />
              );
              const kisalan = a.dilimler.filter((d, j) => {
                const aci = acilar[j] ? acilar[j].bitis - acilar[j].baslangic : 0;
                return aci < 28 || d.etiket.trim().length > (aci >= 90 ? 7 : aci >= 50 ? 5 : 3);
              });
              if (kisalan.length > 0 && a.dilimler.length <= 4)
                aciklama = <TopAciklamasi ogeler={a.dilimler.map((d) => ({ etiket: d.etiket.trim() || '?', renk: kategoriRengi(d.etiket, Math.max(0, kat.indexOf(d.etiket.trim()))), adet: 1 }))} />;
            } else if (a.tur === 'karistirici') {
              const toplar = topListesi(a).map((k, j) => ({ etiket: a.ogeler[k].etiket, renk: kategoriRengi(a.ogeler[k].etiket, Math.max(0, kat.indexOf(a.ogeler[k].etiket.trim()))), indeks: j }));
              gorsel = (
                <KutuGorseli
                  toplar={toplar}
                  anahtar={a.id}
                  cikan={cikan[i] ?? null}
                  secilen={secim}
                  asama={animBu ? anim!.asama : null}
                  calkala={calkala}
                  sure={hizSure}
                  sonucEtiket={sonuc}
                  sonucRenk={sonucRengi}
                />
              );
              const cesitler = a.ogeler.filter((o) => o.adet > 0);
              if (cesitler.length <= 4 && !etiketlerTamMi(toplar.length, cesitler.map((o) => o.etiket)))
                aciklama = (
                  <TopAciklamasi ogeler={cesitler.map((o) => ({ etiket: o.etiket.trim() || '?', renk: kategoriRengi(o.etiket, Math.max(0, kat.indexOf(o.etiket.trim()))), adet: o.adet }))} />
                );
            } else {
              const { min, max } = aralikSinirlari(a);
              const adet = max - min + 1;
              const toplar = adet <= 36 ? kat.map((k, j) => ({ etiket: k, renk: kategoriRengi(k, j), indeks: j })) : [];
              gorsel = (
                <KutuGorseli
                  toplar={toplar}
                  ozet={adet > 36 ? `${min} … ${max}` : undefined}
                  anahtar={a.id}
                  cikan={null}
                  secilen={adet > 36 ? (secim !== null ? -1 : null) : secim}
                  asama={animBu ? anim!.asama : null}
                  calkala={calkala}
                  sure={hizSure}
                  sonucEtiket={sonuc}
                  sonucRenk={adet <= 36 && secim !== null ? kategoriRengi(sonuc ?? '', secim) : '#2f8394'}
                />
              );
              if (adet <= 36 && !etiketlerTamMi(toplar.length, kat))
                aciklama = (
                  <p className="px-0.5 text-[13px] font-semibold leading-5" data-top-aciklamasi>
                    {min} … {max} (eşit olasılıklı)
                  </p>
                );
            }
            const aygitSorun = aygitSorunu(a);
            const acik = duzenlenen === a.id;
            return (
              // Ok + kart birlikte sarılır; kart 140–212 px arasında esner (tek aygıt büyür, iki aygıt dar sütunda yan yana sığar)
              <div key={a.id} className="flex min-w-0 flex-1 basis-[168px] max-w-[212px] items-stretch gap-1">
                {i > 0 && (
                  <div className="flex shrink-0 items-center text-muted-foreground" aria-hidden="true">
                    <svg viewBox="0 0 16 16" className="h-4 w-4">
                      <path d="M3 8h9M9 4.5L12.5 8 9 11.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
                <div
                  className={`flex min-w-[140px] flex-1 flex-col gap-1.5 rounded-[calc(var(--radius)-6px)] border bg-card p-2 ${
                    acik ? 'border-primary ring-2 ring-ring/40' : aygitSorun ? 'border-destructive/60' : 'border-border'
                  }`}
                  data-aygit={a.tur}
                >
                  <div className="flex items-center gap-1">
                    <input
                      className={`${GIRDI} w-full flex-1 font-bold`}
                      aria-label={`${i + 1}. aygıtın değişken adı`}
                      value={a.degisken}
                      disabled={mesgul}
                      maxLength={24}
                      onChange={(e) => aygitGuncelle(a.id, { ...a, degisken: e.target.value })}
                    />
                    <button
                      type="button"
                      className={`${KUCUK_DUGME} ${acik ? 'border-primary bg-primary text-primary-foreground hover:bg-primary' : ''}`}
                      aria-expanded={acik}
                      aria-label={`${adlar[i]} aygıtını ${acik ? 'düzenlemeyi kapat' : 'düzenle'}`}
                      title={acik ? 'Düzenlemeyi kapat' : 'Düzenle'}
                      data-duzenle
                      disabled={mesgul}
                      onClick={() => setDuzenlenen((d) => (d === a.id ? null : a.id))}
                    >
                      <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                        <path d="M10.8 2.7l2.5 2.5-7.6 7.6-3.1.6.6-3.1 7.6-7.6zM9.5 4l2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {ayar.aygitlar.length > 1 && (
                      <button type="button" className={KUCUK_DUGME} aria-label={`${adlar[i]} aygıtını çıkar`} title="Aygıtı çıkar" disabled={mesgul} onClick={() => aygitSil(a.id)}>
                        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                          <path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.6 8.5h4.8l.6-8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div role="img" aria-label={`${TURLER.find((t) => t.id === a.tur)?.ad}: ${kat.slice(0, 8).join(', ')}${kat.length > 8 ? '…' : ''}`}>
                    {gorsel}
                  </div>
                  {aciklama}
                </div>
              </div>
            );
          })}
        </div>
        {duzenlenenAygit && (
          <AygitDuzenleyici aygit={duzenlenenAygit} kilitli={mesgul} onDegis={(y) => aygitGuncelle(duzenlenenAygit.id, y)} />
        )}
      </div>

      {/* Sonuçlar: satır sayısı, temizleme ve son çekilişlerin çipleri (en yenisi solda) */}
      <div className="flex flex-col gap-1 border-b border-border px-3 py-2" data-sonuclar>
        <div className="flex items-center gap-2">
          <span className="font-bold text-muted-foreground" title="En yeni sonuç solda">
            Sonuçlar
          </span>
          <span className="text-muted-foreground">{deneyTablosu ? `· ${deneyTablosu.satirlar.length} satır` : ''}</span>
          <button type="button" className={`${DUGME_SADE} ml-auto`} onClick={sonuclariTemizle} disabled={olcumIlerleme !== null || !deneyTablosu || deneyTablosu.satirlar.length === 0}>
            Sonuçları temizle
          </button>
        </div>
        <div className="flex h-[30px] min-w-0 flex-1 flex-wrap content-start items-center gap-1 overflow-hidden" aria-hidden="true">
          {cipler.length === 0 && <span className="truncate text-muted-foreground">Çalıştır'a basınca sonuçlar burada birikir.</span>}
          {cipler.map((c) => (
            <span
              key={c.no}
              className="inline-flex h-[28px] items-center gap-1 rounded-full border border-border bg-background py-0.5 pl-0.5 pr-2 text-[13px] font-semibold tabular-nums"
              style={{ animation: azaltilmisHareket ? undefined : 'vg-cip-gir 260ms ease-out' }}
            >
              {c.degerler.map((d, i) => {
                const a = ayar.aygitlar[i];
                const kat = a ? aygitKategorileri(a) : [];
                const renk = kategoriRengi(d, Math.max(0, kat.indexOf(d)));
                return (
                  <span key={i} className="inline-flex items-center gap-0.5">
                    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
                      <circle cx="10" cy="10" r="9" fill={renk} />
                    </svg>
                    {d}
                  </span>
                );
              })}
              {c.toplam !== null && <span className="text-muted-foreground">= {sayiYaz(c.toplam)}</span>}
            </span>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {duyuru}
      </p>

      {/* Ölçüm topla */}
      <details className="group border-b border-border" data-olcum>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-1 font-bold hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90" aria-hidden="true">
            <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ölçüm topla
          <span className="truncate font-semibold text-muted-foreground">· {olcumAdi}</span>
        </summary>
        <div className="flex flex-col gap-3 px-3 pb-3 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5">
              <span className="font-bold text-muted-foreground">Değişken</span>
              <select
                className={SECIM}
                value={olcumAyari.kaynak}
                disabled={mesgul}
                onChange={(e) => onAyar({ ...ayar, olcum: olcumAyariDuzelt(ayar, { ...olcumAyari, kaynak: e.target.value }) })}
                aria-label="Ölçülecek değişken"
              >
                {kaynaklar.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.ad}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-1.5">
              <span className="font-bold text-muted-foreground">Ölçü</span>
              <select
                className={SECIM}
                value={olcumAyari.olcu}
                disabled={mesgul}
                onChange={(e) => onAyar({ ...ayar, olcum: olcumAyariDuzelt(ayar, { ...olcumAyari, olcu: e.target.value as OlcuTuru }) })}
                aria-label="Ölçü"
              >
                {olcuSecenekleri.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.hedefli ? `‘X’ ${o.ad}` : o.ad}
                  </option>
                ))}
              </select>
            </label>
            {olcuTanimi(olcumAyari.olcu).hedefli && (
              <label className="inline-flex items-center gap-1.5">
                <span className="font-bold text-muted-foreground">X =</span>
                {seciliKaynak && seciliKaynak.kategoriler.length > 0 ? (
                  <select
                    className={SECIM}
                    value={olcumAyari.hedef}
                    disabled={mesgul}
                    onChange={(e) => onAyar({ ...ayar, olcum: { ...olcumAyari, hedef: e.target.value } })}
                    aria-label="Sayılacak değer"
                  >
                    {seciliKaynak.kategoriler.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={`${GIRDI} w-16 text-right`}
                    value={olcumAyari.hedef}
                    disabled={mesgul}
                    aria-label="Sayılacak değer"
                    onChange={(e) => onAyar({ ...ayar, olcum: { ...olcumAyari, hedef: e.target.value } })}
                  />
                )}
              </label>
            )}
          </div>
          <p className="text-muted-foreground">
            Her tekrar {ayar.cekilisSayisi} çekilişlik bir deney yapar ve <strong className="text-foreground">{olcumAdi}</strong> değerini “Ölçümler”e ekler.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-muted-foreground">Ölçüm topla:</span>
            {[10, 100, 1000].map((t) => (
              <button key={t} type="button" className={DUGME} disabled={!!sorun || mesgul} onClick={() => olcumBaslat(t)}>
                {t} kez
              </button>
            ))}
            {olcumIlerleme && (
              <button type="button" className={DUGME} onClick={olcumDurdur}>
                Durdur
              </button>
            )}
            <button type="button" className={DUGME} disabled={mesgul || olcumSayisi === 0} onClick={onOlcumTemizle}>
              Ölçümleri temizle
            </button>
          </div>
          {silmeOnayi?.tur === 'olcum' && silinecekOlcum > 0 && (
            <div ref={onayRef} role="alertdialog" aria-label="Önceki ölçümler silinsin mi?" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-2 py-1.5 font-semibold" data-silme-onayi>
              <span>Aygıtlar değişti: önceki {silinecekOlcum} ölçüm silinip yeni tablo kurulur.</span>
              <button
                type="button"
                className="h-11 rounded-md bg-destructive px-3 text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => olcumBaslat(silmeOnayi.tekrar, true)}
              >
                Silip {silmeOnayi.tekrar} kez topla
              </button>
              <button type="button" className="h-11 px-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setSilmeOnayi(null)}>
                Vazgeç
              </button>
            </div>
          )}
          {olcumIlerleme && (
            <div
              role="progressbar"
              aria-label="Ölçüm ilerlemesi"
              aria-valuemin={0}
              aria-valuemax={olcumIlerleme.tekrar}
              aria-valuenow={olcumIlerleme.yapilan}
              className="h-3 w-full overflow-hidden rounded-full bg-muted"
            >
              <div className="h-3 rounded-full bg-primary" style={{ width: `${(olcumIlerleme.yapilan / olcumIlerleme.tekrar) * 100}%` }} />
            </div>
          )}
          <p className="text-muted-foreground">Ölçümler: {olcumSayisi}</p>
        </div>
      </details>
    </section>
  );
}

// ── Aygıt düzenleyici ────────────────────────────────────────────────────────

function AygitDuzenleyici({ aygit, kilitli, onDegis }: { aygit: Aygit; kilitli: boolean; onDegis: (a: Aygit) => void }) {
  const kat = aygitKategorileri(aygit);
  const renk = (etiket: string) => kategoriRengi(etiket, Math.max(0, kat.indexOf(etiket.trim())));
  const yeniEtiket = (mevcut: string[]) => {
    const harfler = 'ABCDEFGHIJKLMNOPRSTUVYZ';
    for (const h of harfler) if (!mevcut.includes(h)) return h;
    return `E${mevcut.length + 1}`;
  };
  const top = aygit.tur === 'karistirici' ? topListesi(aygit).length : 0;

  return (
    // Çalışırken örnekleyici çalıştırmanın başındaki anlık görüntüyle sürer: ekrandaki aygıt ile veriyi üreten
    // aygıt ayrışmasın diye fieldset tüm girdileri ve düğmeleri kilitler
    <fieldset disabled={kilitli} className="min-w-0 rounded-[calc(var(--radius)-6px)] border border-primary/50 bg-card p-2 disabled:opacity-60" data-duzenleyici>
      <legend className="sr-only">Aygıt ayarları</legend>
      {kilitli && <p className="mb-1.5 font-semibold text-muted-foreground">Çalışma sürerken aygıt düzenlenemez.</p>}
      <div role="radiogroup" aria-label="Aygıt türü" className="mb-2 inline-flex flex-wrap gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-1">
        {TURLER.map((t, ti) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={aygit.tur === t.id}
            tabIndex={aygit.tur === t.id ? 0 : -1}
            onKeyDown={(e) => radyoTusu(e, ti, TURLER.length, (h) => onDegis(aygitTuruDegistir(aygit, TURLER[h].id)))}
            className={`h-11 rounded-[calc(var(--radius)-8px)] px-3 text-[13px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              aygit.tur === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
            onClick={() => onDegis(aygitTuruDegistir(aygit, t.id))}
          >
            {t.ad}
          </button>
        ))}
      </div>

      {aygit.tur === 'karistirici' && (
        <div className="space-y-1.5">
          {aygit.ogeler.map((o, i) => (
            <div key={i} className="flex items-center gap-1">
              <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
                <circle cx="10" cy="10" r="9" fill={renk(o.etiket)} />
              </svg>
              <input
                className={`${GIRDI} w-28 min-w-[64px] flex-1 basis-24`}
                aria-label={`${i + 1}. top etiketi`}
                value={o.etiket}
                maxLength={16}
                onChange={(e) => onDegis({ ...aygit, ogeler: aygit.ogeler.map((x, j) => (j === i ? { ...x, etiket: e.target.value } : x)) })}
              />
              <button
                type="button"
                className={KUCUK_DUGME}
                aria-label={`${o.etiket} topu azalt`}
                disabled={o.adet <= 0}
                onClick={() => onDegis({ ...aygit, ogeler: aygit.ogeler.map((x, j) => (j === i ? { ...x, adet: Math.max(0, x.adet - 1) } : x)) })}
              >
                −
              </button>
              <SayiGirdisi
                deger={o.adet}
                min={0}
                max={EN_COK_TOP}
                etiket={`${o.etiket} top adedi`}
                className="w-12"
                onDeger={(v) => onDegis({ ...aygit, ogeler: aygit.ogeler.map((x, j) => (j === i ? { ...x, adet: v } : x)) })}
              />
              <button
                type="button"
                className={KUCUK_DUGME}
                aria-label={`${o.etiket} topu artır`}
                disabled={top >= EN_COK_TOP}
                onClick={() => onDegis({ ...aygit, ogeler: aygit.ogeler.map((x, j) => (j === i ? { ...x, adet: x.adet + 1 } : x)) })}
              >
                +
              </button>
              {aygit.ogeler.length > 1 && (
                <button
                  type="button"
                  className={KUCUK_DUGME}
                  aria-label={`${o.etiket} etiketini sil`}
                  onClick={() => onDegis({ ...aygit, ogeler: aygit.ogeler.filter((_, j) => j !== i) })}
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              className={DUGME}
              disabled={aygit.ogeler.length >= EN_COK_ETIKET || top >= EN_COK_TOP}
              onClick={() => onDegis({ ...aygit, ogeler: [...aygit.ogeler, { etiket: yeniEtiket(aygit.ogeler.map((o) => o.etiket)), adet: 1 }] })}
            >
              <span aria-hidden="true">+</span> Top çeşidi
            </button>
            <div role="radiogroup" aria-label="Çekiliş biçimi" className="inline-flex gap-1 rounded-[calc(var(--radius)-6px)] bg-muted p-1">
              {(
                [
                  [true, 'İadeli'],
                  [false, 'İadesiz'],
                ] as [boolean, string][]
              ).map(([deger, ad], bi) => (
                <button
                  key={String(deger)}
                  type="button"
                  role="radio"
                  aria-checked={aygit.iadeli === deger}
                  tabIndex={aygit.iadeli === deger ? 0 : -1}
                  onKeyDown={(e) => radyoTusu(e, bi, 2, (h) => onDegis({ ...aygit, iadeli: h === 0 }))}
                  className={`h-11 rounded-[calc(var(--radius)-8px)] px-3 text-[13px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    aygit.iadeli === deger ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                  onClick={() => onDegis({ ...aygit, iadeli: deger })}
                >
                  {ad}
                </button>
              ))}
            </div>
            <span className="text-muted-foreground">{top} top</span>
          </div>
        </div>
      )}

      {aygit.tur === 'cark' && (
        <div className="space-y-1.5">
          {aygit.dilimler.map((d, i) => (
            <div key={i} className="flex items-center gap-1">
              <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" aria-hidden="true">
                <circle cx="10" cy="10" r="9" fill={renk(d.etiket)} />
              </svg>
              <input
                className={`${GIRDI} w-28 min-w-[64px] flex-1 basis-24`}
                aria-label={`${i + 1}. dilim etiketi`}
                value={d.etiket}
                maxLength={16}
                onChange={(e) => onDegis({ ...aygit, dilimler: aygit.dilimler.map((x, j) => (j === i ? { ...x, etiket: e.target.value } : x)) })}
              />
              <span className="font-bold text-muted-foreground">%</span>
              <SayiGirdisi
                deger={d.yuzde}
                min={0}
                max={100}
                tamSayi={false}
                etiket={`${d.etiket} dilim yüzdesi`}
                className="w-16"
                onDeger={(v) => onDegis({ ...aygit, dilimler: aygit.dilimler.map((x, j) => (j === i ? { ...x, yuzde: v } : x)) })}
              />
              {aygit.dilimler.length > 1 && (
                <button
                  type="button"
                  className={KUCUK_DUGME}
                  aria-label={`${d.etiket} dilimini sil`}
                  onClick={() => onDegis({ ...aygit, dilimler: aygit.dilimler.filter((_, j) => j !== i) })}
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              className={DUGME}
              disabled={aygit.dilimler.length >= EN_COK_ETIKET}
              onClick={() => onDegis({ ...aygit, dilimler: [...aygit.dilimler, { etiket: yeniEtiket(aygit.dilimler.map((x) => x.etiket)), yuzde: 0 }] })}
            >
              <span aria-hidden="true">+</span> Dilim
            </button>
            <button
              type="button"
              className={DUGME}
              onClick={() =>
                onDegis({ ...aygit, dilimler: aygit.dilimler.map((x) => ({ ...x, yuzde: Math.round((10000 / aygit.dilimler.length)) / 100 })) })
              }
            >
              Eşit böl
            </button>
            <span className="text-muted-foreground">toplam %{sayiYaz(carkOranlari(aygit).toplamYuzde, 1)}</span>
          </div>
        </div>
      )}

      {aygit.tur === 'aralik' && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5">
            <span className="font-bold text-muted-foreground">En küçük</span>
            <SayiGirdisi deger={aygit.min} min={-9999} max={9999} etiket="Aralığın en küçük sayısı" onDeger={(v) => onDegis({ ...aygit, min: v })} />
          </label>
          <label className="inline-flex items-center gap-1.5">
            <span className="font-bold text-muted-foreground">En büyük</span>
            <SayiGirdisi deger={aygit.max} min={-9999} max={9999} etiket="Aralığın en büyük sayısı" onDeger={(v) => onDegis({ ...aygit, max: v })} />
          </label>
          <span className="text-muted-foreground">
            {aygitSayisalMi(aygit) ? `${Math.abs(aygit.max - aygit.min) + 1} sayı, eşit olasılıklı` : ''}
          </span>
        </div>
      )}
    </fieldset>
  );
}
