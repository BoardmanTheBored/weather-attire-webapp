// Builds the one recommendation state object (R6). Every visual and written output renders from it.
// Pure: network results, stations, and the variation store are passed in.
import { normalHigh } from './baseline.js';
import { currentTemperature, dateOptions, inputsForDate, localDateKey } from './nws.js';
import { recommend } from './recommend.js';

// The weather-driven part of a day's state. No random variation is drawn here.
function weatherState({ location, dateKey, bundle, stations, nowMs }) {
  const mode = dateKey === localDateKey(nowMs, bundle.timeZone) ? 'current' : 'forecast';
  const inputs = inputsForDate(bundle, dateKey);
  const base = { location, date: dateKey, mode, dates: dateOptions(bundle), inputs };

  // Without a temperature there is no tier or outfit (spec: Missing data).
  if (inputs.high == null) return { ...base, status: 'no-temperature' };

  const [year, month, day] = dateKey.split('-').map(Number);
  const baseline = Math.round(normalHigh(stations, location.lat, location.lon, { year, month, day }));

  // The header shows the nearest-hour temperature for today and the forecast high otherwise.
  const temperature = mode === 'current' ? (currentTemperature(bundle, nowMs) ?? inputs.high) : inputs.high;
  const rules = recommend({ ...inputs, baseline, temperature });
  return { ...base, status: 'ok', inputs: { ...inputs, baseline, temperature }, ...rules };
}

// location: { name, lat, lon }; dateKey: "YYYY-MM-DD"; bundle: result of fetchWeather.
export function buildState({ location, dateKey, bundle, stations, variation, nowMs = Date.now() }) {
  const state = weatherState({ location, dateKey, bundle, stations, nowMs });
  if (state.status !== 'ok') return state;

  variation.setLocation(`${location.lat},${location.lon}`);
  const { outfitVariation, reminderWording } = variation.forDate(dateKey);
  return { ...state, outfitVariation, reminderWording };
}

// What the 7-day strip shows for each date. Variations are only drawn for the date being viewed,
// so this never touches the variation store.
export function summarizeDays({ location, bundle, stations, nowMs = Date.now() }) {
  return dateOptions(bundle).map((dateKey) => {
    const { status, tier, condition, windy, inputs } = weatherState({ location, dateKey, bundle, stations, nowMs });
    return { date: dateKey, status, tier, condition, windy, high: inputs.high };
  });
}
