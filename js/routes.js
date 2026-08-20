window.RouteIdeas = (() => {
  const DATA_URL = "js/data/routes.json";
  const CACHE_KEY = "ls_routes_v1";

  let data = null;
  let loading = null;

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function parseCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (d && d.airports && d.airlines && d.routes) return d;
      return null;
    } catch (e) {
      return null;
    }
  }

  function storeCache(d) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(d));
    } catch (e) {
      /* storage full or unavailable — fine */
    }
  }

  function load() {
    if (data) return Promise.resolve(data);
    if (loading) return loading;
    const cached = parseCache();
    if (cached) {
      data = cached;
      return Promise.resolve(data);
    }
    loading = fetch(DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error("route-data");
        return res.json();
      })
      .then((d) => {
        data = d;
        storeCache(d);
        return d;
      })
      .finally(() => {
        loading = null;
      });
    return loading;
  }

  function typeCandidates(icaoType) {
    const t = String(icaoType || "").toUpperCase().trim();
    if (!t) return [];
    const set = [t];
    if (t.length > 3 && /^[A-Z]/.test(t)) set.push(t.slice(1));
    return set;
  }

  function matchesType(icaoType, equipment) {
    const cands = typeCandidates(icaoType);
    if (!cands.length) return false;
    return String(equipment || "")
      .toUpperCase()
      .split(/\s+/)
      .some((tok) => {
        if (!tok) return false;
        const t = tok.length > 3 && /^[A-Z][0-9A-Z]/.test(tok) ? tok.slice(1) : tok;
        return cands.includes(t);
      });
  }

  function resolveAirline(entry) {
    if (!data) return null;
    const icao = String(entry.operatorIcao || "").toUpperCase().trim();
    if (icao) {
      const byIcao = data.airlines.find((a) => a.icao.toUpperCase() === icao);
      if (byIcao && byIcao.iata && data.routes[byIcao.iata]) return byIcao;
    }
    const name = norm(entry.operator);
    if (!name) return null;
    let best = null;
    let bestScore = 0;
    for (const a of data.airlines) {
      const an = norm(a.name);
      if (!an) continue;
      let score = 0;
      if (an === name) score = 200;
      else if (name.length >= 3 && an.includes(name)) score = 100 + (an.length - name.length);
      else if (name.length >= 4 && name.includes(an)) score = 60 + (name.length - an.length);
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
    if (best && best.iata && data.routes[best.iata]) return best;
    return null;
  }

  function airport(iata) {
    if (!data || !data.airports) return null;
    return data.airports[iata] || null;
  }

  function distKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const s =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
  }

  function blockMinutes(km) {
    return Math.round((km / 850) * 60) + 35;
  }

  function allRoutes(entry) {
    if (!data) return null;
    const airline = resolveAirline(entry);
    if (!airline) return null;
    const list = data.routes[airline.iata] || [];
    const icaoType = entry.icaoType;
    const code = airline.iata || airline.icao || "";
    const out = [];
    for (const [a, b, equip] of list) {
      const pa = airport(a);
      const pb = airport(b);
      if (!pa || !pb) continue;
      const km = distKm(pa[3], pa[4], pb[3], pb[4]);
      out.push({
        a: a,
        b: b,
        aName: pa[0],
        aCity: pa[1],
        aCountry: pa[2],
        bName: pb[0],
        bCity: pb[1],
        bCountry: pb[2],
        aLat: pa[3],
        aLon: pa[4],
        bLat: pb[3],
        bLon: pb[4],
        km: Math.round(km),
        minutes: blockMinutes(km),
        match: matchesType(icaoType, equip),
        flt: fltLabel(code, a, b),
      });
    }
    return out;
  }

  function fltLabel(code, a, b) {
    if (!code) return "";
    let h = 0;
    const s = code + "|" + a + "|" + b;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return code + " " + (Math.abs(h) % 1990 + 10);
  }

  function formatDuration(min) {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    if (h === 0) return m + "m";
    return h + "h " + String(m).padStart(2, "0") + "m";
  }

  function formatDistance(km) {
    return km.toLocaleString("en-US") + " km";
  }

  return { load, resolveAirline, allRoutes, matchesType, formatDuration, formatDistance };
})();
