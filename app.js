/* Klinikk Kostholdsendring, demo. Felles skript: meny, avsløring, video, skjema, teamfilter, bestilling og test.
   Ingenting sendes noe sted. */
(function () {
  "use strict";
  var rot = document.body.getAttribute("data-rot") || "";
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var params = new URLSearchParams(location.search);

  /* ---------- meny ---------- */
  var menyKnapp = $(".topp__meny"), meny = $("#mobilmeny");
  if (menyKnapp && meny) {
    var settMeny = function (apen) {
      menyKnapp.setAttribute("aria-expanded", String(apen));
      menyKnapp.setAttribute("aria-label", apen ? "Lukk meny" : "Åpne meny");
      meny.hidden = !apen;
    };
    menyKnapp.addEventListener("click", function () { settMeny(menyKnapp.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !meny.hidden) { settMeny(false); menyKnapp.focus(); }
    });
  }

  /* ---------- avsløring ved rulling ---------- */
  var avslor = $$(".avslor");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (oppf) {
      oppf.forEach(function (o) { if (o.isIntersecting) { o.target.classList.add("synlig"); io.unobserve(o.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    avslor.forEach(function (el) { io.observe(el); });
  } else {
    avslor.forEach(function (el) { el.classList.add("synlig"); });
  }

  /* ---------- video lastes først ved klikk ---------- */
  $$(".video__ramme").forEach(function (r) {
    var knapp = $(".video__spill", r);
    if (!knapp) return;
    knapp.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + r.getAttribute("data-video") + "?autoplay=1&rel=0";
      f.title = "Film om klinikken";
      f.allow = "autoplay; encrypted-media; picture-in-picture";
      f.allowFullscreen = true;
      r.classList.add("video__ramme--spiller");
      r.innerHTML = "";
      r.appendChild(f);
    });
  });

  /* ---------- kontaktskjema (sender ingenting) ---------- */
  $$("[data-demo-skjema]").forEach(function (skjema) {
    skjema.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var forste = null;
      $$("[required]", skjema).forEach(function (felt) {
        var feil = $("#" + felt.id + "-feil");
        var ok = felt.value.trim() !== "" && (felt.type !== "email" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(felt.value.trim()));
        felt.setAttribute("aria-invalid", ok ? "false" : "true");
        if (feil) feil.hidden = ok;
        if (!ok && !forste) forste = felt;
      });
      if (forste) { forste.focus(); return; }
      var ok = $(".skjema__ok", skjema);
      $$(".felt, button[type=submit], .liten", skjema).forEach(function (el) { if (!ok.contains(el)) el.hidden = true; });
      ok.hidden = false;
    });
  });

  /* ---------- felles data og hjelpere for team, bestilling og test ---------- */
  var KE = window.KE;
  var dagFmt = new Intl.DateTimeFormat("nb-NO", { weekday: "long", day: "numeric", month: "long" });
  var kortDagFmt = new Intl.DateTimeFormat("nb-NO", { weekday: "short" });
  var datoFmt = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short" });
  var kl = function (min) { var h = Math.floor(min / 60), m = min % 60; return (h < 10 ? "0" : "") + h + "." + (m < 10 ? "0" : "") + m; };
  var stor = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  // Eksempeltider: faste ut fra navnet, så de ser like ut hver gang. Ikke ekte.
  function eksempelTider(a) {
    var fro = 0; for (var i = 0; i < a.slug.length; i++) fro = (fro * 31 + a.slug.charCodeAt(i)) % 9973;
    var start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() + 1 + (fro % 3));
    var grunn = a.tid === "kveld" ? [960, 1020, 1080, 1140] : [510, 570, 630, 750, 810, 870];
    var dager = [];
    for (var d = new Date(start); dager.length < 5; d.setDate(d.getDate() + 1)) {
      var u = d.getDay(); if (u === 0 || u === 6) continue;
      var tider = grunn.filter(function (t, j) { return (fro + j * 7 + d.getDate() * 3) % 5 > 1; });
      dager.push({ dato: new Date(d), tider: tider });
    }
    return dager;
  }
  function nesteLedig(a) {
    var dager = eksempelTider(a);
    for (var i = 0; i < dager.length; i++) if (dager[i].tider.length) return stor(dagFmt.format(dager[i].dato)) + " kl. " + kl(dager[i].tider[0]);
    return "";
  }
  function finn(slug) { return KE && KE.ansatte.filter(function (a) { return a.slug === slug; })[0]; }
  function gruppe(id) { return KE && KE.grupper.filter(function (g) { return g.id === id; })[0]; }
  function bildeSti(a) { return rot + KE.bilder + "/" + a.bilde; }
  function passer(a, plage, sted, tid) {
    if (plage && plage !== "alle" && a.omrader.indexOf(plage) < 0) return false;
    if (sted === "klinikk" && a.steder.indexOf("klinikk") < 0) return false;
    if (tid && tid !== "alle" && a.tid !== tid) return false;
    return true;
  }
  function settParam(navn, verdi) {
    var p = new URLSearchParams(location.search);
    if (verdi && verdi !== "alle") p.set(navn, verdi); else p.delete(navn);
    var q = p.toString();
    history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
  }

  /* ---------- teamfilter ---------- */
  var teamFilter = $("[data-filter-team]");
  if (teamFilter) {
    var fP = $("#f-plage"), fS = $("#f-sted"), fT = $("#f-tid"), status = $(".filter__status");
    if (params.get("plage")) fP.value = params.get("plage");
    if (params.get("sted")) fS.value = params.get("sted");
    if (params.get("tid")) fT.value = params.get("tid");
    var oppdater = function () {
      var antall = 0;
      $$(".team__rutenett > li").forEach(function (li) {
        var p = $(".person", li);
        var a = { omrader: (p.getAttribute("data-omrader") || "").split(" "), steder: (p.getAttribute("data-steder") || "").split(" "), tid: p.getAttribute("data-tid") };
        var vis = passer(a, fP.value, fS.value, fT.value);
        li.hidden = !vis; if (vis) antall++;
      });
      status.textContent = antall ? "Viser " + antall + " av 10." : "Ingen treff. Prøv et annet valg, eller ta testen.";
      settParam("plage", fP.value); settParam("sted", fS.value); settParam("tid", fT.value);
    };
    [fP, fS, fT].forEach(function (s) { s.addEventListener("change", oppdater); });
    if (params.toString()) oppdater();
  }

  /* ---------- stegvise skjema (bestilling og test) ---------- */
  function stegSkjema(skjema, valider, nar) {
    var steg = $$("fieldset.steg", skjema);
    var naa = 1;
    function vis(n, fokus) {
      naa = n;
      steg.forEach(function (f) { f.hidden = Number(f.getAttribute("data-steg")) !== n; });
      $$("[data-steg-merke]").forEach(function (m) {
        var i = Number(m.getAttribute("data-steg-merke"));
        if (i === n) m.setAttribute("aria-current", "step"); else m.removeAttribute("aria-current");
        m.classList.toggle("ferdig", i < n);
      });
      if (nar) nar(n);
      if (fokus) {
        var leg = $("legend", steg[n - 1]);
        leg.setAttribute("tabindex", "-1"); leg.focus({ preventScroll: true });
        skjema.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    }
    skjema.addEventListener("click", function (ev) {
      var t = ev.target.closest("[data-neste],[data-tilbake]");
      if (!t) return;
      if (t.hasAttribute("data-tilbake")) { vis(naa - 1, true); return; }
      var feil = $("[data-feil='" + naa + "']", skjema);
      var ok = valider(naa);
      if (feil) feil.hidden = ok;
      if (ok) vis(naa + 1, true);
    });
    return { vis: vis, naa: function () { return naa; } };
  }

  /* ---------- bestilling ---------- */
  var bestill = $("[data-bestill]");
  if (bestill && KE) {
    var liste = $("[data-ansatt-liste]", bestill), bP = $("#b-plage"), bS = $("#b-sted"), bT = $("#b-tid");
    var valgt = { ansatt: null, type: "forste", sted: null, tid: null };
    if (params.get("plage")) bP.value = params.get("plage");
    if (params.get("sted") === "klinikk") bS.value = "klinikk";

    var tegnListe = function () {
      var plage = bP.value, sted = bS.value, tid = bT.value;
      var g = gruppe(plage);
      var ledige = KE.ansatte.filter(function (a) { return a.bestillbar && passer(a, plage, sted, tid); });
      if (g) ledige.sort(function (x, y) { var i = g.folk.indexOf(x.slug), j = g.folk.indexOf(y.slug); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
      var opptatt = KE.ansatte.filter(function (a) { return a.status && passer(a, plage, sted, ""); });
      var kort = function (a, av) {
        var nivå = a.niva ? esc(a.niva) + " · " : "";
        return '<label class="valg' + (av ? " valg--opptatt" : "") + '"><input type="radio" name="ansatt" value="' + a.slug + '"' + (av ? " disabled" : "") + (valgt.ansatt === a.slug ? " checked" : "") + '>' +
          '<img class="valg__bilde" src="' + bildeSti(a) + '" alt="" width="56" height="70" loading="lazy">' +
          '<span class="valg__innhold"><span class="valg__tittel">' + esc(a.navn) + '</span><span class="valg__tekst">' + nivå + esc(a.fag.join(", ")) + '</span>' +
          '<span class="valg__tekst">' + (av ? (a.status === "Fullbooket" ? "Fullbooket. Se andre med samme fagområder." : "I permisjon.") : "Neste ledige time: " + esc(nesteLedig(a)) + " (eksempel)") + "</span></span></label>";
      };
      var html = ledige.map(function (a) { return kort(a, false); }).join("");
      if (!ledige.length) html = '<p class="kalender__tom">Ingen ledige med disse valgene. Prøv et annet filter, eller bestill en gratis samtale.</p>';
      if (opptatt.length) html += '<p class="valg-skille">Ikke ledige nå</p>' + opptatt.map(function (a) { return kort(a, true); }).join("");
      liste.innerHTML = html;
      settParam("plage", plage); settParam("sted", sted);
    };
    [bP, bS, bT].forEach(function (s) { s.addEventListener("change", tegnListe); });
    liste.addEventListener("change", function (ev) { if (ev.target.name === "ansatt") { valgt.ansatt = ev.target.value; valgt.tid = null; settParam("ansatt", valgt.ansatt); } });

    var tegnType = function () {
      var a = finn(valgt.ansatt);
      var tillegg = a.niva === "KEF-ekspert" || a.niva === "KEF-senior" ? 100 : 0;
      var typer = [["forste", "Første time, 60 minutter", "For deg som ikke har vært hos oss før.", 1450],
                   ["opp60", "Oppfølgingstime, 60 minutter", "", 1350 + tillegg], ["opp30", "Oppfølgingstime, 30 minutter", "", 750 + tillegg]];
      var kr = new Intl.NumberFormat("nb-NO");
      $("[data-type-liste]", bestill).innerHTML = typer.map(function (t) {
        return '<label class="valg"><input type="radio" name="type" value="' + t[0] + '"' + (valgt.type === t[0] ? " checked" : "") + '><span class="valg__innhold"><span class="valg__tittel">' + t[1] + "</span>" +
          (t[2] ? '<span class="valg__tekst">' + t[2] + "</span>" : "") + '</span><span class="valg__pris">' + kr.format(t[3]) + " kr</span></label>";
      }).join("");
      if (a.steder.indexOf(valgt.sted) < 0) valgt.sted = a.steder.length === 1 ? "video" : (params.get("sted") === "klinikk" ? "klinikk" : null);
      var steder = [["video", "Video", "Lenke på e-post samme dag. Fungerer på PC, Mac, nettbrett og mobil."],
                    ["klinikk", "Klinikk i Oslo", "Oslo Tennisarena, Eikenga 4 på Hasle."]].filter(function (s) { return a.steder.indexOf(s[0]) >= 0; });
      $("[data-sted-liste]", bestill).innerHTML = steder.map(function (s) {
        return '<label class="valg"><input type="radio" name="sted" value="' + s[0] + '"' + (valgt.sted === s[0] ? " checked" : "") + '><span class="valg__innhold"><span class="valg__tittel">' + s[1] + '</span><span class="valg__tekst">' + s[2] + "</span></span></label>";
      }).join("");
      valgt.typer = typer;
    };
    bestill.addEventListener("change", function (ev) {
      if (ev.target.name === "type") valgt.type = ev.target.value;
      if (ev.target.name === "sted") valgt.sted = ev.target.value;
      if (ev.target.name === "tid") valgt.tid = ev.target.value;
    });

    var tegnKalender = function () {
      var a = finn(valgt.ansatt);
      $("[data-hjelp-tid]", bestill).textContent = "Ledige timer hos " + a.navn + ".";
      $("[data-kalender]", bestill).innerHTML = eksempelTider(a).map(function (d, i) {
        var tider = d.tider.map(function (t) {
          var v = d.dato.getFullYear() + "-" + (d.dato.getMonth() + 1) + "-" + d.dato.getDate() + "|" + t;
          return '<label class="tid"><input type="radio" name="tid" value="' + v + '"' + (valgt.tid === v ? " checked" : "") + ' aria-label="' + esc(dagFmt.format(d.dato)) + " kl. " + kl(t) + '"><span>' + kl(t) + "</span></label>";
        }).join("");
        return '<div class="kalender__dag"><p class="kalender__dato">' + stor(kortDagFmt.format(d.dato)).replace(".", "") + "<span>" + datoFmt.format(d.dato) + '</span></p><div class="kalender__tider">' + (tider || '<p class="kalender__tom">Ingen ledige</p>') + "</div></div>";
      }).join("");
    };

    var tegnOppsummering = function () {
      var a = finn(valgt.ansatt), t = valgt.typer.filter(function (x) { return x[0] === valgt.type; })[0];
      var deler = valgt.tid.split("|"), ymd = deler[0].split("-").map(Number), dato = new Date(ymd[0], ymd[1] - 1, ymd[2]);
      $("[data-oppsummering]", bestill).innerHTML = "<dl><dt>Ernæringsfysiolog</dt><dd>" + esc(a.navn) + "</dd><dt>Time</dt><dd>" + esc(t[1]) + ", " + (valgt.sted === "klinikk" ? "klinikk i Oslo" : "video") +
        "</dd><dt>Tidspunkt</dt><dd>" + stor(dagFmt.format(dato)) + " kl. " + kl(Number(deler[1])) + " (eksempel)</dd><dt>Pris</dt><dd>" + new Intl.NumberFormat("nb-NO").format(t[3]) + " kr, betales etter timen</dd></dl>";
    };

    var flyt = stegSkjema(bestill, function (n) {
      if (n === 1) return !!valgt.ansatt && !!finn(valgt.ansatt) && finn(valgt.ansatt).bestillbar;
      if (n === 2) return !!valgt.type && !!valgt.sted;
      if (n === 3) return !!valgt.tid;
      return true;
    }, function (n) {
      if (n === 2) tegnType();
      if (n === 3) tegnKalender();
      if (n === 4) tegnOppsummering();
    });
    bestill.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var ok = $(".skjema__ok", bestill);
      ok.hidden = false; ok.focus();
    });

    var start = finn(params.get("ansatt"));
    if (start && start.bestillbar) { valgt.ansatt = start.slug; tegnListe(); flyt.vis(2, false); }
    else tegnListe();
  }

  /* ---------- test ---------- */
  var test = $("[data-test]");
  if (test && KE) {
    var resultat = $("[data-resultat]");
    var verdi = function (navn) { var v = $("input[name='" + navn + "']:checked", test); return v ? v.value : ""; };
    stegSkjema(test, function (n) { return n !== 1 || !!verdi("omrade"); });
    test.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var omrade = verdi("omrade"), sted = verdi("sted"), tid = verdi("tid");
      var mer = $$("input[name='mer']:checked", test).map(function (i) { return i.value; });
      var t = KE.test.filter(function (x) { return x.id === omrade; })[0];
      var forslag = t.forslag.map(finn);
      var poeng = function (a) { return mer.filter(function (m) { return a.omrader.indexOf(m) >= 0; }).length; };
      forslag = forslag.map(function (a, i) { return { a: a, p: poeng(a) * 10 - i }; }).sort(function (x, y) { return y.p - x.p; }).map(function (x) { return x.a; });
      var filtrert = forslag.filter(function (a) { return passer(a, "", sted, tid); });
      var note = "";
      if (forslag.length && !filtrert.length) { filtrert = forslag; note = '<p class="liten">Ingen passet helt med valgene for sted og tid, så her er de beste uten det filteret.</p>'; }
      var html;
      if (!filtrert.length) {
        html = '<h2 class="h2">Vi hjelper deg å velge</h2><p class="smal">' + (omrade === "annet" ? "Ernæringsfysiologene har erfaring med mye mer enn det som står i listen." : "De som har mest erfaring med dette er fullbooket akkurat nå.") +
          " Bestill en gratis samtale, så finner vi den beste løsningen for deg.</p>" + '<p><a class="knapp knapp--primar" href="' + rot + 'kontakt-oss-i-dag/#samtale">Bestill gratis samtale</a></p>';
      } else {
        var kort = filtrert.map(function (a) {
          var href = rot + "bestill-time/?ansatt=" + a.slug + (sted === "klinikk" ? "&sted=klinikk" : "");
          return '<li><article class="person"><a class="person__lenke" href="' + rot + "ansatt/" + a.slug + '/"><div class="person__bilde"><img src="' + bildeSti(a) + '" alt="Portrett av ' + esc(a.navn) + '" width="640" height="800" loading="lazy"></div><h3 class="person__navn">' + esc(a.navn) + "</h3></a>" +
            '<p class="person__tekst">Særlig erfaring med ' + esc(t.navn.toLowerCase()) + '.</p><p class="person__sted">Neste ledige time: ' + esc(nesteLedig(a)) + " (eksempel)</p>" +
            '<a class="knapp knapp--primar knapp--liten" href="' + href + '">Bestill time</a></article></li>';
        }).join("");
        html = '<h2 class="h2">Disse kan hjelpe deg</h2><p class="smal">Basert på svarene dine har disse ernæringsfysiologene mest erfaring med det du trenger. Første time koster ' + esc(KE.pris) + ".</p>" + note +
          '<ul class="team__rutenett">' + kort + "</ul>" +
          '<p class="liten">Vil du heller snakke med noen først? <a href="' + rot + 'kontakt-oss-i-dag/#samtale">Bestill en gratis samtale på 15 minutter</a>. Første time koster det samme uansett.</p>';
      }
      html += '<p><button class="knapp knapp--sekundar knapp--liten" type="button" data-igjen>Svar på nytt</button></p>';
      resultat.innerHTML = html;
      test.hidden = true; resultat.hidden = false; resultat.focus();
      $("[data-igjen]", resultat).addEventListener("click", function () { resultat.hidden = true; test.hidden = false; test.reset(); $$("fieldset.steg", test).forEach(function (f, i) { f.hidden = i > 0; }); $("legend", test).focus(); });
    });
  }
})();
