// js/evento.js — pagina Dettaglio Evento
//
// Comportamenti secondo Dinamiche:
// - Se arrivo come PARTECIPANTE: mostra "Torna alla lista" e bottone contestuale
// "Partecipa" / "Annulla partecipazione" (nessun altro bottone).
// - Se arrivo come ORGANIZZATORE: mostra "Torna alla lista" e pulsanti "Modifica" e "Elimina"
// (niente partecipa/annulla). La modifica è placeholder (form non richiesto adesso).
//
// Scelte di navigazione:
// - Torna alla lista: se desiredRole === "organizer" → organizzatore.html
// altrimenti → partecipante.html

import { apiGet, apiPost, apiDelete } from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  const eventId = sessionStorage.getItem("selectedEventId");
  if (!eventId) {
    alert("Nessun evento selezionato");
    const desiredRole = sessionStorage.getItem("desiredRole");
    window.location.href = desiredRole === "organizer" ? "organizzatore.html" : "partecipante.html";
    return;
  }

  const elTitle = document.getElementById("eventTitle");
  const elDetails = document.getElementById("eventDetails");
  const btnBack = document.getElementById("btnBackToList");
  const btnToggle = document.getElementById("btnToggleParticipation");

  const desiredRole = sessionStorage.getItem("desiredRole") || "participant";

  // Carico dettagli evento + mio profilo per capire partecipazione
  try {
    const [detail, me] = await Promise.all([
      apiGet(`/events/${eventId}`, token),
      apiGet("/users/me", token),
    ]);
    if (!detail.ok) throw new Error(detail.error || "Errore dettaglio evento");

    const ev = detail.event;
    const myId = me?.user?._id || me?.user?.id;

    // Render base dettagli
    elTitle.textContent = ev.title || "Evento";
    elDetails.innerHTML = renderDetails(ev);

    // Logica bottoni
    if (desiredRole === "organizer") {
      // ORGANIZZATORE: mostra Modifica/Elimina; nascondi toggle partecipazione
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
        alert("Form di modifica non ancora implementato in questa fase.");
      });

      btnDel.addEventListener("click", async () => {
        if (confirm("Sei sicuro di voler eliminare questo evento?")) {
          await apiDelete(`/events/${eventId}`, token);
          // Ritorno all'area organizzatore; la lista si ricarica automaticamente
          window.location.href = "organizzatore.html";
        }
      });
    } else {
      // PARTECIPANTE: bottone contestuale Partecipa/Annulla
      const isJoined = !!ev.participants?.some((pid) => String(pid) === String(myId));
      btnToggle.textContent = isJoined ? "Annulla partecipazione" : "Partecipa";
      btnToggle.addEventListener("click", async () => {
        if (btnToggle.disabled) return;
        btnToggle.disabled = true;
        try {
          if (isJoined) {
            await apiPost(`/events/${eventId}/leave`, {}, token);
          } else {
            await apiPost(`/events/${eventId}/join`, {}, token);
          }
          // Ricarica pagina per riflettere lo stato aggiornato
          window.location.reload();
        } finally {
          btnToggle.disabled = false;
        }
      });
    }
  } catch (err) {
    elDetails.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
  }

  // Back
  btnBack.addEventListener("click", () => {
    const role = sessionStorage.getItem("desiredRole");
    window.location.href = role === "organizer" ? "organizzatore.html" : "partecipante.html";
  });
});

function renderDetails(ev) {
  const lines = [];
  // Cover image
  if (ev.coverImage) {
    lines.push(`<div class="cover"><img src="${escapeHtml(ev.coverImage)}" alt="Locandina" /></div>`);
  }
  // Campi principali
  lines.push(`<p><strong>Descrizione:</strong> ${escapeHtml(ev.description || "")}</p>`);
  lines.push(`<p><strong>Città/Regione/Paese:</strong> ${escapeHtml(ev.city || "")} / ${escapeHtml(ev.region || "")} / ${escapeHtml(ev.country || "")}</p>`);
  lines.push(`<p><strong>Categoria:</strong> ${escapeHtml(ev.category || "")} — <strong>Sub:</strong> ${escapeHtml(ev.subcategory || "")}</p>`);
  lines.push(`<p><strong>Tipo:</strong> ${escapeHtml(ev.type || "")} — <strong>Visibilità:</strong> ${escapeHtml(ev.visibility || "")}</p>`);
  lines.push(`<p><strong>Data:</strong> ${ev.date ? new Date(ev.date).toLocaleString() : "-"}</p>`);
  if (ev.endDate) lines.push(`<p><strong>Fine:</strong> ${new Date(ev.endDate).toLocaleString()}</p>`);
  lines.push(`<p><strong>Prezzo:</strong> ${ev.isFree ? "Gratuito" : (ev.price != null ? ev.price + "€" : "-")}</p>`);
  // Galleria
  if (Array.isArray(ev.images) && ev.images.length) {
    lines.push(`<div class="gallery">${ev.images.map((url) =>
      `<img src="${escapeHtml(url)}" alt="Immagine evento" />`
    ).join("")}</div>`);
  }
  return lines.join("\n");
}

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
