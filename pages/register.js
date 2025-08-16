// pages/register.js

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const role = document.getElementById("role").value;

  try {
    const response = await fetch("https://gogo-world-backend.onrender.com/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (response.ok) {
      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("name", data.user.name);

      alert("Registrazione avvenuta con successo!");
      if (data.user.role === "Organizzatore") {
        window.location.href = "/pages/organizzatore.html";
      } else {
        window.location.href = "/pages/partecipante.html";
      }
    } else if (response.status === 409) {
      // Email già registrata → provo login automatico
      alert("Email già registrata, effettuo il login...");

      const loginResp = await fetch("https://gogo-world-backend.onrender.com/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (loginResp.ok) {
        const data = await loginResp.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.user.role);
        localStorage.setItem("name", data.user.name);

        alert("Login effettuato con successo!");
        if (data.user.role === "Organizzatore") {
          window.location.href = "/pages/organizzatore.html";
        } else {
          window.location.href = "/pages/partecipante.html";
        }
      } else {
        alert("Email già registrata ma login fallito. Controlla la password.");
      }
    } else {
      const errorData = await response.json();
      alert("Errore registrazione: " + (errorData.message || "Errore sconosciuto"));
    }
  } catch (error) {
    console.error("Errore di rete:", error);
    alert("Errore di rete. Riprova più tardi.");
  }
});

