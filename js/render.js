// The only code that writes to the DOM. It reads a "view" and never fetches or decides anything.
// view.kind: 'empty' | 'loading' | 'error' | 'state'. For 'state', view.state is the recommendation state.
// All text goes in via textContent (NWS strings are untrusted).
import { CONDITION_ICONS, iconUrl, outfitLayerUrls } from './assets.js';
import {
  REMINDER_LABELS, conditionsText, feelsLikeText, formatDate, modeLabel, outfitAltText, precipitationText,
  recommendationSentence, reminderText, temperatureText, windText,
} from './describe.js';

const $ = (id) => document.getElementById(id);

function el(tag, { className, text, attrs } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  for (const [name, value] of Object.entries(attrs ?? {})) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

// An icon is always paired with a text label so nothing depends on the picture or its color (R13).
const labeledIcon = (iconName, label, className) =>
  el('li', { className: `icon-item ${className ?? ''}` }, [
    el('img', { attrs: { src: iconUrl(iconName), alt: '', width: 40, height: 40 } }),
    el('span', { text: label }),
  ]);

function renderHeader(view) {
  const icons = $('header-icons');
  const block = $('header-block');
  icons.replaceChildren();
  block.replaceChildren();

  const { location, dateKey, state } = view;
  const name = location?.name ?? 'Choose a location';
  const parts = [el('span', { className: 'header-location', text: name })];
  if (dateKey) {
    const mode = state ? ` · ${modeLabel(state)}` : '';
    parts.push(el('span', { className: 'header-date', text: `${formatDate(dateKey)}${mode}` }));
  }
  if (state?.status === 'ok') {
    parts.push(el('span', { className: 'header-temp', text: `${state.inputs.temperature}°F` }));
    icons.append(labeledIcon('thermometer', state.tier, 'tier'), labeledIcon(CONDITION_ICONS[state.condition], state.condition));
    if (state.windy) icons.append(labeledIcon('windy', 'Windy'));
  }
  block.append(...parts);
  block.setAttribute('aria-label', location ? `${name}, ${dateKey ? formatDate(dateKey) : ''}. Change location or date` : 'Choose a location');
}

function message(text, className = 'status-message') {
  return el('p', { className, text });
}

function renderCharacter(view) {
  const area = $('character-area');
  area.replaceChildren();
  const { state } = view;
  if (view.kind === 'loading') return area.append(message('Loading forecast…'));
  if (state?.status !== 'ok') return;

  const figure = el('div', { className: 'character', attrs: { role: 'img', 'aria-label': outfitAltText(state) } });
  figure.append(...outfitLayerUrls(state).map((src) => el('img', { attrs: { src, alt: '', width: 384, height: 768 } })));
  area.append(figure, el('p', { className: 'recommendation', text: recommendationSentence(state) }));
}

function row(label, value) {
  return el('div', { className: 'row' }, [el('dt', { text: label }), el('dd', { text: value })]);
}

function renderBreakdown(view) {
  const panel = $('breakdown-content');
  panel.replaceChildren();
  const { state } = view;

  if (view.kind === 'loading') return panel.append(message('Loading forecast…'));
  if (view.kind === 'empty') return panel.append(message('Tap the header to choose a location.'));
  if (view.kind === 'error') {
    return panel.append(
      message(view.message),
      el('button', { className: 'btn retry', text: 'Retry', attrs: { id: 'retry-button', type: 'button' } }),
    );
  }
  if (state.status === 'no-temperature') {
    return panel.append(message('No temperature forecast is available for this date, so there is no outfit suggestion.'));
  }

  panel.append(
    el('dl', { className: 'rows' }, [
      row('Conditions', conditionsText(state)),
      row('Temperature', temperatureText(state)),
      row('Feels like', feelsLikeText(state)),
      row('Precipitation', precipitationText(state)),
      row('Wind', windText(state)),
    ]),
  );

  if (state.reminders.length) {
    panel.append(
      el(
        'ul',
        { className: 'reminders' },
        state.reminders.map((reminder) =>
          el('li', { className: 'reminder' }, [
            el('img', { attrs: { src: iconUrl(reminder), alt: '', width: 32, height: 32 } }),
            el('span', {}, [
              el('strong', { text: `${REMINDER_LABELS[reminder]}: ` }),
              document.createTextNode(reminderText(state, reminder)),
            ]),
          ]),
        ),
      ),
    );
  }
  panel.append(el('p', { className: 'source', text: 'Source: National Weather Service' }));
}

export function renderMain(view) {
  renderHeader(view);
  renderCharacter(view);
  renderBreakdown(view);
}

// ---------- 7-day strip (laptop layout) ----------

// days: [{ date, status, tier, condition, high }] from summarizeDays; empty when there is no forecast.
export function renderWeek({ days, selected, todayKey }) {
  const strip = $('week-strip');
  // Rebuilding the buttons would drop keyboard focus, so remember which day had it.
  const focusedDate = strip.contains(document.activeElement) ? document.activeElement.dataset.date : null;
  strip.replaceChildren();
  for (const day of days) {
    const [weekday, ...rest] = formatDate(day.date).split(', ');
    const ok = day.status === 'ok';
    const summary = ok ? `${day.tier}, ${day.condition}, high ${day.high}°F` : 'no temperature forecast';
    const details = ok
      ? [
          el('ul', { className: 'week-icons' }, [
            labeledIcon('thermometer', day.tier),
            labeledIcon(CONDITION_ICONS[day.condition], day.condition),
          ]),
          el('span', { className: 'week-high', text: `${day.high}°F` }),
        ]
      : [el('span', { className: 'week-none', text: 'No data' })];
    strip.append(
      el(
        'button',
        {
          className: 'week-day',
          attrs: {
            type: 'button',
            'data-date': day.date,
            'aria-pressed': String(day.date === selected),
            'aria-label': `${formatDate(day.date)}: ${summary}`,
          },
        },
        [
          el('span', { className: 'week-day-name', text: day.date === todayKey ? 'Today' : weekday }),
          el('span', { className: 'week-day-date', text: rest.join(', ') }),
          ...details,
        ],
      ),
    );
  }
  if (focusedDate) strip.querySelector(`[data-date="${focusedDate}"]`)?.focus();
}

// ---------- Location and date sheet ----------

// dates: ["YYYY-MM-DD", ...]; notice is the inline message (e.g. "No US match found")
export function renderSheet({ dates, selected, todayKey, notice = '', busy = false }) {
  $('sheet-message').textContent = notice;
  $('search-button').disabled = busy;
  $('use-location').disabled = busy;
  $('search-button').textContent = busy ? 'Searching…' : 'Search';

  const options = $('date-options');
  options.replaceChildren();
  if (dates.length === 0) {
    options.append(message('Choose a location to see its dates.'));
    return;
  }
  for (const key of dates) {
    const input = el('input', { attrs: { type: 'radio', name: 'date', value: key } });
    input.checked = key === selected;
    const isToday = key === todayKey;
    const [weekday, ...rest] = formatDate(key).split(', ');
    options.append(
      el('label', { className: 'date-chip' }, [
        input,
        el('span', { className: 'date-chip-face' }, [
          el('span', { className: 'date-chip-day', text: isToday ? 'Today' : weekday }),
          el('span', { text: rest.join(', ') }),
        ]),
      ]),
    );
  }
}

export function openSheet() {
  const sheet = $('sheet');
  if (!sheet.open) sheet.showModal();
}

export function closeSheet() {
  const sheet = $('sheet');
  if (sheet.open) sheet.close();
}

// Keeps Tab and Shift+Tab cycling inside the open sheet. The native dialog already keeps focus
// off the page behind it; this removes the extra stop on the browser's own controls (R13).
export function trapSheetFocus(event) {
  if (event.key !== 'Tab') return;
  const controls = [...$('sheet').querySelectorAll('button, input')].filter((control) => {
    if (control.disabled) return false;
    // Only one radio per group is in the tab order: the checked one, or the first if none is.
    if (control.type !== 'radio') return true;
    const group = [...$('sheet').querySelectorAll(`input[type="radio"][name="${control.name}"]`)];
    return control.checked || (!group.some((radio) => radio.checked) && control === group[0]);
  });
  if (controls.length === 0) return;
  const first = controls[0];
  const last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

export const readSearchQuery =() => $('search-input').value;
export const focusSearchField = () => $('search-input').focus();
