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
        assertThat(expenses.openPayables()).isEqualTo(4);
        assertThat(expenses.overduePayables()).isEqualTo(1);
        assertThat(expenses.expensesOutsideActiveBudget()).isEqualTo(3);
        assertThat(total(repository.loadExpenseValue(scope, "total_amount", false))).isEqualByComparingTo("600.00");
        assertThat(total(repository.loadExpenseValue(scope, "balance_amount", false))).isEqualByComparingTo("550.00");
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
                     current_balance_amount, cut_off_day, status, fund_type)
                VALUES (?, ?, ?, ?, 'MXN', 1000, 250, 15, 'LOW_BALANCE', 'INTERNAL_COMPANY')
                """, companyId, unitId, businessId, "Fund " + token);
        var fundId = jdbc.queryForObject(
                "SELECT id FROM finance_petty_cash_funds WHERE company_id = ? AND name = ?",
                Long.class, companyId, "Fund " + token);
        jdbc.update("""
                INSERT INTO finance_petty_cash_statements
                    (company_id, petty_cash_fund_id, folio, period_key, period_start, period_end,
                     cut_off_date, currency_code, status, fund_type_snapshot)
                VALUES (?, ?, ?, ?, '2026-07-01', '2026-07-31', '2026-07-31', 'MXN', 'OPEN', 'INTERNAL_COMPANY')
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

    @Test
    void externallyManagedMoneyAndValidatedReceiptsStayOutOfCompanyKpis() {
        jdbc.update("""
            INSERT INTO finance_petty_cash_funds
              (company_id, unit_id, business_id, name, currency_code, limit_amount,
               current_balance_amount, cut_off_day, status, fund_type)
            VALUES (?, ?, ?, ?, 'USD', 1000, 700, 15, 'OPEN', 'EXTERNAL_MANAGED')
            """, companyId, unitId, businessId, "External " + token);
        long fundId = jdbc.queryForObject(
            "SELECT id FROM finance_petty_cash_funds WHERE company_id = ? AND name = ?",
            Long.class, companyId, "External " + token);
        jdbc.update("""
            INSERT INTO finance_petty_cash_statements
              (company_id, petty_cash_fund_id, folio, period_key, period_start, period_end,
               cut_off_date, currency_code, status, fund_type_snapshot)
            VALUES (?, ?, ?, '2026-08', '2026-08-01', '2026-08-31', '2026-08-31',
                    'USD', 'OPEN', 'EXTERNAL_MANAGED')
            """, companyId, fundId, "EXT-" + token);
        long statementId = jdbc.queryForObject(
            "SELECT id FROM finance_petty_cash_statements WHERE company_id = ? AND folio = ?",
            Long.class, companyId, "EXT-" + token);
        jdbc.update("""
            INSERT INTO finance_petty_cash_settlement_lines
              (company_id, petty_cash_fund_id, petty_cash_statement_id, description,
               subtotal_amount, tax_amount, total_amount, currency_code, expense_date,
               attachment_count, status)
            VALUES (?, ?, ?, 'External receipt', 300, 0, 300, 'USD', '2026-08-05', 1, 'VALIDATED')
            """, companyId, fundId, statementId);

        var snapshot = repository.loadPettyCash(scope());
        assertThat(snapshot.fundCount()).isZero();
        assertThat(snapshot.pendingSettlements()).isZero();
        assertThat(total(repository.loadPettyCashValue(scope(), "current_balance_amount"))).isZero();
        assertThat(total(repository.loadPettyCashSettlements(scope()))).isZero();
        var legacy = new ExecutiveKpiRepository(jdbc, new com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver(
            jdbc, new com.fasterxml.jackson.databind.ObjectMapper(), "America/Toronto"));
        assertThat(legacy.loadPettyCashByOrg(scope())).isEmpty();
        assertThat(legacy.loadPettyCashSummary(scope())).isEmpty();
        assertThat(jdbc.queryForObject("SELECT current_balance_amount FROM finance_petty_cash_funds WHERE id = ?",
            BigDecimal.class, fundId)).isEqualByComparingTo("700");
    }

    @Test
    void peopleSnapshotUsesValidDailyAttendanceWithinTheTenantAndOrganizationScope() {
        var email = "kpi.people." + token + "@example.com";
        jdbc.update("INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$kpitest', ?)",
                email, "KPI Person " + token);
        var userId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        jdbc.update("""
                INSERT INTO user_companies (user_id, company_id, role, status, visibility)
                VALUES (?, ?, 'user', 'active', 'all')
                """, userId, companyId);
        var userCompanyId = jdbc.queryForObject(
                "SELECT id FROM user_companies WHERE user_id = ? AND company_id = ?",
                Long.class, userId, companyId);
        jdbc.update("""
                INSERT INTO user_work_profiles
                    (company_id, user_company_id, user_id, unit_id, business_id,
                     position, department, hire_date, workday_hours, status)
                VALUES (?, ?, ?, ?, ?, 'Operator', 'Operations', '2026-01-01', 8.00, 'active')
                """, companyId, userCompanyId, userId, unitId, businessId);
        insertAttendance(userId, userCompanyId, "2026-08-04", "on_time", 0);
        insertAttendance(userId, userCompanyId, "2026-08-05", "late", 12);
        insertAttendance(userId, userCompanyId, "2026-08-06", "absence", 0);
        insertAttendance(userId, userCompanyId, "2026-07-20", "absence", 0);

        var people = repository.loadPeople(scope());

        assertThat(people.activeCollaborators()).isEqualTo(1);
        assertThat(people.attendanceRecords()).isEqualTo(3);
        assertThat(people.scheduledAttendanceRecords()).isEqualTo(3);
        assertThat(people.absenceRecords()).isEqualTo(1);
        assertThat(people.lateRecords()).isEqualTo(1);
        assertThat(people.invalidStatusRows()).isZero();
        assertThat(people.invalidMinutesRows()).isZero();
    }

    @Test
    void productPortfolioUsesCanonicalSaleLinesAndScopedInventory() {
        jdbc.update("""
                INSERT INTO sales_products
                    (company_id, product_code, sku, name, category, currency, inventory_ready)
                VALUES (?, ?, ?, ?, 'Beverages', 'MXN', 1)
                """, companyId, "BCG-" + token, "SKU-" + token, "Portfolio product " + token);
        var productId = jdbc.queryForObject(
                "SELECT id FROM sales_products WHERE company_id = ? AND product_code = ?",
                Long.class, companyId, "BCG-" + token);
        jdbc.update("""
                INSERT INTO sales_records
                    (company_id, unit_id, business_id, sale_number, customer_name, sale_date,
                     total_amount, subtotal, currency, commercial_status, finance_status,
                     inventory_status, delivery_status, commission_status, inventory_movement_status,
                     sale_lines_json)
                VALUES (?, ?, ?, ?, 'Portfolio customer', '2026-08-10', 90, 90, 'MXN', 'completed',
                        'captured', 'deducted', 'pending', 'pending', 'generated',
                        JSON_ARRAY(JSON_OBJECT('productId', CAST(? AS CHAR), 'quantity', 4,
                            'subtotal', 90, 'discountPercent', 10)))
                """, companyId, unitId, businessId, "BCG-CURRENT-" + token, productId);
        jdbc.update("""
                INSERT INTO sales_records
                    (company_id, unit_id, business_id, sale_number, customer_name, sale_date,
                     total_amount, subtotal, currency, commercial_status, finance_status,
                     inventory_status, delivery_status, commission_status, inventory_movement_status,
                     sale_lines_json)
                VALUES (?, ?, ?, ?, 'Portfolio customer', '2026-07-20', 50, 50, 'MXN', 'completed',
                        'captured', 'deducted', 'pending', 'pending', 'generated',
                        JSON_ARRAY(JSON_OBJECT('productId', CAST(? AS CHAR), 'quantity', 2,
                            'subtotal', 50, 'discountPercent', 0)))
                """, companyId, unitId, businessId, "BCG-PREVIOUS-" + token, productId);
        jdbc.update("""
                INSERT INTO sales_inventory_warehouses
                    (company_id, warehouse_code, name, business_unit_id, business_unit_name,
                     business_id, business_name)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, companyId, "BCG-WH-" + token, "Portfolio warehouse " + token,
                String.valueOf(unitId), "Monterrey " + token,
                String.valueOf(businessId), "Linda Vista " + token);
        var warehouseId = jdbc.queryForObject(
                "SELECT id FROM sales_inventory_warehouses WHERE company_id = ? AND warehouse_code = ?",
                Long.class, companyId, "BCG-WH-" + token);
        jdbc.update("""
                INSERT INTO sales_inventory_balances
                    (company_id, balance_code, product_id, warehouse_id, warehouse_name,
                     available_quantity, reserved_quantity, minimum_quantity, unit_cost, uses_inventory,
                     business_unit_id, business_unit_name, business_id, business_name)
                VALUES (?, ?, ?, ?, ?, 3, 0, 5, 10, 1, ?, ?, ?, ?)
                """, companyId, "BCG-BAL-" + token, productId, warehouseId,
                "Portfolio warehouse " + token, String.valueOf(unitId), "Monterrey " + token,
                String.valueOf(businessId), "Linda Vista " + token);

        var current = repository.loadProductPortfolioSales(scope());
        var prior = repository.loadProductPortfolioSales(scope().previousPeriod());
        var quality = repository.loadProductPortfolioSalesQuality(scope());
        var inventory = repository.loadProductPortfolioInventory(scope());

        assertThat(current).singleElement().satisfies(row -> {
            assertThat(row.productId()).isEqualTo(productId);
            assertThat(row.revenue()).isEqualByComparingTo("90.00000000");
            assertThat(row.units()).isEqualByComparingTo("4.0000");
        });
        assertThat(prior).singleElement().satisfies(row ->
                assertThat(row.revenue()).isEqualByComparingTo("50.00000000"));
        assertThat(quality.saleRecords()).isEqualTo(1);
        assertThat(quality.attributedSales()).isEqualTo(1);
        assertThat(quality.invalidLineRows()).isZero();
        assertThat(inventory).singleElement().satisfies(row -> {
            assertThat(row.availableQuantity()).isEqualByComparingTo("3.00");
            assertThat(row.lowStockLocations()).isEqualTo(1);
        });
    }

    @Test
    void receivablesAndPointOfSaleUseTheirOwnerPopulationsAndOrganizationScope() {
        jdbc.update("""
                INSERT INTO finance_credit_sales
                    (company_id, unit_id, business_id, sale_number, customer_name, source, sale_date,
                     original_amount, financed_amount, currency_code, status, selected_simulation_key,
                     selected_simulation_name, term_months, annual_interest_rate, monthly_payment_amount,
                     total_interest_amount, total_payable_amount, first_due_date, due_date)
                VALUES (?, ?, ?, ?, 'Executive customer', 'MANUAL', '2026-07-01',
                        180, 180, 'MXN', 'ACTIVE', 'test', 'Test', 2, 0, 100, 20, 200,
                        '2026-07-15', '2026-08-20')
                """, companyId, unitId, businessId, "CREDIT-" + token);
        var creditSaleId = jdbc.queryForObject(
                "SELECT id FROM finance_credit_sales WHERE company_id = ? AND sale_number = ?",
                Long.class, companyId, "CREDIT-" + token);
        jdbc.update("""
                INSERT INTO finance_receivable_accounts
                    (company_id, unit_id, business_id, credit_sale_id, sale_number, customer_name,
                     original_amount, total_payable_amount, paid_amount, balance_amount, currency_code,
                     due_date, next_payment_date, installment_amount, term_months, annual_interest_rate, status)
                VALUES (?, ?, ?, ?, ?, 'Executive customer', 180, 200, 100, 100, 'MXN',
                        '2026-08-20', '2026-07-15', 100, 2, 0, 'OVERDUE')
                """, companyId, unitId, businessId, creditSaleId, "CREDIT-" + token);
        var receivableId = jdbc.queryForObject(
                "SELECT id FROM finance_receivable_accounts WHERE company_id = ? AND credit_sale_id = ?",
                Long.class, companyId, creditSaleId);
        jdbc.update("""
                INSERT INTO finance_receivable_installments
                    (company_id, receivable_id, credit_sale_id, installment_number, due_date,
                     amount, paid_amount, balance_amount, currency_code, status)
                VALUES (?, ?, ?, 1, '2026-07-15', 100, 40, 60, 'MXN', 'OVERDUE'),
                       (?, ?, ?, 2, '2026-08-20', 100, 60, 40, 'MXN', 'DUE_SOON')
                """, companyId, receivableId, creditSaleId, companyId, receivableId, creditSaleId);
        jdbc.update("""
                INSERT INTO finance_receivable_payments
                    (company_id, receivable_id, payment_date, payment_method, amount, currency_code, reference)
                VALUES (?, ?, '2026-08-10', 'TRANSFER', 25, 'MXN', ?)
                """, companyId, receivableId, "PAY-" + token);

        var email = "kpi.pos." + token + "@example.com";
        jdbc.update("INSERT INTO users (email, password_hash, full_name) VALUES (?, '$2a$10$kpitest', ?)",
                email, "POS User " + token);
        var userId = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
        jdbc.update("""
                INSERT INTO sales_inventory_warehouses
                    (company_id, warehouse_code, name, business_unit_id, business_unit_name,
                     business_id, business_name)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, companyId, "POS-WH-" + token, "POS warehouse " + token, String.valueOf(unitId),
                "Monterrey " + token, String.valueOf(businessId), "Linda Vista " + token);
        var warehouseId = jdbc.queryForObject(
                "SELECT id FROM sales_inventory_warehouses WHERE company_id = ? AND warehouse_code = ?",
                Long.class, companyId, "POS-WH-" + token);
        jdbc.update("""
                INSERT INTO pos_cash_registers
                    (company_id, unit_id, business_id, warehouse_id, code, name, status, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)
                """, companyId, unitId, businessId, warehouseId, "REG-" + token, "Register " + token, userId);
        var registerId = jdbc.queryForObject(
                "SELECT id FROM pos_cash_registers WHERE company_id = ? AND code = ?",
                Long.class, companyId, "REG-" + token);
        jdbc.update("""
                INSERT INTO pos_shifts
                    (company_id, unit_id, business_id, warehouse_id, cash_register_id, opened_by_user_id,
                     closed_by_user_id, status, opening_amount, expected_cash_amount, counted_cash_amount,
                     over_short_amount, currency_code, opened_at, closed_at, created_by_user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'CLOSED', 100, 400, 395, -5, 'MXN',
                        '2026-08-10 08:00:00', '2026-08-10 18:00:00', ?)
                """, companyId, unitId, businessId, warehouseId, registerId, userId, userId, userId);
        var shiftId = jdbc.queryForObject(
                "SELECT id FROM pos_shifts WHERE company_id = ? AND cash_register_id = ?",
                Long.class, companyId, registerId);
        jdbc.update("""
                INSERT INTO pos_cash_closings
                    (company_id, unit_id, business_id, warehouse_id, cash_register_id, shift_id,
                     opening_cash_amount, cash_sales_amount, cash_in_amount, cash_out_amount,
                     safe_drop_amount, correction_amount, expected_cash_amount, counted_cash_amount,
                     over_short_amount, total_sales_amount, total_refunds_amount, tickets_count,
                     closed_by_user_id, closed_at)
                VALUES (?, ?, ?, ?, ?, ?, 100, 300, 0, 0, 0, 0, 400, 395, -5, 500, 20, 4, ?,
                        '2026-08-10 18:00:00')
                """, companyId, unitId, businessId, warehouseId, registerId, shiftId, userId);

        var receivables = repository.loadReceivables(scope());
        assertThat(receivables.accountsWithDebt()).isEqualTo(1);
        assertThat(receivables.overdueInstallments()).isEqualTo(1);
        assertThat(receivables.periodPayments()).isEqualTo(1);
        assertThat(receivables.periodPaymentsWithReceipt()).isZero();
        assertThat(total(repository.loadReceivableAccountValue(scope()))).isEqualByComparingTo("100");
        assertThat(total(repository.loadReceivableInstallmentValue(scope(), "overdue"))).isEqualByComparingTo("60");
        assertThat(total(repository.loadReceivableInstallmentValue(scope(), "dueSoon"))).isEqualByComparingTo("40");
        assertThat(total(repository.loadReceivablePaymentValue(scope()))).isEqualByComparingTo("25");

        var pointOfSale = repository.loadPointOfSale(scope());
        assertThat(pointOfSale.closingCount()).isEqualTo(1);
        assertThat(pointOfSale.ticketCount()).isEqualTo(4);
        assertThat(pointOfSale.closingsWithDifference()).isEqualTo(1);
        assertThat(total(repository.loadPointOfSaleValue(scope(), "totalSales"))).isEqualByComparingTo("500");
        assertThat(total(repository.loadPointOfSaleValue(scope(), "absoluteDifference"))).isEqualByComparingTo("5");
    }

    private ExecutiveKpiScope scope() {
        return new ExecutiveKpiScope(companyId, LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 16),
                "custom", unitId, businessId, "", "all", "MXN", LocalDate.of(2026, 8, 16));
    }

    private void insertTask(String suffix, String status, String dueDate, String completedAt, String cancelledAt) {
        jdbc.update("""
                INSERT INTO process_tasks
                    (company_id, folio, title, status, due_date, completed_at, cancelled_at,
                     completion_percent, audited, business_id, unit_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
                """, companyId, "TASK-" + suffix + '-' + token, "Task " + suffix, status, dueDate,
                completedAt, cancelledAt, "completed".equals(status) ? 100 : 0, businessId, unitId,
                dueDate + " 08:00:00");
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

    private void insertAttendance(long userId, long userCompanyId, String date, String status, int minutesLate) {
        jdbc.update("""
                INSERT INTO user_attendance_daily_records
                    (company_id, user_company_id, user_id, attendance_date, system_status, minutes_late)
                VALUES (?, ?, ?, ?, ?, ?)
                """, companyId, userCompanyId, userId, date, status, minutesLate);
    }

    private BigDecimal total(java.util.List<com.indice.erp.kpis.currency.KpiMoneyAmount> amounts) {
        return amounts.stream().map(com.indice.erp.kpis.currency.KpiMoneyAmount::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
