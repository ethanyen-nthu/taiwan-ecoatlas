# Production launch audit

## Verified public release — 15 November 2026, 20:57 Asia/Taipei

- GitHub: https://github.com/ethanyen-nthu/taiwan-ecoatlas; branch `main`. All release changes were committed and pushed normally. No force push or existing repository overwrite was used.
- Public website: https://taiwan-ecoatlas.vercel.app. Verified without authentication, including actual browser rendering and real provider data.
- Verified implementation: `d92209177fe1b8e2bc66317e9cf65440dc0d3208`, production deployment `dpl_Kjh2kvu5AS2cUAyttsLYoJSvgU2V`. Later documentation-only commits may produce a newer deployment of the same application code.
- Owner/project: Vercel `nthu1/taiwan-ecoatlas` (`prj_tmHV1Sp6fgEEFwdaa6wmWajLXW1f`), GitHub `ethanyen-nthu`. The initially connected tools belonged to a different account; the user explicitly selected this owner and both CLI identities were verified.
- Build settings verified: Next.js, Node **24.x** (also confirmed in production runtime logs), `pnpm install --frozen-lockfile`, `pnpm build`, repository root, default Next.js output. Git connection and `main` production branch were confirmed. Multiple pushes automatically created production deployments from the matching Git SHA.
- Both `MOENV_API_KEY` and `CWA_API_KEY` are Vercel **Production Secrets**. Only their names/types/scopes were inspected; values were entered directly by the user and never read back or printed. `.env.local`, `.vercel/`, Git metadata and generated caches are excluded from publication.

### Actual API verification

| Provider | Public result | Observation/report time | Retrieval time |
| --- | --- | --- | --- |
| MOENV `AQX_P_432` | HTTP 200, **fresh**, 84 valid observations, 0 excluded, 0 duplicates | 2026-11-15 20:00 +08:00 | 2026-11-15 20:57:22 +08:00 |
| CWA `O-A0003-001` + `O-A0001-001` | HTTP 200, **fresh**, 874 valid station observations, 4 records excluded by validation, 361 duplicate reports merged | 2026-11-15 20:40 +08:00 | 2026-11-15 20:57:23 +08:00 |

These counts and times are a verification snapshot, not fixed application values. No environmental measurements were fabricated. Each popup preserves its source and individual report time; a fresh dataset does not imply every station is fresh.

The original live AQI test failed because MOENV returned a plain station array while the adapter expected a `records` wrapper. The adapter now validates either shape, with a regression test. The unchanged real key subsequently returned the 84 valid records and passed the strict popup check. CWA's actual records and map popup also passed. Earlier failures below are retained as audit history and are resolved.

### Final checks

| Check | Result |
| --- | --- |
| TypeScript / ESLint | Passed, zero lint warnings |
| Unit/API tests | **63 passed** |
| Local Chrome/Playwright | **10 passed**, including Watermelon keyboard behavior, WCAG scans, narrow reflow and 200% text |
| Public, unmocked Playwright | **5 passed**: all ten routes in both languages at desktop/tablet/mobile widths; all 22 county selections, implemented layer controls and archive checksum; real AQI popup; real weather popup; private-file HTTP 404s |
| Python geographic validation | Passed: checksum, WGS84, 22 valid bilingual counties and required offshore islands |
| Production build / frozen install / peer compatibility | Passed |
| Secret-pattern / publication exclusion checks | Passed; private values remain server-side and no local environment file is tracked |
| Hosted GitHub Actions | Passed for implementation commit `d922091`, run https://github.com/ethanyen-nthu/taiwan-ecoatlas/actions/runs/43716220806 |
| Public production runtime | READY; actual public homepage, browser flows and both provider endpoints verified |

### Remaining configuration and known limits

No further configuration is required for this release's county/AQI/weather functionality. Provider secrets are configured for Production; Preview access requires separately scoped secrets if desired.

Supabase persistence is optional and not configured or live-tested. Current caching is per running server instance; durable fallback snapshots require the documented database migration and secrets. Historical observation storage/ingestion and the eight planned map layers are not active. Date filters apply to the latest loaded reports. The official geometry retains its full detail (~8.2 MB uncompressed). Search covers counties and loaded station names; original station names are preserved.

The opt-in scheduled snapshot refresh remains disabled. **Milestone 2 has not started.**

## Initial state, before launch changes — 15 November 2026

- Local Git: `main`, no commits, no remotes. No repository contents were overwritten.
- Connected GitHub account: `brendanbaruth-art`. No accessible `taiwan-ecoatlas` repository found at audit start.
- Connected Vercel team: `brendanbaruth-arts-projects`. No `taiwan-ecoatlas` project found at audit start.
- `.env.local`, `.env`, environment-specific local env files and `.vercel/project.json` were absent. The process did not contain MOENV/CWA/Supabase/deployment credentials. No secret values were printed during inspection.
- Actual running `/api/status`: AQI and weather configuration both false. Both observation endpoints returned HTTP 200, `status: not-configured`, zero observations and null observation/retrieval dates. Real measurements were **not** displayed or verified.
- The Milestone 1 release has three implemented map layers: official counties, AQI and weather. Eight future layers are explicitly marked not imported. This release does not start Milestone 2 or claim those layers contain data.
- County GeoJSON: 22 unique valid bilingual geometries; original checksum/CRS metadata and required offshore reference points revalidated.
- Baseline: type checking, zero-warning ESLint, 49 unit/API tests, 10 Chrome browser scenarios and Python geographic validation passed again during this audit.
- Source review covered the application routes/components, registries, map renderer, server HTTP/cache/snapshot adapters, schema/RLS, ingestion scripts, workflows, environment configuration, dependency lockfile and existing tests/docs.

## Release fixes

- Reject non-scalar and non-decimal measurements instead of allowing JavaScript coercion to turn arrays into zero.
- Validate actual Gregorian dates and time/offset fields before UTC normalization; impossible dates are not silently moved into another month.
- Set an explicit 60-second observation function duration for bounded upstream retries.
- Add reproducible Vercel build settings, deployment exclusions, secret scanning and a separate unmocked public-release verification path.
- Keep one primary heading on the homepage; retain the small-screen map heading for assistive technology while preserving the visual layout.
- Pin CI setup actions to verified upstream release commits and run the secret audit in CI.

## Local verification after fixes

- TypeScript and zero-warning ESLint passed; all **60 unit/API tests** passed.
- Production build passed for all ten page routes and the API handlers.
- Python geographic validation passed: checksums, WGS84, 22 valid bilingual counties and required offshore islands.
- All **10 existing Chrome browser tests** passed, including Watermelon keyboard behavior, reduced-motion rendering, mobile navigation/reflow, 200% text size and automated WCAG checks.
- **Three unmocked release presentation/security scenarios passed locally**: all ten routes and language switching at 1440/1024/390px, all 22 county selections and three implemented layer controls, matching boundary archive checksum, and HTTP 404 for private local files. Desktop/tablet/mobile map screenshots were reviewed. These local results are not public-URL verification.
- Frozen offline dependency installation and peer compatibility checks passed.
- Secret-pattern scan passed across 86 repository files and built client assets. No real credentials were present to match against; this is not a claim to have validated unknown secret values.

## Publication and provider gates

- User chose to enter MOENV/CWA secrets directly in Vercel. No values were requested in chat.
- User selected `ethanyen-nthu` after the initial connected tools were found to belong to a different account. GitHub CLI authentication was verified for that selected account.
- Public repository created and `main` pushed: https://github.com/ethanyen-nthu/taiwan-ecoatlas. The initial release commit is `c1313b7`; no force push or existing repository overwrite was used.
- The first hosted CI run passed types, lint, 60 unit/API tests, production build, secret scan and geography. Nine browser tests passed; the 320px/200% text reflow check found a nine-pixel overflow on the Linux runner. That issue is being resolved before launch.
- Vercel CLI authentication verified as `ethanyen-nthu`; intended team is `nthu1` (NTHU), separate from the initially connected account. No public deployment is claimed yet.
- Project created in `nthu1`: `prj_tmHV1Sp6fgEEFwdaa6wmWajLXW1f`. GitHub repository connected; production branch confirmed as `main`. Saved configuration: Next.js, Node 24.x, `pnpm build`, `pnpm install --frozen-lockfile`, default Next.js output and repository root.
- Linux reflow diagnostics identified the header brand's non-wrapping min-content width. The brand text now wraps within the available width while retaining the logo size; the strict overflow check remains enabled.
- Hosted validation for `fbfca70` passed, including all ten Linux/Chromium browser scenarios. Run: https://github.com/ethanyen-nthu/taiwan-ecoatlas/actions/runs/43706973747.
- GitHub automatically created production deployment `dpl_61LkiQBW2hw7rmzGv12LpSakJz36` from `fbfca70`; the source repository, branch and SHA were verified through Vercel. Public domain: https://taiwan-ecoatlas.vercel.app.
- Unauthenticated public homepage request returned HTTP 200 with the expected title. Three unmocked public Playwright scenarios passed: all routes/languages/screen sizes, the official archive/all county selections/layer controls, and private-file exclusions.
- Public `/api/status` confirmed `MOENV_API_KEY` present and CWA absent. The actual AQI endpoint returned HTTP 200 with `unavailable` and zero observations; the strict live-AQI test failed. This release is not considered fully launched until provider requests and real observation popups pass.
- Added server-only failure categories, HTTP statuses and allowlisted transport error codes. Raw request URLs, response bodies, arbitrary error messages and credentials are never included in this diagnostic metadata.
- The unmocked production suite requires real fresh observations. Live-provider and public-URL results remain pending until the GitHub project is published, the Vercel project exists, and its secrets are configured.

Live provider verification and publication results are recorded separately when they are actually observed. Passing fixture tests or a successful local build alone does not establish a working public deployment.
