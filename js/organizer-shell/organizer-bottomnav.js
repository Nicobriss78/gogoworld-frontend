import { organizerNav } from "./organizer-nav-registry.js?v=10";

function getCurrentViewId() {
  return document.body?.dataset?.organizerView || "dashboard";
}

export function renderBottomnav() {
  const el = document.getElementById("organizer-bottomnav");
  if (!el) return;

  const currentViewId = getCurrentViewId();

  el.innerHTML = `
    <nav class="home-bottomnav org-bottomnav" aria-label="Navigazione Organizer">
      ${organizerNav.map((item) => renderItem(item, currentViewId)).join("")}
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
      window.location.href = item.href;
    });
  });
}

function renderItem(item, currentViewId) {
  const isActive = item.id === currentViewId;
  const activeClass = isActive ? " is-active active" : "";
  const disabledClass = item.enabled ? "" : " is-disabled";
  const ariaCurrent = isActive ? ' aria-current="page"' : "";
  const ariaDisabled = item.enabled ? "" : ' aria-disabled="true"';

  return `
    <a
      href="${item.enabled ? item.href : "#"}"
      class="gw-iconbtn${activeClass}${disabledClass}"
      aria-label="${item.label}"
      title="${item.label}"
      data-org-nav="${item.id}"${ariaCurrent}${ariaDisabled}
    >
      <svg class="gw-icon" aria-hidden="true">
        <use href="#gw-icon-${item.icon}"></use>
      </svg>
    </a>
  `;
}
