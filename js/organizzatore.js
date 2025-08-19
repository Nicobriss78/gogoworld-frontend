// GoGo.World — organizzatore.js aggiornato (Fase 0)
// Usa window.API e window.GGW per endpoint relativi e gestione ID/_id
// Funzioni coperte: lista "I miei eventi", crea, modifica, elimina, publish/unpublish (status)

document.addEventListener("DOMContentLoaded", () => {
  const listContainer = document.getElementById("myEventsContainer");
  const createForm = document.getElementById("createEventForm");
  const editModal = document.getElementById("editModal"); // opzionale
  const editForm = document.getElementById("editEventForm"); // opzionale
  const logoutBtn = document.getElementById("logoutBtn");
  const switchRoleBtn = document.getElementById("switchRoleBtn");

  // Helpers UI
  function htmlEscape(s = "") {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
  function statusBadge(status) {
    const st = (status || "draft").toLowerCase();
    return `<span class="badge badge-${st}">${htmlEscape(st)}</span>`;
  }
  function toISO(dateStr) {
    // accetta sia dateStart ISO che una semplice input date/datetime-local
    try {
      if (!dateStr) return "";
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toISOString();
    } catch { return ""; }
  }

  // =========================
  // LISTA "I MIEI EVENTI"
  // =========================
  async function loadMyEvents() {
    if (listContainer) listContainer.innerHTML = "<p>Caricamento eventi...</p>";
    try {
      const mine = await API.events.mine();
      if (!Array.isArray(mine) || mine.length === 0) {
        if (listContainer) listContainer.innerHTML = "<p>Nessun evento creato.</p>";
        return;
      }
      if (listContainer) listContainer.innerHTML = "";
      mine.forEach(ev => {
        const id = GGW.eventId(ev);
        const div = document.createElement("div");
        div.className = "event-card";

        const when = GGW.formatDateTime(ev.dateStart || ev.date);
        const where = ev.city || ev.location || "";
        const capStr = (ev.capacity ? ` — Capienza: ${ev.capacity}` : "");

        div.innerHTML = `
          <h3>${htmlEscape(ev.title || "Senza titolo")}</h3>
          <p>${htmlEscape(where)} — ${htmlEscape(when)} ${capStr}</p>
          <p>Stato: ${statusBadge(ev.status)}</p>
          <div class="actions">
            <button class="editBtn" data-id="${id}">Modifica</button>
            <button class="deleteBtn" data-id="${id}">Elimina</button>
            ${ev.status === "published"
              ? `<button class="unpublishBtn" data-id="${id}">Metti in bozza</button>`
              : `<button class="publishBtn" data-id="${id}">Pubblica</button>`}
          </div>
        `;
        listContainer && listContainer.appendChild(div);
      });
    } catch (err) {
      console.error("Errore caricamento miei eventi:", err);
      if (listContainer) listContainer.innerHTML = "<p>Errore durante il caricamento.</p>";
    }
  }

  // =========================
  // CREA
  // =========================
  async function createEvent(payload) {
    try {
      const normalized = {
        title: (payload.title || "").trim(),
        description: (payload.description || "").trim(),
        dateStart: toISO(payload.dateStart || payload.date),
        dateEnd: toISO(payload.dateEnd || ""),
        city: (payload.city || payload.location || "").trim(),
        address: (payload.address || "").trim(),
        status: (payload.status || "draft").trim(),
        visibility: payload.visibility || "public",
        isFree: payload.isFree === true || payload.isFree === "true",
        price: payload.price ? Number(payload.price) : undefined,
        capacity: payload.capacity ? Number(payload.capacity) : undefined,
        category: payload.category || undefined,
        type: payload.type || undefined
      };
      await API.events.create(normalized);
      alert("Evento creato con successo.");
      await loadMyEvents();
      if (createForm) createForm.reset();
    } catch (err) {
      console.error("Errore creazione evento:", err);
      alert(err?.error || "Errore durante la creazione.");
    }
  }

  if (createForm) {
    createForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const get = (id) => (document.getElementById(id)?.value ?? "").trim();

      createEvent({
        title: get("title"),
        description: get("description"),
        dateStart: document.getElementById("dateStart")?.value || document.getElementById("date")?.value || "",
        dateEnd: document.getElementById("dateEnd")?.value || "",
        city: get("city") || get("location"),
        address: get("address"),
        status: (document.getElementById("status")?.value || "draft"),
        visibility: (document.getElementById("visibility")?.value || "public"),
        isFree: document.getElementById("isFree")?.checked === true,
        price: document.getElementById("price")?.value || "",
        capacity: document.getElementById("capacity")?.value || "",
        category: document.getElementById("category")?.value || "",
        type: document.getElementById("type")?.value || ""
      });
    });
  }

  // =========================
  // MODIFICA / PUBLISH
  // =========================
  async function openEdit(id) {
    try {
      const ev = await API.events.get(id);
      // Popola form di modifica se presente
      if (editForm) {
        const set = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.value = val ?? "";
        };
        set("edit_id", id);
        set("edit_title", ev.title || "");
        set("edit_description", ev.description || "");
        set("edit_dateStart", (ev.dateStart ? ev.dateStart.substring(0, 16) : "")); // per input datetime-local
        set("edit_dateEnd", (ev.dateEnd ? ev.dateEnd.substring(0, 16) : ""));
        set("edit_city", ev.city || ev.location || "");
        set("edit_address", ev.address || "");
        set("edit_status", ev.status || "draft");
        set("edit_visibility", ev.visibility || "public");
        const freeBox = document.getElementById("edit_isFree");
        if (freeBox) freeBox.checked = !!ev.isFree;
        set("edit_price", ev.price ?? "");
        set("edit_capacity", ev.capacity ?? "");
        set("edit_category", ev.category || "");
        set("edit_type", ev.type || "");
      }
      // Mostra modale se esiste
      if (editModal) editModal.style.display = "block";
    } catch (err) {
      console.error("Errore apertura modifica:", err);
      alert("Impossibile aprire l'evento per la modifica.");
    }
  }

  async function saveEdit() {
    try {
      const id = document.getElementById("edit_id")?.value;
      if (!id) return alert("ID evento mancante.");

      const payload = {
        title: document.getElementById("edit_title")?.value || "",
        description: document.getElementById("edit_description")?.value || "",
        dateStart: toISO(document.getElementById("edit_dateStart")?.value || ""),
        dateEnd: toISO(document.getElementById("edit_dateEnd")?.value || ""),
        city: document.getElementById("edit_city")?.value || "",
        address: document.getElementById("edit_address")?.value || "",
        status: document.getElementById("edit_status")?.value || "draft",
        visibility: document.getElementById("edit_visibility")?.value || "public",
        isFree: document.getElementById("edit_isFree")?.checked === true,
        price: document.getElementById("edit_price")?.value || "",
        capacity: document.getElementById("edit_capacity")?.value || "",
        category: document.getElementById("edit_category")?.value || "",
        type: document.getElementById("edit_type")?.value || ""
      };

      await API.events.update(id, payload);
      alert("Evento aggiornato.");
      await loadMyEvents();
      if (editModal) editModal.style.display = "none";
      if (editForm) editForm.reset();
    } catch (err) {
      console.error("Errore salvataggio modifica:", err);
      alert(err?.error || "Errore durante l'aggiornamento.");
    }
  }

  async function publish(id, makePublished) {
    try {
      const payload = { status: makePublished ? "published" : "draft" };
      await API.events.update(id, payload);
      await loadMyEvents();
    } catch (err) {
      console.error("Errore publish/unpublish:", err);
      alert("Errore nel cambio stato.");
    }
  }

  // =========================
  // DELETE
  // =========================
  async function removeEvent(id) {
    if (!confirm("Eliminare definitivamente questo evento?")) return;
    try {
      await API.events.remove(id);
      await loadMyEvents();
    } catch (err) {
      console.error("Errore eliminazione:", err);
      alert("Errore durante l'eliminazione.");
    }
  }

  // =========================
  // Delegazione eventi UI
  // =========================
  if (listContainer) {
    listContainer.addEventListener("click", (e) => {
      const btnEdit = e.target.closest(".editBtn");
      const btnDel = e.target.closest(".deleteBtn");
      const btnPub = e.target.closest(".publishBtn");
      const btnUnp = e.target.closest(".unpublishBtn");

      if (btnEdit) {
        const id = btnEdit.dataset.id;
        openEdit(id);
      }
      if (btnDel) {
        const id = btnDel.dataset.id;
        removeEvent(id);
      }
      if (btnPub) {
        const id = btnPub.dataset.id;
        publish(id, true);
      }
      if (btnUnp) {
        const id = btnUnp.dataset.id;
        publish(id, false);
      }
    });
  }

  // Salvataggio dal form di modifica (se presente)
  if (editForm) {
    editForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveEdit();
    });
  }

  // =========================
  // Logout & Switch Ruolo
  // =========================
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      API.clearToken();
      localStorage.clear();
      window.location.href = "login.html";
    });
  }

  if (switchRoleBtn) {
    switchRoleBtn.addEventListener("click", async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return alert("Utente non identificato.");

      try {
        const resp = await API.put(`/api/users/${userId}/role`, { body: { role: "participant" } });
        if (resp && resp.currentRole === "participant") {
          localStorage.setItem("currentRole", "participant");
          window.location.href = "partecipante.html";
        } else {
          alert("Errore nello switch ruolo.");
        }
      } catch (err) {
        console.error("Errore switch ruolo:", err);
        alert("Errore nello switch ruolo.");
      }
    });
  }

  // Avvio
  loadMyEvents();
});






