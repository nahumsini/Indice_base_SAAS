package com.indice.erp.finance.paymentaccounts;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.paymentaccounts.dto.CreatePaymentAccountRequest;
import com.indice.erp.finance.paymentaccounts.dto.UpdatePaymentAccountRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceValidationSupport;
import org.springframework.stereotype.Component;

@Component
public class PaymentAccountValidator {

    private final FinanceAccessService accessService;

    public PaymentAccountValidator(FinanceAccessService accessService) {
        this.accessService = accessService;
    }

    public PaymentAccountScopedAssignment validateCreate(
            FinanceContext context,
            CreatePaymentAccountRequest request) {
        requireFields(request.name(), request.type(), request.currencyCode());
        FinanceValidationSupport.requireNonNegative(request.openingBalance(), "openingBalance");
        rejectCurrentBalance(request.currentBalance());
        return resolveAssignment(context, request.unitId(), request.businessId());
    }

    public PaymentAccountScopedAssignment validateUpdate(
            FinanceContext context,
            UpdatePaymentAccountRequest request) {
        requireFields(request.name(), request.type(), request.currencyCode());
        rejectOpeningBalance(request.openingBalance());
        rejectCurrentBalance(request.currentBalance());
        return resolveAssignment(context, request.unitId(), request.businessId());
    }

    private void requireFields(String name, PaymentAccountType type, String currencyCode) {
        if (name == null || name.trim().isBlank()) {
            throw FinanceApiException.badRequest("name is required.");
        }
        if (type == null) {
            throw FinanceApiException.badRequest("type is required.");
        }
        FinanceValidationSupport.requireCurrencyCode(currencyCode);
    }

    private void rejectOpeningBalance(Object openingBalance) {
        if (openingBalance != null) {
            throw FinanceApiException.badRequest("openingBalance cannot be updated in this phase.");
        }
    }

    private void rejectCurrentBalance(Object currentBalance) {
        if (currentBalance != null) {
            throw FinanceApiException.badRequest("currentBalance is backend-derived and cannot be provided.");
        }
    }

    private PaymentAccountScopedAssignment resolveAssignment(
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
        return new PaymentAccountScopedAssignment(unitId, businessId);
    }
}
