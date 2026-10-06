package com.indice.erp.pos.returns;
import com.indice.erp.pos.*;
import com.indice.erp.pos.mercadopago.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import static com.indice.erp.pos.returns.PosReturnDtos.*;
@Service
@RequiredArgsConstructor
public class PosPointReturnService {
    private final PosReturnService owner;private final PosReturnRepository returns;private final MpOriginalReturnPort refunds;private final MpIntentReader intents;private final JdbcTemplate jdbc;private final MpRefundRequestStore requests;
    public Response confirm(PosContext ctx,long id){
        if(TransactionSynchronizationManager.isActualTransactionActive())throw new IllegalStateException("Provider refund work must run outside a database transaction.");
        var command=owner.beginPoint(ctx,id);if(command==null)return returns.get(ctx,id);
        var request=new MpRefundRequest(command.requestKey(),command.amount(),command.reason());
        var saved=requests.byKey(ctx.companyId(),command.requestKey()).orElse(null);var result=saved!=null&&Set.of("CONFIRMED","REJECTED","NOT_SUBMITTED").contains(saved.status())?saved:refunds.refund(ctx,command.intentId(),request,id);
        if(java.util.Set.of("FAILED","REJECTED","NOT_SUBMITTED").contains(result.status()))return owner.rejectPoint(ctx,id,result.id(),result.status());
        if(!"CONFIRMED".equals(result.status()))return returns.get(ctx,id);
        var intent=intents.find(ctx,command.intentId()).orElseThrow();
        if(!"REFUNDED".equals(intent.status())||result.baselineAmount().signum()!=0||result.amount().compareTo(command.amount())!=0)throw PosApiException.conflict("Full original-card refund evidence requires reconciliation.");
        var evidence=jdbc.queryForList("SELECT provider_refund_id,amount FROM pos_terminal_payment_reversals WHERE company_id=? AND provider_code='MERCADO_PAGO' AND intent_id=? AND pos_ticket_id=? ORDER BY id",ctx.companyId(),command.intentId(),intent.posTicketId());
        var total=evidence.stream().map(r->(java.math.BigDecimal)r.get("amount")).reduce(java.math.BigDecimal.ZERO,java.math.BigDecimal::add);
        if(evidence.isEmpty()||total.compareTo(command.amount())!=0)throw PosApiException.conflict("Immutable provider refund evidence is incomplete.");
        owner.acceptPoint(ctx,id,result.id(),String.valueOf(evidence.getFirst().get("provider_refund_id")));
        return owner.completeConfirmedSquare(ctx,id);
    }
}
