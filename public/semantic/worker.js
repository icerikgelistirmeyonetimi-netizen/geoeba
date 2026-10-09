import { env, pipeline } from './transformers.web.min.js';
import { GOMME_DOSYASI, gommeCoz, niyetOrnekleri, niyetOzeti } from './niyet-ozeti.mjs';

const revision = '2c4055b12046f11709e9df2c122e59ffbdc2f900';
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = new URL('./models/', import.meta.url).href;
env.backends.onnx.wasm.wasmPaths = new URL('./', import.meta.url).href;
/**
 * İş parçacığı sayısı: WebAssembly'de çoklu iş parçacığı SharedArrayBuffer ister, o da sayfanın "cross-origin isolated"
 * olmasına (sunucunun COOP/COEP başlıkları göndermesine) bağlıdır. GitHub Pages bu başlıkları gönderemez; o zaman 1
 * kullanılır (daha yükseği istense de çalışma zamanı sessizce 1'e düşer). Başlık veren bir sunucuda çekirdeklerin
 * yarısı (en çok 4) alınır: arayüz iş parçacığına ve tuvale yer kalır.
 */
const cekirdek = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2;
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, Math.floor(cekirdek / 2))) : 1;
let ready;
let pending;
let working = false;

/**
 * Derleme zamanında hesaplanmış cümle gömmeleri (scripts/prepare-semantic.mjs → intents-embeddings.json).
 * Parmak izi model sürümünü ve cümle listesini kapsar; tutmuyorsa (ör. intents.json değişmiş, betik çalışmamış)
 * null döner ve gömmeler tarayıcıda hesaplanır.
 */
async function hazirGommeler(intents, count) {
  try {
    const response = await fetch(new URL(`./${GOMME_DOSYASI}`, import.meta.url));
    if (!response.ok) return null;
    const file = await response.json();
    if (file.revision !== revision || file.hash !== niyetOzeti(intents, revision) || file.count !== count) return null;
    return gommeCoz(file.base64, file.count, file.dim);
  } catch {
    return null;
  }
}

async function initialize() {
  self.postMessage({ type: 'status', status: 'loading' });
  const response = await fetch(new URL('./intents.json', import.meta.url));
  if (!response.ok) throw new Error('Komut dizini bulunamadı.');
  const intents = await response.json();
  const samples = niyetOrnekleri(intents);
  // Model yüklenirken hazır gömme dosyası da indirilir (ikisi birbirini beklemez).
  const [extractor, hazir] = await Promise.all([
    pipeline('feature-extraction', revision, { dtype: 'q8', device: 'wasm' }),
    hazirGommeler(intents, samples.length),
  ]);
  let vectors = hazir;
  if (!vectors) {
    vectors = [];
    // Küçük gruplar ilk yüklemedeki bellek ihtiyacını sınırlar.
    for (let i = 0; i < samples.length; i += 4) {
      const output = await extractor(samples.slice(i, i + 4).map(s => s.text), { pooling: 'mean', normalize: true });
      vectors.push(...output.tolist());
    }
  }
  self.postMessage({ type: 'status', status: 'ready', kaynak: hazir ? 'hazir' : 'hesaplandi', threads: env.backends.onnx.wasm.numThreads });
  return { extractor, samples, vectors };
}

async function drain() {
  if (working) return;
  working = true;
  try {
    const { extractor, samples, vectors } = await (ready ??= initialize());
    while (pending) {
      const { id, text } = pending;
      pending = null;
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      const query = output.tolist()[0];
      const best = new Map();
      vectors.forEach((vector, index) => {
        let score = 0;
        for (let j = 0; j < vector.length; j++) score += vector[j] * query[j];
        const intent = samples[index].intent;
        if (score > (best.get(intent) ?? -1)) best.set(intent, score);
      });
      const matches = [...best].map(([intent, score]) => ({ intent, score })).sort((a, b) => b.score - a.score);
      self.postMessage({ type: 'results', id, text, matches });
    }
  } catch {
    pending = null;
    ready = undefined;
    self.postMessage({ type: 'status', status: 'error' });
  } finally { working = false; }
}

self.onmessage = ({ data }) => {
  if (data.type === 'query') pending = { id: data.id, text: data.text };
  if (data.type === 'init' || data.type === 'query') void drain();
};
