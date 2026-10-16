// Wiring and routing. Two screens share one page; the hash decides which shows.
import { loadStations } from './baseline.js';
import { ServiceError } from './errors.js';
import { fetchWeather, localDateKey } from './nws.js';
import { renderMain } from './render.js';
import { buildState } from './state.js';
import { loadLocation } from './storage.js';
import { createVariationStore } from './variation.js';

const screens = {
  main: document.getElementById('screen-main'),
  info: document.getElementById('screen-info'),
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

// ---------- Main screen data flow: saved location -> NWS -> state -> render ----------
const variation = createVariationStore();

async function showLocation(place, dateKey) {
  renderMain({ kind: 'loading', location: place, dateKey });
  try {
    const [stations, bundle] = await Promise.all([loadStations(), fetchWeather(place.lat, place.lon)]);
    const date = dateKey ?? localDateKey(Date.now(), bundle.timeZone);
    const state = buildState({ location: place, dateKey: date, bundle, stations, variation });
    renderMain({ kind: 'state', location: place, dateKey: date, state });
  } catch (error) {
    // Full error and retry handling arrives in checkpoint C7.
    const message = error instanceof ServiceError ? error.message : "Couldn't reach the weather service";
    renderMain({ kind: 'error', location: place, dateKey, message });
  }
}

const saved = loadLocation();
if (saved) showLocation(saved);
else renderMain({ kind: 'empty' });
