// The only data kept on the device: the most recent location (R4). Variations are never stored.
const KEY = 'weather-attire:last-location';

// Storage can throw (private windows, blocked site data), so every access is guarded.
export function saveLocation({ name, lat, lon }, storage = globalThis.localStorage) {
  try {
    storage.setItem(KEY, JSON.stringify({ name, lat, lon }));
  } catch {
    // Not saving is acceptable; the app still works for this session.
  }
}

// Returns { name, lat, lon } or null when nothing valid is saved.
export function loadLocation(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage.getItem(KEY));
    const valid = saved && typeof saved.name === 'string' && Number.isFinite(saved.lat) && Number.isFinite(saved.lon);
    return valid ? { name: saved.name, lat: saved.lat, lon: saved.lon } : null;
  } catch {
    return null;
  }
}
