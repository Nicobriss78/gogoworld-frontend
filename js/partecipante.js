// js/partecipante.js — area Partecipante
//
// TODO UI/UX Overhaul:
// - Card evento con layout consistente (immagine, meta, azioni)
// - Stati dei bottoni (join/leave) uniformi e con feedback visivo
// - Filtri con componenti input standard (date, select, tag)
// - Notifiche errori/successo tramite componente centralizzato

import { apiGet, apiPost } from "./api.js";

// Banner messaggi (error/success) con auto-hide opzionale
function showAlert(message, type = "error", opts = {}) {
  const { autoHideMs = 0 } = opts;
  const main = document.querySelector("main") || document.body;
  let box = document.getElementById("alertBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "alertBox";
    main.prepend(box);
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
    concluded: "Concluso"
  };
  const text = labelMap[status] || status;
  return `<p class="status ${status}">${text}</p>`;
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
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../index.html";
    return;
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
    if (!document.getElementById("welcomeMsg")) {
      const main = document.querySelector("main") || document.body;
      const p = document.createElement("p");
      p.id = "welcomeMsg";
      p.className = "welcome";
      p.textContent = `Benvenuto, ${name}! Sei nella tua area Partecipante.`;
      if (main.firstChild) main.insertBefore(p, main.firstChild); else main.appendChild(p);
    }
  } catch {
    // nessun blocco della UI se /users/me fallisce: lo gestirà loadEvents()
  }

  // >>> PATCH: popola tendine filtri
  populateFilterOptions();

  async function loadEvents(filters = {}) {
    allList.innerHTML = "<p>Caricamento...</p>";
    myList.innerHTML = "";

    try {
      const query = new URLSearchParams(filters).toString();
      const res = await apiGet(`/events${query ? "?" + query : ""}`, token);
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
      const notJoined = res.events.filter(ev => !joinedIds.has(ev._id));

      // >>> PATCH: funzione di rendering card arricchita (region/country, prezzo+currency)
      const renderCard = (ev, includeLeave) => {
        const priceStr = ev.isFree ? "Gratuito" : (ev.price != null ? `${ev.price} ${ev.currency || "EUR"}` : "-");
        const whereLine = `${ev.city || ""}${ev.region ? " • " + ev.region : ""}${ev.country ? " • " + ev.country : ""}`;
        return `
          <div class="event-card">
            <h3>${ev.title}</h3>
            ${renderStatus(ev.status)}
            <p>${whereLine} ${formatEventDate(ev)}</p>
            <p class="meta"><strong>Categoria:</strong> ${ev.category || ""}${ev.subcategory ? " • " + ev.subcategory : ""}</p>
            <p class="meta"><strong>Lingua/Target:</strong> ${ev.language || ""}${ev.target ? " • " + ev.target : ""}</p>
            <p class="meta"><strong>Prezzo:</strong> ${priceStr}</p>
            <div class="event-actions">
              <button class="btn btn-primary" data-id="${ev._id}" data-action="details">Dettagli</button>
              ${includeLeave
                ? `<button class="btn btn-secondary" data-id="${ev._id}" data-action="leave">Annulla</button>`
                : `<button class="btn btn-primary" data-id="${ev._id}" data-action="join">Partecipa</button>`}
            </div>
          </div>
        `;
      };

      // Popola lista "tutti"
      allList.innerHTML = notJoined.length
        ? notJoined.map(ev => renderCard(ev, false)).join("")
        : "<p>Nessun evento disponibile.</p>";

      // Popola lista "a cui partecipo"
      const joined = res.events.filter(ev => joinedIds.has(ev._id));
      myList.innerHTML = joined.length
        ? joined.map(ev => renderCard(ev, true)).join("")
        : "<p>Nessun evento a cui partecipi.</p>";

    } catch (err) {
      showAlert(err?.message || "Si è verificato un errore", "error", { autoHideMs: 4000 });
      allList.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
      myList.innerHTML = "";
    }
  }

  // Delegation click (tutti / miei)
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");

    if (action === "details") {
      sessionStorage.setItem("selectedEventId", id);
      window.location.href = "evento.html";
      return;
    }

    if (action === "join") {
      const res = await apiPost(`/events/${id}/join`, {}, token);
      if (!res.ok) {
        showAlert(res.error || "Errore iscrizione", "error", { autoHideMs: 4000 });
        return;
      }
      showAlert("Iscrizione effettuata", "success", { autoHideMs: 2500 });
      await loadEvents();
      return;
    }

    if (action === "leave") {
      const res = await apiPost(`/events/${id}/leave`, {}, token);
      if (!res.ok) {
        showAlert(res.error || "Errore annullamento", "error", { autoHideMs: 4000 });
        return;
      }
      showAlert("Partecipazione annullata", "success", { autoHideMs: 2500 });
      await loadEvents();
      return;
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
      window.location.href = "../index.html";
    });
  }

  // Inizializza
  hookFilters();

  // Prima lista
  loadEvents();
});



