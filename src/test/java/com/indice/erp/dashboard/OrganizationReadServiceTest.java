package com.indice.erp.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.indice.erp.dashboard.OrganizationReadService.BusinessReference;
import com.indice.erp.dashboard.OrganizationReadService.UnitReference;
import com.indice.erp.hr.HrOperationalScope;
import java.util.List;
import org.junit.jupiter.api.Test;

class OrganizationReadServiceTest {

    private final OrganizationReadService service = new OrganizationReadService(null, null);
    private final List<UnitReference> units = List.of(
        new UnitReference(10L, "North", "active"),
        new UnitReference(20L, "South", "active")
    );
    private final List<BusinessReference> businesses = List.of(
        new BusinessReference(101L, 10L, "North store", "North", "active"),
        new BusinessReference(201L, 20L, "South store", "South", "active")
    );

    @Test
    void unitScopeCannotSeeAnotherUnitsReferences() {
        var result = service.restrict(HrOperationalScope.unitHeadquarters(10L), units, businesses);

        assertEquals(List.of(10L), result.units().stream().map(UnitReference::id).toList());
        assertEquals(List.of(101L), result.businesses().stream().map(BusinessReference::id).toList());
    }

    @Test
    void businessScopeCannotSeeSiblingBusinesses() {
        var result = service.restrict(HrOperationalScope.businessOffice(10L, 101L), units, businesses);

        assertEquals(List.of(10L), result.units().stream().map(UnitReference::id).toList());
        assertEquals(List.of(101L), result.businesses().stream().map(BusinessReference::id).toList());
    }

    @Test
    void unassignedScopeFailsClosed() {
        var result = service.restrict(HrOperationalScope.unassigned(), units, businesses);

        assertEquals(List.of(), result.units());
        assertEquals(List.of(), result.businesses());
    }
}
