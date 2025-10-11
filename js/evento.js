// js/evento.js — dettaglio evento
// TODO UI/UX Overhaul:
// - Layout dettaglio evento (cover, meta grid, azioni) con componenti standard
// - Distinguere chiaramente UI owner vs participant con banner/toolbar dedicata
// - Pulsante “Partecipa/Annulla” con stato loading e toast di esito

import { apiGet, apiPost, apiDelete, apiPut } from "./api.js";
// --- helper: risolve l'ID evento sia da query (?id=) sia da sessionStorage ---
function resolveEventId() {
  const url = new URL(window.location.href);
  const qId = url.searchParams.get("id");
  if (qId) return qId;
  try {
    const sid = sessionStorage.getItem("selectedEventId");
    if (sid) return sid;
  } catch {}
  return null;
}

import { escapeHtml } from "./utils.js";

// Intervallo "start – end" con logica smart
function formatRangeSmart(start, end) {
  const s = formatDateSmart(start);
  if (!end) return s;
  const e = formatDateSmart(end);
  return (s && e) ? `${s} – ${e}` : s || e || "-";
}
// PATCH E4: visualizzazione smart di date/ora
function formatDateSmart(date) {
  if (!date) return "-";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "-";
    // Se l’orario è 00:00:00 → mostra solo la data
    if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
      return d.toLocaleDateString("it-IT");
    }
    // Altrimenti data + ora
    return d.toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "-";
  }
}

// Helper: start (date | dateStart) con fallback e visualizzazione smart
function formatEventStart(ev) {
  try {
    const start = ev?.date || ev?.dateStart;
    return formatDateSmart(start);
  } catch {
    return "-";
  }
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
    /* nuove righe tra 64 e 65 */
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
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
// --- PATCH: Recensioni — helper & API ---
function eventHasEnded(ev) {
  const end = ev?.dateEnd || ev?.endDate || ev?.dateStart || ev?.date;
  if (!end) return false;
  const d = new Date(end);
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}
function isParticipantOf(ev, userId) {
  if (!Array.isArray(ev?.participants)) return false;
  return ev.participants.map(String).includes(String(userId));
}
function canUserReview(ev, userId) {
  // 1) evento concluso 2) utente è participant
  return eventHasEnded(ev) && isParticipantOf(ev, userId);
}
// Rende una recensione; se è la MIA recensione, mostra la chip con il mio status
function renderReviewItem(r, myId, myStatusRaw, myStatusLabel) {
  const isMine = String(r.participant || "") === String(myId || "");
  const stars = `<strong>${"★".repeat(r.rating || 0)}${"☆".repeat(5 - (r.rating || 0))}</strong>`;
  const txt = r.comment ? `<p>${escapeHtml(r.comment)}</p>` : "";
  const when = r.createdAt ? new Date(r.createdAt).toLocaleDateString("it-IT") : "";

// Header autore: “Tu” + chip (se mia)
const snapshotRaw = r.authorStatus || null;
const snapshotLabel =
  snapshotRaw === "ambassador" ? "Ambassador" :
  snapshotRaw === "veterano" ? "Veterano" :
  snapshotRaw === "esploratore"? "Esploratore":
  snapshotRaw === "novizio" ? "Novizio" : "";

const chipHtml = snapshotRaw
  ? `<span class="chip status-chip chip-${snapshotRaw}">${snapshotLabel}</span>`
  : "";

// Nome visualizzato (snapshot); fallback “Utente”
const safeName = (typeof r.authorName === "string" && r.authorName.trim())
  ? r.authorName.trim()
  : "Utente";

// Se è la mia recensione → “Tu · Nome”, altrimenti solo Nome
const authorText = isMine ? `Tu · ${safeName}` : safeName;

const authorLine = `<p class="muted"><strong>${authorText}</strong>${chipHtml ? " " : ""}${chipHtml}</p>`;
  return `
    <article class="review">
      <p>${stars}</p>
      ${txt}
      ${authorLine}
      <small>${when}</small>
    </article>
  `;
}

async function loadReviewsList(eventId, token, myId, myStatusRaw, myStatusLabel) {
  const target = document.getElementById("reviewsList");
  if (!target) return;
  try {
    const res = await apiGet(`/reviews?event=${eventId}`, token);
    if (!res?.ok) throw new Error(res?.error || "Errore caricamento recensioni");
    const items = res.reviews || [];
   target.innerHTML = items.length
      ? items.map(r => renderReviewItem(r, myId, myStatusRaw, myStatusLabel)).join("")
      : `<p>Nessuna recensione ancora.</p>`;
  } catch (err) {
    showAlert(err.message, "error", { autoHideMs: 4000 });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  const eventId = resolveEventId();
  if (!eventId) {
    showAlert("Evento non trovato (manca l'ID).", "error", { autoHideMs: 4000 });
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
    // PATCH: myId corretto dentro me.user
  const myId = me?.user?._id || me?._id || me?.id;
// CHIP STATUS (utente loggato)
const statusRaw = (me?.status || me?.user?.status || "").toString().toLowerCase();
const statusLabel = statusRaw ? (statusRaw[0].toUpperCase() + statusRaw.slice(1)) : "";

    elTitle.textContent = ev.title || "Evento";

    // --- Rendering per sezioni se i contenitori esistono; altrimenti fallback monolitico ---
    const sMeta = document.getElementById("eventMeta");
    const sSched = document.getElementById("eventSchedule");
    const sLoc = document.getElementById("eventLocation");
    const sPrice = document.getElementById("eventPricing");
    const sTax = document.getElementById("eventTaxonomy");
    const sMedia = document.getElementById("eventMedia");

    if (sMeta || sSched || sLoc || sPrice || sTax || sMedia) {
      if (sMeta) sMeta.innerHTML = renderMeta(ev);
      if (sSched) sSched.innerHTML = renderSchedule(ev);
      if (sLoc) sLoc.innerHTML = renderLocation(ev);
      if (sPrice) sPrice.innerHTML = renderPricing(ev);
      if (sTax) sTax.innerHTML = renderTaxonomy(ev);
      if (sMedia) sMedia.innerHTML = renderMedia(ev);
    } else {
      elDetails.innerHTML = renderDetails(ev);

    }
    // PATCH E4: render "Inizio/Fine" nel contenitore #eventSchedule usando il formatter "smart"
    const secSchedule = document.getElementById("eventSchedule");
    if (secSchedule) {
      const start = ev?.dateStart || ev?.date; // fallback: usa dateStart, se assente usa date
      const end = ev?.dateEnd || ev?.endDate; // compat: supporta endDate se presente

      // usa formatDateSmart già definita in alto
      const startHtml = `<p><strong>Inizio:</strong> ${formatDateSmart(start)}</p>`;
      const endHtml = end ? `<p><strong>Fine:</strong> ${formatDateSmart(end)}</p>` : "";

      secSchedule.innerHTML = `${startHtml}${endHtml}`;
    }
    // --- PATCH: Recensioni (setup sezione) ---
    const secReviews = document.getElementById("eventReviews");
    const formReview = document.getElementById("reviewForm");
    const hint = document.getElementById("reviewHint");

    if (secReviews) {
      // Lista recensioni approvate (pubbliche)
loadReviewsList(eventId, token, myId, statusRaw, statusLabel);

      // Regole di visibilità form
      const allowed = canUserReview(ev, myId);
      if (!allowed) {
        // Mostra motivo (evento non concluso o non participant)
        const msgs = [];
        if (!eventHasEnded(ev)) msgs.push("Le recensioni si possono lasciare solo a evento concluso.");
        if (!isParticipantOf(ev, myId)) msgs.push("Solo i partecipanti possono lasciare una recensione.");
        if (hint) hint.textContent = msgs.join(" ");
        if (formReview) formReview.style.display = "none";
      } else {
        if (hint) hint.textContent = "La tua recensione sarà visibile dopo l’approvazione.";
        if (formReview) formReview.style.display = "";
        // Submit recensione
        formReview?.addEventListener("submit", async (e) => {
          e.preventDefault();
          const rating = document.getElementById("reviewRating")?.value || "";
          const comment = (document.getElementById("reviewComment")?.value || "").trim();
          try {
            const out = await apiPost("/reviews", { event: eventId, rating, comment }, token);
            if (!out?.ok) throw new Error(out?.error || "Invio non riuscito");
            showAlert("Recensione inviata: in attesa di approvazione", "success", { autoHideMs: 3000 });
            // ricarica lista (mostrerà solo approved; la tua comparirà dopo approvazione)
loadReviewsList(eventId, token, myId, statusRaw, statusLabel);
            formReview.reset();
} catch (err) {
  const status = err?.status || err?.response?.status || null;
  const msg = String(err?.message || "");
  if (status === 409 || /already reviewed/i.test(msg) || /già recensito/i.test(msg)) {
    showAlert("Hai già recensito questo evento.", "warning", { autoHideMs: 4000 });
  } else {
    showAlert(msg || "Invio non riuscito", "error", { autoHideMs: 4000 });
  }
}
        });
      }
    }

    // -----------------------------------------------------------------------
// Gestione globale di #edit (funziona sia con layout modulare che fallback)
(() => {
  try {
    if (String(location.hash || "").toLowerCase() !== "#edit") return;

    const apprNow = String(ev?.approvalStatus || "").toLowerCase();
    if (apprNow === "blocked") {
      showAlert("Evento bloccato dall’amministratore: modifica non consentita.", "error", { autoHideMs: 4000 });
      return; // resta in dettagli
    }

    // Nascondi le sezioni modulari, se presenti
    [sMeta, sSched, sLoc, sPrice, sTax, sMedia].forEach(sec => {
      if (sec) sec.setAttribute("hidden", "");
    });

    // Assicurati di avere un contenitore host per il form
    let host = document.getElementById("eventDetails");
    if (!host) {
      host = document.createElement("section");
      host.id = "eventDetails";
      const main = document.querySelector("main") || document.body;
      main.appendChild(host);
    }

    // Render del form di modifica
    // PATCH F1: gestione #edit demandata al blocco "isOwner" sottostante (btnEdit auto-click),
    // per evitare doppio form e submit senza listener → esce subito.
    return;
    host.innerHTML = renderEditForm(ev);

    host.innerHTML = renderEditForm(ev);
  } catch {/* silente */}
})();

    // Determina proprietà reale dell'evento
    const evOrganizerId = (ev.organizer && typeof ev.organizer === "object" && ev.organizer._id)
      ? ev.organizer._id
      : ev.organizer;
    const isOwner = String(evOrganizerId || "") === String(myId || "");
    const btnChat = document.getElementById("btnChatEvento");
     if (btnChat) btnChat.href = `pages/rooms.html?eventId=${encodeURIComponent(ev._id)}`;
     const btnDM = document.getElementById("btnDMOrganizzatore");
      if (btnDM && evOrganizerId) btnDM.href = `messages.html?to=${encodeURIComponent(evOrganizerId)}`;

    if (isOwner) {
      btnToggle.style.display = "none";

      const adminBar = document.createElement("div");
      adminBar.className = "event-actions";
      const btnEdit = document.createElement("button");
      btnEdit.className = "btn btn-primary";
      btnEdit.textContent = "Modifica";
      const appr = String(ev?.approvalStatus || "").toLowerCase();
      if (appr === "blocked") {
        btnEdit.disabled = true;
        btnEdit.title = "Evento bloccato — contatta l’amministratore";
      } else if (appr === "approved") {
        btnEdit.title = "Modificando, l’evento tornerà in revisione (pending) al salvataggio";
      } else if (appr === "rejected") {
        btnEdit.title = ev?.moderation?.reason
          ? ("Rifiutato: " + ev.moderation.reason + " — Correggi e ripresenta")
          : "Rifiutato — Correggi e ripresenta";
      }
      const btnDel = document.createElement("button");
      btnDel.className = "btn btn-secondary";
      btnDel.textContent = "Elimina";

      adminBar.appendChild(btnEdit);
      adminBar.appendChild(btnDel);
      elDetails.appendChild(adminBar);

      btnEdit.addEventListener("click", () => {
        // Render form di modifica
        elDetails.innerHTML = renderEditForm(ev);
        // Guard UX in base allo stato (policy)
        const apprNow = String(ev?.approvalStatus || "").toLowerCase();
        if (apprNow === "blocked") {
          showAlert("Evento bloccato dall’amministratore: modifica non consentita.", "error", { autoHideMs: 4000 });
          // Non entra in edit: torna ai dettagli
          elDetails.innerHTML = renderDetails(ev);
          return;
        }
        if (apprNow === "approved") {
          showAlert("Attenzione: salvando l’evento tornerà in revisione (pending).", "info");
        }
        if (apprNow === "rejected") {
          const r = ev?.moderation?.reason ? (" — Motivo: " + ev.moderation.reason) : "";
          showAlert("Evento rifiutato. Correggi e ripresenta" + r, "info");
        }
        const form = document.getElementById("editEventForm");
        const btnCancel = document.getElementById("btnCancelEdit");
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const payload = buildUpdatePayloadFromForm(form);
          // Validazioni minime client
          if (!payload.title || !payload.category || !payload.region || !payload.country || !payload.dateStart) {
            showAlert("Compila i campi obbligatori (titolo, categoria, regione, paese, inizio).", "error", { autoHideMs: 4000 });
            return;
          }
          if (payload.dateEnd && payload.dateEnd <= payload.dateStart) {
            showAlert("La data di fine deve essere successiva all’inizio.", "error", { autoHideMs: 4000 });
            return;
          }
          try {
            console.debug("PUT /events payload", { eventId, payload });

const res = await apiPut(`/events/${eventId}`, payload, token);
if (!res?.ok) {
// Mostra esattamente cosa ha detto il server (403, 400, 422, ecc.)
const msg = res?.message || res?.error || "Aggiornamento non riuscito";
showAlert(`Salvataggio fallito (${res?.status || "?"}): ${msg}`, "error");
console.warn("Update event failed", res);
return; // non ricaricare, lascia i campi così come sono
}
            console.debug("PUT /events OK", res);
showAlert("Evento aggiornato", "success", { autoHideMs: 2000 });
            return; // temporaneamnente niente reload: leggiamo la risposta in Network
// Cache-busting: ricarica la pagina aggiungendo un parametro _=timestamp
setTimeout(() => {
const u = new URL(window.location.href);
u.searchParams.set("_", Date.now().toString());
window.location.href = u.toString();
}, 600);
          } catch (err) {
            showAlert(err?.message || "Errore di rete", "error", { autoHideMs: 4000 });
          }
        });
        btnCancel.addEventListener("click", () => {
          window.location.reload();
        });
      });

      // Auto-enter edit mode se si arriva con #edit (robusto)
      if (String(location.hash || "").toLowerCase() === "#edit") {
        // doppia chance per evitare race-condition col rendering
        setTimeout(() => btnEdit?.click(), 0);
        setTimeout(() => { if (!document.getElementById("editEventForm")) btnEdit?.click(); }, 200);
      }

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
      let isJoined = Array.isArray(ev.participants)
        && ev.participants.some((pid) => String(pid) === String(myId));

      const setToggleLabel = () => {
        // testo compatto e coerente ovunque
        btnToggle.textContent = isJoined ? "Annulla" : "Partecipa";
      };

// Mostra il bottone e, se l'evento è già concluso, disabilitalo
        btnToggle.style.display = "inline-block";
        if (eventHasEnded(ev)) {
          btnToggle.disabled = true;
          btnToggle.textContent = "Evento concluso";
        } else {
          setToggleLabel();
        }


      btnToggle.addEventListener("click", async () => {
        if (btnToggle.disabled) return;
        btnToggle.disabled = true;
        try {
          if (isJoined) {
            const res = await apiPost(`/events/${eventId}/leave`, {}, token);
            if (!res?.ok) throw new Error(res?.error || "Errore annullamento");
            isJoined = false; // aggiorna stato locale
            showAlert("Partecipazione annullata", "success", { autoHideMs: 2500 });
          } else {
            const res = await apiPost(`/events/${eventId}/join`, {}, token);
            if (!res?.ok) throw new Error(res?.error || "Errore partecipazione");
            isJoined = true; // aggiorna stato locale
            showAlert("Iscrizione effettuata", "success", { autoHideMs: 2500 });
          }
          setToggleLabel(); // aggiorna il testo SENZA ricaricare la pagina
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

// Fallback monolitico (compatibile con vecchi template)
function renderDetails(ev) {
  const lines = [];
  if (ev.coverImage) {
    lines.push(`<div class="cover"><img src="${escapeHtml(ev.coverImage)}" alt="Locandina" /></div>`);
  }
  lines.push(`<p><strong>Descrizione:</strong> ${escapeHtml(ev.description || "")}</p>`);
  lines.push(
    `<p><strong>Città/Regione/Paese:</strong> ${escapeHtml(ev.city || "")} / ${escapeHtml(ev.region || "")} / ${escapeHtml(ev.country || "")}</p>`
  );
  lines.push(
    `<p><strong>Categoria:</strong> ${escapeHtml(ev.category || "")} — <strong>Sub:</strong> ${escapeHtml(ev.subcategory || "")}</p>`
  );
  lines.push(
    `<p><strong>Tipo:</strong> ${escapeHtml(ev.type || "")} — <strong>Visibilità:</strong> ${escapeHtml(ev.visibility || "")}</p>`
  );
  // Stato approvazione + motivo moderazione (se rejected/blocked)
  {
    const appr = ev?.approvalStatus ? escapeHtml(ev.approvalStatus) : "";
    if (appr) {
      const reason = (ev?.moderation
        && (ev.approvalStatus === "rejected" || ev.approvalStatus === "blocked")
        && ev.moderation.reason)
        ? (' — <em>Motivo: ' + escapeHtml(ev.moderation.reason) + '</em>')
        : '';
      lines.push(`<p><strong>Stato:</strong> ${appr}${reason}</p>`);
    }
  }
  // PATCH E3: "Quando" con intervallo smart (usa date/dateStart e endDate/dateEnd)
  {
    const start = ev?.date || ev?.dateStart;
    const end = ev?.endDate || ev?.dateEnd;
    lines.push(`<p><strong>Quando:</strong> ${formatRangeSmart(start, end)}</p>`);
  }
  // PATCH: prezzo + currency (fallback EUR)
  lines.push(
    `<p><strong>Prezzo:</strong> ${
      ev.isFree ? "Gratuito" : (ev.price != null ? `${escapeHtml(ev.price)} ${escapeHtml(ev.currency || "EUR")}` : "-")
    }</p>`
  );
  if (Array.isArray(ev.images) && ev.images.length) {
    lines.push(
      `<div class="gallery">${ev.images
        .map((url) => `<img src="${escapeHtml(url)}" alt="Immagine evento" />`)
        .join("")}</div>`
    );
  }
  return lines.join("\n");
}

// --- Rendering modulare per sezioni (usato se i contenitori sono presenti in evento.html) ---
function renderMeta(ev) {
  const vis = escapeHtml(ev.visibility || "");
  const lang = escapeHtml(ev.language || "");
  const tgt = escapeHtml(ev.target || "");
  const org =
    ev.organizer && typeof ev.organizer === "object"
      ? (ev.organizer.name || ev.organizer.email || ev.organizer._id || "")
      : "";
  const orgEsc = escapeHtml(org || "");
  const parts = [
    vis ? `<p><strong>Visibilità:</strong> ${vis}</p>` : "",
    lang ? `<p><strong>Lingua:</strong> ${lang}</p>` : "",
    tgt ? `<p><strong>Target:</strong> ${tgt}</p>` : "",
    orgEsc ? `<p><strong>Organizzatore:</strong> ${orgEsc}</p>` : "",
  ].filter(Boolean);
  // Stato approvazione + motivo moderazione (se rejected/blocked)
  {
    const appr = ev?.approvalStatus ? escapeHtml(ev.approvalStatus) : "";
    if (appr) {
      const reason = (ev?.moderation
        && (ev.approvalStatus === "rejected" || ev.approvalStatus === "blocked")
        && ev.moderation.reason)
        ? (' — <em>Motivo: ' + escapeHtml(ev.moderation.reason) + '</em>')
        : '';
      parts.push(`<p><strong>Stato:</strong> ${appr}${reason}</p>`);
    }
  }
  return parts.join("\n");
}

function renderSchedule(ev) {
  const start = ev?.date || ev?.dateStart;
  const end = ev?.endDate || ev?.dateEnd;
  const parts = [];
  parts.push(`<p><strong>Inizio:</strong> ${formatDateSmart(start)}</p>`);
  if (end) parts.push(`<p><strong>Fine:</strong> ${formatDateSmart(end)}</p>`);
  return parts.join("\n");
}

function renderLocation(ev) {
  const parts = [];
  if (ev.venueName) parts.push(`<p><strong>Luogo:</strong> ${escapeHtml(ev.venueName)}</p>`);
  const addrBits = [
    ev.street ? escapeHtml(ev.street) : "",
    ev.streetNumber ? escapeHtml(ev.streetNumber) : "",
    ev.postalCode ? escapeHtml(ev.postalCode) : "",
  ]
    .filter(Boolean)
    .join(", ");
  if (addrBits) parts.push(`<p><strong>Indirizzo:</strong> ${addrBits}</p>`);
  const locBits = [ev.city, ev.province, ev.region, ev.country].filter(Boolean).map(escapeHtml).join(" / ");
  if (locBits) parts.push(`<p><strong>Città/Provincia/Regione/Paese:</strong> ${locBits}</p>`);
  return parts.join("\n");
}

function renderPricing(ev) {
  if (ev.isFree) return `<p><strong>Prezzo:</strong> Gratuito</p>`;
  const price = ev.price != null ? String(ev.price) : null;
  const curr = ev.currency || "EUR";
  return `<p><strong>Prezzo:</strong> ${price ? `${escapeHtml(price)} ${escapeHtml(curr)}` : "-"}</p>`;
}

function renderTaxonomy(ev) {
  const parts = [];
  const cat = ev.category ? escapeHtml(ev.category) : "";
  const sub = ev.subcategory ? escapeHtml(ev.subcategory) : "";
  if (cat || sub) {
    parts.push(`<p><strong>Categoria:</strong> ${cat}${sub ? ` — <strong>Sub:</strong> ${sub}` : ""}</p>`);
  }
  if (Array.isArray(ev.tags) && ev.tags.length) {
    parts.push(
      `<p><strong>Tag:</strong> ${ev.tags.map((t) => `<span class="tag">${escapeHtml(String(t))}</span>`).join(" ")}</p>`
    );
  }
  return parts.join("\n");
}

function renderMedia(ev) {
  const parts = [];
  if (ev.coverImage) {
    parts.push(`<div class="cover"><img src="${escapeHtml(ev.coverImage)}" alt="Locandina" /></div>`);
  }
  if (Array.isArray(ev.images) && ev.images.length) {
    parts.push(
      `<div class="gallery">${ev.images
        .map((u) => `<img src="${escapeHtml(u)}" alt="Immagine evento" />`)
        .join("")}</div>`
    );
  }
  return parts.join("\n");
}

// --- Edit Form (Modifica Evento) ---
function renderEditForm(ev) {
  const startISO = ev.dateStart ? new Date(ev.dateStart) : (ev.date ? new Date(ev.date) : null);
  const endISO = ev.dateEnd ? new Date(ev.dateEnd) : (ev.endDate ? new Date(ev.endDate) : null);
  // to 'YYYY-MM-DDTHH:MM' for datetime-local
  const toLocalInput = (d) => {
    try {
      if (!d || isNaN(d.getTime())) return "";
      const pad = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ""; }
  };
  const isFree = !!ev.isFree || Number(ev.price) === 0;

  return `
  <section class="edit-event">
    <h2>Modifica evento</h2>
    <form id="editEventForm" class="form">
      <div class="form-row">
        <label for="fTitle">Titolo *</label>
        <input id="fTitle" type="text" required value="${escapeHtml(ev.title || "")}">
      </div>

      <div class="form-row">
        <label for="fDescription">Descrizione</label>
        <textarea id="fDescription" rows="5">${escapeHtml(ev.description || "")}</textarea>
      </div>

      <div class="form-row">
        <label for="fCategory">Categoria *</label>
        <input id="fCategory" type="text" required value="${escapeHtml(ev.category || "")}">
      </div>
      <div class="form-row">
        <label for="fSubcategory">Sottocategoria</label>
        <input id="fSubcategory" type="text" value="${escapeHtml(ev.subcategory || "")}">
      </div>

      <div class="form-row grid-2">
        <div>
          <label for="fDateStart">Inizio *</label>
          <input id="fDateStart" type="datetime-local" required value="${toLocalInput(startISO)}">
        </div>
        <div>
          <label for="fDateEnd">Fine</label>
          <input id="fDateEnd" type="datetime-local" value="${toLocalInput(endISO)}">
        </div>
      </div>

      <div class="form-row grid-3">
        <div>
          <label for="fCity">Città</label>
          <input id="fCity" type="text" value="${escapeHtml(ev.city || "")}">
        </div>
        <div>
          <label for="fRegion">Regione *</label>
          <input id="fRegion" type="text" required value="${escapeHtml(ev.region || "")}">
        </div>
        <div>
          <label for="fCountry">Paese *</label>
          <input id="fCountry" type="text" required value="${escapeHtml(ev.country || "")}">
        </div>
      </div>

      <div class="form-row grid-3">
        <div>
          <label for="fLanguage">Lingua</label>
          <input id="fLanguage" type="text" value="${escapeHtml(ev.language || "")}">
        </div>
        <div>
          <label for="fTarget">Target</label>
          <input id="fTarget" type="text" value="${escapeHtml(ev.target || "")}">
        </div>
        <div>
          <label for="fVisibility">Visibilità</label>
          <select id="fVisibility">
            <option value="public" ${ev.visibility === "public" ? "selected" : ""}>Pubblico</option>
            <option value="draft" ${ev.visibility === "draft" ? "selected" : ""}>Bozza</option>
            <option value="private" ${ev.visibility === "private" ? "selected" : ""}>Privato</option>
          </select>
        </div>
      </div>

      <div class="form-row grid-3">
        <div>
          <label><input id="fIsFree" type="checkbox" ${isFree ? "checked" : ""}> Gratuito</label>
        </div>
        <div>
          <label for="fPrice">Prezzo</label>
          <input id="fPrice" type="number" min="0" step="0.01" value="${Number(ev.price) || 0}">
        </div>
        <div>
          <label for="fCurrency">Valuta</label>
          <input id="fCurrency" type="text" maxlength="3" value="${escapeHtml(ev.currency || "EUR")}">
        </div>
      </div>

      <div class="form-row">
        <label for="fTicketUrl">Link biglietti</label>
        <input id="fTicketUrl" type="url" value="${escapeHtml(ev.ticketUrl || "")}">
      </div>

      <div class="form-row actions">
        <button type="button" id="btnCancelEdit" class="btn">Annulla</button>
        <button type="submit" id="btnSaveEdit" class="btn btn-primary">Salva modifiche</button>
      </div>
    </form>
  </section>`;
}

// Costruisce payload coerente con BE
function buildUpdatePayloadFromForm(form) {
  const v = (id) => form.querySelector(id);
  const parseDateLocal = (input) => {
    const v = (input?.value || "").trim();
    if (!v) return null;
    // interpret as local time (Europe/Rome) and convert to ISO (UTC)
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const isFree = v("#fIsFree")?.checked === true;
  let price = Number(v("#fPrice")?.value || 0);
  if (Number.isNaN(price) || price < 0) price = 0;

  let currency = (v("#fCurrency")?.value || "").trim().toUpperCase();
  if (!currency) currency = "EUR";

  const payload = {
    title: (v("#fTitle")?.value || "").trim(),
    description: (v("#fDescription")?.value || "").trim(),
    category: (v("#fCategory")?.value || "").trim(),
    subcategory: (v("#fSubcategory")?.value || "").trim(),
    city: (v("#fCity")?.value || "").trim(),
    region: (v("#fRegion")?.value || "").trim(),
    country: (v("#fCountry")?.value || "").trim(),
    language: (v("#fLanguage")?.value || "").trim(),
    target: (v("#fTarget")?.value || "").trim(),
    visibility: (v("#fVisibility")?.value || "").trim() || "public",
    isFree,
    price,
    currency,
    ticketUrl: (v("#fTicketUrl")?.value || "").trim(),
  };

  const ds = parseDateLocal(v("#fDateStart"));
  const de = parseDateLocal(v("#fDateEnd"));
  if (ds) payload.dateStart = ds;
  if (de) payload.dateEnd = de;

  return payload;
}

















