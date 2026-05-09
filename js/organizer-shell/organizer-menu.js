import { organizerMenuSections } from "./organizer-menu-registry.js?v=10";
import { getOrganizerNavItem } from "./organizer-nav-registry.js?v=10";
import { logout, openNotifications } from "./organizer-actions.js?v=10";

let isOpen = false;
let keydownBound = false;

export function renderMenu() {
  const el = document.getElementById("organizer-menu");
  if (!el) return;

  el.innerHTML = `
    <div class="org-menu-overlay" data-org-menu-overlay hidden></div>
    <aside
      class="org-menu-panel"
      id="organizer-menu-panel"
      data-org-menu-panel
      hidden
      aria-label="Menu Organizer"
    >
      ${organizerMenuSections.map(renderSection).join("")}
    </aside>
  `;

  bindMenu(el);
}

export function setOrganizerMenuOpen(nextOpen) {
  isOpen = Boolean(nextOpen);

  const root = document.getElementById("organizer-menu");
  const overlay = root?.querySelector("[data-org-menu-overlay]");
  const panel = root?.querySelector("[data-org-menu-panel]");
  const menuButton = document.querySelector('[data-org-action="menu"]');

  if (!overlay || !panel) return;

  overlay.hidden = !isOpen;
  panel.hidden = !isOpen;
  document.body.classList.toggle("is-org-menu-open", isOpen);

  if (menuButton) {
    menuButton.setAttribute("aria-expanded", String(isOpen));
  }
}

export function toggleOrganizerMenu() {
  setOrganizerMenuOpen(!isOpen);
}

function renderSection(section) {
  return `
    <section class="org-menu-section">
      <h2 class="org-menu-section__title">${section.label}</h2>
      <div class="org-menu-section__items">
        ${section.items.map(renderItem).join("")}
      </div>
    </section>
  `;
}

function renderItem(item) {
  const resolved = item.type === "nav" ? getOrganizerNavItem(item.navId) : null;
  const enabled = item.enabled !== false && (!resolved || resolved.enabled);
  const disabledClass = enabled ? "" : " is-disabled";
  const dangerClass = item.tone === "danger" ? " is-danger" : "";

  return `
    <button
      type="button"
      class="org-menu-item${disabledClass}${dangerClass}"
      data-org-menu-item="${item.id}"
      ${enabled ? "" : 'aria-disabled="true"'}
    >
      <span>${item.label}</span>
    </button>
  `;
}

function bindMenu(root) {
  root.querySelector("[data-org-menu-overlay]")?.addEventListener("click", () => {
    setOrganizerMenuOpen(false);
  });

  root.querySelectorAll("[data-org-menu-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.getAttribute("data-org-menu-item");
      const item = findMenuItem(itemId);

      if (!item || button.getAttribute("aria-disabled") === "true") return;

      setOrganizerMenuOpen(false);

      if (item.type === "nav") {
        const nav = getOrganizerNavItem(item.navId);
        if (nav?.enabled && nav.href) {
          window.location.href = nav.href;
        }
        return;
      }

      if (item.type === "link" && item.href) {
        window.location.href = item.href;
        return;
      }

      if (item.type === "action") {
        runAction(item.action);
      }
    });
  });

  if (!keydownBound) {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        setOrganizerMenuOpen(false);
      }
    });

    keydownBound = true;
  }
}

function findMenuItem(itemId) {
  for (const section of organizerMenuSections) {
    const item = section.items.find((entry) => entry.id === itemId);
    if (item) return item;
  }

  return null;
}

function runAction(action) {
  if (action === "logout") {
    logout();
    return;
  }

  if (action === "notifications") {
    openNotifications();
  }
      }
