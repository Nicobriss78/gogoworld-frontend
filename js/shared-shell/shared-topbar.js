import {
  resolveUserIdentity,
  applyUserIdentityToTopbar,
} from "../shared/user-identity.js";
export function mountTopbar({ mountPoint, viewConfig, shellContext, onEvent }) {
  if (!mountPoint) return;

  mountPoint.innerHTML = `
    <header class="shared-topbar">
      <div class="shared-topbar__row shared-topbar__row--identity">
        <div class="shared-topbar__identity">
          <div class="shared-topbar__greeting" data-el="greeting"></div>
          <div class="shared-topbar__role" data-el="role"></div>
        </div>
        <div class="shared-topbar__brand">GoGoWorld.life</div>
      </div>

      <div class="shared-topbar__row shared-topbar__row--actions">
        ${renderActionButtons(shellContext)}
      </div>
    </header>
  `;

  bindTopbar(mountPoint, shellContext, onEvent);
  applyIdentity(mountPoint);
}

function renderActionButtons(shellContext) {
  const flags = shellContext?.flags || {};

  return `
    ${flags.showSearchEntry ? button("search", "search") : ""}
    ${flags.showMapShortcut ? button("map", "map") : ""}
    ${flags.showMessagesEntry ? button("messages", "chat") : ""}
    ${flags.supportsNotifications ? button("notifications", "bell") : ""}
    ${button("menu", "menu")}
  `;
}

function button(action, icon) {
  return `
    <button class="shared-topbar__btn" data-action="${action}">
      <svg><use href="/icons/icons-sprite-v2.svg#gw-icon-${icon}"></use></svg>
    </button>
  `;
}

function bindTopbar(root, shellContext, onEvent) {
  root.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");

      if (typeof onEvent === "function") {
        onEvent({
          type: "topbar-action",
          action,
        });
      }
    });
  });
}

function applyIdentity(root) {
  const identity = resolveUserIdentity();

  applyUserIdentityToTopbar({
    greetingEl: root.querySelector('[data-el="greeting"]'),
    roleEl: root.querySelector('[data-el="role"]'),
    identity,
  });
}
