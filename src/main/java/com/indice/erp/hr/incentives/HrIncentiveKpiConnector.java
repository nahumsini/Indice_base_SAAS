package com.indice.erp.hr.incentives;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

/**
 * Stable extension point for the final KPI engine.
 *
 * <p>Payroll does not depend on the provisional KPI implementation. The final
 * KPI engine only needs to provide this resolver to make KPI incentives
 * calculable without changing the payroll or incentive contracts.</p>
 */
@FunctionalInterface
public interface HrIncentiveKpiConnector {

    Optional<ResolvedKpiAmount> resolve(KpiIncentiveRequest request);

    record KpiIncentiveRequest(
        long companyId,
        long incentiveId,
        long applicationId,
        long userCompanyId,
        String sourceReferenceType,
        String sourceReferenceId,
        LocalDate periodStartDate,
        LocalDate periodEndDate,
        String currencyCode
    ) {
    }

    record ResolvedKpiAmount(BigDecimal amount, String evidenceReference) {
    }
}
