
/* ============ 🎙️ ANLATIM MOTORU (sesli içerik, 2026-08-24) ============
   Montaj ANLATIM yuvasına (head'deki yer tutucu; adı burada AÇIK YAZILMAZ —
   çift süslü yazılsaydı replace bu yorumu da doldurur, betiği parçalardı;
   2026-08-24 canlı bulgu) window.SABLON_ANLATIM basarsa kurulur; yoksa bu
   blok HİÇBİR ŞEY yapmaz. Tek saat ilkesi: tüm görsel durum (çubuk, altyazı,
   kelime vurgusu) her karede audio.currentTime'dan türetilir. Altyazı kuralı:
   parçalar üretimde hazırlanmıştır (≤6 kelime, cümle/virgül hizalı) — burada
   yalnız gösterilir. Ses dosyaları göreli yoldadır: HTML, <ad>-ses/ klasörüyle
   birlikte taşınmalıdır; dosya yüklenemezse motor sayfayı sessizce atlar. */
(function () {
  const V = window.SABLON_ANLATIM;
  if (!V || !V.sayfalar || !Object.keys(V.sayfalar).length) return;

  const stil = document.createElement("style");
  stil.textContent = `
    /* Oynatıcı footer'ın PARÇASIDIR (kullanıcı kararı 2026-08-24: ayrı yüzen
       bar olmaz): gezinme butonlarının kart diliyle (--panel/--cizgi/--vurgu)
       aynı satırda durur. Footer kapalı modüllerde .yuzen yedeği devreye girer. */
    #anlatim-serit{flex:1 1 auto;min-width:0;display:flex;align-items:center;
      gap:10px;height:46px;padding:0 12px 0 8px;border-radius:16px;
      border:2px solid var(--cizgi);background:var(--panel);
      color:var(--metin-soluk);}
    #anlatim-serit.yuzen{position:absolute;left:50%;bottom:12px;
      transform:translateX(-50%);width:min(880px,calc(100% - 48px));z-index:60;
      box-shadow:0 6px 20px rgba(0,0,0,.18);}
    #anlatim-serit button{display:flex;align-items:center;justify-content:center;
      border:0;border-radius:10px;background:transparent;cursor:pointer;
      font:inherit;color:var(--metin-soluk);}
    #anlatim-serit button:hover{color:var(--metin);background:
      color-mix(in srgb, var(--cizgi) 45%, transparent);}
    #anlatim-oynat{width:32px;height:32px;flex:none;border-radius:50%;
      background:var(--vurgu)!important;color:var(--vurgu-zit)!important;}
    #anlatim-oynat:hover{filter:brightness(1.06);}
    #anlatim-oynat svg{width:13px;height:13px;fill:currentColor;}
    #anlatim-cubuk{flex:1;min-width:60px;height:24px;display:flex;
      align-items:center;cursor:pointer;}
    #anlatim-cubuk .ray{position:relative;width:100%;height:7px;border-radius:4px;
      background:var(--cizgi);overflow:hidden;}
    #anlatim-cubuk .dolu{position:absolute;inset:0;width:0;border-radius:4px;
      background:var(--vurgu);}
    #anlatim-sure{font-size:12.5px;font-weight:700;
      font-variant-numeric:tabular-nums;flex:none;min-width:74px;text-align:center;}
    #anlatim-cc,#anlatim-tekrar{height:28px;padding:0 8px;font-size:12.5px;
      font-weight:800;flex:none;}
    #anlatim-cc.kapali{opacity:.4;}
    #anlatim-ses{width:30px;height:28px;flex:none;}
    #anlatim-ses svg{width:17px;height:14px;fill:currentColor;}
    #anlatim-duzey{flex:none;width:64px;height:24px;margin:0;cursor:pointer;
      accent-color:var(--vurgu);}
    #anlatim-serit.gizli{visibility:hidden;}
    #anlatim-serit.yuzen.gizli{display:none;}
    #anlatim-altyazi{position:absolute;left:50%;transform:translateX(-50%);
      bottom:64px;max-width:min(860px,calc(100% - 64px));padding:9px 18px;
      border-radius:12px;background:rgba(15,23,42,.8);color:#fff;font-size:19px;
      line-height:1.4;text-align:center;z-index:60;pointer-events:none;
      display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
    #anlatim-altyazi .kel{opacity:.62;transition:opacity .12s;}
    #anlatim-altyazi .kel.soylendi{opacity:.88;}
    #anlatim-altyazi .kel.aktif{opacity:1;color:var(--vurgu-acik,#9cc2ff);font-weight:700;}
    #anlatim-altyazi.gizli{display:none;}
    /* Anlatıma senkron sahne (sesli format): data-anlatim-kelime öğeleri
       kelimesi söylenene dek gizli bekler, sırası gelince belirir. Bu
       sınıflar YALNIZ anlatım motoru kuruluysa eklenir — seslendirmesiz
       çıktıda öğeler normal görünür (içerik kaybolmaz). */
    /* KONUM EZME YASAK (canlı bulgu 24.08, FIZ.10.2 s4: mor grafikler köşeye
       yapıştı): CSS transform, SVG'nin transform="translate(x,y)" ÖZNİTELİĞİNİ
       ezer ve öğe (0,0)'a çöker. Bağımsız translate ÖZELLİĞİ öznitelikle
       BİRLEŞİR, konumu korur — belirme kayması bu yüzden translate ile.
       DİKKAT: bu blok JS şablon dizesi içindedir; yoruma ters tırnak YAZMA
       (dizeyi kapatıp motoru çökertir — bugün ikinci kez yaşandı). */
    .anlatim-oge{opacity:0;translate:0 6px;
      transition:opacity .45s ease,translate .45s ease;}
    .anlatim-oge.anlatim-gorunur{opacity:1;translate:none;}
    .anlatim-oge[data-anlatim-etki="ciz"] :is(path,circle,rect,line,polyline,polygon,ellipse),
    .anlatim-oge[data-anlatim-etki="ciz"]:is(path,circle,rect,line,polyline,polygon,ellipse){
      stroke-dasharray:1;stroke-dashoffset:1;fill-opacity:0;
      transition:stroke-dashoffset .9s ease .05s,fill-opacity .5s ease .8s;}
    .anlatim-oge.anlatim-gorunur[data-anlatim-etki="ciz"] :is(path,circle,rect,line,polyline,polygon,ellipse),
    .anlatim-oge.anlatim-gorunur[data-anlatim-etki="ciz"]:is(path,circle,rect,line,polyline,polygon,ellipse){
      stroke-dashoffset:0;fill-opacity:1;}
    @keyframes anlatimNabiz{0%,100%{filter:none}50%{filter:brightness(1.35) drop-shadow(0 0 6px var(--vurgu,#4f8df7))}}
    .anlatim-oge.anlatim-gorunur[data-anlatim-etki="vurgula"]{animation:anlatimNabiz 1.1s ease 2;}`;
  document.head.appendChild(stil);

  const cerceve = document.getElementById("cerceve") || document.body;
  const footer = document.getElementById("footer");
  const serit = document.createElement("div");
  serit.id = "anlatim-serit";
  serit.innerHTML =
    '<button id="anlatim-oynat" aria-label="Anlatımı oynat/duraklat">' +
    '<svg viewBox="0 0 16 16"><path class="ikon-oynat" d="M4 2l10 6-10 6z"/>' +
    '<g class="ikon-durdur" style="display:none"><rect x="3" y="2" width="4" height="12" rx="1"/>' +
    '<rect x="9" y="2" width="4" height="12" rx="1"/></g></svg></button>' +
    '<div id="anlatim-cubuk" aria-label="Anlatım zaman çubuğu"><div class="ray">' +
    '<div class="dolu"></div></div></div>' +
    '<span id="anlatim-sure">0:00 / 0:00</span>' +
    '<button id="anlatim-ses" title="Sesi kapat/aç" aria-label="Sesi kapat/aç">' +
    '<svg viewBox="0 0 20 16"><path d="M2 5h3l5-4v14l-5-4H2z"/>' +
    '<g class="ses-dalga"><path d="M13 4.5c1.4 1 1.4 6 0 7" fill="none" ' +
    'stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>' +
    '<path d="M15.5 2.5c2.6 2 2.6 9 0 11" fill="none" stroke="currentColor" ' +
    'stroke-width="1.7" stroke-linecap="round"/></g>' +
    '<line class="ses-kapali-cizgi" x1="12" y1="3" x2="19" y2="13" ' +
    'stroke="currentColor" stroke-width="1.9" stroke-linecap="round" ' +
    'style="display:none"/></svg></button>' +
    '<input id="anlatim-duzey" type="range" min="0" max="100" step="5" value="100" ' +
    'title="Ses düzeyi" aria-label="Ses düzeyi">' +
    '<button id="anlatim-tekrar" title="Baştan dinle">↺</button>' +
    '<button id="anlatim-cc" title="Altyazıyı aç/kapat">CC</button>';
  const altyazi = document.createElement("div");
  altyazi.id = "anlatim-altyazi";
  cerceve.appendChild(altyazi);
  // Footer varsa oynatıcı ONUN İÇİNE girer: Önceki ↔ sayfa numarası arasına,
  // gezinme kartlarıyla aynı satırda (ayrı yüzen bar olmaz). Footer kapalı
  // modüllerde yüzen yedek kullanılır.
  if (footer) {
    const durum = document.getElementById("sayfa-durum");
    footer.insertBefore(serit, (durum && durum.parentElement === footer)
                               ? durum : document.getElementById("sonraki-buton"));
  } else {
    serit.classList.add("yuzen");
    cerceve.appendChild(serit);
  }

  const oynatBtn = serit.querySelector("#anlatim-oynat");
  const ikonOynat = serit.querySelector(".ikon-oynat");
  const ikonDurdur = serit.querySelector(".ikon-durdur");
  const cubuk = serit.querySelector("#anlatim-cubuk");
  const dolu = serit.querySelector(".dolu");
  const sureEl = serit.querySelector("#anlatim-sure");
  const ccBtn = serit.querySelector("#anlatim-cc");
  const tekrarBtn = serit.querySelector("#anlatim-tekrar");

  const ses = new Audio();
  ses.preload = "auto";
  let sayfaVeri = null;          // aktif sayfanın anlatım kaydı
  let parcaIdx = -1;             // gösterilen altyazı parçası
  let kelimeSpanlari = [];
  let sahneOgeleri = [];         // aktif sayfadaki data-anlatim-kelime öğeleri
  let sonKelimeIdx = -1;         // SAYFA_ANLATIM kancası için kelime imleci

  // Türkçe duyarlı kelime normalize: baş/son noktalama kırpılır, küçültülür.
  function kelimeNorm(k) {
    return String(k || "").replace(/^[^\wçğıöşüÇĞİÖŞÜ]+|[^\wçğıöşüÇĞİÖŞÜ]+$/g, "")
      .toLocaleLowerCase("tr");
  }
  // Sahne öğelerini topla: kelime çapası kelime listesinde çözülür (bake
  // değil çalışma anı — metin revizyonunda kendiliğinden doğru kalır).
  function sahneKur(sayfaEl) {
    sahneOgeleri.forEach(function (o) {
      o.el.classList.remove("anlatim-oge", "anlatim-gorunur");
    });
    sahneOgeleri = [];
    if (!sayfaEl || !sayfaVeri) return;
    const K = sayfaVeri.kelimeler;
    sayfaEl.querySelectorAll("[data-anlatim-kelime]").forEach(function (el, ix) {
      const hedef = kelimeNorm(el.getAttribute("data-anlatim-kelime"));
      if (!hedef) return;
      let gecis = parseInt(el.getAttribute("data-anlatim-gecis") || "1", 10) || 1;
      let s = -1;
      for (let i = 0; i < K.length; i++) {
        if (kelimeNorm(K[i].w) === hedef && --gecis === 0) { s = K[i].s; break; }
      }
      if (s < 0) {                       // çapa metinde yok: öğe hep görünür
        console.warn("anlatım çapası bulunamadı:", el.getAttribute("data-anlatim-kelime"));
        return;
      }
      if (el.getAttribute("data-anlatim-etki") === "ciz") {
        el.querySelectorAll("path,circle,rect,line,polyline,polygon,ellipse")
          .forEach(function (p) { p.setAttribute("pathLength", "1"); });
        if (/^(path|circle|rect|line|polyline|polygon|ellipse)$/i.test(el.tagName)) {
          el.setAttribute("pathLength", "1");
        }
      }
      el.classList.add("anlatim-oge");
      // kelime+etki de taşınır (2026-08-26): düzenleyici köprüsü işaretleri
      // zaman çizelgesine çizer — kaynak motorun ÇÖZDÜĞÜ zamandır, kopya değil.
      // sira = TÜM çapalı öğeler içindeki DOM indeksi (eşleşmeyenler dahil):
      // editör çapa düzenlemelerini bu indeksle adresler ve ses.capa_duzenle
      // dosyada aynı sayımı yapar — eşleşmeyen çapa sayımı kaydırmamalı.
      sahneOgeleri.push({el: el, s: s, sira: ix,
                         kelime: el.getAttribute("data-anlatim-kelime"),
                         etki: el.getAttribute("data-anlatim-etki") || "goster"});
    });
  }
  // Her karede t'den türetilir (tek saat, idempotent): geri sarınca gizlenir.
  function sahneGuncelle(t) {
    for (const o of sahneOgeleri) {
      o.el.classList.toggle("anlatim-gorunur", t >= o.s - 0.05);
    }
    if (!sayfaVeri) return;
    const K = sayfaVeri.kelimeler;
    let i = sonKelimeIdx;
    if (i < 0 || i >= K.length || t < K[i].s || (K[i + 1] && t >= K[i + 1].s)) {
      i = -1;
      for (let j = 0; j < K.length; j++) {
        if (t >= K[j].s) i = j; else break;
      }
    }
    if (i !== sonKelimeIdx) {
      sonKelimeIdx = i;
      if (i >= 0) {
        const olay = {kelime: K[i].w, indeks: i, t: t, sayfa: aktifSayfa};
        const kanca = window.SAYFA_ANLATIM && window.SAYFA_ANLATIM[aktifSayfa];
        if (typeof kanca === "function") {
          try { kanca(olay); } catch (e) { console.error("SAYFA_ANLATIM[" + aktifSayfa + "]", e); }
        }
        window.dispatchEvent(new CustomEvent("sablon:anlatim-kelime", {detail: olay}));
      }
    }
  }
  let kilitli = true;            // tarayıcı ses kilidi: ilk jestte açılır
  const oynatildi = new Set();   // sayfa başına BİR otomatik çalma
  let aktifSayfa = 1;
  let altyaziAcik = (function () {
    try { return localStorage.getItem("egitsel:altyazi") !== "0"; }
    catch (e) { return true; }
  })();

  function bicimSure(t) {
    t = Math.max(0, Math.floor(t || 0));
    return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
  }
  function ikonGuncelle() {
    const caliyor = !ses.paused && !ses.ended;
    ikonOynat.style.display = caliyor ? "none" : "";
    ikonDurdur.style.display = caliyor ? "" : "none";
  }
  function altyaziGuncelle(t) {
    if (!sayfaVeri || !altyaziAcik) { altyazi.classList.add("gizli"); return; }
    const K = sayfaVeri.kelimeler, P = sayfaVeri.parcalar;
    let p = parcaIdx;
    if (p < 0 || t < K[P[p].bas].s || t > K[P[p].son].e + 0.35) {
      p = P.findIndex(x => t <= K[x.son].e + 0.35 && t >= K[x.bas].s - 0.15);
      if (p < 0) p = t <= (K[0] ? K[0].s : 0) ? 0 : P.length - 1;
    }
    if (p !== parcaIdx) {
      parcaIdx = p;
      const prc = P[p];
      altyazi.innerHTML = "";
      kelimeSpanlari = [];
      for (let i = prc.bas; i <= prc.son; i++) {
        const sp = document.createElement("span");
        sp.className = "kel";
        sp.textContent = K[i].w;
        altyazi.appendChild(sp);
        if (i < prc.son) altyazi.appendChild(document.createTextNode(" "));
        kelimeSpanlari.push({sp: sp, s: K[i].s, e: K[i].e});
      }
    }
    altyazi.classList.remove("gizli");
    for (const k of kelimeSpanlari) {
      k.sp.classList.toggle("aktif", t >= k.s && t <= k.e + 0.05);
      k.sp.classList.toggle("soylendi", t > k.e + 0.05);
    }
  }
  function kare() {
    if (sayfaVeri) {
      const t = ses.currentTime || 0;
      const toplam = sayfaVeri.sure || ses.duration || 0;
      dolu.style.width = toplam ? Math.min(100, t / toplam * 100) + "%" : "0";
      sureEl.textContent = bicimSure(t) + " / " + bicimSure(toplam);
      altyaziGuncelle(t);
      sahneGuncelle(t);
      // Boşluk daraltma (ses düzenleme, 2026-08-24): kelimeler arası boşluk
      // V.bosluk üst sınırını aşarsa ses sonraki kelimeye atlar. Dosya
      // DEĞİŞMEZ; çubuk/altyazı/sahne aynı t'den türediği için tutarlı kalır
      // (tek saat). Sürükleme sırasında ve duraklıyken karışılmaz.
      if (V.bosluk && !ses.paused && !surukleme) {
        var Kb = sayfaVeri.kelimeler, ib = sonKelimeIdx;
        if (ib >= 0 && ib + 1 < Kb.length) {
          var bosBas = Kb[ib].e, sonrakiBas = Kb[ib + 1].s;
          if (sonrakiBas - bosBas > V.bosluk
              && t > bosBas + V.bosluk && t < sonrakiBas - 0.05) {
            ses.currentTime = sonrakiBas - 0.03;
          }
        }
      }
      ikonGuncelle();
    }
    requestAnimationFrame(kare);
  }
  requestAnimationFrame(kare);

  // Otomatik başlama (kullanıcı kararı 2026-08-24): sayfa açıldıktan yarım
  // saniye sonra anlatım KENDİLİĞİNDEN başlar. Tarayıcı jest kilidi izin
  // vermezse (ilk açılışta dokunulmamışsa play() reddedilir) sessizce geri
  // çekilir; ilk gerçek dokunuş kilidiAc üzerinden başlatır.
  let otomatikZamanlayici = null;
  function otomatikBaslat(n) {
    clearTimeout(otomatikZamanlayici);
    otomatikZamanlayici = setTimeout(function () {
      if (aktifSayfa !== n || !sayfaVeri || oynatildi.has(n)) return;
      // GÖRÜNMEYEN belge OTOMATİK BAŞLATMAZ (2026-08-24 «ses 2 kere çalışıyor»
      // vakası: aynı içerik panel önizleme iframe'inde + ayrı sekmede açıktı,
      // arkadaki kopya da çalıyordu). Görünür olduğunda aşağıdaki
      // visibilitychange dinleyicisi başlatır.
      if (document.hidden) return;
      ses.play().then(function () {
        kilitli = false;
        oynatildi.add(n);
      }).catch(function () {});          // jest kilidi ya da eksik dosya
    }, 500);
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && sayfaVeri && !oynatildi.has(aktifSayfa)
        && (ses.paused || ses.ended)) {
      otomatikBaslat(aktifSayfa);
    }
  });

  function sayfaKur(n, otomatik) {
    aktifSayfa = n;
    ses.pause();
    sayfaVeri = V.sayfalar[String(n)] || null;
    parcaIdx = -1;
    sonKelimeIdx = -1;
    sahneKur(document.getElementById("sayfa-" + n));
    if (!sayfaVeri) {
      serit.classList.add("gizli");
      altyazi.classList.add("gizli");
      return;
    }
    serit.classList.remove("gizli");
    ses.src = sayfaVeri.dosya;
    ses.currentTime = 0;
    dolu.style.width = "0";
    sureEl.textContent = "0:00 / " + bicimSure(sayfaVeri.sure);
    altyaziGuncelle(0);
    sahneGuncelle(0);
    if (otomatik && !oynatildi.has(n)) otomatikBaslat(n);
    ikonGuncelle();
    window.dispatchEvent(new CustomEvent("sablon:anlatim-kuruldu",
                                         {detail: {sayfa: n, var: !!sayfaVeri}}));
  }

  /* 🎛 DÜZENLEYİCİ KÖPRÜSÜ (2026-08-26): panelin ses editörü (aynı origin)
     oynatıcıyı BU nesneyle sürer. Editör zaman çizelgesinde kaydırınca
     sahne animasyonu, altyazı ve şerit aynı `ses.currentTime` saatinden
     aktığı için sayfada CANLI izlenir (tek saat ilkesi — kare()).
     İşaretler sahneKur'un çözdüğü zamanlardır; editör çapa eşlemeyi
     KOPYALAMAZ, motorunkini okur (ölçüm çatalı yasağı). */
  window.SABLON_ANLATIM_KOPRU = {
    ses: ses,
    sayfa: function () { return aktifSayfa; },
    veri: function () { return sayfaVeri; },
    isaretler: function () {
      return sahneOgeleri.map(function (o) {
        return {sira: o.sira, t: o.s, kelime: o.kelime, etki: o.etki,
                ad: o.el.id || o.el.tagName.toLowerCase()};
      }).sort(function (a, b) { return a.t - b.t; });
    },
    git: function (t) {
      if (!sayfaVeri) return;
      kilitli = false;
      try { ses.currentTime = Math.max(0, Math.min(t, sayfaVeri.sure || t)); }
      catch (e) {}
    },
    oynat: function () {
      if (!sayfaVeri) return Promise.resolve(false);
      kilitli = false;
      oynatildi.add(aktifSayfa);
      return ses.play().then(function () { return true; },
                             function () { return false; });
    },
    duraklat: function () { ses.pause(); }
  };

  oynatBtn.addEventListener("click", function () {
    if (!sayfaVeri) return;
    kilitli = false;
    if (ses.paused || ses.ended) { oynatildi.add(aktifSayfa); ses.play().catch(function () {}); }
    else ses.pause();
  });
  tekrarBtn.addEventListener("click", function () {
    if (!sayfaVeri) return;
    kilitli = false;
    ses.currentTime = 0;
    ses.play().catch(function () {});
  });
  ccBtn.addEventListener("click", function () {
    altyaziAcik = !altyaziAcik;
    ccBtn.classList.toggle("kapali", !altyaziAcik);
    try { localStorage.setItem("egitsel:altyazi", altyaziAcik ? "1" : "0"); } catch (e) {}
    if (!altyaziAcik) altyazi.classList.add("gizli");
  });
  ccBtn.classList.toggle("kapali", !altyaziAcik);

  // Ses düzeyi + kapat/aç (kullanıcı isteği 2026-08-24): tercih kalıcıdır.
  const sesBtn = serit.querySelector("#anlatim-ses");
  const duzeyGirdi = serit.querySelector("#anlatim-duzey");
  const dalga = sesBtn.querySelector(".ses-dalga");
  const kapaliCizgi = sesBtn.querySelector(".ses-kapali-cizgi");
  function sesDurumOku() {
    let d = 1, sessiz = false;
    try {
      d = Math.min(1, Math.max(0, parseFloat(localStorage.getItem("egitsel:anlatim-duzey"))));
      if (isNaN(d)) d = 1;
      sessiz = localStorage.getItem("egitsel:anlatim-sessiz") === "1";
    } catch (e) {}
    return {d: d, sessiz: sessiz};
  }
  function sesDurumUygula(d, sessiz) {
    ses.volume = d;
    ses.muted = sessiz || d === 0;
    duzeyGirdi.value = String(Math.round(d * 100));
    dalga.style.display = ses.muted ? "none" : "";
    kapaliCizgi.style.display = ses.muted ? "" : "none";
    sesBtn.style.opacity = ses.muted ? ".5" : "";
    try {
      localStorage.setItem("egitsel:anlatim-duzey", String(d));
      localStorage.setItem("egitsel:anlatim-sessiz", sessiz ? "1" : "0");
    } catch (e) {}
  }
  duzeyGirdi.addEventListener("input", function () {
    const d = (+duzeyGirdi.value || 0) / 100;
    sesDurumUygula(d, false);            // düzeyi oynatmak sessizliği bozar
  });
  sesBtn.addEventListener("click", function () {
    sesDurumUygula(ses.volume, !(ses.muted));
  });
  (function () { const b = sesDurumOku(); sesDurumUygula(b.d, b.sessiz); })();

  function konumdanAtla(ev) {
    if (!sayfaVeri) return;
    const kutu = cubuk.getBoundingClientRect();
    const oran = Math.min(1, Math.max(0, (ev.clientX - kutu.left) / kutu.width));
    const toplam = sayfaVeri.sure || ses.duration || 0;
    ses.currentTime = oran * toplam;
    parcaIdx = -1;               // atlama sonrası parça yeniden bulunur (idempotent)
  }
  let surukleme = false;
  cubuk.addEventListener("pointerdown", function (e) {
    surukleme = true; kilitli = false;
    try { cubuk.setPointerCapture(e.pointerId); } catch (err) {}
    konumdanAtla(e);
  });
  cubuk.addEventListener("pointermove", function (e) { if (surukleme) konumdanAtla(e); });
  cubuk.addEventListener("pointerup", function () { surukleme = false; });

  // İlk gerçek dokunuş ses kilidini açar (sesCal'daki kilitAc ile aynı ilke).
  // Aktif sayfanın anlatımı daha önce hiç çalmadıysa o dokunuşta başlar.
  function kilidiAc() {
    if (!kilitli) return;
    kilitli = false;
    if (sayfaVeri && !oynatildi.has(aktifSayfa)) {
      oynatildi.add(aktifSayfa);
      ses.play().catch(function () {});
    }
  }
  document.addEventListener("pointerdown", kilidiAc, {capture: true, passive: true});
  document.addEventListener("keydown", kilidiAc, {capture: true});

  // Anlatım yaşam döngüsü olayları (2026-08-24, otomatik gösterim): sayfa,
  // anlatım başlarken simülasyonu otomatik oynatmaya başlar, bitince kontrolü
  // öğrenciye bırakır. Kelime kancası (sablon:anlatim-kelime) hangi anda ne
  // gösterileceğini söyler; bu ikisi başla/bitir parantezini verir.
  // Küresel durum bayrağı (2026-08-24): anlatım çalarken sayfalar kutlama/
  // tamamlama modalı AÇMAZ (sözleşme hükmü), şablon Devam hapını erteler.
  function durumYay(caliyor, olayAdi) {
    window.SABLON_ANLATIM_CALIYOR = caliyor;
    window.dispatchEvent(new CustomEvent("sablon:anlatim-durum",
                                         {detail: {caliyor: caliyor, sayfa: aktifSayfa}}));
    if (olayAdi) {
      window.dispatchEvent(new CustomEvent(olayAdi, {detail: {sayfa: aktifSayfa}}));
    }
  }
  // basladi SAYFA BAŞINA BİR KEZ yayınlanır (2026-08-24 canlı bulgu: her
  // play'de yayınlamak, duraklat/devam'da sayfanın gösteri sıfırlamasını
  // tetikleyip ÖĞRENCİNİN İLERLEMESİNİ siliyordu). Duraklatma = kontrol
  // öğrenciye geçer: bitti yayınlanır (gösteri hakkı kullanıldı); devamda
  // ses/altyazı/belirmeler sürer ama sayfa gösteri modunu yeniden AÇMAZ.
  var gosteriBasladi = new Set();
  ses.addEventListener("play", function () {
    var ilk = !gosteriBasladi.has(aktifSayfa);
    gosteriBasladi.add(aktifSayfa);
    durumYay(true, ilk ? "sablon:anlatim-basladi" : null);
  });
  ses.addEventListener("pause", function () {
    if (ses.ended) return;               // ended kendi olayını yayınlar
    durumYay(false, null);               // duraklatma: yalnız durum — bitti
                                         // yayınlamak sayfanın sıfırlamasını
                                         // tetikleyip ilerlemeyi silerdi
  });
  ses.addEventListener("ended", function () { durumYay(false, "sablon:anlatim-bitti"); });

  // Sayfa geçişi: şablonun genel kancası (gec() yayınlar). Anlatım durur,
  // yeni sayfanın sesi kurulur; ilk ziyarette otomatik çalar.
  window.addEventListener("sablon:sayfa-degisti", function (e) {
    sayfaKur(e.detail.sayfa, true);
  });
  sayfaKur(1, true);
})();
