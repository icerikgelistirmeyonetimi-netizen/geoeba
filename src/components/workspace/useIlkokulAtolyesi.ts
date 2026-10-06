'use client';

/**
 * Atölye (çalışma alanı) ilkokula açıldığında görünümü ilkokul kurallarına getirir (ilkokulKipi.ts):
 *  - 1-4. sınıf etkinliği için açıldıysa ve Kademe menüsünde "Tüm araçlar" seçiliyse kademe İlkokul olur
 *    (başka bir kademe elle seçilmişse ona dokunulmaz);
 *  - İlkokul kipine girilince açılış zemini: koordinat düzlemi yerine kareli zemin (eksen, eksen sayıları, imleç
 *    koordinatı ve bölge adları kapalı; ızgara 1 birim, noktalar ızgaraya oturur);
 *  - İlkokulda eksen sonradan açılırsa (yazılı komut, açılan dosya, "Varsayılana sıfırla") yeniden kapatılır;
 *  - İlkokuldan çıkınca zemin, ilkokuldan önceki hâline (bu oturumda bilinmiyorsa varsayılana) döner: ortaokul,
 *    lise ve "Tüm araçlar"ın görünümü değişmez.
 * WorkspaceView çağırır; dönen değer ilkokul kipinin açık olup olmadığıdır.
 */
import { useEffect, useRef } from 'react';
import { VARSAYILAN_GORUNUM_AYARLARI, useWorkspace } from '@/state/WorkspaceContext';
import { useCurriculum } from '@/state/CurriculumContext';
import { kademeDuzeyiniAyarla, kademeDuzeyiniOku, useIlkokulKipi } from '@/hooks/useKademeDuzeyi';
import { sinifinKademesi } from './kademeDuzeyleri';
import { ilkokulEksensiz, ilkokulZemini, zeminAlanlari, zeminiGeriYukle, type IlkokulZeminAlanlari } from './ilkokulKipi';
import type { ViewportTransform } from '@/types/math';

/** Bu oturumda ilkokuldan önceki zemin bilinmiyorsa dönülecek zemin (Ayarlar > Varsayılana sıfırla ile aynı) */
const VARSAYILAN_ZEMIN: IlkokulZeminAlanlari = zeminAlanlari(VARSAYILAN_GORUNUM_AYARLARI as unknown as ViewportTransform);

export function useIlkokulAtolyesi(): boolean {
  const ilkokul = useIlkokulKipi();
  const { viewport, setViewport } = useWorkspace();
  const { selectedGrade, selectedActivity, isFreeSandbox } = useCurriculum();
  const gorunumRef = useRef(viewport);
  gorunumRef.current = viewport;

  // 1-4. sınıf etkinliği: atölye ilkokul kademesiyle açılır
  const sinif = selectedGrade?.gradeNumber ?? null;
  const etkinlikVar = !!selectedActivity;
  useEffect(() => {
    if (isFreeSandbox || !etkinlikVar || sinif === null) return;
    if (sinifinKademesi(sinif) === 'ilkokul' && kademeDuzeyiniOku() === 'tum') kademeDuzeyiniAyarla('ilkokul');
  }, [isFreeSandbox, etkinlikVar, sinif]);

  // Kipe girişte ilkokul zemini, çıkışta önceki zemin
  const oncekiZemin = useRef<IlkokulZeminAlanlari | null>(null);
  const ilkCalisma = useRef(true);
  useEffect(() => {
    const ilk = ilkCalisma.current;
    ilkCalisma.current = false;
    if (ilkokul) {
      // Açılışta zaten ilkokuldaysa (kayıtlı görünüm de ilkokul zemini olabilir) çıkışta varsayılana dönülür
      oncekiZemin.current = ilk ? VARSAYILAN_ZEMIN : zeminAlanlari(gorunumRef.current);
      setViewport((v) => ilkokulZemini(v));
    } else if (oncekiZemin.current) {
      const onceki = oncekiZemin.current;
      oncekiZemin.current = null;
      setViewport((v) => zeminiGeriYukle(v, onceki));
    }
  }, [ilkokul, setViewport]);

  // İlkokulda koordinat ekseni sunulmaz: sonradan açılırsa kapanır
  const eksenAcik = viewport.showAxes || !!viewport.showQuadrants || viewport.showCoordinates;
  useEffect(() => {
    if (ilkokul && eksenAcik) setViewport((v) => ilkokulEksensiz(v));
  }, [ilkokul, eksenAcik, setViewport]);

  return ilkokul;
}
