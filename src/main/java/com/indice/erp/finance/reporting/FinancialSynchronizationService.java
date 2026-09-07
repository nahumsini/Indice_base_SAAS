package com.indice.erp.finance.reporting;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.reporting.AccountingPostingModels.DiscoveryIssue;
import com.indice.erp.finance.reporting.FinancialReportingContracts.QualityFinding;
import com.indice.erp.finance.reporting.FinancialReportingContracts.SynchronizeResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class FinancialSynchronizationService {

    private final FinancialLedgerRepository ledgerRepository;
    private final AccountingSourceDiscoveryService discoveryService;
    private final ObjectMapper objectMapper;
    private final AccountingSourceReversalService reversals;

    FinancialSynchronizationService(
        FinancialLedgerRepository ledgerRepository,
        AccountingSourceDiscoveryService discoveryService,
        ObjectMapper objectMapper,
        AccountingSourceReversalService reversals
    ) {
        this.ledgerRepository = ledgerRepository;
        this.discoveryService = discoveryService;
        this.objectMapper = objectMapper;
        this.reversals = reversals;
    }

    @Transactional
    SynchronizeResponse synchronize(long companyId, long userId, LocalDate from, LocalDate to) {
        validateRange(from, to);
        ledgerRepository.ensureSettings(companyId, userId);
        ledgerRepository.ensureStandardAccounts(companyId, userId);
        var settings = ledgerRepository.findSettings(companyId)
            .orElseThrow(() -> new IllegalStateException("Accounting settings could not be provisioned."));
        long runId = ledgerRepository.startSyncRun(companyId, userId, from, to);

        var discovery = discoveryService.discover(companyId, from, to, settings.functionalCurrency());
        int posted = 0;
        var issues = new ArrayList<>(discovery.issues());
        int alreadyPosted = 0;

        for (var candidate : discovery.candidates()) {
            var existing = ledgerRepository.findEntry(companyId, candidate.sourceEventKey());
            if (existing.isPresent()) {
                alreadyPosted++;
                if (!existing.get().fingerprint().equals(candidate.sourceFingerprint())) {
                    issues.add(new DiscoveryIssue(
                        "SOURCE_CHANGED_AFTER_POSTING",
                        "BLOCKING",
                        candidate.sourceModule(),
                        candidate.sourceType(),
                        candidate.sourceId(),
                        "La operación cambió después de haber sido contabilizada.",
                        "Revierte el asiento publicado y sincroniza la versión corregida."
                    ));
                }
                continue;
            }
            var result = ledgerRepository.post(companyId, userId, settings, candidate);
            if (result == FinancialLedgerRepository.PostResult.POSTED) {
                posted++;
            } else {
                alreadyPosted++;
            }
        }

        posted += reversals.postSalesReversals(companyId, userId, settings, from, to);
        issues.addAll(reversals.pending(companyId, from, to, null, null));
        issues.addAll(ledgerRepository.missingPostedSources(companyId, from, to, discovery));
        int blocked = (int) issues.stream().filter(item -> "BLOCKING".equals(item.severity())).count();
        String status = blocked > 0 ? "COMPLETED_WITH_ISSUES" : "COMPLETED";
        int discovered = discovery.candidates().size() + blocked;
        ledgerRepository.completeSyncRun(companyId, runId, status, discovered, posted, alreadyPosted,
            blocked, toJson(issues));

        return new SynchronizeResponse(runId, status, discovered, posted, alreadyPosted, blocked,
            issues.stream().map(FinancialSynchronizationService::toFinding).toList(), Instant.now());
    }

    static void validateRange(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            throw new IllegalArgumentException("from and to are required.");
        }
        if (from.isAfter(to)) {
            throw new IllegalArgumentException("from must be on or before to.");
        }
        if (ChronoUnit.DAYS.between(from, to) > 730) {
            throw new IllegalArgumentException("Accounting synchronization is limited to 731 days per request.");
        }
    }

    static QualityFinding toFinding(DiscoveryIssue issue) {
        return new QualityFinding(issue.code(), issue.severity(), findingTitle(issue.code()),
            issue.message(), issue.action(), issue.sourceModule(), 1);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Accounting sync issues could not be serialized.", ex);
        }
    }

    private static String findingTitle(String code) {
        return switch (code) {
            case "MISSING_EXCHANGE_RATE" -> "Conversión pendiente";
            case "MISSING_PRODUCT_COST" -> "Costo de venta incompleto";
            case "SOURCE_CHANGED_AFTER_POSTING" -> "Operación modificada";
            case "UNBALANCED_PAYROLL_SOURCE" -> "Nómina sin balance";
            case "EXPENSE_ACCOUNT_FALLBACK" -> "Clasificación contable general";
            default -> "Dato contable por revisar";
        };
    }
}
