/** Bağlama ait kesin giriş sınırları; beklenen sınıf aralığıyla karıştırılmaz. */
export function veriGirisSiniri(ad: string): readonly [number, number] | null {
  const m = ad.toLocaleLowerCase('tr');
  if (/uyku/.test(m)) return [0, 24];
  if (/nabız|nabiz/.test(m)) return [1, 250];
  if (/geliş süresi|ulaşım süresi/.test(m)) return [0, 1440];
  return null;
}

export function veriGirisHatasi(ad: string, deger: number): string | null {
  if (!Number.isFinite(deger)) return 'Geçerli bir sayı girin.';
  const s = veriGirisSiniri(ad);
  return s && (deger < s[0] || deger > s[1])
    ? `${ad} için ${s[0]}–${s[1]} aralığında bir değer girin. Bu değer eklenmedi.`
    : null;
}
