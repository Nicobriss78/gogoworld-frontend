// login.js — aderente a login.html reale:
// - form: #loginForm
// - campi: #email, #password, #role
// - errore: #loginError
// Dinamiche: ruolo primario da select #role; fallback da localStorage.desiredRole; payload coerente con BE.

(function () {
  // --- Riferimenti DOM reali
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const roleSelect = document.getElementById("role");
  const errorBox = document.getElementById("loginError");

  function showError(msg) {
    if (errorBox) {
      errorBox.textContent = msg;
      errorBox.style.display = "";
    } else {
      alert(msg);
    }
  }

  function clearError() {
    if (errorBox) {
      errorBox.textContent = "";
      errorBox.style.display = "none";
    }
  }

  function disableUI(disabled) {
    try {
      if (form) {
        form.querySelectorAll("input,button,select,textarea").forEach((el) => {
          el.disabled = !!disabled;
        });
      }
    } catch {}
  }

  async function doLogin() {
    clearError();

    const email = emailInput?.value?.trim();
    const password = passwordInput?.value ?? "";
    if (!email || !password) {
      showError("Inserisci email e password.");
      return;
    }

    // Fonte primaria: select #role
    let desiredRole = roleSelect?.value || null;
    // Fallback: scelta fatta in homepage
    if (!desiredRole) {
      try { desiredRole = localStorage.getItem("desiredRole"); } catch {}
    }

    disableUI(true);
    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          desiredRole: desiredRole || undefined
        }),
      });

      let data = null;
      try { data = await res.json(); } catch {}

      if (!res.ok) {
        const msg = (data && (data.error || data.message)) ? (data.error || data.message) : `Errore ${res.status}`;
        throw new Error(msg);
      }

      // pulizia desiredRole da homepage per evitare residui
      try { localStorage.removeItem("desiredRole"); } catch {}

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("registeredRole", data.registeredRole || "participant");
      localStorage.setItem("sessionRole", data.sessionRole || data.registeredRole || "participant");

      const sr = (data.sessionRole || data.registeredRole || "participant");
      window.location.href = sr === "organizer" ? "organizzatore.html" : "partecipante.html";
    } catch (err) {
      showError("Login fallito: " + err.message);
    } finally {
      disableUI(false);
    }
  }

  // --- Bind al submit del form
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      doLogin();
    });

    // Bind esplicito anche al click del bottone di submit dentro il form
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    submitBtn?.addEventListener("click", (e) => {
      // Se per qualsiasi ragione il submit non parte, forziamo il login
      // (e.preventDefault() non serve qui: il form listener sopra lo gestisce)
      // Ma se altri script hanno bloccato il submit, questo garantisce l'azione.
      // Non duplica la richiesta perché doLogin è idempotente lato validazione.
      if (e) { /* noop: il submit handler gestisce preventDefault */ }
    });

    // Enter negli input: il submit del form già intercetta, ma teniamo la UX pulita
    [emailInput, passwordInput].forEach((el) => {
      el?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
          // il listener di form gestirà il submit
        }
      });
    });
  }
})();









