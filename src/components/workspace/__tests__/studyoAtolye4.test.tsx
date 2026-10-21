import { readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  ARAC_SECIMI_SUZULEN_KADEMELER,
  aracGorunurMu,
  aracSecilebilirMi,
  gruplariSuz,
  kapaliAracBildirimi,
} from '../kademeDuzeyleri';
import { TOOL_GROUPS, aracAdi } from '../toolDefinitions';
import { TREE_TOOL_GROUPS } from '../treeToolDefinitions';
import { TOOL_SHORTCUTS, toolForShortcut } from '../toolShortcuts';
import { GORUNUM_DUZENLERI, GorunumDuzeniPaneli, eskiDuzeniCevir } from '../gorunumDuzenleri';
import { YeniCalismaModal, calismaImzasi, yeniIcinSorulmaliMi } from '../YeniCalismaModal';
import { basligaGelince, basligaTiklayinca, type MenuGecisDurumu } from '../menuGecisi';
import { YAZARAK_OLUSTUR_ORNEKLERI, kilavuzBolumleri } from '../kullanimKilavuzu';
import { adAlaniEtiketi, nesneOzeti } from '../AddObjectModal';
import { PENCERE_BOYUT_ADLARI } from '@/components/sinif/UygulamaPenceresi';
import { executeTurkishCommand } from '@/math/turkishCommands';
import { parseProjectFile } from '@/math/projectFile';

/*
 * Atölye inceleme 4. tur (geoeba (3).xlsx), Serbest Çizim Stüdyosu — ortaokul: satır 142-147, 163-168, 170-171.
 */

const KOK = path.resolve(__dirname, '..');
const oku = (ad: string) => readFileSync(path.join(KOK, ad), 'utf8');

describe('[166] ortaokulda kısayolla ve komutla araç seçimi kademe süzgecinden geçer', () => {
  it('ilkokul ve ortaokul araç seçimi süzülür; lise ve "Tüm araçlar" değişmez', () => {
    expect(ARAC_SECIMI_SUZULEN_KADEMELER).toEqual(['ilkokul', 'ortaokul']);
    for (const arac of ['ellipse', 'pen', 'divide_ratio', 'rotate', 'symmetry', 'checkbox', 'button', 'input_box', 'image']) {
      expect(aracSecilebilirMi('ortaokul', arac), arac).toBe(false);
    }
    for (const duzey of ['tum', 'lise'] as const) {
      for (const arac of Object.keys(TOOL_SHORTCUTS)) expect(aracSecilebilirMi(duzey, arac), `${duzey} ${arac}`).toBe(true);
    }
  });

  it('ortaokulda paneldeki araçlar ve tuval şeridindeki El (kaydırma) seçilebilir', () => {
    for (const arac of Object.keys(TOOL_SHORTCUTS)) {
      const beklenen = arac === 'pan' || aracGorunurMu('ortaokul', arac);
      expect(aracSecilebilirMi('ortaokul', arac), arac).toBe(beklenen);
    }
    // E tuşu Elips'i seçer; ortaokulda kapalıdır
    const e = toolForShortcut({ code: 'KeyE', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, isComposing: false, repeat: false });
    expect(e).toBe('ellipse');
    expect(aracSecilebilirMi('ortaokul', e!)).toBe(false);
  });

  it('bildirim aracın adını ve kademeyi söyler', () => {
    expect(kapaliAracBildirimi('ortaokul', aracAdi('ellipse'))).toBe(
      'Elips aracı ortaokulda kapalı. Bütün araçlar için Kademe menüsünden «Tüm araçlar»ı seçin.'
    );
    expect(kapaliAracBildirimi('lise', 'Kalem')).toMatch(/^Kalem aracı lisede kapalı\./);
    expect(kapaliAracBildirimi('ilkokul', 'Kalem')).toMatch(/^Kalem aracı ilkokulda kapalı\./);
    expect(aracAdi('pan')).toBe('Görünümü Kaydır');
  });

  it('kısayol (WorkspaceView.activateTool) ve komut kutusu (CommandPanel) süzgeci kullanır', () => {
    const gorunum = oku('WorkspaceView.tsx');
    expect(gorunum).toMatch(/const activateTool = \(tool: ToolMode\) => \{\s*\n\s*\/\/[^\n]*\n\s*if \(!aracSecilebilirMi\(kademeDuzeyi, tool\)\)/);
    const komut = oku('CommandPanel.tsx');
    expect(komut).toMatch(/action\.kind === 'selectTool' && kademeDuzeyi !== 'tum' && !aracSecilebilirMi\(kademeDuzeyi, action\.tool\)/);
    // Öneri listesindeki "… aracını seç" örnekleri de süzülür
    expect(komut).toMatch(/aracOrnekleri\(\(arac\) => aracSecilebilirMi\(kademeDuzeyi, arac\)\)/);
  });

  it('komutla şekil kurmak süzülmez: komut motoru elips çizer', () => {
    const sonuc = executeTurkishCommand('Elips çiz', []);
    expect(sonuc.ok).toBe(true);
  });
});

describe('[167] Klavye Kısayolları seçili kademeye göre', () => {
  it('ortaokulda listelenen araçlar panelin 39 aracıyla birebir aynı', () => {
    const liste = TOOL_GROUPS.flatMap((g) => g.tools).filter((t) => aracSecilebilirMi('ortaokul', t.id)).map((t) => t.id).sort();
    const panel = gruplariSuz(TREE_TOOL_GROUPS, 'ortaokul').flatMap((g) => g.tools.map((t) => t.id)).sort();
    expect(liste).toHaveLength(39);
    expect(liste).toEqual(panel);
    for (const yok of ['ellipse', 'pen', 'divide_ratio', 'rotate', 'symmetry', 'checkbox', 'button', 'input_box', 'image']) {
      expect(liste).not.toContain(yok);
    }
  });

  it('pencere süzülmüş listeyi kullanır', () => {
    const menu = oku('WorkspaceMenuBar.tsx');
    expect(menu).toMatch(/const kisayolAraclari = TOOL_GROUPS\.flatMap\(\(g\) => g\.tools\)\.filter\(\(tool\) => aracSecilebilirMi\(kademeDuzeyi, tool\.id\)\);/);
    expect(menu).toContain('...kisayolAraclari.map((tool) => ({ key: TOOL_SHORTCUTS[tool.id], desc: tool.name })),');
    expect(menu).not.toMatch(/TOOL_GROUPS\.flatMap\(group => group\.tools\.map\(tool => \(\{ key: TOOL_SHORTCUTS/);
  });
});

describe('[145] [171] [163] tek yerleşim listesi', () => {
  it('7 yerleşim, adlar tekil; "Cebir" yalnız cebir paneli, üç bölmeli tek düzen "2D + 3D + Cebir"', () => {
    expect(GORUNUM_DUZENLERI.map((d) => d.ad)).toEqual(['2D Düzlem', '3D Uzay', '2D + 3D', 'Cebir', '2D + Cebir', '3D + Cebir', '2D + 3D + Cebir']);
    expect(new Set(GORUNUM_DUZENLERI.map((d) => d.mode)).size).toBe(7);
    expect(GORUNUM_DUZENLERI.find((d) => d.ad === 'Cebir')?.mode).toBe('algebra_only');
    expect(GORUNUM_DUZENLERI.find((d) => d.ad === '2D + 3D + Cebir')?.mode).toBe('three_col');
    expect(GORUNUM_DUZENLERI.some((d) => d.mode === 'default')).toBe(false);
    expect(eskiDuzeniCevir('default')).toBe('three_col');
    expect(eskiDuzeniCevir('algebra_2d')).toBe('algebra_2d');
  });

  it('menü, 2B ve 3B paneli aynı listeyi kullanır; eski adlar kalmadı', () => {
    const menu = oku('WorkspaceMenuBar.tsx');
    expect(menu).toContain('{kademeyeUygunGorunumler(ilkokul).map(({ mode, ad, Simge, renk }) => (');
    expect(menu).not.toMatch(/Hesap \/ 3 Sütun|Cebir Paneli \+ 2D|2D \+ 3D Çift Görünüm/);
    for (const ad of ['Toolbar.tsx', 'Toolbar3D.tsx']) {
      const kaynak = oku(ad);
      expect(kaynak, ad).toContain('<GorunumDuzeniPaneli layoutMode={layoutMode} onLayoutModeChange={onLayoutModeChange} />');
      expect(kaynak, ad).not.toMatch(/LAYOUT_OPTIONS|Üçü Bir Arada/);
    }
  });

  it('panel 7 kart çizer; eski "default" kaydında "2D + 3D + Cebir" seçili görünür', () => {
    const html = renderToStaticMarkup(<GorunumDuzeniPaneli layoutMode="default" />);
    expect(html.match(/data-gorunum-duzeni=/g)).toHaveLength(7);
    expect(html).toMatch(/aria-pressed="true"[^>]*data-gorunum-duzeni="three_col"/);
    expect(html).toContain('Çalışma alanınızı tek ekranda veya çoklu pencerelerle görüntülemek için bir düzen seçin:');
  });

  it('WorkspaceView: algebra_only yalnız cebir panelini çizer; eski üç bölmeli (default) blok yok', () => {
    const gorunum = oku('WorkspaceView.tsx');
    expect(gorunum).toMatch(/\{layoutMode === 'algebra_only' && \([\s\S]*?<div className="h-full w-full overflow-hidden" data-duzen="algebra_only">\{renderAlgebraPanel\}<\/div>/);
    expect(gorunum).not.toMatch(/layoutMode === 'default'/);
    expect(gorunum).toContain('const layoutMode = eskiDuzeniCevir(kayitliDuzen);');
  });

  it('proje dosyası "algebra_only" düzenini kabul eder', () => {
    const proje = parseProjectFile({ version: '2.0', objects: [], solids: [], layoutMode: 'algebra_only' });
    expect(proje.layoutMode).toBe('algebra_only');
  });

  it('[163] yerleşim değişince sol sekme korunur: iki panel de açılış sekmesini WorkspaceView\'den alır', () => {
    const gorunum = oku('WorkspaceView.tsx');
    expect(gorunum.match(/initialTab=\{solSekme\}\s*\n\s*onTabChange=\{setSolSekme\}/g)).toHaveLength(2);
    expect(oku('Toolbar.tsx')).toMatch(/useState<SolSekme>\(initialTab\)/);
    expect(oku('Toolbar3D.tsx')).toMatch(/onTabChangeRef\.current\?\.\(sidebarTab\)/);
  });
});

describe('[144] menü çubuğunda başlıklar arası geçiş', () => {
  type K = 'duzenle' | 'gorunum' | 'ekle';
  const bos: MenuGecisDurumu<K> = { acik: null, uzerineGelinceAcilan: null };

  it('fare: menü açıkken başka başlığa gelip tıklayınca yeni menü açık kalır (eskiden kapanıyordu)', () => {
    let d = basligaTiklayinca(bos, 'duzenle');
    expect(d.acik).toBe('duzenle');
    d = basligaGelince(d, 'gorunum');
    expect(d.acik).toBe('gorunum');
    d = basligaTiklayinca(d, 'gorunum');
    expect(d.acik).toBe('gorunum');
    // ikinci tıklama kapatır
    d = basligaTiklayinca(d, 'gorunum');
    expect(d.acik).toBeNull();
  });

  it('menü kapalıyken üzerine gelmek açmaz; açık menünün kendi başlığına tıklamak kapatır', () => {
    expect(basligaGelince(bos, 'ekle')).toBe(bos);
    const acik: MenuGecisDurumu<K> = { acik: 'ekle', uzerineGelinceAcilan: null };
    expect(basligaGelince(acik, 'ekle')).toBe(acik);
    expect(basligaTiklayinca(acik, 'ekle').acik).toBeNull();
  });

  it('menü açıkken üzerine gelmeden doğrudan başka başlığa tıklamak da o menüyü açar', () => {
    expect(basligaTiklayinca({ acik: 'duzenle', uzerineGelinceAcilan: null }, 'ekle').acik).toBe('ekle');
  });

  it('menü çubuğu geçişi menuGecisi ile yapar', () => {
    const menu = oku('WorkspaceMenuBar.tsx');
    expect(menu).toContain('basligaTiklayinca({ acik: activeMenu, uzerineGelinceAcilan: uzerineGelinceAcilan.current }, menu)');
    expect(menu).toContain('basligaGelince({ acik: activeMenu, uzerineGelinceAcilan: uzerineGelinceAcilan.current }, menu)');
  });
});

describe('[146] Araçlar menüsü gerçek araç adları ve alt menüler', () => {
  it('gruplu satırlar paneldeki Ölçme, İnşa, Dönüşüm gruplarıdır; ortaokulda Teğet yok', () => {
    const menu = oku('WorkspaceMenuBar.tsx');
    expect(menu).toContain("export const ARACLAR_MENUSU_ALT_GRUPLARI: readonly string[] = ['olcme', 'insa', 'donusum'];");
    expect(menu).toContain('gruplariSuz(TREE_TOOL_GROUPS, kademeDuzeyi).filter((g) => ARACLAR_MENUSU_ALT_GRUPLARI.includes(g.id))');
    expect(menu).toContain('<span>Seç ve Taşı</span>');
    expect(menu).toContain('<span>Doğru Parçası</span>');
    const ortaokul = gruplariSuz(TREE_TOOL_GROUPS, 'ortaokul').filter((g) => ['olcme', 'insa', 'donusum'].includes(g.id));
    const adlar = ortaokul.flatMap((g) => g.tools.map((t) => t.name));
    expect(adlar).toContain('Dik Doğru');
    expect(adlar).toContain('Öteleme');
    expect(adlar).toContain('Yansıt');
    expect(adlar.some((a) => /Teğet/.test(a))).toBe(false);
    // Dik Doğru Shift+H, Yansıt Shift+R, Öteleme Shift+V, Uzunluk Ölç U: satırın kısayolu kendi aracınındır
    expect(TOOL_SHORTCUTS.perpendicular).toBe('Shift+H');
    expect(TOOL_SHORTCUTS.reflect).toBe('Shift+R');
    expect(TOOL_SHORTCUTS.translate).toBe('Shift+V');
  });
});

describe('[143] Dosya > Yeni', () => {
  it('boş ya da az önce kaydedilmiş çalışma sorulmaz; değişmiş çalışma sorulur', () => {
    expect(yeniIcinSorulmaliMi([], [], null)).toBe(false);
    const nesneler = [{ id: 'a' }];
    expect(yeniIcinSorulmaliMi(nesneler, [], null)).toBe(true);
    const imza = calismaImzasi(nesneler, []);
    expect(yeniIcinSorulmaliMi(nesneler, [], imza)).toBe(false);
    expect(yeniIcinSorulmaliMi([...nesneler, { id: 'b' }], [], imza)).toBe(true);
    expect(yeniIcinSorulmaliMi([], [{ id: 'kup' }], calismaImzasi([], []))).toBe(true);
  });

  it('pencere Kaydet / Kaydetmeden Yeni / Vazgeç sunar ("Tüm Ekranı Temizle" değil)', () => {
    const html = renderToStaticMarkup(
      <YeniCalismaModal isOpen nesneSayisi={3} cisimSayisi={1} onKaydet={() => {}} onKaydetmeden={() => {}} onVazgec={() => {}} />
    );
    expect(html).toContain('Kaydedilmemiş değişiklikler var');
    expect(html).toContain('3 nesne');
    expect(html).toContain('1 katı cisim');
    for (const dugme of ['Kaydet', 'Kaydetmeden Yeni', 'Vazgeç']) expect(html).toContain(`>${dugme}<`);
    expect(html).not.toContain('Tüm Ekranı Temizle');
  });

  it('menü maddesi ve Ctrl+N yeni akışı kullanır', () => {
    const menu = oku('WorkspaceMenuBar.tsx');
    expect(menu).toMatch(/onClick=\{yeniIste\}[\s\S]{0,400}<span>Yeni<\/span>/);
    expect(menu).toContain('KeyN: k.yeniIste');
    expect(menu).not.toMatch(/KeyN: k\.onClearAll/);
  });
});

describe('[142] açılış görünümü orijin merkezli', () => {
  it('kayıtlı çalışma açılırken bakış (yakınlık, kaydırma) varsayılana döner; pencere her açılışta sıfırlanır', () => {
    const baglam = readFileSync(path.resolve(KOK, '..', '..', 'state', 'WorkspaceContext.tsx'), 'utf8');
    expect(baglam).toContain('...saved.viewport, zoom: DEFAULT_ZOOM, panX: 0, panY: 0, width: prev.width, height: prev.height');
    const gorunum = oku('WorkspaceView.tsx');
    expect(gorunum).toMatch(/if \(!acilisEtkinligiRef\.current\) resetViewport\(\);/);
    // Yeni de görünümü sıfırlar
    expect(oku('WorkspaceMenuBar.tsx')).toMatch(/const yeniCalismaAc = \(\) => \{[\s\S]*?resetViewport\(\);/);
  });
});

describe('[147] arama süzgeci ve eski araç ipucu', () => {
  it('Ara sekmesinden çıkınca arama metni sıfırlanır', () => {
    expect(oku('Toolbar.tsx')).toMatch(/useEffect\(\(\) => \{\s*\n\s*onTabChangeRef\.current\?\.\(sidebarTab\);\s*\n\s*if \(sidebarTab !== 'ara'\) setToolSearch\(''\);/);
  });

  it('Fonksiyon / Sürgü / Nesne Ekle penceresi açılınca araç Seç ve Taşı olur (eski yönerge kapanır)', () => {
    expect(oku('WorkspaceView.tsx')).toMatch(
      /if \(isFunctionDialogOpen \|\| isSliderDialogOpen \|\| isAddObjectDialogOpen\) setActiveTool\('select'\);/
    );
  });
});

describe('[164] Ekle > Nesne Ekle (Koordinatla)', () => {
  it('satır adı içerikle uyuşur', () => {
    const menu = oku('WorkspaceMenuBar.tsx');
    expect(menu).toContain('<span>Nesne Ekle (Koordinatla)</span>');
    expect(menu).not.toContain('Medya & 3D Cisim');
  });

  it('çember / dairede ad merkez noktasının adıdır (tuvalde görünür)', () => {
    expect(adAlaniEtiketi('disk')).toBe('Merkez noktasının adı (tuvalde görünür)');
    expect(adAlaniEtiketi('circle')).toBe('Merkez noktasının adı (tuvalde görünür)');
    expect(adAlaniEtiketi('point')).toBe('Nokta adı');
    const kaynak = oku('AddObjectModal.tsx');
    expect(kaynak).toContain('const center = makePoint(x, y, trimmedName, NESNE_RENGI.mavi);');
    expect(kaynak).toContain("label: `${trimmedName} Merkezli ${selectedTab === 'disk' ? 'Daire' : 'Çember'}`,");
  });

  it('ortaokulda komut önizlemesi yerine düz cümle', () => {
    const d = { ad: 'M', x: 1, y: 1, z: 0, r: 2, w: 4, h: 3, d: 3, aci: 60, ifade: '2x + 1' };
    expect(nesneOzeti('disk', d)).toBe('Merkezi M(1; 1), yarıçapı 2 br olan daire');
    expect(nesneOzeti('rectangle', d)).toBe('Bir köşesi (1; 1), kenar uzunlukları 4 br ve 3 br olan dikdörtgen');
    expect(nesneOzeti('function', { ...d, ad: 'f' })).toBe('f(x) = 2x + 1 fonksiyonunun grafiği');
    expect(nesneOzeti('cube', d)).toBe('Merkezi (1; 1; 0), kenar uzunluğu 4 br olan küp');
    expect(oku('AddObjectModal.tsx')).toContain("const sadeOnizleme = kademeDuzeyi === 'ortaokul';");
  });
});

describe('[165] Varsayılana Sıfırla ve iletişim kutusu örtüsü', () => {
  it('onay süreyle düşmez, sonuç bildirilir', () => {
    const menu = oku('WorkspaceMenuBar.tsx');
    expect(menu).not.toContain('window.setTimeout(() => setSifirlamaOnayi(false), 4000)');
    expect(menu).toMatch(/setStyleSettings\(DEFAULT_STYLE_SETTINGS\);\s*\n\s*setViewport\(\(prev\) => \(\{ \.\.\.prev, \.\.\.VARSAYILAN_GORUNUM_AYARLARI \}\)\);/);
    expect(menu).toContain("'Ayarlar varsayılana döndü: Beyaz zemin, ızgara ve eksenler açık; nokta, çizgi ve yazı boyutları ilk değerinde.'");
  });

  it('menü çubuğunun kutuları pencere köküne taşınır; stüdyonun kutuları başlık şeridini de örter', () => {
    const menu = oku('WorkspaceMenuBar.tsx');
    expect(menu).toContain("setPencereKoku(menuBarRef.current?.closest('[data-pencere]') ?? null);");
    expect(menu).toMatch(/<PencereKatmani kok=\{pencereKoku\}>[\s\S]*<YeniCalismaModal[\s\S]*\{infoModalType && \([\s\S]*\{isSettingsModalOpen && \([\s\S]*<\/PencereKatmani>/);
    const css = readFileSync(path.resolve(KOK, '..', 'sinif', 'sinif.module.css'), 'utf8');
    expect(css).toMatch(/\.pencere\[data-pencere-id='cizim'\]:has\(> \.pencere-icerik \[aria-modal='true'\]\) > \.pencere-icerik \{\s*z-index: 6;/);
  });
});

describe('[168] Kullanım Kılavuzu', () => {
  const bolumler = kilavuzBolumleri('ortaokul');
  const metin = JSON.stringify(bolumler);

  it('ortaokulda araç grupları, kademe, kaydet / dışa aktar, kısayollar ve Yazarak Oluştur anlatılır', () => {
    expect(bolumler.map((b) => b.baslik)).toEqual([
      'Sol panel', 'Kademe seçimi', 'Araç grupları', 'Görünümler', 'Kaydetme ve dışa aktarma', 'Yazarak Oluştur', 'Kısayollar', 'Ayarlar',
    ]);
    expect(metin).toContain('Görünümler: 2D, 3D, Cebir ve çoklu yerleşimler.');
    expect(metin).toContain('Ctrl+S');
    expect(metin).toContain('PNG');
    expect(metin).toContain('Kademe menüsünden');
  });

  it('araç grupları ortaokul panelinden: her grup bir madde, örnekler o kademede bulunan araçla', () => {
    const gruplar = bolumler.find((b) => b.baslik === 'Araç grupları')!;
    const panel = gruplariSuz(TREE_TOOL_GROUPS, 'ortaokul');
    expect(gruplar.maddeler).toHaveLength(panel.length);
    expect(metin).not.toMatch(/Elips|Kalem|Şekli Döndür|Oranda Böl/);
    for (const madde of gruplar.maddeler!) expect(madde).toMatch(/Örnek: /);
  });

  it('Yazarak Oluştur örnekleri komut motorunda çalışır', () => {
    for (const ornek of YAZARAK_OLUSTUR_ORNEKLERI) expect(executeTurkishCommand(ornek, []).ok, ornek).toBe(true);
  });

  it('ilkokulda eski üç madde kalır (yalnız Görünümler sekmesi eklendi)', () => {
    const ilkokul = kilavuzBolumleri('ilkokul');
    expect(ilkokul).toHaveLength(3);
    expect(ilkokul[0].baslik).toBe('1. Sol Menü (Araçlar, Nesneler, Bağlamlar, Görünümler)');
  });
});

describe('[170] pencere düğmesinin adı "Geri al" değil', () => {
  it('büyütülmüş pencerede "Önceki boyuta getir", geri alınmışta "Ekranı kapla"', () => {
    expect(PENCERE_BOYUT_ADLARI).toEqual({ oncekiBoyut: 'Önceki boyuta getir', ekraniKapla: 'Ekranı kapla' });
    const pencere = readFileSync(path.resolve(KOK, '..', 'sinif', 'UygulamaPenceresi.tsx'), 'utf8');
    expect(pencere).not.toMatch(/aria-label=\{buyuk \? 'Geri al'/);
    expect(pencere).toContain('aria-label={buyuk ? PENCERE_BOYUT_ADLARI.oncekiBoyut : PENCERE_BOYUT_ADLARI.ekraniKapla}');
  });
});
