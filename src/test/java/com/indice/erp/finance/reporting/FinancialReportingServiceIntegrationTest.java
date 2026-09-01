package com.indice.erp.finance.reporting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class FinancialReportingServiceIntegrationTest {

    @Autowired
    private FinancialReportingService reportingService;

    @Autowired
    private FinancialSynchronizationService synchronizationService;

    @Autowired
    private FinancialAnalyticsService analyticsService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void rendersTheFourPrimaryStatementsAndFailsClosedWithoutPostedActivity() {
        Long companyId = jdbcTemplate.queryForObject(
            "SELECT id FROM companies ORDER BY id LIMIT 1",
            Long.class
        );

        var report = reportingService.report(
            companyId,
            LocalDate.of(2026, 8, 1),
            LocalDate.of(2026, 8, 31),
            null,
            null
        );

        assertThat(report.context().functionalCurrency()).isEqualTo("MXN");
        assertThat(report.statements())
            .extracting(FinancialReportingContracts.FinancialStatement::id)
            .containsExactly("profit-loss", "financial-position", "cash-flow", "changes-equity");
        assertThat(report.readiness().decisionReady()).isFalse();
        assertThat(report.readiness().status()).isEqualTo("PRELIMINARY");
        assertThat(report.findings())
            .extracting(FinancialReportingContracts.QualityFinding::code)
            .contains("NO_ACCOUNTING_ACTIVITY");
    }

    @Test
    void synchronizesOperationalSourcesIntoBalancedPostedEntries() {
        Long companyId = jdbcTemplate.queryForObject(
            "SELECT id FROM companies ORDER BY id LIMIT 1",
            Long.class
        );
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM users ORDER BY id LIMIT 1",
            Long.class
        );
        insertApprovedExpense(companyId, "SYNC");

        var result = synchronizationService.synchronize(
            companyId,
            userId,
            LocalDate.of(2026, 8, 1),
            LocalDate.of(2026, 8, 31)
        );

        assertThat(result.discovered()).isGreaterThan(0);
        assertThat(result.posted()).isGreaterThan(0);
        Integer unbalanced = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM (
              SELECT entry.id
              FROM finance_journal_entries entry
              JOIN finance_journal_lines line
                ON line.entry_id = entry.id AND line.company_id = entry.company_id
              WHERE entry.company_id = ? AND entry.status = 'POSTED'
              GROUP BY entry.id
              HAVING ABS(SUM(line.debit_amount) - SUM(line.credit_amount)) > 0.0001
            ) imbalance
            """, Integer.class, companyId);
        assertThat(unbalanced).isZero();

        var report = reportingService.report(
            companyId,
            LocalDate.of(2026, 8, 1),
            LocalDate.of(2026, 8, 31),
            null,
            null
        );
        assertThat(report.readiness().postedEntries()).isEqualTo(result.posted());
        assertThat(report.trialBalance()).isNotEmpty();
    }

    @Test
    void buildsAuthoritativeAnalyticsAndPagedAccountDrilldown() {
        Long companyId = jdbcTemplate.queryForObject(
            "SELECT id FROM companies ORDER BY id LIMIT 1",
            Long.class
        );
        Long userId = jdbcTemplate.queryForObject(
            "SELECT id FROM users ORDER BY id LIMIT 1",
            Long.class
        );
        insertApprovedExpense(companyId, "ANALYTICS");
        var from = LocalDate.of(2026, 8, 1);
        var to = LocalDate.of(2026, 8, 31);
        synchronizationService.synchronize(companyId, userId, from, to);

        var analytics = analyticsService.analytics(companyId, from, to, null, null, 12);

        assertThat(analytics.kpis()).hasSize(8);
        assertThat(analytics.kpis())
            .extracting(FinancialAnalyticsContracts.FinancialKpi::id)
            .containsExactly(
                "REVENUE", "GROSS_PROFIT", "OPERATING_PROFIT", "NET_MARGIN",
                "CLOSING_CASH", "WORKING_CAPITAL", "CURRENT_RATIO", "ACCOUNTING_COVERAGE"
            );
        assertThat(analytics.monthlyTrend()).hasSize(12);
        assertThat(analytics.profitBridge()).isNotEmpty();
        assertThat(analytics.insights()).hasSizeBetween(1, 3);

        var report = reportingService.report(companyId, from, to, null, null);
        long accountId = report.trialBalance().getFirst().accountId();
        var drilldown = analyticsService.drilldown(
            companyId, from, to, null, null, "ACCOUNT", Long.toString(accountId),
            0, 10, "entryDate", "desc"
        );

        assertThat(drilldown.subject().type()).isEqualTo("ACCOUNT");
        assertThat(drilldown.rows()).isNotEmpty();
        assertThat(drilldown.rows()).allMatch(row -> row.accountId() == accountId);
        assertThat(drilldown.totalRows()).isGreaterThanOrEqualTo(drilldown.rows().size());
        assertThat(drilldown.pageSize()).isEqualTo(10);
    }

    @Test
    void rejectsForeignOrganizationScopeAndUnboundedDrilldownPages() {
        Long companyId = jdbcTemplate.queryForObject(
            "SELECT id FROM companies ORDER BY id LIMIT 1",
            Long.class
        );
        var from = LocalDate.of(2026, 8, 1);
        var to = LocalDate.of(2026, 8, 31);

        assertThatThrownBy(() -> analyticsService.analytics(companyId, from, to, Long.MAX_VALUE, null, 12))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("outside the authenticated company");
        assertThatThrownBy(() -> analyticsService.drilldown(
            companyId, from, to, null, null, "STATEMENT_LINE", "REVENUE",
            0, 500, "entryDate", "desc"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("pageSize");
    }

    private void insertApprovedExpense(long companyId, String suffix) {
        jdbcTemplate.update("""
            INSERT INTO finance_expenses
              (company_id, folio, concept, expense_type, subtotal_amount, tax_amount,
               total_amount, paid_amount, balance_amount, currency_code, expense_date,
               status, payment_status)
            VALUES (?, ?, 'Fixture contable verificable', 'VARIABLE', 100.0000, 0.0000,
                    100.0000, 0.0000, 100.0000, 'MXN', '2026-08-15',
                    'APPROVED', 'UNPAID')
            """, companyId, "FIN-REPORT-" + suffix);
    }
}
