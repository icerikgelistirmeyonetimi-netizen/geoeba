import { describe, expect, it } from 'vitest';
import { aracYonergesi, YONERGELI_ARACLAR } from '../aracYonergeleri';

describe('araç yönergeleri (tuvalin altındaki çubuk)', () => {
  it.each(YONERGELI_ARACLAR)('%s aracının başlığı ve açıklaması var, emoji yok', (arac) => {
    const y = aracYonergesi(arac, 0);
    expect(y).not.toBeNull();
    expect(y!.baslik.length).toBeGreaterThan(1);
    expect(y!.aciklama.length).toBeGreaterThan(5);
    expect(`${y!.baslik} ${y!.aciklama}`).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('seçilen nokta sayısını gösterir', () => {
    expect(aracYonergesi('angle', 2)!.aciklama).toContain('(2/3 seçildi)');
    expect(aracYonergesi('angle', 0)!.aciklama).not.toContain('seçildi');
    expect(aracYonergesi('measure_distance', 1)!.aciklama).toContain('(1/2 seçildi)');
    expect(aracYonergesi('measure_arc', 1)!.aciklama).toContain('(1/2 seçildi)');
    expect(aracYonergesi('measure_arc', 0)!.baslik).toBe('Yay Ölç');
  });

  it('yönergesi olmayan araç için null döner', () => {
    expect(aracYonergesi('select', 0)).toBeNull();
  });
});
