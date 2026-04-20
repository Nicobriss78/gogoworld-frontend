export function createMappaPrivatiMap({
  mapElementId,
  onSelectEvent,
  onViewportChanged
}) {
  let map = null;
  let clusterGroup = null;
  let markersById = new Map();
  let selectedMarker = null;
  let suppressViewportChanged = false;
  let userGestureActive = false;
  let userLocationMarker = null;
  let userAccuracyCircle = null;

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

    map.on("dragstart", () => {
      userGestureActive = true;
    });

    map.on("zoomstart", () => {
      userGestureActive = true;
    });

    map.on("moveend", handleMoveEnd);
  }

  function setEvents(events = [], options = {}) {
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

    if (options.fitBounds === true) {
      fitUserAndEvents();
    }
  }

  function createMarker(ev) {
  const color = getColorByStatus(ev.status);

  const marker = L.circleMarker([ev.lat, ev.lon], {
    radius: 12,
    color,
    fillColor: color,
    fillOpacity: 0.9,
    weight: 1
  });

  marker._gwEventMeta = {
    id: ev.id,
    status: ev.status
  };

  return marker;
}

  function highlightMarker(eventId) {
    if (selectedMarker) {
      resetMarkerStyle(selectedMarker);
    }

    const marker = markersById.get(eventId);
    if (!marker) return;

    marker.setStyle({
      radius: 15,
    weight: 3
    });

    selectedMarker = marker;
  }

  function resetMarkerStyle(marker) {
  const status = marker?._gwEventMeta?.status;
  const color = getColorByStatus(status);

  marker.setStyle({
    radius: 12,
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
  }

  function clearSelection() {
    if (selectedMarker) {
      resetMarkerStyle(selectedMarker);
      selectedMarker = null;
    }
  }
function setUserLocation(position, { accuracy = null, showCircle = true } = {}) {
    if (!map || !position) return;

    const lat = Number(position.lat);
    const lng = Number(position.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    if (!userLocationMarker) {
      userLocationMarker = L.circleMarker([lat, lng], {
        radius: 6,
        color: "#ef4444",
        fillColor: "#ef4444",
        fillOpacity: 1,
        weight: 2
      }).addTo(map);
    } else {
      userLocationMarker.setLatLng([lat, lng]);
    }

    if (showCircle && Number.isFinite(accuracy)) {
      if (!userAccuracyCircle) {
        userAccuracyCircle = L.circle([lat, lng], {
          radius: accuracy,
          color: "#ef4444",
          fillColor: "#ef4444",
          fillOpacity: 0.08,
          weight: 1
        }).addTo(map);
      } else {
        userAccuracyCircle.setLatLng([lat, lng]);
        userAccuracyCircle.setRadius(accuracy);
      }
    }
  }

  function clearUserLocation() {
    if (userLocationMarker) {
      map.removeLayer(userLocationMarker);
      userLocationMarker = null;
    }

    if (userAccuracyCircle) {
      map.removeLayer(userAccuracyCircle);
      userAccuracyCircle = null;
    }
  }

  function panToPosition(position) {
    if (!map || !position) return;

    map.panTo([position.lat, position.lng], {
      animate: true
    });
  }

  function fitUserAndEvents(position) {
    if (!map) return;

    if (!clusterGroup || clusterGroup.getLayers().length === 0) {
      if (position) {
        map.setView([position.lat, position.lng], 14);
      }
      return;
    }

    const bounds = clusterGroup.getBounds();

    if (position) {
      bounds.extend([position.lat, position.lng]);
    }

    map.fitBounds(bounds, { padding: [40, 40] });
  }
  function fitBounds() {
    if (!clusterGroup || clusterGroup.getLayers().length === 0) return;

    const bounds = clusterGroup.getBounds();
    map.fitBounds(bounds, { padding: [30, 30] });
  }
  function getViewportBounds() {
  if (!map) return null;

  const bounds = map.getBounds();

  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest()
  };
}

function setViewCenter(position, zoom = 13) {
  if (!map || !position) return;

  map.setView([position.lat, position.lng], zoom, {
    animate: true
  });
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
  refreshLayout,
  getViewportBounds,
  setViewCenter,
  setUserLocation,
  clearUserLocation,
  panToPosition,
  fitUserAndEvents,
  destroy
};
}
