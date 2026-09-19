package com.indice.erp.hr.payroll;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.payroll.engine.PayrollAttendanceInputService;
import com.indice.erp.hr.payroll.engine.PayrollCalculationEngine;
import com.indice.erp.hr.payroll.engine.PayrollFiscalAccumulatorService;
import com.indice.erp.hr.payroll.engine.PayrollManualAdjustmentService;
import com.indice.erp.hr.payroll.engine.PayrollRuleResolver;
import com.indice.erp.hr.payroll.engine.PayrollSnapshotService;
import com.indice.erp.hr.payroll.provider.generic.GenericPayrollProvider;
import com.indice.erp.hr.payroll.reporting.co.ColombiaPayrollReportingService;
import com.indice.erp.hr.incentives.HrIncentivePayrollSupplyService;
import com.indice.erp.finance.expenses.ExpenseService;
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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrPayrollServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrPayrollScopeAccess hrPayrollScopeAccess;

    @Test
    void listRunsAppliesBusinessScopeForCurrentUser() throws Exception {
        var service = newService();
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
        when(jdbcTemplate.query(
            contains("COALESCE(NULLIF(l.country_code_snapshot"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(30L)
        )).thenReturn(List.of());

        var result = service.listRuns(currentUser, Map.of());

        @SuppressWarnings("unchecked")
        var items = (List<Map<String, Object>>) result.get("items");
        assertEquals(1, items.size());
        assertEquals(30L, items.getFirst().get("id"));
        assertEquals(new BigDecimal("2250.00"), items.getFirst().get("net_amount"));
        assertFalse(org.mockito.Mockito.mockingDetails(jdbcTemplate).getInvocations().stream()
            .map(invocation -> invocation.getArguments()[0])
            .filter(String.class::isInstance)
            .map(String.class::cast)
            .anyMatch(sql -> sql.contains("FROM hr_users e")));
    }

    @Test
    void fixedSalaryDeductionProratesPeriodAmountByUnpaidWorkDays() {
        var deduction = HrPayrollService.computeFixedSalaryDeduction(
            new BigDecimal("3000.00"),
            BigDecimal.ONE,
            new BigDecimal("5")
        );

        assertEquals(new BigDecimal("600.00"), deduction);
    }

    @Test
    void runStatusFilterHidesCancelledRunsByDefaultButAllowsExplicitHistoryLookup() {
        assertTrue(HrPayrollService.matchesRunStatus("draft", ""));
        assertFalse(HrPayrollService.matchesRunStatus("cancelled", ""));
        assertFalse(HrPayrollService.matchesRunStatus("cancelled", "all"));
        assertTrue(HrPayrollService.matchesRunStatus("cancelled", "cancelled"));
    }

    @Test
    void fixedSalaryDeductionDoesNotTreatPeriodSalaryAsDailySalary() {
        var deduction = HrPayrollService.computeFixedSalaryDeduction(
            new BigDecimal("3000.00"),
            new BigDecimal("2"),
            new BigDecimal("5")
        );

        assertEquals(new BigDecimal("1200.00"), deduction);
    }

    @Test
    void fixedSalaryDeductionCannotExceedTheSalaryForThePeriod() {
        var deduction = HrPayrollService.computeFixedSalaryDeduction(
            new BigDecimal("3000.00"),
            new BigDecimal("6"),
            new BigDecimal("2")
        );

        assertEquals(new BigDecimal("3000.00"), deduction);
    }

    @Test
    void storedAttendanceReusesItsControlDaysSnapshot() {
        var controlDays = HrPayrollService.resolveStoredControlWorkDays(
            Map.of("controlWorkDays", "10.00"),
            new BigDecimal("4"),
            BigDecimal.ONE,
            new BigDecimal("2"),
            new BigDecimal("2"),
            new BigDecimal("3")
        );

        assertEquals(new BigDecimal("10.00"), controlDays);
    }

    @Test
    void legacyAttendanceReconstructionIncludesMissingDaysWithoutCountingPaidLeaveTwice() {
        var controlDays = HrPayrollService.resolveStoredControlWorkDays(
            Map.of(),
            new BigDecimal("4"),
            BigDecimal.ONE,
            new BigDecimal("2"),
            new BigDecimal("2"),
            new BigDecimal("3")
        );

        assertEquals(new BigDecimal("10"), controlDays);
    }

    @Test
    void saveColombiaConfigPersistsCompanyCountryConfig() {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Payroll Admin", "admin");

        when(jdbcTemplate.query(
            contains("FROM payroll_company_country_configs"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq("CO")
        )).thenReturn(List.of());

        service.saveColombiaConfig(currentUser, Map.of(
            "default_arl_class", "2",
            "compensation_fund_code", "CCF001",
            "compensation_fund_name", "Caja Principal",
            "employer_health_exemption_applies", true,
            "sena_applies", false,
            "icbf_applies", false,
            "ccf_applies", true,
            "metadata", Map.of("source", "manual")
        ));

        verify(jdbcTemplate).update(
            contains("INSERT INTO payroll_company_country_configs"),
            eq(1L),
            eq(new BigDecimal("2.00")),
            eq("CCF001"),
            eq("Caja Principal"),
            eq(true),
            eq(false),
            eq(false),
            eq(true),
            eq("{\"source\":\"manual\"}")
        );
    }

    @Test
    void getColombiaEmployeeProfileRejectsEmployeeOutsideScope() {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Scoped Admin", "admin");
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(hrPayrollScopeAccess.resolve(currentUser)).thenReturn(scope);
        when(jdbcTemplate.queryForObject(
            contains("FROM hr_users e"),
            eq(Long.class),
            eq(1L),
            eq(55L),
            eq(9L)
        )).thenReturn(0L);
        when(jdbcTemplate.queryForObject(
            eq("SELECT COUNT(*) FROM hr_users WHERE company_id = ? AND id = ?"),
            eq(Long.class),
            eq(1L),
            eq(55L)
        )).thenReturn(1L);

        assertThrows(HrAccessDeniedException.class, () -> service.getColombiaEmployeeProfile(currentUser, 55L));
    }

    @Test
    void listGovernmentReportingSnapshotsReturnsPersistedColombiaPayloads() throws Exception {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Payroll Admin", "admin");

        when(hrPayrollScopeAccess.resolve(currentUser)).thenReturn(HrOperationalScope.corporateOffice());
        when(jdbcTemplate.query(
            contains("FROM payroll_runs"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            return List.of(rowMapper.mapRow(runResultSet(30L), 0));
        });
        when(jdbcTemplate.query(
            contains("COALESCE(NULLIF(l.country_code_snapshot"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(30L)
        )).thenReturn(List.of());
        when(jdbcTemplate.queryForObject(
            contains("calculation_source = 'GENERIC_UNSUPPORTED_COUNTRY'"),
            eq(Integer.class),
            eq(30L)
        )).thenReturn(0);
        when(jdbcTemplate.query(
            contains("FROM payroll_government_reporting_snapshots"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L),
            eq("PILA")
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            var rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(90L);
            when(rs.getLong("run_id")).thenReturn(30L);
            when(rs.getLong("run_line_id")).thenReturn(77L);
            when(rs.getLong("company_id")).thenReturn(1L);
            when(rs.getLong("user_company_id")).thenReturn(55L);
            when(rs.getString("country_code")).thenReturn("CO");
            when(rs.getString("report_type")).thenReturn("PILA");
            when(rs.getObject("report_period_start", LocalDate.class)).thenReturn(LocalDate.parse("2026-06-01"));
            when(rs.getObject("report_period_end", LocalDate.class)).thenReturn(LocalDate.parse("2026-06-30"));
            when(rs.getString("status")).thenReturn("draft_internal");
            when(rs.getString("payload_hash")).thenReturn("abc123");
            when(rs.getString("payload_json")).thenReturn("{\"payloadVersion\":\"PILA_AT2_V29_2026_INTERNAL\"}");
            when(rs.getString("validation_json")).thenReturn("{\"blocking\":false}");
            when(rs.getString("response_json")).thenReturn("{\"readyForTransmission\":true}");
            when(rs.getString("generated_by_source")).thenReturn("payroll_calculation_engine");
            when(rs.getTimestamp("generated_at")).thenReturn(java.sql.Timestamp.valueOf("2026-06-27 10:00:00"));
            when(rs.getTimestamp("updated_at")).thenReturn(java.sql.Timestamp.valueOf("2026-06-27 10:00:00"));
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var result = service.listGovernmentReportingSnapshots(currentUser, 30L, "pila");

        @SuppressWarnings("unchecked")
        var items = (List<Map<String, Object>>) result.get("items");
        assertEquals(1, items.size());
        assertEquals("PILA", items.getFirst().get("report_type"));
        @SuppressWarnings("unchecked")
        var payload = (Map<String, Object>) items.getFirst().get("payload");
        assertEquals("PILA_AT2_V29_2026_INTERNAL", payload.get("payloadVersion"));
    }

    @Test
    void approveRunRejectsBlockingColombiaReportingSnapshot() throws Exception {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Payroll Admin", "admin");

        when(hrPayrollScopeAccess.resolve(currentUser)).thenReturn(HrOperationalScope.corporateOffice());
        when(jdbcTemplate.query(
            contains("FROM payroll_runs"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            return List.of(rowMapper.mapRow(runResultSet(30L, "processed"), 0));
        });
        when(jdbcTemplate.queryForList(
            contains("country_code_snapshot = 'CO'"),
            eq(Long.class),
            eq(1L),
            eq(30L)
        )).thenReturn(List.of(77L));
        when(jdbcTemplate.query(
            contains("SELECT processed_by, approved_by"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(30L)
        )).thenReturn(List.of());
        when(jdbcTemplate.query(
            contains("FROM payroll_government_reporting_snapshots"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            var rs = mock(ResultSet.class);
            when(rs.getLong("run_line_id")).thenReturn(77L);
            when(rs.getString("status")).thenReturn("draft_ready");
            when(rs.getString("report_type")).thenReturn("PILA");
            when(rs.getString("validation_json")).thenReturn("{\"blocking\":true}");
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var error = assertThrows(IllegalArgumentException.class, () -> service.approveRun(currentUser, 30L));

        assertEquals("Colombia payroll has blocking PILA/DIAN validation issues before approval.", error.getMessage());
    }

    @Test
    void approveRunRejectsMissingColombiaReportingSnapshots() throws Exception {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Payroll Admin", "admin");

        when(hrPayrollScopeAccess.resolve(currentUser)).thenReturn(HrOperationalScope.corporateOffice());
        when(jdbcTemplate.query(
            contains("FROM payroll_runs"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            return List.of(rowMapper.mapRow(runResultSet(30L, "processed"), 0));
        });
        when(jdbcTemplate.queryForList(
            contains("country_code_snapshot = 'CO'"),
            eq(Long.class),
            eq(1L),
            eq(30L)
        )).thenReturn(List.of(77L));
        when(jdbcTemplate.query(
            contains("SELECT processed_by, approved_by"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(30L)
        )).thenReturn(List.of());
        when(jdbcTemplate.query(
            contains("FROM payroll_government_reporting_snapshots"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L)
        )).thenReturn(List.of());

        var error = assertThrows(IllegalArgumentException.class, () -> service.approveRun(currentUser, 30L));

        assertEquals("Colombia payroll requires PILA and DIAN snapshots before approval.", error.getMessage());
    }

    @Test
    void approveRunRejectsRejectedColombiaGovernmentResponse() throws Exception {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Payroll Admin", "admin");

        when(hrPayrollScopeAccess.resolve(currentUser)).thenReturn(HrOperationalScope.corporateOffice());
        when(jdbcTemplate.query(
            contains("FROM payroll_runs"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            return List.of(rowMapper.mapRow(runResultSet(30L, "processed"), 0));
        });
        when(jdbcTemplate.queryForList(
            contains("country_code_snapshot = 'CO'"),
            eq(Long.class),
            eq(1L),
            eq(30L)
        )).thenReturn(List.of(77L));
        when(jdbcTemplate.query(
            contains("SELECT processed_by, approved_by"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(30L)
        )).thenReturn(List.of());
        when(jdbcTemplate.query(
            contains("FROM payroll_government_reporting_snapshots"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            var rs = mock(ResultSet.class);
            when(rs.getLong("run_line_id")).thenReturn(77L);
            when(rs.getString("status")).thenReturn("rejected");
            when(rs.getString("report_type")).thenReturn("PILA");
            when(rs.getString("validation_json")).thenReturn("{\"blocking\":false}");
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var error = assertThrows(IllegalArgumentException.class, () -> service.approveRun(currentUser, 30L));

        assertEquals("Colombia payroll has rejected PILA/DIAN government responses before approval.", error.getMessage());
    }

    @Test
    void updateGovernmentReportingSnapshotResponsePersistsExternalResponse() throws Exception {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Payroll Admin", "admin");

        when(hrPayrollScopeAccess.resolve(currentUser)).thenReturn(HrOperationalScope.corporateOffice());
        when(jdbcTemplate.query(
            contains("FROM payroll_government_reporting_snapshots s"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(90L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            return List.of(rowMapper.mapRow(governmentSnapshotResultSet(90L, "draft_ready"), 0));
        });

        service.updateGovernmentReportingSnapshotResponse(currentUser, 90L, Map.of(
            "status", "rejected",
            "external_id", "DIAN-ERR-1",
            "message", "Documento rechazado por validacion externa"
        ));

        verify(jdbcTemplate).update(
            contains("UPDATE payroll_government_reporting_snapshots"),
            eq("rejected"),
            contains("\"status\":\"REJECTED\""),
            contains("\"externalBlocking\":true"),
            eq(1L),
            eq(90L)
        );
    }

    @Test
    void approveRunRejectsSameUserThatProcessedRun() throws Exception {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Payroll Admin", "admin");

        when(hrPayrollScopeAccess.resolve(currentUser)).thenReturn(HrOperationalScope.corporateOffice());
        when(jdbcTemplate.query(
            contains("FROM payroll_runs"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            return List.of(rowMapper.mapRow(runResultSet(30L, "processed"), 0));
        });
        when(jdbcTemplate.query(
            contains("SELECT processed_by, approved_by"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            var rs = mock(ResultSet.class);
            when(rs.getLong("processed_by")).thenReturn(7L);
            when(rs.wasNull()).thenReturn(false);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var error = assertThrows(IllegalArgumentException.class, () -> service.approveRun(currentUser, 30L));

        assertEquals("The user who processed the payroll run cannot approve it.", error.getMessage());
    }

    @Test
    void approveRunRejectsSameUserThatRecalculatedCurrentDraft() throws Exception {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Payroll Admin", "admin");

        when(hrPayrollScopeAccess.resolve(currentUser)).thenReturn(HrOperationalScope.corporateOffice());
        when(jdbcTemplate.query(
            contains("FOR UPDATE"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            return List.of(rowMapper.mapRow(runResultSet(30L, "draft"), 0));
        });
        when(jdbcTemplate.query(
            contains("SELECT processed_by, approved_by"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            var rs = mock(ResultSet.class);
            when(rs.getLong("processed_by")).thenReturn(7L);
            when(rs.wasNull()).thenReturn(false);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var error = assertThrows(IllegalArgumentException.class, () -> service.approveRun(currentUser, 30L));

        assertEquals("The user who processed the payroll run cannot approve it.", error.getMessage());
    }

    @Test
    void approveRunRejectsNegativeOrUnbalancedFinancialTotals() throws Exception {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Payroll Admin", "admin");

        when(hrPayrollScopeAccess.resolve(currentUser)).thenReturn(HrOperationalScope.corporateOffice());
        when(jdbcTemplate.query(
            contains("FOR UPDATE"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            return List.of(rowMapper.mapRow(runResultSet(30L, "processed"), 0));
        });
        when(jdbcTemplate.query(
            contains("SELECT processed_by, approved_by"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            var rs = mock(ResultSet.class);
            when(rs.getLong("processed_by")).thenReturn(8L);
            when(rs.wasNull()).thenReturn(false);
            return List.of(rowMapper.mapRow(rs, 0));
        });
        when(jdbcTemplate.queryForObject(
            contains("invalid_payroll_run"),
            eq(Integer.class),
            eq(1L),
            eq(30L)
        )).thenReturn(1);

        var error = assertThrows(IllegalArgumentException.class, () -> service.approveRun(currentUser, 30L));

        assertTrue(error.getMessage().contains("negative net amounts"));
    }

    @Test
    void cancelRunRejectsApprovedRunWithFinancialObligations() throws Exception {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Payroll Admin", "admin");

        when(hrPayrollScopeAccess.resolve(currentUser)).thenReturn(HrOperationalScope.corporateOffice());
        when(jdbcTemplate.query(
            contains("FROM payroll_runs"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            return List.of(rowMapper.mapRow(runResultSet(30L, "approved"), 0));
        });

        var error = assertThrows(IllegalArgumentException.class, () -> service.cancelRun(currentUser, 30L));

        assertTrue(error.getMessage().contains("cannot be cancelled"));
    }

    @Test
    void preferencesPreserveFiveDecimalRatePrecision() throws Exception {
        var service = newService();

        when(jdbcTemplate.query(
            contains("FROM payroll_preferences"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            var rs = mock(ResultSet.class);
            when(rs.getLong("company_id")).thenReturn(1L);
            when(rs.getString("grouping_mode")).thenReturn("single");
            when(rs.getBigDecimal("default_daily_hours")).thenReturn(new BigDecimal("8.00"));
            when(rs.getBoolean("pay_leave_days")).thenReturn(true);
            when(rs.getInt("weekly_start_day")).thenReturn(1);
            when(rs.getInt("biweekly_first_day")).thenReturn(1);
            when(rs.getInt("biweekly_second_day")).thenReturn(16);
            when(rs.getInt("monthly_start_day")).thenReturn(1);
            when(rs.getBigDecimal("isr_rate")).thenReturn(new BigDecimal("0.01500"));
            when(rs.getBigDecimal("imss_user_rate")).thenReturn(new BigDecimal("0.04275"));
            when(rs.getBigDecimal("infonavit_user_rate")).thenReturn(new BigDecimal("0.03000"));
            when(rs.getBigDecimal("imss_employer_rate")).thenReturn(new BigDecimal("0.07125"));
            when(rs.getBigDecimal("infonavit_employer_rate")).thenReturn(new BigDecimal("0.05000"));
            when(rs.getBigDecimal("sar_employer_rate")).thenReturn(new BigDecimal("0.02000"));
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var result = service.getPreferences(1L);

        assertEquals(new BigDecimal("0.01500"), result.get("isr_rate"));
        assertEquals(new BigDecimal("0.04275"), result.get("imss_user_rate"));
        assertEquals(new BigDecimal("0.07125"), result.get("imss_employer_rate"));
    }

    @Test
    void approveRunRejectsUnsupportedFiscalCountry() throws Exception {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Payroll Owner", "owner");

        when(hrPayrollScopeAccess.resolve(currentUser)).thenReturn(HrOperationalScope.corporateOffice());
        when(jdbcTemplate.query(
            contains("FROM payroll_runs"),
            ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L),
            eq(30L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            return List.of(rowMapper.mapRow(runResultSet(30L, "processed"), 0));
        });
        when(jdbcTemplate.queryForObject(
            contains("invalid_payroll_run"),
            eq(Integer.class),
            eq(1L),
            eq(30L)
        )).thenReturn(0);
        when(jdbcTemplate.queryForObject(
            contains("payroll_treatment_snapshot = 'fiscal_payroll'"),
            eq(Integer.class),
            eq(30L)
        )).thenReturn(1);

        var error = assertThrows(IllegalArgumentException.class, () -> service.approveRun(currentUser, 30L));

        assertTrue(error.getMessage().contains("unsupported countries"));
    }

    private HrPayrollService newService() {
        var ruleResolver = new PayrollRuleResolver(jdbcTemplate);
        var manualAdjustmentService = new PayrollManualAdjustmentService();
        var calculationEngine = new PayrollCalculationEngine(
            List.of(new GenericPayrollProvider()),
            manualAdjustmentService,
            ruleResolver
        );
        return new HrPayrollService(
            jdbcTemplate,
            hrPayrollScopeAccess,
            calculationEngine,
            new PayrollAttendanceInputService(),
            new PayrollFiscalAccumulatorService(jdbcTemplate),
            manualAdjustmentService,
            new PayrollSnapshotService(jdbcTemplate, new ObjectMapper()),
            ruleResolver,
            new ColombiaPayrollReportingService(jdbcTemplate, new ObjectMapper()),
            new HrIncentivePayrollSupplyService(jdbcTemplate),
            mock(ExpenseService.class),
            new HrPayrollAuthorizationService()
        );
    }

    private ResultSet runResultSet(long runId) throws Exception {
        return runResultSet(runId, "draft");
    }

    private ResultSet runResultSet(long runId, String status) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getLong("id")).thenReturn(runId);
        when(rs.getLong("company_id")).thenReturn(1L);
        when(rs.getString("grouping_mode")).thenReturn("single");
        when(rs.getString("grouping_key")).thenReturn("all");
        when(rs.getString("grouping_label")).thenReturn("Nómina única");
        when(rs.getString("pay_period")).thenReturn("monthly");
        when(rs.getObject("period_start_date", LocalDate.class)).thenReturn(LocalDate.parse("2026-06-01"));
        when(rs.getObject("period_end_date", LocalDate.class)).thenReturn(LocalDate.parse("2026-06-30"));
        when(rs.getString("status")).thenReturn(status);
        when(rs.getInt("users_count")).thenReturn(1);
        when(rs.getBigDecimal("gross_amount")).thenReturn(new BigDecimal("4000000.00"));
        when(rs.getBigDecimal("deductions_amount")).thenReturn(new BigDecimal("320000.00"));
        when(rs.getBigDecimal("employer_contributions_amount")).thenReturn(new BigDecimal("800000.00"));
        when(rs.getBigDecimal("net_amount")).thenReturn(new BigDecimal("3680000.00"));
        when(rs.getTimestamp("created_at")).thenReturn(java.sql.Timestamp.valueOf("2026-06-27 09:00:00"));
        return rs;
    }

    private ResultSet governmentSnapshotResultSet(long snapshotId, String status) throws Exception {
        ResultSet rs = mock(ResultSet.class);
        when(rs.getLong("id")).thenReturn(snapshotId);
        when(rs.getLong("run_id")).thenReturn(30L);
        when(rs.getLong("run_line_id")).thenReturn(77L);
        when(rs.getLong("company_id")).thenReturn(1L);
        when(rs.getLong("user_company_id")).thenReturn(55L);
        when(rs.getString("country_code")).thenReturn("CO");
        when(rs.getString("report_type")).thenReturn("DIAN_PAYROLL");
        when(rs.getObject("report_period_start", LocalDate.class)).thenReturn(LocalDate.parse("2026-06-01"));
        when(rs.getObject("report_period_end", LocalDate.class)).thenReturn(LocalDate.parse("2026-06-30"));
        when(rs.getString("status")).thenReturn(status);
        when(rs.getString("payload_hash")).thenReturn("hash-123");
        when(rs.getString("payload_json")).thenReturn("{\"payloadVersion\":\"DIAN_PAYROLL_2026_INTERNAL\"}");
        when(rs.getString("validation_json")).thenReturn("{\"blocking\":false}");
        when(rs.getString("response_json")).thenReturn("{\"status\":\"NOT_TRANSMITTED\",\"readyForTransmission\":true}");
        when(rs.getString("generated_by_source")).thenReturn("payroll_calculation_engine:co");
        when(rs.getTimestamp("generated_at")).thenReturn(java.sql.Timestamp.valueOf("2026-06-27 09:00:00"));
        when(rs.getTimestamp("updated_at")).thenReturn(java.sql.Timestamp.valueOf("2026-06-27 09:00:00"));
        return rs;
    }
}
