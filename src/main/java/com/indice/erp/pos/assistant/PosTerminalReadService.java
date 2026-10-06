package com.indice.erp.pos.assistant;
import static com.indice.erp.pos.assistant.PosTerminalContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.mercadopago.MpAssistantPort;
import com.indice.erp.pos.square.SquareAssistantPort;
import com.indice.erp.pos.terminal.TerminalBindingRepository;
import com.indice.erp.pos.returns.PosReturnRepository;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@RequiredArgsConstructor
public class PosTerminalReadService {
    public static final Set<String> READS=Set.of("get_pos_terminal_binding","get_pos_terminal_payment","get_pos_terminal_payment_by_request","list_pos_pending_terminal_payments","get_pos_card_refund","get_pos_card_refund_by_request","get_pos_card_return_refund");
    private final PosAssistantService pos;private final SquareAssistantPort square;private final MpAssistantPort mp;
    private final TerminalBindingRepository bindings;private final CashRegisterService registers;private final PosReturnRepository returns;private final com.indice.erp.pos.returns.PosReturnService returnOwner;
    @Transactional(readOnly=true)
    public ReadResult read(AuthSessionUser user,String tool,Query q){
        if(!READS.contains(tool)||q==null)throw new IllegalArgumentException("Explicit terminal query required.");var ctx=pos.context(user);Set<String> fields=tool.equals("get_pos_terminal_binding")?Set.of("cashRegisterId"):tool.equals("get_pos_card_return_refund")?Set.of("id"):tool.startsWith("list_")?Set.of("provider","cashRegisterId","shiftId","limit"):tool.endsWith("by_request")?Set.of("provider","requestKey"):Set.of("provider","id");PosTerminalSnapshots.canonical(q).fieldNames().forEachRemaining(k->{if(!fields.contains(k))throw new IllegalArgumentException("Unexpected terminal query field: "+k);});int limit=q.limit()==null?25:q.limit();if(limit<1||limit>50)throw new IllegalArgumentException("Terminal list limit must be 1..50.");
        if(tool.equals("get_pos_terminal_binding")){registers.requireOperationalRegister(ctx,id(q.cashRegisterId()));return new ReadResult(new Records(List.of(),List.of(),List.of(),List.of(bindings.find(ctx,q.cashRegisterId()))),false,1);}
        if(tool.equals("get_pos_card_return_refund")){var r=returns.get(ctx,id(q.id()));var refund=returnRefund(ctx,r.id());return new ReadResult(new Records(List.of(),refund.stream().toList(),List.of(r),List.of()),false,1);}
        provider(q.provider());boolean refund=tool.contains("refund");Records result;
        if(tool.startsWith("list_")){if(q.cashRegisterId()!=null)registers.requireOperationalRegister(ctx,q.cashRegisterId());var rows=q.provider().equals("SQUARE")?square.pending(ctx,q.cashRegisterId(),q.shiftId(),limit):mp.pending(ctx,q.cashRegisterId(),q.shiftId(),limit);return new ReadResult(new Records(rows,List.of(),List.of(),List.of()),rows.size()==limit,limit);}
        if(tool.endsWith("by_request")){if(q.requestKey()==null||!q.requestKey().matches("[A-Za-z0-9_-]{1,100}"))throw new IllegalArgumentException("Original terminal request key required.");result=refund?new Records(List.of(),List.of(refundByKey(ctx,q.provider(),q.requestKey()).orElseThrow(NoSuchElementException::new)),List.of(),List.of()):new Records(List.of(paymentByKey(ctx,q.provider(),q.requestKey()).orElseThrow(NoSuchElementException::new)),List.of(),List.of(),List.of());}
        else result=refund?new Records(List.of(),List.of(refund(ctx,q.provider(),id(q.id()))),List.of(),List.of()):new Records(List.of(payment(ctx,q.provider(),id(q.id()))),List.of(),List.of(),List.of());
        return new ReadResult(result,false,1);
    }
    public Optional<Refund> returnRefund(PosContext c,long id){return "MERCADO_PAGO".equals(returnOwner.cardProvider(c,id))?mp.refundByKey(c,returnOwner.cardRequestKey(c,id)):Optional.empty();}
    public Payment payment(PosContext c,String p,long id){provider(p);return p.equals("SQUARE")?square.payment(c,id):mp.payment(c,id);}
    public Optional<Payment> paymentByKey(PosContext c,String p,String key){provider(p);return p.equals("SQUARE")?square.byKey(c,key):mp.byKey(c,key);}
    public Refund refund(PosContext c,String p,long id){provider(p);return p.equals("SQUARE")?square.refund(c,id):mp.refund(c,id);}
    public Optional<Refund> refundByKey(PosContext c,String p,String key){provider(p);return p.equals("SQUARE")?square.refundByKey(c,key):mp.refundByKey(c,key);}
    public Result refresh(AuthSessionUser u,Result r){var c=pos.context(u);return new Result(r.action(),r.requestKey(),new Records(r.records().payments().stream().map(v->payment(c,v.provider(),v.id())).toList(),r.records().refunds().stream().map(v->refund(c,v.provider(),v.id())).toList(),r.records().returns().stream().map(v->returns.get(c,v.id())).toList(),r.records().bindings()));}
    public static void provider(String p){if(p==null||!Set.of("SQUARE","MERCADO_PAGO").contains(p))throw new IllegalArgumentException("Supported terminal provider required.");}
    public static long id(Long id){if(id==null||id<1)throw new IllegalArgumentException("Positive terminal object ID required.");return id;}
}
