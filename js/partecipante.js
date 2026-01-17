// js/partecipante.js — area Partecipante
//
// TODO UI/UX Overhaul:
// - Card evento con layout consistente (immagine, meta, azioni)
// - Stati dei bottoni (join/leave) uniformi e con feedback visivo
// - Filtri con componenti input standard (date, select, tag)
// - Notifiche errori/successo tramite componente centralizzato

import { apiGet, apiPost, getMyProfile } from "./api.js";
import { getRoomsUnreadCount } from "./api.js";
import { sortEventsForParticipant } from "./core/event-sorting.js";
import { renderEventCard } from "./home-cards.js";
import {
  injectBannerSlots,
  renderBannerSlotHTML,
  activateHomeBannerSlots
} from "./home-banners.js";
import { createParticipantMap } from "./map.js";
import { createEmbeddedEventChat } from "./map-chat.js";

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
 // ==============================
// PATCH: shared-ui source of truth
// ==============================
const DISABLE_LEGACY_TOPBAR_UI = true; 
if (!DISABLE_LEGACY_TOPBAR_UI) {  
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
 // >>> Profilo normalizzato (usato da più funzioni, evita doppie chiamate /users/me)
 let myUserId = null;
 let meCountry = "";
 let meRegion = "";


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

// participantMap.addPrivateEventsIfMissing(privateEvents);

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
     myUserId = me?._id || me?.user?._id || null;
     meCountry = (me?.country || me?.user?.country || "");
     meRegion = (me?.region || me?.user?.region || "");

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

// --- MAPPA: init (estratta in map.js) ---
// LEGACY MAPPA DISABLED: la MAPPA ora vive in js/partecipante-mappa.js
// Per riattivare temporaneamente la legacy, metti a true:
const ENABLE_LEGACY_MAPPA = false;

let participantMap = null;
let mapChat = null;

function handleMapEventSelect(ev) {
  // legacy disabled: funzione lasciata qui solo per compatibilità
  if (!ENABLE_LEGACY_MAPPA) return;
}

if (ENABLE_LEGACY_MAPPA) {
  participantMap = createParticipantMap({
    mapId: "map",
    onSelectEvent: handleMapEventSelect
  });
  participantMap.init();

  // Chat embedded nella pagina Mappa (blocchi sotto la mappa)
  mapChat = createEmbeddedEventChat({
    panelId: "mapChatPanel",
    composerId: "mapChatComposer",
    inputId: "mapChatInput",
    sendId: "mapChatSend"
  });

  // override reale (solo se legacy attiva)
  handleMapEventSelect = function (ev) {
    if (!ev) return;

    // BLOCCO 2 — dettaglio evento selezionato
    const mapSelected = document.getElementById("mapSelectedEvent");
    if (mapSelected) {
      mapSelected.innerHTML = `
        <div class="gw-map-selected-wrap">
          ${renderEventCard(ev, false, { detailsVariant: "plus", showCloseDetail: true })}
        </div>
      `;
    }

    // BLOCCO 3 — chat evento selezionato (embedded)
    const mapChatPanel = document.getElementById("mapChatPanel");
    if (mapChatPanel) {
      mapChat.openForEvent(ev._id, ev?.title || "Evento");
    }

    const mapChatComposer = document.getElementById("mapChatComposer");
    if (mapChatComposer) mapChatComposer.style.display = "flex";
  };
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
  if (allList) {
    allList.innerHTML = `
      <div class="gw-state gw-state--loading">
        Caricamento eventi...
      </div>
    `;
  }

  if (followingList) {
    followingList.innerHTML = `
      <div class="gw-state gw-state--loading">
        Caricamento...
      </div>
    `;
  }

  if (myList) {
    myList.innerHTML = `
      <div class="gw-state gw-state--loading">
        Caricamento...
      </div>
    `;
  }



    try {
    const qs = new URLSearchParams(filters);
     qs.set("__ts", String(Date.now())); // cache-buster
    const res = await apiGet(`/events?${qs.toString()}`, token);
      if (!res.ok) throw new Error(res.error || "Errore caricamento eventi");

      // Recupera anche i miei per marcare join/leave
      const myId = myUserId;
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
/*
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
*/
// --- MAPPA: aggiorna marker su cluster (map.js) ---
// LEGACY MAPPA DISABLED: la MAPPA è stata estratta in js/partecipante-mappa.js
if (participantMap && typeof participantMap.updateFromEvents === "function") {
  participantMap.updateFromEvents(res?.events || []);

  // restore focus su evento quando rientro da evento.html (focusEventId in querystring)
  try {
    const mapEl = document.getElementById("map");
    if (mapEl) {
      const url = new URL(window.location.href);
      const focusId = url.searchParams.get("focusEventId") || "";

      if (focusId && Array.isArray(res?.events)) {
        const evBack = res.events.find(e => String(e?._id) === String(focusId));
        if (evBack) {
          try { participantMap.focusOnEventId(focusId); } catch {}
          try { handleMapEventSelect(evBack); } catch {}
        }

        url.searchParams.delete("focusEventId");
        window.history.replaceState({}, "", url.toString());
      }
    }
  } catch {}
}

// >>> UI v2: rendering card per Home (carosello orizzontale)
// --- Banner: rendering card (inline) ---
const renderBannerCard = (b) => {
  const id = String(b?.id || b?._id || "");
  const title = b?.title || "Promozione";
  const img = b?.imageUrl || b?.image || "";
  const type = String(b?.type || "").toUpperCase();

  const kicker =
    type === "SPONSOR" ? "Sponsor" :
    type === "HOUSE" ? "Comunicazione" :
    "Promo";

  // Se hai un endpoint click con redirect, ok. Altrimenti usa targetUrl
  const clickHref = id
    ? `/api/banners/${encodeURIComponent(id)}/click?redirect=1`
    : (b?.targetUrl || "#");

  const bgStyle = img
    ? ` style="background-image:url('${img}'); background-size:cover; background-position:center;"`
    : "";

  return `
    <article class="gw-rail event-card gw-banner-card" data-banner-id="${id}">
      <a class="gw-banner-link" href="${clickHref}" aria-label="${title}">
        <div class="gw-thumb"${bgStyle}></div>
        <div class="content">
          <div class="meta" style="margin-top:0;">
            <span><strong>${kicker}</strong></span>
          </div>
          <h3 class="title">${title}</h3>
        </div>
      </a>
    </article>
  `;
};      
// Popola lista "tutti" (ordinata) + SLOT banner (dopo prima card, poi ogni 2)
if (allList) {
  const allItems = injectBannerSlots(notJoinedSorted);

  const renderRailItem = (item, includeLeave) => {
    if (item && item.__kind === "banner-slot") return renderBannerSlotHTML();
    if (item && item.__kind === "banner") return renderBannerCard(item); // fallback/compat
    return renderEventCard(item, includeLeave);
  };

  allList.innerHTML = allItems.length
    ? allItems.map((it) => renderRailItem(it, false)).join("")
    : `
      <div class="gw-state gw-state--empty">
        <strong>Nessun risultato</strong>
        Nessun evento disponibile.
      </div>
    `;

  // Attiva rotazione banner SOLO se lo slot è visibile (IntersectionObserver)
  activateHomeBannerSlots({
    container: allList,
    country: meCountry,
    region: meRegion,
    token,
    renderBannerCard
  });
}

 
// Popola lista "Eventi delle persone che segui"
if (followingList) {
  followingList.innerHTML = followingSorted.length
    ? followingSorted.map(ev => renderEventCard(ev, false)).join("")
    : `
      <div class="gw-state gw-state--empty">
        <strong>Nessun risultato</strong>
        Nessun evento dai tuoi seguiti.
      </div>
    `;
}

// Popola lista "a cui partecipo" (ordinata)
if (myList) {
  myList.innerHTML = joinedSorted.length
    ? joinedSorted.map(ev => renderEventCard(ev, true)).join("")
    : `
      <div class="gw-state gw-state--empty">
        <strong>Nessun risultato</strong>
        Nessun evento a cui partecipi.
      </div>
    `;
}

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

if (allList) {
  allList.innerHTML = `
    <div class="gw-state gw-state--error">
      <strong>Errore</strong>
      Si è verificato un errore nel caricamento degli eventi.
    </div>
  `;
}

if (followingList) followingList.innerHTML = "";
if (myList) myList.innerHTML = "";

  }

// Delegation click (tutti / miei + focus su mappa al click sulla card)
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");

    // 🔹 Nessun bottone azione: interpretiamo il click come "focus su mappa"
if (!btn) {
  const card = e.target.closest(".event-card");
  if (card) {
    const evId = card.getAttribute("data-event-id");
if (participantMap && typeof participantMap.focusOnEventId === "function" && evId) {
      participantMap.focusOnEventId(evId);
    }  }
  return;
}

    // 🔹 Da qui in poi: logica esistente per i bottoni (details / join / leave)
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    if (btn.disabled || btn.dataset.loading === "1") return;
    const cardEl = btn.closest(".event-card");
    const evTitleText = cardEl?.querySelector("h3")?.textContent?.trim() || "";
// 🔹 Chiudi SOLO il blocco dettaglio (drawer MAPPA), senza uscire dalla chat e senza resettare l’evento
    if (action === "close-detail") {
      const isMapPage = document.body.classList.contains("gw-page-map");
      const fromMapDrawer = !!btn.closest("#mapSelectedEvent");
      if (isMapPage && fromMapDrawer) {
        // Preferisci la funzione globale se esiste (la esporremo in partecipante-mappa.html)
        if (typeof window.gwCloseMapDetailDrawer === "function") {
          window.gwCloseMapDetailDrawer();
        } else {
          // Fallback DOM-safe (nessun reset chat/evento)
          const drawer = document.getElementById("mapDetailDrawer");
          const overlay = document.getElementById("mapDetailOverlay");
          if (drawer) drawer.hidden = true;
          if (overlay) overlay.hidden = true;
          document.body.classList.remove("gw-lock");
        }
      }
      return;
    }

if (action === "details") {
  sessionStorage.setItem("selectedEventId", id);

  // Se il click arriva dal drawer della MAPPA, memorizza contesto di ritorno
  // (serve a: nascondere "Apri chat evento" e far tornare "Torna alla lista" su MAPPA)
  const isMapPage = document.body.classList.contains("gw-page-map");
  const fromMapDrawer = !!btn.closest("#mapSelectedEvent");
if (isMapPage && fromMapDrawer) {
  sessionStorage.setItem("fromView", "map");
  sessionStorage.setItem("returnTo", "partecipante-mappa.html");
  sessionStorage.setItem("returnEventId", id);
} else {
  sessionStorage.removeItem("fromView");
  sessionStorage.removeItem("returnTo");
}


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
if (!DISABLE_LEGACY_TOPBAR_UI) {
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

// Avvio per-pagina
const isHomePage = !!document.getElementById("allEventsList");
const isMapPage = !!document.getElementById("map");

// HOME
if (isHomePage) {
  await loadEvents();
  setupScrollRails();
  await refreshPrivateEvents();
}

// MAPPA (solo eventi pubblici)
  if (isMapPage && !isHomePage) {
    await loadEvents();
  }


