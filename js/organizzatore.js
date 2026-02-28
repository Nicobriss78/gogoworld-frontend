// js/organizzatore.js — area Organizzatore
//
// TODO UI/UX Overhaul:
// - Lista "I miei eventi" con card/table responsive e azioni visibili
// - Conferme modali standard per delete (invece di confirm())
// - Banner “welcome” con micro-CTA (es. “Crea nuovo evento”)

import { apiGet, apiDelete, apiPost, whoami, getMyProfile } from "./api.js";
import { getRoomsUnreadCount } from "./api.js";
// ==============================
// J2 helpers — show/hide via classi (no element.style.display)
// ==============================
function setHidden(el, hidden) {
  if (!el) return;
  el.classList.toggle("is-hidden", !!hidden);
}
function isHiddenEl(el) {
  return !!el?.classList?.contains("is-hidden");
}
function showEl(el) { setHidden(el, false); }
function hideEl(el) { setHidden(el, true); }
function toggleHidden(el) { setHidden(el, !isHiddenEl(el)); }

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

// --- PATCH orari: unisce "YYYY-MM-DD" + "HH:MM" in ISO ---
function combineDateAndTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (timeStr && /^\d{2}:\d{2}$/.test(timeStr)) {
    const [hh, mm] = timeStr.split(":").map(Number);
    d.setHours(hh, mm, 0, 0);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d.toISOString();
}

// --- PATCH Prezzo/Gratuito (organizzatore) ---
function hookFreePrice(form) {
  if (!form) return;
  const chkFree = form.querySelector('input[name="isFree"]');
  const inputPrice = form.querySelector('input[name="price"]');
  const inputCurr = form.querySelector('select[name="currency"], input[name="currency"]');

  function applyFreeState() {
    const free = !!chkFree?.checked;
    if (!inputPrice || !inputCurr) return;

    if (free) {
      inputPrice.value = "0";
      inputCurr.value = ""; // oppure "EUR" se preferisci vedere la default
      inputPrice.disabled = true;
      inputCurr.disabled = true;
    } else {
      inputPrice.disabled = false;
      inputCurr.disabled = false;
    }
  }

  chkFree?.addEventListener("change", applyFreeState);
  applyFreeState(); // inizializza stato UI
}
// Generatore codice evento privato (client-side)
function generateRandomAccessCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // senza O/0, I/1, ecc.
  const length = 8;
  let out = "";

  const cryptoObj = window.crypto || window.msCrypto;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const buf = new Uint32Array(length);
    cryptoObj.getRandomValues(buf);
    for (let i = 0; i < length; i++) {
      out += alphabet[buf[i] % alphabet.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      const idx = Math.floor(Math.random() * alphabet.length);
      out += alphabet[idx];
    }
  }

  return out;
}
// --- PATCH Evento privato / accessCode (organizzatore) ---
function hookPrivateVisibility(form) {
  if (!form) return;

  const selVisibility = form.querySelector('select[name="visibility"]');
  const privateBox = document.getElementById("privateOptions");
  const accessInput = form.querySelector('input[name="accessCode"]');
  const btnGenerateCode = document.getElementById("btnGenerateAccessCode");

  function applyPrivateState() {
    if (!selVisibility || !privateBox) return;
    const isPriv = selVisibility.value === "private";

    setHidden(privateBox, !isPriv);

    if (accessInput) {
      accessInput.disabled = !isPriv;
      if (!isPriv) {
        accessInput.value = "";
      }
    }
  }

  selVisibility?.addEventListener("change", applyPrivateState);
  applyPrivateState(); // inizializza stato UI

  // Gestione click "Genera codice"
  if (btnGenerateCode && accessInput) {
    btnGenerateCode.addEventListener("click", () => {
      // se non è già privato, imposta a privato e aggiorna la UI
      if (selVisibility && selVisibility.value !== "private") {
        selVisibility.value = "private";
        applyPrivateState();
      }

      accessInput.disabled = false;
      accessInput.value = generateRandomAccessCode();
      accessInput.focus();
      accessInput.select();
    });
  }
}


// Renderizza un’etichetta stato compatta (ongoing/imminent/future/concluded)
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
// --- Banner “Completa il profilo” (mostra se nickname mancante) ---
async function maybeShowProfileNag(token) {
  try {
    if (sessionStorage.getItem("profileNag") === "0") return;
    const res = await getMyProfile(token);
    const p = res?.data || {};
    const incomplete = !p?.nickname;
    if (!incomplete) return;

    const el = document.getElementById("profileNag");
    if (!el) return;

showEl(el);
el.classList.add("fade-in");
el.innerHTML = `
  <strong>Completa il tuo profilo</strong> per sfruttare al meglio l’area Organizzatore.&nbsp;
  <button id="nagGoProfile" class="btn">Completa ora</button>
  <button id="nagLater" class="btn btn-secondary">Più tardi</button>
`;
document.getElementById("nagGoProfile")?.addEventListener("click", () => {
  const ret = "/organizzatore.html";
  window.location.href = `profile.html?returnTo=${encodeURIComponent(ret)}`;
});
document.getElementById("nagLater")?.addEventListener("click", () => {
  try { sessionStorage.setItem("profileNag", "0"); } catch {}
  el.remove();
});
} catch {}
}

document.addEventListener("DOMContentLoaded", () => {
  // Token base (come da tua logica attuale)
  const token =
  localStorage.getItem("token") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("authToken") ||
  localStorage.getItem("authToken") ||
  sessionStorage.getItem("jwt") ||
  localStorage.getItem("jwt") ||
  sessionStorage.getItem("accessToken") ||
  localStorage.getItem("accessToken");
const btnProfile = document.getElementById("btnProfileLink");
const badgeRooms = document.getElementById("roomsBadge");

// === A9.3.2 Notifiche in-app ===
const btnNotifications = document.getElementById("btnNotifications");
const notiBadge = document.getElementById("notiBadge");
let _notiInterval = null;
let _notiDisabled = false;

let notiPanel = document.createElement("div");
notiPanel.id = "notiPanel";
notiPanel.className = "noti-panel";
hideEl(notiPanel);
document.body.appendChild(notiPanel);

let _roomsBadgeInterval = null;
let _roomsBadgeDisabled = false;

function _hideRoomsBadge() {
  hideEl(badgeRooms);
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
    const r = await getRoomsUnreadCount(t); // passa il token
    // se l'API restituisce oggetto non ok (es. {ok:false,status:401}), spegni
    if (!r || r.ok === false || r.status === 401) {
      _roomsBadgeDisabled = true;
      if (_roomsBadgeInterval) {
        clearInterval(_roomsBadgeInterval);
        _roomsBadgeInterval = null;
      }
      _hideRoomsBadge();
      return;
    }

    const n = r?.unread || 0;
    if (badgeRooms) {
      badgeRooms.textContent = n;
      setHidden(badgeRooms, !n);
    }
  } catch (err) {
    _roomsBadgeDisabled = true;
    if (_roomsBadgeInterval) {
      clearInterval(_roomsBadgeInterval);
      _roomsBadgeInterval = null;
    }
    _hideRoomsBadge();
  }
}

// === A9.3.2 — Poll notifiche non lette ===
async function pollNotifications() {
  if (_notiDisabled) return;

  const t = localStorage.getItem("token");
  if (!t) {
    _notiDisabled = true;
    hideEl(notiBadge);
    return;
  }

  try {
    const res = await apiGet("/notifications/mine?limit=30&unreadOnly=1", t);

    if (!res || res.ok === false || res.status === 401) {
      _notiDisabled = true;
      hideEl(notiBadge);
      return;
    }

    const unread = res?.unreadCount || 0;
    if (notiBadge) {
      notiBadge.textContent = unread;
      setHidden(notiBadge, !unread);
    }
  } catch (err) {
    _notiDisabled = true;
    hideEl(notiBadge);
  }
}

_roomsBadgeInterval = setInterval(pollRoomsBadge, 20000);
pollRoomsBadge();

// === A9.3.2 — avvia polling notifiche
_notiInterval = setInterval(pollNotifications, 20000);
pollNotifications();
if (btnProfile) btnProfile.href = `profile.html?returnTo=${encodeURIComponent("/organizzatore.html")}`;

  if (!token) {
    window.location.href = "../index.html";
    return;
  }

  // PATCH: verifica permessi lato server prima di procedere
  (async () => {
    try {
      const me = await whoami(token);
      // accetta organizer/admin o chi ha canOrganize === true
      const role = String(me?.user?.role || "").toLowerCase();
      const canOrg = me?.user?.canOrganize === true;
      if (!(role === "organizer" || role === "admin" || canOrg)) {
        showAlert("Accesso riservato agli organizzatori.", "error", { autoHideMs: 3500 });
        setTimeout(() => (window.location.href = "partecipante.html"), 600);
        return;
      }
      // Banner: invito a completare il profilo
      await maybeShowProfileNag(token);
    } catch {
      showAlert("Verifica permessi non riuscita. Effettua di nuovo il login.", "error", { autoHideMs: 3500 });
      setTimeout(() => (window.location.href = "login.html"), 600);
      return;
    }
  })();

  // Benvenuto: eseguito una sola volta e con guardia anti-duplicazione
  (async () => {
    try {
      const me = await apiGet("/users/me", token);
      // FIX CHIRURGICO: supporta payload piatto {name,email} e annidato {user:{...}}
      const name =
        me?.name ||
        me?.user?.name ||
        me?.email ||
        me?.user?.email ||
        "utente";

    // PATCH: non auto-abilitare più; se non abilitato mostra solo un avviso discreto (no enable)
if (me && me.canOrganize !== true && String(me?.user?.role || me?.role || "").toLowerCase() !== "admin") {
  showAlert("Non sei abilitato come organizzatore. Contatta un amministratore se ti serve l’accesso.", "info", { autoHideMs: 4000 });
}

      if (!document.getElementById("welcomeMsg")) {
        const main = document.querySelector("main") || document.body;
        const p = document.createElement("p");
        p.id = "welcomeMsg";
        p.className = "welcome";
        p.textContent = `Benvenuto, ${name}! Sei nella tua area Organizzatore.`;
        if (main.firstChild) main.insertBefore(p, main.firstChild); else main.appendChild(p);
      } else {
        document.getElementById("welcomeMsg").textContent =
          `Benvenuto, ${name}! Sei nella tua area Organizzatore.`;
      }
    } catch {
      /* silente */
    }
  })();

  const listContainer = document.getElementById("myEventsList");
  const btnFilters = document.getElementById("btnApplyFilters");
  const btnLogout = document.getElementById("btnLogout");
  const btnSwitchRole = document.getElementById("btnSwitchRole");
  const btnCreate = document.getElementById("btnCreateEvent");
  const btnMyPromos = document.getElementById("btnMyPromos");
  const myPromosPanel = document.getElementById("myPromosPanel");
  const btnMyPromosRefresh = document.getElementById("btnMyPromosRefresh");
  const btnMyPromosClose = document.getElementById("btnMyPromosClose");
  const myPromosTable = document.getElementById("myPromosTable");
  const myPromosFilterStatus = document.getElementById("myPromosFilterStatus");
  const myPromosFilterPlacement = document.getElementById("myPromosFilterPlacement");
  // === A9.3.2 — apertura pannello notifiche ===
  if (btnNotifications && notiPanel) {
    btnNotifications.addEventListener("click", async () => {
      const tokenNow = localStorage.getItem("token");
      if (!tokenNow) return;

      try {
        const res = await apiGet("/notifications/mine?limit=50", tokenNow);
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

        toggleHidden(notiPanel);

        // Segna tutte come lette
        await apiPost("/notifications/read-all", {}, tokenNow);
        pollNotifications();
      } catch (err) {
        console.error("[notifiche organizer]", err);
      }
    });
  }

  // PATCH: bottone Importa CSV
  const btnImportCsv = document.getElementById("btnImportCsv");
  
  // PATCH: riferimenti al pannello di creazione e form
  const panel = document.getElementById("createEventPanel");
  const form = document.getElementById("createEventForm");
  const btnCancelCreate = document.getElementById("btnCancelCreate");
// --- Pannello Promuovi evento (organizer)
  const promotePanel = document.getElementById("promotePanel");
  const promoteForm = document.getElementById("promoteForm");
  const btnPromoteCancel = document.getElementById("btnPromoteCancel");
  const promoteEventIdInput = document.getElementById("promoteEventId");
  const promoteEventTitle = document.getElementById("promoteEventTitle");

  function openPromotePanel(ev) {
    if (!promotePanel || !promoteForm) return;
    promoteEventIdInput.value = ev._id || "";
    // Prefill: titolo banner = titolo evento
    const title = (ev.title || "").toString().trim();
    document.getElementById("pmTitle").value = title;
    // Prefill: target → pagina evento
    const base = location.origin.replace(/\/$/, "");
    const target = base + "/evento.html?id=" + encodeURIComponent(ev._id);
    document.getElementById("pmTarget").value = target;
    promoteEventTitle.textContent = title || "—";
    showEl(promotePanel);
    promotePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (btnPromoteCancel && promotePanel) {
    btnPromoteCancel.addEventListener("click", () => {
      promoteForm?.reset();
      hideEl(promotePanel);
    });
  }

  if (promoteForm) {
    promoteForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const eventId = promoteEventIdInput.value;
      if (!eventId) { showAlert("Evento non valido", "error", { autoHideMs: 3000 }); return; }
      const body = {
        type: "event_promo",
        source: "organizer",
        status: "PENDING_REVIEW",
        eventId: eventId,
        title: document.getElementById("pmTitle").value.trim(),
        imageUrl: document.getElementById("pmImage").value.trim(),
        targetUrl: document.getElementById("pmTarget").value.trim(),
        placement: document.getElementById("pmPlacement").value,
        country: (document.getElementById("pmCountry").value || "").trim() || null,
        region: (document.getElementById("pmRegion").value || "").trim() || null,
        activeFrom: document.getElementById("pmFrom").value ? new Date(document.getElementById("pmFrom").value).toISOString() : null,
        activeTo: document.getElementById("pmTo").value ? new Date(document.getElementById("pmTo").value).toISOString() : null,
        priority: Number(document.getElementById("pmPriority").value || 100),
        isActive: true
      };
      // Validazioni minime https://
      if (!/^https:\/\//.test(body.imageUrl) || !/^https:\/\//.test(body.targetUrl)) {
        showAlert("Usa URL https:// per Immagine e Destinazione", "error", { autoHideMs: 4000 });
        return;
      }
      try {
      const res = await apiPost("/banners/submit", body, token);
      if (!res?.ok) { throw new Error(res?.message || res?.error || "Invio non riuscito"); }
        showAlert("Richiesta inviata — in attesa di approvazione", "success", { autoHideMs: 4000 });
        promoteForm.reset();
        hideEl(promotePanel);
      } catch (err) {
        showAlert(err?.message || "Errore invio richiesta", "error", { autoHideMs: 4000 });
      }
    });
  }

  // PATCH: tassonomia e liste (minimo necessario per popolare le tendine)
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
    currencies: ["EUR","USD","GBP","CHF","RON","other"]
  };
// ---------------------------------------------------------------------------
  // Tabella Durate Stimate (avanzata) — Categoria + Sottocategoria
  // Valori in MINUTI. Se sottocategoria non trovata, usa default categoria.
  // NOTA: non ricalcoliamo su cambio categoria (scelta Nico).
  // ---------------------------------------------------------------------------
  const DEFAULT_EVENT_MINUTES = 360; // fallback generico (6h)

  const DURATION_MINUTES = {
    "Musica": {
      _default: 240,
      "Concerto": 180,
      "Festival": 480,
      "DJ set": 300,
      "Live acustico": 150,
      "Jam session": 180,
      "Rassegna": 240,
      "Karaoke": 180,
      "Open mic": 180
    },
    "Cibo & Sagre": {
      _default: 480,
      "Sagra": 600,
      "Street food": 360,
      "Degustazione vini": 180,
      "Degustazione birre": 180,
      "Cena tematica": 180,
      "Food market": 360,
      "Show cooking": 150
    },
    "Sport": {
      _default: 180,
      "Torneo": 360,
      "Gara": 240,
      "Corsa": 180,
      "Raduno": 240,
      "Lezione aperta": 90,
      "Esibizione": 120,
      "Partita amichevole": 120,
      "E-sport LAN": 360
    },
    "Arte & Cultura": {
      _default: 240,
      "Mostra": 360,
      "Vernissage": 180,
      "Teatro": 150,
      "Opera": 210,
      "Danza": 150,
      "Performance": 120,
      "Presentazione libro": 120,
      "Incontro con autore": 120,
      "Proiezione": 150
    },
    "Formazione & Workshop": {
      _default: 240,
      "Corso": 360,
      "Seminario": 180,
      "Workshop": 240,
      "Masterclass": 180,
      "Laboratorio per bambini": 120,
      "Mentoring": 90,
      "Meetup tematico": 150
    },
    "Notte & Club": {
      _default: 360,
      "Party": 360,
      "Serata a tema": 360,
      "Opening party": 300,
      "Closing party": 360,
      "Special guest": 360,
      "Silent disco": 360
    },
    "Mercati & Fiere": {
      _default: 480,
      "Mercatino": 360,
      "Fiera": 480,
      "Expo": 480,
      "Vintage market": 360,
      "Artigianato": 360,
      "Antiquariato": 360,
      "Auto/Moto d’epoca": 360
    },
    "Volontariato & Comunità": {
      _default: 240,
      "Raccolta fondi": 180,
      "Pulizia parco": 180,
      "Pulizia spiaggia": 180,
      "Donazioni": 180,
      "Raccolta alimentare": 240,
      "Evento solidale": 240
    },
    "Tecnologia & Startup": {
      _default: 240,
      "Conferenza": 360,
      "Hackathon": 720,
      "Demo day": 240,
      "Pitch night": 180,
      "Community meetup": 150,
      "Retrospettiva tech": 150
    },
    "Benessere & Outdoor": {
      _default: 180,
      "Yoga": 90,
      "Meditazione": 90,
      "Trekking": 240,
      "Escursione": 240,
      "Bike tour": 240,
      "Fitness all’aperto": 90,
      "Ritiro": 720
    },
    "Famiglia & Bambini": {
      _default: 150,
      "Festa bambini": 180,
      "Spettacolo famiglie": 120,
      "Laboratorio creativo": 120,
      "Letture animate": 90
    },
    "Motori": {
      _default: 240,
      "Raduno auto": 240,
      "Raduno moto": 240,
      "Track day": 480,
      "Esposizione": 240,
      "Drift": 240
    },
    "Tradizioni & Folklore": {
      _default: 480,
      "Corteo storico": 240,
      "Palio": 360,
      "Rievocazione": 360,
      "Festa patronale": 600
    },
    "Business & Networking": {
      _default: 150,
      "Networking night": 150,
      "Colazione d’affari": 90,
      "Tavola rotonda": 120,
      "Presentazione aziendale": 120
    },
    "Moda & Beauty": {
      _default: 150,
      "Sfilata": 120,
      "Shooting aperto": 120,
      "Fiera moda": 360,
      "Lancio prodotto": 120
    },
    "Eventi Privati": {
      _default: 240,
      "Compleanno": 240,
      "Laurea": 240,
      "Anniversario": 240,
      "Addio al celibato": 360,
      "Addio al nubilato": 360,
      "House party": 360,
      "Matrimonio": 720,
      "Battesimo": 180,
      "Comunione": 240,
      "Cresima": 240,
      "Team building": 360,
      "Kick-off": 180,
      "Riunione interna": 120,
      "Cena aziendale": 240,
      "Family day": 360,
      "Party in villa": 360,
      "Evento con lista": 360,
      "Club privato": 360,
      "Evento segreto": 360
    },
    "Altro": {
      _default: DEFAULT_EVENT_MINUTES,
      "Generico": 360,
      "Sperimentale": 240,
      "Pop-up": 180,
      "Flash mob": 60
    }
  };

  function getEstimatedMinutesFromTaxonomy(category, subcategory) {
    const cat = (category || "").trim();
    const sub = (subcategory || "").trim();
    const map = DURATION_MINUTES[cat];
    if (!map) return DEFAULT_EVENT_MINUTES;
    if (sub && typeof map[sub] === "number") return map[sub];
    if (typeof map._default === "number") return map._default;
    return DEFAULT_EVENT_MINUTES;
  }

  function isoToLocalDateAndTimeInputs(iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return { date: "", time: "" };
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
    } catch {
      return { date: "", time: "" };
    }
  }
  // ---------------------------------------------------------------------------
// Autofill Data/Ora fine in base a Categoria + Sottocategoria (tabella durate)
// Regole:
// - si attiva quando cambia start (dateStart/timeStart)
// - NON ricalcola se cambia categoria/sottocategoria (scelta Nico)
// - se l'utente tocca end (dateEnd/timeEnd), non sovrascriviamo più
// ---------------------------------------------------------------------------
function hookAutoEndDateTime(form) {
  if (!form) return;

  const inDateStart = form.querySelector('input[name="dateStart"]');
  const inTimeStart = form.querySelector('input[name="timeStart"]');
  const inDateEnd = form.querySelector('input[name="dateEnd"]');
  const inTimeEnd = form.querySelector('input[name="timeEnd"]');

  const selCategory = form.querySelector('select[name="category"]');
  const selSub = form.querySelector('select[name="subcategory"]');

  if (!inDateStart || !inDateEnd) return;

  let endTouched = false;

  function markTouched() { endTouched = true; }

  inDateEnd.addEventListener("input", markTouched);
  inDateEnd.addEventListener("change", markTouched);
  inTimeEnd?.addEventListener("input", markTouched);
  inTimeEnd?.addEventListener("change", markTouched);

  function applyAutoEndIfPossible() {
    // se utente ha già impostato manualmente la fine → non toccare
    if (endTouched) return;

    const ds = (inDateStart.value || "").trim();
    if (!ds) return;

    const ts = inTimeStart ? (inTimeStart.value || "").trim() : "";
    const startIso = combineDateAndTime(ds, ts);
    if (!startIso) return;

    const cat = selCategory ? (selCategory.value || "").trim() : "";
    const sub = selSub ? (selSub.value || "").trim() : "";

    const minutes = getEstimatedMinutesFromTaxonomy(cat, sub);

    const start = new Date(startIso);
    if (isNaN(start.getTime())) return;

    const end = new Date(start.getTime() + minutes * 60 * 1000);
    const out = isoToLocalDateAndTimeInputs(end.toISOString());

    if (out.date) inDateEnd.value = out.date;
    if (inTimeEnd && out.time) inTimeEnd.value = out.time;
  }

  // Trigger: solo su start
  inDateStart.addEventListener("change", applyAutoEndIfPossible);
  inTimeStart?.addEventListener("change", applyAutoEndIfPossible);
  inDateStart.addEventListener("input", applyAutoEndIfPossible);
  inTimeStart?.addEventListener("input", applyAutoEndIfPossible);

  // Primo tentativo (se start già compilata quando apri pannello)
  applyAutoEndIfPossible();
}

  function populateCreateFormOptions() {
    if (!form) return;
    const selCategory = form.querySelector('select[name="category"]');
    const selSub = form.querySelector('select[name="subcategory"]');
    const selRegion = form.querySelector('select[name="region"]');
    const selLanguage = form.querySelector('select[name="language"]');
    const selTarget = form.querySelector('select[name="target"]');
    const selCurrency = form.querySelector('select[name="currency"]');

    // Categoria
    if (selCategory) {
      selCategory.innerHTML = `<option value="" disabled selected>Seleziona</option>` +
        Object.keys(TAXONOMY.categories).map(c => `<option value="${c}">${c}</option>`).join("");
    }
    // Sottocategoria (dipendente)
    function refreshSub() {
      const cat = selCategory?.value || "";
      const list = TAXONOMY.categories[cat] || [];
      selSub.innerHTML = `<option value="">—</option>` + list.map(s => `<option value="${s}">${s}</option>`).join("");
    }
    selCategory?.addEventListener("change", refreshSub);
    if (selSub) refreshSub();

    // Regioni (Italia)
    if (selRegion) {
      selRegion.innerHTML = `<option value="" disabled selected>Seleziona</option>` +
        TAXONOMY.regionsIT.map(r => `<option value="${r}">${r}</option>`).join("");
    }

    // Lingue
    if (selLanguage) {
      // già in HTML con default; sincronizza lista
      selLanguage.innerHTML = TAXONOMY.languages.map(l => {
        const label = ({it:"Italiano", en:"Inglese", fr:"Francese", de:"Tedesco", es:"Spagnolo", other:"Altro"})[l] || l;
        return `<option value="${l}">${label}</option>`;
      }).join("");
      selLanguage.value = "it";
    }

    // Target
    if (selTarget) {
      selTarget.innerHTML = TAXONOMY.targets.map(t => {
        const label = ({tutti:"Tutti", famiglie:"Famiglie", "18+":"18+", professionisti:"Professionisti"})[t] || t;
        return `<option value="${t}">${label}</option>`;
      }).join("");
      selTarget.value = "tutti";
    }

    // Currency
    if (selCurrency) {
      selCurrency.innerHTML = TAXONOMY.currencies.map(c => `<option value="${c}">${c}</option>`).join("");
      selCurrency.value = "EUR";
    }
  }

  function getFormDataCreateEvent() {
    if (!form) return null;
    const fd = new FormData(form);
    const get = (k) => (fd.get(k) ?? "").toString().trim();

    const isFree = fd.get("isFree") === "on";
    const priceStr = get("price");
    const hasPrice = priceStr !== "";
    const price = hasPrice ? Number(priceStr.replace(",", ".")) : 0;
    const currency = get("currency").toUpperCase();

    // split helper
    const splitPipe = (s) => s ? s.split("|").map(x => x.trim()).filter(Boolean) : [];

    // PATCH orari → unisci data (YYYY-MM-DD) + ora (HH:mm) in ISO
    const dateStartStr = combineDateAndTime(get("dateStart"), get("timeStart"));
    const rawDateEnd = get("dateEnd");
    const dateEndStr = rawDateEnd ? combineDateAndTime(rawDateEnd, get("timeEnd")) : "";
    const payload = {
// Base
      title: get("title"),
      description: get("description"),

      // Tassonomia
      category: get("category"),
      subcategory: get("subcategory"),

      // Visibilità / lingua / target
      visibility: get("visibility") || "public",
      language: get("language") || "it",
      target: get("target") || "tutti",

      // Evento privato (solo se visibility === "private")
      isPrivate: (get("visibility") === "private"),
      accessCode: (get("accessCode") || "").trim() || undefined,

      // Localizzazione separata
      venueName: get("venueName"),
      street: get("street"),
      streetNumber: get("streetNumber"),
      postalCode: get("postalCode"),
      city: get("city"),
      province: get("province"),
      region: get("region"),
      country: get("country") || "IT",
      lat: get("lat"),
      lon: get("lon"),

      // Date (+ ora) in ISO
      dateStart: dateStartStr,
      ...(dateEndStr ? { dateEnd: dateEndStr } : {}),

      // Prezzo/valuta
      isFree,
      // price + currency solo se non gratuito
      ...(isFree ? {} : { price: isNaN(price) ? 0 : Math.max(0, price), currency: currency || "EUR" }),

      // Media & tag
      tags: splitPipe(get("tags")),
      images: splitPipe(get("images")),
      coverImage: get("coverImage"),
    };

    // lat/lon numerici (se valorizzati)
    if (payload.lat === "") delete payload.lat;
    else payload.lat = Number(String(payload.lat).replace(",", "."));
    if (payload.lon === "") delete payload.lon;
    else payload.lon = Number(String(payload.lon).replace(",", "."));

    // Se gratuito, non inviare price/currency
    if (payload.isFree) {
      delete payload.price;
      delete payload.currency;
    }

    return payload;
  }

  function validateCreateEventPayload(p) {
    const errors = [];
    if (!p.title) errors.push("Titolo obbligatorio");
    if (!p.category) errors.push("Categoria obbligatoria");
    if (!p.visibility) errors.push("Visibilità obbligatoria");
    if (!p.region) errors.push("Regione obbligatoria");
    if (!p.country) errors.push("Paese obbligatorio");
    if (!p.dateStart) errors.push("Data inizio obbligatoria");
    if (p.dateEnd && p.dateStart && new Date(p.dateEnd) < new Date(p.dateStart)) {
      errors.push("Data fine precedente alla data inizio");
    }
      if (p.visibility === "private") {
    if (!p.accessCode || String(p.accessCode).trim().length < 4) {
      errors.push("Per un evento privato è necessario un codice di accesso (min 4 caratteri)");
    }
  }
    if (!p.isFree && typeof p.price === "number" && p.price < 0) {
      errors.push("Prezzo non valido");
    }
    if (!p.isFree && p.price !== undefined && !p.currency) {
      errors.push("Valuta mancante");
    }
    if (p.lat !== undefined && Number.isNaN(p.lat)) errors.push("Latitudine non valida");
    if (p.lon !== undefined && Number.isNaN(p.lon)) errors.push("Longitudine non valida");
    return errors;
  }

  // PATCH FIX: base URL API (se manca)
  function resolveApiBaseLite() {
    try {
      const override = localStorage.getItem("apiBase");
      if (override && /^https?:\/\//i.test(override)) return override.replace(/\/+$/, "");
      const meta = document.querySelector('meta[name="api-base"]');
      if (meta && meta.content) return meta.content.replace(/\/+$/, "");
    } catch {}
    return "https://gogoworld-api.onrender.com/api"; // fallback
  }

  async function loadEvents(filters = {}) {
    listContainer.innerHTML = "<p>Caricamento...</p>";
    try {
      const query = new URLSearchParams(filters).toString();
      let res = await apiGet(`/events/mine/list${query ? "?" + query : ""}`, token);

    // PATCH: se 403, blocca l’accesso area organizzatore (no auto-enable)
      if (res?.ok === false && res?.status === 403) {
        throw new Error("Accesso area organizzatore non consentito.");
      }

      if (!res.ok) throw new Error(res.error || "Errore caricamento eventi");

      if (!res.events.length) {
    listContainer.innerHTML = '<p>Nessun evento creato.</p><div class="org-empty-actions"><button id="btnEmptyCreate" class="btn btn-primary">Crea il tuo primo evento</button></div>';
    const btnEmpty = document.getElementById("btnEmptyCreate");
if (btnEmpty) btnEmpty.onclick = () => { try { document.getElementById("btnCreateEvent")?.click(); } catch {} };

      } else {
        listContainer.innerHTML = res.events.map(ev => `
          <div class="event-card">
            <h3>${ev.title}</h3>
            ${renderStatus(ev.status)}
            <div class="muted">
              <span class="badge ${ev.approvalStatus || 'pending'}">${ev.approvalStatus || '-'}</span>
            </div>
            <p>${ev.city || ""} ${formatEventDate(ev)}</p>
           <div class="actions">
<button class="btn" data-action="edit" data-id="${ev._id}"
                ${
                  (String(ev.approvalStatus||'').toLowerCase()==='blocked')
                    ? 'disabled title="Evento bloccato — contatta l’amministratore"'
                    : (String(ev.approvalStatus||'').toLowerCase()==='approved')
                      ? 'title="Modificando, l’evento tornerà in revisione (pending)"'
                      : (String(ev.approvalStatus||'').toLowerCase()==='rejected')
                        ? ('title="' + (ev.moderation && ev.moderation.reason
                            ? ('Rifiutato: ' + ev.moderation.reason + ' — Correggi e ripresenta')
                            : 'Rifiutato — Correggi e ripresenta') + '"')
                        : ''
                }
              >${
                (String(ev.approvalStatus||'').toLowerCase()==='rejected')
                  ? 'Correggi e ripresenta'
                  : (String(ev.approvalStatus||'').toLowerCase()==='approved')
                    ? 'Modifica (torna in revisione)'
                    : (String(ev.approvalStatus||'').toLowerCase()==='blocked')
                      ? 'Bloccato'
                      : 'Modifica'
              }</button>
  <button class="btn btn-secondary" data-action="promote" data-id="${ev._id}">Promuovi</button>
  <button class="btn btn-secondary" data-action="details" data-id="${ev._id}">Dettagli</button>
  <button class="btn btn-danger" data-action="delete" data-id="${ev._id}">Elimina</button>
</div>
          </div>
        `).join("");
      }

      // --- SINCRONIZZAZIONE DASHBOARD ---
      // Cache locale per KPI/Tabella
      window.__myEventsCache = Array.isArray(res.events) ? res.events : [];
      // Re-render KPI e Tabella con i dati correnti
      try { renderKpiFromMyEvents(); } catch {}
      try { renderParticipantsTableFromMyEvents(); } catch {}

    } catch (err) {
      listContainer.innerHTML = `<p class="error">Errore: ${err.message}</p>`;
      showAlert(err?.message || "Errore caricamento eventi", "error", { autoHideMs: 4000 });
    }
  }

  // PATCH: crea (una tantum) il pannello risultati import, sopra la lista
  function ensureImportResultsPanel() {
    let panel = document.getElementById("importResults");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "importResults";
    panel.className = "table-wrap";
    const mainList = document.getElementById("myEventsList");
    if (mainList && mainList.parentNode) {
      mainList.parentNode.insertBefore(panel, mainList);
    } else {
      (document.querySelector("main") || document.body).appendChild(panel);
    }
    return panel;
  }

  // PATCH: upload CSV → /events/import (dryRun true/false)
  async function importCsvFile(file, { dryRun = true } = {}) {
    const base = resolveApiBaseLite();
    // ATTENZIONE: se la route lato BE è diversa, cambia qui:
    const url = `${base}/events/import-csv?dryRun=${dryRun ? "true" : "false"}`;

    const form = new FormData();
    // difesa: assicurati di avere UN SOLO campo "file"
    if (typeof form.delete === "function") form.delete("file");
    form.set("file", file);

    // log diagnostico non invasivo
    console.log("[CSV] file selezionato:", { name: file?.name, size: file?.size });

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // niente content-type: lo setta il browser
        body: form
      });
    } catch (e) {
      showAlert(e?.message || "Errore di rete durante l'upload", "error", { autoHideMs: 4000 });
      return;
    }

    let data = null;
    try {
      data = await res.json();
    } catch {
      showAlert(`Risposta non valida (HTTP ${res.status})`, "error", { autoHideMs: 4000 });
      return;
    }

    if (!res.ok || data?.ok === false) {
      console.error("Import CSV error:", { status: res.status, data });
      const msg = data?.error || data?.message || `HTTP ${res.status}`;
      showAlert(msg, "error", { autoHideMs: 6000 });
      return;
    }

    const panel = ensureImportResultsPanel();
    if (dryRun) {
      const rows = Array.isArray(data.rows) ? data.rows : [];
      const stats = data.stats || {
        total: rows.length,
        valid: rows.filter(r => r.status === "ok").length,
        invalid: rows.filter(r => r.status === "error").length
      };
      panel.innerHTML = `
        <div class="simple-table">
         <div class="org-import-header"><strong>Anteprima import CSV</strong> — Totali: ${stats.total} • Validi: ${stats.valid} • Invalidi: ${stats.invalid}</div>
          <table class="simple-table">
            <thead><tr><th>#</th><th>Stato</th><th>Dettagli</th></tr></thead>
            <tbody>
              ${rows.slice(0, 200).map(r => `
                <tr>
                  <td>${r.line ?? ""}</td>
                  <td>${r.status}</td>
                  <td>${r.errors ? r.errors.join("; ") : (r.preview ? (r.preview.title || "") : (r.id || ""))}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          <div class="form-actions org-form-actions--mt10">
            <button id="btnConfirmImport" class="btn btn-primary">Conferma import</button>
          </div>
        </div>
      `;
      const btnConfirm = document.getElementById("btnConfirmImport");
      if (btnConfirm) {
        btnConfirm.onclick = async () => {
          btnConfirm.disabled = true;
          await importCsvFile(file, { dryRun: false });
          btnConfirm.disabled = false;
        };
      }
      showAlert("Anteprima pronta. Controlla gli errori, poi premi 'Conferma import'.", "info", { autoHideMs: 4000 });
    } else {
      const created = data.created ?? 0;
      const skipped = data.skipped ?? 0;
      panel.innerHTML = `
        <div class="simple-table">
          <div class="org-import-header"><strong>Import completato</strong> — Creati: ${created} • Skippati: ${skipped}</div>
        </div>
      `;
      showAlert(`Import completato. Creati: ${created}, Skippati: ${skipped}`, "success", { autoHideMs: 4000 });
      try { await loadEvents(); } catch {}
    }
  }
// ---- Le mie promozioni (organizer) ----
function renderMyPromosTable(arr) {
  const tbody = myPromosTable?.querySelector("tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const data = Array.isArray(arr) ? arr : [];
if (data.length === 0) {
  tbody.innerHTML = '';
  const cap = document.getElementById("myPromosCaption");
  if (cap) cap.style.display = "table-caption";
  return;
}
const cap = document.getElementById("myPromosCaption");
if (cap) cap.style.display = "none";

  tbody.innerHTML = data.map(b => {
    const imp = b.impressionsTotal || 0;
    const clk = b.clicksTotal || 0;
const ctrVal = imp ? (clk / imp) * 100 : 0;
let ctrClass = "ctr-low";
if (ctrVal >= 3) ctrClass = "ctr-high";
else if (ctrVal >= 1) ctrClass = "ctr-mid";
const ctr = ctrVal.toFixed(2) + "%";
const start = b.activeFrom ? new Date(b.activeFrom).toLocaleString() : '—';
const end = b.activeTo ? new Date(b.activeTo).toLocaleString() : '—';

// Preferisci il flag del backend, se presente; altrimenti calcola "fine giornata" locale
let isExpired;
if (typeof b.isExpired !== "undefined") {
  isExpired = !!b.isExpired;
} else {
  if (b.activeTo) {
    const endTs = new Date(b.activeTo);
    // Se la stringa non contiene orario (solo data), considera 23:59:59 locale
    if (typeof b.activeTo === "string" && !/\d{1,2}:\d{2}/.test(b.activeTo)) {
      endTs.setHours(23, 59, 59, 999);
    }
    isExpired = endTs < new Date();
  } else {
    isExpired = false;
  }
}

return `
<tr class="${isExpired ? 'expired' : ''}">
<td>${b.title || '(senza titolo)'}</td>
<td>${b.placement || '-'}</td>
<td>${start}</td>
<td>${end}</td>
<td>${imp}</td>
<td>${clk}</td>
<td class="${ctrClass}">${ctr}</td>
<td>${b.status || '-'}</td>
</tr>
`;
  }).join("");
}
function applyMyPromosFilters() {
  const all = (window.__myPromosCache || []);
  const s = (myPromosFilterStatus && myPromosFilterStatus.value || '').trim().toLowerCase();
  const p = (myPromosFilterPlacement && myPromosFilterPlacement.value || '').trim().toLowerCase();

  const filtered = all.filter(b => {
if (s) {
  const stat = (b.status || '').toLowerCase();

  // se l’utente chiede "expired" usiamo la regola sulla data,
  // altrimenti confrontiamo direttamente lo status del banner
  if (s === 'expired') {
    const isExpired = !!(b.activeTo && new Date(b.activeTo) < new Date());
    if (!isExpired) return false;
  } else {
    if (stat !== s) return false;
  }
}

    if (p && !(String(b.placement || '').toLowerCase().includes(p))) return false;
    return true;
  });

  renderMyPromosTable(filtered);
}

async function loadMyBanners() {
  const tokenLocal =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("jwt") ||
    localStorage.getItem("jwt") ||
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("accessToken");
const _params = [];
if (myPromosFilterStatus && myPromosFilterStatus.value) {
_params.push("status=" + encodeURIComponent(String(myPromosFilterStatus.value).toUpperCase()));
}
if (myPromosFilterPlacement && myPromosFilterPlacement.value) {
_params.push("placement=" + encodeURIComponent(myPromosFilterPlacement.value));
}
const _qs = _params.length ? ("?" + _params.join("&")) : "";

const res = await apiGet(`/banners/mine${_qs}`, tokenLocal);

if (!res || res.ok === false) {
  const msg = (res && (res.message || res.error)) || "Errore nel caricamento dei banner";
  showAlert(msg, "error", { autoHideMs: 3000 });
  if (myPromosTable) myPromosTable.querySelector("tbody").innerHTML =
    '<tr><td colspan="8" class="error">Errore di caricamento</td></tr>';
  return;
}

// Tolleranza formati: {data:[...] } | {banners:[...] } | {items:[...] } | [...]
let list = [];
if (Array.isArray(res?.data)) list = res.data;
else if (Array.isArray(res?.banners)) list = res.banners;
else if (Array.isArray(res?.items)) list = res.items;
else if (Array.isArray(res)) list = res;

window.__myPromosCache = list;
applyMyPromosFilters();
}
 // Event delegation
  if (listContainer) {
    listContainer.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      if (action === "edit") {
        // Guard: non permettere edit se lo stato è 'blocked'
        try {
          const evCached = (window.__myEventsCache || []).find(ev => ev && ev._id === id);
          if (evCached && String(evCached.approvalStatus || '').toLowerCase() === 'blocked') {
            showAlert("Evento bloccato dall’amministratore: modifica non consentita.", "error", { autoHideMs: 3500 });
            return;
          }
        } catch {}

        try { sessionStorage.setItem("selectedEventId", id); } catch {}
       const href = `evento.html?id=${encodeURIComponent(id)}#edit`;
        window.location.href = href;
        return;
      }
if (action === "promote") {
        // prendi dati dal cache lista per prefilling
        let ev = null;
        try {
          const arr = Array.isArray(window.__myEventsCache) ? window.__myEventsCache : [];
          ev = arr.find(x => String(x._id) === String(id)) || null;
        } catch {}
        if (!ev) { showAlert("Evento non trovato in cache", "error", { autoHideMs: 3000 }); return; }
        openPromotePanel(ev);
        return;
      }

      if (action === "details") {
        sessionStorage.setItem("selectedEventId", id);
       window.location.href = `evento.html?id=${encodeURIComponent(id)}`;
        return;
      }

      if (action === "delete") {
       if (!confirm("Eliminare questo evento?")) { showAlert("Eliminazione annullata", "info", { autoHideMs: 2500 }); return; }
        const res = await apiDelete(`/events/${id}`, token);
        if (!res.ok) {
          showAlert(res.error || "Errore eliminazione", "error", { autoHideMs: 4000 });
          return;
        }
        showAlert("Evento eliminato", "success", { autoHideMs: 2500 });
        await loadEvents(); // KPI/Tabella si aggiornano dentro loadEvents
      }
    });
  }

  // Filtri
  if (btnFilters) {
    btnFilters.addEventListener("click", async () => {
      const filters = {};
      const title = document.getElementById("filterTitle")?.value?.trim();
      const city = document.getElementById("filterCity")?.value?.trim();
      const category = document.getElementById("filterCategory")?.value?.trim(); // categoria effettiva
      const region = document.getElementById("filterRegion")?.value?.trim();
      const dateStart = document.getElementById("filterDateStart")?.value?.trim();
      const dateEnd = document.getElementById("filterDateEnd")?.value?.trim();
      if (title) filters.title = title;
      if (city) filters.city = city;
      if (category) filters.category = category; // passa in query come singolo valore
      if (region) filters.region = region;
      if (dateStart) filters.dateStart = dateStart;
      if (dateEnd) filters.dateEnd = dateEnd;
      await loadEvents(filters); // KPI/Tabella si aggiornano dentro loadEvents
    });
  }

  // Switch ruolo (codice in inglese)
  if (btnSwitchRole) {
    btnSwitchRole.addEventListener("click", () => {
      sessionStorage.setItem("desiredRole", "participant");
      window.location.href = "partecipante.html";
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

// Create (PATCH: attiva pannello + submit)
  if (btnCreate) {
    btnCreate.addEventListener("click", () => {
      if (!panel) return;
      if (panel.style.display === "none" || !panel.style.display) {
        populateCreateFormOptions();
        panel.style.display = "block";
        const first = form?.querySelector('input[name="title"]');
        first && first.focus();
        hookFreePrice(form);
        hookPrivateVisibility(form); // <-- nuova patch
        hookAutoEndDateTime(form);
      } else {
        panel.style.display = "none";
      }
    });
  }

  // PATCH: pannello import CSV con bottoni "Valida" / "Importa"
  if (btnImportCsv) {
    btnImportCsv.addEventListener("click", () => {
      let panel = document.getElementById("importCsvPanel");
      if (!panel) {
        panel = document.createElement("section");
        panel.id = "importCsvPanel";
        panel.className = "table-wrap";
        const myList = document.getElementById("myEventsList");
        if (myList && myList.parentNode) {
          myList.parentNode.insertBefore(panel, myList); // sopra la lista
        } else {
          (document.querySelector("main") || document.body).appendChild(panel);
        }
        panel.innerHTML = `
          <div class="form">
            <div class="form-row">
              <label><strong>Importa eventi da CSV</strong></label>
              <input id="csvFileInput" type="file" accept=".csv,text/csv" />
            </div>
            <div class="form-actions">
              <button id="btnValidateCsv" class="btn">Valida</button>
              <button id="btnDoImportCsv" class="btn btn-primary" disabled>Importa</button>
            </div>
          </div>
          <div id="importResults" class="table-wrap"></div>
        `;

        const input = panel.querySelector("#csvFileInput");
        const btnValidate = panel.querySelector("#btnValidateCsv");
        const btnDoImport = panel.querySelector("#btnDoImportCsv");

        let lastFile = null;

        input.addEventListener("change", () => {
          lastFile = input.files && input.files[0] ? input.files[0] : null;
          btnDoImport.disabled = !lastFile;
        });

        btnValidate.addEventListener("click", async () => {
          if (!lastFile) {
            showAlert("Seleziona un file CSV prima di validare.", "error", { autoHideMs: 3000 });
            return;
          }
          await importCsvFile(lastFile, { dryRun: true });
        });

        btnDoImport.addEventListener("click", async () => {
          if (!lastFile) {
            showAlert("Seleziona un file CSV prima di importare.", "error", { autoHideMs: 3000 });
            return;
          }
          btnDoImport.disabled = true;
          try {
            await importCsvFile(lastFile, { dryRun: false });
            input.value = "";
            lastFile = null;
            btnDoImport.disabled = true;
          } finally {}
        });
      }

      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // PATCH: annulla creazione
  if (btnCancelCreate && panel) {
    btnCancelCreate.addEventListener("click", () => {
      form?.reset();
      panel.style.display = "none";
    });
  }

  // PATCH: submit creazione evento
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = getFormDataCreateEvent();
      const errors = validateCreateEventPayload(payload);
      // PATCH validazioni su data/ora (date + time) — usa il payload già composto
      if (!payload.dateStart) {
        errors.push("Data inizio mancante");
      } else {
        const _start = new Date(payload.dateStart);
        const _end = payload.dateEnd ? new Date(payload.dateEnd) : null;
        if (_end && !isNaN(_start.getTime()) && !isNaN(_end.getTime()) && _end < _start) {
          errors.push("La fine è precedente all'inizio");
        }
      }
      if (errors.length) {
        showAlert(errors.join(" • "), "error", { autoHideMs: 5000 });
        return;
      }
      try {
        const res = await apiPost("/events", payload, token);
        if (!res?.ok) {
          showAlert(res?.error || res?.message || "Creazione fallita", "error", { autoHideMs: 5000 });
          return;
        }
        showAlert("Evento creato con successo", "success", { autoHideMs: 2500 });
        form.reset();
        panel.style.display = "none";
        await loadEvents(); // KPI/Tabella si aggiornano dentro loadEvents
        document.getElementById("myEventsList")?.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) {
        showAlert(err?.message || "Errore di rete in creazione", "error", { autoHideMs: 5000 });
      }
    });
  }

  // --- Dashboard KPI (organizzatore) ---
  async function renderKpiFromMyEvents() {
    // Usa un container esistente o creane uno prima della lista
    let container = document.getElementById("dashboardKPI");
    if (!container) {
      const myEventsList = document.getElementById("myEventsList");
      const section = document.createElement("section");
      section.id = "dashboardKPI";
      section.className = "kpi-grid";
      if (myEventsList && myEventsList.parentNode) {
        myEventsList.parentNode.insertBefore(section, myEventsList);
      } else {
        const main = document.querySelector("main") || document.body;
        main.insertBefore(section, main.firstChild);
      }
      container = section;
    }

    // Placeholder per evitare layout shift
    container.innerHTML = `
      <div class="kpi-card"><div class="kpi-label">Totale Eventi</div><div class="kpi-value">—</div></div>
      <div class="kpi-card"><div class="kpi-label">Partecipanti Totali</div><div class="kpi-value">—</div></div>
      <div class="kpi-card"><div class="kpi-label">Media Partecipanti</div><div class="kpi-value">—</div></div>
      <div class="kpi-card"><div class="kpi-label">Top Evento</div><div class="kpi-value">—</div></div>
    `;

    try {
      // Usa cache se presente per evitare una seconda fetch
      let events = Array.isArray(window.__myEventsCache) ? window.__myEventsCache : null;

      if (!events) {
        const res = await apiGet("/events/mine/list", token);
        if (!res?.ok || !Array.isArray(res.events)) return;
        events = res.events;
        window.__myEventsCache = events; // popola cache
      }

      const totalEvents = events.length;

      let totalParticipants = 0;
      let top = null;
      for (const ev of events) {
        const count = Array.isArray(ev?.participants) ? ev.participants.length : 0;
        totalParticipants += count;
        if (!top || count > (Array.isArray(top.participants) ? top.participants.length : 0)) {
          top = ev;
        }
      }

      const avgParticipants = totalEvents > 0 ? Math.round((totalParticipants / totalEvents) * 10) / 10 : 0;
      const topLabel = top ? (top.title || top.name || top._id || "—") : "—";
      const topCount = top ? (Array.isArray(top.participants) ? top.participants.length : 0) : "—";

      container.innerHTML = `
        <div class="kpi-card">
          <div class="kpi-label">Totale Eventi</div>
          <div class="kpi-value">${totalEvents}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Partecipanti Totali</div>
          <div class="kpi-value">${totalParticipants}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Media Partecipanti</div>
          <div class="kpi-value">${avgParticipants}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Top Evento</div>
          <div class="kpi-value">${topLabel} <span class="kpi-sub">(${topCount})</span></div>
        </div>
      `;
    } catch {
      // silente: i KPI non devono bloccare la pagina
    }
  }

  // --- Tabellina "Partecipanti per evento" (non invasiva) ---
  async function renderParticipantsTableFromMyEvents() {
    // Crea o recupera il container subito sotto i KPI e sopra la lista
    let container = document.getElementById("participantsByEvent");
    if (!container) {
      const kpi = document.getElementById("dashboardKPI");
      const myEventsList = document.getElementById("myEventsList");
      const section = document.createElement("section");
      section.id = "participantsByEvent";
      // Posiziona la tabella: dopo i KPI, prima della lista
      if (kpi && kpi.parentNode) {
        kpi.parentNode.insertBefore(section, myEventsList || kpi.nextSibling);
      } else if (myEventsList && myEventsList.parentNode) {
        myEventsList.parentNode.insertBefore(section, myEventsList);
      } else {
        const main = document.querySelector("main") || document.body;
        main.appendChild(section);
      }
      container = section;
    }

    // Stato iniziale
    container.innerHTML = `<div class="table-wrap"><table class="simple-table">
      <thead><tr><th>Evento</th><th>Partecipanti</th></tr></thead>
      <tbody><tr><td colspan="2">Caricamento…</td></tr></tbody>
    </table></div>`;

    try {
      // Usa la cache se presente, altrimenti recupera
      let events = Array.isArray(window.__myEventsCache) ? window.__myEventsCache : null;
      if (!events) {
        const res = await apiGet("/events/mine/list", token);
        if (!res?.ok || !Array.isArray(res.events)) {
          container.innerHTML = `<div class="table-wrap"><table class="simple-table">
            <thead><tr><th>Evento</th><th>Partecipanti</th></tr></thead>
            <tbody><tr><td colspan="2">Nessun dato disponibile</td></tr></tbody>
          </table></div>`;
          return;
        }
        events = res.events;
      }

      if (!events.length) {
        container.innerHTML = `<div class="table-wrap"><table class="simple-table">
          <thead><tr><th>Evento</th><th>Partecipanti</th></tr></thead>
          <tbody><tr><td colspan="2">Nessun evento creato</td></tr></tbody>
        </table></div>`;
        return;
      }

      // Costruzione righe ordinate per n. partecipanti (desc)
      const rows = events
        .map(ev => ({
          id: ev._id,
          label: ev.title || ev.name || ev._id || "—",
          count: Array.isArray(ev?.participants) ? ev.participants.length : 0
        }))
        .sort((a, b) => b.count - a.count)
        .map(r => `<tr><td>${r.label}</td><td>${r.count}</td></tr>`)
        .join("");

      container.innerHTML = `<div class="table-wrap"><table class="simple-table">
        <thead><tr><th>Evento</th><th>Partecipanti</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
    } catch {
      container.innerHTML = `<div class="table-wrap"><table class="simple-table">
        <thead><tr><th>Evento</th><th>Partecipanti</th></tr></thead>
        <tbody><tr><td colspan="2">Errore di caricamento</td></tr></tbody>
      </table></div>`;
    }
  }
  // Hook pannello "Le mie promozioni"
if (btnMyPromos) {
  btnMyPromos.addEventListener("click", () => {
    if (!myPromosPanel) return;
    myPromosPanel.style.display = "block";
    loadMyBanners();
    if (myPromosFilterStatus) myPromosFilterStatus.addEventListener("change", applyMyPromosFilters);
    if (myPromosFilterPlacement) myPromosFilterPlacement.addEventListener("input", applyMyPromosFilters);

  });
}
if (btnMyPromosRefresh) {
  btnMyPromosRefresh.addEventListener("click", () => {
    loadMyBanners();
  });
}
if (btnMyPromosClose) {
  btnMyPromosClose.addEventListener("click", () => {
    if (myPromosPanel) myPromosPanel.style.display = "none";
  });
}


  // Prima lista
  loadEvents();

  // KPI (aggiunta)
  renderKpiFromMyEvents();

  // Tabellina partecipanti per evento (aggiunta)
  renderParticipantsTableFromMyEvents();
});


















