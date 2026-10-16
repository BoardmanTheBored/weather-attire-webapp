// Builds data/normals.json from the NOAA NCEI 1991-2020 monthly U.S. Climate Normals.
//
// Inputs (extract from the "monthly temperature by-variable" archive at
// https://www.ncei.noaa.gov/data/normals-monthly/1991-2020/archive/):
//   mly-normal-allall.csv  monthly normals per station (MLY-TMAX-NORMAL, degrees F)
//   mly_inventory.txt      fixed-width station list: id, lat, lon, elevation, state, name
//
// Usage: node scripts/build-normals.mjs <mly-normal-allall.csv> <mly_inventory.txt> [out.json]
//
// Output: { source, stations: [[lat, lon, [Jan..Dec normal high in F]], ...] }
// US states, DC, PR and territories only; stations missing any month are dropped.
import { readFileSync, writeFileSync } from 'node:fs';

const [normalsPath, inventoryPath, outPath = 'data/normals.json'] = process.argv.slice(2);
if (!normalsPath || !inventoryPath) {
  console.error('Usage: node scripts/build-normals.mjs <mly-normal-allall.csv> <mly_inventory.txt> [out.json]');
  process.exit(1);
}

// US states, DC, Puerto Rico, Virgin Islands (spec: US locations only). Excludes Canada and Pacific territories.
const US_CODES = new Set(
  'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY PR VI'.split(' '),
);

// Inventory columns (1-indexed): id 1-11, lat 13-20, lon 22-30, state 39-40.
const places = new Map();
for (const line of readFileSync(inventoryPath, 'utf8').split('\n')) {
  if (line.length < 40) continue;
  const state = line.slice(38, 40);
  if (!US_CODES.has(state)) continue;
  places.set(line.slice(0, 11), [Number(line.slice(12, 20)), Number(line.slice(21, 30))]);
}

// Normals CSV: find the TMAX column by name, then collect 12 monthly values per station.
const rows = readFileSync(normalsPath, 'utf8').trim().split('\n');
const header = rows[0].split(',');
const tmaxCol = header.indexOf('MLY-TMAX-NORMAL');
if (tmaxCol < 0) throw new Error('MLY-TMAX-NORMAL column not found');

const monthly = new Map();
for (const row of rows.slice(1)) {
  const cols = row.split(',');
  const id = cols[0];
  if (!places.has(id)) continue;
  const month = Number(cols[1]);
  const value = Number(cols[tmaxCol]);
  // NCEI uses negative sentinels (e.g. -9999) for missing; real normal highs are above -60 F.
  if (!Number.isFinite(value) || value < -60 || month < 1 || month > 12) continue;
  if (!monthly.has(id)) monthly.set(id, new Array(12).fill(null));
  monthly.get(id)[month - 1] = Math.round(value * 10) / 10;
}

const stations = [];
for (const [id, values] of monthly) {
  if (values.includes(null)) continue;
  const [lat, lon] = places.get(id);
  stations.push([Math.round(lat * 100) / 100, Math.round(lon * 100) / 100, values]);
}

const json = JSON.stringify({
  source: 'NOAA NCEI U.S. Climate Normals 1991-2020, monthly mean daily maximum temperature (MLY-TMAX-NORMAL), degrees F',
  stations,
});
writeFileSync(outPath, json);
console.log(`stations kept: ${stations.length} (of ${places.size} US inventory, ${monthly.size} with TMAX data)`);
console.log(`wrote ${outPath}: ${(json.length / 1024).toFixed(0)} KB`);
