// evento.js — dettaglio evento: cover + galleria + join/leave + range date + link lista dinamico
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");

  const box = document.getElementById("eventDetail");
  const gallerySection = document.getElementById("gallerySection");
  const galleryBox = document.getElementById("galleryBox");
  const actions = document.getElementById("eventActions");
  const extras = document.getElementById("eventExtras");
  const welcome = document.getElementById("welcome");
  const logoutBtn = document.getElementById("logoutBtn");
  const listLink = document.getElementById("listLink");

  // Imposta link "Torna alla lista" in base al ruolo di sessione
  const sessionRole = (localStorage.getItem("sessionRole") || "participant");
  if (listLink) {
    listLink.href = sessionRole === "organizer" ? "organizzatore.html" : "partecipante.html";
  }
  if (welcome) welcome.textContent = `Ciao! Sei in sessione come ${sessionRole}`;

  function token() { return localStorage.getItem("token") || ""; }
  function authHeaders() {
    const h = { "Content-Type": "application/json" };
    const t = token(); if (t) h.Authorization = `Bearer ${t}`;
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
  const esc = (s) => String(s||"").replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
  const fmtDT = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch { return ""; }
  };

  function render(ev) {
    if (!ev) return;

    // Cover: preferisci coverImage, fallback images[0]
    const cover = (ev.coverImage && ev.coverImage.trim())
      ? ev.coverImage.trim()
      : (Array.isArray(ev.images) && ev.images.length ? String(ev.images[0]).trim() : "");

    // Range date: se c'è dateEnd, mostra "inizio → fine"
    const startStr = ev.dateStart ? fmtDT(ev.dateStart) : "";
    const endStr = ev.dateEnd ? fmtDT(ev.dateEnd) : "";
    const when = endStr ? `${startStr} → ${endStr}` : (startStr || fmtDT(ev.createdAt));

    box.innerHTML = `
      ${cover ? `<div style="margin-bottom:12px"><img src="${esc(cover)}" alt="" style="width:100%;max-height:380px;object-fit:cover;border-radius:12px"/></div>` : ""}
      <h1>${esc(ev.title)}</h1>
      <div>${when} — ${(ev.city||"")}${ev.region?`, ${ev.region}`:""}${ev.country?`, ${ev.country}`:""}</div>
      <p>${esc(ev.description||"").replace(/\n/g,"<br/>")}</p>
    `;

    // Galleria
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

    // Azioni (join/leave) — allineate ai tuoi endpoint
    if (actions) {
      actions.style.display = "";
      actions.innerHTML = `
        <button id="joinBtn" class="btn primary">Partecipa</button>
        <button id="leaveBtn" class="btn">Annulla partecipazione</button>
      `;
      document.getElementById("joinBtn")?.addEventListener("click", async () => {
        await fetchJSON(`/api/users/${ev._id}/partecipa`, { method:"POST" });
        alert("Sei iscritto a questo evento!");
      });
      document.getElementById("leaveBtn")?.addEventListener("click", async () => {
        await fetchJSON(`/api/users/${ev._id}/annulla`, { method:"POST" });
        alert("Hai annullato la partecipazione.");
      });
    }

    // Extras (contatti, sito esterno)
    if (extras) {
      const extrasHtml = [];
      if (ev.externalUrl) extrasHtml.push(`<div><a href="${esc(ev.externalUrl)}" target="_blank">Sito ufficiale</a></div>`);
      if (ev.contactEmail) extrasHtml.push(`<div>Email: ${esc(ev.contactEmail)}</div>`);
      if (ev.contactPhone) extrasHtml.push(`<div>Tel: ${esc(ev.contactPhone)}</div>`);
      if (extrasHtml.length) {
        extras.innerHTML = extrasHtml.join("");
        extras.style.display = "";
      } else {
        extras.style.display = "none";
      }
    }
  }

  try {
    const ev = await fetchJSON(`/api/events/${id}`);
    render(ev);
  } catch (err) {
    box.innerHTML = `<p>Errore nel caricamento dell'evento.</p>`;
  }

  // Logout
  logoutBtn?.addEventListener("click", () => {
    ["token","userId","registeredRole","sessionRole"].forEach(k => localStorage.removeItem(k));
    window.location.href = "index.html";
  });
});






