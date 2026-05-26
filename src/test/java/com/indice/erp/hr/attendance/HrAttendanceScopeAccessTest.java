package com.indice.erp.hr.attendance;

import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import java.sql.ResultSet;
import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrAttendanceScopeAccessTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrOperationalScopeService hrOperationalScopeService;

    @Test
    void requireLocationInScopeRejectsLocationOutsideScope() throws Exception {
        var service = new HrAttendanceScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(jdbcTemplate.query(
            contains("FROM attendance_locations"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(1L),
            eq(15L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("unit_id")).thenReturn(4L);
            when(rs.getLong("business_id")).thenReturn(10L);
            when(rs.wasNull()).thenReturn(false, false);
            return List.of(rowMapper.mapRow(rs, 0));
        });
        doThrow(new HrAccessDeniedException("Forbidden"))
            .when(hrOperationalScopeService)
            .requireAssignmentInScope(1L, scope, 4L, 10L);

        assertThrows(
            HrAccessDeniedException.class,
            () -> service.requireLocationInScope(1L, scope, 15L)
        );
    }

    @Test
    void requireKioskDeviceInScopeReturnsNotFoundWhenMissing() {
        var service = new HrAttendanceScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(jdbcTemplate.query(
            contains("FROM attendance_kiosk_devices"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(1L),
            eq(31L)
        )).thenReturn(List.of());

        assertThrows(
            NoSuchElementException.class,
            () -> service.requireKioskDeviceInScope(1L, scope, 31L)
        );
    }

    @Test
    void requireFaceVerificationSessionInScopeDelegatesToUserScopeCheck() {
        var service = new HrAttendanceScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(jdbcTemplate.query(
            contains("FROM user_face_verification_sessions"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(1L),
            eq(44L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("user_company_id")).thenReturn(22L);
            return List.of(rowMapper.mapRow(rs, 0));
        });
        doThrow(new HrAccessDeniedException("Forbidden"))
            .when(hrOperationalScopeService)
            .requireUserInScope(1L, scope, 22L);

        assertThrows(
            HrAccessDeniedException.class,
            () -> service.requireFaceVerificationSessionInScope(1L, scope, 44L)
        );
    }
}
