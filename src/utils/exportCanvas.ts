/**
 * Tuvali görsel, PDF ve Word olarak dışa aktarma.
 *
 * Tuval bir SVG olduğu için önce XML'e serileştirilip bir <img>'e yüklenir,
 * sonra <canvas> üzerine çizilerek PNG'ye dönüştürülür. Böylece yazı tipleri,
 * ölçüm etiketleri ve renkler ekrandaki gibi korunur.
 */

/** Dosya adında kullanılamayacak karakterleri temizler. */
function guvenliAd(ad: string): string {
  const temiz = ad.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-');
  return temiz === '' ? 'geoeba-cizim' : temiz;
}

/** Saydam SVG'nin ekranda görünen zeminini üst elemanlardan devral. */
export function canvasBackground(svg: SVGSVGElement): string {
  for (let el: Element | null = svg; el; el = el.parentElement) {
    const color = getComputedStyle(el).backgroundColor;
    if (color && color !== 'transparent' && !/rgba\([^)]*,\s*0\s*\)/.test(color)) return color;
  }
  return '#ffffff';
}

/** Bir Blob'u veya veri URL'sini indirir. */
function indir(veri: Blob | string, dosyaAdi: string) {
  const url = typeof veri === 'string' ? veri : URL.createObjectURL(veri);
  const a = document.createElement('a');
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  a.remove();
  if (typeof veri !== 'string') {
    // Tarayıcının indirmeyi başlatmasına zaman tanı
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

/**
 * SVG düğümünü, ekrandaki görünümüyle bir PNG veri URL'sine dönüştürür.
 * @param olcek 1 = ekran çözünürlüğü, 2 = iki kat (baskı için daha net)
 */
export async function svgToPngDataUrl(
  svg: SVGSVGElement,
  options: { olcek?: number; arkaPlan?: string } = {}
): Promise<{ dataUrl: string; genislik: number; yukseklik: number }> {
  const olcek = options.olcek ?? 2;
  const rect = svg.getBoundingClientRect();
  const genislik = Math.max(1, Math.round(rect.width));
  const yukseklik = Math.max(1, Math.round(rect.height));

  // Kopya üzerinde çalış: canlı tuvale dokunmadan boyut ve arka plan eklenir
  const kopya = svg.cloneNode(true) as SVGSVGElement;
  kopya.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  kopya.setAttribute('width', String(genislik));
  kopya.setAttribute('height', String(yukseklik));
  kopya.setAttribute('viewBox', `0 0 ${genislik} ${yukseklik}`);

  // Tailwind sınıflarıyla gelen renkler dışa aktarımda kaybolur; hesaplanmış
  // renkleri satır içi stile kopyalayarak çıktıyı ekrandakine eşitliyoruz.
  const kaynakOgeler = svg.querySelectorAll<SVGElement>('*');
  const kopyaOgeler = kopya.querySelectorAll<SVGElement>('*');
  for (let i = 0; i < kaynakOgeler.length && i < kopyaOgeler.length; i++) {
    // Süzgeç/gradyan tanımları çizilmez; hesaplanmış stil yazmak tanımı bozar
    if (kaynakOgeler[i].closest('defs')) continue;
    const cs = window.getComputedStyle(kaynakOgeler[i]);
    const hedef = kopyaOgeler[i];
    hedef.style.fill = cs.fill;
    hedef.style.stroke = cs.stroke;
    hedef.style.strokeWidth = cs.strokeWidth;
    hedef.style.fontFamily = cs.fontFamily;
    hedef.style.fontSize = cs.fontSize;
    hedef.style.fontWeight = cs.fontWeight;
    if (cs.opacity !== '1') hedef.style.opacity = cs.opacity;
    if (cs.display === 'none') hedef.style.display = 'none';
  }

  // Açık ölçme aracı (cetvel, açıölçer, gönye, alan modeli) çizimin parçası değil: çıktıya girmesin.
  // Stil kopyalama döngüsünden SONRA silinir; yoksa kaynak/kopya dizinleri kayar.
  kopya.querySelectorAll('[data-olcme-araci]').forEach((el) => el.remove());

  const xml = new XMLSerializer().serializeToString(kopya);
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Çizim görüntüye dönüştürülemedi.'));
    img.src = svgUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = genislik * olcek;
  canvas.height = yukseklik * olcek;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tarayıcı 2D çizim bağlamı vermedi.');
  ctx.fillStyle = options.arkaPlan ?? canvasBackground(svg);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return { dataUrl: canvas.toDataURL('image/png'), genislik, yukseklik };
}

/**
 * Tuvali, dışa aktarıma hazır BAĞIMSIZ bir SVG dizesine çevirir.
 * Tailwind sınıflarından gelen renkler hesaplanıp satır içi stile yazılır; böylece
 * dosya, uygulamanın CSS'i olmadan da ekrandaki gibi görünür.
 */
export function svgToStandaloneXml(svg: SVGSVGElement): { xml: string; genislik: number; yukseklik: number } {
  const rect = svg.getBoundingClientRect();
  const genislik = Math.max(1, Math.round(rect.width));
  const yukseklik = Math.max(1, Math.round(rect.height));

  const kopya = svg.cloneNode(true) as SVGSVGElement;
  kopya.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  kopya.setAttribute('width', String(genislik));
  kopya.setAttribute('height', String(yukseklik));
  kopya.setAttribute('viewBox', `0 0 ${genislik} ${yukseklik}`);

  const kaynak = svg.querySelectorAll<SVGElement>('*');
  const hedefler = kopya.querySelectorAll<SVGElement>('*');
  for (let i = 0; i < kaynak.length && i < hedefler.length; i++) {
    // Süzgeç/gradyan tanımları çizilmez; hesaplanmış stil yazmak tanımı bozar
    if (kaynak[i].closest('defs')) continue;
    const cs = window.getComputedStyle(kaynak[i]);
    const h = hedefler[i];
    h.style.fill = cs.fill;
    h.style.stroke = cs.stroke;
    h.style.strokeWidth = cs.strokeWidth;
    h.style.fontFamily = cs.fontFamily;
    h.style.fontSize = cs.fontSize;
    h.style.fontWeight = cs.fontWeight;
    if (cs.opacity !== '1') h.style.opacity = cs.opacity;
    if (cs.display === 'none') h.style.display = 'none';
    // Sınıf adları dışa aktarımda anlamsız; dosyayı da şişirirler
    h.removeAttribute('class');
  }
  kopya.removeAttribute('class');

  // Açık ölçme aracı çizimin parçası değil (stil döngüsünden sonra silinir: dizinler kaymasın)
  kopya.querySelectorAll('[data-olcme-araci]').forEach((el) => el.remove());

  // Yazı ve zemin aynı temadan gelmeli; koyu temanın açık yazılarını beyaza basma.
  const zemin = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  zemin.setAttribute('x', '0');
  zemin.setAttribute('y', '0');
  zemin.setAttribute('width', String(genislik));
  zemin.setAttribute('height', String(yukseklik));
  zemin.setAttribute('fill', canvasBackground(svg));
  kopya.insertBefore(zemin, kopya.firstChild);

  return { xml: new XMLSerializer().serializeToString(kopya), genislik, yukseklik };
}

/** Uygulama kabuğu yerine bağımsız, sayfaya sığan çizimi yazdırır. */
export function printSvg(svg: SVGSVGElement): void {
  const { xml, genislik, yukseklik } = svgToStandaloneXml(svg);
  const frame = document.createElement('iframe');
  frame.title = 'Çizimi yazdır';
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) { frame.remove(); throw new Error('Yazdırma görünümü açılamadı.'); }
  frame.onload = () => {
    frame.contentWindow?.addEventListener('afterprint', () => frame.remove(), { once: true });
    frame.contentWindow?.focus(); frame.contentWindow?.print();
  };
  doc.open();
  doc.write(`<!doctype html><html lang="tr"><head><title>GeoEBA Çizimi</title><style>@page{size:A4 ${genislik > yukseklik ? 'landscape' : 'portrait'};margin:10mm}body{margin:0}svg{display:block;width:100%;height:auto;max-height:95vh;print-color-adjust:exact;-webkit-print-color-adjust:exact}</style></head><body>${xml}</body></html>`);
  doc.close();
  window.setTimeout(() => frame.remove(), 120_000);
}

/** Çizimi PNG olarak indirir. */
export async function exportPng(svg: SVGSVGElement, baslik = 'geoeba-cizim') {
  const { dataUrl } = await svgToPngDataUrl(svg);
  indir(dataUrl, `${guvenliAd(baslik)}.png`);
}

/** Çizimi SVG olarak indirir (vektörel, sonsuz büyütülebilir). */
export function exportSvg(svg: SVGSVGElement, baslik = 'geoeba-cizim') {
  // Ham kopya yerine BAĞIMSIZ sürüm: Tailwind sınıflarından gelen renkler satır içi
  // stile yazılır. Aksi hâlde dosya uygulamanın CSS'i olmadan açıldığında (tarayıcı,
  // Inkscape, Office) ızgara ve şekil renkleri kayboluyordu.
  const { xml } = svgToStandaloneXml(svg);
  indir(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }), `${guvenliAd(baslik)}.svg`);
}

/** Çizimi tek sayfalık PDF olarak indirir (yatay/dikey otomatik seçilir). */
export async function exportPdf(svg: SVGSVGElement, baslik = 'geoeba-cizim') {
  const { dataUrl, genislik, yukseklik } = await svgToPngDataUrl(svg, { olcek: 2 });
  // jsPDF yalnızca gerektiğinde yüklenir: ilk açılış paketini şişirmez
  const { jsPDF } = await import('jspdf');
  const yatay = genislik >= yukseklik;
  const pdf = new jsPDF({ orientation: yatay ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });

  const sayfaG = pdf.internal.pageSize.getWidth();
  const sayfaY = pdf.internal.pageSize.getHeight();
  const kenar = 10;
  const basligaAyrilan = 12;
  const kullanilabilirG = sayfaG - kenar * 2;
  const kullanilabilirY = sayfaY - kenar * 2 - basligaAyrilan;

  // En-boy oranını koruyarak sayfaya sığdır
  const oran = Math.min(kullanilabilirG / genislik, kullanilabilirY / yukseklik);
  const g = genislik * oran;
  const y = yukseklik * oran;

  pdf.setFontSize(13);
  pdf.text(baslik, kenar, kenar + 6);
  pdf.addImage(dataUrl, 'PNG', kenar + (kullanilabilirG - g) / 2, kenar + basligaAyrilan, g, y);
  pdf.save(`${guvenliAd(baslik)}.pdf`);
}

/** PNG veri URL'sini ham bayt dizisine çevirir (docx'e gömmek için). */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const virgul = dataUrl.indexOf(',');
  if (virgul < 0) throw new Error('Görsel verisi okunamadı (geçersiz data URL).');
  const govde = dataUrl.slice(virgul + 1);
  // toDataURL her zaman base64 üretir; yine de yüzde kodlu biçimi de karşılayalım
  if (!/;base64/i.test(dataUrl.slice(0, virgul))) {
    return new TextEncoder().encode(decodeURIComponent(govde));
  }
  const ikili = atob(govde);
  const bytes = new Uint8Array(ikili.length);
  for (let i = 0; i < ikili.length; i++) bytes[i] = ikili.charCodeAt(i);
  return bytes;
}

/** SVG metnini docx'in beklediği bayt dizisine çevirir. */
function xmlToBytes(xml: string): Uint8Array {
  return new TextEncoder().encode(xml);
}

/**
 * Çizimi GERÇEK bir .docx (Office Open XML) belgesi olarak indirir.
 *
 * Çizim VEKTÖR (SVG) olarak gömülür. SVG ve "Şekle Dönüştür" desteği Microsoft 365,
 * Office 2021/2019 ve güncel Office 2016 sürümlerinde vardır; Office 2013 ve öncesi
 * bunu tanımaz ve belgeye birlikte konan PNG kopyasını gösterir.
 * Böylece:
 *  - görsel büyütülünce bulanıklaşmaz,
 *  - kullanıcı Word'de görsele sağ tıklayıp "Şekle Dönüştür" diyerek her parçayı
 *    (doğru, çember, yazı) ayrı ayrı düzenlenebilir Word şekline çevirebilir.
 * Eski Word sürümleri için aynı çizimin PNG yedeği de belgeye konur; Word hangisini
 * destekliyorsa onu gösterir.
 *
 * NOT: Önceki sürüm base64 gömülü HTML .doc üretiyordu; Word bu biçimdeki `data:` URI
 * görsellerini göstermediği için çizim boş çıkıyordu.
 */
export async function exportWord(svg: SVGSVGElement, baslik = 'geoeba-cizim') {
  const { xml, genislik, yukseklik } = svgToStandaloneXml(svg);
  const { dataUrl } = await svgToPngDataUrl(svg, { olcek: 2 });
  const { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType } = await import('docx');

  // A4 dikey, 2,5 cm kenar boşluğuyla kullanılabilir genişlik ≈ 605 pt
  const enFazlaPt = 605;
  const oran = Math.min(1, enFazlaPt / genislik);
  const g = Math.round(genislik * oran);
  const y = Math.round(yukseklik * oran);

  const belge = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: baslik, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({
            children: [
              new TextRun({ text: 'GeoEBA — Etkileşimli Çalışma Ortamı', size: 18, color: '666666' }),
            ],
            spacing: { after: 240 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                type: 'svg',
                // docx `data` alanını base64 metin sayıp çözmeye çalışıyor; ham XML
                // verilince "atob: not correctly encoded" hatası veriyordu. Bayt dizisi
                // geçince böyle bir çözümleme yapılmıyor.
                data: xmlToBytes(xml),
                transformation: { width: g, height: y },
                // Yedek görsel boyutu ana görselden alınır; ayrıca belirtilmez
                fallback: {
                  type: 'png',
                  data: dataUrlToBytes(dataUrl),
                },
              }),
            ],
          }),
          new Paragraph({
            spacing: { before: 240 },
            children: [
              new TextRun({
                text:
                  'İpucu: Çizime sağ tıklayıp "Şekle Dönüştür" derseniz her parçayı (doğru, çember, yazı) ' +
                  'Word içinde ayrı ayrı düzenleyebilirsiniz. Bu seçenek Microsoft 365, Office 2021, 2019 ve ' +
                  'güncel Office 2016 sürümlerinde bulunur. Daha eski sürümlerde (Office 2013 ve öncesi) ' +
                  'çizim, belgeye gömülü PNG kopyası olarak görünür ve şekle dönüştürülemez.',
                size: 16,
                color: '888888',
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(belge);
  indir(blob, `${guvenliAd(baslik)}.docx`);
}
