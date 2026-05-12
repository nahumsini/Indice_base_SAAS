package com.indice.erp.hr;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.face.HrFaceService;
import com.indice.erp.hr.attendance.HrAttendanceService;
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
import com.indice.erp.hr.attendance.schedule.AttendanceScheduleCandidateMapper;
import com.indice.erp.hr.attendance.schedule.AttendanceScheduleCandidateRepository;
import com.indice.erp.hr.attendance.schedule.AttendanceScheduleCandidateService;
import com.indice.erp.hr.attendance.schedule.AttendanceScheduleStateRepository;
import com.indice.erp.hr.attendance.schedule.AttendanceScheduleWorkSiteRepository;
import com.indice.erp.hr.attendance.users.AttendanceUserLookupService;
import com.indice.erp.location.GoogleMapsCoordinateExtractor;
import com.indice.erp.storage.DisabledObjectStorageService;
import com.indice.erp.storage.ObjectStorageProperties;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;


@ExtendWith(MockitoExtension.class)
class HrAttendanceServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void updateDailyRecordRejectsDatesBeforeHrUserHireDate() {
        var service = createService();

        when(jdbcTemplate.query(anyString(), org.mockito.ArgumentMatchers.<RowMapper<Object>>any(), eq(1L), eq(12L)))
            .thenAnswer(invocation -> {
                @SuppressWarnings("unchecked")
                var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
                return List.of(rowMapper.mapRow(attendanceHrUserResultSet(LocalDate.of(2026, 4, 29)), 0));
            });

        var error = assertThrows(
            IllegalArgumentException.class,
            () -> service.updateDailyRecord(1L, 9L, 12L, LocalDate.of(2026, 4, 28), Map.of("status", "absence"))
        );

        assertEquals("Attendance can only be edited on or after this user's hire date: 2026-04-29.", error.getMessage());
    }

    private HrAttendanceService createService() {
        var objectMapper = new ObjectMapper();
        var attendancePhotoService = new AttendancePhotoService(new DisabledObjectStorageService(), new ObjectStorageProperties());
        var attendanceAssignmentService = new AttendanceAssignmentService(jdbcTemplate);
        var attendanceUserLookupService = new AttendanceUserLookupService(jdbcTemplate, attendancePhotoService);
        var attendanceDailyRecordRepository = new AttendanceDailyRecordRepository(jdbcTemplate);
        var attendanceKioskDeviceRepository = new AttendanceKioskDeviceRepository(jdbcTemplate);
        var attendanceKioskPinThrottleService = new AttendanceKioskPinThrottleService(jdbcTemplate, objectMapper);
        var attendanceScheduleCandidateService = new AttendanceScheduleCandidateService(
            attendanceAssignmentService,
            attendanceDailyRecordRepository,
            new AttendanceScheduleCandidateRepository(jdbcTemplate, attendanceUserLookupService),
            new AttendanceScheduleStateRepository(jdbcTemplate),
            new AttendanceScheduleWorkSiteRepository(jdbcTemplate),
            new AttendanceScheduleCandidateMapper()
        );
        return new HrAttendanceService(
            jdbcTemplate,
            attendanceAssignmentService,
            new AttendanceKioskTokenService(objectMapper, "test-kiosk-secret", 120),
            attendanceKioskPinThrottleService,
            attendanceKioskDeviceRepository,
            mock(AttendanceKioskDeviceService.class),
            mock(AttendanceKioskDeviceMapper.class),
            mock(AttendanceLocationRepository.class),
            mock(AttendanceAllowedLocationRepository.class),
            mock(AttendanceWorkSiteAssignmentRepository.class),
            mock(AttendanceAccessService.class),
            attendanceUserLookupService,
            attendanceDailyRecordRepository,
            attendanceScheduleCandidateService,
            attendancePhotoService,
            objectMapper,
            mock(HrFaceService.class),
            mock(GoogleMapsCoordinateExtractor.class),
            false,
            60
        );
    }

    private ResultSet attendanceHrUserResultSet(LocalDate hireDate) throws SQLException {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getLong("id")).thenReturn(12L);
        when(rs.getString("user_code")).thenReturn("EMP-0012");
        when(rs.getString("full_name")).thenReturn("Attendance User");
        when(rs.getString("position")).thenReturn("Staff");
        when(rs.getString("department")).thenReturn("Operations");
        when(rs.getObject("hire_date", LocalDate.class)).thenReturn(hireDate);
        when(rs.getString("status")).thenReturn("active");
        when(rs.getLong("unit_id")).thenReturn(0L);
        when(rs.getString("unit_name")).thenReturn("");
        when(rs.getLong("business_id")).thenReturn(0L);
        when(rs.getString("business_name")).thenReturn("");
        when(rs.wasNull()).thenReturn(true);
        return rs;
    }
}
