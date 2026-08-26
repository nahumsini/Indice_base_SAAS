package com.indice.erp.sales.publiccatalog;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import jakarta.validation.Validation;
import java.util.Map;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
                mock(SalesPublicCatalogService.class), new ObjectMapper(), factory.getValidator());
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

    private KioskResolvedDefinition definition(String type) {
        return new KioskResolvedDefinition(
            1L, 2L, "SALES", type, 3L, "CAT-01", "Catálogo",
            KioskDefinitionStatus.ACTIVE, null, null, null, KioskAccessLevel.PUBLIC,
            null, "hint", false, 1, 1);
    }
}
