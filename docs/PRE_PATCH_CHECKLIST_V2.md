# PRE-PATCH CHECKLIST — V2

---

## ALLINEAMENTO
- Sto lavorando sul backup reale? [ ]
- Ho verificato il codice reale? [ ]
- Sto evitando ipotesi? [ ]
• Ho aperto realmente i file coinvolti? [ ]
• Ho verificato dipendenze reali prima della patch? [ ]
• Sto ragionando sul backup attuale e NON a memoria? [ ]
• Le ancore proposte esistono davvero nel file? [ ]
• Se il file è HTML/CSS/UI prevedibile:
→ sto proponendo una versione già matura e non embrionale? [ ]

• Se la logica è complessa/rischiosa:
→ sto partendo da una versione base stabile prima di affinare? [ ]

• Ho definito il contratto completo del file prima della patch? [ ]
---

## RESPONSABILITÀ
- Sto modificando il file giusto? [ ]
- Evito duplicazioni? [ ]
- Evito logica distribuita? [ ]
  
---

## GERARCHIA PAGINE V2

- Sto lavorando su una pagina di primo livello? [ ]
  → shell + topbar + bottomnav + bootstrap

- Sto lavorando su una pagina di secondo livello? [ ]
  → NO shell completa
  → NO bottomnav
  → `checkAccess()` diretto
  → controller dedicato
  → access denied stilato
  → CSS shell area disponibile se necessario

  - Sto evitando bootstrap su pagine immersive? [ ]

---

## MAPPA (CRITICO)

Se MAPPA PRIVATI:

- loadEvents in viewport? → NO [ ]
- uso bounds? → NO [ ]
- dataset cambia al pan? → NO [ ]

- Sto modificando MAPPA PRIVATI? [ ]→ Verificato rispetto regola 

---
    
PRIVATE_MAP_NO_GEO_DISCOVERY
---
## MAPPA AVANZATA (NUOVO)
- Sto modificando la ricerca eventi (q)? [ ]
- Sto modificando i filtri (category / period / status / isFree)? [ ]
- Sto rispettando separazione tra:
  - search (intent) [ ]
  - geo (posizione) [ ]
  - filters (affinamento) [ ]
- Sto evitando che:
  - la ricerca apra automaticamente la chat evento? [ ]
  - i filtri mantengano selezioni evento attive? [ ]
- Sto garantendo che:
  - solo il tap su marker attiva la chat? [ ]
  - ogni cambio modalità resetta la selezione evento? [ ]
    
Se sto lavorando su MAPPA PUBBLICA:

- Sto modificando logica GEO (Vicino a me / Seguimi)? [ ]
- Sto rispettando distinzione:
  - Vicino a me = centratura utente [ ]
  - Seguimi = tracking + rotazione [ ]
- Sto evitando fitBounds in Vicino a me? [ ]
- Sto mantenendo separazione tra:
  - controller (logica) [ ]
  - map (rendering) [ ]
- Sto evitando uso diretto di transform su container Leaflet? [ ]
- Sto rispettando smoothing angolare (no rotazioni >180°)? [ ]
- Sto evitando uso di plugin Leaflet invasivi? [ ]
---
## LIFECYCLE
- Evito doppio bootstrap? [ ]
- Evito load duplicati? [ ]
- Sto lasciando rami morti nei bootstrap? [ ]
- Il bootstrap gestisce SOLO il primo livello? [ ]

---

## UI
- Topbar mount presente? [ ]
- Bottom nav fixed? [ ]
- Le proporzioni shared sono rispettate? [ ]
• Sto evitando regressioni visuali reali dopo patch CSS? [ ]
• Ho verificato il comportamento reale mobile dopo deploy? [ ]
- Nessun font locale hardcoded? [ ]
- Nessun `100vh` / `100dvh` / `100svh` diretto nei CSS V2? [ ]
- Uso corretto di `--gw-app-viewport-h`? [ ]

---

## COMPOSER CHAT V2
- Sto modificando un composer V2? [ ]
- Uso input pill + bottone invio circolare? [ ]
- La label è solo accessibile (`sr-only`) e non visibile? [ ]
- Evito `gw-btn-primary` dentro composer? [ ]
- Evito bottone testuale largo “Invia”? [ ]
---


## CHAT PREVIEW MAPPA
Se sto modificando MAPPA / MAPPA PRIVATI:
- La chat NON si apre automaticamente da ricerca/filtri? [ ]
- Esiste sempre possibilità di chiudere manualmente evento selezionato? [ ]
- Cambiando stato mappa (Vicino a me / Seguimi / pan) la chat viene resettata? [ ]
- La chat è solo preview? [ ]
- Massimo 5 messaggi? [ ]
- Nome autore visibile? [ ]
- Nessun avatar autore? [ ]
- Ordine messaggi: vecchi sopra, nuovi sotto? [ ]
- La chat completa resta separata? [ ]

---

GEOLOCATION / GEOCODE

- Sto lavorando:
  
  - su search geocode? [ ]
  - su reverse geocode? [ ]

- Sto rispettando approccio backend-first? [ ]

- Sto evitando chiamate dirette provider dal frontend? [ ]

- Sto mantenendo separazione:
  
  - api layer frontend [ ]
  - controller UI [ ]
  - backend controller [ ]
  - backend service [ ]

- Sto evitando parsing provider dentro renderer UI? [ ]

- Sto verificando che:
  
  - latitudine sia valida? [ ]
  - longitudine sia valida? [ ]

- Sto sanitizzando query testuali? [ ]

- Sto mantenendo rate limit dedicato? [ ]

- Sto evitando fallback casuali multipli che peggiorano ranking provider? [ ]

- Sto trattando correttamente:
  
  - nome luogo [ ]
  - indirizzo [ ]
  - coordinate GPS [ ]

- Sto evitando inferenze non affidabili su:
  
  - venueName [ ]
  - street [ ]
  - streetNumber [ ]

- La feature è testabile via API senza frontend? [ ]

- Ho previsto:
  
  - gestione GPS negato? [ ]
  - gestione timeout GPS? [ ]
  - gestione provider senza risultati? [ ]
• Sto evitando auto-compilazione CAP? [ ]
• Il CAP resta manuale? [ ]
• Sto evitando fiducia cieca nel postalCode provider? [ ]
---

## TRILLI (BACKEND ATTIVO)

- Sto modificando il sistema Trilli esistente? [ ]
- Sto rispettando architettura backend-first? [ ]
- Sto evitando qualsiasi logica trilli lato client? [ ]
- Sto evitando integrazione con frontend legacy? [ ]

- Sto mantenendo separazione:
  - Trillo = evento live [ ]
  - Notifica = archivio [ ]

- Sto rispettando:
  - validazioni backend (evento, finestra temporale, approval) [ ]
  - targeting server-side [ ]
  - moderazione admin [ ]

- Sto evitando:
  - invio trilli dal client [ ]
  - calcolo target lato frontend [ ]

- Sto verificando che la feature sia testabile via API? [ ]
TARGETING REALE

• Sto lavorando sul targeting attuale V1/V1.5? [ ]
• Sto distinguendo:
◦ nearby fallback non geo reale [ ]
◦ geo-targeting reale (future V2) [ ]

• Sto evitando assunzioni errate tipo:
“radiusMeters = distanza reale”? [ ]

• Se feature Geo Trilli:
◦ usa consenso posizione utenti? [ ]
◦ mantiene privacy-safe? [ ]
◦ evita posizione precisa utente? [ ]
◦ usa distanceBand aggregate? [ ]  
---

## TRILLI (FRONTEND ORGANIZER V2)

### ARCHITETTURA

- `organizer-trills-v2`
  → primo livello Organizer V2 [ ]

- `organizer-trill-create-v2`
  → secondo livello Organizer V2 [ ]

- Sto evitando shell completa nelle pagine immersive? [ ]
- Sto lavorando su UI Organizer Trilli? [ ]

### IDENTIFICAZIONE

- Ogni trillo ha un id valido? [ ]
- Sto usando fallback corretto?
  - `t._id || t.id` [ ]
- Sto evitando:
  - id undefined [ ]
  - id null [ ]

- Il `data-id` nel DOM è presente? [ ]
- Il click handler riceve l’id corretto? [ ]

### AZIONI

- Il bottone Invia:
  - è renderizzato solo per `draft`? [ ]
  - è nascosto per altri stati? [ ]

- Sto evitando:
  - doppio click invio [ ]
  - invio multiplo [ ]

- Il bottone:
  - va in loading durante richiesta? [ ]
  - viene disabilitato? [ ]

### API

- L’endpoint è corretto?
  - `/api/trills/:id/send` [ ]

- Sto verificando:
  - URL reale generato (no undefined)? [ ]
  - response backend reale? [ ]

### UX

- Conferma invio presente? [ ]
- Gestione errore visibile? [ ]
- Stato aggiornato dopo invio? [ ]

### DEBUG (OBBLIGATORIO)

- Ho controllato la console? [ ]
- Ho verificato Network tab? [ ]
- L’errore backend è chiaro? [ ]
• Ho verificato comportamento reale dopo deploy? [ ]
• Ho confrontato comportamento previsto vs reale? [ ]
## SICUREZZA
- Nessuna logica sensibile lato client? [ ]
- Nessun bypass backend? [ ]
- Nessun id dinamico non validato? [ ]
- Sto evitando `alert()` / `confirm()` nelle aree V2 hardenizzate? [ ]
- Le azioni critiche hanno loading state? [ ]
- Le azioni critiche bloccano doppio click? [ ]
- I renderer escapeano output dinamici? [ ]
- I parametri URL vengono encodeati? [ ]
---
## HARDENING CONTROLLER

- Sto gestendo azioni concorrenti? [ ]
- Sto usando state dedicato per:
  - loading [ ]
  - deleting [ ]
  - opening [ ]
  - saving [ ]
  - confirm action [ ]

- Le conferme sono interne UI/state-driven? [ ]
- Sto evitando dipendenza da dialog browser? [ ]

---

## TEST
- Ho definito test prima della patch? [ ]

---

## TEST API (OBBLIGATORIO PER BACKEND-FEATURE)

- La feature è testabile via API senza frontend? [ ]
- Ho eseguito test reale (console / curl)? [ ]
- Ho verificato output reale (non teorico)? [ ]
- Ho validato edge cases (errori, blocchi, permessi)? [ ]

---

## REGOLA
Se qualcosa è dubbio → STOP
