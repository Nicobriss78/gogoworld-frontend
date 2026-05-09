# POST-PATCH VALIDATION — V2

---

## STRUTTURA
- Modifiche nei punti giusti? [ ]
- Nessuna patch sporca? [ ]
- Nessuna duplicazione? [ ]

---
## GERARCHIA PAGINE V2

- Le pagine di primo livello usano:
  - shell [ ]
  - topbar [ ]
  - bottomnav [ ]
  - bootstrap area [ ]

- Le pagine di secondo livello NON usano:
  - shell completa [ ]
  - bottomnav [ ]
  - bootstrap area [ ]

- Le pagine immersive usano:
  - `checkAccess()` diretto [ ]
  - controller dedicato [ ]
---

## UI
- Topbar visibile? [ ]
- Bottom nav fissa? [ ]
- Layout stabile? [ ]
- Proporzioni shared coerenti tra le 6 schede V2? [ ]
- Font V2 centralizzato tramite `--gw-font-family`? [ ]
- Nessun `100vh` / `100dvh` / `100svh` diretto nei CSS V2? [ ]
- Viewport gestita tramite `--gw-app-viewport-h`? [ ]
---

## COMPOSER CHAT V2
- Composer visivamente coerente? [ ]
- Input pill corretto? [ ]
- Bottone invio circolare compatto? [ ]
- Label non visibile ma accessibile? [ ]
- Nessun `gw-btn-primary` dentro composer? [ ]
- Nessun overflow su mobile? [ ]
---

## CHAT V2
- Ordine messaggi corretto: vecchi sopra, nuovi sotto? [ ]
- I nuovi messaggi restano visibili in basso? [ ]
- Nessun `.reverse()` improprio? [ ]
- Ordinamento stabile per `createdAt ASC`? [ ]

MAPPA / MAPPA PRIVATI:
- Preview limitata a massimo 5 messaggi? [ ]
- Nome autore visibile? [ ]
- Nessun avatar autore? [ ]
- Chat completa separata dalla preview? [ ]
---
## FUNZIONALE
- Flusso principale OK? [ ]
- Ritorno da pagina OK? [ ]
- Stato coerente? [ ]
- Stato search coerente? [ ]
- Stato filters coerente? [ ]
- Stato geo coerente? [ ]
- Stato chat/selectedEvent coerente? [ ]
- Nessun ritorno 404 nei flow V2 principali? [ ]
- Nessun bootstrap non previsto? [ ]
- Nessun import morto nei bootstrap? [ ]
---

GEOLOCATION / GEOCODE — VALIDAZIONE

SEARCH GEOCODE

- Ricerca:
  
  - nome luogo + città funzionante? [ ]
  - indirizzo + città funzionante? [ ]
  - via + civico + città funzionante? [ ]
  - nome luogo + CAP + città funzionante? [ ]

- Risultati multipli:
  
  - renderizzati correttamente? [ ]
  - selezionabili? [ ]
  - compilazione automatica coerente? [ ]

- Nessuna apertura automatica mappe/chat? [ ]

REVERSE GEOCODE

- GPS browser ottenuto correttamente? [ ]

- Gestione permesso negato corretta? [ ]

- Gestione timeout GPS corretta? [ ]

- Reverse geocode backend funzionante? [ ]

- Coordinate validate correttamente? [ ]

- Compilazione automatica:
  
  - città [ ]
  - provincia [ ]
  - regione [ ]
  - paese [ ]
  - CAP [ ]

- venueName compilato solo se affidabile? [ ]

- street compilata solo se affidabile? [ ]

- streetNumber compilato solo se affidabile? [ ]

- Nessuna inferenza inventata? [ ]

BACKEND

- Nessuna chiamata provider dal frontend? [ ]
- Endpoint backend funzionanti via API reale? [ ]
- Rate limit funzionante? [ ]
- Errori provider gestiti correttamente? [ ]
- Nessun leak provider verso UI? [ ]

FUTURA COMPATIBILITÀ

- Compatibilità preservata con:
  - check-in [ ]
  - geo-targeting [ ]
  - Trilli [ ]
  - mappe V2 [ ]

---

## BACKEND FEATURES (VALIDAZIONE)

- La feature funziona senza frontend? [ ]
- I test API sono stati eseguiti realmente? [ ]
- Le risposte backend sono coerenti con lo stato atteso? [ ]
- Nessuna dipendenza implicita dal frontend? [ ]
---

## MAPPA

PUBBLICA:
- reload corretto [ ]
- Ricerca eventi funzionante tramite `q`? [ ]
- Ricerca e GEO restano separate? [ ]
- Filtri funzionanti:
  - category server-side? [ ]
  - isFree server-side? [ ]
  - period/dateStart/dateEnd server-side? [ ]
  - status client-side? [ ]
- Tasto Filtri apre/chiude pannello correttamente? [ ]
- Contatore Filtri aggiornato? [ ]
- Reset filtri coerente? [ ]
- Ricerca/filtri NON aprono automaticamente la chat? [ ]
- Tap marker apre la chat? [ ]
- Tasto Chiudi evento resetta selezione/chat? [ ]
- Vicino a me / Seguimi / pan resettano selezione evento? [ ]
- Header mappa compatto su due righe:
  - `[Seguimi] Eventi [Vicino a me]` [ ]
  - `[Box ricerca] [Cerca] [Filtri]` [ ]

PRIVATI:
- marker stabile [ ]
- niente sparizione [ ]
- chat coerente [ ]

 - Nessun uso di lat/lng/radius/bounds nelle API [ ]
- Nessun reload eventi su pan/zoom [ ]
 - Dataset stabile dopo movimento mappa [ ]
- Sblocco evento privato tramite pulsante diretto nella scheda [ ]
- `mappaUnlockBtn` presente e funzionante [ ]
- Nessuna duplicazione nel menu hamburger [ ]
- Nessun trigger alternativo di sblocco [ ]
---
### MAPPA PUBBLICA — VALIDAZIONE AVANZATA

- Vicino a me centra sempre l’utente? [ ]
- Zoom coerente indipendente dal raggio? [ ]
- Gli eventi NON spostano la viewport? [ ]

- Seguimi attivo:
  - tracking fluido? [ ]
  - pan coerente? [ ]
  - rotazione fluida? [ ]

- Rotazione:
  - nessun giro completo anomalo? [ ]
  - smoothing corretto? [ ]

- Puntatore utente:
  - pallino da fermo? [ ]
  - freccia solo con movimento reale? [ ]

- Interazione utente:
  - drag disattiva Seguimi? [ ]
  - reset rotazione corretto? [ ]
---

## TRILLI — VALIDAZIONE BACKEND

- Creazione draft funzionante (`POST /api/trills`)? [ ]
- Invio funzionante (`POST /api/trills/:id/send`)? [ ]
- Stato Trillo aggiornato correttamente (`draft → sent`)? [ ]

- Notification create correttamente (type: "trill")? [ ]
- TrillDelivery create correttamente? [ ]
- Metriche aggiornate:
  - recipientCount coerente? [ ]
  - deliveredCount coerente? [ ]

- Validazioni attive:
  - evento esistente? [ ]
  - evento approvato? [ ]
  - finestra temporale rispettata? [ ]
  - permessi organizer/admin rispettati? [ ]

- Moderazione:
  - admin può bloccare? [ ]
  - trillo bloccato NON inviabile? [ ]

- Targeting:
  - interested_not_checked_in corretto? [ ]
  - nearby (fallback) funzionante? [ ]
  - both coerente? [ ]

- Nessuna esposizione:
  - posizione utenti [ ]
  - distanza reale [ ]
  - identità utenti target [ ]

- Feature testata via API reale (console / curl)? [ ]

---
---

## TRILLI — VALIDAZIONE FRONTEND (ORGANIZER V2)

### IDENTIFICAZIONE

- Ogni trillo ha id valido nel DOM? [ ]
- Nessun `undefined` negli endpoint? [ ]
- Uso fallback id corretto (`_id || id`)? [ ]

### RENDERING

- Bottone "Invia" visibile SOLO per stato `draft`? [ ]
- Bottone nascosto per stati:
  - sent [ ]
  - blocked [ ]
  - cancelled [ ]
  - expired [ ]
- Nessun rendering incoerente? [ ]

### AZIONE INVIO

- Click su "Invia" attiva:
  - conferma utente? [ ]
  - chiamata API corretta? [ ]
- Endpoint generato corretto:
  - `/api/trills/:id/send` [ ]
- Nessun `/undefined/send`? [ ]

### STATO

- Stato aggiornato dopo invio:
  - draft → sent [ ]
- UI aggiornata senza reload completo? [ ]
- Bottone rimosso dopo invio? [ ]

### UX

- Bottone disabilitato durante invio? [ ]
- Nessun doppio click possibile? [ ]
- Feedback utente:
  - successo visibile [ ]
  - errore visibile [ ]

### DEBUG (OBBLIGATORIO)

- Console verificata? [ ]
- Network verificato? [ ]
- Response backend corretta? [ ]


---
  
## SICUREZZA
- Nessuna regressione sicurezza? [ ]
- Nessun endpoint costruito con parametri undefined/null? [ ]
- Nessun `alert()` / `confirm()` nelle aree V2 hardenizzate? [ ]
- Renderer escapati correttamente? [ ]
- Parametri URL encodeati? [ ]
- Azioni concorrenti bloccate? [ ]
- Doppio click bloccato? [ ]
- Loading state presenti nelle azioni critiche? [ ]
---

## CROSS TEST
- Desktop OK [ ]
- Mobile OK [ ]
- Ritorno OK [ ]

---
## ORGANIZER V2 — VALIDAZIONE

### Primo livello

- organizer-dashboard-v2 OK? [ ]
- organizer-events-v2 OK? [ ]
- organizer-trills-v2 OK? [ ]

- topbar Organizer presente? [ ]
- bottomnav Organizer presente? [ ]
- bootstrap Organizer corretto? [ ]

### Secondo livello

- organizer-event-create-v2 OK? [ ]
- organizer-event-edit-v2 OK? [ ]
- organizer-event-detail-v2 OK? [ ]
- organizer-event-access-v2 OK? [ ]
- organizer-trill-create-v2 OK? [ ]

- Nessuna bottomnav presente? [ ]
- Nessuna shell completa presente? [ ]
- `checkAccess()` diretto funzionante? [ ]

### Hardening

- Nessun `alert()` / `confirm()` Organizer? [ ]
- Conferme interne funzionanti? [ ]
- Loading action funzionanti? [ ]
- Azioni concorrenti bloccate? [ ]

### Criticità note

- `messages-v2`
  - `rootReturnTo=organizer`
  - verificato/stabile? [ ]
    
--- 
  
## CHIUSURA
Se qualcosa è strano → NON chiudere
