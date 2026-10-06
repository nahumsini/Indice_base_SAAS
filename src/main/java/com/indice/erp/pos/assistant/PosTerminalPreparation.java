package com.indice.erp.pos.assistant;
import static com.indice.erp.pos.assistant.PosTerminalContracts.*;
import static com.indice.erp.pos.assistant.PosTerminalReadService.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.pos.checkout.dto.*;
import com.indice.erp.pos.mercadopago.*;
import com.indice.erp.pos.square.*;
import com.indice.erp.pos.returns.PosReturnRepository;
import com.indice.erp.pos.terminal.TerminalBindingRepository;
import java.math.BigDecimal;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@RequiredArgsConstructor
public class PosTerminalPreparation {
    public static final Set<String> ACTIONS=Set.of("create_pos_terminal_payment","recover_pos_terminal_payment","cancel_pos_terminal_payment","refund_pos_card_payment","recheck_pos_card_refund","confirm_pos_card_return");
    private final PosAssistantService pos;private final PosTerminalReadService reads;private final SquareAssistantPort square;private final MpAssistantPort mp;
    private final TerminalBindingRepository bindings;private final PosReturnRepository returns;private final JdbcTemplate jdbc;private final com.indice.erp.pos.returns.PosReturnService returnOwner;
    @Transactional(readOnly=true)
    public Prepared prepare(AuthSessionUser user,String action,Change c){return prepare(user,action,c,false);}
    public Prepared prepare(AuthSessionUser user,String action,Change c,boolean lock){
        if(c==null||!ACTIONS.contains(action))throw new IllegalArgumentException("Explicit terminal action required.");var ctx=pos.context(user);var versions=new TreeMap<String,String>();if(lock)jdbc.queryForList("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,user.companyId());
        Set<String> fields=action.equals("create_pos_terminal_payment")?Set.of("provider","checkout"):action.equals("refund_pos_card_payment")?Set.of("id","provider","refund"):action.equals("confirm_pos_card_return")?Set.of("id"):action.equals("recheck_pos_card_refund")?Set.of("id","provider","reason"):Set.of("id","provider");PosTerminalSnapshots.canonical(c).fieldNames().forEachRemaining(k->{if(!fields.contains(k))throw new IllegalArgumentException("Unexpected terminal action field: "+k);});
        if(action.equals("confirm_pos_card_return")){if(!ctx.canManageOtherUsers())throw new SecurityException("Return management required.");var r=returns.get(ctx,id(c.id()));if(!Set.of("PREPARED","PROCESSING").contains(r.status())||r.payments().size()!=1||!"CARD".equals(r.payments().getFirst().paymentMethod())||Set.of("FAILED","REJECTED").contains(r.payments().getFirst().status()))throw new IllegalStateException("Prepared original-card return required.");var plan=returnOwner.inspectExisting(ctx,r.id());versions.put("returnStock",PosTerminalSnapshots.hash(plan.inventory()));var identity=returnOwner.cardIdentity(ctx,r.id());if(!r.payments().stream().allMatch(p->"COMPLETED".equals(p.status())))versions.put("returnProvider",identity.provider().equals("MERCADO_PAGO")?mp.inspectOriginalReturn(ctx,identity.intentId(),identity.requestKey()):square.inspectOriginalReturn(ctx,identity.intentId(),r.payments().getFirst().providerRefundId()!=null));return new Prepared(action,c,new Records(List.of(),List.of(),List.of(r),List.of()),null,r.totalAmount(),r.currency(),Map.copyOf(versions));}
        provider(c.provider());
        if(action.equals("create_pos_terminal_payment")){
            var in=c.checkout();if(in==null)throw new IllegalArgumentException("Card checkout required.");if(in.items()==null||in.items().isEmpty()||in.items().size()>100)throw new IllegalArgumentException("Bounded card checkout items required.");var binding=bindings.find(ctx,id(in.cashRegisterId()));if(!c.provider().equals(binding.providerCode()))throw new IllegalStateException("The current register terminal provider differs.");
            var request=request(ctx,in,BigDecimal.ONE,false,versions);var sq=squareRequest(request,"ai_preview");var point=mpRequest(request,"ai_preview");var proof=c.provider().equals("SQUARE")?square.inspectCharge(ctx,sq):mp.inspectCharge(ctx,point);versions.put("terminal",proof.fingerprint());versions.put("binding",PosTerminalSnapshots.hash(binding));
            var draft=pos.prepareTerminalCheckout(ctx,checkout(in,proof.amount()),lock,versions);return new Prepared(action,c,new Records(List.of(),List.of(),List.of(),List.of(binding)),draft,null,draft.currency(),Map.copyOf(versions));
        }
        if(action.equals("recheck_pos_card_refund")){if(!ctx.canManageOtherUsers())throw new SecurityException("Refund management required.");reason(c.reason(),8,500);var r=reads.refund(ctx,c.provider(),id(c.id()));if(!Set.of("PENDING","UNCERTAIN","RECONCILIATION_REQUIRED","DEAD_LETTER").contains(r.status()))throw new IllegalStateException("Recoverable refund required.");return new Prepared(action,c,new Records(List.of(),List.of(r),List.of(),List.of()),null,r.amount(),r.currency(),Map.of());}
        var payment=reads.payment(ctx,c.provider(),id(c.id()));var amount=(BigDecimal)null;
        if(action.equals("refund_pos_card_payment")){if(!ctx.canManageOtherUsers())throw new SecurityException("Refund management required.");var in=c.refund();if(in==null)throw new IllegalArgumentException("Refund amount and reason required.");reason(in.reason(),5,c.provider().equals("SQUARE")?192:500);if(in.amount()==null||in.amount().signum()<=0||in.amount().stripTrailingZeros().scale()>2)throw new IllegalArgumentException("Explicit native refund amount required.");amount=c.provider().equals("SQUARE")?square.inspectRefund(ctx,payment.id(),in.amount()):mp.inspectRefund(ctx,payment.id(),in.amount());var budget=c.provider().equals("SQUARE")?square.refundBudget(ctx,payment.id()):mp.refundBudget(ctx,payment.id());versions.put("refundConfirmed",budget.get("confirmed").toPlainString());versions.put("refundRemaining",budget.get("remaining").toPlainString());}
        else if(action.equals("cancel_pos_terminal_payment")&&(!Set.of("WAITING","UNCERTAIN").contains(payment.status())||payment.ticketId()!=null))throw new IllegalStateException("Only an unresolved terminal attempt can be reviewed for cancellation.");
        return new Prepared(action,c,new Records(List.of(payment),List.of(),List.of(),List.of()),null,amount,payment.currency(),Map.copyOf(versions));
    }
    public PosCheckoutRequest request(com.indice.erp.pos.PosContext ctx,CardInput in,BigDecimal amount,boolean lock,Map<String,String> versions){return pos.checkoutRequest(ctx,checkout(in,amount),lock,versions);}
    private static PosAssistantContracts.CheckoutInput checkout(CardInput in,BigDecimal amount){return new PosAssistantContracts.CheckoutInput(in.cashRegisterId(),in.customerId(),in.preticketId(),in.restaurantOrderId(),in.currency(),in.items(),List.of(new PosAssistantContracts.PaymentInput("CARD",null,amount,null)),in.notes());}
    public static SquareTerminalDtos.CreatePaymentRequest squareRequest(PosCheckoutRequest r,String key){return new SquareTerminalDtos.CreatePaymentRequest(key,r.cashRegisterId(),r.customerId(),r.preticketId(),r.restaurantOrderId(),r.currencyCode(),r.items(),r.notes());}
    public static MpCreatePayment mpRequest(PosCheckoutRequest r,String key){return new MpCreatePayment(key,r.cashRegisterId(),r.customerId(),r.preticketId(),r.restaurantOrderId(),r.currencyCode(),r.items(),r.notes());}
    private static void reason(String r,int min,int max){if(r==null||r.trim().length()<min||r.length()>max)throw new IllegalArgumentException("Valid terminal operation reason required.");}
}
