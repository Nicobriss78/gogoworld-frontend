export function mountBottomnav({
  mountPoint,
  navItems = [],
  activeNavKey,
  onEvent,
  mode = "standard",
}) {  if (!mountPoint) return;

  if (mode === "hidden") {
    mountPoint.innerHTML = "";
    return;
  }

  mountPoint.innerHTML = `
    <nav class="home-bottomnav" aria-label="Navigazione principale">
      ${navItems.map((item) => renderItem(item, activeNavKey)).join("")}
    </nav>
  `;

  bindBottomnav(mountPoint, onEvent);
}

function renderItem(navKey, href, label, iconId, activeNavKey) {
  const isActive = navKey === activeNavKey;
  const activeClass = isActive ? " is-active active" : "";
  const ariaCurrent = isActive ? ' aria-current="page"' : "";

  return `
    <a
      href="${href}"
      class="gw-iconbtn${activeClass}"
      aria-label="${label}"
      title="${label}"
      data-nav-key="${navKey}"${ariaCurrent}
    >
      <svg class="gw-icon" aria-hidden="true">
        <use href="#gw-icon-${iconId}"></use>
      </svg>
    </a>
  `;
}

function bindBottomnav(root, onEvent) {
  root.querySelectorAll("[data-nav-key]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const navKey = link.getAttribute("data-nav-key");

      if (typeof onEvent === "function") {
        event.preventDefault();
        onEvent({
          type: "nav-item",
          navKey,
        });
      }
    });
  });
}
