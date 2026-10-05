// Live calls against the real API. Skipped unless JOA_API_KEY is set.
// Keep this file small: every returned row is metered.
import test from "node:test";
import assert from "node:assert/strict";
import {
  instantiate, makeDb, makeDollar, makeApp,
} from "./harness.mjs";
import newJob from "../components/job_opportunities_api/sources/new-job/new-job.mjs";
import jobClosed from "../components/job_opportunities_api/sources/new-closed-job/new-closed-job.mjs";
import searchJobs from "../components/job_opportunities_api/actions/search-jobs/search-jobs.mjs";
import getJob from "../components/job_opportunities_api/actions/get-job/get-job.mjs";
import findCompany from "../components/job_opportunities_api/actions/find-company/find-company.mjs";

const KEY = process.env.JOA_API_KEY;
const opts = {
  skip: !KEY && "JOA_API_KEY not set",
};

test("live: /v1/me answers with a plan and page-size limit", opts, async () => {
  const me = await makeApp(KEY).getMe();
  assert.ok(me.plan);
  assert.ok(me.limits.max_page_size >= 1);
});

test("live: search-jobs then get-job by slug", opts, async () => {
  const $ = makeDollar();
  const jobs = await instantiate(searchJobs, {
    apiKey: KEY,
    props: {
      country: [
        "DE",
      ],
      maxResults: 3,
    },
  }).run({
    $,
  });
  assert.ok(jobs.length >= 1 && jobs.length <= 3);
  assert.ok(jobs.every((j) => j.country === undefined || j.country === "DE"));
  const res = await instantiate(getJob, {
    apiKey: KEY,
    props: {
      jobId: jobs[0].slug,
    },
  }).run({
    $: makeDollar(),
  });
  assert.equal(res.data.id, jobs[0].id);
});

test("live: new-job deploy emits a small sample", opts, async () => {
  const src = instantiate(newJob, {
    apiKey: KEY,
    db: makeDb(),
    props: {
      remote: [
        "remote",
      ],
    },
  });
  await src.hooks.deploy();
  assert.ok(src.emitted.length >= 1 && src.emitted.length <= 10);
  assert.ok(src.emitted.every((e) => e.event.remote === "remote"));
});

test("live: job-closed reads one page of closures", opts, async () => {
  const db = makeDb({
    since: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  });
  const src = instantiate(jobClosed, {
    apiKey: KEY,
    db,
    props: {
      maxClosuresPerRun: 5,
    },
  });
  await src.run();
  assert.ok(src.emitted.length <= 5);
  assert.ok(db.store.since);
});

test("live: find-company and a bad key", opts, async () => {
  const out = await instantiate(findCompany, {
    apiKey: KEY,
    props: {
      name: "google",
      maxResults: 2,
    },
  }).run({
    $: makeDollar(),
  });
  assert.ok(Array.isArray(out));
  await assert.rejects(makeApp("joa_invalid_key_for_test").getMe(), /401/);
});
