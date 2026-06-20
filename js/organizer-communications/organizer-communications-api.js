import { apiGet } from "/js/api.js";

function normalizeNotifications(response) {
  return {
    unread: Number(response?.unreadCount || 0),
    rows: Array.isArray(response?.notifications) ? response.notifications : [],
  };
}

function normalizeRooms(response) {
  return Array.isArray(response?.data) ? response.data : [];
}

function normalizeUnread(response) {
  return Number(response?.unread || response?.data?.unread || 0);
}

export async function fetchOrganizerCommunicationsSummary() {
  const [notificationsRes, roomsUnreadRes, dmUnreadRes, roomsRes] =
    await Promise.allSettled([
      apiGet("/notifications/mine?limit=5"),
      apiGet("/rooms/unread-count"),
      apiGet("/dm/unread-count"),
      apiGet("/rooms/mine?onlyActive=1"),
    ]);

  const notifications =
    notificationsRes.status === "fulfilled"
      ? normalizeNotifications(notificationsRes.value)
      : { unread: 0, rows: [] };

  const roomsUnread =
    roomsUnreadRes.status === "fulfilled"
      ? normalizeUnread(roomsUnreadRes.value)
      : 0;

  const dmUnread =
    dmUnreadRes.status === "fulfilled"
      ? normalizeUnread(dmUnreadRes.value)
      : 0;

  const rooms =
    roomsRes.status === "fulfilled"
      ? normalizeRooms(roomsRes.value)
      : [];

  return {
    notificationsUnread: notifications.unread,
    roomsUnread,
    dmUnread,
    totalUnread: notifications.unread + roomsUnread + dmUnread,
    recentNotifications: notifications.rows.slice(0, 5),
    recentRooms: rooms.slice(0, 5),
  };
}
