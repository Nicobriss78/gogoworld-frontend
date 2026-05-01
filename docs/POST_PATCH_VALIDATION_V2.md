# POST-PATCH VALIDATION — V2

---

## STRUTTURA
- Modifiche nei punti giusti? [ ]
- Nessuna patch sporca? [ ]
- Nessuna duplicazione? [ ]

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

## TRILLI — VALIDAZIONE FUTURA

- Nessuna UI Trilli inserita nel legacy Organizzatore/Admin? [ ]
- Nessuna gestione attiva Trilli dentro MAPPA V2? [ ]
- Distinzione rispettata:
  - Trillo = live [ ]
  - Notifica = archivio/storico [ ]
- Nessuna esposizione posizione precisa utenti? [ ]
- Nessun invio trillo lato client? [ ]
- Nessuna monetizzazione/crediti hardcoded lato frontend? [ ]

---

## SICUREZZA
- Nessuna regressione sicurezza? [ ]

---

## CROSS TEST
- Desktop OK [ ]
- Mobile OK [ ]
- Ritorno OK [ ]

---

## CHIUSURA
Se qualcosa è strano → NON chiudere
