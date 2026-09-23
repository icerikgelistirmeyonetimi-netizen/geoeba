'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Loader2, Mic, MicOff, Settings2 } from 'lucide-react';
import { ToolMode } from '@/types/workspace';
import { workspaceOwnsKeyboard } from './toolShortcuts';
import { CommandPanel, IncomingCommand } from './CommandPanel';
import { loadSpeechMode, saveSpeechMode, SpeechEngine, SpeechMode, useSpeechInput } from '@/hooks/useSpeechInput';
import { chooseSpokenCommand, looksIncomplete } from '@/math/commands/speechChoice';
import { executeTurkishCommand } from '@/math/turkishCommands';
import { useWorkspace } from '@/state/WorkspaceContext';

const AUTO_RUN_KEY = 'geoeba_ses_otomatik_uygula_v1';
const ENGINE_NAME: Record<SpeechEngine, string> = { browser: 'Tarayıcı ses tanıma', device: 'Cihaz üstü ses tanıma', whisper: 'Çevrimdışı model' };

/**
 * Tuvalin köşesinde duran klavye + mikrofon düğmesi.
 * Klavye: komut kutusunu düğmenin yanında açar/kapatır (Ctrl+K da açar).
 * Mikrofon: tekrar tıklanana kadar açık kalır. Her söylenen cümle metne çevrilir ve sırayla uygulanır
 * ("Söyleyince hemen uygula" kapalıysa kutuya yazılır).
 */
export function CommandAssistant({ onSelectTool }: { onSelectTool: (tool: ToolMode) => void }) {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<IncomingCommand[]>([]);
  const [heard, setHeard] = useState<string[]>([]);
  const [mode, setMode] = useState<SpeechMode>('auto');
  const [autoRun, setAutoRun] = useState(true);
  const [settings, setSettings] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const nonce = useRef(0);
  const autoRunRef = useRef(autoRun);
  autoRunRef.current = autoRun;
  // Tuval dar olduğunda (küçük ekran, açık yan paneller) kutu tuvale sıkışmasın: ekran genişliğinde açılır.
  const rootRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => setCompact(entry.contentRect.width < 400));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setMode(loadSpeechMode());
    try { setAutoRun(localStorage.getItem(AUTO_RUN_KEY) !== 'false'); } catch { /* varsayılan: hemen uygula */ }
  }, []);

  const workspace = useWorkspace();
  const latest = useRef(workspace);
  latest.current = workspace;
  const fragment = useRef<{ text: string; timer: number } | null>(null);
  useEffect(() => () => { if (fragment.current) window.clearTimeout(fragment.current.timer); }, []);

  const enqueue = useCallback((text: string) => {
    // Numara burada sabitlenir: aynı anda gelen iki cümle aynı numarayı alırsa biri kuyruktan düşerdi.
    const item: IncomingCommand = { text, nonce: ++nonce.current, run: autoRunRef.current };
    setHeard(list => [text, ...list.filter(h => !h.endsWith(' …'))].slice(0, 3));
    setQueue(list => [...list, item]);
  }, []);

  const onResult = useCallback((transcript: string, _engine: SpeechEngine, alternatives?: string[]) => {
    const w = latest.current;
    // Tarayıcının olası metinlerinden motorun anladığı ilki seçilir (sahneye dokunmadan denenir).
    const understands = (text: string) => executeTurkishCommand(text, w.objects, w.selectedObjectIds, { viewport: w.viewport, styleSettings: w.styleSettings }).ok;
    const previous = fragment.current;
    if (previous) { window.clearTimeout(previous.timer); fragment.current = null; }
    const choice = chooseSpokenCommand(alternatives?.length ? alternatives : [transcript], understands, previous?.text);
    if (!choice.text) return;
    if (previous && !choice.merged) enqueue(previous.text);
    if (!choice.understood && looksIncomplete(choice.text)) {
      // Konuşma duraklamayla bölünmüş olabilir ("kenarları üç … dört ve beş olan üçgen çiz"): kısa süre devamı beklenir.
      setHeard(list => [`${choice.text} …`, ...list].slice(0, 3));
      fragment.current = {
        text: choice.text,
        timer: window.setTimeout(() => { const pending = fragment.current; fragment.current = null; if (pending) enqueue(pending.text); }, 2500),
      };
      return;
    }
    enqueue(choice.text);
  }, [enqueue]);
  const speech = useSpeechInput({ mode, onResult });
  const { status, interim, level, error, engine, progress, pending } = speech.state;

  // Tarayıcı hata verip dinlemeyi kapattıysa düğme de kapalı görünsün.
  useEffect(() => { if (status === 'error' || status === 'idle') setMicOn(false); }, [status]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (workspaceOwnsKeyboard(event, rootRef.current) && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.code === 'KeyK') {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    const onToggle = () => setOpen(value => !value);
    window.addEventListener('keydown', onKey);
    window.addEventListener('geoeba:toggle-command-palette', onToggle);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('geoeba:toggle-command-palette', onToggle);
    };
  }, []);

  const toggleMic = () => {
    if (micOn) { setMicOn(false); speech.stop(); }
    else { setMicOn(true); setHeard([]); void speech.start(); }
  };
  const handled = useCallback((done: number) => setQueue(list => list.filter(item => item.nonce !== done)), []);

  const settingsPanel = <span className="relative">
    <button type="button" onClick={() => setSettings(value => !value)} aria-expanded={settings} aria-label="Ses ayarları"
      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><Settings2 className="h-3.5 w-3.5" /></button>
    {settings && <div role="dialog" aria-label="Ses ayarları" className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-border bg-card p-3 text-xs shadow-xl">
      <p className="mb-1.5 font-bold text-foreground">Ses tanıma</p>
      {([['auto', 'Otomatik', 'Tarayıcının ses tanıması; yoksa ya da internet yoksa çevrimdışı model.'], ['offline', 'Yalnızca çevrimdışı', 'Ses bilgisayardan çıkmaz. İlk kullanımda ~80 MB model yüklenir.']] as const).map(([value, title, hint]) =>
        <label key={value} className="mb-1.5 flex cursor-pointer gap-2">
          <input type="radio" name="ses-modu" checked={mode === value} disabled={micOn} onChange={() => { setMode(value); saveSpeechMode(value); }} className="mt-0.5" />
          <span><span className="font-semibold">{title}</span><span className="block text-[11px] text-muted-foreground">{hint}</span></span>
        </label>)}
      <label className="mt-2 flex cursor-pointer items-center gap-2 border-t border-border pt-2">
        <input type="checkbox" checked={autoRun} onChange={e => { setAutoRun(e.target.checked); try { localStorage.setItem(AUTO_RUN_KEY, String(e.target.checked)); } catch { /* yok say */ } }} />
        <span>Söyleyince hemen uygula</span>
      </label>
      {micOn && <p className="mt-2 text-[11px] text-muted-foreground">Ses yöntemi mikrofon kapalıyken değiştirilebilir.</p>}
    </div>}
  </span>;

  const showBubble = micOn || status === 'transcribing' || status === 'error';
  const bubble = showBubble && <div role="status" aria-live="polite"
    className={`pointer-events-auto mb-1 w-[min(20rem,calc(100vw-7rem))] rounded-2xl border px-3 py-2 text-xs shadow-xl backdrop-blur ${status === 'error' ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border bg-card/95 text-foreground'}`}>
    {status === 'error' ? <span>{error}</span> : <>
      <span className="flex items-center gap-2 font-semibold">
        {status === 'listening'
          ? <span aria-hidden className="flex h-3 items-end gap-0.5">{[0.5, 1, 0.7].map((f, i) => <span key={i} className="w-1 rounded-full bg-destructive transition-all" style={{ height: `${Math.max(3, Math.min(12, 3 + level * 12 * f))}px` }} />)}</span>
          : <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />}
        {status === 'starting' ? 'Mikrofon açılıyor…' : status === 'listening' ? 'Dinliyorum — komutlarınızı söyleyin' : 'Son söylenen yazıya çevriliyor…'}
      </span>
      {progress !== undefined && progress < 1 && <span className="mt-1 block text-muted-foreground">Çevrimdışı model yükleniyor: %{Math.round(progress * 100)}</span>}
      {interim && <span className="mt-1 block text-muted-foreground">“{interim}”</span>}
      {heard.map((text, i) => <span key={`${i}-${text}`} className={`mt-1 block truncate ${i === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>✓ {text}</span>)}
      <span className="mt-1 block text-[10px] text-muted-foreground">
        {engine ? ENGINE_NAME[engine] : ''}{pending > 0 ? ` · ${pending} cümle çevriliyor` : ''}{micOn ? ' · Kapatmak için mikrofona tekrar tıklayın' : ''}
      </span>
    </>}
  </div>;

  // Kutu tuvalin genişliğine sığar: sağda araç sütunu için boşluk, solda kenar payı.
  return <div ref={rootRef} className="pointer-events-none absolute bottom-3 left-3 right-14 z-30 flex items-end justify-end gap-2 sm:bottom-4 sm:right-16">
    {/* Sesli komut kuyruğu kutu kapalıyken de işlenir; yalnız kullanıcı kutuyu açar. */}
    <div hidden={!open} className={compact ? 'pointer-events-auto fixed inset-x-2 bottom-20 z-40' : 'pointer-events-auto min-w-0 max-w-[30rem] flex-1'}>
      <CommandPanel variant="drawer" visible={open} onSelectTool={onSelectTool} incoming={queue[0] ?? null} onIncomingHandled={handled}
        onClose={() => setOpen(false)} headerExtra={settingsPanel} />
    </div>
    <div className="flex flex-col items-end">
      {bubble}
      <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-lg">
        <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label="Yazarak komut ver" title="Yazarak komut ver (Ctrl+K)"
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${open ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}>
          <Keyboard className="h-5 w-5" />
        </button>
        <span aria-hidden className="h-6 w-px bg-border" />
        <button type="button" onClick={toggleMic} disabled={!speech.supported} aria-pressed={micOn}
          aria-label={micOn ? 'Mikrofonu kapat' : 'Mikrofonu aç ve sesle komut ver'}
          title={speech.supported ? (micOn ? 'Mikrofonu kapat' : 'Mikrofonu aç: kapatana kadar sesli komut verebilirsiniz') : 'Bu tarayıcı mikrofonu desteklemiyor'}
          className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${micOn ? 'bg-destructive text-destructive-foreground' : 'text-foreground hover:bg-muted'}`}>
          {micOn && <span aria-hidden className="absolute inset-0 animate-pulse rounded-full bg-destructive/40" style={{ transform: `scale(${1 + level * 0.35})`, transition: 'transform 80ms linear' }} />}
          {micOn ? <MicOff className="relative h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
      </div>
    </div>
  </div>;
}
