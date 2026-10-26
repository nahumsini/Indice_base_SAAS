package com.indice.erp.hr.payroll;

import static org.junit.jupiter.api.Assertions.*;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.attendance.HrAttendanceService;
import com.indice.erp.hr.payroll.engine.PayrollFiscalAccumulatorService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class HrCanadaPayrollFlowIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired HrPayrollService payroll;
    @Autowired HrAttendanceService attendance;
    @Autowired PayrollFiscalAccumulatorService accumulators;
    @Autowired com.indice.erp.hr.payroll.provider.ca.CanadaPayrollProfileService canadaProfiles;
    // Ordinary Monday-Saturday work: Sunday premiums are covered by a separate rejection case.
    private final LocalDate start = LocalDate.of(2026, 10, 12);
    private long company, fiscal, operational, excluded;
    private AuthSessionUser actor;

    @BeforeEach
    void setup() {
        var name = "Payroll treatment " + UUID.randomUUID();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", name);
        company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, name);
        fiscal = employee("fiscal_payroll");
        long user = jdbc.queryForObject("SELECT user_id FROM user_companies WHERE id = ?", Long.class, fiscal);
        actor = new AuthSessionUser(user, company, "Synthetic payroll reviewer", "root");
        operational = employee("operational_payroll");
        excluded = employee("no_payroll");
        var profile = com.indice.erp.hr.payroll.provider.ca.CanadaPayrollFixture.patch(
            com.indice.erp.hr.payroll.provider.ca.CanadaPayrollFixture.profile("ON"),Map.of("payPeriodsPerYear",52));
        canadaProfiles.save(actor,fiscal,new com.indice.erp.hr.payroll.provider.ca.CanadaPayrollProfileService.SaveRequest(0,UUID.randomUUID(),profile));
        jdbc.update("UPDATE user_work_profiles SET state_province='ON' WHERE company_id=?",company);
        for (long member : List.of(fiscal, operational, excluded)) {
            for (var day : start.datesUntil(start.plusDays(6)).toList()) {
                attendance.updateDailyRecord(company, user, member, day, Map.of("status", "on_time"));
            }
        }
    }

    @Test
    void canadaSeparatesFiscalOperationalAndExcludedThroughApprovalAndAccumulators() {
        long run = create();
        assertEquals(2, count("SELECT COUNT(*) FROM payroll_run_lines WHERE run_id = ?", run));
        assertEquals(0, count("SELECT COUNT(*) FROM payroll_run_lines WHERE run_id = ? AND user_company_id = ?", run, excluded));
        long fiscalLine = line(run, fiscal), operationalLine = line(run, operational);
        assertTrue(money(fiscalLine, "deductions_amount").signum() > 0);
        assertTrue(money(fiscalLine, "employer_contributions_amount").signum() > 0);
        assertTrue(count("SELECT COUNT(*) FROM payroll_run_line_items WHERE run_line_id = ? AND code = 'CAN_FED_TAX'", fiscalLine) > 0);
        assertOperational(operationalLine);
        payroll.approveRun(actor, run);
        assertEquals(2, count("SELECT COUNT(*) FROM payroll_run_lines WHERE run_id = ? AND payable_expense_id IS NOT NULL", run));
        var fiscalYtd = accumulators.loadSnapshot(company, fiscal, "CA", start.plusWeeks(1), start.plusWeeks(2).minusDays(1), null);
        var operationalYtd = accumulators.loadSnapshot(company, operational, "CA", start.plusWeeks(1), start.plusWeeks(2).minusDays(1), null);
        assertEquals(new BigDecimal("6000.00"), fiscalYtd.grossAmountYearToDate());
        assertEquals(new BigDecimal("0.00"), operationalYtd.grossAmountYearToDate());
        assertThrows(IllegalArgumentException.class, () -> change(run, fiscalLine, "operational_payroll"));
    }

    @Test
    void switchingDraftTreatmentRemovesAndRestoresOnlyFiscalItems() {
        long run = create(), line = line(run, fiscal);
        var deductions = money(line, "deductions_amount");
        var employer = money(line, "employer_contributions_amount");
        change(run, line, "operational_payroll");
        assertOperational(line);
        change(run, line, "fiscal_payroll");
        change(run, line, "fiscal_payroll");
        assertEquals(deductions, money(line, "deductions_amount"));
        assertEquals(employer, money(line, "employer_contributions_amount"));
        assertEquals(1, count("SELECT COUNT(*) FROM payroll_run_line_items WHERE run_line_id = ? AND code = 'CAN_FED_TAX'", line));
    }



    @Test
    void excludedDraftLineHasNoAmountsItemsOrPayableAndAssistantMatches() {
        long run = create(), line = line(run, fiscal);
        var request = new HrPayrollAssistantContracts.Change(null, null, null, null, line, "no_payroll", null, List.of());
        var preview = payroll.prepareAssistantPayroll(actor, "adjust_hr_payroll_line", run, request);
        var projected = preview.after().runs().getFirst().lines().stream().filter(item -> item.id() == line).findFirst().orElseThrow();
        assertEquals(new BigDecimal("0.00"), projected.netAmount());
        change(run, line, "no_payroll");
        assertExcluded(line);
        payroll.processRun(actor, run);
        assertExcluded(line);
        assertEquals(new BigDecimal("6000.00"), jdbc.queryForObject("SELECT net_amount FROM payroll_runs WHERE id = ?", BigDecimal.class, run));
        // Exclusion keeps the salary snapshot so re-inclusion is deliberate and reproducible.
        change(run, line, "operational_payroll");
        assertOperational(line);
        change(run, line, "no_payroll");
        payroll.approveRun(actor, run);
        assertExcluded(line);
        assertEquals(0, count("SELECT COUNT(*) FROM payroll_run_lines WHERE id = ? AND payable_expense_id IS NOT NULL", line));
        assertEquals(1, count("SELECT COUNT(*) FROM payroll_run_lines WHERE run_id = ? AND payable_expense_id IS NOT NULL", run));
    }

    @Test
    void excludedLineCannotSilentlyDiscardManualAdjustments() {
        long run = create(), line = line(run, operational);
        var request = new HrPayrollAssistantContracts.Change(null, null, null, null, line, "no_payroll", null,
            List.of(new HrPayrollAssistantContracts.ManualItem("earning", "Bonus", new BigDecimal("100"))));
        var error = assertThrows(IllegalArgumentException.class,
            () -> payroll.prepareAssistantPayroll(actor, "adjust_hr_payroll_line", run, request));
        assertTrue(error.getMessage().contains("sin nómina"));
        assertOperational(line);
    }

    @Test
    void emptyEmployeeClassificationDefaultsToOperationalRatherThanFiscal() {
        jdbc.update("UPDATE user_work_profiles SET payroll_treatment = '' WHERE company_id = ? AND user_company_id = ?", company, operational);
        assertOperational(line(create(), operational));
    }



    @Test
    void recalculationUsesExplicitTreatmentRatherThanAnInconsistentFiscalFlag() {
        long run = create(), line = line(run, operational);
        jdbc.update("UPDATE payroll_run_lines SET include_in_fiscal = 1 WHERE id = ?", line);
        payroll.processRun(actor, run);
        assertOperational(line);
        assertEquals(0, count("SELECT COUNT(*) FROM payroll_run_lines WHERE id = ? AND include_in_fiscal = 1", line));
    }

    @Test
    void legacyExcludedLineWithFinancialAmountsCannotPassApprovalIntegrity() {
        long run = create(), line = line(run, operational);
        jdbc.update("UPDATE payroll_run_lines SET payroll_treatment_snapshot = 'no_payroll', payment_route = 'none' WHERE id = ?", line);
        assertThrows(IllegalArgumentException.class, () -> payroll.ensureFinancialIntegrityForApproval(company, run));
    }

    private long employee(String treatment) {
        var email = UUID.randomUUID() + "@example.invalid";
        jdbc.update("INSERT INTO users (email, password_hash, full_name) VALUES (?, 'unused-synthetic', 'Treatment fixture')", email);
        long user = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        jdbc.update("INSERT INTO user_companies (company_id, user_id, role, status, visibility) VALUES (?, ?, 'root', 'active', 'all')", company, user);
        long member = jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id = ? AND user_id = ?", Long.class, company, user);
        jdbc.update("""
            INSERT INTO user_work_profiles (company_id, user_company_id, user_id, hire_date, salary, pay_period,
                salary_type, workday_hours, workdays_per_week, payroll_treatment, registration_country, status)
            VALUES (?, ?, ?, '2025-01-01', 6000, 'weekly', 'daily', 8, 6, ?, 'CA', 'active')
            """, company, member, user, treatment);
        return member;
    }
    @Test
    void canadaProfilesAreTenantScopedVersionedAndRetrySafe() {
        var response = canadaProfiles.get(actor, fiscal);
        var requestId = UUID.randomUUID();
        var request = new com.indice.erp.hr.payroll.provider.ca.CanadaPayrollProfileService.SaveRequest(response.revision(), requestId, response.profile());
        var saved = canadaProfiles.save(actor, fiscal, request);
        assertEquals(2, saved.revision());
        assertEquals(2, canadaProfiles.save(actor, fiscal, request).revision());
        assertEquals(2, canadaProfiles.get(actor, fiscal).history().size());
        assertThrows(com.indice.erp.hr.payroll.provider.ca.CanadaPayrollProfileService.ProfileConflictException.class,
            () -> canadaProfiles.save(actor, fiscal, new com.indice.erp.hr.payroll.provider.ca.CanadaPayrollProfileService.SaveRequest(1, UUID.randomUUID(), response.profile())));
        var manager = new AuthSessionUser(actor.userId(), company, "Synthetic manager", "manager");
        assertThrows(com.indice.erp.hr.HrAccessDeniedException.class, () -> canadaProfiles.save(manager, fiscal, request));
        var otherName = "Other tenant " + UUID.randomUUID();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", otherName);
        var otherCompany = jdbc.queryForObject("SELECT id FROM companies WHERE name=?", Long.class, otherName);
        var other = new AuthSessionUser(actor.userId(), otherCompany, "Synthetic other tenant", "root");
        assertThrows(java.util.NoSuchElementException.class, () -> canadaProfiles.get(other, fiscal));
        assertThrows(java.util.NoSuchElementException.class, () -> canadaProfiles.save(other, fiscal, request));
    }

    @Test
    void canadaApprovalKeepsReviewedProfileAndExplicitRecalculationRefreshesIt() {
        long run = create(), fiscalLine = line(run, fiscal);
        var profile = canadaProfiles.get(actor, fiscal).profile();
        canadaProfiles.save(actor, fiscal, new com.indice.erp.hr.payroll.provider.ca.CanadaPayrollProfileService.SaveRequest(1, UUID.randomUUID(), profile));
        payroll.approveRun(actor, run);
        assertEquals("1", jdbc.queryForObject("SELECT JSON_UNQUOTE(JSON_EXTRACT(calculation_inputs_json, '$.countryProfile.metadata.canadaProfileRevision')) FROM payroll_run_lines WHERE id=?", String.class, fiscalLine));
        assertThrows(IllegalArgumentException.class, () -> payroll.processRun(actor, run));
    }

    @Test
    void missingCanadaProfileBlocksBothUiAndAssistantApprovalButNotOperationalRuns() {
        // An employee created without a Mexican fiscal profile gets a reviewable draft, not approval.
        var fresh = employee("fiscal_payroll");
        jdbc.update("UPDATE user_work_profiles SET state_province='ON' WHERE company_id=? AND user_company_id=?",company,fresh);
        for (var day : start.datesUntil(start.plusDays(6)).toList())
            attendance.updateDailyRecord(company, actor.userId(), fresh, day, Map.of("status", "on_time"));
        long run = create(), freshLine = line(run, fresh);
        assertEquals("CA_REVIEW_REQUIRED", jdbc.queryForObject("SELECT calculation_source FROM payroll_run_lines WHERE id=?", String.class, freshLine));
        assertThrows(IllegalArgumentException.class, () -> payroll.approveRun(actor, run));
        assertThrows(IllegalArgumentException.class, () -> payroll.prepareAssistantPayroll(actor, "approve_hr_payroll", run, null));
        change(run, freshLine, "operational_payroll");
        payroll.approveRun(actor, run);
        assertOperational(freshLine);
    }





    @Test
    void provinceOfEmploymentControlsGroupingEvenWhenHomeAddressIsDifferent() {
        var response=canadaProfiles.get(actor,fiscal);
        var qc=com.indice.erp.hr.payroll.provider.ca.CanadaPayrollFixture.patch(response.profile(),Map.of("provinceOfEmployment","QC","quebecHealthFundPercent",new BigDecimal("1.65")));
        canadaProfiles.save(actor,fiscal,new com.indice.erp.hr.payroll.provider.ca.CanadaPayrollProfileService.SaveRequest(1,UUID.randomUUID(),qc));
        var result=payroll.createRuns(actor,Map.of("pay_period","weekly","period_start_date",start.toString()));
        assertEquals(2,((List<?>)result.get("items")).size());
        assertEquals("QC",jdbc.queryForObject("SELECT jurisdiction_code_snapshot FROM payroll_run_lines WHERE company_id=? AND user_company_id=?",String.class,company,fiscal));
        assertEquals(1,count("SELECT COUNT(*) FROM payroll_run_line_items i JOIN payroll_run_lines l ON l.id=i.run_line_id WHERE l.company_id=? AND l.user_company_id=? AND i.code='QPP'",company,fiscal));
    }

    @Test
    void paymentDateDeterminesFiscalYearAndTenantAndOperationalIsolationRemainEnforced() {
        long run=create();
        jdbc.update("UPDATE payroll_runs SET status='processed',period_start_date='2025-12-22',period_end_date='2025-12-28' WHERE id=?",run);
        jdbc.update("UPDATE payroll_run_lines SET calculation_inputs_json=JSON_SET(calculation_inputs_json,'$.countryProfile.metadata.canadaPaymentDate','2026-01-02') WHERE run_id=?",run);
        var end=LocalDate.of(2026,1,11);
        var ytd=accumulators.loadSnapshot(company,fiscal,"CA",end.minusDays(6),end,null);
        assertEquals(new BigDecimal("6000.00"),ytd.grossAmountYearToDate());
        assertTrue(ytd.employeeDeductionAmount("CPP").signum()>0);
        assertEquals(new BigDecimal("6000.00"),ytd.metadata().get("canadaPensionableEarnings"));
        assertEquals(new BigDecimal("0.00"),accumulators.loadSnapshot(company,operational,"CA",end.minusDays(6),end,null).grossAmountYearToDate());
        assertEquals(new BigDecimal("0.00"),accumulators.loadSnapshot(company+999999,fiscal,"CA",end.minusDays(6),end,null).grossAmountYearToDate());
        assertEquals(new BigDecimal("0.00"),accumulators.loadSnapshot(company,fiscal,"CA",end.minusDays(6),end,run).grossAmountYearToDate());
        jdbc.update("UPDATE payroll_run_lines SET calculation_inputs_json=JSON_SET(calculation_inputs_json,'$.countryProfile.metadata.canadaPaymentDate','2027-01-02') WHERE run_id=?",run);
        assertEquals(new BigDecimal("0.00"),accumulators.loadSnapshot(company,fiscal,"CA",end.minusDays(6),end,null).grossAmountYearToDate());
    }

    @Test
    void importedBalancesCannotDoubleCountPayrollEvenWhenPriorRunIsProcessedAfterProfileWasFrozen() {
        long run=create();
        var p=canadaProfiles.get(actor,fiscal).profile();
        var opening=new com.indice.erp.hr.payroll.provider.ca.CanadaPayrollProfile.OpeningBalances(start.plusDays(8),new BigDecimal("6000"),new BigDecimal("300"),BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO,new BigDecimal("90"),BigDecimal.ZERO,BigDecimal.ZERO);
        p=com.indice.erp.hr.payroll.provider.ca.CanadaPayrollFixture.patch(p,Map.of("openingBalances",opening));
        var country=com.indice.erp.hr.payroll.engine.PayrollCalculationContext.CountryPayrollProfile.empty("CA").withMetadata(Map.of("canadaProfile",p,"canadaPaymentDate",start.plusDays(20).toString()));
        jdbc.update("UPDATE payroll_runs SET status='processed' WHERE id=?",run);
        var snapshot=accumulators.loadSnapshot(company,fiscal,"CA",start.plusDays(14),start.plusDays(20),null,country);
        assertEquals(true,snapshot.metadata().get("canadaOpeningBalanceOverlap"));
    }

    private long create() { return runId(payroll.createRuns(actor, Map.of("pay_period", "weekly", "period_start_date", start.toString()))); }
    private long runId(Map<String, Object> result) { return ((Number) ((Map<?, ?>) ((List<?>) result.get("items")).getFirst()).get("id")).longValue(); }
    private long line(long run, long member) { return jdbc.queryForObject("SELECT id FROM payroll_run_lines WHERE run_id = ? AND user_company_id = ?", Long.class, run, member); }
    private int count(String query, Object... args) { return jdbc.queryForObject(query, Integer.class, args); }
    private BigDecimal money(long line, String column) { return jdbc.queryForObject("SELECT " + column + " FROM payroll_run_lines WHERE id = ?", BigDecimal.class, line); }
    private void change(long run, long line, String treatment) { payroll.updateRunLine(actor, run, line, Map.of("payroll_treatment", treatment, "manual_items", List.of())); }
    private void assertOperational(long line) {
        assertEquals("OPERATIONAL_NON_FISCAL", jdbc.queryForObject("SELECT calculation_source FROM payroll_run_lines WHERE id = ?", String.class, line));
        assertEquals(new BigDecimal("6000.00"), money(line, "gross_amount"));
        assertEquals(new BigDecimal("6000.00"), money(line, "net_amount"));
        assertEquals(new BigDecimal("0.00"), money(line, "deductions_amount"));
        assertEquals(new BigDecimal("0.00"), money(line, "employer_contributions_amount"));
        assertEquals(0, count("SELECT COUNT(*) FROM payroll_run_line_items WHERE run_line_id = ? AND category IN ('deduction', 'employer_contribution', 'provision')", line));
    }
    private void assertExcluded(long line) {
        for (var column : List.of("gross_amount", "deductions_amount", "employer_contributions_amount", "net_amount")) assertEquals(new BigDecimal("0.00"), money(line, column));
        assertEquals("none", jdbc.queryForObject("SELECT payment_route FROM payroll_run_lines WHERE id = ?", String.class, line));
        assertEquals(0, count("SELECT COUNT(*) FROM payroll_run_line_items WHERE run_line_id = ? AND amount <> 0", line));
    }
}
