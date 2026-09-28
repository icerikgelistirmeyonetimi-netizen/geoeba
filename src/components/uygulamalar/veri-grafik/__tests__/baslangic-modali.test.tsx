// Sahip: C (BaslangicModali.tsx: başlangıç penceresi; durum.ts: bosTabloAc; index.tsx: açılış, "Örnek veri" ve "Veri topla" bağı)
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import VeriGrafikUygulamasi, { DEPO_ANAHTARI, paneliDuzelt } from '../index';
import {
  BASLANGIC_EN_GENIS,
  BASLANGIC_EN_YUKSEK,
  BASLANGIC_SECENEKLERI,
  BaslangicModali,
  KAPAT_ETIKETI,
  SECIM_YAN_YANA,
  baslangicGenisligi,
  type BaslangicModaliProps,
} from '../BaslangicModali';
import { baslangicDurumu, bosTabloAc, tabloAdiBul, tabloDuzenle, type Durum } from '../durum';
import { HAZIR_SORULAR, anketSatiri, arastirmaBagli, hazirSoruUygula } from '../arastirma';
import { planiUygula, toplamaVerisiYaz } from '../toplamaDurumu';
import { ORNEK_VERILER, hucreYaz } from '../veri';
import { SORU_UC_SUTUN, SoruAdimi } from '../toplama/SoruAdimi';
import { PlanAdimi } from '../toplama/PlanAdimi';

const bos = () => undefined;

/** Sunucu çizimini sahte bir localStorage'lı pencereyle yapar (durum ilk çizimde okunur) */
function pencereyle<T>(depo: Record<string, string>, f: () => T): T {
  const g = globalThis as { window?: unknown };
  const eski = g.window;
  g.window = { localStorage: { getItem: (k: string) => depo[k] ?? null, setItem: () => undefined, removeItem: () => undefined } };
  try {
    return f();
  } finally {
    if (eski === undefined) delete g.window;
    else g.window = eski;
  }
}

/** Bağlı bir anket araştırması (meyve, 3 cevap); Veri topla paneli açık ya da kapalı */
function toplamaDurumu(acik: boolean): Durum {
  let d = planiUygula(baslangicDurumu(), hazirSoruUygula('meyve')!).durum;
  d = toplamaVerisiYaz(d, { ekle: ['Elma', 'Muz', 'Elma'].map((s, i) => ({ kimlik: `r${i}`, hucreler: anketSatiri(d.arastirma!, s) })) });
  return { ...d, toplamaAcik: acik, ipucu: 'serit' };
}

const kok = (genislik: number) => renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={genislik} />);
/** Araç çubuğunun sağındaki düğmelerin HTML'i */
const aracDugmeleri = (html: string) => html.slice(html.indexOf('data-arac-dugmeleri'), html.indexOf('data-yerlesim='));

function modalProps(ek: Partial<BaslangicModaliProps> = {}): BaslangicModaliProps {
  const d = baslangicDurumu();
  return {
    baslangic: 'secim',
    onKapat: bos,
    genislik: 1366,
    simdiki: { ad: 'Boy (cm)', satirSayisi: d.tablo.satirlar.length },
    yukluOrnekId: d.ornekId,
    onceki: null,
    onOrnekYukle: bos,
    onOncekiTabloyaDon: bos,
    arastirma: null,
    bagli: false,
    tablo: d.tablo,
    onPlaniUygula: bos,
    onDevam: bos,
    planUyarisi: () => null,
    onBosTablo: bos,
    ...ek,
  };
}
const modal = (ek?: Partial<BaslangicModaliProps>) => renderToStaticMarkup(<BaslangicModali {...modalProps(ek)} />);

describe('durum: bosTabloAc (başlangıç penceresi "Boş tablo")', () => {
  it('Tablom boş "Etiket | Değer" tablosu olur; örnek bağı, ad ve Keşif kartı yok; panel kapanır; değiştirilmemiş örnek saklanmaz', () => {
    const d0 = { ...baslangicDurumu(), toplamaAcik: true, ipucu: 'kart' as const };
    const { durum: d, onceki } = bosTabloAc(d0);
    expect(onceki).toBe(d0);
    expect(d.tablo.sutunlar.map((s) => [s.ad, s.tur])).toEqual([
      ['Etiket', 'etiket'],
      ['Değer', 'sayi'],
    ]);
    expect(d.tablo.satirlar).toEqual([]);
    expect(d.ornekId).toBeNull();
    expect(d.ornekTemiz).toBe(false);
    expect(d.tabloAdi).toBeNull();
    expect(d.ipucu).toBe('kapali');
    expect(d.toplamaAcik).toBe(false);
    expect(d.daireModu).toBeNull();
    expect(d.etkinKume).toBe('tablom');
    // Değiştirilmemiş açılış örneği önceki tablo olarak saklanmaz (Örnek veri'den yeniden açılır)
    expect(d.oncekiTablo).toBeNull();
    expect(d.toplamaOncesi).toBeNull();
  });

  it('değiştirilmiş tablo görünümüyle "Önceki tabloya dön" için saklanır; bağlı araştırma bağsız kalır (plan silinmez)', () => {
    const b = baslangicDurumu();
    const d0 = tabloDuzenle(b, hucreYaz(b.tablo, 0, 1, '170'));
    const { durum: d } = bosTabloAc(d0);
    expect(d.oncekiTablo?.tablo).toBe(d0.tablo);
    expect(d.oncekiTablo?.ad).toBe(tabloAdiBul(d0));
    expect(d.oncekiTablo?.ornekId).toBe('boy');
    // Toplama sürerken: tablo saklanır (araştırmasıyla), plan durumda kalır ama yeni tabloya bağlı değil
    const t = toplamaDurumu(true);
    const { durum: y } = bosTabloAc(t);
    expect(y.toplamaAcik).toBe(false);
    expect(y.oncekiTablo?.tablo).toBe(t.tablo);
    expect(y.oncekiTablo?.arastirma).toBe(t.arastirma);
    expect(y.arastirma).toBe(t.arastirma);
    expect(arastirmaBagli(y.tablo, y.arastirma)).toBe(false);
  });
});

describe('başlangıç penceresi: açılış kuralı ve ölçüler', () => {
  it('paneliDuzelt: panel Topla görünümünde açıksa kalır; kendi "Ne araştıralım?" görünümüne düşecekse (bağsız ya da soru adımında) kapalı gelir', () => {
    const kapali = baslangicDurumu();
    expect(paneliDuzelt(kapali)).toBe(kapali);
    const topla = toplamaDurumu(true);
    expect(paneliDuzelt(topla)).toBe(topla);
    const soruda = { ...topla, arastirma: { ...topla.arastirma!, adim: 'soru' as const } };
    expect(paneliDuzelt(soruda).toplamaAcik).toBe(false);
    expect(paneliDuzelt({ ...baslangicDurumu(), toplamaAcik: true }).toplamaAcik).toBe(false);
  });

  it('iç genişlik: kökten 32 px içeride, en çok 860, en az 240; en çok 860 × 660; kartlar 640 altında alt alta', () => {
    expect([BASLANGIC_EN_GENIS, BASLANGIC_EN_YUKSEK, SECIM_YAN_YANA]).toEqual([860, 660, 640]);
    expect(baslangicGenisligi(1366)).toBe(860);
    expect(baslangicGenisligi(700)).toBe(668);
    expect(baslangicGenisligi(100)).toBe(240);
  });
});

describe('başlangıç penceresi (SSR): adımlar', () => {
  it('seçim: kipli diyalog, üç kart (Örnek veri · Veri topla · Boş tablo) sayılarıyla, "Bu tabloyla devam et"; genişte yan yana', () => {
    const html = modal();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Nasıl başlayalım?"');
    expect(html).toContain('data-baslangic-modali="secim"');
    expect(html).toContain('data-baslangic-ortusu=""');
    expect(html).toContain(`max-width:${BASLANGIC_EN_GENIS}px;max-height:min(${BASLANGIC_EN_YUKSEK}px, 100%)`);
    expect(BASLANGIC_SECENEKLERI.map((s) => s.id)).toEqual(['hazir', 'topla', 'bos']);
    expect(html.match(/data-baslangic-secenek="/g)).toHaveLength(3);
    const i = (m: string) => html.indexOf(m);
    expect(i('data-baslangic-secenek="hazir"')).toBeLessThan(i('data-baslangic-secenek="topla"'));
    expect(i('data-baslangic-secenek="topla"')).toBeLessThan(i('data-baslangic-secenek="bos"'));
    for (const ad of ['Örnek veri', 'Veri topla', 'Boş tablo']) expect(html).toContain(`>${ad}<`);
    expect(html).toContain(`${ORNEK_VERILER.length} hazır tablo`);
    expect(html).toContain(`${HAZIR_SORULAR.length} hazır soru`);
    expect(html).toContain('Etiket · Değer');
    expect(html).toContain('data-baslangic-secenekler="yan-yana"');
    expect(html).toContain(`Şimdiki tablo: Boy (cm) · ${baslangicDurumu().tablo.satirlar.length} satır`);
    expect(html).toContain('data-baslangic-devam=""');
    expect(html).toContain('Bu tabloyla devam et');
    expect(html).toContain(`aria-label="${KAPAT_ETIKETI}"`);
    // Bu adımda galeri ve hazır sorular çizilmez; geri düğmesi yok
    expect(html).not.toContain('role="menuitem"');
    expect(html).not.toContain('data-hazir-soru');
    expect(html).not.toContain('data-baslangic-geri');
    expect(html).not.toMatch(/NaN|undefined|Infinity/);
    // Dar kökte kartlar alt alta
    expect(modal({ genislik: 600 })).toContain('data-baslangic-secenekler="alt-alta"');
  });

  it('örnek veri: ‹ geri, galeri menüsü (16 örnek, yüklü örnek işaretli; önceki tablo varsa en üstte)', () => {
    const html = modal({ baslangic: 'hazir' });
    expect(html).toContain('data-baslangic-modali="hazir"');
    expect(html).toContain('aria-label="Örnek veri"');
    expect(html).toContain('data-baslangic-geri=""');
    expect(html).toContain('aria-label="Geri: Nasıl başlayalım?"');
    expect(html).toContain('role="menu"');
    expect(html).toContain('data-baslangic-galerisi=""');
    expect(html.match(/role="menuitem"/g)).toHaveLength(ORNEK_VERILER.length);
    expect(html).toMatch(/aria-current="true"[^>]*data-ornek="boy"/);
    expect(html).not.toContain('data-onceki-tablo');
    const onceki = modal({ baslangic: 'hazir', onceki: { ad: 'Sınav puanları', satirSayisi: 12 } });
    expect(onceki).toContain('data-onceki-tablo');
    expect(onceki).toContain('Sınav puanları · 12 satır');
    expect(onceki.match(/role="menuitem"/g)).toHaveLength(ORNEK_VERILER.length + 1);
  });

  it('veri topla: "Ne araştıralım?" (18 hazır soru, üç grup, "Kendi sorunu yaz") ‹ ve × ile; genişte üç sütun; bağlı araştırma kartı', () => {
    const html = modal({ baslangic: 'topla' });
    expect(html).toContain('data-baslangic-modali="topla"');
    expect(html).toContain('aria-label="Veri topla: ne araştıralım?"');
    expect(html).toContain('data-adim="soru"');
    expect(html).toContain('Ne araştıralım?');
    expect(html.match(/data-hazir-soru=/g)).toHaveLength(HAZIR_SORULAR.length);
    expect(html.match(/data-hazir-grubu=/g)).toHaveLength(3);
    expect(html).toContain('data-kendi-sorun=""');
    expect(html).toContain('aria-label="Geri: Nasıl başlayalım?"');
    expect(html).toContain(`aria-label="${KAPAT_ETIKETI}"`);
    expect(html).not.toContain('aria-label="Veri toplama panelini kapat"');
    expect(html).toContain('grid-cols-3');
    const t = toplamaDurumu(false);
    const bagli = modal({ baslangic: 'topla', arastirma: t.arastirma, bagli: true, tablo: t.tablo });
    expect(bagli).toContain('data-son-arastirma="bagli"');
    expect(bagli).toContain('Toplamaya dön');
    expect(bagli).toContain('3 cevap');
  });

  it('plan adımı taslaksız açılamaz ("Ne araştıralım?"a düşer); PlanAdimi × düğmesini yalnız onKapat verilince çizer', () => {
    expect(modal({ baslangic: 'plan' })).toContain('data-baslangic-modali="topla"');
    const t = { ...hazirSoruUygula('oylama')!, adim: 'plan' as const };
    const ortak = { taslak: t, onTaslak: bos, onGeri: bos, onUygula: bos, devam: false, uyari: null, tablo: baslangicDurumu().tablo, bagliArastirma: null, genislik: 800 };
    const panelde = renderToStaticMarkup(<PlanAdimi {...ortak} />);
    expect(panelde).not.toContain('data-plan-kapat');
    const pencerede = renderToStaticMarkup(<PlanAdimi {...ortak} onKapat={bos} kapatEtiketi={KAPAT_ETIKETI} />);
    expect(pencerede).toContain('data-plan-kapat=""');
    expect(pencerede).toContain(`aria-label="${KAPAT_ETIKETI}"`);
    expect(pencerede).toContain('Planı tamamla');
    expect(pencerede).toContain('data-toplamaya-basla=""');
  });

  it('SoruAdimi: panelde simge ve "Veri toplama panelini kapat"; ‹ yalnız onGeri ile; sütun sayısı 1 / 2 / 3', () => {
    const ortak = { arastirma: null, bagli: false, toplananMetni: null, onHazirSoru: bos, onDevam: bos, onYenidenBaslat: bos, onKendiSorun: bos, onKapat: bos };
    const panel = renderToStaticMarkup(<SoruAdimi {...ortak} genislik={410} />);
    expect(panel).toContain('aria-label="Veri toplama panelini kapat"');
    expect(panel).not.toContain('data-baslangic-geri');
    expect(panel).toContain('grid-cols-2');
    expect(panel).not.toContain('grid-cols-3');
    expect(renderToStaticMarkup(<SoruAdimi {...ortak} genislik={280} />)).toContain('grid-cols-1');
    expect(SORU_UC_SUTUN).toBe(720);
    const genis = renderToStaticMarkup(<SoruAdimi {...ortak} genislik={860} onGeri={bos} kapatEtiketi={KAPAT_ETIKETI} />);
    expect(genis).toContain('grid-cols-3');
    expect(genis).toContain('data-baslangic-geri=""');
    expect(genis).toContain(`aria-label="${KAPAT_ETIKETI}"`);
    expect(genis).not.toContain('aria-label="Veri toplama panelini kapat"');
  });
});

describe('uygulama kökü (SSR): başlangıç penceresi ve araç çubuğu bağı', () => {
  it('kayıtsız açılış: pencere seçim adımında, gövdenin üstünde; "Örnek veri" ve "Veri topla" diyalog açar; örnek menüsü yok', () => {
    const html = kok(1366);
    expect(html).toContain('data-baslangic-modali="secim"');
    expect(html.indexOf('data-baslangic-ortusu')).toBeGreaterThan(html.indexOf('data-yerlesim='));
    // Kök konumludur: pencere uygulama penceresinin içinde durur
    expect(html).toMatch(/<div class="relative flex h-full w-full flex-col[^"]*" data-uygulama="veri-grafik"/);
    const dugmeler = aracDugmeleri(html);
    expect(dugmeler.match(/aria-haspopup="dialog"/g)).toHaveLength(2);
    expect(dugmeler).toMatch(/aria-haspopup="dialog"[^>]*data-ornek-veri-dugmesi=""/);
    expect(dugmeler).toMatch(/aria-pressed="false" aria-haspopup="dialog"[^>]*data-veri-topla-dugmesi=""/);
    expect(dugmeler).not.toContain('aria-haspopup="menu" aria-expanded="false" aria-label="Örnek veri"');
    expect(html).not.toContain('data-ornek-menusu');
    // Arka planda tablo ve grafik yine çizilir; alt satır şimdiki tabloyu söyler
    expect(html).toContain('aria-label="Veri"');
    expect(html).toContain(`Şimdiki tablo: ${tabloAdiBul(baslangicDurumu())}`);
  });

  it('kayıtlı açılış: pencere her açılışta gelir (panel Topla\'da açıksa altında kalır); panel "Ne araştıralım?"da kaydedildiyse kapalı gelir', () => {
    const kapali = pencereyle({ [DEPO_ANAHTARI]: JSON.stringify(toplamaDurumu(false)) }, () => kok(1366));
    expect(kapali).toContain('data-baslangic-modali="secim"');
    expect(kapali).toContain('data-soru-seridi');
    // Toplama sürüyor: panel Topla görünümünde açık kalır, pencere üstünde ("Bu tabloyla devam et" kapatır)
    const acik = pencereyle({ [DEPO_ANAHTARI]: JSON.stringify(toplamaDurumu(true)) }, () => kok(1366));
    expect(acik).toContain('data-baslangic-modali="secim"');
    expect(acik).toContain('data-veri-topla-paneli="" data-gorunum="topla"');
    expect(acik).toContain('data-yerlesim="bantli"');
    const dugmeler = aracDugmeleri(acik);
    expect(dugmeler.match(/aria-haspopup="dialog"/g)).toHaveLength(2);
    expect(dugmeler).toMatch(/aria-pressed="true" aria-haspopup="dialog"[^>]*data-veri-topla-dugmesi/);
    // Panel kendi başlangıç görünümünde kaydedildiyse (‹ ile dönülmüş): panel kapalı, soru şeridi ve pencere
    const t = toplamaDurumu(true);
    const soruda = pencereyle({ [DEPO_ANAHTARI]: JSON.stringify({ ...t, arastirma: { ...t.arastirma, adim: 'soru' } }) }, () => kok(1366));
    expect(soruda).not.toContain('data-veri-topla-paneli');
    expect(soruda).not.toContain('data-gorunum="baslangic"');
    expect(soruda).toContain('data-baslangic-modali="secim"');
    expect(soruda).toContain('data-soru-seridi');
    expect(soruda).toMatch(/aria-pressed="false"[^>]*data-veri-topla-dugmesi/);
  });

  it('dar kökte (< 1000) "Örnek veri" yalnız simge: erişilebilir ad ve title aynı, görünür yazı yok', () => {
    const dugmeler = aracDugmeleri(kok(900));
    expect(dugmeler).toMatch(/aria-label="Örnek veri" title="Örnek veri"[^>]*data-ornek-veri-dugmesi/);
    expect(dugmeler).not.toMatch(/>Örnek veri</);
    // Genişte yazılı ve açıklayıcı title
    const genis = aracDugmeleri(kok(1366));
    expect(genis).toMatch(/title="Örnek veri: sınıf düzeyine göre hazır tablolar"[^>]*data-ornek-veri-dugmesi=""><svg[\s\S]*?<\/svg>Örnek veri<\/button>/);
  });
});
