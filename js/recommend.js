// Pure recommendation rules (spec.md "Recommendation state and data flow").
// Units: degrees F, mph, percent. No DOM, no network, no randomness.

export const MILD_BAND_F = 7; // within +/- 7 F of the seasonal normal high is Mild
export const RAIN_POP_PERCENT = 40; // PoP at or above this is Rain and shows the umbrella reminder
export const HYDRATION_HEAT_INDEX_F = 80; // heat index at or above this shows the hydration reminder
export const WINDY_MPH = 19; // Beaufort force 5, "fresh breeze"

// Rule 1: forecast high compared with the seasonal normal high.
export function tierFor(high, baseline) {
  const diff = high - baseline;
  if (diff < -MILD_BAND_F) return 'Cold';
  if (diff > MILD_BAND_F) return 'Hot';
  return 'Mild';
}

// Rule 2: a missing PoP counts as Dry (the Precipitation row shows "Not available").
export function modifierFor(pop) {
  return pop != null && pop >= RAIN_POP_PERCENT ? 'Rain' : 'Dry';
}

export function isWindy(windMph) {
  return windMph != null && windMph >= WINDY_MPH;
}

// Jacket: shown when Cold, Rain, or windy; heavy only when Cold.
export function jacketFor({ tier, modifier, windy }) {
  if (tier !== 'Cold' && modifier !== 'Rain' && !windy) return null;
  return tier === 'Cold' ? 'heavy' : 'light';
}

// Hat: rain hood whenever Rain; otherwise beanie when Cold, sun hat when Hot, none when Mild.
export function hatFor({ tier, modifier }) {
  if (modifier === 'Rain') return 'rain hood';
  if (tier === 'Cold') return 'beanie';
  if (tier === 'Hot') return 'sun hat';
  return null;
}

// Rule 5. An empty heat index (null/undefined) is below threshold, not missing data.
export function remindersFor({ pop, heatIndex }) {
  const reminders = [];
  if (pop != null && pop >= RAIN_POP_PERCENT) reminders.push('umbrella');
  if (heatIndex != null && heatIndex >= HYDRATION_HEAT_INDEX_F) reminders.push('hydration');
  return reminders;
}

// "Feels like" falls back from heat index to wind chill to the plain temperature.
export function feelsLike({ heatIndex, windChill, temperature }) {
  if (heatIndex != null) return { value: heatIndex, source: 'heat index' };
  if (windChill != null) return { value: windChill, source: 'wind chill' };
  return { value: temperature, source: 'temperature' };
}

// NWS period wind strings look like "15 mph" or "5 to 15 mph"; use the upper end (spec revision 2026-10-15).
export function parseWindMph(windSpeed) {
  if (typeof windSpeed !== 'string') return null;
  const numbers = windSpeed.match(/\d+(\.\d+)?/g);
  return numbers ? Math.max(...numbers.map(Number)) : null;
}

// Rule 4: group NWS icon codes into Clear, Overcast, Rain, Snow. Unmapped codes fall back to Overcast.
const CLEAR_CODES = new Set(['skc', 'few', 'sct']);
const OVERCAST_CODES = new Set(['bkn', 'ovc']);
const RAIN_CODES = new Set([
  'rain', 'rain_showers', 'rain_showers_hi', 'fzra', 'sleet', 'rain_fzra', 'rain_sleet', 'fzra_sleet',
  'tsra', 'tsra_sct', 'tsra_hi', 'tornado', 'hurricane', 'tropical_storm',
]);
const SNOW_CODES = new Set(['snow', 'rain_snow', 'snow_sleet', 'snow_fzra', 'fzra_snow', 'blizzard']);
// Severity order when one icon holds several codes (e.g. "Partly Cloudy then Chance Showers").
const CONDITION_PRIORITY = ['Snow', 'Rain', 'Overcast', 'Clear'];

function groupFor(code) {
  const base = code.replace(/^wind_/, ''); // wind_* variants only add the Windy overlay, handled by wind speed
  if (SNOW_CODES.has(base)) return 'Snow';
  if (RAIN_CODES.has(base)) return 'Rain';
  if (CLEAR_CODES.has(base)) return 'Clear';
  if (OVERCAST_CODES.has(base)) return 'Overcast';
  return 'Overcast';
}

// `icon` is an NWS icon URL such as ".../icons/land/day/sct/tsra_hi,40?size=medium".
export function conditionFor(icon) {
  if (typeof icon !== 'string') return 'Overcast';
  const path = icon.split('?')[0].split('/icons/')[1] ?? '';
  const codes = path
    .split('/')
    .slice(2) // drop "land" and "day"/"night"
    .map((segment) => segment.split(',')[0])
    .filter(Boolean);
  if (codes.length === 0) return 'Overcast';
  const groups = codes.map(groupFor);
  return CONDITION_PRIORITY.find((group) => groups.includes(group));
}

// Combines the rules for one day. `inputs` are already in F / mph / percent:
// { high, baseline, pop, windMph, heatIndex, windChill, temperature, icon }
// Returns the weather-driven part of the shared state (spec.md "Shared state").
export function recommend(inputs) {
  const tier = tierFor(inputs.high, inputs.baseline);
  const modifier = modifierFor(inputs.pop);
  const windy = isWindy(inputs.windMph);
  return {
    tier,
    modifier,
    category: `${tier}-${modifier}`,
    condition: conditionFor(inputs.icon),
    windy,
    jacket: jacketFor({ tier, modifier, windy }),
    hat: hatFor({ tier, modifier }),
    reminders: remindersFor(inputs),
    feelsLike: feelsLike(inputs),
  };
}
