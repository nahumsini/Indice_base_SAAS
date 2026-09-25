package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Component;

@Component
class SquarePaymentSubmission {
    private final SquarePaymentDependencies d; private final SquarePaymentResponses responses;
    private final SquareSubmissionClaim claims; private final SquareDispatchAuthorization dispatch;
    private final SquareLiveActivationPolicy activation; private final SquarePaymentSubmissionFailure failures;
    SquarePaymentSubmission(SquarePaymentDependencies d,SquarePaymentResponses responses,SquareSubmissionClaim claims,
            SquareDispatchAuthorization dispatch,SquareLiveActivationPolicy activation,SquarePaymentSubmissionFailure failures) {
        this.d=d; this.responses=responses; this.claims=claims; this.dispatch=dispatch;
        this.activation=activation; this.failures=failures;
    }
    SquareTerminalDtos.PaymentIntentResponse submit(PosContext context,SquareRecords.PaymentIntent intent) {
        var started=new boolean[] {false};
        try {
            dispatch.require(context,intent); activation.require(context.companyId());
            var claim=claims.acquire(context,intent);
            if (claim.response()!=null) return claim.response();
            var checkout=d.tokens().withToken(context,token -> send(claim.requestJson(),token,started));
            d.intents().markSquareCreated(intent.id(),checkout.id(),checkout.requestJson(),checkout.rawJson());
            var status=d.evidence().verify(context,intent,checkout);
            d.intents().markGatewayStatus(intent.id(),status);
            d.audit().recordIntent(intent,"PAYMENT_REQUEST_SENT","WAITING","Square checkout created.");
            return responses.finish(context,intent.id(),status.status()==SquareTerminalPaymentStatus.APPROVED);
        } catch (RuntimeException failure) {
            boolean uncertain=started[0] || intent.squareRequestJson()!=null || failure instanceof SquarePriorSubmissionFailure;
            failures.record(intent,uncertain,failure);
            if (!uncertain) throw failure;
            return responses.finish(context,intent.id(),false);
        }
    }
    private SquareTerminalGateway.Checkout send(String request,String token,boolean[] started) {
        started[0]=true;
        return d.gateway().createCheckout(token,request);
    }
}
