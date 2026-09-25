'use client';

/**
 * Algoritma Laboratuvarı — blok düzenleyici (1–2. sınıf numaralı kartlar, 3. sınıftan simgeli Türkçe bloklar).
 *
 * - Araç kutusundan sürükle-bırak ya da dokun-ekle (dokununca seçili kabın sonuna eklenir; seçili
 *   kap yoksa programın sonuna). Akıllı tahtada yalnız dokunarak program kurulabilir.
 * - Programdaki blok sürüklenerek taşınır; programın dışına (araç kutusuna) bırakılırsa silinir.
 * - Klavye: blok odaktayken Delete/Backspace siler, Alt+↑/↓ taşır, Enter kabı seçer.
 * - Çalışırken: yığındaki bloklar vurgulanır (en içteki güçlü), hata bloğu mercan halkayla; blok
 *   başına sayımlar ("7 tur", "7 kez · 3 evet") rozet olarak görünür.
 * - 5. sınıftan: atama bloğu (sayaç ← sayaç + 1) ve karşılaştırmalı koşullar; ifadenin işlenenlerine
 *   (sayı, değişken, ölçüm) ve işlemine dokununca küçük bir seçim listesi açılır. "Eğer" bloğunun
 *   "değilse" kolu ayrı bir kap gibi seçilir. 8. sınıfta kendi komutunu tanımlama.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DEGILSE,
  EYLEM_ADI,
  KARSILASTIRMALAR,
  KEZ_EN_AZ,
  KEZ_EN_COK,
  KOSUL_EGER,
  KOSUL_KADAR,
  OLCUM_ACIKLAMASI,
  OLCUM_ADI,
  blokBasligi,
  blokSayisi,
  bloklar,
  cikar,
  ekle,
  govdeliMi,
  guncelle,
  ifadeAnahtari,
  ifadeMetni,
  kapKimligi,
  karsilastirmaMetni,
  karsilastirmaMi,
  kezMetni,
  konumBul,
  kosulAnahtari,
  sablondanBlok,
  sayiMetni,
  tasi,
  type Blok,
  type BlokSablonu,
  type Ifade,
  type IslemOp,
  type Karsilastirma,
  type KarsilastirmaOp,
  type Konum,
  type Kosul,
  type KosulTuru,
  type OlcumTuru,
  type Program,
} from './program';
import type { BlokSayimi } from './yorumlayici';
import { EylemSimgesi, KosulSimgesi, SIMGE } from './simgeler';

export type BlokKategori = 'hareket' | 'bahce' | 'dongu' | 'karar' | 'degisken' | 'komut';

const HAREKET = new Set(['ileri', 'sagaDon', 'solaDon', 'kalemKaldir', 'kalemIndir']);

export function kategori(b: Blok | BlokSablonu): BlokKategori {
  switch (b.tur) {
    case 'eger':
      return 'karar';
    case 'tekrarlaKez':
    case 'tekrarlaKadar':
      return 'dongu';
    case 'ata':
      return 'degisken';
    case 'tanim':
    case 'cagir':
      return 'komut';
    case 'eylem':
      return HAREKET.has(b.eylem) ? 'hareket' : 'bahce';
  }
}

/** Blok renkleri: beyaz yazıyla en az 4.5:1 karşıtlık (ada paletinin koyu tonları). */
export const KATEGORI_RENGI: Record<BlokKategori, string> = {
  hareket: '#216a78',
  bahce: '#1d766f',
  dongu: '#9a6a26',
  karar: '#5d66a6',
  degisken: '#a3476b',
  komut: '#566b2d',
};

export const KATEGORI_ADI: Record<BlokKategori, string> = {
  hareket: 'Hareket',
  bahce: 'İş',
  dongu: 'Tekrar',
  karar: 'Karar',
  degisken: 'Değişken',
  komut: 'Komut',
};

export interface AktifDurum {
  /** Dıştan içe çalışan bloklar; son eleman şu anki adım */
  yigin: string[];
  hata: boolean;
}

export interface BlokDuzenleyiciProps {
  program: Program;
  /** Yoksa salt okunur */
  onDegis?: (p: Program) => void;
  aracKutusu?: BlokSablonu[];
  /** İskelet ipucu: araç kutusu yerine bu bloklar, her biri bir kez */
  iskelet?: BlokSablonu[] | null;
  aktif?: AktifDurum | null;
  sayimlar?: Record<string, BlokSayimi> | null;
  /** Anlat eşleştirmesi: blok kimliği → renk */
  vurgular?: Record<string, string> | null;
  /** Programın üstündeki başlık */
  baslik?: string;
  /** Blok sınırı bilgisi */
  enFazlaBlok?: number;
  kompakt?: boolean;
  /** Araç kutusunun başlığı */
  kutuBasligi?: string;
  /** Kod başlığının yanında ek düğme (ör. "Baştan") */
  ek?: React.ReactNode;
  /** 1–2. sınıf: büyük kartlar, kökteki her adımın başında sıra numarası */
  kart?: boolean;
  /** İfadelerde seçilebilecek değişken adları */
  degiskenler?: string[];
  /** İfadelerde seçilebilecek ölçümler */
  olcumler?: OlcumTuru[];
}

type Kaynak = { tur: 'yeni'; sablon: BlokSablonu; iskeletSira?: number } | { tur: 'tasi'; blokId: string };

interface Surukleme {
  kaynak: Kaynak;
  x: number;
  y: number;
  hedef: Konum | null;
  sil: boolean;
}

/** İfade seçim listelerinin içeriği */
interface Sozluk {
  degiskenler: string[];
  olcumler: OlcumTuru[];
}

const SURUKLEME_ESIGI = 6;

function sablonAnahtari(s: BlokSablonu): string {
  switch (s.tur) {
    case 'eylem':
      return `e:${s.eylem}`;
    case 'tekrarlaKez':
      return s.kezIfade ? `k:${ifadeAnahtari(s.kezIfade)}` : `k:${s.kez}`;
    case 'tekrarlaKadar':
      return `tekrarlaKadar:${kosulAnahtari(s.kosul)}`;
    case 'eger':
      return `eger:${kosulAnahtari(s.kosul)}${s.degilse ? ':d' : ''}`;
    case 'ata':
      return `a:${s.degisken}=${ifadeAnahtari(s.ifade)}`;
    case 'tanim':
      return `t:${s.ad}`;
    case 'cagir':
      return `c:${s.ad}`;
  }
}

function sayimMetni(b: Blok, s: BlokSayimi | undefined): string | null {
  if (!s || !s.calisma) return null;
  if (b.tur === 'eylem' || b.tur === 'ata' || b.tur === 'cagir') return `${s.calisma} kez`;
  if (b.tur === 'eger') return `${s.calisma} kez · ${s.evet} evet`;
  if (b.tur === 'tanim') return null;
  return `${s.calisma} tur`;
}

// ---------------------------------------------------------------------------
// İfade yardımcıları
// ---------------------------------------------------------------------------

type Yol = ('sol' | 'sag')[];
const ONCELIK: Record<IslemOp, number> = { '+': 1, '-': 1, '×': 2, '÷': 2, mod: 2 };
const OP_YAZI: Record<IslemOp, string> = { '+': '+', '-': '−', '×': '×', '÷': '÷', mod: 'mod' };
const ISLEMLER: IslemOp[] = ['+', '-', '×', '÷', 'mod'];

function ifadeKoy(i: Ifade, yol: Yol, yeni: Ifade): Ifade {
  if (!yol.length) return yeni;
  if (i.tur !== 'islem') return i;
  const [bas, ...kalan] = yol;
  return bas === 'sol' ? { ...i, sol: ifadeKoy(i.sol, kalan, yeni) } : { ...i, sag: ifadeKoy(i.sag, kalan, yeni) };
}

function islenenMetni(i: Ifade): string {
  if (i.tur === 'sayi') return sayiMetni(i.deger);
  if (i.tur === 'degisken') return i.ad;
  if (i.tur === 'olcum') return OLCUM_ADI[i.olcum];
  return ifadeMetni(i);
}

/** Portal içinde, bir çipin altında açılan küçük seçim listesi */
function Acilir({ capa, onKapat, children, etiket }: { capa: HTMLElement; onKapat: () => void; children: React.ReactNode; etiket: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [yer, setYer] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const r = capa.getBoundingClientRect();
    const en = ref.current?.offsetWidth ?? 220;
    const boy = ref.current?.offsetHeight ?? 200;
    const x = Math.max(8, Math.min(window.innerWidth - en - 8, r.left));
    const asagi = r.bottom + 6 + boy < window.innerHeight - 8;
    setYer({ x, y: asagi ? r.bottom + 6 : Math.max(8, r.top - boy - 6) });
  }, [capa]);
  useEffect(() => {
    const dis = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node) && !capa.contains(e.target as Node)) onKapat();
    };
    const tus = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onKapat();
        capa.focus();
      }
    };
    window.addEventListener('pointerdown', dis, true);
    window.addEventListener('keydown', tus, true);
    return () => {
      window.removeEventListener('pointerdown', dis, true);
      window.removeEventListener('keydown', tus, true);
    };
  }, [capa, onKapat]);
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={etiket}
      data-surukleme-yok
      data-ifade-secimi
      className="fixed z-[2147483001] min-w-[180px] max-w-[280px] rounded-[14px] border border-border bg-popover p-1.5 text-foreground shadow-xl"
      style={{ left: yer?.x ?? -9999, top: yer?.y ?? -9999 }}
    >
      {children}
    </div>,
    document.body
  );
}

const SECENEK = 'flex min-h-[40px] w-full items-center gap-2 rounded-[10px] px-2.5 text-left text-[14px] font-bold hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** Tek işlenen (sayı · değişken · ölçüm) çipi; dokununca değiştirme listesi */
function IslenenCipi({ i, onSec, sozluk, duzenlenebilir }: { i: Ifade; onSec: (y: Ifade) => void; sozluk: Sozluk; duzenlenebilir: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [acik, setAcik] = useState(false);
  const [sayi, setSayi] = useState(i.tur === 'sayi' ? String(i.deger) : '0');
  useEffect(() => {
    if (acik) setSayi(i.tur === 'sayi' ? String(i.deger) : '0');
  }, [acik, i]);
  const metin = islenenMetni(i);
  const renk = i.tur === 'sayi' ? 'text-ada-murekkep' : i.tur === 'degisken' ? 'text-[#8a2f55]' : 'text-[#1f5f68]';
  if (!duzenlenebilir) return <span className={`px-1 font-extrabold tabular-nums ${renk}`}>{metin}</span>;
  const sayiUygula = (s: string) => {
    const n = Number(s.replace(',', '.').replace('−', '-'));
    if (Number.isFinite(n)) onSec({ tur: 'sayi', deger: Math.max(-9999, Math.min(9999, Math.round(n))) });
  };
  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setAcik((a) => !a)}
        className={`min-h-[30px] min-w-[30px] rounded-full px-1.5 font-extrabold tabular-nums underline decoration-dotted decoration-2 underline-offset-[5px] hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${renk}`}
        aria-haspopup="dialog"
        aria-expanded={acik}
        aria-label={`${metin}: değiştir`}
        data-islenen
      >
        {metin}
      </button>
      {acik && ref.current && (
        <Acilir capa={ref.current} onKapat={() => setAcik(false)} etiket="Değer seç">
          <p className="px-2.5 pb-1 pt-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Sayı</p>
          <div className="flex items-center gap-1 px-1.5 pb-1.5">
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-muted/70" aria-label="Azalt" onClick={() => setSayi((s) => String((Number(s) || 0) - 1))}>
              <SIMGE.eksi className="h-4 w-4" />
            </button>
            <input
              value={sayi}
              onChange={(e) => setSayi(e.target.value.replace(/[^0-9\-−]/g, '').slice(0, 5))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  sayiUygula(sayi);
                  setAcik(false);
                }
              }}
              inputMode="numeric"
              className="h-9 w-16 rounded-[10px] border-2 border-border bg-background text-center text-[16px] font-extrabold tabular-nums outline-none focus:border-primary"
              aria-label="Sayı"
              data-sayi-girisi
            />
            <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-muted/70" aria-label="Artır" onClick={() => setSayi((s) => String((Number(s) || 0) + 1))}>
              <SIMGE.arti className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="ml-1 h-9 rounded-full bg-primary px-3 text-[13px] font-bold text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                sayiUygula(sayi);
                setAcik(false);
              }}
              data-sayi-tamam
            >
              Tamam
            </button>
          </div>
          {sozluk.degiskenler.length > 0 && (
            <>
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Değişken</p>
              {sozluk.degiskenler.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={SECENEK}
                  onClick={() => {
                    onSec({ tur: 'degisken', ad: d });
                    setAcik(false);
                  }}
                  data-secenek={`d:${d}`}
                >
                  <SIMGE.degisken className="h-4 w-4 shrink-0 text-[#a3476b]" />
                  {d}
                </button>
              ))}
            </>
          )}
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">İşlem ekle</p>
          <div className="flex flex-wrap gap-1 px-1.5 pb-1">
            {(['+', '-', '×', '÷', 'mod'] as IslemOp[]).map((op) => (
              <button
                key={op}
                type="button"
                className="flex h-9 items-center rounded-[10px] bg-muted px-2 text-[14px] font-extrabold tabular-nums hover:bg-muted/70"
                onClick={() => {
                  onSec({ tur: 'islem', op, sol: i, sag: { tur: 'sayi', deger: op === '×' || op === '÷' || op === 'mod' ? 2 : 1 } });
                  setAcik(false);
                }}
                aria-label={`${metin} ${OP_YAZI[op]} … yap`}
                data-secenek={`e:${op}`}
              >
                {metin} {OP_YAZI[op]} {op === '×' || op === '÷' || op === 'mod' ? 2 : 1}
              </button>
            ))}
          </div>
          {sozluk.olcumler.length > 0 && (
            <>
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-muted-foreground">Ölçüm</p>
              {sozluk.olcumler.map((o) => (
                <button
                  key={o}
                  type="button"
                  className={SECENEK}
                  onClick={() => {
                    onSec({ tur: 'olcum', olcum: o });
                    setAcik(false);
                  }}
                  data-secenek={`o:${o}`}
                >
                  <span className="min-w-0">
                    <span className="block">{OLCUM_ADI[o]}</span>
                    <span className="block text-[12px] font-semibold text-muted-foreground">{OLCUM_ACIKLAMASI[o]}</span>
                  </span>
                </button>
              ))}
            </>
          )}
        </Acilir>
      )}
    </>
  );
}

/** İşlem ya da karşılaştırma işareti çipi */
function IsaretCipi<T extends string>({ deger, secenekler, yazi, onSec, duzenlenebilir, etiket, onKaldir }: { deger: T; secenekler: readonly T[]; yazi: (t: T) => string; onSec: (t: T) => void; duzenlenebilir: boolean; etiket: string; onKaldir?: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [acik, setAcik] = useState(false);
  if (!duzenlenebilir) return <span className="px-0.5 font-extrabold text-ada-murekkep/80">{yazi(deger)}</span>;
  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setAcik((a) => !a)}
        className="min-h-[30px] min-w-[26px] rounded-full px-1 font-extrabold text-ada-murekkep/80 underline decoration-dotted decoration-2 underline-offset-[5px] hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-haspopup="dialog"
        aria-expanded={acik}
        aria-label={`${etiket}: ${yazi(deger)}`}
        data-isaret
      >
        {yazi(deger)}
      </button>
      {acik && ref.current && (
        <Acilir capa={ref.current} onKapat={() => setAcik(false)} etiket={etiket}>
          <div className="flex flex-wrap gap-1 p-0.5">
            {secenekler.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onSec(s);
                  setAcik(false);
                }}
                className={`flex h-10 min-w-[44px] items-center justify-center rounded-[10px] px-2 text-[16px] font-extrabold ${s === deger ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}
                data-secenek={`i:${s}`}
              >
                {yazi(s)}
              </button>
            ))}
          </div>
          {onKaldir && (
            <button
              type="button"
              className={`${SECENEK} mt-1 text-ada-mercan`}
              onClick={() => {
                onKaldir();
                setAcik(false);
              }}
              data-secenek="kaldir"
            >
              <SIMGE.kapat className="h-4 w-4 shrink-0" />
              İşlemi kaldır (soldakini bırak)
            </button>
          )}
        </Acilir>
      )}
    </>
  );
}

/** İfadenin çipleri (işlenenler ve işlemler ayrı ayrı değiştirilebilir) */
function IfadeCipleri({ ifade, onDegis, sozluk, duzenlenebilir }: { ifade: Ifade; onDegis: (i: Ifade) => void; sozluk: Sozluk; duzenlenebilir: boolean }) {
  const ciz = (i: Ifade, yol: Yol, ust: number, sagda: boolean): React.ReactNode => {
    if (i.tur !== 'islem') return <IslenenCipi key={yol.join('.') || 'kok'} i={i} sozluk={sozluk} duzenlenebilir={duzenlenebilir} onSec={(y) => onDegis(ifadeKoy(ifade, yol, y))} />;
    const o = ONCELIK[i.op];
    const parantez = o < ust || (sagda && o === ust);
    return (
      <React.Fragment key={yol.join('.') || 'kok'}>
        {parantez && <span className="font-extrabold text-ada-murekkep/60">(</span>}
        {ciz(i.sol, [...yol, 'sol'], o, false)}
        <IsaretCipi
          deger={i.op}
          secenekler={ISLEMLER}
          yazi={(t) => OP_YAZI[t]}
          duzenlenebilir={duzenlenebilir}
          etiket="İşlem seç"
          onSec={(op) => onDegis(ifadeKoy(ifade, yol, { ...i, op }))}
          onKaldir={() => onDegis(ifadeKoy(ifade, yol, i.sol))}
        />
        {ciz(i.sag, [...yol, 'sag'], o, true)}
        {parantez && <span className="font-extrabold text-ada-murekkep/60">)</span>}
      </React.Fragment>
    );
  };
  return <>{ciz(ifade, [], 0, false)}</>;
}

const HAP = 'inline-flex min-h-[32px] flex-wrap items-center gap-0.5 rounded-full bg-white/95 px-1.5 text-[14px] font-extrabold text-ada-murekkep';

function KarsilastirmaCipleri({ kosul, onDegis, sozluk, duzenlenebilir }: { kosul: Karsilastirma; onDegis: (k: Karsilastirma) => void; sozluk: Sozluk; duzenlenebilir: boolean }) {
  return (
    <span className={HAP} data-surukleme-yok={duzenlenebilir || undefined}>
      <IfadeCipleri ifade={kosul.sol} sozluk={sozluk} duzenlenebilir={duzenlenebilir} onDegis={(sol) => onDegis({ ...kosul, sol })} />
      <IsaretCipi<KarsilastirmaOp> deger={kosul.op} secenekler={KARSILASTIRMALAR} yazi={(t) => t} duzenlenebilir={duzenlenebilir} etiket="Karşılaştırma seç" onSec={(op) => onDegis({ ...kosul, op })} />
      <IfadeCipleri ifade={kosul.sag} sozluk={sozluk} duzenlenebilir={duzenlenebilir} onDegis={(sag) => onDegis({ ...kosul, sag })} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Düzenleyici
// ---------------------------------------------------------------------------

export function BlokDuzenleyici({
  program,
  onDegis,
  aracKutusu = [],
  iskelet = null,
  aktif = null,
  sayimlar = null,
  vurgular = null,
  baslik = 'Program',
  enFazlaBlok,
  kompakt = false,
  kutuBasligi = 'Araç kutusu',
  ek = null,
  kart = false,
  degiskenler = [],
  olcumler = [],
}: BlokDuzenleyiciProps) {
  const duzenlenebilir = !!onDegis;
  const kokRef = useRef<HTMLDivElement>(null);
  const alanRef = useRef<HTMLDivElement>(null);
  const kutuRef = useRef<HTMLDivElement>(null);
  const [surukleme, setSurukleme] = useState<Surukleme | null>(null);
  const suruklemeRef = useRef<Surukleme | null>(null);
  suruklemeRef.current = surukleme;
  const bekleyen = useRef<{ kaynak: Kaynak; x0: number; y0: number; id: number } | null>(null);
  const sonBirakma = useRef(0);
  /** Seçili kap: kabın kimliği ya da "kimlik:degilse" (değilse kolu) */
  const [seciliKap, setSeciliKap] = useState<string | null>(null);
  const [kullanilanIskelet, setKullanilanIskelet] = useState<number[]>([]);
  const programRef = useRef(program);
  programRef.current = program;
  const onDegisRef = useRef(onDegis);
  onDegisRef.current = onDegis;

  // Seçili kap programdan çıktıysa bırak
  useEffect(() => {
    if (seciliKap && !konumBul(program, kapKimligi(seciliKap))) setSeciliKap(null);
  }, [program, seciliKap]);
  useEffect(() => setKullanilanIskelet([]), [iskelet]);

  const kosulSecenekleri = useMemo(() => {
    const eger = new Set<KosulTuru>();
    const kadar = new Set<KosulTuru>();
    for (const s of [...aracKutusu, ...(iskelet ?? [])]) {
      if (s.tur === 'eger' && !karsilastirmaMi(s.kosul)) eger.add(s.kosul);
      if (s.tur === 'tekrarlaKadar' && !karsilastirmaMi(s.kosul)) kadar.add(s.kosul);
    }
    return { eger: [...eger], kadar: [...kadar] };
  }, [aracKutusu, iskelet]);

  // İfade seçim listesi: bildirilen değişkenler + kutuda ve programda geçenler; bildirilen ölçümler
  const sozluk = useMemo<Sozluk>(() => {
    const d = new Set(degiskenler);
    for (const s of aracKutusu) if (s.tur === 'ata') d.add(s.degisken);
    for (const b of bloklar(program)) if (b.tur === 'ata') d.add(b.degisken);
    return { degiskenler: [...d], olcumler };
  }, [degiskenler, olcumler, aracKutusu, program]);

  const degis = useCallback((p: Program) => onDegisRef.current?.(p), []);

  /** Dokun-ekle: seçili kabın (ya da değilse kolunun) sonuna, yoksa programın sonuna */
  const dokunEkle = useCallback(
    (s: BlokSablonu, iskeletSira?: number) => {
      const p = programRef.current;
      const b = sablondanBlok(s);
      let hedef: Konum = { ebeveyn: null, indeks: p.length };
      // Seçili kap yoksa ve kod tek bir kaptan oluşuyorsa (ör. hazır döngü), dokunulan blok onun içine girer
      const kapAnahtari = seciliKap ?? (p.length === 1 && govdeliMi(p[0]) ? p[0].id : null);
      if (kapAnahtari) {
        const kap = findBlok(p, kapKimligi(kapAnahtari));
        if (kap && govdeliMi(kap)) {
          const degilse = kapAnahtari.endsWith(DEGILSE) && kap.tur === 'eger' && kap.degilse;
          hedef = degilse ? { ebeveyn: kapAnahtari, indeks: kap.degilse!.length } : { ebeveyn: kap.id, indeks: kap.govde.length };
        }
      }
      degis(ekle(p, hedef, b));
      if (iskeletSira !== undefined) setKullanilanIskelet((u) => [...u, iskeletSira]);
      if (govdeliMi(b)) setSeciliKap(b.id);
    },
    [degis, seciliKap]
  );

  // --- Sürükleme -------------------------------------------------------------
  const hedefBul = useCallback((x: number, y: number, kaynak: Kaynak): { hedef: Konum | null; sil: boolean } => {
    const alan = alanRef.current;
    const kok = kokRef.current;
    if (!alan || !kok) return { hedef: null, sil: false };
    const ar = alan.getBoundingClientRect();
    const icinde = x >= ar.left - 28 && x <= ar.right + 28 && y >= ar.top - 28 && y <= ar.bottom + 28;
    if (!icinde) return { hedef: null, sil: kaynak.tur === 'tasi' };
    // Kenara yakınken kaydır
    if (y < ar.top + 28) alan.scrollTop -= 10;
    else if (y > ar.bottom - 28) alan.scrollTop += 10;
    let enIyi: { k: Konum; d: number; sol: number } | null = null;
    alan.querySelectorAll<HTMLElement>('[data-yer]').forEach((el) => {
      if (kaynak.tur === 'tasi' && el.closest(`[data-blok-id="${kaynak.blokId}"]`)) return;
      const r = el.getBoundingClientRect();
      if (x < r.left - 30 || x > r.right + 40) return;
      const d = Math.abs(y - (r.top + r.height / 2));
      const [e, i] = (el.dataset.yer ?? 'kok:0').split('|');
      const k: Konum = { ebeveyn: e === 'kok' ? null : e, indeks: Number(i) };
      if (!enIyi || d < enIyi.d - 2 || (Math.abs(d - enIyi.d) <= 2 && r.left > enIyi.sol)) enIyi = { k, d, sol: r.left };
    });
    const secilen = enIyi as { k: Konum; d: number; sol: number } | null;
    return { hedef: secilen ? secilen.k : null, sil: false };
  }, []);

  useEffect(() => {
    const hareket = (e: PointerEvent) => {
      const b = bekleyen.current;
      if (!b || e.pointerId !== b.id) return;
      const s = suruklemeRef.current;
      if (!s) {
        if (Math.hypot(e.clientX - b.x0, e.clientY - b.y0) < SURUKLEME_ESIGI) return;
        const { hedef, sil } = hedefBul(e.clientX, e.clientY, b.kaynak);
        setSurukleme({ kaynak: b.kaynak, x: e.clientX, y: e.clientY, hedef, sil });
        return;
      }
      e.preventDefault();
      const { hedef, sil } = hedefBul(e.clientX, e.clientY, s.kaynak);
      setSurukleme({ ...s, x: e.clientX, y: e.clientY, hedef, sil });
    };
    const birak = (e: PointerEvent) => {
      const b = bekleyen.current;
      if (!b || e.pointerId !== b.id) return;
      bekleyen.current = null;
      const s = suruklemeRef.current;
      if (!s) {
        // Tıklama: araç kutusundan ekle
        if (b.kaynak.tur === 'yeni') dokunEkle(b.kaynak.sablon, b.kaynak.iskeletSira);
        return;
      }
      setSurukleme(null);
      sonBirakma.current = performance.now();
      const p = programRef.current;
      if (s.kaynak.tur === 'yeni') {
        if (s.hedef) {
          const yeni = sablondanBlok(s.kaynak.sablon);
          degis(ekle(p, s.hedef, yeni));
          // Dokun-ekle ile aynı: yeni kap seçilir, sonraki dokunuşlar içine girer; eylem bırakıldığı kabı seçer
          setSeciliKap(govdeliMi(yeni) ? yeni.id : s.hedef.ebeveyn);
          if (s.kaynak.iskeletSira !== undefined) setKullanilanIskelet((u) => [...u, (s.kaynak as { iskeletSira: number }).iskeletSira]);
        }
        return;
      }
      if (s.hedef) degis(tasi(p, s.kaynak.blokId, s.hedef));
      else if (s.sil) degis(cikar(p, s.kaynak.blokId)[0]);
    };
    const iptal = () => {
      bekleyen.current = null;
      setSurukleme(null);
    };
    window.addEventListener('pointermove', hareket, { passive: false });
    window.addEventListener('pointerup', birak);
    window.addEventListener('pointercancel', iptal);
    return () => {
      window.removeEventListener('pointermove', hareket);
      window.removeEventListener('pointerup', birak);
      window.removeEventListener('pointercancel', iptal);
    };
  }, [degis, dokunEkle, hedefBul]);

  const basla = (e: React.PointerEvent, kaynak: Kaynak) => {
    if (!duzenlenebilir || e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('button, select, input, [data-surukleme-yok]') && !t.closest('[data-arac]')) return;
    bekleyen.current = { kaynak, x0: e.clientX, y0: e.clientY, id: e.pointerId };
  };

  // --- Klavye -------------------------------------------------------------------
  const blokTusu = (e: React.KeyboardEvent, b: Blok) => {
    if (!duzenlenebilir || e.target !== e.currentTarget) return;
    const p = programRef.current;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      degis(cikar(p, b.id)[0]);
      return;
    }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const k = konumBul(p, b.id);
      if (!k) return;
      const yeni = e.key === 'ArrowUp' ? k.indeks - 1 : k.indeks + 2;
      if (yeni < 0) return;
      degis(tasi(p, b.id, { ebeveyn: k.ebeveyn, indeks: yeni }));
      requestAnimationFrame(() => kokRef.current?.querySelector<HTMLElement>(`[data-blok-id="${b.id}"]`)?.focus());
      return;
    }
    if (e.key === 'Enter' && govdeliMi(b)) {
      e.preventDefault();
      setSeciliKap((s) => (s === b.id ? null : b.id));
    }
  };

  // --- Çizim --------------------------------------------------------------------
  const aktifSon = aktif?.yigin[aktif.yigin.length - 1] ?? null;
  const n = blokSayisi(program);
  const gunc = (id: string, d: Parameters<typeof guncelle>[2]) => degis(guncelle(programRef.current, id, d));

  // Çizim yardımcıları düz işlevdir (bileşen değil): her çizimde yeniden bağlanmazlar, odak korunur
  const yer = (ebeveyn: string | null, indeks: number, bos = false) => {
    const anahtar = `yer-${ebeveyn ?? 'kok'}-${indeks}`;
    const hedefMi = !!surukleme?.hedef && surukleme.hedef.ebeveyn === ebeveyn && surukleme.hedef.indeks === indeks;
    if (bos) {
      return (
        <div
          key={anahtar}
          data-yer={`${ebeveyn ?? 'kok'}|${indeks}`}
          className={`my-1 flex min-h-[40px] items-center rounded-[10px] border-2 border-dashed px-3 text-[13px] font-semibold transition-colors ${hedefMi ? 'border-ada-mercan bg-ada-mercan/10 text-foreground' : 'border-foreground/15 text-muted-foreground'}`}
        >
          {duzenlenebilir ? (seciliKap === ebeveyn ? 'Yeni bloklar buraya eklenir' : 'Blokları buraya bırak') : 'Boş'}
        </div>
      );
    }
    return (
      <div key={anahtar} data-yer={`${ebeveyn ?? 'kok'}|${indeks}`} className={`relative ${surukleme ? 'h-[12px]' : 'h-[6px]'} transition-[height]`}>
        {hedefMi && <span className="absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-ada-mercan shadow-[0_0_0_3px_rgba(217,128,95,0.25)]" />}
      </div>
    );
  };

  const liste = (l: Blok[], ebeveyn: string | null): React.ReactNode => {
    if (!l.length) return yer(ebeveyn, 0, true);
    return [
      yer(ebeveyn, 0),
      ...l.map((b, i) => (
        <React.Fragment key={b.id}>
          {blokOgesi(b, ebeveyn === null ? i + 1 : undefined)}
          {yer(ebeveyn, i + 1)}
        </React.Fragment>
      )),
    ];
  };

  const kapGovdesi = (renk: string, yiginda: boolean, anahtar: string, l: Blok[]) => {
    const secili = seciliKap === anahtar;
    return (
      <div className="flex">
        <div className="w-[14px] shrink-0" style={{ background: renk }} />
        <div
          className={`min-w-0 flex-1 py-0.5 pr-1.5 ${secili ? 'outline-dashed outline-2 -outline-offset-2 outline-ada-mercan' : ''}`}
          style={{ background: `color-mix(in srgb, ${renk} ${yiginda ? 16 : 9}%, hsl(var(--card)))` }}
          data-kap-govdesi={anahtar}
        >
          {liste(l, anahtar)}
        </div>
      </div>
    );
  };

  const blokOgesi = (b: Blok, sira?: number): React.ReactNode => {
    const renk = KATEGORI_RENGI[kategori(b)];
    const yiginda = !!aktif?.yigin.includes(b.id);
    const simdiki = aktifSon === b.id;
    const hata = simdiki && !!aktif?.hata;
    const surukleniyor = surukleme?.kaynak.tur === 'tasi' && surukleme.kaynak.blokId === b.id;
    const sayim = sayimMetni(b, sayimlar?.[b.id]);
    const vurgu = vurgular?.[b.id];
    const halka = hata
      ? '0 0 0 3px hsl(var(--card)), 0 0 0 6px #d9534f'
      : simdiki
        ? '0 0 0 3px hsl(var(--card)), 0 0 0 6px #d9805f'
        : vurgu
          ? `0 0 0 3px hsl(var(--card)), 0 0 0 6px ${vurgu}`
          : undefined;
    const silDugmesi = duzenlenebilir && (
      <button
        type="button"
        data-surukleme-yok
        onClick={() => degis(cikar(programRef.current, b.id)[0])}
        className="ml-1 hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/15 text-white hover:bg-black/30 focus-visible:flex group-hover/blok:flex group-focus-within/blok:flex"
        aria-label={`${blokBasligi(b)} bloğunu sil`}
        title="Sil"
      >
        <SIMGE.kapat className="h-4 w-4" />
      </button>
    );
    const rozet = sayim && (
      <span className="ml-auto shrink-0 rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-extrabold tabular-nums text-ada-murekkep" data-sayim>
        {sayim}
      </span>
    );

    if (!govdeliMi(b)) {
      let icerik: React.ReactNode;
      if (b.tur === 'eylem') {
        icerik = (
          <>
            <EylemSimgesi eylem={b.eylem} className={kart ? 'h-7 w-7 shrink-0' : 'h-5 w-5 shrink-0'} />
            <span className="truncate">{EYLEM_ADI[b.eylem]}</span>
          </>
        );
      } else if (b.tur === 'cagir') {
        icerik = (
          <>
            <SIMGE.komut className="h-5 w-5 shrink-0" />
            <span className="truncate tracking-[0.02em]">{b.ad}</span>
          </>
        );
      } else {
        const adSec = duzenlenebilir && sozluk.degiskenler.length > 1;
        icerik = (
          <>
            <SIMGE.degisken className="h-5 w-5 shrink-0" />
            <span className={HAP} data-surukleme-yok={duzenlenebilir || undefined}>
              {adSec ? (
                <label className="relative inline-flex items-center rounded-full py-0.5 pl-1.5 pr-5 text-[#8a2f55] hover:bg-black/5">
                  {b.degisken}
                  <SIMGE.ok className="pointer-events-none absolute right-0.5 h-3 w-3 rotate-90" />
                  <select className="absolute inset-0 cursor-pointer opacity-0" value={b.degisken} onChange={(e) => gunc(b.id, { degisken: e.target.value })} aria-label="Değişkeni seç">
                    {sozluk.degiskenler.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <span className="px-1 text-[#8a2f55]">{b.degisken}</span>
              )}
              <span className="px-0.5 text-ada-murekkep/70">←</span>
              <IfadeCipleri ifade={b.ifade} sozluk={sozluk} duzenlenebilir={duzenlenebilir} onDegis={(ifade) => gunc(b.id, { ifade })} />
            </span>
          </>
        );
      }
      return (
        <div
          data-blok-id={b.id}
          tabIndex={0}
          role="group"
          aria-label={blokBasligi(b)}
          onKeyDown={(e) => blokTusu(e, b)}
          onPointerDown={(e) => basla(e, { tur: 'tasi', blokId: b.id })}
          className={`group/blok flex ${kart ? 'min-h-[54px] gap-3 pl-2 text-[17px]' : 'min-h-[44px] gap-2 px-3 text-[15px]'} select-none items-center rounded-[10px] pr-3 font-bold text-white outline-none transition-[box-shadow,opacity] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${duzenlenebilir ? 'cursor-grab active:cursor-grabbing' : ''} ${surukleniyor ? 'opacity-35' : ''}`}
          style={{ background: renk, boxShadow: halka ?? '0 1px 0 rgba(0,0,0,0.18), 0 2px 6px -2px rgba(0,0,0,0.25)', touchAction: duzenlenebilir ? 'none' : undefined }}
          data-aktif={simdiki || undefined}
          data-yiginda={yiginda || undefined}
        >
          {kart && sira !== undefined && (
            <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-white/95 px-1.5 text-[15px] font-extrabold tabular-nums text-ada-murekkep" data-adim-no>
              {sira}
            </span>
          )}
          {icerik}
          {rozet}
          {silDugmesi}
        </div>
      );
    }

    let baslikIcerigi: React.ReactNode;
    if (b.tur === 'tekrarlaKez') {
      baslikIcerigi = b.kezIfade ? (
        <>
          <span className={HAP} data-surukleme-yok={duzenlenebilir || undefined}>
            <IfadeCipleri ifade={b.kezIfade} sozluk={sozluk} duzenlenebilir={duzenlenebilir} onDegis={(kezIfade) => gunc(b.id, { kezIfade })} />
          </span>
          <span>kez tekrarla</span>
        </>
      ) : (
        <>
          {duzenlenebilir ? (
            <span className="flex items-center rounded-full bg-white/95 text-ada-murekkep" data-surukleme-yok>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-40" onClick={() => gunc(b.id, { kez: b.kez - 1 })} disabled={b.kez <= KEZ_EN_AZ} aria-label="Tekrar sayısını azalt">
                <SIMGE.eksi className="h-4 w-4" />
              </button>
              <span className={`min-w-[1.6rem] text-center ${kart ? 'text-[17px]' : 'text-[15px]'} font-extrabold tabular-nums`} aria-live="polite">
                {b.kez}
              </span>
              <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-40" onClick={() => gunc(b.id, { kez: b.kez + 1 })} disabled={b.kez >= KEZ_EN_COK} aria-label="Tekrar sayısını artır">
                <SIMGE.arti className="h-4 w-4" />
              </button>
            </span>
          ) : (
            <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[15px] font-extrabold tabular-nums text-ada-murekkep">{b.kez}</span>
          )}
          <span>kez tekrarla</span>
        </>
      );
    } else if (b.tur === 'tanim') {
      baslikIcerigi = (
        <>
          <span>tanımla</span>
          <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[14px] font-extrabold tracking-[0.02em] text-ada-murekkep">{b.ad}</span>
        </>
      );
    } else {
      const kosullar = b.tur === 'eger' ? kosulSecenekleri.eger : kosulSecenekleri.kadar;
      const kosul = b.kosul;
      baslikIcerigi = (
        <>
          {b.tur === 'eger' && <span>eğer</span>}
          {karsilastirmaMi(kosul) ? (
            <KarsilastirmaCipleri kosul={kosul} sozluk={sozluk} duzenlenebilir={duzenlenebilir} onDegis={(k) => gunc(b.id, { kosul: k })} />
          ) : (
            <KosulCipi kosul={kosul} metin={b.tur === 'eger' ? KOSUL_EGER : KOSUL_KADAR} secenekler={duzenlenebilir ? kosullar : []} onSec={(k) => gunc(b.id, { kosul: k })} />
          )}
          {karsilastirmaMi(kosul) && <span>{b.tur === 'eger' ? 'ise' : 'olana kadar'}</span>}
          {b.tur === 'tekrarlaKadar' && <span>tekrarla</span>}
        </>
      );
    }
    const baslikSimgesi =
      b.tur === 'eger' ? <SIMGE.eger className="h-5 w-5 shrink-0" /> : b.tur === 'tekrarlaKadar' ? <SIMGE.tekrarlaKadar className="h-5 w-5 shrink-0" /> : b.tur === 'tanim' ? <SIMGE.komut className="h-5 w-5 shrink-0" /> : <SIMGE.tekrarlaKez className="h-5 w-5 shrink-0" />;
    const kapSec = (anahtar: string) => (e: React.MouseEvent) => {
      if (!duzenlenebilir || (e.target as HTMLElement).closest('button, select, input, [data-ifade-secimi]') || performance.now() - sonBirakma.current < 250) return;
      setSeciliKap((s) => (s === anahtar ? null : anahtar));
    };

    return (
      <div
        data-blok-id={b.id}
        tabIndex={0}
        role="group"
        aria-label={blokBasligi(b)}
        onKeyDown={(e) => blokTusu(e, b)}
        className={`group/blok rounded-[12px] outline-none transition-[box-shadow,opacity] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${surukleniyor ? 'opacity-35' : ''}`}
        style={{ boxShadow: halka ?? '0 1px 0 rgba(0,0,0,0.16), 0 2px 8px -3px rgba(0,0,0,0.28)' }}
        data-aktif={simdiki || undefined}
        data-yiginda={yiginda || undefined}
        data-secili-kap={seciliKap === b.id || undefined}
      >
        <div
          onPointerDown={(e) => basla(e, { tur: 'tasi', blokId: b.id })}
          onClick={kapSec(b.id)}
          className={`flex min-h-[46px] select-none flex-wrap items-center gap-x-2 gap-y-1 rounded-t-[12px] px-3 py-1.5 ${kart ? 'text-[17px]' : 'text-[15px]'} font-bold text-white ${duzenlenebilir ? 'cursor-grab active:cursor-grabbing' : ''}`}
          style={{ background: renk, touchAction: duzenlenebilir ? 'none' : undefined }}
        >
          {kart && sira !== undefined && (
            <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-white/95 px-1.5 text-[15px] font-extrabold tabular-nums text-ada-murekkep" data-adim-no>
              {sira}
            </span>
          )}
          {baslikSimgesi}
          {baslikIcerigi}
          {rozet}
          {silDugmesi}
        </div>
        {kapGovdesi(renk, yiginda, b.id, b.govde)}
        {b.tur === 'eger' && b.degilse && (
          <>
            <div
              onClick={kapSec(b.id + DEGILSE)}
              className={`flex min-h-[34px] select-none items-center gap-2 px-3 text-[14px] font-bold text-white ${duzenlenebilir ? 'cursor-pointer' : ''}`}
              style={{ background: renk }}
              data-degilse
            >
              <SIMGE.degilse className="h-[18px] w-[18px] shrink-0" />
              değilse
            </div>
            {kapGovdesi(renk, yiginda, b.id + DEGILSE, b.degilse)}
          </>
        )}
        <div className="h-[12px] rounded-b-[12px]" style={{ background: renk }} />
      </div>
    );
  };

  // Araç kutusu çipleri
  const kutu = iskelet ?? aracKutusu;
  const iskeletModu = !!iskelet;

  const surukleneniGoster = () => {
    if (!surukleme) return null;
    const k = surukleme.kaynak;
    let icerik: React.ReactNode;
    if (k.tur === 'yeni') icerik = <SablonCipi s={k.sablon} />;
    else {
      const b = findBlok(program, k.blokId);
      const ic = b ? [...bloklar([b])].length - 1 : 0;
      icerik = b ? <SablonCipi s={blokSablonu(b)} ek={ic ? `+${ic}` : undefined} /> : null;
    }
    return createPortal(
      <div style={{ position: 'fixed', left: surukleme.x + 10, top: surukleme.y + 8, pointerEvents: 'none', zIndex: 2147483000, transform: 'rotate(-2deg)' }} data-surukleme-hayali>
        <div className={surukleme.sil ? 'opacity-60' : ''}>{icerik}</div>
        {surukleme.sil && <div className="mt-1 rounded-full bg-ada-mercan px-2.5 py-1 text-[12px] font-bold text-white shadow">Bırakınca silinir</div>}
      </div>,
      document.body
    );
  };

  return (
    <div ref={kokRef} className="flex h-full min-h-0 flex-col" data-blok-duzenleyici>
      {duzenlenebilir && kutu.length > 0 && (
        <div ref={kutuRef} className={`border-b border-border px-3 ${kompakt ? 'py-2' : 'py-3'} ${surukleme?.sil ? 'bg-ada-mercan/10' : ''}`} data-arac-kutusu>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">{iskeletModu ? 'Gereken bloklar' : kutuBasligi}</h3>
            <span className="text-[12px] font-semibold text-muted-foreground">{surukleme?.sil ? 'Silmek için buraya bırak' : 'Sürükle ya da dokun'}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {kutu.map((s, i) => {
              const kullanildi = iskeletModu && kullanilanIskelet.includes(i);
              return (
                <button
                  key={`${sablonAnahtari(s)}-${i}`}
                  type="button"
                  data-arac={sablonAnahtari(s)}
                  disabled={kullanildi}
                  onPointerDown={(e) => basla(e, { tur: 'yeni', sablon: s, iskeletSira: iskeletModu ? i : undefined })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      dokunEkle(s, iskeletModu ? i : undefined);
                    }
                  }}
                  className="rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-30"
                  style={{ touchAction: 'none' }}
                  aria-label={`${blokBasligi(s)} bloğunu ekle`}
                >
                  <SablonCipi s={s} buyuk={kart} />
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <h3 className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-muted-foreground">{baslik}</h3>
        <span className="flex items-center gap-2">
          {ek}
          <span className="text-[12px] font-bold tabular-nums text-muted-foreground" data-blok-sayisi>
            {n} {kart ? 'kart' : 'blok'}
            {enFazlaBlok !== undefined ? ` · en çok ${enFazlaBlok}` : ''}
          </span>
        </span>
      </div>
      <div
        ref={alanRef}
        className="relative min-h-0 flex-1 overflow-auto px-3 pb-4 pt-1"
        data-program-alani
        onClick={(e) => {
          if (e.target === e.currentTarget) setSeciliKap(null);
        }}
      >
        {program.length === 0 ? (
          <div data-yer="kok|0" className={`mt-1 flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed px-4 text-center transition-colors ${surukleme?.hedef ? 'border-ada-mercan bg-ada-mercan/10' : 'border-foreground/15'}`}>
            <span className="text-[15px] font-bold text-foreground">{duzenlenebilir ? 'Program boş' : 'Program yok'}</span>
            {duzenlenebilir && (
              <span className={`${kart ? 'text-[15px]' : 'text-[13px]'} font-medium text-muted-foreground`}>
                {kart ? 'Yukarıdaki kartlardan birine dokun ya da kartı buraya sürükle.' : 'Yukarıdaki bloklardan birini buraya sürükle ya da bloğa dokun.'}
              </span>
            )}
          </div>
        ) : (
          liste(program, null)
        )}
      </div>
      {typeof document !== 'undefined' && surukleneniGoster()}
    </div>
  );
}

function KosulCipi({ kosul, metin, secenekler, onSec }: { kosul: KosulTuru; metin: Record<KosulTuru, string>; secenekler: KosulTuru[]; onSec: (k: Kosul) => void }) {
  const icerik = (
    <>
      <KosulSimgesi kosul={kosul} className="h-[18px] w-[18px] shrink-0" />
      <span>{metin[kosul]}</span>
    </>
  );
  if (secenekler.length <= 1) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[14px] font-extrabold text-ada-murekkep">{icerik}</span>;
  }
  return (
    <label className="relative inline-flex items-center gap-1.5 rounded-full bg-white/95 py-1 pl-2.5 pr-7 text-[14px] font-extrabold text-ada-murekkep" data-surukleme-yok>
      {icerik}
      <SIMGE.ok className="pointer-events-none absolute right-2 h-3.5 w-3.5 rotate-90" />
      <select className="absolute inset-0 cursor-pointer opacity-0" value={kosul} onChange={(e) => onSec(e.target.value as KosulTuru)} aria-label="Koşulu seç">
        {secenekler.map((k) => (
          <option key={k} value={k}>
            {metin[k]}
          </option>
        ))}
      </select>
    </label>
  );
}

const SABLON_HAP = 'inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 text-[14px] font-extrabold text-ada-murekkep';

/** Araç kutusu ve sürükleme hayali için tek parça blok görünümü. */
export function SablonCipi({ s, ek, buyuk = false }: { s: BlokSablonu; ek?: string; buyuk?: boolean }) {
  const renk = KATEGORI_RENGI[kategori(s)];
  const govdeli = s.tur === 'tekrarlaKez' || s.tur === 'tekrarlaKadar' || s.tur === 'eger' || s.tur === 'tanim';
  let icerik: React.ReactNode;
  switch (s.tur) {
    case 'eylem':
      icerik = (
        <>
          <EylemSimgesi eylem={s.eylem} className={buyuk ? 'h-7 w-7 shrink-0' : 'h-5 w-5 shrink-0'} />
          {EYLEM_ADI[s.eylem]}
        </>
      );
      break;
    case 'tekrarlaKez':
      icerik = (
        <>
          <SIMGE.tekrarlaKez className="h-5 w-5 shrink-0" />
          <span className={`${SABLON_HAP} tabular-nums`}>{kezMetni(s)}</span>
          kez tekrarla
        </>
      );
      break;
    case 'tekrarlaKadar':
      icerik = (
        <>
          <SIMGE.tekrarlaKadar className="h-5 w-5 shrink-0" />
          <span className={SABLON_HAP}>
            {!karsilastirmaMi(s.kosul) && <KosulSimgesi kosul={s.kosul} className="h-4 w-4" />}
            {karsilastirmaMi(s.kosul) ? `${karsilastirmaMetni(s.kosul)} olana kadar` : KOSUL_KADAR[s.kosul]}
          </span>
          tekrarla
        </>
      );
      break;
    case 'eger':
      icerik = (
        <>
          <SIMGE.eger className="h-5 w-5 shrink-0" />
          eğer
          <span className={SABLON_HAP}>
            {!karsilastirmaMi(s.kosul) && <KosulSimgesi kosul={s.kosul} className="h-4 w-4" />}
            {karsilastirmaMi(s.kosul) ? `${karsilastirmaMetni(s.kosul)} ise` : KOSUL_EGER[s.kosul]}
          </span>
          {s.degilse && <span className="text-[13px] opacity-90">/ değilse</span>}
        </>
      );
      break;
    case 'ata':
      icerik = (
        <>
          <SIMGE.degisken className="h-5 w-5 shrink-0" />
          <span className={`${SABLON_HAP} tabular-nums`}>
            <span className="text-[#8a2f55]">{s.degisken}</span> ← {ifadeMetni(s.ifade)}
          </span>
        </>
      );
      break;
    case 'tanim':
      icerik = (
        <>
          <SIMGE.komut className="h-5 w-5 shrink-0" />
          tanımla
          <span className={SABLON_HAP}>{s.ad}</span>
        </>
      );
      break;
    case 'cagir':
      icerik = (
        <>
          <SIMGE.komut className="h-5 w-5 shrink-0" />
          <span className="tracking-[0.02em]">{s.ad}</span>
        </>
      );
      break;
  }
  return (
    <span
      className={`inline-flex select-none items-center font-bold text-white ${buyuk ? 'min-h-[56px] gap-2.5 px-4 text-[17px]' : 'min-h-[44px] gap-2 px-3 text-[15px]'} ${govdeli ? 'rounded-[10px] border-b-[6px]' : 'rounded-[10px]'}`}
      style={{ background: renk, borderBottomColor: govdeli ? 'rgba(0,0,0,0.22)' : undefined, boxShadow: '0 1px 0 rgba(0,0,0,0.18), 0 3px 8px -3px rgba(0,0,0,0.3)' }}
    >
      {icerik}
      {ek && <span className="rounded-full bg-black/20 px-1.5 text-[12px]">{ek}</span>}
    </span>
  );
}

function findBlok(p: Program, id: string): Blok | null {
  for (const b of bloklar(p)) if (b.id === id) return b;
  return null;
}

function blokSablonu(b: Blok): BlokSablonu {
  switch (b.tur) {
    case 'eylem':
      return { tur: 'eylem', eylem: b.eylem };
    case 'tekrarlaKez':
      return b.kezIfade ? { tur: 'tekrarlaKez', kez: b.kez, kezIfade: b.kezIfade } : { tur: 'tekrarlaKez', kez: b.kez };
    case 'tekrarlaKadar':
      return { tur: 'tekrarlaKadar', kosul: b.kosul };
    case 'eger':
      return { tur: 'eger', kosul: b.kosul, degilse: !!b.degilse };
    case 'ata':
      return { tur: 'ata', degisken: b.degisken, ifade: b.ifade };
    case 'tanim':
      return { tur: 'tanim', ad: b.ad };
    case 'cagir':
      return { tur: 'cagir', ad: b.ad };
  }
}
