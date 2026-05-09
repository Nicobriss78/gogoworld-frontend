import { getOrganizerNavItem } from "./organizer-nav-registry.js?v=9";

export function navigate(navId) {
  const item = getOrganizerNavItem(navId);

  if (!item || !item.enabled || !item.href) {
    return false;
  }

  window.location.href = item.href;
  return true;
}
