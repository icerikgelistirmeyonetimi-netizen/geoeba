
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
window.JS_HATA_KAYDET = function (no, e, kaynak) {
  try {
    no = +no || 0;
    var m = (e && (e.message || (e.reason && e.reason.message))) || String(e && e.reason || e || "hata");
    var yer = (e && e.stack && String(e.stack).split("\n").slice(1, 2)[0]) || "";
    if (e && e.lineno) yer = ":" + e.lineno + (e.colno ? ":" + e.colno : "");
    var kayit = (kaynak ? kaynak + " " : "") + String(m).slice(0, 160) + (yer ? " @" + String(yer).trim().slice(0, 80) : "");
    var L = window.__JS_HATALAR__[no] || (window.__JS_HATALAR__[no] = []);
    if (L.indexOf(kayit) < 0 && L.length < 5) L.push(kayit);
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
    /* Nötr tipler (2026-09-26, geoeba parti raporu 7.4.x): bazı sayfalar
       yönlendirmeyi dontVer(kok, "uyari", …) diye veriyor; eskiden her
       bilinmeyen tip «yanlis»a dönüp kırmızı + yanlış sesi basıyordu. */
    if (tip === "uyari" || tip === "bilgi" || tip === "notr" || tip === "ipucu") {
      if (window.SABLON_TOAST) { window.SABLON_TOAST(mesaj); }
      return;
    }
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

  /* ÇOKTAN SEÇMELİ DEĞERLENDİRME MOTORU (2026-09-26, geoeba uzman raporu:
     «değerlendirme soruları kendi içinde ileri-geri yapılamıyor», «sonucu
     gör dediğinde kaç doğru kaç yanlış gösteren ekran çıkmıyor», «baştan
     başlayınca bazı sorular çözülmüş geliyor», «lisede sorular 5 şıklı
     olmalı», «en az 2 seçim hakkı verilmeli, yanlışta hemen doğru cevap
     gelmemeli»). Her değerlendirme sayfası bu mekaniği kendisi yazıyordu ve
     her biri başka eksik taşıyordu; motor TEK doğruluk kaynağıdır.
       EGITSEL.degerlendirme(kok, {
         sorular: [{metin, siklar: [{metin, dogru}], donut}],  // şık sayısı serbest (≤6)
         hak: 2,                // soru başına deneme hakkı
         karistir: true,        // şık sırası (soru başına BİR kez karışır)
         soruDegisti: function (i, soru) {},     // sahneyi soruya eşle
         sahneOnEki: "s7-soru-",  // isteğe bağlı: <g id="s7-soru-K"> grupları etkin soruya göre
                                  // gösterilir/gizlenir (K = 1..n; esk değerlendirme sözleşmesi)
         cevaplandi: function (i, dogruMu, soru) {},
         bitti: function (dogru, toplam) {}
       })
     Arayüz .kontrol-govde / .kontrol-eylem İÇİNE kurulur (içerikleri
     değiştirilir); metin ve şıklar LaTeX içerebilir (MathJax dizilir). */
  degerlendirme: function (kok, ayar) {
    ayar = ayar || {};
    var sorular = (ayar.sorular || []).filter(function (s) { return s && s.siklar && s.siklar.length; });
    var govde = ayar.govde || (kok && kok.querySelector(".kontrol-govde"));
    var eylem = ayar.eylem || (kok && kok.querySelector(".kontrol-eylem"));
    if (!govde || !sorular.length) { console.warn("EGITSEL.degerlendirme: govde/soru yok"); return null; }
    var HAK = Math.max(1, ayar.hak || 2);
    var HARF = ["A", "B", "C", "D", "E", "F"];
    var durum, aktif = 0, sonucEkrani = false;

    function karisik(n) {
      var d = [];
      for (var i = 0; i < n; i++) { d.push(i); }
      if (ayar.karistir === false) { return d; }
      for (var j = d.length - 1; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1)); var t = d[j]; d[j] = d[k]; d[k] = t;
      }
      return d;
    }
    function sifirla() {
      durum = sorular.map(function (s) {
        return { sira: karisik(s.siklar.length), denenen: [], sonuc: "bos" };  // bos|devam|dogru|yanlis
      });
      aktif = 0; sonucEkrani = false;
    }
    function el(etiket, sinif, metin) {
      var e = document.createElement(etiket);
      if (sinif) { e.className = sinif; }
      if (metin !== undefined) { e.innerHTML = metin; }
      return e;
    }
    function diz(kap) {
      try {
        if (window.MathJax && window.MathJax.typesetPromise) { window.MathJax.typesetPromise([kap]); }
        else if (window.MathJax && window.MathJax.typeset) { window.MathJax.typeset([kap]); }
      } catch (e) { /* dizgi hatası etkileşimi durdurmaz */ }
    }
    function sayim() {
      var s = { dogru: 0, yanlis: 0, bos: 0 };
      durum.forEach(function (d) { if (d.sonuc === "dogru") s.dogru++; else if (d.sonuc === "yanlis") s.yanlis++; else s.bos++; });
      return s;
    }
    // SORU BÖLÜMÜ STANDARDI (2026-10-08, kullanıcı: «kimisinde soru sayısı yazıyor kiminde noktalarla
    // ifade edilmiş, standart yok; soru sayısı bölümü alan kullanımı açısından daha efektif olabilir»):
    // numaralı yuvarlaklar panelin BAŞLIK SATIRININ sağına yerleşir (ayrı satır yer kaplamaz);
    // «Soru i / n» yalnız ekran okuyucuya söylenir. Başlık satırı yoksa eski yerinde (deg-ust) kalır.
    function noktalar(ust) {
      var bas = kok.querySelector(".panel-basi .baslik-satiri") || kok.querySelector(".baslik-satiri");
      var eski = bas && bas.querySelector(".soru-sayac");
      if (eski) { eski.remove(); }
      var kap = el("div", "deg-noktalar soru-sayac");
      kap.setAttribute("role", "group");
      kap.setAttribute("aria-label", "Sorular");
      sorular.forEach(function (_, i) {
        var d = durum[i];
        var b = el("button", "deg-nokta soru-nokta tiklanir " + d.sonuc + (i === aktif && !sonucEkrani ? " aktif" : ""), String(i + 1));
        b.type = "button";
        b.setAttribute("aria-label", (i + 1) + ". soru" + (d.sonuc === "dogru" ? ", doğru" : d.sonuc === "yanlis" ? ", yanlış" : ""));
        b.addEventListener("click", function () { git(i); });
        kap.appendChild(b);
      });
      var sr = el("span", "sr-only", sonucEkrani ? "Sonuçlar" : "Soru " + (aktif + 1) + " / " + sorular.length);
      sr.setAttribute("aria-live", "polite");
      kap.appendChild(sr);
      (bas || ust).appendChild(kap);
      if (bas && window.EGITSEL.baslikTekrariniGizle) { window.EGITSEL.baslikTekrariniGizle(bas); }
    }
    function eylemKur(dugmeler) {
      if (!eylem) { return; }
      eylem.innerHTML = "";
      var satir = el("div", "deg-eylem");
      dugmeler.forEach(function (d) {
        var b = el("button", "buton" + (d.birincil ? " birincil" : ""), d.metin);
        b.type = "button";
        if (d.pasif) { b.disabled = true; }
        b.addEventListener("click", d.is);
        satir.appendChild(b);
      });
      eylem.appendChild(satir);
    }
    // Soru sahnesi grupları (sahneOnEki): yalnız etkin sorunun grubu görünür
    function sahneGoster() {
      if (!ayar.sahneOnEki) { return; }
      for (var k = 1; k <= sorular.length; k++) {
        var g = kok.querySelector("#" + ayar.sahneOnEki + k);
        if (g) { g.style.display = k === aktif + 1 ? "" : "none"; }
      }
    }
    function ciz() {
      sonucEkrani = false;
      var soru = sorular[aktif], d = durum[aktif];
      govde.innerHTML = "";
      var kap = el("div", "deg-kap");
      var ust = el("div", "deg-ust");
      noktalar(ust);
      if (ust.childNodes.length) { kap.appendChild(ust); }
      // soru metni kutusuz ve büyük (.soru-metni — yazı standardı)
      kap.appendChild(el("div", "soru-metni deg-metin", soru.metin || ""));
      var liste = el("div", "deg-siklar");
      var bitmis = d.sonuc === "dogru" || d.sonuc === "yanlis";
      d.sira.forEach(function (asilNo, gorunen) {
        var sik = soru.siklar[asilNo];
        var b = el("button", "parca-btn");
        b.type = "button";
        b.appendChild(el("span", "kutucuk", HARF[gorunen] || String(gorunen + 1)));
        b.appendChild(el("span", "", sik.metin));
        var denendi = d.denenen.indexOf(asilNo) > -1;
        if (denendi && !sik.dogru) { b.classList.add("yanlis-secim"); b.disabled = true; }
        if (bitmis) {
          b.disabled = true;
          if (sik.dogru) { b.classList.add("dogru-secim"); }
          else if (!denendi) { b.classList.add("soluk"); }
        }
        b.addEventListener("click", function () { sec(asilNo); });
        liste.appendChild(b);
      });
      kap.appendChild(liste);
      govde.appendChild(kap);
      diz(govde);
      var son = aktif === sorular.length - 1;
      eylemKur([
        { metin: "Önceki", pasif: aktif === 0, is: function () { git(aktif - 1); } },
        // 2. tur uzman notu (7.1.1, 2026-10-06): son soruda düğme «sonraki ekran» değil «Testi Bitir»
        { metin: son ? "Testi Bitir" : "Sonraki", birincil: true,
          is: function () { if (son) { sonuc(); } else { git(aktif + 1); } } }
      ]);
      sahneGoster();
      if (typeof ayar.soruDegisti === "function") {
        try { ayar.soruDegisti(aktif, soru); } catch (e) { console.error("degerlendirme.soruDegisti", e); }
      }
    }
    function sec(asilNo) {
      var soru = sorular[aktif], d = durum[aktif];
      if (d.sonuc === "dogru" || d.sonuc === "yanlis" || d.denenen.indexOf(asilNo) > -1) { return; }
      d.denenen.push(asilNo);
      var dogruMu = !!soru.siklar[asilNo].dogru;
      // 3. tur (6. sınıf genel): iki seçenekli soruda bir yanlıştan sonra doğru cevap gösterilir —
      // hak, yanlış şık sayısını aşmaz; soru başına `hak` verilebilir
      var hak = soru.hak || Math.min(HAK, Math.max(1, soru.siklar.length - 1));
      var kalan = hak - d.denenen.length;
      if (dogruMu) {
        d.sonuc = "dogru";
        window.EGITSEL.dontVer(kok, "dogru", soru.donut || "Doğru seçim.");
      } else if (kalan > 0) {
        d.sonuc = "devam";
        // 2. tur (R17): hak 3 iken ilk yanlışta da «Bir hakkın» diyordu — kalan hakkı yaz
        var KALAN_AD = ["", "Bir", "İki", "Üç", "Dört"];
        window.EGITSEL.dontVer(kok, "yanlis", (KALAN_AD[kalan] || String(kalan)) + " hakkın daha var, tekrar dene.");
      } else {
        d.sonuc = "yanlis";
        window.EGITSEL.dontVer(kok, "yanlis", soru.donut || "Doğru seçenek işaretlendi.");
      }
      ciz();
      if (d.sonuc === "dogru" || d.sonuc === "yanlis") {
        if (typeof ayar.cevaplandi === "function") {
          try { ayar.cevaplandi(aktif, d.sonuc === "dogru", soru); } catch (e) { console.error("degerlendirme.cevaplandi", e); }
        }
      }
    }
    function git(i) {
      if (i < 0 || i >= sorular.length) { return; }
      aktif = i;
      ciz();
    }
    function sonuc() {
      sonucEkrani = true;
      var s = sayim(), n = sorular.length;
      govde.innerHTML = "";
      var kap = el("div", "deg-kap");
      var ust = el("div", "deg-ust");
      ust.appendChild(el("span", "etiket", "Sonuçlar"));
      noktalar(ust);
      kap.appendChild(ust);
      var kutu = el("div", "panel deg-sonuc");
      kutu.appendChild(el("div", "deg-puan buyuk-sayi", s.dogru + " / " + n));
      var sayac = el("div", "deg-sayac");
      sayac.appendChild(el("span", "d", "Doğru: " + s.dogru));
      sayac.appendChild(el("span", "y", "Yanlış: " + s.yanlis));
      sayac.appendChild(el("span", "b", "Boş: " + s.bos));
      kutu.appendChild(sayac);
      kutu.appendChild(el("p", "", s.bos ? "Numaralarına dokunarak boş bıraktığımız sorulara dönebiliriz."
        : (s.dogru === n ? "Harika! Bütün soruları doğru cevapladık." : "Soru numaralarına dokunarak soruları yeniden inceleyebiliriz.")));
      kap.appendChild(kutu);
      govde.appendChild(kap);
      eylemKur([
        { metin: "Soruları İncele", is: function () { git(0); } },
        { metin: "Tekrar Çöz", birincil: true, is: function () { sifirla(); ciz(); } }
      ]);
      if (typeof ayar.bitti === "function") {
        try { ayar.bitti(s.dogru, n); } catch (e) { console.error("degerlendirme.bitti", e); }
      }
    }
    sifirla();
    // Üretim/görsel denetim kancası: window.__BASLANGIC_SORU__ (1 tabanlı) → test o sorudan başlar
    // (soru sırası zaten karışmaz; yalnız şıklar karışır)
    var basla = parseInt(window.__BASLANGIC_SORU__, 10);
    if (basla >= 1 && basla <= sorular.length) { aktif = basla - 1; }
    ciz();
    return { git: git, sonuc: sonuc, sifirla: function () { sifirla(); ciz(); } };
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
   seçenek «düz okunur metin» ile «hiçbir şey» arasındadır.

   KESİR TAM BOY (2026-09-16 kullanıcı bildirimi, MAT.4.1.7 s1): satır içi
   \frac MathJax'ta küçültülmüş kipte çizilir, rakamlar gövde yazısının ~%70'i
   kalıyordu. İlkokul (1-4) matematikte \frac = \dfrac (rakamlar gövde boyunda). */
window.MathJax = { tex: { inlineMath: [["\\(", "\\)"], ["$", "$"]],
                          displayMath: [["\\[", "\\]"], ["$$", "$$"]],
                          macros: /^MAT\.[1-4]\./.test("MAT.4.2.2")
                                  ? { frac: ["\\dfrac{#1}{#2}", 2] } : {} },
                   options: { skipHtmlTags: ["script", "noscript", "style",
                                             "textarea", "pre", "code",
                                             "annotation", "annotation-xml",
                                             "svg"] } };
