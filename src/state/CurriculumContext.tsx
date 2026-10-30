'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { LevelId, GradeId, Topic, Activity, Level, Grade, MathCategory } from '@/types/curriculum';
import { curriculumData } from '@/curriculum/curriculumData';
import { paylasimGecisi, paylasimiYakala } from '@/math/cizimPaylasimi';

export type AppScreen = 'home' | 'portal' | 'grades' | 'topics' | 'mission' | 'workspace';

interface HistoryNavState {
  screen: AppScreen;
  levelId: LevelId | null;
  gradeNumber: GradeId | null;
  topicId: string | null;
  activityId: string | null;
  isFreeSandbox: boolean;
  /** Portal ekranında açık olan Keşif Modalı'nın konusu (tarayıcı geri tuşu modalı kapatabilsin diye) */
  modalTopicId: string | null;
}

interface CurriculumContextType {
  currentScreen: AppScreen;
  selectedLevel: Level | null;
  selectedGrade: Grade | null;
  selectedTopic: Topic | null;
  selectedActivity: Activity | null;
  selectedCategory: MathCategory;
  isFreeSandbox: boolean;
  searchQuery: string;

  // İlerleme ve Tamamlanan Etkinlikler
  completedActivityIds: string[];
  markActivityCompleted: (activityId: string) => void;

  // Navigasyon eylemleri
  selectLevel: (levelId: LevelId) => void;
  selectGrade: (gradeNumber: GradeId) => void;
  selectTopic: (topicId: string) => void;
  selectActivity: (activity: Activity, openAsMission?: boolean) => void;
  activeModalTopic: Topic | null;
  setActiveModalTopic: (topic: Topic | null) => void;
  setSelectedCategory: (category: MathCategory) => void;
  setSearchQuery: (query: string) => void;
  startFreeSandbox: () => void;
  openMissionMode: (activity: Activity) => void;
  openStudioMode: () => void;
  goBack: () => void;
  goHome: () => void;
  setScreen: (screen: AppScreen) => void;
}

const CurriculumContext = createContext<CurriculumContextType | undefined>(undefined);

const HOME_NAV_STATE: HistoryNavState = {
  screen: 'home',
  levelId: null,
  gradeNumber: null,
  topicId: null,
  activityId: null,
  isFreeSandbox: false,
  modalTopicId: null,
};

/**
 * Sınıf numarasından kademeyi müfredat verisinden türetir.
 * Sabit aralık kuralı yerine veriyi tek kaynak kabul eder; böylece Lise "Hazırlık Sınıfı"
 * (gradeNumber: 0) doğru şekilde 'lise' kademesine eşlenir (0 sayısı falsy olduğu için
 * elle yazılan aralık koşulları bu sınıfı ilkokula düşürüyordu).
 */
function levelIdForGrade(gradeNumber: number): LevelId | null {
  for (const levelKey of Object.keys(curriculumData.levels) as LevelId[]) {
    if (curriculumData.levels[levelKey].grades.some((g) => g.gradeNumber === gradeNumber)) {
      return levelKey;
    }
  }
  return null;
}

/** Bir etkinliğin ait olduğu kademe, sınıf ve konuyu bulur */
function locateActivity(activityId: string): {
  levelId: LevelId;
  gradeNumber: GradeId;
  topicId: string;
} | null {
  for (const levelKey of Object.keys(curriculumData.levels) as LevelId[]) {
    const level = curriculumData.levels[levelKey];
    for (const grade of level.grades) {
      const topics = [...(grade.topics || []), ...(grade.themes || []).flatMap((th) => th.topics || [])];
      for (const topic of topics) {
        if ((topic.activities || []).some((a) => a.id === activityId)) {
          return { levelId: levelKey, gradeNumber: grade.gradeNumber as GradeId, topicId: topic.id };
        }
      }
    }
  }
  return null;
}

/** Bir konunun ait olduğu kademe ve sınıfı bulur */
function locateTopic(topicId: string): {
  levelId: LevelId;
  gradeNumber: GradeId;
  topic: Topic;
} | null {
  for (const levelKey of Object.keys(curriculumData.levels) as LevelId[]) {
    const level = curriculumData.levels[levelKey];
    for (const grade of level.grades) {
      const topics = [...(grade.topics || []), ...(grade.themes || []).flatMap((th) => th.topics || [])];
      for (const topic of topics) {
        if (topic.id === topicId) {
          return { levelId: levelKey, gradeNumber: grade.gradeNumber as GradeId, topic };
        }
      }
    }
  }
  return null;
}

/** ID'ye göre konu arama */
function findTopicById(topicId: string): Topic | null {
  return locateTopic(topicId)?.topic || null;
}

/** Gezinme durumundan adres çubuğu hash'ini üretir (parseHashToNavState'in tersi) */
function hashForNavState(navState: HistoryNavState): string {
  switch (navState.screen) {
    case 'home':
      return '#/home';
    case 'grades':
      return navState.levelId ? `#/kademe/${navState.levelId}` : '#/home';
    case 'portal':
      // gradeNumber 0 (Hazırlık Sınıfı) geçerli bir değerdir; truthy kontrolü kullanılamaz.
      return navState.gradeNumber != null ? `#/sinif/${navState.gradeNumber}` : '#/portal';
    case 'topics':
      return navState.topicId ? `#/konu/${navState.topicId}` : '#/portal';
    case 'mission':
      return navState.activityId ? `#/gorev/${navState.activityId}` : '#/portal';
    case 'workspace':
      if (!navState.isFreeSandbox && navState.activityId) return `#/calisma/${navState.activityId}`;
      return '#/studyo';
    default:
      return '#/home';
  }
}

/**
 * Adres çubuğundaki hash'i uygulama gezinme durumuna çevirir.
 * Desteklenen biçimler: #/home, #/studyo, #/portal, #/kademe/:levelId, #/sinif/:gradeNumber,
 * #/konu/:topicId, #/gorev/:activityId, #/calisma/:activityId
 * Paylaşım bağlantısı #/studyo/paylas/:kademe/:veri stüdyoyu açar; çizimi CurriculumProvider hash
 * sadeleşmeden önce yakalar (math/cizimPaylasimi.ts).
 */
export function parseHashToNavState(rawHash: string): { state: HistoryNavState; hash: string } {
  const hash = (rawHash || '').replace(/^#\/?/, '').trim();
  const parts = hash.split('/').filter(Boolean);
  const fallback = { state: HOME_NAV_STATE, hash: '#/home' };
  if (parts.length === 0) return fallback;

  const [section, param] = parts;

  if (section === 'home') return fallback;

  if (section === 'studyo') {
    return {
      state: { ...HOME_NAV_STATE, screen: 'workspace', isFreeSandbox: true },
      hash: '#/studyo',
    };
  }

  if (section === 'portal') {
    return {
      state: { ...HOME_NAV_STATE, screen: 'portal' },
      hash: '#/portal',
    };
  }

  if (section === 'konu' && param) {
    const where = locateTopic(param);
    if (!where) return fallback;
    return {
      state: {
        ...HOME_NAV_STATE,
        screen: 'topics',
        levelId: where.levelId,
        gradeNumber: where.gradeNumber,
        topicId: param,
      },
      hash: `#/konu/${param}`,
    };
  }

  if (section === 'kademe' && param) {
    if (!Object.prototype.hasOwnProperty.call(curriculumData.levels, param)) return fallback;
    const levelId = param as LevelId;
    return {
      state: { ...HOME_NAV_STATE, screen: 'grades', levelId },
      hash: `#/kademe/${levelId}`,
    };
  }

  if (section === 'sinif' && param) {
    const gradeNumber = Number(param);
    const levelId = Number.isFinite(gradeNumber) ? levelIdForGrade(gradeNumber) : null;
    if (!levelId) return fallback;
    return {
      state: {
        ...HOME_NAV_STATE,
        screen: 'portal',
        levelId,
        gradeNumber: gradeNumber as GradeId,
      },
      hash: `#/sinif/${gradeNumber}`,
    };
  }

  if ((section === 'gorev' || section === 'calisma') && param) {
    const activity = findActivityById(param);
    if (!activity) return fallback;
    const where = locateActivity(param);
    const isMission = section === 'gorev';
    return {
      state: {
        ...HOME_NAV_STATE,
        screen: isMission ? 'mission' : 'workspace',
        levelId: where ? where.levelId : null,
        gradeNumber: where ? where.gradeNumber : null,
        topicId: where ? where.topicId : null,
        activityId: param,
        isFreeSandbox: false,
      },
      hash: `#/${section}/${param}`,
    };
  }

  return fallback;
}

const PROGRESS_STORAGE_KEY = 'matematik_tamamlanan_etkinlikler_v3';

// Yardımcı: ID'ye göre etkinliği arama
function findActivityById(activityId: string): Activity | null {
  for (const levelKey of Object.keys(curriculumData.levels) as LevelId[]) {
    const level = curriculumData.levels[levelKey];
    for (const grade of level.grades) {
      for (const topic of grade.topics || []) {
        const found = topic.activities.find((a) => a.id === activityId);
        if (found) return found;
      }
      for (const theme of grade.themes || []) {
        for (const topic of theme.topics || []) {
          const found = topic.activities.find((a) => a.id === activityId);
          if (found) return found;
        }
      }
    }
  }
  return null;
}

// Yardımcı: Etkinlik ID'sine göre ait olduğu konuyu bulma
function findTopicByActivityId(activityId: string): Topic | null {
  for (const levelKey of Object.keys(curriculumData.levels) as LevelId[]) {
    const level = curriculumData.levels[levelKey];
    for (const grade of level.grades) {
      for (const topic of grade.topics || []) {
        if (topic.activities.some((a) => a.id === activityId)) return topic;
      }
      for (const theme of grade.themes || []) {
        for (const topic of theme.topics || []) {
          if (topic.activities.some((a) => a.id === activityId)) return topic;
        }
      }
    }
  }
  return null;
}

export function CurriculumProvider({ children }: { children: React.ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [selectedLevelId, setSelectedLevelId] = useState<LevelId | null>(null);
  const [selectedGradeNumber, setSelectedGradeNumber] = useState<GradeId | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activeModalTopic, setActiveModalTopicState] = useState<Topic | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MathCategory>('hepsi');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFreeSandbox, setIsFreeSandbox] = useState<boolean>(false);
  const [completedActivityIds, setCompletedActivityIds] = useState<string[]>([]);

  const isPopStateRef = useRef(false);
  /** Serbest stüdyo (sınıf ekranı) şu an açık mı: popstate dinleyicisi bir kez kurulur, güncel değeri buradan okur */
  const studyoAcikRef = useRef(false);
  studyoAcikRef.current = currentScreen === 'workspace' && isFreeSandbox;

  const selectedLevel = selectedLevelId ? curriculumData.levels[selectedLevelId] : null;
  // Hazırlık Sınıfı'nın gradeNumber değeri 0'dır; 0 falsy olduğu için burada `||` kullanılamaz.
  const effectiveGradeNumber =
    selectedGradeNumber ??
    (selectedLevelId === 'ilkokul' ? 1 : selectedLevelId === 'lise' ? 9 : 5);
  const selectedGrade =
    selectedLevel
      ? selectedLevel.grades.find((g) => g.gradeNumber === effectiveGradeNumber) || selectedLevel.grades[0]
      : null;

  const selectedTopic =
    selectedGrade && selectedTopicId
      ? selectedGrade.topics.find((t) => t.id === selectedTopicId) ||
        selectedGrade.themes.flatMap((th) => th.topics).find((t) => t.id === selectedTopicId) ||
        null
      : null;

  // LocalStorage'dan kayıtlı ilerlemeyi yükleme
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        if (Array.isArray(parsed)) setCompletedActivityIds(parsed);
      }
    } catch (e) {}
  }, []);

  // Tarayıcı Geçmişi (Browser Back / Forward) Senkronizasyonu
  const pushBrowserHistory = useCallback((navState: HistoryNavState, mode: 'push' | 'replace' = 'push') => {
    if (typeof window === 'undefined' || isPopStateRef.current) return;

    const urlHash = hashForNavState(navState);
    const currentState = (window.history.state || {}) as Record<string, unknown>;

    // Next.js App Router'ın kendi geçmiş alanlarını (__NA, tree vb.) ezmemek için üzerine yaz.
    const entryState = { ...currentState, ...navState };

    try {
      if (mode === 'replace') window.history.replaceState(entryState, '', urlHash);
      else window.history.pushState(entryState, '', urlHash);
    } catch (e) {}
  }, []);

  // Popstate Olayını Dinleme (Tarayıcı Geri/İleri Tuşuna Basıldığında)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // İlk sayfa yüklenişinde adres çubuğundaki hash'i çözümle ve o ekranı aç
    // (#/studyo, #/sinif/5, #/gorev/xyz gibi doğrudan bağlantılar çalışsın).
    // Koşulsuz çalışır: React StrictMode bileşeni yeniden bağladığında durum
    // sıfırlanır ama adres aynı kalır; bu yüzden hash daima kaynak kabul edilir.
    // Kullanıcı gezindikçe hash ekranla eşitlendiği için tekrar uygulamak etkisizdir.
    // Paylaşım bağlantısının çizimi adresten silinmeden önce saklanır (sınıf ekranı açılınca alır); adres '#/studyo'
    // olarak sadeleşir: sayfa yenilenince paylaşılan çizim kullanıcının sonraki değişikliklerinin üzerine yeniden yazılmaz.
    paylasimiYakala(window.location.hash);
    const parsed = parseHashToNavState(window.location.hash);
    window.history.replaceState({ ...(window.history.state || {}), ...parsed.state }, '', parsed.hash);

    if (parsed.state.screen !== 'home') {
      setCurrentScreen(parsed.state.screen);
      setSelectedLevelId(parsed.state.levelId);
      setSelectedGradeNumber(parsed.state.gradeNumber);
      setSelectedTopicId(parsed.state.topicId);
      setIsFreeSandbox(parsed.state.isFreeSandbox);
      setSelectedActivity(parsed.state.activityId ? findActivityById(parsed.state.activityId) : null);
    }

    const applyNavState = (state: HistoryNavState) => {
      setCurrentScreen(state.screen);
      setSelectedLevelId(state.levelId);
      setSelectedGradeNumber(state.gradeNumber);
      setSelectedTopicId(state.topicId);
      setIsFreeSandbox(state.isFreeSandbox || false);
      setSelectedActivity(state.activityId ? findActivityById(state.activityId) : null);
      // Keşif Modalı da geçmişin parçası: geri/ileri modalı kendiliğinden açık bırakmaz.
      setActiveModalTopicState(state.modalTopicId ? findTopicById(state.modalTopicId) : null);
    };

    const handlePopState = (event: PopStateEvent) => {
      // Paylaşım adresi: stüdyonun kendi geçmiş kaydına (adres çizimle güncellenmişti) geri / ileri gelindiyse çizim
      // yakalanır ve kayıt olağan uygulanır (sınıf ekranı bağlanınca alır). Adres çubuğuna yapıştırılan bağlantıda ya da
      // stüdyo zaten açıkken sayfa baştan açılır (sınıf açılışı, oturum, çizim).
      const gecis = paylasimGecisi(window.location.hash, event.state, studyoAcikRef.current);
      if (gecis !== 'yok') paylasimiYakala(window.location.hash);
      if (gecis === 'yenile') {
        window.location.reload();
        return;
      }
      isPopStateRef.current = true;
      const state = event.state as HistoryNavState | null;

      if (state && state.screen) {
        applyNavState(state);
      } else {
        // Durum yoksa (ör. kullanıcı adres çubuğundan hash'i elle değiştirdi) adresi çözümle
        applyNavState(parseHashToNavState(window.location.hash).state);
      }

      setTimeout(() => {
        isPopStateRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const markActivityCompleted = (activityId: string) => {
    setCompletedActivityIds((prev) => {
      if (prev.includes(activityId)) return prev;
      const next = [...prev, activityId];
      try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  };

  const selectLevel = (levelId: LevelId) => {
    stopSpeech();
    const defaultGrade = (levelId === 'ilkokul' ? 1 : levelId === 'lise' ? 9 : 5) as GradeId;
    setSelectedLevelId(levelId);
    setSelectedGradeNumber(defaultGrade);
    setSelectedTopicId(null);
    setSelectedActivity(null);
    setActiveModalTopicState(null);
    setIsFreeSandbox(false);
    setCurrentScreen('grades');

    pushBrowserHistory({
      screen: 'grades',
      levelId,
      gradeNumber: defaultGrade,
      topicId: null,
      activityId: null,
      isFreeSandbox: false,
      modalTopicId: null,
    });
  };

  const selectGrade = (gradeNumber: GradeId) => {
    stopSpeech();
    // Kademeyi müfredat verisinden eşle: Hazırlık Sınıfı (0) lise kademesindedir.
    const mappedLevelId = levelIdForGrade(gradeNumber) || 'ortaokul';
    setSelectedLevelId(mappedLevelId);

    setSelectedGradeNumber(gradeNumber);
    setSelectedTopicId(null);
    setSelectedActivity(null);
    setActiveModalTopicState(null);
    setIsFreeSandbox(false);
    setCurrentScreen('portal');

    pushBrowserHistory({
      screen: 'portal',
      levelId: mappedLevelId,
      gradeNumber,
      topicId: null,
      activityId: null,
      isFreeSandbox: false,
      modalTopicId: null,
    });
  };

  const selectTopic = (topicId: string) => {
    stopSpeech();
    setSelectedTopicId(topicId);
    const foundTopic =
      selectedGrade?.themes.flatMap((th) => th.topics).find((t) => t.id === topicId) ||
      selectedGrade?.topics.find((t) => t.id === topicId);

    if (foundTopic && foundTopic.activities.length > 0) {
      selectActivity(foundTopic.activities[0], true);
    } else {
      setCurrentScreen('portal');
      pushBrowserHistory({
        screen: 'portal',
        levelId: selectedLevelId,
        gradeNumber: selectedGradeNumber,
        topicId,
        activityId: null,
        isFreeSandbox: false,
        modalTopicId: activeModalTopic?.id || null,
      });
    }
  };

  /**
   * Keşif Modalı'nı açar/kapatır. Modal durumu tarayıcı geçmişine de yazılır: açılış yeni bir
   * kayıt ekler (tarayıcının Geri tuşu modalı kapatır), kapanış ise mevcut kaydı günceller.
   * Böylece ileri/geri ile gezinirken modal kendiliğinden açılmaz.
   */
  const setActiveModalTopic = (topic: Topic | null) => {
    setActiveModalTopicState(topic);

    const portalNavState: HistoryNavState = {
      screen: 'portal',
      levelId: selectedLevelId,
      gradeNumber: selectedGradeNumber,
      topicId: selectedTopicId,
      activityId: null,
      isFreeSandbox: false,
      modalTopicId: topic ? topic.id : null,
    };

    if (topic) {
      pushBrowserHistory(portalNavState);
      return;
    }

    if (typeof window === 'undefined') return;
    const historyState = (window.history.state || null) as HistoryNavState | null;
    // Yalnızca modalın açık olduğunu söyleyen kaydı güncelle (yeni kayıt ekleme).
    if (historyState?.modalTopicId) pushBrowserHistory(portalNavState, 'replace');
  };

  const selectActivity = (activity: Activity, openAsMission: boolean = true) => {
    stopSpeech();
    setSelectedActivity(activity);
    setIsFreeSandbox(false);

    // Eğer modal konusu hafızada yoksa ait olduğu konuyu otomatik bağla
    if (!activeModalTopic) {
      const parentTopic = findTopicByActivityId(activity.id);
      if (parentTopic) setActiveModalTopicState(parentTopic);
    }

    const hasMissionContent = (activity.steps && activity.steps.length > 0) || !!activity.mission;
    const targetScreen: AppScreen = openAsMission && hasMissionContent ? 'mission' : 'workspace';
    setCurrentScreen(targetScreen);

    pushBrowserHistory({
      screen: targetScreen,
      levelId: selectedLevelId,
      gradeNumber: selectedGradeNumber,
      topicId: selectedTopicId,
      activityId: activity.id,
      isFreeSandbox: false,
      modalTopicId: null,
    });
  };

  const startFreeSandbox = () => {
    stopSpeech();
    setIsFreeSandbox(true);
    setSelectedActivity(null);
    setCurrentScreen('workspace');

    pushBrowserHistory({
      screen: 'workspace',
      levelId: selectedLevelId,
      gradeNumber: selectedGradeNumber,
      topicId: null,
      activityId: null,
      isFreeSandbox: true,
      modalTopicId: null,
    });
  };

  const openMissionMode = (activity: Activity) => {
    selectActivity(activity, true);
  };

  const openStudioMode = () => {
    stopSpeech();
    setCurrentScreen('workspace');
    pushBrowserHistory({
      screen: 'workspace',
      levelId: selectedLevelId,
      gradeNumber: selectedGradeNumber,
      topicId: selectedTopicId,
      activityId: selectedActivity?.id || null,
      isFreeSandbox,
      modalTopicId: null,
    });
  };

  /**
   * Uygulama içi "Geri". Ekran hedefleri korunur; fark şu: artık geçmişe YENİ kayıt eklemez,
   * mevcut kaydı replaceState ile günceller. Böylece uygulama içi Geri tarayıcı geçmişini
   * uzatmaz ve tarayıcının Geri tuşu kullanıcıyı az önce çıktığı ekrana (ileriye) götürmez.
   * Derin bağlantıyla girildiğinde de siteden çıkılmaz.
   */
  const goBack = () => {
    stopSpeech();

    if (currentScreen === 'workspace') {
      if (selectedActivity) {
        if (!activeModalTopic) {
          const parentTopic = findTopicByActivityId(selectedActivity.id);
          if (parentTopic) setActiveModalTopicState(parentTopic);
        }
        setIsFreeSandbox(false);
        setCurrentScreen('mission');
        pushBrowserHistory(
          {
            screen: 'mission',
            levelId: selectedLevelId,
            gradeNumber: selectedGradeNumber,
            topicId: selectedTopicId,
            activityId: selectedActivity.id,
            isFreeSandbox: false,
            modalTopicId: null,
          },
          'replace'
        );
      } else {
        setCurrentScreen('portal');
        pushBrowserHistory(
          {
            screen: 'portal',
            levelId: selectedLevelId,
            gradeNumber: selectedGradeNumber,
            topicId: selectedTopicId,
            activityId: null,
            isFreeSandbox: false,
            modalTopicId: null,
          },
          'replace'
        );
      }
    } else if (currentScreen === 'mission') {
      // Görevden çıkıldığında doğrudan ait olduğu konunun Görevler Modalı'na dön
      let modalTopicId = activeModalTopic?.id || null;
      if (!activeModalTopic && selectedActivity) {
        const parentTopic = findTopicByActivityId(selectedActivity.id);
        if (parentTopic) {
          setActiveModalTopicState(parentTopic);
          modalTopicId = parentTopic.id;
        }
      }
      setCurrentScreen('portal');
      pushBrowserHistory(
        {
          screen: 'portal',
          levelId: selectedLevelId,
          gradeNumber: selectedGradeNumber,
          topicId: selectedTopicId,
          activityId: null,
          isFreeSandbox: false,
          modalTopicId,
        },
        'replace'
      );
    } else if (currentScreen === 'portal') {
      if (activeModalTopic) {
        setActiveModalTopicState(null);
        pushBrowserHistory(
          {
            screen: 'portal',
            levelId: selectedLevelId,
            gradeNumber: selectedGradeNumber,
            topicId: selectedTopicId,
            activityId: null,
            isFreeSandbox: false,
            modalTopicId: null,
          },
          'replace'
        );
      } else {
        setCurrentScreen('grades');
        pushBrowserHistory(
          {
            screen: 'grades',
            levelId: selectedLevelId,
            gradeNumber: selectedGradeNumber,
            topicId: null,
            activityId: null,
            isFreeSandbox: false,
            modalTopicId: null,
          },
          'replace'
        );
      }
    } else {
      setCurrentScreen('home');
      setSelectedTopicId(null);
      setSelectedActivity(null);
      setActiveModalTopicState(null);
      setIsFreeSandbox(false);
      pushBrowserHistory(HOME_NAV_STATE, 'replace');
    }
  };

  const goHome = () => {
    stopSpeech();
    setCurrentScreen('home');
    setSelectedTopicId(null);
    setSelectedActivity(null);
    setActiveModalTopicState(null);
    setIsFreeSandbox(false);

    pushBrowserHistory(HOME_NAV_STATE);
  };

  const setScreen = (screen: AppScreen) => {
    setCurrentScreen(screen);
    pushBrowserHistory({
      screen,
      levelId: selectedLevelId,
      gradeNumber: selectedGradeNumber,
      topicId: selectedTopicId,
      activityId: selectedActivity?.id || null,
      isFreeSandbox,
      modalTopicId: activeModalTopic?.id || null,
    });
  };

  return (
    <CurriculumContext.Provider
      value={{
        currentScreen,
        selectedLevel,
        selectedGrade,
        selectedTopic,
        selectedActivity,
        activeModalTopic,
        setActiveModalTopic,
        selectedCategory,
        isFreeSandbox,
        searchQuery,
        completedActivityIds,
        markActivityCompleted,
        selectLevel,
        selectGrade,
        selectTopic,
        selectActivity,
        setSelectedCategory,
        setSearchQuery,
        startFreeSandbox,
        openMissionMode,
        openStudioMode,
        goBack,
        goHome,
        setScreen,
      }}
    >
      {children}
    </CurriculumContext.Provider>
  );
}

export function useCurriculum() {
  const context = useContext(CurriculumContext);
  if (!context) {
    throw new Error('useCurriculum must be used within a CurriculumProvider');
  }
  return context;
}
