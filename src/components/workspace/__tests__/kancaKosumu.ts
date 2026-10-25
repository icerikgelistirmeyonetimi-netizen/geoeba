/**
 * Test koşumu: React kancalarını DOM'suz çalıştıran küçük bir çizici.
 *
 * Projede jsdom ya da test çizicisi yok; WorkspaceProvider, Canvas ve diyalogların GERÇEK işleyicilerini (tıklama,
 * sürükleme, geri al / yinele) sınamak için 'react' modülünün kancaları bununla değiştirilir:
 *
 *   vi.mock('react', async (gercekModul) => {
 *     const gercek = await gercekModul<typeof import('react')>();
 *     const { kancalar } = await import('@/state/__tests__/kancaKosumu');
 *     return { ...gercek, ...kancalar, default: { ...gercek, ...kancalar } };
 *   });
 *
 * Bileşen düz işlev olarak çağrılır (alt bileşenler çizilmez, yalnız öğe ağacı döner). Durum güncellemeleri React'teki
 * gibi bir sonraki çizimde görünür: aynı olay içindeki işleyiciler eski değerleri okur; `yenile` bütün bileşenleri
 * durulana kadar yeniden çizer ve etkileri (useEffect) çizimden sonra çalıştırır. Bu modül 'react'i içe aktarmaz.
 */

type Yikici = void | (() => void);

interface Yuva {
  deger?: unknown;
  ayarla?: (eylem: unknown) => void;
  bagimliliklar?: readonly unknown[];
  temizle?: Yikici;
}

interface Ornek {
  ad: string;
  yuvalar: Yuva[];
  efektler: (() => void)[];
}

let aktif: Ornek | null = null;
let indis = 0;
let kimlikSayaci = 0;
const kirliOrnekler = new Set<Ornek>();

/** useContext'in döndüreceği değerler (bağlam nesnesi → değer); kayıt yoksa bağlamın varsayılanı. */
export const baglamDegerleri = new Map<unknown, unknown>();

function siradakiYuva(): { yuva: Yuva; ornek: Ornek } {
  if (!aktif) throw new Error('Kanca bileşen çizimi dışında çağrıldı.');
  const ornek = aktif;
  const yuva = (ornek.yuvalar[indis] ??= {});
  indis += 1;
  return { yuva, ornek };
}

const ayniBagimliliklar = (a: readonly unknown[] | undefined, b: readonly unknown[] | undefined) =>
  !!a && !!b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

function efektKaydet(yaratici: () => Yikici, bagimliliklar?: readonly unknown[]) {
  const { yuva, ornek } = siradakiYuva();
  if (bagimliliklar && ayniBagimliliklar(yuva.bagimliliklar, bagimliliklar)) return;
  yuva.bagimliliklar = bagimliliklar;
  ornek.efektler.push(() => {
    if (typeof yuva.temizle === 'function') yuva.temizle();
    yuva.temizle = yaratici();
  });
}

export const kancalar = {
  useState<T>(ilk: T | (() => T)) {
    const { yuva, ornek } = siradakiYuva();
    if (!yuva.ayarla) {
      yuva.deger = typeof ilk === 'function' ? (ilk as () => T)() : ilk;
      yuva.ayarla = (eylem: unknown) => {
        const yeni = typeof eylem === 'function' ? (eylem as (o: unknown) => unknown)(yuva.deger) : eylem;
        if (Object.is(yeni, yuva.deger)) return;
        yuva.deger = yeni;
        kirliOrnekler.add(ornek);
      };
    }
    return [yuva.deger as T, yuva.ayarla];
  },
  useReducer<S, A>(indirgeyici: (durum: S, eylem: A) => S, ilk: S, baslat?: (ilk: S) => S) {
    const { yuva, ornek } = siradakiYuva();
    if (!yuva.ayarla) {
      yuva.deger = baslat ? baslat(ilk) : ilk;
      yuva.ayarla = (eylem: unknown) => {
        const yeni = indirgeyici(yuva.deger as S, eylem as A);
        if (Object.is(yeni, yuva.deger)) return;
        yuva.deger = yeni;
        kirliOrnekler.add(ornek);
      };
    }
    return [yuva.deger as S, yuva.ayarla];
  },
  useRef<T>(ilk: T) {
    const { yuva } = siradakiYuva();
    if (!yuva.ayarla) {
      yuva.ayarla = () => {};
      yuva.deger = { current: ilk };
    }
    return yuva.deger as { current: T };
  },
  useMemo<T>(uret: () => T, bagimliliklar: readonly unknown[]) {
    const { yuva } = siradakiYuva();
    if (!yuva.ayarla || !ayniBagimliliklar(yuva.bagimliliklar, bagimliliklar)) {
      yuva.ayarla = () => {};
      yuva.deger = uret();
      yuva.bagimliliklar = bagimliliklar;
    }
    return yuva.deger as T;
  },
  useCallback<T>(islev: T, bagimliliklar: readonly unknown[]) {
    return kancalar.useMemo(() => islev, bagimliliklar);
  },
  useEffect: efektKaydet,
  useLayoutEffect: efektKaydet,
  useInsertionEffect: efektKaydet,
  useImperativeHandle(ref: unknown, yarat: () => unknown, bagimliliklar?: readonly unknown[]) {
    efektKaydet(() => {
      if (ref && typeof ref === 'object') (ref as { current: unknown }).current = yarat();
    }, bagimliliklar);
  },
  useContext(baglam: unknown) {
    if (baglamDegerleri.has(baglam)) return baglamDegerleri.get(baglam);
    return (baglam as { _currentValue?: unknown })._currentValue;
  },
  useSyncExternalStore<T>(_abone: unknown, anlik: () => T) {
    siradakiYuva();
    return anlik();
  },
  useId() {
    const { yuva } = siradakiYuva();
    if (!yuva.ayarla) {
      yuva.ayarla = () => {};
      kimlikSayaci += 1;
      yuva.deger = `:k${kimlikSayaci}:`;
    }
    return yuva.deger as string;
  },
  useTransition() {
    siradakiYuva();
    return [false, (geri: () => void) => geri()] as const;
  },
  useDeferredValue<T>(deger: T) {
    return deger;
  },
  useDebugValue() {},
};

export interface Bilesen<P, R> {
  /** Son çizimin döndürdüğü öğe ağacı */
  readonly sonuc: R;
  props: P;
  /** Bir kez çizer, etkileri çalıştırır; durum değiştiyse true */
  ciz(): void;
  kirliMi(): boolean;
}

/**
 * Bileşeni (düz işlev olarak) çizen örnek. Durumu çizimler arasında saklanır. `efektler: false`: etkiler hiç
 * çalışmaz (yalnız DOM dinleyicisi kuran bileşenler için; ör. tuval).
 */
export function bilesen<P, R>(ad: string, islev: (props: P) => R, props: P, secenek: { efektler?: boolean } = {}): Bilesen<P, R> {
  const ornek: Ornek = { ad, yuvalar: [], efektler: [] };
  let sonuc: R | undefined;
  kirliOrnekler.add(ornek);
  return {
    get sonuc() {
      if (sonuc === undefined) throw new Error(`${ad} henüz çizilmedi.`);
      return sonuc;
    },
    props,
    ciz() {
      kirliOrnekler.delete(ornek);
      const onceki = aktif;
      const oncekiIndis = indis;
      aktif = ornek;
      indis = 0;
      try {
        sonuc = islev(this.props);
      } finally {
        aktif = onceki;
        indis = oncekiIndis;
      }
      const efektler = ornek.efektler.splice(0);
      if (secenek.efektler !== false) for (const efekt of efektler) efekt();
    },
    kirliMi: () => kirliOrnekler.has(ornek),
  };
}

/**
 * Bileşenleri sırayla (sağlayıcı önce) durulana kadar yeniden çizer: biri çizilince ondan sonrakiler de çizilir (bağlam
 * değeri değişen tüketici gibi). `sonra` her çizimden sonra çağrılır (bağlam değerini kaydetmek için).
 */
export function durula(bilesenler: readonly { ciz(): void; kirliMi(): boolean }[], sonra?: () => void): void {
  for (let tur = 0; tur < 100; tur += 1) {
    let degisti = false;
    for (const b of bilesenler) {
      if (degisti || b.kirliMi()) {
        b.ciz();
        sonra?.();
        degisti = true;
      }
    }
    if (!degisti) return;
  }
  throw new Error('Çizim durulmadı (sonsuz güncelleme).');
}

/** Öğe ağacında koşulu sağlayan ilk öğeyi bulur (alt bileşenler çizilmez; yalnız çocuk öğelere bakılır). */
export function ogeBul(agac: unknown, kosul: (oge: AgacOgesi) => boolean): AgacOgesi | undefined {
  const yigin: unknown[] = [agac];
  while (yigin.length) {
    const dugum = yigin.shift();
    if (Array.isArray(dugum)) {
      yigin.unshift(...dugum);
      continue;
    }
    if (!dugum || typeof dugum !== 'object' || !('props' in dugum)) continue;
    const oge = dugum as AgacOgesi;
    if (kosul(oge)) return oge;
    const cocuklar = oge.props?.children;
    if (cocuklar !== undefined) yigin.unshift(cocuklar);
  }
  return undefined;
}

/**
 * Etkilerin dokunduğu tarayıcı yüzeyi: `window` (zamanlayıcılar; sahte zamanlayıcıyla kullanılmalı) ve bellekte
 * duran bir localStorage. Döndürülen işlev eski hâline getirir.
 */
export function tarayiciOrtamiKur(): () => void {
  const kuresel = globalThis as Record<string, unknown>;
  const onceki = { window: kuresel.window, localStorage: kuresel.localStorage };
  const kayitlar = new Map<string, string>();
  kuresel.localStorage = {
    getItem: (k: string) => kayitlar.get(k) ?? null,
    setItem: (k: string, v: string) => void kayitlar.set(k, String(v)),
    removeItem: (k: string) => void kayitlar.delete(k),
    clear: () => kayitlar.clear(),
    key: (i: number) => [...kayitlar.keys()][i] ?? null,
    get length() {
      return kayitlar.size;
    },
  };
  kuresel.window = globalThis;
  return () => {
    kuresel.window = onceki.window;
    kuresel.localStorage = onceki.localStorage;
  };
}

/**
 * Pencereye bağlanan sürüklemeler (ör. serbest döndürme kolu window'a pointermove / pointerup dinleyicisi ekler) için
 * bellek içi olay kaydı. `yayinla` kayıtlı dinleyicileri çağırır; `geriAl` eski hâline getirir. Yalnız açıkça çağıran
 * testlerde kurulur.
 */
export function pencereOlaylariniKur() {
  const kuresel = globalThis as Record<string, unknown>;
  const onceki = { ekle: kuresel.addEventListener, kaldir: kuresel.removeEventListener };
  const dinleyiciler = new Map<string, Set<(olay: unknown) => void>>();
  kuresel.addEventListener = (tur: string, dinleyici: (olay: unknown) => void) => {
    if (!dinleyiciler.has(tur)) dinleyiciler.set(tur, new Set());
    dinleyiciler.get(tur)!.add(dinleyici);
  };
  kuresel.removeEventListener = (tur: string, dinleyici: (olay: unknown) => void) => {
    dinleyiciler.get(tur)?.delete(dinleyici);
  };
  return {
    yayinla(tur: string, olay: unknown) {
      for (const dinleyici of [...(dinleyiciler.get(tur) ?? [])]) dinleyici(olay);
    },
    sayi: (tur: string) => dinleyiciler.get(tur)?.size ?? 0,
    geriAl() {
      kuresel.addEventListener = onceki.ekle;
      kuresel.removeEventListener = onceki.kaldir;
    },
  };
}

export interface AgacOgesi {
  type: unknown;
  ref?: unknown;
  props: Record<string, unknown> & { children?: unknown };
}
