import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HYDRATION_HEAT_INDEX_F, MILD_BAND_F, RAIN_POP_PERCENT, WINDY_MPH } from '../js/recommend.js';

// The information screen is static HTML, so these tests keep it honest against the code (R10).
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const section = html.slice(html.indexOf('<main id="screen-info"'), html.indexOf('</main>', html.indexOf('<main id="screen-info"')));
const text = section
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&deg;/g, '°').replace(/&rsquo;/g, '’').replace(/&ldquo;|&rdquo;/g, '"').replace(/&ndash;/g, '–').replace(/&copy;/g, '©').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ');

test('R10: every required item is on the information screen', () => {
  const required = {
    creator: 'Created by Anthony Boardman',
    'weather data source': 'National Weather Service',
    'api host': 'api.weather.gov',
    CDC: 'CDC',
    'NWS probability of precipitation': 'probability of precipitation',
    'NWS heat index': 'NWS heat index',
    'NCEI normals': 'NOAA NCEI 1991–2020 U.S. Climate Normals',
    privacy: 'Privacy',
    'saved location': 'local storage',
    'AI art disclosure': 'AI-generated',
    'art tool': 'Gemini',
    'art licence': 'does not claim ownership',
    'OSM attribution': '© OpenStreetMap contributors',
    ODbL: 'ODbL',
    'Current note': 'nearest hour',
  };
  for (const [name, needle] of Object.entries(required)) assert.ok(text.includes(needle), `missing: ${name} ("${needle}")`);
  assert.ok(/not a measured observation/.test(text), '"Current" is not an observation');
});

test('thresholds in the text match the code', () => {
  assert.ok(text.includes(`${MILD_BAND_F}°F of normal is Mild`));
  assert.ok(text.includes(`${RAIN_POP_PERCENT}% or more counts as rain`));
  assert.ok(text.includes(`${WINDY_MPH} mph or more`));
  assert.ok(text.includes(`${HYDRATION_HEAT_INDEX_F}°F or higher`));
  assert.ok(text.includes(`${RAIN_POP_PERCENT}% or more`) && /Umbrella reminder/.test(text));
});

test('every external link is https and names its source', () => {
  const links = [...section.matchAll(/<a href="([^"#][^"]*)"[^>]*>([^<]+)<\/a>/g)].filter((m) => !m[1].startsWith('#'));
  assert.ok(links.length >= 9, `found ${links.length} links`);
  for (const [, href, label] of links) {
    assert.ok(href.startsWith('https://'), href);
    assert.ok(label.trim().length > 3, `link text too short for ${href}`);
  }
});

test('the art credit paragraph exists so C10 can replace it', () => {
  assert.ok(section.includes('id="art-credit"'));
});
