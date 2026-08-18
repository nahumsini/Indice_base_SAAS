package com.indice.erp.sales;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SalesReferenceServiceTest {

    private final SalesRepository repository = mock(SalesRepository.class);
    private final SalesReferenceService service = new SalesReferenceService(repository);

    @Test
    void warehouseRequiresUnitAndBusiness() {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("name", "Main warehouse");

        assertThrows(
                IllegalArgumentException.class,
                () -> service.validateEntityPayload(7L, "inventory-warehouses", payload));
    }

    @Test
    void warehouseBusinessMustBelongToSelectedUnit() {
        var payload = warehousePayload("10", "22");
        when(repository.existsNullableCompanyTable("businesses", 7L, 22L)).thenReturn(true);
        when(repository.organizationAssignment(7L, 10L, 22L)).thenReturn(null);

        assertThrows(
                IllegalArgumentException.class,
                () -> service.validateEntityPayload(7L, "inventory-warehouses", payload));
    }

    @Test
    void warehouseUsesCanonicalOrganizationNames() {
        var payload = warehousePayload("10", "22");
        payload.put("businessUnitName", "Client supplied unit");
        payload.put("businessName", "Client supplied business");
        when(repository.existsNullableCompanyTable("businesses", 7L, 22L)).thenReturn(true);
        when(repository.organizationAssignment(7L, 10L, 22L)).thenReturn(Map.of(
                "businessUnitId", 10L,
                "businessUnitName", "Monterrey",
                "businessId", 22L,
                "businessName", "Linda Vista",
                "businessAddress", "Av. Principal 100"));

        service.validateEntityPayload(7L, "inventory-warehouses", payload);

        assertEquals("10", payload.get("businessUnitId"));
        assertEquals("Monterrey", payload.get("businessUnitName"));
        assertEquals("22", payload.get("businessId"));
        assertEquals("Linda Vista", payload.get("businessName"));
        assertEquals("Av. Principal 100", payload.get("jurisdiction"));
    }

    @Test
    void saleInheritsCanonicalScopeFromActiveWarehouse() {
        var payload = salePayload("31");
        when(repository.activeWarehouseAssignment(7L, 31L)).thenReturn(Map.of(
                "warehouseId", 31L,
                "warehouseName", "Monterrey central",
                "businessUnitId", "10",
                "businessUnitName", "Old unit label",
                "businessId", "22",
                "businessName", "Old business label"));
        when(repository.organizationAssignment(7L, 10L, 22L)).thenReturn(Map.of(
                "businessUnitId", 10L,
                "businessUnitName", "Monterrey",
                "businessId", 22L,
                "businessName", "Linda Vista",
                "businessAddress", "Av. Principal 100"));

        service.validateEntityPayload(7L, "sales", payload);

        assertEquals(10L, payload.get("unitId"));
        assertEquals(22L, payload.get("businessId"));
        var customFields = castMap(payload.get("customFields"));
        assertEquals("31", customFields.get("warehouseId"));
        assertEquals("Monterrey central", customFields.get("warehouseName"));
        assertEquals("10", customFields.get("businessUnitId"));
        assertEquals("Monterrey", customFields.get("businessUnitName"));
        assertEquals("22", customFields.get("businessId"));
        assertEquals("Linda Vista", customFields.get("businessName"));
        var lines = (List<?>) payload.get("saleLines");
        var line = castMap(lines.getFirst());
        assertEquals("31", line.get("warehouseId"));
        assertEquals("10", line.get("businessUnitId"));
        assertEquals("22", line.get("businessId"));
    }

    @Test
    void saleRejectsLineFromAnotherWarehouseScope() {
        var payload = salePayload("31");
        payload.put("saleLines", List.of(Map.of(
                "productId", "5",
                "warehouseId", "32",
                "businessUnitId", "10",
                "businessId", "22")));
        when(repository.activeWarehouseAssignment(7L, 31L)).thenReturn(Map.of(
                "warehouseId", 31L,
                "warehouseName", "Monterrey central",
                "businessUnitId", "10",
                "businessUnitName", "Monterrey",
                "businessId", "22",
                "businessName", "Linda Vista"));
        when(repository.organizationAssignment(7L, 10L, 22L)).thenReturn(Map.of(
                "businessUnitId", 10L,
                "businessUnitName", "Monterrey",
                "businessId", 22L,
                "businessName", "Linda Vista"));

        var error = assertThrows(
                IllegalArgumentException.class,
                () -> service.validateEntityPayload(7L, "sales", payload));

        assertTrue(error.getMessage().contains("warehouseId"));
    }

    @Test
    void saleWithItemsRejectsInactiveOrForeignWarehouse() {
        var payload = salePayload("31");
        when(repository.activeWarehouseAssignment(7L, 31L)).thenReturn(null);

        assertThrows(
                IllegalArgumentException.class,
                () -> service.validateEntityPayload(7L, "sales", payload));
    }

    private static LinkedHashMap<String, Object> warehousePayload(String unitId, String businessId) {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("name", "Main warehouse");
        payload.put("businessUnitId", unitId);
        payload.put("businessId", businessId);
        return payload;
    }

    private static LinkedHashMap<String, Object> salePayload(String warehouseId) {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("customerName", "Demo customer");
        payload.put("customFields", Map.of("warehouseId", warehouseId));
        payload.put("saleLines", List.of(Map.of("productId", "5")));
        return payload;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> castMap(Object value) {
        return (Map<String, Object>) value;
    }
}
