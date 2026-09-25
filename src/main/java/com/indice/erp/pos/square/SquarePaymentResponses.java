package com.indice.erp.pos.square;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentResponses {
    private final SquarePaymentDependencies dependencies;
    private final SquarePaymentAccess access;
    SquarePaymentResponses(SquarePaymentDependencies dependencies, SquarePaymentAccess access) {
        this.dependencies = dependencies;
        this.access = access;
    }
    SquareRecords.PaymentIntent require(PosContext context, long id) {
        var intent = dependencies.intents().findById(context, id)
            .orElseThrow(() -> PosApiException.notFound("Square payment intent was not found."));
        access.require(context, intent);
        return intent;
    }
    SquareTerminalDtos.PaymentIntentResponse status(PosContext context, long id) {
        return dependencies.finalizer().response(require(context, id), null);
    }
    SquareTerminalDtos.PaymentIntentListResponse recoverable(PosContext context, Long register, Long shift, int limit) {
        var items = dependencies.intents().listRecoverable(context, register, shift, limit).stream()
            .filter(intent -> access.allowed(context, intent)).map(intent -> dependencies.finalizer().response(intent, null)).toList();
        return new SquareTerminalDtos.PaymentIntentListResponse(items);
    }
    SquareTerminalDtos.PaymentIntentResponse finish(PosContext context, long id, boolean freshlyApproved) {
        var intent = require(context, id);
        return freshlyApproved ? finish(intent) : dependencies.finalizer().response(intent, null);
    }
    SquareTerminalDtos.PaymentIntentResponse finish(SquareRecords.PaymentIntent intent) {
        if (intent.status() != SquareTerminalPaymentStatus.APPROVED || intent.posTicketId() != null)
            return dependencies.finalizer().response(intent, null);
        try {
            return dependencies.finalizer().finalizeIfApproved(intent.companyId(), intent.id());
        } catch (RuntimeException failed) {
            dependencies.intents().markFinalizationFailed(intent.id(), failed.getMessage());
            var internal = new PosContext(intent.createdByUserId(), intent.companyId(), "Recovery", "system", true,
                com.indice.erp.pos.PosScope.corporateOffice());
            return dependencies.finalizer().response(dependencies.intents().findById(internal, intent.id()).orElse(intent), null);
        }
    }
}
