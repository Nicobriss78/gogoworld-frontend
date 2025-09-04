// js/organizzatore.js — area Organizzatore
//
// TODO UI/UX Overhaul:
// - Lista "I miei eventi" con card/table responsive e azioni visibili
// - Conferme modali standard per delete (invece di confirm())
// - Banner “welcome” con micro-CTA (es. “Crea nuovo evento”)

import { apiGet, apiDelete, apiPost } from "./api.js"; // PATCH: aggiunto apiPost

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

document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "../index.html";
  }

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

      // PATCH B: se l’utente è in area Organizzatore ma non è abilitato, abilitalo in modo trasparente
      try {
        if (me && me.canOrganize !== true) {
          await apiPost("/users/me/enable-organizer", {}, token);
        }
      } catch {
        // silente: se fallisce, verrà gestito da loadEvents col retry 403
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
  
  // PATCH: bottone Importa CSV
  const btnImportCsv = document.getElementById("btnImportCsv");
  
  // PATCH: riferimenti al pannello di creazione e form
  const panel = document.getElementById("createEventPanel");
  const form = document.getElementById("createEventForm");
  const btnCancelCreate = document.getElementById("btnCancelCreate");

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

      // PATCH B: se 403, abilita canOrganize e ritenta UNA volta
      if (res?.ok === false && res?.status === 403) {
        try {
          await apiPost("/users/me/enable-organizer", {}, token);
          res = await apiGet(`/events/mine/list${query ? "?" + query : ""}`, token);
        } catch (e) {
          // continuerà col branch di errore sotto
        }
      }

      if (!res.ok) throw new Error(res.error || "Errore caricamento eventi");

      if (!res.events.length) {
        listContainer.innerHTML = "<p>Nessun evento creato.</p>";
      } else {
        listContainer.innerHTML = res.events.map(ev => `
          <div class="event-card">
            <h3>${ev.title}</h3>
            ${renderStatus(ev.status)}
            <p>${ev.city || ""} ${formatEventDate(ev)}</p>
            <div class="event-actions">
              <button class="btn btn-primary" data-id="${ev._id}" data-action="details">Dettagli</button>
              <button class="btn btn-secondary" data-id="${ev._id}" data-action="delete">Elimina</button>
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
          <div style="padding:8px 0;"><strong>Anteprima import CSV</strong> — Totali: ${stats.total} • Validi: ${stats.valid} • Invalidi: ${stats.invalid}</div>
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
          <div class="form-actions" style="margin-top:10px">
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
          <div style="padding:8px 0;"><strong>Import completato</strong> — Creati: ${created} • Skippati: ${skipped}</div>
        </div>
      `;
      showAlert(`Import completato. Creati: ${created}, Skippati: ${skipped}`, "success", { autoHideMs: 4000 });
      try { await loadEvents(); } catch {}
    }
  }

  // Event delegation
  if (listContainer) {
    listContainer.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");

      if (action === "details") {
        sessionStorage.setItem("selectedEventId", id);
        window.location.href = "evento.html";
        return;
      }

      if (action === "delete") {
        if (!confirm("Eliminare questo evento?")) return;
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

  // Prima lista
  loadEvents();

  // KPI (aggiunta)
  renderKpiFromMyEvents();

  // Tabellina partecipanti per evento (aggiunta)
  renderParticipantsTableFromMyEvents();
});



