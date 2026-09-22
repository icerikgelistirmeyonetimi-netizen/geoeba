import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import { executeTurkishCommand } from '@/math/turkishCommands';

// Ölçme araçları (cetvel, açıölçer, gönye, alan modeli) çizim nesnesi değildir:
// "cetveli sil" aracı kapatır, SEÇİLİ ÇİZİMİ SİLMEZ.
const A = {
  id: 'pA',
  type: 'point',
  label: 'A',
  showLabel: true,
  x: 1,
  y: 1,
  color: '#2563eb',
  visible: true,
  isIndependent: true,
  createdAt: 1,
} as MathObject;

describe('ölçme aracını yazılı/sesli komutla kaldırma', () => {
  it.each(['cetveli sil', 'cetveli kaldır', 'cetveli gizle', 'iletkiyi kaldır', 'açıölçeri sil', 'gönyeyi sil', 'alan modelini sil', 'alanı modelle aracını kapat'])(
    '"%s": yalnız Seç ve Taşı aracına geçilir, seçili A silinmez',
    (metin) => {
      for (const secim of [[], ['pA']]) {
        const r = executeTurkishCommand(metin, [A], secim);
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.sceneChanged).toBe(false);
        expect(r.objects).toHaveLength(1);
        expect(r.actions).toEqual([{ kind: 'selectTool', tool: 'select' }]);
      }
    }
  );

  it('kaldırma mesajı aracın adını söyler', () => {
    const r = executeTurkishCommand('cetveli sil', [A], ['pA']);
    expect(r.ok && r.message).toContain('Cetvel tuvalden kaldırıldı');
  });

  it('açma ve ortalama komutları değişmedi', () => {
    for (const [metin, arac] of [
      ['cetveli aç', 'ruler'],
      ['cetveli ortala', 'ruler'],
      ['gönyeyi getir', 'setsquare'],
      ['iletkiyi getir', 'measure_angle'],
      ['alanı modelle aracını aç', 'area_model'],
    ] as const) {
      const r = executeTurkishCommand(metin, [A], []);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.actions).toEqual([{ kind: 'selectTool', tool: arac }]);
    }
  });

  it('başka nesne adı geçen silme komutu silme ailesinde kalır', () => {
    const r = executeTurkishCommand('A noktasını sil', [A], []);
    expect(r.ok && r.sceneChanged).toBe(true);
  });
});
