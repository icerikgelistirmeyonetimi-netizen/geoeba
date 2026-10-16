'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { LevelId } from '@/types/curriculum';
import { oturumKademesiniAyarla } from '@/hooks/useKademeDuzeyi';

export const OTURUM_ADLARI: Record<LevelId, string> = { ilkokul: 'İlkokul', ortaokul: 'Ortaokul', lise: 'Lise' };
interface Oturum { kademe: LevelId | null; oturumAc: (kademe: LevelId) => void; oturumuKapat: () => void }
const OturumContext = createContext<Oturum>({ kademe: null, oturumAc: () => {}, oturumuKapat: () => {} });
export const useOturum = () => useContext(OturumContext);

/** Oturum seçimi sınıfın ekranında yapılır; sağlayıcı adaları ve sınıf geçişini kapatmaz. */
export function OturumProvider({ children }: { children: React.ReactNode }) {
  const [kademe, setKademe] = useState<LevelId | null>(null);
  const oturumAc = useCallback((secim: LevelId) => {
    oturumKademesiniAyarla(secim);
    setKademe(secim);
  }, []);
  const oturumuKapat = useCallback(() => {
    oturumKademesiniAyarla(null);
    setKademe(null);
  }, []);
  return <OturumContext.Provider value={{ kademe, oturumAc, oturumuKapat }}>
    {children}
  </OturumContext.Provider>;
}
