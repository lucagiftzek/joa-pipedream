import app from "../../job_opportunities_api.app.mjs";

export default {
  key: "job_opportunities_api-get-job",
  name: "Get Job",
  description: "Get one job posting, with its description, by id or slug. [See the documentation](https://jobopportunitiesapi.org/docs)",
  version: "0.0.1",
  type: "action",
  annotations: {
    destructiveHint: false,
    openWorldHint: true,
    readOnlyHint: true,
  },
  props: {
    app,
    jobId: {
      propDefinition: [
        app,
        "jobId",
      ],
    },
    includeClosed: {
      type: "boolean",
      label: "Include Closed",
      description: "Return the job even if it has closed (it then carries `status` = `closed`) instead of a not-found error.",
      optional: true,
      default: false,
    },
  },
  async run({ $ }) {
    const response = await this.app.getJob({
      $,
      jobId: this.jobId,
      params: this.includeClosed
        ? {
          include_closed: true,
        }
        : undefined,
    });
    $.export("$summary", `Retrieved job "${response?.data?.title || this.jobId}"`);
    return response;
  },
};
