package com.indice.erp.sales;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static com.indice.erp.sales.InventoryAssistantContracts.*;

@Repository
class InventoryAssistantRepository {
    private final JdbcTemplate jdbc;
    private final SalesRepository sales;
    private final ObjectMapper mapper;
    InventoryAssistantRepository(JdbcTemplate jdbc, SalesRepository sales, ObjectMapper mapper) { this.jdbc = jdbc; this.sales = sales; this.mapper=mapper; }

    static String collection(String kind) {
        return switch (kind) {
            case "product" -> "products"; case "warehouse" -> "inventory-warehouses";
            case "balance" -> "inventory-balances"; case "movement" -> "inventory-movements";
            default -> throw new IllegalArgumentException("Unsupported inventory entity.");
        };
    }
    private String table(String kind) { return SalesDefinitions.definitions().get(collection(kind)).tableName(); }
    Map<String,Object> record(AuthSessionUser user, HrOperationalScope scope, String kind, long id, boolean lock) {
        var args = new ArrayList<Object>(List.of(user.companyId(), id));
        var sql = "SELECT e.id FROM " + table(kind) + " e WHERE e.company_id=? AND e.id=? AND e.deleted_at IS NULL"
            + scoped(kind, scope, args) + (lock ? " FOR UPDATE" : "");
        if (jdbc.queryForList(sql, Long.class, args.toArray()).isEmpty()) throw new NoSuchElementException("Inventory record not found.");
        return sales.get(user.companyId(), SalesDefinitions.definitions().get(collection(kind)), id);
    }
    Map<String,Object> balance(AuthSessionUser user, HrOperationalScope scope, long product, long warehouse, boolean lock) {
        var ids = jdbc.queryForList("SELECT id FROM sales_inventory_balances WHERE company_id=? AND product_id=? AND warehouse_id=? AND deleted_at IS NULL"
            + (lock ? " FOR UPDATE" : ""), Long.class, user.companyId(), product, warehouse);
        if (ids.size() > 1) throw new IllegalStateException("Inventory balance is not unique.");
        return ids.isEmpty() ? null : record(user, scope, "balance", ids.getFirst(), lock);
    }
    List<Long> ids(AuthSessionUser user, HrOperationalScope scope, String kind, Query query) {
        var args = new ArrayList<Object>(List.of(user.companyId()));
        var where = " WHERE e.company_id=? AND e.deleted_at IS NULL" + scoped(kind, scope, args);
        if (query.id()!=null) { where += " AND e.id=?"; args.add(query.id()); }
        if (query.productId()!=null) {
            if (!Set.of("balance","movement").contains(kind)) throw new IllegalArgumentException("Product filter requires balances or history.");
            where += " AND e.product_id=?"; args.add(query.productId());
        }
        if (query.warehouseId()!=null) {
            if (kind.equals("balance")) { where += " AND e.warehouse_id=?"; args.add(query.warehouseId()); }
            else if (kind.equals("movement")) { where += " AND (e.from_warehouse_id=? OR e.to_warehouse_id=?)"; args.add(query.warehouseId()); args.add(query.warehouseId()); }
            else throw new IllegalArgumentException("Warehouse filter requires balances or history.");
        }
        if (query.status()!=null) {
            if (kind.equals("balance")) throw new IllegalArgumentException("Balances have no status.");
            where += " AND LOWER(e.status)=LOWER(?)"; args.add(query.status());
        }
        if (query.query()!=null && !query.query().isBlank()) {
            var column = switch(kind) { case "product", "warehouse" -> "name"; case "balance" -> "warehouse_name"; default -> "product_name"; };
            where += " AND LOCATE(LOWER(?),LOWER(e."+column+"))>0"; args.add(query.query().trim());
        }
        if (query.belowMinimum()!=null) {
            if (!kind.equals("balance")) throw new IllegalArgumentException("Minimum filter requires balances.");
            where += Boolean.TRUE.equals(query.belowMinimum()) ? " AND e.available_quantity-e.reserved_quantity<e.minimum_quantity" : " AND e.available_quantity-e.reserved_quantity>=e.minimum_quantity";
        }
        if (query.from()!=null || query.to()!=null) {
            if (!kind.equals("movement")) throw new IllegalArgumentException("Date filter requires history.");
            if (query.from()!=null) { where += " AND e.movement_date>=?"; args.add(query.from()); }
            if (query.to()!=null) { where += " AND e.movement_date<=?"; args.add(query.to()); }
        }
        return jdbc.queryForList("SELECT e.id FROM "+table(kind)+" e"+where+" ORDER BY e.id",Long.class,args.toArray());
    }
    private String scoped(String kind, HrOperationalScope scope, List<Object> args) {
        if (scope.type()==HrOperationalScope.Type.UNASSIGNED) return " AND 1=0";
        if (kind.equals("product") || scope.isCorporateOffice()) return ""; // Catalog is company-owned; balances own location scope.
        if (kind.equals("warehouse")) {
            args.addAll(scope.assignmentParameters());
            return scope.assignmentPredicate("e.business_unit_id","e.business_id","e.company_id");
        }
        var warehouse = "EXISTS(SELECT 1 FROM sales_inventory_warehouses w WHERE w.company_id=e.company_id AND w.id=%s AND w.deleted_at IS NULL%s)";
        if (kind.equals("balance")) {
            args.addAll(scope.assignmentParameters());
            return " AND "+warehouse.formatted("e.warehouse_id",scope.assignmentPredicate("w.business_unit_id","w.business_id","w.company_id"));
        }
        // A cross-location movement is visible only when both occupied ends are authorized.
        args.addAll(scope.assignmentParameters()); args.addAll(scope.assignmentParameters());
        return " AND (e.from_warehouse_id IS NOT NULL OR e.to_warehouse_id IS NOT NULL) AND (e.from_warehouse_id IS NULL OR "+warehouse.formatted("e.from_warehouse_id",scope.assignmentPredicate("w.business_unit_id","w.business_id","w.company_id"))+")"
            +" AND (e.to_warehouse_id IS NULL OR "+warehouse.formatted("e.to_warehouse_id",scope.assignmentPredicate("w.business_unit_id","w.business_id","w.company_id"))+")";
    }
    void lockReferences(AuthSessionUser user, Change change) {
        var warehouses = new TreeSet<Long>(); var products = new TreeSet<Long>();
        if(change.stock()!=null) { add(products,change.stock().productId()); add(warehouses,change.stock().warehouseId()); }
        if(change.movement()!=null) {
            add(warehouses,change.movement().fromWarehouseId());add(warehouses,change.movement().toWarehouseId());
            if(change.movement().items()!=null)change.movement().items().forEach(line->{if(line!=null)add(products,line.productId());});
        }
        products.forEach(id->jdbc.queryForList("SELECT id FROM sales_products WHERE company_id=? AND id=? FOR UPDATE",user.companyId(),id));
        warehouses.forEach(id->jdbc.queryForList("SELECT id FROM sales_inventory_warehouses WHERE company_id=? AND id=? FOR UPDATE",user.companyId(),id));
        products.forEach(id->jdbc.queryForList("SELECT id FROM sales_inventory_balances WHERE company_id=? AND product_id=? ORDER BY warehouse_id,id FOR UPDATE",user.companyId(),id));
        if(change.movement()!=null&&change.movement().providerId()!=null)
            jdbc.queryForList("SELECT id FROM finance_providers WHERE company_id=? AND id=? FOR UPDATE",user.companyId(),change.movement().providerId());
    }
    void lockMaintenance(AuthSessionUser user,HrOperationalScope scope,String action,long id) {
        String kind=action.endsWith("_product")?"product":"warehouse";
        record(user,scope,kind,id,false);
        if(kind.equals("warehouse"))jdbc.queryForList("SELECT id FROM pos_cash_registers WHERE company_id=? AND warehouse_id=? ORDER BY id FOR UPDATE",user.companyId(),id);
        record(user,scope,kind,id,true);
        if(kind.equals("product"))jdbc.queryForList("SELECT id FROM sales_inventory_balances WHERE company_id=? AND product_id=? ORDER BY warehouse_id,id FOR UPDATE",user.companyId(),id);
    }
    void lockAssignment(AuthSessionUser user,WarehouseInput change) {
        if(change==null)return;
        if(change.unitId()!=null)jdbc.queryForList("SELECT id FROM units WHERE id=? AND (company_id=? OR company_id IS NULL) FOR UPDATE",change.unitId(),user.companyId());
        if(change.businessId()!=null)jdbc.queryForList("SELECT id FROM businesses WHERE id=? AND (company_id=? OR company_id IS NULL) FOR UPDATE",change.businessId(),user.companyId());
    }
    boolean configured(long company,long product) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM sales_inventory_balances WHERE company_id=? AND product_id=?",Long.class,company,product)>0;
    }
    void registerOrigin(long company,String action,MovementView movement,String correlation) {
        if(jdbc.queryForObject("SELECT COUNT(*) FROM sales_inventory_movements WHERE company_id=? AND id=?",Long.class,company,movement.id())!=1)throw new IllegalStateException("Inventory provenance ownership mismatch.");
        try {jdbc.update("INSERT INTO inventory_assistant_movement_origins(company_id,movement_id,action,snapshot_json,correlation_id) VALUES (?,?,?,?,?)",company,movement.id(),action,mapper.writeValueAsString(movement),correlation);}
        catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Inventory provenance failed.",e);}
    }
    MovementView reversibleOrigin(long company,long movement,boolean lock) {
        var rows=jdbc.queryForList("SELECT action,snapshot_json,reversed_by_movement_id FROM inventory_assistant_movement_origins WHERE company_id=? AND movement_id=?"+(lock?" FOR UPDATE":""),company,movement);
        if(rows.isEmpty()||rows.getFirst().get("reversed_by_movement_id")!=null||!Set.of("receive_inventory_stock","issue_inventory_stock","transfer_inventory_stock","count_inventory_stock").contains(rows.getFirst().get("action")))
            throw new IllegalArgumentException("Use the original owner's reversal for this movement; an unreversed assistant origin is required.");
        try{return mapper.readValue(String.valueOf(rows.getFirst().get("snapshot_json")),MovementView.class);}catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException("Invalid inventory origin.",e);}
    }
    void linkReversal(long company,long original,long compensating) {
        if(jdbc.update("UPDATE inventory_assistant_movement_origins SET reversed_by_movement_id=? WHERE company_id=? AND movement_id=? AND reversed_by_movement_id IS NULL",compensating,company,original)!=1)throw new Changed();
    }
    private static void add(Set<Long> values, Long id) { if(id!=null)values.add(id); }
    Map<String,Object> assignment(long company,long unit,long business) {
        var value=sales.organizationAssignment(company,unit,business);
        if(value==null)throw new IllegalArgumentException("Business does not belong to the selected company and unit.");
        return value;
    }
    Map<String,Object> responsible(AuthSessionUser user, HrOperationalScope scope, long id, boolean lock) {
        var args=new ArrayList<Object>(List.of(user.companyId(),id));args.addAll(scope.assignmentParameters());
        var rows=jdbc.queryForList("SELECT uc.id,COALESCE(NULLIF(up.full_name,''),u.full_name) name FROM user_companies uc JOIN users u ON u.id=uc.user_id"
            +" LEFT JOIN user_profiles up ON up.user_id=u.id LEFT JOIN user_work_profiles wp ON wp.company_id=uc.company_id AND wp.user_company_id=uc.id"
            +" WHERE uc.company_id=? AND uc.id=? AND LOWER(uc.status) IN ('active','activo')"
            +scope.assignmentPredicate("wp.unit_id","wp.business_id","uc.company_id")+(lock?" FOR UPDATE":""),args.toArray());
        return rows.stream().findFirst().orElseThrow(()->new NoSuchElementException("Active responsible collaborator not found in scope."));
    }
    boolean history(long company,long product) { return sales.hasProductInventoryHistory(company,product); }
    void requireWarehouseInactiveSafe(long company,long id) {
        if(jdbc.queryForObject("SELECT COUNT(*) FROM pos_shifts WHERE company_id=? AND cash_register_id IN (SELECT id FROM pos_cash_registers WHERE company_id=? AND warehouse_id=?) AND status IN ('OPEN','CLOSING')",Integer.class,company,company,id)>0)
            throw new IllegalArgumentException("Close the warehouse's active POS shifts before inactivation.");
        if(jdbc.queryForObject("SELECT COUNT(*) FROM sales_inventory_balances WHERE company_id=? AND warehouse_id=? AND deleted_at IS NULL AND (available_quantity<>0 OR reserved_quantity<>0)",Integer.class,company,id)>0)
            throw new IllegalArgumentException("Move stock and resolve reservations before warehouse inactivation.");
    }
}
