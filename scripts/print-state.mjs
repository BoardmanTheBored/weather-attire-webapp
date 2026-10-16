// C4 check: runs the real data layer against live services and prints the state object.
// Usage: node scripts/print-state.mjs
import { readFileSync } from 'node:fs';
import { geocode } from '../js/geocode.js';
import { fetchWeather, dateOptions, inputsForDate } from '../js/nws.js';
import { buildState } from '../js/state.js';
import { createVariationStore } from '../js/variation.js';

const { stations } = JSON.parse(readFileSync(new URL('../data/normals.json', import.meta.url), 'utf8'));
// Nominatim policy asks for an identifying User-Agent (browsers send a Referer instead).
const withUA = (url, options = {}) =>
  fetch(url, { ...options, headers: { 'User-Agent': 'weather-attire-webapp dev check (amb22559@eid.utexas.edu)' } });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const variation = createVariationStore();

for (const query of ['Austin, TX', '55401']) {
  console.log(`\n===== "${query}" =====`);
  const { lat, lon } = await geocode(query, withUA);
  await sleep(1100); // Nominatim: at most one request per second
  const bundle = await fetchWeather(lat, lon, withUA);
  const location = { name: `${bundle.place.city}, ${bundle.place.state}`, lat, lon };
  const dates = dateOptions(bundle);
  console.log('location:', location, 'dates:', dates.length, dates[0], '...', dates.at(-1));

  // Today (Current) and the third day (Forecast).
  for (const dateKey of [dates[0], dates[2]]) {
    console.log(JSON.stringify(buildState({ location, dateKey, bundle, stations, variation }), null, 1));
  }

  // Cross-check: gridpoint high vs the daytime period temperature, and missing fields, for all 7 days.
  console.log('day-by-day inputs (high from gridpoint | daytime period temp):');
  for (const dateKey of dates) {
    const inputs = inputsForDate(bundle, dateKey);
    const daytime = bundle.periods.find((p) => p.isDaytime && p.startTime.startsWith(dateKey));
    console.log(dateKey, 'high', inputs.high, '| period', daytime?.temperature ?? 'none (past)', '| pop', inputs.pop, '| wind', inputs.windMph, '| HI', inputs.heatIndex, '| WC', inputs.windChill);
  }
}
