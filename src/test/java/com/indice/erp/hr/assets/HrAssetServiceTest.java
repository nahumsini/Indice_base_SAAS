package com.indice.erp.hr.assets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.HrOperationalScope;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

@ExtendWith(MockitoExtension.class)
class HrAssetServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrAssetScopeAccess hrAssetScopeAccess;

    @Test
    void listAssetsAppliesBusinessScopeForCurrentUser() throws Exception {
        var service = createService();
        var currentUser = new AuthSessionUser(7L, 1L, "Scoped Admin", "admin");
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(hrAssetScopeAccess.resolve(currentUser)).thenReturn(scope);
        when(hrAssetScopeAccess.assetCondition(scope)).thenReturn("e.business_id = ?");
        when(hrAssetScopeAccess.assetParameters(scope)).thenReturn(List.of(9L));

        when(jdbcTemplate.query(
            org.mockito.ArgumentMatchers.contains("ORDER BY a.updated_at"),
            org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
            eq(1L),
            eq(9L),
            eq(20),
            eq(0)
        )).thenReturn(List.of());
        when(jdbcTemplate.queryForObject(
            org.mockito.ArgumentMatchers.contains("e.business_id = ?"),
            eq(Long.class),
            eq(1L),
            eq(9L)
        )).thenReturn(0L);
        when(jdbcTemplate.query(
            org.mockito.ArgumentMatchers.contains("total_value_amount"),
            org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
            eq(1L),
            eq(9L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Map<String, Object>>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("total_count")).thenReturn(0L);
            when(rs.getLong("available_count")).thenReturn(0L);
            when(rs.getLong("assigned_count")).thenReturn(0L);
            when(rs.getLong("maintenance_count")).thenReturn(0L);
            when(rs.getLong("custody_count")).thenReturn(0L);
            when(rs.getLong("inactive_count")).thenReturn(0L);
            when(rs.getBigDecimal("total_value_amount")).thenReturn(java.math.BigDecimal.ZERO);
            return List.of(rowMapper.mapRow(rs, 0));
        });
        when(jdbcTemplate.query(
            org.mockito.ArgumentMatchers.contains("GROUP BY COALESCE"),
            org.mockito.ArgumentMatchers.<RowMapper<Map.Entry<String, java.math.BigDecimal>>>any(),
            eq("USD"),
            eq(1L),
            eq(9L),
            eq("USD")
        )).thenReturn(List.of());

        var result = service.listAssets(currentUser, Map.of());

        assertEquals(0L, result.get("total_count"));
    }

    @Test
    void createAssetRejectsResponsibleHrUserWhenStatusIsAvailable() {
        var service = createService();
        var payload = new HashMap<String, Object>();
        payload.put("asset_code", "LT-1001");
        payload.put("asset_type", "laptop");
        payload.put("name", "Primary Laptop");
        payload.put("status", "available");
        payload.put("responsible_user_company_id", 7L);

        when(jdbcTemplate.query(anyString(), org.mockito.ArgumentMatchers.<org.springframework.jdbc.core.RowMapper<Map<String, Object>>>any(), eq(1L), eq(7L)))
            .thenReturn(java.util.List.of(Map.of("id", 7L, "status", "active")));

        var error = assertThrows(IllegalArgumentException.class, () -> service.createAsset(1L, 3L, payload));
        assertEquals("responsible_user_company_id can only be set when the asset status is assigned or custody.", error.getMessage());
    }

    @Test
    void createAssetRequiresResponsibleHrUserForAssignedStatus() {
        var service = createService();
        var payload = new HashMap<String, Object>();
        payload.put("asset_code", "LT-1001");
        payload.put("asset_type", "laptop");
        payload.put("name", "Primary Laptop");
        payload.put("status", "assigned");

        var error = assertThrows(IllegalArgumentException.class, () -> service.createAsset(1L, 3L, payload));
        assertEquals("responsible_user_company_id is required for assigned or custody assets.", error.getMessage());
    }

    @Test
    void updateAssetRejectsLifecycleFields() {
        var service = createService();
        var payload = new HashMap<String, Object>();
        payload.put("status", "maintenance");

        var error = assertThrows(IllegalArgumentException.class, () -> service.updateAsset(1L, 5L, 12L, payload));
        assertEquals("Use the reassign or status endpoints for assignment and status changes.", error.getMessage());
    }

    @Test
    void reassignAssetRejectsInvalidStatus() {
        var service = createService();
        var payload = new HashMap<String, Object>();
        payload.put("status", "maintenance");
        payload.put("responsible_user_company_id", 2L);

        var error = assertThrows(IllegalArgumentException.class, () -> service.reassignAsset(1L, 1L, 9L, payload));
        assertEquals("Reassign endpoint only supports assigned or custody status.", error.getMessage());
    }

    @Test
    void listAssetsRejectsInvalidPageSize() {
        var service = createService();
        var filters = new HashMap<String, Object>();
        filters.put("size", 250);

        var error = assertThrows(IllegalArgumentException.class, () -> service.listAssets(1L, filters));
        assertEquals("size must be between 1 and 100.", error.getMessage());
    }

    private HrAssetService createService() {
        return new HrAssetService(jdbcTemplate, hrAssetScopeAccess);
    }
}
