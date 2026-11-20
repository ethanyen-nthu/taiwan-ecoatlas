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

- Circles never carry numbers. Size encodes how many records sit at that spot (square-root scale, so area tracks count), and the legend says so. Overlapping translucent circles still read as density.
- Every circle has a larger invisible hit area. Hover draws a ring; selection leaves a persistent ring and opens a card on the map where the click happened.
- Records that share one public position (generalized grid centres) cannot be split by zooming. Past zoom 12 the cell reports "N records at this spot" and points to the list instead of zooming forever.
- Embedded maps use cooperative gestures (two-finger pan on touch, Ctrl + scroll to zoom) so the page keeps scrolling.
- Section pages are map-first: filters and a clickable county list on the left, one sticky map on the right, with the table, charts and sources one tab below. Rare filters (dates, metric, aggregation, category) sit behind "More filters", and dataset caveats behind "About this data", opened by default only when a dataset is unavailable.

## County shading and sharing

- Every dataset with three or more counties of data can shade the map by county ("Shade counties"). A measurement (air quality, river index, temperature, forest share) is shaded by the county mean; otherwise the shading is the record count. Classes are quantiles (five, near-equal counts of counties) on a one-hue ramp that changes in lightness, so the map still reads without colour vision. AQI uses its official bands instead.
- While shading is on, points turn to translucent ink with a white edge so the colours underneath stay readable. Image datasets (forests) start on the image and switch to the county shares when shading is turned on.
- Count shading always carries the caveat that counties differ in size and survey effort: a darker county is not a worse one. Counties with no data stay unshaded and the key says so.
- A section map view (dataset, county, search, species, dates, metric, display, shading, tab) is written to the address bar with `history.replaceState`, so "Copy link to this view" gives a lecturer a link that reopens exactly what they were showing.
- Motion is limited to entrances, the county bars growing and the shading cross-fading, and all of it is off under `prefers-reduced-motion`.
