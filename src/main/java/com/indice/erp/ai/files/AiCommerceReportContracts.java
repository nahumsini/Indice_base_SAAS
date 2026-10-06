package com.indice.erp.ai.files;
import com.indice.erp.sales.InventoryAssistantContracts.ClosedInput;
import java.time.LocalDate;
public final class AiCommerceReportContracts {
    private AiCommerceReportContracts(){}
    public enum Report {inventory_products,inventory_balances,inventory_movements,purchase_orders,supplier_invoices,commercial_sales,commission_cuts,pos_tickets,pos_closings,pos_settlements}
    public record Request(Report report,String format,LocalDate from,LocalDate to,Long warehouseId,Long shiftId,Long cashRegisterId,Long closingId) implements ClosedInput {}
    public static String tool(Report report){return switch(report){case inventory_products->"list_inventory_products";case inventory_balances->"list_inventory_balances";case inventory_movements->"list_inventory_movements";case purchase_orders->"list_purchase_orders";case supplier_invoices->"list_supplier_invoices";case commercial_sales->"list_commercial_sales";case commission_cuts->"list_commission_cuts";case pos_tickets->"list_pos_tickets";case pos_closings->"list_pos_closings";case pos_settlements->"list_pos_closing_settlements";};}
    public static void validate(Request q){
        if(q==null||q.report()==null||q.format()==null||!java.util.Set.of("csv","pdf").contains(q.format()))throw new IllegalArgumentException("A commerce report and csv/pdf format are required.");
        if((q.from()==null)!=(q.to()==null)||(q.from()!=null&&(q.to().isBefore(q.from())||java.time.temporal.ChronoUnit.DAYS.between(q.from(),q.to())>366)))throw new IllegalArgumentException("Report dates must cover at most 366 days.");
        if(q.from()!=null&&!java.util.Set.of(Report.inventory_movements,Report.purchase_orders,Report.supplier_invoices,Report.commercial_sales,Report.pos_closings).contains(q.report()))throw new IllegalArgumentException("This report does not accept dates.");
        if(q.warehouseId()!=null&&q.report()!=Report.inventory_balances&&q.report()!=Report.inventory_movements&&q.report()!=Report.purchase_orders)throw new IllegalArgumentException("Warehouse filter unavailable for this report.");
        if(q.shiftId()!=null&&q.report()!=Report.pos_tickets||q.cashRegisterId()!=null&&q.report()!=Report.pos_tickets&&q.report()!=Report.pos_closings||q.closingId()!=null&&q.report()!=Report.pos_settlements)throw new IllegalArgumentException("Unexpected POS report filter.");
        if(q.report()==Report.pos_tickets&&q.shiftId()==null||q.report()==Report.pos_settlements&&q.closingId()==null)throw new IllegalArgumentException("Select the original shift or closing for this report.");
        for(Long id:new Long[]{q.warehouseId(),q.shiftId(),q.cashRegisterId(),q.closingId()})if(id!=null&&id<1)throw new IllegalArgumentException("Report IDs must be positive.");
    }
}
