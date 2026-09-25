package com.indice.erp.ai.reference;

import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.PageRequest;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.ReferencePage;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.accountingaccounts.AccountingAccountService;
import com.indice.erp.finance.budgetlines.BudgetLineService;
import com.indice.erp.finance.providers.ProviderService;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.sales.SalesReferenceReadService;
import java.math.BigDecimal;
import java.time.Clock;
import java.util.Comparator;
import org.springframework.stereotype.Service;

@Service
public class AiOperationalReferenceService {
    private final AiToolAuthorizationService authorization;
    private final HrOperationalScopeService scopes;
    private final SalesReferenceReadService sales;
    private final FinanceAccessService financeAccess;
    private final ProviderService providers;
    private final BudgetLineService budgets;
    private final AccountingAccountService accounts;
    private final Clock clock;

    public AiOperationalReferenceService(AiToolAuthorizationService authorization, HrOperationalScopeService scopes,
            SalesReferenceReadService sales, FinanceAccessService financeAccess, ProviderService providers,
            BudgetLineService budgets, AccountingAccountService accounts, Clock clock) {
        this.authorization = authorization;
        this.scopes = scopes;
        this.sales = sales;
        this.financeAccess = financeAccess;
        this.providers = providers;
        this.budgets = budgets;
        this.accounts = accounts;
        this.clock = clock;
    }

    public ReferencePage<SalesReferenceReadService.Customer> customers(AuthSessionUser user, PageRequest request) {
        require(authorization.canReadCustomers(user));
        var page = AiReferencePages.normalize(request);
        var scope = scopes.resolve(user);
        var result = sales.customers(user.companyId(), scope, page.query(), page.offset(), page.limit());
        return AiReferencePages.page(clock, scope.type().name(), result.items(), result.totalCount(), page);
    }

    public ReferencePage<SalesReferenceReadService.Warehouse> warehouses(AuthSessionUser user, PageRequest request) {
        require(authorization.canReadWarehouses(user));
        var page = AiReferencePages.normalize(request);
        var scope = scopes.resolve(user);
        var result = sales.warehouses(user.companyId(), scope, page.query(), page.offset(), page.limit());
        return AiReferencePages.page(clock, scope.type().name(), result.items(), result.totalCount(), page);
    }

    public ReferencePage<Provider> providers(AuthSessionUser user, PageRequest request) {
        require(authorization.canReadProviders(user));
        var page = AiReferencePages.normalize(request);
        // The shared provider owner serves Inventory and Expenses. The MCP gate above authorizes
        // read only; this context is never reused to grant finance writes to an inventory user.
        var scope = scopes.resolve(user);
        var financeScope = switch (scope.type()) {
            case CORPORATE_OFFICE -> FinanceScope.corporateOffice();
            case UNIT_HEADQUARTERS -> FinanceScope.unitHeadquarters(scope.unitId());
            case BUSINESS_OFFICE -> FinanceScope.businessOffice(scope.unitId(), scope.businessId());
            case UNASSIGNED -> throw new SecurityException("Organizational scope is required.");
        };
        var context = new FinanceContext(user.userId(), user.companyId(), user.userName(), user.role(), true, financeScope);
        var items = providers.list(context).providers().stream()
            .map(item -> new Provider(item.id(), item.name(), item.legalName(), item.paymentTermsDays(),
                item.status().name(), item.unitId(), item.businessId()))
            .filter(item -> AiReferencePages.matches(page.query(), item.name(), item.legalName()))
            .sorted(Comparator.comparingLong(Provider::id)).toList();
        return AiReferencePages.all(clock, scope.type().name(), items, page);
    }

    public ReferencePage<BudgetLine> budgetLines(AuthSessionUser user, PageRequest request) {
        require(authorization.canReadBudgetLines(user));
        var page = AiReferencePages.normalize(request);
        var context = financeContext(user);
        var items = budgets.list(context).budgetLines().stream()
            .map(item -> new BudgetLine(item.id(), item.name(), item.budgetId(), item.categoryKey(), item.currencyCode(),
                item.plannedAmount(), item.committedAmount(), item.actualExpenseAmount(), item.availableAmount(),
                item.healthStatus().name(), item.status().name(), item.unitId(), item.businessId()))
            .filter(item -> AiReferencePages.matches(page.query(), item.name(), item.categoryKey()))
            .sorted(Comparator.comparingLong(BudgetLine::id)).toList();
        return AiReferencePages.all(clock, context.scope().type().name(), items, page);
    }

    public ReferencePage<AccountingAccount> accountingAccounts(AuthSessionUser user, PageRequest request) {
        require(authorization.canReadAccountingAccounts(user));
        var page = AiReferencePages.normalize(request);
        var context = financeContext(user);
        var items = accounts.list(context).accounts().stream()
            .map(item -> new AccountingAccount(item.id(), item.code(), item.name(), item.groupKey().name(),
                item.status().name(), item.unitId(), item.businessId()))
            .filter(item -> AiReferencePages.matches(page.query(), item.code(), item.name(), item.groupKey()))
            .sorted(Comparator.comparingLong(AccountingAccount::id)).toList();
        return AiReferencePages.all(clock, context.scope().type().name(), items, page);
    }

    private FinanceContext financeContext(AuthSessionUser user) {
        return financeAccess.resolveContext(user)
            .orElseThrow(() -> new SecurityException("Organizational finance access is required."));
    }

    private void require(boolean allowed) {
        if (!allowed) throw new SecurityException("Current Indice permissions do not allow this reference tool.");
    }

    public record Provider(long id, String name, String legalName, Integer paymentTermsDays, String status,
        Long unitId, Long businessId) { }
    public record BudgetLine(long id, String name, Long budgetId, String categoryKey, String currencyCode,
        BigDecimal plannedAmount, BigDecimal committedAmount, BigDecimal actualExpenseAmount, BigDecimal availableAmount,
        String healthStatus, String status, Long unitId, Long businessId) { }
    public record AccountingAccount(long id, String code, String name, String groupKey, String status,
        Long unitId, Long businessId) { }
}
