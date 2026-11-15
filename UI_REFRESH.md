# UI refresh — 15 November 2026

The requested UI revision is complete. The interface uses the locally installed Distinctive Web Design, Watermelon UI and Playwright Best Practices skills. Design rationale is consolidated in `DESIGN.md`.

## Changes

- Reworked the homepage around a larger working map, an editorial introduction, readable source states and a numbered subject index.
- Adapted Watermelon **Continuous Tabs** for the explorer, **Card Split Accordian** for the five-subject index, and **FAQ 6** for methodology disclosures. Original source, registry-response hashes and the verified upstream MIT licence are in `THIRD_PARTY_NOTICES.md`.
- Consolidated the design tokens and stylesheet. Increased control text, source metadata and touch targets; improved borders, focus indicators, mobile inputs and Traditional Chinese wrapping.
- Added arrow-key tab navigation, Escape/focus restoration for mobile navigation, and inert collapsed explorer panels. Grouped the eight unimported layers in a disclosure.
- Corrected grid minimum-content sizing and stacked narrow editorial columns so text can enlarge to 200% at a 320px viewport without horizontal scrolling.
- Preserved reduced-motion behavior, official county geometry, official AQI swatches and source availability semantics. No new runtime dependency was required; axe is development-only.

## Verification

| Check | Result |
| --- | --- |
| Production build | Passed |
| Type checking | Passed |
| ESLint | Passed, zero warnings |
| Unit/API/geography tests | 49 passed |
| Production Chrome browser suite | 10 passed |
| Watermelon interaction coverage | Keyboard tabs, subject accordion and native methodology disclosures passed |
| Responsive coverage | Desktop, phone, 320px viewport and 200% root text sizing passed |
| Automated accessibility | No axe violations for the selected WCAG A/AA tags on homepage, explorer, sources and about pages |
| Visual inspection | Desktop homepage/explorer/source sheets and English/Traditional Chinese mobile layouts inspected |
| Dependency validation | Peer compatibility and frozen offline install passed |
| Local preview | Homepage, explorer and sources returned HTTP 200 after the final restart |

Measured base palette contrast: primary button text 7.97:1, muted text on paper 5.75:1, input boundary against white 3.95:1, focus ring against paper 6.24:1. These measurements and automated checks are scoped evidence, not a full screen-reader certification.

Generated local screenshots are in `test-results/` (ignored by Git). The current production preview is served locally at `http://127.0.0.1:3000/`. This is not a public deployment. Existing MOENV/CWA credentials and Supabase setup requirements remain documented in `README.md`; this UI revision does not enable unconfigured data sources.
