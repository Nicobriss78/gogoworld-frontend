// js/register.js — registrazione (coerenza: niente auto-login)
// TODO UI/UX Overhaul:
// - Validazione client-side con messaggi inline per ciascun campo
// - Feedback di successo con redirect temporizzato e toast informativo
// - Accessibilità: aria-invalid, aria-describedby, focus management

import { apiPostOnce } from "./api.js";

// Banner messaggi (error/success) con auto-hide opzionale
function showAlert(message, type = "error", opts = {}) {
  const { autoHideMs = 0 } = opts;
  const main = document.querySelector("main") || document.body;
  let box = document.getElementById("alertBox");
  if (!box) {
    box = document.createElement("div");
    box.id = "alertBox";
    main.prepend(box);
  }
  const t = type === "success" ? "success" : type === "error" ? "error" : "info";
  box.className = `alert ${t}`;
  box.textContent = message;

  if (autoHideMs > 0) {
    if (box._hideTimer) clearTimeout(box._hideTimer);
    box._hideTimer = setTimeout(() => {
      if (box && box.parentNode) box.parentNode.removeChild(box);
    }, autoHideMs);
  }
  try { box.scrollIntoView({ block: "start", behavior: "smooth" }); } catch {}
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const goHome = document.getElementById("goHome");

  if (goHome) {
    goHome.addEventListener("click", () => {
      window.location.href = "../index.html";
    });
  }

  if (!form) return;

  // FE-PKT-04: lock locale durante il submit e dopo esito ambiguo/confermato.
  let registerInFlight = false;
  let registerOutcomeUncertain = false;
  let registerCompleted = false;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (registerInFlight || registerOutcomeUncertain || registerCompleted) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    registerInFlight = true;
    if (submitBtn) submitBtn.disabled = true;

    const name = document.getElementById("name")?.value?.trim() || "";
    const email = document.getElementById("email")?.value?.trim() || "";
    const password = document.getElementById("password")?.value?.trim() || "";
    const role = document.getElementById("role")?.value?.trim() || "participant";

    // Il raccordo a DEC-011 (account unico) è separato dal packet email.
    // FE-PKT-04 non cambia il campo role né abilita la modalità Organizer.
    if (name.length < 2 || name.length > 50 || !email || password.length < 8 || password.length > 72) {
      showAlert("Controlla nome (2–50 caratteri), email e password (8–72 caratteri).", "error");
      registerInFlight = false;
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    try {
      // Una sola POST, senza retry e senza inoltrare credenziali di sessione.
      const res = await apiPostOnce("/users", { name, email, password, role }, "");

      if (res?.ok === true && res.status === 201 && res._id) {
        registerCompleted = true;
        const status = res.verificationEmailStatus;
        const message = status === "requested"
          ? "Account creato. La richiesta di invio del link di verifica è stata accettata; la consegna non è ancora confermata. Ora puoi accedere."
          : status === "pending"
            ? "Account creato. L'invio del link di verifica è in attesa o non confermato. Accedi per controllare lo stato e richiedere un nuovo link se necessario."
            : "Account creato. Lo stato di invio dell'email non è confermato. Accedi per verificare lo stato del tuo account.";
        showAlert(message, "success");
        try { form.reset(); } catch (_) {}
        try { sessionStorage.setItem("postLoginRedirect", "/pages/home-v2.html"); } catch (_) {}
        setTimeout(() => { window.location.href = "../login.html"; }, 3800);
        return;
      }

      if (res?.status === 400 || res?.status === 409) {
        showAlert("Registrazione non confermata. Controlla i dati o verifica se esiste già un account con questa email.", "error");
      } else if (res?.status === 429) {
        showAlert("Troppe richieste. Riprova più tardi, senza inviare ripetutamente il modulo.", "error");
      } else if (res?.status === 0 || res?.status >= 500 || res?.status === 201 || !res) {
        // La risposta può essere persa dopo la creazione dell'account.
        // Non sbloccare il submit per un nuovo tentativo nello stesso caricamento.
        registerOutcomeUncertain = true;
        showAlert("Esito non confermato: l'account potrebbe essere stato creato. Verifica prima se puoi accedere o se hai ricevuto il link. Evita una seconda registrazione.", "info");
      } else {
        showAlert("Non è stato possibile confermare la registrazione. Controlla i dati prima di riprovare.", "error");
      }
    } catch (_) {
      registerOutcomeUncertain = true;
      showAlert("Esito non confermato: la richiesta potrebbe essere stata elaborata. Controlla prima lo stato dell'account e non ripetere subito la registrazione.", "info");
    } finally {
      registerInFlight = false;
      if (submitBtn) submitBtn.disabled = registerCompleted || registerOutcomeUncertain;
    }
  });
});

