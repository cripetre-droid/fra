/* ============================================================
   FRA — aplicație (vanilla JS, router pe hash)
   ============================================================ */

/* ---------- helpers DOM ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const k in attrs) {
    if (k === "class") n.className = attrs[k];
    else if (k === "html") n.innerHTML = attrs[k];
    else if (k.startsWith("on") && typeof attrs[k] === "function") n.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] === true) n.setAttribute(k, "");
    else if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k]);
  }
  for (let c of kids.flat()) {
    if (c == null || c === false) continue;
    n.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(c) : c);
  }
  return n;
}
const app = $("#app");
const uid = (p = "id") => p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- date/format ---------- */
function fmtDate(iso) {
  if (!iso) return "—";
  const parts = iso.slice(0, 10).split("-"); // YYYY-MM-DD
  if (parts.length === 3) return parts[2] + "/" + parts[1] + "/" + parts[0];
  return iso;
}
// YYYY-MM-DD în ora LOCALĂ (nu UTC — evită decalajul de o zi seara)
function ymd(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
const today = () => ymd(new Date());
function daysBetween(a, b) {
  const out = [];
  if (!a) return out;
  const start = new Date(a + "T00:00"), end = new Date((b || a) + "T00:00");
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) out.push(ymd(d));
  return out;
}
const balta = id => BALTI.find(b => b.id === id);

/* ---------- toast ---------- */
let toastT;
function toast(msg) {
  let t = $("#toast");
  if (!t) { t = el("div", { id: "toast", class: "toast" }); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show"), 2200);
}

/* ---------- bottom sheet (modal) ---------- */
function sheet(title, buildBody, { onSave, saveLabel = "Salvează" } = {}) {
  const back = el("div", { class: "sheet-back" });
  const body = el("div", { class: "sheet-body" });
  const s = el("div", { class: "sheet" },
    el("div", { class: "sheet-head" },
      el("h3", {}, title),
      el("button", { class: "icon-btn", onclick: close }, "✕")),
    body,
    onSave && el("div", { class: "sheet-foot" },
      el("button", { class: "btn ghost", onclick: close }, "Renunță"),
      el("button", { class: "btn primary", onclick: () => { if (onSave() !== false) close(); } }, saveLabel)));
  back.appendChild(s);
  back.addEventListener("click", e => { if (e.target === back) close(); });
  function close() { back.classList.remove("show"); setTimeout(() => back.remove(), 200); }
  document.body.appendChild(back);
  buildBody(body, close);
  requestAnimationFrame(() => back.classList.add("show"));
  return { close, body };
}

/* ---------- controale reutilizabile ---------- */
// grup de chip-uri single-select
function chips(options, value, onPick, keyOf = o => o, labelOf = o => o) {
  const wrap = el("div", { class: "chips" });
  options.forEach(o => {
    const k = keyOf(o);
    const c = el("button", {
      class: "chip" + (k === value ? " on" : ""), type: "button",
      onclick: () => { value = k; $$(".chip", wrap).forEach(x => x.classList.remove("on")); c.classList.add("on"); onPick(k); }
    }, labelOf(o));
    wrap.appendChild(c);
  });
  return wrap;
}
// input cu autocomplete din listă (datalist)
function autoInput(value, suggestions, placeholder, onInput) {
  const listId = uid("dl");
  const inp = el("input", { class: "inp", type: "text", value: value || "", placeholder, list: listId,
    oninput: e => onInput(e.target.value) });
  const dl = el("datalist", { id: listId }, ...suggestions.map(s => el("option", { value: s })));
  return el("div", {}, inp, dl);
}
// grup culori
function colorChips(value, onPick) {
  const wrap = el("div", { class: "chips colors" });
  const all = [...CULORI.filter(c => c.id !== "alta"),
    ...Store.culoriExtra().map(h => ({ id: "x:" + h, label: h, hex: h })),
    CULORI.find(c => c.id === "alta")];
  all.forEach(c => {
    const on = value === c.id || value === c.label;
    const btn = el("button", { class: "chip color" + (on ? " on" : ""), type: "button", title: c.label,
      onclick: () => {
        if (c.id === "alta") {
          const custom = prompt("Ce culoare?"); if (!custom) return;
          Store.learn("culoriExtra", custom); onPick(custom); toast("Culoare adăugată"); return;
        }
        $$(".chip.color", wrap).forEach(x => x.classList.remove("on")); btn.classList.add("on");
        onPick(c.id === "alta" ? c.label : c.id);
      } },
      c.hex ? el("span", { class: "dot", style: `background:${c.hex}` }) : el("span", { class: "dot plus" }, "+"),
      c.label);
    wrap.appendChild(btn);
  });
  return wrap;
}
function field(label, control) {
  return el("label", { class: "field" }, el("span", { class: "flabel" }, label), control);
}

/* ============================================================
   ROUTER
   ============================================================ */
function go(hash) { location.hash = hash; }
window.addEventListener("hashchange", render);

/* bootstrap: pornește cloud-ul (dacă e configurat), apoi randează */
window.addEventListener("load", async () => {
  registerSW();
  if (Cloud.enabled()) {
    Cloud.init();
    // orice modificare locală → sincronizare debounce
    const _save = Store.savePartida, _rm = Store.removePartida;
    Store.savePartida = function (p) { const r = _save(p); syncSoon(); return r; };
    Store.removePartida = function (id) { const r = _rm(id); syncSoon(); return r; };
    Cloud.onChange(() => { render(); if (Cloud.user()) { Cloud.loadProfile().then(render).catch(() => {}); syncSoon(300); } });
    try { await Cloud.loadSession(); if (Cloud.user()) await Cloud.loadProfile(); } catch (e) {}
    if (Cloud.user()) syncSoon(300);
    window.addEventListener("online", () => syncSoon(200));
  }
  render();
});

const NAV = [
  { route: "/", label: "Partide", icon: "🎣" },
  { route: "/balti", label: "Bălți", icon: "📍" },
  { route: "/stats", label: "Statistici", icon: "📊" },
  { route: "/setari", label: "Setări", icon: "⚙" },
];

function render() {
  const h = location.hash.slice(1) || "/";
  app.innerHTML = "";
  // gardă de autentificare: cu cloud activ, fără sesiune → login
  if (Cloud.enabled() && !Cloud.user()) return viewAuth();

  if (h === "/") viewList();
  else if (h === "/nou") return viewNew();          // fără bottom-nav
  else if (h.startsWith("/p/")) return viewPartida(h.slice(3)); // fără bottom-nav
  else if (h === "/balti") viewBalti();
  else if (h === "/stats") viewStats();
  else if (h === "/setari") viewSettings();
  else if (h === "/admin") viewAdmin();
  else viewList();

  // bottom nav pe ecranele principale
  const main = ["/", "/balti", "/stats", "/setari", "/admin"];
  if (main.includes(h)) app.appendChild(bottomNav(h));
}

/* sincronizare debounce */
let _syncT;
function syncSoon(delay) {
  if (!Cloud.enabled() || !Cloud.user()) return;
  clearTimeout(_syncT);
  _syncT = setTimeout(() => {
    Cloud.syncNow().then(r => { if (r && r.ok && (r.pushed || r.pulled)) render(); }).catch(() => {});
  }, delay || 800);
}

/* ============================================================
   VIEW: lista partidelor
   ============================================================ */
function viewList() {
  const list = Store.partide();
  const g = globalStats();
  app.appendChild(homeTopbar());

  const wrap = el("div", { class: "page" });
  if (!list.length) {
    wrap.appendChild(el("div", { class: "empty" },
      el("img", { src: "icons/logo.svg", class: "empty-logo", alt: "" }),
      el("h2", {}, "Nicio partidă încă"),
      el("p", {}, "Apasă butonul de jos ca să notezi prima partidă de pescuit.")));
  } else {
    // bandă de statistici (sezon)
    wrap.appendChild(el("div", { class: "statband" },
      statBandCell(g.capturi, "Capturi"),
      statBandCell(g.total.toFixed(1), "Kg total", true),
      statBandCell(g.max ? g.max.toFixed(1) : "—", "Record kg", true, "🥇"),
      statBandCell(g.partide, "Partide"),
      statBandCell(g.medie ? g.medie.toFixed(1) : "—", "Medie / part.", true),
      statBandCell(g.baltiCount, "Bălți")));
    wrap.appendChild(el("div", { class: "section" }, "Partide recente"));
    list.forEach(p => wrap.appendChild(partidaCard(p, g.maxInfo && g.maxInfo.tid)));
  }
  app.appendChild(wrap);
}

/* ---------- statistici ---------- */
function partidaStats(p) {
  let capturi = 0, total = 0, record = 0;
  (p.zile || []).forEach(z => (z.lansete || []).forEach(l => (l.trasaturi || []).forEach(t => {
    if (t.rezultat === "prins") { capturi++; const gg = parseFloat(t.captura && t.captura.greutate) || 0; total += gg; if (gg > record) record = gg; }
  })));
  return { zile: p.zile ? p.zile.length : 0, capturi, total, record };
}
function globalStats() {
  const list = Store.partide();
  let capturi = 0, total = 0, max = 0, maxInfo = null; const balti = new Set();
  list.forEach(p => {
    if (p.baltaId) balti.add(p.baltaId);
    (p.zile || []).forEach(z => (z.lansete || []).forEach(l => (l.trasaturi || []).forEach(t => {
      if (t.rezultat === "prins") {
        capturi++; const gg = parseFloat(t.captura && t.captura.greutate) || 0; total += gg;
        if (gg > max) { max = gg; maxInfo = { pid: p.id, tid: t.id, kg: gg, specie: t.captura && t.captura.specie }; }
      }
    })));
  });
  return { partide: list.length, capturi, total, max, maxInfo, baltiCount: balti.size, medie: list.length ? total / list.length : 0 };
}
function statBandCell(v, k, gold, medal) {
  return el("div", { class: "cell" },
    medal ? el("span", { class: "medal" }, medal) : null,
    el("div", { class: "v" + (gold ? " gold" : "") }, String(v)),
    el("div", { class: "k" }, k));
}
function statCell(v, k, gold) {
  return el("div", { class: "badge" },
    el("div", { class: "v" + (gold ? " gold" : "") }, String(v)),
    el("div", { class: "k" }, k));
}

function partidaCard(p, recordTid) {
  const b = balta(p.baltaId);
  const s = partidaStats(p);
  const hasRecord = recordTid && (p.zile || []).some(z => (z.lansete || []).some(l => (l.trasaturi || []).some(t => t.id === recordTid)));
  return el("div", { class: "card partida", onclick: () => go("/p/" + p.id) },
    el("div", { class: "thumb" },
      b && b.map ? el("img", { src: b.map, alt: "" }) : null,
      el("span", { class: "pin" }, String(p.standNo == null ? "—" : p.standNo))),
    el("div", { class: "body" },
      el("div", { class: "name" }, p.baltaName || (b && b.name) || "Baltă"),
      el("div", { class: "sub" }, "Stand ", el("b", {}, String(p.standNo == null ? "—" : p.standNo)),
        " · " + fmtDate(p.dataStart) + (p.dataEnd && p.dataEnd !== p.dataStart ? " – " + fmtDate(p.dataEnd) : "")),
      el("div", { class: "badges" },
        statCell(s.zile, s.zile === 1 ? "Zi" : "Zile"),
        statCell(s.capturi, "Capturi", true),
        statCell(s.total ? s.total.toFixed(1) : "—", "Kg", true))),
    hasRecord ? el("div", { class: "rec" }, "🥇 record") : null);
}

/* ============================================================
   VIEW: partidă nouă (baltă → stand → perioadă)
   ============================================================ */
function viewNew() {
  const draft = { baltaId: null, standNo: null, dataStart: today(), dataEnd: "" };
  app.appendChild(topbar("Partidă nouă", () => go("/")));
  const page = el("div", { class: "page" });
  app.appendChild(page);

  function step() {
    page.innerHTML = "";
    // 1. baltă
    page.appendChild(sectionH("01", "Balta"));
    const bl = el("div", { class: "balti-grid" });
    BALTI.forEach(b => {
      bl.appendChild(el("button", { class: "balta-opt" + (draft.baltaId === b.id ? " on" : ""), type: "button",
        onclick: () => { draft.baltaId = b.id; draft.standNo = null; step(); } },
        el("span", { class: "cnt" }, String(b.standCount)),
        el("div", { class: "balta-thumb" }, b.map ? el("img", { src: b.map, alt: "" }) : el("span", { class: "fishico" }, "🎣")),
        el("div", { class: "balta-name" }, b.name),
        el("div", { class: "balta-loc" }, b.location)));
    });
    page.appendChild(bl);

    if (!draft.baltaId) return;
    const b = balta(draft.baltaId);

    // 2. stand
    page.appendChild(sectionH("02", "Standul" + (draft.standNo ? " · ales " + draft.standNo : "")));
    page.appendChild(standPicker(b, draft.standNo, no => { draft.standNo = no; step(); }));

    if (!draft.standNo) return;

    // 3. perioadă
    page.appendChild(sectionH("03", "Perioada"));
    const per = el("div", { class: "row2" },
      field("De la", el("input", { class: "inp", type: "date", value: draft.dataStart,
        onchange: e => { draft.dataStart = e.target.value; upd(); } })),
      field("Până la", el("input", { class: "inp", type: "date", value: draft.dataEnd || draft.dataStart,
        onchange: e => { draft.dataEnd = e.target.value; upd(); } })));
    page.appendChild(per);
    const info = el("p", { class: "hint", id: "perinfo" });
    page.appendChild(info);
    function upd() {
      const days = daysBetween(draft.dataStart, draft.dataEnd || draft.dataStart);
      info.textContent = days.length + (days.length === 1 ? " zi de pescuit" : " zile de pescuit");
    }
    upd();

    page.appendChild(el("button", { class: "btn primary big", onclick: create },
      "Începe partida →"));
  }

  function create() {
    const b = balta(draft.baltaId);
    const days = daysBetween(draft.dataStart, draft.dataEnd || draft.dataStart);
    const p = {
      baltaId: b.id, baltaName: b.name, standNo: draft.standNo,
      dataStart: draft.dataStart, dataEnd: draft.dataEnd || draft.dataStart,
      note: "",
      zile: days.map((d, i) => ({ zi: i + 1, data: d, lansete: [] })),
    };
    Store.savePartida(p);
    go("/p/" + p.id);
  }

  step();
}

/* selector de stand: hartă cu hotspot-uri sau grilă de numere */
function standPicker(b, selected, onPick) {
  const wrap = el("div", { class: "standpick" });
  if (b.map && b.stands) {
    const box = el("div", { class: "mapbox" });
    const img = el("img", { src: b.map, alt: b.name, class: "mapimg" });
    box.appendChild(img);
    const layer = el("div", { class: "hotspots" });
    box.appendChild(layer);
    function place() {
      layer.innerHTML = "";
      const sx = box.clientWidth / b.imgW, sy = box.clientHeight / b.imgH;
      b.stands.forEach(st => {
        const hs = el("button", { class: "hotspot" + (st.no === selected ? " on" : ""), type: "button",
          style: `left:${st.x * sx}px;top:${st.y * sy}px`,
          onclick: () => { selected = st.no; place(); onPick(st.no); } }, st.no);
        layer.appendChild(hs);
      });
    }
    if (img.complete) place(); else img.onload = place;
    window.addEventListener("resize", place, { passive: true });
    wrap.appendChild(box);
    wrap.appendChild(el("p", { class: "hint" }, "Atinge standul pe hartă, sau alege din listă mai jos."));
  }
  // grilă numere (mereu disponibilă, ca alternativă / pt bălți fără hartă)
  const grid = el("div", { class: "num-grid" });
  for (let n = 1; n <= b.standCount; n++) {
    grid.appendChild(el("button", { class: "num" + (n === selected ? " on" : ""), type: "button",
      onclick: () => { selected = n; onPick(n); } }, n));
  }
  wrap.appendChild(grid);
  return wrap;
}

/* ============================================================
   VIEW: detaliu partidă
   ============================================================ */
let curDay = 0;
function viewPartida(id) {
  const p = Store.getPartida(id);
  if (!p) return go("/");
  const b = balta(p.baltaId);
  curDay = Math.min(curDay, (p.zile?.length || 1) - 1);

  const recordTid = (globalStats().maxInfo || {}).tid;

  app.appendChild(topbar(p.baltaName || b?.name || "Partidă", () => go("/"),
    el("button", { class: "icon-btn", title: "Șterge partida", onclick: () => {
      if (confirm("Ștergi definitiv această partidă?")) { Store.removePartida(id); go("/"); }
    } }, "🗑")));

  const page = el("div", { class: "page" });
  app.appendChild(page);

  // hero cu statistici
  const s = partidaStats(p);
  page.appendChild(el("div", { class: "p-hero" },
    el("div", { class: "nm" }, p.baltaName || (b && b.name) || "Partidă"),
    el("div", { class: "row" },
      el("span", {}, "Stand ", el("b", {}, String(p.standNo == null ? "—" : p.standNo))),
      el("span", {}, fmtDate(p.dataStart) + (p.dataEnd && p.dataEnd !== p.dataStart ? " – " + fmtDate(p.dataEnd) : "")),
      b && b.location ? el("span", {}, b.location) : null),
    el("div", { class: "stats" },
      heroStat(s.zile, "Zile"),
      heroStat(s.capturi, "Capturi"),
      heroStat(s.total.toFixed(1), "kg", "Total"),
      heroStat(s.record ? s.record.toFixed(1) : "—", "kg", "Record"))));

  // tab-uri zile
  const tabs = el("div", { class: "daytabs" });
  (p.zile || []).forEach((z, i) => {
    tabs.appendChild(el("button", { class: "daytab" + (i === curDay ? " on" : ""),
      onclick: () => { curDay = i; render(); } }, "Ziua " + z.zi));
  });
  tabs.appendChild(el("button", { class: "daytab add", title: "Adaugă zi", onclick: () => addDay(p) }, "＋"));
  page.appendChild(tabs);

  const z = p.zile[curDay];
  if (!z) return;
  page.appendChild(el("div", { class: "dayhint hint" }, fmtDate(z.data)));

  // câte lansete? (dacă ziua e goală, alege numărul)
  if (!z.lansete.length) {
    page.appendChild(el("div", { class: "pick-nr" },
      el("p", {}, "Câte lansete pui azi?"),
      chips([1, 2, 3, 4], null, n => {
        z.lansete = Array.from({ length: n }, (_, i) => newLanseta(i + 1));
        Store.savePartida(p); render();
      })));
    if (curDay > 0 && p.zile[curDay - 1].lansete.length) {
      page.appendChild(el("button", { class: "btn ghost", onclick: () => {
        z.lansete = p.zile[curDay - 1].lansete.map((l, i) => ({ ...structuredClone(l), nr: i + 1, trasaturi: [] }));
        Store.savePartida(p); render();
      } }, "↧ Copiază lansetele din Ziua " + p.zile[curDay - 1].zi));
    }
  } else {
    z.lansete.forEach(l => page.appendChild(lansetaCard(p, z, l, recordTid)));
    const actions = el("div", { class: "row2" });
    if (z.lansete.length < 4)
      actions.appendChild(el("button", { class: "btn ghost", onclick: () => {
        z.lansete.push(newLanseta(z.lansete.length + 1)); Store.savePartida(p); render();
      } }, "＋ Adaugă lansetă"));
    page.appendChild(actions);
  }

  // notă partidă
  page.appendChild(field("Observații partidă",
    el("textarea", { class: "inp", rows: 2, placeholder: "vânt, presiune, nadă, etc.",
      onchange: e => { p.note = e.target.value; Store.savePartida(p); } }, p.note || "")));
}

function newLanseta(nr) {
  return { id: uid("l"), nr, distanta: "", oraLansare: "",
    montura: null, carlig: { marime: "", producator: "", tip: "" }, trasaturi: [] };
}

function addDay(p) {
  const last = p.zile[p.zile.length - 1];
  const nd = last ? new Date(last.data + "T00:00") : new Date();
  nd.setDate(nd.getDate() + 1);
  const data = ymd(nd);
  p.zile.push({ zi: p.zile.length + 1, data, lansete: [] });
  if (data > (p.dataEnd || "")) p.dataEnd = data;
  Store.savePartida(p);
  curDay = p.zile.length - 1;
  render();
}

/* ---------- card lansetă (rod) ---------- */
function lansetaCard(p, z, l, recordTid) {
  const head = el("div", { class: "lanseta-head" },
    el("div", { class: "lh" },
      el("span", { class: "lanseta-nr" }, String(l.nr)),
      el("span", { class: "ltitle" }, "Lanseta " + l.nr)),
    z.lansete.length > 1 ? el("button", { class: "icon-btn small", title: "Șterge lanseta",
      onclick: (e) => { e.stopPropagation(); z.lansete = z.lansete.filter(x => x !== l).map((x, i) => ({ ...x, nr: i + 1 }));
        Store.savePartida(p); render(); } }, "✕") : null);

  const body = el("div", { class: "lanseta-body" });

  body.appendChild(el("div", { class: "row2" },
    field("Distanță (m)", el("input", { class: "inp", type: "number", inputmode: "numeric", value: l.distanta,
      placeholder: "ex. 90", onchange: e => { l.distanta = e.target.value; Store.savePartida(p); } })),
    field("Oră lansare", el("input", { class: "inp", type: "time", value: l.oraLansare,
      onchange: e => { l.oraLansare = e.target.value; Store.savePartida(p); } }))));

  body.appendChild(specRow("●", "Montură", monturaSummaryNode(l.montura), () => editMontura(p, l), "atinge ca să alegi"));
  body.appendChild(specRow("J", "Cârlig", carligSummary(l.carlig), () => editCarlig(p, l), "mărime · tip · producător"));

  const tr = el("div", { class: "trasaturi" });
  (l.trasaturi || []).forEach(t => tr.appendChild(trasaturaRow(p, l, t, recordTid)));
  body.appendChild(tr);
  body.appendChild(el("button", { class: "btn add-tras", onclick: () => editTrasatura(p, l, null) }, "＋ Trăsătură"));

  return el("div", { class: "card lanseta" }, head, body);
}

function specRow(icon, k, value, onclick, placeholder) {
  const empty = value === "" || value == null;
  return el("div", { class: "subrow", onclick },
    el("span", { class: "ic" }, icon),
    el("div", { class: "subrow-l" },
      el("span", { class: "k" }, k),
      el("span", { class: "v" + (empty ? " empty" : "") }, empty ? (placeholder || "atinge ca să alegi") : value)),
    el("span", { class: "edit" }, "✎"));
}

function trasaturaRow(p, l, t, recordTid) {
  const isRecord = recordTid && t.id === recordTid;
  const prins = t.rezultat === "prins";
  const kg = prins && t.captura && t.captura.greutate ? parseFloat(t.captura.greutate) : null;
  const timeline = [t.minute != null && t.minute !== "" ? t.minute + " min" : null, t.ora || null].filter(Boolean).join(" · ");
  const rezTxt = t.rezultat === "scapat" ? "Scăpat" : t.rezultat === "ratata" ? "Ratată" : null;
  const sp = prins ? ((t.captura && t.captura.specie) || "Captură") : (rezTxt || "Trăsătură");
  return el("div", { class: "tras " + (isRecord ? "record" : prins ? "prins" : ""), onclick: () => editTrasatura(p, l, t) },
    el("span", { class: "fish" + (prins ? "" : " miss") }, prins ? "🐟" : (t.rezultat === "scapat" ? "〜" : "·")),
    el("div", { class: "ci" },
      el("div", { class: "sp" }, sp, isRecord ? el("span", { class: "recbadge" }, "RECORD") : null),
      el("div", { class: "tm" }, timeline || "—")),
    kg != null ? el("div", { class: "kg" }, kg.toFixed(1), el("small", {}, " kg")) : el("span", { class: "chev" }, "›"));
}

/* ---------- rezumate ---------- */
function culoareLabel(c) {
  const f = CULORI.find(x => x.id === c); return f ? f.label : c;
}
function monturaSummary(m) {
  if (!m) return "";
  if (m.tip === "snowman") {
    const s = x => x ? [x.diametru && x.diametru + "mm", culoareLabel(x.culoare)].filter(Boolean).join(" ") : "";
    return "Snowman: pop-up " + s(m.popup) + " + boilies " + s(m.boilies);
  }
  const bits = [];
  const T = MONTURA_TIPURI.find(t => t.id === m.tip);
  let head = T ? T.label : m.tip;
  if (m.tip === "bag" && m.hookbait) head += " (" + m.hookbait + ")";
  bits.push(head);
  if (m.diametru) bits.push(m.diametru + "mm");
  if (m.culoare) bits.push(culoareLabel(m.culoare));
  if (m.producator) bits.push("· " + m.producator);
  return bits.join(" ");
}
function carligSummary(c) {
  if (!c) return "";
  const b = [c.marime && "nr " + c.marime, c.tip, c.producator].filter(Boolean);
  return b.join(" · ");
}

/* ---------- editor MONTURĂ ---------- */
function editMontura(p, l) {
  const m = structuredClone(l.montura) || { tip: "boilies" };
  sheet("Montură — Lanseta " + l.nr, (body) => {
    const form = el("div");
    body.appendChild(chips(MONTURA_TIPURI, m.tip, tip => { m.tip = tip; draw(); }, o => o.id, o => o.emoji + " " + o.label));
    body.appendChild(form);
    function diamField(list, key) {
      return field("Diametru (mm)", chips(list, m[key], v => m[key] = v));
    }
    function draw() {
      form.innerHTML = "";
      if (m.tip === "bag") {
        form.appendChild(field("La cârlig", chips(BAG_HOOKBAIT, m.hookbait, v => m.hookbait = v)));
        form.appendChild(diamField(DIAMETRE, "diametru"));
        form.appendChild(field("Culoare", colorChips(m.culoare, v => m.culoare = v)));
        form.appendChild(field("Producător", autoInput(m.producator, Store.producatori(), "ex. Nash", v => m.producator = v)));
      } else if (m.tip === "half") {
        form.appendChild(diamField(DIAMETRE, "diametru"));
        form.appendChild(field("Culoare", colorChips(m.culoare, v => m.culoare = v)));
        form.appendChild(field("Producător", autoInput(m.producator, Store.producatori(), "ex. Mainline", v => m.producator = v)));
      } else if (m.tip === "boilies") {
        form.appendChild(diamField(DIAMETRE, "diametru"));
        form.appendChild(field("Producător", autoInput(m.producator, Store.producatori(), "ex. CC Moore", v => m.producator = v)));
        form.appendChild(field("Culoare", colorChips(m.culoare, v => m.culoare = v)));
      } else if (m.tip === "plastice") {
        const dwrap = el("div");
        dwrap.appendChild(chips(DIAMETRE_PLASTIC, DIAMETRE.includes(m.diametru) || !m.diametru ? m.diametru : "Altul",
          v => { if (v === "Altul") { m.diametru = ""; showAlt(true); } else { m.diametru = v; showAlt(false); } }));
        const alt = el("input", { class: "inp mt", type: "text", placeholder: "alt diametru (mm)", value: DIAMETRE.includes(m.diametru) ? "" : (m.diametru || ""),
          oninput: e => m.diametru = e.target.value });
        dwrap.appendChild(alt);
        function showAlt(s) { alt.style.display = s ? "" : "none"; }
        showAlt(!DIAMETRE.includes(m.diametru) && !!m.diametru);
        form.appendChild(field("Diametru (mm)", dwrap));
        form.appendChild(field("Producător", autoInput(m.producator, Store.producatori(), "ex. Enterprise", v => m.producator = v)));
        form.appendChild(field("Culoare", colorChips(m.culoare, v => m.culoare = v)));
      } else if (m.tip === "snowman") {
        m.popup = m.popup || {}; m.boilies = m.boilies || {};
        const sub = (title, obj) => el("div", { class: "subcard" },
          el("h4", {}, title),
          field("Diametru", chips(DIAMETRE, obj.diametru, v => obj.diametru = v)),
          field("Culoare", colorChips(obj.culoare, v => obj.culoare = v)),
          field("Producător", autoInput(obj.producator, Store.producatori(), "producător", v => obj.producator = v)));
        form.appendChild(sub("Pop-up (sus)", m.popup));
        form.appendChild(sub("Boilies (jos)", m.boilies));
      }
    }
    draw();
  }, { onSave: () => {
      // învață producătorii introduși
      [m.producator, m.popup?.producator, m.boilies?.producator].forEach(v => v && Store.learn("producatori", v));
      l.montura = m; Store.savePartida(p); render(); toast("Montură salvată");
    } });
}

/* ---------- editor CÂRLIG ---------- */
function editCarlig(p, l) {
  const c = structuredClone(l.carlig) || {};
  sheet("Cârlig — Lanseta " + l.nr, (body) => {
    body.appendChild(field("Mărime (nr)", el("input", { class: "inp", type: "text", inputmode: "numeric",
      value: c.marime || "", placeholder: "ex. 6", oninput: e => c.marime = e.target.value })));
    body.appendChild(field("Tip", autoInput(c.tip, Store.carligTipuri(), "ex. Wide Gape", v => c.tip = v)));
    body.appendChild(field("Producător", autoInput(c.producator, Store.carligProducatori(), "ex. Korda", v => c.producator = v)));
  }, { onSave: () => {
      Store.learn("carligTipuri", c.tip); Store.learn("carligProducatori", c.producator);
      l.carlig = c; Store.savePartida(p); render(); toast("Cârlig salvat");
    } });
}

/* ---------- editor TRĂSĂTURĂ + captură ---------- */
function editTrasatura(p, l, t) {
  const isNew = !t;
  const data = t ? structuredClone(t) : { id: uid("t"), minute: "", ora: "", rezultat: "prins", captura: {} };
  data.captura = data.captura || {};
  let photoBlob = undefined; // undefined = neschimbat, null = șters

  sheet(isNew ? "Trăsătură nouă" : "Trăsătură", (body) => {
    body.appendChild(field("Minute de la schimbarea lansetei",
      el("input", { class: "inp", type: "number", inputmode: "numeric", value: data.minute,
        placeholder: "ex. 45", oninput: e => data.minute = e.target.value })));
    body.appendChild(field("Oră", el("input", { class: "inp", type: "time", value: data.ora,
      onchange: e => data.ora = e.target.value })));
    body.appendChild(field("Rezultat", chips(
      [["prins", "🟢 Prins"], ["scapat", "🟠 Scăpat"], ["ratata", "⚪ Ratată"]],
      data.rezultat, v => { data.rezultat = v; drawCapt(); }, o => o[0], o => o[1])));

    const capt = el("div"); body.appendChild(capt);
    function drawCapt() {
      capt.innerHTML = "";
      if (data.rezultat !== "prins") return;
      capt.appendChild(el("div", { class: "subcard" },
        el("h4", {}, "Captură"),
        field("Specie", autoInput(data.captura.specie, speciiFor(p), "ex. Crap comun", v => data.captura.specie = v)),
        field("Greutate (kg)", el("input", { class: "inp", type: "number", step: "0.01", inputmode: "decimal",
          value: data.captura.greutate || "", placeholder: "ex. 8.4", oninput: e => data.captura.greutate = e.target.value })),
        photoField(),
        field("Observații", el("textarea", { class: "inp", rows: 2, placeholder: "montură, loc, detalii",
          oninput: e => data.captura.obs = e.target.value }, data.captura.obs || ""))));
    }
    function photoField() {
      const wrap = el("div", { class: "field" }, el("span", { class: "flabel" }, "Poză"));
      const prev = el("div", { class: "photo-prev" });
      const inp = el("input", { type: "file", accept: "image/*", capture: "environment", style: "display:none",
        onchange: async e => {
          const f = e.target.files[0]; if (!f) return;
          photoBlob = await compress(f);
          showPrev(URL.createObjectURL(photoBlob));
        } });
      function showPrev(url) {
        prev.innerHTML = "";
        if (url) {
          prev.appendChild(el("img", { src: url, alt: "" }));
          prev.appendChild(el("button", { class: "btn ghost small", type: "button",
            onclick: () => { photoBlob = null; showPrev(null); } }, "Șterge poza"));
        } else {
          prev.appendChild(el("button", { class: "btn ghost", type: "button", onclick: () => inp.click() }, "📷 Adaugă poză"));
        }
      }
      wrap.appendChild(prev); wrap.appendChild(inp);
      // poză existentă
      if (data.captura.poza) Store.getPhoto(data.captura.poza).then(b => { if (b && photoBlob === undefined) showPrev(URL.createObjectURL(b)); });
      else showPrev(null);
      return wrap;
    }
    drawCapt();
  }, { onSave: () => {
      (async () => {
        if (data.rezultat === "prins") {
          if (data.captura.specie) Store.learn("specii", data.captura.specie);
          if (photoBlob === null && data.captura.poza) { await Store.delPhoto(data.captura.poza); data.captura.poza = null; }
          else if (photoBlob) {
            const pid = data.captura.poza || uid("ph");
            await Store.putPhoto(pid, photoBlob); data.captura.poza = pid;
          }
        } else { data.captura = {}; }
        if (isNew) l.trasaturi.push(data);
        else { const i = l.trasaturi.findIndex(x => x.id === data.id); if (i >= 0) l.trasaturi[i] = data; }
        Store.savePartida(p); render(); toast("Trăsătură salvată");
      })();
    } });

  // buton șterge (doar la editare)
  if (!isNew) {
    const sb = $(".sheet-foot");
    if (sb) sb.insertBefore(el("button", { class: "btn danger", onclick: () => {
      l.trasaturi = l.trasaturi.filter(x => x.id !== data.id);
      if (data.captura?.poza) Store.delPhoto(data.captura.poza);
      Store.savePartida(p); $(".sheet-back")?.remove(); render();
    } }, "Șterge"), sb.firstChild);
  }
}
function speciiFor(p) {
  const b = balta(p.baltaId);
  const set = new Set([...(b?.species || []), ...Store.specii()]);
  return [...set];
}

/* comprimă imaginea înainte de stocare */
function compress(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1280;
      let { width: w, height: h } = img;
      if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
      const cv = el("canvas"); cv.width = w; cv.height = h;
      cv.getContext("2d").drawImage(img, 0, 0, w, h);
      cv.toBlob(b => resolve(b || file), "image/jpeg", 0.72);
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

/* ============================================================
   VIEW: setări (export/import/reset)
   ============================================================ */
function viewSettings() {
  app.appendChild(topbar("Setări", null));
  const page = el("div", { class: "page" });
  app.appendChild(page);

  // cont (doar în mod cloud)
  if (Cloud.enabled() && Cloud.user()) {
    const prof = Cloud.profile() || {};
    const u = Cloud.user();
    const nameInp = el("input", { class: "inp", type: "text", value: prof.display_name || "", placeholder: "numele tău" });
    const lbToggle = el("input", { type: "checkbox" });
    lbToggle.checked = !!prof.show_on_leaderboard;
    page.appendChild(el("div", { class: "card pad" },
      el("h3", {}, "Contul meu"),
      el("p", { class: "hint" }, u.email + (Cloud.isAdmin() ? " · 👑 admin" : "")),
      field("Nume (în clasament)", nameInp),
      el("label", { class: "switch" }, lbToggle, el("span", {}, "Apari în clasamentul public")),
      el("button", { class: "btn primary", onclick: () => {
        Cloud.updateProfile({ display_name: nameInp.value.trim(), show_on_leaderboard: lbToggle.checked })
          .then(() => toast("Profil salvat")).catch(e => alert(e.message));
      } }, "Salvează profilul"),
      Cloud.isAdmin() ? el("button", { class: "btn ghost", onclick: () => go("/admin") }, "👑 Panou admin") : null,
      el("button", { class: "btn ghost", onclick: () => {
        if (confirm("Te deconectezi? Datele nesincronizate rămân pe acest telefon.")) Cloud.signOut().then(render);
      } }, "Deconectare")));

    const syncBtn = el("button", { class: "btn ghost", onclick: () => {
      syncBtn.textContent = "Se sincronizează…";
      Cloud.syncNow().then(r => { toast(r.ok ? "Sincronizat" : "Sync: " + r.reason); render(); }).catch(e => { toast("Eroare sync"); });
    } }, "🔄 Sincronizează acum");
    page.appendChild(el("div", { class: "card pad" },
      el("h3", {}, "Sincronizare"),
      el("p", { class: "hint" }, navigator.onLine ? "Online — partidele se sincronizează automat." : "Offline — se sincronizează când revii online."),
      syncBtn));
  } else if (Cloud.enabled()) {
    page.appendChild(el("div", { class: "card pad" },
      el("h3", {}, "Cont"),
      el("button", { class: "btn primary", onclick: () => { Cloud.signOut().then(render); } }, "Autentificare")));
  }

  page.appendChild(el("div", { class: "card pad" },
    el("h3", {}, "Salvare & backup"),
    el("p", { class: "hint" }, "Datele sunt salvate pe telefon (offline). Fă un backup periodic."),
    el("button", { class: "btn primary", onclick: exportData }, "⭳ Exportă backup (.json)"),
    el("label", { class: "btn ghost file" }, "⭱ Importă backup",
      el("input", { type: "file", accept: "application/json,.json", style: "display:none",
        onchange: importData }))));

  const n = Store.partide().length;
  page.appendChild(el("div", { class: "card pad" },
    el("h3", {}, "Statistici"),
    el("p", {}, n + (n === 1 ? " partidă salvată" : " partide salvate"))));

  page.appendChild(el("div", { class: "card pad" },
    el("h3", {}, "Despre"),
    el("p", { class: "hint" }, "FRA · jurnal de pescuit. Bălți preluate din Holerga. Se instalează pe ecranul telefonului din meniul browserului: Adaugă la ecranul principal."),
    el("button", { class: "btn danger", onclick: () => {
      if (confirm("Ștergi TOATE partidele? (ireversibil)")) {
        localStorage.removeItem("fra_v1"); location.reload();
      }
    } }, "Șterge toate datele")));
}
function exportData() {
  const blob = new Blob([Store.exportJSON()], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: "FRA-backup-" + new Date().toISOString().slice(0, 10) + ".json" });
  document.body.appendChild(a); a.click(); a.remove();
  toast("Backup descărcat");
}
function importData(e) {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const mode = confirm("OK = ADAUGĂ la partidele existente\nCancel = ÎNLOCUIEȘTE tot") ? "merge" : "replace";
      Store.importJSON(r.result, mode); toast("Import reușit"); go("/");
    } catch (err) { alert("Import eșuat: " + err.message); }
  };
  r.readAsText(f);
}

/* ============================================================
   AUTENTIFICARE
   ============================================================ */
let authMode = "login"; // login | register | reset
function viewAuth() {
  const wrap = el("div", { class: "auth" });
  wrap.appendChild(el("img", { src: "icons/logo.svg", class: "auth-logo", alt: "" }));
  wrap.appendChild(el("div", { class: "auth-brand", html: "F<b>R</b>A" }));
  wrap.appendChild(el("div", { class: "auth-tag" }, "Jurnal de pescuit la crap"));

  const card = el("div", { class: "auth-card" });
  const msg = el("div", { class: "auth-msg" });
  const email = el("input", { class: "inp", type: "email", placeholder: "email", autocomplete: "email" });
  const nume = el("input", { class: "inp", type: "text", placeholder: "nume (cum apari în clasament)", autocomplete: "name" });
  const pass = el("input", { class: "inp", type: "password", placeholder: "parolă", autocomplete: "current-password" });

  function paint() {
    card.innerHTML = "";
    card.appendChild(el("div", { class: "auth-tabs" },
      el("button", { class: "auth-tab" + (authMode === "login" ? " on" : ""), onclick: () => { authMode = "login"; paint(); } }, "Autentificare"),
      el("button", { class: "auth-tab" + (authMode === "register" ? " on" : ""), onclick: () => { authMode = "register"; paint(); } }, "Cont nou")));
    card.appendChild(field("Email", email));
    if (authMode === "register") card.appendChild(field("Nume", nume));
    if (authMode !== "reset") card.appendChild(field("Parolă", pass));
    card.appendChild(msg);
    const btnLabel = authMode === "login" ? "Intră în cont" : authMode === "register" ? "Creează cont" : "Trimite link de resetare";
    card.appendChild(el("button", { class: "btn primary big", onclick: submit }, btnLabel));
    if (authMode === "login") card.appendChild(el("button", { class: "btn ghost small", onclick: () => { authMode = "reset"; paint(); } }, "Am uitat parola"));
    if (authMode === "reset") card.appendChild(el("button", { class: "btn ghost small", onclick: () => { authMode = "login"; paint(); } }, "← Înapoi la autentificare"));
  }
  async function submit() {
    msg.className = "auth-msg"; msg.textContent = "";
    const e = email.value.trim(), p = pass.value;
    try {
      if (authMode === "reset") {
        if (!e) throw new Error("Scrie emailul.");
        await Cloud.resetPassword(e);
        info("Ți-am trimis un email cu link de resetare."); return;
      }
      if (!e || !p) throw new Error("Completează email și parolă.");
      if (authMode === "register") {
        await Cloud.signUp(e, p, nume.value.trim());
        info("Cont creat! Verifică emailul dacă ți se cere confirmarea, apoi autentifică-te.");
        authMode = "login"; setTimeout(paint, 1500); return;
      }
      await Cloud.signIn(e, p); // onChange → render + sync
    } catch (err) { fail(err.message || String(err)); }
  }
  function info(t) { msg.className = "auth-msg ok"; msg.textContent = t; }
  function fail(t) { msg.className = "auth-msg err"; msg.textContent = t; }
  paint();
  wrap.appendChild(card);
  app.appendChild(wrap);
}

/* ============================================================
   VIEW: bălți (listă + hărți)
   ============================================================ */
function viewBalti() {
  app.appendChild(topbar("Bălți", null));
  const page = el("div", { class: "page" });
  app.appendChild(page);
  page.appendChild(el("div", { class: "section" }, "Bălți oficiale"));
  BALTI.forEach(b => {
    page.appendChild(el("div", { class: "card partida balta-row", onclick: () => openBaltaInfo(b) },
      el("div", { class: "thumb" }, b.map ? el("img", { src: b.map, alt: "" }) : el("span", { class: "pin" }, "🎣")),
      el("div", { class: "body" },
        el("div", { class: "name" }, b.name),
        el("div", { class: "sub" }, b.location || ""),
        el("div", { class: "row", style: "display:flex;gap:8px;flex-wrap:wrap;margin-top:8px" },
          el("span", { class: "tagpill" }, b.standCount + " standuri"),
          ...(b.species || []).slice(0, 3).map(s => el("span", { class: "tagpill soft" }, s)))),
      el("div", { class: "card-chev" }, "›")));
  });
  page.appendChild(el("div", { class: "hint" }, "Bălțile proprii (adăugate de tine) vor apărea aici — funcție în lucru."));
}
function openBaltaInfo(b) {
  sheet(b.name, (body) => {
    if (b.map) body.appendChild(el("div", { class: "mapbox" }, el("img", { src: b.map, class: "mapimg", alt: "" })));
    body.appendChild(el("div", { class: "hint" }, b.location || ""));
    body.appendChild(el("div", { class: "chips" }, ...(b.species || []).map(s => el("span", { class: "chip" }, s))));
    body.appendChild(el("div", { class: "hint" }, b.standCount + " standuri"));
  });
}

/* ============================================================
   VIEW: statistici
   ============================================================ */
function viewStats() {
  app.appendChild(topbar("Statistici", null));
  const page = el("div", { class: "page" });
  app.appendChild(page);
  const g = globalStats();
  page.appendChild(el("div", { class: "statband" },
    statBandCell(g.capturi, "Capturi"),
    statBandCell(g.total.toFixed(1), "Kg total", true),
    statBandCell(g.max ? g.max.toFixed(1) : "—", "Record kg", true, "🥇"),
    statBandCell(g.partide, "Partide"),
    statBandCell(g.medie ? g.medie.toFixed(1) : "—", "Medie / part.", true),
    statBandCell(g.baltiCount, "Bălți")));

  // top capturi
  const catches = [];
  Store.partide().forEach(p => (p.zile || []).forEach(z => (z.lansete || []).forEach(l => (l.trasaturi || []).forEach(t => {
    if (t.rezultat === "prins" && t.captura && parseFloat(t.captura.greutate)) catches.push({ kg: parseFloat(t.captura.greutate), specie: t.captura.specie, balta: p.baltaName, data: p.dataStart });
  }))));
  catches.sort((a, b) => b.kg - a.kg);
  page.appendChild(el("div", { class: "section" }, "Top capturi"));
  if (!catches.length) page.appendChild(el("div", { class: "hint" }, "Încă nu ai capturi notate."));
  catches.slice(0, 10).forEach((c, i) => {
    page.appendChild(el("div", { class: "toprow" },
      el("span", { class: "toprank" }, "#" + (i + 1)),
      el("div", { class: "topmain" }, el("div", { class: "topsp" }, c.specie || "Captură"),
        el("div", { class: "hint" }, (c.balta || "") + " · " + fmtDate(c.data))),
      el("span", { class: "topkg" }, c.kg.toFixed(1), el("small", {}, " kg"))));
  });

  // clasament cloud (opțional)
  if (Cloud.enabled() && Cloud.user()) {
    page.appendChild(el("div", { class: "section" }, "Clasament"));
    const lb = el("div", { class: "hint" }, "Se încarcă…");
    page.appendChild(lb);
    Cloud.leaderboard().then(rows => {
      lb.remove();
      if (!rows.length) { page.appendChild(el("div", { class: "hint" }, "Nimeni în clasament încă. Activează opțiunea din Setări.")); return; }
      rows.forEach((r, i) => page.appendChild(el("div", { class: "toprow" },
        el("span", { class: "toprank" }, "#" + (i + 1)),
        el("div", { class: "topmain" }, el("div", { class: "topsp" }, r.display_name || "Pescar"),
          el("div", { class: "hint" }, r.capturi + " capturi · " + Number(r.total_kg).toFixed(1) + " kg total")),
        el("span", { class: "topkg" }, Number(r.record_kg).toFixed(1), el("small", {}, " kg")))));
    }).catch(() => { lb.textContent = "Clasamentul nu s-a putut încărca."; });
  }
}

/* ============================================================
   VIEW: admin
   ============================================================ */
function viewAdmin() {
  app.appendChild(topbar("Admin", null));
  const page = el("div", { class: "page" });
  app.appendChild(page);
  if (!Cloud.isAdmin()) { page.appendChild(el("div", { class: "hint" }, "Acces doar pentru administratori.")); return; }
  page.appendChild(el("div", { class: "section" }, "Utilizatori"));
  const list = el("div", {}, el("div", { class: "hint" }, "Se încarcă…"));
  page.appendChild(list);
  Cloud.listUsers().then(users => {
    list.innerHTML = "";
    users.forEach(u => {
      list.appendChild(el("div", { class: "card pad urow" },
        el("div", {}, el("div", { class: "uname" }, u.display_name || "—"),
          el("div", { class: "hint" }, (u.role === "admin" ? "👑 admin" : "utilizator"))),
        el("button", { class: "btn small ghost", onclick: () => {
          const nr = u.role === "admin" ? "user" : "admin";
          if (confirm("Schimbi rolul lui " + (u.display_name || "acest user") + " în „" + nr + "\"?"))
            Cloud.setUserRole(u.id, nr).then(render).catch(e => alert(e.message));
        } }, u.role === "admin" ? "Fă utilizator" : "Fă admin")));
    });
  }).catch(e => { list.innerHTML = ""; list.appendChild(el("div", { class: "hint" }, "Eroare: " + e.message)); });
}

/* ============================================================
   componente comune
   ============================================================ */
function bottomNav(active) {
  const nav = el("nav", { class: "bottomnav" });
  const items = [...NAV];
  if (Cloud.isAdmin()) items.push({ route: "/admin", label: "Admin", icon: "👑" });
  const left = items.slice(0, 2), right = items.slice(2);
  const mk = it => el("button", { class: "navitem" + (active === it.route ? " on" : ""), onclick: () => go(it.route) },
    el("span", { class: "ni-ic" }, it.icon), el("span", { class: "ni-l" }, it.label));
  left.forEach(it => nav.appendChild(mk(it)));
  nav.appendChild(el("button", { class: "navplus", title: "Partidă nouă", onclick: () => go("/nou") }, "＋"));
  right.forEach(it => nav.appendChild(mk(it)));
  return nav;
}

function topbar(title, onBack, right) {
  return el("header", { class: "topbar" },
    onBack ? el("button", { class: "icon-btn back", onclick: onBack }, "‹") : el("img", { src: "icons/logo.svg", class: "tb-logo", alt: "" }),
    el("h1", {}, title),
    right || el("span", { style: "width:40px" }));
}
function homeTopbar() {
  return el("header", { class: "topbar" },
    el("div", { class: "brandwrap" },
      el("img", { src: "icons/logo.svg", class: "tb-logo", alt: "" }),
      el("div", { class: "wm" },
        el("div", { class: "t", html: "F<b>R</b>A" }),
        el("div", { class: "s" }, "Jurnal de crap"))),
    el("button", { class: "icon-btn", onclick: () => go("/setari"), title: "Setări" }, "⚙"));
}
function fab(label, onclick) {
  return el("button", { class: "fab", onclick }, el("span", { class: "plus" }, "＋"), label);
}
function sectionH(num, label) {
  return el("h3", { class: "section" }, el("span", { class: "num" }, num), label);
}
function heroStat(v, unitOrLabel, label) {
  const hasUnit = label !== undefined;
  return el("div", { class: "st" },
    el("div", { class: "v" }, String(v), hasUnit ? el("small", {}, " " + unitOrLabel) : null),
    el("div", { class: "k" }, hasUnit ? label : unitOrLabel));
}
function colorHex(id) {
  const f = CULORI.find(x => x.id === id);
  if (f && f.hex) return f.hex;
  if (typeof id === "string" && /^#/.test(id)) return id;
  return null;
}
// rezumat montură ca nod DOM (cu bulină de culoare)
function monturaSummaryNode(m) {
  if (!m) return "";
  const txt = monturaSummary(m);
  const colorId = m.tip === "snowman" ? ((m.popup && m.popup.culoare) || (m.boilies && m.boilies.culoare)) : m.culoare;
  const hex = colorHex(colorId);
  const frag = document.createDocumentFragment();
  if (hex) frag.appendChild(el("span", { class: "dotc", style: "background:" + hex }));
  frag.appendChild(document.createTextNode(txt));
  return frag;
}

/* ---------- service worker ---------- */
function registerSW() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
}
