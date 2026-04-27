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
- Check-in completato
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
- PWA rimandata a dopo rifondazione Organizzatore/Admin
- Prossimo step: test cross-browser reali / avvio prossima fase roadmap
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
