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
    box.setAttribute("role", "status");
    box.setAttribute("aria-live", "polite");
  }
  // Allineamento con style
  const t = type === "success" ? "success" : type === "error" ? "error" : "info";
  box.className = `alert ${t}`;
  box.textContent = message;

  if (autoHideMs > 0) {
    if (box._hideTimer) clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
      if (box && box.parentNode) box.parentNode.removeChild(box);
    }, autoHideMs);
  }
}

// desiredRole utility
function getDesiredRole() {
  try {
    const role = sessionStorage.getItem("desiredRole");
    return role === "organizer" ? "organizer" : "participant";
  } catch {
    return "participant";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const btnRegister = document.getElementById("goRegister");
  const btnHome = document.getElementById("goHome");

btnRegister?.addEventListener("click", (e) => {
    e.preventDefault();
    // Evita redirect automatici dalla pagina di registrazione se sei già loggato
    try {
      localStorage.removeItem("token");
      sessionStorage.removeItem("desiredRole");
    } catch {}
    window.location.href = "register.html";
  });
  btnHome?.addEventListener("click", (e) => { e.preventDefault(); window.location.href = "index.html"; });


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

    const btnSubmit = form.querySelector('button[type="submit"]');
    if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.dataset.loading = "1"; }

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

      // (RIMOSSO) Notifica persistente al BE del ruolo richiesto
      // await apiPost("/users/session-role", { role: roleRequested }, res.token);

      // Chi sono?
      let me = null;
      try {
        me = await apiGet("/users/me", res.token);
      } catch {
        // ignora
      }

      if (!me || me?.ok === false) {
        showAlert(me?.error || "Impossibile recuperare il profilo utente", "error", { autoHideMs: 4000 });
        return;
      }
      // Admin: vai direttamente al pannello admin
      const role = (me?.role || "").toLowerCase();
      if (role === "admin") { window.location.href = "admin.html"; return; }
      // Se non c'è un desiredRole già scelto prima (homepage 0),
      // imposta automaticamente il default in base a canOrganize
      let redirectRole = roleRequested;
      if (!hadDesired) {
        const defaultRole = me?.canOrganize ? "organizer" : "participant";
        sessionStorage.setItem("desiredRole", defaultRole);
        // (RIMOSSO) Allinea il BE al default dedotto
        // await apiPost("/users/session-role", { role: defaultRole }, res.token);
        redirectRole = defaultRole;
      }

    // Se vogliamo entrare in organizer ma l'utente non è ancora abilitato, abilitalo adesso (Opzione B)
if (redirectRole === "organizer" && me?.canOrganize !== true) {
  showAlert("Non sei abilitato come organizzatore. Accedi come partecipante.", "info", { autoHideMs: 4000 });
  redirectRole = "participant";
}

      // Redirect finale
      if (redirectRole === "organizer") {
        window.location.href = "organizzatore.html";
      } else {
        window.location.href = "partecipante.html";
      }
    } catch (err) {
      showAlert("Errore di rete o server non raggiungibile", "error", { autoHideMs: 4000 });
    } finally {
      const btnSubmit = form.querySelector('button[type="submit"]');
      if (btnSubmit) { btnSubmit.disabled = false; btnSubmit.dataset.loading = ""; }
    }
  });
});







