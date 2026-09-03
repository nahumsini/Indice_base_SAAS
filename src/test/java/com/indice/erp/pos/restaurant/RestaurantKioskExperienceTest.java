package com.indice.erp.pos.restaurant;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.kiosk.PointOfSaleKioskCapabilities;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class RestaurantKioskExperienceTest {

    @Test
    void employeeMultiKioskSupportsOnlyTheWaiterStation() {
        var experience = new RestaurantKioskExperience(
            mock(RestaurantOrderService.class), new ObjectMapper().findAndRegisterModules());

        assertThat(experience.supportsEmployeeCenter(definition("waiter_station"))).isTrue();
        assertThat(experience.supportsEmployeeCenter(definition("table_order_center"))).isFalse();
        assertThat(experience.supportsEmployeeCenter(definition("kitchen_display"))).isFalse();
    }

    private KioskResolvedDefinition definition(String kioskType) {
        return new KioskResolvedDefinition(
            17L, 7L, PointOfSaleKioskCapabilities.OWNER_MODULE, kioskType, 31L,
            "POS-RESTAURANT", "Restaurant kiosk", KioskDefinitionStatus.ACTIVE,
            2L, 3L, 11L, KioskAccessLevel.CONTROLLED, null,
            "hint", false, 1, 1);
    }
}
