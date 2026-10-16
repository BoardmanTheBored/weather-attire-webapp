// Wiring and routing. Two screens share one page; the hash decides which shows.
import { loadStations } from './baseline.js';
import { NoMatchError, ServiceError } from './errors.js';
import { geocode } from './geocode.js';
import { dateOptions, fetchWeather, localDateKey } from './nws.js';
import {
  closeSheet, focusSearchField, openSheet, readSearchQuery, renderMain, renderSheet, trapSheetFocus,
} from './render.js';
import { buildState } from './state.js';
import { loadLocation, saveLocation } from './storage.js';
import { createVariationStore } from './variation.js';

const $ = (id) => document.getElementById(id);

const screens = {
  main: $('screen-main'),
  info: $('screen-info'),
};

function route({ moveFocus }) {
  const showInfo = location.hash === '#/info';
  screens.main.hidden = showInfo;
  screens.info.hidden = !showInfo;
  window.scrollTo(0, 0);
  if (!moveFocus) return;
  // After navigating, move focus to the new screen's heading so keyboard and
  // screen-reader users land at the top. Skipped on first load.
  const heading = (showInfo ? screens.info : screens.main).querySelector('h1');
  heading.tabIndex = -1;
  heading.focus();
}

window.addEventListener('hashchange', () => route({ moveFocus: true }));
route({ moveFocus: false });

// ---------- Main screen data flow: location -> NWS -> state -> render ----------
const variation = createVariationStore();
const app = { location: null, bundle: null, dateKey: null };
const sheet = { notice: '', busy: false };
let requestId = 0; // a newer request makes an older one's result stale
let stationsPromise = null;

class PermissionDeniedError extends Error {}

function ensureStations() {
  stationsPromise ??= loadStations().catch((error) => {
    stationsPromise = null; // allow a retry
    throw error;
  });
  return stationsPromise;
}

function drawSheet() {
  const { bundle, dateKey } = app;
  renderSheet({
    dates: bundle ? dateOptions(bundle) : [],
    selected: dateKey,
    todayKey: bundle ? localDateKey(Date.now(), bundle.timeZone) : null,
    ...sheet,
  });
}

// Everything on screen is redrawn from `app`; nothing else decides what shows.
async function redraw() {
  const { location: place, bundle, dateKey } = app;
  if (!place) renderMain({ kind: 'empty' });
  else if (!bundle) renderMain({ kind: 'loading', location: place });
  else {
    const stations = await ensureStations();
    const state = buildState({ location: place, dateKey, bundle, stations, variation });
    renderMain({ kind: 'state', location: place, dateKey, state });
  }
  drawSheet();
}

function updateSheet(patch) {
  Object.assign(sheet, patch);
  drawSheet();
}

// Fetches weather for coordinates and names the place from NWS (city, state).
async function fetchPlace(lat, lon) {
  const [bundle] = await Promise.all([fetchWeather(lat, lon), ensureStations()]);
  const name = bundle.place ? `${bundle.place.city}, ${bundle.place.state}` : `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  return { bundle, place: { name, lat, lon } };
}

// Makes a fetched place current (a new location always starts on today) and remembers it (R4).
function applyPlace({ bundle, place }) {
  app.location = place;
  app.bundle = bundle;
  app.dateKey = localDateKey(Date.now(), bundle.timeZone);
  saveLocation(place);
  return redraw();
}

async function loadSavedLocation(place) {
  const id = ++requestId;
  app.location = place;
  app.bundle = null;
  redraw();
  try {
    const result = await fetchPlace(place.lat, place.lon);
    if (id === requestId) await applyPlace(result);
  } catch (error) {
    // Full error and retry handling arrives in checkpoint C7.
    if (id !== requestId) return;
    const message = error instanceof ServiceError ? error.message : "Couldn't reach the weather service";
    renderMain({ kind: 'error', location: place, message });
  }
}

// Shared by Search and "Use my location". On failure the sheet stays open with a message and
// the previous location is kept.
async function changeLocation(lookup) {
  const id = ++requestId;
  updateSheet({ busy: true, notice: '' });
  try {
    const { lat, lon } = await lookup();
    const result = await fetchPlace(lat, lon);
    if (id !== requestId) return;
    updateSheet({ busy: false, notice: '' });
    await applyPlace(result);
    closeSheet();
  } catch (error) {
    if (id !== requestId) return;
    updateSheet({ busy: false, notice: messageFor(error) });
    if (error instanceof PermissionDeniedError) focusSearchField();
  }
}

function messageFor(error) {
  if (error instanceof PermissionDeniedError) return 'Location permission denied. Type a city or ZIP instead';
  if (error instanceof NoMatchError) return 'No US match found';
  if (error instanceof ServiceError) return "Couldn't reach the location service. Try again.";
  return "Couldn't find your location. Type a city or ZIP instead";
}

function devicePosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
      (error) => reject(error.code === error.PERMISSION_DENIED ? new PermissionDeniedError() : error),
      { timeout: 10000, maximumAge: 300000 },
    );
  });
}

// Events. Nothing listens to typing: a request happens only when the user presses Search (R2).
$('header-block').addEventListener('click', openSheet);
$('sheet-close').addEventListener('click', closeSheet);
$('search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!sheet.busy) changeLocation(() => geocode(readSearchQuery()));
});
$('use-location').addEventListener('click', () => {
  if (!sheet.busy) changeLocation(devicePosition);
});
$('date-options').addEventListener('change', (event) => {
  if (event.target.name !== 'date') return;
  app.dateKey = event.target.value;
  redraw();
  closeSheet();
});
$('sheet').addEventListener('keydown', trapSheetFocus);
// A tap on the dimmed backdrop (the dialog element itself) closes the sheet.
$('sheet').addEventListener('click', (event) => {
  if (event.target === $('sheet')) closeSheet();
});

const saved = loadLocation();
if (saved) loadSavedLocation(saved);
else redraw();
