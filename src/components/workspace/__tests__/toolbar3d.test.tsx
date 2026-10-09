// @vitest-environment node
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Tool3DMode, Solid3DObject } from '@/types/workspace3d';
import type { KademeDuzeyi } from '../kademeDuzeyleri';
import { ARAC_KATEGORI_RENKLERI } from '../toolDefinitions';
import { TREE_TOOL_GROUPS_3D, TUM_3B_ARACLAR, araclari3BAra, CISIM_ADLARI } from '../treeToolDefinitions3D';
import { ILKOKUL_3B_ARACLARI, arac3BGorunurMu, gruplari3BSuz, grupAcikliklari3B } from '../kademeDuzeyleri3B';
import { CISIM_RENKLERI, KOPYA_RENGI } from '../cisimRenkleri';

/*
 * 3B araç paneli: tek kaynak (treeToolDefinitions3D), kademe süzgeci (kademeDuzeyleri3B), 2B tasarım
 * sistemi (44 px satır, aria-pressed, kategori renkleri) ve emojisiz arayüz koruma testleri.
 */

const kademe = vi.hoisted(() => ({ duzey: 'tum' as KademeDuzeyi, ayarla: vi.fn() }));
vi.mock('@/hooks/useKademeDuzeyi', () => ({
  useKademeDuzeyi: () => [kademe.duzey, kademe.ayarla],
  useIlkokulKipi: () => kademe.duzey === 'ilkokul',
}));

import { Toolbar3D, GIZLEME_GUNCELLEMESI, turkceSayiyiCoz } from '../Toolbar3D';

/** Tool3DMode birliğinin tamamı: derleyici eksik bir kimliği burada yakalar. */
const TOOL3D_KIMLIKLERI: Record<Tool3DMode, true> = {
  select_move: true,
  orbit: true,
  pan: true,
  inspect: true,
  delete: true,
  rotate_3d: true,
  scale_3d: true,
  reflect_3d: true,
  translate_3d: true,
  measure_edge: true,
  create_cube: true,
  create_sphere: true,
  create_cylinder: true,
  create_prism: true,
  create_triangular_prism: true,
  create_cone: true,
  create_pyramid: true,
};
const HER_TOOL3D = Object.keys(TOOL3D_KIMLIKLERI) as Tool3DMode[];

/** Tema geçişi sonrası yasak sabit Tailwind renk aileleri (aracKategoriRenkleri.test.ts ile aynı) */
const SABIT_RENK = /\b(bg|text|border|ring|from|to|via)-(blue|slate|indigo|purple|violet|emerald|green|amber|yellow|rose|red|pink|sky|teal|cyan|gray|zinc|white|black|orange|fuchsia)(-\d{2,3})?(\/\d+)?\b|\b(bg|text|border)-\[#[0-9a-fA-F]{3,8}\]/;
const EMOJI = /\p{Extended_Pictographic}/u;
const KOK = path.resolve(__dirname, '..');

const kup: Solid3DObject = {
  id: 'kup-1',
  type: 'cube',
  name: 'Küp 1',
  position: { x: 0, y: 0, z: 0 },
  dimensions: { width: 3, height: 3, depth: 3, radius: 1.5 },
  rotation: { x: 0, y: 0, z: 0 },
  color: '#3b82f6',
  opacity: 1,
  showWireframe: false,
  showVertices: true,
  showFaces: true,
  unfoldProgress: 0,
  selectedFaceIndex: null,
};

function ciz(ek: Partial<React.ComponentProps<typeof Toolbar3D>> = {}) {
  return renderToStaticMarkup(
    <Toolbar3D
      activeTool="select_move"
      setActiveTool={vi.fn()}
      onAddSolid={vi.fn()}
      onAutoArrange={vi.fn()}
      onSetCameraPreset={vi.fn()}
      toggleShowVertices={vi.fn()}
      toggleShowEdges={vi.fn()}
      toggleShowFaces={vi.fn()}
      showVertices
      showEdges
      showFaces={false}
      onDeleteSelected={vi.fn()}
      {...ek}
    />
  );
}

beforeEach(() => {
  kademe.duzey = 'tum';
  kademe.ayarla.mockClear();
});

describe('3B araç ağacı (tek kaynak)', () => {
  it('Tool3DMode birliğindeki her kimlik ağaçta var; kimlikler tekil', () => {
    const kimlikler = TUM_3B_ARACLAR.map((a) => a.id);
    for (const id of HER_TOOL3D) expect(kimlikler, id).toContain(id);
    expect(new Set(kimlikler).size).toBe(kimlikler.length);
  });

  it('gruplar ve sözleşmedeki adlar', () => {
    expect(TREE_TOOL_GROUPS_3D.map((g) => g.name)).toEqual(['Temel', 'Katı Cisimler', 'Dönüşüm', 'Ölçme ve İnceleme', 'Cisim Özellikleri', 'Görünüm']);
    const ad = (id: string) => TUM_3B_ARACLAR.find((a) => a.id === id)?.name;
    expect(ad('select_move')).toBe('Taşı');
    expect(ad('orbit')).toBe('Döndür ve İncele');
    expect(ad('pan')).toBe('Görünümü Kaydır');
    expect(ad('inspect')).toBe('Yüzü Seç ve Renklendir');
    expect(ad('measure_edge')).toBe('Uzunluk Ölçme');
    expect(ad('rotate_3d')).toBe('Cismi Döndür');
    expect(ad('scale_3d')).toBe('Büyüt ve Küçült');
    expect(ad('reflect_3d')).toBe('Yansıt');
    expect(ad('translate_3d')).toBe('Ötele');
    expect(ad('delete')).toBe('Sil');
    expect(ad('create_prism')).toBe('Dikdörtgen Prizma');
    expect(ad('create_pyramid')).toBe('Kare Piramit');
    expect(ad('kare_prizma')).toBe('Kare Prizma');
    const karePrizma = TUM_3B_ARACLAR.find((a) => a.id === 'kare_prizma')!;
    expect(karePrizma.solidType).toBe('prism');
    expect(karePrizma.preset).toEqual({ width: 3, depth: 3, height: 4 });
  });

  it('simge renkleri ARAC_KATEGORI_RENKLERI tablosundan gelir; dönüşüm araçları mercan', () => {
    const renkler = new Set<string>(Object.values(ARAC_KATEGORI_RENKLERI));
    for (const arac of TUM_3B_ARACLAR) expect(renkler.has(arac.iconColor), `${arac.id}: ${arac.iconColor}`).toBe(true);
    for (const id of ['rotate_3d', 'scale_3d', 'reflect_3d', 'translate_3d']) {
      expect(TUM_3B_ARACLAR.find((a) => a.id === id)?.iconColor).toBe(ARAC_KATEGORI_RENKLERI.donusum);
    }
    expect(TUM_3B_ARACLAR.find((a) => a.id === 'delete')?.iconColor).toBe(ARAC_KATEGORI_RENKLERI.tehlike);
  });

  it('her satırın simgesi geçerli bir öğe; cisim adları ve renk paleti tam', () => {
    for (const arac of TUM_3B_ARACLAR) expect(React.isValidElement(arac.icon), arac.id).toBe(true);
    expect(Object.keys(CISIM_ADLARI)).toHaveLength(7);
    expect(CISIM_RENKLERI.length).toBeGreaterThanOrEqual(8);
    for (const r of CISIM_RENKLERI) expect(r.hex).toMatch(/^#[0-9a-f]{6}$/);
    expect(KOPYA_RENGI).toBe('#9333ea');
  });

  it('arama "döndür" hem kamera (Döndür ve İncele) hem cisim döndürmeyi bulur', () => {
    const sonuc = araclari3BAra(TREE_TOOL_GROUPS_3D, 'döndür').map((a) => a.id);
    expect(sonuc).toContain('orbit');
    expect(sonuc).toContain('rotate_3d');
    expect(araclari3BAra(TREE_TOOL_GROUPS_3D, 'DÖNDÜR').map((a) => a.id)).toEqual(sonuc);
    expect(araclari3BAra(TREE_TOOL_GROUPS_3D, 'açınım').map((a) => a.id)).toContain('unfold');
    expect(araclari3BAra(TREE_TOOL_GROUPS_3D, '')).toHaveLength(TUM_3B_ARACLAR.length);
  });
});

describe('kademe süzgeci (kademeDuzeyleri3B)', () => {
  it('ilkokulda koni, piramit, yansıt ve ötele yok; rapordaki araçlar var', () => {
    for (const id of ['create_cone', 'create_pyramid', 'reflect_3d', 'translate_3d']) {
      expect(ILKOKUL_3B_ARACLARI, id).not.toContain(id);
      expect(arac3BGorunurMu('ilkokul', id)).toBe(false);
    }
    for (const id of ['select_move', 'orbit', 'delete', 'create_cube', 'create_sphere', 'create_cylinder', 'create_prism', 'kare_prizma', 'create_triangular_prism', 'inspect', 'measure_edge', 'rotate_3d', 'scale_3d', 'show_vertices', 'show_edges', 'show_faces', 'view_front']) {
      expect(arac3BGorunurMu('ilkokul', id), id).toBe(true);
    }
    // Listedeki her kimlik ağaçta gerçekten var
    const agac = new Set(TUM_3B_ARACLAR.map((a) => a.id));
    for (const id of ILKOKUL_3B_ARACLARI) expect(agac.has(id), id).toBe(true);
  });

  it('ortaokul, lise ve "tum": süzgeç yok', () => {
    for (const duzey of ['ortaokul', 'lise', 'tum'] as const) {
      expect(gruplari3BSuz(TREE_TOOL_GROUPS_3D, duzey).flatMap((g) => g.tools)).toHaveLength(TUM_3B_ARACLAR.length);
      expect(arac3BGorunurMu(duzey, 'create_cone')).toBe(true);
    }
  });

  it('ilkokulda bütün gruplar açık gelir; "tum"da grubun varsayılanı', () => {
    expect(Object.values(grupAcikliklari3B(TREE_TOOL_GROUPS_3D, 'ilkokul')).every(Boolean)).toBe(true);
    expect(grupAcikliklari3B(TREE_TOOL_GROUPS_3D, 'tum').gorunum_3b).toBe(false);
  });
});

describe('Toolbar3D çizimi (2B tasarım sistemi)', () => {
  it('yan şerit 68 px, sekmeler aria-selected, panel genişliği geçişli, kulakçık var', () => {
    const html = ciz();
    expect(html).toContain('w-[68px]');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('w-64 sm:w-72');
    expect(html).toContain('transition-[width]');
    expect(html).toContain('aria-label="Araç Panelini Kapat"');
    expect(html).toContain('Çalışma Alanım');
    expect(html).toContain('text-[11px] font-bold leading-none">Araçlar<');
  });

  it('araç satırları 44 px, aria-pressed ve kategori renginde kutusuz simge taşır; her Tool3DMode satırı çizilir', () => {
    const html = ciz({ activeTool: 'rotate_3d' });
    for (const id of HER_TOOL3D) {
      const ad = TUM_3B_ARACLAR.find((a) => a.id === id)!.name;
      expect(html, id).toContain(`aria-label="${ad}"`);
    }
    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('[&amp;&gt;svg]:w-4 [&amp;&gt;svg]:h-4 ' + ARAC_KATEGORI_RENKLERI.donusum);
    // Etkin satır: Cismi Döndür
    expect(html).toMatch(/aria-label="Cismi Döndür" aria-pressed="true" class="[^"]*bg-accent[^"]*ring-1 ring-primary\/25/);
    // Onay durumlu katman satırı: Köşeleri Göster açık, Yüzleri Göster kapalı
    expect(html).toMatch(/aria-label="Köşeleri Göster" aria-pressed="true"/);
    expect(html).toMatch(/aria-label="Yüzleri Göster" aria-pressed="false"/);
    // Kademe süzgeci kapalı: şerit yok; kısayol rozeti yok
    expect(html).not.toContain('data-kademe-suzgeci');
    expect(html).not.toContain('<kbd');
  });

  it('ilkokulda koni, piramit, yansıt ve ötele çizilmez; şerit kademeyi söyler; ortaokulda hepsi var', () => {
    kademe.duzey = 'ilkokul';
    const ilkokul = ciz();
    for (const ad of ['Koni', 'Kare Piramit', 'Yansıt', 'Ötele']) expect(ilkokul, ad).not.toContain(`aria-label="${ad}"`);
    for (const ad of ['Taşı', 'Döndür ve İncele', 'Kare Prizma', 'Cismi Döndür', 'Büyüt ve Küçült', 'Uzunluk Ölçme', 'Yüzü Seç ve Renklendir', 'Köşeleri Göster']) {
      expect(ilkokul, ad).toContain(`aria-label="${ad}"`);
    }
    expect(ilkokul).toContain('data-kademe-suzgeci="ilkokul"');
    expect(ilkokul).toContain('Tüm araçlar');

    kademe.duzey = 'ortaokul';
    const ortaokul = ciz();
    for (const ad of ['Koni', 'Kare Piramit', 'Yansıt', 'Ötele']) expect(ortaokul, ad).toContain(`aria-label="${ad}"`);
  });

  it('Bağlamlar: seçili cisim yokken boş durum; varken canlı V, A ve K - E + Y (MEB yazımı), palet, boyut, konum, döndürme', () => {
    const bos = ciz({ initialTab: 'baglamlar' });
    expect(bos).toContain('Seçili Cisim Yok');
    expect(bos).not.toContain('animate-pulse');

    const dolu = ciz({ initialTab: 'baglamlar', solids: [kup], selectedSolidId: kup.id, selectedSolidIds: [kup.id], onUpdateSolid: vi.fn(), onClearAll: vi.fn() });
    expect(dolu).toContain('animate-pulse');
    expect(dolu).toContain('V = 27 br³');
    expect(dolu).toContain('A = 54 br²');
    expect(dolu).toContain('K - E + Y = 2');
    expect(dolu).toContain('Küp 1');
    for (const r of CISIM_RENKLERI) expect(dolu).toContain(`aria-label="Renk: ${r.name}"`);
    expect(dolu).toContain('aria-label="Kenar (a)"');
    expect(dolu).toContain('aria-label="Konum X"');
    expect(dolu).toContain('aria-label="X ekseni"');
    expect(dolu).toContain('Cismi Döndür');
    expect(dolu).toContain('aria-label="Açınım oranı"');
    expect(dolu).toContain('role="switch"');
    // Yüz seçili değilken yüz paleti yok
    expect(dolu).not.toContain('Rengi Kaldır');

    const yuzlu = ciz({ initialTab: 'baglamlar', solids: [{ ...kup, selectedFaceIndex: 0, dimensions: { width: 2.5, height: 2.5, depth: 2.5, radius: 1.25 } }], selectedSolidId: kup.id, onUpdateSolid: vi.fn() });
    expect(yuzlu).toContain('Rengi Kaldır');
    expect(yuzlu).toContain('aria-label="Yüzü Mavi yap"');
    // Türkçe ondalık: 2,5³ = 15,625 → 15,63; yüz alanı 6,25
    expect(yuzlu).toContain('V = 15,63 br³');
    expect(yuzlu).toContain('6,25 br²');
  });

  it('Nesneler: göz simgesiyle göster/gizle, renk noktası, bağlam ve sil düğmeleri; Tümünü Sil', () => {
    const html = ciz({ initialTab: 'nesneler', solids: [kup, { ...kup, id: 'kup-2', name: 'Küp 2', opacity: 0 }], onClearAll: vi.fn(), onDeleteSolidById: vi.fn() });
    expect(html).toContain('Sahne Cisimleri');
    expect(html).toContain('aria-label="Küp 1 cismini gizle"');
    expect(html).toContain('aria-label="Küp 2 cismini göster"');
    expect(html).toContain('aria-label="Küp 1 bağlamını aç"');
    expect(html).toContain('aria-label="Küp 1 cismini sil"');
    expect(html).toContain('background-color:#3b82f6');
    expect(html).toContain('Adı düzenlemek için çift tıklayın');
    expect(html).toContain('Tümünü Sil');
    expect(html).toContain('>2<');
  });

  it('geri al / yinele düğmeleri panelde çizilmez (tuvalin sol üst köşesindekiler kullanılır)', () => {
    expect(ciz()).not.toContain('aria-label="Geri Al"');
    expect(ciz()).not.toContain('aria-label="Yinele"');
  });

  it('Bağlamlar: küre ve silindirde V, A doğru ve Euler satırı yok; döndürülmüş küpte yüz alanı değişmez', () => {
    const kure = ciz({ initialTab: 'baglamlar', solids: [{ ...kup, id: 'k', type: 'sphere', dimensions: { width: 4, height: 4, depth: 4, radius: 2 } }], selectedSolidId: 'k' });
    expect(kure).toContain('V = 33,51 br³');
    expect(kure).toContain('A = 50,27 br²');
    expect(kure).not.toContain('K - E + Y');
    expect(kure).toContain('aria-label="Yarıçap (r)"');
    expect(kure).not.toContain('aria-label="Açınım oranı"');

    const silindir = ciz({ initialTab: 'baglamlar', solids: [{ ...kup, id: 's', type: 'cylinder', dimensions: { width: 2, height: 2, depth: 2, radius: 1 } }], selectedSolidId: 's' });
    expect(silindir).toContain('V = 6,28 br³');
    expect(silindir).toContain('A = 18,85 br²');
    expect(silindir).toContain('aria-label="Yükseklik (h)"');

    // Yüz alanı Newell formülüyle, döndürme ve ötelemeden bağımsız; palet seçili yüzün rengini basılı gösterir
    const donmus = ciz({
      initialTab: 'baglamlar',
      solids: [{ ...kup, rotation: { x: 30, y: 45, z: 60 }, position: { x: 2.5, y: -1, z: 0 }, selectedFaceIndex: 2, faceColors: { 2: '#ec4899' } }],
      selectedSolidId: kup.id,
    });
    expect(donmus).toContain('A = 9 br²');
    expect(donmus).toMatch(/aria-label="Yüzü Pembe yap" aria-pressed="true"/);
    // Geçersiz yüz dizini: yüz kartı çizilmez, panel çökmez
    expect(ciz({ initialTab: 'baglamlar', solids: [{ ...kup, selectedFaceIndex: 99 }], selectedSolidId: kup.id })).not.toContain('Seçili Yüz');
  });

  it('Türkçe sayı çözümü: virgül ondalık, binlik nokta, sınır kırpma, geçersiz metin', () => {
    expect(turkceSayiyiCoz('2,5')).toBe(2.5);
    expect(turkceSayiyiCoz(' -90 ')).toBe(-90);
    expect(turkceSayiyiCoz('1.000,5')).toBe(1000.5);
    expect(turkceSayiyiCoz('3.5')).toBe(3.5);
    expect(turkceSayiyiCoz('2,555')).toBe(2.56);
    expect(turkceSayiyiCoz('12', { min: 0.5, max: 10 })).toBe(10);
    expect(turkceSayiyiCoz('0', { min: 0.5 })).toBe(0.5);
    for (const bozuk of ['', 'abc', '2,5,5', '1e3', 'NaN', '--1']) expect(turkceSayiyiCoz(bozuk), bozuk).toBeNull();
  });

  it('gizleme güncellemesi yüz, köşe ve telkafesi kapatır; sekmeler tek tablist içinde; Ctrl+K iddiası yok', () => {
    expect(GIZLEME_GUNCELLEMESI).toEqual({ opacity: 0, showFaces: false, showVertices: false, showWireframe: false });
    const html = ciz();
    expect(html.match(/role="tab"/g)?.length).toBe(5);
    expect(html.match(/role="tablist"/g)?.length).toBe(1);
    expect(html).not.toContain('Ctrl+K');
    expect(html.match(/aria-selected="true"/g)?.length).toBe(1);
  });

  it('kaynak dosyalarda sabit Tailwind renk ailesi ve emoji yok', () => {
    for (const dosya of ['Toolbar3D.tsx', 'treeToolDefinitions3D.tsx', 'kademeDuzeyleri3B.ts', 'cisimRenkleri.ts']) {
      const kaynak = readFileSync(path.join(KOK, dosya), 'utf8');
      expect(kaynak, dosya).not.toMatch(SABIT_RENK);
      const emojili = kaynak.split(/\r?\n/).filter((satir) => EMOJI.test(satir));
      expect(emojili, dosya).toEqual([]);
    }
    const html = ciz({ solids: [kup], selectedSolidId: kup.id });
    expect(html).not.toMatch(SABIT_RENK);
    expect(html).not.toMatch(EMOJI);
  });
});
