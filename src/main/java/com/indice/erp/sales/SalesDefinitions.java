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
