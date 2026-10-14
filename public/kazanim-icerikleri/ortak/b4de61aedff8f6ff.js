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
  s = _izinli(s, ['merkez', 'kapi', 'pencere']); s = _sayilastir(s);   // STANDART ODA (13.10 «odanın ebatları da hep aynı olsun»): ölçü / duvar / tavan / malzeme seçenekleri düşer — 14×10×5 birim (7×5×2,5 m), dört duvar, tavansız
  var o = 1, W = 14, D = 10, H = 5, m = s.merkez || new THREE.Vector3(0, 0, 0);
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
  s = _izinli(s, ['tur', 'genislik', 'derinlik', 'yukseklik', 'merkez', 'donus']); s = _sayilastir(s); var M = 2;   // birim/m — STANDART: malzeme / ayak / renk seçeneği yok (13.10 «sadece masayı seçsin»)
  var tur = s.tur || 'laboratuvar', G = s.genislik || (tur === 'sinif' ? 1.2 : 3.0) * M, D = s.derinlik || (tur === 'sinif' ? 0.6 : tur === 'mutfak' ? 0.6 : 1.1) * M, Y = s.yukseklik || (tur === 'sinif' ? 0.76 : 0.9) * M;
  var mz = s.merkez || new THREE.Vector3(0, 0, 0), grup = new THREE.Group();
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
  s = _izinli(s, ['duvar', 'oda', 'konum', 'merkez', 'donus', 'yukseklik', 'genislik', 'derinlik', 'kalinlik']); s = _sayilastir(s); /* STANDART: malzeme seçeneği yok */ var M = 2, G = s.genislik || 1.2 * M, D = s.derinlik || 0.28 * M, K = s.kalinlik || 0.03 * M, Y = s.yukseklik || 1.5 * M;
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
function _vec3(v, yedek) {   // THREE.Vector3 | [x, y, z] | {x, y, z} → Vector3; eksik/sonlu olmayan bileşen yedekten (13.10 ölçüm: ajan merkez: [0, 0, -0.6] yazdı, position.copy NaN verdi, sahne kayboldu)
  var y = yedek || new THREE.Vector3(0, 0, 0);
  if (!v) return y.clone();
  var x = Array.isArray(v) ? v[0] : v.x, yy = Array.isArray(v) ? v[1] : v.y, z = Array.isArray(v) ? v[2] : v.z;
  x = +x; yy = +yy; z = +z;
  return new THREE.Vector3(isFinite(x) ? x : y.x, isFinite(yy) ? yy : y.y, isFinite(z) ? z : y.z);
}
function _sayilastir(s) {   // SEÇENEK DAYANIKLILIĞI: sayısal seçenekler sayıya ("1.0" → 1), merkez/hedef/lamba Vector3'e; çevrilemeyen seçenek DÜŞER ki yardımcının varsayılanı devreye girsin
  ['genislik', 'derinlik', 'yukseklik', 'kalinlik', 'altKot', 'bolme', 'konum', 'donus', 'olcek'].forEach(function (k) {
    if (s[k] === undefined) return;
    var n = (s[k] === null || s[k] === '' || typeof s[k] === 'object') ? NaN : +s[k];
    if (isFinite(n)) s[k] = n; else delete s[k];
  });
  ['merkez', 'hedef', 'lamba'].forEach(function (k) { if (s[k] !== undefined && s[k] !== null) s[k] = _vec3(s[k]); else delete s[k]; });
  return s;
}
function odaKapi(scene, s) {   // AHŞAP KAPI (odaKur duvarına GÖMÜLÜ; ölçüler BİRİM, 1 birim = 0,5 m): duvarda delik + kasa (delik kenarını sarar, içeri 2 cm taşar) + TEK yüzeyli kanat (paneller oluk çizgisi; düzlemden 2 cm içeride) + kol + TABELA (üstte gerçek EBA logosu — montaj window.EBA_LOGO gömer — altında yazı) + süpürgelik kapıda kesilir. s = { duvar: 'arka'|'sol'|'sag'|'on', oda: odaKur dönüşü (delik için ŞART), konum: duvar boyunca kayma, genislik: 1.9 (95 cm), yukseklik: 4.2 (2,1 m), tip: 'ahsap' (beyaz meşe kaplama, cilalı; varsayılan) | 'koyu' (ceviz) | 'boyali' (mat toz boya, renk), phDoku, ahsap, kapiMat / kasaMat: reçete, karo: damar karosu (birim), tabela: 'LABORATUVAR' (boş = yok), logo: true, logoDoku: kendi THREE.Texture'ın, kol: true, delik: false → yüzeye asılır }. Dönüş { grup, kanat, tabela }. Konumu boş duvar yüzeyine ver (tezgâhın arkasına değil)
  s = _izinli(s, ['duvar', 'oda', 'konum', 'merkez', 'donus', 'genislik', 'yukseklik', 'tabela', 'logo', 'logoDoku', 'kol', 'delik']); s = _sayilastir(s);   // STANDART: tip / malzeme seçeneği yok
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
  s = _izinli(s, ['duvar', 'oda', 'konum', 'merkez', 'donus', 'altKot', 'genislik', 'yukseklik', 'bolme', 'manzara', 'delik']); s = _sayilastir(s);   // STANDART: çerçeve malzemesi seçeneği yok
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
  s = _sayilastir(Object.assign({}, s || {})); var o = s.olcek || 1, h = s.hedef || new THREE.Vector3(0, 0, 0), d = {};
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
var _RECETE_BOSLUK = (function () { var h = { get: function (t, p) { if (p === Symbol.toPrimitive) return function () { return 1; }; if (p === 'then' || p === 'toJSON') return undefined; return _RECETE_BOSLUK; }, set: function () { return true; }, apply: function () { return _RECETE_BOSLUK; }, construct: function () { return _RECETE_BOSLUK; }, has: function () { return true; } }; return new Proxy(function () {}, h); })();   // nesne yer tutucusu (camMesh gibi): atama/çağrı sessizce yutulur
var _RECETELER = {
  "cam": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null; var camKalinligi = sec.camKalinligi !== undefined ? sec.camKalinligi : 0.3; var camMesh = sec.camMesh !== undefined ? sec.camMesh : _RECETE_BOSLUK;
    try {
      var camMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.02,      // buzlu cam: roughness 0.35-0.5
        transmission: 1, ior: 1.5, thickness: camKalinligi,   // DOLU cam: KÜRE/MERCEK YARIÇAP (jüri ölçtü: tam çap örneklemeyi kırılma tamponunun dışına taşıyor, küre tek ton süt oluyor), KÜP/BLOK kenarın yarısı-tamı. İÇİ BOŞ nesne (ampul, beher, bardak, şişe) BU REÇETEYLE KURULMAZ → cam-kabuk (yarıçap yazılırsa kristal küre gibi kırar, ölçüldü)
        attenuationColor: new THREE.Color(0xe6f3f1), attenuationDistance: 4,     // KİLİTLİ (kabul kapısı): çok hafif gövde tonu (1.2 küreyi süte boğuyordu — jüri); renkli cam: 0x7fc7ff / 0.6 (yalnız senaryo nesnesi renk söylüyorsa)
        specularIntensity: 1, envMapIntensity: 1              // StudyoOrtami ile her malzemede 1 (toplu kısma yok)
      });   // opacity 1 kalır, transparent YAZMA
      camMesh.castShadow = false;   // ince cam gölge atmaz; dolu mercek/prizma atar — gölge ortasına kaustik(…) lekesi koy (yardımcı)
    } catch (e) { _hata = e; }
    return { _hata: _hata, camMat: (typeof camMat !== 'undefined' ? camMat : undefined) };
  },
  "cam-kabuk": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null; var inceCamMesh = sec.inceCamMesh !== undefined ? sec.inceCamMesh : _RECETE_BOSLUK;
    try {
      var inceCamMat = new THREE.MeshPhysicalMaterial({   // ALFA KABUK (27.09 ölçüldü, cam deneyi): kırıcı ince kabuk hem kendisi görünmüyor hem içindeki kırıcı sıvıyı YUTUYORDU (kırılma tamponu yalnız opakları görür) — kabuk kırıcı DEĞİL; camlığı clearcoat parlaması + %12 örtü + kenar sheen'i verir, içindekiler (flaman, sıvı, termometre) bozulmadan görünür
        color: 0xffffff, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.12, depthWrite: false,
        clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 1, side: THREE.DoubleSide   // sheen: kenar parlaması cam kenarını okutur (kabuk deneyinde ölçüldü: %16 örtü süt, %8 görünmez)
      });   // transmission YAZMA: kabuğa transmission/roughness 0.15/thickness 0.3 verilirse içindekiler flulaşır, sıvı kaybolur (sayfa açılışında camDuzelt bunu zaten düzeltir)
      inceCamMesh.castShadow = false;   // kabuk gölge atmaz; içindeki opak flaman/nesne atar. İçindeki SIVI kırıcıdır → sivi-kapta
    } catch (e) { _hata = e; }
    return { _hata: _hata, inceCamMat: (typeof inceCamMat !== 'undefined' ? inceCamMat : undefined) };
  },
  "su-yuzeyi": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null; var havuzD = sec.havuzD !== undefined ? sec.havuzD : 4; var havuzW = sec.havuzW !== undefined ? sec.havuzW : 4; var suDerinligi = sec.suDerinligi !== undefined ? sec.suDerinligi : 0.6; var suSeviyesi = sec.suSeviyesi !== undefined ? sec.suSeviyesi : 0.5;
    try {
      var dalga1 = dalgaNormali(256, 1, 0), dalga2 = dalgaNormali(256, 1.7, 2.1);
      dalga1.repeat.set(4, 4); dalga2.repeat.set(2.5, 2.5);   // dalga sıklığı: havuz 4, deniz/göl ≈ yüzey boyu / 2 (2'de dalga kare ölçeğinde okunmuyordu)
      var suMat = new THREE.MeshPhysicalMaterial({             // AÇIK SU (deniz, göl, nehir): OPAK, gökyüzünü yansıtır — KIRILMA YOK (27.09: kırıcı denizde tekne gövdesi dalgayla kayıp ikinci kez çiziliyordu)
        color: 0x1b6a8f, metalness: 0, roughness: 0.18,       // göl 0x2b6470, nehir 0x3f7a70, tropik sığ 0x2a93a8
        specularIntensity: 0.6,                               // yansıma payı: 1'de ufuk gri-beyaza dönüyordu (ölçüldü 27.09)
        normalMap: dalga1, normalScale: new THREE.Vector2(0.5, 0.5),   // durgun 0.2, dalgalı 0.7
        clearcoat: 0.15, clearcoatRoughness: 0.1, clearcoatNormalMap: dalga2, clearcoatNormalScale: new THREE.Vector2(0.25, 0.25),   // ikinci dalga katmanı; clearcoat > 0.3 beyaz benek yapar (ölçüldü)
        envMapIntensity: 0.5
      });
      var berrakSuMat = suMat.clone(); berrakSuMat.setValues({ color: 0xffffff, roughness: 0.04,   // DİBİ GÖRÜNEN SU (havuz, akvaryum, kova): kırıcı + opak gövde
        transmission: 1, ior: 1.33, thickness: 0.3,           // İNCE: 1.0'da batık/yüzen nesne çift görünüyordu (27.09)
        attenuationColor: new THREE.Color(0x3f9fcf), attenuationDistance: 0.55, envMapIntensity: 0.35 });   // sığ kova 0xd8f2ff / 1.2; env 0.6'da mavi griye döner (ölçüldü)
      var suYuzeyi = new THREE.Mesh(new THREE.PlaneGeometry(havuzW, havuzD), suMat);   // TEK DÜZLEM (havuzda berrakSuMat)
      suYuzeyi.rotation.x = -Math.PI / 2; suYuzeyi.position.y = suSeviyesi; suYuzeyi.receiveShadow = true;
      var govdeMat = new THREE.MeshStandardMaterial({ color: 0x2a78a8, roughness: 0.9, side: THREE.DoubleSide });   // YALNIZ berrak suda: opak gövde (iç duvar + dip görünür)
      var ustYok = new THREE.MeshBasicMaterial({ visible: false });                 // üst yüz yok: batık nesne yüzeyden görünsün
      var suGovdesi = new THREE.Mesh(new THREE.BoxGeometry(havuzW, suDerinligi, havuzD), [govdeMat, govdeMat, ustYok, govdeMat, govdeMat, govdeMat]);   // yüz sırası +x −x +y −y +z −z
      suGovdesi.position.y = suSeviyesi - suDerinligi / 2 - 0.005;
      // animasyon döngüsünde: dalga1.offset.x += 0.0004; dalga2.offset.y -= 0.0003;
    } catch (e) { _hata = e; }
    return { _hata: _hata, dalga1: (typeof dalga1 !== 'undefined' ? dalga1 : undefined), dalga2: (typeof dalga2 !== 'undefined' ? dalga2 : undefined), suMat: (typeof suMat !== 'undefined' ? suMat : undefined), berrakSuMat: (typeof berrakSuMat !== 'undefined' ? berrakSuMat : undefined), suYuzeyi: (typeof suYuzeyi !== 'undefined' ? suYuzeyi : undefined), govdeMat: (typeof govdeMat !== 'undefined' ? govdeMat : undefined), ustYok: (typeof ustYok !== 'undefined' ? ustYok : undefined), suGovdesi: (typeof suGovdesi !== 'undefined' ? suGovdesi : undefined) };
  },
  "sivi-kapta": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null; var icYaricapAlt = sec.icYaricapAlt !== undefined ? sec.icYaricapAlt : 0.2; var icYaricapUst = sec.icYaricapUst !== undefined ? sec.icYaricapUst : 0.22; var kapTabani = sec.kapTabani !== undefined ? sec.kapTabani : 0; var siviCapi = sec.siviCapi !== undefined ? sec.siviCapi : 0.4; var siviYuksekligi = sec.siviYuksekligi !== undefined ? sec.siviYuksekligi : 0.4;
    try {
      // KIRILMAYI KALIN HACİM YAPAR: sıvı KIRICI, ince cam kabuk KIRICI DEĞİL (alfa saydam + clearcoat parlaması). İki kırıcı iç içe görünmez; kabuk 0.01 kalınlığıyla kırılmaya zaten katkısızdır.
      var camKabukMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.03, transparent: true, opacity: 0.12, depthWrite: false,
        clearcoat: 1, clearcoatRoughness: 0.03, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), envMapIntensity: 1, side: THREE.DoubleSide });   // beher/bardak kabuğu (LatheGeometry); %12 örtü + kenar sheen (27.09 kabuk deneyi: %16 süt gibi okunuyordu)
      var siviMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.02,
        transmission: 1, ior: 1.33, thickness: siviCapi,                          // sıvı KIRICI; thickness = sıvı sütununun çapı; ior su 1.33 / yağ 1.47 / alkol 1.36
        attenuationColor: new THREE.Color(0xe4f6ff), attenuationDistance: 4,      // SU BARDAKTA RENKSİZDİR (Beer yasası: renk = yol / mesafe; birkaç cm yolda mavi doğmaz) — çok açık ton + uzun mesafe
        envMapIntensity: 1                                                        // boyalı çözelti/meyve suyu: attenuationColor çözeltinin rengi (0x4aa3d8 bakır sülfat, 0xffa321 portakal), attenuationDistance 0.4-0.8; süt gibi opak sıvı: transmission 0, color 0xf2efe6, roughness 0.3
      });
      var sivi = new THREE.Mesh(new THREE.CylinderGeometry(icYaricapUst, icYaricapAlt, siviYuksekligi, 64), siviMat);
      sivi.position.y = kapTabani + siviYuksekligi / 2 + 0.01;   // kap iç yüzeyinden 0.005-0.01 içeride (eş düzlem yasağı); üst kapak = menisküs, ayrı disk gerekmez
    } catch (e) { _hata = e; }
    return { _hata: _hata, camKabukMat: (typeof camKabukMat !== 'undefined' ? camKabukMat : undefined), siviMat: (typeof siviMat !== 'undefined' ? siviMat : undefined), sivi: (typeof sivi !== 'undefined' ? sivi : undefined) };
  },
  "buz": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null; var buzKenari = sec.buzKenari !== undefined ? sec.buzKenari : 0.3;
    try {
      var buzBump = gurultuDoku(256, '#8899aa', 1, 2, false);   // veri dokusu (bump)
      var buzMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.1,            // buz YÜZEYİ camsıdır; 0.3+ pürüz kırılma tamponunu mip sisine çevirir (beyaz plastik blok — ölçüldü)
        transmission: 1, ior: 1.31, thickness: buzKenari,         // blok kalınlığı
        attenuationColor: new THREE.Color(0xa9d6ff), attenuationDistance: 0.9,   // içten mavimsi
        normalMap: normalDokusu(gurultuDoku(512, '#8899aa', 0.8, 3, false), 0.6), normalScale: new THREE.Vector2(0.15, 0.15),   // DÜŞÜK frekanslı hafif normal: 256 px bump ×0.035 kırılma tamponunu cızırtıya çeviriyordu (jüri: Laplace 80 vs cam 20)
        envMapIntensity: 1, specularIntensity: 1
      });   // buzlu görünüm İÇ yapıdan gelir: bloğun içine 10-15 küçük OPAK kabarcık/çatlak (SphereGeometry 0.02-0.05, MeshStandardMaterial 0xf4f8ff roughness 0.9) — kırıcı hacim içinden görünürler; geometri THREE.RoundedBoxGeometry(w, h, d, 4, 0.05)
      var karMat = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.95, bumpMap: buzBump, bumpScale: 0.02 });
    } catch (e) { _hata = e; }
    return { _hata: _hata, buzBump: (typeof buzBump !== 'undefined' ? buzBump : undefined), buzMat: (typeof buzMat !== 'undefined' ? buzMat : undefined), karMat: (typeof karMat !== 'undefined' ? karMat : undefined) };
  },
  "bal-jel": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var balMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.08,
        transmission: 1, ior: 1.48, thickness: 0.5,                             // küre için YARIÇAP
        attenuationColor: new THREE.Color(0xe8a83a), attenuationDistance: 1.3,    // KISA mesafe = yoğun renk (bal 0.7; 0.35 neredeyse opak görünür — ölçüldü); yağ 0xe6d24a / 1.5; jöle 0xe0304a / 0.8
        envMapIntensity: 1
      });
    } catch (e) { _hata = e; }
    return { _hata: _hata, balMat: (typeof balMat !== 'undefined' ? balMat : undefined) };
  },
  "sabun-kopugu": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null; var kopukMesh = sec.kopukMesh !== undefined ? sec.kopukMesh : _RECETE_BOSLUK;
    try {
      var kopukMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0,
        transmission: 1, ior: 1.02, thickness: 0,                 // thickness 0 = ince duvar (kırma yok, yalnız film)
        iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [120, 700],   // ince-film girişimi; haritasız kalınlık TEK değerdir (tek ton) → harita şart
        iridescenceThicknessMap: filmKalinlik(256),               // fBm kalınlık dağılımı → gökkuşağı BANTLARI
        side: THREE.DoubleSide, envMapIntensity: 1.5              // renkler ortam parlaklığından doğar; 0.45 ile film silik kalır (ölçüldü)
      });
      kopukMesh.castShadow = false;
    } catch (e) { _hata = e; }
    return { _hata: _hata, kopukMat: (typeof kopukMat !== 'undefined' ? kopukMat : undefined) };
  },
  "kristal": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var kristalMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0,
        transmission: 1, ior: 2.33, thickness: 0.6,               // three tavanı 2.333 (elmas 2.42'ye en yakın); kuvars/tuz 1.54
        attenuationColor: new THREE.Color(0x3b6fd8), attenuationDistance: 2.0,   // GÖVDE RENGİ (0.8 pavyonu opak laciverte boğuyordu — jüri): safir 0x3b6fd8 / zümrüt 0x2fbf6a / yakut 0xc0203a; renksiz taş (kuvars, tuz) 0xdde8ff / 1.0 — r155'te iç yansıma/dispersiyon yok, renksiz taş buzlu cama benzer
        specularIntensity: 1, envMapIntensity: 1.0, clearcoat: 0.3, clearcoatRoughness: 0,   // hafif ikinci Fresnel lobu (1.6 + clearcoat 1 taçı opak gri-beyaza çeviriyordu — jüri)
        flatShading: true                                          // fasetler KESKİN kalır
      });
      // PIRLANTA KESİMİ: taç (8 kenarlı kesik koni) + pavyon (ters koni) — tek oktahedrondan çok daha okunur
      var tac = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 0.22, 8, 1), kristalMat);
      var pavyon = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.55, 8, 1), kristalMat); pavyon.rotation.x = Math.PI; pavyon.position.y = -0.385;
      var kristal = new THREE.Group(); kristal.add(tac, pavyon);   // mineral/kuvars için OctahedronGeometry(r, 0) ya da altıgen prizma da olur
    } catch (e) { _hata = e; }
    return { _hata: _hata, kristalMat: (typeof kristalMat !== 'undefined' ? kristalMat : undefined), tac: (typeof tac !== 'undefined' ? tac : undefined), pavyon: (typeof pavyon !== 'undefined' ? pavyon : undefined), kristal: (typeof kristal !== 'undefined' ? kristal : undefined) };
  },
  "plastik-seffaf": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null; var pleksiMesh = sec.pleksiMesh !== undefined ? sec.pleksiMesh : _RECETE_BOSLUK;
    try {
      var pleksiMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.01,           // pleksi NET: 0.06 bile arkadaki deseni 2,5× bulanıklaştırıyordu (jüri Laplace 15,6→6,2)
        transmission: 1, ior: 1.49, thickness: 0.08,              // ince kabuk
        attenuationColor: new THREE.Color(0xdfe9f2), attenuationDistance: 3,   // KİLİTLİ (kabul kapısı): renge boyanmaz — turuncu 0xf5a623 / 1.2 pleksi kuleyi bej buzlu bloğa çevirdi (MAT.10.7.1)
        specularIntensity: 0.8, envMapIntensity: 0.9, side: THREE.DoubleSide
      });
      pleksiMesh.castShadow = false;
    } catch (e) { _hata = e; }
    return { _hata: _hata, pleksiMat: (typeof pleksiMat !== 'undefined' ? pleksiMat : undefined) };
  },
  "metal-parlak": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var celikMat = new THREE.MeshPhysicalMaterial({
        color: 0xdcdfe3, metalness: 1, roughness: 0.1,            // gümüş 0xf0f3f7 / alüminyum 0xd8dee6 / krom 0xffffff roughness 0.05
        roughnessMap: cizgiDoku(512, '#d8d8d8', 'rgba(60,60,60,0.15)', 2, false, false),   // fırça çizgileri pürüzü modüle eder (roughness × doku değeri; koyu doku metali matlaştırır)
        envMapIntensity: 1                                        // METAL ORTAMDAN YAŞAR — ortam haritası ŞART, yoksa gri kararır
      });   // anisotropy KULLANMA: r155'te vertex shader vUv tanımlamaz, program derlenmez, nesne HİÇ çizilmez (ölçüldü; fırça izi roughnessMap ile zaten var)
    } catch (e) { _hata = e; }
    return { _hata: _hata, celikMat: (typeof celikMat !== 'undefined' ? celikMat : undefined) };
  },
  "metal-mat": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var demirMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setRGB(0.53, 0.51, 0.49, THREE.LinearSRGBColorSpace), metalness: 1, roughness: 0.55,   // demir F0 (lineer); titanyum (0.44,0.40,0.36) / kurşun (0.63,0.64,0.69) roughness 0.6
        roughnessMap: cizgiDoku(512, '#909090', 'rgba(255,255,255,0.3)', 3, false, false),                         // fırça çizgisi pürüzü modüle eder (color × map ÇİFT ÇARPIMI yok: metalde map koyulaştırır)
        normalMap: normalDokusu(cizgiDoku(512, '#888888', 'rgba(255,255,255,0.5)', 4, false, false), 0.8), normalScale: new THREE.Vector2(0.15, 0.15),
        envMapIntensity: 1
      });
    } catch (e) { _hata = e; }
    return { _hata: _hata, demirMat: (typeof demirMat !== 'undefined' ? demirMat : undefined) };
  },
  "altin-bakir": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // Metal F0 renkleri LİNEER ölçülmüş değerlerdir (physicallybased.info); hex sRGB sayılıp koyulaştırılır → setRGB(r,g,b, THREE.LinearSRGBColorSpace)
      var altinMat = new THREE.MeshStandardMaterial({ color: 0xffc648, metalness: 1, roughness: 0.2, envMapIntensity: 1.3 });   // ALGISAL renk: lineer F0 (1.0,0.766,0.336) + nötr stüdyo ortamı doygunluğu 0.57→0.33 düşürdü, «plastik top» (jüri); kabul: küre HSV doygunluğu ≥ 0.5
      var bakirMat = new THREE.MeshStandardMaterial({ color: 0xd9744a, metalness: 1, roughness: 0.22, envMapIntensity: 1.3 });
      var pirincMat = new THREE.MeshStandardMaterial({ color: 0xe0b84a, metalness: 1, roughness: 0.2, envMapIntensity: 1.3 });   // bronz 0xb07e46 roughness 0.35; parıltı (0.2) «metal» der, 0.3+ satene döner
    } catch (e) { _hata = e; }
    return { _hata: _hata, altinMat: (typeof altinMat !== 'undefined' ? altinMat : undefined), bakirMat: (typeof bakirMat !== 'undefined' ? bakirMat : undefined), pirincMat: (typeof pirincMat !== 'undefined' ? pirincMat : undefined) };
  },
  "pasli-metal": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var pasMaske = fbmAlani(512, 6, 3, 51), pasIc = fbmAlani(512, 4, 24, 52);   // kümeli leke maskesi (yumuşak eşik) + iç tanecik
      var pasK = new Float32Array(512 * 512); for (var pi = 0; pi < pasK.length; pi++) { var pm = (pasMaske[pi] * 0.7 + pasIc[pi] * 0.3 - 0.42) / 0.16; pasK[pi] = pm < 0 ? 0 : pm > 1 ? 1 : pm; }   // eşik 0.42 → pas oranı (0.5 daha az pas)
      var pasRenk = alanDokusu(512, pasK, function (v, x, y) { var pas = karisim([92, 58, 34], [179, 98, 42], pasIc[y * 512 + x]); return karisim([122, 127, 136], pas, v); });        // metal gri ↔ pas turuncu-kahve
      var pasMetal = alanDokusu(512, pasK, function (v) { var k = (1 - v) * 255; return [k, k, k]; }, false);                                                                       // metalness: pas yok → 1
      var pasPuruz = alanDokusu(512, pasK, function (v, x, y) { var k = (0.35 + v * 0.6 + (pasIc[y * 512 + x] - 0.5) * 0.1) * 255; return [k, k, k]; }, false);                    // roughness: metal 0.35 → pas 0.95
      var pasMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, map: pasRenk, metalness: 1, metalnessMap: pasMetal, roughness: 1, roughnessMap: pasPuruz,
        normalMap: normalHaritasi(512, pasK, 2.0), normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 0.8    // metal kısmı ortamdan yaşar, pas kabarır
      });   // yeşil bakır patinası: pas renklerini [70,120,100]/[120,170,140] yap
    } catch (e) { _hata = e; }
    return { _hata: _hata, pasMaske: (typeof pasMaske !== 'undefined' ? pasMaske : undefined), pasIc: (typeof pasIc !== 'undefined' ? pasIc : undefined), pasK: (typeof pasK !== 'undefined' ? pasK : undefined), pi: (typeof pi !== 'undefined' ? pi : undefined), pm: (typeof pm !== 'undefined' ? pm : undefined), pasRenk: (typeof pasRenk !== 'undefined' ? pasRenk : undefined), pas: (typeof pas !== 'undefined' ? pas : undefined), pasMetal: (typeof pasMetal !== 'undefined' ? pasMetal : undefined), k: (typeof k !== 'undefined' ? k : undefined), pasPuruz: (typeof pasPuruz !== 'undefined' ? pasPuruz : undefined), pasMat: (typeof pasMat !== 'undefined' ? pasMat : undefined) };
  },
  "ahsap": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // AHŞAP TÜRÜ SEÇ — hep aynı ahşap KUSURDUR: senaryonun Malzemeler alanı tür yazmışsa (ahsap-ceviz) onu; yoksa bağlamdan:
      //   okul sırası/sandalye → kayin · çalışma masası/mobilya → ceviz ya da mese · kulübe/çit/kasa/kalas → cam · iskele/ahır/eski çit → eski ·
      //   sandık/piyano/tekne → maun · raf/kontrplak/oyuncak → hus · lüks kutu/satranç → abanoz · doğu/bahçe → bambu · kiraz sıcak kızıl vurgu.
      //   AYNI SAHNEDE iki ahşap nesne farklı tür/cila olabilir (masa ceviz vernik, sandalye kayın mat); aynı türde tahtalar farklı tohum alır (desen aynı yerde tekrarlamaz).
      var ahsapMat = ahsapMalzeme('mese');                 // TABAN: tür, cila 'mat' (varsayılan) — dokuyu ölçeksiz taşır; nesneye kutuDoku/silindirDoku/yuzeyDoku ile ölçeklenir
      var cilaliAhsapMat = ahsapMalzeme('ceviz', 'vernik');   // vernikli: clearcoat 0.4 (lake 0.8 = parlak boyalı görünüm)
      var camAhsapMat = ahsapMalzeme('cam', 'mat', 2);      // çam: geniş seyrek damar; 3. parametre tohum = farklı tahta deseni. Budak yalnız TEK KAROLU yüzeye: tekTahta.material.map = budakEkle(camAhsapMat.map, 1, 5) (döşenen yüzeyde budak her karoda tekrar eder → KUSUR)
      var AHSAP_KARO = 0.6;   // DOKU ÖLÇEĞİ: ahşapta bir karo (28 damar) = 0,6 birim (≈ 20 cm) — ahsapMalzeme bu tavanı kendisi taşır, daha büyük yazsan da kırpılır (ölçüldü: karo 2 → damar aralığı 2,4 cm + 66 cm dalga, «masa damarları dev»; 0,6 → gerçek meşe). repeat'siz karo TÜM yüzeye gerilir (22 birimlik masada damar dev — ölçüldü)
      var masaTablasi = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 6), kutuDoku(cilaliAhsapMat, 12, 0.4, 6, AHSAP_KARO));   // KUTUDA MALZEME DİZİSİ: yan yüzler kendi boyutuyla döşenir; damar en uzun kenar (x) boyunca
      var masaAyagi = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.8, 32), silindirDoku(cilaliAhsapMat, 0.15, 2.8, AHSAP_KARO));   // AYAK/DİREK: damar ayak BOYUNCA (çevre halkası KUSURDUR; halka isteniyorsa 5. parametre true)
      var kutuAyak = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.8, 0.25), kutuDoku(ahsapMalzeme('kayin'), 0.25, 2.8, 0.25, AHSAP_KARO));   // kutu ayak: en uzun eksen (y) → yanlarda damar dikey
      var kutuk = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 3, 48), silindirDoku(camAhsapMat, 0.6, 3, AHSAP_KARO));   // kütük: [yan, üst, alt]; damar eksen boyunca
      var raf = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.5), yuzeyDoku(ahsapMalzeme('hus'), 4, 1.5, AHSAP_KARO));   // tek yüz: yuzeyDoku; her nesne kendi kaydırmasını alır
    } catch (e) { _hata = e; }
    return { _hata: _hata, ahsapMat: (typeof ahsapMat !== 'undefined' ? ahsapMat : undefined), cilaliAhsapMat: (typeof cilaliAhsapMat !== 'undefined' ? cilaliAhsapMat : undefined), camAhsapMat: (typeof camAhsapMat !== 'undefined' ? camAhsapMat : undefined), AHSAP_KARO: (typeof AHSAP_KARO !== 'undefined' ? AHSAP_KARO : undefined), masaTablasi: (typeof masaTablasi !== 'undefined' ? masaTablasi : undefined), masaAyagi: (typeof masaAyagi !== 'undefined' ? masaAyagi : undefined), kutuAyak: (typeof kutuAyak !== 'undefined' ? kutuAyak : undefined), kutuk: (typeof kutuk !== 'undefined' ? kutuk : undefined), raf: (typeof raf !== 'undefined' ? raf : undefined) };
  },
  "plastik-opak": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var parlakPlastikMat = new THREE.MeshPhysicalMaterial({
        color: 0x4a80f0, metalness: 0, roughness: 0.4,                         // gövde pürüzlü…
        clearcoat: 1, clearcoatRoughness: 0.12, specularIntensity: 0.8, envMapIntensity: 1   // …üstünde TAM cila: enjeksiyon plastiği (ABS/lego) böyle okunur; yarım cila (0.6) + düşük pürüz «ucuz» görünüyordu (ölçüldü)
      });
      var matPlastikMat = new THREE.MeshPhysicalMaterial({
        color: 0xe8e6df, metalness: 0, roughness: 0.6, specularIntensity: 0.6, envMapIntensity: 1,   // örnek açık ton (priz/klavye); koyu plastik kauçukla ayrışmaz
        sheen: 0.15, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff),                    // kenarda yumuşak ışık (mat plastik)
        bumpMap: gurultuDoku(256, '#888', 0.5, 1, false), bumpScale: 0.0015                          // ancak fark edilir tanecik — zımpara bump (0.008) plastiği strafor gibi gösteriyordu
      });
    } catch (e) { _hata = e; }
    return { _hata: _hata, parlakPlastikMat: (typeof parlakPlastikMat !== 'undefined' ? parlakPlastikMat : undefined), matPlastikMat: (typeof matPlastikMat !== 'undefined' ? matPlastikMat : undefined) };
  },
  "kaucuk": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var lastikMat = new THREE.MeshPhysicalMaterial({
        color: 0x1c1c1e, metalness: 0, roughness: 0.85,
        sheen: 0.25, sheenRoughness: 0.8, sheenColor: new THREE.Color(0x444444),   // kadifemsi kenar parlaması
        bumpMap: gurultuDoku(256, '#777', 1.2, 2, false), bumpScale: 0.006
      });
    } catch (e) { _hata = e; }
    return { _hata: _hata, lastikMat: (typeof lastikMat !== 'undefined' ? lastikMat : undefined) };
  },
  "seramik": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var porselenMat = new THREE.MeshPhysicalMaterial({
        color: 0xf2f0ea, metalness: 0, roughness: 0.12,
        clearcoat: 1, clearcoatRoughness: 0.06, specularIntensity: 1, envMapIntensity: 1   // sır tabakası
      });
      var fayansMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: karoDoku(512, '#dfe7ea', '#9aa4a8', 4, true, true), metalness: 0, roughness: 0.15,
        clearcoat: 0.8, clearcoatRoughness: 0.1, envMapIntensity: 1
      });   // karoDoku(n, karo, derz, satır, renkli, kare): kare=true fayans (hizalı), yoksa 2:1 şaşırtmalı tuğla
    } catch (e) { _hata = e; }
    return { _hata: _hata, porselenMat: (typeof porselenMat !== 'undefined' ? porselenMat : undefined), fayansMat: (typeof fayansMat !== 'undefined' ? fayansMat : undefined) };
  },
  "bina-cephe": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var cepheDoku = gurultuDoku(512, '#d4cbbd', 0.35, 2);   // SIVA/BOYA cephe: ince tanecik; pencere/kapı DOKUYA ÇİZİLMEZ (27.09 kullanıcı: pencere ızgarası resmi «çok çirkin» — kaldırıldı)
      var cepheMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: cepheDoku, roughness: 0.88, metalness: 0,
        normalMap: normalDokusu(cepheDoku, 0.7), normalScale: new THREE.Vector2(0.25, 0.25) });   // ton: bina başına cepheMat.clone() + color (2-3 sıcak/pastel ton); beton binada gurultuDoku(512, '#9d9d98', 0.4, 2)
      var pencereCamMat = new THREE.MeshPhysicalMaterial({ color: 0x2b3b50, metalness: 0, roughness: 0.06,
        clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1 });   // pencere camı: koyu mavi-gri, ortamı YANSITIR (transmission YOK — iç mekân yok, kırılma yükü yok); gece: emissive 0xffd48a × 0.6 seçili pencerelerde
      var cerceveMat = new THREE.MeshStandardMaterial({ color: 0xecebe6, roughness: 0.5, metalness: 0 });   // PVC/alüminyum çerçeve, denizlik, kat silmesi
      var kapiMat = new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: 0.6, metalness: 0 });   // giriş kapısı (boyalı); cam kapıda pencereCamMat
      var catiMat = new THREE.MeshStandardMaterial({ color: 0x8e8a94, roughness: 0.95, metalness: 0 });   // düz çatı, parapet üstü, teknik kutu
    } catch (e) { _hata = e; }
    return { _hata: _hata, cepheDoku: (typeof cepheDoku !== 'undefined' ? cepheDoku : undefined), cepheMat: (typeof cepheMat !== 'undefined' ? cepheMat : undefined), pencereCamMat: (typeof pencereCamMat !== 'undefined' ? pencereCamMat : undefined), cerceveMat: (typeof cerceveMat !== 'undefined' ? cerceveMat : undefined), kapiMat: (typeof kapiMat !== 'undefined' ? kapiMat : undefined), catiMat: (typeof catiMat !== 'undefined' ? catiMat : undefined) };
  },
  "zemin-sade": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var sadeZeminMat = fayansMalzeme('porselen');   // NÖTR / LABORATUVAR ZEMİNİ: 60×60 orta ton porselen (27.09 kullanıcı «varsa materyali kullanmalı»: eski gri karoDoku zemin kalktı)
      var karoZeminMat = mozaikMalzeme('gri');          // KORİDOR / okul: dökme mozaik
      // ODA STANDARTTIR (13.10): zemin ve duvar odaKur'dan hazır gelir, bu reçeteler odaya VERİLMEZ (yok sayılır). Kendi yüzeyine uygula — podyum / platform / basamak:
      var podyum = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 2.4), kutuDoku(sadeZeminMat, 4, 0.2, 2.4, 1.2)); podyum.position.set(0, 0.1, 0); scene.add(podyum);
    } catch (e) { _hata = e; }
    return { _hata: _hata, sadeZeminMat: (typeof sadeZeminMat !== 'undefined' ? sadeZeminMat : undefined), karoZeminMat: (typeof karoZeminMat !== 'undefined' ? karoZeminMat : undefined), podyum: (typeof podyum !== 'undefined' ? podyum : undefined) };
  },
  "tas-beton": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var betonDoku = gurultuDoku(512, '#8e8e8a', 0.6, 2);   // düşük kontrast (1.4 kamuflaj lekesi yapıyordu)
      var betonMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: betonDoku, roughness: 0.92, metalness: 0,
        normalMap: normalDokusu(betonDoku, 0.8), normalScale: new THREE.Vector2(0.25, 0.25) });
      var tuglaDoku = karoDoku(512, '#b8402e', '#8d8d8d', 6);
      var tuglaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tuglaDoku, roughness: 0.9, metalness: 0,
        normalMap: normalDokusu(karoDoku(512, '#cccccc', '#333333', 6, false), 2.0), normalScale: new THREE.Vector2(1, 1) });   // derz çukurları
      var granitMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: gurultuDoku(512, '#6e6b6a', 1.0, 3), roughness: 0.25, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.12, envMapIntensity: 1 });   // cilalı granit: iri benekli koyu gri (mermer ayrı kimlik: `mermer`)
    } catch (e) { _hata = e; }
    return { _hata: _hata, betonDoku: (typeof betonDoku !== 'undefined' ? betonDoku : undefined), betonMat: (typeof betonMat !== 'undefined' ? betonMat : undefined), tuglaDoku: (typeof tuglaDoku !== 'undefined' ? tuglaDoku : undefined), tuglaMat: (typeof tuglaMat !== 'undefined' ? tuglaMat : undefined), granitMat: (typeof granitMat !== 'undefined' ? granitMat : undefined) };
  },
  "toprak-zemin": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var toprakDoku = gurultuDoku(512, '#6b4a2e', 0.7, 2);   // düşük kontrast: 1.5/3 «kamuflaj» toprak yapıyordu (ölçüldü)
      var toprakMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: toprakDoku, roughness: 1, metalness: 0,
        normalMap: normalDokusu(toprakDoku, 1.2), normalScale: new THREE.Vector2(0.4, 0.4) });
      var kumDoku = gurultuDoku(512, '#cdb27a', 0.6, 1);
      var kumMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: kumDoku, roughness: 1, metalness: 0,
        normalMap: normalDokusu(kumDoku, 0.8), normalScale: new THREE.Vector2(0.3, 0.3) });   // tane okunur (düz bej blok «sünger» okunuyordu — jüri)
      var cimMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: gurultuDoku(512, '#4c8a34', 0.8, 2), roughness: 0.95, metalness: 0 });
    } catch (e) { _hata = e; }
    return { _hata: _hata, toprakDoku: (typeof toprakDoku !== 'undefined' ? toprakDoku : undefined), toprakMat: (typeof toprakMat !== 'undefined' ? toprakMat : undefined), kumDoku: (typeof kumDoku !== 'undefined' ? kumDoku : undefined), kumMat: (typeof kumMat !== 'undefined' ? kumMat : undefined), cimMat: (typeof cimMat !== 'undefined' ? cimMat : undefined) };
  },
  "kumas-deri": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var kadifeMat = new THREE.MeshPhysicalMaterial({
        color: 0x6a1436, metalness: 0, roughness: 1,
        sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xe07a9a),     // sheenColor = taban renginin 2 kademe AÇIĞI (beyaza yakın verilirse pembe perde — ölçüldü); sheenRoughness 0.75-0.9
        bumpMap: gurultuDoku(256, '#888', 1, 1, false), bumpScale: 0.01
      });
      var orguF = fbmAlani(512, 3, 8, 71), orguH = new Float32Array(512 * 512);
      var ketenDoku = alanDokusu(512, orguF, function (v, x, y) { var w = Math.sin(x / 512 * 6.283 * 96) * Math.sin(y / 512 * 6.283 * 96); var h = 0.5 + w * 0.35 + (v - 0.5) * 0.3; orguH[y * 512 + x] = h; return karisim([203, 184, 148], [233, 220, 192], h); });   // iki yönlü örgü (96 iplik) + fBm
      var ketenMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: ketenDoku, normalMap: normalHaritasi(512, orguH, 1.5), normalScale: new THREE.Vector2(0.35, 0.35),
        roughness: 0.95, metalness: 0, sheen: 0.4, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xf0e6cc) });   // sheenColor tabanla aynı ton; kürede yönlü örgü kutba toplanır: kumaşı düzlem/kutuya ser ya da normalScale 0.3'te tut
      var deriDoku = gurultuDoku(512, '#6b4a2f', 0.8, 2);
      var deriMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: deriDoku, roughness: 0.55, metalness: 0,
        clearcoat: 0.15, clearcoatRoughness: 0.4, normalMap: normalDokusu(deriDoku, 1.2), normalScale: new THREE.Vector2(0.5, 0.5) });
    } catch (e) { _hata = e; }
    return { _hata: _hata, kadifeMat: (typeof kadifeMat !== 'undefined' ? kadifeMat : undefined), orguF: (typeof orguF !== 'undefined' ? orguF : undefined), orguH: (typeof orguH !== 'undefined' ? orguH : undefined), ketenDoku: (typeof ketenDoku !== 'undefined' ? ketenDoku : undefined), w: (typeof w !== 'undefined' ? w : undefined), h: (typeof h !== 'undefined' ? h : undefined), ketenMat: (typeof ketenMat !== 'undefined' ? ketenMat : undefined), deriDoku: (typeof deriDoku !== 'undefined' ? deriDoku : undefined), deriMat: (typeof deriMat !== 'undefined' ? deriMat : undefined) };
  },
  "kagit-karton": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var kagitMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: gurultuDoku(512, '#f1ede3', 0.3, 1), roughness: 0.85, metalness: 0,
        side: THREE.DoubleSide });                                                  // ince sayfa iki yüzlü
      var kartonMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: cizgiDoku(512, '#c9a46c', 'rgba(90,60,20,0.2)', 6, true), roughness: 0.9, metalness: 0,
        bumpMap: cizgiDoku(512, '#888', 'rgba(255,255,255,0.5)', 6, true, false), bumpScale: 0.01 });
    } catch (e) { _hata = e; }
    return { _hata: _hata, kagitMat: (typeof kagitMat !== 'undefined' ? kagitMat : undefined), kartonMat: (typeof kartonMat !== 'undefined' ? kartonMat : undefined) };
  },
  "organik": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var organMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: gurultuDoku(512, '#b5504a', 1.2, 3), metalness: 0, roughness: 0.42,
        clearcoat: 0.7, clearcoatRoughness: 0.3, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffd6cc),   // ıslak canlı doku: yumuşak parlaklık + kenar parlaması
        bumpMap: gurultuDoku(256, '#888', 1, 2, false), bumpScale: 0.008, envMapIntensity: 0.8
      });
      var yaprakMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: damarDoku(512, '#3f8f3a', 'rgba(20,70,20,0.45)', 12), roughness: 0.6, metalness: 0,
        side: THREE.DoubleSide });                                                   // yaprak ince, iki yüzlü
      var meyveMat = new THREE.MeshPhysicalMaterial({ color: 0xd9342b, metalness: 0, roughness: 0.35, clearcoat: 0.9, clearcoatRoughness: 0.12,
        bumpMap: gurultuDoku(256, '#888', 0.8, 2, false), bumpScale: 0.004, envMapIntensity: 1 });   // elma/domates mumsu kabuk
    } catch (e) { _hata = e; }
    return { _hata: _hata, organMat: (typeof organMat !== 'undefined' ? organMat : undefined), yaprakMat: (typeof yaprakMat !== 'undefined' ? yaprakMat : undefined), meyveMat: (typeof meyveMat !== 'undefined' ? meyveMat : undefined) };
  },
  "model-nesnesi": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var modelMat = new THREE.MeshStandardMaterial({ color: 0xd94a3a, roughness: 0.45, metalness: 0, emissive: 0xd94a3a, emissiveIntensity: 0.25 });   // OPAK mat + aynı tonda hafif emissive: koyu fonda da okunur; renk PALETTEN (artı yük sıcak, eksi yük soğuk); KIRILMA/transmission YOK — bu nesne cam değil, model
      var yukMesh = new THREE.Mesh(new THREE.SphereGeometry(0.4, 48, 32), modelMat);   // yük/parçacık: küre; boyut göreli (nokta yük küçük, kaynak yük büyük)
      var tozMat = new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.9, metalness: 0.2 });   // demir tozu: InstancedMesh(new THREE.IcosahedronGeometry(0.02, 0), tozMat, N) — küçük mat gri parçacıklar
      var atomMat = new THREE.MeshPhysicalMaterial({ color: 0x3b82f6, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1 });   // KÜRE MODELLER (atom/molekül topu, bilye, top): PORSELEN SIR — mat plastik değil
    } catch (e) { _hata = e; }
    return { _hata: _hata, modelMat: (typeof modelMat !== 'undefined' ? modelMat : undefined), yukMesh: (typeof yukMesh !== 'undefined' ? yukMesh : undefined), tozMat: (typeof tozMat !== 'undefined' ? tozMat : undefined), atomMat: (typeof atomMat !== 'undefined' ? atomMat : undefined) };
  },
  "hayalet-hacim": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var hayaletMat = new THREE.MeshStandardMaterial({ color: 0x5aa9e6, transparent: true, opacity: 0.16, depthWrite: false, roughness: 0.9, metalness: 0, side: THREE.DoubleSide });   // hayalet: transparent+opacity (hayalet/kesit istisnası) — transmission DEĞİL (kırıcı cam gibi görünür, ölçüldü); depthWrite:false saydamlar birbirini silmesin
      var kenarMat = new THREE.LineBasicMaterial({ color: 0x5aa9e6, transparent: true, opacity: 0.6 });
      var hacim = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 1.2), hayaletMat);
      var hacimKenar = new THREE.LineSegments(new THREE.EdgesGeometry(hacim.geometry), kenarMat); hacim.add(hacimKenar);   // kenar çizgisi: hacmin sınırı okunur
      hacim.renderOrder = 2;   // opak nesnelerden sonra çizilir; içindeki nesneler görünür kalır
    } catch (e) { _hata = e; }
    return { _hata: _hata, hayaletMat: (typeof hayaletMat !== 'undefined' ? hayaletMat : undefined), kenarMat: (typeof kenarMat !== 'undefined' ? kenarMat : undefined), hacim: (typeof hacim !== 'undefined' ? hacim : undefined), hacimKenar: (typeof hacimKenar !== 'undefined' ? hacimKenar : undefined) };
  },
  "isiyan": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null; var ekranDokusu = sec.ekranDokusu !== undefined ? sec.ekranDokusu : null;
    try {
      var ledMat = new THREE.MeshStandardMaterial({
        color: 0x220000, emissive: 0xff2000, emissiveIntensity: 5, roughness: 0.4, metalness: 0, toneMapped: false   // toneMapped:false: ACES çapraz kanal karışımı 0xff2000×5'i şeftaliye soluyordu (jüri) — kanal başına kırpılır, çekirdek doygun kalır; bloom HDR değeri yine görür; emissive KOYU-DOYGUN renk × yoğunluk 4-6: ACES yüksek değeri beyaza soldurur, doygun taban rengi korur
      });
      var ekranMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 1.2, emissiveMap: ekranDokusu, roughness: 0.25 });   // ekranDokusu CanvasTexture + colorSpace = THREE.SRGBColorSpace (yazı yok: ikon/çizgi/renk)
      var gunesMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff8a00, emissiveIntensity: 6, roughness: 1, toneMapped: false });
      // Işıma halesi (m16): var son = sonIslem(scene, camera, { bloom: 0.6, yaricap: 0.3, esik: 2.5 }) — eşik 2.5: yalnız ışıyanlar (lineer > 2.5) parlar, 0.85 eşiği tüm sahneyi sisler (ölçüldü); ışıyan nesne ışık da veriyorsa yanına PointLight(renk, şiddet, mesafe, 2) — şiddet CANDELA: alev/LED 3-8, lamba/ısıtıcı/ekran 20-60; 0.5-2 GÖRÜNMEZ (m16 IŞIK BİRİMİ)
    } catch (e) { _hata = e; }
    return { _hata: _hata, ledMat: (typeof ledMat !== 'undefined' ? ledMat : undefined), ekranMat: (typeof ekranMat !== 'undefined' ? ekranMat : undefined), gunesMat: (typeof gunesMat !== 'undefined' ? gunesMat : undefined) };
  },
  "ayna": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null; var aynaDonus = sec.aynaDonus !== undefined ? sec.aynaDonus : 0; var aynaH = sec.aynaH !== undefined ? sec.aynaH : 1.5; var aynaW = sec.aynaW !== undefined ? sec.aynaW : 1; var aynaX = sec.aynaX !== undefined ? sec.aynaX : 0; var aynaY = sec.aynaY !== undefined ? sec.aynaY : 1; var aynaZ = sec.aynaZ !== undefined ? sec.aynaZ : 0;
    try {
      // DÜZ AYNA: THREE.Reflector (kütüphane; adı geçince montaj gömer, <script src> YAZMA) — sahneyi aynalanmış kamerayla dokuya çizer
      var ayna = new THREE.Reflector(new THREE.PlaneGeometry(aynaW, aynaH), {
        clipBias: 0.003, textureWidth: 1024, textureHeight: 1024,
        color: 0x8a8a8a                                        // 0x7f7f7f nötr; daha koyu = koyu tonlu ayna, 0xb0b0b0 = parlak
      });
      ayna.position.set(aynaX, aynaY, aynaZ); ayna.rotation.y = aynaDonus;   // PlaneGeometry'nin +Z normali bakılan taraftır (zemin aynası: rotation.x = -Math.PI/2)
      scene.add(ayna);
      var cerceve = new THREE.Mesh(new THREE.BoxGeometry(aynaW + 0.12, aynaH + 0.12, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.6, metalness: 0.1 }));   // çerçeve aynanın 0.03 ARKASINDA
      cerceve.position.copy(ayna.position); cerceve.rotation.copy(ayna.rotation); cerceve.translateZ(-0.03); scene.add(cerceve);
      // ÇUKUR / TÜMSEK / DÜZ AYNA: kureselAyna(tip, çap, eğrilik yarıçapı, malzeme?, kupHedef?) — yansıtıcı yüz +Z, kenar z=0; yön mesh.lookAt ile
      var cukurAyna = kureselAyna('cukur', 0.6, 0.9);  cukurAyna.position.set(-1.3, 1.0, 0); cukurAyna.lookAt(camera.position); scene.add(cukurAyna);   // iç bükey: İÇ yüz izleyiciye (BackSide, kurucu ayarlar)
      var tumsekAyna = kureselAyna('tumsek', 0.5, 0.7); tumsekAyna.position.set(1.3, 1.0, 0); tumsekAyna.lookAt(camera.position); scene.add(tumsekAyna);   // dış bükey: DIŞ yüz izleyiciye; eğrilik yarıçapı büyüdükçe düze yaklaşır
      // Gerçek yansıma (nesne aynada görünsün): her eğri aynaya KENDİ kupHedef'i — kureselAyna('cukur', 0.6, 0.9, null, new THREE.WebGLCubeRenderTarget(256)) ve döngüde ayna.userData.yansimaGuncelle(renderer, scene); düz ayna Reflector'dur (otomatik). Yalnız ortam parlaklığı yetiyorsa kupHedef verme. Elle SphereGeometry kapağı kurma: yüz/işaret hatası (ölçüldü).
      // EĞRİ krom yüzey (küre, kaşık): Reflector düzlem ister → CubeCamera:
      var kupHedef = new THREE.WebGLCubeRenderTarget(256, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
      var kupKamera = new THREE.CubeCamera(0.1, 100, kupHedef);
      var kromMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02, envMap: kupHedef.texture, envMapIntensity: 1 });
      // döngüde: kromMesh.visible = false; kupKamera.position.copy(kromMesh.position); kupKamera.update(renderer, scene); kromMesh.visible = true;
    } catch (e) { _hata = e; }
    return { _hata: _hata, ayna: (typeof ayna !== 'undefined' ? ayna : undefined), cerceve: (typeof cerceve !== 'undefined' ? cerceve : undefined), cukurAyna: (typeof cukurAyna !== 'undefined' ? cukurAyna : undefined), tumsekAyna: (typeof tumsekAyna !== 'undefined' ? tumsekAyna : undefined), kupHedef: (typeof kupHedef !== 'undefined' ? kupHedef : undefined), kupKamera: (typeof kupKamera !== 'undefined' ? kupKamera : undefined), kromMat: (typeof kromMat !== 'undefined' ? kromMat : undefined) };
  },
  "pcb-elektronik": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var pcbDoku = devreDoku(512, '#1e6b3a', '#c9aa3c', 26, 5);   // zemin yeşil, bakır izler + pad'ler; 26 iz, 5 pad kümesi
      var pcbMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: pcbDoku, roughness: 0.65, metalness: 0,
        normalMap: normalDokusu(pcbDoku, 0.8), normalScale: new THREE.Vector2(0.4, 0.4), roughnessMap: devreDoku(512, '#c0c0c0', '#404040', 26, 5, false) });   // izler daha parlak (roughnessMap: iz koyu → düşük pürüz)
      var yongaMat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.45, metalness: 0.1 });
      var pinMat = new THREE.MeshStandardMaterial({ color: 0xffc44f, metalness: 1, roughness: 0.25, envMapIntensity: 1 });   // altın kenar pinleri
    } catch (e) { _hata = e; }
    return { _hata: _hata, pcbDoku: (typeof pcbDoku !== 'undefined' ? pcbDoku : undefined), pcbMat: (typeof pcbMat !== 'undefined' ? pcbMat : undefined), yongaMat: (typeof yongaMat !== 'undefined' ? yongaMat : undefined), pinMat: (typeof pinMat !== 'undefined' ? pinMat : undefined) };
  },
  "bulut": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var bulutMat = bulutMalzeme();                       // 'gunbatimi' → sıcak alt ışık; 'firtina' → gri fırtına bulutu (yıldırım)
      var bulut1 = bulutYap(3.2, 1.2, 1, bulutMat); bulut1.position.set(-4.5, 4.8, -7); scene.add(bulut1);   // genişlik, yükseklik, tohum (farklı biçim), malzeme
      var bulut2 = bulutYap(2.2, 0.9, 2, bulutMat); bulut2.position.set(4, 5.6, -9); bulut2.rotation.y = 0.6; scene.add(bulut2);
      // döngüde: bulut1.position.x += 0.002 (yavaş sürüklenme); kameraya 3 birimden yakın bulut koyma (dev küre kadrajı kapatır)
    } catch (e) { _hata = e; }
    return { _hata: _hata, bulutMat: (typeof bulutMat !== 'undefined' ? bulutMat : undefined), bulut1: (typeof bulut1 !== 'undefined' ? bulut1 : undefined), bulut2: (typeof bulut2 !== 'undefined' ? bulut2 : undefined) };
  },
  "atmosfer": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // İKİ YOL — sahneye göre YALNIZ BİRİ:
      // (A) UZAY / GECE GÖĞÜ (gezegen, yıldız, uzay, gece sahnesi): yardımcı kurar — fon ZİFİRİ SİYAH DEĞİLDİR (üst koyu lacivert → alt mor-menekşe degrade), 2600 yıldız üç katmanda (toz / orta / dört ışınlı parlak), boyu ve parlaklığı dağılımlı, kırpışan. Ton varsayılanları referans karedir — DEĞİŞTİRME; düz scene.background = new THREE.Color(...) ve tek boy Points YAZMA.
      var uzay = uzayFonu(scene, { yildiz: 2600, parlak: 48, yaricap: 70 });   // camera.far ≥ 110 olsun; kırpışma kendi döngüsüyle canlanır, sayfa kapanırken uzay.durdur()
      // (B) GÜNDÜZ GÖKYÜZÜ (dış mekân, gün ışığı) — (A) YERİNE, yalnız gündüz sahnesinde gunduzGogu() çağrılır:
      function gunduzGogu() {
      var gokCanvas = document.createElement('canvas'); gokCanvas.width = 8; gokCanvas.height = 512;
      var gg = gokCanvas.getContext('2d'), grd = gg.createLinearGradient(0, 0, 0, 512);
      grd.addColorStop(0, '#1f4e8c'); grd.addColorStop(0.6, '#7fb3e6'); grd.addColorStop(1, '#f2e2c4');   // gök degradesi
      gg.fillStyle = grd; gg.fillRect(0, 0, 8, 512);
      var gokDoku = new THREE.CanvasTexture(gokCanvas); gokDoku.colorSpace = THREE.SRGBColorSpace;
      var gokMat = new THREE.MeshBasicMaterial({ map: gokDoku, side: THREE.BackSide, fog: false });
      var gokKure = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 24), gokMat); scene.add(gokKure);   // gök küresi kamerayla döner (parallax); düz degrade yeterse scene.background = gokDoku da olur
      return gokKure;
      }
      // scene.fog = new THREE.Fog(0x7fb3e6, 18, 60);   // YALNIZ içerik sis/pus/hava olayı anlatıyorsa aç (derinlik hilesi olarak sis yok); iç mekânda asla
    } catch (e) { _hata = e; }
    return { _hata: _hata, uzay: (typeof uzay !== 'undefined' ? uzay : undefined), gunduzGogu: (typeof gunduzGogu !== 'undefined' ? gunduzGogu : undefined) };
  },
  "gezegen": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var uzay = uzayFonu(scene, { yaricap: 70 });   // YALNIZ gök/uzay sahnesinde (masadaki sınıf küresi modelinde BU SATIRI KOYMA): fon zifiri siyah değil — degrade + kırpışan yıldız alanı; Malzemeler'de atmosfer olmasa da
      var dunya = GEZEGEN3B.kure('dunya', { yaricap: 1.3 });   // hazır doku + bulut + atmosfer kenarı + eksen eğikliği; scene.add(dunya); Satürn'ün halkası da hazır
      var gunes = GEZEGEN3B.kure('gunes', { yaricap: 3 });   // ışıyan yüzey + GÜNEŞ IŞIĞI HAZIR (gunes.userData.isik: sönümsüz PointLight, castShadow — her gezegen aynı aydınlıkta, yön Güneş'ten): ayrıca PointLight/DirectionalLight EKLEME; dolgu yalnız AmbientLight ≤ 0.12 (gece tarafı koyu kalsın)
      var sinifKuresi = GEZEGEN3B.kure('dunya', { yaricap: 0.7, model: true });   // SINIF KÜRESİ: porselen sır + meridyen halkası + ayak (userData.tabanY)
      // döngüde GEZEGEN3B.dondur(dunya, dt) ya da dunya.userData.govde.rotation.y += 0.002; yörünge için pivot (saha dersi H)
    } catch (e) { _hata = e; }
    return { _hata: _hata, uzay: (typeof uzay !== 'undefined' ? uzay : undefined), dunya: (typeof dunya !== 'undefined' ? dunya : undefined), gunes: (typeof gunes !== 'undefined' ? gunes : undefined), sinifKuresi: (typeof sinifKuresi !== 'undefined' ? sinifKuresi : undefined) };
  },
  "asfalt": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var aN = 512;                                                   // 512 px ≈ 1 m yol karesi (sayfa repeat ile döşer; galeride 0.85 m levha, repeat 1)
      var aTane = gurultuAlani(aN, 128, 128, 211);                    // 4 px hücre ≈ 6-8 mm agrega: İNCE tane (2 oktav/56 hücreli fbm iri açık benek = teraço okunuyordu — galeride ölçüldü)
      var aMikro = gurultuAlani(aN, 256, 256, 213);                   // 2 px: tane içi kırık faset / bitüm zerresi (yakın planda pürüz)
      var aLeke = fbmAlani(aN, 3, 4, 217);                            // geniş, zayıf (±5 birim) tekerlek izi / aşınma lekesi; tekdüzeliği kırar, kamuflaj yapmaz
      var aTas = gurultuAlani(aN, 80, 80, 219);                       // seyrek açık taş eşiği: eşik 0.9 → ≈ %2 alan, 2-3 px benek
      var asfaltH = new Float32Array(aN * aN);
      for (var ai = 0; ai < aN * aN; ai++) asfaltH[ai] = aTane[ai] * 0.7 + aMikro[ai] * 0.3;   // yükseklik alanı: tane tepeleri (normal harita bundan)
      function asfaltRengi(i, taban, genlik) {                        // bitüm+agrega sRGB rengi: taban ±genlik/2 tane (std ≈ genlik/6), ±5 leke; en yüksek %2 hücre açık gri küçük taş
        var g = taban + (asfaltH[i] - 0.5) * genlik + (aLeke[i] - 0.5) * 10, c = [g - 1, g - 1, g + 2], t = aTas[i];
        return t > 0.9 ? karisim(c, [110, 107, 102], Math.min(1, (t - 0.9) * 12)) : c;
      }
      var asfaltDoku = alanDokusu(aN, asfaltH, function (v, x, y) { return asfaltRengi(y * aN + x, 44, 52); });   // #2c2c2f tabanı: benekler tabandan en çok +19 (p99), tek tük taş +60 (küçük)
      var asfaltNormal = normalHaritasi(aN, asfaltH, 1.4);            // ince tane kabartısı; şerit boyası da aynı kabartıyı taşır
      var asfaltMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, map: asfaltDoku, metalness: 0, roughness: 0.95,                       // tümüyle mat; ıslak/yağmurlu asfalt: roughness 0.55 (yağlı düşük parlaklık)
        normalMap: asfaltNormal, normalScale: new THREE.Vector2(0.5, 0.5),                      // sıyırıcı ışıkta pürüz okunur, dokuyu bozmaz
        envMapIntensity: 1
      });   // geometri: yol = PlaneGeometry (receiveShadow), rampa = kutu üst yüzü; küreye sarılmaz
      var eskiAsfaltMat = new THREE.MeshStandardMaterial({                                       // eskimiş/açık asfalt: bitüm aşınmış, agrega açığa çıkmış (kenar sokak, eski otopark)
        color: 0xffffff, map: alanDokusu(aN, asfaltH, function (v, x, y) { return asfaltRengi(y * aN + x, 80, 64); }),   // #505053 tabanı, daha kontrastlı tane (+24 p99)
        metalness: 0, roughness: 1, normalMap: normalHaritasi(aN, asfaltH, 1.6), normalScale: new THREE.Vector2(0.55, 0.55), envMapIntensity: 1   // taze asfalttan biraz daha pürüzlü; 1.8/0.7 sıva gibi kabarıyordu (galeride ölçüldü)
      });
      var seritLeke = fbmAlani(aN, 4, 5, 227), seritIz = gurultuAlani(aN, 6, 160, 229);       // aşınma: geniş dökülme lekesi + yol yönünde (u) ince tekerlek izi
      var seritDoku = alanDokusu(aN, seritLeke, function (v, x, y) {
        var i = y * aN + x, w = v * 0.7 + seritIz[i] * 0.3;
        var a = Math.max(0, Math.min(1, (w - 0.6) * 6)) * Math.max(0, Math.min(1, (asfaltH[i] - 0.45) * 4));   // aşınmış bölgede boya önce tane tepelerinden gider: benekli aşınma, çizgi değil
        return karisim([233, 230, 220], asfaltRengi(i, 44, 52), a);                              // beyaz şerit boyası (#e9e6dc); sarı şerit: [226, 180, 49]
      });
      var seritBoyaMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, map: seritDoku, metalness: 0, roughness: 0.85,                         // mat boya, tanelerin üstüne oturur: aynı kabartı, çok daha zayıf
        normalMap: asfaltNormal, normalScale: new THREE.Vector2(0.18, 0.18)                     // 0.35 küpte strafor gibi kabarıyordu (galeride ölçüldü); boya taneyi yumuşatır
      });   // şerit: ince PlaneGeometry(seritGenisligi, seritBoyu), y = asfalt + 0.002 (eş düzlem yasağı); kesik şerit için birden çok küçük Plane
    } catch (e) { _hata = e; }
    return { _hata: _hata, aN: (typeof aN !== 'undefined' ? aN : undefined), aTane: (typeof aTane !== 'undefined' ? aTane : undefined), aMikro: (typeof aMikro !== 'undefined' ? aMikro : undefined), aLeke: (typeof aLeke !== 'undefined' ? aLeke : undefined), aTas: (typeof aTas !== 'undefined' ? aTas : undefined), asfaltH: (typeof asfaltH !== 'undefined' ? asfaltH : undefined), ai: (typeof ai !== 'undefined' ? ai : undefined), asfaltRengi: (typeof asfaltRengi !== 'undefined' ? asfaltRengi : undefined), asfaltDoku: (typeof asfaltDoku !== 'undefined' ? asfaltDoku : undefined), asfaltNormal: (typeof asfaltNormal !== 'undefined' ? asfaltNormal : undefined), asfaltMat: (typeof asfaltMat !== 'undefined' ? asfaltMat : undefined), eskiAsfaltMat: (typeof eskiAsfaltMat !== 'undefined' ? eskiAsfaltMat : undefined), seritLeke: (typeof seritLeke !== 'undefined' ? seritLeke : undefined), seritIz: (typeof seritIz !== 'undefined' ? seritIz : undefined), seritDoku: (typeof seritDoku !== 'undefined' ? seritDoku : undefined), seritBoyaMat: (typeof seritBoyaMat !== 'undefined' ? seritBoyaMat : undefined) };
  },
  "sunger": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // SÜNGER: açık hücreli köpük — yüzey delik deşik gözenek + ince yumuşak hücre duvarı; tümüyle mat, yalnız kenarda kadifemsi sheen (cila/clearcoat YOK)
      var sungerAlan = fbmAlani(512, 2, 30, 41, true);   // türbülanslı fBm: düşük değerler g=0.5 eş-çizgisinde İNCE AĞ (hücre duvarı), yüksekler blob (gözenek); taban 30 hücre → 512 px'te ~30-40 gözenek (6 cm yüzeyde ~1,5-2 mm); taban 6 altı iri mermer lekesi yapar. 2 oktav: 3 oktavda hücre kenarları kıvrım kıvrım «solucan» ağına dönüyordu (galeride ölçüldü), 2 oktavda gözenek yuvarlak okunur
      function sungerDokusu(duvar, gozenek, dip, yukseklik) {   // eşikli renk fonksiyonu: v < 0.27 duvar, üstü gözenek; kenar ±0.04 yumuşak; gözenek içi v ile dibe doğru koyulaşır (gölgeli çukur). Aynı geçişten yükseklik dizisi (duvar 1, gözenek 0) → normalHaritasi
        return alanDokusu(512, sungerAlan, function (v, x, y) {
          var t = Math.min(1, Math.max(0, (v - 0.26) / 0.08));        // 0 duvar → 1 gözenek (dağılım: p35 ≈ 0.28, duvar payı ~%38, gözenek ~%62: açık hücre; %30 duvarda blok ochre/kirli sarı kalıyordu — galeride ölçüldü)
          var derin = Math.min(1, Math.max(0, (v - 0.34) / 0.28));     // gözenek dibi: eşiğin üstünde v büyüdükçe koyu
          yukseklik[y * 512 + x] = 1 - t * (0.75 + 0.25 * derin);      // duvar sırtı 1, gözenek 0.25 → 0 (dip)
          var duvarR = karisim(duvar, [Math.min(255, duvar[0] + 18), Math.min(255, duvar[1] + 18), Math.min(255, duvar[2] + 10)], 1 - Math.min(1, v / 0.26));   // duvar sırtı en açık ton
          return karisim(duvarR, karisim(gozenek, dip, derin), t);
        });
      }
      var sungerH = new Float32Array(512 * 512);
      var sungerDoku = sungerDokusu([236, 200, 44], [160, 122, 20], [96, 70, 8], sungerH);   // bulaşık süngeri: duvar #ecc82c (sırtta +18 daha açık), gözenek #a07a14, dip #604608 — gözenek #8f6d10 ile blok kirli hardal okunuyordu
      var sungerMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: sungerDoku, metalness: 0, roughness: 0.98,                     // cila yok; ıslak sünger: roughness 0.6 + color 0xd8c090 (koyulaşır, hafif parlar)
        normalMap: normalHaritasi(512, sungerH, 2.2), normalScale: new THREE.Vector2(0.9, 0.9),   // derin delik hissi: 0.4'te düz sarı plastik blok kalır
        sheen: 0.5, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xf5d874),              // kadifemsi kenar parlaması; sheenColor taban renginin 1-2 kademe açığı (beyaz verilirse gri tül)
        specularIntensity: 0.3, envMapIntensity: 1                                            // köpük ortamı ancak yansıtır
      });
      var akustikH = new Float32Array(512 * 512);
      var akustikDoku = sungerDokusu([58, 58, 60], [20, 20, 22], [8, 8, 10], akustikH);   // akustik poliüretan: koyu antrasit #3a3a3c duvar, #141416 gözenek — hoparlör önü / ses soğurma paneli
      var akustikMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: akustikDoku, metalness: 0, roughness: 0.98,
        normalMap: normalHaritasi(512, akustikH, 2.2), normalScale: new THREE.Vector2(0.8, 0.8),
        sheen: 0.3, sheenRoughness: 0.9, sheenColor: new THREE.Color(0x6a6a6c),              // koyu köpükte sheen daha zayıf: 0.5 gri tozlu görünür
        specularIntensity: 0.3, envMapIntensity: 1
      });
    } catch (e) { _hata = e; }
    return { _hata: _hata, sungerAlan: (typeof sungerAlan !== 'undefined' ? sungerAlan : undefined), sungerDokusu: (typeof sungerDokusu !== 'undefined' ? sungerDokusu : undefined), sungerH: (typeof sungerH !== 'undefined' ? sungerH : undefined), sungerDoku: (typeof sungerDoku !== 'undefined' ? sungerDoku : undefined), sungerMat: (typeof sungerMat !== 'undefined' ? sungerMat : undefined), akustikH: (typeof akustikH !== 'undefined' ? akustikH : undefined), akustikDoku: (typeof akustikDoku !== 'undefined' ? akustikDoku : undefined), akustikMat: (typeof akustikMat !== 'undefined' ? akustikMat : undefined) };
  },
  "strafor": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // STRAFOR (EPS): birbirine yapışmış 2-5 mm küresel boncuk hücreleri — tebeşir beyazı, tümüyle mat; boncuk sınırı ince gölgeli oluk, ortası hafif kabarık. Parlak plastik DEĞİL: clearcoat YOK, roughness 0.97, sheen çok az
      function straforDokusu(n, cx, cy, tohum, yuk, kure) {   // tohumlu jitter'lı ızgara Voronoi (Math.random YOK; u'da döşenebilir): cy satır, satırda cx hücre. kure=true: satırın hücre sayısı enlemle cx·sin(π·v) — SphereGeometry UV'sinde boncuklar ekvatorda yuvarlak kalır, kutupta sıkışıp «girdap» olmaz; kure=false: her satır cx hücre, v'de de döşenebilir (levha/kutu/tabak)
        var r = _lcg(tohum), say = [], bas = [], top = 0;
        for (var b = 0; b < cy; b++) { say[b] = kure ? Math.max(6, Math.round(cx * Math.sin(Math.PI * (b + 0.5) / cy))) : cx; bas[b] = top; top += say[b]; }
        var mx = new Float32Array(top), my = new Float32Array(top), ton = new Float32Array(top), agir = new Float32Array(top);
        for (var i = 0; i < top; i++) { mx[i] = 0.15 + 0.7 * r(); my[i] = 0.15 + 0.7 * r(); ton[i] = r(); agir[i] = r(); }   // hücre merkezi jitter'ı (0.15-0.85: boncuklar düzensiz ama birbirini yutmaz) + boncuk başına ton + boy ağırlığı
        var leke = fbmAlani(n, 3, 4, tohum + 5);   // iri yumuşak leke ±3: düz beyaz «boya» gibi ölü durmasın
        return alanDokusu(n, leke, function (v, x, y) {
          var u = (x + 0.5) / n, w = (y + 0.5) / n, iy = Math.floor(w * cy), ux = kure ? 2 * Math.max(0.1, Math.sin(Math.PI * w)) : 1, d1 = 9, d2 = 9, k1 = 0;   // ux: u yönünün yüzey ölçeği (kürede çevre 2πr, meridyen πr → ekvatorda 2, kutba doğru sin ile daralır)
          for (var j = -1; j <= 1; j++) {
            var gyR = iy + j, gy = ((gyR % cy) + cy) % cy; if (kure && gy !== gyR) continue;   // küre: kutup ötesine sarma yok
            var c = say[gy], ix = Math.floor(u * c);
            for (var q = -1; q <= 1; q++) {
              var gxR = ix + q, k = bas[gy] + ((gxR % c) + c) % c;
              var dx = ((gxR + mx[k]) / c - u) * ux, dy = (gyR + my[k]) / cy - w, d = Math.sqrt(dx * dx + dy * dy) * cy - agir[k] * 0.2;   // yüzey uzaklığı (hücre yüksekliği biriminde) − ağırlık: ağırlıklı Voronoi → boncuk boyu 2-5 mm gibi değişir, sınırlar hafif eğri (düz çizgili eşit hücreler golf topu gibi okunuyordu — galeride ölçüldü)
              if (d < d1) { d2 = d1; d1 = d; k1 = k; } else if (d < d2) d2 = d;
            }
          }
          var m = Math.max(0, d1), e = (d2 - d1) * 0.5, rr = m / (m + e + 1e-6);   // e: en yakın sınıra uzaklık; rr: boncuk merkezinden sınıra 0→1 normalize yarıçap (hücre biçimini izler)
          yuk[y * n + x] = 1 - rr * rr;                                                 // PARABOLOİT kubbe: eğrilik gövdede eşit → «yapışık minik toplar»; düz tepe + V oluk çokgen kabuk/golf topu, küre kapağı (1-r²)^0.6 ise kenarı kabarık düz mozaik gibi okunuyordu (galeride ölçüldü)
          var t = 238 - 22 * Math.pow(rr, 6) + (ton[k1] - 0.5) * 10 + (v - 0.5) * 20;   // boncuk gövdesi #f2f2ec, yalnız sınır çizgisi #d8d8d2'ye iner (rr⁶: ince gölgeli çizgi; geniş koyu oluk çatlak ağı yapıyordu); boncuk başına ±5, leke ±3
          return [t + 4, t + 4, t - 2];   // hafif sıcak-krem beyaz (soğuk mavi-beyaz kâğıt gibi olmasın)
        });
      }
      var straforH = new Float32Array(1024 * 1024);
      var straforDoku = straforDokusu(1024, 48, 24, 23, straforH, true);   // KÜRE dokusu: ekvatorda 48 boncuk (0.5 birim yarıçaplı topta ~24'ü görünür), 24 enlem satırı; 1024 px: hücre u'da 21 px, v'de 43 px (küre UV'si u'yu 2× gerdiği için yüzeyde kare) — 512'de oluk 2 px'e düşüp cızırdıyor
      var straforMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: straforDoku, metalness: 0, roughness: 0.97,                        // tebeşirimsi mat: köpük ışığı dağıtır; roughness 0.6 altı ping-pong topu gibi parlıyor
        normalMap: normalHaritasi(1024, straforH, 1.5), normalScale: new THREE.Vector2(0.7, 0.7),   // boncuk kabartısı: orta yarıçapta ~22° eğim (guc×scale ≈ 1.05); 0.9×0.5'te yalnız kenar çizgisi kalıp gövde düz, 1.6×0.8'de gölgeler koyulaşıp golf topu çukuru gibi okunuyordu (galeride ölçüldü)
        sheen: 0.15, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xffffff),                  // kenar yumuşaklığı: köpük kenarda hafifçe aydınlanır; 0.4+ pamuk/kadife olur
        specularIntensity: 0.25, envMapIntensity: 1                                              // ortam yansıması neredeyse yok (köpük ortamı yansıtmaz)
      });   // küre: new THREE.SphereGeometry(r, 64, 48) — doku küre UV'sine göre kurulu, repeat vermeden kullan; kutup kameraya bakabilir
      var straforLevhaH = new Float32Array(512 * 512);
      var straforLevhaDoku = straforDokusu(512, 40, 40, 29, straforLevhaH, false);   // LEVHA/KUTU/TABAK dokusu: izotropik 40×40 hücre (512 px ≈ 12 cm → boncuk ~3 mm), v'de de döşenebilir; küre dokusu düz yüzeyde 2:1 basık boncuk verir, bu yüzden ayrı
      var straforLevhaMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: straforLevhaDoku, metalness: 0, roughness: 0.97,
        normalMap: normalHaritasi(512, straforLevhaH, 1.5), normalScale: new THREE.Vector2(0.6, 0.6),
        sheen: 0.15, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xffffff), specularIntensity: 0.25, envMapIntensity: 1
      });   // maket taban levhası, yalıtım kutusu duvarı, köpük ambalaj/tabak: BoxGeometry + kutuDoku ile döşe (kesik kenar pütürü geometriyle değil, bu dokuyla yeter)
      straforLevhaMat.userData.dogalKaro = 0.3;   // karo TAVANI: büyük taban levhasında boncuk dev olmasın (0.3 ≈ 10 cm / 40 hücre → boncuk ≈ 2,5 mm; ahşap 0.6 ≈ 20 cm ölçeğiyle)
      // XPS (ekstrüde polistiren) yalıtım levhası: boncuksuz, kapalı ince hücreli düz pastel levha — mat, ancak sezilen tanecik
      var xpsDoku = gurultuDoku(512, '#f0f0f0', 0.45, 1);   // nötr çok ince tane (düşük kontrast; 0.3'te tane hiç okunmuyor, küp mat plastik gibi kalıyordu — galeride ölçüldü), renk color alanından: XPS levha rengi PALETTEN — mavi 0x8fc4e8 / pembe 0xf2b8c6 / yeşil 0xbfe3c0
      var xpsMat = new THREE.MeshPhysicalMaterial({
        color: 0x8fc4e8, map: xpsDoku, metalness: 0, roughness: 0.92,                            // mat; 0.7 altı plastik levha gibi parlar
        normalMap: normalDokusu(xpsDoku, 1.0), normalScale: new THREE.Vector2(0.3, 0.3),          // düz levha: tane kabartısı ancak sezilir (EPS boncuğundan ayrım burada)
        sheen: 0.12, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xffffff), specularIntensity: 0.3, envMapIntensity: 1
      });   // levha: BoxGeometry(g, 0.03-0.05, d) + kutuDoku; kenarlarda ince kesik pah istenirse RoundedBoxGeometry(…, 2, 0.004)
    } catch (e) { _hata = e; }
    return { _hata: _hata, straforDokusu: (typeof straforDokusu !== 'undefined' ? straforDokusu : undefined), straforH: (typeof straforH !== 'undefined' ? straforH : undefined), straforDoku: (typeof straforDoku !== 'undefined' ? straforDoku : undefined), straforMat: (typeof straforMat !== 'undefined' ? straforMat : undefined), straforLevhaH: (typeof straforLevhaH !== 'undefined' ? straforLevhaH : undefined), straforLevhaDoku: (typeof straforLevhaDoku !== 'undefined' ? straforLevhaDoku : undefined), straforLevhaMat: (typeof straforLevhaMat !== 'undefined' ? straforLevhaMat : undefined), xpsDoku: (typeof xpsDoku !== 'undefined' ? xpsDoku : undefined), xpsMat: (typeof xpsMat !== 'undefined' ? xpsMat : undefined) };
  },
  "hamur-kil": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // OYUN HAMURU — doygun ama tozlu pastel renk; yüzey «düz plastik» değil: parmak izi çizgileri (dalgalı, yönlü) + bastırılmış geniş çukurlar TEK yükseklik alanında birleşir → normalMap (bumpMap normalMap varken r155'te hesaba girmez, ikisini birden vermek boşa)
      var hamurRenk = '#d8433a';   // renkler: kırmızı #d8433a, mavi #3f6fc4, sarı #e8c33c, yeşil #4fa04a — her renk için hamurMalzeme(renk) ile ayrı malzeme
      var hamurN = 512, hamurCukur = fbmAlani(hamurN, 3, 3, 41), hamurTane = fbmAlani(hamurN, 2, 24, 43),   // çukur: 3 hücre/karo geniş bastırma izi; tane: ince tozlu pütür
          hamurCizgi = gurultuAlani(hamurN, Math.round(hamurN / 9), 12, 47),                                   // 9 px aralıklı YÖNLÜ çizgi (512 px ≈ 4 cm → ~0,7 mm sırt aralığı); oy 12: sırtlar KISA parçalı (oy 3 sürekli meridyen yapıp kürede kutba toplanıyordu — galeride ölçüldü, plaj topu)
          hamurKivrim = fbmAlani(hamurN, 2, 2, 53), hamurYuk = new Float32Array(hamurN * hamurN);
      for (var hi = 0; hi < hamurN * hamurN; hi++) {
        var hx = hi % hamurN, hy = (hi / hamurN) | 0, kay = Math.round((hamurKivrim[hi] - 0.5) * 220);   // çizgiyi alçak frekanslı alanla KAYDIR: düz çizgi yerine parmak izi kıvrımı
        var sirt = hamurCizgi[hy * hamurN + ((hx + kay) % hamurN + hamurN) % hamurN];
        var cukur = Math.min(1, Math.max(0, (hamurCukur[hi] - 0.5) * 1.6 + 0.5));   // çukurlar düz bölgelerle ayrılsın (kontrastı aç)
        hamurYuk[hi] = 0.5 + (cukur - 0.5) * 0.7 + (sirt - 0.5) * 0.18 + (hamurTane[hi] - 0.5) * 0.10;   // çukur baskın, sırt ince ikincil
      }
      var hamurNormal = normalHaritasi(hamurN, hamurYuk, 1.6);   // tek normal: çukur + sırt + tane
      function hamurMalzeme(renk) {   // renk '#rrggbb'; döner: MeshPhysicalMaterial
        var t = _rgb(renk), acik = karisim(t, [255, 255, 255], 0.10), koyu = karisim(t, [40, 20, 20], 0.22), sc = karisim(t, [255, 255, 255], 0.3);   // açık uç yalnız %10 beyaz: 0.28 kırmızıyı soluk pembeye çeviriyordu (galeride ölçüldü)
        var doku = alanDokusu(hamurN, hamurYuk, function (v, x, y) { var k = (v - 0.5) * 0.5 + 0.5; return karisim(karisim(koyu, acik, k), [235, 225, 215], Math.max(0, (hamurTane[y * hamurN + x] - 0.5) * 0.08)); });   // çukur dibi koyu, sırt açık; ancak fark edilir tozlu tane (ortalama beyaz payı yok — doygunluk korunur)
        return new THREE.MeshPhysicalMaterial({
          color: 0xffffff, map: doku, metalness: 0, roughness: 0.72,                                 // mat, sert speküler yok
          normalMap: hamurNormal, normalScale: new THREE.Vector2(0.55, 0.55),                        // parmak izi + çukur okunur; 0.8 üstü «buruşuk folyo» yapar
          sheen: 0.3, sheenRoughness: 0.7, sheenColor: new THREE.Color().setRGB(sc[0] / 255, sc[1] / 255, sc[2] / 255, THREE.SRGBColorSpace),   // kenarda yumuşak aydınlık = hafif alt-yüzey saçılması taklidi; sheenColor tabanın bir kademe açığı
          clearcoat: 0.08, clearcoatRoughness: 0.6, specularIntensity: 0.6, envMapIntensity: 1        // yağlı geniş parlama (ince, geniş, yumuşak)
        });
      }
      var hamurMat = hamurMalzeme(hamurRenk);   // ikinci renk: var maviHamurMat = hamurMalzeme('#3f6fc4');
      function hamurKuresi(r, tohum, seg) {   // yumuşak, tam küre olmayan hamur topu: köşeler deterministik ±%6 (Math.random YOK — konum tabanlı sin karışımı), sonra normal yeniden
        var g = new THREE.SphereGeometry(r, seg || 64, (seg || 64) >> 1), p = g.attributes.position, s = (tohum || 1) * 1.7;
        for (var i = 0; i < p.count; i++) {
          var x = p.getX(i) / r, y = p.getY(i) / r, z = p.getZ(i) / r;
          var d = 1 + 0.06 * (Math.sin(3.1 * x + s) * Math.sin(2.7 * y + 1.3 + s) + 0.6 * Math.cos(2.3 * z + 0.7 * s) * Math.sin(1.9 * x - 2.1 * y)) / 1.6;
          p.setXYZ(i, x * r * d, y * r * d, z * r * d);
        }
        g.computeVertexNormals(); return g;   // kullanım: new THREE.Mesh(hamurKuresi(0.5, 3), hamurMat); şerit/silindir için CylinderGeometry köşelerine aynı d çarpanı
      }
      // HAM KİL — nemli gri-kahve TEK ton, damar/çizgi YOK (yatay spatula çizgisi ahşap plaka gibi okundu — galeride ölçüldü): alçak frekanslı parmak/alet çukuru + çok ince tane + yer yer koyu nem lekesi
      var kilKuru = false;   // true: kurumuş kil (açık, tozlu, tamamen mat, lekesiz)
      var kilN = 512, kilOyuk = fbmAlani(kilN, 3, 3, 61), kilTane = fbmAlani(kilN, 3, 24, 63), kilNem = fbmAlani(kilN, 2, 2, 67), kilYuk = new Float32Array(kilN * kilN);   // oyuk 3 hücre/karo geniş bastırma; tane 24 hücre pütür; nem 2 hücre leke
      for (var ki = 0; ki < kilN * kilN; ki++) {
        var oyuk = Math.min(1, Math.max(0, (kilOyuk[ki] - 0.5) * 1.6 + 0.5));   // çukurlar düz bölgelerle ayrılsın
        kilYuk[ki] = 0.5 + (oyuk - 0.5) * 0.7 + (kilTane[ki] - 0.5) * 0.06;   // çukur baskın; tane 0.2 üstü kum gibi okunur
      }
      var kilTon = _rgb(kilKuru ? '#a68c70' : '#7a614c'), kilKoyu = karisim(kilTon, [28, 20, 14], 0.32);   // gri-kahve; sıcak kahve (#6b5443) sütlü çikolata/ahşaba kayıyordu (galeride ölçüldü)
      var kilDoku = alanDokusu(kilN, kilYuk, function (v, x, y) {
        var nem = kilKuru ? 0 : Math.max(0, (kilNem[y * kilN + x] - 0.5) * 2.2), t = (kilTane[y * kilN + x] - 0.5) * 8;   // nem: alanın koyu yarısı, yumuşak kenar; tane ±4 birim
        var c = karisim(kilTon, kilKoyu, Math.min(1, nem + (0.5 - v) * 0.3)); return [c[0] + t, c[1] + t, c[2] + t];   // çukur dibi bir tık koyu
      });
      var kilMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: kilDoku, metalness: 0,
        roughness: kilKuru ? 0.95 : 0.85,   // mat; ıslaklık clearcoat'tan (roughness 0.55 cilalı ahşap gibi okunuyordu)
        normalMap: normalHaritasi(kilN, kilYuk, 2), normalScale: new THREE.Vector2(0.6, 0.6),   // çukurlar yan yüzde de okunsun; 0.8 üstü buruşuk
        clearcoat: kilKuru ? 0 : 0.1, clearcoatRoughness: 0.5, specularIntensity: 0.6, envMapIntensity: 1   // ıslak film: ince, bulanık
      });
    } catch (e) { _hata = e; }
    return { _hata: _hata, hamurRenk: (typeof hamurRenk !== 'undefined' ? hamurRenk : undefined), hamurN: (typeof hamurN !== 'undefined' ? hamurN : undefined), hamurCukur: (typeof hamurCukur !== 'undefined' ? hamurCukur : undefined), hamurTane: (typeof hamurTane !== 'undefined' ? hamurTane : undefined), hamurYuk: (typeof hamurYuk !== 'undefined' ? hamurYuk : undefined), hi: (typeof hi !== 'undefined' ? hi : undefined), hamurNormal: (typeof hamurNormal !== 'undefined' ? hamurNormal : undefined), hamurMalzeme: (typeof hamurMalzeme !== 'undefined' ? hamurMalzeme : undefined), hamurMat: (typeof hamurMat !== 'undefined' ? hamurMat : undefined), hamurKuresi: (typeof hamurKuresi !== 'undefined' ? hamurKuresi : undefined), kilKuru: (typeof kilKuru !== 'undefined' ? kilKuru : undefined), kilN: (typeof kilN !== 'undefined' ? kilN : undefined), kilOyuk: (typeof kilOyuk !== 'undefined' ? kilOyuk : undefined), kilTane: (typeof kilTane !== 'undefined' ? kilTane : undefined), kilNem: (typeof kilNem !== 'undefined' ? kilNem : undefined), kilYuk: (typeof kilYuk !== 'undefined' ? kilYuk : undefined), ki: (typeof ki !== 'undefined' ? ki : undefined), kilTon: (typeof kilTon !== 'undefined' ? kilTon : undefined), kilKoyu: (typeof kilKoyu !== 'undefined' ? kilKoyu : undefined), kilDoku: (typeof kilDoku !== 'undefined' ? kilDoku : undefined), kilMat: (typeof kilMat !== 'undefined' ? kilMat : undefined) };
  },
  "toz-granul": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // TOZ-GRANÜL: opak tanecik/toz yığınları — tuz/şeker (iri parıltılı kristal tane), un/nişasta/karbonat (tanesiz pudra), kükürt (sarı ince toz)
      var tN = 512, tC = 80;                                            // 512 px ≈ 4 cm yığın yüzeyi (sayfa repeat ile döşer; galeride repeat 1); tC = karo başına tane: ~6.4 px ≈ 0.5 mm iri sofra tuzu / toz şeker
      function tKarma(a, b, s) { var t = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return t - Math.floor(t); }   // tohumlu deterministik hücre karması (Math.random YASAK; aynı sahne her açılışta aynı)
      var tHucre = new Float32Array(tC * tC * 3);                        // hücre önbelleği [merkez x, merkez y, kimlik]: piksel başına 27 sin yerine dizi okuması (sayfa açılışını dondurmaz)
      for (var hy = 0; hy < tC; hy++) for (var hx = 0; hx < tC; hx++) { var hb = (hy * tC + hx) * 3; tHucre[hb] = hx + 0.5 + (tKarma(hx, hy, 1) - 0.5) * 0.8; tHucre[hb + 1] = hy + 0.5 + (tKarma(hx, hy, 2) - 0.5) * 0.8; tHucre[hb + 2] = tKarma(hx, hy, 3); }   // merkez kaydırılmış: düzenli ızgara yerine dökülmüş tane dizilimi
      var tuzH = new Float32Array(tN * tN), tuzId = new Float32Array(tN * tN);   // yükseklik alanı + tane kimliği (0..1): tane başına parlaklık/pürüz bundan
      for (var ty = 0; ty < tN; ty++) for (var tx = 0; tx < tN; tx++) {   // AYRIK TANE ızgarası (Voronoi-benzeri, 3×3 komşu): eşiklenmiş değer gürültüsü taneleri yatay solucan sırtlarına birleştiriyor, mercan/sıva gibi okunuyordu (galeride ölçüldü)
        var fx = tx / tN * tC, fy = ty / tN * tC, cx = Math.floor(fx), cy = Math.floor(fy), enD = 9, enId = 0, ex = 0, ey = 0;
        for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
          var gx = (cx + ox + tC) % tC, gy = (cy + oy + tC) % tC, b = (gy * tC + gx) * 3;   // komşu hücre karo sınırında sarar → dikişsiz döşeme
          var dx = fx - (tHucre[b] - gx + cx + ox), dy = fy - (tHucre[b + 1] - gy + cy + oy);
          var d = Math.max(Math.abs(dx), Math.abs(dy)) * 0.6 + Math.sqrt(dx * dx + dy * dy) * 0.4;   // köşeli-yuvarlak tane (küp kristal: Chebyshev + Öklid karışımı)
          if (d < enD) { enD = d; enId = tHucre[b + 2]; ex = dx; ey = dy; }
        }
        var ti = ty * tN + tx, yariCap = 0.5 + (tKarma(enId * 97, 1, 4) - 0.5) * 0.14;   // tane boyu ±%14 değişir
        var ic = Math.max(0, Math.min(1, (yariCap - enD) / 0.1));         // tane içi 1 → kenar duvarı 0 (dar keskin kenar); taneler arası boşluk 0
        var egim = tKarma(enId * 53, 2, 5) * 6.283;                        // her tanenin faseti kendi yönüne eğik → tane tane ışığı yakalar (kristal pırıltısı)
        tuzH[ti] = ic * (0.8 + (ex * Math.cos(egim) + ey * Math.sin(egim)) * 0.3);   // eğik DÜZ plato (tane içinde normal sabit = düz kristal yüzü), kenarda dik duvar
        tuzId[ti] = enId;
      }
      var tuzDoku = alanDokusu(tN, tuzH, function (v, x, y) {
        var id = tuzId[y * tN + x], parlak = 0.84 + tKarma(id * 71, 3, 6) * 0.16;   // tane başına parlaklık farkı: kimi tane saydam-beyaz, kimi mat-kirli beyaz
        return karisim([200, 203, 207], [252 * parlak, 252 * parlak, 249 * parlak], Math.min(1, v / 0.55));   // boşluk açık soğuk gri (184 gri yığını undan koyu gösteriyordu — galeride ölçüldü), tane beyaz
      });
      var tuzPuruz = alanDokusu(tN, tuzH, function (v, x, y) {
        var g = tKarma(tuzId[y * tN + x] * 31, 4, 7), k = v < 0.3 ? 0.92 : (g < 0.3 ? 0.2 + g * 0.5 : 0.6 + g * 0.35);   // boşluk mat; tanelerin ~%30'u camsı (0.2-0.35 → tek tek pırıltı), kalanı yarı mat (0.7-0.95); yaygın düşük pürüz gri plastik parlaması yapar
        return [k * 255, k * 255, k * 255];
      }, false);                                                        // veri dokusu (lineer)
      var tuzMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: tuzDoku, metalness: 0,
        roughness: 1, roughnessMap: tuzPuruz,                            // taban pürüzü haritadan (0.2-0.95): parlak-mat karışık tane
        normalMap: normalHaritasi(tN, tuzH, 1.8), normalScale: new THREE.Vector2(0.7, 0.7),   // tane kabartısı: kenar duvarları + eğik fasetler okunur; 2.8/0.9 kürede kaba kaya kabuğu yapıyordu (galeride ölçüldü)
        clearcoat: 0.2, clearcoatRoughness: 0.3,                         // tane yüzlerinde küçük keskin yansımalar (kristal cam yüzü)
        sheen: 0.35, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xffffff),   // eğik ışıkta «kum pırıltısı» (düşük sheenRoughness = pırıltı)
        specularIntensity: 0.8, envMapIntensity: 1
      });   // toz şeker: aynı malzeme (daha parlak istenirse clearcoat 0.3); kesme şeker küpü: RoundedBoxGeometry + tuzMat
      var unDoku = gurultuDoku(512, '#f4efe4', 0.25, 1);                // krem-beyaz pudra; sapma 0.25: tanesiz, yalnız çok hafif ton lekesi (0.5 üstü kireç sıvası gibi lekelenir)
      var unMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: unDoku, metalness: 0, roughness: 1,        // tamamen mat: pudra ışığı yansıtmaz
        normalMap: normalDokusu(unDoku, 0.7), normalScale: new THREE.Vector2(0.22, 0.22),   // neredeyse pürüzsüz; yalnız sıyırıcı ışıkta toz yumuşaklığı
        sheen: 0.1, sheenRoughness: 1, sheenColor: new THREE.Color(0xffffff),   // toz yumuşaklığı: kenarda çok zayıf beyaz hale
        specularIntensity: 0.3, envMapIntensity: 1                       // speküler yok gibi
      });   // nişasta / karbonat aynı malzeme
      var kukurtDoku = gurultuDoku(512, '#eed83a', 0.55, 1);            // limon sarısı (#e8d43a hedefi ton eşlemede zeytinimsi soluyordu, taban bir kademe açık — galeride ölçüldü); ince tane, orta kontrast: tanecik okunur, leke yapmaz
      var kukurtMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: kukurtDoku, metalness: 0, roughness: 0.88, // ince mat toz (un'dan pütürlü, tuzdan ince)
        normalMap: normalDokusu(kukurtDoku, 1.4), normalScale: new THREE.Vector2(0.5, 0.5),   // hafif tane kabartısı (0.35 kürede düz plastik top kalıyordu — galeride ölçüldü)
        sheen: 0.2, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xf7ee80),   // tozlu sarı kenar
        specularIntensity: 0.5, envMapIntensity: 1
      });   // kükürt kütlesi (kırıklı): roughness 0.5 + IcosahedronGeometry köşeleri tohumlu ±%12 oynatılmış, flatShading
    } catch (e) { _hata = e; }
    return { _hata: _hata, tN: (typeof tN !== 'undefined' ? tN : undefined), tC: (typeof tC !== 'undefined' ? tC : undefined), t: (typeof t !== 'undefined' ? t : undefined), tKarma: (typeof tKarma !== 'undefined' ? tKarma : undefined), tHucre: (typeof tHucre !== 'undefined' ? tHucre : undefined), hy: (typeof hy !== 'undefined' ? hy : undefined), hx: (typeof hx !== 'undefined' ? hx : undefined), hb: (typeof hb !== 'undefined' ? hb : undefined), tuzH: (typeof tuzH !== 'undefined' ? tuzH : undefined), tuzId: (typeof tuzId !== 'undefined' ? tuzId : undefined), ty: (typeof ty !== 'undefined' ? ty : undefined), tx: (typeof tx !== 'undefined' ? tx : undefined), tuzDoku: (typeof tuzDoku !== 'undefined' ? tuzDoku : undefined), tuzPuruz: (typeof tuzPuruz !== 'undefined' ? tuzPuruz : undefined), tuzMat: (typeof tuzMat !== 'undefined' ? tuzMat : undefined), unDoku: (typeof unDoku !== 'undefined' ? unDoku : undefined), unMat: (typeof unMat !== 'undefined' ? unMat : undefined), kukurtDoku: (typeof kukurtDoku !== 'undefined' ? kukurtDoku : undefined), kukurtMat: (typeof kukurtMat !== 'undefined' ? kukurtMat : undefined) };
  },
  "yari-saydam": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // YARI SAYDAM ÜÇLÜSÜ: ışık geçer, görüntü bulanır. Hepsi KIRICI (transmission) — bulanıklık roughness'tan gelir: motor kırılma tamponunun mip seviyesini roughness × ior ile seçer (ior 1.5 → tam, 1.4 → %80); thickness yalnız kırılma kaymasını ve Beer soğurmasını verir, ince levhada ikisi de küçük kalır
      var buzluCamMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.4,                // kumlanmış yüz: 0.4 → arkadaki dama yumuşak leke olarak seçilir; 0.45'te referans tek gri blob oldu (galeride ölçüldü), 0.6 opak süt, 0.25 berrak cama yaklaşır
        transmission: 1, ior: 1.5, thickness: 0.06,                  // İNCE LEVHA 0.05-0.1 (BoxGeometry(w, h, 0.06)): kalınlık büyürse kırılma kayması + soğurma artar, mercek gibi büker
        attenuationColor: new THREE.Color(0xdfe8ea), attenuationDistance: 0.6,   // çok hafif yeşilimsi cam gövdesi; 0.06 kalınlıkta geçirgenlik ~%97 (yalnız kalın kesitte okunur)
        specularIntensity: 0.7, envMapIntensity: 1, clearcoat: 0      // kumlu yüzde cila yok; bir yüzü parlak buzlu cam istenirse clearcoat 0.6 clearcoatRoughness 0.05
      });   // opacity 1 kalır, transparent YAZMA (kırılan görüntü solar). Opal LED/tasarruflu ampul kubbesi: buzluCamMat.clone() + color 0xf4f1ea + thickness 0.01, yanıkken emissive 0xfff1d6 emissiveIntensity 1.2
      buzluCamMat.userData.buzlu = true;   // camDuzelt (sayfa açılışı cam onarımı) buzlu/yarı saydam malzemeye dokunmaz
      var kagitLifDoku = cizgiDoku(512, '#f3ead2', 'rgba(150,120,70,0.16)', 3, true);   // ince yatay lif, sarımsı-krem taban (512 px ≈ 10 cm → lif ~0.6 mm); RENK dokusu (sRGB)
      var yagliKagitMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: kagitLifDoku, metalness: 0, roughness: 0.42,  // lifli mat yüz: 0.42 → arka yalnız renk lekesi (kırmızı çubuk pembe hare, derz açık bant) olarak geçer; 0.7'de küp opak karton gibi okundu, geçirgenlik hiç görünmedi (galeride ölçüldü)
        transmission: 0.85, ior: 1.4, thickness: 0.02,               // %15 opak kâğıt tabanı + %85 bulanık geçirgenlik (lif dokusu geçen ışığı da çarpar, kâğıt kimliği kalır); 0.8'de tan küp opak okundu (galeride ölçüldü); ior 1.4 → mip ölçeği %80
        attenuationColor: new THREE.Color(0xe8c98a), attenuationDistance: 0.15,   // geçen ışık sıcak sarımsıya döner (arkadan aydınlatılınca turuncumsu parlar)
        normalMap: normalDokusu(kagitLifDoku, 0.8), normalScale: new THREE.Vector2(0.25, 0.25),   // lif kabartısı hafif (kâğıt düzdür)
        sheen: 0.12, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xfff2d0),   // lif tüyü çok hafif: sheen 0.3 tüm yüzeye sıcak perde çekip geçen ışığı örtüyordu (galeride ölçüldü)
        specularIntensity: 0.35, envMapIntensity: 1, side: THREE.DoubleSide   // mat kâğıt: ortam yansıması düşük; tek yüzlü ince levha (PlaneGeometry) iki yandan görünür; yağ lekesi: clone + transmission 1, roughness 0.3, color 0xd9c79a disk yama
      });
      var posetKirisik = fbmAlani(256, 4, 3, 61, true);               // türbülanslı DÜŞÜK frekans: sıfır geçişleri kırışık SIRT çizgisi yapar (256 px ≈ 8 cm → 3-6 kırışık); yüksek frekans buzlu cama karışır
      var posetMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, metalness: 0, roughness: 0.25,               // ince naylon film NETE yakın: 0.25 → arka hafif flu (mip ~1.9); 0.2'de referans karo çizgileri cam gibi net kaldı (galeride ölçüldü), 0.4'te buzlu camdan ayrılmaz
        transmission: 0.9, ior: 1.4, thickness: 0.01,                // %10 süt beyazı difüz (film beyazımsı okunur, katlandığı yerde daha opak); film kalınlığı 0.01
        attenuationColor: new THREE.Color(0xe4eef5), attenuationDistance: 0.03,   // çok ince filmde hafif mavimsi-beyaz ton (0.01 kalınlıkta kırmızı ~%92, mavi ~%97 geçer)
        normalMap: normalHaritasi(256, posetKirisik, 2), normalScale: new THREE.Vector2(0.6, 0.6),   // kırışık: Sobel piksel eğiminin ~8 katı, yumuşak alanda güç 2 yeter; parıltı sırtlarda kırılır
        sheen: 0.4, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xffffff),   // kırışık sırtlarındaki ince parlak çizgiler
        specularIntensity: 0.8, envMapIntensity: 1, side: THREE.DoubleSide   // film iki yüzlü; geometri PlaneGeometry(w, h, 24, 24) köşeleri tohumlu sinüsle ±0.02 buruşturulur (Math.random YOK)
      });
      posetMat.userData.buzlu = true; yagliKagitMat.userData.buzlu = true;   // camDuzelt onarimi yari saydamlara dokunmaz
    } catch (e) { _hata = e; }
    return { _hata: _hata, buzluCamMat: (typeof buzluCamMat !== 'undefined' ? buzluCamMat : undefined), kagitLifDoku: (typeof kagitLifDoku !== 'undefined' ? kagitLifDoku : undefined), yagliKagitMat: (typeof yagliKagitMat !== 'undefined' ? yagliKagitMat : undefined), posetKirisik: (typeof posetKirisik !== 'undefined' ? posetKirisik : undefined), posetMat: (typeof posetMat !== 'undefined' ? posetMat : undefined) };
  },
  "komur-grafit": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // TAŞ KÖMÜRÜ — simsiyah; kırık düzlemleri (fasetler) camsı parlar, aralar tozlu mat. Fasetler: iki ölçekli jitterli Voronoi hücreleri (iri faset + ufalanmış ince bölge), her hücre kendi eğimiyle bir düzlem (±17°) → normal haritası; hücre başına camsı/mat pürüz ve ton (düz roughness + normal yok = siyah plastik top tuzağı; basamaklı fbm ise eş merkezli oyma çizgi gibi okunuyordu — galeride ölçüldü)
      var komurN = 512;   // 512 px ≈ 8 cm parça
      function komurHash(i, j, k, C) { var s = Math.sin(((i % C) + C) % C * 127.1 + ((j % C) + C) % C * 311.7 + k * 74.7) * 43758.5453; return s - Math.floor(s); }   // döşenebilir, deterministik hücre rastgelesi 0..1 (Math.random YOK)
      function komurHucre(cx, cy, C, t) {   // jitterli Voronoi: piksel (cx,cy) için C×C ızgarada en yakın hücre → [i, j, dx, dy] (3×3 komşu arama, döşenebilir)
        var cs = komurN / C, gx = Math.floor(cx / cs), gy = Math.floor(cy / cs), en = 1e9, r = [0, 0, 0, 0];
        for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {
          var ii = gx + di, jj = gy + dj, mx = (ii + 0.5 + (komurHash(ii, jj, 1 + t, C) - 0.5) * 0.9) * cs, my = (jj + 0.5 + (komurHash(ii, jj, 2 + t, C) - 0.5) * 0.9) * cs, ddx = cx - mx, ddy = cy - my, d2 = ddx * ddx + ddy * ddy;
          if (d2 < en) { en = d2; r = [ii, jj, ddx, ddy]; }
        }
        return r;
      }
      var komurKirik = fbmAlani(komurN, 5, 5, 223, true), komurH = new Float32Array(komurN * komurN), komurR = new Float32Array(komurN * komurN), komurP = new Float32Array(komurN * komurN);   // kirik: türbülans V-kırışıkları (konkoidal dalga); H yükseklik, R pürüz, P hücre parlaklık payı
      for (var cy = 0; cy < komurN; cy++) for (var cx = 0; cx < komurN; cx++) {
        var h = komurHucre(cx, cy, 6, 0), C = 6, t = 0;                                                    // iri faset: 6×6 hücre ≈ 1.3 cm
        if (komurHash(h[0], h[1], 9, 6) < 0.35) { h = komurHucre(cx, cy, 18, 10); C = 18; t = 10; }      // hücrelerin %35'i ufalanmış: 3× ince alt fasetler (tek ölçek «siyah futbol topu» gibi düzenli okunuyordu — galeride ölçüldü)
        var ci = cy * komurN + cx, ta = (komurHash(h[0], h[1], 3 + t, C) - 0.5) * 2, tb = (komurHash(h[0], h[1], 4 + t, C) - 0.5) * 2, parlak = komurHash(h[0], h[1], 5 + t, C);
        if (C > 6) parlak = parlak * 0.5 + 0.5;                                                            // ufalanmış bölge çoğunlukla tozlu-mat
        komurH[ci] = 0.5 + (ta * h[2] + tb * h[3]) * 0.012 + komurKirik[ci] * 0.1;                         // hücre = eğik düzlem (0.012/px × Sobel × güç 3 ≈ 17°), hücre sınırı keskin kırık kenarı; üstüne ince kırık dalgası
        komurR[ci] = parlak < 0.6 ? 0.12 + parlak * 0.1 : 0.55 + (parlak - 0.6) * 0.5;                    // faset camsı (0.12-0.18) ya da tozlu-mat (0.55-0.75); toplamda ≈ %40 camsı
        komurP[ci] = parlak;
      }
      var komurRenk = alanDokusu(komurN, komurH, function (v, x, y) {
        var i = y * komurN + x, p = komurP[i], k = (p < 0.6 ? 10 : 24) + (p - 0.5) * 6 + (komurKirik[i] - 0.5) * 6;   // camsı faset #0a0a0c, tozlu faset #18181c; hücre içi hafif ton
        return karisim([k, k, k + 2], [62, 44, 30], Math.max(0, 0.1 - komurKirik[i]) * 4);            // kırık diplerinde ince kahverengimsi damar
      });
      var komurMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: komurRenk, metalness: 0, roughness: 1,                                  // roughness 1 × harita = harita değeri
        roughnessMap: alanDokusu(komurN, komurR, function (v) { var k = v * 255; return [k, k, k]; }, false),   // veri dokusu (lineer): camsı faset / tozlu faset
        normalMap: normalHaritasi(komurN, komurH, 3), normalScale: new THREE.Vector2(1.0, 1.0),          // güçlü: her faset kendi açısından parlar, kenarlar keskin
        flatShading: true, specularIntensity: 1, envMapIntensity: 1                                      // flatShading: her üçgen ayrı faset (komurParcasi ile asıl etkisi; düz kürede ince)
      });
      function komurParcasi(r, tohum) {   // kırık kömür parçası: IcosahedronGeometry(r, 1) köşeleri deterministik ±%18 (konum tabanlı sin karışımı; Math.random YOK) — flatShading ile 80 düz faset
        var g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position, s = (tohum || 1) * 2.3;
        for (var i = 0; i < p.count; i++) { var x = p.getX(i), y = p.getY(i), z = p.getZ(i), d = 1 + 0.18 * Math.sin(5.1 * x / r + s) * Math.cos(4.3 * y / r - s) + 0.08 * Math.sin(6.7 * z / r + 2 * s); p.setXYZ(i, x * d, y * d, z * d); }
        g.computeVertexNormals(); return g;   // kullanım: new THREE.Mesh(komurParcasi(0.3, 4), komurMat); yığın: 8-15 parça farklı tohum + döndürme
      }
      // GRAFİT — kurşun kalem ucu / grafit çubuk: koyu kurşun grisi, yağlı-metalik yumuşak parlaklık (yarı metal: metalness 0.75; 1 çelik, 0 siyah plastik). Çubuk boyunca çok ince fırça izi (yatay = silindir ekseni yönü) hafif anizotropik izlenim; çizgi gücü düşük (0.5 alfa / 0.0015 bump sarılmış tel gibi okunuyordu — galeride ölçüldü)
      var grafitMat = new THREE.MeshStandardMaterial({
        color: 0x3e3e42, metalness: 0.75, roughness: 0.4,
        bumpMap: cizgiDoku(512, '#888', 'rgba(255,255,255,0.3)', 3, true, false), bumpScale: 0.0007,      // ince yatay çizgi, çok düşük güç
        roughnessMap: cizgiDoku(512, '#d0d0d0', 'rgba(255,255,255,0.25)', 3, true, false),                // çizgi boyunca pürüz 0.33-0.35 dalgalanır: yansıma çizgi yönünde hafif uzar
        envMapIntensity: 1
      });   // sürtülmüş/çizilen yer daha parlak: roughness 0.3; kalem ucu ConeGeometry(0.004, 0.02, 16), grafit çubuk CylinderGeometry(0.02, 0.02, 0.5, 24)
      // KÜL — açık gri, tamamen mat kabarık toz: geniş açık/koyu gri leke + 4 px ince toz tanesi + seyrek koyu yanmamış kırıntı tek dokuda; yumuşak tümsek normali; sheen 0.1 beyaz = tozun kenar aydınlığı (0.4 üstü kumaş yapar)
      var kulN = 512, kulLeke = fbmAlani(kulN, 3, 4, 233), kulTane = gurultuAlani(kulN, 128, 128, 239), kulKir = gurultuAlani(kulN, 64, 64, 241), kulH = new Float32Array(kulN * kulN);   // 512 px ≈ 10 cm yığın
      var kulDoku = alanDokusu(kulN, kulLeke, function (v, x, y) {
        var i = y * kulN + x, k = 178 + (v - 0.5) * 14 + (kulTane[i] - 0.5) * 10; kulH[i] = v * 0.75 + kulTane[i] * 0.25;   // #b2afa7 çevresi: ±7 leke, ±5 tane (±6 tane + 0.35 normal kumtaşı gibi sertti — galeride ölçüldü)
        return kulKir[i] > 0.965 ? [58, 55, 52] : [k, k - 3, k - 11];                                          // %1-2 koyu kırıntı; hafif sıcak gri
      });
      var kulMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: kulDoku, metalness: 0, roughness: 1,
        normalMap: normalHaritasi(kulN, kulH, 1.2), normalScale: new THREE.Vector2(0.28, 0.28),   // tozun yumuşak kabarıklığı; 0.35 üstü kum/kumtaşı gibi sertleşir
        sheen: 0.1, sheenRoughness: 1, sheenColor: new THREE.Color(0xffffff),
        specularIntensity: 0.3, envMapIntensity: 1                                             // toz ortamı yansıtmaz
      });   // yığın: tepesi yuvarlatılmış LatheGeometry profili (ConeGeometry tepesi sivri kalır); üstüne 5-10 koyu (#2a2a2c) minik kırıntı küresi = yanmamış parça
    } catch (e) { _hata = e; }
    return { _hata: _hata, komurN: (typeof komurN !== 'undefined' ? komurN : undefined), s: (typeof s !== 'undefined' ? s : undefined), komurHash: (typeof komurHash !== 'undefined' ? komurHash : undefined), komurHucre: (typeof komurHucre !== 'undefined' ? komurHucre : undefined), komurKirik: (typeof komurKirik !== 'undefined' ? komurKirik : undefined), komurH: (typeof komurH !== 'undefined' ? komurH : undefined), komurR: (typeof komurR !== 'undefined' ? komurR : undefined), komurP: (typeof komurP !== 'undefined' ? komurP : undefined), cy: (typeof cy !== 'undefined' ? cy : undefined), cx: (typeof cx !== 'undefined' ? cx : undefined), komurRenk: (typeof komurRenk !== 'undefined' ? komurRenk : undefined), komurMat: (typeof komurMat !== 'undefined' ? komurMat : undefined), komurParcasi: (typeof komurParcasi !== 'undefined' ? komurParcasi : undefined), grafitMat: (typeof grafitMat !== 'undefined' ? grafitMat : undefined), kulN: (typeof kulN !== 'undefined' ? kulN : undefined), kulLeke: (typeof kulLeke !== 'undefined' ? kulLeke : undefined), kulTane: (typeof kulTane !== 'undefined' ? kulTane : undefined), kulKir: (typeof kulKir !== 'undefined' ? kulKir : undefined), kulH: (typeof kulH !== 'undefined' ? kulH : undefined), kulDoku: (typeof kulDoku !== 'undefined' ? kulDoku : undefined), kulMat: (typeof kulMat !== 'undefined' ? kulMat : undefined) };
  },
  "miknatis": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // ─ MIKNATIS: emaye boyalı çelik (N KIRMIZI / S MAVİ), sinterlenmiş ferrit, nikel kaplı neodimyum ─
      var kutupKirmizi = '#c8262b', kutupMavi = '#1f4fb8';   // okul mıknatısı sözleşmesi: N kırmızı, S mavi — sapma yok, ters yazılmaz
      var miknatisHarf = true;                                // false: harfsiz (yalnız renk); harf en çok 2 karakter (yazı yüzeyi kuralı), beyaz baskı
      function boyaliKutup(renk, doku) {   // EMAYE FIRIN BOYASI: boya gövdesi hafif pürüzlü (0.35) + üstünde yarım cila (0.7/0.15) — tam cila 1 lego plastiği, 0.4 altı mat duvar boyası okunur; renk '#hex' ya da doku (şerit) — plastik/boya metalness 0
        return new THREE.MeshPhysicalMaterial({
          color: doku ? 0xffffff : new THREE.Color(renk), map: doku || null, metalness: 0, roughness: 0.35,
          clearcoat: 0.7, clearcoatRoughness: 0.15, specularIntensity: 0.8, envMapIntensity: 1
        });
      }
      var boyaliKutupMat = boyaliKutup(kutupKirmizi);   // N yarısı / U'nun N bacağı (kırmızı)
      var boyaliKutupMatS = boyaliKutup(kutupMavi);     // S yarısı / U'nun S bacağı (mavi)
      var ucMat = new THREE.MeshStandardMaterial({ color: 0xd8dbe0, metalness: 1, roughness: 0.14, envMapIntensity: 1 });   // boyasız kutup yüzü: açık gri çelik (metal-parlak ailesi), küçük yüz → doku yok
      var ferritMat = new THREE.MeshStandardMaterial({
        color: 0x2e2f33, metalness: 0.15, roughness: 0.75,                        // sinterlenmiş ferrit: koyu gri-siyah seramik, mat; hafif metalik tını (0.15) grafit/kauçuktan ayırır
        bumpMap: gurultuDoku(256, '#808080', 0.6, 1, false), bumpScale: 0.004,   // ince tanecik pütür (veri dokusu); 0.008 üstü asfalt gibi kabalaşır
        envMapIntensity: 1
      });
      var neodimMat = new THREE.MeshStandardMaterial({
        color: 0xd9dde2, metalness: 1, roughness: 0.15,                                                        // nikel kaplama: soğuk gümüş, ayna-parlak (0.05 krom, 0.3 mat çelik olurdu)
        bumpMap: cizgiDoku(512, '#909090', 'rgba(255,255,255,0.35)', 2, true, false), bumpScale: 0.0004,   // çok düşük taşlama izi, YATAY çizgi: Lathe/Cylinder kapağında eş merkezli halka (torna izi); dikey çizgi kapakta merkeze toplanıp CD ışını gibi okunuyordu (galeride ölçüldü); metalde map kullanma: rengi koyultur
        envMapIntensity: 1                                                                                     // METAL ORTAMDAN YAŞAR — StudyoOrtami kurulu
      });
      function kutupSeridi(oran, ters, harfli) {   // yarısı kırmızı (N) yarısı mavi (S) boya şeridi + beyaz kutup harfi; oran = yüz uzunluğu/eni (harf bozulmasın); ters=true arka yüz için ayna sıralı (S solda) — harf düz okunur
        var w = 512, h = Math.max(48, Math.round(w / Math.max(1, oran || 4))), c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d');
        g.fillStyle = ters ? kutupMavi : kutupKirmizi; g.fillRect(0, 0, w / 2, h);
        g.fillStyle = ters ? kutupKirmizi : kutupMavi; g.fillRect(w / 2, 0, w / 2, h);
        if (harfli !== false && miknatisHarf) {   // CanvasTexture y aşağı büyür (kural 12): harf ortalı, gövde hizası için %4 aşağı
          g.fillStyle = '#ffffff'; g.font = 'bold ' + Math.round(h * 0.72) + 'px Arial, Helvetica, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(ters ? 'S' : 'N', w / 4, h * 0.54); g.fillText(ters ? 'N' : 'S', 3 * w / 4, h * 0.54);
        }
        var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;   // RENK dokusu sRGB; repeat yok
      }
      function pahliKutu(w, h, d, r) {   // RoundedBox + yüz başına DÜZLEM uv: RoundedBox'ın kendi uv'si orta köşeyi kenara yığar (harf yüzün bir yarısına kayar) → şerit ve harf yerinde; BoxGeometry düzeni: yüz sırası +x,-x,+y,-y,+z,-z, yüz başına eşit köşe
        var g = new THREE.RoundedBoxGeometry(w, h, d, 3, r), p = g.attributes.position, uv = g.attributes.uv, n = p.count / 6;
        for (var i = 0; i < p.count; i++) {
          var x = p.getX(i) / w + 0.5, y = p.getY(i) / h + 0.5, z = p.getZ(i) / d + 0.5, f = Math.floor(i / n);
          if (f < 2) uv.setXY(i, f === 0 ? 1 - z : z, y);   // uç yüzler (düz metal, sıra önemsiz)
          else if (f === 2) uv.setXY(i, x, 1 - z);            // üst: u = x (N solda), v arkaya doğru → önden bakınca harf düz
          else if (f === 3) uv.setXY(i, x, z);                // alt (harfsiz şerit)
          else if (f === 4) uv.setXY(i, x, y);                // ön (+z)
          else uv.setXY(i, 1 - x, y);                         // arka (−z): u sağdan sola → ters şeritle harf düz, renk yarısı yerinde kalır
        }
        uv.needsUpdate = true; return g;
      }
      function miknatisCubuk(uzunluk, en, kalin) {   // ÇUBUK MIKNATIS KURUCU → Group; uzunluk x ekseninde, N (kırmızı) −x ucunda, S (mavi) +x ucunda; en = z, kalin = y (yükseklik); tabanı y = 0, ortası (0, kalin/2, 0); uç yüzler boyasız gümüş çelik
        uzunluk = uzunluk || 0.6; en = en || 0.13; kalin = kalin || en;
        var g = pahliKutu(uzunluk, kalin, en, Math.min(en, kalin) * 0.12),   // kenar pahı kısa kenarın %12'si (keskin BoxGeometry karton okunur)
            ust = boyaliKutup(null, kutupSeridi(uzunluk / en)), alt = boyaliKutup(null, kutupSeridi(uzunluk / en, false, false)),
            on = boyaliKutup(null, kutupSeridi(uzunluk / kalin)), arka = boyaliKutup(null, kutupSeridi(uzunluk / kalin, true));
        var govde = new THREE.Mesh(g, [ucMat, ucMat, ust, alt, on, arka]);   // +x,-x uç yüzleri gümüş; dört uzun yüz iki renkli şerit (tek parça: ortada oluk yok, yalnız boya sınırı)
        govde.position.y = kalin / 2;
        var grup = new THREE.Group(); grup.add(govde); grup.userData.miknatis = 'cubuk'; return grup;
      }
      function miknatisU(yaricap, kalinlik, bacak) {   // U (AT NALI) MIKNATIS KURUCU → Group; büküm ALTTA (yarım tor, XY düzlemi), bacaklar +y'ye; N (kırmızı) −x bacağı, S (mavi) +x bacağı; bacak uçlarının üst 0.06'sı boyasız gümüş kutup yüzü; tabanı y = 0, açıklığı +z'den görünür
        yaricap = yaricap || 0.2; kalinlik = kalinlik || 0.055; bacak = bacak || yaricap * 1.4;
        var uc = Math.min(0.06, bacak * 0.25), grup = new THREE.Group(), ic = new THREE.Group();   // ic: büküm merkezi; grup kökü büküm dibinde (y = 0) → grup.position.set(x, 0, z) yeter
        var solBukum = new THREE.Mesh(new THREE.TorusGeometry(yaricap, kalinlik, 24, 28, Math.PI / 2), boyaliKutupMat); solBukum.rotation.z = Math.PI;          // π..3π/2: sol-alt çeyrek (N)
        var sagBukum = new THREE.Mesh(new THREE.TorusGeometry(yaricap, kalinlik, 24, 28, Math.PI / 2), boyaliKutupMatS); sagBukum.rotation.z = -Math.PI / 2;  // 3π/2..2π: sağ-alt çeyrek (S)
        [[-1, boyaliKutupMat], [1, boyaliKutupMatS]].forEach(function (b) {
          var govde = new THREE.Mesh(new THREE.CylinderGeometry(kalinlik, kalinlik, bacak - uc, 32, 1, true), b[1]);   // açık uçlu: alt ağzı tor ucuna, üst ağzı gümüş uca birebir oturur (kapak çakışması yok)
          govde.position.set(b[0] * yaricap, (bacak - uc) / 2, 0);
          var kutup = new THREE.Mesh(new THREE.CylinderGeometry(kalinlik, kalinlik, uc, 32), ucMat); kutup.position.set(b[0] * yaricap, bacak - uc / 2, 0);
          ic.add(govde, kutup);
        });
        ic.add(solBukum, sagBukum); ic.position.y = yaricap + kalinlik;   // büküm dibi zemine oturur (galeride ölçüldü: kökü kaydırınca position.set(x, 0, z) bükümü zemine gömüyordu)
        grup.add(ic); grup.userData.miknatis = 'u'; return grup;
      }
      function neodimDisk(yaricap, kalinlik) {   // NEODİMYUM DİSK KURUCU → Mesh; kenarı hafif yuvarlatılmış (kaplama pahı), tabanı y = 0; halka için Torus/Lathe aynı malzeme
        yaricap = yaricap || 0.14; kalinlik = kalinlik || 0.06;
        var f = Math.min(0.012, kalinlik * 0.2), p = [new THREE.Vector2(0, 0), new THREE.Vector2(yaricap - f, 0)];
        for (var i = 1; i <= 4; i++) { var a = -Math.PI / 2 + i * Math.PI / 8; p.push(new THREE.Vector2(yaricap - f + f * Math.cos(a), f + f * Math.sin(a))); }   // alt pah
        for (var j = 0; j <= 4; j++) { var b = j * Math.PI / 8; p.push(new THREE.Vector2(yaricap - f + f * Math.cos(b), kalinlik - f + f * Math.sin(b))); }      // üst pah
        p.push(new THREE.Vector2(0, kalinlik));
        return new THREE.Mesh(new THREE.LatheGeometry(p, 96), neodimMat);   // profil alt merkezden dışa, yukarı, üst merkeze: normaller dışa bakar
      }
      // GALERİ DİZİLİMİ (~1.6 birim, zemine oturur, ortalı): U dik solda, çubuk yatık önde (N ucu kameraya dönük), ferrit blok sağda arkada, neodim disk bloğun ön yüzüne yapışık (dik: aynada ufuk çizgisi okunur)
      var miknatisSahne = new THREE.Group();
      var cubukMik = miknatisCubuk(0.66, 0.15, 0.15); cubukMik.position.set(0.0, 0, 0.4); cubukMik.rotation.y = 0.5;
      var uMik = miknatisU(0.2, 0.06, 0.3); uMik.position.set(-0.55, 0, -0.12); uMik.rotation.y = 0.35;
      var blokGrubu = new THREE.Group(); blokGrubu.position.set(0.5, 0, -0.2); blokGrubu.rotation.y = -0.3;
      var ferritBlok = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.24, 0.2), ferritMat); ferritBlok.position.y = 0.12;   // keskin kenar: kırılgan seramik blok (pah yok)
      var neodimYatis = 0.18;   // bloğa yaslanma açısı (rad): yansıma ufka (+3°) düşer → diskte açık ufuk şeridi + koyu zemin degradesi (ayna okunur); dik (0) yalnız koyu zemini yansıtıp gri plastik, 0.5 yalnız gökü yansıtıp beyaz disk gibi okunuyordu (galeride ölçüldü)
      var neodimMik = neodimDisk(0.13, 0.05); neodimMik.rotation.x = Math.PI / 2 - neodimYatis; neodimMik.position.set(0, 0.13 * Math.cos(neodimYatis), 0.11 + 0.13 * Math.sin(neodimYatis));   // üst kenarı ön yüze 0.01 payla (eş düzlem yasağı), alt kenarı zeminde
      blokGrubu.add(ferritBlok, neodimMik);
      miknatisSahne.add(cubukMik, uMik, blokGrubu);
    } catch (e) { _hata = e; }
    return { _hata: _hata, kutupKirmizi: (typeof kutupKirmizi !== 'undefined' ? kutupKirmizi : undefined), kutupMavi: (typeof kutupMavi !== 'undefined' ? kutupMavi : undefined), miknatisHarf: (typeof miknatisHarf !== 'undefined' ? miknatisHarf : undefined), boyaliKutup: (typeof boyaliKutup !== 'undefined' ? boyaliKutup : undefined), boyaliKutupMat: (typeof boyaliKutupMat !== 'undefined' ? boyaliKutupMat : undefined), boyaliKutupMatS: (typeof boyaliKutupMatS !== 'undefined' ? boyaliKutupMatS : undefined), ucMat: (typeof ucMat !== 'undefined' ? ucMat : undefined), ferritMat: (typeof ferritMat !== 'undefined' ? ferritMat : undefined), neodimMat: (typeof neodimMat !== 'undefined' ? neodimMat : undefined), kutupSeridi: (typeof kutupSeridi !== 'undefined' ? kutupSeridi : undefined), pahliKutu: (typeof pahliKutu !== 'undefined' ? pahliKutu : undefined), miknatisCubuk: (typeof miknatisCubuk !== 'undefined' ? miknatisCubuk : undefined), miknatisU: (typeof miknatisU !== 'undefined' ? miknatisU : undefined), neodimDisk: (typeof neodimDisk !== 'undefined' ? neodimDisk : undefined), miknatisSahne: (typeof miknatisSahne !== 'undefined' ? miknatisSahne : undefined), cubukMik: (typeof cubukMik !== 'undefined' ? cubukMik : undefined), uMik: (typeof uMik !== 'undefined' ? uMik : undefined), blokGrubu: (typeof blokGrubu !== 'undefined' ? blokGrubu : undefined), ferritBlok: (typeof ferritBlok !== 'undefined' ? ferritBlok : undefined), neodimYatis: (typeof neodimYatis !== 'undefined' ? neodimYatis : undefined), neodimMik: (typeof neodimMik !== 'undefined' ? neodimMik : undefined) };
  },
  "buhar-duman": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // ─ BUHAR/DUMAN: gazın hacmi yok → kameraya bakan yumuşak puf Sprite yığını; transmission YOK (cam gibi kırardı), transparent+opacity burada madde 16 hayalet/EFEKT istisnasıdır
      function buharPufDokusu(tohum) {   // deterministik puf dokusu (128 px): ana radyal lob + 4 kaçık küçük lob → puf yuvarlak disk değil topaklı okunur; RGB her yerde BEYAZ, kenarda alfa 0 (renk malzemeden gelir; kara kare/kenar çizgisi yok)
        var n = 128, c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d'), r = _lcg((tohum || 1) * 131 + 7);
        function lob(cx, cy, rad, a) {   // yumuşak radyal gradyan: 0.35'te yarı, 0.7'de altıda bir, 1'de sıfır — kenar hiçbir yerde keskin değil
          var gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad); gr.addColorStop(0, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(0.35, 'rgba(255,255,255,' + (a * 0.55) + ')');
          gr.addColorStop(0.7, 'rgba(255,255,255,' + (a * 0.16) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n);
        }
        lob(n / 2, n / 2, n * 0.48, 0.85);   // ana lob yarıçapı 0.48n: alfa kanvas kenarına varmadan 0'a iner (kare kenar artefaktı yok)
        for (var i = 0; i < 4; i++) { var a = r() * 6.283, d = n * (0.08 + 0.14 * r()); lob(n / 2 + Math.cos(a) * d, n / 2 + Math.sin(a) * d, n * (0.14 + 0.1 * r()), 0.5); }   // kaçık loblar: merkezden en çok 0.22n, yarıçap en çok 0.24n → 0.46n içinde kalır
        var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
      }
      var pufDoku = buharPufDokusu(5);   // tek doku; buhar ve duman malzemeleri paylaşır
      var buharMat = new THREE.SpriteMaterial({
        map: pufDoku, color: 0xf6f7f8, transparent: true, opacity: 0.42,   // beyaz su buharı; opacity 0.42 = TABAN puf opaklığı (0.25-0.45): galeride ölçüldü — 0.34 açık fon önünde okunmuyordu, 0.42 tabanda yoğun/tepede kayboluyor; 0.5 üstü pamuk gibi opak; sıcak anahtar ışıkta color 0xf8f2e8 (Sprite ışıktan etkilenmez, ışık tonu renge karıştırılır)
        depthWrite: false, depthTest: true, blending: THREE.NormalBlending,   // depthWrite kapalı: pufler birbirini kesmez; depthTest açık: opak nesnenin arkasında doğru gizlenir; NormalBlending: additive açık fonda buharı yakıyordu
        toneMapped: false   // sprite ışıksız düz renktir: ACES beyazı açık fonun tonuna çekip buharı siliyordu (galeride ölçüldü); bloom'a girmez (lineer 0.93 < eşik)
      });
      buharMat.userData.ustRenk = 0xdde3ea;   // tepe rengi (hex SAYI: Material.clone userData'yı JSON kopyalar, Color nesnesi bozulurdu): seyrelen buhar gök-gri tonu alır, kurucu taban→tepe lerp eder
      var dumanMat = new THREE.SpriteMaterial({
        map: pufDoku, color: 0x3a3a3a, transparent: true, opacity: 0.44,   // soba/baca/mum dumanı, is: koyu gri taban, tepede 0x777777'ye açılır; egzoz/yoğun is: opacity 0.5, tepe 0x5a5a5a; hafif mum dumanı: opacity 0.3
        depthWrite: false, depthTest: true, blending: THREE.NormalBlending, toneMapped: false   // buharMat ile aynı gerekçe (gri ton eşlemesiz de aynı okunur)
      });
      dumanMat.userData.ustRenk = 0x777777;   // tepede açılan gri (is: 0x5a5a5a)
      function buharSutunu(sayi, yukseklik, genislik, ton, tohum) {   // yükselen sütun: sayi puf (24-60) tabandan tepeye eşit fazlı; büyür (en ×0.5 → ×1.9), seyrelir ((1-u)^1.3 → tepede 0), deterministik S kıvrımıyla yükselir; ton: buharMat / dumanMat (ya da 0x renk → buharMat kopyası); her puf KENDİ malzeme kopyasını alır (Sprite'ta opaklık ve dönüş malzemededir)
        var r = _lcg((tohum || 1) * 7919 + 3), g = new THREE.Group(), pufler = [];
        var temel = (ton && ton.isMaterial) ? ton : buharMat, taban = new THREE.Color(ton && !ton.isMaterial ? ton : temel.color);
        var ust = new THREE.Color(temel.userData.ustRenk !== undefined ? temel.userData.ustRenk : taban);
        for (var i = 0; i < sayi; i++) {
          var m = temel.clone(); m.rotation = (r() - 0.5) * 3;   // pufa özel dönüş açısı: aynı doku farklı açılarda → tekrar eden disk okunmaz
          var s = new THREE.Sprite(m); s.castShadow = false; s.receiveShadow = false; s.raycast = function () {};   // gölge yok; raycast'e girmez (arkasındaki nesne tıklanabilir kalır)
          s.userData.faz = i / sayi; s.userData.jx = r() - 0.5; s.userData.jz = r() - 0.5; s.userData.jb = 0.8 + 0.45 * r(); s.userData.jo = 0.7 + 0.3 * r();   // deterministik sapmalar (tohumlu LCG; rastgele sayı üreteci yok)
          g.add(s); pufler.push(s);
        }
        function yerlestir(s, u, t) {   // u 0..1 pufun ömrü (0 kaynak ağzı, 1 tepe); t saniye yalnız yan salınım
          var d = s.userData, w = genislik, kivrim = Math.sin(u * 4.4 + (tohum || 1) * 1.7) * w * 0.34 * u;   // sütun boyunca S kıvrımı (esinti); tohum farklı → kıvrım farklı
          s.position.set(d.jx * w * (0.35 + 1.05 * u) + kivrim + Math.sin(t * 0.9 + d.faz * 6.28) * w * 0.05 * u, u * yukseklik, d.jz * w * 0.45 * (0.25 + u));   // tabanda dar, yükseldikçe yayılır
          var b = w * (0.5 + 1.4 * u) * d.jb; s.scale.set(b, b * 0.92, 1);   // puf büyür: tabanda kap ağzı eninin yarısı, tepede ~2 katı
          s.material.opacity = temel.opacity * d.jo * Math.pow(1 - u, 1.15) * Math.min(1, 0.35 + u * 5);   // doğumda hızla belirir, tepede 0'a iner (dağılan gaz görünmez olur); üs 1.15: orta boyda görünür kalır, 1.5 sütunu yarıda kesiyordu
          s.material.color.copy(taban).lerp(ust, u);   // taban→tepe renk geçişi (duman açılır, buhar gök tonu alır)
        }
      
        g.userData.guncelle = function (saniye) { for (var k = 0; k < pufler.length; k++) yerlestir(pufler[k], (pufler[k].userData.faz + saniye * g.userData.hiz) % 1, saniye); };   // döngüde: sutun.userData.guncelle(clock.getElapsedTime()) → yükselir, büyür, solar; tepeye varan puf tabana döner
        g.userData.guncelle(0); return g;   // durağan kare = 0. saniye (galeri bunu görür)
      }
      var buharSahne = new THREE.Group();   // GALERİ/ÖRNEK düzenek: solda beyaz buhar (kap ağzı y 0.42 → 1.62), sağda gri duman (ocak üstü); sahnede sütunlar doğrudan kabın ağzına / bacanın ucuna konur (position = kaynak ağzı)
      var buharSutun = buharSutunu(40, 1.2, 0.55, buharMat, 3); buharSutun.position.set(-0.75, 0.42, 0); buharSahne.add(buharSutun);   // 40 puf, 1.2 boy, 0.55 en (kap ağzı çapı ≈ 0.4)
      var dumanSutun = buharSutunu(44, 1.3, 0.48, dumanMat, 8); dumanSutun.userData.hiz = 0.06; dumanSutun.position.set(0.75, 0.36, 0); buharSahne.add(dumanSutun);   // duman daha yoğun (44 puf) ve yavaş
      var ornekKaynakMat = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.55, metalness: 0.2 });   // yalnız galeri: kaynak yer tutucuları — gerçek sahnede beher cam-kabuk, soba/baca metal-mat ya da tas-beton
      var ornekKap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.42, 40), ornekKaynakMat); ornekKap.position.set(-0.75, 0.21, 0); buharSahne.add(ornekKap);
      var ornekOcak = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, 0.36), ornekKaynakMat); ornekOcak.position.set(0.75, 0.18, 0); buharSahne.add(ornekOcak);
    } catch (e) { _hata = e; }
    return { _hata: _hata, buharPufDokusu: (typeof buharPufDokusu !== 'undefined' ? buharPufDokusu : undefined), pufDoku: (typeof pufDoku !== 'undefined' ? pufDoku : undefined), buharMat: (typeof buharMat !== 'undefined' ? buharMat : undefined), dumanMat: (typeof dumanMat !== 'undefined' ? dumanMat : undefined), buharSutunu: (typeof buharSutunu !== 'undefined' ? buharSutunu : undefined), buharSahne: (typeof buharSahne !== 'undefined' ? buharSahne : undefined), buharSutun: (typeof buharSutun !== 'undefined' ? buharSutun : undefined), dumanSutun: (typeof dumanSutun !== 'undefined' ? dumanSutun : undefined), ornekKaynakMat: (typeof ornekKaynakMat !== 'undefined' ? ornekKaynakMat : undefined), ornekKap: (typeof ornekKap !== 'undefined' ? ornekKap : undefined), ornekOcak: (typeof ornekOcak !== 'undefined' ? ornekOcak : undefined) };
  },
  "gunes-paneli": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // GÜNEŞ PANELİ — silisyum hücre ızgarası (koyu lacivert-siyah) + açık boşluk çizgileri + gümüş bara/parmak çizgileri, üstünde tek parça cam (clearcoat). Levha başına BİR doku: döşenmez/tekrarlanmaz (repeat 1); satır×sütun levhanın kenar oranına göre seçilir, hücre kare kalır
      function panelDokusu(satir, sutun, n) {   // satir = v kenarı boyunca hücre sayısı, sutun = u kenarı boyunca; n canvas boyu (1024: 10 sütunda bara 3 px). Dönüş { map: sRGB CanvasTexture, normal: hücre kenarı pah/oluk normal haritası (veri) }. Deterministik: Math.random yok
        satir = satir || 6; sutun = sutun || 10; n = n || 1024;
        var c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d');
        g.fillStyle = '#d9dee6'; g.fillRect(0, 0, n, n);   // arka folyo/EVA: hücre aralarından görünen açık gri-beyaz — boşluk çizgileri bundan
        var cw = n / sutun, ch = n / satir, kisa = Math.min(cw, ch);
        var bosluk = Math.max(2, Math.round(kisa * 0.04)), pah = kisa * 0.12;   // aralık ≈ %4 (16 cm hücrede ≈ 6 mm: gerçek 2-3 mm, uzaktan okunsun diye geniş); pah: monokristal wafer'ın kesik köşesi (4 hücre köşesinde açık baklava)
        var barSayisi = 3, barW = Math.max(2, Math.round(kisa * 0.025)), parmakAdim = Math.max(3, Math.round(ch / 36));   // 3 dikey bara (3BB hücre), bara ≈ 4 mm (gerçek 1,5 mm — uzaktan okunurluk; %3 hücreyi çizgili gösteriyordu, galeride ölçüldü); parmak çizgisi ≈ 36 sıra/hücre
        var koyu = [13, 27, 61], acik = [22, 34, 74];   // #0d1b3d – #16224a: anti-yansıtıcı kaplamalı silisyum (mavi-lacivert siyah)
        for (var r = 0; r < satir; r++) for (var k = 0; k < sutun; k++) {
          var x0 = k * cw + bosluk / 2, y0 = r * ch + bosluk / 2, x1 = (k + 1) * cw - bosluk / 2, y1 = (r + 1) * ch - bosluk / 2;
          var rgb = karisim(koyu, acik, ((r * 7 + k * 13) % 5) / 4);   // hücre başına deterministik ton farkı (wafer partisi): 5 kademe
          g.fillStyle = 'rgb(' + Math.round(rgb[0]) + ',' + Math.round(rgb[1]) + ',' + Math.round(rgb[2]) + ')';
          g.beginPath(); g.moveTo(x0 + pah, y0); g.lineTo(x1 - pah, y0); g.lineTo(x1, y0 + pah); g.lineTo(x1, y1 - pah); g.lineTo(x1 - pah, y1); g.lineTo(x0 + pah, y1); g.lineTo(x0, y1 - pah); g.lineTo(x0, y0 + pah); g.closePath(); g.fill();   // pahlı sekizgen hücre
          g.fillStyle = 'rgba(190,200,215,0.18)';   // parmak çizgileri: çok ince yatay gümüş, düşük alfa — hücreyi saf siyahtan «basılı» gri-maviye çeker
          for (var py = y0 + parmakAdim; py < y1 - 1; py += parmakAdim) g.fillRect(x0 + 1, py, x1 - x0 - 2, 1);
          g.fillStyle = '#bfc5cd';   // baralar: eşit aralıklı dikey gümüş şeritler, hücre içinde kalır
          for (var b = 0; b < barSayisi; b++) { var bx = x0 + (x1 - x0) * (b + 0.5) / barSayisi - barW / 2; g.fillRect(bx, y0 + 1, barW, y1 - y0 - 2); }
        }
        var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();   // RENK dokusu sRGB; repeat yok, malzeme3b işareti YOK (otoOlcek döşemesin: levha başına 1:1)
        var yuk = new Float32Array(n * n), rampa = Math.max(2, Math.round(kisa * 0.025));   // yükseklik: hücre 1 / boşluk 0, kenarda kısa rampa → hücre kenarları hafif çukur okunur; cam düz kalır (clearcoat kendi normalini kullanmaz, taban katmanı gölgelenir)
        for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) {
          var kx = Math.floor(x / cw), ky = Math.floor(y / ch), px = x + 0.5, qy = y + 0.5;
          var lx0 = kx * cw + bosluk / 2, ly0 = ky * ch + bosluk / 2, lx1 = (kx + 1) * cw - bosluk / 2, ly1 = (ky + 1) * ch - bosluk / 2;
          var d = Math.min(px - lx0, lx1 - px, qy - ly0, ly1 - qy);   // dik kenara uzaklık
          var dp = (Math.min(px - lx0 + qy - ly0, lx1 - px + qy - ly0, px - lx0 + ly1 - qy, lx1 - px + ly1 - qy) - pah) / 1.4142;   // pah kenarına uzaklık
          yuk[y * n + x] = Math.max(0, Math.min(1, Math.min(d, dp) / rampa));
        }
        return { map: t, normal: normalHaritasi(n, yuk, 1.0) };
      }
      var panelDoku = panelDokusu(6, 10, 1024);   // 60 hücreli standart panel: YATAY 1.6×1.0 levhada (u = 1.6 kenarı) 6 satır × 10 sütun → hücre ≈ 16 cm kare; DİKEY/portre levhada (10, 6); hesap makinesi/lamba küçük hücresi (1, 4) ya da (2, 3)
      var panelMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: panelDoku.map, metalness: 0.1, roughness: 0.25,   // hücre/bara rengi dokudan; küçük metalik pay bara parıltısı için
        normalMap: panelDoku.normal, normalScale: new THREE.Vector2(0.35, 0.35),   // hücre kenarı oluğu hafif: ızgarayı sıyırıcı ışıkta da okutur, hücreler kabartma olmaz
        clearcoat: 1, clearcoatRoughness: 0.08,   // üstteki tek parça temperli cam: keskin ortam yansıması; eğik bakışta ayna gibi (Fresnel), dik bakışta hücre görünür
        specularIntensity: 1, specularColor: new THREE.Color(0x9fb8ff),   // taban speküleri mavi tonlu: anti-yansıtıcı kaplamanın mavi-mor parıltısı (iridescence yerine ucuz ve sakin)
        envMapIntensity: 1   // cam ve bara ortamdan yaşar (StudyoOrtami kurulu)
      });
      var cerceveMat = new THREE.MeshStandardMaterial({
        color: 0xc3c8cd, metalness: 0.9, roughness: 0.4,   // eloksallı (anodize) alüminyum: açık gri (0xb9bec4 mavi-gri ortamda koyu okundu, galeride ölçüldü), mat-yarı parlak — kural 4 mat metal bandı (0.15 krom gibi parlar, panelle yarışır)
        bumpMap: cizgiDoku(256, '#888', 'rgba(255,255,255,0.35)', 3, false, false), bumpScale: 0.0015,   // ekstrüzyon/fırça çizgisi çok hafif (veri dokusu, renkli=false)
        envMapIntensity: 1   // metal ortamdan yaşar
      });
    } catch (e) { _hata = e; }
    return { _hata: _hata, panelDokusu: (typeof panelDokusu !== 'undefined' ? panelDokusu : undefined), panelDoku: (typeof panelDoku !== 'undefined' ? panelDoku : undefined), panelMat: (typeof panelMat !== 'undefined' ? panelMat : undefined), cerceveMat: (typeof cerceveMat !== 'undefined' ? cerceveMat : undefined) };
  },
  "balon": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var balonRenk = 0xd6283a;                                     // DOYGUN tek ton: kırmızı 0xd6283a / mavi 0x2f6fd6 / sarı 0xf0c419
      var balonKoyu = new THREE.Color(balonRenk).multiplyScalar(0.35);  // attenuationColor = taban renginin koyusu: zardan geçen ışık rengi DOYGUN tutar (beyaz verilirse pembe naylon poşet)
      var balonMat = new THREE.MeshPhysicalMaterial({
        color: balonRenk, metalness: 0, roughness: 0.18,              // ıslak plastik gibi pürüzsüz: parlama noktası küçük ve keskin kalır
        transmission: 0.35, ior: 1.4, thickness: 0.01,                // İNCE gergin zar: yarı saydam ama arkası bulanık; thickness büyürse (0.3+) cam küreye döner
        attenuationColor: balonKoyu, attenuationDistance: 0.05,       // kısa mesafe: zar rengi açılmaz, arkadan gelen ışık rengi parlatır
        specularIntensity: 1, clearcoat: 0.3, clearcoatRoughness: 0.1, // ince ikinci parlama lobu (lateks yüzeyi)
        sheen: 0.2, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xffffff),   // kenarda hafif açık kenar ışığı (zar gerilince incelir, kenar aydınlanır)
        roughnessMap: gurultuDoku(256, '#d0d0d0', 0.3, 1, false),     // çok hafif pudra/gerilme lekesi: parlama tek düze ayna yerine canlı; sapma 0.3 üstü balonu buzlu gösterir
        side: THREE.DoubleSide, envMapIntensity: 1                    // içi boş zar: arka yüz de görünür (ışık içinden geçer)
      });
      var bogazMat = balonMat.clone(); bogazMat.thickness = 0.03; bogazMat.roughness = 0.3;   // boğaz + düğüm: zar kalın → daha koyu ve opak (aynı renk, thickness 3 kat)
      // ARMUT BİÇİM: LatheGeometry profili (üst geniş, boğaz dar) — küre balon değil top gibi okunur; profil SplineCurve ile yumuşatılır
      var balonProfil = new THREE.SplineCurve([new THREE.Vector2(0, 0.02), new THREE.Vector2(0.06, 0.02), new THREE.Vector2(0.075, 0.08), new THREE.Vector2(0.07, 0.14),
        new THREE.Vector2(0.17, 0.23), new THREE.Vector2(0.33, 0.36), new THREE.Vector2(0.45, 0.54), new THREE.Vector2(0.5, 0.74), new THREE.Vector2(0.47, 0.92),
        new THREE.Vector2(0.36, 1.06), new THREE.Vector2(0.18, 1.16), new THREE.Vector2(0, 1.2)]).getPoints(56);
      var balonGovde = new THREE.Mesh(new THREE.LatheGeometry(balonProfil, 96), balonMat);
      var balonBogaz = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.06, 0.0), new THREE.Vector2(0.085, 0.03), new THREE.Vector2(0.08, 0.1), new THREE.Vector2(0.075, 0.15)], 48), bogazMat);   // boğaz kılıfı (kalın zar)
      var balonDugum = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.03, 16, 32), bogazMat); balonDugum.rotation.x = Math.PI / 2; balonDugum.position.y = 0.02;   // küçük düğüm
      var balonMesh = new THREE.Group(); balonMesh.add(balonGovde, balonBogaz, balonDugum);   // düğüm altta; asılı/uçan balon için grubu ters çevirme, ip ekle (helyum) ya da düğümü aşağı bırak
      balonMesh.position.y = 0.01;
    } catch (e) { _hata = e; }
    return { _hata: _hata, balonRenk: (typeof balonRenk !== 'undefined' ? balonRenk : undefined), balonKoyu: (typeof balonKoyu !== 'undefined' ? balonKoyu : undefined), balonMat: (typeof balonMat !== 'undefined' ? balonMat : undefined), bogazMat: (typeof bogazMat !== 'undefined' ? bogazMat : undefined), balonProfil: (typeof balonProfil !== 'undefined' ? balonProfil : undefined), balonGovde: (typeof balonGovde !== 'undefined' ? balonGovde : undefined), balonBogaz: (typeof balonBogaz !== 'undefined' ? balonBogaz : undefined), balonDugum: (typeof balonDugum !== 'undefined' ? balonDugum : undefined), balonMesh: (typeof balonMesh !== 'undefined' ? balonMesh : undefined) };
  },
  "mantar": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var mantarG = 56, mantarHucre = 512 / mantarG;   // granül ızgarası: 56 hücre/karo → hücre ≈ 9 px; galeri küresinde karo tam çevre → çapta ~17 granül (22 hücreli fBm eşiği iri kamuflaj lekesi yapıyordu — galeride ölçüldü)
      var mantarKarma = function (q, k) {   // hücre no + kanal → 0..1 (tam sayı LCG karması: deterministik, rastgele sayı üreteci YOK)
        var s = (Math.imul(q, 1973) + Math.imul(k, 26699) + 53) | 0;
        s = (Math.imul(s, 1664525) + 1013904223) | 0; s = (Math.imul(s ^ (s >>> 16), 1664525) + 1013904223) | 0;
        return (s >>> 0) / 4294967296;
      };
      var mantarNok = new Float32Array(mantarG * mantarG * 4);   // hücre başına: özellik noktası (x, y kayması), granül tonu, granül düzeyi
      for (var q = 0; q < mantarG * mantarG; q++) for (var kk = 0; kk < 4; kk++) mantarNok[q * 4 + kk] = mantarKarma(q, kk + 1);
      var mantarKayX = fbmAlani(512, 3, 8, 37), mantarKayY = fbmAlani(512, 3, 8, 41);   // alan bükme ±9 px: hücre kenarı düz Voronoi yerine dalgalı, organik (±6 px'te çokgen «timsah derisi» okunuyordu — galeride ölçüldü)
      var mantarTane = fbmAlani(512, 2, 128, 61);       // ince gözenekli tane (4 ve 2 px)
      var mantarLeke = fbmAlani(512, 3, 5, 91);         // geniş yumuşak ton dalgası ±8 birim: mozaik «karo döşeme» gibi durmasın
      var mantarGoz = gurultuAlani(512, 90, 90, 71);     // seyrek küçük gözenek: eşik 0,87 üstü → 1-3 px koyu nokta
      var mantarLent = gurultuAlani(512, 14, 96, 83);    // lentisel: yatay uzun hücre (37×5 px), eşik 0,9 üstü → ~14×2 px kısa koyu çizgi (doğal tıpa izi, seyrek)
      var mantarH = new Float32Array(512 * 512);         // yükseklik alanı → normal haritası
      var mantarDoku = alanDokusu(512, mantarTane, function (v, x, y) {
        var i = y * 512 + x, cx = (x + (mantarKayX[i] - 0.5) * 18) / mantarHucre, cy = (y + (mantarKayY[i] - 0.5) * 18) / mantarHucre;
        var ix = Math.floor(cx), iy = Math.floor(cy), d1 = 1e9, d2 = 1e9, ton = 0.5, duz = 0.5;
        for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {   // en yakın iki özellik noktası (3×3 komşu; hücre indeksi karo kenarında sarılır → dikişsiz)
          var jx = ix + ox, jy = iy + oy, p = ((((jy % mantarG) + mantarG) % mantarG) * mantarG + (((jx % mantarG) + mantarG) % mantarG)) * 4;
          var dx = cx - jx - mantarNok[p], dy = cy - jy - mantarNok[p + 1], d = dx * dx + dy * dy;
          if (d < d1) { d2 = d1; d1 = d; ton = mantarNok[p + 2]; duz = mantarNok[p + 3]; } else if (d < d2) d2 = d;
        }
        var r1 = Math.sqrt(d1), kenar = Math.max(0, 1 - (Math.sqrt(d2) - r1) / 0.3);   // granül arası yumuşak derz (~3 px, hafif)
        var goz = Math.max(0, Math.min(1, (mantarGoz[i] - 0.87) / 0.08)), lent = Math.max(0, Math.min(1, (mantarLent[i] - 0.9) / 0.04)), tane = (v - 0.5) * 14 + (mantarLeke[i] - 0.5) * 16;
        var c = ton < 0.4 ? karisim([205, 169, 119], [186, 150, 100], (0.4 - ton) / 0.4) : ton > 0.7 ? karisim([205, 169, 119], [219, 186, 140], (ton - 0.7) / 0.3) : [205, 169, 119];   // granül tonu: #cda977 taban, en çok ±19 birim koyu/açık (düşük kontrast; ±25'te küre kaldırım taşı mozaiği okunuyordu, eski ±80 kamuflajdı — galeride ölçüldü)
        c = [c[0] + tane - kenar * 9 - goz * 32, c[1] + tane - kenar * 8 - goz * 28, c[2] + tane - kenar * 7 - goz * 24];
        c = karisim(c, [112, 80, 50], lent * 0.65);   // lentisel koyu kahveye kısmi geçiş
        mantarH[i] = 0.55 + (duz - 0.5) * 0.08 + (1 - Math.min(1, r1 / 0.8)) * 0.06 - kenar * 0.12 + (v - 0.5) * 0.35 - goz * 0.4 - lent * 0.3;   // gözenekli tane baskın; granül düzey farkı/derz HAFİF (0.3/0.3'te fasetli kabuk okunuyordu — galeride ölçüldü)
        return c;
      });
      var mantarMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: mantarDoku, roughness: 0.93, metalness: 0,   // tamamen mat, tozlu; parlama yok; sheen/clearcoat YOK (kumaş/sır ayrımı)
        normalMap: normalHaritasi(512, mantarH, 1.0), normalScale: new THREE.Vector2(0.4, 0.4) });   // hafif gözenekli kabartma; 1.2/0.55 fasetli sert kabuk gibi okunuyordu (galeride ölçüldü)
      mantarMat.userData.dogalKaro = 0.3;   // karo TAVANI: büyük pano/levhada granül dev olmasın (ahşap dogalKaro 0.6 ≈ 20 cm ölçeğiyle 0.3 ≈ 10 cm → granül ≈ 2 mm)
    } catch (e) { _hata = e; }
    return { _hata: _hata, mantarG: (typeof mantarG !== 'undefined' ? mantarG : undefined), mantarHucre: (typeof mantarHucre !== 'undefined' ? mantarHucre : undefined), mantarKarma: (typeof mantarKarma !== 'undefined' ? mantarKarma : undefined), mantarNok: (typeof mantarNok !== 'undefined' ? mantarNok : undefined), q: (typeof q !== 'undefined' ? q : undefined), kk: (typeof kk !== 'undefined' ? kk : undefined), mantarKayX: (typeof mantarKayX !== 'undefined' ? mantarKayX : undefined), mantarKayY: (typeof mantarKayY !== 'undefined' ? mantarKayY : undefined), mantarTane: (typeof mantarTane !== 'undefined' ? mantarTane : undefined), mantarLeke: (typeof mantarLeke !== 'undefined' ? mantarLeke : undefined), mantarGoz: (typeof mantarGoz !== 'undefined' ? mantarGoz : undefined), mantarLent: (typeof mantarLent !== 'undefined' ? mantarLent : undefined), mantarH: (typeof mantarH !== 'undefined' ? mantarH : undefined), mantarDoku: (typeof mantarDoku !== 'undefined' ? mantarDoku : undefined), mantarMat: (typeof mantarMat !== 'undefined' ? mantarMat : undefined) };
  },
  "pamuk-elyaf": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // PAMUK-ELYAF: gevşek lif kütlesi (pamuk tutamı, yün tutamı/yumağı, elyaf dolgu) — dokunmuş kumaş DEĞİL (o kumas-deri). Kabarık his üç şeyden: (1) sheen 1 + beyaz sheenColor → sıyırıcı açıda tüy halesi, (2) sert speküler YOK (roughness 1, specularIntensity 0.2) → «beyaz plastik top» olmaz, (3) puf lobları arası kıvrım (crease) + her yöne dönen ince lif (renk + normal, DÜŞÜK kontrast). Opak: transmission/opacity YOK (kural 1); dağınık kenar geometriyle (not)
      var lifN = 512;   // 512 px ≈ 5 cm (pamuk) / 8 cm (yün): pamuk lifi ~0,3 mm, yün kıvrımı 1-2 mm
      function lifAlani(n, ox, oy, tohum, kivrim, genlik, dalga) {   // KIVRIMLI LİF ALANI 0..1: yönlü gürültü (ox az, oy çok → x boyunca ince şerit) alçak frekanslı fBm ile GÜÇLÜ kaydırılır (domain warp ±genlik/2 px: şerit her yöne dönen burgaca dönüşür — galeride ölçüldü: ±24 px'te lifler paralel «sarılmış iplik topu» gibi kalıyordu) + isteğe bağlı gürültü fazlı sinüs (dalga px: yün kıvırcığı; sabit faz oluklu karton yapıyordu); ridged (1-|2v-1|): v=0,5 eş-çizgisi ince parlak lif sırtı, döşenebilir
        var g = gurultuAlani(n, ox, oy, tohum), wx = fbmAlani(n, 2, kivrim, tohum + 101), wy = fbmAlani(n, 2, kivrim, tohum + 211), fz = dalga ? fbmAlani(n, 2, 3, tohum + 307) : null, out = new Float32Array(n * n);
        for (var i = 0; i < n * n; i++) {
          var x = i % n, y = (i / n) | 0, kay = dalga ? dalga * Math.sin(x / n * 6.283 * 9 + fz[i] * 12) : 0;
          var sx = x + Math.round((wx[i] - 0.5) * genlik), sy = y + Math.round((wy[i] - 0.5) * genlik + kay);
          var v = g[((sy % n) + n) % n * n + ((sx % n) + n) % n];
          out[i] = 1 - Math.abs(2 * v - 1);
        }
        return out;
      }
      // PAMUK: beyaz #f7f5f0 (dokuda 236: sıcak anahtar ışık + sheen ACES'te beyaza doyuruyor, tam beyaz dokuda lob/lif siliniyordu — galeride ölçüldü); puf LOBLARI türbülanslı fBm'den (g=0,5 eş-çizgisi = loblar arası kıvrım: renkte gri gölge + yükseklikte çukur), lifler yatay + dikey iki tarla, bölgesel maskeyle her yerde ikisi de var (biri baskın) → yönsüz tüy
      var pamukLifY = lifAlani(lifN, 20, 128, 313, 5, 110, 0), pamukLifD = lifAlani(lifN, 128, 20, 317, 5, 110, 0), pamukYon = fbmAlani(lifN, 2, 4, 331);   // 128 hücre → 4 px'lik ince lif, 20 hücre → ~25 px kısa parça; kıvrım 5 hücre ±55 px
      var pamukLob = fbmAlani(lifN, 3, 5, 337, true), pamukTane = fbmAlani(lifN, 2, 40, 341), pamukH = new Float32Array(lifN * lifN);   // lob: 5 hücre ≈ 1 cm puf (3 hücrede kürede tek iri lob, puf okunmuyordu — galeride ölçüldü); tane: ince tüy pütürü
      var pamukDoku = alanDokusu(lifN, pamukLob, function (t, x, y) {
        var i = y * lifN + x, m = Math.min(1, Math.max(0, (pamukYon[i] - 0.3) / 0.4)), lif = Math.max(pamukLifY[i] * (0.55 + 0.45 * m), pamukLifD[i] * (1 - 0.45 * m));   // m: bölgesel yön ağırlığı
        var lob = Math.min(1, Math.max(0, (t - 0.05) / 0.4));                                   // 0 kıvrım dibi → 1 lob tepesi (dar geçiş: kıvrım dik, normalde okunur)
        pamukH[i] = lob * 0.85 + (lif - 0.4) * 0.06 + (pamukTane[i] - 0.5) * 0.03;             // yükseklik: lob baskın (kabarık kütle), lif ince sırt, tüy pütürü
        var zemin = karisim([150, 150, 148], [226, 224, 219], lob);                              // kıvrım dibi nötr gri (pamuğun kendi gölgesi; sarıya kaçarsa kirli), lob tepesi taban (236/178 çiftinde aydınlık yüz düz beyaza doyuyordu — galeride ölçüldü)
        return karisim(zemin, [246, 245, 243], lif * 0.6);                                       // lif sırtı beyaza yaklaşır — düşük kontrast (gri çizgili verilirse kirli pamuk okunur)
      });
      var pamukMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: pamukDoku, metalness: 0, roughness: 1,                            // tümüyle mat; ıslak pamuk: color 0xd9d7d2 + roughness 0.85 + sheen 0.4 (yatık, grimsi)
        normalMap: normalHaritasi(lifN, pamukH, 2.5), normalScale: new THREE.Vector2(0.8, 0.8),   // lob kubbesi baskın (lif payı küçük tutulduğu için 0.8 buruşuk kâğıt yapmaz); 1.6/0.55'te kıvrım silikti — galeride ölçüldü
        sheen: 1, sheenRoughness: 0.95, sheenColor: new THREE.Color(0xffffff),                 // pamuğun ANA etkisi: kenarlarda yumuşak beyaz tüy halesi (kabarık his); beyaz tabanda beyaz sheen doğru (koyu kumaşta tabanın 2 kademe açığı)
        emissive: 0xfaf8f4, emissiveIntensity: 0.04,                                            // çok saçılan lif kütlesi: gölge tarafı plastik top gibi kararmaz (0.1 üstü aydınlık yüzü doyurup düz kesik kâğıt yapar)
        specularIntensity: 0.2, envMapIntensity: 1                                              // dielektrik F0 kısılır: parlak nokta yok, ortam yansıması yok gibi
      });
      // YÜN: krem-bej #d9cfb8, KALIN kıvırcık lif (hücre 14 px + 4 px gürültü fazlı kıvırcık, ±60 px burgaç), yatay baskın + çapraz ikinci tarla; lüleler arası türbülans kıvrımı gölgeli (düz fBm'de dalgalı kâğıt okunuyordu); pamuktan daha belirgin kontrast ve kabartı
      var yunLif = lifAlani(lifN, 6, 36, 353, 4, 120, 4), yunLif2 = lifAlani(lifN, 36, 6, 359, 4, 120, 0), yunYon = fbmAlani(lifN, 2, 3, 379), yunLob = fbmAlani(lifN, 3, 3, 367, true), yunTane = fbmAlani(lifN, 2, 48, 373), yunH = new Float32Array(lifN * lifN);
      var yunDoku = alanDokusu(lifN, yunLob, function (t, x, y) {
        var i = y * lifN + x, m = Math.min(1, Math.max(0, (yunYon[i] - 0.3) / 0.4)), lif = Math.max(yunLif[i] * (0.6 + 0.4 * m), yunLif2[i] * (0.9 - 0.4 * m));
        var lob = Math.min(1, Math.max(0, (t - 0.05) / 0.5));
        yunH[i] = lob * 0.5 + (lif - 0.4) * 0.5 + (yunTane[i] - 0.5) * 0.05;                  // lif sırtı baskın: yün tutamında kıvrımlar elle görülür; lüle arası çukur
        var zemin = karisim([132, 118, 92], [217, 207, 184], lob);                              // taban #d9cfb8; lüleler arası koyu bej gölge (120'de damarlı ahşap kökü gibi kararıyordu). Doğal gri yün: [90,86,80] → [185,179,166]
        return karisim(zemin, [243, 237, 221], lif * 0.75);                                     // lif sırtı açık krem (lanolin sıcaklığı yalnız renkle)
      });
      var yunMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: yunDoku, metalness: 0, roughness: 1,
        normalMap: normalHaritasi(lifN, yunH, 1.3), normalScale: new THREE.Vector2(0.75, 0.75), // kalın lif kabartısı; kürede kutba toplanmaması için yumak sarmal/TorusKnot geometrisi (not)
        sheen: 0.8, sheenRoughness: 0.85, sheenColor: new THREE.Color(0xf3ead8),               // sheenColor tabanın 1 kademe açığı
        specularIntensity: 0.25, envMapIntensity: 1
      });
    } catch (e) { _hata = e; }
    return { _hata: _hata, lifN: (typeof lifN !== 'undefined' ? lifN : undefined), lifAlani: (typeof lifAlani !== 'undefined' ? lifAlani : undefined), pamukLifY: (typeof pamukLifY !== 'undefined' ? pamukLifY : undefined), pamukLifD: (typeof pamukLifD !== 'undefined' ? pamukLifD : undefined), pamukYon: (typeof pamukYon !== 'undefined' ? pamukYon : undefined), pamukLob: (typeof pamukLob !== 'undefined' ? pamukLob : undefined), pamukTane: (typeof pamukTane !== 'undefined' ? pamukTane : undefined), pamukH: (typeof pamukH !== 'undefined' ? pamukH : undefined), pamukDoku: (typeof pamukDoku !== 'undefined' ? pamukDoku : undefined), pamukMat: (typeof pamukMat !== 'undefined' ? pamukMat : undefined), yunLif: (typeof yunLif !== 'undefined' ? yunLif : undefined), yunLif2: (typeof yunLif2 !== 'undefined' ? yunLif2 : undefined), yunYon: (typeof yunYon !== 'undefined' ? yunYon : undefined), yunLob: (typeof yunLob !== 'undefined' ? yunLob : undefined), yunTane: (typeof yunTane !== 'undefined' ? yunTane : undefined), yunH: (typeof yunH !== 'undefined' ? yunH : undefined), yunDoku: (typeof yunDoku !== 'undefined' ? yunDoku : undefined), yunMat: (typeof yunMat !== 'undefined' ? yunMat : undefined) };
  },
  "halat-ip": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var halatBoyOrani = 2.5;   // doku karosunun u boyu / halat çevresi: Torus(0.45, 0.18) için 2π·0.45 / 2π·0.18 = 2.5; TubeGeometry'de yolUzunlugu / (2π·r) yaz — yiv eğimi bu orana göre kurulur (u yol boyunca, v çevre: Torus ve Tube UV'si böyle)
      var halatKol = 3;          // birbirine bükülü kol sayısı (keten halat 3, kalın urgan 4); naylon örgü ipte 6-8
      var halatN = 512, halatY = new Float32Array(halatN * halatN), halatToz = fbmAlani(halatN, 3, 6, 47), halatLif = fbmAlani(halatN, 2, 24, 53);
      var halatDoku = alanDokusu(halatN, halatToz, function (v, x, y) {
        var faz = halatKol * y / halatN - Math.round(2.5 * halatBoyOrani) * x / halatN;   // sarmal: çevrede halatKol yiv, yol boyunca her çevre başına 2,5 yiv geçişi → eğim atan(2.5/3) ≈ 40°, büküm boyu ≈ 3,8 çap (2 ile büküm 4,7 çap uzuyor, kollar burulmuş şerit gibi kalıyordu — galeride ölçüldü; tam sayı katsayı: karo dikişsiz)
        var c = 0.5 + 0.5 * Math.cos(faz * 6.2832), sirt = Math.pow(c, 0.45);       // kök: kol sırtı geniş ve yuvarlak, yiv dibi dar ve keskin (düz kosinüs oluklu boru okunur)
        var lif = Math.sin((faz * 18 + (halatLif[y * halatN + x] - 0.5) * 1.2) * 6.2832) * 0.5 + 0.5;   // kol üstünde 18 ince iplik çizgisi, fBm ile kıvrımlı (düz sinüs vinil gibi düz çizgi verir; galeride 14 çizgi lif değil parmak izi gibi iri okundu)
        halatY[y * halatN + x] = sirt * 0.9 + lif * 0.06 * sirt;                       // yükseklik: yiv baskın, iplik sırt üstünde hafif kabartı
        var t = sirt * 0.8 + lif * 0.2 * sirt + (v - 0.5) * 0.18;                      // renk: yiv dibi koyu (#8c7451), sırt açık saman (#c9b183), iplik ve toz lekesi ±
        return karisim([140, 116, 81], [214, 190, 140], Math.max(0, Math.min(1, t)));
      });
      var halatMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: halatDoku, metalness: 0, roughness: 0.95,             // keten lifi tümüyle mat
        normalMap: normalHaritasi(halatN, halatY, 6), normalScale: new THREE.Vector2(1, 1),   // yiv derinliği halatın ana okunurluğu; Sobel gücü düşükse (2.5) düz bej boru
        sheen: 0.35, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xe8d9b4),  // kenarda lif tüyü parlaması (kadifemsi silüet)
        specularIntensity: 0.4, envMapIntensity: 1
      });
      // Naylon ip: halatKol = 8, halatBoyOrani aynı; renk karisim [230,230,225]↔[120,140,200] (beyaz-mavi), roughness 0.5, sheen 0.2, normal gücü 4 (sık ve sığ örgü)
    } catch (e) { _hata = e; }
    return { _hata: _hata, halatBoyOrani: (typeof halatBoyOrani !== 'undefined' ? halatBoyOrani : undefined), halatKol: (typeof halatKol !== 'undefined' ? halatKol : undefined), halatN: (typeof halatN !== 'undefined' ? halatN : undefined), halatY: (typeof halatY !== 'undefined' ? halatY : undefined), halatToz: (typeof halatToz !== 'undefined' ? halatToz : undefined), halatLif: (typeof halatLif !== 'undefined' ? halatLif : undefined), halatDoku: (typeof halatDoku !== 'undefined' ? halatDoku : undefined), halatMat: (typeof halatMat !== 'undefined' ? halatMat : undefined) };
  },
  "alci-kemik": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      // ALÇI — kırık beyaz (#efece6), TAMAMEN mat: ince tozlu tane + seyrek hava kabarcığı çukuru; ışık yüzeye yayılır (sheen), speküler yok denecek kadar az
      var alciN = 512;                                                                       // 512 px ≈ 8 cm döküm parçası (küçük nesne 1:1; büyük levha/maket duvarı sayfa repeat'iyle)
      var alciTane = fbmAlani(alciN, 3, 48, 211),                                            // ~10 px hücre ince toz tanesi (≈1,5 mm)
          alciLeke = fbmAlani(alciN, 3, 3, 213),                                             // geniş, zayıf ton lekesi (döküm suyu izi): düz beyazı kırar, kamuflaj yapmaz
          alciKabarcik = gurultuAlani(alciN, 22, 22, 217),                                   // ~23 px hücre: yalnız tepeleri kabarcık çukuru olur (eşikli → seyrek, yuvarlak)
          alciYuk = new Float32Array(alciN * alciN);
      var alciDoku = alanDokusu(alciN, alciTane, function (v, x, y) {
        var i = y * alciN + x, kb = alciKabarcik[i], cukur = kb > 0.80 ? Math.min(1, (kb - 0.80) * 7) : 0;   // eşik 0.80 → alanın ~%4'ü çukur; eşiksiz gürültü «portakal kabuğu» yapar
        alciYuk[i] = 0.5 + (v - 0.5) * 0.25 - cukur * 0.5;                                   // yükseklik: hafif tane + derin, yumuşak kenarlı kabarcık çukurları
        var k = ((v - 0.5) * 0.06 + (alciLeke[i] - 0.5) * 0.05 - cukur * 0.18) * 255;          // renk: tane ±%3, leke ±%2,5; çukur dibi gölgeli (kalıp izi)
        return [239 + k, 236 + k, 230 + k];
      });
      var alciMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: alciDoku, metalness: 0, roughness: 1,                          // tamamen mat: alçı ışığı dağıtır, parlama noktası olmaz
        normalMap: normalHaritasi(alciN, alciYuk, 1.8), normalScale: new THREE.Vector2(0.45, 0.45),   // kabarcık çukurları sıyırıcı ışıkta okunur, tane silik
        sheen: 0.15, sheenRoughness: 1, sheenColor: new THREE.Color(0xffffff),                // tebeşirimsi yumuşak kenar aydınlığı (toz tabakası)
        specularIntensity: 0.25, envMapIntensity: 1                                          // ortam yansıması neredeyse yok: envMapIntensity 1 kalır (sözleşme), speküler kısılır
      });
      // TEBEŞİR — alçı ailesi ama daha beyaz/pastel, pudralı: ince pürüz alçıdan güçlü, çubuk boyunca çok hafif çekme çizgisi; kabarcık yok
      var tebesirRenk = '#f7f6f1';                                                           // beyaz tebeşir; renkli tebeşir PALETTEN: pembe '#f2c4cf', sarı '#f3e4a4', mavi '#bcd3ee' (renk map'e girer, color beyaz kalır)
      var tebesirN = 512, tebesirT = _rgb(tebesirRenk),
          tebesirTane = fbmAlani(tebesirN, 2, 96, 223),                                      // ~5 px toz pürüzü, 2 oktav (3 oktav/64 + güçlü normal kar topu/sıva gibi topaklıyordu — galeride ölçüldü)
          tebesirCizgi = gurultuAlani(tebesirN, Math.round(tebesirN / 6), 8, 227),           // 6 px aralıklı KISA dikey çekme izi (oy 8: sürekli meridyen kürede kutba toplanır — hamur-kil'de ölçüldü)
          tebesirYuk = new Float32Array(tebesirN * tebesirN);
      var tebesirDoku = alanDokusu(tebesirN, tebesirTane, function (v, x, y) {
        var i = y * tebesirN + x, c = tebesirCizgi[i];
        tebesirYuk[i] = 0.5 + (v - 0.5) * 0.5 + (c - 0.5) * 0.2;                            // pürüz baskın (alçının 0.25'inden güçlü ama ince taneli), çizgi ikincil
        var k = ((v - 0.5) * 0.05 + (c - 0.5) * 0.02) * 255;                                 // renk neredeyse düz: pudra tekdüzedir, doku pürüzden okunur
        return [tebesirT[0] + k, tebesirT[1] + k, tebesirT[2] + k];
      });
      var tebesirMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: tebesirDoku, metalness: 0, roughness: 1,
        normalMap: normalHaritasi(tebesirN, tebesirYuk, 1.0), normalScale: new THREE.Vector2(0.3, 0.3),   // ince, sık pütür — tebeşir uzaktan düz görünür, yalnız tozlu okunur; 2.2/0.6 ve 1.4/0.4 kürede strafor/sıva topağı yapıyordu (galeride ölçüldü)
        sheen: 0.3, sheenRoughness: 1, sheenColor: new THREE.Color(0xffffff),                 // pudra kenar aydınlığı (alçıdan bir kademe fazla)
        specularIntensity: 0.2, envMapIntensity: 1
      });
      // KEMİK — fildişi-krem (#e9dcc3), ipeksi düşük parlaklık (roughness 0.5 + ince bulanık clearcoat); ince gözenek + çok hafif sarımsı leke ve damar izi; eklem ucu ayrı klon (mat, süngerimsi)
      var kemikN = 512,
          kemikTane = fbmAlani(kemikN, 3, 40, 231),                                          // ~13 px gözenek dokusu
          kemikLeke = fbmAlani(kemikN, 4, 3, 233, true),                                     // türbülanslı sarımsı-kahve yaşlanma lekesi (geniş, yumuşak)
          kemikDamar = gurultuAlani(kemikN, Math.round(kemikN / 10), 6, 239),                // yatay uzun ince çizgiler: diyafiz boyunca lif/damar izi (u = çevre, v = eksen: silindirde eksen boyunca akar)
          kemikYuk = new Float32Array(kemikN * kemikN);
      var kemikDoku = alanDokusu(kemikN, kemikTane, function (v, x, y) {
        var i = y * kemikN + x, d = kemikDamar[i], gozenek = v < 0.34 ? Math.min(1, (0.34 - v) * 4) : 0;   // eşik: yalnız en düşük taneler gözenek çukuru (~%6 alan; 0.36/koyu 20 kir benekleri gibi okundu — galeride ölçüldü)
        kemikYuk[i] = 0.5 + (v - 0.5) * 0.2 - gozenek * 0.35 + (d - 0.5) * 0.08;
        var t = Math.min(1, kemikLeke[i] * 0.4 + (d > 0.72 ? (d - 0.72) * 0.6 : 0));          // leke + damar sırtı → koyu sarımsı payı
        var c = karisim([233, 220, 195], [204, 184, 148], t);                                 // #e9dcc3 → #ccb894 (eski kemik sarısı); model kemiği için ikinci rengi #ddd0b4'e çek
        return [c[0] - gozenek * 12, c[1] - gozenek * 12, c[2] - gozenek * 10];               // gözenek dibi hafif gölgeli
      });
      var kemikMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: kemikDoku, metalness: 0, roughness: 0.45,                       // ipeksi: mat plastikten parlak, porselenden (0.12 + clearcoat 1) çok daha mat; 0.5'te parlaklık alçıdan ayrışmıyordu (galeride ölçüldü)
        normalMap: normalHaritasi(kemikN, kemikYuk, 1.4), normalScale: new THREE.Vector2(0.3, 0.3),   // ince gözenek; diyafiz pürüzsüz kalsın
        clearcoat: 0.2, clearcoatRoughness: 0.3, specularIntensity: 0.9, envMapIntensity: 1,    // düşük, bulanık cila: doğal kemik yağı / model verniği — clearcoat 1 + sert speküler porselen yapar
        sheen: 0.15, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xfff3dc)               // sıcak kenar aydınlığı
      });
      var kemikUcMat = kemikMat.clone(); kemikUcMat.roughness = 0.82; kemikUcMat.clearcoat = 0; kemikUcMat.normalScale.set(0.7, 0.7);   // epifiz/eklem ucu ve kesit yüzü: mat, süngerimsi gözenek
    } catch (e) { _hata = e; }
    return { _hata: _hata, alciN: (typeof alciN !== 'undefined' ? alciN : undefined), alciTane: (typeof alciTane !== 'undefined' ? alciTane : undefined), alciDoku: (typeof alciDoku !== 'undefined' ? alciDoku : undefined), alciMat: (typeof alciMat !== 'undefined' ? alciMat : undefined), tebesirRenk: (typeof tebesirRenk !== 'undefined' ? tebesirRenk : undefined), tebesirN: (typeof tebesirN !== 'undefined' ? tebesirN : undefined), tebesirT: (typeof tebesirT !== 'undefined' ? tebesirT : undefined), tebesirDoku: (typeof tebesirDoku !== 'undefined' ? tebesirDoku : undefined), tebesirMat: (typeof tebesirMat !== 'undefined' ? tebesirMat : undefined), kemikN: (typeof kemikN !== 'undefined' ? kemikN : undefined), kemikDoku: (typeof kemikDoku !== 'undefined' ? kemikDoku : undefined), kemikMat: (typeof kemikMat !== 'undefined' ? kemikMat : undefined), kemikUcMat: (typeof kemikUcMat !== 'undefined' ? kemikUcMat : undefined) };
  },
  "zimpara": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var zN = 512;                                                   // 512 px ≈ 6 cm levha parçası (sayfa repeat ile döşer; galeride repeat 1)
      var zTane = gurultuAlani(zN, 144, 144, 131);                    // ~3.5 px'lik tane hücreleri (112 iri mantar/pas gibi okundu — galeride ölçüldü): her hücre bir aşındırıcı tane (yönsüz, döşenebilir)
      var zKirik = gurultuAlani(zN, 224, 224, 137);                   // tane içi kırık faset: keskin köşeli kum görünümü (tek katman yuvarlak «tümsek» yapıyordu)
      var zKume = fbmAlani(zN, 3, 5, 139);                            // geniş, zayıf ton lekesi: tutkal/toz izi; tekdüze levhayı kırar
      var kabaH = new Float32Array(zN * zN);
      var kabaDoku = alanDokusu(zN, zTane, function (v, x, y) {
        var i = y * zN + x, f = zKirik[i], h = Math.pow(v, 1.6) * 0.7 + (f > 0.55 ? (f - 0.55) * 0.9 : 0);   // kesikli eşik: tane tepesi keskin, çukur düz → yükseklik alanı
        kabaH[i] = h;
        var k = Math.min(1, 0.3 + h * 0.8 + (zKume[i] - 0.5) * 0.2), c = karisim([62, 34, 20], [168, 108, 68], k);   // #7a4a2c ekseni: çukur tabanı 0.3'te (tam siyah çukurlar levhayı pas/mantar gibi koyulaştırıyordu — galeride ölçüldü)
        return f > 0.86 ? karisim(c, [222, 182, 138], (f - 0.86) * 5) : c;   // en yüksek fasetler açık «kum pırıltısı» benekleri
      });
      var kabaPuruz = alanDokusu(zN, zKirik, function (v, x, y) { var k = (0.55 + (1 - v) * 0.45) * 255; return [k, k, k]; }, false);   // roughnessMap: faset tepeleri 0.55'e iner → tek tek tane parıltısı («kum pırıltısı»)
      var kabaZimparaMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: kabaDoku, metalness: 0,
        roughness: 1, roughnessMap: kabaPuruz,                        // taban pürüzü haritadan (0.55-1); düz 0.75 tek parça mat plastik gibi kalıyordu
        normalMap: normalHaritasi(zN, kabaH, 3.2), normalScale: new THREE.Vector2(1.0, 1.0),   // keskin tane kabartısı; plastik-opak'taki «strafor» uyarısı burada AMAÇ (levha/şerit, küre değil)
        sheen: 0.45, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xd9b48c),   // eğik ışıkta tane kenarlarında ince parıltı (toz-granül mantığı: düşük sheenRoughness = pırıltı)
        specularIntensity: 0.7, envMapIntensity: 1,
        side: THREE.DoubleSide                                        // ince levha/şerit; arka yüz ayrı yüzeyse kagit-karton kagitMat
      });
      var iTane = gurultuAlani(zN, 208, 208, 151);                    // ~2.5 px tane: gözle seçilmez, kadifemsi
      var iKume = fbmAlani(zN, 2, 8, 153);                           // zayıf, seyrek ton lekesi (3 oktav/0.3 ağırlık keçe-kadife lekesi yapıyordu — galeride ölçüldü)
      var inceH = new Float32Array(zN * zN);
      var inceDoku = alanDokusu(zN, iTane, function (v, x, y) {
        var i = y * zN + x, h = Math.pow(v, 1.3); inceH[i] = h;
        var k = h * 0.6 + (iKume[i] - 0.5) * 0.1 + 0.22;
        return karisim([124, 104, 82], [186, 166, 138], k);           // #a08a70 ekseni: düşük kontrast gri-kahve, hafif tozlu leke
      });
      var inceZimparaMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff, map: inceDoku, metalness: 0, roughness: 0.85,
        normalMap: normalHaritasi(zN, inceH, 1.2), normalScale: new THREE.Vector2(0.3, 0.3),   // ince kabartı: dokunuşta pürüz var, görüntüde neredeyse düz
        sheen: 0.2, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xe0d2bc),   // hafif tozlu-mat kenar (0.3/0.6 + leke kumaş küpü gibi okundu — galeride ölçüldü)
        specularIntensity: 0.6, envMapIntensity: 1, side: THREE.DoubleSide
      });
    } catch (e) { _hata = e; }
    return { _hata: _hata, zN: (typeof zN !== 'undefined' ? zN : undefined), zTane: (typeof zTane !== 'undefined' ? zTane : undefined), zKirik: (typeof zKirik !== 'undefined' ? zKirik : undefined), zKume: (typeof zKume !== 'undefined' ? zKume : undefined), kabaH: (typeof kabaH !== 'undefined' ? kabaH : undefined), kabaDoku: (typeof kabaDoku !== 'undefined' ? kabaDoku : undefined), kabaPuruz: (typeof kabaPuruz !== 'undefined' ? kabaPuruz : undefined), k: (typeof k !== 'undefined' ? k : undefined), kabaZimparaMat: (typeof kabaZimparaMat !== 'undefined' ? kabaZimparaMat : undefined), iTane: (typeof iTane !== 'undefined' ? iTane : undefined), iKume: (typeof iKume !== 'undefined' ? iKume : undefined), inceH: (typeof inceH !== 'undefined' ? inceH : undefined), inceDoku: (typeof inceDoku !== 'undefined' ? inceDoku : undefined), inceZimparaMat: (typeof inceZimparaMat !== 'undefined' ? inceZimparaMat : undefined) };
  },
  "fayans": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var yerKarosuMat = fayansMalzeme('porselen');   // 60×60 orta ton porselen (mat-satine): tezgâh / basamak / podyum yüzeyi → kutuDoku(yerKarosuMat, g, y, d); oda zemini standarttır, reçete odaya verilmez
      var metroFayansMat = fayansMalzeme('metro');    // parlak beyaz 2:1 metro fayansı (laboratuvar / mutfak alt bandı): duvarın 6 mm önünde ayrı Plane → yuzeyDoku(metroFayansMat, g, y, 1, false); oda duvarı standarttır
    } catch (e) { _hata = e; }
    return { _hata: _hata, yerKarosuMat: (typeof yerKarosuMat !== 'undefined' ? yerKarosuMat : undefined), metroFayansMat: (typeof metroFayansMat !== 'undefined' ? metroFayansMat : undefined) };
  },
  "mermer": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var mermerZeminMat = mermerMalzeme('beyaz', { karo: 2 });   // 2×2 derzli Carrara karo (karo 1,2 birim ≈ 40 cm): tezgâh üstü / levha / podyum → kutuDoku(mermerZeminMat, g, y, d); oda zemini standarttır; 'bej' (traverten)
      var mermerLevhaMat = mermerMalzeme('beyaz');                // TEK LEVHA (derzsiz): tezgâh, masa tablası, kaide, sütun, heykel → kutuDoku / silindirDoku ile; aynı sahnede ikinci nesneye tohum: mermerMalzeme('beyaz', { tohum: 2 })
      var matMermerMat = mermerMalzeme('bej', { cila: 'mat' });   // honlanmış (mat) bej: eski bina merdiveni, taş görünümlü kaide, banyo duvarı
    } catch (e) { _hata = e; }
    return { _hata: _hata, mermerZeminMat: (typeof mermerZeminMat !== 'undefined' ? mermerZeminMat : undefined), mermerLevhaMat: (typeof mermerLevhaMat !== 'undefined' ? mermerLevhaMat : undefined), matMermerMat: (typeof matMermerMat !== 'undefined' ? matMermerMat : undefined) };
  },
  "mozaik": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var mozaikMat = mozaikMalzeme('gri');       // gri çimento + siyah-beyaz-bej kırıntı, 2×2 dökme plaka: basamak / sahanlık platformu → kutuDoku(mozaikMat, g, y, d); oda zemini standarttır
      var terrazzoMat = mozaikMalzeme('renkli');  // Venedik terrazzo: açık zemin, iri renkli kırıntı (kafe, müze, lobi); mozaikMalzeme('krem') sıcak krem-kahve
    } catch (e) { _hata = e; }
    return { _hata: _hata, mozaikMat: (typeof mozaikMat !== 'undefined' ? mozaikMat : undefined), terrazzoMat: (typeof terrazzoMat !== 'undefined' ? terrazzoMat : undefined) };
  },
  "parke": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var parkeMat = parkeMalzeme('kayin', 'vernik');        // açık kayın laminat, şaşırtmalı tahtalar: podyum / sahne platformu / dolap gövdesi → kutuDoku(parkeMat, g, y, d); oda zemini standarttır (laminatı oda kendisi döşer)
      var husParkeMat = parkeMalzeme('hus', 'mat', 2);      // çok açık krem huş; 'cam' sarımsı çam (kulübe), 'bambu' — ZEMİN HEP AÇIK TON (koyu tür istenirse kayına döner); 3. parametre tohum: farklı döşeme deseni
    } catch (e) { _hata = e; }
    return { _hata: _hata, parkeMat: (typeof parkeMat !== 'undefined' ? parkeMat : undefined), husParkeMat: (typeof husParkeMat !== 'undefined' ? husParkeMat : undefined) };
  },
  "hali": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var haliMat = haliMalzeme('#c9c1b3');   // DUVARDAN DUVARA halı (sınıf, ofis, oyun köşesi): açık bej-gri; renk açık ton ('#c7cfd6' gri-mavi, '#c9d3bf' yeşil) — koyu renk açığa kaldırılır → halı PARÇASI: zeminin 2 mm üstünde ince Plane, yuzeyDoku(haliMat, g, d, 1); oda zemini standarttır
      function kilimDoku(w, h, renkler) {   // BORDÜRLÜ KİLİM (tek parça, DÖŞENMEZ): kenar bordürü + yatay renkli bantlar + zikzak üçgenler; w×h piksel oranı halının oranı; ClampToEdge → otoOlcek dokunmaz
        var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d'), P = renkler || ['#8d2f2a', '#e0c488', '#2f4a6b', '#c8873a', '#f0e6d2'], b = Math.round(Math.min(w, h) * 0.07);
        g.fillStyle = P[0]; g.fillRect(0, 0, w, h); g.fillStyle = P[4]; g.fillRect(b, b, w - 2 * b, h - 2 * b);
        var bant = (h - 4 * b) / 7;
        for (var i = 0; i < 7; i++) { var y = 2 * b + i * bant; g.fillStyle = P[1 + (i % 3)]; g.fillRect(2 * b, y, w - 4 * b, bant);
          if (i % 2) { g.fillStyle = P[4]; var uc = bant * 0.8; for (var x = 2 * b; x < w - 2 * b - 1; x += uc) { g.beginPath(); g.moveTo(x, y + bant); g.lineTo(x + uc / 2, y + bant - uc * 0.7); g.lineTo(Math.min(x + uc, w - 2 * b), y + bant); g.closePath(); g.fill(); } } }
        var img = g.getImageData(0, 0, w, h), d = img.data, N = 256, tn = gurultuAlani(N, 64, 64, 311);   // hav tanesi
        for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) { var k = (tn[(yy % N) * N + (xx % N)] - 0.5) * 22, i2 = (yy * w + xx) * 4; d[i2] += k; d[i2 + 1] += k; d[i2 + 2] += k; } g.putImageData(img, 0, 0);
        var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
      }
      var kilimMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: kilimDoku(768, 512), metalness: 0, roughness: 1, sheen: 0.5, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xd9c9a8) });
      kilimMat.normalMap = normalDokusu(kilimMat.map, 0.8); kilimMat.normalScale = new THREE.Vector2(0.3, 0.3);   // desen kenarı hafif kabartı
      var kilim = new THREE.Mesh(new THREE.PlaneGeometry(3, 2), kilimMat); kilim.rotation.x = -Math.PI / 2; kilim.position.y = 0.006; kilim.receiveShadow = true;   // zeminin 6 mm üstünde (eş düzlem yok); Plane oranı doku oranıyla aynı (3:2)
    } catch (e) { _hata = e; }
    return { _hata: _hata, haliMat: (typeof haliMat !== 'undefined' ? haliMat : undefined), kilimDoku: (typeof kilimDoku !== 'undefined' ? kilimDoku : undefined), kilimMat: (typeof kilimMat !== 'undefined' ? kilimMat : undefined), kilim: (typeof kilim !== 'undefined' ? kilim : undefined) };
  },
  "duvar-kagidi": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var cizgiliKagitMat = duvarKagidiMalzeme('cizgi');                            // klasik dikey bantlı (bej): pano / bölme duvar / dolap arkası → yuzeyDoku(cizgiliKagitMat, g, y, 1, false); oda duvarı standarttır
      var baklavaKagitMat = duvarKagidiMalzeme('baklava', '#e4e8ea', '#9fb2bb');   // geometrik baklava kafesi; zemin/desen '#hex' paletten (pastel zemin + iki ton koyu desen)
      var yaprakliKagitMat = duvarKagidiMalzeme('yaprak');                          // botanik yaprak dalı (çocuk odası, sınıf); duvarKagidiMalzeme('duz') düz dokulu vinil
    } catch (e) { _hata = e; }
    return { _hata: _hata, cizgiliKagitMat: (typeof cizgiliKagitMat !== 'undefined' ? cizgiliKagitMat : undefined), baklavaKagitMat: (typeof baklavaKagitMat !== 'undefined' ? baklavaKagitMat : undefined), yaprakliKagitMat: (typeof yaprakliKagitMat !== 'undefined' ? yaprakliKagitMat : undefined) };
  },
  "duvar-boya": function (sec) {
    sec = sec || {}; var scene = sec.scene, camera = sec.camera, _hata = null;
    try {
      var duvarGenisligi = 14, duvarZ = -5;   // standart odanın arka duvarı z = -5 (derinlik 10), genişlik 14 — pano/bölme bu düzlemin 6 mm önüne
      var boyaDoku = gurultuDoku(512, '#d9d3c6', 0.3, 2);   // MAT PLASTİK BOYA: ince rulo tanesi; renk pastel (bej #d9d3c6, açık gri-yeşil #d6dedd, krem #e4dccd, açık mavi #d3dde6). Oda duvarı standart sıva-boyadır ve değiştirilmez; bu malzeme pano, bölme duvar, dolap arkası içindir
      var boyaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: boyaDoku, roughness: 0.92, metalness: 0,
        normalMap: normalDokusu(boyaDoku, 0.6), normalScale: new THREE.Vector2(0.3, 0.3) });
      var yagliBoyaMat = new THREE.MeshPhysicalMaterial({ color: 0x9fb8a6, metalness: 0, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25,
        bumpMap: gurultuDoku(256, '#888', 0.4, 1, false), bumpScale: 0.002, envMapIntensity: 0.8 });   // YAĞLI BOYA ALT BANT (okul, koridor, laboratuvar: yerden ~1,2 m yarı parlak): yeşil 0x9fb8a6, mavi 0x9db4c4, bej 0xd2c2a4
      var altBant = new THREE.Mesh(new THREE.PlaneGeometry(duvarGenisligi, 3.6), yagliBoyaMat); altBant.position.set(0, 1.8, duvarZ + 0.006); altBant.receiveShadow = true;   // duvarın 6 mm önünde (eş düzlem yok); üst kenarına koyu çıta: BoxGeometry(duvarGenisligi, 0.05, 0.02) y = 3.6
    } catch (e) { _hata = e; }
    return { _hata: _hata, duvarGenisligi: (typeof duvarGenisligi !== 'undefined' ? duvarGenisligi : undefined), duvarZ: (typeof duvarZ !== 'undefined' ? duvarZ : undefined), boyaDoku: (typeof boyaDoku !== 'undefined' ? boyaDoku : undefined), boyaMat: (typeof boyaMat !== 'undefined' ? boyaMat : undefined), yagliBoyaMat: (typeof yagliBoyaMat !== 'undefined' ? yagliBoyaMat : undefined), altBant: (typeof altBant !== 'undefined' ? altBant : undefined) };
  },
};
var _RECETE_ESADLAR = {"dan": "cam", "lar": "cam", "mercek": "cam", "prizma": "cam", "bilye": "cam", "cam blok": "cam", "kristal küre": "cam", "vitrin": "cam", "cam çubuk": "cam", "cam cubuk": "cam", "baget": "cam", "ampul": "cam-kabuk", "beher": "cam-kabuk", "bardak": "cam-kabuk", "şişe": "cam-kabuk", "sise": "cam-kabuk", "deney tüp": "cam-kabuk", "erlen": "cam-kabuk", "fanus": "cam-kabuk", "kavanoz": "cam-kabuk", "akvaryum": "cam-kabuk", "pencere": "cam-kabuk", "cam kabuk": "cam-kabuk", "cam kubbe": "cam-kabuk", "cam balon": "cam-kabuk", "termometre": "cam-kabuk", "cam tüp": "cam-kabuk", "cam tup": "cam-kabuk", "deniz": "su-yuzeyi", "den": "su-yuzeyi", "havuz": "su-yuzeyi", "nehir": "su-yuzeyi", "ırmak": "su-yuzeyi", "nin": "su-yuzeyi", "okyanus": "su-yuzeyi", "dalga": "su-yuzeyi", "kova": "su-yuzeyi", "leğen": "su-yuzeyi", "baraj": "su-yuzeyi", "şelale": "su-yuzeyi", "çözelti": "sivi-kapta", "cozelti": "sivi-kapta", "sıvı": "sivi-kapta", "meyve suyu": "sivi-kapta", "şurup": "sivi-kapta", "kimyasal": "sivi-kapta", "reaktif": "sivi-kapta", "karışım": "sivi-kapta", "karisim": "sivi-kapta", "iyot": "sivi-kapta", "biüret": "sivi-kapta", "biuret": "sivi-kapta", "ayıraç": "sivi-kapta", "ayirac": "sivi-kapta", "indikatör": "sivi-kapta", "indikator": "sivi-kapta", "lahana suyu": "sivi-kapta", "buzul": "buz", "kırağı": "buz", "kar tanesi": "buz", "donmuş": "buz", "donmus": "buz", "surup": "bal-jel", "jöle": "bal-jel", "jole": "bal-jel", "reçine": "bal-jel", "recine": "bal-jel", "zeytinyağ": "bal-jel", "yağ tabaka": "bal-jel", "sakız": "bal-jel", "pekmez": "bal-jel", "kehribar": "bal-jel", "sıvı yağ": "bal-jel", "sivi yag": "bal-jel", "ayçiçek yağ": "bal-jel", "aycicek yag": "bal-jel", "parafin": "bal-jel", "balmumu": "bal-jel", "sabun köpü": "sabun-kopugu", "sabun kopu": "sabun-kopugu", "köpük film": "sabun-kopugu", "kopuk film": "sabun-kopugu", "köpük baloncu": "sabun-kopugu", "kopuk baloncu": "sabun-kopugu", "baloncuk": "sabun-kopugu", "yağ film": "sabun-kopugu", "petrol film": "sabun-kopugu", "yanardöner": "sabun-kopugu", "yanardoner": "sabun-kopugu", "böcek kanad": "sabun-kopugu", "kelebek": "sabun-kopugu", "petrol sızıntı": "sabun-kopugu", "petrol sizinti": "sabun-kopugu", "elmas": "kristal", "kristal": "kristal", "kuvars": "kristal", "safir": "kristal", "zümrüt": "kristal", "zumrut": "kristal", "yakut": "kristal", "mücevher": "kristal", "mucevher": "kristal", "mineral": "kristal", "pırlanta": "kristal", "pirlanta": "kristal", "tuz kristal": "kristal", "şeker kristal": "kristal", "pleksi": "plastik-seffaf", "akrilik": "plastik-seffaf", "pet şişe": "plastik-seffaf", "pet sise": "plastik-seffaf", "pipet": "plastik-seffaf", "saydam plastik": "plastik-seffaf", "şeffaf plastik": "plastik-seffaf", "seffaf plastik": "plastik-seffaf", "koruyucu gözlük": "plastik-seffaf", "streç": "plastik-seffaf", "selofan": "plastik-seffaf", "jelatin": "plastik-seffaf", "renk filtre": "plastik-seffaf", "sera örtü": "plastik-seffaf", "sera ortu": "plastik-seffaf", "pleksi kubbe": "plastik-seffaf", "çelik": "metal-parlak", "celik": "metal-parlak", "krom": "metal-parlak", "gümüş": "metal-parlak", "gumus": "metal-parlak", "alüminyum": "metal-parlak", "aluminyum": "metal-parlak", "musluk": "metal-parlak", "çatal": "metal-parlak", "bıçak": "metal-parlak", "kaşık": "metal-parlak", "paslanmaz": "metal-parlak", "parlak metal": "metal-parlak", "folyo": "metal-parlak", "ataş": "metal-parlak", "madeni para": "metal-parlak", "cıva": "metal-parlak", "helezon": "metal-parlak", "slinki": "metal-parlak", "diyapazon": "metal-parlak", "teneke": "metal-parlak", "içecek kutu": "metal-parlak", "icecek kutu": "metal-parlak", "konserve": "metal-parlak", "magnezyum": "metal-parlak", "silisyum": "metal-parlak", "krokodil": "metal-parlak", "demir": "metal-mat", "dökme": "metal-mat", "dokme": "metal-mat", "titanyum": "metal-mat", "kurşun": "metal-mat", "kursun": "metal-mat", "kalay": "metal-mat", "çinko": "metal-mat", "cinko": "metal-mat", "mat metal": "metal-mat", "metal gövde": "metal-mat", "makine gövde": "metal-mat", "motor blok": "metal-mat", "dişli": "metal-mat", "disli": "metal-mat", "vida": "metal-mat", "cıvata": "metal-mat", "civata": "metal-mat", "somun": "metal-mat", "kütle seti": "metal-mat", "kutle seti": "metal-mat", "çivi": "metal-mat", "sacayak": "metal-mat", "tel kafes": "metal-mat", "ispirto": "metal-mat", "nikrom": "metal-mat", "direnç tel": "metal-mat", "direnc tel": "metal-mat", "reosta": "metal-mat", "makara": "metal-mat", "altın": "altin-bakir", "altin": "altin-bakir", "bakır": "altin-bakir", "bakir": "altin-bakir", "pirinç": "altin-bakir", "pirinc": "altin-bakir", "bronz": "altin-bakir", "tunç": "altin-bakir", "tunc": "altin-bakir", "bobin": "altin-bakir", "sarım": "altin-bakir", "sarim": "altin-bakir", "madalya": "altin-bakir", "sikke": "altin-bakir", "kablo": "altin-bakir", "elektroskop": "altin-bakir", "uydu kaplama": "altin-bakir", "yalıtım kaplama": "altin-bakir", "yalitim kaplama": "altin-bakir", "hurda": "pasli-metal", "oksit": "pasli-metal", "patina": "pasli-metal", "eski boru": "pasli-metal", "çürümüş metal": "pasli-metal", "zincir": "pasli-metal", "ahşap": "ahsap", "ahsap": "ahsap", "tahta": "ahsap", "kütük": "ahsap", "kutuk": "ahsap", "kalas": "ahsap", "kereste": "ahsap", "sandalye": "ahsap", "mobilya": "ahsap", "dolap": "ahsap", "ağaç gövde": "ahsap", "agac govde": "ahsap", "kontrplak": "ahsap", "meşe": "ahsap", "ceviz": "ahsap", "kayın": "ahsap", "kayin": "ahsap", "huş": "ahsap", "maun": "ahsap", "kiraz": "ahsap", "abanoz": "ahsap", "bambu": "ahsap", "dil çubuğ": "ahsap", "dil cubug": "ahsap", "plastik": "plastik-opak", "oyuncak": "plastik-opak", "klavye": "plastik-opak", "ambalaj": "plastik-opak", "lego": "plastik-opak", "bidon": "plastik-opak", "boyalı metal": "plastik-opak", "boyali metal": "plastik-opak", "emaye": "plastik-opak", "kaporta": "plastik-opak", "cetvel": "plastik-opak", "tarak": "plastik-opak", "türbin": "plastik-opak", "turbin": "plastik-opak", "rüzgar gül": "plastik-opak", "ruzgar gul": "plastik-opak", "varil": "plastik-opak", "lastik": "kaucuk", "kauçuk": "kaucuk", "kaucuk": "kaucuk", "tekerlek": "kaucuk", "kablo kılıf": "kaucuk", "silgi": "kaucuk", "conta": "kaucuk", "hortum": "kaucuk", "paket lastiğ": "kaucuk", "paket lastig": "kaucuk", "lastik bant": "kaucuk", "ebonit": "kaucuk", "lastik top": "kaucuk", "seramik": "seramik", "porselen": "seramik", "fincan": "seramik", "tabak": "seramik", "lavabo": "seramik", "çömlek": "seramik", "comlek": "seramik", "vazo": "seramik", "sırlı": "seramik", "sirli": "seramik", "saksı": "seramik", "saksi": "seramik", "terracotta": "seramik", "pişmiş toprak": "seramik", "pismis toprak": "seramik", "apartman": "bina-cephe", "gökdelen": "bina-cephe", "gokdelen": "bina-cephe", "şehir": "bina-cephe", "sehir": "bina-cephe", "maket": "bina-cephe", "cephe": "bina-cephe", "blok apartman": "bina-cephe", "kule": "bina-cephe", "döşeme": "zemin-sade", "doseme": "zemin-sade", "laboratuvar zemin": "zemin-sade", "sınıf zemin": "zemin-sade", "stüdyo": "zemin-sade", "studyo": "zemin-sade", "deney masası alanı": "zemin-sade", "kaya": "tas-beton", "beton": "tas-beton", "tuğla": "tas-beton", "tugla": "tas-beton", "kaldırım": "tas-beton", "kaldirim": "tas-beton", "granit": "tas-beton", "çakıl": "tas-beton", "cakil": "tas-beton", "mağara": "tas-beton", "magara": "tas-beton", "kumtaşı": "tas-beton", "kumtasi": "tas-beton", "kayaç": "tas-beton", "kayac": "tas-beton", "cevher": "tas-beton", "soğutma kule": "tas-beton", "sogutma kule": "tas-beton", "kireçtaş": "tas-beton", "kirectas": "tas-beton", "toprak": "toprak-zemin", "kumsal": "toprak-zemin", "sahil": "toprak-zemin", "plaj": "toprak-zemin", "ler": "toprak-zemin", "çayır": "toprak-zemin", "cayir": "toprak-zemin", "çamur": "toprak-zemin", "camur": "toprak-zemin", "bahçe zemin": "toprak-zemin", "orman zemin": "toprak-zemin", "humus": "toprak-zemin", "kompost": "toprak-zemin", "saksı toprağ": "toprak-zemin", "saksi toprag": "toprak-zemin", "yeşil çatı": "toprak-zemin", "yesil cati": "toprak-zemin", "dikey bahçe": "toprak-zemin", "dikey bahce": "toprak-zemin", "kumaş": "kumas-deri", "kumas": "kumas-deri", "kadife": "kumas-deri", "yün": "kumas-deri", "keten": "kumas-deri", "perde": "kumas-deri", "koltuk": "kumas-deri", "yastık": "kumas-deri", "yastik": "kumas-deri", "giysi": "kumas-deri", "kıyafet": "kumas-deri", "tişört": "kumas-deri", "keçe": "kumas-deri", "kece": "kumas-deri", "ipek": "kumas-deri", "battaniye": "kumas-deri", "kağıt": "kagit-karton", "kagit": "kagit-karton", "karton": "kagit-karton", "defter": "kagit-karton", "kitap": "kagit-karton", "poster": "kagit-karton", "zarf": "kagit-karton", "koli": "kagit-karton", "süzgeç kağıd": "kagit-karton", "suzgec kagid": "kagit-karton", "filtre kağıd": "kagit-karton", "filtre kagid": "kagit-karton", "turnusol": "kagit-karton", "ph kagid": "kagit-karton", "gazete": "kagit-karton", "mukavva": "kagit-karton", "oluklu": "kagit-karton", "viyol": "kagit-karton", "organ": "organik", "akciğer": "organik", "akciger": "organik", "mide": "organik", "böbrek": "organik", "bobrek": "organik", "karaciğer": "organik", "beyin": "organik", "deri doku": "organik", "cilt": "organik", "hücre": "organik", "hucre": "organik", "yaprak": "organik", "meyve": "organik", "sebze": "organik", "elma": "organik", "domates": "organik", "bitki": "organik", "çiçek": "organik", "cicek": "organik", "damar": "organik", "ekmek": "organik", "patates": "organik", "yumurta": "organik", "peynir": "organik", "tereyağ": "organik", "tereyag": "organik", "çikolata": "organik", "cikolata": "organik", "meyve kabuğ": "organik", "meyve kabug": "organik", "organik atık": "organik", "organik atik": "organik", "çürük": "organik", "curuk": "organik", "parçacık": "model-nesnesi", "parcacik": "model-nesnesi", "elektron": "model-nesnesi", "proton": "model-nesnesi", "nötron": "model-nesnesi", "notron": "model-nesnesi", "molekül": "model-nesnesi", "molekul": "model-nesnesi", "demir toz": "model-nesnesi", "tozlar": "model-nesnesi", "nokta yük": "model-nesnesi", "test yük": "model-nesnesi", "hayalet": "hayalet-hacim", "silüet": "hayalet-hacim", "siluet": "hayalet-hacim", "sanal hacim": "hayalet-hacim", "etki alanı": "hayalet-hacim", "etki alani": "hayalet-hacim", "bölge göstergesi": "hayalet-hacim", "bolge gostergesi": "hayalet-hacim", "ortam blo": "hayalet-hacim", "kabin hac": "hayalet-hacim", "görünmez duvar": "hayalet-hacim", "gorunmez duvar": "hayalet-hacim", "neon": "isiyan", "ekran": "isiyan", "monitör": "isiyan", "monitor": "isiyan", "lamba": "isiyan", "magma": "isiyan", "pil": "isiyan", "enerji": "isiyan", "santral": "isiyan", "yıldız": "isiyan", "yildiz": "isiyan", "alev": "isiyan", "ateş": "isiyan", "ates": "isiyan", "lazer": "isiyan", "parlayan": "isiyan", "ışıyan": "isiyan", "isiyan": "isiyan", "floresan": "isiyan", "flaman": "isiyan", "kızaran": "isiyan", "kizaran": "isiyan", "argon": "isiyan", "helyum": "isiyan", "soy gaz": "isiyan", "yansıma": "ayna", "yansima": "ayna", "yansıt": "ayna", "reflekt": "ayna", "çukur": "ayna", "cukur": "ayna", "tümsek": "ayna", "tumsek": "ayna", "iç bükey": "ayna", "ic bukey": "ayna", "dış bükey": "ayna", "dis bukey": "ayna", "anakart": "pcb-elektronik", "devre kart": "pcb-elektronik", "yonga": "pcb-elektronik", "işlemci": "pcb-elektronik", "islemci": "pcb-elektronik", "kondansatör": "pcb-elektronik", "kondansator": "pcb-elektronik", "direnç": "pcb-elektronik", "direnc": "pcb-elektronik", "transistör": "pcb-elektronik", "transistor": "pcb-elektronik", "sensör kart": "pcb-elektronik", "gökyüzü": "atmosfer", "gokyuzu": "atmosfer", "ufuk": "atmosfer", "bulut": "atmosfer", "uzay": "atmosfer", "yıldızlı": "atmosfer", "yildizli": "atmosfer", "güneş batımı": "atmosfer", "gun batimi": "atmosfer", "şafak": "atmosfer", "safak": "atmosfer", "atmosfer": "atmosfer", "gezegen": "gezegen", "güneş sistemi": "gezegen", "gunes sistemi": "gezegen", "jüpiter": "gezegen", "jupiter": "gezegen", "satürn": "gezegen", "saturn": "gezegen", "merkür": "gezegen", "merkur": "gezegen", "venüs": "gezegen", "venus": "gezegen", "uranüs": "gezegen", "uranus": "gezegen", "neptün": "gezegen", "neptun": "gezegen", "plüton": "gezegen", "pluton": "gezegen", "dünya küresi": "gezegen", "dunya kuresi": "gezegen", "dünya modeli": "gezegen", "dunya modeli": "gezegen", "ay modeli": "gezegen", "ay yüzeyi": "gezegen", "tutulma": "gezegen", "asfalt": "asfalt", "cadde": "asfalt", "otopark": "asfalt", "otoyol": "asfalt", "karayolu": "asfalt", "bisiklet yolu": "asfalt", "yol şeridi": "asfalt", "yol seridi": "asfalt", "yol yüzeyi": "asfalt", "yol yuzeyi": "asfalt", "şerit boya": "asfalt", "serit boya": "asfalt", "sürtünme pisti": "asfalt", "surtunme pisti": "asfalt", "asfalt pist": "asfalt", "köpük blok": "sunger", "kopuk blok": "sunger", "köpük panel": "sunger", "kopuk panel": "sunger", "akustik köpü": "sunger", "akustik kopu": "sunger", "yalıtım köpü": "sunger", "yalitim kopu": "sunger", "poliüretan": "sunger", "poliuretan": "sunger", "ses soğurucu": "sunger", "ses sogurucu": "sunger", "strafor": "strafor", "polistiren": "strafor", "köpük top": "strafor", "kopuk top": "strafor", "köpük küre": "strafor", "kopuk kure": "strafor", "köpük levha": "strafor", "kopuk levha": "strafor", "köpük tabak": "strafor", "kopuk tabak": "strafor", "köpük bardak": "strafor", "kopuk bardak": "strafor", "köpük kutu": "strafor", "kopuk kutu": "strafor", "köpük ambalaj": "strafor", "kopuk ambalaj": "strafor", "yalıtım levha": "strafor", "yalitim levha": "strafor", "oyun hamuru": "hamur-kil", "model hamuru": "hamur-kil", "killi toprak": "hamur-kil", "kil çamur": "hamur-kil", "kil camur": "hamur-kil", "çömlek çamur": "hamur-kil", "comlek camur": "hamur-kil", "kil yatağ": "hamur-kil", "kil yatag": "hamur-kil", "kil kalıb": "hamur-kil", "kil kalib": "hamur-kil", "fosil kalıb": "hamur-kil", "fosil kalib": "hamur-kil", "plastilin": "hamur-kil", "ları": "toz-granul", "tuz yığın": "toz-granul", "tuz yigin": "toz-granul", "tuz kabuğ": "toz-granul", "tuz kabug": "toz-granul", "leme": "toz-granul", "nişasta": "toz-granul", "nisasta": "toz-granul", "taş": "toz-granul", "kemik": "toz-granul", "kükürt": "toz-granul", "kukurt": "toz-granul", "pudra": "toz-granul", "toz yığın": "toz-granul", "toz yigin": "toz-granul", "toz tepe": "toz-granul", "granül": "toz-granul", "granul": "toz-granul", "kesme şeker": "toz-granul", "kesme seker": "toz-granul", "buzlu cam": "yari-saydam", "buzlucam": "yari-saydam", "kumlanmış cam": "yari-saydam", "kumlanmis cam": "yari-saydam", "mat cam": "yari-saydam", "opal cam": "yari-saydam", "opal kubbe": "yari-saydam", "opal ampul": "yari-saydam", "süt beyazı": "yari-saydam", "sut beyazi": "yari-saydam", "yağlı kağı": "yari-saydam", "yagli kagi": "yari-saydam", "aydınger": "yari-saydam", "aydinger": "yari-saydam", "levha": "yari-saydam", "film": "yari-saydam", "kubbe": "yari-saydam", "zar": "yari-saydam", "yarısaydam": "yari-saydam", "yarisaydam": "yari-saydam", "naylon poşet": "yari-saydam", "naylon poset": "yari-saydam", "naylon torba": "yari-saydam", "naylon film": "yari-saydam", "naylon örtü": "yari-saydam", "naylon ortu": "yari-saydam", "poşet": "yari-saydam", "poset": "yari-saydam", "streç film": "yari-saydam", "strec film": "yari-saydam", "led ampul": "yari-saydam", "tasarruflu ampul": "yari-saydam", "abajur": "yari-saydam", "iğne deliği ekran": "yari-saydam", "igne deligi ekran": "yari-saydam", "kömür": "komur-grafit", "komur": "komur-grafit", "antrasit": "komur-grafit", "linyit": "komur-grafit", "briket": "komur-grafit", "obsidyen": "komur-grafit", "grafit": "komur-grafit", "kalem ucu": "komur-grafit", "kurşun kalem uc": "komur-grafit", "kursun kalem uc": "komur-grafit", "kül yığın": "komur-grafit", "kul yigin": "komur-grafit", "mıknatıs": "miknatis", "miknatis": "miknatis", "magnet": "miknatis", "neodim": "miknatis", "ferrit": "miknatis", "elektromıknatıs": "miknatis", "elektromiknatis": "miknatis", "at nalı": "miknatis", "at nali": "miknatis", "zıt kutup": "miknatis", "zit kutup": "miknatis", "aynı kutup": "miknatis", "ayni kutup": "miknatis", "reng": "miknatis", "yüz": "miknatis", "mıknatıslı": "miknatis", "miknatisli": "miknatis", "duman": "buhar-duman", "tabaka": "buhar-duman", "kara": "buhar-duman", "tütsü": "buhar-duman", "egzoz": "buhar-duman", "bacadan": "buhar-duman", "bacalar": "buhar-duman", "kaynayan": "buhar-duman", "kaynama buhar": "buhar-duman", "benmari": "buhar-duman", "kuru buz": "buhar-duman", "tepkime gaz": "buhar-duman", "sis sütun": "buhar-duman", "sis sutun": "buhar-duman", "güneş panel": "gunes-paneli", "gunes panel": "gunes-paneli", "güneş pil": "gunes-paneli", "gunes pil": "gunes-paneli", "fotovoltaik": "gunes-paneli", "pv panel": "gunes-paneli", "güneş enerjisi panel": "gunes-paneli", "gunes enerjisi panel": "gunes-paneli", "güneş enerjili": "gunes-paneli", "gunes enerjili": "gunes-paneli", "güneş santral": "gunes-paneli", "gunes santral": "gunes-paneli", "güneş hücre": "gunes-paneli", "gunes hucre": "gunes-paneli", "güneş tarla": "gunes-paneli", "gunes tarla": "gunes-paneli", "lateks": "balon", "helyum balon": "balon", "mantar tıpa": "mantar", "mantar tipa": "mantar", "mantar levha": "mantar", "mantar pano": "mantar", "şişe mantar": "mantar", "sise mantar": "mantar", "elyaf": "pamuk-elyaf", "yün tutam": "pamuk-elyaf", "yun tutam": "pamuk-elyaf", "yün yumağ": "pamuk-elyaf", "yun yumag": "pamuk-elyaf", "yün yumak": "pamuk-elyaf", "yun yumak": "pamuk-elyaf", "yumağ": "pamuk-elyaf", "vatka": "pamuk-elyaf", "yun": "pamuk-elyaf", "pamuk": "pamuk-elyaf", "lif dolgu": "pamuk-elyaf", "kuru yün": "pamuk-elyaf", "kuru yun": "pamuk-elyaf", "ham yün": "pamuk-elyaf", "ham yun": "pamuk-elyaf", "urgan": "halat-ip", "sicim": "halat-ip", "kırnap": "halat-ip", "kirnap": "halat-ip", "kendir": "halat-ip", "jüt": "halat-ip", "alci döküm": "alci-kemik", "alci dokum": "alci-kemik", "alci kalıp": "alci-kemik", "alci kalip": "alci-kemik", "tebeşir": "alci-kemik", "tebesir": "alci-kemik", "iskelet": "alci-kemik", "kafatas": "alci-kemik", "omurga": "alci-kemik", "kaburga": "alci-kemik", "fildiş": "alci-kemik", "fildis": "alci-kemik", "yumurta kabuğ": "alci-kemik", "yumurta kabug": "alci-kemik", "deniz kabuğ": "alci-kemik", "deniz kabug": "alci-kemik", "salyangoz kabuğ": "alci-kemik", "salyangoz kabug": "alci-kemik", "midye kabuğ": "alci-kemik", "midye kabug": "alci-kemik", "istiridye": "alci-kemik", "kalker": "alci-kemik", "zımpara": "zimpara", "zimpara": "zimpara", "aşındırıcı": "zimpara", "asindirici": "zimpara", "pürüzlü bant": "zimpara", "puruzlu bant": "zimpara", "zımpara kağıdı": "zimpara", "zimpara kagidi": "zimpara", "karo zemin": "fayans", "karo döşeme": "fayans", "karo doseme": "fayans", "yer karosu": "fayans", "metro fayans": "fayans", "fayans": "fayans", "seramik zemin": "fayans", "seramik kaplama": "fayans", "banyo duvar": "fayans", "mutfak duvar": "fayans", "mermer": "mermer", "carrara": "mermer", "traverten": "mermer", "oniks": "mermer", "mermer karo": "mermer", "mermer zemin": "mermer", "mermer tezg": "mermer", "heykel kaide": "mermer", "mozaik": "mozaik", "terrazzo": "mozaik", "terrazo": "mozaik", "dökme mozaik": "mozaik", "dokme mozaik": "mozaik", "okul koridor": "mozaik", "koridor zemin": "mozaik", "sahanlık": "mozaik", "sahanlik": "mozaik", "parke": "parke", "laminat": "parke", "tahta döşeme": "parke", "tahta doseme": "parke", "ahşap zemin": "parke", "ahsap zemin": "parke", "tahta zemin": "parke", "ahşap döşeme": "parke", "ahsap doseme": "parke", "zemin tahtası": "parke", "zemin tahtasi": "parke", "kilim": "hali", "paspas": "hali", "halıfleks": "hali", "halifleks": "hali", "oyun halı": "hali", "oyun hali": "hali", "keçe zemin": "hali", "kece zemin": "hali", "halı zemin": "hali", "hali zemin": "hali", "duvar kağıd": "duvar-kagidi", "duvar kagid": "duvar-kagidi", "duvarkağıd": "duvar-kagidi", "duvarkagid": "duvar-kagidi", "desenli duvar": "duvar-kagidi", "çizgili duvar": "duvar-kagidi", "cizgili duvar": "duvar-kagidi", "çiçekli duvar": "duvar-kagidi", "cicekli duvar": "duvar-kagidi", "kağıt kaplı duvar": "duvar-kagidi", "boyalı duvar": "duvar-boya", "boyali duvar": "duvar-boya", "plastik boya": "duvar-boya", "yağlı boya": "duvar-boya", "yagli boya": "duvar-boya", "sıva duvar": "duvar-boya", "siva duvar": "duvar-boya", "sıvalı duvar": "duvar-boya", "sivali duvar": "duvar-boya", "alt bant": "duvar-boya", "lambri": "duvar-boya", "bölme duvar": "duvar-boya", "bolme duvar": "duvar-boya", "okul duvar": "duvar-boya", "sınıf duvar": "duvar-boya", "sinif duvar": "duvar-boya"};
function _receteAdi(kimlik) {
  kimlik = String(kimlik || '').toLowerCase().trim(); if (!kimlik) return null;
  if (_RECETELER[kimlik]) return kimlik;
  var e = _RECETE_ESADLAR[kimlik]; if (e && _RECETELER[e]) return e;
  if (kimlik.indexOf('ahsap') === 0 && _RECETELER['ahsap']) return 'ahsap';   // ahsap-ceviz gibi tür ekleri
  for (var ad in _RECETELER) if (kimlik.indexOf(ad) === 0 || ad.indexOf(kimlik) === 0) return ad;
  return null;
}
function recete(kimlik, sec) {   // HAZIR REÇETE (14.10): reçetenin bütün değişkenleri {ad: değer, _hata}; kimlik bilinmiyorsa null. sec: {scene, camera, <yer tutucu değerleri>}
  var ad = _receteAdi(kimlik); if (!ad) { console.warn('MALZEME3B.recete: kimlik yok —', kimlik); return null; }
  try { return _RECETELER[ad](sec || {}); } catch (e) { console.warn('MALZEME3B.recete', ad, e); return { _hata: e }; }
}
function malzeme(kimlik, sec) {   // HAZIR MALZEME (14.10): reçetenin ANA malzemesi (ilk THREE malzemesi; yoksa malzeme dizisi); bilinmiyorsa null — ajan reçete metni yazmaz, çağırır
  var o = recete(kimlik, sec); if (!o) return null;
  for (var k in o) { if (k !== '_hata') { var v = o[k]; if (v && v.isMaterial) return v; } }
  for (var k2 in o) { var v2 = o[k2]; if (Array.isArray(v2) && v2.length && v2[0] && v2[0].isMaterial) return v2; }
  return null;
}
return {_lcg:_lcg,_rgb:_rgb,_rgba:_rgba,karisim:karisim,gurultuAlani:gurultuAlani,fbmAlani:fbmAlani,alanDokusu:alanDokusu,normalHaritasi:normalHaritasi,_dokuYap:_dokuYap,_tane:_tane,normalDokusu:normalDokusu,_dikeyDoku:_dikeyDoku,_dokuKaydir:_dokuKaydir,dokuOlcek:dokuOlcek,_yuzMalzeme:_yuzMalzeme,yuzeyDoku:yuzeyDoku,kutuDoku:kutuDoku,silindirDoku:silindirDoku,_tipliOlcek:_tipliOlcek,_uvAcikligi:_uvAcikligi,_yogunlukOlcek:_yogunlukOlcek,tekrarKir:tekrarKir,otoOlcek:otoOlcek,uzayFonu:uzayFonu,dalgaNormali:dalgaNormali,gurultuDoku:gurultuDoku,cizgiDoku:cizgiDoku,damarDoku:damarDoku,ahsapDokusu:ahsapDokusu,budakEkle:budakEkle,ahsapMalzeme:ahsapMalzeme,mermerDoku:mermerDoku,karoDoku:karoDoku,fayansDokusu:fayansDokusu,fayansMalzeme:fayansMalzeme,mermerDokusu:mermerDokusu,mermerMalzeme:mermerMalzeme,mozaikDokusu:mozaikDokusu,mozaikMalzeme:mozaikMalzeme,parkeMalzeme:parkeMalzeme,duvarKagidiDokusu:duvarKagidiDokusu,duvarKagidiMalzeme:duvarKagidiMalzeme,haliMalzeme:haliMalzeme,devreDoku:devreDoku,filmKalinlik:filmKalinlik,kontakGolgesi:kontakGolgesi,fonDegradesi:fonDegradesi,sonsuzFon:sonsuzFon,odaKur:odaKur,odaTezgah:odaTezgah,duvarRaf:duvarRaf,_duvarYerlestir:_duvarYerlestir,_odaOlcusu:_odaOlcusu,_duvarBul:_duvarBul,_duvarDelik:_duvarDelik,_izinli:_izinli,_vec3:_vec3,_sayilastir:_sayilastir,odaKapi:odaKapi,odaPencere:odaPencere,sahneAmbiyansi:sahneAmbiyansi,ambiyansKoru:ambiyansKoru,sonIslem:sonIslem,camDuzelt:camDuzelt,kaustik:kaustik,kureselAyna:kureselAyna,_pufDokusu:_pufDokusu,bulutMalzeme:bulutMalzeme,bulutYap:bulutYap,phMalzeme:phMalzeme,recete:recete,malzeme:malzeme};
};
window.MALZEME3B_OTO = function (scene, renderer) { try { var m = MALZEME3B(renderer); m.ambiyansKoru(scene); m.camDuzelt(scene); return m.otoOlcek(scene); } catch (e) { console.warn('MALZEME3B_OTO', e); return 0; } };
