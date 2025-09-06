// js/login.js — gestione Login
// TODO UI/UX Overhaul:
// - Sostituire showAlert() con componente notifiche standard (gwNotify)
// - Validazione form con messaggi inline sotto i campi (accessibile, aria-live)
// - Pulsante con stato "loading" e spinner coerente

import { apiPost, apiGet } from "./api.js";

// Banner messaggi (error/success) con auto-hide opzionale
function showAlert(message, type = "error", opts = {}) {
  const { autoHideMs = 0 } = opts;
  const main = document.querySelector("main") || document.body;
  let box = document.getElementById("alertBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "alertBox";
    box.className = "alert";
    main.prepend(box);
  }
  // Allineamento con style.css: usa classi .alert.error / .alert.success / .alert.info
  const t = type === "success" ? "success" : type === "error" ? "error" : "info";
  box.className = `alert ${t}`;
  box.textContent = message;

  if (autoHideMs > 0) {
    setTimeout(() => {
      if (box && box.parentNode) box.parentNode.removeChild(box);
    }, autoHideMs);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const btnRegister = document.getElementById("goRegister");
  const btnHome = document.getElementById("goHome");

  if (btnRegister) {
    btnRegister.addEventListener("click", () => {
      window.location.href = "pages/register.html";
    });
  }
  if (btnHome) {
    btnHome.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  // Ricava ruolo desiderato (tollerante IT/EN) e restituisce sempre EN
  function getDesiredRole() {
    const r = sessionStorage.getItem("desiredRole");
    // Normalize: accept both IT and EN, return EN only
    if (r === "organizzatore" || r === "organizer") return "organizer";
    if (r === "partecipante" || r === "participant") return "participant";
    return "participant";
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const email = (fd.get("email") || "").toString().trim();
    const password = (fd.get("password") || "").toString().trim();

    if (!email || !password) {
      showAlert("Inserisci email e password", "error", { autoHideMs: 3000 });
      return;
    }

    try {
      const res = await apiPost("/users/login", { email, password });

      // FIX CHIRURGICO:
      // Il wrapper API ritorna { ok:false, error } SOLO in caso di errore.
      // In successo ritorna il payload puro (senza 'ok').
      // Consideriamo errore SOLO se ok === false oppure se manca il token.
      if ((res?.ok === false) || !res?.token) {
        showAlert(res?.error || "Credenziali non valide", "error", { autoHideMs: 4000 });
        return;
      }

      // Salva token
      localStorage.setItem("token", res.token);

      // Ruolo richiesto dalla sessione (se presente)
      const hadDesired = !!sessionStorage.getItem("desiredRole");
      const roleRequested = getDesiredRole();

      // Notifica BE del ruolo richiesto (persistente)
      await apiPost("/users/session-role", { role: roleRequested }, res.token);

      // Recupera profilo per conoscere canOrganize
      const me = await apiGet("/users/me", res.token);
      if (!me || me.ok === false) {
        showAlert("Errore nel recupero profilo", "error", { autoHideMs: 4000 });
        return;
      }

      // PATCH: redirect amministratore diretto dopo login
      if (String(me?.role || me?.user?.role || "").toLowerCase() === "admin") {
        window.location.href = "admin.html";
        return;
      }

      // Se non c'è un desiredRole già scelto prima (homepage 0),
      // imposta automaticamente il default in base a canOrganize
      let redirectRole = roleRequested;
      if (!hadDesired) {
        const defaultRole = me?.canOrganize ? "organizer" : "participant";
        sessionStorage.setItem("desiredRole", defaultRole);
        // Allinea il BE al default dedotto
        await apiPost("/users/session-role", { role: defaultRole }, res.token);
        redirectRole = defaultRole;
      }

      // Se vogliamo entrare in organizer ma l'utente non è ancora abilitato, abilitalo adesso (Opzione B)
      if (redirectRole === "organizer" && me?.canOrganize !== true) {
        const en = await apiPost("/users/me/enable-organizer", {}, res.token);
        if (en?.ok === false) {
          showAlert(en?.error || "Impossibile abilitare la modalità organizzatore", "error", { autoHideMs: 5000 });
          return;
        }
      }

      // Redirect finale
      if (redirectRole === "organizer") {
        window.location.href = "organizzatore.html";
      } else {
        window.location.href = "partecipante.html";
      }
    } catch (err) {
      showAlert("Errore di rete o server non raggiungibile", "error", { autoHideMs: 4000 });
    }
  });
});



