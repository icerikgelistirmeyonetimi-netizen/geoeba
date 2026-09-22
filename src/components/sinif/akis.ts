/**
 * Sınıf ekranı akışı — saf durum makinesi ve zamanlamalar.
 *
 * Fazlar (SinifEkrani.tsx bu sırayla geçer):
 *   yukleniyor → yaklasma → devir → acilis → masaustu ⇄ uygulama
 * 3B yol kullanılamıyorsa (WebGL2 yok, model inmedi, motor hatası) yukleniyor → acilis.
 * "Atla" her fazdan doğrudan masaüstüne götürür. Açılış ekranı yaklaşmayla örtüşür:
 * ekran yaklaşma başında koyudur, ACILIS_LOGO_GECIKME sonra logo belirir.
 *
 * Masaüstünde birden çok uygulama penceresi açık olabilir (uygulamalar.tsx kayıt defteri).
 * `pencereler` z sırasına göre tutulur: son eleman öndedir. 'uygulama' fazı en az bir
 * pencere görünürken, 'masaustu' fazı hiçbir pencere görünmezken geçerlidir.
 */

export type Faz = 'yukleniyor' | 'yaklasma' | 'devir' | 'acilis' | 'masaustu' | 'uygulama';

export type PencereDurumu = 'kapali' | 'acik' | 'kucuk';

/** Ekran katmanının gösterdiği içerik (3B tahtada ya da tam ekranda). */
export type EkranIcerigi = 'karanlik' | 'acilis' | 'masaustu';

export interface PencereKonumu {
  x: number;
  y: number;
}

export interface PencereKaydi {
  /** Uygulama kimliği (kayıt defterindeki manifest.id) */
  id: string;
  /** 'acik' görünür, 'kucuk' görev çubuğuna küçültülmüş (bağlı kalır) */
  durum: Exclude<PencereDurumu, 'kapali'>;
  /** Büyütülmüş: görev çubuğunun üstündeki alanı doldurur */
  buyuk: boolean;
  /** Geri alınmış pencerenin sürüklenmiş konumu (px, çalışma alanına göre); null: varsayılan yerleşim */
  konum: PencereKonumu | null;
  /** Açılış sırası (0'dan); geri alınmış varsayılan yerleşimin kaydırması bundan türetilir */
  sira: number;
}

export interface AkisDurumu {
  faz: Faz;
  /** 3B sahne katmanı kullanılıyor mu (false: doğrudan tam ekran açılış) */
  ucBoyut: boolean;
  ekran: EkranIcerigi;
  /** Açık ve küçültülmüş pencereler, z sırasına göre (son eleman öndedir) */
  pencereler: PencereKaydi[];
  /** Toplam pencere açılış sayısı (yeni pencerelerin `sira`sı) */
  acilisSayaci: number;
  baslatMenusu: boolean;
  /** Masaüstü ilk belirdiğinde Çizim Stüdyosu bir kez kendiliğinden açılır */
  otomatikAcildi: boolean;
}

export type AkisOlayi =
  | { tur: 'MODEL_YUKLENDI' }
  | { tur: 'UCBOYUT_YOK' }
  | { tur: 'ACILIS_LOGO' }
  | { tur: 'KAMERA_VARDI' }
  | { tur: 'DEVIR_BITTI' }
  | { tur: 'ACILIS_BITTI' }
  | { tur: 'ATLA' }
  /** Pencereyi açar; açıksa/küçükse öne getirir */
  | { tur: 'PENCERE_AC'; id: string }
  /** Öne getirir (tıklama/odak); küçükse geri getirir */
  | { tur: 'PENCERE_ODAK'; id: string }
  | { tur: 'PENCERE_KUCULT'; id: string }
  | { tur: 'PENCERE_KAPAT'; id: string }
  /** Büyüt / geri al; `buyuk` verilmezse tersine çevirir */
  | { tur: 'PENCERE_BUYUT'; id: string; buyuk?: boolean }
  /** Geri alınmış pencere sürüklendi (çalışma alanına göre px) */
  | { tur: 'PENCERE_TASI'; id: string; konum: PencereKonumu }
  | { tur: 'BASLAT_MENUSU'; acik: boolean };

/** Süreler (ms); tek yerde tutulur, bileşenler ve testler buradan okur. */
export const SURELER = {
  /** Perde açılırken kameranın durağan kaldığı süre */
  GIRIS_DURAGAN: 400,
  /** Arka sıradan tahtanın karşısına yürüyüş */
  YAKLASMA: 3400,
  /** Tıklama/tuşla yaklaşmanın hızlı bitişi (üst sınır) */
  HIZLI_BITIS: 400,
  /** Ekran dörtgeninin tüm görünüm alanına büyümesi */
  DEVIR: 450,
  /** 3B katmanın solması (devirle birlikte başlar) */
  UCBOYUT_SOLMA: 350,
  /** Yaklaşma başladıktan sonra açılış logosunun belirmesi */
  ACILIS_LOGO_GECIKME: 600,
  /** Devir bittikten sonra açılışın sürmesi */
  ACILIS_DEVIR_SONRASI: 500,
  /** 3B'siz yolda açılış ekranının toplam süresi */
  ACILIS_TAM_EKRAN: 2200,
  /** Masaüstü belirdikten sonra pencerenin kendiliğinden açılması */
  OTOMATIK_PENCERE: 500,
  /** Pencerenin görev çubuğundaki yuvasından (uygulama düğmesi) huni gibi genişleyerek çıkması */
  PENCERE_ACILIS: 460,
  /** Pencerenin daralarak görev çubuğundaki yuvasına çekilmesi */
  PENCERE_KUCULTME: 400,
  /** Kapanışta hafif çekilme + solma */
  PENCERE_KAPANIS: 160,
  /** Büyüt / geri al: eski dikdörtgenden yenisine kayma */
  PENCERE_BOYUT: 260,
  /** Sınıftan çıkış perdesi */
  CIKIS_PERDESI: 380,
} as const;

/** Geri alınmış pencere yerleşimi: çalışma alanının %84'ü, ortalanmış; her yeni pencere 32 px kayar. */
export const PENCERE_YERLESIM = {
  /** Geri alınmış pencerenin çalışma alanına oranı (genişlik ve yükseklik) */
  ORAN: 0.84,
  /** Ardışık pencereler arasındaki kaydırma (px) */
  KAYDIRMA: 32,
  /** Kaydırma bu kadar pencereden sonra başa döner (alanın dışına taşmasın) */
  DONGU: 4,
} as const;

export const BASLANGIC_DURUMU: AkisDurumu = {
  faz: 'yukleniyor',
  ucBoyut: true,
  ekran: 'karanlik',
  pencereler: [],
  acilisSayaci: 0,
  baslatMenusu: false,
  otomatikAcildi: false,
};

/** Masaüstünün göründüğü fazlar (görev çubuğu, kısayol, pencere). */
export function masaustunde(faz: Faz): boolean {
  return faz === 'masaustu' || faz === 'uygulama';
}

/** Atla düğmesinin göründüğü fazlar. */
export function atlanabilir(faz: Faz): boolean {
  return !masaustunde(faz);
}

/** Pencere kaydı (yoksa null). */
export function pencereKaydi(d: AkisDurumu, id: string): PencereKaydi | null {
  return d.pencereler.find((p) => p.id === id) ?? null;
}

/** Uygulamanın pencere durumu: kayıt yoksa 'kapali'. */
export function pencereDurumu(d: AkisDurumu, id: string): PencereDurumu {
  return pencereKaydi(d, id)?.durum ?? 'kapali';
}

/** Öndeki (odaklı) görünür pencere; hiçbiri görünür değilse null. */
export function ondekiPencere(d: AkisDurumu): PencereKaydi | null {
  for (let i = d.pencereler.length - 1; i >= 0; i--) {
    if (d.pencereler[i].durum === 'acik') return d.pencereler[i];
  }
  return null;
}

/** Pencerenin yığın sırası (1'den; büyük olan öndedir). Kayıt yoksa 0. */
export function pencereKatmani(d: AkisDurumu, id: string): number {
  return d.pencereler.findIndex((p) => p.id === id) + 1;
}

export interface Dikdortgen {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Geri alınmış pencerenin varsayılan yerleşimi: alanın %84'ü, ortalanmış, `sira`ya göre 32 px
 * kaydırılmış (DONGU pencerede bir başa döner). Sonuç her zaman alanın içinde kalır.
 */
export function geriDikdortgeni(sira: number, alanW: number, alanH: number): Dikdortgen {
  const w = Math.round(Math.max(0, alanW) * PENCERE_YERLESIM.ORAN);
  const h = Math.round(Math.max(0, alanH) * PENCERE_YERLESIM.ORAN);
  const kaydirma = (((sira % PENCERE_YERLESIM.DONGU) + PENCERE_YERLESIM.DONGU) % PENCERE_YERLESIM.DONGU) * PENCERE_YERLESIM.KAYDIRMA;
  const merkezX = Math.round((alanW - w) / 2);
  const merkezY = Math.round((alanH - h) / 2);
  const { x, y } = pencereSinirla({ x: merkezX + kaydirma, y: merkezY + kaydirma }, w, h, alanW, alanH);
  return { x, y, w, h };
}

/** Pencereyi çalışma alanının içinde tutar (sürükleme sınırı). */
export function pencereSinirla(konum: PencereKonumu, w: number, h: number, alanW: number, alanH: number): PencereKonumu {
  const maxX = Math.max(0, alanW - w);
  const maxY = Math.max(0, alanH - h);
  return {
    x: Math.min(maxX, Math.max(0, Math.round(konum.x))),
    y: Math.min(maxY, Math.max(0, Math.round(konum.y))),
  };
}

function masaustuneGec(d: AkisDurumu): AkisDurumu {
  return { ...d, faz: 'masaustu', ekran: 'masaustu', ucBoyut: false };
}

/** Pencere listesi değişince faz (uygulama/masaustu) yeniden türetilir. */
function pencerelerle(d: AkisDurumu, pencereler: PencereKaydi[], ek: Partial<AkisDurumu> = {}): AkisDurumu {
  const gorunur = pencereler.some((p) => p.durum === 'acik');
  return { ...d, ...ek, pencereler, faz: gorunur ? 'uygulama' : 'masaustu' };
}

function oneGetir(pencereler: PencereKaydi[], kayit: PencereKaydi): PencereKaydi[] {
  return [...pencereler.filter((p) => p.id !== kayit.id), kayit];
}

export function akisIndirgeyici(d: AkisDurumu, olay: AkisOlayi): AkisDurumu {
  switch (olay.tur) {
    case 'MODEL_YUKLENDI':
      if (d.faz !== 'yukleniyor') return d;
      return { ...d, faz: 'yaklasma', ucBoyut: true, ekran: 'karanlik' };

    case 'UCBOYUT_YOK':
      // Model inmedi ya da motor yok: 3B katman kalkar, açılış tam ekranda başlar
      if (d.faz === 'yukleniyor' || d.faz === 'yaklasma' || d.faz === 'devir') {
        return { ...d, faz: 'acilis', ucBoyut: false, ekran: 'acilis' };
      }
      return d;

    case 'ACILIS_LOGO':
      if (d.faz === 'yaklasma' || d.faz === 'devir') return { ...d, ekran: 'acilis' };
      return d;

    case 'KAMERA_VARDI':
      if (d.faz !== 'yaklasma') return d;
      return { ...d, faz: 'devir', ekran: 'acilis' };

    case 'DEVIR_BITTI':
      if (d.faz !== 'devir') return d;
      // Devir bitince 3B sahne söküldü; açılış tam ekranda sürer
      return { ...d, faz: 'acilis', ucBoyut: false, ekran: 'acilis' };

    case 'ACILIS_BITTI':
      if (d.faz !== 'acilis') return d;
      return masaustuneGec(d);

    case 'ATLA':
      if (masaustunde(d.faz)) return d;
      return masaustuneGec(d);

    case 'PENCERE_AC': {
      if (!masaustunde(d.faz)) return d;
      const var_ = pencereKaydi(d, olay.id);
      if (var_) {
        // Zaten açık ve öndeyse yalnız menü kapanır (odak bileşen tarafında yenilenir)
        const kayit: PencereKaydi = var_.durum === 'acik' ? var_ : { ...var_, durum: 'acik' };
        const onde = ondekiPencere(d);
        if (kayit === var_ && onde?.id === var_.id && !d.baslatMenusu) return d;
        return pencerelerle(d, oneGetir(d.pencereler, kayit), { baslatMenusu: false, otomatikAcildi: true });
      }
      const yeni: PencereKaydi = { id: olay.id, durum: 'acik', buyuk: true, konum: null, sira: d.acilisSayaci };
      return pencerelerle(d, [...d.pencereler, yeni], {
        baslatMenusu: false,
        otomatikAcildi: true,
        acilisSayaci: d.acilisSayaci + 1,
      });
    }

    case 'PENCERE_ODAK': {
      const kayit = pencereKaydi(d, olay.id);
      if (!kayit) return d;
      if (kayit.durum === 'acik' && ondekiPencere(d)?.id === kayit.id && d.pencereler[d.pencereler.length - 1] === kayit) return d;
      const acik: PencereKaydi = kayit.durum === 'acik' ? kayit : { ...kayit, durum: 'acik' };
      return pencerelerle(d, oneGetir(d.pencereler, acik));
    }

    case 'PENCERE_KUCULT': {
      const kayit = pencereKaydi(d, olay.id);
      if (!kayit || kayit.durum !== 'acik') return d;
      // Küçültülen pencere yığının en arkasına gider: kalan açık pencerelerden sonuncusu öne çıkar
      const kucuk: PencereKaydi = { ...kayit, durum: 'kucuk' };
      return pencerelerle(d, [kucuk, ...d.pencereler.filter((p) => p.id !== kayit.id)]);
    }

    case 'PENCERE_KAPAT': {
      if (!pencereKaydi(d, olay.id)) return d;
      return pencerelerle(
        d,
        d.pencereler.filter((p) => p.id !== olay.id)
      );
    }

    case 'PENCERE_BUYUT': {
      const kayit = pencereKaydi(d, olay.id);
      if (!kayit) return d;
      const buyuk = olay.buyuk ?? !kayit.buyuk;
      if (buyuk === kayit.buyuk) return d;
      return { ...d, pencereler: d.pencereler.map((p) => (p.id === kayit.id ? { ...p, buyuk } : p)) };
    }

    case 'PENCERE_TASI': {
      const kayit = pencereKaydi(d, olay.id);
      if (!kayit) return d;
      if (kayit.konum && kayit.konum.x === olay.konum.x && kayit.konum.y === olay.konum.y) return d;
      return { ...d, pencereler: d.pencereler.map((p) => (p.id === kayit.id ? { ...p, konum: { ...olay.konum } } : p)) };
    }

    case 'BASLAT_MENUSU':
      if (!masaustunde(d.faz)) return d;
      if (d.baslatMenusu === olay.acik) return d;
      return { ...d, baslatMenusu: olay.acik };

    default:
      return d;
  }
}
