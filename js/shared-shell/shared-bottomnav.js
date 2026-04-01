export function mountBottomnav({ mountPoint, activeNavKey, onEvent, mode = "standard" }) {
  if (!mountPoint) return;

  if (mode === "hidden") {
    mountPoint.innerHTML = "";
    return;
  }

  mountPoint.innerHTML = `
    <nav class="home-bottomnav" aria-label="Navigazione principale">
      ${renderItem("map", "/pages/mappa-v2.html", "Mappa", "map", activeNavKey)}
      ${renderItem("following", "/pages/partecipante-seguiti-v2.html", "Eventi seguiti", "calendar", activeNavKey)}
      ${renderItem("home", "/pages/home-v2.html", "Home", "home", activeNavKey)}
      ${renderItem("users", "/pages/seguiti-utenti-v2.html", "Utenti seguiti", "users", activeNavKey)}
      ${renderItem("profile", "/pages/profilo-v2.html", "Profilo", "profile", activeNavKey)}
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
