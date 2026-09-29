
/* ============ SABİT MEKANİK: yalnız ileri/geri, kilit YOK ============ */
(function () {
  const SAYFA_SAYISI = 9;
  // Yerleşim ayarı montajda yazılır (parcalar/<KOD>/sablon_ayar.json).
  // OTO_GECIS: etkinlik tamamlanınca sonraki sayfaya kendiliğinden geçilir —
  // footer kapalıyken ZORUNLUDUR (başka ileri yolu yok).
  const OTO_GECIS = false;
  const GECIS_SANIYE = 3;      // doğru cevap / açık "bitti" sinyali
  const YANLIS_SANIYE = 6;     // yanlış cevap: doğrusu okunacak kadar bekle

  /* SCORM sahne ölçeği: 1280×720 sabit tasarım, pencereye orantılı sığdırılır.
     ÖLÇEK YAYINI (2026-08-17 çözünürlük raporu): transform:scale(k) yalnız
     GÖRÜNTÜYÜ büyütür — clientWidth ve ResizeObserver ölçüleri CSS düzen
     pikselinde kalır, yani canvas/WebGL büyüdüğünü ANLAYAMAZ ve tarayıcı
     hazır tamponu esneterek büyütür (ölçüm: 1920×1080'de tampon gerekenin
     %53'ü → gözle görülür bulanıklık). Ölçek burada TEK yerden yayımlanır;
     tamponunu k'ya göre kuran her taraf bunu dinler. */
  function olcekle() {
    const k = Math.min(innerWidth / 1280, innerHeight / 720);
    const cerceve = document.getElementById("cerceve");
    cerceve.style.transform = `translate(-50%, -50%) scale(${k})`;
    cerceve.style.setProperty("--sablon-olcek", k);
    const metrik = {scale: k, dpr: window.devicePixelRatio || 1};
    metrik.etkin = metrik.scale * metrik.dpr;      // ekrandaki gerçek piksel/CSS px
    window.SABLON_GORSEL_METRIK = metrik;
    window.dispatchEvent(new CustomEvent("sablon:goruntu-degisti", {detail: metrik}));
  }
  addEventListener("resize", olcekle);
  // DPR yakınlaştırma/ekran değişiminde resize ATMAYABİLİR (tarayıcı farkı):
  // devicePixelRatio'yu media query ile ayrıca izle.
  (function dprIzle() {
    matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
      .addEventListener("change", () => { olcekle(); dprIzle(); }, {once: true});
  })();
  // DOMContentLoaded ZATEN geçmiş olabilir (script gövde sonunda) — o durumda
  // dinleyici hiç tetiklenmez ve çerçeve ölçeksiz kalırdı; hemen bir kez koş.
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", olcekle);
  else olcekle();
  let aktif = 1;
  const baslatilan = new Set();
  let toastZamanlayici = null;

  const sayfaEl = (n) => document.getElementById("sayfa-" + n);

  /* ═══════ BAŞLANGIÇ SAYFASI (D4, 2026-09-24 Chrome/WebGL denetimi) ═══════
     Çekim N. sayfayı isterken şablon DOMContentLoaded'da HER ZAMAN 1. sayfayı
     kuruyordu: 1. sayfanın WebGL bağlamı 246-253 ms'de boşuna açılıyor, hedef
     ancak load'daki tıklamayla kuruluyordu. Çekim hattı gecici.html'e şablondan
     ÖNCE window.__BASLANGIC_SAYFA__=N basar; şablon doğrudan N'yi kurar (sonraki
     yönlendirme tıklaması aynı sayfaya olduğu için gec()'te etkisizdir).
     Bekçinin yenilemesi (aşağıda, Y2) etkin sayfayı sessionStorage'a bırakır:
     öğrenci F5/otomatik yenilemeden sonra kaldığı sayfada açılır. Kayıt yol
     damgalıdır (aynı sekmede başka modül açılırsa uygulanmaz) ve okununca
     silinir. Geçersiz numara 1. sayfaya düşer. */
  const GL_SAYFA_ANAHTAR = "egitsel:gl-sayfa";
  function oturumOku(ad) {
    try { return JSON.parse(sessionStorage.getItem(ad) || "null"); } catch (e) { return null; }
  }
  function oturumYaz(ad, deger) {
    try {
      if (deger == null) sessionStorage.removeItem(ad);
      else sessionStorage.setItem(ad, JSON.stringify(deger));
    } catch (e) { /* erişim yok (sandbox'lı iframe): sessizce geç */ }
  }
  const baslangicSayfasi = (function () {
    let n = Math.floor(+window.__BASLANGIC_SAYFA__ || 0);
    const kayit = oturumOku(GL_SAYFA_ANAHTAR);
    if (kayit) oturumYaz(GL_SAYFA_ANAHTAR, null);
    if (!n && kayit && kayit.yol === location.pathname) n = Math.floor(+kayit.sayfa || 0);
    return n >= 1 && sayfaEl(n) ? n : 1;
  })();
  window.SABLON_BASLANGIC_SAYFA = baslangicSayfasi;   // anlatım motoru da buradan başlar

  /* ═══════ HAZIR SİNYALİ (Y3, 2026-09-24 Chrome/WebGL denetimi) ═══════════
     Çekim hattı bandı sanal zamanda load+500 ms'de okuyordu; MALZEME3B_OTO'nun
     ikinci geçişi ve KONUM3B.olc ise İLK ÇİZİMDEN 1,5 sn sonra koşuyor — çok
     sayfalı montajda EŞ DÜZLEM bulgusu banda 0/5 giriyordu (tek sayfada 5/12).
     Sözleşme (uretici/gorsel_denetim _DENETIM_SCRIPT ile ortak):
       · window.__BEKLEYEN (başlık betiği) — ertelenmiş işler sayacı; köprü
         MALZEME3B_OTO ikinci geçişini, KONUM3B.olc'u ve three yükleyicilerini
         (doku/GLB) kendisi sayar;
       · <html data-sahne-hazir="N"> — AKTİF sayfa N için: load geçti, sayaç 0
         ve (3B sayfaysa) sayfa etkinleştikten sonra en az bir çizim yapıldı.
         3B olmayan sayfa load'da hazırdır. Sayfa değişince öznitelik SİLİNİR ve
         yeni sayfa için yeniden kurulur — okuyan N'yi kendi hedefiyle karşılaştırır.
     İçerik davranışı DEĞİŞMEZ; yalnız bir öznitelik yazılır. */
  const kayitlar = [];            // köprünün renderer kayıtları (THREE yoksa boş kalır)
  let yuklendi = document.readyState === "complete";
  let hazirYazilan = 0;           // data-sahne-hazir'e yazılan sayfa (0 = yok)
  let cizilenSayfa = 0;           // etkinleştikten sonra ilk çizimini almış aktif sayfa
  let hazirZamanli = false;
  // Renderer'ın sayfası: tuval DOM'daysa atası olan .sayfa, değilse kurulduğu INIT'in sayfası.
  function kayitSayfaNo(k) {
    const t = k.r && k.r.domElement;
    const s = t && t.isConnected && t.closest ? t.closest(".sayfa") : null;
    return s ? (+String(s.id).replace("sayfa-", "") || 0) : k.sayfaNo;
  }
  // SAYFANIN CANLI RENDERER'I (2026-09-25, S1 — itiraz doğrulaması K4): etkin sayfanın
  // köprü renderer'larından biri canlıysa «var», hepsi kayıpsa «kayip», hiç yoksa «yok».
  // Çekim hattının denetim betiği <body data-gl-sayfa> yazar; «WebGL hatasını 3B sahneyi
  // silerek düzeltme» itirazı bununla geri alınır. İçerik davranışı değişmez.
  window.__SAYFA_GL__ = function (no) {
    let canli = false, kayip = false;
    kayitlar.forEach((k) => {
      if (kayitSayfaNo(k) !== +no) return;
      try { if (k.r.getContext().isContextLost()) kayip = true; else canli = true; } catch (e) { kayip = true; }
    });
    return canli ? "var" : (kayip ? "kayip" : "yok");
  };
  // Köprünün kendi ertelediği işler sayfasıyla da sayılır: 1. sayfanın 1,5 sn'lik
  // KONUM3B ölçümü, yönlendirilen 2B sayfanın «load'da hazır»ını geciktirmesin
  // (ölçüldü: 1451 ms gecikiyordu). Yükleyici işleri sayfasızdır, hepsini bekletir.
  const sayfaIsleri = new Map();
  function isBasla(no) {
    sayfaIsleri.set(no, (sayfaIsleri.get(no) || 0) + 1);
    window.__BEKLEYEN++;
    return no;
  }
  function isBitti(no) {
    sayfaIsleri.set(no, Math.max(0, (sayfaIsleri.get(no) || 0) - 1));
    window.__BEKLEYEN--;
    hazirZamanla();              // sayaç 0'a inmese de (başka sayfanın işi sürüyor) aktif sayfa hazır olabilir
  }
  // HATALI SAYFA ÇİZİM BEKLEMEZ (2026-09-24 gece doğrulaması): renderer'ı kurup
  // sonra hata atan INIT (FIZ.11.4 s22 sınıfı: tanımsız `ahsapMat`) ya da her
  // karesi render'dan önce patlayan döngü hiç çizmez; bayrak gelmiyor, havuz
  // çekim başına ~25 sn bekleyip «hazır sinyali gelmedi» diye yanıltıcı ALTYAPI
  // notu basıyordu (sentetik montaj: cli 8 sn sanal, havuz 27,5 sn). INIT'i
  // düşen ya da kaydında (KONUM3B ölçümü dışında) hata olan sayfa için ilk çizim
  // şartı kalkar; sayaç şartı sürer. JS_HATA_KAYDET her kayıtta denetimi uyandırır.
  const initDustu = new Set();
  function sayfaHatali(no) {
    if (initDustu.has(no)) return true;
    const L = window.__JS_HATALAR__ && window.__JS_HATALAR__[no];
    // HESAP kaydı (2026-09-26) kod durması değildir: sahne çizilir, ilk çizim beklenir.
    return !!(L && L.some((s) => !/^KONUM3B(\s|$)|^(\S+\s+)?EŞ DÜZLEM|^HESAP(\s|$)/.test(String(s))));
  }
  function hazirDenetle() {
    hazirZamanli = false;
    const no = aktif;
    if (!yuklendi || hazirYazilan === no) return;
    let baskaSayfa = 0;
    sayfaIsleri.forEach((n, s) => { if (s !== no) baskaSayfa += n; });
    if ((+window.__BEKLEYEN || 0) - baskaSayfa > 0) return;
    if (cizilenSayfa !== no && !sayfaHatali(no) && kayitlar.some((k) => kayitSayfaNo(k) === no)) return;
    hazirYazilan = no;
    document.documentElement.dataset.sahneHazir = String(no);
  }
  // Görev sonuna ertelenir: aynı görevdeki gec()/INIT/çizim önce biter, sayaç
  // ++'ları yerini bulur (ilk çizim 1,5 sn'lik işleri ÇİZİMDEN ÖNCE kurar).
  function hazirZamanla() {
    if (hazirZamanli) return;
    hazirZamanli = true;
    setTimeout(hazirDenetle, 0);
  }
  function hazirSifirla() {
    hazirYazilan = 0;
    cizilenSayfa = 0;
    delete document.documentElement.dataset.sahneHazir;
  }
  window.SABLON_HAZIR_DENETLE = hazirZamanla;      // başlıktaki sayaç 0'a inince çağırır
  addEventListener("load", () => { yuklendi = true; hazirZamanla(); });

  /* ═══════ WebGL BAĞLAM BEKÇİSİ (Y2, 2026-09-24 Chrome/WebGL denetimi) ═══════
     Chromium merdiveni (kaynaktan okundu; c2_engel.py / e_uc_cokme.py ile ölçüldü):
       · 1 çökme → bağlamlar kaybolur, 1-2 sn'de geri gelir (köprünün Y1
         onarımı PMREM/küp kamera/gölgeyi yeniden kurar);
       · 2 dk içinde 2 çökme → alan adı 2 dk ENGELLİ: canlı bağlamlar GERİ
         GELMEZ, yeni bağlam kurulamaz («Error creating WebGL context»); engeli
         yalnız TARAYICININ başlattığı gezinme (F5, adres çubuğu) kaldırır —
         JS location.reload() kaldırmaz;
       · 5 dk içinde 3 çökme → GPU süreci --use-gl=disabled açılır, WebGL oturum
         boyu HER YERDE kapalı; yalnız Chrome'u yeniden başlatmak düzeltir.
     Eskiden hiçbirinde mesaj yoktu: saydam tuval sayfa zeminini gösteriyor,
     öğrenci boş bir alan görüyordu. Bekçi:
       · kaybı JS_HATA_KAYDET'e yazar (CONTEXT_LOST — çekim hattı altyapı sayar);
       · 3 sn'de geri gelmezse ya da bağlam hiç kurulamazsa 3B kutunun üstüne
         Türkçe katman koyar: önce «F5'e basın»; F5'ten sonra (sessionStorage
         işareti) hâlâ kurulamıyorsa GPU modu düşmüştür → «Chrome'u kapatıp açın»;
       · etkin sayfada katman varken 10 sn'de bir deneme bağlamı açar ve hemen
         bırakır; açılabiliyorsa engel kalkmıştır → sayfayı saklar ve yeniler
         (en çok 2 kez / 10 dk: kurulum hep düşüyorsa döngüye girmez; çekimde
         hiç yenilemez — kareyi çekim hattı yönetir);
       · INIT bağlam hatasıyla düşen sayfa çekimde «başlatıldı» SAYILMAZ, öğrencide
         dönüşte yenilenir (initOncesi/initSonrasi);
       · kurulum hatası YALNIZ taze tuvalde deneme bağlamı da kurulamıyorsa altyapıdır
         (2026-09-24 gece): kurulabiliyorsa hata sayfanındır (ör. aynı tuvalde önce
         getContext('2d')) — katman, yenileme, «bağlam kurulamadı» kaydı yok (köprü). */
  const GL_UYARI_ANAHTAR = "egitsel:gl-uyari";          // F5 işareti {yol, t}
  const GL_YENILEME_ANAHTAR = "egitsel:gl-yenileme";    // otomatik yenileme anları
  const GL_KAYIP_BEKLE = 3000, GL_DENEME_ARALIK = 10000;
  const GL_YENILEME_SINIR = 2, GL_YENILEME_PENCERE = 600000, GL_UYARI_OMUR = 1800000;
  // Çekim başlığı (gorsel_denetim) __CEKIM__ nesnesini ve __BASLANGIC_SAYFA__'yı basar.
  const CEKIM = !!window.__CEKIM__ || window.__BASLANGIC_SAYFA__ != null;
  // Bu belge açılmadan ÖNCE aynı sekmede uyarı gösterilmiş mi (F5/yenileme sonrası)?
  let oncekiUyari = (function () {
    const u = oturumOku(GL_UYARI_ANAHTAR);
    return !!(u && u.yol === location.pathname && Date.now() - (+u.t || 0) < GL_UYARI_OMUR);
  })();
  const glKatmanlar = new Map();       // hedef öğe (tuval ya da sahne kutusu) → {el, sayfa}
  const glDusenSayfalar = new Set();   // INIT'i sırasında bağlam kurulamayan sayfalar
  let glDenemeZaman = null;

  function glKatmanYerlestir(hedef, k) {
    const kok = k.el.parentNode;
    if (!kok) return;
    if (hedef === kok) {
      Object.assign(k.el.style, {left: "0", top: "0", width: "100%", height: "100%"});
      return;
    }
    const kr = kok.getBoundingClientRect(), hr = hedef.getBoundingClientRect();
    if (!hr.width || !hr.height || !kr.width) return;   // gizli sayfa: etkinleşince yeniden
    // Çerçeve transform:scale ile büyür — ekran pikseli DÜZEN pikseline çevrilir.
    const s = kr.width / (kok.offsetWidth || kr.width) || 1;
    Object.assign(k.el.style, {
      left: (hr.left - kr.left) / s - kok.clientLeft + kok.scrollLeft + "px",
      top: (hr.top - kr.top) / s - kok.clientTop + kok.scrollTop + "px",
      width: hr.width / s + "px", height: hr.height / s + "px"});
  }
  function glKatmanlariYerlestir() { glKatmanlar.forEach((k, hedef) => glKatmanYerlestir(hedef, k)); }
  addEventListener("sablon:sayfa-degisti", glKatmanlariYerlestir);
  addEventListener("sablon:goruntu-degisti", glKatmanlariYerlestir);

  function glKatmanGoster(hedef, no) {
    let k = glKatmanlar.get(hedef);
    if (!k) {
      const el = document.createElement("div");
      el.className = "sablon-3b-uyari";
      el.setAttribute("role", "alert");
      const metin = oncekiUyari
        ? ["3B sahne bu oturumda açılamıyor",
           "Tarayıcının grafik desteği kapandı. Chrome'u kapatıp yeniden açın "
           + "(adres çubuğuna chrome://restart yazabilirsiniz)."]
        : ["3B sahne şu an gösterilemiyor",
           "Grafik işlemcisi yeniden başladı. Sayfayı yenilemek için klavyeden F5'e basın."];
      const b = document.createElement("b");
      b.textContent = metin[0];
      const s = document.createElement("span");
      s.textContent = metin[1];
      el.append(b, s);
      k = {el: el, sayfa: no};
      glKatmanlar.set(hedef, k);
    }
    const kok = (hedef.closest && hedef.closest(".sayfa")) || sayfaEl(no)
             || document.getElementById("cerceve") || document.body;
    if (k.el.parentNode !== kok) kok.appendChild(k.el);
    glKatmanYerlestir(hedef, k);
    // F5 işareti + dönülecek sayfa: yenilemeden sonra bağlam yine kurulamazsa
    // metin ikinci basamağa geçer; öğrenci her durumda aynı sayfada açılır.
    oturumYaz(GL_UYARI_ANAHTAR, {yol: location.pathname, t: Date.now()});
    oturumYaz(GL_SAYFA_ANAHTAR, {yol: location.pathname, sayfa: aktif});
    if (!glDenemeZaman) glDenemeZaman = setInterval(glDene, GL_DENEME_ARALIK);
  }
  function glKatmanKaldir(hedef) {
    const k = glKatmanlar.get(hedef);
    if (!k) return;
    k.el.remove();
    glKatmanlar.delete(hedef);
    if (!glKatmanlar.size) {
      clearInterval(glDenemeZaman);
      glDenemeZaman = null;
      oturumYaz(GL_SAYFA_ANAHTAR, null);
    }
  }
  // Bağlam kuruldu: uyarı işareti eskidi — sonraki arıza yine «F5» ile başlar.
  function glKuruldu() {
    oncekiUyari = false;
    oturumYaz(GL_UYARI_ANAHTAR, null);
  }
  // Taze 1×1 tuvalde deneme bağlamı: kurulabiliyorsa tarayıcı WebGL veriyor (engel
  // yok, GPU modu düşmemiş). Hemen bırakılır: 16 bağlam sınırından yer yemesin.
  // glDene ve köprünün kurulum hatası ayrımı (sayfa kusuru mu, altyapı mı) kullanır.
  function glYoklama() {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      const x = gl && gl.getExtension("WEBGL_lose_context");
      if (x) x.loseContext();
      return !!gl;
    } catch (e) { return false; }
  }
  function glDene() {
    if (document.hidden || CEKIM) return;
    // Yalnız ETKİN sayfada katman varken: başka sayfada çalışan öğrenciyi yenileme bölmesin.
    let etkinde = false;
    glKatmanlar.forEach((k) => { if (k.sayfa === aktif) etkinde = true; });
    if (!etkinde) return;
    if (!glYoklama()) return;        // engel sürüyor ya da GPU modu düştü
    const simdi = Date.now(), eski = oturumOku(GL_YENILEME_ANAHTAR);
    const anlar = (Array.isArray(eski) ? eski : []).filter((t) => simdi - t < GL_YENILEME_PENCERE);
    if (anlar.length >= GL_YENILEME_SINIR) return;
    anlar.push(simdi);
    oturumYaz(GL_YENILEME_ANAHTAR, anlar);
    oturumYaz(GL_SAYFA_ANAHTAR, {yol: location.pathname, sayfa: aktif});
    location.reload();
  }

  /* INIT'in ÇEVRESİ (gec + DOMContentLoaded; INIT çağrısı ve catch'i iki yerde de
     eskisi gibi durur). baslatilan INIT'ten ÖNCE işaretlenir (INIT içinden gec()
     gibi yeniden girişe karşı); INIT WebGL bağlamı kuramadıysa (hata fırlattı ya da
     köprü düştüğünü gördü — sayfa hatayı kendi yutsa bile) 3B kutusunda bekçi
     katmanı durur (Y2; eskiden sayfa bir daha hiç denenmiyordu). Başka hata
     (tanımsız değişken vb.) işareti geri ALMAZ: yarım kalan INIT'i her ziyarette
     yeniden koşmak DOM'u çoğaltırdı; hata zaten kayıtta ve denetim bandında.
     YENİDEN DENEME YALNIZ ÇEKİMDE AYNI BELGEDE (2026-09-24 gece doğrulaması):
     INIT'in 19/450'si renderer'dan ÖNCE dinleyici/DOM kuruyor — aynı belgede
     yeniden koşunca işleyiciler ikileniyordu (FB.8.4 s16: tek «Kontrol»
     tıklaması iki dontVer, iki toast). Öğrencide işaret geri ALINMAZ: katman
     durur, sayfaya dönülünce bekçi deneme bağlamı açar ve kurulabiliyorsa
     sayfayı YENİLER (glDene; en çok 2 kez / 10 dk). Çekimde (__CEKIM__ /
     __BASLANGIC_SAYFA__) yenileme yok: işaret geri alınır, INIT sonraki
     ziyarette aynı belgede yeniden denenir. */
  let initSayfasi = 0;          // INIT'i şu an koşan sayfa (köprü düşüşü buna yazar)
  function initOncesi(no, el) {
    baslatilan.add(no);
    initDustu.delete(no);
    glKatmanKaldir(el.querySelector(".bolum.sahne") || el);   // önceki denemenin katmanı
    initSayfasi = no;
    return glDusenSayfalar.delete(no);          // true: bu bir yeniden deneme
  }
  function initHatasi(no, e) {
    initDustu.add(no);                          // hazır sinyali çizim beklemesin
    // 2026-09-25 (S1): köprünün sayfa kusuru saydığı kurulum hatası (tuvalde önce 2d,
    // devredilmiş tuval, taze tuvalde WebGL var) katman/yenileme açmaz.
    if (/WebGL context/i.test(String(e && e.message)) && !(e && e.__glSayfaKusuru)) glDusenSayfalar.add(no);
  }
  function initSonrasi(no, el, yenidenDeneme) {
    initSayfasi = 0;
    if (glDusenSayfalar.has(no)) {
      if (CEKIM) baslatilan.delete(no);
      glKatmanGoster(el.querySelector(".bolum.sahne") || el, no);
    } else if (yenidenDeneme) {
      // Yeniden deneme tuttu: önceki «bağlam kurulamadı» kayıtları artık yanlış
      // (denetim bandı onları «sayfa kodu durdu» diye okurdu) — yalnız onlar silinir.
      // 2026-09-25 (S1): yapılandırılmış kurulum kaydı da (hatası «precision» olsa bile).
      const L = window.__JS_HATALAR__[no];
      if (L) window.__JS_HATALAR__[no] = L.filter((s) => !/WebGL context|^WEBGL KURULUM /i.test(s));
    }
  }

  /* ==== LaTeX → DÜZ METİN (kullanıcı bildirimi 2026-08-18: «latex metinler
     de bozuk görünüyor») ==================================================
     MathJax'ın YETİŞEMEDİĞİ İKİ YER var; oralarda ham `\( … \)` ekrana düşer.
     Ölçüldü (cikti/ altındaki güncel çıktılar):
       · DÖNÜT TOAST'I — metin textContent ile yazılır, MathJax hiç çağrılmaz:
         79 dontVer mesajı LaTeX içeriyor (41 dosya). «\( \ge 85 \)» aynen
         böyle okunuyordu.
       · SVG <text> DÜĞÜMÜ — MathJax çıktısı <mjx-container> HTML'idir, SVG
         içine geçersizdir; tipograflama MÜMKÜN DEĞİL: 15 düğüm («\(R_1\)»).
     Çözüm MEKANİKTİR (durum bandı sökmesi gibi, sablon.py `_durum_bandini_sok`):
     diskteki 200+ parça YENİDEN ÜRETİLMEDEN düzelir. Kapsam bilinçli olarak
     dar — sayfaların gerçekten kullandığı komutlar. Tanınmayan komutta ters
     bölü düşer, AD KALIR: sessizce yutmaktansa okunur kalıntı bırakılır. */
  const LATEX_KOMUT = {
    times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓", ast: "*",
    ne: "≠", neq: "≠", le: "≤", leq: "≤", ge: "≥", geq: "≥",
    approx: "≈", equiv: "≡", sim: "~", propto: "∝", infty: "∞",
    circ: "°", degree: "°", percent: "%",
    to: "→", rightarrow: "→", longrightarrow: "→", Rightarrow: "⇒",
    implies: "⇒", leftarrow: "←", Leftarrow: "⇐", leftrightarrow: "↔",
    Leftrightarrow: "⇔", uparrow: "↑", downarrow: "↓",
    cdots: "…", ldots: "…", dots: "…",
    alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", zeta: "ζ",
    eta: "η", theta: "θ", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν",
    xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", chi: "χ",
    psi: "ψ", omega: "ω", Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ",
    Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
    sum: "Σ", prod: "Π", int: "∫", partial: "∂", nabla: "∇",
    angle: "∠", perp: "⊥", parallel: "∥", triangle: "△",
    in: "∈", notin: "∉", subset: "⊂", supset: "⊃", cup: "∪", cap: "∩",
    emptyset: "∅", forall: "∀", exists: "∃", therefore: "∴", because: "∵"
  };
  const LATEX_UST = {"0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶",
                     "7":"⁷","8":"⁸","9":"⁹","+":"⁺","-":"⁻","=":"⁼",
                     "(":"⁽",")":"⁾","n":"ⁿ","i":"ⁱ","°":"°"};
  const LATEX_ALT = {"0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆",
                     "7":"₇","8":"₈","9":"₉","+":"₊","-":"₋","=":"₌",
                     "(":"₍",")":"₎","a":"ₐ","e":"ₑ","i":"ᵢ","k":"ₖ","m":"ₘ",
                     "n":"ₙ","o":"ₒ","p":"ₚ","r":"ᵣ","s":"ₛ","t":"ₜ","x":"ₓ"};

  /* Tümü eşleşirse Unicode simge, biri bile eşleşmezse işaretçiyi düz bırak
     (`_max` → «_max»): yarım çevrilmiş «ₘax» okunmaz olurdu. */
  function latexSimge(govde, tablo, isaret) {
    let cikti = "";
    for (const h of govde) {
      if (!tablo[h]) { return isaret + govde; }
      cikti += tablo[h];
    }
    return cikti;
  }

  function latexDuz(metin) {
    let s = metin == null ? "" : String(metin);
    if (s.indexOf("\\") < 0 && s.indexOf("$") < 0) { return s; }   // hızlı çıkış
    /* ÇİFT TERS BÖLÜ: sözleşme madde 19 «JS dizesinde ters bölü ÇİFT yazılır»
       diyor; kimi parça bunu HTML gövdesine de uyguluyor ve çalışma anında
       `\\(` kalıyor (ölçüldü: BIY/KIM çıktıları). Düz metne çevirirken çift
       ters bölü TEKe iner — yoksa aşağıdaki desenlerin hiçbiri tutmaz. */
    s = s.replace(/\\\\/g, "\\");
    s = s.replace(/\\[([]\s*/g, "").replace(/\s*\\[)\]]/g, "");     // \( \) \[ \]
    s = s.replace(/\$\$([\s\S]{1,200}?)\$\$/g, "$1");   // $$…$$ blok
    s = s.replace(/\$([^$\n]{1,120})\$/g, "$1");        // $…$ satır içi
    s = s.replace(/\\text(?:bf|it|rm|sf|tt)?\s*\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\(?:mathrm|mathbf|mathit|operatorname)\s*\{([^{}]*)\}/g, "$1");
    s = s.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "$1/$2");
    s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)");
    s = s.replace(/\\(?:left|right|big|Big|displaystyle|limits)\b/g, "");
    s = s.replace(/\\(?:quad|qquad|thinspace|;|:|,|!)/g, " ");
    s = s.replace(/\\([%$&#_{}])/g, "$1");              // kaçırılmış özel karakter
    /* Komuttan sonraki boşluk YUTULMAZ: LaTeX'te ayraçtır ama düz metinde
       kelime arasıdır — yutulunca «45° ve» → «45°ve» oluyordu. */
    s = s.replace(/\\([a-zA-Z]+)/g, (t, ad) =>
      LATEX_KOMUT[ad] !== undefined ? LATEX_KOMUT[ad] : ad);
    s = s.replace(/\^\{([^{}]*)\}|\^(\S)/g, (t, a, b) =>
      latexSimge(a !== undefined ? a : b, LATEX_UST, "^"));
    s = s.replace(/_\{([^{}]*)\}|_(\S)/g, (t, a, b) =>
      latexSimge(a !== undefined ? a : b, LATEX_ALT, "_"));
    s = s.replace(/[{}]/g, "");
    return s.replace(/[ \t]{2,}/g, " ");
  }

  /* SVG <text>/<tspan> içindeki LaTeX sayfa açılırken düz metne çevrilir.
     mjx-container MathJax'ın KENDİ çıktısıdır — asla dokunulmaz. */
  function svgLatexDuzelt(kok) {
    if (!kok || !kok.querySelectorAll) { return; }
    kok.querySelectorAll("svg text, svg tspan").forEach((el) => {
      if (el.closest("mjx-container")) { return; }
      el.childNodes.forEach((d) => {
        if (d.nodeType !== 3) { return; }
        const yeni = latexDuz(d.nodeValue);
        if (yeni !== d.nodeValue) { d.nodeValue = yeni; }
      });
    });
  }

  /* ==== DÖNÜT KISALTMA (kullanıcı kararı 2026-08-18) ====================
     Şikayet: «dönüt bildirimlerinde dönütler aşırı uzun geliyor; ‹daha
     dikkatli olmalısın› şeklinde dönüt olmalı, kısa bir bilgi verilebilir».
     Ölçüldü: mevcut çıktılarda dontVer mesajları 150-250 karakter.
     Toast doğru/yanlışı ZATEN renk + ikon + başlıkla söylüyor; mesajın işi
     TEK kısa bilgi vermek. Kısaltma ŞABLONDA yapılır çünkü diskteki parçalar
     uzun metinle yazılmış — yeniden üretim beklemeden düzelirler. Senaryo
     promptu (uretici/senaryo.py) ayrıca kısaltıldı: yeni içerik kısa doğar. */
  const DONUT_BASLIK = { dogru: "Doğru!", yanlis: "Daha dikkatli ol" };
  const DONUT_SINIRI = 80;          // başlıktan sonraki bilgi payı (karakter)
  /* Baştaki tebrik/azar kalıbı: ikon + başlık bunu ZATEN söylüyor, metinde
     tekrarı yalnız yer kaplar. En çok iki kalıp sökülür — ölçülen en uzun
     yığın «Tebrikler! Doğru cevap. …» idi. */
  const OVGU = "(?:harikasın|harika|tebrikler|mükemmel|bravo|süper|aferin|"
    + "çok iyi|çok güzel|tam isabet|ne yazık ki|maalesef|üzgünüm|olmadı|"
    + "dikkat|doğru cevap|yanlış cevap|doğru seçim|yanlış seçim|doğru|yanlış|"
    + "evet|hayır)";
  const DONUT_DOLGU = new RegExp("^\\s*" + OVGU + "\\s*[!.,:;…]+\\s*", "i");
  /* Övgü CÜMLESİ («Mükemmel çoklu modelleme!», «Harika veri analizi!»): övgü
     sözcüğüyle açılan KISA cümle. Kelime sınırı `\b` ile aranmaz — Türkçe
     «yanlış» ş ile biter ve \b orada tutmaz; bunun yerine ardından harf
     GELMEMESİ istenir. */
  const DONUT_OVGU = new RegExp("^\\s*" + OVGU
    + "(?![a-zA-ZçğıöşüÇĞİÖŞÜ])[^.!?]{0,26}[.!?…]+\\s*", "i");

  function donutKisalt(mesaj) {
    let m = latexDuz(mesaj).replace(/\s+/g, " ").trim();
    m = m.replace(DONUT_DOLGU, "").replace(DONUT_DOLGU, "");
    /* Övgü cümlesi yalnız ARKASINDA başka cümle varsa düşer: tek cümlelik
       «Doğru cevap C şıkkıdır.» övgü değil BİLGİdir, atılırsa toast boşalır. */
    const ovgusuz = m.replace(DONUT_OVGU, "");
    if (ovgusuz && ovgusuz !== m) { m = ovgusuz; }
    const son = m.search(/[.!?](\s|$)/);     // ilk cümle yeter
    if (son > -1) { m = m.slice(0, son + 1); }
    if (m.length > DONUT_SINIRI) {
      const bosluk = m.lastIndexOf(" ", DONUT_SINIRI);
      m = m.slice(0, bosluk > 40 ? bosluk : DONUT_SINIRI)
           .replace(/[\s,;:.]+$/, "") + "…";
    }
    return m;
  }

  /* ═══════════ 🔊 Dönüt sesi (kullanıcı isteği 2026-08-19) ═══════════
     Kanca toast()'un İÇİNDEDİR, EGITSEL.dontVer'de DEĞİL — iki gerekçe:
       · dontVer'i oto_gecis bloğu zaten sarmalıyor (asilDontVer), ikinci bir
         sarmalama sıra bağımlılığı doğururdu;
       · ses ile toast AYNI ANDA çıkar. Çağrıların ~%3'ü animasyon zincirinin
         ucunda; ses başka yere takılsaydı senkron kayması görünür olurdu.
     Tip kapısı bedava süzgeç: doğrudan SABLON_TOAST çağrılarının TAMAMI
     tipsizdir (ölçüldü: 0/740), yani nötr uyarılar kendiliğinden sessiz kalır.
     Parçalar HİÇBİR ŞEY bilmez, sözleşmeye sıfır bayt eklenir.

     ⚠ OTOMATİK OYNATMA: gerçek tarayıcıda ölçüldü — jest olmadan play()
     NotAllowedError verir ve `muted` ile ön ısıtma DA reddedilir. Tek çalışan
     yol, sesi ilk GERÇEK dokunuşun içinde bir kez açmaktır (aşağıda kilitAc).
     LMS çapraz-origin iframe'inde allow="autoplay" yoksa yine engellenir; o
     yüzden her yol sessizce başarısız olur — dönüt ASLA ses yüzünden bozulmaz. */
  const sesCal = (function () {
    const kaynak = window.SABLON_SES;
    if (!kaynak || !window.Audio) return function () {};

    let acik = true, sonCalma = 0;
    const calgi = {};
    try {
      for (const tip in kaynak) {
        calgi[tip] = new Audio(kaynak[tip]);
        calgi[tip].preload = "auto";
        // Efekt dosyaları -16 LUFS'a eşitlendi (26.08), anlatımla aynı hedef.
        // 0.8 kazanç onları anlatımın ~1,8 dB altında tutar: vurgu sesi
        // içeriğin önüne geçmez. Efektler yeniden düzeylenirse burası da bakılır.
        calgi[tip].volume = 0.8;
      }
    } catch (e) { return function () {}; }

    /* Tercih: file:// origin'i TÜM yerel dosyalarca paylaşılır → ad alanlı
       anahtar. Okuma ve yazma AYRI try/catch: görsel denetim turu çıktıyı
       file:// ile açıyor, buradan sızacak bir istisna TÜM turu düşürürdü. */
    const ANAHTAR = "egitsel:ses";
    try {
      const kayit = localStorage.getItem(ANAHTAR);
      if (kayit !== null) acik = kayit === "1";
    } catch (e) { /* erişim yok — bellekteki varsayılan geçerli */ }

    function tercihYaz() {
      try { localStorage.setItem(ANAHTAR, acik ? "1" : "0"); } catch (e) {}
    }

    // İlk gerçek dokunuşta sesi aç. Yakalama fazı + once: sayfanın kendi
    // işleyicisi olayı yutsa bile buraya uğrar ve dinleyici kendini söker.
    function kilitAc() {
      for (const tip in calgi) {
        const c = calgi[tip], sesi = c.volume;
        c.volume = 0;
        const s = c.play();
        if (s && s.then) {
          s.then(() => { c.pause(); c.currentTime = 0; c.volume = sesi; })
           .catch(() => { c.volume = sesi; });
        } else { c.pause(); c.currentTime = 0; c.volume = sesi; }
      }
    }
    const kilitSec = { capture: true, once: true };
    document.addEventListener("pointerdown", kilitAc, kilitSec);
    document.addEventListener("keydown", kilitAc, kilitSec);

    function cal(tip) {
      const c = calgi[tip];
      if (!acik || !c) return;
      const simdi = Date.now();
      if (simdi - sonCalma < 120) return;   // aynı işleyicide çift dönüt freni
      sonCalma = simdi;
      for (const b in calgi) {              // çapraz tetikte ötekini sustur
        if (b !== tip && !calgi[b].paused) {
          calgi[b].pause(); calgi[b].currentTime = 0;
        }
      }
      try {
        c.currentTime = 0;
        const s = c.play();
        if (s && s.catch) s.catch(function () {});   // jest/izin yoksa sessiz
      } catch (e) { /* yut */ }
    }

    // Düğme #cerceve'ye eklenir: banner/footer kapalı modüllerde de yaşar.
    const cerceve = document.getElementById("cerceve");
    if (cerceve) {
      const d = document.createElement("button");
      d.id = "ses-dugme";
      d.type = "button";
      d.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
        + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
        + '<path d="M11 5 6 9H2v6h4l5 4z"/>'
        + '<path class="dalga" d="M15.5 8.5a5 5 0 0 1 0 7"/>'
        + '<path class="kapali-cizgi" d="M22 9l-6 6M16 9l6 6"/></svg>';
      const etiketle = () => {
        d.setAttribute("aria-pressed", acik ? "true" : "false");
        d.title = acik ? "Dönüt sesi açık — kapatmak için tıkla"
                       : "Dönüt sesi kapalı — açmak için tıkla";
        d.setAttribute("aria-label", d.title);
      };
      etiketle();
      d.addEventListener("click", () => {
        acik = !acik;
        tercihYaz();
        etiketle();
        // Açınca kısa bir örnek duyur: düğmeye basmak zaten bir jesttir,
        // kilit beklemeye gerek yok — izin yoksa cal() sessizce düşer.
        if (acik) cal("dogru");
      });
      cerceve.appendChild(d);
    }
    return cal;
  })();

  /* ═══════ ANLATIM SESSİZLİĞİ (kullanıcı şikayeti 2026-08-26) ═══════════
     «seslendirme çalışırken etkinlik yapılıyor, yapılırken doğru yanlış
     dönütleri gelmeye devam ediyor … şablon ses çalıştığında dönütleri
     kapatmalıydı» + «ses efektleri de çalışmamalı».

     NEDEN ŞABLONDA: sözleşme sayfalara «anlatım çalarken öğrenci girişini
     kilitle» diyor (bkz. sayfa_uretici.py, OTOMATİK GÖSTERİM bendi) ama
     uyum ÖLÇÜLDÜ — FİZ.10.3 modülünde 23 sayfanın 5'i (3, 9, 11, 19, 20)
     hiç kilitlemiyor. Kural üretilen içerikte yaşadığı sürece delik her
     koşuda yeniden açılıyor. Kapı bu yüzden şablonda: doğru/yanlış dönütün
     TEK boğazı toast()'tur (EGITSEL.dontVer de buraya iner), ses efekti de
     onun içinden çalınır — biri susarsa ikisi birden susar.

     DÜŞÜRMEZ, BEKLETİR: öğrenci anlatım sürerken cevapladıysa tıklamayı
     karşılıksız bırakmak daha kötü olurdu. Anlatım durunca/bitince SON
     bekleyen dönüt ses dahil verilir — hap erteleme kalıbının aynısı
     (bkz. bekleyenTamam).

     GÖSTERİ DÖNÜTÜ DÜŞER: anlatıma senkron gösteri (SAYFA_ANLATIM kancası)
     kendi kendine dontVer çağırırsa öğrenci hiçbir şey cevaplamamıştır;
     onu bekletip sonradan «Doğru!» demek yanlış bilgi olur. Ayrım son
     GERÇEK jestin yaşıyla yapılır — jest yoksa dönüt sessizce düşer. */
  const JEST_PENCERESI = 2000;    // ms: dönütü doğuran dokunuş bu kadar taze olmalı
  let sonJest = -Infinity, bekleyenDonut = null;
  const jestKaydet = () => { sonJest = performance.now(); };
  document.addEventListener("pointerdown", jestKaydet, {capture: true, passive: true});
  document.addEventListener("keydown", jestKaydet, {capture: true});

  /* tip (isteğe bağlı): "dogru" | "yanlis" — dönüt toast'ı renklenir, ikon
     ve kısa başlık alır; mesaj kısaltılır. Tipsiz çağrı (nazik uyarı)
     KISALTILMAZ: o zaten tek cümlelik yönlendirmedir. */
  function toast(mesaj, tip) {
    const t = document.getElementById("toast");
    if ((tip === "dogru" || tip === "yanlis") && window.SABLON_ANLATIM_CALIYOR) {
      // Öğrenci tetiklediyse beklet; gösteri tetiklediyse düşür. Atama
      // KOŞULLU: gösteri dönütü, bekleyen ÖĞRENCİ dönütünü ezmemeli.
      if (performance.now() - sonJest < JEST_PENCERESI) {
        bekleyenDonut = {mesaj: mesaj, tip: tip, sayfa: aktif};
      }
      return;
    }
    t.textContent = "";
    if (tip === "dogru" || tip === "yanlis") {
      sesCal(tip);                 // ses ile toast aynı anda — bkz. yukarısı
      t.setAttribute("data-tip", tip);
      const govde = document.createElement("span");
      const baslik = document.createElement("b");
      baslik.textContent = DONUT_BASLIK[tip];
      govde.appendChild(baslik);
      const bilgi = donutKisalt(mesaj);
      if (bilgi) {
        const satir = document.createElement("span");
        satir.textContent = bilgi;
        govde.appendChild(satir);
      }
      t.appendChild(govde);
    } else {
      t.removeAttribute("data-tip");
      t.textContent = latexDuz(mesaj);
    }
    t.classList.add("gorunur");
    clearTimeout(toastZamanlayici);
    toastZamanlayici = setTimeout(() => t.classList.remove("gorunur"),
                                  tip === "yanlis" ? 4200 : 2600);
  }
  window.SABLON_TOAST = toast;

  /* Sayfa değişince dönüt EKRANDA KALMAZ (kullanıcı kararı 2026-08-18:
     «sonraki butonuna tıkladığımda görünmeye devam etmemeli»). Zamanlayıcı
     da iptal edilir: yoksa eski sayfanın sayacı YENİ sayfada toast kapatır
     ve o sayfanın kendi dönütünü erken siler. */
  function toastGizle() {
    clearTimeout(toastZamanlayici);
    toastZamanlayici = null;
    bekleyenDonut = null;       // bekleyen dönüt de yeni sayfaya TAŞINMAZ
    const t = document.getElementById("toast");
    if (t) { t.classList.remove("gorunur"); }
  }

  /* Anlatım susunca (duraklat ya da bitiş) bekleyen dönüt verilir. Sayfa
     kimliği sınanır: gec() toastGizle ile zaten temizliyor ama sayfa
     değişimi ses.pause() de tetikliyor — iki yoldan biri sıralama değiştirse
     eski sayfanın dönütü yenisinde patlamasın. */
  window.addEventListener("sablon:anlatim-durum", (e) => {
    if (e.detail.caliyor || !bekleyenDonut) return;
    const b = bekleyenDonut;
    bekleyenDonut = null;
    if (b.sayfa === aktif) { toast(b.mesaj, b.tip); }
  });

  const PENCERE = 4;  // bannerda aynı anda görünen nokta sayısı

  function noktalariGuncelle() {
    const noktalar = [...document.querySelectorAll(".adim-nokta")];
    noktalar.forEach((b) => {
      const n = +b.dataset.sayfa;
      b.classList.toggle("aktif", n === aktif);
      b.classList.toggle("tamam", n !== aktif && baslatilan.has(n));
    });
    if (SAYFA_SAYISI > PENCERE) {
      const bas = Math.min(Math.max(aktif - 1, 1), SAYFA_SAYISI - PENCERE + 1);
      noktalar.forEach((b) => {
        const n = +b.dataset.sayfa;
        b.classList.toggle("gizli", n < bas || n >= bas + PENCERE);
      });
      // "…" yalnız o yönde GİZLİ sayfa varsa görünür (kullanıcı kuralı).
      // Banner kapalıysa bu düğmeler HİÇ YOKTUR → ?. ile sessiz geçilir.
      document.getElementById("adim-uc-bas")?.classList.toggle("gorunur", bas > 1);
      document.getElementById("adim-uc")
        ?.classList.toggle("gorunur", bas + PENCERE - 1 < SAYFA_SAYISI);
    }
    document.querySelectorAll("#adim-menu button").forEach((b) => {
      const n = +b.dataset.sayfa;
      b.classList.toggle("aktif", n === aktif);
      b.classList.toggle("tamam", n !== aktif && baslatilan.has(n));
    });
  }

  function menuKur() {
    if (SAYFA_SAYISI <= PENCERE) return;
    const menu = document.getElementById("adim-menu");
    if (!menu) return;                 // banner kapalı → adım menüsü de yok
    menu.innerHTML = [...document.querySelectorAll(".adim-nokta")].map((b) =>
      `<button data-sayfa="${b.dataset.sayfa}"><span class="menu-no">${b.dataset.sayfa}</span>`
      + `<span class="menu-baslik">${b.title || ""}</span><span class="menu-durum"></span></button>`
    ).join("");
    // ERİŞİLEBİLİRLİK: açıcılar aria-expanded taşır, Escape kapatır ve odağı
    // açan butona geri verir, açılınca odak ilk menü öğesine geçer.
    let acan = null;
    const menuDurum = (acik) => document.querySelectorAll(".adim-uc")
      .forEach((uc) => uc.setAttribute("aria-expanded", acik ? "true" : "false"));
    const menuKapat = () => { menu.classList.remove("acik"); menuDurum(false); };
    menu.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => {
        gec(+b.dataset.sayfa);
        menuKapat();
      }));
    document.querySelectorAll(".adim-uc").forEach((uc) =>
      uc.addEventListener("click", (e) => {
        e.stopPropagation();
        const acik = menu.classList.toggle("acik");
        menuDurum(acik);
        if (acik) { acan = uc; menu.querySelector("button")?.focus(); }
      }));
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target)) menuKapat();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("acik")) {
        menuKapat();
        acan?.focus();
      }
    });
  }

  function gec(n) {
    if (n < 1 || n > SAYFA_SAYISI || n === aktif) return;
    const eski = aktif;
    toastGizle();               // önceki sayfanın dönütü yeni sayfaya TAŞINMAZ
    sayfaEl(aktif).classList.remove("aktif");
    // YAŞAM DÖNGÜSÜ (rapor P1): SAYFA_DURAKLAT/SAYFA_DEVAM defterleri baştan
    // beri tanımlıydı ama ŞABLON HİÇ ÇAĞIRMIYORDU — kanca kaydeden sayfa bile
    // duraklamıyordu. Sözleşme bunu vaat ediyorsa şablon çağırmak zorundadır.
    if (typeof SAYFA_DURAKLAT[eski] === "function") {
      try { SAYFA_DURAKLAT[eski](sayfaEl(eski)); }
      catch (e) { console.error("SAYFA_DURAKLAT[" + eski + "]", e); }
    }
    aktif = n;
    hazirSifirla();             // hazır sinyali yeni sayfa için sıfırdan (INIT'in çizimi sayılsın)
    const el = sayfaEl(aktif);
    el.classList.add("aktif");

    if (!baslatilan.has(aktif)) {
      const yeniden = initOncesi(aktif, el);   // Y2: bağlam kuramazsa sonraki ziyarette yeniden
      if (typeof SAYFA_INIT[aktif] === "function") {
        // 2026-09-11 (2e0036a0, rapor 6b): catch yutuyordu, köprü hatayı sayfaya yazar
        try { SAYFA_INIT[aktif](el); } catch (e) { console.error("SAYFA_INIT[" + aktif + "]", e); window.JS_HATA_KAYDET(aktif, e, "SAYFA_INIT"); initHatasi(aktif, e); }
      }
      initSonrasi(aktif, el, yeniden);
    } else if (typeof SAYFA_DEVAM[aktif] === "function") {
      // DEVAM yalnız ZATEN başlatılmış sayfada anlamlı: ilk açılışta
      // SAYFA_INIT sahneyi kurar, üstüne devam çağırmak çift başlatma olur.
      try { SAYFA_DEVAM[aktif](el); }
      catch (e) { console.error("SAYFA_DEVAM[" + aktif + "]", e); window.JS_HATA_KAYDET(aktif, e, "SAYFA_DEVAM"); }
    }
    svgLatexDuzelt(el);         // INIT'in çizdiği SVG metinleri de kapsanır
    // Sayfa numarası banner/footer'da olabilir ya da hiç olmayabilir
    const durum = document.getElementById("sayfa-durum");
    if (durum) durum.textContent = aktif + " / " + SAYFA_SAYISI;
    noktalariGuncelle();
    // ERİŞİLEBİLİRLİK: odak yeni sayfaya taşınır (section tabindex="-1"
    // montajdan gelir) — ekran okuyucunun bağlamı değişir, sayfa değişimini
    // aria-live'lı #sayfa-durum duyurur. preventScroll: kaydırma zıplamasın.
    el.focus?.({ preventScroll: true });
    otoSifirla();               // yeni sayfa → tamamlanma sinyali sıfırdan
    // Sayfa değişimi GENEL kancası (2026-08-24, sesli içerik): anlatım motoru
    // ve ileride başka dinleyiciler sayfa geçişini buradan öğrenir — parça
    // defterlerine (SAYFA_*) dokunmadan, çift sayaç riski olmadan.
    window.dispatchEvent(new CustomEvent("sablon:sayfa-degisti",
                                         {detail: {sayfa: aktif, eski: eski}}));
    // Bekçi katmanı duruyorsa F5 dönüşü öğrencinin ŞİMDİKİ sayfasına olsun; katmanlı
    // sayfaya dönüldüyse deneme 10 sn beklemez (öğrencide INIT aynı belgede yeniden
    // koşmaz — bağlam kurulabiliyorsa sayfa yenilenir, bkz. initSonrasi).
    if (glKatmanlar.size) {
      oturumYaz(GL_SAYFA_ANAHTAR, {yol: location.pathname, sayfa: aktif});
      if (!CEKIM) setTimeout(glDene, 0);
    }
    hazirZamanla();
    // Yeni sayfa açılınca tuval ve 3B tamponlarını gerçek kutu ölçüsüne eşitle
    requestAnimationFrame(() => {
      if (window.SABLON_GORSEL_METRIK) {
        window.dispatchEvent(new CustomEvent("sablon:goruntu-degisti", {detail: window.SABLON_GORSEL_METRIK}));
      }
      window.dispatchEvent(new Event("resize"));
    });
  }
  window.SABLON_GEC = gec;

  // Footer kapalıysa bu düğmeler yoktur — bağlama sessizce atlanır.
  document.getElementById("onceki-buton")?.addEventListener("click", () => gec(aktif - 1));
  document.getElementById("sonraki-buton")?.addEventListener("click", () => gec(aktif + 1));
  document.querySelectorAll(".adim-nokta").forEach((b) =>
    b.addEventListener("click", () => gec(+b.dataset.sayfa)));
  document.addEventListener("keydown", (e) => {
    // ERİŞİLEBİLİRLİK (denetim 2026-08-24): ok tuşlarının KENDİ anlamı olan
    // denetimlerde sayfa çevrilmez — kaydırıcıyı (range) klavyeyle kullanan
    // öğrenci istemeden sayfa atlıyordu. Sayfa scripti e.preventDefault()
    // çağırdıysa da karışılmaz.
    if (e.defaultPrevented) return;
    const h = e.target;
    if (h && h.closest && h.closest(
      'input, textarea, select, [contenteditable="true"], [role="slider"], ' +
      '[role="spinbutton"], [role="listbox"], [role="menu"], [role="radiogroup"]')) return;
    if (e.key === "ArrowRight") gec(aktif + 1);
    if (e.key === "ArrowLeft") gec(aktif - 1);
  });

  /* ============ OTOMATİK GEÇİŞ (oto_gecis) ============================
     Sorun: footer kapatılınca "Sonraki" düğmesi kalmıyor; ileri gitmenin
     yolu etkinliğin BİTTİĞİNİ anlamaktan geçiyor. Sinyaller (ilki açık,
     diğerleri var olan içerikle de çalışsın diye):
       1. window.SABLON_TAMAM(N)  → sayfa "bitti" der (sözleşmede tanımlı)
       2. EGITSEL.dontVer(kok, "dogru", …) → doğru dönüt bandı gösterildi
       3. EGITSEL.kilitle(kok, seçici, true) → etkileşim topluca kilitlendi
     YANLIŞ POZİTİF FRENİ: sinyal geçişi ANINDA yapmaz, GERİ SAYIM başlatır.
     Çok soruluk sayfada öğrenci sıradaki soruya dokununca sayım İPTAL olur
     (dinleyici YAKALAMA fazında: iptal, sayımı başlatan sinyalden önce
     çalışır, kendini iptal etmez). Son dokunuştan sonra sayım tamamlanır.
     İptalden sonra hap "Devam ▸" olarak KALIR: öğrenci hiçbir durumda
     kilitli kalmaz. Son sayfada hap hiç görünmez. */
  let otoHap = null, otoZaman = null, otoKalan = 0;

  function otoHapKur() {
    otoHap = document.createElement("button");
    otoHap.id = "oto-gecis";
    otoHap.type = "button";
    otoHap.innerHTML = '<span class="sayim"></span><span>Devam</span>'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"'
      + ' stroke-linecap="round" stroke-linejoin="round" style="width:1em;height:1em;">'
      + '<path d="M9 5l7 7-7 7"/></svg>';
    otoHap.addEventListener("click", () => gec(aktif + 1));
    document.getElementById("cerceve").appendChild(otoHap);
  }

  function otoSayimDurdur() {                 // sayım iptal, hap görünür kalır
    clearInterval(otoZaman);
    otoZaman = null;
    otoHap?.classList.remove("sayiyor");
  }

  function otoSifirla() {                     // sayfa değişti → hap gizlensin
    otoSayimDurdur();
    otoHap?.classList.remove("gorunur");
  }

  // Sesli içerik (2026-08-24 kullanıcı şikayeti: «tebrik modalı anlatım
  // sırasında gelip duruyor»): anlatım ÇALARKEN tamamlanma sinyali hap
  // GÖSTERMEZ — bekletilir, anlatım durunca/bitince işlenir.
  let bekleyenTamam = null;
  window.addEventListener("sablon:anlatim-durum", (e) => {
    if (!e.detail.caliyor && bekleyenTamam) {
      const b = bekleyenTamam; bekleyenTamam = null;
      otoTamamlandi(b[0], b[1]);
    }
  });
  function otoTamamlandi(n, sure) {
    if (!OTO_GECIS || !otoHap) return;
    if (n !== undefined && +n !== aktif) return;   // başka sayfanın sinyali
    if (aktif >= SAYFA_SAYISI) return;             // son sayfa: gidecek yer yok
    if (window.SABLON_ANLATIM_CALIYOR) { bekleyenTamam = [n, sure]; return; }
    otoHap.classList.add("gorunur", "sayiyor");
    otoKalan = sure || GECIS_SANIYE;
    otoHap.querySelector(".sayim").textContent = otoKalan;
    clearInterval(otoZaman);
    otoZaman = setInterval(() => {
      otoKalan -= 1;
      if (otoKalan <= 0) { otoSayimDurdur(); gec(aktif + 1); return; }
      otoHap.querySelector(".sayim").textContent = otoKalan;
    }, 1000);
  }
  // Sayfa parçaları için açık API (sözleşme madde 2g)
  window.SABLON_TAMAM = otoTamamlandi;

  if (OTO_GECIS) {
    otoHapKur();
    // Sayfaya dokunuş = etkinlik sürüyor → sayımı iptal et. YAKALAMA fazı
    // şart: normal fazda, sinyali doğuran tıklamanın kendisi sayımı iptal
    // ederdi (önce içerik dontVer der, sonra bizim dinleyici çalışırdı).
    const sayfalarEl = document.getElementById("sayfalar");
    sayfalarEl.addEventListener("pointerdown", otoSayimDurdur, true);
    document.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") otoSayimDurdur();
    }, true);
    // Var olan içerik SABLON_TAMAM çağırmaz; EGITSEL sarmalanır.
    // `sonDonutYanlis`: yanlış cevapta şıklar kilitlenip DOĞRUSU gösteriliyor
    // (sözleşme 2e) — 3 sn o düzeltmeyi okumaya yetmez, sayım uzatılır.
    let sonDonutYanlis = false;
    const asilDontVer = window.EGITSEL.dontVer;
    window.EGITSEL.dontVer = function (kok, tip, mesaj) {
      const sonuc = asilDontVer.apply(this, arguments);
      sonDonutYanlis = tip !== "dogru";
      if (!sonDonutYanlis) otoTamamlandi();
      return sonuc;
    };
    const asilKilitle = window.EGITSEL.kilitle;
    window.EGITSEL.kilitle = function (kok, secici, kilitli) {
      const sonuc = asilKilitle.apply(this, arguments);
      // Kilit AÇILDIYSA etkinlik sürüyor demektir (animasyon/tur arası kilit):
      // sayım durur, yoksa geçiş öğrencinin ortasında olur.
      if (kilitli === false) { otoSayimDurdur(); return sonuc; }
      otoTamamlandi(undefined, sonDonutYanlis ? YANLIS_SANIYE : GECIS_SANIYE);
      return sonuc;
    };
  }

  window.addEventListener("DOMContentLoaded", () => {
    // D4 (2026-09-24): çekimin istediği / yenilemeden dönülen sayfa, yoksa 1.
    const ilk = sayfaEl(baslangicSayfasi) || document.querySelector(".sayfa");
    if (ilk) {
      const no = +ilk.id.replace("sayfa-", "") || 1;
      aktif = no;
      ilk.classList.add("aktif");
      const yeniden = initOncesi(no, ilk);
      if (typeof SAYFA_INIT[no] === "function") {
        try { SAYFA_INIT[no](ilk); } catch (e) { console.error("SAYFA_INIT[" + no + "]", e); window.JS_HATA_KAYDET(no, e, "SAYFA_INIT"); initHatasi(no, e); }
      }
      initSonrasi(no, ilk, yeniden);
      svgLatexDuzelt(ilk);
      // Montaj göstergeyi «1 / N» basar; başka sayfada açıldıysa o sayfayı söylesin.
      const durum = document.getElementById("sayfa-durum");
      if (durum && no !== 1) durum.textContent = no + " / " + SAYFA_SAYISI;
    }
    menuKur();
    noktalariGuncelle();
  });

  // ---- 3B araç köprüsü (panel için; içerik davranışını DEĞİŞTİRMEZ) ----
  // Üretilen sayfalarda kamera SAYFA_INIT kapanışında `const` olarak durur ve
  // dışarıdan erişilemez. Bu köprü her render çağrısının kullandığı kamerayı
  // window.SAHNE3B'ye yazar; panel kamera açısını böyle okuyabilir.
  //
  // ⚠ PROTOTİP YAMASI ÇALIŞMAZ: bu three.js sürümünde `render`, prototipte
  // DEĞİL örneğin KENDİ ÜZERİNDE tanımlı (kurucu içinde atanıyor) ve prototipi
  // gölgeliyor. Bu yüzden KURUCU sarmalanır; `prototype` aktarıldığı için
  // `instanceof THREE.WebGLRenderer` çalışmaya devam eder (sınandı).
  if (typeof THREE !== "undefined" && THREE.WebGLRenderer) {
    const AsilRenderer = THREE.WebGLRenderer;

    /* ---- ÇÖZÜNÜRLÜK DÜZELTMESİ (2026-08-17 raporu, P0) -------------------
       Sayfalar `setPixelRatio(min(devicePixelRatio, 2))` yazıyor; bu ÇERÇEVE
       ÖLÇEĞİNİ (k) görmez. 1280×720 sahne 1920×1080 pencerede k=1,5 ile
       büyütülünce WebGL tamponu gerekenin 1/k'sı kadar kalıyor, üstüne
       ResizeObserver de transform'u ölçmediği için hiç tetiklenmiyor.
       ÖLÇÜM (21642, 1920×1080, DPR 1,25): tampon 822×571, gereken 1541×1071
       → yeterlilik 0,53 (piksel sayısında %28). Düzeltme İÇERİKTE değil
       BURADA yapılır: köprü zaten her renderer'ı sarıyor, etkin oranı da o
       hesaplar — 48 mevcut three.js sayfası tek satır değişmeden düzelir. */
    const MAKS_PIKSEL = 8e6;        // GPU tampon tavanı (~8 MP)
    // SSAA çarpanı (2026-09-11, ölçüldü): MSAA 4× DPR 1 ekranda ince metal boru/halka
    // siluetinde 4 kademeli basamak bırakıyor (DPR 2'de yarıya iniyor; MSAA örneklemi
    // bağlam özniteliğiyle artmıyor, Chrome 4 verir). DPR·ölçek < 1,5 iken tampon bu
    // kat büyük çizilir, tarayıcı küçültür; 8 MP bütçesi ve 3 tavanı yine geçerli.
    // Bedel: DPR 1'de ~2,25× fragment yükü — zayıf GPU'da FPS düşerse 1 yap.
    const SSAA_CARPANI = 1.5;
    // (kayitlar yukarıda, HAZIR SİNYALİ bölümünde tanımlı: THREE'siz montajda da okunur.)

    function etkinOran(kayit) {
      const m = window.SABLON_GORSEL_METRIK
             || {scale: 1, dpr: window.devicePixelRatio || 1};
      const ekranOrani = (m.dpr || 1) * (m.scale || 1);
      const istenen = ekranOrani < 1.5 ? ekranOrani * SSAA_CARPANI : ekranOrani;  // SSAA (2026-09-11)
      const w = kayit.w || 1, h = kayit.h || 1;
      const butce = Math.sqrt(MAKS_PIKSEL / Math.max(1, w * h));
      // Alt sınır 0,75: bütçe taşsa bile sahne ekrandakinden çok kabalaşmasın.
      return Math.max(0.75, Math.min(istenen, 3, butce));
    }

    function oraniUygula(kayit) {
      if (!kayit.w || !kayit.h) return;           // setSize henüz çağrılmadı
      const oran = etkinOran(kayit);
      if (Math.abs(oran - (kayit.sonOran || 0)) < 0.01) return;
      kayit.sonOran = oran;
      kayit.ickullanim = true;                    // sarmalayıcı özyinelemesin
      try { kayit.asilSetPixelRatio(oran); } finally { kayit.ickullanim = false; }
    }

    // Ölçek/DPR değişince tüm CANLI renderer'ların tamponu yeniden kurulur.
    // Kopmuş canvas'lar (sayfa yıkıldı) listeden düşer.
    addEventListener("sablon:goruntu-degisti", () => {
      for (let i = kayitlar.length - 1; i >= 0; i--) {
        const k = kayitlar[i];
        if (!k.r.domElement || !k.r.domElement.isConnected) { kayitlar.splice(i, 1); continue; }
        oraniUygula(k);
        // Kamera en-boy oranı DEĞİŞMEZ (mantıksal boyut sabit), bu yüzden
        // updateProjectionMatrix gerekmez; yalnız tampon büyür.
      }
    });

    /* ═══════ BAĞLAM GERİ GELİNCE SAHNE ONARIMI (Y1, 2026-09-24 Chrome/WebGL denetimi) ═══════
       three r155 bağlam geri gelince dokuları KAYNAK görüntüden yeniden yükler; render
       target İÇERİĞİNİ (PMREM ortam haritası, küp kamera, gölge haritası) üretemez —
       uygulamaya özgü durumu uygulama kurar (three #5507/#11435, MDN
       webglcontextrestored). Ölçüldü (FB.6.1-b s7, tek GPU çökmesi): PMREM'in payı
       225,2 → 184,2, doku tuvalleriyle birlikte 64,3; hiçbir hata kaydı yoktu.
       Kapsam: 444 3B sayfanın 173'ünde PMREM (kurallar m16), 289'unda tuval dokusu.
         (a) PMREM üreticisinin fromScene/fromEquirectangular/fromCubemap çağrıları
             kaydedilir (renderer, kaynak, sigma, near, far, çıktı hedefi);
         (b) three'nin kendi dinleyicisinden SONRA koşan webglcontextrestored
             işleyicisi haritayı AYNI hedefe yeniden üretir — sahne, malzeme ve
             sayfa kapanışındaki doku başvuruları olduğu gibi geçerli kalır; hedef
             boyu uymazsa yeni hedef üretilir ve eski→yeni eşlemeyle
             scene.environment/background ve malzeme dokuları değiştirilir;
         (c) BİR KEZ güncellenen küp kameralar (CubeCamera) yeniden çekilir —
             kendi dokusunu yansıtan ayna o an gizlenir (geri besleme döngüsü);
         (d) shadowMap.needsUpdate = true (autoUpdate=false sayfa gölgeyi başka
             türlü hiç yeniden çizmez);
         (e) döngüsüz (talep üzerine çizen) sayfa için son kare bir kez çizilir.
       Doku tuvalleri başlık betiğinde CPU'ya alındı; ikisi birlikte s7'de
       225,3 → 225,3 (fark 0,00), s16'da fark 1,36/255 (kaynağı animasyon). */
    const pmremKayit = [];          // {r, tur, kaynak, sigma, near, far, rt}
    const PMREM_KAYIT_SINIR = 24;   // her karede yeniden üreten sayfa belleği şişirmesin
    const kupKayit = new Map();     // CubeCamera → {r, sahne}: son update çağrısı
    let kupAsil = null;
    const PM = THREE.PMREMGenerator && THREE.PMREMGenerator.prototype;
    const pmremAsil = PM && typeof PM.fromScene === "function"
      ? {sahne: PM.fromScene, es: PM.fromEquirectangular, kup: PM.fromCubemap} : null;
    function pmremHedefBagla(k, rt) {
      k.rt = rt;
      // Sayfa hedefi bırakınca kayıt da düşer.
      rt.addEventListener("dispose", function birak() {
        rt.removeEventListener("dispose", birak);
        const i = pmremKayit.indexOf(k);
        if (k.rt === rt && i >= 0) pmremKayit.splice(i, 1);
      });
    }
    function pmremKaydet(uretec, tur, kaynak, ek, rt) {
      if (!rt || !rt.texture || !uretec || !uretec._renderer) return;
      const k = {r: uretec._renderer, tur: tur, kaynak: kaynak,
                 sigma: ek[0], near: ek[1], far: ek[2], rt: null};
      pmremHedefBagla(k, rt);
      pmremKayit.push(k);
      if (pmremKayit.length > PMREM_KAYIT_SINIR) pmremKayit.shift();
    }
    if (pmremAsil) {
      PM.fromScene = function (sahne, sigma, near, far) {
        const rt = pmremAsil.sahne.apply(this, arguments);
        pmremKaydet(this, "sahne", sahne, [sigma, near, far], rt);
        return rt;
      };
      [["es", "fromEquirectangular"], ["kup", "fromCubemap"]].forEach(([tur, ad]) => {
        const asil = pmremAsil[tur];
        if (typeof asil !== "function") return;
        PM[ad] = function (doku, hedef) {
          const rt = asil.apply(this, arguments);
          // Hedefli çağrı var olan haritanın TAZELENMESİDİR (three'nin iç önbelleği
          // böyle çağırır); ilk kayıt yeter.
          if (!hedef) pmremKaydet(this, tur, doku, [], rt);
          return rt;
        };
      });
    }
    if (THREE.CubeCamera && typeof THREE.CubeCamera.prototype.update === "function") {
      kupAsil = THREE.CubeCamera.prototype.update;
      THREE.CubeCamera.prototype.update = function (renderer, sahne) {
        kupKayit.set(this, {r: renderer, sahne: sahne});
        return kupAsil.apply(this, arguments);
      };
    }

    // Haritayı AYNI hedefe yeniden üretir: iç _allocateTargets (r155) ara hedefleri
    // yine kurar, çıktı olarak eski hedefi döndürür. İç ad yoksa ya da boy uymazsa
    // yeni hedef döner — çağıran eşlemeyle başvuruları değiştirir.
    function pmremYeniden(k) {
      const g = new THREE.PMREMGenerator(k.r);
      const ayir = g._allocateTargets;
      if (typeof ayir === "function") {
        g._allocateTargets = function () {
          const yeni = ayir.apply(this, arguments);
          if (yeni && yeni.width === k.rt.width && yeni.height === k.rt.height) {
            yeni.dispose();
            return k.rt;
          }
          return yeni;
        };
      }
      try {
        return k.tur === "sahne" ? pmremAsil.sahne.call(g, k.kaynak, k.sigma, k.near, k.far)
                                 : pmremAsil[k.tur].call(g, k.kaynak);
      } finally { g.dispose(); }
    }
    function dokulariDegistir(kayit, esle) {
      (kayit.sahneler || []).forEach((s) => {
        if (esle.has(s.environment)) s.environment = esle.get(s.environment);
        if (esle.has(s.background)) s.background = esle.get(s.background);
        s.traverse((o) => {
          const ms = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
          for (const m of ms) {
            for (const ad in m) {
              const d = m[ad];
              if (d && d.isTexture && esle.has(d)) { m[ad] = esle.get(d); m.needsUpdate = true; }
            }
          }
        });
      });
    }
    function kupYeniden(kk, v) {
      const hedef = kk.renderTarget, s = v.sahne;
      if (!hedef || !s || typeof s.traverse !== "function") return;
      const doku = hedef.texture, gizli = [];
      s.traverse((o) => {
        if (!o.visible || !o.material) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        if (ms.some((m) => m && m.envMap === doku)) { o.visible = false; gizli.push(o); }
      });
      try { kupAsil.call(kk, v.r, s); }
      catch (e) { console.warn("küp kamera onarımı", e); }
      finally { gizli.forEach((o) => { o.visible = true; }); }
    }
    function sahneyiOnar(kayit) {
      const r = kayit.r;
      try { if (r.getContext().isContextLost()) return; } catch (e) { return; }
      const esle = new Map();
      for (const k of pmremKayit.slice()) {
        if (k.r !== r) continue;
        try {
          const eski = k.rt, rt = pmremYeniden(k);
          if (rt && rt !== eski) { esle.set(eski.texture, rt.texture); pmremHedefBagla(k, rt); }
        } catch (e) { console.warn("PMREM onarımı", e); }
      }
      if (esle.size) dokulariDegistir(kayit, esle);
      // Gölge haritası küp kameradan ÖNCE de tazelenir: yoksa küp yüzleri boş (sıfır
      // derinlikli) haritayla çizilir ve yansımadaki zemin tümden gölgede kalır.
      const golgeTazele = () => { try { if (r.shadowMap) r.shadowMap.needsUpdate = true; } catch (e) {} };
      golgeTazele();
      if (kupAsil) kupKayit.forEach((v, kk) => { if (v.r === r) kupYeniden(kk, v); });
      golgeTazele();
      if (kayit.cizSahne) { try { r.render(kayit.cizSahne, kayit.cizKamera); } catch (e) {} }
      window.__GL_ONARIM__ = (window.__GL_ONARIM__ || 0) + 1;   // teşhis/kabul sayacı
    }

    // Y2 bekçisinin renderer tarafı (katman/deneme/yenileme yukarıda, IIFE kapsamında).
    function glKayboldu(kayit) {
      if (kayit.bilincliKayip) return;          // forceContextLoss (bkz. KopruluRenderer)
      kayit.kayipT = performance.now();
      // KAYIP KAYNAĞI (2026-09-25, S3): tek metin («GPU süreci çöktü») 16 bağlam tahliyesini
      // ve sayfanın kendi ext.loseContext'ini de altyapı gösteriyordu. «kendi»: başlıktaki
      // sarmalayıcı sayfanın loseContext çağrısını gördü; «dis»: çökme, sıfırlama ya da
      // tahliye — hangisi olduğunu çekim hattı konsoldan ayırır (gorsel_denetim R7).
      // Öğrenci tarafı (katman/yenileme) iki kaynakta da eskisi gibidir.
      const kendi = typeof window.__TUVAL_KENDI_KAYIP__ === "function"
        && window.__TUVAL_KENDI_KAYIP__(kayit.r.domElement);
      window.JS_HATA_KAYDET(kayitSayfaNo(kayit), {message: "CONTEXT_LOST — WebGL bağlamı "
        + "kayboldu (kaynak=" + (kendi ? "kendi" : "dis") + ")"}, "WEBGL");
      clearTimeout(kayit.kayipZaman);
      kayit.kayipZaman = setTimeout(() => {
        const t = kayit.r.domElement;
        if (kayit.kayipT && t && t.isConnected) glKatmanGoster(t, kayitSayfaNo(kayit));
      }, GL_KAYIP_BEKLE);
    }
    function glGeriGeldi(kayit) {
      kayit.kayipT = 0;
      clearTimeout(kayit.kayipZaman);
      glKatmanKaldir(kayit.r.domElement);
      glKuruldu();                 // GPU yine çalışıyor: F5 işareti eskidi
      // three kendi onarımını AYNI olayda yaptı (dinleyicisi önce kaydoldu);
      // uygulamaya özgü durum bir görev sonra kurulur.
      setTimeout(() => sahneyiOnar(kayit), 0);
    }

    /* ═══════ GÖRÜNMEYEN TUVAL ÇİZİLMEZ (D7, 2026-09-24 Chrome/WebGL denetimi) ═══════
       Köprü yalnız .aktif sınıfına bakıyordu: panel önizleme sekmesi display:none
       iken (arayuz_v2) aynı kökenli gizli iframe'deki sahne görünürkenki hızla
       çiziyordu (2 sn'de 120 kare). Tuval IntersectionObserver ile izlenir; belge
       gizliyse (document.hidden) ya da DOM'daki tuval görünmüyorsa EKRAN çizimi
       atlanır (döngü sürer, kare boşa gitmez). Atlanan son çağrı saklanır, tuval
       görünür olunca BİR KEZ çizilir: talep üzerine çizen sayfa da güncel kalır.
       DOM'a bağlı olmayan tuval (doku kaynağı gibi) hiç atlanmaz; yardımcı
       çizimler (PMREM/küp/ayna) etkilenmez; montaj içi .aktif kuralı yerinde.
       YARDIMCI HEDEF İKİ DALDA DA MUAF (2026-09-24 gece doğrulaması): PMREMGenerator
       bulanıklaştırma/mip zincirini, _textureToCubeUV'yi ve arka plan kutusunu
       Scene DEĞİL Mesh + orto kamerayla CubeUV hedefine çizer; muafiyet yalnız
       Scene dalındaydı. Etkin olmayan sayfada (çökme sırasında başka sayfadayken),
       gizli iframe'de ya da gizli belgede kurulan/onarılan harita yarım kalıyordu:
       FB.6.1 s7 225,27 → 184,26 (raporun «PMREM payı»), gizli sekmede INIT'te
       çökme olmadan da. Muafiyet dalın başına alınınca üç durum da 225,27. */
    function yardimciHedef(rt) {
      return !!rt && (rt.isWebGLCubeRenderTarget === true
        || (!!rt.texture && THREE.CubeUVReflectionMapping != null
            && rt.texture.mapping === THREE.CubeUVReflectionMapping));
    }
    const tuvalKaydi = new WeakMap();
    const gorunurlukIzle = typeof IntersectionObserver === "function"
      ? new IntersectionObserver((girdiler) => {
          for (const g of girdiler) {
            const k = tuvalKaydi.get(g.target);
            if (!k) continue;
            k.gorunmez = !g.isIntersecting;
            if (!k.gorunmez) bekleyenKareyiCiz(k);
          }
        })
      : null;
    function gorunmuyor(k) {
      if (document.hidden) return true;
      const t = k.r.domElement;
      return k.gorunmez === true && !!t && t.isConnected;
    }
    function bekleyenKareyiCiz(k) {
      const s = k.bekSahne, c = k.bekKamera;
      if (!s || gorunmuyor(k)) return;
      k.bekSahne = k.bekKamera = null;
      try { k.r.render(s, c); } catch (e) {}
    }
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) kayitlar.forEach(bekleyenKareyiCiz);
    });

    // Y3: three yükleyicileri (doku, GLB) ertelenmiş iş sayılır. Kanca yükleme
    // yöneticisidir: ImageLoader/FileLoader/TextureLoader/GLTFLoader.load hepsi
    // itemStart/itemEnd çağırır (hata yolunda da itemEnd gelir). Sayfanın kendi
    // LoadingManager'ı da sayılsın diye kurucu sarılır (prototip aktarılır:
    // instanceof bozulmaz). GLTFLoader.parse (VARLIK3B: gömülü GLB) yöneticiye
    // uğramadan eşzamansız çözer — ayrıca sayılır.
    function yuklemeSay(ym) {
      if (!ym || ym.__bekleyenSayar || typeof ym.itemStart !== "function") return ym;
      ym.__bekleyenSayar = true;
      const bas = ym.itemStart, son = ym.itemEnd;
      ym.itemStart = function () { window.__BEKLEYEN++; return bas.apply(this, arguments); };
      ym.itemEnd = function () {
        try { return son.apply(this, arguments); } finally { window.__BEKLEYEN--; }
      };
      return ym;
    }
    yuklemeSay(THREE.DefaultLoadingManager);
    if (typeof THREE.LoadingManager === "function") {
      const AsilYukleme = THREE.LoadingManager;
      const SayanYukleme = function (a, b, c) { return yuklemeSay(new AsilYukleme(a, b, c)); };
      SayanYukleme.prototype = AsilYukleme.prototype;
      THREE.LoadingManager = SayanYukleme;
    }
    if (THREE.GLTFLoader && typeof THREE.GLTFLoader.prototype.parse === "function") {
      const asilParse = THREE.GLTFLoader.prototype.parse;
      THREE.GLTFLoader.prototype.parse = function (veri, yol, bitti, hata) {
        let acik = true;
        const kapat = () => { if (acik) { acik = false; window.__BEKLEYEN--; } };
        window.__BEKLEYEN++;
        try {
          return asilParse.call(this, veri, yol,
            function () { try { if (bitti) return bitti.apply(this, arguments); } finally { kapat(); } },
            function () { try { if (hata) return hata.apply(this, arguments); } finally { kapat(); } });
        } catch (e) { kapat(); throw e; }
      };
    }

    function KopruluRenderer(arg) {
      // D9 (2026-09-24): «high-performance» bu makinede etkisiz (üç tercihte de Intel
      // Arc D3D11) ve spesifikasyona göre arka plandaki high-performance bağlamların
      // düşürülmesi «çok olası». Varsayılan artık «default»; sayfanın kendi değeri
      // (57 sayfa yazıyor) Object.assign ile yine kazanır.
      const opt = Object.assign({ antialias: true, alpha: true, powerPreference: "default" }, arg || {});
      const sayfaNo = aktif;                  // INIT eşzamanlı koşar: kuran sayfa budur
      window.__GL_OLUSTURMA_HATASI__ = "";
      // DÜŞEN KURULUMUN DİNLEYİCİLERİ SÖKÜLÜR (2026-09-24 gece doğrulaması): three r155
      // kurucusu webglcontextlost/restored/creationerror dinleyicilerini getContext'ten
      // ÖNCE sayfanın tuvaline takar, kurulum düşünce sökmez. Çekimdeki INIT yeniden
      // denemesi aynı tuvalde ikinci renderer kurunca, sonraki bağlam geri gelişinde
      // ölü renderer'ın onContextRestore'u «reading 'autoReset'» atıyor ve kayda sahte
      // bir sayfa hatası düşüyordu (fb61 s15). Kurucu süresince tuvale takılanlar toplanır.
      const tuval = opt.canvas && typeof opt.canvas.addEventListener === "function" ? opt.canvas : null;
      const takilan = [];
      const kendiEkle = tuval && Object.prototype.hasOwnProperty.call(tuval, "addEventListener")
        ? tuval.addEventListener : null;
      if (tuval) {
        const ekle = tuval.addEventListener;
        tuval.addEventListener = function (tip, fn, secenek) {
          takilan.push([tip, fn, secenek]);
          return ekle.apply(this, arguments);
        };
      }
      let r;
      try { r = new AsilRenderer(opt); }
      catch (e) {
        if (tuval) {
          takilan.forEach((x) => { try { tuval.removeEventListener(x[0], x[1], x[2]); } catch (e2) {} });
          try { delete tuval.__glHataDinle; } catch (e2) {}   // oluşturma iletisi dinleyicisi yeniden takılsın
        }
        const ileti = String(window.__GL_OLUSTURMA_HATASI__ || "").slice(0, 160);
        const hataMetni = String((e && e.message) || e || "").slice(0, 160);
        // SAYFA KUSURU MU, ALTYAPI MI (2026-09-24 gece doğrulaması): aynı tuvalde önce
        // getContext('2d') çağıran sayfa da «Error creating WebGL context» alır (Chrome:
        // «Canvas has an existing context of a different type»); bu kayıt ALTYAPI
        // sayılıyor, modele «kodu DEĞİŞTİRME» gidiyor, bekçi öğrencinin sayfasını iki kez
        // yenileyip «Chrome'u yeniden başlatın» diyordu.
        // KARAR ÇEKİMDE PYTHON'DA (2026-09-25, S1 — tasarım P4/S1/S2/S5): kayıt artık
        // yapılandırılmıştır ve e.message'ı HEP taşır (offscreen DOMException metni
        // düşüyordu, S2): «WEBGL KURULUM tuval=<tür>/<kayip|canli|-> yoklama=<var|yok|
        // atlandi> durum=«statusMessage|yok» hata=«e.message»» (+ @çağıran sayfa satırı).
        // Buradaki ayrım yalnız ÖĞRENCİ tarafınındır (katman/yenileme): önce TUVAL KANITI
        // — tuvalde 2d/devredilmiş bağlam sayfa kusurudur, kayıp webgl bağlamı kaybın
        // ardılıdır (katman). Kanıt karar vermezse eski taze tuval yoklaması (glYoklama):
        // kurulabiliyorsa sayfa kusuru sayılır. Yoklama kayıp tuvalli çökmede «sayfa»
        // diyordu ve GPU yeniden kurulumunu eşzamanlı beklerken ana iş parçacığını 0,4-3,6
        // sn kilitliyordu (S1) — o durumu artık kanıt ayırır, yoklama koşmaz.
        const tk = tuval && typeof window.__TUVAL_KANITI__ === "function"
          ? window.__TUVAL_KANITI__(tuval) : {tur: "yok", kayip: null};
        let yoklama = "atlandi", sayfaKusuru;
        if (/^(2d|bitmaprenderer|webgpu|devredildi)$/.test(tk.tur)
            || /transferred its control to offscreen/.test(hataMetni + " " + ileti)) {
          sayfaKusuru = true;
        } else if (/^(webgl2?|experimental-webgl)$/.test(tk.tur) && tk.kayip === true) {
          sayfaKusuru = false;
        } else {
          sayfaKusuru = glYoklama();
          yoklama = sayfaKusuru ? "var" : "yok";
        }
        // @yer: yığının köprü sonrası ilk satırı — sayfanın renderer kurduğu satır.
        let yer = "";
        try {
          const y = String(new Error().stack || "").split("\n");
          const i = y.findIndex((s) => /KopruluRenderer/.test(s));
          if (i > 0 && y[i + 1]) yer = y[i + 1];
        } catch (e2) {}
        const kayitHata = {message: "KURULUM tuval=" + tk.tur + "/"
          + (tk.kayip === true ? "kayip" : tk.kayip === false ? "canli" : "-")
          + " yoklama=" + yoklama + " durum=«" + (ileti || "yok") + "» hata=«" + hataMetni + "»"};
        if (yer) kayitHata.stack = "WEBGL\n" + yer;
        window.JS_HATA_KAYDET(sayfaNo, kayitHata, "WEBGL");
        // Tek kayıt (S5): fırlatılan hata INIT catch'inde/global dinleyicide ikinci satır
        // olmasın (three'nin «precision» TypeError'ı ayrı kayıt oluyordu).
        try { e.__jsKayitNo = sayfaNo; } catch (e2) {}
        if (sayfaKusuru) {
          try { e.__glSayfaKusuru = true; } catch (e2) {}  // initHatasi katman açmasın
          throw e;
        }
        // Y2: bağlam kurulamadı (alan adı engeli / GPU modu düştü / kayıp tuval).
        // Sayfa hatayı kendi yutsa bile initSonrasi düştüğünü görür.
        glDusenSayfalar.add(sayfaNo);
        // INIT dışında (zamanlayıcı, tıklama) düştüyse katman hemen konur.
        if (initSayfasi !== sayfaNo && sayfaEl(sayfaNo)) {
          glKatmanGoster(sayfaEl(sayfaNo).querySelector(".bolum.sahne") || sayfaEl(sayfaNo), sayfaNo);
        }
        throw e;
      } finally {
        if (tuval) {
          if (kendiEkle) tuval.addEventListener = kendiEkle;
          else delete tuval.addEventListener;
        }
      }
      glKuruldu();
      try {
        if (typeof THREE !== "undefined") {
          if (THREE.ACESFilmicToneMapping) {
            r.toneMapping = THREE.ACESFilmicToneMapping;
            r.toneMappingExposure = 0.9;  // StudyoOrtami başlangıcı; sayfanın açık ayarı bunu değiştirebilir.
          }
          if (r.shadowMap) {
            r.shadowMap.enabled = true;
            if (THREE.PCFSoftShadowMap) r.shadowMap.type = THREE.PCFSoftShadowMap;
          }
        }
      } catch (e) {}
      const kayit = {r: r,
                     asilSetPixelRatio: r.setPixelRatio.bind(r),
                     ickullanim: false,
                     sayfaNo: sayfaNo};           // Y3: tuval DOM'a girmeden de sayfası bilinir
      kayitlar.push(kayit);
      // Y1/Y2: bekçi ve onarım dinleyicileri three'ninkilerden SONRA kaydolur (three
      // kurucusunda kaydetti) — onarım three'nin kendi geri yüklemesinin ardından koşar.
      r.domElement.addEventListener("webglcontextlost", () => glKayboldu(kayit));
      r.domElement.addEventListener("webglcontextrestored", () => glGeriGeldi(kayit));
      // Sayfanın KENDİ istediği kayıp (forceContextLoss: renderer'ı bırakıyor) GPU
      // arızası değildir (2026-09-24 gece): kayıt, katman ve yenileme yok.
      const asilKayip = r.forceContextLoss;
      if (typeof asilKayip === "function") {
        r.forceContextLoss = function () { kayit.bilincliKayip = true; return asilKayip.apply(this, arguments); };
      }
      tuvalKaydi.set(r.domElement, kayit);          // D7: görünürlük izlemesi
      if (gorunurlukIzle) gorunurlukIzle.observe(r.domElement);

      const asilSetSize = r.setSize.bind(r);
      r.setSize = function (w, h, stilGuncelle) {
        if (kayit.ickullanim) return asilSetSize(w, h, stilGuncelle);
        kayit.w = w; kayit.h = h;                 // MANTIKSAL boyut saklanır
        asilSetSize(w, h, stilGuncelle);
        kayit.sonOran = 0;                        // boyut değişti → oran tazelensin
        oraniUygula(kayit);
        return this;
      };
      // Sayfanın kendi setPixelRatio çağrısı YOK SAYILMAZ ama ÜST SINIR olarak
      // da alınmaz: doğru oranı yalnız çerçeve ölçeğini bilen taraf hesaplar.
      r.setPixelRatio = function () { oraniUygula(kayit); return this; };

      const asilRender = r.render.bind(r);
      r.render = function (sahne, kamera) {
        // SON İŞLEM ZİNCİRİ (2026-09-03, postprocessing.js): EffectComposer
        // geçişleri tam-ekran dörtgeni (Mesh) orto kamerayla çizer — Scene
        // değildir. Bu çağrılar köprünün kamera kaydına/yuva izdüşümüne
        // GİRMEZ: girseydi sonKamera orto kameraya dönüp 3B yuvalar ve panel
        // kamera açısı bozulurdu. Sahne çizimi (RenderPass) yine kaydedilir.
        if (!sahne || sahne.isScene !== true) {
          // PMREM'in Mesh geçişleri (CubeUV hedefi) gizlilikten ÖNCE muaf — bkz. D7 notu.
          if (yardimciHedef(r.getRenderTarget ? r.getRenderTarget() : null)) {
            return asilRender(sahne, kamera);
          }
          // Gizli sayfa kuralı (aşağıda) bu çizimler için de geçerli: bloom'un
          // kare başına ~10 dörtgen çizimi gizli sayfada GPU'yu boşa yakmasın.
          if (kayit.sayfaEl === undefined) {
            kayit.sayfaEl = r.domElement.closest ? r.domElement.closest(".sayfa") : null;
          }
          if (kayit.sayfaEl && !kayit.sayfaEl.classList.contains("aktif")) return;
          if (gorunmuyor(kayit)) return;          // D7: gizli belge / görünmeyen tuval
          return asilRender(sahne, kamera);
        }
        // YARDIMCI ÇİZİMLER KAYDA GİRMEZ (2026-09-03 ölçümü): PMREMGenerator
        // (CubeUV hedefi) ve CubeCamera (küp hedefi) RoomEnvironment gibi yardımcı
        // sahneleri aynı renderer'la çizer; kayda girince panel «ortam haritası
        // yok / ışık yok» okuyordu (13 kutu + 1 PointLight). Yalnız çizilir.
        if (yardimciHedef(r.getRenderTarget ? r.getRenderTarget() : null)) {
          return asilRender(sahne, kamera);
        }
        // YARDIMCI KAMERA (2026-09-05, Reflector.js portu; 13.09 geri geldi): düz ayna
        // sahneyi aynalanmış bir kamerayla dokuya çizer; o kamera userData.yardimci
        // damgası taşır. Kayda ve 3B yuva izdüşümüne girmez — girse vuruş
        // alanları her karede ayna kamerasına göre kayardı (nested render,
        // ana çizimin İÇİNDE tetiklenir ve sonuncu o olur).
        if (kamera && kamera.userData && kamera.userData.yardimci === true) {
          return asilRender(sahne, kamera);
        }
        // Y1: bağlam geri gelince eşlenecek sahneler (yardımcı sahneler hariç).
        (kayit.sahneler || (kayit.sahneler = new Set())).add(sahne);
        const k = (window.SAHNE3B = window.SAHNE3B || {kameralar: []});
        // SAYFA BAŞINA KAYIT (2026-09-03, ışık sürgüleri): gizli sayfaların rAF
        // döngüsü de buraya düşer; «son*» alanlar yalnız AKTİF sayfanın çizimiyle
        // güncellenir, her renderer'ın kendi kaydı k.kayitlar'da durur (panel ve
        // isik-yama aktif/kendi sayfasının sahnesini buradan bulur).
        if (kayit.sayfaEl === undefined) {
          kayit.sayfaEl = r.domElement.closest ? r.domElement.closest(".sayfa") : null;
        }
        if (!Array.isArray(k.kayitlar)) k.kayitlar = [];
        let ky = k.kayitlar.find((x) => x.renderer === r);
        if (!ky) { ky = {renderer: r, tuval: r.domElement, sayfaEl: kayit.sayfaEl}; k.kayitlar.push(ky); }
        ky.sahne = sahne; ky.kamera = kamera;
        // EKRANA çizilen sahne ayrı tutulur (2026-09-03 ölçümü): PMREMGenerator /
        // RoomEnvironment gibi hedefe (render target) çizilen yardımcı sahneler
        // «sahne»yi eziyordu — sayfa 3 kaydı 13 kutu + 1 PointLight çıktı. Bloom'lu
        // sayfada ekran çizimi dörtgendir (yukarıda elenir), RenderPass sahnesi
        // «sahne» alanında kalır; okuyucular ekranSahne || sahne kullanır.
        const ekrana = !r.getRenderTarget || r.getRenderTarget() === null;
        if (ekrana) { ky.ekranSahne = sahne; ky.ekranKamera = kamera; }
        if (!kayit.sayfaEl || kayit.sayfaEl.classList.contains("aktif")) {
          if (ekrana || !k.sonSahne) {
            k.sonKamera = kamera;
            k.sonSahne = sahne;
          }
          k.sonRenderer = r;   // panel ışık/pozlama sürgüleri (2026-09-03)
        }
        // Parça SAHNE3B'yi kendi nesnesiyle EZEBİLİYOR (2026-08-15 BTY.5.1.5:
        // rötuş ajanı {scene,camera,...} atadı, kameralar kayboldu ve HER
        // render TypeError ile öldü — sahne simsiyah). Köprü kendi alanını
        // her çağrıda tazeler; içerik köprü yüzünden ASLA çökmez.
        if (!Array.isArray(k.kameralar)) k.kameralar = [];
        if (kamera && !k.kameralar.includes(kamera)) k.kameralar.push(kamera);
        // GİZLİ SAHNE ÇİZİLMEZ (rapor P1): 61 animasyonlu sayfanın yalnız 5'i
        // duraklat kancası kaydediyor; geri kalanının rAF döngüsü sayfa
        // gizlenince de dönüyor ve GPU'yu bölüşüyor (aktif sahne kare
        // düşürüyor). Sayfa ataları içinde .sayfa varsa ve .aktif DEĞİLSE
        // çizim atlanır — döngü çalışmaya devam eder, yalnız kare boşa
        // gitmez. Tek sayfalık içerikte .sayfa hep aktiftir → etkisiz.
        // (sayfaEl yukarıda, kayıt bloğunda çözülür.)
        if (kayit.sayfaEl && !kayit.sayfaEl.classList.contains("aktif")) return;
        // D7: gizli belge / görünmeyen tuval — ekran çizimi saklanır, görünür olunca çizilir.
        if (gorunmuyor(kayit)) {
          if (ekrana) { kayit.bekSahne = sahne; kayit.bekKamera = kamera; }
          return;
        }
        // Y1(e): bağlam geri gelince yinelenecek son ekran karesi.
        if (ekrana) { kayit.cizSahne = sahne; kayit.cizKamera = kamera; }
        // Y3: aktif sayfanın etkinleştikten sonraki İLK çizimi — hazır denetimi uyanır
        // (aşağıdaki 1,5 sn'lik işlerin sayacı bu görevde kurulur, denetim sonra koşar).
        if (cizilenSayfa !== aktif && kayitSayfaNo(kayit) === aktif) {
          cizilenSayfa = aktif;
          hazirZamanla();
        }
        // 3B yuva vuruş alanları HER KAREDE izdüşümden tazelenir (kamera ya da
        // orbit değişince kayar). Kanca yalnız egitsel3b.js gömülüyse vardır;
        // yoksa bu satır sessiz no-op'tur — köprü içerik yüzünden çökmez.
        if (EGITSEL._yuva3BKare) EGITSEL._yuva3BKare(sahne, kamera, r.domElement);
        // DOKU ÖLÇEĞİ OTOMATİĞİ (2026-09-05, kullanıcı: «zeminler berbat»; 13.09 geri geldi):
        // ortak doku kütüphanesi gömülüyse (MALZEME3B) sahnenin ilk çiziminde ve 1,5 sn
        // sonra bir kez daha, 1:1 gerilmiş yardımcı dokuları büyük yüzeye göre döşer —
        // model yuzeyDoku/kutuDoku çağırmayı unutsa da 28 birimlik zemin bulanık lekeye dönmez.
        if (window.MALZEME3B_OTO && !sahne.userData.__m3bOto) {
          sahne.userData.__m3bOto = 1;
          try { window.MALZEME3B_OTO(sahne, r); } catch (e) {}
          const isSayfa = isBasla(kayitSayfaNo(kayit));   // Y3: ertelenmiş iş (hazır sözleşmesi)
          setTimeout(function () {
            try { window.MALZEME3B_OTO(sahne, r); } catch (e) {} finally { isBitti(isSayfa); }
          }, 1500);
        }
        // KONUM ÖLÇÜMÜ (2026-09-06, denemeler/konum-hatalari; 2026-09-11 — 8c2a9012'den
        // taşındı): kütüphane gömülüyse ilk çizimden
        // 1,5 sn sonra BİR KEZ Box3 raporu — sahne.userData.konumRaporu + console.info.
        // YALNIZ ÖLÇER, sahneyi OYNATMAZ (0,5 birim boşluk gezegen için niyet, masa için
        // hata; otomatik oturtma kullanıcı ilkesiyle yok). Yer seçimi: yukarıdaki erken
        // dönüşler (composer dörtgeni — Scene değil; PMREM/CubeCamera yardımcı sahnesi;
        // gizli sayfa) ölçülmemesi GEREKEN çizimlerdir — sahne ancak EKRANA/RenderPass'e
        // AKTİF sayfada ilk kez çizildiğinde damgalanır; bloom'lu sayfa da buraya düşer.
        if (window.KONUM3B && !sahne.userData.__k3bOlc) {
          sahne.userData.__k3bOlc = 1;
          const olcSayfa = isBasla(kayitSayfaNo(kayit));  // Y3: bulgu yazılmadan hazır denmesin
          setTimeout(function () {
            try {
              // HESAP DENETİMİ (2026-09-26, başlık betiği): NaN konumlu nesne/kamera → HESAP kaydı.
              try { if (window.HESAP3B) window.HESAP3B(sahne, kayitSayfaNo(kayit), kamera); } catch (e3) {}
              var rp = window.KONUM3B.olc(sahne, kamera);
              // EŞ DÜZLEM (z-fighting) bulgusu denetim bandına (2026-09-06): tek başına GÖRÜLEBİLİR kusur
              // (tepeden bakışta çizgi çizgi zemin), görsel tur bandı okur ve birini 0,01 kaldırır. Öteki
              // KONUM3B bulguları (HAVADA/GÖMÜLÜ) niyet olabilir — onlar yalnız log (kullanıcı ilkesi).
              if (rp && rp.esDuzlem && rp.esDuzlem.length && window.JS_HATA_KAYDET) {
                var sec = r.domElement.closest ? r.domElement.closest(".sayfa") : null;
                var no = sec ? (+String(sec.id).replace("sayfa-", "") || 0) : 0;
                var e0 = rp.esDuzlem[0];
                // 2026-09-11 ÜÇ EKSEN (kullanıcı: FB.6.1 s11 fener ucu kapak-mercek çakışması): mesaj eksen + konum söyler
                // (e0.eksen/e0.konum; eski e0.y yalnız y ekseninde dolu — eski kütüphane gömülüyse ona geri düşer), tavsiye
                // kapak-mercek / disk-etiket çiftini de kapsar. JS_HATA_KAYDET 160 karakterde keser: ölçüm verisi önde durur.
                window.JS_HATA_KAYDET(no, new Error("EŞ DÜZLEM (z-fighting, çizgili titreme): " + e0.a + " ile " + e0.b + " " + e0.yuz +
                  " aynı " + (e0.eksen || "y") + "=" + (e0.konum != null ? e0.konum : e0.y) + ", örtüşme " + e0.ortusme + " birim² (" + rp.esDuzlem.length +
                  " çift) — birini 0.01 kaldır/indir ya da kapağı/diski ayır (kapak-mercek, disk-etiket: eksen boyunca >= 0.01 birim ya da polygonOffset) (sözleşme 16 EŞ DÜZLEM YASAĞI)"), "KONUM3B");
              }
            } catch (e) {} finally { isBitti(olcSayfa); }
          }, 1500);
        }
        // NOT (2026-08-18): burada bir «isimliği kameraya döndür» kancası
        // vardı. Kullanıcı plakalı isimliği (tabela) kaldırttı; yazı artık
        // nesnenin YÜZEYİNE basılıyor ve nesneyle birlikte döndüğü için
        // kare başına hizalama GEREKMİYOR — kanca da kaldırıldı.
        return asilRender(sahne, kamera);
      };
      return r;
    }
    KopruluRenderer.prototype = AsilRenderer.prototype;
    THREE.WebGLRenderer = KopruluRenderer;
  }

  // Giriş kapağı: "Başla" (ya da Esc) kapağı kaldırır, içerik açığa çıkar.
  // Kapak yoksa bu blok hiçbir şey yapmaz.
  const kapak = document.getElementById("ekran-kapak");
  if (kapak) {
    const kapagiKapat = () => {
      kapak.classList.add("kapali");
      const ilk = sayfaEl(aktif);
      if (ilk) ilk.focus?.();
    };
    document.getElementById("btnBasla")?.addEventListener("click", kapagiKapat);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !kapak.classList.contains("kapali")) kapagiKapat();
    });
  }
})();
