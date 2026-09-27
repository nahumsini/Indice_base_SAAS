package com.indice.erp.finance.reporting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.configcenter.ConfigCenterService;
import com.indice.erp.hr.users.HrUserService;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.expenses.ExpenseType;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.expenses.dto.RecordExpensePaymentRequest;
import com.indice.erp.finance.paymentaccounts.*;
import com.indice.erp.finance.paymentaccounts.dto.CreatePaymentAccountRequest;
import com.indice.erp.finance.shared.*;
import com.indice.erp.finance.pettycash.*;
import com.indice.erp.finance.pettycash.dto.*;
import com.indice.erp.finance.receivables.ReceivablesService;
import com.indice.erp.finance.receivables.ReceivablesDtos.*;
import com.indice.erp.kpis.executive.*;
import com.indice.erp.kpis.currency.*;
import com.indice.erp.pos.*;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.checkout.CheckoutExecutionService;
import com.indice.erp.pos.checkout.dto.*;
import com.indice.erp.pos.receipt.*;
import com.indice.erp.pos.shift.ShiftService;
import com.indice.erp.pos.shift.dto.*;
import com.indice.erp.sales.SalesService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

/** One tenant and one dataset across the six operational sessions; all writes roll back. */
@SpringBootTest
@Transactional
class SixSessionOperationalFlowIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired ConfigCenterService configuration;
    @Autowired HrUserService people;
    @Autowired ProcessTasksService tasks;
    @Autowired PaymentAccountService accounts;
    @Autowired ExpenseService expenses;
    @Autowired SalesService sales;
    @Autowired CashRegisterService registers;
    @Autowired ShiftService shifts;
    @Autowired PaidInventoryReceiptService receipts;
    @Autowired CheckoutExecutionService checkout;
    @Autowired ExecutiveKpiRepository executive;
    @Autowired ExecutiveKpiDomainRepository domains;
    @Autowired BasicModuleKpiCurrencyRepository moduleMoney;
    @Autowired FinancialSynchronizationService synchronization;
    @Autowired FinancialReportingService reporting;
    @Autowired FinancialLedgerRepository ledger;
    @Autowired AccountingManualEntryService manualEntries;
    @Autowired FinanceBusinessTimeZoneResolver timeZones;
    @Autowired PettyCashService pettyCash;
    @Autowired ReceivablesService receivables;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper json;

    @Test
    void organizationPeopleTasksTreasuryInventorySalesAndStatementsShareAuthoritativeData() {
        assertThat(jdbc.queryForObject("SELECT DATABASE()", String.class)).isEqualTo("indice_test_db");
        String key = UUID.randomUUID().toString();
        // Only the tenant/authentication bootstrap is a fixture, not the operations below.
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "Six sessions " + key);
        long company = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, "Six sessions " + key);
        jdbc.update("INSERT INTO users (email, password_hash) VALUES (?, 'isolated-no-login')", key + "@example.test");
        long user = jdbc.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, key + "@example.test");
        jdbc.update("INSERT INTO user_companies (company_id, user_id, role, status, visibility) VALUES (?, ?, 'superadmin', 'active', 'all')", company, user);
        long membership = jdbc.queryForObject("SELECT id FROM user_companies WHERE company_id = ? AND user_id = ?", Long.class, company, user);
        var auth = new AuthSessionUser(user, company, membership, "Synthetic owner", "superadmin");
        var finance = new FinanceContext(user, company, "Synthetic owner", "superadmin", true, FinanceScope.corporateOffice());
        var pos = new PosContext(user, company, "Synthetic owner", "superadmin", true, PosScope.corporateOffice());
        var today = LocalDate.now(timeZones.resolve(company));

        // 1. The owner creates the actual organization through the configuration use case.
        configuration.saveStructure(auth, Map.of("modo", "multi", "map", List.of(
            Map.of("name", "Headquarters", "is_corporate_office", true, "businesses", List.of()),
            Map.of("name", "Hardware region", "businesses", List.of(Map.of("name", "Hardware store"))))));
        long business = jdbc.queryForObject("SELECT id FROM businesses WHERE company_id = ? AND name = 'Hardware store'", Long.class, company);
        long unit = jdbc.queryForObject("SELECT unit_id FROM businesses WHERE company_id = ? AND id = ?", Long.class, company, business);

        // 2. The collaborator belongs to the same unit/business used by all subsequent owners.
        var employee = people.createUser(auth, Map.ofEntries(
            Map.entry("first_name", "Synthetic"), Map.entry("last_name", "Clerk"),
            Map.entry("email", "clerk." + key + "@example.test"), Map.entry("position", "Store clerk"),
            Map.entry("department", "Operations"), Map.entry("unit_id", unit), Map.entry("business_id", business),
            Map.entry("hire_date", today.minusDays(1).toString()), Map.entry("salary", "5200"),
            Map.entry("pay_period", "monthly"), Map.entry("salary_type", "daily"), Map.entry("contract_type", "permanent")));
        var employeeData = (Map<?, ?>) employee.get("user");
        long employeeMembership = ((Number) employeeData.get("user_company_id")).longValue();
        assertThat(employeeData.get("full_name")).isEqualTo("Synthetic Clerk");

        // 3. Work can be assigned to the HR collaborator and completed through the task owner.
        var task = tasks.createTask(company, user, Map.of(
            "title", "Prepare hardware counter", "assignedUserCompanyId", employeeMembership,
            "unitId", unit, "businessId", business, "status", "pending", "dueDate", today.toString()));
        tasks.patchTask(company, user, id(task), Map.of("status", "completed", "completionPercent", 100));

        // 4. A real treasury opening funds an expense; retrying payment must not spend twice.
        long bank = accounts.create(finance, new CreatePaymentAccountRequest(unit, business, "Operating bank",
            PaymentAccountType.BANK, "MXN", money("1000"), null, PaymentAccountStatus.ACTIVE, null, null, null)).id();
        var expense = expenses.createDraft(finance, new CreateExpenseRequest(
            unit, business, null, null, null, bank, null, "OPERATING-1", "Counter maintenance", null,
            ExpenseType.VARIABLE, money("50"), BigDecimal.ZERO, money("50"), "MXN", today, today,
            user, null, user, false, null, null));
        var payment = new RecordExpensePaymentRequest(money("50"), bank, today, key + "-expense");
        expenses.recordPayment(finance, expense.id(), payment);
        expenses.recordPayment(finance, expense.id(), payment);
        assertThat(accounts.get(finance, bank).currentBalance()).isEqualByComparingTo("950");

        // A managed petty-cash statement transfers money and returns it, never creating revenue.
        long custody = accounts.create(finance, new CreatePaymentAccountRequest(unit, business, "Custody",
            PaymentAccountType.CASH, "MXN", BigDecimal.ZERO, null, PaymentAccountStatus.ACTIVE, null, null, null)).id();
        var fundRequest = json.convertValue(Map.ofEntries(
            Map.entry("name", "Customer managed fund"), Map.entry("unitId", unit), Map.entry("businessId", business),
            Map.entry("currencyCode", "MXN"), Map.entry("fundType", "EXTERNAL_MANAGED"), Map.entry("limitAmount", 100),
            Map.entry("currentBalanceAmount", 0), Map.entry("paymentAccountId", custody), Map.entry("responsibleUserId", user),
            Map.entry("fundingSourcePaymentAccountId", bank), Map.entry("cutOffDay", 28),
            Map.entry("externalOwnerType", "PERSON"), Map.entry("externalOwnerName", "Synthetic customer"),
            Map.entry("externalOwnerRelationship", "CLIENT"), Map.entry("statementRecipientEmail", "isolated@example.test"),
            Map.entry("kioskEnabled", false)), CreatePettyCashFundRequest.class);
        var fund = pettyCash.createFund(finance, fundRequest);
        var deposit = pettyCash.createMovement(finance, fund.id(), new CreatePettyCashMovementRequest(
            null, bank, custody, PettyCashMovementType.ADDITIONAL_DEPOSIT, money("25"), "MXN", today,
            null, "OWNER_CONTRIBUTION", "Synthetic customer", "Custody transfer", "INTERNAL_TRANSFER", null, "Isolated", null, null));
        assertThat(accounts.get(finance, bank).currentBalance()).isEqualByComparingTo("925");
        var statement = pettyCash.closeStatement(finance, fund.id(), deposit.statement().id(),
            new ClosePettyCashStatementRequest(PettyCashStatementCloseAction.RETURN_TO_SOURCE, null, today,
                "Return custody", money("25"), bank, null));
        assertThat(statement.statement().status()).isEqualTo(PettyCashStatementStatus.CLOSED);
        assertThat(accounts.get(finance, bank).currentBalance()).isEqualByComparingTo("950");
        assertThat(accounts.get(finance, custody).currentBalance()).isZero();

        // 5. Inventory is received with purchase evidence, then sold through POS and closed once.
        long warehouse = id(sales.create(company, user, "inventory-warehouses", Map.of(
            "name", "Counter warehouse", "type", "main", "status", "active",
            "businessUnitId", unit, "businessId", business)));
        long product = id(sales.create(company, user, "products", Map.of(
            "name", "Synthetic screw", "type", "PRODUCT", "currency", "MXN", "cost", money("8"),
            "price", money("20"), "status", "active", "inventoryReady", true, "posReady", true)));
        long register = registers.ensureForWarehouse(pos, warehouse).id();
        long shift = shifts.open(pos, new ShiftOpenRequest(register, money("200"), "MXN", "Isolated opening", null, null)).id();
        long provider = receipts.createProvider(pos, new PaidInventoryReceiptDtos.QuickProviderRequest("Synthetic hardware supplier")).id();
        var receiptRequest = new PaidInventoryReceiptDtos.CreateRequest(key + "-receipt", register, shift, provider,
            "MXN", "CASH", null, "Purchase", null, List.of(new PaidInventoryReceiptDtos.ItemRequest(
                new PaidInventoryReceiptDtos.ProductInput(product, null, null, null, "Piece", null, null),
                money("10"), money("8"), BigDecimal.ZERO, false, null, null)));
        var receipt = receipts.create(pos, receiptRequest);
        assertThat(receipts.create(pos, receiptRequest).id()).isEqualTo(receipt.id());
        var saleRequest = new PosCheckoutRequest(register, null, "MXN",
            List.of(new PosCheckoutItemRequest(product, "Synthetic screw", null, "PRODUCT",
                money("2"), money("20"), BigDecimal.ZERO, BigDecimal.ZERO)),
            List.of(new PosCheckoutPaymentRequest("CASH", null, money("40"), null)), null);
        var ticket = checkout.execute(pos, key + "-checkout", saleRequest);
        assertThat(checkout.execute(pos, key + "-checkout", saleRequest).ticket().id()).isEqualTo(ticket.ticket().id());
        var closed = shifts.close(pos, shift, new ShiftCloseRequest(money("160"), "200 opening - 80 purchase + 40 sale"));
        shifts.close(pos, shift, new ShiftCloseRequest(money("160"), "Same close"));
        assertThat(closed.overShortAmount()).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM pos_cash_closings WHERE company_id = ? AND shift_id = ?", Integer.class, company, shift)).isEqualTo(1);

        // A separate commercial sale reaches the same treasury without duplicating the POS sale.
        long assemblyService = id(sales.create(company, user, "products", Map.of(
            "name", "Assembly service", "type", "SERVICE", "currency", "MXN", "cost", BigDecimal.ZERO,
            "price", money("100"), "status", "active", "inventoryReady", false)));
        sales.create(company, user, "sales", Map.ofEntries(
            Map.entry("customerName", "Synthetic customer"), Map.entry("saleDate", today.toString()),
            Map.entry("unitId", unit), Map.entry("businessId", business), Map.entry("currency", "MXN"),
            Map.entry("subtotal", money("100")), Map.entry("taxTotal", BigDecimal.ZERO), Map.entry("totalAmount", money("100")),
            Map.entry("saleLines", List.of(Map.of("productId", assemblyService, "quantity", 1, "unitPrice", 100))),
            Map.entry("paymentMethod", "TRANSFER"), Map.entry("commercialStatus", "approved"),
            Map.entry("financeStatus", "approved"), Map.entry("customFields", Map.of("paymentAccountId", bank))));
        assertThat(accounts.get(finance, bank).currentBalance()).isEqualByComparingTo("1050");

        // Credit collection goes through Cartera; principal is revenue once, collection is cash once.
        long creditSale = id(sales.create(company, user, "sales", Map.ofEntries(
            Map.entry("customerName", "Synthetic credit customer"), Map.entry("saleDate", today.toString()),
            Map.entry("unitId", unit), Map.entry("businessId", business), Map.entry("currency", "MXN"),
            Map.entry("subtotal", money("300")), Map.entry("taxTotal", BigDecimal.ZERO), Map.entry("totalAmount", money("300")),
            Map.entry("saleLines", List.of(Map.of("productId", assemblyService, "quantity", 3, "unitPrice", 100))),
            Map.entry("paymentMethod", "CREDIT"), Map.entry("commercialStatus", "approved"), Map.entry("financeStatus", "pending"))));
        receivables.createCreditPolicy(finance, new CreateCreditPolicyRequest(null, unit, business, null,
            "Synthetic credit customer", "MXN", money("1000"), money("1000"), 3, BigDecimal.ZERO, "ACTIVE", null));
        var simulation = receivables.simulate(new SimulateCreditSaleRequest(money("300"), BigDecimal.ZERO, 3)).getFirst();
        var credit = receivables.createCreditSale(finance, new CreateCreditSaleRequest(
            null, creditSale, null, null, null, null, null, null, null, null, null, null, null,
            money("300"), null, today.plusMonths(1), null, simulation));
        long receivable = credit.receivables().getFirst().id();
        var collection = new RegisterReceivablePaymentRequest(receivable, today, "TRANSFER", money("100"),
            "Isolated payment", null, bank, key + "-collection", null);
        receivables.registerPayment(finance, collection);
        var creditReplay = receivables.registerPayment(finance, collection);
        assertThat(creditReplay.receivables().getFirst().balance()).isEqualByComparingTo("200");
        assertThat(creditReplay.payments()).hasSize(1);
        assertThat(accounts.get(finance, bank).currentBalance()).isEqualByComparingTo("1150");

        // 6. The same scoped operations reach central KPIs and balanced, idempotent accounting.
        var scope = new ExecutiveKpiScope(company, today, today, "custom", unit, business, "", "all", "MXN", today);
        assertThat(domains.loadPeople(scope).activeCollaborators()).isEqualTo(1);
        assertThat(domains.loadProcesses(scope).closedTasks()).isEqualTo(1);
        assertThat(domains.loadExpenses(scope).expenseCount()).isEqualTo(1);
        assertThat(pettyCash.workspace(finance).funds()).hasSize(1);
        assertThat(domains.loadPettyCash(scope).fundCount()).as("External custody is not company working capital").isZero();
        assertThat(domains.loadInventory(scope).availableUnits()).isEqualTo(8);
        assertThat(sum(executive.loadSalesByOrg(scope), "salesTotal")).isEqualByComparingTo("440");
        assertThat(sum(executive.loadCollectionsByOrg(scope), "collectedTotal")).isEqualByComparingTo("240");
        assertMoney(BasicModuleKpiMetric.SALES_TOTAL, company, today, "440");
        assertMoney(BasicModuleKpiMetric.SALES_COLLECTED, company, today, "240");
        assertMoney(BasicModuleKpiMetric.POS_CLOSING_TOTAL, company, today, "40");
        assertMoney(BasicModuleKpiMetric.EXPENSE_PAID, company, today, "50");
        assertMoney(BasicModuleKpiMetric.RECEIVABLE_BALANCE, company, today, "200");
        assertMoney(BasicModuleKpiMetric.RECEIVABLE_PAYMENT_AMOUNT, company, today, "100");

        var sync = synchronization.synchronize(company, user, today, today);
        assertThat(sync.blocked()).as("All operation sources must be recognized: %s", sync.findings()).isZero();
        assertThat(sync.posted()).isPositive();
        var replay = synchronization.synchronize(company, user, today, today);
        assertThat(replay.posted()).isZero();
        assertThat(replay.blocked()).isZero();
        // Treasury setup is not an automatic accounting opening. Publish its documented counterpart.
        long cash = accountingAccount(company, "CASH");
        long capital = accountingAccount(company, "CONTRIBUTED_CAPITAL");
        var opening = new AccountingManualEntryService.EntryRequest("OPENING", today,
            "Synthetic documented opening: bank 1000 and POS float 200", "ISOLATED-OPENING", key + "-opening",
            List.of(
                new AccountingManualEntryService.EntryLine(cash, unit, business, "MXN", money("1200"), BigDecimal.ZERO),
                new AccountingManualEntryService.EntryLine(capital, unit, business, "MXN", BigDecimal.ZERO, money("1200"))));
        var preview = manualEntries.preview(company, opening);
        var publication = new AccountingManualEntryService.PostRequest(opening, preview.previewHash());
        assertThat(manualEntries.post(company, user, publication).alreadyPosted()).isFalse();
        assertThat(manualEntries.post(company, user, publication).alreadyPosted()).isTrue();
        var report = reporting.report(company, today, today, null, null);
        assertThat(report.headline().revenue()).isEqualByComparingTo("440");
        assertThat(report.headline().grossProfit()).isEqualByComparingTo("424");
        assertThat(report.headline().netProfit()).isEqualByComparingTo("374");
        assertThat(report.headline().totalAssets()).isEqualByComparingTo("1574");
        assertThat(report.headline().totalEquity()).isEqualByComparingTo("1574");
        assertThat(report.headline().totalLiabilities()).isZero();
        assertThat(report.readiness().decisionReady()).as("Findings: %s", report.findings()).isTrue();
        assertThat(report.statements()).extracting(FinancialReportingContracts.FinancialStatement::id)
            .containsExactly("profit-loss", "financial-position", "cash-flow", "changes-equity");
        assertThat(report.statements()).allMatch(FinancialReportingContracts.FinancialStatement::internallyConsistent);
        assertThat(jdbc.queryForObject("SELECT SUM(debit_amount-credit_amount) FROM finance_journal_lines WHERE company_id = ?", BigDecimal.class, company)).isZero();

        // A second tenant cannot read or reuse this tenant's account, product, or reporting scope.
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "Other tenant " + key);
        long other = jdbc.queryForObject("SELECT id FROM companies WHERE name = ?", Long.class, "Other tenant " + key);
        ledger.ensureSettings(other, user);
        var foreignFinance = new FinanceContext(user, other, "Synthetic", "superadmin", true, FinanceScope.corporateOffice());
        assertThatThrownBy(() -> accounts.get(foreignFinance, bank)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(() -> sales.get(other, "products", product)).isInstanceOf(NoSuchElementException.class);
        assertThatThrownBy(() -> reporting.report(other, today, today, unit, business)).isInstanceOf(IllegalArgumentException.class);
        var foreignScope = new ExecutiveKpiScope(other, today, today, "custom", null, null, "", "all", "MXN", today);
        assertThat(executive.loadSalesByOrg(foreignScope)).isEmpty();
        assertThat(executive.loadCollectionsByOrg(foreignScope)).isEmpty();
    }

    private static long id(Map<String, Object> value) { return ((Number) value.get("id")).longValue(); }
    private long accountingAccount(long company, String code) {
        return jdbc.queryForObject("SELECT id FROM finance_accounting_accounts WHERE company_id = ? AND system_code = ?", Long.class, company, code);
    }
    private void assertMoney(BasicModuleKpiMetric metric, long company, LocalDate today, String expected) {
        var amounts = moduleMoney.load(metric, company, null, null, List.of(), false, today, timeZones.resolve(company));
        assertThat(amounts).allMatch(amount -> "MXN".equals(amount.currency()));
        assertThat(amounts.stream().map(KpiMoneyAmount::amount).reduce(BigDecimal.ZERO, BigDecimal::add))
            .as(metric.name()).isEqualByComparingTo(expected);
    }
    private static BigDecimal money(String value) { return new BigDecimal(value); }
    private static BigDecimal sum(List<Map<String, Object>> rows, String field) {
        return rows.stream().map(row -> (BigDecimal) row.get(field)).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
