'use client';

/**
 * Tuvaldeki etkileşimli ölçme araçları: açıölçer (iletki), cetvel, gönye, alan modeli.
 *
 * - Araç yalnızca kendisini ve doğrudan tutamaçlarını çizer; ayar düğmeleri sağ tık menüsündedir
 *   (dokunmatikte basılı tutma; yönerge çubuğundaki "Seçenekler" düğmesi de aynı menüyü açar).
 * - Araç etkinleşince (araç çubuğu, kısayol, yazılı/sesli komut, "Ortaya getir") görsel merkezi
 *   görünen tuvalin tam ortasına yerleşir ve boyu o anki yakınlaştırmaya sığdırılır.
 * - Tutamaç sürüklenirken yanında kısa bir okuma ("12 br", "35°") belirir, bırakınca kaybolur.
 * - Renkler ada paletinden, yalnız sınıf adlarıyla (koyu tema ve zemin-acik kendiliğinden işler).
 * - Saf hesaplar olcmeAraclari.ts içinde (testli).
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutGrid,
  LocateFixed,
  Minus,
  MoveHorizontal,
  MoveVertical,
  Plus,
  RotateCcw,
  Ruler,
  Trash2,
} from 'lucide-react';
import { Point2D, PointObject, ViewportTransform } from '@/types/math';
import { worldToScreen } from '@/math/coordinates';
import { ToolMode } from '@/types/workspace';
import { useWorkspace } from '@/state/WorkspaceContext';
import { createId } from '@/state/ids';
import { ContextMenu, ContextMenuItem } from './ContextMenu';
import { GeometryToolIcon } from './GeometryToolIcon';
import { workspaceOwnsKeyboard } from './toolShortcuts';
import {
  ARAC_ADLARI,
  ARAC_SECILDI_OLAYI,
  CETVEL_BOY_MAX,
  CETVEL_BOY_MIN,
  CETVEL_KALINLIK,
  CETVEL_UC_BOSLUK,
  ALAN_MAX,
  ALAN_MIN,
  OLCME_ARACI_ISLEM_OLAYI,
  UZUN_BASIS_KAPANMA_MS,
  UZUN_BASIS_MS,
  UZUN_BASIS_TOLERANS_PX,
  VARSAYILANLAR,
  alanBoyutuTutamactan,
  alanBoyutunuDegistir,
  alanKoseKaymasi,
  alanModeliMenusu,
  alanModeliniYerlestir,
  alanOkumasi,
  cetvelBoyuSuruklemeden,
  cetvelBoyunuDegistir,
  cetvelCentikYollari,
  cetvelDonusunuDegistir,
  cetvelEtiketleri,
  cetvelMenusu,
  cetvelOkumasi,
  cetveldenParcaNesneleri,
  cetveliYerlestir,
  cevreOkumasi,
  donusOkumasi,
  donusYakala,
  gonyeDonusunuDegistir,
  gonyeMenusu,
  gonyeyiYerlestir,
  iletkiCentikYollari,
  iletkiEtiketleri,
  iletkiKolAcisi,
  iletkiMenusu,
  iletkiOkumasi,
  iletkidenAciNesneleri,
  iletkiyiYerlestir,
  normalizeDeg,
  okumaGenisligi,
  okumaKonumu,
  olcmeAraciMi,
  tabanOkumasi,
  tutamactanUzaklastir,
  yereldenEkrana,
  type GosterimAnahtari,
  type OlcmeAraci,
  type OlcmeEylemi,
  type OlcmeIkonu,
  type OlcmeMenuMaddesi,
} from './olcmeAraclari';

interface MeasurementInstrumentsProps {
  activeTool: ToolMode;
  viewport: ViewportTransform;
  /** Ölçülen açıyı tuvale aktarır (taban açısı opsiyonel olarak yorumlanabilir). */
  onAddAngleFromProtractor?: (center: Point2D, angleDeg: number, baseAngleDeg: number) => void;
  onAddSegmentFromRuler?: (p1: Point2D, p2: Point2D) => void;
  onAddPolygonFromAreaModel?: (pos: Point2D, cols: number, rows: number) => void;
}

type TutamacTuru = 'govde' | 'boy' | 'don' | 'kol' | 'taban' | 'kose';

/** Sürükleme sırasında tutamaç hareketçisine verilen bilgiler (x, y: SVG'ye göre piksel) */
interface SuruklemeAni {
  dx: number;
  dy: number;
  x: number;
  y: number;
  x0: number;
  y0: number;
  shift: boolean;
}

interface AktifSurukleme {
  bitir: (geriAl: boolean) => void;
}

/** Delete koruması: yok · yalnız yut (araç yeni açıldı) · araç kaldırılabilir (araçla etkileşildi) */
type Koruma = 'yok' | 'yut' | 'sil';

const ikonCiz = (ikon?: OlcmeIkonu): React.ReactNode => {
  const c = 'w-4 h-4';
  switch (ikon) {
    case 'Ruler':
      return <Ruler className={c} />;
    case 'Plus':
      return <Plus className={c} />;
    case 'Minus':
      return <Minus className={c} />;
    case 'MoveHorizontal':
      return <MoveHorizontal className={c} />;
    case 'MoveVertical':
      return <MoveVertical className={c} />;
    case 'RotateCcw':
      return <RotateCcw className={c} />;
    case 'LayoutGrid':
      return <LayoutGrid className={c} />;
    case 'LocateFixed':
      return <LocateFixed className={c} />;
    case 'Trash2':
      return <Trash2 className="w-4 h-4 text-destructive" />;
    case 'geo:segment':
      return <GeometryToolIcon kind="segment" className={c} />;
    case 'geo:angle':
      return <GeometryToolIcon kind="angle" className={c} />;
    case 'geo:protractor':
      return <GeometryToolIcon kind="protractor" className={c} />;
    case 'geo:rectangle':
      return <GeometryToolIcon kind="rectangle" className={c} />;
    default:
      return undefined;
  }
};

// ─── Ortak görünüm parçaları (sınıf adları JIT görsün diye tam ve sabit yazılır) ──

const GOVDE_KENAR = 'stroke-ada-deniz/80 dark:stroke-ada-vurgu/80';
const SAHTE_GOLGE = 'stroke-ada-murekkep/10 dark:stroke-ada-murekkep/50 pointer-events-none';
const OLCU_CIZGISI = 'stroke-ada-deniz dark:stroke-ada-fener pointer-events-none';
const CENTIK_ANA = 'stroke-ada-murekkep dark:stroke-ada-fildisi pointer-events-none';
const CENTIK_ORTA = 'stroke-ada-murekkep/70 dark:stroke-ada-fildisi/70 pointer-events-none';
const CENTIK_INCE = 'stroke-ada-murekkep/45 dark:stroke-ada-fildisi/45 pointer-events-none';
const SAYI = 'fill-ada-murekkep dark:fill-ada-fildisi font-sans font-semibold tabular-nums pointer-events-none select-none';
/** Zeminden bağımsız okunur kalsın diye yazının arkasında zemin renginde hale */
const HALE: React.CSSProperties = { paintOrder: 'stroke', strokeLinejoin: 'round' };
const BILGI_YAZISI =
  'fill-ada-deniz-koyu dark:fill-ada-vurgu stroke-ada-fildisi dark:stroke-ada-deniz-koyu font-sans font-semibold tabular-nums pointer-events-none select-none';

type TutamacRengi = 'mercan' | 'vurgu';

const HALE_SINIFI: Record<TutamacRengi, { bos: string; aktif: string; disk: string; sap: string }> = {
  mercan: {
    bos: 'fill-ada-mercan/0 group-hover/tutamac:fill-ada-mercan/15 transition-colors',
    aktif: 'fill-ada-mercan/25 transition-colors',
    disk: 'fill-ada-mercan stroke-ada-fildisi pointer-events-none',
    sap: 'stroke-ada-mercan pointer-events-none',
  },
  vurgu: {
    bos: 'fill-ada-vurgu/0 group-hover/tutamac:fill-ada-vurgu/15 transition-colors',
    aktif: 'fill-ada-vurgu/25 transition-colors',
    disk: 'fill-ada-vurgu stroke-ada-fildisi pointer-events-none',
    sap: 'stroke-ada-vurgu pointer-events-none',
  },
};

type Glif = 'boy' | 'don' | 'kose' | 'kol';

function glifCiz(glif: Glif): React.ReactNode {
  const ortak = {
    fill: 'none',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: 'stroke-ada-fildisi pointer-events-none',
  };
  switch (glif) {
    case 'boy':
      return <path d="M-5.5 0H5.5M-3-2.5-5.5 0-3 2.5M3-2.5 5.5 0 3 2.5" {...ortak} />;
    case 'kose':
      return <path d="M-4 4 4-4M0-4H4V0M-4 0V4H0" {...ortak} />;
    case 'don':
      return (
        <g transform="scale(0.8)">
          <path d="M -5 3 A 6 6 0 1 1 4 3" {...ortak} />
          <path d="M 4 6 L 4 0 L 8 3 Z" className="fill-ada-fildisi pointer-events-none" />
        </g>
      );
    case 'kol':
      return <circle r={3} className="fill-ada-fildisi pointer-events-none" />;
  }
}

export function MeasurementInstruments({
  activeTool,
  viewport,
  onAddAngleFromProtractor,
  onAddSegmentFromRuler,
  onAddPolygonFromAreaModel,
}: MeasurementInstrumentsProps) {
  // Açıölçer (İletki) Durumu — taban matematik derecesi (saat yönünün tersi +)
  const [protractorPos, setProtractorPos] = useState<Point2D>({ x: 0, y: 0 });
  const [protractorAngle, setProtractorAngle] = useState<number>(VARSAYILANLAR.iletkiAci);
  const [protractorBaseAngle, setProtractorBaseAngle] = useState<number>(VARSAYILANLAR.iletkiTaban);
  const [protractorRadius, setProtractorRadius] = useState<number>(VARSAYILANLAR.iletkiYaricap);

  // Cetvel Durumu — konum 0 çentiği (ölçü kenarı üzerinde), dönüş SVG derecesi (saat yönü +)
  const [rulerPos, setRulerPos] = useState<Point2D>({ x: -4, y: 2 });
  const [rulerRotation, setRulerRotation] = useState<number>(VARSAYILANLAR.cetvelDonus);
  const [rulerLength, setRulerLength] = useState<number>(VARSAYILANLAR.cetvelBoy);

  // Gönye Durumu — konum dik köşe, boy dik kenar (br)
  const [setsquarePos, setSetsquarePos] = useState<Point2D>({ x: 2, y: -2 });
  const [setsquareRotation, setSetsquareRotation] = useState<number>(VARSAYILANLAR.gonyeDonus);
  const [setsquareSize, setSetsquareSize] = useState<number>(VARSAYILANLAR.gonyeBoy);

  // Alan Modeli Durumu — konum sol alt köşe
  const [areaCols, setAreaCols] = useState<number>(VARSAYILANLAR.sutun);
  const [areaRows, setAreaRows] = useState<number>(VARSAYILANLAR.satir);
  const [areaModelPos, setAreaModelPos] = useState<Point2D>({ x: -2, y: -1 });

  /** Araç üstündeki kalıcı bilgi yazıları (menüden aç/kapat) */
  const [gosterim, setGosterim] = useState<Record<GosterimAnahtari, boolean>>({
    olcu: VARSAYILANLAR.olcuGoster,
    alan: VARSAYILANLAR.alanGoster,
    cevre: VARSAYILANLAR.cevreGoster,
  });
  /** Şu an sürüklenen tutamaç (anlık okuma ve hale için) */
  const [aktifTutamac, setAktifTutamac] = useState<TutamacTuru | null>(null);
  /**
   * Açık sağ tık menüsü: konum ve menünün taşınacağı kap (tuvalin kendi menüleriyle aynı yer).
   * `yukari`: yönerge çubuğundaki düğmeden açıldı; menü ölçülüp düğmenin ÜSTÜNE taşınacak.
   */
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    hedef: HTMLElement;
    yukari?: boolean;
    /** Konumu ölçülüp düzeltildi (ikinci ölçümde döngüye girmesin). */
    ayarlandi?: boolean;
  } | null>(null);
  /** Aynı aracın yeniden seçilmesi (yeniden ortalama tetikleyicisi) */
  const [yenidenSecim, setYenidenSecim] = useState(0);

  const kokRef = useRef<SVGGElement>(null);
  const viewportRef = useRef(viewport);
  const korumaRef = useRef<Koruma>('yok');
  const aktifSuruklemeRef = useRef<AktifSurukleme | null>(null);
  /** Kullanıcının son tercih ettiği boylar: yakın plandaki bir etkinleşme cetveli kısaltsa da tercih kaybolmaz. */
  const tercihRef = useRef({
    cetvelBoy: VARSAYILANLAR.cetvelBoy as number,
    gonyeBoy: VARSAYILANLAR.gonyeBoy as number,
    sutun: VARSAYILANLAR.sutun as number,
    satir: VARSAYILANLAR.satir as number,
  });
  /** Dokunmatik basılı tutmayla açılan menü: parmak kalkana (+400 ms) kadar gelen yerel contextmenu yutulur. */
  const uzunBasisRef = useRef<{ pointerId: number; kalkti: boolean; zaman: number } | null>(null);
  /** Pencere dinleyicilerinin güncel işlevlere ulaşması için */
  const islemRef = useRef<{ sil: () => void; menuyuAc: (x: number, y: number, yukari?: boolean) => void }>({
    sil: () => undefined,
    menuyuAc: () => undefined,
  });

  const { setActiveTool, addObjects, objects } = useWorkspace();
  const gorunur = olcmeAraciMi(activeTool);

  const menuyuKapat = useCallback(() => setMenu(null), []);

  /**
   * Basılı tutma penceresi: parmak hâlâ ekrandaysa ya da kalkalı çok kısa süre olduysa doğrudur.
   * Parmak kalkınca tarayıcı o noktaya bir mousedown/mouseup/click (ve contextmenu) uydurur; menü
   * parmağın biraz yanında açıldığı için bunlar örtüye düşer ve menüyü hemen kapatırdı.
   */
  const uzunBasisPenceresi = useCallback(() => {
    const u = uzunBasisRef.current;
    if (!u) return false;
    const gecen = performance.now() - u.zaman;
    return u.kalkti ? gecen < UZUN_BASIS_KAPANMA_MS : gecen < 5000;
  }, []);

  // ─── Yardımcı işlevler (hook değil; her çizimde güncel durumu görürler) ──────

  const menuyuAc = (x: number, y: number, yukari = false) => {
    const hedef = kokRef.current?.ownerSVGElement?.parentElement;
    if (!hedef) return;
    korumaRef.current = 'sil';
    setMenu({ x, y, hedef, yukari });
  };

  /** Aracı görünen tuvalin ortasına yerleştirir, boyunu yakınlaştırmaya sığdırır. */
  const ortala = (arac: OlcmeAraci, vp: ViewportTransform) => {
    const t = tercihRef.current;
    if (arac === 'ruler') {
      const { konum, boy } = cetveliYerlestir(t.cetvelBoy, rulerRotation, vp);
      setRulerLength(boy);
      setRulerPos(konum);
    } else if (arac === 'measure_angle') {
      const { konum, yaricap } = iletkiyiYerlestir(protractorBaseAngle, vp);
      setProtractorRadius(yaricap);
      setProtractorPos(konum);
    } else if (arac === 'setsquare') {
      const { konum, boy } = gonyeyiYerlestir(t.gonyeBoy, setsquareRotation, vp);
      setSetsquareSize(boy);
      setSetsquarePos(konum);
    } else {
      const { konum, sutun, satir } = alanModeliniYerlestir(t.sutun, t.satir, vp);
      setAreaCols(sutun);
      setAreaRows(satir);
      setAreaModelPos(konum);
    }
  };

  /** "Sil": araç tuvalden kalkar, durumu varsayılana döner, Seç ve Taşı aracına geçilir. */
  const sil = () => {
    const arac = activeTool;
    aktifSuruklemeRef.current?.bitir(false);
    setMenu(null);
    const t = tercihRef.current;
    if (arac === 'ruler') {
      setRulerLength(VARSAYILANLAR.cetvelBoy);
      setRulerRotation(VARSAYILANLAR.cetvelDonus);
      t.cetvelBoy = VARSAYILANLAR.cetvelBoy;
    } else if (arac === 'measure_angle') {
      setProtractorAngle(VARSAYILANLAR.iletkiAci);
      setProtractorBaseAngle(VARSAYILANLAR.iletkiTaban);
      setGosterim((g) => ({ ...g, olcu: VARSAYILANLAR.olcuGoster }));
    } else if (arac === 'setsquare') {
      setSetsquareRotation(VARSAYILANLAR.gonyeDonus);
      setSetsquareSize(VARSAYILANLAR.gonyeBoy);
      t.gonyeBoy = VARSAYILANLAR.gonyeBoy;
    } else if (arac === 'area_model') {
      setAreaCols(VARSAYILANLAR.sutun);
      setAreaRows(VARSAYILANLAR.satir);
      t.sutun = VARSAYILANLAR.sutun;
      t.satir = VARSAYILANLAR.satir;
      setGosterim((g) => ({ ...g, alan: VARSAYILANLAR.alanGoster, cevre: VARSAYILANLAR.cevreGoster }));
    }
    korumaRef.current = 'yok';
    setActiveTool('select');
  };

  const noktaEtiketleri = () => (objects.filter((o) => o.type === 'point') as PointObject[]).map((p) => p.label);

  /** Menü eylemlerini uygular (tüm sınırlar olcmeAraclari.ts'teki menü kurucularında). */
  const uygula = (eylem: OlcmeEylemi) => {
    const vp = viewportRef.current;
    const t = tercihRef.current;
    switch (eylem.tur) {
      case 'cetvelBoy': {
        const yeni = Math.min(CETVEL_BOY_MAX, Math.max(CETVEL_BOY_MIN, Math.round(eylem.boy)));
        setRulerPos(cetvelBoyunuDegistir(rulerPos, rulerRotation, rulerLength, yeni, vp));
        setRulerLength(yeni);
        t.cetvelBoy = yeni;
        break;
      }
      case 'cetvelDonus': {
        const yeni = normalizeDeg(eylem.donusSvg);
        setRulerPos(cetvelDonusunuDegistir(rulerPos, rulerLength, rulerRotation, yeni, vp));
        setRulerRotation(yeni);
        break;
      }
      case 'cetvelParcaEkle': {
        const { nesneler, aciklama, bas, son } = cetveldenParcaNesneleri(
          rulerPos,
          rulerRotation,
          rulerLength,
          noktaEtiketleri(),
          createId
        );
        if (onAddSegmentFromRuler) onAddSegmentFromRuler(bas, son);
        else addObjects(nesneler, aciklama);
        break;
      }
      case 'iletkiAci':
        setProtractorAngle(Math.min(180, Math.max(0, Math.round(eylem.aci))));
        break;
      case 'iletkiTaban':
        setProtractorBaseAngle(normalizeDeg(eylem.taban));
        break;
      case 'iletkiAciEkle': {
        if (protractorAngle === 0) break;
        if (onAddAngleFromProtractor) {
          onAddAngleFromProtractor(protractorPos, protractorAngle, protractorBaseAngle);
        } else {
          const { nesneler, aciklama } = iletkidenAciNesneleri(
            protractorPos,
            protractorAngle,
            protractorBaseAngle,
            protractorRadius / vp.zoom,
            noktaEtiketleri(),
            createId
          );
          addObjects(nesneler, aciklama);
        }
        break;
      }
      case 'gonyeDonus': {
        const yeni = normalizeDeg(eylem.donusSvg);
        setSetsquarePos(gonyeDonusunuDegistir(setsquarePos, setsquareSize, setsquareRotation, yeni, vp));
        setSetsquareRotation(yeni);
        break;
      }
      case 'alanBoyut': {
        const sutun = Math.min(ALAN_MAX, Math.max(ALAN_MIN, Math.round(eylem.sutun)));
        const satir = Math.min(ALAN_MAX, Math.max(ALAN_MIN, Math.round(eylem.satir)));
        setAreaModelPos(alanBoyutunuDegistir(areaModelPos, { sutun: areaCols, satir: areaRows }, { sutun, satir }, vp));
        setAreaCols(sutun);
        setAreaRows(satir);
        t.sutun = sutun;
        t.satir = satir;
        break;
      }
      case 'alanCokgenEkle':
        onAddPolygonFromAreaModel?.(areaModelPos, areaCols, areaRows);
        break;
      case 'gosterim':
        setGosterim((g) => ({ ...g, [eylem.anahtar]: eylem.acik }));
        break;
      case 'ortala':
        if (olcmeAraciMi(activeTool)) ortala(activeTool, vp);
        break;
      case 'sil':
        sil();
        break;
    }
  };

  // ─── Hook'lar (hepsi erken dönüşten ÖNCE) ────────────────────────────────────

  useLayoutEffect(() => {
    viewportRef.current = viewport;
    islemRef.current = { sil, menuyuAc };
  });

  // Aynı araç yeniden seçildi (araç çubuğu, kısayol, komut): yeniden ortala
  useEffect(() => {
    const dinle = (e: Event) => {
      const arac = (e as CustomEvent<{ tool?: string }>).detail?.tool;
      if (!olcmeAraciMi(arac)) return;
      const svg = kokRef.current?.ownerSVGElement;
      if (!svg || !(e.target instanceof Node) || !e.target.contains(svg)) return;
      setYenidenSecim((n) => n + 1);
    };
    window.addEventListener(ARAC_SECILDI_OLAYI, dinle);
    return () => window.removeEventListener(ARAC_SECILDI_OLAYI, dinle);
  }, []);

  // Yönerge çubuğundaki "Seçenekler" / "Sil" düğmeleri
  useEffect(() => {
    const dinle = (e: Event) => {
      const kap = kokRef.current?.ownerSVGElement?.parentElement;
      if (!kap || !(e.target instanceof Node) || !kap.contains(e.target)) return;
      const detay = (e as CustomEvent<{ islem?: string; x?: number; y?: number }>).detail ?? {};
      if (detay.islem === 'sil') islemRef.current.sil();
      else if (detay.islem === 'menu') islemRef.current.menuyuAc(detay.x ?? 0, detay.y ?? 0, true);
    };
    window.addEventListener(OLCME_ARACI_ISLEM_OLAYI, dinle);
    return () => window.removeEventListener(OLCME_ARACI_ISLEM_OLAYI, dinle);
  }, []);

  // Etkinleşme ve yeniden seçim: boyanmadan önce ortala (eski yerde tek kare bile görünmesin).
  // Kaydırma/yakınlaştırmada yeniden ortalanmaz: bağımlılıklarda viewport YOK.
  useLayoutEffect(() => {
    aktifSuruklemeRef.current?.bitir(false);
    setMenu(null);
    if (!olcmeAraciMi(activeTool)) {
      korumaRef.current = 'yok';
      return;
    }
    ortala(activeTool, viewport);
    korumaRef.current = 'yut';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, yenidenSecim]);

  // Menü boyanmadan önce ölçülür ve konumu düzeltilir (ContextMenu yalnız pencereye kıstırır):
  // - `yukari`: çubuk düğmesinden açıldı, düğmenin üstüne taşınır (imleç alt menüyü açmasın, düğme örtülmesin).
  // - Her menü tuvalin alt kenarının içinde kalır: uzun menülerin son maddesi ("Sil") görev çubuğu altında kalmasın.
  useLayoutEffect(() => {
    if (!menu || menu.ayarlandi) return;
    const el = menu.hedef.querySelector<HTMLElement>('[data-olcme-menusu] > [role="menu"]');
    const h = el?.offsetHeight ?? 0;
    const altSinir = menu.hedef.getBoundingClientRect().bottom - 8;
    setMenu((m) => {
      if (!m || m.ayarlandi) return m;
      const ham = m.yukari ? m.y - h - 8 : m.y;
      return { ...m, y: Math.max(8, Math.min(ham, altSinir - h)), yukari: false, ayarlandi: true };
    });
  }, [menu]);

  // Delete/Backspace koruması: araç odaktayken tuvaldeki seçili nesneler yanlışlıkla silinmesin
  useEffect(() => {
    if (!gorunur) return;
    const tus = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const koruma = korumaRef.current;
      if (koruma === 'yok') return;
      if (!workspaceOwnsKeyboard(e, kokRef.current?.ownerSVGElement ?? null)) return;
      // Tuvalin ve menü çubuğunun Delete işleyicileri defaultPrevented görünce çekilir
      e.preventDefault();
      if (koruma === 'sil' && !aktifSuruklemeRef.current && !e.repeat) islemRef.current.sil();
    };
    const bas = (e: PointerEvent) => {
      const hedef = e.target instanceof Element ? e.target : null;
      if (hedef?.closest('[data-olcme-araci], [data-olcme-menusu]')) return;
      korumaRef.current = 'yok';
    };
    window.addEventListener('keydown', tus, true);
    window.addEventListener('pointerdown', bas, true);
    return () => {
      window.removeEventListener('keydown', tus, true);
      window.removeEventListener('pointerdown', bas, true);
    };
  }, [gorunur]);

  useEffect(() => () => aktifSuruklemeRef.current?.bitir(false), []);

  if (!gorunur) return null;

  // ─── Sürükleme altyapısı ─────────────────────────────────────────────────────

  /**
   * Ortak sürükleme başlangıcı. Sağ tuş aracı oynatmaz; orta tuş ve Alt+sürükle tuvale geçer (kaydırma).
   * Dokunmatikte parmak 600 ms kıpırdamazsa sürükleme geri alınır ve menü açılır.
   */
  const suruklemeyiBaslat = (
    e: React.PointerEvent<SVGElement>,
    tur: TutamacTuru,
    hareket: (an: SuruklemeAni) => void,
    geriAl: () => void
  ) => {
    if (e.button !== 0 || e.altKey) {
      if (e.button === 2) e.stopPropagation();
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    aktifSuruklemeRef.current?.bitir(false);
    korumaRef.current = 'sil';
    setMenu(null);
    setAktifTutamac(tur);

    const hedefEl = e.currentTarget as SVGElement;
    const svg = hedefEl.ownerSVGElement;
    const kutu = svg?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const pointerId = e.pointerId;
    const cx0 = e.clientX;
    const cy0 = e.clientY;
    const x0 = cx0 - kutu.left;
    const y0 = cy0 - kutu.top;
    let kipirdadi = false;
    let zamanlayici: number | null = null;

    const hareketEt = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dx = ev.clientX - cx0;
      const dy = ev.clientY - cy0;
      if (!kipirdadi && Math.hypot(dx, dy) > UZUN_BASIS_TOLERANS_PX) {
        kipirdadi = true;
        if (zamanlayici !== null) {
          window.clearTimeout(zamanlayici);
          zamanlayici = null;
        }
      }
      hareket({ dx, dy, x: ev.clientX - kutu.left, y: ev.clientY - kutu.top, x0, y0, shift: ev.shiftKey });
    };
    const birak = (ev: PointerEvent) => {
      if (ev.pointerId === pointerId) kayit.bitir(false);
    };
    const kayit: AktifSurukleme = {
      bitir: (geriAlinsin: boolean) => {
        window.removeEventListener('pointermove', hareketEt);
        window.removeEventListener('pointerup', birak);
        window.removeEventListener('pointercancel', birak);
        if (zamanlayici !== null) {
          window.clearTimeout(zamanlayici);
          zamanlayici = null;
        }
        if (geriAlinsin) geriAl();
        if (aktifSuruklemeRef.current === kayit) aktifSuruklemeRef.current = null;
        setAktifTutamac(null);
      },
    };
    aktifSuruklemeRef.current = kayit;
    window.addEventListener('pointermove', hareketEt);
    window.addEventListener('pointerup', birak);
    window.addEventListener('pointercancel', birak);

    if (e.pointerType !== 'mouse') {
      zamanlayici = window.setTimeout(() => {
        zamanlayici = null;
        if (kipirdadi) return;
        kayit.bitir(true);
        try {
          hedefEl.releasePointerCapture(pointerId);
        } catch {
          /* yakalama yoksa sorun değil */
        }
        uzunBasisRef.current = { pointerId, kalkti: false, zaman: performance.now() };
        const kalk = (ev: PointerEvent) => {
          if (ev.pointerId !== pointerId) return;
          window.removeEventListener('pointerup', kalk, true);
          window.removeEventListener('pointercancel', kalk, true);
          if (uzunBasisRef.current?.pointerId === pointerId) {
            uzunBasisRef.current = { pointerId, kalkti: true, zaman: performance.now() };
          }
        };
        window.addEventListener('pointerup', kalk, true);
        window.addEventListener('pointercancel', kalk, true);
        // Menü parmağın altında değil, biraz sağ üstünde açılır (el menüyü örtmesin)
        islemRef.current.menuyuAc(cx0 + 24, cy0 - 8);
      }, UZUN_BASIS_MS);
    }
  };

  /** Gövdeyi taşır: basılan noktadan beri dünya birimi kadar */
  const govdeyiSurukle = (e: React.PointerEvent<SVGElement>, konum: Point2D, ayarla: (p: Point2D) => void) => {
    const z = viewport.zoom;
    const bas = { ...konum };
    suruklemeyiBaslat(
      e,
      'govde',
      ({ dx, dy }) => ayarla({ x: Number((bas.x + dx / z).toFixed(2)), y: Number((bas.y - dy / z).toFixed(2)) }),
      () => ayarla(bas)
    );
  };

  /** Pivot etrafında döndürme: kavrama ofseti korunur (basınca sıçrama yok) */
  const donusuSurukle = (
    e: React.PointerEvent<SVGElement>,
    tur: TutamacTuru,
    pivot: Point2D,
    baslangic: number,
    ayarla: (d: number) => void,
    matematik: boolean,
    adim: number
  ) => {
    const isaret = matematik ? -1 : 1;
    const aci = (x: number, y: number) => (Math.atan2(isaret * (y - pivot.y), x - pivot.x) * 180) / Math.PI;
    let kavrama: number | null = null;
    suruklemeyiBaslat(
      e,
      tur,
      ({ x, y, x0, y0, shift }) => {
        if (kavrama === null) kavrama = aci(x0, y0);
        ayarla(donusYakala(baslangic + (aci(x, y) - kavrama), shift, adim));
      },
      () => ayarla(baslangic)
    );
  };

  const onContextMenuArac = (e: React.MouseEvent<SVGGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Basılı tutmanın ardından gelen yerel contextmenu: menü zaten açık, yerinde kalsın
    if (menu && uzunBasisPenceresi()) return;
    aktifSuruklemeRef.current?.bitir(true);
    menuyuAc(e.clientX, e.clientY);
  };

  // ─── Çizim ───────────────────────────────────────────────────────────────────

  const z = viewport.zoom;

  /** Tutamaç topuzu: 44 px dokunma alanı + hale, kontrast halkası, disk, glif */
  const tutamacCiz = (o: {
    tur: TutamacTuru;
    x: number;
    y: number;
    renk: TutamacRengi;
    glif: Glif;
    baslik: string;
    imlec?: string;
    onPointerDown: (e: React.PointerEvent<SVGElement>) => void;
  }) => {
    const s = HALE_SINIFI[o.renk];
    return (
      <g
        data-tutamac={o.tur}
        transform={`translate(${o.x} ${o.y})`}
        className={`group/tutamac ${o.imlec ?? 'cursor-grab active:cursor-grabbing'}`}
        onPointerDown={o.onPointerDown}
      >
        <title>{o.baslik}</title>
        <circle r={22} className={aktifTutamac === o.tur ? s.aktif : s.bos} />
        <circle r={13} className="fill-ada-murekkep/45 dark:fill-ada-murekkep/60 pointer-events-none" />
        <circle r={10} strokeWidth={2} className={s.disk} />
        {glifCiz(o.glif)}
      </g>
    );
  };

  /** Sürüklenen tutamacın anlık okuması (döndürülmemiş katmanda; hep dik ve en üstte) */
  const okumaHapi = (metin: string, tutamacEkran: Point2D) => {
    const w = okumaGenisligi(metin);
    const p = okumaKonumu(tutamacEkran, w, viewport);
    return (
      <g data-anlik-okuma="" className="pointer-events-none" transform={`translate(${p.x} ${p.y})`}>
        <rect x={-w / 2} y={-14} width={w} height={28} rx={14} className="fill-ada-murekkep/90 dark:fill-ada-fildisi/95" />
        <text
          y={4.5}
          textAnchor="middle"
          className="fill-ada-fildisi dark:fill-ada-murekkep text-[13px] font-semibold font-sans tabular-nums select-none"
        >
          {metin}
        </text>
      </g>
    );
  };

  // 1) AÇIÖLÇER ------------------------------------------------------------------
  const iletkiCiz = () => {
    const R = protractorRadius;
    const a = protractorAngle;
    const taban = protractorBaseAngle;
    const koken = worldToScreen(protractorPos, viewport);
    const donus = -taban; // SVG rotate() saat yönünde pozitif
    const yon = (deg: number, r: number) => ({
      x: Math.cos((deg * Math.PI) / 180) * r,
      y: -Math.sin((deg * Math.PI) / 180) * r,
    });
    const centik = iletkiCentikYollari(R);
    const bant = R - 30;
    const kolUcu = yon(a, R + 12);
    const kolTopuz = yon(a, R + 22);
    const kolIc = yon(a, 0.3 * R);
    // Sayı halkası R−24'te; kol bu şeritte kesilir ki gösterdiği sayı okunabilsin
    const kolBosluk = R - 34 > 0.3 * R ? { ic: yon(a, R - 34), dis: yon(a, R - 13) } : null;
    const tabanTopuz = { x: -0.55 * R, y: 34 };
    const sektorUc = yon(a, bant);
    const yayUc = yon(a, 0.3 * R);
    // Kalıcı ölçü yazısı: ölçülen açının (dar açıda tümlerinin) ortasında, dik yazılır
    const yaziYonu = a >= 40 ? a / 2 : (a + 180) / 2;
    const yazi = yereldenEkrana(koken, donus, yon(yaziYonu, 0.62 * R));
    const yarimDaire = `M ${-R} 0 A ${R} ${R} 0 0 1 ${R} 0 Z`;

    return (
      <g
        data-olcme-araci="measure_angle"
        data-aci={a}
        data-taban={normalizeDeg(taban)}
        data-yaricap={R}
        className="select-none"
        onContextMenu={onContextMenuArac}
      >
        <g transform={`translate(${koken.x} ${koken.y}) rotate(${donus})`}>
          <g
            data-tutamac="govde"
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => govdeyiSurukle(e, protractorPos, setProtractorPos)}
          >
            <path d={yarimDaire} fill="none" strokeWidth={3} className={SAHTE_GOLGE} />
            <path d={yarimDaire} strokeWidth={1.5} className={`fill-ada-fildisi/35 dark:fill-ada-deniz-koyu/40 ${GOVDE_KENAR}`} />
            {/* Ölçek bandı: çentik ve sayılar okunur kalsın diye daha opak */}
            <path
              d={`M ${R} 0 A ${R} ${R} 0 0 0 ${-R} 0 L ${-bant} 0 A ${bant} ${bant} 0 0 1 ${bant} 0 Z`}
              className="fill-ada-fildisi/85 dark:fill-ada-deniz-koyu/80"
            />
            <path
              d={`M ${-bant} 0 A ${bant} ${bant} 0 0 1 ${bant} 0`}
              fill="none"
              strokeWidth={1}
              className="stroke-ada-deniz/35 dark:stroke-ada-vurgu/35 pointer-events-none"
            />
            <path
              d={`M ${-0.42 * R} 0 A ${0.42 * R} ${0.42 * R} 0 0 1 ${0.42 * R} 0`}
              fill="none"
              strokeWidth={1}
              className="stroke-ada-deniz/25 dark:stroke-ada-vurgu/25 pointer-events-none"
            />
            {/* Ölçülen açı dilimi */}
            {a > 0 && (
              <>
                <path
                  d={`M 0 0 L ${sektorUc.x} ${sektorUc.y} A ${bant} ${bant} 0 0 1 ${bant} 0 Z`}
                  className="fill-ada-altin/20 dark:fill-ada-fener/20 pointer-events-none"
                />
                <path
                  d={`M ${yayUc.x} ${yayUc.y} A ${0.3 * R} ${0.3 * R} 0 0 1 ${0.3 * R} 0`}
                  fill="none"
                  strokeWidth={2}
                  className="stroke-ada-altin dark:stroke-ada-fener pointer-events-none"
                />
              </>
            )}
            <path d={centik.on} fill="none" strokeWidth={1.25} strokeLinecap="butt" className={CENTIK_ANA} />
            <path d={centik.bes} fill="none" strokeWidth={0.9} strokeLinecap="butt" className={CENTIK_ORTA} />
            {centik.bir && <path d={centik.bir} fill="none" strokeWidth={0.6} strokeLinecap="butt" className={CENTIK_INCE} />}
            {iletkiEtiketleri(R).map((t) => (
              <text
                key={t.derece}
                x={t.x}
                y={t.derece % 180 === 0 ? t.y - 5 : t.y + 3.5 /* 0 ve 180 taban çizgisinin üstünde */}
                textAnchor="middle"
                className={`text-[10px] ${t.derece % 90 === 0 ? 'font-bold' : ''} ${SAYI}`}
              >
                {t.derece}
              </text>
            ))}
            <line x1={-R} y1={0} x2={R} y2={0} strokeWidth={2} className={OLCU_CIZGISI} />
            <circle
              r={4}
              strokeWidth={1.25}
              className="fill-ada-fildisi dark:fill-ada-deniz-koyu stroke-ada-murekkep dark:stroke-ada-fildisi pointer-events-none"
            />
            <path d="M-9 0H9M0-9V9" fill="none" strokeWidth={1} className={CENTIK_ANA} />
          </g>

          {/* Kol (ibre): görünen çizgi + geniş tutma şeridi + topuz.
              Sayı halkasının (R−24) üstünde boşluk bırakılır: kol, gösterdiği sayının üstünü çizmesin. */}
          {kolBosluk ? (
            <>
              <line
                x1={0}
                y1={0}
                x2={kolBosluk.ic.x}
                y2={kolBosluk.ic.y}
                strokeWidth={3}
                strokeLinecap="round"
                className="stroke-ada-mercan pointer-events-none"
              />
              <line
                x1={kolBosluk.dis.x}
                y1={kolBosluk.dis.y}
                x2={kolUcu.x}
                y2={kolUcu.y}
                strokeWidth={3}
                strokeLinecap="round"
                className="stroke-ada-mercan pointer-events-none"
              />
            </>
          ) : (
            <line x1={0} y1={0} x2={kolUcu.x} y2={kolUcu.y} strokeWidth={3} strokeLinecap="round" className="stroke-ada-mercan pointer-events-none" />
          )}
          <line
            data-tutamac="kol"
            x1={kolIc.x}
            y1={kolIc.y}
            x2={kolTopuz.x}
            y2={kolTopuz.y}
            strokeWidth={30}
            className="stroke-transparent cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              const p = koken;
              const bas = a;
              suruklemeyiBaslat(
                e,
                'kol',
                ({ x, y, shift }) => setProtractorAngle(iletkiKolAcisi(x - p.x, -(y - p.y), taban, shift)),
                () => setProtractorAngle(bas)
              );
            }}
          />
          {tutamacCiz({
            tur: 'kol',
            x: kolTopuz.x,
            y: kolTopuz.y,
            renk: 'mercan',
            glif: 'kol',
            baslik: 'Açıyı ölçmek için kolu sürükleyin (Shift: 5° adım)',
            onPointerDown: (e) => {
              const p = koken;
              const bas = a;
              suruklemeyiBaslat(
                e,
                'kol',
                ({ x, y, shift }) => setProtractorAngle(iletkiKolAcisi(x - p.x, -(y - p.y), taban, shift)),
                () => setProtractorAngle(bas)
              );
            },
          })}

          {/* Taban döndürme: taban çizgisinin altında, kol topuzundan uzakta */}
          <line
            x1={tabanTopuz.x}
            y1={1}
            x2={tabanTopuz.x}
            y2={23}
            strokeWidth={2}
            className={HALE_SINIFI.vurgu.sap}
          />
          {tutamacCiz({
            tur: 'taban',
            x: tabanTopuz.x,
            y: tabanTopuz.y,
            renk: 'vurgu',
            glif: 'don',
            baslik: 'Tabanı döndürmek için sürükleyin (Shift: 5° adım)',
            onPointerDown: (e) => donusuSurukle(e, 'taban', koken, taban, setProtractorBaseAngle, true, 5),
          })}
        </g>

        {gosterim.olcu && aktifTutamac !== 'kol' && (
          <text x={yazi.x} y={yazi.y + 4} textAnchor="middle" strokeWidth={3} style={HALE} className={`text-[12px] ${BILGI_YAZISI}`}>
            {iletkiOkumasi(a)}
          </text>
        )}
        {aktifTutamac === 'kol' && okumaHapi(iletkiOkumasi(a), yereldenEkrana(koken, donus, kolTopuz))}
        {aktifTutamac === 'taban' && okumaHapi(tabanOkumasi(taban), yereldenEkrana(koken, donus, tabanTopuz))}
      </g>
    );
  };

  // 2) CETVEL --------------------------------------------------------------------
  const cetvelCiz = () => {
    const L = rulerLength;
    const Lp = L * z;
    const koken = worldToScreen(rulerPos, viewport);
    const donus = rulerRotation;
    const b = CETVEL_UC_BOSLUK;
    const H = CETVEL_KALINLIK;
    const centik = cetvelCentikYollari(L, z);
    const boyTopuz = { x: Lp + 24, y: H / 2 };
    const donTopuz = { x: Lp - 20, y: H + 26 };
    // Ölçek şeridi: çentikler + sayı satırı (0…38 px) neredeyse opak, alttaki 10 px yarı saydam kalır.
    // Sayılar saydam kısımda kalınca altındaki eksen sayıları ikinci bir ölçek gibi okunuyordu.
    const SERIT_ALTI = 38;
    const serit = `M ${-b} ${b} A ${b} ${b} 0 0 1 0 0 H ${Lp} A ${b} ${b} 0 0 1 ${Lp + b} ${b} V ${SERIT_ALTI} H ${-b} Z`;
    const alt = `M ${-b} ${SERIT_ALTI} H ${Lp + b} V ${H - b} A ${b} ${b} 0 0 1 ${Lp} ${H} H 0 A ${b} ${b} 0 0 1 ${-b} ${H - b} Z`;

    return (
      <g
        data-olcme-araci="ruler"
        data-boy={L}
        data-donus={normalizeDeg(-donus)}
        className="select-none"
        onContextMenu={onContextMenuArac}
      >
        <g transform={`translate(${koken.x} ${koken.y}) rotate(${donus})`}>
          <g
            data-tutamac="govde"
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => govdeyiSurukle(e, rulerPos, setRulerPos)}
          >
            <rect x={-b} y={0} width={Lp + 2 * b} height={H} rx={b} fill="none" strokeWidth={3} className={SAHTE_GOLGE} />
            <path d={alt} className="fill-ada-fildisi/75 dark:fill-ada-deniz-koyu/70" />
            <path d={serit} className="fill-ada-fildisi/95 dark:fill-ada-deniz-koyu/90" />
            <rect x={-b} y={0} width={Lp + 2 * b} height={H} rx={b} strokeWidth={1.5} className={`fill-transparent ${GOVDE_KENAR}`} />
            {/* Ölçü kenarı: 0 çentiği ve döndürme merkezi bu çizginin üstünde */}
            <line x1={0} y1={0} x2={Lp} y2={0} strokeWidth={2} className={OLCU_CIZGISI} />
            <path d={centik.birim} fill="none" strokeWidth={1.25} strokeLinecap="butt" className={CENTIK_ANA} />
            {centik.yarim && <path d={centik.yarim} fill="none" strokeWidth={1} strokeLinecap="butt" className={CENTIK_ORTA} />}
            {centik.onda && <path d={centik.onda} fill="none" strokeWidth={0.75} strokeLinecap="butt" className={CENTIK_INCE} />}
            {cetvelEtiketleri(L, z).map((k) => (
              <text key={k} x={k * z} y={31} textAnchor="middle" className={`text-[11px] ${SAYI}`}>
                {k}
              </text>
            ))}
            <text x={6} y={43} className="text-[9px] font-sans font-semibold fill-ada-murekkep/55 dark:fill-ada-fildisi/55 pointer-events-none select-none">
              br
            </text>
          </g>

          {/* Boy tutamacı: sağ ucun dışında; 0 ucu yerinde kalır, tam br'ye yapışır */}
          <line x1={Lp + b} y1={H / 2} x2={Lp + 14} y2={H / 2} strokeWidth={2} className={HALE_SINIFI.mercan.sap} />
          {tutamacCiz({
            tur: 'boy',
            x: boyTopuz.x,
            y: boyTopuz.y,
            renk: 'mercan',
            glif: 'boy',
            baslik: 'Boyu değiştirmek için sürükleyin',
            onPointerDown: (e) => {
              const r = (donus * Math.PI) / 180;
              const izdusum = (x: number, y: number) => (x - koken.x) * Math.cos(r) + (y - koken.y) * Math.sin(r);
              const ilk = L;
              suruklemeyiBaslat(
                e,
                'boy',
                ({ x, y, x0, y0 }) => {
                  const yeni = cetvelBoyuSuruklemeden(ilk, izdusum(x0, y0), izdusum(x, y), z);
                  tercihRef.current.cetvelBoy = yeni;
                  setRulerLength(yeni);
                },
                () => {
                  tercihRef.current.cetvelBoy = ilk;
                  setRulerLength(ilk);
                }
              );
            },
          })}

          {/* Döndürme tutamacı: ölçü yapılmayan alt kenarda, boy tutamacından uzakta */}
          <line x1={donTopuz.x} y1={H} x2={donTopuz.x} y2={H + 16} strokeWidth={2} className={HALE_SINIFI.vurgu.sap} />
          {tutamacCiz({
            tur: 'don',
            x: donTopuz.x,
            y: donTopuz.y,
            renk: 'vurgu',
            glif: 'don',
            baslik: 'Döndürmek için sürükleyin (Shift: 15° adım)',
            onPointerDown: (e) => donusuSurukle(e, 'don', koken, donus, setRulerRotation, false, 15),
          })}
        </g>

        {aktifTutamac === 'boy' && okumaHapi(cetvelOkumasi(L), yereldenEkrana(koken, donus, boyTopuz))}
        {/* Döndürme okuması boy tutamacından uzağa itilir (her açıda üstüne binmesin) */}
        {aktifTutamac === 'don' &&
          okumaHapi(
            donusOkumasi(donus),
            tutamactanUzaklastir(yereldenEkrana(koken, donus, donTopuz), yereldenEkrana(koken, donus, boyTopuz), 56)
          )}
      </g>
    );
  };

  // 3) GÖNYE ---------------------------------------------------------------------
  const gonyeCiz = () => {
    const Lp = setsquareSize * z;
    const koken = worldToScreen(setsquarePos, viewport);
    const donus = setsquareRotation;
    const d = 0.16 * Lp;
    const ic = Lp - d * (1 + Math.SQRT2);
    const govdeYolu = `M 0 0 L ${Lp} 0 L 0 ${-Lp} Z M ${d} ${-d} L ${ic} ${-d} L ${d} ${-ic} Z`;
    const s = Math.min(14, 0.1 * Lp);
    const donTopuz = { x: Lp / 2 + 20, y: -Lp / 2 - 20 };

    return (
      <g
        data-olcme-araci="setsquare"
        data-donus={normalizeDeg(-donus)}
        data-boy={setsquareSize}
        className="select-none"
        onContextMenu={onContextMenuArac}
      >
        <g transform={`translate(${koken.x} ${koken.y}) rotate(${donus})`}>
          <g
            data-tutamac="govde"
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => govdeyiSurukle(e, setsquarePos, setSetsquarePos)}
          >
            {/* Boşluk dahil tüm üçgen tutulabilir (boşluğa basınca tuvale geçmesin) */}
            <polygon points={`0,0 ${Lp},0 0,${-Lp}`} className="fill-transparent" />
            <path d={govdeYolu} fillRule="evenodd" fill="none" strokeWidth={3} className={SAHTE_GOLGE} />
            <path
              d={govdeYolu}
              fillRule="evenodd"
              strokeWidth={1.5}
              // Açık zeminde fildişi gövde zeminle karışır: saydam plastik gibi hafif vurgu tonu
              className={`fill-ada-vurgu/15 dark:fill-ada-deniz-koyu/65 ${GOVDE_KENAR}`}
            />
            <path d={`M 0 ${-Lp} L 0 0 L ${Lp} 0`} fill="none" strokeWidth={2} className={OLCU_CIZGISI} />
            <path d={`M 0 ${-s} H ${s} V 0`} fill="none" strokeWidth={1.5} className={OLCU_CIZGISI} />
            <circle cx={s / 2} cy={-s / 2} r={1.75} className="fill-ada-deniz dark:fill-ada-fener pointer-events-none" />
            {Lp >= 150 && (
              <>
                <text x={s + 5} y={-5} className={`text-[11px] ${SAYI}`}>
                  90°
                </text>
                <text x={0.7 * Lp} y={-5} textAnchor="end" className={`text-[11px] ${SAYI}`}>
                  45°
                </text>
                <text x={5} y={-0.7 * Lp} className={`text-[11px] ${SAYI}`}>
                  45°
                </text>
              </>
            )}
          </g>

          <line
            x1={Lp / 2}
            y1={-Lp / 2}
            x2={Lp / 2 + 13}
            y2={-Lp / 2 - 13}
            strokeWidth={2}
            className={HALE_SINIFI.vurgu.sap}
          />
          {tutamacCiz({
            tur: 'don',
            x: donTopuz.x,
            y: donTopuz.y,
            renk: 'vurgu',
            glif: 'don',
            baslik: 'Dik köşesi etrafında döndürmek için sürükleyin (Shift: 15° adım)',
            onPointerDown: (e) => donusuSurukle(e, 'don', koken, donus, setSetsquareRotation, false, 15),
          })}
        </g>

        {aktifTutamac === 'don' && okumaHapi(donusOkumasi(donus), yereldenEkrana(koken, donus, donTopuz))}
      </g>
    );
  };

  // 4) ALAN MODELİ ---------------------------------------------------------------
  const alanCiz = () => {
    const sutun = areaCols;
    const satir = areaRows;
    const koken = worldToScreen(areaModelPos, viewport);
    const W = sutun * z;
    const H = satir * z;
    const kayma = alanKoseKaymasi(z);
    const koseTopuz = { x: W + kayma, y: -H - kayma };
    const kenarYazilari = W >= 44 && H >= 44;
    let cift = '';
    let tek = '';
    for (let r = 0; r < satir; r++) {
      for (let c = 0; c < sutun; c++) {
        const hucre = `M${Number((c * z).toFixed(2))} ${Number((-(r + 1) * z).toFixed(2))}h${z}v${z}h${-z}Z`;
        if ((r + c) % 2 === 0) cift += hucre;
        else tek += hucre;
      }
    }
    let izgara = '';
    for (let c = 1; c < sutun; c++) izgara += `M${Number((c * z).toFixed(2))} 0V${-H}`;
    for (let r = 1; r < satir; r++) izgara += `M0 ${Number((-r * z).toFixed(2))}H${W}`;

    return (
      <g data-olcme-araci="area_model" data-sutun={sutun} data-satir={satir} className="select-none" onContextMenu={onContextMenuArac}>
        <g transform={`translate(${koken.x} ${koken.y})`}>
          <g
            data-tutamac="govde"
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => govdeyiSurukle(e, areaModelPos, setAreaModelPos)}
          >
            <rect x={0} y={-H} width={W} height={H} rx={3} fill="none" strokeWidth={3} className={SAHTE_GOLGE} />
            <rect x={0} y={-H} width={W} height={H} rx={3} className="fill-ada-fildisi/90 dark:fill-ada-deniz-koyu/85" />
            <path d={cift} className="fill-ada-vurgu/25 dark:fill-ada-vurgu/30" />
            {tek && <path d={tek} className="fill-ada-vurgu/10 dark:fill-ada-vurgu/15" />}
            {izgara && (
              <path d={izgara} fill="none" strokeWidth={1} className="stroke-ada-deniz/45 dark:stroke-ada-vurgu/45 pointer-events-none" />
            )}
            <rect
              x={0}
              y={-H}
              width={W}
              height={H}
              rx={3}
              fill="none"
              strokeWidth={2}
              className="stroke-ada-deniz dark:stroke-ada-vurgu pointer-events-none"
            />
            {z >= 28 &&
              Array.from({ length: satir }).map((_, r) =>
                Array.from({ length: sutun }).map((__, c) => (
                  <text
                    key={`${r}-${c}`}
                    x={c * z + z / 2}
                    y={-r * z - z / 2 + 4}
                    textAnchor="middle"
                    className="text-[11px] font-medium font-sans tabular-nums fill-ada-murekkep/70 dark:fill-ada-fildisi/75 pointer-events-none select-none"
                  >
                    {(satir - 1 - r) * sutun + c + 1}
                  </text>
                ))
              )}
          </g>

          {/* Kenar uzunlukları ve alan/çevre: yalnız yazı (hap ya da düğme yok).
              Model çok küçükse (uzak plan) kenar yazıları köşe tutamacıyla üst üste binerdi: gizlenir. */}
          {kenarYazilari && (
            <>
              <text x={W / 2} y={-H - 8} textAnchor="middle" strokeWidth={3} style={HALE} className={`text-[12px] ${BILGI_YAZISI}`}>
                {sutun} br
              </text>
              <text x={-8} y={-H / 2 + 4} textAnchor="end" strokeWidth={3} style={HALE} className={`text-[12px] ${BILGI_YAZISI}`}>
                {satir} br
              </text>
            </>
          )}
          {gosterim.alan && aktifTutamac !== 'kose' && (
            <text x={W / 2} y={22} textAnchor="middle" strokeWidth={3} style={HALE} className={`text-[12px] ${BILGI_YAZISI}`}>
              {alanOkumasi(sutun, satir)}
            </text>
          )}
          {gosterim.cevre && (
            <text
              x={W / 2}
              y={gosterim.alan ? 40 : 22}
              textAnchor="middle"
              strokeWidth={3}
              style={HALE}
              className={`text-[11px] ${BILGI_YAZISI}`}
            >
              {cevreOkumasi(sutun, satir)}
            </text>
          )}

          {tutamacCiz({
            tur: 'kose',
            x: koseTopuz.x,
            y: koseTopuz.y,
            renk: 'mercan',
            glif: 'kose',
            imlec: 'cursor-nesw-resize',
            baslik: 'Sütun ve satır sayısını değiştirmek için sürükleyin',
            onPointerDown: (e) => {
              const sol = koken;
              const ilk = { sutun, satir };
              let ofset: Point2D | null = null;
              suruklemeyiBaslat(
                e,
                'kose',
                ({ x, y, x0, y0 }) => {
                  if (!ofset) ofset = { x: x0 - (sol.x + koseTopuz.x), y: y0 - (sol.y + koseTopuz.y) };
                  const kx = x - ofset.x;
                  const ky = y - ofset.y;
                  const [s, r] = alanBoyutuTutamactan(kx - sol.x - kayma, sol.y - ky - kayma, z);
                  tercihRef.current.sutun = s;
                  tercihRef.current.satir = r;
                  setAreaCols(s);
                  setAreaRows(r);
                },
                () => {
                  tercihRef.current.sutun = ilk.sutun;
                  tercihRef.current.satir = ilk.satir;
                  setAreaCols(ilk.sutun);
                  setAreaRows(ilk.satir);
                }
              );
            },
          })}
        </g>

        {aktifTutamac === 'kose' &&
          okumaHapi(alanOkumasi(sutun, satir), { x: koken.x + koseTopuz.x, y: koken.y + koseTopuz.y })}
      </g>
    );
  };

  // ─── Sağ tık menüsü ──────────────────────────────────────────────────────────

  const menuMaddeleri = (): OlcmeMenuMaddesi[] => {
    switch (activeTool) {
      case 'ruler':
        return cetvelMenusu({ boy: rulerLength, donusSvg: rulerRotation });
      case 'measure_angle':
        return iletkiMenusu({ aci: protractorAngle, taban: protractorBaseAngle, olcuGoster: gosterim.olcu });
      case 'setsquare':
        return gonyeMenusu({ donusSvg: setsquareRotation });
      default:
        return alanModeliMenusu({
          sutun: areaCols,
          satir: areaRows,
          ekleVar: !!onAddPolygonFromAreaModel,
          alanGoster: gosterim.alan,
          cevreGoster: gosterim.cevre,
        });
    }
  };

  const maddeye = (m: OlcmeMenuMaddesi): ContextMenuItem => ({
    id: m.id,
    label: m.label,
    icon: ikonCiz(m.ikon),
    radio: m.radio,
    checked: m.checked,
    disabled: m.disabled,
    danger: m.danger,
    separatorBefore: m.separatorBefore,
    submenu: m.submenu?.map(maddeye),
    onSelect: m.eylem ? () => uygula(m.eylem!) : undefined,
    prompt: m.prompt
      ? {
          label: m.prompt.label,
          unit: m.prompt.unit,
          initial: m.prompt.initial,
          onSubmit: (v: number) => uygula(m.prompt!.eylem(v)),
        }
      : undefined,
  });

  const durdur = (e: React.SyntheticEvent) => e.stopPropagation();
  /** Basılı tutmanın bıraktığı sahte fare olayını yutar (menü açık kalsın); menünün içindekilere dokunmaz. */
  const uzunBasistanGelen = (e: React.MouseEvent) => {
    if (!uzunBasisPenceresi()) return;
    if (e.target instanceof Element && e.target.closest('[role="menu"]')) return;
    e.preventDefault();
    e.stopPropagation();
  };
  const menuAdi = ARAC_ADLARI[activeTool];

  return (
    <>
      <g ref={kokRef} className="measurement-instruments select-none">
        {activeTool === 'measure_angle' && iletkiCiz()}
        {activeTool === 'ruler' && cetvelCiz()}
        {activeTool === 'setsquare' && gonyeCiz()}
        {activeTool === 'area_model' && alanCiz()}
      </g>
      {menu &&
        createPortal(
          <div
            data-olcme-menusu=""
            style={{ display: 'contents' }}
            onPointerDown={durdur}
            onPointerUp={durdur}
            onPointerMove={durdur}
            onMouseDown={durdur}
            onContextMenu={durdur}
            onContextMenuCapture={(e) => {
              if (uzunBasisPenceresi()) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            // Parmak kalkınca tarayıcının uydurduğu mousedown/mouseup/click örtüye düşer ve menüyü
            // kapatırdı: basılı tutma penceresinde bu olaylar menünün dışındayken yutulur.
            onMouseDownCapture={uzunBasistanGelen}
            onMouseUpCapture={uzunBasistanGelen}
            onClickCapture={uzunBasistanGelen}
            onClick={(e) => {
              e.stopPropagation();
              // Dokunmatikte örtünün mousedown'u gelmez (tuval pointerdown'u engeller): dışarı dokunuş burada kapatır
              if (!(e.target instanceof Element) || !e.target.closest('[role="menu"]')) menuyuKapat();
            }}
          >
            <ContextMenu
              open
              x={menu.x}
              y={menu.y}
              title={menuAdi}
              ariaLabel={menuAdi}
              items={menuMaddeleri().map(maddeye)}
              onClose={menuyuKapat}
            />
          </div>,
          menu.hedef
        )}
    </>
  );
}
