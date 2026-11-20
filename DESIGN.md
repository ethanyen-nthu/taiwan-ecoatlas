# EcoAtlas interface direction

The interface is a scientific field atlas for the public and researchers: the real map is the leading visual, controls stay readable at field-work distances, and source availability remains explicit. Colour follows a 60/30/10 split described below. Official AQI swatches retain their independently verified colours and are used for nothing else.

One token system governs navigation, map tools and documentation. Display type uses the existing sans/serif contrast; controls use a legible system sans stack with Traditional Chinese fallbacks. Primary controls use 13–14px type, narrative copy uses 15–16px, and mobile inputs use 16px. Cartographic labels, source codes and overlines remain compact. Interactive targets grow to 40–44px where density allows. Motion only signals selection/disclosure and respects reduced-motion preferences.

The homepage puts a plain statement of what the atlas contains beside a tall working map (so Taiwan fills the frame), shows live source status under the introduction, then a numbered subject index and a short note on why limits are shown. It uses no slogans, tracked-caps labels or decorative icon cards; labels are sentence case. The explorer is a workbench: county/search/filter controls first, active layers next, source provenance one tab away. Unimported layers are grouped in a disclosure. Supporting pages use readable source sheets and tables rather than tiny dashboard cards.

Watermelon supplies adapted interaction source, not a second design system:

- Continuous Tabs → controlled, keyboard-operated explorer tabs with a sliding CSS indicator.
- Card Split Accordian → the five-subject homepage index, with real descriptions and navigation.
- FAQ 6 → native numbered methodology disclosures on the About page.

Sources, dependencies and the upstream MIT licence are recorded in `THIRD_PARTY_NOTICES.md`. The adaptations use the existing React/Lucide/CSS stack; no animation library or demo data is added.

## Colour

- **Neutral base**: warm off-white surfaces (`--paper`, `--white`, `--soft`) and hairline rules carry the controls, lists and tables, so reading stays calm. On a subject page the paper itself is tinted a little towards that subject's `--accent-soft`.
- **Ink for text and chrome**: one blue-black (`--ink`) for text, the site header and primary buttons. Muted text is a single grey (`--muted`) that passes 4.5:1 on paper.
- **Subject colour in large fields**: a section page opens on a full-width block of its `--accent-ink` with the island outline as a tonal shape, then a band of `--accent-soft` carrying the headline numbers in `--accent-ink`. The homepage is five tiles, one per subject, each a mix of the hue and its ink (so white type holds 4.5:1) led by a number counted from the data. Colour is therefore the first thing a reader meets, not a 10 % accent.
- **Subject colour in the data**: each subject owns one hue at matched lightness and chroma, so none outranks another: environment blue, urban teal, forests green, wildlife amber, culture clay. A page sets `data-subject` on `<main>` only (links use `data-tone`) and the accent roles (`--accent` for marks and bars, `--accent-ink` for filled controls and text, `--accent-soft` for selected rows) follow. The same hue colours that subject's points on the map, its county bars and its row on the homepage index.
- **AQI is the exception**: the official six-band palette appears only where an AQI reading does (station circles, county bars, legend). Because it is a reserved scale, it is never reused as decoration.
- The basemap is a quiet light style (OpenFreeMap Positron) and county outlines stay neutral, so data colour is the loudest thing on the map.

## Map interaction

- **Marks say what the data is.** Big circles are gone. Where a dataset has thousands of positions, or publishes positions only as coarse cells (the wildlife archive: 10 km grid centres), the server groups records and the map draws **squares**: each square is the real extent of its cell, shaded in up to four classes on the subject ramp (light to dark, quantile breaks, never an empty class). A circle there would claim precision the source withholds. The key says "Records per square (each about N km wide)" and carries the caveat that squares are counts, not places.
- **Single records are small dots.** Every dot is the same size (2.6 px at island zoom, 6.5 px up close, with a white edge), so size never competes with colour. Records that share one public position and have no published cell are drawn as a **hollow ring** (white centre, thick subject-colour outline) so they read as "more than one here", not as a quantity.
- **Squares stay put.** Grid cells snap to 0.8 degrees halved some whole number of times (`gridStep`), so panning does not reshuffle tiles. Clicking a square made of finer cells zooms to it; clicking a square the source published as one coarse cell, or a stack, opens its details instead of zooming forever.
- **Bigger information, in layers.** Hover gives a one-line tooltip ("N records · click to zoom in"). Click opens a roomy panel (440 px, 15 px body text) beside the map: for a square or stack, what it stands for and the list of who is inside; for a village, its people, a one-paragraph orientation and a primary button to the full village profile. The panel is a summary; the profile page is where the reading happens.
- Every mark has a larger invisible hit area. Hover outlines a square or rings a dot; selection leaves a persistent outline and moves focus to the panel.
- Embedded maps use cooperative gestures (two-finger pan on touch, Ctrl + scroll to zoom) so the page keeps scrolling.
- Section pages are map-first: filters and a clickable county list on the left, one sticky map on the right, with the table, charts and sources one tab below. Rare filters (dates, metric, aggregation, category) sit behind "More filters", and dataset caveats behind "About this data", opened by default only when a dataset is unavailable.

## Village and people pages

`/culture/places/village-N` is a reading page for one village record; `/culture/peoples` and `/culture/peoples/[slug]` are guides to the sixteen peoples. They are bilingual and built from the same open data as the map.

- **What is on a village page:** where it sits (a small SVG outline map drawn from `public/data/county-outlines.json`, no tiles or scripts, dots for the village, its neighbours and others of the same people), an at-a-glance fact list, the people (history, living culture, words worth knowing), the nearest villages by straight-line distance, a township summary, how to read the record, and the source with its licence.
- **What is not, and why.** The open government data holds a name, a county, a township, a public reference point and a catalogue date. It holds no photographs, no founding dates and no per-village history, so the page does not invent them. Photographs of identifiable people need their consent, so the page points to Wikimedia Commons (each photograph carries its own credit and licence) instead of hotlinking unverified images. The history shown is the people's, written in our own words and hedged where scholars differ.
- **Honest numbers.** Only the Amis, Atayal and Paiwan populations are taken directly from the Ministry of the Interior's end-of-2025 release; the other figures are rounded and labelled as estimates in the code (`official`).
- **Outline maps** are a drawing aid, simplified with Douglas-Peucker (`scripts/build-county-outlines.mjs`, about 84 KB). They never decide which county a record belongs to.

## County shading and sharing

- Every dataset with three or more counties of data can shade the map by county ("Shade counties"). A measurement (air quality, river index, temperature, forest share) is shaded by the county mean; otherwise the shading is the record count. Classes are quantiles (five, near-equal counts of counties) on a one-hue ramp that changes in lightness, so the map still reads without colour vision. AQI uses its official bands instead.
- Datasets drawn as squares start with county shading off, because two filled encodings on one map fight. If shading is turned on, squares switch to a neutral ink ramp so the two never share a hue. Other points turn to translucent ink with a white edge so the colours underneath stay readable. Image datasets (forests) start on the image and switch to the county shares when shading is turned on.
- Count shading always carries the caveat that counties differ in size and survey effort: a darker county is not a worse one. Counties with no data stay unshaded and the key says so.
- A section map view (dataset, county, search, species, dates, metric, display, shading, tab) is written to the address bar with `history.replaceState`, so "Copy link to this view" gives a lecturer a link that reopens exactly what they were showing.
- Motion is limited to entrances, the county bars growing and the shading cross-fading, and all of it is off under `prefers-reduced-motion`.

## Teaching pages

`/teach`, `/teach/[slug]`, `/teach/glossary`, `/county` and `/county/[code]` are written for lecturers in environmental science and cultural studies, and are bilingual (EN / 繁中) throughout.

- **Lessons are content, not decoration.** Each of the seven lessons in `src/content/lessons.ts` has objectives, preparation, background, a step-by-step activity whose links open the exact map view (`/forests?shade=1`, `/wildlife?start=2017-01-01&end=2017-12-31`), what the data shows, discussion questions, pitfalls, an assessment idea, sources and a citation. Numbers in "What the data shows" are counted from `public/data` at build time (`src/server/facts.ts`), so they cannot drift from the maps. `tests/lessons.test.ts` checks both languages, link targets and the quoted counts.
- **Claims stay hedged.** Roadkill year and month patterns are not given causes; village dots are public reference points, not territories; RPI class boundaries tell the reader to check the agency's current definition. Records are counts, never rates.
- **Same colour logic as the maps.** A lesson takes its subject hue for the head, rules and step markers on a neutral reading surface; index, glossary and county pages use the neutral ink head with the five-hue stripe. Body text is 16px at 74ch.
- **Two views of one page.** "Student handout view" hides the instructor-only blocks (before class, what the data shows, watch out for). Print CSS drops the header, footer and colour, prints each map link's address, and shows a base-address note.
- **County profiles** show the five datasets side by side. A county missing from a dataset shows a dash and the sentence "no data, not zero".
