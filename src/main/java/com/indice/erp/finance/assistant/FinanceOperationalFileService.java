package com.indice.erp.finance.assistant;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.budgetlines.BudgetLineService;
import com.indice.erp.finance.expenses.attachments.*;
import com.indice.erp.finance.expenses.attachments.dto.*;
import com.indice.erp.finance.pettycash.*;
import com.indice.erp.storage.OperationalFileReference;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Private file adapter. Registration and storage quotas remain owned by Finance. */
@Service
@RequiredArgsConstructor
public class FinanceOperationalFileService {
    private final FinanceAssistantSupport support;
    private final ExpenseService expenses;
    private final BudgetLineService lines;
    private final PettyCashService funds;
    private final ExpenseAttachmentService expenseFiles;
    private final BudgetLineAttachmentService budgetFiles;
    private final PettyCashAttachmentService receiptFiles;

    private String tool(String kind,boolean write){return switch(kind){
        case "expense"->write?"remove_expense_attachment":"get_finance_expense";
        case "budget_line"->write?"remove_budget_line_attachment":"get_finance_budget_line";
        case "receipt"->write?"remove_petty_cash_receipt_attachment":"get_petty_cash_receipt";
        default->throw new IllegalArgumentException("Unsupported finance file owner.");};}
    private com.indice.erp.finance.pettycash.dto.PettyCashSettlementLineResponse receipt(com.indice.erp.finance.shared.FinanceContext ctx,long id){
        return funds.assistantSnapshot(ctx).settlementLines().stream().filter(v->v.id()==id).findFirst().orElseThrow(()->new NoSuchElementException("Receipt not found."));
    }
    public Object target(AuthSessionUser user,String kind,long id,boolean write,boolean lock){
        var ctx=support.context(user,tool(kind,write));
        if(lock){support.lock(ctx,"companies",ctx.companyId());if(kind.equals("receipt")){var r=receipt(ctx,id);support.lock(ctx,"finance_petty_cash_funds",r.pettyCashFundId());support.lock(ctx,"finance_petty_cash_statements",r.pettyCashStatementId());support.lock(ctx,"finance_petty_cash_settlement_lines",id);}else support.lock(ctx,kind.equals("expense")?"finance_expenses":"finance_budget_lines",id);}
        return switch(kind){
            case "expense"->FinanceAssistantContracts.Expense.from(expenses.get(ctx,id));
            case "budget_line"->FinanceAssistantContracts.BudgetLine.from(lines.get(ctx,id));
            case "receipt"->{var r=receipt(ctx,id);if(write)receiptFiles.validateAssistantWrite(ctx,r.pettyCashFundId(),id);yield FinanceAssistantContracts.Receipt.from(r);}
            default->throw new IllegalArgumentException("Unsupported finance file owner.");};
    }
    public List<OperationalFileReference> files(AuthSessionUser user,String kind,long id){
        var ctx=support.context(user,tool(kind,false));return switch(kind){case "expense"->expenseFiles.references(ctx,id);case "budget_line"->budgetFiles.references(ctx,id);case "receipt"->receiptFiles.references(ctx,receipt(ctx,id).pettyCashFundId(),id);default->throw new IllegalArgumentException("Unsupported finance file owner.");};
    }
    public String reserve(AuthSessionUser user,String kind,long id,String name,String mime,long size){
        target(user,kind,id,true,false);var ctx=support.context(user,tool(kind,true));var data=new ExpenseAttachmentUploadRequest(name,mime,size);
        return switch(kind){case "expense"->expenseFiles.presignUpload(ctx,id,data).objectKey();case "budget_line"->budgetFiles.presignUpload(ctx,id,data).objectKey();case "receipt"->String.valueOf(receiptFiles.createAttachmentUpload(ctx,receipt(ctx,id).pettyCashFundId(),id,Map.of("file_name",name,"content_type",mime,"size_bytes",size)).get("object_key"));default->throw new IllegalArgumentException("Unsupported finance file owner.");};
    }
    public void register(AuthSessionUser user,String kind,long id,String name,String mime,long size,String key){
        target(user,kind,id,true,true);var ctx=support.context(user,tool(kind,true));var data=new RegisterExpenseAttachmentRequest(key,name,mime,size);
        switch(kind){case "expense"->expenseFiles.register(ctx,id,data);case "budget_line"->budgetFiles.register(ctx,id,data);case "receipt"->receiptFiles.registerAttachment(ctx,receipt(ctx,id).pettyCashFundId(),id,Map.of("object_key",key,"file_name",name,"mime_type",mime,"size_bytes",size));default->throw new IllegalArgumentException("Unsupported finance file owner.");}
    }
}
