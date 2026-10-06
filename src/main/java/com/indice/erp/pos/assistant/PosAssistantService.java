package com.indice.erp.pos.assistant;

import static com.indice.erp.pos.assistant.PosAssistantContracts.*;
import static com.indice.erp.pos.assistant.PosAssistantViews.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.pos.*;
import com.indice.erp.pos.cashregister.CashRegisterService;
import com.indice.erp.pos.cashregister.dto.*;
import com.indice.erp.pos.shift.*;
import com.indice.erp.pos.shift.dto.*;
import com.indice.erp.pos.status.*;
import com.indice.erp.pos.checkout.*;
import com.indice.erp.pos.checkout.dto.*;
import com.indice.erp.pos.ticket.TicketService;
import com.indice.erp.pos.ticket.dto.PosTicketResponse;
import com.indice.erp.pos.cashmovement.*;
import com.indice.erp.pos.cashmovement.dto.*;
import com.indice.erp.pos.cashclosing.CashClosingRepository;
import com.indice.erp.pos.receipt.*;
import com.indice.erp.pos.returns.*;
import com.indice.erp.pos.settlement.SettlementRuleRequest;
import com.indice.erp.pos.terminal.TerminalPaymentGuard;
import com.indice.erp.finance.treasury.TreasuryService;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Authenticated POS delegation uses the existing cash, stock, ticket and return owners. */
@Service
public class PosAssistantService {
    private final com.indice.erp.pos.settlement.ClosingSettlementPreview settlementPreview;
    public static final Set<String> READS=Set.of("list_pos_registers","get_pos_register","list_pos_shifts","get_pos_shift","get_my_pos_shift",
        "get_pos_closing_summary","list_pos_tickets","get_pos_ticket","list_pos_cash_movements","list_pos_inventory_receipts","get_pos_return","recover_pos_checkout");
    public static final Set<String> ACTIONS=Set.of("create_pos_register","update_pos_register","inactivate_pos_register","open_pos_shift","close_pos_shift","cancel_pos_shift",
        "record_pos_cash_movement","complete_pos_checkout","receive_pos_inventory","reverse_pos_inventory_receipt","prepare_pos_return","confirm_pos_cash_return","cancel_pos_return");
    private final PosAccessService access;private final PosAssistantRepository repository;private final ObjectMapper mapper;
    private final CashRegisterService registers;private final ShiftService shifts;private final ShiftRepository shiftRows;
    private final ShiftValidator shiftValidator;private final TerminalPaymentGuard terminalGuard;private final CashClosingRepository closingRows;
    private final CashMovementService cash;private final CashMovementMapper cashMapper;private final CashMovementValidator cashValidator;
    private final CheckoutAssistantPreparation checkoutPreparation;private final CheckoutExecutionService checkoutExecution;
    private final TicketService tickets;private final PaidInventoryReceiptService receipts;private final PosReturnService returns;
    private final PosReturnRepository returnRows;private final TreasuryService treasury;private final com.indice.erp.pos.settlement.SettlementPolicyService policies;
    public PosAssistantService(com.indice.erp.pos.settlement.ClosingSettlementPreview settlementPreview,PosAccessService access,PosAssistantRepository repository,ObjectMapper mapper,CashRegisterService registers,
        ShiftService shifts,ShiftRepository shiftRows,ShiftValidator shiftValidator,TerminalPaymentGuard terminalGuard,CashClosingRepository closingRows,
        CashMovementService cash,CashMovementMapper cashMapper,CashMovementValidator cashValidator,CheckoutAssistantPreparation checkoutPreparation,
        CheckoutExecutionService checkoutExecution,TicketService tickets,PaidInventoryReceiptService receipts,PosReturnService returns,PosReturnRepository returnRows,TreasuryService treasury,com.indice.erp.pos.settlement.SettlementPolicyService policies) {
        this.settlementPreview=settlementPreview;this.access=access;this.repository=repository;this.mapper=mapper;this.registers=registers;this.shifts=shifts;this.shiftRows=shiftRows;
        this.shiftValidator=shiftValidator;this.terminalGuard=terminalGuard;this.closingRows=closingRows;this.cash=cash;this.cashMapper=cashMapper;this.cashValidator=cashValidator;
        this.checkoutPreparation=checkoutPreparation;this.checkoutExecution=checkoutExecution;this.tickets=tickets;this.receipts=receipts;this.returns=returns;this.returnRows=returnRows;this.treasury=treasury;this.policies=policies;
    }
    @Transactional(readOnly=true)
    public Page read(AuthSessionUser user,String tool,Query request) {
        if(!READS.contains(tool))throw new IllegalArgumentException("Unknown POS workflow read.");
        var q=request==null?new Query(null,null,null,null,null,null,null,null):request;var ctx=context(user);readShape(tool,q);var records=Records.empty();
        switch(tool) {
            case "list_pos_registers" -> records=registers(items(registers.list(ctx),CashRegisterResponse.class).stream().map(PosAssistantViews::register).toList());
            case "get_pos_register" -> records=registers(List.of(register(registers.get(ctx,id(q.id())))));
            case "list_pos_shifts" -> records=shifts(items(shifts.list(ctx),ShiftResponse.class).stream().map(PosAssistantViews::shift).toList());
            case "get_pos_shift" -> records=shifts(List.of(shift(shifts.get(ctx,id(q.id())))));
            case "get_my_pos_shift" -> {var current=shifts.currentOpenShift(ctx);records=shifts(current==null?List.of():List.of(shift(current)));}
            case "get_pos_closing_summary" -> records=closings(List.of(shifts.closingSummary(ctx,id(q.id()))));
            case "list_pos_tickets" -> {return ticketPage(user,ctx,q);}
            case "get_pos_ticket" -> records=tickets(List.of(ticket(tickets.get(ctx,id(q.id())))));
            case "list_pos_cash_movements" -> records=movements(items(cash.list(ctx,id(q.shiftId())),CashMovementResponse.class).stream().map(PosAssistantViews::movement).toList());
            case "list_pos_inventory_receipts" -> {shifts.get(ctx,id(q.shiftId()));records=receipts(receipts.historyForShift(ctx,q.shiftId()).stream().map(PosAssistantViews::receipt).toList());}
            case "get_pos_return" -> {admin(ctx);records=returns(List.of(returnRows.get(ctx,id(q.id()))));}
            case "recover_pos_checkout" -> {var c=checkoutExecution.recover(ctx,required(q.requestKey(),100));records=tickets(List.of(ticket(c.ticket(),c.items(),c.payments())));}
            default -> throw new IllegalArgumentException("Unsupported POS read.");
        }
        return page(user,ctx,tool,q,records);
    }
    private Page ticketPage(AuthSessionUser user,PosContext ctx,Query q){
        if(q.shiftId()!=null)shifts.get(ctx,id(q.shiftId()));if(q.cashRegisterId()!=null)registers.get(ctx,id(q.cashRegisterId()));
        int limit=q.limit()==null?25:q.limit();if(limit<1||limit>50)throw new IllegalArgumentException("POS page size must be between 1 and 50.");
        String binding=hash(Arrays.asList(user.companyId(),user.userId(),user.userCompanyId(),ctx.scope(),q.shiftId(),q.cashRegisterId(),limit));int start=offset(q.cursor(),binding);
        var result=tickets.assistantPage(ctx,q.shiftId(),q.cashRegisterId(),limit,start);int end=start+result.items().size();return new Page(tickets(result.items().stream().map(t->ticket(t,List.of(),List.of())).toList()),result.totalCount(),end<result.totalCount(),end<result.totalCount()?cursor(end,binding):null,ctx.scope().type().name());
    }
    private void readShape(String tool,Query q){
        Set<String> fields=switch(tool){case "list_pos_registers","list_pos_shifts"->Set.of("limit","cursor");case "get_my_pos_shift"->Set.of();case "recover_pos_checkout"->Set.of("requestKey");case "list_pos_tickets"->Set.of("shiftId","cashRegisterId","limit","cursor");case "list_pos_cash_movements","list_pos_inventory_receipts"->Set.of("shiftId","limit","cursor");default->Set.of("id");};
        mapper.valueToTree(q).fieldNames().forEachRemaining(k->{if(!fields.contains(k))throw new IllegalArgumentException("Unexpected POS query field: "+k);});
    }
    @Transactional(readOnly=true)
    public Prepared prepare(AuthSessionUser user,String action,Change change) {return prepare(user,action,change,false);}
    private Prepared prepare(AuthSessionUser user,String action,Change c,boolean lock) {
        if(!ACTIONS.contains(action)||c==null)throw new IllegalArgumentException("Invalid POS workflow action.");
        shape(action,c);var ctx=context(user);var versions=new TreeMap<String,String>();var before=Records.empty();var after=Records.empty();
        CheckoutAssistantPreparation.Draft checkout=null;PaidInventoryReceiptService.Preview receipt=null;PosReturnService.Inspection returnPlan=null;List<com.indice.erp.pos.settlement.ClosingSettlementPreview.Effect> settlementEffects=List.of();
        switch(action) {
            case "create_pos_register","update_pos_register","inactivate_pos_register" -> {
                admin(ctx);boolean create=action.equals("create_pos_register");CashRegisterResponse old=null;
                if(!create) {long rid=id(c.id());if(lock)repository.lockRegister(ctx,rid);old=registers.get(ctx,rid);before=registers(List.of(register(old)));versions.put("register",hash(old));requireNoPending(ctx,rid,lock);}
                if(create&&c.id()!=null)throw new IllegalArgumentException("New register has no ID.");
                var in=c.register();long wh=action.equals("inactivate_pos_register")?old.warehouseId():id(in.warehouseId());
                var whRows=repository.warehouse(ctx,wh,lock);if(whRows.isEmpty())throw new NoSuchElementException("Warehouse not found.");
                var w=whRows.getFirst();var wu=number(w.get("business_unit_id"));var wb=number(w.get("business_id"));
                if(wu==null||wb==null||!"active".equalsIgnoreCase(String.valueOf(w.get("status")))||(!ctx.scope().isCorporateOffice()&&(!Objects.equals(ctx.scope().unitId(),wu)||(ctx.scope().businessId()!=null&&!Objects.equals(ctx.scope().businessId(),wb)))))throw new NoSuchElementException("Operational warehouse not found in current scope.");
                versions.put("warehouse",hash(whRows));versions.put("registerPopulation",hash(repository.registerPopulation(ctx,lock)));
                if(!create&&(action.equals("inactivate_pos_register")||!Objects.equals(old.warehouseId(),wh)||in!=null&&(in.retainedCashAmount()!=null||in.settlementRules()!=null||in.settlementCurrency()!=null))&&shiftRows.hasBlockingShiftForRegister(ctx,old.id()))throw PosApiException.conflict("Close the register shift before changing operational or settlement settings.");
                if(action.equals("inactivate_pos_register")) {reason(c.reason());var r=register(old);after=registers(List.of(new Register(r.id(),r.warehouseId(),r.unitId(),r.businessId(),r.code(),r.name(),"INACTIVE",false,r.retainedCashAmount(),r.settlementRules(),r.notes(),r.version())));}
                else {
                    required(in.name(),160);if(in.retainedCashAmount()!=null)money(in.retainedCashAmount(),false);if(in.notes()!=null)bounded(in.notes(),4000);
                    String code=in.code()==null?(create?String.valueOf(registers.nextCode(ctx,wh).get("code")):old.code()):required(in.code(),64);
                    BigDecimal retained=in.retainedCashAmount()==null?(create?BigDecimal.ZERO:old.retainedCashAmount()):in.retainedCashAmount();
                    if(in.settlementCurrency()!=null)currency(in.settlementCurrency());
                    var accountIds=new TreeSet<Long>();if(in.settlementRules()!=null) {
                        if(in.settlementCurrency()==null||in.settlementRules().isEmpty()||in.settlementRules().size()>5)throw new IllegalArgumentException("A currency and bounded settlement policy are required.");
                        var methods=new HashSet<String>();for(var rule:in.settlementRules()) {
                            var method=PaymentMethod.valueOf(rule.paymentMethod());if(!methods.add(method.name()))throw new IllegalArgumentException("Settlement payment methods must be unique.");
                            if(method==PaymentMethod.CASH&&Boolean.FALSE.equals(rule.enabled()))throw new IllegalArgumentException("Cash must remain enabled.");
                            if(method!=PaymentMethod.CREDIT&&!Boolean.FALSE.equals(rule.enabled())&&rule.destinationPaymentAccountId()==null)throw new IllegalArgumentException("Enabled settlement method needs an eligible account.");
                            if(rule.destinationPaymentAccountId()!=null) {accountIds.add(id(rule.destinationPaymentAccountId()));treasury.requireEligibleAccount(ctx.companyId(),rule.destinationPaymentAccountId(),in.settlementCurrency(),wu,wb,method==PaymentMethod.CASH?Set.of("CASH","BANK"):method==PaymentMethod.CARD?Set.of("BANK","CREDIT_CARD"):Set.of("BANK"));}
                            if((method==PaymentMethod.CARD||method==PaymentMethod.WALLET)&&"IMMEDIATE".equals(rule.settlementTiming()))throw new IllegalArgumentException("Electronic payment requires deferred settlement.");
                        }
                    }
                    versions.put("accounts",hash(repository.accounts(ctx,accountIds,lock)));
                    var forecastRules=new ArrayList<com.indice.erp.pos.settlement.SettlementRuleResponse>(create?List.of():old.settlementRules());
                    if(in.settlementRules()!=null){var configured=policies.previewRequestedPolicy(ctx,create?null:old.id(),wu,wb,in.settlementCurrency(),in.settlementRules().stream().map(v->new SettlementRuleRequest(v.paymentMethod(),v.destinationPaymentAccountId(),v.settlementTiming(),v.enabled())).toList());forecastRules.removeIf(v->configured.stream().anyMatch(n->n.paymentMethod().equals(v.paymentMethod())&&n.currencyCode().equals(v.currencyCode())));forecastRules.addAll(configured);}
                    after=registers(List.of(new Register(create?null:old.id(),wh,wu,wb,code,in.name(),"ACTIVE",true,retained,List.copyOf(forecastRules),in.notes(),create?null:old.version())));
                }
            }
            case "open_pos_shift" -> {
                var in=c.opening();var r=registers.requireOperationalRegister(ctx,id(in.cashRegisterId()));if(lock)repository.lockRegister(ctx,r.id());requireNoPending(ctx,r.id(),lock);
                shiftValidator.validateOpen(r,shiftRows.hasBlockingShiftForRegister(ctx,r.id()),shiftRows.hasBlockingShiftForUser(ctx,ctx.userId()));
                var amount=in.openingAmount()==null?BigDecimal.ZERO:money(in.openingAmount(),false);String nativeCurrency=currency(in.currency());bounded(in.note(),4000);
                versions.put("register",hash(registers.get(ctx,r.id())));
                after=shifts(List.of(new Shift(null,r.id(),r.warehouseId(),r.unitId(),r.businessId(),"OPEN",amount,amount,null,null,nativeCurrency,null,null,in.note(),null,null)));
            }
            case "close_pos_shift","cancel_pos_shift" -> {
                var initial=requireShift(ctx,id(c.id()),false);if(lock)repository.lockRegister(ctx,initial.cashRegisterId());var s=requireShift(ctx,id(c.id()),lock);requireNoPending(ctx,s.cashRegisterId(),lock);before=shifts(List.of(shift(shifts.get(ctx,s.id()))));versions.put("shift",hash(s));
                if(action.equals("close_pos_shift")) {
                    shiftValidator.requireClosable(ctx,s);closingRows.requireNoPendingReturns(ctx,s.id());var sum=shifts.closingSummary(ctx,s.id());versions.put("closing",hash(sum));money(c.closing().countedCashAmount(),false);bounded(c.closing().note(),4000);
                    settlementEffects=settlementPreview.inspect(ctx,registers.requireOperationalRegister(ctx,s.cashRegisterId()),s.currencyCode(),closingRows.calculateAmounts(ctx,s),c.closing().countedCashAmount());
                    var v=before.shifts().getFirst();after=shifts(List.of(new Shift(v.id(),v.cashRegisterId(),v.warehouseId(),v.unitId(),v.businessId(),"CLOSED",v.openingAmount(),sum.expectedCashAmount(),c.closing().countedCashAmount(),c.closing().countedCashAmount().subtract(sum.expectedCashAmount()),v.currency(),v.openedAt(),null,v.openingNote(),c.closing().note(),v.version())));
                    before=new Records(before.registers(),before.shifts(),before.tickets(),before.cashMovements(),before.receipts(),before.returns(),List.of(sum));
                } else {reason(c.reason());shiftValidator.requireCancelable(ctx,s);shiftRows.requireNoActivityForCancellation(ctx,s.id());var v=before.shifts().getFirst();after=shifts(List.of(new Shift(v.id(),v.cashRegisterId(),v.warehouseId(),v.unitId(),v.businessId(),"CANCELLED",v.openingAmount(),v.expectedCashAmount(),null,null,v.currency(),v.openedAt(),null,v.openingNote(),c.reason(),v.version())));}
            }
            case "record_pos_cash_movement" -> {
                var in=c.cash();var s=requireShift(ctx,id(in.shiftId()),lock);var req=cashRequest(in);var command=cashMapper.toCommand(ctx,s,req);cashValidator.validate(ctx,s,command);
                var delta=cashValidator.delta(command);if(delta.signum()<0)shiftRows.requireNoPendingReturn(ctx,s.id());versions.put("shift",hash(s));
                var v=shift(shifts.get(ctx,s.id()));before=shifts(List.of(v));var updated=new Shift(v.id(),v.cashRegisterId(),v.warehouseId(),v.unitId(),v.businessId(),v.status(),v.openingAmount(),v.expectedCashAmount().add(delta),v.countedCashAmount(),v.overShortAmount(),v.currency(),v.openedAt(),v.closedAt(),v.openingNote(),v.closingNote(),v.version());
                after=new Records(List.of(),List.of(updated),List.of(),List.of(new CashMovement(null,s.id(),s.cashRegisterId(),in.type(),in.amount(),in.currency(),in.reason(),in.reference())),List.of(),List.of(),List.of());
            }
            case "complete_pos_checkout" -> {
                if(lock)repository.lockRegister(ctx,id(c.checkout().cashRegisterId()));var req=checkoutRequest(ctx,c.checkout(),lock,versions);requireNoPending(ctx,req.cashRegisterId(),lock);
                checkout=checkoutPreparation.prepare(ctx,req,false);var s=requireShift(ctx,checkout.shiftId(),lock);versions.put("shift",hash(s));versions.put("register",hash(registers.get(ctx,checkout.cashRegisterId())));stockVersions(ctx,checkout.warehouseId(),c.checkout().items().stream().map(CheckoutItem::productId).toList(),lock,versions);
                if(c.checkout().payments().stream().anyMatch(p->!Set.of("CASH","TRANSFER").contains(p.method())))throw new IllegalArgumentException("Use the durable terminal tools for card; credit and wallet retain their original owners.");
                sourceVersions(ctx,c.checkout(),lock,versions);versions.put("accounts",hash(repository.accounts(ctx,checkout.payments().stream().map(CheckoutPayment::paymentAccountId).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet()),lock)));
                before=shifts(List.of(shift(shifts.get(ctx,s.id()))));
            }
            case "receive_pos_inventory" -> {
                var in=c.receipt();if(lock)repository.lockRegister(ctx,id(in.cashRegisterId()));var s=requireShift(ctx,id(in.shiftId()),lock);if(lock)repository.lockProvider(ctx,id(in.providerId()));
                receipt=receipts.preview(ctx,receiptRequest(in,"assistant-preview"));versions.put("shift",hash(s));versions.put("register",hash(registers.get(ctx,id(in.cashRegisterId()))));stockVersions(ctx,s.warehouseId(),in.items().stream().map(ReceiptItem::productId).toList(),lock,versions);
                versions.put("accounts",hash(repository.accounts(ctx,in.paymentAccountId()==null?Set.of():Set.of(in.paymentAccountId()),lock)));before=shifts(List.of(shift(shifts.get(ctx,s.id()))));
            }
            case "reverse_pos_inventory_receipt" -> {
                admin(ctx);reason(c.reason());var found=findReceipt(ctx,id(c.id()),null);var s=requireShift(ctx,found.shiftId(),lock);if(!"POSTED".equals(found.status()))throw new IllegalArgumentException("Receipt is already reversed.");if(s.status()!=ShiftStatus.OPEN)throw PosApiException.conflict("Receipt reversal requires its original open shift.");
                versions.put("receipt",hash(found));versions.put("shift",hash(s));stockVersions(ctx,found.warehouseId(),found.items().stream().map(PaidInventoryReceiptDtos.ItemResponse::productId).toList(),lock,versions);before=receipts(List.of(receipt(found)));
                var v=receipt(found);after=receipts(List.of(new Receipt(v.id(),v.number(),v.cashRegisterId(),v.shiftId(),v.warehouseId(),v.providerId(),v.providerName(),v.method(),v.paymentAccountId(),v.currency(),v.subtotal(),v.tax(),v.total(),"REVERSED",v.reference(),c.reason(),v.items())));
            }
            case "prepare_pos_return" -> {
                admin(ctx);var in=c.returns();if(!Boolean.TRUE.equals(in.goodsReceived()))throw new IllegalArgumentException("Confirm receipt of all original goods.");reason(in.reason());long tid=id(in.ticketId());if(lock)repository.lockTicket(ctx,tid);var t=tickets.get(ctx,tid);var s=requireShift(ctx,t.ticket().shiftId(),lock);
                if(t.ticket().status()!=TicketStatus.COMPLETED||s.status()!=ShiftStatus.OPEN)throw PosApiException.conflict("Full return requires a completed ticket in its original open shift.");
                var existing=returnRows.activeForTicket(ctx,tid);if(existing!=null)throw new IllegalArgumentException("Recover the existing return before creating another.");
                if(t.payments().isEmpty()||t.payments().stream().anyMatch(p->p.status()!=PaymentStatus.CAPTURED||!t.ticket().currencyCode().equals(p.currencyCode())||p.amount().signum()<=0||Set.of(PaymentMethod.CREDIT,PaymentMethod.WALLET).contains(p.paymentMethod())))throw PosApiException.conflict("Original tender requires its financial owner reconciliation.");
                if(t.payments().stream().map(p->p.amount()).reduce(BigDecimal.ZERO,BigDecimal::add).compareTo(t.ticket().totalAmount())!=0)throw PosApiException.conflict("Original tender does not equal ticket total.");
                var cashTotal=t.payments().stream().filter(p->p.paymentMethod()==PaymentMethod.CASH).map(p->p.amount()).reduce(BigDecimal.ZERO,BigDecimal::add);if(s.expectedCashAmount().compareTo(cashTotal)<0)throw PosApiException.conflict("Insufficient original shift cash.");
                returnPlan=returns.inspect(ctx,tid,in.reason());versions.put("returnPlan",hash(returnPlan));stockVersions(ctx,t.ticket().warehouseId(),t.items().stream().map(v->v.productId()).filter(Objects::nonNull).toList(),lock,versions);
                versions.put("ticket",hash(t));versions.put("shift",hash(s));versions.put("returns",hash(repository.returns(ctx,s.id(),lock)));before=tickets(List.of(ticket(t)));after=returns(List.of(returnPlan.returns()));
            }
            case "confirm_pos_cash_return","cancel_pos_return" -> {
                admin(ctx);var r=returnRows.get(ctx,id(c.id()));var s=requireShift(ctx,r.shiftId(),lock);if(s.status()!=ShiftStatus.OPEN)throw PosApiException.conflict("Return requires its original open shift.");
                if(!"PREPARED".equals(r.status())&&!(action.equals("cancel_pos_return")&&!r.payments().isEmpty()&&r.payments().stream().allMatch(p->Set.of("FAILED","REJECTED").contains(p.status()))))throw new IllegalArgumentException("Return must remain prepared.");
                if(action.equals("confirm_pos_cash_return")) {var in=c.returnConfirmation();var provided=evidence(in);var expected=r.payments().stream().filter(p->p.paymentMethod().equals("TRANSFER")).map(PosReturnDtos.Payment::paymentId).collect(java.util.stream.Collectors.toSet());if(!expected.containsAll(provided.keySet()))throw new IllegalArgumentException("Transfer evidence must identify original transfer payments only.");if(r.payments().stream().anyMatch(p->!Set.of("CASH","TRANSFER").contains(p.paymentMethod())))throw PosApiException.conflict("Use the provider return owner for card refunds.");for(var p:r.payments()) {if(p.paymentMethod().equals("CASH")&&!Boolean.TRUE.equals(in.cashReturned()))throw new IllegalArgumentException("Confirm the actual cash refund.");if(p.paymentMethod().equals("TRANSFER")&&!evidence(in).containsKey(p.paymentId()))throw new IllegalArgumentException("Original transfer refund evidence required.");}}
                versions.put("return",hash(r));versions.put("shift",hash(s));before=returns(List.of(r));after=returns(List.of(new PosReturnDtos.Response(r.id(),r.ticketId(),r.ticketNumber(),r.shiftId(),action.equals("cancel_pos_return")?"CANCELLED":"COMPLETED",r.reason(),r.totalAmount(),r.currency(),null,r.payments())));
            }
            default -> throw new IllegalArgumentException("Unsupported POS action.");
        }
        return new Prepared(action,c,before,after,checkout,receipt,returnPlan,settlementEffects,Map.copyOf(versions));
    }
    @Transactional
    public Result execute(AuthSessionUser user,Prepared saved,String correlation) {
        var ctx=context(user);repository.lockCompany(ctx);Prepared current;
        try {current=prepare(user,saved.action(),saved.change(),true);}catch(IllegalArgumentException e){throw new Changed();}catch(PosApiException e){if(e.status().value()==400||e.status().value()==409)throw new Changed();throw e;}
        if(!canonical(current).equals(canonical(saved)))throw new Changed();var c=current.change();Records result;
        switch(current.action()) {
            case "create_pos_register" -> {var in=c.register();result=registers(List.of(register(registers.create(ctx,new CashRegisterCreateRequest(in.warehouseId(),current.after().registers().getFirst().code(),in.name(),CashRegisterStatus.ACTIVE,true,in.notes(),in.retainedCashAmount(),in.settlementCurrency(),rules(in),null,null)))));}
            case "update_pos_register","inactivate_pos_register" -> {var old=registers.get(ctx,id(c.id()));var v=current.after().registers().getFirst();var in=c.register();result=registers(List.of(register(registers.update(ctx,old.id(),new CashRegisterUpdateRequest(v.warehouseId(),v.code(),v.name(),CashRegisterStatus.valueOf(v.status()),v.active(),v.notes(),v.retainedCashAmount(),in==null?null:in.settlementCurrency(),in==null?null:rules(in),old.customFields(),old.metadata())))));}
            case "open_pos_shift" -> {var in=c.opening();result=shifts(List.of(shift(shifts.open(ctx,new ShiftOpenRequest(in.cashRegisterId(),in.openingAmount(),in.currency(),in.note(),null,null)))));}
            case "close_pos_shift" -> result=shifts(List.of(shift(shifts.close(ctx,c.id(),new ShiftCloseRequest(c.closing().countedCashAmount(),c.closing().note())))));
            case "cancel_pos_shift" -> result=shifts(List.of(shift(shifts.cancel(ctx,c.id(),new ShiftCancelRequest(c.reason())))));
            case "record_pos_cash_movement" -> result=movements(List.of(movement(cash.create(ctx,cashRequest(c.cash())))));
            case "complete_pos_checkout" -> {var paid=checkoutExecution.execute(ctx,correlation,checkoutRequest(ctx,c.checkout(),true,new TreeMap<>()));result=tickets(List.of(ticket(paid.ticket(),paid.items(),paid.payments())));}
            case "receive_pos_inventory" -> result=receipts(List.of(receipt(receipts.create(ctx,receiptRequest(c.receipt(),correlation)))));
            case "reverse_pos_inventory_receipt" -> result=receipts(List.of(receipt(receipts.reverse(ctx,c.id(),new PaidInventoryReceiptDtos.ReverseRequest(c.reason())))));
            case "prepare_pos_return" -> result=returns(List.of(returns.prepare(ctx,new PosReturnDtos.PrepareRequest(c.returns().ticketId(),c.returns().reason(),true,correlation))));
            case "confirm_pos_cash_return" -> result=returns(List.of(returns.confirmManual(ctx,c.id(),new PosReturnDtos.ConfirmRequest(Boolean.TRUE.equals(c.returnConfirmation().cashReturned()),evidence(c.returnConfirmation())))));
            case "cancel_pos_return" -> result=returns(List.of(returns.cancelPreparation(ctx,c.id())));
            default -> throw new IllegalArgumentException("Unsupported POS execution.");
        }
        return new Result(current.action(),correlation,result);
    }
    public void requireResultAccess(AuthSessionUser user,Result result) {var c=context(user);for(var r:result.records().registers())registers.get(c,id(r.id()));for(var s:result.records().shifts())shifts.get(c,id(s.id()));for(var t:result.records().tickets())tickets.get(c,id(t.id()));for(var m:result.records().cashMovements())shifts.get(c,id(m.shiftId()));for(var r:result.records().receipts())findReceipt(c,r.id(),r.shiftId());for(var r:result.records().returns())returnRows.get(c,r.id());}
    public PosContext context(AuthSessionUser user) {return access.resolveContext(user).orElseThrow(()->new SecurityException("Current POS module and assignment access required."));}
    public PosCheckoutRequest checkoutRequest(PosContext c,CheckoutInput in,boolean lock,Map<String,String> versions) {
        if(in==null||in.items()==null||in.items().isEmpty()||in.items().size()>100||in.payments()==null||in.payments().isEmpty()||in.payments().size()>10)throw new IllegalArgumentException("Bounded checkout lines and original payments required.");
        if(lock)in.items().stream().map(i->id(i.productId())).distinct().sorted().forEach(pid->repository.product(c,pid,true));
        var lines=new ArrayList<PosCheckoutItemRequest>();for(var item:in.items()) {long pid=id(item.productId());var rows=repository.product(c,pid,lock);if(rows.isEmpty())throw new NoSuchElementException("Product not found.");var p=rows.getFirst();versions.put("product:"+pid,hash(rows));
            if(!"active".equalsIgnoreCase(String.valueOf(p.get("status"))))throw new IllegalArgumentException("Product must be active.");quantity(item.quantity());money(item.unitPrice(),false);money(item.discountAmount()==null?BigDecimal.ZERO:item.discountAmount(),false);money(item.taxAmount()==null?BigDecimal.ZERO:item.taxAmount(),false);
            lines.add(new PosCheckoutItemRequest(pid,String.valueOf(p.get("name")),Objects.toString(p.get("sku"),null),String.valueOf(p.get("type")),item.quantity(),item.unitPrice(),item.discountAmount(),item.taxAmount(),item.discountRuleId()));}
        var payments=in.payments().stream().map(p->{money(p.amount(),true);bounded(p.reference(),300);return new PosCheckoutPaymentRequest(p.method(),p.paymentAccountId(),p.amount(),p.reference());}).toList();bounded(in.notes(),4000);
        return new PosCheckoutRequest(id(in.cashRegisterId()),in.customerId(),in.preticketId(),in.restaurantOrderId(),currency(in.currency()),lines,payments,in.notes());
    }
    public CheckoutAssistantPreparation.Draft prepareTerminalCheckout(PosContext ctx,CheckoutInput input,boolean lock,Map<String,String> versions) {
        if(lock)repository.lockRegister(ctx,id(input.cashRegisterId()));requireNoPending(ctx,id(input.cashRegisterId()),lock);
        var request=checkoutRequest(ctx,input,lock,versions);var draft=checkoutPreparation.prepare(ctx,request,true);
        versions.put("shift",hash(requireShift(ctx,draft.shiftId(),lock)));versions.put("register",hash(registers.get(ctx,draft.cashRegisterId())));
        stockVersions(ctx,draft.warehouseId(),input.items().stream().map(CheckoutItem::productId).toList(),lock,versions);sourceVersions(ctx,input,lock,versions);
        versions.put("accounts",hash(repository.accounts(ctx,draft.payments().stream().map(CheckoutPayment::paymentAccountId).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet()),lock)));
        return draft;
    }
    private PaidInventoryReceiptDtos.CreateRequest receiptRequest(ReceiptInput in,String key) {if(in==null||in.items()==null||in.items().isEmpty()||in.items().size()>100)throw new IllegalArgumentException("Bounded receipt items required.");bounded(in.notes(),4000);bounded(in.reference(),160);return new PaidInventoryReceiptDtos.CreateRequest(key,id(in.cashRegisterId()),id(in.shiftId()),id(in.providerId()),currency(in.currency()),in.paymentMethod(),in.paymentAccountId(),in.reference(),in.notes(),in.items().stream().map(i->new PaidInventoryReceiptDtos.ItemRequest(new PaidInventoryReceiptDtos.ProductInput(id(i.productId()),null,null,null,null,null,i.enableInventory()),i.quantity(),i.unitCost(),i.taxRate(),i.taxIncluded(),i.taxProfileId(),i.taxName())).toList());}
    private CashMovementCreateRequest cashRequest(CashInput in) {if(in==null)throw new IllegalArgumentException("Cash movement required.");bounded(in.reason(),500);bounded(in.reference(),300);return new CashMovementCreateRequest(id(in.shiftId()),id(in.cashRegisterId()),in.type(),in.amount(),currency(in.currency()),required(in.reason(),500),in.reference(),null);}
    private void requireNoPending(PosContext ctx,long register,boolean lock){if(lock)terminalGuard.assertNoPending(ctx,register);else terminalGuard.inspectNoPending(ctx,register);}
    private ShiftRecord requireShift(PosContext c,long id,boolean lock) {return (lock?shiftRows.findByIdForUpdate(c,id):shiftRows.findById(c,id)).orElseThrow(()->new NoSuchElementException("Shift not found."));}
    private PaidInventoryReceiptDtos.ReceiptResponse findReceipt(PosContext c,long id,Long shiftId) {var found=receipts.get(c,id);if(shiftId!=null&&found.shiftId()!=shiftId)throw new NoSuchElementException("Receipt not in the requested shift.");return found;}
    private void stockVersions(PosContext c,Long warehouse,Collection<Long> ids,boolean lock,Map<String,String> versions) {var products=new TreeSet<>(ids);if(warehouse!=null)versions.put("warehouse",hash(repository.warehouse(c,warehouse,lock)));for(long id:products)versions.put("product:"+id,hash(repository.product(c,id,lock)));if(warehouse!=null)versions.put("balances",hash(repository.balances(c,warehouse,products,lock)));}
    private void sourceVersions(PosContext c,CheckoutInput in,boolean lock,Map<String,String> versions) {if(in.preticketId()!=null)versions.put("preticket",hash(repository.sourceOrder(c,"preticket",id(in.preticketId()),lock)));if(in.restaurantOrderId()!=null)versions.put("restaurant",hash(repository.sourceOrder(c,"restaurant",id(in.restaurantOrderId()),lock)));}
    private List<SettlementRuleRequest> rules(RegisterInput in) {return in.settlementRules()==null?null:in.settlementRules().stream().map(r->new SettlementRuleRequest(r.paymentMethod(),r.destinationPaymentAccountId(),r.settlementTiming(),r.enabled())).toList();}
    private static Map<Long,String> evidence(ReturnConfirmation in) {var map=new LinkedHashMap<Long,String>();if(in.transferReferences()!=null) {if(in.transferReferences().size()>100)throw new IllegalArgumentException("Too many transfer references.");for(var e:in.transferReferences()){var reference=required(e.reference(),200);if(reference.length()<5)throw new IllegalArgumentException("Transfer evidence requires at least five characters.");if(map.put(id(e.paymentId()),reference)!=null)throw new IllegalArgumentException("Duplicate transfer evidence.");}}return Map.copyOf(map);}
    private void shape(String action,Change c) {
        String field=switch(action) {case "create_pos_register","update_pos_register"->"register";case "open_pos_shift"->"opening";case "close_pos_shift"->"closing";case "record_pos_cash_movement"->"cash";case "complete_pos_checkout"->"checkout";case "receive_pos_inventory"->"receipt";case "prepare_pos_return"->"returns";case "confirm_pos_cash_return"->"returnConfirmation";default->null;};
        var args=new LinkedHashMap<String,Object>();args.put("register",c.register());args.put("opening",c.opening());args.put("closing",c.closing());args.put("cash",c.cash());args.put("checkout",c.checkout());args.put("receipt",c.receipt());args.put("returns",c.returns());args.put("returnConfirmation",c.returnConfirmation());
        for(var e:args.entrySet())if(e.getValue()!=null&&!e.getKey().equals(field))throw new IllegalArgumentException("Unexpected POS action input: "+e.getKey());if(field!=null&&args.get(field)==null)throw new IllegalArgumentException("Required POS action input: "+field);
        boolean identified=Set.of("update_pos_register","inactivate_pos_register","close_pos_shift","cancel_pos_shift","reverse_pos_inventory_receipt","confirm_pos_cash_return","cancel_pos_return").contains(action);if(identified)id(c.id());else if(c.id()!=null)throw new IllegalArgumentException("Unexpected workflow ID.");
        if(c.reason()!=null&&!Set.of("inactivate_pos_register","cancel_pos_shift","reverse_pos_inventory_receipt").contains(action))throw new IllegalArgumentException("Unexpected lifecycle reason.");
    }
    private Page page(AuthSessionUser user,PosContext ctx,String tool,Query q,Records records) {int limit=q.limit()==null?20:q.limit();if(limit<1||limit>100||(q.query()!=null&&q.query().length()>120))throw new IllegalArgumentException("Invalid POS page.");String binding=hash(Arrays.asList(tool,user.companyId(),ctx.scope(),q.id(),q.shiftId(),q.cashRegisterId(),q.currency(),q.query(),q.requestKey(),limit));int offset=offset(q.cursor(),binding);int count=size(records);if(offset>count)throw new IllegalArgumentException("Cursor no longer valid.");var page=new Records(slice(records.registers(),offset,limit),slice(records.shifts(),offset,limit),slice(records.tickets(),offset,limit),slice(records.cashMovements(),offset,limit),slice(records.receipts(),offset,limit),slice(records.returns(),offset,limit),slice(records.closings(),offset,limit));int end=offset+size(page);return new Page(page,count,end<count,end<count?cursor(end,binding):null,ctx.scope().type().name());}
    private static int size(Records r) {return r.registers().size()+r.shifts().size()+r.tickets().size()+r.cashMovements().size()+r.receipts().size()+r.returns().size()+r.closings().size();}
    private static <T> List<T> slice(List<T> list,int offset,int limit) {return list.isEmpty()?List.of():List.copyOf(list.subList(Math.min(offset,list.size()),Math.min(offset+limit,list.size())));}
    private <T> List<T> items(Map<String,Object> data,Class<T> type) {Object value=data.get("items");return value instanceof List<?> rows?rows.stream().map(r->mapper.convertValue(r,type)).toList():List.of();}
    private static Records registers(List<Register> r) {return new Records(r,List.of(),List.of(),List.of(),List.of(),List.of(),List.of());}private static Records shifts(List<Shift> r) {return new Records(List.of(),r,List.of(),List.of(),List.of(),List.of(),List.of());}private static Records tickets(List<Ticket> r) {return new Records(List.of(),List.of(),r,List.of(),List.of(),List.of(),List.of());}private static Records movements(List<CashMovement> r) {return new Records(List.of(),List.of(),List.of(),r,List.of(),List.of(),List.of());}private static Records receipts(List<Receipt> r) {return new Records(List.of(),List.of(),List.of(),List.of(),r,List.of(),List.of());}private static Records returns(List<PosReturnDtos.Response> r) {return new Records(List.of(),List.of(),List.of(),List.of(),List.of(),r,List.of());}private static Records closings(List<com.indice.erp.pos.cashclosing.dto.ShiftClosingSummaryResponse> r) {return new Records(List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),r);}
    private static void admin(PosContext c) {if(!c.canManageOtherUsers())throw new SecurityException("Current POS administration role required.");}
    private static long id(Long id) {if(id==null||id<1)throw new IllegalArgumentException("Positive POS workflow ID required.");return id;}
    private static Long number(Object value) {return value==null?null:Long.valueOf(value.toString());}
    private static String bounded(String value,int max) {if(value!=null&&value.length()>max)throw new IllegalArgumentException("Text exceeds accepted length.");return value;}
    private static String required(String value,int max) {if(value==null||value.isBlank())throw new IllegalArgumentException("Required POS text is missing.");return bounded(value.trim(),max);}
    private static void reason(String value) {if(required(value,500).length()<5)throw new IllegalArgumentException("Reason requires at least five characters.");}
    private static String currency(String value) {String code=required(value,3).toUpperCase(Locale.ROOT);java.util.Currency.getInstance(code);return code;}
    private static BigDecimal money(BigDecimal value,boolean positive) {if(value==null||value.signum()<0||(positive&&value.signum()==0)||value.stripTrailingZeros().scale()>2||value.precision()-value.scale()>13)throw new IllegalArgumentException("Invalid native money amount.");return value;}
    private static void quantity(BigDecimal value) {if(value==null||value.signum()<=0||value.stripTrailingZeros().scale()>3)throw new IllegalArgumentException("Invalid stock quantity.");}
    private String hash(Object value) {try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(value)));}catch(Exception e){throw new IllegalStateException("POS snapshot unavailable.",e);}}
    private com.fasterxml.jackson.databind.JsonNode canonical(Object value) {try{return mapper.readerFor(com.fasterxml.jackson.databind.JsonNode.class).with(com.fasterxml.jackson.databind.DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readValue(mapper.writeValueAsBytes(value));}catch(Exception e){throw new IllegalStateException("Cannot compare POS confirmation.",e);}}
    private static String cursor(int offset,String binding) {return Base64.getUrlEncoder().withoutPadding().encodeToString((offset+":"+binding).getBytes(StandardCharsets.UTF_8));}
    private static int offset(String value,String binding) {if(value==null)return 0;try {var pieces=new String(Base64.getUrlDecoder().decode(value),StandardCharsets.UTF_8).split(":",2);int offset=Integer.parseInt(pieces[0]);if(offset<0||!pieces[1].equals(binding))throw new IllegalArgumentException();return offset;}catch(Exception e){throw new IllegalArgumentException("Invalid POS cursor.");}}
}
