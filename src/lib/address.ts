export type StructuredAddress = {
  street_address_1?: string | null;
  street_address_2?: string | null;
  city?: string | null;
  state_or_region?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

export type CountryOption = {
  value: string;
  label: string;
};

export type RegionOption = {
  value: string;
  label: string;
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  { value: "United States", label: "United States" },
  { value: "Canada", label: "Canada" },
  { value: "United Kingdom", label: "United Kingdom" },
  { value: "Australia", label: "Australia" },
  { value: "New Zealand", label: "New Zealand" },
  { value: "Other", label: "Other" },
];

export const US_REGION_OPTIONS: RegionOption[] = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

export const CANADA_REGION_OPTIONS: RegionOption[] = [
  { value: "AB", label: "Alberta" },
  { value: "BC", label: "British Columbia" },
  { value: "MB", label: "Manitoba" },
  { value: "NB", label: "New Brunswick" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "NS", label: "Nova Scotia" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "ON", label: "Ontario" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "QC", label: "Quebec" },
  { value: "SK", label: "Saskatchewan" },
  { value: "YT", label: "Yukon" },
];

export function normalizeCountry(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return "United States";
  const upper = trimmed.toUpperCase();
  if (upper === "US" || upper === "USA") return "United States";
  if (upper === "CA") return "Canada";
  if (upper === "UK" || upper === "GB" || upper === "GREAT BRITAIN") {
    return "United Kingdom";
  }
  return trimmed;
}

export function countryValue(country?: string | null) {
  return normalizeCountry(country);
}

export function usesRegionDropdown(country?: string | null) {
  const normalized = normalizeCountry(country);
  return normalized === "United States" || normalized === "Canada";
}

export function regionLabel(country?: string | null) {
  const normalized = normalizeCountry(country);
  if (normalized === "Canada") return "Province";
  if (normalized === "United States") return "State";
  return "State / region";
}

export function postalLabel(country?: string | null) {
  const normalized = normalizeCountry(country);
  return normalized === "United States" ? "ZIP code" : "Postal code";
}

export function getRegionOptions(country?: string | null) {
  const normalized = normalizeCountry(country);
  if (normalized === "Canada") return CANADA_REGION_OPTIONS;
  if (normalized === "United States") return US_REGION_OPTIONS;
  return [];
}

export function formatStructuredAddress(input: StructuredAddress) {
  const meaningfulParts = [
    clean(input.street_address_1),
    clean(input.street_address_2),
    clean(input.city),
    clean(input.state_or_region),
    clean(input.postal_code),
  ].filter(Boolean);

  if (meaningfulParts.length === 0) return null;

  return [...meaningfulParts, normalizeCountry(input.country)].filter(Boolean).join(", ");
}

export function buildAddressQuery(input: StructuredAddress) {
  return formatStructuredAddress(input);
}

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
