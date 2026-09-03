package com.indice.erp.pos.kiosk;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskExecutionChannels;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskSessionPrincipal;
import java.time.Instant;
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
        assertThat(adapter.capabilities(definition("self_checkout")))
            .extracting(KioskCapabilityDescriptor::key)
            .containsExactly("pos.self-service.catalog.read");
    }

    @Test
    void routesSelfCheckoutThroughTheSharedSelfServiceExperience() {
        var adapter = new PointOfSaleKioskAdapter(List.of(
            experience("self_service", "pos.self-service.catalog.read")
        ));
        var context = KioskExecutionContext.publicLink(
            PointOfSaleKioskCapabilities.OWNER_MODULE, "token")
            .resolved(definition("self_checkout"), null);

        assertThat(adapter.bootstrap(context)).isEmpty();
        assertThat(adapter.execute(context,
            KioskActionRequest.of("pos.self-service.catalog.read", Map.of())))
            .containsEntry("type", "self_service");
    }

    @Test
    void routesAllRestaurantAliasesThroughOneSharedExperience() {
        var capability = "pos.restaurant.workspace.read";
        var adapter = new PointOfSaleKioskAdapter(List.of(experience(
            Set.of("waiter_station", "table_order_center", "kitchen_display"),
            "waiter_station", capability)));

        assertThat(adapter.capabilities(definition("waiter_station")))
            .extracting(KioskCapabilityDescriptor::key).containsExactly(capability);
        assertThat(adapter.capabilities(definition("table_order_center")))
            .extracting(KioskCapabilityDescriptor::key).containsExactly(capability);
        assertThat(adapter.capabilities(definition("kitchen_display")))
            .extracting(KioskCapabilityDescriptor::key).containsExactly(capability);
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

    @Test
    void employeePosRoutingRequiresAUserSessionBoundToTheDefinition() {
        var capability = "pos.self-service.catalog.read";
        var employeeExperience = new PointOfSaleKioskExperience() {
            private final KioskCapabilityDescriptor descriptor = new KioskCapabilityDescriptor(
                capability, 1, PointOfSaleKioskCapabilities.OWNER_MODULE,
                KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.PUBLIC, false, false);

            @Override public String kioskType() { return "self_service"; }
            @Override public Set<KioskCapabilityDescriptor> capabilities() { return Set.of(descriptor); }
            @Override public Map<String, Object> bootstrap(KioskExecutionContext context) { return Map.of(); }
            @Override public Map<String, Object> execute(
                    KioskExecutionContext context, KioskActionRequest request) {
                return Map.of("channel", "public");
            }
            @Override public boolean supportsEmployeeCenter(KioskResolvedDefinition definition) { return true; }
            @Override public Set<String> employeeCenterTabPermissionKeys(
                    KioskResolvedDefinition definition) { return Set.of("pos.sale"); }
            @Override public Map<String, Object> employeeBootstrap(KioskExecutionContext context) {
                return Map.of("channel", "employee");
            }
            @Override public Map<String, Object> executeEmployee(
                    KioskExecutionContext context, KioskActionRequest request) {
                return Map.of("channel", "employee");
            }
        };
        var adapter = new PointOfSaleKioskAdapter(List.of(employeeExperience));
        var definition = definition("self_service");
        var request = KioskActionRequest.of(capability, Map.of());
        var user = new KioskSessionPrincipal(
            "mobile", definition.id(), definition.companyId(), "USER", 9L,
            Set.of(capability + "@1"), Instant.now().plusSeconds(600));
        var context = employeeContext(definition, user);

        assertThat(adapter.supportsEmployeeCenter(definition)).isTrue();
        assertThat(adapter.employeeCenterTabPermissionKeys(definition)).containsExactly("pos.sale");
        assertThat(adapter.employeeBootstrap(context)).containsEntry("channel", "employee");
        assertThat(adapter.authorize(context, request).allowed()).isTrue();
        assertThat(adapter.executeEmployee(context, request)).containsEntry("channel", "employee");

        var wrongIdentity = new KioskSessionPrincipal(
            "customer", definition.id(), definition.companyId(), "CUSTOMER", 9L,
            Set.of(capability + "@1"), Instant.now().plusSeconds(600));
        assertThat(adapter.authorize(employeeContext(definition, wrongIdentity), request).allowed())
            .isFalse();
    }

    @Test
    void employeeChannelRejectsAPosExperienceThatIsPublicOnly() {
        var capability = "pos.self-service.catalog.read";
        var adapter = new PointOfSaleKioskAdapter(List.of(
            experience("self_service", capability)
        ));
        var definition = definition("self_checkout");
        var principal = new KioskSessionPrincipal(
            "mobile", definition.id(), definition.companyId(), "USER", 9L,
            Set.of(capability + "@1"), Instant.now().plusSeconds(600));
        var context = employeeContext(definition, principal);
        var request = KioskActionRequest.of(capability, Map.of());

        assertThat(adapter.supportsEmployeeCenter(definition)).isFalse();
        assertThat(adapter.authorize(context, request).allowed()).isFalse();
        assertThatThrownBy(() -> adapter.employeeBootstrap(context))
            .isInstanceOf(SecurityException.class);
        assertThatThrownBy(() -> adapter.executeEmployee(context, request))
            .isInstanceOf(SecurityException.class);
    }

    private PointOfSaleKioskExperience experience(String type, String capabilityKey) {
        return experience(Set.of(type), type, capabilityKey);
    }

    private PointOfSaleKioskExperience experience(
            Set<String> types, String type, String capabilityKey) {
        var descriptor = new KioskCapabilityDescriptor(
            capabilityKey, 1, PointOfSaleKioskCapabilities.OWNER_MODULE,
            KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.PUBLIC, false, false);
        return new PointOfSaleKioskExperience() {
            @Override public String kioskType() { return type; }
            @Override public Set<String> kioskTypes() { return types; }
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

    private KioskExecutionContext employeeContext(
            KioskResolvedDefinition definition,
            KioskSessionPrincipal principal) {
        return new KioskExecutionContext(
            PointOfSaleKioskCapabilities.OWNER_MODULE,
            KioskExecutionChannels.MOBILE_MULTI_KIOSK,
            "definition:" + definition.id(), "internal", "browser")
            .resolved(definition, principal);
    }
}
