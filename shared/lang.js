// Iron Sharpens Iron — i18n engine (en / es / fr)
// Reads ?lang=en|es|fr, persists to localStorage, exposes window.LANG, window.UI,
// window.tr(obj, key), window.VERS, and injects a flag toggle into the header.
(function () {
  var SUPPORTED = ["en", "es", "fr"];
  var LK = "isi-lang";

  function readLang() {
    try {
      var p = new URLSearchParams(window.location.search);
      var q = (p.get("lang") || "").toLowerCase();
      if (SUPPORTED.indexOf(q) >= 0) {
        try { localStorage.setItem(LK, q); } catch (e) {}
        return q;
      }
      var s = localStorage.getItem(LK);
      if (SUPPORTED.indexOf(s) >= 0) return s;
    } catch (e) {}
    return "en";
  }

  var LANG = readLang();
  window.LANG = LANG;

  // BibleGateway version codes per language
  window.VERS = {
    en: ["ESV", "NASB", "NKJV", "NIV", "LSB"],
    es: ["RVR1960", "NVI", "LBLA"],
    fr: ["LSG", "BDS", "S21"]
  };

  // UI string table
  var UI = {
    en: {
      noConfig: "Error: No plan config found.",
      today: "TODAY",
      done: "DONE",
      dayOf: function (d, t) { return "Day " + d + " of " + t + " — Today"; },
      openToday: "📖 Open Today’s Reading",
      memoryVerseLabel: "This Phase’s Memory Verse",
      challengeProgress: "Challenge Progress",
      notStarted: "Not started",
      dayShort: function (d, t) { return "Day " + d + " of " + t; },
      daysTotal: function (t) { return t + " days total"; },
      daysRemaining: function (n) { return n + " days remaining"; },
      readingSchedule: "Reading Schedule",
      showAll: function (t) { return "Show all " + t + " days"; },
      showLess: "Show less",
      phase: "Phase",
      memorize: "Memorize",
      readBtn: function (r, v) { return "📜 Read " + r + " (" + v + ")"; },
      dailyChecklist: "Daily Checklist",
      challengeBegins: function (label) { return "Challenge begins " + label; },
      getReady: "The reading schedule is below. Get ready, men.",
      footerQuote: "“As iron sharpens iron, so one person sharpens another.”",
      footerRef: "Proverbs 27:17",
      months: ["January","February","March","April","May","June","July","August","September","October","November","December"]
    },
    es: {
      noConfig: "Error: No se encontró la configuración del plan.",
      today: "HOY",
      done: "HECHO",
      dayOf: function (d, t) { return "Día " + d + " de " + t + " — Hoy"; },
      openToday: "📖 Abrir lectura de hoy",
      memoryVerseLabel: "Versículo para memorizar de esta fase",
      challengeProgress: "Progreso del reto",
      notStarted: "No comenzado",
      dayShort: function (d, t) { return "Día " + d + " de " + t; },
      daysTotal: function (t) { return t + " días en total"; },
      daysRemaining: function (n) { return n + " días restantes"; },
      readingSchedule: "Calendario de lectura",
      showAll: function (t) { return "Mostrar los " + t + " días"; },
      showLess: "Mostrar menos",
      phase: "Fase",
      memorize: "Memorizar",
      readBtn: function (r, v) { return "📜 Leer " + r + " (" + v + ")"; },
      dailyChecklist: "Lista diaria",
      challengeBegins: function (label) { return "El reto comienza el " + label; },
      getReady: "El calendario de lectura está abajo. Prepárense, hombres.",
      footerQuote: "“Hierro con hierro se aguza; y así el hombre aguza el rostro de su amigo.”",
      footerRef: "Proverbios 27:17",
      months: ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]
    },
    fr: {
      noConfig: "Erreur : configuration du plan introuvable.",
      today: "AUJOURD’HUI",
      done: "TERMINÉ",
      dayOf: function (d, t) { return "Jour " + d + " sur " + t + " — Aujourd’hui"; },
      openToday: "📖 Ouvrir la lecture du jour",
      memoryVerseLabel: "Verset à mémoriser pour cette phase",
      challengeProgress: "Progression du défi",
      notStarted: "Pas commencé",
      dayShort: function (d, t) { return "Jour " + d + " sur " + t; },
      daysTotal: function (t) { return t + " jours au total"; },
      daysRemaining: function (n) { return "Reste " + n + " jours"; },
      readingSchedule: "Calendrier de lecture",
      showAll: function (t) { return "Afficher les " + t + " jours"; },
      showLess: "Afficher moins",
      phase: "Phase",
      memorize: "À mémoriser",
      readBtn: function (r, v) { return "📜 Lire " + r + " (" + v + ")"; },
      dailyChecklist: "Liste quotidienne",
      challengeBegins: function (label) { return "Le défi commence le " + label; },
      getReady: "Le calendrier de lecture est ci-dessous. Préparez-vous, frères.",
      footerQuote: "« Le fer aiguise le fer, ainsi un homme aiguise un autre homme. »",
      footerRef: "Proverbes 27:17",
      months: ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"]
    }
  };
  window.UI = UI[LANG] || UI.en;

  // Look up a localized field on a plan object: tr(d, "topic") returns d.topic_es / d.topic_fr / d.topic
  window.tr = function (obj, key) {
    if (!obj) return "";
    if (LANG !== "en") {
      var v = obj[key + "_" + LANG];
      if (v != null && v !== "") return v;
    }
    return obj[key] != null ? obj[key] : "";
  };

  // Pretty short label for the toggle
  var FLAG = { en: "EN", es: "ES", fr: "FR" };
  var FLAG_LABEL = { en: "English", es: "Español", fr: "Français" };

  function setLang(code) {
    if (SUPPORTED.indexOf(code) < 0) return;
    try { localStorage.setItem(LK, code); } catch (e) {}
    var url = new URL(window.location.href);
    if (code === "en") url.searchParams.delete("lang");
    else url.searchParams.set("lang", code);
    window.location.href = url.toString();
  }
  window.setLang = setLang;

  // Inject the language toggle into the header. Idempotent.
  function injectToggle() {
    if (document.getElementById("lang-toggle")) return;
    var host = document.querySelector(".header-inner") || document.querySelector("header");
    if (!host) return;
    var wrap = document.createElement("div");
    wrap.id = "lang-toggle";
    wrap.className = "lang-toggle";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Language");
    var html = "";
    for (var i = 0; i < SUPPORTED.length; i++) {
      var c = SUPPORTED[i];
      var active = c === LANG ? " active" : "";
      html += '<button type="button" class="lang-btn' + active +
        '" onclick="setLang(\'' + c + '\')" aria-label="' + FLAG_LABEL[c] +
        '" title="' + FLAG_LABEL[c] + '">' + FLAG[c] + '</button>';
    }
    wrap.innerHTML = html;
    host.appendChild(wrap);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectToggle);
  } else {
    injectToggle();
  }

  // Reflect language on <html lang="">
  try { document.documentElement.setAttribute("lang", LANG); } catch (e) {}
})();
