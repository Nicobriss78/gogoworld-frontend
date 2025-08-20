// evento.js — dettaglio, join/leave, badge, link mappa
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  const titleEl = document.getElementById("title");
  const badges = document.getElementById("badges");
  const coverBox = document.getElementById("coverBox");
  const descEl = document.getElementById("description");
  const whenWhere = document.getElementById("whenWhere");
  const details = document.getElementById("details");
  const contacts = document.getElementById("contacts");
  const joinBtn = document.getElementById("joinBtn");
  const leaveBtn = document.getElementById("leaveBtn");
  const externalA = document.getElementById("externalUrl");
  const mapA = document.getElementById("mapLink");
  const backBtn = document.getElementById("backBtn");

  if (!id) { titleEl.textContent = "Evento non trovato (manca id)."; return; }

  const token = () => localStorage.getItem("token") || "";
  const uid = () => localStorage.getItem("userId") || "";
  const sessionRole = () => localStorage.getItem("sessionRole") || "";

  const b = (s) => (s ?? "").toString();
  const esc = (s) => b(s)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#39;");

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

  function setJoinButtons(ev) {
    const joined = (ev.participants||[]).some(pid => String(pid) === String(uid()));
    const canJoin = sessionRole() === "participant";
    if (joinBtn) joinBtn.style.display = canJoin && !joined ? "" : "none";
    if (leaveBtn) leaveBtn.style.display = canJoin && joined ? "" : "none";
  }

  function buildMapUrl(ev) {
    const q = encodeURIComponent([ev.venueName, ev.address, ev.city, ev.region, ev.country].filter(Boolean).join(", "));
    return `https://www.openstreetmap.org/search?query=${q}`;
  }

  function render(ev) {
    titleEl.textContent = ev.title || "(senza titolo)";
    badges.innerHTML = `
      <span class="badge badge-${ev.status||"draft"}">${ev.status||"draft"}</span>
      <span class="badge">visibilità: ${ev.visibility||"public"}</span>
      ${ev.isFree ? `<span class="badge">gratuito</span>` : ""}
    `;
    coverBox.innerHTML = (ev.images && ev.images[0]) ? `<img src="${esc(ev.images[0])}" alt="">` : `<div class="ph cover"></div>`;
    descEl.textContent = ev.description || "";

    whenWhere.innerHTML = `
      <div><strong>Quando:</strong> ${ev.dateStart ? new Date(ev.dateStart).toLocaleString() : "—"} ${ev.dateEnd ? " → "+new Date(ev.dateEnd).toLocaleString() : ""}</div>
      <div><strong>Dove:</strong> ${[ev.venueName, ev.address, ev.city, ev.region, ev.country].filter(Boolean).join(", ") || "—"}</div>
    `;

    details.innerHTML = `
      <dt>Capienza</dt><dd>${ev.capacity ?? "—"}</dd>
      <dt>Prezzo</dt><dd>${ev.isFree ? "Gratuito" : [ev.priceMin, ev.priceMax].filter(x=>x!=null).join("–") + " " + (ev.currency||"")}</dd>
      <dt>Categoria</dt><dd>${[ev.type, ev.category, ev.subcategory].filter(Boolean).join(" / ") || "—"}</dd>
      <dt>Creato</dt><dd>${new Date(ev.createdAt||Date.now()).toLocaleString()}</dd>
    `;

    contacts.innerHTML = `
      ${ev.contactEmail ? `<dt>Email</dt><dd><a href="mailto:${esc(ev.contactEmail)}">${esc(ev.contactEmail)}</a></dd>` : ""}
      ${ev.contactPhone ? `<dt>Telefono</dt><dd><a href="tel:${esc(ev.contactPhone)}">${esc(ev.contactPhone)}</a></dd>` : ""}
    `;

    externalA && (externalA.href = ev.externalUrl || "#");
    mapA && (mapA.href = buildMapUrl(ev));

    setJoinButtons(ev);
  }

  async function load() {
    const data = await fetchJSON(`/api/events/${id}`);
    // controller get ritorna OGGETTO diretto
    render(data);
  }

  joinBtn?.addEventListener("click", async () => {
    await fetchJSON(`/api/users/${uid()}/partecipa`, { method: "POST", body: { eventId: id } });
    sessionStorage.setItem("ggw_list_dirty", "1"); // 🔧 segnala che la lista va ricaricata
    await load();
  });

  leaveBtn?.addEventListener("click", async () => {
    await fetchJSON(`/api/users/${uid()}/annulla`, { method: "POST", body: { eventId: id } });
    sessionStorage.setItem("ggw_list_dirty", "1"); // 🔧 segnala che la lista va ricaricata
    await load();
  });

  backBtn?.addEventListener("click", () => history.back());

  load();
});

