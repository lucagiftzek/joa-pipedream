import test from "node:test";
import assert from "node:assert/strict";
import nock from "nock";
import {
  instantiate, makeDb, makeDollar, makeApp,
} from "./harness.mjs";
import newJob from "../components/job_opportunities_api/sources/new-job/new-job.mjs";
import jobClosed from "../components/job_opportunities_api/sources/new-closed-job/new-closed-job.mjs";
import jobChanged from "../components/job_opportunities_api/sources/new-job-change/new-job-change.mjs";
import searchJobs from "../components/job_opportunities_api/actions/search-jobs/search-jobs.mjs";
import getJob from "../components/job_opportunities_api/actions/get-job/get-job.mjs";
import findCompany from "../components/job_opportunities_api/actions/find-company/find-company.mjs";
import appDef from "../components/job_opportunities_api/job_opportunities_api.app.mjs";

const API = "https://api.jobopportunitiesapi.org";
const job = (id, posted) => ({
  id,
  title: `Job ${id}`,
  company: "Acme",
  posted_at: posted,
  apply_url: `https://acme.example/jobs/${id}`,
});
const me = {
  plan: "explore",
  limits: {
    max_page_size: 2,
  },
};

test.beforeEach(() => {
  nock.disableNetConnect();
});
test.afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

test("component metadata follows Pipedream conventions", () => {
  const comps = [
    newJob,
    jobClosed,
    jobChanged,
    searchJobs,
    getJob,
    findCompany,
  ];
  for (const c of comps) {
    assert.match(c.key, /^job_opportunities_api-[a-z-]+$/);
    assert.equal(c.version, "0.0.1");
    assert.match(c.description, /\[See the documentation\]\(https:\/\/jobopportunitiesapi\.org\/docs\)/);
    if (c.type === "action") {
      assert.deepEqual(c.annotations, {
        destructiveHint: false,
        openWorldHint: true,
        readOnlyHint: true,
      });
    } else {
      assert.equal(c.type, "source");
      assert.equal(c.dedupe, "unique");
      assert.ok(c.sampleEmit);
    }
  }
  assert.equal(new Set(comps.map((c) => c.key)).size, comps.length);
  assert.equal(appDef.app, "job_opportunities_api");
});

test("Bearer auth header and clamped page size on search-jobs", async () => {
  const scope = nock(API, {
    reqheaders: {
      authorization: "Bearer test_key",
    },
  })
    .get("/v1/me")
    .reply(200, me)
    .get("/v1/jobs")
    .query({
      q: "nurse",
      country: "DE,GB",
      remote: "remote,hybrid",
      employment_type: "Full-time",
      limit: 2,
    })
    .reply(200, {
      data: [
        job("a"),
        job("b"),
      ],
      next_cursor: "c1",
      has_more: true,
    })
    .get("/v1/jobs")
    .query({
      q: "nurse",
      country: "DE,GB",
      remote: "remote,hybrid",
      employment_type: "Full-time",
      limit: 1,
      cursor: "c1",
    })
    .reply(200, {
      data: [
        job("c"),
      ],
      next_cursor: "c2",
      has_more: true,
    });
  const action = instantiate(searchJobs, {
    props: {
      q: "nurse",
      country: [
        "de",
        "gb",
      ],
      remote: [
        "remote",
        "hybrid",
      ],
      employmentType: [
        "Full-time",
      ],
      maxResults: 3,
    },
  });
  const $ = makeDollar();
  const out = await action.run({
    $,
  });
  assert.deepEqual(out.map((j) => j.id), [
    "a",
    "b",
    "c",
  ]);
  assert.equal($.exports.$summary, "Found 3 jobs");
  assert.ok(scope.isDone());
});

test("new-job emits oldest first, stores posted_after cursor, dedupes by id", async () => {
  nock(API).get("/v1/me")
    .reply(200, me);
  nock(API).get("/v1/jobs")
    .query({
      limit: 2,
      category: "Engineering",
    })
    .reply(200, {
      data: [
        job("new", "2026-10-05T10:00:00Z"),
        job("old", "2026-10-05T09:00:00Z"),
      ],
      next_cursor: null,
      has_more: false,
    });
  const db = makeDb();
  const src = instantiate(newJob, {
    db,
    props: {
      category: [
        "Engineering",
      ],
    },
  });
  await src.run();
  assert.deepEqual(src.emitted.map((e) => e.meta.id), [
    "old",
    "new",
  ]);
  assert.equal(src.emitted[1].meta.summary, "New job: Job new at Acme");
  assert.equal(db.store.lastPostedAt, "2026-10-05T10:00:00Z");
  // Second poll passes posted_after and reuses the cached page size (no /v1/me call).
  const scope = nock(API).get("/v1/jobs")
    .query({
      limit: 2,
      category: "Engineering",
      posted_after: "2026-10-05T10:00:00Z",
    })
    .reply(200, {
      data: [],
      next_cursor: null,
      has_more: false,
    });
  await src.run();
  assert.ok(scope.isDone());
});

test("job-closed deploy fails clearly on 403 and run follows next_since", async () => {
  nock(API).get("/v1/jobs/expired")
    .query(true)
    .reply(403, {
      error: "plan_upgrade_required",
      message: "This endpoint needs the Growth plan.",
    });
  const src = instantiate(jobClosed);
  await assert.rejects(src.hooks.deploy(), /does not include this endpoint \(403\).*Growth/);

  const db = makeDb({
    since: "2026-10-01T00:00:00Z",
  });
  const src2 = instantiate(jobClosed, {
    db,
    props: {
      maxClosuresPerRun: 3,
    },
  });
  nock(API).get("/v1/jobs/expired")
    .query({
      since: "2026-10-01T00:00:00Z",
      limit: 3,
    })
    .reply(200, {
      data: [
        {
          id: "x",
          closed_at: "2026-10-01T01:00:00Z",
          closed_reason: "not_seen",
        },
      ],
      next_since: "2026-10-01T01:00:00Z|x",
      count: 1,
    });
  await src2.run();
  assert.equal(src2.emitted.length, 1);
  assert.equal(src2.emitted[0].meta.id, "x-2026-10-01T01:00:00Z");
  assert.equal(db.store.since, "2026-10-01T01:00:00Z|x");
});

test("job-changed filters change types and advances the cursor", async () => {
  const db = makeDb({
    since: "s0",
  });
  const src = instantiate(jobChanged, {
    db,
    props: {
      changeTypes: [
        "withdrawn",
        "delisted",
      ],
    },
  });
  nock(API).get("/v1/changes")
    .query({
      since: "s0",
      limit: 500,
    })
    .reply(200, {
      data: [
        {
          change: "created",
          job: job("a"),
        },
        {
          change: "withdrawn",
          job: job("b"),
        },
      ],
      next_since: "s1",
      count: 2,
    });
  await src.run();
  assert.deepEqual(src.emitted.map((e) => e.event.change), [
    "withdrawn",
  ]);
  assert.equal(db.store.since, "s1");
});

test("get-job, find-company and error mapping", async () => {
  nock(API).get("/v1/jobs/my-slug")
    .query({
      include_closed: "true",
    })
    .reply(200, {
      data: job("z"),
      description: "Text",
    });
  const g = instantiate(getJob, {
    props: {
      jobId: "my-slug",
      includeClosed: true,
    },
  });
  const $ = makeDollar();
  const res = await g.run({
    $,
  });
  assert.equal(res.data.id, "z");
  assert.equal($.exports.$summary, "Retrieved job \"Job z\"");

  nock(API).get("/v1/companies")
    .query({
      q: "google",
      limit: 10,
    })
    .reply(200, {
      data: [
        {
          slug: "google",
          name: "Google",
        },
      ],
      has_more: false,
      next_cursor: null,
    });
  const f = instantiate(findCompany, {
    props: {
      name: "google",
    },
  });
  const companies = await f.run({
    $: makeDollar(),
  });
  assert.equal(companies[0].slug, "google");
  await assert.rejects(instantiate(findCompany).run({
    $: makeDollar(),
  }), /Company Name/);

  nock(API).get("/v1/me")
    .reply(401, {
      error: "invalid_key",
      message: "That key is not valid, or is no longer active.",
    });
  await assert.rejects(makeApp("bad").getMe(), /rejected the API key \(401\).*signup/);
  nock(API).get("/v1/jobs/gone")
    .reply(429, {
      error: "rate_limited",
      message: "Slow down",
    }, {
      "Retry-After": "7",
    });
  await assert.rejects(makeApp("k").getJob({
    jobId: "gone",
  }), /rate limit reached \(429\). Retry after 7 seconds/);
  nock(API).get("/v1/jobs")
    .query(true)
    .reply(402, {
      error: "record_quota_exhausted",
      message: "Allowance used.",
    });
  await assert.rejects(makeApp("k").listJobs(), /record allowance/);
});

test("company prop async options page with cursor", async () => {
  nock(API).get("/v1/companies")
    .query({
      limit: 50,
    })
    .reply(200, {
      data: [
        {
          slug: "acme",
          name: "Acme",
        },
      ],
      next_cursor: "n1",
      has_more: true,
    });
  const app = makeApp("k");
  const out = await app._options_company({});
  assert.deepEqual(out, {
    options: [
      {
        label: "Acme",
        value: "acme",
      },
    ],
    context: {
      cursor: "n1",
    },
  });
});
