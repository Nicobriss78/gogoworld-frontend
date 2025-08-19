
// organizzatore.js — "miei eventi" (API /events/mine), form PRO, CRUD, publish/unpublish, switch di sessionRole
document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("myEventsContainer");
  const form = document.getElementById("createEventForm");
  const editModal = document.getElementById("editModal");
  const editForm = document.getElementById("editEventForm");
  const btnLogout = document.getElementById("logoutBtn");
  const btnSwitch = document.getElementById("switchRoleBtn");

  const F = (id) => document.getElementById(id);
  function token() { return localStorage.getItem("token") || ""; }

  async function fetchJSON(url, opts = {}) {
    const resp = await fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token()}`,
        ...(opts.headers || {})
      }
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json();
  }

  function toISO(v) { if (!v) return ""; const d = new Date(v); return isNaN(d) ? "" : d.toISOString(); }
  function dtLocal(v) { if (!v) return ""; try { return String(v).substring(0,16); } catch { return ""; } }

  function renderList(events) {
    if (list) list.innerHTML = "";
    (events || []).forEach(ev => {
      const div = document.createElement("div");
      div.className = "event-card";
      const when = ev.dateStart ? new Date(ev.dateStart).toLocaleString("it-IT") : "";
      const where = [ev.city, ev.province, ev.region, ev.country].filter(Boolean).join(", ");
      div.innerHTML = `
        <h3>${ev.title || "Senza titolo"}
          ${ev.visibility ? `<span class="badge">${ev.visibility}</span>` : ""}
          ${ev.status ? `<span class="badge">${ev.status}</span>` : ""}
        </h3>
        <p>${where || ""} ${when ? " · " + when : ""}</p>
        <p>${ev.category || ""} ${ev.subcategory ? " · " + ev.subcategory : ""} ${ev.type ? " · " + ev.type : ""}</p>
        <div class="actions">
          <button class="edit" data-id="${ev._id}">Modifica</button>
          <button class="publish" data-id="${ev._id}" data-on="${ev.status !== "published"}">
            ${ev.status === "published" ? "Metti in bozza" : "Pubblica"}
          </button>
          <button class="delete" data-id="${ev._id}">Elimina</button>
        </div>
      `;
      list && list.appendChild(div);
    });
    if (list && (!events || events.length === 0)) {
      list.innerHTML = "<p>Nessun evento creato.</p>";
    }
  }

  async function loadMine() {
    if (list) list.innerHTML = "<p>Caricamento...</p>";
    try {
      const data = await fetchJSON(`/api/events/mine`);
      renderList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      if (list) list.innerHTML = "<p>Errore durante il caricamento.</p>";
    }
  }

  // ====== CREATE ======
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const payload = {
          title: F("title")?.value || "",
          description: F("description")?.value || "",
          dateStart: toISO(F("dateStart")?.value || ""),
          dateEnd: toISO(F("dateEnd")?.value || ""),
          timezone: F("timezone")?.value || "",
          venueName: F("venueName")?.value || "",
          address: F("address")?.value || "",
          city: F("city")?.value || "",
          province: F("province")?.value || "",
          region: F("region")?.value || "",
          country: F("country")?.value || "",
          category: F("category")?.value || "",
          subcategory: F("subcategory")?.value || "",
          type: F("type")?.value || "",
          visibility: F("visibility")?.value || "public",
          status: F("status")?.value || "draft",
          isFree: F("isFree")?.checked === true,
          priceMin: F("priceMin")?.value ? Number(F("priceMin").value) : undefined,
          priceMax: F("priceMax")?.value ? Number(F("priceMax").value) : undefined,
          currency: F("currency")?.value || "",
          capacity: F("capacity")?.value ? Number(F("capacity").value) : undefined,
          images: F("imageUrl")?.value ? [F("imageUrl").value] : undefined,
          externalUrl: F("externalUrl")?.value || "",
          contactEmail: F("contactEmail")?.value || "",
          contactPhone: F("contactPhone")?.value || "",
        };
        await fetchJSON(`/api/events`, { method: "POST", body: JSON.stringify(payload) });
        form.reset();
        await loadMine();
      } catch (err) {
        console.error(err);
        alert("Creazione non riuscita.");
      }
    });
  }

  // ====== OPEN EDIT ======
  async function openEdit(id) {
    try {
      const ev = await fetchJSON(`/api/events/${id}`);
      // fill
      F("edit_id").value = id;
      F("edit_title").value = ev.title || "";
      F("edit_description").value = ev.description || "";
      F("edit_dateStart").value = dtLocal(ev.dateStart);
      F("edit_dateEnd").value = dtLocal(ev.dateEnd);
      F("edit_timezone").value = ev.timezone || "";
      F("edit_venueName").value = ev.venueName || "";
      F("edit_address").value = ev.address || "";
      F("edit_city").value = ev.city || "";
      F("edit_province").value = ev.province || "";
      F("edit_region").value = ev.region || "";
      F("edit_country").value = ev.country || "";
      F("edit_category").value = ev.category || "";
      F("edit_subcategory").value = ev.subcategory || "";
      F("edit_type").value = ev.type || "";
      F("edit_visibility").value = ev.visibility || "public";
      F("edit_status").value = ev.status || "draft";
      F("edit_isFree").checked = !!ev.isFree;
      F("edit_priceMin").value = ev.priceMin ?? "";
      F("edit_priceMax").value = ev.priceMax ?? "";
      F("edit_currency").value = ev.currency || "";
      F("edit_capacity").value = ev.capacity ?? "";
      F("edit_imageUrl").value = Array.isArray(ev.images) && ev.images.length ? ev.images[0] : "";
      F("edit_externalUrl").value = ev.externalUrl || "";
      F("edit_contactEmail").value = ev.contactEmail || "";
      F("edit_contactPhone").value = ev.contactPhone || "";

      if (editModal) editModal.style.display = "flex";
    } catch (err) {
      console.error(err);
      alert("Impossibile aprire l'evento per la modifica.");
    }
  }

  // ====== SAVE EDIT ======
  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = F("edit_id")?.value;
      if (!id) return alert("ID mancante.");

      try {
        const payload = {
          title: F("edit_title")?.value || "",
          description: F("edit_description")?.value || "",
          dateStart: toISO(F("edit_dateStart")?.value || ""),
          dateEnd: toISO(F("edit_dateEnd")?.value || ""),
          timezone: F("edit_timezone")?.value || "",
          venueName: F("edit_venueName")?.value || "",
          address: F("edit_address")?.value || "",
          city: F("edit_city")?.value || "",
          province: F("edit_province")?.value || "",
          region: F("edit_region")?.value || "",
          country: F("edit_country")?.value || "",
          category: F("edit_category")?.value || "",
          subcategory: F("edit_subcategory")?.value || "",
          type: F("edit_type")?.value || "",
          visibility: F("edit_visibility")?.value || "public",
          status: F("edit_status")?.value || "draft",
          isFree: F("edit_isFree")?.checked === true,
          priceMin: F("edit_priceMin")?.value ? Number(F("edit_priceMin").value) : undefined,
          priceMax: F("edit_priceMax")?.value ? Number(F("edit_priceMax").value) : undefined,
          currency: F("edit_currency")?.value || "",
          capacity: F("edit_capacity")?.value ? Number(F("edit_capacity").value) : undefined,
          images: F("edit_imageUrl")?.value ? [F("edit_imageUrl").value] : undefined,
          externalUrl: F("edit_externalUrl")?.value || "",
          contactEmail: F("edit_contactEmail")?.value || "",
          contactPhone: F("edit_contactPhone")?.value || "",
        };
        await fetchJSON(`/api/events/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        if (editModal) editModal.style.display = "none";
        editForm.reset();
        await loadMine();
      } catch (err) {
        console.error(err);
        alert("Aggiornamento non riuscito.");
      }
    });
  }

  // ====== PUBLISH / DELETE ======
  if (list) {
    list.addEventListener("click", async (e) => {
      const btnEdit = e.target.closest(".edit");
      const btnPub = e.target.closest(".publish");
      const btnDel = e.target.closest(".delete");

      try {
        if (btnEdit) {
          await openEdit(btnEdit.dataset.id);
        }
        if (btnPub) {
          const id = btnPub.dataset.id;
          const makePublished = btnPub.dataset.on === "true";
          await fetchJSON(`/api/events/${id}`, { method: "PUT", body: JSON.stringify({ status: makePublished ? "published" : "draft" }) });
          await loadMine();
        }
        if (btnDel) {
          const id = btnDel.dataset.id;
          if (!confirm("Eliminare l'evento?")) return;
          await fetchJSON(`/api/events/${id}`, { method: "DELETE" });
          await loadMine();
        }
      } catch (err) {
        console.error(err);
        alert("Azione non riuscita.");
      }
    });
  }

  // ====== SWITCH ROLE ======
  if (btnSwitch) {
    btnSwitch.addEventListener("click", async () => {
      try {
        const out = await fetchJSON(`/api/users/session-role`, {
          method: "PUT",
          body: JSON.stringify({ sessionRole: "participant" })
        });
        localStorage.setItem("token", out.token);
        localStorage.setItem("sessionRole", out.sessionRole);
        window.location.href = "partecipante.html";
      } catch (err) {
        console.error(err);
        alert("Impossibile cambiare ruolo.");
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "index.html";
    });
  }

  loadMine();
  // (Opzionale) Real-time leggero
  // setInterval(loadMine, 20000);
});







