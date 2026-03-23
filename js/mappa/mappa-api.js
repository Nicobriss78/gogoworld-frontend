export function createMappaApi({ fetchImpl } = {}) {
  const fetcher = fetchImpl || fetch;

  /* ===============================
     EVENTI PUBBLICI (MAPPA)
     =============================== */

  async function fetchPublicMapEvents() {
    try {
      const res = await fetcher("/api/events?visibility=public");
      const data = await handleResponse(res);
const rawEvents = Array.isArray(data?.events) ? data.events : [];

return rawEvents
  .map(normalizeEventForMap)
  .filter(isValidMapEvent);

    } catch (err) {
      throw new Error("MAPPA_API_FETCH_EVENTS_ERROR");
    }
  }

  /* ===============================
     EVENTO SINGOLO
     =============================== */

  async function fetchEventDetail(eventId) {
    if (!eventId) return null;

    try {
      const res = await fetcher(`/api/events/${eventId}`);
      const data = await handleResponse(res);

      const ev = normalizeEventForMap(data);

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
      const res = await fetcher(`/api/rooms/event/${eventId}/open-or-join`, {
        method: "POST"
      });

      const data = await handleResponse(res);

      return {
        roomId: data.roomId,
        title: data.title || "",
        canSend: Boolean(data.canSend),
        locked: Boolean(data.locked),
        activeFrom: data.activeFrom || null,
        activeUntil: data.activeUntil || null
      };

    } catch {
      throw new Error("MAPPA_API_OPEN_ROOM_ERROR");
    }
  }

  async function fetchRoomMessages(roomId) {
    try {
      const res = await fetcher(`/api/rooms/${roomId}/messages`);
      const data = await handleResponse(res);

      if (!Array.isArray(data)) return [];

      return data.map(normalizeMessage);

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
      const res = await fetcher(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ text: cleanText })
      });

      const data = await handleResponse(res);

      return normalizeMessage(data);

    } catch {
      throw new Error("SEND_MESSAGE_ERROR");
    }
  }

  async function markRoomRead(roomId) {
    try {
      await fetcher(`/api/rooms/${roomId}/read`, {
        method: "POST"
      });
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
     HELPER
     =============================== */

  async function handleResponse(res) {
    if (!res.ok) {
      throw new Error("API_ERROR");
    }

    return res.json();
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
