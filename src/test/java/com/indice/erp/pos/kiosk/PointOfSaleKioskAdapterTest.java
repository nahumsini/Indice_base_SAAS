package com.indice.erp.pos.kiosk;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PointOfSaleKioskAdapterTest {

    @Test
    void exposesOnlyCapabilitiesForTheResolvedPosKioskType() {
        var display = experience("customer_display", "pos.customer-display.state.read");
        var selfService = experience("self_service", "pos.self-service.catalog.read");
        var adapter = new PointOfSaleKioskAdapter(List.of(display, selfService));

        assertThat(adapter.ownerModule()).isEqualTo(PointOfSaleKioskCapabilities.OWNER_MODULE);
        assertThat(adapter.capabilities()).hasSize(2);
        assertThat(adapter.capabilities(definition("customer_display")))
            .extracting(KioskCapabilityDescriptor::key)
            .containsExactly("pos.customer-display.state.read");
        assertThat(adapter.capabilities(definition("self_service")))
            .extracting(KioskCapabilityDescriptor::key)
            .containsExactly("pos.self-service.catalog.read");
    }

    @Test
    void rejectsCapabilityFromAnotherPosExperience() {
        var adapter = new PointOfSaleKioskAdapter(List.of(
            experience("customer_display", "pos.customer-display.state.read"),
            experience("self_service", "pos.self-service.catalog.read")
        ));
        var context = KioskExecutionContext.publicLink(
            PointOfSaleKioskCapabilities.OWNER_MODULE, "token")
            .resolved(definition("customer_display"), null);

        assertThatThrownBy(() -> adapter.execute(context,
            KioskActionRequest.of("pos.self-service.catalog.read", Map.of())))
            .isInstanceOf(SecurityException.class);
    }

    private PointOfSaleKioskExperience experience(String type, String capabilityKey) {
        var descriptor = new KioskCapabilityDescriptor(
            capabilityKey, 1, PointOfSaleKioskCapabilities.OWNER_MODULE,
            KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.PUBLIC, false, false);
        return new PointOfSaleKioskExperience() {
            @Override public String kioskType() { return type; }
            @Override public Set<KioskCapabilityDescriptor> capabilities() { return Set.of(descriptor); }
            @Override public Map<String, Object> bootstrap(KioskExecutionContext context) { return Map.of(); }
            @Override public Map<String, Object> execute(
                    KioskExecutionContext context, KioskActionRequest request) {
                return Map.of("type", type);
            }
        };
    }

    private KioskResolvedDefinition definition(String kioskType) {
        return new KioskResolvedDefinition(
            1L, 2L, PointOfSaleKioskCapabilities.OWNER_MODULE, kioskType, 3L,
            "POS-01", "POS kiosk", KioskDefinitionStatus.ACTIVE,
            4L, 5L, null, KioskAccessLevel.PUBLIC, null, "hint", true, 1, 1);
    }
}
