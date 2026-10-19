'use client';

/**
 * Pencere içeriği için küçük hata sınırı: bir uygulama çizim sırasında hata fırlatırsa
 * (ör. bozuk localStorage kaydı) React ağacının tamamı yerine yalnız o pencere düşer; içinde
 * "Yeniden başlat" ve "Kayıtlı veriyi silip yeniden başlat" seçenekleri gösterilir. Sınıf ekranı,
 * diğer pencereler ve görev çubuğu çalışmaya devam eder.
 *
 * Uygulama dosyası (JS parçası) yüklenemediyse (yeni yayın sonrası eski parça 404, ağ kopması; tembelYukleme.ts)
 * kayıtlı veri suçlu değildir: ileti bunu söyler, veri silme seçeneği gösterilmez; "Yeniden dene" parçayı yeniden
 * ister (yükleyici başarısız denemeyi saklamaz), "Sayfayı yenile" güncel yayını açar. Bağlantı geri gelince
 * (online olayı) kendiliğinden yeniden denenir.
 */
import React from 'react';
import { parcaYuklemeHatasiMi } from './tembelYukleme';

interface Props {
  /** Uygulama kimliği; sözleşme gereği kayıt anahtarı 'geoeba_<kimlik>_v1' */
  uygulamaId: string;
  children: React.ReactNode;
}

interface State {
  hata: Error | null;
  /** Her artışta içerik yeniden bağlanır */
  nesil: number;
}

export function depoAnahtari(uygulamaId: string): string {
  return `geoeba_${uygulamaId}_v1`;
}

/** Hata sınırının gösterdiği ileti: parça (dosya) yükleme hatası ile uygulama hatası ayrı anlatılır. */
export function hataIletisi(hata: unknown): { baslik: string; aciklama: string; parca: boolean } {
  if (parcaYuklemeHatasiMi(hata))
    return {
      parca: true,
      baslik: 'Uygulama dosyaları yüklenemedi',
      aciklama:
        'İnternet bağlantısı kesilmiş ya da uygulamanın yeni sürümü yayımlanmış olabilir. Önce yeniden deneyin; olmazsa sayfayı yenileyince güncel sürüm açılır. Kayıtlı veriniz silinmez.',
    };
  return {
    parca: false,
    baslik: 'Uygulama bir hatayla karşılaştı',
    aciklama:
      'Pencereyi yeniden başlatabilirsiniz. Sorun sürerse kayıtlı veriyi silip örnek veriyle açın; sınıf ekranı ve diğer pencereler bundan etkilenmez.',
  };
}

export class PencereHataSiniri extends React.Component<Props, State> {
  state: State = { hata: null, nesil: 0 };

  static getDerivedStateFromError(hata: Error): Partial<State> {
    return { hata };
  }

  componentDidCatch(hata: Error, bilgi: React.ErrorInfo) {
    // Geliştiriciye iz: kullanıcıya pencere içi ileti gösterildi, sayfa düşmedi
    if (parcaYuklemeHatasiMi(hata)) {
      console.error(`[EBA Matematik] "${this.props.uygulamaId}" uygulamasının dosyası yüklenemedi (yeni yayın ya da ağ):`, hata.message);
    } else {
      console.error(`[EBA Matematik] "${this.props.uygulamaId}" uygulaması hata verdi:`, hata, bilgi.componentStack);
    }
  }

  componentDidMount() {
    window.addEventListener('online', this.cevrimici);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.cevrimici);
  }

  /** Bağlantı geri geldi: parça hatasında pencere kendiliğinden yeniden dener */
  cevrimici = () => {
    if (this.state.hata && parcaYuklemeHatasiMi(this.state.hata)) this.yenidenBaslat(false);
  };

  yenidenBaslat = (kaydiSil: boolean) => {
    if (kaydiSil) {
      try {
        window.localStorage.removeItem(depoAnahtari(this.props.uygulamaId));
      } catch {
        /* depo kapalı olabilir */
      }
    }
    this.setState((s) => ({ hata: null, nesil: s.nesil + 1 }));
  };

  sayfayiYenile = () => {
    window.location.reload();
  };

  render() {
    const { hata, nesil } = this.state;
    if (hata) {
      const ileti = hataIletisi(hata);
      const birincil =
        'min-h-[44px] rounded-xl bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
      const ikincil =
        'min-h-[44px] rounded-xl border border-border bg-card px-5 text-[13px] font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
      return (
        <div
          role="alert"
          className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground"
          data-pencere-hata={ileti.parca ? 'parca' : 'uygulama'}
        >
          <p className="font-baslik text-lg font-semibold">{ileti.baslik}</p>
          <p className="max-w-md text-[13px] text-muted-foreground">{ileti.aciklama}</p>
          <code className="max-w-md truncate rounded-lg bg-muted px-3 py-1 text-[13px] text-muted-foreground" title={hata.message}>
            {hata.message}
          </code>
          <div className="flex flex-wrap justify-center gap-3">
            {ileti.parca ? (
              <>
                <button type="button" onClick={() => this.yenidenBaslat(false)} className={birincil}>
                  Yeniden dene
                </button>
                <button type="button" onClick={this.sayfayiYenile} className={ikincil}>
                  Sayfayı yenile
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => this.yenidenBaslat(false)} className={birincil}>
                  Yeniden başlat
                </button>
                <button type="button" onClick={() => this.yenidenBaslat(true)} className={ikincil}>
                  Kayıtlı veriyi silip yeniden başlat
                </button>
              </>
            )}
          </div>
        </div>
      );
    }
    return <React.Fragment key={nesil}>{this.props.children}</React.Fragment>;
  }
}
