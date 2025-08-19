// GoGo.World — evento.js aggiornato (Fase 0)
// Dettaglio evento: carica dati tramite window.API con endpoint relativi
// Gestisce CTA (partecipa/annulla) e link mappa. Usa GGW.eventId per coerenza _id.

document.addEventListener("DOMContentLoaded", () => {
  const detailContainer = document.getElementById("eventDetail");
  const joinBtn = document.getElementById("joinBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const backBtn = document.getElementById("backBtn");

  const qs = GGW.parseQS();
  // In questa versione consideriamo `id` come parametro query string contenente l'_id Mongo.
  const eventId = qs.id || null;

  if (!eventId) {
    if (detailContainer) {
      detailContainer.innerHTML = "<p>Evento non specificato (manca il parametro id).</p>";
    }
    return;
  }

  function htmlEscape(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function mapLink(city, address) {
    const q = [address, city].filter(Boolean).join(", ");
    if (!q) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  async function loadEvent() {
    if (detailContainer) detailContainer.innerHTML = "<p>Caricamento evento...</p>";
    try {
      const ev = await API.events.get(eventId);

      const id = GGW.eventId(ev);
      const when = GGW.formatDateTime(ev.dateStart || ev.date);
      const where = ev.city || ev.location || "";
      const mlink = mapLink(ev.city || "", ev.address || "");
      const priceStr = ev.isFree ? "Gratuito" :
        (ev.price ? GGW.formatMoney(ev.price, ev.currency || "EUR") : "");

      const media = (ev.coverUrl
        ? `<div class="cover"><img src="${htmlEscape(ev.coverUrl)}" alt="cover"></div>`
        : "");

      let actions = `
        <div class="actions">
          <button id="joinBtn" class="joinBtn" data-id="${id}">Partecipa</button>
          <button id="cancelBtn" class="cancelBtn" data-id="${id}">Annulla</button>
        </div>`;

      if (detailContainer) {
        detailContainer.innerHTML = `
          ${media}
          <h2>${htmlEscape(ev.title || "Evento senza titolo")}</h2>
          <p class="meta">
            <span class="when">${htmlEscape(when)}</span>
            ${where ? ` · <span class="where">${htmlEscape(where)}</span>` : ""}
            ${mlink ? ` · <a href="${mlink}" target="_blank" rel="noopener">Apri mappa</a>` : ""}
          </p>
          ${priceStr ? `<p class="price">${htmlEscape(priceStr)}</p>` : ""}
          ${ev.description ? `<p class="desc">${htmlEscape(ev.description)}</p>` : ""}
          ${actions}
        `;
      }

      // Ricollega i bottoni perché abbiamo riscritto innerHTML
      const jb = document.getElementById("joinBtn");
      const cb = document.getElementById("cancelBtn");
      if (jb) jb.addEventListener("click", () => joinEvent(id));
      if (cb) cb.addEventListener("click", () => cancelEvent(id));

    } catch (err) {
      console.error("Errore caricamento evento:", err);
      if (detailContainer) detailContainer.innerHTML = "<p>Errore durante il caricamento del dettaglio.</p>";
    }
  }

  async function joinEvent(id) {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("Utente non identificato. Effettua il login.");
        return;
      }
      await API.post(`/api/users/${userId}/partecipa`, { body: { eventId: id } });
      alert("Partecipazione confermata!");
      loadEvent();
    } catch (err) {
      console.error("Errore partecipazione:", err);
      alert("Errore durante la partecipazione all'evento.");
    }
  }

  async function cancelEvent(id) {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        alert("Utente non identificato. Effettua il login.");
        return;
      }
      await API.post(`/api/users/${userId}/annulla`, { body: { eventId: id } });
      alert("Partecipazione annullata.");
      loadEvent();
    } catch (err) {
      console.error("Errore annullamento:", err);
      alert("Errore durante l'annullamento.");
    }
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      // Torna al listing principale partecipante
      window.location.href = "partecipante.html";
    });
  }

  loadEvent();
});

