function getUserId(user) {
  return user?._id || user?.id || user?.userId || "";
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
  const currentUserId = state.currentUserId;
  const organizerId = state.event?.organizer?._id || state.event?.organizer;

  if (!list.length) {
    return `<p class="org-access-muted">${emptyText}</p>`;
  }

  return `
    <div class="org-access-user-list">
      ${list
        .map((user) => {
          const userId = getUserId(user);
          const label = getUserLabel(user);
          const email = getUserEmail(user);
          const role = user?.role;

          // 🔒 LOGICA BLOCCO BAN
          const isOrganizer = userId && String(userId) === String(organizerId);
          const isAdmin = role === "admin";
          const isSelf = userId && String(userId) === String(currentUserId);

          const canBan = userId && actionName && !isOrganizer && !isAdmin && !isSelf;

          return `
            <article class="org-access-user">
              <strong>${label}</strong>
              ${email ? `<span class="org-access-muted">${email}</span>` : ""}

              ${
                isAdmin
                  ? `<span class="org-access-badge">Admin</span>`
                  : isOrganizer
                  ? `<span class="org-access-badge">Organizzatore</span>`
                  : ""
              }

              ${
                canBan
                  ? `
                    <div class="org-access-actions" style="margin-top:10px;">
                      <button
                        type="button"
                        class="${danger ? "danger" : ""}"
                        data-action="${actionName}"
                        data-user-id="${userId}"
                      >
                        ${actionLabel}
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
      <section class="org-access-error">${state.error}</section>
      <p><a href="/pages/organizer-event-detail-v2.html?id=${state.eventId}">Torna al dettaglio evento</a></p>
    `;
    return;
  }

  const event = state.event;
  const access = state.access || {};
  const title = event?.title || "Evento privato";

  root.innerHTML = `
    <h1>Accessi evento privato</h1>
    <p>${title}</p>

    ${state.success ? `<section class="org-access-success">${state.success}</section>` : ""}

    <section class="org-access-card">
      <h2>Codice accesso</h2>
      <p><strong>${event?.accessCode || "N/D"}</strong></p>
      <p class="org-access-muted">
        La rotazione/modifica avanzata del codice sarà gestita in uno step successivo.
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
      renderUserList(
  access.allowedUsers || access.invitedUsers || access.users,
  "Nessun utente autorizzato trovato.",
  "Banna",
  "ban-user",
  true,
  state
)
        "Nessun utente autorizzato trovato.",
        "Banna",
        "ban-user",
        true
      )}
    </section>

    <section class="org-access-card">
      <h2>Utenti bannati</h2>
      ${renderUserList(
        access.bannedUsers || access.revokedUsers,
        "Nessun utente bannato.",
        "Reinserisci",
        "unban-user",
        false
      )}
    </section>

    <section class="org-access-card">
      <div class="org-access-actions">
        <a href="/pages/organizer-event-detail-v2.html?id=${state.eventId}">
          Torna al dettaglio evento
        </a>
        <a href="/pages/organizer-events-v2.html">
          Torna agli eventi
        </a>
      </div>
    </section>
  `;
}
