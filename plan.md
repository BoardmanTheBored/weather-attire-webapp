# Implementation Plan

> EDITING DIRECTIVE: DEVELOPER AND AGENT EDIT THIS FILE COLLABORATIVELY. THE DEVELOPER MUST REVIEW AND APPROVE ITS CONTENT.

Purpose of this file: Turn the approved specification into an ordered, trackable build and verification plan.

## Instructions for the Developer

Set priorities, review the checklist, verify results rather than relying only on the Agent's report, and keep the project documents current as the work changes. Expect the build to take many rounds of testing and fixing; record material changes under Revisions.

To begin planning, open the project repository in a fresh chat and enter:

`Read ./plan.md and help me create the Project 3 implementation plan.`

After approving the plan, open the project repository in a fresh chat and enter:

`Read ./plan.md and help me implement the approved Project 3 plan in working checkpoints.`

## Instructions for the Agent

Read `AGENTS.md`, `brief.md`, `research.md`, `spec.md`, and this file, then inspect the relevant project files. Propose concrete tasks and checks without expanding the approved scope.

During implementation, follow the approved plan in working checkpoints and keep it current. Never mark approvals or items requiring Developer verification complete on the Developer's behalf.

## Approach

**Stack (decided):** vanilla HTML, CSS, and JavaScript (ES modules), no framework and no build step, served as a static site from GitHub Pages. The only tooling is one Node script that builds the baseline JSON, and Node's built-in test runner (`node --test`) for the logic modules.

**Structure:**

```
index.html            single page; main screen + info screen (hash route #/info)
css/                  styles (high-contrast default, phone-first, laptop at >= 1024 px)
js/
  state.js            builds the one recommendation state object
  recommend.js        pure rules: tier, modifier, category, jacket, hat, reminders, condition, windy
  baseline.js         nearest station + day-of-year interpolation from data/normals.json
  variation.js        in-memory random draws keyed by date; cleared on location change
  nws.js              api.weather.gov client (points, forecast, gridpoint data)
  geocode.js          Nominatim client (explicit Search only)
  storage.js          saves/loads only the most recent location
  render.js           the only code that writes to the DOM; reads state only
  main.js             wiring, routing, events
data/normals.json     bundled NCEI 1991-2020 monthly normal highs (built by script)
scripts/build-normals.mjs
assets/               placeholders first, then generated art
tests/                node --test files for the pure modules
```

**Data flow:** location (typed, device, or saved) → Nominatim (typed only) → lat/lon → NWS `/points` → forecast and gridpoint data for the chosen date → `recommend.js` + `baseline.js` + `variation.js` → one state object → `render.js` draws the character, icons, sentence, breakdown, and reminders. Nothing renders from anywhere else (R6).

**Task order rationale:** logic and data first (testable without art or layout), then the phone screen against placeholders, then states and controls, then laptop, then info screen, then real art. Deploy a skeleton in checkpoint 0 so HTTPS and geolocation problems surface early rather than at the end.

**Main risks:**
- **NWS data shape.** The spec depends on heat index and wind chill, which are in the raw gridpoint data, not the 12-hour forecast. Field names, empty values, and the "Current" nearest-hour value must be checked against live responses before the rules are coded.
- **Browser limits on headers.** Browsers cannot set `User-Agent` on `fetch`. Confirm NWS accepts requests from a browser without it and Nominatim accepts the automatic `Referer`; if not, R1/R2 need a spec decision.
- **NCEI file size and coverage.** 15,616 station files; the bundled JSON must stay small enough to load quickly on a phone and have usable stations near most US locations (including AK, HI, PR).
- **Art consistency and timing.** 23 AI-generated assets must align on one canvas and match in style. Mitigation: placeholders at final canvas size, tool and license chosen early.
- **Nominatim policy.** One request per explicit Search, no autocomplete, attribution on the info screen.
- **Low-light contrast and greyscale.** Checked per checkpoint, not only at the end.

## Checklist

### Approvals

- [x] Research approved
- [x] Specification approved
- [x] Plan approved

### Build

Ongoing rules: test and fix each checkpoint against `spec.md` before starting the next; commit each working checkpoint; use the approved drawing (`reference/project-3_DrawnLayouts.jpg`) for layout; keep one recommendation state driving every output.

**Art track (runs in parallel, start now)**
- [x] A0. Choose the image-generation tool, read and record its license/terms for commercial-style public use (Developer decision)
  - Tool chosen 2026-10-16: Google Gemini app, free tier (not AI Studio). Licence wording recorded in `art/README.md` on 2026-10-17 from Google's Terms of Service.
- [x] A1. Write one style prompt and generate the mannequin; fix it as the reference image and canvas size (result: approved character PNG)
  - Style prompt, a pilot (mannequin plus one shirt) and prompt templates are in `art/README.md`; `scripts/art_tools.py` extracts transparent layers. Run the pilot before generating all 23.
- [x] A2. Generate overlays on the same canvas: 3 shirts, 3 pants, 3 shoes, 2 jackets, 3 hats (result: 14 overlays that line up on the mannequin)
- [x] A3. Generate or draw icons: 4 condition icons, Windy overlay, thermometer, umbrella, hydration (result: 8 icons readable in greyscale)
- [x] A4. Record the tool, date, and license for the info screen (result: credit text ready)

**Code track**
- [x] C0. **Skeleton and early deploy:** folder structure, `index.html` with two empty screens, hash routing, GitHub Pages enabled. Check: public HTTPS URL loads; the info route and back button work.
- [x] C1. **Live data check:** script that fetches real NWS responses for Austin and a northern city; record which fields hold high temp, PoP, heat index, wind chill, wind, short forecast, icon code, and the nearest-hour value; note empty values. Check: findings written to `spec.md` Revisions; browser `fetch` to NWS and Nominatim succeeds without a custom `User-Agent`.
- [x] C2. **Baseline data:** `scripts/build-normals.mjs` produces `data/normals.json`; `baseline.js` returns the interpolated normal high for a lat/lon and date. Check: file size reported; Austin and Minneapolis give plausible values for January and July; AK/HI/PR lookups work.
- [x] C3. **Rules engine (pure, tested):** `recommend.js` and `variation.js` with `node --test`. Check: boundaries at ±7°F, PoP 39/40, heat index 79/80, wind 18/19, empty heat index, every row of the jacket/hat table, condition-code grouping with Overcast fallback, and variation keyed by date (same on return, cleared on location change, independent draws).
- [x] C4. **Data layer:** `nws.js`, `geocode.js`, `storage.js`, plus `state.js` assembling the state object. Check: console output of the full state for typed "Austin, TX", a ZIP, and a forecast date; local storage holds only the last location (R4).
- [x] C5. **Phone main screen on placeholders:** header block, character with overlays, breakdown rows, reminders, source line, footer link, all rendered from the state object. Check: matches the phone drawing; screenshot for each of the 6 categories using test states.
- [x] C6. **Location and date sheet:** bottom sheet with city/ZIP field, Search, "Use my location", and 7-day date picker; focus trap and restore. Check: R2, R3, R11; no request while typing; a location change and a date change by thumb.
- [x] C7. **Loading and error states:** loading, service error with Retry, missing temperature, missing secondary fields, denied location, unmatched or non-US query. Check: trigger each (offline, blocked request, denied permission, bad query, nulled field) and match the spec's message table (R9).
- [x] C8. **Laptop layout:** three columns, 7-day strip with day selection, centered dialog, footer info link. Check: R12 at 1024 px and 390 px; keyboard-only completion of every task.
- [x] C9. **Information screen:** creator, NWS, methods and sources (CDC, NWS PoP and heat index, NCEI normals), privacy practices, AI art disclosure and tool/license, OSM attribution, "Current" note. Check: R10, every item present; works by tap and keyboard.
- [x] C10. **Swap in real art:** replace placeholders with the generated assets; write alt text from the state (outfit description). Check: overlays align at both sizes; no placeholder remains.
  - Art swapped in 2026-10-17 and verified at 390 px and 1280 px (layers align, no failed or placeholder requests). The placeholder folder `assets/placeholders/` was deleted by the Developer and nothing references it.
- [x] C11. **Accessibility pass:** contrast tool on every text/background pair, greyscale screenshot, 44 px targets, focus order, screen-reader labels. Check: R13 results recorded.
  - Results and the five defects fixed are recorded in `spec.md` Revisions (2026-10-17). The Developer should still check focus order and screen-reader behaviour by hand on a real phone and laptop (Verify and revise).
- [x] C12. **Public deploy of the full app** and a pass against R14. Check: URL works over HTTPS on a phone with real device location.
  - Live at https://boardmanthebored.github.io/weather-attire-webapp/ (2026-10-17). The Developer confirmed it works on a real phone and laptop; the Agent's automated live pass (27 checks) is recorded in `spec.md` Revisions.

### Verify and revise

- [x] Check every specification requirement
- [x] Test multiple locations, current and forecast dates, recommendation categories, outfit and reminder variations, and failure states
- [x] Verify that eligible outfit and reminder variations are selected independently rather than as fixed pairs
- [x] Verify that returning to a previously selected date shows the same variations
- [x] Test the deployed app, independently of the local version, on a real phone and a laptop, including both screens, accessibility, and one-handed controls
  - Confirmed by the Developer on 2026-10-17: works on a real phone and laptop; one-handed use and accessibility fine.
- [ ] Prepare the usability test below
- [ ] Test with three peers and record each session
- [ ] Add the chosen improvement to this checklist, and update `spec.md` if the intended result changes
- [ ] Implement, verify, and redeploy at least one meaningful revision

### Deliver

- [ ] Confirm all brief deliverables, sources, privacy information, and asset credits
- [ ] Save all chat transcripts
- [ ] Complete the debrief

## Verification results (2026-10-17)

Agent-run evidence for "Check every specification requirement", on the live site unless noted. R11 and R13 include the Developer's own device checks. The Developer ticks the checklist items below.

| # | Result | Evidence |
|---|---|---|
| R1 | Pass | Live: hosts contacted are the site itself, api.weather.gov and nominatim.openstreetmap.org (geocoding only); 56-state sweep and 27 deploy checks, no failed requests. |
| R2 | Pass | C6 suite (42 checks): typed Search, device location allowed and denied, "No US match found" for Paris, no request while typing, one request per Search. C7: a device in Paris gets "No US match found". |
| R3 | Pass | Sweep: at 8 locations the strip and picker are exactly 7 consecutive dates starting Today. C6: 7 date chips. |
| R4 | Pass | C6 and live: one local-storage key; after A then B, a reload opens on B; a failed search keeps the previous location. |
| R5 | Pass | Sweep, all 56 states: header shows location, date and Current (today) or Forecast (other days); °F on the header, Temperature and Feels like; % and mph on their rows; source line present. |
| R6 | Pass | Code review: the only DOM writes outside `render.js` are the two screen-visibility toggles for routing; character, icons, sentence, breakdown, reminders and strip are all drawn from `buildState` by `renderMain` and `renderWeek`. C8: choosing a day changes header, sentence and outfit together. |
| R7 | Pass | Unit tests at PoP 39/40 and heat index 79/80. Sweep, 56 states: umbrella shown if and only if PoP ≥ 40, hydration if and only if heat index ≥ 80. |
| R8 | Pass | Unit tests: a date's draw is stable on return, cleared on location change, and independent (all 9 shirt × wording pairs and all 9 wording × wording pairs appear over 600 draws). Sweep: 24 revisits of an earlier day showed the same outfit. |
| R9 | Pass | C7 suite (43 checks): loading, blocked request, HTTP 500, unreadable data, timeout (10.1 s), geocoder down, missing temperature, missing PoP/wind/conditions/icon, empty heat index, denied location, unmatched query; Retry recovers. |
| R10 | Pass | Info test (every required item present, thresholds match the code), C9 (tap, keyboard, Back, browser back), all 11 external links return 200. |
| R11 | Pass | Every control is at least 44×44 px on phone and laptop (C11). The Developer confirmed one-handed use on a real phone is fine (2026-10-17). |
| R12 | Pass | C8 at 1280, 1024 and 390 px: three columns and the strip on laptop, phone layout otherwise, no horizontal scroll. |
| R13 | Pass | The Developer confirmed the real-device accessibility check is fine (2026-10-17). C11: contrast on 14 states, 3 px focus rings, names, greyscale, reflow, 200% text; keyboard-only completion of every task (C8). Recorded in `spec.md` Revisions. |
| R14 | Pass | C12: HTTPS, secure context, 27 live checks; the Developer confirmed it works on a real phone and laptop. |
| R15 | Pass | Unit tests (same forecast, different tier by baseline). Sweep: in all 56 states the shown tier equals the rule applied to the shown "N°F above/below the seasonal normal" (boundary seen live: Minneapolis +7°F is Mild). Info screen names the NCEI normals. |

**Sweep coverage:** Austin, Minneapolis, Seattle, Miami, Denver, Anchorage, Honolulu and San Juan, each for all 7 days. Categories seen live: Mild-Dry 31, Hot-Dry 13, Mild-Rain 11, Cold-Dry 1. Cold-Rain and Hot-Rain did not occur in October weather; they were verified with synthetic states (C5, C10) and unit tests, not live data.

**Observations for the usability test (not defects against the spec):**
- **Rain icon without an umbrella.** The condition icon comes from the NWS icon code, while "Rain" in the recommendation needs PoP ≥ 40%. So a day can show a Rain icon with no umbrella, jacket or rain hood: Honolulu shows Rain all week at PoP 16–35%, and Miami and San Juan have days like it. This follows the approved rules, but a tester may find it contradictory.
- **Cold in a warm place.** Austin today shows Cold at a 70°F high because the October normal is 81°F (approved rule, noted in C4).

## Usability testing

**Draft protocol (to be confirmed by the Developer before testing):**
- Purpose: find where a college student hesitates or misreads while choosing a place and date and understanding the outfit and reminders.
- Tasks: (1) "Tell me what you'd wear today." (2) "Find out what the weather will be like at a place you're visiting this week." (3) "What would you wear on [a day later this week]?" (4) "Where does this app get its weather information?"
- Prompts: neutral only ("What are you looking at?", "What do you expect to happen if you tap that?"); no hints unless the tester is stuck for 60 seconds.
- Note format per session: label (P1–P3), device, task, actions/quotes, successes, barriers or questions, possible changes (kept separate from observations).

Before testing, record the purpose, a few realistic tasks, non-leading prompts, and a consistent note format. For each session, use a non-identifying label and record the task, what the tester did or said, successes, barriers or questions, and possible changes. Keep observations separate from interpretations. After all three sessions, summarize the strongest findings and the improvement they support.

## Revisions

Record material plan changes and why they were made.

- 2026-10-15: Repo made public (GitHub Pages is unavailable on private repos on the free plan). Live URL: https://boardmanthebored.github.io/weather-attire-webapp/. C0 done.
- 2026-10-16: Art tool chosen: Google Gemini app, free tier, because it is free, edits a reference image (best free route to aligned overlays), and Google states it does not claim ownership of generated content. Fallback if consistency fails: FLUX.1 [schnell] (Apache 2.0) on the Developer's RTX 4060. The canvas ratio is set at the pilot (Gemini may not offer 1:2).

## Saving transcripts

At the end of planning, ask the Developer to enter `save transcript`. When directed, save the complete conversation as `transcripts/plan-YYYY-MM-DD_HHMMSS.md`, label chat messages `Developer` and `Agent`, and confirm the saved path.

At the end of every implementation chat, ask the Developer to enter `save transcript`. When directed, save the complete conversation as `transcripts/build-YYYY-MM-DD_HHMMSS.md` using the same formatting.
