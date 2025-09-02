// js/evento.js — dettaglio evento
// TODO UI/UX Overhaul:
// - Layout dettaglio evento (cover, meta grid, azioni) con componenti standard
// - Distinguere chiaramente UI owner vs participant con banner/toolbar dedicata
// - Pulsante “Partecipa/Annulla” con stato loading e toast di esito

import { apiGet, apiPost, apiDelete } from "./api.js";
import { escapeHtml } from "./utils.js";

// Helper: format event start datetime using available fields (date | dateStart)
function formatEventStart(ev) {
  try {
    const start = ev?.date || ev?.dateStart;
    if (!start) return "-";
    return new Date(start).toLocaleString();
  } catch { return "-"; }
}

// Banner messaggi (error/success) con auto-hide opzionale
function showAlert(message, type = "error", opts = {}) {
  const { autoHideMs = 0 } = opts;
  const main = document.querySelector("main") || document.body;
  let box = document.getElementById("alertBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "alertBox";
    main.prepend(box);
  }
  const t = type === "success" ? "success" : type === "error" ? "error" : "info";
  box.className = `alert ${t}`;
  box.textContent = message;

  if (autoHideMs > 0) {
    if (box._hideTimer) clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
      if (box && box.parentNode) box.parentNode.removeChild(box);
    }, autoHideMs);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  const eventId = sessionStorage.getItem("selectedEventId");
  if (!eventId) {
    showAlert("Nessun evento selezionato", "error", { autoHideMs: 4000 });
    const desiredRole = sessionStorage.getItem("desiredRole");
    window.location.href = desiredRole === "organizer" ? "organizzatore.html" : "partecipante.html";
    return;
  }

  const elTitle = document.getElementById("eventTitle");
  const elDetails = document.getElementById("eventDetails");
  const btnBack = document.getElementById("btnBackToList");
  const btnToggle = document.getElementById("btnToggleParticipation");

  const desiredRole = sessionStorage.getItem("desiredRole") || "participant";

  try {
    const [detail, me] = await Promise.all([
      apiGet(`/events/${eventId}`, token),
      apiGet("/users/me", token),
    ]);
    if (!detail.ok) throw new Error(detail.error || "Errore dettaglio evento");

    const ev = detail.event;
    const myId = me?._id;

    elTitle.textContent = ev.title || "Evento";
    elDetails.innerHTML = renderDetails(ev);

    // Determina proprietà reale dell'evento
    const evOrganizerId = (ev.organizer && typeof ev.organizer === "object" && ev.organizer._id)
      ? ev.organizer._id
      : ev.organizer;
    const isOwner = String(evOrganizerId || "") === String(myId || "");

    if (isOwner) {
      btnToggle.style.display = "none";

      const adminBar = document.createElement("div");
      adminBar.className = "event-actions";
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn btn-primary";
      btnEdit.textContent = "Modifica";
      const btnDel = document.createElement("button");
      btnDel.className = "btn btn-secondary";
      btnDel.textContent = "Elimina";

      adminBar.appendChild(btnEdit);
      adminBar.appendChild(btnDel);
      elDetails.appendChild(adminBar);

      btnEdit.addEventListener("click", () => {
        showAlert("Form di modifica non ancora implementato in questa fase.", "error", { autoHideMs: 3500 });
      });

      btnDel.addEventListener("click", async () => {
        if (confirm("Sei sicuro di voler eliminare questo evento?")) {
          const res = await apiDelete(`/events/${eventId}`, token);
          if (res?.ok === false) {
            showAlert(res.error || "Eliminazione fallita", "error", { autoHideMs: 4000 });
            return;
          }
          showAlert("Evento eliminato", "success", { autoHideMs: 2500 });
          setTimeout(() => { window.location.href = "organizzatore.html"; }, 600);
        }
      });
    } else {
      // PARTECIPANTE (o non owner)
      const isJoined = !!ev.participants?.some((pid) => String(pid) === String(myId));
      btnToggle.textContent = isJoined ? "Annulla partecipazione" : "Partecipa";
      btnToggle.style.display = "inline-block";

      btnToggle.addEventListener("click", async () => {
        if (btnToggle.disabled) return;
        btnToggle.disabled = true;
        try {
          if (isJoined) {
            const res = await apiPost(`/events/${eventId}/leave`, {}, token);
            if (!res?.ok) throw new Error(res?.error || "Errore annullamento");
            showAlert("Partecipazione annullata", "success", { autoHideMs: 2500 });
          } else {
            const res = await apiPost(`/events/${eventId}/join`, {}, token);
            if (!res?.ok) throw new Error(res?.error || "Errore partecipazione");
            showAlert("Iscrizione effettuata", "success", { autoHideMs: 2500 });
          }
          setTimeout(() => window.location.reload(), 400);
        } catch (err) {
          showAlert(err?.message || "Operazione non riuscita", "error", { autoHideMs: 4000 });
        } finally {
          btnToggle.disabled = false;
        }
      });
    }
  } catch (err) {
    elDetails.innerHTML = `<p class="error">Errore: ${escapeHtml(err.message)}</p>`;
    showAlert(err?.message || "Si è verificato un errore", "error", { autoHideMs: 4000 });
  }

  btnBack.addEventListener("click", () => {
    const role = sessionStorage.getItem("desiredRole");
    window.location.href = role === "organizer" ? "organizzatore.html" : "partecipante.html";
  });
});

// TODO UI/UX Overhaul:
// Spostare la logica di rendering in template/componenti modulari (es. gw-event-details)
// per semplificare il redesign e ridurre duplicazioni HTML.

function renderDetails(ev) {
  const lines = [];
  if (ev.coverImage) {
    lines.push(`<div class="cover"><img src="${escapeHtml(ev.coverImage)}" alt="Locandina" /></div>`);
  }
  lines.push(`<p><strong>Descrizione:</strong> ${escapeHtml(ev.description || "")}</p>`);
  // PATCH: localizzazione separata
  lines.push(`<p><strong>Luogo:</strong> ${escapeHtml(ev.venueName || "")}</p>`);
  lines.push(`<p><strong>Indirizzo:</strong> ${escapeHtml(ev.street || "")} ${escapeHtml(ev.streetNumber || "")}, ${escapeHtml(ev.postalCode || "")}</p>`);
  lines.push(`<p><strong>Città/Provincia/Regione/Paese:</strong> ${escapeHtml(ev.city || "")} / ${escapeHtml(ev.province || "")} / ${escapeHtml(ev.region || "")} / ${escapeHtml(ev.country || "")}</p>`);
  // PATCH: tassonomia & meta
  lines.push(`<p><strong>Categoria:</strong> ${escapeHtml(ev.category || "")} — <strong>Sub:</strong> ${escapeHtml(ev.subcategory || "")}</p>`);
  lines.push(`<p><strong>Visibilità:</strong> ${escapeHtml(ev.visibility || "")} — <strong>Lingua:</strong> ${escapeHtml(ev.language || "")} — <strong>Target:</strong> ${escapeHtml(ev.target || "")}</p>`);
  // PATCH: dateStart/dateEnd
  lines.push(`<p><strong>Inizio:</strong> ${formatEventStart(ev)}</p>`);
  if (ev.dateEnd) lines.push(`<p><strong>Fine:</strong> ${new Date(ev.dateEnd).toLocaleString()}</p>`);
  // PATCH: prezzo + currency
  lines.push(`<p><strong>Prezzo:</strong> ${ev.isFree ? "Gratuito" : (ev.price != null ? `${escapeHtml(ev.price)} ${escapeHtml(ev.currency || "EUR")}` : "-")}</p>`);
  // PATCH: tags e immagini
  if (Array.isArray(ev.tags) && ev.tags.length) {
    lines.push(`<p><strong>Tag:</strong> ${ev.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(" ")}</p>`);
  }
  if (Array.isArray(ev.images) && ev.images.length) {
    lines.push(`<div class="gallery">${ev.images.map((url) =>
      `<img src="${escapeHtml(url)}" alt="Immagine evento" />`
    ).join("")}</div>`);
  }
  return lines.join("\n");
}

