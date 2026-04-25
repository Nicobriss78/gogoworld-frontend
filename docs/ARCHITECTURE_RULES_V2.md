# ARCHITECTURE RULES — V2 (VINCOLANTI)

Questo documento definisce le regole INVIO-LABILI del progetto GoGoWorld.life.

---

# 🔒 REGOLE INVIOLABILI DI METODO

- Backup reale = unica fonte di verità
- Zero ipotesi
- No patch in coda
- Separazione responsabilità (HTML / CSS / JS / API / Backend)
- Nessuna duplicazione logica
- V2 indipendente dal legacy
- Sicurezza sempre prioritaria
- Metodo: Analisi → Test → Isolamento → Fix

---

# 🧠 PRINCIPI ARCHITETTURALI

- Stato > UI
- Dataset coerente
- Lifecycle controllato

---

# ⚠️ MAPPA PUBBLICA vs MAPPA PRIVATI

## MAPPA PUBBLICA
- discovery geografica
- reload su viewport consentito

## MAPPA PRIVATI
- dataset autorizzato
- dataset stabile
- NON è discovery

========================================
RULE: PRIVATE_MAP_NO_GEO_DISCOVERY
========================================

Contesto:
La scheda MAPPA PRIVATI V2 non è una mappa di discovery geografica,
ma una vista di eventi privati autorizzati per l’utente.

Definizione:
La MAPPA PRIVATI deve mostrare esclusivamente eventi:
- sbloccati tramite codice
- a cui l’utente è autorizzato
- a cui l’utente partecipa

NON deve mai usare la posizione geografica per determinare
quali eventi mostrare.

Regole obbligatorie:

1. NO GEO FILTERING
- Vietato usare:
  - lat/lng
  - radius
  - bounds

2. NO DYNAMIC RELOAD SU MAPPA
- Muovere la mappa NON deve cambiare il dataset eventi

3. DATASET STABILE
- determinato solo da autorizzazioni / unlock

4. GEO CONSENTITO SOLO PER:
- check-in
- navigazione esterna

5. UX COERENTE
- pubblica = discovery
- privati = spazio personale

---

## 🔐 PRIVATE_MAP_SINGLE_ENTRY_UNLOCK (DEFINITIVO)

Lo sblocco eventi privati deve avvenire tramite:

- UN SOLO entry point
- posizione: hamburger menu (MAPPA PRIVATI)

È vietato:
- duplicare il trigger
- accessi alternativi
- varianti UI

---

## 🚫 DIVIETO ASSOLUTO (MAPPA PRIVATI)

È vietato:
- reload eventi su viewport
- uso bounds
- modifica dataset su pan

---

## ✅ COMPORTAMENTO CORRETTO

Load eventi SOLO:
- ingresso
- unlock
- azioni esplicite

Pan:
- aggiorna centro
- NON dataset

---

# 💬 STATO ATTUALE CHAT (V2)

Backend:
- API OK
- struttura stabile
- NO realtime

Frontend:
- invio OK
- render OK
- refresh manuale
- NO polling continuo
- NO aggiornamento live

➡️ chat funzionanti ma NON reattive

---

## 🚫 REALTIME POLICY (ATTUALE)

VIETATO:
- WebSocket
- SSE

Strategia:
→ polling intelligente

---

# 🧩 SHELL UI

Ogni pagina V2 deve avere:
- sharedTopbarMount
- sharedMenuMount
- sharedBottomnavMount

---

# 🎨 CSS SHARED

Bottom nav:
- position: fixed
- mai static

---

# 🏁 CONCLUSIONE

Questo file è vincolante.
