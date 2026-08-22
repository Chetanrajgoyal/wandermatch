/* Kibi — Client-side runtime configuration
   Loads OAuth client IDs from /config.json (generated from .env by the developer).
   If config.json is missing, falls back to empty placeholders so the app still loads. */

window.KIBI_CONFIG = window.KIBI_CONFIG || {
  GOOGLE_CLIENT_ID: '',
  APPLE_CLIENT_ID: '',
  APPLE_REDIRECT_URI: ''
};

async function loadKibiConfig() {
  try {
    const res = await fetch('/config.json', { cache: 'no-store' });
    if (!res.ok) return;
    const cfg = await res.json();
    window.KIBI_CONFIG = { ...window.KIBI_CONFIG, ...cfg };
  } catch (e) {
    console.warn('Kibi config.json not found; OAuth buttons will be disabled until configured.');
  }
}

loadKibiConfig();
