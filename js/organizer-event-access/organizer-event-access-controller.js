import {
  banUserFromPrivateEvent,
  fetchEventAccess,
  inviteUserToPrivateEvent,
  rotatePrivateEventAccessCode,
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

function hasPendingAction() {
  return Boolean(
    organizerEventAccessState.saving ||
      organizerEventAccessState.rotatingCode ||
      organizerEventAccessState.banningUserId ||
      organizerEventAccessState.unbanningUserId
  );
}

function getUserIdFromButton(button) {
  return String(button?.dataset?.userId || "").trim();
}

function resetActionFeedback() {
  organizerEventAccessState.error = null;
  organizerEventAccessState.success = null;
}

function bindAccessActions() {
  document.addEventListener("submit", async (domEvent) => {
    const form = domEvent.target;

    if (!form.matches("[data-access-invite-form]")) return;

    domEvent.preventDefault();

    if (hasPendingAction()) return;

    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();

    if (!email) return;

    organizerEventAccessState.saving = true;
    resetActionFeedback();
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
      renderEventAccess(organizerEventAccessState);
    }
  });

  document.addEventListener("click", async (domEvent) => {
    const target = domEvent.target;
    const action = target?.dataset?.action;

    if (!action) return;

    if (action === "request-rotate-code") {
      if (hasPendingAction()) return;

      organizerEventAccessState.confirmRotateCode = true;
      resetActionFeedback();
      renderEventAccess(organizerEventAccessState);
      return;
    }

    if (action === "cancel-rotate-code") {
      organizerEventAccessState.confirmRotateCode = false;
      organizerEventAccessState.error = null;
      renderEventAccess(organizerEventAccessState);
      return;
    }

    if (action === "confirm-rotate-code") {
      if (hasPendingAction()) return;

      organizerEventAccessState.rotatingCode = true;
      resetActionFeedback();
      renderEventAccess(organizerEventAccessState);

      try {
        await rotatePrivateEventAccessCode(organizerEventAccessState.eventId);
        organizerEventAccessState.confirmRotateCode = false;
        organizerEventAccessState.success = "Codice accesso rigenerato correttamente.";
        await loadAccess();
      } catch (error) {
        console.error("[OrganizerEventAccess] rotate code failed", error);
        organizerEventAccessState.error =
          error.message || "Errore durante la rigenerazione del codice.";
        renderEventAccess(organizerEventAccessState);
      } finally {
        organizerEventAccessState.rotatingCode = false;
        renderEventAccess(organizerEventAccessState);
      }

      return;
    }

    if (action === "request-ban-user") {
      if (hasPendingAction()) return;

      const userId = getUserIdFromButton(target);
      if (!userId) return;

      organizerEventAccessState.confirmBanUserId = userId;
      resetActionFeedback();
      renderEventAccess(organizerEventAccessState);
      return;
    }

    if (action === "cancel-ban-user") {
      organizerEventAccessState.confirmBanUserId = null;
      organizerEventAccessState.error = null;
      renderEventAccess(organizerEventAccessState);
      return;
    }

    if (action === "confirm-ban-user") {
      if (hasPendingAction()) return;

      const userId = getUserIdFromButton(target);
      if (!userId) return;

      organizerEventAccessState.banningUserId = userId;
      resetActionFeedback();
      renderEventAccess(organizerEventAccessState);

      try {
        await banUserFromPrivateEvent(organizerEventAccessState.eventId, userId);
        organizerEventAccessState.confirmBanUserId = null;
        organizerEventAccessState.success = "Utente bannato correttamente.";
        await loadAccess();
      } catch (error) {
        console.error("[OrganizerEventAccess] ban failed", error);
        organizerEventAccessState.error = error.message || "Errore durante il ban.";
        renderEventAccess(organizerEventAccessState);
      } finally {
        organizerEventAccessState.banningUserId = null;
        renderEventAccess(organizerEventAccessState);
      }

      return;
    }

    if (action === "unban-user") {
      if (hasPendingAction()) return;

      const userId = getUserIdFromButton(target);
      if (!userId) return;

      organizerEventAccessState.unbanningUserId = userId;
      resetActionFeedback();
      renderEventAccess(organizerEventAccessState);

      try {
        await unbanUserFromPrivateEvent(organizerEventAccessState.eventId, userId);
        organizerEventAccessState.success = "Utente reinserito correttamente.";
        await loadAccess();
      } catch (error) {
        console.error("[OrganizerEventAccess] unban failed", error);
        organizerEventAccessState.error = error.message || "Errore durante il reinserimento.";
        renderEventAccess(organizerEventAccessState);
      } finally {
        organizerEventAccessState.unbanningUserId = null;
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
