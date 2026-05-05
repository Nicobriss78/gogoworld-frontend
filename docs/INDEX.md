# DOCS INDEX — GoGoWorld.life V2

Questo file è il punto di ingresso unico della documentazione operativa.

---

## 1. Documenti vincolanti

### ARCHITECTURE_RULES_V2.md
Regole inviolabili e architettura

### PRE_PATCH_CHECKLIST_V2.md
Checklist pre patch

### POST_PATCH_VALIDATION_V2.md
Validazione post patch

### CHAT_STARTER_MASTER_V2.md
Contesto operativo

---

## 2. Ordine di lettura

1. INDEX
2. ARCHITECTURE_RULES
3. PRE_PATCH
4. CHAT_STARTER
5. eventuali relazioni
6. specifiche

Post patch:
7. POST_PATCH

---

## ⚠️ STATO SISTEMA

- Area Partecipante V2 stabile
- MAPPA PUBBLICA V2 completata:
  - geolocalizzazione (Vicino a me)
  - tracking continuo (Seguimi)
  - rotazione dinamica basata su bearing
  - smoothing angolare (no rotazioni spurie)
  - UX navigatore (pallino / freccia)
  - centratura utente indipendente dagli eventi
  - caricamento eventi per raggio (default 20km)

  - ricerca eventi (q) integrata
  - ricerca precisa (title, location, category, ecc.)
  - separazione search / geo / filters
  - sistema filtri:
    - category (server)
    - isFree (server)
    - period → dateStart/dateEnd (server)
    - status (client)
  - pannello filtri UI integrato
  - contatore filtri attivi
  - reset filtri
  - UX mappa multi-modale:
    - explore (geo)
    - search (intent)
    - filters (affinamento)

  - gestione selezione evento:
    - chat NON auto-aperta da ricerca/filtri
    - apertura solo su tap marker
    - reset automatico su cambio modalità
    - chiusura manuale evento selezionato

  - header mappa ottimizzato:
    - layout a due righe
    - `[Seguimi] Eventi [Vicino a me]`
    - `[Ricerca] [Cerca] [Filtri]`
- MAPPA PRIVATI conforme a PRIVATE_MAP_NO_GEO_DISCOVERY
- Sblocco evento privato tramite pulsante diretto nella scheda MAPPA PRIVATI
- Cross-browser hardening completato per Area Partecipante V2
- Viewport V2 centralizzato tramite `--gw-app-viewport-h`
- Font V2 centralizzato tramite `--gw-font-family`
- Composer chat V2 uniformati
- Chat preview MAPPA / MAPPA PRIVATI limitata a massimo 5 messaggi
- Nome autore visibile nelle preview chat mappa
- Chat V2 ordinate cronologicamente: vecchi sopra, nuovi sotto
- Chat ROOMS e MESSAGES reattive con polling intelligente
- Delta backend attivo tramite `after`
- WebSocket/SSE NON introdotti

## 🔔 CENTRO NOTIFICHE V2 (NUOVO)

- Sistema notifiche in-app completamente implementato
- Backend basato su notificationModel + notificationController + notificationRoutes
- Frontend integrato nella topbar tramite pannello overlay
- Badge notifiche con conteggio dinamico e animazione pulse
- Lettura notifiche granulare (solo su click, NON globale)
- Notifiche attive:
  - dm_message
  - room_message
  - follow
  - follow_new_event (solo eventi pubblici)
- Eventi privati esclusi dalle notifiche follower
- Separazione architetturale:
  - createNotification → notifiche in-app
  - notify → sistema esterno (email/push futuro)

## 🔔 TRILLI — STATO ATTUALE (BACKEND + ORGANIZER V2)

- Sistema Trilli implementato completamente lato backend
- UI Organizer V2 base implementata e funzionante

### Stato

- T1 — Backend base ✅
- T2 — Integrazione notifiche ✅
- T3 — Moderazione admin ✅
- T3.5 — Test reale API ✅
- T4 — UI Organizer V2 base ✅

### Funzionalità attive

- Creazione draft Trillo (`POST /api/trills`)
- Lista Trilli Organizer (`GET /api/trills/mine`)
- Invio Trillo (`POST /api/trills/:id/send`)
- Stato aggiornato (`draft → sent`)
- Rendering lista Trilli lato Organizer V2

### Endpoint disponibili

- `POST /api/trills`
- `POST /api/trills/:id/send`
- `GET /api/trills/mine`
- `GET /api/trills/event/:eventId`
- `GET /api/trills/admin`
- `PATCH /api/trills/admin/:id/block`

### Architettura

- backend-first rispettato
- integrazione frontend limitata a Organizer V2
- nessuna dipendenza dal legacy
- sistema testato end-to-end (UI + API)

### Targeting (stato attuale)

- `interested_not_checked_in`
- `nearby` (fallback, NON geolocalizzato reale)
- `both`

⚠️ Nota:
Il targeting geolocalizzato reale NON è ancora implementato.

### Vincoli attuali

- Nessuna UI Trilli nel legacy
- UI Trilli attiva SOLO in Organizer V2
- Nessuna esposizione dati sensibili utenti

### Dipendenze future

- UI Partecipante (toast/banner live)
- geo-targeting reale utenti
- promo QR
- sistema crediti (free / pro / boost)
- analytics Trilli

### Stato

- T1 — Backend base ✅
- T2 — Integrazione notifiche ✅
- T3 — Moderazione admin ✅
- T3.5 — Test reale API ✅

### Endpoint disponibili

- `POST /api/trills` → crea draft
- `POST /api/trills/:id/send` → invia notifiche
- `GET /api/trills/mine` → lista trilli organizer
- `GET /api/trills/event/:eventId` → lista per evento
- `GET /api/trills/admin` → lista admin
- `PATCH /api/trills/admin/:id/block` → blocco trillo

### Funzionamento

- Creazione draft con validazioni complete:
  - evento esistente
  - organizer autorizzato
  - evento approvato
  - finestra temporale (2h prima → fine evento)

- Invio:
  - creazione Notification (type: "trill")
  - creazione TrillDelivery
  - aggiornamento metriche

- Moderazione:
  - blocco admin
  - trillo bloccato non inviabile

### Targeting (stato attuale)

- `interested_not_checked_in`
  → utenti partecipanti senza check-in

- `nearby`
  → fallback utenti participant (NON geolocalizzato reale)

- `both`
  → combinazione dei due

⚠️ Nota:
Il targeting geolocalizzato reale NON è ancora implementato.
Sarà introdotto in una fase successiva con posizione utenti persistente.

### Architettura

- backend-first (nessuna UI necessaria)
- completamente indipendente dal frontend
- isolato dal legacy
- testabile via API

### Vincoli attuali

- nessuna UI Trilli (né Partecipante né Organizzatore)
- nessuna integrazione frontend attiva
- nessun QR / promo attivo

### Dipendenze future

- rifondazione Area Organizzatore V2
- rifondazione Area Admin V2
- geo-targeting reale utenti

## 📌 PROSSIMO STEP

- Sistema Trilli backend COMPLETATO e verificato
- Rifondazione completa Area Organizzatore V2 (prossima fase)
- Rifondazione Area Admin V2
- Implementazione geo-targeting reale utenti (fase successiva)
- Eliminazione completa legacy frontend Partecipante
- PWA post Organizzatore/Admin
---

## 3. Regole aggiornamento

Aggiornare quando:
- nuovi docs
- cambi struttura
- nuove regole

---

## 4. Futuri docs

- KNOWN_BUGS
- ROADMAP
- DOMAIN_RULES
- CROSS_BROWSER_TEST_PLAN
- PWA_PLAN_POST_ORGANIZER_ADMIN

---

## 5. REGOLA FINALE

La cartella `/docs` è parte integrante del sistema.
