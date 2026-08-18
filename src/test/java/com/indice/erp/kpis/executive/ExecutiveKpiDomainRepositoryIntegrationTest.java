package com.indice.erp.kpis.executive;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
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
@Import(ExecutiveKpiDomainRepository.class)
class ExecutiveKpiDomainRepositoryIntegrationTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ExecutiveKpiDomainRepository repository;

    private long companyId;
    private long unitId;
    private long businessId;
    private String token;

    @BeforeEach
    void setUp() {
        token = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "KPI test " + token);
        companyId = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, "KPI test " + token);
        jdbc.update("INSERT INTO units (company_id, name, status) VALUES (?, ?, 'active')", companyId, "Monterrey " + token);
        unitId = jdbc.queryForObject("SELECT id FROM units WHERE company_id = ? AND name = ?", Long.class,
                companyId, "Monterrey " + token);
        jdbc.update("INSERT INTO businesses (company_id, unit_id, name, status) VALUES (?, ?, ?, 'active')",
                companyId, unitId, "Linda Vista " + token);
        businessId = jdbc.queryForObject("SELECT id FROM businesses WHERE company_id = ? AND name = ?", Long.class,
                companyId, "Linda Vista " + token);
    }

    @Test
    void processBacklogAndExecutedExpensesUseDecisionGradePopulations() {
        insertTask("BACKLOG", "pending", "2026-07-20", null, null);
        insertTask("DONE", "completed", "2026-08-10", "2026-08-11 09:00:00", null);
        insertTask("CANCELLED", "cancelled", "2026-08-12", null, "2026-08-13 09:00:00");

        insertExpense("DRAFT", "UNPAID", "100.00", "0.00", "100.00", "2026-08-04", "2026-08-20");
        insertExpense("PAID", "PAID", "200.00", "200.00", "0.00", "2026-08-05", "2026-08-05");
        insertExpense("APPROVED", "UNPAID", "300.00", "0.00", "300.00", "2026-08-06", "2026-08-07");
        insertExpense("APPROVED", "UNPAID", "100.00", "0.00", "100.00", "2026-08-08", "2026-08-16");
        insertExpense("PENDING_APPROVAL", "UNPAID", "50.00", "0.00", "50.00", "2026-08-07", "2026-08-20");

        var scope = scope();
        var processes = repository.loadProcesses(scope);
        var expenses = repository.loadExpenses(scope);

        assertThat(processes.totalTasks()).isEqualTo(1);
        assertThat(processes.closedTasks()).isEqualTo(1);
        assertThat(processes.overdueTasks()).isEqualTo(1);
        assertThat(expenses.expenseCount()).isEqualTo(3);
        assertThat(expenses.pendingApproval()).isEqualTo(1);
        assertThat(expenses.openPayables()).isEqualTo(2);
        assertThat(expenses.overduePayables()).isEqualTo(1);
        assertThat(total(repository.loadExpenseValue(scope, "total_amount", false))).isEqualByComparingTo("600.00");
        assertThat(total(repository.loadExpenseValue(scope, "balance_amount", false))).isEqualByComparingTo("400.00");
        assertThat(total(repository.loadExpenseValue(scope, "balance_amount", true))).isEqualByComparingTo("300.00");
    }

    @Test
    void inventoryScopeResolvesLegacyTextUnitIdentifiersByCanonicalName() {
        jdbc.update("""
                INSERT INTO sales_products
                    (company_id, product_code, name, currency, inventory_ready)
                VALUES (?, ?, ?, 'MXN', 1)
                """, companyId, "PRD-" + token, "Product " + token);
        var productId = jdbc.queryForObject(
                "SELECT id FROM sales_products WHERE company_id = ? AND product_code = ?",
                Long.class, companyId, "PRD-" + token);
        jdbc.update("""
                INSERT INTO sales_inventory_warehouses
                    (company_id, warehouse_code, name, business_unit_id, business_unit_name, business_id, business_name)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, companyId, "WH-" + token, "Warehouse " + token, "bu-legacy-" + token,
                "Monterrey " + token, String.valueOf(businessId), "Linda Vista " + token);
        var warehouseId = jdbc.queryForObject(
                "SELECT id FROM sales_inventory_warehouses WHERE company_id = ? AND warehouse_code = ?",
                Long.class, companyId, "WH-" + token);
        jdbc.update("""
                INSERT INTO sales_inventory_balances
                    (company_id, balance_code, product_id, warehouse_id, warehouse_name,
                     available_quantity, reserved_quantity, minimum_quantity, unit_cost, uses_inventory,
                     business_unit_id, business_unit_name, business_id, business_name)
                VALUES (?, ?, ?, ?, ?, 0, 2, 5, 25, 1, ?, ?, ?, ?)
                """, companyId, "BAL-" + token, productId, warehouseId, "Warehouse " + token,
                "bu-legacy-" + token, "Monterrey " + token, String.valueOf(businessId), "Linda Vista " + token);

        var inventory = repository.loadInventory(scope());

        assertThat(inventory.trackedProducts()).isEqualTo(1);
        assertThat(inventory.stockLocations()).isEqualTo(1);
        assertThat(inventory.outOfStock()).isEqualTo(1);
        assertThat(inventory.invalidCurrencyRows()).isZero();
    }

    @Test
    void rejectedSalesAreExcludedAndPendingPettyCashIsAFullBacklog() {
        insertSale("completed", "500.00", "2026-08-05");
        insertSale("rejected", "1000.00", "2026-08-06");
        jdbc.update("""
                INSERT INTO sales_opportunities
                    (company_id, unit_id, business_id, opportunity_code, opportunity_name,
                     stage, status, estimated_value, currency, probability_percent, created_at)
                VALUES (?, ?, ?, ?, ?, 'qualification', 'active', -100, 'BAD!', 150, '2026-07-10 09:00:00')
                """, companyId, unitId, businessId, "OPP-" + token, "Opportunity " + token);

        jdbc.update("""
                INSERT INTO finance_petty_cash_funds
                    (company_id, unit_id, business_id, name, currency_code, limit_amount,
                     current_balance_amount, cut_off_day, status)
                VALUES (?, ?, ?, ?, 'MXN', 1000, 250, 15, 'LOW_BALANCE')
                """, companyId, unitId, businessId, "Fund " + token);
        var fundId = jdbc.queryForObject(
                "SELECT id FROM finance_petty_cash_funds WHERE company_id = ? AND name = ?",
                Long.class, companyId, "Fund " + token);
        jdbc.update("""
                INSERT INTO finance_petty_cash_statements
                    (company_id, petty_cash_fund_id, folio, period_key, period_start, period_end,
                     cut_off_date, currency_code, status)
                VALUES (?, ?, ?, ?, '2026-07-01', '2026-07-31', '2026-07-31', 'MXN', 'OPEN')
                """, companyId, fundId, "PCS-" + token, "2026-07-" + token);
        var statementId = jdbc.queryForObject(
                "SELECT id FROM finance_petty_cash_statements WHERE company_id = ? AND folio = ?",
                Long.class, companyId, "PCS-" + token);
        jdbc.update("""
                INSERT INTO finance_petty_cash_settlement_lines
                    (company_id, petty_cash_fund_id, petty_cash_statement_id, description,
                     subtotal_amount, tax_amount, total_amount, currency_code, expense_date,
                     attachment_count, status)
                VALUES (?, ?, ?, ?, 120, 0, 120, 'MXN', '2026-07-20', 0, 'DRAFT')
                """, companyId, fundId, statementId, "Settlement " + token);

        var sales = repository.loadSales(scope());
        var pettyCash = repository.loadPettyCash(scope());

        assertThat(sales.saleCount()).isEqualTo(1);
        assertThat(sales.invalidProbabilityRows()).isEqualTo(1);
        assertThat(sales.invalidOpportunityAmountRows()).isEqualTo(1);
        assertThat(sales.invalidOpportunityCurrencyRows()).isEqualTo(1);
        assertThat(total(repository.loadSalesValue(scope()))).isEqualByComparingTo("500.00");
        assertThat(pettyCash.pendingSettlements()).isEqualTo(1);
        assertThat(pettyCash.missingReceipts()).isEqualTo(1);
        assertThat(total(repository.loadPettyCashSettlements(scope()))).isEqualByComparingTo("120.00");
    }

    private ExecutiveKpiScope scope() {
        return new ExecutiveKpiScope(companyId, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 16),
                "custom", unitId, businessId, "", "all", "MXN", LocalDate.of(2026, 8, 16));
    }

    private void insertTask(String suffix, String status, String dueDate, String completedAt, String cancelledAt) {
        jdbc.update("""
                INSERT INTO process_tasks
                    (company_id, folio, title, status, due_date, completed_at, cancelled_at,
                     completion_percent, audited, business_id, unit_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
                """, companyId, "TASK-" + suffix + '-' + token, "Task " + suffix, status, dueDate,
                completedAt, cancelledAt, "completed".equals(status) ? 100 : 0, businessId, unitId);
    }

    private void insertExpense(
            String status,
            String paymentStatus,
            String total,
            String paid,
            String balance,
            String expenseDate,
            String dueDate) {
        jdbc.update("""
                INSERT INTO finance_expenses
                    (company_id, unit_id, business_id, folio, concept, expense_type,
                     subtotal_amount, tax_amount, total_amount, paid_amount, balance_amount,
                     currency_code, expense_date, due_date, status, payment_status, attachment_count)
                VALUES (?, ?, ?, ?, ?, 'VARIABLE', ?, 0, ?, ?, ?, 'MXN', ?, ?, ?, ?, 1)
                """, companyId, unitId, businessId, "EXP-" + status + '-' + expenseDate + '-' + token, "Expense " + status,
                total, total, paid, balance, expenseDate, dueDate, status, paymentStatus);
    }

    private void insertSale(String commercialStatus, String amount, String saleDate) {
        jdbc.update("""
                INSERT INTO sales_records
                    (company_id, unit_id, business_id, sale_number, customer_name, sale_date,
                     total_amount, subtotal, currency, commercial_status, finance_status,
                     inventory_status, delivery_status, commission_status, inventory_movement_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'MXN', ?, 'captured',
                        'deducted', 'pending', 'pending', 'generated')
                """, companyId, unitId, businessId, "SALE-" + commercialStatus + '-' + token,
                "Customer " + token, saleDate, amount, amount, commercialStatus);
    }

    private BigDecimal total(java.util.List<com.indice.erp.kpis.currency.KpiMoneyAmount> amounts) {
        return amounts.stream().map(com.indice.erp.kpis.currency.KpiMoneyAmount::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
