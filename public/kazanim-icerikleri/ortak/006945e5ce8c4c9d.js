/* Ortak 3B doku yardımcıları */
window.MALZEME3B = function(renderer) {
// ─ DOKU ÇEKİRDEĞİ (deterministik: Math.random YOK, aynı sahne her açılışta aynı) ─
function _lcg(t) { var s = (t >>> 0) || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function _rgb(h) { var v = parseInt(String(h).replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function _rgba(s) {   // '#rrggbb' → alfa 0.5; 'rgba(r,g,b,a)' → [r,g,b,a]
  var m = /rgba?\(([^)]+)\)/.exec(String(s)); if (!m) { var c = _rgb(s); return [c[0], c[1], c[2], 0.5]; }
  var p = m[1].split(',').map(parseFloat); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
}
function karisim(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
function gurultuAlani(n, ox, oy, tohum) {   // döşenebilir değer gürültüsü 0..1; ox/oy = x/y hücre sayısı (farklıysa YÖNLÜ: lif, fırça)
  var r = _lcg(tohum || 1), gx = ox + 1, gy = oy + 1, k = new Float32Array(gx * gy); for (var i = 0; i < gx * gy; i++) k[i] = r();
  var out = new Float32Array(n * n);
  for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
    var fx = x / n * ox, fy = y / n * oy, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    var x1 = (x0 + 1) % ox, y1 = (y0 + 1) % oy; x0 %= ox; y0 %= oy;
    out[y * n + x] = (k[y0 * gx + x0] * (1 - tx) + k[y0 * gx + x1] * tx) * (1 - ty) + (k[y1 * gx + x0] * (1 - tx) + k[y1 * gx + x1] * tx) * ty;
  }
  return out;
}
function fbmAlani(n, oktav, taban, tohum, turbulans) {   // çok oktavlı gürültü 0..1; turbulans=true → |g-0.5| toplamı (mermer/duman damarı)
  var out = new Float32Array(n * n), amp = 1, top = 0, o = taban || 4;
  for (var k = 0; k < (oktav || 5); k++) {
    var g = gurultuAlani(n, o, o, (tohum || 1) + k * 7919);
    for (var i = 0; i < n * n; i++) out[i] += (turbulans ? Math.abs(g[i] - 0.5) * 2 : g[i]) * amp;
    top += amp; amp *= 0.5; o *= 2;
  }
  for (var j = 0; j < n * n; j++) out[j] /= top; return out;
}
function alanDokusu(n, alan, renkFn, renkli) {   // 0..1 alan → CanvasTexture; renkFn(v, x, y) → [r,g,b]; renkli=false → veri dokusu (lineer kalır)
  var c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data;
  for (var i = 0; i < n * n; i++) { var p = renkFn(alan[i], i % n, (i / n) | 0); d[i * 4] = p[0]; d[i * 4 + 1] = p[1]; d[i * 4 + 2] = p[2]; d[i * 4 + 3] = 255; }
  g.putImageData(img, 0, 0); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (renkli !== false) t.colorSpace = THREE.SRGBColorSpace;   // RENK dokusu sRGB; veri dokusu lineer
  t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.userData.malzeme3b = true; return t;   // işaret: otoOlcek yalnız yardımcı dokularını ölçekler
}
function normalHaritasi(n, alan, guc) {   // yükseklik alanı → normal haritası (Sobel, döşenebilir); veri dokusu
  var c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data; guc = guc || 2;
  function h(x, y) { return alan[((y + n) % n) * n + ((x + n) % n)]; }
  for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
    var dx = (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1)) - (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1));
    var dy = (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1)) - (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1));
    var nx = -dx * guc, ny = -dy * guc, l = Math.sqrt(nx * nx + ny * ny + 1), i = (y * n + x) * 4;
    d[i] = 128 + nx / l * 127; d[i + 1] = 128 + ny / l * 127; d[i + 2] = 128 + 127 / l; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.userData.malzeme3b = true; return t;
}
function _dokuYap(kanvas, renkli) {   // canvas → döşenebilir CanvasTexture (renkli: sRGB; veri dokusu lineer); malzeme3b işareti otoOlcek için
  var t = new THREE.CanvasTexture(kanvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (renkli) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.userData.malzeme3b = true; return t;
}
function _tane(g, n, genlik, tohum, lekeGenlik, lekeHucre) {   // tuvale ince tane (+ isteğe bağlı geniş yumuşak leke) ekler: sır tanesi, kâğıt lifi, çimento; renk kanallarına eşit
  var img = g.getImageData(0, 0, n, n), p = img.data, tane = gurultuAlani(n, n >> 2, n >> 2, tohum), leke = lekeGenlik ? gurultuAlani(n, lekeHucre || 12, lekeHucre || 12, tohum + 2) : null;
  for (var i = 0; i < n * n; i++) { var s = (tane[i] - 0.5) * genlik + (leke ? (leke[i] - 0.5) * lekeGenlik : 0); p[i * 4] += s; p[i * 4 + 1] += s; p[i * 4 + 2] += s; }
  g.putImageData(img, 0, 0);
}
var _dokuBaglari = window.__MALZEME3B_BAGLARI || (window.__MALZEME3B_BAGLARI = new WeakMap());   // doku görüntüsü (texture.source) → { kaynak, guc, dikey }. Doku nesnesi userData'ya KONMAZ: three.js klonlarken userData'yı JSON'a çevirir, içindeki doku her klonda PNG'ye kodlanır (yüz başına onlarca ms, sayfa açılışı saniyelerce donar). source klonlarla ortaktır; fabrika örnekleri (sayfa + MALZEME3B_OTO) aynı bağları görür
function normalDokusu(doku, guc) {   // RENK/tanecik dokusunun parlaklığından normalMap türet (bumpMap yerine — ışıkta çok daha okunur)
  var c = doku.image, n = c.width, d = c.getContext('2d').getImageData(0, 0, n, n).data, alan = new Float32Array(n * n);
  for (var i = 0; i < n * n; i++) alan[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  var t = normalHaritasi(n, alan, guc || 1.5); _dokuBaglari.set(t.source, { kaynak: doku, guc: guc || 1.5 }); return t;   // kaynak+güç: dikey (90°) varyant aynı yoldan türetilir
}
function _dikeyDoku(doku) {   // dokunun 90° DÖNDÜRÜLMÜŞ klonu (bir kez, doku görüntüsü başına önbellekli): damar/fırça çizgisi u yerine v boyunca akar. Normal haritası döndürülmüş RENK dokusundan yeniden türetilir (vektörleri döndürmek gerekmez)
  var bag = _dokuBaglari.get(doku.source), t = bag && bag.dikey;
  if (t) { if (!bag.kaynak && (t.colorSpace !== doku.colorSpace || t.anisotropy !== doku.anisotropy)) { t = t.clone(); t.colorSpace = doku.colorSpace; t.anisotropy = doku.anisotropy; } return t; }   // 2026-09-24 esk (Kopya'da yok): önbellek GÖRÜNTÜ başına — aynı görüntüyü paylaşan kopya (ör. g.clone() NoColorSpace bump/roughness) ilk çağıranın renk uzayını/anizotropisini almasın; isabette ayar İSTENEN dokudan (eski nesne başı anlam, ölçüldü). Klon ucuz (userData boş); normal (kaynak bağlı) dikeyi kendi ayarındadır
  if (bag && bag.kaynak) { t = normalDokusu(_dikeyDoku(bag.kaynak), bag.guc); }
  else {
    var k = doku.image, c = document.createElement('canvas'); c.width = k.height; c.height = k.width; var g = c.getContext('2d');
    g.translate(0, c.height); g.rotate(-Math.PI / 2); g.drawImage(k, 0, 0);   // 90° saat yönü tersi
    t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = doku.colorSpace; t.anisotropy = doku.anisotropy;
  }
  if (!bag) _dokuBaglari.set(doku.source, bag = {});
  bag.dikey = t; return t;
}
var _dokuSayac = 0;
function _dokuKaydir() { _dokuSayac++; return [(_dokuSayac * 0.37) % 1, (_dokuSayac * 0.61) % 1]; }   // nesne/yüz başına farklı kaydırma: aynı desen her tahtada aynı yerde tekrarlamasın (deterministik)
function dokuOlcek(doku, genislik, derinlik, karo, kaydirma, dikey) {   // dikey=true: doku 90° döndürülür (damar yüzeyin v/uzun ekseni boyunca)   // DOKU ÖLÇEĞİ: karo = bir doku karosunun dünya boyu (birim); yüzeye (genişlik×derinlik) kaç kez döşeneceğini hesaplar — nesne başına KLON (repeat dokuya aittir, paylaşılamaz). karo MALZEME BAŞINA SABİT: o malzemenin sahnedeki en büyük yüzeyinin kısa kenarı/3 (masa 12×6 → karo 2; kutu 3×1,5 aynı karoyla → aynı damar sıklığı). kaydirma [ox, oy] verilmezse otomatik; map ve normalMap AYNI kaydırmayı almalı (yüzeyDoku/kutuDoku bunu yapar)
  var t = (dikey ? _dikeyDoku(doku) : doku).clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  var kb = _dokuBaglari.get(t.source); if (!kb) _dokuBaglari.set(t.source, kb = {}); (kb.klonlar || (kb.klonlar = [])).push(t);   // 13.10: ASENKRON doku (phMalzeme yer tutucu) yüklenince klonlar da tazelenir — klonun sürümü kendine ait, kaynağın needsUpdate'i klona işlemiyordu (tabla bej yer tutucuda kalıyordu)
  t.repeat.set(genislik / karo, derinlik / karo); var k = kaydirma || _dokuKaydir(); t.offset.set(k[0], k[1]); return t;
}
function _yuzMalzeme(malzeme, u, v, karo, dikey) {   // malzemenin bütün dokularını (map/normal/roughness/metalness/bump/emissive) u×v yüzeye göre klonlar — hepsi aynı kaydırmayla (normal renkle hizalı kalır)
  var ud = malzeme.userData || {}, dk = ud.dogalKaro; if (ud.sabitKaro) karo = ud.sabitKaro; else if (dk) karo = Math.min(karo || dk, dk);
  if (ud.damarV) dikey = !dikey;   // 13.10: damarı V ekseninde olan doku (Poly Haven ahşap kaplama) — yön bir kez ters çevrilir, kutuDoku/yuzeyDoku eksen mantığı aynen çalışır   // SABİT KARO (27.09 zemin/duvar materyalleri): fayans/mermer/mozaik/parke/kâğıt/halı dokusu gerçek karo boyunu taşır (2×2 fayans = 2,4 birim, parke 3,6) — çağıranın karosu YOK SAYILIR (odaKur'un 1,2'si 60 cm fayansı 15 cm'e küçültürdü). DOĞAL KARO TAVANI («masa damarları hâlâ çok büyük» kusuru): ahşap 0.6 — model 2 yazsa da kırpılır (ölçüldü: karo 2 → damar aralığı ≈ 2,4 cm ve 66 cm dalga; 0,6 → gerçek meşe)
  var m = malzeme.clone(), kay = _dokuKaydir(); ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'emissiveMap', 'aoMap'].forEach(function (k) { if (m[k]) m[k] = dokuOlcek(m[k], u, v, karo, kay, dikey); }); return m;
}
function yuzeyDoku(malzeme, genislik, derinlik, karo, dikey) { return _yuzMalzeme(malzeme, genislik, derinlik, karo, dikey == null ? derinlik > genislik : dikey); }   // damar uzun kenar boyunca (dikey verilmezse otomatik)   // PlaneGeometry / tek yüzlü nesne: dokuları yüzeye göre döşenmiş malzeme klonu
function kutuDoku(malzeme, genislik, yukseklik, derinlik, karo, eksen) {   // eksen 'x'|'y'|'z' = damar yönü (verilmezse EN UZUN kenar: masa tablası x, dikey ayak/direk y, kalas z)   // BoxGeometry için 6'lı malzeme dizisi: HER YÜZ KENDİ BOYUTUYLA döşenir — tek repeat yan yüzü ezer (ölçüldü: 0,7 birimlik masa yanı çizgi çizgi)
  eksen = eksen || (yukseklik >= genislik && yukseklik >= derinlik ? 'y' : derinlik > genislik ? 'z' : 'x');
  var x = _yuzMalzeme(malzeme, derinlik, yukseklik, karo, eksen === 'y'),    // ±x yüzü: u=derinlik(z), v=yükseklik → damar y ise dikey
      y = _yuzMalzeme(malzeme, genislik, derinlik, karo, eksen === 'z'),     // ±y yüzü: u=genişlik(x), v=derinlik(z) → damar z ise dikey
      z = _yuzMalzeme(malzeme, genislik, yukseklik, karo, eksen === 'y');    // ±z yüzü: u=genişlik(x), v=yükseklik → damar y ise dikey
  return [x, x, y, y, z, z];   // sıra +x,-x,+y,-y,+z,-z → new THREE.Mesh(new THREE.BoxGeometry(g, y, d), kutuDoku(mat, g, y, d, KARO))
}
function silindirDoku(malzeme, yaricap, yukseklik, karo, cevre) {   // CylinderGeometry için [yan, üst, alt]: yan yüz çevre(2πr)×yükseklik, kapaklar 2r×2r. DAMAR EKSEN BOYUNCA (ayak, direk, kütük, boru: u çevreye sarılır, doku döndürülmeden damar ÇEVREYİ DOLANIRDI — masa ayağı kusuru); halka isteniyorsa cevre=true
  var yan = _yuzMalzeme(malzeme, 2 * Math.PI * yaricap, yukseklik, karo, !cevre), kapak = _yuzMalzeme(malzeme, 2 * yaricap, 2 * yaricap, karo);
  return [yan, kapak, kapak];   // → new THREE.Mesh(new THREE.CylinderGeometry(r, r, y, 48), silindirDoku(mat, r, y, KARO))
}
var _DOKU_ALANLARI = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'emissiveMap', 'aoMap'];
function _tipliOlcek(o, T) {   // bilinen geometri: yardımcı dokusu repeat (1,1) ile BÜYÜK yüzeye gerilmişse yüzeye göre döşe (yuzeyDoku/kutuDoku/silindirDoku); true = döşendi
  if (!o.geometry.parameters || Array.isArray(o.material)) return false;
  var m = o.material, doku = m.map || m.normalMap || m.roughnessMap || m.bumpMap;
  if (!doku || !doku.userData || !doku.userData.malzeme3b || doku.repeat.x !== 1 || doku.repeat.y !== 1) return false;
  var p = o.geometry.parameters, sc = o.scale, tip = o.geometry.type, s2 = Math.max(sc.x, sc.y), s3 = Math.max(sc.x, sc.y, sc.z), b;
  if (tip === 'PlaneGeometry') b = [p.width * sc.x, p.height * sc.y];
  else if (tip === 'BoxGeometry') b = [p.width * sc.x, p.height * sc.y, p.depth * sc.z];
  else if (tip === 'CylinderGeometry') b = [2 * Math.PI * Math.max(p.radiusTop, p.radiusBottom) * Math.max(sc.x, sc.z), p.height * sc.y];
  else if (tip === 'RingGeometry' || tip === 'CircleGeometry') { var R = tip === 'RingGeometry' ? p.outerRadius : p.radius; b = [2 * R * s2, 2 * R * s2]; }   // UV düzlemsel, DIŞ ÇAPA gerili (ölçüldü 27.09: 23 birimlik halka pistte tek karo — metre başına ~22 px, bulanık leke)
  else if (tip === 'TubeGeometry' && p.path && p.path.getLength) b = [p.path.getLength() * s3, 2 * Math.PI * p.radius * s3];   // u = yol boyu, v = çevre
  else return false;
  var px = Math.max((doku.image && doku.image.width) || 512, 32), Tp = Math.min(T, px / 256);   // TEXEL ≥ 256 px/birim: 256 px tuvalde karo ≤ 1, 128 px'te ≤ 0,5 (ajan açılışı hızlandırmak için 128-256 px yazıyordu)
  var sirali = b.slice().sort(function (a, c) { return c - a; });
  if (sirali[0] < 2 * Tp) return false;                                             // küçük nesne (kasa, tuğla): tek karo 1:1 doğru
  var K = Math.min(Tp, Math.max(0.75, sirali[1] / 3));                               // karo = en büyük yüzeyin kısa kenarı/3, tavan T (kameraya yakın zemin ≤ 2)
  if (tip === 'PlaneGeometry' || tip === 'RingGeometry' || tip === 'CircleGeometry') o.material = yuzeyDoku(m, b[0], b[1], K);
  else if (tip === 'BoxGeometry') o.material = kutuDoku(m, b[0], b[1], b[2], K);
  else if (tip === 'TubeGeometry') o.material = yuzeyDoku(m, (p.closed ? Math.max(1, Math.round(b[0] / K)) * K : b[0]), Math.max(1, Math.round(b[1] / K)) * K, K, false);   // çevre (ve kapalı yolda boy) TAM karo: dikiş çizgisi olmaz; damar yol boyunca
  else o.material = silindirDoku(m, Math.max(p.radiusTop, p.radiusBottom) * Math.max(sc.x, sc.z), b[1], K);
  return true;
}
function _uvAcikligi(o, gr) {   // UV'nin DÜNYA açıklığı [u, v, alan]: u (ve v) 0→1 kaç birime yayılıyor — üçgen başına dP/du, dP/dv, alan ağırlıklı ortalama; HER geometride çalışır (küre, koni, torna, ekstrüzyon, özel arazi)
  var g = o.geometry, pos = g.attributes.position, uv = g.attributes.uv; if (!pos || !uv) return null;
  var idx = g.index, top = idx ? idx.count : pos.count, bas = gr ? gr.start : 0, n = Math.min(gr ? gr.count : top, top - bas), M = o.matrixWorld.clone();
  if (o.isInstancedMesh && o.count > 0) { var im = new THREE.Matrix4(); o.getMatrixAt(0, im); M.multiply(im); }
  var adim = Math.max(1, Math.floor(n / 3 / 4000)) * 3, p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), du = new THREE.Vector3(), dv = new THREE.Vector3(), W = 0, Lu = 0, Lv = 0, say = 0;
  for (var i = bas; i + 2 < bas + n; i += adim) {
    var a = idx ? idx.getX(i) : i, b = idx ? idx.getX(i + 1) : i + 1, c = idx ? idx.getX(i + 2) : i + 2;
    p0.fromBufferAttribute(pos, a).applyMatrix4(M); p1.fromBufferAttribute(pos, b).applyMatrix4(M); p2.fromBufferAttribute(pos, c).applyMatrix4(M);
    e1.subVectors(p1, p0); e2.subVectors(p2, p0); say++;
    var u1 = uv.getX(b) - uv.getX(a), v1 = uv.getY(b) - uv.getY(a), u2 = uv.getX(c) - uv.getX(a), v2 = uv.getY(c) - uv.getY(a), det = u1 * v2 - u2 * v1;
    var alan = du.crossVectors(e1, e2).length() / 2; if (Math.abs(det) < 1e-12 || alan < 1e-10) continue;
    du.copy(e1).multiplyScalar(v2).addScaledVector(e2, -v1).divideScalar(det); dv.copy(e2).multiplyScalar(u1).addScaledVector(e1, -u2).divideScalar(det);
    Lu += du.length() * alan; Lv += dv.length() * alan; W += alan;
  }
  return W > 0 ? [Lu / W, Lv / W, W * (n / 3) / say] : null;
}
function _yogunlukOlcek(o, T, kullanim) {   // GENEL AĞ (27.09, kullanıcı: «olma olasılığı varsa düzenleme şart»): tipli dalın döşemediği HER mesh — küre, koni, torna, ekstrüzyon, özel arazi, dizi malzeme, elle düşük repeat — RENK dokusu ekranda seyrekse (u ya da v yönünde < 160 px/birim) texel ≈ 256 px/birim olacak TAM SAYI repeat'e çıkarılır. Kapsam: yardımcı dokusu + sayfanın KENDİ tuvali (RepeatWrapping, ışıklı malzeme — ölçüldü 27.09: 784 m² zemine 512 px nokta deseni); MeshBasic gölge/etiket/çıkartma ve normal haritalı su dalgası (map yok) dokunulmaz
  var dizi = Array.isArray(o.material), mats = dizi ? o.material.slice() : [o.material], g = o.geometry, degisti = false;
  (dizi && g.groups.length ? g.groups : [null]).forEach(function (gr) {
    var mi = gr ? gr.materialIndex : 0, mt = mats[mi], doku = mt && mt.map;
    if (!doku || !doku.image) return;
    var yardimci = !!(doku.userData && doku.userData.malzeme3b);
    if (!yardimci && (mt.isMeshBasicMaterial || doku.wrapS !== THREE.RepeatWrapping || doku.wrapT !== THREE.RepeatWrapping)) return;   // sayfa tuvali yalnız döşenmek üzere kurulmuşsa
    var ac = _uvAcikligi(o, gr); if (!ac || Math.max(ac[0], ac[1]) < 1) return;        // küçük parça: 1:1 doğru
    var px = Math.max(doku.image.width || 512, 32), yu = px * Math.abs(doku.repeat.x) / Math.max(ac[0], 1e-6), yv = px * Math.abs(doku.repeat.y) / Math.max(ac[1], 1e-6);
    if (Math.min(yu, yv) >= 160) return;
    var K = Math.min(T, px / 256), ru = Math.max(1, Math.round(ac[0] / K)), rv = Math.max(1, Math.round(ac[1] / K));   // tam sayı: kapalı yüzeyde (küre, koni, torus) dikiş çizgisi olmaz
    var tek = _DOKU_ALANLARI.every(function (k) { return !mt[k] || (kullanim.get(mt[k]) || 0) <= 1; });
    if (!tek && !yardimci) return;                                                    // paylaşılan sayfa tuvali: klon sayfanın offset animasyonunu koparır — dokunma
    if (tek) _DOKU_ALANLARI.forEach(function (k) { var t = mt[k]; if (!t || !t.isTexture) return; if (t.wrapS !== THREE.RepeatWrapping || t.wrapT !== THREE.RepeatWrapping) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true; } t.repeat.set(ru, rv); });   // tek kullanıcı: YERİNDE (sayfanın offset animasyonu kopmaz)
    else mats[mi] = _yuzMalzeme(mt, ru * K, rv * K, K, false);                         // paylaşılan doku: nesne başına klon
    degisti = true;
  });
  if (degisti) o.material = dizi ? mats : mats[0];
  return degisti;
}
function tekrarKir(mesh, siddet) {   // DOKU TEKRARINI KIRAR (27.09 kullanıcı: «arka plandaki doku tekrarı hissediliyor»; 24 birimlik duvarda 12 sıva karosu periyodik okunuyordu): yüzeye TEK karo hâlinde gerilen yumuşak leke haritası aoMap olur — döşeli doku kalır, üstüne tekrarlamayan geniş ton dalgalanması biner. uv1 (r155 aoMap) geometriden kopyalanır; paylaşımlı malzemede de çalışır (uv1 yüzey başına 0..1). siddet 0..1 (varsayılan 0,55)
  var g = mesh.geometry, m = mesh.material; if (!g || !m || Array.isArray(m) || !g.attributes || !g.attributes.uv) return mesh;
  if (!g.attributes.uv1) g.setAttribute('uv1', g.attributes.uv); if (!g.attributes.uv2) g.setAttribute('uv2', g.attributes.uv);
  var t = window.__MALZEME3B_LEKE;
  if (!t) { t = window.__MALZEME3B_LEKE = alanDokusu(512, fbmAlani(512, 5, 2, 131), function (v) { var q = (0.7 + v * 0.3) * 255; return [q, q, q]; }, false); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.userData.malzeme3b = false; }   // 0,7-1 yumuşak leke, 5 oktav / 512 px (13.10: sıva karosundan çıkan orta ölçekli lekelenme buradan gelir — 7 m duvarda ≈ 20 cm'e kadar, tekrarsız); tek doku, repeat 1 sabit (dokuOlcek dokunmaz: işaret kapalı)
  if (m.userData._tekrarKirildi) return mesh;
  m.aoMap = t; m.aoMapIntensity = siddet == null ? 0.55 : siddet; m.userData._tekrarKirildi = true; m.needsUpdate = true; return mesh;
}
function otoOlcek(scene, karoTavan) {   // DOKU ÖLÇEĞİ OTOMATİĞİ: köprü ilk çizimde (ve 1,5 sn sonra) çağırır — önce bilinen geometri (_tipliOlcek), sonra her geometride texel yoğunluğu ağı (_yogunlukOlcek); modelin kendi CanvasTexture'ına (ekran, dama) DOKUNMAZ
  var T = karoTavan || 2, sayac = 0, kullanim = new Map();
  scene.traverse(function (o) {
    if (!o.isMesh || !o.material) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (mt) { if (mt) _DOKU_ALANLARI.forEach(function (k) { var t = mt[k]; if (t && t.isTexture) kullanim.set(t, (kullanim.get(t) || 0) + 1); }); });
  });
  scene.traverse(function (o) {
    if (!o.isMesh || !o.geometry || !o.material || o.userData._m3bOlcekli) return;
    if (_tipliOlcek(o, T) || _yogunlukOlcek(o, T, kullanim)) { o.userData._m3bOlcekli = true; sayac++;
      var bb = new THREE.Box3().setFromObject(o), sz = new THREE.Vector3(); bb.getSize(sz); if (Math.max(sz.x, sz.y, sz.z) >= 6) tekrarKir(o); }   // büyük döşeli yüzey: tekrar kırıcı leke
  });
  return sayac;
}
function uzayFonu(scene, s) {   // UZAY / GECE GÖĞÜ FONU — zifiri siyah DEĞİL: üstte koyu lacivert, altta mor-menekşe degrade (ekran uzayı; kamera dönse de üst koyu, alt mor) + üç katman kırpışan yıldız (toz / orta / dört ışınlı parlak; boy ve parlaklık dağılımlı, deterministik). s = { ust:'#141a3c', orta:'#1e2048', alt:'#2f2a4d', yildiz:2600, parlak:48, yaricap:70, tohum:7, otomatik:true }; dönüş { grup, fon, guncelle(saniye), durdur() }; ikinci çağrı aynı fonu döndürür (gezegen + atmosfer birlikte güvenli). camera.far ≥ yaricap × 1.5 olsun. Yıldızlar raycast'e girmez.
  if (scene.userData.__uzayFonu) return scene.userData.__uzayFonu;
  s = s || {};
  var ust = s.ust || '#141a3c', ortaRenk = s.orta || '#1e2048', alt = s.alt || '#2f2a4d';
  var sayi = s.yildiz || 2600, parlakSayi = s.parlak == null ? 48 : s.parlak, R = s.yaricap || 70;
  var tohum = ((s.tohum || 7) % 2147483646) + 1;
  function rnd() { tohum = (tohum * 48271) % 2147483647; return (tohum - 1) / 2147483646; }   // deterministik (Math.random YOK)
  // 1) fon: dikey degrade dokusu — referans kare tonları (üst koyu lacivert → orta → alt mor-menekşe)
  var c = document.createElement('canvas'); c.width = 4; c.height = 512;
  var g = c.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, ust); grd.addColorStop(0.55, ortaRenk); grd.addColorStop(1, alt);
  g.fillStyle = grd; g.fillRect(0, 0, 4, 512);
  var fon = new THREE.CanvasTexture(c); fon.colorSpace = THREE.SRGBColorSpace;
  scene.background = fon;
  // 2) yıldız dokuları: yumuşak disk (toz/orta) + dört ışınlı parlak yıldız
  function diskDokusu(n, isinli) {
    var k = document.createElement('canvas'); k.width = k.height = n;
    var x = k.getContext('2d'), m = n / 2;
    var rg = x.createRadialGradient(m, m, 0, m, m, m);
    if (isinli) { rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.18, 'rgba(255,255,255,0.92)'); rg.addColorStop(0.45, 'rgba(255,255,255,0.22)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); }
    else { rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.30, 'rgba(255,255,255,0.96)'); rg.addColorStop(0.44, 'rgba(255,255,255,0.35)'); rg.addColorStop(0.62, 'rgba(255,255,255,0.05)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); }
    x.fillStyle = rg; x.fillRect(0, 0, n, n);
    if (isinli) {   // ince dört ışın: ortada parlak, uçlara doğru söner
      var lg1 = x.createLinearGradient(0, m, n, m);
      lg1.addColorStop(0, 'rgba(255,255,255,0)'); lg1.addColorStop(0.5, 'rgba(255,255,255,0.95)'); lg1.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = lg1; x.fillRect(0, m - n * 0.011, n, n * 0.022);
      var lg2 = x.createLinearGradient(m, 0, m, n);
      lg2.addColorStop(0, 'rgba(255,255,255,0)'); lg2.addColorStop(0.5, 'rgba(255,255,255,0.95)'); lg2.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = lg2; x.fillRect(m - n * 0.011, 0, n * 0.022, n);
    }
    var d = new THREE.CanvasTexture(k); d.colorSpace = THREE.SRGBColorSpace; return d;
  }
  var diskDoku = diskDokusu(64, false), isinDoku = diskDokusu(128, true);
  // 3) katmanlar: küresel kabuk üzerinde deterministik dağılım; boy ve parlaklık yıldız başına, kırpışma fazlı
  var VERT = 'attribute float boyut; attribute float faz; attribute float hiz; attribute vec3 renk3; uniform float zaman; uniform float piksel; uniform float genlik; varying float vK; varying vec3 vRenk;\n' +
    'void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); float k = (1.0 - genlik) + genlik * (0.5 + 0.5 * sin(zaman * hiz + faz)); vK = k; vRenk = renk3;' +
    ' gl_PointSize = boyut * piksel * (0.9 + 0.1 * k) * (220.0 / -mv.z); gl_Position = projectionMatrix * mv; }';
  var FRAG = 'uniform sampler2D doku; varying float vK; varying vec3 vRenk;\n' +
    'void main() { vec4 t = texture2D(doku, gl_PointCoord); gl_FragColor = vec4(vRenk * vK, t.a * vK); }';
  var renkler = [[1, 1, 1], [0.86, 0.91, 1], [1, 0.93, 0.80], [0.80, 0.88, 1]];   // beyaz, mavimsi, sıcak, buz mavisi
  var grup = new THREE.Group(); grup.name = 'uzayFonu'; grup.userData.yardimci = true; grup.raycast = function () {};
  var malzemeler = [];
  function katman(adet, boyMin, boyMax, parlaklik, doku, hizMin, hizMax, genlik) {
    var poz = new Float32Array(adet * 3), boy = new Float32Array(adet), faz = new Float32Array(adet), hiz = new Float32Array(adet), rk = new Float32Array(adet * 3);
    for (var i = 0; i < adet; i++) {
      var u = rnd() * 2 - 1, t = rnd() * 6.2831853, r = Math.sqrt(1 - u * u), rr = R * (0.92 + rnd() * 0.16);
      poz[i * 3] = rr * r * Math.cos(t); poz[i * 3 + 1] = rr * u; poz[i * 3 + 2] = rr * r * Math.sin(t);
      var e = rnd(); boy[i] = boyMin + (boyMax - boyMin) * e * e;   // çoğu küçük, azı büyük
      faz[i] = rnd() * 6.2831853; hiz[i] = hizMin + rnd() * (hizMax - hizMin);
      var c3 = renkler[Math.floor(rnd() * renkler.length)], p = parlaklik * (0.55 + 0.45 * rnd());
      rk[i * 3] = c3[0] * p; rk[i * 3 + 1] = c3[1] * p; rk[i * 3 + 2] = c3[2] * p;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(poz, 3));
    geo.setAttribute('boyut', new THREE.BufferAttribute(boy, 1));
    geo.setAttribute('faz', new THREE.BufferAttribute(faz, 1));
    geo.setAttribute('hiz', new THREE.BufferAttribute(hiz, 1));
    geo.setAttribute('renk3', new THREE.BufferAttribute(rk, 3));
    var mat = new THREE.ShaderMaterial({ uniforms: { zaman: { value: 0 }, piksel: { value: renderer ? renderer.getPixelRatio() : 1 }, doku: { value: doku }, genlik: { value: genlik } },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending });
    var p3 = new THREE.Points(geo, mat); p3.frustumCulled = false; p3.raycast = function () {}; p3.renderOrder = -10;
    malzemeler.push(mat); grup.add(p3); return p3;
  }
  var tozSayi = Math.round(sayi * 0.7), ortaSayi = sayi - tozSayi;
  katman(tozSayi, 1.0, 1.8, 0.95, diskDoku, 0.6, 1.6, 0.25);     // toz: çok, minik ama keskin ve parlak
  katman(ortaSayi, 1.8, 3.2, 1.0, diskDoku, 0.8, 2.2, 0.4);      // orta: belirgin nokta
  katman(parlakSayi, 5.0, 10.0, 1.15, isinDoku, 0.5, 1.4, 0.55); // parlak: az, ışınlı hale, belirgin kırpışma
  scene.add(grup);
  // 4) kırpışma: kendi döngüsü (otomatik) ya da sayfanın döngüsünden guncelle(saniye)
  var baslangic = performance.now(), calisiyor = true, rafId = 0;
  function guncelle(saniye) { for (var i = 0; i < malzemeler.length; i++) malzemeler[i].uniforms.zaman.value = saniye; }
  function dongu() { if (!calisiyor) return; guncelle((performance.now() - baslangic) / 1000); rafId = requestAnimationFrame(dongu); }
  if (s.otomatik !== false) rafId = requestAnimationFrame(dongu);
  var sonuc = { grup: grup, fon: fon, guncelle: guncelle, durdur: function () { calisiyor = false; if (rafId) cancelAnimationFrame(rafId); } };
  scene.userData.__uzayFonu = sonuc;
  return sonuc;
}
function dalgaNormali(n, olcek, tohum) {   // su/cam dalga normal haritası: fBm yükseklik → normal (döşenebilir); olcek büyüdükçe dalga sıklaşır
  n = n || 256; return normalHaritasi(n, fbmAlani(n, 4, Math.max(2, Math.round(3 * (olcek || 1))), Math.round((tohum || 0) * 1000) + 91), 3);
}
function gurultuDoku(n, taban, sapma, tane, renkli) {   // tanecik/leke dokusu (beton, toprak, plastik tanesi): İNCE tane baskın + hafif geniş leke. sapma = kontrast (zemin 0.3-0.7; 1.4 geniş «kamuflaj» lekesi yapıyordu — ölçüldü), tane 1-4 kabalık; renkli=false → bump/roughness verisi
  n = n || 256; var kaba = fbmAlani(n, 4, (tane || 1) * 3, 17), ince = fbmAlani(n, 3, Math.max(16, n >> 3), 19), rgb = _rgb(taban || '#888888'), s = (sapma == null ? 1 : sapma) * 40;
  return alanDokusu(n, kaba, function (v, x, y) { var k = ((v - 0.5) * 0.35 + (ince[y * n + x] - 0.5) * 0.65) * s; return [rgb[0] + k, rgb[1] + k, rgb[2] + k]; }, renkli);
}
function cizgiDoku(n, taban, cizgi, adim, yatay, renkli) {   // fırçalanmış metal / lif / oluk: YÖNLÜ gürültü çizgileri — YALNIZ metal fırça izi / kumaş lifi / kâğıt; bina cephesi, pencere, plastik, duvar İÇİN DEĞİL (ölçüldü: mor binada ahşap damarı gibi okundu → bina-cephe: geometrik pencere); adim küçük = ince çizgi; cizgi 'rgba(r,g,b,a)' çizgi rengi+gücü; yatay=true yatay çizgi; renkli=false → veri dokusu
  n = n || 512; adim = adim || 3; var ox = yatay ? 3 : Math.round(n / adim), oy = yatay ? Math.round(n / adim) : 3;
  var a = gurultuAlani(n, ox, oy, 29), f = fbmAlani(n, 3, 4, 31), t = _rgb(taban || '#b0b6bf'), c = _rgba(cizgi || 'rgba(255,255,255,0.3)');
  return alanDokusu(n, a, function (v, x, y) { var m = Math.max(0, Math.min(1, (v - 0.5) * 1.2 + (f[y * n + x] - 0.5) * 0.3 + 0.5)) * c[3]; return karisim(t, [c[0], c[1], c[2]], m); }, renkli);
}
function damarDoku(n, zemin, damar, sayi, renkli) {   // ahşap damarı: DÖŞENEBİLİR düz damar (tahta/kalas) — fBm ile bükülen paralel çizgiler + lif; karo sınırı dikişsiz, BUDAK YOK (halkalı budak karo döşenince ızgara gibi tekrarlıyordu, ölçüldü). sayi ≈ karo başına damar (18-40); renkli=false → veri dokusu
  n = n || 512; sayi = Math.round(sayi || 28); var w = fbmAlani(n, 4, 3, 21), lif = gurultuAlani(n, 2, Math.round(n / 3), 23), z = _rgb(zemin || '#a86f3e'), d = _rgba(damar || 'rgba(55,28,8,0.6)');
  return alanDokusu(n, w, function (v, x, y) {
    var q = y / n, h = Math.sin((q * sayi + v * 1.6) * Math.PI * 2) * 0.5 + 0.5;   // q·sayi tam sayı periyot → dikey dikişsiz; v döşenebilir fBm → yatay dikişsiz, damar dalgalı
    var m = Math.max(0, Math.min(1, Math.pow(h, 2.2) * 0.55 + v * 0.25 + (lif[y * n + x] - 0.5) * 0.5)) * d[3];
    return karisim(z, [d[0], d[1], d[2]], m);
  }, renkli);
}
var AHSAP_TURLERI = {   // TÜR TABLOSU (referans: ilk ahşap reçetesi — sayi 28 / dalga 1.6 / lif 0.5; türler ağırlıkla RENKLE ayrışır, damar sıklığı 24-34 bandında kalır): zemin/damar rengi, sayi = karo başına damar (sık/seyrek), dalga = damar kıvrımı, benek = ışın beneği (meşe/kayın), budak = çam budağı, catlak = eski ahşap çatlağı, bogum = bambu boğumu, roughness
  mese:   { zemin: '#a86f3e', damar: 'rgba(55,28,8,0.6)',    sayi: 28, dalga: 1.6, roughness: 0.72, tohum: 1 },   // REFERANS: ilk ahşap reçetesiyle birebir (sonradan eklenen türler kaba ve büyük durdu) — masa, kapı, parke
  ceviz:  { zemin: '#5e3b24', damar: 'rgba(30,15,6,0.65)',   sayi: 30, dalga: 1.7, roughness: 0.55, tohum: 2 },   // ceviz: koyu çikolata, referans sıklıkta hafif daha kıvrımlı (mobilya, çalışma masası)
  cam:    { zemin: '#d9b076', damar: 'rgba(150,95,40,0.5)',  sayi: 24, dalga: 1.6, roughness: 0.75, tohum: 3 },   // çam: açık sarımsı, biraz daha seyrek damar (kulübe, çit, kasa, kalas); budak dokuda değil → budakEkle
  kayin:  { zemin: '#d8b48f', damar: 'rgba(140,95,60,0.4)',  sayi: 32, dalga: 1.4, benek: -0.06, roughness: 0.65, tohum: 4 },   // kayın: açık pembemsi, ince düz damar + çok hafif koyu benek (okul sırası, sandalye)
  hus:    { zemin: '#e8d6b8', damar: 'rgba(170,140,100,0.35)', sayi: 34, dalga: 1.4, roughness: 0.6,  tohum: 5 },   // huş: çok açık krem, silik ince damar (kontrplak, raf, oyuncak)
  maun:   { zemin: '#7a3b26', damar: 'rgba(50,20,10,0.6)',   sayi: 34, dalga: 1.5, roughness: 0.45, tohum: 6 },   // maun: kızıl-kahve, ince düz damar (sandık, piyano, tekne)
  kiraz:  { zemin: '#a5583b', damar: 'rgba(80,35,20,0.5)',   sayi: 32, dalga: 1.5, roughness: 0.5,  tohum: 7 },   // kiraz: sıcak kızıl, ince damar
  abanoz: { zemin: '#1e1a18', damar: 'rgba(70,58,50,0.5)',   sayi: 30, dalga: 1.5, roughness: 0.3,  tohum: 8 },   // abanoz: siyaha yakın, cilalı
  eski:   { zemin: '#8a8378', damar: 'rgba(60,55,50,0.6)',   sayi: 28, dalga: 1.6, catlak: true, roughness: 0.95, tohum: 9 },   // eski/gri ahşap: yağmur yemiş, seyrek ince çatlak (iskele, çit, ahır)
  bambu:  { zemin: '#d9c27a', damar: 'rgba(150,130,60,0.35)', sayi: 40, dalga: 0.8, bogum: true, roughness: 0.5, clearcoat: 0.3, tohum: 10 }   // bambu: sarı, çok ince boyuna lif + boğum bantları (eşit aralıksız, dalgalı kenar)
};
var _BOGUMLAR = [0.0, 0.38, 0.71];   // bambu boğum konumları (karo kesri): eşit üçte birler mekanik tekrar okunuyordu
function ahsapDokusu(tur, n, tohum) {   // ahşap TÜRÜ → { map, normal, roughness, clearcoat }; döşenebilir, deterministik; tohum farklı tahtalarda farklı desen
  n = n || 512; var T = AHSAP_TURLERI[tur] || AHSAP_TURLERI.mese, s = (tohum || 0) * 101 + T.tohum * 7;
  var w = fbmAlani(n, 4, 3, 21 + s), lif = gurultuAlani(n, 2, Math.round(n / 3), 23 + s), benek = T.benek ? gurultuAlani(n, Math.round(n / 5), Math.round(n / 48), 31 + s) : null;
  var z = _rgb(T.zemin), d = _rgba(T.damar), yuk = new Float32Array(n * n);
  var map = alanDokusu(n, w, function (v, x, y) {
    var q = y / n, h = Math.sin((q * T.sayi + v * T.dalga) * 6.283) * 0.5 + 0.5;               // q·sayi tam periyot → dikişsiz
    var m = Math.pow(h, 2.2) * 0.55 + v * 0.25 + (lif[y * n + x] - 0.5) * 0.5;
    if (benek && benek[y * n + x] > 0.82) m += T.benek;                                        // benek SEYREK ve hafif: sık benek dokuyu kabalaştırıyordu                                        // ışın benekleri: kısa yatay çizgicikler (meşede açık, kayında koyu)
    if (T.bogum) { var qq = (q + (v - 0.5) * 0.02 + 1) % 1; for (var bi = 0; bi < _BOGUMLAR.length; bi++) { var b = qq - _BOGUMLAR[bi]; if (b >= 0 && b < 0.035) m += 0.55; else if (b >= 0.035 && b < 0.07) m -= 0.35; } }   // bambu boğumu: eşit olmayan aralık + dalgalı kenar (koyu şerit + açık kabarma)
    if (T.catlak && lif[y * n + x] > 0.95) m += 0.7;                                         // eski ahşap: koyu ince çatlaklar (fBm'den: karo dikişsiz, çizgi ince → tekrar göze batmaz)
    m = Math.max(0, Math.min(1, m)); yuk[y * n + x] = m;
    return karisim(z, [d[0], d[1], d[2]], m * d[3]);
  });
  var normal = normalHaritasi(n, yuk, 1.2); _dokuBaglari.set(normal.source, { kaynak: map, guc: 1.2 });   // dikey (90°) varyant için kaynak bağı
  return { map: map, normal: normal, roughness: T.roughness, clearcoat: T.clearcoat || 0 };
}
function budakEkle(doku, adet, tohum) {   // çam budağı: eş merkezli koyu/açık elipsler — YALNIZ TEK KAROLU yüzeye (repeat ≤ 1.5; tek tahta, kalas ucu). Döşenen yüzeyde budak her karoda tekrar eder → KUSUR. Doku klonuna çizer, klonu döndürür
  var k = doku.image, n = k.width, c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d'); g.drawImage(k, 0, 0); var r = _lcg(41 + (tohum || 0));
  for (var b = 0; b < (adet || 1); b++) { var cx = n * (0.2 + r() * 0.6), cy = n * (0.2 + r() * 0.6), rx = n * (0.03 + r() * 0.03), ry = rx * 0.6;
    for (var i = 6; i >= 1; i--) { g.beginPath(); g.ellipse(cx, cy, rx * i / 6, ry * i / 6, 0.3, 0, 6.283); g.fillStyle = i % 2 ? 'rgba(90,55,25,0.55)' : 'rgba(170,120,70,0.45)'; g.fill(); } }
  var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = doku.anisotropy; return t;
}
function ahsapMalzeme(tur, cila, tohum) {   // TABAN malzeme: tür + cila ('mat' | 'vernik' | 'lake'); nesneye kutuDoku/silindirDoku/yuzeyDoku ile ölçeklenir
  var D = ahsapDokusu(tur, 512, tohum), cilali = cila === 'vernik' || cila === 'lake';
  var m = new (cilali ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ color: 0xffffff, map: D.map, normalMap: D.normal,
    normalScale: new THREE.Vector2(cilali ? 0.4 : 0.6, cilali ? 0.4 : 0.6), roughness: cilali ? 0.3 : D.roughness, metalness: 0 });
  if (cilali) { m.clearcoat = cila === 'lake' ? 0.8 : 0.4; m.clearcoatRoughness = cila === 'lake' ? 0.1 : 0.3; m.envMapIntensity = 0.6; }
  else if (D.clearcoat) { m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: D.map, normalMap: D.normal, normalScale: new THREE.Vector2(0.5, 0.5), roughness: D.roughness, metalness: 0, clearcoat: D.clearcoat, clearcoatRoughness: 0.2, envMapIntensity: 0.6 }); }   // bambu: doğal hafif parlaklık
  m.userData.dogalKaro = 0.6;   // bir karo (28 damar) = 0,6 birim dünya (≈ 20 cm): kutuDoku/yuzeyDoku/silindirDoku/otoOlcek bunu TAVAN sayar — büyük karo damarı dev yapıyordu
  return m;
}
function mermerDoku(n, zemin, damar, renkli) {   // mermer: türbülans damarları (zemin açık, damar koyu gri-mor)
  n = n || 512; var t = fbmAlani(n, 5, 3, 37, true), z = _rgb(zemin || '#eeeae2'), d = _rgb(damar || '#6c6a72');
  return alanDokusu(n, t, function (v, x, y) { var m = 1 - Math.pow(Math.abs(Math.sin((x / n * 3 + y / n * 1.5) * Math.PI + v * 6)), 0.25); return karisim(z, d, m); }, renkli);
}
function karoDoku(n, karo, derz, adet, renkli, kare) {   // tuğla (2:1 oran, şaşırtmalı) / fayans (kare=true, hizalı): derz + karo başına ton ve boy farkı + tanecik; adet = satır sayısı; renkli=false → bump verisi
  n = n || 512; adet = adet || 4; var c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d'), bh = n / adet, bw0 = kare ? bh : bh * 2, r = _lcg(61), kr = _rgb(karo || '#b8402e'), d = Math.max(2, Math.round(n * 0.008));
  g.fillStyle = derz || '#8d8d8d'; g.fillRect(0, 0, n, n);
  for (var y = 0; y < adet; y++) { var kay = kare ? 0 : (y % 2) * bw0 / 2; for (var x = -1; x <= Math.ceil(n / bw0); x++) { var t = (r() - 0.5) * (kare ? 16 : 44), bw = bw0 * (kare ? 1 : 0.93 + r() * 0.14);
    g.fillStyle = 'rgb(' + Math.round(kr[0] + t) + ',' + Math.round(kr[1] + t * 0.7) + ',' + Math.round(kr[2] + t * 0.5) + ')'; g.fillRect(x * bw0 + kay + d, y * bh + d, bw - 2 * d, bh - 2 * d); } }
  var img = g.getImageData(0, 0, n, n), d = img.data, gn = gurultuAlani(n, n >> 3, n >> 3, 67);
  for (var i = 0; i < n * n; i++) { var s = (gn[i] - 0.5) * 16; d[i * 4] += s; d[i * 4 + 1] += s; d[i * 4 + 2] += s; } g.putImageData(img, 0, 0);   // tanecik ±8 (36 açık karoda leke gibi okunuyordu, ölçüldü)
  var tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; if (renkli !== false) tx.colorSpace = THREE.SRGBColorSpace;
  tx.anisotropy = renderer.capabilities.getMaxAnisotropy(); tx.userData.malzeme3b = true; return tx;
}
var FAYANS_TURLERI = {   // TÜR TABLOSU: renkler = karo renkleri (karo başına rastgele + ton farkı), derz, adet = doku başına karo sırası, kare (false → 2:1 şaşırtmalı metro), leke = karo içi bulut, karo = doku karosunun dünya boyu (birim)
  porselen:  { renkler: ['#c3beb4', '#bcb7ad', '#c9c4ba'], derz: '#8e8a83', adet: 2, kare: true, leke: 14, roughness: 0.45, clearcoat: 0.2, karo: 2.4, n: 1024 },   // 60×60 büyük format ORTA TON gri-bej porselen (mat-satine; açık ton ACES'te bembeyaz çıkıyordu — oda render'ında ölçüldü): 2×2 karo = 2,4 birim → karo ≈ 40 cm
  metro:     { renkler: ['#f3f1eb'], derz: '#b6b2aa', adet: 6, kare: false, leke: 4, roughness: 0.1, clearcoat: 0.9, karo: 1.2, n: 512 },                       // METRO duvar fayansı: 2:1 şaşırtmalı parlak beyaz sır; 6 sıra = 1,2 birim → 20×10 cm
};
function fayansDokusu(tur, tohum) {   // → { map, yukseklik, tur }: derzli karo dokusu + yükseklik VERİ dokusu (derz çukur); döşenebilir (kenardan taşan karo karşı kenarla aynı renk), deterministik
  var T = FAYANS_TURLERI[tur] || FAYANS_TURLERI.porselen, n = T.n, r = _lcg(97 + (tohum || 0) * 13);
  var c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d');
  var nh = Math.min(n, 512), hc = document.createElement('canvas'); hc.width = hc.height = nh; var hg = hc.getContext('2d'); hg.scale(nh / n, nh / n);   // yükseklik tuvali 512 (Sobel maliyeti 4'te bir; ölçüldü: 1024 porselen 399 ms)
  var bh = n / T.adet, bw = T.kare ? bh : bh * 2, d = Math.max(2, Math.round(n * 0.006)), sut = Math.ceil(n / bw), tasan = null;
  g.fillStyle = T.derz; g.fillRect(0, 0, n, n); hg.fillStyle = '#404040'; hg.fillRect(0, 0, n, n); hg.fillStyle = '#ffffff';
  for (var y = 0; y < T.adet; y++) { var kay = T.kare ? 0 : (y % 2) * bw / 2;
    for (var x = 0; x <= sut; x++) { var xi = x === sut ? -1 : x, k;   // son tur: sol kenardan taşan karo (x = -1) sağ kenardaki taşanla AYNI renk
      if (xi === -1) { if (!kay) break; k = tasan; } else { var kr = _rgb(T.renkler[Math.floor(r() * T.renkler.length)]), t = (r() - 0.5) * 14; k = [kr[0] + t, kr[1] + t * 0.8, kr[2] + t * 0.6]; if (xi === sut - 1) tasan = k; }
      g.fillStyle = 'rgb(' + Math.round(k[0]) + ',' + Math.round(k[1]) + ',' + Math.round(k[2]) + ')';
      g.fillRect(xi * bw + kay + d, y * bh + d, bw - 2 * d, bh - 2 * d); hg.fillRect(xi * bw + kay + d, y * bh + d, bw - 2 * d, bh - 2 * d); } }
  _tane(g, n, 7, 101 + (tohum || 0), T.leke, 12);   // ince sır tanesi + karo içi yumuşak bulut (derz de payını alır)
  return { map: _dokuYap(c, true), yukseklik: _dokuYap(hc, false), tur: T };
}
function fayansMalzeme(tur, tohum) {   // TABAN: 'porselen' (yer, büyük format) | 'metro' (duvar, 2:1 parlak beyaz) — dama ve terrakota 27.09 kullanıcı kararıyla ÇIKTI («beğenmedim»); odaKur(scene, { zeminMat: fayansMalzeme('porselen') }) ya da yuzeyDoku/kutuDoku ile — karo boyu sabittir (sabitKaro)
  var D = fayansDokusu(tur, tohum), T = D.tur;
  var m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: D.map, metalness: 0, roughness: T.roughness,
    normalMap: normalDokusu(D.yukseklik, 1.6), normalScale: new THREE.Vector2(0.45, 0.45),   // yükseklik VERİSİNDEN normal (renkten değil: koyu karo çukura düşerdi); derz çukuru ışıkta okunur
    clearcoat: T.clearcoat, clearcoatRoughness: 0.12, envMapIntensity: 1 });
  m.userData.sabitKaro = T.karo; return m;
}
var MERMER_TURLERI = {   // zemin / ana damar / ince damar rengi, bulut = zemin dalgalanması, kalin/ince = damar güçleri, derz
  beyaz: { zemin: '#dcd8d0', damar: '#66646c', ikincil: '#a5a2a8', bulut: 0.07, kalin: 0.7, ince: 0.4, derz: '#aaa59b' },   // Carrara: krem-beyaz, gri damar
  bej:   { zemin: '#d9c9b0', damar: '#8f7252', ikincil: '#c0aa88', bulut: 0.1, kalin: 0.7, ince: 0.55, derz: '#b3a48c' }      // bej (açık Emperador / traverten): kahve damar
};
function mermerDokusu(tur, n, karo, tohum) {   // → { map, yukseklik, tur }: türbülans damarlı mermer; karo ≥ 1 → n/karo'luk DERZLİ karolar, her karo damar alanını farklı yerden/yönden örnekler (aynı levha tekrarı okunmaz); karo 0 → tek levha. Faz katsayıları tam sayı → döşenebilir; deterministik
  var T = MERMER_TURLERI[tur] || MERMER_TURLERI.beyaz; n = n || 512; karo = karo || 0; var s = (tohum || 0) * 31;
  var nf = Math.min(n, 512), kay = n === nf ? 0 : 1, t1 = fbmAlani(nf, 5, 3, 37 + s, true), t2 = fbmAlani(nf, 4, 6, 41 + s, true), bul = fbmAlani(nf, 3, 2, 43 + s), tane = gurultuAlani(nf, nf >> 2, nf >> 2, 47 + s);   // gürültü alanları en çok 512: 1024'te iki piksel bir örnek (alanlar yumuşak; ölçüldü: 1024'lük alanlar + pow ile 973 ms, sayfa açılışını donduruyordu)
  var L = 1024, L5 = new Float32Array(L + 1), L16 = new Float32Array(L + 1), L14 = new Float32Array(L + 1);   // pow LUT'ları (0..1): damar çizgisi (^5), hale (^1.6), ince damar (^14)
  for (var li = 0; li <= L; li++) { var q = li / L; L5[li] = Math.pow(q, 5) * T.kalin; L16[li] = Math.pow(q, 1.6) * 0.3; L14[li] = Math.pow(q, 14) * T.ince; }
  var z = _rgb(T.zemin), dm = _rgb(T.damar), ik = _rgb(T.ikincil), dz = _rgb(T.derz), ts = karo ? n / karo : n, d = Math.max(2, Math.round(n * 0.006)), nh = nf, hs = n / nh, yuk = new Float32Array(nh * nh), K6 = 6.283185 / n;
  var map = alanDokusu(n, yuk, function (v0, x, y) {
    var lx = x % ts, ly = y % ts, hi = ((y / hs) | 0) * nh + ((x / hs) | 0), ti = ((y >> kay) * nf) + (x >> kay);
    if (karo && (lx < d || ly < d)) { yuk[hi] = 0.2; var kd = (tane[ti] - 0.5) * 10; return [dz[0] + kd, dz[1] + kd, dz[2] + kd]; }   // derz: çukur + hafif tane
    var ci = (x / ts) | 0, cj = (y / ts) | 0, u = ((lx + ci * 0.37 * n + cj * 0.13 * n) % n) | 0, w = ((ly + cj * 0.61 * n + ci * 0.29 * n) % n) | 0;
    if ((ci + cj) & 1) { var tmp = u; u = w; w = tmp; }   // tek karolar damar alanını 90° çevrilmiş örnekler
    var j = ((w >> kay) * nf) + (u >> kay), s1 = 1 - Math.abs(Math.sin((u + w) * K6 + t1[j] * 3.5)), s2 = 1 - Math.abs(Math.sin((u * 5 + w * 3) * K6 + t2[j] * 9));
    var v1 = L5[(s1 * L) | 0], h1 = L16[(s1 * L) | 0], v2 = L14[(s2 * L) | 0];   // ana damar: sin sıfırı çevresinde dar koyu çizgi + geniş yumuşak hale (h1), türbülansla kıvrılır (ilk deneme 2×daha sık ve halesiz damar «çatlak» okunuyordu — oda render'ı); ince damar daha dar ve sık
    var m1 = Math.min(1, v2 + h1 + v1 * 0.3), b = (bul[j] - 0.5) * 255 * T.bulut + (tane[ti] - 0.5) * 6;
    yuk[hi] = 1 - v1 * 0.08;
    return [(z[0] + (ik[0] - z[0]) * m1) * (1 - v1) + dm[0] * v1 + b, (z[1] + (ik[1] - z[1]) * m1) * (1 - v1) + dm[1] * v1 + b, (z[2] + (ik[2] - z[2]) * m1) * (1 - v1) + dm[2] * v1 + b];   // karisim(karisim(z, ik, m1), dm, v1) açılmış hâli
  });
  return { map: map, yukseklik: alanDokusu(nh, yuk, function (v) { var k = v * 255; return [k, k, k]; }, false), tur: T };   // yükseklik 512: derz + hafif damar çöküğü için yeter
}
function mermerMalzeme(tur, s) {   // TABAN: 'beyaz' (Carrara) | 'bej' (traverten) — siyah Nero 27.09 kullanıcı kararıyla ÇIKTI («beğenmedim»); s = { karo: 0 (tek levha: tezgâh, sütun, kaide) | 2 (ZEMİN: 2×2 derzli karo, karo 1,2 birim ≈ 40 cm), cila: 'parlak' (varsayılan) | 'mat' (honlanmış), tohum }
  s = s || {}; var karo = s.karo || 0, mat = s.cila === 'mat', D = mermerDokusu(tur, karo >= 2 ? 1024 : 512, karo, s.tohum);
  var m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: D.map, metalness: 0, roughness: mat ? 0.45 : 0.12,
    normalMap: normalDokusu(D.yukseklik, 1.4), normalScale: new THREE.Vector2(0.3, 0.3),   // derz çukuru + damar çok hafif çökük; cilalı yüzey düzdür
    clearcoat: mat ? 0 : 0.8, clearcoatRoughness: 0.08, envMapIntensity: 1 });
  m.userData.sabitKaro = karo ? 1.2 * karo : 2.4; return m;   // karo başına 1,2 birim; levha 2,4 birim
}
var MOZAIK_TURLERI = {   // cimento = bağlayıcı, taslar = kırıntı renkleri, iri = en büyük kırıntı yarıçapı (doku kesri), karo = doku başına dökme plaka (ince çizgi), roughness/clearcoat
  gri:    { cimento: '#b4b0a7', taslar: ['#e8e3d9', '#d6d0c4', '#9e988f', '#cabfae', '#7e7a73', '#e8e3d9'], iri: 0.02, karo: 2, roughness: 0.35, clearcoat: 0.3 },   // OKUL KORİDORU mozaiği: açık gri çimento, açık-orta tonlu seyrek kırıntı, 2×2 plaka (27.09 kullanıcı: «soft, temiz, göze güzel gelmeli» — siyah kırıntı ve sık benek kalktı; ilk sürüm gürültü, ikincisi sert okunuyordu)
  krem:   { cimento: '#d6ccb9', taslar: ['#f3ece0', '#c4a67e', '#a68764', '#e6d4b4', '#8f7c68', '#f3ece0'], iri: 0.02, karo: 2, roughness: 0.32, clearcoat: 0.35 },     // sıcak krem-kahve, yumuşak
  renkli: { cimento: '#ebe7df', taslar: ['#d98577', '#7fa7c9', '#e3c77c', '#8fbf9c', '#8b8a8f', '#f2eee6'], iri: 0.028, karo: 0, roughness: 0.28, clearcoat: 0.45 }    // Venedik terrazzo: açık zemin, PASTEL renkli kırıntı (doygun renk sert okunuyordu)
};
function mozaikDokusu(tur, n, tohum) {   // → { map, yukseklik, tur }: çimento zemine deterministik dağılmış çokgen kırıntılar (kenara taşan karşı kenarda da çizilir: döşenebilir) + ince plaka çizgisi
  var T = MOZAIK_TURLERI[tur] || MOZAIK_TURLERI.gri; n = n || 512; var r = _lcg(211 + (tohum || 0) * 17), R = n * T.iri, adet = Math.round(n * n / 520);
  var c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d'), hc = document.createElement('canvas'); hc.width = hc.height = n; var hg = hc.getContext('2d');
  g.fillStyle = T.cimento; g.fillRect(0, 0, n, n); hg.fillStyle = '#e0e0e0'; hg.fillRect(0, 0, n, n); hg.fillStyle = '#f4f4f4';
  if (T.karo) { var cr = _rgb(T.cimento), pts = n / T.karo; for (var py = 0; py < T.karo; py++) for (var px = 0; px < T.karo; px++) { var pt = (r() - 0.5) * 8; g.fillStyle = 'rgb(' + Math.round(cr[0] + pt) + ',' + Math.round(cr[1] + pt) + ',' + Math.round(cr[2] + pt) + ')'; g.fillRect(px * pts, py * pts, pts, pts); } }   // plaka başına çimento tonu farkı: döküm plakaları ayrışır
  for (var k = 0; k < adet; k++) {
    var cx = r() * n, cy = r() * n, rad = R * (0.3 + Math.pow(r(), 1.4) * 0.7), kose = 5 + Math.floor(r() * 3), don = r() * 6.283, kr = _rgb(T.taslar[Math.floor(r() * T.taslar.length)]), t = (r() - 0.5) * 16, yol = [];
    for (var q = 0; q < kose; q++) { var a = don + q / kose * 6.283, rr = rad * (0.7 + r() * 0.5); yol.push([Math.cos(a) * rr, Math.sin(a) * rr * (0.6 + r() * 0.5)]); }
    g.fillStyle = 'rgb(' + Math.round(kr[0] + t) + ',' + Math.round(kr[1] + t) + ',' + Math.round(kr[2] + t) + ')';
    [[0, 0], [-n, 0], [n, 0], [0, -n], [0, n]].forEach(function (o) { var px0 = cx + o[0], py0 = cy + o[1]; if (px0 + R < 0 || px0 - R > n || py0 + R < 0 || py0 - R > n) return;   // yalnız kadraja giren kopya
      [g, hg].forEach(function (ctx) { ctx.beginPath(); for (var q2 = 0; q2 < kose; q2++) { var px = px0 + yol[q2][0], py = py0 + yol[q2][1]; if (q2) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.closePath(); ctx.fill(); }); });
  }
  if (T.karo) { var ts = n / T.karo, lw = Math.max(1.5, n / 300); g.strokeStyle = 'rgba(70,65,60,0.4)'; hg.strokeStyle = '#707070'; g.lineWidth = hg.lineWidth = lw;
    for (var l = 0; l <= T.karo; l++) { var p = l * ts; [g, hg].forEach(function (ctx) { ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, n); ctx.moveTo(0, p); ctx.lineTo(n, p); ctx.stroke(); }); } }   // plaka çizgisi: 0 ve n'de yarım kalınlık → döşenince tek tam çizgi
  _tane(g, n, 8, 223 + (tohum || 0), 8, 6);
  return { map: _dokuYap(c, true), yukseklik: _dokuYap(hc, false), tur: T };
}
function mozaikMalzeme(tur, tohum) {   // TABAN: 'gri' (okul koridoru, varsayılan) | 'krem' | 'renkli' (Venedik terrazzo); odaKur(scene, { zeminMat: mozaikMalzeme('gri') }); doku karosu SABİT 1,8 birim (512 px; kırıntı 1-4 cm)
  var D = mozaikDokusu(tur, 512, tohum), T = D.tur;
  var m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: D.map, metalness: 0, roughness: T.roughness,
    normalMap: normalDokusu(D.yukseklik, 0.8), normalScale: new THREE.Vector2(0.18, 0.18),   // cilalı mozaik düzdür: kırıntı kenarı ancak seçilir, plaka çizgisi hafif çukur
    clearcoat: T.clearcoat, clearcoatRoughness: 0.15, envMapIntensity: 1 });
  m.userData.sabitKaro = 1.8; return m;
}
function parkeMalzeme(tur, cila, tohum) {   // TAHTA PARKE / LAMİNAT ZEMİN: şaşırtmalı tahtalar (8 sıra × 30-60 cm), her tahta ahşap dokusundan farklı yerden kesilir + tahta başına ton farkı + derz ve pah ışığı; tur YALNIZ açık türler: 'kayin' (varsayılan) | 'hus' | 'cam' | 'bambu' (koyu tür kayına döner), cila 'mat' | 'vernik' (varsayılan) | 'lake'; tohum farklı döşeme. Damar tahta BOYUNCA (u); yuzeyDoku uzun kenara çevirir. Doku karosu SABİT 3,6 birim (1024 px → 284 px/birim)
  tur = { hus: 1, kayin: 1, cam: 1, bambu: 1 }[tur] ? tur : 'kayin';   // ZEMİN AÇIK TONDUR (27.09 kullanıcı: «koyu renkler güzel gelmedi»): meşe/ceviz/maun/abanoz/eski istense de açık kayına döner
  var n = 1024, sira = 8, bh = n / sira, D = ahsapDokusu(tur, 512, tohum), r = _lcg(131 + (tohum || 0) * 19), T = AHSAP_TURLERI[tur];
  var c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d'), desen = g.createPattern(D.map.image, 'repeat'), derz = Math.max(1.5, n / 500);
  function tahta(x, y, L) {   // tek tahta: desen kaydırması + ton + pah + derz; kenardan taşan tahta karşı kenarda da çizilir (desen periyodu 512, n = 1024 → aynı hizada)
    var sx = Math.floor(r() * 512), sy = Math.floor(r() * 512), ton = (r() - 0.5) * 0.26;
    [x, x - n, x + n].forEach(function (x0) { if (x0 + L < 0 || x0 > n) return;
      g.save(); g.translate(x0 - sx, y - sy); g.fillStyle = desen; g.fillRect(sx, sy, L, bh); g.restore();
      g.fillStyle = ton > 0 ? 'rgba(255,236,208,' + ton.toFixed(3) + ')' : 'rgba(35,18,6,' + (-ton).toFixed(3) + ')'; g.fillRect(x0, y, L, bh);
      g.fillStyle = 'rgba(255,240,220,0.22)'; g.fillRect(x0, y + derz, L, 1);                      // üst kenar pah ışığı (V-oluk)
      g.fillStyle = 'rgba(30,16,6,0.62)'; g.fillRect(x0, y, L, derz); g.fillRect(x0, y, derz, bh); });   // derz: üst ve sol kenar
  }
  for (var s = 0; s < sira; s++) { var x = -Math.floor(r() * 0.5 * n); while (x < n) { var L = Math.round(n * (0.25 + r() * 0.25)); tahta(x, s * bh, L); x += L; } }
  var map = _dokuYap(c, true), cilali = cila !== 'mat';
  var m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: map, normalMap: normalDokusu(map, 1.2), normalScale: new THREE.Vector2(0.5, 0.5), metalness: 0,   // normal renkten: derz ve damar çukur, pah ışığı sırt
    roughness: cilali ? (cila === 'lake' ? 0.22 : 0.32) : T.roughness, clearcoat: cilali ? (cila === 'lake' ? 0.8 : 0.4) : 0, clearcoatRoughness: cila === 'lake' ? 0.1 : 0.3, envMapIntensity: 0.6 });
  m.userData.sabitKaro = 3.6; return m;
}
var KAGIT_DESENLERI = {   // tip: zemin/desen rengi, hucre = doku başına desen tekrarı (baklava ÇİFT: kafes n/2 kaydırmayla döşenir)
  cizgi:   { zemin: '#e9e3d6', desen: '#cdc3b1', hucre: 6 },    // dikey bant + ince çizgi (klasik)
  baklava: { zemin: '#e3e7e5', desen: '#aab6b1', hucre: 6 },    // baklava kafesi + düğüm noktası (geometrik)
  yaprak:  { zemin: '#efe9dc', desen: '#8da486', hucre: 4 },    // yarım kaydırmalı yaprak dalı (botanik)
  duz:     { zemin: '#e6e0d3', desen: '#e6e0d3', hucre: 1 }     // düz dokulu vinil (yalnız kâğıt tanesi + lif)
};
function duvarKagidiDokusu(tip, zemin, desen, tohum) {   // → { map, yukseklik }: 512 px döşenebilir desen + kâğıt tanesi/lifi; desen kabartmalı (yükseklik dokusu); zemin/desen '#hex' tabloyu ezer
  var T = KAGIT_DESENLERI[tip] || KAGIT_DESENLERI.cizgi, n = 512, h = n / T.hucre, Dk = desen || T.desen;
  var c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d'); g.fillStyle = zemin || T.zemin; g.fillRect(0, 0, n, n);
  var hc = document.createElement('canvas'); hc.width = hc.height = n; var hg = hc.getContext('2d'); hg.fillStyle = '#808080'; hg.fillRect(0, 0, n, n);
  g.fillStyle = g.strokeStyle = Dk; hg.fillStyle = hg.strokeStyle = '#ffffff';
  function ikisi(f) { f(g); f(hg); }
  if (tip === 'cizgi') { for (var i = 0; i < T.hucre; i++) { var x0 = i * h; ikisi(function (q) { q.fillRect(x0, 0, h * 0.42, n); q.fillRect(x0 + h * 0.62, 0, n / 200, n); q.fillRect(x0 + h * 0.72, 0, n / 200, n); }); } }   // geniş bant + iki ince çizgi
  else if (tip === 'baklava') { var m = T.hucre / 2; ikisi(function (q) { q.lineWidth = Math.max(1.5, n / 300); q.beginPath();
      for (var k = -m; k <= T.hucre + m; k++) { q.moveTo(k * h, 0); q.lineTo((k + m) * h, n); q.moveTo(k * h, 0); q.lineTo((k - m) * h, n); } q.stroke();   // eğim n/(m·h) = 2: y = n'de kayma m·h → döşenebilir
      for (var j = 0; j <= T.hucre; j++) for (var kk = -1; kk <= T.hucre; kk++) { q.beginPath(); q.arc(kk * h + (j % 2) * h / 2, j * n / T.hucre, n / 140, 0, 6.283); q.fill(); } }); }   // düğüm noktaları
  else if (tip === 'yaprak') { for (var col = 0; col < T.hucre; col++) for (var row = 0; row <= T.hucre; row++) { if (col % 2 && row === T.hucre) continue;
      var cx = col * h + h / 2, cy = row * h + (col % 2) * h / 2, L = h * 0.38;   // yarım kaydırma: çift sütunda kenara oturan motif (row 0 ve hucre) iki kez çizilir → döşenince tam
      ikisi(function (q) { q.lineWidth = Math.max(1.2, n / 400); q.beginPath(); q.moveTo(cx, cy + L); q.quadraticCurveTo(cx + h * 0.06, cy, cx, cy - L); q.stroke();   // sap
        for (var y = 0; y < 3; y++) { var py = cy + L * 0.6 - y * L * 0.55, uz = h * (0.2 - y * 0.03); [-1, 1].forEach(function (yon) {   // üç çift yaprak, uca doğru küçülür
          q.beginPath(); q.moveTo(cx, py); q.quadraticCurveTo(cx + yon * uz * 0.9, py - uz * 0.25, cx + yon * uz * 1.3, py - uz * 0.9); q.quadraticCurveTo(cx + yon * uz * 0.4, py - uz * 0.55, cx, py); q.fill(); }); } }); } }
  _tane(g, n, 6, 331 + (tohum || 0), 0, 0);
  var img = g.getImageData(0, 0, n, n), p = img.data, lif = gurultuAlani(n, 3, n >> 1, 337 + (tohum || 0));   // dikey kâğıt lifi
  for (var q2 = 0; q2 < n * n; q2++) { var sv = (lif[q2] - 0.5) * 5; p[q2 * 4] += sv; p[q2 * 4 + 1] += sv; p[q2 * 4 + 2] += sv; } g.putImageData(img, 0, 0);
  return { map: _dokuYap(c, true), yukseklik: _dokuYap(hc, false) };
}
function duvarKagidiMalzeme(tip, zemin, desen, tohum) {   // TABAN: 'cizgi' | 'baklava' | 'yaprak' | 'duz'; zemin/desen '#hex' isteğe bağlı (paletten pastel ton); odaKur(scene, { duvarMat: duvarKagidiMalzeme('cizgi') }). Doku karosu SABİT 1 birim (≈ 33 cm: çizgi 5,5 cm, baklava 5,5 cm, yaprak hücresi 8 cm); YALNIZ duvara
  var D = duvarKagidiDokusu(tip, zemin, desen, tohum);
  var m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: D.map, metalness: 0, roughness: 0.92,
    normalMap: normalDokusu(D.yukseklik, 1.0), normalScale: new THREE.Vector2(0.2, 0.2) });   // kabartmalı desen + kâğıt tanesi; parlaklık yok (vinil bile mat okunur)
  m.userData.sabitKaro = 1; return m;
}
function haliMalzeme(renk, tohum) {   // DUVARDAN DUVARA / DÜZ HALI (sınıf, ev, oyun köşesi): kısa ilmekli hav — sık ince tane + lif + geniş yumuşak leke; sheen ile hav kenar parlaması. renk '#hex' (varsayılan açık bej-gri; koyu renk açığa kaldırılır). Doku karosu SABİT 0,6 birim (512 px). Bordürlü kilim reçetedeki kilimDoku ile (tek parça, döşenmez)
  var R = _rgb(renk || '#c9c1b3'), P = R[0] * 0.3 + R[1] * 0.59 + R[2] * 0.11;   // ZEMİN AÇIK TON (27.09): parlaklık 170'in altındaysa açık kreme doğru kaldırılır, ton korunur
  if (P < 170) R = karisim(R, [245, 240, 232], (170 - P) / (245 - P));
  var n = 512, s = (tohum || 0) * 23, ilmek = gurultuAlani(n, n >> 2, n >> 2, 301 + s), lif = gurultuAlani(n, n >> 1, n >> 3, 303 + s), leke = fbmAlani(n, 3, 3, 307 + s), yuk = new Float32Array(n * n);
  var map = alanDokusu(n, ilmek, function (v, x, y) { var i = y * n + x, k = (v - 0.5) * 26 + (lif[i] - 0.5) * 10 + (leke[i] - 0.5) * 14; yuk[i] = v * 0.7 + lif[i] * 0.3; return [R[0] + k, R[1] + k, R[2] + k]; });
  var sc = karisim(R, [255, 255, 255], 0.35);
  var m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: map, metalness: 0, roughness: 1,
    normalMap: normalDokusu(alanDokusu(n, yuk, function (v) { var k = v * 255; return [k, k, k]; }, false), 1.4), normalScale: new THREE.Vector2(0.5, 0.5),   // ilmek kabartısı
    sheen: 0.6, sheenRoughness: 0.85, sheenColor: new THREE.Color().setRGB(sc[0] / 255, sc[1] / 255, sc[2] / 255, THREE.SRGBColorSpace) });   // sheenColor tabanın 2 kademe açığı (kumas-deri ölçüsü)
  m.userData.sabitKaro = 0.6; return m;
}
function devreDoku(n, zemin, iz, izSayisi, padKume, renkli) {   // devre kartı: Manhattan iz yolları + pad'ler + lehim noktaları; renkli=false → roughness verisi (iz koyu)
  n = n || 512; izSayisi = izSayisi || 24; padKume = padKume || 4; var c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d'), r = _lcg(83);
  g.fillStyle = zemin || '#1e6b3a'; g.fillRect(0, 0, n, n); g.strokeStyle = iz || '#c9aa3c'; g.fillStyle = iz || '#c9aa3c'; g.lineWidth = Math.max(1.5, n / 220); g.lineCap = 'round';
  for (var k = 0; k < izSayisi; k++) { var x = r() * n, y = r() * n; g.beginPath(); g.moveTo(x, y);
    for (var s = 0; s < 4; s++) { var uz = (0.08 + r() * 0.22) * n; if (r() < 0.5) x += (r() < 0.5 ? -uz : uz); else y += (r() < 0.5 ? -uz : uz); g.lineTo(x, y); }
    g.stroke(); g.beginPath(); g.arc(x, y, g.lineWidth * 1.6, 0, 6.283); g.fill(); }
  for (var p = 0; p < padKume; p++) { var px = r() * n, py = r() * n, adet = 4 + Math.floor(r() * 6), yatay = r() < 0.5;
    for (var q = 0; q < adet; q++) { var ax = yatay ? px + q * n * 0.028 : px, ay = yatay ? py : py + q * n * 0.028; g.fillRect(ax - n * 0.008, ay - n * 0.008, n * 0.016, n * 0.016); } }
  var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (renkli !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.userData.malzeme3b = true; return t;
}
function filmKalinlik(n) {   // sabun köpüğü film kalınlığı haritası (iridescenceThicknessMap, G kanalı): fBm dağılım → gökkuşağı bantları; veri dokusu
  n = n || 256; return alanDokusu(n, fbmAlani(n, 4, 3, 77), function (v) { var k = v * 255; return [k, k, k]; }, false);
}
function kontakGolgesi(yaricap, koyuluk) {   // zemine oturan nesnenin altına temas gölgesi (AO yerine): radyal gradyan disk; gölge haritası nesne altını boş bırakır, nesne «yüzer» (ölçüldü)
  var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  var m = new THREE.Mesh(new THREE.PlaneGeometry((yaricap || 0.5) * 2.4, (yaricap || 0.5) * 2.4),
    new THREE.MeshBasicMaterial({ map: (function () { var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), transparent: true, opacity: koyuluk == null ? 0.5 : koyuluk, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = -1; return m;   // konum: nesnenin altı, y = zemin + 0.002; transparent olduğundan kırıcı nesnenin arkasından görünmez — zemindedir, sorun değil
}
function fonDegradesi(ust, alt) {   // scene.background = fonDegradesi('#cfd8de', '#9fadb8'): dikey degrade fon (tek düz renk yerine derinlik); sRGB doku ton eşlemeden geçmez (r155), renk birebir görünür
  var c = document.createElement('canvas'); c.width = 2; c.height = 256;
  var g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, ust || '#cfd8de'); gr.addColorStop(1, alt || '#9fadb8');   // ORTA TON mavi-gri (27.09: eski #f4efe8→#e6ddd1 beyazdı, fon medyanı 240/255)
  g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function sonsuzFon(genislik, yukseklik, kavis, renk) {   // zeminin ARKA kenarına oturan kavis + duvar (stüdyo fonu): boşlukta biten zemin ve sert ufuk çizgisi olmaz. fon.position.z = -zeminDerinligi / 2 — kavis y=0'da zemine teğet başlar, zeminle aynı düzleme BİNMEZ; userData.fon: kadraj emniyeti saymaz
  genislik = genislik || 24; yukseklik = yukseklik || 10; kavis = kavis || Math.min(3, yukseklik / 3);
  var pr = [[0, 0]], n = 18, i, j, a;
  for (i = 1; i <= n; i++) { a = i / n * Math.PI / 2; pr.push([-Math.sin(a) * kavis, kavis - Math.cos(a) * kavis]); }
  pr.push([-kavis, yukseklik]);
  var L = [0]; for (j = 1; j < pr.length; j++) L.push(L[j - 1] + Math.hypot(pr[j][0] - pr[j - 1][0], pr[j][1] - pr[j - 1][1]));
  var poz = [], uv = [], ind = [];
  for (j = 0; j < pr.length; j++) for (i = 0; i < 2; i++) { poz.push((i - 0.5) * genislik, pr[j][1], pr[j][0]); uv.push(i, L[j] / L[L.length - 1]); }
  for (j = 0; j < pr.length - 1; j++) { a = j * 2; ind.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(ind); geo.computeVertexNormals();
  var m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: renk || '#b7c2ca', roughness: 0.92, metalness: 0 }));
  m.receiveShadow = true; m.userData.fon = true; return m;
}
function odaKur(scene, s) {   // ODA (2026-09-27 kullanıcı: «küçük zemin yerine ya oda ya sergi; odada duvar ve zemin dokuları bulunmalı»): dokulu zemin + DÜZ köşeli dokulu duvarlar (arka + iki yan; kavis YOK) + süpürgelik. Duvarlar içe bakar (FrontSide): kamera odanın dışına dönünce aradaki duvar çizilmez; duvarlar tıklamayı yutmaz. STANDART LABORATUVAR (13.10 kullanıcı: «kapı, pencere, zemin standart olmalı; lab aynen kullansın, materyalleri değiştiremesin»): açık laminat zemin + sıva duvar + arka duvar solunda EBA tabelalı ahşap kapı + sağında ahşap pencere HAZIR gelir; malzeme seçeneği YOK (zeminMat / duvarMat / zemin / duvar yazılsa da yok sayılır). Aydınlatma kalıbı sahneAmbiyansi ile konuya göre seçilir (karanlık deney → 'karanlik'). ÖLÇÜ SABİT: 14×10×5 birim (7×5×2,5 m; 13.10 «ebatlar hep aynı»), dört duvar, tavansız — genislik/derinlik/yukseklik yazılsa da yok sayılır; nesneleri x ∈ [−7, 7], z ∈ [−5, 5] içinde, y = 0 zemine koy. s = { merkez: THREE.Vector3 (zemin ortası; y = zemin kotu), kapi: false | { duvar, konum, tabela }, pencere: false | { duvar, konum, altKot, genislik, yukseklik } }. Dönüş { grup, zemin, duvarlar, supurgelik, kapi, pencere, genislik, derinlik, yukseklik }
  s = _izinli(s, ['merkez', 'kapi', 'pencere']);   // STANDART ODA (13.10 «odanın ebatları da hep aynı olsun»): ölçü / duvar / tavan / malzeme seçenekleri düşer — 14×10×5 birim (7×5×2,5 m), dört duvar, tavansız
  var o = 1, W = 14, D = 10, H = 5, m = _vec3(s.merkez) || new THREE.Vector3(0, 0, 0);   // 14.10: dizi merkez de olur
  var grup = new THREE.Group(); grup.name = 'oda'; grup.position.copy(m);
  function siva(renk, genlik, tane, tohum) {   // sıva/boya: ORTA tane (≈9 mm) + ince tane (≈3 mm); karo içinde GENİŞ leke YOK (13.10 kullanıcı: «duvar dokusunda tekrar belli oluyor» — 3 hücreli kaba oktav 35 cm karoda kafes gibi tekrarlıyordu). Geniş dalgalanmayı duvar boyu TEK karo gerilen tekrarKir leke haritası verir (tekrarlamaz); uzaktan mip'te ince taneler düzleşir, duvar sade okunur
    var n = 512, orta = gurultuAlani(n, 40, 40, tohum), ince = gurultuAlani(n, 128, 128, tohum + 2), c = _rgb(renk);
    var doku = alanDokusu(n, orta, function (v, x, y) { var k = (v - 0.5) * genlik + (ince[y * n + x] - 0.5) * tane; return [c[0] + k, c[1] + k, c[2] + k]; });
    return new THREE.MeshStandardMaterial({ color: 0xffffff, map: doku, roughness: 0.9, metalness: 0,
      normalMap: normalHaritasi(n, ince, 1.0), normalScale: new THREE.Vector2(0.35, 0.35) });
  }
  var PHz = (typeof window !== 'undefined' && window.PH_DOKU) ? window.PH_DOKU.laminate_floor_02 : null;   // STANDART ZEMİN: açık laminat (montaj odaKur geçen sayfaya laminate_floor_02 gömer; parlaklık phMalzeme tablosundan); gömülmemişse şaşırtmalı kayın parke
  var zMat = (PHz && typeof phMalzeme === 'function') ? phMalzeme('laminate_floor_02', { puruz: 0.7, normal: 0.5 }) : parkeMalzeme('kayin', 'vernik');
  var dMat = siva('#cfc6b8', 9, 9, 71);   // STANDART DUVAR: sıva (27.09 genlik 24 → 14, 13.10 kaba oktav kaldırıldı: karo başına tekrarlayan leke periyodik okunuyordu; büyük dalgalanmayı tekrarKir verir)
  var K = Math.max(0.8, Math.min(2, Math.min(W, H) / 4)), zD = D * 1.6;   // zemin kameraya doğru uzar: ön kenarı kadraja girmez
  var zemin = new THREE.Mesh(new THREE.PlaneGeometry(W, zD), yuzeyDoku(zMat, W, zD, Math.min(K, 1.2)));
  zemin.rotation.x = -Math.PI / 2; zemin.position.set(0, 0, -D / 2 + zD / 2); zemin.receiveShadow = true; zemin.name = 'oda_zemin'; zemin.userData._m3bOlcekli = true; tekrarKir(zemin, 0.45); grup.add(zemin);
  var duvarlar = [];
  function duvar(g, h, x, z, ry, ad) {
    var d = new THREE.Mesh(new THREE.PlaneGeometry(g, h), yuzeyDoku(dMat, g, h, s.duvarKaro || 0.7, false));   // 13.10: sıva karosu 35 cm (K ≈ 62 cm'de tane 8 mm okunuyordu — «duvar dokusu çok büyük»)
    d.position.set(x, h / 2, z); d.rotation.y = ry; d.receiveShadow = true; d.name = ad; d.raycast = function () {}; d.userData._m3bOlcekli = true; tekrarKir(d, 0.6);
    grup.add(d); duvarlar.push(d);
  }
  var yan = true;   // dört duvar sabit
  duvar(W, H, 0, -D / 2, 0, 'oda_arka_duvar');
  if (yan) { duvar(D, H, -W / 2, 0, Math.PI / 2, 'oda_sol_duvar'); duvar(D, H, W / 2, 0, -Math.PI / 2, 'oda_sag_duvar'); }
  if (s.onDuvar !== false) duvar(W, H, 0, D / 2, Math.PI, 'oda_on_duvar');   // 13.10 kullanıcı: «dört tarafı kapalı olsun» — içe bakar; dışarıdaki kamera arka yüzünü görmez (kırpılır), içerideki kamera boşluk görmez
  if (s.tavan) { var tv = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.95 })); tv.rotation.x = Math.PI / 2; tv.position.y = H; tv.name = 'oda_tavan'; tv.raycast = function () {}; grup.add(tv); }
  var sMat = new THREE.MeshStandardMaterial({ color: 0x8d857a, roughness: 0.6, metalness: 0 }), sh = Math.min(0.14 * o, H * 0.03), sd = 0.03 * o, p = 0.01 * o;
  var supurgelik = new THREE.Group(); supurgelik.name = 'oda_supurgelik';
  function cita(uz, x, z, ry, ad) {   // duvardan 1 cm, zeminden 2 mm ayrı (eş düzlem yok); köşelerde üst üste binmez; adı odaKapi'nin kesmesi için (13.10)
    var c = new THREE.Mesh(new THREE.BoxGeometry(uz, sh, sd), sMat); c.position.set(x, sh / 2 + 0.002, z); c.rotation.y = ry;
    c.receiveShadow = true; c.raycast = function () {}; c.name = 'supurgelik_' + ad; supurgelik.add(c);
  }
  cita(yan ? W - 2 * (sd + p + 0.002) : W, 0, -D / 2 + sd / 2 + p, 0, 'arka');
  if (yan) { cita(D, -W / 2 + sd / 2 + p, 0, Math.PI / 2, 'sol'); cita(D, W / 2 - sd / 2 - p, 0, Math.PI / 2, 'sag'); }
  if (s.onDuvar !== false) cita(yan ? W - 2 * (sd + p + 0.002) : W, 0, D / 2 - sd / 2 - p, 0, 'on');
  grup.add(supurgelik); grup.userData.oda = true; scene.add(grup);
  var oda = Object.assign(grup, { grup: grup, zemin: zemin, duvarlar: duvarlar, supurgelik: supurgelik, genislik: W, derinlik: D, yukseklik: H, kapi: null, pencere: null });   // dönüş = grubun kendisi (+ alanlar): ajan oda.add / oda.traverse / oda.position da yazabilir (13.10: düz nesne JS hatasına yol açtı)
  // STANDART KAPI + PENCERE (13.10): arka duvarda merkezin SOLUNDA (−%28) ahşap kapı (EBA tabelası), SAĞINDA (+%28) pencere — orta boş kalır, tipik kadrajda ikisi de görünür; dar odada (W < 9) kapı sol, pencere sağ duvara geçer. kapi:false / pencere:false kapatır; kapi:{…} / pencere:{…} yalnız YERLEŞİM seçenekleri (malzeme yok). Ajan sonradan odaKapi/odaPencere çağırırsa standart olan döner (çift kapı açılmaz)
  var yanVar = yan && s.onDuvar !== false, dar = yanVar && W < 9;
  if (s.kapi !== false && typeof odaKapi === 'function') {
    var kp = Object.assign({ duvar: dar ? 'sol' : 'arka', konum: dar ? -D / 2 + 1.6 : -W * 0.28, tabela: 'LABORATUVAR', logo: true }, _izinli(s.kapi, ['duvar', 'konum', 'genislik', 'yukseklik', 'tabela', 'logo', 'kol'])); kp.oda = oda;
    oda.kapi = odaKapi(scene, kp);
  }
  if (s.pencere !== false && typeof odaPencere === 'function') {
    var pn = Object.assign({ duvar: dar ? 'sag' : 'arka', konum: dar ? -D / 2 + 2.4 : W * 0.28, altKot: 2 }, _izinli(s.pencere, ['duvar', 'konum', 'altKot', 'genislik', 'yukseklik', 'bolme'])); pn.oda = oda;
    oda.pencere = odaPencere(scene, pn);
  }
  return oda;
}
function odaTezgah(scene, s) {   // ÇALIŞMA DÜZLEMİ (oda içine; ölçüler BİRİM, 1 birim = 0,5 m): tur 'laboratuvar' (açık laminat üst, ön alın, alt raf, çekmece blokları) | 'sinif' (ahşap kaplama tabla, kuşak) | 'mutfak' (tek levha mermer üst, dolap gövdesi, kapak çizgileri, kulp, süpürgelik girintisi). s = { genislik: 6 (3 m), derinlik: 2.2, yukseklik: 1.8 (90 cm), merkez: THREE.Vector3 (zemin kotu), donus: y dönüşü (rad), ustMat: reçeteden tabla malzemesi, phDoku: Poly Haven kaplama ('white_oak_veneer' varsayılan; montaj gömer), ahsap: PH yoksa ahşap türü ('kayin'), ustRenk: laboratuvar laminat rengi ('#d3d6d8'), alinRenk, govdeRenk, ayakTip: 'kare' (40×40 profil, varsayılan) | 'ahsap' (tablayla aynı) | 'boru' (yuvarlak + H), ayak: 'satine' (açık gri çelik, varsayılan) | 'boya' (toz boya, ayakRenk), ayakRenk, raf: lab alt rafı (true), cekmece: ön çekmece sayısı (lab 2, sınıf 1), onAlin: lab ön bandı (true) }. Dönüş { grup, ust, ustKot }: nesneleri ustKot'a oturt; grup'a kendi parçalarını ekle (musluk, lavabo, priz…). KALIP DEĞİL BAŞLANGIÇTIR: türü, ölçüyü, malzemeyi, ayağı ve konumu sahneye göre seç; ardışık sayfalarda değiştir ki odalar aynı olmasın
  s = _izinli(s, ['tur', 'genislik', 'derinlik', 'yukseklik', 'merkez', 'donus']); var M = 2;   // birim/m — STANDART: malzeme / ayak / renk seçeneği yok (13.10 «sadece masayı seçsin»)
  var tur = s.tur || 'laboratuvar', G = s.genislik || (tur === 'sinif' ? 1.2 : 3.0) * M, D = s.derinlik || (tur === 'sinif' ? 0.6 : tur === 'mutfak' ? 0.6 : 1.1) * M, Y = s.yukseklik || (tur === 'sinif' ? 0.76 : 0.9) * M;
  s = _sayilastir(s, ['genislik', 'derinlik', 'yukseklik', 'donus']);   // 14.10: '7.2' gibi dizeler sayıya
  var mz = _vec3(s.merkez) || new THREE.Vector3(0, 0, 0), grup = new THREE.Group();   // 14.10: merkez [x,y,z] dizisi de olur (NaN ustKot vakası)
  grup.name = 'tezgah'; grup.position.copy(mz); grup.rotation.y = s.donus || 0;
  var K = (tur === 'sinif' ? 0.035 : 0.05) * M;
  var metal = (s.ayak === 'boya')
    ? new THREE.MeshStandardMaterial({ color: new THREE.Color(s.ayakRenk || '#e8eaec'), metalness: 0.15, roughness: 0.5 })
    : new THREE.MeshStandardMaterial({ color: new THREE.Color(s.ayakRenk || '#b7bcc2'), metalness: 0.7, roughness: 0.42, envMapIntensity: 1.2 });   // satine çelik (krom ayna «kötü gösteriyor» 13.10)
  var ustMat = s.ustMat, PH = (typeof window !== 'undefined' && window.PH_DOKU) ? window.PH_DOKU : null;
  if (!ustMat) {
    if (tur === 'laboratuvar') {
      var lam = gurultuDoku(512, s.ustRenk || '#d3d6d8', 0.05, 2);   // AÇIK laminat (koyu üst «beğenmedim»)
      ustMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: lam, roughness: 0.5, metalness: 0 }); ustMat.userData.sabitKaro = 1.2;
    } else if (tur === 'mutfak') ustMat = mermerMalzeme('beyaz');   // karo 0 = TEK LEVHA (derz «ek yeri belli»)
    else {
      var ph = s.phDoku || 'white_oak_veneer';
      ustMat = (PH && PH[ph] && typeof phMalzeme === 'function') ? phMalzeme(ph, { puruz: 0.55, normal: 0.5 }) : ahsapMalzeme(s.ahsap || 'kayin', 'vernik');
      if (ustMat.normalScale) ustMat.normalScale.set(0.3, 0.3);
    }
  }
  var ust = new THREE.Mesh(new THREE.BoxGeometry(G, K, D), kutuDoku(ustMat, G, K, D, 0.6, s.damar));
  ust.position.y = Y - K / 2; ust.castShadow = ust.receiveShadow = true; ust.name = 'tezgah_ust'; grup.add(ust);
  function kutu(g, y, d, mat, x, yy, z, ad) { var b = new THREE.Mesh(new THREE.BoxGeometry(g, y, d), mat); b.position.set(x, yy, z); b.castShadow = b.receiveShadow = true; if (ad) b.name = ad; grup.add(b); return b; }
  var tip = s.ayakTip || 'kare', ix = G / 2 - 0.12 * M, iz = D / 2 - 0.1 * M, ayakY = Y - K;
  function ayaklar() {
    [[-ix, -iz], [ix, -iz], [-ix, iz], [ix, iz]].forEach(function (p) {
      var a;
      if (tip === 'boru') a = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * M, 0.03 * M, ayakY, 28), metal);
      else if (tip === 'ahsap') a = new THREE.Mesh(new THREE.BoxGeometry(0.06 * M, ayakY, 0.06 * M), kutuDoku(ustMat, 0.06 * M, ayakY, 0.06 * M, 0.6, 'y'));
      else a = new THREE.Mesh(new THREE.BoxGeometry(0.045 * M, ayakY, 0.045 * M), metal);
      a.position.set(p[0], ayakY / 2, p[1]); a.castShadow = a.receiveShadow = true; a.name = 'tezgah_ayak'; grup.add(a);
    });
    if (tip === 'boru') [-ix, ix].forEach(function (x) {   // boru ayakta kısa kenar H bağlantısı
      var b = new THREE.Mesh(new THREE.CylinderGeometry(0.018 * M, 0.018 * M, D - 0.2 * M, 20), metal); b.rotation.x = Math.PI / 2; b.position.set(x, 0.16 * M, 0); b.castShadow = true; grup.add(b);
    });
  }
  if (tur === 'mutfak') {   // dolap gövdesi + kapak çizgileri + kulplar + süpürgelik girintisi
    kutu(G - 0.04 * M, Y - K - 0.1 * M, D - 0.06 * M, new THREE.MeshStandardMaterial({ color: new THREE.Color(s.govdeRenk || '#d8d3c9'), roughness: 0.7 }), 0, (Y - K - 0.1 * M) / 2 + 0.1 * M, -0.01 * M, 'tezgah_govde');
    kutu(G - 0.2 * M, 0.1 * M, D - 0.2 * M, new THREE.MeshStandardMaterial({ color: 0x4a4d50, roughness: 0.8 }), 0, 0.05 * M, -0.08 * M);
    var kapak = Math.max(2, Math.round(G / (0.6 * M))), kw = (G - 0.04 * M) / kapak, i;
    for (i = 1; i < kapak; i++) { var cz = new THREE.Mesh(new THREE.BoxGeometry(0.006 * M, Y - K - 0.14 * M, 0.01 * M), new THREE.MeshStandardMaterial({ color: 0x8c877d })); cz.position.set(-(G - 0.04 * M) / 2 + i * kw, (Y - K - 0.1 * M) / 2 + 0.1 * M, D / 2 - 0.035 * M); grup.add(cz); }
    for (i = 0; i < kapak; i++) { var kulp = new THREE.Mesh(new THREE.BoxGeometry(0.12 * M, 0.012 * M, 0.02 * M), metal); kulp.position.set(-(G - 0.04 * M) / 2 + (i + 0.5) * kw, Y - K - 0.22 * M, D / 2 - 0.02 * M); grup.add(kulp); }
  } else {
    ayaklar();
    var kusakY = (tur === 'sinif' ? 0.08 : 0.07) * M, kusakMat = kutuDoku(ustMat, G - 0.3 * M, kusakY, 0.03 * M, 0.6);
    if (tur === 'laboratuvar' && s.onAlin !== false) kutu(G, kusakY, 0.02 * M, new THREE.MeshStandardMaterial({ color: new THREE.Color(s.alinRenk || '#9aa0a6'), roughness: 0.5 }), 0, Y - K - kusakY / 2, D / 2 - 0.01 * M, 'tezgah_alin');
    else kutu(G - 0.3 * M, kusakY, 0.03 * M, kusakMat, 0, Y - K - kusakY / 2, iz - 0.02 * M);
    kutu(G - 0.3 * M, kusakY, 0.03 * M, kusakMat, 0, Y - K - kusakY / 2, -iz + 0.02 * M);
    [-ix, ix].forEach(function (x) { var yk = new THREE.Mesh(new THREE.BoxGeometry(0.03 * M, kusakY, D - 0.26 * M), kutuDoku(ustMat, 0.03 * M, kusakY, D - 0.26 * M, 0.6, 'z')); yk.position.set(x, Y - K - kusakY / 2, 0); yk.castShadow = true; grup.add(yk); });
    if (tur === 'laboratuvar' && s.raf !== false) kutu(G - 0.3 * M, 0.025 * M, D - 0.3 * M, kutuDoku(ustMat, G - 0.3 * M, 0.025 * M, D - 0.3 * M, 0.6), 0, 0.18 * M, 0, 'tezgah_raf');
    var cek = s.cekmece == null ? (tur === 'laboratuvar' ? 2 : 1) : s.cekmece, c;
    for (c = 0; c < cek; c++) {
      var bg = Math.min(0.6 * M, (G - 0.4 * M) / Math.max(1, cek) - 0.1 * M), bx = -G / 2 + 0.25 * M + c * ((G - 0.5 * M) / Math.max(1, cek)) + bg / 2, by = (tur === 'laboratuvar' ? 0.16 : 0.12) * M;
      kutu(bg, by, D - 0.3 * M, tur === 'laboratuvar' ? new THREE.MeshStandardMaterial({ color: new THREE.Color(s.govdeRenk || '#aeb3b8'), roughness: 0.6 }) : kutuDoku(ustMat, bg, by, D - 0.3 * M, 0.6), bx, Y - K - kusakY - by / 2, 0, 'tezgah_cekmece');
      if (tur === 'laboratuvar') { var sap = new THREE.Mesh(new THREE.BoxGeometry(bg * 0.4, 0.015 * M, 0.02 * M), metal); sap.position.set(bx, Y - K - kusakY - by / 2, D / 2 - 0.13 * M); grup.add(sap); }
    }
  }
  grup.userData.tezgah = true; scene.add(grup);
  return Object.assign(grup, { grup: grup, ust: ust, ustKot: mz.y + Y });   // dönüş = grubun kendisi (+ ust, ustKot): tezgah.add / tezgah.traverse çalışır (13.10 ölçüm: ajan Group sanıp çağırdı)
}
function duvarRaf(scene, s) {   // DUVAR RAFI (ölçüler BİRİM): ahşap kaplama tabla + iki satine çelik konsol; odaKur duvarına asılır. s = { duvar: 'arka' (varsayılan) | 'sol' | 'sag' | 'on', oda: odaKur dönüşü, konum: duvar boyunca kayma, yukseklik: raf üst kotu (3 = 1,5 m), genislik: 2.4, derinlik: 0.56, kalinlik: 0.06, ustMat / phDoku / ahsap (odaTezgah ile aynı), konsol: true, merkez+donus: duvar yerine serbest yerleşim }. Dönüş { grup, ust, ustKot }: kavanoz, kitap, model nesneleri ustKot'a oturt
  s = _izinli(s, ['duvar', 'oda', 'konum', 'merkez', 'donus', 'yukseklik', 'genislik', 'derinlik', 'kalinlik']); s.merkez = _vec3(s.merkez); s = _sayilastir(s, ['konum', 'donus', 'yukseklik', 'genislik', 'derinlik', 'kalinlik']); /* STANDART: malzeme seçeneği yok */ var M = 2, G = s.genislik || 1.2 * M, D = s.derinlik || 0.28 * M, K = s.kalinlik || 0.03 * M, Y = s.yukseklik || 1.5 * M;
  var grup = new THREE.Group(); grup.name = 'duvar_raf';
  var yer = _duvarYerlestir(grup, s, s.oda, 0); grup.position.y = Y - K / 2;
  if (!s.merkez) grup.translateZ(D / 2 + 0.005 * M);   // tabla duvardan 5 mm önde (eş düzlem yok)
  var ustMat = s.ustMat, PH = (typeof window !== 'undefined' && window.PH_DOKU) ? window.PH_DOKU : null;
  if (!ustMat) { var ph = s.phDoku || 'white_oak_veneer'; ustMat = (PH && PH[ph] && typeof phMalzeme === 'function') ? phMalzeme(ph, { puruz: 0.55, normal: 0.5 }) : ahsapMalzeme(s.ahsap || 'kayin', 'vernik'); if (ustMat.normalScale) ustMat.normalScale.set(0.3, 0.3); }
  var ust = new THREE.Mesh(new THREE.BoxGeometry(G, K, D), kutuDoku(ustMat, G, K, D, 0.6)); ust.castShadow = ust.receiveShadow = true; ust.name = 'raf_ust'; grup.add(ust);
  if (s.konsol !== false) {   // L konsol: duvara yaslı dikey + tablayı taşıyan yatay kol
    var kMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(s.konsolRenk || '#b7bcc2'), metalness: 0.7, roughness: 0.42 });
    [-G / 2 + 0.12 * M, G / 2 - 0.12 * M].forEach(function (x) {
      var kol = new THREE.Mesh(new THREE.BoxGeometry(0.03 * M, 0.025 * M, D - 0.04 * M), kMat); kol.position.set(x, -K / 2 - 0.0125 * M, 0.0); kol.castShadow = true; grup.add(kol);
      var dik = new THREE.Mesh(new THREE.BoxGeometry(0.03 * M, D * 0.8, 0.025 * M), kMat); dik.position.set(x, -K / 2 - D * 0.4, -D / 2 + 0.0125 * M); dik.castShadow = true; grup.add(dik);
    });
  }
  grup.userData.raf = true; scene.add(grup);
  return Object.assign(grup, { grup: grup, ust: ust, ustKot: grup.position.y + K / 2 });
}
function _duvarYerlestir(grup, s, oda, kalinlik) {   // grubu odaKur duvarına koyar: kök DUVAR DÜZLEMİNDE (z=0), +z odanın içine bakar. s.duvar 'arka'|'sol'|'sag'|'on'; s.konum duvar boyunca kayma; s.merkez+s.donus serbest yerleşim. Dönüş { oda, duvar: duvar mesh'i (varsa), yerelX: duvar-yerel x (delik için) }
  var o = _odaOlcusu(oda), d = s.duvar || 'arka', k = s.konum || 0, t = (kalinlik || 0) / 2;
  if (s.merkez) { grup.position.copy(s.merkez); grup.rotation.y = s.donus || 0; return { oda: o, duvar: null, yerelX: 0 }; }
  var yerelX = k;
  if (d === 'sol') { grup.position.set(-o.genislik / 2 + t, 0, k); grup.rotation.y = Math.PI / 2; yerelX = -k; }
  else if (d === 'sag') { grup.position.set(o.genislik / 2 - t, 0, k); grup.rotation.y = -Math.PI / 2; yerelX = k; }
  else if (d === 'on') { grup.position.set(k, 0, o.derinlik / 2 - t); grup.rotation.y = Math.PI; yerelX = -k; }
  else grup.position.set(k, 0, -o.derinlik / 2 + t);
  return { oda: o, duvar: _duvarBul(oda, d), yerelX: yerelX };
}
function _odaOlcusu(oda) {   // odaKur dönüşünden ya da {genislik, derinlik, yukseklik} nesnesinden oda ölçüsü
  if (oda && oda.grup) {
    var a = oda.duvarlar && oda.duvarlar[0], y = oda.duvarlar && oda.duvarlar[1];
    var ap = a ? (a.userData.duvarOlcu || a.geometry.parameters) : null, yp = y ? (y.userData.duvarOlcu || y.geometry.parameters) : null;
    return { genislik: ap ? ap.width : 14, derinlik: yp ? yp.width : 10, yukseklik: ap ? ap.height : 5 };
  }
  return oda || { genislik: 14, derinlik: 10, yukseklik: 5 };
}
function _duvarBul(oda, ad) { if (!oda || !oda.duvarlar) return null; var hedef = 'oda_' + ad + '_duvar'; for (var i = 0; i < oda.duvarlar.length; i++) if (oda.duvarlar[i].name === hedef) return oda.duvarlar[i]; return null; }
function _duvarDelik(duvar, cx, cy, g, y) {   // duvar düzlemine dikdörtgen DELİK (kapı/pencere duvarın İÇİNE oturur): PlaneGeometry → delikli ShapeGeometry; UV 0..1 düzlem UV'siyle aynı (doku karosu kaymaz), uv1/uv2 (tekrarKir aoMap) korunur, parameters (otoOlcek) taşınır. cx, cy duvar-yerel (merkez 0,0; y yukarı); delikler birikir
  if (!duvar || !duvar.geometry) return false;
  var ud = duvar.userData;
  if (!ud.duvarOlcu) { var p = duvar.geometry.parameters || {}; ud.duvarOlcu = { width: p.width || 14, height: p.height || 5 }; ud.delikler = []; }
  ud.delikler.push([cx, cy, g, y]);
  var W = ud.duvarOlcu.width, H = ud.duvarOlcu.height, sekil = new THREE.Shape();
  sekil.moveTo(-W / 2, -H / 2); sekil.lineTo(W / 2, -H / 2); sekil.lineTo(W / 2, H / 2); sekil.lineTo(-W / 2, H / 2); sekil.closePath();
  ud.delikler.forEach(function (d) {
    var h = new THREE.Path(), x0 = d[0] - d[2] / 2, x1 = d[0] + d[2] / 2, y0 = Math.max(-H / 2, d[1] - d[3] / 2), y1 = Math.min(H / 2, d[1] + d[3] / 2);
    h.moveTo(x0, y0); h.lineTo(x1, y0); h.lineTo(x1, y1); h.lineTo(x0, y1); h.closePath(); sekil.holes.push(h);
  });
  var geo = new THREE.ShapeGeometry(sekil, 1), pos = geo.attributes.position, uv = geo.attributes.uv;
  for (var i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / W + 0.5, pos.getY(i) / H + 0.5);
  uv.needsUpdate = true; geo.computeVertexNormals();
  geo.setAttribute('uv1', uv); geo.setAttribute('uv2', uv); geo.parameters = { width: W, height: H, widthSegments: 1, heightSegments: 1 };
  duvar.geometry.dispose(); duvar.geometry = geo; return true;
}
function _izinli(s, liste) {   // STANDART ŞABLON (13.10 kullanıcı: «lab aynen kullansın, sadece masayı seçsin, materyalleri değiştiremesin»): yalnız listedeki seçenekler geçer; malzeme / renk / doku / ayak seçenekleri SESSİZCE düşer (ajan yazsa da standart kalır)
  var o = {}; if (!s) return o; for (var i = 0; i < liste.length; i++) if (s[liste[i]] !== undefined) o[liste[i]] = s[liste[i]]; return o;
}
function _vec3(v) {   // 14.10: merkez dizi [x,y,z] / {x,y,z} / Vector3 / yok → Vector3 ya da null (ölçüldü: ajan dizi yazınca ustKot NaN, tezgâh ve üstündekiler çizilmedi)
  if (!v) return null; if (v.isVector3) return v;
  if (Array.isArray(v)) return new THREE.Vector3(+v[0] || 0, +v[1] || 0, +v[2] || 0);
  if (typeof v === 'object') return new THREE.Vector3(+v.x || 0, +v.y || 0, +v.z || 0);
  return null;
}
function _sayilastir(s, liste) {   // 14.10: '7.2' gibi sayı dizelerini sayıya çevirir; geçersiz değer düşer (yardımcının varsayılanı devreye girer)
  for (var i = 0; i < liste.length; i++) { var k = liste[i]; if (s[k] === undefined) continue; var n = +s[k]; if (isFinite(n)) s[k] = n; else delete s[k]; }
  return s;
}

function odaKapi(scene, s) {   // AHŞAP KAPI (odaKur duvarına GÖMÜLÜ; ölçüler BİRİM, 1 birim = 0,5 m): duvarda delik + kasa (delik kenarını sarar, içeri 2 cm taşar) + TEK yüzeyli kanat (paneller oluk çizgisi; düzlemden 2 cm içeride) + kol + TABELA (üstte gerçek EBA logosu — montaj window.EBA_LOGO gömer — altında yazı) + süpürgelik kapıda kesilir. s = { duvar: 'arka'|'sol'|'sag'|'on', oda: odaKur dönüşü (delik için ŞART), konum: duvar boyunca kayma, genislik: 1.9 (95 cm), yukseklik: 4.2 (2,1 m), tip: 'ahsap' (beyaz meşe kaplama, cilalı; varsayılan) | 'koyu' (ceviz) | 'boyali' (mat toz boya, renk), phDoku, ahsap, kapiMat / kasaMat: reçete, karo: damar karosu (birim), tabela: 'LABORATUVAR' (boş = yok), logo: true, logoDoku: kendi THREE.Texture'ın, kol: true, delik: false → yüzeye asılır }. Dönüş { grup, kanat, tabela }. Konumu boş duvar yüzeyine ver (tezgâhın arkasına değil)
  s = _izinli(s, ['duvar', 'oda', 'konum', 'merkez', 'donus', 'genislik', 'yukseklik', 'tabela', 'logo', 'logoDoku', 'kol', 'delik']); s.merkez = _vec3(s.merkez); s = _sayilastir(s, ['konum', 'donus', 'genislik', 'yukseklik']);   // STANDART: tip / malzeme seçeneği yok
  if (s.oda && s.oda.kapi && s.oda.kapi.grup) return s.oda.kapi;   // odaKur standart kapıyı zaten açtı: ikinci kapı açılmaz
  var M = 2, G = s.genislik || 0.95 * M, Y = s.yukseklik || 2.1 * M, kal = 0.045 * M, kasaK = 0.07 * M, derin = 0.09 * M;
  var grup = new THREE.Group(); grup.name = 'kapi'; var yer = _duvarYerlestir(grup, s, s.oda, 0), H = yer.oda.yukseklik || 5;
  var gomulu = !!(yer.duvar && s.delik !== false) && _duvarDelik(yer.duvar, yer.yerelX, (Y + 0.01 * M) / 2 - H / 2, G + 0.01 * M, Y + 0.02 * M);
  var z0 = gomulu ? 0 : derin;   // gömülemezse (serbest yerleşim) duvar önüne asılır
  var PH = (typeof window !== 'undefined' && window.PH_DOKU) ? window.PH_DOKU : null, tip = s.tip || 'ahsap';
  var phk = s.phDoku || (tip === 'koyu' ? 'natural_walnut_veneer' : 'white_oak_veneer');
  var ahsap;
  if (s.kapiMat) ahsap = s.kapiMat;
  else if (tip === 'boyali') { var bd = gurultuDoku(512, s.renk || '#e9e4d8', 0.03, 2); ahsap = new THREE.MeshStandardMaterial({ color: 0xffffff, map: bd, roughness: 0.42, metalness: 0 }); ahsap.userData.sabitKaro = 1; }
  else {
    var kay = (PH && PH[phk] && typeof phMalzeme === 'function') ? phMalzeme(phk, { puruz: 0.5, normal: 0.35 }) : ahsapMalzeme(s.ahsap || (tip === 'koyu' ? 'ceviz' : 'mese'), 'vernik');
    ahsap = new THREE.MeshPhysicalMaterial({ color: kay.color ? kay.color.clone() : 0xffffff, map: kay.map || null, normalMap: kay.normalMap || null, roughnessMap: kay.roughnessMap || null,   // renk = phMalzeme parlaklığı
      normalScale: new THREE.Vector2(0.3, 0.3), roughness: 0.4, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 0.8 });   // cilalı kapı
    ahsap.userData = Object.assign({}, kay.userData, { sabitKaro: s.karo || (kay.userData.sabitKaro ? kay.userData.sabitKaro * 0.5 : 1) });   // damar 2× sık: tek büyük desen «baskı» gibi duruyordu
  }
  var kasaMat = s.kasaMat || ahsap;
  function kutu(g, y, d, mat, x, yy, z, ad) { var b = new THREE.Mesh(new THREE.BoxGeometry(g, y, d), mat); b.position.set(x, yy, z); b.castShadow = b.receiveShadow = true; if (ad) b.name = ad; grup.add(b); return b; }
  var zk = z0 + 0.02 * M - derin / 2, GD = G + 0.01 * M, YD = Y + 0.01 * M;   // kasa: düzlemi sarar (içeri 2 cm, dışarı derin-2 cm); GD×YD delik
  kutu(kasaK, YD, derin, kutuDoku(kasaMat, kasaK, YD, derin, 0.6, 'y'), -GD / 2 - kasaK / 2 + 0.005 * M, YD / 2, zk, 'kapi_kasa');
  kutu(kasaK, YD, derin, kutuDoku(kasaMat, kasaK, YD, derin, 0.6, 'y'), GD / 2 + kasaK / 2 - 0.005 * M, YD / 2, zk, 'kapi_kasa');
  kutu(GD + 2 * kasaK, kasaK, derin, kutuDoku(kasaMat, GD + 2 * kasaK, kasaK, derin, 0.6, 'x'), 0, YD + kasaK / 2 - 0.005 * M, zk, 'kapi_kasa');
  kutu(GD, YD, 0.01 * M, new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.9 }), 0, YD / 2, z0 - derin + 0.02 * M);   // delik arkası karanlık
  var zkanat = z0 - 0.02 * M - kal / 2;   // kanat ön yüzü duvar düzleminden 2 cm içeride
  var kanat = kutu(G, Y, kal, kutuDoku(ahsap, G, Y, kal, 0.6, 'y'), 0, Y / 2, zkanat, 'kapi_kanat');
  var on = zkanat + kal / 2;
  var olukMat = new THREE.MeshStandardMaterial({ color: 0x4a443d, roughness: 0.9 });   // göbek paneli: TEK yüzeyde ince OLUK çizgisi (ayrı doku dilimi = «ek yeri» görünüyordu)
  [[0.62, Y * 0.62, 0.62], [0.62, Y * 0.25, 0.22]].forEach(function (p) {
    var pg = G * p[0], py = Y * p[2], cy = p[1], o = 0.008 * M, zz = on + 0.001;
    kutu(pg, o, 0.003, olukMat, 0, cy + py / 2, zz); kutu(pg, o, 0.003, olukMat, 0, cy - py / 2, zz);
    kutu(o, py, 0.003, olukMat, -pg / 2, cy, zz); kutu(o, py, 0.003, olukMat, pg / 2, cy, zz);
  });
  if (s.kol !== false) {
    var kMat = new THREE.MeshStandardMaterial({ color: 0xb7bcc2, metalness: 0.7, roughness: 0.4 }), ky = 1.0 * M, kx = G / 2 - 0.09 * M;
    var rozet = new THREE.Mesh(new THREE.CylinderGeometry(0.03 * M, 0.03 * M, 0.01 * M, 24), kMat); rozet.rotation.x = Math.PI / 2; rozet.position.set(kx, ky, on + 0.005 * M); grup.add(rozet);
    var kol = new THREE.Mesh(new THREE.CylinderGeometry(0.011 * M, 0.011 * M, 0.13 * M, 16), kMat); kol.rotation.z = Math.PI / 2; kol.position.set(kx - 0.05 * M, ky, on + 0.035 * M); grup.add(kol);
    var kolDik = new THREE.Mesh(new THREE.CylinderGeometry(0.011 * M, 0.011 * M, 0.04 * M, 16), kMat); kolDik.rotation.x = Math.PI / 2; kolDik.position.set(kx, ky, on + 0.02 * M); grup.add(kolDik);
  }
  if (gomulu && s.oda && s.oda.supurgelik) {   // SÜPÜRGELİK KAPIDA KESİLİR (13.10 «kapının altı tozluğun altında kalmış»)
    var cita = null; s.oda.supurgelik.children.forEach(function (c) { if (c.name === 'supurgelik_' + (s.duvar || 'arka')) cita = c; });
    if (cita && cita.geometry && cita.geometry.parameters) {
      cita.updateWorldMatrix(true, false);
      var cp = cita.geometry.parameters, L = cp.width, yerel = cita.worldToLocal(grup.position.clone()), cx = yerel.x;
      var yarim = GD / 2 + kasaK, solUz = (cx - yarim) - (-L / 2), sagUz = (L / 2) - (cx + yarim);
      s.oda.supurgelik.remove(cita);
      [[solUz, -L / 2 + solUz / 2], [sagUz, L / 2 - sagUz / 2]].forEach(function (q) {
        if (q[0] <= 0.02) return;
        var c2 = new THREE.Mesh(new THREE.BoxGeometry(q[0], cp.height, cp.depth), cita.material); c2.position.copy(cita.position); c2.rotation.copy(cita.rotation);
        c2.translateX(q[1]); c2.receiveShadow = true; c2.raycast = function () {}; c2.name = cita.name; s.oda.supurgelik.add(c2);
      });
    }
  }
  var tabela = null;
  if (s.tabela || s.logo) {
    var c = document.createElement('canvas'); c.width = 512; c.height = 320; var g = c.getContext('2d');
    var tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    var logoImg = null;
    if (s.logo !== false) {
      if (s.logoDoku && s.logoDoku.image) logoImg = s.logoDoku.image;
      else if (typeof window !== 'undefined' && window.EBA_LOGO) { logoImg = new Image(); logoImg.src = window.EBA_LOGO; }
    }
    function yaz() {
      g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 512, 320); g.strokeStyle = '#9aa0a6'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 310);
      if (s.logo !== false) {
        if (logoImg && logoImg.complete && logoImg.naturalWidth) {
          var lw = 400, lh = lw * logoImg.naturalHeight / logoImg.naturalWidth; if (lh > 140) { lh = 140; lw = lh * logoImg.naturalWidth / logoImg.naturalHeight; }
          try { g.drawImage(logoImg, 256 - lw / 2, 100 - lh / 2, lw, lh); } catch (e) {}
        } else { g.fillStyle = '#d03238'; g.beginPath(); g.roundRect ? g.roundRect(146, 34, 220, 130, 26) : g.rect(146, 34, 220, 130); g.fill();
               g.fillStyle = '#ffffff'; g.font = 'bold 96px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EBA', 256, 100); }
      }
      if (s.tabela) { g.fillStyle = '#2b2f33'; g.font = 'bold 58px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(s.tabela), 256, s.logo !== false ? 236 : 160); }
      tex.needsUpdate = true;
    }
    yaz(); if (logoImg && !(logoImg.complete && logoImg.naturalWidth)) logoImg.addEventListener('load', yaz);
    tabela = new THREE.Mesh(new THREE.BoxGeometry(G * 0.5, G * 0.5 * 320 / 512, 0.004 * M), [kasaMat, kasaMat, kasaMat, kasaMat, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }), kasaMat]);
    tabela.position.set(0, Y * 0.76, on + 0.002 * M + 0.003 * M); tabela.name = 'kapi_tabela'; grup.add(tabela);
  }
  grup.userData.kapi = true; scene.add(grup);
  return Object.assign(grup, { grup: grup, kanat: kanat, tabela: tabela });
}
function odaPencere(scene, s) {   // AHŞAP PENCERE (odaKur duvarına GÖMÜLÜ; ölçüler BİRİM): duvarda delik + meşe kaplama kasa (kenarı sarar) + bölmeli kayıtlar + berrak cam (düzlemden 2 cm içeride) + DELİKTE gerçek manzara fotoğrafı (montaj window.MANZARA['cayir'] gömer: mavi gök + ağaç tepeleri; yoksa gök degradesi; delik ölçüsünde, duvar dışına taşmaz) + denizlik. s = { duvar, oda (delik için ŞART), konum, altKot: 2 (1 m), genislik: 2.8 (1,4 m), yukseklik: 2.4 (1,2 m), bolme: 2, phDoku: 'oak_veneer_01' | ahsap: 'mese' | cerceveMat: reçete, manzara: 'cayir', delik: false → yüzeye asılır }. Dönüş { grup, cam, dis }
  s = _izinli(s, ['duvar', 'oda', 'konum', 'merkez', 'donus', 'altKot', 'genislik', 'yukseklik', 'bolme', 'manzara', 'delik']); s.merkez = _vec3(s.merkez); s = _sayilastir(s, ['konum', 'donus', 'altKot', 'genislik', 'yukseklik']);   // STANDART: çerçeve malzemesi seçeneği yok
  if (s.oda && s.oda.pencere && s.oda.pencere.grup) return s.oda.pencere;   // odaKur standart pencereyi zaten açtı
  var M = 2, G = s.genislik || 1.4 * M, Y = s.yukseklik || 1.2 * M, A = s.altKot || 1.0 * M, k = 0.06 * M, derin = 0.09 * M, bolme = Math.max(1, s.bolme || 2);
  var grup = new THREE.Group(); grup.name = 'pencere'; var yer = _duvarYerlestir(grup, s, s.oda, 0), H = yer.oda.yukseklik || 5;
  var gomulu = !!(yer.duvar && s.delik !== false) && _duvarDelik(yer.duvar, yer.yerelX, A + Y / 2 - H / 2, G, Y);
  var z0 = gomulu ? 0 : derin;
  var PH = (typeof window !== 'undefined' && window.PH_DOKU) ? window.PH_DOKU : null, php = s.phDoku || 'oak_veneer_01';
  var cMat = s.cerceveMat || ((PH && PH[php] && typeof phMalzeme === 'function') ? phMalzeme(php, { puruz: 0.5, normal: 0.4 }) : ahsapMalzeme(s.ahsap || 'mese', 'vernik'));
  function kutu(g, y, d, x, yy, z, eksen) { var b = new THREE.Mesh(new THREE.BoxGeometry(g, y, d), kutuDoku(cMat, g, y, d, 0.6, eksen)); b.position.set(x, yy, z); b.castShadow = b.receiveShadow = true; grup.add(b); return b; }
  var zk = z0 + 0.02 * M - derin / 2, zc = z0 - 0.02 * M;   // kasa düzlemi sarar; cam ve kayıtlar 2 cm içeride
  kutu(k, Y, derin, -G / 2 + k / 2, A + Y / 2, zk, 'y'); kutu(k, Y, derin, G / 2 - k / 2, A + Y / 2, zk, 'y');   // kasa deliğin İÇ kenarında
  kutu(G - 2 * k, k, derin, 0, A + Y - k / 2, zk, 'x'); kutu(G - 2 * k, k, derin, 0, A + k / 2, zk, 'x');
  for (var i = 1; i < bolme; i++) kutu(0.04 * M, Y - 2 * k, 0.05 * M, -G / 2 + i * G / bolme, A + Y / 2, zc, 'y');   // düşey kayıt
  kutu(G - 2 * k, 0.04 * M, 0.05 * M, 0, A + Y * 0.5, zc, 'x');   // yatay kayıt
  var disMat = null, manz = (typeof window !== 'undefined' && window.MANZARA) ? window.MANZARA[s.manzara || 'cayir'] : null;
  if (manz) { var mt = new THREE.TextureLoader().load(manz); mt.colorSpace = THREE.SRGBColorSpace; mt.anisotropy = renderer.capabilities.getMaxAnisotropy(); disMat = new THREE.MeshBasicMaterial({ map: mt, toneMapped: false }); }
  else {   // yedek: gök degradesi
    var gok = document.createElement('canvas'); gok.width = 64; gok.height = 256; var gg = gok.getContext('2d'), gr = gg.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#3f8fdc'); gr.addColorStop(0.7, '#9fcbf0'); gr.addColorStop(1, '#dcecf8'); gg.fillStyle = gr; gg.fillRect(0, 0, 64, 256);
    var gokDoku = new THREE.CanvasTexture(gok); gokDoku.colorSpace = THREE.SRGBColorSpace; disMat = new THREE.MeshBasicMaterial({ map: gokDoku, toneMapped: false });
  }
  // DIŞ DÜZLEM DELİĞİN İÇİNDE (13.10 kullanıcı: «dış mekân görünmemeli» — 3 kat büyük düzlem duvarın üstünden/yanından taşıyordu): tam delik ölçüsü, kasa derinliği içinde 3 cm geride (yan kenarını kasa örter; dışarıdan ya da yukarıdan bakan kamera duvar dışında hiçbir şey görmez). Fotoğraf delik oranına KIRPILIR (bozulmaz); duvar boyunca sağdaki pencere fotoğrafın sağını gösterir (iki pencere aynı kareyi göstermez)
  if (manz) { var fo = 1024 / 480, ho = G / Y, rx = Math.min(1, ho / fo), ry = Math.min(1, fo / ho), kay = Math.max(-0.5, Math.min(0.5, yer.yerelX / Math.max(yer.oda.genislik || 14, yer.oda.derinlik || 10)));
    mt.wrapS = mt.wrapT = THREE.ClampToEdgeWrapping; mt.repeat.set(rx, ry); mt.offset.set((1 - rx) * (0.5 + kay), (1 - ry) * 0.5); }
  var dis = new THREE.Mesh(new THREE.PlaneGeometry(G + 0.02 * M, Y + 0.02 * M), disMat); dis.position.set(0, A + Y / 2, z0 - 0.03 * M); dis.name = 'pencere_dis'; dis.raycast = function () {}; grup.add(dis);
  var cam = new THREE.Mesh(new THREE.PlaneGeometry(G - 2 * k, Y - 2 * k), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.03, transmission: 0.92, transparent: true, opacity: 0.3, thickness: 0.005, envMapIntensity: 0.5 }));
  cam.position.set(0, A + Y / 2, zc + 0.002); cam.name = 'pencere_cam'; cam.raycast = function () {}; grup.add(cam);
  kutu(G + 0.12 * M, 0.035 * M, 0.12 * M, 0, A - 0.0175 * M, z0 + 0.04 * M, 'x');   // ahşap denizlik: içeri taşar
  grup.userData.pencere = true; scene.add(grup);
  return Object.assign(grup, { grup: grup, cam: cam, dis: dis });
}
function sahneAmbiyansi(scene, kalip, s) {   // ORTAM KALIBI (sözleşme 16d) TEK ÇAĞRIDA: fon degradesi + StudyoOrtami ortamı + ACES pozlama + gölgeli ana ışık (normalBias 0.03) + rim (+ gök dolgusu / lamba). kalip: 'ic-mekan' (laboratuvar, sınıf, stüdyo — varsayılan) | 'sicak-ic' (ev, masa oyunu, akşam lambası) | 'dis-gunduz' (açık hava) | 'dis-aksam' (gün batımı açık hava) | 'karanlik' (ışık-gölge/optik deneyi, gece) | 'uzay' (uzay fonu + koyu ortam; ışık GEZEGEN3B Güneş'inden) | 'sergi' (hücre, organ, DNA gibi biyoloji modeli: koyu degrade fon, zemin/mobilya yok). s = { olcek: sahne çarpanı (1 ≈ 6 birimlik sahne), hedef: THREE.Vector3 ana grup merkezi, lamba: THREE.Vector3 (sicak-ic lamba konumu), fon: false → scene.background'a dokunma }. Dönüş { ana, rim, dolgu, lamba, kalip }: şiddeti sahneye göre ayarlayabilirsin; ayrıca DirectionalLight / Ambient / fon EKLEME (çift ışık yüzeyi yakar)
  s = s || {}; var o = s.olcek || 1, h = s.hedef || new THREE.Vector3(0, 0, 0), d = {};
  var K = {
    'ic-mekan':   { fon: ['#cfd8de', '#9fadb8'], ort: {}, poz: 0.9, ana: [0xfff4e8, 1.8], rim: [0xdfe8ff, 0.3] },
    'sicak-ic':   { fon: ['#eadbc6', '#cbb89d'], ort: { gok: '#d8c4a6', ufuk: '#f5e7d2', anaSiddet: 3.0, dolguSiddet: 0.8, rimSiddet: 1.4 }, poz: 0.95, ana: [0xffe2bd, 1.5], rim: [0xffd6a8, 0.35], lamba: [0xffc98a, 30] },
    'dis-gunduz': { fon: ['#8ec3ec', '#e3eef6'], ort: { gok: '#7fb0e0', ufuk: '#eef4f8', zeminUst: '#7a7466', zemin: '#4a453c', anaSiddet: 4.0 }, poz: 0.95, ana: [0xfff1d8, 2.0], rim: [0xcfe4ff, 0.3], gok: [0xcfe4ff, 0xb9a88c, 0.25] },
    'dis-aksam':  { fon: ['#f0b283', '#fbe4cd'], ort: { gok: '#e6a473', ufuk: '#ffe4c4', zeminUst: '#6e6256', zemin: '#3f3830', anaSiddet: 3.4 }, poz: 0.95, ana: [0xffc48a, 1.8], rim: [0xa9bfe8, 0.35], gok: [0xffd3a8, 0x8a7a66, 0.25] },   // GÜN BATIMI AÇIK HAVA (kullanıcı kararı 12.10 «dis-aksam eklensin»): dis-gunduz ile aynı kurgu, sıcak gök/ana ışık, soğuk rim
    'karanlik':   { fon: ['#2c2823', '#16140f'], ort: { anaSiddet: 1.2, dolguSiddet: 0.3, rimSiddet: 0.8 }, poz: 1.0, ana: [0xfff0dc, 0.35, false], rim: [0xbfcfff, 0.25] },
    'uzay':       { fon: null, ort: { gok: '#1b2150', ufuk: '#3a3564', zeminUst: '#17182c', zemin: '#0b0c16', anaSiddet: 1.6, dolguSiddet: 0.5, rimSiddet: 0.9 }, poz: 1.0 },
    'sergi':      { fon: null, radyal: ['#4a5d70', '#27333f', '#141b22'], ort: {}, poz: 1.0, ana: [0xffffff, 2.2], rim: [0x9fc4ff, 1.6], gok: [0xcfe0ff, 0x1a2230, 0.35], dolguYon: [0xdfe8ff, 0.7] }   // BİYOLOJİ MODELİ (kullanıcı kararı 27.09 «sergi»): koyu degrade fon, zemin/mobilya yok; renkler öne çıkar
  };
  kalip = K[kalip] ? kalip : 'ic-mekan'; var k = K[kalip];
  if (s.fon !== false) {
    if (k.fon) scene.background = fonDegradesi(k.fon[0], k.fon[1]);
    else if (k.radyal) {   // sergi: ortası açık radyal degrade (nesnenin arkası aydınlık, kenarlar koyu)
      var rc = document.createElement('canvas'); rc.width = rc.height = 512; var rg = rc.getContext('2d'), gr = rg.createRadialGradient(256, 210, 20, 256, 256, 380);
      gr.addColorStop(0, k.radyal[0]); gr.addColorStop(0.55, k.radyal[1]); gr.addColorStop(1, k.radyal[2]); rg.fillStyle = gr; rg.fillRect(0, 0, 512, 512);
      var rf = new THREE.CanvasTexture(rc); rf.colorSpace = THREE.SRGBColorSpace; scene.background = rf;
    }
    else if (typeof uzayFonu === 'function') uzayFonu(scene);
  }
  var hdriB64 = (typeof window !== 'undefined' && window.HDRI_ORTAM) ? window.HDRI_ORTAM[kalip] : null;
  if (hdriB64 && THREE.RGBELoader) {   // HDRI ORTAMI (Poly Haven CC0, 2026-10-12; montaj gömer, kalıp başına kalibre .hdr): YALNIZ aydınlatma/yansıma — görünen fon yukarıdaki degrade kalır; parlaklık StudyoOrtami ile eşlendi (beyaz kürede ±%3), ana ışık değişmez
    var hb = atob(hdriB64), ha = new Uint8Array(hb.length); for (var hi = 0; hi < hb.length; hi++) ha[hi] = hb.charCodeAt(hi);
    var ht = new THREE.RGBELoader().parse(ha.buffer), hx = new THREE.DataTexture(ht.data, ht.width, ht.height, THREE.RGBAFormat, ht.type);
    hx.flipY = true; hx.minFilter = THREE.LinearFilter; hx.magFilter = THREE.LinearFilter; hx.generateMipmaps = false; hx.colorSpace = THREE.LinearSRGBColorSpace; hx.mapping = THREE.EquirectangularReflectionMapping; hx.needsUpdate = true;
    var hp = new THREE.PMREMGenerator(renderer); scene.environment = hp.fromEquirectangular(hx).texture; hp.dispose(); hx.dispose(); scene.userData.hdri = kalip;
  } else if (THREE.StudyoOrtami) {   // aydınlatan ortam görünen fondan AYRIDIR (16d); kalıbın ışık rengi yansımaya da geçer (HDRI gömülmemiş kitapta yedek)
    var pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new THREE.StudyoOrtami(k.ort), 0.04).texture; pm.dispose();
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = k.poz;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (k.ana) {   // ana ışık ÜST-SOL-ÖN (StudyoOrtami panelinin yönü); gölge kamerası sahneyi sıkı sarar
    var ana = new THREE.DirectionalLight(k.ana[0], k.ana[1]), e = 7 * o;
    ana.position.set(-6 * o, 10 * o, 6 * o).add(h); ana.target.position.copy(h);
    ana.castShadow = k.ana[2] !== false; ana.shadow.mapSize.set(2048, 2048); ana.shadow.normalBias = 0.03; ana.shadow.bias = -0.0002;
    ana.shadow.camera.left = -e; ana.shadow.camera.right = e; ana.shadow.camera.top = e; ana.shadow.camera.bottom = -e;
    ana.shadow.camera.near = 0.5; ana.shadow.camera.far = 40 * o; ana.shadow.camera.updateProjectionMatrix();
    scene.add(ana); scene.add(ana.target); d.ana = ana;
  }
  if (k.rim) { d.rim = new THREE.DirectionalLight(k.rim[0], k.rim[1]); d.rim.position.set(6 * o, 5 * o, -6 * o).add(h); scene.add(d.rim); }   // zayıf karşı ışık: kenar okunur
  if (k.gok) { d.dolgu = new THREE.HemisphereLight(k.gok[0], k.gok[1], k.gok[2]); scene.add(d.dolgu); }   // açık havada gök/zemin dolgusu (toplam ≤ 0.25)
  if (k.dolguYon) { d.dolguYon = new THREE.DirectionalLight(k.dolguYon[0], k.dolguYon[1]); d.dolguYon.position.set(8 * o, 3 * o, 4 * o).add(h); scene.add(d.dolguYon); }   // sergi: ana ışığın karşısından yumuşak soğuk dolgu (gölge yanı ölmesin)
  if (k.lamba) {   // sıcak iç mekân: masa lambası (fiziksel candela, ters-kare sönüm)
    d.lamba = new THREE.PointLight(k.lamba[0], k.lamba[1], 0, 2);
    d.lamba.position.copy(s.lamba || new THREE.Vector3(2.5 * o, 3.2 * o, 1.5 * o).add(h));
    d.lamba.castShadow = true; d.lamba.shadow.mapSize.set(1024, 1024); d.lamba.shadow.normalBias = 0.03; scene.add(d.lamba);
  }
  [d.ana, d.rim, d.dolgu, d.dolguYon, d.lamba].forEach(function (l) { if (l) l.userData.ambiyans = true; });
  d.kalip = kalip; scene.userData.ambiyans = kalip; scene.userData.ambiyansIsiklari = d; return d;
}
function ambiyansKoru(scene) {   // ÇİFT IŞIK KORUMASI (2026-09-27, ölçüldü FB.6.2.1.1/FB.6.2.2.1: 20 sayfanın 20'si kalıbın ışığına
  // kendi ana/dolgu/rim ışığını da ekledi → pozlama ikiye katlandı, sahne yıkanıp flulaştı). Sayfa kendi DirectionalLight /
  // Ambient / Hemisphere ışığını kurduysa SAYFANIN ışığı kazanır (deneyin güneşi/yönü bozulmasın): kalıbın ışıkları
  // kapanır, fon/ortam/pozlama kalır. Şablon köprüsü ilk çizimde MALZEME3B_OTO ile çağırır; sonuç: true = kapattı.
  var d = scene && scene.userData && scene.userData.ambiyansIsiklari, yabanci = false;
  if (!d || d.koruma) return false;
  scene.traverse(function (o) { if ((o.isDirectionalLight || o.isAmbientLight || o.isHemisphereLight) && !(o.userData && o.userData.ambiyans)) yabanci = true; });
  if (!yabanci) return false;
  [d.ana, d.rim, d.dolgu, d.dolguYon, d.lamba].forEach(function (l) { if (l) l.visible = false; });
  d.koruma = true; console.info('AMBIYANS: sayfa kendi ışığını kurmuş — kalıbın (' + d.kalip + ') ışıkları kapatıldı; fon, ortam ve pozlama korunur');
  return true;
}
function sonIslem(scene, camera, s) {   // HAFİF SON İŞLEM (her 3B sahnede): N8AO ortam kapanması (kütüphane gömülüyse) + eşiği 2.5 yumuşak Bloom (yalnız ışıyan yüzey ve sıcak parlama taşar) + hafif vinyet/sıcaklık; 4× MSAA tampon (kenarlar tırtıklanmaz); ton eşleme OutputPass'ta (renderer ayarı — panel ışık sürgüsü çalışır). s = { bloom: 0.25 (ışıyan sahnede 0.6), esik: 2.5 (1.0'a İNDİRME: açık sahneyi sisler), yaricap: 0.4, yaricap: 0.4, ao: true, aoYaricap: 0.35 (sahne boyunun ~%5'i), aoSiddet: 2, vinyet: 0.18, sicaklik: 0.015 }. Dönüş { render(), setSize(w, h), composer, bloom, ao }: döngüde renderer.render(scene, camera) YERİNE son.render(); renderer.setSize'dan SONRA son.setSize(w, h). Kütüphane yoksa düz renderer.render'a düşer
  s = s || {}; var boy = new THREE.Vector2(); renderer.getSize(boy);
  var d = { composer: null, render: function () { renderer.render(scene, camera); }, setSize: function () {} };
  if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.OutputPass) return d;
  var pr = renderer.getPixelRatio(), gl2 = renderer.capabilities && renderer.capabilities.isWebGL2;
  var rt = new THREE.WebGLRenderTarget(Math.max(1, boy.x * pr), Math.max(1, boy.y * pr), { type: THREE.HalfFloatType, samples: gl2 ? 4 : 0 });
  var c = new THREE.EffectComposer(renderer, rt); d.composer = c;
  if (s.ao !== false && THREE.N8AOPass && gl2) {   // N8AO: sahneyi kendisi çizer (RenderPass yerine)
    d.ao = new THREE.N8AOPass(scene, camera, boy.x, boy.y);
    d.ao.configuration.aoRadius = s.aoYaricap || 0.35; d.ao.configuration.distanceFalloff = 1.0;
    d.ao.configuration.intensity = s.aoSiddet || 2; if (d.ao.setQualityMode) d.ao.setQualityMode('Medium');
    c.addPass(d.ao);
  } else c.addPass(new THREE.RenderPass(scene, camera));
  if (THREE.UnrealBloomPass && s.bloom !== 0) {
    d.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(boy.x, boy.y), s.bloom == null ? 0.25 : s.bloom, s.yaricap == null ? 0.4 : s.yaricap, s.esik == null ? 2.5 : s.esik);   // eşik 2.5: yalnız ışıyan yüzey ve sıcak parlama taşar; 1.0 açık dağınık yüzeyi (duvar, zemin) sisleyip flulaştırıyordu (ölçüldü FB.6.2.1.1 s08: Laplace 512 → 208)
    c.addPass(d.bloom);
  }
  if (THREE.ShaderPass) {   // vinyet + hafif sıcaklık (ton eşlemeden önce, lineer HDR)
    d.ton = new THREE.ShaderPass({
      uniforms: { tDiffuse: { value: null }, vinyet: { value: s.vinyet == null ? 0.18 : s.vinyet }, sicaklik: { value: s.sicaklik == null ? 0.015 : s.sicaklik } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; uniform float vinyet; uniform float sicaklik; varying vec2 vUv; void main() { vec4 r = texture2D(tDiffuse, vUv); float v = smoothstep(0.35, 0.95, length(vUv - 0.5) * 1.414); r.rgb *= (1.0 - vinyet * v) * vec3(1.0 + sicaklik, 1.0, 1.0 - sicaklik); gl_FragColor = r; }'
    });
    c.addPass(d.ton);
  }
  c.addPass(new THREE.OutputPass());
  c.setSize(boy.x, boy.y);
  d.render = function () { c.render(); };
  d.setSize = function (w, h) { c.setSize(w, h); };
  return d;
}
function camDuzelt(scene) {   // CAM ONARIMI (2026-09-27 kullanıcı: «cam görüntüleri hoşuma gitmiyor: içindekiler flu, cam hiç belli olmuyor»; ölçüldü cam deneyi _gecici/zemin-duvar/cam): ajan camı 0,85 transmission + 0,15-0,5 roughness + kalın thickness yazıyor → kırılma tamponu mip'e (bulanık), %15 beyaz örtü (süt), kalın kabuk mercek gibi büyütüyor; kabuğu KIRICI yapınca içindeki kırıcı sıvı YOK oluyor (tampon yalnız opakları görür). Kural: (1) berrak niyetli kırıcı (transmission ≥ 0,5, roughness < 0,6, yanardöner değil, userData.buzlu yok) → roughness ≤ 0,05, transmission 1, opacity 1/transparent kapalı; (2) KAP/KABUK → alfa kabuk (sivi-kapta reçetesi: opacity 0,12 + clearcoat 1 + kenar sheen, DoubleSide, gölge atmaz): kabuk = LatheGeometry ya da açık uçlu silindir, ya da cidar ince (thickness kutunun en kısa kenarının %30'undan az), ya da kutusunun İÇİNDE başka bir KIRICI (sıvı) var. Buzlu/yarı saydam (roughness ≥ 0,6 ya da userData.buzlu) ve iridescence dokunulmaz; userData.camOnarimi = false ile tek malzeme muaf. Köprü MALZEME3B_OTO ile ilk çizimde ve 1,5 sn sonra çağırır; dönüş: düzeltilen malzeme sayısı
  var hepsi = [], kutu = new THREE.Box3(), boy = new THREE.Vector3(), sayac = 0;
  scene.updateMatrixWorld(true);
  scene.traverse(function (o) {
    if (!o.isMesh || !o.geometry || !o.material || Array.isArray(o.material) || o.userData.fon || (o.material.transparent && o.material.opacity < 0.05)) return;
    var b = new THREE.Box3().setFromObject(o); if (b.isEmpty()) return; b.getSize(boy);
    hepsi.push({ o: o, m: o.material, kutu: b, min: Math.min(boy.x, boy.y, boy.z), hacim: Math.max(boy.x, 1e-3) * Math.max(boy.y, 1e-3) * Math.max(boy.z, 1e-3) });
  });
  hepsi.forEach(function (k) {
    var m = k.m; if (!m.isMeshPhysicalMaterial || !(m.transmission >= 0.5) || m.iridescence > 0 || m.userData.camOnarimi === false || m.userData.buzlu || m.roughness >= 0.6 || m.userData._camKabuk) return;   // 0,6+: bilerek süt/opal (yari-saydam 0,4-0,42 bayrakla muaf); ajanın behere yazdığı 0,35-0,5 ise kusur, düzelir
    var g = k.o.geometry, p = g.parameters || {}, tip = g.type;
    var kabuk = tip === 'LatheGeometry' || (tip === 'CylinderGeometry' && p.openEnded) || m.thickness < 0.3 * k.min ||   // cidar kutunun en kısa kenarının %30'undan ince (beher 0,03/1, erlen 0,25/1; sıvı sütunu 0,8/0,8 ve bilye 0,08/0,16 DEĞİL)
      hepsi.some(function (q) { return q !== k && q.o !== k.o && q.m.isMeshPhysicalMaterial && q.m.transmission >= 0.5 && q.hacim < k.hacim * 0.9 && k.kutu.containsBox(q.kutu); });   // içinde KIRICI (sıvı) olan kap — opak içerik sayılmaz (suyun içindeki taş suyu kabuk yapmasın; ölçüldü)
    if (kabuk) {   // ALFA KABUK: kırıcı değil, içindekiler (opak ve kırıcı sıvı) bozulmadan görünür, cam clearcoat parlaması, %12 örtü ve kenar sheen'iyle okunur
      m.transmission = 0; m.transparent = true; m.opacity = 0.12; m.depthWrite = false; m.clearcoat = 1; m.clearcoatRoughness = 0.03; m.roughness = 0.03;
      m.sheen = 0.35; m.sheenRoughness = 0.6; m.sheenColor.set(0xffffff); m.side = THREE.DoubleSide; m.color.set(0xffffff);
      m.envMapIntensity = Math.max(m.envMapIntensity || 1, 1); m.userData._camKabuk = true; m.needsUpdate = true; k.o.castShadow = false; sayac++; return;   // kabuk deneyi (5 varyant): %16 örtü süt gibi, %8 görünmez; %12 + kenar parlaması (sheen) cam kenarını okutur
    }
    var d = false;   // DOLU CAM / SIVI: berrak
    if (m.roughness > 0.1) { m.roughness = 0.05; d = true; }
    if (m.transmission < 1) { m.transmission = 1; d = true; }
    if (m.transparent || m.opacity < 1) { m.transparent = false; m.opacity = 1; m.depthWrite = true; d = true; }
    if (d) { m.needsUpdate = true; sayac++; }
  });
  return sayac;
}
function kaustik(renk, boyut, yogunluk) {   // saydam nesnenin gölgesi OPAK düşer (gölge haritası saydamlık bilmez); gölge ortasına additive ışık lekesi = kaustik taklidi
  var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  var m = new THREE.Mesh(new THREE.PlaneGeometry(boyut || 0.6, boyut || 0.6),
    new THREE.MeshBasicMaterial({ map: t, color: renk || 0xfff4d6, transparent: true, opacity: yogunluk || 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; return m;   // konum: gölgenin merkezi, y = zemin + 0.002 (transparent: kırıcı nesnenin ARKASINDAN görünmez, zemindedir — sorun değil)
}
function kureselAyna(tip, capi, egrilikYaricapi, malzeme, kupHedef) {   // KÜRESEL/DÜZ AYNA KURUCU: tip 'cukur' | 'tumsek' | 'duz'; YANSITICI YÜZ +Z'YE BAKAR, kenar halkası z=0 düzlemindedir — sahnede mesh.lookAt(bakılan nokta) ile yönlendirilir. Ölçüldü: elle kurulan kapaklar ters döndürülüp arka yüzü görünüyor (kara disk), tümsek kapak kutunun dışına taşıyordu.
  var r = capi / 2, m = malzeme || new THREE.MeshStandardMaterial({ color: 0xf4f7fa, metalness: 1, roughness: 0.03, envMapIntensity: 1, envMap: kupHedef ? kupHedef.texture : null });
  var mesh;
  if (tip === 'duz') {   // DÜZ: gerçek yansıma Reflector ile (kütüphane gömülüyse), yoksa krom disk
    mesh = THREE.Reflector ? new THREE.Reflector(new THREE.CircleGeometry(r, 64), { clipBias: 0.003, textureWidth: 1024, textureHeight: 1024, color: 0x9a9a9a })
                          : new THREE.Mesh(new THREE.CircleGeometry(r, 64), m);   // Circle normali +Z
  }
  else {
    var R = Math.max(egrilikYaricapi || r * 2, r * 1.02), theta = Math.asin(r / R), g = new THREE.SphereGeometry(R, 64, 32, 0, Math.PI * 2, 0, theta);   // +Y kutuplu kapak
    if (tip === 'tumsek') { g.rotateX(Math.PI / 2); g.translate(0, 0, -R * Math.cos(theta)); mesh = new THREE.Mesh(g, m); }              // tepe +Z'de (izleyiciye yakın) — DIŞ yüz görünür
    else { g.rotateX(-Math.PI / 2); g.translate(0, 0, R * Math.cos(theta)); var mi = m.clone(); mi.side = THREE.BackSide; mesh = new THREE.Mesh(g, mi); }   // tepe −Z'de (uzak), İÇ yüz görünür: BackSide — FrontSide kapak kırpılıp arka yüz/kara disk görünüyordu
    var arka = new THREE.Mesh(new THREE.CircleGeometry(r * 1.02, 64), new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.6, metalness: 0.4 }));   // ince arka plaka: yandan bakınca içi boş kabuk görünmesin
    arka.position.z = tip === 'tumsek' ? -0.01 : -R * (1 - Math.cos(theta)) - 0.01; mesh.add(arka);
  }
  mesh.userData.aynaTipi = tip; mesh.castShadow = false;   // ayna gölge atmaz (kalınlığı yok)
  if (tip !== 'duz' && kupHedef) {   // EĞRİ AYNA GERÇEK YANSIMA: küp kamera AYNANIN KONUMUNDA olmalı (ortak/uzak kamera yalnız fonu gösterir — ölçüldü); döngüde mesh.userData.yansimaGuncelle(renderer, scene)
    var kk = new THREE.CubeCamera(0.05, 60, kupHedef); mesh.add(kk); kk.position.set(0, 0, tip === 'cukur' ? 0.05 : -0.05);
    mesh.userData.yansimaGuncelle = function (renderer, scene) { mesh.visible = false; kk.update(renderer, scene); mesh.visible = true; };
  }
  return mesh;   // KULLANIM: var ayna = kureselAyna('cukur', 0.6, 0.9, null, kupHedef); ayna.position.set(...); ayna.lookAt(kamera.position ya da bakılan nesne); döngüde ayna.userData.yansimaGuncelle(renderer, scene)
}
function _pufDokusu() {   // yumuşak kenar: radyal gradyan puf (küre kümesinin keskin kenarını yumuşatır)
  var c = document.createElement('canvas'); c.width = c.height = 128; var g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function bulutMalzeme(ton) {   // kümülüs: BEYAZ, mat, hafif kendinden ışıklı (gölge tarafı gri-mavi kalır, siyaha düşmez); ton: 'gunbatimi' → sıcak alt ışık, 'firtina' → gri fırtına bulutu (yıldırım sahnesi; yine yumuşak, siyaha düşmez)
  var T = { gunbatimi: [0xffffff, 0xffb07a, 0.35], firtina: [0x9aa4b0, 0x4f5966, 0.18] }[ton] || [0xffffff, 0xdfe9f5, 0.22];
  var m = new THREE.MeshStandardMaterial({ color: T[0], roughness: 1, metalness: 0, emissive: T[1], emissiveIntensity: T[2], envMapIntensity: 0.5 });
  m.userData.bulut = true; return m;
}
function bulutYap(genislik, yukseklik, tohum, malzeme) {   // kümülüs bulutu: yassı taban + 6-8 tepe küresi + her kürenin üstünde yumuşak puf sprite'ı; grup döner/kayar (userData.yuzer: havada durması NİYET)
  var r = _lcg((tohum || 1) * 977 + 13), g = new THREE.Group(), m = malzeme || bulutMalzeme(), n = 6 + Math.floor(r() * 3), puf = new THREE.SpriteMaterial({ map: _pufDokusu(), transparent: true, opacity: 0.45, depthWrite: false, depthTest: false });   // depthTest kapalı: sprite düzlemi küreyi kesince üçgen dilim artefaktı çıkıyordu (ölçüldü); bulut ana nesnenin ARKASINDA durduğu sürece üst üste çizim sorun değil
  var taban = new THREE.Mesh(new THREE.SphereGeometry(yukseklik * 0.6, 32, 20), m); taban.scale.set(genislik / (yukseklik * 1.25), 0.32, 1.0); taban.position.y = -yukseklik * 0.02; g.add(taban);   // taban alçak ve yassı: kürelerle kesişim çizgisi bulutun alt kenarında kalır (yukarıdayken üçgen dilim artefaktı — ölçüldü)
  for (var i = 0; i < n; i++) {
    var t = i / (n - 1), ry = yukseklik * (0.32 + 0.38 * Math.sin(t * Math.PI)) * (0.85 + r() * 0.3);
    var k = new THREE.Mesh(new THREE.SphereGeometry(ry, 24, 16), m);
    k.position.set((t - 0.5) * genislik * 0.9 + (r() - 0.5) * genislik * 0.1, ry * 0.7 + (r() - 0.5) * yukseklik * 0.1, (r() - 0.5) * yukseklik * 0.5);
    k.scale.set(1.1, 0.9, 1); g.add(k);
    var s = new THREE.Sprite(puf); s.position.copy(k.position); s.position.y += ry * 0.15; s.scale.set(ry * 2.8, ry * 2.4, 1); s.renderOrder = 1; g.add(s);
  }
  g.traverse(function (o) { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });   // bulut gölge ATMAZ ve ALMAZ (küre kümesinde sert gölge çizgileri «çirkin»)
  g.userData.yuzer = true; return g;
}
function phMalzeme(kimlik, s) {   // POLY HAVEN PBR DOKUSU (CC0, 2026-10-12): montaj window.PH_DOKU[kimlik] = {diff, nor, rough, boyut} (512 px WebP data URI) gömer; renk sRGB, veri lineer, RepeatWrapping, anisotropy; sabitKaro = gerçek boyut (1 m = 2 birim) → otoOlcek/tekrarKir aynen çalışır. s = {renk: 0x…, normal: 0.8, puruz: 1, metal: 0}
  s = s || {}; var k = (typeof window !== 'undefined' && window.PH_DOKU) ? window.PH_DOKU[kimlik] : null;
  if (!k) { console.warn('PH_DOKU gömülü değil: ' + kimlik + " — kimliği tırnak içinde yaz: phMalzeme('" + kimlik + "')"); return new THREE.MeshStandardMaterial({ color: s.renk || 0xb9b1a6, roughness: 0.9 }); }
  function doku(u, renkli) {   // 512 px tuval YER TUTUCU ile anında boyutlu doku (odaKur/yuzeyDoku image.height okur; TextureLoader asenkron → null çöküyordu), görsel yüklenince yerine geçer
    if (!u) return null; var c = document.createElement('canvas'); c.width = c.height = 512; var g = c.getContext('2d'); g.fillStyle = renkli ? '#b9b1a6' : '#808080'; g.fillRect(0, 0, 512, 512);   // yüklenene dek nötr (siyah değil)
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = renkli ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.userData.malzeme3b = true;
    var im = new Image(); im.onload = function () {
      g.drawImage(im, 0, 0, 512, 512); t.needsUpdate = true;   // aynı tuvale boyanır; KLONLAR source paylaşır ama sürümleri ayrıdır → aşağıda tek tek tazelenir (13.10 ölçüm: tabla bej yer tutucuda kalıyordu)
      var bag = (typeof _dokuBaglari !== 'undefined') ? _dokuBaglari.get(t.source) : null;   // odaKur duvarı _dikeyDoku ile 90° döndürülmüş KOPYA almış olabilir (çağrı anındaki pikseller) — onu da yeniden boya
      var tazele = function (b) { if (b && b.klonlar) b.klonlar.forEach(function (k) { k.needsUpdate = true; }); };
      tazele(bag);
      if (bag && bag.dikey && bag.dikey.image && bag.dikey.image.getContext) { var d = bag.dikey.image, dg = d.getContext('2d'); dg.save(); dg.setTransform(1, 0, 0, 1, 0, 0); dg.clearRect(0, 0, d.width, d.height); dg.translate(0, d.height); dg.rotate(-Math.PI / 2); dg.drawImage(c, 0, 0); dg.restore(); bag.dikey.needsUpdate = true; tazele(_dokuBaglari.get(bag.dikey.source)); }
    }; im.src = u; return t; }
  var n = s.normal == null ? 0.8 : s.normal;
  var m = new THREE.MeshStandardMaterial({ map: doku(k.diff, true), normalMap: doku(k.nor, false), roughnessMap: doku(k.rough, false), roughness: s.puruz == null ? 1 : s.puruz, metalness: s.metal || 0, normalScale: new THREE.Vector2(n, n) });
  // PARLAKLIK (13.10 ölçüm, ortalama luma): Poly Haven ahşap/laminat albedoları orta ton (white_oak 123, oak 129, ash 147,
  // laminat 131, ceviz 126 / 255) → sahnede çamur gibi koyu okunuyordu («ahşap malzemesi çok kötü»); set başına çarpanla açık
  // tona çekilir (hedef ≈ 190-200). s.parlaklik ile değiştir; s.renk verilirse o kazanır.
  var PARLAK = { white_oak_veneer: 1.5, oak_veneer_01: 1.4, ash_veneer: 1.3, grey_oak_veneer_02: 1.3, washed_grey_oak_veneer: 1.1,
                 teak_veneer: 1.3, natural_walnut_veneer: 1.2, laminate_floor_02: 1.85, white_planks_clean: 1.2, wood_floor: 1.6,
                 wooden_floor_02: 1.35, oak_wood_planks: 1.45 };
  var pk = s.parlaklik != null ? s.parlaklik : (PARLAK[kimlik] || 1);
  if (s.renk) m.color.set(s.renk); else if (pk !== 1) m.color.setRGB(pk, pk * 0.985, pk * 0.965);   // hafif sıcak: beyazlatmaz, açar
  m.userData.sabitKaro = (k.boyut && k.boyut[0]) ? k.boyut[0] * 2 : 2; m.userData.phDoku = kimlik;   // 1 m = 2 birim
  m.userData.damarV = /^(oak_veneer_01|white_oak_veneer|white_planks_clean|wood_floor)$/.test(kimlik);   // 13.10 ÖLÇÜLDÜ (diff gradyan oranı dx/dy): bu 4 sette damar görüntünün V ekseninde (oak 2.9, white_oak 3.7, planks 9.4, wood_floor 1.8); ash/teak/ceviz/grey_oak/laminate/oak_planks/wooden_floor_02 U'da (0.3-0.6) → _yuzMalzeme yalnız V'dekileri çevirir, damar seçilen eksende akar
  return m;
}
return {_lcg:_lcg,_rgb:_rgb,_rgba:_rgba,karisim:karisim,gurultuAlani:gurultuAlani,fbmAlani:fbmAlani,alanDokusu:alanDokusu,normalHaritasi:normalHaritasi,_dokuYap:_dokuYap,_tane:_tane,normalDokusu:normalDokusu,_dikeyDoku:_dikeyDoku,_dokuKaydir:_dokuKaydir,dokuOlcek:dokuOlcek,_yuzMalzeme:_yuzMalzeme,yuzeyDoku:yuzeyDoku,kutuDoku:kutuDoku,silindirDoku:silindirDoku,_tipliOlcek:_tipliOlcek,_uvAcikligi:_uvAcikligi,_yogunlukOlcek:_yogunlukOlcek,tekrarKir:tekrarKir,otoOlcek:otoOlcek,uzayFonu:uzayFonu,dalgaNormali:dalgaNormali,gurultuDoku:gurultuDoku,cizgiDoku:cizgiDoku,damarDoku:damarDoku,ahsapDokusu:ahsapDokusu,budakEkle:budakEkle,ahsapMalzeme:ahsapMalzeme,mermerDoku:mermerDoku,karoDoku:karoDoku,fayansDokusu:fayansDokusu,fayansMalzeme:fayansMalzeme,mermerDokusu:mermerDokusu,mermerMalzeme:mermerMalzeme,mozaikDokusu:mozaikDokusu,mozaikMalzeme:mozaikMalzeme,parkeMalzeme:parkeMalzeme,duvarKagidiDokusu:duvarKagidiDokusu,duvarKagidiMalzeme:duvarKagidiMalzeme,haliMalzeme:haliMalzeme,devreDoku:devreDoku,filmKalinlik:filmKalinlik,kontakGolgesi:kontakGolgesi,fonDegradesi:fonDegradesi,sonsuzFon:sonsuzFon,odaKur:odaKur,odaTezgah:odaTezgah,duvarRaf:duvarRaf,_duvarYerlestir:_duvarYerlestir,_odaOlcusu:_odaOlcusu,_duvarBul:_duvarBul,_duvarDelik:_duvarDelik,_izinli:_izinli,_vec3:_vec3,_sayilastir:_sayilastir,odaKapi:odaKapi,odaPencere:odaPencere,sahneAmbiyansi:sahneAmbiyansi,ambiyansKoru:ambiyansKoru,sonIslem:sonIslem,camDuzelt:camDuzelt,kaustik:kaustik,kureselAyna:kureselAyna,_pufDokusu:_pufDokusu,bulutMalzeme:bulutMalzeme,bulutYap:bulutYap,phMalzeme:phMalzeme};
};
window.MALZEME3B_OTO = function (scene, renderer) { try { var m = MALZEME3B(renderer); m.ambiyansKoru(scene); m.camDuzelt(scene); return m.otoOlcek(scene); } catch (e) { console.warn('MALZEME3B_OTO', e); return 0; } };
