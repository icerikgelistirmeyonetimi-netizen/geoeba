/**
 * Masaüstü uygulama gövdelerinin tembel yüklenmesi: parça (chunk) yükleme hatasını tanıma ve yeniden deneme.
 *
 * Neden ayrı: Olasılık, Veri ve Grafik ve Algoritma gövdeleri ayrı JS parçalarıdır (uygulamalar.tsx). GitHub Pages'e
 * her yayında (main'e her push) parça adları içerik özetiyle değişir ve eski parçalar sunucudan kalkar. Sayfa yayından
 * önce açılmışsa (akıllı tahtada sekme saatlerce açık kalır) ya da tarayıcı / CDN eski HTML'i önbellekten verdiyse
 * (Pages: Cache-Control max-age=600) pencere açılınca eski parça 404 döner. next/dynamic (React.lazy) reddedilmiş
 * yüklemeyi modül düzeyinde kalıcı tutuyordu: pencere hata verdikten sonra "Yeniden başlat" aynı hatayı gösteriyor,
 * "Kayıtlı veriyi sil" öğrencinin verisini boşuna siliyor, sayfa yenilenene kadar uygulama hiç açılmıyordu. Geçici ağ
 * kopmasında da aynısı oluyordu (tek deneme). Buradaki yükleyici geçici hatayı birkaç kez dener, başarılı modülü
 * önbelleğe alır, başarısız denemeyi önbellekte tutmaz (bir sonraki bağlanış baştan dener).
 */

/** Parça yükleme hatası mı: webpack ChunkLoadError / CSS parçası, tarayıcının dinamik import ağ hatası. */
export function parcaYuklemeHatasiMi(hata: unknown): boolean {
  if (!hata || typeof hata !== 'object') return false;
  const { name, message } = hata as { name?: unknown; message?: unknown };
  if (name === 'ChunkLoadError') return true;
  const ileti = typeof message === 'string' ? message : '';
  return (
    /Loading (CSS )?chunk [\w./-]+ failed/i.test(ileti) ||
    /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(ileti)
  );
}

export interface YenidenDenemeSecenekleri {
  /** Toplam deneme sayısı (ilk deneme dahil) */
  deneme?: number;
  /** İlk bekleme (ms); her denemede bu kadar artar */
  bekleme?: number;
  /** Testte sahte saat */
  uyu?: (ms: number) => Promise<void>;
}

export const VARSAYILAN_DENEME = 3;
export const VARSAYILAN_BEKLEME = 800;

const gercekUyu = (ms: number) => new Promise<void>((coz) => setTimeout(coz, ms));

/**
 * `yukle`yi parça hatasında yeniden dener (webpack başarısız parçayı unutur, aynı adres yeniden istenir); başka
 * hatalar (modülün kendi hatası) hemen geçer. Son hata olduğu gibi fırlatılır.
 */
export async function yenidenDeneyerekYukle<T>(yukle: () => Promise<T>, s: YenidenDenemeSecenekleri = {}): Promise<T> {
  const deneme = Math.max(1, s.deneme ?? VARSAYILAN_DENEME);
  const bekleme = s.bekleme ?? VARSAYILAN_BEKLEME;
  const uyu = s.uyu ?? gercekUyu;
  let son: unknown;
  for (let i = 0; i < deneme; i++) {
    try {
      return await yukle();
    } catch (hata) {
      son = hata;
      if (!parcaYuklemeHatasiMi(hata) || i === deneme - 1) break;
      await uyu(bekleme * (i + 1));
    }
  }
  throw son;
}

export interface OnbellekliYukleyici<T> {
  /** Süren ya da tamamlanmış yükleme; başarısızsa bir sonraki çağrı baştan dener */
  yukle: () => Promise<T>;
  /** Başarıyla yüklenmiş değer (henüz yoksa undefined) */
  hazir: () => T | undefined;
}

/** Başarılı sonucu saklayan, başarısızlığı saklamayan yükleyici (aynı anda tek istek). */
export function onbellekliYukleyici<T>(yukle: () => Promise<T>, s: YenidenDenemeSecenekleri = {}): OnbellekliYukleyici<T> {
  let deger: { v: T } | null = null;
  let suren: Promise<T> | null = null;
  return {
    yukle: () => {
      if (deger) return Promise.resolve(deger.v);
      if (!suren) {
        suren = yenidenDeneyerekYukle(yukle, s).then(
          (v) => {
            deger = { v };
            suren = null;
            return v;
          },
          (hata) => {
            suren = null;
            throw hata;
          }
        );
      }
      return suren;
    },
    hazir: () => deger?.v,
  };
}
