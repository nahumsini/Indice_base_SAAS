package com.indice.erp.pos.purchaseorder;

import com.indice.erp.kiosk.engine.ProviderCenterAccessPolicy;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierQuoteRequestCreateRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Internal Procurement workflow for issuing RFQs to one provider. */
@Service
public class SupplierQuoteRequestService {

    private final JdbcTemplate jdbcTemplate;
    private final ProviderCenterAccessPolicy providerAccess;

    public SupplierQuoteRequestService(
            JdbcTemplate jdbcTemplate, ProviderCenterAccessPolicy providerAccess) {
        this.jdbcTemplate = jdbcTemplate;
        this.providerAccess = providerAccess;
    }

    public Map<String, Object> list(PosContext context) {
        var params = new java.util.ArrayList<Object>();
        params.add(context.companyId());
        var scope = scopeSql(context.scope(), params, "request");
        var items = jdbcTemplate.query(
            """
                SELECT request.id, request.request_number, request.provider_id,
                       provider.name AS provider_name, request.title, request.description,
                       request.currency_code, request.status, request.response_deadline,
                       request.opened_at, request.closed_at, request.created_at,
                       (SELECT COUNT(*) FROM pos_supplier_quote_request_items item
                         WHERE item.company_id = request.company_id
                           AND item.quote_request_id = request.id) AS item_count,
                       (SELECT COUNT(*) FROM pos_supplier_submissions submission
                         WHERE submission.company_id = request.company_id
                           AND submission.quote_request_id = request.id
                           AND submission.deleted_at IS NULL) AS response_count
                FROM pos_supplier_quote_requests request
                INNER JOIN finance_providers provider
                  ON provider.id = request.provider_id AND provider.company_id = request.company_id
                WHERE request.company_id = ?
                """ + scope + " ORDER BY request.created_at DESC, request.id DESC LIMIT 500",
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("request_number", rs.getString("request_number"));
                row.put("provider_id", rs.getLong("provider_id"));
                row.put("provider_name", rs.getString("provider_name"));
                row.put("title", rs.getString("title"));
                row.put("description", value(rs.getString("description")));
                row.put("currency_code", rs.getString("currency_code"));
                row.put("status", rs.getString("status"));
                row.put("response_deadline", rs.getTimestamp("response_deadline").toInstant().toString());
                row.put("opened_at", timestamp(rs.getTimestamp("opened_at")));
                row.put("closed_at", timestamp(rs.getTimestamp("closed_at")));
                row.put("created_at", rs.getTimestamp("created_at").toInstant().toString());
                row.put("item_count", rs.getInt("item_count"));
                row.put("response_count", rs.getInt("response_count"));
                return Map.copyOf(row);
            }, params.toArray());
        return Map.of("items", items, "count", items.size());
    }

    @Transactional
    public Map<String, Object> create(
            PosContext context, SupplierQuoteRequestCreateRequest request) {
        if (request.responseDeadline() == null
                || !request.responseDeadline().isAfter(Instant.now().plusSeconds(60))) {
            throw PosApiException.badRequest("Response deadline must be in the future.");
        }
        var currency = request.currencyCode().trim().toUpperCase();
        if (!Set.of("MXN", "USD", "CAD", "COP", "BRL").contains(currency)) {
            throw PosApiException.badRequest("Unsupported quote currency.");
        }
        var provider = providerScope(context, request.providerId());
        var requestNumber = "RFQ-" + Instant.now().toEpochMilli() + "-"
            + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase(java.util.Locale.ROOT);
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO pos_supplier_quote_requests (
                        company_id, unit_id, business_id, provider_id, request_number,
                        title, description, currency_code, status, response_deadline,
                        created_by_user_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?, ?)
                    """,
                Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId());
            statement.setLong(2, provider.unitId());
            statement.setLong(3, provider.businessId());
            statement.setLong(4, request.providerId());
            statement.setString(5, requestNumber);
            statement.setString(6, request.title().trim());
            statement.setString(7, nullable(request.description()));
            statement.setString(8, currency);
            statement.setTimestamp(9, Timestamp.from(request.responseDeadline()));
            statement.setLong(10, context.userId());
            return statement;
        }, keyHolder);
        var id = keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
        if (id <= 0) throw new IllegalStateException("Quote request could not be created.");
        var sort = 0;
        for (var item : request.items()) {
            if (item.productId() != null) requireProduct(context.companyId(), item.productId());
            var quantity = normalizedQuantity(item.quantity());
            jdbcTemplate.update(
                """
                    INSERT INTO pos_supplier_quote_request_items (
                        company_id, quote_request_id, product_id, sku_snapshot,
                        product_name_snapshot, requested_quantity, notes, sort_order
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                context.companyId(), id, item.productId(), nullable(item.sku()),
                item.productName().trim(), quantity, nullable(item.notes()), sort++);
        }
        return detail(context, id);
    }

    @Transactional
    public Map<String, Object> transition(PosContext context, long id, String action) {
        var row = requireRequest(context, id, true);
        var normalized = action == null ? "" : action.trim().toUpperCase();
        var target = switch (normalized) {
            case "OPEN" -> {
                if (!"DRAFT".equals(row.status())) throw PosApiException.badRequest("Only draft requests can be opened.");
                if (!row.deadline().isAfter(Instant.now())) throw PosApiException.badRequest("The response deadline has passed.");
                yield "OPEN";
            }
            case "CLOSE" -> {
                if (!"OPEN".equals(row.status())) throw PosApiException.badRequest("Only open requests can be closed.");
                yield "CLOSED";
            }
            case "CANCEL" -> {
                if (!Set.of("DRAFT", "OPEN").contains(row.status())) throw PosApiException.badRequest("Request cannot be cancelled.");
                yield "CANCELLED";
            }
            default -> throw PosApiException.badRequest("Unsupported quote request transition.");
        };
        jdbcTemplate.update(
            """
                UPDATE pos_supplier_quote_requests
                SET status = ?,
                    opened_at = CASE WHEN ? = 'OPEN' THEN CURRENT_TIMESTAMP ELSE opened_at END,
                    closed_at = CASE WHEN ? = 'CLOSED' THEN CURRENT_TIMESTAMP ELSE closed_at END,
                    cancelled_at = CASE WHEN ? = 'CANCELLED' THEN CURRENT_TIMESTAMP ELSE cancelled_at END
                WHERE id = ? AND company_id = ?
                """,
            target, target, target, target, id, context.companyId());
        return detail(context, id);
    }

    public Map<String, Object> detail(PosContext context, long id) {
        var row = requireRequest(context, id, false);
        var items = jdbcTemplate.query(
            """
                SELECT id, product_id, sku_snapshot, product_name_snapshot,
                       requested_quantity, notes, sort_order
                FROM pos_supplier_quote_request_items
                WHERE company_id = ? AND quote_request_id = ? ORDER BY sort_order, id
                """,
            (rs, rowNum) -> {
                var item = new LinkedHashMap<String, Object>();
                item.put("id", rs.getLong("id"));
                item.put("product_id", nullableLong(rs, "product_id"));
                item.put("sku", value(rs.getString("sku_snapshot")));
                item.put("product_name", rs.getString("product_name_snapshot"));
                item.put("quantity", rs.getBigDecimal("requested_quantity"));
                item.put("notes", value(rs.getString("notes")));
                item.put("sort_order", rs.getInt("sort_order"));
                return Map.copyOf(item);
            }, context.companyId(), id);
        return Map.of(
            "id", row.id(), "request_number", row.number(), "provider_id", row.providerId(),
            "title", row.title(), "currency_code", row.currency(), "status", row.status(),
            "response_deadline", row.deadline().toString(), "items", items);
    }

    private RequestRow requireRequest(PosContext context, long id, boolean lock) {
        var params = new java.util.ArrayList<Object>();
        params.add(context.companyId());
        params.add(id);
        var scope = scopeSql(context.scope(), params, "request");
        var sql = """
            SELECT request.id, request.request_number, request.provider_id, request.title,
                   request.currency_code, request.status, request.response_deadline
            FROM pos_supplier_quote_requests request
            WHERE request.company_id = ? AND request.id = ?
            """ + scope + (lock ? " FOR UPDATE" : "");
        return jdbcTemplate.query(sql,
            (rs, rowNum) -> new RequestRow(
                rs.getLong("id"), rs.getString("request_number"), rs.getLong("provider_id"),
                rs.getString("title"), rs.getString("currency_code"), rs.getString("status"),
                rs.getTimestamp("response_deadline").toInstant()),
            params.toArray()).stream().findFirst()
            .orElseThrow(() -> PosApiException.notFound("Quote request not found."));
    }

    private ProviderScope providerScope(PosContext context, long providerId) {
        providerAccess.requireAccess(context.companyId(), providerId);
        var rows = jdbcTemplate.query(
            """
                SELECT unit_id, business_id FROM finance_providers
                WHERE company_id = ? AND id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
                  AND unit_id IS NOT NULL AND business_id IS NOT NULL
                """,
            (rs, rowNum) -> new ProviderScope(rs.getLong("unit_id"), rs.getLong("business_id")),
            context.companyId(), providerId);
        if (rows.isEmpty()) throw PosApiException.badRequest(
            "Provider must be active, assigned to a unit and business, and have Provider Center access.");
        var provider = rows.getFirst();
        if (context.scope().type() == PosScope.Type.UNIT_HEADQUARTERS
                && !provider.unitId().equals(context.scope().unitId())) {
            throw PosApiException.forbidden("Provider is outside your unit scope.");
        }
        if (context.scope().type() == PosScope.Type.BUSINESS_OFFICE
                && !provider.businessId().equals(context.scope().businessId())) {
            throw PosApiException.forbidden("Provider is outside your business scope.");
        }
        return provider;
    }

    private void requireProduct(long companyId, long productId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM sales_products WHERE company_id = ? AND id = ? AND deleted_at IS NULL",
            Integer.class, companyId, productId);
        if (count == null || count != 1) throw PosApiException.badRequest("Product is invalid.");
    }

    private String scopeSql(PosScope scope, List<Object> params, String alias) {
        return switch (scope.type()) {
            case CORPORATE_OFFICE -> "";
            case UNIT_HEADQUARTERS -> {
                params.add(scope.unitId()); yield " AND " + alias + ".unit_id = ?";
            }
            case BUSINESS_OFFICE -> {
                params.add(scope.businessId()); yield " AND " + alias + ".business_id = ?";
            }
        };
    }

    private String nullable(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private BigDecimal normalizedQuantity(BigDecimal value) {
        if (value == null || value.signum() <= 0) {
            throw PosApiException.badRequest("Quantity must be greater than zero.");
        }
        var normalized = value.setScale(4, RoundingMode.HALF_UP);
        if (normalized.signum() <= 0 || normalized.precision() > 19) {
            throw PosApiException.badRequest("Quantity is outside the supported range.");
        }
        return normalized;
    }
    private String value(String value) { return value == null ? "" : value; }
    private String timestamp(Timestamp value) { return value == null ? "" : value.toInstant().toString(); }
    private Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getLong(column); return rs.wasNull() ? null : value;
    }

    private record ProviderScope(Long unitId, Long businessId) {}
    private record RequestRow(
        long id, String number, long providerId, String title,
        String currency, String status, Instant deadline) {}
}
