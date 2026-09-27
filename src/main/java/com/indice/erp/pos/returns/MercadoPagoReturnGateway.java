package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.mercadopago.MpPaymentService;
import com.indice.erp.pos.mercadopago.MpRefundRequest;
import com.indice.erp.pos.mercadopago.MpRefundReviewRequest;
import com.indice.erp.pos.mercadopago.MpRefundReviewService;
import com.indice.erp.pos.mercadopago.MpRefundService;
import org.springframework.stereotype.Component;

@Component
public record MercadoPagoReturnGateway(MpRefundService refunds,
        MpPaymentService payments, MpRefundReviewService reviews) implements PosReturnProviderGateway {
    public String providerCode() { return "MERCADO_PAGO"; }
    public void refund(PosContext context, long intentId, PosReturnRefundRequest request) {
        refunds.refund(context, intentId, new MpRefundRequest(request.idempotencyKey(),
            request.amount(), request.reason()));
    }

    public void refresh(PosContext context, long intentId) {
        payments.recover(context, intentId);
    }

    public void recheck(PosContext context, long intentId, long refundId, PosReturnReviewRequest request) {
        reviews.recheck(context, intentId, refundId,
            new MpRefundReviewRequest(request.reason(), request.expectedVersion()));
    }
}
