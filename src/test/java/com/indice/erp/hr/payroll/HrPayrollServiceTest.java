package com.indice.erp.hr.payroll;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrPayrollServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrPayrollScopeAccess hrPayrollScopeAccess;

    @Test
    void listRunsAppliesBusinessScopeForCurrentUser() throws Exception {
        var service = new HrPayrollService(jdbcTemplate, hrPayrollScopeAccess);
        var currentUser = new AuthSessionUser(7L, 1L, "Scoped Admin", "admin");
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(hrPayrollScopeAccess.resolve(currentUser)).thenReturn(scope);
        when(hrPayrollScopeAccess.runLineParameters(scope)).thenReturn(List.of(9L));
        when(hrPayrollScopeAccess.runLinePredicate(scope, "l")).thenReturn(" AND l.business_id_snapshot = ?");
        when(jdbcTemplate.query(
            contains("JOIN payroll_run_lines"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(9L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(30L);
            when(rs.getLong("company_id")).thenReturn(1L);
            when(rs.getString("grouping_mode")).thenReturn("business");
            when(rs.getString("grouping_key")).thenReturn("business:9");
            when(rs.getString("grouping_label")).thenReturn("Sucursal Centro");
            when(rs.getString("pay_period")).thenReturn("weekly");
            when(rs.getObject("period_start_date", LocalDate.class)).thenReturn(LocalDate.parse("2026-05-04"));
            when(rs.getObject("period_end_date", LocalDate.class)).thenReturn(LocalDate.parse("2026-05-10"));
            when(rs.getString("status")).thenReturn("draft");
            when(rs.getInt("users_count")).thenReturn(2);
            when(rs.getBigDecimal("gross_amount")).thenReturn(new BigDecimal("2500.00"));
            when(rs.getBigDecimal("deductions_amount")).thenReturn(new BigDecimal("250.00"));
            when(rs.getBigDecimal("employer_contributions_amount")).thenReturn(new BigDecimal("150.00"));
            when(rs.getBigDecimal("net_amount")).thenReturn(new BigDecimal("2250.00"));
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var result = service.listRuns(currentUser, Map.of());

        @SuppressWarnings("unchecked")
        var items = (List<Map<String, Object>>) result.get("items");
        assertEquals(1, items.size());
        assertEquals(30L, items.getFirst().get("id"));
        assertEquals(new BigDecimal("2250.00"), items.getFirst().get("net_amount"));
    }
}
