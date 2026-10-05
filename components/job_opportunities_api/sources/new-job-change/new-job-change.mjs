import common from "../common/polling.mjs";
import { CHANGE_TYPE_OPTIONS } from "../../common/constants.mjs";

const PAGE_LIMIT = 500;

export default {
  ...common,
  key: "job_opportunities_api-new-job-change",
  name: "New Job Change",
  description: "Emit new event when a job is created, updated, withdrawn or delisted (the change feed). Requires the Growth plan or above. [See the documentation](https://jobopportunitiesapi.org/docs)",
  version: "0.0.1",
  type: "source",
  dedupe: "unique",
  props: {
    ...common.props,
    changeTypes: {
      type: "string[]",
      label: "Change Types",
      description: "Only emit these change types. Treat `withdrawn` exactly like `delisted`: stop showing the job. Leave empty for all.",
      options: CHANGE_TYPE_OPTIONS,
      optional: true,
    },
    maxChangesPerRun: {
      type: "integer",
      label: "Max Changes Per Run",
      description: "Upper bound on changes read in one poll. Every returned row counts against your plan's record allowance; any remainder is picked up on the next poll.",
      min: 1,
      max: 5000,
      default: 500,
      optional: true,
    },
  },
  hooks: {
    async deploy() {
      const since = new Date().toISOString();
      await this.app.listChanges({
        params: {
          since,
          limit: 1,
        },
      });
      this._set("since", since);
    },
  },
  methods: {
    ...common.methods,
    generateMeta(item) {
      const job = item.job || {};
      const ts = Date.parse(job.last_verified_at || job.closed_at || job.first_seen_at) || Date.now();
      return {
        id: `${job.id}-${item.change}-${ts}`,
        summary: `Job ${item.change}: ${job.title || job.id}`,
        ts,
      };
    },
  },
  async run() {
    let since = this._get("since") || new Date().toISOString();
    const max = this.maxChangesPerRun || 500;
    const wanted = this.changeTypes?.length
      ? new Set(this.changeTypes)
      : null;
    let read = 0;
    while (read < max) {
      const limit = Math.min(PAGE_LIMIT, max - read);
      const page = await this.app.listChanges({
        params: {
          since,
          limit,
        },
      });
      const rows = page?.data || [];
      for (const item of rows) {
        if (!wanted || wanted.has(item.change)) {
          this.$emit(item, this.generateMeta(item));
        }
      }
      read += rows.length;
      if (page?.next_since) since = page.next_since;
      this._set("since", since);
      if (rows.length < limit) break;
    }
  },
  sampleEmit: {
    change: "updated",
    job: {
      id: "0180d9bd-3a01-4d0a-8df1-3f298e31861c",
      slug: "store-associate-0180d9bd",
      title: "Store Associate",
      company: "Example Retail",
      company_slug: "example-retail",
      location: "Austin, TX",
      remote: "on_site",
      status: "live",
      posted_at: "2026-09-30T09:00:00Z",
      last_verified_at: "2026-10-01T00:00:02Z",
      apply_url: "https://careers.example-retail.example/jobs/123",
    },
  },
};
