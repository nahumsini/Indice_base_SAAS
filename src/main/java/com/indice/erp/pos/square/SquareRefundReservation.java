package com.indice.erp.pos.square;

import com.indice.erp.pos.*;
import com.indice.erp.pos.settlement.TerminalRefundStore;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
class SquareRefundReservation {
    private final SquarePaymentIntentRepository intents;
    private final SquarePaymentAccess access;
    private final SquareRefundQueries queries;
    private final SquareRefundOutstanding outstanding;
    private final SquareRefundAmounts amounts;
    private final SquareRefundPayloads payloads;
    private final SquareRefundReplay replay;
    private final SquareRefundEligibility eligibility;
    private final SquareRefundReservationStore store;
    private final TerminalRefundStore reversals;
    private final SquareRefundConnectionLock merchantLocks;
    private final SquareRefundAudit audit;
    @Transactional
    public SquareRefundRecord reserve(PosContext context, long intentId, SquareRefundRequest request) {
        var merchant=merchantLocks.lock(context);
        var intent = intents.lockById(context.companyId(), intentId)
            .orElseThrow(() -> PosApiException.notFound("Square payment intent was not found."));
        access.require(context, intent);
        var existing = queries.byKey(context.companyId(), request.idempotencyKey()).orElse(null);
        if (existing != null) return replay.require(existing, intent,
            payloads.create(intent, request, amounts.normalize(request.amount() == null ? existing.amount() : request.amount())));
        eligibility.require(intent); outstanding.requireNone(intent);
        var baseline = reversals.confirmed(intent.companyId(), "SQUARE", intent.id());
        var amount = amounts.requested(request.amount(), intent.amount().subtract(baseline));
        var payload = payloads.create(intent, request, amount);
        var saved = replay.require(store.save(context, intent, request, amount, baseline, payload,
            merchant.environment(), merchant.merchantId()), intent, payload);
        audit.record(saved, SquareRefundActor.user(context.userId()), "REFUND_RESERVED",
            saved.status(), saved.reason(), saved.version());
        return saved;
    }
}
