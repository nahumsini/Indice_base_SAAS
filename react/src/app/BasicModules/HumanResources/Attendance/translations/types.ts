export type AttendanceLocale =
  | 'es-MX'
  | 'es-CO'
  | 'en-US'
  | 'en-CA'
  | 'fr-CA'
  | 'pt-BR'
  | 'ko-CA'
  | 'zh-CA';

export type AttendanceStatusKey =
  | 'on_time'
  | 'late'
  | 'leave'
  | 'rest'
  | 'absence'
  | 'pending'
  | 'not_scheduled';

export interface AttendanceTranslations {
  title: string;
  subtitle: string;
  viewRecords: string;
  recordsModalSubtitle: string;
  closeRecords: string;
  loading: {
    refreshTitle: string;
    refreshDescription: string;
    registerTitle: string;
    registerDescription: string;
    correctTitle: string;
    correctDescription: string;
  };
  success: {
    checkIn: string;
    checkOut: string;
    correctionApplied: string;
    correctionCleared: string;
  };
  summary: Record<AttendanceStatusKey | 'totalMonitored', string>;
  statuses: Record<AttendanceStatusKey, string>;
  labels: {
    collaborator: string;
    employeeBrowser: string;
    employeeBrowserHint: string;
    employeePicker: string;
    previousEmployee: string;
    nextEmployee: string;
    searchEmployee: string;
    searchPlaceholder: string;
    employeeList: string;
    employeeListHint: string;
    noEmployeesFound: string;
    noEmployeesAvailable: string;
    unassignedUnit: string;
    unassignedPosition: string;
    employeeSummary: string;
    position: string;
    unit: string;
    department: string;
    todayStatus: string;
    latestLocation: string;
    noDepartment: string;
    noEmployeeSelected: string;
    retry: string;
    statusLoggedIn: string;
    statusCheckedOut: string;
    statusReady: string;
  };
  recorder: {
    employee: string;
    noEmployeeSelected: string;
    selectEmployeeHint: string;
    photo: string;
    photoRequired: string;
    takePhoto: string;
    chooseFromGallery: string;
    retakePhoto: string;
    capturedPhotoLabel: string;
    savedPhotoLabel: string;
    photoLockedHint: string;
    photoAlreadyRecordedHint: string;
    photoHint: string;
    location: string;
    unit: string;
    business: string;
    selectUnit: string;
    selectBusiness: string;
    locationRequired: string;
    getLocation: string;
    refreshLocation: string;
    noLocation: string;
    record: string;
    recordHint: string;
    checkIn: string;
    checkOut: string;
    locationReady: string;
    locationUnsupported: string;
    locationDenied: string;
    locationUnavailable: string;
    photoRequiredError: string;
    locationRequiredError: string;
    checkInAlreadyRecorded: string;
    checkOutRequiresCheckIn: string;
    statusActiveTitle: string;
    statusActiveDescription: string;
    statusCheckedOutTitle: string;
    statusCheckedOutDescription: string;
    statusIdleTitle: string;
    statusIdleDescription: string;
    submitHint: string;
    checkoutReadyHint: string;
    cameraUnsupported: string;
    cameraPermissionDenied: string;
    cameraUnavailable: string;
    capturePhoto: string;
    cancelCamera: string;
  };
}
