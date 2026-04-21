package com.indice.erp.hr.assets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class HrAssetServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Test
    void createAssetRejectsResponsibleEmployeeWhenStatusIsAvailable() {
        var service = new HrAssetService(jdbcTemplate);
        var payload = new HashMap<String, Object>();
        payload.put("asset_code", "LT-1001");
        payload.put("asset_type", "laptop");
        payload.put("name", "Primary Laptop");
        payload.put("status", "available");
        payload.put("responsible_employee_id", 7L);

        when(jdbcTemplate.query(anyString(), org.mockito.ArgumentMatchers.<org.springframework.jdbc.core.RowMapper<Map<String, Object>>>any(), eq(1L), eq(7L)))
            .thenReturn(java.util.List.of(Map.of("id", 7L, "status", "active")));

        var error = assertThrows(IllegalArgumentException.class, () -> service.createAsset(1L, 3L, payload));
        assertEquals("responsible_employee_id can only be set when the asset status is assigned or custody.", error.getMessage());
    }

    @Test
    void createAssetRequiresResponsibleEmployeeForAssignedStatus() {
        var service = new HrAssetService(jdbcTemplate);
        var payload = new HashMap<String, Object>();
        payload.put("asset_code", "LT-1001");
        payload.put("asset_type", "laptop");
        payload.put("name", "Primary Laptop");
        payload.put("status", "assigned");

        var error = assertThrows(IllegalArgumentException.class, () -> service.createAsset(1L, 3L, payload));
        assertEquals("responsible_employee_id is required for assigned or custody assets.", error.getMessage());
    }

    @Test
    void updateAssetRejectsLifecycleFields() {
        var service = new HrAssetService(jdbcTemplate);
        var payload = new HashMap<String, Object>();
        payload.put("status", "maintenance");

        var error = assertThrows(IllegalArgumentException.class, () -> service.updateAsset(1L, 5L, 12L, payload));
        assertEquals("Use the reassign or status endpoints for assignment and status changes.", error.getMessage());
    }

    @Test
    void reassignAssetRejectsInvalidStatus() {
        var service = new HrAssetService(jdbcTemplate);
        var payload = new HashMap<String, Object>();
        payload.put("status", "maintenance");
        payload.put("responsible_employee_id", 2L);

        var error = assertThrows(IllegalArgumentException.class, () -> service.reassignAsset(1L, 1L, 9L, payload));
        assertEquals("Reassign endpoint only supports assigned or custody status.", error.getMessage());
    }

    @Test
    void listAssetsRejectsInvalidPageSize() {
        var service = new HrAssetService(jdbcTemplate);
        var filters = new HashMap<String, Object>();
        filters.put("size", 250);

        var error = assertThrows(IllegalArgumentException.class, () -> service.listAssets(1L, filters));
        assertEquals("size must be between 1 and 100.", error.getMessage());
    }
}
