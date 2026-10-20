/**
 * Bağlama ait kesin giriş sınırları; beklenen sınıf aralığıyla karıştırılmaz. Birim sütun adında ("Geliş süresi (saat)")
 * ya da ayrıca verilir (ölçüm planı): geliş süresi saat cinsindense bir gün 24 saat, değilse 1440 dakikadır.
 */
export function veriGirisSiniri(ad: string, birim = ''): readonly [number, number] | null {
  const m = `${ad} ${birim}`.toLocaleLowerCase('tr');
  if (/uyku/.test(m)) return [0, 24];
  if (/nabız|nabiz/.test(m)) return [1, 250];
  if (/geliş süresi|ulaşım süresi/.test(m)) return /(^|[^a-zçğıöşü])saat([^a-zçğıöşü]|$)/.test(m) ? [0, 24] : [0, 1440];
  return null;
}

export function veriGirisHatasi(ad: string, deger: number, birim = ''): string | null {
  if (!Number.isFinite(deger)) return 'Geçerli bir sayı girin.';
  const s = veriGirisSiniri(ad, birim);
  return s && (deger < s[0] || deger > s[1])
    ? `${ad} için ${s[0]}–${s[1]} aralığında bir değer girin. Bu değer eklenmedi.`
    : null;
}
