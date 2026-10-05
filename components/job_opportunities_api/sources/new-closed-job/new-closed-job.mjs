import common from "../common/polling.mjs";

const PAGE_LIMIT = 1000;

export default {
  ...common,
  key: "job_opportunities_api-new-closed-job",
  name: "New Closed Job",
  description: "Emit new event when a job is closed or expires at its source. Requires the Growth plan or above. [See the documentation](https://jobopportunitiesapi.org/docs)",
  version: "0.0.1",
  type: "source",
  dedupe: "unique",
  props: {
    ...common.props,
    includeJobDetails: {
      type: "boolean",
      label: "Include Job Details",
      description: "Also fetch each closed job (title, company, apply link). Adds one metered request per closure, so it is capped at 25 closures per run.",
      optional: true,
      default: false,
    },
    maxClosuresPerRun: {
      type: "integer",
      label: "Max Closures Per Run",
      description: "Upper bound on closures read in one poll. Any remainder is picked up on the next poll.",
      min: 1,
      max: 10000,
      default: 1000,
      optional: true,
    },
  },
  hooks: {
    async deploy() {
      const since = new Date().toISOString();
      // Fail early with a clear plan message (403) instead of on the first poll.
      await this.app.listExpiredJobs({
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
      return {
        id: `${item.id}-${item.closed_at}`,
        summary: `Job closed: ${item.job?.title || item.id} (${item.closed_reason || "closed"})`,
        ts: Date.parse(item.closed_at) || Date.now(),
      };
    },
  },
  async run() {
    let since = this._get("since") || new Date().toISOString();
    const max = this.maxClosuresPerRun || 1000;
    const maxDetails = this.includeJobDetails
      ? Math.min(25, max)
      : max;
    const cap = this.includeJobDetails
      ? maxDetails
      : max;
    let read = 0;
    while (read < cap) {
      const limit = Math.min(PAGE_LIMIT, cap - read);
      const page = await this.app.listExpiredJobs({
        params: {
          since,
          limit,
        },
      });
      const rows = page?.data || [];
      for (const item of rows) {
        if (this.includeJobDetails) {
          try {
            const res = await this.app.getJob({
              jobId: item.id,
              params: {
                include_closed: true,
              },
            });
            item.job = res?.data;
          } catch (err) {
            item.job = null;
          }
        }
        this.$emit(item, this.generateMeta(item));
      }
      read += rows.length;
      if (page?.next_since) since = page.next_since;
      this._set("since", since);
      if (rows.length < limit) break;
    }
  },
  sampleEmit: {
    id: "be3c3b3d-5a4e-4157-ba7d-62f20f1b1b01",
    closed_at: "2026-10-01T00:08:17.191881Z",
    closed_reason: "expired_upstream",
  },
};
