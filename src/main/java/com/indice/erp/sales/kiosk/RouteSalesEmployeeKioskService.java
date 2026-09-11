package com.indice.erp.sales.kiosk;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.treasury.TreasuryAccount;
import com.indice.erp.finance.treasury.TreasuryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.sales.SalesService;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.CreateContactRequest;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.CreateSaleRequest;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.FiscalProfileRequest;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.PaymentEvidencePresignRequest;
import com.indice.erp.sales.kiosk.RouteSalesKioskDtos.PaymentEvidenceRegisterRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sales-owned use cases for field sellers operating from the authenticated employee kiosk.
 * Browser input selects records and quantities only; prices, taxes, seller, scope and totals are
 * rebuilt from authoritative company data before the Sales aggregate is created.
 */
@Service
public class RouteSalesEmployeeKioskService {

    public static final String KIOSK_TYPE = "employee_route_sales";
    private static final Set<String> PAYMENT_METHODS = Set.of("cash", "card", "transfer", "credit");

    private final JdbcTemplate jdbc;
    private final SalesService sales;
    private final TreasuryService treasury;

    public RouteSalesEmployeeKioskService(JdbcTemplate jdbc, SalesService sales, TreasuryService treasury) {
        this.jdbc = jdbc;
        this.sales = sales;
        this.treasury = treasury;
    }

    @Transactional
    public Map<String, Object> bootstrap(KioskResolvedDefinition definition, long userId) {
        var seller = requireSellerScope(definition, userId);
        var contacts = contacts(definition.companyId(), seller);
        var warehouses = warehouses(definition.companyId());
        var products = products(definition.companyId());
        var balances = inventoryBalances(definition.companyId(), warehouses);
        var recentSales = recentSales(definition.companyId(), seller);
        var paymentAccounts = treasury.listBankCollectionDestinations(definition.companyId()).stream()
            .map(this::paymentAccountResponse)
            .toList();

        var result = new LinkedHashMap<String, Object>();
        result.put("tool_key", "employee.route-sales@1");
        result.put("kiosk_type", KIOSK_TYPE);
        result.put("seller", sellerMap(seller));
        result.put("scope", scopeMap(seller));
        result.put("contacts", contacts);
        result.put("products", products);
        result.put("warehouses", warehouses);
        result.put("inventory_balances", balances);
        result.put("payment_accounts", paymentAccounts);
        result.put("recent_sales", recentSales);
        result.put("summary", summary(recentSales));
        result.put("payment_methods", List.of(
            option("cash", "Efectivo", "Cobro bajo tu custodia hasta entregarlo."),
            option("card", "Tarjeta", "Confirma el cobro en una cuenta bancaria."),
            option("transfer", "Transferencia", "Confirma el depósito en una cuenta bancaria."),
            option("credit", "Crédito", "Cierra la venta y la deja pendiente de cobranza.")));
        result.put("settlement_policy", "METHOD_AWARE_TREASURY");
        return Collections.unmodifiableMap(result);
    }

    @Transactional
    public Map<String, Object> createContact(
            KioskResolvedDefinition definition,
            long userId,
            CreateContactRequest request) {
        var seller = requireSellerScope(definition, userId);
        var payload = new LinkedHashMap<String, Object>();
        payload.put("companyName", requiredText(request.companyName(), "El nombre del cliente es obligatorio."));
        payload.put("contactPerson", nullableText(request.contactPerson()));
        payload.put("phone", nullableText(request.phone()));
        payload.put("email", nullableText(request.email()));
        applyFiscalProfile(payload, request.fiscal());
        payload.put("source", "Route sales kiosk");
        payload.put("status", "Active");
        payload.put("ownerUserCompanyId", seller.userCompanyId());
        payload.put("ownerName", seller.name());
        payload.put("unitId", seller.unitId());
        payload.put("businessId", seller.businessId());
        payload.put("metadata", Map.of(
            "source", "EMPLOYEE_ROUTE_SALES",
            "kioskDefinitionId", definition.id()));
        var saved = sales.create(definition.companyId(), userId, "contacts", payload);
        return Map.of("contact", contactResponse(saved));
    }

    @Transactional
    public Map<String, Object> createSale(
            KioskResolvedDefinition definition,
            long userId,
            CreateSaleRequest request) {
        var seller = requireSellerScope(definition, userId);
        var contact = requireOwnedContact(definition.companyId(), seller, request.contactId());
        var warehouse = requireCompanyWarehouse(definition.companyId(), request.warehouseId());
        var paymentMethod = normalizePaymentMethod(request.paymentMethod());
        var paymentReference = nullableText(request.paymentReference());
        if (Set.of("card", "transfer").contains(paymentMethod) && paymentReference == null) {
            throw new IllegalArgumentException("La referencia del cobro es obligatoria para tarjeta o transferencia.");
        }

        var requestedQuantities = request.items().stream().collect(Collectors.toMap(
            item -> item.productId(),
            item -> item.quantity(),
            BigDecimal::add,
            LinkedHashMap::new));
        var authoritativeProducts = requireProductsForSale(
            definition.companyId(), requestedQuantities.keySet());
        var currency = singleCurrency(authoritativeProducts.values());
        var warehouseUnitId = longOrNull(warehouse.unitId());
        var warehouseBusinessId = longOrNull(warehouse.businessId());
        var saleUnitId = warehouseUnitId != null ? warehouseUnitId : seller.unitId();
        var saleBusinessId = warehouseBusinessId != null ? warehouseBusinessId : seller.businessId();
        var electronicPayment = Set.of("card", "transfer").contains(paymentMethod);
        TreasuryAccount paymentAccount = null;
        if (electronicPayment) {
            if (request.paymentAccountId() == null) {
                throw new IllegalArgumentException(
                    "Selecciona la cuenta bancaria donde se recibió el cobro.");
            }
            try {
                paymentAccount = treasury.requireEligibleAccount(
                    definition.companyId(), request.paymentAccountId(), currency,
                    saleUnitId, saleBusinessId, Set.of("BANK"));
            } catch (FinanceApiException failure) {
                throw new IllegalArgumentException(
                    "La cuenta bancaria ya no está activa o no corresponde a la moneda y alcance de la venta.",
                    failure);
            }
        } else if (request.paymentAccountId() != null) {
            throw new IllegalArgumentException(
                "La cuenta bancaria destino sólo aplica a cobros con tarjeta o transferencia.");
        }
        var lines = new ArrayList<Map<String, Object>>();
        var hasStockItems = false;
        for (var entry : requestedQuantities.entrySet()) {
            var product = authoritativeProducts.get(entry.getKey());
            var stockTracked = !"SERVICE".equalsIgnoreCase(product.type());
            hasStockItems = hasStockItems || stockTracked;
            var line = new LinkedHashMap<String, Object>();
            line.put("productId", product.id());
            line.put("productName", product.name());
            line.put("productSku", product.sku());
            line.put("quantity", entry.getValue());
            line.put("unitPrice", product.price());
            line.put("discountPercent", BigDecimal.ZERO);
            line.put("taxPercent", product.taxPercent());
            line.put("warehouseId", warehouse.id());
            line.put("businessUnitId", warehouse.unitId());
            line.put("businessId", warehouse.businessId());
            line.put("availabilityStatus", stockTracked ? "available" : "not_required");
            lines.add(Collections.unmodifiableMap(line));
        }

        var customFields = new LinkedHashMap<String, Object>();
        customFields.put("warehouseId", String.valueOf(warehouse.id()));
        customFields.put("warehouseName", warehouse.name());
        customFields.put("businessUnitId", warehouse.unitId());
        customFields.put("businessUnitName", warehouse.unitName());
        customFields.put("businessId", warehouse.businessId());
        customFields.put("businessName", warehouse.businessName());
        customFields.put("routeSettlementMode", settlementMode(paymentMethod));
        if (paymentAccount != null) {
            customFields.put("paymentAccountId", paymentAccount.id());
            customFields.put("paymentAccountName", paymentAccount.name());
            customFields.put("paymentAccountCurrency", paymentAccount.currencyCode());
        }

        var payload = new LinkedHashMap<String, Object>();
        payload.put("contactId", contact.id());
        payload.put("customerName", contact.name());
        payload.put("unitId", saleUnitId);
        payload.put("businessId", saleBusinessId);
        payload.put("currency", currency);
        payload.put("paymentMethod", paymentMethod);
        payload.put("paymentReference", paymentReference(paymentMethod, paymentReference));
        payload.put("paymentEvidenceStatus", "credit".equals(paymentMethod) ? "not_required" : "missing");
        payload.put("commercialStatus", "approved");
        payload.put("financeStatus", electronicPayment ? "approved" : "pending");
        payload.put("inventoryStatus", hasStockItems ? "approved" : "not_required");
        payload.put("inventoryMovementStatus", hasStockItems ? "pending" : "not_required");
        payload.put("deliveryStatus", request.deliveredNow() ? "delivered" : "pending");
        payload.put("commissionStatus", "calculated");
        payload.put("saleLines", lines);
        payload.put("notes", nullableText(request.notes()));
        payload.put("customFields", customFields);
        payload.put("metadata", Map.of(
            "source", "EMPLOYEE_ROUTE_SALES",
            "kioskDefinitionId", definition.id(),
            "settlementPolicy", "METHOD_AWARE_TREASURY"));

        var saved = sales.create(definition.companyId(), userId, "sales", payload);
        if (hasStockItems && !"completed".equalsIgnoreCase(text(saved.get("inventoryMovementStatus")))) {
            // Sales intentionally permits a back-office record to survive an inventory warning.
            // A route seller promises immediate completion, so the outer transaction rolls it back.
            throw new IllegalArgumentException(
                "No fue posible descontar todo el inventario. Revisa existencias y almacén antes de reintentar.");
        }
        var response = new LinkedHashMap<String, Object>();
        response.put("sale", saleResponse(saved));
        response.put("settlement_status", settlementStatus(paymentMethod));
        response.put("message", settlementMessage(paymentMethod));
        return Collections.unmodifiableMap(response);
    }

    @Transactional
    public Map<String, Object> createPaymentEvidenceUpload(
            KioskResolvedDefinition definition,
            long userId,
            PaymentEvidencePresignRequest request) {
        var seller = requireSellerScope(definition, userId);
        requireOwnedSale(definition.companyId(), seller, request.saleId());
        return sales.createSalePaymentEvidenceUploadForSale(
            definition.companyId(), request.saleId(), paymentEvidencePayload(request));
    }

    @Transactional
    public Map<String, Object> registerPaymentEvidence(
            KioskResolvedDefinition definition,
            long userId,
            PaymentEvidenceRegisterRequest request) {
        var seller = requireSellerScope(definition, userId);
        requireOwnedSale(definition.companyId(), seller, request.saleId());
        var evidence = sales.registerSalePaymentEvidenceForSale(
            definition.companyId(), userId, request.saleId(), paymentEvidencePayload(request));
        return Map.of("evidence", evidence);
    }

    private SellerScope requireSellerScope(KioskResolvedDefinition definition, long userId) {
        var rows = jdbc.query(
            """
                SELECT membership.id AS user_company_id,
                       COALESCE(NULLIF(TRIM(profile.full_name), ''),
                                NULLIF(TRIM(account.full_name), ''), account.email) AS seller_name,
                       account.email,
                       work.unit_id, work.business_id,
                       unit_row.name AS unit_name,
                       business_row.name AS business_name
                FROM user_companies membership
                INNER JOIN users account ON account.id = membership.user_id
                LEFT JOIN user_profiles profile ON profile.user_id = account.id
                LEFT JOIN user_work_profiles work
                  ON work.company_id = membership.company_id
                 AND work.user_company_id = membership.id
                 AND LOWER(COALESCE(work.status, 'active')) IN ('active', 'activo')
                LEFT JOIN units unit_row ON unit_row.id = work.unit_id
                LEFT JOIN businesses business_row ON business_row.id = work.business_id
                WHERE membership.company_id = ? AND membership.user_id = ?
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                ORDER BY work.id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> new SellerScope(
                rs.getLong("user_company_id"), userId,
                rs.getString("seller_name"), rs.getString("email"),
                effectiveScope(definition.unitId(), rs.getObject("unit_id", Long.class), "unidad"),
                effectiveScope(definition.businessId(), rs.getObject("business_id", Long.class), "negocio"),
                rs.getString("unit_name"), rs.getString("business_name")),
            definition.companyId(), userId);
        if (rows.isEmpty()) {
            throw new SecurityException("El vendedor no está activo en esta empresa.");
        }
        return rows.getFirst();
    }

    private Long effectiveScope(Long definitionScope, Long employeeScope, String label) {
        if (definitionScope != null && employeeScope != null && !definitionScope.equals(employeeScope)) {
            throw new SecurityException("El kiosco está fuera del alcance de " + label + " del vendedor.");
        }
        return definitionScope != null ? definitionScope : employeeScope;
    }

    private List<Map<String, Object>> contacts(long companyId, SellerScope seller) {
        return jdbc.query(
            """
                SELECT id, contact_code, company_name, contact_person, phone, email, status,
                       fiscal_country, fiscal_legal_name, fiscal_tax_id, fiscal_registry_id,
                       fiscal_address_line1, fiscal_address_line2, fiscal_city, fiscal_state,
                       fiscal_postal_code, fiscal_email, fiscal_regime, fiscal_notes,
                       JSON_UNQUOTE(JSON_EXTRACT(fiscal_metadata_json, '$.cfdiUse')) AS fiscal_cfdi_use
                FROM sales_contacts
                WHERE company_id = ? AND owner_user_company_id = ? AND deleted_at IS NULL
                  AND (? IS NULL OR unit_id = ?)
                  AND (? IS NULL OR business_id = ?)
                  AND LOWER(COALESCE(status, 'active')) NOT IN ('inactive', 'inactivo')
                ORDER BY updated_at DESC, id DESC
                LIMIT 250
                """,
            (rs, rowNum) -> row(
                "id", rs.getLong("id"),
                "code", rs.getString("contact_code"),
                "name", rs.getString("company_name"),
                "contact_person", rs.getString("contact_person"),
                "phone", rs.getString("phone"),
                "email", rs.getString("email"),
                "fiscal_country", rs.getString("fiscal_country"),
                "fiscal_legal_name", rs.getString("fiscal_legal_name"),
                "fiscal_tax_id", rs.getString("fiscal_tax_id"),
                "fiscal_registry_id", rs.getString("fiscal_registry_id"),
                "fiscal_address_line1", rs.getString("fiscal_address_line1"),
                "fiscal_address_line2", rs.getString("fiscal_address_line2"),
                "fiscal_city", rs.getString("fiscal_city"),
                "fiscal_state", rs.getString("fiscal_state"),
                "fiscal_postal_code", rs.getString("fiscal_postal_code"),
                "fiscal_email", rs.getString("fiscal_email"),
                "fiscal_regime", rs.getString("fiscal_regime"),
                "fiscal_cfdi_use", rs.getString("fiscal_cfdi_use"),
                "fiscal_notes", rs.getString("fiscal_notes"),
                "status", rs.getString("status")),
            companyId, seller.userCompanyId(), seller.unitId(), seller.unitId(),
            seller.businessId(), seller.businessId());
    }

    private List<Map<String, Object>> products(long companyId) {
        return jdbc.query(
            """
                SELECT id, product_code, sku, name, description, category, type,
                       price, UPPER(currency) AS currency, tax_category, inventory_ready,
                       JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.imageUrl')) AS image_url,
                       JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.imageAlt')) AS image_alt
                FROM sales_products
                WHERE company_id = ? AND deleted_at IS NULL
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                  AND LOWER(REPLACE(COALESCE(visibility, ''), ' ', '_')) IN ('commercial', 'pos_ready')
                  AND price IS NOT NULL AND price > 0
                ORDER BY name ASC, id ASC
                LIMIT 1000
                """,
            (rs, rowNum) -> row(
                "id", rs.getLong("id"),
                "code", rs.getString("product_code"),
                "sku", rs.getString("sku"),
                "name", rs.getString("name"),
                "description", rs.getString("description"),
                "category", rs.getString("category"),
                "type", rs.getString("type"),
                "price", rs.getBigDecimal("price"),
                "currency", rs.getString("currency"),
                "tax_category", rs.getString("tax_category"),
                "tax_percent", taxPercent(rs.getString("tax_category")),
                "image_url", rs.getString("image_url"),
                "image_alt", rs.getString("image_alt"),
                "inventory_ready", rs.getBoolean("inventory_ready")),
            companyId);
    }

    private List<Map<String, Object>> warehouses(long companyId) {
        return jdbc.query(
            """
                SELECT id, warehouse_code, name, type, business_unit_id, business_unit_name,
                       business_id, business_name
                FROM sales_inventory_warehouses
                WHERE company_id = ? AND deleted_at IS NULL
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                ORDER BY name ASC, id ASC
                """,
            (rs, rowNum) -> row(
                "id", rs.getLong("id"),
                "code", rs.getString("warehouse_code"),
                "name", rs.getString("name"),
                "type", rs.getString("type"),
                "unit_id", rs.getString("business_unit_id"),
                "unit_name", rs.getString("business_unit_name"),
                "business_id", rs.getString("business_id"),
                "business_name", rs.getString("business_name")),
            companyId);
    }

    private List<Map<String, Object>> inventoryBalances(
            long companyId,
            List<Map<String, Object>> warehouses) {
        if (warehouses.isEmpty()) return List.of();
        var warehouseIds = warehouses.stream()
            .map(item -> ((Number) item.get("id")).longValue())
            .toList();
        var placeholders = String.join(",", Collections.nCopies(warehouseIds.size(), "?"));
        var arguments = new ArrayList<Object>();
        arguments.add(companyId);
        arguments.addAll(warehouseIds);
        return jdbc.query(
            """
                SELECT product_id, warehouse_id, available_quantity, reserved_quantity, uses_inventory
                FROM sales_inventory_balances
                WHERE company_id = ? AND deleted_at IS NULL
                  AND warehouse_id IN (%s)
                ORDER BY product_id, warehouse_id
                """.formatted(placeholders),
            (rs, rowNum) -> row(
                "product_id", rs.getLong("product_id"),
                "warehouse_id", rs.getLong("warehouse_id"),
                "available_quantity", rs.getBigDecimal("available_quantity"),
                "reserved_quantity", rs.getBigDecimal("reserved_quantity"),
                "uses_inventory", rs.getBoolean("uses_inventory")),
            arguments.toArray());
    }

    private List<Map<String, Object>> recentSales(long companyId, SellerScope seller) {
        return jdbc.query(
            """
                SELECT id, sale_number, customer_name, sale_date, total_amount, UPPER(currency) currency,
                       payment_method, payment_reference, commercial_status, finance_status,
                       inventory_movement_status, delivery_status, payment_evidence_status,
                       CAST(JSON_UNQUOTE(JSON_EXTRACT(custom_fields_json, '$.paymentAccountId')) AS UNSIGNED)
                           AS payment_account_id,
                       JSON_UNQUOTE(JSON_EXTRACT(custom_fields_json, '$.paymentAccountName'))
                           AS payment_account_name,
                       (SELECT COUNT(*) FROM sales_files file
                         WHERE file.company_id = sale.company_id
                           AND file.entity_type = 'sale' AND file.entity_id = sale.id
                           AND file.file_kind = 'payment_evidence' AND file.deleted_at IS NULL) AS evidence_count
                FROM sales_records sale
                WHERE sale.company_id = ? AND sale.seller_user_company_id = ?
                  AND sale.deleted_at IS NULL
                ORDER BY sale.sale_date DESC, sale.id DESC
                LIMIT 50
                """,
            (rs, rowNum) -> {
                var paymentAccountId = rs.getLong("payment_account_id");
                var hasPaymentAccount = !rs.wasNull();
                return row(
                    "id", rs.getLong("id"),
                    "sale_number", rs.getString("sale_number"),
                    "customer_name", rs.getString("customer_name"),
                    "sale_date", rs.getObject("sale_date") == null ? null : rs.getObject("sale_date").toString(),
                    "total_amount", rs.getBigDecimal("total_amount"),
                    "currency", rs.getString("currency"),
                    "payment_method", rs.getString("payment_method"),
                    "payment_reference", rs.getString("payment_reference"),
                    "payment_account_id", hasPaymentAccount ? paymentAccountId : null,
                    "payment_account_name", rs.getString("payment_account_name"),
                    "commercial_status", rs.getString("commercial_status"),
                    "finance_status", rs.getString("finance_status"),
                    "inventory_status", rs.getString("inventory_movement_status"),
                    "delivery_status", rs.getString("delivery_status"),
                    "payment_evidence_status", rs.getString("payment_evidence_status"),
                    "settlement_status", settlementStatus(
                        rs.getString("payment_method"), rs.getString("finance_status")),
                    "evidence_count", rs.getLong("evidence_count"));
            },
            companyId, seller.userCompanyId());
    }

    private long requireOwnedSale(long companyId, SellerScope seller, long saleId) {
        var rows = jdbc.query(
            """
                SELECT id
                FROM sales_records
                WHERE company_id = ? AND id = ? AND seller_user_company_id = ?
                  AND deleted_at IS NULL
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            companyId, saleId, seller.userCompanyId());
        if (rows.isEmpty()) throw new SecurityException("La venta no pertenece al vendedor autenticado.");
        return rows.getFirst();
    }

    private Contact requireOwnedContact(long companyId, SellerScope seller, long contactId) {
        var rows = jdbc.query(
            """
                SELECT id, company_name
                FROM sales_contacts
                WHERE company_id = ? AND id = ? AND owner_user_company_id = ? AND deleted_at IS NULL
                  AND (? IS NULL OR unit_id = ?)
                  AND (? IS NULL OR business_id = ?)
                  AND LOWER(COALESCE(status, 'active')) NOT IN ('inactive', 'inactivo')
                FOR UPDATE
                """,
            (rs, rowNum) -> new Contact(rs.getLong("id"), rs.getString("company_name")),
            companyId, contactId, seller.userCompanyId(), seller.unitId(), seller.unitId(),
            seller.businessId(), seller.businessId());
        if (rows.isEmpty()) throw new SecurityException("El cliente no pertenece a la cartera del vendedor.");
        return rows.getFirst();
    }

    private Warehouse requireCompanyWarehouse(long companyId, long warehouseId) {
        var rows = jdbc.query(
            """
                SELECT id, name, business_unit_id, business_unit_name, business_id, business_name
                FROM sales_inventory_warehouses
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                FOR UPDATE
                """,
            (rs, rowNum) -> new Warehouse(
                rs.getLong("id"), rs.getString("name"),
                rs.getString("business_unit_id"), rs.getString("business_unit_name"),
                rs.getString("business_id"), rs.getString("business_name")),
            companyId, warehouseId);
        if (rows.isEmpty()) throw new SecurityException("El almacén no está activo o no pertenece a la empresa.");
        return rows.getFirst();
    }

    private Map<Long, Product> requireProductsForSale(long companyId, Set<Long> productIds) {
        if (productIds.isEmpty()) throw new IllegalArgumentException("Agrega al menos un producto.");
        var placeholders = String.join(",", Collections.nCopies(productIds.size(), "?"));
        var arguments = new ArrayList<Object>();
        arguments.add(companyId);
        arguments.addAll(productIds);
        var rows = jdbc.query(
            """
                SELECT id, sku, name, type, price, UPPER(currency) currency, tax_category
                FROM sales_products
                WHERE company_id = ? AND id IN (%s) AND deleted_at IS NULL
                  AND LOWER(COALESCE(status, 'active')) = 'active'
                  AND LOWER(REPLACE(COALESCE(visibility, ''), ' ', '_')) IN ('commercial', 'pos_ready')
                  AND price IS NOT NULL AND price > 0
                FOR UPDATE
                """.formatted(placeholders),
            (rs, rowNum) -> new Product(
                rs.getLong("id"), rs.getString("sku"), rs.getString("name"),
                rs.getString("type"), rs.getBigDecimal("price"), rs.getString("currency"),
                taxPercent(rs.getString("tax_category"))),
            arguments.toArray());
        if (rows.size() != productIds.size()) {
            throw new IllegalArgumentException("Uno o más productos ya no están disponibles para venta.");
        }
        return rows.stream().collect(Collectors.toUnmodifiableMap(Product::id, Function.identity()));
    }

    private String singleCurrency(java.util.Collection<Product> products) {
        var currencies = products.stream().map(Product::currency).filter(value -> value != null && !value.isBlank())
            .map(value -> value.toUpperCase(Locale.ROOT)).collect(Collectors.toSet());
        if (currencies.size() != 1) {
            throw new IllegalArgumentException("Todos los productos de una venta deben usar la misma moneda.");
        }
        return currencies.iterator().next();
    }

    private Map<String, Object> summary(List<Map<String, Object>> salesRows) {
        var today = LocalDate.now().toString();
        var todayRows = salesRows.stream().filter(row -> today.equals(row.get("sale_date"))).toList();
        var totals = new LinkedHashMap<String, BigDecimal>();
        for (var sale : todayRows) {
            var currency = text(sale.get("currency")).toUpperCase(Locale.ROOT);
            var amount = sale.get("total_amount") instanceof BigDecimal decimal ? decimal : BigDecimal.ZERO;
            totals.merge(currency, amount, BigDecimal::add);
        }
        return row(
            "today_count", todayRows.size(),
            "today_totals", totals,
            "pending_settlement_count", salesRows.stream()
                .filter(item -> !"approved".equalsIgnoreCase(text(item.get("finance_status"))))
                .count());
    }

    private Map<String, Object> sellerMap(SellerScope seller) {
        return row(
            "user_id", seller.userId(),
            "user_company_id", seller.userCompanyId(),
            "name", seller.name(),
            "email", seller.email());
    }

    private Map<String, Object> scopeMap(SellerScope seller) {
        return row(
            "unit_id", seller.unitId(),
            "unit_name", seller.unitName(),
            "business_id", seller.businessId(),
            "business_name", seller.businessName());
    }

    private Map<String, Object> paymentAccountResponse(TreasuryAccount account) {
        return row(
            "id", account.id(),
            "name", account.name(),
            "type", account.type(),
            "currency", account.currencyCode(),
            "unit_id", account.unitId(),
            "business_id", account.businessId());
    }

    private Map<String, Object> contactResponse(Map<String, Object> saved) {
        return row(
            "id", saved.get("id"),
            "code", saved.get("contactCode"),
            "name", saved.get("companyName"),
            "contact_person", saved.get("contactPerson"),
            "phone", saved.get("phone"),
            "email", saved.get("email"),
            "fiscal_country", saved.get("fiscalCountry"),
            "fiscal_legal_name", saved.get("fiscalLegalName"),
            "fiscal_tax_id", saved.get("fiscalTaxId"),
            "fiscal_registry_id", saved.get("fiscalRegistryId"),
            "fiscal_address_line1", saved.get("fiscalAddressLine1"),
            "fiscal_address_line2", saved.get("fiscalAddressLine2"),
            "fiscal_city", saved.get("fiscalCity"),
            "fiscal_state", saved.get("fiscalState"),
            "fiscal_postal_code", saved.get("fiscalPostalCode"),
            "fiscal_email", saved.get("fiscalEmail"),
            "fiscal_regime", saved.get("fiscalRegime"),
            "fiscal_cfdi_use", fiscalMetadataValue(saved.get("fiscalMetadata"), "cfdiUse"),
            "fiscal_notes", saved.get("fiscalNotes"),
            "status", saved.get("status"));
    }

    private void applyFiscalProfile(Map<String, Object> payload, FiscalProfileRequest fiscal) {
        if (fiscal == null) return;
        var values = List.of(
            text(fiscal.legalName()), text(fiscal.taxId()), text(fiscal.registryId()),
            text(fiscal.addressLine1()), text(fiscal.addressLine2()), text(fiscal.city()),
            text(fiscal.state()), text(fiscal.postalCode()), text(fiscal.email()),
            text(fiscal.regime()), text(fiscal.cfdiUse()), text(fiscal.notes()));
        if (values.stream().allMatch(String::isBlank)) return;

        var country = nullableText(fiscal.country());
        payload.put("fiscalCountry", country == null ? "MX" : country.toUpperCase(Locale.ROOT));
        payload.put("fiscalLegalName", nullableText(fiscal.legalName()));
        payload.put("fiscalTaxId", nullableText(fiscal.taxId()));
        payload.put("fiscalRegistryId", nullableText(fiscal.registryId()));
        payload.put("fiscalAddressLine1", nullableText(fiscal.addressLine1()));
        payload.put("fiscalAddressLine2", nullableText(fiscal.addressLine2()));
        payload.put("fiscalCity", nullableText(fiscal.city()));
        payload.put("fiscalState", nullableText(fiscal.state()));
        payload.put("fiscalPostalCode", nullableText(fiscal.postalCode()));
        payload.put("fiscalEmail", nullableText(fiscal.email()));
        payload.put("fiscalRegime", nullableText(fiscal.regime()));
        payload.put("fiscalNotes", nullableText(fiscal.notes()));
        var cfdiUse = nullableText(fiscal.cfdiUse());
        if (cfdiUse != null) {
            payload.put("fiscalMetadata", Map.of("cfdiUse", cfdiUse.toUpperCase(Locale.ROOT)));
        }
    }

    private String fiscalMetadataValue(Object metadata, String key) {
        if (!(metadata instanceof Map<?, ?> values)) return null;
        return nullableText(values.get(key) == null ? null : String.valueOf(values.get(key)));
    }

    private Map<String, Object> saleResponse(Map<String, Object> saved) {
        var customFields = saved.get("customFields") instanceof Map<?, ?> values
            ? values
            : Map.of();
        return row(
            "id", saved.get("id"),
            "sale_number", saved.get("saleNumber"),
            "customer_name", saved.get("customerName"),
            "sale_date", saved.get("saleDate"),
            "subtotal", saved.get("subtotal"),
            "tax_total", saved.get("taxTotal"),
            "total_amount", saved.get("totalAmount"),
            "currency", saved.get("currency"),
            "payment_method", saved.get("paymentMethod"),
            "payment_reference", saved.get("paymentReference"),
            "payment_account_id", customFields.get("paymentAccountId"),
            "payment_account_name", customFields.get("paymentAccountName"),
            "payment_evidence_status", saved.get("paymentEvidenceStatus"),
            "evidence_count", saved.getOrDefault("filesCount", 0),
            "commercial_status", saved.get("commercialStatus"),
            "finance_status", saved.get("financeStatus"),
            "inventory_status", saved.get("inventoryMovementStatus"),
            "delivery_status", saved.get("deliveryStatus"),
            "settlement_status", settlementStatus(
                text(saved.get("paymentMethod")), text(saved.get("financeStatus"))));
    }

    private Map<String, Object> paymentEvidencePayload(PaymentEvidencePresignRequest request) {
        return row(
            "fileName", request.fileName(),
            "contentType", request.contentType(),
            "sizeBytes", request.sizeBytes());
    }

    private Map<String, Object> paymentEvidencePayload(PaymentEvidenceRegisterRequest request) {
        return row(
            "objectKey", request.objectKey(),
            "fileName", request.fileName(),
            "contentType", request.contentType(),
            "sizeBytes", request.sizeBytes());
    }

    private String normalizePaymentMethod(String value) {
        var normalized = text(value).toLowerCase(Locale.ROOT);
        if (!PAYMENT_METHODS.contains(normalized)) {
            throw new IllegalArgumentException("El método de pago no está disponible en venta en ruta.");
        }
        return normalized;
    }

    private String settlementMode(String paymentMethod) {
        return switch (paymentMethod) {
            case "cash" -> "ROUTE_CASH_CUSTODY";
            case "credit" -> "RECEIVABLE_PENDING";
            default -> "DIRECT_TREASURY_BANK";
        };
    }

    private String settlementStatus(String paymentMethod) {
        return switch (text(paymentMethod).toLowerCase(Locale.ROOT)) {
            case "card", "transfer" -> "settled";
            case "cash" -> "route_cash_custody";
            default -> "receivable_pending";
        };
    }

    private String settlementStatus(String paymentMethod, String financeStatus) {
        var normalizedMethod = text(paymentMethod).toLowerCase(Locale.ROOT);
        if ("approved".equalsIgnoreCase(text(financeStatus)) && !"credit".equals(normalizedMethod)) {
            return "settled";
        }
        if (Set.of("card", "transfer").contains(normalizedMethod)) {
            return "pending_reconciliation";
        }
        return settlementStatus(normalizedMethod);
    }

    private String settlementMessage(String paymentMethod) {
        return switch (paymentMethod) {
            case "card", "transfer" ->
                "Venta registrada. El inventario y el ingreso en Tesorería quedaron actualizados.";
            case "cash" ->
                "Venta registrada. El efectivo queda bajo tu custodia hasta entregarlo a Finanzas.";
            default ->
                "Venta registrada. El saldo quedó pendiente de cobranza.";
        };
    }

    private String paymentReference(String paymentMethod, String supplied) {
        if (supplied != null) return supplied;
        return switch (paymentMethod) {
            case "cash" -> "Cobro en ruta";
            case "credit" -> "Venta a crédito";
            default -> null;
        };
    }

    private static BigDecimal taxPercent(String category) {
        var normalized = text(category).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        if (Set.of("exempt", "zerorated", "zero", "exento", "tasa0").contains(normalized)) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
        if (Set.of("reducedvat", "reduced", "iva8").contains(normalized)) {
            return new BigDecimal("8.00");
        }
        return new BigDecimal("16.00");
    }

    private static Map<String, Object> option(String id, String label, String description) {
        return row("id", id, "label", label, "description", description);
    }

    private static Map<String, Object> row(Object... entries) {
        var result = new LinkedHashMap<String, Object>();
        for (var index = 0; index + 1 < entries.length; index += 2) {
            result.put(String.valueOf(entries[index]), entries[index + 1]);
        }
        return Collections.unmodifiableMap(result);
    }

    private static Long longOrNull(String value) {
        try {
            var normalized = nullableText(value);
            return normalized == null ? null : Long.parseLong(normalized);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static String nullableText(String value) {
        var normalized = text(value);
        return normalized.isBlank() ? null : normalized;
    }

    private static String requiredText(String value, String message) {
        var normalized = text(value);
        if (normalized.isBlank()) throw new IllegalArgumentException(message);
        return normalized;
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private record SellerScope(
            long userCompanyId,
            long userId,
            String name,
            String email,
            Long unitId,
            Long businessId,
            String unitName,
            String businessName) {
    }

    private record Contact(long id, String name) {
    }

    private record Warehouse(
            long id,
            String name,
            String unitId,
            String unitName,
            String businessId,
            String businessName) {
    }

    private record Product(
            long id,
            String sku,
            String name,
            String type,
            BigDecimal price,
            String currency,
            BigDecimal taxPercent) {
    }
}
