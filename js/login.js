// backend/public/js/login.js

// 👉 Base URL dell’API su Render (assoluto, così funziona da Netlify)
const API_BASE = 'https://gogoworld-api.onrender.com';

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form") || document.querySelector("form");
  if (!form) return;
  form.addEventListener("submit", onSubmit);
});

async function onSubmit(e) {
  e.preventDefault();

  const email = (document.getElementById("email")?.value || "").trim();
  const password = (document.getElementById("password")?.value || "").trim();

  // ruolo desiderato (selezionato altrove, es. da homepage)
  const desiredRole = mapRoleToEn(localStorage.getItem("desiredRole"));

  try {
    // 1) Login
    const r = await fetch(`${API_BASE}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || data.message || `Errore login (${r.status})`);

    // salva SEMPRE id + token + ruolo
    localStorage.setItem("userId", String(data.id));
    if (data.token) localStorage.setItem("token", data.token);

    let finalRole = data.currentRole || data.role || "participant";

    // 2) Switch ruolo subito dopo il login (se richiesto)
    if (desiredRole && desiredRole !== finalRole) {
      const sw = await fetch(`${API_BASE}/api/users/${data.id}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          // usa il token ricevuto dal login
          Authorization: `Bearer ${localStorage.getItem("token") || data.token || ""}`
        },
        body: JSON.stringify({ role: desiredRole })
      });
      const swData = await sw.json();
      if (!sw.ok) throw new Error(swData.error || `Errore cambio ruolo (${sw.status})`);

      // backend risponde { token, role }
      if (swData.token) localStorage.setItem("token", swData.token);
      finalRole = swData.role || desiredRole;
    }

    // Sincronizza chiavi ruolo
    localStorage.setItem("role", finalRole);
    localStorage.setItem("currentRole", finalRole);

    // Legacy IT
    const itRole = (finalRole === "organizer") ? "organizzatore" : "partecipante";
    localStorage.setItem("userRole", itRole);
    if (finalRole === "organizer") {
      sessionStorage.setItem("organizzatoreLoggato", "true");
      sessionStorage.setItem("partecipanteLoggato", "");
    } else {
      sessionStorage.setItem("partecipanteLoggato", "true");
      sessionStorage.setItem("organizzatoreLoggato", "");
    }

    // aggiorna/crea utenteCorrente legacy se esiste
    try {
      const raw = sessionStorage.getItem("utenteCorrente");
      const base = raw ? JSON.parse(raw) : {};
      base.role = finalRole;
      base.currentRole = finalRole;
      base.id = data.id;
      base.email = data.email;
      base.ruolo = itRole;
      sessionStorage.setItem("utenteCorrente", JSON.stringify(base));
    } catch {}

    // redirect coerente
    if (finalRole === "organizer") {
      location.href = "/organizzatore.html";
    } else {
      location.href = "/partecipante.html";
    }

  } catch (err) {
    console.error(err);
    alert(err.message || "Errore di accesso");
  }
}

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
