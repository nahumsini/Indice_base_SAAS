package com.indice.erp.finance.reporting;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

final class AccountingPostingModels {

    record PostingLine(
        String systemAccountCode,
        Long explicitAccountId,
        Long unitId,
        Long businessId,
        String description,
        BigDecimal debit,
        BigDecimal credit,
        String documentReference
    ) {
    }

    record PostingCandidate(
        String sourceModule,
        String sourceType,
        String sourceId,
        String sourceEventKey,
        String sourceFingerprint,
        String journalType,
        LocalDate entryDate,
        String description,
        String currency,
        List<PostingLine> lines
    ) {
    }

    record DiscoveryIssue(
        String code,
        String severity,
        String sourceModule,
        String sourceType,
        String sourceId,
        String message,
        String action
    ) {
    }

    record Discovery(
        List<PostingCandidate> candidates,
        List<DiscoveryIssue> issues,
        Map<String, Integer> eligibleByModule
    ) {
    }

    private AccountingPostingModels() {
    }
}
