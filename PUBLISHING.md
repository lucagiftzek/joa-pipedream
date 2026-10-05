# Publishing the Pipedream components (to run after Luca approves)

Nothing below has been run. Each path needs a Pipedream account (or Pipedream's team).

## A. Private use (your own Pipedream account) — possible today

Pipedream only knows apps that are in its registry. Until `job_opportunities_api` exists there, private components
cannot declare `app: "job_opportunities_api"`, so private use works through a small adaptation:

1. Install the CLI: https://pipedream.com/docs/cli/install , then `pd login` (opens the browser; needs the account).
2. Option 1 (no app record): copy the component, replace the `app` prop with a plain secret string prop
   (`apiKey: { type: "string", secret: true, label: "API Key" }`) and use `this.apiKey` in `_headers()`.
   Option 2: use Pipedream's generic HTTP / "Custom" app pattern described in its docs.
3. Actions: `pd publish components/job_opportunities_api/actions/search-jobs/search-jobs.mjs`
   (repeat for get-job and find-company; `--dev` auto-versions while iterating).
4. Sources: `pd deploy components/job_opportunities_api/sources/new-job/new-job.mjs` (and the two others;
   the closed-job and change sources need a Growth+ key).
5. Check each deployed source's first emits and each action's `$summary` in the Pipedream UI.

## B. Public listing in the Pipedream registry

1. Pipedream must first create the app record (slug, auth = API key field `api_key`, connection test
   `GET https://api.jobopportunitiesapi.org/v1/me` with `Authorization: Bearer {{custom_fields.api_key}}`).
   This is done by Pipedream's team on request (their app-request process). **Not contacted.**
   If the slug they assign differs from `job_opportunities_api`, rename the folder, the app file, the `app`
   field and every component `key` prefix accordingly.
2. Fork https://github.com/PipedreamHQ/pipedream, copy `components/job_opportunities_api/` into `components/`
   (merge with the folder their team created: keep their `package.json` version scheme).
3. In the fork: `pnpm install`, `npx eslint components/job_opportunities_api` (their ESLint rules enforce prop
   ordering, key/version format, description links), fix any style findings.
4. Open the PR; their reviewers check the component guidelines:
   - [x] keys `<app>-<slug>`, versions `0.0.1`, ES modules (`.mjs`)
   - [x] source names start with "New", descriptions start "Emit new event when…"
   - [x] action/source descriptions end with "[See the documentation](https://jobopportunitiesapi.org/docs)"
   - [x] `annotations` on every action (read-only, non-destructive)
   - [x] `$summary` exported by every action; polling sources use `DEFAULT_POLLING_SOURCE_TIMER_INTERVAL`,
         `$.service.db`, `dedupe: "unique"`, emit a sample on deploy, `sampleEmit` present
   - [x] shared HTTP in the app file, `propDefinitions` reused, pagination handled
   - [ ] run their ESLint config in the fork (not available here without cloning the monorepo)
5. **We were told not to open issues or PRs** — steps 1–4 are for the parent/Luca.
