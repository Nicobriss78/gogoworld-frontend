// frontend/js/home-cards.js
// Renderer card evento (Home UI v2) — estratto da partecipante.js

// Helper: format event date using available fields (date | dateStart [– endDate/dateEnd])
function formatEventDate(ev) {
  try {
    const start = ev?.date || ev?.dateStart;
    const end = ev?.endDate || ev?.dateEnd;
    if (!start && !end) return "";
    const startStr = start ? new Date(start).toLocaleDateString() : "";
    if (end) {
      const endStr = new Date(end).toLocaleDateString();
      if (startStr && endStr && startStr !== endStr) {
        return `${startStr} – ${endStr}`;
      }
    }
    return startStr;
  } catch {
    return "";
  }
}

// helper per badge di stato
function renderStatus(status) {
  if (!status) return "";
  const labelMap = {
    ongoing: "In corso",
    imminent: "Imminente",
    future: "Futuro",
    concluded: "Concluso",
    past: "Passato",
  };
  const text = labelMap[status] || status;
  return `<p class="status ${status}">${text}</p>`;
}

// >>> UI v2: rendering card per Home (carosello orizzontale)
export const renderEventCard = (ev, includeLeave) => {
  const rawStatus = String(ev?.status || "").toLowerCase();

  const priceStr = ev?.isFree
    ? "Gratuito"
    : (ev?.price != null ? `${ev.price} ${ev.currency || "EUR"}` : "-");

  const whereLine =
    `${ev.city || ""}` +
    `${ev.region ? " • " + ev.region : ""}` +
    `${ev.country ? " • " + ev.country : ""}`;

  const when = formatEventDate(ev);

  // Azioni: in card lasciamo SOLO un’icona "Info" (Dettagli)
  const infoHtml = `
    <button class="gw-info-btn"
      type="button"
      title="Dettagli evento"
      aria-label="Dettagli evento"
      data-id="${ev._id}"
      data-action="details">ℹ️</button>
  `;

  return `
    <article class="gw-rail event-card" data-status="${rawStatus}" data-event-id="${ev._id}">
      ${infoHtml}

      <div class="gw-card-scroll">
        <div class="gw-thumb"></div>

        <div class="content">
          <h3 class="title">${ev.title || "(Senza titolo)"}</h3>
          ${renderStatus(ev.status)}
          <div class="meta">
            ${whereLine ? `<span>${whereLine}</span>` : ""}
            ${when ? `<span>${when}</span>` : ""}
          </div>

          <div class="meta" style="margin-top:6px;">
            <span><strong>Categoria:</strong> ${ev.category || ""}${ev.subcategory ? " • " + ev.subcategory : ""}</span>
          </div>

          <div class="meta" style="margin-top:4px;">
            <span><strong>Lingua/Target:</strong> ${ev.language || ""}${ev.target ? " • " + ev.target : ""}</span>
          </div>

          <div class="meta" style="margin-top:4px;">
            <span><strong>Prezzo:</strong> ${priceStr}</span>
          </div>
        </div>
      </div>
    </article>
  `;
};
