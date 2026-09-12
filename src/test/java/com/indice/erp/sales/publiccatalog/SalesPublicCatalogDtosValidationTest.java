package com.indice.erp.sales.publiccatalog;

import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.SaveRequest;
import jakarta.validation.Validation;
import java.util.List;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SalesPublicCatalogDtosValidationTest {

    @Test
    void acceptsAnExistingCatalogWithHundredsOfProducts() {
        var productIds = LongStream.rangeClosed(1, 852).boxed().toList();

        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertThat(factory.getValidator().validate(request(productIds))).isEmpty();
        }
    }

    @Test
    void rejectsSelectionsBeyondTheDocumentedCatalogLimitWithoutEchoingIds() {
        var productIds = LongStream.rangeClosed(
            1, SalesPublicCatalogDtos.MAX_PRODUCTS_PER_CATALOG + 1L).boxed().toList();

        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var violations = factory.getValidator().validate(request(productIds));

            assertThat(violations).singleElement().satisfies(violation -> {
                assertThat(violation.getPropertyPath().toString()).isEqualTo("productIds");
                assertThat(violation.getMessage()).isEqualTo(
                    "A public catalog can include up to 5,000 products.");
                assertThat(violation.getMessage()).doesNotContain("1, 2, 3");
            });
        }
    }

    private SaveRequest request(List<Long> productIds) {
        return new SaveRequest(
            "Catalog", 11L, 12L, "Public catalog", "Description", null,
            "general", "#2563EB", "soft", "grid", "elevated", "landscape",
            "Contact", "email", "sales@example.com", null,
            true, true, true, true, true, true, true, true,
            productIds, 1L);
    }
}
