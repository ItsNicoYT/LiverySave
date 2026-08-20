"use strict";

const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/";
const FILES = {
  airports: "airports.dat",
  airlines: "airlines.dat",
  routes: "routes.dat",
};
const OUT = path.join(__dirname, "..", "js", "data", "routes.json");

function fetch(name) {
  return new Promise((resolve, reject) => {
    https
      .get(BASE + FILES[name], (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(name + ": HTTP " + res.statusCode));
        }
        let buf = "";
        res.setEncoding("utf8");
        res.on("data", (d) => (buf += d));
        res.on("end", () => resolve(buf));
      })
      .on("error", reject);
  });
}

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((f) => (f === "\\N" ? "" : f.trim()));
}

const isAirport = (c) => /^[A-Z0-9]{3}$/.test(c);
const isAirline = (c) => /^[A-Z0-9]{2}$/.test(c);

async function main() {
  const [airportsRaw, airlinesRaw, routesRaw] = await Promise.all([
    fetch("airports"),
    fetch("airlines"),
    fetch("routes"),
  ]);

  // airports.dat: ID, Name, City, Country, IATA, ICAO, Lat, Lon, ...
  const airports = {};
  const airportsByIcao = {};
  airportsRaw.split(/\r?\n/).forEach((line) => {
    if (!line) return;
    const f = parseCsvLine(line);
    if (f.length < 8) return;
    const iata = f[4];
    const lat = parseFloat(f[6]);
    const lon = parseFloat(f[7]);
    if (!isAirport(iata) || isNaN(lat) || isNaN(lon)) return;
    airports[iata] = [f[1], f[2], f[3], lat, lon];
    const icao = f[5];
    if (icao) airportsByIcao[icao] = iata;
  });

  // airlines.dat: ID, Name, Alias, IATA, ICAO, Callsign, Country, Active
  const airlinesByIcao = {};
  const airlinesByIata = {};
  airlinesRaw.split(/\r?\n/).forEach((line) => {
    if (!line) return;
    const f = parseCsvLine(line);
    if (f.length < 8) return;
    const iata = f[3];
    const icao = f[4];
    const active = f[7].toUpperCase() === "Y";
    if (!active || (!isAirline(iata) && !icao)) return;
    const rec = { iata: iata || "", icao: icao, name: f[1] };
    if (icao && !airlinesByIcao[icao.toUpperCase()]) airlinesByIcao[icao.toUpperCase()] = rec;
    if (iata && !airlinesByIata[iata]) airlinesByIata[iata] = rec;
  });

  // routes.dat: Airline(IATA), AirlineID, Src, SrcID, Dst, DstID, Codeshare, Stops, Equipment
  const routes = {}; // iata -> Map("FRO|TO" -> Set(equip tokens))
  const usedAirlines = new Set();
  const usedAirports = new Set();
  routesRaw.split(/\r?\n/).forEach((line) => {
    if (!line) return;
    const f = parseCsvLine(line);
    if (f.length < 9) return;
    const airIata = f[0];
    const src = f[2];
    const dst = f[4];
    const stops = parseInt(f[7], 10);
    const equip = f[8] || "";
    if (!isAirline(airIata) || !isAirport(src) || !isAirport(dst) || stops !== 0) return;
    if (!airports[src] || !airports[dst]) return;
    const key = src < dst ? src + "|" + dst : dst + "|" + src;
    if (!routes[airIata]) routes[airIata] = new Map();
    if (!routes[airIata].has(key)) routes[airIata].set(key, new Set());
    equip.split(/\s+/).forEach((t) => t && routes[airIata].get(key).add(t));
    usedAirlines.add(airIata);
    usedAirports.add(src);
    usedAirports.add(dst);
  });

  const airList = [];
  usedAirlines.forEach((iata) => {
    const rec = airlinesByIata[iata] || null;
    if (rec) airList.push(rec);
  });
  airList.sort((a, b) => a.name.localeCompare(b.name));

  const apObj = {};
  usedAirports.forEach((iata) => {
    apObj[iata] = airports[iata];
  });

  const routeObj = {};
  Object.keys(routes).forEach((iata) => {
    const arr = [];
    routes[iata].forEach((equipSet, key) => {
      const [a, b] = key.split("|");
      const eq = [...equipSet].sort().join(" ");
      arr.push([a, b, eq]);
    });
    if (arr.length) routeObj[iata] = arr;
  });

  const payload = {
    built: new Date().toISOString(),
    airports: apObj,
    airlines: airList,
    routes: routeObj,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload));

  console.log("airports:", Object.keys(apObj).length);
  console.log("airlines:", airList.length);
  console.log("airline codes with routes:", Object.keys(routeObj).length);
  const pairCount = Object.keys(routeObj).reduce((n, k) => n + routeObj[k].length, 0);
  console.log("city-pairs:", pairCount);
  const bytes = fs.statSync(OUT).size;
  console.log("wrote", OUT, "(" + (bytes / 1024).toFixed(0) + " KB)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
