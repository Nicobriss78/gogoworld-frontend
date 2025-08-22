// evento.js — dettaglio evento: cover + galleria + join/leave unificati + range date + link lista dinamico + hide azioni per organizer/owner
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  const eventId = params.get("id");

  // Riferimenti DOM
  const box = document.getElementById("eventDetail");
  const gallerySection = document.getElementById("gallerySection");
  const galleryBox = document.getElementById("galleryBox");
  const actions = document.getElementById("eventActions");
  const extras = document.getElementById("eventExtras");
  const welcome = document.getElementById("welcome");
  const logoutBtn = document.getElementById("logoutBtn");
  const listLink = document.getElementById("listLink");

  // Sessione utente
  const sessionRole = (localStorage.getItem("sessionRole") || "participant");
  const userId = localStorage.getItem("userId") || "";
  if (listLink) listLink.href = sessionRole === "organizer" ? "organizzatore.html" : "partecipante.html";
  if (welcome) welcome.textContent = `Ciao! Sei in sessione come ${sessionRole}`;

  // Helpers
  const token = () => localStorage.getItem("token") || "";
  function authHeaders() {
    const t = token();
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  }
  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, { method: opts.method || "GET", headers: { ...authHeaders(), ...(opts.headers||{}) }, body: opts.body ? JSON.stringify(opts.body) : undefined });
    let payload = null;
    try { payload = await res.json(); } catch {}
    if (!res.ok) {
      const msg = (payload && (payload.error || payload.message)) ? (payload.error || payload.message) : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return payload;
  }
  const esc = (s) => String(s||"").replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
  const fmtDT = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return ""; } };

  // Join/leave solo se participant e non owner
  function canShowActions(ev) {
    if (sessionRole !== "participant") return false;
    if (ev && ev.ownerId && userId && String(ev.ownerId) === String(userId)) return false;
    return true;
  }

  // Toggle bottoni in base a partecipazione corrente
  function setActionsUI(ev) {
    if (!actions) return;
    if (!canShowActions(ev)) {
      actions.style.display = "none";
      actions.innerHTML = "";
      return;
    }
    const participants = Array.isArray(ev.participants) ? ev.participants.map(String) : [];
    const isIn = userId && participants.includes(String(userId));
    actions.style.display = "";
    actions.innerHTML = isIn
      ? `<button id="leaveBtn" class="btn">Annulla partecipazione</button>`
      : `<button id="joinBtn" class="btn primary">Partecipa</button>`;

    document.getElementById("joinBtn")?.addEventListener("click", onJoin);
    document.getElementById("leaveBtn")?.addEventListener("click", onLeave);
  }

  // --- Azioni
  async function onJoin() {
    try {
      await fetchJSON(`/api/events/${eventId}/join`, { method: "POST" });
      sessionStorage.setItem("ggw_list_dirty", "1"); // per ricaricare la lista al ritorno
      await loadAndRender();
      alert("Sei iscritto a questo evento!");
    } catch (err) {
      alert(`Errore: ${err.message}`);
    }
  }
  async function onLeave() {
    try {
      await fetchJSON(`/api/events/${eventId}/leave`, { method: "DELETE" });
      sessionStorage.setItem("ggw_list_dirty", "1");
      await loadAndRender();
      alert("Hai annullato la partecipazione.");
    } catch (err) {
      alert(`Errore: ${err.message}`);
    }
  }

  // --- Render
  function render(ev) {
    if (!ev) return;

    // Cover: coverImage > images[0]
    const cover = (ev.coverImage && ev.coverImage.trim())
      ? ev.coverImage.trim()
      : (Array.isArray(ev.images) && ev.images.length ? String(ev.images[0]).trim() : "");

    // Range date
    const startStr = ev.dateStart ? fmtDT(ev.dateStart) : "";
    const endStr = ev.dateEnd ? fmtDT(ev.dateEnd) : "";
    const when = endStr ? `${startStr} → ${endStr}` : (startStr || fmtDT(ev.createdAt));

    box.innerHTML = `
      ${cover ? `<div style="margin-bottom:12px"><img src="${esc(cover)}" alt="" style="width:100%;max-height:380px;object-fit:cover;border-radius:12px"/></div>` : ""}
      <h1>${esc(ev.title)}</h1>
      <div>${when} — ${(ev.city||"")}${ev.region?`, ${ev.region}`:""}${ev.country?`, ${ev.country}`:""}</div>
      <p>${esc(ev.description||"").replace(/\n/g,"<br/>")}</p>
    `;

    // Galleria (no duplicati con cover)
    if (gallerySection && galleryBox) {
      const imgs = Array.isArray(ev.images) ? ev.images.map(s => String(s).trim()).filter(Boolean) : [];
      const unique = new Set();
      const coverUrl = (ev.coverImage||"").trim();
      const gallery = imgs.filter(u => {
        if (!u) return false;
        if (coverUrl && u === coverUrl) return false;
        if (unique.has(u)) return false;
        unique.add(u);
        return true;
      });
      if (gallery.length) {
        galleryBox.innerHTML = gallery.map(src => `<img src="${esc(src)}" alt=""/>`).join("");
        gallerySection.style.display = "";
      } else {
        galleryBox.innerHTML = "";
        gallerySection.style.display = "none";
      }
    }

    // Extra
    if (extras) {
      const out = [];
      if (ev.externalUrl) out.push(`<div><a href="${esc(ev.externalUrl)}" target="_blank">Sito ufficiale</a></div>`);
      if (ev.contactEmail) out.push(`<div>Email: ${esc(ev.contactEmail)}</div>`);
      if (ev.contactPhone) out.push(`<div>Tel: ${esc(ev.contactPhone)}</div>`);
      if (out.length) { extras.innerHTML = out.join(""); extras.style.display = ""; } else { extras.style.display = "none"; }
    }

    // Azioni
    setActionsUI(ev);
  }

  // --- Load + Render
  async function loadAndRender() {
    try {
      const ev = await fetchJSON(`/api/events/${eventId}`);
      render(ev);
    } catch (err) {
      box.innerHTML = `<p>Errore nel caricamento dell'evento.</p>`;
    }
  }

  // Logout
  logoutBtn?.addEventListener("click", () => {
    try { localStorage.removeItem("ggw_token"); } catch {}
    ["token","userId","registeredRole","sessionRole"].forEach(k => localStorage.removeItem(k));
    window.location.href = "index.html";
  });

  // Avvio
  await loadAndRender();
});










