package com.indice.erp.pos.square;
import com.indice.erp.pos.PosContext;
import java.time.Instant;
import org.springframework.stereotype.Component;

@Component
class SquareSubmissionClaim {
    private static final long LEASE_SECONDS=90;
    private final SquarePaymentDependencies d; private final SquarePaymentRecovery recovery;
    private final SquarePaymentResponses responses; private final SquareSubmissionBody bodies;
    SquareSubmissionClaim(SquarePaymentDependencies d,SquarePaymentRecovery recovery,SquarePaymentResponses responses,
            SquareSubmissionBody bodies) { this.d=d; this.recovery=recovery; this.responses=responses; this.bodies=bodies; }
    Claim acquire(PosContext context,SquareRecords.PaymentIntent intent) {
        try {
            var request=bodies.create(intent);
            if (d.intents().markSubmissionStarted(intent.id(),request)) return new Claim(null,bodies.persisted(context,intent.id()));
            return recover(context,intent);
        }
        catch (RuntimeException failure) { throw new SquarePriorSubmissionFailure(failure); }
    }
    private Claim recover(PosContext context,SquareRecords.PaymentIntent intent) {
        var recovered=recovery.recover(context,intent.id());
        if (!retryable(recovered)) return new Claim(recovered,null);
        var now=d.clock().instant();
        if (expired(intent,now)) return new Claim(manual(context,intent),null);
        if (intent.squareRequestJson()==null) return new Claim(recovered,null);
        return d.intents().markSubmissionRetry(intent.id(),now.minusSeconds(LEASE_SECONDS))
            ?new Claim(null,intent.squareRequestJson()):new Claim(recovered,null);
    }
    private boolean retryable(SquareTerminalDtos.PaymentIntentResponse value) {
        return "waiting".equals(value.status()) && value.squareCheckoutId()==null && value.posTicketId()==null;
    }
    private boolean expired(SquareRecords.PaymentIntent intent,Instant now) {
        var window=Math.clamp(d.properties().getPaymentTimeoutSeconds(),LEASE_SECONDS,3_600);
        return intent.createdAt()==null || intent.createdAt().isBefore(now.minusSeconds(window));
    }
    private SquareTerminalDtos.PaymentIntentResponse manual(PosContext context,SquareRecords.PaymentIntent intent) {
        var message="Square checkout requires manual reconciliation; automatic replay window expired.";
        d.intents().markGatewayStatus(intent.id(),new SquareRecords.GatewayStatus(null,null,
            SquareTerminalPaymentStatus.UNCERTAIN,null,"SQUARE_RECONCILIATION_REQUIRED",message));
        d.audit().recordIntent(intent,"PAYMENT_RECONCILIATION_REQUIRED","UNCERTAIN",message);
        return responses.status(context,intent.id());
    }
    record Claim(SquareTerminalDtos.PaymentIntentResponse response,String requestJson) {}
}
