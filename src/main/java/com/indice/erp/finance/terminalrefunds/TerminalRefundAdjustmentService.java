package com.indice.erp.finance.terminalrefunds;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class TerminalRefundAdjustmentService {
    private final TerminalRefundAdjustmentAuthorization authorization; private final TerminalRefundAdjustmentQuery query;
    private final TerminalRefundAdjustmentTransitions transitions; private final TerminalRefundAdjustmentEvents events;
    private final TerminalRefundAdjustmentPosting posting; private final TerminalRefundAdjustmentResolution resolution;
    public TerminalRefundAdjustmentService(TerminalRefundAdjustmentAuthorization authorization, TerminalRefundAdjustmentQuery query,
            TerminalRefundAdjustmentTransitions transitions, TerminalRefundAdjustmentEvents events,
            TerminalRefundAdjustmentPosting posting, TerminalRefundAdjustmentResolution resolution) {
        this.authorization = authorization; this.query = query; this.transitions = transitions;
        this.events = events; this.posting = posting; this.resolution = resolution;
    }
    private static final Set<String> STATES = Set.of("PENDING_REVIEW", "APPROVED", "POSTED", "RECONCILIATION_REQUIRED", "FAILED");
    @Transactional(readOnly = true) public List<TerminalRefundAdjustment> list(FinanceContext context, String state) {
        authorization.requireOwner(context);
        var normalized = state == null || state.isBlank() ? null : state.trim().toUpperCase(Locale.ROOT);
        if (normalized != null && !STATES.contains(normalized))
            throw FinanceApiException.badRequest("Refund adjustment state is invalid.");
        return query.list(context.companyId(), normalized);
    }
    @Transactional public TerminalRefundAdjustment approve(FinanceContext context, long id, String reason, long version) {
        authorization.requireOwner(context);
        var value = query.lock(context.companyId(), id);
        var note = reason == null ? "" : reason.trim();
        if (note.length() < 8 || note.length() > 500)
            throw FinanceApiException.badRequest("An approval reason of 8 to 500 characters is required.");
        if (("APPROVED".equals(value.state()) || "FAILED".equals(value.state()) || "POSTED".equals(value.state()))
                && note.equals(value.approvalReason())) return value;
        if (value.version() != version) throw FinanceApiException.conflict("Refund adjustment changed. Reload it.");
        if (!transitions.approve(value, context.userId(), note))
            throw FinanceApiException.conflict("Only a pending refund adjustment can be approved.");
        events.append(value, "APPROVED:" + (version + 1), "OWNER_APPROVED", value.state(),
            "APPROVED", context.userId(), note);
        return query.get(value.companyId(), value.id());
    }
    public TerminalRefundAdjustment post(FinanceContext context, long id, long version) {
        authorization.requireOwner(context); return posting.post(context, id, version);
    }
    public TerminalRefundAdjustment resolve(FinanceContext context, long id, String reason, long version) {
        authorization.requireOwner(context); return resolution.resolve(context, id, reason, version);
    }
}
