# Job Opportunities API (JOA) — Pipedream components

Pipedream sources and actions for the **Job Opportunities API (JOA)**: employer-direct job postings collected
from employers' own applicant tracking systems and career sites. Every field is tagged as published, inferred
or absent, and closures are tracked, so workflows can react when a role opens, changes or closes.

- Website: https://jobopportunitiesapi.org
- Coverage (live figures): https://jobopportunitiesapi.org/coverage
- API docs: https://jobopportunitiesapi.org/docs
- Free API key (no card required): https://jobopportunitiesapi.org/register

## Components

| Type | Key | What it does |
|---|---|---|
| Source | `job_opportunities_api-new-job` | **New Job** — polls `GET /v1/jobs` (newest first) with filters: keywords, countries, work arrangement, employment type, seniority, category, companies. Dedupe `unique` on job `id`; remembers the newest `posted_at` and passes it as `posted_after`, so each poll only pays for new rows. |
| Source | `job_opportunities_api-new-closed-job` | **New Closed Job** — follows `GET /v1/jobs/expired` with its `next_since` cursor stored in `$.service.db`. Optional job details. *Growth plan or above.* |
| Source | `job_opportunities_api-new-job-change` | **New Job Change** — follows the change feed `GET /v1/changes` (created, updated, withdrawn, delisted) with its cursor; optional change-type filter. Treat `withdrawn` like `delisted`. *Growth plan or above.* |
| Action | `job_opportunities_api-search-jobs` | **Search Jobs** — the same filters plus *Posted After*, *Include Description* and *Max Results*; pages with the keyset cursor. |
| Action | `job_opportunities_api-get-job` | **Get Job** — one job by uuid or slug, with its description; optional *Include Closed*. |
| Action | `job_opportunities_api-find-company` | **Find Company** — search employers by name (and country) or get one by slug. |

Authentication: the app uses a single `api_key` field sent as `Authorization: Bearer <key>`; `GET /v1/me` is the
connection test. Page sizes are clamped to the key's `limits.max_page_size` (read from `/v1/me`, cached for a day in
sources). Every returned row counts against the plan's record allowance, so the defaults are deliberately small.

Errors are translated: 401 (bad key, with the registration link), 402 (record allowance used up), 403 (plan does not
include the endpoint — closed-job and change feeds need Growth+), 404, 410 (listing withdrawn by the employer),
400/422 (the API's own parameter message) and 429 (rate limit, with `Retry-After`).

Apply links: `apply_url` is always the employer's own apply link. When a job carries `attribution` and
`canonical_url`, show the attribution with the listing and link to `canonical_url`.

## Layout

```
components/job_opportunities_api/        # exactly what goes into PipedreamHQ/pipedream components/<app>/
  job_opportunities_api.app.mjs          # app: propDefinitions + Bearer request methods + paginate
  common/constants.mjs, common/utils.mjs # option lists, filter builder, error mapping
  sources/common/polling.mjs             # timer + db + cached page size
  sources/{new-job,new-closed-job,new-job-change}/
  actions/{search-jobs,get-job,find-company}/
  package.json                           # @pipedream/job_opportunities_api
test/                                    # local harness (not part of the registry package)
```

## Local tests

```bash
npm install
npm test                       # mocked (nock): conventions, auth header, paging, cursors, dedupe ids, error mapping
set -a; . ~/.config/joa-integrations/test.env; set +a
npm run test:live              # a handful of real calls (skipped without JOA_API_KEY)
```

The harness (`test/harness.mjs`) binds app methods, stubs `$.service.db`, `$emit` and the action `$`, and runs the
real component code; HTTP goes through `@pipedream/platform`'s axios.

## Publishing

See [PUBLISHING.md](PUBLISHING.md). Nothing has been published.

## Showing listings publicly

If you display the listings publicly, the Job Opportunities API terms ask for a visible credit, "Data: Job Opportunities API", linking to https://jobopportunitiesapi.org.

## Licence

MIT — see [LICENSE](LICENSE). Maintainer: Loukas Tzekos <support@jobopportunitiesapi.org>.
