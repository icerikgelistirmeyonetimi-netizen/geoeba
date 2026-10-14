/**
 * Masaüstü uygulamalarının 3B sahneleri (Olasılık deney alanı, Algoritma serası) için grafik bağlamı kaybı izleyicisi.
 *
 * Neden: tarayıcı sayfa başına en çok 16 WebGL bağlamını canlı tutar; sınır aşılınca EN ESKİ canlı bağlamı düşürür
 * («Too many active WebGL contexts. Oldest context will be lost.»). GPU sıfırlanması, sürücü zaman aşımı, akıllı
 * tahtanın uyku-uyanması ve bellek baskısı da bağlamı düşürür. Sahneler isteğe bağlı çizdiği ve kaybı dinlemediği için
 * tuval o andan sonra bütün sekmelerde kalıcı olarak boş kalıyordu (sayı küpü, Galton, sera). Burada kayıp yakalanır,
 * kısa bir beklemeden sonra sahne YENİ bir bağlamla yeniden kurulur; bir dakikada üçten çok kayıpta (sürekli düşen
 * GPU) 3B'den vazgeçilip uygulamanın sade (SVG / şema) görünümüne geçilir.
 */

/** Kayıpların sayıldığı zaman penceresi (ms) */
export const KAYIP_PENCERESI_MS = 60_000;
/** Pencere içinde bu sayıdan çok kayıp: 3B'den vazgeç */
export const EN_COK_KAYIP = 3;
/** Kayıptan sonra yeniden kurmadan önce bekleme (ms): aynı karede gelen olaylar tek kuruluşa düşer */
export const YENIDEN_KURMA_GECIKMESI = 250;

export type KayipKarari = 'yenidenKur' | 'vazgec';

/**
 * Kayıp anını `kayiplar`a ekler (pencere dışı eski kayıtları atar; dizi yerinde güncellenir, sahne yeniden kurulsa
 * da aynı dizi kullanılır) ve ne yapılacağını söyler.
 */
export function kayipKarari(kayiplar: number[], simdi: number, pencere = KAYIP_PENCERESI_MS, enCok = EN_COK_KAYIP): KayipKarari {
  const kalan = kayiplar.filter((t) => simdi - t < pencere);
  kayiplar.length = 0;
  kayiplar.push(...kalan, simdi);
  return kayiplar.length > enCok ? 'vazgec' : 'yenidenKur';
}

export interface BaglamKaybiSecenekleri {
  /** Konsol kaydında uygulamanın adı */
  ad: string;
  /** Sahneyi yeni bir bağlamla yeniden kur */
  yenidenKur: () => void;
  /** 3B'den vazgeç: sade görünüme geç */
  vazgec: () => void;
  gecikme?: number;
  /** Testte sahte saat */
  saat?: () => number;
}

/**
 * `tuval`in (renderer.domElement) `webglcontextlost` olayını dinler. Dönen işlev dinlemeyi bırakır ve bekleyen yeniden
 * kurmayı iptal eder: sahne sökülmeden ÖNCE çağrılmalı (kendi dispose → forceContextLoss kaybı yeniden kurma
 * tetiklemesin; kayıp olayı zaten bir sonraki görevde gelir).
 */
export function baglamKaybiniIzle(tuval: EventTarget | null | undefined, kayiplar: number[], s: BaglamKaybiSecenekleri): () => void {
  if (!tuval) return () => {};
  const saat = s.saat ?? (() => Date.now());
  const gecikme = s.gecikme ?? YENIDEN_KURMA_GECIKMESI;
  let zamanlayici: ReturnType<typeof setTimeout> | null = null;
  let birakildi = false;
  const kayip = (e: Event) => {
    // Varsayılanı engellemek tarayıcıya bağlamı geri getirebileceğini söyler (three de aynısını yapar)
    e.preventDefault();
    if (birakildi || zamanlayici !== null) return;
    const karar = kayipKarari(kayiplar, saat());
    console.warn(
      `[GeoEBA] ${s.ad}: 3B sahnenin grafik bağlamı kayboldu; ${karar === 'vazgec' ? 'sık kaybolduğu için sade görünüme geçiliyor' : 'sahne yeniden kuruluyor'}.`
    );
    zamanlayici = setTimeout(() => {
      zamanlayici = null;
      if (birakildi) return;
      if (karar === 'vazgec') s.vazgec();
      else s.yenidenKur();
    }, gecikme);
  };
  tuval.addEventListener('webglcontextlost', kayip);
  return () => {
    birakildi = true;
    if (zamanlayici !== null) clearTimeout(zamanlayici);
    zamanlayici = null;
    tuval.removeEventListener('webglcontextlost', kayip);
  };
}
