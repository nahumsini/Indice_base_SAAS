package com.indice.erp.sales;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.sales.SalesAssistantContracts.*;
import static com.indice.erp.sales.SalesAssistantFields.*;

/** Sales-owned assistant use cases. AI authorization stays at the delegated boundary. */
@Service
public class SalesAssistantService {
    private final SalesAssistantRepository repository;
    private final SalesService sales;
    private final SalesRepository raw;
    private final OpportunityFlowService flows;
    private final HrOperationalScopeService scopes;
    private final ObjectMapper mapper;
    public SalesAssistantService(SalesAssistantRepository repository, SalesService sales, SalesRepository raw,
            OpportunityFlowService flows, HrOperationalScopeService scopes, ObjectMapper mapper) {
        this.repository = repository; this.sales = sales; this.raw = raw; this.flows = flows; this.scopes = scopes; this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public RecordView detail(AuthSessionUser user, String kind, long id) { return view(kind, record(user, scope(user), kind, id, false)); }

    @Transactional(readOnly = true)
    public Page<RecordView> list(AuthSessionUser user, String kind, Query query) {
        query = query == null ? new Query(null, null, null, null, null, null, null, null) : query;
        var scope = scope(user);
        int limit = query.limit() == null ? 20 : query.limit();
        if (limit < 1 || limit > 50 || (query.query() != null && query.query().length() > 120)) throw new IllegalArgumentException("Invalid page.");
        var binding = hash(List.of(kind, user.companyId(), scope, Arrays.asList(query.query(), query.status(), query.stage(), query.customerId(), query.ownerUserCompanyId(), limit)));
        int offset = offset(query.cursor(), binding);
        var page = repository.page(user, scope, kind, query, offset, limit);
        var rows = page.ids().stream().map(id -> view(kind, sales.get(user.companyId(), repository.collection(kind), id))).toList();
        boolean more = offset + rows.size() < page.total();
        return new Page<>(rows, page.total(), more, more ? cursor(offset + rows.size(), binding) : null, scope.type().name());
    }

    @Transactional(readOnly = true)
    public Page<Assignee> assignees(AuthSessionUser user, Query query) {
        query = query == null ? new Query(null, null, null, null, null, null, null, null) : query;
        var scope = scope(user);
        int limit = query.limit() == null ? 20 : query.limit();
        if (limit < 1 || limit > 50 || (query.query() != null && query.query().length() > 120)) throw new IllegalArgumentException("Invalid page.");
        var binding = hash(Arrays.asList("assignees", user.companyId(), scope, query.query(), limit));
        int offset = offset(query.cursor(), binding);
        var page = repository.assignees(user, scope, query.query(), null, offset, limit);
        int end = offset + page.items().size();
        boolean more = end < page.totalCount();
        return new Page<>(page.items(), page.totalCount(), more, more ? cursor(end, binding) : null, scope.type().name());
    }

    @Transactional(readOnly = true)
    public Pipeline pipeline(AuthSessionUser user) {
        return pipeline(user, null);
    }

    @Transactional(readOnly = true)
    public Pipeline pipeline(AuthSessionUser user, Long flowId) {
        var scope = scope(user);
        var catalog = flows.assistantFlows(user.companyId());
        var selected = catalog.stream().filter(flow -> flowId == null ? flow.defaultFlow() : flowId.equals(flow.id())).findFirst()
            .orElseThrow(() -> new NoSuchElementException("Active flow not found."));
        return new Pipeline(selected.id(), catalog, repository.pipeline(user, scope, selected), scope.type().name());
    }

    @Transactional(readOnly = true)
    public Prepared prepare(AuthSessionUser user, String kind, boolean update, Change change) {
        if (change == null || update != (change.id() != null)) throw new IllegalArgumentException(update ? "id is required." : "Creation does not accept id.");
        var scope = scope(user);
        var before = update ? record(user, scope, kind, change.id(), false) : new LinkedHashMap<String, Object>();
        var payload = SalesAssistantFields.payload(mapper, kind, change);
        var references = new LinkedHashMap<String, String>();
        var after = new LinkedHashMap<>(before);
        after.putAll(payload);
        if (!update) {
            payload.putIfAbsent("status", kind.equals("quote") ? "draft" : "active");
            if (!kind.equals("customer") && !payload.containsKey("currency")) throw new IllegalArgumentException("currency is required.");
        }
        var ownerKey = apiName(kind, "ownerUserCompanyId");
        if (!update && !payload.containsKey(ownerKey)) payload.put(ownerKey, user.userCompanyId());
        if (payload.containsKey(ownerKey)) {
            var assignee = assignee(user, scope, positive(payload.get(ownerKey), ownerKey));
            payload.put(kind.equals("quote") ? "assignedSellerName" : "ownerName", assignee.name());
            references.put("assignee:" + assignee.userCompanyId(), hash(assignee));
            if (!update && kind.equals("customer")) { payload.put("unitId", assignee.unitId()); payload.put("businessId", assignee.businessId()); }
        }
        after.putAll(payload);
        if (!kind.equals("customer")) {
            Long customerId = id(after, "contactId");
            Long opportunityId = kind.equals("quote") ? id(after, "opportunityId") : null;
            if (opportunityId != null) {
                var opportunity = reference(user, scope, "opportunity", opportunityId, references);
                if (customerId == null) { customerId = id(opportunity, "contactId"); payload.put("contactId", customerId); }
                if (!Objects.equals(customerId, id(opportunity, "contactId"))) throw new IllegalArgumentException("The opportunity belongs to a different customer.");
                if (!update || payload.containsKey("opportunityId")) payload.put("connectionStatus", "assigned_to_existing_opportunity");
            } else if (kind.equals("quote") && payload.containsKey("opportunityId")) payload.put("connectionStatus", "commercial_quote");
            if (customerId == null) throw new IllegalArgumentException("Select a customer first.");
            var customer = reference(user, scope, "customer", customerId, references);
            if (!update || payload.containsKey("contactId")) {
                if (kind.equals("opportunity")) {
                    payload.put("companyName", customer.get("companyName")); payload.put("unitId", customer.get("unitId")); payload.put("businessId", customer.get("businessId"));
                } else payload.put("clientName", customer.get("companyName"));
                payload.put("contactPerson", customer.get("contactPerson"));
            }
            if (kind.equals("opportunity") && (!update || payload.containsKey("stage") || payload.containsKey("flowId"))) {
                var catalog = flows.assistantFlows(user.companyId());
                Long flowId = id(payload, "flowId");
                var flow = catalog.stream().filter(f -> flowId == null ? f.defaultFlow() : flowId.equals(f.id())).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Select an active opportunity flow."));
                String target = str(payload, "stage");
                if (target == null) {
                    if (update) throw new IllegalArgumentException("stage is required when selecting a flow.");
                    target = flow.stages().stream().filter(s -> s.type().equals("OPEN")).findFirst().orElseThrow().key();
                }
                String selected = target;
                var stage = flow.stages().stream().filter(s -> s.key().equals(selected)).findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Select an active stage from get_opportunity_pipeline."));
                if (update && !"OPEN".equals(str(before, "lifecycleStatus")) && !stage.type().equals(str(before, "lifecycleStatus")))
                    throw new IllegalArgumentException("Won or lost opportunities cannot be reopened by changing their flow.");
                payload.put("stage", stage.key()); payload.put("flowId", flow.id());
                after.put("lifecycleStatus", stage.type()); after.put("probabilityPercent", stage.probabilityPercent()); after.put("flowName", flow.name());
                references.put("flows", hash(catalog));
            }
        }
        after.putAll(payload);
        if (kind.equals("quote")) prepareQuote(user, update, change, before, after, payload, references);
        if (!update) text(str(after, apiName(kind, "name")), "name", 220);
        if (update && payload.entrySet().stream().allMatch(e -> Objects.equals(mapper.valueToTree(e.getValue()), mapper.valueToTree(before.get(e.getKey())))))
            throw new IllegalArgumentException("No changes requested.");
        return new Prepared(kind, change.id(), update ? hash(before) : null, payload, update ? view(kind, before) : null, view(kind, after), references);
    }

    private void prepareQuote(AuthSessionUser user, boolean update, Change change, Map<String, Object> before,
            Map<String, Object> after, Map<String, Object> payload, Map<String, String> references) {
        if (update && repository.quoteHasSale(user.companyId(), change.id()) && payload.keySet().stream().anyMatch(k -> !Set.of("notes", "terms", "assignedSellerUserCompanyId", "assignedSellerName", "connectionStatus").contains(k)))
            throw new IllegalArgumentException("This quote has a sale; use the Sales correction workflow to change its commercial terms.");
        if (!update && change.items() == null) throw new IllegalArgumentException("Quote items are required.");
        if (change.items() != null) {
            if (change.items().isEmpty() || change.items().size() > 100) throw new IllegalArgumentException("Use between 1 and 100 quote items.");
            var items = new ArrayList<Map<String, Object>>();
            for (var input : change.items()) {
                var line = line(input, items.size());
                if (input.productId() != null) {
                    var product = product(user, input.productId());
                    if (!"active".equalsIgnoreCase(str(product, "status")) || !SalesService.PRODUCT_SALES_VISIBILITIES.contains(Objects.toString(product.get("visibility"), "").trim().toLowerCase(Locale.ROOT)))
                        throw new IllegalArgumentException("Choose an active commercial product.");
                    if (!Objects.equals(str(product, "currency"), str(after, "currency"))) throw new IllegalArgumentException("Product and quote currency must match. Currency conversion requires the Sales workflow.");
                    line.putIfAbsent("productName", product.get("name")); line.put("sku", product.get("sku"));
                    references.put("product:" + input.productId(), hash(product));
                }
                text(str(line, "productName"), "productName", 220);
                items.add(line);
            }
            BigDecimal total = items.stream().map(i -> money(i, "lineTotal")).reduce(BigDecimal.ZERO, BigDecimal::add);
            decimal(total, "amount", false, new BigDecimal("9999999999999.99"));
            payload.put("items", items); after.put("items", items); after.put("amount", total);
        }
        if (payload.containsKey("currency") && update && !Objects.equals(before.get("currency"), payload.get("currency")) && change.items() == null)
            throw new IllegalArgumentException("Provide all prices when changing quote currency.");
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public RecordView execute(AuthSessionUser user, Prepared prepared) {
        var scope = scope(user);
        if (prepared.id() != null) {
            var current = record(user, scope, prepared.kind(), prepared.id(), true);
            if (!prepared.version().equals(hash(current))) throw new Changed();
            if (prepared.kind().equals("quote") && repository.quoteHasSale(user.companyId(), prepared.id())
                    && prepared.payload().keySet().stream().anyMatch(k -> !Set.of("notes", "terms", "assignedSellerUserCompanyId", "assignedSellerName", "connectionStatus").contains(k))) throw new Changed();
        }
        for (var ref : prepared.referenceVersions().entrySet()) {
            String key = ref.getKey(); Object current;
            if (key.equals("flows")) {
                repository.lockFlows(user.companyId());
                current = flows.assistantFlows(user.companyId());
            }
            else {
                var parts = key.split(":"); long id = Long.parseLong(parts[1]);
                if (parts[0].equals("assignee") || parts[0].equals("product")) repository.lockReference(user.companyId(), parts[0], id);
                current = switch (parts[0]) {
                    case "assignee" -> assignee(user, scope, id);
                    case "product" -> product(user, id);
                    default -> record(user, scope, parts[0], id, true);
                };
            }
            if (!ref.getValue().equals(hash(current))) throw new Changed();
        }
        var payload = new LinkedHashMap<>(prepared.payload());
        var saved = prepared.id() == null ? sales.create(user.companyId(), user.userId(), repository.collection(prepared.kind()), payload)
            : sales.update(user.companyId(), user.userId(), repository.collection(prepared.kind()), prepared.id(), payload);
        if (prepared.kind().equals("opportunity") && payload.containsKey("stage")) {
            saved.put("flowId", payload.get("flowId")); saved.put("flowName", prepared.after().flowName());
        }
        return view(prepared.kind(), saved);
    }

    private Map<String, Object> reference(AuthSessionUser user, HrOperationalScope scope, String kind, long id, Map<String, String> versions) {
        var row = record(user, scope, kind, id, false); versions.put(kind + ":" + id, hash(row)); return row;
    }
    private Map<String, Object> record(AuthSessionUser user, HrOperationalScope scope, String kind, long id, boolean lock) {
        repository.requireRecord(user, scope, kind, id, lock);
        if (lock && kind.equals("quote")) repository.lockItems(user.companyId(), id);
        return sales.get(user.companyId(), repository.collection(kind), id);
    }
    private Map<String, Object> product(AuthSessionUser user, long id) { return raw.get(user.companyId(), SalesDefinitions.definitions().get("products"), id); }
    private Assignee assignee(AuthSessionUser user, HrOperationalScope scope, long id) {
        return repository.assignees(user, scope, null, id, 0, 1).items().stream().findFirst().orElseThrow(() -> new NoSuchElementException("Assignee not found in authorized scope."));
    }
    private HrOperationalScope scope(AuthSessionUser user) {
        if (user.userCompanyId() == null) throw new SecurityException("Active company membership required.");
        var scope = scopes.resolve(user);
        if (scope.type() == HrOperationalScope.Type.UNASSIGNED) throw new SecurityException("Organizational scope required.");
        return scope;
    }
    private String hash(Object value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(value))); }
        catch (Exception exception) { throw new IllegalStateException("Commercial snapshot failed.", exception); }
    }
    private String cursor(int offset, String binding) { return Base64.getUrlEncoder().withoutPadding().encodeToString((offset + ":" + binding).getBytes(StandardCharsets.UTF_8)); }
    private int offset(String cursor, String binding) {
        if (cursor == null) return 0;
        try {
            if (cursor.length() > 160) throw new IllegalArgumentException();
            var parts = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split(":");
            int value = Integer.parseInt(parts[0]);
            if (parts.length != 2 || value < 0 || !parts[1].equals(binding)) throw new IllegalArgumentException();
            return value;
        } catch (RuntimeException exception) { throw new IllegalArgumentException("Invalid cursor for these filters."); }
    }
}
