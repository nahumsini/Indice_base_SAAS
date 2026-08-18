package com.indice.erp.sales;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
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
        if ("inventory-warehouses".equals(collection)) {
            validateWarehouseAssignment(companyId, payload);
        }
        if ("sales".equals(collection)) {
            validateSaleWarehouseAssignment(companyId, payload);
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

    private void validateWarehouseAssignment(long companyId, Map<String, Object> payload) {
        var unitId = SalesPayloadSupport.longValue(payload, "businessUnitId");
        var businessId = SalesPayloadSupport.longValue(payload, "businessId");
        if (unitId == null || businessId == null) {
            throw new IllegalArgumentException("businessUnitId and businessId are required for a warehouse.");
        }

        var assignment = salesRepository.organizationAssignment(companyId, unitId, businessId);
        if (assignment == null) {
            throw new IllegalArgumentException("businessId does not belong to businessUnitId for this company.");
        }

        payload.put("businessUnitId", String.valueOf(assignment.get("businessUnitId")));
        payload.put("businessUnitName", assignment.get("businessUnitName"));
        payload.put("businessId", String.valueOf(assignment.get("businessId")));
        payload.put("businessName", assignment.get("businessName"));
        if (SalesPayloadSupport.stringValue(payload, "jurisdiction") == null
                && assignment.get("businessAddress") != null) {
            payload.put("jurisdiction", assignment.get("businessAddress"));
        }
    }

    private void validateSaleWarehouseAssignment(long companyId, Map<String, Object> payload) {
        var rawLines = SalesPayloadSupport.value(payload, "saleLines");
        var lines = rawLines instanceof List<?> list ? list : List.of();
        var customFields = mutableMap(SalesPayloadSupport.value(payload, "customFields"));
        var warehouseId = safeLong(customFields.get("warehouseId"));

        if (warehouseId == null) {
            for (var item : lines) {
                if (item instanceof Map<?, ?> rawLine) {
                    warehouseId = safeLong(rawLine.get("warehouseId"));
                    if (warehouseId != null) break;
                }
            }
        }
        if (warehouseId == null) {
            if (!lines.isEmpty()) {
                throw new IllegalArgumentException("warehouseId is required when a sale has items.");
            }
            return;
        }

        var warehouse = salesRepository.activeWarehouseAssignment(companyId, warehouseId);
        if (warehouse == null) {
            throw new IllegalArgumentException("The selected warehouse is not active or does not belong to this company.");
        }
        var unitId = safeLong(warehouse.get("businessUnitId"));
        var businessId = safeLong(warehouse.get("businessId"));
        if (unitId == null || businessId == null) {
            throw new IllegalArgumentException("The selected warehouse must be assigned to a business unit and business.");
        }
        var assignment = salesRepository.organizationAssignment(companyId, unitId, businessId);
        if (assignment == null) {
            throw new IllegalArgumentException("The selected warehouse has an invalid business assignment.");
        }

        rejectDifferentScope(SalesPayloadSupport.longValue(payload, "unitId"), unitId, "unitId");
        rejectDifferentScope(SalesPayloadSupport.longValue(payload, "businessId"), businessId, "businessId");
        rejectDifferentScope(safeLong(customFields.get("businessUnitId")), unitId, "businessUnitId");
        rejectDifferentScope(safeLong(customFields.get("businessId")), businessId, "businessId");

        payload.put("unitId", unitId);
        payload.put("businessId", businessId);
        customFields.put("warehouseId", String.valueOf(warehouseId));
        customFields.put("warehouseName", warehouse.get("warehouseName"));
        customFields.put("businessUnitId", String.valueOf(unitId));
        customFields.put("businessUnitName", assignment.get("businessUnitName"));
        customFields.put("businessId", String.valueOf(businessId));
        customFields.put("businessName", assignment.get("businessName"));
        payload.put("customFields", customFields);

        if (!lines.isEmpty()) {
            var canonicalLines = new ArrayList<Object>();
            for (var item : lines) {
                if (!(item instanceof Map<?, ?> rawLine)) {
                    canonicalLines.add(item);
                    continue;
                }
                var line = mutableMap(rawLine);
                rejectDifferentScope(safeLong(line.get("warehouseId")), warehouseId, "warehouseId");
                rejectDifferentScope(safeLong(line.get("businessUnitId")), unitId, "businessUnitId");
                rejectDifferentScope(safeLong(line.get("businessId")), businessId, "businessId");
                line.put("warehouseId", String.valueOf(warehouseId));
                line.put("businessUnitId", String.valueOf(unitId));
                line.put("businessId", String.valueOf(businessId));
                canonicalLines.add(line);
            }
            payload.put("saleLines", canonicalLines);
        }
    }

    private static LinkedHashMap<String, Object> mutableMap(Object value) {
        var result = new LinkedHashMap<String, Object>();
        if (value instanceof Map<?, ?> map) {
            map.forEach((key, entryValue) -> result.put(String.valueOf(key), entryValue));
        }
        return result;
    }

    private static Long safeLong(Object value) {
        try {
            return SalesPayloadSupport.toLong(value);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static void rejectDifferentScope(Long supplied, long canonical, String field) {
        if (supplied != null && supplied != canonical) {
            throw new IllegalArgumentException(field + " does not match the selected warehouse.");
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
