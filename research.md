# Research

> EDITING DIRECTIVE: DEVELOPER AND AGENT EDIT THIS FILE COLLABORATIVELY. THE DEVELOPER MUST REVIEW AND APPROVE ITS CONTENT.

Purpose of this file: Research your context of use, references, weather guidance, technical options, and choices that will guide the specification.

## Instructions for the Developer

Judge sources and recommendations, make the consequential decisions, and keep this file current as the work develops.

To begin, open the project repository in a fresh chat and enter:

`Read ./research.md and help me begin Project 3 research.`

## Instructions for the Agent

Read `AGENTS.md`, `brief.md`, and this file. Ask one focused question at a time. Help investigate and compare options without deciding for the Developer. Verify sources directly and keep this file concise.

## Context of use

As the User, describe when and where you would use the app and what you need from it. Record important circumstances, assumptions, and limitations.

I check the app once in the morning, before getting ready for the day, primarily on my phone. Most mornings this is for my home/campus location, but I also want to be able to check a different location — useful for commuting students who need to know conditions at their destination, not just where they currently are.

**Assumptions and limitations:**
- Primary device is a phone; the phone layout is the priority use case, though a laptop layout is still required per the brief.
- Used in low-light conditions (early morning, indoors before lights are fully on), so the display needs high contrast to stay readable.
- Often used one-handed (e.g., while brushing teeth), so the phone layout must be fully operable with one hand — no interactions that require two hands.
- Per the brief, only the most recent location is saved on the device, so switching to a destination location means it becomes the new saved default rather than a running list.

## User story

Write at least one user story grounded in your context of use:

> As a [type of user], I want to [need or goal], so that [reason or outcome].

Focus on the need rather than prescribing an interface or feature.

1. As a student getting ready in the morning, I want to quickly know what to wear based on today's forecast, so that I don't have to guess or check a separate weather app and match it to clothing myself.

2. As a student who commutes to a different campus or city, I want to check the forecast for my destination location (not just where I currently am), so that I can dress appropriately for where I'm actually headed, not where I'm getting ready.

3. As a student focused on getting ready quickly, I want situational suggestions (like bringing an umbrella, sunscreen, or extra water) shown alongside my outfit recommendation, so that I notice them naturally without needing a separate alert I'd just dismiss.

4. As a colorblind student (including all types — protanopia, deuteranopia, tritanopia, and monochromacy), I want weather conditions and recommendations conveyed through more than color alone (e.g., shape, icon, or label), so that I can distinguish and understand them regardless of how I perceive color.

5. As a student planning ahead, I want to check tomorrow's (or another upcoming day's) forecast, so that I can lay out clothes or plan my day the night before rather than rushing in the morning.

6. As a student already at a desk or laptop (e.g., studying, or planning before a longer trip home), I want a laptop view that takes advantage of the larger screen rather than just a stretched phone layout, so that I can see more detail (like a fuller forecast or richer visuals) when I'm not in a rushed, one-handed moment.

## References

Collect 5–10 reference images from relevant products and interfaces. Save each image in `reference/`, identify its source, and record a brief observation about what is useful, ineffective, or relevant to this project. Reference images are examples only; do not use them in the app.

1. **`reference/WeatherGov_Ref.png`** — Source: weather.gov (National Weather Service), active alerts map page. Observation: data-dense and plain, with a color-coded alert map and a long legend. Useful for seeing how much raw weather data *could* be shown, but it's overwhelming for a quick morning glance — a good "what to avoid" example for the main screen.

2. **`reference/Windy_Ref.png`** — Source: windy.com, wind/pressure layer view. Observation: visually rich, saturated color map with per-city temperature labels and a sidebar to switch data layers (wind, rain, temperature, etc.). The layer-toggle sidebar is a useful pattern, but the overall density is more than needed for a one-handed, at-a-glance app.

3. **`reference/Stylebook_Ref.png`** — Source: Google Play Store listing for Stylebook. Observation: the "Looks" screen shows clothing items (sunglasses, dress, shoes, scarf) laid out flat, without a mannequin or avatar wearing them — a clean example of itemized clothing breakdown. The "Closet" grid view is also a useful reference for grouping clothing by category (e.g., "Tops").

4. **`reference/Cladwell_Ref.png`** — Source: cladwell.com marketing page. Observation: the phone screenshot shows a "Recommended" outfit as flat-laid items (shirt, jeans, shoes) alongside a small weather readout (temperature, "Today") at the top of the screen. This is close to the project's direction — weather and recommended clothing in one view, without an illustrated character.

5. **`reference/MaterialIO_Ref.png`** — Source: material.io homepage. Observation: example of strong default contrast — dark background with high-contrast white/light text and bold, saturated color-blocked cards that stay legible without relying on subtle shading. Useful as a model for building high contrast into the app's default look rather than treating it as an optional mode.

6. **`reference/SmokeyBear_Ref.png`** — Source: smokeybear.com. Observation: strong example of a hand-illustrated, rustic/vintage character paired with short, practical tip cards (icon + heading + short text). Directly relevant as a tone reference for pairing a character with situational advice (e.g., umbrella, sunscreen reminders) without feeling like a corporate app.

7. **`reference/LibraryofCongress_Ref.png`** — Source: loc.gov homepage. Observation: example of strong default contrast — black background with white and gold/yellow text and clear underlined links, legible without color being the only distinguishing cue. Reinforces that high contrast can be the default visual style rather than a secondary accessibility setting.

## Weather and technical evidence

Record each useful source, what it supports, and important limitations. Research the weather variables, apparel guidance, reminders, accessibility, privacy, artwork, weather providers, and technical options needed for informed decisions.

**Source: National Weather Service API (api.weather.gov), via weather.gov/documentation/services-web-api (verified 2026-10-04).**

Supports:
- Free, public, open data ("intended to be open data, free to use for any purpose") — no licensing cost or usage restriction.
- No API key required at present (only a descriptive User-Agent header), though the docs note this may change in the future.
- Forecast data via `/gridpoints/{office}/{gridX},{gridY}/forecast` (12-hour periods) and `/forecast/hourly`, both covering **7 days ahead** — covers the brief's "today or a forecast date" requirement within that range.
- Active alerts endpoint (`/alerts/active`), useful for reminder-worthy conditions (e.g., heat advisories, flood watches).
- Covers all US states and territories (confirmed via the weather.gov active-alerts map, which includes Alaska, Hawaii, Puerto Rico, Guam, American Samoa) — fits the "US userbase only" scope.

Limitations:
- **Locations are specified by latitude/longitude only, not city name or ZIP.** A `/points/{lat},{lon}` endpoint converts coordinates to the NWS grid, but there's no built-in geocoding from a typed address or city name. Manual entry (a brief requirement) will need a separate geocoding step to turn user-typed text into coordinates — this is an open technical gap to resolve, not something api.weather.gov solves on its own.
- Device location (browser geolocation) maps directly to this API with no extra step, since it already returns lat/lon.
- Rate limits exist but aren't publicly disclosed; described as generous for typical use, with retry-after-5-seconds behavior if exceeded. Likely fine for a prototype with peer testing, but worth keeping in mind if usage spikes.

**Driving factors for the recommendation: temperature, precipitation, and UV index (decided).** Government sources for each, verified 2026-10-04:

- **Temperature (clothing/layering) — CDC, cdc.gov/winter-weather/prevention.** Recommends several loose-fitting layers, a water-resistant coat and boots, and covering frostbite-prone areas (nose, ears, toes, cheeks, chin, fingers) with hat/scarf/gloves in cold weather. Notes hypothermia risk isn't limited to extreme cold — it can occur above 40°F if clothing gets wet (rain or sweat), which is a useful case for linking precipitation and temperature together rather than treating them as fully independent.
- **UV index (sun protection) — EPA, epa.gov/sunsafety/uv-index-scale-0.** Official scale: **1–2 Low** (no protection needed), **3–7 Moderate to High** (seek shade mid-day, SPF-15+ broad-spectrum sunscreen, hat, sunglasses), **8+ Very High to Extreme** (same protections, more urgency — "Shadow Rule": if your shadow is shorter than you, UV exposure is strong). Gives a clear, sourced threshold for a sunscreen reminder: UV Index ≥ 3.
- **Precipitation (umbrella) — NWS, weather.gov, "Probability of Precipitation" (PoP).** PoP means the chance that *a specific point* receives at least 0.01" of measurable precipitation — not the percent of time or area covered. The NWS does not publish an official "umbrella threshold" percentage, so picking a cutoff (e.g., 30% or 40% PoP) for triggering an umbrella reminder is a product decision, not something backed by a government recommendation — to record under Decisions.
- **Heat index (hydration) — NWS, weather.gov/ama/heatindex.** Categories: **Caution 80–90°F** (fatigue possible with prolonged exposure/activity), **Extreme Caution 90–103°F** (heat cramps/exhaustion possible, heat stroke possible with prolonged exposure), **Danger 103–124°F** (heat cramps/exhaustion likely, heat stroke possible), **Extreme Danger 125°F+** (heat stroke highly likely). Values assume shade; direct sun can add up to 15°F. No official hydration-specific threshold is published alongside these categories, but **Caution (80°F+)** is a reasonable, sourced starting point for a hydration reminder given that's where health effects first appear.

**Geocoding (manual location entry) — tested directly 2026-10-04, since api.weather.gov only accepts lat/lon.** Compared two free, no-API-key-required options:

- **US Census Bureau Geocoder (geocoding.geo.census.gov).** Government source, US/Puerto Rico/Island Areas only, free, no key. Tested directly: requires a **full street address** — a query of just "Austin, TX" returns zero matches, while "1600 Pennsylvania Ave NW, Washington, DC" matches correctly and returns coordinates. Also tested directly: **no CORS header returned** (`Access-Control-Allow-Origin` missing), meaning a browser calling it directly from client-side JavaScript will likely be blocked — it would need a backend/proxy to call it, which conflicts with a simple static, browser-only deployment (e.g., GitHub Pages).
- **Nominatim (OpenStreetMap, nominatim.openstreetmap.org).** Free, no API key. Tested directly: accepts a simple **city/state query** ("Austin, TX") and returns coordinates successfully. Also tested directly: **does return `Access-Control-Allow-Origin: *`**, so it works fine from client-side JavaScript with no backend needed. Official usage policy (operations.osmfoundation.org/policies/nominatim): max 1 request/second, requires a descriptive User-Agent or Referer header, user-triggered single queries are allowed at "moderate" volume, autocomplete-style repeated queries are explicitly disallowed, and attribution to OpenStreetMap contributors (ODbL) is required. The policy states production apps whose primary function is geocoding should run their own instance — but a prototype with a small peer-testing group fits within the allowed "moderate," user-triggered use.

Trade-off: Census is the more "official" government source and matches the weather.gov pairing, but its lack of CORS support and requirement for a full street address are real blockers for a simple browser-only app and for users who'd rather type just a city. Nominatim fits the technical constraints (CORS, city-level input) but is a third-party/volunteer-run service with a stricter usage policy and an attribution requirement — to record under Decisions.

**Privacy — verified 2026-10-04.**

- **Browser Geolocation API (MDN):** only available in a secure context (HTTPS) — satisfied by the brief's HTTPS deployment requirement. Requires explicit user permission via a browser prompt before any location data is read, and provides a `GeolocationPositionError` on denial, which the app must catch and handle (the brief already requires handling denied permission clearly).
- **Nominatim / OpenStreetMap Foundation privacy policy (osmfoundation.org/wiki/Privacy_Policy):** logs IP address, browser/device type, OS, referring page, and date/time for every query, and states collected data "may be used...to improve the OpenStreetMap dataset" by analyzing queries for missing addresses. No specific retention period is published for Nominatim queries themselves (a general-use analytics tool they mention, Piwik, keeps data 180 days, but that's described as separate from Nominatim's own query logs).
- **Practical implication for this app:** since it's a static, client-only site with no backend/server the Developer controls, the honest privacy story is that location data is sent only to two outside services as needed per request — weather.gov (US government) and Nominatim/OpenStreetMap (third party, logs queries as above) — and nothing is stored on any server the Developer operates. Per the brief, only the most recent location persists, and that persistence is on-device (e.g., browser local storage), not server-side.

**Accessibility — W3C WCAG, verified 2026-10-04.**

- **Use of Color (WCAG 1.4.1):** color must never be the only way information is conveyed — every color-coded distinction needs a redundant non-color cue (text, icon, pattern, shape, underline). Directly supports user story 4 (colorblind-friendly, all types including monochromacy): weather conditions, recommendation categories, and reminders must each be distinguishable through shape/icon/label, not color alone.
- **Contrast Minimum (WCAG 1.4.3):** normal text needs at least a **4.5:1** contrast ratio against its background; large text (18pt, or 14pt bold, or equivalent) needs at least **3:1**. The ratio is luminance-based, so it works "independent of color perception" — directly relevant to the context-of-use need for high contrast in low light, and compatible with colorblind-safe design since it doesn't depend on hue.
- **Target Size Minimum (WCAG 2.2, 2.5.8):** interactive touch targets (buttons, controls) should be at least **24×24 CSS pixels**, or have enough spacing that a 24px-diameter circle around each target doesn't overlap neighboring targets. Explicitly called out for "people who access a device using one hand" — directly supports the one-handed phone-use requirement from context of use. (Apple's Human Interface Guidelines and Google's Material Design both recommend a larger ~44–48px target as a stricter in-practice standard, which is worth considering in `spec.md` given the one-handed, in-a-hurry use case.)

**Additional feature — seasonal/acclimatization-adjusted recommendations.** Grounded in the adaptive thermal comfort model (Wikipedia, "Thermal comfort," verified 2026-10-04; originally from de Dear and Brager's research, incorporated into ASHRAE 55): comfort perception isn't fixed to an absolute temperature — it shifts based on recent/seasonal conditions people have acclimatized to, through behavioral, physiological, and psychological adaptation (the model explicitly lists clothing choice as a behavioral adaptation pathway). The standard itself is built for indoor, non-air-conditioned buildings using a live running-mean outdoor temperature — not a direct fit for outdoor clothing recommendations, so this app adapts the underlying concept rather than applying the standard itself.

Two implementation paths were evaluated and a lighter one chosen for project scope:
- *Rejected:* true running-mean of recent daily temperatures — not possible, since api.weather.gov has no historical-observations endpoint (confirmed directly against its documentation); would require integrating NCEI's archive separately.
- *Rejected:* NOAA/NCEI published climate normals via the Climate Data Online API — technically free, but requires requesting a token, matching coordinates to the nearest weather station, and CORS support is unconfirmed; too much added integration for the timeline.
- *Chosen:* a small built-in approximation of seasonal/regional expected temperature (e.g., a lookup table or simple latitude + day-of-year model), clearly labeled in the app's credits as an approximation rather than an official NOAA dataset. Today's actual forecast temperature is compared against this expected baseline to decide whether conditions read as cold, mild, or hot *for the season*, rather than against a fixed universal threshold.

## Decisions

Record the selected weather provider, forecast range, recommendation categories and rules, screen structure, visual direction, artwork approach (original, AI-generated, or appropriately licensed), deployment method, and one additional feature justified by the research. Briefly explain important trade-offs.

Once the recommendation categories are chosen, estimate the art needed: the character, three outfit variations per category, weather icons, and reminder icons. Use that estimate to choose the artwork approach.

**Weather provider:** National Weather Service API (api.weather.gov). Free, open data, no API key currently required, 7-day forecast range, covers all US states and territories. Trade-off: requires a separate geocoding step for manual-entry locations since the API only accepts lat/lon (open item, see Weather and technical evidence).

**Driving factors:** temperature, precipitation, and UV index.

**Reminder thresholds:**
- **Sunscreen:** UV Index ≥ 3 (EPA's "Moderate to High" category and above).
- **Hydration:** Heat Index ≥ 80°F (NWS's "Caution" category and above).
- **Umbrella:** Probability of Precipitation (PoP) ≥ 40%.

**Recommendation categories:** 3 temperature tiers (Cold, Mild, Hot), each adjusted against a seasonal/regional baseline rather than a fixed universal threshold (see Additional feature, above), crossed with a precipitation modifier (Dry, Rain) — **6 categories total**: Cold-Dry, Cold-Rain, Mild-Dry, Mild-Rain, Hot-Dry, Hot-Rain.

**Art estimate (~25–30 assets):** 1 mannequin character; shirt and pants as a single design each in 3 colors (3 + 3 assets, reused across all categories); shoes as 3 universal designs (not weather-specific); jacket (~4 assets) and hat (~3 assets) carrying the weather signal (none/light, light jacket or sun hat, raincoat or rain hood, heavy coat or beanie); plus ~5–8 weather condition icons and 3 reminder icons (umbrella, sunscreen, hydration).

**Artwork approach:** AI-generated. Given the ~25–30 asset count is manageable but still meaningful for a 2-week solo build, AI-generated art is chosen over fully original illustration. Carries forward to `spec.md`/build: (1) the information screen must disclose that artwork is AI-generated, per the brief's "art credits or licenses" requirement; (2) generation needs a consistent style/prompt approach (and likely a fixed reference image or seed) across all ~30 assets so the character and clothing don't look stylistically mismatched piece to piece.

**Geocoding:** Nominatim (OpenStreetMap, nominatim.openstreetmap.org), chosen over the Census Geocoder so the app can stay a plain static site (e.g., GitHub Pages) with no backend or proxy needed, since Nominatim returns CORS headers that allow direct client-side calls. Consequences to carry into `spec.md` and `plan.md`: (1) manual entry can accept a simple city/state (or ZIP) rather than requiring a full street address; (2) must send a descriptive User-Agent/Referer header and stay within the 1-request/second usage policy (fine for a single user's occasional manual-entry lookups); (3) must not implement autocomplete-as-you-type (disallowed by Nominatim's policy) — geocode only on explicit submit; (4) must display attribution to OpenStreetMap contributors (ODbL license) somewhere in the app, likely the information screen alongside other credits.

## Revisions

Record new evidence or changed decisions and explain why they changed.

## Approval

The Developer reviews the sources and decisions, corrects this file, and explicitly approves it before specification begins.

## Saving the transcript

After the Developer approves the research, ask them to enter `save transcript`. When directed, save the complete conversation as `transcripts/research-YYYY-MM-DD_HHMMSS.md`, label chat messages `Developer` and `Agent`, and confirm the saved path.
