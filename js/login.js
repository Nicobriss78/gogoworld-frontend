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

  const desiredRoleIt = localStorage.getItem("userRole"); // "organizzatore" | "partecipante"
  const desiredRole = mapRoleToEn(desiredRoleIt); // "organizer" | "participant"

  if (!email || !password) {
    alert("Inserisci email e password.");
    return;
  }

  try {
    // 1) Login senza vincolo di ruolo
    const r = await fetch(`${API_BASE}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || data.message || `Errore login (${r.status})`);

    let finalRole = data.currentRole || data.role || "participant";

    // 2) Se è stato scelto un ruolo diverso in home, fai switch server-side
    if (desiredRole && desiredRole !== finalRole) {
      const sw = await fetch(`${API_BASE}/api/users/${data.id}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newRole: desiredRole })
      });
      const swData = await sw.json();
      if (!sw.ok) throw new Error(swData.error || `Errore cambio ruolo (${sw.status})`);
      finalRole = swData.currentRole || desiredRole;
    }

    // 3) Salva sessione (nuovo schema)
    localStorage.setItem("userId", String(data.id));
    localStorage.setItem("role", finalRole);
    localStorage.setItem("currentRole", finalRole);

    // 3bis) Compat: salva anche le flag legacy che i guard potrebbero usare
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
      base.name = data.name;
      sessionStorage.setItem("utenteCorrente", JSON.stringify(base));
    } catch {}

    // 4) Redirect in base al ruolo attivo
    if (finalRole === "organizer") {
      location.href = "/organizzatore.html";
    } else {
      location.href = "/partecipante.html";
    }
  } catch (err) {
    console.error("Errore durante il login:", err);
    alert(err.message || "Errore di connessione. Riprova.");
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

