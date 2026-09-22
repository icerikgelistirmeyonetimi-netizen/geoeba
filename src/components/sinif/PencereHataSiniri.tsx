'use client';

/**
 * Pencere içeriği için küçük hata sınırı: bir uygulama çizim sırasında hata fırlatırsa
 * (ör. bozuk localStorage kaydı) React ağacının tamamı yerine yalnız o pencere düşer; içinde
 * "Yeniden başlat" ve "Kayıtlı veriyi silip yeniden başlat" seçenekleri gösterilir. Sınıf ekranı,
 * diğer pencereler ve görev çubuğu çalışmaya devam eder.
 */
import React from 'react';

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

export class PencereHataSiniri extends React.Component<Props, State> {
  state: State = { hata: null, nesil: 0 };

  static getDerivedStateFromError(hata: Error): Partial<State> {
    return { hata };
  }

  componentDidCatch(hata: Error, bilgi: React.ErrorInfo) {
    // Geliştiriciye iz: kullanıcıya pencere içi ileti gösterildi, sayfa düşmedi
    console.error(`[GeoEBA] "${this.props.uygulamaId}" uygulaması hata verdi:`, hata, bilgi.componentStack);
  }

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

  render() {
    const { hata, nesil } = this.state;
    if (hata) {
      return (
        <div
          role="alert"
          className="flex h-full w-full flex-col items-center justify-center gap-4 bg-background p-6 text-center text-foreground"
          data-pencere-hata
        >
          <p className="font-baslik text-lg font-semibold">Uygulama bir hatayla karşılaştı</p>
          <p className="max-w-md text-[13px] text-muted-foreground">
            Pencereyi yeniden başlatabilirsiniz. Sorun sürerse kayıtlı veriyi silip örnek veriyle açın; sınıf ekranı ve diğer
            pencereler bundan etkilenmez.
          </p>
          <code className="max-w-md truncate rounded-lg bg-muted px-3 py-1 text-[13px] text-muted-foreground" title={hata.message}>
            {hata.message}
          </code>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => this.yenidenBaslat(false)}
              className="min-h-[44px] rounded-xl bg-primary px-5 text-[13px] font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Yeniden başlat
            </button>
            <button
              type="button"
              onClick={() => this.yenidenBaslat(true)}
              className="min-h-[44px] rounded-xl border border-border bg-card px-5 text-[13px] font-semibold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Kayıtlı veriyi silip yeniden başlat
            </button>
          </div>
        </div>
      );
    }
    return <React.Fragment key={nesil}>{this.props.children}</React.Fragment>;
  }
}
