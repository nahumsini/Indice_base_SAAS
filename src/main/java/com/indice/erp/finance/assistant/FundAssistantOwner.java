package com.indice.erp.finance.assistant;

import static com.indice.erp.finance.assistant.FinanceAssistantContracts.*;
import static com.indice.erp.finance.assistant.FinanceAssistantSupport.*;
import com.indice.erp.finance.pettycash.*;
import com.indice.erp.finance.pettycash.dto.*;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Funds owns custody, receipt validation and signed statement resolution. */
@Service
@RequiredArgsConstructor
public class FundAssistantOwner {
    private final FinanceAssistantSupport support;
    private final PettyCashService funds;
    private final PettyCashBulkActionService bulk;
    private final PettyCashAttachmentService attachments;
    private final com.indice.erp.finance.FinanceAccessService access;

    public Records read(FinanceContext ctx,String kind,Long id,Long fundId) {
        if(kind.equals("type_change"))return Records.of(kind,funds.assistantTypeChanges(ctx,id(fundId)));
        if(kind.equals("responsible"))return Records.of(kind,access.assistantResponsibles(ctx));
        var snapshot=funds.assistantSnapshot(ctx);
        if(fundId!=null)fund(snapshot,fundId);
        return switch(kind) {
            case "fund"->Records.of(kind,snapshot.funds().stream().filter(v->id==null||v.id().equals(id)).filter(v->fundId==null||v.id().equals(fundId)).map(Fund::from).toList());
            case "statement"->Records.of(kind,snapshot.statements().stream().filter(v->id==null||v.id().equals(id)).filter(v->fundId==null||v.pettyCashFundId().equals(fundId)).map(Statement::from).toList());
            case "receipt"->Records.of(kind,snapshot.settlementLines().stream().filter(v->id==null||v.id().equals(id)).filter(v->fundId==null||v.pettyCashFundId().equals(fundId)).map(Receipt::from).toList());
            case "movement"->Records.of(kind,snapshot.movements().stream().filter(v->id==null||v.id().equals(id)).filter(v->fundId==null||v.pettyCashFundId().equals(fundId)).map(Movement::from).toList());
            default->throw new IllegalArgumentException("Unknown fund record kind.");
        };
    }
    private PettyCashFundResponse fund(PettyCashWorkspaceResponse snapshot,long id) { return snapshot.funds().stream().filter(v->v.id()==id).findFirst().orElseThrow(()->new NoSuchElementException("Fund not found.")); }
    private PettyCashStatementResponse statement(PettyCashWorkspaceResponse snapshot,long fund,long id) { return snapshot.statements().stream().filter(v->v.id()==id&&v.pettyCashFundId()==fund).findFirst().orElseThrow(()->new NoSuchElementException("Statement not found.")); }
    private PettyCashSettlementLineResponse receipt(PettyCashWorkspaceResponse snapshot,long fund,long id) { return snapshot.settlementLines().stream().filter(v->v.id()==id&&v.pettyCashFundId()==fund).findFirst().orElseThrow(()->new NoSuchElementException("Receipt not found.")); }
    private <T> T configuration(FundData data,PettyCashFundResponse old,Class<T> type,boolean closing) {
        if(data==null&&old==null)throw new IllegalArgumentException("Fund configuration required.");
        return support.request(data==null?old:data,type,n->{
            if(old!=null){var prior=support.node(old);for(var key:List.of("customFields","metadata","fundingSourcePaymentAccountId","fundingSourceName","externalOwnerReference","kioskEnabled","kioskUsesUniversalPin","kioskAccessUrl","kioskPublicToken","fundingMethods","spendingMethods","status"))n.set(key,prior.get(key));}
            else{n.put("status","OPEN");n.put("kioskEnabled",false);n.put("currentBalanceAmount",BigDecimal.ZERO);}
            n.remove(List.of("id","companyId","createdByUserId","updatedByUserId","createdAt","updatedAt","deletedAt","version","pendingTypeChangeId","pendingFundType","pendingTypeEffectiveDate","externalIdentityPending","budgetLinkPending"));
            if(old!=null)n.remove("currentBalanceAmount");
            if(closing)n.put("status","CLOSED");
        });
    }
    private UpdatePettyCashFundRequest initialKioskConfiguration(PettyCashFundResponse fund) {
        return support.request(fund,UpdatePettyCashFundRequest.class,n->{
            for(var field:List.of("id","companyId","currentBalanceAmount","createdByUserId","updatedByUserId","createdAt","updatedAt","deletedAt","version","pendingTypeChangeId","pendingFundType","pendingTypeEffectiveDate","externalIdentityPending","budgetLinkPending"))n.remove(field);
            n.put("kioskEnabled",true);
        });
    }
    public CreatePettyCashMovementRequest depositRequest(Change c,PettyCashFundResponse fund) {
        var d=c.deposit();if(d==null)throw new IllegalArgumentException("Deposit data required.");money(d.amount(),true);
        if((d.sourcePaymentAccountId()!=null)==(d.externalSourceName()!=null&&!d.externalSourceName().isBlank()))throw new IllegalArgumentException("Choose exactly one source account or named external source.");
        if(d.externalSourceName()!=null)text(d.externalSourceName(),1,180);
        return support.request(null,CreatePettyCashMovementRequest.class,n->{
            if(c.statementId()!=null)n.put("pettyCashStatementId",id(c.statementId()));
            if(d.sourcePaymentAccountId()!=null)n.put("fromPaymentAccountId",id(d.sourcePaymentAccountId()));
            n.put("toPaymentAccountId",fund.paymentAccountId());n.put("type","ADDITIONAL_DEPOSIT");n.put("amount",d.amount());n.put("currencyCode",d.currencyCode());
            if(d.movementDate()!=null)n.put("movementDate",d.movementDate().toString());
            n.put("externalSourceName",d.externalSourceName());n.put("entryCategory","ADDITIONAL_FUNDING");n.put("statementDescription",d.reference());n.put("reference",d.reference());
            n.put("fundingMethod",d.sourcePaymentAccountId()==null?"EXTERNAL":"INTERNAL_TRANSFER");
        });
    }
    public CreatePettyCashSettlementLineRequest receiptRequest(Change c) {
        var d=c.receipt();if(d==null)throw new IllegalArgumentException("Receipt data required.");money(d.totalAmount(),true);
        var tax=d.taxAmount()==null?BigDecimal.ZERO:money(d.taxAmount(),false);var subtotal=d.subtotalAmount()==null?d.totalAmount().subtract(tax):money(d.subtotalAmount(),false);
        if(subtotal.signum()<0||subtotal.add(tax).compareTo(d.totalAmount())!=0)throw new IllegalArgumentException("Receipt subtotal plus tax must equal its total.");
        return support.request(d,CreatePettyCashSettlementLineRequest.class,n->{if(c.statementId()!=null)n.put("pettyCashStatementId",id(c.statementId()));n.put("subtotalAmount",subtotal);n.put("taxAmount",tax);n.put("attachmentCount",0);n.put("status","DRAFT");});
    }
    private ClosePettyCashStatementRequest closeRequest(Change c,PettyCashStatementResponse statement) {
        var data=c.closing();if(data==null||data.action()==null)throw new IllegalArgumentException("Statement closing decision required.");
        var balance=statement.declaredClosingBalanceAmount()==null?BigDecimal.ZERO:statement.declaredClosingBalanceAmount();
        if(data.action()==PettyCashStatementCloseAction.RETURN_TO_SOURCE&&(data.destinationPaymentAccountId()!=null)==(data.externalDestinationName()!=null&&!data.externalDestinationName().isBlank()))throw new IllegalArgumentException("Choose exactly one return destination.");
        if(data.action()!=PettyCashStatementCloseAction.RETURN_TO_SOURCE&&(data.destinationPaymentAccountId()!=null||data.externalDestinationName()!=null))throw new IllegalArgumentException("A destination is only used for a return.");
        return new ClosePettyCashStatementRequest(data.action(),balance.abs(),data.closeDate(),data.reference(),balance,data.destinationPaymentAccountId(),data.externalDestinationName());
    }
    private PettyCashBulkActionRequest classify(Change c,PettyCashSettlementLineResponse line,boolean reverse) {
        var action=reverse?PettyCashBulkActionRequest.Action.DELETE:PettyCashBulkActionRequest.Action.valueOf(text(c.classification(),1,40));
        if(!reverse&&action==PettyCashBulkActionRequest.Action.DELETE)throw new IllegalArgumentException("Use the explicit receipt reversal action.");
        List<PettyCashBulkActionRequest.Selection> rows;
        if(line!=null)rows=List.of(new PettyCashBulkActionRequest.Selection(line.id(),line.version()));
        else{selections(c.rows());rows=c.rows().stream().map(v->new PettyCashBulkActionRequest.Selection(v.id(),v.expectedVersion())).toList();}
        if(reverse)text(c.reason(),1,500);
        return new PettyCashBulkActionRequest(line==null?id(c.statementId()):line.pettyCashStatementId(),action,rows,c.targetId(),c.reason());
    }
    public Prepared prepare(FinanceContext ctx,FinanceAssistantTools.Spec s,Change c) {
        if(s.operation().equals("create")){support.shape(c,"fund");var request=configuration(c.fund(),null,CreatePettyCashFundRequest.class,false);funds.validateAssistantCreate(ctx,request);
            return new Prepared(s.name(),c,new Records(),List.of(effect(c,request.currencyCode(),BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO,false,false,false,"Crea el fondo con saldo cero, responsable y cuenta de custodia revisados.","Creates the fund with zero balance, reviewed responsible person and custody account.")),support.hash(Arrays.asList(c,support.today(ctx))));}
        Long fundId=s.kind().equals("fund")&&!s.operation().equals("deposit")?c.id():c.fundId();id(fundId);
        var snapshot=funds.assistantSnapshot(ctx);var fund=fund(snapshot,fundId);var before=Records.of("fund",List.of(Fund.from(fund)));Object evidence=snapshotForFund(snapshot,fundId);
        BigDecimal amount=BigDecimal.ZERO,delta=BigDecimal.ZERO,treasury=BigDecimal.ZERO;boolean expense=false,payment=false,payroll=false;
        String es="Aplica la operación revisada y conserva la custodia y el historial del fondo.",en="Applies the reviewed operation and preserves fund custody and history.";
        if(s.kind().equals("fund")){
            switch(s.operation()) {
                case "update"->{support.shape(c,"id","fund");funds.validateAssistantUpdate(ctx,fundId,configuration(c.fund(),fund,UpdatePettyCashFundRequest.class,false));}
                case "close"->{support.shape(c,"id","reason");text(c.reason(),1,500);if(fund.currentBalanceAmount().signum()!=0||fund.pendingTypeChangeId()!=null||snapshot.statements().stream().filter(v->v.pettyCashFundId().equals(fundId)).anyMatch(v->!terminal(v.status())))throw new IllegalArgumentException("Resolve the balance and explicitly close every statement before closing the fund.");funds.validateAssistantUpdate(ctx,fundId,configuration(null,fund,UpdatePettyCashFundRequest.class,true));}
                case "schedule_type_change"->{support.shape(c,"id","fund","effectiveDate","reason");var request=new ChangePettyCashFundTypeRequest(configuration(c.fund(),fund,UpdatePettyCashFundRequest.class,false),c.effectiveDate(),c.reason(),fund.version());funds.validateAssistantTypeChange(ctx,fundId,request);evidence=Arrays.asList(evidence,funds.assistantTypeChanges(ctx,fundId));es="Programa una etapa de clasificación que conserva saldo, moneda, cuenta e historia anteriores.";en="Schedules a classification stage preserving the balance, currency, account and prior history.";}
                case "cancel_type_change"->{support.shape(c,"id","targetId","reason");id(c.targetId());if(funds.assistantTypeChanges(ctx,fundId).stream().noneMatch(v->v.id().equals(c.targetId())&&"SCHEDULED".equals(v.status())))throw new IllegalArgumentException("Only a scheduled type change can be cancelled.");evidence=Arrays.asList(evidence,funds.assistantTypeChanges(ctx,fundId));}
                case "deposit"->{support.shape(c,"fundId","statementId","deposit");var request=depositRequest(c,fund);funds.validateAssistantMovement(ctx,fundId,request);amount=request.amount();delta=amount;treasury=amount;es="Registra una entrada desde el origen revisado y aumenta la custodia una sola vez.";en="Records one deposit from the reviewed source and increases custody once.";}
                case "disable_kiosk","enable_kiosk","revoke_kiosk"->{support.shape(c,"id","reason");text(c.reason(),1,500);if(!Boolean.TRUE.equals(fund.kioskEnabled())&&s.operation().equals("disable_kiosk"))throw new IllegalArgumentException("The fund kiosk is already disabled.");
                    if(s.operation().equals("enable_kiosk")&&(fund.kioskPublicToken()==null||fund.kioskPublicToken().isBlank()))funds.validateAssistantUpdate(ctx,fundId,initialKioskConfiguration(fund));
                    else if(fund.kioskPublicToken()==null||fund.kioskPublicToken().isBlank())throw new IllegalArgumentException("The fund does not have a kiosk to transition.");}
                default->throw new IllegalArgumentException("Unsupported fund operation.");
            }
        }else if(s.kind().equals("receipt")) {
            if(s.operation().equals("capture")){support.shape(c,"fundId","statementId","receipt");var request=receiptRequest(c);funds.validateAssistantReceipt(ctx,fundId,request);amount=request.totalAmount();delta=amount.negate();treasury=delta;es="Captura la salida y descuenta el importe de la custodia una sola vez; queda pendiente de autorización.";en="Captures the outflow and deducts custody once; authorization remains pending.";}
            else if(s.operation().equals("bulk_classify")){support.shape(c,"fundId","statementId","rows","classification","targetId","reason");bulk.validateAssistant(ctx,fundId,classify(c,null,false));before=read(ctx,"receipt",null,fundId);}
            else {id(c.id());var line=receipt(snapshot,fundId,c.id());var cut=statement(snapshot,fundId,line.pettyCashStatementId());
                before=Records.of("receipt",List.of(Receipt.from(line)));if(!s.operation().equals("remove_attachment")&&terminal(cut.status()))throw new IllegalArgumentException("Closed statements preserve their receipts.");amount=line.totalAmount();
                switch(s.operation()) {
                    case "authorize"->{support.shape(c,"fundId","id");funds.validateAssistantAuthorization(ctx,fundId,line.id());expense=cut.fundTypeSnapshot()==PettyCashFundType.INTERNAL_COMPANY;payment=expense;
                        es=expense?"Autoriza el comprobante y crea el gasto pagado de empresa y su impacto presupuestal, conservando la salida ya registrada.":"Valida el comprobante en el estado de cuenta del tercero y conserva su tratamiento externo.";
                        en=expense?"Authorizes the receipt and creates its paid company expense and budget impact, preserving the recorded outflow.":"Validates the receipt in the third-party statement and preserves its external treatment.";}
                    case "reject"->{support.shape(c,"fundId","id","reason");text(c.reason(),1,500);if(!Set.of(PettyCashSettlementLineStatus.DRAFT,PettyCashSettlementLineStatus.RECEIPT_ATTACHED,PettyCashSettlementLineStatus.VALIDATED).contains(line.status())||line.status()==PettyCashSettlementLineStatus.VALIDATED&&cut.fundTypeSnapshot()==PettyCashFundType.EXTERNAL_MANAGED)throw new IllegalArgumentException("Receipt is not awaiting rejection.");
                        es="Rechaza el comprobante para revisión; la salida de dinero registrada conserva su historial.";en="Rejects the receipt for review; the recorded outflow retains its history.";}
                    case "reverse"->{support.shape(c,"fundId","id","reason");bulk.validateAssistantReversal(ctx,fundId,classify(c,line,true));delta=amount;treasury=amount;es="Revierte una sola vez la salida y el gasto vinculado permitido; actualiza los cortes abiertos posteriores.";en="Reverses the outflow and permitted linked expense once and updates later open statements.";}
                    case "classify"->{support.shape(c,"fundId","id","classification","targetId","reason");bulk.validateAssistant(ctx,fundId,classify(c,line,false));}
                    case "remove_attachment"->{attachments.validateAssistantWrite(ctx,fundId,line.id());support.shape(c,"fundId","id","attachmentId");id(c.attachmentId());if(attachments.references(ctx,fundId,line.id()).stream().noneMatch(v->v.id()==c.attachmentId()))throw new NoSuchElementException("Attachment not found.");evidence=Arrays.asList(evidence,attachments.references(ctx,fundId,line.id()));}
                    default->throw new IllegalArgumentException("Unsupported receipt operation.");
                }
            }
        }else if(s.kind().equals("statement")) {
            support.shape(c,"fundId","statementId","closing");var cut=statement(snapshot,fundId,id(c.statementId()));var request=closeRequest(c,cut);funds.validateAssistantClose(ctx,fundId,cut.id(),request);
            before=Records.of("statement",List.of(Statement.from(cut)));amount=request.expectedClosingBalance().abs();payroll=request.action()==PettyCashStatementCloseAction.CHARGE_EMPLOYEE;
            if(Set.of(PettyCashStatementCloseAction.RETURN_TO_SOURCE,PettyCashStatementCloseAction.FORGIVE_SHORTAGE,PettyCashStatementCloseAction.FORGIVE_SURPLUS,PettyCashStatementCloseAction.CHARGE_EMPLOYEE).contains(request.action())){delta=request.expectedClosingBalance().negate();treasury=delta;}
            es=payroll?"Cierra el corte y envía una deducción al propietario de RH para su revisión y aplicación en nómina.":request.action()==PettyCashStatementCloseAction.CARRY_FORWARD?"Cierra el corte y conserva el saldo con su signo como apertura del siguiente corte.":"Cierra el corte mediante la devolución o ajuste explícitamente revisado.";
            en=payroll?"Closes the statement and queues a deduction for HR review and payroll application.":request.action()==PettyCashStatementCloseAction.CARRY_FORWARD?"Closes the statement and carries the signed balance into the next opening.":"Closes the statement using the explicitly reviewed return or adjustment.";
        }
        return new Prepared(s.name(),c,before,List.of(effect(c,fund.currencyCode(),amount,treasury,delta,expense,payment,payroll,es,en)),support.hash(Arrays.asList(evidence,c,support.today(ctx))));
    }
    static boolean terminal(PettyCashStatementStatus status) { return Set.of(PettyCashStatementStatus.CLOSED,PettyCashStatementStatus.TRANSFERRED_TO_NEXT_CUT,PettyCashStatementStatus.FORGIVEN_SHORTAGE,PettyCashStatementStatus.CHARGED_TO_EMPLOYEE).contains(status); }
    private Object snapshotForFund(PettyCashWorkspaceResponse s,long id) {return Arrays.asList(fund(s,id),s.statements().stream().filter(v->v.pettyCashFundId()==id).toList(),s.movements().stream().filter(v->v.pettyCashFundId()==id).toList(),s.settlementLines().stream().filter(v->v.pettyCashFundId()==id).toList());}
    public Records execute(FinanceContext ctx,FinanceAssistantTools.Spec s,Change c) {
        if(s.operation().equals("create"))return Records.of("fund",List.of(Fund.from(funds.createFund(ctx,configuration(c.fund(),null,CreatePettyCashFundRequest.class,false)))));
        long fundId=id(s.kind().equals("fund")&&!s.operation().equals("deposit")?c.id():c.fundId());var snapshot=funds.assistantSnapshot(ctx);var fund=fund(snapshot,fundId);
        if(s.kind().equals("fund")) {
            switch(s.operation()) {
                case "update","close"->funds.updateFund(ctx,fundId,configuration(c.fund(),fund,UpdatePettyCashFundRequest.class,s.operation().equals("close")));
                case "schedule_type_change"->{return Records.of("type_change",funds.assistantScheduleTypeChange(ctx,fundId,new ChangePettyCashFundTypeRequest(configuration(c.fund(),fund,UpdatePettyCashFundRequest.class,false),c.effectiveDate(),c.reason(),fund.version())));}
                case "cancel_type_change"->{return Records.of("type_change",funds.assistantCancelTypeChange(ctx,fundId,c.targetId()));}
                case "deposit"->funds.createMovement(ctx,fundId,depositRequest(c,fund));
                case "disable_kiosk"->funds.transitionKiosk(ctx,fundId,KioskDefinitionStatus.DISABLED,c.reason());
                case "enable_kiosk"->{if(fund.kioskPublicToken()==null||fund.kioskPublicToken().isBlank())funds.updateFund(ctx,fundId,initialKioskConfiguration(fund));else funds.transitionKiosk(ctx,fundId,KioskDefinitionStatus.ACTIVE,c.reason());}
                case "revoke_kiosk"->funds.transitionKiosk(ctx,fundId,KioskDefinitionStatus.REVOKED,c.reason());
                default->throw new IllegalArgumentException("Unsupported fund action.");
            }
        }else if(s.kind().equals("statement"))funds.closeStatement(ctx,fundId,id(c.statementId()),closeRequest(c,statement(snapshot,fundId,c.statementId())));
        else switch(s.operation()) {
            case "capture"->funds.createSettlementLine(ctx,fundId,receiptRequest(c));
            case "authorize"->funds.createExpenseFromSettlementLine(ctx,fundId,c.id());case "reject"->funds.rejectSettlementLine(ctx,fundId,c.id());
            case "reverse"->bulk.applyAssistantReversal(ctx,fundId,classify(c,receipt(snapshot,fundId,c.id()),true));
            case "classify"->bulk.apply(ctx,fundId,classify(c,receipt(snapshot,fundId,c.id()),false));
            case "bulk_classify"->bulk.apply(ctx,fundId,classify(c,null,false));
            case "remove_attachment"->attachments.deleteAttachment(ctx,fundId,c.id(),c.attachmentId());default->throw new IllegalArgumentException("Unsupported receipt action.");
        }
        var current=funds.assistantSnapshot(ctx);
        return new Records(List.of(),List.of(),current.funds().stream().filter(v->v.id()==fundId).map(Fund::from).toList(),
            current.statements().stream().filter(v->v.pettyCashFundId()==fundId&&snapshot.statements().stream().noneMatch(old->old.id().equals(v.id())&&old.equals(v))).map(Statement::from).toList(),current.settlementLines().stream().filter(v->v.pettyCashFundId()==fundId&&snapshot.settlementLines().stream().noneMatch(old->old.id().equals(v.id())&&old.equals(v))).map(Receipt::from).toList(),
            current.movements().stream().filter(v->v.pettyCashFundId()==fundId&&snapshot.movements().stream().noneMatch(old->old.id().equals(v.id())&&old.equals(v))).map(Movement::from).toList(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of());
    }
}
