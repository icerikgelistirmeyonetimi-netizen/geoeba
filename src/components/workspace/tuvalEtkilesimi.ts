import type { Point2D } from '@/types/math';
import type { Point3D } from '@/types/workspace3d';

/* Tuvalde süren fare etkileşimlerinin durumları (Canvas). */

/** Seç ve Taşı ile süren nesne sürüklemesi */
export interface NesneSuruklemesi {
  objectIds: string[];
  startWorld: Point2D;
  lastWorld: Point2D;
  hasMoved: boolean;
  /** Izgaraya oturtma için tutulan nokta (çapa): sürüklenen grubun noktası ve imleçle arasındaki fark */
  anchorId: string | null;
  anchorOffset: Point2D;
  /** Çapanın kilit olmasaydı bulunacağı yer (son hedef): seçimin geri kalanı farenin gerçek adımını buradan alır */
  virtualAnchor?: Point2D | null;
}

/** 3B cismin 2B izdüşümünün sürüklenmesi */
export interface CisimSuruklemesi {
  solidId: string;
  startWorld: Point2D;
  initialPos: Point3D;
  hasMoved: boolean;
}

/** Kutuyla seçim: dünya köşeleri ve (Shift/Ctrl ile başladıysa) korunacak önceki seçim */
export interface KutuSecimi {
  startWorld: Point2D;
  currentWorld: Point2D;
  baseIds: string[];
}

/** Yansıt aracında seçilen eksen (doğru parçası, doğru ya da ışın): iki noktası ve adı */
export interface YansitmaEkseni {
  id: string;
  p1: Point2D;
  p2: Point2D;
  name: string;
}
