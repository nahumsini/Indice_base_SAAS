package com.indice.erp.pos.purchaseorder.assistant;
import static com.indice.erp.pos.purchaseorder.assistant.InventoryCatalogAssistantContracts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.finance.providers.*;
import com.indice.erp.finance.providers.dto.*;
import com.indice.erp.finance.shared.*;
import com.indice.erp.pos.*;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import com.indice.erp.pos.discount.*;
import com.indice.erp.pos.discount.DiscountDtos.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
/** Inventory owns the user workflow; providers and discounts retain their native domain validation. */
@Service
public class InventoryCatalogAssistantService {
 public static final Set<String> READS=Set.of("list_inventory_providers","get_inventory_provider","list_inventory_discounts","get_inventory_discount","evaluate_inventory_discounts");
 public static final Set<String> ACTIONS=Set.of("create_inventory_provider","update_inventory_provider","set_inventory_provider_status","create_inventory_discount","update_inventory_discount","set_inventory_discount_status");
 private final ProcurementAssistantService procurement;private final PurchaseOrderRepository references;private final ProviderService providers;private final DiscountRuleService discounts;private final JdbcTemplate jdbc;private final ObjectMapper mapper;
 public InventoryCatalogAssistantService(ProcurementAssistantService procurement,PurchaseOrderRepository references,ProviderService providers,DiscountRuleService discounts,JdbcTemplate jdbc,ObjectMapper mapper){this.procurement=procurement;this.references=references;this.providers=providers;this.discounts=discounts;this.jdbc=jdbc;this.mapper=mapper;}
 @Transactional(readOnly=true)
 public Page read(AuthSessionUser user,String tool,Query request) {
  if(!READS.contains(tool))throw new IllegalArgumentException("Unknown inventory catalog read.");var q=request==null?new Query(null,null,null,null,null,null,null,null,null,null,null,null,null):request;var ctx=procurement.context(user);Records records;
  if(tool.equals("evaluate_inventory_discounts")) {
   var assignment=assignment(ctx,q.warehouseId(),null,null);if(q.productId()!=null)references.findProduct(ctx,id(q.productId())).orElseThrow(NoSuchElementException::new);money(q.amount(),false,2);currency(q.currency());
   if(q.evaluationScope()==null||!Set.of("PRODUCT","CATEGORY","CUSTOMER","ORDER","MANUAL").contains(q.evaluationScope()))throw new IllegalArgumentException("Explicit evaluation scope required.");
   if(q.channel()==null||!Set.of("POS","SALES","KIOSK","PUBLIC_CATALOG").contains(q.channel()))throw new IllegalArgumentException("Explicit discount channel required.");
   var result=discounts.evaluate(ctx,new EvaluationRequest(q.channel(),q.amount(),q.productId(),q.category(),q.customerType(),q.evaluationScope(),q.currency(),q.warehouseId(),assignment.unit(),assignment.business()));records=new Records(List.of(),List.of(),result.items());
  } else if(tool.endsWith("_provider"))records=provider(providers.get(finance(ctx),id(q.id())));
  else if(tool.endsWith("_discount"))records=discount(discounts.get(ctx,id(q.id())));
  else if(tool.contains("providers"))records=new Records(providers.list(finance(ctx)).providers().stream().map(InventoryCatalogAssistantService::safeProvider).filter(v->matches(v.name(),q.query())&&(q.status()==null||v.status().equalsIgnoreCase(q.status()))).toList(),List.of(),List.of());
  else records=new Records(List.of(),discounts.list(ctx).items().stream().filter(v->matches(v.name(),q.query())&&(q.status()==null||v.status().equalsIgnoreCase(q.status()))).toList(),List.of());
  int limit=q.limit()==null?20:q.limit();if(limit<1||limit>50||q.query()!=null&&q.query().length()>120)throw new IllegalArgumentException("Invalid inventory catalog query.");String binding=hash(Arrays.asList(tool,user.companyId(),user.userId(),ctx.scope(),q.query(),q.status(),limit,q.warehouseId(),q.productId(),q.channel(),q.currency(),q.amount(),q.category(),q.customerType(),q.evaluationScope()));int offset=offset(q.cursor(),binding);int count=size(records);if(offset>count)throw new IllegalArgumentException("Invalid inventory catalog cursor.");int end=Math.min(offset+limit,count);return new Page(slice(records,offset,end),count,end<count,end<count?cursor(end,binding):null,ctx.scope().type().name());
 }
 @Transactional(readOnly=true)
 public Prepared prepare(AuthSessionUser user,String action,Change change){return plan(user,action,change,false);}
 @Transactional
 public Result execute(AuthSessionUser user,Prepared saved) {
  var current=plan(user,saved.action(),saved.change(),true);if(!canonical(current).equals(canonical(saved)))throw new Changed();var ctx=procurement.context(user);var c=saved.change();Records result;
  if(saved.action().endsWith("_provider")||saved.action().equals("set_inventory_provider_status")) {
   var next=current.after().providers().getFirst();if(saved.action().startsWith("create_"))result=provider(providers.create(finance(ctx),createProvider(next)));
   else {var old=providers.get(finance(ctx),id(c.id()));result=provider(providers.update(finance(ctx),old.id(),updateProvider(next,old)));}
  } else if(saved.action().equals("set_inventory_discount_status")) {var old=discounts.get(ctx,id(c.id()));result=discount(discounts.transition(ctx,id(c.id()),new StatusRequest(c.status(),old.version())));}
  else {var forecast=current.after().discounts().getFirst();var assignment=new Assignment(forecast.unitId(),forecast.businessId());var input=discountRequest(c.discount(),assignment,c.id()==null?null:discounts.get(ctx,id(c.id())).version());result=discount(c.id()==null?discounts.create(ctx,input):discounts.update(ctx,id(c.id()),input));}
  return new Result(saved.action(),result);
 }
 public void requireResultAccess(AuthSessionUser user,Result result){var ctx=procurement.context(user);result.records().providers().forEach(v->providers.get(finance(ctx),id(v.id())));result.records().discounts().forEach(v->discounts.get(ctx,v.id()));}
 private Prepared plan(AuthSessionUser user,String action,Change c,boolean lock) {
  if(!ACTIONS.contains(action)||c==null)throw new IllegalArgumentException("Invalid inventory catalog operation.");var ctx=procurement.context(user);if(!ctx.canManageOtherUsers())throw new SecurityException("Inventory maintenance authority required.");boolean provider=action.contains("provider"),create=action.startsWith("create_"),status=action.startsWith("set_");shape(c,provider,create,status);
  if(lock)jdbc.queryForList("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,user.companyId());var versions=new TreeMap<String,String>();Records before=Records.empty(),after;
  if(provider) {
   ProviderResponse old=create?null:providers.get(finance(ctx),id(c.id()));if(old!=null){if(lock)lock(ctx,"finance_providers",old.id());old=providers.get(finance(ctx),old.id());before=provider(old);versions.put("provider",hash(old));if(old.unitId()==null&&old.businessId()==null&&!ctx.scope().isCorporateOffice())throw new SecurityException("Company-wide providers require corporate authority.");}
   Provider next;
   if(status) {reason(c.reason());var state=ProviderStatus.valueOf(c.status());var v=before.providers().getFirst();next=new Provider(v.id(),v.unitId(),v.businessId(),v.name(),v.legalName(),v.taxId(),v.email(),v.phone(),v.contactName(),v.paymentTermsDays(),state.name(),append(v.notes(),c.reason()),v.version());}
   else {var in=Objects.requireNonNull(c.provider(),"Provider input required.");validateProvider(in);var scope=assignment(ctx,in.warehouseId(),old==null?null:old.unitId(),old==null?null:old.businessId());if(in.warehouseId()!=null)warehouseVersion(ctx,in.warehouseId(),lock,versions);
    next=new Provider(old==null?null:old.id(),scope.unit(),scope.business(),in.name(),in.legalName(),in.taxId(),in.email(),in.phone(),in.contactName(),in.paymentTermsDays(),old==null?"ACTIVE":old.status().name(),in.notes(),old==null?0L:old.version());}
   var verified=create?providers.previewCreate(finance(ctx),createProvider(next)):providers.previewUpdate(finance(ctx),id(c.id()),updateProvider(next,old));after=provider(verified);versions.put("providerPopulation",hash(providers.list(finance(ctx)).providers()));
  } else {
   RuleResponse old=create?null:discounts.get(ctx,id(c.id()));if(old!=null){if(lock)lock(ctx,"pos_discount_rules",old.id());old=discounts.get(ctx,old.id());before=discount(old);versions.put("discount",hash(old));if(old.unitId()==null&&old.businessId()==null&&!ctx.scope().isCorporateOffice())throw new SecurityException("Company-wide discounts require corporate authority.");}
   if(status) {reason(c.reason());if(!Set.of("ACTIVE","PAUSED","ARCHIVED").contains(c.status()))throw new IllegalArgumentException("Invalid discount lifecycle state.");var v=old;after=discount(new RuleResponse(v.id(),v.unitId(),v.businessId(),v.warehouseId(),v.name(),v.description(),v.scope(),v.discountType(),v.value(),v.currencyCode(),v.startsAt(),v.endsAt(),v.minimumAmount(),v.maximumDiscountAmount(),v.customerType(),v.productId(),v.category(),v.requiresAuthorization(),v.stackable(),v.priority(),c.status().toLowerCase(Locale.ROOT),v.enabledChannels(),v.version(),v.createdAt(),v.updatedAt()));}
   else {var in=Objects.requireNonNull(c.discount(),"Discount input required.");validateDiscount(in);var scope=assignment(ctx,in.warehouseId(),old==null?null:old.unitId(),old==null?null:old.businessId());if(in.warehouseId()!=null)warehouseVersion(ctx,in.warehouseId(),lock,versions);if(in.productId()!=null)versions.put("product",hash(references.findProduct(ctx,id(in.productId())).orElseThrow(NoSuchElementException::new)));after=discount(discounts.preview(ctx,c.id(),discountRequest(in,scope,old==null?null:old.version())));}
  }
  return new Prepared(action,c,before,after,Map.copyOf(versions),ctx.scope().type().name());
 }
 private record Assignment(Long unit,Long business) {}
 private Assignment assignment(PosContext ctx,Long warehouse,Long oldUnit,Long oldBusiness){if(warehouse!=null){var row=references.findWarehouse(ctx,id(warehouse)).orElseThrow(NoSuchElementException::new);return new Assignment(row.unitId(),row.businessId());}if(oldUnit!=null||oldBusiness!=null)return new Assignment(oldUnit,oldBusiness);return new Assignment(ctx.scope().unitId(),ctx.scope().businessId());}
 private void warehouseVersion(PosContext ctx,long id,boolean lock,Map<String,String> versions){if(lock)lock(ctx,"sales_inventory_warehouses",id);versions.put("warehouse",hash(references.findWarehouse(ctx,id).orElseThrow(NoSuchElementException::new)));}
 private static FinanceContext finance(PosContext c){var scope=switch(c.scope().type()){case CORPORATE_OFFICE->FinanceScope.corporateOffice();case UNIT_HEADQUARTERS->FinanceScope.unitHeadquarters(c.scope().unitId());case BUSINESS_OFFICE->FinanceScope.businessOffice(c.scope().unitId(),c.scope().businessId());};return new FinanceContext(c.userId(),c.companyId(),c.userName(),c.role(),true,scope);}
 private static Provider safeProvider(ProviderResponse p){return new Provider(p.id(),p.unitId(),p.businessId(),p.name(),p.legalName(),p.taxId(),p.email(),p.phone(),p.contactName(),p.paymentTermsDays(),p.status().name(),p.notes(),p.version());}
 private static Records provider(ProviderResponse p){return new Records(List.of(safeProvider(p)),List.of(),List.of());}private static Records discount(RuleResponse r){return new Records(List.of(),List.of(r),List.of());}
 private static CreateProviderRequest createProvider(Provider p){return new CreateProviderRequest(p.unitId(),p.businessId(),p.name(),p.legalName(),p.taxId(),p.email(),p.phone(),p.contactName(),p.paymentTermsDays(),ProviderStatus.valueOf(p.status()),p.notes(),null,null);}
 private static UpdateProviderRequest updateProvider(Provider p,ProviderResponse old){return new UpdateProviderRequest(p.unitId(),p.businessId(),p.name(),p.legalName(),p.taxId(),p.email(),p.phone(),p.contactName(),p.paymentTermsDays(),ProviderStatus.valueOf(p.status()),p.notes(),old.customFields(),old.metadata());}
 private static RuleRequest discountRequest(DiscountInput d,Assignment a,Long version){return new RuleRequest(a.unit(),a.business(),d.warehouseId(),d.name(),d.description(),d.scope(),d.discountType(),d.value(),currency(d.currency()),d.startsAt(),d.endsAt(),d.minimumAmount(),d.maximumDiscountAmount(),d.customerType(),d.productId(),d.category(),Boolean.TRUE.equals(d.requiresAuthorization()),Boolean.TRUE.equals(d.stackable()),d.priority()==null?0:d.priority(),d.channels(),version);}
 private static void validateProvider(ProviderInput p){text(p.name(),180,true);text(p.legalName(),220,false);text(p.taxId(),80,false);text(p.email(),180,false);if(p.email()!=null&&(!p.email().matches("[^@]+@[^@]+[.][^@]+")||p.email().chars().anyMatch(Character::isWhitespace)))throw new IllegalArgumentException("Valid supplier email required.");text(p.phone(),60,false);text(p.contactName(),180,false);text(p.notes(),4000,false);if(p.paymentTermsDays()!=null&&(p.paymentTermsDays()<0||p.paymentTermsDays()>3650))throw new IllegalArgumentException("Invalid supplier terms.");}
 private static void validateDiscount(DiscountInput d){text(d.name(),180,true);text(d.description(),600,true);currency(d.currency());money(d.value(),true,4);if(d.startsAt()==null||d.endsAt()==null||d.endsAt().isBefore(d.startsAt()))throw new IllegalArgumentException("Valid discount dates required.");if(d.channels()==null||d.channels().isEmpty()||d.channels().size()>4)throw new IllegalArgumentException("Explicit discount channels required.");if(d.minimumAmount()!=null)money(d.minimumAmount(),false,4);if(d.maximumDiscountAmount()!=null)money(d.maximumDiscountAmount(),false,4);text(d.category(),160,false);text(d.customerType(),80,false);}
 private void shape(Change c,boolean provider,boolean create,boolean status){if(status&&(c.status()==null||c.reason()==null))throw new IllegalArgumentException("Explicit catalog status and reason required.");if(create&&c.id()!=null)throw new IllegalArgumentException("New catalog records have no ID.");if(!create)id(c.id());var allowed=status?Set.of("id","status","reason"):Set.of("id",provider?"provider":"discount");mapper.valueToTree(c).fieldNames().forEachRemaining(k->{if(!allowed.contains(k))throw new IllegalArgumentException("Unexpected inventory catalog input: "+k);});}
 private void lock(PosContext ctx,String table,long id){if(!Set.of("finance_providers","sales_inventory_warehouses","pos_discount_rules").contains(table))throw new IllegalArgumentException();jdbc.queryForList("SELECT id FROM "+table+" WHERE company_id=? AND id=? FOR UPDATE",Long.class,ctx.companyId(),id);}
 private static long id(Long id){if(id==null||id<1)throw new IllegalArgumentException("Positive catalog record ID required.");return id;}
 private static String currency(String v){if(v==null||!Set.of("CAD","MXN","USD","EUR").contains(v.toUpperCase(Locale.ROOT)))throw new IllegalArgumentException("Supported native currency required.");return v.toUpperCase(Locale.ROOT);}
 private static void money(BigDecimal v,boolean positive,int scale){if(v==null||v.signum()<0||(positive&&v.signum()==0)||v.stripTrailingZeros().scale()>scale||v.precision()-v.scale()>12)throw new IllegalArgumentException("Invalid native amount.");}
 private static void text(String s,int max,boolean required){if(s==null&&!required)return;if(s==null||s.length()>max||(required&&s.isBlank()))throw new IllegalArgumentException("Invalid inventory catalog text.");}
 private static void reason(String s){text(s,500,true);if(s.trim().length()<5)throw new IllegalArgumentException("A reason with at least five characters is required.");}
 private static String append(String old,String reason){String value=(old==null?"":old+"\n")+reason;if(value.length()>4000)throw new IllegalArgumentException("Existing provider notes and reason exceed 4000 characters.");return value;}
 private static boolean matches(String name,String q){return q==null||name.toLowerCase(Locale.ROOT).contains(q.toLowerCase(Locale.ROOT));}
 private static int size(Records r){return r.providers().size()+r.discounts().size()+r.evaluation().size();}
 private static Records slice(Records r,int start,int end){return new Records(r.providers().isEmpty()?List.of():r.providers().subList(start,end),r.discounts().isEmpty()?List.of():r.discounts().subList(start,end),r.evaluation().isEmpty()?List.of():r.evaluation().subList(start,end));}
 private com.fasterxml.jackson.databind.JsonNode canonical(Object v){try{return mapper.reader().with(com.fasterxml.jackson.databind.DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readTree(mapper.writeValueAsString(v));}catch(Exception e){throw new IllegalStateException("Invalid catalog snapshot.",e);}}
 private String hash(Object v){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(v)));}catch(Exception e){throw new IllegalStateException("Invalid catalog snapshot.",e);}}
 private static String cursor(int offset,String binding){return Base64.getUrlEncoder().withoutPadding().encodeToString((offset+":"+binding).getBytes(StandardCharsets.UTF_8));}
 private static int offset(String cursor,String binding){if(cursor==null)return 0;try{var parts=new String(Base64.getUrlDecoder().decode(cursor),StandardCharsets.UTF_8).split(":",2);int n=Integer.parseInt(parts[0]);if(n>=0&&parts[1].equals(binding))return n;}catch(RuntimeException ignored){}throw new IllegalArgumentException("Catalog cursor belongs to another scope or query.");}
}
