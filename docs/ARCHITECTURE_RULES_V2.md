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
  per filtrare eventi privati.

2. NO DYNAMIC RELOAD SU MAPPA
- Muovere la mappa NON deve cambiare il dataset eventi.
- Zoom e pan sono solo strumenti di navigazione visiva.

3. DATASET STABILE
- Gli eventi visibili sono determinati solo da:
  - autorizzazione utente
  - sblocco tramite codice

4. GEO CONSENTITO SOLO PER:
- check-in (validazione presenza)
- apertura navigatore esterno (Google Maps)
- eventuale visualizzazione distanza (non filtrante)

5. SINGLE ENTRY POINT UNLOCK
- Lo sblocco eventi privati deve avvenire tramite:
  - CTA primaria nella mappa (Sblocca evento)
- NON deve esistere duplicazione nel menu hamburger

6. UX COERENTE
- MAPPA PUBBLICA = discovery geografica
- MAPPA PRIVATI = spazio personale/autorizzato

Violazione:
Qualsiasi reintroduzione di:
- fetch con bounds/radius
- reload eventi su viewport change
- geolocalizzazione come filtro

è da considerarsi BREAK ARCHITETTURALE.
---

## 🚫 DIVIETO ASSOLUTO (MAPPA PRIVATI)

È vietato:
- ricaricare eventi su movimento viewport
- usare bounds per filtrare eventi
- modificare dataset durante pan

---

## ✅ COMPORTAMENTO CORRETTO

Load eventi SOLO:
- ingresso scheda
- unlock evento
- azioni esplicite

Il pan:
- aggiorna SOLO il centro
- NON modifica dataset

---

## 🔥 BUG CRITICO RISOLTO

Reintrodurre:
- loadEvents in handleViewportChanged
- reload su bounds

→ RIAPRE IL BUG

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
