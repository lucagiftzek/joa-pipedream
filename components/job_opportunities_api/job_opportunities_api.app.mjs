import { axios } from "@pipedream/platform";
import {
  BASE_URL,
  DEFAULT_MAX_PAGE_SIZE,
  REMOTE_OPTIONS,
  EMPLOYMENT_TYPE_OPTIONS,
  SENIORITY_OPTIONS,
  CATEGORY_OPTIONS,
} from "./common/constants.mjs";
import {
  cleanParams, toJoaError,
} from "./common/utils.mjs";

export default {
  type: "app",
  app: "job_opportunities_api",
  propDefinitions: {
    q: {
      type: "string",
      label: "Keywords",
      description: "Full-text search over job title, company name and location (not the description). Example: `data engineer`.",
      optional: true,
    },
    country: {
      type: "string[]",
      label: "Countries",
      description: "ISO-3166 alpha-2 country codes, for example `DE`, `GB`, `US`.",
      optional: true,
    },
    remote: {
      type: "string[]",
      label: "Work Arrangement",
      description: "Only roles with this remote status.",
      options: REMOTE_OPTIONS,
      optional: true,
    },
    employmentType: {
      type: "string[]",
      label: "Employment Type",
      description: "Only roles with this employment type.",
      options: EMPLOYMENT_TYPE_OPTIONS,
      optional: true,
    },
    seniority: {
      type: "string[]",
      label: "Seniority",
      description: "Only roles at this seniority level.",
      options: SENIORITY_OPTIONS,
      optional: true,
    },
    category: {
      type: "string[]",
      label: "Category",
      description: "Only roles in this job family.",
      options: CATEGORY_OPTIONS,
      optional: true,
    },
    company: {
      type: "string[]",
      label: "Companies",
      description: "Company slugs, for example `google`. Select from the list or enter slugs.",
      optional: true,
      async options({ prevContext }) {
        const { data = [], next_cursor: nextCursor } = await this.listCompanies({
          params: cleanParams({
            limit: 50,
            cursor: prevContext?.cursor,
          }),
        });
        return {
          options: data.map((c) => ({
            label: c.name || c.slug,
            value: c.slug,
          })),
          context: {
            cursor: nextCursor,
          },
        };
      },
    },
    includeDescription: {
      type: "boolean",
      label: "Include Description",
      description: "Return the advert text (plain text) in the `description` field.",
      optional: true,
      default: false,
    },
    jobId: {
      type: "string",
      label: "Job ID or Slug",
      description: "The job `id` (uuid) or its public `slug`.",
    },
  },
  methods: {
    _baseUrl() {
      return BASE_URL;
    },
    _headers() {
      return {
        "Authorization": `Bearer ${this.$auth.api_key}`,
        "Accept": "application/json",
      };
    },
    async _makeRequest({
      $ = this, path, ...opts
    }) {
      try {
        return await axios($, {
          url: `${this._baseUrl()}${path}`,
          headers: this._headers(),
          ...opts,
        });
      } catch (err) {
        throw toJoaError(err);
      }
    },
    getMe(opts = {}) {
      return this._makeRequest({
        path: "/v1/me",
        ...opts,
      });
    },
    async getMaxPageSize(opts = {}) {
      try {
        const me = await this.getMe(opts);
        return me?.limits?.max_page_size || DEFAULT_MAX_PAGE_SIZE;
      } catch (err) {
        if (err?.status === 429) return DEFAULT_MAX_PAGE_SIZE;
        throw err;
      }
    },
    listJobs(opts = {}) {
      return this._makeRequest({
        path: "/v1/jobs",
        ...opts,
      });
    },
    getJob({
      jobId, ...opts
    }) {
      return this._makeRequest({
        path: `/v1/jobs/${encodeURIComponent(jobId)}`,
        ...opts,
      });
    },
    listExpiredJobs(opts = {}) {
      return this._makeRequest({
        path: "/v1/jobs/expired",
        ...opts,
      });
    },
    listChanges(opts = {}) {
      return this._makeRequest({
        path: "/v1/changes",
        ...opts,
      });
    },
    listCompanies(opts = {}) {
      return this._makeRequest({
        path: "/v1/companies",
        ...opts,
      });
    },
    getCompany({
      slug, ...opts
    }) {
      return this._makeRequest({
        path: `/v1/companies/${encodeURIComponent(slug)}`,
        ...opts,
      });
    },
    /**
     * Page through a cursor-paginated list endpoint (/v1/jobs, /v1/companies)
     * until `max` rows are collected or the API reports no more rows.
     */
    async paginate({
      fn, params = {}, max = 25, pageSize = DEFAULT_MAX_PAGE_SIZE, ...opts
    }) {
      const rows = [];
      let cursor;
      do {
        const limit = Math.max(1, Math.min(pageSize, max - rows.length));
        const page = await fn.call(this, {
          ...opts,
          params: cleanParams({
            ...params,
            limit,
            cursor,
          }),
        });
        rows.push(...(page?.data || []));
        cursor = page?.has_more
          ? page?.next_cursor
          : null;
      } while (cursor && rows.length < max);
      return rows.slice(0, max);
    },
  },
};
