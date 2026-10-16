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
  figure.append(...outfitLayerUrls(state).map((src) => el('img', { attrs: { src, alt: '', width: 400, height: 800 } })));
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
  if (view.kind === 'error') return panel.append(message(view.message ?? "Couldn't reach the weather service"));
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
