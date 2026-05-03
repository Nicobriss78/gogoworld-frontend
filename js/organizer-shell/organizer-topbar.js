export function renderTopbar() {
  const el = document.getElementById("organizer-topbar");

  el.innerHTML = `
    <div class="org-topbar">
      <div class="org-topbar-title">GoGoWorld Organizer</div>
    </div>
  `;
}
