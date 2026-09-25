import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Serbest Çizim Stüdyosu sade kalır: arayüzde emoji yok (kullanıcı isteği; araç yönergeleri için
 * aynı kural aracYonergeleri.test.ts'de). Simge gerekiyorsa lucide-react ya da elle çizilmiş SVG.
 */

const KOK = path.resolve(__dirname, '..');
const EMOJI = /\p{Extended_Pictographic}/u;

/** Emojiden arındırılmış bileşenler; temizlenen her stüdyo dosyası buraya eklenir. */
const EMOJISIZ_DOSYALAR = [
  'WorkspaceMenuBar.tsx',
  'WorkspaceView.tsx',
  'Properties3D.tsx',
  'PropertiesPanel.tsx',
  'RegularPolygonDialog.tsx',
  'RotateGizmo.tsx',
  'Canvas.tsx',
];

/**
 * Yorumlarında ok ve simge (↔, 🔄) kalan dosyalar: bunlarda yalnız yorumla BAŞLAYAN satırlar atlanır
 * (ekranda görünmezler); kod ve JSX satırları yine denetlenir.
 */
const YORUM_SATIRLARI_ATLANAN = new Set(['Canvas.tsx']);
const YORUM_SATIRI = /^\s*(\/\/|\/\*|\*|\{\s*\/\*)/;

describe('stüdyo arayüzünde emoji yok', () => {
  it.each(EMOJISIZ_DOSYALAR)('%s', (dosya) => {
    const satirlar = readFileSync(path.join(KOK, dosya), 'utf8').split(/\r?\n/);
    const yorumAtlanir = YORUM_SATIRLARI_ATLANAN.has(dosya);
    const bulunanlar = satirlar.flatMap((satir, i) =>
      EMOJI.test(satir) && !(yorumAtlanir && YORUM_SATIRI.test(satir)) ? [`${i + 1}: ${satir.trim()}`] : []
    );
    expect(bulunanlar).toEqual([]);
  });

  it('denetim kaldırılan emojileri (Hakkında 🚀, 2B/3B seçici 📐 🧊, paneller, çokgen şablonları, döndürme) yakalar', () => {
    for (const emoji of ['🚀', '📐', '🧊', '📖', '🔒', '📍', '🧲', '🛑', '🔟', '💠', '🔄', '⏹']) expect(emoji).toMatch(EMOJI);
    expect('Sürüm: 1.0.0 (Etkileşimli 2D + 3D) · ölçü → açı × 2 °').not.toMatch(EMOJI);
  });

  it('yalnız yorumla başlayan satırlar atlanır, arayüz satırları atlanmaz', () => {
    for (const yorum of ['  // ölç ↔ gizle', '{/* 🔄 DÖNDÜRME PALETİ */}', '  /** 🔄 kol */', '   * ↔ ayrıntı']) {
      expect(yorum).toMatch(YORUM_SATIRI);
    }
    for (const arayuz of ['<span>⏹</span>', "{ v: 0, label: '🔒 %0 Kapalı' },", '🔄 {derece}°']) {
      expect(arayuz).not.toMatch(YORUM_SATIRI);
    }
  });
});
