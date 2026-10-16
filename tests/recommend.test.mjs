import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tierFor, modifierFor, isWindy, jacketFor, hatFor, remindersFor, feelsLike,
  parseWindMph, conditionFor, recommend,
} from '../js/recommend.js';

test('tier boundaries at +/- 7 F of the baseline', () => {
  assert.equal(tierFor(83, 90), 'Mild'); // exactly 7 below
  assert.equal(tierFor(82.9, 90), 'Cold'); // just past 7 below
  assert.equal(tierFor(97, 90), 'Mild'); // exactly 7 above
  assert.equal(tierFor(97.1, 90), 'Hot'); // just past 7 above
  assert.equal(tierFor(90, 90), 'Mild');
});

test('same forecast gives a different tier in winter vs summer (R15)', () => {
  assert.equal(tierFor(60, 22), 'Hot'); // Minneapolis in January
  assert.equal(tierFor(60, 95), 'Cold'); // Austin in July
});

test('PoP boundary at 39 / 40', () => {
  assert.equal(modifierFor(39), 'Dry');
  assert.equal(modifierFor(40), 'Rain');
  assert.equal(modifierFor(null), 'Dry');
  assert.deepEqual(remindersFor({ pop: 39, heatIndex: null }), []);
  assert.deepEqual(remindersFor({ pop: 40, heatIndex: null }), ['umbrella']);
});

test('heat index boundary at 79 / 80', () => {
  assert.deepEqual(remindersFor({ pop: 0, heatIndex: 79 }), []);
  assert.deepEqual(remindersFor({ pop: 0, heatIndex: 80 }), ['hydration']);
});

test('empty heat index is below threshold, not an error', () => {
  assert.deepEqual(remindersFor({ pop: 0, heatIndex: null }), []);
  assert.deepEqual(remindersFor({ pop: 0, heatIndex: undefined }), []);
});

test('both reminders can show together', () => {
  assert.deepEqual(remindersFor({ pop: 80, heatIndex: 95 }), ['umbrella', 'hydration']);
});

test('windy boundary at 18 / 19 mph', () => {
  assert.equal(isWindy(18), false);
  assert.equal(isWindy(19), true);
  assert.equal(isWindy(null), false);
});

test('wind strings use the upper end of the range', () => {
  assert.equal(parseWindMph('15 mph'), 15);
  assert.equal(parseWindMph('5 to 15 mph'), 15);
  assert.equal(parseWindMph('10 to 20 mph'), 20);
  assert.equal(parseWindMph('Calm'), null);
  assert.equal(parseWindMph(undefined), null);
});

test('feels like falls back heat index, then wind chill, then temperature', () => {
  assert.deepEqual(feelsLike({ heatIndex: 95, windChill: 40, temperature: 90 }), { value: 95, source: 'heat index' });
  assert.deepEqual(feelsLike({ heatIndex: null, windChill: 40, temperature: 45 }), { value: 40, source: 'wind chill' });
  assert.deepEqual(feelsLike({ heatIndex: null, windChill: null, temperature: 68 }), { value: 68, source: 'temperature' });
});

// Every row of the spec's jacket/hat table, calm and windy.
const TABLE = [
  // tier, modifier, windy, jacket, hat
  ['Cold', 'Dry', false, 'heavy', 'beanie'],
  ['Cold', 'Dry', true, 'heavy', 'beanie'],
  ['Cold', 'Rain', false, 'heavy', 'rain hood'],
  ['Cold', 'Rain', true, 'heavy', 'rain hood'],
  ['Mild', 'Dry', false, null, null],
  ['Mild', 'Dry', true, 'light', null],
  ['Mild', 'Rain', false, 'light', 'rain hood'],
  ['Mild', 'Rain', true, 'light', 'rain hood'],
  ['Hot', 'Dry', false, null, 'sun hat'],
  ['Hot', 'Dry', true, 'light', 'sun hat'],
  ['Hot', 'Rain', false, 'light', 'rain hood'],
  ['Hot', 'Rain', true, 'light', 'rain hood'],
];
for (const [tier, modifier, windy, jacket, hat] of TABLE) {
  test(`${tier}-${modifier}${windy ? ' windy' : ''}: jacket ${jacket}, hat ${hat}`, () => {
    assert.equal(jacketFor({ tier, modifier, windy }), jacket);
    assert.equal(hatFor({ tier, modifier }), hat);
  });
}

const icon = (path) => `https://api.weather.gov/icons/land/${path}?size=medium`;

test('condition codes group into Clear, Overcast, Rain, Snow', () => {
  const cases = {
    'day/skc': 'Clear', 'day/few': 'Clear', 'day/sct': 'Clear',
    'day/bkn': 'Overcast', 'night/ovc': 'Overcast',
    'day/rain': 'Rain', 'day/rain_showers,50': 'Rain', 'day/rain_showers_hi': 'Rain', 'day/fzra': 'Rain',
    'day/sleet': 'Rain', 'day/tsra,40': 'Rain', 'day/tsra_sct': 'Rain', 'day/tsra_hi,40': 'Rain',
    'day/tornado': 'Rain', 'day/hurricane': 'Rain', 'day/tropical_storm': 'Rain',
    'day/snow': 'Snow', 'day/rain_snow': 'Snow', 'day/snow_sleet': 'Snow', 'day/blizzard': 'Snow',
  };
  for (const [path, group] of Object.entries(cases)) assert.equal(conditionFor(icon(path)), group, path);
});

test('wind_* variants group by their sky code', () => {
  assert.equal(conditionFor(icon('day/wind_skc')), 'Clear');
  assert.equal(conditionFor(icon('day/wind_ovc')), 'Overcast');
});

test('unmapped codes and bad input fall back to Overcast', () => {
  for (const path of ['day/fog', 'day/dust', 'day/smoke', 'day/haze', 'day/somethingnew']) {
    assert.equal(conditionFor(icon(path)), 'Overcast', path);
  }
  assert.equal(conditionFor(undefined), 'Overcast');
  assert.equal(conditionFor(null), 'Overcast');
  assert.equal(conditionFor('not a url'), 'Overcast');
});

test('an icon with several codes uses the most severe', () => {
  // Real Austin response: "Partly Cloudy then Chance Showers And Thunderstorms"
  assert.equal(conditionFor(icon('night/sct/tsra_hi,40')), 'Rain');
  assert.equal(conditionFor(icon('day/sct/ovc')), 'Overcast');
  assert.equal(conditionFor(icon('day/rain/snow')), 'Snow');
});

test('recommend() combines the rules', () => {
  const result = recommend({
    high: 60, baseline: 95, pop: 55, windMph: 20, heatIndex: null, windChill: 50, temperature: 58,
    icon: icon('day/rain_showers,50'),
  });
  assert.deepEqual(result, {
    tier: 'Cold', modifier: 'Rain', category: 'Cold-Rain', condition: 'Rain', windy: true,
    jacket: 'heavy', hat: 'rain hood', reminders: ['umbrella'],
    feelsLike: { value: 50, source: 'wind chill' },
  });
});
