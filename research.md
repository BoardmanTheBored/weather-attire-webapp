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

## Decisions

Record the selected weather provider, forecast range, recommendation categories and rules, screen structure, visual direction, artwork approach (original, AI-generated, or appropriately licensed), deployment method, and one additional feature justified by the research. Briefly explain important trade-offs.

Once the recommendation categories are chosen, estimate the art needed: the character, three outfit variations per category, weather icons, and reminder icons. Use that estimate to choose the artwork approach.

## Revisions

Record new evidence or changed decisions and explain why they changed.

## Approval

The Developer reviews the sources and decisions, corrects this file, and explicitly approves it before specification begins.

## Saving the transcript

After the Developer approves the research, ask them to enter `save transcript`. When directed, save the complete conversation as `transcripts/research-YYYY-MM-DD_HHMMSS.md`, label chat messages `Developer` and `Agent`, and confirm the saved path.
