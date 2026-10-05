export const BASE_URL = "https://api.jobopportunitiesapi.org";
export const DOCS_URL = "https://jobopportunitiesapi.org/docs";
export const SIGNUP_URL = "https://jobopportunitiesapi.org/signup";
export const DEFAULT_MAX_PAGE_SIZE = 200;

export const REMOTE_OPTIONS = [
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "On site", value: "on_site" },
  { label: "Not stated", value: "not_stated" },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
  "Temporary",
  "Internship",
  { label: "Not stated", value: "not_stated" },
];

export const SENIORITY_OPTIONS = [
  "Intern",
  "Entry",
  "Mid",
  "Senior",
  "Lead",
  "Manager",
  "Director",
  "Executive",
  { label: "Not stated", value: "not_stated" },
];

export const CATEGORY_OPTIONS = [
  "Consulting & Strategy",
  "Construction & Trades",
  "Customer Support",
  "Data & Analytics",
  "Design",
  "Education",
  "Engineering",
  "Finance",
  "Healthcare",
  "Hospitality",
  "HR & Recruiting",
  "Legal & Compliance",
  "Logistics & Transport",
  "Manufacturing",
  "Marketing",
  "Operations & Admin",
  "Procurement",
  "Product",
  "Retail",
  "Safety & Environment",
  "Sales",
  "Science & Research",
  "Security",
  "Skilled Technician",
  { label: "Uncategorised", value: "uncategorised" },
];

export const CHANGE_TYPE_OPTIONS = [
  "created",
  "updated",
  "withdrawn",
  "delisted",
];
