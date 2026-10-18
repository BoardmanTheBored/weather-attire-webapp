// Maps recommendation state to art files and names. The art is built by scripts/build_art.py (see
// art/README.md); the NAME lists below must describe what was actually generated.
const BASE = 'assets/art';
const EXT = 'png';

// Names used in the written recommendation and alt text; index matches the variation draw (0-2).
export const SHIRT_NAMES = ['red', 'blue', 'green'];
export const PANTS_NAMES = ['navy', 'khaki', 'grey'];
export const SHOE_NAMES = ['sneakers', 'loafers', 'canvas shoes'];

const HAT_FILES = { 'sun hat': 'hat-sun', 'rain hood': 'hat-rain', beanie: 'hat-beanie' };

export const iconUrl = (name) => `${BASE}/icons/${name}.${EXT}`;
export const CONDITION_ICONS = { Clear: 'clear', Overcast: 'overcast', Rain: 'rain', Snow: 'snow' };

// Layers drawn over the mannequin, back to front, all on the same canvas.
export function outfitLayerUrls(state) {
  const { outfitVariation, jacket, hat } = state;
  const layers = [
    `${BASE}/character/mannequin.${EXT}`,
    // Shoes go under the trousers, as in real life: the cuff falls over the shoe top. It also means no
    // layer sits between the mannequin and the shoes to cover the outline they share with the ankle.
    `${BASE}/outfit/shoes-${outfitVariation.shoes}.${EXT}`,
    `${BASE}/outfit/pants-${outfitVariation.pants}.${EXT}`,
    `${BASE}/outfit/shirt-${outfitVariation.shirt}.${EXT}`,
  ];
  if (jacket) layers.push(`${BASE}/outfit/jacket-${jacket}.${EXT}`);
  if (hat) layers.push(`${BASE}/outfit/${HAT_FILES[hat]}.${EXT}`);
  return layers;
}
