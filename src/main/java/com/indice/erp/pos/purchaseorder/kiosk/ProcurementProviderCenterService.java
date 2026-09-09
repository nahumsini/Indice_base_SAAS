package com.indice.erp.pos.purchaseorder.kiosk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskFileIntentService;
import com.indice.erp.kiosk.engine.ProviderCenterAccessPolicy;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentRegisterRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalDocumentUploadRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalSubmissionRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import com.indice.erp.pos.purchaseorder.PurchaseOrderService;
import jakarta.validation.Validator;
import java.sql.Timestamp;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Procurement-owned projection and mutations exposed to the company Provider Center. */
@Service
public class ProcurementProviderCenterService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private static final Set<String> ORDER_STATUSES = Set.of(
        "SENT", "NEEDS_CLARIFICATION", "CONFIRMED", "PARTIALLY_RECEIVED", "RECEIVED");

    private final JdbcTemplate jdbcTemplate;
    private final PurchaseOrderService purchaseOrders;
    private final ObjectMapper objectMapper;
    private final Validator validator;
    private final KioskFileIntentService fileIntents;
    private final ProviderCenterAccessPolicy providerAccess;

    public ProcurementProviderCenterService(
            JdbcTemplate jdbcTemplate,
            PurchaseOrderService purchaseOrders,
            ObjectMapper objectMapper,
            Validator validator,
            KioskFileIntentService fileIntents,
            ProviderCenterAccessPolicy providerAccess) {
        this.jdbcTemplate = jdbcTemplate;
        this.purchaseOrders = purchaseOrders;
        this.objectMapper = objectMapper;
        this.validator = validator;
        this.fileIntents = fileIntents;
        this.providerAccess = providerAccess;
    }

    public boolean supports(String kioskType) {
        return Set.of(
            ProcurementSupplierPortalCapabilities.PROVIDER_PROPOSALS_KIOSK_TYPE,
            ProcurementSupplierPortalCapabilities.PROVIDER_ORDERS_KIOSK_TYPE).contains(kioskType);
    }

    public boolean hasAccess(long companyId, long providerId) {
        return providerAccess.hasAccess(companyId, providerId);
    }

    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        var providerId = requireProviderContext(context);
        var access = requireAccess(context.definition().companyId(), providerId);
        var result = new LinkedHashMap<String, Object>();
        result.put("provider", providerProfile(access.companyId(), providerId));
        result.put("contact_required", true);
        if (ProcurementSupplierPortalCapabilities.PROVIDER_PROPOSALS_KIOSK_TYPE.equals(
                context.definition().kioskType())) {
            result.put("quote_requests", quoteRequests(access.companyId(), providerId));
            result.put("submissions", submissions(access.companyId(), providerId));
            result.put("catalog_products", catalogProducts(access.companyId(), providerId));
        } else {
            result.put("orders", orders(access.companyId(), providerId));
            result.put("invoices", invoices(access.companyId(), providerId));
        }
        return Map.copyOf(result);
    }

    public Map<String, Object> tracking(long companyId, long providerId) {
        if (!hasAccess(companyId, providerId)) return Map.of();
        return Map.of(
            "submissions", submissions(companyId, providerId),
            "orders", orders(companyId, providerId),
            "invoices_with_purchase_order", invoices(companyId, providerId));
    }

    @Transactional
    public Map<String, Object> execute(
            KioskExecutionContext context, KioskActionRequest request) {
        var providerId = requireProviderContext(context);
        var access = requireAccess(context.definition().companyId(), providerId);
        return switch (request.capabilityKey()) {
            case ProcurementSupplierPortalCapabilities.PROVIDER_PROPOSAL_SUBMIT ->
                createProposal(access, request.payload(), null);
            case ProcurementSupplierPortalCapabilities.PROVIDER_QUOTE_RESPOND ->
                createQuoteResponse(access, request.payload());
            case ProcurementSupplierPortalCapabilities.PROVIDER_PROFILE_CHANGE_SUBMIT ->
                submitProfileChange(access, request.payload());
            case ProcurementSupplierPortalCapabilities.PROVIDER_ORDER_RESPOND ->
                respondToOrder(access, request.payload());
            case ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN ->
                map(purchaseOrders.createPublicSupplierInvoiceUpload(
                    access, validated(request.payload(), SupplierPortalDocumentUploadRequest.class)));
            case ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_REGISTER ->
                purchaseOrders.registerPublicSupplierInvoiceUpload(
                    access, validated(request.payload(), SupplierPortalDocumentRegisterRequest.class));
            case ProcurementSupplierPortalCapabilities.PROVIDER_ORDER_INVOICE_SUBMIT ->
                createInvoice(context, access, request.payload());
            default -> throw new IllegalArgumentException("Unsupported Provider Center capability.");
        };
    }

    private Map<String, Object> createProposal(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            Map<String, Object> payload,
            Long quoteRequestId) {
        var request = validated(payload, SupplierPortalSubmissionRequest.class);
        requireContact(request.submittedByName(), request.submittedByEmail());
        var response = quoteRequestId == null
            ? purchaseOrders.createProviderCenterSupplierSubmission(access, request)
            : purchaseOrders.createProviderCenterQuoteSubmission(access, quoteRequestId, request);
        if (quoteRequestId != null) {
            var previous = jdbcTemplate.query(
                """
                    SELECT id, revision_number FROM pos_supplier_submissions
                    WHERE company_id = ? AND provider_id = ? AND quote_request_id = ?
                      AND deleted_at IS NULL AND status <> 'SUPERSEDED'
                    ORDER BY revision_number DESC, id DESC LIMIT 1
                    FOR UPDATE
                    """,
                (rs, rowNum) -> new PreviousRevision(
                    rs.getLong("id"), rs.getInt("revision_number")),
                access.companyId(), access.providerId(), quoteRequestId).stream().findFirst().orElse(null);
            var revision = previous == null ? 1 : previous.revision() + 1;
            if (previous != null) {
                jdbcTemplate.update(
                    "UPDATE pos_supplier_submissions SET status = 'SUPERSEDED' WHERE id = ? AND company_id = ? AND provider_id = ?",
                    previous.id(), access.companyId(), access.providerId());
            }
            jdbcTemplate.update(
                """
                    UPDATE pos_supplier_submissions
                    SET quote_request_id = ?, revision_number = ?, supersedes_submission_id = ?
                    WHERE id = ? AND company_id = ? AND provider_id = ?
                    """,
                quoteRequestId, revision, previous == null ? null : previous.id(),
                response.id(), access.companyId(), access.providerId());
        }
        return map(response);
    }

    private Map<String, Object> createQuoteResponse(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            Map<String, Object> payload) {
        var quoteRequestId = positiveLong(payload.get("quote_request_id"), "quote_request_id");
        var available = jdbcTemplate.query(
            """
                SELECT id FROM pos_supplier_quote_requests
                WHERE id = ? AND company_id = ? AND provider_id = ? AND status = 'OPEN'
                  AND response_deadline > CURRENT_TIMESTAMP
                  AND unit_id = ? AND business_id = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> rs.getLong("id"),
            quoteRequestId, access.companyId(), access.providerId(),
            access.unitId(), access.businessId());
        if (available.size() != 1) {
            throw PosApiException.badRequest("La solicitud ya cerró o no está disponible.");
        }
        return createProposal(access, payload, quoteRequestId);
    }

    private Map<String, Object> respondToOrder(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            Map<String, Object> payload) {
        var orderId = positiveLong(payload.get("purchase_order_id"), "purchase_order_id");
        var responseType = text(payload.get("response_type")).toUpperCase(java.util.Locale.ROOT);
        if (!Set.of("CONFIRMED", "ADJUSTMENT_REQUESTED").contains(responseType)) {
            throw new IllegalArgumentException("response_type is invalid.");
        }
        var reason = limited(payload.get("reason"), 4000);
        var contactName = required(payload.get("submitted_by_name"), "submitted_by_name", 180);
        var contactEmail = required(payload.get("submitted_by_email"), "submitted_by_email", 180);
        LocalDate requestedDate = null;
        var rawDate = text(payload.get("requested_expected_date"));
        if (!rawDate.isBlank()) {
            try { requestedDate = LocalDate.parse(rawDate); }
            catch (RuntimeException invalid) { throw new IllegalArgumentException("requested_expected_date is invalid."); }
        }
        if ("ADJUSTMENT_REQUESTED".equals(responseType) && reason.isBlank()) {
            throw new IllegalArgumentException("reason is required for an adjustment request.");
        }
        if ("ADJUSTMENT_REQUESTED".equals(responseType)
                && requestedDate != null && requestedDate.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException("requested_expected_date cannot be in the past.");
        }
        if ("CONFIRMED".equals(responseType)) {
            requestedDate = null;
            reason = "";
        }
        var current = jdbcTemplate.query(
            """
                SELECT status FROM pos_purchase_orders
                WHERE id = ? AND company_id = ? AND provider_id = ? AND deleted_at IS NULL
                LIMIT 1 FOR UPDATE
                """,
            (rs, rowNum) -> rs.getString("status"),
            orderId, access.companyId(), access.providerId()).stream().findFirst()
            .orElseThrow(() -> PosApiException.notFound("Purchase order not found."));
        if (!"SENT".equals(current)) {
            throw PosApiException.badRequest("La orden ya no admite esta respuesta.");
        }
        jdbcTemplate.update(
            """
                INSERT INTO pos_purchase_order_supplier_responses (
                    company_id, purchase_order_id, provider_id, response_type,
                    requested_expected_date, reason, submitted_by_name, submitted_by_email
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
            access.companyId(), orderId, access.providerId(), responseType,
            requestedDate, nullable(reason), contactName, contactEmail);
        jdbcTemplate.update(
            "UPDATE pos_purchase_orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND company_id = ? AND provider_id = ?",
            "CONFIRMED".equals(responseType) ? "CONFIRMED" : "NEEDS_CLARIFICATION",
            orderId, access.companyId(), access.providerId());
        return Map.of("purchase_order_id", orderId, "status",
            "CONFIRMED".equals(responseType) ? "CONFIRMED" : "NEEDS_CLARIFICATION");
    }

    private Map<String, Object> createInvoice(
            KioskExecutionContext context,
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            Map<String, Object> payload) {
        var orderId = positiveLong(payload.get("purchase_order_id"), "purchase_order_id");
        var submittedByEmail = text(payload.get("submitted_by_email")).toLowerCase(java.util.Locale.ROOT);
        var request = validated(payload, SupplierPortalInvoiceRequest.class);
        requireContact(request.submittedByName(), submittedByEmail);
        var documentReference = text(request.documentUrl());
        if (!documentReference.isBlank()) {
            fileIntents.requireAdopted(
                context, orderId, documentReference,
                ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN);
        }
        var invoice = purchaseOrders.createProviderCenterSupplierInvoice(
            access, orderId, request);
        if (!documentReference.isBlank()) {
            fileIntents.consumeAdopted(
                context, orderId, documentReference,
                ProcurementSupplierPortalCapabilities.INVOICE_DOCUMENT_PRESIGN,
                "SUPPLIER_INVOICE", invoice.id());
        }
        jdbcTemplate.update(
            "UPDATE pos_supplier_invoices SET submitted_by_email = ? WHERE id = ? AND company_id = ? AND provider_id = ?",
            submittedByEmail, invoice.id(), access.companyId(), access.providerId());
        return map(invoice);
    }

    private Map<String, Object> submitProfileChange(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            Map<String, Object> payload) {
        var category = text(payload.get("category")).toUpperCase(java.util.Locale.ROOT);
        if (!Set.of("COMMERCIAL", "CATALOG").contains(category)) {
            throw new IllegalArgumentException("Unsupported procurement provider change category.");
        }
        var contactName = text(payload.get("submitted_by_name"));
        var contactEmail = text(payload.get("submitted_by_email")).toLowerCase(java.util.Locale.ROOT);
        requireContact(contactName, contactEmail);
        if (!(payload.get("changes") instanceof Map<?, ?> rawChanges)) {
            throw new IllegalArgumentException("changes is required.");
        }
        var submittedChanges = new LinkedHashMap<String, Object>();
        for (var entry : rawChanges.entrySet()) {
            submittedChanges.put(String.valueOf(entry.getKey()), entry.getValue());
        }
        Map<String, Object> changes = submittedChanges;
        if ("COMMERCIAL".equals(category)) {
            changes = normalizedCommercialChanges(changes);
        } else {
            changes = normalizedCatalogChanges(access.companyId(), access.providerId(), changes);
        }
        var changesJson = json(changes);
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO provider_profile_change_requests (
                        company_id, provider_id, category, status, changes_json,
                        submitted_by_name, submitted_by_email)
                    VALUES (?, ?, ?, 'SUBMITTED', ?, ?, ?)
                    """,
                Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, access.companyId());
            statement.setLong(2, access.providerId());
            statement.setString(3, category);
            statement.setString(4, changesJson);
            statement.setString(5, contactName);
            statement.setString(6, contactEmail);
            return statement;
        }, keyHolder);
        var requestId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        return Map.of(
            "request_id", requestId, "category", category,
            "status", "SUBMITTED", "review_required", true);
    }

    private Map<String, Object> normalizedCommercialChanges(Map<String, Object> changes) {
        var allowed = Set.of(
            "name", "email", "phone", "contact_name", "payment_terms_days");
        if (changes.isEmpty() || changes.size() > allowed.size()
                || !allowed.containsAll(changes.keySet())) {
            throw new IllegalArgumentException("Commercial changes contain unsupported fields.");
        }
        var normalized = new LinkedHashMap<String, Object>();
        for (var entry : changes.entrySet()) {
            var field = entry.getKey();
            var raw = entry.getValue();
            if ("payment_terms_days".equals(field)) {
                normalized.put(field, boundedInteger(raw, 0, 3650, field));
                continue;
            }
            if (raw != null && !(raw instanceof String) && !(raw instanceof Number)) {
                throw new IllegalArgumentException("Commercial changes must use simple values.");
            }
            var value = text(raw);
            var maximum = switch (field) {
                case "name", "email", "contact_name" -> 180;
                case "phone" -> 60;
                default -> throw new IllegalArgumentException("Unsupported commercial change field.");
            };
            if (value.length() > maximum) {
                throw new IllegalArgumentException(field + " is too long.");
            }
            if ("name".equals(field) && value.isBlank()) {
                throw new IllegalArgumentException("Provider name cannot be blank.");
            }
            if ("email".equals(field) && !value.isBlank()
                    && !value.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
                throw new IllegalArgumentException("Provider email is invalid.");
            }
            normalized.put(field, value);
        }
        return Map.copyOf(normalized);
    }

    private LinkedHashMap<String, Object> normalizedCatalogChanges(
            long companyId, long providerId, Map<String, Object> changes) {
        if (changes.size() != 1 || !(changes.get("catalog_items") instanceof List<?> items)
                || items.isEmpty() || items.size() > 100) {
            throw new IllegalArgumentException("catalog_items must contain 1 to 100 items.");
        }
        var normalizedItems = new java.util.ArrayList<Map<String, Object>>();
        for (var rawItem : items) {
            if (!(rawItem instanceof Map<?, ?> values)) {
                throw new IllegalArgumentException("catalog_items contains an invalid item.");
            }
            var productId = positiveLong(values.get("product_id"), "product_id");
            var owned = jdbcTemplate.queryForObject(
                """
                    SELECT COUNT(*) FROM pos_product_suppliers supplier
                    INNER JOIN sales_products product
                      ON product.id = supplier.product_id AND product.company_id = supplier.company_id
                    WHERE supplier.company_id = ? AND supplier.provider_id = ?
                      AND supplier.product_id = ? AND supplier.deleted_at IS NULL
                      AND supplier.is_active = 1 AND product.deleted_at IS NULL
                    """,
                Integer.class, companyId, providerId, productId);
            if (owned == null || owned != 1) {
                throw new IllegalArgumentException("Catalog product is unavailable for this provider.");
            }
            var currency = text(values.get("currency_code")).toUpperCase(java.util.Locale.ROOT);
            if (!currency.matches("^[A-Z]{3}$")) {
                throw new IllegalArgumentException("currency_code is invalid.");
            }
            var item = new LinkedHashMap<String, Object>();
            item.put("product_id", productId);
            item.put("provider_sku", limited(values.get("provider_sku"), 120));
            item.put("cost_amount", nonNegativeDecimal(values.get("cost_amount"), "cost_amount"));
            item.put("currency_code", currency);
            item.put("lead_time_days", boundedInteger(values.get("lead_time_days"), 0, 3650, "lead_time_days"));
            item.put("minimum_order_quantity", positiveDecimal(
                values.get("minimum_order_quantity"), "minimum_order_quantity"));
            normalizedItems.add(Map.copyOf(item));
        }
        var result = new LinkedHashMap<String, Object>();
        result.put("catalog_items", List.copyOf(normalizedItems));
        return result;
    }

    private java.math.BigDecimal nonNegativeDecimal(Object raw, String field) {
        try {
            var value = new java.math.BigDecimal(text(raw))
                .setScale(4, java.math.RoundingMode.HALF_UP);
            if (value.signum() >= 0 && value.precision() <= 19) return value;
        } catch (RuntimeException ignored) { }
        throw new IllegalArgumentException(field + " is invalid.");
    }

    private java.math.BigDecimal positiveDecimal(Object raw, String field) {
        var value = nonNegativeDecimal(raw, field);
        if (value.signum() > 0) return value;
        throw new IllegalArgumentException(field + " must be positive.");
    }

    private int boundedInteger(Object raw, int minimum, int maximum, String field) {
        try {
            var value = raw instanceof Number number ? number.intValue() : Integer.parseInt(text(raw));
            if (value >= minimum && value <= maximum) return value;
        } catch (RuntimeException ignored) { }
        throw new IllegalArgumentException(field + " is invalid.");
    }

    private String json(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (Exception invalid) { throw new IllegalArgumentException("Provider change payload is invalid."); }
    }

    private void requireContact(String nameValue, String emailValue) {
        var name = text(nameValue);
        var email = text(emailValue).toLowerCase(java.util.Locale.ROOT);
        if (name.isBlank() || name.length() > 180 || email.length() < 5 || email.length() > 180
                || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw new IllegalArgumentException("Provider contact name and email are required.");
        }
    }

    private PurchaseOrderRepository.SupplierPortalAccessRecord requireAccess(
            long companyId, long providerId) {
        providerAccess.requireAccess(companyId, providerId);
        return jdbcTemplate.query(
            """
                SELECT provider.company_id, company.name AS company_name,
                       provider.id AS provider_id, provider.name AS provider_name,
                       provider.email AS provider_email, credential.secret_hash AS pin_hash,
                       provider.unit_id, unit_ref.name AS unit_name,
                       provider.business_id, business_ref.name AS business_name
                FROM finance_providers provider
                INNER JOIN companies company ON company.id = provider.company_id
                INNER JOIN kiosk_identity_credentials credential
                  ON credential.company_id = provider.company_id
                 AND credential.identity_type = 'PROVIDER'
                 AND credential.identity_id = provider.id
                 AND credential.credential_type = 'PIN'
                 AND credential.status = 'ACTIVE'
                 AND credential.secret_hash IS NOT NULL AND credential.secret_hash <> ''
                LEFT JOIN units unit_ref
                  ON unit_ref.id = provider.unit_id AND unit_ref.company_id = provider.company_id
                LEFT JOIN businesses business_ref
                  ON business_ref.id = provider.business_id AND business_ref.company_id = provider.company_id
                WHERE provider.company_id = ? AND provider.id = ?
                  AND provider.status = 'ACTIVE' AND provider.deleted_at IS NULL
                  AND provider.unit_id IS NOT NULL AND provider.business_id IS NOT NULL
                LIMIT 1
                """,
            (rs, rowNum) -> new PurchaseOrderRepository.SupplierPortalAccessRecord(
                null, rs.getLong("company_id"), rs.getString("company_name"),
                rs.getLong("provider_id"), rs.getString("provider_name"),
                rs.getString("provider_email"), "provider-center", rs.getString("pin_hash"),
                "ACTIVE", null, null, rs.getLong("unit_id"),
                rs.getString("unit_name"), rs.getLong("business_id"), rs.getString("business_name")),
            companyId, providerId).stream().findFirst()
            .orElseThrow(() -> new SecurityException(
                "Asigna unidad y negocio al proveedor para usar Compras."));
    }

    private Map<String, Object> providerProfile(long companyId, long providerId) {
        return jdbcTemplate.query(
            """
                SELECT id, name, legal_name, tax_id, email, phone, contact_name
                FROM finance_providers
                WHERE company_id = ? AND id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("name", rs.getString("name"));
                row.put("legal_name", value(rs.getString("legal_name")));
                row.put("tax_id", value(rs.getString("tax_id")));
                row.put("email", value(rs.getString("email")));
                row.put("phone", value(rs.getString("phone")));
                row.put("contact_name", value(rs.getString("contact_name")));
                return Map.copyOf(row);
            }, companyId, providerId).stream().findFirst().orElse(Map.of());
    }

    private List<Map<String, Object>> quoteRequests(long companyId, long providerId) {
        var rows = jdbcTemplate.query(
            """
                SELECT request.id, request.request_number, request.title, request.description,
                       request.currency_code, request.status, request.response_deadline,
                       EXISTS(SELECT 1 FROM pos_supplier_submissions submission
                         WHERE submission.company_id = request.company_id
                           AND submission.provider_id = request.provider_id
                           AND submission.quote_request_id = request.id
                           AND submission.deleted_at IS NULL
                           AND submission.status <> 'SUPERSEDED') AS responded
                FROM pos_supplier_quote_requests request
                WHERE request.company_id = ? AND request.provider_id = ?
                  AND request.status IN ('OPEN', 'CLOSED')
                ORDER BY request.response_deadline DESC, request.id DESC
                LIMIT 100
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("request_number", rs.getString("request_number"));
                row.put("title", rs.getString("title"));
                row.put("description", value(rs.getString("description")));
                row.put("currency_code", rs.getString("currency_code"));
                row.put("status", rs.getString("status"));
                row.put("response_deadline", rs.getTimestamp("response_deadline").toInstant().toString());
                row.put("responded", rs.getBoolean("responded"));
                return row;
            },
            companyId, providerId);
        for (var row : rows) {
            var requestId = ((Number) row.get("id")).longValue();
            row.put("items", jdbcTemplate.query(
                """
                    SELECT product_id, sku_snapshot, product_name_snapshot, requested_quantity, notes
                    FROM pos_supplier_quote_request_items
                    WHERE company_id = ? AND quote_request_id = ?
                    ORDER BY id
                    """,
                (rs, rowNum) -> {
                    var item = new LinkedHashMap<String, Object>();
                    var productId = nullableLong(rs, "product_id");
                    if (productId != null) item.put("product_id", productId);
                    item.put("sku", value(rs.getString("sku_snapshot")));
                    item.put("product_name", rs.getString("product_name_snapshot"));
                    item.put("quantity", rs.getBigDecimal("requested_quantity"));
                    item.put("notes", value(rs.getString("notes")));
                    return Map.copyOf(item);
                }, companyId, requestId));
        }
        return rows.stream().map(Map::copyOf).toList();
    }

    private List<Map<String, Object>> submissions(long companyId, long providerId) {
        return jdbcTemplate.query(
            """
                SELECT submission.id, submission.submission_number, submission.status,
                       submission.currency_code, submission.total_amount, submission.submitted_at,
                       submission.quote_request_id, submission.revision_number
                FROM pos_supplier_submissions submission
                WHERE submission.company_id = ? AND submission.provider_id = ?
                  AND submission.deleted_at IS NULL
                ORDER BY submission.created_at DESC, submission.id DESC LIMIT 100
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("submission_number", rs.getString("submission_number"));
                row.put("status", rs.getString("status"));
                row.put("currency_code", rs.getString("currency_code"));
                row.put("total_amount", rs.getBigDecimal("total_amount"));
                row.put("submitted_at", timestamp(rs.getTimestamp("submitted_at")));
                var quoteRequestId = nullableLong(rs, "quote_request_id");
                if (quoteRequestId != null) row.put("quote_request_id", quoteRequestId);
                row.put("revision_number", rs.getInt("revision_number"));
                return Map.copyOf(row);
            }, companyId, providerId);
    }

    private List<Map<String, Object>> catalogProducts(long companyId, long providerId) {
        return jdbcTemplate.query(
            """
                SELECT product.id AS product_id, product.name, product.sku, product.product_code,
                       supplier.id AS supplier_id,
                       supplier.provider_sku,
                       supplier.cost_amount, supplier.currency_code,
                       supplier.lead_time_days, supplier.minimum_order_quantity
                FROM sales_products product
                LEFT JOIN pos_product_suppliers supplier
                  ON supplier.company_id = product.company_id
                 AND supplier.product_id = product.id
                 AND supplier.provider_id = ?
                 AND supplier.is_active = 1
                 AND supplier.deleted_at IS NULL
                WHERE product.company_id = ? AND product.deleted_at IS NULL
                  AND LOWER(TRIM(product.status)) = 'active'
                ORDER BY CASE WHEN supplier.id IS NULL THEN 1 ELSE 0 END,
                         product.name, product.id
                LIMIT 500
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("product_id", rs.getLong("product_id"));
                row.put("name", rs.getString("name"));
                row.put("sku", value(rs.getString("sku")));
                row.put("product_code", value(rs.getString("product_code")));
                row.put("provider_product", rs.getObject("supplier_id") != null);
                row.put("provider_sku", value(rs.getString("provider_sku")));
                var cost = rs.getBigDecimal("cost_amount");
                row.put("cost_amount", cost == null ? java.math.BigDecimal.ZERO : cost);
                row.put("currency_code", value(rs.getString("currency_code")));
                var leadTime = nullableInteger(rs, "lead_time_days");
                row.put("lead_time_days", leadTime == null ? 0 : leadTime);
                var minimum = rs.getBigDecimal("minimum_order_quantity");
                row.put("minimum_order_quantity", minimum == null ? java.math.BigDecimal.ONE : minimum);
                return Map.copyOf(row);
            }, providerId, companyId);
    }

    private List<Map<String, Object>> orders(long companyId, long providerId) {
        var rows = jdbcTemplate.query(
            """
                SELECT po.id, po.folio, po.status, po.currency_code, po.total_amount,
                       po.expected_date, po.sent_at, warehouse.name AS warehouse_name
                FROM pos_purchase_orders po
                INNER JOIN sales_inventory_warehouses warehouse
                  ON warehouse.id = po.warehouse_id AND warehouse.company_id = po.company_id
                WHERE po.company_id = ? AND po.provider_id = ? AND po.deleted_at IS NULL
                  AND po.status IN ('SENT', 'NEEDS_CLARIFICATION', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED')
                ORDER BY COALESCE(po.sent_at, po.created_at) DESC, po.id DESC LIMIT 100
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("folio", rs.getString("folio"));
                row.put("status", rs.getString("status"));
                row.put("currency_code", rs.getString("currency_code"));
                row.put("total_amount", rs.getBigDecimal("total_amount"));
                row.put("expected_date", rs.getDate("expected_date") == null ? "" : rs.getDate("expected_date").toLocalDate().toString());
                row.put("sent_at", timestamp(rs.getTimestamp("sent_at")));
                row.put("warehouse_name", rs.getString("warehouse_name"));
                return new LinkedHashMap<>(row);
            }, companyId, providerId);
        for (var row : rows) {
            var orderId = ((Number) row.get("id")).longValue();
            row.put("items", jdbcTemplate.query(
                """
                    SELECT id, product_id, sku_snapshot, product_name_snapshot, quantity,
                           received_quantity, unit_cost_amount, tax_rate, line_total_amount
                    FROM pos_purchase_order_items
                    WHERE company_id = ? AND purchase_order_id = ? ORDER BY id
                    """,
                (rs, rowNum) -> Map.of(
                    "id", rs.getLong("id"), "product_id", rs.getLong("product_id"),
                    "sku", value(rs.getString("sku_snapshot")),
                    "product_name", rs.getString("product_name_snapshot"),
                    "quantity", rs.getBigDecimal("quantity"),
                    "received_quantity", rs.getBigDecimal("received_quantity"),
                    "unit_cost", rs.getBigDecimal("unit_cost_amount"),
                    "tax_rate", rs.getBigDecimal("tax_rate"),
                    "line_total", rs.getBigDecimal("line_total_amount")),
                companyId, orderId));
        }
        return rows.stream().map(Map::copyOf).toList();
    }

    private List<Map<String, Object>> invoices(long companyId, long providerId) {
        return jdbcTemplate.query(
            """
                SELECT invoice.id, invoice.purchase_order_id, po.folio AS purchase_order_folio,
                       invoice.invoice_number, invoice.invoice_date, invoice.due_date,
                       invoice.total_amount, invoice.currency_code, invoice.status, invoice.created_at
                FROM pos_supplier_invoices invoice
                INNER JOIN pos_purchase_orders po
                  ON po.id = invoice.purchase_order_id AND po.company_id = invoice.company_id
                WHERE invoice.company_id = ? AND invoice.provider_id = ?
                  AND invoice.purchase_order_id IS NOT NULL AND invoice.deleted_at IS NULL
                ORDER BY invoice.created_at DESC, invoice.id DESC LIMIT 100
                """,
            (rs, rowNum) -> Map.of(
                "id", rs.getLong("id"), "purchase_order_id", rs.getLong("purchase_order_id"),
                "purchase_order_folio", rs.getString("purchase_order_folio"),
                "invoice_number", rs.getString("invoice_number"),
                "invoice_date", rs.getDate("invoice_date") == null ? "" : rs.getDate("invoice_date").toLocalDate().toString(),
                "due_date", rs.getDate("due_date") == null ? "" : rs.getDate("due_date").toLocalDate().toString(),
                "total_amount", rs.getBigDecimal("total_amount"),
                "currency_code", rs.getString("currency_code"), "status", rs.getString("status"),
                "created_at", rs.getTimestamp("created_at").toInstant().toString()),
            companyId, providerId);
    }

    private long requireProviderContext(KioskExecutionContext context) {
        if (context == null || context.definition() == null || context.session() == null
                || !ProcurementSupplierPortalCapabilities.OWNER_MODULE.equals(context.ownerModule())
                || !"PROVIDER_MULTI_KIOSK".equals(context.channel())
                || !"PROVIDER".equals(context.session().identityType())
                || context.session().companyId() != context.definition().companyId()
                || context.session().kioskDefinitionId() != context.definition().id()
                || !supports(context.definition().kioskType())) {
            throw new SecurityException("Provider Center procurement session is required.");
        }
        return context.session().identityId();
    }

    private <T> T validated(Map<String, Object> payload, Class<T> type) {
        var normalized = new LinkedHashMap<String, Object>(payload == null ? Map.of() : payload);
        normalized.remove("kiosk_session_token");
        normalized.remove("resource_id");
        normalized.remove("quote_request_id");
        normalized.remove("purchase_order_id");
        normalized.remove("submitted_by_email");
        var value = objectMapper.convertValue(normalized, type);
        var violations = validator.validate(value);
        if (!violations.isEmpty()) {
            var first = violations.iterator().next();
            throw new IllegalArgumentException(first.getPropertyPath() + " " + first.getMessage());
        }
        return value;
    }

    private Map<String, Object> map(Object value) {
        return objectMapper.convertValue(value, MAP_TYPE);
    }

    private long positiveLong(Object raw, String field) {
        try {
            var value = raw instanceof Number number ? number.longValue() : Long.parseLong(text(raw));
            if (value > 0) return value;
        } catch (RuntimeException ignored) { }
        throw new IllegalArgumentException(field + " is required.");
    }

    private String required(Object raw, String field, int max) {
        var value = limited(raw, max);
        if (value.isBlank()) throw new IllegalArgumentException(field + " is required.");
        return value;
    }

    private String limited(Object raw, int max) {
        var value = text(raw);
        if (value.length() > max) throw new IllegalArgumentException("Value is too long.");
        return value;
    }

    private String text(Object raw) { return raw == null ? "" : String.valueOf(raw).trim(); }
    private Object nullable(String value) { return value == null || value.isBlank() ? null : value; }
    private String value(String value) { return value == null ? "" : value; }
    private String timestamp(Timestamp value) { return value == null ? "" : value.toInstant().toString(); }
    private Instant instant(Timestamp value) { return value == null ? null : value.toInstant(); }
    private Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getLong(column); return rs.wasNull() ? null : value;
    }
    private Integer nullableInteger(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getInt(column); return rs.wasNull() ? null : value;
    }

    private record PreviousRevision(long id, int revision) {}
}
