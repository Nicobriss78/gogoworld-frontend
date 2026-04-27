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
- posizione: pulsante diretto nella scheda MAPPA PRIVATI V2
- elemento UI principale della pagina: `mappaUnlockBtn`

È vietato:
- duplicare il trigger nel menu hamburger
- mantenere accessi alternativi
- creare varianti UI concorrenti

Nota storica:
in una fase precedente lo sblocco era previsto nel menu hamburger; la regola è stata aggiornata perché lo sblocco è stato spostato direttamente nella scheda MAPPA PRIVATI V2.

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

## 💬 STATO ATTUALE CHAT V2

Le chat V2 sono ora reattive tramite polling intelligente.

### ROOMS
- polling attivo
- delta backend tramite `after`
- merge incrementale dei nuovi messaggi
- focus corretto sul messaggio più recente
- composer stabile su mobile
- `markRead` coerente con `createdAt`

### MESSAGES
- polling attivo solo sul thread corrente
- stop/reset su cambio thread, tab nascosto e pagehide
- delta backend tramite `after`
- merge incrementale dei nuovi messaggi
- lista thread aggiornata in background
- composer non bloccante
- focus corretto sull’ultimo messaggio
- 
### Ordinamento messaggi
Tutte le chat V2 devono visualizzare i messaggi in ordine cronologico crescente:

```txt
vecchi sopra
nuovi sotto
### Policy realtime
WebSocket e SSE restano esclusi in questa fase.

Strategia attuale:
polling intelligente + delta backend.
---
### Preview chat MAPPA / MAPPA PRIVATI

Le chat presenti in MAPPA V2 e MAPPA PRIVATI V2 sono anteprime, non chat complete.

Regole:

- massimo 5 messaggi visualizzati
- solo ultimi messaggi recenti
- ordinamento cronologico crescente: vecchi sopra, nuovi sotto
- visualizzazione del nome autore
- nessun avatar autore
- nessuno storico completo nella preview

La chat completa resta accessibile dalla pagina evento / rooms dedicate.
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

# 📐 VIEWPORT SYSTEM V2

Tutta l’Area Partecipante V2 e le pagine di secondo livello V2 devono usare il token unico:

```css
--gw-app-viewport-h

# 🔤 FONT SYSTEM V2

Nessuna area V2 deve definire font locali hardcoded.

Vietato:

```css
font-family: Arial, sans-serif;
font-family: Inter, Arial, Helvetica, sans-serif;

# 💬 COMPOSER CHAT V2

Tutti i composer chat V2 devono seguire lo standard unico:

- input pill
- bottone invio circolare compatto
- label non visibile, solo accessibilità tramite `sr-only`
- nessun bottone testuale “Invia” largo
- nessun uso di classi generiche legacy come `gw-btn-primary`

Schema UI:

```txt
[input messaggio] [send icon]

# 🏁 CONCLUSIONE


Questo file è vincolante.
