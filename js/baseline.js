// Seasonal baseline: the NCEI 1991-2020 normal daily high (degrees F) for the station
// nearest a location, interpolated by day of year between monthly normals.
// Data comes from data/normals.json (built by scripts/build-normals.mjs): stations are
// [lat, lon, [12 monthly normal highs]].

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;

// Great-circle distance in km (haversine).
function distanceKm(lat1, lon1, lat2, lon2) {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function nearestStation(stations, lat, lon) {
  let best = null;
  let bestKm = Infinity;
  for (const station of stations) {
    const km = distanceKm(lat, lon, station[0], station[1]);
    if (km < bestKm) {
      bestKm = km;
      best = station;
    }
  }
  return { station: best, distanceKm: bestKm };
}

// Each monthly normal is treated as the value on the 15th of its month; days in
// between are linearly interpolated, wrapping December to January.
// `date` is a calendar date { year, month (1-12), day }.
export function interpolateMonthly(monthlyValues, { year, month, day }) {
  const target = Date.UTC(year, month - 1, day);
  // Anchors: the 15th of the previous, current, and next month relative to the target month.
  for (let offset = -1; offset <= 1; offset++) {
    const a = anchor(year, month - 1 + offset, monthlyValues);
    const b = anchor(year, month + offset, monthlyValues);
    if (target >= a.time && target <= b.time) {
      return a.value + ((b.value - a.value) * (target - a.time)) / (b.time - a.time);
    }
  }
  throw new Error('date outside interpolation range');
}

function anchor(year, monthIndex, monthlyValues) {
  // Date.UTC normalizes monthIndex values outside 0-11 into the adjacent year.
  return { time: Date.UTC(year, monthIndex, 15), value: monthlyValues[((monthIndex % 12) + 12) % 12] };
}

export function normalHigh(stations, lat, lon, date) {
  const { station } = nearestStation(stations, lat, lon);
  return interpolateMonthly(station[2], date);
}

// Browser/Node loader for the bundled file.
export async function loadStations(url = 'data/normals.json') {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url}: ${response.status}`);
  return (await response.json()).stations;
}
