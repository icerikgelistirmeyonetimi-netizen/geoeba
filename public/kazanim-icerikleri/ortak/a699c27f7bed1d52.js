
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
    const el = sayfaEl(aktif);
    el.classList.add("aktif");

    if (!baslatilan.has(aktif)) {
      baslatilan.add(aktif);
      if (typeof SAYFA_INIT[aktif] === "function") {
        // 2026-09-11 (2e0036a0, rapor 6b): catch yutuyordu, köprü hatayı sayfaya yazar
        try { SAYFA_INIT[aktif](el); } catch (e) { console.error("SAYFA_INIT[" + aktif + "]", e); window.JS_HATA_KAYDET(aktif, e, "SAYFA_INIT"); }
      }
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
    const ilk = sayfaEl(1) || document.querySelector(".sayfa");
    if (ilk) {
      const no = +ilk.id.replace("sayfa-", "") || 1;
      aktif = no;
      ilk.classList.add("aktif");
      baslatilan.add(no);
      if (typeof SAYFA_INIT[no] === "function") {
        try { SAYFA_INIT[no](ilk); } catch (e) { console.error("SAYFA_INIT[" + no + "]", e); window.JS_HATA_KAYDET(no, e, "SAYFA_INIT"); }
      }
      svgLatexDuzelt(ilk);
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
    const kayitlar = [];

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

    function KopruluRenderer(arg) {
      const opt = Object.assign({ antialias: true, alpha: true, powerPreference: "high-performance" }, arg || {});
      const r = new AsilRenderer(opt);
      try {
        if (typeof THREE !== "undefined") {
          if (THREE.ACESFilmicToneMapping) {
            r.toneMapping = THREE.ACESFilmicToneMapping;
            r.toneMappingExposure = 1.15;
          }
          if (r.shadowMap) {
            r.shadowMap.enabled = true;
            if (THREE.PCFSoftShadowMap) r.shadowMap.type = THREE.PCFSoftShadowMap;
          }
        }
      } catch (e) {}
      const kayit = {r: r,
                     asilSetPixelRatio: r.setPixelRatio.bind(r),
                     ickullanim: false};
      kayitlar.push(kayit);

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
          // Gizli sayfa kuralı (aşağıda) bu çizimler için de geçerli: bloom'un
          // kare başına ~10 dörtgen çizimi gizli sayfada GPU'yu boşa yakmasın.
          if (kayit.sayfaEl === undefined) {
            kayit.sayfaEl = r.domElement.closest ? r.domElement.closest(".sayfa") : null;
          }
          if (kayit.sayfaEl && !kayit.sayfaEl.classList.contains("aktif")) return;
          return asilRender(sahne, kamera);
        }
        // YARDIMCI ÇİZİMLER KAYDA GİRMEZ (2026-09-03 ölçümü): PMREMGenerator
        // (CubeUV hedefi) ve CubeCamera (küp hedefi) RoomEnvironment gibi yardımcı
        // sahneleri aynı renderer'la çizer; kayda girince panel «ortam haritası
        // yok / ışık yok» okuyordu (13 kutu + 1 PointLight). Yalnız çizilir.
        const hedefRT = r.getRenderTarget ? r.getRenderTarget() : null;
        if (hedefRT && (hedefRT.isWebGLCubeRenderTarget
            || (hedefRT.texture && THREE.CubeUVReflectionMapping != null
                && hedefRT.texture.mapping === THREE.CubeUVReflectionMapping))) {
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
          setTimeout(function () { try { window.MALZEME3B_OTO(sahne, r); } catch (e) {} }, 1500);
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
          setTimeout(function () {
            try {
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
            } catch (e) {}
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
