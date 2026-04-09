function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildUserCard(user) {
  const avatarHtml = user.avatar
    ? `<img src="${escapeHtml(user.avatar)}" alt="" class="cerca-utenti-avatar" />`
    : `<span class="cerca-utenti-avatar-placeholder" aria-hidden="true">👤</span>`;

  const meta = [user.city, user.region].filter(Boolean).join(" • ");
  const role = user.role || null;
  const isAdmin = String(user.role || "").toLowerCase() === "admin";

  let blockedByMe = !!user.blockedByMe;
  const hasBlockedMe = !!user.hasBlockedMe;

  if (isAdmin) {
    blockedByMe = false;
  }

  let actionsHtml = "";
  let statusHtml = "";

  if (hasBlockedMe) {
    statusHtml = `
      <p class="cerca-utenti-status">
        🔒 Questo utente ti ha bloccato
      </p>
    `;
  } else if (isAdmin) {
    actionsHtml = `
      <div class="cerca-utenti-actions">
        ${
          user.canReceiveMessages
            ? `<button type="button" class="cerca-utenti-btn cerca-utenti-btn--primary" data-action="msg" data-user="${escapeHtml(user._id)}">Messaggia</button>`
            : ""
        }
      </div>
    `;
    statusHtml = `
      <p class="cerca-utenti-status">
        Amministratore
      </p>
    `;
  } else if (blockedByMe) {
    actionsHtml = `
      <div class="cerca-utenti-actions">
        <button type="button" class="cerca-utenti-btn" data-action="unblock" data-user="${escapeHtml(user._id)}">Sblocca</button>
      </div>
    `;
    statusHtml = `
      <p class="cerca-utenti-status">
        Hai bloccato questo utente
      </p>
    `;
  } else {
    actionsHtml = `
      <div class="cerca-utenti-actions">
        ${
          user.canReceiveMessages
            ? `<button type="button" class="cerca-utenti-btn cerca-utenti-btn--primary" data-action="msg" data-user="${escapeHtml(user._id)}">Messaggia</button>`
            : ""
        }
        <button type="button" class="cerca-utenti-btn" data-action="block" data-user="${escapeHtml(user._id)}">Blocca</button>
      </div>
    `;
  }

  return `
    <li
      class="cerca-utenti-card"
      data-user-id="${escapeHtml(user._id)}"
      data-blocked-by-me="${blockedByMe ? "1" : "0"}"
      data-has-blocked-me="${hasBlockedMe ? "1" : "0"}"
    >
      ${avatarHtml}

      <div class="cerca-utenti-card__body">
        <button
          type="button"
          class="cerca-utenti-card__name-btn"
          data-action="profile"
          data-user="${escapeHtml(user._id)}"
        >
          <span class="cerca-utenti-card__name">${escapeHtml(user.name || "Utente")}</span>
          <span class="cerca-utenti-card__meta">${escapeHtml(meta)}</span>
        </button>

        ${actionsHtml}
        ${statusHtml}
      </div>
    </li>
  `;
}

export function renderSearchState(stateNode, message, variant = "info") {
  stateNode.className = "cerca-utenti-state";
  if (variant === "error") {
    stateNode.classList.add("cerca-utenti-state--error");
  }
  stateNode.textContent = message;
  stateNode.hidden = false;
}

export function hideSearchState(stateNode) {
  stateNode.hidden = true;
  stateNode.textContent = "";
  stateNode.className = "cerca-utenti-state";
}

export function renderUserResults(listNode, users) {
  listNode.innerHTML = "";

  for (const user of users) {
    listNode.insertAdjacentHTML("beforeend", buildUserCard(user));
  }
}
