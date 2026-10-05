import { ConfigurationError } from "@pipedream/platform";
import app from "../../job_opportunities_api.app.mjs";
import { cleanParams } from "../../common/utils.mjs";

export default {
  key: "job_opportunities_api-find-company",
  name: "Find Company",
  description: "Find employers by name, or get one employer by slug. [See the documentation](https://jobopportunitiesapi.org/docs)",
  version: "0.0.1",
  type: "action",
  annotations: {
    destructiveHint: false,
    openWorldHint: true,
    readOnlyHint: true,
  },
  props: {
    app,
    name: {
      type: "string",
      label: "Company Name",
      description: "Search employers by name, for example `google`. Leave empty when you give a slug.",
      optional: true,
    },
    slug: {
      type: "string",
      label: "Company Slug",
      description: "Get exactly one employer by its slug. Takes precedence over Company Name.",
      optional: true,
    },
    country: {
      type: "string",
      label: "Country",
      description: "ISO-3166 alpha-2 country code, for example `US`.",
      optional: true,
    },
    maxResults: {
      type: "integer",
      label: "Max Results",
      description: "Maximum number of companies to return when searching by name.",
      min: 1,
      max: 200,
      default: 10,
      optional: true,
    },
  },
  async run({ $ }) {
    if (this.slug) {
      const company = await this.app.getCompany({
        $,
        slug: this.slug.trim(),
      });
      $.export("$summary", `Retrieved company "${company?.name || this.slug}"`);
      return company;
    }
    if (!this.name) {
      throw new ConfigurationError("Enter a Company Name to search for, or a Company Slug.");
    }
    const companies = await this.app.paginate({
      $,
      fn: this.app.listCompanies,
      params: cleanParams({
        q: this.name,
        country: this.country?.toUpperCase(),
      }),
      max: this.maxResults || 10,
    });
    $.export("$summary", `Found ${companies.length} compan${companies.length === 1
      ? "y"
      : "ies"}`);
    return companies;
  },
};
