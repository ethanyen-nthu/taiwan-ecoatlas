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

- **60 % paper**: warm off-white surfaces (`--paper`, `--white`, `--soft`) and hairline rules. Nothing decorative is coloured.
- **30 % ink**: one blue-black (`--ink`) for text, chrome, primary buttons and the header. Muted text is a single grey (`--muted`) that passes 4.5:1 on paper.
- **10 % subject colour**: each subject owns one hue at matched lightness and chroma, so none outranks another: environment blue, urban teal, forests green, wildlife amber, culture clay. A page sets `data-subject` on `<main>` and the accent roles (`--accent` for marks and bars, `--accent-ink` for filled controls and text, `--accent-soft` for selected rows) follow. The same hue colours that subject's points on the map, its county bars and its row on the homepage index.
- **AQI is the exception**: the official six-band palette appears only where an AQI reading does (station circles, county bars, legend). Because it is a reserved scale, it is never reused as decoration.
- The basemap is a quiet light style (OpenFreeMap Positron) and county outlines stay neutral, so data colour is the loudest thing on the map.

## Map interaction

- Circles never carry numbers. Size encodes how many records sit at that spot (square-root scale, so area tracks count), and the legend says so. Overlapping translucent circles still read as density.
- Every circle has a larger invisible hit area. Hover draws a ring; selection leaves a persistent ring and opens a card on the map where the click happened.
- Records that share one public position (generalized grid centres) cannot be split by zooming. Past zoom 12 the cell reports "N records at this spot" and points to the list instead of zooming forever.
- Embedded maps use cooperative gestures (two-finger pan on touch, Ctrl + scroll to zoom) so the page keeps scrolling.
- Section pages are map-first: filters and a clickable county list on the left, one sticky map on the right, with the table, charts and sources one tab below. Rare filters (dates, metric, aggregation, category) sit behind "More filters", and dataset caveats behind "About this data", opened by default only when a dataset is unavailable.
