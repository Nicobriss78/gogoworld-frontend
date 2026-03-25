import {
  apiGet,
  apiPost
} from "/js/api.js";
export function createMappaApi({ fetchImpl } = {}) {

  /* ===============================
     EVENTI PUBBLICI (MAPPA)
     =============================== */

  async function fetchPublicMapEvents() {
  try {
    const res = await apiGet("/events?visibility=public");

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
