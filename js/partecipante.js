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


  // Avvia PRIMA l'intervallo, poi la prima chiamata (così al primo 401 l'interval esiste già)
  _roomsBadgeInterval = setInterval(pollRoomsBadge, 20000);
  pollRoomsBadge();
// PATCH: handler bottone Room con returnTo coerente
const btnRooms = document.getElementById("btnRooms");
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
  const myList = document.getElementById("myEventsList");
  const btnFilters = document.getElementById("btnApplyFilters");
  const btnLogout = document.getElementById("btnLogout");
  const btnSwitchRole = document.getElementById("btnSwitchRole");

  // 👉 Benvenuto: creato UNA sola volta qui (non dentro loadEvents)
 try {
  const me = await apiGet("/users/me", token);
  // Fallback doppio: supporta payload piatto {name,email} e annidato {user:{…}}
  const name =
    me?.name ||
    me?.user?.name ||
    me?.email ||
    me?.user?.email ||
    "utente";
   // CHIP STATUS: ricava lo status (fallback compatibile con payload legacy)
  const statusRaw = (me?.status || me?.user?.status || "").toString().toLowerCase();
  const statusLabel = statusRaw ? (statusRaw[0].toUpperCase() + statusRaw.slice(1)) : "";
    if (!document.getElementById("welcomeMsg")) {
      const main = document.querySelector("main") || document.body;
      const p = document.createElement("p");
      p.id = "welcomeMsg";
      p.className = "welcome";
      p.textContent = `Benvenuto, ${name}! Sei nella tua area Partecipante.`;
      // CHIP STATUS: aggiungi badge di stato accanto al benvenuto
    if (statusRaw) {
      const chip = document.createElement("span");
      chip.className = `chip status-chip chip-${statusRaw}`;
      chip.textContent = statusLabel; // es. Novizio, Esploratore, Veterano, Ambassador
      p.appendChild(document.createTextNode(" "));
      p.appendChild(chip);
    }
      if (main.firstChild) main.insertBefore(p, main.firstChild); else main.appendChild(p);
    }
  } catch {
    // nessun blocco della UI se /users/me fallisce: lo gestirà loadEvents()
  }
 await maybeShowProfileNag(token);

  // >>> PATCH: popola tendine filtri
  populateFilterOptions();
// --- MAPPA: init Leaflet + MarkerCluster (se presente #map e libreria L) ---
const mapEl = document.getElementById("map");
let map, cluster;
// B2.2 — mappa: dizionario per trovare il marker a partire dall'ID evento
let markersById = {};

if (mapEl && window.L) {
  map = L.map("map").setView([41.8719, 12.5674], 6); // Italia
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
  cluster = L.markerClusterGroup();
  map.addLayer(cluster);
}

// C1.1 — Auto-focus sugli eventi imminenti/ongoing/futuri nella lista "Tutti gli eventi"
  function autoFocusOnRelevantEvent() {
    try {
      // Se l'utente ha già scrollato, non forzare alcun movimento
      if (window.scrollY > 20) return;

      const container = document.getElementById("allEventsList");
      if (!container) return;

      const statusOrder = ["imminent", "ongoing", "future"];
      let targetCard = null;

      for (const st of statusOrder) {
        targetCard = container.querySelector(`.event-card[data-status="${st}"]`);
        if (targetCard) break;
      }
      // Se non troviamo nulla (lista vuota), non facciamo niente
      if (!targetCard) return;

      const rect = targetCard.getBoundingClientRect();
      const newTop = rect.top + window.scrollY - 8; // piccolo margine
      window.scrollTo({ top: newTop, behavior: "auto" });
    } catch (err) {
      console.debug("[autoFocus] skip:", err);
    }
  }

  async function loadEvents(filters = {}) {
    allList.innerHTML = "<p>Caricamento...</p>";
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
      const joinedSorted = Array.isArray(joined)
        ? [...joined].sort(sortEventsForParticipant)
        : [];
// --- MAPPA: aggiorna marker su cluster ---
if (cluster && map && Array.isArray(res?.events)) {
  cluster.clearLayers();
  const markers = [];
  // B2.2 — reset mappa ID → marker
  markersById = {};

  for (const ev of res.events) {
    // Accetta varianti: lat/lon, lat/lng, e GeoJSON location.coordinates [lon, lat]
    const coords = Array.isArray(ev?.location?.coordinates) ? ev.location.coordinates : null;

    const latRaw =
      ev?.lat ?? ev?.Lat ?? ev?.latitude ??
      (coords ? coords[1] : undefined);

    const lonRaw =
      ev?.lon ?? ev?.lng ?? ev?.Lon ?? ev?.longitude ??
      (coords ? coords[0] : undefined);

    const lat = typeof latRaw === "string" ? parseFloat(latRaw.replace(",", ".")) : latRaw;
    const lon = typeof lonRaw === "string" ? parseFloat(lonRaw.replace(",", ".")) : lonRaw;

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      const m = L.marker([lat, lon]);
      const when = formatEventDate(ev);
      const title = ev?.title || "";
      m.bindPopup(`<b>${title}</b>${when ? "<br/>" + when : ""}`);

      markers.push(m);

      // B2.2 — collega marker all'evento per click su card
      if (ev?._id) {
        markersById[ev._id] = m;
      }
    }
  }

  // Aggiungi tutti i marker e adatta la vista
  if (markers.length) {
    markers.forEach(m => cluster.addLayer(m));
    try {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    } catch {}
  }
}


// >>> PATCH: funzione di rendering card arricchita (region/country, prezzo+currency + stato)
      const renderCard = (ev, includeLeave) => {
        const priceStr = ev.isFree
          ? "Gratuito"
          : (ev.price != null ? `${ev.price} ${ev.currency || "EUR"}` : "-");
        const whereLine = `${ev.city || ""}${ev.region ? " • " + ev.region : ""}${ev.country ? " • " + ev.country : ""}`;

        // Stato evento normalizzato
        const rawStatus = String(ev?.status || "").toLowerCase();
        const canJoin =
          rawStatus === "future" ||
          rawStatus === "imminent" ||
          rawStatus === "ongoing";
        const isConcluded = rawStatus === "concluded";
        const isPast = rawStatus === "past";

        // Base: il pulsante "Dettagli" è sempre presente
        let actionsHtml =
          `<button class="btn btn-primary" data-id="${ev._id}" data-action="details">Dettagli</button>`;

        if (includeLeave) {
          // Lista "A cui partecipo"
          if (!isPast) {
            // Sugli eventi passati non ha senso mostrare "Annulla"
            actionsHtml +=
              ` <button class="btn btn-secondary" data-id="${ev._id}" data-action="leave">Annulla</button>`;
          }
        } else {
          // Lista "Tutti gli eventi"
          if (canJoin) {
            actionsHtml +=
              ` <button class="btn btn-primary" data-id="${ev._id}" data-action="join">Partecipa</button>`;
          } else if (isConcluded || isPast) {
            // Stato concluso/past → solo etichetta informativa disabilitata
            const label = isPast ? "Evento passato" : "Evento concluso";
            actionsHtml +=
              ` <button class="btn btn-secondary btn-disabled" type="button" disabled>${label}</button>`;
          }
        }

return `
          <div class="event-card" data-status="${rawStatus}" data-event-id="${ev._id}">
            <h3>${ev.title}</h3>
            ${renderStatus(ev.status)}
            <p>${whereLine} ${formatEventDate(ev)}</p>
            <p class="meta"><strong>Categoria:</strong> ${ev.category || ""}${ev.subcategory ? " • " + ev.subcategory : ""}</p>
            <p class="meta"><strong>Lingua/Target:</strong> ${ev.language || ""}${ev.target ? " • " + ev.target : ""}</p>
            <p class="meta"><strong>Prezzo:</strong> ${priceStr}</p>
            <div class="event-actions">
              ${actionsHtml}
            </div>
          </div>
        `;
      };

// Popola lista "tutti" (ordinata)
      allList.innerHTML = notJoinedSorted.length
        ? notJoinedSorted.map(ev => renderCard(ev, false)).join("")
        : "<p>Nessun evento disponibile.</p>";

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

  // Inizializza
  hookFilters();

  // Prima lista
  loadEvents();
});
























