import { organizerNav } from "./organizer-nav-registry.js?v=4";

function getCurrentViewId() {
  const path = window.location.pathname;

  if (path.includes("organizer-events-v2")) return "events";
  return "dashboard";
}

export function renderBottomnav() {
  const el = document.getElementById("organizer-bottomnav");
  if (!el) return;

  const currentViewId = getCurrentViewId();

  el.innerHTML = `
    <div class="org-bottomnav">
      ${organizerNav
        .map((item) => {
          const activeClass = item.id === currentViewId ? "active" : "";
          const disabledAttr = item.enabled ? "" : "disabled";

          if (!item.enabled) {
            return `<button class="${activeClass}" ${disabledAttr}>${item.label}</button>`;
          }

          return `
            <a class="${activeClass}" href="${item.href}">
              ${item.label}
            </a>
          `;
        })
        .join("")}
    </div>
  `;
}
