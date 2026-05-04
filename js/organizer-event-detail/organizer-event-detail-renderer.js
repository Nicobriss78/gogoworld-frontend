function formatDate(value) {
  if (!value) return "Data non disponibile";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data non valida";

  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getEventId(event) {
  return event?._id || event?.id || "";
}

export function renderEventDetail(state) {
  const root = document.querySelector("[data-org-event-detail-root]");
  if (!root) return;

  if (state.loading) {
    root.innerHTML = `
      <h1>Dettaglio evento</h1>
      <p>Caricamento evento...</p>
    `;
    return;
  }

  if (state.error) {
    root.innerHTML = `
      <h1>Dettaglio evento</h1>
      <section class="org-event-detail-error">${state.error}</section>
      <p><a href="/pages/organizer-events-v2.html">Torna agli eventi</a></p>
    `;
    return;
  }

  const event = state.event;
  const eventId = getEventId(event);
  const participants = Array.isArray(event.participants) ? event.participants.length : 0;

  root.innerHTML = `
    <h1>${event.title || "Evento senza titolo"}</h1>
    <p>Hub operativo evento Organizer V2.</p>

    <section class="org-event-detail-card">
      <h2>Dati evento</h2>
      <p><strong>Stato approvazione:</strong> ${event.approvalStatus || "pending"}</p>
      <p><strong>Visibilità:</strong> ${event.visibility || "public"}</p>
      <p><strong>Privato:</strong> ${event.isPrivate ? "Sì" : "No"}</p>
      <p><strong>Codice accesso:</strong> ${event.accessCode || "N/D"}</p>
      <p><strong>Città:</strong> ${event.city || "N/D"}</p>
      <p><strong>Regione:</strong> ${event.region || "N/D"}</p>
      <p><strong>Paese:</strong> ${event.country || "N/D"}</p>
      <p><strong>Inizio:</strong> ${formatDate(event.dateStart)}</p>
      <p><strong>Fine:</strong> ${formatDate(event.dateEnd)}</p>
      <p><strong>Partecipanti:</strong> ${participants}</p>
    </section>

    <section class="org-event-detail-card">
      <h2>Descrizione</h2>
      <p>${event.description || "Nessuna descrizione."}</p>
    </section>

    <section class="org-event-detail-actions">
      <a href="/pages/organizer-event-edit-v2.html?id=${eventId}">Modifica</a>
      <a href="/pages/organizer-events-v2.html">Torna agli eventi</a>
    </section>
  `;
}
