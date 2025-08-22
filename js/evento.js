// evento.js — dettaglio evento: cover + galleria + join/leave con fallback + range date + link lista dinamico + hide azioni per organizer/owner
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

  const sessionRole = (localStorage.getItem("sessionRole") || "participant");
  const userId = localStorage.getItem("userId") || "";

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
    // prova a leggere un eventuale messaggio d'errore del server
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

  const esc = (s) => String(s||"").replace(/[&<>]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;" }[c]));
  const fmtDT = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return ""; } };

  function canShowActions(ev) {
    // nascondi azioni se organizer o owner dell'evento
    if (sessionRole === "organizer") return false;
    if (ev && ev.ownerId && userId && String(ev.ownerId) === String(userId)) return false;
    return true;
  }

  async function joinEvent(evId) {
    // 1° tentativo: /api/events/:id/join
    try {
      await fetchJSON(`/api/events/${evId}/join`, { method: "POST" });
      return;
    } catch (e1) {
      // 2° fallback: /api/users/:id/partecipa
      try {
        await fetchJSON(`/api/users/${evId}/partecipa`, { method: "POST" });
        return;
      } catch (e2) {
        throw e2; // mostra l'errore reale (400 ecc.)
      }
    }
  }

  async function leaveEvent(evId) {
    try {
      await fetchJSON(`/api/events/${evId}/leave`, { method: "POST" });
      return;
    } catch (e1) {
      try {
        await fetchJSON(`/api/users/${evId}/annulla`, { method: "POST" });
        return;
      } catch (e2) {
        throw e2;
      }
    }
  }

  function render(ev) {
    if (!ev) return;

    const cover = (ev.coverImage && ev.coverImage.trim())
      ? ev.coverImage.trim()
      : (Array.isArray(ev.images) && ev.images.length ? String(ev.images[0]).trim() : "");

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

    // Azioni: visibili solo se consentito
    if (actions) {
      if (!canShowActions(ev)) {
        actions.style.display = "none";
        actions.innerHTML = "";
      } else {
        actions.style.display = "";
        actions.innerHTML = `
          <button id="joinBtn" class="btn primary">Partecipa</button>
          <button id="leaveBtn" class="btn">Annulla partecipazione</button>
        `;
        document.getElementById("joinBtn")?.addEventListener("click", async () => {
          try {
            await joinEvent(ev._id);
            alert("Sei iscritto a questo evento!");
          } catch (err) {
            alert(`Errore: ${err.message}`);
          }
        });
        document.getElementById("leaveBtn")?.addEventListener("click", async () => {
          try {
            await leaveEvent(ev._id);
            alert("Hai annullato la partecipazione.");
          } catch (err) {
            alert(`Errore: ${err.message}`);
          }
        });
      }
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

  logoutBtn?.addEventListener("click", () => {
    ["token","userId","registeredRole","sessionRole"].forEach(k => localStorage.removeItem(k));
    window.location.href = "index.html";
  });
});








