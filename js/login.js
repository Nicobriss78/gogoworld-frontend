// js/login.js
const API_BASE = 'https://gogoworld-api.onrender.com';

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form") || document.querySelector("form");
  if (!form) return;
  form.addEventListener("submit", onSubmit);
});

function mapRoleToEn(v) {
  if (!v) return null;
  const s = String(v).toLowerCase();
  if (s.startsWith("org")) return "organizer";
  if (s.startsWith("par")) return "participant";
  if (s === "organizer" || s === "participant") return s;
  if (s === "organizzatore") return "organizer";
  if (s === "partecipante") return "participant";
  return null;
}

async function onSubmit(e) {
  e.preventDefault();

  const email = (document.getElementById("email")?.value || "").trim();
  const password = (document.getElementById("password")?.value || "").trim();
  if (!email || !password) { alert("Inserisci email e password"); return; }

  // ruolo desiderato dalla home; fallback su userRole IT
  const desiredRole =
    mapRoleToEn(localStorage.getItem("desiredRole")) ||
    mapRoleToEn(localStorage.getItem("userRole")) ||
    "participant";

  try {
    // 1) LOGIN
    const res = await fetch(`${API_BASE}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || `Login fallito (${res.status})`);

    // salva sessione
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", String(data.id));
    localStorage.setItem("name", data.name || "");
    localStorage.setItem("role", data.role || "participant");
    localStorage.setItem("currentRole", data.role || "participant");

    let finalRole = data.role || "participant";
    let token = data.token;

    // 2) SWITCH se necessario
    if (finalRole !== desiredRole) {
      const put = await fetch(`${API_BASE}/api/users/${data.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ role: desiredRole }),
      });
      const upd = await put.json();
      if (!put.ok) throw new Error(upd?.error || `Cambio ruolo fallito (${put.status})`);

      token = upd.token || token;
      finalRole = upd.role || desiredRole;

      localStorage.setItem("token", token);
      localStorage.setItem("role", finalRole);
      localStorage.setItem("currentRole", finalRole);
      sessionStorage.setItem(finalRole === "organizer" ? "organizzatoreLoggato" : "partecipanteLoggato", "true");
    }

    // 3) pulizia desiredRole per evitare effetti residui
    localStorage.removeItem("desiredRole");

    // 4) redirect area
    if (finalRole === "organizer") window.location.href = "/organizzatore.html";
    else window.location.href = "/partecipante.html";

  } catch (err) {
    console.error(err);
    alert(err.message || "Errore di accesso");
  }
}


