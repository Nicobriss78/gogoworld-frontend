// pages/register.js — GoGo.World — Fase 6
// Allinea il flow della registrazione a quello del login:
// 1) POST /api/users/register -> salva token
// 2) set sessionRole in base a desiredRole (homepage 0) -> POST /api/users/session-role
// 3) redirect nell’area corretta

(function () {
  // --- helpers
  const $ = (sel, root) => (root || document).querySelector(sel);
  function getDesiredRole() {
    try {
      return sessionStorage.getItem("desiredRole") ||
             localStorage.getItem("desiredRole") ||
             "participant";
    } catch { return "participant"; }
  }
  function showError(msg) {
    const box = $("#registerError");
    if (!box) { alert(msg || "Errore di registrazione"); return; }
    box.textContent = msg || "Errore di registrazione";
    box.style.display = "block";
  }
  function clearError() {
    const box = $("#registerError");
    if (box) { box.textContent = ""; box.style.display = "none"; }
  }
  function redirectByRole(role) {
    if (role === "organizer") location.href = "/organizzatore.html";
    else location.href = "/partecipante.html";
  }

  // Campo robusto: prova id comuni e name=*
  function pickInput(candidates) {
    for (const sel of candidates) {
      const el = $(sel);
      if (el) return el;
    }
    return null;
  }

  // --- DOM
  const form = $("#registerForm") || $("form");
  const nameInput = pickInput(["#name", "#nome", "#displayName", "#username", "[name='name']", "[name='nome']", "[name='displayName']", "[name='username']"]);
  const emailInput = pickInput(["#email", "[name='email']"]);
  const pwdInput = pickInput(["#password", "#pwd", "[name='password']"]);
  const roleSelect = pickInput(["#role", "#ruolo", "[name='role']", "[name='ruolo']"]);

  if (!form) {
    // Se il form non c'è, non facciamo nulla per evitare errori runtime
    console.warn("register.js: form non trovato");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();

    const name = (nameInput?.value || "").trim();
    const email = (emailInput?.value || "").trim().toLowerCase();
    const password = pwdInput?.value || "";
    const registeredRole = (roleSelect?.value || "").toLowerCase();
    const desired = getDesiredRole(); // preso da homepage 0 (solo sessione)

    if (!name || !email || !password) {
      showError("Nome, email e password sono obbligatori.");
      return;
    }

    try {
      // 1) Registrazione
      const payload = { name, email, password };
      if (registeredRole) payload.role = registeredRole;

      let data;
      if (window.API?.post) {
        data = await window.API.post("/api/users/register", { body: payload, auth: false });
      } else {
        const res = await fetch("/api/users/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const t = await res.json().catch(() => ({}));
          throw new Error(t.message || `Registrazione fallita (${res.status})`);
        }
        data = await res.json();
      }

      // salva token + info utente
      try {
        const token = data?.token || "";
        if (window.API?.setToken && token) window.API.setToken(token);
        if (token) {
          localStorage.setItem("token", token);
          localStorage.setItem("ggw_token", token);
        }
        if (data?.user?._id) localStorage.setItem("userId", data.user._id);
        if (data?.user?.email) localStorage.setItem("userEmail", data.user.email);
      } catch {}

      // 2) Session role (solo di sessione)
      const sessionRole = desired === "organizer" ? "organizer" : "participant";
      try {
        let sr;
        if (window.API?.post) {
          sr = await window.API.post("/api/users/session-role", { body: { role: sessionRole }, auth: true });
        } else {
          const res2 = await fetch("/api/users/session-role", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${localStorage.getItem("token") || localStorage.getItem("ggw_token") || ""}`
            },
            body: JSON.stringify({ role: sessionRole }),
          });
          if (!res2.ok) {
            const t2 = await res2.json().catch(() => ({}));
            throw new Error(t2.message || `Errore session-role (${res2.status})`);
          }
          sr = await res2.json();
        }
        if (sr?.token) {
          localStorage.setItem("token", sr.token);
          localStorage.setItem("ggw_token", sr.token);
        }
        localStorage.setItem("sessionRole", sessionRole);
      } catch (err) {
        // Anche se fallisse, proviamo comunque a proseguire: il resto del FE tenterà di rimediare
        console.warn("Impostazione sessionRole non riuscita:", err?.message || err);
      }

      // 3) Redirect area corretta
      redirectByRole(sessionRole);
    } catch (err) {
      showError(err.message || "Errore di registrazione");
    }
  });
})();








