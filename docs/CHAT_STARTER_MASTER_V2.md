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
- Mappa pubblica OK
- Mappa privata stabilizzata
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

1. Chat Reactivity
2. Cross-browser hardening
3. Trilli / geolocalizzazione / promo QR
4. Organizzatore V2
5. Admin V2
6. Eliminazione residui legacy frontend
7. PWA

Nota:
la PWA è rimandata a dopo la rifondazione delle aree Organizzatore e Admin.

---

## REGOLA

Se serve forzare → soluzione sbagliata
