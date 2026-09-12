package com.indice.erp.sales.publiccatalog;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import static org.assertj.core.api.Assertions.assertThat;

class SalesPublicCatalogExceptionHandlerTest {

    @Test
    void returnsTheSafeConstraintMessageWithoutRejectedProductIds() {
        var rejectedIds = List.of(1457L, 1046L, 1045L);
        var bindingResult = new BeanPropertyBindingResult(new Object(), "saveRequest");
        bindingResult.addError(new FieldError(
            "saveRequest", "productIds", rejectedIds, false, null, null,
            "A public catalog can include up to 5,000 products."));
        var failure = new MethodArgumentNotValidException(null, bindingResult);

        var response = new SalesPublicCatalogExceptionHandler().validation(failure);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isInstanceOfSatisfying(Map.class, body -> {
            assertThat(body.get("message")).isEqualTo(
                "A public catalog can include up to 5,000 products.");
            assertThat(body.toString()).doesNotContain("1457", "1046", "1045");
        });
    }
}
