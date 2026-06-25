package com.indice.erp.finance.accountingaccounts;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.accountingaccounts.dto.CreateAccountingAccountRequest;
import com.indice.erp.finance.accountingaccounts.dto.UpdateAccountingAccountRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import org.springframework.stereotype.Component;

@Component
public class AccountingAccountValidator {

    private final FinanceAccessService accessService;

    public AccountingAccountValidator(FinanceAccessService accessService) {
        this.accessService = accessService;
    }

    public AccountingAccountScopedAssignment validateCreate(
            FinanceContext context,
            CreateAccountingAccountRequest request) {
        requireFields(request.code(), request.name(), request.groupKey());
        return resolveAssignment(context, request.unitId(), request.businessId());
    }

    public AccountingAccountScopedAssignment validateUpdate(
            FinanceContext context,
            UpdateAccountingAccountRequest request) {
        requireFields(request.code(), request.name(), request.groupKey());
        return resolveAssignment(context, request.unitId(), request.businessId());
    }

    private void requireFields(String code, String name, AccountingAccountGroup groupKey) {
        if (code == null || code.trim().isBlank()) {
            throw FinanceApiException.badRequest("code is required.");
        }
        if (name == null || name.trim().isBlank()) {
            throw FinanceApiException.badRequest("name is required.");
        }
        if (groupKey == null) {
            throw FinanceApiException.badRequest("groupKey is required.");
        }
    }

    private AccountingAccountScopedAssignment resolveAssignment(
            FinanceContext context,
            Long requestedUnitId,
            Long requestedBusinessId) {
        var scope = context.scope();
        var unitId = requestedUnitId;
        var businessId = requestedBusinessId;

        if (scope.type() == FinanceScope.Type.UNIT_HEADQUARTERS) {
            if (unitId != null && !unitId.equals(scope.unitId())) {
                throw FinanceApiException.forbidden("Forbidden");
            }
            unitId = scope.unitId();
        }

        if (scope.type() == FinanceScope.Type.BUSINESS_OFFICE) {
            if (businessId != null && !businessId.equals(scope.businessId())) {
                throw FinanceApiException.forbidden("Forbidden");
            }
            if (unitId != null && scope.unitId() != null && !unitId.equals(scope.unitId())) {
                throw FinanceApiException.forbidden("Forbidden");
            }
            unitId = unitId == null ? scope.unitId() : unitId;
            businessId = scope.businessId();
        }

        if (!accessService.containsAssignment(context, unitId, businessId)) {
            throw FinanceApiException.forbidden("Forbidden");
        }
        return new AccountingAccountScopedAssignment(unitId, businessId);
    }
}
