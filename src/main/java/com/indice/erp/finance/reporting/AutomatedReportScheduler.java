package com.indice.erp.finance.reporting;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class AutomatedReportScheduler {
    private final AutomatedReportService service;
    AutomatedReportScheduler(AutomatedReportService service) { this.service = service; }
    @Scheduled(initialDelay = 60000, fixedDelay = 60000)
    void runDueReports() {
        for (var due : service.dueRules()) {
            try { service.runScheduled(due); }
            catch (RuntimeException failure) { service.pauseFailure(due); }
        }
    }
}
