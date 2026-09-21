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
var _dokuBaglari = window.__MALZEME3B_BAGLARI || (window.__MALZEME3B_BAGLARI = new WeakMap());   // doku görüntüsü (texture.source) → { kaynak, guc, dikey }. Doku nesnesi userData'ya KONMAZ: three.js klonlarken userData'yı JSON'a çevirir, içindeki doku her klonda PNG'ye kodlanır (yüz başına onlarca ms, sayfa açılışı saniyelerce donar). source klonlarla ortaktır; fabrika örnekleri (sayfa + MALZEME3B_OTO) aynı bağları görür
function normalDokusu(doku, guc) {   // RENK/tanecik dokusunun parlaklığından normalMap türet (bumpMap yerine — ışıkta çok daha okunur)
  var c = doku.image, n = c.width, d = c.getContext('2d').getImageData(0, 0, n, n).data, alan = new Float32Array(n * n);
  for (var i = 0; i < n * n; i++) alan[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  var t = normalHaritasi(n, alan, guc || 1.5); _dokuBaglari.set(t.source, { kaynak: doku, guc: guc || 1.5 }); return t;   // kaynak+güç: dikey (90°) varyant aynı yoldan türetilir
}
function _dikeyDoku(doku) {   // dokunun 90° DÖNDÜRÜLMÜŞ klonu (bir kez, doku görüntüsü başına önbellekli): damar/fırça çizgisi u yerine v boyunca akar. Normal haritası döndürülmüş RENK dokusundan yeniden türetilir (vektörleri döndürmek gerekmez)
  var bag = _dokuBaglari.get(doku.source); if (bag && bag.dikey) return bag.dikey;
  var t;
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
  t.repeat.set(genislik / karo, derinlik / karo); var k = kaydirma || _dokuKaydir(); t.offset.set(k[0], k[1]); return t;
}
function _yuzMalzeme(malzeme, u, v, karo, dikey) {   // malzemenin bütün dokularını (map/normal/roughness/metalness/bump/emissive) u×v yüzeye göre klonlar — hepsi aynı kaydırmayla (normal renkle hizalı kalır)
  var dk = malzeme.userData && malzeme.userData.dogalKaro; if (dk) karo = Math.min(karo || dk, dk);   // DOĞAL KARO TAVANI («masa damarları hâlâ çok büyük» kusuru): ahşap 0.6 — model 2 yazsa da kırpılır (ölçüldü: karo 2 → damar aralığı ≈ 2,4 cm ve 66 cm dalga; 0,6 → gerçek meşe)
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
function otoOlcek(scene, karoTavan) {   // DOKU ÖLÇEĞİ OTOMATİĞİ: yardımcı dokusu (userData.malzeme3b) repeat (1,1) ile BÜYÜK Plane/Box/Cylinder'a gerilmişse yüzeye göre döşe (yuzeyDoku/kutuDoku/silindirDoku) — köprü ilk çizimde çağırır; modelin kendi CanvasTexture'ına (ekran, dama) DOKUNMAZ
  var T = karoTavan || 2, sayac = 0;
  scene.traverse(function (o) {
    if (!o.isMesh || !o.geometry || !o.geometry.parameters || Array.isArray(o.material) || o.userData._m3bOlcekli) return;
    var m = o.material, doku = m.map || m.normalMap || m.roughnessMap || m.bumpMap;
    if (!doku || !doku.userData || !doku.userData.malzeme3b || doku.repeat.x !== 1 || doku.repeat.y !== 1) return;
    var p = o.geometry.parameters, sc = o.scale, tip = o.geometry.type, b;
    if (tip === 'PlaneGeometry') b = [p.width * sc.x, p.height * sc.y];
    else if (tip === 'BoxGeometry') b = [p.width * sc.x, p.height * sc.y, p.depth * sc.z];
    else if (tip === 'CylinderGeometry') b = [2 * Math.PI * Math.max(p.radiusTop, p.radiusBottom) * Math.max(sc.x, sc.z), p.height * sc.y];
    else return;
    var sirali = b.slice().sort(function (a, c) { return c - a; });
    if (sirali[0] < 2 * T) return;                                                    // küçük nesne (kasa, tuğla): tek karo 1:1 doğru
    var K = Math.min(T, Math.max(0.75, sirali[1] / 3));                                // karo = en büyük yüzeyin kısa kenarı/3, tavan T (kameraya yakın zemin ≤ 2)
    if (tip === 'PlaneGeometry') o.material = yuzeyDoku(m, b[0], b[1], K);
    else if (tip === 'BoxGeometry') o.material = kutuDoku(m, b[0], b[1], b[2], K);
    else o.material = silindirDoku(m, Math.max(p.radiusTop, p.radiusBottom) * Math.max(sc.x, sc.z), b[1], K);
    o.userData._m3bOlcekli = true; sayac++;
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
function cizgiDoku(n, taban, cizgi, adim, yatay, renkli) {   // fırçalanmış metal / lif / oluk: YÖNLÜ gürültü çizgileri — YALNIZ metal fırça izi / kumaş lifi / kâğıt; bina cephesi, pencere, plastik, duvar İÇİN DEĞİL (ölçüldü: mor binada ahşap damarı gibi okundu → pencereDoku); adim küçük = ince çizgi; cizgi 'rgba(r,g,b,a)' çizgi rengi+gücü; yatay=true yatay çizgi; renkli=false → veri dokusu
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
function pencereDoku(n, duvar, cam, satir, sutun, yanma, tohum) {   // BİNA CEPHESİ: satir×sutun pencere ızgarası (cephe başına 1:1 — Box yüzü dokunun tamamını alır; kutuDoku/otoOlcek ile DÖŞEME; satir ≈ yükseklik/0.5, sutun ≈ genişlik/0.6); yanma 0-1 ışıklı pencere oranı; duvar/cam renk; tohum aynı cepheyi yineler
  n = n || 512; satir = Math.max(1, Math.round(satir || 8)); sutun = Math.max(1, Math.round(sutun || 5)); yanma = yanma == null ? 0.2 : yanma;
  var c = document.createElement('canvas'); c.width = c.height = n; var g = c.getContext('2d'), r = _lcg(tohum || 7), d = _rgb(duvar || '#d9d5cf');
  g.fillStyle = duvar || '#d9d5cf'; g.fillRect(0, 0, n, n);
  var ince = fbmAlani(n >> 2, 3, 4, 41), q = n >> 2;               // duvar sıvası: hafif ton lekesi (düz boya ölü görünür)
  for (var y = 0; y < q; y++) for (var x = 0; x < q; x++) { var k = (ince[y * q + x] - 0.5) * 14; g.fillStyle = 'rgb(' + Math.round(d[0] + k) + ',' + Math.round(d[1] + k) + ',' + Math.round(d[2] + k) + ')'; g.fillRect(x * 4, y * 4, 4, 4); }
  var pw = n / sutun, ph = n / satir, kw = pw * 0.52, kh = ph * 0.58, ox = (pw - kw) / 2, oy = (ph - kh) / 2, cerceve = Math.max(1, Math.round(n / 256));
  for (var i = 0; i < satir; i++) for (var j = 0; j < sutun; j++) {
    var yanik = r() < yanma, x0 = j * pw + ox, y0 = i * ph + oy;
    g.fillStyle = yanik ? '#ffe2a0' : (cam || '#3b4a66'); g.fillRect(x0, y0, kw, kh);                    // cam
    g.fillStyle = 'rgba(255,255,255,' + (yanik ? 0.06 : 0.22) + ')'; g.fillRect(x0, y0, kw, kh * 0.4);   // gök yansıması (üst yarı açık)
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x0 + kw * 0.5 - cerceve / 2, y0, cerceve, kh);          // orta kayıt
    g.strokeStyle = 'rgba(30,30,40,0.55)'; g.lineWidth = cerceve; g.strokeRect(x0, y0, kw, kh);          // çerçeve
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x0 - cerceve, y0 + kh, kw + 2 * cerceve, cerceve * 1.5); // denizlik gölgesi
  }
  var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;   // userData.malzeme3b YOK: otoOlcek cepheyi döşemez (pencere sayısı cepheye göre)
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
return {_lcg:_lcg,_rgb:_rgb,_rgba:_rgba,karisim:karisim,gurultuAlani:gurultuAlani,fbmAlani:fbmAlani,alanDokusu:alanDokusu,normalHaritasi:normalHaritasi,normalDokusu:normalDokusu,_dikeyDoku:_dikeyDoku,_dokuKaydir:_dokuKaydir,dokuOlcek:dokuOlcek,_yuzMalzeme:_yuzMalzeme,yuzeyDoku:yuzeyDoku,kutuDoku:kutuDoku,silindirDoku:silindirDoku,otoOlcek:otoOlcek,uzayFonu:uzayFonu,dalgaNormali:dalgaNormali,gurultuDoku:gurultuDoku,cizgiDoku:cizgiDoku,damarDoku:damarDoku,ahsapDokusu:ahsapDokusu,budakEkle:budakEkle,ahsapMalzeme:ahsapMalzeme,mermerDoku:mermerDoku,pencereDoku:pencereDoku,karoDoku:karoDoku,devreDoku:devreDoku,filmKalinlik:filmKalinlik,kontakGolgesi:kontakGolgesi,kaustik:kaustik,kureselAyna:kureselAyna,_pufDokusu:_pufDokusu,bulutMalzeme:bulutMalzeme,bulutYap:bulutYap};
};
window.MALZEME3B_OTO = function (scene, renderer) { try { return MALZEME3B(renderer).otoOlcek(scene); } catch (e) { console.warn('MALZEME3B_OTO', e); return 0; } };
