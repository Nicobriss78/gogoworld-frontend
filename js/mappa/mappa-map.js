export function createMappaMap({
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
  let userLocationCircle = null;

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
      fitBounds();
    }
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
function fitUserAndEvents(position, options = {}) {
    if (!map) return;

    const lat = Number(position?.lat);
    const lng = Number(position?.lng);
    const hasUserPosition = Number.isFinite(lat) && Number.isFinite(lng);
    const hasEventMarkers =
      clusterGroup && clusterGroup.getLayers().length > 0;

    if (!hasUserPosition && !hasEventMarkers) return;

    if (!hasEventMarkers && hasUserPosition) {
      suppressViewportChanged = true;
      map.setView([lat, lng], Number(options.zoom || 15), {
        animate: true
      });
      return;
    }

    const bounds = clusterGroup.getBounds();

    if (hasUserPosition) {
      bounds.extend([lat, lng]);
    }

    suppressViewportChanged = true;
    map.fitBounds(bounds, {
      padding: Array.isArray(options.padding) ? options.padding : [40, 40],
      maxZoom: Number.isFinite(Number(options.maxZoom))
        ? Number(options.maxZoom)
        : 15
    });
}
  function fitBounds() {
    if (!clusterGroup || clusterGroup.getLayers().length === 0) return;
    if (!map) return;

    const bounds = clusterGroup.getBounds();
    suppressViewportChanged = true;
    map.fitBounds(bounds, { padding: [30, 30] });
  }
  function handleMoveEnd() {
    if (!map) return;

    if (suppressViewportChanged) {
      suppressViewportChanged = false;
      userGestureActive = false;
      return;
    }

    const center = map.getCenter();

    onViewportChanged?.({
      lat: center.lat,
      lng: center.lng,
      zoom: map.getZoom(),
      source: userGestureActive ? "user" : "programmatic"
    });

    userGestureActive = false;
  }

  function setViewCenter(position, zoom = 13) {
    if (!map || !position) return;

    const lat = Number(position.lat);
    const lng = Number(position.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    suppressViewportChanged = true;

    map.setView([lat, lng], zoom, {
      animate: true
    });
  }
  function setUserLocation(position, options = {}) {
    if (!map || !position) return;

    const lat = Number(position.lat);
    const lng = Number(position.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const showCircle = options.showCircle !== false;
    const accuracy =
      Number.isFinite(Number(options.accuracy)) && Number(options.accuracy) > 0
        ? Number(options.accuracy)
        : 150;

    if (!userLocationMarker) {
      userLocationMarker = L.circleMarker([lat, lng], {
        radius: 8,
        weight: 3,
        color: "#ffffff",
        fillColor: "#1d9bf0",
        fillOpacity: 1,
        pane: "markerPane"
      }).addTo(map);
    } else {
      userLocationMarker.setLatLng([lat, lng]);
    }

    if (showCircle) {
      if (!userLocationCircle) {
        userLocationCircle = L.circle([lat, lng], {
          radius: accuracy,
          weight: 1,
          color: "#1d9bf0",
          fillColor: "#1d9bf0",
          fillOpacity: 0.12,
          pane: "overlayPane"
        }).addTo(map);
      } else {
        userLocationCircle.setLatLng([lat, lng]);
        userLocationCircle.setRadius(accuracy);
      }
    } else if (userLocationCircle) {
      map.removeLayer(userLocationCircle);
      userLocationCircle = null;
    }
  }

  function clearUserLocation() {
    if (!map) return;

    if (userLocationMarker) {
      map.removeLayer(userLocationMarker);
      userLocationMarker = null;
    }

    if (userLocationCircle) {
      map.removeLayer(userLocationCircle);
      userLocationCircle = null;
    }
  }
  function getViewportBounds() {
    if (!map) return null;

    const bounds = map.getBounds();
    if (!bounds) return null;

    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest()
    };
  }
  function refreshLayout() {
    if (!map) return;
    map.invalidateSize();
  }
  function destroy() {
    if (map) {
      map.off();
      map.remove();
      map = null;
    }

    clusterGroup = null;
    markersById.clear();
    selectedMarker = null;
    userLocationMarker = null;
    userLocationCircle = null;
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
    setUserLocation,
    clearUserLocation,
    getViewportBounds,
    refreshLayout,
    setViewCenter,
    fitUserAndEvents,
    destroy
  };
}
