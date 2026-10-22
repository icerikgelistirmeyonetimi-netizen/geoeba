/**
 * Niyet dizini (intents.json) için paylaşılan yardımcılar: örnek sırası, parmak izi ve gömme kodlaması.
 *
 * Aynı dosyayı üç yer kullanır, böylece hesap bir kez yapılır ve her yerde aynı sonuç çıkar:
 *  - scripts/prepare-semantic.mjs: cümle gömmelerini derleme zamanında hesaplayıp intents-embeddings.json yazar,
 *  - public/semantic/worker.js: tarayıcıda hazır gömmeleri okur; parmak izi tutmuyorsa kendisi hesaplar,
 *  - src/math/__tests__/semanticEmbeddings.test.ts: hazır dosyanın güncel dizine ait olduğunu denetler.
 *
 * Parmak izi model sürümünü ve cümlelerin sırasını kapsar: intents.json'da bir cümle değişince eski gömme dosyası
 * geçersiz sayılır. Gömmeler little-endian float32 olarak base64 ile saklanır (x86 ve ARM tarayıcıları little-endian).
 */
export const GOMME_DOSYASI = 'intents-embeddings.json';

/** Dizindeki cümleler, gömme dosyasıyla aynı sırada: niyet sırası, sonra cümle sırası. */
export function niyetOrnekleri(intents) {
  return intents.flatMap(intent => intent.phrases.map(text => ({ intent: intent.id, text })));
}

/** 16 onaltılık basamak: FNV-1a ve djb2 karmalarının birleşimi (bağımlılıksız, Node ve tarayıcıda aynı). */
export function niyetOzeti(intents, revision) {
  const metin = `${revision}|${JSON.stringify(niyetOrnekleri(intents))}`;
  let h1 = 0x811c9dc5, h2 = 5381;
  for (let i = 0; i < metin.length; i++) {
    const c = metin.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = (Math.imul(h2, 33) ^ c) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

/** Vektör listesi → base64 (float32, ardışık). */
export function gommeKodla(vectors) {
  const dim = vectors[0]?.length ?? 0;
  const arr = new Float32Array(vectors.length * dim);
  vectors.forEach((v, i) => arr.set(v, i * dim));
  const bytes = new Uint8Array(arr.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** base64 → count adet dim boyutlu Float32Array görünümü. Boyut uyuşmazsa hata verir. */
export function gommeCoz(base64, count, dim) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const arr = new Float32Array(bytes.buffer);
  if (arr.length !== count * dim) throw new Error(`Gömme dosyası boyutu uyuşmuyor: ${arr.length} ≠ ${count} × ${dim}.`);
  return Array.from({ length: count }, (_, i) => arr.subarray(i * dim, (i + 1) * dim));
}
