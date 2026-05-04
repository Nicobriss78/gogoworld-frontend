import {
  banUserFromPrivateEvent,
  fetchEventAccess,
  inviteUserToPrivateEvent,
  unbanUserFromPrivateEvent,
} from "./organizer-event-access-api.js?v=7";
import { renderEventAccess } from "./organizer-event-access-renderer.js?v=7";
import { organizerEventAccessState } from "./organizer-event-access-state.js?v=7";

function getEventIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

function normalizeAccessPayload(payload) {
  return {
    event: payload?.event || payload?.data?.event || payload?.data || null,
    access:
      payload?.access ||
      payload?.data?.access ||
      {
        allowedUsers:
          payload?.allowedUsers ||
          payload?.data?.allowedUsers ||
          payload?.users ||
          payload?.data?.users ||
          [],
        invitedUsers:
          payload?.invitedUsers ||
          payload?.data?.invitedUsers ||
          [],
        bannedUsers:
          payload?.bannedUsers ||
          payload?.data?.bannedUsers ||
          payload?.revokedUsers ||
          payload?.data?.revokedUsers ||
          [],
        revokedUsers:
          payload?.revokedUsers ||
          payload?.data?.revokedUsers ||
          [],
      },
  };
}

async function loadAccess() {
  organizerEventAccessState.loading = true;
  organizerEventAccessState.error = null;

  renderEventAccess(organizerEventAccessState);

  try {
    const payload = await fetchEventAccess(organizerEventAccessState.eventId);
    const normalized = normalizeAccessPayload(payload);

    organizerEventAccessState.event = normalized.event;
    organizerEventAccessState.access = normalized.access;
  } catch (error) {
    console.error("[OrganizerEventAccess] load failed", error);
    organizerEventAccessState.error = error.message || "Errore caricamento accessi.";
  } finally {
    organizerEventAccessState.loading = false;
    renderEventAccess(organizerEventAccessState);
  }
}

function bindAccessActions() {
  document.addEventListener("submit", async (domEvent) => {
    const form = domEvent.target;

    if (!form.matches("[data-access-invite-form]")) return;

    domEvent.preventDefault();

    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();

    if (!email) return;

    organizerEventAccessState.saving = true;
    organizerEventAccessState.success = null;
    organizerEventAccessState.error = null;
    renderEventAccess(organizerEventAccessState);

    try {
      await inviteUserToPrivateEvent(organizerEventAccessState.eventId, email);
      organizerEventAccessState.success = "Invito inviato correttamente.";
      await loadAccess();
    } catch (error) {
      console.error("[OrganizerEventAccess] invite failed", error);
      organizerEventAccessState.error = error.message || "Errore durante l’invito.";
      renderEventAccess(organizerEventAccessState);
    } finally {
      organizerEventAccessState.saving = false;
    }
  });

  document.addEventListener("click", async (domEvent) => {
    const target = domEvent.target;
    const action = target?.dataset?.action;
    const userId = target?.dataset?.userId;

    if (!action || !userId) return;

    if (action === "ban-user") {
      const confirmed = window.confirm("Vuoi davvero bannare questo utente dall’evento privato?");
      if (!confirmed) return;

      try {
        await banUserFromPrivateEvent(organizerEventAccessState.eventId, userId);
        organizerEventAccessState.success = "Utente bannato correttamente.";
        await loadAccess();
      } catch (error) {
        console.error("[OrganizerEventAccess] ban failed", error);
        organizerEventAccessState.error = error.message || "Errore durante il ban.";
        renderEventAccess(organizerEventAccessState);
      }

      return;
    }

    if (action === "unban-user") {
      try {
        await unbanUserFromPrivateEvent(organizerEventAccessState.eventId, userId);
        organizerEventAccessState.success = "Utente reinserito correttamente.";
        await loadAccess();
      } catch (error) {
        console.error("[OrganizerEventAccess] unban failed", error);
        organizerEventAccessState.error = error.message || "Errore durante il reinserimento.";
        renderEventAccess(organizerEventAccessState);
      }
    }
  });
}

export async function initEventAccess() {
  const eventId = getEventIdFromUrl();

  organizerEventAccessState.eventId = eventId;

  if (!eventId) {
    organizerEventAccessState.loading = false;
    organizerEventAccessState.error = "ID evento mancante.";
    renderEventAccess(organizerEventAccessState);
    return;
  }

  bindAccessActions();
  await loadAccess();
}
