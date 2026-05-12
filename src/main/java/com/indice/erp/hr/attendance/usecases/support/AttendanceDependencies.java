package com.indice.erp.hr.attendance.usecases.support;

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
import com.indice.erp.hr.attendance.users.AttendanceUserLookupService;
import com.indice.erp.location.GoogleMapsCoordinateExtractor;
import org.springframework.jdbc.core.JdbcTemplate;


public record AttendanceDependencies(
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
    boolean enforceLocationRadius,
    int kioskInactivityTimeoutSeconds
) {
}
