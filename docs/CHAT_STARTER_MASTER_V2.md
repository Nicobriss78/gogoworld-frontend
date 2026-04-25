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

---

## STATO

- Mappa pubblica OK
- Mappa privata stabilizzata
- UI stabile
- Chat NON realtime

---

## 🎯 STEP ATTUALE — CHAT REACTIVITY

Contesto:
- sistema stabile
- check-in completato
- MAPPA PRIVATI corretta
- chat non reattive

Obiettivo:
→ polling intelligente

Ambito:
- rooms
- messages-v2

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
3. Trilli
4. Organizzatore V2
5. Admin V2
6. PWA

---

## REGOLA

Se serve forzare → soluzione sbagliata
