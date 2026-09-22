import { describe, expect, it } from 'vitest';
import { sekmeKimlikleri, sekmeOkTusu } from '../sekmeler';

describe('sekmeOkTusu', () => {
  it('sağ/aşağı sonraki sekmeye, sonda başa döner', () => {
    expect(sekmeOkTusu('ArrowRight', 0, 5)).toBe(1);
    expect(sekmeOkTusu('ArrowDown', 4, 5)).toBe(0);
  });
  it('sol/yukarı önceki sekmeye, başta sona döner', () => {
    expect(sekmeOkTusu('ArrowLeft', 2, 5)).toBe(1);
    expect(sekmeOkTusu('ArrowUp', 0, 5)).toBe(4);
  });
  it('Home ilk, End son; diğer tuşlar null; boş liste null', () => {
    expect(sekmeOkTusu('Home', 3, 5)).toBe(0);
    expect(sekmeOkTusu('End', 3, 5)).toBe(4);
    expect(sekmeOkTusu('Tab', 3, 5)).toBeNull();
    expect(sekmeOkTusu('ArrowRight', 0, 0)).toBeNull();
  });
  it('kimlikler önek ve sekme kimliğiyle kurulur', () => {
    expect(sekmeKimlikleri('veri', 'nokta')).toEqual({ sekme: 'veri-sekme-nokta', panel: 'veri-panel-nokta' });
  });
});
