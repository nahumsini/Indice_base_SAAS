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
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
class PettyCashValidator {

    private static final Set<String> EXTERNAL_OWNER_TYPES = Set.of("PERSON", "COMPANY", "TRUST", "OTHER");
    private static final Set<String> EXTERNAL_OWNER_RELATIONSHIPS = Set.of(
        "CLIENT", "OWNER", "PARTNER", "BENEFICIARY", "OTHER"
    );

    private final FinanceAccessService accessService;
    private final PettyCashReferenceValidator referenceValidator;

    PettyCashValidator(FinanceAccessService accessService, PettyCashReferenceValidator referenceValidator) {
        this.accessService = accessService;
        this.referenceValidator = referenceValidator;
    }

    PettyCashScopedAssignment validateCreate(FinanceContext context, CreatePettyCashFundRequest request) {
        PettyCashManagedAssets.resolve(request.managedAssets(), request.managedAssetType(),
            request.managedAssetName(), request.managedAssetReference(), null);
        requireName(request.name());
        FinanceValidationSupport.requireCurrencyCode(request.currencyCode());
        requireNonNegative(request.limitAmount(), "limitAmount");
        var fundType = resolveFundType(request.fundType(), request.fundingSourcePaymentAccountId());
        requirePaymentAccount(request.paymentAccountId());
        validateFundClassification(
            fundType, request.budgetId(), request.budgetLineId(), request.fundingSourcePaymentAccountId(),
            request.fundingSourceName(), request.externalOwnerType(), request.externalOwnerName(),
            request.externalOwnerRelationship(), request.statementRecipientEmail(), false, false, false
        );
        var assignment = resolveAssignment(context, request.unitId(), request.businessId());
        referenceValidator.validateFundReferences(context, assignment, request.budgetId(), request.budgetLineId(),
            request.paymentAccountId(), request.fundingSourcePaymentAccountId(), request.responsibleUserId(), request.currencyCode());
        return assignment;
    }

    PettyCashScopedAssignment validateUpdate(
            FinanceContext context,
            UpdatePettyCashFundRequest request,
            PettyCashFundRecord existing) {
        PettyCashManagedAssets.resolve(request.managedAssets(), request.managedAssetType(),
            request.managedAssetName(), request.managedAssetReference(), PettyCashManagedAssets.read(existing.managedAssetsJson(), existing.managedAssetType(), existing.managedAssetName(), existing.managedAssetReference()));
        requireName(request.name());
        FinanceValidationSupport.requireCurrencyCode(request.currencyCode());
        requireNonNegative(request.limitAmount(), "limitAmount");
        var fundType = resolveFundType(request.fundType(), request.fundingSourcePaymentAccountId());
        var preserveLegacyPendingIdentity = existing.fundType() == PettyCashFundType.EXTERNAL_MANAGED
            && Boolean.TRUE.equals(existing.externalIdentityPending())
            && fundType == PettyCashFundType.EXTERNAL_MANAGED;
        var preserveLegacyMissingBudget = existing.fundType() == PettyCashFundType.INTERNAL_COMPANY
            && existing.budgetId() == null
            && existing.budgetLineId() == null
            && fundType == PettyCashFundType.INTERNAL_COMPANY
            && request.budgetId() == null
            && request.budgetLineId() == null;
        var preserveLegacyMissingSourceAccount = existing.fundType() == PettyCashFundType.INTERNAL_COMPANY
            && existing.fundingSourcePaymentAccountId() == null
            && fundType == PettyCashFundType.INTERNAL_COMPANY
            && request.fundingSourcePaymentAccountId() == null;
        requirePaymentAccount(request.paymentAccountId());
        validateFundClassification(
            fundType, request.budgetId(), request.budgetLineId(), request.fundingSourcePaymentAccountId(),
            request.fundingSourceName(), request.externalOwnerType(), request.externalOwnerName(),
            request.externalOwnerRelationship(), request.statementRecipientEmail(), preserveLegacyPendingIdentity, preserveLegacyMissingBudget,
            preserveLegacyMissingSourceAccount
        );
        var assignment = resolveAssignment(context, request.unitId(), request.businessId());
        referenceValidator.validateFundReferences(context, assignment, request.budgetId(), request.budgetLineId(),
            request.paymentAccountId(), request.fundingSourcePaymentAccountId(), request.responsibleUserId(), request.currencyCode());
        return assignment;
    }

    void validateMovement(
            FinanceContext context,
            PettyCashFundRecord fund,
            CreatePettyCashMovementRequest request) {
        if (request.type() == null) {
            throw FinanceApiException.badRequest("type is required.");
        }
        FinanceValidationSupport.requireCurrencyCode(request.currencyCode());
        requirePositive(request.amount(), "amount");
        referenceValidator.validateMovementReferences(
            context,
            request.fromPaymentAccountId(),
            request.toPaymentAccountId(),
            request.currencyCode()
        );
        if (request.type() == PettyCashMovementType.INITIAL_FUNDING
                || request.type() == PettyCashMovementType.ADDITIONAL_DEPOSIT
                || request.type() == PettyCashMovementType.RETURN_TO_SOURCE) {
            requireText(request.statementDescription(), "statementDescription");
            if (fund.fundType() == PettyCashFundType.INTERNAL_COMPANY) {
                if (request.externalSourceName() != null && !request.externalSourceName().isBlank()) {
                    throw FinanceApiException.badRequest("Internal funds cannot use an external funding source.");
                }
            } else {
                var counterAccountId = request.type() == PettyCashMovementType.RETURN_TO_SOURCE
                    ? request.toPaymentAccountId() : request.fromPaymentAccountId();
                if (counterAccountId == null && fund.fundingSourcePaymentAccountId() == null) {
                    requireText(request.externalSourceName(), "externalSourceName");
                }
            }
        }
    }

    void validateMovementAccounts(
            FinanceContext context,
            Long fromPaymentAccountId,
            Long toPaymentAccountId,
            String currencyCode) {
        FinanceValidationSupport.requireCurrencyCode(currencyCode);
        referenceValidator.validateMovementReferences(
            context, fromPaymentAccountId, toPaymentAccountId, currencyCode);
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

    private void requirePaymentAccount(Long paymentAccountId) {
        if (paymentAccountId == null) {
            throw FinanceApiException.badRequest("paymentAccountId is required for a fund that administers money.");
        }
    }

    private void validateFundClassification(
            PettyCashFundType fundType,
            Long budgetId,
            Long budgetLineId,
            Long fundingSourcePaymentAccountId,
            String fundingSourceName,
            String externalOwnerType,
            String externalOwnerName,
            String externalOwnerRelationship,
            String statementRecipientEmail,
            boolean allowLegacyPendingIdentity,
            boolean allowLegacyMissingBudget,
            boolean allowLegacyMissingSourceAccount) {
        if (fundType == PettyCashFundType.INTERNAL_COMPANY) {
            if (!allowLegacyMissingBudget && (budgetId == null || budgetLineId == null)) {
                throw FinanceApiException.badRequest("Internal funds require a budget and budget line.");
            }
            return;
        }
        if (budgetId != null || budgetLineId != null) {
            throw FinanceApiException.badRequest("External managed funds cannot affect a company budget.");
        }
        validateCode(externalOwnerType, EXTERNAL_OWNER_TYPES, "externalOwnerType", allowLegacyPendingIdentity);
        validateCode(
            externalOwnerRelationship, EXTERNAL_OWNER_RELATIONSHIPS,
            "externalOwnerRelationship", allowLegacyPendingIdentity
        );
        if (!allowLegacyPendingIdentity) {
            requireText(externalOwnerName, "externalOwnerName");
            requireText(statementRecipientEmail, "statementRecipientEmail");
        }
    }

    private PettyCashFundType resolveFundType(PettyCashFundType requested, Long sourceAccountId) {
        if (requested != null) {
            return requested;
        }
        return sourceAccountId == null ? PettyCashFundType.EXTERNAL_MANAGED : PettyCashFundType.INTERNAL_COMPANY;
    }

    private void validateCode(String value, Set<String> allowed, String fieldName, boolean optional) {
        if (value == null || value.isBlank()) {
            if (optional) {
                return;
            }
            throw FinanceApiException.badRequest(fieldName + " is required.");
        }
        var normalized = value.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if (!allowed.contains(normalized)) {
            throw FinanceApiException.badRequest(fieldName + " is invalid.");
        }
    }

    private void requireText(String value, String fieldName) {
        if (value == null || value.trim().isBlank()) {
            throw FinanceApiException.badRequest(fieldName + " is required.");
        }
    }
}
