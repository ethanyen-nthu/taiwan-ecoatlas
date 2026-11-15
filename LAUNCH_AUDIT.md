# Production launch audit

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
- The unmocked production suite requires real fresh observations. Live-provider and public-URL results remain pending until the GitHub project is published, the Vercel project exists, and its secrets are configured.

Live provider verification and publication results are recorded separately when they are actually observed. Passing fixture tests or a successful local build alone does not establish a working public deployment.
