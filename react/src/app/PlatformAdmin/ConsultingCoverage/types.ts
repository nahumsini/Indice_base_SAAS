import type { PlatformConsultingLocation } from "../../api/platformAdmin";

export type CoverageInput = Pick<
  PlatformConsultingLocation,
  | "city_name"
  | "region_name"
  | "country_name"
  | "country_code"
  | "timezone"
  | "currency"
>;
