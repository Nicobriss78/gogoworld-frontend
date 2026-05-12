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
- Nessun `alert()` / `confirm()` nelle aree V2 hardenizzate
• Apertura reale dei file obbligatoria
• Verifica profonda del codice reale prima di patch
• Vietato ragionare “a memoria”
• Vietato proporre ancore ipotizzate
---

# 🧠 PRINCIPI ARCHITETTURALI

- Stato > UI
- Dataset coerente
- Lifecycle controllato

## 🧭 GERARCHIA PAGINE V2 (VINCOLANTE)

Le pagine V2 devono essere divise in:

### Primo livello
Pagine principali area.

Devono usare:
- shell area
- topbar
- bottomnav
- bootstrap area
- registry/nav ufficiali

Esempi:
- Home V2
- Mappa V2
- Organizer Dashboard V2
- Organizer Events V2
- Organizer Trills V2

### Secondo livello
Pagine immersive / operative.

NON devono usare:
- bottomnav
- bootstrap shell completo

Devono usare:
- `checkAccess()` diretto
- controller dedicato
- struttura autonoma
- back contestuale

Esempi:
- evento-v2
- messages-v2
- organizer-event-detail-v2
- organizer-event-access-v2
- organizer-event-create-v2
- organizer-event-edit-v2
- organizer-trill-create-v2

Questa regola è vincolante per:
- Partecipante V2
- Organizer V2
- futura Admin V2
  
## 📌 BACKEND-FIRST (ESTENSIONE)

Le nuove feature devono essere sviluppate:

- prima backend
- poi test API reale
- solo dopo frontend

È vietato partire dal frontend.

Il sistema Trilli è il caso di riferimento.
---

---

🌍 GEOLOCATION / GEOCODE RULES (VINCOLANTI)

Contesto:
La geolocalizzazione eventi dell’Organizer V2 è un sistema backend-first.

Obiettivo:
gestire:

- ricerca luogo evento
- coordinate evento
- reverse geocoding
- future geo-features

senza dipendere direttamente da provider esterni nel frontend.

---

1. BACKEND AUTHORITY

Tutte le richieste geocode/reverse-geocode devono passare dal backend.

È vietato:

- chiamare OpenStreetMap/Nominatim dal frontend
- esporre provider esterni direttamente al client
- salvare logica provider nella UI

Il backend è l’unica authority.

---

2. SEPARAZIONE RESPONSABILITÀ

Backend:

- routes
- controllers
- services

Frontend:

- api layer
- controller UI
- renderer UI

È vietato:

- fare parsing provider nel renderer
- mischiare fetch e rendering
- inserire logica provider nella UI

---

3. SEARCH vs REVERSE GEOCODE

SEARCH:
→ testo → coordinate

Esempi:

- nome luogo + città
- indirizzo + città

REVERSE GEOCODE:
→ coordinate → dati luogo

Esempi:

- GPS browser
- “Usa la mia posizione”

Sono due flussi distinti.

---

4. COMPILAZIONE CAMPI

La compilazione automatica deve essere:

opportunistica e affidabile.

Il sistema può compilare:

• coordinate
• città
• provincia
• regione
• paese

⚠️ CAP NON auto-compilato

Decisione definitiva:

Il CAP resta manuale
perché i provider geografici
non sono sufficientemente affidabili
sul postalCode.

Può compilare:

- venueName
- street
- streetNumber

solo se realmente presenti e affidabili nella risposta provider.

È vietato:

- inventare dati
- inferire nomi attività
- forzare parsing non affidabili

---

5. PROVIDER LIMITS

I limiti dei provider geocode devono essere considerati normali.

Esempio:

- ricerca:
  - nome attività + sola regione

può NON essere affidabile.

È vietato:

- introdurre fallback casuali multipli
- degradare ranking risultati
- peggiorare UX stabile

---

6. RATE LIMIT OBBLIGATORIO

Tutti gli endpoint geocode devono avere:

- rate limit dedicato
- validazione input
- sanitizzazione query
- gestione errori controllata

---

7. FUTURA COMPATIBILITÀ

La struttura geocode deve restare compatibile con:

- check-in
- mappe V2
- geo-targeting
- Trilli
- promo geolocalizzate
- futura Mappa Organizer V2

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
Il sistema Trilli è una feature core del sistema GoGoWorld.life.

Stato attuale:
- Backend COMPLETAMENTE IMPLEMENTATO
- Notifiche integrate
- Moderazione admin attiva
- Test reale API completato
- UI Organizer V2 base implementata e testata
- Creazione bozza Trillo da dettaglio evento funzionante
- Lista Trilli Organizer funzionante
- Invio Trillo da Organizer V2 funzionante
- Stato Trillo aggiornato correttamente (`draft → sent`)

Definizione:
- Trillo = evento live contestuale e temporaneo
- Notifica = archivio persistente

---

## 1. SEPARAZIONE SISTEMI

- Trilli NON fanno parte del sistema notifiche base
- Trilli possono GENERARE notifiche, ma non sono notifiche
- Notification = storage
- Trill = trigger/evento live

---

## 2. SERVER AUTHORITY (OBBLIGATORIO)

Tutta la logica Trilli deve essere:

- server-side
- validata
- auditabile

È vietato:

- calcolo target lato client
- invio Trilli dal frontend partecipante
- qualsiasi logica decisionale lato UI

---

## 3. BACKEND-FIRST (REGOLA UFFICIALE)

Le feature devono seguire questo ordine:

1. Backend completo
2. Test reale API
3. Solo dopo → integrazione frontend

Il sistema Trilli è il riferimento ufficiale di questo approccio.

---

## 4. PRIVACY

È vietato esporre:

- posizione utenti
- distanza precisa
- identità utenti target
  
---

## 4.5 CONSENSO POSIZIONE (FUTURO TRILLI GEO V2)

Il futuro geo-targeting reale:

• deve usare solo utenti con consenso posizione attivo
• non deve usare tracking occulto
• non deve esporre posizione reale utenti
• deve restare privacy-safe
• deve lavorare per fasce distanza aggregate

---

## 5. TARGETING (STATO ATTUALE)

Stato reale:
🟡 Trilli V1 / V1.5 consolidata

Attualmente:

• interested_not_checked_in
→ utenti partecipanti senza check-in

• nearby
→ fallback utenti participant
(NON geolocalizzato reale)

• both
→ combinazione dei due

radiusMeters:
• viene salvato
• NON governa ancora
un calcolo geografico reale.

⚠️ Geo-targeting reale NON ancora implementato

NON ancora presente:

• distanza reale utente ↔ evento
• targeting per fasce distanza
• distanceBand reale
• metriche geo
• consenso posizione/privacy

---

## 6. VINCOLO TEMPORALE

I Trilli sono validi solo se:

- evento approvato
- evento con `dateStart` e `dateEnd`
- finestra:
  - da 2 ore prima di `dateStart`
  - fino a `dateEnd`

---

## 7. MODERAZIONE

- Admin può bloccare un Trillo
- Trillo bloccato NON è inviabile
- Stato `blocked` ha priorità assoluta

---

## 8. INTEGRAZIONE FUTURA

I Trilli verranno integrati con:

- UI Organizer V2
- UI Partecipante (toast/banner live)
• Trilli Geo V2 / Targeting geografico avanzato
Obiettivo:

• distanza reale utente-evento
• targeting per fasce distanza
• distanceBand reale
• metriche geo
• targeting privacy-aware
• futura integrazione Promo QR
- promo QR
- sistema crediti (free / pro / promo)

---

## 9. VINCOLO FRONTEND

- Nessuna UI Trilli deve essere implementata nel legacy.
- La UI Trilli deve vivere solo nella nuova Area Organizer V2 e, in futuro, nelle aree V2 coerenti.
- È vietato creare varianti legacy o doppioni paralleli.
- Il frontend Organizer V2 può:
  - creare draft Trillo tramite backend
  - mostrare lista Trilli dell’organizzatore
  - inviare Trilli tramite endpoint backend autorizzato
- Il frontend Organizer V2 NON deve:
  - calcolare target utenti
  - decidere destinatari
  - bypassare validazioni temporali
  - esporre identità o posizione utenti target

### Stato Organizer V2 attuale

Organizer V2 attualmente include:

Primo livello:
- organizer-dashboard-v2
- organizer-events-v2
- organizer-trills-v2

Secondo livello:
- organizer-event-create-v2
- organizer-event-edit-v2
- organizer-event-detail-v2
- organizer-event-access-v2
- organizer-trill-create-v2

Stato:
- renderer hardenizzati
- controller hardenizzati
- loading state presenti
- gestione azioni concorrenti presente
- blocco doppio click presente
- nessun `alert()` / `confirm()`
- bootstrap Organizer pulito e limitato al primo livello

## ⚠️ CRITICITÀ NOTE NON BLOCCANTI

### messages-v2 / Organizer

Stato:
• apertura room Organizer funzionante
• verificare definitivamente:
  organizer → room/messages-v2 → Torna
• verificare gestione rootReturnTo
• verificare eventuali edge case Netlify/404

Criticità:
🟡 da validare sul backup reale attuale
prima di considerare il problema chiuso.

# 🏁 CONCLUSIONE


Questo file è vincolante.
