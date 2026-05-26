package com.indice.erp.hr.assets;

import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import java.sql.ResultSet;
import java.util.List;
import java.util.NoSuchElementException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HrAssetScopeAccessTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrOperationalScopeService hrOperationalScopeService;

    @Test
    void requireAssetInScopeRejectsAssetOutsideScope() throws Exception {
        var service = new HrAssetScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(jdbcTemplate.query(
            contains("FROM user_assets a"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(1L),
            eq(44L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("asset_unit_id")).thenReturn(4L);
            when(rs.getLong("responsible_unit_id")).thenReturn(4L);
            when(rs.getLong("responsible_business_id")).thenReturn(10L);
            when(rs.wasNull()).thenReturn(false, false, false);
            return List.of(rowMapper.mapRow(rs, 0));
        });
        when(hrOperationalScopeService.containsAssignment(1L, scope, 4L, 10L)).thenReturn(false);
        when(hrOperationalScopeService.containsAssignment(1L, scope, 4L, null)).thenReturn(false);

        assertThrows(HrAccessDeniedException.class, () -> service.requireAssetInScope(1L, scope, 44L));
    }

    @Test
    void requireAssetInScopeReturnsNotFoundForMissingAsset() {
        var service = new HrAssetScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        when(jdbcTemplate.query(
            contains("FROM user_assets a"),
            ArgumentMatchers.<RowMapper<?>>any(),
            eq(1L),
            eq(44L)
        )).thenReturn(List.of());

        assertThrows(NoSuchElementException.class, () -> service.requireAssetInScope(1L, scope, 44L));
    }

    @Test
    void requireTargetInScopeRejectsUnassignedUnitOnlyAssetForBusinessScope() {
        var service = new HrAssetScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var scope = HrOperationalScope.businessOffice(4L, 9L);

        doThrow(new HrAccessDeniedException("Forbidden"))
            .when(hrOperationalScopeService)
            .requireAssignmentInScope(1L, scope, 4L, null);

        assertThrows(HrAccessDeniedException.class, () -> service.requireTargetInScope(1L, scope, 4L, null));
    }
}
