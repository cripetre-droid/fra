/* ============================================================
   FRA — integrare Supabase (auth + profil + sync + clasament)
   Rulează doar dacă window.FRA_CLOUD === true (chei setate în config.js).
   Altfel aplicația merge în mod LOCAL, exact ca înainte.
   ============================================================ */

const Cloud = (() => {
  let client = null;
  let _session = null;
  let _profile = null;
  const listeners = [];

  const enabled = () => !!window.FRA_CLOUD && !!window.supabase;

  function init() {
    if (!enabled()) return;
    client = window.supabase.createClient(window.FRA_CONFIG.supabaseUrl, window.FRA_CONFIG.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    client.auth.onAuthStateChange((_evt, session) => {
      _session = session;
      if (!session) _profile = null;
      emit();
    });
  }
  function emit() { listeners.forEach(fn => { try { fn(_session); } catch (e) {} }); }
  function onChange(fn) { listeners.push(fn); }

  async function loadSession() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    _session = data.session || null;
    return _session;
  }
  const session = () => _session;
  const user = () => (_session && _session.user) || null;
  const profile = () => _profile;
  const isAdmin = () => !!(_profile && _profile.role === "admin");

  /* ---------- auth ---------- */
  async function signUp(email, password, displayName) {
    const { data, error } = await client.auth.signUp({
      email, password, options: { data: { display_name: displayName || "" } },
    });
    if (error) throw error;
    return data;
  }
  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    _session = data.session;
    return data;
  }
  async function signOut() {
    await client.auth.signOut();
    _session = null; _profile = null;
  }
  async function resetPassword(email) {
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    if (error) throw error;
  }
  async function updatePassword(newPass) {
    const { error } = await client.auth.updateUser({ password: newPass });
    if (error) throw error;
  }

  /* ---------- profil ---------- */
  async function loadProfile() {
    if (!user()) return null;
    let { data, error } = await client.from("profiles").select("*").eq("id", user().id).maybeSingle();
    if (error) throw error;
    if (!data) { // fallback dacă triggerul n-a rulat încă
      const ins = await client.from("profiles").insert({ id: user().id, display_name: (user().email || "").split("@")[0] }).select().maybeSingle();
      data = ins.data;
    }
    _profile = data;
    return data;
  }
  async function updateProfile(patch) {
    const { data, error } = await client.from("profiles").update(patch).eq("id", user().id).select().maybeSingle();
    if (error) throw error;
    _profile = data;
    return data;
  }

  /* ---------- mapare partidă ↔ rând ---------- */
  function statsOf(p) {
    let capturi = 0, total = 0, record = 0;
    (p.zile || []).forEach(z => (z.lansete || []).forEach(l => (l.trasaturi || []).forEach(t => {
      if (t.rezultat === "prins") { capturi++; const g = parseFloat(t.captura && t.captura.greutate) || 0; total += g; if (g > record) record = g; }
    })));
    return { capturi, total, record };
  }
  function toRow(p, uid) {
    const s = statsOf(p);
    return {
      id: p.id, user_id: uid, balta_id: p.baltaId || null, balta_name: p.baltaName || null,
      stand_no: p.standNo == null ? null : p.standNo,
      data_start: p.dataStart || null, data_end: p.dataEnd || null, note: p.note || null,
      payload: { zile: p.zile || [] },
      capturi: s.capturi, total_kg: s.total, record_kg: s.record,
      deleted: false, updated_at: p.updatedAt || new Date().toISOString(),
    };
  }
  function fromRow(r) {
    return {
      id: r.id, baltaId: r.balta_id, baltaName: r.balta_name, standNo: r.stand_no,
      dataStart: r.data_start, dataEnd: r.data_end, note: r.note || "",
      zile: (r.payload && r.payload.zile) || [],
      updatedAt: r.updated_at, createdAt: r.created_at,
    };
  }
  const newer = (a, b) => new Date(a || 0).getTime() > new Date(b || 0).getTime();

  /* ---------- sync bidirecțional (last-write-wins pe updated_at) ---------- */
  let syncing = false;
  async function syncNow() {
    if (!client || !user()) return { ok: false, reason: "no-auth" };
    if (!navigator.onLine) return { ok: false, reason: "offline" };
    if (syncing) return { ok: false, reason: "busy" };
    syncing = true;
    try {
      const { data: remote, error } = await client.from("partide").select("*").eq("user_id", user().id);
      if (error) throw error;
      const remoteMap = new Map(remote.map(r => [r.id, r]));
      const localMap = new Map(Store.rawPartide().map(p => [p.id, p]));

      // remote → local
      for (const r of remote) {
        const l = localMap.get(r.id);
        if (r.deleted) { if (l) Store.hardRemove(r.id); continue; }
        if (!l || newer(r.updated_at, l.updatedAt)) Store.upsertRemote(fromRow(r));
      }
      // local → remote
      const ups = [];
      for (const p of Store.rawPartide()) {
        const r = remoteMap.get(p.id);
        if (!r || newer(p.updatedAt, r.updated_at)) ups.push(toRow(p, user().id));
      }
      for (const t of Store.tombstones()) {
        ups.push({ id: t.id, user_id: user().id, deleted: true, payload: {}, updated_at: t.at || new Date().toISOString() });
      }
      if (ups.length) {
        const { error: e2 } = await client.from("partide").upsert(ups);
        if (e2) throw e2;
      }
      Store.clearTombstones();
      return { ok: true, pushed: ups.length, pulled: remote.length };
    } finally { syncing = false; }
  }

  /* ---------- clasament ---------- */
  async function leaderboard() {
    const { data, error } = await client.rpc("leaderboard");
    if (error) throw error;
    return data || [];
  }

  /* ---------- admin: utilizatori ---------- */
  async function listUsers() {
    const { data, error } = await client.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  async function setUserRole(id, role) {
    const { error } = await client.from("profiles").update({ role }).eq("id", id);
    if (error) throw error;
  }

  /* ---------- bălți proprii ---------- */
  async function listMyBalti() {
    const { data, error } = await client.from("balti").select("*").eq("owner_id", user().id);
    if (error) throw error;
    return data || [];
  }
  async function addBalta(b) {
    const row = { ...b, owner_id: user().id, is_official: false };
    const { data, error } = await client.from("balti").insert(row).select().maybeSingle();
    if (error) throw error;
    return data;
  }

  return {
    enabled, init, onChange, loadSession, session, user, profile, isAdmin,
    signUp, signIn, signOut, resetPassword, updatePassword,
    loadProfile, updateProfile,
    syncNow, leaderboard, listUsers, setUserRole, listMyBalti, addBalta,
  };
})();
