export function mountMenu({ mountPoint, shellContext, menuItems, onEvent }) {
  if (!mountPoint) return;

  const visibleItems = shellContext?.visibleMenuItems || [];

  mountPoint.innerHTML = `
    <div class="shared-menu-overlay" data-el="overlay" hidden></div>

    <div class="shared-menu-panel" data-el="panel" hidden>
      ${renderMenuItems(visibleItems)}
    </div>
  `;

  bindMenu(mountPoint, onEvent);
}

function renderMenuItems(items) {
  return items
    .map((item) => {
      const toneClass = item.tone === "danger" ? "shared-menu-item--danger" : "";

      return `
        <button class="shared-menu-item ${toneClass}" data-menu-item="${item.menuItemId}">
          <span class="shared-menu-item__label">${item.label}</span>
        </button>
      `;
    })
    .join("");
}

export function setMenuOpen(root, isOpen) {
  const overlay = root.querySelector('[data-el="overlay"]');
  const panel = root.querySelector('[data-el="panel"]');

  if (!overlay || !panel) return;

  overlay.hidden = !isOpen;
  panel.hidden = !isOpen;
}

function bindMenu(root, onEvent) {
  const overlay = root.querySelector('[data-el="overlay"]');
  const panel = root.querySelector('[data-el="panel"]');

  if (!overlay || !panel) return;

  // click overlay → close menu
  overlay.addEventListener("click", () => {
    emit(onEvent, { type: "menu-close" });
  });

  // prevent click inside panel from closing
  panel.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // menu item click
  root.querySelectorAll("[data-menu-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const menuItemId = btn.getAttribute("data-menu-item");

      emit(onEvent, {
        type: "menu-item",
        menuItemId,
      });
    });
  });

  // ESC key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      emit(onEvent, { type: "menu-close" });
    }
  });
}

function emit(onEvent, payload) {
  if (typeof onEvent === "function") {
    onEvent(payload);
  }
}
