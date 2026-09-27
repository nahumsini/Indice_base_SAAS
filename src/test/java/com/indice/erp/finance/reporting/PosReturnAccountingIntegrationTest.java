package com.indice.erp.finance.reporting;

import static org.assertj.core.api.Assertions.*;
import com.indice.erp.pos.*;
import com.indice.erp.pos.checkout.CheckoutExecutionService;
import com.indice.erp.pos.checkout.dto.*;
import com.indice.erp.pos.returns.*;
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
class PosReturnAccountingIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired CheckoutExecutionService checkout;
    @Autowired PosReturnService returns;
    @Autowired AccountingSourceRepository sources;
    @Autowired FinancialSynchronizationService synchronization;
    @Autowired FinancialReportingService reporting;
    long company, user, ticket, sale;
    LocalDate date;
    PosContext context;

    @BeforeEach void setup() {
        assertThat(jdbc.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, key);
        user = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        context = new PosContext(user, company, "Synthetic administrator", "admin", true, PosScope.corporateOffice());
        jdbc.update("INSERT INTO user_companies (company_id, user_id, role, status, visibility) VALUES (?, ?, 'admin', 'active', 'all')", company, user);
        jdbc.update("INSERT INTO units (company_id, name) VALUES (?, 'Return test')", company); long unit = last("units");
        jdbc.update("INSERT INTO businesses (company_id, unit_id, name) VALUES (?, ?, 'Return test')", company, unit); long business = last("businesses");
        jdbc.update("INSERT INTO sales_inventory_warehouses (company_id, warehouse_code, name, type, status, business_unit_id, business_id) VALUES (?, ?, 'Return test', 'main', 'active', ?, ?)", company, key, unit, business); long warehouse = last("sales_inventory_warehouses");
        jdbc.update("INSERT INTO pos_cash_registers (company_id, warehouse_id, unit_id, business_id, code, name, status, is_active, created_by_user_id) VALUES (?, ?, ?, ?, 'RETURN', 'Return test', 'ACTIVE', 1, ?)", company, warehouse, unit, business, user); long register = last("pos_cash_registers");
        jdbc.update("INSERT INTO pos_shifts (company_id, unit_id, business_id, warehouse_id, cash_register_id, opened_by_user_id, created_by_user_id, status, currency_code, opening_amount, expected_cash_amount) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', 'MXN', 500, 500)", company, unit, business, warehouse, register, user, user);
        jdbc.update("INSERT INTO sales_products (company_id, product_code, sku, name, type, currency, cost, status, inventory_ready) VALUES (?, ?, ?, 'Return test', 'PRODUCT', 'MXN', 8, 'active', 1)", company, key, key); long product = last("sales_products");
        jdbc.update("INSERT INTO sales_inventory_balances (company_id, balance_code, product_id, warehouse_id, warehouse_name, available_quantity, unit_cost, uses_inventory) VALUES (?, ?, ?, ?, 'Return test', 5, 8, 1)", company, key, product, warehouse);
        var response = checkout.execute(context, UUID.randomUUID().toString(), new PosCheckoutRequest(register, null, "MXN",
                List.of(new PosCheckoutItemRequest(product, "Return test", null, "PRODUCT", BigDecimal.ONE, BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO)),
                List.of(new PosCheckoutPaymentRequest("CASH", null, BigDecimal.TEN, null)), null));
        ticket = response.ticket().id(); sale = response.ticket().salesRecordId();
        date = jdbc.queryForObject("SELECT sale_date FROM sales_records WHERE company_id = ? AND id = ?", LocalDate.class, company, sale);
    }

    @Test void pendingReturnExcludesTheSaleAndBlocksFinancialReadiness() {
        assertThat(sources.findSales(company, date, date)).hasSize(1);
        returns.prepare(context, request());
        assertThat(sources.findSales(company, date, date)).isEmpty();
        assertThat(sources.pendingPosReturns(company, date, date)).extracting(item -> item.code()).containsExactly("PENDING_POS_RETURN");
        var sync = synchronization.synchronize(company, user, date, date);
        assertThat(sync.posted()).isZero();
        assertThat(sync.blocked()).isPositive();
        var report = reporting.report(company, date, date, null, null);
        assertThat(report.readiness().decisionReady()).isFalse();
        assertThat(report.findings()).extracting(item -> item.code()).contains("PENDING_POS_RETURN");
        assertThat(report.sourceCoverage()).anyMatch(item -> "sales".equals(item.module()) && item.blocked() > 0);
    }

    @Test void completedReturnDoesNotPostTheCancelledSale() {
        var prepared = returns.prepare(context, request());
        returns.confirmManual(context, prepared.id(), new PosReturnDtos.ConfirmRequest(true, Map.of()));
        assertThat(sources.findSales(company, date, date)).isEmpty();
        assertThat(sources.pendingPosReturns(company, date, date)).isEmpty();
        assertThat(synchronization.synchronize(company, user, date, date).posted()).isZero();
    }

    @Test void postedSaleRequiresAFinancialReversalNotAnOperationalReturn() {
        assertThat(synchronization.synchronize(company, user, date, date).posted()).isEqualTo(1);
        assertThatThrownBy(() -> returns.prepare(context, request())).hasMessageContaining("reversión financiera");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM pos_returns WHERE company_id = ?", Integer.class, company)).isZero();
    }

    private PosReturnDtos.PrepareRequest request() {
        return new PosReturnDtos.PrepareRequest(ticket, "Full synthetic return", true, UUID.randomUUID().toString());
    }
    private long last(String table) { return jdbc.queryForObject("SELECT MAX(id) FROM " + table + " WHERE company_id = ?", Long.class, company); }
}
