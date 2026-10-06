package com.indice.erp.pos.assistant;

import static com.indice.erp.pos.assistant.PosOperationsContracts.*;
import com.fasterxml.jackson.databind.*;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.pos.*;
import com.indice.erp.pos.cashclosing.*;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.restaurant.RestaurantOrderService;
import com.indice.erp.pos.selfservice.SelfServiceKioskService;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketResponse;
import com.indice.erp.pos.settlement.*;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import java.math.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PosOperationsService {
    public static final Set<String> READS=Set.of("list_pos_closings","get_pos_closing","list_pos_closing_settlements","list_pos_source_orders","get_pos_source_order","list_pos_pretickets","get_pos_preticket");
    public static final Set<String> ACTIONS=Set.of("confirm_pos_closing_settlement","claim_pos_source_order","release_pos_source_order","claim_pos_preticket","release_pos_preticket");
    private final PosAssistantService pos;private final CashClosingHistoryService history;private final CashClosingSettlementService settlements;private final TerminalRefundAdjustmentBalance refunds;
    private final CashRegisterService registers;private final ShiftRepository shifts;private final RestaurantOrderService restaurant;private final SelfServiceKioskService kiosks;private final TerminalPaymentGuard terminal;private final JdbcTemplate jdbc;private final ObjectMapper mapper;
    public PosOperationsService(PosAssistantService pos,CashClosingHistoryService history,CashClosingSettlementService settlements,TerminalRefundAdjustmentBalance refunds,CashRegisterService registers,ShiftRepository shifts,RestaurantOrderService restaurant,SelfServiceKioskService kiosks,TerminalPaymentGuard terminal,JdbcTemplate jdbc,ObjectMapper mapper){this.pos=pos;this.history=history;this.settlements=settlements;this.refunds=refunds;this.registers=registers;this.shifts=shifts;this.restaurant=restaurant;this.kiosks=kiosks;this.terminal=terminal;this.jdbc=jdbc;this.mapper=mapper;}
    @Transactional(readOnly=true)
    public ReadResult read(AuthSessionUser user,String tool,Query request){
        if(!READS.contains(tool))throw new IllegalArgumentException("Unknown POS operations read.");var ctx=pos.context(user);var q=request==null?new Query(null,null,null,null,null,null):request;int limit=q.limit()==null?25:q.limit();if(q.from()!=null&&q.to()!=null&&q.to().isBefore(q.from()))throw new IllegalArgumentException("Invalid POS date range.");if(limit<1||limit>50)throw new IllegalArgumentException("Invalid POS page size.");
        boolean closing=tool.contains("closing");Set<String> fields=tool.equals("list_pos_closings")?Set.of("cashRegisterId","from","to","limit","cursor"):closing?Set.of("id","limit","cursor"):Set.of("id","cashRegisterId","limit","cursor");mapper.valueToTree(q).fieldNames().forEachRemaining(k->{if(!fields.contains(k))throw new IllegalArgumentException("Unexpected POS query field: "+k);});
        String binding=hash(Arrays.asList(user.companyId(),user.userCompanyId(),tool,q.id(),q.cashRegisterId(),q.from(),q.to(),ctx.scope()));int start=offset(q.cursor(),binding);Records rows;int total;
        if(tool.equals("list_pos_closings")){
            var page=history.list(ctx,new CashClosingQueryFilter(q.from(),q.to(),q.cashRegisterId(),null,null,null,null,limit,start));rows=new Records(page.items().stream().map(v->new Closing(v.id(),v.shiftId(),v.cashRegisterId(),v.currencyCode(),v.expectedCashAmount(),v.countedCashAmount(),v.overShortAmount(),v.totalSalesAmount(),v.totalRefundsAmount(),v.ticketsCount(),v.closedAt())).toList(),List.of(),List.of());total=page.count();
        }else if(tool.equals("get_pos_closing")){var v=history.detail(ctx,id(q.id()));rows=new Records(List.of(new Closing(v.id(),v.shiftId(),v.cashRegisterId(),v.shift().currencyCode(),v.expectedCashAmount(),v.countedCashAmount(),v.overShortAmount(),v.totalSalesAmount(),v.totalRefundsAmount(),v.ticketsCount(),v.closedAt())),List.of(),List.of());total=1;
        }else if(tool.equals("list_pos_closing_settlements")){history.detail(ctx,id(q.id()));var all=settlements.list(ctx,q.id()).stream().map(v->safe(ctx,v)).toList();total=all.size();rows=new Records(List.of(),slice(all,start,limit),List.of());
        }else{long register=id(q.cashRegisterId());registers.requireOperationalRegister(ctx,register);var all=new ArrayList<Source>();if(tool.contains("preticket")){if(tool.startsWith("get_")){var pending=kiosks.pending(ctx,register).items().stream().filter(v->v.id()==id(q.id())).findFirst();all.add(preticket(pending.orElseGet(()->kiosks.inspectCheckout(ctx,id(q.id()),register,true))));}else kiosks.pending(ctx,register).items().forEach(v->all.add(preticket(v)));}
            else {restaurant.pendingCheckout(ctx,register).stream().filter(v->q.id()==null||((Number)v.get("id")).longValue()==id(q.id())).forEach(v->all.add(order(ctx,register,v)));if(tool.startsWith("get_")&&all.size()!=1)throw new NoSuchElementException("Current order unavailable.");}total=all.size();rows=new Records(List.of(),List.of(),slice(all,start,limit));}
        int returned=rows.closings().size()+rows.settlements().size()+rows.sources().size(),end=start+returned;return new ReadResult(rows,total,end<total,end<total?cursor(end,binding):null,ctx.scope().type().name());
    }
    @Transactional(readOnly=true)
    public Prepared prepare(AuthSessionUser user,String action,Change c){return plan(user,action,c,false);}
    @Transactional
    public Result execute(AuthSessionUser user,Prepared saved){
        var current=plan(user,saved.action(),saved.change(),true);if(!canonical(current).equals(canonical(saved)))throw new IllegalStateException("POS source, settlement or authority changed. Review again.");var ctx=pos.context(user);var c=saved.change();
        if(saved.action().contains("settlement"))return new Result(saved.action(),new Records(List.of(),List.of(safe(ctx,settlements.confirm(ctx,c.settlement().closingId(),c.id(),new ConfirmSettlementRequest(c.settlement().receivedAmount(),c.settlement().note())))),List.of()));
        long register=c.source().cashRegisterId();boolean release=saved.action().startsWith("release_");Source result;
        if(saved.action().contains("preticket"))result=preticket(release?kiosks.releaseClaim(ctx,c.id(),register):kiosks.claim(ctx,c.id(),register));
        else {if(release)restaurant.release(ctx,c.id(),register);else restaurant.claim(ctx,c.id(),register);var next=current.after().sources().getFirst();result=next;}
        return new Result(saved.action(),new Records(List.of(),List.of(),List.of(result)));
    }
    public void requireResultAccess(AuthSessionUser user,Result result){var ctx=pos.context(user);result.records().settlements().forEach(v->history.detail(ctx,v.closingId()));result.records().sources().forEach(v->{registers.requireOperationalRegister(ctx,v.cashRegisterId());if(v.kind().equals("PRETICKET"))kiosks.requireAssistantRecordAccess(ctx,v.id(),v.cashRegisterId());else restaurant.requireAssistantRecordAccess(ctx,v.id(),v.cashRegisterId());});}
    private Prepared plan(AuthSessionUser user,String action,Change c,boolean lock){
        if(!ACTIONS.contains(action)||c==null)throw new IllegalArgumentException("Unknown POS operation.");id(c.id());var ctx=pos.context(user);Set<String> fields=action.contains("settlement")?Set.of("id","settlement"):Set.of("id","source");mapper.valueToTree(c).fieldNames().forEachRemaining(k->{if(!fields.contains(k))throw new IllegalArgumentException("Unexpected POS operation field: "+k);});if(lock)jdbc.queryForList("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,ctx.companyId());var versions=new TreeMap<String,String>();
        if(action.contains("settlement")){
            if(!ctx.canManageOtherUsers())throw new SecurityException("Settlement management required.");var in=c.settlement();if(in==null)throw new IllegalArgumentException("Settlement review required.");id(in.closingId());history.detail(ctx,in.closingId());if(lock)jdbc.queryForList("SELECT id FROM pos_cash_closing_settlements WHERE company_id=? AND id=? AND cash_closing_id=? FOR UPDATE",Long.class,ctx.companyId(),c.id(),in.closingId());var old=settlements.list(ctx,in.closingId()).stream().filter(v->v.id()==c.id()).findFirst().orElseThrow(NoSuchElementException::new);
            if(!"PENDING".equals(old.status()))throw new IllegalStateException("Only a pending settlement can be reviewed.");amount(in.receivedAmount());if(in.note()!=null&&in.note().length()>500)throw new IllegalArgumentException("Settlement note exceeds 500 characters.");var before=safe(ctx,old);var pending=before.pending().subtract(before.postedRefunds());if(pending.signum()<0)throw new IllegalStateException("Posted refunds exceed this settlement.");var variance=in.receivedAmount().subtract(pending);if(variance.signum()!=0&&(in.note()==null||in.note().trim().length()<8))throw new IllegalArgumentException("A settlement difference requires a note of at least eight characters.");
            versions.put("settlement",hash(old));var next=new Settlement(old.id(),old.cashClosingId(),old.shiftId(),old.cashRegisterId(),old.paymentMethod(),old.currencyCode(),old.grossAmount(),old.retainedCashAmount(),old.transferableAmount(),old.destinationPaymentAccountId(),old.destinationPaymentAccountName(),old.settlementTiming(),BigDecimal.ZERO,before.postedRefunds(),in.receivedAmount(),variance,variance.signum()==0?"SETTLED":"RECONCILIATION_REQUIRED",old.version());return new Prepared(action,c,new Records(List.of(),List.of(before),List.of()),new Records(List.of(),List.of(next),List.of()),Map.copyOf(versions));
        }
        var in=c.source();if(in==null)throw new IllegalArgumentException("Checkout source register required.");long register=id(in.cashRegisterId());var r=registers.requireOperationalRegister(ctx,register);if(lock)jdbc.queryForList("SELECT id FROM pos_cash_registers WHERE company_id=? AND id=? FOR UPDATE",Long.class,ctx.companyId(),register);var shift=shifts.findOpenByUserAndRegister(ctx,register).orElseThrow(()->new IllegalStateException("Open cashier shift required."));if(!Objects.equals(shift.openedByUserId(),ctx.userId()))throw new SecurityException("The current cashier must own the open shift.");terminal.assertNoPending(ctx,register);boolean release=action.startsWith("release_");Source source;
        if(action.contains("preticket"))source=preticket(kiosks.inspectCheckout(ctx,c.id(),register,release));else {var row=restaurant.pendingCheckout(ctx,register).stream().filter(v->((Number)v.get("id")).longValue()==c.id()).findFirst().orElseThrow(NoSuchElementException::new);source=order(ctx,register,row);if(!source.status().equals(release?"CLAIMED_FOR_CHECKOUT":"READY_FOR_CHECKOUT"))throw new IllegalStateException("Source claim state changed.");}
        versions.put("register",hash(r));versions.put("shift",hash(shift));var next=new Source(source.id(),source.kind(),source.cashRegisterId(),source.number(),action.contains("preticket")?(release?"PENDING":"CLAIMED"):(release?"READY_FOR_CHECKOUT":"CLAIMED_FOR_CHECKOUT"),source.currency(),source.total(),source.discount(),source.discountRuleId(),source.expiresAt(),source.items());return new Prepared(action,c,new Records(List.of(),List.of(),List.of(source)),new Records(List.of(),List.of(),List.of(next)),Map.copyOf(versions));
    }
    private Source order(PosContext ctx,long register,Map<String,Object> row){long id=((Number)row.get("id")).longValue();var detail=restaurant.inspectCheckout(ctx,id,register);return new Source(id,"RESTAURANT",register,detail.orderNumber(),String.valueOf(row.get("status")),detail.currencyCode(),(BigDecimal)row.get("totalAmount"),BigDecimal.ZERO,null,null,detail.items().stream().map(v->new SourceLine(v.productId(),v.name(),v.quantity(),v.unitPrice(),BigDecimal.ZERO,null,v.lineTotal())).toList());}
    private static Source preticket(PreticketResponse p){return new Source(p.id(),"PRETICKET",p.cashRegisterId(),p.preticketNumber(),p.status(),p.currencyCode(),p.totalAmount(),p.discountAmount(),p.discountRuleId(),p.expiresAt(),p.items().stream().map(v->new SourceLine(v.productId(),v.productName(),v.quantity(),v.unitPrice(),v.discountAmount(),v.discountRuleId(),v.lineTotal())).toList());}
    private Settlement safe(PosContext c,CashClosingSettlement v){return new Settlement(v.id(),v.cashClosingId(),v.shiftId(),v.cashRegisterId(),v.paymentMethod(),v.currencyCode(),v.grossAmount(),v.retainedCashAmount(),v.transferableAmount(),v.destinationPaymentAccountId(),v.destinationPaymentAccountName(),v.settlementTiming(),v.pendingAmount(),refunds.postedPending(c.companyId(),v.id()),v.settledAmount(),v.varianceAmount(),v.status(),v.version());}
    private static void amount(BigDecimal n){if(n==null||n.signum()<0||n.stripTrailingZeros().scale()>2||n.precision()-n.scale()>12)throw new IllegalArgumentException("Valid native settlement amount required.");}
    private static long id(Long v){if(v==null||v<1)throw new IllegalArgumentException("Positive POS object ID required.");return v;}
    private static <T>List<T> slice(List<T> all,int start,int limit){if(start>all.size())throw new IllegalArgumentException("POS cursor invalid.");return all.subList(start,Math.min(all.size(),start+limit));}
    private JsonNode canonical(Object v){try{return mapper.reader().with(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readTree(mapper.writeValueAsString(v));}catch(Exception e){throw new IllegalStateException("Invalid POS operations snapshot.",e);}}
    private String hash(Object v){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(v)));}catch(Exception e){throw new IllegalStateException("Invalid POS operations snapshot.",e);}}
    private static String cursor(int n,String b){return Base64.getUrlEncoder().withoutPadding().encodeToString((n+":"+b).getBytes(StandardCharsets.UTF_8));}
    private static int offset(String c,String b){if(c==null)return 0;try{var parts=new String(Base64.getUrlDecoder().decode(c),StandardCharsets.UTF_8).split(":",2);int n=Integer.parseInt(parts[0]);if(n>=0&&parts[1].equals(b))return n;}catch(RuntimeException ignored){}throw new IllegalArgumentException("POS cursor belongs to another query or scope.");}
}
