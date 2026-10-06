package com.indice.erp.pos.mercadopago;
import com.indice.erp.pos.*;
import com.indice.erp.pos.assistant.PosTerminalContracts.*;
import com.indice.erp.pos.settlement.TerminalRefundStore;
import java.math.BigDecimal;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
@Service
@RequiredArgsConstructor
public class MpAssistantPort {
    private final MpSecrets secrets;private final MpTerminalStore terminals;private final MpMerchantTokens tokens;
    private final MpLiveActivationPolicy activation;private final MpPaymentPreflight preflight;private final MpIntentReader intents;
    private final MpRefundRequestStore refunds;private final MpRefundEligibility eligibility;private final MpRefundOutstanding outstanding;
    private final MpRefundAmounts amounts;private final TerminalRefundStore ledger;private final MpRefundPolicy policy;
    public com.indice.erp.pos.assistant.PosTerminalSnapshots.Charge inspectCharge(PosContext ctx,MpCreatePayment request){
        secrets.requireEnabled();if(!"MXN".equals(request.currencyCode()))throw PosApiException.conflict("Point terminal payments require MXN.");
        var terminal=terminals.requireBinding(ctx,request.cashRegisterId());MpTerminalEligibility.requireReady(terminal,request.cashRegisterId());
        var connection=tokens.connection(ctx.companyId());activation.requireChargeAllowed(connection);var draft=preflight.preview(ctx,request);
        return new com.indice.erp.pos.assistant.PosTerminalSnapshots.Charge(draft.amount(),"MXN",com.indice.erp.pos.assistant.PosTerminalSnapshots.hash(List.of(terminal,connection.id(),connection.sellerId(),connection.environment(),connection.activation().state(),draft.checkoutJson())));
    }
    public Payment payment(PosContext ctx,long id){return safe(intents.find(ctx,id).orElseThrow(()->PosApiException.notFound("Terminal payment unavailable.")));}
    public Optional<Payment> byKey(PosContext ctx,String key){return intents.byKey(ctx,key).map(this::safe);}
    public List<Payment> pending(PosContext ctx,Long register,Long shift,int limit){return intents.pending(ctx,register,shift,limit).stream().map(this::safe).toList();}
    private Payment safe(MpIntent i){return new Payment("MERCADO_PAGO",i.id(),i.cashRegisterId(),i.shiftId(),i.idempotencyKey(),i.status(),i.amount(),i.currencyCode(),i.posTicketId(),i.posTicketId()!=null?"COMPLETED":Set.of("APPROVED","PARTIALLY_REFUNDED").contains(i.status())?"RECOVERY_REQUIRED":"PENDING",i.version());}
    public Refund refund(PosContext ctx,long id){var r=refunds.find(ctx.companyId(),id).orElseThrow(()->PosApiException.notFound("Refund unavailable."));payment(ctx,r.intentId());return safe(r);}
    public Optional<Refund> refundByKey(PosContext ctx,String key){return refunds.byKey(ctx.companyId(),key).map(r->{payment(ctx,r.intentId());return safe(r);});}
    public Refund safe(MpRefundRecord r){return new Refund("MERCADO_PAGO",r.id(),r.intentId(),r.key(),r.amount(),"MXN",r.status(),r.version());}
    public BigDecimal inspectRefund(PosContext ctx,long id,BigDecimal requested){policy.requireEnabled();var i=intents.find(ctx,id).orElseThrow();eligibility.require(i);outstanding.inspectNone(i);if(!Set.of("APPROVED","PARTIALLY_REFUNDED").contains(i.status())||i.paymentId()==null||i.orderId()==null)throw PosApiException.conflict("Verified Point payment required.");return amounts.requested(new MpRefundRequest("preview",requested,"Preview"),i.amount().subtract(ledger.confirmed(ctx.companyId(),id)));}
    public Map<String,BigDecimal> refundBudget(PosContext ctx,long id){var p=payment(ctx,id);var confirmed=ledger.confirmed(ctx.companyId(),id);return Map.of("confirmed",confirmed,"remaining",p.amount().subtract(confirmed));}
    public String inspectOriginalReturn(PosContext ctx,long id,String key){
        var intent=intents.find(ctx,id).orElseThrow();var saved=refunds.byKey(ctx.companyId(),key).orElse(null);
        if(saved!=null&&(saved.intentId()!=id||saved.baselineAmount().signum()!=0||saved.amount().compareTo(intent.amount())!=0))throw PosApiException.conflict("Original full-refund identity differs.");
        if(saved==null||!Set.of("CONFIRMED","REJECTED","NOT_SUBMITTED").contains(saved.status())){
            policy.requireEnabled();var merchant=tokens.connection(ctx.companyId());if(merchant.id()!=intent.connectionId()||!merchant.sellerId().equals(intent.sellerId())||!merchant.environment().equals(intent.environment()))throw PosApiException.conflict("The original merchant connection is required.");
            if(saved==null){eligibility.require(intent);if(!"APPROVED".equals(intent.status())||ledger.confirmed(ctx.companyId(),id).signum()!=0)throw PosApiException.conflict("An unrefunded original payment is required.");}
        }
        return com.indice.erp.pos.assistant.PosTerminalSnapshots.hash(Arrays.asList(intent.id(),intent.status(),intent.version(),saved==null?null:saved.status(),saved==null?null:saved.version(),ledger.confirmed(ctx.companyId(),id)));
    }
}
