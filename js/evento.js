// js/evento.js — dettaglio evento
// TODO UI/UX Overhaul:
// - Layout dettaglio evento (cover, meta grid, azioni) con componenti standard
// - Distinguere chiaramente UI owner vs participant con banner/toolbar dedicata
// - Pulsante “Partecipa/Annulla” con stato loading e toast di esito

import { apiGet, apiPost, apiDelete, apiPut } from "./api.js";

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
    // -----------------------------------------------------------------------

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
  // Render form di modifica
  elDetails.innerHTML = renderEditForm(ev);
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
      const res = await apiPut(`/events/${eventId}`, payload, token);
      if (!res?.ok) throw new Error(res?.error || "Aggiornamento non riuscito");
      showAlert("Evento aggiornato", "success", { autoHideMs: 2000 });
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      showAlert(err?.message || "Errore di rete", "error", { autoHideMs: 4000 });
    }
  });
  btnCancel.addEventListener("click", () => {
    window.location.reload();
  });
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
// PATCH E3: "Quando" con intervallo smart (usa date/dateStart e endDate/dateEnd)
{
  const start = ev?.date || ev?.dateStart;
  const end = ev?.endDate || ev?.dateEnd;
  lines.push(`<p><strong>Quando:</strong> ${formatRangeSmart(start, end)}</p>`);
}  // PATCH: prezzo + currency (fallback EUR)
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






