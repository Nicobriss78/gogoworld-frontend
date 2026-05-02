# CHAT STARTER MASTER — V2

---

## CONTESTO
Frontend V2 in ricostruzione.
Backend stabile.
Legacy da eliminare.

---

## REGOLE

Leggere sempre:
- ARCHITECTURE_RULES_V2
- PRE_PATCH_CHECKLIST_V2
- POST_PATCH_VALIDATION_V2

---

## METODO

- Zero ipotesi
- Backup reale
- No patch in coda
- Test sempre

---

## DECISIONI CHIAVE

MAPPA PUBBLICA:
- dinamica
- multi-modale:
  - explore (geo)
  - search (intent)
  - filters (affinamento)

- separazione obbligatoria:
  - search ≠ geo ≠ filters

- ricerca eventi:
  - basata su `q`
  - NON deve influenzare la viewport
  - NON deve aprire automaticamente la chat

- filtri:
  - category (server)
  - isFree (server)
  - period → dateStart/dateEnd (server)
  - status (client)
  - pannello UI dedicato
  - contatore filtri attivi

- gestione evento selezionato:
  - apertura chat SOLO su tap marker
  - mai da ricerca o filtri
  - reset automatico su:
    - Vicino a me
    - Seguimi
    - pan/zoom
  - chiusura manuale sempre disponibile

MAPPA PRIVATI:
- dataset stabile
- NO reload su pan

SHELL:
- topbar + menu + bottomnav

CSS:
- bottomnav fixed
VIEWPORT:
- usare solo `--gw-app-viewport-h`
- vietato uso diretto di `100vh`, `100dvh`, `100svh` nei CSS V2

FONT:
- usare solo `--gw-font-family`
- vietati font locali hardcoded nelle aree V2

COMPOSER:
- input pill + bottone invio circolare
- vietato `gw-btn-primary` dentro composer

MAPPA PRIVATI:
- sblocco evento tramite pulsante diretto nella scheda
- non più da hamburger menu

CHAT:
- ordine messaggi: vecchi sopra, nuovi sotto
- sorting per `createdAt ASC`
- preview mappa max 5 messaggi
- nome autore visibile nella preview, no avatar
---

## STATO

- Area Partecipante V2 stabile
- MAPPA PUBBLICA V2 completata:
  - geolocalizzazione (Vicino a me)
  - tracking continuo (Seguimi)
  - rotazione dinamica basata su bearing
  - smoothing angolare (no rotazioni spurie)
  - distinzione UX:
    - pallino → posizione
    - freccia → direzione (solo con movimento reale)
  - reset coerente su interazione utente
  - centratura utente indipendente dagli eventi
  - caricamento eventi per raggio (default 20km)

  - ricerca eventi (`q`) integrata
  - ricerca precisa (campi controllati)
  - separazione completa:
    - search
    - geo
    - filters

  - sistema filtri completo:
    - category (server)
    - isFree (server)
    - period → dateStart/dateEnd (server)
    - status (client)
    - pannello UI
    - contatore attivo
    - reset filtri

  - gestione selezione evento:
    - chat NON auto-aperta da ricerca/filtri
    - apertura SOLO su tap marker
    - reset automatico su cambio modalità
    - chiusura manuale evento

  - UX header mappa:
    - layout a due righe
    - `[Seguimi] Eventi [Vicino a me]`
    - `[Ricerca] [Cerca] [Filtri]`

- MAPPA PRIVATI V2 stabilizzata:
  - conforme a PRIVATE_MAP_NO_GEO_DISCOVERY
  - dataset stabile non legato a geolocalizzazione
- MAPPA PRIVATI conforme a PRIVATE_MAP_NO_GEO_DISCOVERY
- Sblocco evento privato tramite pulsante diretto in scheda
- UI shared compatta e coerente
- Cross-browser hardening completato per Area Partecipante V2
- Composer chat V2 uniformati
- Chat preview MAPPA / MAPPA PRIVATI limitata e leggibile
- Chat V2 ordinate cronologicamente: vecchi sopra, nuovi sotto
- Chat NON realtime
- Polling intelligente attivo
- WebSocket/SSE non introdotti

### Sistema Trilli

- Backend completato e verificato
- Notifiche integrate
- Moderazione attiva
- Test reale eseguito con successo

## 🔔 CENTRO NOTIFICHE V2 — COMPLETATO

- Sistema notifiche in-app completamente implementato
- Integrazione tramite shared-topbar + shared-bootstrap
- Pannello notifiche overlay (desktop dropdown + mobile slide)
- Badge notifiche con conteggio dinamico
- Lettura notifiche:
  - apertura pannello → NON segna tutto letto
  - click singolo → segna solo quella notifica
- Aggiornamento badge in tempo reale
- Micro-UX completata (animazioni, tempo umano, hover, press)
- Eventi privati esclusi dalle notifiche follower

## 🔒 DECISIONI ARCHITETTURALI

- Notifiche in-app separate da sistema esterno
- Nessuna logica notifiche dentro topbar
- Nessun uso di file legacy notifiche
- Sistema notifiche completamente V2

## 🔔 TRILLI — BACKEND COMPLETATO

Stato attuale:

- Backend completamente implementato
- Notifiche integrate
- Moderazione admin attiva
- Test reale API eseguito (console browser)

### Stato tecnico

- T1 — Backend base ✅
- T2 — Integrazione notifiche ✅
- T3 — Moderazione admin ✅
- T3.5 — Test reale completato ✅

### Funzionamento

- Creazione draft Trilli (`POST /api/trills`)
- Invio notifiche (`POST /api/trills/:id/send`)
- Creazione Notification (type: "trill")
- Creazione TrillDelivery
- Aggiornamento metriche:
  - recipientCount
  - deliveredCount

### Moderazione

- Admin può bloccare un Trillo
- Trillo bloccato NON è inviabile

### Targeting (stato attuale)

- `interested_not_checked_in`
  → utenti partecipanti senza check-in

- `nearby`
  → fallback utenti participant (NON geolocalizzato reale)

- `both`
  → combinazione dei due

⚠️ Nota:
Il targeting geolocalizzato reale NON è ancora implementato.

### Vincoli attuali

- Nessuna UI Trilli
- Nessuna integrazione frontend
- Nessuna implementazione nel legacy

### Integrazione futura

- UI Organizer V2
- UI Partecipante (toast/banner live)
- geo-targeting reale utenti
- promo QR
- sistema crediti (free / pro)

## 📌 PROSSIMO STEP

1. Rifondazione completa Area Organizzatore V2
2. Rifondazione Area Admin V2
3. Integrazione UI Trilli (solo su V2, no legacy)
4. Implementazione geo-targeting reale utenti
5. Promo QR e redemption
6. Eliminazione completa legacy frontend
7. PWA

---

## ✅ STEP 2 — CHAT REACTIVITY COMPLETATO

Risultato raggiunto:
- ROOMS reattiva
- MESSAGES reattiva
- polling intelligente
- delta backend reale
- UX mobile stabile
- nessun WebSocket/SSE introdotto

Stato:
le chat sono production-ready in modalità pseudo-realtime.

## ✅ CROSS-BROWSER HARDENING — COMPLETATO AREA PARTECIPANTE V2

Risultato raggiunto:

- introdotto token viewport unico `--gw-app-viewport-h`
- eliminate dipendenze dirette da `100vh`, `100dvh`, `100svh`
- font V2 centralizzato tramite `--gw-font-family`
- proporzioni topbar/bottomnav shared validate
- composer chat V2 uniformati
- pagine di secondo livello V2 riallineate sul viewport token

Perimetro:
solo Area Partecipante V2 e relative pagine di secondo livello.

Organizzatore e Admin verranno allineati quando saranno rifondati.

---

## STRATEGIA

### LIVELLO 1
- render immediato
- polling 3–5 sec
- pausa tab inattivo
- refresh su ritorno

### LIVELLO 2
- solo nuovi messaggi
- preservare scroll

### LIVELLO 3 (futuro)
- WebSocket

---

## ROADMAP

1. Chat Reactivity ✅
2. Cross-browser hardening ✅
3. Sistema Trilli (backend completato) ✅
4. Rifondazione Organizzatore V2
5. Rifondazione Admin V2
6. UI Trilli
7. Geo targeting reale
8. Promo QR
9. Eliminazione legacy frontend
10. PWA

---

## REGOLA

Se serve forzare → soluzione sbagliata
