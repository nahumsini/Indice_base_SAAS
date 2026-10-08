package com.indice.erp.finance.assistant;

import static com.indice.erp.finance.assistant.FinanceAssistantContracts.*;
import static com.indice.erp.finance.assistant.FinanceAssistantSupport.*;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.indice.erp.finance.accountingaccounts.*;
import com.indice.erp.finance.accountingaccounts.dto.*;
import com.indice.erp.finance.paymentaccounts.*;
import com.indice.erp.finance.paymentaccounts.dto.*;
import com.indice.erp.finance.providers.*;
import com.indice.erp.finance.providers.dto.*;
import com.indice.erp.finance.budgets.*;
import com.indice.erp.finance.budgets.dto.*;
import com.indice.erp.finance.budgetlines.*;
import com.indice.erp.finance.budgetlines.dto.*;
import com.indice.erp.finance.shared.FinanceContext;
import java.math.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Finance owns catalog configuration; existing owners retain validation and persistence. */
@Service
@RequiredArgsConstructor
public class FinanceCatalogAssistantOwner {
    private final FinanceAssistantSupport support;
    private final AccountingAccountService accounting;
    private final PaymentAccountService accounts;
    private final ProviderService providers;
    private final BudgetService budgets;
    private final BudgetLineService lines;
    private final BudgetExpenseSynchronizationService obligations;

    public Records read(FinanceContext ctx, String kind, Long id) {
        return switch (kind) {
            case "accounting_account" -> Records.of(kind, id == null ? accounting.list(ctx).accounts().stream().map(Accounting::from).toList() : List.of(Accounting.from(accounting.get(ctx,id))));
            case "payment_account" -> Records.of(kind, id == null ? accounts.list(ctx).accounts().stream().map(Account::from).toList() : List.of(Account.from(accounts.get(ctx,id))));
            case "provider" -> Records.of(kind, id == null ? providers.list(ctx).providers().stream().map(Provider::from).toList() : List.of(Provider.from(providers.get(ctx,id))));
            case "budget" -> Records.of(kind, id == null ? budgets.list(ctx).budgets().stream().map(Budget::from).toList() : List.of(Budget.from(budgets.get(ctx,id))));
            case "budget_line" -> Records.of(kind, id == null ? lines.list(ctx).budgetLines().stream().map(BudgetLine::from).toList() : List.of(BudgetLine.from(lines.get(ctx,id))));
            case "review" -> Records.of(kind, obligations.reviews(ctx).stream().map(r -> new Review(r.budgetLineId(),r.name(),r.reason())).toList());
            default -> throw new IllegalArgumentException("Unknown finance catalog kind.");
        };
    }
    private Object raw(FinanceContext ctx, String kind, Long id) {
        if(id==null)return read(ctx,kind,null);
        return switch(kind){case "accounting_account"->accounting.get(ctx,id);case "payment_account"->accounts.get(ctx,id);case "provider"->providers.get(ctx,id);case "budget"->budgets.get(ctx,id);case "budget_line"->lines.get(ctx,id);default->throw new IllegalArgumentException("Unknown finance catalog kind.");};
    }
    private Object payload(FinanceAssistantTools.Spec spec, Change c, Object previous) {
        return spec.operation().equals("inactivate") ? previous : switch(spec.kind()) {
            case "accounting_account" -> Objects.requireNonNull(c.accounting(),"Accounting account data required.");
            case "payment_account" -> Objects.requireNonNull(c.account(),"Payment account data required.");
            case "provider" -> Objects.requireNonNull(c.provider(),"Provider data required.");
            case "budget" -> Objects.requireNonNull(c.budget(),"Budget data required.");
            case "budget_line" -> Objects.requireNonNull(c.budgetLine(),"Budget line data required.");
            default -> throw new IllegalArgumentException("Unknown finance catalog kind.");
        };
    }
    private void defaults(ObjectNode n, Object previous, String kind, boolean inactivate) {
        if(previous!=null){var old=support.node(previous);for(var field:List.of("customFields","metadata","taxId"))if(old.has(field))n.set(field,old.get(field));}
        if(previous!=null&&kind.equals("provider")){var old=support.node(previous);for(var field:List.of("email","phone","contactName"))if(n.path(field).isNull()||!n.has(field))n.set(field,old.get(field));}
        n.remove(List.of("id","companyId","createdByUserId","updatedByUserId","createdAt","updatedAt","deletedAt","version","pendingBalance","systemManaged","committedAmount","actualExpenseAmount","pettyCashIssuedAmount","pettyCashSettledAmount","availableAmount","healthStatus","attachmentCount"));
        if(kind.equals("payment_account")&&previous!=null)n.remove(List.of("openingBalance","currentBalance"));
        if(n.path("status").isNull()||!n.has("status"))n.put("status",previous==null?"ACTIVE":support.node(previous).path("status").asText());
        if(inactivate)n.put("status",Set.of("budget","budget_line").contains(kind)?"ARCHIVED":"INACTIVE");
    }
    private <T> T request(FinanceContext ctx,FinanceAssistantTools.Spec s, Change c, Object old, Class<T> type) {
        return support.request(payload(s,c,old),type,n->{defaults(n,old,s.kind(),s.operation().equals("inactivate"));
            if(s.kind().equals("budget_line")){lineFields(n,old,c.budgetLine(),null);if(c.budgetLine()!=null&&c.budgetLine().scheduledDate()!=null&&c.budgetLine().accountingAccountId()!=null)n.withObject("customFields").put("accountingAccount",accounting.get(ctx,c.budgetLine().accountingAccountId()).name());}});
    }
    public Prepared prepare(FinanceContext ctx, FinanceAssistantTools.Spec s, Change c) {
        boolean create=s.operation().equals("create"),schedule=s.operation().equals("schedule");
        if(schedule){support.shape(c,"budgetLine","schedule");return schedule(ctx,s,c);}
        String field=s.kind().equals("accounting_account")?"accounting":s.kind().equals("payment_account")?"account":s.kind().equals("budget_line")?"budgetLine":s.kind();
        support.shape(c,create?field:"id",create?field: s.operation().equals("inactivate")?"reason":field);
        if(!create)id(c.id());if(s.operation().equals("inactivate"))text(c.reason(),1,500);
        Object old=create?null:raw(ctx,s.kind(),c.id());
        switch(s.kind()) {
            case "accounting_account"->{if(create)accounting.validateAssistantCreate(ctx,request(ctx,s,c,old,CreateAccountingAccountRequest.class));else accounting.validateAssistantUpdate(ctx,c.id(),request(ctx,s,c,old,UpdateAccountingAccountRequest.class));}
            case "payment_account"->{if(create){money(c.account().openingBalance(),false);accounts.validateAssistantCreate(ctx,request(ctx,s,c,old,CreatePaymentAccountRequest.class));}else {if(c.account()!=null&&c.account().openingBalance()!=null)throw new IllegalArgumentException("Opening balance is only available when creating an account.");accounts.validateAssistantUpdate(ctx,c.id(),request(ctx,s,c,old,UpdatePaymentAccountRequest.class));}}
            case "provider"->{if(create)providers.previewCreate(ctx,request(ctx,s,c,old,CreateProviderRequest.class));else providers.previewUpdate(ctx,c.id(),request(ctx,s,c,old,UpdateProviderRequest.class));}
            case "budget"->{if(create)budgets.validateAssistantCreate(ctx,request(ctx,s,c,old,CreateBudgetRequest.class));else budgets.validateAssistantUpdate(ctx,c.id(),request(ctx,s,c,old,UpdateBudgetRequest.class));}
            case "budget_line"->{if(create)lines.validateAssistantCreate(ctx,request(ctx,s,c,old,CreateBudgetLineRequest.class));else lines.validateAssistantUpdate(ctx,c.id(),request(ctx,s,c,old,UpdateBudgetLineRequest.class));validateScheduledLine(ctx,c.budgetLine());}
            default->throw new IllegalArgumentException("Unsupported finance catalog action.");
        }
        var before=create?new Records():read(ctx,s.kind(),c.id());
        BigDecimal amount=create&&s.kind().equals("payment_account")?c.account().openingBalance():BigDecimal.ZERO;
        String currency=s.kind().equals("payment_account")?(create?c.account().currencyCode():((PaymentAccountResponse)old).currencyCode()):null;
        var effect=effect(c,currency,amount,amount,BigDecimal.ZERO,false,false,false,"Guarda la configuración revisada y conserva el historial. El saldo inicial indicado se registra en Tesorería al crear una cuenta.","Saves the reviewed configuration and preserves history. A new account's declared opening balance is posted to Treasury.");
        return new Prepared(s.name(),c,before,List.of(effect),support.hash(Arrays.asList(old,before,c)));
    }
    public Records execute(FinanceContext ctx, FinanceAssistantTools.Spec s, Change c) {
        boolean create=s.operation().equals("create");Object old=create||s.operation().equals("schedule")?null:raw(ctx,s.kind(),id(c.id()));
        if(s.operation().equals("schedule")){var rows=new ArrayList<BudgetLine>();for(var date:dates(c.schedule()))rows.add(BudgetLine.from(lines.create(ctx,scheduledRequest(ctx,c,date))));return Records.of("budget_line",List.copyOf(rows));}
        return switch(s.kind()) {
            case "accounting_account"->Records.of(s.kind(),List.of(Accounting.from(create?accounting.create(ctx,request(ctx,s,c,old,CreateAccountingAccountRequest.class)):accounting.update(ctx,c.id(),request(ctx,s,c,old,UpdateAccountingAccountRequest.class)))));
            case "payment_account"->Records.of(s.kind(),List.of(Account.from(create?accounts.create(ctx,request(ctx,s,c,old,CreatePaymentAccountRequest.class)):accounts.update(ctx,c.id(),request(ctx,s,c,old,UpdatePaymentAccountRequest.class)))));
            case "provider"->Records.of(s.kind(),List.of(Provider.from(create?providers.create(ctx,request(ctx,s,c,old,CreateProviderRequest.class)):providers.update(ctx,c.id(),request(ctx,s,c,old,UpdateProviderRequest.class)))));
            case "budget"->Records.of(s.kind(),List.of(Budget.from(create?budgets.create(ctx,request(ctx,s,c,old,CreateBudgetRequest.class)):budgets.update(ctx,c.id(),request(ctx,s,c,old,UpdateBudgetRequest.class)))));
            case "budget_line"->Records.of(s.kind(),List.of(BudgetLine.from(create?lines.create(ctx,request(ctx,s,c,old,CreateBudgetLineRequest.class)):lines.update(ctx,c.id(),request(ctx,s,c,old,UpdateBudgetLineRequest.class)))));
            default->throw new IllegalArgumentException("Unsupported finance catalog action.");
        };
    }
    private void validateScheduledLine(FinanceContext ctx, BudgetLineData data) {
        if(data==null||data.scheduledDate()==null)return;
        var parent=budgets.get(ctx,id(data.budgetId()));money(data.plannedAmount(),true);
        if(!parent.currencyCode().equalsIgnoreCase(data.currencyCode())||data.scheduledDate().isBefore(parent.periodStart())||data.scheduledDate().isAfter(parent.periodEnd()))throw new IllegalArgumentException("Scheduled obligations must match their budget currency and period.");
        if(data.providerId()!=null&&providers.get(ctx,id(data.providerId())).status()!=ProviderStatus.ACTIVE)throw new IllegalArgumentException("Active provider required.");
        if(data.accountingAccountId()!=null&&accounting.get(ctx,id(data.accountingAccountId())).status()!=AccountingAccountStatus.ACTIVE)throw new IllegalArgumentException("Active accounting account required.");
    }
    private void lineFields(ObjectNode n,Object old,BudgetLineData data,LocalDate override) {
        n.remove(List.of("scheduledDate","providerId","accountingAccountId","includesTax","taxRate"));
        if(data==null)return;
        money(data.plannedAmount(),false);
        LocalDate date=override==null?data.scheduledDate():override;
        if(date==null){if(old!=null){var prior=support.node(old);n.set("customFields",prior.get("customFields"));n.set("metadata",prior.get("metadata"));}return;}
        var fields=old==null||support.node(old).path("customFields").isNull()?n.objectNode():support.node(old).withObject("customFields").deepCopy();
        fields.put("dueDate",date.toString()).put("concept",data.name()).put("amount",data.plannedAmount()).put("legacyStatus","pending");
        if(data.providerId()==null)fields.putNull("providerId");else fields.put("providerId",data.providerId());
        if(data.accountingAccountId()==null){fields.putNull("accountingAccountId");fields.putNull("accountingAccount");}else fields.put("accountingAccountId",data.accountingAccountId());
        BigDecimal rate=Boolean.TRUE.equals(data.includesTax())?data.taxRate():BigDecimal.ZERO;
        includedTaxRate(rate);
        var tax=Boolean.TRUE.equals(data.includesTax())?data.plannedAmount().subtract(data.plannedAmount().divide(BigDecimal.ONE.add(rate),2,RoundingMode.HALF_UP)):BigDecimal.ZERO;
        fields.put("taxes",tax).put("taxIncluded",Boolean.TRUE.equals(data.includesTax())).put("taxRate",rate);
        n.set("customFields",fields);var metadata=n.objectNode();metadata.put("source","expenses-frontend").put("entryChannel","mcp");n.set("metadata",metadata);
    }
    private CreateBudgetLineRequest scheduledRequest(FinanceContext ctx,Change c,LocalDate date) {
        var data=c.budgetLine();validateScheduledLine(ctx,new BudgetLineData(data.unitId(),data.businessId(),data.budgetId(),data.name(),data.categoryKey(),data.plannedAmount(),data.currencyCode(),data.status(),data.description(),date,data.providerId(),data.accountingAccountId(),data.includesTax(),data.taxRate()));
        return support.request(data,CreateBudgetLineRequest.class,n->{defaults(n,null,"budget_line",false);n.put("name",text(data.name(),1,140)+" / "+date);lineFields(n,null,data,date);if(data.accountingAccountId()!=null)n.withObject("customFields").put("accountingAccount",accounting.get(ctx,data.accountingAccountId()).name());});
    }
    private Prepared schedule(FinanceContext ctx,FinanceAssistantTools.Spec s,Change c) {
        if(c.budgetLine()==null)throw new IllegalArgumentException("Budget line data required.");
        for(var date:dates(c.schedule()))lines.validateAssistantCreate(ctx,scheduledRequest(ctx,c,date));
        var effects=dates(c.schedule()).stream().map(date->effect(c,c.budgetLine().currencyCode(),c.budgetLine().plannedAmount(),BigDecimal.ZERO,BigDecimal.ZERO,false,false,false,"Programa la obligación del "+date+"; el propietario genera la cuenta por pagar en su mes.","Schedules the obligation for "+date+"; the owner creates its payable in the scheduled month.")).toList();
        return new Prepared(s.name(),c,new Records(),effects,support.hash(Arrays.asList(budgets.get(ctx,id(c.budgetLine().budgetId())),c)));
    }
    static List<LocalDate> dates(ScheduleData s) {
        if(s==null||s.startDate()==null||s.endDate()==null||s.endDate().isBefore(s.startDate())||s.everyMonths()==null||s.everyMonths()<1||s.everyMonths()>12)throw new IllegalArgumentException("A finite schedule with a 1–12 month interval is required.");
        var dates=new ArrayList<LocalDate>();for(int n=0;;n++){var date=s.startDate().plusMonths((long)n*s.everyMonths());if(date.isAfter(s.endDate()))break;dates.add(date);if(dates.size()>200)throw new IllegalArgumentException("At most 200 scheduled obligations are supported.");}return List.copyOf(dates);
    }
}
