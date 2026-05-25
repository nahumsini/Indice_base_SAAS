package com.indice.erp.configcenter;

import com.indice.erp.hr.HrOperationalScope;
import com.indice.erp.hr.HrOperationalScopeService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConfigCenterScopeAccessTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private HrOperationalScopeService hrOperationalScopeService;

    @Test
    void scopeEmpresaNarrowsMapAndCollaboratorCountForBusinessScope() {
        var scopeAccess = new ConfigCenterScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var empresa = new LinkedHashMap<String, Object>();
        empresa.put("nombre_empresa", "Empresa Demo Spring");
        empresa.put("colaboradores", 19);
        empresa.put("map", List.of(
            unit(12L, "North Unit", List.of(
                business(21L, "North Biz"),
                business(22L, "North Biz 2")
            )),
            unit(13L, "South Unit", List.of(
                business(31L, "South Biz")
            ))
        ));

        when(jdbcTemplate.queryForObject(
            contains("FROM hr_users e"),
            eq(Integer.class),
            eq(1L),
            eq(22L)
        )).thenReturn(4);

        var scoped = scopeAccess.scopeEmpresa(1L, HrOperationalScope.businessOffice(12L, 22L), empresa);

        assertEquals(4, scoped.get("colaboradores"));
        @SuppressWarnings("unchecked")
        var map = (List<Map<String, Object>>) scoped.get("map");
        assertEquals(1, map.size());
        assertEquals(12L, map.getFirst().get("legacy_unit_id"));
        @SuppressWarnings("unchecked")
        var businesses = (List<Map<String, Object>>) map.getFirst().get("businesses");
        assertEquals(1, businesses.size());
        assertEquals(22L, businesses.getFirst().get("legacy_business_id"));
    }

    @Test
    void scopeEmpresaNarrowsMapForUnitScope() {
        var scopeAccess = new ConfigCenterScopeAccess(jdbcTemplate, hrOperationalScopeService);
        var empresa = new LinkedHashMap<String, Object>();
        empresa.put("colaboradores", 19);
        empresa.put("map", List.of(
            unit(12L, "North Unit", List.of(
                business(21L, "North Biz"),
                business(22L, "North Biz 2")
            )),
            unit(13L, "South Unit", List.of(
                business(31L, "South Biz")
            ))
        ));

        when(jdbcTemplate.queryForObject(
            contains("FROM hr_users e"),
            eq(Integer.class),
            eq(1L),
            eq(12L),
            eq(12L)
        )).thenReturn(9);

        var scoped = scopeAccess.scopeEmpresa(1L, HrOperationalScope.unitHeadquarters(12L), empresa);

        assertEquals(9, scoped.get("colaboradores"));
        @SuppressWarnings("unchecked")
        var map = (List<Map<String, Object>>) scoped.get("map");
        assertEquals(1, map.size());
        assertEquals(12L, map.getFirst().get("legacy_unit_id"));
        @SuppressWarnings("unchecked")
        var businesses = (List<Map<String, Object>>) map.getFirst().get("businesses");
        assertEquals(2, businesses.size());
    }

    private Map<String, Object> unit(long id, String name, List<Map<String, Object>> businesses) {
        var unit = new LinkedHashMap<String, Object>();
        unit.put("legacy_unit_id", id);
        unit.put("name", name);
        unit.put("businesses", businesses);
        return unit;
    }

    private Map<String, Object> business(long id, String name) {
        var business = new LinkedHashMap<String, Object>();
        business.put("legacy_business_id", id);
        business.put("name", name);
        return business;
    }
}
