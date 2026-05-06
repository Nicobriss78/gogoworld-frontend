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

          const canBan = userId && actionName && !isOrganizer && !isAdmin && !isSelf;

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
                canBan
                  ? `
                    <div class="org-access-actions" style="margin-top:10px;">
                      <button
                        type="button"
                        class="${danger ? "danger" : ""}"
                        data-action="${escapeHtml(actionName)}"
                        data-user-id="${escapeHtml(userId)}"
                      >
                        ${escapeHtml(actionLabel)}
                      </button>
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

  if (state.error) {
    root.innerHTML = `
      <h1>Accessi evento privato</h1>
      <section class="org-access-error">${escapeHtml(state.error)}</section>
      <p>
        <a href="/pages/organizer-event-detail-v2.html?id=${encodedEventId}">
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

    <section class="org-access-card">
      <h2>Codice accesso</h2>
      <p><strong>${escapeHtml(event?.accessCode || "N/D")}</strong></p>
      <div class="org-access-actions">
        <button type="button" data-action="rotate-code">
          Rigenera codice
        </button>
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
        />
        <div class="org-access-actions">
          <button type="submit" ${state.saving ? "disabled" : ""}>
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
        <a href="/pages/organizer-event-detail-v2.html?id=${encodedEventId}">
          Torna al dettaglio evento
        </a>
        <a href="/pages/organizer-events-v2.html">
          Torna agli eventi
        </a>
      </div>
    </section>
  `;
}
