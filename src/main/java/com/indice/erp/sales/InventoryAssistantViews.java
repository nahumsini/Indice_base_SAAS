package com.indice.erp.sales;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import static com.indice.erp.sales.InventoryAssistantContracts.*;

final class InventoryAssistantViews {
    private InventoryAssistantViews() { }
    static ProductView product(Map<String,Object> p) {
        var packaging=map(map(p.get("metadata")).get("packaging"));
        String unit=Objects.toString(packaging.get("baseUnit"),"Piece");
        boolean ready="active".equalsIgnoreCase(text(p,"status")) && SalesService.PRODUCT_SALES_VISIBILITIES.contains(Objects.toString(text(p,"visibility"),"").toLowerCase(Locale.ROOT)) && decimal(p,"price").signum()>0;
        return new ProductView(id(p,"id"),text(p,"productCode"),text(p,"name"),text(p,"sku"),text(p,"description"),text(p,"category"),text(p,"type"),
            decimal(p,"price"),decimal(p,"cost"),text(p,"currency"),text(p,"taxCategory"),text(p,"status"),text(p,"visibility"),bool(p,"inventoryReady"),bool(p,"posReady"),unit,ready);
    }
    static WarehouseView warehouse(Map<String,Object> w) {
        return new WarehouseView(id(w,"id"),text(w,"warehouseCode"),text(w,"name"),text(w,"type"),id(w,"businessUnitId"),text(w,"businessUnitName"),
            id(w,"businessId"),text(w,"businessName"),id(w,"responsibleUserId"),text(w,"responsibleName"),text(w,"addressNote"),text(w,"status"));
    }
    static BalanceView balance(Map<String,Object> b, ProductView product) {
        var available=decimal(b,"availableQuantity");var reserved=decimal(b,"reservedQuantity");var minimum=decimal(b,"minimumQuantity");
        return new BalanceView(id(b,"id"),id(b,"productId"),product.name(),id(b,"warehouseId"),text(b,"warehouseName"),product.inventoryUnit(),product.currency(),
            available,reserved,available.subtract(reserved),minimum,decimal(b,"unitCost"),bool(b,"usesInventory"),available.subtract(reserved).compareTo(minimum)<0);
    }
    static MovementView movement(Map<String,Object> m) {
        return new MovementView(id(m,"id"),text(m,"movementNumber"),text(m,"groupId"),id(m,"productId"),text(m,"productName"),text(m,"movementType"),
            decimal(m,"quantity"),decimal(m,"unitCost"),id(m,"fromWarehouseId"),id(m,"toWarehouseId"),text(m,"reason"),text(m,"reference"),date(m,"movementDate"),text(m,"status"),id(map(m.get("metadata")),"reversalOf"));
    }
    static Map<String,Object> map(Object value) {
        var result=new LinkedHashMap<String,Object>();if(value instanceof Map<?,?> m)m.forEach((k,v)->result.put(String.valueOf(k),v));return result;
    }
    static Long id(Map<String,Object> value,String key) {
        var raw=value.get(key); if(raw==null||String.valueOf(raw).isBlank())return null;
        try{return new BigDecimal(String.valueOf(raw)).longValueExact();}catch(RuntimeException e){throw new IllegalStateException("Invalid persisted inventory identifier.");}
    }
    static String text(Map<String,Object> value,String key) { return value.get(key)==null?null:String.valueOf(value.get(key)); }
    static BigDecimal decimal(Map<String,Object> value,String key) { return value.get(key)==null?BigDecimal.ZERO:new BigDecimal(String.valueOf(value.get(key))); }
    static boolean bool(Map<String,Object> value,String key) {var v=value.get(key);return Boolean.TRUE.equals(v)||"1".equals(String.valueOf(v))||"true".equalsIgnoreCase(String.valueOf(v));}
    static LocalDate date(Map<String,Object> value,String key) { return value.get(key)==null?null:LocalDate.parse(String.valueOf(value.get(key)).substring(0,10)); }
    static BigDecimal quantity(BigDecimal value,String field,boolean zeroAllowed,String unit) {
        if(unit==null||!Set.of("piece","kilogram","gram","liter","meter").contains(unit.toLowerCase(Locale.ROOT)))throw new IllegalArgumentException("Review this legacy inventory unit through its owner before changing stock.");
        if(value==null||value.signum()<0||(!zeroAllowed&&value.signum()==0)||value.compareTo(new BigDecimal("9999999999999.999"))>0)throw new IllegalArgumentException(field+" must be a valid nonnegative inventory quantity.");
        try { value=value.setScale("Piece".equalsIgnoreCase(unit)?0:3,RoundingMode.UNNECESSARY); }
        catch(ArithmeticException e){throw new IllegalArgumentException("Piece quantities must be whole; other inventory units support three decimals.");}
        return value;
    }
    static BigDecimal cost(BigDecimal value) {
        if(value==null||value.signum()<0||value.compareTo(new BigDecimal("9999999999999.9999"))>0)throw new IllegalArgumentException("Nonnegative native unit cost required.");
        try{return value.setScale(4,RoundingMode.UNNECESSARY);}catch(ArithmeticException e){throw new IllegalArgumentException("Unit cost supports four decimals.");}
    }
}
