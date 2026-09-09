package com.indice.erp.finance.providers;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.kiosk.engine.KioskPayloadProtectionService;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import java.sql.Statement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Review boundary for Provider Center registrations and profile-change requests. */
@Service
public class ProviderCenterReviewService {

    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final KioskPayloadProtectionService protection;

    public ProviderCenterReviewService(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            KioskPayloadProtectionService protection) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.protection = protection;
    }

    public Map<String, Object> financeInbox(FinanceContext context) {
        return Map.of(
            "registrations", registrations(context.companyId()),
            "changes", changes(
                context.companyId(), Set.of("FISCAL", "BANKING"),
                context.scope().type().name(), context.scope().unitId(), context.scope().businessId()),
            "assignment_options", assignmentOptions(
                context.companyId(), context.scope().type().name(),
                context.scope().unitId(), context.scope().businessId()));
    }

    public Map<String, Object> commercialInbox(PosContext context) {
        var scopeType = context.scope().type().name();
        return Map.of(
            "registrations", registrations(context.companyId()),
            "changes", changes(
                context.companyId(), Set.of("COMMERCIAL", "CATALOG"),
                scopeType, context.scope().unitId(), context.scope().businessId()),
            "order_responses", orderResponses(
                context.companyId(), scopeType,
                context.scope().unitId(), context.scope().businessId()),
            "assignment_options", assignmentOptions(
                context.companyId(), scopeType,
                context.scope().unitId(), context.scope().businessId()));
    }

    private Map<String, Object> assignmentOptions(
            long companyId, String scopeType, Long scopeUnitId, Long scopeBusinessId) {
        var units = jdbcTemplate.query(
            """
                SELECT id, name FROM units
                WHERE company_id = ? AND (status = 'active' OR status IS NULL OR status = '')
                ORDER BY name, id
                """,
            (rs, rowNum) -> Map.<String, Object>of(
                "id", rs.getLong("id"), "name", rs.getString("name")), companyId).stream()
            .filter(unit -> "CORPORATE_OFFICE".equals(scopeType)
                || ((Number) unit.get("id")).longValue() == (scopeUnitId == null ? -1L : scopeUnitId))
            .toList();
        var businesses = jdbcTemplate.query(
            """
                SELECT id, unit_id, name FROM businesses
                WHERE company_id = ? AND (status = 'active' OR status IS NULL OR status = '')
                  AND unit_id IS NOT NULL
                ORDER BY name, id
                """,
            (rs, rowNum) -> Map.<String, Object>of(
                "id", rs.getLong("id"), "unit_id", rs.getLong("unit_id"),
                "name", rs.getString("name")), companyId).stream()
            .filter(business -> "CORPORATE_OFFICE".equals(scopeType)
                || ("UNIT_HEADQUARTERS".equals(scopeType)
                    && ((Number) business.get("unit_id")).longValue()
                        == (scopeUnitId == null ? -1L : scopeUnitId))
                || ("BUSINESS_OFFICE".equals(scopeType)
                    && ((Number) business.get("id")).longValue()
                        == (scopeBusinessId == null ? -1L : scopeBusinessId)))
            .toList();
        return Map.of("units", units, "businesses", businesses);
    }

    @Transactional
    public Map<String, Object> approveRegistration(
            FinanceContext context,
            long requestId,
            long unitId,
            long businessId,
            String reviewNote) {
        return approveRegistration(
            context.companyId(), context.userId(), requestId, unitId, businessId, reviewNote,
            (assignedUnitId, assignedBusinessId) -> requireFinanceScope(
                context.scope(), assignedUnitId, assignedBusinessId));
    }

    @Transactional
    public Map<String, Object> approveRegistration(
            PosContext context,
            long requestId,
            long unitId,
            long businessId,
            String reviewNote) {
        return approveRegistration(
            context.companyId(), context.userId(), requestId, unitId, businessId, reviewNote,
            (assignedUnitId, assignedBusinessId) -> requirePosScope(
                context.scope(), assignedUnitId, assignedBusinessId));
    }

    private Map<String, Object> approveRegistration(
            long companyId,
            long userId,
            long requestId,
            long unitId,
            long businessId,
            String reviewNote,
            ScopeCheck scopeCheck) {
        scopeCheck.require(unitId, businessId);
        requireBusiness(companyId, unitId, businessId);
        var request = registration(companyId, requestId, true);
        if (!Set.of("SUBMITTED", "IN_REVIEW").contains(request.status())) {
            throw FinanceApiException.conflict("Provider registration is no longer pending.");
        }
        lockCompany(companyId);
        requireUnique(companyId, request.name(), request.taxId(), null);
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO finance_providers (
                        company_id, unit_id, business_id, name, legal_name, tax_id,
                        email, phone, contact_name, payment_terms_days, status, notes,
                        created_by_user_id, metadata_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'ACTIVE', ?, ?,
                              JSON_OBJECT('source', 'provider-center-registration',
                                          'registrationRequestId', ?))
                    """,
                Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, companyId);
            statement.setLong(2, unitId);
            statement.setLong(3, businessId);
            statement.setString(4, request.name());
            statement.setString(5, request.legalName());
            statement.setString(6, request.taxId());
            statement.setString(7, request.email());
            statement.setString(8, request.phone());
            statement.setString(9, request.contactName());
            statement.setString(10, request.notes());
            statement.setLong(11, userId);
            statement.setLong(12, requestId);
            return statement;
        }, keyHolder);
        var providerId = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        if (providerId <= 0) throw new IllegalStateException("Provider could not be created.");
        jdbcTemplate.update(
            """
                UPDATE provider_registration_requests
                SET status = 'APPROVED', unit_id = ?, business_id = ?, provider_id = ?,
                    review_note = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP
                WHERE id = ? AND company_id = ?
                """,
            unitId, businessId, providerId, nullable(reviewNote), userId,
            requestId, companyId);
        return Map.of(
            "request_id", requestId, "provider_id", providerId, "status", "APPROVED",
            "next_step", "ASSIGN_MODULE_ACCESS");
    }

    @Transactional
    public Map<String, Object> rejectRegistration(
            FinanceContext context, long requestId, String reviewNote) {
        return rejectRegistration(context.companyId(), context.userId(), requestId, reviewNote);
    }

    @Transactional
    public Map<String, Object> rejectRegistration(
            PosContext context, long requestId, String reviewNote) {
        return rejectRegistration(context.companyId(), context.userId(), requestId, reviewNote);
    }

    private Map<String, Object> rejectRegistration(
            long companyId, long userId, long requestId, String reviewNote) {
        registration(companyId, requestId, true);
        var updated = jdbcTemplate.update(
            """
                UPDATE provider_registration_requests
                SET status = 'REJECTED', review_note = ?, reviewed_by_user_id = ?,
                    reviewed_at = CURRENT_TIMESTAMP
                WHERE id = ? AND company_id = ? AND status IN ('SUBMITTED', 'IN_REVIEW')
                """,
            nullable(reviewNote), userId, requestId, companyId);
        if (updated != 1) throw FinanceApiException.conflict("Provider registration is no longer pending.");
        return Map.of("request_id", requestId, "status", "REJECTED");
    }

    @Transactional
    public Map<String, Object> reviewFinanceChange(
            FinanceContext context, long requestId, boolean approve, String reviewNote) {
        return reviewChange(
            context.companyId(), context.userId(), requestId, approve, reviewNote,
            Set.of("FISCAL", "BANKING"),
            (unitId, businessId) -> requireFinanceScope(context.scope(), unitId, businessId));
    }

    @Transactional
    public Map<String, Object> reviewCommercialChange(
            PosContext context, long requestId, boolean approve, String reviewNote) {
        return reviewChange(
            context.companyId(), context.userId(), requestId, approve, reviewNote,
            Set.of("COMMERCIAL", "CATALOG"),
            (unitId, businessId) -> requirePosScope(context.scope(), unitId, businessId));
    }

    private Map<String, Object> reviewChange(
            long companyId,
            long userId,
            long requestId,
            boolean approve,
            String reviewNote,
            Set<String> allowedCategories,
            ScopeCheck scopeCheck) {
        var request = change(companyId, requestId, true);
        if (!allowedCategories.contains(request.category())) {
            throw FinanceApiException.forbidden("This change belongs to another review area.");
        }
        scopeCheck.require(request.unitId(), request.businessId());
        if (!Set.of("SUBMITTED", "IN_REVIEW").contains(request.status())) {
            throw FinanceApiException.conflict("Provider change is no longer pending.");
        }
        if (approve) {
            // Name and fiscal identifiers have no legacy database uniqueness constraint.
            // Serializing approvals per company keeps the application-level check authoritative.
            lockCompany(companyId);
            applyChange(companyId, userId, request);
        }
        jdbcTemplate.update(
            """
                UPDATE provider_profile_change_requests
                SET status = ?, review_note = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP
                WHERE id = ? AND company_id = ?
                """,
            approve ? "APPROVED" : "REJECTED", nullable(reviewNote), userId,
            requestId, companyId);
        return Map.of(
            "request_id", requestId,
            "category", request.category(),
            "status", approve ? "APPROVED" : "REJECTED");
    }

    private void applyChange(long companyId, long userId, ChangeRow request) {
        var values = request.values();
        if ("COMMERCIAL".equals(request.category())) {
            requireOnly(values, Set.of(
                "name", "email", "phone", "contact_name", "payment_terms_days"));
            var name = string(values.get("name"));
            requireUnique(companyId, name.isBlank() ? null : name,
                null, request.providerId());
            if (values.containsKey("email")) requireEmail(string(values.get("email")));
            updateIfPresent(companyId, request.providerId(), userId, values, "name", "name");
            updateIfPresent(companyId, request.providerId(), userId, values, "email", "email");
            updateIfPresent(companyId, request.providerId(), userId, values, "phone", "phone");
            updateIfPresent(companyId, request.providerId(), userId, values, "contact_name", "contact_name");
            if (values.containsKey("payment_terms_days")) {
                var days = integer(values.get("payment_terms_days"));
                if (days < 0 || days > 3650) throw FinanceApiException.badRequest("Invalid payment terms.");
                jdbcTemplate.update(
                    "UPDATE finance_providers SET payment_terms_days = ?, updated_by_user_id = ?, version = version + 1 WHERE company_id = ? AND id = ? AND deleted_at IS NULL",
                    days, userId, companyId, request.providerId());
            }
        } else if ("CATALOG".equals(request.category())) {
            applyCatalogChange(companyId, userId, request.providerId(), values);
        } else if ("FISCAL".equals(request.category())) {
            requireOnly(values, Set.of("legal_name", "tax_id", "fiscal_address", "tax_regime"));
            validateSimpleValues(values, Map.of(
                "legal_name", 220, "tax_id", 80, "fiscal_address", 2000, "tax_regime", 180));
            var taxId = string(values.get("tax_id"));
            requireUnique(companyId, null, taxId.isBlank() ? null : taxId, request.providerId());
            updateIfPresent(companyId, request.providerId(), userId, values, "legal_name", "legal_name");
            updateIfPresent(companyId, request.providerId(), userId, values, "tax_id", "tax_id");
            var merged = mergedPrivateProfile(companyId, request.providerId(), false, values);
            jdbcTemplate.update(
                """
                    INSERT INTO provider_private_profiles (
                        provider_id, company_id, fiscal_profile_json, updated_by_user_id)
                    VALUES (?, ?, CAST(? AS JSON), ?)
                    ON DUPLICATE KEY UPDATE fiscal_profile_json = VALUES(fiscal_profile_json),
                        updated_by_user_id = VALUES(updated_by_user_id)
                    """,
                request.providerId(), companyId, json(merged), userId);
        } else if ("BANKING".equals(request.category())) {
            requireOnly(values, Set.of(
                "account_holder", "bank_name", "account_number", "clabe", "swift", "currency_code"));
            validateSimpleValues(values, Map.of(
                "account_holder", 180, "bank_name", 180, "account_number", 100,
                "clabe", 50, "swift", 50, "currency_code", 3));
            if (values.containsKey("currency_code")) {
                var currency = string(values.get("currency_code")).toUpperCase(java.util.Locale.ROOT);
                if (!currency.matches("^[A-Z]{3}$")) {
                    throw FinanceApiException.badRequest("Provider currency is invalid.");
                }
                values = new LinkedHashMap<>(values);
                values.put("currency_code", currency);
            }
            var merged = mergedPrivateProfile(companyId, request.providerId(), true, values);
            jdbcTemplate.update(
                """
                    INSERT INTO provider_private_profiles (
                        provider_id, company_id, protected_banking_profile, updated_by_user_id)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE protected_banking_profile = VALUES(protected_banking_profile),
                        updated_by_user_id = VALUES(updated_by_user_id)
                    """,
                request.providerId(), companyId, protection.protect(json(merged)), userId);
        } else {
            throw FinanceApiException.badRequest("Unsupported provider change category.");
        }
    }

    private void applyCatalogChange(
            long companyId, long userId, long providerId, Map<String, Object> values) {
        requireOnly(values, Set.of("catalog_items"));
        if (!(values.get("catalog_items") instanceof List<?> items)
                || items.isEmpty() || items.size() > 100) {
            throw FinanceApiException.badRequest("Invalid provider catalog change.");
        }
        for (var rawItem : items) {
            if (!(rawItem instanceof Map<?, ?> item)) {
                throw FinanceApiException.badRequest("Invalid provider catalog item.");
            }
            var productId = positiveLong(item.get("product_id"), "product_id");
            var cost = decimal(item.get("cost_amount"), "cost_amount");
            var minimum = decimal(item.get("minimum_order_quantity"), "minimum_order_quantity");
            var leadTime = integer(item.get("lead_time_days"));
            var currency = string(item.get("currency_code")).toUpperCase(java.util.Locale.ROOT);
            if (cost.signum() < 0 || minimum.signum() <= 0 || leadTime < 0 || leadTime > 3650
                    || !currency.matches("^[A-Z]{3}$")) {
                throw FinanceApiException.badRequest("Invalid provider catalog values.");
            }
            var updated = jdbcTemplate.update(
                """
                    UPDATE pos_product_suppliers
                    SET provider_sku = ?, cost_amount = ?, currency_code = ?,
                        lead_time_days = ?, minimum_order_quantity = ?,
                        updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE company_id = ? AND provider_id = ? AND product_id = ?
                      AND deleted_at IS NULL AND is_active = 1
                      AND EXISTS (
                        SELECT 1 FROM sales_products product
                        WHERE product.company_id = pos_product_suppliers.company_id
                          AND product.id = pos_product_suppliers.product_id
                          AND product.deleted_at IS NULL
                      )
                    """,
                nullable(string(item.get("provider_sku"))), cost, currency, leadTime, minimum,
                userId, companyId, providerId, productId);
            if (updated != 1) {
                throw FinanceApiException.badRequest("Provider catalog product is unavailable.");
            }
        }
    }

    private void requireOnly(Map<String, Object> values, Set<String> allowed) {
        if (values.isEmpty() || values.size() > allowed.size() || !allowed.containsAll(values.keySet())) {
            throw FinanceApiException.badRequest("Provider changes contain unsupported fields.");
        }
    }

    private void validateSimpleValues(Map<String, Object> values, Map<String, Integer> limits) {
        for (var entry : values.entrySet()) {
            var raw = entry.getValue();
            if (raw != null && !(raw instanceof String) && !(raw instanceof Number)) {
                throw FinanceApiException.badRequest("Provider changes must use simple values.");
            }
            var limit = limits.get(entry.getKey());
            if (limit == null || string(raw).length() > limit) {
                throw FinanceApiException.badRequest("Provider change value is too long.");
            }
        }
    }

    private void requireEmail(String value) {
        if (value.length() < 5 || value.length() > 180
                || !value.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            throw FinanceApiException.badRequest("Provider email is invalid.");
        }
    }

    private long positiveLong(Object value, String field) {
        try {
            var parsed = value instanceof Number number ? number.longValue() : Long.parseLong(string(value));
            if (parsed > 0) return parsed;
        } catch (RuntimeException ignored) { }
        throw FinanceApiException.badRequest("Invalid " + field + ".");
    }

    private java.math.BigDecimal decimal(Object value, String field) {
        try {
            var parsed = new java.math.BigDecimal(string(value))
                .setScale(4, java.math.RoundingMode.HALF_UP);
            if (parsed.precision() <= 19) return parsed;
            throw new NumberFormatException("precision");
        }
        catch (RuntimeException invalid) { throw FinanceApiException.badRequest("Invalid " + field + "."); }
    }

    private void updateIfPresent(
            long companyId, long providerId, long userId,
            Map<String, Object> values, String key, String column) {
        if (!values.containsKey(key)) return;
        var allowedColumn = switch (column) {
            case "name" -> "name";
            case "legal_name" -> "legal_name";
            case "tax_id" -> "tax_id";
            case "email" -> "email";
            case "phone" -> "phone";
            case "contact_name" -> "contact_name";
            default -> throw new IllegalArgumentException("Unsupported provider field.");
        };
        var value = string(values.get(key));
        if ("name".equals(key) && value.isBlank()) {
            throw FinanceApiException.badRequest("Provider name cannot be blank.");
        }
        var maximum = switch (key) {
            case "name", "email", "contact_name" -> 180;
            case "legal_name" -> 220;
            case "tax_id" -> 80;
            case "phone" -> 60;
            default -> throw new IllegalArgumentException("Unsupported provider field.");
        };
        if (value.length() > maximum) {
            throw FinanceApiException.badRequest("Provider change value is too long.");
        }
        jdbcTemplate.update(
            "UPDATE finance_providers SET " + allowedColumn
                + " = ?, updated_by_user_id = ?, version = version + 1 WHERE company_id = ? AND id = ? AND deleted_at IS NULL",
            value.isBlank() ? null : value, userId, companyId, providerId);
    }

    private List<Map<String, Object>> registrations(long companyId) {
        return jdbcTemplate.query(
            """
                SELECT id, name, legal_name, tax_id, email, phone, contact_name,
                       notes, status, created_at
                FROM provider_registration_requests
                WHERE company_id = ? ORDER BY created_at DESC, id DESC LIMIT 500
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id")); row.put("name", rs.getString("name"));
                row.put("legal_name", value(rs.getString("legal_name")));
                row.put("tax_id", value(rs.getString("tax_id")));
                row.put("email", rs.getString("email")); row.put("phone", value(rs.getString("phone")));
                row.put("contact_name", rs.getString("contact_name"));
                row.put("notes", value(rs.getString("notes"))); row.put("status", rs.getString("status"));
                row.put("created_at", rs.getTimestamp("created_at").toInstant().toString());
                return Map.copyOf(row);
            }, companyId);
    }

    private List<Map<String, Object>> changes(
            long companyId,
            Set<String> categories,
            String scopeType,
            Long scopeUnitId,
            Long scopeBusinessId) {
        if (categories.isEmpty()) return List.of();
        var placeholders = String.join(",", java.util.Collections.nCopies(categories.size(), "?"));
        var params = new java.util.ArrayList<Object>(); params.add(companyId); params.addAll(categories);
        var scopeSql = switch (scopeType) {
            case "UNIT_HEADQUARTERS" -> { params.add(scopeUnitId); yield " AND provider.unit_id = ?"; }
            case "BUSINESS_OFFICE" -> { params.add(scopeBusinessId); yield " AND provider.business_id = ?"; }
            default -> "";
        };
        return jdbcTemplate.query(
            """
                SELECT request.id, request.provider_id, provider.name AS provider_name,
                       request.category, request.status, request.changes_json,
                       request.protected_changes,
                       request.submitted_by_name, request.submitted_by_email, request.created_at
                FROM provider_profile_change_requests request
                INNER JOIN finance_providers provider
                  ON provider.id = request.provider_id AND provider.company_id = request.company_id
                 AND provider.status = 'ACTIVE' AND provider.deleted_at IS NULL
                WHERE request.company_id = ? AND request.category IN (
                """ + placeholders + ")" + scopeSql
                + " ORDER BY request.created_at DESC, request.id DESC LIMIT 500",
            (rs, rowNum) -> Map.of(
                "id", rs.getLong("id"), "provider_id", rs.getLong("provider_id"),
                "provider_name", rs.getString("provider_name"), "category", rs.getString("category"),
                "status", rs.getString("status"), "changes", requestChanges(
                    rs.getString("category"), rs.getString("changes_json"),
                    rs.getString("protected_changes")),
                "submitted_by_name", value(rs.getString("submitted_by_name")),
                "submitted_by_email", value(rs.getString("submitted_by_email")),
                "created_at", rs.getTimestamp("created_at").toInstant().toString()),
            params.toArray());
    }

    private List<Map<String, Object>> orderResponses(
            long companyId,
            String scopeType,
            Long scopeUnitId,
            Long scopeBusinessId) {
        var params = new java.util.ArrayList<Object>();
        params.add(companyId);
        var scopeSql = switch (scopeType) {
            case "UNIT_HEADQUARTERS" -> {
                params.add(scopeUnitId);
                yield " AND provider.unit_id = ?";
            }
            case "BUSINESS_OFFICE" -> {
                params.add(scopeBusinessId);
                yield " AND provider.business_id = ?";
            }
            default -> "";
        };
        return jdbcTemplate.query(
            """
                SELECT response.id, response.purchase_order_id, purchase_order.folio,
                       response.provider_id, provider.name AS provider_name,
                       response.response_type, response.requested_expected_date,
                       response.reason, response.submitted_by_name,
                       response.submitted_by_email, response.created_at
                FROM pos_purchase_order_supplier_responses response
                INNER JOIN pos_purchase_orders purchase_order
                  ON purchase_order.id = response.purchase_order_id
                 AND purchase_order.company_id = response.company_id
                 AND purchase_order.provider_id = response.provider_id
                 AND purchase_order.deleted_at IS NULL
                 AND purchase_order.status = 'NEEDS_CLARIFICATION'
                INNER JOIN finance_providers provider
                  ON provider.id = response.provider_id
                 AND provider.company_id = response.company_id
                 AND provider.status = 'ACTIVE' AND provider.deleted_at IS NULL
                WHERE response.company_id = ?
                  AND response.response_type = 'ADJUSTMENT_REQUESTED'
                  AND response.id = (
                    SELECT MAX(latest.id)
                    FROM pos_purchase_order_supplier_responses latest
                    WHERE latest.company_id = response.company_id
                      AND latest.purchase_order_id = response.purchase_order_id
                  )
                """ + scopeSql + " ORDER BY response.created_at DESC, response.id DESC LIMIT 500",
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("purchase_order_id", rs.getLong("purchase_order_id"));
                row.put("folio", rs.getString("folio"));
                row.put("provider_id", rs.getLong("provider_id"));
                row.put("provider_name", rs.getString("provider_name"));
                row.put("response_type", rs.getString("response_type"));
                row.put("requested_expected_date", rs.getDate("requested_expected_date") == null
                    ? "" : rs.getDate("requested_expected_date").toLocalDate().toString());
                row.put("reason", value(rs.getString("reason")));
                row.put("submitted_by_name", value(rs.getString("submitted_by_name")));
                row.put("submitted_by_email", value(rs.getString("submitted_by_email")));
                row.put("created_at", rs.getTimestamp("created_at").toInstant().toString());
                return Map.copyOf(row);
            },
            params.toArray());
    }

    private RegistrationRow registration(long companyId, long id, boolean lock) {
        return jdbcTemplate.query(
            """
                SELECT id, name, legal_name, tax_id, email, phone, contact_name, notes, status
                FROM provider_registration_requests
                WHERE company_id = ? AND id = ?
                """ + (lock ? " FOR UPDATE" : ""),
            (rs, rowNum) -> new RegistrationRow(
                rs.getLong("id"), rs.getString("name"), rs.getString("legal_name"),
                rs.getString("tax_id"), rs.getString("email"), rs.getString("phone"),
                rs.getString("contact_name"), rs.getString("notes"), rs.getString("status")),
            companyId, id).stream().findFirst()
            .orElseThrow(() -> FinanceApiException.badRequest("Provider registration not found."));
    }

    private ChangeRow change(long companyId, long id, boolean lock) {
        return jdbcTemplate.query(
            """
                SELECT request.*, provider.unit_id, provider.business_id
                FROM provider_profile_change_requests request
                INNER JOIN finance_providers provider
                  ON provider.id = request.provider_id AND provider.company_id = request.company_id
                 AND provider.status = 'ACTIVE' AND provider.deleted_at IS NULL
                WHERE request.company_id = ? AND request.id = ?
                """ + (lock ? " FOR UPDATE" : ""),
            (rs, rowNum) -> new ChangeRow(
                rs.getLong("id"), rs.getLong("provider_id"), rs.getString("category"),
                rs.getString("status"), requestChanges(
                    rs.getString("category"), rs.getString("changes_json"),
                    rs.getString("protected_changes")),
                rs.getObject("unit_id", Long.class), rs.getObject("business_id", Long.class)),
            companyId, id).stream().findFirst()
            .orElseThrow(() -> FinanceApiException.badRequest("Provider change request not found."));
    }

    private void requireUnique(long companyId, String name, String taxId, Long excludedId) {
        if (name != null && !name.isBlank()) {
            var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM finance_providers WHERE company_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) AND deleted_at IS NULL AND (? IS NULL OR id <> ?)",
                Integer.class, companyId, name, excludedId, excludedId);
            if (count != null && count > 0) throw FinanceApiException.conflict("Provider name already exists.");
        }
        if (taxId != null && !taxId.isBlank()) {
            var count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM finance_providers WHERE company_id = ? AND tax_id = ? AND deleted_at IS NULL AND (? IS NULL OR id <> ?)",
                Integer.class, companyId, taxId, excludedId, excludedId);
            if (count != null && count > 0) throw FinanceApiException.conflict("Provider tax ID already exists.");
        }
    }

    private void requireBusiness(long companyId, long unitId, long businessId) {
        var count = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM businesses business
                INNER JOIN units unit
                  ON unit.id = business.unit_id AND unit.company_id = business.company_id
                WHERE business.company_id = ? AND business.id = ? AND business.unit_id = ?
                  AND (business.status = 'active' OR business.status IS NULL OR business.status = '')
                  AND (unit.status = 'active' OR unit.status IS NULL OR unit.status = '')
                """,
            Integer.class, companyId, businessId, unitId);
        if (count == null || count != 1) throw FinanceApiException.badRequest("Business assignment is invalid.");
    }

    private void lockCompany(long companyId) {
        var locked = jdbcTemplate.queryForObject(
            "SELECT id FROM companies WHERE id = ? FOR UPDATE", Long.class, companyId);
        if (locked == null) throw FinanceApiException.badRequest("Company is unavailable.");
    }

    private Map<String, Object> mergedPrivateProfile(
            long companyId,
            long providerId,
            boolean banking,
            Map<String, Object> changes) {
        var current = jdbcTemplate.query(
            """
                SELECT fiscal_profile_json, protected_banking_profile
                FROM provider_private_profiles
                WHERE company_id = ? AND provider_id = ?
                FOR UPDATE
                """,
            (rs, rowNum) -> banking
                ? protectedProfile(rs.getString("protected_banking_profile"))
                : parse(rs.getString("fiscal_profile_json")),
            companyId, providerId).stream().findFirst().orElseGet(LinkedHashMap::new);
        var merged = new LinkedHashMap<String, Object>(current);
        merged.putAll(changes);
        return merged;
    }

    private Map<String, Object> protectedProfile(String value) {
        if (value == null || value.isBlank()) return new LinkedHashMap<>();
        return parse(protection.reveal(value));
    }

    private void requireFinanceScope(FinanceScope scope, Long unitId, Long businessId) {
        if (unitId == null || businessId == null) throw FinanceApiException.badRequest("Provider assignment is incomplete.");
        if (scope.type() == FinanceScope.Type.UNIT_HEADQUARTERS && !unitId.equals(scope.unitId()))
            throw FinanceApiException.forbidden("Provider is outside your unit scope.");
        if (scope.type() == FinanceScope.Type.BUSINESS_OFFICE && !businessId.equals(scope.businessId()))
            throw FinanceApiException.forbidden("Provider is outside your business scope.");
    }

    private void requirePosScope(PosScope scope, Long unitId, Long businessId) {
        if (unitId == null || businessId == null) throw FinanceApiException.badRequest("Provider assignment is incomplete.");
        if (scope.type() == PosScope.Type.UNIT_HEADQUARTERS && !unitId.equals(scope.unitId()))
            throw FinanceApiException.forbidden("Provider is outside your unit scope.");
        if (scope.type() == PosScope.Type.BUSINESS_OFFICE && !businessId.equals(scope.businessId()))
            throw FinanceApiException.forbidden("Provider is outside your business scope.");
    }

    private Map<String, Object> parse(String json) {
        try { return json == null || json.isBlank() ? Map.of() : objectMapper.readValue(json, MAP_TYPE); }
        catch (JsonProcessingException invalid) { throw new IllegalStateException("Provider change payload is invalid.", invalid); }
    }
    private Map<String, Object> requestChanges(
            String category, String changesJson, String protectedChanges) {
        if (!"BANKING".equals(category)) return parse(changesJson);
        if (protectedChanges == null || protectedChanges.isBlank()) {
            throw new IllegalStateException("Protected provider banking change is unavailable.");
        }
        return parse(protection.reveal(protectedChanges));
    }
    private String json(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException invalid) { throw new IllegalArgumentException("Provider change payload is invalid."); }
    }
    private String string(Object value) { return value == null ? "" : String.valueOf(value).trim(); }
    private int integer(Object value) {
        try { return value instanceof Number number ? number.intValue() : Integer.parseInt(string(value)); }
        catch (RuntimeException invalid) { throw FinanceApiException.badRequest("Invalid numeric provider value."); }
    }
    private String nullable(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private String value(String value) { return value == null ? "" : value; }

    @FunctionalInterface private interface ScopeCheck { void require(Long unitId, Long businessId); }
    private record RegistrationRow(
        long id, String name, String legalName, String taxId, String email,
        String phone, String contactName, String notes, String status) {}
    private record ChangeRow(
        long id, long providerId, String category, String status,
        Map<String, Object> values, Long unitId, Long businessId) {}
}
