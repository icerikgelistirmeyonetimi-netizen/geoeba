/*
 * src/math/manropeTablosu.ts üretici (yalnızca geliştirme). Manrope sürümü değişmedikçe yeniden çalıştırmak
 * gerekmez: etiket düzeni (yazimDuzeni.ts) ve dışa aktarım aynı tabloya dayanır.
 *
 *   node scripts/manrope-genislik.cjs [playwright-modul-yolu]
 *
 * Playwright bu depoda bağımlılık değildir; yolu ya argümandan ya da PLAYWRIGHT_PATH ortam değişkeninden alır.
 */
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const playwrightYolu = process.argv[2] || process.env.PLAYWRIGHT_PATH || 'playwright';
const { chromium } = require(playwrightYolu);

(async () => {
  const tarayici = await chromium.launch({ channel: 'msedge', headless: true });
  const sayfa = await tarayici.newPage();
  await sayfa.goto(pathToFileURL(path.join(__dirname, 'manrope-genislik.html')).href);
  await sayfa.waitForFunction(() => window.hazir);
  const r = await sayfa.evaluate(() => window.hazir);
  await tarayici.close();

  const g = r.genislik.w700;
  console.log('tabloda olmayan karakterler:', r.eksik || '(yok)');
  console.log('latin-ext yüklü mü:', JSON.stringify(r.yuklu), '| s/ş', g.s, g['ş'], '| g/ğ', g.g, g['ğ'], '| I/İ', g.I, g['İ'], '| i/ı', g.i, g['ı']);
  console.log('örnek genişlikler:', JSON.stringify(r.ornek));
  if (!r.yuklu.w700 || !r.yuklu.w600) throw new Error('Manrope latin-ext alt kümesi yüklenmedi: ş/ğ/İ/ı yanlış ölçülür.');

  const tablo = (ad) => {
    const w = r.genislik[ad];
    const harfler = Object.keys(w);
    const ciftler = Object.fromEntries(Object.entries(r.kern[ad]).sort(([a], [b]) => (a < b ? -1 : 1)));
    return `  ${ad}: {\n    harfler: ${JSON.stringify(harfler.join(''))},\n    genislik: [${harfler.map((c) => w[c]).join(', ')}],\n    ciftler: ${JSON.stringify(ciftler)},\n  },`;
  };
  const out = `/**
 * Manrope yazı tipinin ilerleme genişlikleri (1 em = 1000 birim) ve çift aralama (kerning) düzeltmeleri.
 * scripts/manrope-genislik.cjs ile tarayıcıda (latin-ext alt kümesi dahil) ölçülüp üretilir; elle düzenlemeyin.
 * Etiket düzeni yalnızca bu tabloya dayanır: ekran, vitest ve dışa aktarım aynı ölçüleri görür.
 */
export const MANROPE = {
${tablo('w700')}
${tablo('w600')}
} as const;
`;
  const hedef = path.join(__dirname, '..', 'src', 'math', 'manropeTablosu.ts');
  fs.writeFileSync(hedef, out);
  console.log('yazıldı:', hedef, out.length, 'bayt');
})().catch((e) => { console.error(e); process.exit(1); });
