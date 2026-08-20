(() => {
  const $ = (sel) => document.querySelector(sel);

  const boardEl = $("#board");
  const chipsEl = $("#chips");
  const searchInput = $("#searchInput");
  const countLabel = $("#countLabel");
  const fab = $("#fab");
  const surpriseBtn = $("#surpriseBtn");

  const backdrop = $("#backdrop");
  const addSheet = $("#addSheet");
  const detailSheet = $("#detailSheet");
  const flightsSheet = $("#flightsSheet");
  const flightsList = $("#flightsList");
  const flightsBadge = $("#flightsBadge");
  const planesSheet = $("#planesSheet");
  const planesList = $("#planesList");
  const planeForm = $("#planeForm");
  const pName = $("#pName");
  const detailBody = $("#detailBody");
  const dImg = $("#dImg");
  const toastEl = $("#toast");

  const addStepInput = $("#addStepInput");
  const addStepLoading = $("#addStepLoading");
  const addStepError = $("#addStepError");
  const addForm = $("#addForm");
  const regInput = $("#regInput");
  const lookupBtn = $("#lookupBtn");
  const retryBtn = $("#retryBtn");
  const manualBtn = $("#manualBtn");
  const lookupStatus = $("#lookupStatus");
  const lookupError = $("#lookupError");
  const previewCard = $("#previewCard");
  const fReg = $("#fReg");
  const fOperator = $("#fOperator");
  const fType = $("#fType");
  const fLivery = $("#fLivery");
  const fNotes = $("#fNotes");
  const fUrl = $("#fUrl");

  let currentFilter = "all";
  let query = "";
  let pendingLookup = null;
  let detailId = null;
  let lastReg = "";
  let toastTimer = null;
  let routeMaxHours = 0;
  let routeAll = [];
  let routeAirlineName = "";
  let routeEntry = null;
  let routeMap = null;
  let savedFlights = [];
  let planes = [];

  const DURATION_PRESETS = [
    { label: "All", max: 0 },
    { label: "1h", max: 60 },
    { label: "2h", max: 120 },
    { label: "3h", max: 180 },
    { label: "4h", max: 240 },
    { label: "5h", max: 300 },
    { label: "6h", max: 360 },
    { label: "8h", max: 480 },
    { label: "10h", max: 600 },
    { label: "12h+", max: -1 },
  ];

  const SHUFFLE_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>';

  const SAVE_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>';

  function uid() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }));
  }

  function photoSrc(it) {
    if (it.photoFull) return it.photoFull;
    const p = String(it.photo || "");
    if (p.includes("airport-data") && p.includes("/thumbnails/")) {
      const id = p.split("/").pop();
      if (id) return "https://image.airport-data.com/aircraft/" + id;
    }
    return it.photo;
  }

  function friendlyType(it) {
    return AircraftTypes.describe(it.icaoType, it.type);
  }

  function fsimSearchUrl(term) {
    const q = encodeURIComponent(term.trim());
    return "https://flightsim.to/search?q=" + q;
  }

  function shortAirline(name) {
    let words = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!words.length) return "";
    const SUFFIXES = [
      "international air lines",
      "royal dutch airlines",
      "air lines",
      "líneas aéreas de españa",
      "líneas aéreas",
      "russian airlines",
      "airways",
      "airlines",
      "airline",
      "international",
      "holdings",
      "holding",
      "aviation",
      "group",
      "cargo",
      "express",
      "regional",
      "limited",
      "corporation",
      "s.p.a.",
      "ltd",
      "llc",
      "inc",
      "corp",
      "company",
      "plc",
      "s.a.",
      "s.a",
      "asa",
      "sa",
      "ag",
      "as",
    ];
    let changed = true;
    while (changed && words.length > 1) {
      changed = false;
      for (const sfx of SUFFIXES) {
        const sufWords = sfx.split(" ");
        if (sufWords.length >= words.length) continue;
        const tail = words.slice(words.length - sufWords.length).join(" ").toLowerCase();
        if (tail === sfx) {
          words = words.slice(0, words.length - sufWords.length);
          changed = true;
          break;
        }
      }
    }
    return words.join(" ");
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  function filteredItems() {
    const items = Store.getAll();
    return items.filter((it) => {
      const q = query.toLowerCase();
      if (q) {
        const hay = [it.reg, it.operator, it.type, it.liveryName, it.manufacturer, it.notes]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (currentFilter !== "all") {
        const op = (it.operator || "Unknown").toLowerCase();
        if (op !== currentFilter.toLowerCase()) return false;
      }
      return true;
    });
  }

  function renderChips() {
    const ops = {};
    Store.getAll().forEach((it) => {
      const label = it.operator || "Unknown";
      ops[label.toLowerCase()] = label;
    });
    chipsEl.innerHTML = "";
    const mk = (key, label, active) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (active ? " active" : "");
      b.textContent = label;
      b.dataset.filter = key;
      chipsEl.appendChild(b);
    };
    mk("all", "All", currentFilter === "all");
    Object.keys(ops).sort().forEach((k) => mk(k, ops[k], currentFilter === k));
  }

  function emptyState() {
    const d = document.createElement("div");
    d.className = "empty";
    d.innerHTML =
      '<div class="radar" aria-hidden="true"><span class="radar-ring"></span><span class="radar-sweep"></span><span class="radar-plane">&#9992;</span></div>' +
      "<h2>Your inspiration board</h2>" +
      "<p>Save liveries you spot in the sim by their registration. When you don't know what to fly, browse here or hit Surprise me.</p>" +
      '<button class="btn primary" id="emptyAddBtn" type="button">Add your first livery</button>';
    return d;
  }

  function card(it) {
    const art = document.createElement("article");
    art.className = "card";
    art.dataset.id = it.id;
    const visual = it.photo
      ? '<img class="card-img" src="' + esc(photoSrc(it)) + '" alt="" loading="lazy" onerror="this.remove()" />'
      : '<div class="no-photo">&#9992;</div>';
    const badge = it.operator ? '<span class="card-badge">' + esc(it.operator) + "</span>" : "";
    art.innerHTML =
      '<div class="card-visual">' + visual + "</div>" +
      '<div class="card-overlay"><span class="card-reg">' + esc(it.reg) + "</span>" +
      '<span class="card-op">' + esc(it.operator || friendlyType(it) || "Unknown") + "</span></div>" +
      badge;
    art.addEventListener("click", () => openDetail(it.id));
    return art;
  }

  function renderBoard() {
    renderChips();
    const items = filteredItems();
    const total = Store.count();
    countLabel.textContent = total === 0
      ? "No liveries yet"
      : total + (total === 1 ? " livery" : " liveries") + (currentFilter !== "all" || query ? " · filtered" : "");
    boardEl.innerHTML = "";

    if (total === 0) {
      const s = emptyState();
      boardEl.appendChild(s);
      const addBtn = s.querySelector("#emptyAddBtn");
      if (addBtn) addBtn.addEventListener("click", openAdd);
      return;
    }
    if (items.length === 0) {
      const d = document.createElement("div");
      d.className = "empty";
      d.innerHTML = "<h2>No matches</h2><p>Nothing matches your search. Try a different reg, operator or livery name.</p>";
      boardEl.appendChild(d);
      return;
    }
    items.forEach((it) => boardEl.appendChild(card(it)));
  }

  function openSheet(sheet) {
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    backdrop.classList.add("show");
  }

  function closeAllSheets() {
    [addSheet, detailSheet, flightsSheet, planesSheet].forEach((s) => {
      s.classList.remove("open");
      s.setAttribute("aria-hidden", "true");
    });
    backdrop.classList.remove("show");
    destroyRouteMap();
  }

  function showAddStep(step) {
    addStepInput.classList.toggle("hidden", step !== "input");
    addStepLoading.classList.toggle("hidden", step !== "loading");
    addStepError.classList.toggle("hidden", step !== "error");
    addForm.classList.toggle("hidden", step !== "form");
  }

  function resetAddForm() {
    previewCard.classList.add("hidden");
    previewCard.classList.remove("no-photo");
    previewCard.innerHTML = "";
    fReg.value = "";
    fOperator.value = "";
    fType.value = "";
    fLivery.value = "";
    fNotes.value = "";
    fUrl.value = "";
  }

  function openAdd() {
    pendingLookup = null;
    lastReg = "";
    resetAddForm();
    showAddStep("input");
    regInput.value = "";
    openSheet(addSheet);
    setTimeout(() => regInput.focus(), 350);
  }

  async function runLookup(reg) {
    lastReg = reg;
    showAddStep("loading");
    lookupStatus.textContent = "Looking up " + reg + "...";
    let result;
    try {
      result = await LiveryApi.lookup(reg);
    } catch (e) {
      if (e.message === "not-found") {
        lookupError.textContent =
          "No aircraft found for " + reg + ". It may not be in the database — you can still add it manually.";
      } else {
        lookupError.textContent = "Couldn't reach the aircraft database. Check your connection and try again.";
      }
      showAddStep("error");
      return;
    }
    pendingLookup = result;
    resetAddForm();
    fReg.value = result.reg;
    fOperator.value = result.operator || "";
    fType.value = result.type || "";
    if (result.photo) {
      previewCard.innerHTML =
        '<img src="' + esc(photoSrc(result)) + '" alt="" onerror="this.parentElement.classList.add(\'no-photo\');this.remove()" />' +
        '<div class="card-overlay"><span class="card-reg">' + esc(result.reg) + "</span>" +
        '<span class="card-op">' + esc(result.operator || friendlyType(result) || "") + "</span></div>";
      previewCard.classList.remove("hidden");
    }
    showAddStep("form");
  }

  function handleSave(e) {
    e.preventDefault();
    const reg = fReg.value.trim().toUpperCase().replace(/\s+/g, "");
    if (!reg) {
      toast("Enter a registration");
      return;
    }
    Store.add({
      reg: reg,
      operator: fOperator.value.trim(),
      type: fType.value.trim(),
      liveryName: fLivery.value.trim(),
      notes: fNotes.value.trim(),
      fsimUrl: fUrl.value.trim(),
      photo: (pendingLookup && pendingLookup.photo) || "",
      photoFull: (pendingLookup && pendingLookup.photoFull) || "",
      manufacturer: (pendingLookup && pendingLookup.manufacturer) || "",
      icaoType: (pendingLookup && pendingLookup.icaoType) || "",
      operatorIcao: (pendingLookup && pendingLookup.operatorIcao) || "",
      country: (pendingLookup && pendingLookup.country) || "",
    });
    closeAllSheets();
    renderBoard();
    toast("Saved " + reg);
  }

  function setDetailPhoto(it) {
    if (it.photo) {
      dImg.src = photoSrc(it);
      dImg.style.display = "";
      dImg.onerror = () => {
        dImg.style.display = "none";
      };
    } else {
      dImg.removeAttribute("src");
      dImg.style.display = "none";
    }
  }

  function renderDetailView(it) {
    destroyRouteMap();
    const meta = [it.operator, it.manufacturer, it.country].filter(Boolean).join(" · ");
    let livery = "";
    if (it.liveryName) {
      livery = '<div class="detail-livery"><p class="detail-livery-label">Livery</p>' +
        '<p class="detail-livery-name">' + esc(it.liveryName) + "</p></div>";
    }
    let notes = "";
    if (it.notes) {
      notes = '<div class="detail-notes"><p class="detail-notes-text">' + esc(it.notes) + "</p></div>";
    }
    const searchLabel = it.fsimUrl ? "Open livery link" : "Search on flightsim.to";
    detailBody.innerHTML =
      '<p class="detail-reg">' + esc(it.reg) + "</p>" +
      '<p class="detail-type">' + esc(friendlyType(it)) + "</p>" +
      '<p class="detail-meta">' + esc(meta) + "</p>" +
      livery +
      notes +
      '<div id="routeIdeas" class="route-ideas"></div>' +
      '<div class="detail-actions">' +
      '<button class="btn secondary" id="dEditBtn" type="button">Edit</button>' +
      '<button class="btn primary" id="dSearchBtn" type="button">' +
      '<svg viewBox="0 0 24 24" class="btn-icon" aria-hidden="true"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.5 4.5 0 0 1 9.5 14z"/></svg>' +
      "<span>" + esc(searchLabel) + "</span></button>" +
      '<button class="btn danger" id="dDeleteBtn" type="button">Delete</button>' +
      "</div>" +
      '<p class="detail-credit">' + esc(it.photo ? "Photo via airport-data.com" : "") + "</p>";

    setDetailPhoto(it);

    $("#dEditBtn").addEventListener("click", () => startEdit(it.id));
    $("#dSearchBtn").addEventListener("click", () => {
      const plane = matchingPlane(it.icaoType);
      const term = plane
        ? [plane.name, shortAirline(it.operator)].filter(Boolean).join(" ")
        : [shortAirline(it.operator), it.icaoType || it.type].filter(Boolean).join(" ");
      const url = it.fsimUrl || fsimSearchUrl(term || it.reg);
      window.open(url, "_blank", "noopener");
    });
    $("#dDeleteBtn").addEventListener("click", () => {
      const delBtn = $("#dDeleteBtn");
      if (delBtn.dataset.arm !== "1") {
        delBtn.dataset.arm = "1";
        delBtn.textContent = "Tap again to confirm";
        setTimeout(() => {
          delBtn.dataset.arm = "0";
          delBtn.textContent = "Delete";
        }, 2500);
        return;
      }
      Store.remove(it.id);
      closeAllSheets();
      renderBoard();
      toast("Deleted " + it.reg);
    });

    renderRouteIdeas(it);
  }

  function destroyRouteMap() {
    if (routeMap) {
      routeMap.remove();
      routeMap = null;
    }
  }

  function renderRouteIdeas(it) {
    const wrap = $("#routeIdeas");
    if (!wrap) return;
    routeEntry = it;
    routeMaxHours = 0;
    routeAll = [];
    routeAirlineName = "";
    wrap.innerHTML =
      '<div class="route-load"><div class="spinner"></div><p class="loading-text">Finding routes…</p></div>';
    RouteIdeas.load()
      .then(() => {
        const all = RouteIdeas.allRoutes(it);
        const airline = RouteIdeas.resolveAirline(it);
        if (!all || !all.length || !airline) {
          wrap.innerHTML =
            '<p class="route-title">Route ideas</p>' +
            '<p class="route-note">No route data found for ' + esc(it.operator || it.reg) +
            ". Add the operator or check it later.</p>";
          return;
        }
        routeAirlineName = airline.name;
        routeAll = all;
        renderRouteIdeasPanel();
      })
      .catch(() => {
        wrap.innerHTML =
          '<p class="route-title">Route ideas</p>' +
          '<p class="route-note">Route data couldn\u2019t be loaded. Check your connection.</p>';
      });
  }

  function renderRouteIdeasPanel() {
    const wrap = $("#routeIdeas");
    if (!wrap) return;
    wrap.innerHTML =
      '<div class="route-head">' +
      "<div>" +
      '<p class="route-title">Route ideas</p>' +
      '<p class="route-sub">' + esc(routeAirlineName) + "</p>" +
      "</div>" +
      '<button class="route-shuffle" id="routeShuffleBtn" type="button" aria-label="Shuffle routes">' +
      SHUFFLE_ICON + "</button>" +
      "</div>" +
      '<div class="route-chips" id="routeChips"></div>' +
      '<div class="route-list" id="routeList"></div>' +
      '<div class="route-map-wrap hidden" id="routeMapWrap"><div id="routeMap"></div></div>';

    renderRouteChips();
    renderRouteRows();

    $("#routeShuffleBtn").addEventListener("click", renderRouteRows);
    $("#routeChips").addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      routeMaxHours = Number(chip.dataset.max);
      renderRouteChips();
      renderRouteRows();
    });
  }

  function renderRouteChips() {
    const chips = $("#routeChips");
    if (!chips) return;
    chips.innerHTML = "";
    DURATION_PRESETS.forEach((p) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip" + (p.max === routeMaxHours ? " active" : "");
      b.textContent = p.label;
      b.dataset.max = p.max;
      chips.appendChild(b);
    });
  }

  function pickRoutes() {
    const pool = routeAll.filter((r) => {
      if (routeMaxHours === 0) return true;
      if (routeMaxHours === -1) return r.minutes >= 720;
      return r.minutes <= routeMaxHours;
    });
    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr.slice(0, 5);
  }

  function renderRouteRows() {
    const list = $("#routeList");
    if (!list) return;
    const picks = pickRoutes();
    if (!picks.length) {
      list.innerHTML =
        '<p class="route-note">No routes match that duration. Try another filter.</p>';
      return;
    }
    list.innerHTML = "";
    picks.forEach((r) => {
      const row = document.createElement("div");
      row.className = "route-row";
      const typeLabel = routeEntry && friendlyType(routeEntry) || "this aircraft";
      const tag = r.match
        ? '<span class="route-tag">Flown by ' + esc(typeLabel) + "</span>"
        : "";
      const saved = isSaved(r);
      row.innerHTML =
        '<div class="route-main">' +
        '<span class="route-cities">' + esc(r.aCity + " \u2192 " + r.bCity) +
        (r.flt ? ' <span class="route-flt">' + esc(r.flt) + "</span>" : "") + "</span>" +
        '<span class="route-codes">' + esc(r.a + " \u2192 " + r.b) + " · " +
        esc(RouteIdeas.formatDistance(r.km)) + "</span>" +
        "</div>" +
        '<div class="route-side">' +
        '<span class="route-time">' + esc(RouteIdeas.formatDuration(r.minutes)) + "</span>" +
        tag +
        '<button class="route-save' + (saved ? " saved" : "") + '" type="button" aria-label="Save flight">' +
        SAVE_ICON + "</button>" +
        "</div>";
      row.addEventListener("click", () => showRouteMap(r, "#routeMapWrap", "#routeMap"));
      row.querySelector(".route-save").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSaveFlight(r);
      });
      list.appendChild(row);
    });
  }

  function isSaved(r) {
    return savedFlights.some(
      (f) => f.reg === routeEntry.reg && f.origin === r.a && f.dest === r.b && f.flt === r.flt
    );
  }

  function toggleSaveFlight(r) {
    if (isSaved(r)) {
      toast("Already saved");
      return;
    }
    const f = {
      id: uid(),
      createdAt: Date.now(),
      reg: routeEntry.reg,
      operator: routeEntry.operator,
      aircraft: friendlyType(routeEntry),
      airline: routeAirlineName,
      flt: r.flt,
      origin: r.a,
      dest: r.b,
      originCity: r.aCity,
      destCity: r.bCity,
      originLat: r.aLat,
      originLon: r.aLon,
      destLat: r.bLat,
      destLon: r.bLon,
      km: r.km,
      minutes: r.minutes,
      match: r.match,
    };
    savedFlights.push(f);
    DB.saveFlight(f).catch((e) => {
savedFlights = savedFlights.filter((x) => x.id !== f.id);
      renderRouteRows();
      toast("Couldn't save the flight");
    });
    renderRouteRows();
    renderBoard();
    updateFlightsBadge();
    toast("Flight saved");
  }

  function showRouteMap(r, wrapSel, elSel) {
    const wrapEl = $(wrapSel || "#routeMapWrap");
    const mapEl = $(elSel || "#routeMap");
    if (!wrapEl || !mapEl) return;
    if (typeof L === "undefined") {
      toast("Map unavailable");
      return;
    }
    destroyRouteMap();
    wrapEl.classList.remove("hidden");
    routeMap = L.map(mapEl, { scrollWheelZoom: false }).setView([0, 0], 2);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(routeMap);
    const icon = L.divIcon({
      className: "route-marker",
      html: "&#9992;",
      iconSize: [26, 26],
      iconAnchor: [13, 13],
    });
    L.marker([r.aLat, r.aLon], { icon: icon }).addTo(routeMap);
    L.marker([r.bLat, r.bLon], { icon: icon }).addTo(routeMap);
    L.polyline(
      [
        [r.aLat, r.aLon],
        [r.bLat, r.bLon],
      ],
      { color: "#4aa6ff", weight: 3, opacity: 0.9 }
    ).addTo(routeMap);
    routeMap.fitBounds(L.latLngBounds([[r.aLat, r.aLon], [r.bLat, r.bLon]]).pad(0.3));
    setTimeout(() => {
      routeMap.invalidateSize();
      wrapEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
  }

  function updateFlightsBadge() {
    if (!flightsBadge) return;
    flightsBadge.textContent = savedFlights.length;
    flightsBadge.classList.toggle("hidden", savedFlights.length === 0);
  }

  function renderFlightsList() {
    if (!flightsList) return;
    if (!savedFlights.length) {
      flightsList.innerHTML =
        '<p class="flights-empty">No saved flights yet. Open a livery, find a route you like and tap the bookmark.</p>';
      return;
    }
    flightsList.innerHTML = "";
    savedFlights.forEach((f) => {
      const row = document.createElement("div");
      row.className = "flight-row";
      const tag = f.match
        ? '<span class="route-tag">Flown by ' + esc(f.aircraft || f.reg) + "</span>"
        : "";
      row.innerHTML =
        '<div class="route-main">' +
        '<span class="route-cities">' + esc(f.originCity + " \u2192 " + f.destCity) +
        (f.flt ? ' <span class="route-flt">' + esc(f.flt) + "</span>" : "") + "</span>" +
        '<span class="route-codes">' + esc(f.origin + " \u2192 " + f.dest) + " · " +
        esc(RouteIdeas.formatDistance(f.km)) + "</span>" +
        '<span class="route-codes">' + esc([f.aircraft, f.operator, f.reg].filter(Boolean).join(" · ")) + "</span>" +
        "</div>" +
        '<div class="route-side">' +
        '<span class="route-time">' + esc(RouteIdeas.formatDuration(f.minutes)) + "</span>" +
        tag +
        '<button class="flight-del" type="button" aria-label="Delete flight">&#10005;</button>' +
        "</div>";
      row.addEventListener("click", () => showRouteMap({
        aLat: f.originLat, aLon: f.originLon,
        bLat: f.destLat, bLon: f.destLon,
      }, "#flightsMapWrap", "#flightsMap"));
      row.querySelector(".flight-del").addEventListener("click", (e) => {
        e.stopPropagation();
        removeSavedFlight(f, e.currentTarget);
      });
      flightsList.appendChild(row);
    });
  }

  function openFlightsSheet() {
    renderFlightsList();
    openSheet(flightsSheet);
  }

  function removeSavedFlight(f, btn) {
    if (btn.dataset.arm !== "1") {
      btn.dataset.arm = "1";
      btn.textContent = "Confirm?";
      setTimeout(() => {
        btn.dataset.arm = "0";
        btn.textContent = "\u2715";
      }, 2500);
      return;
    }
    savedFlights = savedFlights.filter((x) => x.id !== f.id);
    DB.deleteFlight(f.id).catch((e) => {
      toast("Couldn't delete the flight");
    });
    renderFlightsList();
    updateFlightsBadge();
    renderBoard();
    toast("Flight removed");
  }

  function matchingPlane(icaoType) {
    const t = String(icaoType || "").toUpperCase().trim();
    if (!t) return null;
    return planes.find((p) => {
      const name = String(p.name || "").toUpperCase();
      const codes = String(p.codes || "")
        .toUpperCase()
        .split(/[\s,]+/)
        .map((c) => c.trim())
        .filter(Boolean);
      return codes.includes(t) || (name && name.includes(t));
    }) || null;
  }

  function renderPlanesList() {
    if (!planesList) return;
    if (!planes.length) {
      planesList.innerHTML =
        '<p class="flights-empty">No planes yet. Add the addons you own \u2014 they\u2019ll be used in the flightsim.to search.</p>';
      return;
    }
    planesList.innerHTML = "";
    planes.forEach((p) => {
      const row = document.createElement("div");
      row.className = "plane-row";
      row.innerHTML =
        '<div class="route-main">' +
        '<span class="route-cities">' + esc(p.name) + "</span>" +
        (p.codes ? '<span class="route-codes">' + esc(p.codes) + "</span>" : "") +
        "</div>" +
        '<button class="flight-del" type="button" aria-label="Delete plane">&#10005;</button>';
      row.querySelector(".flight-del").addEventListener("click", (e) => {
        e.stopPropagation();
        removePlane(p, e.currentTarget);
      });
      planesList.appendChild(row);
    });
  }

  function addPlane(e) {
    e.preventDefault();
    const name = pName.value.trim();
    if (!name) {
      toast("Enter the addon name");
      return;
    }
    const codes = (name.match(/\b[A-Z0-9]{3,4}\b/g) || [])
      .map((c) => c.toUpperCase())
      .join(" ");
    const plane = { id: uid(), createdAt: Date.now(), name: name, codes: codes };
    planes.push(plane);
    DB.savePlane(plane).catch((err) => {
      planes = planes.filter((x) => x.id !== plane.id);
      renderPlanesList();
      toast("Couldn\u2019t save the plane");
    });
    pName.value = "";
    renderPlanesList();
    toast("Added " + name);
  }

  function removePlane(p, btn) {
    if (btn.dataset.arm !== "1") {
      btn.dataset.arm = "1";
      btn.textContent = "Confirm?";
      setTimeout(() => {
        btn.dataset.arm = "0";
        btn.textContent = "\u2715";
      }, 2500);
      return;
    }
    planes = planes.filter((x) => x.id !== p.id);
    DB.deletePlane(p.id).catch(() => toast("Couldn\u2019t delete the plane"));
    renderPlanesList();
    toast("Plane removed");
  }

  function openPlanesSheet() {
    renderPlanesList();
    openSheet(planesSheet);
  }

  function startEdit(id) {
    const it = Store.get(id);
    if (!it) return;
    detailBody.innerHTML =
      '<div class="field"><label class="field-label" for="eReg">Registration</label>' +
      '<input id="eReg" class="field-input" type="text" value="' + esc(it.reg) + '" /></div>' +
      '<div class="field"><label class="field-label" for="eOperator">Operator / airline</label>' +
      '<input id="eOperator" class="field-input" type="text" value="' + esc(it.operator) + '" /></div>' +
      '<div class="field"><label class="field-label" for="eType">Aircraft type</label>' +
      '<input id="eType" class="field-input" type="text" value="' + esc(it.type) + '" /></div>' +
      '<div class="field"><label class="field-label" for="eLivery">Livery name</label>' +
      '<input id="eLivery" class="field-input" type="text" value="' + esc(it.liveryName) + '" placeholder="e.g. Retro, OneWorld, special..." /></div>' +
      '<div class="field"><label class="field-label" for="eNotes">Notes</label>' +
      '<textarea id="eNotes" class="field-input textarea" rows="3">' + esc(it.notes) + "</textarea></div>" +
      '<div class="field"><label class="field-label" for="eUrl">flightsim.to link</label>' +
      '<input id="eUrl" class="field-input" type="url" value="' + esc(it.fsimUrl) + '" placeholder="https://flightsim.to/addon/..." /></div>' +
      '<div class="detail-actions">' +
      '<button class="btn primary" id="eSaveBtn" type="button">Save changes</button>' +
      '<button class="btn secondary" id="eCancelBtn" type="button">Cancel</button>' +
      "</div>";

    const val = (sel) => $(sel).value.trim();
    $("#eSaveBtn").addEventListener("click", () => {
      const reg = val("#eReg").toUpperCase().replace(/\s+/g, "");
      if (!reg) {
        toast("Enter a registration");
        return;
      }
      const updated = Store.update(id, {
        reg: reg,
        operator: val("#eOperator"),
        type: val("#eType"),
        liveryName: val("#eLivery"),
        notes: val("#eNotes"),
        fsimUrl: val("#eUrl"),
      });
      renderDetailView(updated);
      renderBoard();
      toast("Updated " + reg);
    });
    $("#eCancelBtn").addEventListener("click", () => renderDetailView(Store.get(id)));
  }

  function openDetail(id) {
    const it = Store.get(id);
    if (!it) return;
    detailId = id;
    renderDetailView(it);
    openSheet(detailSheet);
  }

  function pickSurprise() {
    const items = Store.getAll();
    if (!items.length) {
      toast("Add a livery first");
      return;
    }
    const pick = items[Math.floor(Math.random() * items.length)];
    openDetail(pick.id);
  }

  fab.addEventListener("click", openAdd);
  surpriseBtn.addEventListener("click", pickSurprise);
  $("#flightsBtn").addEventListener("click", openFlightsSheet);
  $("#planesBtn").addEventListener("click", openPlanesSheet);
  planeForm.addEventListener("submit", addPlane);

  Store.onError(() => toast("Cloud sync issue \u2014 change may not be saved"));

  (async () => {
    boardEl.innerHTML =
      '<div class="empty"><div class="spinner"></div><p class="loading-text">Loading…</p></div>';
    const load = (fn, fallback) => fn().catch(() => fallback);
    const [liveries, flights, loadedPlanes] = await Promise.all([
      load(DB.loadLiveries, []),
      load(DB.loadFlights, []),
      load(DB.loadPlanes, []),
    ]);
    Store.setItems(liveries);
    savedFlights = flights;
    planes = loadedPlanes;
    updateFlightsBadge();
    renderBoard();
  })();

  lookupBtn.addEventListener("click", () => {
    const reg = regInput.value.trim();
    if (!reg) {
      toast("Enter a registration");
      return;
    }
    runLookup(reg);
  });

  regInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") lookupBtn.click();
  });

  retryBtn.addEventListener("click", () => {
    if (lastReg) runLookup(lastReg);
  });

  manualBtn.addEventListener("click", () => {
    resetAddForm();
    fReg.value = lastReg;
    showAddStep("form");
  });

  addForm.addEventListener("submit", handleSave);

  document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", closeAllSheets));
  backdrop.addEventListener("click", closeAllSheets);

  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim();
    renderBoard();
  });

  chipsEl.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    currentFilter = chip.dataset.filter;
    renderBoard();
  });
})();