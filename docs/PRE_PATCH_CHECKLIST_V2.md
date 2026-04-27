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

- La chat è solo preview? [ ]
- Massimo 5 messaggi? [ ]
- Nome autore visibile? [ ]
- Nessun avatar autore? [ ]
- Ordine messaggi: vecchi sopra, nuovi sotto? [ ]
- La chat completa resta separata? [ ]
  
## SICUREZZA
- Nessuna logica sensibile lato client? [ ]
- Nessun bypass backend? [ ]

---

## TEST
- Ho definito test prima della patch? [ ]

---

## REGOLA
Se qualcosa è dubbio → STOP
