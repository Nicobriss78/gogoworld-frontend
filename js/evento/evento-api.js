import {
  apiGet,
  apiPost,
  apiErrorMessage,
} from "../api.js";

function ensureEventId(eventId) {
  const value = String(eventId || "").trim();
  if (!value) {
    throw new Error("EVENT_ID_REQUIRED");
  }
  return value;
}

function unwrapEventResponse(result) {
  if (!result?.ok) {
    throw new Error(apiErrorMessage(result, "Impossibile caricare l'evento"));
  }

  const event = result.event ?? result.data?.event ?? result.data ?? null;
  if (!event || typeof event !== "object") {
    throw new Error("EVENT_PAYLOAD_INVALID");
  }

  return event;
}

function unwrapCurrentUserResponse(result) {
  if (!result?.ok) {
    throw new Error(
      apiErrorMessage(result, "Impossibile recuperare l'utente corrente")
    );
  }

  const user =
    result.user ??
    result.data?.user ??
    result.data ??
    (result._id || result.id ? result : null);

  if (!user || typeof user !== "object") {
    throw new Error("CURRENT_USER_PAYLOAD_INVALID");
  }

  return user;
}

function unwrapRoomResponse(result) {
  if (!result?.ok) {
    throw new Error(apiErrorMessage(result, "Impossibile aprire la chat evento"));
  }

  const roomData = result.data ?? null;
  if (!roomData || typeof roomData !== "object") {
    throw new Error("ROOM_PAYLOAD_INVALID");
  }

  return roomData;
}

export async function getEventById(eventId) {
  const safeEventId = ensureEventId(eventId);
  const result = await apiGet(`/events/${encodeURIComponent(safeEventId)}`);
  return unwrapEventResponse(result);
}

export async function getCurrentUser() {
  const result = await apiGet("/users/me");
  return unwrapCurrentUserResponse(result);
}

export async function joinEvent(eventId) {
  const safeEventId = ensureEventId(eventId);
  const result = await apiPost(`/events/${encodeURIComponent(safeEventId)}/join`, {});
  return unwrapEventResponse(result);
}

export async function leaveEvent(eventId) {
  const safeEventId = ensureEventId(eventId);
  const result = await apiPost(`/events/${encodeURIComponent(safeEventId)}/leave`, {});
  return unwrapEventResponse(result);
}

export async function openOrJoinEventRoom(eventId) {
  const safeEventId = ensureEventId(eventId);
  const result = await apiPost(
    `/rooms/event/${encodeURIComponent(safeEventId)}/open-or-join`,
    {}
  );

  return unwrapRoomResponse(result);
}
export async function getEventReviews(
  eventId,
  { page = 1, limit = 20 } = {}
) {
  const safeEventId = ensureEventId(eventId);

  const params = new URLSearchParams({
    event: safeEventId,
    page: String(page),
    limit: String(limit),
  });

  const result = await apiGet(`/reviews?${params.toString()}`);

  if (!result?.ok) {
    throw new Error(
      apiErrorMessage(result, "Impossibile caricare le recensioni dell'evento")
    );
  }

  return {
    reviews: Array.isArray(result.reviews) ? result.reviews : [],
    total: Number(result.total || 0),
    page: Number(result.page || page),
    limit: Number(result.limit || limit),
  };
}
