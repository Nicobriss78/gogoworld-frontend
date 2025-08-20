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

  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, {
      method: opts.method || "GET",
      headers: Object.assign(
        { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}) },
        opts.headers || {}
      ),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    return res.json();
  }

  function val(id) { return document.getElementById(id)?.value?.trim() || ""; }
  function bool(id) { return !!document.getElementById(id)?.checked; }
  function num(id) { const x = +val(id); return Number.isFinite(x) ? x : undefined; }

  function renderList(items) {
    myBox.innerHTML = "";
    items.forEach(ev => {
      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = `
        <h3>${ev.title || "(senza titolo)"} <small class="badge badge-${ev.status||"draft"}">${ev.status||"draft"}</small></h3>
        <div class="meta">${(ev.city||"")}${ev.region?`, ${ev.region}`:""} — ${new Date(ev.dateStart||ev.createdAt||Date.now()).toLocaleString()}</div>
        <div class="toolbar">
          <button data-act="edit" data-id="${ev._id}">Modifica</button>
          <button data-act="del" data-id="${ev._id}">Elimina</button>
          <a href="evento.html?id=${ev._id}">Apri</a>
        </div>
      `;
      myBox.appendChild(el);
    });
  }

  async function loadMine() {
    // backend espone GET /api/events/mine/list (coerente con le tue routes)
    const rows = await fetchJSON("/api/events/mine/list");
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
      capacity: num("capacity"),
      isFree: bool("isFree"),
      priceMin: num("priceMin"),
      priceMax: num("priceMax"),
      currency: val("currency") || "EUR",
      imageUrl: val("imageUrl"),
      externalUrl: val("externalUrl"),
      contactEmail: val("contactEmail"),
      contactPhone: val("contactPhone"),
    };
    await fetchJSON("/api/events", { method: "POST", body });
    await loadMine();
    createForm.reset();
  });

  myBox?.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-act='edit']");
    const delBtn = e.target.closest("[data-act='del']");
    if (editBtn) {
      const id = editBtn.getAttribute("data-id");
      const ev = await fetchJSON(`/api/events/${id}`);
      // popola form di edit (id prefissati "edit_")
      const set = (k,v)=>{ const el=document.getElementById(`edit_${k}`); if (el) el.value = v ?? ""; };
      set("id", ev._id);
      ["title","description","status","visibility","type","category","subcategory","timezone","venueName","address","city","province","region","country","currency","externalUrl","contactEmail","contactPhone"].forEach(k=>set(k,ev[k]));
      const dts = (x)=> x ? new Date(x).toISOString().slice(0,16) : "";
      set("dateStart", dts(ev.dateStart));
      set("dateEnd", dts(ev.dateEnd));
      document.getElementById("edit_isFree")?.toggleAttribute("checked", !!ev.isFree);
      document.getElementById("edit_priceMin") && (document.getElementById("edit_priceMin").value = ev.priceMin ?? "");
      document.getElementById("edit_priceMax") && (document.getElementById("edit_priceMax").value = ev.priceMax ?? "");
      document.getElementById("edit_capacity") && (document.getElementById("edit_capacity").value = ev.capacity ?? "");
      document.getElementById("edit_imageUrl") && (document.getElementById("edit_imageUrl").value = (ev.images||[])[0] || "");
      // mostra modal se previsto
      if (editModal) editModal.style.display = "block";
    }
    if (delBtn) {
      const id = delBtn.getAttribute("data-id");
      if (!confirm("Eliminare definitivamente l'evento?")) return;
      await fetchJSON(`/api/events/${id}`, { method: "DELETE" });
      await loadMine();
    }
  });

  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit_id")?.value;
    const body = {
      title: document.getElementById("edit_title")?.value?.trim(),
      description: document.getElementById("edit_description")?.value?.trim(),
      status: document.getElementById("edit_status")?.value,
      visibility: document.getElementById("edit_visibility")?.value,
      type: document.getElementById("edit_type")?.value,
      category: document.getElementById("edit_category")?.value,
      subcategory: document.getElementById("edit_subcategory")?.value,
      dateStart: document.getElementById("edit_dateStart")?.value || undefined,
      dateEnd: document.getElementById("edit_dateEnd")?.value || undefined,
      timezone: document.getElementById("edit_timezone")?.value || "Europe/Rome",
      venueName: document.getElementById("edit_venueName")?.value,
      address: document.getElementById("edit_address")?.value,
      city: document.getElementById("edit_city")?.value,
      province: document.getElementById("edit_province")?.value,
      region: document.getElementById("edit_region")?.value,
      country: document.getElementById("edit_country")?.value,
      capacity: +document.getElementById("edit_capacity")?.value || undefined,
      isFree: !!document.getElementById("edit_isFree")?.checked,
      priceMin: +document.getElementById("edit_priceMin")?.value || undefined,
      priceMax: +document.getElementById("edit_priceMax")?.value || undefined,
      currency: document.getElementById("edit_currency")?.value || "EUR",
      imageUrl: document.getElementById("edit_imageUrl")?.value,
      externalUrl: document.getElementById("edit_externalUrl")?.value,
      contactEmail: document.getElementById("edit_contactEmail")?.value,
      contactPhone: document.getElementById("edit_contactPhone")?.value,
    };
    await fetchJSON(`/api/events/${id}`, { method: "PUT", body });
    if (editModal) editModal.style.display = "none";
    await loadMine();
  });

  btnSwitch?.addEventListener("click", async () => {
    // organizer → participant (o viceversa)
    if (regRole() !== "organizer") return alert("Non sei registrato come organizer.");
    const next = sessRole() === "organizer" ? "participant" : "organizer";
    const out = await fetchJSON("/api/users/session-role", { method: "PUT", body: { sessionRole: next } });
    if (out?.token) localStorage.setItem("token", out.token);
    localStorage.setItem("sessionRole", out.sessionRole || next);
    window.location.href = next === "organizer" ? "organizzatore.html" : "partecipante.html";
  });

  btnLogout?.addEventListener("click", () => {
    ["token","userId","registeredRole","sessionRole"].forEach(k => localStorage.removeItem(k));
    window.location.href = "index.html";
  });

  loadMine();
});








