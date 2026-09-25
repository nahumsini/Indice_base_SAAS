package com.indice.erp.pos.square;

import com.indice.erp.pos.settlement.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SquareRefundConfirmation {
    private final SquareRefundQueries refunds;
    private final SquarePaymentIntentRepository intents;
    private final TerminalRefundStore reversals;
    private final SquareRefundConfirmationStore confirmations;
    private final SquareRefundIntentStatus statuses;
    private final SquareRefundAudit audit;
    public SquareRefundConfirmation(SquareRefundQueries refunds, SquarePaymentIntentRepository intents,
            TerminalRefundStore reversals, SquareRefundConfirmationStore confirmations,
            SquareRefundIntentStatus statuses, SquareRefundAudit audit) {
        this.refunds=refunds; this.intents=intents; this.reversals=reversals;
        this.confirmations=confirmations; this.statuses=statuses; this.audit=audit;
    }
    @Transactional
    public void confirm(SquareRefundRecord observed, String lease, SquareRefundEvidence evidence,
            SquareRefundActor actor, String reason) {
        var intent = intents.lockById(observed.companyId(), observed.intentId()).orElseThrow();
        var refund = refunds.find(observed.companyId(), observed.id(), true).orElseThrow();
        if (refund.intentId()!=intent.id() || refund.version()!=observed.version()+1
                || !java.util.Objects.equals(lease, refund.workLeaseId()) || refund.status().equals("CONFIRMED")) return;
        if (!"COMPLETED".equals(evidence.status())
                || !java.util.Objects.equals(refund.providerRefundId(), evidence.id())
                || !java.util.Objects.equals(intent.squarePaymentId(), evidence.paymentId())
                || !intent.currencyCode().equals(evidence.currency())
                || refund.amount().compareTo(evidence.amount()) != 0) throw new SquareRefundEvidenceException(
                    "Square refund payment ownership changed.");
        var before = reversals.confirmed(intent.companyId(), "SQUARE", intent.id());
        if (before.compareTo(refund.baselineAmount()) != 0)
            throw new SquareRefundEvidenceException("Square refund baseline changed.");
        var cumulative = before.add(refund.amount());
        reversals.record(new TerminalRefundRecord(intent.companyId(), "SQUARE", intent.id(),
            intent.posTicketId(), intent.squarePaymentId(), intent.shiftId(), refund.amount(),
            cumulative, intent.currencyCode(), evidence.id()));
        if (!confirmations.confirm(refund, lease, evidence.safeJson()))
            throw new IllegalStateException("Square refund confirmation changed concurrently.");
        statuses.apply(intent, cumulative);
        var confirmed = refunds.find(refund.companyId(), refund.id(), false).orElseThrow();
        audit.record(confirmed, actor, "REFUND_CONFIRMED", "CONFIRMED", reason, confirmed.version());
    }
}
