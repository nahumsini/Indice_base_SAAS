package com.indice.erp.finance.reporting;

import static org.assertj.core.api.Assertions.assertThat;
import com.indice.erp.exchange.BusinessExchangeRateSnapshotRepository;
import com.indice.erp.exchange.BusinessExchangeRateSourceResponse;
import com.indice.erp.exchange.BusinessExchangeRatesResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class AccountingForeignCurrencyIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired FinancialSynchronizationService sync;
    @Autowired FinancialReportingService reports;
    @Autowired BusinessExchangeRateSnapshotRepository snapshots;
    @Autowired FinancialPerformanceProjectionService performance;

    @Test void preservesNativeAmountsAndRecognizesTheRealizedDifferenceAtThePaymentDate() {
        String token = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", token);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, token);
        long user = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        var recognition = LocalDate.of(2001, 1, 1);
        var payment = recognition.plusDays(1);
        rate(recognition, "20"); rate(payment, "21");
        jdbc.update("""
            INSERT INTO finance_expenses (company_id, folio, concept, expense_type, subtotal_amount,
              total_amount, paid_amount, balance_amount, currency_code, expense_date, payment_date, status, payment_status)
            VALUES (?, ?, 'Historical FX test', 'VARIABLE', 100, 100, 40, 60, 'USD', ?, ?, 'PARTIALLY_PAID', 'PARTIALLY_PAID')
            """, company, token, recognition, payment);
        long expense = jdbc.queryForObject("SELECT id FROM finance_expenses WHERE company_id = ?", Long.class, company);
        jdbc.update("""
            INSERT INTO finance_expense_payments (company_id, expense_id, amount, currency_code, payment_date,
              source, idempotency_key, registered_by_user_id)
            VALUES (?, ?, 40, 'USD', ?, 'RECORDED', ?, ?)
            """, company, expense, payment, token, user);

        var first = sync.synchronize(company, user, recognition, payment);
        assertThat(first.blocked()).isZero();
        assertThat(first.posted()).isEqualTo(2);
        assertThat(sync.synchronize(company, user, recognition, payment).posted()).isZero();
        assertThat(balance(company, "ACCOUNTS_PAYABLE")).isEqualByComparingTo("-1200");
        assertThat(balance(company, "CASH")).isEqualByComparingTo("-840");
        assertThat(balance(company, "REALIZED_EXCHANGE_LOSS")).isEqualByComparingTo("40");
        assertThat(balance(company, "OPERATING_EXPENSES")).isEqualByComparingTo("2000");
        assertThat(jdbc.queryForObject("SELECT SUM(debit_amount - credit_amount) FROM finance_journal_lines WHERE company_id = ?", BigDecimal.class, company)).isEqualByComparingTo("0");
        assertThat(jdbc.queryForObject("SELECT total_amount FROM finance_expenses WHERE id = ?", BigDecimal.class, expense)).isEqualByComparingTo("100");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_journal_lines WHERE company_id = ? AND transaction_currency = 'USD' AND transaction_amount = 40", Integer.class, company)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_journal_entries WHERE company_id = ? AND JSON_LENGTH(exchange_rate_evidence_json) > 0", Integer.class, company)).isEqualTo(2);
        assertThat(performance.project(company, recognition, payment, null, null)).singleElement().satisfies(row -> {
            assertThat(row.operatingProfit()).isEqualByComparingTo("-2000");
            assertThat(row.recognizedOperatingExpenses()).isEqualByComparingTo("2000");
            assertThat(row.profitReady()).isTrue();
        });
        var report = reports.report(company, recognition, payment, null, null);
        assertThat(report.statements().getFirst().lines()).anySatisfy(line -> {
            assertThat(line.code()).isEqualTo("NET_PROFIT");
            assertThat(line.current()).isEqualByComparingTo("-2040");
        });
    }
    private BigDecimal balance(long company, String account) {
        return jdbc.queryForObject("""
            SELECT SUM(line.debit_amount - line.credit_amount) FROM finance_journal_lines line
            JOIN finance_accounting_accounts account ON account.company_id = line.company_id AND account.id = line.account_id
            WHERE line.company_id = ? AND account.system_code = ?
            """, BigDecimal.class, company, account);
    }
    private void rate(LocalDate date, String value) {
        var amount = new BigDecimal(value);
        snapshots.save(date, new BusinessExchangeRatesResponse("USD", Map.of("USD", BigDecimal.ONE, "MXN", amount), null,
            List.of(new BusinessExchangeRateSourceResponse("MXN", amount, date.toString(), "Isolated fixture", "Historical test",
                "https://example.test/fx", "", "official", "Isolated deterministic fixture")), List.of()));
    }
}
