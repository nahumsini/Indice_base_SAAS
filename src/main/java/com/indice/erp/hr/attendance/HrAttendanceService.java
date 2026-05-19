package com.indice.erp.hr.attendance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.face.HrFaceService;
import com.indice.erp.hr.attendance.access.AttendanceAccessService;
import com.indice.erp.hr.attendance.application.AttendancePhotoService;
import com.indice.erp.hr.attendance.assignment.AttendanceAssignmentService;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskDeviceMapper;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskDeviceRepository;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskDeviceService;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskPinThrottleService;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskTokenService;
import com.indice.erp.hr.attendance.locations.AttendanceAllowedLocationRepository;
import com.indice.erp.hr.attendance.locations.AttendanceLocationRepository;
import com.indice.erp.hr.attendance.locations.AttendanceWorkSiteAssignmentRepository;
import com.indice.erp.hr.attendance.records.AttendanceDailyRecordRepository;
import com.indice.erp.hr.attendance.schedule.AttendanceScheduleCandidateService;
import com.indice.erp.hr.attendance.usecases.records.HrAttendanceSelfDailyRecordUseCases;
import com.indice.erp.hr.attendance.usecases.support.AttendanceDependencies;
import com.indice.erp.hr.attendance.users.AttendanceUserLookupService;
import com.indice.erp.hr.attendance.util.AttendanceDateParser;
import com.indice.erp.location.GoogleMapsCoordinateExtractor;
import java.time.LocalDate;
import java.time.YearMonth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import static com.indice.erp.hr.shared.HrPayloadUtils.parseDate;


@Service
public class HrAttendanceService extends HrAttendanceSelfDailyRecordUseCases {

    public HrAttendanceService(
        JdbcTemplate jdbcTemplate,
        AttendanceAssignmentService attendanceAssignmentService,
        AttendanceKioskTokenService attendanceKioskTokenService,
        AttendanceKioskPinThrottleService attendanceKioskPinThrottleService,
        AttendanceKioskDeviceRepository attendanceKioskDeviceRepository,
        AttendanceKioskDeviceService attendanceKioskDeviceService,
        AttendanceKioskDeviceMapper attendanceKioskDeviceMapper,
        AttendanceLocationRepository attendanceLocationRepository,
        AttendanceAllowedLocationRepository attendanceAllowedLocationRepository,
        AttendanceWorkSiteAssignmentRepository attendanceWorkSiteAssignmentRepository,
        AttendanceAccessService attendanceAccessService,
        AttendanceUserLookupService attendanceUserLookupService,
        AttendanceDailyRecordRepository attendanceDailyRecordRepository,
        AttendanceScheduleCandidateService attendanceScheduleCandidateService,
        AttendancePhotoService attendancePhotoService,
        ObjectMapper objectMapper,
        HrFaceService hrFaceService,
        GoogleMapsCoordinateExtractor googleMapsCoordinateExtractor,
        @Value("${app.hr.attendance.enforce-location-radius:false}") boolean enforceLocationRadius,
        @Value("${app.hr.kiosk.inactivity-timeout-seconds:60}") int kioskInactivityTimeoutSeconds
    ) {
        super(new AttendanceDependencies(
            jdbcTemplate,
            attendanceAssignmentService,
            attendanceKioskTokenService,
            attendanceKioskPinThrottleService,
            attendanceKioskDeviceRepository,
            attendanceKioskDeviceService,
            attendanceKioskDeviceMapper,
            attendanceLocationRepository,
            attendanceAllowedLocationRepository,
            attendanceWorkSiteAssignmentRepository,
            attendanceAccessService,
            attendanceUserLookupService,
            attendanceDailyRecordRepository,
            attendanceScheduleCandidateService,
            attendancePhotoService,
            objectMapper,
            hrFaceService,
            googleMapsCoordinateExtractor,
            enforceLocationRadius,
            kioskInactivityTimeoutSeconds
        ));
    }

    public static LocalDate parseDate(String value) {
        return AttendanceDateParser.parseDate(value);
    }

    public static YearMonth parseMonth(String value) {
        return AttendanceDateParser.parseMonth(value);
    }

    public void markPermissionLeaveDays(
        long companyId,
        long actorUserId,
        long userCompanyId,
        LocalDate startDate,
        LocalDate endDate
    ) {
        attendanceUserLookupService.loadAttendanceUser(companyId, userCompanyId);
        for (var date = startDate; !date.isAfter(endDate); date = date.plusDays(1)) {
            rebuildDailyRecordProjection(companyId, userCompanyId, date);
            jdbcTemplate.update(
                """
                    UPDATE user_attendance_daily_records
                    SET corrected_status = 'leave',
                        corrected_by = ?,
                        corrected_at = CURRENT_TIMESTAMP,
                        notes = NULL
                    WHERE company_id = ?
                      AND user_company_id = ?
                      AND attendance_date = ?
                    """,
                actorUserId,
                companyId,
                userCompanyId,
                date
            );
        }
    }
}
