// evento.js — Dettaglio con:
// - Organizer: Edit/Save/Cancel/Delete SOLO qui
// - Participant: Partecipa/Annulla in base allo stato reale
// - Torna alla lista in base a sessionRole

(function(){
  // --- DOM
  const backBtn = document.getElementById("backBtn");
  const switchRoleBtn = document.getElementById("switchRoleBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const statusEl = document.getElementById("status");

  const evTitle = document.getElementById("evTitle");
  const evId = document.getElementById("evId");
  const evDesc = document.getElementById("evDesc");
  const evDate = document.getElementById("evDate");
  const evType = document.getElementById("evType");
  const evLocation = document.getElementById("evLocation");
  const evPrice = document.getElementById("evPrice");
  const evCapacity = document.getElementById("evCapacity");
  const evOwner = document.getElementById("evOwner");

  const infoId = document.getElementById("infoId");
  const infoJoinState = document.getElementById("infoJoinState");
  const infoRole = document.getElementById("infoRole");

  const coverCard = document.getElementById("coverCard");
  const galleryBox = document.getElementById("gallery");
  const galleryEmpty = document.getElementById("galleryEmpty");

  const viewMode = document.getElementById("viewMode");
  const editForm = document.getElementById("editForm");

  const participantActions = document.getElementById("participantActions");
  const joinBtn = document.getElementById("joinBtn");
  const leaveBtn = document.getElementById("leaveBtn");

  const organizerActions = document.getElementById("organizerActions");
  const editBtn = document.getElementById("editBtn");
  const saveBtn = document.getElementById("saveBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  // Edit fields
  const fTitle = document.getElementById("fTitle");
  const fDesc = document.getElementById("fDesc");
  const fDate = document.getElementById("fDate");
  const fType = document.getElementById("fType");
  const fLocation = document.getElementById("fLocation");
  const fPrice = document.getElementById("fPrice");
  const fCapacity = document.getElementById("fCapacity");

  // --- Helpers
  const getToken = () => localStorage.getItem("token") || localStorage.getItem("ggw_token") || "";
  const getRole = () => localStorage.getItem("sessionRole") || "participant";
  const setRole = (r) => localStorage.setItem("sessionRole", r);
  const qs = new URLSearchParams(location.search);
  const eventId = qs.get("id");

  function fmtDate(val){
    try { if (!val) return ""; return new Date(val).toLocaleString(); } catch { return String(val||""); }
  }
  function esc(s){ return String(s ?? "").replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function setHidden(el, hidden) { if (!el) return; el.classList[hidden ? "add" : "remove"]("hidden"); }

  function backToList(){
    const role = getRole();
    if (document.referrer && /organizzatore\.html|partecipante\.html/.test(document.referrer)) {
      history.back();
    } else {
      location.href = role === "organizer" ? "/organizzatore.html" : "/partecipante.html";
    }
  }

  async function ensureRole(target){
    if (getRole() === target) return;
    const res = await fetch("/api/users/session-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`
      },
      body: JSON.stringify({ role: target })
    });
    if (res.ok) {
      setRole(target);
      const data = await res.json().catch(()=>({}));
      if (data && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("ggw_token", data.token);
      }
    }
  }

  async function apiGet(path){
    const res = await fetch(path, { headers: { "Authorization": `Bearer ${getToken()}` } });
    if (!res.ok) throw new Error(`GET ${path} failed`);
    return res.json();
  }
  async function apiPost(path, body){
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) {
      const t = await res.json().catch(()=>({}));
      throw new Error(t.message || `POST ${path} failed`);
    }
    return res.json();
  }
  async function apiPut(path, body){
    const res = await fetch(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
      body: JSON.stringify(body || {})
    });
    if (!res.ok) {
      const t = await res.json().catch(()=>({}));
      throw new Error(t.message || `PUT ${path} failed`);
    }
    return res.json();
  }
  async function apiDelete(path){
    const res = await fetch(path, { method: "DELETE", headers: { "Authorization": `Bearer ${getToken()}` } });
    if (!res.ok) {
      const t = await res.json().catch(()=>({}));
      throw new Error(t.message || `DELETE ${path} failed`);
    }
    return res.json();
  }

  // --- State
  let eventData = null;
  let joined = false;

  function populateView(ev){
    if (!ev) return;
    evTitle.textContent = ev.title || "Evento";
    evId.textContent = ev._id || "";
    infoId.textContent = ev._id || "";

    evDesc.innerHTML = esc(ev.description || ev.desc || "");
    evDate.textContent = fmtDate(ev.date || ev.datetime || ev.startsAt);
    evType.textContent = esc(ev.type || ev.eventType || "");
    evLocation.textContent = esc(ev.location || ev.place || ev.address || "");
    evPrice.textContent = ev.price != null ? String(ev.price) : "";
    evCapacity.textContent = ev.capacity != null ? String(ev.capacity) : "";
    evOwner.textContent = ev.ownerName ? `${ev.ownerName} (${ev.owner || ""})` : (ev.owner || ev.organizer || "");

    // Cover
    coverCard.innerHTML = "";
    const coverUrl = ev.coverImage || ev.cover || ev.image || null;
    if (coverUrl) {
      const img = document.createElement("img");
      img.src = coverUrl;
      img.alt = ev.title || "cover";
      coverCard.appendChild(img);
    } else {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = "Nessuna copertina.";
      coverCard.appendChild(p);
    }

    // Gallery
    galleryBox.innerHTML = "";
    let gal = ev.gallery || ev.images || ev.photos || [];
    if (!Array.isArray(gal)) gal = [];
    if (!gal.length) {
      galleryEmpty.style.display = "block";
    } else {
      galleryEmpty.style.display = "none";
      for (const url of gal) {
        if (!url) continue;
        const img = document.createElement("img");
        img.src = url;
        img.alt = ev.title || "gallery";
        galleryBox.appendChild(img);
      }
    }
  }

  function populateEdit(ev){
    fTitle.value = ev.title || "";
    fDesc.value = ev.description || ev.desc || "";
    // fDate: tenta ISO locale
    try {
      if (ev.date) {
        const d = new Date(ev.date);
        fDate.value = new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
      } else {
        fDate.value = "";
      }
    } catch { fDate.value = ""; }
    fType.value = (ev.type || "").toLowerCase();
    fLocation.value = ev.location || ev.place || ev.address || "";
    fPrice.value = ev.price != null ? String(ev.price) : "";
    fCapacity.value = ev.capacity != null ? String(ev.capacity) : "";
  }

  function updateRoleUI(role){
    infoRole.textContent = role;
    const isOrganizer = role === "organizer";
    setHidden(participantActions, isOrganizer);
    setHidden(organizerActions, !isOrganizer);

    // reset edit mode UI
    setHidden(viewMode, false);
    setHidden(editForm, true);
    setHidden(saveBtn, true);
    setHidden(cancelEditBtn, true);
    setHidden(editBtn, !isOrganizer); // edit visibile solo per organizer
  }

  function updateJoinUI(){
    infoJoinState.textContent = joined ? "Partecipi" : "Non partecipi";
    setHidden(joinBtn, joined);
    setHidden(leaveBtn, !joined);
  }

  async function fetchJoinStateFromMe(){
    try {
      const me = await apiGet("/api/users/me");
      const arr = me?.joinedEvents || me?.attending || me?.eventsJoined || [];
      const set = new Set(arr.map(x => (typeof x === "string" ? x : (x?._id || x?.eventId))));
      joined = set.has(eventId);
    } catch {
      // fallback: se non riusciamo a leggere /me, lasciamo lo stato attuale
    }
  }

  async function loadEvent(){
    if (!eventId) throw new Error("ID evento mancante");
    const data = await apiGet(`/api/events/${eventId}`);
    eventData = data && data._id ? data : (data?.item || data?.event || null);
    if (!eventData) throw new Error("Evento non trovato");
    populateView(eventData);
    populateEdit(eventData);
  }

  // --- Actions
  if (backBtn) backBtn.addEventListener("click", backToList);

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("ggw_token");
      localStorage.removeItem("sessionRole");
      location.href = "/index.html";
    });
  }

  if (switchRoleBtn) {
    switchRoleBtn.addEventListener("click", async () => {
      const newRole = getRole() === "organizer" ? "participant" : "organizer";
      try {
        await fetch("/api/users/session-role", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
          body: JSON.stringify({ role: newRole })
        });
        setRole(newRole);
        // Aggiorna UI in linea con nuovo ruolo
        updateRoleUI(newRole);
        updateJoinUI();
      } catch {
        alert("Impossibile cambiare ruolo");
      }
    });
  }

  if (joinBtn) {
    joinBtn.addEventListener("click", async () => {
      try {
        await apiPost(`/api/users/join/${eventId}`);
        joined = true;
        updateJoinUI();
        statusEl.textContent = "Hai aderito all'evento.";
      } catch (e) {
        // fallback alias
        try {
          await apiPost(`/api/events/${eventId}/join`);
          joined = true;
          updateJoinUI();
          statusEl.textContent = "Hai aderito all'evento.";
        } catch (err) {
          alert(err.message || "Impossibile partecipare");
        }
      }
    });
  }

  if (leaveBtn) {
    leaveBtn.addEventListener("click", async () => {
      try {
        await apiPost(`/api/users/leave/${eventId}`);
        joined = false;
        updateJoinUI();
        statusEl.textContent = "Hai annullato la partecipazione.";
      } catch (e) {
        try {
          await apiPost(`/api/events/${eventId}/leave`);
          joined = false;
          updateJoinUI();
          statusEl.textContent = "Hai annullato la partecipazione.";
        } catch (err) {
          alert(err.message || "Impossibile annullare la partecipazione");
        }
      }
    });
  }

  if (editBtn) {
    editBtn.addEventListener("click", () => {
      setHidden(viewMode, true);
      setHidden(editForm, false);
      setHidden(editBtn, true);
      setHidden(saveBtn, false);
      setHidden(cancelEditBtn, false);
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      setHidden(viewMode, false);
      setHidden(editForm, true);
      setHidden(editBtn, false);
      setHidden(saveBtn, true);
      setHidden(cancelEditBtn, true);
      populateEdit(eventData); // ripristina valori
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      try {
        const body = {
          title: fTitle.value.trim(),
          description: fDesc.value.trim(),
          // normalizza data in ISO
          date: fDate.value ? new Date(fDate.value).toISOString() : null,
          type: fType.value || null,
          location: fLocation.value.trim(),
          price: fPrice.value ? Number(fPrice.value) : null,
          capacity: fCapacity.value ? Number(fCapacity.value) : null,
        };
        const updated = await apiPut(`/api/events/${eventId}`, body);
        eventData = updated && updated._id ? updated : (updated?.item || updated?.event || eventData);
        populateView(eventData);
        populateEdit(eventData);

        setHidden(viewMode, false);
        setHidden(editForm, true);
        setHidden(editBtn, false);
        setHidden(saveBtn, true);
        setHidden(cancelEditBtn, true);
        statusEl.textContent = "Evento aggiornato.";
      } catch (err) {
        alert(err.message || "Impossibile salvare le modifiche");
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!confirm("Confermi l'eliminazione dell'evento?")) return;
      try {
        await apiDelete(`/api/events/${eventId}`);
        alert("Evento eliminato");
        backToList();
      } catch (err) {
        alert(err.message || "Impossibile eliminare l'evento");
      }
    });
  }

  async function init(){
    if (!eventId) { alert("Evento non trovato"); backToList(); return; }

    // UI in base al ruolo di sessione
    const role = getRole();
    updateRoleUI(role);

    try {
      await loadEvent();
    } catch (err) {
      alert(err.message || "Errore nel caricamento evento");
      return;
    }

    // Partecipazione (solo se participant in sessione)
    if (getRole() !== "organizer") {
      try { await ensureRole("participant"); } catch {}
      try { await fetchJoinStateFromMe(); } catch {}
      updateJoinUI();
    } else {
      // organizer: niente join UI
      setHidden(participantActions, true);
    }
  }

  init();
})();













