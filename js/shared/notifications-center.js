import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notifications-api.js";

import {
  initNotificationsBadge,
  setNotificationsBadgeCount,
  clearNotificationsBadge,
} from "./notifications-badge.js";

let rootEl = null;
let panelEl = null;
let listEl = null;
let statusEl = null;
let triggerButton = null;
let isOpen = false;
let notificationsCache = [];

const CATEGORY_LABELS = {
  all: "Tutte",
  messages: "Messaggi",
  events: "Eventi",
  following: "Seguiti",
  system: "Sistema",
};

let activeCategory = "all";

export function initNotificationsCenter({ button } = {}) {
  triggerButton = button || null;

  if (triggerButton) {
    initNotificationsBadge(triggerButton);
  }

  ensurePanel();
  void refreshNotifications();

  return {
    open: openNotificationsCenter,
    close: closeNotificationsCenter,
    toggle: toggleNotificationsCenter,
    refresh: refreshNotifications,
  };
}

export async function refreshNotifications() {
  try {
    const result = await getMyNotifications({ limit: 50 });

    if (!result || result.ok === false) {
      setStatus("Non è stato possibile caricare le notifiche.");
      return;
    }

    notificationsCache = Array.isArray(result.notifications)
      ? result.notifications
      : [];

    setNotificationsBadgeCount(result.unreadCount || 0);
    renderNotifications();
  } catch (err) {
    console.warn("[notifications-center] refresh failed", err);
    setStatus("Non è stato possibile caricare le notifiche.");
  }
}

export async function openNotificationsCenter() {
  ensurePanel();

  isOpen = true;
  rootEl.hidden = false;
  rootEl.setAttribute("aria-hidden", "false");
  triggerButton?.setAttribute("aria-expanded", "true");

  document.documentElement.classList.add("gw-notifications-open");

  await refreshNotifications();
}

export function closeNotificationsCenter() {
  if (!rootEl) return;

  isOpen = false;
  rootEl.hidden = true;
  rootEl.setAttribute("aria-hidden", "true");
  triggerButton?.setAttribute("aria-expanded", "false");

  document.documentElement.classList.remove("gw-notifications-open");
}

export function toggleNotificationsCenter() {
  if (isOpen) {
    closeNotificationsCenter();
  } else {
    void openNotificationsCenter();
  }
}

function ensurePanel() {
  if (rootEl) return;

  rootEl = document.createElement("div");
  rootEl.className = "gw-notifications";
  rootEl.hidden = true;
  rootEl.setAttribute("aria-hidden", "true");

  rootEl.innerHTML = `
    <div class="gw-notifications__backdrop" data-action="close-notifications"></div>

    <section
      class="gw-notifications__panel"
      role="dialog"
      aria-modal="false"
      aria-label="Centro notifiche"
    >
      <header class="gw-notifications__header">
        <div>
          <p class="gw-notifications__eyebrow">Centro</p>
          <h2 class="gw-notifications__title">Notifiche</h2>
        </div>

        <button
          class="gw-notifications__close"
          type="button"
          data-action="close-notifications"
          aria-label="Chiudi notifiche"
          title="Chiudi"
        >
          ×
        </button>
      </header>

      <nav class="gw-notifications__tabs" aria-label="Filtra notifiche">
        ${Object.entries(CATEGORY_LABELS)
          .map(
            ([key, label]) => `
              <button
                class="gw-notifications__tab${key === activeCategory ? " is-active" : ""}"
                type="button"
                data-notification-category="${key}"
              >
                ${label}
              </button>
            `
          )
          .join("")}
      </nav>

      <div class="gw-notifications__status" data-el="status" aria-live="polite"></div>
      <div class="gw-notifications__list" data-el="list"></div>
    </section>
  `;

  document.body.appendChild(rootEl);

  panelEl = rootEl.querySelector(".gw-notifications__panel");
  listEl = rootEl.querySelector('[data-el="list"]');
  statusEl = rootEl.querySelector('[data-el="status"]');

  rootEl.addEventListener("click", handleRootClick);
  document.addEventListener("keydown", handleKeydown);
}

function handleRootClick(event) {
  const closeBtn = event.target.closest('[data-action="close-notifications"]');
  if (closeBtn) {
    closeNotificationsCenter();
    return;
  }

  const tab = event.target.closest("[data-notification-category]");
  if (tab) {
    activeCategory = tab.dataset.notificationCategory || "all";
    renderTabs();
    renderNotifications();
    return;
  }

  const item = event.target.closest("[data-notification-id]");
  if (item) {
  const id = item.dataset.notificationId;
  const notification = notificationsCache.find(
    (n) => String(n._id) === String(id)
  );

  if (notification) {
    void handleNotificationClick(notification, item);
  }
 }
}

function handleKeydown(event) {
  if (event.key === "Escape" && isOpen) {
    closeNotificationsCenter();
  }
}

function renderTabs() {
  rootEl.querySelectorAll("[data-notification-category]").forEach((tab) => {
    tab.classList.toggle(
      "is-active",
      tab.dataset.notificationCategory === activeCategory
    );
  });
}

function renderNotifications() {
  if (!listEl) return;

  const items = notificationsCache
    .filter((notification) => matchesCategory(notification, activeCategory))
    .sort(sortNotificationsByPriority);

  if (!items.length) {
    listEl.innerHTML = `
      <div class="gw-notifications__empty">
        <h3>Nessuna notifica 👀</h3>
        <p>Quando succederà qualcosa di interessante, lo troverai qui.</p>
      </div>
    `;
    setStatus("");
    return;
  }

  setStatus("");

  listEl.innerHTML = items.map(renderNotificationItem).join("");
}
function getNotificationData(notification) {
  return notification?.data && typeof notification.data === "object"
    ? notification.data
    : {};
}

function getNotificationWeight(notification) {
  const data = getNotificationData(notification);
  const weight = Number(data.notificationWeight || 0);

  return Number.isFinite(weight) ? weight : 0;
}

function isPinnedNotification(notification) {
  const data = getNotificationData(notification);
  return data.pinned === true;
}

function sortNotificationsByPriority(a, b) {
  const pinnedDiff =
    Number(isPinnedNotification(b)) - Number(isPinnedNotification(a));

  if (pinnedDiff !== 0) return pinnedDiff;

  const weightDiff = getNotificationWeight(b) - getNotificationWeight(a);
  if (weightDiff !== 0) return weightDiff;

  return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
}

function getVisualTone(notification) {
  const data = getNotificationData(notification);
  const tone = String(data.visualTone || "standard").trim().toLowerCase();

  if (["standard", "highlight", "urgent", "final_call"].includes(tone)) {
    return tone;
  }

  return "standard";
}

function getPriorityLabel(notification) {
  const data = getNotificationData(notification);
  return String(data.priorityLabel || "").trim();
}
function renderNotificationItem(notification) {
  const id = String(notification._id || "");
  const title = escapeHtml(notification.title || "Notifica");
  const message = escapeHtml(notification.message || "");
  const time = formatTime(notification.createdAt);
  const type = escapeHtml(notification.type || "system");
    const unreadClass = notification.isRead ? "" : " is-unread";
  const visualTone = escapeHtml(getVisualTone(notification));
  const pinnedClass = isPinnedNotification(notification) ? " is-pinned" : "";
  const priorityLabel = escapeHtml(getPriorityLabel(notification));

  return `
    <article
      class="gw-notifications__item${unreadClass}${pinnedClass} gw-notifications__item--${visualTone}"
      data-notification-id="${id}"
      data-notification-type="${type}"
      tabindex="0"
    >
      <div class="gw-notifications__icon" aria-hidden="true">
        ${iconForType(notification.type)}
      </div>

      <div class="gw-notifications__body">
                <div class="gw-notifications__item-title-row">
          <h3 class="gw-notifications__item-title">${title}</h3>
          ${
            priorityLabel
              ? `<span class="gw-notifications__priority">${priorityLabel}</span>`
              : ""
          }
        </div>
        ${message ? `<p class="gw-notifications__item-message">${message}</p>` : ""}
        <p class="gw-notifications__item-time">${time}</p>
      </div>

      ${notification.isRead ? "" : `<span class="gw-notifications__dot" aria-hidden="true"></span>`}
    </article>
  `;
}

async function handleNotificationClick(notification, element) {
  const id = notification._id;
  const link = resolveNotificationLink(notification);

  if (element) {
    element.classList.add("is-pressed");
  }

  try {
    if (id && !notification.isRead) {
  await markNotificationRead(id);

  // 🔹 aggiorno stato locale (senza reload)
  notification.isRead = true;

  // 🔹 aggiorno badge (conteggio non lette)
  const unreadCount = notificationsCache.filter(
    (n) => !n.isRead
  ).length;

  setNotificationsBadgeCount(unreadCount);
}
  } catch (err) {
    console.warn("[notifications-center] mark read failed", err);
  }

  setTimeout(() => {
    closeNotificationsCenter();
    if (link) {
      window.location.href = link;
    }
  }, 120);
}

function matchesCategory(notification, category) {
  if (category === "all") return true;

  const type = notification.type || "";

  if (category === "messages") {
    return type === "dm_message" || type === "room_message";
  }

  if (category === "events") {
    return [
      "event_created",
      "event_approved",
      "follow_new_event",
      "event_joined",
      "event_checkin",
      "event_updated",
      "event_cancelled",
      "review_received",
      "review_available",
      "organizer_event_activity",
    ].includes(type);
  }

  if (category === "following") {
    return type === "follow" || type === "follow_activity";
  }

  if (category === "system") {
    return type === "system";
  }

  return true;
}

function resolveNotificationLink(notification) {
  const data = notification.data || {};

  if (typeof data.link === "string" && data.link.trim()) {
    return data.link.trim();
  }

  if (notification.event?._id) {
    return `/pages/evento-v2.html?id=${notification.event._id}`;
  }

  return "";
}

function iconForType(type) {
  if (type === "dm_message" || type === "room_message") {
    return `<svg class="gw-icon"><use href="#gw-icon-chat"></use></svg>`;
  }

  if (type === "follow" || type === "follow_activity") {
    return `<svg class="gw-icon"><use href="#gw-icon-users"></use></svg>`;
  }

  if (String(type || "").includes("event") || String(type || "").includes("review")) {
    return `<svg class="gw-icon"><use href="#gw-icon-calendar"></use></svg>`;
  }

  return `<svg class="gw-icon"><use href="#gw-icon-bell"></use></svg>`;
}

function setStatus(message) {
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.hidden = !message;
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Adesso";
  if (diffMin < 60) return `${diffMin} min fa`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ore fa`;

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 1) return "Ieri";
  if (diffDays < 7) return `${diffDays} giorni fa`;

  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
      }
