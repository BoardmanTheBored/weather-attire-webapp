// Builds the one recommendation state object (R6). Every visual and written output renders from it.
// Pure: network results, stations, and the variation store are passed in.
import { normalHigh } from './baseline.js';
import { currentTemperature, dateOptions, inputsForDate, localDateKey } from './nws.js';
import { recommend } from './recommend.js';

// location: { name, lat, lon }; dateKey: "YYYY-MM-DD"; bundle: result of fetchWeather.
export function buildState({ location, dateKey, bundle, stations, variation, nowMs = Date.now() }) {
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

  variation.setLocation(`${location.lat},${location.lon}`);
  const { outfitVariation, reminderWording } = variation.forDate(dateKey);

  return {
    ...base,
    status: 'ok',
    inputs: { ...inputs, baseline, temperature },
    ...rules,
    outfitVariation,
    reminderWording,
  };
}
