package com.indice.erp.pos.square;

import com.indice.erp.pos.PosContext;
import org.springframework.stereotype.Component;

@Component
class SquareSubmissionBody {
    private final SquarePaymentDependencies d;
    private final SquareCheckoutPayloads payloads;
    SquareSubmissionBody(SquarePaymentDependencies d,SquareCheckoutPayloads payloads) {
        this.d=d; this.payloads=payloads;
    }
    String create(SquareRecords.PaymentIntent intent) {
        if (intent.squareRequestJson()!=null) return intent.squareRequestJson();
        var command=new SquareTerminalGateway.CheckoutCommand(intent.idempotencyKey(),"INDICE-POS-"+intent.id(),
            intent.squareDeviceId(),intent.amount(),intent.currencyCode(),"Indice POS sale "+intent.id());
        return payloads.create(command).json();
    }
    String persisted(PosContext context,long id) {
        var body=d.intents().findById(context,id).map(SquareRecords.PaymentIntent::squareRequestJson).orElse(null);
        if (body==null) throw new IllegalStateException("Persisted Square request body was not found.");
        return body;
    }
}
