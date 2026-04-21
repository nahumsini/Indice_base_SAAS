import AttendancePage from './AttendancePage';

/**
 * Legacy compatibility wrapper.
 * The routed HR shell should use the backend-connected attendance module.
 */
export default function Attendance() {
  return <AttendancePage />;
}
