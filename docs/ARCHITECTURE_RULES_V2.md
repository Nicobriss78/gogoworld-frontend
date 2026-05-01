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

### SEARCH / FILTERS RULES (VINCOLANTI)

Contesto:
La MAPPA PUBBLICA V2 è multi-modale e gestisce tre livelli distinti.

Definizione:
- Search = intenzione utente
- Geo = posizione utente
- Filters = affinamento dataset

Regole obbligatorie:

1. SEPARAZIONE ASSOLUTA
- search, geo e filters NON devono interferire tra loro
- la ricerca NON deve modificare la viewport
- la geolocalizzazione NON deve sovrascrivere una ricerca attiva

2. SEARCH
- basata su parametro `q`
- NON deve attivare automaticamente:
  - chat evento
  - selezione evento
- deve aggiornare SOLO il dataset

3. FILTERS
- possono modificare dataset
- NON devono:
  - aprire chat
  - mantenere selezioni evento attive
- devono essere combinabili con search

4. GEO
- Vicino a me → centratura utente
- Seguimi → tracking continuo
- NON devono mantenere selezione evento attiva

5. DATASET PRIORITY
- search attivo → prevale su geo
- filters → sempre applicati sopra dataset corrente

### GEO UX RULES (VINCOLANTI)

Vicino a me:
- Deve sempre centrare l’utente
- NON deve usare fitBounds con eventi
- Il raggio eventi NON deve influenzare lo zoom
- Gli eventi sono contesto, non driver della viewport

Seguimi:
- Attiva tracking continuo (watchPosition)
- Attiva rotazione mappa basata su bearing reale
- Deve usare smoothing angolare (no rotazioni >180°)
- Deve ignorare rumore GPS (accuracy + distanza minima)
- Deve disattivarsi automaticamente su:
  - drag mappa
  - zoom manuale

Rotazione mappa:
- Deve essere fluida (requestAnimationFrame)
- Deve usare shortest path angolare (-180 / +180)
- NON deve usare plugin Leaflet invasivi
- È implementata via wrapper DOM (compromesso accettato)

Puntatore utente:
- Pallino → posizione
- Freccia → direzione (solo con movimento affidabile)
- NON mostrare freccia con GPS instabile

Zoom vs raggio:
- Zoom mappa e raggio eventi sono indipendenti
- Il raggio determina il dataset, NON la viewport

Architettura:
- La logica GEO è nel controller
- Il rendering è isolato in createMappaMap
- La mappa è sostituibile (Leaflet → MapLibre)

### EVENT SELECTION RULES (VINCOLANTI)

Contesto:
La selezione evento è uno stato secondario rispetto alla mappa.

Regole obbligatorie:

1. ATTIVAZIONE
- la selezione evento può avvenire SOLO tramite:
  - tap su marker
  - interazione esplicita utente

2. DIVIETO AUTO-OPEN
- è vietato aprire automaticamente la chat evento da:
  - ricerca
  - filtri
  - load dataset

3. RESET OBBLIGATORIO
La selezione evento deve essere resettata su:
- attivazione Vicino a me
- attivazione Seguimi
- pan/zoom manuale mappa
- nuova ricerca
- applicazione filtri

4. CHIUSURA MANUALE
- deve sempre esistere un'azione esplicita per chiudere l’evento selezionato

5. GERARCHIA
- mappa = livello primario
- evento selezionato = livello secondario
- chat = livello terziario

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

Le chat V2 sono ora reattive tramite 
polling intelligente.

---


### ROOMS
- polling attivo
- delta backend tramite `after`
- merge incrementale dei nuovi messaggi
- focus corretto sul messaggio più recente
- composer stabile su mobile
- `markRead` coerente con `createdAt`

---


### MESSAGES
- polling attivo solo sul thread corrente
- stop/reset su cambio thread, tab nascosto e pagehide
- delta backend tramite `after`
- merge incrementale dei nuovi messaggi
- lista thread aggiornata in background
- composer non bloccante
- focus corretto sull’ultimo messaggio

---

  
### Ordinamento messaggi
Tutte le chat V2 devono visualizzare i messaggi in ordine cronologico crescente:

vecchi sopra
nuovi sotto

---

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

# 📐 VIEWPORT SYSTEM V2

Tutta l’Area Partecipante V2 e le pagine di secondo livello V2 devono usare il token unico:

--gw-app-viewport-h

---

# 🔤 FONT SYSTEM V2

Nessuna area V2 deve definire font locali hardcoded.

Vietato:

font-family: Arial, sans-serif;
font-family: Inter, Arial, Helvetica, sans-serif;

---


# 💬 COMPOSER CHAT V2

Tutti i composer chat V2 devono seguire lo standard unico:

- input pill
- bottone invio circolare compatto
- label non visibile, solo accessibilità tramite `sr-only`
- nessun bottone testuale “Invia” largo
- nessun uso di classi generiche legacy come `gw-btn-primary`

Schema UI:


[input messaggio] [send icon]

---
# 🔔 TRILLI — REGOLE ARCHITETTURALI (VINCOLANTI)

Contesto:
I Trilli sono una feature futura core del sistema.

Definizione:
- Trillo = evento live geolocalizzato
- Notifica = archivio persistente

Regole obbligatorie:

1. SEPARAZIONE SISTEMI
- Trilli NON fanno parte del sistema notifiche base
- Trilli possono GENERARE notifiche, ma non sono notifiche

2. DIVIETO FRONTEND
- è vietato implementare logica trilli lato client
- è vietato:
  - invio trilli da frontend partecipante
  - calcolo target utenti lato client

3. SERVER AUTHORITY
- tutta la logica trilli deve essere:
  - server-side
  - validata
  - auditabile

4. PRIVACY
- è vietato esporre:
  - posizione utenti
  - distanza precisa
  - identità utenti target

5. INTEGRAZIONE FUTURA
- trilli → toast/banner live
- trilli → notifiche persistenti
- trilli → check-in (source: "trill")
- trilli → promo QR

6. VINCOLO TEMPORALE
- trilli validi solo su eventi con:
  - dateStart
  - dateEnd
- nessun fallback per eventi senza dateEnd

7. IMPLEMENTAZIONE
- vietato inserire trilli nel legacy
- sviluppo solo dopo:
  - Organizer V2
  - Admin V2

# 🏁 CONCLUSIONE


Questo file è vincolante.
