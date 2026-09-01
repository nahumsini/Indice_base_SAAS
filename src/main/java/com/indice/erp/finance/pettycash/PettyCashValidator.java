package com.indice.erp.finance.pettycash;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashFundRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashMovementRequest;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashSettlementLineRequest;
import com.indice.erp.finance.pettycash.dto.UpdatePettyCashFundRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.finance.shared.FinanceValidationSupport;
import java.math.BigDecimal;
import org.springframework.stereotype.Component;

@Component
class PettyCashValidator {

    private final FinanceAccessService accessService;
    private final PettyCashReferenceValidator referenceValidator;

    PettyCashValidator(FinanceAccessService accessService, PettyCashReferenceValidator referenceValidator) {
        this.accessService = accessService;
        this.referenceValidator = referenceValidator;
    }

    PettyCashScopedAssignment validateCreate(FinanceContext context, CreatePettyCashFundRequest request) {
        requireName(request.name());
        FinanceValidationSupport.requireCurrencyCode(request.currencyCode());
        requireNonNegative(request.limitAmount(), "limitAmount");
        var assignment = resolveAssignment(context, request.unitId(), request.businessId());
        referenceValidator.validateFundReferences(context, assignment, request.budgetId(), request.budgetLineId(),
            request.paymentAccountId(), request.fundingSourcePaymentAccountId(), request.responsibleUserId(), request.currencyCode());
        return assignment;
    }

    PettyCashScopedAssignment validateUpdate(FinanceContext context, UpdatePettyCashFundRequest request) {
        requireName(request.name());
        FinanceValidationSupport.requireCurrencyCode(request.currencyCode());
        requireNonNegative(request.limitAmount(), "limitAmount");
        var assignment = resolveAssignment(context, request.unitId(), request.businessId());
        referenceValidator.validateFundReferences(context, assignment, request.budgetId(), request.budgetLineId(),
            request.paymentAccountId(), request.fundingSourcePaymentAccountId(), request.responsibleUserId(), request.currencyCode());
        return assignment;
    }

    void validateMovement(FinanceContext context, CreatePettyCashMovementRequest request) {
        FinanceValidationSupport.requireCurrencyCode(request.currencyCode());
        requirePositive(request.amount(), "amount");
        referenceValidator.validateMovementReferences(
            context,
            request.fromPaymentAccountId(),
            request.toPaymentAccountId(),
            request.currencyCode()
        );
    }

    void validateSettlementLine(FinanceContext context, CreatePettyCashSettlementLineRequest request) {
        requireName(request.description());
        FinanceValidationSupport.requireCurrencyCode(request.currencyCode());
        requirePositive(request.totalAmount(), "totalAmount");
        var taxAmount = request.taxAmount() == null ? BigDecimal.ZERO : request.taxAmount();
        requireNonNegative(taxAmount, "taxAmount");
        var subtotalAmount = request.subtotalAmount();
        if (subtotalAmount == null) {
            subtotalAmount = request.totalAmount().subtract(taxAmount);
            if (subtotalAmount.signum() < 0) {
                throw FinanceApiException.badRequest("taxAmount cannot exceed totalAmount.");
            }
        } else {
            requireNonNegative(subtotalAmount, "subtotalAmount");
        }
        if (subtotalAmount.add(taxAmount).compareTo(request.totalAmount()) != 0) {
            throw FinanceApiException.badRequest(
                "subtotalAmount plus taxAmount must equal totalAmount.");
        }
        referenceValidator.validateSettlementReferences(context, request.expenseId(), request.providerId(), request.accountingAccountId());
    }

    private PettyCashScopedAssignment resolveAssignment(
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
        return new PettyCashScopedAssignment(unitId, businessId);
    }

    private void requireName(String value) {
        if (value == null || value.trim().isBlank()) {
            throw FinanceApiException.badRequest("name is required.");
        }
    }

    private void requirePositive(BigDecimal amount, String fieldName) {
        if (amount == null || amount.signum() <= 0) {
            throw FinanceApiException.badRequest(fieldName + " must be greater than zero.");
        }
    }

    private void requireNonNegative(BigDecimal amount, String fieldName) {
        if (amount == null || amount.signum() < 0) {
            throw FinanceApiException.badRequest(fieldName + " must be non-negative.");
        }
    }
}
