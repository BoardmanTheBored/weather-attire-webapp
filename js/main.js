// Wiring and routing. Two screens share one page; the hash decides which shows.
import { loadStations } from './baseline.js';
import { NoMatchError, ServiceError } from './errors.js';
import { geocode } from './geocode.js';
import { dateOptions, fetchWeather, localDateKey } from './nws.js';
import {
  closeSheet, focusSearchField, openSheet, readSearchQuery, renderMain, renderSheet, renderWeek, trapSheetFocus,
} from './render.js';
import { buildState, summarizeDays } from './state.js';
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
// location: { name, lat?, lon? }. bundle: NWS data for 7 days. error: { message, retry } when a
// service failed. Everything on screen is drawn from this object.
const app = { location: null, bundle: null, dateKey: null, error: null };
const sheet = { notice: '', busy: false };
let requestId = 0; // a newer request makes an older one's result stale
let stationsPromise = null;

class PermissionDeniedError extends Error {}

// The device's own calendar day, used for the header while the location's time zone is not yet known.
const deviceToday = () => localDateKey(Date.now(), Intl.DateTimeFormat().resolvedOptions().timeZone);

function ensureStations() {
  stationsPromise ??= loadStations().catch(() => {
    stationsPromise = null; // allow a retry
    throw new ServiceError("Couldn't load the seasonal temperature data");
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

function updateSheet(patch) {
  Object.assign(sheet, patch);
  drawSheet();
}

async function redraw() {
  const { location: place, bundle, dateKey, error } = app;
  let week = [];
  if (error) {
    renderMain({ kind: 'error', location: place, dateKey: deviceToday(), message: error.message });
  } else if (!place) {
    renderMain({ kind: 'empty' });
  } else if (!bundle) {
    renderMain({ kind: 'loading', location: place, dateKey: deviceToday() });
  } else {
    const stations = await ensureStations();
    const state = buildState({ location: place, dateKey, bundle, stations, variation });
    renderMain({ kind: 'state', location: place, dateKey, state });
    week = summarizeDays({ location: place, bundle, stations });
  }
  renderWeek({ days: week, selected: dateKey, todayKey: bundle ? localDateKey(Date.now(), bundle.timeZone) : null });
  drawSheet();
}

// Service failure: clear the outfit and show the message with Retry in the breakdown area.
function showFailure(error, name, retry) {
  const message = error instanceof ServiceError ? error.message : "Couldn't reach the weather service";
  Object.assign(app, { location: { name }, bundle: null, dateKey: null, error: { message, retry } });
  return redraw();
}

// Show the loading state for a place (location and date in the header, no outfit).
function showLoading(name) {
  Object.assign(app, { location: { name }, bundle: null, dateKey: null, error: null });
  return redraw();
}

// Fetches weather for coordinates and names the place from NWS (city, state).
async function fetchPlace(lat, lon) {
  const [bundle] = await Promise.all([fetchWeather(lat, lon), ensureStations()]);
  const name = bundle.place ? `${bundle.place.city}, ${bundle.place.state}` : `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  return { bundle, place: { name, lat, lon } };
}

// Makes a fetched place current (a new location always starts on today) and remembers it (R4).
function applyPlace({ bundle, place }) {
  Object.assign(app, { location: place, bundle, dateKey: localDateKey(Date.now(), bundle.timeZone), error: null });
  saveLocation(place);
  return redraw();
}

async function loadSavedLocation(place) {
  const id = ++requestId;
  showLoading(place.name);
  try {
    const result = await fetchPlace(place.lat, place.lon);
    if (id === requestId) await applyPlace(result);
  } catch (error) {
    if (id === requestId) await showFailure(error, place.name, () => loadSavedLocation(place));
  }
}

// Shared by Search and "Use my location". Unmatched and denied show inline in the sheet and keep
// the previous location. A service failure closes the sheet and shows the error with Retry.
async function changeLocation(lookup, label, { fromRetry = false } = {}) {
  const id = ++requestId;
  updateSheet({ busy: true, notice: '' });
  if (fromRetry) await showLoading(label);
  try {
    const { lat, lon } = await lookup();
    const result = await fetchPlace(lat, lon);
    if (id !== requestId) return;
    updateSheet({ busy: false });
    await applyPlace(result);
    closeSheet();
  } catch (error) {
    if (id !== requestId) return;
    updateSheet({ busy: false });
    if (error instanceof PermissionDeniedError) {
      updateSheet({ notice: 'Location permission denied. Type a city or ZIP instead' });
      focusSearchField();
    } else if (error instanceof NoMatchError) {
      updateSheet({ notice: 'No US match found' });
    } else if (error instanceof ServiceError) {
      await showFailure(error, label, () => changeLocation(lookup, label, { fromRetry: true }));
      closeSheet();
    } else {
      updateSheet({ notice: "Couldn't find your location. Type a city or ZIP instead" });
    }
  }
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
  if (sheet.busy) return;
  const query = readSearchQuery().trim();
  changeLocation(() => geocode(query), query);
});
$('use-location').addEventListener('click', () => {
  if (!sheet.busy) changeLocation(devicePosition, 'Your location');
});
$('date-options').addEventListener('change', (event) => {
  if (event.target.name !== 'date') return;
  app.dateKey = event.target.value;
  redraw();
  closeSheet();
});
$('week-strip').addEventListener('click', (event) => {
  const day = event.target.closest('.week-day');
  if (!day) return;
  app.dateKey = day.dataset.date;
  redraw();
});
$('breakdown-content').addEventListener('click', (event) => {
  if (event.target.id === 'retry-button') app.error?.retry();
});
$('sheet').addEventListener('keydown', trapSheetFocus);
// A tap on the dimmed backdrop (the dialog element itself) closes the sheet.
$('sheet').addEventListener('click', (event) => {
  if (event.target === $('sheet')) closeSheet();
});

const saved = loadLocation();
if (saved) loadSavedLocation(saved);
else redraw();
