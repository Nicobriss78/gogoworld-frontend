import { apiGet, apiPost } from "/js/api.js";

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function compareMessagesByCreatedAtAsc(a, b) {
  const aTime = new Date(a?.createdAt || 0).getTime();
  const bTime = new Date(b?.createdAt || 0).getTime();

  return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
}
function computeEventThreadStatus(activeUntil) {
  const until = activeUntil ? new Date(activeUntil) : null;
  if (!until || Number.isNaN(until.getTime())) {
    return "active";
  }

  const now = Date.now();
  const untilMs = until.getTime();

  if (untilMs <= now) {
    return "closed";
  }

  const diffMs = untilMs - now;
  const oneDayMs = 24 * 60 * 60 * 1000;

  if (diffMs <= oneDayMs) {
    return "closing";
  }

  return "active";
}

function normalizeEventThreadItem(item) {
  if (!item || item.type !== "event") return null;

  const roomId = String(item._id || "");
  const eventId = String(item.event?._id || item.event?.id || "");
  const title = item.event?.title || item.title || "Chat evento";
  const activeUntil = normalizeDate(item.activeUntil);
  const activeFrom = normalizeDate(item.activeFrom);

  return {
    roomId,
    eventId,
    title,
    imageUrl: null,
    lastMessageText: "",
    lastMessageAt: normalizeDate(item.lastAt),
    unread: Number(item.unread || 0),
    canSend: computeEventThreadStatus(activeUntil) !== "closed",
    locked: false,
    activeFrom,
    activeUntil,
    status: computeEventThreadStatus(activeUntil),
    raw: item,
  };
}

function normalizeEventRoomMeta(room) {
  if (!room || typeof room !== "object") {
    return {
      roomId: "",
      title: "Chat evento",
      canSend: false,
      locked: false,
      activeFrom: null,
      activeUntil: null,
      status: "closed",
    };
  }

  const activeUntil = normalizeDate(room.activeUntil);
  const activeFrom = normalizeDate(room.activeFrom);

  return {
    roomId: String(room.roomId || ""),
    title: room.title || "Chat evento",
    canSend: Boolean(room.canSend),
    locked: Boolean(room.locked),
    activeFrom,
    activeUntil,
    status: computeEventThreadStatus(activeUntil),
  };
}

function normalizeEventMessage(message) {
  if (!message) return null;

  return {
    id: String(message.id || message._id || ""),
    text: String(message.text || ""),
    createdAt: normalizeDate(message.createdAt),
    sender: message.sender === "me" ? "me" : "them",
    userId: String(message.author?._id || message.author?.id || ""),
    userName:
      message.author?.name ||
      message.author?.nickname ||
      null,
    avatarUrl: message.author?.avatarUrl || null,
    readAt: null,
    raw: message,
  };
}

function normalizeDmThreadItem(item) {
  if (!item) return null;

  const userId = String(item.user?.id || "");
  const title =
    item.user?.nickname ||
    item.user?.name ||
    userId ||
    "Conversazione";

  return {
    userId,
    title,
    avatarUrl: item.user?.avatarUrl || null,
    lastMessageText: String(item.last?.text || ""),
    lastMessageAt: normalizeDate(item.last?.createdAt),
    lastMessageSender:
      item.last?.sender === "me" || item.last?.sender === "them"
        ? item.last.sender
        : null,
    unread: Number(item.unread || 0),
    raw: item,
  };
}

function normalizeDmMessage(message) {
  if (!message) return null;

  return {
    id: String(message.id || message._id || ""),
    text: String(message.text || ""),
    createdAt: normalizeDate(message.createdAt),
    sender: message.sender === "me" ? "me" : "them",
    readAt: normalizeDate(message.readAt),
    raw: message,
  };
}

function normalizeUnreadSummaryRows(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const byRoomId = {};

  for (const row of safeRows) {
    const roomId = String(row?._id || "");
    if (!roomId) continue;
    byRoomId[roomId] = Number(row?.unread || 0);
  }

  return { byRoomId };
}

export function createMessagesApi() {
  return {
    events: {
      async listThreads() {
        const res = await apiGet("/rooms/mine");
        if (!res?.ok) return [];

        const rows = Array.isArray(res.data) ? res.data : [];
        return rows
          .map(normalizeEventThreadItem)
          .filter(Boolean);
      },

      async openThreadByEvent(eventId) {
        if (!eventId) {
          throw new Error("MESSAGES_API_INVALID_EVENT_ID");
        }

        const res = await apiPost(`/rooms/event/${encodeURIComponent(String(eventId))}/open-or-join`, {});
        if (!res?.ok) {
          throw new Error("MESSAGES_API_OPEN_EVENT_THREAD_ERROR");
        }

        return normalizeEventRoomMeta(res.data);
      },

      async getThreadMeta(eventId) {
        if (!eventId) {
          throw new Error("MESSAGES_API_INVALID_EVENT_ID");
        }

        const res = await apiGet(`/rooms/event/${encodeURIComponent(String(eventId))}`);
        if (!res?.ok) {
          throw new Error("MESSAGES_API_GET_EVENT_META_ERROR");
        }

        return normalizeEventRoomMeta(res.data);
      },

      async getMessages(roomId, options = {}) {
        if (!roomId) return [];

        const query = new URLSearchParams();

        if (options.after) {
          query.set("after", options.after);
        }

        if (options.limit) {
          query.set("limit", String(options.limit));
        }

        const qs = query.toString() ? `?${query.toString()}` : "";
        const res = await apiGet(`/rooms/${encodeURIComponent(String(roomId))}/messages${qs}`);
        if (!res?.ok) return [];

        const rows = Array.isArray(res.data) ? res.data : [];
        return rows
  .map(normalizeEventMessage)
  .filter(Boolean)
  .sort(compareMessagesByCreatedAtAsc);
      },

      async sendMessage(roomId, text) {
        const cleanText = String(text || "").trim();
        if (!roomId || !cleanText) {
          throw new Error("MESSAGES_API_INVALID_EVENT_MESSAGE");
        }

        const res = await apiPost(`/rooms/${encodeURIComponent(String(roomId))}/messages`, {
          text: cleanText,
        });

        if (!res?.ok) {
          throw new Error("MESSAGES_API_SEND_EVENT_MESSAGE_ERROR");
        }

        return normalizeEventMessage(res.data);
      },

      async markRead(roomId, upTo = null) {
        if (!roomId) return false;

        const payload = upTo ? { upTo } : {};
        const res = await apiPost(`/rooms/${encodeURIComponent(String(roomId))}/read`, payload);
        return Boolean(res?.ok);
      },

      async getUnreadSummary() {
        const res = await apiGet("/rooms/unread-summary");
        if (!res?.ok) {
          return { byRoomId: {} };
        }

        return normalizeUnreadSummaryRows(res.data);
      },
    },

    dm: {
      async listThreads() {
        const res = await apiGet("/dm/threads");
        if (!res?.ok) return [];

        const rows = Array.isArray(res.data) ? res.data : [];
        return rows
          .map(normalizeDmThreadItem)
          .filter(Boolean);
      },

      async getMessages(userId, options = {}) {
        if (!userId) return [];

        const query = new URLSearchParams();

        if (options.after) {
          query.set("after", options.after);
        }

        if (options.limit) {
          query.set("limit", String(options.limit));
        }

        const qs = query.toString() ? `?${query.toString()}` : "";
        const res = await apiGet(`/dm/threads/${encodeURIComponent(String(userId))}/messages${qs}`);
        if (!res?.ok) return [];

        const rows = Array.isArray(res.data) ? res.data : [];
        return rows
  .map(normalizeDmMessage)
  .filter(Boolean)
  .sort(compareMessagesByCreatedAtAsc);
      },

      async sendMessage(userId, text) {
        const cleanText = String(text || "").trim();
        if (!userId || !cleanText) {
          throw new Error("MESSAGES_API_INVALID_DM_MESSAGE");
        }

        const res = await apiPost("/dm/messages", {
          recipientId: String(userId),
          text: cleanText,
        });

        if (!res?.ok) {
          throw new Error("MESSAGES_API_SEND_DM_MESSAGE_ERROR");
        }

        return {
          id: String(res.data?.id || ""),
          text: String(res.data?.text || cleanText),
          createdAt: normalizeDate(res.data?.createdAt),
          sender: "me",
          readAt: null,
          raw: res.data,
        };
      },

      async markRead(userId, upTo = null) {
        if (!userId) return false;

        const payload = upTo ? { upTo } : {};
        const res = await apiPost(`/dm/threads/${encodeURIComponent(String(userId))}/read`, payload);
        return Boolean(res?.ok);
      },

      async getUnreadCount() {
        const res = await apiGet("/dm/unread-count");
        if (!res?.ok) {
          return { total: 0 };
        }

        return {
          total: Number(res.unread ?? res.data?.unread ?? 0),
        };
      },
    },
  };
}
