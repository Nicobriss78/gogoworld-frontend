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
