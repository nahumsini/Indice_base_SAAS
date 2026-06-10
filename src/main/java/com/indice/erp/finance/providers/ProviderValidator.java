package com.indice.erp.finance.providers;

import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.providers.dto.CreateProviderRequest;
import com.indice.erp.finance.providers.dto.UpdateProviderRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import org.springframework.stereotype.Component;

@Component
public class ProviderValidator {

    private final FinanceAccessService accessService;

    public ProviderValidator(FinanceAccessService accessService) {
        this.accessService = accessService;
    }

    public ProviderScopedAssignment validateCreate(FinanceContext context, CreateProviderRequest request) {
        requireName(request.name());
        requirePaymentTerms(request.paymentTermsDays());
        return resolveAssignment(context, request.unitId(), request.businessId());
    }

    public ProviderScopedAssignment validateUpdate(FinanceContext context, UpdateProviderRequest request) {
        requireName(request.name());
        requirePaymentTerms(request.paymentTermsDays());
        return resolveAssignment(context, request.unitId(), request.businessId());
    }

    private void requireName(String name) {
        if (name == null || name.trim().isBlank()) {
            throw FinanceApiException.badRequest("name is required.");
        }
    }

    private void requirePaymentTerms(Integer paymentTermsDays) {
        if (paymentTermsDays != null && paymentTermsDays < 0) {
            throw FinanceApiException.badRequest("paymentTermsDays must be non-negative.");
        }
    }

    private ProviderScopedAssignment resolveAssignment(
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
        return new ProviderScopedAssignment(unitId, businessId);
    }
}
