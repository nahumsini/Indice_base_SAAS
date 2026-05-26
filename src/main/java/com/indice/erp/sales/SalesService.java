package com.indice.erp.sales;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SalesService {

    private final SalesRepository salesRepository;
    private final SalesReferenceService referenceService;
    private final Map<String, SalesEntityDefinition> definitions = SalesDefinitions.definitions();

    public SalesService(SalesRepository salesRepository, SalesReferenceService referenceService) {
        this.salesRepository = salesRepository;
        this.referenceService = referenceService;
    }

    public Map<String, Object> context(long companyId, long userId) {
        var users = salesRepository.contextUsers(companyId);
        var body = new LinkedHashMap<String, Object>();
        body.put("users", users);
        body.put("units", salesRepository.contextUnits(companyId));
        body.put("businesses", salesRepository.contextBusinesses(companyId));
        body.put("currentUserCompanyId", currentUserCompanyId(users, userId));
        body.put("dictionaries", dictionaries());
        return body;
    }

    public Map<String, Object> list(long companyId, String collection, Map<String, String> filters) {
        var definition = definition(collection);
        var items = salesRepository.list(companyId, definition, filters);
        if ("quotes".equals(collection)) {
            items.forEach(item -> item.put("items", salesRepository.listQuoteItems(companyId, longId(item))));
        }
        var body = new LinkedHashMap<String, Object>();
        body.put("items", items);
        body.put("count", items.size());
        body.put("collection", collection);
        return body;
    }

    public Map<String, Object> get(long companyId, String collection, long id) {
        var definition = definition(collection);
        var item = salesRepository.get(companyId, definition, id);
        if ("quotes".equals(collection)) {
            item.put("items", salesRepository.listQuoteItems(companyId, id));
        }
        return item;
    }

    @Transactional
    public Map<String, Object> create(long companyId, long userId, String collection, Map<String, Object> payload) {
        var definition = definition(collection);
        var normalizedPayload = normalizeBeforeSave(companyId, collection, payload);
        referenceService.validateEntityPayload(companyId, collection, normalizedPayload);
        var id = salesRepository.create(companyId, userId, definition, normalizedPayload);
        if ("quotes".equals(collection)) {
            createQuoteItemsFromPayload(companyId, id, normalizedPayload);
            refreshQuoteAmount(companyId, id);
        }
        return get(companyId, collection, id);
    }

    @Transactional
    public Map<String, Object> update(long companyId, long userId, String collection, long id, Map<String, Object> payload) {
        var definition = definition(collection);
        var normalizedPayload = normalizeBeforeSave(companyId, collection, payload);
        referenceService.validateEntityPayload(companyId, collection, normalizedPayload);
        salesRepository.update(companyId, userId, definition, id, normalizedPayload);
        if ("quotes".equals(collection)) {
            createQuoteItemsFromPayload(companyId, id, normalizedPayload);
            refreshQuoteAmount(companyId, id);
        }
        return get(companyId, collection, id);
    }

    @Transactional
    public void delete(long companyId, String collection, long id) {
        salesRepository.softDelete(companyId, definition(collection), id);
    }

    public Map<String, Object> kpis(long companyId) {
        return salesRepository.kpis(companyId);
    }

    public Map<String, Object> listFiles(long companyId, String entityType, Long entityId) {
        var files = salesRepository.listFiles(companyId, entityType, entityId);
        return Map.of("items", files, "count", files.size());
    }

    @Transactional
    public Map<String, Object> createFile(long companyId, long userId, Map<String, Object> payload) {
        var entityType = SalesPayloadSupport.stringValue(payload, "entityType");
        var entityId = SalesPayloadSupport.longValue(payload, "entityId");
        if (entityType == null || entityId == null) {
            throw new IllegalArgumentException("entityType and entityId are required.");
        }
        referenceService.validateFileEntity(companyId, entityType, entityId);
        salesRepository.createFile(companyId, userId, payload);
        return listFiles(companyId, entityType, entityId);
    }

    @Transactional
    public void deleteFile(long companyId, long fileId) {
        salesRepository.deleteFile(companyId, fileId);
    }

    @Transactional
    public Map<String, Object> createQuoteItem(long companyId, long quoteId, Map<String, Object> payload) {
        salesRepository.get(companyId, definition("quotes"), quoteId);
        referenceService.validateQuoteItemPayload(companyId, payload);
        salesRepository.createQuoteItem(companyId, quoteId, payload);
        refreshQuoteAmount(companyId, quoteId);
        return get(companyId, "quotes", quoteId);
    }

    @Transactional
    public Map<String, Object> updateQuoteItem(long companyId, long quoteId, long itemId, Map<String, Object> payload) {
        salesRepository.get(companyId, definition("quotes"), quoteId);
        referenceService.validateQuoteItemPayload(companyId, payload);
        salesRepository.updateQuoteItem(companyId, quoteId, itemId, payload);
        refreshQuoteAmount(companyId, quoteId);
        return get(companyId, "quotes", quoteId);
    }

    @Transactional
    public Map<String, Object> deleteQuoteItem(long companyId, long quoteId, long itemId) {
        salesRepository.get(companyId, definition("quotes"), quoteId);
        salesRepository.deleteQuoteItem(companyId, quoteId, itemId);
        refreshQuoteAmount(companyId, quoteId);
        return get(companyId, "quotes", quoteId);
    }

    @Transactional
    public Map<String, Object> connectQuote(long companyId, long userId, long quoteId, Map<String, Object> payload) {
        var quote = salesRepository.get(companyId, definition("quotes"), quoteId);
        var mode = firstNonBlank(SalesPayloadSupport.stringValue(payload, "mode"), "quote_only");
        if ("existing_opportunity".equals(mode) || "existingOpportunity".equals(mode)) {
            var opportunityId = SalesPayloadSupport.longValue(payload, "opportunityId");
            if (opportunityId == null) {
                throw new IllegalArgumentException("opportunityId is required.");
            }
            referenceService.validateEntityPayload(companyId, "quotes", Map.of("opportunityId", opportunityId));
            salesRepository.linkQuoteToOpportunity(companyId, quoteId, opportunityId, "assigned_to_existing_opportunity");
            return get(companyId, "quotes", quoteId);
        }
        if ("create_opportunity".equals(mode) || "createOpportunity".equals(mode)) {
            var opportunityPayload = opportunityPayloadFromQuote(quote, payload);
            var opportunity = create(companyId, userId, "opportunities", opportunityPayload);
            salesRepository.linkQuoteToOpportunity(companyId, quoteId, longId(opportunity), "created_opportunity");
            return get(companyId, "quotes", quoteId);
        }

        salesRepository.linkQuoteToOpportunity(companyId, quoteId, null, "commercial_quote");
        return get(companyId, "quotes", quoteId);
    }

    private SalesEntityDefinition definition(String collection) {
        var definition = definitions.get(collection);
        if (definition == null) {
            throw new NoSuchElementException("Unsupported sales collection: " + collection);
        }
        return definition;
    }

    private Map<String, Object> normalizeBeforeSave(long companyId, String collection, Map<String, Object> payload) {
        var normalized = new LinkedHashMap<String, Object>();
        if (payload != null) {
            normalized.putAll(payload);
        }

        if ("opportunities".equals(collection)) {
            hydrateOpportunityFromContact(companyId, normalized);
        }
        if ("quotes".equals(collection)) {
            hydrateQuoteFromContactAndOpportunity(companyId, normalized);
            normalized.putIfAbsent("createdDate", LocalDate.now().toString());
        }
        if ("contracts".equals(collection)) {
            hydrateContractFromRelations(companyId, normalized);
        }
        if ("post-sales".equals(collection)) {
            hydratePostSaleFromRelations(companyId, normalized);
        }
        return normalized;
    }

    private void hydrateOpportunityFromContact(long companyId, Map<String, Object> payload) {
        var contactId = SalesPayloadSupport.longValue(payload, "contactId");
        if (contactId == null) {
            return;
        }
        var contact = salesRepository.get(companyId, definition("contacts"), contactId);
        putIfAbsent(payload, "companyName", contact.get("companyName"));
        putIfAbsent(payload, "contactPerson", contact.get("contactPerson"));
        putIfAbsent(payload, "phone", contact.get("phone"));
        putIfAbsent(payload, "email", contact.get("email"));
        putIfAbsent(payload, "unitId", contact.get("unitId"));
        putIfAbsent(payload, "businessId", contact.get("businessId"));
        putIfAbsent(payload, "ownerUserCompanyId", contact.get("ownerUserCompanyId"));
        putIfAbsent(payload, "ownerName", contact.get("ownerName"));
    }

    private void hydrateQuoteFromContactAndOpportunity(long companyId, Map<String, Object> payload) {
        var opportunityId = SalesPayloadSupport.longValue(payload, "opportunityId");
        if (opportunityId != null) {
            var opportunity = salesRepository.get(companyId, definition("opportunities"), opportunityId);
            putIfAbsent(payload, "contactId", opportunity.get("contactId"));
            putIfAbsent(payload, "clientName", firstNonBlank((String) opportunity.get("companyName"), (String) opportunity.get("opportunityName")));
            putIfAbsent(payload, "contactPerson", opportunity.get("contactPerson"));
            putIfAbsent(payload, "assignedSellerUserCompanyId", opportunity.get("ownerUserCompanyId"));
            putIfAbsent(payload, "assignedSellerName", opportunity.get("ownerName"));
        }
        var contactId = SalesPayloadSupport.longValue(payload, "contactId");
        if (contactId != null) {
            var contact = salesRepository.get(companyId, definition("contacts"), contactId);
            putIfAbsent(payload, "clientName", contact.get("companyName"));
            putIfAbsent(payload, "contactPerson", contact.get("contactPerson"));
        }
    }

    private void hydrateContractFromRelations(long companyId, Map<String, Object> payload) {
        var quoteId = SalesPayloadSupport.longValue(payload, "quoteId");
        if (quoteId != null) {
            var quote = salesRepository.get(companyId, definition("quotes"), quoteId);
            putIfAbsent(payload, "contactId", quote.get("contactId"));
            putIfAbsent(payload, "opportunityId", quote.get("opportunityId"));
            putIfAbsent(payload, "clientName", quote.get("clientName"));
            putIfAbsent(payload, "contactPerson", quote.get("contactPerson"));
            putIfAbsent(payload, "ownerUserCompanyId", quote.get("assignedSellerUserCompanyId"));
            putIfAbsent(payload, "ownerName", quote.get("assignedSellerName"));
        }
    }

    private void hydratePostSaleFromRelations(long companyId, Map<String, Object> payload) {
        var quoteId = SalesPayloadSupport.longValue(payload, "quoteId");
        if (quoteId != null) {
            var quote = salesRepository.get(companyId, definition("quotes"), quoteId);
            putIfAbsent(payload, "contactId", quote.get("contactId"));
            putIfAbsent(payload, "opportunityId", quote.get("opportunityId"));
            putIfAbsent(payload, "clientName", quote.get("clientName"));
            putIfAbsent(payload, "ownerUserCompanyId", quote.get("assignedSellerUserCompanyId"));
            putIfAbsent(payload, "ownerName", quote.get("assignedSellerName"));
            putIfAbsent(payload, "lifetimeValue", quote.get("amount"));
        }
    }

    private void createQuoteItemsFromPayload(long companyId, long quoteId, Map<String, Object> payload) {
        var items = SalesPayloadSupport.value(payload, "items");
        if (!(items instanceof List<?> list)) {
            return;
        }
        for (var item : list) {
            if (item instanceof Map<?, ?> map) {
                var itemPayload = new LinkedHashMap<String, Object>();
                map.forEach((key, value) -> itemPayload.put(String.valueOf(key), value));
                referenceService.validateQuoteItemPayload(companyId, itemPayload);
                salesRepository.createQuoteItem(companyId, quoteId, itemPayload);
            }
        }
    }

    private void refreshQuoteAmount(long companyId, long quoteId) {
        var total = salesRepository.quoteItemsTotal(companyId, quoteId);
        salesRepository.updateQuoteAmount(companyId, quoteId, total);
    }

    private Map<String, Object> opportunityPayloadFromQuote(Map<String, Object> quote, Map<String, Object> payload) {
        var opportunityPayload = new LinkedHashMap<String, Object>();
        opportunityPayload.put("contactId", quote.get("contactId"));
        opportunityPayload.put("opportunityName", firstNonBlank(
                SalesPayloadSupport.stringValue(payload, "opportunityName"),
                "Opportunity from " + quote.get("quoteNumber")));
        opportunityPayload.put("companyName", quote.get("clientName"));
        opportunityPayload.put("contactPerson", quote.get("contactPerson"));
        opportunityPayload.put("source", "quote");
        opportunityPayload.put("stage", "proposal");
        opportunityPayload.put("status", "active");
        opportunityPayload.put("estimatedValue", quote.get("amount"));
        opportunityPayload.put("currency", quote.get("currency"));
        opportunityPayload.put("probabilityPercent", 75);
        opportunityPayload.put("ownerUserCompanyId", quote.get("assignedSellerUserCompanyId"));
        opportunityPayload.put("ownerName", quote.get("assignedSellerName"));
        opportunityPayload.put("notes", "Created from quote " + quote.get("quoteNumber"));
        return opportunityPayload;
    }

    private Map<String, Object> dictionaries() {
        var dictionaries = new LinkedHashMap<String, Object>();
        dictionaries.put("opportunityStages", List.of("new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"));
        dictionaries.put("temperatures", List.of("hot", "warm", "cold"));
        dictionaries.put("sources", List.of("manual", "website", "referral", "campaign", "social_media", "whatsapp", "existing_customer", "other"));
        dictionaries.put("opportunityStatuses", List.of("active", "pending_follow_up", "overdue", "on_hold", "closed"));
        dictionaries.put("nextActions", List.of("call", "whatsapp", "email", "meeting", "send_proposal", "follow_up", "review_documents", "close_deal"));
        dictionaries.put("productTypes", List.of("product", "service", "package", "subscription", "operational_item"));
        dictionaries.put("productCategories", List.of("cleaning", "technology", "consulting", "installation", "hospitality", "marketing", "software", "other"));
        dictionaries.put("quoteStatuses", List.of("draft", "sent", "viewed", "negotiation", "approved", "rejected", "expired", "closed_won"));
        dictionaries.put("contractStatuses", List.of("draft", "internal_review", "sent", "viewed", "pending_signature", "signed", "expired", "cancelled"));
        dictionaries.put("signatureStatuses", List.of("not_requested", "waiting", "signed", "declined", "expired"));
        dictionaries.put("contractTypes", List.of("service_agreement", "sales_agreement", "renewal_agreement", "subscription_agreement", "nda", "operational_agreement", "custom_contract"));
        dictionaries.put("postSaleStatuses", List.of("active", "pending_follow_up", "in_service", "renewal_soon", "recurrent", "at_risk", "completed", "closed"));
        dictionaries.put("relationTypes", List.of("one_time_customer", "recurrent_customer", "renewal_customer", "dormant_customer", "lost_prospect"));
        dictionaries.put("lostReasons", List.of("price", "timing", "no_response", "competitor", "not_qualified", "budget", "other"));
        return dictionaries;
    }

    private Long currentUserCompanyId(List<Map<String, Object>> users, long userId) {
        return users.stream()
                .filter(user -> Long.valueOf(userId).equals(user.get("userId")))
                .map(user -> (Long) user.get("userCompanyId"))
                .findFirst()
                .orElse(null);
    }

    private static long longId(Map<String, Object> item) {
        var id = item.get("id");
        return id instanceof Number number ? number.longValue() : Long.parseLong(String.valueOf(id));
    }

    private static void putIfAbsent(Map<String, Object> payload, String key, Object value) {
        if (value != null && !payload.containsKey(key) && !payload.containsKey(SalesPayloadSupport.camelToSnake(key))) {
            payload.put(key, value);
        }
    }

    private static String firstNonBlank(String first, String fallback) {
        return first != null && !first.isBlank() ? first : fallback;
    }

    private static String firstNonBlank(String first, String second, String fallback) {
        var value = firstNonBlank(first, second);
        return value != null && !value.isBlank() ? value : fallback;
    }
}
