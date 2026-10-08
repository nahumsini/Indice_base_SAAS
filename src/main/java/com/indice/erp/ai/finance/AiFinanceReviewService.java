package com.indice.erp.ai.finance;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.assistant.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Keeps the three adopted public contracts while adding current owner-state review. */
@Service
@RequiredArgsConstructor
public class AiFinanceReviewService {
    private final FinanceAssistantService owner;
    private final FinanceAssistantSupport support;
    private final ObjectMapper mapper;
    private String action(String tool){return switch(tool){case "create_expense_draft"->"create_expense_payable";case "register_fund_expense"->"capture_petty_cash_receipt";case "add_money_to_fund"->"deposit_petty_cash_fund";default->throw new IllegalArgumentException("Unknown legacy finance tool.");};}
    public Map<String,Object> review(AuthSessionUser user,String tool,Map<String,Object> args){
        var payload=new LinkedHashMap<String,Object>();String name=action(tool);
        if(tool.equals("create_expense_draft")){var data=select(args,"unitId","businessId","providerId","budgetLineId","accountingAccountId","paymentAccountId","concept","description","expenseType","subtotalAmount","taxAmount","totalAmount","currencyCode","expenseDate","dueDate");payload.put("expense",data);}
        else{payload.put("fundId",args.get("fundId"));if(args.get("statementId")!=null)payload.put("statementId",args.get("statementId"));
            if(tool.equals("register_fund_expense"))payload.put("receipt",select(args,"providerId","accountingAccountId","description","receiptReference","subtotalAmount","taxAmount","totalAmount","currencyCode","expenseDate"));
            else{var data=select(args,"amount","currencyCode","movementDate","sourcePaymentAccountId","reference");data.putIfAbsent("reference","Entrada de dinero registrada desde ChatGPT");payload.put("deposit",data);}}
        var plan=owner.prepare(user,name,mapper.convertValue(payload,FinanceAssistantContracts.Change.class));
        return Map.of("ownerStateVersion",plan.version(),"before",plan.before(),"effects",plan.effects());
    }
    public void validate(AuthSessionUser user,String tool,Map<String,Object> args){
        var ctx=support.context(user,action(tool));support.lock(ctx,"companies",ctx.companyId());if(!tool.equals("create_expense_draft"))support.lock(ctx,"finance_petty_cash_funds",((Number)args.get("fundId")).longValue());
        var current=review(user,tool,args);if(args.containsKey("ownerStateVersion")&&!current.get("ownerStateVersion").equals(args.get("ownerStateVersion")))throw new AiFinanceActionConflictException("finance_preview_changed","Prepare and confirm the current finance operation again.");
    }
    public void replay(AuthSessionUser user,String tool,Map<String,Object> result){
        owner.read(user,tool.equals("create_expense_draft")?"get_finance_expense":"get_petty_cash_fund",mapper.convertValue(Map.of("id",result.get(tool.equals("create_expense_draft")?"id":"fundId")),FinanceAssistantContracts.Query.class));
    }
    private Map<String,Object> select(Map<String,Object> source,String... fields){var result=new LinkedHashMap<String,Object>();for(var field:fields)if(source.containsKey(field))result.put(field,source.get(field));return result;}
}
