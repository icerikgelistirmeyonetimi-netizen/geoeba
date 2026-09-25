/**
 * Fişsiz etkinlik materyali (A4): öğretmen yönergesi, isteğe bağlı katlanır saksı kartları ve komut
 * kartları. Yeni pencerede açılır ve yazdırma penceresi çağrılır; pencere açılamazsa HTML indirilir.
 */
import type { FissizEtkinlik, Unite } from './gorev';
import { KATEGORI_RENGI } from './BlokDuzenleyici';

const S = (d: string) => `<svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const SIMGELER: Record<string, string> = {
  'İLERİ': S('<path d="M4 12h13"/><path d="M12.5 6.5 18 12l-5.5 5.5"/>'),
  'SAĞA DÖN': S('<path d="M6 19v-6.5A5.5 5.5 0 0 1 11.5 7H18"/><path d="m14.5 3.5 3.5 3.5-3.5 3.5"/>'),
  'SOLA DÖN': S('<path d="M18 19v-6.5A5.5 5.5 0 0 0 12.5 7H6"/><path d="M9.5 3.5 6 7l3.5 3.5"/>'),
  BAK: S('<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  SULA: S('<path d="M4.5 11h9l-.8 7.2a1.6 1.6 0 0 1-1.6 1.4H6.9a1.6 1.6 0 0 1-1.6-1.4z"/><path d="M4.9 13.6C2.2 13.4 2 8 5.6 7.8c1.9-.1 3.2 1.2 3.4 3.2"/><path d="M13.3 15 19 9.2"/><path d="M17.3 7.5l3.2 3.2"/><path d="M21 13.8v.01M19.2 16.2v.01M22.1 17v.01" stroke-width="2.6"/>'),
  'ÇIKIŞA KADAR TEKRARLA': S('<path d="M17.5 8.5A6.5 6.5 0 1 0 18.5 13"/><path d="M18.8 4.8v4.2h-4.2"/><path d="M11 9.2v6.3"/><path d="M11 9.3h3.8l-1 1.4 1 1.4H11"/>'),
  'EĞER': S('<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/><path d="M10 10a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.7"/>'),
  TEKRARLA: S('<path d="M17.5 8.5A6.5 6.5 0 1 0 18.5 13"/><path d="M18.8 4.8v4.2h-4.2"/>'),
  TOPLA: S('<path d="M4.5 12.5h15l-1.6 6.2a1.6 1.6 0 0 1-1.55 1.2H7.65a1.6 1.6 0 0 1-1.55-1.2z"/><circle cx="12" cy="8" r="3.2"/><path d="M12 4.8V3.5M10.4 5.2 9.6 4.4M13.6 5.2l.8-.8"/>'),
  'GÜBRE VER': S('<path d="M7 6.5h10l1.2 12.2a1.5 1.5 0 0 1-1.5 1.8H7.3a1.5 1.5 0 0 1-1.5-1.8z"/><path d="M7.5 6.5 9 3.8h6l1.5 2.7"/><path d="M12 16.5c-2.2-1.3-2.2-4 0-5.5 2.2 1.5 2.2 4.2 0 5.5z"/><path d="M12 16.5V18"/>'),
  'KÜP KOY': S('<path d="M12 3.5 19.5 7.5v9L12 20.5 4.5 16.5v-9z"/><path d="M4.5 7.5 12 11.5l7.5-4"/><path d="M12 11.5v9"/>'),
  BOYA: S('<rect x="4.5" y="4" width="11" height="5.5" rx="1.2"/><path d="M15.5 6.8h3v4.7H12v3"/><rect x="10.8" y="14.5" width="2.4" height="5.5" rx="1"/>'),
  'TOHUM EK': S('<path d="M12 20v-6"/><path d="M12 14c-3.5 0-5-2-5-5 3 0 5 2 5 5z"/><path d="M12 14c0-3 1.5-5 5-5 0 3-1.5 5-5 5z"/><path d="M6.5 20h11"/>'),
  'NOKTA KOY': S('<circle cx="12" cy="12" r="3.2"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>'),
  'KALEMİ KALDIR': S('<path d="M4 20l1.6-4.6 8.2-8.2 3 3-8.2 8.2z"/><path d="M18.5 9V3.5M16 6l2.5-2.5L21 6"/>'),
  'KALEMİ İNDİR': S('<path d="M4 20l1.6-4.6 8.2-8.2 3 3-8.2 8.2z"/><path d="M12.5 20.5h8"/>'),
  'DEĞİŞKEN': S('<rect x="3.5" y="6.5" width="17" height="11" rx="2"/><path d="M7.5 10l4 4M11.5 10l-4 4"/><path d="M14.5 12h3"/>'),
  KOMUT: S('<path d="M8 4H6.5A2.5 2.5 0 0 0 4 6.5V10l-1.5 2L4 14v3.5A2.5 2.5 0 0 0 6.5 20H8"/><path d="M16 4h1.5A2.5 2.5 0 0 1 20 6.5V10l1.5 2-1.5 2v3.5a2.5 2.5 0 0 1-2.5 2.5H16"/><path d="M9 12h6"/>'),
  'BAŞLA': S('<rect x="2.5" y="7" width="19" height="10" rx="5"/>'),
  'BİTİR': S('<rect x="2.5" y="7" width="19" height="10" rx="5"/><path d="M9 12h6"/>'),
  'İŞLEM': S('<rect x="4" y="6" width="16" height="12" rx="1.5"/>'),
  KARAR: S('<path d="M12 3.5 20.5 12 12 20.5 3.5 12z"/>'),
  'DEĞİLSE': S('<path d="M12 20.5V13"/><path d="M12 13 6.5 7.5"/><path d="M12 13l5.5-5.5"/><path d="M6.5 11V7.5H10"/><path d="M14 7.5h3.5V11"/>'),
};

/** Fişsiz kitlerde kullanılabilecek kart adları (testler görev verisini buna göre denetler) */
export const FISSIZ_KOMUTLARI: readonly string[] = Object.keys(SIMGELER);
const RENKLER: Record<string, string> = {
  'İLERİ': KATEGORI_RENGI.hareket,
  'SAĞA DÖN': KATEGORI_RENGI.hareket,
  'SOLA DÖN': KATEGORI_RENGI.hareket,
  BAK: '#3c5a56',
  SULA: KATEGORI_RENGI.bahce,
  'ÇIKIŞA KADAR TEKRARLA': KATEGORI_RENGI.dongu,
  'EĞER': KATEGORI_RENGI.karar,
  TEKRARLA: KATEGORI_RENGI.dongu,
  TOPLA: KATEGORI_RENGI.bahce,
  'GÜBRE VER': KATEGORI_RENGI.bahce,
  'KÜP KOY': KATEGORI_RENGI.bahce,
  BOYA: KATEGORI_RENGI.bahce,
  'TOHUM EK': KATEGORI_RENGI.bahce,
  'NOKTA KOY': KATEGORI_RENGI.bahce,
  'KALEMİ KALDIR': KATEGORI_RENGI.hareket,
  'KALEMİ İNDİR': KATEGORI_RENGI.hareket,
  'DEĞİŞKEN': KATEGORI_RENGI.degisken,
  KOMUT: KATEGORI_RENGI.komut,
  'BAŞLA': '#3c5a56',
  'BİTİR': '#3c5a56',
  'İŞLEM': KATEGORI_RENGI.hareket,
  KARAR: KATEGORI_RENGI.karar,
  'DEĞİLSE': KATEGORI_RENGI.karar,
};

const kacis = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

export function fissizHtml(d: FissizEtkinlik, u: Pick<Unite, 'ad' | 'sinif' | 'ogretmenNotu'>): string {
  const saksiSayfasi = d.saksiKartlari
    ? `<section class="sayfa">
  <div class="ust"><h1>Saksı kartları</h1><div class="kunye">Kesikli çizgiden katlayın. Kartları karıştırıp yeniden dizmek genelleme için önemlidir.</div></div>
  <div class="izgara">${d.saksiKartlari
    .trim()
    .split(/\s+/)
    .map(
      (t, i) => `
    <div class="saksi">
      <div class="on">
        <svg viewBox="0 0 64 64" width="84" height="84"><path d="M14 26h36l-5 28H19z" fill="#c46a43"/><ellipse cx="32" cy="26" rx="18" ry="5" fill="#e9dcc3"/><path d="M32 24V12M32 16c-6-6-12-4-14-2 4 4 10 4 14 2zM32 14c5-6 11-5 13-3-4 4-9 4-13 3z" fill="#5c9a45" stroke="#4d8a3a" stroke-width="1.5"/></svg>
        <div class="saksi-ad">SAKSI ${i + 1}</div>
      </div>
      <div class="kat">katlayın</div>
      <div class="arka ${t.toUpperCase().startsWith('K') ? 'kuru' : 'nemli'}">${t.toUpperCase().startsWith('K') ? 'KURU' : 'NEMLİ'}</div>
    </div>`
    )
    .join('')}</div>
</section>`
    : '';
  const komutKartlari = d.kartlar
    .flatMap((k) => Array.from({ length: Math.max(1, k.adet) }, () => k))
    .map(
      (k) => `
    <div class="komut" style="background:${RENKLER[k.komut] ?? '#216a78'}">
      <div class="komut-simge">${SIMGELER[k.komut] ?? ''}</div>
      <div class="komut-ad">${kacis(k.komut)}</div>
      <div class="komut-aciklama">${kacis(k.aciklama)}</div>
    </div>`
    )
    .join('');
  // İç içe dizme notu yalnız tekrar / karar kartı olan kitlerde (1. sınıfta yalnız sıralı kartlar var)
  const icIce = d.kartlar.some((k) => /TEKRARLA|EĞER/.test(k.komut)) ? ' Tekrar ve karar kartlarının içine giren kartları altına ve biraz içeri dizin.' : '';
  return `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>${kacis(u.ad)} · Fişsiz etkinlik</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Manrope', 'Segoe UI', system-ui, sans-serif; color: #15302d; margin: 0; }
  h1 { font-family: 'Fraunces', Georgia, serif; font-weight: 600; font-size: 26px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 18px 0 6px; text-transform: uppercase; letter-spacing: .06em; color: #3c5a56; }
  p, li { font-size: 14px; line-height: 1.5; }
  .ust { border-bottom: 3px solid #2a9d94; padding-bottom: 8px; margin-bottom: 8px; }
  .kunye { font-size: 13px; color: #3c5a56; }
  .sayfa { page-break-after: always; }
  .izgara { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .saksi { border: 2px solid #15302d; border-radius: 14px; overflow: hidden; height: 88mm; display: flex; flex-direction: column; }
  .on { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
  .saksi-ad { font-weight: 800; font-size: 20px; letter-spacing: .04em; }
  .kat { border-top: 2px dashed #15302d; font-size: 10px; text-align: center; color: #3c5a56; padding: 2px; }
  .arka { flex: 1; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 28px; letter-spacing: .08em; transform: rotate(180deg); }
  .arka.kuru { background: #efe0c2; color: #8a5a2b; }
  .arka.nemli { background: #4a2f1f; color: #fbf7ee; }
  .komutlar { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .komut { color: #fff; border-radius: 16px; height: 58mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .komut-ad { font-weight: 800; font-size: 24px; letter-spacing: .04em; margin-top: 4px; }
  .komut-aciklama { font-size: 13px; opacity: .92; margin-top: 4px; }
  .arka, .saksi svg { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  ol { padding-left: 20px; }
  .saksi, .komut { break-inside: avoid; page-break-inside: avoid; }
</style></head><body>
<section class="sayfa">
  <div class="ust"><h1>${kacis(d.ad)}</h1><div class="kunye">${kacis(u.ad)} · ${u.sinif}. sınıf · Fişsiz etkinlik · ${kacis(d.sure)}</div></div>
  <h2>Amaç</h2><p>${kacis(d.amac)} ${kacis(u.ogretmenNotu.hedef)}</p>
  <h2>Roller</h2><ul>${d.roller.map((r) => `<li>${kacis(r)}</li>`).join('')}</ul>
  <h2>Akış</h2><ol>${d.adimlar.map((a) => `<li>${kacis(a)}</li>`).join('')}</ol>
  <h2>Hazırlık</h2><p>${kacis(d.hazirlik)}</p>
  <h2>Tartışma soruları</h2><ul>${u.ogretmenNotu.sorular.map((s) => `<li>${kacis(s)}</li>`).join('')}</ul>
</section>
${saksiSayfasi}
<section>
  <div class="ust"><h1>Komut kartları</h1><div class="kunye">Programcılar kartları tahtaya yukarıdan aşağıya sırayla dizer.${icIce}</div></div>
  <div class="komutlar">${komutKartlari}</div>
</section>
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 350); });</script>
</body></html>`;
}

export function fissizYazdir(d: FissizEtkinlik, u: Pick<Unite, 'ad' | 'sinif' | 'ogretmenNotu'>): void {
  const html = fissizHtml(d, u);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  // 'noopener' verilirse window.open null döner; blob adresi aynı kökenden, açılan sayfa yalnız yazdırır
  const w = window.open(url, '_blank');
  if (!w) {
    const a = document.createElement('a');
    a.href = url;
    a.download = 'algoritma-fissiz-etkinlik.html';
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
