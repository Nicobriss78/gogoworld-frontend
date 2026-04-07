export function createMappaMap({
  mapElementId,
  onSelectEvent
}) {
  let map = null;
  let clusterGroup = null;
  let markersById = new Map();
  let selectedMarker = null;

  function mount() {
    if (map) return;

    map = L.map(mapElementId, {
      zoomControl: true
    }).setView([41.9, 12.5], 6); // Italia

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    clusterGroup = L.markerClusterGroup();
    map.addLayer(clusterGroup);
  }

  function setEvents(events = []) {
    if (!clusterGroup) return;

    clusterGroup.clearLayers();
    markersById.clear();
    selectedMarker = null;

    events.forEach((ev) => {
      if (!isValidEvent(ev)) return;

      const marker = createMarker(ev);

      marker.on("click", () => {
        highlightMarker(ev.id);
        onSelectEvent?.(ev);
      });

      clusterGroup.addLayer(marker);
      markersById.set(ev.id, marker);
    });

    fitBounds();
  }

  function createMarker(ev) {
  const color = getColorByStatus(ev.status);

  const marker = L.circleMarker([ev.lat, ev.lon], {
    radius: 8,
    color,
    fillColor: color,
    fillOpacity: 0.9,
    weight: 1
  });

  marker._gwEventMeta = {
    id: ev.id,
    status: ev.status
  };

  marker.bindPopup(createPopupHtml(ev));

  return marker;
}

  function highlightMarker(eventId) {
    if (selectedMarker) {
      resetMarkerStyle(selectedMarker);
    }

    const marker = markersById.get(eventId);
    if (!marker) return;

    marker.setStyle({
      radius: 11,
      weight: 2
    });

    selectedMarker = marker;
  }

  function resetMarkerStyle(marker) {
  const status = marker?._gwEventMeta?.status;
  const color = getColorByStatus(status);

  marker.setStyle({
    radius: 8,
    color,
    fillColor: color,
    fillOpacity: 0.9,
    weight: 1
  });
}

  function focusEvent(eventId) {
    const marker = markersById.get(eventId);
    if (!marker) return;

    highlightMarker(eventId);

    map.setView(marker.getLatLng(), 14, {
      animate: true
    });

    marker.openPopup();
  }

  function clearSelection() {
    if (selectedMarker) {
      resetMarkerStyle(selectedMarker);
      selectedMarker = null;
    }

    if (map) {
  map.closePopup();
}
  }

  function fitBounds() {
    if (!clusterGroup || clusterGroup.getLayers().length === 0) return;

    const bounds = clusterGroup.getBounds();
    map.fitBounds(bounds, { padding: [30, 30] });
  }
  function refreshLayout() {
    if (!map) return;

    map.invalidateSize();

    if (clusterGroup && clusterGroup.getLayers().length > 0) {
      fitBounds();
    }
  }
  function destroy() {
    if (!map) return;

    map.remove();
    map = null;
    markersById.clear();
    selectedMarker = null;
  }

  function isValidEvent(ev) {
    return (
      ev &&
      ev.id &&
      typeof ev.lat === "number" &&
      typeof ev.lon === "number" &&
      ev.status !== "past"
    );
  }

  function getColorByStatus(status) {
    switch (status) {
      case "ongoing":
        return "#ef4444";
      case "imminent":
        return "#f59e0b";
      case "future":
        return "#3b82f6";
      default:
        return "#94a3b8";
    }
  }

  function createPopupHtml(ev) {
    return `
      <div class="mappa-popup">
        <strong>${escapeHtml(ev.title || "")}</strong><br/>
        ${escapeHtml(formatDate(ev.startAt))}
      </div>
    `;
  }

  function formatDate(value) {
    if (!value) return "";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";

    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short"
    });
  }

  function escapeHtml(str = "") {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  return {
    mount,
    setEvents,
    focusEvent,
    clearSelection,
    destroy
  };
}
