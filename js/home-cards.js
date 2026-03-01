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
// escape minimale per attributi HTML (data-*)
// (evita rotture se l'URL contiene virgolette o caratteri speciali)
function escAttr(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
 export const renderEventCard = (ev, includeLeave, opts = {}) => {
  const rawStatus = String(ev?.status || "").toLowerCase();
// Immagine cover evento (supporto robusto a più nomi campo)
const coverUrl =
  ev?.coverImage ||
  (Array.isArray(ev?.images) && ev.images[0]) ||
  ev?.imageUrl ||
  ev?.coverUrl ||
  ev?.cover ||
  ev?.image ||
  ev?.thumbUrl ||
  ev?.thumbnailUrl ||
  "";

  const thumbBgAttr = coverUrl
    ? `data-bg="${escAttr(coverUrl)}"`
    : "";

  const priceStr = ev?.isFree
    ? "Gratuito"
    : (ev?.price != null ? `${ev.price} ${ev.currency || "EUR"}` : "-");

  const whereLine =
    `${ev.city || ""}` +
    `${ev.region ? " • " + ev.region : ""}` +
    `${ev.country ? " • " + ev.country : ""}`;

  const when = formatEventDate(ev);
  // Variante bottone dettagli:
  // - default: ℹ️ (Dettagli evento)
  // - plus: + (Più dettagli / apri scheda completa)
  const detailsVariant = String(opts?.detailsVariant || "info").toLowerCase();
  const detailsIsPlus = detailsVariant === "plus";
  const detailsIcon = detailsIsPlus ? "+" : "ℹ️";
  const detailsTitle = detailsIsPlus ? "Più dettagli" : "Dettagli evento";
  const detailsBtnClass = detailsIsPlus ? "gw-info-btn gw-info-plus" : "gw-info-btn";

// Azioni:
  // - sempre: bottone "Dettagli" (variante: ℹ️ o +)
  // - opzionale: bottone "Chiudi dettaglio" (×) accanto al +, stesso stile/colore del +
  const showCloseDetail = Boolean(opts?.showCloseDetail);

  // Wrapper posizionato in alto a destra; i bottoni sono "static" per evitare collisioni con eventuali CSS assoluti
const infoHtml = `
    <div class="gw-card-actions gw-card-actions--abs">
      <button class="${detailsBtnClass} gw-card-action-btn"
        type="button"
        title="${detailsTitle}"
        aria-label="${detailsTitle}"
        data-id="${ev._id}"
        data-action="details">${detailsIcon}</button>

      ${
        (showCloseDetail && detailsIsPlus)
          ? `<button class="gw-info-btn gw-info-plus gw-card-action-btn"
              type="button"
              title="Chiudi dettaglio"
              aria-label="Chiudi dettaglio"
              data-id="${ev._id}"
              data-action="close-detail">×</button>`
          : ``
      }
    </div>
  `;


  return `
    <article class="gw-rail event-card" data-status="${rawStatus}" data-event-id="${ev._id}">
      ${infoHtml}

      <div class="gw-card-scroll">
<div class="gw-thumb" ${thumbBgAttr}></div>

        <div class="content">
          <h3 class="title">${ev.title || "(Senza titolo)"}</h3>
          ${renderStatus(ev.status)}
          <div class="meta">
            ${whereLine ? `<span>${whereLine}</span>` : ""}
            ${when ? `<span>${when}</span>` : ""}
          </div>

          <div class="meta gw-meta--mt6">
            <span><strong>Categoria:</strong> ${ev.category || ""}${ev.subcategory ? " • " + ev.subcategory : ""}</span>
          </div>

          <div class="meta gw-meta--mt4">
            <span><strong>Lingua/Target:</strong> ${ev.language || ""}${ev.target ? " • " + ev.target : ""}</span>
          </div>

          <div class="meta gw-meta--mt4">
            <span><strong>Prezzo:</strong> ${priceStr}</span>
          </div>
        </div>
      </div>
    </article>
  `;
};
// Applica cover thumb senza inline style nei template
export function applyHomeCardThumbs(root = document) {
  const thumbs = root.querySelectorAll(".event-card .gw-thumb[data-bg]");
  thumbs.forEach((el) => {
    const url = el.getAttribute("data-bg");
    if (!url) return;
    el.style.setProperty("--gw-bg", `url("${url}")`);
  });
}
