'use client';

import React from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import type { LevelId } from '@/types/curriculum';
import { WorkspaceView } from '@/components/workspace/WorkspaceView';
import { AdaEkrani } from '@/components/adalar/AdaEkrani';
import { SinifEkrani } from '@/components/sinif/SinifEkrani';

export default function HomePage() {
  const {
    currentScreen, selectedLevel, selectedGrade, selectedTopic, activeModalTopic,
    selectLevel, startFreeSandbox, goHome, isFreeSandbox,
  } = useCurriculum();
  const sinifPaneli = currentScreen === 'portal' || currentScreen === 'topics';

  // Eski sınıf/konu bağlantıları da güncel ada panelinde açılır.
  const adaEkrani = (sayfa: 'ana-sayfa' | LevelId) => (
    <AdaEkrani
      key={sayfa}
      sayfa={sayfa}
      initialGrade={sinifPaneli ? selectedGrade?.gradeNumber ?? null : null}
      initialTopic={sinifPaneli ? activeModalTopic ?? selectedTopic : null}
      onKademeSec={selectLevel}
      onAtolye={startFreeSandbox}
      onAnaSayfa={goHome}
    />
  );

  switch (currentScreen) {
    case 'home':
      return adaEkrani('ana-sayfa');
    case 'portal':
    case 'grades':
    case 'topics':
      return adaEkrani(selectedLevel?.id ?? 'ana-sayfa');
    case 'mission':
      return <WorkspaceView />;
    case 'workspace':
      // Serbest stüdyo sınıftaki akıllı tahtada, etkinlikler kendi çalışma alanında açılır.
      return isFreeSandbox ? <SinifEkrani onAnaSayfa={goHome} /> : <WorkspaceView />;
    default:
      return adaEkrani('ana-sayfa');
  }
}
