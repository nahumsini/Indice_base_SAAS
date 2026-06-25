package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.budgetlines.dto.CreateBudgetLineRequest;
import com.indice.erp.finance.budgetlines.dto.UpdateBudgetLineRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceValidationSupport;
import org.springframework.stereotype.Component;

@Component
public class BudgetLineValidator {

    private final FinanceAccessService accessService;

    public BudgetLineValidator(FinanceAccessService accessService) {
        this.accessService = accessService;
    }

    public BudgetLineScopedAssignment validateCreate(FinanceContext context, CreateBudgetLineRequest request) {
        requireFields(request.budgetId(), request.name(), request.plannedAmount(), request.currencyCode());
        rejectDerivedFields(request.committedAmount(), request.actualExpenseAmount(), request.pettyCashIssuedAmount(),
            request.pettyCashSettledAmount(), request.availableAmount(), request.healthStatus());
        return resolveAssignment(context, request.unitId(), request.businessId());
    }

    public BudgetLineScopedAssignment validateUpdate(FinanceContext context, UpdateBudgetLineRequest request) {
        requireFields(request.budgetId(), request.name(), request.plannedAmount(), request.currencyCode());
        rejectDerivedFields(request.committedAmount(), request.actualExpenseAmount(), request.pettyCashIssuedAmount(),
            request.pettyCashSettledAmount(), request.availableAmount(), request.healthStatus());
        return resolveAssignment(context, request.unitId(), request.businessId());
    }

    private void requireFields(Long budgetId, String name, java.math.BigDecimal plannedAmount, String currencyCode) {
        if (budgetId == null) {
            throw FinanceApiException.badRequest("budgetId is required.");
        }
        if (name == null || name.trim().isBlank()) {
            throw FinanceApiException.badRequest("name is required.");
        }
        FinanceValidationSupport.requireNonNegative(plannedAmount, "plannedAmount");
        FinanceValidationSupport.requireCurrencyCode(currencyCode);
    }

    private void rejectDerivedFields(Object committed, Object actual, Object issued, Object settled,
            Object available, Object health) {
        if (committed != null || actual != null || issued != null || settled != null
                || available != null || health != null) {
            throw FinanceApiException.badRequest("Derived budget line fields cannot be provided.");
        }
    }

    private BudgetLineScopedAssignment resolveAssignment(
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
        return new BudgetLineScopedAssignment(unitId, businessId);
    }
}
