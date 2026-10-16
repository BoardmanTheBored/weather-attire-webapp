// Session-only content variation (spec.md "Content variation").
// The first time a date is viewed for a location, the outfit and each reminder wording are
// drawn independently at random and kept in memory by date. Returning to the date shows the
// same draw; changing location clears everything. Nothing is written to storage (R4).

export const OPTION_COUNT = 3; // 3 shirt colors, 3 pants colors, 3 shoe designs, 3 wordings per reminder

export function createVariationStore(random = Math.random) {
  const draw = () => Math.floor(random() * OPTION_COUNT);
  let locationKey = null;
  let byDate = new Map();

  return {
    // Call when the location changes. Same location keeps its draws; a different one clears them.
    setLocation(key) {
      if (key !== locationKey) {
        locationKey = key;
        byDate = new Map();
      }
    },
    // `dateKey` is a "YYYY-MM-DD" string. Each of the five values is its own independent draw.
    forDate(dateKey) {
      if (!byDate.has(dateKey)) {
        byDate.set(dateKey, {
          outfitVariation: { shirt: draw(), pants: draw(), shoes: draw() },
          reminderWording: { umbrella: draw(), hydration: draw() },
        });
      }
      return byDate.get(dateKey);
    },
  };
}
