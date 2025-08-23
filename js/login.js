// login.js — login con ruolo SOLO di sessione (preso da homepage 0)
// Flusso:
// 1) submit email+password -> POST /api/users/login
// 2) legge desiredRole da storage (default "participant")
// 3) POST /api/users/session-role { role } -> salva token/ruolo
// 4) redirect alla pagina del ruolo scelto

(function () {
  const form = document.getElementById("loginForm");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const errorBox = document.getElementById("loginError");
  const homeBtn = document.getElementById("homeBtn");

  function showError(msg) {
    if (!errorBox) return;
    errorBox.textContent = msg || "Errore imprevisto";
    errorBox.style.display = "block";
  }
  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.style.display = "none";
  }

  function getDesiredRole() {
    try {
      // Preferisci sessionStorage (scelta appena fatta), poi localStorage; default participant
      return sessionStorage.getItem("desiredRole")
          || localStorage.getItem("desiredRole")
          || "participant";
    } catch {
      return "participant";
    }
  }

  function rememberAuth({ token, user }) {
    try {
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("ggw_token", token); // compat con api.js
      }
      if (user && user._id) localStorage.setItem("userId", user._id);
      if (user && user.email) localStorage.setItem("userEmail", user.email);
    } catch {}
  }

  function setSessionRole(role) {
    const r = role === "organizer" ? "organizer" : "participant";
    return fetch("/api/users/session-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token") || localStorage.getItem("ggw_token") || ""}`
      },
      body: JSON.stringify({ role: r })
    }).then(async res => {
      if (!res.ok) {
        const t = await res.json().catch(() => ({}));
        throw new Error(t.message || `Errore session-role (${res.status})`);
      }
      const data = await res.json().catch(() => ({}));
      // Se il backend restituisce un nuovo token di sessione, salvalo
      if (data && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("ggw_token", data.token);
      }
      localStorage.setItem("sessionRole", r);
      return r;
    });
  }

  function redirectByRole(role) {
    if (role === "organizer") location.href = "organizzatore.html";
    else location.href = "partecipante.html";
  }

  if (homeBtn) {
    homeBtn.addEventListener("click", () => { location.href = "index.html"; });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearError();

      const email = emailInput?.value?.trim();
      const password = passwordInput?.value || "";

      if (!email || !password) {
        showError("Inserisci email e password.");
        return;
      }

      try {
        // 1) Login
        const res = await fetch("/api/users/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        if (!res.ok) {
          const t = await res.json().catch(() => ({}));
          throw new Error(t.message || "Credenziali non valide");
        }
        const data = await res.json().catch(() => ({}));
        rememberAuth(data);

        // 2) Imposta ruolo di sessione
        const desired = getDesiredRole();
        const sessionRole = await setSessionRole(desired);

        // 3) Redirect
        redirectByRole(sessionRole);
      } catch (err) {
        showError(err.message || "Errore di autenticazione");
      }
    });
  }
})();











