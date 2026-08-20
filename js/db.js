window.DB = (() => {
  const URL = "https://qibqulmgbxyiwtoqhngj.supabase.co/rest/v1/";
  const KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpYnF1bG1nYnh5aXd0b3FobmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNjA4MTcsImV4cCI6MjEwMjczNjgxN30.R57gkwcQrF9l7ql1ODLc032Bo3KRunPoZmxgkJgYxBw";

  async function req(path, { method = "GET", body = null } = {}) {
    const res = await fetch(URL + path, {
      method: method,
      headers: {
        apikey: KEY,
        Authorization: "Bearer " + KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error("db:" + res.status);
    if (method === "DELETE") return null;
    return res.json();
  }

  function rowLivery(it) {
    return {
      id: it.id,
      created_at: it.createdAt ? new Date(it.createdAt).toISOString() : new Date().toISOString(),
      reg: it.reg || null,
      operator: it.operator || null,
      type: it.type || null,
      livery_name: it.liveryName || null,
      notes: it.notes || null,
      fsim_url: it.fsimUrl || null,
      photo: it.photo || null,
      photo_full: it.photoFull || null,
      manufacturer: it.manufacturer || null,
      icao_type: it.icaoType || null,
      operator_icao: it.operatorIcao || null,
      country: it.country || null,
    };
  }

  function itemLivery(row) {
    return {
      id: row.id,
      createdAt: new Date(row.created_at).getTime(),
      reg: row.reg || "",
      operator: row.operator || "",
      type: row.type || "",
      liveryName: row.livery_name || "",
      notes: row.notes || "",
      fsimUrl: row.fsim_url || "",
      photo: row.photo || "",
      photoFull: row.photo_full || "",
      manufacturer: row.manufacturer || "",
      icaoType: row.icao_type || "",
      operatorIcao: row.operator_icao || "",
      country: row.country || "",
    };
  }

  async function loadLiveries() {
    return (await req("liveries?select=*&order=created_at.desc")).map(itemLivery);
  }

  async function saveLivery(it) {
    const rows = await req("liveries", { method: "POST", body: rowLivery(it) });
    return rows && rows[0] ? itemLivery(rows[0]) : it;
  }

  async function updateLivery(it) {
    const { id, created_at, ...rest } = rowLivery(it);
    const rows = await req("liveries?id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      body: rest,
    });
    return rows && rows[0] ? itemLivery(rows[0]) : it;
  }

  async function deleteLivery(id) {
    await req("liveries?id=eq." + encodeURIComponent(id), { method: "DELETE" });
  }

  function rowFlight(f) {
    return {
      id: f.id,
      created_at: f.createdAt ? new Date(f.createdAt).toISOString() : new Date().toISOString(),
      reg: f.reg || null,
      operator: f.operator || null,
      aircraft: f.aircraft || null,
      airline: f.airline || null,
      flt: f.flt || null,
      origin: f.origin || null,
      dest: f.dest || null,
      origin_city: f.originCity || null,
      dest_city: f.destCity || null,
      origin_lat: f.originLat || null,
      origin_lon: f.originLon || null,
      dest_lat: f.destLat || null,
      dest_lon: f.destLon || null,
      km: f.km || 0,
      minutes: f.minutes || 0,
      match: !!f.match,
    };
  }

  function itemFlight(row) {
    return {
      id: row.id,
      createdAt: new Date(row.created_at).getTime(),
      reg: row.reg || "",
      operator: row.operator || "",
      aircraft: row.aircraft || "",
      airline: row.airline || "",
      flt: row.flt || "",
      origin: row.origin || "",
      dest: row.dest || "",
      originCity: row.origin_city || "",
      destCity: row.dest_city || "",
      originLat: row.origin_lat || 0,
      originLon: row.origin_lon || 0,
      destLat: row.dest_lat || 0,
      destLon: row.dest_lon || 0,
      km: row.km || 0,
      minutes: row.minutes || 0,
      match: !!row.match,
    };
  }

  async function loadFlights() {
    return (await req("flights?select=*&order=created_at.desc")).map(itemFlight);
  }

  async function saveFlight(f) {
    const rows = await req("flights", { method: "POST", body: rowFlight(f) });
    return rows && rows[0] ? itemFlight(rows[0]) : f;
  }

  async function deleteFlight(id) {
    await req("flights?id=eq." + encodeURIComponent(id), { method: "DELETE" });
  }

  function rowPlane(p) {
    return {
      id: p.id,
      created_at: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
      name: p.name || null,
      codes: p.codes || null,
    };
  }

  function itemPlane(row) {
    return {
      id: row.id,
      createdAt: new Date(row.created_at).getTime(),
      name: row.name || "",
      codes: row.codes || "",
    };
  }

  async function loadPlanes() {
    return (await req("planes?select=*&order=created_at.desc")).map(itemPlane);
  }

  async function savePlane(p) {
    const rows = await req("planes", { method: "POST", body: rowPlane(p) });
    return rows && rows[0] ? itemPlane(rows[0]) : p;
  }

  async function deletePlane(id) {
    await req("planes?id=eq." + encodeURIComponent(id), { method: "DELETE" });
  }

  return {
    loadLiveries,
    saveLivery,
    updateLivery,
    deleteLivery,
    loadFlights,
    saveFlight,
    deleteFlight,
    loadPlanes,
    savePlane,
    deletePlane,
  };
})();