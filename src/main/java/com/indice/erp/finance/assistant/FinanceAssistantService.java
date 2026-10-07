package com.indice.erp.finance.assistant;

import static com.indice.erp.finance.assistant.FinanceAssistantContracts.*;
import static com.indice.erp.finance.assistant.FinanceAssistantSupport.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.expenses.attachments.BudgetLineAttachmentService;
import com.indice.erp.finance.pettycash.PettyCashService;
import com.indice.erp.finance.shared.FinanceContext;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

/** Owner facade: typed reads, current-state review and transactional orchestration. */
@Service
@RequiredArgsConstructor
public class FinanceAssistantService {
    private final FinanceAssistantSupport support;
    private final FinanceCatalogAssistantOwner catalogs;
    private final ExpenseAssistantOwner expenses;
    private final FundAssistantOwner funds;
    private final PettyCashService fundOwner;
    private final FinanceAccessService financeAccess;
    private final BudgetLineAttachmentService budgetFiles;

    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Page read(AuthSessionUser user,String tool,Query request) {
        var spec=FinanceAssistantTools.require(tool);if(spec.write())throw new IllegalArgumentException("Finance read tool required.");
        var q=request==null?new Query():request;query(q);var ctx=support.context(user,tool);
        if(spec.operation().equals("get"))id(q.id());
        Records source=spec.module().equals("petty_cash")?funds.read(ctx,spec.kind(),q.id(),q.fundId()):Set.of("expense","payment").contains(spec.kind())?expenses.read(ctx,spec.kind(),q.id()):catalogs.read(ctx,spec.kind(),q.id());
        var snapshot=spec.module().equals("petty_cash")?fundOwner.assistantSnapshot(ctx):null;
        var statementTypes=new HashMap<Long,String>();var assignments=new HashMap<Long,Fund>();
        if(snapshot!=null){snapshot.statements().forEach(v->statementTypes.put(v.id(),v.fundTypeSnapshot()==null?null:v.fundTypeSnapshot().name()));snapshot.funds().forEach(v->assignments.put(v.id(),Fund.from(v)));}
        var all=source.items(spec.kind()).stream().filter(v->filter(v,spec.kind(),q,ctx,statementTypes,assignments)).toList();
        if(spec.operation().equals("get")&&all.isEmpty())throw new NoSuchElementException("Finance object not found.");
        var totals=totals(all,spec.kind(),statementTypes);
        var selected=support.page(user,tool,q,all);String cursor=support.cursor(user,tool,q,all.size());
        return new Page(Records.of(spec.kind(),selected),all.size(),selected.size(),cursor!=null,cursor,ctx.scope().type().name(),support.today(ctx),support.zone(ctx),totals);
    }
    private boolean filter(Object value,String kind,Query q,FinanceContext ctx,Map<Long,String> stages,Map<Long,Fund> assignments) {
        JsonNode n=support.node(value);Long fundId=number(n,"pettyCashFundId");var assignment=fundId==null?null:assignments.get(fundId);
        if(q.fundId()!=null&&!Objects.equals(q.fundId(),kind.equals("fund")?number(n,"id"):fundId))return false;
        if(q.statementId()!=null&&!Objects.equals(q.statementId(),kind.equals("statement")?number(n,"id"):number(n,"pettyCashStatementId")))return false;
        Long unit=n.has("unitId")?number(n,"unitId"):assignment==null?null:assignment.unitId();Long business=n.has("businessId")?number(n,"businessId"):assignment==null?null:assignment.businessId();
        if(q.unitId()!=null&&!q.unitId().equals(unit)||q.businessId()!=null&&!q.businessId().equals(business)||q.providerId()!=null&&!q.providerId().equals(number(n,"providerId")))return false;
        if(!equal(n.path("status").asText(null),q.status())||!equal(n.path("paymentStatus").asText(null),q.paymentStatus())||!equal(n.path("currencyCode").asText(null),q.currencyCode()))return false;
        String type=kind.equals("statement")?n.path("fundTypeSnapshot").asText(null):kind.equals("fund")?n.path("fundType").asText(null):stages.get(number(n,"pettyCashStatementId"));
        if(!equal(type,q.fundType()))return false;
        if(q.query()!=null&&!q.query().isBlank()&&List.of("name","concept","description","folio","reference","receiptReference","periodKey").stream().noneMatch(k->matches(n.path(k).asText(null),q.query())))return false;
        LocalDate date=null;for(var field:List.of("expenseDate","movementDate","paymentDate","scheduledDate","periodStart")){var text=n.path(field).asText("");if(!text.isBlank()){date=LocalDate.parse(text);break;}}
        if(!inDates(date,q))return false;
        if(Boolean.TRUE.equals(q.overdueOnly())){var due=n.path("dueDate").asText("");var balance=n.path("balanceAmount");if(due.isBlank()||balance.isMissingNode()||decimal(balance).signum()<=0||!LocalDate.parse(due).isBefore(support.today(ctx))||Set.of("CANCELLED","REJECTED","CLOSED").contains(n.path("status").asText()))return false;}
        return true;
    }
    private Long number(JsonNode n,String key) { return n.path(key).isNumber()?n.path(key).longValue():null; }
    private List<Metric> totals(List<?> items,String kind,Map<Long,String> stages) {
        var sums=new TreeMap<String,BigDecimal>();
        for(var item:items){var n=support.node(item);String currency=n.path("currencyCode").asText(null);if(currency==null)continue;
            String type=kind.equals("fund")?n.path("fundType").asText():kind.equals("statement")?n.path("fundTypeSnapshot").asText():stages.get(number(n,"pettyCashStatementId"));
            String state=n.path("status").asText("");if(kind.equals("expense")&&Set.of("CANCELLED","REJECTED").contains(state)||kind.equals("receipt")&&state.equals("REVERSED"))continue;
            switch(kind){
                case "expense"->{sum(sums,"CAPTURED_EXPENSE",currency,type,n,"totalAmount");sum(sums,"PAID_TO_DATE",currency,type,n,"paidAmount");sum(sums,"PAYABLE_BALANCE",currency,type,n,"balanceAmount");if(Set.of("APPROVED","PARTIALLY_PAID","PAID","CLOSED").contains(state))sum(sums,"RECOGNIZED_EXPENSE",currency,type,n,"totalAmount");}
                case "payment"->{if(n.path("reversedAt").isNull())sum(sums,"RECORDED_PAYMENTS",currency,type,n,"amount");}
                case "fund"->{if(!state.equals("CLOSED"))sum(sums,"CURRENT_RECORDED_CUSTODY",currency,type,n,"currentBalanceAmount");}
                case "receipt"->{sum(sums,"CAPTURED_OUTFLOWS",currency,type,n,"totalAmount");sum(sums,(type!=null&&(type.equals("INTERNAL_COMPANY")&&state.equals("EXPENSE_CREATED")||type.equals("EXTERNAL_MANAGED")&&state.equals("VALIDATED")))?"AUTHORIZED_OUTFLOWS":"AWAITING_AUTHORIZATION",currency,type,n,"totalAmount");}
                case "statement"->{sum(sums,"STATEMENT_OPENING",currency,type,n,"openingBalanceAmount");sum(sums,"ASSIGNED_FUNDS",currency,type,n,"assignedAmount");sum(sums,"ADDITIONAL_DEPOSITS",currency,type,n,"additionalDepositAmount");sum(sums,"RECORDED_SHORTAGES",currency,type,n,"shortageAmount");}
                case "budget_line"->{for(var field:List.of("plannedAmount","committedAmount","actualExpenseAmount","availableAmount"))sum(sums,field,currency,type,n,field);}
                case "payment_account"->{sum(sums,"AVAILABLE_ACCOUNT_BALANCE",currency,type,n,"currentBalance");sum(sums,"PENDING_ACCOUNT_BALANCE",currency,type,n,"pendingBalance");}
                default->{ }
            }
        }
        return sums.entrySet().stream().map(e->{var keys=e.getKey().split("\\|",-1);return new Metric(keys[0],keys[1],keys[2].isEmpty()?null:keys[2],e.getValue());}).toList();
    }
    private void sum(Map<String,BigDecimal> sums,String name,String currency,String type,JsonNode n,String field){if(n.path(field).isNumber()||n.path(field).isTextual())sums.merge(name+"|"+currency+"|"+(type==null?"":type),decimal(n.path(field)),BigDecimal::add);}
    private BigDecimal decimal(JsonNode n){return new BigDecimal(n.asText());}
    @Transactional(isolation=Isolation.REPEATABLE_READ)
    public Prepared prepare(AuthSessionUser user,String action,Change c) {
        var spec=FinanceAssistantTools.require(action);if(!spec.write())throw new IllegalArgumentException("Finance action required.");var ctx=support.context(user,action);
        if(c==null)throw new IllegalArgumentException("Finance action data required.");
        if(action.equals("remove_budget_line_attachment")){support.shape(c,"id","attachmentId");var before=catalogs.read(ctx,"budget_line",id(c.id()));id(c.attachmentId());var files=budgetFiles.references(ctx,c.id());if(files.stream().noneMatch(v->v.id()==c.attachmentId()))throw new NoSuchElementException("Attachment not found.");return new Prepared(action,c,before,List.of(effect(c,null,BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO,false,false,false,"Retira el adjunto seleccionado del registro autorizado.","Removes the selected attachment from the authorized record.")),support.hash(Arrays.asList(before,files,c)));}
        var plan=spec.module().equals("petty_cash")?funds.prepare(ctx,spec,c):spec.kind().equals("expense")?expenses.prepare(ctx,spec,c):catalogs.prepare(ctx,spec,c);
        var refs=references(ctx,plan);return new Prepared(plan.action(),plan.change(),plan.before().merge(refs),plan.effects(),support.hash(Arrays.asList(plan.version(),refs,support.today(ctx))));
    }
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public Result execute(AuthSessionUser user,Prepared saved,String key) {
        var spec=FinanceAssistantTools.require(saved.action());var ctx=support.context(user,saved.action());
        // Follow Finance's company -> fund -> cut -> receipt lock order before rebuilding the review.
        support.lock(ctx,"companies",ctx.companyId());
        if(spec.module().equals("petty_cash")&&!spec.operation().equals("create")){Long fundId=spec.kind().equals("fund")&&!spec.operation().equals("deposit")?saved.change().id():saved.change().fundId();support.lock(ctx,"finance_petty_cash_funds",id(fundId));}
        lockSelection(ctx,spec,saved.change());
        // Freeze every reviewed catalog reference, including the original payment account on reversals.
        for(var kind:List.of("accounting_account","payment_account","provider","budget","budget_line")) {
            var reviewedIds=new TreeSet<Long>();
            saved.before().items(kind).forEach(value->reviewedIds.add(number(support.node(value),"id")));
            for(var id:reviewedIds)support.lock(ctx,"finance_"+switch(kind){case "accounting_account"->"accounting_accounts";case "payment_account"->"payment_accounts";case "budget_line"->"budget_lines";default->kind+"s";},id);
        }
        var current=prepare(user,saved.action(),saved.change());if(!current.version().equals(saved.version()))throw new Conflict("finance_preview_changed");
        Records records;
        if(saved.action().equals("remove_budget_line_attachment")){budgetFiles.delete(ctx,saved.change().id(),saved.change().attachmentId());records=catalogs.read(ctx,"budget_line",saved.change().id());}
        else records=spec.module().equals("petty_cash")?funds.execute(ctx,spec,saved.change()):spec.kind().equals("expense")?expenses.execute(ctx,spec,saved.change(),key):catalogs.execute(ctx,spec,saved.change());
        return new Result(saved.action(),records,saved.effects(),nextActions(records));
    }
    public void requireResultAccess(AuthSessionUser user,Prepared saved,Result result) {
        var ctx=support.context(user,saved.action());
        for(var record:List.of(saved.before(),result.records())){
            record.expenses().forEach(v->{if(!support.visibleIncludingRemoved(ctx,"finance_expenses",v.id())||!financeAccess.containsAssignment(ctx,v.unitId(),v.businessId()))throw new SecurityException("The expense is outside the current operating scope.");});
            record.funds().forEach(v->{var current=fundOwner.assistantSnapshot(ctx).funds().stream().filter(f->f.id().equals(v.id())).findFirst().orElseThrow(()->new SecurityException("Fund no longer visible."));if(!financeAccess.containsAssignment(ctx,current.unitId(),current.businessId()))throw new SecurityException("Fund outside current scope.");});
            for(var kind:List.of("accounting_account","payment_account","provider","budget","budget_line"))for(var value:record.items(kind)){var n=support.node(value);if(!support.visibleIncludingRemoved(ctx,"finance_"+switch(kind){case "accounting_account"->"accounting_accounts";case "payment_account"->"payment_accounts";case "budget_line"->"budget_lines";default->kind+"s";},number(n,"id"))||!financeAccess.containsAssignment(ctx,number(n,"unitId"),number(n,"businessId")))throw new SecurityException("Catalog reference outside current scope.");}
        }
        // Receipts/statements are reauthorized through their current fund owner, including narrowed scope.
        var ids=new HashSet<Long>();for(var records:List.of(saved.before(),result.records())){records.receipts().forEach(v->ids.add(v.pettyCashFundId()));records.statements().forEach(v->ids.add(v.pettyCashFundId()));records.movements().forEach(v->ids.add(v.pettyCashFundId()));}
        for(var id:ids)if(fundOwner.assistantSnapshot(ctx).funds().stream().noneMatch(v->v.id().equals(id)))throw new SecurityException("Fund no longer visible.");
    }
    private Records references(FinanceContext ctx,Prepared plan){
        var ids=new TreeMap<String,Set<Long>>();var c=plan.change();
        for(var data:Arrays.asList(c.accounting(),c.account(),c.provider(),c.budget(),c.budgetLine(),c.expense(),c.fund(),c.receipt(),c.deposit(),c.payment(),c.closing()))addReferences(ids,data);
        if(c.expenses()!=null)c.expenses().forEach(v->addReferences(ids,v));
        if(c.fundId()!=null){var f=fundOwner.assistantSnapshot(ctx).funds().stream().filter(v->v.id().equals(c.fundId())).findFirst().orElseThrow(NoSuchElementException::new);addReferences(ids,Fund.from(f));}
        plan.before().expenses().forEach(v->addReferences(ids,v));plan.before().funds().forEach(v->addReferences(ids,v));
        if(c.targetId()!=null){String kind=plan.action().equals("pay_finance_expenses")?"payment_account":c.classification()==null?null:switch(c.classification()){case "ACCOUNTING_ACCOUNT"->"accounting_account";case "PROVIDER"->"provider";case "PAYMENT_ACCOUNT"->"payment_account";default->null;};if(kind!=null)ids.computeIfAbsent(kind,k->new TreeSet<>()).add(c.targetId());}
        var result=new Records();for(var entry:ids.entrySet())for(var id:entry.getValue())result=result.merge(catalogs.read(ctx,entry.getKey(),id));
        return result;
    }
    private void addReferences(Map<String,Set<Long>> ids,Object data){if(data==null)return;var n=support.node(data);for(var field:List.of("providerId","accountingAccountId","paymentAccountId","sourcePaymentAccountId","destinationPaymentAccountId","budgetId","budgetLineId")){Long value=number(n,field);if(value!=null){String kind=switch(field){case "providerId"->"provider";case "accountingAccountId"->"accounting_account";case "budgetId"->"budget";case "budgetLineId"->"budget_line";default->"payment_account";};ids.computeIfAbsent(kind,k->new TreeSet<>()).add(value);}}}
    private void lockSelection(FinanceContext ctx,FinanceAssistantTools.Spec spec,Change c){
        String table=spec.module().equals("petty_cash")?spec.kind().equals("receipt")?"finance_petty_cash_settlement_lines":spec.kind().equals("statement")?"finance_petty_cash_statements":null:switch(spec.kind()){case "expense"->"finance_expenses";case "accounting_account"->"finance_accounting_accounts";case "payment_account"->"finance_payment_accounts";case "provider"->"finance_providers";case "budget"->"finance_budgets";case "budget_line"->"finance_budget_lines";default->null;};
        if(spec.module().equals("petty_cash")&&c.statementId()!=null)support.lock(ctx,"finance_petty_cash_statements",c.statementId());
        if(table!=null){var ids=new TreeSet<Long>();if(c.id()!=null)ids.add(c.id());if(c.rows()!=null)c.rows().forEach(r->ids.add(r.id()));for(var id:ids)support.lock(ctx,table,id);}
        var refs=new TreeMap<String,Set<Long>>();for(var data:Arrays.asList(c.expense(),c.fund(),c.receipt(),c.deposit(),c.payment(),c.closing(),c.budgetLine()))addReferences(refs,data);if(c.expenses()!=null)c.expenses().forEach(v->addReferences(refs,v));
        for(var entry:refs.entrySet())for(var id:entry.getValue())support.lock(ctx,"finance_"+switch(entry.getKey()){case "accounting_account"->"accounting_accounts";case "payment_account"->"payment_accounts";case "budget_line"->"budget_lines";default->entry.getKey()+"s";},id);
    }
    private List<String> nextActions(Records records) {
        var result=new LinkedHashSet<String>();
        for(var expense:records.expenses()){if(expense.status().name().equals("DRAFT"))result.add("submit_finance_expense");if(expense.status().name().equals("PENDING_APPROVAL"))result.add("approve_finance_expense");if(expense.balanceAmount().signum()>0&&!Set.of("CLOSED","CANCELLED","REJECTED").contains(expense.status().name()))result.add("register_expense_payment");if(expense.status().name().equals("PAID"))result.add("close_finance_expense");}
        for(var receipt:records.receipts())if(Set.of("DRAFT","RECEIPT_ATTACHED").contains(receipt.status().name()))result.add("authorize_petty_cash_receipt");
        if(records.statements().stream().anyMatch(s->!FundAssistantOwner.terminal(s.status())))result.add("close_petty_cash_statement");
        return List.copyOf(result);
    }
}
