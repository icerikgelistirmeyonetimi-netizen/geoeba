'use client';

import React, { useEffect } from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import type { LevelId } from '@/types/curriculum';
import { WorkspaceView } from '@/components/workspace/WorkspaceView';
import { AdaEkrani } from '@/components/adalar/AdaEkrani';
import { SinifEkrani } from '@/components/sinif/SinifEkrani';
import { useOturum } from '@/state/OturumContext';

export default function HomePage() {
  const { kademe, oturumuKapat } = useOturum();
  const {
    currentScreen, selectedLevel, selectedGrade, selectedTopic, activeModalTopic,
    selectLevel, startFreeSandbox, goHome, isFreeSandbox,
  } = useCurriculum();
  const sinifPaneli = currentScreen === 'portal' || currentScreen === 'topics';
  // Tarayıcı geri düğmesiyle sınıftan çıkıldığında da atölye oturumu kapanır.
  useEffect(() => {
    if (kademe && (currentScreen !== 'workspace' || !isFreeSandbox)) oturumuKapat();
  }, [currentScreen, isFreeSandbox, kademe, oturumuKapat]);
  const siniftanCik = () => {
    oturumuKapat();
    goHome();
  };

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
      return isFreeSandbox ? <SinifEkrani onAnaSayfa={siniftanCik} /> : <WorkspaceView />;
    default:
      return adaEkrani('ana-sayfa');
  }
}
