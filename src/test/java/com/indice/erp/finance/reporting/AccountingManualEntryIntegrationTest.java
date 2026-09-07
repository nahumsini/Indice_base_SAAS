package com.indice.erp.finance.reporting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class AccountingManualEntryIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired AccountingManualEntryService entries;
    @Autowired FinancialLedgerRepository ledger;
    @Autowired FinancialReportingService reports;
    long company, user, cash, capital;
    @BeforeEach void setup() {
        String name = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", name);
        company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, name);
        user = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        ledger.ensureSettings(company, user); ledger.ensureStandardAccounts(company, user);
        cash = account("CASH"); capital = account("CONTRIBUTED_CAPITAL");
    }
    long account(String code) { return jdbc.queryForObject("SELECT id FROM finance_accounting_accounts WHERE company_id = ? AND system_code = ?", Long.class, company, code); }
    AccountingManualEntryService.EntryLine line(long account, String debit, String credit, String currency) {
        return new AccountingManualEntryService.EntryLine(account, null, null, currency, new BigDecimal(debit), new BigDecimal(credit));
    }
    AccountingManualEntryService.EntryRequest request(String key, List<AccountingManualEntryService.EntryLine> lines) {
        return new AccountingManualEntryService.EntryRequest("OPENING", LocalDate.of(2026, 1, 1), "Documented initial capital contribution", "SYNTHETIC-OPENING-001", key, lines);
    }
    @Test void explicitOpeningHasPreviewIdempotentPostingAndNoOperatingCashFlow() {
        var request = request(UUID.randomUUID().toString(), List.of(line(cash, "100", "0", "MXN"), line(capital, "0", "100", "MXN")));
        var preview = entries.preview(company, request);
        assertThat(preview.functionalTotal()).isEqualByComparingTo("100");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_journal_entries WHERE company_id = ?", Integer.class, company)).isZero();
        var post = new AccountingManualEntryService.PostRequest(request, preview.previewHash());
        var saved = entries.post(company, user, post);
        assertThat(saved.alreadyPosted()).isFalse();
        assertThat(entries.post(company, user, post)).isEqualTo(new AccountingManualEntryService.EntryResult(saved.entryId(), true));
        var report = reports.report(company, LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31), null, null);
        assertThat(report.headline().totalAssets()).isEqualByComparingTo("100");
        assertThat(report.headline().totalEquity()).isEqualByComparingTo("100");
        assertThat(report.headline().netCashChange()).isZero();
        assertThat(report.statements()).filteredOn(row -> "cash-flow".equals(row.id())).singleElement().satisfies(row -> assertThat(row.internallyConsistent()).isTrue());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_payment_accounts WHERE company_id = ?", Integer.class, company)).isZero();
    }
    @Test void refusesMixedCurrencyNettingForeignAccountsChangedPreviewAndClosedPeriods() {
        assertThatThrownBy(() -> entries.preview(company, request(UUID.randomUUID().toString(), List.of(line(cash, "100", "0", "USD"), line(capital, "0", "100", "CAD")))))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("cada moneda");
        assertThatThrownBy(() -> entries.preview(company, request(UUID.randomUUID().toString(), List.of(line(-1, "100", "0", "MXN"), line(capital, "0", "100", "MXN")))))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("cuenta");
        var request = request(UUID.randomUUID().toString(), List.of(line(cash, "100", "0", "MXN"), line(capital, "0", "100", "MXN")));
        var preview = entries.preview(company, request);
        assertThatThrownBy(() -> entries.post(company, user, new AccountingManualEntryService.PostRequest(request, "wrong")))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("vista previa");
        entries.post(company, user, new AccountingManualEntryService.PostRequest(request, preview.previewHash()));
        ledger.closePeriod(company, user, "2026-01");
        var another = request(UUID.randomUUID().toString(), request.lines());
        var anotherPreview = entries.preview(company, another);
        assertThatThrownBy(() -> entries.post(company, user, new AccountingManualEntryService.PostRequest(another, anotherPreview.previewHash())))
            .isInstanceOf(IllegalStateException.class);
    }
    @Test void reusingReferenceForChangedEntryCannotAlterTheOriginal() {
        String key = UUID.randomUUID().toString();
        var first = request(key, List.of(line(cash, "100", "0", "MXN"), line(capital, "0", "100", "MXN")));
        entries.post(company, user, new AccountingManualEntryService.PostRequest(first, entries.preview(company, first).previewHash()));
        var changed = request(key, List.of(line(cash, "200", "0", "MXN"), line(capital, "0", "200", "MXN")));
        assertThatThrownBy(() -> entries.post(company, user, new AccountingManualEntryService.PostRequest(changed, entries.preview(company, changed).previewHash())))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("otro asiento");
        assertThat(jdbc.queryForObject("SELECT SUM(debit_amount) FROM finance_journal_lines WHERE company_id = ?", BigDecimal.class, company)).isEqualByComparingTo("100");
    }
    @Test void currentAndFutureMonthsCannotBeClosedEarly() {
        var current = java.time.YearMonth.now(java.time.ZoneOffset.UTC);
        assertThatThrownBy(() -> reports.closePeriod(company, user, current.toString()))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("terminado");
        assertThatThrownBy(() -> reports.closePeriod(company, user, current.plusMonths(1).toString()))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("terminado");
    }

}
