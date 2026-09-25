package com.indice.erp.finance.terminalrefunds;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TerminalRefundAdjustmentListing {
    private static final Set<String> STATES = Set.of("ATTENTION", "PENDING_REVIEW", "APPROVED", "POSTED",
        "RECONCILIATION_REQUIRED", "FAILED");
    private final TerminalRefundAdjustmentAuthorization authorization;
    private final TerminalRefundAdjustmentPageQuery query;
    public TerminalRefundAdjustmentListing(TerminalRefundAdjustmentAuthorization authorization,
            TerminalRefundAdjustmentPageQuery query) {
        this.authorization = authorization; this.query = query;
    }
    @Transactional(readOnly = true)
    public TerminalRefundAdjustmentPageResponse page(FinanceContext context, String state,
            Long beforeId, Integer requestedLimit) {
        authorization.requireOwner(context);
        var normalized = state == null || state.isBlank() || "ALL".equalsIgnoreCase(state) ? null
            : state.trim().toUpperCase(Locale.ROOT);
        if (normalized != null && !STATES.contains(normalized))
            throw FinanceApiException.badRequest("Refund adjustment state is invalid.");
        if (beforeId != null && beforeId < 1) throw FinanceApiException.badRequest("Refund adjustment cursor is invalid.");
        var limit = requestedLimit == null ? 50 : requestedLimit;
        if (limit < 1 || limit > 100) throw FinanceApiException.badRequest("Refund adjustment page size must be 1 to 100.");
        var rows = query.page(context.companyId(), normalized, beforeId, limit);
        var page = rows.size() > limit ? rows.subList(0, limit) : rows;
        var cursor = rows.size() > limit ? page.get(page.size() - 1).id() : null;
        return new TerminalRefundAdjustmentPageResponse(page.stream()
            .map(TerminalRefundAdjustmentResponse::from).toList(), cursor,
            query.count(context.companyId(), normalized));
    }
}
