import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cToF, parseDuration, expandSeries, localDateKey, dateOptions, inputsForDate, currentTemperature, fetchWeather,
} from '../js/nws.js';
import { geocode } from '../js/geocode.js';
import { loadLocation, saveLocation } from '../js/storage.js';
import { buildState, summarizeDays } from '../js/state.js';
import { createVariationStore } from '../js/variation.js';
import { NoMatchError, ServiceError } from '../js/errors.js';

const { stations } = JSON.parse(readFileSync(new URL('../data/normals.json', import.meta.url), 'utf8'));

// ---- fixture: Austin-like bundle, "now" is 2026-10-15 14:00 local (19:00Z) ----
const NOW = Date.parse('2026-10-15T19:00:00Z');
const period = (over) => ({
  isDaytime: true, temperature: 80, probabilityOfPrecipitation: { value: 10 }, windSpeed: '5 to 10 mph',
  icon: 'https://api.weather.gov/icons/land/day/skc?size=medium', shortForecast: 'Sunny', ...over,
});
const bundle = () => ({
  timeZone: 'America/Chicago',
  place: { city: 'Austin', state: 'TX' },
  periods: [
    period({ startTime: '2026-10-15T13:00:00-05:00', endTime: '2026-10-15T18:00:00-05:00', name: 'This Afternoon', temperature: 90, probabilityOfPrecipitation: { value: 43 }, windSpeed: '15 mph' }),
    period({ startTime: '2026-10-15T18:00:00-05:00', endTime: '2026-10-16T06:00:00-05:00', isDaytime: false, temperature: 64 }),
    period({ startTime: '2026-10-16T06:00:00-05:00', endTime: '2026-10-16T18:00:00-05:00', temperature: 68, windSpeed: '10 to 20 mph' }),
    period({ startTime: '2026-10-16T18:00:00-05:00', endTime: '2026-10-17T06:00:00-05:00', isDaytime: false, temperature: 51 }),
    period({ startTime: '2026-10-17T06:00:00-05:00', endTime: '2026-10-17T18:00:00-05:00', temperature: 69, probabilityOfPrecipitation: { value: null } }),
  ],
  grid: {
    temperature: { values: [{ validTime: '2026-10-15T18:00:00+00:00/PT2H', value: 27.7777 }] }, // 82 F
    // 90 F today (starts 12:00 local), 68 F tomorrow (starts 08:00 local), none for Oct 17
    maxTemperature: { values: [
      { validTime: '2026-10-15T17:00:00+00:00/PT9H', value: 32.2222 },
      { validTime: '2026-10-16T13:00:00+00:00/PT13H', value: 20 },
    ] },
    // heat index 26.67 C = 80 F today afternoon; a null stretch; 26.1 C = 79 F tomorrow
    heatIndex: { values: [
      { validTime: '2026-10-15T18:00:00+00:00/PT2H', value: 26.6667 },
      { validTime: '2026-10-15T20:00:00+00:00/P1DT0H', value: null },
      { validTime: '2026-10-16T14:00:00+00:00/PT2H', value: 26.1111 },
    ] },
    windChill: { values: [{ validTime: '2026-10-16T12:00:00+00:00/PT4H', value: 10 }, { validTime: '2026-10-16T16:00:00+00:00/PT2H', value: 12 }] },
  },
});

test('unit and duration helpers', () => {
  assert.equal(cToF(0), 32);
  assert.equal(cToF(26.6667), 80); // rounds so threshold values do not drift
  assert.equal(parseDuration('PT1H'), 3600000);
  assert.equal(parseDuration('P6DT3H'), (6 * 24 + 3) * 3600000);
  assert.equal(parseDuration('PT13H'), 13 * 3600000);
  assert.throws(() => parseDuration('bogus'));
});

test('expandSeries gives start/end ms and keeps nulls; handles missing series', () => {
  const [a] = expandSeries({ values: [{ validTime: '2026-10-15T17:00:00+00:00/PT2H', value: null }] });
  assert.equal(a.end - a.start, 2 * 3600000);
  assert.equal(a.value, null);
  assert.deepEqual(expandSeries(undefined), []);
});

test('local date key respects the location time zone', () => {
  assert.equal(localDateKey(Date.parse('2026-10-16T03:00:00Z'), 'America/Chicago'), '2026-10-15');
  assert.equal(localDateKey(Date.parse('2026-10-16T03:00:00Z'), 'Pacific/Honolulu'), '2026-10-15');
  assert.equal(localDateKey(Date.parse('2026-10-16T03:00:00Z'), 'America/New_York'), '2026-10-15');
  assert.equal(localDateKey(Date.parse('2026-10-16T05:00:00Z'), 'America/New_York'), '2026-10-16');
});

test('dateOptions lists unique dates, at most 7', () => {
  assert.deepEqual(dateOptions(bundle()), ['2026-10-15', '2026-10-16', '2026-10-17']);
  const long = { periods: Array.from({ length: 14 }, (_, i) => ({ startTime: `2026-10-${String(15 + Math.floor(i / 2)).padStart(2, '0')}T0${i % 2}:00:00-05:00` })) };
  assert.equal(dateOptions(long).length, 7);
});

test("today's inputs fall back to the first period once the daytime period is gone", () => {
  const b = bundle();
  b.periods.shift(); // drop "This Afternoon"
  const inputs = inputsForDate(b, '2026-10-15');
  assert.equal(inputs.high, 90); // still available from the gridpoint
  assert.equal(inputs.low, 64);
  assert.equal(inputs.shortForecast, 'Sunny');
});

test('inputs for a normal day', () => {
  const inputs = inputsForDate(bundle(), '2026-10-16');
  assert.equal(inputs.high, 68);
  assert.equal(inputs.low, 51);
  assert.equal(inputs.pop, 10);
  assert.equal(inputs.windMph, 20); // upper end of "10 to 20 mph"
  assert.equal(inputs.heatIndex, 79); // below the 80 threshold
  assert.equal(inputs.windChill, 50); // minimum of 10 C and 12 C
});

test('heat index uses the window maximum and ignores nulls; empty is null', () => {
  assert.equal(inputsForDate(bundle(), '2026-10-15').heatIndex, 80);
  const b = bundle();
  b.grid.heatIndex = { values: [{ validTime: '2026-10-16T12:00:00+00:00/P6DT3H', value: null }] };
  assert.equal(inputsForDate(b, '2026-10-16').heatIndex, null);
  b.grid.heatIndex = undefined;
  assert.equal(inputsForDate(b, '2026-10-16').heatIndex, null);
});

test('missing fields come back null instead of throwing', () => {
  const inputs = inputsForDate(bundle(), '2026-10-17');
  assert.equal(inputs.high, null); // no gridpoint entry for Oct 17
  assert.equal(inputs.pop, null);
  assert.equal(inputs.low, null);
  const none = inputsForDate(bundle(), '2026-12-25'); // date NWS does not cover
  assert.equal(none.high, null);
  assert.equal(none.shortForecast, null);
});

test('current temperature comes from the series entry containing now', () => {
  assert.equal(currentTemperature(bundle(), NOW), 82);
  assert.equal(currentTemperature(bundle(), Date.parse('2026-10-20T00:00:00Z')), null);
});

// ---- fetchWeather with a fake fetch ----
const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('fetchWeather assembles the bundle from points, forecast and gridpoint', async () => {
  const b = bundle();
  const seen = [];
  const fakeFetch = async (url) => {
    seen.push(url);
    if (url.includes('/points/')) {
      return json({ properties: { forecast: 'https://api.weather.gov/f', forecastGridData: 'https://api.weather.gov/g', timeZone: 'America/Chicago', relativeLocation: { properties: { city: 'Austin', state: 'TX' } } } });
    }
    return url.endsWith('/f') ? json({ properties: { periods: b.periods } }) : json({ properties: b.grid });
  };
  const result = await fetchWeather(30.2649261, -97.7474086, fakeFetch);
  assert.ok(seen[0].endsWith('/points/30.2649,-97.7474'), 'coordinates rounded to 4 decimals');
  assert.ok(seen.every((u) => u.startsWith('https://api.weather.gov/')), 'R1: only api.weather.gov');
  assert.deepEqual(result.place, { city: 'Austin', state: 'TX' });
  assert.equal(result.periods.length, b.periods.length);
});

test('fetchWeather maps failures to the right errors', async () => {
  await assert.rejects(fetchWeather(1, 1, async () => { throw new TypeError('offline'); }), ServiceError);
  await assert.rejects(fetchWeather(1, 1, async () => json({}, 500)), ServiceError);
  await assert.rejects(fetchWeather(1, 1, async () => json({}, 404)), NoMatchError);
  await assert.rejects(fetchWeather(1, 1, async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad'); } })), ServiceError);
});

// ---- geocode ----
test('geocode returns coordinates for a match and sends one request', async () => {
  let calls = 0;
  const fakeFetch = async (url) => {
    calls += 1;
    assert.match(url, /nominatim\.openstreetmap\.org\/search/);
    assert.match(url, /countrycodes=us/);
    return json([{ lat: '30.2711', lon: '-97.7437' }]);
  };
  assert.deepEqual(await geocode('Austin, TX', fakeFetch), { lat: 30.2711, lon: -97.7437 });
  assert.equal(calls, 1);
});

test('geocode: empty results and blank queries are NoMatch; failures are ServiceError', async () => {
  await assert.rejects(geocode('Paris, France', async () => json([])), NoMatchError);
  let called = false;
  await assert.rejects(geocode('   ', async () => { called = true; }), NoMatchError);
  assert.equal(called, false, 'no request for a blank query');
  await assert.rejects(geocode('x', async () => { throw new TypeError('offline'); }), ServiceError);
  await assert.rejects(geocode('x', async () => json({}, 503)), ServiceError);
});

// ---- storage (R4) ----
const fakeStorage = () => {
  const data = new Map();
  return { data, setItem: (k, v) => data.set(k, v), getItem: (k) => data.get(k) ?? null };
};

test('storage keeps only the most recent location', () => {
  const s = fakeStorage();
  saveLocation({ name: 'Austin, TX', lat: 30.26, lon: -97.74 }, s);
  saveLocation({ name: 'Minneapolis, MN', lat: 44.98, lon: -93.27 }, s);
  assert.equal(s.data.size, 1, 'a single key');
  assert.deepEqual(loadLocation(s), { name: 'Minneapolis, MN', lat: 44.98, lon: -93.27 });
});

test('storage tolerates empty, corrupt, invalid, and throwing storage', () => {
  assert.equal(loadLocation(fakeStorage()), null);
  const corrupt = fakeStorage();
  corrupt.setItem('weather-attire:last-location', '{not json');
  assert.equal(loadLocation(corrupt), null);
  const invalid = fakeStorage();
  invalid.setItem('weather-attire:last-location', JSON.stringify({ name: 5, lat: 'x' }));
  assert.equal(loadLocation(invalid), null);
  const throwing = { setItem() { throw new Error('blocked'); }, getItem() { throw new Error('blocked'); } };
  assert.doesNotThrow(() => saveLocation({ name: 'a', lat: 1, lon: 2 }, throwing));
  assert.equal(loadLocation(throwing), null);
});

// ---- state ----
const austin = { name: 'Austin, TX', lat: 30.2649, lon: -97.7474 };

test('buildState: today is Current and uses the nearest-hour temperature', () => {
  const state = buildState({ location: austin, dateKey: '2026-10-15', bundle: bundle(), stations, variation: createVariationStore(), nowMs: NOW });
  assert.equal(state.status, 'ok');
  assert.equal(state.mode, 'current');
  assert.equal(state.inputs.temperature, 82);
  assert.equal(state.inputs.high, 90);
  assert.equal(state.category, `${state.tier}-${state.modifier}`);
  assert.ok(state.reminders.includes('umbrella')); // PoP 43
  assert.ok(state.reminders.includes('hydration')); // heat index 80
  for (const key of ['location', 'date', 'mode', 'inputs', 'tier', 'modifier', 'category', 'condition', 'windy', 'reminders', 'outfitVariation', 'reminderWording']) {
    assert.ok(key in state, `state has ${key}`);
  }
});

test('buildState: another date is Forecast and uses the high', () => {
  const state = buildState({ location: austin, dateKey: '2026-10-16', bundle: bundle(), stations, variation: createVariationStore(), nowMs: NOW });
  assert.equal(state.mode, 'forecast');
  assert.equal(state.inputs.temperature, 68);
  assert.equal(state.windy, true); // 20 mph
});

test('buildState: missing temperature gives no tier or outfit', () => {
  const state = buildState({ location: austin, dateKey: '2026-10-17', bundle: bundle(), stations, variation: createVariationStore(), nowMs: NOW });
  assert.equal(state.status, 'no-temperature');
  assert.equal(state.tier, undefined);
  assert.equal(state.outfitVariation, undefined);
});

test('buildState: same date shows the same variation; new location clears it (via real draws)', () => {
  const variation = createVariationStore();
  const args = { location: austin, bundle: bundle(), stations, variation, nowMs: NOW };
  const first = buildState({ ...args, dateKey: '2026-10-15' });
  buildState({ ...args, dateKey: '2026-10-16' });
  const again = buildState({ ...args, dateKey: '2026-10-15' });
  assert.deepEqual(again.outfitVariation, first.outfitVariation);
  assert.deepEqual(again.reminderWording, first.reminderWording);
});

test('same forecast gives a different tier in Austin vs a northern city (R15)', () => {
  const north = { name: 'Minneapolis, MN', lat: 44.98, lon: -93.27 };
  const args = { dateKey: '2026-10-16', bundle: bundle(), stations, variation: createVariationStore(), nowMs: NOW };
  assert.notEqual(buildState({ ...args, location: austin }).tier, buildState({ ...args, location: north }).tier);
});

test('summarizeDays gives one entry per date (and takes no variation store)', () => {
  const days = summarizeDays({ location: austin, bundle: bundle(), stations, nowMs: NOW });
  assert.deepEqual(days.map((d) => [d.date, d.status]), [
    ['2026-10-15', 'ok'], ['2026-10-16', 'ok'], ['2026-10-17', 'no-temperature'],
  ]);
  assert.equal(days[0].high, 90);
  assert.ok(['Cold', 'Mild', 'Hot'].includes(days[0].tier));
  assert.ok(['Clear', 'Overcast', 'Rain', 'Snow'].includes(days[0].condition));
  assert.equal(days[2].tier, undefined);
});

test('summaries agree with the full state for the same date', () => {
  const variation = createVariationStore();
  const [today] = summarizeDays({ location: austin, bundle: bundle(), stations, nowMs: NOW });
  const full = buildState({ location: austin, dateKey: '2026-10-15', bundle: bundle(), stations, variation, nowMs: NOW });
  assert.equal(today.tier, full.tier);
  assert.equal(today.condition, full.condition);
  assert.equal(today.windy, full.windy);
});
