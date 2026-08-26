package com.indice.erp.pos.restaurant;

import static org.assertj.core.api.Assertions.assertThat;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;

class RestaurantKioskCapabilitiesTest {

    @Test
    void publishesAControlledAndVersionedRestaurantContract() {
        var capabilities = RestaurantKioskCapabilities.descriptors().stream()
            .collect(Collectors.toMap(KioskCapabilityDescriptor::key, Function.identity()));

        assertThat(capabilities).hasSize(8);
        assertThat(capabilities.values())
            .allMatch(capability -> capability.version() == 1)
            .allMatch(capability -> capability.ownerModule().equals("POINT_OF_SALE"));

        var identity = capabilities.get(RestaurantKioskCapabilities.IDENTITY_VERIFY);
        assertThat(identity.accessLevel()).isEqualTo(KioskAccessLevel.CONTROLLED);
        assertThat(identity.operationPolicy()).isEqualTo(KioskOperationPolicy.DIRECT);
        assertThat(identity.inputContract()).containsEntry("stablePinScope", "KIOSK");

        assertThat(capabilities.values())
            .allMatch(capability -> capability.accessLevel() == KioskAccessLevel.CONTROLLED);
        assertThat(identity.mutation()).isFalse();
        assertThat(capabilities.get(RestaurantKioskCapabilities.WORKSPACE_READ).mutation()).isFalse();
        assertThat(capabilities.get(RestaurantKioskCapabilities.ORDER_OPEN).mutation()).isTrue();
        assertThat(capabilities.get(RestaurantKioskCapabilities.ROUND_SEND).sensitive()).isTrue();
        var floorPlan = capabilities.get(RestaurantKioskCapabilities.FLOOR_PLAN_UPDATE);
        assertThat(floorPlan.operationPolicy()).isEqualTo(KioskOperationPolicy.DIRECT);
        assertThat(floorPlan.mutation()).isTrue();
        assertThat(floorPlan.sensitive()).isTrue();
        assertThat(floorPlan.inputContract()).containsKey("properties");
    }
}
