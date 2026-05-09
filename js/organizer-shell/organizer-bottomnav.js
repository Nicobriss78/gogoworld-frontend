import { organizerNav } from "./organizer-nav-registry.js?v=9";
import { navigate } from "./organizer-router.js?v=9";

function getCurrentViewId() {
  return document.body?.dataset?.organizerView || "dashboard";
}

export function renderBottomnav() {
  const el = document.getElementById("organizer-bottomnav");
  if (!el) return;

  const currentViewId = getCurrentViewId();

  el.innerHTML = `
    <nav class="org-bottomnav" aria-label="Navigazione Organizer">
      ${organizerNav.map((item) => renderNavItem(item, currentViewId)).join("")}
    </nav>
  `;

  el.querySelectorAll("[data-org-nav]").forEach((node) => {
    node.addEventListener("click", (event) => {
      const navId = node.getAttribute("data-org-nav");
      const item = organizerNav.find((entry) => entry.id === navId);

      if (!item?.enabled) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      navigate(navId);
    });
  });
}

function renderNavItem(item, currentViewId) {
  const isActive = item.id === currentViewId;
  const activeClass = isActive ? " is-active" : "";
  const disabledClass = item.enabled ? "" : " is-disabled";
  const ariaCurrent = isActive ? ' aria-current="page"' : "";
  const ariaDisabled = item.enabled ? "" : ' aria-disabled="true"';

  return `
    <a
      href="${item.enabled ? item.href : "#"}"
      class="org-bottomnav__item gw-iconbtn${activeClass}${disabledClass}"
      data-org-nav="${item.id}"
      aria-label="${item.label}"
      title="${item.label}"${ariaCurrent}${ariaDisabled}
    >
      <svg class="gw-icon" aria-hidden="true">
        <use href="#gw-icon-${item.icon}"></use>
      </svg>
      <span class="org-bottomnav__label">${item.label}</span>
    </a>
  `;
}
