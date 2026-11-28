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
- **Subject colour in large fields**: a section page opens on a full-width block of its `--accent-ink` with the island outline as a tonal shape, then a band of `--accent-soft` carrying the headline numbers in `--accent-ink`. The homepage is one scroll in six chapters (see below), and the page background itself changes hue as each subject arrives. Colour is therefore the first thing a reader meets, not a 10 % accent.
- **Subject colour in the data**: each subject owns one hue at matched lightness and chroma, so none outranks another: environment blue, urban teal, forests green, wildlife amber, culture clay and plants plum. A page sets `data-subject` on `<main>` only (links use `data-tone`) and the accent roles (`--accent` for marks and bars, `--accent-ink` for filled controls and text, `--accent-soft` for selected rows) follow. The same hue colours that subject's points on the map, its county bars and its row on the homepage index.
- **AQI is the exception**: the official six-band palette appears only where an AQI reading does (station circles, county bars, legend). Because it is a reserved scale, it is never reused as decoration.
- The basemap is a quiet light style (OpenFreeMap Positron) and county outlines stay neutral, so data colour is the loudest thing on the map.

## Scroll story and section guides

- **One scroll, six chapters.** The home page pins the island on the left while chapters scroll past: air, forests, wildlife, plants, people, city. The island's fill, outline and the band's background shift to the chapter's hue, and each chapter draws its own real marks on the island: live stations, the 2023 forest-cover raster, the roadkill counties shaded on the wildlife ramp, village points, Taipei's parks. Positions use `islandPoint()` in `src/lib/island-path.ts`; the marks are built from the published files by `src/server/journey.ts`.
- **What every chapter says.** Each has a counted number, what is drawn, how to read it, three things a reader can learn and a link in. Numbers count up once on first sight.
- **Motion is optional.** Reveal-on-scroll and count-ups only run for people without `prefers-reduced-motion`, and the final figures are in the server HTML. On phones the island becomes a pinned strip.
- **Every subject page opens the same way.** `SectionGuide` states what the page shows, what it can teach and what it cannot say, kept to one compact band so the map stays near the top. The city page adds a one-line "Why only Taipei?" answer that opens to the reasons and to other cities' own open-data portals; nothing from those portals is imported.

## Roadkill county map

The wildlife page used to open on 10 km squares and a blurred density surface. Readers found both confusing: a square looks like a place, the blur has no edge to read, and neither says a number. A first fix drew the counties as a separate flat SVG; it read clearly but looked like a different site next to every other map. The page now opens on the **same map component as every other page** (`MapCanvas`, same basemap, zoom, pan, county hover and county click) with the counties tinted by count:

- **One hue, five steps.** Counties are tinted on the wildlife amber ramp by included-record count (quantile classes, the same `buildChoropleth` the other pages use), light to dark, with the usual translucent fill so the basemap shows through. The standard "County shading key" sits under the map. There is no shading switch here: the counties are the picture.
- **The number is printed inside.** MapLibre cannot draw text here (the basemap style has no font files), so each count is a small pale pill placed as a DOM marker (`county-count`). `countyLabelSpots()` finds, per county, the point farthest from its border (`labelSpot()` on the outlines, squeezed for latitude) so it sits on the largest island, not on a coast. Roomier counties place their pill first; a pill is shown when its county is at least about half as wide as the number and it would not touch one already placed, so the rest appear as the reader zooms in. Penghu, Kinmen and Lienchiang have no neighbours to crowd them, so theirs always show. The pill is pale with dark ink so it stays readable on every step; it ignores the pointer so a click still selects the county beneath. Hovering a county also shows its count.
- **Choosing a county** (on the map, in the county list or in the filter) zooms to it, outlines it as every other page does, and fills the panel under the map: the county's name in both languages, its count and share, the animal groups, and the animals reported most there, each with a photo, Chinese and English names, a bar and a link to its page. The panel follows the same species, date, search and county filters as the table.
- **Honesty stays on screen.** The panel always says these are counts of screened historical reports, not roadkill risk or animal numbers, and that counties differ in size, traffic and how closely roads were checked.
- **The grid is one switch away.** "10 km grid" keeps the squares and the smoothed surface for people who want them (`?view=grid`; older links that carry `mode=` open on the grid).
- **Clicking an animal opens the animal.** In the table an animal's name is a link to its page (photo, names, description, evidence). "Show on map" exists only in the grid view, where single records have a place to show.

## Photos

Every animal and tree page leads with a photo. A fixed list of freely licensed Wikimedia Commons photos (`public/data/atlas/photos.index.json`: file path, photographer, licence, 250 px size; helper `src/lib/photo-index.ts`) is built into the page, so the picture appears at once, appears in lists and cards (`PhotoThumb`), and is still there if Wikipedia cannot be reached. Pictures are Commons' own resized copies at sizes Wikimedia serves (250, 500, 960 px) and nothing is copied into this repository. The summary and any further photos still load live in the visitor's browser (`src/lib/wikimedia.ts`; thumbnails now come from `thumb.wikimedia.org` as well as `upload.wikimedia.org`, and both are accepted). Every photo keeps its photographer, licence and a link to its Commons file page. Ten kinds (eight freshwater crabs, one skink, one tree) have no free photo on Commons and show a quiet tile and a message instead.

## Map interaction

- **Marks say what the data is.** Big circles are gone. Where a dataset has thousands of positions, or publishes positions only as coarse cells (the wildlife archive: 10 km grid centres), the server groups records and the grid map draws **squares**: each square is the real extent of its cell, shaded in up to four classes on the subject ramp (light to dark, quantile breaks, never an empty class). A circle there would claim precision the source withholds. The key says "Records per square (each about N km wide)" and carries the caveat that squares are counts, not places.
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

## Section tabs and "compared with before" pages

Every subject (Environment, Forests, Wildlife, Culture, City, Plants) now opens with a visible tab strip (`src/components/section-tabs.tsx`, tabs listed in `src/content/section-tabs.ts`). It replaced a small text link that sat inside a sentence in the page header.

- **The current page is a solid block, the rest are outlined.** The current tab is filled with the subject's ink colour, the others are white blocks with a quiet outline, each at least 56 px tall with a one-line hint ("PM2.5, 2013–2025"). Tabs are real links to real pages, so the current one is marked with `aria-current="page"` and back/forward and sharing keep working. On a phone the tabs stack full width.
- **One layout for every "over time" page** (`src/components/trends/time-page.tsx`): headline, three large figures, charts each with a "See the numbers" table, "How to read it", questions for class, then sources. The three figures never carry a number that is not in the data modules.
- **Bars with the numbers written on them** (`bar-chart.tsx`): bars always start at zero, every value is printed, and a missing value is drawn as a labelled dash, never as a zero. A hatched bar marks a figure from a different method that must not be read as part of the line (the atlas's own 2023 forest map beside the two inventories).
- **Heat tables** (`heat-table.tsx`) tint a cell by its size but print every number, so colour is a hint, not the message. Rows are tinted against their own largest value, or the whole table against one scale where noted; the wildlife page uses both.
- Pages show only figures traced to a source or counted from the atlas's own files, and say what is unavailable (county-level history, 2020–21 air, a raster comparison of forest change) rather than filling the gap.

## Live pages: weather, reservoirs and the county section

`/environment/weather` and `/environment/reservoirs` reuse the `TimePage` layout (headline, figures, how to read it, questions, sources) but show the latest readings instead of a history, so each says so plainly ("right now, not what is normal"; "this is now, not history"). Both start with a status bar (fresh/stale, newest reading time, Refresh). When a feed is down or not configured the page shows one plain notice and nothing else: no figures, no chart, no table, nothing estimated.

Bars are `HBars` (`src/components/environment-now/h-bars.tsx`): horizontal, from zero, one scale, the number written beside each bar. Reservoir bars use one colour. The Water Resources Agency asks that storage percentages not be coloured green, yellow, orange or red so they are not mistaken for its water-situation lights. A bar that would pass the end of its track is drawn full with a hatch and the words "above 100%"; it is never cut short silently. A county's weather figure is its middle station (the median) with the coolest and warmest beside it, not an average, because stations are unevenly spread and some are on high peaks. Tables scroll inside their own box on a phone, and the box is positioned so hidden screen-reader text cannot widen the page.

The landing page's `CountySnapshot` shows six subject cards for one county: air and weather now (live), forest 2023, roadkill records, listed villages, Taipei parks and Taipei tree kinds. The figures come from the same `countyDetail` the county profile pages use, and a test checks they agree. Urban and tree cards show a dash with "Taipei City only" elsewhere.

## Today

The home page's first screen has "Today in Taiwan" beside the map (`src/components/today/today.tsx`): four figures (air quality, temperature, rain so far, reservoir storage) in plain type with the unit and a line saying what each is the middle of or the total of, each linking to its page, then the three source statuses. On a phone the figures come before the map. Every other page except the full-screen map has the same figures as a slim strip under the header. All of it comes from one small request, `/api/today`, which boils down the feeds the live pages already use (shared by the CDN for two minutes) so a page view does not download 874 stations.

A part with no reading is left out, never shown as 0, and if nothing has a reading the strip disappears and the home panel says there are no live readings. A stale feed says "older reading". The only colour is the air-quality band dot, and the band is named in words beside it; reservoir storage stays a plain number because the Water Resources Agency asks that it not be coloured like its water situation lights.

## Live hazards on the map

Felt earthquakes and tropical cyclones are two optional layers on the explorer (`src/components/map/hazard-layers.ts`, with the list, status and key in `src/components/hazards/`). They are the only layers whose subject can be frightening, so the design leans on plainness: the agency's own words and numbers, a source line in every popup, and "a map of what the agency has published, not a warning" wherever the layer appears.

- **Colour.** Earthquakes use a sequential sand-to-plum ramp for strongest reported intensity (grey, not a ramp step, for "not reported"), so deeper means stronger and nothing reads as a traffic light. Cyclones use one indigo hue (`#4a3aa7`) that no other layer or subject uses, with the area fills kept light enough to read the basemap through them.
- **Size means magnitude, colour means shaking.** They are different quantities, and the key says which is which. A small strong-shaking dot is possible and is drawn small.
- **Line style carries the meaning twice.** The analysed track is solid and the forecast is dashed; the latest position is a filled dot with a ring and forecast positions are open rings. Nothing depends on colour alone.
- **Honest empty states.** The layer row says one of: reports with their newest age, "none in the agency's recent reports", an older reading, feed could not be reached, feed unreadable, or not configured. A down feed is never shown as "none".
- **Framing.** Switching the cyclone layer on frames Taiwan and the whole track once, because a storm out in the Pacific is otherwise off screen; later refreshes leave the map where the reader put it. With both layers on, the cyclone key starts collapsed and the intensity bands sit two to a row so the key does not cover the island it describes.
- **Popups.** They scroll inside the map when long, take keyboard focus, and are labelled regions. A list in the layer row opens the same popup as a click, so everything on the canvas can be reached without the canvas.
- **Today.** A tracked cyclone leads the strip and the latest felt earthquake from the last seven days follows. Neither appears when its feed is down, and there is never a "none" line.

## Feedback

`/feedback` is deliberately not a form that posts to a server: the site has no database and no account, and a mail service would need a key and would store people's words. It builds a `mailto:` link instead, so the message goes from the visitor's own address and can be answered there. The exact email (to, subject, body) is shown first, the screen size and browser line is optional, and a "copy the message" button covers people with only webmail. The page address comes from the footer link, and only a plain path on this site is accepted. The same page links the public GitHub issues page.

## Search

`/search` is a plain list and a plain matcher, not a search service. The server builds one JSON list (about 1,400 rows, roughly 250 KB) from the pages' own data files; the browser downloads it only when the search page is opened and filters it locally, so nothing a visitor types leaves their device and there is no key to protect. Every word typed must match (a title match outranks a match in the quiet extra words; an exact title outranks a title that merely starts with the word), text is lower-cased and stripped of accents, and 台 is read as 臺 so either spelling finds the county. Results are grouped by kind in a fixed order, with the other language shown smaller beside each title, and a group longer than eight shows the rest on request. The query is kept in the address (`?q=`) with `history.replaceState`, so a search can be shared without adding a history entry for every keystroke.

## Cite and download

Every `TimePage` ends with "Cite this page and take the numbers" (`src/components/trends/cite-download.tsx`). It gives a copy-ready citation (site, year, page title, address, the agencies behind the data, and the day it was opened in Taiwan time), a print or save-as-PDF button, and one CSV download for each table on the page. Live pages (weather, reservoirs) add the clock time to the citation and say why. The citation date is filled in the browser, so the statically built page never prints a date it cannot know.

The CSV is read from the table as it appears, so it always agrees with the page: numbers are written as shown (same rounding), thousands commas are removed so spreadsheets read them as numbers, and a dash becomes an empty field, never zero. A byte-order mark keeps Chinese names intact in Excel. Source lines (page, agencies, access date) can be added under a blank line at the bottom of each file, on by default. Hidden screen-reader text never reaches a file; an element marked `data-csv-extra="Name"` inside a row becomes an extra column (the reservoir number), and `data-csv` on a cell overrides its text.

## Temperature over time

`/environment/temperature-over-time` ("Is Taiwan getting warmer?") is the one history page whose numbers come from a model, so the page says so in its first note ("A model, not a thermometer") and in the chart wording ("modelled"). It uses `LineChart` (`src/components/trends/line-chart.tsx`), the same hand-built SVG idea as the air chart with a slider-style scrubber for finger, mouse and arrow keys (Page Up/Down jump ten years), but written to take any set of yearly series.

- **Colour.** The page colour (environment blue) is the island's ten-year average; single years are faint blue dots, the county you add is a dashed clay line (the same second colour the air chart uses), and the early-period average is a dashed grey rule with its value written on it. Summer is clay and winter is blue and dashed, with the value written at the end of each line, so no meaning rests on colour. The county bars use one clay colour because they all mean the same thing (a rise).
- **Anomalies, not raw values, for the two seasons.** Summer and winter sit about 14 degrees apart, so one axis of raw values would flatten both. The season chart draws each as degrees above or below its own 1950–1979 average, smoothed over ten years, with the zero line labelled; yearly values for each season are in the table.
- **Gaps stay gaps.** Penghu and Lienchiang came back with no values from the model; they are listed in the notes by name, greyed and unselectable in the county picker, and shown as hatched "no data" rows in the bars. The island line averages only counties with a full record and says how many. Lines break at a missing year instead of joining across it.
- **Smoothing is trailing and honest at the edges.** The ten-year line is each year plus the nine before it and starts in the tenth year; it never invents values at the ends.
- **Credit sits where the numbers are.** "Weather data by Open-Meteo.com" is linked under the first chart, and again, with the Copernicus wording, in the sources.

## Air over time

`/environment/air-over-time` answers one question for a lecturer: has Taiwan's air improved? It is a single hand-built SVG line chart (`src/components/air-trend/air-chart.tsx`), not a charting library, so the honesty rules are in the drawing.

- **One headline series, one comparison.** National annual PM2.5 is the solid environment-blue line; central and southern Taiwan is a dashed clay line with hollow dots because it has three years, not thirteen. Dash and marker shape carry the difference, so colour is not the only cue. The official AQI palette is not used: this is a concentration, not an AQI band.
- **Yardsticks, not decoration.** Horizontal grey lines mark the old Taiwan standard (15), the current one (12) and the WHO guideline (5), labelled in words at the left edge. They are the reason the line means anything.
- **Gaps are drawn, not smoothed.** 2020–2021 are a shaded band labelled "not plotted"; the line stops at 2019, restarts at 2022 and a pale dashed bridge says the eye is interpolating. The numbers table beneath repeats every year, and says "Not plotted" for the two gaps.
- **Reading by pointer or keyboard.** The chart is one `role="slider"` over the plot, so Arrow keys, Home/End and Escape step through plotted years and a tooltip (`role="status"`) names the values. A single overlay replaced per-point buttons because they overlapped at phone width and failed the 24 px target-size check.
- **Context before conclusions.** Three typographic figures (−47%, −24%, 997 → 146 red-alert station-days) lead; "How to read it" then lists why a falling line is not the whole story: method differences, weather years (2023 rose), changed standards, ozone not falling, and averages hiding places. Questions for class sit after that.

## Year maps

`YearMap` (`src/components/trends/year-map.tsx`) is the shared "watch it change" map used on the temperature page (1950–2025) and the air page (2021–2025). It is one component fed a list of measures, so a new measure is data, not new drawing. The county outlines are the repository's generalized county file, read on the server (`src/server/county-shapes.ts`) and passed down as a prop, so no outline is fetched in the browser.

- **Each county is compared with itself.** The temperature map shades a year against that county's own 1950–1979 mean (winter 1951–1979), on a diverging blue-to-clay ramp whose neutral shade is the early average. A cold mountain county and a warm coastal one therefore start from the same colour, and only change shows. Raw temperatures are never mapped, because they would show altitude, not warming.
- **Colour.** Temperature uses blue for cooler and clay-to-brown for warmer. PM2.5 uses a separate sand-to-plum "haze" ramp on purpose, so a purple county is never read as "cooler". Each measure has one fixed scale, so dragging the slider changes shades, never what a shade means; the legend lists only classes the data actually reaches.
- **Gaps are hatched.** A county with no value is drawn with a hatch and a darker outline and is named in the note under the map (Penghu and Lienchiang for temperature). Offshore counties (Kinmen, Penghu, Lienchiang) are drawn in inset positions and labelled, so the hatch is visible and they can be picked.
- **Two ways to look.** "Year by year" has a play button, a slider and arrow-key stepping; "Then and now" puts two periods side by side with a difference line, using whole decades (the last is the six years 2020–25 and says so). Both read the same fixed scale.
- **One county in detail.** Pointing at, tapping or choosing a county from the list fills a card with its value, a small yearly line with the current year marked, and the early-average rule. On phones the order is controls, map, detail, so the slider is never below the fold.
- **Numbers sit under the map.** "See the numbers" holds the full table (a dash for a missing value, never a zero); the page's "Cite and download" block turns it into CSV.
- **PM2.5 caveat.** The county map uses the ministry's automatic-station county averages, which exist only for 2021–2025 and use a different method from the 31-station national series on the same page. The two are never drawn on one axis, and the page says so.

## Taiwan in five minutes

`/tour` is the short way in for someone who has not decided where to look. It is a different thing from the home page's six-chapter scroll: that one walks through the datasets; this one walks through six findings, in the order a lecturer would raise them (air, warming, forests, roadkill reports, the sixteen peoples, one city's trees) and ends on "your own county". It is linked from the home hero and found by search.

- **One map, pinned.** On a wide screen the county map stays on the left and the text scrolls on the right; on a phone the map becomes a strip across the top (46% of the screen) with the text beneath it. Which stop is "current" is decided by whichever one covers a thin band a little below the middle of the screen, so a stop never changes while it is being read. The progress dots are ordinary links to `#stop-…`, so the page works without scripting, by keyboard and from a shared link.
- **Every number is counted, not typed.** `src/lib/tour.ts` builds each stop from the same files as the pages it points to (national and county PM2.5, the temperature model, the 2023 land-cover statistics, the screened wildlife subset, the village list, the Taipei inventories), and `tests/tour.test.ts` checks the totals against those files. The air stop's headline is the national series (−47%, 2013–2025) while its map is the county table for 2025; the text says the two use different methods and are never put on one axis. If a figure the tour needs is missing, the build fails instead of printing a wrong sentence.
- **Colour.** Each stop wears its subject's hue from the same tokens as the rest of the site (environment blue, forest green, wildlife amber, culture clay, city teal) on its left rule and big number, and the map panel takes that subject's soft tint, so the page changes hue as the story moves. Map shades come from the existing scales: the PM2.5 haze ramp, the temperature change ramp, a fixed forest-share scale, and the wildlife quantile ramp. The legend lists only the classes in use.
- **Gaps stay gaps.** Counties without a figure are hatched and the legend says "No data" (Penghu and Lienchiang for temperature, three counties for forest cover). The county tables under each stop show a dash, never a zero.
- **Small islands are enlarged, honestly.** Matsu, Kinmen and Penghu are a few pixels wide at island scale, and Matsu is in the roadkill top three, so each is drawn again with a thick stroke in its own colour. The blobs follow the real shapes and are labelled.
- **Limits come with every finding.** A "What it cannot tell you" note sits under each one, in the reader's language, and a link goes to the full page.
- **Motion is optional.** Colours change over 0.7 s only for people who have not asked for reduced motion; nothing plays or advances by itself, and smooth scrolling to a stop is off with reduced motion too.

## Share pictures and the county report card

Two things leave the site on paper or in a chat: the picture a link shows, and a printed county sheet. Both are built from `src/lib/county-card.ts`, which reads the same tour data as `/tour`, so neither can disagree with the tour or with each other.

- **The link picture** (`/county/[code]/opengraph-image`, 1200 × 630) is drawn on the server by Satori. Left: the county's name in Traditional Chinese at 124 px, the English name under it, then four ruled lines (PM2.5, warming, forest share, roadkill reports) with the figure at the right and a short bilingual label. Right: the county's own outline in ink. Each rule takes its subject's hue (the same tokens as the pages), the figures stay ink so no hue outranks another, and the paper is the site's warm white. Nothing is decorative: no gradient, no icons, no badges. The text is large enough to read in a LINE preview on a phone.
- **A gap stays a gap.** Where the atlas has no figure the line shows a dash (Kinmen has no forest figure), and the preview sentence beneath the title leaves that figure out rather than naming it.
- **The outline** is the county's largest group of islands, drawn as large as the box allows. An island more than 0.7° (about 75 km) from the rest is left off (Kinmen's Wuqiu islet), so the main islands are not shrunk to a speck; the picture is a mark, not a map, and every figure still counts the whole county. Islets outside the county maps' frame (Pratas, Taiping) are left off, as on the maps.
- **The font** is a 120 KB subset of Noto Sans CJK TC (SIL Open Font License 1.1) cut by `scripts/subset-card-font.py` from the characters the pictures can print, because Satori needs a font file and a whole Chinese font is about 16 MB a weight. `tests/county-card.test.ts` checks every county name and label against the kept characters, so a missing glyph fails a test instead of printing an empty box. Run the script again when a Chinese word is added to the files it lists.
- **The report card** (`/county/[code]/card`) is a ledger: one row per finding with a 5 px rule in the subject's hue, the figure large, its place among the counties that have one, and three short paragraphs (what it is, what it cannot tell you, source). On a phone the rows stack. Printed, it is one A4 page: the site chrome goes, the three paragraphs sit side by side, and the page ends with the address of the county page and of `/sources`. It follows the language switch.
- **Sharing.** "Copy link to share" copies the county page address, which carries the picture and description, and says so beside the button. The card itself is `noindex`: the county profile is the page to find.
