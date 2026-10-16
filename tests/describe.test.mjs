import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDate, recommendationSentence, outfitAltText, temperatureText, feelsLikeText, windText,
  precipitationText, conditionsText, reminderText, REMINDER_WORDINGS,
} from '../js/describe.js';
import { outfitLayerUrls } from '../js/assets.js';

const state = (over = {}) => ({
  mode: 'current', date: '2026-10-15', jacket: 'light', hat: 'rain hood', windy: false,
  outfitVariation: { shirt: 1, pants: 0, shoes: 0 }, reminderWording: { umbrella: 2, hydration: 0 },
  inputs: { high: 90, low: 64, baseline: 81, pop: 43, windMph: 15, shortForecast: 'Sunny' },
  feelsLike: { value: 84, source: 'heat index' },
  ...over,
});

test('formatDate does not shift the day', () => {
  assert.equal(formatDate('2026-10-15'), 'Thu, Oct 15');
  assert.equal(formatDate('2026-01-01'), 'Thu, Jan 1');
});

test('sentence for today with jacket and hat', () => {
  assert.equal(
    recommendationSentence(state()),
    'Based on current weather, one potential outfit for today would be a light jacket, shirt, pants, with sneakers and a rain hood.',
  );
});

test('sentence for a forecast date uses the date', () => {
  assert.equal(
    recommendationSentence(state({ mode: 'forecast', date: '2026-10-17', jacket: 'heavy', hat: 'beanie' })),
    'Based on the forecast, one potential outfit for Sat, Oct 17 would be a heavy jacket, shirt, pants, with sneakers and a beanie.',
  );
});

test('sentence drops a missing jacket and a missing hat', () => {
  assert.equal(
    recommendationSentence(state({ jacket: null, hat: null })),
    'Based on current weather, one potential outfit for today would be a shirt, pants, with sneakers.',
  );
  assert.match(recommendationSentence(state({ jacket: null })), /a shirt, pants, with sneakers and a rain hood\.$/);
  assert.match(recommendationSentence(state({ hat: null })), /a light jacket, shirt, pants, with sneakers\.$/);
});

test('alt text describes the drawn outfit and matches the layers', () => {
  const s = state();
  assert.equal(outfitAltText(s), 'Mannequin wearing a rain hood, a light jacket, a blue shirt, navy pants and sneakers.');
  const layers = outfitLayerUrls(s);
  assert.equal(layers.length, 6); // mannequin, pants, shoes, shirt, jacket, hat
  assert.ok(layers[0].includes('mannequin'));
  assert.ok(layers.at(-1).includes('hat-rain'));
  assert.equal(outfitLayerUrls(state({ jacket: null, hat: null })).length, 4);
});

test('breakdown row text', () => {
  const s = state();
  assert.equal(temperatureText(s), 'High 90°F, low 64°F; 9°F above the seasonal normal (81°F)');
  assert.equal(temperatureText(state({ inputs: { ...s.inputs, high: 70, low: null } })), 'High 70°F; 11°F below the seasonal normal (81°F)');
  assert.equal(temperatureText(state({ inputs: { ...s.inputs, high: 81 } })), 'High 81°F, low 64°F; the same as the seasonal normal (81°F)');
  assert.equal(feelsLikeText(s), '84°F (highest heat index)');
  assert.equal(feelsLikeText(state({ feelsLike: { value: 29, source: 'wind chill' } })), '29°F (lowest wind chill)');
  assert.equal(feelsLikeText(state({ feelsLike: { value: 68, source: 'temperature' } })), '68°F');
  assert.equal(precipitationText(s), '43%');
  assert.equal(windText(s), '15 mph');
  assert.equal(windText(state({ windy: true, inputs: { ...s.inputs, windMph: 20 } })), '20 mph (windy)');
  assert.equal(conditionsText(s), 'Sunny');
});

test('missing secondary fields read "Not available"', () => {
  const s = state({ inputs: { ...state().inputs, pop: null, windMph: null, shortForecast: null } });
  assert.equal(precipitationText(s), 'Not available');
  assert.equal(windText(s), 'Not available');
  assert.equal(conditionsText(s), 'Not available');
});

test('each reminder has 3 distinct wordings and the state picks one', () => {
  for (const wordings of Object.values(REMINDER_WORDINGS)) assert.equal(new Set(wordings).size, 3);
  assert.equal(reminderText(state(), 'umbrella'), REMINDER_WORDINGS.umbrella[2]);
  assert.equal(reminderText(state(), 'hydration'), REMINDER_WORDINGS.hydration[0]);
});
