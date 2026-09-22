/**
 * Görev çubuğu saati — saf metin üreticileri (Intl 'tr-TR').
 *   saatMetni  → "09:05"  (24 saat)
 *   tarihMetni → "21 Eylül 2026 Pazartesi"
 */

const YEREL = 'tr-TR';

let saatBicimi: Intl.DateTimeFormat | null = null;
let tarihBicimi: Intl.DateTimeFormat | null = null;

export function saatMetni(tarih: Date): string {
  saatBicimi ??= new Intl.DateTimeFormat(YEREL, { hour: '2-digit', minute: '2-digit', hour12: false });
  // Bazı ortamlarda 24 saat gösterimi "24:05" üretir; gece yarısı "00" olarak düzeltilir
  return saatBicimi.format(tarih).replace(/^24:/, '00:');
}

export function tarihMetni(tarih: Date): string {
  tarihBicimi ??= new Intl.DateTimeFormat(YEREL, { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  return tarihBicimi.format(tarih);
}

/** Bir sonraki tam dakikaya kalan süre (ms); saat güncellemeleri dakika sınırına hizalanır. */
export function sonrakiDakikayaKalan(simdi: Date): number {
  return 60000 - (simdi.getSeconds() * 1000 + simdi.getMilliseconds());
}
