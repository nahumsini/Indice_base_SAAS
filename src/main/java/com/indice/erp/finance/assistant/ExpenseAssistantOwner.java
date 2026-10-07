package com.indice.erp.finance.assistant;

import static com.indice.erp.finance.assistant.FinanceAssistantContracts.*;
import static com.indice.erp.finance.assistant.FinanceAssistantSupport.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.finance.expenses.*;
import com.indice.erp.finance.expenses.dto.*;
import com.indice.erp.finance.expenses.attachments.ExpenseAttachmentService;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.status.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Delegated use cases invoke the same expense, payment, correction and reversal owners as the web. */
@Service
@RequiredArgsConstructor
public class ExpenseAssistantOwner {
    private final FinanceAssistantSupport support;
    private final ExpenseService expenses;
    private final ExpenseCorrectionService corrections;
    private final ExpensePaymentReversalService reversals;
    private final ExpenseAccountingClassificationService classification;
    private final ExpenseBulkActionService bulk;
    private final ExpenseBulkStatusService statuses;
    private final ExpenseImportService imports;
    private final ExpenseAttachmentService attachments;
    private final com.indice.erp.finance.treasury.TreasuryService treasuryOwner;

    public Records read(FinanceContext ctx,String kind,Long id) {
        if(kind.equals("payment")){id(id);return Records.of(kind,expenses.listPayments(ctx,id).payments().stream().map(Payment::from).toList());}
        return Records.of("expense",id==null?expenses.assistantList(ctx).expenses().stream().map(Expense::from).toList():List.of(Expense.from(expenses.assistantGet(ctx,id))));
    }
    private void amounts(ObjectNode n,ExpenseData data) {
        money(data.totalAmount(),false);BigDecimal tax;
        if(Boolean.TRUE.equals(data.includesTax())){var rate=includedTaxRate(data.taxRate());if(data.taxAmount()!=null||data.subtotalAmount()!=null)throw new IllegalArgumentException("Use an explicit fractional included-tax rate with the gross total only.");tax=data.totalAmount().subtract(data.totalAmount().divide(BigDecimal.ONE.add(rate),2,java.math.RoundingMode.HALF_UP));}
        else {if(data.taxRate()!=null&&data.taxRate().signum()!=0)throw new IllegalArgumentException("Tax rate requires the explicit included-tax option.");tax=data.taxAmount()==null?BigDecimal.ZERO:money(data.taxAmount(),false);}
        n.remove(List.of("includesTax","taxRate"));
        BigDecimal subtotal=data.subtotalAmount()==null?data.totalAmount().subtract(tax):money(data.subtotalAmount(),false);
        if(subtotal.signum()<0||subtotal.add(tax).compareTo(data.totalAmount())!=0)throw new IllegalArgumentException("Subtotal plus tax must equal the total.");
        n.put("subtotalAmount",subtotal);n.put("taxAmount",tax);n.put("totalAmount",data.totalAmount());n.remove("paid");
        if(data.expenseType()==null)n.put("expenseType","VARIABLE");
    }
    public CreateExpenseRequest createRequest(FinanceContext ctx,ExpenseData data,boolean capture) {
        if(data==null)throw new IllegalArgumentException("Expense data required.");
        if(!capture&&Boolean.TRUE.equals(data.paid()))throw new IllegalArgumentException("Create a pending payable or explicitly import a paid capture.");
        return support.request(data,CreateExpenseRequest.class,n->{amounts(n,data);n.put("folio",capture?"AUTO-EXP":"AUTO-CXP");n.put("settleOnCreate",capture&&Boolean.TRUE.equals(data.paid()));
            n.putNull("requestedByUserId");n.putNull("approvedByUserId");n.putNull("performedByUserId");
            var fields=n.objectNode();fields.put("entryType","payable").put("legacyStatus",capture&&Boolean.TRUE.equals(data.paid())?"paid":"pending");n.set("customFields",fields);
            var metadata=n.objectNode();metadata.put("source","mcp-finance");n.set("metadata",metadata);});
    }
    private CorrectExpenseRequest correction(FinanceContext ctx,ExpenseResponse old,ExpenseData data) {
        if(data==null||Boolean.TRUE.equals(data.paid()))throw new IllegalArgumentException("Expense correction data required; use the payment action to pay.");
        var request=support.request(data,UpdateExpenseRequest.class,n->{amounts(n,data);n.put("folio",old.folio());
            if(data.budgetLineId()!=null&&!Objects.equals(data.budgetLineId(),old.budgetLineId()))throw new IllegalArgumentException("Correction preserves the source budget.");
            if(data.unitId()==null)n.set("unitId",support.node(old).get("unitId"));if(data.businessId()==null)n.set("businessId",support.node(old).get("businessId"));
            if(data.paymentAccountId()==null&&old.paidAmount().signum()>0)n.set("paymentAccountId",support.node(old).get("paymentAccountId"));
            n.set("budgetLineId",support.node(old).get("budgetLineId"));n.set("purchaseOrderId",support.node(old).get("purchaseOrderId"));
            for(var field:List.of("customFields","metadata","requestedByUserId","approvedByUserId","performedByUserId"))n.set(field,support.node(old).get(field));});
        return new CorrectExpenseRequest(old.version(),request);
    }
    private RecordExpensePaymentRequest payment(FinanceContext ctx,ExpenseResponse old,Change c,boolean settle,String key) {
        if(c.payment()==null)throw new IllegalArgumentException("Payment data required.");
        if(settle&&c.payment().amount()!=null)throw new IllegalArgumentException("Settlement amount is calculated by the expense owner.");
        BigDecimal amount=settle?old.balanceAmount():money(c.payment().amount(),true);
        var date=c.payment().paymentDate()==null?support.today(ctx):c.payment().paymentDate();
        return new RecordExpensePaymentRequest(amount,c.payment().paymentAccountId(),date,key);
    }
    private List<ExpenseBulkActionRequest.Selection> selections(Change c) {
        FinanceAssistantSupport.selections(c.rows());return c.rows().stream().map(s->new ExpenseBulkActionRequest.Selection(s.id(),s.expectedVersion())).toList();
    }
    private ExpenseBulkActionRequest classify(Change c,boolean remove,boolean single,ExpenseResponse old) {
        var action=remove?ExpenseBulkActionRequest.Action.DELETE:ExpenseBulkActionRequest.Action.valueOf(text(c.classification(),1,40));
        if(!remove&&action==ExpenseBulkActionRequest.Action.DELETE)throw new IllegalArgumentException("Use the explicit removal action.");
        if(remove)text(c.reason(),1,500);
        return new ExpenseBulkActionRequest(action,single?List.of(new ExpenseBulkActionRequest.Selection(old.id(),old.version())):selections(c),c.targetId(),c.reason());
    }
    private ExpenseBulkStatusRequest status(FinanceContext ctx,Change c,boolean paid,String key) {
        if(c.effectiveDate()==null)throw new IllegalArgumentException("Effective date required.");
        var target=paid?ExpenseBulkStatusRequest.Target.PAID:ExpenseBulkStatusRequest.Target.valueOf(text(c.dueStatus(),1,40));
        if(!paid&&target==ExpenseBulkStatusRequest.Target.PAID)throw new IllegalArgumentException("Use the explicitly consented batch payment action.");
        return new ExpenseBulkStatusRequest(target,selections(c),paid?id(c.targetId()):null,c.effectiveDate(),key);
    }
    public Prepared prepare(FinanceContext ctx,FinanceAssistantTools.Spec s,Change c) {
        var effects=new ArrayList<Effect>();var before=new Records();Object evidence=null;
        switch(s.operation()) {
            case "create"->{support.shape(c,"expense");var request=createRequest(ctx,c.expense(),false);expenses.validateAssistantCreate(ctx,request,false);
                effects.add(effect(c,request.currencyCode(),request.totalAmount(),BigDecimal.ZERO,BigDecimal.ZERO,false,false,false,"Crea una cuenta por pagar pendiente con la fecha de vencimiento revisada.","Creates a pending payable with the reviewed due date.").withAmounts(request.subtotalAmount(),request.taxAmount()));evidence=c;}
            case "import"->{support.shape(c,"expenses");if(c.expenses()==null||c.expenses().isEmpty()||c.expenses().size()>200)throw new IllegalArgumentException("Import 1–200 expense rows.");
                for(var data:c.expenses()){var request=createRequest(ctx,data,true);imports.validateAssistantImport(ctx,request);boolean paid=Boolean.TRUE.equals(data.paid());
                    effects.add(effect(c,data.currencyCode(),data.totalAmount(),paid&&data.paymentAccountId()!=null?data.totalAmount().negate():BigDecimal.ZERO,BigDecimal.ZERO,paid,paid,false,
                        paid?(data.paymentAccountId()==null?"Registra el gasto pagado y su historial sin cuenta bancaria asignada.":"Registra el gasto pagado y su débito en la cuenta elegida."):"Importa una cuenta por pagar pendiente.",
                        paid?(data.paymentAccountId()==null?"Records the paid expense and history with an explicitly unassigned bank account.":"Records the paid expense and debit in the selected account."):"Imports a pending payable.").withAmounts(request.subtotalAmount(),request.taxAmount()));}evidence=c;}
            case "bulk_classify","bulk_status","bulk_pay","bulk_correct"->{
                if(s.operation().equals("bulk_classify"))support.shape(c,"rows","classification","targetId","reason");
                else if(s.operation().equals("bulk_correct"))support.shape(c,"rows","expenses");
                else if(s.operation().equals("bulk_pay"))support.shape(c,"rows","effectiveDate","targetId");
                else support.shape(c,"rows","dueStatus","effectiveDate");
                FinanceAssistantSupport.selections(c.rows());var rows=c.rows().stream().map(row->{var value=expenses.assistantGet(ctx,row.id());version(row.expectedVersion(),value.version());return value;}).toList();
                before=Records.of("expense",rows.stream().map(Expense::from).toList());
                if(s.operation().equals("bulk_classify"))bulk.validateAssistant(ctx,classify(c,false,false,null));
                else if(s.operation().equals("bulk_correct")){if(c.expenses()==null||c.expenses().size()!=rows.size())throw new IllegalArgumentException("Provide one correction for each selected row, in the same order.");for(int i=0;i<rows.size();i++)imports.validateAssistantUpdate(ctx,new UpdateExpensesBatchRequest.Row(rows.get(i).id(),rows.get(i).version(),correction(ctx,rows.get(i),c.expenses().get(i)).expense()));}
                else statuses.validateAssistant(ctx,status(ctx,c,s.operation().equals("bulk_pay"),"mcp-preview"));
                for(int i=0;i<rows.size();i++){var row=rows.get(i);boolean paid=s.operation().equals("bulk_pay");var corrected=s.operation().equals("bulk_correct")?correction(ctx,row,c.expenses().get(i)).expense():null;var reviewed=effect(c,corrected==null?row.currencyCode():corrected.currencyCode(),paid?row.balanceAmount():corrected==null?row.totalAmount():corrected.totalAmount(),paid?row.balanceAmount().negate():BigDecimal.ZERO,BigDecimal.ZERO,false,paid,false,
                    paid?"Paga únicamente el saldo pendiente en la cuenta seleccionada.":s.operation().equals("bulk_status")?"Revisa y aprueba los registros abiertos y actualiza su fecha de vencimiento, conservando abonos.":"Corrige la selección y conserva los pagos y movimientos existentes.",
                    paid?"Pays only the remaining balance in the selected account.":s.operation().equals("bulk_status")?"Reviews and approves open records and updates their due date while preserving installments.":"Corrects the selection and preserves existing payments and movements.");effects.add(corrected==null?reviewed:reviewed.withAmounts(corrected.subtotalAmount(),corrected.taxAmount()));}evidence=rows;}
            default->{
                switch(s.operation()) {
                    case "correct"->support.shape(c,"id","expense");
                    case "pay","settle"->support.shape(c,"id","payment");
                    case "reverse_payment"->support.shape(c,"id","paymentId","reason");
                    case "remove_attachment"->support.shape(c,"id","attachmentId");
                    case "classify"->support.shape(c,"id","classification","targetId","reason");
                    case "reject","cancel","remove"->support.shape(c,"id","reason");
                    default->support.shape(c,"id");
                }
                var old=expenses.assistantGet(ctx,id(c.id()));before=Records.of("expense",List.of(Expense.from(old)));evidence=Arrays.asList(old,expenses.listPayments(ctx,old.id()));
                if(old.originFund()!=null||"PETTY_CASH".equals(old.auditStatus()))throw new IllegalArgumentException("Manage this receipt from its source fund.");
                BigDecimal amount=old.totalAmount(),treasury=BigDecimal.ZERO;boolean paid=false;
                switch(s.operation()) {
                    case "correct"->{var request=correction(ctx,old,c.expense());corrections.validateAssistant(ctx,old.id(),request);amount=request.expense().totalAmount();}
                    case "submit"->requireStatus(old,ExpenseStatus.DRAFT);
                    case "approve","reject"->{requireStatus(old,ExpenseStatus.PENDING_APPROVAL);if(s.operation().equals("reject"))text(c.reason(),1,500);}
                    case "cancel"->{if(!Set.of(ExpenseStatus.DRAFT,ExpenseStatus.PENDING_APPROVAL,ExpenseStatus.APPROVED).contains(old.status())||old.paidAmount().signum()>0)throw new IllegalArgumentException("Use a payment reversal before cancelling a paid expense.");text(c.reason(),1,500);}
                    case "close"->requireStatus(old,ExpenseStatus.PAID);
                    case "pay","settle"->{var request=payment(ctx,old,c,s.operation().equals("settle"),"mcp-preview");expenses.validateAssistantPayment(ctx,old.id(),request,s.operation().equals("settle"));amount=request.amount();treasury=request.paymentAccountId()==null?BigDecimal.ZERO:amount.negate();paid=true;}
                    case "reverse_payment"->{text(c.reason(),1,500);reversals.validateAssistant(ctx,old.id(),id(c.paymentId()),new ReverseExpensePaymentRequest(old.version(),c.reason()));
                        var payment=expenses.listPayments(ctx,old.id()).payments().stream().filter(v->v.id().equals(c.paymentId())).findFirst().orElseThrow(NoSuchElementException::new);amount=payment.reversedAt()==null?payment.amount():BigDecimal.ZERO;treasury=reversals.previewTreasuryRefund(ctx,old.id(),c.paymentId());}
                    case "remove"->{bulk.validateAssistant(ctx,classify(c,true,true,old));treasury=treasuryOwner.previewExpenseRefund(ctx.companyId(),old.id(),null,true);}
                    case "classify"->bulk.validateAssistant(ctx,classify(c,false,true,old));
                    case "remove_attachment"->{id(c.attachmentId());if(attachments.references(ctx,old.id()).stream().noneMatch(f->f.id()==c.attachmentId()))throw new NoSuchElementException("Attachment not found.");evidence=Arrays.asList(evidence,attachments.references(ctx,old.id()));}
                    default->throw new IllegalArgumentException("Unsupported expense operation.");
                }
                String es=paid?(c.payment().paymentAccountId()==null?"Registra la liquidación y su historial con cuenta explícitamente sin asignar.":"Aprueba cuando corresponde y registra el pago y el movimiento de Tesorería revisados."):
                    s.operation().equals("reverse_payment")?"Revierte el último abono activo permitido y restaura solo su débito real; conserva el historial.":s.operation().equals("remove")?"Retira el gasto mediante su reversión financiera y contable auditada; conserva evidencia e historial.":"Aplica la transición revisada y conserva las reglas del propietario del gasto.";
                var reviewedEffect=effect(c,old.currencyCode(),amount,treasury,BigDecimal.ZERO,false,paid,false,es,
                    paid?(c.payment().paymentAccountId()==null?"Records settlement history with an explicitly unassigned account.":"Approves when required and records the reviewed payment and Treasury movement."):s.operation().equals("reverse_payment")?"Reverses only the permitted last active installment and its actual debit, preserving history.":s.operation().equals("remove")?"Removes the expense through its audited financial and accounting reversal, preserving evidence and history.":"Applies the reviewed transition using the expense owner's rules.");
                if(s.operation().equals("correct")){var amounts=correction(ctx,old,c.expense()).expense();reviewedEffect=reviewedEffect.withAmounts(amounts.subtotalAmount(),amounts.taxAmount());}effects.add(reviewedEffect);
            }
        }
        return new Prepared(s.name(),c,before,List.copyOf(effects),support.hash(Arrays.asList(evidence,c)));
    }
    private void requireStatus(ExpenseResponse old,ExpenseStatus allowed) { if(old.status()!=allowed)throw new IllegalArgumentException("Expense is not in the required state."); }
    public Records execute(FinanceContext ctx,FinanceAssistantTools.Spec s,Change c,String key) {
        switch(s.operation()) {
            case "create"-> {return Records.of("expense",List.of(Expense.from(expenses.createDraft(ctx,createRequest(ctx,c.expense(),false)))));}
            case "import"-> {return Records.of("expense",imports.importExpenses(ctx,new ImportExpensesRequest(key,c.expenses().stream().map(data->createRequest(ctx,data,true)).toList())).expenses().stream().map(Expense::from).toList());}
            case "bulk_classify"-> {return Records.of("expense",bulk.apply(ctx,classify(c,false,false,null)).expenses().stream().map(Expense::from).toList());}
            case "bulk_status","bulk_pay"-> {return Records.of("expense",statuses.apply(ctx,status(ctx,c,s.operation().equals("bulk_pay"),key)).expenses().stream().map(Expense::from).toList());}
            case "bulk_correct"->{var rows=new ArrayList<UpdateExpensesBatchRequest.Row>();for(int i=0;i<c.rows().size();i++){var old=expenses.assistantGet(ctx,c.rows().get(i).id());rows.add(new UpdateExpensesBatchRequest.Row(old.id(),c.rows().get(i).expectedVersion(),correction(ctx,old,c.expenses().get(i)).expense()));}return Records.of("expense",imports.updateExpenses(ctx,new UpdateExpensesBatchRequest(rows)).expenses().stream().map(Expense::from).toList());}
            default->{var old=expenses.assistantGet(ctx,id(c.id()));ExpenseResponse result;
                switch(s.operation()) {
                    case "correct"->result=corrections.correct(ctx,old.id(),correction(ctx,old,c.expense()));
                    case "submit"->result=expenses.submitForApproval(ctx,old.id());case "approve"->result=expenses.approve(ctx,old.id());
                    case "reject"->result=expenses.reject(ctx,old.id(),new RejectExpenseRequest(c.reason()));case "cancel"->result=expenses.cancel(ctx,old.id());case "close"->result=expenses.close(ctx,old.id());
                    case "pay"->result=expenses.recordPayment(ctx,old.id(),payment(ctx,old,c,false,key));
                    case "settle"->{var pay=payment(ctx,old,c,true,key);result=expenses.settlePayment(ctx,old.id(),new SettleExpensePaymentRequest(pay.paymentAccountId(),pay.paymentDate(),key));}
                    case "reverse_payment"->result=reversals.reverse(ctx,old.id(),c.paymentId(),new ReverseExpensePaymentRequest(old.version(),c.reason()));
                    case "classify"->{bulk.apply(ctx,classify(c,false,true,old));result=expenses.assistantGet(ctx,old.id());}
                    case "remove"->{bulk.apply(ctx,classify(c,true,true,old));return new Records();}
                    case "remove_attachment"->{attachments.delete(ctx,old.id(),c.attachmentId());result=expenses.assistantGet(ctx,old.id());}
                    default->throw new IllegalArgumentException("Unsupported expense action.");
                }
                return Records.of("expense",List.of(Expense.from(result)));
            }
        }
    }
}
