package com.indice.erp.ai.files;
import com.fasterxml.jackson.databind.*;
import com.indice.erp.ai.access.AiAccessTokenRepository.StoredToken;
import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.sales.*;
import com.indice.erp.pos.assistant.*;
import com.indice.erp.pos.purchaseorder.assistant.*;
import com.indice.erp.storage.OperationalReportFormatter;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import static com.indice.erp.ai.files.AiCommerceReportContracts.*;
@Service
@RequiredArgsConstructor
public class AiCommerceReportService {
    private final AiToolAuthorizationService authorization;private final InventoryAssistantService inventory;private final SalesWorkflowService sales;
    private final SalesCommissionAssistantService commissions;private final PosAssistantService pos;private final PosOperationsService operations;
    private final ProcurementAssistantService procurement;private final ObjectMapper mapper;
    public boolean allowed(StoredToken token,Report report){
        return allowed(token,report,authorization);
    }
    public static boolean allowed(StoredToken token,Report report,AiToolAuthorizationService authorization){
        if(report==null||!token.scopes().contains("files.read"))return false;String tool=tool(report);
        return switch(report){case inventory_products,inventory_balances,inventory_movements->token.scopes().contains("inventory.read")&&authorization.canUseInventoryTool(token.user(),tool);
            case purchase_orders,supplier_invoices->token.scopes().contains("inventory.read")&&authorization.canUseProcurementTool(token.user(),tool);
            case commercial_sales->token.scopes().contains("sales.read")&&authorization.canUseSalesWorkflowTool(token.user(),tool);
            case commission_cuts->token.scopes().contains("sales.read")&&authorization.canUseCommissionTool(token.user(),tool);
            case pos_tickets->token.scopes().contains("pos.read")&&authorization.canUsePosWorkflowTool(token.user(),tool);
            case pos_closings,pos_settlements->token.scopes().contains("pos.read")&&authorization.canUsePosOperationsTool(token.user(),tool);};
    }
    public boolean any(StoredToken token){return Arrays.stream(Report.values()).anyMatch(r->allowed(token,r));}
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public AiFileContracts.FileContent export(StoredToken token,Request q){
        validate(q);if(!allowed(token,q.report()))throw new SecurityException("Current report, module, tab and private file consent required.");
        var rows=new ArrayList<JsonNode>();String cursor=null;
        do {var page=page(token,q,cursor);for(var row:page.items())rows.add(mapper.valueToTree(row));if(rows.size()>5000)throw new IllegalArgumentException("Report exceeds 5000 records. Narrow the selection.");cursor=page.cursor();}while(cursor!=null);
        var columns=columns(q.report());var values=rows.stream().map(r->columns.stream().map(c->{var v=r.get(c);return v==null||v.isNull()?"":v.isValueNode()?v.asText():v.toString();}).toList()).toList();
        boolean csv=q.format().equals("csv");byte[] bytes=csv?OperationalReportFormatter.csv(columns,values):OperationalReportFormatter.pdf(q.report().name(),columns,values);
        if(bytes.length>10485760)throw new IllegalArgumentException("Report exceeds the 10 MB private download limit. Narrow the selection.");
        return new AiFileContracts.FileContent("indice://commerce-reports/"+q.report()+"/"+q.format(),q.report()+"."+q.format(),csv?"text/csv":"application/pdf",bytes.length,AiFileValidation.hash(bytes),Base64.getEncoder().encodeToString(bytes));
    }
    private record Page(List<?> items,String cursor){}
    private Page page(StoredToken token,Request q,String cursor){var u=token.user();String tool=tool(q.report());return switch(q.report()){
        case inventory_products,inventory_balances,inventory_movements->{var p=(InventoryAssistantContracts.Page<?>)inventory.read(u,tool,new InventoryAssistantContracts.Query(null,null,q.warehouseId(),null,null,null,q.from(),q.to(),50,cursor));yield new Page(p.items(),p.nextCursor());}
        case purchase_orders,supplier_invoices->{var p=procurement.read(u,tool,new ProcurementAssistantContracts.Query(null,null,q.warehouseId(),null,q.from(),q.to(),50,cursor));yield new Page(q.report()==Report.purchase_orders?p.records().orders():p.records().invoices(),p.nextCursor());}
        case commercial_sales->{var p=sales.read(u,tool,new SalesWorkflowContracts.Query(null,null,null,q.from(),q.to(),50,cursor));yield new Page(p.records().sales(),p.nextCursor());}
        case commission_cuts->{var p=commissions.read(u,tool,new SalesCommissionAssistantContracts.Query(null,null,50,cursor));yield new Page(p.records().cuts(),p.nextCursor());}
        case pos_tickets->{var p=pos.read(u,tool,new PosAssistantContracts.Query(null,q.shiftId(),q.cashRegisterId(),null,null,50,cursor,null));yield new Page(p.records().tickets(),p.nextCursor());}
        case pos_closings,pos_settlements->{var p=operations.read(u,tool,new PosOperationsContracts.Query(q.closingId(),q.cashRegisterId(),q.from(),q.to(),50,cursor));yield new Page(q.report()==Report.pos_closings?p.records().closings():p.records().settlements(),p.nextCursor());}
    };}
    private static List<String> columns(Report r){return switch(r){
        case inventory_products->List.of("id","sku","name","inventoryUnit","price","cost","currency","status");
        case inventory_balances->List.of("productId","warehouseId","inventoryUnit","availableQuantity","reservedQuantity","freeQuantity","unitCost","currency");
        case inventory_movements->List.of("id","number","date","productId","type","quantity","unitCost","status");
        case purchase_orders->List.of("id","folio","providerName","status","currencyCode","subtotalAmount","taxAmount","totalAmount");
        case supplier_invoices->List.of("id","invoiceNumber","providerName","status","currencyCode","subtotalAmount","taxAmount","totalAmount");
        case commercial_sales->List.of("id","code","date","commercialStatus","financeStatus","inventoryStatus","total","currency");
        case commission_cuts->List.of("id","cutCode","periodStart","periodEnd","status","commissionCount","currencyTotals");
        case pos_tickets->List.of("id","number","shiftId","status","subtotal","tax","total","currency");
        case pos_closings->List.of("id","shiftId","cashRegisterId","closedAt","expectedCash","countedCash","overShort","currency");
        case pos_settlements->List.of("id","closingId","paymentMethod","status","pending","settled","variance","currency");};}
}
