
/* Sayfa modülü kayıt defterleri — parça script'lerinden ÖNCE tanımlı olmalı */
window.SAYFA_INIT = {}; window.SAYFA_TAMAM = {};
window.SAYFA_DURAKLAT = {}; window.SAYFA_DEVAM = {};
/* JS ÇALIŞMA ZAMANI HATASI KAYDI (2026-09-06, konum-hataları teşhisi: FIZ.11.4 s22
   tanımsız değişkenle SAYFA_INIT yarıda kaldı, 3B tuval bembeyaz çıktı ve görsel tur
   kareyi KABUL ETTİ — hat hiçbir yerde hatayı dinlemiyordu). Köprünün try/catch'i
   hatayı yutar, window "error" olayı hiç tetiklenmez; bu yüzden kayıt catch'ten
   AÇIKÇA yapılır. Eşzamansız hatalar (rAF döngüsü, olay işleyici, setTimeout)
   global dinleyiciyle o an AKTİF sayfaya yazılır. Denetim betiği (gorsel_denetim)
   sayfanın kaydını okur ve ENGEL bulgusu üretir. İçerik davranışı DEĞİŞMEZ.
   2026-09-11: 2e0036a0'dan taşındı (denetim raporu 6b) — 10.09 17:35 koşusunda bu
   köprü 7 sayfadaki «SAYFA_INIT scene is not defined @at gokKuresi» hatasını görsel
   prompta taşıdı, tur onardı (karne 2,4 → 4,9); HEAD'de köprü yoktu. */
window.__JS_HATALAR__ = {};
/* 2026-09-24 gece (Chrome/WebGL doğrulaması): (1) aynı hata NESNESİ aynı sayfaya
   bir kez yazılır — köprü sayfa kusuru olan WebGL kurulum hatasını kendisi
   kaydedip fırlatır, INIT catch'i onu yine yakalar (çift satır olmasın);
   (2) her kayıt hazır denetimini uyandırır: INIT'i ya da her karesi hata atıp
   hiç çizmeyen 3B sayfa, çizim beklenmeden hazır sayılır (HAZIR SİNYALİ). */
window.JS_HATA_KAYDET = function (no, e, kaynak) {
  try {
    no = +no || 0;
    if (e && typeof e === "object") {
      if (e.__jsKayitNo === no) return;
      try { e.__jsKayitNo = no; } catch (e3) {}
    }
    var m = (e && (e.message || (e.reason && e.reason.message))) || String(e && e.reason || e || "hata");
    var yer = (e && e.stack && String(e.stack).split("\n").slice(1, 2)[0]) || "";
    if (e && e.lineno) yer = ":" + e.lineno + (e.colno ? ":" + e.colno : "");
    // 2026-09-25 (S1): köprünün yapılandırılmış WEBGL kaydı (tuval/yoklama/durum/hata
    // alanları) 160'a sığmıyor — Chrome'un engel iletisi tek başına ~120 karakter.
    var sinir = kaynak === "WEBGL" ? 360 : 160;
    var kayit = (kaynak ? kaynak + " " : "") + String(m).slice(0, sinir) + (yer ? " @" + String(yer).trim().slice(0, 80) : "");
    var L = window.__JS_HATALAR__[no] || (window.__JS_HATALAR__[no] = []);
    if (L.indexOf(kayit) < 0 && L.length < 5) L.push(kayit);
    if (typeof window.SABLON_HAZIR_DENETLE === "function") window.SABLON_HAZIR_DENETLE();
  } catch (e2) {}
};
(function () {
  function aktifNo() {
    var el = document.querySelector(".sayfa.aktif");
    return el ? (+String(el.id).replace("sayfa-", "") || 0) : 0;
  }
  window.addEventListener("error", function (ev) {
    if (ev && ev.target && ev.target !== window && !ev.error && !ev.message) return; // kaynak yükleme hatası (img/script) — JS değil
    window.JS_HATA_KAYDET(aktifNo(), ev.error || ev, "");
  });
  window.addEventListener("unhandledrejection", function (ev) {
    window.JS_HATA_KAYDET(aktifNo(), ev, "promise");
  });
})();
/* HESAP DENETİMİ (2026-09-26, kullanıcı: «çok fazla hata da üretiyor, hesaplama hataları
   vs de var»): sayfa kodu ÇALIŞIR ama ekrana «NaN m/s», «undefined», «[object Object]»
   basar, SVG yolu «M NaN,NaN» olur, 3B nesnenin konumu NaN'a döner ve hiç çizilmez —
   hiçbiri istisna atmaz, görsel denetim bunları görmüyordu. Kayıt «HESAP …» diye JS hata
   defterine düşer (sayfa ve tür başına bir kez); denetim betiği (gorsel_denetim) onu
   «JS ÇALIŞMA ZAMANI HATASI»ndan AYRI «HESAP HATASI» satırı olarak basar (kod durmadı).
   Taranan: etkin sayfanın GÖRÜNÜR metni (kod örneği — code/pre/kbd/samp/textarea —
   sayılmaz) ve SVG geometri öznitelikleri (HESAP_TARA: denetim betiği okumadan hemen önce
   çağırır — o anki ekran ölçülür, geçici ara kare değil), 2B tuvale yazılan metin
   (fillText/strokeText, çizildiği an) ve köprünün 1,5 sn ölçümünde 3B dönüşümler
   (HESAP3B). Sayfanın kendi öz-denetimi de aynı kaynağı kullanır (sözleşme 26):
   JS_HATA_KAYDET(N, new Error("hiz(100,20) = " + v + ", beklenen 5"), "HESAP").
   İçerik davranışı DEĞİŞMEZ. */
(function () {
  var HARF = "0-9A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû_$";
  var GECERSIZ = new RegExp("(^|[^" + HARF + "])(NaN|undefined|-?Infinity|\\[object Object\\])(?![" + HARF + "])");
  var GEOMETRI = ["d", "points", "x", "y", "x1", "y1", "x2", "y2", "cx", "cy", "r", "rx", "ry",
                  "width", "height", "transform"];
  var KOD = /^(CODE|PRE|KBD|SAMP|TEXTAREA|SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/;
  var bildirilen = {};
  function sayfaNo(el) {
    var s = el && el.isConnected && el.closest ? el.closest(".sayfa") : null;
    if (!s) s = document.querySelector(".sayfa.aktif");
    return s ? (+String(s.id).replace("sayfa-", "") || 0) : 0;
  }
  function kaydet(no, tur, metin) {
    if (bildirilen[no + ":" + tur]) return;
    bildirilen[no + ":" + tur] = 1;
    try { window.JS_HATA_KAYDET(no, { message: metin }, "HESAP"); } catch (e) {}
  }
  function kesit(s, i) {
    var bas = Math.max(0, i - 24), son = Math.min(s.length, i + 28);
    return (bas > 0 ? "…" : "") + s.slice(bas, son).replace(/\s+/g, " ").trim() + (son < s.length ? "…" : "");
  }
  function kodda(el) {
    for (; el && el.nodeType === 1; el = el.parentNode) if (KOD.test(el.tagName)) return true;
    return false;
  }
  window.HESAP_TARA = function () {
    var n = 0;
    try {
      var kok = document.querySelector(".sayfa.aktif") || document.body;
      if (!kok) return 0;
      var no = sayfaNo(kok);
      if (GECERSIZ.test(kok.textContent || "")) {
        var w = document.createTreeWalker(kok, 4), t, m;          // 4 = NodeFilter.SHOW_TEXT
        while ((t = w.nextNode())) {
          m = GECERSIZ.exec(t.nodeValue || "");
          if (!m || kodda(t.parentNode) || !t.parentNode.getClientRects().length) continue;
          kaydet(no, "metin", "ekranda «" + m[2] + "»: «" + kesit(t.nodeValue, m.index + m[1].length) + "»");
          n++;
          break;
        }
      }
      var els = kok.querySelectorAll("svg *");
      dis: for (var i = 0; i < els.length && i < 4000; i++) {
        for (var j = 0; j < GEOMETRI.length; j++) {
          var a = els[i].getAttribute(GEOMETRI[j]);
          if (a && /NaN|Infinity|undefined/.test(a) && els[i].getClientRects().length) {
            kaydet(no, "svg", "SVG <" + String(els[i].tagName).toLowerCase() + " " + GEOMETRI[j] +
              "=«" + a.slice(0, 40) + "»> geçersiz koordinat — şekil çizilmez");
            n++;
            break dis;
          }
        }
      }
    } catch (e) {}
    return n;
  };
  // 3B: görünür nesnenin (ve kameranın) dünya matrisi ya da köşe konumları sonlu mu. Köprü ilk
  // çizimden 1,5 sn sonra (KONUM3B ölçümüyle) bir kez çağırır; NaN konumlu nesne hiç çizilmez.
  window.HESAP3B = function (sahne, no, kamera) {
    var bulunan = null;
    function sonlu(dizi, sinir) {
      for (var i = 0, n = Math.min(dizi.length, sinir); i < n; i++) if (!isFinite(dizi[i])) return false;
      return true;
    }
    try {
      if (kamera && kamera.matrixWorld && !sonlu(kamera.matrixWorld.elements, 16)) bulunan = ["kamera", "konum/yön"];
      if (!bulunan && sahne && sahne.traverseVisible) sahne.traverseVisible(function (o) {
        if (bulunan || !(o.isMesh || o.isLine || o.isPoints || o.isSprite)) return;
        var ad = o.name || (o.geometry && o.geometry.type) || o.type;
        if (o.matrixWorld && !sonlu(o.matrixWorld.elements, 16)) { bulunan = [ad, "konum/dönüş/ölçek"]; return; }
        if (o.isInstancedMesh && o.instanceMatrix && !sonlu(o.instanceMatrix.array, 16 * 256)) { bulunan = [ad, "örnek matrisi"]; return; }
        var g = o.geometry, p = g && g.attributes && g.attributes.position;
        if (p && p.array && !sonlu(p.array, 60000)) bulunan = [ad, "köşe konumları"];
      });
      if (bulunan) kaydet(+no || 0, "3b", "3B «" + String(bulunan[0]).slice(0, 40) + "» " + bulunan[1] +
        " NaN/Infinity — nesne çizilmez");
    } catch (e) {}
    return bulunan ? 1 : 0;
  };
  // 2B tuval metni çizildiği an ölçülür (tuval sonradan okunamaz). Metin tuvalin sayfasına yazılır;
  // DOM dışı doku tuvali etkin sayfaya.
  try {
    var C = window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype;
    ["fillText", "strokeText"].forEach(function (ad) {
      var asil = C && C[ad];
      if (typeof asil !== "function") return;
      C[ad] = function (metin) {
        try {
          var s = String(metin);
          if (GECERSIZ.test(s)) kaydet(sayfaNo(this.canvas), "tuval", "tuval yazısı «" + s.slice(0, 48) + "»");
        } catch (e) {}
        return asil.apply(this, arguments);
      };
    });
  } catch (e) {}
})();
/* DOKU TUVALLERİ CPU'DA (2026-09-24, Chrome/WebGL denetimi Y1): kullanıcının
   Chrome 153'ünde GPU süreci Skia metin çiziminde çöküyor (29 döküm, hepsi
   AtlasTextOp.cpp:574). Çökmede GPU'da tutulan 2B tuvallerin pikselleri SİLİNİR;
   three bağlam geri gelince boş tuvali «geri yükler» ve prosedürel dokular
   simsiyah kalır (FB.6.1-b s7: parlaklık 225 → 64, üç doku tuvalinin üçü sıfır).
   DOM'a bağlı OLMAYAN tuval yalnız doku kaynağıdır: willReadFrequently onu CPU'da
   tutar, çökme ona dokunamaz (ölçüldü, köprü onarımıyla birlikte: 225,3 → 225,3).
   Ekrandaki tuvaller GPU'da kalır; sayfanın açıkça verdiği değer her zaman kazanır.
   Parça betiklerinden (ve kütüphanelerden) ÖNCE kurulmalı — bu yüzden burada.
   BOYUT SINIRI (2026-09-24 gece doğrulaması): CPU'daki tuvalin her yüklemesi
   yazılım rasterı + CPU→GPU kopyasıdır; HER KAREDE needsUpdate alan büyük doku
   yavaşlar. Ölçüldü (shell 149 GPU, serpiştirmeli 4 tur, ortanca fps GPU → CPU):
   tek doku 1024²'ye dek fark yok; üç doku 512² 59,5 → 58,6, 1024×512 59,5 →
   49,4, 1024² 59,4 → 28,4 (2048²: 6-8). Bugünkü parçalarda her karede
   güncellenen 4 doku var, hepsi ≤256×128; açık boyutlu 562 doku tuvalinin
   556'sı ≤1024×512 (egitsel3b etiketleri de en çok 1024×512), 6'sı 1024², üstü
   yok. Karar: getContext anında width×height ≤ CPU_TUVAL_SINIR (1024×512
   piksel) olan bağlı olmayan tuval CPU'da; üstü GPU'da kalır (çökmede içeriği
   silinir — her karede çiziyorsa sayfa zaten yeniden çizer; 6 durağan 1024²
   doku bu korumadan çıkar). Ölçü getContext ANINDADIR: önce getContext sonra
   boyut veren tuval 300×150 sayılır. Bekçi: sablon_3b_dayaniklilik_testi.
   WebGL bağlamı istenen tuvale oluşturma hatası dinleyicisi de takılır: Chrome'un
   engel iletisi (statusMessage) three'nin «Error creating WebGL context»inden
   fazlasını söyler; köprü bekçisi (gövde betiği) kayda bunu ekler.
   TUVAL KANITI (2026-09-25, S1 — WebGL tasarımı P5): tuvalin İLK başarılı
   getContext türü ve bağlamı WeakMap'te tutulur; bir tuvalin tek bağlam türü
   olabildiği için bu onun kalıcı türüdür. Köprünün kurulum kaydı bunu taşır
   («tuval=<tür>/<kayip|canli>»): önce 2d açılmış tuval sayfa kusurudur (R3),
   kayıp webgl bağlamlı tuval kaybın ardılıdır (R3b) — «taze tuvalde kurulabiliyor
   → sayfa kodu» yoklaması bu ikisini karıştırıyordu (S1: GPU geri gelince kayıp
   tuvalli çökme «sayfa kusuru» yazılıyordu). OffscreenCanvas'a devredilen tuvalde
   getContext hata fırlatır → «devredildi» (R2). Deneyde ölçüldü (shell 149 +
   Chrome 153): 2d → 2d/canli, iki çökme → webgl/kayip, kayıpta kurulum →
   webgl2/kayip, offscreen → hata. Sayfanın KENDİ WEBGL_lose_context.loseContext()
   çağrısı da işaretlenir (S3): köprünün kayıp kaydı «kaynak=kendi» olur — Python
   bunu kusur saymaz (R7c); işaret olay anında tüketilir. Menzil: çekim hattı
   (panelin boş tuvalde 2d yoklaması hatta yok — tasarım §5.13). */
(function () {
  var G = HTMLCanvasElement.prototype.getContext;
  if (typeof G !== "function") return;
  var CPU_TUVAL_SINIR = 1024 * 512;
  var KANIT = new WeakMap();
  function kayipSar(ctx, tuval) {
    var gE = ctx.getExtension;
    if (typeof gE !== "function") return;
    try {
      ctx.getExtension = function (ad) {
        var x = gE.apply(this, arguments);
        if (x && !x.__kayipSarili && String(ad).toUpperCase() === "WEBGL_LOSE_CONTEXT") {
          try {
            var lc = x.loseContext;
            x.loseContext = function () {
              var k = KANIT.get(tuval);
              if (k) k.kendi = true;
              return lc.apply(this, arguments);
            };
            x.__kayipSarili = true;
          } catch (e) {}
        }
        return x;
      };
    } catch (e) {}
  }
  HTMLCanvasElement.prototype.getContext = function (tip, secenek) {
    if (tip === "2d" && !this.isConnected && this.width * this.height <= CPU_TUVAL_SINIR) {
      secenek = Object.assign({willReadFrequently: true}, secenek || {});
    } else if ((tip === "webgl2" || tip === "webgl" || tip === "experimental-webgl")
               && !this.__glHataDinle) {
      this.__glHataDinle = true;
      this.addEventListener("webglcontextcreationerror", function (ev) {
        window.__GL_OLUSTURMA_HATASI__ = String((ev && ev.statusMessage) || "ileti yok").slice(0, 160);
      });
    }
    var r;
    try {
      r = secenek === undefined ? G.call(this, tip) : G.call(this, tip, secenek);
    } catch (e) {
      if (!KANIT.has(this) && /offscreen/i.test(String(e && e.message))) KANIT.set(this, {tur: "devredildi"});
      throw e;
    }
    if (r && !KANIT.has(this)) {
      KANIT.set(this, {tur: String(tip), ctx: r});
      if (/webgl/.test(String(tip))) kayipSar(r, this);
    }
    return r;
  };
  // {tur: 2d|webgl|webgl2|…|devredildi|yok, kayip: true|false|null}
  window.__TUVAL_KANITI__ = function (c) {
    var k = c && KANIT.get(c);
    if (!k) return {tur: "yok", kayip: null};
    var kayip = null;
    try {
      if (k.ctx && typeof k.ctx.isContextLost === "function") kayip = !!k.ctx.isContextLost();
    } catch (e) { kayip = null; }
    return {tur: k.tur, kayip: kayip};
  };
  // Sayfanın kendi loseContext çağrısı bu tuvalde oldu mu (işaret tüketilir).
  window.__TUVAL_KENDI_KAYIP__ = function (c) {
    var k = c && KANIT.get(c);
    var v = !!(k && k.kendi);
    if (k) k.kendi = false;
    return v;
  };
})();
/* ERTELENMİŞ İŞ SAYACI — HAZIR SÖZLEŞMESİ (2026-09-24, Chrome/WebGL denetimi Y3):
   ertelenmiş her iş (MALZEME3B_OTO ikinci geçişi, KONUM3B.olc, doku/GLB
   yüklemeleri) başlarken window.__BEKLEYEN++, bitince window.__BEKLEYEN--.
   Sayaç erişimcidir: 0'a inince gövdedeki hazır denetimi uyanır ve koşullar
   tamamsa <html data-sahne-hazir="N"> yazılır (ayrıntı gövde betiğinde, HAZIR
   SİNYALİ). Eksiye düşmez — fazladan bir -- sayacı bozamaz. */
(function () {
  var n = 0;
  try {
    Object.defineProperty(window, "__BEKLEYEN", {
      configurable: true, enumerable: true,
      get: function () { return n; },
      set: function (v) {
        v = +v || 0;
        n = v > 0 ? v : 0;
        if (n === 0 && typeof window.SABLON_HAZIR_DENETLE === "function") {
          window.SABLON_HAZIR_DENETLE();
        }
      }
    });
  } catch (e) { window.__BEKLEYEN = 0; }
})();
/* Sesli içerik (2026-08-24): SAYFA_ANLATIM[n] = function(olay){...} — anlatım
   motoru her söylenen kelimede {kelime, indeks, t} ile çağırır; sayfa bununla
   anlatıma senkron kurgular kurabilir. Bildirimsel yol daha kolaydır: sahne
   öğesine data-anlatim-kelime="..." ver, motor o kelime söylenirken öğeyi
   kendiliğinden gösterir (data-anlatim-etki="ciz|vurgula" ile çizim/vurgu). */
window.SAYFA_ANLATIM = {};

/* EGITSEL — projeye özgü küçük yardımcılar (sözleşme 2b: parçalar YALNIZ
   çağırır, yeniden yazmaz). Savunmacı: yanlış kullanımda patlamaz,
   console.warn + zararsız düşüş. */
window.EGITSEL = {
  /* Dönüt: TOAST olarak verilir (kullanıcı kararı 2026-08-15 — sayfa içi
     .durum-bandi kaldırıldı, tüm bildirimler toast'tır). `kok` imzada
     KALIR: 200+ mevcut parça dontVer(kok, ...) diye çağırıyor.
     tip: "dogru" | "yanlis" */
  dontVer: function (kok, tip, mesaj) {
    tip = tip === "dogru" ? "dogru" : "yanlis";
    if (window.SABLON_TOAST) { window.SABLON_TOAST(mesaj, tip); }
    else { console.warn("EGITSEL.dontVer: SABLON_TOAST yok"); }
  },
  /* Tek-seçim grubu: kok üzerinde olay delegasyonu — seçiciyle eşleşen
     öğelere (SONRADAN eklenenler dahil) tıklamada .secili'yi tek öğede
     tutar, cb(el, el.dataset.deger) çağırır. ayarlar.toggle=true ise
     seçili öğeye ikinci tıklama seçimi kaldırır (cb(null, undefined)). */
  secimGrubu: function (kok, secici, cb, ayarlar) {
    if (!kok || !kok.addEventListener) {
      console.warn("EGITSEL.secimGrubu: geçersiz kok");
      return;
    }
    ayarlar = ayarlar || {};
    kok.addEventListener("click", function (ev) {
      var el = ev.target && ev.target.closest ? ev.target.closest(secici) : null;
      if (!el || !kok.contains(el)) { return; }
      if (el.disabled || el.classList.contains("locked")) { return; }
      if (ayarlar.toggle && el.classList.contains("secili")) {
        el.classList.remove("secili");
        if (typeof cb === "function") { cb(null, undefined); }
        return;
      }
      var ogeler = kok.querySelectorAll(secici);
      Array.prototype.forEach.call(ogeler, function (o) { o.classList.remove("secili"); });
      el.classList.add("secili");
      if (typeof cb === "function") { cb(el, el.dataset ? el.dataset.deger : undefined); }
    });
  },
  /* Kilitle/aç: eşleşen buton ve şıkları topluca disabled + .locked yapar.
     kilitli=false ile açar. */
  kilitle: function (kok, secici, kilitli) {
    var ogeler = kok && kok.querySelectorAll ? kok.querySelectorAll(secici) : [];
    Array.prototype.forEach.call(ogeler, function (el) {
      if ("disabled" in el) { el.disabled = kilitli !== false; }
      el.classList.toggle("locked", kilitli !== false);
    });
  },

  /* 2B TUVAL YÜKSEK ÇÖZÜNÜRLÜK (2026-08-17 çözünürlük raporu, P0)
     ---------------------------------------------------------------
     SORUN: <canvas width="970"> yazınca tampon 970 fiziksel pikselde
     donar. Çerçeve 1280×720'yi transform:scale(k) ile büyütüyor; 1920×1080
     pencerede k=1,5 ve DPR 1,25 iken tuval ekranda 1411 CSS px yer kaplıyor,
     gereken fiziksel genişlik 1763 px — ölçülen yeterlilik 0,55. Yani yazılar
     ve çapraz çizgiler yarı çözünürlükte esnetiliyor.

     KULLANIM (parça kodunda, çizimden önce):
       var ctx = EGITSEL.tuvalHazirla(canvas, 970, 630);
     Bundan sonra ÇİZİM MANTIKSAL koordinatta yapılır (0..970, 0..630) —
     tek satır çizim kodu değişmez. Tampon fiziksel piksele kurulur,
     ctx başlangıç dönüşümü ölçeği taşır.

     ⚠ MANTIKSAL BOYUT canvas.width DEĞİLDİR: canvas.width artık FİZİKSEL
     piksel verir. Genişlik gereken yerde hazırlayıcının döndürdüğü
     ctx.mantiksalW / ctx.mantiksalH kullanılır. İşaretçi koordinatı için
     EGITSEL.tuvalNoktasi(canvas, olay) çağrılır.

     Ölçek/DPR değişiminde tampon kendiliğinden yeniden kurulur; tuval
     TEMİZLENDİĞİ için sayfa yeniden çizmelidir — bunun için tuvala
     `yeniden-ciz` olayı gönderilir (rAF ile çizen sayfada gereksiz):
         tuval.addEventListener("yeniden-ciz", ciz);                       */
  tuvalHazirla: function (tuval, mantiksalW, mantiksalH) {
    if (!tuval || !tuval.getContext) { console.warn("tuvalHazirla: tuval yok"); return null; }
    var mw = mantiksalW || tuval.clientWidth || tuval.width || 1;
    var mh = mantiksalH || tuval.clientHeight || tuval.height || 1;
    tuval._mantiksalW = mw; tuval._mantiksalH = mh;
    // Kutu ölçüsü CSS'ten gelmeli; width/height ÖZNİTELİĞİ artık tampon
    // ölçüsüdür ve düzeni belirlememelidir.
    if (!tuval.style.width) { tuval.style.width = "100%"; }
    if (!tuval.style.height) { tuval.style.height = "100%"; }
    var ctx = tuval.getContext("2d");
    window.EGITSEL._tuvalKur(tuval, ctx);
    if (!tuval._olcekBagli) {
      tuval._olcekBagli = true;
      addEventListener("sablon:goruntu-degisti", function () {
        if (!tuval.isConnected) return;
        window.EGITSEL._tuvalKur(tuval, ctx);
        tuval.dispatchEvent(new CustomEvent("yeniden-ciz"));
      });
      // GPU ÇÖKMESİ (2026-09-24, Chrome/WebGL denetimi Y1): ekrandaki 2B tuvalin
      // GPU'daki pikselleri silinir, tarayıcı bağlamı BOŞ ve dönüşümü sıfırlanmış
      // geri verir (contextrestored). Ölçek değişimindeki gibi tampon yeniden
      // kurulur ve sayfadan çizim istenir — olayla çizen sayfa boş kalmaz.
      tuval.addEventListener("contextrestored", function () {
        window.EGITSEL._tuvalKur(tuval, ctx);
        tuval.dispatchEvent(new CustomEvent("yeniden-ciz"));
      });
    }
    return ctx;
  },

  _tuvalKur: function (tuval, ctx) {
    var m = window.SABLON_GORSEL_METRIK
         || {scale: 1, dpr: window.devicePixelRatio || 1};
    var kutu = tuval.getBoundingClientRect();
    // Kutu henüz ölçülemiyorsa (gizli sayfa) mantıksal boyut × etkin oran.
    var cssW = kutu.width || (tuval._mantiksalW * (m.scale || 1));
    var cssH = kutu.height || (tuval._mantiksalH * (m.scale || 1));
    // getBoundingClientRect ZATEN transform'u içerir → ayrıca k ile çarpma.
    var pw = Math.max(1, Math.round(cssW * (m.dpr || 1)));
    var ph = Math.max(1, Math.round(cssH * (m.dpr || 1)));
    var enBuyuk = 8e6;                       // tampon tavanı (~8 MP)
    if (pw * ph > enBuyuk) {
      var s = Math.sqrt(enBuyuk / (pw * ph));
      pw = Math.round(pw * s); ph = Math.round(ph * s);
    }
    if (tuval.width !== pw) { tuval.width = pw; }
    if (tuval.height !== ph) { tuval.height = ph; }
    ctx.setTransform(pw / tuval._mantiksalW, 0, 0, ph / tuval._mantiksalH, 0, 0);
    ctx.mantiksalW = tuval._mantiksalW;
    ctx.mantiksalH = tuval._mantiksalH;
  },

  /* İşaretçi olayını MANTIKSAL tuval koordinatına çevirir. canvas.width
     ARTIK fiziksel pikseldir; eski `e.offsetX * c.width / rect.width`
     hesabı yanlış sonuç verir. */
  tuvalNoktasi: function (tuval, olay) {
    var kutu = tuval.getBoundingClientRect();
    var mw = tuval._mantiksalW || tuval.width;
    var mh = tuval._mantiksalH || tuval.height;
    return {x: kutu.width ? (olay.clientX - kutu.left) * mw / kutu.width : 0,
            y: kutu.height ? (olay.clientY - kutu.top) * mh / kutu.height : 0};
  }
};

/* MathJax yapılandırması — tex-svg gömülmeden ÖNCE tanımlı olmalı.
   Tek-dolar ($...$) varsayılanda kapalıdır; eski üretimler tek-dolar
   kullandığından açıyoruz (2026-08-11 tespiti: MAT.7.4'te 5 sayfa).

   ⚠ SVG ATLANIR (2026-08-18 kullanıcı bildirimi «latex metinler de bozuk
   görünüyor», ölçüldü ve DOM'da doğrulandı): MathJax bir SVG <text> düğümü
   içindeki `\( … \)` ifadesini de tipograflıyor ve yerine <mjx-container>
   koyuyor. mjx-container bir HTML öğesidir; SVG ad alanında BİLİNMEYEN
   öğedir ve tarayıcı onu HİÇ ÇİZMEZ — formül ekrandan tümüyle kayboluyor
   (ölçüm: 15 <text> düğümü, devre şemalarında \(R_1\), \(I_1\) etiketleri).
   Çözüm iki parçalı: (1) MathJax SVG'ye HİÇ girmez — yarım iş yapıp düğümü
   bozmasın; (2) aşağıdaki `svgLatexDuzelt` o metni Unicode'a çevirir
   (R₁, 45°, CO₂). SVG içinde tipografik matematik zaten MÜMKÜN DEĞİLDİR;
   seçenek «düz okunur metin» ile «hiçbir şey» arasındadır. */
window.MathJax = { tex: { inlineMath: [["\\(", "\\)"], ["$", "$"]],
                          displayMath: [["\\[", "\\]"], ["$$", "$$"]] },
                   options: { skipHtmlTags: ["script", "noscript", "style",
                                             "textarea", "pre", "code",
                                             "annotation", "annotation-xml",
                                             "svg"] } };
