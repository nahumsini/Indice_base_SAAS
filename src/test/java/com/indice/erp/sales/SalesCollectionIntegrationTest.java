package com.indice.erp.sales;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
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
class SalesCollectionIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired SalesService service;
    @Autowired com.indice.erp.kpis.currency.BasicModuleKpiCurrencyRepository monetary;
    long company, user, bank;
    String token;
    @BeforeEach void setup() {
        token = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", token);
        company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, token);
        jdbc.update("INSERT INTO users (email, password_hash) VALUES (?, 'isolated-no-login')", token + "@example.test");
        user = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, token + "@example.test");
        jdbc.update("INSERT INTO user_companies (user_id, company_id, role, status, visibility) VALUES (?, ?, 'admin', 'active', 'all')", user, company);
        jdbc.update("""
            INSERT INTO finance_payment_accounts (company_id, name, type, currency_code, current_balance, status)
            VALUES (?, ?, 'BANK', 'USD', 100, 'ACTIVE')
            """, company, token);
        bank = jdbc.queryForObject("SELECT id FROM finance_payment_accounts WHERE company_id = ?", Long.class, company);
    }
    @Test void approvalCollectsOnceInNativeCurrencyAndCancellationReversesWithHistory() {
        long id = sale("pending");
        assertThat(balance()).isEqualByComparingTo("100");
        service.update(company, user, "sales", id, Map.of("financeStatus", "approved"));
        service.update(company, user, "sales", id, Map.of("financeStatus", "approved"));
        assertThat(balance()).isEqualByComparingTo("216");
        assertThat(service.get(company, "sales", id).get("saleDate").toString()).isEqualTo("2026-08-31");
        assertThat(count()).isEqualTo(1);
        assertThat(collected(id)).isEqualByComparingTo("116");
        service.update(company, user, "sales", id, Map.of("commercialStatus", "cancelled"));
        service.update(company, user, "sales", id, Map.of("commercialStatus", "cancelled"));
        assertThat(balance()).isEqualByComparingTo("100");
        assertThat(count()).isEqualTo(2);
        assertThat(collected(id)).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM finance_payment_account_movements WHERE company_id = ? AND reversal_of_movement_id IS NOT NULL", Integer.class, company)).isEqualTo(1);
        assertThatThrownBy(() -> service.delete(company, "sales", id)).hasMessageContaining("historial");
    }
    @Test void alreadyApprovedHistoricalSaleNeverCreatesCashOnAnUnrelatedEdit() {
        long id = sale("pending");
        jdbc.update("UPDATE sales_records SET finance_status = 'approved' WHERE company_id = ? AND id = ?", company, id);
        service.update(company, user, "sales", id, Map.of("notes", "Review historical evidence"));
        assertThat(balance()).isEqualByComparingTo("100");
        assertThat(count()).isZero();
    }
    @Test void collectedFinancialAmountsCannotBeEditedBehindTheTreasuryMovement() {
        long id = sale("approved");
        assertThatThrownBy(() -> service.update(company, user, "sales", id, Map.of("totalAmount", new BigDecimal("999"))))
            .hasMessageContaining("venta cobrada");
        assertThat(balance()).isEqualByComparingTo("216");
    }
    private long sale(String status) {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("customerName", "Isolated test"); payload.put("saleDate", "2026-08-31");
        payload.put("totalAmount", new BigDecimal("116")); payload.put("subtotal", new BigDecimal("100"));
        payload.put("taxTotal", new BigDecimal("16")); payload.put("currency", "USD");
        payload.put("paymentMethod", "TRANSFER"); payload.put("commercialStatus", "approved");
        payload.put("financeStatus", status); payload.put("customFields", Map.of("paymentAccountId", String.valueOf(bank)));
        return ((Number) service.create(company, user, "sales", payload).get("id")).longValue();
    }
    private BigDecimal balance() { return jdbc.queryForObject("SELECT current_balance FROM finance_payment_accounts WHERE id = ?", BigDecimal.class, bank); }
    private BigDecimal collected(long id) {
        return monetary.load(com.indice.erp.kpis.currency.BasicModuleKpiMetric.SALES_COLLECTED, company,
                null, null, java.util.List.of(id), true).stream()
            .map(com.indice.erp.kpis.currency.KpiMoneyAmount::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
    private int count() { return jdbc.queryForObject("SELECT COUNT(*) FROM finance_payment_account_movements WHERE company_id = ?", Integer.class, company); }
}
