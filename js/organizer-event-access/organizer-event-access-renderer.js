function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function encodeUrlValue(value) {
  return encodeURIComponent(String(value ?? "").trim());
}
function getRootReturnTo() {
  return new URLSearchParams(window.location.search).get("rootReturnTo") || "";
}

function getBackHref() {
  const rootReturnTo = getRootReturnTo();

  if (rootReturnTo === "organizer-dashboard") {
    return "/pages/organizer-dashboard-v2.html";
  }

  return "/pages/organizer-events-v2.html";
}

function getBackLabel() {
  return getRootReturnTo() === "organizer-dashboard"
    ? "Torna alla Dashboard"
    : "Torna agli eventi";
}

function withCurrentReturn(href) {
  const rootReturnTo = getRootReturnTo();
  if (!rootReturnTo) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}rootReturnTo=${encodeURIComponent(rootReturnTo)}`;
}
function getUserId(user) {
  return String(user?._id || user?.id || user?.userId || "").trim();
}

function getUserLabel(user) {
  return (
    user?.username ||
    user?.name ||
    user?.displayName ||
    user?.email ||
    getUserId(user) ||
    "Utente"
  );
}

function getUserEmail(user) {
  return user?.email || "";
}

function normalizeList(value) {
  return Array.isArray(value) ? value : [];
}

function hasPendingAction(state) {
  return Boolean(
    state.saving ||
      state.rotatingCode ||
      state.banningUserId ||
      state.unbanningUserId
  );
}

function renderUserAction(userId, actionLabel, actionName, danger, state) {
  const safeUserId = escapeHtml(userId);
  const pending = hasPendingAction(state);

  if (actionName === "ban-user") {
    const confirming = state.confirmBanUserId === userId;
    const banning = state.banningUserId === userId;

    if (confirming) {
      return `
        <span>Confermi ban?</span>
        <button
          type="button"
          class="danger"
          data-action="confirm-ban-user"
          data-user-id="${safeUserId}"
          ${banning ? "disabled" : ""}
        >
          ${banning ? "Ban..." : "Conferma"}
        </button>
        <button
          type="button"
          data-action="cancel-ban-user"
          data-user-id="${safeUserId}"
          ${banning ? "disabled" : ""}
        >
          Annulla
        </button>
      `;
    }

    return `
      <button
        type="button"
        class="${danger ? "danger" : ""}"
        data-action="request-ban-user"
        data-user-id="${safeUserId}"
        ${pending ? "disabled" : ""}
      >
        ${escapeHtml(actionLabel)}
      </button>
    `;
  }

  if (actionName === "unban-user") {
    const unbanning = state.unbanningUserId === userId;

    return `
      <button
        type="button"
        class="${danger ? "danger" : ""}"
        data-action="unban-user"
        data-user-id="${safeUserId}"
        ${pending ? "disabled" : ""}
      >
        ${unbanning ? "Reinserimento..." : escapeHtml(actionLabel)}
      </button>
    `;
  }

  return "";
}

function renderUserList(
  users,
  emptyText,
  actionLabel,
  actionName,
  danger = false,
  state = {}
) {
  const list = normalizeList(users);
  const currentUserId = String(state.currentUserId || "").trim();
  const organizerId = String(state.event?.organizer?._id || state.event?.organizer || "").trim();

  if (!list.length) {
    return `<p class="org-access-muted">${escapeHtml(emptyText)}</p>`;
  }

  return `
    <div class="org-access-user-list">
      ${list
        .map((user) => {
          const userId = getUserId(user);
          const label = getUserLabel(user);
          const email = getUserEmail(user);
          const role = user?.role;

          const isOrganizer = userId && userId === organizerId;
          const isAdmin = role === "admin";
          const isSelf = userId && userId === currentUserId;

          const canAct = userId && actionName && !isOrganizer && !isAdmin && !isSelf;

          return `
            <article class="org-access-user">
              <strong>${escapeHtml(label)}</strong>

              <div class="org-access-meta">
                ${email ? `<span class="org-access-muted">${escapeHtml(email)}</span>` : ""}

                ${
                  role === "admin"
                    ? `<span class="org-access-badge">Admin</span>`
                    : isOrganizer
                    ? `<span class="org-access-badge">Organizzatore</span>`
                    : ""
                }
              </div>

              ${
                canAct
                  ? `
                    <div class="org-access-actions" style="margin-top:10px;">
                      ${renderUserAction(userId, actionLabel, actionName, danger, state)}
                    </div>
                  `
                  : ""
              }
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderRotateCodeAction(state) {
  if (state.confirmRotateCode) {
    return `
      <span>Confermi rigenerazione codice?</span>
      <button type="button" data-action="confirm-rotate-code" ${state.rotatingCode ? "disabled" : ""}>
        ${state.rotatingCode ? "Rigenerazione..." : "Conferma"}
      </button>
      <button type="button" data-action="cancel-rotate-code" ${state.rotatingCode ? "disabled" : ""}>
        Annulla
      </button>
    `;
  }

  return `
    <button type="button" data-action="request-rotate-code" ${hasPendingAction(state) ? "disabled" : ""}>
      Rigenera codice
    </button>
  `;
}

export function renderEventAccess(state) {
  const root = document.querySelector("[data-org-event-access-root]");
  if (!root) return;

  const eventId = String(state.eventId || "").trim();
  const encodedEventId = encodeUrlValue(eventId);

  if (state.loading) {
    root.innerHTML = `
      <h1>Accessi evento privato</h1>
      <p>Caricamento accessi...</p>
    `;
    return;
  }

  if (state.error && !state.event) {
    root.innerHTML = `
      <h1>Accessi evento privato</h1>
      <section class="org-access-error">${escapeHtml(state.error)}</section>
      <p>
        <a href="${escapeHtml(withCurrentReturn(`/pages/organizer-event-detail-v2.html?id=${encodedEventId}`))}">
          Torna al dettaglio evento
        </a>
      </p>
    `;
    return;
  }

  const event = state.event || {};
  const access = state.access || {};
  const title = event?.title || "Evento privato";

  root.innerHTML = `
    <h1>Accessi evento privato</h1>
    <p>${escapeHtml(title)}</p>

    ${state.success ? `<section class="org-access-success">${escapeHtml(state.success)}</section>` : ""}
    ${state.error ? `<section class="org-access-error">${escapeHtml(state.error)}</section>` : ""}

    <section class="org-access-card">
      <h2>Codice accesso</h2>
      <p><strong>${escapeHtml(event?.accessCode || "N/D")}</strong></p>
      <div class="org-access-actions">
        ${renderRotateCodeAction(state)}
      </div>
      <p class="org-access-muted">
        Gli utenti già autorizzati resteranno dentro. Il vecchio codice non funzionerà più.
      </p>
    </section>

    <section class="org-access-card">
      <h2>Invita utente</h2>
      <form class="org-access-form" data-access-invite-form>
        <input
          type="email"
          name="email"
          placeholder="Email utente da invitare"
          required
          ${hasPendingAction(state) ? "disabled" : ""}
        />
        <div class="org-access-actions">
          <button type="submit" ${hasPendingAction(state) ? "disabled" : ""}>
            ${state.saving ? "Invio..." : "Invita"}
          </button>
        </div>
      </form>
    </section>

    <section class="org-access-card">
      <h2>Utenti autorizzati / invitati</h2>
      ${renderUserList(
        access.allowedUsers || access.invitedUsers || access.users,
        "Nessun utente autorizzato trovato.",
        "Banna",
        "ban-user",
        true,
        state
      )}
    </section>

    <section class="org-access-card">
      <h2>Utenti bannati</h2>
      ${renderUserList(
        access.bannedUsers || access.revokedUsers,
        "Nessun utente bannato.",
        "Reinserisci",
        "unban-user",
        false,
        state
      )}
    </section>

    <section class="org-access-card">
      <div class="org-access-actions">
        <a href="${escapeHtml(withCurrentReturn(`/pages/organizer-event-detail-v2.html?id=${encodedEventId}`))}">
          Torna al dettaglio evento
        </a>
        <a href="${escapeHtml(getBackHref())}">
  ${escapeHtml(getBackLabel())}
</a>
      </div>
    </section>
  `;
}
