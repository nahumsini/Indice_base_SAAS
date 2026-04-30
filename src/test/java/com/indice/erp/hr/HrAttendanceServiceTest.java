package com.indice.erp.hr;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.face.HrFaceService;
import com.indice.erp.hr.attendance.HrAttendanceService;
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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class HrAttendanceServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void updateDailyRecordRejectsDatesBeforeEmployeeHireDate() {
        var service = createService();

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), eq(1L), eq(12L)))
            .thenAnswer(invocation -> {
                @SuppressWarnings("unchecked")
                var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
                return List.of(rowMapper.mapRow(attendanceEmployeeResultSet(LocalDate.of(2026, 4, 29)), 0));
            });

        var error = assertThrows(
            IllegalArgumentException.class,
            () -> service.updateDailyRecord(1L, 9L, 12L, LocalDate.of(2026, 4, 28), Map.of("status", "absence"))
        );

        assertEquals("Attendance can only be edited on or after this employee's hire date: 2026-04-29.", error.getMessage());
    }

    private HrAttendanceService createService() {
        return new HrAttendanceService(
            jdbcTemplate,
            new DisabledObjectStorageService(),
            new ObjectStorageProperties(),
            new ObjectMapper(),
            new BCryptPasswordEncoder(),
            mock(HrFaceService.class),
            mock(GoogleMapsCoordinateExtractor.class),
            false,
            "test-kiosk-secret",
            120,
            60
        );
    }

    private ResultSet attendanceEmployeeResultSet(LocalDate hireDate) throws SQLException {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getLong("id")).thenReturn(12L);
        when(rs.getString("employee_number")).thenReturn("EMP-0012");
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
