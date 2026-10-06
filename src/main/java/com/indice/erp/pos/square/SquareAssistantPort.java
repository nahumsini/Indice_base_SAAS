package com.indice.erp.pos.square;
import com.indice.erp.pos.*;
import com.indice.erp.pos.assistant.PosTerminalContracts.*;
import com.indice.erp.pos.settlement.TerminalRefundStore;
import java.math.BigDecimal;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
@Service
@RequiredArgsConstructor
public class SquareAssistantPort {
    private final SquarePaymentDependencies d;private final SquarePaymentAccess access;private final SquareLiveActivationPolicy activation;
    private final SquareRefundQueries refunds;private final SquareRefundEligibility eligibility;private final SquareRefundOutstanding outstanding;
    private final SquareRefundAmounts amounts;private final TerminalRefundStore ledger;private final SquareRefundPolicy policy;
    public com.indice.erp.pos.assistant.PosTerminalSnapshots.Charge inspectCharge(PosContext ctx,SquareTerminalDtos.CreatePaymentRequest request){
        d.secrets().requireEnabled();activation.require(ctx.companyId());var draft=d.preparer().preview(ctx,request);
        var terminal=d.terminals().findAssigned(ctx,request.cashRegisterId()).orElseThrow(()->PosApiException.conflict("Assigned Square terminal required."));
        if(!"PAIRED".equalsIgnoreCase(terminal.status())||terminal.deviceId()==null||terminal.deviceId().isBlank())throw PosApiException.conflict("Paired Square terminal required.");
        d.merchant().require(ctx,terminal.squareLocationId(),draft.currencyCode());SquareCheckoutIdentityPolicy.requireMinorUnits(draft.amount());
        return new com.indice.erp.pos.assistant.PosTerminalSnapshots.Charge(draft.amount(),draft.currencyCode(),com.indice.erp.pos.assistant.PosTerminalSnapshots.hash(List.of(terminal,draft.payloadHash())));
    }
    public Payment payment(PosContext ctx,long id){var i=d.intents().findById(ctx,id).orElseThrow(()->PosApiException.notFound("Terminal payment unavailable."));access.require(ctx,i);return safe(i);}
    public Optional<Payment> byKey(PosContext ctx,String key){return d.intents().findByIdempotency(ctx,key).map(i->{access.require(ctx,i);return safe(i);});}
    public List<Payment> pending(PosContext ctx,Long register,Long shift,int limit){return d.intents().listRecoverable(ctx,register,shift,limit).stream().filter(i->access.allowed(ctx,i)).map(this::safe).toList();}
    private Payment safe(SquareRecords.PaymentIntent i){return new Payment("SQUARE",i.id(),i.cashRegisterId(),i.shiftId(),i.idempotencyKey(),i.status().name(),i.amount(),i.currencyCode(),i.posTicketId(),i.posTicketId()!=null?"COMPLETED":i.status()==SquareTerminalPaymentStatus.APPROVED?"RECOVERY_REQUIRED":"PENDING",i.updatedAt()==null?0:i.updatedAt().toEpochMilli());}
    public Refund refund(PosContext ctx,long id){var r=refunds.find(ctx.companyId(),id,false).orElseThrow(()->PosApiException.notFound("Refund unavailable."));payment(ctx,r.intentId());return safe(r);}
    public Optional<Refund> refundByKey(PosContext ctx,String key){return refunds.byKey(ctx.companyId(),key).map(r->{payment(ctx,r.intentId());return safe(r);});}
    public Refund safe(SquareRefundRecord r){return new Refund("SQUARE",r.id(),r.intentId(),r.key(),r.amount(),r.currencyCode(),r.status(),r.version());}
    public BigDecimal inspectRefund(PosContext ctx,long id,BigDecimal requested){policy.requireEnabled();var i=d.intents().findById(ctx,id).orElseThrow();access.require(ctx,i);eligibility.require(i);outstanding.inspectNone(i);return amounts.requested(requested,i.amount().subtract(ledger.confirmed(ctx.companyId(),"SQUARE",id)));}
    public Map<String,BigDecimal> refundBudget(PosContext ctx,long id){var p=payment(ctx,id);var confirmed=ledger.confirmed(ctx.companyId(),"SQUARE",id);return Map.of("confirmed",confirmed,"remaining",p.amount().subtract(confirmed));}
    public String inspectOriginalReturn(PosContext ctx,long id,boolean recovering){
        d.secrets().requireEnabled();var intent=d.intents().findById(ctx,id).orElseThrow();access.require(ctx,intent);
        if(!recovering)eligibility.require(intent);
        return com.indice.erp.pos.assistant.PosTerminalSnapshots.hash(java.util.Arrays.asList(intent.id(),intent.status(),intent.amount(),intent.currencyCode(),intent.updatedAt(),ledger.confirmed(ctx.companyId(),"SQUARE",id)));
    }
}
