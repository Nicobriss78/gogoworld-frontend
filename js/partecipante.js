// js/partecipante.js — area Partecipante
//
// TODO UI/UX Overhaul:
// - Card evento con layout consistente (immagine, meta, azioni)
// - Stati dei bottoni (join/leave) uniformi e con feedback visivo
// - Filtri con componenti input standard (date, select, tag)
// - Notifiche errori/successo tramite componente centralizzato

import { apiGet, apiPost, getMyProfile } from "./api.js";
import { getRoomsUnreadCount } from "./api.js";

// Banner messaggi (error/success) con auto-hide opzionale
function showAlert(message, type = "error", opts = {}) {
  const { autoHideMs = 0 } = opts;
  const main = document.querySelector("main") || document.body;
  let box = document.getElementById("alertBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "alertBox";
    main.prepend(box);
    box.setAttribute("role", "status");
box.setAttribute("aria-live", "polite");
  }
  const t = type === "success" ? "success" : type === "error" ? "error" : "info";
  box.className = `alert ${t}`;
  box.textContent = message;

  if (autoHideMs > 0) {
    if (box._hideTimer) clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
      if (box && box.parentNode) box.parentNode.removeChild(box);
    }, autoHideMs);
  }
}

// Helper: format event date using available fields (date | dateStart [– endDate/dateEnd])
function formatEventDate(ev) {
  try {
    const start = ev?.date || ev?.dateStart;
    const end = ev?.endDate || ev?.dateEnd;
    if (!start && !end) return "";
    const startStr = start ? new Date(start).toLocaleDateString() : "";
    if (end) {
      const endStr = new Date(end).toLocaleDateString();
      if (startStr && endStr && startStr !== endStr) {
        return `${startStr} – ${endStr}`;
      }
    }
    return startStr;
  } catch { return ""; }
}

// >>> PATCH: helper per badge di stato (aggiunta, nessuna riga rimossa)
function renderStatus(status) {
  if (!status) return "";
  const labelMap = {
    ongoing: "In corso",
    imminent: "Imminente",
    future: "Futuro",
    concluded: "Concluso",
    past: "Passato"
  };
  const text = labelMap[status] || status;
  return `<p class="status ${status}">${text}</p>`;
}
// --- Banner “Completa il profilo” (mostra se nickname mancante) ---
async function maybeShowProfileNag(token) {
  try {
    if (sessionStorage.getItem("profileNag") === "0") return;
    const res = await getMyProfile(token);
    const p = res?.data || {};
    const incomplete = !p?.nickname; // criterio minimo: manca nickname
    if (!incomplete) return;

    const el = document.getElementById("profileNag");
    if (!el) return;

el.style.display = "";
el.classList.add("fade-in");
el.innerHTML = `

      <strong>Completa il tuo profilo</strong> per sbloccare al meglio le funzioni (es. messaggi diretti).&nbsp;
      <button id="nagGoProfile" class="btn">Completa ora</button>
      <button id="nagLater" class="btn btn-secondary">Più tardi</button>
    `;

    document.getElementById("nagGoProfile")?.addEventListener("click", () => {
    const ret = "/partecipante.html";
    window.location.href = `profile.html?returnTo=${encodeURIComponent(ret)}`;
    });
    document.getElementById("nagLater")?.addEventListener("click", () => {
      try { sessionStorage.setItem("profileNag", "0"); } catch {}
      el.remove();
    });
  } catch {}
}

// >>> PATCH: tassonomia e liste per tendine filtri
const TAXONOMY = {
  categories: {
    "Musica": ["Concerto","Festival","DJ set","Live acustico","Jam session","Rassegna","Karaoke","Open mic"],
    "Cibo & Sagre": ["Sagra","Street food","Degustazione vini","Degustazione birre","Cena tematica","Food market","Show cooking"],
    "Sport": ["Torneo","Gara","Corsa","Raduno","Lezione aperta","Esibizione","Partita amichevole","E-sport LAN"],
    "Arte & Cultura": ["Mostra","Vernissage","Teatro","Opera","Danza","Performance","Presentazione libro","Incontro con autore","Proiezione"],
    "Formazione & Workshop": ["Corso","Seminario","Workshop","Masterclass","Laboratorio per bambini","Mentoring","Meetup tematico"],
    "Notte & Club": ["Party","Serata a tema","Opening party","Closing party","Special guest","Silent disco"],
    "Mercati & Fiere": ["Mercatino","Fiera","Expo","Vintage market","Artigianato","Antiquariato","Auto/Moto d’epoca"],
    "Volontariato & Comunità": ["Raccolta fondi","Pulizia parco","Pulizia spiaggia","Donazioni","Raccolta alimentare","Evento solidale"],
    "Tecnologia & Startup": ["Conferenza","Hackathon","Demo day","Pitch night","Community meetup","Retrospettiva tech"],
    "Benessere & Outdoor": ["Yoga","Meditazione","Trekking","Escursione","Bike tour","Fitness all’aperto","Ritiro"],
    "Famiglia & Bambini": ["Festa bambini","Spettacolo famiglie","Laboratorio creativo","Letture animate"],
    "Motori": ["Raduno auto","Raduno moto","Track day","Esposizione","Drift"],
    "Tradizioni & Folklore": ["Corteo storico","Palio","Rievocazione","Festa patronale"],
    "Business & Networking": ["Networking night","Colazione d’affari","Tavola rotonda","Presentazione aziendale"],
    "Moda & Beauty": ["Sfilata","Shooting aperto","Fiera moda","Lancio prodotto"],
    "Eventi Privati": ["Compleanno","Laurea","Anniversario","Addio al celibato","Addio al nubilato","House party","Matrimonio","Battesimo","Comunione","Cresima","Team building","Kick-off","Riunione interna","Cena aziendale","Family day","Party in villa","Evento con lista","Club privato","Evento segreto"],
    "Altro": ["Generico","Sperimentale","Pop-up","Flash mob"]
  },
  regionsIT: ["Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"],
  languages: ["it","en","fr","de","es","other"],
  targets: ["tutti","famiglie","18+","professionisti"],
  countries: ["IT","FR","DE","ES","GB","US","other"]
};

function populateFilterOptions() {
  // Selects
  const selCat = document.getElementById("filterCategory");
  const selSub = document.getElementById("filterSubcategory");
  const selLang = document.getElementById("filterLanguage");
  const selTarget = document.getElementById("filterTarget");
  const selCountry = document.getElementById("filterCountry");
  const selRegionIT = document.getElementById("filterRegionSelect");

  // Categoria
  if (selCat) {
    selCat.innerHTML = `<option value="">Categoria</option>` +
      Object.keys(TAXONOMY.categories).map(c => `<option value="${c}">${c}</option>`).join("");
  }
  // Sottocategoria dipendente
  function refreshSub() {
    const cat = selCat?.value || "";
    const list = TAXONOMY.categories[cat] || [];
    if (selSub) {
      selSub.innerHTML = `<option value="">Sottocategoria</option>` +
        list.map(s => `<option value="${s}">${s}</option>`).join("");
    }
  }
  selCat?.addEventListener("change", refreshSub);
  refreshSub();

  // Lingue (se già presenti in HTML non sovrascriviamo le opzioni aggiuntive)
  if (selLang && selLang.options.length <= 1) {
    selLang.innerHTML = `<option value="">Lingua</option>` +
      TAXONOMY.languages.map(l => {
        const label = ({it:"Italiano", en:"Inglese", fr:"Francese", de:"Tedesco", es:"Spagnolo", other:"Altro"})[l] || l;
        return `<option value="${l}">${label}</option>`;
      }).join("");
  }

  // Target
  if (selTarget && selTarget.options.length <= 1) {
    selTarget.innerHTML = `<option value="">Target</option>` +
      TAXONOMY.targets.map(t => {
        const label = ({tutti:"Tutti", famiglie:"Famiglie", "18+":"18+", professionisti:"Professionisti"})[t] || t;
        return `<option value="${t}">${label}</option>`;
      }).join("");
  }

  // Country
  if (selCountry && selCountry.options.length <= 1) {
    selCountry.innerHTML = `<option value="">Paese</option>` +
      TAXONOMY.countries.map(c => {
        const label = ({IT:"Italia", FR:"Francia", DE:"Germania", ES:"Spagna", GB:"Regno Unito", US:"USA", other:"Altro"})[c] || c;
        return `<option value="${c}">${label}</option>`;
      }).join("");
  }

  // Regioni IT
  if (selRegionIT) {
    selRegionIT.innerHTML = `<option value="">Regione (IT)</option>` +
      TAXONOMY.regionsIT.map(r => `<option value="${r}">${r}</option>`).join("");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Token: se non c'è, esci subito (niente polling)
  const token = localStorage.getItem("token");
  // C1.1 — Flag per auto-focus iniziale (persistito nella sessione)
  let _autoFocusDone = false;
  try {
    if (sessionStorage.getItem("participant:autoFocusDone") === "1") {
      _autoFocusDone = true;
    }
  } catch {
    // se sessionStorage non è disponibile, ignoriamo e useremo solo il flag in memoria
  }

  // 🔁 Aggiorna le liste quando cambia la partecipazione in un'altra scheda
  window.addEventListener("events:joined-changed", () => {
    loadEvents();
  });

  // BroadcastChannel (cross-tab moderno)
  let _bc;
  try {
    _bc = new BroadcastChannel("gogoworld.events");
    _bc.addEventListener("message", (ev) => {
      if (ev?.data?.type === "joined-changed") {
        loadEvents();
      }
    });
  } catch (e) { /* ignore */ }

  // Fallback cross-tab tramite localStorage
  window.addEventListener("storage", (e) => {
    if (e.key === "events:joined-changed" && e.newValue) {
      // Nota: l'evento storage NON si attiva nella scheda che fa setItem,
      // ma si attiva nelle ALTRE schede dello stesso origin → perfetto per il nostro caso.
      loadEvents();
    }
  });

  // Cleanup canale quando si chiude la scheda
  window.addEventListener("beforeunload", () => {
    try { _bc?.close?.(); } catch (e) { /* ignore */ }
  });

  if (!token) {
    window.location.href = "index.html";
    return;
  }

  // Link al profilo
  const btnProfile = document.getElementById("btnProfileLink");
  if (btnProfile) {
    btnProfile.href = `profile.html?returnTo=${encodeURIComponent("/partecipante.html")}`;
  }

  // --- Badge "Room" con guard token e stop definitivo su 401 ---
  const badgeRooms = document.getElementById("roomsBadge");
  let _roomsBadgeInterval = null;
  // === A9.3 — Notifiche in-app ===
const btnNotifications = document.getElementById("btnNotifications");
const notiBadge = document.getElementById("notiBadge");
let _notiInterval = null;
let _notiDisabled = false;

// Crea pannello dropdown notifiche
let notiPanel = document.createElement("div");
notiPanel.id = "notiPanel";
notiPanel.className = "noti-panel";
notiPanel.style.display = "none";
document.body.appendChild(notiPanel);

  let _roomsBadgeDisabled = false; // flag di kill

  function _hideRoomsBadge() {
    if (badgeRooms) badgeRooms.style.display = "none";
  }

 async function pollRoomsBadge() {
  if (_roomsBadgeDisabled) return;

  const t = localStorage.getItem("token");
  if (!t) {
    _roomsBadgeDisabled = true;
    if (_roomsBadgeInterval) {
      clearInterval(_roomsBadgeInterval);
      _roomsBadgeInterval = null;
    }
    _hideRoomsBadge();
    return;
  }

  try {
const r = await getRoomsUnreadCount(t); // passa il token letto sopra

// se la risposta NON è ok (o è 401), spegni definitivamente il polling
if (!r || r.ok === false || r.status === 401) {
  _roomsBadgeDisabled = true;
  if (_roomsBadgeInterval) {
    clearInterval(_roomsBadgeInterval);
    _roomsBadgeInterval = null;
  }
  if (badgeRooms) badgeRooms.style.display = "none";
  console.debug("[roomsBadge] stop on response:", r);
  return;
}
    const n = r?.unread || 0;
    if (badgeRooms) {
      badgeRooms.textContent = n;
      badgeRooms.style.display = n ? "inline-block" : "none";
    }
  } catch (err) {
    // Disattiva SEMPRE il polling al primo errore
    _roomsBadgeDisabled = true;
    if (_roomsBadgeInterval) {
      clearInterval(_roomsBadgeInterval);
      _roomsBadgeInterval = null;
    }
    if (badgeRooms) badgeRooms.style.display = "none";
    console.debug("[roomsBadge] stop on error:", err && (err.status || err.code || err.message || err));
    return;
  }
}
  // === A9.3 — Poll notifiche non lette ===
  async function pollNotifications() {
    if (_notiDisabled) return;

    const t = localStorage.getItem("token");
    if (!t) {
      _notiDisabled = true;
      if (notiBadge) notiBadge.style.display = "none";
      return;
    }

    try {
      const res = await apiGet("/notifications/mine?limit=30&unreadOnly=1", t);

      if (!res || res.ok === false || res.status === 401) {
        _notiDisabled = true;
        if (notiBadge) notiBadge.style.display = "none";
        return;
      }

      const unread = res?.unreadCount || 0;
      if (notiBadge) {
        notiBadge.textContent = unread;
        notiBadge.style.display = unread ? "inline-block" : "none";
      }
    } catch (err) {
      _notiDisabled = true;
      if (notiBadge) notiBadge.style.display = "none";
    }
  }




  // Avvia PRIMA l'intervallo, poi la prima chiamata (così al primo 401 l'interval esiste già)
  _roomsBadgeInterval = setInterval(pollRoomsBadge, 20000);
  pollRoomsBadge();
  // === A9.3 — avvia polling notifiche
_notiInterval = setInterval(pollNotifications, 20000);
pollNotifications();

// PATCH: handler bottone Room con returnTo coerente
const btnRooms = document.getElementById("btnRooms");
// === A9.3 — apertura pannello notifiche ===
if (btnNotifications && notiPanel) {
  btnNotifications.addEventListener("click", async () => {
    if (!token) return;

    // Carica tutte le notifiche
    try {
      const res = await apiGet("/notifications/mine?limit=50", token);
      const list = res?.notifications || [];

      notiPanel.innerHTML = list.length
        ? list
            .map((n) => {
              const title = n.title || "";
              const msg = n.message || "";
              const date = n.createdAt
                ? new Date(n.createdAt).toLocaleString()
                : "";
              return `
                <div class="noti-item">
                  <p class="noti-title">${title}</p>
                  <p class="noti-msg">${msg}</p>
                  <p class="noti-date">${date}</p>
                </div>
              `;
            })
            .join("")
        : `<p class="noti-empty">Nessuna notifica</p>`;

      notiPanel.style.display =
        notiPanel.style.display === "none" ? "block" : "none";

      // Segna tutte come lette
      await apiPost("/notifications/read-all", {}, token);

      pollNotifications(); // aggiorna badge subito
    } catch (err) {
      console.error("notifiche", err);
    }
  });
}
if (btnRooms) {
  btnRooms.addEventListener("click", (e) => {
    // Se vogliamo solo passare il returnTo ora (la selezione stanza la gestiremo in rooms.js)
    const ret = "/partecipante.html";
    // Lasciamo l’ancora funzionare ma sovrascriviamo l'href con il returnTo
    btnRooms.href = `pages/rooms.html?returnTo=${encodeURIComponent(ret)}`;
    // (niente preventDefault: lasciamo navigare normalmente)
  });
}

 const allList = document.getElementById("allEventsList");
 const followingList = document.getElementById("followingEventsList");
 const myList = document.getElementById("myEventsList");
 const btnFilters = document.getElementById("btnApplyFilters");
 const btnLogout = document.getElementById("btnLogout");
 const btnSwitchRole = document.getElementById("btnSwitchRole");
  // --- UI v2: Hamburger menu (topbar) ---
 const btnHamburger = document.getElementById("btnHamburger");
 const gwMenu = document.getElementById("gwMenu");
 const btnGuide = document.getElementById("btnGuide");
 const btnPrivateEventsMenu = document.getElementById("btnPrivateEvents");
  // --- UI v2: Geolocalizzazione (solo toggle UI per ora) ---
 const btnGeo = document.getElementById("btnGeo");
 const GEO_UI_KEY = "gogoworld_geo_ui_enabled";
  // ==============================
// UI v2 — GEO toggle (solo UI)
// ==============================
function setGeoUiState(enabled) {
  if (!btnGeo) return;

  const ico = btnGeo.querySelector(".gw-ico");
  if (ico) {
    ico.classList.toggle("is-active", !!enabled);
  }

  try {
    localStorage.setItem(GEO_UI_KEY, enabled ? "1" : "0");
  } catch {}
}

function getGeoUiState() {
  try {
    return localStorage.getItem(GEO_UI_KEY) === "1";
  } catch {
    return false;
  }
}

 // --- Eventi privati: codice invito + lista locale ---
 const inviteInput = document.getElementById("inviteCodeInput");
 const btnApplyInvite = document.getElementById("btnApplyInvite");
 const privateListEl = document.getElementById("privateEventsList");
 const privateToggleBtn = document.getElementById("togglePrivateList");
 let PRIVATE_LS_KEY = "gogo_private_event_ids";
 
 let privateEventIds = [];
 let privateEvents = [];
 // Elenco ID utenti che seguo (riempito da /users/me)
 let followingIds = new Set();


  function loadPrivateIds() {
    try {
      const raw = localStorage.getItem(PRIVATE_LS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        privateEventIds = parsed.filter((id) => typeof id === "string" && id);
      } else {
        privateEventIds = [];
      }
    } catch {
      privateEventIds = [];
    }
  }

  function savePrivateIds(ids) {
    const uniq = Array.from(new Set(
      (ids || []).filter((id) => typeof id === "string" && id)
    ));
    privateEventIds = uniq;
    try {
      localStorage.setItem(PRIVATE_LS_KEY, JSON.stringify(uniq));
    } catch {
      // nessun blocco in caso di quota piena
    }
    updatePrivateCount();
  }

  function updatePrivateCount() {
    const span = document.getElementById("privateCount");
    if (!span) return;
    const n = privateEvents.length || privateEventIds.length || 0;
    span.textContent = String(n);
  }

  function renderPrivateList() {
    if (!privateListEl) return;
    if (!privateEvents.length) {
      privateListEl.innerHTML = `<li class="empty">Nessun evento privato sbloccato</li>`;
    } else {
      privateListEl.innerHTML = privateEvents
        .map((ev) => `<li data-id="${ev._id}">${ev.title || "(Senza titolo)"}</li>`)
        .join("");
    }
    updatePrivateCount();
  }

  async function refreshPrivateEvents() {
    if (!token) return;
    loadPrivateIds();

    if (!privateEventIds.length) {
      privateEvents = [];
      renderPrivateList();
      return;
    }

    const results = [];
    for (const id of privateEventIds) {
      try {
        const detail = await apiGet(`/events/${id}`, token);
        if (!detail?.ok || !detail?.event) continue;
        const ev = detail.event;

        // Se ormai è passato, lo togliamo dalla lista
        if (ev.status === "past") {
          continue;
        }

        results.push(ev);
      } catch {
        // silenzioso
      }
    }

    privateEvents = results;
    savePrivateIds(privateEvents.map((ev) => ev._id));
    renderPrivateList();
    // Aggiunge in mappa anche gli eventi privati sbloccati (se hanno coordinate)
    if (cluster && map && Array.isArray(privateEvents)) {
      for (const ev of privateEvents) {
        if (!ev?._id) continue;
        // se esiste già un marker (es. evento ora reso pubblico) non lo duplico
        if (markersById[ev._id]) continue;
        addMapMarkerForEvent(ev);
      }
    }

  }

  async function handleApplyInviteCode() {
    if (!inviteInput) return;
    const code = inviteInput.value.trim();
    if (!code) {
      showAlert("Inserisci un codice invito", "error", { autoHideMs: 2500 });
      return;
    }

    try {
      if (btnApplyInvite) {
        btnApplyInvite.disabled = true;
      }

      const res = await apiPost("/events/access-code", { code }, token);
      if (!res?.ok || !res?.event) {
        throw new Error(res?.error || "Codice invito non valido");
      }

      const ev = res.event;
      if (!ev?._id) throw new Error("Evento non valido");

      // Evita duplicati
      if (!privateEventIds.includes(ev._id)) {
        privateEvents.push(ev);
        savePrivateIds([...privateEventIds, ev._id]);
        renderPrivateList();
      }

      inviteInput.value = "";

      // apre la lista se era chiusa
      if (privateListEl && privateListEl.style.display === "none") {
        privateListEl.style.display = "block";
      }

      showAlert("Evento privato sbloccato", "success", { autoHideMs: 2500 });
    } catch (err) {
      const msg = err?.message || "Codice invito non valido";
      showAlert(msg, "error", { autoHideMs: 3000 });
    } finally {
      if (btnApplyInvite) {
        btnApplyInvite.disabled = false;
      }
    }
  }

  // Listener: codice invito
  if (btnApplyInvite) {
    btnApplyInvite.addEventListener("click", (e) => {
      e.preventDefault();
      handleApplyInviteCode();
    });
  }

  if (inviteInput) {
    inviteInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleApplyInviteCode();
      }
    });
  }

  // Listener: toggle menù a tendina “Eventi privati”
  if (privateToggleBtn && privateListEl) {
    privateToggleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const isHidden =
        privateListEl.style.display === "none" || !privateListEl.style.display;
      privateListEl.style.display = isHidden ? "block" : "none";
    });
  }

  // Click sulla voce della lista -> apre il dettaglio evento
  if (privateListEl) {
    privateListEl.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-id]");
      if (!li || li.classList.contains("empty")) return;
      const id = li.getAttribute("data-id");
      if (!id) return;
      sessionStorage.setItem("selectedEventId", id);
      window.location.href = "evento.html";
    });
  }
// 👉 Home v2: usa SOLO la topbar (niente "welcomeMsg" legacy in pagina)
  try {
    const me = await apiGet("/users/me", token);

    const name =
      me?.name ||
      me?.user?.name ||
      me?.email ||
      me?.user?.email ||
      "Utente";

    const statusRaw = (me?.status || me?.user?.status || "").toString().toLowerCase();
    const statusLabel = statusRaw
      ? (statusRaw[0].toUpperCase() + statusRaw.slice(1))
      : "Partecipante";

    // Scrive nella topbar v2
    const topName = document.getElementById("gwUserName");
    if (topName) topName.textContent = name;

    const topStatus = document.getElementById("gwUserStatus");
    if (topStatus) {
      topStatus.textContent = statusLabel || "Partecipante";
    }

    // >>> CHIAVE PER-UTENTE per eventi privati
    const myUserId = me?._id || me?.user?._id || null;
    if (myUserId) {
      PRIVATE_LS_KEY = `gogo_private_event_ids_${myUserId}`;
    }

    // >>> Elenco utenti che seguo (per lista eventi dei seguiti)
    const rawFollowing = me?.following || me?.user?.following || [];
    if (Array.isArray(rawFollowing)) {
      followingIds = new Set(
        rawFollowing
          .map(u => (u && (u._id || u.id || u)) || null)
          .filter(Boolean)
          .map(String)
      );
    }
  } catch {
    // non bloccare UI: loadEvents gestirà eventuali errori
  }

 await maybeShowProfileNag(token);

  // >>> PATCH: popola tendine filtri
  populateFilterOptions();
// --- MAPPA: init Leaflet + MarkerCluster (se presente #map e libreria L) ---
const mapEl = document.getElementById("map");
let map, cluster;
// B2.2 — mappa: dizionario per trovare il marker a partire dall'ID evento
let markersById = {};
// Helper: aggiunge un marker sulla mappa per un singolo evento
function addMapMarkerForEvent(ev) {
  if (!cluster || !map || !ev) return null;

  // stato normalizzato (future/imminent/ongoing/concluded/past)
  const statusRaw = String(ev?.status || "").toLowerCase();
  if (statusRaw === "past") return null; // niente marker per eventi completamente passati

  // Geo: supporta sia lat/lon diretti che GeoJSON location.coordinates [lon, lat]
  const coords = Array.isArray(ev?.location?.coordinates)
    ? ev.location.coordinates
    : null;

  const latRaw =
    ev?.lat ?? ev?.Lat ?? ev?.latitude ??
    (coords ? coords[1] : undefined);

  const lonRaw =
    ev?.lon ?? ev?.lng ?? ev?.Lon ?? ev?.longitude ??
    (coords ? coords[0] : undefined);

  const lat = typeof latRaw === "string" ? parseFloat(latRaw.replace(",", ".")) : latRaw;
  const lon = typeof lonRaw === "string" ? parseFloat(lonRaw.replace(",", ".")) : lonRaw;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  // Colore coerente con legenda
  let fill = "#4a90e2"; // future
  if (statusRaw === "imminent") fill = "#f5a623";
  else if (statusRaw === "ongoing") fill = "#d0021b";
  else if (statusRaw === "concluded") fill = "#999999";

  const m = L.circleMarker([lat, lon], {
    radius: 10,
    weight: 2,
    color: "#ffffff",
    fillColor: fill,
    fillOpacity: 1
  });

  const when = formatEventDate(ev);
  const title = ev?.title || "";
  m.bindPopup(`<b>${title}</b>${when ? "<br/>" + when : ""}`);

  cluster.addLayer(m);

  if (ev?._id) {
    markersById[ev._id] = m;
  }

  return m;
}

// B2.3 — helper: status evento → stringa normalizzata
function getEventStatusForMap(ev) {
  const raw = String(ev?.status || "").toLowerCase();
  if (
    raw === "future" ||
    raw === "imminent" ||
    raw === "ongoing" ||
    raw === "concluded" ||
    raw === "past"
  ) {
    return raw;
  }

  // Fallback minimo se manca lo status: prova a dedurre rispetto a oggi
  try {
    const now = Date.now();
    const start = ev?.dateStart || ev?.date || ev?.startDate;
    const end = ev?.dateEnd || ev?.endDate;
    const startMs = start ? Date.parse(start) : NaN;
    const endMs = end ? Date.parse(end) : NaN;

    if (Number.isFinite(endMs) && endMs < now) return "past";
    if (Number.isFinite(startMs) && startMs > now) return "future";
  } catch (_) {}

  return "future";
}

// (attualmente non usato, ma lo teniamo pronto)
function buildMarkerIcon(ev) {
  const status = getEventStatusForMap(ev);
  const statusClass = status ? `status-${status}` : "status-unknown";
  return L.divIcon({
    className: `status-marker ${statusClass}`,
    iconSize: [22, 22],
    html: '<span class="status-marker-inner"></span>'
  });
}

if (mapEl && window.L) {
  map = L.map("map").setView([41.8719, 12.5674], 6); // Italia
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
  cluster = L.markerClusterGroup();
  map.addLayer(cluster);
}

// C1.1 — Auto-focus sugli eventi imminenti/ongoing/futuri nel CAROUSEL "Tutti gli eventi"
function autoFocusOnRelevantEvent() {
  try {
    const container = document.getElementById("allEventsList");
    if (!container) return;

    // Se l’utente ha già interagito (scroll orizzontale) non forzare
    // (non possiamo leggere facilmente lo swipe, quindi evitiamo forzature aggressive)
    const statusOrder = ["imminent", "ongoing", "future"];
    let targetCard = null;

    for (const st of statusOrder) {
      targetCard = container.querySelector(`.event-card[data-status="${st}"]`);
      if (targetCard) break;
    }
    if (!targetCard) return;

    // Centro nel carousel
    targetCard.scrollIntoView({ behavior: "auto", inline: "center", block: "nearest" });
  } catch (err) {
    console.debug("[autoFocus] skip:", err);
  }
}

// ==============================
// UI v2 — ScrollRail (sync + drag)
// ==============================
function setupScrollRails() {
  const rails = document.querySelectorAll(".gw-scrollrail[data-rail-for]");
  if (!rails.length) return;

  rails.forEach((rail) => {
    const listId = rail.getAttribute("data-rail-for");
    const list = document.getElementById(listId);
    const thumb = rail.querySelector(".gw-scrollthumb");
    if (!list || !thumb) return;

    let dragging = false;
    let startX = 0;
    let startLeft = 0;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const syncThumb = () => {
      const maxScroll = list.scrollWidth - list.clientWidth;
      const railW = rail.clientWidth;

      if (maxScroll <= 0 || railW <= 0) {
        thumb.style.width = "100%";
        thumb.style.transform = "translateX(0px)";
        return;
      }

      const ratio = list.clientWidth / list.scrollWidth;
      const thumbW = clamp(Math.round(railW * ratio), 28, railW);
      thumb.style.width = `${thumbW}px`;

      const maxThumbX = railW - thumbW;
      const p = list.scrollLeft / maxScroll;
      const x = Math.round(maxThumbX * p);
      thumb.style.transform = `translateX(${x}px)`;
    };

    list.addEventListener("scroll", syncThumb, { passive: true });
    window.addEventListener("resize", syncThumb);

    const onPointerDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      rail.classList.add("is-dragging");

      startX = e.clientX;
      const m = /translateX\(([-0-9.]+)px\)/.exec(thumb.style.transform || "");
      startLeft = m ? parseFloat(m[1]) : 0;

      try { rail.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!dragging) return;

      const railW = rail.clientWidth;
      const thumbW = thumb.getBoundingClientRect().width;
      const maxThumbX = railW - thumbW;

      const dx = e.clientX - startX;
      const newX = clamp(startLeft + dx, 0, maxThumbX);

      const p = maxThumbX > 0 ? (newX / maxThumbX) : 0;
      const maxScroll = list.scrollWidth - list.clientWidth;
      list.scrollLeft = Math.round(maxScroll * p);

      e.preventDefault();
    };

    const onPointerUp = (e) => {
      if (!dragging) return;
      dragging = false;
      rail.classList.remove("is-dragging");
      try { rail.releasePointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    };

    rail.addEventListener("pointerdown", onPointerDown);
    rail.addEventListener("pointermove", onPointerMove);
    rail.addEventListener("pointerup", onPointerUp);
    rail.addEventListener("pointercancel", onPointerUp);

    syncThumb();
  });
}

  async function loadEvents(filters = {}) {
  allList.innerHTML = `<article class="gw-rail"><div class="gw-thumb"></div><div class="content"><h3 class="title">Caricamento…</h3><div class="meta"><span>Sto recuperando gli eventi</span></div></div></article>`;
    myList.innerHTML = "";

    try {
    const qs = new URLSearchParams(filters);
     qs.set("__ts", String(Date.now())); // cache-buster
    const res = await apiGet(`/events?${qs.toString()}`, token);
      if (!res.ok) throw new Error(res.error || "Errore caricamento eventi");

      // Recupera anche i miei per marcare join/leave
      const me = await apiGet("/users/me", token);
      const myId = me?._id;
      const joinedIds = new Set();
      if (Array.isArray(res?.events)) {
        for (const ev of res.events) {
          if (Array.isArray(ev?.participants) && myId) {
            if (ev.participants.some(p => (p?._id || p) === myId)) {
              joinedIds.add(ev._id);
            }
          }
        }
      }
// B1.3 — Lista "Tutti gli eventi": escludi gli eventi completamente passati
      const notJoined = res.events.filter((ev) => {
        // Se l'utente è già iscritto, questo evento NON va nella lista "Tutti gli eventi"
        if (joinedIds.has(ev._id)) return false;

        // Normalizza lo stato evento
        const s = String(ev?.status || "").toLowerCase();

        // Nascondi gli eventi "past" dalla lista pubblica
        return s !== "past";
      });
      // C1.1 — Ordinamento eventi per partecipante:
      // future → imminent → ongoing → concluded → past, con data di inizio crescente
      const statusPriority = {
        future: 1,
        imminent: 2,
        ongoing: 3,
        concluded: 4,
        past: 5
      };

      function getStatusPriority(ev) {
        const s = String(ev?.status || "").toLowerCase();
        return statusPriority[s] || 99;
      }

      function getStartTime(ev) {
        // Usiamo gli stessi campi della formatEventDate, ma in forma timestamp
        const raw = ev?.dateStart || ev?.date || ev?.startDate;
        if (!raw) return Number.POSITIVE_INFINITY;
        const t = new Date(raw).getTime();
        return Number.isFinite(t) ? t : Number.POSITIVE_INFINITY;
      }

      function sortEventsForParticipant(a, b) {
        const pa = getStatusPriority(a);
        const pb = getStatusPriority(b);
        if (pa !== pb) return pa - pb;
        const ta = getStartTime(a);
        const tb = getStartTime(b);
        return ta - tb;
      }

 const notJoinedSorted = Array.isArray(notJoined)
 ? [...notJoined].sort(sortEventsForParticipant)
 : [];
 
 const joined = res.events.filter(ev => joinedIds.has(ev._id));
 let joinedSorted = Array.isArray(joined)
 ? [...joined].sort(sortEventsForParticipant)
 : [];
 
 // Cx — Eventi organizzati da utenti che seguo
 let followingSorted = [];
 if (followingList && followingIds && followingIds.size && Array.isArray(res.events)) {
 const followingEvents = res.events.filter(ev => {
 const org = ev?.organizer;
 const orgId = org && (org._id || org.id || org);
 if (!orgId) return false;
 return followingIds.has(String(orgId));
 });
 followingSorted = [...followingEvents].sort(sortEventsForParticipant);
 }
 
 // Bx — includi anche eventuali eventi privati sbloccati a cui partecipo
 loadPrivateIds();

      if (Array.isArray(privateEventIds) && privateEventIds.length && myId) {
        const joinedSet = new Set(joinedSorted.map(ev => ev._id));

        for (const pid of privateEventIds) {
          if (!pid || joinedSet.has(pid)) continue;

          try {
            const detail = await apiGet(`/events/${pid}`, token);
            if (!detail?.ok || !detail?.event) continue;

            const ev = detail.event;
            if (!Array.isArray(ev?.participants)) continue;

            const isMine = ev.participants.some(
              (p) => (p?._id || p) === myId
            );
            if (!isMine) continue;

            joinedSorted.push(ev);
            joinedSet.add(pid);
          } catch {
            // silenzioso: non bloccare tutto se una chiamata fallisce
          }
        }

        // ri-ordina dopo aver aggiunto gli eventi privati
        joinedSorted = [...joinedSorted].sort(sortEventsForParticipant);
      }

// --- MAPPA: aggiorna marker su cluster ---
if (cluster && map && Array.isArray(res?.events)) {
  cluster.clearLayers();
  // reset mappa ID → marker
  markersById = {};
  const markers = [];

  for (const ev of res.events) {
    const m = addMapMarkerForEvent(ev);
    if (m) markers.push(m);
  }

  // Adatta la vista ai marker presenti
  if (markers.length) {
    try {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    } catch {}
  }
}



// >>> UI v2: rendering card per Home (carosello orizzontale)
const renderCard = (ev, includeLeave) => {
  const rawStatus = String(ev?.status || "").toLowerCase();

  const priceStr = ev?.isFree
    ? "Gratuito"
    : (ev?.price != null ? `${ev.price} ${ev.currency || "EUR"}` : "-");

  const whereLine =
    `${ev.city || ""}` +
    `${ev.region ? " • " + ev.region : ""}` +
    `${ev.country ? " • " + ev.country : ""}`;

  const when = formatEventDate(ev);

  const canJoin = rawStatus === "future" || rawStatus === "imminent" || rawStatus === "ongoing";
  const isConcluded = rawStatus === "concluded";
  const isPast = rawStatus === "past";

// Azioni: in card lasciamo SOLO un’icona "Info" (Dettagli)
  // Partecipa/Annulla vive nella pagina dettaglio evento (evento.html)
  const infoHtml = `
    <button class="gw-info-btn"
      type="button"
      title="Dettagli evento"
      aria-label="Dettagli evento"
      data-id="${ev._id}"
      data-action="details">ℹ️</button>
  `;


  // UI v2: gw-rail + gw-thumb + content/title/meta/actions
return `
    <article class="gw-rail event-card" data-status="${rawStatus}" data-event-id="${ev._id}">
      ${infoHtml}

      <div class="gw-card-scroll">
        <div class="gw-thumb"></div>

        <div class="content">
          <h3 class="title">${ev.title || "(Senza titolo)"}</h3>
          ${renderStatus(ev.status)}
          <div class="meta">
            ${whereLine ? `<span>${whereLine}</span>` : ""}
            ${when ? `<span>${when}</span>` : ""}
          </div>

          <div class="meta" style="margin-top:6px;">
            <span><strong>Categoria:</strong> ${ev.category || ""}${ev.subcategory ? " • " + ev.subcategory : ""}</span>
          </div>

          <div class="meta" style="margin-top:4px;">
            <span><strong>Lingua/Target:</strong> ${ev.language || ""}${ev.target ? " • " + ev.target : ""}</span>
          </div>

          <div class="meta" style="margin-top:4px;">
            <span><strong>Prezzo:</strong> ${priceStr}</span>
          </div>
        </div>
      </div>
    </article>
  `;
};

 // Popola lista "tutti" (ordinata)
 allList.innerHTML = notJoinedSorted.length
 ? notJoinedSorted.map(ev => renderCard(ev, false)).join("")
 : "<p>Nessun evento disponibile.</p>";
 
 // Popola lista "Eventi delle persone che segui"
 if (followingList) {
 followingList.innerHTML = followingSorted.length
 ? followingSorted.map(ev => renderCard(ev, false)).join("")
 : "<p>Nessun evento dai tuoi seguiti.</p>";
 }
 
 // Popola lista "a cui partecipo" (ordinata)
 myList.innerHTML = joinedSorted.length
 ? joinedSorted.map(ev => renderCard(ev, true)).join("")
 : "<p>Nessun evento a cui partecipi.</p>";

      // C1.1 — Auto-focus solo al primo caricamento, senza filtri e se l'utente non ha già scrollato
      const noFilters =
        !filters || (typeof filters === "object" && Object.keys(filters).length === 0);

      if (!_autoFocusDone && noFilters && window.scrollY < 20) {
        autoFocusOnRelevantEvent();
        _autoFocusDone = true;
        try {
          sessionStorage.setItem("participant:autoFocusDone", "1");
        } catch {}
      }

    } catch (err) {
      showAlert(err?.message || "Si è verificato un errore", "error", { autoHideMs: 4000 });
      allList.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
      myList.innerHTML = "";
    }
  }

// Delegation click (tutti / miei + focus su mappa al click sulla card)
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");

    // 🔹 Nessun bottone azione: interpretiamo il click come "focus su mappa"
    if (!btn) {
      const card = e.target.closest(".event-card");
      if (card && map && markersById) {
        const evId = card.getAttribute("data-event-id");
        const marker = evId ? markersById[evId] : null;

        if (marker && typeof marker.getLatLng === "function") {
          const latLng = marker.getLatLng();
          try {
            // Zoom minimo 8, per non restare troppo lontani
            const targetZoom = Math.max(map.getZoom() || 0, 8);
            map.setView(latLng, targetZoom, { animate: true });
            marker.openPopup();
          } catch (err) {
            console.debug("[map focus] errore centratura:", err);
          }
        }
      }
      return; // importantissimo: non proseguiamo con la logica bottoni
    }

    // 🔹 Da qui in poi: logica esistente per i bottoni (details / join / leave)
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    if (btn.disabled || btn.dataset.loading === "1") return;
    const cardEl = btn.closest(".event-card");
    const evTitleText = cardEl?.querySelector("h3")?.textContent?.trim() || "";

    if (action === "details") {
      sessionStorage.setItem("selectedEventId", id);
      window.location.href = "evento.html";
      return;
    }

    if (action === "join") {
      try {
        btn.dataset.loading = "1";
        btn.disabled = true;

        const res = await apiPost(`/events/${id}/join`, {}, token);
        if (!res.ok) {
          showAlert(res.error || "Errore iscrizione", "error", { autoHideMs: 4000 });
          return;
        }
        showAlert(`Iscrizione effettuata${evTitleText ? ' a "' + evTitleText + '"' : ''}`, "success", { autoHideMs: 2500 });

        await loadEvents();
        return;
      } catch (err) {
        showAlert(err?.message || "Errore iscrizione", "error", { autoHideMs: 4000 });
      } finally {
        btn.dataset.loading = "";
        btn.disabled = false;
      }
    }

    if (action === "leave") {
      try {
        btn.dataset.loading = "1";
        btn.disabled = true;

        const res = await apiPost(`/events/${id}/leave`, {}, token);
        if (!res.ok) {
          showAlert(res.error || "Errore annullamento", "error", { autoHideMs: 4000 });
          return;
        }
        showAlert(`Partecipazione annullata${evTitleText ? ' per "' + evTitleText + '"' : ''}`, "success", { autoHideMs: 2500 });

        await loadEvents();
        return;
      } catch (err) {
        showAlert(err?.message || "Errore annullamento", "error", { autoHideMs: 4000 });
      } finally {
        btn.dataset.loading = "";
        btn.disabled = false;
      }
    }
  });

  // Filtri
  const hookFilters = () => {
    if (!btnFilters) return;
    btnFilters.addEventListener("click", async () => {
      const filters = {};
      // esistenti (testuali/date)
      const title = document.getElementById("filterTitle")?.value?.trim();
      const city = document.getElementById("filterCity")?.value?.trim();
      const region = document.getElementById("filterRegion")?.value?.trim();
      const dateStart = document.getElementById("filterDateStart")?.value?.trim();
      const dateEnd = document.getElementById("filterDateEnd")?.value?.trim();
      if (title) filters.title = title;
      if (city) filters.city = city;
      if (region) filters.region = region;
      if (dateStart) filters.dateStart = dateStart;
      if (dateEnd) filters.dateEnd = dateEnd;

      // >>> PATCH: nuovi filtri da tendine
      const cat = document.getElementById("filterCategory")?.value || "";
      const sub = document.getElementById("filterSubcategory")?.value || "";
      const lang = document.getElementById("filterLanguage")?.value || "";
      const tgt = document.getElementById("filterTarget")?.value || "";
      const country = document.getElementById("filterCountry")?.value || "";
      const regionSel = document.getElementById("filterRegionSelect")?.value || "";
      if (cat) filters.category = cat;
      if (sub) filters.subcategory = sub;
      if (lang) filters.language = lang;
      if (tgt) filters.target = tgt;
      if (country) filters.country = country;
      if (regionSel) filters.region = regionSel; // prevale sul campo testo se valorizzato

      await loadEvents(filters);
    });
  };

  // Switch ruolo
  if (btnSwitchRole) {
    btnSwitchRole.addEventListener("click", () => {
      sessionStorage.setItem("desiredRole", "organizer");
      window.location.href = "organizzatore.html";
    });
  }

// Logout
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("token");
      sessionStorage.removeItem("desiredRole");
      window.location.href = "index.html";
    });
  }
// ==============================
  // UI v2 — Hamburger menu behavior
  // ==============================
  const closeGwMenu = () => {
    if (!gwMenu) return;
    gwMenu.style.display = "none";
    try { btnHamburger?.setAttribute("aria-expanded", "false"); } catch {}
  };

  const toggleGwMenu = () => {
    if (!gwMenu) return;
    const isOpen = gwMenu.style.display === "block";
    gwMenu.style.display = isOpen ? "none" : "block";
    try { btnHamburger?.setAttribute("aria-expanded", String(!isOpen)); } catch {}
  };

  // Toggle menu su click hamburger
  if (btnHamburger && gwMenu) {
    btnHamburger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleGwMenu();
    });

    // Click dentro menu: non chiudere “per sbaglio”
    gwMenu.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    // Click fuori: chiude
    document.addEventListener("click", () => closeGwMenu());

    // ESC: chiude
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeGwMenu();
    });
  }

  // Voce menu: Eventi privati (per ora mostra la sezione legacy)
  if (btnPrivateEventsMenu) {
    btnPrivateEventsMenu.addEventListener("click", (e) => {
      e.preventDefault();
      closeGwMenu();

      const legacy = document.querySelector("section.legacy");
      if (legacy) {
        legacy.style.display = legacy.style.display === "none" ? "block" : "none";
        legacy.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        alert("Sezione Eventi privati non trovata (legacy).");
      }
    });
  }

  // Voce menu: Guida partecipante (placeholder)
  if (btnGuide) {
    btnGuide.addEventListener("click", (e) => {
      e.preventDefault();
      closeGwMenu();
      alert("Guida partecipante: in arrivo 🙂");
    });
  }
  // ==============================
  // UI v2 — GEO toggle wiring
  // ==============================
  if (btnGeo) {
    setGeoUiState(getGeoUiState());

    btnGeo.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const nowEnabled = !getGeoUiState();
      setGeoUiState(nowEnabled);

      if (nowEnabled) {
        console.log("[GEO] UI enabled (permessi GPS verranno gestiti più avanti)");
      } else {
        console.log("[GEO] UI disabled");
      }
    });
  }

  // Inizializza
  hookFilters();

// Prima lista + eventuali eventi privati già sbloccati
await loadEvents();
  setupScrollRails();
  await refreshPrivateEvents();
});




