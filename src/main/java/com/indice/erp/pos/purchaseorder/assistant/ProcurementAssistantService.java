package com.indice.erp.pos.purchaseorder.assistant;
import static com.indice.erp.pos.purchaseorder.assistant.ProcurementAssistantContracts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.*;
import com.indice.erp.pos.*;
import com.indice.erp.pos.purchaseorder.*;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
/** Explicit Inventory procurement port into the existing Purchase Order owner. */
@Service
public class ProcurementAssistantService {
    public static final Set<String> READS=Set.of("list_purchase_orders","get_purchase_order","list_supplier_submissions","get_supplier_submission","list_supplier_invoices","get_supplier_invoice","list_product_suppliers","get_product_supplier");
    public static final Set<String> ACTIONS=Set.of("create_purchase_order","update_purchase_order_draft","request_purchase_order","approve_purchase_order","send_purchase_order","cancel_purchase_order","receive_purchase_order","create_supplier_submission","review_supplier_submission","convert_supplier_submission","submit_supplier_invoice","review_supplier_invoice","save_product_supplier","update_product_supplier");
    private final PurchaseOrderService owner;private final PurchaseOrderRepository repository;private final HrOperationalScopeService scopes;private final JdbcTemplate jdbc;private final ObjectMapper mapper;
    public ProcurementAssistantService(PurchaseOrderService owner,PurchaseOrderRepository repository,HrOperationalScopeService scopes,JdbcTemplate jdbc,ObjectMapper mapper){this.owner=owner;this.repository=repository;this.scopes=scopes;this.jdbc=jdbc;this.mapper=mapper;}
    @Transactional(readOnly=true)
    public Page read(AuthSessionUser user,String tool,Query request) {
        if(!READS.contains(tool))throw new IllegalArgumentException("Unknown procurement read.");var q=request==null?new Query(null,null,null,null,null,null,null,null):request;var ctx=context(user);String kind=kind(tool);
        if(tool.startsWith("get_"))return new Page(record(ctx,kind,positive(q.id())),1,false,null,ctx.scope().type().name());
        if(q.id()!=null)throw new IllegalArgumentException("A list cannot accept an object ID.");int limit=q.limit()==null?20:q.limit();if(limit<1||limit>50||(q.from()!=null&&q.to()!=null&&q.to().isBefore(q.from())))throw new IllegalArgumentException("Invalid procurement filters.");
        var all=list(ctx,kind,q);int count=size(all);String binding=hash(Arrays.asList(tool,user.companyId(),user.userId(),ctx.scope(),q.providerId(),q.warehouseId(),q.status(),q.from(),q.to(),limit));int offset=offset(q.cursor(),binding);if(offset>count)throw new IllegalArgumentException("Invalid procurement cursor.");int end=Math.min(offset+limit,count);boolean more=end<count;
        return new Page(slice(all,offset,end),count,more,more?cursor(end,binding):null,ctx.scope().type().name());
    }
    @Transactional(readOnly=true)
    public Prepared prepare(AuthSessionUser user,String action,Change change){return plan(user,action,change,false);}
    @Transactional
    public Result execute(AuthSessionUser user,Prepared confirmed) {
        var current=plan(user,confirmed.action(),confirmed.change(),true);if(!canonical(current).equals(canonical(confirmed)))throw new Changed();var ctx=context(user);var c=confirmed.change();String action=confirmed.action();Records result;
        switch(action) {
            case "create_purchase_order" -> result=orders(owner.createOrder(ctx,draft(c.draft())));
            case "update_purchase_order_draft" -> result=orders(owner.updateDraft(ctx,positive(c.id()),draft(c.draft())));
            case "request_purchase_order" -> result=orders(owner.requestOrder(ctx,positive(c.id()),new PurchaseOrderActionRequest(c.note())));
            case "approve_purchase_order" -> result=orders(owner.approveOrder(ctx,positive(c.id()),new PurchaseOrderActionRequest(c.note())));
            case "send_purchase_order" -> result=orders(owner.sendOrder(ctx,positive(c.id()),new PurchaseOrderActionRequest(c.note())));
            case "cancel_purchase_order" -> result=orders(owner.cancelOrder(ctx,positive(c.id()),new PurchaseOrderActionRequest(c.note())));
            case "receive_purchase_order" -> result=orders(owner.receiveOrder(ctx,positive(c.id()),receipt(c.receipt())));
            case "create_supplier_submission" -> result=submissions(owner.createSupplierSubmission(ctx,submission(c.submission())));
            case "review_supplier_submission" -> result=submissions(owner.reviewSupplierSubmission(ctx,positive(c.id()),new SupplierSubmissionReviewRequest(SupplierSubmissionStatus.valueOf(c.status()),c.note())));
            case "convert_supplier_submission" -> result=orders(owner.convertSupplierSubmission(ctx,positive(c.id()),conversion(c.conversion())));
            case "submit_supplier_invoice" -> result=invoices(owner.submitSupplierInvoice(ctx,invoice(c.invoice())));
            case "review_supplier_invoice" -> result=invoices(owner.reviewSupplierInvoice(ctx,positive(c.id()),new SupplierInvoiceReviewRequest(SupplierInvoiceStatus.valueOf(c.status()),c.note())));
            case "save_product_supplier" -> result=links(owner.upsertProductSupplier(ctx,link(c.supplierLink())));
            case "update_product_supplier" -> result=links(owner.updateProductSupplier(ctx,positive(c.id()),link(c.supplierLink())));
            default -> throw new IllegalArgumentException("Unsupported procurement operation.");
        }
        return new Result(action,result);
    }
    public void requireResultAccess(AuthSessionUser user,Result result) {
        var ctx=context(user);result.records().orders().forEach(v->record(ctx,"order",v.id()));result.records().submissions().forEach(v->record(ctx,"submission",v.id()));result.records().invoices().forEach(v->record(ctx,"invoice",v.id()));result.records().supplierLinks().forEach(v->record(ctx,"link",v.id()));
    }
    private Prepared plan(AuthSessionUser user,String action,Change c,boolean lock) {
        if(!ACTIONS.contains(action)||c==null)throw new IllegalArgumentException("Invalid procurement operation.");shape(action,c);var ctx=context(user);var versions=new TreeMap<String,String>();boolean create=Set.of("create_purchase_order","create_supplier_submission","submit_supplier_invoice","save_product_supplier").contains(action);
        if(create&&c.id()!=null)throw new IllegalArgumentException("Creation has no existing record ID.");if(lock)jdbc.queryForList("SELECT id FROM companies WHERE id=? FOR UPDATE",Long.class,user.companyId());
        String kind=kind(action);var before=create?Records.empty():record(ctx,kind,positive(c.id()));if(lock&&!create){lockRow(ctx,kind,positive(c.id()));before=record(ctx,kind,positive(c.id()));}
        var after=before;var stock=new ArrayList<StockEffect>();var finance=new ArrayList<FinancialEffect>();var catalog=new ArrayList<CatalogEffect>();
        if(!create)versions.put("record",hash(before));
        if(c.draft()!=null) {
            var draft=c.draft();if(!create&&before.orders().getFirst().status()!=PurchaseOrderStatus.DRAFT)throw new IllegalArgumentException("Only a draft purchase order can be edited.");
            reference(ctx,"warehouse",positive(draft.warehouseId()),lock,versions);reference(ctx,"provider",positive(draft.providerId()),lock,versions);
            validatePurchaseLines(ctx,draft.items(),draft.currency(),lock,versions);after=orders(owner.previewDraft(ctx,draft(draft)));
        } else if(kind.equals("order")) {
            var order=before.orders().getFirst();var status=order.status();String next;
            switch(action) {
                case "request_purchase_order" -> {requireStatus(status,PurchaseOrderStatus.DRAFT);next="REQUESTED";}
                case "approve_purchase_order" -> {requireStatus(status,PurchaseOrderStatus.DRAFT,PurchaseOrderStatus.REQUESTED);admin(ctx);next="APPROVED";}
                case "send_purchase_order" -> {requireStatus(status,PurchaseOrderStatus.APPROVED,PurchaseOrderStatus.REQUESTED,PurchaseOrderStatus.NEEDS_CLARIFICATION);next="SENT";}
                case "cancel_purchase_order" -> {admin(ctx);note(c.note());if(Set.of(PurchaseOrderStatus.RECEIVED,PurchaseOrderStatus.CANCELLED).contains(status))throw new IllegalArgumentException("Received/cancelled orders retain their history.");next="CANCELLED";}
                case "receive_purchase_order" -> {
                    requireStatus(status,PurchaseOrderStatus.SENT,PurchaseOrderStatus.CONFIRMED,PurchaseOrderStatus.APPROVED,PurchaseOrderStatus.PARTIALLY_RECEIVED);
                    reference(ctx,"warehouse",order.warehouseId(),lock,versions);var receipt=receipt(c.receipt());var quantities=new TreeMap<Long,BigDecimal>();
                    for(var item:receipt.items()) {if(quantities.putIfAbsent(item.orderItemId(),item.receivedQuantity())!=null)throw new IllegalArgumentException("A receipt must not repeat purchase line IDs.");}
                    var updated=new ArrayList<PurchaseOrderItemResponse>();
                    for(var line:order.items()) {
                        var received=quantities.remove(line.id());if(received==null)received=BigDecimal.ZERO;if(received.compareTo(line.pendingQuantity())>0)throw new IllegalArgumentException("Receipt exceeds remaining quantity.");
                        if(received.signum()>0) {var product=reference(ctx,"product",line.productId(),lock,versions);validateStockProduct(product,received,order.currencyCode());balance(ctx,line.productId(),order.warehouseId(),lock,versions);stock.add(new StockEffect(line.productId(),order.warehouseId(),received,line.unitCost(),order.currencyCode()));}
                        updated.add(new PurchaseOrderItemResponse(line.id(),line.productId(),line.sku(),line.productName(),line.quantity(),line.receivedQuantity().add(received),line.pendingQuantity().subtract(received),line.unitCost(),line.taxRate(),line.lineSubtotal(),line.lineTax(),line.lineTotal()));
                    }
                    if(!quantities.isEmpty())throw new IllegalArgumentException("Receipt contains lines from another purchase order.");next=updated.stream().allMatch(v->v.pendingQuantity().signum()==0)?"RECEIVED":"PARTIALLY_RECEIVED";
                    after=orders(copyOrder(order,next,updated,c.note()));
                    if(next.equals("RECEIVED")) {
                        var outstanding=repository.lockUnlinkedSupplierInvoicesForOrder(ctx,order.id());
                        versions.put("invoices",hash(outstanding));for(var v:outstanding)finance.add(new FinancialEffect("SUPPLIER_INVOICE_EXPENSE",v.currencyCode(),v.totalAmount(),true,false));
                    }
                }
                default -> throw new IllegalArgumentException("Unknown purchase state operation.");
            }
            if(!action.equals("receive_purchase_order"))after=orders(copyOrder(order,next,order.items(),c.note()));
        } else if(kind.equals("submission")) {
            if(c.submission()!=null) {
                var input=c.submission();reference(ctx,"provider",positive(input.providerId()),lock,versions);currency(input.currency());bounded(input.items());
                for(var line:input.items()){positiveAmount(line.quantity(),3);amount(line.unitCost(),4);rate(line.taxRate());text(line.name(),240,true);if(line.productId()!=null)reference(ctx,"product",positive(line.productId()),lock,versions);}
                // A submitted quotation does not change stock or create a payable.
            } else {
                admin(ctx);var submission=before.submissions().getFirst();if(Set.of(SupplierSubmissionStatus.CONVERTED_TO_PURCHASE_ORDER,SupplierSubmissionStatus.SUPERSEDED).contains(submission.status()))throw new IllegalArgumentException("Final supplier quotations retain their history.");
                if(action.equals("review_supplier_submission")) {
                    if(!Set.of("IN_REVIEW","NEEDS_CLARIFICATION","APPROVED","PARTIALLY_APPROVED","REJECTED").contains(Objects.toString(c.status(),"")))throw new IllegalArgumentException("Invalid supplier review status.");note(c.note());after=submissions(copySubmission(submission,c.status()));
                } else {
                    if(!Set.of(SupplierSubmissionStatus.APPROVED,SupplierSubmissionStatus.PARTIALLY_APPROVED).contains(submission.status())||submission.convertedPurchaseOrderId()!=null)throw new IllegalArgumentException("Approve the quotation before converting it once.");
                    var conversion=conversion(c.conversion());reference(ctx,"warehouse",conversion.warehouseId(),lock,versions);reference(ctx,"provider",submission.providerId(),lock,versions);var decisions=new HashMap<Long,SupplierSubmissionItemResolutionRequest>();
                    for(var r:conversion.itemResolutions())if(decisions.putIfAbsent(r.itemId(),r)!=null)throw new IllegalArgumentException("Each quoted line needs one decision.");
                    var accepted=new ArrayList<Line>();for(var line:submission.items()) {var r=decisions.remove(line.id());if(r==null)throw new IllegalArgumentException("Review every quoted line.");if(r.decision()==SupplierCatalogDecision.REJECT)continue;var product=reference(ctx,"product",positive(r.productId()),lock,versions);validateStockProduct(product,line.quantity(),submission.currencyCode());amount(r.salePrice(),4);catalog.add(new CatalogEffect(r.productId(),decimal(product.get("cost")),line.unitCost(),decimal(product.get("price")),r.salePrice(),submission.currencyCode()));accepted.add(new Line(r.productId(),line.quantity(),line.unitCost(),line.taxRate()));}
                    if(!decisions.isEmpty()||accepted.isEmpty())throw new IllegalArgumentException("Invalid quotation decisions or no accepted products.");after=orders(owner.previewDraft(ctx,draft(new Draft(submission.providerId(),conversion.warehouseId(),submission.currencyCode(),conversion.expectedDate(),conversion.notes(),accepted))));
                }
            }
        } else if(kind.equals("invoice")) {
            admin(ctx);
            if(c.invoice()!=null) {var input=c.invoice();var request=invoice(input);reference(ctx,"provider",request.providerId(),lock,versions);PurchaseOrderResponse order=null;
                if(request.purchaseOrderId()!=null) {order=owner.getOrder(ctx,positive(request.purchaseOrderId()));if(lock)lockRow(ctx,"order",order.id());versions.put("order",hash(order));if(!order.providerId().equals(request.providerId())||!order.currencyCode().equals(request.currencyCode())||order.status()==PurchaseOrderStatus.CANCELLED)throw new IllegalArgumentException("Invoice requires the same supplier and native currency on a current order.");}
                versions.put("duplicates",hash(repository.listSupplierInvoices(ctx,null,request.providerId()).stream().filter(v->v.invoiceNumber().equalsIgnoreCase(request.invoiceNumber())).toList()));
                if(repository.listSupplierInvoices(ctx,null,request.providerId()).stream().anyMatch(v->v.invoiceNumber().equalsIgnoreCase(request.invoiceNumber())))throw new IllegalArgumentException("This supplier invoice is already registered.");
                finance.add(new FinancialEffect("SUPPLIER_INVOICE_EXPENSE",request.currencyCode(),request.totalAmount(),order==null||order.status()==PurchaseOrderStatus.RECEIVED,false));
            } else {if(!Set.of("MATCHED","APPROVED_FOR_PAYMENT","REJECTED").contains(Objects.toString(c.status(),"")))throw new IllegalArgumentException("Invalid supplier invoice review.");note(c.note());after=invoices(copyInvoice(before.invoices().getFirst(),c.status()));}
        } else {
            var request=link(c.supplierLink());reference(ctx,"provider",request.providerId(),lock,versions);reference(ctx,"product",request.productId(),lock,versions);
            if(!create) {var current=before.supplierLinks().getFirst();if(!current.productId().equals(request.productId())||!current.providerId().equals(request.providerId()))throw new IllegalArgumentException("Supplier links keep their product and supplier identities.");}
            versions.put("supplierLinks",hash(repository.listProductSuppliers(ctx)));
        }
        return new Prepared(action,c,before,after,List.copyOf(stock),List.copyOf(finance),List.copyOf(catalog),Map.copyOf(versions),ctx.scope().type().name());
    }

    public PosContext context(AuthSessionUser user) {
        var scope=scopes.resolve(user);var pos=switch(scope.type()) {case CORPORATE_OFFICE->PosScope.corporateOffice();case UNIT_HEADQUARTERS->PosScope.unitHeadquarters(scope.unitId());case BUSINESS_OFFICE->PosScope.businessOffice(scope.unitId(),scope.businessId());case UNASSIGNED->throw new SecurityException("A current organization assignment is required.");};
        return new PosContext(user.userId(),user.companyId(),user.userName(),user.role().toLowerCase(Locale.ROOT),true,pos);
    }
    public static String kind(String action){if(action.contains("supplier_submission"))return "submission";if(action.contains("supplier_invoice"))return "invoice";if(action.contains("product_supplier"))return "link";return "order";}
    private Records list(PosContext ctx,String kind,Query q) {return switch(kind) {
        case "order"->new Records(repository.listOrders(ctx,q.status()==null?null:PurchaseOrderStatus.valueOf(q.status()),null,q.providerId(),q.warehouseId(),q.from(),q.to()),List.of(),List.of(),List.of());
        case "submission"->new Records(List.of(),repository.listSupplierSubmissions(ctx,q.status()==null?null:SupplierSubmissionStatus.valueOf(q.status()),q.providerId(),q.from(),q.to()).stream().map(this::safeSubmission).toList(),List.of(),List.of());
        case "invoice"->new Records(List.of(),List.of(),repository.listSupplierInvoices(ctx,q.status()==null?null:SupplierInvoiceStatus.valueOf(q.status()),q.providerId()).stream().map(this::safeInvoice).toList(),List.of());
        default->new Records(List.of(),List.of(),List.of(),repository.listProductSuppliers(ctx).stream().filter(v->q.providerId()==null||q.providerId().equals(v.providerId())).toList());};}
    private Records record(PosContext ctx,String kind,long id){return switch(kind){case "order"->orders(owner.getOrder(ctx,id));case "submission"->submissions(owner.getSupplierSubmission(ctx,id));case "invoice"->invoices(repository.findSupplierInvoice(ctx,id).orElseThrow(NoSuchElementException::new));default->links(repository.findProductSupplier(ctx,id).orElseThrow(NoSuchElementException::new));};}
    private Records orders(PurchaseOrderResponse v){return new Records(List.of(v),List.of(),List.of(),List.of());}
    private Records submissions(SupplierSubmissionResponse v){return new Records(List.of(),List.of(safeSubmission(v)),List.of(),List.of());}
    private Records invoices(SupplierInvoiceResponse v){return new Records(List.of(),List.of(),List.of(safeInvoice(v)),List.of());}
    private Records links(ProductSupplierResponse v){return new Records(List.of(),List.of(),List.of(),List.of(v));}
    private SupplierInvoiceResponse safeInvoice(SupplierInvoiceResponse v){return new SupplierInvoiceResponse(v.id(),v.providerId(),v.providerName(),v.purchaseOrderId(),v.purchaseOrderFolio(),v.invoiceNumber(),v.invoiceDate(),v.dueDate(),v.subtotalAmount(),v.taxAmount(),v.totalAmount(),v.currencyCode(),v.status(),null,v.notes(),null,v.reviewedByUserId(),v.reviewedAt(),v.reviewNote(),v.createdAt());}
    private SupplierSubmissionResponse safeSubmission(SupplierSubmissionResponse v){return new SupplierSubmissionResponse(v.id(),v.companyId(),v.providerId(),v.providerName(),v.providerEmail(),null,v.submissionNumber(),v.status(),v.currencyCode(),v.subtotalAmount(),v.taxAmount(),v.totalAmount(),null,null,v.submittedAt(),v.reviewedByUserId(),v.reviewedAt(),v.reviewNote(),v.convertedPurchaseOrderId(),v.notes(),v.createdAt(),v.items().stream().map(i->new SupplierSubmissionItemResponse(i.id(),i.productId(),i.providerSku(),i.productName(),i.productDescription(),null,i.quantity(),i.unitCost(),i.taxRate(),i.lineSubtotal(),i.lineTax(),i.lineTotal(),i.leadTimeDays(),i.minimumOrderQuantity(),i.status(),i.reviewNote())).toList());}
    private Records slice(Records r,int start,int end){return new Records(r.orders().isEmpty()?List.of():r.orders().subList(start,end),r.submissions().isEmpty()?List.of():r.submissions().subList(start,end),r.invoices().isEmpty()?List.of():r.invoices().subList(start,end),r.supplierLinks().isEmpty()?List.of():r.supplierLinks().subList(start,end));}
    private static int size(Records r){return r.orders().size()+r.submissions().size()+r.invoices().size()+r.supplierLinks().size();}
    private PurchaseOrderResponse copyOrder(PurchaseOrderResponse v,String status,List<PurchaseOrderItemResponse> items,String note){return new PurchaseOrderResponse(v.id(),v.companyId(),v.unitId(),v.businessId(),v.warehouseId(),v.warehouseName(),v.providerId(),v.providerName(),v.providerEmail(),v.folio(),PurchaseOrderStatus.valueOf(status),v.origin(),v.sourceSubmissionId(),v.currencyCode(),v.subtotalAmount(),v.taxAmount(),v.totalAmount(),v.expectedDate(),v.orderedAt(),v.approvedAt(),v.sentAt(),v.receivedAt(),v.cancelledAt(),note==null?v.notes():note,v.createdAt(),items);}
    private SupplierSubmissionResponse copySubmission(SupplierSubmissionResponse v,String status){return new SupplierSubmissionResponse(v.id(),v.companyId(),v.providerId(),v.providerName(),v.providerEmail(),null,v.submissionNumber(),SupplierSubmissionStatus.valueOf(status),v.currencyCode(),v.subtotalAmount(),v.taxAmount(),v.totalAmount(),null,null,v.submittedAt(),v.reviewedByUserId(),v.reviewedAt(),v.reviewNote(),v.convertedPurchaseOrderId(),v.notes(),v.createdAt(),v.items());}
    private SupplierInvoiceResponse copyInvoice(SupplierInvoiceResponse v,String status){return new SupplierInvoiceResponse(v.id(),v.providerId(),v.providerName(),v.purchaseOrderId(),v.purchaseOrderFolio(),v.invoiceNumber(),v.invoiceDate(),v.dueDate(),v.subtotalAmount(),v.taxAmount(),v.totalAmount(),v.currencyCode(),SupplierInvoiceStatus.valueOf(status),null,v.notes(),null,v.reviewedByUserId(),v.reviewedAt(),v.reviewNote(),v.createdAt());}
    private Map<String,Object> reference(PosContext ctx,String kind,long id,boolean lock,Map<String,String> versions) {
        String table=switch(kind){case "warehouse"->"sales_inventory_warehouses";case "provider"->"finance_providers";case "product"->"sales_products";default->throw new IllegalArgumentException("Invalid procurement reference.");};
        if(kind.equals("warehouse"))repository.findWarehouse(ctx,id).orElseThrow(NoSuchElementException::new);else if(kind.equals("provider"))repository.findProvider(ctx,id).orElseThrow(NoSuchElementException::new);else repository.findProduct(ctx,id).orElseThrow(NoSuchElementException::new);
        var rows=jdbc.queryForList((kind.equals("product")?"SELECT *, COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(metadata_json,'$.packaging.baseUnit')),''),'Piece') inventory_unit FROM ":"SELECT * FROM ")+table+" WHERE company_id=? AND id=? AND deleted_at IS NULL"+(lock?" FOR UPDATE":""),ctx.companyId(),id);if(rows.size()!=1)throw new NoSuchElementException();var row=rows.getFirst();versions.put(kind+":"+id,hash(row));return row;
    }
    private void balance(PosContext ctx,long product,long warehouse,boolean lock,Map<String,String> versions){versions.put("balance:"+product+":"+warehouse,hash(jdbc.queryForList("SELECT * FROM sales_inventory_balances WHERE company_id=? AND product_id=? AND warehouse_id=?"+(lock?" FOR UPDATE":""),ctx.companyId(),product,warehouse)));}
    private void lockRow(PosContext ctx,String kind,long id){String table=switch(kind){case "order"->"pos_purchase_orders";case "submission"->"pos_supplier_submissions";case "invoice"->"pos_supplier_invoices";default->"pos_product_suppliers";};jdbc.queryForList("SELECT id FROM "+table+" WHERE company_id=? AND id=? FOR UPDATE",Long.class,ctx.companyId(),id);}
    private void validatePurchaseLines(PosContext ctx,List<Line> lines,String currency,boolean lock,Map<String,String> versions){bounded(lines);currency(currency);var ids=lines.stream().map(v->positive(v.productId())).distinct().sorted().toList();var products=new HashMap<Long,Map<String,Object>>();ids.forEach(id->products.put(id,reference(ctx,"product",id,lock,versions)));for(var line:lines){validateStockProduct(products.get(line.productId()),line.quantity(),currency);amount(line.unitCost(),4);rate(line.taxRate());}}
    private void validateStockProduct(Map<String,Object> row,BigDecimal quantity,String currency){positiveAmount(quantity,3);if(!"active".equalsIgnoreCase(Objects.toString(row.get("status"),""))||"SERVICE".equalsIgnoreCase(Objects.toString(row.get("type"),"")))throw new IllegalArgumentException("An active stock product is required.");if(!currency(currency).equalsIgnoreCase(Objects.toString(row.get("currency"),"")))throw new IllegalArgumentException("Stock receipts retain the product's native cost currency.");if("Piece".equalsIgnoreCase(Objects.toString(row.get("inventory_unit"),"Piece"))&&quantity.stripTrailingZeros().scale()>0)throw new IllegalArgumentException("Piece quantities must be whole.");}
    private static PurchaseOrderCreateRequest draft(Draft d){requiredInput(d,"Draft required.");return new PurchaseOrderCreateRequest(positive(d.providerId()),positive(d.warehouseId()),currency(d.currency()),PurchaseOrderOrigin.POS_REPLENISHMENT,d.expectedDate(),text(d.notes(),4000,false),d.items().stream().map(l->new PurchaseOrderItemRequest(positive(l.productId()),null,null,positiveAmount(l.quantity(),3),amount(l.unitCost(),4),rate(l.taxRate()))).toList());}
    private static PurchaseOrderReceiveRequest receipt(Receipt r){requiredInput(r,"Receipt required.");bounded(r.items());return new PurchaseOrderReceiveRequest(text(r.notes(),4000,false),r.items().stream().map(v->new PurchaseOrderReceiveItemRequest(positive(v.orderItemId()),positiveAmount(v.receivedQuantity(),3))).toList());}
    private static SupplierInvoiceRequest invoice(Invoice i){requiredInput(i,"Invoice required.");var subtotal=amount(i.subtotal(),2);var tax=amount(i.tax()==null?BigDecimal.ZERO:i.tax(),2);if(i.date()!=null&&i.dueDate()!=null&&i.dueDate().isBefore(i.date()))throw new IllegalArgumentException("Invoice due date cannot precede its date.");return new SupplierInvoiceRequest(positive(i.providerId()),i.purchaseOrderId()==null?null:positive(i.purchaseOrderId()),text(i.number(),120,true),i.date(),i.dueDate(),subtotal,tax,subtotal.add(tax),currency(i.currency()),text(i.notes(),4000,false),null,null);}
    private static SupplierSubmissionConvertRequest conversion(Conversion c){requiredInput(c,"Conversion required.");bounded(c.items());return new SupplierSubmissionConvertRequest(positive(c.warehouseId()),c.expectedDate(),text(c.notes(),4000,false),c.items().stream().map(v->{if(!Set.of("LINK_EXISTING","REJECT").contains(v.decision()))throw new IllegalArgumentException("Create catalog products first, then explicitly link or reject quoted lines.");return new SupplierSubmissionItemResolutionRequest(positive(v.itemId()),SupplierCatalogDecision.valueOf(v.decision()),v.productId(),null,null,null,null,null,null,v.salePrice(),text(v.note(),4000,false));}).toList());}
    private static ProductSupplierRequest link(SupplierLink s){requiredInput(s,"Supplier link required.");if(s.leadTimeDays()!=null&&(s.leadTimeDays()<0||s.leadTimeDays()>3650))throw new IllegalArgumentException("Invalid lead time.");return new ProductSupplierRequest(positive(s.productId()),positive(s.providerId()),text(s.sku(),120,false),amount(s.cost(),4),currency(s.currency()),s.leadTimeDays(),positiveAmount(s.minimumQuantity()==null?BigDecimal.ONE:s.minimumQuantity(),3),s.preferred(),s.active(),text(s.notes(),4000,false));}
    private static SupplierSubmissionCreateRequest submission(Submission s){requiredInput(s,"Supplier quotation required.");bounded(s.items());return new SupplierSubmissionCreateRequest(positive(s.providerId()),null,currency(s.currency()),null,null,text(s.notes(),4000,false),s.items().stream().map(l->new SupplierSubmissionItemRequest(l.productId(),text(l.sku(),120,false),text(l.name(),240,true),text(l.description(),4000,false),null,positiveAmount(l.quantity(),3),amount(l.unitCost(),4),rate(l.taxRate()),l.leadTimeDays(),l.minimumQuantity())).toList());}
    private void shape(String action,Change c){if(action.startsWith("review_")&&(c.status()==null||c.note()==null))throw new IllegalArgumentException("Explicit review status and note required.");String field=switch(action){case "create_purchase_order","update_purchase_order_draft"->"draft";case "receive_purchase_order"->"receipt";case "submit_supplier_invoice"->"invoice";case "convert_supplier_submission"->"conversion";case "save_product_supplier","update_product_supplier"->"supplierLink";case "create_supplier_submission"->"submission";default->null;};var node=mapper.valueToTree(c);var allowed=new HashSet<>(Set.of("id","note"));if(action.startsWith("review_"))allowed.add("status");if(field!=null)allowed.add(field);node.fieldNames().forEachRemaining(k->{if(!allowed.contains(k))throw new IllegalArgumentException("Unexpected procurement section: "+k);});if(field!=null&&!node.has(field))throw new IllegalArgumentException(field+" required.");}
    private static BigDecimal decimal(Object value){return value==null?BigDecimal.ZERO:new BigDecimal(value.toString());}
    private static long positive(Long v){if(v==null||v<1)throw new IllegalArgumentException("Positive record ID required.");return v;}
    private static String currency(String v){if(v==null||!Set.of("CAD","MXN","USD","EUR").contains(v.toUpperCase(Locale.ROOT)))throw new IllegalArgumentException("Supported native currency required.");return v.toUpperCase(Locale.ROOT);}
    private static BigDecimal amount(BigDecimal v,int scale){if(v==null||v.signum()<0||v.precision()-v.scale()>12||v.stripTrailingZeros().scale()>scale)throw new IllegalArgumentException("Invalid amount precision.");return v;}
    private static BigDecimal positiveAmount(BigDecimal v,int scale){amount(v,scale);if(v.signum()<=0)throw new IllegalArgumentException("Positive quantity required.");return v;}
    private static BigDecimal rate(BigDecimal v){var rate=v==null?BigDecimal.ZERO:amount(v,4);if(rate.compareTo(BigDecimal.ONE)>0)throw new IllegalArgumentException("Tax rate must be between 0 and 1.");return rate;}
    private static void bounded(List<?> v){if(v==null||v.isEmpty()||v.size()>100)throw new IllegalArgumentException("Provide 1 to 100 lines.");}
    private static String text(String v,int max,boolean required){if(v==null&&!required)return null;if(v==null||v.length()>max||(required&&v.isBlank()))throw new IllegalArgumentException("Invalid procurement text.");return v.trim();}
    private static void note(String v){text(v,4000,true);if(v.trim().length()<5)throw new IllegalArgumentException("Explain the operation with at least 5 characters.");}
    private static void admin(PosContext ctx){if(!ctx.canManageOtherUsers())throw new SecurityException("Current procurement approval authority required.");}
    private static void requireStatus(PurchaseOrderStatus actual,PurchaseOrderStatus... allowed){if(!List.of(allowed).contains(actual))throw new IllegalArgumentException("Purchase order cannot transition from "+actual);}
    private com.fasterxml.jackson.databind.JsonNode canonical(Object v){try{return mapper.reader().with(com.fasterxml.jackson.databind.DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS).readTree(mapper.writeValueAsString(v));}catch(Exception e){throw new IllegalStateException("Invalid procurement snapshot.",e);}}
    private String hash(Object value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(value)));}catch(Exception e){throw new IllegalStateException("Cannot bind procurement snapshot.",e);}}
    private static String cursor(int offset,String binding){return Base64.getUrlEncoder().withoutPadding().encodeToString((offset+":"+binding).getBytes(StandardCharsets.UTF_8));}
    private static int offset(String cursor,String binding){if(cursor==null)return 0;try{var parts=new String(Base64.getUrlDecoder().decode(cursor),StandardCharsets.UTF_8).split(":",2);int offset=Integer.parseInt(parts[0]);if(offset>=0&&parts[1].equals(binding))return offset;}catch(RuntimeException ignored){}throw new IllegalArgumentException("Cursor belongs to another scope or query.");}
    private static <T>T requiredInput(T value,String message){if(value==null)throw new IllegalArgumentException(message);return value;}
}
