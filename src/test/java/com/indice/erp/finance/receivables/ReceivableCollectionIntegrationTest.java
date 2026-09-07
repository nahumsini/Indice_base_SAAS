package com.indice.erp.finance.receivables;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import com.indice.erp.finance.receivables.ReceivablesDtos.RegisterReceivablePaymentRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ReceivableCollectionIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ReceivablesService service;
    @Autowired ReceivablesRepository repository;
    FinanceContext context;
    long company, receivable, bank, wrongCurrencyBank;
    String token;
    @BeforeEach
    void prepare() {
        token = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", token);
        company = id("companies", "name", token);
        jdbc.update("INSERT INTO users (email, password_hash) VALUES (?, 'isolated-no-login')", token + "@example.test");
        long user = id("users", "email", token + "@example.test");
        context = new FinanceContext(user, company, "Authenticated collector", "admin", true, FinanceScope.corporateOffice());
        jdbc.update("""
            INSERT INTO finance_credit_sales
              (company_id, sale_number, customer_name, source, sale_date, original_amount, financed_amount,
               currency_code, status, selected_simulation_key, selected_simulation_name, term_months,
               monthly_payment_amount, total_payable_amount, first_due_date, due_date)
            VALUES (?, ?, ?, 'SALES', '2026-08-31', 300, 300, 'USD', 'ACTIVE', 'TEST', 'Test', 3,
                    100, 300, '2026-09-01', '2026-11-01')
            """, company, token, token);
        long creditSale = id("finance_credit_sales", "sale_number", token);
        jdbc.update("""
            INSERT INTO finance_receivable_accounts
              (company_id, credit_sale_id, sale_number, customer_name, original_amount, total_payable_amount,
               balance_amount, currency_code, due_date, next_payment_date, installment_amount, term_months, status)
            VALUES (?, ?, ?, ?, 300, 300, 300, 'USD', '2026-11-01', '2026-09-01', 100, 3, 'ON_TIME')
            """, company, creditSale, token, token);
        receivable = id("finance_receivable_accounts", "sale_number", token);
        repository.insertInstallments(context, repository.findReceivableAccount(context, receivable, LocalDate.of(2026, 9, 6)).orElseThrow(), LocalDate.of(2026, 9, 6));
        bank = bank("USD"); wrongCurrencyBank = bank("MXN");
        for (String currency : new String[]{"USD", "MXN"}) jdbc.update("""
            INSERT INTO finance_credit_policies
              (company_id, customer_name, currency_code, credit_line_amount, available_credit_amount, status)
            VALUES (?, ?, ?, 1000, 700, 'ACTIVE')
            """, company, token, currency);
    }
    @Test
    void partialPaymentUpdatesOneNativeAccountAndRetryCannotDuplicateCashOrCredit() {
        var request = payment(bank, "collection-key-1", "50");
        service.registerPayment(context, request);
        service.registerPayment(context, request);
        assertThat(money("finance_payment_accounts", "current_balance", bank)).isEqualByComparingTo("1050");
        assertThat(money("finance_payment_accounts", "current_balance", wrongCurrencyBank)).isEqualByComparingTo("1000");
        assertThat(money("finance_receivable_accounts", "balance_amount", receivable)).isEqualByComparingTo("250");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_receivable_payments WHERE company_id = ?", Integer.class, company)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT available_credit_amount FROM finance_credit_policies WHERE company_id = ? AND currency_code = 'USD'", BigDecimal.class, company)).isEqualByComparingTo("750");
        assertThat(jdbc.queryForObject("SELECT available_credit_amount FROM finance_credit_policies WHERE company_id = ? AND currency_code = 'MXN'", BigDecimal.class, company)).isEqualByComparingTo("700");
        assertThat(jdbc.queryForObject("SELECT registered_by_name FROM finance_receivable_payments WHERE company_id = ?", String.class, company)).isEqualTo("Authenticated collector");
        assertThatThrownBy(() -> service.registerPayment(context, payment(bank, "collection-key-1", "60")))
            .hasMessageContaining("different payment details");
    }
    @Test
    void rejectsCurrencyMismatchAndOverpaymentWithoutChangingEitherSubledger() {
        assertThatThrownBy(() -> service.registerPayment(context, payment(wrongCurrencyBank, "collection-key-2", "50")))
            .hasMessageContaining("Payment account");
        assertThatThrownBy(() -> service.registerPayment(context, payment(bank, "collection-key-3", "301")))
            .hasMessageContaining("cannot exceed balance");
        assertThat(money("finance_receivable_accounts", "balance_amount", receivable)).isEqualByComparingTo("300");
        assertThat(money("finance_payment_accounts", "current_balance", bank)).isEqualByComparingTo("1000");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_receivable_payments WHERE company_id = ?", Integer.class, company)).isZero();
    }
    private RegisterReceivablePaymentRequest payment(long account, String key, String amount) {
        return new RegisterReceivablePaymentRequest(receivable, LocalDate.of(2026, 9, 6), "TRANSFER",
            new BigDecimal(amount), "Test", "Client cannot impersonate actor", account, key, null);
    }
    private long bank(String currency) {
        jdbc.update("""
            INSERT INTO finance_payment_accounts (company_id, name, type, currency_code, current_balance, status)
            VALUES (?, ?, 'BANK', ?, 1000, 'ACTIVE')
            """, company, token + currency, currency);
        return id("finance_payment_accounts", "name", token + currency);
    }
    private long id(String table, String field, String value) {
        return jdbc.queryForObject("SELECT id FROM " + table + " WHERE " + field + " = ?", Long.class, value);
    }
    private BigDecimal money(String table, String field, long id) {
        return jdbc.queryForObject("SELECT " + field + " FROM " + table + " WHERE id = ?", BigDecimal.class, id);
    }
}
