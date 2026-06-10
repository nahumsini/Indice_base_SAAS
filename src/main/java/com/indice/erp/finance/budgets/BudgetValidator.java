package com.indice.erp.finance.budgets;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.budgets.dto.CreateBudgetRequest;
import com.indice.erp.finance.budgets.dto.UpdateBudgetRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceValidationSupport;
import java.time.LocalDate;
import org.springframework.stereotype.Component;

@Component
public class BudgetValidator {

    private final FinanceAccessService accessService;

    public BudgetValidator(FinanceAccessService accessService) {
        this.accessService = accessService;
    }

    BudgetScopedAssignment validateCreate(FinanceContext context, CreateBudgetRequest request) {
        requireFields(request.name(), request.periodStart(), request.periodEnd(), request.currencyCode());
        return resolveAssignment(context, request.unitId(), request.businessId());
    }

    BudgetScopedAssignment validateUpdate(FinanceContext context, UpdateBudgetRequest request) {
        requireFields(request.name(), request.periodStart(), request.periodEnd(), request.currencyCode());
        return resolveAssignment(context, request.unitId(), request.businessId());
    }

    private void requireFields(String name, LocalDate periodStart, LocalDate periodEnd, String currencyCode) {
        if (name == null || name.trim().isBlank()) {
            throw FinanceApiException.badRequest("name is required.");
        }
        if (periodStart == null) {
            throw FinanceApiException.badRequest("periodStart is required.");
        }
        if (periodEnd == null) {
            throw FinanceApiException.badRequest("periodEnd is required.");
        }
        if (periodEnd.isBefore(periodStart)) {
            throw FinanceApiException.badRequest("periodEnd cannot be before periodStart.");
        }
        FinanceValidationSupport.requireCurrencyCode(currencyCode);
    }

    private BudgetScopedAssignment resolveAssignment(
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
        return new BudgetScopedAssignment(unitId, businessId);
    }
}
