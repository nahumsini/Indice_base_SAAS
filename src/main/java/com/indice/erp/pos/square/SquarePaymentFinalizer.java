package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.checkout.VerifiedTerminalCheckout;
import com.indice.erp.pos.checkout.PersistedCheckoutReader;
import com.indice.erp.pos.checkout.dto.PosCheckoutResponse;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SquarePaymentFinalizer {
    private final SquarePaymentIntentRepository intents;
    private final VerifiedTerminalCheckout checkout;
    private final SquareFinalizationSnapshot snapshots;
    private final PersistedCheckoutReader receipts;
    private final TerminalPaymentGuard guard;
    public SquarePaymentFinalizer(SquarePaymentIntentRepository intents, VerifiedTerminalCheckout checkout,
            SquareFinalizationSnapshot snapshots, PersistedCheckoutReader receipts, TerminalPaymentGuard guard) {
        this.intents = intents;
        this.checkout = checkout;
        this.snapshots = snapshots;
        this.receipts = receipts;
        this.guard = guard;
    }
    @Transactional
    public SquareTerminalDtos.PaymentIntentResponse finalizeIfApproved(long companyId, long id) {
        var internal = new PosContext(null, companyId, "Finalization", "system", true, PosScope.corporateOffice());
        var initial = intents.findById(internal, id).orElseThrow(() -> PosApiException.notFound("Square payment intent was not found."));
        var context = snapshots.context(initial);
        guard.lockRegister(context, initial.cashRegisterId());
        var intent = intents.lockById(companyId, id).orElseThrow();
        if (intent.posTicketId() != null || intent.status() != SquareTerminalPaymentStatus.APPROVED
                || intent.squarePaymentId() == null || intent.squarePaymentId().isBlank()) return response(intent, null);
        intents.incrementFinalizeAttempt(id);
        var sale = checkout.checkout(context, snapshots.request(intent), "SQUARE", id, intent.shiftId());
        if (!intents.markFinalized(id, sale.ticket().id())) throw PosApiException.conflict("Square sale finalization changed concurrently.");
        return response(intent, sale);
    }
    SquareTerminalDtos.PaymentIntentResponse response(SquareRecords.PaymentIntent intent, PosCheckoutResponse sale) {
        if (sale == null && intent.posTicketId() != null) sale = receipts.readCommitted(snapshots.context(intent), intent.posTicketId());
        return new SquareTerminalDtos.PaymentIntentResponse(intent.id(), intent.status().wireName(), intent.amount(), intent.currencyCode(),
            intent.squareCheckoutId(), intent.squarePaymentId(), intent.failureMessage(), sale == null ? intent.posTicketId() : sale.ticket().id(), sale);
    }
}
