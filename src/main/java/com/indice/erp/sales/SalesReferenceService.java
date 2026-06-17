package com.indice.erp.sales;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
class SalesReferenceService {

    private final SalesRepository salesRepository;

    SalesReferenceService(SalesRepository salesRepository) {
        this.salesRepository = salesRepository;
    }

    void validateEntityPayload(long companyId, String collection, Map<String, Object> payload) {
        validateUnit(companyId, SalesPayloadSupport.longValue(payload, "unitId"));
        validateBusiness(companyId, SalesPayloadSupport.longValue(payload, "businessId"));
        validateUserCompany(companyId, SalesPayloadSupport.longValue(payload, "ownerUserCompanyId"));
        validateUserCompany(companyId, SalesPayloadSupport.longValue(payload, "assignedSellerUserCompanyId"));
        validateUserCompany(companyId, SalesPayloadSupport.longValue(payload, "sellerUserCompanyId"));

        validateSalesReference(companyId, "sales_contacts", SalesPayloadSupport.longValue(payload, "contactId"), "contactId");
        validateSalesReference(companyId, "sales_opportunities", SalesPayloadSupport.longValue(payload, "opportunityId"), "opportunityId");
        validateSalesReference(companyId, "sales_quotes", SalesPayloadSupport.longValue(payload, "quoteId"), "quoteId");
        validateSalesReference(companyId, "sales_post_sale_cases", SalesPayloadSupport.longValue(payload, "postSaleCaseId"), "postSaleCaseId");

        if ("quotes".equals(collection)) {
            validateUserCompany(companyId, SalesPayloadSupport.longValue(payload, "assignedSellerUserCompanyId"));
        }
        if ("inventory-balances".equals(collection)) {
            validateSalesReference(companyId, "sales_products", SalesPayloadSupport.longValue(payload, "productId"), "productId");
            validateSalesReference(companyId, "sales_inventory_warehouses", SalesPayloadSupport.longValue(payload, "warehouseId"), "warehouseId");
        }
        if ("inventory-movements".equals(collection)) {
            validateSalesReference(companyId, "sales_products", SalesPayloadSupport.longValue(payload, "productId"), "productId");
            validateSalesReference(companyId, "sales_inventory_warehouses", SalesPayloadSupport.longValue(payload, "fromWarehouseId"), "fromWarehouseId");
            validateSalesReference(companyId, "sales_inventory_warehouses", SalesPayloadSupport.longValue(payload, "toWarehouseId"), "toWarehouseId");
        }
    }

    void validateQuoteItemPayload(long companyId, Map<String, Object> payload) {
        validateSalesReference(companyId, "sales_products", SalesPayloadSupport.longValue(payload, "productId"), "productId");
    }

    void validateFileEntity(long companyId, String entityType, long entityId) {
        var tableName = switch (entityType) {
            case "contact", "contacts" -> "sales_contacts";
            case "opportunity", "opportunities" -> "sales_opportunities";
            case "product", "products" -> "sales_products";
            case "quote", "quotes" -> "sales_quotes";
            case "sale", "sales" -> "sales_records";
            case "contract", "contracts" -> "sales_contracts";
            case "post_sale", "post-sales", "postSale", "post_sale_case" -> "sales_post_sale_cases";
            default -> null;
        };
        if (tableName == null) {
            throw new IllegalArgumentException("Unsupported sales file entity type.");
        }
        validateSalesReference(companyId, tableName, entityId, "entityId");
    }

    private void validateUnit(long companyId, Long unitId) {
        if (unitId != null && !salesRepository.existsNullableCompanyTable("units", companyId, unitId)) {
            throw new IllegalArgumentException("unitId does not belong to this company.");
        }
    }

    private void validateBusiness(long companyId, Long businessId) {
        if (businessId != null && !salesRepository.existsNullableCompanyTable("businesses", companyId, businessId)) {
            throw new IllegalArgumentException("businessId does not belong to this company.");
        }
    }

    private void validateUserCompany(long companyId, Long userCompanyId) {
        if (userCompanyId != null && !salesRepository.existsInCompany("user_companies", companyId, userCompanyId)) {
            throw new IllegalArgumentException("userCompanyId does not belong to this company.");
        }
    }

    private void validateSalesReference(long companyId, String tableName, Long id, String fieldName) {
        if (id != null && !salesRepository.existsInCompany(tableName, companyId, id)) {
            throw new IllegalArgumentException(fieldName + " does not belong to this company.");
        }
    }
}
