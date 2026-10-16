// Pure text for the screen: the written recommendation, reminder wording, alt text and breakdown
// rows. Everything is derived from the recommendation state (R6).
import { PANTS_NAMES, SHIRT_NAMES, SHOE_NAMES } from './assets.js';

// Three wordings per reminder; the state's reminderWording index picks one (spec: Content variation).
export const REMINDER_WORDINGS = {
  umbrella: ['Bring an umbrella!', 'Rain is likely, so pack an umbrella.', "Don't forget your umbrella."],
  hydration: ['Bring water!', 'Stay hydrated and carry a water bottle.', "It's hot out, so drink plenty of water."],
};

export const REMINDER_LABELS = { umbrella: 'Umbrella', hydration: 'Hydration' };

// "Thu, Oct 15" from a "YYYY-MM-DD" key (formatted in UTC so the day never shifts).
export function formatDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    Date.UTC(year, month - 1, day),
  );
}

export const modeLabel = (state) => (state.mode === 'current' ? 'Current' : 'Forecast');

export function reminderText(state, reminder) {
  return REMINDER_WORDINGS[reminder][state.reminderWording[reminder]];
}

// One template for every category; the jacket or hat part is dropped when there is none.
export function recommendationSentence(state) {
  const lead =
    state.mode === 'current'
      ? 'Based on current weather, one potential outfit for today would be'
      : `Based on the forecast, one potential outfit for ${formatDate(state.date)} would be`;
  const clothes = state.jacket ? `a ${state.jacket} jacket, shirt, pants` : 'a shirt, pants';
  const shoes = SHOE_NAMES[state.outfitVariation.shoes];
  const accessories = state.hat ? `${shoes} and a ${state.hat}` : shoes;
  return `${lead} ${clothes}, with ${accessories}.`;
}

// Alt text for the character image: describes exactly what is drawn.
export function outfitAltText(state) {
  const { shirt, pants, shoes } = state.outfitVariation;
  const items = [];
  if (state.hat) items.push(`a ${state.hat}`);
  if (state.jacket) items.push(`a ${state.jacket} jacket`);
  items.push(`a ${SHIRT_NAMES[shirt]} shirt`, `${PANTS_NAMES[pants]} pants`, SHOE_NAMES[shoes]);
  return `Mannequin wearing ${items.slice(0, -1).join(', ')} and ${items.at(-1)}.`;
}

// Temperature row: high/low and the difference from the seasonal normal high.
export function temperatureText(state) {
  const { high, low, baseline } = state.inputs;
  const range = low == null ? `High ${high}°F` : `High ${high}°F, low ${low}°F`;
  const diff = high - baseline;
  const versus =
    diff === 0 ? 'the same as the seasonal normal' : `${Math.abs(diff)}°F ${diff > 0 ? 'above' : 'below'} the seasonal normal`;
  return `${range}; ${versus} (${baseline}°F)`;
}

// Feels-like row, labeled by which extreme it is (spec revision 2026-10-15).
export function feelsLikeText(state) {
  const { value, source } = state.feelsLike;
  if (source === 'heat index') return `${value}°F (highest heat index)`;
  if (source === 'wind chill') return `${value}°F (lowest wind chill)`;
  return `${value}°F`;
}

export const precipitationText = (state) => (state.inputs.pop == null ? 'Not available' : `${state.inputs.pop}%`);

export function windText(state) {
  if (state.inputs.windMph == null) return 'Not available';
  return `${state.inputs.windMph} mph${state.windy ? ' (windy)' : ''}`;
}

export const conditionsText = (state) => state.inputs.shortForecast ?? 'Not available';
