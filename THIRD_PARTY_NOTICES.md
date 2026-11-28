# Third-party UI notices

Watermelon UI source was retrieved and inspected on 2026-11-15 from its public catalogue and registry. The following MIT-licensed components were adapted to the existing EcoAtlas design system.

## Continuous Tabs

- Preview: https://ui.watermelon.sh/animated-components/continuous-tabs
- Retrieved source: https://registry.watermelon.sh/r/continuous-tabs.json
- Adaptation: `src/components/watermelon/continuous-tabs.tsx`
- Original dependencies: motion.
- Registry response SHA-256: `0253b4190b5e94ee319067e4fe5221334f09a701c4652c7c5b40c11d7d0f0522`

## Card Split Accordian

- Preview: https://ui.watermelon.sh/animated-components/card-split-accordian
- Retrieved source: https://registry.watermelon.sh/r/card-split-accordian.json
- Adaptation: `src/components/watermelon/split-accordion.tsx`
- Original dependencies: lucide-react, motion, react-icons, react-use-measure.
- Registry response SHA-256: `93e16bce80f086082ceae2739eaaf06cb0a3cb2bf62c0a3ed1e9645a30df8ca9`

## FAQ 6

- Preview: https://ui.watermelon.sh/block/faq-6
- Retrieved source: https://registry.watermelon.sh/r/faq-6.json
- Adaptation: `src/components/watermelon/methodology-faq.tsx`
- Original dependencies: react-icons.
- Registry response SHA-256: `1f803810f393e82a5c972b8648fe06f6b97214442f91c0d7145bd7c1b54ca161`

Motion, react-icons, react-use-measure and demo-only imports were replaced with existing Lucide icons, controlled React state and reduced-motion-aware CSS/native disclosures. Demo copy and handlers were not retained. The original single-selection/disclosure and active-indicator patterns were adapted; the full upstream templates were not installed.

## Upstream licence

Verified at https://raw.githubusercontent.com/WatermelonCorp/watermelon-platform/main/LICENSE

```text
MIT License

Copyright (c) 2026 Watermelon Platform Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Wikipedia and Wikimedia Commons (loaded at runtime)

Animal and tree pages ask `*.wikipedia.org` (anonymous, cross-origin) from the visitor's browser for a summary and photos. Nothing is copied into this repository. Summaries are shown with a CC BY-SA 4.0 notice and a link to the article. Photos are shown only if Commons hosts them, with the artist, licence short name, licence link and file-page link taken from each file's metadata.

## Noto Sans CJK (share-picture font)

- Used for: the pictures a link to a county or to the atlas shows in chat apps, drawn on the server (`src/app/opengraph-image.tsx`, `src/app/county/[code]/opengraph-image.tsx`).
- Files: `src/assets/fonts/card-regular.otf`, `card-bold.otf`, subsets of the Traditional Chinese face of Noto Sans CJK, made with `scripts/subset-card-font.py`; `card-glyphs.txt` lists the characters kept.
- Copyright 2014-2021 Adobe (http://www.adobe.com/), with Reserved Font Name "Source". Licensed under the SIL Open Font License, Version 1.1: https://openfontlicense.org/open-font-license-official-text/
- The subsets are derived from the original files by dropping glyphs and layout tables; no outlines were changed.
