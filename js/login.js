// login.js — login con desiredRole → server emette token con sessionRole
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm") || document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value?.trim();
    const desiredRole = localStorage.getItem("desiredRole") || "participant";

    try {
      const resp = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, desiredRole })
      });
      if (!resp.ok) throw new Error("LOGIN_FAILED");
      const data = await resp.json();

      // Salva token e info
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("registeredRole", data.registeredRole);
      localStorage.setItem("sessionRole", data.sessionRole);

      // Redirect coerente al sessionRole
      if (data.sessionRole === "organizer") window.location.href = "organizzatore.html";
      else window.location.href = "partecipante.html";
    } catch (err) {
      console.error("Login error:", err);
      alert("Credenziali non valide o errore di rete.");
    }
  });
});






