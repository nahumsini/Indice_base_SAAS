package com.indice.erp.hr.payroll;

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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrPayrollScopeAccessTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrOperationalScopeService hrOperationalScopeService;

    @Test
    void requireRunLineInScopeRejectsLineOutsideScope() throws Exception {
        var service = new HrPayrollScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(jdbcTemplate.query(
            contains("FROM payroll_run_lines"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(1L),
            eq(30L),
            eq(44L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("unit_id_snapshot")).thenReturn(4L);
            when(rs.getLong("business_id_snapshot")).thenReturn(10L);
            when(rs.wasNull()).thenReturn(false, false);
            return List.of(rowMapper.mapRow(rs, 0));
        });
        doThrow(new HrAccessDeniedException("Forbidden"))
            .when(hrOperationalScopeService)
            .requireAssignmentInScope(1L, scope, 4L, 10L);

        assertThrows(
            HrAccessDeniedException.class,
            () -> service.requireRunLineInScope(1L, scope, 30L, 44L)
        );
    }

    @Test
    void requireRunLineInScopeReturnsNotFoundForMissingLine() {
        var service = new HrPayrollScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(jdbcTemplate.query(
            contains("FROM payroll_run_lines"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(1L),
            eq(30L),
            eq(44L)
        )).thenReturn(List.of());

        assertThrows(
            NoSuchElementException.class,
            () -> service.requireRunLineInScope(1L, scope, 30L, 44L)
        );
    }

    @Test
    void isRunFullyInScopeReturnsFalseWhenAnyLineIsOutsideScope() throws Exception {
        var service = new HrPayrollScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(jdbcTemplate.query(
            contains("FROM payroll_run_lines"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(1L),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet first = mock(ResultSet.class);
            when(first.getLong("unit_id_snapshot")).thenReturn(4L);
            when(first.getLong("business_id_snapshot")).thenReturn(9L);
            when(first.wasNull()).thenReturn(false, false);
            ResultSet second = mock(ResultSet.class);
            when(second.getLong("unit_id_snapshot")).thenReturn(4L);
            when(second.getLong("business_id_snapshot")).thenReturn(10L);
            when(second.wasNull()).thenReturn(false, false);
            return List.of(rowMapper.mapRow(first, 0), rowMapper.mapRow(second, 1));
        });
        when(hrOperationalScopeService.containsAssignment(1L, scope, 4L, 9L)).thenReturn(true);
        when(hrOperationalScopeService.containsAssignment(1L, scope, 4L, 10L)).thenReturn(false);

        assertFalse(service.isRunFullyInScope(1L, scope, 30L));
    }
}
