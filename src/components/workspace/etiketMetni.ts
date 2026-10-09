/**
 * ÖLÇÜ ETİKETİNİN METNİNİ ELLE YAZMA (sağ tık > "Etiketi düzenle…", 8 Ekim 2026).
 *
 * Kullanıcı isteği: "metin labellere sağ tıklandığında düzenle butonu gelmeli; tüm eklenen metinlerde
 * düzenleme yapılabilmeli". Hesaplanan etiket (Alan = πr² ≈ 12,57 br², |AB| = 5 br, 90°…) yerine
 * öğretmenin yazdığı metin ("Alan = ?", "taban") gösterilir; nesnenin `labelTexts[kind]` alanında
 * saklanır (labelOffsets ile aynı anahtar), proje dosyasına yazılır. Metin silinince hesaplanan yazıya
 * dönülür. Yazı notları (type 'text') bu yoldan geçmez: onların kendi "Metni düzenle…" diyaloğu var.
 */

/** Ölçü etiketi tuvalde bu özniteliklerle çizilir (Canvas.olcumEtiketi). */
export interface EtiketHedefi {
  /** Etiketin sahibi nesne (çokgen kenarında çokgen, parça uzunluğunda parça) */
  objectId: string;
  /** labelOffsets / labelTexts anahtarı: 'area', 'length', 'edge0', 'angle'… */
  kind: string;
  /** Ekranda o an yazılı düz metin (diyaloğun başlangıç değeri) */
  metin: string;
}

/**
 * Elle yazılabilen etiket türleri. Yay / daire dilimi rozetleri, trigonometrik oranlar ve nokta adı
 * bu yoldan düzenlenmez (nokta adı özellikler panelinden, yay rozetleri hesaplanmış kalır).
 */
export function etiketMetniDuzenlenebilir(kind: string, nesneTuru?: string, olcumTuru?: string): boolean {
  if (kind === 'measure') return nesneTuru === 'measurement' && (olcumTuru === 'distance' || olcumTuru === 'slope');
  return kind === 'area' || kind === 'perimeter' || kind === 'radius' || kind === 'length' || kind === 'angle' || /^edge\d+$/.test(kind);
}

/**
 * Nesnenin labelTexts kaydını günceller: boş / yalnız boşluk metin anahtarı SİLER (hesaplanan yazıya dönüş);
 * hiç anahtar kalmazsa undefined (alan proje dosyasına yazılmaz).
 */
export function etiketMetniGuncelle(
  mevcut: Record<string, string> | undefined, kind: string, metin: string | null,
): Record<string, string> | undefined {
  const sonraki: Record<string, string> = { ...(mevcut ?? {}) };
  const temiz = metin?.trim() ?? '';
  if (temiz) sonraki[kind] = temiz;
  else delete sonraki[kind];
  return Object.keys(sonraki).length ? sonraki : undefined;
}

/** Sağ tıklanan DOM düğümünden ölçü etiketini bulur (data-label-* öznitelikleri); etiket değilse null. */
export function etiketHedefiniBul(el: Element | null | undefined): EtiketHedefi | null {
  const g = el?.closest?.('[data-label-kind]');
  if (!g) return null;
  const kind = g.getAttribute('data-label-kind');
  const objectId = g.getAttribute('data-label-object');
  if (!kind || !objectId) return null;
  return { objectId, kind, metin: g.getAttribute('data-label-text') ?? '' };
}
