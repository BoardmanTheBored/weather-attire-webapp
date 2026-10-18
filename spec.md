# Technical Specification

> EDITING DIRECTIVE: DEVELOPER AND AGENT EDIT THIS FILE COLLABORATIVELY. THE DEVELOPER MUST REVIEW AND APPROVE ITS CONTENT.

Purpose of this file: Turn the approved research, project brief, and hand-drawn screen designs into testable requirements.

## Instructions for the Developer

Make and approve the product decisions, draw every proposed screen, provide the drawings to the Agent, and keep this file current as the intended result changes.

To begin, open the project repository in a fresh chat and enter:

`Read ./spec.md and help me begin the Project 3 specification.`

## Instructions for the Agent

Read `AGENTS.md`, `brief.md`, `research.md`, and this file. Review the screen drawings the Developer provides. Ask one focused question at a time, surface gaps and trade-offs without inventing requirements, and keep the specification concise and testable.

## Goal

Help a US college student decide what to wear for a chosen day and place, at a glance and one-handed, by showing a character dressed for the forecast with short situational reminders.

User stories (from `research.md`): 1 (quick outfit decision), 2 (destination location), 3 (reminders alongside the outfit), 4 (colorblind-accessible), 5 (plan ahead), 6 (laptop layout that uses the larger screen).

## Screen designs

Drawing: [reference/project-3_DrawnLayouts.jpg](reference/project-3_DrawnLayouts.jpg) (phone and laptop layouts of the main screen). The information screen was not drawn; its layout is defined in text below.

### Main screen: phone
- **Header (top):** one tappable block containing the location name, the date, and a Current/Forecast label, plus the temperature with its unit (e.g. "90°F"). Beside it: a thermometer icon (temperature tier) and a weather condition icon.
- **Body:** the character with outfit on the left; the Weather Breakdown panel on the right.
- **Weather Breakdown rows:** Conditions (NWS short-forecast text), Temperature (high/low and difference from seasonal baseline), Feels like (highest heat index or lowest wind chill for the day, labeled as such), Precipitation (PoP %), Wind (mph). Reminders follow the rows, each with its icon and wording. The last line reads "Source: National Weather Service".
- **Footer (bottom, thumb reach):** link to the information screen.
- **Location/date control:** tapping the header block opens a bottom sheet containing a city/ZIP text field with a Search button, a "Use my location" button, and a date picker (today through day 7).

### Main screen: laptop
- Three columns: the character (larger); a middle column with location, date, temperature, and the thermometer and weather icons stacked; the Weather Breakdown with reminders and source line.
- A 7-day strip (each day: tier icon, condition icon, high temperature) is added. Clicking a day selects it.
- Clicking the location block opens the same controls as a centered dialog.
- Info link in the footer.

### Information screen (both layouts)
Full-page view reached from the footer link, with a back button. Sections: creator, weather-data source, recommendation methods and sources, privacy practices, art credits and licenses. Single column, readable on both layouts.

## Requirements

Each requirement has an acceptance check (AC).

| # | Requirement | Acceptance check |
|---|---|---|
| R1 | Weather data comes only from api.weather.gov (NWS): current and forecast, 7-day range. | Network log shows weather requests only to api.weather.gov. |
| R2 | Location by typed city or ZIP (geocoded via Nominatim on explicit Search only, no autocomplete) or by device location. US locations only. | Type "Austin, TX" and Search: header shows Austin. Click "Use my location" and allow: header shows the device's city. A non-US query shows "No US match found". No request is sent while typing. |
| R3 | The user picks today or any date through day 7. | Date picker offers exactly 7 days from today. Choosing a date updates all outputs. |
| R4 | Only the most recent location persists on the device (local storage). No other user data is stored. | After choosing location A then B and reloading, the app opens on B. Local storage holds only B (and no variations, see "Content variation"). |
| R5 | The header makes clear location, date, units (°F, mph, %), and whether data is **Current** (today) or **Forecast** (other dates). The data source appears in the Weather Breakdown. | Screenshot check for today and for a future date shows the correct label, units on every value, and the source line. |
| R6 | The character, outfit, tier icon, condition icon, written recommendation, and reminders are all produced from one recommendation state. | Changing the date or location changes all of them together. Code review confirms a single state object feeds every render. |
| R7 | Reminders: **umbrella** when PoP ≥ 40%; **hydration** when heat index ≥ 80°F. Reminders show in the Weather Breakdown only, never as header icons. | Test with data at 39%/40% PoP and 79°F/80°F heat index: reminders appear only at the threshold or above. |
| R8 | Content variation as defined under "Content variation". | See that section. |
| R9 | Loading, missing data, service errors, denied location, and unmatched location behave as defined in "Error and loading states". | Each state is triggered (offline, blocked request, denied permission, bad query, null field) and the specified message appears. |
| R10 | Information screen contains creator, data source (NWS), recommendation methods and sources (CDC, NWS PoP, NWS heat index, NOAA NCEI 1991–2020 U.S. Climate Normals for the seasonal baseline), privacy practices, art credits (AI-generated disclosure), OpenStreetMap/Nominatim ODbL attribution, and a note that "Current" is the nearest-hour NWS forecast, not a measured observation. | Each item is present and read through once. Footer link and back button work by tap and keyboard. |
| R11 | Phone layout is usable one-handed: all primary controls (header block, sheet buttons, footer link) are in reach or reached by a bottom sheet; touch targets ≥ 44×44 CSS px. | Measure targets in dev tools. Complete a location change and a date change with one thumb on a phone. |
| R12 | Laptop layout uses the three-column layout and 7-day strip, not a stretched phone layout. | Compare at ≥ 1024 px width and at 390 px width: layouts differ as specified. |
| R13 | Accessibility: text contrast ≥ 4.5:1 (large text ≥ 3:1) on a high-contrast default style; no information by color alone (every tier, condition, and reminder has an icon and text label); fully keyboard operable on laptop; bottom sheet/dialog traps and restores focus; images have alt text describing the outfit; touch target rule from R11. | Contrast checked with a tool on every text/background pair. Greyscale screenshot remains fully understandable. Complete all tasks by keyboard only. |
| R14 | Deployed to a public HTTPS GitHub Pages URL; geolocation works there. | Open the URL on a phone, grant location, see a forecast. |
| R15 | **Additional feature:** the Cold/Mild/Hot tier is judged against a seasonal/regional baseline (±7°F = Mild), not a fixed threshold. Baseline is the nearest-station NCEI normal high for the date. | Same forecast temperature yields a different tier in winter vs summer or in Austin vs a northern city. The info screen names the NCEI normals as the source. |

### Error and loading states

| Situation | Behavior |
|---|---|
| Loading | Header shows chosen location and date; character area and breakdown show "Loading forecast…"; no outfit until data arrives. |
| Service error (NWS or Nominatim down, offline, timeout) | Message in the breakdown area ("Couldn't reach the weather service") with a Retry button. Any previous outfit is cleared. |
| Missing data | Temperature missing: no outfit or tier, with a message saying why. Secondary field missing (for example PoP or wind): the row shows "Not available" and any reminder depending on it is skipped. An empty heat index is not treated as missing: it counts as below threshold (no hydration reminder), and "Feels like" falls back to wind chill, then to the plain temperature. Verify this against live NWS data during the build. |
| Denied device location | Sheet shows "Location permission denied. Type a city or ZIP instead", text field focused. |
| Location not found or not in US | Inline message in the sheet ("No US match found"); previous location kept. |
| Date out of range | Not possible; picker is limited to today through day 7. |

## Recommendation state and data flow

**Inputs (all from NWS):** the date's daytime high temperature, probability of precipitation (PoP), heat index, wind chill (when present), wind speed, and short-forecast text / condition code.

**Seasonal baseline:** the NOAA NCEI U.S. Climate Normals (1991–2020) monthly mean daily maximum temperature (`MLY-TMAX-NORMAL`) for the nearest station to the location, interpolated by day of year between months. This replaces the latitude/day-of-year approximation in `research.md`, so the baseline is official NOAA data, not an approximation. A build-time script reads the NCEI monthly normals and writes one bundled JSON file (station, lat/lon, 12 monthly normal highs); the browser picks the nearest station from it. There are no runtime NCEI requests.

**Rules:**
1. Temperature tier: the date's forecast high − baseline (normal high) within ±7°F = **Mild**; more than 7°F below = **Cold**; more than 7°F above = **Hot**.
2. Precipitation modifier: PoP ≥ 40% = **Rain**, else **Dry**.
3. Category = tier × modifier: Cold-Dry, Cold-Rain, Mild-Dry, Mild-Rain, Hot-Dry, Hot-Rain.
4. Condition icon: NWS codes grouped into Clear/Sunny, Overcast, Rain, Snow, per `research.md`; the Windy overlay shows when wind speed ≥ 19 mph (Beaufort force 5, "fresh breeze", per the NWS Beaufort scale); unmapped codes fall back to Overcast.
5. Reminders: umbrella when PoP ≥ 40%; hydration when heat index ≥ 80°F.

**Written recommendation (one template for all categories):** "Based on current weather, one potential outfit for today would be a [light/heavy] jacket, shirt, pants, with [shoe type] and a [hat type]." For a future date: "Based on the forecast, one potential outfit for [date] would be…". If there is no jacket or no hat, that part is dropped. The bracketed parts are filled from the same recommendation state as the outfit art.

**Shared state:** `{ location, date, mode (current|forecast), inputs, tier, modifier, category, condition, windy, reminders[], outfitVariation, reminderWording{} }`. Every visual and written output renders from this object only.

**Outfit layers by category (art in `research.md`):** jacket and hat carry the weather signal; shirt, pants, and shoes carry variation.

**Jacket:** shown when the tier is Cold, or when it is Rain, or when wind ≥ 19 mph. It is **heavy** when the tier is Cold, otherwise **light**. No jacket on Mild or Hot days that are dry and calm.

**Hat:** rain hood when Rain; otherwise beanie when Cold, sun hat when Hot, and none when Mild.

| Category | Jacket | Hat |
|---|---|---|
| Cold-Dry | heavy | beanie |
| Cold-Rain | heavy | rain hood |
| Mild-Dry | light only if windy | none |
| Mild-Rain | light | rain hood |
| Hot-Dry | light only if windy | sun hat |
| Hot-Rain | light | rain hood |

## Content variation

- **Outfit variations:** for every category, the shirt color (3), pants color (3), and shoe design (3) are drawn at random, giving far more than the required 3 variations per category while the weather-driven jacket and hat are fixed by category and wind.
- **Reminder wording:** 3 wordings each for umbrella and hydration, drawn at random, independently of each other and of the outfit.
- **Selection:** the first time a date is viewed for the current location, the outfit and each reminder wording are drawn independently at random and stored in memory keyed by date. Returning to that date in the same session shows the same variations. Changing location clears the stored variations. Variations are not saved across page reloads (session only, decided). The only persistent device data is the most recent location (R4).
- **Acceptance check:** view a date, switch to another date and back: identical outfit and wording. Reload: variations may differ. Over many fresh draws, outfit and reminder wording vary independently (all 3 reminder wordings appear without the outfit changing in lockstep).

## Assets

All art is AI-generated (decision in `research.md`); a consistent style prompt and a fixed reference image are used across all assets. Tool and license terms to be recorded on the information screen once the tool is chosen.

| Asset | Count | Appears | Format | Source / credit |
|---|---|---|---|---|
| Mannequin character | 1 | Main screen | PNG, transparent | Generated; credit TBD |
| Shirt (design × 3 colors) | 3 | Over character | PNG overlay, same canvas size as character | Generated |
| Pants (design × 3 colors) | 3 | Over character | PNG overlay | Generated |
| Shoes | 3 | Over character | PNG overlay | Generated |
| Jackets: light, heavy | 2 | Over character | PNG overlay | Generated |
| Hats: sun hat, rain hood, beanie | 3 | Over character | PNG overlay | Generated |
| Weather condition icons: Clear/Sunny, Overcast, Rain, Snow | 4 | Header, 7-day strip | SVG or PNG | Generated |
| Windy overlay | 1 | Header / strip | SVG or PNG | Generated |
| Temperature tier icon: one thermometer, always paired with a text label (Cold, Mild, Hot) | 1 | Header, 7-day strip | SVG or PNG | Generated |
| Reminder icons: umbrella, hydration | 2 | Weather Breakdown | SVG or PNG | Generated |

Total: 1 character + 9 shirt/pants/shoes + 2 jackets + 3 hats + 4 condition icons + 1 Windy overlay + 1 thermometer + 2 reminder icons = **23**, the Developer's budget. (The one-thermometer-with-label design keeps the count at 23; three tier-specific thermometers would make 25.) OpenStreetMap data credit: © OpenStreetMap contributors, ODbL, shown on the information screen. Weather data credit: National Weather Service.

## Out of scope

- Sunscreen reminder and UV index (not in the NWS API; see `research.md` Revisions).
- Non-US locations; metric units.
- Multiple saved locations, accounts, favorites.
- Push notifications or alerts.
- Autocomplete location search.
- Hourly forecast view and historical data.
- Clothing customization or shopping links.
- Backend or server of any kind.

## Open items for the Developer

All items resolved. Approved decisions:

- The tier uses the date's forecast high; the windy threshold is 19 mph; one written recommendation template; art budget is 23.
- Rain hood whenever Rain; one thermometer icon plus a text label.
- Baseline comes from a bundled JSON built from NCEI monthly normals.
- For today, the header shows the current (now) temperature labeled "Current" (the nearest-hour forecast, disclosed on the information screen), and the recommendation uses today's forecast high.
- For a future date the template reads "Based on the forecast, one potential outfit for [date] would be…".
- When there is no jacket or no hat, that part of the sentence is dropped (for example "…would be a shirt, pants, with [shoes].").

## Revisions

After implementation or testing, record requirement changes and the evidence that prompted them. Update the screen drawings when a material layout or interaction changes.

- 2026-10-04: UV index and sunscreen reminder removed (NWS provides no UV). Recorded in `research.md`.
- 2026-10-15 (plan C1, live NWS check for Austin and Minneapolis, `scripts/check-nws.mjs`; browser `fetch` tested from the deployed origin). **Decisions marked Approved were made by the Developer on 2026-10-15; the rest remain proposed.**
  - **Browser access:** `api.weather.gov` and Nominatim both answer browser `fetch` with HTTP 200 and no custom `User-Agent` (no R1/R2 change needed). Nominatim `countrycodes=us` returns an empty array for "Paris, France" (the "No US match found" case) and resolves a ZIP (55401).
  - **Endpoints:** `/points/{lat},{lon}` gives `forecast`, `forecastGridData`, timezone, and `relativeLocation` (city, state). `/forecast` gives 14 half-day periods. `/gridpoints/{office}/{x},{y}` gives raw series.
  - **Daily high:** each daytime period's `temperature` (°F, integer). **Gap:** after the afternoon, today's daytime period is gone and the first period is "Tonight". For today, take the high from gridpoint `maxTemperature` (°C, first entry covers today) and convert to °F. **Approved:** use gridpoint `maxTemperature` for every date so one source covers all 7 days. Spot check: Austin tomorrow, 20 °C = 68 °F matches the period `temperature` of 68; verify more days in C4.
  - **PoP:** period `probabilityOfPrecipitation.value` (percent, may be null). Austin and Minneapolis today were 43 and 38 for "Friday", so the 39/40 threshold is realistic.
  - **Wind:** period `windSpeed` is a string such as "5 to 15 mph" or "15 mph". Gridpoint `windSpeed` is numeric km/h. **Approved:** the upper end of the period's range, converted to a number, compared to 19 mph (the gust-free wording matches the forecast text users see).
  - **Heat index / wind chill:** only in gridpoint `heatIndex` and `windChill` (°C). They are sparse series: entries carry an ISO-8601 `validTime` interval (e.g. `PT1H`, `P6DT3H`), many have `value: null`, and gaps mean "not applicable". Treat null, missing, or no entry for the date as empty, as the spec already says. **Approved:** for a date, take the maximum non-null `heatIndex` over the day's forecast period; for wind chill, the minimum. Both convert °C to °F.
  - **"Current" temperature:** gridpoint `temperature` series entry whose interval contains the current hour (°C, no nulls observed); `apparentTemperature` is also always populated and could back "Feels like", but the spec names heat index then wind chill, so it is not used.
  - **Condition code:** period `icon` is a URL ending in a code (e.g. `.../tsra_hi,40?...`, `.../rain_showers,20/rain_showers,50`); the first segment (before the comma) is the code to group. `shortForecast` text is the display string.
  - **Units:** gridpoint values are SI (°C, km/h). Convert in `nws.js` only; the rest of the app uses °F and mph.

- 2026-10-15 (plan C4): live data showed the lowest wind chill can be far below the day's high (Minneapolis, high 58 °F, wind chill 29 °F). **Approved (Option B):** keep the daily extreme and label the row so it reads correctly, for example "Feels like 29°F (lowest wind chill)" or "Feels like 84°F (highest heat index)"; the plain temperature fallback has no extra label. The Cold/Mild/Hot tier is unchanged and may read Cold on a mild-looking day in a warm region (Austin, 69 °F vs 81 °F normal); this is the approved rule, to watch in usability testing.

- 2026-10-17 (plan C11, R13 accessibility pass; measured in a browser at 390, 320 and 1280 px, local build). **Results:**
  - **Contrast:** every visible text pair measured against its composited background in 14 states (empty, live, both reminders and Windy, cold, sheet with message and with dates, disabled Search, info screen on phone and laptop, laptop strip with selected and unselected days, error, loading). No failures; links are 10.0:1 and body text 18.9:1, against the 4.5:1 minimum. The tool was self-tested first: it flags #999 on white at 2.85:1.
  - **Targets:** every button, link, field and chip is at least 44×44 px on phone main, sheet, info, error state, and laptop main, strip and dialog. Links inside sentences on the info screen are about 20 px tall and are exempt (WCAG 2.5.8, inline).
  - **Focus:** every tab stop shows a 3 px outline (weakest 10:1 against its background). Order matches the visual order: phone main is location block then footer link; laptop is location block, the 7 days, footer link; the sheet is field, Search, Use my location, dates, Close, then wraps. Trap and restore were verified in C6.
  - **Names and structure:** every control, image and field has an accessible name; one h1; "Weather Breakdown" is an h2; the character image describes the outfit; the strip is a labelled navigation with exactly one pressed day; the sheet is a dialog named "Location and date" containing a labelled group of date radios; page language and title are set.
  - **Greyscale:** screenshots of phone main, sheet and laptop remain fully understandable: tier, condition and Windy have distinct icon shapes and text labels, reminders have an icon and a word, selected dates and days use a check mark.
  - **Reflow and text size:** no horizontal scroll at 320 px (main, sheet, info) or at a 200% font-size setting on phone and laptop.
  - **Defects found and fixed during the pass:** (1) the header block's accessible name dropped the visible "Current" and temperature, and each strip day's dropped "Today" (WCAG 2.5.3); names now contain their visible text. (2) The strip day buttons contained a list, which is invalid inside a button; they now use spans. (3) The page read the tier and weather icons before the location block; the block now comes first in the page and CSS places the icons to its left on phones. (4) Font sizes were fixed pixels and ignored the browser's font-size setting; they are now rem. (5) At a 200% setting the two phone columns were too narrow and the breakdown overflowed; below about 22 rem of width the layout now stacks (a rem container query), while a 390 px phone at normal size keeps the two columns from the drawing.

## Approval

The Developer reviews and explicitly approves this specification and its screen designs before planning begins.

## Saving the transcript

After the Developer approves the specification, ask them to enter `save transcript`. When directed, save the complete conversation as `transcripts/spec-YYYY-MM-DD_HHMMSS.md`, label chat messages `Developer` and `Agent`, and confirm the saved path.
