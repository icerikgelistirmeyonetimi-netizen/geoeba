
/* ============ SABİT MEKANİK: yalnız ileri/geri, kilit YOK ============ */
(function () {
  const SAYFA_SAYISI = 4;
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
    emptyset: "∅", forall: "∀", exists: "∃", therefore: "∴", because: "∵",
    /* 2026-09-27 (geoeba 10.7.2): koşullu olasılık «P(L \mid H)» toast'ta
       «P(L mid H)» görünüyordu; mantık ve küme komutlarının da düz karşılığı. */
    mid: "|", vert: "|", lvert: "|", rvert: "|", neg: "¬", lnot: "¬",
    wedge: "∧", land: "∧", vee: "∨", lor: "∨", setminus: "∖",
    subseteq: "⊆", supseteq: "⊇", varnothing: "∅", prime: "′"
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
    /* Tek sayı/harf kökünde parantez gereksiz («√(9)» → «√9»); grupta korunur.
       Kök çizgisi (aşağıda, kokCizgisi) iki durumda da ifadenin üstünü çizer. */
    /* n. dereceden kök (geoeba parti raporu 9.1.1: \sqrt[4]{16^3} düz metne
       çevrilmiyordu): 3 → ∛, 4 → ∜, diğerleri üst simge + √ (ⁿ√x). */
    s = s.replace(/\\sqrt\s*\[\s*([^\]\s]+)\s*\]\s*\{([^{}]*)\}/g, (t, n, x) => {
      const isaret = n === "3" ? "∛" : n === "4" ? "∜" : latexSimge(n, LATEX_UST, "") + "√";
      return /^[0-9A-Za-zπ.,⁰¹²³⁴⁵⁶⁷⁸⁹]+$/.test(x.trim()) ? isaret + x.trim() : isaret + "(" + x + ")";
    });
    s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, (t, x) =>
      /^[0-9A-Za-zπ.,]+$/.test(x.trim()) ? "√" + x.trim() : "√(" + x + ")");
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
    kok.querySelectorAll("svg text").forEach(kokCizgisi);
    kokHtmlTara(kok);
  }

  /* ==== KÖK İŞARETİ — TEK PARÇA (2026-09-26 → 2026-10-17) ================
     İlk sürüm (2026-09-26, geoeba uzman raporu: «köklü gösterimler yarım
     kalmış, kök işareti gibi değil de tik gibi duruyor») kökün altını
     `text-decoration: overline` ile çiziyordu. Kullanıcı 16.10: «köklü
     sayıların yazımında hata var hep kök işareti hep yarım latexde böyle mi
     yazılıyor». Ölçüldü: Nunito'nun √ glifinin tepesi 0,764 em, rakam tepesi
     0,711 em; overline ise yazı tipinin ascent'inde (1,011 em) çizilir → üst
     çizgi rakamların 0,3 em yukarısında, kancadan kopuk yüzer. Overline'ın
     yüksekliği CSS'te ayarlanamaz; √ ile çizgiyi aynı fonttan almak da
     çözmez (Nunito'da glif tepesi rakama 0,05 em yakın, çizgi rakama değer).
     ÇÖZÜM (LaTeX \sqrt gibi): kök işareti (kanca + yükselen çizgi + üst çizgi)
     ölçüye göre TEK PARÇA çizilir, √ glifi metinde KALIR ama boyanmaz.
       SVG: «√16» → `<tspan data-kok-isaret>√</tspan><tspan data-kok>16</tspan>`
            + metnin hemen ÖNÜNE `<image data-kok-cizim>` (veri URI'li SVG).
            <path> değil <image>: yazi_standardi'nin kutu/çizgi taramaları
            (rect·path·line…) ve sayfa kodunun querySelector('path')'leri onu
            görmez; z-sırası metninkiyle aynı kalır (hale metnin altında).
       HTML: «Kenar √8 br» → `<egitsel-kok-metin>Kenar <egitsel-kok>√</egitsel-kok>8 br</egitsel-kok-metin>`;
            kök ::before'da CSS maskesiyle currentColor boyanır (renk/görünürlük
            kendiliğinden izlenir). Özel öğe adı: querySelector('span') etkilenmez.
     Panel (arayuz.html cdYol/cdImza, HD_DOM_DISI) bu çalışma anı düğümlerini
     süzer — adları değişirse orası da değişmeli.
     KARAKTER DEĞİŞMEZ — textContent birebir aynı kalır, sayfa kodunun metin
     karşılaştırmaları etkilenmez (korpusta metin düğümüne doğrudan yazan ya
     da innerHTML karşılaştıran sayfa yok, 2026-10-17 taraması). İşlem
     eş-güçlüdür. Gözcü yeniler: metin değişince, yazı boyu/rengi/konumu
     değişince (yazi_standardi satır içi font-size, hale), gizli grup açılınca
     (sınıf/stil/display), sayfa değişince, font yüklenince. Ölçülemeyen
     durumda (gizli, döndürülmüş, defs içi) glif boyanır — eski görünüme düşer,
     hiçbir zaman kök kaybolmaz. */
  const KOK_ISARETI = /[√∛∜]/;
  const KOK_NS = "http://www.w3.org/2000/svg";
  const KOK_INDEKS = {"∛": "3", "∜": "4"};
  function kokGovdeSonu(metin, i) {
    if (metin[i] === "(") {
      let derin = 0;
      for (let j = i; j < metin.length; j++) {
        if (metin[j] === "(") derin++;
        else if (metin[j] === ")" && --derin === 0) return j + 1;
      }
      return i;                                   // kapanmayan parantez: dokunma
    }
    /* Ondalık ayırıcı ancak ardından rakam/harf gelirse kök altındadır:
       «√2,5» bütün, «√2, √3»te virgül dışarıda (2026-10-17 MAT.8.1.4 s08) */
    const m = /^[0-9A-Za-zÇĞİÖŞÜçğıöşüπ⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ₀₁₂₃₄₅₆₇₈₉]+(?:[.,][0-9A-Za-zÇĞİÖŞÜçğıöşüπ⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ₀₁₂₃₄₅₆₇₈₉]+)*/.exec(metin.slice(i));
    return m ? i + m[0].length : i;
  }

  /* ---- Ölçü: yazı tipi başına önbellek (tuval, 1000 px) ---- */
  const kokTuval = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const kokFontlar = new Map();
  function kokFontYazisi(st) {
    return (st.fontStyle && st.fontStyle !== "normal" ? st.fontStyle + " " : "") +
      (st.fontWeight || "400") + " 1000px " + st.fontFamily;
  }
  function kokFontu(st) {
    const ad = kokFontYazisi(st);
    let f = kokFontlar.get(ad);
    if (f) return f;
    const c = kokTuval;
    c.font = ad; c.letterSpacing = "0px";
    const m = c.measureText("Hl");
    f = { ad, asc: m.fontBoundingBoxAscent / 1000 || 1, desc: m.fontBoundingBoxDescent / 1000 || 0.3 };
    /* Gövde kalınlığı: «l» 200 px'te çizilir, taban üstü 0,35 em satırındaki
       mürekkep sayılır → kök çizgisi yazının ağırlığıyla aynı kalınlıkta. */
    const cv = c.canvas; cv.width = 160; cv.height = 260;
    c.clearRect(0, 0, 160, 260);
    c.font = ad.replace(" 1000px ", " 200px "); c.fillStyle = "#000"; c.textBaseline = "alphabetic";
    c.fillText("l", 40, 220);
    const satir = c.getImageData(0, 220 - 70, 160, 1).data;
    let say = 0;
    for (let i = 3; i < satir.length; i += 4) if (satir[i] > 127) say++;
    f.kalin = Math.min(0.13, Math.max(0.05, (say / 200 || 0.09) * 0.82));
    if (!document.fonts || document.fonts.check(ad)) kokFontlar.set(ad, f);
    return f;
  }
  function kokMetinOlcusu(st, metin) {
    const c = kokTuval;
    c.font = kokFontYazisi(st); c.letterSpacing = "0px";
    const m = c.measureText(metin);
    return { gen: m.width / 1000, ust: m.actualBoundingBoxAscent / 1000 };
  }

  /* ---- Geometri (em; taban y=0, aşağı +; x=0 işaretin başı) ----
     aw: işaretin ilerlemesi, rw: işaret sonundan kök altının sonuna, ust: kök
     altının mürekkep tepesi, t: çizgi kalınlığı, hale: metnin hale yarıçapı. */
  function kokGeometrisi(aw, rw, ust, t, hale, indeks) {
    const tepe = -(Math.max(ust, 0.46) + 0.1 + t / 2);    // üst çizginin ekseni
    const f = Math.min(1.3, Math.max(0.75, aw / 0.6));
    const dip = 0.15;
    const P = [[0.07 * f, -0.33], [0.155 * f, -0.4], [0.31 * f, dip],
               [Math.max(0.31 * f + 0.12, aw - 0.03), tepe], [aw + rw + 0.03, tepe]];
    const pay = t / 2 + hale + 0.02;
    const x0 = Math.min(P[0][0] - pay, indeks ? -0.02 : 9), y0 = tepe - pay;
    return { P, x0, y0, w: P[4][0] + pay - x0, h: dip + pay - y0, tepe };
  }
  function kokSvgYazisi(g, t, boya) {
    const n = (v) => Math.round(v * 1000);
    const d = "M" + g.P.map((p) => n(p[0]) + " " + n(p[1])).join("L");
    const cizgi = (renk, op, gen) => `<path d="${d}" fill="none" stroke="${renk}"` +
      (op < 1 ? ` stroke-opacity="${op}"` : "") +
      ` stroke-width="${n(gen)}" stroke-linejoin="round" stroke-linecap="round"/>`;
    let ic = "";
    if (boya.hale > 0) ic += cizgi(boya.haleRenk, boya.haleOp, t + 2 * boya.hale);
    ic += cizgi(boya.renk, boya.op, t);
    if (boya.indeks) {
      ic += `<text x="0" y="-460" font-size="420" font-family="sans-serif" font-weight="600" fill="${boya.renk}"` +
        (boya.hale > 0 ? ` stroke="${boya.haleRenk}" stroke-width="${n(2 * boya.hale)}" paint-order="stroke"` : "") +
        `>${boya.indeks}</text>`;
    }
    return "data:image/svg+xml," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${n(g.x0)} ${n(g.y0)} ${n(g.w)} ${n(g.h)}" preserveAspectRatio="none">${ic}</svg>`);
  }
  function kokYaz(el, ad, deger) {               // aynı değeri yazma: gözcü döngüsü olmasın
    if (deger === null) { if (el.hasAttribute(ad)) el.removeAttribute(ad); }
    else if (el.getAttribute(ad) !== deger) el.setAttribute(ad, deger);
  }
  function kokStil(el, ad, deger) {
    if (el.style.getPropertyValue(ad) !== deger) {
      if (deger) el.style.setProperty(ad, deger); else el.style.removeProperty(ad);
    }
  }
  function kokGlif(s, gizli) {
    kokStil(s, "fill-opacity", gizli ? "0" : "");
    kokStil(s, "stroke-opacity", gizli ? "0" : "");
  }
  function kokRenk(c) {
    return c && c !== "none" && !/^url\(/.test(c) ? c : null;
  }

  /* ---- SVG ---- */
  const kokYazilari = new Set();
  const KOK_ICERIK_DISI = "defs, symbol, clipPath, mask, pattern, marker";
  function kokDugumu(d, eskiUsul) {
    const metin = d.nodeValue;
    if (!metin || !KOK_ISARETI.test(metin)) return false;
    const parca = document.createDocumentFragment();
    let son = 0, degisti = false;
    for (let i = 0; i < metin.length; i++) {
      if (!KOK_ISARETI.test(metin[i])) continue;
      const bit = kokGovdeSonu(metin, i + 1);
      if (bit <= i + 1) continue;
      if (eskiUsul) {
        parca.appendChild(document.createTextNode(metin.slice(son, i + 1)));
      } else {
        parca.appendChild(document.createTextNode(metin.slice(son, i)));
        const s = document.createElementNS(KOK_NS, "tspan");
        s.setAttribute("data-kok-isaret", "");
        s.textContent = metin[i];
        parca.appendChild(s);
      }
      const t = document.createElementNS(KOK_NS, "tspan");
      t.setAttribute("data-kok", "");
      if (eskiUsul) t.style.textDecoration = "overline";
      t.textContent = metin.slice(i + 1, bit);
      parca.appendChild(t);
      son = bit; i = bit - 1; degisti = true;
    }
    if (!degisti) return false;
    parca.appendChild(document.createTextNode(metin.slice(son)));
    d.parentNode.replaceChild(parca, d);
    return true;
  }
  function kokCizgisi(yazi) {
    if (!yazi || yazi.closest("mjx-container")) return;
    /* defs/symbol içi (use ile çoğaltılır) ve textPath ölçülemez: eski üst çizgi */
    const eskiUsul = !!(yazi.closest(KOK_ICERIK_DISI) || yazi.querySelector("textPath"));
    [yazi, ...yazi.querySelectorAll("tspan:not([data-kok]):not([data-kok-isaret])")].forEach((el) => {
      if (el.closest("[data-kok], [data-kok-isaret]")) return;
      Array.from(el.childNodes).forEach((d) => { if (d.nodeType === 3) kokDugumu(d, eskiUsul); });
    });
    if (!eskiUsul) kokCiz(yazi);
  }
  function kokCiz(yazi) {
    const resimler = yazi.__kokResimler || (yazi.__kokResimler = []);
    const isaretler = yazi.isConnected ? Array.from(yazi.querySelectorAll("tspan[data-kok-isaret]")) : [];
    while (resimler.length > isaretler.length) resimler.pop().remove();
    /* cloneNode ile gelen yetim çizimler: metnin önündeki tanınmayanlar silinir */
    for (let e = yazi.previousElementSibling; e && e.hasAttribute("data-kok-cizim");) {
      const onceki = e.previousElementSibling;
      if (!resimler.includes(e)) e.remove();
      e = onceki;
    }
    if (!isaretler.length) { kokYazilari.delete(yazi); return; }
    kokYazilari.add(yazi);
    const ana = yazi.parentNode;
    const gorunur = kokGorunur(yazi);
    const mt = gorunur && yazi.getScreenCTM && yazi.getScreenCTM();
    const mp = gorunur && ana && ana.getScreenCTM && ana.getScreenCTM();
    const stY = getComputedStyle(yazi);
    isaretler.forEach((s, i) => {
      let img = resimler[i];
      const vazgec = () => { if (img) kokStil(img, "display", "none"); kokGlif(s, false); };
      const r = s.nextSibling;
      if (!mt || !mp || !r || r.nodeType !== 1 || !r.hasAttribute("data-kok")) return vazgec();
      let a, b, son, kap;
      try {
        const n = r.getNumberOfChars();
        if (!n) return vazgec();
        a = s.getStartPositionOfChar(0); b = s.getEndPositionOfChar(0);
        son = r.getEndPositionOfChar(n - 1); kap = r.getExtentOfChar(0);
      } catch (e) { return vazgec(); }
      const st = getComputedStyle(r);
      const fs = parseFloat(st.fontSize) || 16;
      const aw = (b.x - a.x) / fs, rw = (son.x - b.x) / fs;
      if (!(aw > 0.1 && aw < 2) || !(rw > 0) || Math.abs(son.y - b.y) > fs * 0.3) return vazgec();
      const font = kokFontu(st);
      const olcu = kokMetinOlcusu(st, r.textContent);
      /* taban: getStartPositionOfChar().y çapa y'sidir (dominant-baseline
         central'da tabanı vermez, ölçüldü) → karakter kutusu + ascent oranı */
      const taban = kap.y + kap.height * font.asc / (font.asc + font.desc);
      const sw = parseFloat(st.strokeWidth) || 0;
      const haleRenk = kokRenk(st.stroke);
      const boya = {
        renk: kokRenk(st.fill) || kokRenk(stY.fill) || "#1f2933",
        op: Math.round((parseFloat(st.fillOpacity) || 0) * 100) / 100,
        hale: haleRenk && sw > 0 && parseFloat(st.strokeOpacity) > 0 ? sw / 2 / fs : 0,
        haleRenk, haleOp: Math.round((parseFloat(st.strokeOpacity) || 0) * 100) / 100,
        indeks: KOK_INDEKS[s.textContent] || ""
      };
      if (!(boya.op > 0)) boya.op = 1;
      const g = kokGeometrisi(aw, rw, olcu.ust, font.kalin, boya.hale, boya.indeks);
      if (!img) {
        img = document.createElementNS(KOK_NS, "image");
        img.setAttribute("data-kok-cizim", "");
        img.setAttribute("aria-hidden", "true");
        img.setAttribute("pointer-events", "none");
        img.setAttribute("preserveAspectRatio", "none");
        img.addEventListener("load", () => {
          img.__yuklendi = true;
          if (img.__isaret && img.style.display !== "none") kokGlif(img.__isaret, true);
        });
        resimler[i] = img;
      }
      img.__isaret = s;
      if (img.parentNode !== ana || img.nextSibling !== yazi && !resimlerArasinda(img, yazi)) ana.insertBefore(img, yazi);
      const k = (v) => String(Math.round(v * 100) / 100);
      kokYaz(img, "href", kokSvgYazisi(g, font.kalin, boya));
      kokYaz(img, "x", k(a.x + g.x0 * fs));
      kokYaz(img, "y", k(taban + g.y0 * fs));
      kokYaz(img, "width", k(g.w * fs));
      kokYaz(img, "height", k(g.h * fs));
      const m = mp.inverse().multiply(mt);
      const birim = Math.abs(m.a - 1) < 1e-6 && Math.abs(m.d - 1) < 1e-6 && Math.abs(m.b) < 1e-6 &&
        Math.abs(m.c) < 1e-6 && Math.abs(m.e) < 1e-3 && Math.abs(m.f) < 1e-3;
      kokYaz(img, "transform", birim ? null :
        "matrix(" + [m.a, m.b, m.c, m.d, m.e, m.f].map((v) => +v.toFixed(5)).join(" ") + ")");
      kokStil(img, "display", "");
      kokStil(img, "opacity", stY.opacity !== "1" ? stY.opacity : "");
      kokStil(img, "visibility", stY.visibility !== "visible" ? stY.visibility : "");
      if (img.__yuklendi) kokGlif(s, true);
    });
  }
  /* checkVisibility() display:none'lı SVG <g> içindeki metne de true der
     (Chrome, 2026-10-17 ölçüldü) → SVG ataları elle yürünür, HTML'de ona bırakılır. */
  function kokGorunur(el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      if (e.namespaceURI !== KOK_NS) return e.checkVisibility ? e.checkVisibility() : e.getClientRects().length > 0;
      if (getComputedStyle(e).display === "none") return false;
    }
    return !!el.isConnected;
  }
  function resimlerArasinda(img, yazi) {        // img, metnin önündeki çizim dizisinde mi?
    for (let e = yazi.previousElementSibling; e && e.hasAttribute("data-kok-cizim"); e = e.previousElementSibling) {
      if (e === img) return true;
    }
    return false;
  }

  /* ---- HTML ---- */
  const kokHtmller = new Set();
  const KOK_HTML_DISI = "script, style, textarea, title, option, select, noscript, template, code, pre, " +
    "svg, math, mjx-container, .MathJax, [contenteditable=''], [contenteditable='true'], egitsel-kok, egitsel-kok-metin";
  function kokHtmlDugumu(d) {
    const metin = d.nodeValue;
    if (!metin || !KOK_ISARETI.test(metin)) return;
    const ust = d.parentElement;
    if (!ust || ust.closest(KOK_HTML_DISI)) return;
    if (/\\[([]|\$/.test(ust.textContent)) return;        // MathJax henüz dizmedi: kaynağa dokunma
    /* Bütün metin düğümü TEK satır içi sarmalayıcıya girer: kart flex/grid ise
       «Kenar: √20 br» yine tek flex öğesi kalır (√ ayrı öğe olsaydı araya
       gap girer, ::before ölçüsü blok kutuya kayardı). */
    const sar = document.createElement("egitsel-kok-metin");
    const yeni = [];
    let son = 0;
    for (let i = 0; i < metin.length; i++) {
      if (!KOK_ISARETI.test(metin[i])) continue;
      const bit = kokGovdeSonu(metin, i + 1);
      if (bit <= i + 1) continue;
      if (i > son) sar.appendChild(document.createTextNode(metin.slice(son, i)));
      const k = document.createElement("egitsel-kok");
      k.textContent = metin[i];
      sar.appendChild(k); yeni.push(k);
      son = i + 1; i = bit - 1;
    }
    if (!yeni.length) return;
    sar.appendChild(document.createTextNode(metin.slice(son)));
    ust.replaceChild(sar, d);
    yeni.forEach(kokHtmlOlc);
  }
  function kokHtmlOlc(k) {
    if (!k.isConnected) { kokHtmller.delete(k); return; }
    kokHtmller.add(k);
    const ardi = k.nextSibling;
    const govde = ardi && ardi.nodeType === 3 ? ardi.nodeValue.slice(0, kokGovdeSonu(ardi.nodeValue, 0)) : "";
    if (!govde) { kokYaz(k, "data-kok-hazir", null); return; }
    const st = getComputedStyle(k);
    const fs = parseFloat(st.fontSize) || 16;
    const ara = (parseFloat(st.letterSpacing) || 0) / fs;
    const donustur = st.textTransform === "uppercase" ? (x) => x.toLocaleUpperCase("tr") : (x) => x;
    const font = kokFontu(st);
    const olcu = kokMetinOlcusu(st, donustur(govde));
    const aw = kokMetinOlcusu(st, k.textContent).gen + ara;
    const g = kokGeometrisi(aw, olcu.gen + ara * (govde.length - 1), olcu.ust, font.kalin, 0,
                            KOK_INDEKS[k.textContent] || "");
    const em = (v) => (Math.round(v * 1000) / 1000) + "em";
    kokStil(k, "--kok-m", 'url("' + kokSvgYazisi(g, font.kalin,
      { renk: "#000", op: 1, hale: 0, indeks: KOK_INDEKS[k.textContent] || "" }) + '")');
    kokStil(k, "--kok-x", em(g.x0));
    kokStil(k, "--kok-y", em(font.asc + g.y0));          // satır içi kutunun üstü = taban − ascent
    kokStil(k, "--kok-w", em(g.w));
    kokStil(k, "--kok-h", em(g.h));
    kokYaz(k, "data-kok-hazir", "");
  }
  function kokHtmlTara(kok) {
    if (!kok) return;
    const yuru = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT);
    const liste = [];
    while (yuru.nextNode()) if (KOK_ISARETI.test(yuru.currentNode.nodeValue)) liste.push(yuru.currentNode);
    liste.forEach(kokHtmlDugumu);
  }

  /* ---- Gözcü ---- */
  (function kokGozcusu() {
    if (!window.MutationObserver) return;
    let cizilecek = new Set(), taranacak = new Set(), olculecek = new Set(), zamanlayici = 0, hepsi = false;
    const isle = () => {
      zamanlayici = 0;
      const ciz = cizilecek, tara = taranacak, olc = olculecek, tum = hepsi;
      cizilecek = new Set(); taranacak = new Set(); olculecek = new Set(); hepsi = false;
      tara.forEach((n) => {
        if (!n.isConnected) return;
        if (n.nodeType === 3) {
          const y = n.parentElement && n.parentElement.closest("svg text");
          if (y) ciz.add(y); else kokHtmlDugumu(n);
        } else if (n.matches && n.matches("svg text")) ciz.add(n);
        else {
          if (n.querySelectorAll) n.querySelectorAll("svg text").forEach((x) => ciz.add(x));
          if (!n.closest || !n.closest("svg")) kokHtmlTara(n);
        }
      });
      if (tum) { kokYazilari.forEach((y) => ciz.add(y)); kokHtmller.forEach((k) => olc.add(k)); }
      ciz.forEach(kokCizgisi);
      olc.forEach(kokHtmlOlc);
      gozcu.takeRecords();                       // kendi yazdıklarımız yeniden tetiklemesin
    };
    const planla = () => { if (!zamanlayici) zamanlayici = requestAnimationFrame(isle); };
    const KONUM = { transform: 1, x: 1, y: 1 };
    const gozcu = new MutationObserver((kayitlar) => {
      for (const k of kayitlar) {
        const hedef = k.target;
        const el = hedef.nodeType === 3 ? hedef.parentNode : hedef;
        if (!el || !el.closest) continue;
        if (el.closest("[data-kok-cizim], egitsel-kok, [data-kok-isaret]")) continue;
        const yazi = el.closest("svg text");
        if (k.type === "childList") {
          if (yazi) cizilecek.add(yazi);
          k.addedNodes.forEach((n) => {
            if (n.nodeType === 3 ? KOK_ISARETI.test(n.nodeValue) : n.nodeType === 1 && !n.hasAttribute("data-kok-cizim")) taranacak.add(n);
          });
          k.removedNodes.forEach((n) => {
            if (n.nodeType !== 1) return;
            if (n.matches("svg text")) kokCiz(n);
            else kokYazilari.forEach((y) => { if (!y.isConnected) kokCiz(y); });
          });
        } else if (k.type === "characterData") {
          if (yazi) cizilecek.add(yazi);
          else if (KOK_ISARETI.test(hedef.nodeValue)) taranacak.add(hedef);
          else if (hedef.previousSibling && hedef.previousSibling.nodeName === "EGITSEL-KOK") olculecek.add(hedef.previousSibling);
        } else if (yazi) {
          cizilecek.add(yazi);                   // metnin kendi niteliği: konum, boy, renk, hale
        } else if (!KONUM[k.attributeName]) {
          /* ata öğede sınıf/stil/görünürlük: içindeki kökler yeniden ölçülür
             (konum nitelikleri muaf — çizim metinle aynı atada, birlikte taşınır) */
          kokYazilari.forEach((y) => { if (el.contains(y)) cizilecek.add(y); });
          kokHtmller.forEach((h) => { if (el.contains(h)) olculecek.add(h); });
        }
      }
      if (cizilecek.size || taranacak.size || olculecek.size) planla();
    });
    const bagla = () => {
      const kap = document.getElementById("sayfalar") || document.body;
      if (!kap) return;
      const ayar = { subtree: true, childList: true, characterData: true, attributes: true,
        attributeFilter: ["class", "style", "hidden", "display", "visibility", "opacity", "transform",
          "x", "y", "dx", "dy", "font-size", "font-weight", "font-family", "fill", "fill-opacity",
          "stroke", "stroke-width", "text-anchor", "dominant-baseline", "letter-spacing"] };
      gozcu.observe(kap, ayar);
      const toast = document.getElementById("toast");
      if (toast && !kap.contains(toast)) gozcu.observe(toast, ayar);
      /* Etkileşim sonu ve geçişler (CSS :hover/animasyon gözcüye görünmez) */
      const sonra = () => { hepsi = true; planla(); };
      ["pointerup", "click", "transitionend", "animationend"].forEach((ad) => kap.addEventListener(ad, sonra, true));
      addEventListener("resize", sonra);
      if (document.fonts) {
        document.fonts.ready.then(() => { kokFontlar.clear(); sonra(); });
        document.fonts.addEventListener && document.fonts.addEventListener("loadingdone", () => { kokFontlar.clear(); sonra(); });
      }
      kokHtmlTara(kap);
      if (toast && !kap.contains(toast)) kokHtmlTara(toast);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bagla);
    else bagla();
  })();

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
    /* İlk cümle yeter — ama sıra sayısı («6. ve 7. değer», «2. kutuya»),
       tek harfli kısaltma («A.A. ile», «K.K.K.») ve «vb./vs./örn.» noktası
       cümle sonu DEĞİLDİR (2026-09-26: bu noktalarda dönüt yarıda kesiliyordu). */
    const son = m.search(/(?<!\d)(?<!(?:^|[\s(.])\p{Lu})(?<!\b(?:vb|vs|örn|bkz))[.!?](?=\s|$)/u);
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
    // SAYFAYA DÖNÜŞTE SIFIRLAMA: etkileşim kurulmuş sayfaya dönüş → temiz yeniden açılış
    if (typeof window.SABLON_DONUS_SIFIRLA === "function" && window.SABLON_DONUS_SIFIRLA(n, baslatilan)) return;
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
                // 2026-09-19 (18.09 denetimi: 190 bulgunun 190'ı adsız, yalnız ilk çift, 160'ta kör kesim): metni kütüphane
                // kurar (KONUM3B.esDuzlemMesaji — en çok 3 mesh çifti, künye + yüz + eksene göre yön) ve kayıt deftere
                // DOĞRUDAN yazılır: JS_HATA_KAYDET'in 160 sınırı gerçek JS hataları içindir, çift listesini ortasından
                // keser. Kayıt biçimi aynı («KONUM3B EŞ DÜZLEM ...»), denetim betiği onu aynı satıra ayırır. Eski kütüphane
                // gömülüyse (esDuzlemMesaji yok) kısa tek çiftli mesaja düşer.
                var msj = window.KONUM3B.esDuzlemMesaji ? window.KONUM3B.esDuzlemMesaji(rp) : "";
                var defter = msj && window.__JS_HATALAR__ ? (window.__JS_HATALAR__[no] || (window.__JS_HATALAR__[no] = [])) : null;
                if (defter) {
                  if (defter.indexOf("KONUM3B " + msj) < 0 && defter.length < 5) defter.push("KONUM3B " + msj);
                } else {
                  var e0 = rp.esDuzlem[0], ek = e0.eksen || "y";
                  window.JS_HATA_KAYDET(no, new Error("EŞ DÜZLEM (z-fighting, çizgili titreme): " + e0.a + " ile " + e0.b + " " + e0.yuz +
                    " aynı " + ek + "=" + (e0.konum != null ? e0.konum : e0.y) + ", örtüşme " + e0.ortusme + " birim² (" + rp.esDuzlem.length +
                    " çift); birini " + ek + " ekseninde 0.01 kaydır"), "KONUM3B");
                }
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
