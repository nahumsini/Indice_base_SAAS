package com.indice.erp.finance.budgetlines;

import com.indice.erp.entitlement.CompanyEntitlementService;
import com.indice.erp.entitlement.EntitlementPolicyMode;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.ArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class BudgetExpenseSynchronizationService {
    private static final Logger LOG = LoggerFactory.getLogger(BudgetExpenseSynchronizationService.class);
    private final BudgetExpenseOccurrenceRepository occurrences;
    private final BudgetExpenseMaterializer materializer;
    private final CompanyEntitlementService entitlements;
    private final FinanceBusinessTimeZoneResolver timeZones;
    private final boolean enabled;

    BudgetExpenseSynchronizationService(BudgetExpenseOccurrenceRepository occurrences, BudgetExpenseMaterializer materializer,
            CompanyEntitlementService entitlements, FinanceBusinessTimeZoneResolver timeZones,
            @Value("${app.finance.budget-obligations.enabled:true}") boolean enabled) {
        this.occurrences = occurrences; this.materializer = materializer; this.entitlements = entitlements; this.enabled = enabled;
        this.timeZones = timeZones;
    }

    public BudgetExpenseSyncResult synchronize(FinanceContext context) {
        if (!enabled) return new BudgetExpenseSyncResult(false, 0, List.of());
        var entitlement = entitlements.resolve(context.companyId(), "expenses");
        if (entitlement.policy_mode() == EntitlementPolicyMode.ENFORCE && !entitlement.allowed())
            throw FinanceApiException.forbidden("Expenses capability is unavailable.");
        int generated = 0;
        var periodEnd = YearMonth.from(LocalDate.now(timeZones.resolve(context.companyId()))).atEndOfMonth();
        var failures = new ArrayList<BudgetExpenseSyncResult.Review>();
        long after = 0;
        List<Long> batch;
        do {
            batch = occurrences.candidates(context, after, 100, periodEnd);
            for (var lineId : batch) {
                try {
                    if (materializer.materialize(context, lineId)) generated++;
                } catch (FinanceApiException failure) {
                    try {
                        materializer.recordInvalidReference(context, lineId);
                    } catch (RuntimeException reviewFailure) {
                        failures.add(new BudgetExpenseSyncResult.Review(lineId, "BUD-" + lineId, "RETRY_REQUIRED"));
                        LOG.error("budget_obligation_review_failed companyId={} budgetLineId={} failureType={}",
                            context.companyId(), lineId, reviewFailure.getClass().getSimpleName());
                    }
                    LOG.warn("budget_obligation_requires_review companyId={} budgetLineId={}", context.companyId(), lineId);
                } catch (RuntimeException failure) {
                    failures.add(new BudgetExpenseSyncResult.Review(lineId, "BUD-" + lineId, "RETRY_REQUIRED"));
                    LOG.error("budget_obligation_failed companyId={} budgetLineId={} failureType={}",
                        context.companyId(), lineId, failure.getClass().getSimpleName());
                }
                // Every failed transaction is isolated; infrastructure failures remain eligible for retry.
                after = lineId;
            }
        } while (batch.size() == 100);
        failures.addAll(occurrences.reviews(context));
        return new BudgetExpenseSyncResult(true, generated, List.copyOf(failures));
    }

    public List<BudgetExpenseSyncResult.Review> reviews(FinanceContext context) { return occurrences.reviews(context); }
}
