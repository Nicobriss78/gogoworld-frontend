export async function loadBadges() {
  const badges = {
    messages: 0,
    notifications: 0,
  };

  applyBadge("messages", badges.messages);
  applyBadge("notifications", badges.notifications);

  return badges;
}

function applyBadge(key, value) {
  const badge = document.querySelector(`[data-org-badge="${key}"]`);
  if (!badge) return;

  const count = Number(value || 0);

  if (count <= 0) {
    badge.hidden = true;
    badge.textContent = "";
    return;
  }

  badge.hidden = false;
  badge.textContent = count > 99 ? "99+" : String(count);
}
