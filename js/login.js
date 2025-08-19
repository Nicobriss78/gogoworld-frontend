// GoGo.World — login.js aggiornato (Fase 0)
// Usa window.API (api.js) per chiamate API con endpoint relativi

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const desiredRole = document.getElementById("role").value; // select ruolo login

    try {
      const data = await API.users.login(email, password, desiredRole);

      // Risposta attesa dal backend:
      // { token, userId, role, currentRole }
      if (!data || !data.token) {
        alert("Errore login: risposta non valida dal server");
        return;
      }

      // Salvataggio token e info utente
      API.setToken(data.token);
      localStorage.setItem("userId", data.userId || "");
      if (data.role) localStorage.setItem("role", data.role);
      if (data.currentRole) localStorage.setItem("currentRole", data.currentRole);

      // Redirect in base al ruolo attivo
      const roleToGo = data.currentRole || data.role;
      if (roleToGo === "organizer") {
        window.location.href = "organizzatore.html";
      } else if (roleToGo === "participant") {
        window.location.href = "partecipante.html";
      } else {
        // fallback guest → redirect a home
        window.location.href = "index.html";
      }
    } catch (err) {
      console.error("Login error:", err);
      let msg = "Errore di rete o credenziali non valide.";
      if (err && err.error) msg = err.error;
      alert(msg);
    }
  });
});




