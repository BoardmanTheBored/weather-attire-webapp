// api.weather.gov client (R1). `fetchWeather` does the network work; everything else is a pure
// parser so it can be tested against fixtures. See spec.md Revisions (2026-10-15) for the field
// choices: high from gridpoint maxTemperature, heat index / wind chill from the gridpoint series.
import { NoMatchError, ServiceError } from './errors.js';
import { parseWindMph } from './recommend.js';

const API = 'https://api.weather.gov';
const TIMEOUT_MS = 10000;
const WEATHER_DOWN = "Couldn't reach the weather service"; // spec: Error and loading states
const DAYS_OFFERED = 7;

async function getJson(url, fetchFn) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetchFn(url, { signal: controller.signal });
  } catch {
    throw new ServiceError(WEATHER_DOWN);
  } finally {
    clearTimeout(timer);
  }
  // NWS answers 404 for points it does not cover (outside the US).
  if (response.status === 404) throw new NoMatchError();
  if (!response.ok) throw new ServiceError(WEATHER_DOWN);
  try {
    return await response.json();
  } catch {
    throw new ServiceError(WEATHER_DOWN);
  }
}

// Fetches everything needed for all 7 days at one location.
export async function fetchWeather(lat, lon, fetchFn = fetch) {
  // NWS redirects points with more than 4 decimals, so round first.
  const point = await getJson(`${API}/points/${lat.toFixed(4)},${lon.toFixed(4)}`, fetchFn);
  const { forecast, forecastGridData, timeZone, relativeLocation } = point.properties;
  const [forecastJson, gridJson] = await Promise.all([getJson(forecast, fetchFn), getJson(forecastGridData, fetchFn)]);
  const grid = gridJson.properties;
  const place = relativeLocation?.properties;
  return {
    timeZone,
    place: place ? { city: place.city, state: place.state } : null,
    periods: forecastJson.properties.periods,
    // Keep only the series we read.
    grid: {
      temperature: grid.temperature,
      maxTemperature: grid.maxTemperature,
      heatIndex: grid.heatIndex,
      windChill: grid.windChill,
    },
  };
}

// ---------- pure parsing ----------

export const cToF = (c) => Math.round((c * 9) / 5 + 32);

// ISO-8601 duration as NWS writes them ("PT1H", "P6DT3H", "PT13H") to milliseconds.
export function parseDuration(iso) {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(iso);
  if (!m) throw new Error(`Unrecognized duration: ${iso}`);
  const [, d = 0, h = 0, min = 0] = m;
  return ((Number(d) * 24 + Number(h)) * 60 + Number(min)) * 60 * 1000;
}

// NWS gridpoint series -> [{ start, end, value }] in epoch ms. Null values are kept as null.
export function expandSeries(series) {
  if (!series?.values) return [];
  return series.values.map(({ validTime, value }) => {
    const [startIso, duration] = validTime.split('/');
    const start = Date.parse(startIso);
    return { start, end: start + parseDuration(duration), value };
  });
}

// "YYYY-MM-DD" of an instant in the given IANA time zone.
export function localDateKey(ms, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
}

// The 7 dates the forecast covers, starting today (R3).
export function dateOptions(bundle) {
  const dates = [];
  for (const period of bundle.periods) {
    const key = period.startTime.slice(0, 10);
    if (!dates.includes(key)) dates.push(key);
  }
  return dates.slice(0, DAYS_OFFERED);
}

// The forecast period that represents a date: its daytime period, or (for the rest of today,
// when the daytime period has passed) the first period that starts on that date.
function periodForDate(bundle, dateKey) {
  const onDate = bundle.periods.filter((p) => p.startTime.slice(0, 10) === dateKey);
  return onDate.find((p) => p.isDaytime) ?? onDate[0] ?? null;
}

// Values of a series (converted to F) that overlap [start, end), ignoring empty ones.
function valuesInWindow(series, start, end) {
  return expandSeries(series)
    .filter((e) => e.value != null && e.start < end && e.end > start)
    .map((e) => cToF(e.value));
}

// Inputs for one date. Any field NWS does not provide is null (rows show "Not available").
export function inputsForDate(bundle, dateKey) {
  const period = periodForDate(bundle, dateKey);

  // High: gridpoint maxTemperature entries that begin on this local date.
  const highs = expandSeries(bundle.grid.maxTemperature)
    .filter((e) => e.value != null && localDateKey(e.start, bundle.timeZone) === dateKey)
    .map((e) => cToF(e.value));

  // Low: the night period that begins on this date, when the forecast has one.
  const night = bundle.periods.find((p) => !p.isDaytime && p.startTime.slice(0, 10) === dateKey);

  const base = {
    high: highs.length ? Math.max(...highs) : null,
    low: night?.temperature ?? null,
    pop: period?.probabilityOfPrecipitation?.value ?? null,
    windMph: parseWindMph(period?.windSpeed),
    heatIndex: null,
    windChill: null,
    icon: period?.icon ?? null,
    shortForecast: period?.shortForecast ?? null,
  };
  if (!period) return base;

  // Heat index (max) and wind chill (min) over the period's hours; empty means not applicable.
  const start = Date.parse(period.startTime);
  const end = Date.parse(period.endTime);
  const heat = valuesInWindow(bundle.grid.heatIndex, start, end);
  const chill = valuesInWindow(bundle.grid.windChill, start, end);
  base.heatIndex = heat.length ? Math.max(...heat) : null;
  base.windChill = chill.length ? Math.min(...chill) : null;
  return base;
}

// Nearest-hour forecast temperature (F) for "Current"; null if the series has no entry for now.
export function currentTemperature(bundle, nowMs) {
  const entry = expandSeries(bundle.grid.temperature).find((e) => e.value != null && e.start <= nowMs && nowMs < e.end);
  return entry ? cToF(entry.value) : null;
}
