// pages/register.js
const API_BASE = 'https://gogoworld-api.onrender.com';

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("regForm");
  if (form) form.addEventListener("submit", onSubmit);
});

function validPassword(pw) {
  return typeof pw === "string" &&
         pw.length >= 6 && // abbasso a 6 per compatibilità con dati esistenti
         /[A-Za-z]/.test(pw) &&
         /\d/.test(pw);
}

function mapRoleToEn(v) {
  if (!v) return "participant";
  const s = String(v).toLowerCase();
  if (s.startsWith("org")) return "organizer";
  if (s.startsWith("par")) return "participant";
  if (s === "organizzatore") return "organizer";
  if (s === "partecipante") return "participant";
  if (s === "organizer" || s === "participant") return s;
  return "participant";
}

async function onSubmit(e) {
  e.preventDefault();
  const f = e.target;

  const name = f.name.value.trim();
  const email = f.email.value.trim();
  const password = f.password.value;
  const roleIt = f.role.value;
  const role = mapRoleToEn(roleIt);
  const acceptTerms = !!f.acceptTerms?.checked;

  if (!name || !email || !password || !role || !acceptTerms) {
    alert("Compila tutti i campi e accetta i termini.");
    return;
  }
  if (!validPassword(password)) {
    alert("Password non valida (min 6, lettere e numeri).");
    return;
  }

  try {
    // 1) Registrazione
    const r1 = await fetch(`${API_BASE}/api/users/register`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ name, email, password, role })
    });
    const d1 = await r1.json();
    if (!r1.ok) throw new Error(d1?.error || `Registrazione fallita (${r1.status})`);

    // 2) Auto-login
    const r2 = await fetch(`${API_BASE}/api/users/login`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ email, password })
    });
    const d2 = await r2.json();
    if (!r2.ok) throw new Error(d2?.error || `Auto-login fallito (${r2.status})`);

    // salva sessione
    localStorage.setItem("token", d2.token);
    localStorage.setItem("userId", String(d2.id));
    localStorage.setItem("name", d2.name || "");
    localStorage.setItem("role", d2.role || role);
    localStorage.setItem("currentRole", d2.role || role);

    // 3) Redirect area coerente
    if ((d2.role || role) === "organizer") {
      location.href = "/organizzatore.html";
    } else {
      location.href = "/partecipante.html";
    }
  } catch (err) {
    alert("Errore registrazione: " + err.message);
  }
}

