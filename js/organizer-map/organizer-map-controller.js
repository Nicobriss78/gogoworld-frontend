import { fetchOrganizerMapSummary } from "./organizer-map-api.js?v=1";
import { organizerMapState } from "./organizer-map-state.js?v=1";
import {
  getVisibleOrganizerMapEvents,
  renderOrganizerMap,
  renderSelectedOrganizerMapEvent,
} from "./organizer-map-renderer.js?v=1";

let mapInstance = null;
let markerLayer = null;

function getMarkerClass(level) {
  const safeLevel = String(level || "ok").toLowerCase();

  if (["ok", "monitor", "action", "critical"].includes(safeLevel)) {
    return safeLevel;
  }

  return "ok";
}

function createEventIcon(event) {
  const level = getMarkerClass(event?.operationalStatus?.level);

  return window.L.divIcon({
    className: "org-map-marker-wrap",
    html: `<span class="org-map-marker org-map-marker--${level}"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function getMapPoint(event) {
  const lat = Number(event?.point?.lat);
  const lon = Number(event?.point?.lon);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return [lat, lon];
}

function mountOrganizerLeafletMap() {
  const node = document.querySelector("[data-org-map-leaflet]");
  if (!node || !window.L) return;

  if (mapInstance) {
    const currentContainer = mapInstance.getContainer();

    if (currentContainer !== node) {
      mapInstance.remove();
      mapInstance = null;
      markerLayer = null;
    }
  }

  const events = getVisibleOrganizerMapEvents(organizerMapState).filter((event) =>
    getMapPoint(event)
  );

  if (!mapInstance) {
    mapInstance = window.L.map(node, {
      zoomControl: true,
      attributionControl: true,
    }).setView([41.9028, 12.4964], 6);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(mapInstance);
  }

  if (markerLayer) {
    markerLayer.clearLayers();
  } else {
    markerLayer = window.L.layerGroup().addTo(mapInstance);
  }

  const bounds = [];

  events.forEach((event) => {
    const point = getMapPoint(event);
    if (!point) return;

    bounds.push(point);

    const marker = window.L.marker(point, {
      icon: createEventIcon(event),
      title: event.title || "Evento",
    });

    marker.on("click", () => {
      organizerMapState.selectedEventId = event.id;
      renderSelectedOrganizerMapEvent(organizerMapState);

      const panel = document.querySelector("[data-org-map-selected-panel]");
      if (panel) {
        panel.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }

      setTimeout(() => {
        if (mapInstance) {
          mapInstance.invalidateSize();
        }
      }, 60);
    });

    markerLayer.addLayer(marker);
  });

  if (bounds.length) {
    mapInstance.fitBounds(bounds, {
      padding: [28, 28],
      maxZoom: 12,
    });
  }

  setTimeout(() => {
    mapInstance.invalidateSize();
  }, 80);
}

async function loadOrganizerMap() {
  organizerMapState.loading = true;
  organizerMapState.error = "";

  renderOrganizerMap(organizerMapState);

  try {
    organizerMapState.data = await fetchOrganizerMapSummary();
  } catch (error) {
    console.error("[OrganizerMap] load failed", error);
    organizerMapState.error = "Errore nel caricamento della Mappa Organizer.";
  } finally {
    organizerMapState.loading = false;
    renderOrganizerMap(organizerMapState);
    mountOrganizerLeafletMap();
  }
}

function bindOrganizerMapFilters() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-org-map-filter]");
    if (!button) return;

    organizerMapState.filter = button.dataset.orgMapFilter || "operational";
    organizerMapState.selectedEventId = null;

    renderOrganizerMap(organizerMapState);
    mountOrganizerLeafletMap();

    setTimeout(() => {
      if (mapInstance) {
        mapInstance.invalidateSize();
      }
    }, 80);
  });
}

function initOrganizerMap() {
  const root = document.querySelector("[data-org-map-root]");
  if (!root) return;

  bindOrganizerMapFilters();
  loadOrganizerMap();
}

document.addEventListener("DOMContentLoaded", initOrganizerMap);
