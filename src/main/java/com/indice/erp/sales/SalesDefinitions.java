package com.indice.erp.sales;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class SalesDefinitions {

    private SalesDefinitions() {
    }

    static Map<String, SalesEntityDefinition> definitions() {
        var definitions = new LinkedHashMap<String, SalesEntityDefinition>();
        add(definitions, contacts());
        add(definitions, opportunities());
        add(definitions, products());
        add(definitions, quotes());
        add(definitions, sales());
        add(definitions, commissionRules());
        add(definitions, inventoryWarehouses());
        add(definitions, inventoryBalances());
        add(definitions, inventoryMovements());
        add(definitions, postSales());
        add(definitions, contracts());
        return Map.copyOf(definitions);
    }

    private static void add(Map<String, SalesEntityDefinition> definitions, SalesEntityDefinition definition) {
        definitions.put(definition.collectionName(), definition);
    }

    private static SalesField f(String apiName, String columnName, SalesFieldType type) {
        return new SalesField(apiName, columnName, type);
    }

    private static SalesEntityDefinition contacts() {
        return new SalesEntityDefinition(
                "contacts",
                "contact",
                "sales_contacts",
                "id",
                "contactCode",
                "contact_code",
                "CON",
                List.of(
                        f("contactCode", "contact_code", SalesFieldType.STRING),
                        f("unitId", "unit_id", SalesFieldType.LONG),
                        f("businessId", "business_id", SalesFieldType.LONG),
                        f("companyName", "company_name", SalesFieldType.STRING),
                        f("contactPerson", "contact_person", SalesFieldType.STRING),
                        f("phone", "phone", SalesFieldType.STRING),
                        f("email", "email", SalesFieldType.STRING),
                        f("source", "source", SalesFieldType.STRING),
                        f("status", "status", SalesFieldType.STRING),
                        f("fiscalCountry", "fiscal_country", SalesFieldType.STRING),
                        f("fiscalLegalName", "fiscal_legal_name", SalesFieldType.STRING),
                        f("fiscalTaxId", "fiscal_tax_id", SalesFieldType.STRING),
                        f("fiscalRegistryId", "fiscal_registry_id", SalesFieldType.STRING),
                        f("fiscalAddressLine1", "fiscal_address_line1", SalesFieldType.STRING),
                        f("fiscalAddressLine2", "fiscal_address_line2", SalesFieldType.STRING),
                        f("fiscalCity", "fiscal_city", SalesFieldType.STRING),
                        f("fiscalState", "fiscal_state", SalesFieldType.STRING),
                        f("fiscalPostalCode", "fiscal_postal_code", SalesFieldType.STRING),
                        f("fiscalEmail", "fiscal_email", SalesFieldType.STRING),
                        f("fiscalRegime", "fiscal_regime", SalesFieldType.STRING),
                        f("fiscalNotes", "fiscal_notes", SalesFieldType.STRING),
                        f("fiscalResponsibilities", "fiscal_responsibilities_json", SalesFieldType.JSON),
                        f("fiscalMetadata", "fiscal_metadata_json", SalesFieldType.JSON),
                        f("ownerUserCompanyId", "owner_user_company_id", SalesFieldType.LONG),
                        f("ownerName", "owner_name", SalesFieldType.STRING),
                        f("notes", "notes", SalesFieldType.STRING),
                        f("tags", "tags_json", SalesFieldType.JSON),
                        f("customFields", "custom_fields_json", SalesFieldType.JSON),
                        f("metadata", "metadata_json", SalesFieldType.JSON)),
                List.of("companyName"),
                List.of("companyName", "contactPerson", "phone", "email", "source", "ownerName", "fiscalLegalName", "fiscalTaxId", "fiscalRegistryId", "fiscalCountry"),
                "updated_at DESC, id DESC");
    }

    private static SalesEntityDefinition opportunities() {
        return new SalesEntityDefinition(
                "opportunities",
                "opportunity",
                "sales_opportunities",
                "id",
                "opportunityCode",
                "opportunity_code",
                "OPP",
                List.of(
                        f("opportunityCode", "opportunity_code", SalesFieldType.STRING),
                        f("contactId", "contact_id", SalesFieldType.LONG),
                        f("unitId", "unit_id", SalesFieldType.LONG),
                        f("businessId", "business_id", SalesFieldType.LONG),
                        f("opportunityName", "opportunity_name", SalesFieldType.STRING),
                        f("companyName", "company_name", SalesFieldType.STRING),
                        f("contactPerson", "contact_person", SalesFieldType.STRING),
                        f("phone", "phone", SalesFieldType.STRING),
                        f("email", "email", SalesFieldType.STRING),
                        f("source", "source", SalesFieldType.STRING),
                        f("stage", "stage", SalesFieldType.STRING),
                        f("lifecycleStatus", "lifecycle_status", SalesFieldType.STRING),
                        f("temperature", "temperature", SalesFieldType.STRING),
                        f("status", "status", SalesFieldType.STRING),
                        f("ownerUserCompanyId", "owner_user_company_id", SalesFieldType.LONG),
                        f("ownerName", "owner_name", SalesFieldType.STRING),
                        f("estimatedValue", "estimated_value", SalesFieldType.DECIMAL),
                        f("currency", "currency", SalesFieldType.STRING),
                        f("probabilityPercent", "probability_percent", SalesFieldType.INTEGER),
                        f("expectedCloseDate", "expected_close_date", SalesFieldType.DATE),
                        f("nextAction", "next_action", SalesFieldType.STRING),
                        f("nextActionAt", "next_action_at", SalesFieldType.DATETIME),
                        f("lastContactAt", "last_contact_at", SalesFieldType.DATETIME),
                        f("notes", "notes", SalesFieldType.STRING),
                        f("customFields", "custom_fields_json", SalesFieldType.JSON),
                        f("metadata", "metadata_json", SalesFieldType.JSON)),
                List.of("opportunityName"),
                List.of("opportunityName", "companyName", "contactPerson", "phone", "email", "stage", "status", "ownerName"),
                "updated_at DESC, id DESC");
    }

    private static SalesEntityDefinition products() {
        return new SalesEntityDefinition(
                "products",
                "product",
                "sales_products",
                "id",
                "productCode",
                "product_code",
                "PRD",
                List.of(
                        f("productCode", "product_code", SalesFieldType.STRING),
                        f("sku", "sku", SalesFieldType.STRING),
                        f("name", "name", SalesFieldType.STRING),
                        f("description", "description", SalesFieldType.STRING),
                        f("category", "category", SalesFieldType.STRING),
                        f("type", "type", SalesFieldType.STRING),
                        f("price", "price", SalesFieldType.DECIMAL),
                        f("cost", "cost", SalesFieldType.DECIMAL),
                        f("currency", "currency", SalesFieldType.STRING),
                        f("taxCategory", "tax_category", SalesFieldType.STRING),
                        f("status", "status", SalesFieldType.STRING),
                        f("visibility", "visibility", SalesFieldType.STRING),
                        f("inventoryReady", "inventory_ready", SalesFieldType.BOOLEAN),
                        f("posReady", "pos_ready", SalesFieldType.BOOLEAN),
                        f("reservable", "reservable", SalesFieldType.BOOLEAN),
                        f("availabilityIcalUrl", "availability_ical_url_protected", SalesFieldType.STRING),
                        f("customFields", "custom_fields_json", SalesFieldType.JSON),
                        f("metadata", "metadata_json", SalesFieldType.JSON)),
                List.of("name"),
                List.of("name", "sku", "category", "type", "status"),
                "updated_at DESC, id DESC");
    }

    private static SalesEntityDefinition quotes() {
        return new SalesEntityDefinition(
                "quotes",
                "quote",
                "sales_quotes",
                "id",
                "quoteNumber",
                "quote_number",
                "QUO",
                List.of(
                        f("quoteNumber", "quote_number", SalesFieldType.STRING),
                        f("contactId", "contact_id", SalesFieldType.LONG),
                        f("opportunityId", "opportunity_id", SalesFieldType.LONG),
                        f("clientName", "client_name", SalesFieldType.STRING),
                        f("contactPerson", "contact_person", SalesFieldType.STRING),
                        f("status", "status", SalesFieldType.STRING),
                        f("amount", "amount", SalesFieldType.DECIMAL),
                        f("currency", "currency", SalesFieldType.STRING),
                        f("createdDate", "created_date", SalesFieldType.DATE),
                        f("expirationDate", "expiration_date", SalesFieldType.DATE),
                        f("assignedSellerUserCompanyId", "assigned_seller_user_company_id", SalesFieldType.LONG),
                        f("assignedSellerName", "assigned_seller_name", SalesFieldType.STRING),
                        f("notes", "notes", SalesFieldType.STRING),
                        f("terms", "terms", SalesFieldType.STRING),
                        f("connectionStatus", "connection_status", SalesFieldType.STRING),
                        f("customFields", "custom_fields_json", SalesFieldType.JSON),
                        f("metadata", "metadata_json", SalesFieldType.JSON)),
                List.of("clientName"),
                List.of("quoteNumber", "clientName", "contactPerson", "status", "assignedSellerName"),
                "updated_at DESC, id DESC");
    }

    private static SalesEntityDefinition sales() {
        return new SalesEntityDefinition(
                "sales",
                "sale",
                "sales_records",
                "id",
                "saleNumber",
                "sale_number",
                "SAL",
                List.of(
                        f("saleNumber", "sale_number", SalesFieldType.STRING),
                        f("contactId", "contact_id", SalesFieldType.LONG),
                        f("opportunityId", "opportunity_id", SalesFieldType.LONG),
                        f("quoteId", "quote_id", SalesFieldType.LONG),
                        f("unitId", "unit_id", SalesFieldType.LONG),
                        f("businessId", "business_id", SalesFieldType.LONG),
                        f("sellerUserCompanyId", "seller_user_company_id", SalesFieldType.LONG),
                        f("quoteReference", "quote_reference", SalesFieldType.STRING),
                        f("saleDocumentReference", "sale_document_reference", SalesFieldType.STRING),
                        f("customerName", "customer_name", SalesFieldType.STRING),
                        f("sellerName", "seller_name", SalesFieldType.STRING),
                        f("saleDate", "sale_date", SalesFieldType.DATE),
                        f("totalAmount", "total_amount", SalesFieldType.DECIMAL),
                        f("subtotal", "subtotal", SalesFieldType.DECIMAL),
                        f("discountTotal", "discount_total", SalesFieldType.DECIMAL),
                        f("taxTotal", "tax_total", SalesFieldType.DECIMAL),
                        f("marginTotal", "margin_total", SalesFieldType.DECIMAL),
                        f("currency", "currency", SalesFieldType.STRING),
                        f("paymentMethod", "payment_method", SalesFieldType.STRING),
                        f("paymentReference", "payment_reference", SalesFieldType.STRING),
                        f("paymentEvidenceStatus", "payment_evidence_status", SalesFieldType.STRING),
                        f("commercialStatus", "commercial_status", SalesFieldType.STRING),
                        f("financeStatus", "finance_status", SalesFieldType.STRING),
                        f("inventoryStatus", "inventory_status", SalesFieldType.STRING),
                        f("deliveryStatus", "delivery_status", SalesFieldType.STRING),
                        f("commissionStatus", "commission_status", SalesFieldType.STRING),
                        f("inventoryMovementStatus", "inventory_movement_status", SalesFieldType.STRING),
                        f("inventoryMovementReference", "inventory_movement_reference", SalesFieldType.STRING),
                        f("commissionRate", "commission_rate", SalesFieldType.DECIMAL),
                        f("commissionAmount", "commission_amount", SalesFieldType.DECIMAL),
                        f("commissionNotes", "commission_notes", SalesFieldType.STRING),
                        f("commissionRuleId", "commission_rule_id", SalesFieldType.LONG),
                        f("commissionRuleCode", "commission_rule_code", SalesFieldType.STRING),
                        f("commissionRuleName", "commission_rule_name", SalesFieldType.STRING),
                        f("commissionType", "commission_type", SalesFieldType.STRING),
                        f("commissionValue", "commission_value", SalesFieldType.DECIMAL),
                        f("commissionBreakdown", "commission_breakdown_json", SalesFieldType.JSON),
                        f("saleLines", "sale_lines_json", SalesFieldType.JSON),
                        f("notes", "notes", SalesFieldType.STRING),
                        f("customFields", "custom_fields_json", SalesFieldType.JSON),
                        f("metadata", "metadata_json", SalesFieldType.JSON)),
                List.of("customerName"),
                List.of("saleNumber", "quoteReference", "saleDocumentReference", "customerName", "sellerName", "paymentMethod", "paymentReference"),
                "updated_at DESC, id DESC");
    }

    private static SalesEntityDefinition inventoryWarehouses() {
        return new SalesEntityDefinition(
                "inventory-warehouses",
                "inventory_warehouse",
                "sales_inventory_warehouses",
                "id",
                "warehouseCode",
                "warehouse_code",
                "WH",
                List.of(
                        f("warehouseCode", "warehouse_code", SalesFieldType.STRING),
                        f("name", "name", SalesFieldType.STRING),
                        f("type", "type", SalesFieldType.STRING),
                        f("businessUnitId", "business_unit_id", SalesFieldType.STRING),
                        f("businessUnitName", "business_unit_name", SalesFieldType.STRING),
                        f("businessId", "business_id", SalesFieldType.STRING),
                        f("businessName", "business_name", SalesFieldType.STRING),
                        f("jurisdiction", "jurisdiction", SalesFieldType.STRING),
                        f("responsibleUserId", "responsible_user_id", SalesFieldType.STRING),
                        f("responsibleName", "responsible_name", SalesFieldType.STRING),
                        f("addressNote", "address_note", SalesFieldType.STRING),
                        f("status", "status", SalesFieldType.STRING),
                        f("lastMovementAt", "last_movement_at", SalesFieldType.DATE),
                        f("metadata", "metadata_json", SalesFieldType.JSON)),
                List.of("name"),
                List.of("warehouseCode", "name", "type", "businessUnitName", "businessName", "jurisdiction", "responsibleName", "status"),
                "updated_at DESC, id DESC");
    }

    private static SalesEntityDefinition commissionRules() {
        return new SalesEntityDefinition(
                "commission-rules",
                "commission_rule",
                "sales_commission_rules",
                "id",
                "ruleCode",
                "rule_code",
                "CR",
                List.of(
                        f("ruleCode", "rule_code", SalesFieldType.STRING),
                        f("name", "name", SalesFieldType.STRING),
                        f("userId", "user_id", SalesFieldType.STRING),
                        f("userName", "user_name", SalesFieldType.STRING),
                        f("userIds", "user_ids_json", SalesFieldType.JSON),
                        f("userNames", "user_names_json", SalesFieldType.JSON),
                        f("productId", "product_id", SalesFieldType.STRING),
                        f("productName", "product_name", SalesFieldType.STRING),
                        f("productIds", "product_ids_json", SalesFieldType.JSON),
                        f("productNames", "product_names_json", SalesFieldType.JSON),
                        f("categoryId", "category_id", SalesFieldType.STRING),
                        f("categoryName", "category_name", SalesFieldType.STRING),
                        f("type", "commission_type", SalesFieldType.STRING),
                        f("value", "commission_value", SalesFieldType.DECIMAL),
                        f("validFrom", "valid_from", SalesFieldType.DATE),
                        f("validUntil", "valid_until", SalesFieldType.DATE),
                        f("status", "status", SalesFieldType.STRING),
                        f("priority", "priority", SalesFieldType.INTEGER),
                        f("notes", "notes", SalesFieldType.STRING)),
                List.of("name", "type"),
                List.of("ruleCode", "name", "userName", "productName", "categoryName", "status"),
                "priority DESC, updated_at DESC, id DESC");
    }

    private static SalesEntityDefinition inventoryBalances() {
        return new SalesEntityDefinition(
                "inventory-balances",
                "inventory_balance",
                "sales_inventory_balances",
                "id",
                "balanceCode",
                "balance_code",
                "STK",
                List.of(
                        f("balanceCode", "balance_code", SalesFieldType.STRING),
                        f("productId", "product_id", SalesFieldType.LONG),
                        f("warehouseId", "warehouse_id", SalesFieldType.LONG),
                        f("warehouseName", "warehouse_name", SalesFieldType.STRING),
                        f("availableQuantity", "available_quantity", SalesFieldType.DECIMAL),
                        f("reservedQuantity", "reserved_quantity", SalesFieldType.DECIMAL),
                        f("minimumQuantity", "minimum_quantity", SalesFieldType.DECIMAL),
                        f("unitCost", "unit_cost", SalesFieldType.DECIMAL),
                        f("usesInventory", "uses_inventory", SalesFieldType.BOOLEAN),
                        f("businessUnitId", "business_unit_id", SalesFieldType.STRING),
                        f("businessUnitName", "business_unit_name", SalesFieldType.STRING),
                        f("businessId", "business_id", SalesFieldType.STRING),
                        f("businessName", "business_name", SalesFieldType.STRING),
                        f("lastMovementAt", "last_movement_at", SalesFieldType.DATE),
                        f("metadata", "metadata_json", SalesFieldType.JSON)),
                List.of("productId", "warehouseId", "warehouseName"),
                List.of("balanceCode", "warehouseName", "businessUnitName", "businessName"),
                "updated_at DESC, id DESC");
    }

    private static SalesEntityDefinition inventoryMovements() {
        return new SalesEntityDefinition(
                "inventory-movements",
                "inventory_movement",
                "sales_inventory_movements",
                "id",
                "movementNumber",
                "movement_number",
                "INV",
                List.of(
                        f("movementNumber", "movement_number", SalesFieldType.STRING),
                        f("groupId", "group_id", SalesFieldType.STRING),
                        f("productId", "product_id", SalesFieldType.LONG),
                        f("productName", "product_name", SalesFieldType.STRING),
                        f("productSku", "product_sku", SalesFieldType.STRING),
                        f("productImageUrl", "product_image_url", SalesFieldType.STRING),
                        f("productImageAlt", "product_image_alt", SalesFieldType.STRING),
                        f("variantLabel", "variant_label", SalesFieldType.STRING),
                        f("movementType", "movement_type", SalesFieldType.STRING),
                        f("quantity", "quantity", SalesFieldType.DECIMAL),
                        f("unitCost", "unit_cost", SalesFieldType.DECIMAL),
                        f("fromWarehouseId", "from_warehouse_id", SalesFieldType.LONG),
                        f("fromWarehouseName", "from_warehouse_name", SalesFieldType.STRING),
                        f("toWarehouseId", "to_warehouse_id", SalesFieldType.LONG),
                        f("toWarehouseName", "to_warehouse_name", SalesFieldType.STRING),
                        f("supplierName", "supplier_name", SalesFieldType.STRING),
                        f("businessUnitId", "business_unit_id", SalesFieldType.STRING),
                        f("businessUnitName", "business_unit_name", SalesFieldType.STRING),
                        f("businessId", "business_id", SalesFieldType.STRING),
                        f("businessName", "business_name", SalesFieldType.STRING),
                        f("reason", "reason", SalesFieldType.STRING),
                        f("reference", "reference", SalesFieldType.STRING),
                        f("responsibleName", "responsible_name", SalesFieldType.STRING),
                        f("movementDate", "movement_date", SalesFieldType.DATE),
                        f("status", "status", SalesFieldType.STRING),
                        f("attachments", "attachments_json", SalesFieldType.JSON),
                        f("metadata", "metadata_json", SalesFieldType.JSON)),
                List.of("productName", "movementType", "quantity", "movementDate"),
                List.of("movementNumber", "productName", "productSku", "movementType", "fromWarehouseName", "toWarehouseName", "supplierName", "reference", "responsibleName", "status"),
                "movement_date DESC, updated_at DESC, id DESC");
    }

    private static SalesEntityDefinition postSales() {
        return new SalesEntityDefinition(
                "post-sales",
                "post_sale",
                "sales_post_sale_cases",
                "id",
                "caseNumber",
                "case_number",
                "PSC",
                List.of(
                        f("caseNumber", "case_number", SalesFieldType.STRING),
                        f("contactId", "contact_id", SalesFieldType.LONG),
                        f("opportunityId", "opportunity_id", SalesFieldType.LONG),
                        f("quoteId", "quote_id", SalesFieldType.LONG),
                        f("clientName", "client_name", SalesFieldType.STRING),
                        f("relationType", "relation_type", SalesFieldType.STRING),
                        f("postSaleType", "post_sale_type", SalesFieldType.STRING),
                        f("status", "status", SalesFieldType.STRING),
                        f("ownerUserCompanyId", "owner_user_company_id", SalesFieldType.LONG),
                        f("ownerName", "owner_name", SalesFieldType.STRING),
                        f("lastPurchaseDate", "last_purchase_date", SalesFieldType.DATE),
                        f("nextFollowUpDate", "next_follow_up_date", SalesFieldType.DATE),
                        f("renewalDate", "renewal_date", SalesFieldType.DATE),
                        f("lifetimeValue", "lifetime_value", SalesFieldType.DECIMAL),
                        f("currency", "currency", SalesFieldType.STRING),
                        f("riskLevel", "risk_level", SalesFieldType.STRING),
                        f("lostReason", "lost_reason", SalesFieldType.STRING),
                        f("nextAction", "next_action", SalesFieldType.STRING),
                        f("notes", "notes", SalesFieldType.STRING),
                        f("history", "history_json", SalesFieldType.JSON),
                        f("customFields", "custom_fields_json", SalesFieldType.JSON),
                        f("metadata", "metadata_json", SalesFieldType.JSON)),
                List.of("clientName"),
                List.of("caseNumber", "clientName", "relationType", "postSaleType", "status", "ownerName"),
                "updated_at DESC, id DESC");
    }

    private static SalesEntityDefinition contracts() {
        return new SalesEntityDefinition(
                "contracts",
                "contract",
                "sales_contracts",
                "id",
                "contractNumber",
                "contract_number",
                "CTR",
                List.of(
                        f("contractNumber", "contract_number", SalesFieldType.STRING),
                        f("contactId", "contact_id", SalesFieldType.LONG),
                        f("opportunityId", "opportunity_id", SalesFieldType.LONG),
                        f("quoteId", "quote_id", SalesFieldType.LONG),
                        f("postSaleCaseId", "post_sale_case_id", SalesFieldType.LONG),
                        f("title", "title", SalesFieldType.STRING),
                        f("clientName", "client_name", SalesFieldType.STRING),
                        f("contactPerson", "contact_person", SalesFieldType.STRING),
                        f("contractType", "contract_type", SalesFieldType.STRING),
                        f("status", "status", SalesFieldType.STRING),
                        f("signatureStatus", "signature_status", SalesFieldType.STRING),
                        f("source", "source", SalesFieldType.STRING),
                        f("country", "country", SalesFieldType.STRING),
                        f("ownerUserCompanyId", "owner_user_company_id", SalesFieldType.LONG),
                        f("ownerName", "owner_name", SalesFieldType.STRING),
                        f("expirationDate", "expiration_date", SalesFieldType.DATE),
                        f("notes", "notes", SalesFieldType.STRING),
                        f("dynamicFields", "dynamic_fields_json", SalesFieldType.JSON),
                        f("signatureRequest", "signature_request_json", SalesFieldType.JSON),
                        f("customFields", "custom_fields_json", SalesFieldType.JSON),
                        f("metadata", "metadata_json", SalesFieldType.JSON)),
                List.of("title"),
                List.of("contractNumber", "title", "clientName", "contactPerson", "contractType", "status", "signatureStatus", "ownerName"),
                "updated_at DESC, id DESC");
    }
}
