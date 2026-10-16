import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { interpolateMonthly, nearestStation, normalHigh } from '../js/baseline.js';

const { stations } = JSON.parse(readFileSync(new URL('../data/normals.json', import.meta.url), 'utf8'));

const AUSTIN = [30.27, -97.74];
const MINNEAPOLIS = [44.98, -93.27];
const ANCHORAGE = [61.22, -149.9];
const HONOLULU = [21.31, -157.86];
const SAN_JUAN = [18.47, -66.11];

const date = (month, day, year = 2026) => ({ year, month, day });

test('interpolation returns the monthly value on the 15th', () => {
  const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  assert.equal(interpolateMonthly(values, date(3, 15)), 30);
});

test('interpolation is linear between mid-months', () => {
  const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  // Halfway between Mar 15 (30) and Apr 15 (40) is Mar 30/31: 15 of 31 days.
  assert.ok(Math.abs(interpolateMonthly(values, date(3, 31)) - (30 + (10 * 16) / 31)) < 1e-9);
});

test('interpolation wraps December to January and January to December', () => {
  const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  const lateDec = interpolateMonthly(values, date(12, 31));
  assert.ok(lateDec < 120 && lateDec > 10, `Dec 31 should fall between Dec and Jan normals, got ${lateDec}`);
  const earlyJan = interpolateMonthly(values, date(1, 1));
  assert.ok(earlyJan < 120 && earlyJan > 10, `Jan 1 should fall between Dec and Jan normals, got ${earlyJan}`);
});

test('interpolation handles every day of a leap year without throwing', () => {
  const values = Array.from({ length: 12 }, (_, i) => i);
  for (let d = 0; d < 366; d++) {
    const t = new Date(Date.UTC(2028, 0, 1 + d));
    interpolateMonthly(values, { year: 2028, month: t.getUTCMonth() + 1, day: t.getUTCDate() });
  }
});

test('Austin and Minneapolis give plausible January and July normal highs', () => {
  const austinJan = normalHigh(stations, ...AUSTIN, date(1, 15));
  const austinJul = normalHigh(stations, ...AUSTIN, date(7, 15));
  const mspJan = normalHigh(stations, ...MINNEAPOLIS, date(1, 15));
  const mspJul = normalHigh(stations, ...MINNEAPOLIS, date(7, 15));
  console.log({ austinJan, austinJul, mspJan, mspJul });
  assert.ok(austinJan > 55 && austinJan < 68, `Austin Jan ${austinJan}`);
  assert.ok(austinJul > 92 && austinJul < 100, `Austin Jul ${austinJul}`);
  assert.ok(mspJan > 18 && mspJan < 28, `Minneapolis Jan ${mspJan}`);
  assert.ok(mspJul > 80 && mspJul < 87, `Minneapolis Jul ${mspJul}`);
});

test('Alaska, Hawaii and Puerto Rico resolve to a nearby station', () => {
  for (const [name, [lat, lon]] of Object.entries({ ANCHORAGE, HONOLULU, SAN_JUAN })) {
    const { station, distanceKm } = nearestStation(stations, lat, lon);
    console.log(name, 'nearest station km:', distanceKm.toFixed(1));
    assert.ok(distanceKm < 50, `${name} nearest station ${distanceKm} km away`);
    assert.equal(station[2].length, 12);
  }
  assert.ok(normalHigh(stations, ...ANCHORAGE, date(1, 15)) < 30);
  assert.ok(normalHigh(stations, ...HONOLULU, date(7, 15)) > 80);
  assert.ok(normalHigh(stations, ...SAN_JUAN, date(7, 15)) > 85);
});

test('bundled data has no missing months and no non-US coordinates', () => {
  for (const [lat, lon, values] of stations) {
    assert.equal(values.length, 12);
    assert.ok(values.every(Number.isFinite));
    assert.ok(lat > 17 && lat < 72, `lat ${lat}`);
    assert.ok(lon < -64 || lon > 172, `lon ${lon}`); // 172+ only for western Aleutians
  }
});
