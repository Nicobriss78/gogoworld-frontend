// organizzatore.js — lista miei eventi, create, edit, delete, switch ruolo
document.addEventListener("DOMContentLoaded", () => {
  const myBox = document.getElementById("myEventsContainer");
  const createForm = document.getElementById("createEventForm");
  const editForm = document.getElementById("editEventForm");
  const editModal = document.getElementById("editModal");
  const btnLogout = document.getElementById("logoutBtn");
  const btnSwitch = document.getElementById("switchRoleBtn");
  const welcome = document.getElementById("welcome");

  const token = () => localStorage.getItem("token") || "";
  const uid = () => localStorage.getItem("userId") || "";
  const regRole = () => localStorage.getItem("registeredRole") || "participant";
  const sessRole = () => localStorage.getItem("sessionRole") || "participant";

  if (welcome) welcome.textContent = `Ciao! Sei in sessione come ${sessRole()}`;

  function authHeaders() {
    const h = { "Content-Type": "application/json" };
    const t = token();
    if (t) h.Authorization = `Bearer ${t}`;
    return h;
  }
  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: authHeaders(),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  const val = (id) => document.getElementById(id)?.value?.trim() || "";
  const bool = (id) => !!document.getElementById(id)?.checked;
  const num = (id) => {
    const x = +val(id);
    return Number.isFinite(x) ? x : undefined;
  };

  function renderList(items) {
    myBox.innerHTML = "";
    items.forEach(ev => {
      const el = document.createElement("div");
      el.className = "card";
      const when = new Date(ev.dateStart || ev.createdAt || Date.now()).toLocaleString();
      el.innerHTML = `
        <h3>${ev.title || "(senza titolo)"} 
          <small class="badge badge-${ev.status||"draft"}">${ev.status||"draft"}</small>
          <small class="badge">${ev.visibility||"public"}</small>
        </h3>
        <div class="meta">${(ev.city||"")}${ev.region?`, ${ev.region}`:""}${ev.country?`, ${ev.country}`:""} • ${when}</div>
        <div class="toolbar">
          <button data-act="edit" data-id="${ev._id}">Modifica</button>
          <button data-act="del" data-id="${ev._id}">Elimina</button>
          <a href="evento.html?id=${ev._id}">Apri</a>
        </div>
      `;
      myBox.appendChild(el);
    });
  }

  // ----- FILTRI -----
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

  filtersForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await loadMine(currentFilters());
  });

  filtersReset?.addEventListener("click", async () => {
    filtersForm?.reset();
    await loadMine({});
  });

  async function loadMine(query = {}) {
    const qs = new URLSearchParams(query).toString();
    const url = qs ? `/api/events/mine/list?${qs}` : `/api/events/mine/list`;
    const rows = await fetchJSON(url);
    renderList(rows || []);
  }

  createForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
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
      imageUrl: val("imageUrl"),
      externalUrl: val("externalUrl"),
      contactEmail: val("contactEmail"),
      contactPhone: val("contactPhone"),
    };
    await fetchJSON("/api/events", { method: "POST", body });
    await loadMine(currentFilters());
    createForm.reset();
  });

  myBox?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-act='edit']");
    const delBtn = e.target.closest("[data-act='del']");
    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      // open modal + populate (già presente nel tuo file; mantenuto)
      // ...
    }
    if (delBtn) {
      const id = delBtn.getAttribute("data-id");
      if (confirm("Eliminare questo evento?")) {
        await fetchJSON(`/api/events/${id}`, { method: "DELETE" });
        await loadMine(currentFilters());
      }
    }
  });

  btnSwitch?.addEventListener("click", async () => {
    await fetchJSON("/api/users/session-role", { method: "PUT" });
    window.location.reload();
  });

  btnLogout?.addEventListener("click", () => {
    ["token","userId","registeredRole","sessionRole"].forEach(k => localStorage.removeItem(k));
    window.location.href = "index.html";
  });

  loadMine();
});










