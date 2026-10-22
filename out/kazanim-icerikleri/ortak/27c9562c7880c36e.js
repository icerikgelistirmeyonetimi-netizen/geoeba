/* konum3b.js — yerel gömme */
/* 2026-09-11 — 8c2a9012'den (10 Eylül main yedeği) bayt bayt taşındı: KONUM3B portu. 18:08 geri alması
   dosyayı düşürmüştü; kullanıcı «2 yüzey üst üste gelme sorunu» (z-fighting, FB.7.4 optik masa) için
   EŞ DÜZLEM ölçümü gerekiyor. Dış bağımlılık yok: yalnız kendi gokKuresiMi yardımcısı (malzeme/gezegen kütüphaneleri TAŞINMADI). */
/* KONUM3B — 3B yerleşim yardımcıları (2026-09-06, denemeler/konum-hatalari teşhisi).
   Ölçüldü: 31/31 3B sayfada konumlar sabit sayı, 0 sayfa Box3 ile hizalıyor; en sık
   kalıplar «destek + h/2 hesaplanmadı» (teker rayın içinde), «Plane/Torus/Cylinder
   varsayılan ekseni döndürülmedi» (mercek çerçevesi ışın düzleminde), «pivot merkez
   cisimde değil». Bu dosya three.min.js ile birlikte HER 3B sayfaya gömülür (sablon.py
   kutuphane_dosyalari); sayfa kodu window.KONUM3B.* çağırır. Köprü (sablon.html) yalnız
   olc() ile ÖLÇER ve loglar — sahneyi OYNATMAZ (0,5 birim boşluk gezegen için niyet,
   masa için hata; otomatik oturtma yok). three r155 vendor.

   dunyaKutusu(nesne, {precise, filtre})   → Box3 (görünür Mesh; Points/Line/Sprite/gök küresi dışı)
   yereOturt(nesne, hedef?, pay?)          → dünya alt yüzü hedef y'ye / desteğin üst yüzüne (pay 0.005)
   ustuneKoy(a, b, ortala?)                → a'yı b'nin üstüne oturt, isteğe bağlı x/z ortala
   hizala(nesne, ref, eksen, kenar?)       → tek dünya ekseninde merkez/min/max hizası
   silindirYap(r, h, eksen, mat, seg?, rUst?) / diskYap(r, kalinlik, eksen, mat, seg?)
   halkaYap(r, tup, eksen, mat, seg?)      → Torus; eksen = halkanın NORMALİ ('x' ışın ekseni ise mercek çerçevesi)
   levhaYap(w, h, normalEksen, mat)        → Plane; normalEksen 'y' = yatay zemin, 'x' = ışına dik perde
   pivotKur(merkez, nesne, yaricap, aci?, egim?) → merkez cismin çocuğu pivot Group; yörünge döngüsü pivot.rotation.y
   pivotTasi(grup, dunyaNoktasi)           → grubun orijinini taşır, çocuklar dünyada YERİNDE kalır
   kadrajaSigdir(kamera, nesneler, {pay, controls, yon, filtre}) → OPT-IN; doğrultu korunur, uzaklık + hedef değişir
   zeminBul(sahne)                         → {mesh, ustY, alan} | null (userData.zemin > yatay Plane > ince geniş Box)
   olc(sahne, kamera)                      → rapor {zemin, birimler, bulgular:[GÖMÜLÜ|HAVADA|ZEMİN ALTI|EŞ DÜZLEM], esDuzlem} (log;
                                              EŞ DÜZLEM = z-fighting: iki mesh'in eksene hizalı düz yüzü AYNI eksen + AYNI işaretle aynı
                                              konumda ve örtüşüyor — 2026-09-11'den beri ÜÇ eksen (üst=üst, ±x=±x, ±z=±z); köprü bandı bilgilendirir.
                                              Gizli kökü farklı çift (biri görünür biri gizli, ayrı gizli gruplar) sayılmaz; polygonOffset imzası farklı çift bulgu değil nottur
                                              (rapor.esDuzlemOfset); rapor.esDuzlemCiftleri = mesh çifti kümeleri + künye)
   esDuzlemMesaji(rapor, enCok?)           → banda giden metin: en çok 3 mesh çifti, künye + yüz + eksene göre yön */
(function () {
  if (typeof THREE === "undefined") { console.warn("KONUM3B: THREE yok"); return; }
  var T = THREE;

  function kok(o) { while (o.parent) o = o.parent; return o; }

  function gokKuresiMi(o, boyut) {
    var m = o.material, arka = m && (m.side === T.BackSide || m.side === T.DoubleSide);
    var en = Math.max(boyut.x, boyut.y, boyut.z);
    return en > 200 || (arka && o.geometry && o.geometry.type === "SphereGeometry" && en > 20);
  }

  function dunyaKutusu(nesne, sec) {
    sec = sec || {};
    kok(nesne).updateMatrixWorld(true);
    var b = new T.Box3(), tmp = new T.Box3(), s = new T.Vector3();
    nesne.traverseVisible(function (o) {
      if (!(o.isMesh || o.isInstancedMesh) || !o.geometry) return;
      if (o.userData && o.userData.konumDisi) return;
      if (sec.filtre && !sec.filtre(o)) return;
      tmp.setFromObject(o, !!sec.precise);
      if (tmp.isEmpty() || !isFinite(tmp.min.x) || !isFinite(tmp.max.x)) return;
      tmp.getSize(s);
      if (gokKuresiMi(o, s)) return;
      b.union(tmp);
    });
    return b;
  }

  /* Dünya uzayındaki kaymayı nesnenin EBEVEYN uzayına çevirip uygular (döndürülmüş /
     ölçekli grup içinde de doğru). */
  function dunyaKaydir(nesne, delta) {
    var p = nesne.parent;
    if (p) {
      p.updateWorldMatrix(true, false);
      var a = nesne.getWorldPosition(new T.Vector3()).add(delta);
      nesne.position.copy(p.worldToLocal(a));
    } else nesne.position.add(delta);
    nesne.updateMatrixWorld(true);
  }

  function hedefUstY(nesne, hedef) {
    if (typeof hedef === "number") return hedef;
    if (hedef && hedef.isBox3) return hedef.max.y;
    if (hedef && hedef.isObject3D) {
      var hb = dunyaKutusu(hedef, { precise: true });
      return hb.isEmpty() ? null : hb.max.y;
    }
    var z = zeminBul(kok(nesne));
    return z ? z.ustY : 0;
  }

  function yereOturt(nesne, hedef, pay) {
    var b = dunyaKutusu(nesne, { precise: true });
    if (b.isEmpty()) return 0;
    var hy = hedefUstY(nesne, hedef);
    if (hy == null) return 0;
    var d = hy + (pay == null ? 0.005 : pay) - b.min.y;
    dunyaKaydir(nesne, new T.Vector3(0, d, 0));
    return d;
  }

  function ustuneKoy(a, b, ortala) {
    var d = yereOturt(a, b);
    if (ortala) {
      var ab = dunyaKutusu(a, { precise: true }), bb = dunyaKutusu(b, { precise: true });
      if (!ab.isEmpty() && !bb.isEmpty()) {
        var ca = ab.getCenter(new T.Vector3()), cb = bb.getCenter(new T.Vector3());
        dunyaKaydir(a, new T.Vector3(cb.x - ca.x, 0, cb.z - ca.z));
      }
    }
    return d;
  }

  function hizala(nesne, ref, eksen, kenar) {
    var a = dunyaKutusu(nesne, { precise: true });
    var b = ref && ref.isBox3 ? ref : dunyaKutusu(ref, { precise: true });
    if (a.isEmpty() || b.isEmpty()) return 0;
    function v(box) {
      if (kenar === "min") return box.min[eksen];
      if (kenar === "max") return box.max[eksen];
      return (box.min[eksen] + box.max[eksen]) / 2;
    }
    var d = v(b) - v(a), dv = new T.Vector3();
    dv[eksen] = d;
    dunyaKaydir(nesne, dv);
    return d;
  }

  /* Geometrinin +Y eksenini istenen dünya eksenine çevirir — mesh.rotation animasyona
     boş kalır (tekerlek: mesh.rotation.x += ω doğal yazılır). */
  function yEkseniniCevir(geo, eksen) {
    if (eksen === "x") geo.rotateZ(-Math.PI / 2);
    else if (eksen === "z") geo.rotateX(Math.PI / 2);
    return geo;
  }
  function silindirYap(r, h, eksen, malzeme, seg, rUst) {
    var g = new T.CylinderGeometry(rUst == null ? r : rUst, r, h, seg || 32);
    return new T.Mesh(yEkseniniCevir(g, eksen), malzeme);
  }
  function diskYap(r, kalinlik, eksen, malzeme, seg) {
    return silindirYap(r, kalinlik, eksen, malzeme, seg || 48);
  }
  /* Torus XY düzleminde doğar (normali Z). eksen = halkanın normali. */
  function halkaYap(r, tup, eksen, malzeme, seg) {
    var g = new T.TorusGeometry(r, tup, 16, seg || 64);
    if (eksen === "x") g.rotateY(Math.PI / 2);
    else if (eksen === "y") g.rotateX(Math.PI / 2);
    return new T.Mesh(g, malzeme);
  }
  /* Plane XY düzleminde doğar (normali +Z). normalEksen 'y' → yatay (normal +Y), 'x' → normal +X. */
  function levhaYap(w, h, normalEksen, malzeme) {
    var g = new T.PlaneGeometry(w, h);
    if (normalEksen === "x") g.rotateY(Math.PI / 2);
    else if (normalEksen === "y") g.rotateX(-Math.PI / 2);
    return new T.Mesh(g, malzeme);
  }

  function pivotKur(merkez, nesne, yaricap, aci, egim) {
    var p = new T.Group();
    p.name = (nesne.name || "nesne") + "-pivot";
    merkez.add(p);
    if (egim) p.rotation.z = egim;
    if (aci) p.rotation.y = aci;
    p.add(nesne);
    nesne.position.set(yaricap, 0, 0);
    return p;
  }
  function pivotTasi(grup, dunyaNoktasi) {
    grup.updateWorldMatrix(true, true);
    var yerelHedef = grup.worldToLocal(dunyaNoktasi.clone());
    grup.children.forEach(function (c) { c.position.sub(yerelHedef); });
    var yeni = dunyaNoktasi.clone();
    if (grup.parent) grup.parent.worldToLocal(yeni);
    grup.position.copy(yeni);
    grup.updateMatrixWorld(true);
    return grup;
  }

  function kadrajaSigdir(kamera, nesneler, sec) {
    sec = sec || {};
    var liste = Array.isArray(nesneler) ? nesneler : [nesneler], b = new T.Box3();
    liste.forEach(function (n) { b.union(dunyaKutusu(n, { filtre: sec.filtre })); });
    if (b.isEmpty()) return null;
    var kure = b.getBoundingSphere(new T.Sphere());
    var pay = sec.pay == null ? 1.15 : sec.pay;
    var fovY = kamera.fov * Math.PI / 180;
    var fovX = 2 * Math.atan(Math.tan(fovY / 2) * (kamera.aspect || 1));
    var uzaklik = kure.radius * pay / Math.sin(Math.min(fovX, fovY) / 2);
    var hedef = sec.controls && sec.controls.target ? sec.controls.target : kure.center;
    var yon = sec.yon ? sec.yon.clone() : kamera.position.clone().sub(hedef);
    if (yon.lengthSq() < 1e-9) yon.set(0, 0.45, 1);
    yon.normalize();
    kamera.position.copy(kure.center).addScaledVector(yon, uzaklik);
    kamera.lookAt(kure.center);
    if (sec.controls && sec.controls.target) {
      sec.controls.target.copy(kure.center);
      if (sec.controls.update) sec.controls.update();
    }
    if (kamera.far < uzaklik + kure.radius * 2) { kamera.far = uzaklik + kure.radius * 2; kamera.updateProjectionMatrix(); }
    return { merkez: kure.center, uzaklik: uzaklik };
  }

  /* Zemin: userData.zemin işaretli mesh > en geniş yatay Plane/Circle > ince ve geniş Box. */
  function zeminBul(sahne) {
    var aday = null, alan = 0, b = new T.Box3(), s = new T.Vector3();
    sahne.updateMatrixWorld(true);
    sahne.traverseVisible(function (o) {
      if (!o.isMesh || !o.geometry) return;
      b.setFromObject(o);
      if (b.isEmpty()) return;
      b.getSize(s);
      var xz = s.x * s.z;
      if (o.userData && o.userData.zemin) {
        if (!aday || !aday.isaret || xz > alan) { aday = { mesh: o, ustY: b.max.y, alan: xz, isaret: true }; alan = xz; }
        return;
      }
      if (aday && aday.isaret) return;
      if (gokKuresiMi(o, s)) return;
      if (s.y >= 0.15 * Math.min(s.x, s.z)) return;           // yatık değil
      var tip = o.geometry.type, gen = Math.min(s.x, s.z);
      var uygun = (tip === "PlaneGeometry" || tip === "CircleGeometry") ? gen > 2 : (tip === "BoxGeometry" && gen > 4);
      if (uygun && xz > alan) { aday = { mesh: o, ustY: b.max.y, alan: xz }; alan = xz; }
    });
    return aday;
  }

  function yuvarla(v) { return Math.round(v * 1000) / 1000; }

  /* EŞ DÜZLEM künye yardımcıları. gizliKok: mesh'i gizleyen görünmez ataların TÜMÜNÜN imzası (içten dışa kimlik
     zinciri; gizleyen yoksa ""). Yalnız en dış ata karşılaştırılsaydı tek gizli kabın içindeki ayrı ayrı açılan
     gizli alt gruplar (etaplar) birbirleriyle çift verirdi; zincir eşitliği bunu da eler. three çizimde
     görünmez grubun çocuklarını atlar, scene.traverse atlamaz — etap/soru grupları visible ile değiştirilen sayfada
     hiç birlikte çizilmeyen iki yüzey çakışma sayılıyordu (ölçüldü MAT.1.1.2 s6: grupS2'deki halı ile grupS5'teki
     kumaş, 6,6×3,2 = 21,12 birim² «üst=üst»). Kural: iki mesh'in gizli kökü AYNI ise çift sayılır (ikisi de görünür,
     ya da aynı gizli grubun içinde: grup açılınca birlikte çizilirler — ölçüldü MAT.7.4.6 s7: altı gizli grubun her
     birinde kutu üstü + etiket düzlemi y=0,98); kökleri FARKLI ise (biri görünür biri gizli, ya da ayrı gizli
     gruplar) birlikte çizilecekleri bilinmez, sayılmaz.
     ofsetImzasi: polygonOffset derinlik ofsetinin imzası; imzası FARKLI iki yüzey derinlikte ayrışır (bant ve
     sözleşme bunu çare diye sunar — ölçüm de tanır), AYNI ofsetli iki yüzey yarışmaya devam eder. */
  function gizliKok(o) { var z = []; for (var p = o.parent; p; p = p.parent) if (p.visible === false) z.push(p.id); return z.join(">"); }
  function ataAdi(o) { for (var p = o.parent; p && p.parent; p = p.parent) if (p.name) return String(p.name); return ""; }
  function malzemeListesi(o) { var m = o.material; return !m ? [] : (Array.isArray(m) ? m.filter(Boolean) : [m]); }
  function ofsetImzasi(ml) {
    var gorulen = {}, imza = [];
    ml.forEach(function (m) {
      var f = m.polygonOffset ? (+m.polygonOffsetFactor || 0) : 0, u = m.polygonOffset ? (+m.polygonOffsetUnits || 0) : 0;
      var s = (f || u) ? f + "," + u : "0";
      if (!gorulen[s]) { gorulen[s] = 1; imza.push(s); }
    });
    return imza.sort().join("|") || "0";
  }

  /* EŞ DÜZLEM yardımcıları (2026-09-11 — kullanıcı: FB.6.1 s11 fener ucunda ışınsal çizgili çakışma; ölçüldü:
     fenerBas CylinderGeometry rotation.z=−π/2 geniş kapağı x=0,44 (+x) ile fenerLens CircleGeometry rotation.y=π/2
     x=0,441 (+x) — eski ölçüm yalnız +y'ye bakıyordu, CircleGeometry listede yoktu). Ölçüm artık ÜÇ dünya eksenine
     bakar. Düz yüzler geometry.parameters'tan DEĞİL, KÖŞE NORMALLERİNDEN çıkarılır: yerel normali bir eksene
     0,995'ten yakın köşeler (eksen, işaret, o eksendeki konum) üçlüsüyle gruplanır; grubun öteki iki eksendeki
     min/max'ı yüzün ayak izidir (kapakta yarıçap karesi). Gerekçe: geometrisi YERİNDE döndürülmüş kapaklar
     (geo.rotateZ; kütüphanenin kendi silindirYap/diskYap/levhaYap'ı böyle — 3B sayfaların %11'i .rotateX/Y/Z
     kullanıyor) parameters'a bakan yolda ±y'de aranıp kaçardı. Kutu 6 yüz, düzlem/daire/halka/şekil ön yüz
     (DoubleSide ise arka yüz de), ekstrüzyon kapakları + düz yan duvarları, silindir/koni kapakları (openEnded →
     kapak köşesi yok; radiusTop 0 → üst kapak yok; kısmi silindirde dilimin izi) kendiliğinden çıkar; gövde ve pah
     köşeleri (radyal/eğik normal) girmez; küre/tor/kapsül/yazı/ham BufferGeometry tür eleğiyle hiç girmez. */
  var _YUZ_TIP = /^(Box|RoundedBox|Plane|Circle|Ring|Shape|Extrude|Cylinder|Cone)Geometry$/;
  var _CIFT_YUZ = /^(Plane|Circle|Ring|Shape)Geometry$/;   // tek katmanlı: DoubleSide'da arka yüz de düz yüzdür (kutu/silindirde değil)
  var _EKSEN = ["x", "y", "z"];
  var _DAIRESEL = /^(Circle|Ring|Cylinder|Cone)Geometry$/;
  function daireKesisim(r1, r2, d) {                              // iki dairenin ortak alanı (mercek formülü)
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r1 - r2)) { var rk = Math.min(r1, r2); return Math.PI * rk * rk; }
    var a1 = Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1)), a2 = Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
    var k = (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2);
    return r1 * r1 * a1 + r2 * r2 * a2 - 0.5 * Math.sqrt(k > 0 ? k : 0);
  }   // ayak izi daire/halka: AABB değil radyal aralık ölçülür
  function yerelDuzYuzler(geo) {
    var pos = geo.attributes && geo.attributes.position, nor = geo.attributes && geo.attributes.normal;
    if (!pos || !nor || nor.count !== pos.count || pos.count > 200000) return [];
    var gruplar = {}, liste = [], dairesel = _DAIRESEL.test(geo.type);
    for (var i = 0; i < pos.count; i++) {
      var n = [nor.getX(i), nor.getY(i), nor.getZ(i)], a = 0;
      if (Math.abs(n[1]) > Math.abs(n[a])) a = 1;
      if (Math.abs(n[2]) > Math.abs(n[a])) a = 2;
      if (Math.abs(n[a]) < 0.995) continue;                              // eksene hizalı olmayan köşe (gövde, pah)
      var P = [pos.getX(i), pos.getY(i), pos.getZ(i)], u = a === 0 ? 1 : 0, w = a === 2 ? 1 : 2;
      var anahtar = a + (n[a] > 0 ? "+" : "-") + Math.round(P[a] * 1e4), g = gruplar[anahtar];
      if (!g) { g = gruplar[anahtar] = { a: a, s: n[a] > 0 ? 1 : -1, k: P[a], min: [P[u], P[w]], max: [P[u], P[w]], pts: dairesel ? [] : null }; liste.push(g); }
      else {
        if (P[u] < g.min[0]) g.min[0] = P[u]; else if (P[u] > g.max[0]) g.max[0] = P[u];
        if (P[w] < g.min[1]) g.min[1] = P[w]; else if (P[w] > g.max[1]) g.max[1] = P[w];
      }
      if (g.pts) g.pts.push(P[u], P[w]);
    }
    // Dairesel yüz: merkez = ayak izi ortası, radyal aralık = köşe noktalarının merkeze uzaklığı (halka: iç/dış
    // yarıçap; daire ve kapak: 0..r). Eş merkezli halkalar (yörüngeler) radyal olarak ayrıksa çakışmaz.
    liste.forEach(function (g) {
      if (!g.pts) return;
      var cu = (g.min[0] + g.max[0]) / 2, cw = (g.min[1] + g.max[1]) / 2, rIn = Infinity, rOut = 0;
      for (var q = 0; q < g.pts.length; q += 2) {
        var r = Math.sqrt((g.pts[q] - cu) * (g.pts[q] - cu) + (g.pts[q + 1] - cw) * (g.pts[q + 1] - cw));
        if (r < rIn) rIn = r; if (r > rOut) rOut = r;
      }
      g.daire = { cu: cu, cw: cw, rIn: rIn < 1e-6 ? 0 : rIn, rOut: rOut };
      g.pts = null;
    });
    return liste;
  }
  /* Yerel düz yüzü dünyaya taşır: normal, normal matrisiyle (ölçek dahil) döndürülür; bir dünya eksenine 0,97'den
     yakın değilse (eğik mesh) yarışmaz. Yüzün dört köşesi dünyaya çevrilir: eksendeki ortalama = konum, öteki iki
     eksendeki min/max = ayak izi. ciftYuz: ters işaretli ikizi de eklenir (DoubleSide düzlem/daire/halka/şekil). */
  function dunyaYuzEkle(liste, y, mw, nm, sahip, ad, ciftYuz) {
    var n = new T.Vector3(); n.setComponent(y.a, y.s); n.applyMatrix3(nm).normalize();
    var W = 0;
    if (Math.abs(n.y) > Math.abs(n.getComponent(W))) W = 1;
    if (Math.abs(n.z) > Math.abs(n.getComponent(W))) W = 2;
    var bilesen = n.getComponent(W);
    if (Math.abs(bilesen) < 0.97) return;
    var u = y.a === 0 ? 1 : 0, w = y.a === 2 ? 1 : 2, U = W === 0 ? 1 : 0, V = W === 2 ? 1 : 2;
    var mn = [Infinity, Infinity], mx = [-Infinity, -Infinity], p = new T.Vector3(), konum = 0;
    for (var c = 0; c < 4; c++) {
      var P = [0, 0, 0]; P[y.a] = y.k; P[u] = (c & 1) ? y.max[0] : y.min[0]; P[w] = (c & 2) ? y.max[1] : y.min[1];
      p.set(P[0], P[1], P[2]).applyMatrix4(mw);
      var pu = p.getComponent(U), pv = p.getComponent(V);
      if (pu < mn[0]) mn[0] = pu; if (pu > mx[0]) mx[0] = pu;
      if (pv < mn[1]) mn[1] = pv; if (pv > mx[1]) mx[1] = pv;
      konum += p.getComponent(W) / 4;
    }
    var yuz = { sahip: sahip, ad: ad, eksen: _EKSEN[W], isaret: bilesen > 0 ? 1 : -1, konum: konum, min: mn, max: mx, alan: (mx[0] - mn[0]) * (mx[1] - mn[1]) };
    if (y.daire) {                                                    // dairesel ayak izi: merkez + dünya ölçekli yarıçaplar
      var Pc = [0, 0, 0]; Pc[y.a] = y.k; Pc[u] = y.daire.cu; Pc[w] = y.daire.cw;
      p.set(Pc[0], Pc[1], Pc[2]).applyMatrix4(mw);
      var gu = (y.max[0] - y.min[0]) || 1, gv = (y.max[1] - y.min[1]) || 1;
      var olcek = Math.max((mx[0] - mn[0]) / gu, (mx[1] - mn[1]) / gv);
      yuz.daire = { cu: p.getComponent(U), cv: p.getComponent(V), ri: y.daire.rIn * olcek, ro: y.daire.rOut * olcek };
      yuz.alan = Math.PI * (yuz.daire.ro * yuz.daire.ro - yuz.daire.ri * yuz.daire.ri);
    }
    liste.push(yuz);
    if (ciftYuz) liste.push({ sahip: sahip, ad: ad, eksen: yuz.eksen, isaret: -yuz.isaret, konum: konum, min: mn, max: mx, alan: yuz.alan, daire: yuz.daire });
  }

  /* ÖLÇÜM RAPORU: üst düzey birimler (scene'in doğrudan çocukları). Yalnız ölçer; sonuç
     sahne.userData.konumRaporu + console.info('KONUM3B_OLC …'). Eşikler denemeler/
     konum-hatalari ölçümünden: boşluk/derinlik > 0.05, dekal < 0.01 kalınlık muaf,
     userData.yuzer muaf; başka birimin üst yüzü ayak izinin ≥ %30'unu taşıyorsa destek odur. */
  function olc(sahne, kamera) {
    sahne.updateMatrixWorld(true);
    var zemin = zeminBul(sahne), zy = zemin ? zemin.ustY : null;
    var birimler = [], s = new T.Vector3();
    sahne.children.forEach(function (c, i) {
      if (c.isLight || c.isCamera || !c.visible) return;
      if (zemin && (c === zemin.mesh || (zemin.mesh.parent === c && c.children.length === 1))) return;
      var b = dunyaKutusu(c);
      if (b.isEmpty()) return;
      b.getSize(s);
      var ad = (c.name ? c.name + ":" : "") + c.type + "[" + i + "]";
      birimler.push({ ad: ad, i: i, box: b, boyut: [yuvarla(s.x), yuvarla(s.y), yuvarla(s.z)],
        yuzer: !!(c.userData && c.userData.yuzer), dekal: s.y < 0.01 });
    });
    function ayakIzi(a, b) {
      var x = Math.min(a.max.x, b.max.x) - Math.max(a.min.x, b.min.x);
      var z = Math.min(a.max.z, b.max.z) - Math.max(a.min.z, b.min.z);
      if (x <= 0 || z <= 0) return 0;
      var A = (a.max.x - a.min.x) * (a.max.z - a.min.z);
      return A > 0 ? x * z / A : 0;
    }
    var bulgular = [];
    birimler.forEach(function (u) {
      if (u.yuzer || u.dekal) return;
      var destek = zy, destekAd = "zemin";
      birimler.forEach(function (v) {
        if (v === u) return;
        if (ayakIzi(u.box, v.box) >= 0.3 && v.box.max.y <= u.box.min.y + 0.08 && (destek == null || v.box.max.y > destek)) {
          destek = v.box.max.y; destekAd = v.ad;
        }
      });
      if (destek == null) return;                    // zemin yok (uzay sahnesi) ve destek yok: ölçülmez
      var bosluk = u.box.min.y - destek, yuk = u.boyut[1];
      if (bosluk > 0.05 && bosluk > 0.02 * yuk) bulgular.push({ tur: "HAVADA", birim: u.ad, bosluk: yuvarla(bosluk), destek: destekAd });
      if (zy != null) {
        var derin = zy - u.box.min.y;
        if (derin > 0.05 && derin > 0.01 * yuk && derin < 0.5 * yuk) bulgular.push({ tur: "ZEMİN ALTI", birim: u.ad, derinlik: yuvarla(derin) });
      }
      birimler.forEach(function (v) {
        if (v === u || v.dekal || Math.max(ayakIzi(u.box, v.box), ayakIzi(v.box, u.box)) < 0.3) return;
        var d = v.box.max.y - u.box.min.y;
        // u'nun alt yüzü v'nin gövdesi İÇİNDE ya da altına geçmiş, üstü v'nin üstünde: teker rayın içinde,
        // kutu masanın içinde. d < %50 yükseklik: daha derini kesit/yer altı niyetidir.
        if (d > 0.03 && u.box.max.y > v.box.max.y + 0.03 && d < 0.5 * yuk && u.box.min.y > v.box.min.y - 0.5 * v.boyut[1])
          bulgular.push({ tur: "GÖMÜLÜ", birim: u.ad, icine: v.ad, derinlik: yuvarla(d) });
      });
    });
    // EŞ DÜZLEM / z-fighting (2026-09-06, kullanıcı: «üst üste iki yüzey var, tırtıklı görünüm — eskiden yoktu»;
    // ölçüldü FB.6.6 s02: masa üstü ile kenar pervazının üst yüzü aynı y=0, örtüşme 84 birim² → tepeden bakışta
    // zemin çizgi çizgi; pervaz 0,012 inince şerit enerjisi 5,16 → 0,19). MESH düzeyinde. Kontak gölgesi dekali
    // 0,002 yukarıda durur (m16 KONTAK GÖLGESİ) — 0,001 eşiği onu yakalamaz; konumDisi/Sprite/Points sayılmaz.
    // 2026-09-11 ÜÇ EKSEN (kullanıcı: FB.6.1 s11 fener ucunda ışınsal çizgili çakışma — kapak x=0,44 ile mercek
    // x=0,441; eski ölçüm yalnız +y'ye bakıyordu): her mesh'in eksene hizalı düz yüzleri (yerelDuzYuzler →
    // dunyaYuzEkle) AYNI eksen + AYNI işaretle (üst=üst, +x=+x, −x=−x, +z=+z, −z=−z) 0,001 içinde aynı konumdaysa
    // ve ayak izleri örtüşüyorsa (≥ 0,02 birim² ve küçük yüzün ≥ %30'u — eski eşikler). Zıt işaret (bir nesnenin
    // altının ötekinin üstüne OTURMASI; alt yüz arka yüzdür) ve alt=alt (yalnız alttan görünür; iç içe kutularda
    // gürültü, ölçüldü FB.6.6 s01) yine sayılmaz; aynı mesh'in yüzleri birbiriyle yarışmaz. Küre/tor/YATAN silindir
    // AABB tepesi (11.09 FB.7.4 s03/s04 yanlış pozitif muafiyeti) düz yüz değildir: yatan silindir artık yalnız
    // KAPAKLARIYLA (x ya da z) yarışır; eski +y sonuçları (kutu/düzlem/ekstrüzyon/şekil/dik silindir üstü) korunur.
    var esDuzlem = [], esOfset = [], esCiftler = [], esToplam = 0;
    (function () {
      var Y = [], onbellek = {}, meshSayisi = 0, sz = new T.Vector3(), mr = new T.Vector3(), kutu = new T.Box3(), kunyeler = {};
      sahne.traverse(function (o) {
        if (!(o.isMesh || o.isInstancedMesh) || !o.geometry || !o.visible || (o.userData && o.userData.konumDisi)) return;
        if (o.material && o.material.depthWrite === false) return;     // derinlik yazmayan (hale, huzme) yarışmaz
        if (o.material && o.material.visible === false) return;        // görünmez vekil (2026-09-11: s02 yuvaVekil)
        var ml = malzemeListesi(o);
        if (ml.length && ml.every(function (m) { return m.depthWrite === false || m.depthTest === false || m.visible === false; })) return;   // malzeme dizisi
        var gt = o.geometry.type;
        if (!_YUZ_TIP.test(gt)) return;                                 // küre, tor, kapsül, yazı, ham BufferGeometry: düz yüz yok
        kutu.setFromObject(o);
        if (kutu.isEmpty() || !isFinite(kutu.min.x)) return;
        kutu.getSize(sz);
        if (Math.max(sz.x, sz.z) > 200) return;                         // gök küresi
        meshSayisi++;
        var yerel = onbellek[o.geometry.uuid] || (onbellek[o.geometry.uuid] = yerelDuzYuzler(o.geometry));
        if (!yerel.length) return;
        var ciftYuz = _CIFT_YUZ.test(gt) && !!o.material && o.material.side === T.DoubleSide;
        var ad = (o.name ? o.name + ":" : "") + gt, matrisler = [o.matrixWorld];
        kutu.getCenter(mr);
        kunyeler[o.id] = { ad: ad, ata: ataAdi(o), gizliKok: gizliKok(o), merkez: [yuvarla(mr.x), yuvarla(mr.y), yuvarla(mr.z)],
          boyut: [yuvarla(sz.x), yuvarla(sz.y), yuvarla(sz.z)], ofset: ofsetImzasi(ml) };
        if (o.isInstancedMesh) {                                        // her örnek kendi matrisiyle (en çok 64; örnekler birbiriyle yarışmaz)
          if (o.count > 64) return;
          matrisler = [];
          for (var k = 0; k < o.count; k++) { var im = new T.Matrix4(); o.getMatrixAt(k, im); matrisler.push(im.premultiply(o.matrixWorld)); }
        }
        matrisler.forEach(function (mw) {
          var nm = new T.Matrix3().getNormalMatrix(mw);
          yerel.forEach(function (y) { dunyaYuzEkle(Y, y, mw, nm, o, ad, ciftYuz); });
        });
      });
      if (meshSayisi > 400 || Y.length > 4000) return;                 // n² bekçisi (mesh ve yüz sayısı)
      // Eşik 0,001 + kayan nokta payı (2026-09-11): s11'de mercek 0,441 − kapak dünya x'i 0,001'i 1e-16 aşıyor,
      // katı «< 0,001» kaçırıyordu; 0,0011 (ve 0,002 kontak dekali) yine dışarıda.
      var ESIK = 0.001 + 1e-6;
      for (var i = 0; i < Y.length; i++) for (var j = i + 1; j < Y.length; j++) {
        var A = Y[i], B = Y[j];
        if (A.sahip === B.sahip || A.eksen !== B.eksen || A.isaret !== B.isaret) continue;
        if (A.eksen === "y" && A.isaret < 0) continue;                   // alt=alt sayılmaz
        if (Math.abs(A.konum - B.konum) >= ESIK) continue;
        var ort, kucuk = Math.min(A.alan, B.alan);
        if (A.daire && B.daire) {                                        // halka/daire × halka/daire: radyal aralık
          var dA = A.daire, dB = B.daire, dm = Math.sqrt((dA.cu - dB.cu) * (dA.cu - dB.cu) + (dA.cv - dB.cv) * (dA.cv - dB.cv));
          if (dm >= dA.ro + dB.ro || dm + dB.ro <= dA.ri || dm + dA.ro <= dB.ri) continue;   // ayrık (eş merkezli yörüngeler)
          if (dm < 1e-3) {                                                // eş merkezli: ortak halka alanı
            var ri = Math.max(dA.ri, dB.ri), ro = Math.min(dA.ro, dB.ro);
            ort = ro > ri ? Math.PI * (ro * ro - ri * ri) : 0;
          } else {                                                        // kaçık merkez: dış dairelerin mercek alanı − delik payları
            ort = daireKesisim(dA.ro, dB.ro, dm);
            if (dA.ri > 0) ort -= daireKesisim(dA.ri, dB.ro, dm);
            if (dB.ri > 0) ort -= daireKesisim(dB.ri, dA.ro, dm);
            if (ort < 0) ort = 0;
          }
        } else {
          var ou = Math.min(A.max[0], B.max[0]) - Math.max(A.min[0], B.min[0]);
          var ov = Math.min(A.max[1], B.max[1]) - Math.max(A.min[1], B.min[1]);
          if (ou <= 0 || ov <= 0) continue;
          ort = ou * ov;
        }
        if (ort < 0.02 || (kucuk > 0 && ort < 0.3 * kucuk)) continue;
        var isr = A.isaret > 0 ? "+" : "-", yuz = A.eksen === "y" ? "üst=üst" : isr + A.eksen + "=" + isr + A.eksen;
        var kA = kunyeler[A.sahip.id], kB = kunyeler[B.sahip.id];
        if (kA.gizliKok !== kB.gizliKok) continue;                       // birlikte çizilecekleri bilinmiyor (bkz. gizliKok)
        var kayit = { tur: "EŞ DÜZLEM", a: A.ad, b: B.ad, yuz: yuz, eksen: A.eksen, konum: yuvarla(A.konum),
          y: A.eksen === "y" ? yuvarla(A.konum) : null, ortusme: yuvarla(ort),   // y: eski alan, yalnız y ekseninde dolu
          aKunye: kA, bKunye: kB, cift: Math.min(A.sahip.id, B.sahip.id) + "-" + Math.max(A.sahip.id, B.sahip.id), gizli: !!kA.gizliKok };
        // polygonOffset imzası FARKLI çift derinlikte ayrışır (çare uygulanmış): bulgu değil, düşük öncelikli not.
        // İkisi de aynı ofseti taşıyorsa hâlâ yarışır.
        if (kA.ofset !== kB.ofset) { kayit.tur = "EŞ DÜZLEM (polygonOffset ayırıyor)"; esOfset.push(kayit); continue; }
        esDuzlem.push(kayit);
      }
      // Şu an ÇİZİLEN çiftler önde (kesin kusur), gizli gruptakiler arkada; her öbek örtüşmeye göre büyükten küçüğe.
      var buyuktenKucuge = function (p, q) { return (p.gizli ? 1 : 0) - (q.gizli ? 1 : 0) || q.ortusme - p.ortusme; };
      esDuzlem.sort(buyuktenKucuge); esOfset.sort(buyuktenKucuge);
      // MESH ÇİFTİ kümeleri: üst üste kurulmuş iki kutu 5 yüz çifti verir, onarım tek harekettir. Kümeler 6 yüz
      // tavanından ÖNCE kurulur ki tek mesh çifti listeyi doldurup sıradaki çiftleri gizlemesin.
      var kume = {};
      esDuzlem.forEach(function (e) {
        var g = kume[e.cift];
        if (!g) { g = kume[e.cift] = { cift: e.cift, a: e.aKunye, b: e.bKunye, ortusme: e.ortusme, gizli: e.gizli, yuzler: [] }; esCiftler.push(g); }
        if (g.yuzler.length < 3) g.yuzler.push({ yuz: e.yuz, eksen: e.eksen, konum: e.konum, ortusme: e.ortusme });
      });
      esToplam = esCiftler.length;
      if (esCiftler.length > 6) esCiftler.length = 6;
      if (esDuzlem.length > 6) esDuzlem.length = 6;
      if (esOfset.length > 6) esOfset.length = 6;
    })();
    esDuzlem.forEach(function (e) { bulgular.push(e); });
    var kadrajDisi = [];
    if (kamera && kamera.isPerspectiveCamera) {
      kamera.updateMatrixWorld(true); kamera.updateProjectionMatrix();
      var fr = new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse));
      birimler.forEach(function (u) { if (!fr.intersectsBox(u.box)) kadrajDisi.push(u.ad); });
    }
    var rapor = { zemin: zemin ? { ustY: yuvarla(zy), alan: yuvarla(zemin.alan), isaret: !!zemin.isaret } : null,
      birimler: birimler.map(function (u) { return { ad: u.ad, min: [yuvarla(u.box.min.x), yuvarla(u.box.min.y), yuvarla(u.box.min.z)],
        max: [yuvarla(u.box.max.x), yuvarla(u.box.max.y), yuvarla(u.box.max.z)], boyut: u.boyut }; }),
      bulgular: bulgular, kadrajDisi: kadrajDisi, esDuzlem: esDuzlem,
      esDuzlemCiftleri: esCiftler, esDuzlemCiftSayisi: esToplam, esDuzlemOfset: esOfset };
    sahne.userData.konumRaporu = rapor;
    try { console.info("KONUM3B_OLC " + JSON.stringify(rapor)); } catch (e) {}
    return rapor;
  }

  /* Denetim bandına giden EŞ DÜZLEM metni (köprü çağırır; node testinde de sınanır). En çok 3 MESH ÇİFTİ; her
     çiftte iki parçanın künyesi (ad varsa ad, geometri türü, dünya boyutu + merkezi: model kaynakta
     «BoxGeometry(7.2, 0.03, 5» diye arar), çakışan yüz + eksen konumu ve EKSENE göre yön dili. Metin çift
     sınırında biter, ortasından kesilmez. Onarım talimatının geneli bant başlığındadır; burada yalnız veri durur. */
  function esDuzlemMesaji(rapor, enCok) {
    var ciftler = (rapor && rapor.esDuzlemCiftleri) || [];
    if (!ciftler.length) return "";
    enCok = enCok || 3;
    function kunye(k) {
      if (!k) return "mesh";
      return k.ad + " " + k.boyut.join("×") + " merkez (" + k.merkez.join(", ") + ")" + (k.ata ? " [" + k.ata + " içinde]" : "");
    }
    function yuzAdi(y) { return (y.eksen === "y" ? "üst" : y.yuz.split("=")[0]) + " yüzleri aynı " + y.eksen + "=" + y.konum; }
    function yon(yuzler) {
      var eksenler = {}, n = 0;
      yuzler.forEach(function (y) { if (!eksenler[y.eksen]) { eksenler[y.eksen] = 1; n++; } });
      if (n > 1) return "parçalar iç içe kurulmuş: birini her eksende 0.02 küçült ya da konumunu ayır";
      var e = yuzler[0].eksen;
      return e === "y" ? "birini 0.01 yükselt ya da alçalt" : "birini " + e + " ekseninde 0.01 kaydır";
    }
    var toplam = rapor.esDuzlemCiftSayisi || ciftler.length, parcalar = [], uzunluk = 0;
    for (var i = 0; i < ciftler.length && parcalar.length < enCok; i++) {
      var c = ciftler[i];
      var p = "[" + (i + 1) + "] " + kunye(c.a) + " ile " + kunye(c.b) + ": " + c.yuzler.map(yuzAdi).join(", ") +
        ", örtüşme " + c.ortusme + " birim²" + (c.gizli ? " (şu an gizli grupta, grup görününce çakışır)" : "") + "; " + yon(c.yuzler);
      if (parcalar.length && uzunluk + p.length > 720) break;
      parcalar.push(p); uzunluk += p.length + 1;
    }
    return "EŞ DÜZLEM: " + toplam + " mesh çifti" +
      (toplam > parcalar.length ? ", örtüşmesi en büyük " + parcalar.length + " çift" : "") + " — " + parcalar.join(" ");
  }

  window.KONUM3B = { esDuzlemMesaji: esDuzlemMesaji, dunyaKutusu: dunyaKutusu, dunyaKaydir: dunyaKaydir, yereOturt: yereOturt, ustuneKoy: ustuneKoy,
    hizala: hizala, silindirYap: silindirYap, diskYap: diskYap, halkaYap: halkaYap, levhaYap: levhaYap,
    pivotKur: pivotKur, pivotTasi: pivotTasi, kadrajaSigdir: kadrajaSigdir, zeminBul: zeminBul, olc: olc };
})();

