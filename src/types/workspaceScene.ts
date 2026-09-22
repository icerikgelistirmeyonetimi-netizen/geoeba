import type { Camera3D, Solid3DObject } from './workspace3d';
import type { Dispatch, SetStateAction } from 'react';

/** Menü ve belge işlemlerinin görünümdeki 3B sahneye erişimi. */
export interface WorkspaceScene {
  solids: Solid3DObject[];
  camera: Camera3D;
  selectedIds: string[];
  canUndo: boolean;
  canRedo: boolean;
  /** Geri alınacak 3B adımın yapıldığı zaman (ms); 2B/3B ortak geri alma sırası için. */
  undoTime?: number;
  /** Yinelenecek 3B adımın ilk yapıldığı zaman (ms). */
  redoTime?: number;
  setSolids: (solids: Solid3DObject[]) => void;
  setCamera: Dispatch<SetStateAction<Camera3D>>;
  select: (ids: string[]) => void;
  restore: (solids: Solid3DObject[], camera?: Camera3D) => void;
  undo: () => void;
  redo: () => void;
}
