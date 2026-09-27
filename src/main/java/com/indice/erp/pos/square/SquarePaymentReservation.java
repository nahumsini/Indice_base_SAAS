package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.terminal.TerminalBindingRepository;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentReservation {
    private final SquarePaymentDependencies dependencies;
    private final TerminalPaymentGuard guard;
    private final TerminalBindingRepository bindings;
    SquarePaymentReservation(SquarePaymentDependencies dependencies, TerminalPaymentGuard guard, TerminalBindingRepository bindings) {
        this.dependencies = dependencies;
        this.guard = guard;
        this.bindings = bindings;
    }
    SquareRecords.PaymentIntent reserve(PosContext context, SquareTerminalDtos.CreatePaymentRequest request) {
        return guard.withRegisterLock(context, request.cashRegisterId(), () -> reserveLocked(context, request));
    }
    private SquareRecords.PaymentIntent reserveLocked(PosContext context, SquareTerminalDtos.CreatePaymentRequest request) {
        var d = dependencies;
        var draft = d.preparer().prepare(context, request);
        SquareCheckoutIdentityPolicy.requireMinorUnits(draft.amount());
        if (!"SQUARE".equals(bindings.find(context, request.cashRegisterId()).providerCode()))
            throw PosApiException.conflict("No unambiguous Square terminal binding exists for this register.");
        var terminal = d.terminals().findAssigned(context, request.cashRegisterId())
            .orElseThrow(() -> PosApiException.badRequest("No Square terminal is assigned to this register."));
        d.merchant().require(context, terminal.squareLocationId(), draft.currencyCode());
        if (!"PAIRED".equalsIgnoreCase(terminal.status()) || terminal.deviceId() == null || terminal.deviceId().isBlank())
            throw PosApiException.badRequest("Assigned Square terminal is not paired.");
        var existing = d.intents().listRecoverable(context, request.cashRegisterId(), null, 10);
        if (!existing.isEmpty()) {
            var intent = existing.getFirst();
            if (!intent.checkoutPayloadSha256().equals(draft.payloadHash()) || !java.util.Objects.equals(intent.shiftId(), draft.shift().id()))
                throw PosApiException.conflict("Recover or cancel the pending Square Terminal payment before charging another ticket.");
            guard.assertNoPendingExcept(context, request.cashRegisterId(), "SQUARE", intent.id());
            return intent;
        }
        guard.assertNoPending(context, request.cashRegisterId());
        var intent = d.intents().createOrFind(context, request.cashRegisterId(), draft.shift().id(), terminal,
            draft.idempotencyKey(), draft.amount(), draft.currencyCode(), draft.payloadHash(), draft.checkoutJson(),
            d.clock().instant().plusSeconds(d.properties().getPaymentTimeoutSeconds()));
        if (!intent.checkoutPayloadSha256().equals(draft.payloadHash()))
            throw PosApiException.conflict("Square idempotency key was reused for a different sale.");
        return intent;
    }
}
