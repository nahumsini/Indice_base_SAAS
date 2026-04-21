import { apiClient } from '../lib/apiClient';
import { endpoints } from './endpoints';

export interface BackendEmployee {
  id: number;
  employee_number?: string;
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
  pay_period: 'weekly' | 'biweekly' | 'monthly';
  salary_type: 'daily' | 'hourly';
  hourly_rate?: number | null;
  contract_type: 'permanent' | 'temporary';
  contract_start_date?: string | null;
  contract_end_date?: string | null;
  termination_date?: string | null;
  last_working_day?: string | null;
  termination_reason_type?: string;
  termination_reason_code?: string;
  termination_summary?: string;
  status: 'active' | 'inactive' | 'terminated';
}

export interface BackendEmployeeProfile {
  date_of_birth?: string | null;
  address?: string;
  national_id?: string;
  tax_id?: string;
  social_security_number?: string;
  registration_country?: string;
  state_province?: string;
  alternate_phone?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  workday_hours?: number | null;
}

export interface BackendEmployeePortalAccess {
  access_role: 'employee' | 'coordinator' | 'manager' | 'administrator';
  linked_user_id?: number | null;
  linked_user_name?: string;
  linked_user_email?: string;
  invitation_id?: number | null;
  invitation_status: 'not_invited' | 'pending' | 'linked';
  last_invited_at?: string | null;
}

export interface BackendEmployeeDocument {
  id: number;
  document_type: 'birth_certificate' | 'government_id' | 'proof_of_address' | 'resume' | 'profile_photo';
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  object_key: string;
  status: string;
  download_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EmployeeDetailsResponse {
  employee_id: number;
  employee: BackendEmployee;
  profile: BackendEmployeeProfile;
  access: BackendEmployeePortalAccess;
  documents: BackendEmployeeDocument[];
}

export interface EmployeeDocumentPresignPayload {
  document_type: BackendEmployeeDocument['document_type'];
  file_name: string;
  content_type: string;
  size_bytes: number;
}

export interface EmployeeDocumentPresignResponse {
  document_type: BackendEmployeeDocument['document_type'];
  object_key: string;
  upload_url: string;
  expires_at: string;
  upload_headers: Record<string, string>;
}

export interface RegisterEmployeeDocumentPayload {
  document_type: BackendEmployeeDocument['document_type'];
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  object_key: string;
}

export interface BackendRecordWitness {
  id: number;
  employee_id?: number | null;
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
  activity_type: 'created' | 'updated' | 'status_changed' | 'attachment_added' | 'attachment_removed' | 'deleted';
  from_status?: 'pending' | 'reviewed' | 'resolved' | null;
  to_status?: 'pending' | 'reviewed' | 'resolved' | null;
  note?: string;
  actor_user_id: number;
  actor_name: string;
  created_at?: string | null;
}

export interface BackendRecordItem {
  id: number;
  record_number?: string;
  employee: {
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
  type: 'incident' | 'warning' | 'recognition' | 'observation' | 'training';
  severity?: 'low' | 'medium' | 'high' | null;
  status: 'pending' | 'reviewed' | 'resolved';
  title: string;
  description: string;
  actions_taken?: string;
  event_date: string;
  reported_by: {
    user_id?: number | null;
    employee_id?: number | null;
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
  employee_id: number;
  record_type: BackendRecordItem['type'];
  severity?: NonNullable<BackendRecordItem['severity']>;
  title: string;
  description: string;
  actions_taken?: string;
  event_date: string;
  witnesses?: Array<string | { employee_id?: number | null; name: string }>;
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

export interface EmployeesListResponse {
  items: BackendEmployee[];
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
    | 'resignation'
    | 'termination_for_cause'
    | 'contract_end'
    | 'mutual_agreement'
    | 'other';
  specific_reason?: string;
  summary: string;
}

export interface AttendanceLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
}

export interface AttendanceDashboardItem {
  employee_id: number;
  employee_number?: string;
  employee_name: string;
  position_title?: string;
  department?: string;
  unit_id?: number | null;
  unit_name?: string;
  business_id?: number | null;
  business_name?: string;
  status: 'on_time' | 'late' | 'leave' | 'rest' | 'absence';
  system_status: 'on_time' | 'late' | 'leave' | 'rest' | 'absence';
  corrected_status?: 'on_time' | 'late' | 'leave' | 'rest' | 'absence' | null;
  first_check_in_at?: string | null;
  last_check_out_at?: string | null;
  minutes_late: number;
  first_location?: AttendanceLocation | null;
  last_location?: AttendanceLocation | null;
  first_photo_url?: string | null;
  last_photo_url?: string | null;
}

export interface AttendanceEmployeeOption {
  id: number;
  employee_number?: string;
  full_name: string;
  position_title?: string;
  department?: string;
  unit_id?: number | null;
  unit_name?: string;
  status: 'active' | 'inactive' | 'terminated';
}

export interface AttendanceDashboardResponse {
  date: string;
  summary: {
    total_employees: number;
    on_time_count: number;
    late_count: number;
    leave_count: number;
    rest_count: number;
    absence_count: number;
    locations_count: number;
    kiosk_enabled: boolean;
  };
  items: AttendanceDashboardItem[];
  employees: AttendanceEmployeeOption[];
  locations: AttendanceLocation[];
}

export interface AttendanceCalendarDay {
  date: string;
  day: number;
  effective_status: 'on_time' | 'late' | 'leave' | 'rest' | 'absence';
  system_status: 'on_time' | 'late' | 'leave' | 'rest' | 'absence';
  corrected_status?: 'on_time' | 'late' | 'leave' | 'rest' | 'absence' | null;
  entry_registered: boolean;
  exit_registered: boolean;
  first_check_in_at?: string | null;
  last_check_out_at?: string | null;
  minutes_late: number;
  first_location?: AttendanceLocation | null;
  last_location?: AttendanceLocation | null;
  first_photo_url?: string | null;
  last_photo_url?: string | null;
  notes?: string | null;
}

export interface AttendanceCalendarResponse {
  employee: {
    id: number;
    full_name: string;
    position_title?: string;
    department?: string;
  };
  month: string;
  items: AttendanceCalendarDay[];
}

export interface AttendanceControlRule {
  template_id: number;
  schedule_mode?: 'strict' | 'open';
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
}

export interface AttendanceControlLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  status?: string;
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
  schedule_mode?: 'strict' | 'open';
  block_after_grace_period?: boolean;
  enforce_location?: boolean;
  location_id?: number | null;
  location_name?: string | null;
  employees_assigned_count: number;
  days: AttendanceControlTemplateDay[];
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
  status: 'active' | 'inactive';
  public_access_token?: string;
  metadata?: Record<string, unknown>;
}

export interface AttendanceAccessMethod {
  id: number;
  company_id: number;
  access_profile_id: number;
  employee_id: number;
  employee_number?: string;
  employee_name: string;
  method_type: 'pin' | 'badge' | 'password' | 'manual_override' | 'facial_recognition';
  credential_ref?: string | null;
  status: 'active' | 'inactive';
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface AttendanceAccessProfile {
  id: number;
  company_id: number;
  employee_id: number;
  employee_number?: string;
  employee_name: string;
  status: 'active' | 'inactive';
  default_method: AttendanceAccessMethod['method_type'];
  last_enrolled_at?: string | null;
  metadata?: Record<string, unknown>;
  face_enrollment?: {
    id: number;
    status: 'pending' | 'active' | 'failed' | 'deleted' | 'replaced' | 'superseded';
    enrolled_at?: string | null;
    required_steps?: string[];
  } | null;
  methods: AttendanceAccessMethod[];
}

export interface AttendanceControlAssignment {
  employee_id: number;
  employee_number?: string;
  employee_name: string;
  position_title?: string;
  department?: string;
  employee_status: string;
  unit_id?: number | null;
  unit_name?: string;
  business_id?: number | null;
  business_name?: string;
  schedule_template_id?: number | null;
  schedule_template_name?: string | null;
  effective_start_date?: string | null;
  effective_end_date?: string | null;
  today_rule?: AttendanceControlRule | null;
  today_status: 'on_time' | 'late' | 'leave' | 'rest' | 'absence';
  system_status: 'on_time' | 'late' | 'leave' | 'rest' | 'absence';
  corrected_status?: 'on_time' | 'late' | 'leave' | 'rest' | 'absence' | null;
  first_check_in_at?: string | null;
  last_check_out_at?: string | null;
  minutes_late: number;
  access_profile?: AttendanceAccessProfile | null;
  latest_event?: AttendanceControlRecentEvent | null;
}

export interface AttendanceControlRecentEvent {
  id: number;
  employee_id: number;
  employee_number?: string;
  employee_name: string;
  kiosk_device_id?: number | null;
  kiosk_device_name?: string;
  location_id?: number | null;
  location_name?: string;
  event_type: string;
  event_kind: string;
  auth_method: AttendanceAccessMethod['method_type'] | '';
  result_status: 'success' | 'failure' | 'rejected' | 'overridden' | '';
  event_timestamp?: string | null;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface AttendanceControlOverviewResponse {
  date: string;
  summary: {
    employees_count: number;
    locations_count: number;
    templates_count: number;
    assigned_employees_count: number;
    unassigned_employees_count: number;
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

export interface AttendanceControlLocationsResponse {
  items: AttendanceControlLocation[];
}

export interface AttendanceControlLocationPayload {
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  status: 'active' | 'inactive';
}

export interface AttendanceControlTemplatePayload {
  name: string;
  status: 'active' | 'inactive';
  schedule_mode?: 'strict' | 'open';
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
  employee_ids: number[];
  template_id: number;
  effective_start_date: string;
  effective_end_date?: string;
}

export interface AttendanceControlAssignmentResult {
  employee_id: number;
  employee_name: string;
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
  status: 'active' | 'inactive';
  metadata?: Record<string, unknown>;
}

export interface AttendanceAccessProfilesResponse {
  items: AttendanceAccessProfile[];
}

export interface AttendanceAccessProfilePayload {
  employee_id: number;
  status: 'active' | 'inactive';
  default_method: AttendanceAccessMethod['method_type'];
  last_enrolled_at?: string;
  metadata?: Record<string, unknown>;
}

export interface AttendanceAccessMethodsResponse {
  items: AttendanceAccessMethod[];
}

export interface AttendanceAccessMethodPayload {
  access_profile_id: number;
  method_type: AttendanceAccessMethod['method_type'];
  credential_ref?: string | null;
  secret?: string;
  status: 'active' | 'inactive';
  priority?: number;
  metadata?: Record<string, unknown>;
}

export interface PayrollPreferences {
  grouping_mode: 'single' | 'unit' | 'business';
  default_daily_hours: number;
  pay_leave_days: boolean;
  isr_rate: number;
  imss_employee_rate: number;
  infonavit_employee_rate: number;
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
  grouping_mode: 'single' | 'unit' | 'business';
  grouping_key?: string | null;
  grouping_label?: string | null;
  pay_period: 'weekly' | 'biweekly' | 'monthly';
  period_start_date: string;
  period_end_date: string;
  status: 'draft' | 'processed' | 'approved' | 'paid' | 'cancelled';
  employees_count: number;
  gross_amount: number;
  deductions_amount: number;
  employer_contributions_amount: number;
  net_amount: number;
  created_at?: string | null;
  reused?: boolean;
}

export interface PayrollRunListResponse {
  items: PayrollRunSummary[];
}

export interface PayrollCreateRunsPayload {
  pay_period: 'weekly' | 'biweekly' | 'monthly';
  grouping_mode: 'single' | 'unit' | 'business';
  period_start_date: string;
  period_end_date: string;
}

export interface PayrollLineItem {
  id: number;
  code: string;
  category: 'earning' | 'deduction' | 'employer_contribution';
  label: string;
  amount: number;
  source_type: 'computed' | 'manual' | 'computed_tax';
}

export interface PayrollRunLine {
  id: number;
  employee_id: number;
  employee_number?: string;
  employee_name: string;
  position_title?: string;
  department?: string;
  unit_id?: number | null;
  unit_name?: string;
  business_id?: number | null;
  business_name?: string;
  pay_period: 'weekly' | 'biweekly' | 'monthly';
  salary_type: 'daily' | 'hourly';
  base_salary_amount: number;
  hourly_rate_amount?: number | null;
  days_payable: number;
  leave_days: number;
  absence_days: number;
  rest_days: number;
  late_count: number;
  regular_hours: number;
  overtime_hours: number;
  include_in_fiscal: boolean;
  gross_amount: number;
  deductions_amount: number;
  employer_contributions_amount: number;
  net_amount: number;
  notes?: string;
  items: PayrollLineItem[];
}

export interface PayrollRunDetailResponse {
  run: PayrollRunSummary;
  lines: PayrollRunLine[];
}

export interface PayrollManualItemPayload {
  category: 'earning' | 'deduction';
  label: string;
  amount: number;
}

export interface PayrollUpdateLinePayload {
  include_in_fiscal: boolean;
  notes?: string;
  manual_items: PayrollManualItemPayload[];
}

export interface AttendanceKioskEventPayload {
  employee_id?: number;
  event_type?: 'check_in' | 'check_out' | 'break_out' | 'break_in';
  event_kind?: 'auth_attempt' | 'check_in' | 'break_out' | 'break_in' | 'check_out' | 'manual_override' | 'correction';
  location_id?: number;
  kiosk_device_id?: number;
  latitude?: number;
  longitude?: number;
  auth_method?: AttendanceAccessMethod['method_type'];
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
  location: AttendanceLocation;
  auth_methods: Array<'pin' | 'badge'>;
  inactivity_timeout_seconds: number;
}

export interface PublicKioskIdentifyRequest {
  auth_method: 'pin' | 'badge';
  credential_payload: string;
}

export interface PublicKioskIdentifyResponse {
  auth_attempt_event_id: number;
  auth_method: 'pin' | 'badge';
  employee: {
    id: number;
    employee_number?: string;
    full_name: string;
    position_title?: string;
    department?: string;
  };
  identification_token: string;
  expires_at: string;
}

export interface PublicKioskPunchRequest {
  identification_token: string;
  event_type: 'check_in' | 'check_out';
  event_timestamp?: string;
}

export interface PublicKioskPunchResponse {
  event_id: number;
  employee_id: number;
  event_kind: 'check_in' | 'check_out';
  auth_method: 'pin' | 'badge';
  result_status: 'success';
  status: 'on_time' | 'late' | 'leave' | 'rest' | 'absence';
  first_check_in_at?: string | null;
  last_check_out_at?: string | null;
  location: AttendanceLocation;
}

export interface AttendanceMediaPresignRequest {
  employee_id?: number;
  content_type: string;
  event_type?: 'check_in' | 'check_out' | 'break_out' | 'break_in';
  event_timestamp?: string;
}

export interface AttendanceMediaPresignResponse {
  object_key: string;
  upload_url: string;
  expires_at: string;
  upload_headers?: Record<string, string>;
}

export interface AttendanceCorrectionPayload {
  status: 'on_time' | 'late' | 'leave' | 'rest' | 'absence' | '';
  notes?: string;
}

export interface AttendanceDailyRecordUpdateResponse {
  employee_id: number;
  date: string;
  system_status: 'on_time' | 'late' | 'leave' | 'rest' | 'absence';
  corrected_status?: 'on_time' | 'late' | 'leave' | 'rest' | 'absence' | null;
  effective_status: 'on_time' | 'late' | 'leave' | 'rest' | 'absence';
  notes?: string | null;
}

export interface FaceEnrollmentSessionResponse {
  id: number;
  employee_id: number;
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
    employee_id: number;
    status: string;
    enrolled_at?: string | null;
    required_steps?: string[];
  } | null;
}

export interface FaceVerificationSessionResponse {
  session_id: number;
  employee_id: number;
  required_steps: string[];
  expires_at: string;
  status: string;
}

export interface FaceVerificationResultResponse {
  session_id: number;
  employee_id: number;
  status: string;
  matched: boolean;
  liveness_passed: boolean;
  match_score?: number | null;
  failure_reason?: string | null;
}

export interface AnnouncementListItem {
  id: number;
  title: string;
  type: 'general' | 'urgent' | 'reminder' | 'celebration';
  audience_type: 'all' | 'units' | 'departments' | 'employees';
  audience_summary: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduled_for?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  author_name: string;
  content: string;
}

export interface AnnouncementsListResponse {
  items: AnnouncementListItem[];
  summary: {
    total_count: number;
    published_count: number;
    scheduled_count: number;
    draft_count: number;
  };
}

export interface CreateAnnouncementPayload {
  title: string;
  type: 'general' | 'urgent' | 'reminder' | 'celebration';
  content: string;
  audience_type: 'all' | 'units' | 'departments' | 'employees';
  status: 'draft' | 'scheduled' | 'published';
  scheduled_for?: string;
  unit_ids?: string[];
  department_names?: string[];
  employee_ids?: number[];
}

const toQueryString = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });

  const queryString = search.toString();
  return queryString ? `?${queryString}` : '';
};

export const humanResourcesApi = {
  listEmployees() {
    return apiClient<EmployeesListResponse>(endpoints.humanResources.employeesList);
  },

  getEmployeeDetails(id: string | number) {
    return apiClient<EmployeeDetailsResponse>(`${endpoints.humanResources.employeeDetails}/${id}`);
  },

  createEmployee(payload: Record<string, unknown>) {
    return apiClient<BackendEmployee>(endpoints.humanResources.employeeCreate, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateEmployee(id: string | number, payload: Record<string, unknown>) {
    return apiClient<BackendEmployee>(`${endpoints.humanResources.employeeUpdate}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteEmployee(id: string | number) {
    return apiClient<{ success: boolean }>(`${endpoints.humanResources.employeeDelete}/${id}`, {
      method: 'DELETE',
    });
  },

  terminateEmployee(id: string | number, payload: TerminationPayload) {
    return apiClient<BackendEmployee>(`${endpoints.humanResources.employeeTerminate}/${id}/terminate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  presignEmployeeDocumentUpload(
    employeeId: string | number,
    payload: EmployeeDocumentPresignPayload,
  ) {
    return apiClient<EmployeeDocumentPresignResponse>(
      `${endpoints.humanResources.employeeDocuments}/${employeeId}/documents/presign-upload`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  async uploadEmployeeDocument(
    uploadUrl: string,
    file: Blob,
    contentType: string,
    uploadHeaders: Record<string, string> = {},
  ) {
    const headers = new Headers(uploadHeaders);

    if (contentType && !headers.has('Content-Type')) {
      headers.set('Content-Type', contentType);
    }

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error('Employee document upload failed.');
    }
  },

  registerEmployeeDocument(
    employeeId: string | number,
    payload: RegisterEmployeeDocumentPayload,
  ) {
    return apiClient<BackendEmployeeDocument>(
      `${endpoints.humanResources.employeeDocuments}/${employeeId}/documents`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  deleteEmployeeDocument(employeeId: string | number, documentId: string | number) {
    return apiClient<{ success: boolean }>(
      `${endpoints.humanResources.employeeDocuments}/${employeeId}/documents/${documentId}`,
      {
        method: 'DELETE',
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
    return apiClient<AttendanceControlLocationsResponse>(endpoints.humanResources.attendanceLocations);
  },

  createAttendanceControlLocation(payload: AttendanceControlLocationPayload) {
    return apiClient<{ location: AttendanceControlLocation }>(endpoints.humanResources.attendanceLocations, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAttendanceControlLocation(locationId: string | number, payload: AttendanceControlLocationPayload) {
    return apiClient<{ location: AttendanceControlLocation }>(`${endpoints.humanResources.attendanceLocations}/${locationId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteAttendanceControlLocation(locationId: string | number) {
    return apiClient<{ success: boolean }>(`${endpoints.humanResources.attendanceLocations}/${locationId}`, {
      method: 'DELETE',
    });
  },

  listAttendanceControlTemplates() {
    return apiClient<AttendanceControlTemplatesResponse>(endpoints.humanResources.attendanceScheduleTemplates);
  },

  createAttendanceControlTemplate(payload: AttendanceControlTemplatePayload) {
    return apiClient<{ template: AttendanceControlTemplate }>(endpoints.humanResources.attendanceScheduleTemplates, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAttendanceControlTemplate(templateId: string | number, payload: AttendanceControlTemplatePayload) {
    return apiClient<{ template: AttendanceControlTemplate }>(`${endpoints.humanResources.attendanceScheduleTemplates}/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  bulkAssignAttendanceSchedule(payload: AttendanceControlAssignmentPayload) {
    return apiClient<AttendanceControlBulkAssignmentResponse>(endpoints.humanResources.attendanceScheduleAssignmentsBulk, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listAttendanceKioskDevices() {
    return apiClient<AttendanceKioskDevicesResponse>(endpoints.humanResources.attendanceKioskDevices);
  },

  createAttendanceKioskDevice(payload: AttendanceKioskDevicePayload) {
    return apiClient<{ kiosk_device: AttendanceKioskDevice }>(endpoints.humanResources.attendanceKioskDevices, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAttendanceKioskDevice(kioskDeviceId: string | number, payload: AttendanceKioskDevicePayload) {
    return apiClient<{ kiosk_device: AttendanceKioskDevice }>(`${endpoints.humanResources.attendanceKioskDevices}/${kioskDeviceId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  rotateAttendanceKioskDevicePublicToken(kioskDeviceId: string | number) {
    return apiClient<AttendanceKioskDeviceRotateTokenResponse>(
      `${endpoints.humanResources.attendanceKioskDeviceRotateToken}/${kioskDeviceId}/rotate-public-access-token`,
      {
        method: 'POST',
      },
    );
  },

  listAttendanceAccessProfiles() {
    return apiClient<AttendanceAccessProfilesResponse>(endpoints.humanResources.attendanceAccessProfiles);
  },

  createAttendanceAccessProfile(payload: AttendanceAccessProfilePayload) {
    return apiClient<{ access_profile: AttendanceAccessProfile }>(endpoints.humanResources.attendanceAccessProfiles, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAttendanceAccessProfile(profileId: string | number, payload: AttendanceAccessProfilePayload) {
    return apiClient<{ access_profile: AttendanceAccessProfile }>(`${endpoints.humanResources.attendanceAccessProfiles}/${profileId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  listAttendanceAccessMethods() {
    return apiClient<AttendanceAccessMethodsResponse>(endpoints.humanResources.attendanceAccessMethods);
  },

  createAttendanceAccessMethod(payload: AttendanceAccessMethodPayload) {
    return apiClient<{ access_method: AttendanceAccessMethod; access_profile: AttendanceAccessProfile }>(endpoints.humanResources.attendanceAccessMethods, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateAttendanceAccessMethod(methodId: string | number, payload: AttendanceAccessMethodPayload) {
    return apiClient<{ access_method: AttendanceAccessMethod; access_profile: AttendanceAccessProfile }>(`${endpoints.humanResources.attendanceAccessMethods}/${methodId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getAttendanceCalendar(employeeId: string | number, month: string) {
    return apiClient<AttendanceCalendarResponse>(
      `${endpoints.humanResources.attendanceCalendar}/${employeeId}/calendar${toQueryString({ month })}`,
    );
  },

  getMyAttendanceCalendar(month: string) {
    return apiClient<AttendanceCalendarResponse>(
      `${endpoints.humanResources.attendanceSelfCalendar}${toQueryString({ month })}`,
    );
  },

  presignAttendancePhotoUpload(payload: AttendanceMediaPresignRequest) {
    return apiClient<AttendanceMediaPresignResponse>(endpoints.humanResources.attendanceMediaPresignUpload, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  presignMyAttendancePhotoUpload(payload: Omit<AttendanceMediaPresignRequest, 'employee_id'>) {
    return apiClient<AttendanceMediaPresignResponse>(endpoints.humanResources.attendanceSelfMediaPresignUpload, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async uploadAttendancePhoto(
    uploadUrl: string,
    file: Blob,
    contentType: string,
    uploadHeaders: Record<string, string> = {},
  ) {
    const headers = new Headers(uploadHeaders);

    if (contentType && !headers.has('Content-Type')) {
      headers.set('Content-Type', contentType);
    }

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error('Attendance photo upload failed.');
    }
  },

  recordAttendanceKioskEvent(payload: AttendanceKioskEventPayload) {
    return apiClient<{ status: string }>(endpoints.humanResources.attendanceKioskEvents, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  recordMyAttendanceKioskEvent(payload: Omit<AttendanceKioskEventPayload, 'employee_id'>) {
    return apiClient<{ status: string }>(endpoints.humanResources.attendanceSelfKioskEvents, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getPublicKioskBootstrap(deviceToken: string) {
    return apiClient<PublicKioskBootstrapResponse>(`${endpoints.humanResources.attendancePublicKiosk}/${deviceToken}/bootstrap`);
  },

  identifyPublicKioskEmployee(deviceToken: string, payload: PublicKioskIdentifyRequest) {
    return apiClient<PublicKioskIdentifyResponse>(`${endpoints.humanResources.attendancePublicKiosk}/${deviceToken}/identify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  punchPublicKiosk(deviceToken: string, payload: PublicKioskPunchRequest) {
    return apiClient<PublicKioskPunchResponse>(`${endpoints.humanResources.attendancePublicKiosk}/${deviceToken}/punch`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  createFaceEnrollmentSession(employeeId: number) {
    return apiClient<FaceEnrollmentSessionResponse>(endpoints.humanResources.faceEnrollmentSessions, {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId }),
    });
  },

  presignFaceEnrollmentCapture(enrollmentId: number, step: string, contentType: string) {
    return apiClient<FaceCapturePresignResponse>(`${endpoints.humanResources.faceEnrollmentSessions}/${enrollmentId}/captures/presign-upload`, {
      method: 'POST',
      body: JSON.stringify({ step, content_type: contentType }),
    });
  },

  completeFaceEnrollmentSession(enrollmentId: number) {
    return apiClient<FaceEnrollmentStatusResponse>(`${endpoints.humanResources.faceEnrollmentSessions}/${enrollmentId}/complete`, {
      method: 'POST',
    });
  },

  getFaceEnrollment(employeeId: number) {
    return apiClient<FaceEnrollmentStatusResponse>(`${endpoints.humanResources.faceEnrollments}/${employeeId}`);
  },

  deleteFaceEnrollment(employeeId: number) {
    return apiClient<{ success: boolean }>(`${endpoints.humanResources.faceEnrollments}/${employeeId}`, {
      method: 'DELETE',
    });
  },

  createFaceVerificationSession(employeeId: number) {
    return apiClient<FaceVerificationSessionResponse>(endpoints.humanResources.attendanceFaceVerificationSessions, {
      method: 'POST',
      body: JSON.stringify({ employee_id: employeeId }),
    });
  },

  createMyFaceVerificationSession() {
    return apiClient<FaceVerificationSessionResponse>(endpoints.humanResources.attendanceSelfFaceVerificationSessions, {
      method: 'POST',
    });
  },

  presignFaceVerificationCapture(sessionId: number, step: string, contentType: string) {
    return apiClient<FaceCapturePresignResponse>(`${endpoints.humanResources.attendanceFaceVerificationSessions}/${sessionId}/captures/presign-upload`, {
      method: 'POST',
      body: JSON.stringify({ step, content_type: contentType }),
    });
  },

  completeFaceVerificationSession(sessionId: number) {
    return apiClient<FaceVerificationResultResponse>(`${endpoints.humanResources.attendanceFaceVerificationSessions}/${sessionId}/complete`, {
      method: 'POST',
    });
  },

  updateAttendanceDailyRecord(employeeId: string | number, date: string, payload: AttendanceCorrectionPayload) {
    return apiClient<AttendanceDailyRecordUpdateResponse>(
      `${endpoints.humanResources.attendanceDailyRecords}/${employeeId}/${date}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  },

  updateMyAttendanceDailyRecord(date: string, payload: AttendanceCorrectionPayload) {
    return apiClient<AttendanceDailyRecordUpdateResponse>(
      `${endpoints.humanResources.attendanceSelfDailyRecords}/${date}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
  },

  getPayrollOverview() {
    return apiClient<PayrollOverviewResponse>(endpoints.humanResources.payrollOverview);
  },

  getPayrollPreferences() {
    return apiClient<PayrollPreferences>(endpoints.humanResources.payrollPreferences);
  },

  updatePayrollPreferences(payload: PayrollPreferences) {
    return apiClient<PayrollPreferences>(endpoints.humanResources.payrollPreferences, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  listPayrollRuns(filters: Record<string, string | number | undefined> = {}) {
    return apiClient<PayrollRunListResponse>(
      `${endpoints.humanResources.payrollRuns}${toQueryString(filters)}`,
    );
  },

  createPayrollRuns(payload: PayrollCreateRunsPayload) {
    return apiClient<PayrollRunListResponse>(endpoints.humanResources.payrollRuns, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getPayrollRun(runId: string | number) {
    return apiClient<PayrollRunDetailResponse>(`${endpoints.humanResources.payrollRuns}/${runId}`);
  },

  updatePayrollRunLine(runId: string | number, lineId: string | number, payload: PayrollUpdateLinePayload) {
    return apiClient<PayrollRunDetailResponse>(`${endpoints.humanResources.payrollRuns}/${runId}/lines/${lineId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  processPayrollRun(runId: string | number) {
    return apiClient<{ run: PayrollRunSummary }>(`${endpoints.humanResources.payrollRuns}/${runId}/process`, {
      method: 'POST',
    });
  },

  approvePayrollRun(runId: string | number) {
    return apiClient<{ run: PayrollRunSummary }>(`${endpoints.humanResources.payrollRuns}/${runId}/approve`, {
      method: 'POST',
    });
  },

  markPayrollRunPaid(runId: string | number) {
    return apiClient<{ run: PayrollRunSummary }>(`${endpoints.humanResources.payrollRuns}/${runId}/mark-paid`, {
      method: 'POST',
    });
  },

  cancelPayrollRun(runId: string | number) {
    return apiClient<{ run: PayrollRunSummary }>(`${endpoints.humanResources.payrollRuns}/${runId}/cancel`, {
      method: 'POST',
    });
  },

  listAnnouncements() {
    return apiClient<AnnouncementsListResponse>(endpoints.humanResources.announcementsList);
  },

  createAnnouncement(payload: CreateAnnouncementPayload) {
    return apiClient<AnnouncementListItem>(endpoints.humanResources.announcementsCreate, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  listRecords(filters: Record<string, string | number | undefined> = {}) {
    return apiClient<RecordsListResponse>(
      `${endpoints.humanResources.recordsList}${toQueryString(filters)}`,
    );
  },

  getRecordDetails(recordId: string | number) {
    return apiClient<RecordDetailsResponse>(`${endpoints.humanResources.recordDetails}/${recordId}`);
  },

  createRecord(payload: CreateRecordPayload) {
    return apiClient<BackendRecordItem>(endpoints.humanResources.recordsCreate, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateRecord(recordId: string | number, payload: CreateRecordPayload & { status?: BackendRecordItem['status'] }) {
    return apiClient<BackendRecordItem>(`${endpoints.humanResources.recordUpdate}/${recordId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteRecord(recordId: string | number) {
    return apiClient<{ success: boolean }>(`${endpoints.humanResources.recordDelete}/${recordId}`, {
      method: 'DELETE',
    });
  },

  presignRecordAttachmentUpload(recordId: string | number, payload: RecordAttachmentPresignPayload) {
    return apiClient<RecordAttachmentPresignResponse>(
      `${endpoints.humanResources.recordAttachments}/${recordId}/attachments/presign-upload`,
      {
        method: 'POST',
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

    if (contentType && !headers.has('Content-Type')) {
      headers.set('Content-Type', contentType);
    }

    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers,
      body: file,
    });

    if (!response.ok) {
      throw new Error('Record attachment upload failed.');
    }
  },

  registerRecordAttachment(recordId: string | number, payload: RegisterRecordAttachmentPayload) {
    return apiClient<BackendRecordAttachment>(`${endpoints.humanResources.recordAttachments}/${recordId}/attachments`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteRecordAttachment(recordId: string | number, attachmentId: string | number) {
    return apiClient<{ success: boolean }>(
      `${endpoints.humanResources.recordAttachments}/${recordId}/attachments/${attachmentId}`,
      {
        method: 'DELETE',
      },
    );
  },
};
