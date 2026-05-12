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

## 🔔 TRILLI — STATO ATTUALE

- Backend Trilli completato e verificato
- Notifiche integrate
- Moderazione admin attiva
- UI Organizer V2 implementata, consolidata e hardenizzata
- Nessuna UI Trilli nel legacy

### Stato

- T1 — Backend base ✅
- T2 — Integrazione notifiche ✅
- T3 — Moderazione admin ✅
- T3.5 — Test reale API ✅
- T4 — UI Organizer V2 base ✅
- T4.5 — Hardening Organizer V2 ✅

### Funzionalità attive

- Creazione draft Trillo (`POST /api/trills`)
- Lista Trilli Organizer (`GET /api/trills/mine`)
- Invio Trillo (`POST /api/trills/:id/send`)
- Stato aggiornato (`draft → sent`)
- Conferma interna invio
- Loading state
- Blocco doppio click
- Feedback successo/errore
- Nessun `alert()` / `confirm()`

### Endpoint disponibili

- `POST /api/trills`
- `POST /api/trills/:id/send`
- `GET /api/trills/mine`
- `GET /api/trills/event/:eventId`
- `GET /api/trills/admin`
- `PATCH /api/trills/admin/:id/block`

### Architettura

- backend-first rispettato
- frontend limitato a Organizer V2
- nessuna dipendenza dal legacy
- sistema testato end-to-end UI + API
- `organizer-trills-v2` = primo livello
- `organizer-trill-create-v2` = secondo livello

### Targeting attuale

- `interested_not_checked_in`
- `nearby` fallback non geolocalizzato reale
- `both`

⚠️ GEO-TARGETING REALE NON ANCORA IMPLEMENTATO

Stato reale Trilli:
🟡 V1 / V1.5 consolidata

Attualmente:

• radiusMeters viene salvato
• targetingMode supportato
• nearby disponibile solo come fallback logico
• nessun calcolo reale distanza utente-evento

Targeting attuale reale:

• interested_not_checked_in
• nearby (fallback non geolocalizzato reale)
• both

NON ancora implementato:

• calcolo reale distanza utente ↔ evento
• selezione destinatari per raggio reale
• distanceBand reale:
  ◦ 0–500m
  ◦ 500m–1km
  ◦ 1–3km
  ◦ 3–5km
• targeting differenziato per fascia
• metriche per fascia
• geo-targeting privacy-aware
• anti abuso specifici Trilli geo

Nuovo step roadmap approvato:

🔔 TRILLI GEO V2 / TARGETING GEOGRAFICO AVANZATO

Obiettivo:

evolvere Trilli oltre la V1/V1.5
introducendo:

• distanza reale utente-evento
• targeting geografico reale
• selezione per fasce distanza
• metriche geo
• consenso posizione/privacy
• futura integrazione promo QR

## 🌍 GEOLOCALIZZAZIONE EVENTI — STATO ATTUALE

Backend

Implementato:

- geocode server-side
- proxy OpenStreetMap/Nominatim
- separazione:
  - routes
  - controllers
  - services
- rate limit dedicato

Attualmente disponibile:

- geocode search

Implementato:

• reverse geocode backend
• endpoint POST /api/geocode/reverse
• normalizzazione dati localizzazione
• supporto “Usa la mia posizione”

Stato reale:
🟡 BETA FUNZIONANTE
da consolidare con edge case reali
(città, civici, POI complessi)

Frontend Organizer V2

Implementato:

- ricerca coordinate intelligente
- risultati multipli
- selezione sede attività
- compilazione automatica campi affidabili

Ricerca supportata

Funziona bene:

- nome luogo + città
- indirizzo + città
- via + civico + città
- nome luogo + CAP + città

⚠️ Ricerca:

- nome luogo + sola regione

non garantita
(limite reale provider).

Step successivo approvato

“Usa la mia posizione”

Architettura prevista:

- GPS browser
- reverse geocode backend
- compilazione automatica campi affidabili

Compatibilità futura prevista

- check-in
- mappe V2
- geo-targeting
- Trilli
- futura Mappa Organizer V2


## 📌 STATO ORGANIZER V2

### Completato

- Organizer Shell base
- Dashboard Organizer V2
- Eventi Organizer V2
- Trilli Organizer V2
- Registry Organizer coerenti
- Distinzione primo livello / secondo livello
- Renderer hardenizzati
- Controller hardenizzati
- Eliminazione `alert()` / `confirm()` dai file Organizer V2
- Azioni critiche con loading state
- Blocco doppio click
- CTA Promo temporaneamente disabilitata
- `organizer-bootstrap.js` limitato al primo livello
• Event Detail Organizer V2 consolidato
• Accessi Evento Privato V2 consolidati
• Event Form V2 consolidato
• rootReturnTo Organizer introdotto
• Dashboard → Eventi filtrati supportato
• blocco Trilli su eventi passati
• Eventi no-participants supportati
• needs-correction supportato
• ritorni intelligenti Dashboard/Eventi

### Primo livello Organizer V2

- `organizer-dashboard-v2`
- `organizer-events-v2`
- `organizer-trills-v2`

### Secondo livello Organizer V2

- `organizer-event-create-v2`
- `organizer-event-edit-v2`
- `organizer-event-detail-v2`
- `organizer-event-access-v2`
- `organizer-trill-create-v2`

Criticità da verificare su backup reale

messages-v2:

• apertura room da Organizer funzionante
• verificare definitivamente il flusso:
  organizer → room/messages-v2 → Torna
• verificare gestione reale di:
  rootReturnTo
• verificare eventuali edge case Netlify/404

Stato:
🟡 da validare sul backup attuale
prima di considerare il problema chiuso.

📌 PROSSIMI STEP REALI

1. Audit finale Organizer V2
2. Hardening finale Organizer V2
3. Promozioni Organizer V2
4. Mappa Organizer V2
5. Comunicazioni Organizer V2
6. Rifondazione Admin V2
7. UI Partecipante Trilli
8. Trilli Geo V2 / Targeting geografico avanzato
9. Promo QR
10. Eliminazione legacy frontend
11. PWA post Organizer/Admin
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
- ORGANIZER_V2_ROADMAP
- ORGANIZER_V2_KNOWN_ISSUES
---

## 5. REGOLA FINALE

La cartella `/docs` è parte integrante del sistema.
