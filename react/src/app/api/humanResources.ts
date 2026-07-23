import { apiClient } from "../lib/apiClient";
import { endpoints } from "./endpoints";
import { dispatchNotificationsRefresh } from "./notificationEvents";

function normalizeStorageUrl(storageUrl: string) {
  if (typeof window === "undefined") {
    return storageUrl;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const parsedUrl = new URL(storageUrl);
    const localStorageHosts = new Set(["localhost", "127.0.0.1", "minio"]);
    const isLocalOrMinioHost =
      localStorageHosts.has(parsedUrl.hostname) || parsedUrl.port === "9000";
    const isStoragePath = parsedUrl.pathname.startsWith("/storage/");

    if (parsedUrl.origin === currentUrl.origin) {
      return storageUrl;
    }

    if (
      parsedUrl.hostname === currentUrl.hostname &&
      parsedUrl.protocol !== currentUrl.protocol
    ) {
      parsedUrl.protocol = currentUrl.protocol;
      parsedUrl.host = currentUrl.host;
      return parsedUrl.toString();
    }

    if (isStoragePath && isLocalOrMinioHost) {
      parsedUrl.protocol = currentUrl.protocol;
      parsedUrl.host = currentUrl.host;
      return parsedUrl.toString();
    }

    if (isLocalOrMinioHost && !isStoragePath) {
      parsedUrl.protocol = currentUrl.protocol;
      parsedUrl.host = currentUrl.host;
      parsedUrl.pathname = `/storage${parsedUrl.pathname}`;
      return parsedUrl.toString();
    }

    return storageUrl;
  } catch {
    return storageUrl;
  }
}

const kioskIdempotencyKey = () => {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === "function") {
    return webCrypto.randomUUID();
  }
  if (typeof webCrypto?.getRandomValues === "function") {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("Secure randomness is required for kiosk idempotency keys.");
};

export type PayrollTreatment = 'fiscal_payroll' | 'operational_payroll' | 'accounts_payable' | 'no_payroll';
export type PayrollPaymentRoute = 'payroll' | 'expenses' | 'none';

export interface BackendHrUser {
  id: number;
  legacy_user_company_id?: number;
  user_id?: number | null;
  user_company_id?: number | null;
  work_profile_id?: number | null;
  user_code?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  position?: string;
  position_title?: string;
  department?: string;
  unit_id?: number | null;
  unit_name?: string;
  business_id?: number | null;
  business_name?: string;
  hire_date?: string | null;
  salary?: number | null;
  pay_period: "weekly" | "biweekly" | "semimonthly" | "monthly";
  salary_type: "daily" | "hourly";
  hourly_rate?: number | null;
  workday_hours?: number | null;
  workdays_per_week?: number | null;
  payroll_treatment?: PayrollTreatment | string | null;
  registration_country?: string;
  contract_type: "permanent" | "temporary";
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  termination_date?: string | null;
  last_working_day?: string | null;
  termination_reason_type?: string;
  termination_reason_code?: string;
  termination_summary?: string;
  status: "active" | "inactive" | "terminated";
}

export interface BackendHrUserProfile {
  date_of_birth?: string | null;
  address?: string;
  national_id?: string;
  tax_id?: string;
  social_security_number?: string;
  registration_country?: string;
  state_province?: string;
  city?: string;
  postal_code?: string;
  alternate_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  workday_hours?: number | null;
  workdays_per_week?: number | null;
  payroll_treatment?: PayrollTreatment | string | null;
}

export interface BackendHrUserDocument {
  id: number;
  document_type:
    | "birth_certificate"
    | "government_id"
    | "proof_of_address"
    | "resume"
    | "profile_photo";
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  object_key: string;
  status: string;
  download_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface HrUserDetailsResponse {
  user_company_id: number;
  user_id?: number | null;
  work_profile_id?: number | null;
  user: BackendHrUser;
  profile: BackendHrUserProfile;
  documents: BackendHrUserDocument[];
}

export interface HrUserDocumentPresignPayload {
  document_type: BackendHrUserDocument["document_type"];
  file_name: string;
  content_type: string;
  size_bytes: number;
}

export interface HrUserDocumentPresignResponse {
  document_type: BackendHrUserDocument["document_type"];
  object_key: string;
  upload_url: string;
  expires_at: string;
  upload_headers: Record<string, string>;
}

export interface RegisterHrUserDocumentPayload {
  document_type: BackendHrUserDocument["document_type"];
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  object_key: string;
}

export interface BackendRecordWitness {
  id: number;
  user_company_id?: number | null;
  name: string;
  created_at?: string | null;
}

export interface BackendRecordAttachment {
  id: number;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  object_key: string;
  download_url?: string | null;
  created_at?: string | null;
}

export interface BackendRecordActivity {
  id: number;
  activity_type:
    | "created"
    | "updated"
    | "status_changed"
    | "attachment_added"
    | "attachment_removed"
    | "deleted";
  from_status?: "pending" | "reviewed" | "resolved" | null;
  to_status?: "pending" | "reviewed" | "resolved" | null;
  note?: string;
  actor_user_id: number;
  actor_name: string;
  created_at?: string | null;
}

export interface BackendRecordItem {
  id: number;
  record_number?: string;
  user: {
    id: number;
    name: string;
    position?: string;
    department?: string;
  };
  unit?: {
    id?: number | null;
    name?: string;
  } | null;
  business?: {
    id?: number | null;
    name?: string;
  } | null;
  type: "incident" | "warning" | "recognition" | "observation" | "training";
  severity?: "low" | "medium" | "high" | null;
  status: "pending" | "reviewed" | "resolved";
  title: string;
  description: string;
  actions_taken?: string;
  event_date: string;
  reported_by: {
    user_id?: number | null;
    user_company_id?: number | null;
    name: string;
  };
  created_at?: string | null;
  updated_at?: string | null;
  witnesses?: BackendRecordWitness[];
  attachments?: BackendRecordAttachment[];
  activity?: BackendRecordActivity[];
}

export interface RecordsListResponse {
  items: BackendRecordItem[];
  count: number;
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
  summary: {
    total_count: number;
    pending_count: number;
    reviewed_count: number;
    resolved_count: number;
    high_severity_count: number;
  };
}

export interface RecordDetailsResponse {
  record_id: number;
  record: BackendRecordItem;
}

export interface CreateRecordPayload {
  user_company_id: number;
  record_type: BackendRecordItem["type"];
  severity?: NonNullable<BackendRecordItem["severity"]>;
  title: string;
  description: string;
  actions_taken?: string;
  event_date: string;
  witnesses?: Array<string | { user_company_id?: number | null; name: string }>;
}

export interface RecordAttachmentPresignPayload {
  file_name: string;
  content_type: string;
  size_bytes: number;
}

export interface RecordAttachmentPresignResponse {
  object_key: string;
  upload_url: string;
  expires_at: string;
  upload_headers: Record<string, string>;
}

export interface RegisterRecordAttachmentPayload {
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  object_key: string;
}

export interface HrUsersListResponse {
  items: BackendHrUser[];
  count: number;
  summary: {
    total_count: number;
    active_count: number;
    inactive_count: number;
    terminated_count: number;
    total_payroll_amount_monthly: number;
  };
}

export interface TerminationPayload {
  exit_date: string;
  last_working_day?: string;
  reason_type:
    | "resignation"
    | "termination_for_cause"
    | "contract_end"
    | "mutual_agreement"
    | "other";
  specific_reason?: string;
  summary: string;
}

export interface AttendanceLocation {
  id: number;
  name: string;
  unit_id?: number | null;
  unit_name?: string | null;
  business_id?: number | null;
  business_name?: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export type AttendanceStatus =
  | "on_time"
  | "late"
  | "leave"
  | "rest"
  | "absence"
  | "pending"
  | "not_scheduled";
export type AttendanceCorrectionStatus = Exclude<
  AttendanceStatus,
  "pending" | "not_scheduled"
>;

export interface AttendanceDashboardItem {
  subject_type?: "user";
  user_id?: number;
  user_company_id: number;
  user_code?: string;
  user_name: string;
  avatar_url?: string | null;
  position_title?: string;
  department?: string;
  unit_id?: number | null;
  unit_name?: string;
  business_id?: number | null;
  business_name?: string;
  hire_date?: string | null;
  attendance_editable?: boolean;
  edit_lock_reason?: string | null;
  status: AttendanceStatus;
  system_status: AttendanceStatus;
  corrected_status?: AttendanceCorrectionStatus | null;
  first_check_in_at?: string | null;
  last_check_out_at?: string | null;
  minutes_late: number;
  first_location?: AttendanceLocation | null;
  last_location?: AttendanceLocation | null;
  schedule_rule?: AttendanceControlRule | null;
  active_work_site?: AttendanceHrUserWorkSiteAssignment | null;
  first_photo_url?: string | null;
  last_photo_url?: string | null;
}

export interface AttendanceHrUserOption {
  subject_type?: "user";
  user_id?: number;
  user_company_id?: number;
  id: number;
  user_code?: string;
  full_name: string;
  avatar_url?: string | null;
  position_title?: string;
  department?: string;
  unit_id?: number | null;
  unit_name?: string;
  hire_date?: string | null;
  status: "active" | "inactive" | "terminated";
}

export interface AttendanceDashboardResponse {
  date: string;
  summary: {
    total_users: number;
    on_time_count: number;
    late_count: number;
    leave_count: number;
    rest_count: number;
    absence_count: number;
    locations_count: number;
    kiosk_enabled: boolean;
  };
  items: AttendanceDashboardItem[];
  users: AttendanceHrUserOption[];
  locations: AttendanceLocation[];
}

export interface AttendanceCalendarDay {
  date: string;
  day: number;
  attendance_editable?: boolean;
  edit_lock_reason?: string | null;
  effective_status: AttendanceStatus;
  system_status: AttendanceStatus;
  corrected_status?: AttendanceCorrectionStatus | null;
  entry_registered: boolean;
  exit_registered: boolean;
  first_check_in_at?: string | null;
  last_check_out_at?: string | null;
  minutes_late: number;
  first_location?: AttendanceLocation | null;
  last_location?: AttendanceLocation | null;
  schedule_rule?: AttendanceControlRule | null;
  active_work_site?: AttendanceHrUserWorkSiteAssignment | null;
  first_photo_url?: string | null;
  last_photo_url?: string | null;
  notes?: string | null;
}

export interface AttendanceCalendarResponse {
  user: {
    id: number;
    full_name: string;
    avatar_url?: string | null;
    position_title?: string;
    department?: string;
    hire_date?: string | null;
  };
  month: string;
  items: AttendanceCalendarDay[];
}

export interface AttendanceControlRule {
  template_id: number;
  schedule_mode?: "strict" | "open";
  block_after_grace_period?: boolean;
  enforce_location?: boolean;
  location_id?: number | null;
  location_name?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  meal_minutes?: number;
  rest_minutes?: number;
  late_after_minutes: number;
  is_rest_day: boolean;
  is_overnight?: boolean;
}

export interface AttendanceControlLocation {
  id: number;
  unit_id?: number | null;
  unit_name?: string | null;
  business_id?: number | null;
  business_name?: string | null;
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  required_hours_per_day?: number | null;
  required_start_time?: string | null;
  required_end_time?: string | null;
  required_days_per_week?: number | null;
  managed_source?: string | null;
  status?: string;
  assigned_user_count?: number;
  assigned_user_names?: string | null;
}

export interface AttendanceControlTemplateDay {
  day_of_week: number;
  start_time?: string | null;
  end_time?: string | null;
  meal_minutes: number;
  rest_minutes: number;
  late_after_minutes: number;
  is_rest_day: boolean;
}

export interface AttendanceControlTemplate {
  id: number;
  name: string;
  status: string;
  schedule_mode?: "strict" | "open";
  block_after_grace_period?: boolean;
  enforce_location?: boolean;
  location_id?: number | null;
  location_name?: string | null;
  users_assigned_count: number;
  days: AttendanceControlTemplateDay[];
}

export interface AttendanceHrUserWorkSiteAssignment {
  id: number;
  user_company_id: number;
  location_id: number;
  location_name: string;
  location: AttendanceControlLocation;
  template_id?: number | null;
  template_name?: string | null;
  effective_start_date: string;
  effective_end_date?: string | null;
  status: "active" | "inactive";
}

export interface AttendanceKioskDevice {
  id: number;
  company_id: number;
  unit_id?: number | null;
  unit_name?: string;
  business_id?: number | null;
  business_name?: string;
  location_id?: number | null;
  location_name?: string;
  code: string;
  name: string;
  status: "active" | "inactive";
  public_access_token?: string;
  metadata?: Record<string, unknown>;
  kiosk_definition_id?: number;
  engine_status?: "ACTIVE" | "DISABLED" | "REVOKED" | "EXPIRED" | "DELETED";
  configuration_version?: number;
  public_token_hint?: string;
}

export interface AttendanceAccessMethod {
  id: number;
  company_id: number;
  access_profile_id: number;
  user_company_id: number;
  user_code?: string;
  user_name: string;
  method_type:
    "pin" | "badge" | "password" | "manual_override" | "facial_recognition";
  credential_ref?: string | null;
  pin_code?: string | null;
  status: "active" | "inactive";
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface AttendanceAccessProfile {
  id: number;
  company_id: number;
  user_company_id: number;
  user_code?: string;
  user_name: string;
  status: "active" | "inactive";
  default_method: AttendanceAccessMethod["method_type"];
  last_enrolled_at?: string | null;
  metadata?: Record<string, unknown>;
  face_enrollment?: {
    id: number;
    status:
      "pending" | "active" | "failed" | "deleted" | "replaced" | "superseded";
    enrolled_at?: string | null;
    required_steps?: string[];
  } | null;
  methods: AttendanceAccessMethod[];
}

export interface AttendanceControlAssignment {
  user_company_id: number;
  user_code?: string;
  user_name: string;
  position_title?: string;
  department?: string;
  user_status: string;
  unit_id?: number | null;
  unit_name?: string;
  business_id?: number | null;
  business_name?: string;
  hire_date?: string | null;
  attendance_editable?: boolean;
  edit_lock_reason?: string | null;
  schedule_template_id?: number | null;
  schedule_template_name?: string | null;
  effective_start_date?: string | null;
  effective_end_date?: string | null;
  today_rule?: AttendanceControlRule | null;
  today_status: AttendanceStatus;
  system_status: AttendanceStatus;
  corrected_status?: AttendanceCorrectionStatus | null;
  first_check_in_at?: string | null;
  last_check_out_at?: string | null;
  first_location?: AttendanceControlLocation | null;
  last_location?: AttendanceControlLocation | null;
  first_photo_url?: string | null;
  last_photo_url?: string | null;
  first_photo_expired?: boolean;
  last_photo_expired?: boolean;
  first_photo_retained_until?: string | null;
  last_photo_retained_until?: string | null;
  first_latitude?: number | null;
  first_longitude?: number | null;
  last_latitude?: number | null;
  last_longitude?: number | null;
  minutes_late: number;
  allowed_locations?: AttendanceControlLocation[];
  business_locations?: AttendanceControlLocation[];
  active_work_site?: AttendanceHrUserWorkSiteAssignment | null;
  access_profile?: AttendanceAccessProfile | null;
  latest_event?: AttendanceControlRecentEvent | null;
  can_assign_schedule?: boolean;
  schedule_busy_reason?: string | null;
}

export interface AttendanceControlRecentEvent {
  id: number;
  user_company_id: number;
  user_code?: string;
  user_name: string;
  kiosk_device_id?: number | null;
  kiosk_device_name?: string;
  location_id?: number | null;
  location_name?: string;
  event_type: string;
  event_kind: string;
  auth_method: AttendanceAccessMethod["method_type"] | "";
  result_status: "success" | "failure" | "rejected" | "overridden" | "";
  event_timestamp?: string | null;
  photo_url?: string | null;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface AttendanceControlOverviewResponse {
  date: string;
  summary: {
    users_count: number;
    locations_count: number;
    templates_count: number;
    assigned_users_count: number;
    unassigned_users_count: number;
    late_today_count: number;
    manual_corrections_count: number;
    records_today_count: number;
    auth_success_count: number;
    auth_failure_count: number;
    override_count: number;
  };
  locations: AttendanceControlLocation[];
  templates: AttendanceControlTemplate[];
  kiosk_devices: AttendanceKioskDevice[];
  assignments: AttendanceControlAssignment[];
  recent_events: AttendanceControlRecentEvent[];
}

export interface AttendanceScheduleCandidateOption {
  id: number;
  name: string;
  unit_id?: number | null;
  unit_name?: string | null;
}

export interface AttendanceScheduleCandidatesResponse {
  date: string;
  items: AttendanceControlAssignment[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
  available_count: number;
  busy_count: number;
  unit_options: AttendanceScheduleCandidateOption[];
  business_options: AttendanceScheduleCandidateOption[];
}

export interface AttendanceControlLocationsResponse {
  items: AttendanceControlLocation[];
}

export interface AttendanceControlLocationPayload {
  unit_id?: number | null;
  business_id?: number | null;
  contract_start_date: string;
  contract_end_date: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  required_hours_per_day: number;
  required_start_time?: string | null;
  required_end_time?: string | null;
  required_days_per_week?: number | null;
  status: "active" | "inactive";
}

export interface AttendanceLocationCoordinateExtractionPayload {
  map_url: string;
}

export interface AttendanceLocationCoordinateExtractionResponse {
  latitude: number;
  longitude: number;
  resolved_url: string;
}

export interface AttendanceControlTemplatePayload {
  name: string;
  status: "active" | "inactive";
  schedule_mode?: "strict" | "open";
  block_after_grace_period?: boolean;
  enforce_location?: boolean;
  location_id?: number | null;
  days: Array<{
    day_of_week: number;
    start_time?: string | null;
    end_time?: string | null;
    meal_minutes: number;
    rest_minutes: number;
    late_after_minutes: number;
    is_rest_day: boolean;
  }>;
}

export interface AttendanceControlTemplatesResponse {
  items: AttendanceControlTemplate[];
}

export interface AttendanceControlAssignmentPayload {
  user_company_ids: number[];
  template_id: number;
  effective_start_date: string;
  effective_end_date?: string;
}

export interface AttendanceHrUserAllowedLocationsPayload {
  location_ids: number[];
}

export interface AttendanceWorkSiteAssignmentPayload {
  user_company_ids: number[];
  location_id: number;
  template_id?: number;
  effective_start_date: string;
  effective_end_date?: string;
}

export interface AttendanceWorkSiteAssignmentResponse {
  assigned_count: number;
  location: AttendanceControlLocation;
  assignments: AttendanceHrUserWorkSiteAssignment[];
}

export interface AttendanceWorkAssignmentClearPayload {
  user_company_id: number;
  date: string;
}

export interface AttendanceWorkAssignmentClearResponse {
  user_company_id: number;
  user_name: string;
  date: string;
  schedule_assignments_cleared: number;
  work_site_assignments_cleared: number;
}

export interface AttendanceControlAssignmentResult {
  user_company_id: number;
  user_name: string;
  template_id: number;
  template_name: string;
  effective_start_date: string;
  effective_end_date?: string | null;
}

export interface AttendanceControlBulkAssignmentResponse {
  assigned_count: number;
  template_id: number;
  template_name: string;
  assignments: AttendanceControlAssignmentResult[];
}

export interface AttendanceKioskDevicesResponse {
  items: AttendanceKioskDevice[];
}

export interface AttendanceKioskDeviceRotateTokenResponse {
  kiosk_device: AttendanceKioskDevice;
}

export interface AttendanceKioskDevicePayload {
  code: string;
  name: string;
  unit_id?: number | null;
  business_id?: number | null;
  location_id?: number | null;
  status: "active" | "inactive";
  metadata?: Record<string, unknown>;
}

export interface AttendanceAccessProfilesResponse {
  items: AttendanceAccessProfile[];
}

export interface AttendanceAccessProfilePayload {
  user_company_id: number;
  status: "active" | "inactive";
  default_method: AttendanceAccessMethod["method_type"];
  last_enrolled_at?: string;
  metadata?: Record<string, unknown>;
}

export interface AttendanceAccessMethodsResponse {
  items: AttendanceAccessMethod[];
}

export interface AttendanceAccessMethodPayload {
  access_profile_id: number;
  method_type: AttendanceAccessMethod["method_type"];
  credential_ref?: string | null;
  secret?: string;
  regenerate_pin?: boolean;
  auto_generate_pin?: boolean;
  status: "active" | "inactive";
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface PayrollPreferences {
  grouping_mode: "single" | "unit" | "business";
  default_daily_hours: number;
  pay_leave_days: boolean;
  weekly_start_day: number;
  biweekly_first_day: number;
  biweekly_second_day: number;
  monthly_start_day: number;
  isr_rate: number;
  imss_user_rate: number;
  infonavit_user_rate: number;
  imss_employer_rate: number;
  infonavit_employer_rate: number;
  sar_employer_rate: number;
}

export interface PayrollOverviewResponse {
  summary: {
    runs_count: number;
    draft_count: number;
    processed_count: number;
    approved_count: number;
    paid_count: number;
    cancelled_count: number;
    total_gross_amount: number;
    total_net_amount: number;
  };
  preferences: PayrollPreferences;
  recent_runs: PayrollRunSummary[];
}

export interface PayrollRunSummary {
  id: number;
  grouping_mode: "single" | "unit" | "business";
  grouping_key?: string | null;
  grouping_label?: string | null;
  jurisdiction_label?: string | null;
  currency_code?: string | null;
  native_totals_by_currency?: Record<string, number>;
  pay_period: "weekly" | "biweekly" | "semimonthly" | "monthly";
  period_start_date: string;
  period_end_date: string;
  status: "draft" | "processed" | "approved" | "paid" | "cancelled";
  users_count: number;
  gross_amount: number;
  deductions_amount: number;
  employer_contributions_amount: number;
  net_amount: number;
  statutory_compliance?: boolean;
  unsupported_country_count?: number;
  calculation_warnings?: string[];
  created_at?: string | null;
  reused?: boolean;
}

export interface PayrollRunListResponse {
  items: PayrollRunSummary[];
}

export interface PayrollRegenerateRunsResponse extends PayrollRunListResponse {
  cancelled_count: number;
  regenerated_count: number;
  skipped_locked_count: number;
}

export interface PayrollCreateRunsPayload {
  pay_period: "weekly" | "biweekly" | "semimonthly" | "monthly";
  grouping_mode: "single" | "unit" | "business";
  period_start_date: string;
  period_end_date: string;
}

export interface PayrollLineItem {
  id: number;
  code: string;
  category: "earning" | "deduction" | "employer_contribution" | "provision";
  label: string;
  amount: number;
  source_type:
    "computed" | "manual" | "computed_tax" | "adjustment" | "incentive";
  country_code?: string | null;
  jurisdiction_code?: string | null;
  tax_treatment?: string | null;
  taxable?: boolean;
  exempt?: boolean;
  affects_social_security?: boolean;
  affects_employer_cost?: boolean;
  legal_classification?: string | null;
  rule_code?: string | null;
  rule_set_id?: number | null;
  calculation_formula?: string | null;
  calculation_base?: number | null;
  rate_applied?: number | null;
  currency_code?: string | null;
}

export interface PayrollRunLine {
  id: number;
  user_company_id: number;
  user_code?: string;
  user_name: string;
  position_title?: string;
  department?: string;
  unit_id?: number | null;
  unit_name?: string;
  business_id?: number | null;
  business_name?: string;
  country_code?: string | null;
  jurisdiction_code?: string | null;
  currency_code?: string | null;
  fx_rate?: number | null;
  pay_period: "weekly" | "biweekly" | "semimonthly" | "monthly";
  salary_type: "daily" | "hourly";
  base_salary_amount: number;
  hourly_rate_amount?: number | null;
  days_payable: number;
  leave_days: number;
  absence_days: number;
  rest_days: number;
  missing_attendance_days?: number;
  paid_leave_days?: number;
  unpaid_absence_days?: number;
  late_count: number;
  regular_hours: number;
  overtime_hours: number;
  include_in_fiscal: boolean;
  payroll_treatment?: PayrollTreatment | string | null;
  payroll_treatment_label?: string | null;
  payment_route?: PayrollPaymentRoute | string | null;
  payment_route_label?: string | null;
  payable_expense_id?: number | null;
  payable_created_at?: string | null;
  payable_metadata?: Record<string, unknown> | null;
  gross_amount: number;
  deductions_amount: number;
  employer_contributions_amount: number;
  net_amount: number;
  notes?: string;
  calculation_source?: string | null;
  calculation_timestamp?: string | null;
  employee_salary_snapshot?: Record<string, unknown>;
  attendance_snapshot?: Record<string, unknown>;
  manual_adjustments_snapshot?: unknown[];
  calculation_inputs?: Record<string, unknown>;
  calculation_results?: Record<string, unknown>;
  rule_snapshot?: Record<string, unknown>;
  attendance_warnings?: string[];
  statutory_compliance?: boolean;
  calculation_warnings?: string[];
  items: PayrollLineItem[];
}

export interface PayrollRunDetailResponse {
  run: PayrollRunSummary;
  lines: PayrollRunLine[];
}

export interface PayrollManualItemPayload {
  category: "earning" | "deduction" | "employer_contribution" | "provision";
  label: string;
  amount: number;
}

export interface PayrollUpdateLinePayload {
  include_in_fiscal: boolean;
  payroll_treatment?: PayrollTreatment | string;
  notes?: string;
  manual_items: PayrollManualItemPayload[];
}

export interface PayrollColombiaConfig {
  country_code: "CO";
  exists: boolean;
  default_arl_class?: number | null;
  compensation_fund_code?: string;
  compensation_fund_name?: string;
  employer_health_exemption_applies?: boolean | null;
  sena_applies?: boolean | null;
  icbf_applies?: boolean | null;
  ccf_applies?: boolean | null;
  metadata?: Record<string, unknown>;
}

export interface PayrollColombiaEmployeeProfile {
  user_company_id: number;
  country_code: "CO";
  exists: boolean;
  contributor_type?: string;
  contributor_subtype?: string;
  integral_salary: boolean;
  arl_class?: number | null;
  eps_code?: string;
  eps_name?: string;
  afp_code?: string;
  afp_name?: string;
  compensation_fund_code?: string;
  compensation_fund_name?: string;
  employer_health_exemption_applies?: boolean | null;
  sena_applies?: boolean | null;
  icbf_applies?: boolean | null;
  ccf_applies?: boolean | null;
  withholding_procedure: "procedure_1" | "procedure_2";
  dependents_monthly_deduction: number;
  prepaid_medicine_monthly: number;
  housing_interest_monthly: number;
  voluntary_pension_monthly: number;
  afc_monthly: number;
  other_exempt_income_monthly: number;
  procedure_2_fixed_rate: number;
  metadata?: Record<string, unknown>;
}

export type PayrollColombiaNoveltyCode =
  | "ING"
  | "RET"
  | "VSP"
  | "VST"
  | "SLN"
  | "IGE"
  | "LMA"
  | "LPA"
  | "VAC"
  | "SUS"
  | "AUS"
  | "TER"
  | "TERMINATION"
  | "LIQ"
  | "LIQUIDACION"
  | "RETRO"
  | "RETROACTIVO"
  | "AJR"
  | "CORR"
  | "CORRECCION"
  | "AJUSTE"
  | "ADJ";

export interface PayrollColombiaNovelty {
  id: number;
  company_id: number;
  user_company_id: number;
  country_code: "CO";
  user_code?: string;
  user_name?: string;
  novelty_code: PayrollColombiaNoveltyCode;
  novelty_label?: string;
  start_date: string;
  end_date?: string | null;
  days: number;
  hours: number;
  paid: boolean;
  affects_ibc: boolean;
  ibc_impact_amount: number;
  source:
    | "manual"
    | "attendance"
    | "control"
    | "payroll"
    | "termination"
    | "import"
    | "api";
  status: "active" | "inactive" | "cancelled" | "applied";
  metadata?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PayrollColombiaNoveltiesResponse {
  items: PayrollColombiaNovelty[];
  count: number;
}

export interface PayrollColombiaNoveltyPayload {
  user_company_id?: number;
  novelty_code?: PayrollColombiaNoveltyCode;
  novelty_label?: string;
  start_date?: string;
  end_date?: string | null;
  days?: number;
  hours?: number;
  paid?: boolean;
  affects_ibc?: boolean;
  ibc_impact_amount?: number;
  source?: PayrollColombiaNovelty["source"];
  status?: PayrollColombiaNovelty["status"];
  metadata?: Record<string, unknown>;
}

export interface PayrollGovernmentReportingSnapshot {
  id: number;
  run_id: number;
  run_line_id: number;
  company_id: number;
  user_company_id: number;
  country_code: string;
  report_type: "PILA" | "DIAN_PAYROLL";
  report_period_start: string;
  report_period_end: string;
  status: string;
  payload_hash?: string;
  payload: Record<string, unknown>;
  validation: Record<string, unknown>;
  response: Record<string, unknown>;
  generated_by_source?: string;
  generated_at?: string | null;
  updated_at?: string | null;
}

export interface PayrollGovernmentReportingSnapshotsResponse {
  run: PayrollRunSummary;
  items: PayrollGovernmentReportingSnapshot[];
  count: number;
}

export interface PayrollGovernmentReportingResponsePayload {
  status?:
    | "draft_ready"
    | "draft_blocked"
    | "transmitted"
    | "accepted"
    | "rejected"
    | "correction_required";
  external_id?: string;
  message?: string;
  response_at?: string;
  issues?: Array<Record<string, unknown>>;
}

export interface AttendanceKioskEventPayload {
  user_company_id?: number;
  event_type?: "check_in" | "check_out" | "break_out" | "break_in";
  event_kind?:
    | "auth_attempt"
    | "check_in"
    | "break_out"
    | "break_in"
    | "check_out"
    | "manual_override"
    | "correction";
  location_id?: number;
  kiosk_device_id?: number;
  latitude?: number;
  longitude?: number;
  auth_method?: AttendanceAccessMethod["method_type"];
  face_verification_session_id?: number;
  credential_payload?: string;
  photo_url?: string;
  event_timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface PublicKioskBootstrapResponse {
  kiosk_device: {
    id: number;
    code: string;
    name: string;
  };
  kiosk_type?:
    "business_unit" | "contract_site" | "head_office" | "open_attendance";
  location?: AttendanceLocation | null;
  scope_label?: string | null;
  auth_methods: Array<"pin">;
  inactivity_timeout_seconds: number;
  csrfToken?: string;
  accessLevel?: "CONTROLLED";
  configurationVersion?: number;
}

export interface PublicKioskIdentifyRequest {
  auth_method: "pin";
  credential_payload: string;
}

export interface PublicKioskDayActivity {
  attendance_date: string;
  status: AttendanceStatus;
  corrected_status?: AttendanceCorrectionStatus | null;
  first_check_in_at?: string | null;
  last_check_out_at?: string | null;
  first_location?: AttendanceLocation | null;
  last_location?: AttendanceLocation | null;
  minutes_late?: number;
  has_check_in?: boolean;
  has_check_out?: boolean;
  has_active_check_in?: boolean;
}

export interface PublicKioskIdentifyResponse {
  auth_attempt_event_id: number;
  auth_method: "pin";
  user: {
    id: number;
    user_code?: string;
    full_name: string;
    position_title?: string;
    department?: string;
  };
  identification_token: string;
  kiosk_session_id?: string;
  kiosk_session_token?: string;
  expires_at: string;
  today_activity?: PublicKioskDayActivity;
}

export interface PublicKioskPunchRequest {
  identification_token: string;
  kiosk_session_token: string;
  event_type: "check_in" | "check_out";
  event_timestamp?: string;
  latitude?: number;
  longitude?: number;
  face_verification_session_id?: number;
  photo_url?: string;
  metadata?: Record<string, unknown>;
}

export interface PublicKioskSessionCredentials {
  identificationToken: string;
  kioskSessionToken: string;
  browserSessionReference: string;
}

export interface PublicKioskPunchResponse {
  event_id: number;
  user_company_id: number;
  event_kind: "check_in" | "check_out";
  auth_method: "pin";
  result_status: "success";
  status: AttendanceStatus;
  first_check_in_at?: string | null;
  last_check_out_at?: string | null;
  location: AttendanceLocation | null;
  location_restricted?: boolean;
  photo_object_key?: string | null;
  photo_storage?: "object_storage" | "unavailable" | "none";
  identity_evidence?: "face_verified" | "photo_fallback";
  today_activity?: PublicKioskDayActivity;
}

export interface AttendanceMediaPresignRequest {
  user_company_id?: number;
  content_type: string;
  event_type?: "check_in" | "check_out" | "break_out" | "break_in";
  event_timestamp?: string;
}

export interface AttendanceMediaPresignResponse {
  object_key: string;
  upload_url: string;
  expires_at: string;
  upload_headers?: Record<string, string>;
}

export interface AttendanceCorrectionPayload {
  status: AttendanceCorrectionStatus | "";
  notes?: string;
}

export interface AttendanceBulkCorrectionPayload extends AttendanceCorrectionPayload {
  dates: string[];
}

export type AttendanceManualEventKind = "check_in" | "check_out";

export interface AttendanceManualEventPayload {
  event_kind: AttendanceManualEventKind;
  event_date?: string;
  event_time?: string;
  event_timestamp?: string;
  notes?: string;
}

export interface AttendanceDailyRecordUpdateResponse {
  user_company_id: number;
  date: string;
  event_id?: number;
  event_kind?: AttendanceManualEventKind;
  result_status?: "overridden";
  system_status: AttendanceStatus;
  corrected_status?: AttendanceCorrectionStatus | null;
  effective_status: AttendanceStatus;
  attendance_editable?: boolean;
  edit_lock_reason?: string | null;
  notes?: string | null;
  entry_registered?: boolean;
  exit_registered?: boolean;
  first_check_in_at?: string | null;
  last_check_out_at?: string | null;
  minutes_late?: number;
  first_location?: AttendanceLocation | null;
  last_location?: AttendanceLocation | null;
}

export interface AttendanceBulkDailyRecordUpdateResponse {
  items: AttendanceDailyRecordUpdateResponse[];
  updated_count: number;
}

export interface AttendanceRestPlanAssignment {
  user_company_id: number;
  dates: string[];
}

export interface AttendanceBulkRestPlanPayload {
  assignments: AttendanceRestPlanAssignment[];
  notes?: string;
}

export interface AttendanceBulkRestPlanResponse {
  items: AttendanceDailyRecordUpdateResponse[];
  updated_count: number;
  employee_count: number;
}

export interface FaceEnrollmentSessionResponse {
  id: number;
  user_company_id: number;
  status: string;
  required_steps: string[];
  expires_at: string;
}

export interface FaceCapturePresignResponse {
  step: string;
  object_key: string;
  upload_url: string;
  expires_at: string;
  upload_headers?: Record<string, string>;
}

export interface FaceEnrollmentStatusResponse {
  enrollment: {
    id: number;
    user_company_id: number;
    status: string;
    enrolled_at?: string | null;
    required_steps?: string[];
  } | null;
}

export interface FaceVerificationSessionResponse {
  session_id: number;
  user_company_id: number;
  required_steps: string[];
  expires_at: string;
  status: string;
}

export interface FaceVerificationResultResponse {
  session_id: number;
  user_company_id: number;
  status: string;
  matched: boolean;
  liveness_passed: boolean;
  match_score?: number | null;
  failure_reason?: string | null;
}

export interface AnnouncementListItem {
  id: number;
  title: string;
  type: "general" | "urgent" | "reminder" | "celebration";
  audience_type: "all" | "units" | "departments" | "employees";
  audience_summary: string;
  status: "draft" | "scheduled" | "published";
  scheduled_for?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  author_name: string;
  content: string;
  targets?: AnnouncementTarget[];
  attachments?: AnnouncementAttachment[];
  attachment_count?: number;
  delivery_count?: number;
  read_count?: number;
  is_read?: boolean;
  read_at?: string | null;
}

export interface AnnouncementTarget {
  target_type: "unit" | "department" | "employee";
  target_value: string;
}

export interface AnnouncementAttachment {
  id: number;
  announcement_id: number;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  object_key: string;
  download_url?: string | null;
}

export interface AnnouncementsListResponse {
  items: AnnouncementListItem[];
  summary: {
    total_count: number;
    published_count: number;
    scheduled_count: number;
    draft_count: number;
    can_manage?: boolean;
  };
}

export interface AnnouncementAudienceDepartmentOption {
  name: string;
  active_user_count: number;
  is_available: boolean;
}

export interface AnnouncementAudienceUnitOption {
  id: number;
  name: string;
  active_user_count: number;
  is_available: boolean;
}

export interface AnnouncementAudienceEmployeeOption {
  id: number;
  name: string;
  position?: string | null;
  unit_id?: number | null;
  unit_name?: string | null;
  department?: string | null;
}

export interface AnnouncementAudienceOptionsResponse {
  departments: AnnouncementAudienceDepartmentOption[];
  units: AnnouncementAudienceUnitOption[];
  employees: AnnouncementAudienceEmployeeOption[];
}

export interface CreateAnnouncementPayload {
  title: string;
  type: "general" | "urgent" | "reminder" | "celebration";
  content: string;
  audience_type: "all" | "units" | "departments" | "employees";
  status: "draft" | "scheduled" | "published";
  scheduled_for?: string;
  unit_ids?: string[];
  department_names?: string[];
  user_company_ids?: number[];
}

export interface AnnouncementAttachmentPresignPayload {
  file_name: string;
  content_type: string;
  size_bytes: number;
}

export interface AnnouncementAttachmentPresignResponse {
  object_key: string;
  upload_url: string;
  expires_at: string;
  upload_headers: Record<string, string>;
}

export interface RegisterAnnouncementAttachmentPayload {
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  object_key: string;
}

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });

  const queryString = search.toString();
  return queryString ? `?${queryString}` : "";
};

export const humanResourcesApi = {
  listHrUsers() {
    return apiClient<HrUsersListResponse>(endpoints.humanResources.hrUsersList);
  },

  getHrUserDetails(id: string | number) {
    return apiClient<HrUserDetailsResponse>(
      `${endpoints.humanResources.hrUserDetails}/${id}`,
    );
  },

  createHrUser(payload: Record<string, unknown>) {
    return apiClient<BackendHrUser>(endpoints.humanResources.hrUserCreate, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateHrUser(id: string | number, payload: Record<string, unknown>) {
    return apiClient<BackendHrUser>(
      `${endpoints.humanResources.hrUserUpdate}/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  deleteHrUser(id: string | number) {
    return apiClient<{ success: boolean }>(
      `${endpoints.humanResources.hrUserDelete}/${id}`,
      {
        method: "DELETE",
      },
    );
  },

  terminateHrUser(id: string | number, payload: TerminationPayload) {
    return apiClient<BackendHrUser>(
      `${endpoints.humanResources.hrUserTerminate}/${id}/terminate`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  presignHrUserDocumentUpload(
    userCompanyId: string | number,
    payload: HrUserDocumentPresignPayload,
  ) {
    return apiClient<HrUserDocumentPresignResponse>(
      `${endpoints.humanResources.hrUserDocuments}/${userCompanyId}/documents/presign-upload`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  async uploadHrUserDocument(
    uploadUrl: string,
    file: Blob,
    contentType: string,
    uploadHeaders: Record<string, string> = {},
  ) {
    const headers = new Headers(uploadHeaders);

    if (contentType && !headers.has("Content-Type")) {
      headers.set("Content-Type", contentType);
    }

    const response = await fetch(normalizeStorageUrl(uploadUrl), {
      method: "PUT",
      headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error("HR user document upload failed.");
    }
  },

  registerHrUserDocument(
    userCompanyId: string | number,
    payload: RegisterHrUserDocumentPayload,
  ) {
    return apiClient<BackendHrUserDocument>(
      `${endpoints.humanResources.hrUserDocuments}/${userCompanyId}/documents`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  deleteHrUserDocument(
    userCompanyId: string | number,
    documentId: string | number,
  ) {
    return apiClient<{ success: boolean }>(
      `${endpoints.humanResources.hrUserDocuments}/${userCompanyId}/documents/${documentId}`,
      {
        method: "DELETE",
      },
    );
  },

  getAttendanceDashboard(date: string) {
    return apiClient<AttendanceDashboardResponse>(
      `${endpoints.humanResources.attendanceDashboard}${toQueryString({ date })}`,
    );
  },

  getMyAttendanceDashboard(date: string) {
    return apiClient<AttendanceDashboardResponse>(
      `${endpoints.humanResources.attendanceSelfDashboard}${toQueryString({ date })}`,
    );
  },

  getAttendanceControlOverview(date: string) {
    return apiClient<AttendanceControlOverviewResponse>(
      `${endpoints.humanResources.attendanceControlOverview}${toQueryString({ date })}`,
    );
  },

  listAttendanceControlLocations() {
    return apiClient<AttendanceControlLocationsResponse>(
      endpoints.humanResources.attendanceLocations,
    );
  },

  extractAttendanceLocationCoordinates(
    payload: AttendanceLocationCoordinateExtractionPayload,
  ) {
    return apiClient<AttendanceLocationCoordinateExtractionResponse>(
      endpoints.humanResources.attendanceLocationCoordinateExtraction,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  createAttendanceControlLocation(payload: AttendanceControlLocationPayload) {
    return apiClient<{ location: AttendanceControlLocation }>(
      endpoints.humanResources.attendanceLocations,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  updateAttendanceControlLocation(
    locationId: string | number,
    payload: AttendanceControlLocationPayload,
  ) {
    return apiClient<{ location: AttendanceControlLocation }>(
      `${endpoints.humanResources.attendanceLocations}/${locationId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  deleteAttendanceControlLocation(locationId: string | number) {
    return apiClient<{ success: boolean }>(
      `${endpoints.humanResources.attendanceLocations}/${locationId}`,
      {
        method: "DELETE",
      },
    );
  },

  listAttendanceControlTemplates() {
    return apiClient<AttendanceControlTemplatesResponse>(
      endpoints.humanResources.attendanceScheduleTemplates,
    );
  },

  listAttendanceScheduleCandidates(params: {
    date: string;
    effective_end_date?: string;
    page?: number;
    size?: number;
    search?: string;
    unit_id?: string | number;
    business_id?: string | number;
    available_only?: string | number;
  }) {
    return apiClient<AttendanceScheduleCandidatesResponse>(
      `${endpoints.humanResources.attendanceScheduleCandidates}${toQueryString(params)}`,
    );
  },

  createAttendanceControlTemplate(payload: AttendanceControlTemplatePayload) {
    return apiClient<{ template: AttendanceControlTemplate }>(
      endpoints.humanResources.attendanceScheduleTemplates,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  updateAttendanceControlTemplate(
    templateId: string | number,
    payload: AttendanceControlTemplatePayload,
  ) {
    return apiClient<{ template: AttendanceControlTemplate }>(
      `${endpoints.humanResources.attendanceScheduleTemplates}/${templateId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  bulkAssignAttendanceSchedule(payload: AttendanceControlAssignmentPayload) {
    return apiClient<AttendanceControlBulkAssignmentResponse>(
      endpoints.humanResources.attendanceScheduleAssignmentsBulk,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  replaceAttendanceHrUserAllowedLocations(
    userCompanyId: string | number,
    payload: AttendanceHrUserAllowedLocationsPayload,
  ) {
    return apiClient<{
      user_company_id: number;
      allowed_locations: AttendanceControlLocation[];
    }>(
      `${endpoints.humanResources.attendanceCalendar}/${userCompanyId}/allowed-locations`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  bulkAssignAttendanceWorkSite(payload: AttendanceWorkSiteAssignmentPayload) {
    return apiClient<AttendanceWorkSiteAssignmentResponse>(
      endpoints.humanResources.attendanceWorkSiteAssignmentsBulk,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  clearAttendanceWorkAssignments(
    payload: AttendanceWorkAssignmentClearPayload,
  ) {
    return apiClient<AttendanceWorkAssignmentClearResponse>(
      endpoints.humanResources.attendanceWorkAssignmentsClear,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  listAttendanceKioskDevices() {
    return apiClient<AttendanceKioskDevicesResponse>(
      endpoints.humanResources.attendanceKioskDevices,
    );
  },

  createAttendanceKioskDevice(payload: AttendanceKioskDevicePayload) {
    return apiClient<{ kiosk_device: AttendanceKioskDevice }>(
      endpoints.humanResources.attendanceKioskDevices,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  updateAttendanceKioskDevice(
    kioskDeviceId: string | number,
    payload: AttendanceKioskDevicePayload,
  ) {
    return apiClient<{ kiosk_device: AttendanceKioskDevice }>(
      `${endpoints.humanResources.attendanceKioskDevices}/${kioskDeviceId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  deleteAttendanceKioskDevice(kioskDeviceId: string | number) {
    return apiClient<{ success: boolean }>(
      `${endpoints.humanResources.attendanceKioskDevices}/${kioskDeviceId}`,
      {
        method: "DELETE",
      },
    );
  },

  rotateAttendanceKioskDevicePublicToken(kioskDeviceId: string | number) {
    return apiClient<AttendanceKioskDeviceRotateTokenResponse>(
      `${endpoints.humanResources.attendanceKioskDeviceRotateToken}/${kioskDeviceId}/rotate-public-access-token`,
      {
        method: "POST",
      },
    );
  },

  listAttendanceAccessProfiles() {
    return apiClient<AttendanceAccessProfilesResponse>(
      endpoints.humanResources.attendanceAccessProfiles,
    );
  },

  createAttendanceAccessProfile(payload: AttendanceAccessProfilePayload) {
    return apiClient<{ access_profile: AttendanceAccessProfile }>(
      endpoints.humanResources.attendanceAccessProfiles,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  updateAttendanceAccessProfile(
    profileId: string | number,
    payload: AttendanceAccessProfilePayload,
  ) {
    return apiClient<{ access_profile: AttendanceAccessProfile }>(
      `${endpoints.humanResources.attendanceAccessProfiles}/${profileId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  listAttendanceAccessMethods() {
    return apiClient<AttendanceAccessMethodsResponse>(
      endpoints.humanResources.attendanceAccessMethods,
    );
  },

  createAttendanceAccessMethod(payload: AttendanceAccessMethodPayload) {
    return apiClient<{
      access_method: AttendanceAccessMethod;
      access_profile: AttendanceAccessProfile;
    }>(endpoints.humanResources.attendanceAccessMethods, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateAttendanceAccessMethod(
    methodId: string | number,
    payload: AttendanceAccessMethodPayload,
  ) {
    return apiClient<{
      access_method: AttendanceAccessMethod;
      access_profile: AttendanceAccessProfile;
    }>(`${endpoints.humanResources.attendanceAccessMethods}/${methodId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  getAttendanceCalendar(userCompanyId: string | number, month: string) {
    return apiClient<AttendanceCalendarResponse>(
      `${endpoints.humanResources.attendanceCalendar}/${userCompanyId}/calendar${toQueryString({ month })}`,
    );
  },

  getMyAttendanceCalendar(month: string) {
    return apiClient<AttendanceCalendarResponse>(
      `${endpoints.humanResources.attendanceSelfCalendar}${toQueryString({ month })}`,
    );
  },

  presignAttendancePhotoUpload(payload: AttendanceMediaPresignRequest) {
    return apiClient<AttendanceMediaPresignResponse>(
      endpoints.humanResources.attendanceMediaPresignUpload,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  presignMyAttendancePhotoUpload(
    payload: Omit<AttendanceMediaPresignRequest, "user_company_id">,
  ) {
    return apiClient<AttendanceMediaPresignResponse>(
      endpoints.humanResources.attendanceSelfMediaPresignUpload,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  async uploadAttendancePhoto(
    uploadUrl: string,
    file: Blob,
    contentType: string,
    uploadHeaders: Record<string, string> = {},
  ) {
    const headers = new Headers(uploadHeaders);

    if (contentType && !headers.has("Content-Type")) {
      headers.set("Content-Type", contentType);
    }

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error("Attendance photo upload failed.");
    }
  },

  recordAttendanceKioskEvent(payload: AttendanceKioskEventPayload) {
    return apiClient<{ status: string }>(
      endpoints.humanResources.attendanceKioskEvents,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  recordMyAttendanceKioskEvent(
    payload: Omit<AttendanceKioskEventPayload, "user_company_id">,
  ) {
    return apiClient<{ status: string }>(
      endpoints.humanResources.attendanceSelfKioskEvents,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  getPublicKioskBootstrap(deviceToken: string, browserSessionReference: string) {
    return apiClient<PublicKioskBootstrapResponse>(
      `${endpoints.humanResources.attendancePublicKiosk}/${deviceToken}/bootstrap`,
      {
        headers: { "X-Kiosk-Browser-Session": browserSessionReference },
      },
    );
  },

  identifyPublicKioskHrUser(
    deviceToken: string,
    payload: PublicKioskIdentifyRequest,
    browserSessionReference: string,
  ) {
    return apiClient<PublicKioskIdentifyResponse>(
      `${endpoints.humanResources.attendancePublicKiosk}/${deviceToken}/identify`,
      {
        method: "POST",
        headers: { "X-Kiosk-Browser-Session": browserSessionReference },
        body: JSON.stringify(payload),
      },
    );
  },

  punchPublicKiosk(
    deviceToken: string,
    payload: PublicKioskPunchRequest,
    browserSessionReference: string,
  ) {
    return apiClient<PublicKioskPunchResponse>(
      `${endpoints.humanResources.attendancePublicKiosk}/${deviceToken}/punch`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key": kioskIdempotencyKey(),
          "X-Kiosk-Browser-Session": browserSessionReference,
        },
        body: JSON.stringify(payload),
      },
    );
  },

  presignPublicKioskAttendancePhotoUpload(
    deviceToken: string,
    payload: Omit<AttendanceMediaPresignRequest, "user_company_id"> & {
      identification_token: string;
      kiosk_session_token: string;
    },
    browserSessionReference: string,
  ) {
    return apiClient<AttendanceMediaPresignResponse>(
      `${endpoints.humanResources.attendancePublicKiosk}/${deviceToken}/media/presign-upload`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key": kioskIdempotencyKey(),
          "X-Kiosk-Browser-Session": browserSessionReference,
        },
        body: JSON.stringify(payload),
      },
    );
  },

  createPublicKioskFaceVerificationSession(
    deviceToken: string,
    credentials: PublicKioskSessionCredentials,
  ) {
    return apiClient<FaceVerificationSessionResponse>(
      `${endpoints.humanResources.attendancePublicKiosk}/${deviceToken}/face-verification-sessions`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key": kioskIdempotencyKey(),
          "X-Kiosk-Browser-Session": credentials.browserSessionReference,
        },
        body: JSON.stringify({
          identification_token: credentials.identificationToken,
          kiosk_session_token: credentials.kioskSessionToken,
        }),
      },
    );
  },

  presignPublicKioskFaceVerificationCapture(
    deviceToken: string,
    sessionId: number,
    credentials: PublicKioskSessionCredentials,
    step: string,
    contentType: string,
  ) {
    return apiClient<FaceCapturePresignResponse>(
      `${endpoints.humanResources.attendancePublicKiosk}/${deviceToken}/face-verification-sessions/${sessionId}/captures/presign-upload`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key": kioskIdempotencyKey(),
          "X-Kiosk-Browser-Session": credentials.browserSessionReference,
        },
        body: JSON.stringify({
          identification_token: credentials.identificationToken,
          kiosk_session_token: credentials.kioskSessionToken,
          step,
          content_type: contentType,
        }),
      },
    );
  },

  completePublicKioskFaceVerificationSession(
    deviceToken: string,
    sessionId: number,
    credentials: PublicKioskSessionCredentials,
  ) {
    return apiClient<FaceVerificationResultResponse>(
      `${endpoints.humanResources.attendancePublicKiosk}/${deviceToken}/face-verification-sessions/${sessionId}/complete`,
      {
        method: "POST",
        headers: {
          "Idempotency-Key": kioskIdempotencyKey(),
          "X-Kiosk-Browser-Session": credentials.browserSessionReference,
        },
        body: JSON.stringify({
          identification_token: credentials.identificationToken,
          kiosk_session_token: credentials.kioskSessionToken,
        }),
      },
    );
  },

  createFaceEnrollmentSession(userCompanyId: number) {
    return apiClient<FaceEnrollmentSessionResponse>(
      endpoints.humanResources.faceEnrollmentSessions,
      {
        method: "POST",
        body: JSON.stringify({ user_company_id: userCompanyId }),
      },
    );
  },

  presignFaceEnrollmentCapture(
    enrollmentId: number,
    step: string,
    contentType: string,
  ) {
    return apiClient<FaceCapturePresignResponse>(
      `${endpoints.humanResources.faceEnrollmentSessions}/${enrollmentId}/captures/presign-upload`,
      {
        method: "POST",
        body: JSON.stringify({ step, content_type: contentType }),
      },
    );
  },

  completeFaceEnrollmentSession(enrollmentId: number) {
    return apiClient<FaceEnrollmentStatusResponse>(
      `${endpoints.humanResources.faceEnrollmentSessions}/${enrollmentId}/complete`,
      {
        method: "POST",
      },
    );
  },

  getFaceEnrollment(userCompanyId: number) {
    return apiClient<FaceEnrollmentStatusResponse>(
      `${endpoints.humanResources.faceEnrollments}/${userCompanyId}`,
    );
  },

  deleteFaceEnrollment(userCompanyId: number) {
    return apiClient<{ success: boolean }>(
      `${endpoints.humanResources.faceEnrollments}/${userCompanyId}`,
      {
        method: "DELETE",
      },
    );
  },

  createFaceVerificationSession(userCompanyId: number) {
    return apiClient<FaceVerificationSessionResponse>(
      endpoints.humanResources.attendanceFaceVerificationSessions,
      {
        method: "POST",
        body: JSON.stringify({ user_company_id: userCompanyId }),
      },
    );
  },

  createMyFaceVerificationSession() {
    return apiClient<FaceVerificationSessionResponse>(
      endpoints.humanResources.attendanceSelfFaceVerificationSessions,
      {
        method: "POST",
      },
    );
  },

  presignFaceVerificationCapture(
    sessionId: number,
    step: string,
    contentType: string,
  ) {
    return apiClient<FaceCapturePresignResponse>(
      `${endpoints.humanResources.attendanceFaceVerificationSessions}/${sessionId}/captures/presign-upload`,
      {
        method: "POST",
        body: JSON.stringify({ step, content_type: contentType }),
      },
    );
  },

  completeFaceVerificationSession(sessionId: number) {
    return apiClient<FaceVerificationResultResponse>(
      `${endpoints.humanResources.attendanceFaceVerificationSessions}/${sessionId}/complete`,
      {
        method: "POST",
      },
    );
  },

  updateAttendanceDailyRecord(
    userCompanyId: string | number,
    date: string,
    payload: AttendanceCorrectionPayload,
  ) {
    return apiClient<AttendanceDailyRecordUpdateResponse>(
      `${endpoints.humanResources.attendanceDailyRecords}/${userCompanyId}/${date}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  bulkUpdateAttendanceDailyRecords(
    userCompanyId: string | number,
    payload: AttendanceBulkCorrectionPayload,
  ) {
    return apiClient<AttendanceBulkDailyRecordUpdateResponse>(
      `${endpoints.humanResources.attendanceDailyRecords}/${userCompanyId}/bulk`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  bulkAssignAttendanceRestDays(payload: AttendanceBulkRestPlanPayload) {
    return apiClient<AttendanceBulkRestPlanResponse>(
      `${endpoints.humanResources.attendanceDailyRecords}/rest-plan`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  recordManualAttendanceEvent(
    userCompanyId: string | number,
    date: string,
    payload: AttendanceManualEventPayload,
  ) {
    return apiClient<AttendanceDailyRecordUpdateResponse>(
      `${endpoints.humanResources.attendanceDailyRecords}/${userCompanyId}/${date}/manual-events`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  updateMyAttendanceDailyRecord(
    date: string,
    payload: AttendanceCorrectionPayload,
  ) {
    return apiClient<AttendanceDailyRecordUpdateResponse>(
      `${endpoints.humanResources.attendanceSelfDailyRecords}/${date}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  getPayrollOverview() {
    return apiClient<PayrollOverviewResponse>(
      endpoints.humanResources.payrollOverview,
    );
  },

  getPayrollPreferences() {
    return apiClient<PayrollPreferences>(
      endpoints.humanResources.payrollPreferences,
    );
  },

  updatePayrollPreferences(payload: PayrollPreferences) {
    return apiClient<PayrollPreferences>(
      endpoints.humanResources.payrollPreferences,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  listPayrollRuns(filters: Record<string, string | number | undefined> = {}) {
    return apiClient<PayrollRunListResponse>(
      `${endpoints.humanResources.payrollRuns}${toQueryString(filters)}`,
    );
  },

  createPayrollRuns(payload: PayrollCreateRunsPayload) {
    return apiClient<PayrollRunListResponse>(
      endpoints.humanResources.payrollRuns,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  regeneratePayrollRuns() {
    return apiClient<PayrollRegenerateRunsResponse>(`${endpoints.humanResources.payrollRuns}/regenerate`, {
      method: 'POST',
    });
  },

  getPayrollRun(runId: string | number) {
    return apiClient<PayrollRunDetailResponse>(
      `${endpoints.humanResources.payrollRuns}/${runId}`,
    );
  },

  updatePayrollRunLine(
    runId: string | number,
    lineId: string | number,
    payload: PayrollUpdateLinePayload,
  ) {
    return apiClient<PayrollRunDetailResponse>(
      `${endpoints.humanResources.payrollRuns}/${runId}/lines/${lineId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  processPayrollRun(runId: string | number) {
    return apiClient<{ run: PayrollRunSummary }>(
      `${endpoints.humanResources.payrollRuns}/${runId}/process`,
      {
        method: "POST",
      },
    );
  },

  approvePayrollRun(runId: string | number) {
    return apiClient<{ run: PayrollRunSummary }>(
      `${endpoints.humanResources.payrollRuns}/${runId}/approve`,
      {
        method: "POST",
      },
    );
  },

  markPayrollRunPaid(runId: string | number) {
    return apiClient<{ run: PayrollRunSummary }>(
      `${endpoints.humanResources.payrollRuns}/${runId}/mark-paid`,
      {
        method: "POST",
      },
    );
  },

  cancelPayrollRun(runId: string | number) {
    return apiClient<{ run: PayrollRunSummary }>(
      `${endpoints.humanResources.payrollRuns}/${runId}/cancel`,
      {
        method: "POST",
      },
    );
  },

  getPayrollColombiaConfig() {
    return apiClient<PayrollColombiaConfig>(
      `${endpoints.humanResources.payrollColombia}/config`,
    );
  },

  updatePayrollColombiaConfig(payload: Partial<PayrollColombiaConfig>) {
    return apiClient<PayrollColombiaConfig>(
      `${endpoints.humanResources.payrollColombia}/config`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  getPayrollColombiaEmployeeProfile(userCompanyId: string | number) {
    return apiClient<PayrollColombiaEmployeeProfile>(
      `${endpoints.humanResources.payrollColombia}/profiles/${userCompanyId}`,
    );
  },

  updatePayrollColombiaEmployeeProfile(
    userCompanyId: string | number,
    payload: Partial<PayrollColombiaEmployeeProfile>,
  ) {
    return apiClient<PayrollColombiaEmployeeProfile>(
      `${endpoints.humanResources.payrollColombia}/profiles/${userCompanyId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  listPayrollColombiaNovelties(
    filters: {
      user_company_id?: string | number;
      period_from?: string;
      period_to?: string;
      status?: PayrollColombiaNovelty["status"] | "all";
    } = {},
  ) {
    return apiClient<PayrollColombiaNoveltiesResponse>(
      `${endpoints.humanResources.payrollColombia}/novelties${toQueryString(filters)}`,
    );
  },

  createPayrollColombiaNovelty(
    payload: PayrollColombiaNoveltyPayload & { user_company_id: number },
  ) {
    return apiClient<{ item: PayrollColombiaNovelty }>(
      `${endpoints.humanResources.payrollColombia}/novelties`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  updatePayrollColombiaNovelty(
    noveltyId: string | number,
    payload: PayrollColombiaNoveltyPayload,
  ) {
    return apiClient<{ item: PayrollColombiaNovelty }>(
      `${endpoints.humanResources.payrollColombia}/novelties/${noveltyId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  listPayrollGovernmentReportingSnapshots(
    runId: string | number,
    filters: { report_type?: "PILA" | "DIAN_PAYROLL" } = {},
  ) {
    return apiClient<PayrollGovernmentReportingSnapshotsResponse>(
      `${endpoints.humanResources.payrollRuns}/${runId}/government-reporting${toQueryString(filters)}`,
    );
  },

  updatePayrollGovernmentReportingResponse(
    snapshotId: string | number,
    payload: PayrollGovernmentReportingResponsePayload,
  ) {
    return apiClient<{ item: PayrollGovernmentReportingSnapshot }>(
      `${endpoints.humanResources.payrollGovernmentReporting}/${snapshotId}/response`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  listAnnouncements() {
    return apiClient<AnnouncementsListResponse>(
      endpoints.humanResources.announcementsList,
    );
  },

  getAnnouncementAudienceOptions() {
    return apiClient<AnnouncementAudienceOptionsResponse>(
      endpoints.humanResources.announcementsAudienceOptions,
    );
  },

  async createAnnouncement(payload: CreateAnnouncementPayload) {
    const response = await apiClient<AnnouncementListItem>(
      endpoints.humanResources.announcementsCreate,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    dispatchNotificationsRefresh();
    return response;
  },

  async updateAnnouncement(
    announcementId: string | number,
    payload: CreateAnnouncementPayload,
  ) {
    const response = await apiClient<AnnouncementListItem>(
      `${endpoints.humanResources.announcementsList}/${announcementId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
    dispatchNotificationsRefresh();
    return response;
  },

  async deleteAnnouncement(announcementId: string | number) {
    const response = await apiClient<{ success: boolean }>(
      `${endpoints.humanResources.announcementsList}/${announcementId}`,
      {
        method: "DELETE",
      },
    );
    dispatchNotificationsRefresh();
    return response;
  },

  async markAnnouncementRead(announcementId: string | number) {
    const response = await apiClient<{
      announcement_id: number;
      read_at: string;
    }>(`${endpoints.humanResources.announcementsList}/${announcementId}/read`, {
      method: "POST",
    });
    dispatchNotificationsRefresh();
    return response;
  },

  async markAnnouncementUnread(announcementId: string | number) {
    const response = await apiClient<{
      announcement_id: number;
      read_at: null;
    }>(`${endpoints.humanResources.announcementsList}/${announcementId}/read`, {
      method: "DELETE",
    });
    dispatchNotificationsRefresh();
    return response;
  },

  presignAnnouncementAttachmentUpload(
    announcementId: string | number,
    payload: AnnouncementAttachmentPresignPayload,
  ) {
    return apiClient<AnnouncementAttachmentPresignResponse>(
      `${endpoints.humanResources.announcementsList}/${announcementId}/attachments/presign-upload`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  async uploadAnnouncementAttachment(
    uploadUrl: string,
    file: Blob,
    contentType: string,
    uploadHeaders: Record<string, string> = {},
  ) {
    const headers = new Headers(uploadHeaders);
    if (contentType && !headers.has("Content-Type")) {
      headers.set("Content-Type", contentType);
    }
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers,
      body: file,
    });
    if (!response.ok) {
      throw new Error("Announcement attachment upload failed.");
    }
  },

  registerAnnouncementAttachment(
    announcementId: string | number,
    payload: RegisterAnnouncementAttachmentPayload,
  ) {
    return apiClient<AnnouncementListItem>(
      `${endpoints.humanResources.announcementsList}/${announcementId}/attachments`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  deleteAnnouncementAttachment(
    announcementId: string | number,
    attachmentId: string | number,
  ) {
    return apiClient<AnnouncementListItem>(
      `${endpoints.humanResources.announcementsList}/${announcementId}/attachments/${attachmentId}`,
      { method: "DELETE" },
    );
  },

  listRecords(filters: Record<string, string | number | undefined> = {}) {
    return apiClient<RecordsListResponse>(
      `${endpoints.humanResources.recordsList}${toQueryString(filters)}`,
    );
  },

  getRecordDetails(recordId: string | number) {
    return apiClient<RecordDetailsResponse>(
      `${endpoints.humanResources.recordDetails}/${recordId}`,
    );
  },

  createRecord(payload: CreateRecordPayload) {
    return apiClient<BackendRecordItem>(
      endpoints.humanResources.recordsCreate,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  updateRecord(
    recordId: string | number,
    payload: CreateRecordPayload & { status?: BackendRecordItem["status"] },
  ) {
    return apiClient<BackendRecordItem>(
      `${endpoints.humanResources.recordUpdate}/${recordId}`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  deleteRecord(recordId: string | number) {
    return apiClient<{ success: boolean }>(
      `${endpoints.humanResources.recordDelete}/${recordId}`,
      {
        method: "DELETE",
      },
    );
  },

  presignRecordAttachmentUpload(
    recordId: string | number,
    payload: RecordAttachmentPresignPayload,
  ) {
    return apiClient<RecordAttachmentPresignResponse>(
      `${endpoints.humanResources.recordAttachments}/${recordId}/attachments/presign-upload`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  async uploadRecordAttachment(
    uploadUrl: string,
    file: Blob,
    contentType: string,
    uploadHeaders: Record<string, string> = {},
  ) {
    const headers = new Headers(uploadHeaders);

    if (contentType && !headers.has("Content-Type")) {
      headers.set("Content-Type", contentType);
    }

    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error("Record attachment upload failed.");
    }
  },

  registerRecordAttachment(
    recordId: string | number,
    payload: RegisterRecordAttachmentPayload,
  ) {
    return apiClient<BackendRecordAttachment>(
      `${endpoints.humanResources.recordAttachments}/${recordId}/attachments`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  deleteRecordAttachment(
    recordId: string | number,
    attachmentId: string | number,
  ) {
    return apiClient<{ success: boolean }>(
      `${endpoints.humanResources.recordAttachments}/${recordId}/attachments/${attachmentId}`,
      {
        method: "DELETE",
      },
    );
  },
};
