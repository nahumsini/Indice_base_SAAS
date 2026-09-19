package com.indice.erp.kpis.currency;

import static org.assertj.core.api.Assertions.assertThat;
import com.indice.erp.hr.HrOperationalScope;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.jdbc.JdbcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

@JdbcTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(BasicModuleKpiCurrencyRepository.class)
class PettyCashKpiCurrencyIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired BasicModuleKpiCurrencyRepository repository;
    long company, otherCompany, unit, business, fund, internal, external;

    @BeforeEach void fixture() {
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, key);
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key + "-other");
        otherCompany = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, key + "-other");
        jdbc.update("INSERT INTO units (company_id, name, status) VALUES (?, 'Synthetic unit', 'active')", company);
        unit = jdbc.queryForObject("SELECT id FROM units WHERE company_id = ?", Long.class, company);
        jdbc.update("INSERT INTO businesses (company_id, unit_id, name, status) VALUES (?, ?, 'Synthetic business', 'active')", company, unit);
        business = jdbc.queryForObject("SELECT id FROM businesses WHERE company_id = ?", Long.class, company);
        jdbc.update("""
            INSERT INTO finance_petty_cash_funds (company_id, unit_id, business_id, name, currency_code, current_balance_amount, status, fund_type)
            VALUES (?, ?, ?, 'Synthetic custody', 'MXN', -25.25, 'OPEN', 'EXTERNAL_MANAGED')
            """, company, unit, business);
        fund = jdbc.queryForObject("SELECT id FROM finance_petty_cash_funds WHERE company_id = ?", Long.class, company);
        internal = statement("internal", "2026-08", "INTERNAL_COMPANY", 0);
        external = statement("external", "2026-09", "EXTERNAL_MANAGED", 1);
    }
    long statement(String folio, String period, String type, int stage) {
        jdbc.update("""
            INSERT INTO finance_petty_cash_statements (company_id, petty_cash_fund_id, folio, period_key, period_start, period_end,
              cut_off_date, assigned_amount, additional_deposit_amount, opening_balance_amount, shortage_amount, currency_code, status, fund_type_snapshot, type_stage_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, 100, 25, 999, 7, 'MXN', 'OPEN', ?, ?)
            """, company, fund, folio, period, period + "-01", period + "-28", period + "-28", type, stage);
        return jdbc.queryForObject("SELECT id FROM finance_petty_cash_statements WHERE company_id = ? AND folio = ?", Long.class, company, folio);
    }
    long receipt(long owner, long statement, String status, int amount) {
        String description = UUID.randomUUID().toString();
        jdbc.update("""
            INSERT INTO finance_petty_cash_settlement_lines (company_id, petty_cash_fund_id, petty_cash_statement_id,
              description, total_amount, currency_code, expense_date, status)
            VALUES (?, ?, ?, ?, ?, 'MXN', '2026-09-05', ?)
            """, owner, fund, statement, description, amount, status);
        return jdbc.queryForObject("SELECT id FROM finance_petty_cash_settlement_lines WHERE description = ?", Long.class, description);
    }
    BigDecimal sum(BasicModuleKpiMetric metric, List<Long> ids) {
        return repository.load(metric, company, null, null, ids, true).stream().map(KpiMoneyAmount::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    @Test void snapshotsDriveAuthorizationAfterFundOwnershipChangesAndDoNotDependOnAttachments() {
        long posted = receipt(company, internal, "EXPENSE_CREATED", 30);
        long validatedInternal = receipt(company, internal, "VALIDATED", 10);
        long validatedExternal = receipt(company, external, "VALIDATED", 50);
        long draft = receipt(company, external, "DRAFT", 20);
        long rejected = receipt(company, external, "REJECTED", 800);
        long reversed = receipt(company, external, "REVERSED", 900);
        var ids = List.of(posted, validatedInternal, validatedExternal, draft, rejected, reversed);
        assertThat(sum(BasicModuleKpiMetric.PETTY_CASH_CUSTODY_SETTLEMENT_AMOUNT, ids)).isEqualByComparingTo("110");
        assertThat(sum(BasicModuleKpiMetric.PETTY_CASH_CUSTODY_SETTLEMENT_AUTHORIZED, ids)).isEqualByComparingTo("80");
        assertThat(sum(BasicModuleKpiMetric.PETTY_CASH_CUSTODY_SETTLEMENT_PENDING, ids)).isEqualByComparingTo("30");
        assertThat(sum(BasicModuleKpiMetric.PETTY_CASH_SETTLEMENT_AMOUNT, ids)).isEqualByComparingTo("40");
        assertThat(sum(BasicModuleKpiMetric.PETTY_CASH_CUSTODY_SETTLEMENT_AMOUNT, List.of())).isZero();
    }
    @Test void arbitraryIdsCannotCrossCompanyOrOrganizationalScopeAndDeletedRowsDoNotContribute() {
        long receipt = receipt(company, external, "VALIDATED", 50);
        long malformed = receipt(otherCompany, external, "VALIDATED", 500);
        var ids = List.of(receipt, malformed);
        var metric = BasicModuleKpiMetric.PETTY_CASH_CUSTODY_SETTLEMENT_AUTHORIZED;
        assertThat(sum(metric, ids)).isEqualByComparingTo("50");
        assertThat(repository.load(metric, otherCompany, null, null, ids, true)).isEmpty();
        for (var scope : List.of(HrOperationalScope.unassigned(), HrOperationalScope.unitHeadquarters(unit + 100000), HrOperationalScope.businessOffice(unit, business + 100000))) {
            assertThat(repository.load(metric, company, null, null, ids, true, LocalDate.of(2026, 9, 15), ZoneOffset.UTC, scope)).isEmpty();
        }
        for (var scope : List.of(HrOperationalScope.unitHeadquarters(unit), HrOperationalScope.businessOffice(unit, business))) {
            assertThat(repository.load(metric, company, null, null, ids, true, LocalDate.of(2026, 9, 15), ZoneOffset.UTC, scope)).hasSize(1);
        }
        jdbc.update("UPDATE finance_petty_cash_statements SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", external);
        assertThat(sum(metric, ids)).isZero();
    }
    @Test void currentCustodyKeepsNegativeBalancesAndLegacyCompanyMetricStaysCompanyOnly() {
        assertThat(sum(BasicModuleKpiMetric.PETTY_CASH_CUSTODY_BALANCE, List.of(fund))).isEqualByComparingTo("-25.25");
        assertThat(sum(BasicModuleKpiMetric.PETTY_CASH_BALANCE, List.of(fund))).isZero();
        jdbc.update("UPDATE finance_petty_cash_funds SET status = 'CLOSED' WHERE id = ?", fund);
        assertThat(sum(BasicModuleKpiMetric.PETTY_CASH_CUSTODY_BALANCE, List.of(fund))).isZero();
    }
    @Test void deliveredFundsExcludeOpeningCarryAndHistoricalShortagesKeepTheirSnapshotOwner() {
        assertThat(sum(BasicModuleKpiMetric.PETTY_CASH_CUSTODY_STATEMENT_FUNDED, List.of(internal, external))).isEqualByComparingTo("250");
        assertThat(sum(BasicModuleKpiMetric.PETTY_CASH_STATEMENT_FUNDED, List.of(internal, external))).isEqualByComparingTo("125");
        assertThat(sum(BasicModuleKpiMetric.PETTY_CASH_CUSTODY_STATEMENT_SHORTAGE, List.of(external))).isEqualByComparingTo("7");
        assertThat(sum(BasicModuleKpiMetric.PETTY_CASH_STATEMENT_SHORTAGE, List.of(external))).isZero();
    }
}
