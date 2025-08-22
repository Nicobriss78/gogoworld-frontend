// login.js — login e memorizzazione ruoli
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
      const res = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error("Credenziali non valide");
      const data = await res.json();

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("registeredRole", data.registeredRole || "participant");
      localStorage.setItem("sessionRole", data.sessionRole || data.registeredRole || "participant");

      if (data.sessionRole === "organizer") {
        window.location.href = "organizzatore.html";
      } else {
        window.location.href = "partecipante.html";
      }
    } catch (err) {
      alert("Login fallito: " + err.message);
    }
  });
});








