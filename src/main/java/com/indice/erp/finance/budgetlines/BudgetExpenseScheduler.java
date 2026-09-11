package com.indice.erp.finance.budgetlines;

import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.util.concurrent.atomic.AtomicBoolean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class BudgetExpenseScheduler {
    private static final Logger LOG = LoggerFactory.getLogger(BudgetExpenseScheduler.class);
    private final BudgetExpenseOccurrenceRepository occurrences;
    private final BudgetExpenseSynchronizationService synchronization;
    private final AtomicBoolean running = new AtomicBoolean();
    private long cursor;

    BudgetExpenseScheduler(BudgetExpenseOccurrenceRepository occurrences, BudgetExpenseSynchronizationService synchronization) {
        this.occurrences = occurrences; this.synchronization = synchronization;
    }

    @Scheduled(initialDelayString = "${app.finance.budget-obligations.initial-delay-ms:60000}",
        fixedDelayString = "${app.finance.budget-obligations.delay-ms:60000}")
    public void synchronizeDueBudgets() {
        if (!running.compareAndSet(false, true)) return;
        try {
            var companies = occurrences.companiesAfter(cursor, 100);
            for (var companyId : companies) {
                try {
                    synchronization.synchronize(new FinanceContext(null, companyId, "Budget scheduler", "SYSTEM", true,
                        FinanceScope.corporateOffice()));
                } catch (RuntimeException failure) {
                    LOG.error("budget_obligation_sync_failed companyId={} failureType={}", companyId, failure.getClass().getSimpleName());
                }
                cursor = companyId;
            }
            if (companies.size() < 100) cursor = 0;
        } finally { running.set(false); }
    }
}
