import { ConfigurationError } from "@pipedream/platform";
import { SIGNUP_URL } from "./constants.mjs";

/**
 * Turn a string, an array of strings or a comma list into the comma list the API expects.
 * Returns undefined for empty input so the parameter is left out of the query string.
 */
export function toCommaList(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parts = (Array.isArray(value)
    ? value
    : String(value).split(","))
    .map((v) => String(v).trim())
    .filter(Boolean);
  return parts.length
    ? parts.join(",")
    : undefined;
}

/** Drop undefined, null and empty-string values from a query object. */
export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([
      , v,
    ]) => v !== undefined && v !== null && v !== ""),
  );
}

/** Build the /v1/jobs filter query from component props. */
export function jobFilters(props = {}) {
  return cleanParams({
    q: props.q,
    country: toCommaList(props.country)?.toUpperCase(),
    remote: toCommaList(props.remote),
    employment_type: toCommaList(props.employmentType),
    seniority: toCommaList(props.seniority),
    category: toCommaList(props.category),
    company: toCommaList(props.company),
    posted_after: props.postedAfter,
    has_salary: props.hasSalary,
    include_description: props.includeDescription
      ? true
      : undefined,
  });
}

/**
 * Translate an HTTP error from the Job Opportunities API (JOA) into a clear message.
 * Works with errors thrown by @pipedream/platform axios (err.response.status / data).
 */
export function joaErrorMessage(err) {
  const status = err?.response?.status;
  const data = err?.response?.data || {};
  const apiMsg = typeof data === "object" && data
    ? (data.message || data.error)
    : String(data);
  const suffix = apiMsg
    ? ` API said: ${apiMsg}`
    : "";
  switch (status) {
  case 401:
    return `Job Opportunities API (JOA) rejected the API key (401). Check the key in your connected account; a free key (no card required) is available at ${SIGNUP_URL}.${suffix}`;
  case 402:
    return `Your Job Opportunities API (JOA) plan has used up its record allowance for this period (402).${suffix}`;
  case 403:
    return `Your Job Opportunities API (JOA) plan does not include this endpoint (403). Closed-job and change feeds need the Growth plan or above.${suffix}`;
  case 404:
    return `Not found in Job Opportunities API (JOA) (404).${suffix}`;
  case 410:
    return `The employer withdrew this listing (410). Stop showing it.${suffix}`;
  case 400:
  case 422:
    return `Job Opportunities API (JOA) rejected a parameter (${status}).${suffix}`;
  case 429: {
    const retry = err?.response?.headers?.["retry-after"];
    return `Job Opportunities API (JOA) rate limit reached (429).${retry
      ? ` Retry after ${retry} seconds.`
      : ""}${suffix}`;
  }
  default:
    return null;
  }
}

export function toJoaError(err) {
  const msg = joaErrorMessage(err);
  if (!msg) return err;
  const status = err?.response?.status;
  // Configuration problems (bad key, plan, bad parameter) are shown to the user as such.
  if ([
    400,
    401,
    403,
    422,
  ].includes(status)) {
    return new ConfigurationError(msg);
  }
  const e = new Error(msg);
  e.status = status;
  return e;
}
