package com.indice.erp.finance.expenses;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.expenses.dto.CreateExpenseRequest;
import com.indice.erp.finance.expenses.dto.UpdateExpenseRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceValidationSupport;
import com.indice.erp.finance.status.ExpenseStatus;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
public class ExpenseValidator {

    private final FinanceAccessService accessService;

    public ExpenseValidator(FinanceAccessService accessService) {
        this.accessService = accessService;
    }

    public ExpenseScopedAssignment validateCreate(FinanceContext context, CreateExpenseRequest request) {
        validateDraftValues(request.subtotalAmount(), request.taxAmount(), request.totalAmount(), request.currencyCode());
        return resolveAssignment(context, request.unitId(), request.businessId());
    }

    public ExpenseScopedAssignment validateUpdate(FinanceContext context, UpdateExpenseRequest request) {
        validateDraftValues(request.subtotalAmount(), request.taxAmount(), request.totalAmount(), request.currencyCode());
        return resolveAssignment(context, request.unitId(), request.businessId());
    }

    public void requireDraft(ExpenseRecord record, String action) {
        if (record.status() != ExpenseStatus.DRAFT) {
            throw FinanceApiException.conflict("Only draft expenses can be " + action + ".");
        }
    }

    private void validateDraftValues(BigDecimal subtotal, BigDecimal tax, BigDecimal total, String currencyCode) {
        FinanceValidationSupport.requireNonNegative(subtotal, "subtotalAmount");
        FinanceValidationSupport.requireNonNegative(tax, "taxAmount");
        FinanceValidationSupport.requireNonNegative(total, "totalAmount");
        FinanceValidationSupport.requireCurrencyCode(currencyCode);
        if (subtotal.add(tax).compareTo(total) != 0) {
            throw FinanceApiException.badRequest("totalAmount must equal subtotalAmount plus taxAmount.");
        }
    }

    private ExpenseScopedAssignment resolveAssignment(FinanceContext context, Long requestedUnitId, Long requestedBusinessId) {
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
        return new ExpenseScopedAssignment(unitId, businessId);
    }
}
