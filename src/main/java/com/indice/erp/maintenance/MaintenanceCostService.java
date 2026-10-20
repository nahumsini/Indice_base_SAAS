package com.indice.erp.maintenance;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.sales.InventoryAssistantService;
import com.indice.erp.sales.InventoryAssistantContracts;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.expenses.ExpenseService;
import com.indice.erp.finance.expenses.dto.ExpenseResponse;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.maintenance.MaintenanceDtos.*;
import static com.indice.erp.maintenance.MaintenancePolicy.*;

@Service
public class MaintenanceCostService {
    private final MaintenanceRepository db;private final MaintenanceAccess access;private final MaintenanceService service;
    private final InventoryAssistantService inventory;private final ExpenseService expenses;private final FinanceAccessService finance;
    private final ModuleAccessService modules;
    private final FinanceBusinessTimeZoneResolver timeZones;
    public MaintenanceCostService(MaintenanceRepository db,MaintenanceAccess access,MaintenanceService service,
        InventoryAssistantService inventory,ExpenseService expenses,FinanceAccessService finance,ModuleAccessService modules,FinanceBusinessTimeZoneResolver timeZones){this.db=db;this.access=access;this.service=service;this.inventory=inventory;this.expenses=expenses;this.finance=finance;this.modules=modules;this.timeZones=timeZones;}
    private void owner(AuthSessionUser actor,String module,String tab,boolean mutation){MaintenanceAccess.manage(actor);if(!access.ownerAccess(actor,module,tab)||mutation&&!modules.companyCanAccessForMutation(actor.companyId(),module))throw new SecurityException();}
    private FinanceContext context(AuthSessionUser actor){owner(actor,"expenses","expenses",false);return finance.resolveAssistantContext(actor,"expenses").orElseThrow(SecurityException::new);}
    private Order mutable(AuthSessionUser actor,long id,long expected){var order=db.order(actor,id);version(order.version(),expected);require(!TERMINAL.contains(order.status()),"maintenance_order_closed");return order;}
    private void changed(AuthSessionUser actor,long id,String action,String reason){db.jdbc().update("UPDATE maintenance_orders SET version=version+1 WHERE company_id=? AND id=?",actor.companyId(),id);db.audit(actor,"ORDER",id,action,reason);}
    public Object balances(AuthSessionUser actor,String search,String cursor){owner(actor,"inventory","inventory",false);return inventory.read(actor,"list_inventory_balances",new InventoryAssistantContracts.Query(null,null,null,search,null,null,null,null,25,cursor));}
    public Page<ExpenseLink> expenseOptions(AuthSessionUser actor,String search,int page,int size){var rows=expenses.assistantList(context(actor)).expenses().stream().filter(e->e.deletedAt()==null&&e.concept().toLowerCase(Locale.ROOT).contains(search.toLowerCase(Locale.ROOT))).toList();int start=Math.min((page-1)*size,rows.size());return new Page<>(rows.subList(start,Math.min(start+size,rows.size())).stream().map(e->project(e,"REFERENCE")).toList(),rows.size(),page,size);}
    @Transactional public OrderDetail labor(AuthSessionUser actor,long id,LaborInput input,String key){
        actor=access.lock(actor,"orders");Long prior=service.replay(actor,"LABOR_"+id,key,input);if(prior!=null)return db.detail(actor,id);
        var order=mutable(actor,id,input.expectedVersion());require(Set.of("IN_PROGRESS","WAITING_PARTS","WAITING_VENDOR").contains(order.status()),"maintenance_execution_required");
        var settings=db.settings(actor.companyId());require(settings.currency().equals(order.currency()),"maintenance_currency_mismatch");var amount=settings.hourlyRate().multiply(BigDecimal.valueOf(input.minutes())).divide(BigDecimal.valueOf(60),4,RoundingMode.HALF_UP);
        long entry=db.insert("INSERT INTO maintenance_labor(company_id,order_id,technician_id,minutes,hourly_rate,amount,currency,note) VALUES(?,?,?,?,?,?,?,?)",actor.companyId(),id,actor.userId(),input.minutes(),settings.hourlyRate(),amount,order.currency(),input.note().trim());service.remember(actor,"LABOR_"+id,key,input,entry);changed(actor,id,"LABOR_RECORDED",input.minutes()+" min");return db.detail(actor,id);
    }
    @Transactional public OrderDetail reverseLabor(AuthSessionUser actor,long id,long entry,VersionReason input){
        actor=access.lock(actor,"orders");MaintenanceAccess.manage(actor);mutable(actor,id,input.expectedVersion());require(db.jdbc().update("UPDATE maintenance_labor SET reversed_at=UTC_TIMESTAMP(6) WHERE company_id=? AND order_id=? AND id=? AND reversed_at IS NULL",actor.companyId(),id,entry)==1,"maintenance_labor_unavailable");changed(actor,id,"LABOR_REVERSED",input.reason());return db.detail(actor,id);
    }
    @Transactional public OrderDetail part(AuthSessionUser actor,long id,PartInput input,String key){
        actor=access.lock(actor,"orders");owner(actor,"inventory","inventory",true);Long prior=service.replay(actor,"PART_"+id,key,input);if(prior!=null)return db.detail(actor,id);var order=mutable(actor,id,input.expectedVersion());
        var movement=new InventoryAssistantContracts.MovementInput(input.warehouseId(),null,LocalDate.now(timeZones.resolve(actor.companyId())),null,"Maintenance order #"+id,"MAINTENANCE-"+id,List.of(new InventoryAssistantContracts.MovementLine(input.productId(),input.quantity(),null)));
        var change=new InventoryAssistantContracts.Change(null,null,null,null,movement,null);var prepared=inventory.prepare(actor,"issue_inventory_stock",change);
        var balance=prepared.before().balances().stream().filter(b->b.productId()==input.productId()&&b.warehouseId()==input.warehouseId()).findFirst().orElseThrow();require(order.currency().equals(balance.currency()),"maintenance_currency_mismatch");
        var result=inventory.executeMaintenance(actor,prepared,UUID.randomUUID().toString());var saved=result.records().movements().getFirst();
        long entry=db.insert("INSERT INTO maintenance_parts(company_id,order_id,movement_id,product_name,warehouse_name,quantity,unit_cost,currency) VALUES(?,?,?,?,?,?,?,?)",actor.companyId(),id,saved.id(),balance.productName(),balance.warehouseName(),input.quantity(),saved.unitCost(),order.currency());service.remember(actor,"PART_"+id,key,input,entry);changed(actor,id,"PART_ISSUED",balance.productName());return db.detail(actor,id);
    }
    @Transactional public OrderDetail reversePart(AuthSessionUser actor,long id,long entry,VersionReason input){
        actor=access.lock(actor,"orders");owner(actor,"inventory","inventory",true);mutable(actor,id,input.expectedVersion());var row=db.one(db.jdbc().queryForList("SELECT movement_id FROM maintenance_parts WHERE company_id=? AND order_id=? AND id=? AND reversal_id IS NULL",actor.companyId(),id,entry));long movement=((Number)row.get("movement_id")).longValue();
        var prepared=inventory.prepare(actor,"cancel_inventory_movement",new InventoryAssistantContracts.Change(movement,null,null,null,null,input.reason()));var result=inventory.executeMaintenance(actor,prepared,UUID.randomUUID().toString());
        db.jdbc().update("UPDATE maintenance_parts SET reversal_id=? WHERE company_id=? AND order_id=? AND id=?",result.records().movements().getFirst().id(),actor.companyId(),id,entry);changed(actor,id,"PART_REVERSED",input.reason());return db.detail(actor,id);
    }
    @Transactional public OrderDetail linkExpense(AuthSessionUser actor,long id,ExpenseInput input){
        actor=access.lock(actor,"orders");var order=db.order(actor,id);MaintenanceAccess.manage(actor);var expense=expenses.assistantGet(context(actor),input.expenseId());
        require(Set.of("SERVICE","REFERENCE").contains(input.costType()),"maintenance_cost_type_invalid");
        require(expense.deletedAt()==null&&Objects.equals(expense.unitId(),order.unitId())&&Objects.equals(expense.businessId(),order.businessId()),"maintenance_expense_scope_invalid");
        if(input.costType().equals("SERVICE"))require(order.currency().equals(expense.currencyCode())&&expense.purchaseOrderId()==null,"maintenance_expense_duplicates_parts");
        var existing=db.jdbc().queryForList("SELECT order_id,cost_type FROM maintenance_expense_links WHERE company_id=? AND expense_id=?",actor.companyId(),input.expenseId());
        if(!existing.isEmpty()){require(((Number)existing.getFirst().get("order_id")).longValue()==id&&existing.getFirst().get("cost_type").equals(input.costType()),"maintenance_expense_already_linked");return db.detail(actor,id);}
        mutable(actor,id,input.expectedVersion());
        db.jdbc().update("INSERT INTO maintenance_expense_links(company_id,order_id,expense_id,cost_type,created_by) VALUES(?,?,?,?,?)",actor.companyId(),id,input.expenseId(),input.costType(),actor.userId());changed(actor,id,"EXPENSE_LINKED",expense.folio());return db.detail(actor,id);
    }
    public Costs costs(AuthSessionUser actor,long id){
        MaintenanceAccess.manage(actor);var order=db.order(actor,id);boolean stock=access.ownerAccess(actor,"inventory","inventory"),financial=access.ownerAccess(actor,"expenses","expenses");
        var labor=db.jdbc().query("SELECT * FROM maintenance_labor WHERE company_id=? AND order_id=? ORDER BY id",(r,n)->new Labor(r.getLong("id"),r.getLong("technician_id"),r.getInt("minutes"),r.getBigDecimal("hourly_rate"),r.getBigDecimal("amount"),r.getString("currency"),r.getString("note"),r.getTimestamp("reversed_at")!=null),actor.companyId(),id);
        var parts=stock?db.jdbc().query("SELECT * FROM maintenance_parts WHERE company_id=? AND order_id=? ORDER BY id",(r,n)->new Part(r.getLong("id"),r.getLong("movement_id"),r.getString("product_name"),r.getString("warehouse_name"),r.getBigDecimal("quantity"),r.getBigDecimal("unit_cost"),r.getString("currency"),r.getObject("reversal_id")!=null),actor.companyId(),id):List.<Part>of();
        boolean partsAccessible=true;
        var visibleParts=new ArrayList<Part>();
        for(var part:parts)try{
            inventory.read(actor,"get_inventory_movement",new InventoryAssistantContracts.Query(part.movementId(),null,null,null,null,null,null,null,null,null));visibleParts.add(part);
        }catch(SecurityException|NoSuchElementException|com.indice.erp.finance.FinanceApiException unavailable){partsAccessible=false;}
        parts=List.copyOf(visibleParts);
        var links=db.jdbc().queryForList("SELECT expense_id,cost_type FROM maintenance_expense_links WHERE company_id=? AND order_id=? ORDER BY expense_id",actor.companyId(),id);var projected=new ArrayList<ExpenseLink>();
        for(var link:links){long expense=((Number)link.get("expense_id")).longValue();String type=String.valueOf(link.get("cost_type"));ExpenseLink view=new ExpenseLink(expense,"",type,"",null,null,false);
            if(financial)try{view=project(expenses.assistantGet(context(actor),expense),type);}catch(SecurityException|NoSuchElementException|org.springframework.web.server.ResponseStatusException|com.indice.erp.finance.FinanceApiException inaccessible){/* Explicit unavailable projection; never fabricate a zero. */}projected.add(view);}
        var laborTotal=labor.stream().filter(l->!l.reversed()).map(Labor::amount).reduce(BigDecimal.ZERO,BigDecimal::add);var partsTotal=stock&&partsAccessible?parts.stream().filter(p->!p.reversed()).map(p->p.quantity().multiply(p.unitCost())).reduce(BigDecimal.ZERO,BigDecimal::add):null;
        boolean complete=partsAccessible&&projected.stream().allMatch(e->e.available()&&(!e.costType().equals("SERVICE")||order.currency().equals(e.currency())))&&(stock||db.jdbc().queryForObject("SELECT COUNT(*) FROM maintenance_parts WHERE company_id=? AND order_id=?",Long.class,actor.companyId(),id)==0);
        var serviceTotal=projected.stream().filter(e->e.available()&&e.costType().equals("SERVICE")&&order.currency().equals(e.currency())).map(ExpenseLink::actual).reduce(BigDecimal.ZERO,BigDecimal::add);var paid=projected.stream().filter(e->e.available()&&e.costType().equals("SERVICE")&&order.currency().equals(e.currency())).map(ExpenseLink::paid).reduce(BigDecimal.ZERO,BigDecimal::add);
        return new Costs(order.currency(),order.estimatedAmount(),laborTotal,partsTotal,complete?serviceTotal:null,complete?money(laborTotal.add(partsTotal==null?BigDecimal.ZERO:partsTotal).add(serviceTotal)):null,complete?paid:null,complete,labor,parts,projected);
    }
    private static ExpenseLink project(ExpenseResponse expense,String type){boolean posted=Set.of("APPROVED","ORDERED","PARTIALLY_PAID","PAID","CLOSED").contains(expense.status().name());return new ExpenseLink(expense.id(),expense.concept(),type,expense.currencyCode(),posted&&expense.deletedAt()==null?expense.totalAmount():BigDecimal.ZERO,expense.paidAmount()==null?BigDecimal.ZERO:expense.paidAmount(),true);}
}
