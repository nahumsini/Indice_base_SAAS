package com.indice.erp.sales.publiccatalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskExecutionChannels;
import com.indice.erp.kiosk.engine.KioskEmployeeToolCatalogService;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskSessionPrincipal;
import com.indice.erp.sales.kiosk.RouteSalesEmployeeKioskService;
import com.indice.erp.sales.kiosk.RouteSalesKioskCapabilities;
import jakarta.validation.Validation;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class SalesPublicCatalogAdapterTest {

    @Test
    void declaresAnonymousReadAndReviewableRequestCapabilities() {
        var descriptors = SalesPublicCatalogCapabilities.descriptors();

        assertThat(descriptors).hasSize(3);
        assertThat(descriptors).allSatisfy(descriptor ->
            assertThat(descriptor.accessLevel()).isEqualTo(KioskAccessLevel.PUBLIC));
        assertThat(descriptors).anySatisfy(descriptor -> {
            assertThat(descriptor.key()).isEqualTo(SalesPublicCatalogCapabilities.AVAILABILITY_READ);
            assertThat(descriptor.operationPolicy()).isEqualTo(KioskOperationPolicy.INFORMATION_ONLY);
            assertThat(descriptor.mutation()).isFalse();
        });
        assertThat(descriptors).anySatisfy(descriptor -> {
            assertThat(descriptor.key()).isEqualTo(SalesPublicCatalogCapabilities.CATALOG_READ);
            assertThat(descriptor.operationPolicy()).isEqualTo(KioskOperationPolicy.INFORMATION_ONLY);
        });
        assertThat(descriptors).anySatisfy(descriptor -> {
            assertThat(descriptor.key()).isEqualTo(SalesPublicCatalogCapabilities.REQUEST_CREATE);
            assertThat(descriptor.operationPolicy()).isEqualTo(KioskOperationPolicy.REVIEW_REQUIRED);
            assertThat(descriptor.mutation()).isTrue();
            assertThat(descriptor.sensitive()).isTrue();
        });
    }

    @Test
    void rejectsDefinitionFromAnotherSalesKioskType() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var adapter = new SalesPublicCatalogAdapter(
                mock(SalesPublicCatalogService.class), mock(RouteSalesEmployeeKioskService.class),
                new ObjectMapper(), factory.getValidator());
            var context = KioskExecutionContext.publicLink("SALES", "token")
                .resolved(definition("another_sales_experience"), null);

            assertThat(adapter.capabilities(context.definition())).isEmpty();
            assertThatThrownBy(() -> adapter.bootstrap(context))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("definition is invalid");
            assertThatThrownBy(() -> adapter.execute(context,
                KioskActionRequest.of(SalesPublicCatalogCapabilities.CATALOG_READ, Map.of())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("definition is invalid");
        }
    }

    @Test
    void routeSalesToolIsControlledAndDoesNotInheritPublicCatalogCapabilities() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var routeSales = mock(RouteSalesEmployeeKioskService.class);
            var adapter = new SalesPublicCatalogAdapter(
                mock(SalesPublicCatalogService.class), routeSales,
                new ObjectMapper(), factory.getValidator());
            var definition = routeDefinition();
            var granted = Set.of(
                RouteSalesKioskCapabilities.WORKSPACE_READ + "@1",
                RouteSalesKioskCapabilities.CONTACT_CREATE + "@1",
                RouteSalesKioskCapabilities.SALE_CREATE + "@1",
                RouteSalesKioskCapabilities.PAYMENT_EVIDENCE_PRESIGN + "@1",
                RouteSalesKioskCapabilities.PAYMENT_EVIDENCE_REGISTER + "@1");
            var principal = new KioskSessionPrincipal(
                "session", definition.id(), definition.companyId(), "USER", 91L,
                granted, Instant.now().plusSeconds(300));
            var context = new KioskExecutionContext(
                "SALES", KioskExecutionChannels.MOBILE_MULTI_KIOSK,
                "definition:" + definition.id(), "mobile", "browser")
                .resolved(definition, principal);
            given(routeSales.bootstrap(definition, 91L)).willReturn(Map.of("ready", true));

            assertThat(adapter.supportsEmployeeCenter(definition)).isTrue();
            assertThat(adapter.employeeCenterTabPermissionKeys(definition)).containsExactly("crm.sales");
            assertThat(adapter.capabilities(definition))
                .allSatisfy(capability -> assertThat(capability.accessLevel()).isEqualTo(KioskAccessLevel.CONTROLLED))
                .extracting(capability -> capability.key())
                .containsExactlyInAnyOrder(
                    RouteSalesKioskCapabilities.WORKSPACE_READ,
                    RouteSalesKioskCapabilities.CONTACT_CREATE,
                    RouteSalesKioskCapabilities.SALE_CREATE,
                    RouteSalesKioskCapabilities.PAYMENT_EVIDENCE_PRESIGN,
                    RouteSalesKioskCapabilities.PAYMENT_EVIDENCE_REGISTER)
                .doesNotContain(SalesPublicCatalogCapabilities.CATALOG_READ);
            assertThat(adapter.employeeBootstrap(context)).containsEntry("ready", true);
        }
    }

    @Test
    void routeSalesToolRejectsAnonymousExecution() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var adapter = new SalesPublicCatalogAdapter(
                mock(SalesPublicCatalogService.class), mock(RouteSalesEmployeeKioskService.class),
                new ObjectMapper(), factory.getValidator());
            var definition = routeDefinition();
            var anonymous = new KioskExecutionContext(
                "SALES", KioskExecutionChannels.MOBILE_MULTI_KIOSK,
                "definition:" + definition.id(), "mobile", "browser")
                .resolved(definition, null);

            assertThatThrownBy(() -> adapter.executeEmployee(
                anonymous, KioskActionRequest.of(RouteSalesKioskCapabilities.WORKSPACE_READ, Map.of())))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("employee route-sales session");
        }
    }

    private KioskResolvedDefinition definition(String type) {
        return new KioskResolvedDefinition(
            1L, 2L, "SALES", type, 3L, "CAT-01", "Catálogo",
            KioskDefinitionStatus.ACTIVE, null, null, null, KioskAccessLevel.PUBLIC,
            null, "hint", false, 1, 1);
    }

    private KioskResolvedDefinition routeDefinition() {
        return new KioskResolvedDefinition(
            12L, 2L, "SALES", KioskEmployeeToolCatalogService.ROUTE_SALES_KIOSK_TYPE,
            null, KioskEmployeeToolCatalogService.ROUTE_SALES_RESERVED_CODE, "Venta en ruta",
            KioskDefinitionStatus.ACTIVE, null, null, null, KioskAccessLevel.CONTROLLED,
            null, "", false, 1, 1);
    }
}
