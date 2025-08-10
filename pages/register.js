document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("regForm");
  form.addEventListener("submit", onSubmit);
});

function validPassword(pw) {
  return typeof pw === "string" &&
         pw.length >= 8 &&
         /[A-Za-z]/.test(pw) &&
         /\d/.test(pw);
}

async function onSubmit(e) {
  e.preventDefault();
  const f = e.target;

  const body = {
    name: f.name.value.trim(),
    email: f.email.value.trim(),
    password: f.password.value,
    role: f.role.value,
    acceptTerms: !!f.acceptTerms.checked
  };

  if (!body.name || !body.email || !body.password || !body.role || !body.acceptTerms) {
    alert("Compila tutti i campi e accetta i termini.");
    return;
  }
  if (!validPassword(body.password)) {
    alert("Password non valida: minimo 8 caratteri, almeno 1 lettera e 1 numero.");
    return;
  }

  try {
    const r = await fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const m = await r.json().catch(() => ({}));
      throw new Error(m.error || `Errore registrazione (${r.status})`);
    }
    const data = await r.json();
    // salva sessione semplice
    localStorage.setItem("userId", String(data.id));
    localStorage.setItem("role", data.role);

    // redirect in base al ruolo scelto
    if (data.role === "organizer") {
      location.href = "/organizzatore.html";
    } else {
      location.href = "/partecipante.html";
    }
  } catch (err) {
    alert("Errore registrazione: " + err.message);
  }
}
