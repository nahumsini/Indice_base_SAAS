package com.indice.erp.pos.mercadopago;
import com.indice.erp.pos.*;
import org.springframework.jdbc.core.JdbcTemplate;
import lombok.RequiredArgsConstructor;
@RequiredArgsConstructor
class MpOriginalReturnAdmission {
    private final JdbcTemplate jdbc;
    void require(PosContext ctx,MpIntent intent,MpRefundRequest request,long returnId){
        if(!ctx.canManageOtherUsers())throw PosApiException.forbidden("Original card returns require administrative access.");
        if(intent.posTicketId()==null||request.amount()==null||request.amount().compareTo(intent.amount())!=0)throw PosApiException.conflict("The original full card amount is required.");
        int count=jdbc.queryForObject("SELECT COUNT(*) FROM pos_returns r JOIN pos_return_payments p ON p.company_id=r.company_id AND p.return_id=r.id WHERE r.company_id=? AND r.id=? AND r.ticket_id=? AND r.status='PROCESSING' AND p.payment_method='CARD' AND p.provider_code='MERCADO_PAGO' AND p.provider_intent_id=? AND p.provider_request_key=? AND p.amount=? AND p.currency_code='MXN'",Integer.class,ctx.companyId(),returnId,intent.posTicketId(),intent.id(),request.idempotencyKey(),request.amount());
        if(count!=1)throw PosApiException.conflict("The durable original-card return does not match this refund.");
    }
}
