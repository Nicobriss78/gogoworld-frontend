export function mountBottomnav({ mountPoint, navItems, activeNavKey, onEvent, mode = "standard" }) {
  if (!mountPoint) return;

  if (mode === "hidden") {
    mountPoint.innerHTML = "";
    return;
  }

  const items = Array.isArray(navItems) ? navItems : [];

  mountPoint.innerHTML = `
    <nav class="shared-bottomnav" aria-label="Navigazione principale partecipante">
      ${items.map((item) => renderNavItem(item, activeNavKey)).join("")}
    </nav>
  `;

  bindBottomnav(mountPoint, onEvent);
}

function renderNavItem(item, activeNavKey) {
  const isActive = item.navKey === activeNavKey;
  const activeClass = isActive ? " is-active" : "";

  return `
    <button
      class="shared-bottomnav__item${activeClass}"
      data-nav-key="${item.navKey}"
      aria-current="${isActive ? "page" : "false"}"
      type="button"
    >
      <svg class="shared-bottomnav__icon" aria-hidden="true">
        <use href="/icons/icons-sprite.v2.svg#gw-icon-${item.icon}"></use>
      </svg>
      <span class="shared-bottomnav__label">${item.label}</span>
    </button>
  `;
}

function bindBottomnav(root, onEvent) {
  root.querySelectorAll("[data-nav-key]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const navKey = btn.getAttribute("data-nav-key");

      if (typeof onEvent === "function") {
        onEvent({
          type: "nav-item",
          navKey,
        });
      }
    });
  });
}
