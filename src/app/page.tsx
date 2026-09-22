'use client';

import React, { useState } from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import type { LevelId } from '@/types/curriculum';
import { WelcomeScreen } from '@/components/navigation/WelcomeScreen';
import { TeachingPortal } from '@/components/navigation/TeachingPortal';
import { GradeSelector } from '@/components/navigation/GradeSelector';
import { TopicSelector } from '@/components/navigation/TopicSelector';
import { WorkspaceView } from '@/components/workspace/WorkspaceView';
import { AdaEkrani } from '@/components/adalar/AdaEkrani';
import { SinifEkrani } from '@/components/sinif/SinifEkrani';

export default function HomePage() {
  const { currentScreen, selectedLevel, selectLevel, startFreeSandbox, goHome, isFreeSandbox } = useCurriculum();
  // 3B ada ekranı açılamazsa (WebGL2 yok, sahne yüklenemedi) 2B giriş ekranları kullanılır
  const [adaYedek, setAdaYedek] = useState(false);

  // Konular ada panelinin içinde açılır; ada ekranından sınıf/konu sayfalarına geçilmez
  const adaEkrani = (sayfa: 'ana-sayfa' | LevelId) => (
    <AdaEkrani
      key={sayfa}
      sayfa={sayfa}
      onKademeSec={selectLevel}
      onFener={startFreeSandbox}
      onAnaSayfa={goHome}
      onHata={() => setAdaYedek(true)}
    />
  );

  switch (currentScreen) {
    case 'home':
      return adaYedek ? <WelcomeScreen /> : adaEkrani('ana-sayfa');
    case 'portal':
      return <TeachingPortal />;
    case 'grades':
      // Kademe seçilmemişse (ör. #/portal adresinden geri) ada ana sayfası gösterilir
      if (!selectedLevel) return adaYedek ? <WelcomeScreen /> : adaEkrani('ana-sayfa');
      return adaYedek ? <GradeSelector /> : adaEkrani(selectedLevel.id);
    case 'topics':
      return <TopicSelector />;
    case 'mission':
      return <WorkspaceView />;
    case 'workspace':
      // Serbest stüdyo (#/studyo) 3B sınıftaki akıllı tahtada açılır; görev çalışması (#/calisma/:id) eski gibi
      return isFreeSandbox ? <SinifEkrani onAnaSayfa={goHome} /> : <WorkspaceView />;
    default:
      return adaYedek ? <WelcomeScreen /> : adaEkrani('ana-sayfa');
  }
}
