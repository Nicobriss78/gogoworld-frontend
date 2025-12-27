// frontend/js/map.js
// Leaflet + MarkerCluster — estratto da partecipante.js (UI v2)

export function createParticipantMap({ mapId = "map", onSelectEvent = null } = {}) {
  const mapEl = document.getElementById(mapId);

  let map = null;
  let cluster = null;

  // dizionario: eventId -> marker
  let markersById = {};
// callback (impostabile anche dopo)
  let _onSelectEvent = (typeof onSelectEvent === "function") ? onSelectEvent : null;

  function setOnSelectEvent(fn) {
    _onSelectEvent = (typeof fn === "function") ? fn : null;
  }

  function emitSelect(ev) {
    try { _onSelectEvent && _onSelectEvent(ev); } catch {}
  }

  function formatEventDate(ev) {
    try {
      const start = ev?.date || ev?.dateStart;
      const end = ev?.endDate || ev?.dateEnd;
      if (!start && !end) return "";
      const startStr = start ? new Date(start).toLocaleDateString() : "";
      if (end) {
        const endStr = new Date(end).toLocaleDateString();
        if (startStr && endStr && startStr !== endStr) return `${startStr} – ${endStr}`;
      }
      return startStr;
    } catch {
      return "";
    }
  }

  function getEventStatusForMap(ev) {
    const raw = String(ev?.status || "").toLowerCase();
    if (raw === "future" || raw === "imminent" || raw === "ongoing" || raw === "concluded" || raw === "past") {
      return raw;
    }

    // fallback minimo se manca lo status
    try {
      const now = Date.now();
      const start = ev?.dateStart || ev?.date || ev?.startDate;
      const end = ev?.dateEnd || ev?.endDate;
      const startMs = start ? Date.parse(start) : NaN;
      const endMs = end ? Date.parse(end) : NaN;

      if (Number.isFinite(endMs) && endMs < now) return "past";
      if (Number.isFinite(startMs) && startMs > now) return "future";
    } catch {}

    return "future";
  }

  function addMapMarkerForEvent(ev) {
    if (!cluster || !map || !ev) return null;

    const statusRaw = String(ev?.status || "").toLowerCase();
    if (statusRaw === "past") return null;

    // supporta lat/lon diretti o GeoJSON location.coordinates [lon, lat]
    const coords = Array.isArray(ev?.location?.coordinates) ? ev.location.coordinates : null;

    const latRaw = ev?.lat ?? ev?.Lat ?? ev?.latitude ?? (coords ? coords[1] : undefined);
    const lonRaw = ev?.lon ?? ev?.lng ?? ev?.Lon ?? ev?.longitude ?? (coords ? coords[0] : undefined);

    const lat = typeof latRaw === "string" ? parseFloat(latRaw.replace(",", ".")) : latRaw;
    const lon = typeof lonRaw === "string" ? parseFloat(lonRaw.replace(",", ".")) : lonRaw;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    // colore coerente con legenda
    let fill = "#4a90e2"; // future
    if (statusRaw === "imminent") fill = "#f5a623";
    else if (statusRaw === "ongoing") fill = "#d0021b";
    else if (statusRaw === "concluded") fill = "#999999";

    const m = L.circleMarker([lat, lon], {
      radius: 10,
      weight: 2,
      color: "#ffffff",
      fillColor: fill,
      fillOpacity: 1
    });

    const when = formatEventDate(ev);
    const title = ev?.title || "";
    m.bindPopup(`<b>${title}</b>${when ? "<br/>" + when : ""}`);
    m.on("click", () => emitSelect(ev));
    cluster.addLayer(m);

    if (ev?._id) {
      markersById[ev._id] = m;
    }
    return m;
  }

  function init() {
    if (!mapEl || !window.L) return { map, cluster, markersById };

    map = L.map(mapId).setView([41.8719, 12.5674], 6); // Italia
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    cluster = L.markerClusterGroup();
    map.addLayer(cluster);

    return { map, cluster, markersById };
  }

  function updateFromEvents(events) {
    if (!cluster || !map || !Array.isArray(events)) return;

    cluster.clearLayers();
    markersById = {};

    const markers = [];
    for (const ev of events) {
      const m = addMapMarkerForEvent(ev);
      if (m) markers.push(m);
    }

    if (markers.length) {
      try {
        const group = L.featureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
      } catch {}
    }
  }

  function addPrivateEventsIfMissing(privateEvents) {
    if (!cluster || !map || !Array.isArray(privateEvents)) return;

    for (const ev of privateEvents) {
      if (!ev?._id) continue;
      if (markersById[ev._id]) continue;
      addMapMarkerForEvent(ev);
    }
  }

  function focusOnEventId(evId) {
    if (!evId || !map) return;
    const marker = markersById?.[evId];
    if (!marker || typeof marker.getLatLng !== "function") return;

    try {
      const latLng = marker.getLatLng();
      const targetZoom = Math.max(map.getZoom() || 0, 8);
      map.setView(latLng, targetZoom, { animate: true });
      marker.openPopup();
    } catch {}
  }

return {
    init,
    updateFromEvents,
    addPrivateEventsIfMissing,
    focusOnEventId,
    setOnSelectEvent,
    get map() { return map; },
    get cluster() { return cluster; },
    get markersById() { return markersById; }
  };

}
