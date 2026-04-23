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

---

## LIFECYCLE
- Evito doppio bootstrap? [ ]
- Evito load duplicati? [ ]

---

## UI
- Topbar mount presente? [ ]
- Bottom nav fixed? [ ]

---

## SICUREZZA
- Nessuna logica sensibile lato client? [ ]
- Nessun bypass backend? [ ]

---

## TEST
- Ho definito test prima della patch? [ ]

---

## REGOLA
Se qualcosa è dubbio → STOP
