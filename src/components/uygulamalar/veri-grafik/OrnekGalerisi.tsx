'use client';

/**
 * Veri ve Grafik — "Örnek veri" menüsünün içeriği: sınıf düzeyine göre gruplanmış örnek galerisi.
 *
 * Menü kabı (`role="menu"`, konum, en büyük yükseklik) ve klavye gezinmesi C'dedir; burada yalnız öğeler çizilir.
 * - En üstte, önceki tablo saklıysa "Önceki tabloya dön" (`data-onceki-tablo`) ve bir ayraç.
 * - Grup başlıkları (`ORNEK_KONULARI.ad`) bütün satırı kaplar; öğeler geniş menüde iki, darda tek sütundur.
 * - Her öğe (≥ 56 px): örneğin kendi verisinden çizilmiş küçük grafik (önerilen grafik türünde), ad (ilk `span`),
 *   kısa açıklama, sınıf rozeti; yüklü örnekte onay işareti ve `aria-current`.
 */
import React from 'react';
import { degiskenSutunlari, kategoriler, kategoriRengi } from './kategorik';
import { seriRengi } from './grafik';
import { onerilenSekme } from './rehber';
import { gecerliDegerler, ornekKonulari, type OrnekVeri, type VeriTablosu } from './veri';

export interface OrnekGalerisiProps {
  /** Tabloya bağlı (yüklü) örneğin kimliği */
  yukluOrnekId: string | null;
  /** Saklanan önceki tablo: adı ve satır sayısı */
  onceki: { ad: string; satirSayisi: number } | null;
  onYukle: (id: string) => void;
  onOncekiTabloyaDon: () => void;
  /** Menünün genişliği (px): 700'ün altında tek sütun */
  genislik: number;
}

/** Bu genişlikten itibaren öğeler iki sütun */
export const GALERI_IKI_SUTUN = 700;

// ── Küçük grafik (40 × 40; çizim alanı 7..33) ────────────────────────────────────────────────────────────────

const A0 = 7;
const A1 = 33;
const ALAN = A1 - A0;

function yuvarla(n: number): number {
  return Math.round(n * 100) / 100;
}

function sutunBul(tablo: VeriTablosu, ad: string | undefined): number {
  return ad ? tablo.sutunlar.findIndex((s) => s.ad === ad) : -1;
}

function metinler(tablo: VeriTablosu, sutun: number, satirlar?: number[]): string[] {
  const indeksler = satirlar ?? tablo.satirlar.map((_, i) => i);
  return indeksler.map((i) => (tablo.satirlar[i]?.hucreler[sutun] ?? '').trim()).filter((m) => m !== '');
}

/** Sayı dizisini [a, b] aralığına ölçekleyen işlev (tek değerde ortası) */
function olcek(min: number, max: number, a: number, b: number): (v: number) => number {
  if (!(max > min)) return () => (a + b) / 2;
  return (v) => a + ((v - min) / (max - min)) * (b - a);
}

/** Yığılmış nokta sütunları: her sütunun sayısı, rengi ve yatay konumu; noktalar alttan yukarı */
function noktaYiginlari(
  yiginlar: { x: number; sayi: number; renk: string }[],
  taban: number,
  yukseklik: number,
  enGenis: number,
  onEk = '',
): React.ReactNode[] {
  const enCok = Math.max(1, ...yiginlar.map((y) => y.sayi));
  const cap = Math.min(4.4, yukseklik / enCok, enGenis);
  const r = yuvarla(Math.max(0.7, cap * 0.42));
  const sekiller: React.ReactNode[] = [];
  yiginlar.forEach((y, i) => {
    for (let k = 0; k < y.sayi; k++) {
      sekiller.push(<circle key={`${onEk}${i}-${k}`} cx={yuvarla(y.x)} cy={yuvarla(taban - cap * (k + 0.5))} r={r} fill={y.renk} />);
    }
  });
  return sekiller;
}

function tabanCizgisi(y: number, anahtar: string): React.ReactNode {
  return <path key={anahtar} d={`M${A0 - 1} ${yuvarla(y)}H${A1 + 1}`} stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />;
}

/** Örneğin önerilen grafiğini kendi verisiyle küçük çizer (sınırlı: en çok birkaç yüz şekil) */
function miniSekiller(ornek: OrnekVeri): React.ReactNode[] {
  const tablo = ornek.olustur();
  const tur = onerilenSekme(ornek);
  const degiskenler = degiskenSutunlari(tablo);
  const degiskenMi = (i: number) => i >= 0 && degiskenler.some((s) => s.id === tablo.sutunlar[i]?.id);
  let ana = sutunBul(tablo, ornek.varsayilanDegisken);
  if (!degiskenMi(ana)) {
    const s = degiskenler.find((x) => x.tur === 'sayi') ?? degiskenler[0];
    ana = s ? tablo.sutunlar.indexOf(s) : -1;
  }
  if (ana < 0) return [];
  const kategorik = tablo.sutunlar[ana].tur === 'etiket';
  const sira = (i: number) => ornek.kategoriSirasi?.[tablo.sutunlar[i]?.ad ?? ''];
  const sayilar = (i: number, satirlar?: number[]) => {
    const kume = satirlar ? new Set(satirlar) : null;
    return gecerliDegerler(tablo, i)
      .filter((d) => !kume || kume.has(d.satir))
      .map((d) => d.deger);
  };

  if (tur === 'daire') {
    const degerler = gecerliDegerler(tablo, ana).filter((d) => d.deger > 0);
    const toplam = degerler.reduce((t, d) => t + d.deger, 0);
    if (toplam <= 0) return [];
    let aci = -Math.PI / 2;
    const [cx, cy, r] = [20, 20, 13];
    return degerler.map((d, i) => {
      const pay = (d.deger / toplam) * Math.PI * 2;
      const [x1, y1] = [cx + r * Math.cos(aci), cy + r * Math.sin(aci)];
      aci += pay;
      const [x2, y2] = [cx + r * Math.cos(aci), cy + r * Math.sin(aci)];
      const etiket = (tablo.satirlar[d.satir]?.hucreler[0] ?? '').trim();
      const yol = `M${cx} ${cy}L${yuvarla(x1)} ${yuvarla(y1)}A${r} ${r} 0 ${pay > Math.PI ? 1 : 0} 1 ${yuvarla(x2)} ${yuvarla(y2)}Z`;
      return <path key={i} d={yol} fill={kategoriRengi(etiket, i)} stroke="hsl(var(--muted))" strokeWidth={0.8} />;
    });
  }

  if (tur === 'cizgi') {
    const noktalar = gecerliDegerler(tablo, ana);
    if (noktalar.length === 0) return [];
    const vs = noktalar.map((n) => n.deger);
    const y = olcek(Math.min(...vs), Math.max(...vs), A1 - 1, A0 + 2);
    const x = olcek(0, Math.max(1, noktalar.length - 1), A0, A1);
    const yol = noktalar.map((n, i) => `${i === 0 ? 'M' : 'L'}${yuvarla(x(i))} ${yuvarla(y(n.deger))}`).join('');
    return [
      tabanCizgisi(A1 + 1, 'taban'),
      <path key="cizgi" d={yol} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />,
      ...noktalar.map((n, i) => <circle key={i} cx={yuvarla(x(i))} cy={yuvarla(y(n.deger))} r={1.3} fill="currentColor" />),
    ];
  }

  if (tur === 'sacilim') {
    const sayisal = degiskenler.filter((s) => s.tur === 'sayi').map((s) => tablo.sutunlar.indexOf(s));
    if (sayisal.length < 2) return [];
    const [xi, yi] = sayisal;
    const renkI = sutunBul(tablo, ornek.renkDegisken);
    const renkSira = renkI >= 0 ? kategoriler(metinler(tablo, renkI), sira(renkI)) : [];
    const yDegeri = new Map(gecerliDegerler(tablo, yi).map((d) => [d.satir, d.deger]));
    const ciftler = gecerliDegerler(tablo, xi)
      .filter((d) => yDegeri.has(d.satir))
      .map((d) => ({ satir: d.satir, x: d.deger, y: yDegeri.get(d.satir) as number, k: renkI >= 0 ? (tablo.satirlar[d.satir].hucreler[renkI] ?? '').trim() : '' }));
    if (ciftler.length === 0) return [];
    const x = olcek(Math.min(...ciftler.map((c) => c.x)), Math.max(...ciftler.map((c) => c.x)), A0 + 2, A1 - 1);
    const y = olcek(Math.min(...ciftler.map((c) => c.y)), Math.max(...ciftler.map((c) => c.y)), A1 - 2, A0 + 1);
    return [
      <path key="eksen" d={`M${A0 - 1} ${A0 - 1}V${A1 + 1}H${A1 + 1}`} fill="none" stroke="currentColor" strokeOpacity={0.35} strokeWidth={1} />,
      ...ciftler.map((c) => {
        const k = renkSira.indexOf(c.k);
        return <circle key={c.satir} cx={yuvarla(x(c.x))} cy={yuvarla(y(c.y))} r={1.6} fill={k >= 0 ? kategoriRengi(c.k, k) : 'currentColor'} />;
      }),
    ];
  }

  if (tur === 'sutun' && !kategorik) {
    // Her satır bir sütun; sıfırın altındaki değerler aşağı iner
    const noktalar = gecerliDegerler(tablo, ana);
    if (noktalar.length === 0) return [];
    const vs = noktalar.map((n) => n.deger);
    const y = olcek(Math.min(0, ...vs), Math.max(0, ...vs), A1, A0);
    const adim = ALAN / noktalar.length;
    const sifir = y(0);
    return [
      ...noktalar.map((n, i) => {
        const ust = Math.min(sifir, y(n.deger));
        const boy = Math.max(0.8, Math.abs(y(n.deger) - sifir));
        return <rect key={i} x={yuvarla(A0 + adim * i + adim * 0.15)} y={yuvarla(ust)} width={yuvarla(adim * 0.7)} height={yuvarla(boy)} rx={0.4} fill={n.deger < 0 ? seriRengi(1) : 'currentColor'} />;
      }),
      tabanCizgisi(sifir, 'sifir'),
    ];
  }

  if (kategorik) {
    // Kategorik nokta ya da sütun: her kategori bir yığın; sütunda renk anahtarına göre katmanlı
    const kats = kategoriler(metinler(tablo, ana), sira(ana)).slice(0, 8);
    if (kats.length === 0) return [];
    const adim = ALAN / kats.length;
    const renkI = sutunBul(tablo, ornek.renkDegisken);
    const sayim = (k: string, satirlar?: number[]) => metinler(tablo, ana, satirlar).filter((m) => m === k).length;
    if (tur === 'sutun') {
      const enCok = Math.max(1, ...kats.map((k) => sayim(k)));
      const birim = (ALAN - 1) / enCok;
      const katmanlar = renkI >= 0 ? kategoriler(metinler(tablo, renkI), sira(renkI)) : [null];
      const sekiller: React.ReactNode[] = [];
      kats.forEach((k, i) => {
        let taban = A1;
        katmanlar.forEach((katman, j) => {
          const satirlar = katman === null ? undefined : tablo.satirlar.map((_, s) => s).filter((s) => (tablo.satirlar[s].hucreler[renkI] ?? '').trim() === katman);
          const n = sayim(k, satirlar);
          if (n === 0) return;
          const boy = n * birim;
          taban -= boy;
          sekiller.push(
            <rect key={`${i}-${j}`} x={yuvarla(A0 + adim * i + adim * 0.14)} y={yuvarla(taban)} width={yuvarla(adim * 0.72)} height={yuvarla(boy)} fill={katman === null ? 'currentColor' : kategoriRengi(katman, j)} />,
          );
        });
      });
      return [...sekiller, tabanCizgisi(A1, 'taban')];
    }
    return [
      ...noktaYiginlari(
        kats.map((k, i) => ({ x: A0 + adim * (i + 0.5), sayi: sayim(k), renk: kategoriRengi(k, i) })),
        A1 - 0.5,
        ALAN - 1,
        adim * 0.9,
      ),
      tabanCizgisi(A1, 'taban'),
    ];
  }

  // Sayısal nokta grafiği: değerler kutulara yığılır; gruplama ya da karşılaştırma varsa alt alta paneller (ortak eksen)
  const seriler: { degerler: number[]; renk: string }[] = [];
  const grupI = sutunBul(tablo, ornek.grupla);
  const karsiI = sutunBul(tablo, ornek.karsilastir);
  if (grupI >= 0 && tablo.sutunlar[grupI].tur === 'etiket') {
    kategoriler(metinler(tablo, grupI), sira(grupI))
      .slice(0, 3)
      .forEach((k, j) => {
        const satirlar = tablo.satirlar.map((_, s) => s).filter((s) => (tablo.satirlar[s].hucreler[grupI] ?? '').trim() === k);
        seriler.push({ degerler: sayilar(ana, satirlar), renk: kategoriRengi(k, j) });
      });
  } else if (karsiI >= 0 && karsiI !== ana && tablo.sutunlar[karsiI].tur === 'sayi') {
    seriler.push({ degerler: sayilar(ana), renk: 'currentColor' }, { degerler: sayilar(karsiI), renk: seriRengi(1) });
  } else {
    seriler.push({ degerler: sayilar(ana), renk: 'currentColor' });
  }
  const tumu = seriler.flatMap((s) => s.degerler);
  if (tumu.length === 0) return [];
  const [min, max] = [Math.min(...tumu), Math.max(...tumu)];
  const farkli = new Set(tumu).size;
  const kutuSayisi = Math.max(1, Math.min(farkli, 9));
  const kutu = (v: number) => (max > min ? Math.min(kutuSayisi - 1, Math.floor(((v - min) / (max - min)) * kutuSayisi)) : 0);
  const kutuX = (b: number) => (kutuSayisi === 1 ? (A0 + A1) / 2 : A0 + 1 + (b / (kutuSayisi - 1)) * (ALAN - 2));
  const panel = ALAN / seriler.length;
  const sekiller: React.ReactNode[] = [];
  seriler.forEach((s, j) => {
    const sayim = new Array<number>(kutuSayisi).fill(0);
    s.degerler.forEach((v) => sayim[kutu(v)]++);
    const taban = A0 + panel * (j + 1) - 0.5;
    sekiller.push(
      ...noktaYiginlari(
        sayim.map((n, b) => ({ x: kutuX(b), sayi: n, renk: s.renk })).filter((y) => y.sayi > 0),
        taban,
        panel - 1.5,
        ALAN / kutuSayisi,
        `${j}-`,
      ),
      tabanCizgisi(taban + 0.5, `taban-${j}`),
    );
  });
  return sekiller;
}

/** Örnek veriler sabittir: küçük grafikler bir kez hesaplanır */
const MINI_ONBELLEK = new Map<string, React.ReactNode[]>();

function MiniGrafik({ ornek, yuklu }: { ornek: OrnekVeri; yuklu: boolean }) {
  let sekiller = MINI_ONBELLEK.get(ornek.id);
  if (!sekiller) {
    sekiller = miniSekiller(ornek);
    MINI_ONBELLEK.set(ornek.id, sekiller);
  }
  return (
    <svg
      viewBox="0 0 40 40"
      className="col-start-1 row-span-2 row-start-1 h-10 w-10 shrink-0 self-center text-ada-deniz dark:text-ada-vurgu"
      aria-hidden="true"
      focusable="false"
      data-mini-grafik={onerilenSekme(ornek)}
    >
      <rect x="0.5" y="0.5" width="39" height="39" rx="8" className={yuklu ? 'fill-card stroke-primary' : 'fill-muted stroke-border'} strokeWidth={yuklu ? 1.5 : 1} />
      {sekiller}
    </svg>
  );
}

// ── Öğeler ───────────────────────────────────────────────────────────────────────────────────────────────────

const OGE =
  'grid min-h-[56px] w-full grid-cols-[40px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-0 rounded-[calc(var(--radius)-8px)] px-2 py-1.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring';

function OnaySimgesi() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-primary dark:text-[#9fe0d9]" aria-hidden="true" focusable="false">
      <path d="M3.2 8.6 6.4 11.6 12.8 4.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrnekOgesi({ ornek, yuklu, onYukle }: { ornek: OrnekVeri; yuklu: boolean; onYukle: (id: string) => void }) {
  const gercek = ornek.kaynak.tur === 'gercek';
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={`${OGE} ${yuklu ? 'bg-accent/70' : ''}`}
      aria-current={yuklu ? 'true' : undefined}
      onClick={() => onYukle(ornek.id)}
      data-ornek={ornek.id}
    >
      <MiniGrafik ornek={ornek} yuklu={yuklu} />
      {/* İlk span'ın metni örneğin adıdır (tur ve galeri betikleri buna dayanır): onay işareti metinsiz SVG */}
      <span className="col-start-2 row-start-1 flex min-w-0 items-center gap-1.5 text-[13px] font-bold leading-[18px]">
        <span className="min-w-0 truncate">{ornek.ad}</span>
        {yuklu && <OnaySimgesi />}
      </span>
      <span className="col-start-2 row-start-2 flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[12px] leading-4 text-muted-foreground" title={ornek.aciklama}>
          {ornek.aciklama}
        </span>
        {gercek && (
          <span className="shrink-0 rounded-full bg-ada-vurgu/[0.16] px-1.5 text-[12px] font-bold leading-[18px] text-ada-deniz-koyu dark:bg-ada-vurgu/[0.25] dark:text-[#9fe0d9]" data-gercek-veri>
            Gerçek veri
          </span>
        )}
        {ornek.sinif !== null && (
          <span className="shrink-0 rounded-full bg-muted px-1.5 text-[12px] font-semibold leading-[18px] text-muted-foreground" data-sinif-rozeti>
            {ornek.sinif}. sınıf
          </span>
        )}
      </span>
    </button>
  );
}

/** "Önceki tabloya dön" simgesi: iki yönlü ok */
function OncekiSimgesi() {
  return (
    <svg viewBox="0 0 40 40" className="col-start-1 row-span-2 row-start-1 h-10 w-10 shrink-0 self-center text-primary dark:text-[#9fe0d9]" aria-hidden="true" focusable="false">
      <rect x="0.5" y="0.5" width="39" height="39" rx="20" className="fill-muted stroke-border" strokeWidth={1} />
      <path d="M12 16.5h15.5M23.5 12.5l4 4-4 4M28 23.5H12.5M16.5 19.5l-4 4 4 4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OrnekGalerisi({ yukluOrnekId, onceki, onYukle, onOncekiTabloyaDon, genislik }: OrnekGalerisiProps) {
  const ikiSutun = genislik >= GALERI_IKI_SUTUN;
  const konular = ornekKonulari();
  return (
    <div data-ornek-galerisi={ikiSutun ? 'iki-sutun' : 'tek-sutun'}>
      {onceki && (
        <>
          <button type="button" role="menuitem" tabIndex={-1} className={OGE} onClick={onOncekiTabloyaDon} data-onceki-tablo>
            <OncekiSimgesi />
            <span className="col-start-2 row-start-1 truncate text-[13px] font-bold leading-[18px]">Önceki tabloya dön</span>
            <span className="col-start-2 row-start-2 truncate text-[12px] leading-4 text-muted-foreground">
              {onceki.ad} · {onceki.satirSayisi} satır
            </span>
          </button>
          <div role="separator" className="mx-1 my-1 h-px bg-border" />
        </>
      )}
      <div className={`grid gap-x-2 ${ikiSutun ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {konular.map((k, i) => (
          <div key={k.id} role="group" aria-label={k.ad} className="contents" data-ornek-konusu={k.id}>
            <p
              aria-hidden="true"
              className={`col-span-full px-2 pb-0.5 text-[12px] font-bold uppercase leading-4 tracking-[0.04em] text-muted-foreground ${i === 0 ? 'pt-1' : 'pt-2'}`}
            >
              {k.ad}
            </p>
            {k.ornekler.map((o) => (
              <OrnekOgesi key={o.id} ornek={o} yuklu={o.id === yukluOrnekId} onYukle={onYukle} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
