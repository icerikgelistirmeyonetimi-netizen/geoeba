import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { GOMME_DOSYASI, gommeCoz, gommeKodla, niyetOrnekleri, niyetOzeti } from '../../../public/semantic/niyet-ozeti.mjs';

/**
 * Önceden hesaplanmış niyet gömmeleri (public/semantic/intents-embeddings.json) güncel dizine ait olmalı.
 * Dosya eskiyse worker tarayıcıda yeniden hesaplar (yavaş ama doğru); bu test eskimeyi derlemeden önce yakalar:
 * intents.json değiştiyse `node scripts/prepare-semantic.mjs` çalıştırılmalıdır.
 */
const semantic = path.resolve(__dirname, '../../../public/semantic');
const intents: { id: string; phrases: string[] }[] = JSON.parse(readFileSync(path.join(semantic, 'intents.json'), 'utf8'));
const revision = readFileSync(path.join(semantic, 'worker.js'), 'utf8').match(/const revision = '([0-9a-f]+)'/)![1];

describe('niyet gömmeleri', () => {
  it('parmak izi belirleyici ve sıraya duyarlı', () => {
    expect(niyetOzeti(intents, revision)).toBe(niyetOzeti(intents, revision));
    expect(niyetOzeti(intents, 'baska-surum')).not.toBe(niyetOzeti(intents, revision));
    const degisik = intents.map((i, k) => k === 0 ? { ...i, phrases: [...i.phrases, 'yeni cümle'] } : i);
    expect(niyetOzeti(degisik, revision)).not.toBe(niyetOzeti(intents, revision));
  });

  it('kodlama gidiş-dönüş kayıpsız (float32)', () => {
    const vectors = [[0.5, -0.25, 1e-3], [1, 0, -1]];
    const decoded = gommeCoz(gommeKodla(vectors), 2, 3);
    expect(Array.from(decoded[0])).toEqual(vectors[0].map(v => Math.fround(v)));
    expect(Array.from(decoded[1])).toEqual(vectors[1]);
    expect(() => gommeCoz(gommeKodla(vectors), 3, 3)).toThrow();
  });

  it('hazır dosya güncel dizine ait, tam boyutta ve birim uzunlukta', () => {
    const file = JSON.parse(readFileSync(path.join(semantic, GOMME_DOSYASI), 'utf8'));
    const samples = niyetOrnekleri(intents);
    expect(file.revision, 'model sürümü worker.js ile aynı olmalı').toBe(revision);
    expect(file.hash, 'intents.json değişmiş: node scripts/prepare-semantic.mjs çalıştırın').toBe(niyetOzeti(intents, revision));
    expect(file.count).toBe(samples.length);
    expect(file.dim).toBe(384);
    const vectors = gommeCoz(file.base64, file.count, file.dim);
    for (const v of vectors) {
      let norm = 0;
      for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
      expect(Math.sqrt(norm)).toBeCloseTo(1, 3);
    }
  });

  it('niyet örnekleri dosyadaki sırayla aynı (niyet sırası, sonra cümle sırası)', () => {
    const samples = niyetOrnekleri(intents);
    expect(samples[0]).toEqual({ intent: intents[0].id, text: intents[0].phrases[0] });
    expect(samples.length).toBe(intents.reduce((n, i) => n + i.phrases.length, 0));
  });
});
