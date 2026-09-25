'use client';

/**
 * Akış şeması (7–8. sınıf): programın canlı aynası. Ders kitabı simgeleri: BAŞLA / BİTİR oval, işlem
 * dikdörtgen, karar eşkenar dörtgen, sayılı döngü altıgen (hazırlık simgesi), kendi komut çağrısı çift
 * kenarlı dikdörtgen. Döngüler geri dönen okla, kararın kolları "Evet" / "Hayır" etiketiyle çizilir.
 * Komut tanımları ana şemanın yanında ayrı birer şema olur. Çalışırken yığındaki kutular renklenir,
 * şu anki kutu mercan çerçeve alır.
 *
 * Yerleşim yapısaldır: her yapı bir eksen çevresinde (sol, sağ genişlik ve yükseklik) ölçülür, sonra
 * eksen x'i ve üst y'si verilerek çizilir.
 */
import React from 'react';
import { EYLEM_ADI, atamaMetni, kezMetni, kosulMetni, type Blok, type Program } from './program';
import { KATEGORI_RENGI, kategori, type AktifDurum } from './BlokDuzenleyici';

const ARA = 26;
const YAZI = 13;
const KUTU_Y = 36;
const KARAR_Y = 54;
const ALTIGEN_Y = 40;
const OVAL_Y = 34;
const PAY = 22;

interface Yapi {
  sol: number;
  sag: number;
  boy: number;
  ciz: (x: number, y: number, e: React.ReactNode[]) => void;
}

function yaziEni(s: string): number {
  // Manrope 13px ortalama harf eni ~7.2px; büyük harfler biraz daha geniş
  let n = 0;
  for (const c of s) n += /[A-ZÇĞİÖŞÜ]/.test(c) ? 8.6 : /[ .,:]/.test(c) ? 4 : 7.2;
  return n;
}

interface Baglam {
  aktif: AktifDurum | null;
  son: string | null;
  anahtar: { n: number };
}

function renkler(b: Blok | null, bg: Baglam) {
  const renk = b ? KATEGORI_RENGI[kategori(b)] : '#3c5a56';
  const yiginda = !!b && !!bg.aktif?.yigin.includes(b.id);
  const simdiki = !!b && bg.son === b.id;
  const hata = simdiki && !!bg.aktif?.hata;
  return {
    renk,
    dolgu: `color-mix(in srgb, ${renk} ${yiginda ? 30 : 12}%, hsl(var(--card)))`,
    cizgi: hata ? '#d9534f' : simdiki ? '#d9805f' : renk,
    kalinlik: simdiki ? 3.5 : 1.8,
  };
}

function metinOgesi(x: number, y: number, s: string, k: string, kalin = true) {
  return (
    <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={YAZI} fontWeight={kalin ? 700 : 600} fill="currentColor">
      {s}
    </text>
  );
}

function ok(x1: number, y1: number, x2: number, y2: number, k: string, basliksiz = false) {
  return <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.6} markerEnd={basliksiz ? undefined : 'url(#akis-ok)'} />;
}

function yol(noktalar: [number, number][], k: string, basli = true) {
  const d = noktalar.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  return <path key={k} d={d} fill="none" stroke="currentColor" strokeOpacity={0.55} strokeWidth={1.6} markerEnd={basli ? 'url(#akis-ok)' : undefined} />;
}

function etiket(x: number, y: number, s: string, k: string, sol = false) {
  return (
    <text key={k} x={x} y={y} textAnchor={sol ? 'end' : 'start'} dominantBaseline="central" fontSize={11.5} fontWeight={700} fill="currentColor" fillOpacity={0.62}>
      {s}
    </text>
  );
}

/** Dikdörtgen (işlem), çift kenarlı (komut çağrısı) ya da oval (başla / bitir) */
function kutu(metin: string, b: Blok | null, bg: Baglam, bicim: 'islem' | 'cagri' | 'oval'): Yapi {
  const en = Math.min(280, Math.max(bicim === 'oval' ? 96 : 120, yaziEni(metin) + 30));
  const boy = bicim === 'oval' ? OVAL_Y : KUTU_Y;
  return {
    sol: en / 2,
    sag: en / 2,
    boy,
    ciz: (x, y, e) => {
      const r = renkler(b, bg);
      const k = `k${bg.anahtar.n++}`;
      e.push(
        <g key={k} data-akis-blok={b?.id}>
          <rect x={x - en / 2} y={y} width={en} height={boy} rx={bicim === 'oval' ? boy / 2 : 6} fill={r.dolgu} stroke={r.cizgi} strokeWidth={r.kalinlik} />
          {bicim === 'cagri' && (
            <>
              <line x1={x - en / 2 + 9} y1={y} x2={x - en / 2 + 9} y2={y + boy} stroke={r.cizgi} strokeWidth={1.4} />
              <line x1={x + en / 2 - 9} y1={y} x2={x + en / 2 - 9} y2={y + boy} stroke={r.cizgi} strokeWidth={1.4} />
            </>
          )}
          {metinOgesi(x, y + boy / 2, metin, `${k}-y`)}
        </g>
      );
    },
  };
}

/** Karar (eşkenar dörtgen) ya da sayılı döngü (altıgen) başlığı */
function bas(metin: string, b: Blok, bg: Baglam, bicim: 'karar' | 'altigen'): { en: number; boy: number; ciz: (x: number, y: number, e: React.ReactNode[]) => void } {
  const en = Math.min(300, Math.max(bicim === 'karar' ? 132 : 128, yaziEni(metin) + (bicim === 'karar' ? 64 : 40)));
  const boy = bicim === 'karar' ? KARAR_Y : ALTIGEN_Y;
  return {
    en,
    boy,
    ciz: (x, y, e) => {
      const r = renkler(b, bg);
      const k = `k${bg.anahtar.n++}`;
      const nok =
        bicim === 'karar'
          ? `${x},${y} ${x + en / 2},${y + boy / 2} ${x},${y + boy} ${x - en / 2},${y + boy / 2}`
          : `${x - en / 2 + 14},${y} ${x + en / 2 - 14},${y} ${x + en / 2},${y + boy / 2} ${x + en / 2 - 14},${y + boy} ${x - en / 2 + 14},${y + boy} ${x - en / 2},${y + boy / 2}`;
      e.push(
        <g key={k} data-akis-blok={b.id}>
          <polygon points={nok} fill={r.dolgu} stroke={r.cizgi} strokeWidth={r.kalinlik} strokeLinejoin="round" />
          {metinOgesi(x, y + boy / 2, metin, `${k}-y`)}
        </g>
      );
    },
  };
}

function dizi(liste: Blok[], bg: Baglam): Yapi {
  const parcalar = liste.filter((b) => b.tur !== 'tanim').map((b) => yapi(b, bg));
  if (!parcalar.length) return { sol: 0, sag: 0, boy: 0, ciz: () => {} };
  const boy = parcalar.reduce((a, p) => a + p.boy, 0) + ARA * (parcalar.length - 1);
  return {
    sol: Math.max(...parcalar.map((p) => p.sol)),
    sag: Math.max(...parcalar.map((p) => p.sag)),
    boy,
    ciz: (x, y, e) => {
      let yy = y;
      parcalar.forEach((p, i) => {
        p.ciz(x, yy, e);
        yy += p.boy;
        if (i < parcalar.length - 1) {
          e.push(ok(x, yy, x, yy + ARA, `a${bg.anahtar.n++}`));
          yy += ARA;
        }
      });
    },
  };
}

function yapi(b: Blok, bg: Baglam): Yapi {
  switch (b.tur) {
    case 'eylem':
      return kutu(EYLEM_ADI[b.eylem], b, bg, 'islem');
    case 'ata':
      return kutu(atamaMetni(b), b, bg, 'islem');
    case 'cagir':
      return kutu(b.ad, b, bg, 'cagri');
    case 'tanim':
      return { sol: 0, sag: 0, boy: 0, ciz: () => {} };
    case 'eger': {
      const d = bas(`${kosulMetni(b.kosul, 'kisa')}?`, b, bg, 'karar');
      const evet = dizi(b.govde, bg);
      if (!b.degilse) {
        const sagX = Math.max(d.en / 2, evet.sag) + PAY;
        const boy = d.boy + ARA + evet.boy + (evet.boy ? ARA : 0);
        return {
          sol: Math.max(d.en / 2, evet.sol),
          sag: sagX + 6,
          boy,
          ciz: (x, y, e) => {
            d.ciz(x, y, e);
            const yGovde = y + d.boy + ARA;
            e.push(ok(x, y + d.boy, x, yGovde, `a${bg.anahtar.n++}`));
            e.push(etiket(x + 6, y + d.boy + ARA / 2, 'Evet', `l${bg.anahtar.n++}`));
            evet.ciz(x, yGovde, e);
            const yBirles = y + boy;
            if (evet.boy) e.push(ok(x, yGovde + evet.boy, x, yBirles, `a${bg.anahtar.n++}`, true));
            e.push(yol([[x + d.en / 2, y + d.boy / 2], [x + sagX, y + d.boy / 2], [x + sagX, yBirles], [x + 4, yBirles]], `p${bg.anahtar.n++}`));
            e.push(etiket(x + d.en / 2 + 4, y + d.boy / 2 - 9, 'Hayır', `l${bg.anahtar.n++}`));
          },
        };
      }
      const hayir = dizi(b.degilse, bg);
      const solX = Math.max(evet.sag + PAY / 2, d.en / 2 + 12);
      const sagX = Math.max(hayir.sol + PAY / 2, d.en / 2 + 12);
      const kol = Math.max(evet.boy, hayir.boy);
      const boy = d.boy / 2 + ARA + kol + ARA;
      return {
        sol: solX + evet.sol,
        sag: sagX + hayir.sag,
        boy,
        ciz: (x, y, e) => {
          d.ciz(x, y, e);
          const yKol = y + d.boy / 2 + ARA;
          e.push(yol([[x - d.en / 2, y + d.boy / 2], [x - solX, y + d.boy / 2], [x - solX, yKol]], `p${bg.anahtar.n++}`));
          e.push(yol([[x + d.en / 2, y + d.boy / 2], [x + sagX, y + d.boy / 2], [x + sagX, yKol]], `p${bg.anahtar.n++}`));
          e.push(etiket(x - d.en / 2 - 4, y + d.boy / 2 - 9, 'Evet', `l${bg.anahtar.n++}`, true));
          e.push(etiket(x + d.en / 2 + 4, y + d.boy / 2 - 9, 'Hayır', `l${bg.anahtar.n++}`));
          evet.ciz(x - solX, yKol, e);
          hayir.ciz(x + sagX, yKol, e);
          const yBirles = y + boy;
          e.push(yol([[x - solX, yKol + evet.boy], [x - solX, yBirles], [x - 4, yBirles]], `p${bg.anahtar.n++}`));
          e.push(yol([[x + sagX, yKol + hayir.boy], [x + sagX, yBirles], [x + 4, yBirles]], `p${bg.anahtar.n++}`));
        },
      };
    }
    case 'tekrarlaKadar':
    case 'tekrarlaKez': {
      const kez = b.tur === 'tekrarlaKez';
      const d = kez ? bas(`${kezMetni(b)} kez tekrarla`, b, bg, 'altigen') : bas(`${kosulMetni(b.kosul, 'kisa')}?`, b, bg, 'karar');
      const govde = dizi(b.govde, bg);
      const solX = Math.max(d.en / 2, govde.sol) + PAY;
      const sagX = Math.max(d.en / 2, govde.sag) + PAY;
      const boy = d.boy + ARA + govde.boy + ARA + 10;
      return {
        sol: solX + 6,
        sag: sagX + 6,
        boy,
        ciz: (x, y, e) => {
          d.ciz(x, y, e);
          const yGovde = y + d.boy + ARA;
          e.push(ok(x, y + d.boy, x, yGovde, `a${bg.anahtar.n++}`));
          e.push(etiket(x + 6, y + d.boy + ARA / 2, kez ? 'sıradaki tur' : 'Hayır', `l${bg.anahtar.n++}`));
          govde.ciz(x, yGovde, e);
          const yDon = yGovde + govde.boy + ARA / 2;
          // Geri dönüş: gövdenin altından sola, yukarı, başlığın sol köşesine
          e.push(yol([[x, yGovde + govde.boy], [x, yDon], [x - solX, yDon], [x - solX, y + d.boy / 2], [x - d.en / 2 - 2, y + d.boy / 2]], `p${bg.anahtar.n++}`));
          // Çıkış: başlığın sağ köşesinden sağa, aşağı, eksene
          const yCikis = y + boy;
          e.push(yol([[x + d.en / 2, y + d.boy / 2], [x + sagX, y + d.boy / 2], [x + sagX, yCikis], [x + 4, yCikis]], `p${bg.anahtar.n++}`));
          e.push(etiket(x + d.en / 2 + 4, y + d.boy / 2 - 9, kez ? 'bitti' : 'Evet', `l${bg.anahtar.n++}`));
        },
      };
    }
  }
}

/** Tam şema: BAŞLA → gövde → BİTİR (komut tanımında: ad → gövde → SON) */
function sema(bas: string, son: string, liste: Blok[], bg: Baglam): Yapi {
  const ust = kutu(bas, null, bg, 'oval');
  const g = dizi(liste, bg);
  const alt = kutu(son, null, bg, 'oval');
  const boy = ust.boy + ARA + (g.boy ? g.boy + ARA : 0) + alt.boy;
  return {
    sol: Math.max(ust.sol, g.sol, alt.sol),
    sag: Math.max(ust.sag, g.sag, alt.sag),
    boy,
    ciz: (x, y, e) => {
      ust.ciz(x, y, e);
      let yy = y + ust.boy;
      e.push(ok(x, yy, x, yy + ARA, `a${bg.anahtar.n++}`));
      yy += ARA;
      if (g.boy) {
        g.ciz(x, yy, e);
        yy += g.boy;
        e.push(ok(x, yy, x, yy + ARA, `a${bg.anahtar.n++}`));
        yy += ARA;
      }
      alt.ciz(x, yy, e);
    },
  };
}

export function AkisSemasi({ program, aktif = null }: { program: Program; aktif?: AktifDurum | null }) {
  const bg: Baglam = { aktif, son: aktif?.yigin[aktif.yigin.length - 1] ?? null, anahtar: { n: 0 } };
  const semalar = [
    sema('BAŞLA', 'BİTİR', program, bg),
    ...program.filter((b): b is Extract<Blok, { tur: 'tanim' }> => b.tur === 'tanim').map((t) => sema(t.ad, 'SON', t.govde, bg)),
  ];
  const kenar = 16;
  const aralik = 36;
  let x = kenar;
  const ogeler: React.ReactNode[] = [];
  let boy = 0;
  semalar.forEach((s, i) => {
    x += s.sol;
    s.ciz(x, kenar, ogeler);
    x += s.sag + (i < semalar.length - 1 ? aralik : 0);
    boy = Math.max(boy, s.boy);
  });
  const en = x + kenar;
  const yuk = boy + kenar * 2;
  return (
    <svg viewBox={`0 0 ${en} ${yuk}`} width={en} height={yuk} className="max-w-full text-foreground" style={{ height: 'auto' }} role="img" aria-label="Akış şeması" data-akis-semasi>
      <defs>
        <marker id="akis-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="currentColor" fillOpacity={0.6} />
        </marker>
      </defs>
      {ogeler}
    </svg>
  );
}
