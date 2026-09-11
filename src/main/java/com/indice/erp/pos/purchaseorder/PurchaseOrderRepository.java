package com.indice.erp.pos.purchaseorder;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosJsonSupport;
import com.indice.erp.pos.PosScope;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.pos.customerdisplay.CustomerDisplaySecretCodec;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.ProductSupplierRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.ProductSupplierResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderItemRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderItemResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.PurchaseOrderResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierInvoiceResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalAccessResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierPortalCatalogProduct;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionCreateRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionItemRequest;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionItemResponse;
import com.indice.erp.pos.purchaseorder.PurchaseOrderDtos.SupplierSubmissionResponse;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Statement;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class PurchaseOrderRepository {

    void lockOrder(PosContext context, long orderId) {
        jdbcTemplate.queryForList("SELECT id FROM pos_purchase_orders WHERE company_id = ? AND id = ? FOR UPDATE",
            Long.class, context.companyId(), orderId);
    }

    private final JdbcTemplate jdbcTemplate;
    private final CustomerDisplaySecretCodec secrets;

    public PurchaseOrderRepository(
            JdbcTemplate jdbcTemplate,
            CustomerDisplaySecretCodec secrets) {
        this.jdbcTemplate = jdbcTemplate;
        this.secrets = secrets;
    }

    public List<ProductSupplierResponse> listProductSuppliers(PosContext context) {
        var params = scopedParams(context, "provider");
        return jdbcTemplate.query("""
            SELECT ps.*, product.name AS product_name, product.sku AS product_sku,
                   provider.name AS provider_name
            FROM pos_product_suppliers ps
            JOIN sales_products product
              ON product.id = ps.product_id
             AND product.company_id = ps.company_id
            JOIN finance_providers provider
              ON provider.id = ps.provider_id
             AND provider.company_id = ps.company_id
            WHERE ps.company_id = ? AND ps.deleted_at IS NULL
              AND product.deleted_at IS NULL AND provider.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("provider", context.scope()) + """
            ORDER BY ps.is_preferred DESC, product.name ASC, provider.name ASC
            """, (rs, rowNum) -> new ProductSupplierResponse(
            rs.getLong("id"),
            rs.getLong("product_id"),
            rs.getString("product_name"),
            rs.getString("product_sku"),
            rs.getLong("provider_id"),
            rs.getString("provider_name"),
            rs.getString("provider_sku"),
            rs.getBigDecimal("cost_amount"),
            rs.getString("currency_code"),
            nullableInteger(rs, "lead_time_days"),
            rs.getBigDecimal("minimum_order_quantity"),
            rs.getBoolean("is_preferred"),
            rs.getBoolean("is_active"),
            rs.getString("notes"),
            instant(rs, "updated_at")
        ), params.toArray());
    }

    public long upsertProductSupplier(PosContext context, ProductSupplierRequest request) {
        var existing = jdbcTemplate.query("""
            SELECT id FROM pos_product_suppliers
            WHERE company_id = ? AND product_id = ? AND provider_id = ? AND deleted_at IS NULL
            """, (rs, rowNum) -> rs.getLong("id"), context.companyId(), request.productId(), request.providerId())
            .stream()
            .findFirst();
        if (existing.isPresent()) {
            updateProductSupplier(context, existing.get(), request);
            return existing.get();
        }
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_product_suppliers
                (company_id, product_id, provider_id, provider_sku, cost_amount, currency_code,
                 lead_time_days, minimum_order_quantity, is_preferred, is_active, notes,
                 created_by_user_id, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId());
            statement.setLong(2, request.productId());
            statement.setLong(3, request.providerId());
            statement.setString(4, trimToNull(request.providerSku()));
            statement.setBigDecimal(5, request.costAmount());
            statement.setString(6, normalizedCurrency(request.currencyCode()));
            statement.setObject(7, request.leadTimeDays());
            statement.setBigDecimal(8, request.minimumOrderQuantity());
            statement.setBoolean(9, Boolean.TRUE.equals(request.preferred()));
            statement.setBoolean(10, request.active() == null || request.active());
            statement.setString(11, trimToNull(request.notes()));
            statement.setLong(12, context.userId());
            statement.setString(13, PosJsonSupport.toJson(Map.of("source", "POS_PURCHASE_SUPPLIER")));
            return statement;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public boolean updateProductSupplier(PosContext context, long id, ProductSupplierRequest request) {
        return jdbcTemplate.update("""
            UPDATE pos_product_suppliers
            SET provider_sku = ?, cost_amount = ?, currency_code = ?, lead_time_days = ?,
                minimum_order_quantity = ?, is_preferred = ?, is_active = ?, notes = ?,
                updated_by_user_id = ?
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """,
            trimToNull(request.providerSku()),
            request.costAmount(),
            normalizedCurrency(request.currencyCode()),
            request.leadTimeDays(),
            request.minimumOrderQuantity(),
            Boolean.TRUE.equals(request.preferred()),
            request.active() == null || request.active(),
            trimToNull(request.notes()),
            context.userId(),
            context.companyId(),
            id
        ) > 0;
    }

    public Optional<ProductSupplierResponse> findProductSupplier(PosContext context, long id) {
        return listProductSuppliers(context).stream().filter(item -> item.id().equals(id)).findFirst();
    }

    public List<PurchaseOrderResponse> listOrders(
            PosContext context,
            PurchaseOrderStatus status,
            PurchaseOrderOrigin origin,
            Long providerId,
            Long warehouseId,
            LocalDate dateFrom,
            LocalDate dateTo) {
        var params = scopedParams(context, "po");
        var sql = new StringBuilder(orderSelect()).append("""
            WHERE po.company_id = ? AND po.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("po", context.scope()));

        if (status != null) {
            sql.append(" AND po.status = ?");
            params.add(status.name());
        }
        if (origin != null) {
            sql.append(" AND po.origin = ?");
            params.add(origin.name());
        }
        if (providerId != null) {
            sql.append(" AND po.provider_id = ?");
            params.add(providerId);
        }
        if (warehouseId != null) {
            sql.append(" AND po.warehouse_id = ?");
            params.add(warehouseId);
        }
        if (dateFrom != null) {
            sql.append(" AND po.expected_date >= ?");
            params.add(Date.valueOf(dateFrom));
        }
        if (dateTo != null) {
            sql.append(" AND po.expected_date <= ?");
            params.add(Date.valueOf(dateTo));
        }
        sql.append(" ORDER BY po.created_at DESC, po.id DESC");

        var orders = jdbcTemplate.query(sql.toString(), this::mapOrder, params.toArray());
        return attachItems(context, orders);
    }

    public Optional<PurchaseOrderResponse> findOrder(PosContext context, long orderId) {
        var params = scopedParams(context, "po");
        params.add(1, orderId);
        var orders = jdbcTemplate.query(orderSelect() + """
            WHERE po.company_id = ? AND po.id = ? AND po.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("po", context.scope()) + """
            """, this::mapOrder, params.toArray());
        return attachItems(context, orders).stream().findFirst();
    }

    public long insertOrder(
            PosContext context,
            WarehouseRef warehouse,
            ProviderRef provider,
            PurchaseOrderStatus status,
            PurchaseOrderOrigin origin,
            Long sourceSubmissionId,
            String folio,
            String currencyCode,
            LocalDate expectedDate,
            String notes,
            BigDecimal subtotal,
            BigDecimal taxes,
            BigDecimal total,
            List<PurchaseOrderLineCommand> items) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_purchase_orders
                (company_id, unit_id, business_id, warehouse_id, provider_id, folio, status, origin,
                 source_submission_id, currency_code, subtotal_amount, tax_amount, total_amount, expected_date,
                 notes, created_by_user_id, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId());
            statement.setObject(2, warehouse.unitId());
            statement.setObject(3, warehouse.businessId());
            statement.setLong(4, warehouse.id());
            statement.setLong(5, provider.id());
            statement.setString(6, folio);
            statement.setString(7, status.name());
            statement.setString(8, origin.name());
            statement.setObject(9, sourceSubmissionId);
            statement.setString(10, normalizedCurrency(currencyCode));
            statement.setBigDecimal(11, subtotal);
            statement.setBigDecimal(12, taxes);
            statement.setBigDecimal(13, total);
            statement.setObject(14, expectedDate == null ? null : Date.valueOf(expectedDate));
            statement.setString(15, trimToNull(notes));
            statement.setLong(16, context.userId());
            var metadata = new LinkedHashMap<String, Object>();
            metadata.put("source", origin.name());
            if (sourceSubmissionId != null) {
                metadata.put("sourceSubmissionId", sourceSubmissionId);
            }
            statement.setString(17, PosJsonSupport.toJson(metadata));
            return statement;
        }, keyHolder);

        var orderId = keyHolder.getKey().longValue();
        for (var item : items) {
            insertOrderItem(context, orderId, item);
        }
        return orderId;
    }

    public boolean updateStatus(PosContext context, long orderId, PurchaseOrderStatus status, String note) {
        var timestampColumn = switch (status) {
            case REQUESTED -> "ordered_at";
            case APPROVED -> "approved_at";
            case ISSUED, SENT, CONFIRMED -> "sent_at";
            case RECEIVED -> "received_at";
            case CANCELLED -> "cancelled_at";
            default -> null;
        };
        var sql = """
            UPDATE pos_purchase_orders
            SET status = ?, updated_by_user_id = ?, notes = COALESCE(NULLIF(?, ''), notes)
            """ + (timestampColumn == null ? "" : ", " + timestampColumn + " = COALESCE(" + timestampColumn + ", CURRENT_TIMESTAMP)") + """
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """;
        return jdbcTemplate.update(
            sql,
            status.name(),
            context.userId(),
            trimToNull(note),
            context.companyId(),
            orderId
        ) > 0;
    }

    public long insertReceipt(PosContext context, PurchaseOrderResponse order, String receiptNumber, String notes) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_purchase_receipts
                (company_id, purchase_order_id, warehouse_id, receipt_number, received_by_user_id,
                 notes, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId());
            statement.setLong(2, order.id());
            statement.setLong(3, order.warehouseId());
            statement.setString(4, receiptNumber);
            statement.setLong(5, context.userId());
            statement.setString(6, trimToNull(notes));
            statement.setString(7, PosJsonSupport.toJson(Map.of("source", "POS_PURCHASE_RECEIPT")));
            return statement;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public void insertReceiptItem(
            PosContext context,
            long receiptId,
            PurchaseOrderItemResponse orderItem,
            BigDecimal quantity) {
        jdbcTemplate.update("""
            INSERT INTO pos_purchase_receipt_items
            (company_id, receipt_id, purchase_order_item_id, product_id, quantity_received,
             unit_cost_amount, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            context.companyId(),
            receiptId,
            orderItem.id(),
            orderItem.productId(),
            quantity,
            orderItem.unitCost(),
            PosJsonSupport.toJson(Map.of("source", "POS_PURCHASE_RECEIPT"))
        );
    }

    public void incrementReceivedQuantity(PosContext context, long orderItemId, BigDecimal quantity) {
        jdbcTemplate.update("""
            UPDATE pos_purchase_order_items
            SET received_quantity = received_quantity + ?
            WHERE company_id = ? AND id = ?
            """, quantity, context.companyId(), orderItemId);
    }

    public void upsertInventoryBalance(
            PosContext context,
            PurchaseOrderResponse order,
            PurchaseOrderItemResponse item,
            BigDecimal quantity) {
        jdbcTemplate.update("""
            INSERT INTO sales_inventory_balances
            (company_id, balance_code, product_id, warehouse_id, warehouse_name, available_quantity,
             reserved_quantity, minimum_quantity, unit_cost, uses_inventory, business_unit_id,
             business_id, last_movement_at, metadata_json, created_by_user_id, updated_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, 1, ?, ?, CURRENT_DATE, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              available_quantity = available_quantity + VALUES(available_quantity),
              unit_cost = VALUES(unit_cost),
              uses_inventory = 1,
              last_movement_at = CURRENT_DATE,
              updated_by_user_id = VALUES(updated_by_user_id),
              updated_at = CURRENT_TIMESTAMP
            """,
            context.companyId(),
            "BAL-" + item.productId() + "-" + order.warehouseId(),
            item.productId(),
            order.warehouseId(),
            order.warehouseName(),
            quantity,
            item.unitCost(),
            order.unitId() == null ? null : String.valueOf(order.unitId()),
            order.businessId() == null ? null : String.valueOf(order.businessId()),
            PosJsonSupport.toJson(Map.of("source", "POS_PURCHASE_RECEIPT")),
            context.userId(),
            context.userId()
        );
    }

    public void insertInventoryReceiptMovement(
            PosContext context,
            PurchaseOrderResponse order,
            PurchaseOrderItemResponse item,
            BigDecimal quantity,
            String receiptNumber) {
        jdbcTemplate.update("""
            INSERT INTO sales_inventory_movements
            (company_id, movement_number, group_id, product_id, product_name, product_sku,
             movement_type, quantity, unit_cost, to_warehouse_id, to_warehouse_name,
             supplier_name, business_unit_id, business_id, reason, reference, responsible_name,
             movement_date, status, metadata_json, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, ?, 'PURCHASE_RECEIPT_IN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    CURRENT_DATE, 'posted', ?, ?)
            """,
            context.companyId(),
            receiptNumber + "-" + item.id(),
            order.folio(),
            item.productId(),
            item.productName(),
            item.sku(),
            quantity,
            item.unitCost(),
            order.warehouseId(),
            order.warehouseName(),
            order.providerName(),
            order.unitId() == null ? null : String.valueOf(order.unitId()),
            order.businessId() == null ? null : String.valueOf(order.businessId()),
            "POS purchase receipt",
            receiptNumber,
            context.userName(),
            PosJsonSupport.toJson(Map.of(
                "source", "POS_PURCHASE_RECEIPT",
                "purchaseOrderId", order.id(),
                "purchaseOrderFolio", order.folio(),
                "receiptNumber", receiptNumber
            )),
            context.userId()
        );
    }

    public void refreshOrderReceiveStatus(PosContext context, long orderId) {
        var pending = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM pos_purchase_order_items
            WHERE company_id = ? AND purchase_order_id = ?
              AND received_quantity < quantity
            """, Long.class, context.companyId(), orderId);
        var receivedAny = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM pos_purchase_order_items
            WHERE company_id = ? AND purchase_order_id = ?
              AND received_quantity > 0
            """, Long.class, context.companyId(), orderId);
        var status = pending != null && pending == 0
            ? PurchaseOrderStatus.RECEIVED
            : receivedAny != null && receivedAny > 0
                ? PurchaseOrderStatus.PARTIALLY_RECEIVED
                : PurchaseOrderStatus.SENT;
        updateStatus(context, orderId, status, null);
    }

    public List<SupplierSubmissionResponse> listSupplierSubmissions(
            PosContext context,
            SupplierSubmissionStatus status,
            Long providerId,
            LocalDate dateFrom,
            LocalDate dateTo) {
        var params = scopedParams(context, "provider");
        var sql = new StringBuilder(supplierSubmissionSelect()).append("""
            WHERE submission.company_id = ? AND submission.deleted_at IS NULL
              AND provider.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("provider", context.scope()));
        if (status != null) {
            sql.append(" AND submission.status = ?");
            params.add(status.name());
        }
        if (providerId != null) {
            sql.append(" AND submission.provider_id = ?");
            params.add(providerId);
        }
        if (dateFrom != null) {
            sql.append(" AND DATE(submission.created_at) >= ?");
            params.add(Date.valueOf(dateFrom));
        }
        if (dateTo != null) {
            sql.append(" AND DATE(submission.created_at) <= ?");
            params.add(Date.valueOf(dateTo));
        }
        sql.append(" ORDER BY submission.created_at DESC, submission.id DESC");

        var submissions = jdbcTemplate.query(sql.toString(), this::mapSupplierSubmission, params.toArray());
        return attachSubmissionItems(context, submissions);
    }

    public Optional<SupplierSubmissionResponse> findSupplierSubmission(PosContext context, long submissionId) {
        var params = scopedParams(context, "provider");
        params.add(1, submissionId);
        var submissions = jdbcTemplate.query(supplierSubmissionSelect() + """
            WHERE submission.company_id = ? AND submission.id = ? AND submission.deleted_at IS NULL
              AND provider.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("provider", context.scope()) + """
            """, this::mapSupplierSubmission, params.toArray());
        return attachSubmissionItems(context, submissions).stream().findFirst();
    }

    public Optional<SupplierSubmissionResponse> lockSupplierSubmission(PosContext context, long submissionId) {
        var params = scopedParams(context, "provider");
        params.add(1, submissionId);
        var submissions = jdbcTemplate.query(supplierSubmissionSelect() + """
            WHERE submission.company_id = ? AND submission.id = ? AND submission.deleted_at IS NULL
              AND provider.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("provider", context.scope()) + """
            FOR UPDATE
            """, this::mapSupplierSubmission, params.toArray());
        return attachSubmissionItems(context, submissions).stream().findFirst();
    }

    public long insertSupplierSubmission(
            PosContext context,
            ProviderRef provider,
            SupplierSubmissionCreateRequest request,
            String submissionNumber,
            BigDecimal subtotal,
            BigDecimal tax,
            BigDecimal total,
            List<SupplierSubmissionLineCommand> items) {
        var portalSnapshot = supplierPortalSubmissionSnapshot(
            context, provider, request.portalAccessId());
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_supplier_submissions
                (company_id, provider_id, portal_access_id, historical_portal_access_id,
                 portal_scope_snapshot_json, submission_number, status, currency_code,
                 subtotal_amount, tax_amount, total_amount, submitted_by_name, submitted_by_email,
                 submitted_at, notes, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId());
            statement.setLong(2, provider.id());
            statement.setObject(3, request.portalAccessId());
            statement.setObject(4, request.portalAccessId());
            statement.setString(5, PosJsonSupport.toJson(portalSnapshot));
            statement.setString(6, submissionNumber);
            statement.setString(7, normalizedCurrency(request.currencyCode()));
            statement.setBigDecimal(8, subtotal);
            statement.setBigDecimal(9, tax);
            statement.setBigDecimal(10, total);
            statement.setString(11, trimToNull(request.submittedByName()));
            statement.setString(12, trimToNull(request.submittedByEmail()));
            statement.setString(13, trimToNull(request.notes()));
            var metadata = new LinkedHashMap<String, Object>();
            metadata.put("source", "SUPPLIER_SUBMISSION");
            metadata.put("providerId", provider.id());
            statement.setString(14, PosJsonSupport.toJson(metadata));
            return statement;
        }, keyHolder);

        var submissionId = keyHolder.getKey().longValue();
        for (var item : items) {
            insertSupplierSubmissionItem(context, submissionId, item);
        }
        return submissionId;
    }

    private Map<String, Object> supplierPortalSubmissionSnapshot(
            PosContext context,
            ProviderRef provider,
            Long portalAccessId) {
        var names = jdbcTemplate.query("""
            SELECT company.name AS company_name,
                   unit.name AS unit_name,
                   business.name AS business_name,
                   access.portal_code_hint,
                   access.status AS portal_status
            FROM companies company
            LEFT JOIN units unit
              ON unit.id = ?
             AND (unit.company_id = company.id OR unit.company_id IS NULL)
            LEFT JOIN businesses business
              ON business.id = ?
             AND (business.company_id = company.id OR business.company_id IS NULL)
            LEFT JOIN pos_supplier_portal_access access
              ON access.id = ? AND access.company_id = company.id
            WHERE company.id = ?
            """, (rs, rowNum) -> new SupplierPortalSnapshotNames(
                rs.getString("company_name"),
                rs.getString("unit_name"),
                rs.getString("business_name"),
                rs.getString("portal_code_hint"),
                rs.getString("portal_status")),
            context.scope().unitId(), context.scope().businessId(),
            portalAccessId, context.companyId()).stream().findFirst()
            .orElse(new SupplierPortalSnapshotNames(null, null, null, null, null));
        var snapshot = new LinkedHashMap<String, Object>();
        snapshot.put("company_id", context.companyId());
        snapshot.put("company_name", names.companyName());
        snapshot.put("provider_id", provider.id());
        snapshot.put("provider_name", provider.name());
        snapshot.put("provider_email", provider.email());
        snapshot.put("unit_id", context.scope().unitId());
        snapshot.put("unit_name", names.unitName());
        snapshot.put("business_id", context.scope().businessId());
        snapshot.put("business_name", names.businessName());
        snapshot.put("portal_access_id", portalAccessId);
        snapshot.put("portal_code_hint", names.portalCodeHint());
        snapshot.put("portal_status", names.portalStatus());
        return snapshot;
    }

    public boolean updateSupplierSubmissionStatus(
            PosContext context,
            long submissionId,
            SupplierSubmissionStatus status,
            String reviewNote) {
        return jdbcTemplate.update("""
            UPDATE pos_supplier_submissions
            SET status = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP,
                review_note = COALESCE(NULLIF(?, ''), review_note)
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """,
            status.name(),
            context.userId(),
            trimToNull(reviewNote),
            context.companyId(),
            submissionId
        ) > 0;
    }

    public void resolveSupplierSubmissionItem(
            PosContext context,
            long submissionId,
            long itemId,
            Long resolvedProductId,
            SupplierSubmissionStatus status,
            String reviewNote,
            SupplierCatalogDecision decision) {
        var updated = jdbcTemplate.update("""
            UPDATE pos_supplier_submission_items
            SET product_id = ?, status = ?, review_note = ?,
                metadata_json = JSON_SET(
                    CASE WHEN JSON_TYPE(metadata_json) = 'OBJECT'
                         THEN metadata_json ELSE JSON_OBJECT() END,
                    '$.catalogDecision', ?, '$.resolvedProductId', ?),
                updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND submission_id = ? AND id = ?
            """, resolvedProductId, status.name(), trimToNull(reviewNote), decision.name(),
            resolvedProductId, context.companyId(), submissionId, itemId);
        if (updated != 1) {
            throw com.indice.erp.pos.PosApiException.notFound("Supplier submission item not found.");
        }
    }

    public void insertSupplierCatalogDecision(
            PosContext context,
            SupplierSubmissionResponse submission,
            SupplierSubmissionItemResponse item,
            SupplierCatalogDecision decision,
            Long resolvedProductId,
            BigDecimal previousCatalogCost,
            BigDecimal previousSalePrice,
            BigDecimal approvedSalePrice,
            String reviewNote) {
        jdbcTemplate.update("""
            INSERT INTO pos_supplier_catalog_decisions
              (company_id, submission_id, submission_item_id, provider_id, decision,
               original_product_id, resolved_product_id, supplier_unit_cost,
               previous_catalog_cost, previous_sale_price, approved_sale_price,
               currency_code, review_note, reviewed_by_user_id,
               metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    JSON_OBJECT('source', 'INVENTORY_PURCHASE_REQUEST_REVIEW'))
            """, context.companyId(), submission.id(), item.id(), submission.providerId(), decision.name(),
            item.productId(), resolvedProductId, item.unitCost(), previousCatalogCost,
            previousSalePrice, approvedSalePrice, submission.currencyCode(), trimToNull(reviewNote),
            context.userId());
    }

    public void markSupplierSubmissionConverted(PosContext context, long submissionId, long purchaseOrderId) {
        jdbcTemplate.update("""
            UPDATE pos_supplier_submissions
            SET status = 'CONVERTED_TO_PURCHASE_ORDER',
                converted_purchase_order_id = ?,
                reviewed_by_user_id = COALESCE(reviewed_by_user_id, ?),
                reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP)
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """,
            purchaseOrderId,
            context.userId(),
            context.companyId(),
            submissionId
        );
        jdbcTemplate.update("""
            UPDATE pos_supplier_submission_items
            SET status = 'CONVERTED'
            WHERE company_id = ? AND submission_id = ? AND status <> 'REJECTED'
            """, context.companyId(), submissionId);
    }

    public boolean portalAccessBelongsToProvider(PosContext context, long portalAccessId, long providerId) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM pos_supplier_portal_access
            WHERE company_id = ? AND id = ? AND provider_id = ?
              AND deleted_at IS NULL
              AND status = 'ACTIVE'
            """, Long.class, context.companyId(), portalAccessId, providerId);
        return count != null && count > 0;
    }

    public List<SupplierPortalAccessResponse> listSupplierPortalAccess(PosContext context) {
        var params = scopedParams(context, "provider");
        return jdbcTemplate.query("""
            SELECT access.*, provider.name AS provider_name, provider.email AS provider_email
            FROM pos_supplier_portal_access access
            JOIN finance_providers provider
              ON provider.id = access.provider_id
             AND provider.company_id = access.company_id
            WHERE access.company_id = ? AND access.deleted_at IS NULL
              AND provider.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("provider", context.scope()) + """
            ORDER BY access.created_at DESC, access.id DESC
            """, this::mapSupplierPortalAccess, params.toArray());
    }

    public long insertSupplierPortalAccess(
            PosContext context,
            SupplierPortalAccessRequest request,
            String portalCode,
            String pinHash) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_supplier_portal_access
                (company_id, provider_id, portal_code, portal_code_hash, portal_code_hint,
                 pin_hash, status, allowed_capabilities_json,
                 expires_at, created_by_user_id, updated_by_user_id, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId());
            statement.setLong(2, request.providerId());
            var normalizedCode = normalizePortalCode(portalCode);
            statement.setString(3, secrets.protect(normalizedCode));
            statement.setString(4, secrets.hash(normalizedCode));
            statement.setString(5, secrets.hint(normalizedCode));
            statement.setString(6, pinHash);
            statement.setString(7, normalizePortalStatus(request.status()));
            statement.setString(8, PosJsonSupport.toJson(List.of(
                "procurement.catalog.read",
                "procurement.submission.create",
                "procurement.invoice.document.presign",
                "procurement.invoice.document.register",
                "procurement.invoice.submit"
            )));
            statement.setObject(9, request.expiresAt() == null ? null : java.sql.Timestamp.from(request.expiresAt()));
            statement.setLong(10, context.userId());
            statement.setLong(11, context.userId());
            statement.setString(12, PosJsonSupport.toJson(Map.of("source", "POS_SUPPLIER_PORTAL")));
            return statement;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public Optional<SupplierPortalAccessResponse> findSupplierPortalAccess(PosContext context, long accessId) {
        var params = scopedParams(context, "provider");
        params.add(1, accessId);
        return jdbcTemplate.query("""
            SELECT access.*, provider.name AS provider_name, provider.email AS provider_email
            FROM pos_supplier_portal_access access
            JOIN finance_providers provider
              ON provider.id = access.provider_id
             AND provider.company_id = access.company_id
            WHERE access.company_id = ? AND access.id = ? AND access.deleted_at IS NULL
              AND provider.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("provider", context.scope()) + """
            """, this::mapSupplierPortalAccess, params.toArray()).stream().findFirst();
    }

    public boolean updateSupplierPortalAccessStatus(PosContext context, long accessId, String status) {
        var params = new ArrayList<Object>();
        params.add(normalizePortalStatus(status));
        params.add(context.userId());
        params.add(context.companyId());
        params.add(accessId);
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.update("""
            UPDATE pos_supplier_portal_access access
            JOIN finance_providers provider
              ON provider.id = access.provider_id
             AND provider.company_id = access.company_id
            SET access.status = ?, access.updated_by_user_id = ?,
                access.updated_at = CURRENT_TIMESTAMP
            WHERE access.company_id = ? AND access.id = ? AND access.deleted_at IS NULL
              AND provider.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("provider", context.scope()) + """
            """, params.toArray()) > 0;
    }

    public boolean updateSupplierPortalAccessStatusFromEngine(
            long companyId,
            long accessId,
            String status,
            long userId) {
        return jdbcTemplate.update("""
            UPDATE pos_supplier_portal_access
            SET status = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """, normalizePortalStatus(status), userId, companyId, accessId) > 0;
    }

    public boolean updateSupplierPortalAccessPin(PosContext context, long accessId, String pinHash) {
        var params = new ArrayList<Object>();
        params.add(pinHash);
        params.add(context.userId());
        params.add(context.companyId());
        params.add(accessId);
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.update("""
            UPDATE pos_supplier_portal_access access
            JOIN finance_providers provider
              ON provider.id = access.provider_id
             AND provider.company_id = access.company_id
            SET access.pin_hash = ?, access.updated_by_user_id = ?,
                access.updated_at = CURRENT_TIMESTAMP
            WHERE access.company_id = ? AND access.id = ? AND access.deleted_at IS NULL
              AND provider.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("provider", context.scope()) + """
            """, params.toArray()) > 0;
    }

    public boolean updateSupplierPortalAccessCode(PosContext context, long accessId, String portalCode) {
        var normalizedCode = normalizePortalCode(portalCode);
        var params = new ArrayList<Object>();
        params.add(secrets.protect(normalizedCode));
        params.add(secrets.hash(normalizedCode));
        params.add(secrets.hint(normalizedCode));
        params.add(context.userId());
        params.add(context.companyId());
        params.add(accessId);
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.update("""
            UPDATE pos_supplier_portal_access access
            JOIN finance_providers provider
              ON provider.id = access.provider_id
             AND provider.company_id = access.company_id
            SET access.portal_code = ?, access.portal_code_hash = ?, access.portal_code_hint = ?,
                access.updated_by_user_id = ?, access.updated_at = CURRENT_TIMESTAMP
            WHERE access.company_id = ? AND access.id = ? AND access.deleted_at IS NULL
              AND provider.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("provider", context.scope()), params.toArray()) > 0;
    }

    /**
     * Keeps the legacy per-link verifier aligned with the provider's authoritative
     * personal credential. This is intentionally provider-wide: the PIN belongs to
     * the provider identity, not to an individual kiosk link.
     */
    public int updateSupplierPortalPinsForProvider(
            long companyId,
            long providerId,
            String pinHash,
            long userId) {
        return jdbcTemplate.update("""
            UPDATE pos_supplier_portal_access
            SET pin_hash = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND provider_id = ? AND deleted_at IS NULL
            """, pinHash, userId, companyId, providerId);
    }

    public boolean updateSupplierPortalAccessExpiration(
            PosContext context,
            long accessId,
            Instant expiresAt) {
        var params = new ArrayList<Object>();
        params.add(expiresAt == null ? null : java.sql.Timestamp.from(expiresAt));
        params.add(context.userId());
        params.add(context.companyId());
        params.add(accessId);
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.update("""
            UPDATE pos_supplier_portal_access access
            JOIN finance_providers provider
              ON provider.id = access.provider_id
             AND provider.company_id = access.company_id
            SET access.expires_at = ?, access.updated_by_user_id = ?,
                access.updated_at = CURRENT_TIMESTAMP
            WHERE access.company_id = ? AND access.id = ? AND access.deleted_at IS NULL
              AND provider.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("provider", context.scope()), params.toArray()) > 0;
    }

    public Optional<SupplierPortalAccessRecord> findSupplierPortalAccessByCode(String portalCode) {
        var normalizedCode = normalizePortalCode(portalCode);
        if (normalizedCode.isBlank()) {
            return Optional.empty();
        }
        return jdbcTemplate.query("""
            SELECT access.*, provider.name AS provider_name, provider.email AS provider_email,
                   company.name AS company_name, unit.name AS provider_unit_name,
                   business.name AS provider_business_name,
                   provider.unit_id AS provider_unit_id,
                   provider.business_id AS provider_business_id
            FROM pos_supplier_portal_access access
            JOIN finance_providers provider
             ON provider.id = access.provider_id
             AND provider.company_id = access.company_id
            JOIN companies company ON company.id = access.company_id
            LEFT JOIN units unit ON unit.id = provider.unit_id
              AND (unit.company_id = access.company_id OR unit.company_id IS NULL)
            LEFT JOIN businesses business ON business.id = provider.business_id
              AND (business.company_id = access.company_id OR business.company_id IS NULL)
            WHERE access.portal_code_hash = ?
              AND access.deleted_at IS NULL
              AND provider.deleted_at IS NULL
              AND UPPER(COALESCE(provider.status, 'ACTIVE')) = 'ACTIVE'
            """, (rs, rowNum) -> mapSupplierPortalAccessRecord(rs),
            secrets.hash(normalizedCode)).stream().findFirst();
    }

    public Optional<SupplierPortalAccessRecord> findSupplierPortalAccessByLegacyReference(
            long companyId,
            long accessId) {
        return jdbcTemplate.query("""
            SELECT access.*, provider.name AS provider_name, provider.email AS provider_email,
                   company.name AS company_name, unit.name AS provider_unit_name,
                   business.name AS provider_business_name,
                   provider.unit_id AS provider_unit_id,
                   provider.business_id AS provider_business_id
            FROM pos_supplier_portal_access access
            JOIN finance_providers provider
             ON provider.id = access.provider_id
             AND provider.company_id = access.company_id
            JOIN companies company ON company.id = access.company_id
            LEFT JOIN units unit ON unit.id = provider.unit_id
              AND (unit.company_id = access.company_id OR unit.company_id IS NULL)
            LEFT JOIN businesses business ON business.id = provider.business_id
              AND (business.company_id = access.company_id OR business.company_id IS NULL)
            WHERE access.company_id = ? AND access.id = ? AND access.deleted_at IS NULL
              AND provider.deleted_at IS NULL
              AND UPPER(COALESCE(provider.status, 'ACTIVE')) = 'ACTIVE'
            """, (rs, rowNum) -> mapSupplierPortalAccessRecord(rs),
            companyId, accessId).stream().findFirst();
    }

    public Optional<SupplierPortalAccessRecord> findSupplierPortalAccessForAdministration(
            long companyId,
            long accessId) {
        return jdbcTemplate.query("""
            SELECT access.*, provider.name AS provider_name, provider.email AS provider_email,
                   company.name AS company_name, unit.name AS provider_unit_name,
                   business.name AS provider_business_name,
                   provider.unit_id AS provider_unit_id,
                   provider.business_id AS provider_business_id
            FROM pos_supplier_portal_access access
            JOIN finance_providers provider
              ON provider.id = access.provider_id
             AND provider.company_id = access.company_id
            JOIN companies company ON company.id = access.company_id
            LEFT JOIN units unit ON unit.id = provider.unit_id
              AND (unit.company_id = access.company_id OR unit.company_id IS NULL)
            LEFT JOIN businesses business ON business.id = provider.business_id
              AND (business.company_id = access.company_id OR business.company_id IS NULL)
            WHERE access.company_id = ? AND access.id = ? AND access.deleted_at IS NULL
            """, (rs, rowNum) -> mapSupplierPortalAccessRecord(rs),
            companyId, accessId).stream().findFirst();
    }

    public boolean markSupplierPortalExpired(long accessId) {
        return jdbcTemplate.update("""
            UPDATE pos_supplier_portal_access
            SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
              AND expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP
            """, accessId) > 0;
    }

    public void pauseSupplierPortalForIncompleteScope(long companyId, long accessId) {
        jdbcTemplate.update("""
            UPDATE pos_supplier_portal_access
            SET status = 'PAUSED', updated_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
            """, companyId, accessId);
    }

    public boolean deleteSupplierPortalAccess(PosContext context, long accessId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(accessId);
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.update("""
            DELETE access
            FROM pos_supplier_portal_access access
            JOIN finance_providers provider
              ON provider.id = access.provider_id
             AND provider.company_id = access.company_id
            WHERE access.company_id = ? AND access.id = ? AND access.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("provider", context.scope()), params.toArray()) > 0;
    }

    public void snapshotSupplierPortalSubmissions(
            long companyId,
            long accessId,
            long providerId,
            Long unitId,
            Long businessId) {
        jdbcTemplate.update("""
            UPDATE pos_supplier_submissions
            SET historical_portal_access_id = COALESCE(historical_portal_access_id, ?),
                portal_scope_snapshot_json = COALESCE(
                    portal_scope_snapshot_json,
                    JSON_OBJECT(
                        'company_id', ?, 'provider_id', ?,
                        'unit_id', ?, 'business_id', ?))
            WHERE company_id = ? AND portal_access_id = ?
            """,
            accessId, companyId, providerId,
            unitId, businessId,
            companyId, accessId);
    }

    public boolean supplierPortalCodeExists(long companyId, String portalCode) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM pos_supplier_portal_access
            WHERE portal_code_hash = ?
            """, Long.class, secrets.hash(normalizePortalCode(portalCode)));
        return count != null && count > 0;
    }

    public List<SupplierPortalSecretRecord> findUnprotectedSupplierPortalSecrets(int limit) {
        return jdbcTemplate.query("""
            SELECT id, portal_code
            FROM pos_supplier_portal_access
            WHERE portal_code NOT LIKE 'enc.v1.%'
            ORDER BY id ASC
            LIMIT ?
            """, (rs, rowNum) -> new SupplierPortalSecretRecord(
                rs.getLong("id"), rs.getString("portal_code")), limit);
    }

    public void protectSupplierPortalSecret(
            long accessId,
            String expectedPortalCode,
            String protectedPortalCode) {
        jdbcTemplate.update("""
            UPDATE pos_supplier_portal_access
            SET portal_code = ?
            WHERE id = ? AND portal_code = ?
            """, protectedPortalCode, accessId, expectedPortalCode);
    }

    public List<SupplierPortalCatalogProduct> listSupplierPortalCatalogProducts(long companyId, long providerId) {
        return jdbcTemplate.query("""
            SELECT ps.product_id, product.name AS product_name, product.sku AS product_sku,
                   ps.provider_sku, ps.cost_amount, ps.currency_code,
                   ps.lead_time_days, ps.minimum_order_quantity
            FROM pos_product_suppliers ps
            JOIN sales_products product
              ON product.id = ps.product_id
             AND product.company_id = ps.company_id
            WHERE ps.company_id = ? AND ps.provider_id = ?
              AND ps.deleted_at IS NULL AND ps.is_active = TRUE
              AND product.deleted_at IS NULL
            ORDER BY ps.is_preferred DESC, product.name ASC
            """, (rs, rowNum) -> new SupplierPortalCatalogProduct(
            rs.getLong("product_id"),
            rs.getString("product_name"),
            rs.getString("product_sku"),
            rs.getString("provider_sku"),
            rs.getBigDecimal("cost_amount"),
            rs.getString("currency_code"),
            nullableInteger(rs, "lead_time_days"),
            rs.getBigDecimal("minimum_order_quantity")
        ), companyId, providerId);
    }

    public boolean supplierPortalProductAllowed(long companyId, long providerId, long productId) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM pos_product_suppliers link
            JOIN sales_products product ON product.id = link.product_id
            WHERE link.company_id = ? AND link.provider_id = ? AND link.product_id = ?
              AND link.deleted_at IS NULL AND link.is_active = TRUE
              AND product.company_id = link.company_id AND product.deleted_at IS NULL
            """, Integer.class, companyId, providerId, productId);
        return count != null && count > 0;
    }

    public boolean supplierCompanyProductAllowed(long companyId, long productId) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM sales_products product
            WHERE product.company_id = ? AND product.id = ?
              AND product.deleted_at IS NULL
              AND LOWER(TRIM(product.status)) = 'active'
            """, Integer.class, companyId, productId);
        return count != null && count > 0;
    }

    public boolean supplierQuoteRequestProductAllowed(
            long companyId, long providerId, long quoteRequestId, long productId) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*)
            FROM pos_supplier_quote_requests request
            INNER JOIN pos_supplier_quote_request_items item
              ON item.company_id = request.company_id AND item.quote_request_id = request.id
            INNER JOIN sales_products product
              ON product.company_id = item.company_id AND product.id = item.product_id
            WHERE request.company_id = ? AND request.provider_id = ? AND request.id = ?
              AND item.product_id = ? AND product.deleted_at IS NULL
            """, Integer.class, companyId, providerId, quoteRequestId, productId);
        return count != null && count > 0;
    }

    public String nextSubmissionNumber(PosContext context) {
        var year = LocalDate.now().getYear();
        var prefix = "SUP-" + year + "-";
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_supplier_submissions
            WHERE company_id = ? AND submission_number LIKE ?
            """, Long.class, context.companyId(), prefix + "%");
        return prefix + String.format("%04d", (count == null ? 0 : count) + 1);
    }

    public long insertSupplierInvoice(PosContext context, SupplierInvoiceRequest request) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_supplier_invoices
                (company_id, provider_id, purchase_order_id, invoice_number, invoice_date, due_date,
                 subtotal_amount, tax_amount, total_amount, currency_code, status, document_url,
                 notes, submitted_by_name, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, context.companyId());
            statement.setLong(2, request.providerId());
            statement.setObject(3, request.purchaseOrderId());
            statement.setString(4, request.invoiceNumber().trim());
            statement.setObject(5, request.invoiceDate() == null ? null : Date.valueOf(request.invoiceDate()));
            statement.setObject(6, request.dueDate() == null ? null : Date.valueOf(request.dueDate()));
            statement.setBigDecimal(7, request.subtotalAmount());
            statement.setBigDecimal(8, request.taxAmount());
            statement.setBigDecimal(9, request.totalAmount());
            statement.setString(10, normalizedCurrency(request.currencyCode()));
            statement.setString(11, trimToNull(request.documentUrl()));
            statement.setString(12, trimToNull(request.notes()));
            statement.setString(13, trimToNull(request.submittedByName()));
            statement.setString(14, PosJsonSupport.toJson(Map.of("source", "SUPPLIER_KIOSK")));
            return statement;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public List<SupplierInvoiceResponse> listSupplierInvoices(
            PosContext context,
            SupplierInvoiceStatus status,
            Long providerId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        var sql = new StringBuilder(invoiceSelect()).append("""
            WHERE invoice.company_id = ? AND invoice.deleted_at IS NULL
            """);
        if (status != null) {
            sql.append(" AND invoice.status = ?");
            params.add(status.name());
        }
        if (providerId != null) {
            sql.append(" AND invoice.provider_id = ?");
            params.add(providerId);
        }
        sql.append(" ORDER BY invoice.created_at DESC, invoice.id DESC");
        return jdbcTemplate.query(sql.toString(), this::mapInvoice, params.toArray());
    }

    public Optional<SupplierInvoiceResponse> findSupplierInvoice(PosContext context, long invoiceId) {
        return jdbcTemplate.query(invoiceSelect() + """
            WHERE invoice.company_id = ? AND invoice.id = ? AND invoice.deleted_at IS NULL
            """, this::mapInvoice, context.companyId(), invoiceId).stream().findFirst();
    }

    public List<SupplierInvoiceResponse> lockUnlinkedSupplierInvoicesForOrder(
            PosContext context, long purchaseOrderId) {
        return jdbcTemplate.query(invoiceSelect() + """
            WHERE invoice.company_id = ? AND invoice.purchase_order_id = ?
              AND invoice.expense_id IS NULL AND invoice.deleted_at IS NULL
              AND invoice.status <> 'REJECTED'
            ORDER BY invoice.id
            FOR UPDATE
            """, this::mapInvoice, context.companyId(), purchaseOrderId);
    }

    public void linkSupplierInvoiceExpense(PosContext context, long invoiceId, long expenseId) {
        var updated = jdbcTemplate.update("""
            UPDATE pos_supplier_invoices
            SET expense_id = ?, status = 'MATCHED', updated_at = CURRENT_TIMESTAMP,
                metadata_json = JSON_SET(
                    CASE WHEN JSON_TYPE(metadata_json) = 'OBJECT'
                         THEN metadata_json ELSE JSON_OBJECT() END,
                    '$.expenseId', ?, '$.financeHandoff', 'RECEIPT_MATCHED')
            WHERE company_id = ? AND id = ? AND expense_id IS NULL AND deleted_at IS NULL
            """, expenseId, expenseId, context.companyId(), invoiceId);
        if (updated != 1) {
            throw com.indice.erp.pos.PosApiException.conflict(
                "Supplier invoice has already been handed off to Expenses.");
        }
    }

    public boolean reviewSupplierInvoice(
            PosContext context,
            long invoiceId,
            SupplierInvoiceStatus status,
            String reviewNote) {
        return jdbcTemplate.update("""
            UPDATE pos_supplier_invoices
            SET status = ?, reviewed_by_user_id = ?, reviewed_at = CURRENT_TIMESTAMP, review_note = ?
            WHERE company_id = ? AND id = ? AND deleted_at IS NULL
            """,
            status.name(),
            context.userId(),
            trimToNull(reviewNote),
            context.companyId(),
            invoiceId
        ) > 0;
    }

    public Optional<ProductRef> findProduct(PosContext context, long productId) {
        return jdbcTemplate.query("""
            SELECT product.id, product.sku, product.name, product.cost, product.currency
            FROM sales_products product
            WHERE product.company_id = ? AND product.id = ? AND product.deleted_at IS NULL
            """, (rs, rowNum) -> new ProductRef(
            rs.getLong("id"),
            rs.getString("sku"),
            rs.getString("name"),
            rs.getBigDecimal("cost"),
            rs.getString("currency")
        ), context.companyId(), productId).stream().findFirst();
    }

    public Optional<ProviderRef> findProvider(PosContext context, long providerId) {
        var params = scopedParams(context, "provider");
        params.add(1, providerId);
        return jdbcTemplate.query("""
            SELECT provider.id, provider.name, provider.email, provider.payment_terms_days
            FROM finance_providers provider
            WHERE provider.company_id = ? AND provider.id = ? AND provider.deleted_at IS NULL
              AND provider.status = 'ACTIVE'
              AND """ + PosSqlSupport.scopePredicate("provider", context.scope()) + """
            """, (rs, rowNum) -> new ProviderRef(
            rs.getLong("id"),
            rs.getString("name"),
            rs.getString("email"),
            nullableInteger(rs, "payment_terms_days")
        ), params.toArray()).stream().findFirst();
    }

    public Optional<WarehouseRef> findWarehouse(PosContext context, long warehouseId) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(warehouseId);
        appendWarehouseScopeParams(params, context.scope());
        return jdbcTemplate.query("""
            SELECT warehouse.id, warehouse.name, warehouse.business_unit_id, warehouse.business_id
            FROM sales_inventory_warehouses warehouse
            WHERE warehouse.company_id = ? AND warehouse.id = ? AND warehouse.deleted_at IS NULL
              AND LOWER(COALESCE(warehouse.status, 'active')) = 'active'
              AND """ + warehouseScopePredicate(context.scope()) + """
            """, (rs, rowNum) -> new WarehouseRef(
            rs.getLong("id"),
            rs.getString("name"),
            parseLong(rs.getString("business_unit_id")),
            parseLong(rs.getString("business_id"))
        ), params.toArray()).stream().findFirst();
    }

    public String nextOrderFolio(PosContext context) {
        var year = LocalDate.now().getYear();
        var prefix = "PO-" + year + "-";
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_purchase_orders
            WHERE company_id = ? AND folio LIKE ?
            """, Long.class, context.companyId(), prefix + "%");
        return prefix + String.format("%04d", (count == null ? 0 : count) + 1);
    }

    public String nextReceiptNumber(PosContext context) {
        var year = LocalDate.now().getYear();
        var prefix = "RCV-" + year + "-";
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_purchase_receipts
            WHERE company_id = ? AND receipt_number LIKE ?
            """, Long.class, context.companyId(), prefix + "%");
        return prefix + String.format("%04d", (count == null ? 0 : count) + 1);
    }

    private void insertOrderItem(PosContext context, long orderId, PurchaseOrderLineCommand item) {
        jdbcTemplate.update("""
            INSERT INTO pos_purchase_order_items
            (company_id, purchase_order_id, product_id, sku_snapshot, product_name_snapshot,
             quantity, unit_cost_amount, tax_rate, line_subtotal_amount, line_tax_amount,
             line_total_amount, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            context.companyId(),
            orderId,
            item.productId(),
            item.sku(),
            item.productName(),
            item.quantity(),
            item.unitCost(),
            item.taxRate(),
            item.lineSubtotal(),
            item.lineTax(),
            item.lineTotal(),
            PosJsonSupport.toJson(Map.of("source", "POS_PURCHASE_ORDER"))
        );
    }

    private void insertSupplierSubmissionItem(
            PosContext context,
            long submissionId,
            SupplierSubmissionLineCommand item) {
        jdbcTemplate.update("""
            INSERT INTO pos_supplier_submission_items
            (company_id, submission_id, product_id, provider_sku, product_name,
             product_description, image_url, quantity, unit_cost_amount, tax_rate,
             line_subtotal_amount, line_tax_amount, line_total_amount, lead_time_days,
             minimum_order_quantity, status, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?)
            """,
            context.companyId(),
            submissionId,
            item.productId(),
            item.providerSku(),
            item.productName(),
            item.productDescription(),
            item.imageUrl(),
            item.quantity(),
            item.unitCost(),
            item.taxRate(),
            item.lineSubtotal(),
            item.lineTax(),
            item.lineTotal(),
            item.leadTimeDays(),
            item.minimumOrderQuantity(),
            PosJsonSupport.toJson(Map.of("source", "SUPPLIER_SUBMISSION"))
        );
    }

    private List<SupplierSubmissionResponse> attachSubmissionItems(
            PosContext context,
            List<SupplierSubmissionResponse> submissions) {
        if (submissions.isEmpty()) {
            return submissions;
        }
        var submissionIds = submissions.stream().map(SupplierSubmissionResponse::id).toList();
        var placeholders = String.join(",", submissionIds.stream().map(id -> "?").toList());
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.addAll(submissionIds);
        var items = jdbcTemplate.query("""
            SELECT *
            FROM pos_supplier_submission_items
            WHERE company_id = ? AND submission_id IN (""" + placeholders + """
            )
            ORDER BY id ASC
            """, this::mapSupplierSubmissionItemRow, params.toArray());
        var bySubmission = new LinkedHashMap<Long, List<SupplierSubmissionItemResponse>>();
        for (var item : items) {
            bySubmission.computeIfAbsent(item.submissionId(), ignored -> new ArrayList<>()).add(item.response());
        }
        return submissions.stream()
            .map(submission -> new SupplierSubmissionResponse(
                submission.id(), submission.companyId(), submission.providerId(), submission.providerName(),
                submission.providerEmail(), submission.portalAccessId(), submission.submissionNumber(),
                submission.status(), submission.currencyCode(), submission.subtotalAmount(), submission.taxAmount(),
                submission.totalAmount(), submission.submittedByName(), submission.submittedByEmail(),
                submission.submittedAt(), submission.reviewedByUserId(), submission.reviewedAt(),
                submission.reviewNote(), submission.convertedPurchaseOrderId(), submission.notes(),
                submission.createdAt(), bySubmission.getOrDefault(submission.id(), List.of())
            ))
            .toList();
    }

    private List<PurchaseOrderResponse> attachItems(PosContext context, List<PurchaseOrderResponse> orders) {
        if (orders.isEmpty()) {
            return orders;
        }
        var orderIds = orders.stream().map(PurchaseOrderResponse::id).toList();
        var placeholders = String.join(",", orderIds.stream().map(id -> "?").toList());
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.addAll(orderIds);
        var items = jdbcTemplate.query("""
            SELECT * FROM pos_purchase_order_items
            WHERE company_id = ? AND purchase_order_id IN (""" + placeholders + """
            )
            ORDER BY id ASC
            """, this::mapItem, params.toArray());
        var byOrder = new LinkedHashMap<Long, List<PurchaseOrderItemResponse>>();
        for (var item : items) {
            byOrder.computeIfAbsent(item.orderId(), ignored -> new ArrayList<>()).add(item.response());
        }
        return orders.stream()
            .map(order -> new PurchaseOrderResponse(
                order.id(), order.companyId(), order.unitId(), order.businessId(), order.warehouseId(),
                order.warehouseName(), order.providerId(), order.providerName(), order.providerEmail(),
                order.folio(), order.status(), order.origin(), order.sourceSubmissionId(),
                order.currencyCode(), order.subtotalAmount(), order.taxAmount(), order.totalAmount(),
                order.expectedDate(), order.orderedAt(), order.approvedAt(), order.sentAt(),
                order.receivedAt(), order.cancelledAt(), order.notes(), order.createdAt(),
                byOrder.getOrDefault(order.id(), List.of())
            ))
            .toList();
    }

    private PurchaseOrderResponse mapOrder(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new PurchaseOrderResponse(
            rs.getLong("id"),
            rs.getLong("company_id"),
            PosSqlSupport.nullableLong(rs, "unit_id"),
            PosSqlSupport.nullableLong(rs, "business_id"),
            rs.getLong("warehouse_id"),
            rs.getString("warehouse_name"),
            rs.getLong("provider_id"),
            rs.getString("provider_name"),
            rs.getString("provider_email"),
            rs.getString("folio"),
            PurchaseOrderStatus.valueOf(rs.getString("status")),
            PurchaseOrderOrigin.valueOf(rs.getString("origin")),
            PosSqlSupport.nullableLong(rs, "source_submission_id"),
            rs.getString("currency_code"),
            rs.getBigDecimal("subtotal_amount"),
            rs.getBigDecimal("tax_amount"),
            rs.getBigDecimal("total_amount"),
            localDate(rs, "expected_date"),
            instant(rs, "ordered_at"),
            instant(rs, "approved_at"),
            instant(rs, "sent_at"),
            instant(rs, "received_at"),
            instant(rs, "cancelled_at"),
            rs.getString("notes"),
            instant(rs, "created_at"),
            List.of()
        );
    }

    private OrderItemRow mapItem(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        var quantity = rs.getBigDecimal("quantity");
        var received = rs.getBigDecimal("received_quantity");
        var response = new PurchaseOrderItemResponse(
            rs.getLong("id"),
            rs.getLong("product_id"),
            rs.getString("sku_snapshot"),
            rs.getString("product_name_snapshot"),
            quantity,
            received,
            quantity.subtract(received),
            rs.getBigDecimal("unit_cost_amount"),
            rs.getBigDecimal("tax_rate"),
            rs.getBigDecimal("line_subtotal_amount"),
            rs.getBigDecimal("line_tax_amount"),
            rs.getBigDecimal("line_total_amount")
        );
        return new OrderItemRow(rs.getLong("purchase_order_id"), response);
    }

    private SupplierSubmissionResponse mapSupplierSubmission(java.sql.ResultSet rs, int rowNum)
            throws java.sql.SQLException {
        return new SupplierSubmissionResponse(
            rs.getLong("id"),
            rs.getLong("company_id"),
            rs.getLong("provider_id"),
            rs.getString("provider_name"),
            rs.getString("provider_email"),
            PosSqlSupport.nullableLong(rs, "portal_access_id"),
            rs.getString("submission_number"),
            SupplierSubmissionStatus.valueOf(rs.getString("status")),
            rs.getString("currency_code"),
            rs.getBigDecimal("subtotal_amount"),
            rs.getBigDecimal("tax_amount"),
            rs.getBigDecimal("total_amount"),
            rs.getString("submitted_by_name"),
            rs.getString("submitted_by_email"),
            instant(rs, "submitted_at"),
            PosSqlSupport.nullableLong(rs, "reviewed_by_user_id"),
            instant(rs, "reviewed_at"),
            rs.getString("review_note"),
            PosSqlSupport.nullableLong(rs, "converted_purchase_order_id"),
            rs.getString("notes"),
            instant(rs, "created_at"),
            List.of()
        );
    }

    private SupplierPortalAccessResponse mapSupplierPortalAccess(java.sql.ResultSet rs, int rowNum)
            throws java.sql.SQLException {
        var portalCode = revealPortalCodeForListing(rs.getString("portal_code"));
        return new SupplierPortalAccessResponse(
            rs.getLong("id"),
            rs.getLong("provider_id"),
            rs.getString("provider_name"),
            rs.getString("provider_email"),
            portalCode,
            portalCode == null ? "" : "/supplier-portal/" + portalCode,
            rs.getString("status"),
            instant(rs, "expires_at"),
            instant(rs, "created_at"),
            instant(rs, "updated_at"),
            false
        );
    }

    /**
     * Administrative lists must remain available when a legacy credential was
     * encrypted with a retired local key. Authentication paths still use the
     * strict mapper below and never accept an unreadable credential.
     */
    private String revealPortalCodeForListing(String storedPortalCode) {
        try {
            return secrets.reveal(storedPortalCode);
        } catch (IllegalStateException | IllegalArgumentException unreadableCredential) {
            return null;
        }
    }

    private SupplierPortalAccessRecord mapSupplierPortalAccessRecord(java.sql.ResultSet rs)
            throws java.sql.SQLException {
        return new SupplierPortalAccessRecord(
            rs.getLong("id"),
            rs.getLong("company_id"),
            rs.getString("company_name"),
            rs.getLong("provider_id"),
            rs.getString("provider_name"),
            rs.getString("provider_email"),
            secrets.reveal(rs.getString("portal_code")),
            rs.getString("pin_hash"),
            rs.getString("status"),
            instant(rs, "expires_at"),
            rs.getString("allowed_capabilities_json"),
            PosSqlSupport.nullableLong(rs, "provider_unit_id"),
            rs.getString("provider_unit_name"),
            PosSqlSupport.nullableLong(rs, "provider_business_id"),
            rs.getString("provider_business_name")
        );
    }

    private SupplierSubmissionItemRow mapSupplierSubmissionItemRow(java.sql.ResultSet rs, int rowNum)
            throws java.sql.SQLException {
        var response = new SupplierSubmissionItemResponse(
            rs.getLong("id"),
            PosSqlSupport.nullableLong(rs, "product_id"),
            rs.getString("provider_sku"),
            rs.getString("product_name"),
            rs.getString("product_description"),
            rs.getString("image_url"),
            rs.getBigDecimal("quantity"),
            rs.getBigDecimal("unit_cost_amount"),
            rs.getBigDecimal("tax_rate"),
            rs.getBigDecimal("line_subtotal_amount"),
            rs.getBigDecimal("line_tax_amount"),
            rs.getBigDecimal("line_total_amount"),
            nullableInteger(rs, "lead_time_days"),
            rs.getBigDecimal("minimum_order_quantity"),
            SupplierSubmissionStatus.fromItemStorageValue(rs.getString("status")),
            rs.getString("review_note")
        );
        return new SupplierSubmissionItemRow(rs.getLong("submission_id"), response);
    }

    private SupplierInvoiceResponse mapInvoice(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
        return new SupplierInvoiceResponse(
            rs.getLong("id"),
            rs.getLong("provider_id"),
            rs.getString("provider_name"),
            PosSqlSupport.nullableLong(rs, "purchase_order_id"),
            rs.getString("purchase_order_folio"),
            rs.getString("invoice_number"),
            localDate(rs, "invoice_date"),
            localDate(rs, "due_date"),
            rs.getBigDecimal("subtotal_amount"),
            rs.getBigDecimal("tax_amount"),
            rs.getBigDecimal("total_amount"),
            rs.getString("currency_code"),
            SupplierInvoiceStatus.valueOf(rs.getString("status")),
            rs.getString("document_url"),
            rs.getString("notes"),
            rs.getString("submitted_by_name"),
            PosSqlSupport.nullableLong(rs, "reviewed_by_user_id"),
            instant(rs, "reviewed_at"),
            rs.getString("review_note"),
            instant(rs, "created_at")
        );
    }

    private String orderSelect() {
        return """
            SELECT po.*, warehouse.name AS warehouse_name,
                   provider.name AS provider_name, provider.email AS provider_email
            FROM pos_purchase_orders po
            JOIN sales_inventory_warehouses warehouse
              ON warehouse.id = po.warehouse_id
             AND warehouse.company_id = po.company_id
            JOIN finance_providers provider
              ON provider.id = po.provider_id
             AND provider.company_id = po.company_id
            """;
    }

    private String supplierSubmissionSelect() {
        return """
            SELECT submission.*, provider.name AS provider_name, provider.email AS provider_email
            FROM pos_supplier_submissions submission
            JOIN finance_providers provider
              ON provider.id = submission.provider_id
             AND provider.company_id = submission.company_id
            """;
    }

    private String invoiceSelect() {
        return """
            SELECT invoice.*, provider.name AS provider_name, po.folio AS purchase_order_folio
            FROM pos_supplier_invoices invoice
            JOIN finance_providers provider
              ON provider.id = invoice.provider_id
             AND provider.company_id = invoice.company_id
            LEFT JOIN pos_purchase_orders po
              ON po.id = invoice.purchase_order_id
             AND po.company_id = invoice.company_id
            """;
    }

    private ArrayList<Object> scopedParams(PosContext context, String alias) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        PosSqlSupport.appendScopeParams(params, context.scope());
        return params;
    }

    private String warehouseScopePredicate(PosScope scope) {
        var predicate = switch (scope.type()) {
            case CORPORATE_OFFICE -> "1 = 1";
            case UNIT_HEADQUARTERS -> "(CAST(warehouse.business_unit_id AS UNSIGNED) = ? OR CAST(warehouse.business_id AS UNSIGNED) IN "
                + "(SELECT id FROM businesses WHERE unit_id = ?))";
            case BUSINESS_OFFICE -> "CAST(warehouse.business_id AS UNSIGNED) = ?";
        };
        return " " + predicate + " ";
    }

    private void appendWarehouseScopeParams(List<Object> params, PosScope scope) {
        switch (scope.type()) {
            case CORPORATE_OFFICE -> {
            }
            case UNIT_HEADQUARTERS -> {
                params.add(scope.unitId());
                params.add(scope.unitId());
            }
            case BUSINESS_OFFICE -> params.add(scope.businessId());
        }
    }

    private Integer nullableInteger(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getInt(column);
        return rs.wasNull() ? null : value;
    }

    private Instant instant(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    private LocalDate localDate(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getDate(column);
        return value == null ? null : value.toLocalDate();
    }

    private Long parseLong(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String normalizedCurrency(String value) {
        return value == null || value.isBlank() ? "MXN" : value.trim().toUpperCase();
    }

    private String normalizePortalStatus(String value) {
        return value == null || value.isBlank() ? "ACTIVE" : value.trim().toUpperCase();
    }

    private String normalizePortalCode(String value) {
        return value == null ? "" : value.trim().toUpperCase();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        var trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    public record ProductRef(Long id, String sku, String name, BigDecimal cost, String currencyCode) {
    }

    public record ProviderRef(Long id, String name, String email, Integer paymentTermsDays) {
    }

    public record WarehouseRef(Long id, String name, Long unitId, Long businessId) {
    }

    public record SupplierPortalAccessRecord(
        Long id,
        Long companyId,
        String companyName,
        Long providerId,
        String providerName,
        String providerEmail,
        String portalCode,
        String pinHash,
        String status,
        Instant expiresAt,
        String allowedCapabilitiesJson,
        Long unitId,
        String unitName,
        Long businessId,
        String businessName
    ) {
    }

    public record SupplierPortalSecretRecord(Long id, String portalCode) {
    }

    private record SupplierPortalSnapshotNames(
        String companyName,
        String unitName,
        String businessName,
        String portalCodeHint,
        String portalStatus
    ) {
    }

    public record PurchaseOrderLineCommand(
        Long productId,
        String sku,
        String productName,
        BigDecimal quantity,
        BigDecimal unitCost,
        BigDecimal taxRate,
        BigDecimal lineSubtotal,
        BigDecimal lineTax,
        BigDecimal lineTotal
    ) {
    }

    public record SupplierSubmissionLineCommand(
        Long productId,
        String providerSku,
        String productName,
        String productDescription,
        String imageUrl,
        BigDecimal quantity,
        BigDecimal unitCost,
        BigDecimal taxRate,
        BigDecimal lineSubtotal,
        BigDecimal lineTax,
        BigDecimal lineTotal,
        Integer leadTimeDays,
        BigDecimal minimumOrderQuantity
    ) {
    }

    private record OrderItemRow(Long orderId, PurchaseOrderItemResponse response) {
    }

    private record SupplierSubmissionItemRow(Long submissionId, SupplierSubmissionItemResponse response) {
    }
}
