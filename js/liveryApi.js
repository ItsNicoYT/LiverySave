window.LiveryApi = (() => {
  const BASE = "https://api.adsbdb.com/v0/aircraft/";

  function fullAirportPhoto(photo) {
    const p = String(photo || "");
    if (!p.includes("airport-data") || !p.includes("/thumbnails/")) return p;
    const id = p.split("/").pop();
    return id ? "https://image.airport-data.com/aircraft/" + id : p;
  }

  async function lookup(reg) {
    const clean = String(reg).trim().toUpperCase().replace(/\s+/g, "");
    const url = BASE + encodeURIComponent(clean);
    let res;
    try {
      res = await fetch(url);
    } catch (e) {
      throw new Error("network");
    }
    if (res.status === 404) throw new Error("not-found");
    if (!res.ok) throw new Error("network");
    const data = await res.json();
    const ac = data.response && data.response.aircraft;
    if (!ac) throw new Error("not-found");
    return {
      reg: ac.registration || clean,
      type: ac.type || "",
      icaoType: ac.icao_type || "",
      manufacturer: ac.manufacturer || "",
      operator: ac.registered_owner || "",
      operatorIcao: ac.registered_owner_operator_flag_code || "",
      country: ac.registered_owner_country_name || "",
      photo: ac.url_photo_thumbnail || ac.url_photo || "",
      photoFull: fullAirportPhoto(ac.url_photo_thumbnail || ac.url_photo || ""),
    };
  }

  return { lookup };
})();