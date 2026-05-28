package com.indice.erp.dashboard;

import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrganizationScopeAccessTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrOperationalScopeService hrOperationalScopeService;

    @Test
    void unitScopeKeepsOnlyTheAssignedUnit() {
        var access = new OrganizationScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var units = List.of(
            new OrganizationService.UnitSummary(12L, "North Unit", "", "active"),
            new OrganizationService.UnitSummary(13L, "South Unit", "", "active")
        );

        var filtered = access.filterUnits(1L, HrOperationalScope.unitHeadquarters(12L), units);

        assertEquals(1, filtered.size());
        assertEquals(12L, filtered.getFirst().id());
    }

    @Test
    void businessScopeWithoutExplicitUnitResolvesUnitFromBusiness() throws Exception {
        var access = new OrganizationScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var units = List.of(
            new OrganizationService.UnitSummary(12L, "North Unit", "", "active"),
            new OrganizationService.UnitSummary(13L, "South Unit", "", "active")
        );

        when(jdbcTemplate.query(
            contains("FROM businesses"),
            ArgumentMatchers.<RowMapper<Long>>any(),
            eq(22L),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Long>) invocation.getArgument(1);
            var rs = org.mockito.Mockito.mock(java.sql.ResultSet.class);
            when(rs.getObject("unit_id", Long.class)).thenReturn(13L);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var filtered = access.filterUnits(1L, HrOperationalScope.businessOffice(null, 22L), units);

        assertEquals(1, filtered.size());
        assertEquals(13L, filtered.getFirst().id());
    }

    @Test
    void businessScopeKeepsOnlyTheAssignedBusiness() {
        var access = new OrganizationScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var businesses = List.of(
            new OrganizationService.BusinessSummary(21L, 12L, "North Biz", "", "", "active"),
            new OrganizationService.BusinessSummary(22L, 12L, "North Biz 2", "", "", "active")
        );

        var filtered = access.filterBusinesses(HrOperationalScope.businessOffice(12L, 22L), businesses);

        assertEquals(1, filtered.size());
        assertEquals(22L, filtered.getFirst().id());
    }
}
