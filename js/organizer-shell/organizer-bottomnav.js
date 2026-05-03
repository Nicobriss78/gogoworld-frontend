export function renderBottomnav() {
  const el = document.getElementById("organizer-bottomnav");

  el.innerHTML = `
    <div class="org-bottomnav">
      <button class="active">Dashboard</button>
      <button disabled>Eventi</button>
      <button disabled>Mappa</button>
      <button disabled>Trilli</button>
      <button disabled>Promo</button>
    </div>
  `;
}
