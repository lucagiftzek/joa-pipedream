import app from "../../job_opportunities_api.app.mjs";
import { jobFilters } from "../../common/utils.mjs";

export default {
  key: "job_opportunities_api-search-jobs",
  name: "Search Jobs",
  description: "Search employer-direct job postings, newest first, with filters. [See the documentation](https://jobopportunitiesapi.org/docs)",
  version: "0.0.1",
  type: "action",
  annotations: {
    destructiveHint: false,
    openWorldHint: true,
    readOnlyHint: true,
  },
  props: {
    app,
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
    postedAfter: {
      type: "string",
      label: "Posted After",
      description: "Only jobs posted after this date or RFC3339 timestamp, for example `2026-10-01`.",
      optional: true,
    },
    includeDescription: {
      propDefinition: [
        app,
        "includeDescription",
      ],
    },
    maxResults: {
      type: "integer",
      label: "Max Results",
      description: "Maximum number of jobs to return. Every returned row counts against your plan's record allowance.",
      min: 1,
      max: 1000,
      default: 25,
      optional: true,
    },
  },
  async run({ $ }) {
    const pageSize = await this.app.getMaxPageSize({
      $,
    });
    const jobs = await this.app.paginate({
      $,
      fn: this.app.listJobs,
      params: jobFilters(this),
      max: this.maxResults || 25,
      pageSize,
    });
    $.export("$summary", `Found ${jobs.length} job${jobs.length === 1
      ? ""
      : "s"}`);
    return jobs;
  },
};
