// evento.js — dettaglio evento con link mappa OpenStreetMap
document.addEventListener("DOMContentLoaded", () => {
  const qs = new URLSearchParams(location.search);
  const id = qs.get("id");

  const titleEl = document.getElementById("title");
  const badgesEl = document.getElementById("badges");
  const whenWhereEl = document.getElementById("whenWhere");
  const descEl = document.getElementById("description");
  const detailsEl = document.getElementById("details");
  const contactsEl = document.getElementById("contacts");
  const coverBox = document.getElementById("coverBox");

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
  const esc = (s) => b(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  const fmtDate = (d) => { if (!d) return ""; const dt = new Date(d); return isNaN(dt) ? "" : dt.toLocaleString("it-IT"); };

  // Costruisce un link gratuito OpenStreetMap (ricerca indirizzo/città)
  function osmLink(city, address) {
    const q = [address, city].filter(Boolean).join(", ");
    return q ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}` : null;
  }

  function priceBlock(ev) {
    if (ev.isFree) return "Gratuito";
    const hasMin = typeof ev.priceMin === "number";
    const hasMax = typeof ev.priceMax === "number";
    const cur = ev.currency || "EUR";
    if (hasMin && hasMax) return `${ev.priceMin}–${ev.priceMax} ${cur}`;
    if (hasMin) return `${ev.priceMin} ${cur}`;
    if (hasMax) return `${ev.priceMax} ${cur}`;
    return "";
  }
  function capBlock(ev) {
    if (typeof ev.capacity === "number" && ev.capacity >= 0) {
      const n = Array.isArray(ev.participants) ? ev.participants.length : 0;
      return `${n}/${ev.capacity}`;
    }
    return Array.isArray(ev.participants) ? `${ev.participants.length}` : "";
  }

  async function fetchJSON(url, opts = {}) {
    const resp = await fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.auth !== false ? { "Authorization": `Bearer ${token()}` } : {}),
        ...(opts.headers || {})
      }
    });
    if (!resp.ok) { throw new Error(await resp.text() || `HTTP ${resp.status}`); }
    return resp.json();
  }

  function render(ev) {
    // Titolo
    titleEl.textContent = ev.title || "Evento";

    // Cover
    const img = Array.isArray(ev.images) && ev.images.length ? ev.images[0] : null;
    coverBox.innerHTML = img ? `<img src="${esc(img)}" alt="copertina evento" />` : "";

    // Badges
    const badges = [];
    if (ev.status) badges.push(`<span class="badge ${ev.status === "published" ? "badge-published" : ev.status === "cancelled" ? "badge-cancelled" : "badge-draft"}">${esc(ev.status)}</span>`);
    if (ev.visibility) badges.push(`<span class="badge">${esc(ev.visibility)}</span>`);
    if (ev.category) badges.push(`<span class="badge">${esc(ev.category)}</span>`);
    if (ev.type) badges.push(`<span class="badge">${esc(ev.type)}</span>`);
    badgesEl.innerHTML = badges.join(" ");

    // Quando & Dove
    const whenParts = [];
    const start = fmtDate(ev.dateStart);
    const end = fmtDate(ev.dateEnd);
    if (start) whenParts.push(`Inizio: ${start}`);
    if (end) whenParts.push(`Fine: ${end}`);
    if (ev.timezone) whenParts.push(`(${esc(ev.timezone)})`);

    const whereParts = [];
    if (ev.venueName) whereParts.push(esc(ev.venueName));
    const geo = [ev.address, ev.city, ev.province, ev.region, ev.country].filter(Boolean).map(esc).join(", ");
    if (geo) whereParts.push(geo);

    const ww = [];
    if (whenParts.length) ww.push(whenParts.join(" · "));
    if (whereParts.length) ww.push(whereParts.join(" — "));
    whenWhereEl.innerHTML = ww.join("<br/>");

    // Descrizione
    descEl.innerHTML = ev.description ? esc(ev.description).replaceAll("\n","<br/>") : "—";

    // Dettagli
    const dt = [];
    const p = priceBlock(ev);
    if (p) { dt.push(`<dt>Prezzo</dt><dd>${esc(p)}</dd>`); }
    const cap = capBlock(ev);
    if (cap) { dt.push(`<dt>Partecipanti</dt><dd>${esc(cap)}</dd>`); }
    if (ev.subcategory) dt.push(`<dt>Sottocategoria</dt><dd>${esc(ev.subcategory)}</dd>`);
    if (ev.externalUrl) dt.push(`<dt>Link esterno</dt><dd><a href="${esc(ev.externalUrl)}" target="_blank" rel="noopener">${esc(ev.externalUrl)}</a></dd>`);
    detailsEl.innerHTML = dt.join("");

    // Contatti
    const ct = [];
    if (ev.contactEmail) ct.push(`<dt>Email</dt><dd><a href="mailto:${esc(ev.contactEmail)}">${esc(ev.contactEmail)}</a></dd>`);
    if (ev.contactPhone) ct.push(`<dt>Telefono</dt><dd><a href="tel:${esc(ev.contactPhone)}">${esc(ev.contactPhone)}</a></dd>`);
    contactsEl.innerHTML = ct.length ? ct.join("") : `<span class="muted">Nessun contatto indicato.</span>`;

    // Link mappa (OpenStreetMap) & esterno
    const mlink = osmLink(ev.city || "", ev.address || "");
    if (mlink) { mapA.style.display = ""; mapA.href = mlink; } else { mapA.style.display = "none"; }
    if (ev.externalUrl) { externalA.style.display = ""; externalA.href = ev.externalUrl; } else { externalA.style.display = "none"; }

    // CTA join/leave
    const isParticipantRole = sessionRole() === "participant";
    const alreadyJoined = (ev.participants || []).some(pid => String(pid) === String(uid()));
    joinBtn.style.display = isParticipantRole && !alreadyJoined ? "" : "none";
    leaveBtn.style.display = isParticipantRole && alreadyJoined ? "" : "none";
  }

  async function load() {
    const ev = await fetchJSON(`/api/events/${id}`, { auth: false });
    render(ev);
  }

  async function join() {
    try {
      await fetchJSON(`/api/users/${uid()}/partecipa`, {
        method: "POST",
        body: JSON.stringify({ eventId: id })
      });
      await load();
      alert("Partecipazione confermata!");
    } catch (err) {
      console.error(err);
      if (/FORBIDDEN_ROLE/.test(err.message)) {
        alert("Devi essere in ruolo PARTECIPANTE per partecipare. Usa il bottone 'Diventa partecipante' nella tua area.");
      } else {
        alert("Impossibile confermare la partecipazione.");
      }
    }
  }

  async function leave() {
    try {
      await fetchJSON(`/api/users/${uid()}/annulla`, {
        method: "POST",
        body: JSON.stringify({ eventId: id })
      });
      await load();
      alert("Partecipazione annullata.");
    } catch (err) {
      console.error(err);
      alert("Impossibile annullare la partecipazione.");
    }
  }

  if (joinBtn) joinBtn.addEventListener("click", join);
  if (leaveBtn) leaveBtn.addEventListener("click", leave);
  if (backBtn) backBtn.addEventListener("click", () => history.length > 1 ? history.back() : (location.href = "partecipante.html"));

  load();
});



