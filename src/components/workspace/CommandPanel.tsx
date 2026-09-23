'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowUp, ChevronDown, MessageSquareText, Search, X } from 'lucide-react';
import { useWorkspace } from '@/state/WorkspaceContext';
import { ToolMode } from '@/types/workspace';
import { COMMAND_CATALOG, COMMAND_EXAMPLES, executeTurkishCommand, normalizeCommand } from '@/math/turkishCommands';
import { MAX_COMMAND_LENGTH } from '@/math/commands/engine';
import {
  fitViewport, historyConflict, historySteps, sanitizeViewportPatch, shouldForceMeasurements, viewportCenter, zoomViewport,
} from '@/math/commands/viewActions';
import { TOOL_GROUPS } from './toolDefinitions';
import { CommandSuggestion, searchCommands } from '@/math/commandSearch';
import { interpretSemanticMatch } from '@/math/semanticCommands';
import { useSemanticCommands } from '@/hooks/useSemanticCommands';

const toolExamples = TOOL_GROUPS.flatMap(group => group.tools.map(tool => `${tool.name} aracını seç`));
const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);
const MAX_INPUT_HEIGHT = 160;

/** Dışarıdan (ör. mikrofondan) gelen komut metni. nonce her yeni metinde değişir. */
export interface IncomingCommand { text: string; nonce: number; run: boolean }

interface CommandPanelProps {
  onSelectTool: (tool: ToolMode) => void;
  /** 'bar': eski alt çubuk; 'drawer': düğmenin yanında açılan kutu */
  variant?: 'bar' | 'drawer';
  /** Gizliyken de sesli komutları işler; odağı yalnız görünürken alır. */
  visible?: boolean;
  incoming?: IncomingCommand | null;
  /** Gelen komut işlendiğinde çağrılır (sıradaki sesli komut ancak bundan sonra verilir). */
  onIncomingHandled?: (nonce: number) => void;
  onClose?: () => void;
  /** Başlık satırının sağına eklenecek denetimler (ör. ses ayarları) */
  headerExtra?: React.ReactNode;
}

export function CommandPanel({ onSelectTool, variant = 'bar', visible = true, incoming, onIncomingHandled, onClose, headerExtra }: CommandPanelProps) {
  const {
    objects, selectedObjectIds, setSelectedObjectIds, setActiveTool, commit, viewport, setViewport, resetViewport, pendingPointIds,
    undo, redo, history, historyIndex, requestClearAll, styleSettings, setStyleSettings, openRegularPolygonDialog, openCircleRadiusDialog,
    constraintError,
  } = useWorkspace();
  const [text, setText] = useState('');
  const [help, setHelp] = useState(false);
  const [helpFilter, setHelpFilter] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string; suggestions?: string[] } | null>(null);
  const [lastCommands, setLastCommands] = useState<string[]>([]);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const manuallyEdited = useRef(false);
  const listId = useId();
  const helpId = useId();
  const drawer = variant === 'drawer';
  const meaning = useSemanticCommands(text, visible && focused);
  const lexicalSuggestions = useMemo(() => searchCommands(text, {
    examples: toolExamples, history: lastCommands, labels: objects.map(o => o.label),
  }), [text, lastCommands, objects]);
  const interpretations = meaning.matches.filter(m => m.score >= 0.55 && m.score >= meaning.matches[0].score - 0.1)
    .map(match => interpretSemanticMatch(text, match, objects, selectedObjectIds));
  const semanticSuggestions: CommandSuggestion[] = interpretations.flatMap(item => item.command ? [{ text: item.command, kind: 'semantic' as const }] : []);
  const suggestions = [...semanticSuggestions, ...lexicalSuggestions].filter((item, index, all) =>
    all.findIndex(other => normalizeCommand(other.text) === normalizeCommand(item.text)) === index).slice(0, 6);
  const showSuggestions = focused && !dismissed && !help && suggestions.length > 0;

  // Komut örnekleri: aile başlıklarına göre; filtre başlıkta, aile kimliğinde ya da örnekte geçen sözcüklerle çalışır.
  const helpGroups = useMemo(() => {
    const groups = COMMAND_CATALOG.length ? COMMAND_CATALOG : [{ id: 'temel', title: 'Temel komutlar', examples: COMMAND_EXAMPLES }];
    const query = normalizeCommand(helpFilter);
    if (!query) return groups;
    const byId = groups.filter(group => normalizeCommand(group.id) === query);
    if (byId.length) return byId;
    const terms = query.split(' ').filter(Boolean);
    return groups.map(group => {
      const titleHit = terms.every(term => normalizeCommand(group.title).includes(term));
      return { ...group, examples: titleHit ? group.examples : group.examples.filter(example => terms.every(term => normalizeCommand(example).includes(term))) };
    }).filter(group => group.examples.length > 0);
  }, [helpFilter]);

  // Çok satırlı giriş: yazdıkça büyür (en fazla MAX_INPUT_HEIGHT), sonra kaydırılır.
  // Kutu border-box olduğu için yüksekliğe KENARLIK payı eklenir; eklenmeyince içerik 2 px taşıyor
  // ve tek satırlık komutta bile kaydırma çubuğu görünüyordu. Sığdığı sürece çubuk hiç çizilmez.
  useEffect(() => {
    const el = inputRef.current;
    if (!el || !visible) return;
    el.style.height = 'auto';
    const kenarlik = el.offsetHeight - el.clientHeight; // üst + alt kenarlık
    const istenen = el.scrollHeight + kenarlik;
    el.style.height = `${Math.min(istenen, MAX_INPUT_HEIGHT)}px`;
    el.style.overflowY = istenen > MAX_INPUT_HEIGHT ? 'auto' : 'hidden';
  }, [text, visible]);

  // Kutu açılınca yazmaya hazır olsun.
  useEffect(() => {
    if (drawer && visible) inputRef.current?.focus();
    if (!visible) { inputRef.current?.blur(); setFocused(false); }
  }, [drawer, visible]);

  const changeText = (value: string) => { manuallyEdited.current = value.trim().length > 0; setText(value); setActiveSuggestion(-1); setDismissed(false); };
  const chooseSuggestion = (value: string) => {
    manuallyEdited.current = true;
    setText(value); setActiveSuggestion(-1); setDismissed(true); inputRef.current?.focus();
  };

  const execute = (input: string = text, preserveDraft = false) => {
    setDismissed(true);
    const raw = input.trim();
    if (!raw) return;
    // pendingPointIds: yarım kalmış çokgen/parça çiziminin tıklanmış noktaları komut yolunda da KULLANIMDA sayılır.
    const plan = executeTurkishCommand(raw, objects, selectedObjectIds, { viewport, styleSettings, pendingPointIds });
    if (!plan.ok) {
      if (!preserveDraft) setText(raw);
      setResult({ ok: false, message: plan.message, suggestions: plan.suggestions?.length ? plan.suggestions : suggestions.map(s => s.text) });
      return;
    }
    const conflict = historyConflict(plan);
    if (conflict) { if (!preserveDraft) setText(raw); setResult({ ok: false, message: conflict }); return; }

    let message = plan.message;
    if (plan.sceneChanged) {
      commit(plan.objects, `Komut: ${raw}`);
      // Aynı ölçüm görünümünü hem fare hem komut yolunda kullan; kullanıcı aynı komutta sade görünüm istediyse zorlama.
      if (shouldForceMeasurements(plan)) {
        setViewport(prev => ({ ...prev, showMeasurements: true }));
        window.dispatchEvent(new Event('geoeba:show-measurements'));
      }
    }
    const sceneAfter = plan.sceneChanged ? plan.objects : objects;
    let historyPosition = historyIndex;
    let historyMoved = false;
    let toolChosen = false;

    for (const action of plan.actions) {
      switch (action.kind) {
        case 'undo':
        case 'redo': {
          const wanted = Number.isFinite(action.count) && (action.count ?? 1) >= 1 ? Math.floor(action.count ?? 1) : 1;
          const steps = historySteps(action.kind, action.count, historyPosition, history.length);
          for (let i = 0; i < steps; i++) (action.kind === 'undo' ? undo : redo)();
          historyPosition += action.kind === 'undo' ? -steps : steps;
          historyMoved = true;
          if (steps === 0) message = action.kind === 'undo' ? 'Geri alınacak işlem yok.' : 'Yinelenecek işlem yok.';
          else if (steps < wanted) message = `${message} Yalnızca ${steps} adım ${action.kind === 'undo' ? 'geri alınabildi' : 'yinelenebildi'}.`;
          break;
        }
        case 'clearAll': requestClearAll('2D'); break;
        case 'selectTool': onSelectTool(action.tool); toolChosen = true; break;
        case 'openDialog':
          toolChosen = true;
          if (action.dialog === 'function' || action.dialog === 'slider') onSelectTool(action.dialog);
          else if (action.dialog === 'regularPolygon') openRegularPolygonDialog(viewportCenter(viewport));
          else openCircleRadiusDialog(viewportCenter(viewport));
          break;
        case 'viewport': {
          const patch = sanitizeViewportPatch(action.patch);
          setViewport(prev => ({ ...prev, ...patch }));
          break;
        }
        case 'zoom': setViewport(prev => zoomViewport(prev, action.factor)); break;
        case 'fitView': setViewport(prev => fitViewport(prev, sceneAfter)); break;
        case 'resetView': resetViewport(); break;
        case 'styleMode': window.dispatchEvent(new CustomEvent('geoeba:style-mode', { detail: action.mode })); break;
        case 'planeType': window.dispatchEvent(new CustomEvent('geoeba:plane-type', { detail: action.plane })); break;
        case 'styleSettings': setStyleSettings(prev => ({ ...prev, ...action.patch })); break;
        case 'playback': window.dispatchEvent(new CustomEvent('geoeba:animation-playback', { detail: action })); break;
        case 'clearTraces': window.dispatchEvent(new CustomEvent('geoeba:clear-traces')); break;
        case 'help': setHelp(true); setHelpFilter(action.topic ?? ''); break;
      }
    }

    // Geri al/yinele seçimi zaten temizler; diğer komutlarda seçim komutun üzerinde çalıştığı nesneler olur.
    if (!historyMoved) {
      const selectionChanged = !sameIds(plan.selectedIds, selectedObjectIds);
      setSelectedObjectIds(plan.selectedIds);
      if (!toolChosen && (plan.sceneChanged || (selectionChanged && plan.selectedIds.length > 0))) setActiveTool('select');
    }
    setResult({ ok: true, message });
    if (!preserveDraft) { setText(''); manuallyEdited.current = false; }
    setLastCommands(prev => [raw, ...prev.filter(v => v !== raw)].slice(0, 8));
  };

  // Mikrofondan gelen metin: kutuya yazılır, istenirse hemen uygulanır. Sesli komutlar sırayla gelir;
  // her biri bir önceki uygulandıktan sonraki çizim üzerinde çalışsın diye işlendiği bildirilir.
  const executeRef = useRef(execute);
  executeRef.current = execute;
  const handledRef = useRef(onIncomingHandled);
  handledRef.current = onIncomingHandled;
  const lastIncoming = useRef<number | null>(null);
  useEffect(() => {
    // Aynı komut iki kez uygulanmasın (React geliştirme modu etkileri iki kez çalıştırabilir).
    if (!incoming || lastIncoming.current === incoming.nonce) return;
    lastIncoming.current = incoming.nonce;
    if (incoming.run) executeRef.current(incoming.text, true);
    // Son algılanan metin düzeltmeye hazır kalır; ses sonucu odağı ya da elle yazılan taslağı almaz.
    if (!manuallyEdited.current) {
      setText(incoming.text);
      setActiveSuggestion(-1);
      setDismissed(true);
    }
    handledRef.current?.(incoming.nonce);
  }, [incoming]);

  const submit = (event: React.FormEvent) => { event.preventDefault(); execute(); };

  const sectionClass = drawer
    ? 'relative flex w-full flex-col rounded-2xl border border-border bg-card/95 px-3 py-2.5 shadow-2xl backdrop-blur'
    : 'relative shrink-0 border-t border-border bg-card px-3 py-2 sm:px-5';
  const popoverClass = drawer ? 'absolute bottom-full left-0 right-0 mb-2' : 'absolute bottom-full left-3 right-3 sm:left-5 sm:right-5 mb-2';

  return <section aria-label="Türkçe çizim komutları" className={sectionClass}>
    <div className="flex items-center justify-between mb-1.5 gap-2">
      <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-foreground"><MessageSquareText className="w-4 h-4 shrink-0 text-ada-deniz" />Yazarak oluştur <span data-semantic-status={meaning.status} className="truncate text-[10px] font-normal text-muted-foreground">{meaning.status === 'loading' ? 'Anlam araması hazırlanıyor…' : meaning.status === 'ready' ? 'Anlamsal arama · Çevrimdışı' : meaning.status === 'error' ? 'Anlam modeli açılamadı · Kelime araması aktif' : 'Çevrimdışı'}</span></span>
      <span className="flex shrink-0 items-center gap-1.5">
        {headerExtra}
        <button type="button" onClick={() => setHelp(!help)} aria-expanded={help} aria-controls={help ? helpId : undefined} className="flex items-center gap-1 text-[11px] text-primary">Komut örnekleri <ChevronDown className="w-3 h-3" /></button>
        {onClose && <button type="button" onClick={onClose} aria-label="Komut kutusunu kapat" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      </span>
    </div>
    {help && <div id={helpId} className={`${popoverClass} z-40 flex max-h-[24rem] flex-col rounded-xl border border-border bg-card p-3 shadow-xl`}>
      <p className="text-xs text-muted-foreground mb-2">Ne istediğinizi kendi cümlenizle yazın ya da mikrofona söyleyin. Bir cümlede birden fazla işlem olabilir (“üçgen çiz ve alanını göster”). Nesnelere adıyla (ABC, [AB], A&apos;) ya da seçerek başvurun. Hedef belirsizse nasıl düzelteceğiniz söylenir; anlaşılmayan komut çizimi değiştirmez. Shift+Enter yeni satır açar.</p>
      <label className="relative mb-2 block">
        <Search aria-hidden className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input type="search" aria-label="Komut örneklerinde ara" value={helpFilter} onChange={e => setHelpFilter(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); setHelp(false); inputRef.current?.focus(); } }}
          placeholder="Örneklerde ara: çember, yansıt, alan, kaydırıcı…" autoComplete="off"
          className="w-full rounded-lg border border-border bg-background py-1.5 pl-7 pr-2 text-xs outline-none focus:ring-2 focus:ring-primary/30" />
      </label>
      <div className="min-h-0 flex-1 space-y-2.5 overflow-auto pr-1">
        {helpGroups.map(group => <section key={group.id} aria-label={group.title}>
          <h3 className="mb-1 text-[11px] font-bold text-foreground">{group.title}</h3>
          <div className="flex flex-wrap gap-1.5">{group.examples.map(example => <button key={example} type="button" onClick={() => { chooseSuggestion(example); setHelp(false); }} className="rounded-lg border border-border px-2 py-1.5 text-left text-xs hover:bg-muted">{example}</button>)}</div>
        </section>)}
        {helpGroups.length === 0 && <p className="text-xs text-muted-foreground">“{helpFilter}” için örnek bulunamadı. Yine de cümlenizi yazıp deneyebilirsiniz.</p>}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Araç kutusundaki işlerin hepsi yazarak ya da konuşarak da yapılabilir: çizim, inşa, dönüşüm, ölçüm, düzenleme, görünüm, kaydırıcı ve fonksiyonlar.</p>
    </div>}
    {showSuggestions && <div className={`${popoverClass} z-40 rounded-xl border border-border bg-card shadow-xl overflow-hidden`}>
      <p className="px-3 py-2 text-[11px] text-muted-foreground border-b border-border">Komut önerileri · ↑ ↓ ile gezin, Enter ile metne alın; tekrar Enter ile uygulayın.</p>
      <ul id={listId} role="listbox" aria-label="Komut önerileri" className="max-h-56 overflow-y-auto">
        {suggestions.map((suggestion, index) => <li key={suggestion.text} id={`${listId}-${index}`} role="option"
          aria-selected={activeSuggestion === index}
          onMouseDown={event => event.preventDefault()}
          onClick={() => chooseSuggestion(suggestion.text)}
          className={`flex items-center justify-between gap-3 px-3 py-2.5 text-sm cursor-pointer ${activeSuggestion === index ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
          <span>{suggestion.text}</span><span className="shrink-0 text-[10px] text-muted-foreground">{suggestion.kind === 'semantic' ? 'Anlam eşleşmesi' : suggestion.kind === 'correction' ? 'Bunu mu demek istediniz?' : suggestion.kind === 'history' ? 'Geçmiş' : 'Öneri'}</span>
        </li>)}
      </ul>
    </div>}
    <form onSubmit={submit} className="flex items-end gap-2">
      <textarea ref={inputRef} role="combobox" aria-label="Çizim komutu" aria-autocomplete="list" aria-expanded={showSuggestions}
        aria-controls={showSuggestions ? listId : undefined} aria-activedescendant={showSuggestions && activeSuggestion >= 0 ? `${listId}-${activeSuggestion}` : undefined}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} value={text} onChange={e => changeText(e.target.value)} maxLength={MAX_COMMAND_LENGTH}
        placeholder="Örn. kenarları 3, 4, 5 olan üçgen çiz ve alanını göster" autoComplete="off" spellCheck={false} rows={1}
        className="min-w-0 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm leading-5 outline-none focus:ring-2 focus:ring-primary/30"
        style={{ maxHeight: MAX_INPUT_HEIGHT }}
        onKeyDown={e => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Escape') {
            e.preventDefault();
            if (drawer && onClose && !showSuggestions && !help) onClose();
            setDismissed(true); setHelp(false);
          } else if (showSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            const next = (activeSuggestion + (e.key === 'ArrowDown' ? 1 : activeSuggestion < 0 ? 0 : -1) + suggestions.length) % suggestions.length;
            setActiveSuggestion(next);
            document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: 'nearest' });
          } else if (showSuggestions && activeSuggestion >= 0 && ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab')) {
            e.preventDefault(); chooseSuggestion(suggestions[activeSuggestion].text);
          } else if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); execute();
          } else if (e.key === 'ArrowUp' && !text && lastCommands[0]) { e.preventDefault(); changeText(lastCommands[0]); }
        }} />
      <button type="submit" disabled={!text.trim()} aria-label="Komutu uygula" className="h-9 rounded-xl bg-primary text-primary-foreground px-3 disabled:opacity-40"><ArrowUp className="w-4 h-4" /></button>
    </form>
    {focused && interpretations[0]?.clarification && <p className="mt-1.5 text-xs text-primary">{interpretations[0].clarification}</p>}
    {(result || constraintError) && <p role="status" className={`mt-1.5 text-xs ${constraintError || !result?.ok ? 'text-destructive' : 'text-muted-foreground'}`}>
      {constraintError ? `${constraintError} Son geçerli çizim korundu.` : result?.message}
    </p>}
    {result && !result.ok && result.suggestions && result.suggestions.length > 0 && <div className="flex gap-2 overflow-x-auto mt-1">{result.suggestions.slice(0, 3).map(s => <button type="button" key={s} onClick={() => chooseSuggestion(s)} className="text-[11px] shrink-0 text-primary underline">{s}</button>)}</div>}
  </section>;
}
