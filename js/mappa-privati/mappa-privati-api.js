import {
  apiGet,
  apiPost
} from "/js/api.js";
export function createMappaApi({ fetchImpl } = {}) {

  /* ===============================
     EVENTI PUBBLICI (MAPPA)
     =============================== */

  async function fetchPrivateMapEvents(options = {}) {
    try {
      const query = buildPrivateMapEventsQuery(options);
      const res = await apiGet(`/events/private?${query.toString()}`);

      if (!res.ok) return [];

      const rawEvents = Array.isArray(res.events) ? res.events : [];

      return rawEvents
        .map(normalizeEventForMap)
        .filter(isValidMapEvent);
    } catch {
      throw new Error("MAPPA_API_FETCH_EVENTS_ERROR");
    }
  }

  /* ===============================
     EVENTO SINGOLO
     =============================== */

  async function fetchEventDetail(eventId) {
  if (!eventId) return null;

  try {
    const res = await apiGet(`/events/${eventId}`);
    if (!res.ok) return null;

    const ev = normalizeEventForMap(res.data);

    return ev?.id ? ev : null;
  } catch {
    return null;
  }
}
async function unlockPrivateEventByCode(code) {
    const cleanCode = String(code || "").trim();

    if (!cleanCode) {
      throw new Error("PRIVATE_EVENT_CODE_REQUIRED");
    }

    try {
      const res = await apiPost(`/events/private/unlock`, { code: cleanCode });

      if (!res.ok) {
        const error = new Error("PRIVATE_EVENT_UNLOCK_ERROR");
        error.response = res;
        throw error;
      }

      return res;
    } catch (error) {
      if (error?.response) {
        throw error;
      }

      const fallback = new Error("PRIVATE_EVENT_UNLOCK_ERROR");
      throw fallback;
    }
}
  /* ===============================
     CHAT
     =============================== */

  async function openEventRoom(eventId) {
  try {
    const res = await apiPost(`/rooms/event/${eventId}/open-or-join`);

    if (!res.ok) {
      throw new Error("MAPPA_API_OPEN_ROOM_ERROR");
    }

    const room = res.data || {};

    return {
      roomId: room.roomId,
      title: room.title || "",
      canSend: Boolean(room.canSend),
      locked: Boolean(room.locked),
      activeFrom: room.activeFrom || null,
      activeUntil: room.activeUntil || null
    };
  } catch {
    throw new Error("MAPPA_API_OPEN_ROOM_ERROR");
  }
}

  async function fetchRoomMessages(roomId) {
  try {
    const res = await apiGet(`/rooms/${roomId}/messages`);
    if (!res.ok) return [];

    const messages = Array.isArray(res.data) ? res.data : [];

    return messages.map(normalizeMessage).filter(Boolean);
  } catch {
    return [];
  }
}

  async function sendRoomMessage(roomId, text) {
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    throw new Error("EMPTY_MESSAGE");
  }

  try {
    const res = await apiPost(`/rooms/${roomId}/messages`, { text: cleanText });

    if (!res.ok) {
      throw new Error("SEND_MESSAGE_ERROR");
    }

    return normalizeMessage(res.data);
  } catch {
    throw new Error("SEND_MESSAGE_ERROR");
  }
}

  async function markRoomRead(roomId) {
  try {
    await apiPost(`/rooms/${roomId}/read`, {});
  } catch {
    // silenzioso
  }
}
function buildPrivateMapEventsQuery(options = {}) {
    const params = new URLSearchParams();
    params.set("visibility", "private");

    const lat = Number(options.lat);
    const lng = Number(options.lng);
    const radius = Number(options.radius);

    const north = Number(options.north);
    const south = Number(options.south);
    const east = Number(options.east);
    const west = Number(options.west);

    const hasRadiusGeo =
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Number.isFinite(radius);

    const hasBoundsGeo =
      Number.isFinite(north) &&
      Number.isFinite(south) &&
      Number.isFinite(east) &&
      Number.isFinite(west);

    if (hasBoundsGeo) {
      params.set("north", String(north));
      params.set("south", String(south));
      params.set("east", String(east));
      params.set("west", String(west));
      return params;
    }

    if (hasRadiusGeo) {
      params.set("lat", String(lat));
      params.set("lng", String(lng));
      params.set("radius", String(radius));
    }

    return params;
}
  /* ===============================
     NORMALIZZAZIONE EVENTI
     =============================== */

  function normalizeEventForMap(ev) {
    if (!ev) return null;

    return {
      id: ev._id || ev.id || null,
      title: ev.title || "",
      status: ev.status || "future",

      startAt: ev.dateStart || ev.date || null,
      endAt: ev.dateEnd || ev.endDate || null,

      city: ev.city || "",
      region: ev.region || "",
      country: ev.country || "",

      category: ev.category || "",
      subcategory: ev.subcategory || "",

      language: ev.language || "",
      target: ev.target || "",

      price: ev.price || "",

      lat: extractLat(ev),
      lon: extractLon(ev)
    };
  }

  function extractLat(ev) {
    return (
      ev.lat ??
      ev.location?.coordinates?.lat ??
      null
    );
  }

  function extractLon(ev) {
    return (
      ev.lon ??
      ev.location?.coordinates?.lon ??
      null
    );
  }

  function isValidMapEvent(ev) {
    return (
      ev &&
      ev.id &&
      typeof ev.lat === "number" &&
      typeof ev.lon === "number" &&
      ev.status !== "past"
    );
  }

  /* ===============================
     NORMALIZZAZIONE MESSAGGI
     =============================== */

  function normalizeMessage(msg) {
    if (!msg) return null;

    return {
      id: msg._id || msg.id,
      text: msg.text || "",
      userId: msg.userId || msg.user || null,
      createdAt: msg.createdAt || msg.date || null
    };
  }


  /* ===============================
     EXPORT
     =============================== */

  return {
    fetchPublicMapEvents,
    fetchEventDetail,
    openEventRoom,
    fetchRoomMessages,
    sendRoomMessage,
    markRoomRead
  };
}
