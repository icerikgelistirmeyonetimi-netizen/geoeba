'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Mikrofondan Türkçe konuşmayı SÜREKLİ dinleyip her cümleyi ayrı ayrı metne çevirir.
 * start() ile açılır, stop() çağrılana kadar açık kalır; her tamamlanan cümle onResult ile bildirilir.
 *
 * Yalnızca tarayıcının kendi ses tanıması (Web Speech API) kullanılır: cihaz üstü tanıma destekleniyorsa önce o,
 * yoksa tarayıcının çevrimiçi hizmeti. Sayfaya model yüklenmez, worker açılmaz; tarayıcı desteklemiyorsa ya da
 * internet yoksa mikrofon düğmesi açıklamayla kapalı kalır. (Çevrimdışı Whisper yolu 2026-10-07'de kaldırıldı:
 * ~80 MB model ve ayrı bir iş parçacığı gerektiriyordu, gerekli görülmedi.)
 */
export type SpeechEngine = 'browser' | 'device';
export type SpeechStatus = 'idle' | 'starting' | 'listening' | 'error';
export interface SpeechState {
  status: SpeechStatus;
  engine?: SpeechEngine;
  /** O an söylenmekte olan (henüz bitmemiş) cümle */
  interim: string;
  /** 0–1 ses düzeyi (dalga göstergesi için) */
  level: number;
  error?: string;
}

type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; length: number; [index: number]: RecognitionAlternative };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
interface BrowserRecognition {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number; processLocally?: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
interface RecognitionConstructor {
  new(): BrowserRecognition;
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
}

const LANG = 'tr-TR';
const IDLE: SpeechState = { status: 'idle', interim: '', level: 0 };

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const ERROR_TEXT: Record<string, string> = {
  'not-allowed': 'Mikrofon izni verilmedi. Adres çubuğundaki mikrofon simgesinden izin verin.',
  'service-not-allowed': 'Tarayıcı ses tanıma hizmetine izin vermedi.',
  'audio-capture': 'Mikrofon bulunamadı.',
  network: 'Ses tanıma hizmetine ulaşılamadı. İnternet bağlantısını denetleyip mikrofonu yeniden açın.',
  'language-not-supported': 'Bu tarayıcının ses tanıması Türkçeyi desteklemiyor.',
};
const UNSUPPORTED = 'Bu tarayıcı ses tanımayı desteklemiyor. Chrome ya da Edge kullanın.';

/** onResult: en olası metin, kullanılan yöntem ve (tarayıcı verirse) diğer olası metinler, olasılık sırasıyla. */
export function useSpeechInput({ onResult }: { onResult: (text: string, engine: SpeechEngine, alternatives?: string[]) => void }) {
  const [state, setState] = useState<SpeechState>(IDLE);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const recognition = useRef<BrowserRecognition | null>(null);
  const active = useRef(false);
  const session = useRef(0);

  const supported = typeof window !== 'undefined' && !!recognitionConstructor();

  const fail = useCallback((message: string, engine?: SpeechEngine) => {
    active.current = false;
    session.current += 1;
    recognition.current?.abort();
    recognition.current = null;
    setState({ ...IDLE, status: 'error', engine, error: message });
  }, []);

  /** Sürekli tanıma; tarayıcı kendiliğinden kapanırsa (sessizlik, süre sınırı) yeniden başlatılır. */
  const startBrowser = useCallback((Ctor: RecognitionConstructor, onDevice: boolean) => {
    const mySession = session.current;
    const engine: SpeechEngine = onDevice ? 'device' : 'browser';
    const rec = new Ctor();
    rec.lang = LANG;
    rec.interimResults = true;
    rec.continuous = true;
    // Birden çok olası metin istenir; motorun anladığı ilki seçilir (speechChoice).
    rec.maxAlternatives = 5;
    if (onDevice) rec.processLocally = true;
    let quickEnds = 0, startedAt = 0;
    const begin = () => {
      startedAt = Date.now();
      try { rec.start(); } catch { /* zaten başlamış */ }
    };
    rec.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const alternatives = Array.from({ length: result.length }, (_, k) => result[k]?.transcript?.trim() ?? '').filter(Boolean);
          if (alternatives.length) onResultRef.current(alternatives[0], engine, alternatives);
        } else interim += result[0].transcript;
      }
      quickEnds = 0;
      setState(s => ({ ...s, status: 'listening', interim: interim.trim(), level: interim ? 0.7 : 0.15, error: undefined }));
    };
    rec.onerror = event => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      fail(ERROR_TEXT[event.error] ?? `Ses tanıma hatası: ${event.error}`, engine);
    };
    rec.onend = () => {
      if (mySession !== session.current) return;
      if (!active.current) { recognition.current = null; setState(s => ({ ...IDLE, engine: s.engine })); return; }
      // Tarayıcılar sessizlikte ya da ~60 sn sonra tanımayı kapatır: kullanıcı kapatana kadar yeniden aç.
      quickEnds = Date.now() - startedAt < 1000 ? quickEnds + 1 : 0;
      if (quickEnds > 5) { fail('Ses tanıma sürekli kapanıyor. Mikrofon ayarlarını denetleyip tekrar deneyin.', engine); return; }
      begin();
    };
    recognition.current = rec;
    setState({ ...IDLE, status: 'listening', engine });
    begin();
  }, [fail]);

  const start = useCallback(async () => {
    if (active.current) return;
    active.current = true;
    session.current += 1;
    const mySession = session.current;
    setState({ ...IDLE, status: 'starting' });
    const Ctor = recognitionConstructor();
    if (!Ctor) { fail(UNSUPPORTED); return; }
    let onDevice = false;
    if (Ctor.available) {
      try { onDevice = (await Ctor.available({ langs: [LANG], processLocally: true })) === 'available'; } catch { onDevice = false; }
    }
    if (!active.current || mySession !== session.current) return;
    if (!onDevice && navigator.onLine === false) { fail(ERROR_TEXT.network, 'browser'); return; }
    startBrowser(Ctor, onDevice);
  }, [fail, startBrowser]);

  /** Dinlemeyi kapatır; o ana kadar söylenen cümle yine bildirilir. */
  const stop = useCallback(() => {
    active.current = false;
    if (recognition.current) { recognition.current.stop(); recognition.current = null; }
    setState(s => ({ ...IDLE, engine: s.engine }));
  }, []);

  /** Dinlemeyi iptal eder. */
  const cancel = useCallback(() => {
    active.current = false;
    session.current += 1;
    recognition.current?.abort();
    recognition.current = null;
    setState(IDLE);
  }, []);

  useEffect(() => () => {
    active.current = false;
    recognition.current?.abort();
  }, []);

  return { state, start, stop, cancel, supported, active: active.current };
}
