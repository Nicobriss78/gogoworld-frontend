// GoGo.World — script.js aggiornato (Fase 0)
// Homepage: lista eventi pubblici con link a dettaglio
// Usa window.API e window.GGW per endpoint e ID

document.addEventListener("DOMContentLoaded", () => {
  const eventsContainer = document.getElementById("eventsContainer");

  async function loadEvents() {
    if (eventsContainer) eventsContainer.innerHTML = "<p>Caricamento eventi...</p>";
    try {
      // Carichiamo solo eventi pubblici pubblicati
      const events = await API.events.list({ status: "published", visibility: "public" });
      if (!Array.isArray(events) || events.length === 0) {
        if (eventsContainer) eventsContainer.innerHTML = "<p>Nessun evento trovato.</p>";
        return;
      }

      if (eventsContainer) eventsContainer.innerHTML = "";
      events.forEach(ev => {
        const id = GGW.eventId(ev);
        const card = document.createElement("div");
        card.className = "event-card";

        const when = GGW.formatDateTime(ev.dateStart || ev.date);
        const where = ev.city || ev.location || "";
        const priceStr = ev.isFree ? "Gratuito" :
          (ev.price ? GGW.formatMoney(ev.price, ev.currency || "EUR") : "");

        card.innerHTML = `
          <h3>${ev.title || "Evento senza titolo"}</h3>
          <p>${where ? where + " — " : ""}${when}</p>
          ${priceStr ? `<p class="price">${priceStr}</p>` : ""}
          <a href="evento.html?id=${id}" class="detailsBtn">Dettagli</a>
        `;

        eventsContainer.appendChild(card);
      });
    } catch (err) {
      console.error("Errore caricamento eventi:", err);
      if (eventsContainer) eventsContainer.innerHTML = "<p>Errore durante il caricamento eventi.</p>";
    }
  }

  loadEvents();
});

