package com.indice.erp.sales;
import static com.indice.erp.sales.SalesWorkflowContracts.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

final class SalesWorkflowViews {
    private SalesWorkflowViews() {}
    static Records one(String kind,Map<String,Object> v) {
        return switch(kind) {case "sale"->new Records(List.of(sale(v)),List.of(),List.of(),List.of());
            case "contract"->new Records(List.of(),List.of(contract(v)),List.of(),List.of());
            case "follow_up"->new Records(List.of(),List.of(),List.of(followUp(v)),List.of());
            case "rule"->new Records(List.of(),List.of(),List.of(),List.of(rule(v)));
            default->throw new IllegalArgumentException("Unknown sales workflow view.");};
    }
    static Sale sale(Map<String,Object> v) {
        var lines=new ArrayList<Line>();
        for(var raw:list(v.get("saleLines"))) {
            var l=map(raw); lines.add(new Line(id(l,"productId"),str(l,"productName"),num(l,"quantity"),num(l,"unitPrice"),
                num(l,"discountPercent"),num(l,"taxPercent"),num(l,"subtotal"),num(l,"taxAmount"),nullableNum(l,"unitCost"),str(l,"costCurrency"),str(l,"costSource")));
        }
        return new Sale(id(v,"id"),str(v,"saleNumber"),id(v,"contactId"),id(v,"quoteId"),id(v,"unitId"),id(v,"businessId"),id(map(v.get("customFields")),"warehouseId"),
            str(v,"customerName"),str(v,"sellerName"),date(v,"saleDate"),str(v,"currency"),num(v,"subtotal"),num(v,"discountTotal"),num(v,"taxTotal"),num(v,"totalAmount"),
            Boolean.TRUE.equals(v.get("marginReady")),num(v,"marginTotal"),str(v,"commercialStatus"),str(v,"financeStatus"),str(v,"inventoryStatus"),str(v,"inventoryMovementStatus"),str(v,"deliveryStatus"),
            str(v,"commissionStatus"),num(v,"commissionAmount"),str(v,"paymentMethod"),str(v,"paymentReference"),List.copyOf(lines),str(v,"notes"),"POS".equalsIgnoreCase(str(v,"sourceType")));
    }
    static Contract contract(Map<String,Object> v) { return new Contract(id(v,"id"),str(v,"contractNumber"),id(v,"contactId"),id(v,"quoteId"),str(v,"title"),str(v,"clientName"),str(v,"contractType"),str(v,"country"),str(v,"status"),str(v,"signatureStatus"),date(v,"expirationDate"),str(v,"notes")); }
    static FollowUp followUp(Map<String,Object> v) { return new FollowUp(id(v,"id"),str(v,"caseNumber"),id(v,"contactId"),str(v,"clientName"),str(v,"relationType"),str(v,"postSaleType"),str(v,"status"),date(v,"nextFollowUpDate"),date(v,"renewalDate"),str(v,"nextAction"),str(v,"notes")); }
    static Rule rule(Map<String,Object> v) { return new Rule(id(v,"id"),str(v,"ruleCode"),str(v,"name"),ids(v.get("userIds")),ids(v.get("productIds")),str(v,"type"),num(v,"value"),str(v,"status"),date(v,"validFrom"),date(v,"validUntil"),v.get("priority") instanceof Number n?n.intValue():0,str(v,"notes")); }
    static List<?> list(Object v) {return v instanceof List<?> l?l:List.of();}
    static Map<String,Object> map(Object v) {var m=new LinkedHashMap<String,Object>();if(v instanceof Map<?,?> raw)raw.forEach((k,x)->m.put(String.valueOf(k),x));return m;}
    static Long id(Map<String,Object> v,String k) {var x=v.get(k);return x==null||x.toString().isBlank()?null:Long.valueOf(x.toString());}
    static String str(Map<String,Object> v,String k) {return v.get(k)==null?null:String.valueOf(v.get(k));}
    static BigDecimal num(Map<String,Object> v,String k) {return v.get(k)==null?BigDecimal.ZERO:new BigDecimal(v.get(k).toString());}
    static BigDecimal nullableNum(Map<String,Object> v,String k) {return v.get(k)==null?null:num(v,k);}
    static LocalDate date(Map<String,Object> v,String k) {return v.get(k)==null||v.get(k).toString().isBlank()?null:LocalDate.parse(v.get(k).toString());}
    static List<Long> ids(Object v) {return list(v).stream().map(x->Long.valueOf(x.toString())).toList();}
}
