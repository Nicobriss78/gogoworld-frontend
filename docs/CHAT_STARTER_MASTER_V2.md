# CHAT STARTER MASTER — V2

---

CONTESTO

GoGoWorld.life è in rifondazione strutturale V2.

Stato reale:

• Area Partecipante V2 stabile e maturata
• Organizer V2 in fase avanzata di consolidamento
• Backend già esteso e riusabile
• Legacy ancora presente ma solo come miniera logica
• Admin ancora legacy (da rifondare successivamente)

Direzione ufficiale:

CONSOLIDARE → STABILIZZARE → ESPANDERE

mai:
❌ creare nuove aree lasciando instabile la base

---

## REGOLE

Leggere sempre:
- ARCHITECTURE_RULES_V2
- PRE_PATCH_CHECKLIST_V2
- POST_PATCH_VALIDATION_V2
• Aprire SEMPRE realmente i file allegati
• Verificare codice reale prima di proporre patch
• Nessuna analisi a memoria
• Nessuna ancora ipotizzata
---

## METODO

- Zero ipotesi
- Backup reale
- No patch in coda
- Test sempre
• Per logiche complesse:
◦ versione base stabile → test reale → affinamento progressivo

• Per HTML/CSS e UI prevedibile:
◦ partire subito da versione avanzata/matura
◦ già coerente con:
▪ token
▪ responsive
▪ accessibilità
▪ stati UI
▪ cache/versioning
▪ access denied
▪ gerarchia V2

• Definire sempre il contratto completo del file prima della generazione
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

🔔 SISTEMA TRILLI — STATO REALE

Backend:
• completato
• verificato
• notifiche integrate
• moderazione admin attiva
• delivery tracking presente

Frontend Organizer V2:
• implementato
• consolidato
• hardenizzato
• integrato nella Organizer Shell V2

Stato tecnico

• T1 — Backend base ✅
• T2 — Integrazione notifiche ✅
• T3 — Moderazione admin ✅
• T3.5 — Test reale API completato ✅
• T4 — Organizer UI base completata ✅
• T4.5 — Hardening Organizer completato ✅

Funzioni attive

• Creazione draft Trilli
• Lista Trilli Organizer
• Invio Trilli
• Stato aggiornato draft → sent
• Conferma interna invio
• Loading state
• Blocco doppio click
• Feedback state-driven
• Nessun alert() / confirm()

Targeting reale attuale

• interested_not_checked_in
• nearby (fallback non geolocalizzato reale)
• both

⚠️ Geo-targeting reale NON ancora implementato

Nuovo step approvato:

🔔 TRILLI GEO V2 / TARGETING GEOGRAFICO AVANZATO

Obiettivo:

• distanza reale utente-evento
• targeting per fasce distanza
• distanceBand reale
• metriche geo
• consenso posizione/privacy
• futura integrazione Promo QR

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

## 🧭 PATTERN PAGINE V2

### Primo livello

Le pagine principali V2 devono usare:
- shell area
- topbar
- bottomnav
- bootstrap area
- registry/nav ufficiali

Esempi:
- Home V2
- Mappa V2
- Organizer Dashboard V2
- Organizer Events V2
- Organizer Trills V2

### Secondo livello

Le pagine immersive/operative NON devono usare:
- bottomnav
- bootstrap shell completo

Devono usare:
- `checkAccess()` diretto
• access denied stilato
• organizer-shell.css disponibile se necessario
- controller dedicato
- back contestuale
- struttura autonoma

Esempi:
- evento-v2
- messages-v2
- organizer-event-detail-v2
- organizer-event-access-v2
- organizer-event-create-v2
- organizer-event-edit-v2
- organizer-trill-create-v2

Questa regola vale per:
- Partecipante V2
- Organizer V2
- futura Admin V2

## 🔔 TRILLI — ORGANIZER V2 CONSOLIDATO

### Stato reale attuale

Backend:
- completato
- verificato
- moderazione attiva
- notifiche integrate

Frontend Organizer V2:
- implementato
- hardenizzato
- integrato nella Organizer Shell V2

### Stato tecnico

- T1 — Backend base ✅
- T2 — Integrazione notifiche ✅
- T3 — Moderazione admin ✅
- T3.5 — Test reale API completato ✅
- T4 — Organizer UI base completata ✅
- T4.5 — Hardening Organizer completato ✅

### Funzioni attive

- Creazione draft Trilli
- Lista Trilli Organizer
- Invio Trilli
- Stato aggiornato (`draft → sent`)
- Conferma interna invio
- Loading state
- Blocco doppio click
- Feedback state-driven
- Nessun `alert()` / `confirm()`

### Architettura

`organizer-trills-v2.html`
→ pagina di primo livello:
- Organizer Shell
- topbar
- bottomnav
- bootstrap Organizer

`organizer-trill-create-v2.html`
→ pagina di secondo livello:
- no bottomnav
- no Organizer Shell
- `checkAccess()` diretto
- controller dedicato

### Targeting (stato attuale)

- `interested_not_checked_in`
- `nearby` (fallback non geo reale)
- `both`

⚠️ Nota:
geo-targeting reale NON ancora implementato.

### Integrazione futura

- UI Partecipante live
- geo-targeting reale
- promo QR
- crediti / boost
- analytics Trilli

🌍 GEOLOCALIZZAZIONE EVENTI — ORGANIZER EVENT FORM V2

Stato reale attuale

Backend:

- proxy geocode server-side attivo
- integrazione OpenStreetMap / Nominatim
- separazione:
  - routes
  - controllers
  - services
- rate limit dedicato
- sanitizzazione query attiva

Frontend:

- Organizer Event Form V2 integrato
- ricerca coordinate intelligente
- supporto risultati multipli
- compilazione automatica campi affidabili
- selezione manuale sede attività
⚠️ Residuo UI noto:
• styling geocode results da rifinire
• classi residue:
◦ .org-event-location-actions
◦ .org-event-geocode-results
◦ .org-event-geocode-results-list
◦ .org-event-geocode-result

Ricerca supportata

Funziona bene:

- nome luogo + città
- indirizzo + città
- via + civico + città
- nome luogo + CAP + città

⚠️ Nota:
ricerca:

- nome luogo + sola regione

non è garantita.

Limite reale del provider Nominatim/OpenStreetMap.

Compilazione automatica

Il sistema compila automaticamente quando i dati sono affidabili:

• coordinate
• città
• provincia
• regione
• paese

⚠️ CAP NON auto-compilato

Decisione definitiva:

il CAP resta manuale
perché i provider geografici
non sono sufficientemente affidabili.

Può compilare anche:

- venueName
- street
- streetNumber

solo se presenti realmente nella risposta provider.

Stato reverse geocoding

Implementato:

• reverse geocode backend
• endpoint:
  POST /api/geocode/reverse

Disponibile:

• geocode search
• reverse geocode

Stato reale:
🟡 beta funzionante
da consolidare con edge case reali
(civici, POI, città dense)

Step approvato successivo

“Usa la mia posizione”

Architettura prevista:

1. browser ottiene GPS
2. frontend invia coordinate al backend
3. backend esegue reverse geocoding
4. frontend compila automaticamente i campi affidabili

Regole architetturali

- mai chiamare OpenStreetMap direttamente dal frontend
- sempre passare dal backend
- evitare fallback casuali multipli
- mantenere separazione responsabilità
- mantenere compatibilità futura con:
  - check-in
  - geo-targeting
  - Trilli
  - mappe V2

## 📌 STATO ORGANIZER V2

### Completato

- Organizer Shell base
- Dashboard Organizer V2
- Eventi Organizer V2
- Trilli Organizer V2
- Distinzione primo/secondo livello
- Registry Organizer coerenti
- Hardening renderer Organizer
- Hardening controller Organizer
- Eliminazione `alert()/confirm()` Organizer
- Gestione azioni concorrenti
- Blocco doppio click
- CTA Promo temporaneamente disabilitata
- Pulizia `organizer-bootstrap.js`

- Event Form V2 consolidato
  • organizer-event-form.css normalizzato
  • organizer-event-detail.css normalizzato
  • organizer-event-access.css normalizzato
  • organizer-trill-form.css normalizzato
  • organizer-access-guard hardenizzato
  • access denied secondo livello consolidato
  • organizer-shell.css disponibile nei second-level
  • versioning Trilli Organizer consolidato
  • messages-v2 Organizer consolidato
- Event Detail V2 consolidato
- Accessi Evento Privato V2 consolidati
- rootReturnTo Organizer introdotto
- Dashboard → Eventi filtrati supportato
- blocco Trilli su eventi passati
- supporto no-participants
- supporto needs-correction
- ritorni intelligenti Dashboard/Eventi

### Stato architetturale

Organizer V2:
- separato dal legacy
- modulare
- state-driven
- shell coerente
- controller separati
- renderer separati
- no monoliti

### Criticità da verificare sul backup reale

messages-v2 / Organizer

Stato reale:
✅ consolidato

Verificato sul backup reale:

• apertura room Organizer funzionante
• organizer → room/messages-v2 → Torna corretto
• rootReturnTo Organizer corretto
• “Apri evento” contestuale Organizer corretto
• nessun loop di navigazione rilevato
• nessun 404 Netlify rilevato nei test eseguiti

---

## 📌 ROADMAP REALE

1. Consolidamento finale Organizer V2
2. Docs finali Organizer V2
2.5 Rifinitura geocode Organizer V2
3. Promozioni Organizer V2
4. Mappa Organizer V2
5. Comunicazioni Organizer V2
6. Rifondazione Admin V2
7. UI Partecipante Trilli
8. Trilli Geo V2 / Targeting geografico avanzato
9. Promo QR
10. Eliminazione legacy frontend
11. PWA


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
2. Cross-browser hardening Partecipante V2 ✅
3. Backend Trilli ✅
4. Organizer Trilli V2 ✅
5. Organizer V2 hardening architetturale ✅
6. Organizer V2 renderer hardening ✅
7. Organizer V2 controller hardening ✅
8. Rifondazione Organizer V2 (completamento)
9. Promozioni Organizer V2
10. Mappa Organizer V2
11. Comunicazioni Organizer V2
12. Rifondazione Admin V2
13. UI Partecipante Trilli
14. Trilli Geo V2 / Targeting geografico avanzato
15. Geo targeting reale
16. Promo QR
17. Eliminazione legacy frontend
18. PWA
---

## REGOLA

Se serve forzare → soluzione sbagliata
