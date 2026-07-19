/* ============================================================
   FRA — stocare
   • partidele + listele învățate  → localStorage (sincron, ușor de exportat)
   • pozele capturilor              → IndexedDB (blob-uri, fără limita de 5 MB)
   ============================================================ */

const Store = (() => {
  const KEY = "fra_v1";

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; }
    catch (e) { return null; }
  }
  function blank() {
    return {
      partide: [],
      producatori: [...PRODUCATORI_SEED],
      carligProducatori: [...CARLIG_PRODUCATORI_SEED],
      carligTipuri: [...CARLIG_TIPURI],
      specii: [...SPECII_SEED],
      culoriExtra: [], // culori „alta" introduse de utilizator
      tombstones: [],  // {id, at} — partide șterse local, de propagat la sync
      balti: [],       // bălți proprii (adăugate de utilizator)
    };
  }
  let db = read() || blank();
  // completează cheile noi apărute după un update
  const def = blank();
  for (const k in def) if (!(k in db)) db[k] = def[k];

  function persist() {
    db.updatedAt = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  /* ---------- partide ---------- */
  function partide() {
    return [...db.partide].sort((a, b) =>
      (b.dataStart || "").localeCompare(a.dataStart || "") ||
      (b.createdAt || "").localeCompare(a.createdAt || ""));
  }
  function getPartida(id) { return db.partide.find(p => p.id === id) || null; }

  function savePartida(p) {
    const now = new Date().toISOString();
    if (!p.id) {
      p.id = "p_" + now.replace(/\D/g, "") + "_" + Math.floor(performance.now() % 100000);
      p.createdAt = now;
      db.partide.push(p);
    } else {
      const i = db.partide.findIndex(x => x.id === p.id);
      if (i >= 0) db.partide[i] = p; else db.partide.push(p);
    }
    p.updatedAt = now;
    persist();
    return p;
  }
  function removePartida(id) {
    db.partide = db.partide.filter(p => p.id !== id);
    if (!db.tombstones.some(t => t.id === id)) db.tombstones.push({ id, at: new Date().toISOString() });
    persist();
  }

  /* ---------- sincronizare ---------- */
  const rawPartide = () => db.partide;
  function upsertRemote(p) { // scrie o partidă venită din cloud, PĂSTRÂND updatedAt-ul ei
    const i = db.partide.findIndex(x => x.id === p.id);
    if (i >= 0) db.partide[i] = p; else db.partide.push(p);
    localStorage.setItem(KEY, JSON.stringify(db));
  }
  function hardRemove(id) { db.partide = db.partide.filter(p => p.id !== id); localStorage.setItem(KEY, JSON.stringify(db)); }
  const tombstones = () => db.tombstones;
  function clearTombstones() { db.tombstones = []; persist(); }
  function replaceAll(next) { // la logout / schimbare cont
    db = next || blank();
    for (const k in def) if (!(k in db)) db[k] = def[k];
    persist();
  }

  /* ---------- liste învățate (autocomplete) ---------- */
  function learn(listKey, value) {
    value = (value || "").trim();
    if (!value) return;
    const list = db[listKey];
    if (!list) return;
    if (!list.some(v => v.toLowerCase() === value.toLowerCase())) {
      list.push(value);
      list.sort((a, b) => a.localeCompare(b, "ro"));
      persist();
    }
  }
  /* ---------- bălți proprii ---------- */
  const customBalti = () => db.balti;
  function addCustomBalta(b) { db.balti.push(b); persist(); }
  function removeCustomBalta(id) { db.balti = db.balti.filter(x => x.id !== id); persist(); }

  const producatori       = () => db.producatori;
  const carligProducatori = () => db.carligProducatori;
  const carligTipuri      = () => db.carligTipuri;
  const specii            = () => db.specii;
  const culoriExtra       = () => db.culoriExtra;

  /* ---------- export / import ---------- */
  function exportJSON() { return JSON.stringify(db, null, 2); }
  function importJSON(text, mode /* 'replace' | 'merge' */) {
    const incoming = JSON.parse(text);
    if (!incoming || !Array.isArray(incoming.partide)) throw new Error("Fișier FRA invalid.");
    if (mode === "merge") {
      const ids = new Set(db.partide.map(p => p.id));
      incoming.partide.forEach(p => { if (!ids.has(p.id)) db.partide.push(p); });
      ["producatori", "carligProducatori", "carligTipuri", "specii", "culoriExtra"].forEach(k => {
        (incoming[k] || []).forEach(v => learn(k, v));
      });
    } else {
      db = incoming;
      for (const k in def) if (!(k in db)) db[k] = def[k];
    }
    persist();
  }

  /* ---------- poze (IndexedDB) ---------- */
  let _idb = null;
  function idb() {
    if (_idb) return _idb;
    _idb = new Promise((resolve, reject) => {
      const req = indexedDB.open("fra_photos", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("photos");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return _idb;
  }
  async function putPhoto(id, blob) {
    const d = await idb();
    return new Promise((res, rej) => {
      const tx = d.transaction("photos", "readwrite");
      tx.objectStore("photos").put(blob, id);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
  }
  async function getPhoto(id) {
    const d = await idb();
    return new Promise((res, rej) => {
      const tx = d.transaction("photos", "readonly");
      const r = tx.objectStore("photos").get(id);
      r.onsuccess = () => res(r.result || null); r.onerror = () => rej(r.error);
    });
  }
  async function delPhoto(id) {
    const d = await idb();
    return new Promise((res) => {
      const tx = d.transaction("photos", "readwrite");
      tx.objectStore("photos").delete(id);
      tx.oncomplete = res; tx.onerror = res;
    });
  }

  return {
    partide, getPartida, savePartida, removePartida,
    rawPartide, upsertRemote, hardRemove, tombstones, clearTombstones, replaceAll,
    customBalti, addCustomBalta, removeCustomBalta,
    learn, producatori, carligProducatori, carligTipuri, specii, culoriExtra,
    exportJSON, importJSON,
    putPhoto, getPhoto, delPhoto,
    raw: () => db,
  };
})();
