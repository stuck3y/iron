// Iron Sharpens Iron v2.1.0 — Shared Engine
// Expects window.PLAN = { title, subtitle, storageKey, totalDays, days, verses, checks }
// Supports ?start=YYYY-MM-DD query param for custom start dates

(function() {
  var P = window.PLAN;
  if (!P) { document.getElementById("app").innerHTML = '<p style="color:#f87171;padding:20px">Error: No plan config found.</p>'; return; }

  var DAYS = P.days;
  var WV = P.verses;
  var CHECKS = P.checks;
  var CHECK_KEYS = CHECKS.map(function(c) { return c.k; });
  var TOTAL = P.totalDays || 30;
  var PHASE_DAYS = [];
  for (var i = 0; i < DAYS.length; i++) { if (DAYS[i].ph) PHASE_DAYS.push(DAYS[i].day); }

  // Start date: ?start=YYYY-MM-DD or defaults to 1st of current month
  function getStart() {
    var params = new URLSearchParams(window.location.search);
    var qs = params.get("start");
    if (qs && /^\d{4}-\d{2}-\d{2}$/.test(qs)) {
      var parts = qs.split("-");
      var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      if (!isNaN(d.getTime())) return d;
    }
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  var startDate = getStart();
  startDate.setHours(0, 0, 0, 0);

  function getDayNum() {
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var diff = Math.floor((now - startDate) / 86400000) + 1;
    if (diff < 1) return 0; // not started yet
    return Math.min(diff, TOTAL);
  }

  // Storage keyed to the specific start date
  var startStr = startDate.getFullYear() + "-" + (startDate.getMonth() + 1) + "-" + startDate.getDate();
  var SK = P.storageKey + "-" + startStr;
  var VERS = ["ESV", "NASB", "NKJV", "NIV", "LSB"];
  var VK = "isi-version";

  function gver() { try { var v = localStorage.getItem(VK); return VERS.indexOf(v) >= 0 ? v : "ESV"; } catch(e) { return "ESV"; } }
  function sver(v) { try { localStorage.setItem(VK, v); } catch(e) {} }
  function lc() { try { return JSON.parse(localStorage.getItem(SK)) || {}; } catch(e) { return {}; } }
  function sc(d) { try { localStorage.setItem(SK, JSON.stringify(d)); } catch(e) {} }

  var bv = gver();
  var cl = lc();
  var ed = null;
  var sa = false;
  var cd = getDayNum();
  var first = true;

  function gv(d) {
    for (var i = PHASE_DAYS.length - 1; i >= 0; i--) { if (d >= PHASE_DAYS[i]) return WV[PHASE_DAYS[i]]; }
    return WV[PHASE_DAYS[0]];
  }

  function allDone(ch) {
    for (var i = 0; i < CHECK_KEYS.length; i++) { if (!ch[CHECK_KEYS[i]]) return false; }
    return true;
  }

  // Expose globals for onclick handlers
  window.td2 = function(n) { ed = ed === n ? null : n; render(); };
  window.tsa = function() { sa = !sa; render(); };
  window.tc = function(dk, f) { if (!cl[dk]) cl[dk] = {}; cl[dk][f] = !cl[dk][f]; sc(cl); render(); };
  window.sv = function(v) { bv = v; sver(v); render(); };

  function rc(dk, f, lb, ch) {
    var on = !!ch[f];
    return '<button class="check-btn" onclick="tc(\'' + dk + '\',\'' + f + '\')"><span class="cb' + (on ? " on" : "") + '">' +
      (on ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : "") +
      '</span><span class="cl' + (on ? " on" : "") + '">' + lb + '</span></button>';
  }

  function rd(d) {
    var dk = "day-" + d.day, ch = cl[dk] || {}, ad = allDone(ch), it = d.day === cd, io = ed === d.day;
    var cls = it ? "card-today" : ad ? "card-done" : "card";
    var h = '<div class="' + cls + '" style="margin-top:12px"><button class="card-btn" onclick="td2(' + d.day + ')">';
    h += '<div class="day-circle ' + (it ? "dc-today" : ad ? "dc-done" : "dc-def") + '">' + (ad ? "\u2713" : d.day) + '</div>';
    h += '<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
    h += '<span style="font-weight:600;font-size:16px;color:' + (it ? "#fef3c7" : "#e7e5e4") + '">' + d.reading + '</span>';
    if (it) h += '<span class="badge b-today">TODAY</span>';
    if (ad && !it) h += '<span class="badge b-done">DONE</span>';
    h += '</div><p style="font-size:14px;color:#a8a29e;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + d.topic + '</p></div>';
    h += '<svg class="chevron' + (io ? " chevron-open" : "") + '" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';
    h += '</button>';

    if (io) {
      h += '<div class="expand anim"><div style="border-top:1px solid rgba(68,64,60,.5);padding-top:16px"></div>';
      h += '<p style="font-size:14px;line-height:1.625;color:#d6d3d1">' + d.summary + '</p>';
      h += '<a href="https://www.biblegateway.com/passage/?search=' + encodeURIComponent(d.reading) + '&version=' + bv + '" target="_blank" rel="noopener noreferrer" class="read-btn">\uD83D\uDCDC Read ' + d.reading + ' (' + bv + ')</a>';
      h += '<div class="cl-box">';
      h += '<p class="mono" style="font-size:12px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Daily Checklist</p>';
      for (var ci = 0; ci < CHECKS.length; ci++) h += rc(dk, CHECKS[ci].k, CHECKS[ci].l, ch);
      h += '</div></div>';
    }
    h += '</div>';
    return h;
  }

  function render() {
    var a = document.getElementById("app"), h = "";
    var upcoming = cd === 0;
    var td = upcoming ? null : DAYS[cd - 1];
    var v = upcoming ? gv(1) : gv(cd);

    // Upcoming banner
    if (upcoming) {
      var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      var startLabel = months[startDate.getMonth()] + " " + startDate.getDate();
      h += '<div style="border-radius:16px;background:rgba(120,53,15,.2);border:1px solid rgba(180,83,9,.3);padding:20px;text-align:center">';
      h += '<p style="font-size:18px;font-weight:600;color:#fde68a">Challenge begins ' + startLabel + '</p>';
      h += '<p style="font-size:14px;color:#a8a29e;margin-top:4px">The reading schedule is below. Get ready, men.</p></div>';
    }

    // Today card
    if (td) {
      h += '<div class="glow" style="border-radius:16px;border:1px solid rgba(217,119,6,.4);background:linear-gradient(to bottom right,rgba(41,37,36,.8),rgba(28,25,23,.9),rgba(28,25,23,1));padding:20px">';
      h += '<div style="display:flex;align-items:center;justify-content:space-between"><div>';
      h += '<p class="mono" style="font-size:12px;font-weight:600;color:#f59e0b;text-transform:uppercase;letter-spacing:.05em">Day ' + cd + ' of ' + TOTAL + ' \u2014 Today</p>';
      h += '<h2 style="font-size:20px;font-weight:700;color:#fffbeb;margin-top:4px">' + td.reading + '</h2>';
      h += '<p style="font-size:14px;color:#a8a29e;margin-top:2px">' + td.topic + '</p></div>';
      h += '<div style="width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(120,53,15,.3);border:2px solid rgba(180,83,9,.5)"><span style="font-size:24px;font-weight:700;color:#fcd34d">' + cd + '</span></div></div>';
      h += '<a href="https://www.biblegateway.com/passage/?search=' + encodeURIComponent(td.reading) + '&version=' + bv + '" target="_blank" rel="noopener noreferrer" class="read-btn" style="margin-top:16px">\uD83D\uDCD6 Open Today\u2019s Reading</a>';
      h += '<div class="ver-toggle">';
      for (var vi = 0; vi < VERS.length; vi++) h += '<button class="ver-btn' + (VERS[vi] === bv ? ' active' : '') + '" onclick="sv(\'' + VERS[vi] + '\')">' + VERS[vi] + '</button>';
      h += '</div></div>';
    }

    // Memory verse
    if (v) {
      h += '<div style="border-radius:16px;background:rgba(28,25,23,.8);border:1px solid rgba(68,64,60,.4);padding:20px">';
      h += '<p class="mono" style="font-size:12px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">This Phase\u2019s Memory Verse</p>';
      h += '<p style="font-size:16px;font-style:italic;line-height:1.625;color:#e7e5e4">\u201C' + v.t + '\u201D</p>';
      h += '<p style="font-size:14px;font-weight:600;color:#f59e0b;margin-top:8px">\u2014 ' + v.r + '</p></div>';
    }

    // Progress
    var dayPr = upcoming ? 0 : Math.round(cd / TOTAL * 100);
    h += '<div style="border-radius:16px;background:rgba(28,25,23,.6);border:1px solid rgba(68,64,60,.3);padding:20px">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center"><p class="mono" style="font-size:12px;font-weight:600;color:#78716c;text-transform:uppercase;letter-spacing:.05em">Challenge Progress</p><span style="font-size:14px;font-weight:500;color:#a8a29e">' + (upcoming ? "Not started" : "Day " + cd + " of " + TOTAL) + '</span></div>';
    h += '<div class="pb-bg" style="margin-top:12px"><div class="pb-fill" style="width:' + dayPr + '%"></div></div>';
    h += '<p style="font-size:12px;color:#78716c;margin-top:12px">' + (upcoming ? TOTAL + " days total" : (TOTAL - cd) + " days remaining") + '</p></div>';

    // Schedule
    h += '<div>';
    h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><h2 style="font-size:18px;font-weight:700;color:#e7e5e4">Reading Schedule</h2>';
    h += '<button onclick="tsa()" style="font-size:12px;font-weight:500;color:#f59e0b;padding:4px 0">' + (sa ? "Show less" : "Show all " + TOTAL + " days") + '</button></div>';

    var vis = sa ? DAYS : DAYS.slice(0, Math.min(upcoming ? 3 : cd + 2, TOTAL));
    for (var i = 0; i < vis.length; i++) {
      var d = vis[i];
      if (d.ph && d.day > 1) {
        var wv = WV[d.day] || {};
        h += '<div class="wd"><div class="wl"></div><span class="mono" style="font-size:12px;color:#78716c;font-weight:600;text-transform:uppercase;letter-spacing:.05em;white-space:nowrap">Phase ' + d.ph + (wv.r ? ' \u2022 Memorize: ' + wv.r : '') + '</span><div class="wl"></div></div>';
      }
      h += rd(d);
    }
    h += '</div>';

    // Footer
    h += '<footer style="padding-top:32px;padding-bottom:8px;display:flex;align-items:center;justify-content:center;gap:12px;color:#57534e">';
    h += '<span style="font-size:12px;font-style:italic">\u201CAs iron sharpens iron, so one person sharpens another.\u201D</span>';
    h += '<span style="color:#44403c">\u2022</span><span style="font-size:12px">Proverbs 27:17</span></footer>';

    a.innerHTML = h;
    if (first && !upcoming) { first = false; ed = cd; render(); }
  }

  render();
})();
