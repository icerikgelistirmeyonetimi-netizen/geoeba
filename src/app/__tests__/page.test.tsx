import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { curriculumData } from '@/curriculum/curriculumData';
import type { Grade, Topic } from '@/types/curriculum';
import { parseHashToNavState, useCurriculum } from '@/state/CurriculumContext';
import HomePage from '../page';

const mocks = vi.hoisted(() => ({ curriculum: vi.fn(), ada: vi.fn(), workspace: vi.fn(), classroom: vi.fn() }));

vi.mock('@/state/CurriculumContext', async () => ({
  ...await vi.importActual<typeof import('@/state/CurriculumContext')>('@/state/CurriculumContext'),
  useCurriculum: mocks.curriculum,
}));
vi.mock('@/components/adalar/AdaEkrani', () => ({
  AdaEkrani: (props: Record<string, unknown>) => {
    mocks.ada(props);
    return <section data-screen="ada" />;
  },
}));
vi.mock('@/components/workspace/WorkspaceView', () => ({
  WorkspaceView: () => {
    mocks.workspace();
    return <section data-screen="workspace" />;
  },
}));
vi.mock('@/components/sinif/SinifEkrani', () => ({
  SinifEkrani: (props: Record<string, unknown>) => {
    mocks.classroom(props);
    return <section data-screen="classroom" />;
  },
}));

type Curriculum = ReturnType<typeof useCurriculum>;
const topicsOf = (grade: Grade): Topic[] => [...grade.topics, ...grade.themes.flatMap(theme => theme.topics)];
const middleLevel = curriculumData.levels.ortaokul;
const fifthGrade = middleLevel.grades.find(grade => grade.gradeNumber === 5)!;
const sixthGrade = middleLevel.grades.find(grade => grade.gradeNumber === 6)!;
const firstTopic = topicsOf(fifthGrade)[0];
const secondTopic = topicsOf(fifthGrade)[1];
const sixthTopic = topicsOf(sixthGrade)[0];
const activity = firstTopic.activities[0];

function navigation(overrides: Partial<Curriculum> = {}) {
  const state = {
    currentScreen: 'home', selectedLevel: null, selectedGrade: null, selectedTopic: null,
    selectedActivity: null, activeModalTopic: null, isFreeSandbox: false,
    selectLevel: vi.fn(), startFreeSandbox: vi.fn(), goHome: vi.fn(),
    ...overrides,
  };
  mocks.curriculum.mockReturnValue(state);
  return state;
}

function renderHash(hash: string) {
  const { state } = parseHashToNavState(hash);
  const level = state.levelId ? curriculumData.levels[state.levelId] : null;
  const grade = level?.grades.find(candidate => candidate.gradeNumber === state.gradeNumber) ?? level?.grades[0] ?? null;
  navigation({
    currentScreen: state.screen, selectedLevel: level, selectedGrade: grade,
    selectedTopic: grade ? topicsOf(grade).find(topic => topic.id === state.topicId) ?? null : null,
    isFreeSandbox: state.isFreeSandbox,
  });
  return renderToStaticMarkup(<HomePage />);
}

function expectAda(page: string, grade: number | null = null, topicId: string | null = null) {
  expect(mocks.ada).toHaveBeenCalled();
  const props = mocks.ada.mock.calls.at(-1)![0];
  expect(props.sayfa).toBe(page);
  expect(props.initialGrade ?? null).toBe(grade);
  expect(props.initialTopic?.id ?? null).toBe(topicId);
  expect(props).not.toHaveProperty('onHata');
  expect(mocks.workspace).not.toHaveBeenCalled();
  expect(mocks.classroom).not.toHaveBeenCalled();
  return props;
}

beforeEach(() => {
  vi.clearAllMocks();
  navigation();
});

describe('yalnız güncel ekranlarla sayfa yönlendirmesi', () => {
  it.each(['#/home', '#/portal', '#/taninmayan', '#/sinif/99', '#/konu/olmayan'])('%s ana ada ekranına güvenli döner', hash => {
    expect(renderHash(hash)).toBe('<section data-screen="ada"></section>');
    expectAda('ana-sayfa');
  });

  it.each(['ilkokul', 'ortaokul', 'lise'])('kademe derin bağlantısı %s adasını açar; varsayılan sınıf panelini açmaz', level => {
    renderHash(`#/kademe/${level}`);
    expectAda(level);
  });

  it.each([
    { number: 1, level: 'ilkokul' }, { number: 5, level: 'ortaokul' },
    { number: 0, level: 'lise' }, { number: 12, level: 'lise' },
  ])('#/sinif/$number sınıf panelini $level adasında açar', ({ number, level }) => {
    renderHash(`#/sinif/${number}`);
    expectAda(level, number);
  });

  it('konu derin bağlantısı ilgili kademe, sınıf ve konu içeriğini Ada paneline taşır', () => {
    renderHash(`#/konu/${sixthTopic.id}`);
    expectAda('ortaokul', 6, sixthTopic.id);
  });

  it('görevden dönüşte açık görev konusu önceki selectedTopic yerine önceliklidir', () => {
    navigation({ currentScreen: 'portal', selectedLevel: middleLevel, selectedGrade: fifthGrade,
      selectedTopic: firstTopic, activeModalTopic: secondTopic });
    renderToStaticMarkup(<HomePage />);
    expectAda('ortaokul', 5, secondTopic.id);
  });

  it('aynı kademenin ardışık sayfa çizimlerinde güncel sınıf ve konu propsları iletilir', () => {
    renderHash('#/sinif/5');
    expectAda('ortaokul', 5);
    renderHash(`#/konu/${sixthTopic.id}`);
    expectAda('ortaokul', 6, sixthTopic.id);
    renderHash('#/kademe/ortaokul');
    expectAda('ortaokul');
  });

  it.each(['gorev', 'calisma'])('%s etkinlik derin bağlantısı mevcut çalışma alanını korur', route => {
    expect(renderHash(`#/${route}/${activity.id}`)).toBe('<section data-screen="workspace"></section>');
    expect(mocks.workspace).toHaveBeenCalledTimes(1);
    expect(mocks.ada).not.toHaveBeenCalled();
    expect(mocks.classroom).not.toHaveBeenCalled();
  });

  it('serbest stüdyo mevcut sınıf ekranını kullanır', () => {
    expect(renderHash('#/studyo')).toBe('<section data-screen="classroom"></section>');
    expect(mocks.classroom).toHaveBeenCalledTimes(1);
    expect(mocks.ada).not.toHaveBeenCalled();
    expect(mocks.workspace).not.toHaveBeenCalled();
    expect(mocks.classroom.mock.calls[0][0].onAnaSayfa).toBe(mocks.curriculum.mock.results.at(-1)!.value.goHome);
  });

  it('Ada navigasyon eylemlerini korur; eski sayfalara geçen hata callbacki sunmaz', () => {
    const state = navigation();
    renderToStaticMarkup(<HomePage />);
    const props = expectAda('ana-sayfa');
    expect(props.onKademeSec).toBe(state.selectLevel);
    expect(props.onAtolye).toBe(state.startFreeSandbox);
    expect(props.onAnaSayfa).toBe(state.goHome);
  });
});
