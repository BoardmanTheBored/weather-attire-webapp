// C1: inspect live NWS responses to confirm field names and empty values.
// Usage: node scripts/check-nws.mjs
const UA = { 'User-Agent': 'weather-attire-webapp dev check (amb22559@eid.utexas.edu)' };
const places = { Austin: [30.2672, -97.7431], Minneapolis: [44.9778, -93.265] };

const get = async (url) => {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};
const sample = (v, n = 4) => JSON.stringify(v?.slice?.(0, n) ?? v);

for (const [name, [lat, lon]] of Object.entries(places)) {
  console.log(`\n===== ${name} =====`);
  const pt = await get(`https://api.weather.gov/points/${lat},${lon}`);
  const p = pt.properties;
  console.log('points:', { forecast: p.forecast, grid: p.forecastGridData, tz: p.timeZone, city: p.relativeLocation?.properties });

  const fc = await get(p.forecast);
  const periods = fc.properties.periods;
  console.log('forecast periods:', periods.length);
  console.log('period keys:', Object.keys(periods[0]).join(', '));
  console.log('period[0]:', JSON.stringify(periods[0], null, 1));
  console.log('PoP values (first 6):', periods.slice(0, 6).map((x) => [x.name, x.isDaytime, x.temperature, x.probabilityOfPrecipitation]));
  console.log('windSpeed strings:', periods.slice(0, 6).map((x) => x.windSpeed));

  const grid = (await get(p.forecastGridData)).properties;
  console.log('grid keys:', Object.keys(grid).join(', '));
  for (const k of ['temperature', 'maxTemperature', 'heatIndex', 'windChill', 'apparentTemperature', 'windSpeed', 'windGust', 'probabilityOfPrecipitation', 'weather']) {
    const f = grid[k];
    if (!f) { console.log(`grid.${k}: MISSING`); continue; }
    const vals = f.values;
    const nulls = vals.filter((v) => v.value == null).length;
    console.log(`grid.${k}: uom=${f.uom} count=${vals.length} nullValues=${nulls} first=${sample(vals, 3)}`);
  }
}
