// Maps recommendation state to art files and names. Placeholders until checkpoint C10 swaps in the
// generated art (then only BASE, the file extension, and the NAME lists change).
const BASE = 'assets/placeholders';
const EXT = 'svg';

// Names used in the written recommendation and alt text; index matches the variation draw (0-2).
export const SHIRT_NAMES = ['red', 'blue', 'green'];
export const PANTS_NAMES = ['navy', 'tan', 'grey'];
export const SHOE_NAMES = ['sneakers', 'loafers', 'canvas shoes'];

const HAT_FILES = { 'sun hat': 'hat-sun', 'rain hood': 'hat-rain', beanie: 'hat-beanie' };

export const iconUrl = (name) => `${BASE}/icons/${name}.${EXT}`;
export const CONDITION_ICONS = { Clear: 'clear', Overcast: 'overcast', Rain: 'rain', Snow: 'snow' };

// Layers drawn over the mannequin, back to front, all on the same 400x800 canvas.
export function outfitLayerUrls(state) {
  const { outfitVariation, jacket, hat } = state;
  const layers = [
    `${BASE}/character/mannequin.${EXT}`,
    `${BASE}/outfit/pants-${outfitVariation.pants}.${EXT}`,
    `${BASE}/outfit/shoes-${outfitVariation.shoes}.${EXT}`,
    `${BASE}/outfit/shirt-${outfitVariation.shirt}.${EXT}`,
  ];
  if (jacket) layers.push(`${BASE}/outfit/jacket-${jacket}.${EXT}`);
  if (hat) layers.push(`${BASE}/outfit/${HAT_FILES[hat]}.${EXT}`);
  return layers;
}
