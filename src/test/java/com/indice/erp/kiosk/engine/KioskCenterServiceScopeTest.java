package com.indice.erp.kiosk.engine;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class KioskCenterServiceScopeTest {

    @Test
    void ownerPredicateKeepsCorporateUnitAndBusinessScopesInTheDatabaseQuery() {
        var scopes = new LinkedHashMap<String, KioskCenterService.OwnerScope>();
        scopes.put("POINT_OF_SALE", KioskCenterService.OwnerScope.businessOffice(41L, 52L));
        scopes.put("EXPENSES", KioskCenterService.OwnerScope.unitHeadquarters(41L));
        scopes.put("HUMAN_RESOURCES", KioskCenterService.OwnerScope.corporateOffice());
        var parameters = new ArrayList<Object>();
        parameters.add(20L);

        var predicate = KioskCenterService.ownerScopePredicate(scopes, parameters);

        assertThat(predicate)
            .contains("definition.owner_module = ? AND (definition.unit_id = ?")
            .contains("scoped_business.unit_id = ?")
            .contains("definition.owner_module = ? AND definition.business_id = ?");
        assertThat(parameters).containsExactly(
            20L,
            "EXPENSES", 41L, 41L,
            "HUMAN_RESOURCES",
            "POINT_OF_SALE", 52L);
    }

    @Test
    void incompleteNarrowScopesFailClosed() {
        var parameters = new ArrayList<Object>();

        var predicate = KioskCenterService.ownerScopePredicate(Map.of(
            "EXPENSES", KioskCenterService.OwnerScope.unitHeadquarters(null),
            "POINT_OF_SALE", KioskCenterService.OwnerScope.businessOffice(null, null)), parameters);

        assertThat(predicate).isEqualTo(
            "definition.owner_module = ? AND 1 = 0 OR definition.owner_module = ? AND 1 = 0");
        assertThat(parameters).containsExactly("EXPENSES", "POINT_OF_SALE");
    }
}
