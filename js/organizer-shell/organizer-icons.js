const ORGANIZER_ICON_SPRITE_ID = "organizer-v2-icon-sprite";

const ORGANIZER_ICON_SPRITE_MARKUP = `
  <div
    id="${ORGANIZER_ICON_SPRITE_ID}"
    aria-hidden="true"
    style="position:absolute;width:0;height:0;overflow:hidden"
  >
    <svg xmlns="http://www.w3.org/2000/svg" style="display:none">
      <symbol id="gw-icon-search" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7"></circle>
        <path d="M20 20l-3.5-3.5"></path>
      </symbol>

      <symbol id="gw-icon-pin" viewBox="0 0 24 24">
        <path d="M12 21s7-5.2 7-11a7 7 0 0 0-14 0c0 5.8 7 11 7 11z"></path>
        <circle cx="12" cy="10" r="2.5"></circle>
      </symbol>

      <symbol id="gw-icon-chat" viewBox="0 0 24 24">
        <path d="M21 12c0 4.4-4 8-9 8-1.2 0-2.3-.2-3.3-.6L3 21l1.7-4.2A7.4 7.4 0 0 1 3 12c0-4.4 4-8 9-8s9 3.6 9 8z"></path>
        <path d="M8 12h.01M12 12h.01M16 12h.01"></path>
      </symbol>

      <symbol id="gw-icon-bell" viewBox="0 0 24 24">
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 7h18s-3 0-3-7z"></path>
        <path d="M10 19a2 2 0 0 0 4 0"></path>
      </symbol>

      <symbol id="gw-icon-menu" viewBox="0 0 24 24">
        <path d="M4 6h16"></path>
        <path d="M4 12h16"></path>
        <path d="M4 18h16"></path>
      </symbol>

      <symbol id="gw-icon-map" viewBox="0 0 24 24">
        <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"></path>
        <path d="M9 4v14"></path>
        <path d="M15 6v14"></path>
      </symbol>

      <symbol id="gw-icon-calendar" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="16" rx="2"></rect>
        <path d="M16 3v4"></path>
        <path d="M8 3v4"></path>
        <path d="M3 10h18"></path>
      </symbol>

      <symbol id="gw-icon-profile" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3.5"></circle>
        <path d="M5 20a7 7 0 0 1 14 0"></path>
      </symbol>

      <symbol id="gw-icon-dashboard" viewBox="0 0 24 24">
        <rect x="4" y="4" width="7" height="7" rx="1.5"></rect>
        <rect x="13" y="4" width="7" height="4.5" rx="1.5"></rect>
        <rect x="13" y="11" width="7" height="9" rx="1.5"></rect>
        <rect x="4" y="13.5" width="7" height="6.5" rx="1.5"></rect>
      </symbol>

      <symbol id="gw-icon-megaphone" viewBox="0 0 24 24">
        <path d="M4 12l10-5v10L4 12z"></path>
        <path d="M14 9.5c2.2 0 4 1.8 4 4"></path>
        <path d="M14 6.5c4 0 6.5 3 6.5 5.5"></path>
        <path d="M7 14l1.8 4.5"></path>
      </symbol>

      <symbol id="gw-icon-promo" viewBox="0 0 24 24">
        <path d="M20 12l-8 8-8-8 8-8h6l2 2v6z"></path>
        <circle cx="15.5" cy="8.5" r="1"></circle>
      </symbol>

      <symbol id="gw-icon-communications" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="14" rx="2"></rect>
        <path d="M3 8l9 5 9-5"></path>
      </symbol>
    </svg>
  </div>
`;

export function ensureOrganizerIconSprite() {
  if (document.getElementById(ORGANIZER_ICON_SPRITE_ID)) return;
  document.body.insertAdjacentHTML("afterbegin", ORGANIZER_ICON_SPRITE_MARKUP);
}
