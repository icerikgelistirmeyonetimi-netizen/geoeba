import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/state/ThemeContext';
import { CurriculumProvider } from '@/state/CurriculumContext';
import { WorkspaceProvider } from '@/state/WorkspaceContext';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'GeoEBA - Etkileşimli Matematik ve Geometri Platformu',
  description:
    'İlkokul, ortaokul ve lise düzeyinde etkileşimli matematik, geometri ve 3D simülasyon platformu.',
};

/**
 * İlk boyamadan ÖNCE çalışan engelleyici tema betiği (koyu tema kullanıcılarında
 * açık tema "parlamasını" önler). LocalStorage anahtarı ThemeContext.tsx'teki
 * THEME_STORAGE_KEY ('matematik_tema_tercihi_v1') ile aynı olmalıdır.
 */
const THEME_INIT_SCRIPT = `(function(){try{var k='matematik_tema_tercihi_v1';var t=null;try{t=localStorage.getItem(k)}catch(e){}var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;if(d){r.classList.add('dark')}else{r.classList.remove('dark')}r.style.colorScheme=d?'dark':'light'}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
        <ThemeProvider>
          <CurriculumProvider>
            <WorkspaceProvider>
              <div className="flex flex-col min-h-screen bg-background">
                <Header />
                <main className="flex-1 flex flex-col min-h-0 min-w-0 bg-background relative">{children}</main>
              </div>
            </WorkspaceProvider>
          </CurriculumProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
