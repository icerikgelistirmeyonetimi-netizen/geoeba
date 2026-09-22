import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOOL_GROUPS } from '../toolDefinitions';
import {
  EL_ARACI,
  KAYDIRMA_DISI_SECICI,
  gorunumKaydirmaBasisiMi,
  kaydirmaDisiHedefMi,
  nesneBasisiIslenmeli,
} from '../gorunumKaydirma';

const TUM_ARACLAR = TOOL_GROUPS.flatMap((g) => g.tools.map((t) => t.id as string));

/* ------------------------------------------------------------------ */
/* 1) SAF KURAL                                                        */
/* ------------------------------------------------------------------ */

describe('gorunumKaydirmaBasisiMi: El aracı her yerde kaydırır', () => {
  it('El aracı, çizim araçları listesinin dışında ayrı bir görünüm aracıdır', () => {
    expect(EL_ARACI).toBe('pan');
    // El, Seç ve Sil tuval şeridinde durur; TOOL_GROUPS çizim/inşa/ölçme araçlarını taşır.
    expect(TUM_ARACLAR.length).toBeGreaterThan(20);
    expect(TUM_ARACLAR).not.toContain(EL_ARACI);
  });

  it('El aracında sol tuş, dokunma ve kalem kaydırır', () => {
    expect(gorunumKaydirmaBasisiMi('pan', { button: 0 })).toBe(true);
    // Dokunma ve kalemde button verilmez / 0'dır
    expect(gorunumKaydirmaBasisiMi('pan')).toBe(true);
    expect(gorunumKaydirmaBasisiMi('pan', {})).toBe(true);
  });

  it('El aracında sağ tuş kaydırmaz: bağlam menüsü ona aittir', () => {
    expect(gorunumKaydirmaBasisiMi('pan', { button: 2 })).toBe(false);
    expect(gorunumKaydirmaBasisiMi('pan', { button: 2, altKey: true })).toBe(false);
  });

  it('orta tuş ve Alt + sol tuş HER araçta kaydırır', () => {
    for (const arac of TUM_ARACLAR) {
      expect(gorunumKaydirmaBasisiMi(arac, { button: 1 }), `${arac}/orta`).toBe(true);
      expect(gorunumKaydirmaBasisiMi(arac, { button: 0, altKey: true }), `${arac}/alt`).toBe(true);
    }
  });

  it('El aracı dışındaki hiçbir araçta düz sol tuş kaydırmaz', () => {
    for (const arac of TUM_ARACLAR.filter((a) => a !== EL_ARACI)) {
      expect(gorunumKaydirmaBasisiMi(arac, { button: 0 }), arac).toBe(false);
      expect(gorunumKaydirmaBasisiMi(arac), arac).toBe(false);
    }
    expect(gorunumKaydirmaBasisiMi('select', { button: 0 })).toBe(false);
    expect(gorunumKaydirmaBasisiMi('delete', { button: 0 })).toBe(false);
  });
});

describe('nesneBasisiIslenmeli: nesne işleyicisi basışı ne zaman yutar', () => {
  it('El aracında hiçbir nesne işleyicisi basışı işlemez', () => {
    expect(nesneBasisiIslenmeli('pan', { button: 0 })).toBe(false);
    expect(nesneBasisiIslenmeli('pan')).toBe(false);
  });

  it('El aracında sağ tık nesne işleyicisine kalır (menü açılabilsin)', () => {
    expect(nesneBasisiIslenmeli('pan', { button: 2 })).toBe(true);
  });

  it('Seç, Sil ve çizim araçlarında nesne işleyicisi çalışır', () => {
    for (const arac of TUM_ARACLAR.filter((a) => a !== EL_ARACI)) {
      expect(nesneBasisiIslenmeli(arac, { button: 0 }), arac).toBe(true);
    }
  });

  it('kuralın tersi her durumda tutarlıdır', () => {
    for (const arac of ['pan', 'select', 'delete', 'point', 'segment']) {
      for (const button of [0, 1, 2]) {
        for (const altKey of [false, true]) {
          expect(nesneBasisiIslenmeli(arac, { button, altKey })).toBe(
            !gorunumKaydirmaBasisiMi(arac, { button, altKey })
          );
        }
      }
    }
  });
});

describe('kaydirmaDisiHedefMi: ölçme aletleri kendi tutamaklarını korur', () => {
  const sahteHedef = (eslesen: boolean): Element =>
    ({ closest: (s: string) => (eslesen && s === KAYDIRMA_DISI_SECICI ? {} : null) }) as unknown as Element;

  it('seçici cetvel, iletki ve gönye katmanlarını kapsar', () => {
    expect(KAYDIRMA_DISI_SECICI).toContain('data-olcme-araci');
    expect(KAYDIRMA_DISI_SECICI).toContain('data-olcme-menusu');
  });

  it('ölçme aletinin içindeki hedef el aracına kapalıdır', () => {
    expect(kaydirmaDisiHedefMi(sahteHedef(true))).toBe(true);
  });

  it('olağan tuval öğesi el aracına açıktır', () => {
    expect(kaydirmaDisiHedefMi(sahteHedef(false))).toBe(false);
    expect(kaydirmaDisiHedefMi(null)).toBe(false);
    expect(kaydirmaDisiHedefMi(undefined)).toBe(false);
    expect(kaydirmaDisiHedefMi({} as Element)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* 2) KORUMA TESTİ: hiçbir tuval işleyicisi El aracında basışı yutamaz */
/* ------------------------------------------------------------------ */

const KOK = path.resolve(__dirname, '..');
const CANVAS = readFileSync(path.join(KOK, 'Canvas.tsx'), 'utf8');
const WIDGETS = readFileSync(path.join(KOK, 'CanvasWidgets.tsx'), 'utf8');
const GIZMO = readFileSync(path.join(KOK, 'RotateGizmo.tsx'), 'utf8');

/** `bas` konumundaki `{` ile eşleşen `}` dizinini döndürür. */
function kapanisSuslu(kaynak: string, bas: number): number {
  let derinlik = 0;
  for (let i = bas; i < kaynak.length; i += 1) {
    if (kaynak[i] === '{') derinlik += 1;
    else if (kaynak[i] === '}') {
      derinlik -= 1;
      if (derinlik === 0) return i;
    }
  }
  return -1;
}

/** `ad` özniteliğinin / özelliğinin gövdesini (süslü parantezli bloğu) çıkarır. */
function isleyiciGovdeleri(
  kaynak: string,
  ad: string
): { govde: string; onsoz: string; satir: number }[] {
  const bulunan: { govde: string; onsoz: string; satir: number }[] = [];
  const re = new RegExp(`\\b${ad}\\s*[=:]`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(kaynak)) !== null) {
    const suslu = kaynak.indexOf('{', m.index + m[0].length - 1);
    if (suslu === -1) continue;
    const son = kapanisSuslu(kaynak, suslu);
    if (son === -1) continue;
    bulunan.push({
      govde: kaynak.slice(suslu, son + 1),
      // İşleyicinin hemen üstündeki yorum satırları (izin işareti burada aranır)
      onsoz: kaynak.slice(Math.max(0, m.index - 400), m.index),
      satir: kaynak.slice(0, m.index).split('\n').length,
    });
  }
  return bulunan;
}

/** `ad` ile başlayan işlevin gövdesi (ilk `{`'ten eşleşen `}`'e). */
function islevGovdesi(kaynak: string, ad: string): string {
  const i = kaynak.indexOf(ad);
  expect(i, `${ad} bulunamadı`).toBeGreaterThan(-1);
  const suslu = kaynak.indexOf('{', i);
  return kaynak.slice(suslu, kapanisSuslu(kaynak, suslu) + 1);
}

const KORUMA = /nesneBasisiIslenmeli|gorunumKaydirmaBasisiMi/;

describe('Koruma: 2B tuvalin kökü El aracı basışını alt işleyicilere HİÇ bırakmaz', () => {
  const kokKoruma = isleyiciGovdeleri(CANVAS, 'onPointerDownCapture');

  it('kök SVG yakalama aşamasında tek bir koruma bulundurur', () => {
    expect(kokKoruma).toHaveLength(1);
  });

  it('koruma, basışı süzmeden önce başka hiçbir erken çıkış yapmaz', () => {
    const govde = kokKoruma[0].govde;
    const korumaYeri = govde.search(KORUMA);
    expect(korumaYeri).toBeGreaterThan(-1);
    // Eski erken çıkış (foreignObject/input/button) ve imleç yakalaması korumadan SONRA gelmeli;
    // aksi hâlde girdi kutusunun ya da bileşenin üstünden kaydırma yine çalışmaz.
    expect(govde.indexOf('foreignObject')).toBeGreaterThan(korumaYeri);
    expect(govde.indexOf('setPointerCapture')).toBeGreaterThan(korumaYeri);
  });

  it('kaydırma basışında olay durdurulur ve kaydırma başlatılır', () => {
    const govde = kokKoruma[0].govde;
    expect(govde).toMatch(/stopPropagation/);
    expect(govde).toMatch(/preventDefault/);
    expect(govde).toMatch(/kaydirmayaBasla/);
    expect(govde).toMatch(/kaydirmaDisiHedefMi/);
  });

  it('dokunmada uzun basış menüsü de aynı korumadan geçer', () => {
    const dokunma = isleyiciGovdeleri(CANVAS, 'onTouchStartCapture');
    expect(dokunma).toHaveLength(1);
    expect(dokunma[0].govde).toMatch(KORUMA);
    expect(dokunma[0].govde).toMatch(/stopPropagation/);
  });

  it('kaydırmadan sonra gelen tıklama ve çift tıklama sahneyi değiştirmez', () => {
    for (const ad of ['onClickCapture', 'onDoubleClickCapture']) {
      const g = isleyiciGovdeleri(CANVAS, ad);
      expect(g, ad).toHaveLength(1);
      expect(g[0].govde, ad).toMatch(/kaydirmaYuttuRef/);
      expect(g[0].govde, ad).toMatch(/stopPropagation/);
    }
  });
});

describe('Koruma: nesne işleyicileri El aracında basışı yutmaz', () => {
  const ISLEYICILER = [
    'const handleObjectMouseDown',
    'const handleSolidMouseDown',
    'const handleTouchStartOnObject',
    'const handleStartRotateShape',
  ];

  it.each(ISLEYICILER)('%s korumayı ilk satırda uygular', (ad) => {
    const govde = islevGovdesi(CANVAS, ad);
    const korumaYeri = govde.search(KORUMA);
    expect(korumaYeri, `${ad} korumayı çağırmıyor`).toBeGreaterThan(-1);
    const yutmaYeri = govde.indexOf('stopPropagation');
    if (yutmaYeri > -1) expect(korumaYeri, `${ad} korumadan önce yutuyor`).toBeLessThan(yutmaYeri);
  });

  it('ölçüm / ad etiketi el aracında sürüklenmez ve gizlenmez', () => {
    const govde = islevGovdesi(CANVAS, 'const olcumEtiketi');
    for (const ad of ['onPointerDown', 'onClick']) {
      const isleyici = isleyiciGovdeleri(govde, ad);
      expect(isleyici.length, ad).toBeGreaterThan(0);
      const korumaYeri = isleyici[0].govde.search(KORUMA);
      expect(korumaYeri, `etiket ${ad} korumasız`).toBeGreaterThan(-1);
      expect(korumaYeri).toBeLessThan(isleyici[0].govde.indexOf('stopPropagation'));
    }
  });
});

describe('Koruma: yeni bir tuval işleyicisi kuralı unutamaz', () => {
  /** Bilinçli çıkış işareti: işleyicinin hemen üstüne gerekçesiyle yazılır. */
  const IZIN_ISARETI = 'el-araci-izinli';

  const DOSYALAR: { ad: string; kaynak: string }[] = [
    { ad: 'Canvas.tsx', kaynak: CANVAS },
    { ad: 'CanvasWidgets.tsx', kaynak: WIDGETS },
    { ad: 'RotateGizmo.tsx', kaynak: GIZMO },
  ];

  it('stopPropagation çağıran her basış işleyicisi ya korumalı ya da gerekçeli', () => {
    const eksik: string[] = [];
    for (const { ad, kaynak } of DOSYALAR) {
      for (const olay of ['onPointerDown', 'onMouseDown', 'onTouchStart']) {
        for (const { govde, onsoz, satir } of isleyiciGovdeleri(kaynak, olay)) {
          if (!govde.includes('stopPropagation')) continue; // basışı yutmuyor
          if (KORUMA.test(govde)) continue; // korumalı
          if (onsoz.includes(IZIN_ISARETI)) continue; // gerekçesi yazılmış bilinçli çıkış
          eksik.push(`${ad}:${satir} ${olay}`);
        }
      }
    }
    expect(
      eksik,
      `Bu işleyiciler El aracında basışı yutuyor. gorunumKaydirma.ts korumasını ekleyin` +
        ` (ya da gerekçesini "${IZIN_ISARETI}" yorumuyla yazın):\n${eksik.join('\n')}`
    ).toEqual([]);
  });

  it('her izin işaretinin yanında gerekçesi yazılıdır', () => {
    for (const { ad, kaynak } of DOSYALAR) {
      for (const satir of kaynak.split('\n')) {
        if (!satir.includes(IZIN_ISARETI)) continue;
        const gerekce = satir.slice(satir.indexOf(IZIN_ISARETI) + IZIN_ISARETI.length);
        expect(gerekce.replace(/[^a-zçğıöşü]/gi, '').length, `${ad}: ${satir.trim()}`).toBeGreaterThan(20);
      }
    }
  });
});
