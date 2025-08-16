// public/js/login.js

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const response = await fetch("https://gogo-world-backend.onrender.com/api/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("name", data.user.name);

      // reset desiredRole per evitare loop
      localStorage.removeItem("desiredRole");

      alert("Login effettuato con successo!");
      if (data.user.role === "Organizzatore") {
        window.location.href = "/pages/organizzatore.html";
      } else {
        window.location.href = "/pages/partecipante.html";
      }
    } else {
      const errorData = await response.json();
      alert("Errore login: " + (errorData.message || "Credenziali non valide"));
    }
  } catch (error) {
    console.error("Errore di rete:", error);
    alert("Errore di rete. Riprova più tardi.");
  }
});

