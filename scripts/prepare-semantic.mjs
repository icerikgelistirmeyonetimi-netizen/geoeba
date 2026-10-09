import { mkdir, copyFile, access, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { GOMME_DOSYASI, gommeKodla, niyetOrnekleri, niyetOzeti } from '../public/semantic/niyet-ozeti.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'public/semantic');
const revision = '2c4055b12046f11709e9df2c122e59ffbdc2f900';
const model = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const files = ['config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/model_quantized.onnx'];

if (process.env.GEOEBA_SKIP_SEMANTIC_MODEL === '1') {
  console.log('Anlamsal model indirmesi atlandı (GEOEBA_SKIP_SEMANTIC_MODEL=1).');
  process.exit(0);
}

await mkdir(output, { recursive: true });
try {
  await copyFile(path.join(root, 'node_modules/@huggingface/transformers/LICENSE'), path.join(output, 'TRANSFORMERS-LICENSE.txt'));
} catch {
  // lisans dosyasi eksikse devam et
}

for (const file of ['transformers.web.min.js', 'ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) {
  const source = file === 'transformers.web.min.js' ? 'transformers.min.js' : file;
  try {
    await copyFile(path.join(root, 'node_modules/@huggingface/transformers/dist', source), path.join(output, file));
  } catch {
    // dist dosyasi eksikse devam et
  }
}

try {
  for (const file of files) {
    const target = path.join(output, 'models', revision, file);
    try { await access(target); continue; } catch { /* İndirme yalnızca eksik dosyalar için. */ }
    await mkdir(path.dirname(target), { recursive: true });
    console.log(`Anlamsal model indiriliyor: ${file}`);
    const response = await fetch(`https://huggingface.co/${model}/resolve/${revision}/${file}`, { signal: AbortSignal.timeout(300000) });
    if (!response.ok || !response.body) throw new Error(`${file}: HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(target + '.partial'));
    await rename(target + '.partial', target);
  }
  await writeFile(path.join(output, 'MODEL-SOURCE.json'), JSON.stringify({ model, revision, runtime: '@huggingface/transformers@3.8.1', source: `https://huggingface.co/${model}`, license: 'Apache-2.0' }, null, 2));
  console.log('Yerel anlamsal arama dosyaları hazır.');
} catch (error) {
  for (const file of files) await rm(path.join(output, 'models', revision, `${file}.partial`), { force: true }).catch(() => {});
  console.warn(`Uyarı: anlamsal model indirilemedi (${error instanceof Error ? error.message : error}).`);
}

/**
 * Niyet gömmeleri (intents-embeddings.json): intents.json'daki her örnek cümlenin vektörü DERLEME zamanında hesaplanır.
 * Tarayıcıdaki worker bu dosyayı okur ve açılışta yalnızca modeli yükler; eskiden ~200 cümleyi her sayfa açılışında
 * tek çekirdekte yeniden gömüyordu. Parmak izi (niyetOzeti) model sürümünü ve cümle listesini kapsar: dosya güncelse
 * yeniden hesaplanmaz; intents.json değişince yeniden üretilir. Model dosyaları yoksa atlanır (worker kendisi hesaplar).
 */
async function gommeleriHazirla() {
  const intents = JSON.parse(await readFile(path.join(output, 'intents.json'), 'utf8'));
  const hash = niyetOzeti(intents, revision);
  const target = path.join(output, GOMME_DOSYASI);
  try {
    const eski = JSON.parse(await readFile(target, 'utf8'));
    if (eski.hash === hash && eski.revision === revision) { console.log(`Niyet gömmeleri güncel (${GOMME_DOSYASI}).`); return; }
  } catch { /* dosya yok ya da bozuk: yeniden hesaplanır */ }
  for (const file of files) await access(path.join(output, 'models', revision, file));
  const { env, pipeline: hfPipeline } = await import('@huggingface/transformers');
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = path.join(output, 'models');
  const t0 = performance.now();
  // Tarayıcıdaki worker ile aynı model, aynı nicemleme (q8) ve aynı havuzlama: vektörler birebir karşılaştırılabilir.
  const extractor = await hfPipeline('feature-extraction', revision, { dtype: 'q8' });
  const samples = niyetOrnekleri(intents);
  const vectors = [];
  for (let i = 0; i < samples.length; i += 16) {
    const out = await extractor(samples.slice(i, i + 16).map(s => s.text), { pooling: 'mean', normalize: true });
    vectors.push(...out.tolist());
  }
  await extractor.dispose();
  const dim = vectors[0].length;
  await writeFile(target, JSON.stringify({ model, revision, hash, count: vectors.length, dim, base64: gommeKodla(vectors) }));
  console.log(`Niyet gömmeleri hesaplandı: ${vectors.length} cümle × ${dim} boyut, ${(performance.now() - t0).toFixed(0)} ms → ${GOMME_DOSYASI}`);
}
try {
  await gommeleriHazirla();
} catch (error) {
  console.warn(`Uyarı: niyet gömmeleri hesaplanamadı; tarayıcı açılışta kendisi hesaplar (${error instanceof Error ? error.message : error}).`);
}

