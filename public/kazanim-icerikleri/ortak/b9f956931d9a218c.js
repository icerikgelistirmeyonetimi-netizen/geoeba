/* egitsel3b.js — yerel gömme */
/* EGITSEL 3B bileşenleri — sürükle-bırak yuvası ve durum renklendirmesi.
 *
 * GİRİŞ NOKTALARI:
 *   EGITSEL.hayalet3B(mesh, ...)      → 3B NESNE yükü için hayalet/silüet
 *   EGITSEL.yuva3B({...})             → görünmez vuruş alanı + bırakma
 *   EGITSEL.etiketYuvasi3B({...})     → etiket→nesne eşlemesi (dönüt = renk)
 *   EGITSEL.durum3B(nesne, tip)       → nesneyi dogru/yanlis/secili boyar
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
  if (EGITSEL.yuva3B && EGITSEL.etiketYuvasi3B) return; // iki kez gömülse de tek kurulum

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
      return { el: el, nesne: h.nesne, veri: h.veri, etiket: h.etiket,
               gercek: h.gercek, hedefiGizle: h.hedefiGizle !== false,
               dolduruldu: h.dolduruldu, bosaltildi: h.bosaltildi,
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
        return y ? { veri: y.veri, dolu: y.dolu, kaynak: y.kaynak } : null;
      },
      doldur: function (veri, kaynak) {
        var y = yuvalar.filter(function (v) { return v.veri === veri; })[0];
        if (y) EGITSEL._yuvaDoldur(y, kaynak);
      },
      bosalt: function (veri) {
        var y = yuvalar.filter(function (v) { return v.veri === veri; })[0];
        if (y) EGITSEL._yuvaBosalt(y);
      },
      /* ⚠ HEMEN KONUMLANDIR (2026-08-18): `_yuvaBosalt` display'i geri
       * vermiyordu ve yuva bir sonraki RENDER KARESİNE kadar `display:none`
       * kalıyordu. Sürekli rAF döngüsü olan sahnede bu bir kare sürer, ama
       * ON-DEMAND render eden sahnede (yalnız orbit değişince çizen) yuva
       * KALICI olarak görünmez/tıklanamaz kalıyordu. */
      sifirla: function () {
        yuvalar.forEach(EGITSEL._yuvaBosalt);
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
   * gerçek nesne belirir. */
  EGITSEL._yuvaDoldur = function (y, kaynak) {
    if (y.dolu) EGITSEL._yuvaBosalt(y);
    y.dolu = true;
    y.kaynak = kaynak || null;
    y.el.style.display = "none";
    y.el.style.pointerEvents = "none";
    if (y.etiket) y.etiket.style.display = "none";
    if (y.nesne && y.hedefiGizle) y.nesne.visible = false;
    if (y.gercek) y.gercek.visible = true;
    if (typeof y.dolduruldu === "function") y.dolduruldu(y.kaynak, y.veri, y.gercek);
  };

  EGITSEL._yuvaBosalt = function (y) {
    var eskiKaynak = y.kaynak;
    y.dolu = false;
    y.kaynak = null;
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
})();

