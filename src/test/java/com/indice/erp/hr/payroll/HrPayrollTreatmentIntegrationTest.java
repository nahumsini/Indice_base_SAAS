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
class HrPayrollTreatmentIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired HrPayrollService payroll;
    @Autowired HrAttendanceService attendance;
    @Autowired PayrollFiscalAccumulatorService accumulators;
    @Autowired com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfileService mexicoProfiles;
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
        var profile = new com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfile(start, new BigDecimal("857.14"), new BigDecimal("900"),
            com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfile.SalaryBasis.FIXED,
            com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfile.MinimumWageZone.GENERAL,
            "A1234567890", new BigDecimal("0.5"), "NLE", new BigDecimal("3"), "Synthetic ordinary NL art. 157",
            new com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfile.InfonavitCredit(false, "", "", null, null, null, null, null, false));
        for (long member : List.of(fiscal, operational, excluded))
            mexicoProfiles.save(actor, member, new com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfileService.SaveRequest(0, UUID.randomUUID(), profile));
        for (long member : List.of(fiscal, operational, excluded)) {
            for (var day : start.datesUntil(start.plusDays(6)).toList()) {
                attendance.updateDailyRecord(company, user, member, day, Map.of("status", "on_time"));
            }
        }
    }

    @Test
    void mexicoSeparatesFiscalOperationalAndExcludedThroughApprovalAndAccumulators() {
        long run = create();
        assertEquals(2, count("SELECT COUNT(*) FROM payroll_run_lines WHERE run_id = ?", run));
        assertEquals(0, count("SELECT COUNT(*) FROM payroll_run_lines WHERE run_id = ? AND user_company_id = ?", run, excluded));
        long fiscalLine = line(run, fiscal), operationalLine = line(run, operational);
        assertTrue(money(fiscalLine, "deductions_amount").signum() > 0);
        assertTrue(money(fiscalLine, "employer_contributions_amount").signum() > 0);
        assertTrue(count("SELECT COUNT(*) FROM payroll_run_line_items WHERE run_line_id = ? AND code = 'ISR'", fiscalLine) > 0);
        assertOperational(operationalLine);
        payroll.approveRun(actor, run);
        assertEquals(2, count("SELECT COUNT(*) FROM payroll_run_lines WHERE run_id = ? AND payable_expense_id IS NOT NULL", run));
        var fiscalYtd = accumulators.loadSnapshot(company, fiscal, "MX", start.plusWeeks(1), start.plusWeeks(2).minusDays(1), null);
        var operationalYtd = accumulators.loadSnapshot(company, operational, "MX", start.plusWeeks(1), start.plusWeeks(2).minusDays(1), null);
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
        assertEquals(1, count("SELECT COUNT(*) FROM payroll_run_line_items WHERE run_line_id = ? AND code = 'ISR'", line));
    }

    @Test
    void fiscalPdfRemainsAnInternalUnstampedReceiptAfterApproval() throws Exception {
        long run = create();
        payroll.approveRun(actor, run);
        try (var document = org.apache.pdfbox.Loader.loadPDF(payroll.exportRunPdf(actor, run))) {
            var text = new org.apache.pdfbox.text.PDFTextStripper().getText(document);
            assertTrue(text.contains("Recibo interno sin timbrar"));
            assertTrue(text.contains("No es un CFDI"));
        }
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
    void profileChangesRequireNewRunAndDoNotRewriteExistingClassification() {
        long run = create(), line = line(run, operational);
        jdbc.update("UPDATE user_work_profiles SET payroll_treatment = 'fiscal_payroll' WHERE company_id = ? AND user_company_id = ?", company, operational);
        payroll.processRun(actor, run);
        assertOperational(line);
        long regenerated = runId(payroll.regenerateOpenRuns(actor));
        assertNotEquals(run, regenerated);
        assertTrue(money(line(regenerated, operational), "deductions_amount").signum() > 0);
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
            VALUES (?, ?, ?, '2025-01-01', 6000, 'weekly', 'daily', 8, 6, ?, 'MX', 'active')
            """, company, member, user, treatment);
        return member;
    }
    @Test
    void mexicoProfilesAreTenantScopedVersionedAndRetrySafe() {
        var response = mexicoProfiles.get(actor, fiscal);
        var requestId = UUID.randomUUID();
        var request = new com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfileService.SaveRequest(response.revision(), requestId, response.profile());
        var saved = mexicoProfiles.save(actor, fiscal, request);
        assertEquals(2, saved.revision());
        assertEquals(2, mexicoProfiles.save(actor, fiscal, request).revision());
        assertEquals(2, mexicoProfiles.get(actor, fiscal).history().size());
        assertThrows(com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfileService.ProfileConflictException.class,
            () -> mexicoProfiles.save(actor, fiscal, new com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfileService.SaveRequest(1, UUID.randomUUID(), response.profile())));
        var manager = new AuthSessionUser(actor.userId(), company, "Synthetic manager", "manager");
        assertThrows(com.indice.erp.hr.HrAccessDeniedException.class, () -> mexicoProfiles.save(manager, fiscal, request));
        var otherName = "Other tenant " + UUID.randomUUID();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", otherName);
        var otherCompany = jdbc.queryForObject("SELECT id FROM companies WHERE name=?", Long.class, otherName);
        var other = new AuthSessionUser(actor.userId(), otherCompany, "Synthetic other tenant", "root");
        assertThrows(java.util.NoSuchElementException.class, () -> mexicoProfiles.get(other, fiscal));
        assertThrows(java.util.NoSuchElementException.class, () -> mexicoProfiles.save(other, fiscal, request));
    }

    @Test
    void mexicoApprovalKeepsReviewedProfileAndExplicitRecalculationRefreshesIt() {
        long run = create(), fiscalLine = line(run, fiscal);
        var profile = mexicoProfiles.get(actor, fiscal).profile();
        mexicoProfiles.save(actor, fiscal, new com.indice.erp.hr.payroll.provider.mx.MexicoPayrollProfileService.SaveRequest(1, UUID.randomUUID(), profile));
        payroll.approveRun(actor, run);
        assertEquals("1", jdbc.queryForObject("SELECT JSON_UNQUOTE(JSON_EXTRACT(calculation_inputs_json, '$.countryProfile.metadata.mexicoProfileRevision')) FROM payroll_run_lines WHERE id=?", String.class, fiscalLine));
        assertThrows(IllegalArgumentException.class, () -> payroll.processRun(actor, run));
    }

    @Test
    void missingMexicoProfileBlocksBothUiAndAssistantApprovalButNotOperationalRuns() {
        // An employee created without a Mexican fiscal profile gets a reviewable draft, not approval.
        var fresh = employee("fiscal_payroll");
        for (var day : start.datesUntil(start.plusDays(6)).toList())
            attendance.updateDailyRecord(company, actor.userId(), fresh, day, Map.of("status", "on_time"));
        long run = create(), freshLine = line(run, fresh);
        assertEquals("MX_REVIEW_REQUIRED", jdbc.queryForObject("SELECT calculation_source FROM payroll_run_lines WHERE id=?", String.class, freshLine));
        assertThrows(IllegalArgumentException.class, () -> payroll.approveRun(actor, run));
        assertThrows(IllegalArgumentException.class, () -> payroll.prepareAssistantPayroll(actor, "approve_hr_payroll", run, null));
        change(run, freshLine, "operational_payroll");
        payroll.approveRun(actor, run);
        assertOperational(freshLine);
    }

    @Test
    void partialEmploymentPeriodCannotBeApprovedAsAFullRegisteredPeriod() {
        jdbc.update("UPDATE user_work_profiles SET hire_date=? WHERE company_id=? AND user_company_id=?", start.plusDays(2), company, fiscal);
        long run = create(), fiscalLine = line(run, fiscal);
        assertEquals("MX_REVIEW_REQUIRED", jdbc.queryForObject("SELECT calculation_source FROM payroll_run_lines WHERE id=?", String.class, fiscalLine));
        assertThrows(IllegalArgumentException.class, () -> payroll.approveRun(actor, run));
    }

    @Test
    void workedSundayCannotBeApprovedWithoutItsPremiumAndExemptions() {
        attendance.updateDailyRecord(company, actor.userId(), fiscal, start.plusDays(6), Map.of("status", "on_time"));
        long run = create(), fiscalLine = line(run, fiscal);
        assertEquals("MX_REVIEW_REQUIRED", jdbc.queryForObject("SELECT calculation_source FROM payroll_run_lines WHERE id=?", String.class, fiscalLine));
        assertThrows(IllegalArgumentException.class, () -> payroll.approveRun(actor, run));
        assertThrows(IllegalArgumentException.class, () -> payroll.prepareAssistantPayroll(actor, "approve_hr_payroll", run, null));
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
