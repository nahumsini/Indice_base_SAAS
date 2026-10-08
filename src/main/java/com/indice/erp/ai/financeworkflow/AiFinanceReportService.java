package com.indice.erp.ai.financeworkflow;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.indice.erp.ai.access.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.files.AiFileContracts.FileContent;
import com.indice.erp.finance.assistant.*;
import com.indice.erp.storage.OperationalReportFormatter;
import java.util.*;
import java.security.MessageDigest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@RequiredArgsConstructor
public class AiFinanceReportService {
    public enum Report { expenses,expense_payments,budgets,budget_lines,petty_cash_funds,petty_cash_statements,petty_cash_receipts,petty_cash_movements }
    public record Request(Report report,String format,FinanceAssistantContracts.Query filters){
        @JsonAnySetter public void unknown(String key,Object value){throw new IllegalArgumentException("Unknown report field.");}
    }
    private final FinanceAssistantService owner;
    private final FinanceAssistantSupport support;
    private final AiToolAuthorizationService authorization;
    public static String tool(Report report){return switch(report){case expenses->"list_finance_expenses";case expense_payments->"list_expense_payments";case budgets->"list_finance_budgets";case budget_lines->"list_finance_budget_lines";case petty_cash_funds->"list_petty_cash_funds";case petty_cash_statements->"list_petty_cash_statements";case petty_cash_receipts->"list_petty_cash_receipts";case petty_cash_movements->"list_petty_cash_movements";};}
    public static boolean allowed(StoredToken token,Report r,AiToolAuthorizationService auth){return r!=null&&token.scopes().contains("files.read")&&token.scopes().contains(FinanceAssistantTools.require(tool(r)).scope())&&auth.canUseFinanceWorkflowTool(token.user(),tool(r));}
    @Transactional(isolation=Isolation.REPEATABLE_READ)
    public FileContent export(StoredToken token,Request request){
        if(request==null||request.report()==null||!Set.of("csv","pdf").contains(Objects.toString(request.format(),"")))throw new IllegalArgumentException("Choose a finance report and CSV or PDF.");
        if(!allowed(token,request.report(),authorization))throw new SecurityException("Current finance report and private file consent required.");
        var q=request.filters()==null?new FinanceAssistantContracts.Query():request.filters();
        if(q.cursor()!=null||q.limit()!=null)throw new IllegalArgumentException("Reports cover the complete selected population; pagination fields are not accepted.");
        var rows=new ArrayList<List<String>>();var columns=columns(request.report());String cursor=null;
        do{var page=owner.read(token.user(),tool(request.report()),new FinanceAssistantContracts.Query(q.id(),q.fundId(),q.statementId(),q.unitId(),q.businessId(),q.providerId(),q.query(),q.status(),q.paymentStatus(),q.fundType(),q.currencyCode(),q.from(),q.to(),q.overdueOnly(),100,cursor));
            if(page.totalCount()>5000)throw new IllegalArgumentException("Report exceeds 5000 records; narrow the selection.");
            for(var value:page.records().items(FinanceAssistantTools.require(tool(request.report())).kind())){var n=support.node(value);rows.add(columns.stream().map(c->{var v=n.path(c);return v.isNull()||v.isMissingNode()?"":v.isValueNode()?v.asText():v.toString();}).toList());}cursor=page.nextCursor();
        }while(cursor!=null);
        boolean csv=request.format().equals("csv");byte[] bytes=csv?OperationalReportFormatter.csv(columns,rows,Set.of("amount","subtotalAmount","taxAmount","totalAmount","paidAmount","balanceAmount","plannedAmount","committedAmount","actualExpenseAmount","availableAmount","currentBalanceAmount","openingBalanceAmount","assignedAmount","additionalDepositAmount","verifiedExpenseAmount","declaredClosingBalanceAmount","returnedAmount","shortageAmount","carryForwardAmount")):OperationalReportFormatter.pdf(request.report().name(),columns,rows);
        if(bytes.length>10485760)throw new IllegalArgumentException("Report exceeds 10 MB; narrow the selection.");
        try{return new FileContent("indice://finance-reports/"+request.report()+"/"+request.format(),request.report()+"."+request.format(),csv?"text/csv":"application/pdf",bytes.length,HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)),Base64.getEncoder().encodeToString(bytes));}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
    static List<String> columns(Report r){return switch(r){
        case expenses->List.of("id","folio","unitId","businessId","concept","expenseDate","dueDate","status","paymentStatus","currencyCode","subtotalAmount","taxAmount","totalAmount","paidAmount","balanceAmount","originFundId");
        case expense_payments->List.of("id","expenseId","paymentDate","amount","currencyCode","paymentAccountId","paymentAccountName","source","reversedAt");
        case budgets->List.of("id","name","unitId","businessId","periodStart","periodEnd","currencyCode","status");
        case budget_lines->List.of("id","budgetId","name","scheduledDate","providerId","accountingAccountName","currencyCode","plannedAmount","includesTax","taxRate","taxAmount","committedAmount","actualExpenseAmount","availableAmount","status");
        case petty_cash_funds->List.of("id","name","unitId","businessId","fundType","currencyCode","currentBalanceAmount","paymentAccountId","responsibleUserId","status","managedAssets");
        case petty_cash_statements->List.of("id","pettyCashFundId","folio","periodKey","fundTypeSnapshot","externalOwnerNameSnapshot","externalOwnerRelationshipSnapshot","currencyCode","openingBalanceAmount","assignedAmount","additionalDepositAmount","verifiedExpenseAmount","declaredClosingBalanceAmount","returnedAmount","shortageAmount","carryForwardAmount","status","managedAssetsSnapshot");
        case petty_cash_receipts->List.of("id","pettyCashFundId","pettyCashStatementId","expenseId","expenseDate","description","receiptReference","currencyCode","subtotalAmount","taxAmount","totalAmount","status","attachmentCount");
        case petty_cash_movements->List.of("id","pettyCashFundId","pettyCashStatementId","movementDate","type","currencyCode","amount","fromPaymentAccountId","toPaymentAccountId","externalSourceName","reference");};}
}
