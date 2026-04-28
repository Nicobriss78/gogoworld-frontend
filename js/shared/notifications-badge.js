let badgeEl = null;
let lastCount = 0;

export function initNotificationsBadge(button) {
  if (!button) return null;

  badgeEl = button.querySelector("[data-notifications-badge]");

  if (!badgeEl) {
    badgeEl = document.createElement("span");
    badgeEl.className = "gw-notifications-badge";
    badgeEl.dataset.notificationsBadge = "true";
    badgeEl.hidden = true;
    button.appendChild(badgeEl);
  }

  return badgeEl;
}

export function setNotificationsBadgeCount(count) {
  if (!badgeEl) return;

  const safeCount = Math.max(0, Number(count) || 0);

  if (safeCount <= 0) {
    badgeEl.hidden = true;
    badgeEl.textContent = "";
    badgeEl.classList.remove("is-pulsing");
    lastCount = 0;
    return;
  }

  badgeEl.hidden = false;
  badgeEl.textContent = safeCount > 99 ? "99+" : String(safeCount);

  if (safeCount > lastCount) {
    badgeEl.classList.remove("is-pulsing");
    void badgeEl.offsetWidth;
    badgeEl.classList.add("is-pulsing");
  }

  lastCount = safeCount;
}

export function clearNotificationsBadge() {
  setNotificationsBadgeCount(0);
}
