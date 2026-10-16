// Nominatim (OpenStreetMap) client. Called only when the user presses Search (R2): no autocomplete,
// one request per search. Attribution is shown on the information screen.
import { NoMatchError, ServiceError } from './errors.js';

const SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

// Returns { lat, lon } for the best US match, or throws NoMatchError / ServiceError.
export async function geocode(query, fetchFn = fetch) {
  const q = query.trim();
  if (!q) throw new NoMatchError();
  const params = new URLSearchParams({ q, format: 'jsonv2', countrycodes: 'us', limit: '1' });

  let results;
  try {
    const response = await fetchFn(`${SEARCH_URL}?${params}`);
    if (!response.ok) throw new Error(String(response.status));
    results = await response.json();
  } catch {
    throw new ServiceError('Could not reach the location service');
  }

  if (!Array.isArray(results) || results.length === 0) throw new NoMatchError();
  return { lat: Number(results[0].lat), lon: Number(results[0].lon) };
}
