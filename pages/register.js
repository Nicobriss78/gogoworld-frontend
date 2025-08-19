// GoGo.World — register.js aggiornato (Fase 0)
// Usa window.API per registrazione e login automatico

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const role = document.getElementById("role").value; // organizzatore o partecipante

    try {
      // Registrazione
      const regData = await API.users.register({ name, email, password, role });

      if (!regData || !regData.ok) {
        alert("Errore durante la registrazione.");
        return;
      }

      // Login automatico subito dopo registrazione
      const loginData = await API.users.login(email, password, role);

      if (!loginData || !loginData.token) {
        alert("Registrazione completata, ma errore login automatico.");
        return;
      }

      // Salvataggio token e info utente
      API.setToken(loginData.token);
      localStorage.setItem("userId", loginData.userId || "");
      if (loginData.role) localStorage.setItem("role", loginData.role);
      if (loginData.currentRole) localStorage.setItem("currentRole", loginData.currentRole);

      // Redirect in base al ruolo
      const roleToGo = loginData.currentRole || loginData.role;
      if (roleToGo === "organizer") {
        window.location.href = "../organizzatore.html";
      } else if (roleToGo === "participant") {
        window.location.href = "../partecipante.html";
      } else {
        window.location.href = "../index.html";
      }
    } catch (err) {
      console.error("Errore registrazione:", err);
      let msg = "Errore di rete o dati non validi.";
      if (err && err.error) msg = err.error;
      alert(msg);
    }
  });
});




