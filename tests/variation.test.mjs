import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVariationStore, OPTION_COUNT } from '../js/variation.js';

// Deterministic random source that cycles through the given values.
const sequence = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test('returning to a date shows the same variation', () => {
  const store = createVariationStore(Math.random);
  store.setLocation('austin');
  const first = store.forDate('2026-10-15');
  store.forDate('2026-10-16');
  assert.deepEqual(store.forDate('2026-10-15'), first);
});

test('changing location clears stored variations', () => {
  // 0.0 -> option 0 for the first draw set, 0.99 -> option 2 for the next.
  const rng = sequence([0, 0, 0, 0, 0, 0.99, 0.99, 0.99, 0.99, 0.99]);
  const store = createVariationStore(rng);
  store.setLocation('austin');
  const austin = store.forDate('2026-10-15');
  store.setLocation('minneapolis');
  const minneapolis = store.forDate('2026-10-15');
  assert.notDeepEqual(minneapolis, austin);
  // Setting the same location again must not clear.
  store.setLocation('minneapolis');
  assert.deepEqual(store.forDate('2026-10-15'), minneapolis);
});

test('every draw is within the available options', () => {
  const store = createVariationStore(Math.random);
  store.setLocation('x');
  for (let day = 1; day <= 200; day++) {
    const { outfitVariation, reminderWording } = store.forDate(`d${day}`);
    for (const value of [...Object.values(outfitVariation), ...Object.values(reminderWording)]) {
      assert.ok(Number.isInteger(value) && value >= 0 && value < OPTION_COUNT);
    }
  }
});

test('draws are independent: every pairing of outfit and wording appears, none in lockstep', () => {
  const store = createVariationStore(Math.random);
  const pairs = new Set();
  const draws = [];
  for (let i = 0; i < 600; i++) {
    store.setLocation(`loc-${i}`); // a fresh draw each time
    const v = store.forDate('2026-10-15');
    draws.push(v);
    pairs.add(`${v.outfitVariation.shirt}/${v.reminderWording.umbrella}`);
  }
  assert.equal(pairs.size, OPTION_COUNT * OPTION_COUNT, 'shirt x umbrella wording should cover all 9 pairs');
  const umbrellaVsHydrationPairs = new Set(draws.map((v) => `${v.reminderWording.umbrella}/${v.reminderWording.hydration}`));
  assert.equal(umbrellaVsHydrationPairs.size, 9, 'the two reminder wordings should vary independently');
  const allThreeWordings = new Set(draws.map((v) => v.reminderWording.umbrella));
  assert.equal(allThreeWordings.size, 3);
});

test('nothing is written to storage', () => {
  globalThis.localStorage = { setItem() { throw new Error('storage written'); } };
  const store = createVariationStore();
  store.setLocation('x');
  store.forDate('2026-10-15');
  delete globalThis.localStorage;
});
