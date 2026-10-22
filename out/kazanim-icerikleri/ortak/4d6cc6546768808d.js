/* egitsel3b.js — yerel gömme */
/* EGITSEL 3B bileşenleri — sürükle-bırak yuvası ve durum renklendirmesi.
 *
 * GİRİŞ NOKTALARI:
 *   EGITSEL.hayalet3B(mesh, ...)      → 3B NESNE yükü için hayalet/silüet
 *   EGITSEL.yuva3B({...})             → görünmez vuruş alanı + bırakma
 *   EGITSEL.etiketYuvasi3B({...})     → etiket→nesne eşlemesi (dönüt = renk)
 *   EGITSEL.durum3B(nesne, tip)       → nesneyi dogru/yanlis/secili boyar
 *   EGITSEL.tiklaTasi3B({...})        → 3B nesne TAŞIMA: tıkla → imlece yapışır,
 *                                       hedefe tıkla → yerleşir, boşa tıkla → döner
 *   ⛔ EGITSEL.yuzeyYazi3B(metin, {...}) → KULLANMA. 3B sahneye yazı yazmak
 *      YASAK (kullanıcı kararı 2026-08-24, sözleşme madde 19: «İSTİSNASIZ»);
 *      kabul kapısı sayfada bu çağrıyı görürse REDDEDER. Yalnız arşiv
 *      sayfaları açılabilsin diye duruyor — yeni kodda adlandırma panelin,
 *      dönüt `durum3B` + `EGITSEL.dontVer`ın işidir.
 *
 * KULLANICI KARARLARI 2026-08-18 (üç tur, giderek daralan):
 *   1. «3B içeriklerde 2B label güzel durmuyor ve 2B layerlar nesneleri
 *      kapatıyor» → tuvalin üstünde GÖRÜNEN DOM etiketi yasak.
 *   2. «3B olan nesnelere direk bırakıldığında 3B olarak bir isimlik gibi bir
 *      şey çizilebilir» → yazı sahnenin içine, gerçek geometriye taşındı.
 *   3. «3B'lerde etiket sistemini kaldıralım, yazması gereken yazı varsa
 *      yazsın; ama TABELA veya 2B label istemiyorum» → plaka/sap/çerçeve de
 *      kalktı. Geriye TAŞIYICISIZ yazı kaldı: harfler nesnenin KENDİ
 *      YÜZEYİNE basılır, sahnede ayrı bir etiket nesnesi durmaz.
 *
 * Bugünkü hüküm: sahnede yer tutucu YOKTUR. Bırakma hedefi nesnenin
 * kendisidir (sürüklerken vurgulanır); ad ancak doğru bırakmada, nesnenin
 * yüzeyinde belirir. DOM'da yalnız şablonun görünmez vuruş alanı kalır.
 *
 * NEDEN ŞABLONDA (2026-08-17 ölçümü): m19'un 3B yuva hükmü sözleşmede 3.233
 * karakterlik DÜZYAZIYDI ve aslında bir ALGORİTMA tarif ediyordu — Vector3
 * izdüşümü, hayaletin bounding box'ından 8 köşe, her karede left/top/width/
 * height yazımı, bırakınca etiketin gizlenmesi. Ajanın bunu her sayfada
 * düzyazıdan yeniden türetmesi hem yavaş hem kırılgandı: FB.8.4 s17'de hayalet
 * 415x287 px iken vuruş alanı 80x80 px çıkmıştı (kapsama %5) — öğrenci
 * gördüğü yer tutucuya bırakamıyordu.
 *
 * Kanonik referans: parcalar/KIM.10.2.1+…/sayfa-15.html:647-706 (korpustaki
 * tek doğru uygulama). Buradaki kod onun genelleştirilmiş hâlidir.
 *
 * SORUMLULUK SINIRI:
 *   ŞABLONUN İŞİ  → izdüşüm matematiği, vuruş alanının ÖLÇÜSÜ, kamera/orbit
 *                    değişiminde tazeleme, bırakma dönütü, etiketin gizlenmesi.
 *   SAYFANIN İŞİ  → hayaletin GEOMETRİSİ (yerleşecek nesnenin biçimini ve
 *                    ölçüsünü taşımalı — bu sahneye özgü yaratıcı karardır).
 *
 * ⚠ TUTAMAK `el` DÖNDÜRMEZ (bilinçli): DOM düğümüne erişim verilseydi sayfa
 * `y.el.style.background = "..."` yazıp KORUNAN_SINIFLAR kalkanını atlardı —
 * kalkan yalnız <style> gövdesini tarar. Yuva DOM'u tümüyle şablona aittir.
 */
(function () {
  "use strict";
  if (!window.EGITSEL) window.EGITSEL = {};
  if (EGITSEL.yuva3B && EGITSEL.etiketYuvasi3B && EGITSEL.tiklaTasi3B) return; // iki kez gömülse de tek kurulum

  var KAYITLAR = [];                        // aktif yuva kümeleri
  var VURGU_RENK = 0x3aa3ff;                // sürükleme sırasında hayalet rengi

  /* SÜRÜKLEME VURGUSU (2026-08-18): sözleşme «vurgu 2B çipte değil 3B
   * yuvadadır: hayalet mesh'in rengi/opaklığı/ölçeği değişir» diyor ama
   * bileşen bunu ne uyguluyor ne devrediyordu — dropTarget yalnız
   * {element, getData, onDrop} taşıyordu. Vurgu ŞABLONUN işidir (sayfa
   * hayaletin GEOMETRİSİNDEN sorumludur), burada kapatılıyor. */
  function vurgula(y, acik) {
    if (!y.nesne || !y.nesne.traverse) return;
    y.nesne.traverse(function (d) {
      // ⚠ YALNIZ isMesh YETMEZ: sözleşme «kesik çizgili TEL KAFES»i meşru
      // hayalet sayar, o da LineSegments/Line'dır (isMesh YOK, isLine VAR) —
      // o hayaletlerde vurgu SESSİZCE hiç olmuyordu. Points de kapsanır.
      if (!(d.isMesh || d.isLine || d.isLineSegments || d.isPoints)) return;
      if (!d.material) return;
      // Malzeme DİZİ de olabilir (çok materyalli mesh).
      var ms = Array.isArray(d.material) ? d.material : [d.material];
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (!m) continue;
        if (acik) {
          if (!m.__yuvaVurgulu) {
            m.__yuvaVurgulu = true;
            m.__yuvaEskiOpaklik = m.opacity;
            m.__yuvaEskiRenk = m.color ? m.color.getHex() : null;
            m.__yuvaEskiSaydam = m.transparent;
          }
          m.transparent = true;
          m.opacity = Math.min(1, (m.__yuvaEskiOpaklik || 0.35) * 2.2);
          if (m.color) m.color.setHex(VURGU_RENK);
          m.needsUpdate = true;
        } else if (m.__yuvaVurgulu) {
          // ⚠ `delete` ŞART: undefined'a YAZMAK, kaydedilen değerin kendisi
          // undefined olduğunda «hiç vurgulanmamış» ile ayırt edilemez ve
          // geri alma sessizce atlanırdı — bayrak ayrı tutulur.
          m.opacity = m.__yuvaEskiOpaklik;
          if (m.color && m.__yuvaEskiRenk !== null) m.color.setHex(m.__yuvaEskiRenk);
          m.transparent = m.__yuvaEskiSaydam;
          delete m.__yuvaVurgulu;
          delete m.__yuvaEskiOpaklik;
          delete m.__yuvaEskiRenk;
          delete m.__yuvaEskiSaydam;
          m.needsUpdate = true;
        }
      }
    });
  }

  /* Sahne-kap içinde yuva katmanı: pointer-events:none, YALNIZ yuvalar auto. */
  function katmanBul(tuval) {
    var kap = tuval.closest ? tuval.closest(".sahne-kap") : null;
    if (!kap) kap = tuval.parentNode;
    if (!kap) return null;
    var k = kap.querySelector(":scope > .yuva3b-katman");
    if (!k) {
      k = document.createElement("div");
      k.className = "yuva3b-katman";
      k.style.cssText = "position:absolute;inset:0;pointer-events:none;";
      if (getComputedStyle(kap).position === "static") kap.style.position = "relative";
      kap.appendChild(k);
    }
    return k;
  }

  /* Hayalet mesh: hedefin KLONU, YENİ malzemeyle.
   * ⚠ clone() malzemeyi REFERANSLA paylaşır — var olanı mutasyona uğratmak
   * gerçek nesneyi de hayalete çevirir. Her Mesh'e yeni malzeme ATANIR. */
  EGITSEL.hayalet3B = function (mesh, secenek) {
    secenek = secenek || {};
    var klon = mesh.clone(true);
    klon.traverse(function (d) {
      if (!d.isMesh) return;
      d.material = new THREE.MeshBasicMaterial({
        color: secenek.renk !== undefined ? secenek.renk : 0x8899aa,
        wireframe: secenek.telKafes !== undefined ? secenek.telKafes : true,
        transparent: true,
        opacity: secenek.opaklik !== undefined ? secenek.opaklik : 0.35,
        depthWrite: false
      });
    });
    klon.userData.__hayalet = true;
    return klon;
  };

  /* ────────────────────────────────────────────── YÜZEY YAZISI (3B)
   *
   * KULLANICI KARARI 2026-08-18 (üçüncü tur): «3B'lerde etiket sistemini
   * kaldıralım, yazması gereken yazı varsa yazsın; ama TABELA veya 2B label
   * istemiyorum.»
   *
   * Kaldırılan: plaka + sap + çerçeve (`isimlik3B`) ve onu kameraya döndüren
   * kare köprüsü. O biçim TABELAYDI — nesnenin dışında, kendi zemini ve
   * kenarlığı olan, havada duran ayrı bir taşıyıcı. Kullanıcı bunu da
   * istemiyor; 2B DOM etiketi zaten yasaktı.
   *
   * Kalan tek meşru biçim: yazının TAŞIYICISI YOKTUR — harfler nesnenin
   * KENDİ YÜZEYİNE basılır. Cam fanusun camına basılmış yazı, kütüğe
   * kazınmış ad gibi. Zemin yok, kenarlık yok, çerçeve yok, sap yok,
   * billboard yok: yazı nesnenin bir parçası gibi durur ve nesneyle
   * birlikte döner.
   *
   * NASIL: saydam zeminli CanvasTexture (yalnız harfler opak) + yüzeye
   * yaslanan ince düzlem + `polygonOffset`. Bu yapıdaki three.js dağıtımında
   * `DecalGeometry`/`TextGeometry`/`FontLoader` YOKTUR (ölçüldü: üçü de 0
   * geçiş) — gerçek çıkartma geometrisi kurulamaz, yüzeye yaslanan düzlem
   * bunun uygulanabilir karşılığıdır.
   *
   * ⚠ `polygonOffset` ŞART: düzlem yüzeyle aynı derinlikte olduğundan
   * z-savaşı (yanıp sönen yazı) çıkarır. Offset yazıyı derinlikte öne alır,
   * konumda oynatmaz.
   *
   * SORUMLULUK SINIRI:
   *   ŞABLONUN İŞİ → harf çizimi, saydamlık, yüzeye yaslama, z-savaşı önleme.
   *   SAYFANIN İŞİ → yazının HANGİ yüzeye, hangi noktaya, hangi yöne geleceği
   *                  (sahneye özgü yaratıcı karar).
   */

  var DOKU_YOGUNLUK = 320;             // dünya birimi başına doku pikseli
  var YAZI_RENK = {
    normal: "#1b2b3a",
    dogru:  "#14532d",
    yanlis: "#7f1d2d"
  };

  /* NESNE DURUM RENKLENDİRMESİ (2026-08-25) — sözleşme madde 19'un
   * «3B sahnede yazı yazılmaz; dönüt nesnede DURUM RENKLENDİRMESİ +
   * EGITSEL.dontVer ile verilir (yüzeye ad YAZILMAZ)» hükmünün kütüphane
   * karşılığı. 24.08 kararı Python katmanına işlenmiş ama kütüphaneye hiç
   * uğramamıştı: `etiketYuvasi3B` doğru bırakmada adı yüzeye BASIYORDU.
   * Emissive tercih edilir (madde 19'un vurgu dili: emissive AÇIK renk,
   * emissiveIntensity ≥ 0.55); malzemede emissive yoksa color'a düşer.
   * Özgün değer userData'da saklanır ki "normal" tam geri alsın. */
  var NESNE_DURUM = { dogru: 0x16a34a, yanlis: 0xdc2626, secili: 0xffb300 };

  EGITSEL.durum3B = function (nesne, tip) {
    if (!nesne || !nesne.traverse) return;
    var renk = NESNE_DURUM[tip];                 // yoksa (normal) → geri al
    nesne.traverse(function (o) {
      var m = o.material;
      if (!m) return;
      var liste = Array.isArray(m) ? m : [m];
      for (var i = 0; i < liste.length; i++) {
        var mm = liste[i];
        if (!mm) continue;
        var alan = mm.emissive && mm.emissive.setHex ? mm.emissive : mm.color;
        if (!alan || !alan.setHex || !alan.getHex) continue;
        if (mm.userData === undefined || mm.userData === null) mm.userData = {};
        if (mm.userData.__ozgunDurumRenk === undefined) {
          mm.userData.__ozgunDurumRenk = alan.getHex();
          mm.userData.__ozgunSiddet = mm.emissiveIntensity;
        }
        if (renk === undefined) {
          alan.setHex(mm.userData.__ozgunDurumRenk);
          if (mm.emissiveIntensity !== undefined) {
            mm.emissiveIntensity = mm.userData.__ozgunSiddet;
          }
        } else {
          alan.setHex(renk);
          if (mm.emissive && mm.emissive.setHex) mm.emissiveIntensity = 0.6;
        }
      }
    });
  };

  /* Metni satırlara böl: önce kelime sarma, sonra punto küçültme. */
  function yaziyiSar(ctx, yazi, enPx, punto) {
    ctx.font = "700 " + punto + "px Nunito, Baloo2, sans-serif";
    if (ctx.measureText(yazi).width <= enPx) return [yazi];
    var kelimeler = String(yazi).split(/\s+/), satirlar = [], su = "";
    for (var i = 0; i < kelimeler.length; i++) {
      var aday = su ? su + " " + kelimeler[i] : kelimeler[i];
      if (ctx.measureText(aday).width > enPx && su) { satirlar.push(su); su = kelimeler[i]; }
      else su = aday;
    }
    if (su) satirlar.push(su);
    return satirlar;
  }

  /* Yazıyı bir yüzeye basar. Dönüş: THREE.Mesh (sahneye/nesneye eklenir).
   *
   * secenek:
   *   hedef   Object3D — ölçü ve konum bundan türer (verilmezse konum/olcu ver)
   *   yuzey   "on"|"ust"|"sag"|"sol"|"arka"|"alt" — hedefin HANGİ yüzüne (vars. "on")
   *   konum   Vector3 — açık konum (hedefin yerine)
   *   normal  Vector3 — yüzey normali (açık yönlendirme)
   *   olcu    yazı yüksekliği (dünya birimi); verilmezse hedeften türer
   *   renk    "#rrggbb" ya da durum adı
   */
  EGITSEL.yuzeyYazi3B = function (metin, secenek) {
    secenek = secenek || {};
    var hedef = secenek.hedef || null;

    var kutu = null, boy = null;
    if (hedef && THREE.Box3) {
      kutu = new THREE.Box3().setFromObject(hedef);
      if (!kutu.isEmpty()) boy = kutu.getSize(new THREE.Vector3());
    }
    // Yazı yüksekliği nesneden türer: 6 birimlik sahnede de 600'lükte de okunur.
    var olcu = secenek.olcu;
    if (olcu === undefined) {
      var cap = boy ? Math.max(boy.x, boy.y, boy.z) : 2;
      olcu = Math.max(0.06, Math.min(0.9, cap * 0.16));
    }

    var yazi = metin === undefined || metin === null ? "" : String(metin);
    var durum = "normal";
    var tuval = document.createElement("canvas");
    var ctx = tuval.getContext ? tuval.getContext("2d") : null;
    var punto = 72;

    /* Doku ölçüsü yazının EN-BOY oranını izler; harfler esnemez.
     * ⚠ HER METİN DEĞİŞİMİNDE YENİDEN ÇAĞRILIR (2026-08-20 ölçümü): etiket
     * yuvası bileşeni yazıyı BOŞ kurup sonra `metinYaz` ile doldurduğu için
     * ölçü bir kez «?» genişliğine göre biçilirse gerçek kelime tuvale
     * SIĞMAZ ve yatay kırpılır — ölçülen 23 etiketin 23'ünde taşma 2,2x
     * («Mars» → «1ar» görünüyordu). `secenek.en` açıkça verilmişse çağıran
     * ölçüyü sahiplenmiştir, dokunulmaz. */
    var en = secenek.en;
    var enSabit = en !== undefined;
    function boyutla() {
      if (!enSabit) {
        if (ctx) {
          ctx.font = "700 " + punto + "px Nunito, Baloo2, sans-serif";
          en = olcu * (ctx.measureText(yazi || "?").width / punto) * 1.12;
        } else {
          en = olcu * 0.62 * (yazi || "?").length;
        }
        en = Math.max(olcu * 0.9, en);
      }
      /* Tavana dayanınca EN-BOY ORANI KORUNUR: yalnız genisligi kirpmak
       * harfleri yatay SIKISTIRIR (olculdu: uzun adlarda 1,18x). Iki kenar
       * AYNI oranda kucultulur; doku yogunlugu duser ama harf sekli bozulmaz
       * (kucultme zaten mipmapli). */
      var idealW = en * DOKU_YOGUNLUK, idealH = olcu * DOKU_YOGUNLUK * 1.35;
      var oran = Math.min(1, 1024 / idealW, 512 / idealH);
      var yeniW = Math.max(64, Math.round(idealW * oran));
      var yeniH = Math.max(32, Math.round(idealH * oran));
      var degisti = tuval.width !== yeniW || tuval.height !== yeniH;
      if (degisti) { tuval.width = yeniW; tuval.height = yeniH; }
      return degisti;
    }
    boyutla();

    var doku = new THREE.CanvasTexture(tuval);
    /* KÜÇÜLTME MIPMAP İLE (2026-08-20 ölçümü): ölçülen 23 etiketin 23'ünde
     * küçültme 0,06-0,29 arasındaydı — yani doku ekranda kapladığı alandan
     * 3,4-16 KAT daha çözünürlüklü. LinearFilter mipmap KULLANMAZ, o yüzden
     * bu kadar sert küçültme nokta-örneklemeye düşüyor ve harfler kırılıyor;
     * bulanıklığın asıl kaynağı çözünürlük EKSİKLİĞİ değil bu.
     * ⚠ KORUMALI yazılır: egitsel3b_testi'ndeki THREE taklidinde yalnız
     * `LinearFilter` tanımlı; korumasız atama orada undefined bırakırdı. */
    if (THREE.LinearMipmapLinearFilter) {
      doku.minFilter = THREE.LinearMipmapLinearFilter;
      doku.generateMipmaps = true;
    } else if (THREE.LinearFilter) {
      doku.minFilter = THREE.LinearFilter;
    }
    if (THREE.LinearFilter) doku.magFilter = THREE.LinearFilter;
    doku.anisotropy = secenek.anisotropy || 8;

    /* ⚠ ZEMİN ÇİZİLMEZ: `clearRect` saydam bırakır, yalnız harfler opak olur.
     * Zemin/kenarlık çizmek bu bileşeni yeniden TABELAYA çevirirdi. */
    function ciz() {
      if (!ctx) return;
      var W = tuval.width, H = tuval.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = secenek.renk && secenek.renk.charAt(0) === "#"
        ? secenek.renk : (YAZI_RENK[durum] || YAZI_RENK.normal);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var p = Math.round(H * 0.62), satirlar = yaziyiSar(ctx, yazi, W * 0.96, p);
      while (satirlar.length > 2 && p > 12) {
        p = Math.round(p * 0.85);
        satirlar = yaziyiSar(ctx, yazi, W * 0.96, p);
      }
      // Okunurluk için ince açık kontur: yazı koyu nesnede de seçilir —
      // bu bir ÇERÇEVE değil, harflerin kendi kenarıdır.
      ctx.lineWidth = Math.max(2, p * 0.13);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineJoin = "round";
      var adim = p * 1.1, bas = H / 2 - (satirlar.length - 1) * adim / 2;
      for (var i = 0; i < satirlar.length; i++) {
        if (ctx.strokeText) ctx.strokeText(satirlar[i], W / 2, bas + i * adim);
        ctx.fillText(satirlar[i], W / 2, bas + i * adim);
      }
      doku.needsUpdate = true;
    }
    ciz();

    var malzeme = new THREE.MeshBasicMaterial({
      map: doku,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      // Yüzeyle aynı derinlikte durduğu için z-savaşı çıkar; offset önler.
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
      side: THREE.DoubleSide
    });
    var mesh = new THREE.Mesh(new THREE.PlaneGeometry(en, olcu * 1.35), malzeme);
    mesh.userData.__yuzeyYazi3B = true;
    mesh.renderOrder = 2;

    /* YÜZEYE YASLA: hedefin sınır kutusunun İLGİLİ YÜZÜNE, dışa doğru çok
     * küçük bir pay bırakarak oturur. Pay yüzeyden kopmasın diye ölçüye
     * oranlıdır — nesne büyüdükçe orantılı kalır. */
    function yerlestir() {
      if (secenek.konum) {
        var k = secenek.konum;
        mesh.position.set(k.x !== undefined ? k.x : k[0],
                          k.y !== undefined ? k.y : k[1],
                          k.z !== undefined ? k.z : k[2]);
      } else if (kutu && !kutu.isEmpty()) {
        var mrk = kutu.getCenter(new THREE.Vector3());
        var d = olcu * 0.04;                       // yüzeyden mikro pay
        var yuzey = secenek.yuzey || "on";
        var p = new THREE.Vector3();
        if (yuzey === "ust")       p.set(mrk.x, kutu.max.y + d, mrk.z);
        else if (yuzey === "alt")  p.set(mrk.x, kutu.min.y - d, mrk.z);
        else if (yuzey === "sag")  p.set(kutu.max.x + d, mrk.y, mrk.z);
        else if (yuzey === "sol")  p.set(kutu.min.x - d, mrk.y, mrk.z);
        else if (yuzey === "arka") p.set(mrk.x, mrk.y, kutu.min.z - d);
        else                       p.set(mrk.x, mrk.y, kutu.max.z + d);
        if (mesh.parent && mesh.parent.worldToLocal) {
          if (mesh.parent.updateWorldMatrix) mesh.parent.updateWorldMatrix(true, false);
          mesh.parent.worldToLocal(p);
        }
        mesh.position.copy(p);
      }
      // Yönlendirme: açık normal varsa ona, yoksa yüzeyin doğal normaline.
      var n = secenek.normal;
      if (!n) {
        var y = secenek.yuzey || "on";
        n = y === "ust"  ? {x:0, y:1, z:0}  : y === "alt"  ? {x:0, y:-1, z:0}
          : y === "sag"  ? {x:1, y:0, z:0}  : y === "sol"  ? {x:-1, y:0, z:0}
          : y === "arka" ? {x:0, y:0, z:-1} : {x:0, y:0, z:1};
      }
      if (mesh.lookAt) {
        mesh.lookAt(mesh.position.x + n.x, mesh.position.y + n.y, mesh.position.z + n.z);
      }
    }

    var tutamak = {
      metinYaz: function (yeni) {
        yazi = yeni === undefined || yeni === null ? "" : String(yeni);
        // ÖLÇÜYÜ YENİDEN TÜRET: tuval «?» genişliğinde kalırsa gerçek kelime
        // kırpılır (ölçüldü: 23/23 etikette 2,2x taşma). Düzlem de aynı
        // oranda güncellenmeli, yoksa harfler yatay ESNER.
        var oncekiEn = en;
        boyutla();
        if (en !== oncekiEn && THREE.PlaneGeometry) {
          var eskiG = mesh.geometry;
          mesh.geometry = new THREE.PlaneGeometry(en, olcu * 1.35);
          if (eskiG && eskiG.dispose) eskiG.dispose();
        }
        ciz();
      },
      durumAyar: function (yeni) { durum = yeni || "normal"; ciz(); },
      hizala: yerlestir,
      yokEt: function () {
        if (mesh.parent) mesh.parent.remove(mesh);
        if (mesh.geometry && mesh.geometry.dispose) mesh.geometry.dispose();
        if (malzeme.dispose) malzeme.dispose();
        if (doku.dispose) doku.dispose();
      }
    };
    mesh.metinYaz = tutamak.metinYaz;
    mesh.durumAyar = tutamak.durumAyar;
    mesh.hizala = tutamak.hizala;
    mesh.yokEt = tutamak.yokEt;
    mesh.userData.metinYaz = tutamak.metinYaz;
    mesh.userData.durumAyar = tutamak.durumAyar;
    mesh.userData.yokEt = tutamak.yokEt;

    if (secenek.sahne && secenek.sahne.add) secenek.sahne.add(mesh);
    yerlestir();
    return mesh;
  };

  /* Bir yuva kümesi kurar. Dönüş: DAR tutamak (el YOK). */
  EGITSEL.yuva3B = function (ayar) {
    ayar = ayar || {};
    var tuval = ayar.tuval;
    if (!tuval || !ayar.hedefler || !ayar.hedefler.length) {
      console.warn("EGITSEL.yuva3B: tuval ve hedefler zorunlu");
      return null;
    }
    var katman = katmanBul(tuval);
    if (!katman) return null;
    var pay = ayar.pay === undefined ? 12 : ayar.pay;

    var yuvalar = ayar.hedefler.map(function (h, i) {
      var el = document.createElement("div");
      // Vuruş alanı GÖRÜNMEZDİR: zemin yok, kenarlık yok, metin yok —
      // yalnız ölçü + pointer-events. Görünen yer tutucu 3B hayalettir.
      el.className = "yuva3b";
      el.style.cssText = "position:absolute;pointer-events:auto;display:none;";
      el.setAttribute("aria-label", h.ad || ("yuva " + (i + 1)));
      katman.appendChild(el);
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      // KAPASİTE: kaç doğru bırakmada yuvanın dolacağı. Varsayılan 1 (tek
      // nesnelik yuva). Kule, sepet, kutu gibi aynı hedefe birden çok nesne
      // giren sahnede N verilir; yuva N'e ulaşana kadar açık kalır.
      // Infinity de geçerlidir: yuva hiç dolmaz, sınırı sayfa koyar.
      var kapasite = Number(h.kapasite);
      kapasite = kapasite >= 1 ? Math.floor(kapasite) : 1;
      return { el: el, nesne: h.nesne, veri: h.veri, etiket: h.etiket,
               gercek: h.gercek, hedefiGizle: h.hedefiGizle !== false,
               dolduruldu: h.dolduruldu, bosaltildi: h.bosaltildi,
               kapasite: kapasite, kaynaklar: [],
               dolu: false, kaynak: null, temizleyiciler: [] };
    });

    var kayit = { tuval: tuval, katman: katman, pay: pay, yuvalar: yuvalar,
                  birakildi: ayar.birakildi };
    KAYITLAR.push(kayit);

    if (typeof pdnd !== "undefined" && pdnd.dropTargetForElements) {
      yuvalar.forEach(function (y) {
        var pdndTemizle = pdnd.dropTargetForElements({
          element: y.el,
          getData: function () { return { yuva: y.veri }; },
          onDragEnter: function () { if (!y.dolu) vurgula(y, true); },
          onDragLeave: function () { vurgula(y, false); },
          onDrop: function (args) {
            vurgula(y, false);
            var kaynak = args.source && args.source.data;
            kayit.birakildi && kayit.birakildi(kaynak, y.veri, function (dogru) {
              if (dogru) {
                y.sonBirakma = Date.now();
                EGITSEL._yuvaDoldur(y, kaynak);
              }
            });
          }
        });
        if (typeof pdndTemizle === "function") y.temizleyiciler.push(pdndTemizle);
      });
    }
    /* Klavye/tık yedeği görünür HTML çip çizmez: odak halkası yerine 3B
     * hedef vurgulanır; sayfa seçili kaynak verisini `secildi` ile döndürür. */
    if (typeof ayar.secildi === "function") {
      yuvalar.forEach(function (y) {
        var sec = function () {
          if (y.dolu || (y.sonBirakma && Date.now() - y.sonBirakma < 300)) return;
          ayar.secildi(y.veri, function (kaynak, kabul) {
            if (kaynak && kabul !== false) EGITSEL._yuvaDoldur(y, kaynak);
          });
        };
        var tus = function (e) {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sec(); }
        };
        var odak = function () { if (!y.dolu) vurgula(y, true); };
        var bulanik = function () { vurgula(y, false); };
        y.el.addEventListener("click", sec);
        y.el.addEventListener("keydown", tus);
        y.el.addEventListener("focus", odak);
        y.el.addEventListener("blur", bulanik);
        y.temizleyiciler.push(function () {
          y.el.removeEventListener("click", sec);
          y.el.removeEventListener("keydown", tus);
          y.el.removeEventListener("focus", odak);
          y.el.removeEventListener("blur", bulanik);
        });
      });
    }
    EGITSEL._yuva3BKare(null, null, tuval);   // ilk konumlandırma
    return {
      yuvalar: yuvalar.map(function (y) { return y.veri; }),
      hepsiDoldu: function () { return yuvalar.every(function (y) { return y.dolu; }); },
      sec: function (veri) {
        var y = yuvalar.filter(function (v) { return v.veri === veri; })[0];
        return y ? { veri: y.veri, dolu: y.dolu, kaynak: y.kaynak,
                     adet: y.kaynaklar.length, kapasite: y.kapasite,
                     kaynaklar: y.kaynaklar.slice() } : null;
      },
      doldur: function (veri, kaynak) {
        var y = yuvalar.filter(function (v) { return v.veri === veri; })[0];
        if (y) EGITSEL._yuvaDoldur(y, kaynak);
      },
      /* Çok nesnelik yuvada YALNIZ SON nesneyi çıkarır (sayfa kuleden en
       * üstteki küpü geri aldığında); tek nesnelik yuvayı tümüyle boşaltır.
       * Yuva hemen konumlanır: dolu yuvanın vuruş alanı display:none'dı. */
      bosalt: function (veri) {
        var y = yuvalar.filter(function (v) { return v.veri === veri; })[0];
        if (!y) return;
        EGITSEL._yuvaBosalt(y, true);
        EGITSEL._yuva3BKare(null, kayit.sonKamera, tuval);
      },
      /* ⚠ HEMEN KONUMLANDIR (2026-08-18): `_yuvaBosalt` display'i geri
       * vermiyordu ve yuva bir sonraki RENDER KARESİNE kadar `display:none`
       * kalıyordu. Sürekli rAF döngüsü olan sahnede bu bir kare sürer, ama
       * ON-DEMAND render eden sahnede (yalnız orbit değişince çizen) yuva
       * KALICI olarak görünmez/tıklanamaz kalıyordu. */
      sifirla: function () {
        // forEach sıra numarasını ikinci argüman olarak geçer; _yuvaBosalt'a
        // yalnız yuva gitsin, yuva TÜMÜYLE boşalsın.
        yuvalar.forEach(function (y) { EGITSEL._yuvaBosalt(y); });
        EGITSEL._yuva3BKare(null, kayit.sonKamera, tuval);
      },
      yikim: function () {
        yuvalar.forEach(function (y) {
          y.temizleyiciler.forEach(function (f) { try { f(); } catch (_) {} });
          y.el.remove();
        });
        var i = KAYITLAR.indexOf(kayit);
        if (i >= 0) KAYITLAR.splice(i, 1);
      }
    };
  };

  /* YERLEŞEN ETİKET KAYBOLUR: DOM yuvası + etiket gizlenir, hayalet söner,
   * gerçek nesne belirir.
   *
   * ÇOK NESNELİK YUVA (kapasite > 1): her doğru bırakma `kaynaklar`a eklenir
   * ve yuva kapasite dolana kadar AÇIK kalır (vuruş alanı + hayalet durur).
   * Kapasite dolunca tek nesnelik yuvanın «dolu» hâline geçer; `dolduruldu`
   * da o an çağrılır. Dolu çok nesnelik yuva taşmaz, yeni kaynağı almaz. */
  EGITSEL._yuvaDoldur = function (y, kaynak) {
    kaynak = kaynak || null;
    if (y.kapasite > 1) {
      if (y.dolu) return;
      y.kaynaklar.push(kaynak);
      y.kaynak = kaynak;
      if (y.kaynaklar.length < y.kapasite) return;
    } else {
      if (y.dolu) EGITSEL._yuvaBosalt(y);
      y.kaynaklar = [kaynak];
      y.kaynak = kaynak;
    }
    y.dolu = true;
    y.el.style.display = "none";
    y.el.style.pointerEvents = "none";
    if (y.etiket) y.etiket.style.display = "none";
    if (y.nesne && y.hedefiGizle) y.nesne.visible = false;
    if (y.gercek) y.gercek.visible = true;
    if (typeof y.dolduruldu === "function") y.dolduruldu(y.kaynak, y.veri, y.gercek);
  };

  /* `yalnizSon === true` → çok nesnelik yuvadan yalnız son nesne çıkar, kalanlar
   * durur; aksi hâlde yuva tümüyle boşalır. `bosaltildi` çıkan kaynakla çağrılır. */
  EGITSEL._yuvaBosalt = function (y, yalnizSon) {
    var eskiKaynak = y.kaynak;
    if (yalnizSon === true && y.kapasite > 1 && y.kaynaklar.length > 1) {
      eskiKaynak = y.kaynaklar.pop();
      y.kaynak = y.kaynaklar[y.kaynaklar.length - 1];
    } else {
      y.kaynaklar = [];
      y.kaynak = null;
    }
    y.dolu = false;
    y.el.style.pointerEvents = "auto";
    if (y.etiket) y.etiket.style.display = "";
    if (y.nesne) y.nesne.visible = true;
    if (y.gercek) y.gercek.visible = false;
    if (typeof y.bosaltildi === "function") y.bosaltildi(eskiKaynak, y.veri, y.gercek);
  };

  /* ETİKET→NESNE EŞLEME (metin yükü).
   *
   * ⚠ YER TUTUCU YOK (kullanıcı kararı 2026-08-18, üçüncü tur): önceki sürüm
   * her hedefe kesik çizgili, «?» yazan bir PLAKA asıyordu. Kullanıcı bunu
   * TABELA sayıp reddetti; 2B DOM etiketi zaten yasaktı. Artık sahnede
   * bırakmadan ÖNCE hiçbir ek nesne durmaz:
   *
   *   · Bırakma hedefi NESNENİN KENDİSİDİR — sürüklerken o vurgulanır
   *     (rengi/opaklığı değişir). Öğrenciye nereye bırakacağını söyleyen şey
   *     bu vurgudur, bir yer tutucu değil.
   *   · Doğru bırakmada SAHNEYE YAZI YAZILMAZ (2026-08-25; madde 19 zaten
   *     «yüzeye ad YAZILMAZ» diyordu, kütüphane bunu uygulamıyordu): dönüt
   *     nesnenin DURUM RENKLENDİRMESİdir (`EGITSEL.durum3B`), adlandırma
   *     panelin ve lejantın işi, kısa dönüt `EGITSEL.dontVer` ile verilir.
   *   · Boşaltmada renklendirme geri alınır; sahne yine yalnız nesnelerden
   *     oluşur.
   *
   * DOM tarafında yalnız şablonun GÖRÜNMEZ vuruş alanı kalır (yuva3B kurar).
   * Sayfanın CSS'i o düğüme erişemez: `el` döndürülmez, sınıfı KORUNAN
   * SINIFLAR kalkanındadır. 2B etiketin geri sızması yapısal olarak kapalı. */
  EGITSEL.etiketYuvasi3B = function (ayar) {
    ayar = ayar || {};
    var nesneler = {};
    var hedefler = (ayar.hedefler || []).map(function (h) {
      nesneler[h.veri] = h.nesne;
      // ⚠ `gercek` OLARAK VERİLMEZ: _yuvaBosalt `gercek.visible=false` yazar
      // ve hedef nesne sahnede KALMALIDIR.
      return {
        nesne: h.nesne, veri: h.veri, ad: h.ad, hedefiGizle: false,
        dolduruldu: function (kaynak) {
          // Dönüt = DURUM RENKLENDİRMESİ (yüzeye ad yazılmaz — madde 19).
          EGITSEL.durum3B(h.nesne, "dogru");
          if (typeof h.dolduruldu === "function") h.dolduruldu(kaynak, h.veri, h.nesne);
        },
        bosaltildi: function (kaynak) {
          EGITSEL.durum3B(h.nesne, "normal");
          if (typeof h.bosaltildi === "function") h.bosaltildi(kaynak, h.veri, h.nesne);
        }
      };
    });
    var y = EGITSEL.yuva3B({
      tuval: ayar.tuval, pay: ayar.pay, hedefler: hedefler,
      birakildi: ayar.birakildi, secildi: ayar.secildi
    });
    if (!y) return null;
    y.nesne = function (veri) { return nesneler[veri] || null; };
    y.durum = function (veri, tip) {
      EGITSEL.durum3B(nesneler[veri], tip);
    };
    return y;
  };

  /* Her karede çağrılır (şablon köprüsü): vuruş alanı HAYALETİ KAPSAR —
   * konum DA ölçü DE izdüşümden hesaplanır. Sabit kutu, hayalet büyüyünce
   * yanında kalır (ölçüldü FB.8.4 s17: kapsama %5). */
  EGITSEL._yuva3BKare = function (sahne, kamera, domElement) {
    for (var i = 0; i < KAYITLAR.length; i++) {
      var kayit = KAYITLAR[i];
      if (domElement && kayit.tuval !== domElement) continue;
      var kam = kamera || kayit.sonKamera;
      if (kamera) kayit.sonKamera = kamera;
      if (!kam || typeof THREE === "undefined") continue;
      var w = kayit.tuval.clientWidth, h = kayit.tuval.clientHeight;
      for (var j = 0; j < kayit.yuvalar.length; j++) {
        var y = kayit.yuvalar[j];
        if (y.dolu || !y.nesne) { y.el.style.display = "none"; continue; }
        var box = new THREE.Box3().setFromObject(y.nesne);
        if (box.isEmpty()) { y.el.style.display = "none"; continue; }
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        var arkada = false;
        for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) for (var c = 0; c < 2; c++) {
          var pt = new THREE.Vector3(a ? box.max.x : box.min.x,
                                     b ? box.max.y : box.min.y,
                                     c ? box.max.z : box.min.z);
          pt.project(kam);
          if (pt.z >= 1) arkada = true;
          var px = (pt.x * 0.5 + 0.5) * w, py = (-pt.y * 0.5 + 0.5) * h;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
        if (arkada || minX >= maxX || minY >= maxY) { y.el.style.display = "none"; continue; }
        /* TUVALE KIRP (2026-08-18): eskiden sol/üst `Math.max(0, …)` ile
         * kelepçeleniyor ama width/height ham farktan yazılıyordu — kelepçe
         * TELAFİ EDİLMEDİĞİ için kutu sağa/aşağı taşıyordu. Ekran kenarındaki
         * iki komşu yuva bu yüzden çakışıp yanlış hedefi kabul edebiliyordu
         * (ölçüldü: 56 px örtüşme). Kenarları kırp, ölçüyü kırpılmış
         * kenarlardan TÜRET. */
        var sol = Math.max(0, minX - kayit.pay), ust = Math.max(0, minY - kayit.pay);
        var sag = Math.min(w, maxX + kayit.pay), alt = Math.min(h, maxY + kayit.pay);
        if (sag - sol < 1 || alt - ust < 1) { y.el.style.display = "none"; continue; }
        y.el.style.left = sol + "px";
        y.el.style.top = ust + "px";
        y.el.style.width = (sag - sol) + "px";
        y.el.style.height = (alt - ust) + "px";
        y.el.style.display = "block";
      }
    }
  };
  /* ────────────────────────────────────────────── TIKLA-TAŞI (3B nesne taşıma)
   *
   * KULLANICI KARARI 2026-09-06: «3B'de sürüklenecek 3B nesne varsa tıklandığında
   * imlece yapışmalı, tıklanan noktaya yerleşmeli, boş yere tıklanırsa eski
   * konumuna dönmeli.» Üretilen sayfalar (FB.6.1 s2/s3/s5) her seferinde kendi
   * pointerdown/pointermove/intersectPlane motorunu yazıyordu: basılı tut-çek,
   * tıkla-seç yedeği ve geri dönüş her sayfada farklı, çoğunda eksikti.
   *
   * MEKANİK
   *   nesne TIKLANIR   → imlece yapışır: pointer'ı izleme düzlemi üzerinde izler
   *   hedefe TIKLANIR  → birakildi(kaynak, hedef, bitir); bitir(true) → yerleşir
   *                      (hedefin konumuna; kilitle:true ise bir daha taşınmaz),
   *                      bitir(false) → eski konumuna döner
   *   boşa TIKLANIR    → eski konumuna döner (Esc de döndürür)
   *   başka nesneye TIKLANIR → eskisi döner, yenisi alınır
   *   basılı tutup çekmek de çalışır (dokunmatik): bırakınca aynı kural işler.
   *
   * SORUMLULUK SINIRI
   *   ŞABLONUN İŞİ → vuruş (raycast), izleme düzlemi ve ofset, kaldırma, seçili/
   *                  hover vurgusu (madde 19: parlak emissive), hedef vurgusu,
   *                  geri dönüş animasyonu, orbit kontrolünün kapatılıp açılması,
   *                  kilit, sıfırlama.
   *   SAYFANIN İŞİ → hangi nesne hangi hedefe (birakildi kuralı), dönüt metni
   *                  (EGITSEL.dontVer), yuva3B hayaletlerinin geometrisi.
   *
   * AYAR: tuval (renderer.domElement), kamera, nesneler [{nesne, veri}],
   *   hedefler [{nesne, veri, konum?: Vector3, noktaya?: true}] (yoksa her tıklama
   *   geri döndürür), duzlem "yatay" (varsayılan; nesnenin kendi y'si) | "kamera" |
   *   THREE.Plane, yukselt 0.35, kilitle true, kontroller (OrbitControls),
   *   birakildi(kaynakVeri, hedefVeri, bitir), yerlesti(kaynak, hedef, nesne, hedefNesne),
   *   geriDondu(kaynak, nesne), secildi(kaynak, nesne), animasyon true, esik 6 px.
   * DÖNÜŞ: { tasinan(), al(veri), hedefeBirak(veri), birak(), kilitle(veri, durum),
   *          sifirla(), yikim() } */
  EGITSEL.tiklaTasi3B = function (ayar) {
    ayar = ayar || {};
    var tuval = ayar.tuval, kamera = ayar.kamera;
    if (!tuval || !kamera || !ayar.nesneler || !ayar.nesneler.length ||
        typeof THREE === "undefined") {
      console.warn("EGITSEL.tiklaTasi3B: tuval, kamera ve nesneler zorunlu");
      return null;
    }
    var kap = (tuval.closest && tuval.closest(".sahne-kap")) || tuval.parentNode || tuval;
    var yukselt = ayar.yukselt === undefined ? 0.35 : ayar.yukselt;
    var esik = ayar.esik === undefined ? 6 : ayar.esik;
    var kilitle = ayar.kilitle !== false;
    var animasyon = ayar.animasyon !== false;
    var kameraDuzlemi = ayar.duzlem === "kamera";
    var nesneler = ayar.nesneler.map(function (n) {
      return { nesne: n.nesne, veri: n.veri, kilitli: false,
               ilk: n.nesne.getWorldPosition(new THREE.Vector3()) };
    });
    var hedefler = (ayar.hedefler || []).map(function (h) {
      return { nesne: h.nesne, veri: h.veri, konum: h.konum || null, noktaya: !!h.noktaya };
    });
    var ray = new THREE.Raycaster();
    var ndc = new THREE.Vector2();
    var tasinan = null;        // {kayit, baslangic, duzlem, ofset, tikla, olcek}
    var basili = null;         // {x, y, kayit}
    var hoverKayit = null, hoverHedef = null, kontrolAsli;
    var temizleyiciler = [];
    if (tuval.style && !tuval.style.touchAction) tuval.style.touchAction = "none";

    function bul(liste, veri) {
      for (var i = 0; i < liste.length; i++) if (liste[i].veri === veri) return liste[i];
      return null;
    }
    function ndcHesapla(e) {
      var r = tuval.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(ndc, kamera);
      return true;
    }
    /* Vuruş: listedeki kökler ve çocukları; visible:false zincir ATLANIR
     * (Raycaster gizli nesneyi de vurur — dolmuş yuva hedef değildir). */
    function vur(liste) {
      var kokler = [];
      for (var i = 0; i < liste.length; i++) if (liste[i].nesne) kokler.push(liste[i].nesne);
      if (!kokler.length) return null;
      var v = ray.intersectObjects(kokler, true);
      for (var j = 0; j < v.length; j++) {
        var o = v[j].object, gorunur = true, k = o;
        while (k) { if (k.visible === false) { gorunur = false; break; } k = k.parent; }
        if (!gorunur) continue;
        for (var t = 0; t < liste.length; t++) {
          var q = o, ait = false;
          while (q) { if (q === liste[t].nesne) { ait = true; break; } q = q.parent; }
          if (ait) return { kayit: liste[t], nokta: v[j].point };
        }
      }
      return null;
    }
    function dunyaKonum(o) { return o.getWorldPosition(new THREE.Vector3()); }
    function dunyayaKoy(o, w) {
      var yerel = w.clone();
      if (o.parent && o.parent.worldToLocal) o.parent.worldToLocal(yerel);
      o.position.copy(yerel);
    }
    function duzlemKur(w) {
      if (ayar.duzlem && ayar.duzlem.isPlane) return ayar.duzlem;
      var pl = new THREE.Plane();
      if (kameraDuzlemi) {
        var n = new THREE.Vector3();
        kamera.getWorldDirection(n);
        pl.setFromNormalAndCoplanarPoint(n.negate(), w);
      } else {
        pl.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), w);
      }
      return pl;
    }
    /* Hover = HAFİF vurgu (madde 19: aynı parlak vurgu, emissiveIntensity 0.25-0.35);
     * durum3B ile aynı userData anahtarları — «normal» ikisini de geri alır. */
    function hafifVurgu(nesne) {
      nesne.traverse(function (o) {
        var m = o.material;
        if (!m) return;
        var liste = Array.isArray(m) ? m : [m];
        for (var i = 0; i < liste.length; i++) {
          var mm = liste[i];
          if (!mm || !mm.emissive || !mm.emissive.setHex) continue;
          if (mm.userData === undefined || mm.userData === null) mm.userData = {};
          if (mm.userData.__ozgunDurumRenk === undefined) {
            mm.userData.__ozgunDurumRenk = mm.emissive.getHex();
            mm.userData.__ozgunSiddet = mm.emissiveIntensity;
          }
          mm.emissive.setHex(NESNE_DURUM.secili);
          mm.emissiveIntensity = 0.3;
        }
      });
    }
    function imlec(v) { if (tuval.style) tuval.style.cursor = v; }
    function hoverAyarla(kayit) {
      if (hoverKayit === kayit) return;
      if (hoverKayit && !(tasinan && tasinan.kayit === hoverKayit)) EGITSEL.durum3B(hoverKayit.nesne, "normal");
      hoverKayit = kayit;
      if (kayit) { hafifVurgu(kayit.nesne); imlec("pointer"); }
      else if (!tasinan) imlec("");
    }
    function hedefVurgula(h) {
      if (hoverHedef === h) return;
      if (hoverHedef) EGITSEL.durum3B(hoverHedef.nesne, "normal");
      hoverHedef = h;
      if (h) EGITSEL.durum3B(h.nesne, "secili");
    }
    function kontrolKapat() {
      if (!ayar.kontroller) return;
      if (kontrolAsli === undefined) kontrolAsli = ayar.kontroller.enabled;
      ayar.kontroller.enabled = false;
    }
    function kontrolAc() {
      if (!ayar.kontroller || kontrolAsli === undefined) return;
      if (tasinan || (basili && basili.kayit)) return;
      ayar.kontroller.enabled = kontrolAsli;
      kontrolAsli = undefined;
    }
    /* Hareket KAYIT başınadır: dönen nesne yalnız kendini kilitler (başka nesne o
     * sırada alınabilir); kayit.anim sayacı değişince (sifirla, yeni hareket) eski
     * animasyon karesi kendini bırakır — sıfırlanan nesneyi geri çekmez. */
    function hareket(kayit, hedefW, sonra) {
      var nesne = kayit.nesne;
      var no = (kayit.anim = (kayit.anim || 0) + 1);
      if (!animasyon || typeof requestAnimationFrame !== "function") {
        dunyayaKoy(nesne, hedefW);
        if (sonra) sonra();
        return;
      }
      var bas = dunyaKonum(nesne), t0 = null, sure = 220;
      kayit.hareketli = true;
      function adim(ts) {
        if (kayit.anim !== no) return;
        if (t0 === null) t0 = ts;
        var u = Math.min(1, (ts - t0) / sure);
        u = 1 - (1 - u) * (1 - u);
        dunyayaKoy(nesne, bas.clone().lerp(hedefW, u));
        if (u < 1) requestAnimationFrame(adim);
        else { kayit.hareketli = false; if (sonra) sonra(); }
      }
      requestAnimationFrame(adim);
    }
    function serbestBirak(t) {           // vurgu, ölçek, imleç, kontroller geri
      EGITSEL.durum3B(t.kayit.nesne, "normal");
      t.kayit.nesne.scale.copy(t.olcek);
      hedefVurgula(null);
      imlec("");
      kontrolAc();
    }
    function al(kayit, e, tikla) {
      if (!kayit || kayit.kilitli || kayit.hareketli) return false;
      if (tasinan) geriDon();
      var w = dunyaKonum(kayit.nesne);
      var duzlem = duzlemKur(w);
      var kesisim = new THREE.Vector3(), ofset = new THREE.Vector3();
      if (e && ndcHesapla(e) && ray.ray.intersectPlane(duzlem, kesisim)) ofset.subVectors(w, kesisim);
      tasinan = { kayit: kayit, baslangic: w.clone(), duzlem: duzlem, ofset: ofset,
                  tikla: !!tikla, olcek: kayit.nesne.scale.clone() };
      hoverAyarla(null);
      EGITSEL.durum3B(kayit.nesne, "secili");
      kayit.nesne.scale.copy(tasinan.olcek).multiplyScalar(1.08);
      kontrolKapat();
      imlec("grabbing");
      if (yukselt && !kameraDuzlemi) {
        var y = w.clone();
        y.y += yukselt;
        dunyayaKoy(kayit.nesne, y);
      }
      if (typeof ayar.secildi === "function") ayar.secildi(kayit.veri, kayit.nesne);
      return true;
    }
    function izle(e) {
      if (!tasinan || !ndcHesapla(e)) return;
      var k = new THREE.Vector3();
      if (!ray.ray.intersectPlane(tasinan.duzlem, k)) return;
      k.add(tasinan.ofset);
      if (yukselt && !kameraDuzlemi) k.y = tasinan.baslangic.y + yukselt;
      dunyayaKoy(tasinan.kayit.nesne, k);
      var h = hedefler.length ? vur(hedefler) : null;
      hedefVurgula(h ? h.kayit : null);
    }
    function geriDon() {
      if (!tasinan) return;
      var t = tasinan;
      tasinan = null;
      serbestBirak(t);
      hareket(t.kayit, t.baslangic, function () {
        if (typeof ayar.geriDondu === "function") ayar.geriDondu(t.kayit.veri, t.kayit.nesne);
      });
    }
    function yerles(h, nokta) {
      var t = tasinan;
      if (!t) return;
      var hedefW = h.konum ? h.konum.clone()
                 : (h.noktaya && nokta ? nokta.clone() : dunyaKonum(h.nesne));
      var karar = function (dogru) {
        if (tasinan !== t) return;               // bu arada bırakılmış/alınmış
        if (dogru === false) { geriDon(); return; }
        tasinan = null;
        serbestBirak(t);
        if (kilitle) t.kayit.kilitli = true;
        hareket(t.kayit, hedefW, function () {
          if (typeof ayar.yerlesti === "function") {
            ayar.yerlesti(t.kayit.veri, h.veri, t.kayit.nesne, h.nesne);
          }
        });
      };
      if (typeof ayar.birakildi === "function") ayar.birakildi(t.kayit.veri, h.veri, karar);
      else karar(true);
    }
    function birakDene(e) {
      if (!tasinan) return;
      if (e && ndcHesapla(e)) {
        var h = hedefler.length ? vur(hedefler) : null;
        if (h) { yerles(h.kayit, h.nokta); return; }
        var n = vur(nesneler);
        if (n && n.kayit !== tasinan.kayit && !n.kayit.kilitli) {
          geriDon();
          al(n.kayit, e, true);
          return;
        }
      }
      geriDon();
    }
    function onDown(e) {
      if (e.button !== undefined && e.button !== 0) return;
      if (!ndcHesapla(e)) return;
      var n = tasinan ? null : vur(nesneler);
      basili = { x: e.clientX, y: e.clientY, kayit: (n && !n.kayit.kilitli) ? n.kayit : null };
      if (basili.kayit) { e.preventDefault(); kontrolKapat(); }
    }
    function onMove(e) {
      if (basili && !tasinan && basili.kayit &&
          Math.hypot(e.clientX - basili.x, e.clientY - basili.y) > esik) {
        al(basili.kayit, e, false);            // basılı tut-çek yolu
      }
      if (tasinan) { izle(e); return; }
      if (!ndcHesapla(e)) return;
      var n = vur(nesneler);
      hoverAyarla((n && !n.kayit.kilitli) ? n.kayit : null);
    }
    function onUp(e) {
      var b = basili;
      basili = null;
      if (!b) { kontrolAc(); return; }
      var uzak = Math.hypot(e.clientX - b.x, e.clientY - b.y) > esik;
      if (tasinan && !tasinan.tikla) { birakDene(e); kontrolAc(); return; }   // çekerek geldi
      if (uzak) { kontrolAc(); return; }                                       // orbit vb.
      if (tasinan) { birakDene(e); kontrolAc(); return; }                      // taşırken tıklama
      if (b.kayit) al(b.kayit, e, true);                                       // tıkla → yapış
      kontrolAc();
    }
    function onCancel() {
      basili = null;
      if (tasinan && !tasinan.tikla) geriDon();
      kontrolAc();
    }
    function onKey(e) { if (e.key === "Escape" && tasinan) geriDon(); }
    function bagla(el, ad, f) {
      el.addEventListener(ad, f);
      temizleyiciler.push(function () { el.removeEventListener(ad, f); });
    }
    bagla(kap, "pointerdown", onDown);
    bagla(kap, "pointermove", onMove);
    bagla(kap, "pointerup", onUp);
    bagla(kap, "pointercancel", onCancel);
    bagla(window, "keydown", onKey);

    return {
      tasinan: function () {
        return tasinan ? { veri: tasinan.kayit.veri, nesne: tasinan.kayit.nesne } : null;
      },
      al: function (veri) { return al(bul(nesneler, veri), null, true); },
      hedefeBirak: function (veri) {
        var h = bul(hedefler, veri);
        if (!tasinan || !h) return false;
        yerles(h, null);
        return true;
      },
      birak: function () { geriDon(); },
      kilitle: function (veri, durum) {
        var k = bul(nesneler, veri);
        if (k) k.kilitli = durum !== false;
      },
      sifirla: function () {
        if (tasinan) geriDon();
        hoverAyarla(null);
        for (var i = 0; i < nesneler.length; i++) {
          nesneler[i].kilitli = false;
          nesneler[i].hareketli = false;
          nesneler[i].anim = (nesneler[i].anim || 0) + 1;
          EGITSEL.durum3B(nesneler[i].nesne, "normal");
          dunyayaKoy(nesneler[i].nesne, nesneler[i].ilk);
        }
      },
      yikim: function () {
        if (tasinan) geriDon();
        hoverAyarla(null);
        for (var i = 0; i < temizleyiciler.length; i++) { try { temizleyiciler[i](); } catch (_) {} }
        temizleyiciler = [];
      }
    };
  };
})();

