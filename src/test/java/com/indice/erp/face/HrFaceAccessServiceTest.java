package com.indice.erp.face;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrOperationalScopeService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrFaceAccessServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrAccessService hrAccessService;

    @Mock
    private HrOperationalScopeService hrOperationalScopeService;

    @Test
    void requireEnrollmentTargetInScopeRejectsWhenControlTabIsDenied() {
        var service = new HrFaceAccessService(jdbcTemplate, hrAccessService, hrOperationalScopeService);
        var currentUser = new AuthSessionUser(7L, 1L, "Scoped User", "user");
        when(hrAccessService.canAccessManagementTab(any(), eq(HrAccessService.HrTab.CONTROL))).thenReturn(false);

        assertThrows(
            HrAccessDeniedException.class,
            () -> service.requireEnrollmentTargetInScope(currentUser, 22L)
        );
    }

    @Test
    void requireEnrollmentSessionInScopeRejectsWhenTargetUserIsOutsideScope() throws Exception {
        var service = new HrFaceAccessService(jdbcTemplate, hrAccessService, hrOperationalScopeService);
        var currentUser = new AuthSessionUser(7L, 1L, "Scoped User", "admin");
        when(hrAccessService.canAccessManagementTab(currentUser, HrAccessService.HrTab.CONTROL)).thenReturn(true);

        when(jdbcTemplate.query(
            contains("FROM user_face_enrollments"),
            ArgumentMatchers.<RowMapper<Long>>any(),
            eq(1L),
            eq(44L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Long>) invocation.getArgument(1);
            var rs = mock(java.sql.ResultSet.class);
            when(rs.getLong("user_company_id")).thenReturn(22L);
            return List.of(rowMapper.mapRow(rs, 0));
        });
        doThrow(new HrAccessDeniedException("Forbidden"))
            .when(hrOperationalScopeService)
            .requireUserInScope(currentUser, 22L);

        assertThrows(
            HrAccessDeniedException.class,
            () -> service.requireEnrollmentSessionInScope(currentUser, 44L)
        );
    }

    @Test
    void requireEnrollmentSessionInScopeReturnsNotFoundWhenMissing() {
        var service = new HrFaceAccessService(jdbcTemplate, hrAccessService, hrOperationalScopeService);
        var currentUser = new AuthSessionUser(7L, 1L, "Scoped User", "admin");
        when(hrAccessService.canAccessManagementTab(currentUser, HrAccessService.HrTab.CONTROL)).thenReturn(true);
        when(jdbcTemplate.query(
            contains("FROM user_face_enrollments"),
            ArgumentMatchers.<RowMapper<Long>>any(),
            eq(1L),
            eq(44L)
        )).thenReturn(List.of());

        assertThrows(
            NoSuchElementException.class,
            () -> service.requireEnrollmentSessionInScope(currentUser, 44L)
        );
    }
}
