import React from 'react';
import {
  type Dugum, type YazimAyari, VARSAYILAN_YAZIM, duzMetin, metniCozumle, metniSeslendir, yazimImzasi,
} from '@/math/matematikYazimi';

/**
 * Panel, komut yanıtı ve ipucu çubuğu için HTML gösterimi — tuval etiketiyle AYNI model.
 *
 * Ölçüm gerekmez: süs, harflerin kapladığı satır içi kutuya yayılan küçük bir SVG'dir
 * (preserveAspectRatio="none" + vector-effect="non-scaling-stroke": genişliğe uyar, kalınlığı sabit kalır).
 * Süs satır yüksekliğini DEĞİŞTİRMEZ (mutlak konumlu, top: -0,28em): panel yanıttan yanıta zıplamaz.
 * Mutlak değer çizgileri kenarlıktır (Manrope'ta '|' karakteri büyük I'dan ayırt edilemez).
 *
 * Erişilebilirlik ve kopyalama:
 *  - Görsel kısım aria-hidden; ekran okuyucu sr-only SÖZCÜK biçimini okur (canlı bölgelerde de çalışır).
 *  - Görsel kısımda gizli "kopya harfleri" (|, ∠, U+0361) vardır: seçip kopyalayınca düz metin
 *    ("m(∠ABC) = 60°", "|A͡B| ≈ 7,12 br") gelir. Sözcük biçimi user-select:none olduğu için kopyaya girmez.
 *  - data-duz: düz metin (doğrulama betikleri textContent yerine bunu okur).
 *
 * İki kullanım: canlı nesne satırları hazır düğümleri verir (`dugumler` + `sesli`), komut yanıtı ve ipucu
 * düz metin verir (`metin`, çözümleme önbellekli).
 */

const GIZLI: React.CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden',
  clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0,
};
const Kopya = ({ s }: { s: string }) => <span style={GIZLI}>{s}</span>;

const SUS_YOLU: Record<'sapka' | 'yay' | 'ucgen', string> = {
  sapka: 'M3,9 L50,1.5 L97,9',
  yay: 'M3,9.5 Q50,-3 97,9.5',
  ucgen: 'M4,9.5 L50,1 L96,9.5 Z',
};

/**
 * Aksanlı büyük harfler (İ'nin noktası, Ğ'nin çentiği, Ö/Ü'nün iki noktası) düz büyük harften
 * 0,14 em daha yükseğe çıkar. SVG çizici bunu AKSANLI = 0,87 em ile hesaba katıyor (yazimDuzeni.ts);
 * burada da süs aynı kadar yukarı alınır, yoksa şapka İÇĞ'nin işaretlerinin tam üstüne oturuyordu.
 */
const AKSAN = /[İÖÜĞŞÂÎÛ]/;
const SUS_UST = -0.28;
const SUS_AKSAN_PAYI = 0.14;

function Sus({ tur, children, kopyaOn, aksanli }: { tur: 'sapka' | 'yay' | 'ucgen'; children: React.ReactNode; kopyaOn?: string; aksanli?: boolean }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', lineHeight: 1 }}>
      {kopyaOn && <Kopya s={kopyaOn} />}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        style={{ position: 'absolute', left: '0.04em', top: `${(aksanli ? SUS_UST - SUS_AKSAN_PAYI : SUS_UST).toFixed(2)}em`, width: 'calc(100% - 0.08em)', height: '0.3em', overflow: 'visible' }}
      >
        <path d={SUS_YOLU[tur]} fill="none" stroke="currentColor" strokeWidth={1.4} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </span>
  );
}

/** Kesirde pay ya da payda mutlak değerse '/' iki yana biraz açılır ('|AC| / |BC|' çakışmasın). */
const kesirPayi = (pay: Dugum[], payda: Dugum[]) =>
  pay.some((d) => d.t === 'mutlak') || payda.some((d) => d.t === 'mutlak') ? '0 0.12em' : undefined;

function Dugumler({ d }: { d: Dugum[] }) {
  return (
    <>
      {d.map((x, i) => {
        switch (x.t) {
          case 'sembol': return <React.Fragment key={i}>{x.s}</React.Fragment>;
          case 'ad': {
            // A_1 → A + gerçek alt indis, B' → B′ (tuval çizicisiyle AYNI kural: yazimDuzeni.yerlestir).
            // Alt indisin önündeki gizli '_' kopyada 'A_1' gelmesini sağlar.
            const m = x.s.match(/^(\p{L})(?:_(\d+))?('*)$/u);
            if (!m) return <React.Fragment key={i}>{x.s.replace(/'/g, '′')}</React.Fragment>;
            return (
              <React.Fragment key={i}>
                {m[1]}
                {m[2] && <><Kopya s="_" /><span style={{ fontSize: '0.68em', verticalAlign: 'sub', lineHeight: 1 }}>{m[2]}</span></>}
                {m[3] && '′'.repeat(m[3].length)}
              </React.Fragment>
            );
          }
          case 'kelime': return <span key={i} style={x.soluk ? { opacity: 0.7 } : undefined}>{x.s}</span>;
          case 'sayi': return <React.Fragment key={i}>{x.s.replace('-', '−')}</React.Fragment>;
          case 'birim': return <React.Fragment key={i}>{x.s === '°' ? '°' : ` ${x.s}`}</React.Fragment>;
          case 'kesir':
            return (
              <React.Fragment key={i}>
                <Dugumler d={x.pay} />
                <span style={{ margin: kesirPayi(x.pay, x.payda) }}>/</span>
                <Dugumler d={x.payda} />
              </React.Fragment>
            );
          case 'mutlak':
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block', borderLeft: '0.085em solid currentColor', borderRight: '0.085em solid currentColor',
                  padding: '0 0.12em', margin: '0 0.06em', lineHeight: 1.05,
                }}
              >
                <Kopya s="|" />
                <Dugumler d={x.ic} />
                <Kopya s="|" />
              </span>
            );
          case 'sus': {
            const aksanli = AKSAN.test(duzMetin(x.ic));
            if (x.tur === 'yay') {
              // Kopyada A͡B: harflerin arasına U+0361
              const harfler = x.ic.map((y) => duzMetin([y]));
              return (
                <Sus key={i} tur="yay" aksanli={aksanli}>
                  {harfler.map((h, j) => <React.Fragment key={j}>{j > 0 && <Kopya s={'͡'} />}{h}</React.Fragment>)}
                </Sus>
              );
            }
            return (
              <Sus key={i} tur={x.tur} aksanli={aksanli} kopyaOn={x.tur === 'ucgen' ? '△' : x.ic.length > 1 ? '∠' : undefined}>
                <Dugumler d={x.ic} />
                {x.tur === 'sapka' && x.ic.length === 1 && <Kopya s={'̂'} />}
              </Sus>
            );
          }
        }
      })}
    </>
  );
}

export interface MatematikMetniProps {
  /** Düz metin (komut yanıtı, ipucu). metniCozumle ile süslü gösterime çevrilir (önbellekli). */
  metin?: string;
  /** Ya da hazır görüntü ağacı (canlı panel satırı) — çözümleme ve seslendirme yapılmaz. */
  dugumler?: Dugum[];
  /** Ekran okuyucu metni; verilmezse metniSeslendir(düz metin) */
  sesli?: string;
  ayar?: YazimAyari;
  className?: string;
  title?: string;
  /** Sarmalayıcı etiket (varsayılan 'span') */
  as?: 'span' | 'div';
}

function Metin({ metin, dugumler, sesli, ayar = VARSAYILAN_YAZIM, className, title, as = 'span' }: MatematikMetniProps) {
  const d = dugumler ?? metniCozumle(metin ?? '', ayar);
  const duz = metin ?? duzMetin(d);
  const Kap = as;
  return (
    <Kap className={className} data-duz={duz} title={title}>
      <span aria-hidden="true"><Dugumler d={d} /></span>
      <span style={{ ...GIZLI, userSelect: 'none' }}>{sesli ?? metniSeslendir(duz)}</span>
    </Kap>
  );
}

export function metinEsit(a: MatematikMetniProps, b: MatematikMetniProps): boolean {
  if (a.metin !== b.metin || a.sesli !== b.sesli || a.className !== b.className) return false;
  if (a.title !== b.title || a.as !== b.as) return false;
  if ((a.ayar ?? VARSAYILAN_YAZIM).olcuYazimi !== (b.ayar ?? VARSAYILAN_YAZIM).olcuYazimi) return false;
  if ((a.ayar ?? VARSAYILAN_YAZIM).aciYazimi !== (b.ayar ?? VARSAYILAN_YAZIM).aciYazimi) return false;
  if (a.dugumler === b.dugumler) return true;
  if (!a.dugumler || !b.dugumler) return false;
  return yazimImzasi([a.dugumler]) === yazimImzasi([b.dugumler]);
}

export const MatematikMetni = React.memo(Metin, metinEsit);
