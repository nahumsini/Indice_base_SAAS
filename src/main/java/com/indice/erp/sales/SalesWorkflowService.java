package com.indice.erp.sales;

import static com.indice.erp.sales.SalesWorkflowContracts.*;
import static com.indice.erp.sales.SalesWorkflowViews.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sales owns the operational state; the AI layer only delegates the named use cases. */
@Service
public class SalesWorkflowService {
    public static final Set<String> READS=Set.of("list_commercial_sales","get_commercial_sale",
        "list_sales_contracts","get_sales_contract","list_sales_follow_ups","get_sales_follow_up",
        "list_commission_rules","get_commission_rule");
    public static final Set<String> ACTIONS=Set.of("create_commercial_sale","update_commercial_sale","convert_quote_to_sale",
        "approve_sale_commercial","confirm_sale_inventory","confirm_sale_collection","update_sale_delivery","cancel_commercial_sale",
        "create_sales_contract","update_sales_contract","review_sales_contract","cancel_sales_contract",
        "create_sales_follow_up","update_sales_follow_up","set_sales_follow_up_status",
        "create_commission_rule","update_commission_rule","set_commission_rule_status");
    private final SalesWorkflowRepository repository;
    private final SalesService sales;
    private final SalesRepository raw;
    private final SalesAssistantService commercial;
    private final SalesAssistantRepository references;
    private final HrOperationalScopeService scopes;
    private final SalesCollectionService collections;
    private final FinanceBusinessTimeZoneResolver timezones;
    private final ObjectMapper mapper;
    public SalesWorkflowService(SalesWorkflowRepository repository,SalesService sales,SalesRepository raw,
        SalesAssistantService commercial,SalesAssistantRepository references,HrOperationalScopeService scopes,
        SalesCollectionService collections,FinanceBusinessTimeZoneResolver timezones,ObjectMapper mapper) {
        this.repository=repository;this.sales=sales;this.raw=raw;this.commercial=commercial;this.references=references;
        this.scopes=scopes;this.collections=collections;this.timezones=timezones;this.mapper=mapper;
    }
    @Transactional(readOnly=true)
    public Page read(AuthSessionUser user,String tool,Query query) {
        if(!READS.contains(tool))throw new IllegalArgumentException("Unknown sales workflow read.");
        var q=query==null?new Query(null,null,null,null,null,null,null):query;String kind=kind(tool);var scope=scope(user);
        if(tool.startsWith("get_"))return new Page(one(kind,record(user,scope,kind,positive(q.id()),false)),1,false,null,scope.type().name());
        if(q.id()!=null)throw new IllegalArgumentException("ID applies only to detail reads.");
        int limit=q.limit()==null?20:q.limit();if(limit<1||limit>50||(q.query()!=null&&q.query().length()>120)||(q.from()!=null&&q.to()!=null&&q.to().isBefore(q.from())))throw new IllegalArgumentException("Invalid sales workflow filters.");
        String binding=hash(Arrays.asList(tool,user.companyId(),scope,q.query(),q.status(),q.from(),q.to(),limit));
        int offset=offset(q.cursor(),binding);var p=repository.page(user,scope,kind,q,offset,limit);
        var rows=p.ids().stream().map(id->one(kind,sales.get(user.companyId(),repository.collection(kind),id))).toList();
        var result=new Records(rows.stream().flatMap(r->r.sales().stream()).toList(),rows.stream().flatMap(r->r.contracts().stream()).toList(),rows.stream().flatMap(r->r.followUps().stream()).toList(),rows.stream().flatMap(r->r.rules().stream()).toList());
        int end=offset+p.ids().size();boolean more=end<p.count();return new Page(result,p.count(),more,more?cursor(end,binding):null,scope.type().name());
    }
    @Transactional(readOnly=true)
    public Prepared prepare(AuthSessionUser user,String action,Change change) { return prepare(user,action,change,false); }
    private Prepared prepare(AuthSessionUser user,String action,Change c,boolean lock) {
        if(!ACTIONS.contains(action)||c==null)throw new IllegalArgumentException("Invalid sales workflow action.");
        validateShape(action,c);String kind=kind(action);var scope=scope(user);
        boolean create=action.startsWith("create_")||action.equals("convert_quote_to_sale");
        if(create&&c.id()!=null)throw new IllegalArgumentException("A new record has no ID.");
        var before=create?new LinkedHashMap<String,Object>():record(user,scope,kind,positive(c.id()),lock);
        var payload=new LinkedHashMap<String,Object>();var versions=new TreeMap<String,String>();
        if(!create)versions.put("record",hash(before));
        List<StockEffect> stock=List.of();CollectionEffect collection=null;
        if(kind.equals("sale")) {
            if(!create&&("POS".equalsIgnoreCase(str(before,"sourceType"))||raw.isPosOwnedSale(user.companyId(),positive(c.id()))))throw new IllegalArgumentException("POS owns this sale and its return workflow.");
            if(!create&&"cancelled".equals(str(before,"commercialStatus")))throw new IllegalArgumentException("Cancelled sales cannot be reopened or edited.");
            if(action.equals("create_commercial_sale")||action.equals("update_commercial_sale")||action.equals("convert_quote_to_sale")) {
                if(!create&&(!Set.of("pending","draft").contains(Objects.toString(before.get("commercialStatus"),"pending"))||"approved".equals(str(before,"financeStatus"))))throw new IllegalArgumentException("Only an unapproved commercial draft can be edited.");
                var in=requiredInput(c.sale(),"Sale input required.");
                List<LineInput> items=in.items();Long customer=in.customerId(),quote=in.quoteId();
                if(action.equals("convert_quote_to_sale")) {
                    quote=positive(quote);var q=reference(user,scope,"quote",quote,lock,versions);
                    if(repository.hasQuoteSale(user.companyId(),quote)||Set.of("expired","rejected").contains(str(q,"status")))throw new IllegalArgumentException("The quote cannot be converted again or after rejection/expiry.");
                    var expiration=date(q,"expirationDate");if(expiration!=null&&expiration.isBefore(today(user)))throw new IllegalArgumentException("The quote has expired.");
                    if(items!=null)throw new IllegalArgumentException("Conversion uses the saved quote lines.");
                    items=list(q.get("items")).stream().map(v->{var l=map(v);return new LineInput(id(l,"productId"),num(l,"quantity"),num(l,"unitPrice"),num(l,"discountPercent"),num(l,"taxPercent"));}).toList();
                    customer=id(q,"contactId");
                    if(in.currency()!=null&&!in.currency().equalsIgnoreCase(str(q,"currency")))throw new IllegalArgumentException("Quote conversion retains its native currency.");
                    payload.put("currency",str(q,"currency"));payload.put("quoteId",quote);
                } else if(quote!=null)throw new IllegalArgumentException("Use the explicit quote conversion workflow.");
                customer=positive(customer);var contact=reference(user,scope,"customer",customer,lock,versions);
                if(Set.of("inactive","cancelled").contains(str(contact,"status")))throw new IllegalArgumentException("Customer must be active.");
                if(items==null||items.isEmpty()||items.size()>100)throw new IllegalArgumentException("Provide 1 to 100 sale lines.");
                payload.put("contactId",customer);payload.put("customerName",str(contact,"companyName"));
                payload.put("unitId",contact.get("unitId"));payload.put("businessId",contact.get("businessId"));
                if(!payload.containsKey("currency"))payload.put("currency",currency(in.currency()));
                payload.put("saleDate",in.date()==null?today(user).toString():in.date().toString());
                if(LocalDate.parse(str(payload,"saleDate")).isAfter(today(user)))throw new IllegalArgumentException("A sale date cannot be in the future.");
                var lines=new ArrayList<Map<String,Object>>();
                for(var line:items) {
                    long pid=positive(line.productId());var product=product(user,pid,lock,versions);
                    if(!"active".equalsIgnoreCase(str(product,"status")))throw new IllegalArgumentException("Sale products must be active.");
                    validateQuantity(product,line.quantity());
                    var value=new LinkedHashMap<String,Object>();value.put("productId",pid);value.put("productName",str(product,"name"));value.put("quantity",line.quantity());
                    value.put("unitPrice",line.unitPrice()==null?num(product,"price"):line.unitPrice());value.put("discountPercent",line.discountPercent());value.put("taxPercent",line.taxPercent());lines.add(value);
                }
                payload.put("saleLines",lines);payload.put("notes",text(in.notes(),4000));
                if(create) {payload.put("commercialStatus","pending");payload.put("financeStatus","pending");payload.put("inventoryStatus","pending");payload.put("inventoryMovementStatus","pending");payload.put("deliveryStatus","pending");}
                if(in.warehouseId()!=null) {
                    var wh=warehouse(user,scope,positive(in.warehouseId()),lock,versions);
                    payload.put("unitId",wh.get("businessUnitId"));payload.put("businessId",wh.get("businessId"));
                    payload.put("customFields",Map.of("warehouseId",String.valueOf(in.warehouseId())));
                } else if(!create)payload.put("customFields",before.get("customFields"));
                payload=new LinkedHashMap<>(sales.prepareAssistantWorkflow(user.companyId(),user.userId(),"sales",payload));
                // Creation retains the browser owner: stock can be completed immediately or stay pending as a complete operation.
                stock=stock(user,scope,payload,lock,versions);
                if(!create&&raw.hasSaleInventoryMovements(user.companyId(),positive(c.id()))&&!SalesLineAmounts.sameInputs(before.get("saleLines"),payload.get("saleLines")))throw new IllegalArgumentException("Consumed stock keeps the original sale lines; cancel to correct them.");
            } else {
                switch(action) {
                    case "approve_sale_commercial" -> {if("approved".equals(str(before,"financeStatus")))throw new IllegalArgumentException("A previously finance-approved draft requires its original combined financial review before commercial approval.");payload.put("commercialStatus","approved");}
                    case "confirm_sale_inventory" -> {
                        stock=stock(user,scope,before,lock,versions);
                        if(!raw.hasSaleInventoryMovements(user.companyId(),positive(c.id()))&&stock.stream().anyMatch(s->!s.ready()))throw new IllegalArgumentException("The complete sale requires sufficient unreserved stock.");
                        payload.put("inventoryStatus","approved");
                    }
                    case "confirm_sale_collection" -> {
                        if(!"approved".equals(str(before,"commercialStatus")))throw new IllegalArgumentException("Approve the commercial sale before confirming collection.");
                        if("approved".equals(str(before,"financeStatus")))throw new IllegalArgumentException("Collection is already approved; recover its existing confirmation.");
                        var in=requiredInput(c.collection(),"Collection input required.");
                        String method=requiredInput(in.paymentMethod(),"Collection method required.").toLowerCase(Locale.ROOT);
                        if(!Set.of("cash","transfer","credit").contains(method))throw new IllegalArgumentException("Use cash, transfer or the existing receivable credit workflow.");
                        payload.put("paymentMethod",method);payload.put("paymentReference",text(in.reference(),300));payload.put("financeStatus","approved");
                        var custom=map(before.get("customFields"));custom.remove("paymentAccountId");if(in.paymentAccountId()!=null)custom.put("paymentAccountId",positive(in.paymentAccountId()));payload.put("customFields",custom);
                        if(in.paymentAccountId()!=null) {if(lock)repository.lockNamedReference(user.companyId(),"account",in.paymentAccountId());}
                    }
                    case "update_sale_delivery" -> {
                        if(!Set.of("pending","in_progress","delivered").contains(Objects.toString(c.status(),"")))throw new IllegalArgumentException("Invalid delivery status.");
                        if(c.status().equals("delivered")&&(!"approved".equals(str(before,"commercialStatus"))||(!raw.hasSaleInventoryMovements(user.companyId(),positive(c.id()))&&!"not_required".equals(str(before,"inventoryStatus")))))throw new IllegalArgumentException("Approve the sale and resolve inventory before recording delivery.");
                        payload.put("deliveryStatus",c.status());
                    }
                    case "cancel_commercial_sale" -> {reason(c.reason());payload.put("commercialStatus","cancelled");payload.put("notes",append(str(before,"notes"),c.reason()));}
                    default -> throw new IllegalArgumentException("Unsupported sale lifecycle.");
                }
            }
            var after=new LinkedHashMap<>(before);after.putAll(payload);
            if(action.equals("confirm_sale_collection")||action.equals("cancel_commercial_sale")) {
                var finance=repository.financialEvidence(user.companyId(),positive(c.id()),lock);var credits=repository.credits(user.companyId(),positive(c.id()),lock);
                if(action.equals("confirm_sale_collection")&&"credit".equals(str(payload,"paymentMethod"))&&credits.isEmpty())throw new IllegalArgumentException("Create the sale receivable in its Finance owner before confirming credit; no untracked debt is allowed.");
                versions.put("finance",hash(finance));versions.put("credits",hash(credits));collection=collections.preview(user.companyId(),positive(c.id()),before,after);
                if(collection.paymentAccountId()!=null) {
                    if(lock)repository.lockNamedReference(user.companyId(),"account",collection.paymentAccountId());
                    // Eligibility/currency and organization are checked again by the financial owner at execution.
                    versions.put("collection",hash(collection));
                }
            }
        } else if(kind.equals("contract")) {
            if(!create&&Set.of("signed","cancelled","expired").contains(str(before,"status")))throw new IllegalArgumentException("Final contracts retain their signed or cancelled history.");
            if(action.startsWith("create_")||action.startsWith("update_")) {
                var in=requiredInput(c.contract(),"Contract input required.");var contact=reference(user,scope,"customer",positive(in.customerId()),lock,versions);
                payload.put("contactId",in.customerId());payload.put("clientName",str(contact,"companyName"));payload.put("contactPerson",str(contact,"contactPerson"));
                if(in.quoteId()!=null) {var q=reference(user,scope,"quote",positive(in.quoteId()),lock,versions);if(!Objects.equals(id(q,"contactId"),in.customerId()))throw new IllegalArgumentException("Quote and contract must have the same customer.");payload.put("quoteId",in.quoteId());}
                payload.put("title",required(in.title(),220));payload.put("contractType",required(in.contractType(),80));
                if(!Set.of("service_agreement","sales_agreement","renewal_agreement","subscription_agreement","nda","operational_agreement","custom_contract").contains(in.contractType()))throw new IllegalArgumentException("Invalid contract type.");
                if(in.country()!=null&&!Set.of("MX","CA").contains(in.country()))throw new IllegalArgumentException("Contract country must be MX or CA.");
                payload.put("country",in.country());payload.put("expirationDate",in.expirationDate());payload.put("notes",text(in.notes(),4000));
                if(create) {payload.put("status","draft");payload.put("signatureStatus","not_requested");payload.put("source","manual");}
                payload=new LinkedHashMap<>(sales.prepareAssistantWorkflow(user.companyId(),user.userId(),"contracts",payload));
            } else if(action.equals("review_sales_contract"))payload.put("status","internal_review");
            else {reason(c.reason());payload.put("status","cancelled");payload.put("notes",append(str(before,"notes"),c.reason()));}
        } else if(kind.equals("follow_up")) {
            if(action.equals("set_sales_follow_up_status")) {
                if(!Set.of("active","pending_follow_up","in_service","renewal_soon","recurrent","at_risk","completed","closed").contains(Objects.toString(c.status(),"")))throw new IllegalArgumentException("Invalid follow-up status.");payload.put("status",c.status());
            } else {
                var in=requiredInput(c.followUp(),"Follow-up input required.");var contact=reference(user,scope,"customer",positive(in.customerId()),lock,versions);
                payload.put("contactId",in.customerId());payload.put("clientName",str(contact,"companyName"));payload.put("relationType",required(in.relationType(),80));payload.put("postSaleType",required(in.postSaleType(),80));
                if(!Set.of("one_time_customer","recurrent_customer","renewal_customer","dormant_customer","lost_prospect").contains(in.relationType()))throw new IllegalArgumentException("Invalid relationship type.");
                payload.put("nextFollowUpDate",in.nextFollowUpDate());payload.put("renewalDate",in.renewalDate());payload.put("nextAction",text(in.nextAction(),250));payload.put("notes",text(in.notes(),4000));if(create)payload.put("status","active");
                payload=new LinkedHashMap<>(sales.prepareAssistantWorkflow(user.companyId(),user.userId(),"post-sales",payload));
            }
        } else {
            if(!scope.isCorporateOffice())throw new SecurityException("Company-wide commission policy requires corporate scope.");
            if(action.equals("set_commission_rule_status")) {if(!Set.of("active","inactive").contains(Objects.toString(c.status(),"")))throw new IllegalArgumentException("Invalid commission status.");payload.put("status",c.status());}
            else {
                var in=requiredInput(c.rule(),"Commission rule input required.");
                payload.put("name",required(in.name(),180));payload.put("type",required(in.type(),40));payload.put("value",in.value());payload.put("userIds",idsBounded(in.userCompanyIds()));payload.put("productIds",idsBounded(in.productIds()));
                if(!Set.of("percentage_of_sale","fixed_per_sale","percentage_of_product","fixed_per_product").contains(in.type())||in.value()==null||in.value().signum()<0||(in.type().startsWith("percentage_")&&in.value().compareTo(new BigDecimal("100"))>0))throw new IllegalArgumentException("Invalid commission calculation.");
                if(in.validFrom()!=null&&in.validUntil()!=null&&in.validUntil().isBefore(in.validFrom()))throw new IllegalArgumentException("Invalid commission validity.");
                for(long member:idsBounded(in.userCompanyIds())) {if(lock)repository.lockNamedReference(user.companyId(),"member",member);var page=references.assignees(user,scope,null,member,0,1);if(page.totalCount()!=1)throw new NoSuchElementException("Active commission member not found.");versions.put("member:"+member,hash(page.items()));}
                for(long product:idsBounded(in.productIds()))product(user,product,lock,versions);
                payload.put("validFrom",in.validFrom());payload.put("validUntil",in.validUntil());payload.put("priority",in.priority()==null?0:in.priority());payload.put("notes",text(in.notes(),4000));if(create)payload.put("status","active");
                payload=new LinkedHashMap<>(sales.prepareAssistantWorkflow(user.companyId(),user.userId(),"commission-rules",payload));
            }
        }
        payload=new LinkedHashMap<>(nonNull(payload));
        var after=new LinkedHashMap<>(before);after.putAll(payload);
        if(kind.equals("sale")) {
            versions.put("rules",hash(repository.rules(user.companyId(),lock)));
            if(!create&&!SalesLineAmounts.sameInputs(before.get("saleLines"),after.get("saleLines"))&&raw.hasSaleInventoryMovements(user.companyId(),positive(c.id())))throw new IllegalArgumentException("Historical sale lines are immutable.");
        }
        return new Prepared(action,c,create?Records.empty():one(kind,before),one(kind,after),stock,collection,Map.copyOf(nonNull(payload)),Map.copyOf(versions));
    }
    @Transactional
    public Result execute(AuthSessionUser user,Prepared prepared,String correlation) {
        repository.lockCompany(user.companyId());Prepared current;
        try {current=prepare(user,prepared.action(),prepared.change(),true);}catch(IllegalArgumentException e){throw new Changed();}
        if(!canonical(current).equals(canonical(prepared)))throw new Changed();
        String kind=kind(prepared.action());var payload=new LinkedHashMap<>(current.payload());
        if(prepared.action().equals("convert_quote_to_sale"))sales.update(user.companyId(),user.userId(),"quotes",positive(prepared.change().sale().quoteId()),Map.of("status","closed_won"));
        var saved=prepared.change().id()==null?sales.create(user.companyId(),user.userId(),repository.collection(kind),payload)
            :sales.update(user.companyId(),user.userId(),repository.collection(kind),prepared.change().id(),payload);
        return new Result(prepared.action(),one(kind,saved));
    }
    public void requireResultAccess(AuthSessionUser user,Result result) {
        var scope=scope(user);for(var v:result.records().sales())repository.require(user,scope,"sale",positive(v.id()),false);
        for(var v:result.records().contracts())repository.require(user,scope,"contract",positive(v.id()),false);
        for(var v:result.records().followUps())repository.require(user,scope,"follow_up",positive(v.id()),false);
        for(var v:result.records().rules())repository.require(user,scope,"rule",positive(v.id()),false);
    }
    private List<StockEffect> stock(AuthSessionUser user,HrOperationalScope scope,Map<String,Object> sale,boolean lock,Map<String,String> versions) {
        var quantities=new TreeMap<Long,BigDecimal>();for(var v:list(sale.get("saleLines"))) {var l=map(v);quantities.merge(positive(id(l,"productId")),num(l,"quantity"),BigDecimal::add);}
        Long wh=id(map(sale.get("customFields")),"warehouseId");
        if(wh!=null)warehouse(user,scope,wh,lock,versions);
        var balances=wh==null?List.<Map<String,Object>>of():repository.balances(user.companyId(),wh,quantities.keySet(),lock);versions.put("balances",hash(balances));
        var result=new ArrayList<StockEffect>();
        for(var e:quantities.entrySet()) {
            var p=product(user,e.getKey(),lock,versions);boolean tracked=!"SERVICE".equalsIgnoreCase(str(p,"type"));
            var b=balances.stream().filter(r->Objects.equals(id(r,"product_id"),e.getKey())).findFirst().orElse(Map.of());
            var available=num(b,"available_quantity");var reserved=num(b,"reserved_quantity");boolean ready=!tracked||(wh!=null&&Boolean.TRUE.equals(p.get("inventoryReady"))&&Boolean.TRUE.equals(b.get("uses_inventory"))&&available.subtract(reserved).compareTo(e.getValue())>=0);
            result.add(new StockEffect(e.getKey(),wh,e.getValue(),available,reserved,num(b,"unit_cost"),tracked,ready));
        }
        return List.copyOf(result);
    }
    private Map<String,Object> warehouse(AuthSessionUser user,HrOperationalScope scope,long id,boolean lock,Map<String,String> versions) {
        if(lock)repository.lockNamedReference(user.companyId(),"warehouse",id);var v=sales.get(user.companyId(),"inventory-warehouses",id);
        if(!"active".equalsIgnoreCase(str(v,"status")))throw new IllegalArgumentException("Warehouse must be active.");
        Long unit=SalesWorkflowViews.id(v,"businessUnitId"),business=SalesWorkflowViews.id(v,"businessId");
        if(!scope.isCorporateOffice()&&(!Objects.equals(scope.unitId(),unit)||(scope.businessId()!=null&&!Objects.equals(scope.businessId(),business))))throw new NoSuchElementException("Warehouse not found in current scope.");
        versions.put("warehouse:"+id,hash(v));return v;
    }
    private Map<String,Object> product(AuthSessionUser user,long id,boolean lock,Map<String,String> versions) {if(lock)repository.lockNamedReference(user.companyId(),"product",id);var p=sales.get(user.companyId(),"products",id);versions.put("product:"+id,hash(p));return p;}
    private Map<String,Object> reference(AuthSessionUser user,HrOperationalScope scope,String kind,long id,boolean lock,Map<String,String> versions) {
        references.requireRecord(user,scope,kind,id,lock);if(lock&&kind.equals("quote"))references.lockItems(user.companyId(),id);var v=sales.get(user.companyId(),references.collection(kind),id);versions.put(kind+":"+id,hash(v));return v;
    }
    private Map<String,Object> record(AuthSessionUser user,HrOperationalScope scope,String kind,long id,boolean lock) {repository.require(user,scope,kind,id,lock);return sales.get(user.companyId(),repository.collection(kind),id);}
    private HrOperationalScope scope(AuthSessionUser user) {var s=scopes.resolve(user);if(s.type()==HrOperationalScope.Type.UNASSIGNED)throw new SecurityException("Current organizational assignment required.");return s;}
    private LocalDate today(AuthSessionUser user) {return LocalDate.now(timezones.resolve(user.companyId()));}
    public static String kind(String tool) {if(tool.contains("contract"))return "contract";if(tool.contains("follow_up"))return "follow_up";if(tool.contains("commission_rule"))return "rule";return "sale";}
    private void validateShape(String action,Change c) {
        String required=action.equals("create_commercial_sale")||action.equals("update_commercial_sale")||action.equals("convert_quote_to_sale")?"sale":action.equals("confirm_sale_collection")?"collection":action.equals("create_sales_contract")||action.equals("update_sales_contract")?"contract":action.equals("create_sales_follow_up")||action.equals("update_sales_follow_up")?"followUp":action.equals("create_commission_rule")||action.equals("update_commission_rule")?"rule":null;
        var fields=new LinkedHashMap<String,Object>();fields.put("sale",c.sale());fields.put("collection",c.collection());fields.put("contract",c.contract());fields.put("followUp",c.followUp());fields.put("rule",c.rule());
        for(var e:fields.entrySet())if(e.getValue()!=null&&!e.getKey().equals(required))throw new IllegalArgumentException("Unexpected action input: "+e.getKey());
        if(required!=null&&fields.get(required)==null)throw new IllegalArgumentException("Action input required: "+required);
        if(c.status()!=null&&!Set.of("update_sale_delivery","set_sales_follow_up_status","set_commission_rule_status").contains(action))throw new IllegalArgumentException("This action does not accept a status.");
        if(c.reason()!=null&&!action.startsWith("cancel_"))throw new IllegalArgumentException("This action does not accept a cancellation reason.");
    }
    private static void validateQuantity(Map<String,Object> product,BigDecimal qty) {
        if(qty==null||qty.signum()<=0||qty.stripTrailingZeros().scale()>3)throw new IllegalArgumentException("Sale quantity requires at most three decimals.");
        String unit=Objects.toString(map(map(product.get("metadata")).get("packaging")).get("baseUnit"),"Piece");
        if(unit.equalsIgnoreCase("Piece")&&qty.stripTrailingZeros().scale()>0)throw new IllegalArgumentException("Piece quantity must be a whole number.");
    }
    private static List<Long> idsBounded(List<Long> ids) {if(ids==null)return List.of();if(ids.size()>100||new HashSet<>(ids).size()!=ids.size())throw new IllegalArgumentException("Reference IDs must be unique and bounded.");ids.forEach(SalesWorkflowService::positive);return List.copyOf(ids);}
    private static long positive(Long id) {if(id==null||id<1)throw new IllegalArgumentException("Positive workflow ID required.");return id;}
    private static String text(String value,int max) {if(value!=null&&value.length()>max)throw new IllegalArgumentException("Text exceeds the accepted length.");return value;}
    private static String required(String value,int max) {if(value==null||value.isBlank())throw new IllegalArgumentException("Required text is missing.");return text(value.trim(),max);}
    private static void reason(String value) {if(required(value,500).length()<5)throw new IllegalArgumentException("Cancellation reason must have at least five characters.");}
    private static String append(String existing,String reason) {return text(Objects.toString(existing,"")+"\n"+reason.trim(),4000);}
    private static String currency(String value) {if(value==null||!value.matches("[A-Za-z]{3}"))throw new IllegalArgumentException("Native currency required.");String result=value.toUpperCase(Locale.ROOT);java.util.Currency.getInstance(result);return result;}
    private static Map<String,Object> nonNull(Map<String,Object> payload) {var copy=new LinkedHashMap<>(payload);copy.values().removeIf(Objects::isNull);return copy;}
    private String hash(Object value) {try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(value)));}catch(Exception e){throw new IllegalStateException("Cannot fingerprint the sales workflow.",e);}}
    private com.fasterxml.jackson.databind.JsonNode canonical(Object value) {
        try {return mapper.readerFor(com.fasterxml.jackson.databind.JsonNode.class)
            .with(com.fasterxml.jackson.databind.DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readValue(mapper.writeValueAsBytes(value));}
        catch(Exception e) {throw new IllegalStateException("Cannot compare the sales workflow.",e);}
    }
    private static String cursor(int offset,String binding) {return Base64.getUrlEncoder().withoutPadding().encodeToString((offset+":"+binding).getBytes(StandardCharsets.UTF_8));}
    private static int offset(String cursor,String binding) {if(cursor==null)return 0;try {String[] parts=new String(Base64.getUrlDecoder().decode(cursor),StandardCharsets.UTF_8).split(":",2);int value=Integer.parseInt(parts[0]);if(value<0||!parts[1].equals(binding))throw new IllegalArgumentException();return value;}catch(Exception e){throw new IllegalArgumentException("Invalid sales workflow cursor.");}}
    private static <T>T requiredInput(T value,String message){if(value==null)throw new IllegalArgumentException(message);return value;}
}
