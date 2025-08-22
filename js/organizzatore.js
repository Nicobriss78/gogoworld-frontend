// organizzatore.js — create/edit/delete + filtri + immagini + validazione date + switch ruolo con fallback
document.addEventListener("DOMContentLoaded", () => {
  const myBox = document.getElementById("myEventsContainer");
  const createForm = document.getElementById("createEventForm");
  const editForm = document.getElementById("editEventForm");
  const editModal = document.getElementById("editModal");
  const btnLogout = document.getElementById("logoutBtn");
  const btnSwitch = document.getElementById("switchRoleBtn");
  const welcome = document.getElementById("welcome");

  const token = () => localStorage.getItem("token") || "";
  const sessRole = () => localStorage.getItem("sessionRole") || "participant";
  if (welcome) welcome.textContent = `Ciao! Sei in sessione come ${sessRole()}`;

  function authHeaders() {
    const h = { "Content-Type": "application/json" };
    const t = token(); if (t) h.Authorization = `Bearer ${t}`;
    return h;
  }
  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, { method: opts.method || "GET", headers: authHeaders(), body: opts.body ? JSON.stringify(opts.body) : undefined });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        if (err && (err.error || err.message)) msg = (err.error || err.message);
      } catch {}
      throw new Error(msg);
    }
    return res.json();
  }
  const val = (id) => document.getElementById(id)?.value?.trim() || "";
  const bool = (id) => !!document.getElementById(id)?.checked;
  const num = (id) => { const x = +val(id); return Number.isFinite(x) ? x : undefined; };

  function parseImagesText(text) {
    if (!text) return [];
    return text.split(/\r?\n|,/g).map(s => s.trim()).filter(Boolean);
  }

  function ensureValidDateRange(startStr, endStr) {
    if (!startStr || !endStr) return true;
    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    if (Number.isFinite(start) && Number.isFinite(end) && end < start) {
      alert("La data di fine non può essere precedente alla data di inizio.");
      return false;
    }
    return true;
  }

  function renderList(items) {
    myBox.innerHTML = "";
    items.forEach(ev => {
      const el = document.createElement("div");
      el.className = "card";
      const when = new Date(ev.dateStart || ev.createdAt || Date.now()).toLocaleString();
      const cover = ev.coverImage ? `<img src="${ev.coverImage}" alt="" style="max-width:120px;max-height:80px;object-fit:cover;border-radius:8px;margin-right:8px;border:1px solid #eee" />` : "";
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px">
          ${cover}
          <div style="flex:1">
            <h3 style="margin:0">${ev.title || "(senza titolo)"} 
              <small class="badge badge-${ev.status||"draft"}">${ev.status||"draft"}</small>
              <small class="badge">${ev.visibility||"public"}</small>
            </h3>
            <div class="meta">${(ev.city||"")}${ev.region?`, ${ev.region}`:""}${ev.country?`, ${ev.country}`:""} • ${when}</div>
            <div class="toolbar" style="margin-top:6px">
              <button data-act="edit" data-id="${ev._id}">Modifica</button>
              <button data-act="del" data-id="${ev._id}">Elimina</button>
              <a href="evento.html?id=${ev._id}">Apri</a>
            </div>
          </div>
        </div>
      `;
      myBox.appendChild(el);
    });
  }

  // FILTRI
  const filtersForm = document.getElementById("filtersForm");
  const filtersReset = document.getElementById("filtersReset");
  function currentFilters() {
    const q = {};
    const g = (id) => document.getElementById(id)?.value?.trim() || "";
    const b = (id) => document.getElementById(id)?.checked || false;
    if (g("f_q")) q.q = g("f_q");
    if (g("f_city")) q.city = g("f_city");
    if (g("f_region")) q.region = g("f_region");
    if (g("f_country")) q.country = g("f_country");
    if (g("f_dateFrom")) q.dateFrom = g("f_dateFrom");
    if (g("f_dateTo")) q.dateTo = g("f_dateTo");
    if (g("f_status")) q.status = g("f_status");
    if (g("f_visibility")) q.visibility = g("f_visibility");
    if (g("f_category")) q.category = g("f_category");
    if (g("f_type")) q.type = g("f_type");
    if (b("f_isFree")) q.isFree = "true";
    return q;
  }
  filtersForm?.addEventListener("submit", async (e) => { e.preventDefault(); await loadMine(currentFilters()); });
  filtersReset?.addEventListener("click", async () => { filtersForm?.reset(); await loadMine({}); });

  async function loadMine(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const url = qs ? `/api/events/mine/list?${qs}` : `/api/events/mine/list`;
    const rows = await fetchJSON(url);
    renderList(rows || []);
  }

  // CREATE
  createForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!ensureValidDateRange(val("dateStart"), val("dateEnd"))) return;

    const body = {
      title: val("title"),
      description: val("description"),
      status: val("status") || "draft",
      visibility: val("visibility") || "public",
      type: val("type"),
      category: val("category"),
      subcategory: val("subcategory"),
      dateStart: val("dateStart") || undefined,
      dateEnd: val("dateEnd") || undefined,
      timezone: val("timezone") || "Europe/Rome",
      venueName: val("venueName"),
      address: val("address"),
      city: val("city"),
      province: val("province"),
      region: val("region"),
      country: val("country"),
      isFree: bool("isFree"),
      priceMin: num("priceMin"),
      priceMax: num("priceMax"),
      currency: val("currency") || "EUR",
      capacity: num("capacity"),
      coverImage: val("coverImage"),
      imagesText: document.getElementById("imagesText")?.value || "",
      externalUrl: val("externalUrl"),
      contactEmail: val("contactEmail"),
      contactPhone: val("contactPhone"),
    };
    await fetchJSON("/api/events", { method: "POST", body });
    await loadMine(currentFilters());
    createForm.reset();
  });

  // EDIT / DELETE
  myBox?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-act='edit']");
    const delBtn = e.target.closest("[data-act='del']");
    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      const ev = await fetchJSON(`/api/events/${id}`);
      const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = (v ?? "").toString(); };
      const setBool = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };

      set("edit_id", ev._id);
      set("edit_title", ev.title);
      set("edit_category", ev.category);
      set("edit_subcategory", ev.subcategory);
      set("edit_type", ev.type);
      set("edit_description", ev.description);
      set("edit_timezone", ev.timezone);
      set("edit_venueName", ev.venueName);
      set("edit_address", ev.address);
      set("edit_city", ev.city);
      set("edit_province", ev.province);
      set("edit_region", ev.region);
      set("edit_country", ev.country);
      set("edit_status", ev.status);
      set("edit_visibility", ev.visibility);
      setBool("edit_isFree", ev.isFree);
      set("edit_priceMin", ev.priceMin);
      set("edit_priceMax", ev.priceMax);
      set("edit_currency", ev.currency);
      set("edit_capacity", ev.capacity ?? "");
      if (ev.dateStart) set("edit_dateStart", new Date(ev.dateStart).toISOString().slice(0,16));
      if (ev.dateEnd) set("edit_dateEnd", new Date(ev.dateEnd).toISOString().slice(0,16));
      set("edit_coverImage", ev.coverImage || "");
      const galleryText = Array.isArray(ev.images) ? ev.images.join("\n") : "";
      set("edit_imagesText", galleryText);
      set("edit_externalUrl", ev.externalUrl);
      set("edit_contactEmail", ev.contactEmail);
      set("edit_contactPhone", ev.contactPhone);

      if (editModal) editModal.style.display = "flex";
    }
    if (delBtn) {
      const id = delBtn.getAttribute("data-id");
      if (confirm("Eliminare questo evento?")) {
        await fetchJSON(`/api/events/${id}`, { method: "DELETE" });
        await loadMine(currentFilters());
      }
    }
  });

  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!ensureValidDateRange(val("edit_dateStart"), val("edit_dateEnd"))) return;

    const id = val("edit_id");
    const body = {
      title: val("edit_title"),
      description: val("edit_description"),
      status: val("edit_status"),
      visibility: val("edit_visibility"),
      type: val("edit_type"),
      category: val("edit_category"),
      subcategory: val("edit_subcategory"),
      dateStart: val("edit_dateStart") || undefined,
      dateEnd: val("edit_dateEnd") || undefined,
      timezone: val("edit_timezone"),
      venueName: val("edit_venueName"),
      address: val("edit_address"),
      city: val("edit_city"),
      province: val("edit_province"),
      region: val("edit_region"),
      country: val("edit_country"),
      isFree: !!document.getElementById("edit_isFree")?.checked,
      priceMin: num("edit_priceMin"),
      priceMax: num("edit_priceMax"),
      currency: val("edit_currency"),
      capacity: num("edit_capacity"),
      coverImage: val("edit_coverImage"),
      imagesText: document.getElementById("edit_imagesText")?.value || "",
      externalUrl: val("edit_externalUrl"),
      contactEmail: val("edit_contactEmail"),
      contactPhone: val("edit_contactPhone"),
    };
    await fetchJSON(`/api/events/${id}`, { method: "PUT", body });
    if (editModal) editModal.style.display = "none";
    await loadMine(currentFilters());
  });

  document.getElementById("edit_cancel")?.addEventListener("click", () => {
    if (editModal) editModal.style.display = "none";
  });

  // Switch ruolo: tentativo senza body, poi fallback con body { role: ... }
  btnSwitch?.addEventListener("click", async () => {
    const current = sessRole();
    const next = current === "organizer" ? "participant" : "organizer";
    try {
      await fetchJSON("/api/users/session-role", { method: "PUT" });
    } catch (err) {
      // fallback esplicito
      await fetchJSON("/api/users/session-role", { method: "PUT", body: { role: next } });
    }
    window.location.reload();
  });

  btnLogout?.addEventListener("click", () => {
    ["token","userId","registeredRole","sessionRole"].forEach(k => localStorage.removeItem(k));
    window.location.href = "index.html";
  });

  loadMine();
});















