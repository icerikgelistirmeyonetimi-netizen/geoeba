'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useTheme } from '@/state/ThemeContext';
import { Brand } from './Brand';
import { WorkspaceMenuBar } from '@/components/workspace/WorkspaceMenuBar';
import { Modal } from '@/components/ui/Modal';
import { curriculumData } from '@/curriculum/curriculumData';
import type { Activity, GradeId, LevelId, Topic } from '@/types/curriculum';
import {
  Menu,
  Search,
  Sparkles,
  Undo2,
  Redo2,
  Maximize2,
  RotateCcw,
  Sun,
  Moon,
  Compass,
  Layers,
  Shapes,
  Box,
  X,
} from 'lucide-react';

// ============================================================
// HIZLI ARAMA DİZİNİ (müfredat üzerinde gerçek arama)
// ============================================================

type SearchHitKind = 'tema' | 'konu' | 'etkinlik';

interface SearchHit {
  key: string;
  kind: SearchHitKind;
  title: string;
  /** Sonucun altında görünen bağlam satırı: "5. Sınıf · Geometrik Şekiller" */
  context: string;
  gradeNumber: GradeId;
  /** Doğrudan açılacak etkinlik (tema sonuçlarında null) */
  activity: Activity | null;
  /** Aramanın tarandığı, normalize edilmiş metin */
  haystack: string;
}

/** Türkçe duyarlı normalize: büyük/küçük ve aksan farklarını yok sayar. */
function normalizeForSearch(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

let searchIndexCache: SearchHit[] | null = null;

/** Müfredatı tek seferde düz bir arama dizinine çevirir (modül düzeyinde önbelleklenir). */
function getSearchIndex(): SearchHit[] {
  if (searchIndexCache) return searchIndexCache;

  const hits: SearchHit[] = [];
  let seq = 0;

  for (const levelId of Object.keys(curriculumData.levels) as LevelId[]) {
    const level = curriculumData.levels[levelId];

    for (const grade of level.grades) {
      const gradeLabel = grade.title;
      const themes = grade.themes || [];

      for (const theme of themes) {
        seq += 1;
        hits.push({
          key: `tema-${theme.id}-${seq}`,
          kind: 'tema',
          title: theme.themeName,
          context: gradeLabel,
          gradeNumber: grade.gradeNumber,
          activity: null,
          haystack: normalizeForSearch(
            `${theme.themeName} ${theme.fullTitle} ${theme.description} ${theme.code || ''}`
          ),
        });
      }

      const topicGroups: { themeName: string; topics: Topic[] }[] = [
        ...themes.map((theme) => ({ themeName: theme.themeName, topics: theme.topics || [] })),
        { themeName: '', topics: grade.topics || [] },
      ];

      for (const group of topicGroups) {
        for (const topic of group.topics) {
          seq += 1;
          hits.push({
            key: `konu-${topic.id}-${seq}`,
            kind: 'konu',
            title: topic.title,
            context: group.themeName ? `${gradeLabel} · ${group.themeName}` : gradeLabel,
            gradeNumber: grade.gradeNumber,
            activity: topic.activities?.[0] ?? null,
            haystack: normalizeForSearch(
              `${topic.title} ${topic.description} ${topic.code || ''} ${(topic.learningOutcomes || []).join(' ')}`
            ),
          });

          for (const activity of topic.activities || []) {
            seq += 1;
            hits.push({
              key: `etkinlik-${activity.id}-${seq}`,
              kind: 'etkinlik',
              title: activity.title,
              context: `${gradeLabel} · ${topic.title}`,
              gradeNumber: grade.gradeNumber,
              activity,
              haystack: normalizeForSearch(
                `${activity.title} ${activity.description} ${activity.learningGoal}`
              ),
            });
          }
        }
      }
    }
  }

  searchIndexCache = hits;
  return hits;
}

const MAX_SEARCH_RESULTS = 7;
const MIN_SEARCH_LENGTH = 2;

/** Sonuç türüne göre listeleme önceliği (konu > etkinlik > tema). */
const KIND_ORDER: Record<SearchHitKind, number> = { konu: 0, etkinlik: 1, tema: 2 };

const KIND_LABEL: Record<SearchHitKind, string> = {
  konu: 'Konu',
  etkinlik: 'Etkinlik',
  tema: 'Tema',
};

function searchCurriculum(rawQuery: string): SearchHit[] {
  const query = normalizeForSearch(rawQuery);
  if (query.length < MIN_SEARCH_LENGTH) return [];

  const scored: { hit: SearchHit; score: number }[] = [];

  for (const hit of getSearchIndex()) {
    const title = normalizeForSearch(hit.title);
    let score = -1;
    if (title === query) score = 0;
    else if (title.startsWith(query)) score = 1;
    else if (title.includes(query)) score = 2;
    else if (hit.haystack.includes(query)) score = 3;

    if (score >= 0) scored.push({ hit, score });
  }

  scored.sort((a, b) => a.score - b.score || KIND_ORDER[a.hit.kind] - KIND_ORDER[b.hit.kind]);

  return scored.slice(0, MAX_SEARCH_RESULTS).map((entry) => entry.hit);
}

function HitIcon({ kind }: { kind: SearchHitKind }) {
  if (kind === 'tema') return <Layers className="w-4 h-4 text-purple-500 shrink-0" />;
  if (kind === 'etkinlik') return <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />;
  return <Compass className="w-4 h-4 text-blue-600 shrink-0" />;
}

// ============================================================

export function Header() {
  const {
    currentScreen,
    goHome,
    startFreeSandbox,
    selectLevel,
    selectGrade,
    selectActivity,
    searchQuery,
    setSearchQuery,
  } = useCurriculum();

  const { canUndo, canRedo, undo, redo, resetViewport, requestClearAll, studioDimension } = useWorkspace();
  const { setTheme, isDark } = useTheme();

  // Geri Al / Yinele / Sıfırla yalnızca 2D tuvale etki eder; 3D'de kendi geçmişi vardır.
  const is3D = studioDimension === '3D';

  // State
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Odak kaybında paneli geciktirmeli kapatan zamanlayıcı (tıklamanın kaydolması için)
  const blurTimerRef = useRef<number | null>(null);

  const clearBlurTimer = useCallback(() => {
    if (blurTimerRef.current !== null) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
  }, []);

  // Bileşen kaldırıldığında bekleyen zamanlayıcıyı temizle
  useEffect(() => clearBlurTimer, [clearBlurTimer]);

  const searchResults = useMemo(() => searchCurriculum(searchQuery), [searchQuery]);
  const trimmedQuery = searchQuery.trim();

  /** Bir arama sonucuna gider: önce sınıfı seçer, etkinlik varsa görevi açar. */
  const openSearchHit = useCallback(
    (hit: SearchHit) => {
      clearBlurTimer();
      setIsSearchFocused(false);
      // Kademe + sınıf + portal ekranını tek çağrıda ayarlar
      selectGrade(hit.gradeNumber);
      if (hit.activity) selectActivity(hit.activity, true);
      // Sorgu temizlenmezse portal filtresi diğer ekranlara sızar
      setSearchQuery('');
    },
    [clearBlurTimer, selectActivity, selectGrade, setSearchQuery]
  );

  /** "Akıllı Arama": en iyi sonuca gider, sonuç yoksa kutuya odaklanır. */
  const runSmartSearch = useCallback(() => {
    if (searchResults.length > 0) {
      openSearchHit(searchResults[0]);
      return;
    }
    clearBlurTimer();
    setIsSearchFocused(true);
    searchInputRef.current?.focus();
  }, [clearBlurTimer, openSearchHit, searchResults]);

  const openSandboxFromSearch = useCallback(() => {
    clearBlurTimer();
    setIsSearchFocused(false);
    setSearchQuery('');
    startFreeSandbox();
  }, [clearBlurTimer, setSearchQuery, startFreeSandbox]);

  const closeMenuDrawer = useCallback(() => setShowMenuDrawer(false), []);

  return (
    <>
      <header data-uygulama-basligi className="h-14 bg-white/95 dark:bg-[#15171c]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-4 flex items-center justify-between z-[100] sticky top-0 shadow-xs select-none">
        {/* ================= SOL: LOGO + KADEME BUTONLARI ================= */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 mr-2">
          {/* Menü Hamburger Butonu */}
          <button
            onClick={() => setShowMenuDrawer((prev) => !prev)}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Menü"
            aria-label="Menüyü Aç"
            aria-haspopup="dialog"
            aria-expanded={showMenuDrawer}
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Logo */}
          <button
            onClick={goHome}
            className="flex items-center rounded-xl transition-opacity hover:opacity-85 cursor-pointer"
            aria-label="GeoEBA — Ana sayfaya dön"
            title="Ana Sayfaya Dön"
          >
            <Brand />
          </button>

          {currentScreen === 'workspace' && (
            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 mx-0.5 hidden sm:block" />
          )}
        </div>

        {currentScreen === 'workspace' ? (
          /* ================= ÇALIŞMA ALANI MENÜ ÇUBUĞU ================= */
          <WorkspaceMenuBar />
        ) : (
          <>
            {/* ================= ORTA: ARAMA BARI ================= */}
            <div className="flex-1 max-w-lg mx-3 sm:mx-6 relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Ara (Konu, Şekil, Görev...)"
                  value={searchQuery}
                  aria-label="Müfredatta ara"
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    clearBlurTimer();
                    setIsSearchFocused(true);
                  }}
                  onBlur={() => {
                    clearBlurTimer();
                    blurTimerRef.current = window.setTimeout(() => {
                      blurTimerRef.current = null;
                      setIsSearchFocused(false);
                    }, 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      runSmartSearch();
                    } else if (e.key === 'Escape') {
                      clearBlurTimer();
                      setIsSearchFocused(false);
                    }
                  }}
                  className="w-full pl-9 pr-10 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/90 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
                {/* Mor Parlama / Akıllı Arama Butonu */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Girdinin odağını kaybetmesini (ve 200 ms'lik kapatma yarışını) engelle
                    e.preventDefault();
                    runSmartSearch();
                  }}
                  className="absolute right-1.5 w-7 h-7 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 text-white flex items-center justify-center shadow-sm transition-transform active:scale-95 cursor-pointer"
                  title="Akıllı Arama (En iyi sonuca git)"
                  aria-label="Akıllı Arama"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Hızlı Arama Sonuçları Açılır Paneli */}
              {isSearchFocused && trimmedQuery.length > 0 && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-150 max-h-72 overflow-y-auto"
                  aria-label="Hızlı arama sonuçları"
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Hızlı Sonuçlar
                  </div>

                  {trimmedQuery.length < MIN_SEARCH_LENGTH && (
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Aramak için en az {MIN_SEARCH_LENGTH} karakter yazın.
                    </div>
                  )}

                  {trimmedQuery.length >= MIN_SEARCH_LENGTH && searchResults.length === 0 && (
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      &quot;{trimmedQuery}&quot; ile eşleşen konu veya etkinlik bulunamadı.
                    </div>
                  )}

                  {searchResults.map((hit) => (
                    <button
                      key={hit.key}
                      type="button"
                      onMouseDown={() => openSearchHit(hit)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer"
                    >
                      <HitIcon kind={hit.kind} />
                      <span className="flex flex-col min-w-0 flex-1">
                        <span className="truncate">{hit.title}</span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
                          {KIND_LABEL[hit.kind]} · {hit.context}
                        </span>
                      </span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onMouseDown={openSandboxFromSearch}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 cursor-pointer"
                  >
                    <Shapes className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Serbest Çizim Stüdyosunda Aç</span>
                  </button>
                </div>
              )}
            </div>

            {/* ================= SAĞ: TEMA (Workspace dışında) ================= */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                  title={isDark ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
                  aria-label={isDark ? 'Açık Temaya Geç' : 'Koyu Temaya Geç'}
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Menü Yan Çekmecesi — paylaşılan Modal kabuğu (Escape, odak yönetimi, gövde kilidi) */}
      <Modal
        isOpen={showMenuDrawer}
        onClose={closeMenuDrawer}
        labelledBy="menu-drawer-title"
        overlayClassName="bg-black/40 backdrop-blur-sm !p-0 !items-stretch !justify-start"
        className="w-72 bg-white dark:bg-slate-900 h-full p-5 shadow-2xl border-r border-slate-200 dark:border-slate-800 space-y-4 overflow-y-auto animate-in slide-in-from-left duration-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div id="menu-drawer-title"><Brand /></div>
          <button
            onClick={closeMenuDrawer}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
            title="Menüyü Kapat"
            aria-label="Menüyü Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-1.5 text-xs font-semibold">
          <button
            onClick={() => {
              goHome();
              closeMenuDrawer();
            }}
            className="w-full text-left px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white hover:bg-slate-100 flex items-center gap-2.5"
          >
            <Compass className="w-4 h-4 text-blue-600" />
            <span>Ana Sayfa (Kademe Seçimi)</span>
          </button>
          <button
            onClick={() => {
              selectLevel('ilkokul');
              closeMenuDrawer();
            }}
            className="w-full text-left px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
          >
            <Shapes className="w-4 h-4 text-amber-500" />
            <span>İlkokul Matematik (1-4. Sınıf)</span>
          </button>
          <button
            onClick={() => {
              selectLevel('ortaokul');
              closeMenuDrawer();
            }}
            className="w-full text-left px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
          >
            <Compass className="w-4 h-4 text-blue-600" />
            <span>Ortaokul Matematik (5-8. Sınıf)</span>
          </button>
          <button
            onClick={() => {
              selectLevel('lise');
              closeMenuDrawer();
            }}
            className="w-full text-left px-3.5 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2.5"
          >
            <Box className="w-4 h-4 text-purple-600" />
            <span>Lise Matematik (9-12. Sınıf)</span>
          </button>
          <button
            onClick={() => {
              startFreeSandbox();
              closeMenuDrawer();
            }}
            className="w-full text-left px-3.5 py-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 flex items-center gap-2.5"
          >
            <Layers className="w-4 h-4 text-emerald-500" />
            <span>Serbest Çizim Stüdyosu</span>
          </button>
        </div>
      </Modal>
    </>
  );
}
