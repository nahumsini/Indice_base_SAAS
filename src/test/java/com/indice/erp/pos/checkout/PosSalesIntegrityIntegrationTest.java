package com.indice.erp.pos.checkout;

import static org.assertj.core.api.Assertions.*;
import com.indice.erp.pos.*;
import com.indice.erp.pos.checkout.dto.*;
import com.indice.erp.sales.SalesService;
import java.math.BigDecimal;
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
class PosSalesIntegrityIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired CheckoutExecutionService checkout;
    @Autowired SalesService sales;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper json;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    @Autowired com.indice.erp.pos.returns.PosReturnService returns;
    @Autowired com.indice.erp.pos.returns.PosReturnRepository returnRepository;
    @Autowired com.indice.erp.pos.cashclosing.CashClosingRepository closings;
    @Autowired com.indice.erp.pos.shift.ShiftRepository shifts;
    long company, user, unit, business, warehouse, register, shift, product;
    PosContext context;

    @BeforeEach void setup() {
        assertThat(jdbc.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO companies (name) VALUES (?)", key);
        company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, key);
        user = jdbc.queryForObject("SELECT id FROM users ORDER BY id LIMIT 1", Long.class);
        context = new PosContext(user, company, "Synthetic cashier", "admin", true, PosScope.corporateOffice());
        jdbc.update("INSERT INTO user_companies (company_id, user_id, role, status, visibility) VALUES (?, ?, 'admin', 'active', 'all')", company, user);
        jdbc.update("INSERT INTO units (company_id, name) VALUES (?, 'Integrity unit')", company); unit = last("units");
        jdbc.update("INSERT INTO businesses (company_id, unit_id, name) VALUES (?, ?, 'Integrity business')", company, unit); business = last("businesses");
        jdbc.update("INSERT INTO sales_inventory_warehouses (company_id, warehouse_code, name, type, status, business_unit_id, business_id) VALUES (?, ?, 'Integrity warehouse', 'main', 'active', ?, ?)", company, key, unit, business); warehouse = last("sales_inventory_warehouses");
        jdbc.update("INSERT INTO pos_cash_registers (company_id, warehouse_id, unit_id, business_id, code, name, status, is_active, created_by_user_id) VALUES (?, ?, ?, ?, 'INTEGRITY', 'Integrity register', 'ACTIVE', 1, ?)", company, warehouse, unit, business, user); register = last("pos_cash_registers");
        jdbc.update("INSERT INTO pos_shifts (company_id, unit_id, business_id, warehouse_id, cash_register_id, opened_by_user_id, created_by_user_id, status, currency_code, opening_amount, expected_cash_amount) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', 'MXN', 500, 500)", company, unit, business, warehouse, register, user, user); shift = last("pos_shifts");
        jdbc.update("INSERT INTO sales_products (company_id, product_code, sku, name, type, currency, cost, status, inventory_ready) VALUES (?, ?, ?, 'Integrity stock', 'PRODUCT', 'MXN', 8, 'active', 1)", company, key, key); product = last("sales_products");
        jdbc.update("INSERT INTO sales_inventory_balances (company_id, balance_code, product_id, warehouse_id, warehouse_name, available_quantity, unit_cost, uses_inventory) VALUES (?, ?, ?, ?, 'Integrity warehouse', 5, 8, 1)", company, key, product, warehouse);
    }

    @Test void lostResponseRetryReturnsSameTicketWithoutRepeatingAnyEffect() {
        String key = UUID.randomUUID().toString();
        var first = checkout.execute(context, key, request("2"));
        var replay = checkout.execute(context, key, request("2"));
        assertSameReceipt(replay, first);
        assertSameReceipt(checkout.recover(context, key), first);
        assertThat(count("sales_records")).isEqualTo(1);
        assertThat(count("pos_tickets")).isEqualTo(1);
        assertThat(count("pos_payments")).isEqualTo(1);
        assertThat(count("sales_inventory_movements")).isEqualTo(1);
        assertThat(count("pos_checkout_requests")).isEqualTo(1);
        assertThat(stock()).isEqualByComparingTo("3");
        assertThat(jdbc.queryForObject("SELECT expected_cash_amount FROM pos_shifts WHERE company_id = ? AND id = ?", BigDecimal.class, company, shift)).isEqualByComparingTo("520");
        var summary = sales.get(company, "sales", first.ticket().salesRecordId());
        assertThat(summary).containsEntry("sourceType", "POS");
        var listed = (List<?>) sales.list(company, "sales", Map.of()).get("items");
        assertThat(((Map<?, ?>) listed.getFirst()).get("sourceType")).isEqualTo("POS");
        assertThat(new BigDecimal(summary.get("totalAmount").toString())).isEqualByComparingTo(first.ticket().totalAmount());
    }

    @Test void changedPayloadOrActorCannotReuseACommittedAttempt() {
        String key = UUID.randomUUID().toString();
        checkout.execute(context, key, request("1"));
        assertThatThrownBy(() -> checkout.execute(context, key, request("2"))).isInstanceOf(PosApiException.class);
        var other = new PosContext(user + 99999, company, "Other", "admin", true, PosScope.corporateOffice());
        assertThatThrownBy(() -> checkout.execute(other, key, request("1"))).isInstanceOf(PosApiException.class);
        assertThat(count("pos_tickets")).isEqualTo(1);
        assertThat(stock()).isEqualByComparingTo("4");
    }

    @Test void everyGenericSaleMutationIsBlockedForPosIncludingStockAndScope() {
        var ticket = checkout.execute(context, UUID.randomUUID().toString(), request("1")).ticket();
        for (var patch : List.<Map<String, Object>>of(
                Map.of("totalAmount", 1), Map.of("currency", "USD"),
                Map.of("saleLines", List.of()), Map.of("inventoryStatus", "approved"),
                Map.of("commercialStatus", "cancelled"), Map.of("financeStatus", "approved"),
                Map.of("unitId", unit + 1), Map.of("notes", "overwrite"),
                Map.of("sourceType", "SALES"))) {
            assertThatThrownBy(() -> sales.update(company, user, "sales", ticket.salesRecordId(), patch))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("solo lectura");
        }
        assertThatThrownBy(() -> sales.delete(company, "sales", ticket.salesRecordId())).hasMessageContaining("POS");
        assertThat(stock()).isEqualByComparingTo("4");
        assertThat(jdbc.queryForObject("SELECT total_amount FROM sales_records WHERE company_id = ? AND id = ?", BigDecimal.class, company, ticket.salesRecordId())).isEqualByComparingTo("10");
    }

    @Test void replayRechecksScopeAndClosedShiftCannotAcceptNewSale() {
        String key = UUID.randomUUID().toString();
        var first = checkout.execute(context, key, request("1"));
        var otherScope = new PosContext(user, company, "Synthetic cashier", "admin", true, PosScope.unitHeadquarters(unit + 100000));
        assertThatThrownBy(() -> checkout.execute(otherScope, key, request("1"))).isInstanceOf(PosApiException.class);
        jdbc.update("UPDATE pos_shifts SET status = 'CLOSED' WHERE company_id = ? AND id = ?", company, shift);
        assertSameReceipt(checkout.execute(context, key, request("1")), first);
        assertThatThrownBy(() -> checkout.execute(context, UUID.randomUUID().toString(), request("1"))).hasMessageContaining("Open shift");
        assertThat(count("pos_tickets")).isEqualTo(1);
    }

    @Test void partialStockFailureRollsBackSummaryTicketMovementsCashAndRetryReceipt() {
        var attempt = new org.springframework.transaction.support.TransactionTemplate(transactions);
        attempt.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);
        var item = request("3").items().getFirst();
        var invalid = new PosCheckoutRequest(register, null, "MXN", List.of(item, item),
                List.of(new PosCheckoutPaymentRequest("CASH", null, new BigDecimal("60"), null)), null);
        String key = UUID.randomUUID().toString();
        assertThatThrownBy(() -> attempt.execute(status -> checkout.execute(context, key, invalid)))
                .isInstanceOf(PosApiException.class).hasMessageContaining("Insufficient stock");
        assertThat(count("pos_tickets")).isZero();
        assertThat(count("sales_records")).isZero();
        assertThat(count("pos_payments")).isZero();
        assertThat(count("sales_inventory_movements")).isZero();
        assertThat(count("pos_checkout_requests")).isZero();
        assertThat(stock()).isEqualByComparingTo("5");
        assertThat(jdbc.queryForObject("SELECT expected_cash_amount FROM pos_shifts WHERE company_id = ? AND id = ?", BigDecimal.class, company, shift)).isEqualByComparingTo("500");
    }

    @Test void databaseRejectsTwoTicketsForOneCommercialSummary() {
        var first = checkout.execute(context, UUID.randomUUID().toString(), request("1")).ticket();
        var second = checkout.execute(context, UUID.randomUUID().toString(), request("1")).ticket();
        assertThatThrownBy(() -> jdbc.update("UPDATE pos_tickets SET sales_record_id = ? WHERE company_id = ? AND id = ?",
                first.salesRecordId(), company, second.id())).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test void recoveryIsTenantAndActorScoped() {
        String key = UUID.randomUUID().toString();
        checkout.execute(context, key, request("1"));
        var otherTenant = new PosContext(user, company + 100000, "Other", "admin", true, PosScope.corporateOffice());
        var otherActor = new PosContext(user + 100000, company, "Other", "admin", true, PosScope.corporateOffice());
        assertThatThrownBy(() -> checkout.recover(otherTenant, key)).isInstanceOf(PosApiException.class);
        assertThatThrownBy(() -> checkout.recover(otherActor, key)).isInstanceOf(PosApiException.class);
    }

    @Test void fullCashReturnRestoresHistoricalStockAndCashExactlyOnce() {
        var ticket = checkout.execute(context, UUID.randomUUID().toString(), request("2")).ticket();
        var prepared = returns.prepare(context, returnRequest(ticket.id()));
        assertThat(prepared.status()).isEqualTo("PREPARED");
        assertThat(stock()).isEqualByComparingTo("3");
        assertThatThrownBy(() -> closings.requireNoPendingReturns(context, shift)).hasMessageContaining("pendiente");
        assertThatThrownBy(() -> shifts.requireNoPendingReturn(context, shift)).hasMessageContaining("pendiente");
        // A later purchase changed the cost; the return must add the original 2 * 8, not 2 * 12.
        jdbc.update("UPDATE sales_inventory_balances SET unit_cost = 12 WHERE company_id = ? AND product_id = ?", company, product);
        var confirmed = returns.confirmManual(context, prepared.id(), new com.indice.erp.pos.returns.PosReturnDtos.ConfirmRequest(true, Map.of()));
        assertThat(confirmed.status()).isEqualTo("COMPLETED");
        assertThat(confirmed.payments()).allMatch(p -> "CASH".equals(p.paymentMethod()) && "COMPLETED".equals(p.status()));
        returns.confirmManual(context, prepared.id(), new com.indice.erp.pos.returns.PosReturnDtos.ConfirmRequest(true, Map.of()));
        assertThat(stock()).isEqualByComparingTo("5");
        assertThat(jdbc.queryForObject("SELECT unit_cost FROM sales_inventory_balances WHERE company_id = ? AND product_id = ?", BigDecimal.class, company, product)).isEqualByComparingTo("10.4");
        assertThat(jdbc.queryForObject("SELECT expected_cash_amount FROM pos_shifts WHERE company_id = ? AND id = ?", BigDecimal.class, company, shift)).isEqualByComparingTo("500");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_inventory_movements WHERE company_id = ? AND movement_type = 'POS_SALE_RETURN'", Integer.class, company)).isEqualTo(1);
        assertThat(sales.get(company, "sales", ticket.salesRecordId())).containsEntry("commercialStatus", "cancelled");
        var summary = closings.calculateAmounts(context, shifts.findById(context, shift).orElseThrow());
        assertThat(summary.totalRefundsAmount()).isEqualByComparingTo("20");
        assertThat(summary.totalSalesAmount()).isZero();
        assertThat(summary.expectedCashAmount()).isEqualByComparingTo("500");
        closings.requireNoPendingReturns(context, shift);
    }

    @Test void mixedCashTransferReturnRequiresEvidenceAndNeverChangesThePaymentMethods() {
        var original = request("2");
        var mixed = new PosCheckoutRequest(register, null, "MXN", original.items(), List.of(
                new PosCheckoutPaymentRequest("CASH", null, new BigDecimal("5"), null),
                new PosCheckoutPaymentRequest("TRANSFER", null, new BigDecimal("15"), "Original transfer")), null);
        var ticket = checkout.execute(context, UUID.randomUUID().toString(), mixed).ticket();
        var prepared = returns.prepare(context, returnRequest(ticket.id()));
        var transfer = prepared.payments().stream().filter(p -> "TRANSFER".equals(p.paymentMethod())).findFirst().orElseThrow();
        assertThatThrownBy(() -> returns.confirmManual(context, prepared.id(),
                new com.indice.erp.pos.returns.PosReturnDtos.ConfirmRequest(false, Map.of()))).hasMessageContaining("efectivo");
        assertThatThrownBy(() -> returns.confirmManual(context, prepared.id(),
                new com.indice.erp.pos.returns.PosReturnDtos.ConfirmRequest(true, Map.of()))).hasMessageContaining("transferencia");
        assertThat(returnRepository.get(context, prepared.id()).payments()).allMatch(p -> "PENDING".equals(p.status()));
        // Validate all evidence before any confirmation is persisted.
        var completed = returns.confirmManual(context, prepared.id(),
                new com.indice.erp.pos.returns.PosReturnDtos.ConfirmRequest(true, Map.of(transfer.paymentId(), "RETURN-TRANSFER-123")));
        assertThat(completed.payments()).extracting(p -> p.paymentMethod()).containsExactly("CASH", "TRANSFER");
        assertThat(completed.payments().get(0).amount()).isEqualByComparingTo("5");
        assertThat(completed.payments().get(1).amount()).isEqualByComparingTo("15");
        assertThat(completed.payments().get(1).evidenceReference()).isEqualTo("RETURN-TRANSFER-123");
        assertThat(stock()).isEqualByComparingTo("5");
    }

    @Test void preparingCancellingAndRetryingDoesNotMoveMoneyOrStock() {
        var ticket = checkout.execute(context, UUID.randomUUID().toString(), request("1")).ticket();
        var request = returnRequest(ticket.id());
        var first = returns.prepare(context, request);
        assertThat(returns.prepare(context, request).id()).isEqualTo(first.id());
        assertThat(returns.prepare(context, returnRequest(ticket.id())).id()).isEqualTo(first.id());
        assertThat(returns.cancelPreparation(context, first.id()).status()).isEqualTo("CANCELLED");
        assertThat(stock()).isEqualByComparingTo("4");
        assertThat(jdbc.queryForObject("SELECT status FROM pos_payments WHERE company_id = ? AND ticket_id = ?", String.class, company, ticket.id())).isEqualTo("CAPTURED");
        closings.requireNoPendingReturns(context, shift);
        assertThat(returns.prepare(context, returnRequest(ticket.id())).id()).isNotEqualTo(first.id());
    }

    @Test void returnsFailClosedForWrongScopeNonAdminAndClosedShift() {
        var ticket = checkout.execute(context, UUID.randomUUID().toString(), request("1")).ticket();
        var cashier = new PosContext(user, company, "Cashier", "user", true, PosScope.corporateOffice());
        var foreign = new PosContext(user, company, "Admin", "admin", true, PosScope.unitHeadquarters(unit + 90000));
        assertThatThrownBy(() -> returns.prepare(cashier, returnRequest(ticket.id()))).isInstanceOf(PosApiException.class).hasMessageContaining("administrativa");
        assertThatThrownBy(() -> returns.prepare(foreign, returnRequest(ticket.id()))).isInstanceOf(PosApiException.class);
        jdbc.update("UPDATE pos_shifts SET status = 'CLOSED' WHERE company_id = ? AND id = ?", company, shift);
        assertThatThrownBy(() -> returns.prepare(context, returnRequest(ticket.id()))).hasMessageContaining("corte cerrado");
        assertThat(count("pos_returns")).isZero();
    }

    @Test void confirmedCardRefundSurvivesInventoryFailureAndFinalizesExactlyOnce() {
        var ticket = checkout.execute(context, UUID.randomUUID().toString(), cardRequest()).ticket();
        linkSquarePayment(ticket.id());
        var prepared = returns.prepare(context, returnRequest(ticket.id()));
        var command = returns.beginSquare(context, prepared.id());
        assertThat(returns.beginSquare(context, prepared.id()).requestKey()).isEqualTo(command.requestKey());
        assertThat(command.amount()).isEqualByComparingTo("10");
        assertThat(command.paymentId()).startsWith("synthetic-payment-");
        returns.acceptSquare(context, prepared.id(), "synthetic-refund", "PENDING");
        assertThat(returns.completeConfirmedSquare(context, prepared.id()).status()).isEqualTo("PROCESSING");
        assertThat(stock()).isEqualByComparingTo("4");
        var attempt = new org.springframework.transaction.support.TransactionTemplate(transactions);
        attempt.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(() -> attempt.execute(status -> returns.cancelPreparation(context, prepared.id()))).hasMessageContaining("no se puede cancelar");
        assertThatThrownBy(() -> shifts.requireNoActivityForCancellation(context, shift)).isInstanceOf(PosApiException.class);
        returns.acceptSquare(context, prepared.id(), "synthetic-refund", "COMPLETED");
        jdbc.update("UPDATE sales_inventory_balances SET deleted_at = CURRENT_TIMESTAMP WHERE company_id = ? AND product_id = ?", company, product);
        assertThatThrownBy(() -> attempt.execute(status -> returns.completeConfirmedSquare(context, prepared.id())))
                .hasMessageContaining("inventario");
        assertThat(returnRepository.get(context, prepared.id()).payments().getFirst().status()).isEqualTo("COMPLETED");
        assertThat(returnRepository.get(context, prepared.id()).status()).isEqualTo("PROCESSING");
        jdbc.update("UPDATE sales_inventory_balances SET deleted_at = NULL WHERE company_id = ? AND product_id = ?", company, product);
        assertThat(returns.completeConfirmedSquare(context, prepared.id()).status()).isEqualTo("COMPLETED");
        returns.completeConfirmedSquare(context, prepared.id());
        assertThat(stock()).isEqualByComparingTo("5");
        assertThat(jdbc.queryForObject("SELECT expected_cash_amount FROM pos_shifts WHERE company_id = ? AND id = ?", BigDecimal.class, company, shift)).isEqualByComparingTo("500");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM sales_inventory_movements WHERE company_id = ? AND movement_type = 'POS_SALE_RETURN'", Integer.class, company)).isEqualTo(1);
    }

    @Test void unlinkedCardCannotBeRefundedAndFailedPreparationRollsBack() {
        var ticket = checkout.execute(context, UUID.randomUUID().toString(), cardRequest()).ticket();
        var attempt = new org.springframework.transaction.support.TransactionTemplate(transactions);
        attempt.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(() -> attempt.execute(status -> returns.prepare(context, returnRequest(ticket.id()))))
                .hasMessageContaining("Square verificable");
        assertThat(count("pos_returns")).isZero();
        assertThat(count("pos_return_payments")).isZero();
        assertThat(stock()).isEqualByComparingTo("4");
    }

    @Test void providerRejectionCannotBecomeACompletedOrCashRefund() {
        var ticket = checkout.execute(context, UUID.randomUUID().toString(), cardRequest()).ticket();
        linkSquarePayment(ticket.id());
        var prepared = returns.prepare(context, returnRequest(ticket.id()));
        returns.beginSquare(context, prepared.id());
        returns.acceptSquare(context, prepared.id(), "synthetic-rejected", "REJECTED");
        assertThat(returns.completeConfirmedSquare(context, prepared.id()).status()).isEqualTo("PROCESSING");
        assertThatThrownBy(() -> returns.beginSquare(context, prepared.id())).hasMessageContaining("conciliación");
        assertThatThrownBy(() -> returns.confirmManual(context, prepared.id(),
                new com.indice.erp.pos.returns.PosReturnDtos.ConfirmRequest(true, Map.of()))).hasMessageContaining("proveedor");
        assertThat(stock()).isEqualByComparingTo("4");
        assertThat(returns.cancelPreparation(context, prepared.id()).status()).isEqualTo("CANCELLED");
    }

    @Test void closedAccountingPeriodBlocksReturnBeforeMoneyOrInventoryChanges() {
        var ticket = checkout.execute(context, UUID.randomUUID().toString(), request("1")).ticket();
        jdbc.update("""
            INSERT INTO finance_accounting_periods
              (company_id, period_key, period_start, period_end, status, framework_snapshot, functional_currency_snapshot)
            SELECT company_id, DATE_FORMAT(sale_date, '%Y-%m'), sale_date, sale_date, 'CLOSED', 'IFRS', 'MXN'
            FROM sales_records WHERE company_id = ? AND id = ?
            """, company, ticket.salesRecordId());
        assertThatThrownBy(() -> returns.prepare(context, returnRequest(ticket.id()))).hasMessageContaining("reversión financiera");
        assertThat(count("pos_returns")).isZero();
        assertThat(stock()).isEqualByComparingTo("4");
    }

    private PosCheckoutRequest cardRequest() {
        return new PosCheckoutRequest(register, null, "MXN", request("1").items(),
                List.of(new PosCheckoutPaymentRequest("CARD", null, BigDecimal.TEN, null)), null);
    }

    @Test void changedCostCurrencyCannotBeMixedIntoHistoricalStockCost() {
        var ticket = checkout.execute(context, UUID.randomUUID().toString(), request("1")).ticket();
        var prepared = returns.prepare(context, returnRequest(ticket.id()));
        jdbc.update("UPDATE sales_products SET currency = 'USD' WHERE company_id = ? AND id = ?", company, product);
        var attempt = new org.springframework.transaction.support.TransactionTemplate(transactions);
        attempt.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_NESTED);
        assertThatThrownBy(() -> attempt.execute(status -> returns.confirmManual(context, prepared.id(),
                new com.indice.erp.pos.returns.PosReturnDtos.ConfirmRequest(true, Map.of())))).hasMessageContaining("moneda del costo");
        assertThat(stock()).isEqualByComparingTo("4");
        assertThat(returnRepository.get(context, prepared.id()).status()).isEqualTo("PREPARED");
        assertThat(returnRepository.get(context, prepared.id()).payments().getFirst().status()).isEqualTo("PENDING");
        assertThat(jdbc.queryForObject("SELECT expected_cash_amount FROM pos_shifts WHERE company_id = ? AND id = ?", BigDecimal.class, company, shift)).isEqualByComparingTo("510");
    }

    private void linkSquarePayment(long ticket) {
        String key = UUID.randomUUID().toString();
        jdbc.update("INSERT INTO pos_square_locations (company_id, square_location_id, name, created_by_user_id) VALUES (?, ?, 'Synthetic', ?)", company, key, user);
        long location = last("pos_square_locations");
        jdbc.update("INSERT INTO pos_square_terminals (company_id, square_location_row_id, square_device_code_id, name, created_by_user_id) VALUES (?, ?, ?, 'Synthetic', ?)", company, location, key, user);
        jdbc.update("""
            INSERT INTO pos_square_terminal_payment_intents (company_id, cash_register_id, shift_id, terminal_id,
              square_location_id, square_device_id, idempotency_key, status, amount, currency_code,
              checkout_payload_sha256, checkout_request_json, pos_ticket_id, created_by_user_id, created_by_role,
              scope_type, square_payment_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', 10, 'MXN', ?, '{}', ?, ?, 'admin', 'CORPORATE_OFFICE', ?)
            """, company, register, shift, last("pos_square_terminals"), key, key, key, "0".repeat(64), ticket, user, "synthetic-payment-" + key);
    }

    private com.indice.erp.pos.returns.PosReturnDtos.PrepareRequest returnRequest(long ticket) {
        return new com.indice.erp.pos.returns.PosReturnDtos.PrepareRequest(ticket, "Cliente devuelve el ticket completo", true, UUID.randomUUID().toString());
    }

    private PosCheckoutRequest request(String quantity) {
        var amount = new BigDecimal(quantity).multiply(BigDecimal.TEN);
        return new PosCheckoutRequest(register, null, "MXN",
                List.of(new PosCheckoutItemRequest(product, "Integrity stock", null, "PRODUCT",
                        new BigDecimal(quantity), BigDecimal.TEN, BigDecimal.ZERO, BigDecimal.ZERO)),
                List.of(new PosCheckoutPaymentRequest("CASH", null, amount, null)), null);
    }
    private void assertSameReceipt(PosCheckoutResponse actual, PosCheckoutResponse expected) {
        // MySQL JSON normalizes decimal scale; compare the API's JSON semantics, including nulls.
        com.fasterxml.jackson.databind.JsonNode actualJson = json.valueToTree(actual);
        com.fasterxml.jackson.databind.JsonNode expectedJson = json.valueToTree(expected);
        assertThat(actualJson).isEqualTo(expectedJson);
    }
    private long last(String table) { return jdbc.queryForObject("SELECT MAX(id) FROM " + table + " WHERE company_id = ?", Long.class, company); }
    private int count(String table) { return jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE company_id = ?", Integer.class, company); }
    private BigDecimal stock() { return jdbc.queryForObject("SELECT available_quantity FROM sales_inventory_balances WHERE company_id = ? AND product_id = ? AND warehouse_id = ?", BigDecimal.class, company, product, warehouse); }
}
