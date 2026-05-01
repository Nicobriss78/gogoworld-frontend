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

## 🔮 TRILLI (PROGETTATI — NON IMPLEMENTATI)

- Sistema Trilli definito a livello di Specifica Tecnica V1
- Trillo = avviso live geolocalizzato e temporaneo legato a evento
- Distinzione architetturale obbligatoria:
  - Trillo = livello live (toast / alert / push)
  - Notifica = archivio persistente

- Integrazione futura prevista con:
  - geo-targeting utenti
  - Centro Notifiche V2 (archivio)
  - check-in (source: "trill")
  - sistema crediti (free / pro / promo)
  - promo QR e redemption

- Vincoli attuali:
  - nessuna UI Trilli in Area Partecipante
  - nessuna implementazione in legacy Organizzatore/Admin
  - backend da implementare in step successivo

- I Trilli saranno sviluppati dopo:
  - rifondazione Area Organizzatore V2
  - rifondazione Area Admin V2

## 📌 PROSSIMO STEP

- Fase 2: Ricerca eventi + filtri + UX MAPPA V2 (COMPLETATA)
- Specifica Tecnica Trilli V1 (COMPLETATA)
- Preparazione backend Trilli (step successivo)
- Rifondazione Area Organizzatore V2
- Rifondazione Area Admin V2
- Eliminazione completa legacy frontend Partecipante
- PWA post Organizzatore/Admin
- Rifondazione Area Organizzatore V2
- Rifondazione Area Admin V2
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
