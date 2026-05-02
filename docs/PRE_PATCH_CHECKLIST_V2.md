# PRE-PATCH CHECKLIST — V2

---

## ALLINEAMENTO
- Sto lavorando sul backup reale? [ ]
- Ho verificato il codice reale? [ ]
- Sto evitando ipotesi? [ ]

---

## RESPONSABILITÀ
- Sto modificando il file giusto? [ ]
- Evito duplicazioni? [ ]
- Evito logica distribuita? [ ]

---

## MAPPA (CRITICO)

Se MAPPA PRIVATI:

- loadEvents in viewport? → NO [ ]
- uso bounds? → NO [ ]
- dataset cambia al pan? → NO [ ]

[ ] Sto modificando MAPPA PRIVATI?
    → Verificato rispetto regola PRIVATE_MAP_NO_GEO_DISCOVERY
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

---

## UI
- Topbar mount presente? [ ]
- Bottom nav fixed? [ ]
- Le proporzioni shared sono rispettate? [ ]
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
  
---

## SICUREZZA
- Nessuna logica sensibile lato client? [ ]
- Nessun bypass backend? [ ]

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
