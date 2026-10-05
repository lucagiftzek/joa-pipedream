import common from "../common/polling.mjs";
import app from "../../job_opportunities_api.app.mjs";
import { jobFilters } from "../../common/utils.mjs";

export default {
  ...common,
  key: "job_opportunities_api-new-job",
  name: "New Job",
  description: "Emit new event when a new employer-direct job matching your filters is published. [See the documentation](https://jobopportunitiesapi.org/docs)",
  version: "0.0.1",
  type: "source",
  dedupe: "unique",
  props: {
    ...common.props,
    q: {
      propDefinition: [
        app,
        "q",
      ],
    },
    country: {
      propDefinition: [
        app,
        "country",
      ],
    },
    remote: {
      propDefinition: [
        app,
        "remote",
      ],
    },
    employmentType: {
      propDefinition: [
        app,
        "employmentType",
      ],
    },
    seniority: {
      propDefinition: [
        app,
        "seniority",
      ],
    },
    category: {
      propDefinition: [
        app,
        "category",
      ],
    },
    company: {
      propDefinition: [
        app,
        "company",
      ],
    },
    includeDescription: {
      propDefinition: [
        app,
        "includeDescription",
      ],
    },
    maxJobsPerRun: {
      type: "integer",
      label: "Max Jobs Per Run",
      description: "Upper bound on jobs fetched in one poll. Every returned row counts against your plan's record allowance.",
      min: 1,
      max: 1000,
      default: 100,
      optional: true,
    },
  },
  hooks: {
    async deploy() {
      // Emit a small sample of recent matches so the workflow can be built straight away.
      await this.processEvents(10);
    },
  },
  methods: {
    ...common.methods,
    generateMeta(job) {
      const company = job.company
        ? ` at ${job.company}`
        : "";
      return {
        id: job.id,
        summary: `New job: ${job.title}${company}`,
        ts: Date.parse(job.posted_at || job.first_seen_at) || Date.now(),
      };
    },
    async processEvents(max) {
      const lastPostedAt = this._get("lastPostedAt");
      const pageSize = await this._pageSize();
      const params = jobFilters(this);
      if (lastPostedAt) params.posted_after = lastPostedAt;
      const jobs = await this.app.paginate({
        fn: this.app.listJobs,
        params,
        max,
        pageSize,
      });
      if (!jobs.length) return;
      // The API returns newest first; emit oldest first.
      for (const job of [
        ...jobs,
      ].reverse()) {
        this.$emit(job, this.generateMeta(job));
      }
      const newest = jobs
        .map((j) => j.posted_at)
        .filter(Boolean)
        .sort()
        .pop();
      if (newest) this._set("lastPostedAt", newest);
    },
  },
  async run() {
    await this.processEvents(this.maxJobsPerRun || 100);
  },
  sampleEmit: {
    id: "defb93bc-0de5-432d-8323-185757ba256f",
    slug: "warehouse-associate-defb93bc",
    title: "Warehouse Associate",
    company: "Example Logistics",
    company_slug: "example-logistics",
    country: "DE",
    city: "Hamburg",
    location: "Hamburg, Germany",
    remote: "on_site",
    remote_inferred: true,
    employment_type: "Full-time",
    seniority: "Entry",
    category: "Logistics & Transport",
    posted_at: "2026-10-05T17:16:38Z",
    first_seen_at: "2026-10-05T15:29:41Z",
    last_verified_at: "2026-10-05T18:18:53Z",
    status: "live",
    apply_url: "https://example-logistics.jobs.example/job/2828434",
    source: "personio",
    source_type: "ats",
    has_description: true,
    field_sources: {
      remote: "inferred",
      location: "published",
      posted_at: "published",
      salary: "absent",
    },
  },
};
