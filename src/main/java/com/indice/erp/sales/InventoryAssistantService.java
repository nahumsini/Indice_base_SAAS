package com.indice.erp.sales;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.finance.providers.ProviderService;
import com.indice.erp.finance.providers.ProviderStatus;
import com.indice.erp.finance.shared.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.sales.InventoryAssistantContracts.*;
import static com.indice.erp.sales.InventoryAssistantViews.*;

/** Inventory use cases owned by Sales Inventory, with no alternate stock ledger or calculation engine. */
@Service
public class InventoryAssistantService {
    public static final Set<String> READS=Set.of("list_inventory_products","get_inventory_product","list_inventory_warehouses","get_inventory_warehouse",
        "list_inventory_balances","get_inventory_balance","list_inventory_movements","get_inventory_movement","get_inventory_metrics");
    public static final Set<String> ACTIONS=Set.of("create_inventory_product","update_inventory_product","inactivate_inventory_product",
        "create_inventory_warehouse","update_inventory_warehouse","inactivate_inventory_warehouse","configure_inventory_stock",
        "receive_inventory_stock","issue_inventory_stock","transfer_inventory_stock","count_inventory_stock","cancel_inventory_movement");
    private final InventoryAssistantRepository repository;
    private final SalesService sales;
    private final SalesReferenceService references;
    private final HrOperationalScopeService scopes;
    private final ProviderService providers;
    private final FinanceBusinessTimeZoneResolver timeZones;
    private final ObjectMapper mapper;
    public InventoryAssistantService(InventoryAssistantRepository repository,SalesService sales,SalesReferenceService references,
        HrOperationalScopeService scopes,ProviderService providers,FinanceBusinessTimeZoneResolver timeZones,ObjectMapper mapper) {
        this.repository=repository;this.sales=sales;this.references=references;this.scopes=scopes;this.providers=providers;this.timeZones=timeZones;this.mapper=mapper;
    }
    @Transactional(readOnly=true)
    public Object read(AuthSessionUser user,String tool,Query query) {
        if(!READS.contains(tool))throw new IllegalArgumentException("Unsupported inventory read.");
        var q=query==null?new Query(null,null,null,null,null,null,null,null,null,null):query;validateQuery(q);
        var scope=scope(user);String kind=tool.contains("product")?"product":tool.contains("warehouse")?"warehouse":tool.contains("movement")?"movement":"balance";
        if(tool.startsWith("get_")&&!tool.equals("get_inventory_metrics"))return view(user,scope,kind,repository.record(user,scope,kind,positive(q.id(),"id"),false));
        var ids=repository.ids(user,scope,kind,q);
        if(tool.equals("get_inventory_metrics")) {
            var values=new TreeMap<String,BigDecimal>();long below=0;
            for(var id:ids) {var b=(BalanceView)view(user,scope,"balance",repository.record(user,scope,"balance",id,false));if(b.belowMinimum())below++;
                values.merge(b.currency(),b.availableQuantity().multiply(b.unitCost()),BigDecimal::add);}
            return new Summary(ids.size(),below,values.entrySet().stream().map(e->new CurrencyValue(e.getKey(),e.getValue().setScale(4,RoundingMode.HALF_UP))).toList(),scope.type().name());
        }
        int size=q.limit()==null?25:q.limit();String binding=hash(Arrays.asList(user.companyId(),user.userId(),user.userCompanyId(),scope,kind,
            new Query(q.id(),q.productId(),q.warehouseId(),q.query(),q.status(),q.belowMinimum(),q.from(),q.to(),size,null)));
        int start=offset(q.cursor(),binding,ids.size());int end=Math.min(start+size,ids.size());
        var rows=ids.subList(start,end).stream().map(id->view(user,scope,kind,repository.record(user,scope,kind,id,false))).toList();
        boolean more=end<ids.size();return new Page<>(rows,ids.size(),more,more?Base64.getUrlEncoder().withoutPadding().encodeToString((end+":"+binding).getBytes(StandardCharsets.UTF_8)):null,scope.type().name());
    }
    @Transactional(readOnly=true)
    public Prepared prepare(AuthSessionUser user,String action,Change change) { return plan(user,action,change,false).prepared; }
    @Transactional
    public Result execute(AuthSessionUser user,Prepared confirmed,String correlation) {
        var scope=scope(user);Change change=confirmed.change();
        if(change.id()!=null&&(confirmed.action().endsWith("_product")||confirmed.action().endsWith("_warehouse")))repository.lockMaintenance(user,scope,confirmed.action(),change.id());
        repository.lockAssignment(user,change.warehouse());
        // Resolve reversal references under lock before locking their original stock locations.
        if(confirmed.action().equals("cancel_inventory_movement")) {
            var original=repository.record(user,scope,"movement",positive(change.id(),"id"),true);
            repository.lockReferences(user,reversalChange(change,original,LocalDate.now(timeZones.resolve(user.companyId()))));
        } else repository.lockReferences(user,change);
        Plan current;
        try {current=plan(user,confirmed.action(),change,true);}
        catch(IllegalArgumentException changedConstraint){throw new Changed();}
        if(!mapper.valueToTree(current.prepared).equals(mapper.valueToTree(confirmed)))throw new Changed();
        Snapshot result;
        if(current.collection!=null) {
            var saved=change.id()==null?sales.create(user.companyId(),user.userId(),current.collection,current.payload)
                :sales.update(user.companyId(),user.userId(),current.collection,change.id(),current.payload);
            result=current.collection.equals("products")?new Snapshot(List.of(product(saved)),List.of(),List.of(),List.of())
                :new Snapshot(List.of(),List.of(InventoryAssistantViews.warehouse(saved)),List.of(),List.of());
        } else {
            if(current.productActivation!=null)sales.update(user.companyId(),user.userId(),"products",current.productActivation,Map.of("inventoryReady",true));
            var payload=new LinkedHashMap<String,Object>();payload.put("balances",current.balances);
            var movementPayloads=new ArrayList<Map<String,Object>>();
            for(var raw:current.movements) {
                var m=new LinkedHashMap<>(raw);m.put("groupId",correlation);
                var metadata=map(m.get("metadata"));metadata.put("source","INDICE_ASSISTANT_INVENTORY");metadata.put("correlationId",correlation);m.put("metadata",metadata);movementPayloads.add(m);
            }
            payload.put("movements",movementPayloads);
            var committedMovements=new ArrayList<MovementView>();
            if(movementPayloads.isEmpty()) {
                for(var b:current.balances) {var v=new LinkedHashMap<>(b);Long id=id(v,"id");v.remove("id");
                    if(id==null)sales.create(user.companyId(),user.userId(),"inventory-balances",v);else sales.update(user.companyId(),user.userId(),"inventory-balances",id,v);}
            } else {
                var saved=sales.commitInventoryOperation(user.companyId(),user.userId(),payload);
                if(!(saved.get("movements") instanceof List<?> rows))throw new IllegalStateException("Inventory owner did not return its persisted movements.");
                for(var row:rows) {
                    var movement=InventoryAssistantViews.movement(map(row));committedMovements.add(movement);
                    repository.registerOrigin(user.companyId(),confirmed.action(),movement,correlation);
                }
            }
            if(confirmed.action().equals("cancel_inventory_movement"))sales.update(user.companyId(),user.userId(),"inventory-movements",change.id(),Map.of("status","cancelled"));
            if(confirmed.action().equals("cancel_inventory_movement"))repository.linkReversal(user.companyId(),change.id(),committedMovements.getFirst().id());
            var savedBalances=current.balances.stream().map(b->repository.balance(user,scope,id(b,"productId"),id(b,"warehouseId"),false)).map(b->InventoryAssistantViews.balance(b,product(repository.record(user,scope,"product",id(b,"productId"),false)))).toList();
            result=new Snapshot(List.of(),List.of(),savedBalances,List.copyOf(committedMovements));
        }
        return new Result(confirmed.action(),result);
    }
    public void requireResultAccess(AuthSessionUser user,Result result) {
        var scope=scope(user);
        result.records().products().forEach(p->repository.record(user,scope,"product",p.id(),false));
        result.records().warehouses().forEach(w->repository.record(user,scope,"warehouse",w.id(),false));
        result.records().balances().forEach(b->repository.record(user,scope,"balance",b.id(),false));
        result.records().movements().forEach(m->repository.record(user,scope,"movement",m.id(),false));
    }
    private Plan plan(AuthSessionUser user,String action,Change change,boolean lock) {
        if(!ACTIONS.contains(action)||change==null)throw new IllegalArgumentException("Named inventory change required.");
        var scope=scope(user);var p=new Plan(action,change);validateShape(action,change);
        if(action.endsWith("_product"))catalog(user,scope,p,lock);
        else if(action.endsWith("_warehouse"))warehouse(user,scope,p,lock);
        else if(action.equals("configure_inventory_stock"))configure(user,scope,p,lock);
        else movements(user,scope,p,lock);
        p.prepared=new Prepared(action,change,p.before,p.after,Map.copyOf(p.versions));return p;
    }
    private void catalog(AuthSessionUser user,HrOperationalScope scope,Plan p,boolean lock) {
        if(!Set.of("root","superadmin","admin","owner","dueno").contains(user.role().toLowerCase(Locale.ROOT)))throw new SecurityException("Catalog maintenance requires an administrative role.");
        boolean create=p.action.startsWith("create_");var before=create?new LinkedHashMap<String,Object>():record(user,scope,"product",positive(p.change.id(),"id"),lock,p);
        var input=p.change.product();var payload=input==null?new LinkedHashMap<String,Object>():nonNull(input);
        String unit=(String)payload.remove("inventoryUnit");
        if(p.action.startsWith("inactivate_"))payload.put("status","inactive");
        if(create) {payload.putIfAbsent("type","PRODUCT");payload.putIfAbsent("status","active");payload.putIfAbsent("visibility","commercial");payload.putIfAbsent("inventoryReady",false);payload.putIfAbsent("posReady",false);}
        var after=new LinkedHashMap<>(before);after.putAll(payload);
        required(text(after,"name"),"name",220);required(text(after,"currency"),"currency",3);
        try {Currency.getInstance(text(after,"currency"));}catch(IllegalArgumentException e){throw new IllegalArgumentException("ISO currency required.");}
        for(var field:List.of("price","cost")) {var v=decimal(after,field);if(v.signum()<0||v.precision()>15||v.stripTrailingZeros().scale()>(field.equals("cost")?4:2))throw new IllegalArgumentException(field+" exceeds native catalog precision (price: 2 decimals; cost: 4).");}
        token(text(after,"type"),Set.of("product","package","service"),"type");token(text(after,"status"),Set.of("active","inactive","draft"),"status");
        token(text(after,"visibility"),Set.of("commercial","pos_ready","quote_only","internal"),"visibility");
        if(unit!=null) {
            token(unit,Set.of("piece","kilogram","gram","liter","meter"),"inventoryUnit");
            String canonical=unit.substring(0,1).toUpperCase(Locale.ROOT)+unit.substring(1).toLowerCase(Locale.ROOT);
            if(!create&&(repository.history(user.companyId(),p.change.id())||repository.configured(user.companyId(),p.change.id()))&&!canonical.equals(product(before).inventoryUnit()))throw new IllegalArgumentException("Inventory unit cannot change after stock configuration or history exists.");
            var metadata=map(before.get("metadata"));var packaging=map(metadata.get("packaging"));packaging.put("baseUnit",canonical);metadata.put("packaging",packaging);payload.put("metadata",metadata);after.put("metadata",metadata);
        }
        if("service".equalsIgnoreCase(text(after,"type"))&&bool(after,"inventoryReady"))throw new IllegalArgumentException("Services cannot track physical inventory.");
        if(!create&&repository.history(user.companyId(),p.change.id())) {
            if(!Objects.equals(text(before,"currency"),text(after,"currency"))||!Objects.equals(text(before,"type"),text(after,"type")))throw new IllegalArgumentException("Native currency and product type are immutable after inventory history.");
            if(bool(before,"inventoryReady")&&!bool(after,"inventoryReady"))throw new IllegalArgumentException("Keep inventory tracking while history exists.");
        }
        p.collection="products";p.payload=payload;p.before=new Snapshot(create?List.of():List.of(product(before)),List.of(),List.of(),List.of());p.after=new Snapshot(List.of(product(after)),List.of(),List.of(),List.of());
    }
    private void warehouse(AuthSessionUser user,HrOperationalScope scope,Plan p,boolean lock) {
        boolean create=p.action.startsWith("create_");var before=create?new LinkedHashMap<String,Object>():record(user,scope,"warehouse",positive(p.change.id(),"id"),lock,p);
        var input=p.change.warehouse();var payload=input==null?new LinkedHashMap<String,Object>():nonNull(input);
        if(payload.containsKey("unitId"))payload.put("businessUnitId",String.valueOf(payload.remove("unitId")));
        if(payload.containsKey("businessId"))payload.put("businessId",String.valueOf(payload.get("businessId")));
        Long responsible=payload.containsKey("responsibleUserCompanyId")?((Number)payload.remove("responsibleUserCompanyId")).longValue():null;
        if(responsible!=null) {var person=repository.responsible(user,scope,responsible,lock);p.versions.put("responsible:"+responsible,hash(person));payload.put("responsibleUserId",responsible.toString());payload.put("responsibleName",person.get("name"));}
        if(create){payload.putIfAbsent("type","main");payload.putIfAbsent("status","active");}
        if(p.action.startsWith("inactivate_"))payload.put("status","inactive");
        var after=new LinkedHashMap<>(before);after.putAll(payload);
        required(text(after,"name"),"name",180);required(text(after,"type"),"type",80);token(text(after,"status"),Set.of("active","inactive"),"status");
        Long unit=positive(id(after,"businessUnitId"),"unitId"),business=positive(id(after,"businessId"),"businessId");
        var assignment=repository.assignment(user.companyId(),unit,business);scopes.requireAssignmentInScope(user,unit,business);p.versions.put("assignment:"+unit+":"+business,hash(assignment));
        references.validateEntityPayload(user.companyId(),"inventory-warehouses",after);
        if(!create&&(!Objects.equals(id(before,"businessUnitId"),unit)||!Objects.equals(id(before,"businessId"),business)))throw new IllegalArgumentException("Create another warehouse when its business assignment changes; existing stock keeps its ownership.");
        if(!create&&"inactive".equalsIgnoreCase(text(after,"status")))repository.requireWarehouseInactiveSafe(user.companyId(),p.change.id());
        p.collection="inventory-warehouses";p.payload=after;p.before=new Snapshot(List.of(),create?List.of():List.of(InventoryAssistantViews.warehouse(before)),List.of(),List.of());p.after=new Snapshot(List.of(),List.of(InventoryAssistantViews.warehouse(after)),List.of(),List.of());
    }
    private void configure(AuthSessionUser user,HrOperationalScope scope,Plan p,boolean lock) {
        var c=p.change.stock();long productId=positive(c.productId(),"productId"),warehouseId=positive(c.warehouseId(),"warehouseId");
        var product=record(user,scope,"product",productId,lock,p);var warehouse=record(user,scope,"warehouse",warehouseId,lock,p);active(warehouse,"warehouse");active(product,"product");
        var view=product(product);if("service".equalsIgnoreCase(view.type()))throw new IllegalArgumentException("Services cannot track inventory.");
        if(!view.inventoryReady()) {if(!Boolean.TRUE.equals(c.enableInventory()))throw new IllegalArgumentException("Explicit enableInventory consent required for this product.");p.productActivation=productId;}
        var before=balance(user,scope,productId,warehouseId,lock,p);var after=before==null?newBalance(productId,warehouse):new LinkedHashMap<>(before);
        if(c.minimumQuantity()!=null)after.put("minimumQuantity",quantity(c.minimumQuantity(),"minimumQuantity",true,view.inventoryUnit()));
        if(c.usesInventory()!=null)after.put("usesInventory",c.usesInventory());
        if(!bool(after,"usesInventory")&&(decimal(after,"availableQuantity").signum()!=0||decimal(after,"reservedQuantity").signum()!=0||repository.history(user.companyId(),productId)))throw new IllegalArgumentException("Inventory tracking must retain existing stock and history.");
        p.balances.add(after);p.before=new Snapshot(List.of(view),List.of(InventoryAssistantViews.warehouse(warehouse)),before==null?List.of():List.of(InventoryAssistantViews.balance(before,view)),List.of());
        var afterProduct=new LinkedHashMap<>(product);if(p.productActivation!=null)afterProduct.put("inventoryReady",true);p.after=new Snapshot(List.of(product(afterProduct)),List.of(InventoryAssistantViews.warehouse(warehouse)),List.of(InventoryAssistantViews.balance(after,view)),List.of());
    }
    private void movements(AuthSessionUser user,HrOperationalScope scope,Plan p,boolean lock) {
        boolean reversal=p.action.equals("cancel_inventory_movement");Map<String,Object> original=null;
        Change selected=p.change;
        if(reversal) {original=record(user,scope,"movement",positive(selected.id(),"id"),lock,p);required(selected.reason(),"reason",1000);
            var origin=repository.reversibleOrigin(user.companyId(),selected.id(),lock);p.versions.put("origin:"+selected.id(),hash(origin));
            if(!mapper.valueToTree(origin).equals(mapper.valueToTree(InventoryAssistantViews.movement(original))))throw new IllegalArgumentException("The original movement changed; review an explicit owner correction.");
            selected=reversalChange(selected,original,LocalDate.now(timeZones.resolve(user.companyId())));
        }
        var m=selected.movement();required(m.reason(),"reason",1000);if(m.reference()!=null&&m.reference().length()>120)throw new IllegalArgumentException("Reference exceeds 120 characters.");
        if(m.date()==null||m.date().isAfter(LocalDate.now(timeZones.resolve(user.companyId()))))throw new IllegalArgumentException("Explicit nonfuture movement date required.");
        if(m.items()==null||m.items().isEmpty()||m.items().size()>100||m.items().stream().anyMatch(Objects::isNull))throw new IllegalArgumentException("Provide 1 to 100 inventory lines.");
        if(m.items().stream().map(MovementLine::productId).distinct().count()!=m.items().size())throw new IllegalArgumentException("Combine duplicate products into one movement line.");
        String type=reversal?"reversal":switch(p.action){case "receive_inventory_stock"->"supplierReceipt";case "issue_inventory_stock"->"writeOff";case "transfer_inventory_stock"->"transfer";case "count_inventory_stock"->"adjustment";default->throw new IllegalArgumentException("Unsupported movement.");};
        boolean transfer=type.equals("transfer")||(reversal&&m.fromWarehouseId()!=null&&m.toWarehouseId()!=null);
        if(transfer&&(m.fromWarehouseId()==null||m.toWarehouseId()==null||m.fromWarehouseId().equals(m.toWarehouseId())))throw new IllegalArgumentException("Transfer needs two distinct warehouses.");
        if(!transfer&&m.fromWarehouseId()!=null&&m.toWarehouseId()!=null)throw new IllegalArgumentException("This movement accepts one warehouse.");
        if(!reversal) {
            if(type.equals("supplierReceipt")&&(m.fromWarehouseId()!=null||m.toWarehouseId()==null||m.providerId()==null))throw new IllegalArgumentException("Receipt requires provider and destination warehouse.");
            if(Set.of("writeOff","adjustment").contains(type)&&(m.fromWarehouseId()==null||m.toWarehouseId()!=null||m.providerId()!=null))throw new IllegalArgumentException("Exit/count requires its source warehouse.");
        }
        var warehouseIds=new TreeSet<Long>();if(m.fromWarehouseId()!=null)warehouseIds.add(positive(m.fromWarehouseId(),"fromWarehouseId"));if(m.toWarehouseId()!=null)warehouseIds.add(positive(m.toWarehouseId(),"toWarehouseId"));
        var warehouses=new LinkedHashMap<Long,Map<String,Object>>();for(var id:warehouseIds){var w=record(user,scope,"warehouse",id,lock,p);active(w,"warehouse");warehouses.put(id,w);}
        String supplier=null;
        if(m.providerId()!=null) {var provider=providers.get(finance(user,scope),positive(m.providerId(),"providerId"));if(provider.status()!=ProviderStatus.ACTIVE)throw new IllegalArgumentException("Active provider required.");supplier=provider.name();p.versions.put("provider:"+provider.id(),hash(Arrays.asList(provider.id(),provider.name(),provider.status(),provider.unitId(),provider.businessId(),provider.version())));}
        var products=new ArrayList<ProductView>();var beforeBalances=new ArrayList<BalanceView>();var afterBalances=new ArrayList<BalanceView>();var movementViews=new ArrayList<MovementView>();
        for(var line:m.items().stream().sorted(Comparator.comparing(MovementLine::productId,Comparator.nullsFirst(Long::compareTo))).toList()) {
            var product=product(record(user,scope,"product",positive(line.productId(),"productId"),lock,p));products.add(product);
            if(!product.inventoryReady()||"service".equalsIgnoreCase(product.type())||!"active".equalsIgnoreCase(product.status()))throw new IllegalArgumentException("Active physical product with inventory enabled required.");
            BigDecimal entered=quantity(line.quantity(),"quantity",type.equals("adjustment"),product.inventoryUnit());
            if(!reversal&&!type.equals("supplierReceipt")&&line.unitCost()!=null)throw new IllegalArgumentException("Exit, transfer and count costs come from existing stock; do not supply unitCost.");
            var source=m.fromWarehouseId()==null?null:balance(user,scope,product.id(),m.fromWarehouseId(),lock,p);
            var destination=m.toWarehouseId()==null?null:balance(user,scope,product.id(),m.toWarehouseId(),lock,p);
            if(m.fromWarehouseId()!=null&&(source==null||!bool(source,"usesInventory")))throw new IllegalArgumentException("Configure the source stock before moving or counting inventory.");
            if(destination!=null&&!bool(destination,"usesInventory"))throw new IllegalArgumentException("Configure destination stock tracking before receipt.");
            var quantity=type.equals("adjustment")?entered.subtract(decimal(source,"availableQuantity")):entered;
            if(quantity.signum()==0)throw new IllegalArgumentException("This physical count does not change stock.");
            BigDecimal unitCost=source!=null?decimal(source,"unitCost"):cost(line.unitCost());
            if(type.equals("supplierReceipt")||reversal)unitCost=cost(line.unitCost());
            if(source!=null) {
                beforeBalances.add(InventoryAssistantViews.balance(source,product));var after=new LinkedHashMap<>(source);
                BigDecimal next=type.equals("adjustment")?entered:decimal(source,"availableQuantity").subtract(quantity);
                if(next.compareTo(decimal(source,"reservedQuantity"))<0)throw new IllegalArgumentException("Insufficient unreserved stock or physical count below reservations.");
                quantity(next,"resultingQuantity",true,product.inventoryUnit());
                if(reversal) {var value=decimal(source,"availableQuantity").multiply(decimal(source,"unitCost")).subtract(quantity.multiply(unitCost));if(value.signum()<0)throw new IllegalArgumentException("Intervening stock valuation prevents this reversal; review an explicit correction.");after.put("unitCost",next.signum()==0?BigDecimal.ZERO:value.divide(next,4,RoundingMode.HALF_UP));}
                after.put("availableQuantity",next);after.put("lastMovementAt",m.date());p.balances.add(after);afterBalances.add(InventoryAssistantViews.balance(after,product));
            }
            if(m.toWarehouseId()!=null) {
                if(destination!=null)beforeBalances.add(InventoryAssistantViews.balance(destination,product));
                var after=destination==null?newBalance(product.id(),warehouses.get(m.toWarehouseId())):new LinkedHashMap<>(destination);
                BigDecimal old=decimal(after,"availableQuantity"),next=old.add(quantity);quantity(next,"resultingQuantity",true,product.inventoryUnit());
                after.put("availableQuantity",next);after.put("unitCost",old.multiply(decimal(after,"unitCost")).add(quantity.multiply(unitCost)).divide(next,4,RoundingMode.HALF_UP));after.put("lastMovementAt",m.date());
                p.balances.add(after);afterBalances.add(InventoryAssistantViews.balance(after,product));
            }
            var movement=new LinkedHashMap<String,Object>();movement.put("productId",product.id());movement.put("productName",product.name());movement.put("productSku",product.sku());movement.put("movementType",type);
            movement.put("quantity",quantity);movement.put("unitCost",unitCost);movement.put("fromWarehouseId",m.fromWarehouseId());movement.put("toWarehouseId",m.toWarehouseId());
            movement.put("fromWarehouseName",m.fromWarehouseId()==null?null:text(warehouses.get(m.fromWarehouseId()),"name"));movement.put("toWarehouseName",m.toWarehouseId()==null?null:text(warehouses.get(m.toWarehouseId()),"name"));
            movement.put("reason",m.reason());movement.put("reference",m.reference());movement.put("supplierName",supplier);movement.put("movementDate",m.date());movement.put("responsibleName",user.userName());movement.put("status","completed");
            if(reversal)movement.put("metadata",Map.of("reversalOf",p.change.id()));p.movements.add(movement);movementViews.add(InventoryAssistantViews.movement(movement));
        }
        var warehouseViews=warehouses.values().stream().map(InventoryAssistantViews::warehouse).toList();
        p.before=new Snapshot(products,warehouseViews,beforeBalances,original==null?List.of():List.of(InventoryAssistantViews.movement(original)));
        p.after=new Snapshot(products,warehouseViews,afterBalances,movementViews);
    }
    private Change reversalChange(Change change,Map<String,Object> original,LocalDate date) {
        var originalQuantity=decimal(original,"quantity");Long from=id(original,"toWarehouseId"),to=id(original,"fromWarehouseId");
        if("adjustment".equals(text(original,"movementType"))) {from=originalQuantity.signum()>0?id(original,"fromWarehouseId"):null;to=originalQuantity.signum()<0?id(original,"fromWarehouseId"):null;}
        return new Change(null,null,null,null,new MovementInput(from,to,date,null,change.reason(),text(original,"movementNumber"),List.of(new MovementLine(id(original,"productId"),originalQuantity.abs(),decimal(original,"unitCost")))),null);
    }
    private Map<String,Object> record(AuthSessionUser user,HrOperationalScope scope,String kind,long id,boolean lock,Plan p) {
        var raw=repository.record(user,scope,kind,id,lock);p.versions.put(kind+":"+id,hash(raw));return raw;
    }
    private Map<String,Object> balance(AuthSessionUser user,HrOperationalScope scope,long product,long warehouse,boolean lock,Plan p) {
        var raw=repository.balance(user,scope,product,warehouse,lock);p.versions.put("balance:"+product+":"+warehouse,hash(raw));return raw;
    }
    private Object view(AuthSessionUser user,HrOperationalScope scope,String kind,Map<String,Object> raw) {
        return switch(kind){case "product"->product(raw);case "warehouse"->InventoryAssistantViews.warehouse(raw);case "movement"->InventoryAssistantViews.movement(raw);
            default->InventoryAssistantViews.balance(raw,product(repository.record(user,scope,"product",id(raw,"productId"),false)));};
    }
    private Map<String,Object> newBalance(long product,Map<String,Object> warehouse) {
        var b=new LinkedHashMap<String,Object>();b.put("productId",product);b.put("warehouseId",id(warehouse,"id"));b.put("warehouseName",text(warehouse,"name"));b.put("availableQuantity",BigDecimal.ZERO);b.put("reservedQuantity",BigDecimal.ZERO);b.put("minimumQuantity",BigDecimal.ZERO);b.put("unitCost",BigDecimal.ZERO);b.put("usesInventory",true);return b;
    }
    private Map<String,Object> nonNull(Object value) {var tree=mapper.valueToTree(value);var result=new LinkedHashMap<String,Object>();tree.fields().forEachRemaining(e->{if(!e.getValue().isNull())result.put(e.getKey(),e.getValue().isFloatingPointNumber()?e.getValue().decimalValue():mapper.convertValue(e.getValue(),Object.class));});return result;}
    private HrOperationalScope scope(AuthSessionUser user) {if(user.userCompanyId()==null)throw new SecurityException("Active membership required.");var s=scopes.resolve(user);if(s.type()==HrOperationalScope.Type.UNASSIGNED)throw new SecurityException("Inventory organization required.");return s;}
    private FinanceContext finance(AuthSessionUser user,HrOperationalScope scope) {var s=switch(scope.type()){case CORPORATE_OFFICE->FinanceScope.corporateOffice();case UNIT_HEADQUARTERS->FinanceScope.unitHeadquarters(scope.unitId());case BUSINESS_OFFICE->FinanceScope.businessOffice(scope.unitId(),scope.businessId());default->throw new SecurityException("Provider organization required.");};return new FinanceContext(user.userId(),user.companyId(),user.userName(),user.role(),true,s);}
    private void active(Map<String,Object> value,String entity) {if(!"active".equalsIgnoreCase(text(value,"status")))throw new IllegalArgumentException("Active "+entity+" required.");}
    private static long positive(Long value,String field) {if(value==null||value<1)throw new IllegalArgumentException("Positive "+field+" required.");return value;}
    private static void required(String value,String field,int max) {if(value==null||value.isBlank()||value.length()>max)throw new IllegalArgumentException("Valid "+field+" required (maximum "+max+").");}
    private static void token(String value,Set<String> allowed,String field) {if(value==null||!allowed.contains(value.toLowerCase(Locale.ROOT)))throw new IllegalArgumentException("Unsupported "+field+".");}
    private static void validateShape(String action,Change c) {
        boolean create=action.startsWith("create_");boolean inactive=action.startsWith("inactivate_");boolean entity=action.endsWith("_product")||action.endsWith("_warehouse");
        if(entity&&create!=(c.id()==null))throw new IllegalArgumentException("Creation has no id; updates require id.");
        int count=(c.product()!=null?1:0)+(c.warehouse()!=null?1:0)+(c.stock()!=null?1:0)+(c.movement()!=null?1:0);
        if(inactive||action.equals("cancel_inventory_movement")){if(count!=0)throw new IllegalArgumentException("Lifecycle changes do not accept other payloads.");if(c.id()==null)throw new IllegalArgumentException("id required.");required(c.reason(),"reason",1000);}
        else if(count!=1||((action.endsWith("_product")&&c.product()==null)||(action.endsWith("_warehouse")&&c.warehouse()==null)||(action.equals("configure_inventory_stock")&&c.stock()==null)||(!entity&&!action.equals("configure_inventory_stock")&&c.movement()==null)))throw new IllegalArgumentException("Provide exactly the named action payload.");
        if(!entity&&!action.equals("cancel_inventory_movement")&&c.id()!=null)throw new IllegalArgumentException("This action does not accept record id.");
    }
    private static Query emptyQuery(){return new Query(null,null,null,null,null,null,null,null,null,null);}
    private static void validateQuery(Query q) {if(q.limit()!=null&&(q.limit()<1||q.limit()>100)||q.query()!=null&&q.query().length()>120||q.status()!=null&&q.status().length()>40||q.from()!=null&&q.to()!=null&&q.from().isAfter(q.to()))throw new IllegalArgumentException("Invalid inventory filters.");for(var v:Arrays.asList(q.id(),q.productId(),q.warehouseId()))if(v!=null&&v<1)throw new IllegalArgumentException("Positive filter IDs required.");}
    private String hash(Object value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(value)));}catch(Exception e){throw new IllegalStateException("Inventory snapshot failed.",e);}}
    private static int offset(String cursor,String binding,int total) {if(cursor==null)return 0;try {if(cursor.length()>160)throw new IllegalArgumentException();var parts=new String(Base64.getUrlDecoder().decode(cursor),StandardCharsets.UTF_8).split(":",-1);if(parts.length!=2||!parts[1].equals(binding))throw new IllegalArgumentException();int n=Integer.parseInt(parts[0]);if(n<0||n>total)throw new IllegalArgumentException();return n;}catch(RuntimeException e){throw new IllegalArgumentException("Invalid inventory cursor for current filters and scope.");}}
    private static final class Plan {
        final String action;final Change change;final Map<String,String> versions=new TreeMap<>();final List<Map<String,Object>> balances=new ArrayList<>(),movements=new ArrayList<>();
        String collection;Map<String,Object> payload;Long productActivation;Snapshot before=Snapshot.empty(),after=Snapshot.empty();Prepared prepared;
        Plan(String action,Change change){this.action=action;this.change=change;}
    }
}
