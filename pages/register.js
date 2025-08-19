// register.js — campi estesi + profilo opzionale + auto-populate categorie da eventi
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const favSel = document.getElementById("favoriteCategories");

  // Auto-popola categorie leggendo gli eventi pubblicati (fallback lista base)
  async function loadCategories() {
    const fallback = ["Sagre", "Concerti", "Mostre", "Teatro", "Sport", "Workshop", "Fiere", "Festival"];
    try {
      const resp = await fetch("/api/events?status=published");
      if (!resp.ok) throw new Error();
      const events = await resp.json();
      const set = new Set(fallback);
      (events || []).forEach(ev => {
        if (ev?.category) set.add(ev.category);
      });
      const cats = Array.from(set).sort((a,b)=>a.localeCompare(b));
      favSel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join("");
    } catch {
      favSel.innerHTML = fallback.map(c => `<option value="${c}">${c}</option>`).join("");
    }
  }
  loadCategories();

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name")?.value?.trim();
    const email = document.getElementById("email")?.value?.trim();
    const password = document.getElementById("password")?.value?.trim();
    const role = document.getElementById("role")?.value || "participant";

    // Profilo opzionale
    const phone = document.getElementById("phone")?.value?.trim();
    const city = document.getElementById("city")?.value?.trim();
    const province = document.getElementById("province")?.value?.trim();
    const region = document.getElementById("region")?.value?.trim();
    const country = document.getElementById("country")?.value?.trim();

    const travelWillingness = document.getElementById("travelWillingness")?.value || "";
    const availability = Array.from(document.getElementById("availability")?.selectedOptions || []).map(o => o.value);

    const ig = document.getElementById("ig")?.value?.trim();
    const fb = document.getElementById("fb")?.value?.trim();
    const website = document.getElementById("website")?.value?.trim();

    const languages = (document.getElementById("languages")?.value || "").split(",").map(s => s.trim()).filter(Boolean);
    const bio = document.getElementById("bio")?.value?.trim();
    const newsletterOptIn = document.getElementById("newsletterOptIn")?.checked === true;

    const favoriteCategories = Array.from(favSel?.selectedOptions || []).map(o => o.value);

    try {
      // Registrazione (crea User + UserProfile)
      const resp = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, password, role,
          profile: {
            phone, city, province, region, country,
            favoriteCategories,
            availability,
            travelWillingness,
            social: { instagram: ig, facebook: fb, website },
            bio, languages,
            newsletterOptIn
          }
        })
      });
      if (!resp.ok) throw new Error(await resp.text());

      // Login automatico con desiredRole coerente con scelta in home (o con role)
      const desiredRole = localStorage.getItem("desiredRole") || role || "participant";
      const login = await fetch("/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, desiredRole })
      });
      if (!login.ok) throw new Error("AUTO_LOGIN_FAILED");
      const data = await login.json();

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("registeredRole", data.registeredRole);
      localStorage.setItem("sessionRole", data.sessionRole);

      if (data.sessionRole === "organizer") window.location.href = "../organizzatore.html";
      else window.location.href = "../partecipante.html";
    } catch (err) {
      console.error(err);
      alert("Registrazione non riuscita. Verifica i dati o riprova più tardi.");
    }
  });
});





